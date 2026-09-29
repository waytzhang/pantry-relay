export const catalog = {
  spinach: { name: 'Spinach', unit: 'g' }, tomato: { name: 'Tomatoes', unit: 'g' },
  courgette: { name: 'Courgette', unit: 'g' }, egg: { name: 'Eggs', unit: 'count' },
  pasta: { name: 'Pasta', unit: 'g' }, rice: { name: 'Rice', unit: 'g' },
  chickpea: { name: 'Chickpeas, drained', unit: 'g' }, lentil: { name: 'Lentils, cooked', unit: 'g' },
  yogurt: { name: 'Plain yogurt', unit: 'g' }, onion: { name: 'Onions', unit: 'g' },
  feta: { name: 'Feta', unit: 'g' }, lemon: { name: 'Lemons', unit: 'count' },
};
export const recipes = [
  { id: 'green-pasta', name: 'Green garden pasta', minutes: 20, vegetarian: true, ingredients: { pasta: 180, spinach: 120, tomato: 180, feta: 60 }, steps: ['Cook the pasta following its packet instructions.', 'Cook the tomatoes in a pan until softened, then wilt the spinach.', 'Toss with pasta and crumbled feta.'] },
  { id: 'chickpea-skillet', name: 'Chickpea & courgette skillet', minutes: 25, vegetarian: true, ingredients: { chickpea: 300, courgette: 250, spinach: 100, onion: 100, yogurt: 80 }, steps: ['Soften the onion and chopped courgette in a pan.', 'Add drained chickpeas and warm through, then wilt the spinach.', 'Serve with yogurt.'] },
  { id: 'garden-omelette', name: 'Garden omelette', minutes: 15, vegetarian: true, ingredients: { egg: 4, spinach: 100, tomato: 150, feta: 40 }, steps: ['Soften the chopped tomatoes, then wilt the spinach.', 'Beat the eggs and pour into the pan.', 'Add feta and cook until the eggs are fully set.'] },
  { id: 'lentil-bowl', name: 'Lemon lentil bowl', minutes: 15, vegetarian: true, ingredients: { lentil: 300, tomato: 200, yogurt: 80, lemon: 1 }, steps: ['Warm the cooked lentils following their storage instructions.', 'Chop the tomatoes and stir into the lentils.', 'Finish with yogurt and lemon to taste.'] },
  { id: 'courgette-rice', name: 'Courgette rice pot', minutes: 35, vegetarian: true, ingredients: { rice: 160, courgette: 300, onion: 100, chickpea: 200 }, steps: ['Soften the onion and courgette in a pot.', 'Add rice, chickpeas and the water specified on the rice packet.', 'Simmer until the rice is cooked.'] },
];
// Each original recipe is a two-person demo recipe, not nutritional advice.
const day = (date, offset) => new Date(Date.parse(`${date}T12:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000);
const amount = (n, unit) => unit === 'count' ? Math.ceil(n) : Math.ceil(n / 5) * 5;

export class PantryCore {
  constructor(database, { today = () => new Date().toISOString().slice(0, 10), seed = true, uuid = () => globalThis.crypto.randomUUID() } = {}) {
    this.today = today;
    this.uuid = uuid;
    this.db = database;
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY, version INTEGER NOT NULL);
      INSERT OR IGNORE INTO meta VALUES (1,0);
      CREATE TABLE IF NOT EXISTS lots (id TEXT PRIMARY KEY, ingredient TEXT NOT NULL, quantity REAL NOT NULL CHECK(quantity>=0), expires TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, recipe TEXT NOT NULL, servings INTEGER NOT NULL, stock_version INTEGER NOT NULL, state TEXT NOT NULL, detail TEXT NOT NULL, created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reservations (plan_id TEXT REFERENCES plans(id), lot_id TEXT REFERENCES lots(id), quantity REAL NOT NULL CHECK(quantity>0), PRIMARY KEY(plan_id,lot_id));
      CREATE TABLE IF NOT EXISTS shopping (ingredient TEXT PRIMARY KEY, quantity REAL NOT NULL CHECK(quantity>=0));
      CREATE TABLE IF NOT EXISTS shopping_needs (plan_id TEXT REFERENCES plans(id), ingredient TEXT NOT NULL, quantity REAL NOT NULL CHECK(quantity>0), PRIMARY KEY(plan_id,ingredient));
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, detail TEXT NOT NULL, created TEXT NOT NULL);`);
    if (seed && !this.db.prepare('SELECT 1 FROM lots LIMIT 1').get()) this.seed();
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  version() { return this.db.prepare('SELECT version FROM meta WHERE id=1').get().version; }
  bump(kind, detail) {
    this.db.exec('UPDATE meta SET version=version+1 WHERE id=1');
    this.db.prepare('INSERT INTO events(kind,detail,created) VALUES(?,?,?)').run(kind, JSON.stringify(detail), new Date().toISOString());
  }
  seed() {
    const quantities = { spinach: [150, 0], tomato: [300, 1], courgette: [400, 2], egg: [4, 5], pasta: [250, 90], rice: [500, 90], chickpea: [400, 30], lentil: [300, 3], yogurt: [200, 2], onion: [300, 10], feta: [100, 4], lemon: [2, 8] };
    this.transaction(() => {
      for (const [ingredient, [quantity, offset]] of Object.entries(quantities)) this.db.prepare('INSERT INTO lots VALUES(?,?,?,?)').run(this.uuid(), ingredient, quantity, day(this.today(), offset));
      this.bump('demo_seed', { fictional: true });
    });
  }
  snapshot() {
    const lots = this.db.prepare(`SELECT l.*, COALESCE(SUM(r.quantity),0) AS reserved FROM lots l LEFT JOIN reservations r ON r.lot_id=l.id GROUP BY l.id ORDER BY l.expires,l.ingredient`).all().map(l => ({ ...l, ...catalog[l.ingredient], available: Math.max(0, l.quantity - l.reserved), days_left: daysBetween(l.expires, this.today()), expired: l.expires < this.today() }));
    const plans = this.db.prepare("SELECT * FROM plans WHERE state!='draft' ORDER BY created DESC").all().map(p => ({ ...p, detail: JSON.parse(p.detail) }));
    const shopping = this.db.prepare(`SELECT ingredient, SUM(quantity) AS quantity FROM (SELECT ingredient,quantity FROM shopping UNION ALL SELECT ingredient,quantity FROM shopping_needs) GROUP BY ingredient HAVING SUM(quantity)>0`).all().map(i => ({ ...i, ...catalog[i.ingredient] }));
    return { date: this.today(), version: this.version(), lots, plans, shopping, events: this.db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT 12').all().map(e => ({ ...e, detail: JSON.parse(e.detail) })) };
  }
  recommend({ servings = 2, minutes = 25, vegetarian = true } = {}) {
    if (!Number.isInteger(servings) || servings < 1 || servings > 8 || !Number.isInteger(minutes) || minutes < 5 || minutes > 120 || typeof vegetarian !== 'boolean') throw new Error('INVALID_INPUT');
    const snapshot = this.snapshot();
    const candidates = recipes.filter(r => r.minutes <= minutes && (!vegetarian || r.vegetarian)).map(r => {
      const needs = Object.entries(r.ingredients).map(([ingredient, n]) => ({ ingredient, ...catalog[ingredient], quantity: amount(n * servings / 2, catalog[ingredient].unit) }));
      let coverage = 0, rescue = 0;
      const take = [], missing = [];
      for (const need of needs) {
        let remaining = need.quantity;
        for (const lot of snapshot.lots.filter(l => l.ingredient === need.ingredient && !l.expired && l.available > 0)) {
          const quantity = Math.min(lot.available, remaining);
          if (quantity > 0) { take.push({ lot_id: lot.id, ingredient: need.ingredient, quantity, days_left: lot.days_left }); if (lot.days_left <= 2) rescue += quantity / need.quantity; remaining -= quantity; }
          if (remaining <= 0) break;
        }
        coverage += (need.quantity - remaining) / need.quantity;
        if (remaining > 0) missing.push({ ...need, quantity: remaining });
      }
      return { recipe: r, servings, needs, take, missing, score: coverage / needs.length * 100 + rescue * 10 - missing.length * 8, covered_ingredients: needs.length - missing.length, soon_items: [...new Set(take.filter(t => t.days_left <= 2).map(t => catalog[t.ingredient].name))], stock_version: snapshot.version };
    }).sort((a, b) => b.score - a.score || a.recipe.minutes - b.recipe.minutes);
    // A draft is a persisted proposal. It neither reserves nor consumes food.
    for (const p of candidates.slice(0, 3)) {
      p.id = this.uuid();
      this.db.prepare('INSERT INTO plans VALUES(?,?,?,?,?,?,?)').run(p.id, p.recipe.id, servings, snapshot.version, 'draft', JSON.stringify(p), new Date().toISOString());
    }
    return { version: snapshot.version, options: candidates.slice(0, 3), excluded_expired_lots: snapshot.lots.filter(l => l.expired).length, message: candidates.length ? 'Choose a meal to reserve ingredients. Stock is unchanged until you mark it cooked.' : 'No recipe fits this time limit. Try at least 15 minutes.' };
  }
  getPlan(id) {
    const plan = this.db.prepare('SELECT * FROM plans WHERE id=?').get(id);
    if (!plan) throw new Error('PLAN_NOT_FOUND');
    return { ...plan, detail: JSON.parse(plan.detail) };
  }
  confirm(id, confirmation) {
    if (confirmation !== 'Confirm dinner') throw new Error('CONFIRMATION_REQUIRED');
    return this.transaction(() => {
      const p = this.getPlan(id);
      // An identical retry is idempotent and cannot duplicate reservations/list entries.
      if (p.state === 'reserved') return { plan: p, duplicate: true, snapshot: this.snapshot() };
      if (p.state !== 'draft') throw new Error('PLAN_NOT_DRAFT');
      if (p.stock_version !== this.version()) throw new Error('STALE_PLAN');
      if (p.detail.take.some(t => this.db.prepare('SELECT expires FROM lots WHERE id=?').get(t.lot_id).expires < this.today())) throw new Error('EXPIRED_INGREDIENT');
      for (const t of p.detail.take) this.db.prepare('INSERT INTO reservations VALUES(?,?,?)').run(id, t.lot_id, t.quantity);
      for (const m of p.detail.missing) this.db.prepare('INSERT INTO shopping_needs VALUES(?,?,?)').run(id, m.ingredient, m.quantity);
      this.db.prepare("UPDATE plans SET state='reserved' WHERE id=?").run(id);
      this.bump('meal_reserved', { plan_id: id, name: p.detail.recipe.name });
      return { plan: this.getPlan(id), duplicate: false, snapshot: this.snapshot() };
    });
  }
  cook(id, confirmation) {
    if (confirmation !== 'Meal cooked') throw new Error('CONFIRMATION_REQUIRED');
    return this.transaction(() => {
      const p = this.getPlan(id);
      if (p.state === 'cooked') return { duplicate: true, snapshot: this.snapshot() };
      if (p.state !== 'reserved') throw new Error('PLAN_NOT_RESERVED');
      if (p.detail.missing.length) throw new Error('MISSING_INGREDIENTS_REPLAN_AFTER_RESTOCK');
      const rows = this.db.prepare('SELECT r.*,l.expires FROM reservations r JOIN lots l ON l.id=r.lot_id WHERE plan_id=?').all(id);
      if (rows.some(l => l.expires < this.today())) throw new Error('EXPIRED_INGREDIENT');
      for (const r of rows) this.db.prepare('UPDATE lots SET quantity=quantity-? WHERE id=?').run(r.quantity, r.lot_id);
      this.db.prepare('DELETE FROM reservations WHERE plan_id=?').run(id);
      this.db.prepare('DELETE FROM shopping_needs WHERE plan_id=?').run(id);
      this.db.prepare("UPDATE plans SET state='cooked' WHERE id=?").run(id);
      this.bump('meal_cooked', { plan_id: id, name: p.detail.recipe.name });
      return { duplicate: false, snapshot: this.snapshot() };
    });
  }
  release(id, confirmation) {
    if (confirmation !== 'Cancel dinner') throw new Error('CONFIRMATION_REQUIRED');
    return this.transaction(() => {
      const p = this.getPlan(id);
      if (p.state === 'cancelled') return { duplicate: true, snapshot: this.snapshot() };
      if (p.state !== 'reserved') throw new Error('PLAN_NOT_RESERVED');
      this.db.prepare('DELETE FROM reservations WHERE plan_id=?').run(id);
      this.db.prepare('DELETE FROM shopping_needs WHERE plan_id=?').run(id);
      this.db.prepare("UPDATE plans SET state='cancelled' WHERE id=?").run(id);
      this.bump('meal_cancelled', { plan_id: id });
      return { duplicate: false, snapshot: this.snapshot() };
    });
  }
  restock({ ingredient, quantity, expires }) {
    if (!catalog[ingredient] || typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || (catalog[ingredient].unit === 'count' && !Number.isInteger(quantity)) || !/^\d{4}-\d{2}-\d{2}$/.test(expires) || Number.isNaN(Date.parse(expires)) || new Date(expires).toISOString().slice(0, 10) !== expires || expires < this.today()) throw new Error('INVALID_STOCK');
    return this.transaction(() => {
      this.db.prepare('INSERT INTO lots VALUES(?,?,?,?)').run(this.uuid(), ingredient, quantity, expires);
      this.bump('stock_added', { ingredient, quantity, expires });
      return this.snapshot();
    });
  }
  close() { this.db.close(); }
}
