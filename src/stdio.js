import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createPantryMcp } from './mcp.js';
import { PantryStore } from './store.js';

// Desktop clients launch this entry point as a child process. Keep stdout
// reserved for MCP messages and store household data outside the bundle.
const dbPath = process.env.PANTRY_DB?.trim()
  ? resolve(process.env.PANTRY_DB)
  : join(homedir(), '.pantry-relay', 'pantry.sqlite');
const store = new PantryStore(dbPath);
const server = createPantryMcp(store);
const transport = new StdioServerTransport();

let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  try { await server.close(); } finally { store.close(); }
}

process.once('SIGINT', () => { void close(); });
process.once('SIGTERM', () => { void close(); });
process.stdin.once('end', () => { void close(); });

try { await server.connect(transport); }
catch (error) {
  console.error('Pantry Relay MCP could not start:', error);
  await close();
  process.exitCode = 1;
}
