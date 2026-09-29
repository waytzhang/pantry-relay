import express from 'express';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { PantryStore, catalog } from './store.js';
import { createPantryMcp } from './mcp.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function createApp(store, port = 8767) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!hosts.includes(req.headers.host) || (req.headers.origin && !hosts.some(host => req.headers.origin === `http://${host}`))) return res.status(403).json({ error: 'LOCAL_ACCESS_ONLY' });
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.post('/mcp', async (req, res) => {
    const mcp = createPantryMcp(store);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void mcp.close(); });
    try { await mcp.connect(transport); await transport.handleRequest(req, res, req.body); }
    catch { if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'MCP request could not be processed' }, id: null }); }
  });
  app.all('/mcp', (req, res) => res.status(405).set('Allow', 'POST').json({ error: 'This stateless MCP endpoint accepts POST. SSE sessions are not required.' }));
  app.get('/api/pantry', (req, res) => res.json({ ...store.snapshot(), catalog }));
  app.get('/api/shopping-list', (req, res) => {
    const pantry = store.snapshot();
    const text = `Pantry Relay shopping list\n${pantry.date}\n\n` + (pantry.shopping.map(i => `${i.name}: ${i.quantity} ${i.unit === 'g' ? 'g' : i.quantity === 1 ? 'piece' : 'pieces'}`).join('\n') || 'Nothing to buy for your confirmed plans.');
    res.set('Content-Type','text/plain; charset=utf-8').set('Content-Disposition','attachment; filename="pantry-shopping-list.txt"').send(text);
  });
  const action = fn => (req, res) => { try { res.json(fn(req.body)); } catch (error) { res.status(error.message === 'STALE_PLAN' ? 409 : 400).json({ error: error.message }); } };
  app.post('/api/recommend', action(body => store.recommend(body)));
  app.post('/api/confirm', action(body => store.confirm(body.plan_id, body.confirmation)));
  app.post('/api/cook', action(body => store.cook(body.plan_id, body.confirmation)));
  app.post('/api/cancel', action(body => store.release(body.plan_id, body.confirmation)));
  app.post('/api/restock', action(body => store.restock(body)));
  app.use(express.static(resolve(root, 'public')));
  app.use((error, req, res, next) => res.status(400).json({ error: 'INVALID_REQUEST' }));
  return app;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PANTRY_PORT || 8767);
  const store = new PantryStore(resolve(process.env.PANTRY_DB || resolve(root, 'data/pantry.sqlite')));
  const listener = createApp(store, port).listen(port, '127.0.0.1', () => console.log(`Pantry Relay: http://127.0.0.1:${port} | MCP: /mcp`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => listener.close(() => { store.close(); process.exit(0); }));
}
