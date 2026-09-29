import { rawRequest, setShoppingExport } from './data-source.js';
const $ = id => document.getElementById(id);
let pantry;
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const qty = (n, unit) => `${Number(n.toFixed(2))}${unit === 'g' ? ' g' : n === 1 ? ' piece' : ' pieces'}`;
const errorCopy = { DEMO_STORAGE_UNAVAILABLE: 'This browser could not save the sample pantry. Allow site storage and try again.', DEMO_STORAGE_INVALID: 'The saved sample pantry could not be opened. Reset the demo to start with fresh fictional food.', STALE_PLAN: 'The pantry changed while you were choosing. Find dinner again to get an up-to-date plan.', EXPIRED_INGREDIENT: 'A reserved ingredient is now past its date label. Cancel this dinner and choose again.', MISSING_INGREDIENTS_REPLAN_AFTER_RESTOCK: 'This meal still has shopping needs. Cancel it, record your new stock, then plan again.', PLAN_NOT_RESERVED: 'This dinner is no longer reserved. Refresh your kitchen handoff.', INVALID_INPUT: 'Try dinner for 1 to 8 people, in 5 to 120 minutes.', INVALID_STOCK: 'Check the ingredient, quantity and date label. Whole items need whole numbers.' };
function notice(message, error = false) { $('notice').textContent = message; $('notice').hidden = false; $('notice').classList.toggle('error', error); }
async function request(url, body) {
  const response = await rawRequest(url, body);
  const data = await response.json();
  if (!response.ok) throw new Error(errorCopy[data.error] || 'That change could not be completed. Please refresh and try again.');
  return data;
}
async function refresh() { pantry = await request('/api/pantry'); renderPantry(); }
function renderPantry() {
  $('today').textContent = new Date(`${pantry.date}T12:00:00`).toLocaleDateString('en', { weekday:'long', month:'short', day:'numeric' });
  const active = pantry.lots.filter(l => l.quantity > 0);
  $('stock-summary').textContent = `${active.filter(l => l.days_left <= 2 && !l.expired).length} lots to use soon`;
  $('pantry-count').textContent = `${active.length} lots`;
  $('lots').innerHTML = active.map(l => `<div class="stock-row"><strong>${esc(l.name)}</strong><span class="quantity">${esc(qty(l.available,l.unit))} available</span><small class="${l.days_left <= 2 ? 'urgent' : ''}">${l.expired ? 'Past date label' : l.days_left === 0 ? 'Date label: today' : `Date label: ${esc(l.expires)}`}</small><span class="reserved">${l.reserved ? `${esc(qty(l.reserved,l.unit))} reserved` : ''}</span></div>`).join('') || '<p class="quiet">Your pantry is empty. Record food below to get started.</p>';
  $('shopping').innerHTML = pantry.shopping.map(i => `<div class="shopping-row"><span>${esc(i.name)}</span><strong>${esc(qty(i.quantity,i.unit))}</strong></div>`).join('') || '<p class="quiet">Nothing to buy for your confirmed plans.</p>';
  setShoppingExport(pantry);
  $('plan-count').textContent = `${pantry.plans.filter(p => p.state === 'reserved').length} planned`;
  $('plans').innerHTML = pantry.plans.slice(0,8).map(p => `<article class="meal-row"><div class="meal-row-head"><strong>${esc(p.detail.recipe.name)}</strong><span class="meal-state">${esc(p.state)}</span></div><p>${p.servings} people · ${p.detail.recipe.minutes} minutes${p.detail.missing.length ? ` · ${p.detail.missing.length} shopping needs` : ''}</p>${p.state === 'reserved' ? `<div class="meal-actions"><button class="btn btn-primary" data-action="cook" data-plan="${p.id}">Meal cooked</button><button class="btn btn-outline-primary" data-action="cancel" data-plan="${p.id}">Cancel dinner</button></div>` : ''}<details><summary>Cooking steps</summary><ol>${p.detail.recipe.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details></article>`).join('') || '<p class="quiet">No dinner plans yet. A confirmed plan will appear here.</p>';
  if (!$('ingredient').options.length) $('ingredient').innerHTML = Object.entries(pantry.catalog).map(([id,item]) => `<option value="${esc(id)}">${esc(item.name)}</option>`).join('');
  $('expiry').min = pantry.date;
  if (!$('expiry').value) $('expiry').value = pantry.date;
  updateUnit();
}
function updateUnit() { if (pantry) { const unit = pantry.catalog[$('ingredient').value].unit; $('stock-unit').textContent = unit === 'g' ? '(grams)' : '(pieces)'; $('quantity').step = unit === 'count' ? '1' : '0.1'; } }
function parseCommand(text) {
  if (!/\b(dinner|meal|plan)\b/i.test(text)) throw new Error('Try “Dinner for 2, vegetarian, under 25 minutes”. This local demo understands serving counts and time limits.');
  const servings = Number(text.match(/\bfor\s+(\d+)\b/i)?.[1] || 2);
  const minutes = Number(text.match(/\b(\d+)\s*(?:minute|min)s?\b/i)?.[1] || 25);
  return { servings, minutes, vegetarian: true };
}
$('plan-form').addEventListener('submit', async event => {
  event.preventDefault(); $('plan-button').disabled = true;
  try {
    const constraints = parseCommand($('command').value);
    const result = await request('/api/recommend', constraints);
    $('recommendations').innerHTML = result.options.map((p,i) => `<article class="recipe ${i === 0 ? 'first' : ''}"><div class="recipe-top"><span>${i === 0 ? 'Pantry pick' : 'Another good option'}</span><span>${p.recipe.minutes} min · ${p.servings} people</span></div><h3>${esc(p.recipe.name)}</h3><p>${p.soon_items.length ? `Uses soon: ${esc(p.soon_items.join(', '))}.` : 'A simple option from your pantry.'}</p><div class="ingredient-line">${p.needs.map(n => `${esc(n.name)} ${esc(qty(n.quantity,n.unit))}`).join(' · ')}</div><div class="recipe-bottom"><span class="quiet">${p.missing.length ? `Shopping: ${p.missing.map(n => `${esc(n.name)} ${esc(qty(n.quantity,n.unit))}`).join(', ')}` : 'Everything is already here.'}</span><button class="btn btn-primary" data-action="confirm" data-plan="${p.id}">Confirm dinner</button></div></article>`).join('') || `<div class="empty-state"><h2>No meal fits yet.</h2><p>${esc(result.message)}</p></div>`;
    notice(`Checked available stock for ${constraints.servings} people, within ${constraints.minutes} minutes. No ingredients have been reserved.`);
  } catch(error) { notice(error.message, true); }
  finally { $('plan-button').disabled = false; }
});
document.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  button.disabled = true;
  const action = button.dataset.action;
  try {
    await request(`/api/${action}`, { plan_id:button.dataset.plan, confirmation: {confirm:'Confirm dinner',cook:'Meal cooked',cancel:'Cancel dinner'}[action] });
    await refresh();
    if (action === 'confirm') $('recommendations').innerHTML = '<div class="empty-state"><h2>Dinner is on the handoff.</h2><p>Ingredients are reserved. When dinner is done, mark the meal cooked to update your pantry.</p></div>';
    notice({ confirm:'Dinner confirmed. Ingredients are reserved, and any shortages are on your shopping list.', cook:'Meal recorded. Pantry quantities now reflect what was used.', cancel:'Dinner cancelled. Its ingredients and shopping needs have been released.' }[action]);
  } catch(error) { notice(error.message, true); button.disabled = false; }
});
$('ingredient').addEventListener('change', updateUnit);
$('stock-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true;
  try { await request('/api/restock', { ingredient:$('ingredient').value, quantity:Number($('quantity').value), expires:$('expiry').value }); await refresh(); $('quantity').value = ''; notice('New food recorded. Find dinner again for updated suggestions.'); }
  catch(error) { notice(error.message, true); }
  finally { button.disabled = false; }
});
refresh().catch(error => notice(error.message || 'The pantry could not load. Refresh this page and try again.', true));
