export const rawRequest = (url, body) => fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
export const setShoppingExport = () => {};
