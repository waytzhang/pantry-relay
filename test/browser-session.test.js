import { test } from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import { BrowserSession } from '../src/browser-session.js';

const SQL = await initSqlJs();
const today = () => '2026-09-29';
const memoryStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const locks = () => {
  let queue = Promise.resolve();
  return { request: (key, operation) => { const result = queue.then(operation); queue = result.catch(() => {}); return result; } };
};
const data = async (session, route, body) => {
  const response = await session.request(route, body);
  const result = await response.json();
  assert.ok(response.ok, JSON.stringify(result));
  return result;
};
const ready = async session => (await data(session, '/api/recommend', { servings: 2, minutes: 25 })).options.find(plan => !plan.missing.length);
const total = pantry => pantry.lots.reduce((sum, lot) => sum + lot.quantity, 0);

test('browser SQLite survives new sessions, preserves shortages, and consumes food once', async () => {
  const storage = memoryStorage(), gate = locks();
  let session = new BrowserSession(SQL, { storage, locks: gate, today });
  const before = await data(session, '/api/pantry'), plan = await ready(session);
  await data(session, '/api/confirm', { plan_id: plan.id, confirmation: 'Confirm dinner' });
  session = new BrowserSession(SQL, { storage, locks: gate, today });
  const reloaded = await data(session, '/api/pantry');
  assert.equal(reloaded.plans[0].state, 'reserved');
  assert.equal(total(reloaded), total(before));
  const cooked = await data(session, '/api/cook', { plan_id: plan.id, confirmation: 'Meal cooked' });
  assert.equal(total(cooked.snapshot), total(before) - plan.take.reduce((sum, lot) => sum + lot.quantity, 0));
  assert.equal((await data(session, '/api/cook', { plan_id: plan.id, confirmation: 'Meal cooked' })).duplicate, true);
  const shortage = (await data(session, '/api/recommend', { servings: 8, minutes: 25 })).options[0];
  await data(session, '/api/confirm', { plan_id: shortage.id, confirmation: 'Confirm dinner' });
  session = new BrowserSession(SQL, { storage, locks: gate, today });
  assert.ok((await data(session, '/api/pantry')).shopping.length > 0);
  const rejected = await session.request('/api/cook', { plan_id: shortage.id, confirmation: 'Meal cooked' });
  assert.equal((await rejected.json()).error, 'MISSING_INGREDIENTS_REPLAN_AFTER_RESTOCK');
  await data(session, '/api/cancel', { plan_id: shortage.id, confirmation: 'Cancel dinner' });
  const final = await data(session, '/api/pantry');
  assert.equal(final.shopping.length, 0);
  assert.equal(final.plans.find(item => item.id === plan.id).state, 'cooked');
});

test('two browser sessions share the lock and reject a stale concurrent confirmation', async () => {
  const storage = memoryStorage(), gate = locks();
  const firstSession = new BrowserSession(SQL, { storage, locks: gate, today });
  const secondSession = new BrowserSession(SQL, { storage, locks: gate, today });
  const first = await ready(firstSession), second = await ready(secondSession);
  const [accepted, stale] = await Promise.all([
    firstSession.request('/api/confirm', { plan_id: first.id, confirmation: 'Confirm dinner' }),
    secondSession.request('/api/confirm', { plan_id: second.id, confirmation: 'Confirm dinner' }),
  ]);
  assert.equal(accepted.status, 200);
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).error, 'STALE_PLAN');
  const pantry = await data(secondSession, '/api/pantry');
  assert.equal(pantry.plans.length, 1);
  assert.ok(pantry.lots.every(lot => lot.available >= 0));
  assert.equal(pantry.lots.reduce((sum, lot) => sum + lot.reserved, 0), first.take.reduce((sum, lot) => sum + lot.quantity, 0));
});

test('browser storage failure reports an error and does not persist a partial reservation', async () => {
  const storage = memoryStorage(), gate = locks();
  const session = new BrowserSession(SQL, { storage, locks: gate, today });
  const before = await data(session, '/api/pantry'), plan = await ready(session);
  const originalSetItem = storage.setItem;
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const failed = await session.request('/api/confirm', { plan_id: plan.id, confirmation: 'Confirm dinner' });
  assert.equal(failed.status, 400);
  assert.equal((await failed.json()).error, 'DEMO_STORAGE_UNAVAILABLE');
  storage.setItem = originalSetItem;
  const after = await data(session, '/api/pantry');
  assert.equal(total(after), total(before));
  assert.equal(after.plans.length, 0);
  assert.equal(after.lots.reduce((sum, lot) => sum + lot.reserved, 0), 0);
});
