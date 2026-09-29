import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { PantryStore } from '../src/store.js';
import { createApp } from '../src/server.js';

const today = () => '2026-09-29';
const fresh = () => new PantryStore(':memory:', { today });
const ready = store => store.recommend({ servings:2, minutes:25, vegetarian:true }).options.find(p => !p.missing.length);
const total = snapshot => snapshot.lots.reduce((n,l) => n+l.quantity,0);

test('recommendation leaves quantities and reservations unchanged', () => {
  const store = fresh();
  try { const before = store.snapshot(); const result = ready(store); assert.ok(result.soon_items.includes('Spinach')); assert.equal(total(store.snapshot()), total(before)); assert.equal(store.snapshot().lots.reduce((n,l) => n+l.reserved,0),0); }
  finally { store.close(); }
});
test('confirmation and cooking retries are idempotent and consume precisely once', () => {
  const store = fresh();
  try {
    const before = total(store.snapshot()), plan = ready(store);
    assert.throws(() => store.confirm(plan.id, ''), /CONFIRMATION_REQUIRED/);
    store.confirm(plan.id,'Confirm dinner');
    assert.equal(total(store.snapshot()),before);
    assert.equal(store.confirm(plan.id,'Confirm dinner').duplicate,true);
    store.cook(plan.id,'Meal cooked');
    assert.equal(total(store.snapshot()),before-plan.take.reduce((n,l)=>n+l.quantity,0));
    const after = total(store.snapshot());
    assert.equal(store.cook(plan.id,'Meal cooked').duplicate,true);
    assert.equal(total(store.snapshot()),after);
    assert.ok(store.snapshot().lots.every(l=>l.quantity>=0 && l.reserved===0));
  } finally { store.close(); }
});
test('stale proposals cannot reserve stock held by another household member', () => {
  const store = fresh();
  try { const first=ready(store), second=ready(store); store.confirm(first.id,'Confirm dinner'); assert.throws(()=>store.confirm(second.id,'Confirm dinner'),/STALE_PLAN/); assert.ok(store.snapshot().lots.every(l=>l.available>=0)); }
  finally { store.close(); }
});
test('cancel releases reservations and only this plan\'s shopping needs', () => {
  const store = fresh();
  try {
    const first = store.recommend({servings:8,minutes:25}).options[0];
    store.confirm(first.id,'Confirm dinner');
    const second = store.recommend({servings:8,minutes:25}).options[0];
    store.confirm(second.id,'Confirm dinner');
    store.release(first.id,'Cancel dinner');
    assert.deepEqual(store.snapshot().shopping.map(i=>[i.ingredient,i.quantity]).sort(),second.missing.map(i=>[i.ingredient,i.quantity]).sort());
    assert.equal(store.release(first.id,'Cancel dinner').duplicate,true);
    store.release(second.id,'Cancel dinner');
    assert.equal(store.snapshot().shopping.length,0);
    assert.ok(store.snapshot().lots.every(l=>l.reserved===0));
  } finally { store.close(); }
});
test('shortages cannot be silently cooked or treated as received groceries', () => {
  const store = fresh();
  try { const p=store.recommend({servings:8,minutes:25}).options[0]; store.confirm(p.id,'Confirm dinner'); const before=total(store.snapshot()); assert.throws(()=>store.cook(p.id,'Meal cooked'),/MISSING_INGREDIENTS/); assert.equal(total(store.snapshot()),before); }
  finally { store.close(); }
});
test('past-date lots are excluded and a midnight change invalidates reservations', () => {
  let date = '2026-09-29';
  const store = new PantryStore(':memory:', {today:()=>date});
  try {
    const p=ready(store); store.confirm(p.id,'Confirm dinner'); date='2026-09-30';
    assert.throws(()=>store.cook(p.id,'Meal cooked'),/EXPIRED_INGREDIENT/);
    const result=store.recommend({servings:2,minutes:25});
    assert.equal(result.excluded_expired_lots,1);
    assert.ok(result.options.every(p=>p.take.every(t=>t.ingredient!=='spinach')));
  } finally { store.close(); }
});
test('new stock invalidates drafts; invalid dates and fractional whole items are rejected', () => {
  const store = fresh();
  try {
    const p=ready(store);
    assert.throws(()=>store.restock({ingredient:'egg',quantity:1.5,expires:'2026-10-01'}),/INVALID_STOCK/);
    assert.throws(()=>store.restock({ingredient:'tomato',quantity:30,expires:'2026-02-31'}),/INVALID_STOCK/);
    store.restock({ingredient:'tomato',quantity:30,expires:'2026-10-01'});
    assert.throws(()=>store.confirm(p.id,'Confirm dinner'),/STALE_PLAN/);
    assert.throws(()=>store.recommend({servings:0,minutes:25}),/INVALID_INPUT/);
  } finally { store.close(); }
});
test('restart preserves the household handoff and shopping needs', () => {
  const directory=mkdtempSync(join(tmpdir(),'pantry-relay-')); const path=join(directory,'pantry.sqlite');
  let store = new PantryStore(path,{today});
  try {
    const p=store.recommend({servings:8,minutes:25}).options[0]; store.confirm(p.id,'Confirm dinner'); const expected=store.snapshot(); store.close(); store=new PantryStore(path,{today});
    assert.deepEqual(store.snapshot(),expected);
  } finally { store.close(); rmSync(directory,{recursive:true,force:true}); }
});
test('official MCP client completes a real Streamable HTTP workflow and rejects an unrelated Origin', async () => {
  const store=fresh(); const http=createServer(); http.listen(0,'127.0.0.1'); await once(http,'listening');
  const port=http.address().port; http.on('request',createApp(store,port));
  const client=new Client({name:'pantry-relay-test',version:'0.1.0'});
  try {
    const initialized=await fetch(`http://127.0.0.1:${port}/mcp`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'probe',version:'1'}}})});
    assert.equal((await initialized.json()).result.protocolVersion,'2025-11-25');
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
    assert.equal((await client.listTools()).tools.length,6);
    const data = await client.callTool({name:'recommend_dinner',arguments:{servings:2,minutes:25,vegetarian:true}});
    const p=data.structuredContent.options.find(p=>!p.missing.length);
    const reserved=await client.callTool({name:'confirm_dinner',arguments:{plan_id:p.id,confirmation:'Confirm dinner'}});
    assert.equal(reserved.structuredContent.plan.state,'reserved');
    const cooked=await client.callTool({name:'mark_meal_cooked',arguments:{plan_id:p.id,confirmation:'Meal cooked'}});
    assert.equal(cooked.structuredContent.snapshot.plans[0].state,'cooked');
    const exportFile=await fetch(`http://127.0.0.1:${port}/api/shopping-list`);
    assert.equal(exportFile.headers.get('content-disposition'),'attachment; filename="pantry-shopping-list.txt"');
    assert.match(await exportFile.text(),/Nothing to buy for your confirmed plans/);
    const denied=await fetch(`http://127.0.0.1:${port}/api/recommend`,{method:'POST',headers:{Origin:'https://unrelated.example','Content-Type':'application/json'},body:'{}'});
    assert.equal(denied.status,403);
  } finally { await client.close(); http.closeAllConnections(); await new Promise(resolve=>http.close(resolve)); store.close(); }
});
