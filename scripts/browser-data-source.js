import { BrowserSession } from './browser-session.js';

const SQL = await globalThis.initSqlJs({ locateFile: file => new URL(`vendor/${file}`, import.meta.url).href });
const session = new BrowserSession(SQL, { storage: globalThis.localStorage, locks: globalThis.navigator.locks });
export const rawRequest = (url, body) => session.request(url, body);
document.getElementById('plan-button').disabled = false;
if (!globalThis.navigator.locks) document.querySelector('.demo-label').textContent = 'Sample kitchen · use one tab at a time';

export const setShoppingExport = pantry => {
  const text = `Pantry Relay shopping list\n${pantry.date}\n\n` + (pantry.shopping.map(item => `${item.name}: ${item.quantity} ${item.unit === 'g' ? 'g' : item.quantity === 1 ? 'piece' : 'pieces'}`).join('\n') || 'Nothing to buy for your confirmed plans.');
  const link = document.getElementById('download-list');
  link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  link.download = 'pantry-shopping-list.txt';
};
document.getElementById('reset-demo').addEventListener('click', async () => {
  if (!confirm('Reset this sample pantry? Its fictional meal plans and stock changes will be cleared.')) return;
  try { await session.reset(); location.reload(); }
  catch { document.getElementById('notice').textContent = 'This browser could not reset the sample pantry.'; document.getElementById('notice').hidden = false; }
});
