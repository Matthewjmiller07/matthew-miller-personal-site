import path from 'path';

export function getPrintifyToken() {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    throw new Error('PRINTIFY_API_TOKEN is not set');
  }
  return token;
}

export function getPrintifyHeaders() {
  const token = getPrintifyToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'MatthewMillerSite/1.0 (+https://matthewjamesmiller.com)'
  };
}

export function postersDir() {
  return path.join(process.cwd(), 'public', 'images', 'Sukkah Posters');
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function getShopId() {
  const envShop = process.env.PRINTIFY_SHOP_ID;
  if (envShop) return envShop;
  const res = await fetch('https://api.printify.com/v1/shops.json', {
    headers: getPrintifyHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch shops: ${res.status} ${text}`);
  }
  const shops = await res.json();
  if (!Array.isArray(shops) || shops.length === 0) {
    throw new Error('No shops found for this Printify account');
  }
  return String(shops[0].id);
}

export async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    json = null;
  }
  if (!res.ok) {
    const err = new Error(`Request failed: ${res.status}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return json;
}
