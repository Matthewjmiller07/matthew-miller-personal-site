import { getPrintifyHeaders, jsonResponse } from './_utils.js';

export async function GET() {
  try {
    const res = await fetch('https://api.printify.com/v1/shops.json', {
      headers: getPrintifyHeaders(),
    });
    if (!res.ok) {
      const text = await res.text();
      return jsonResponse({ error: 'Failed to fetch shops', status: res.status, body: text }, res.status);
    }
    const data = await res.json();
    return jsonResponse({ shops: data });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
