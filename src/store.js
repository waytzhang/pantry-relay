import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { PantryCore } from './pantry-core.js';
export { catalog, recipes } from './pantry-core.js';

export class PantryStore extends PantryCore {
  constructor(path, options = {}) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    super(new DatabaseSync(path), { uuid: randomUUID, ...options });
  }
}
