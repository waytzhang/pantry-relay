import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('standalone stdio package lists tools and persists its own SQLite pantry', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'pantry-relay-stdio-'));
  const db = join(temp, 'pantry.sqlite');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve('src/stdio.js')],
    env: { ...process.env, PANTRY_DB: db },
  });
  const client = new Client({ name: 'pantry-relay-stdio-check', version: '1.0.0' });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(tool => tool.name).sort(), [
      'cancel_dinner', 'confirm_dinner', 'mark_meal_cooked',
      'pantry_snapshot', 'recommend_dinner', 'record_new_stock',
    ]);
    const snapshot = await client.callTool({ name: 'pantry_snapshot', arguments: {} });
    assert.equal(snapshot.isError, undefined);
    assert.equal(snapshot.structuredContent.plans.length, 0);
    assert.equal(snapshot.structuredContent.lots.length, 12);
  } finally {
    await client.close();
    rmSync(temp, { recursive: true, force: true });
  }
});
