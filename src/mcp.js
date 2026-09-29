import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function createPantryMcp(store) {
  const server = new McpServer({ name: 'pantry-relay', version: '0.1.0' }, { instructions: 'Plan meals from this household pantry. Read inventory, recommend within constraints, present missing ingredients, and obtain the user\'s explicit confirmation before reserving, cancelling, or marking a meal cooked. Do not infer that a recommendation means the meal was cooked. No purchase or external message tools exist.' });
  const execute = fn => async args => {
    try {
      const result = fn(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error.message }] };
    }
  };
  server.registerTool('pantry_snapshot', {
    description: 'Read available and reserved inventory, date labels, meal history and shopping needs.',
    inputSchema: {}, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, execute(() => store.snapshot()));
  server.registerTool('recommend_dinner', {
    description: 'Rank original recipes by pantry coverage and near-date stock. Saves proposals without consuming or reserving food. Never treats date labels as a guarantee of food safety.',
    inputSchema: { servings: z.number().int().min(1).max(8), minutes: z.number().int().min(5).max(120), vegetarian: z.boolean().default(true) },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, execute(args => store.recommend(args)));
  server.registerTool('confirm_dinner', {
    description: 'After the user explicitly chooses and confirms a meal, reserve its available ingredients and add shortages to the shopping list. STALE_PLAN means another change occurred: read stock and ask the user to choose again. Identical retries are idempotent.',
    inputSchema: { plan_id: z.string().uuid(), confirmation: z.literal('Confirm dinner') },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, execute(args => store.confirm(args.plan_id, args.confirmation)));
  server.registerTool('mark_meal_cooked', {
    description: 'After the user states the meal was cooked, consume its reserved ingredients once. Plans with missing ingredients cannot be completed; cancel, restock and replan first. Do not call this just because dinner was recommended or reserved.',
    inputSchema: { plan_id: z.string().uuid(), confirmation: z.literal('Meal cooked') },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, execute(args => store.cook(args.plan_id, args.confirmation)));
  server.registerTool('cancel_dinner', {
    description: 'After user confirmation, release a reserved meal and its shopping needs without consuming stock.',
    inputSchema: { plan_id: z.string().uuid(), confirmation: z.literal('Cancel dinner') },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, execute(args => store.release(args.plan_id, args.confirmation)));
  server.registerTool('record_new_stock', {
    description: 'Record food actually added to the household, with a quantity and date label supplied by the user. Never treats a shopping-list entry as food already received.',
    inputSchema: { ingredient: z.enum(['spinach','tomato','courgette','egg','pasta','rice','chickpea','lentil','yogurt','onion','feta','lemon']), quantity: z.number().positive().max(100000), expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, execute(args => store.restock(args)));
  server.registerResource('household-pantry', 'pantry://household/current', { description: 'Current household pantry and meal history', mimeType: 'application/json' }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(store.snapshot()) }] }));
  server.registerPrompt('rescue-dinner', { description: 'Run a complete dinner-planning workflow with explicit meal confirmation.', argsSchema: { people: z.string().optional(), minutes: z.string().optional() } }, async args => ({ messages: [{ role: 'user', content: { type: 'text', text: `Help plan dinner for ${args.people || '2'} people in ${args.minutes || '25'} minutes. Read the pantry, prioritise near-date items and show up to three options with any shopping needs. Wait for my choice before reserving. Only mark it cooked after I tell you it was cooked.` } }] }));
  return server;
}
