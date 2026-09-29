import { PantryCore, catalog } from './pantry-core.js';
import { BrowserDatabase } from './browser-database.js';

const storageKey = 'pantry-relay.sample-kitchen.v1';
const encode = bytes => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return 'v1:' + btoa(binary);
};
const decode = saved => {
  if (saved === null) return undefined;
  if (!saved.startsWith('v1:')) throw new Error('DEMO_STORAGE_INVALID');
  try { return Uint8Array.from(atob(saved.slice(3)), char => char.charCodeAt(0)); }
  catch { throw new Error('DEMO_STORAGE_INVALID'); }
};

export class BrowserSession {
  constructor(SQL, { storage, locks, today, uuid } = {}) {
    this.SQL = SQL;
    this.storage = storage;
    this.locks = locks;
    this.options = { ...(today && { today }), ...(uuid && { uuid }) };
  }
  exclusive(operation) { return this.locks ? this.locks.request(storageKey, operation) : operation(); }
  request(url, body) {
    return this.exclusive(() => {
      let store;
      try {
        let saved;
        try { saved = this.storage.getItem(storageKey); }
        catch { throw new Error('DEMO_STORAGE_UNAVAILABLE'); }
        const bytes = decode(saved);
        let database;
        try { database = new BrowserDatabase(this.SQL, bytes); }
        catch { throw new Error('DEMO_STORAGE_INVALID'); }
        store = new PantryCore(database, this.options);
        let result;
        if (url === '/api/pantry' && !body) result = { ...store.snapshot(), catalog };
        else if (url === '/api/recommend' && body) result = store.recommend(body);
        else if (url === '/api/confirm' && body) result = store.confirm(body.plan_id, body.confirmation);
        else if (url === '/api/cook' && body) result = store.cook(body.plan_id, body.confirmation);
        else if (url === '/api/cancel' && body) result = store.release(body.plan_id, body.confirmation);
        else if (url === '/api/restock' && body) result = store.restock(body);
        else throw new Error('INVALID_REQUEST');
        try { this.storage.setItem(storageKey, encode(database.export())); }
        catch { throw new Error('DEMO_STORAGE_UNAVAILABLE'); }
        return Response.json(result);
      } catch (error) {
        return Response.json({ error: error.message }, { status: error.message === 'STALE_PLAN' ? 409 : 400 });
      } finally { store?.close(); }
    });
  }
  reset() {
    return this.exclusive(() => {
      try { this.storage.removeItem(storageKey); }
      catch { throw new Error('DEMO_STORAGE_UNAVAILABLE'); }
    });
  }
}
