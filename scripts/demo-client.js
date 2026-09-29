import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Explicitly opt in before changing the local, fictional household state.
const runActions = process.argv.includes('--confirm-demo');
const client = new Client({ name: 'pantry-relay-demo-client', version: '0.1.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(process.env.PANTRY_MCP_URL || 'http://127.0.0.1:8767/mcp')));
const events = [];
const call = async (name, args = {}) => {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(result.content[0].text);
  const data = result.structuredContent || JSON.parse(result.content[0].text);
  events.push({ tool: name, input: args, result: data });
  return data;
};
try {
  const tools = await client.listTools();
  await call('pantry_snapshot');
  const recommendations = await call('recommend_dinner', { servings: 2, minutes: 25, vegetarian: true });
  const plan = recommendations.options.find(p => p.missing.length === 0);
  if (runActions && plan) {
    await call('confirm_dinner', { plan_id: plan.id, confirmation: 'Confirm dinner' });
    await call('mark_meal_cooked', { plan_id: plan.id, confirmation: 'Meal cooked' });
    await call('pantry_snapshot');
  }
  console.log(JSON.stringify({ transport: 'Streamable HTTP', required_protocol: '2025-11-25', tool_count: tools.tools.length, actions_enabled: runActions, events }, null, 2));
} finally { await client.close(); }
