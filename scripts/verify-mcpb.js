import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = resolve(root, 'dist/pantry-relay.mcpb');
const names = execFileSync('unzip', ['-Z1', bundle], { encoding: 'utf8' }).trim().split('\n');
for (const name of names) {
  assert.ok(!name.startsWith('/') && !name.split('/').includes('..'), `Unsafe path: ${name}`);
  assert.ok(!/(^|\/)(\.git|\.env[^/]*|\.npmrc|data|pantry\.sqlite)(\/|$)/.test(name), `Private file: ${name}`);
}
for (const required of ['manifest.json', 'LICENSE', 'README-MCPB.md', 'src/stdio.js', 'src/mcp.js', 'src/store.js', 'src/pantry-core.js']) {
  assert.ok(names.includes(required), `Missing ${required}`);
}
assert.ok(names.some(name => name.startsWith('node_modules/@modelcontextprotocol/sdk/')));

const temp = mkdtempSync(join(tmpdir(), 'pantry-relay-bundle-'));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(temp, 'src/stdio.js')],
  env: { ...process.env, PANTRY_DB: join(temp, 'data', 'pantry.sqlite') },
});
const client = new Client({ name: 'pantry-relay-bundle-check', version: '1.0.0' });
try {
  execFileSync('unzip', ['-q', bundle, '-d', temp]);
  const manifest = JSON.parse(readFileSync(join(temp, 'manifest.json'), 'utf8'));
  assert.equal(manifest.server.entry_point, 'src/stdio.js');
  assert.equal(manifest.version, '0.1.0');
  await client.connect(transport);
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 6);
  const result = await client.callTool({ name: 'pantry_snapshot', arguments: {} });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.lots.length, 12);
  console.log(`Bundle verified: ${names.length} safe files, six live tools, local SQLite snapshot.`);
} finally {
  await client.close();
  rmSync(temp, { recursive: true, force: true });
}
