import { getPrintifyHeaders, jsonResponse } from '../../printify/_utils.js';

export async function GET({ url }) {
  try {
    const res = await fetch('https://api.printify.com/v1/catalog/blueprints.json', {
      headers: getPrintifyHeaders(),
    });
    if (!res.ok) {
      return jsonResponse({ error: 'Failed to fetch blueprints', status: res.status, body: await res.text() }, res.status);
    }
    const data = await res.json();

    // Optional search by query param ?q=poster
    const q = url.searchParams.get('q');
    const blueprints = q
      ? data.filter((b) => `${b.title} ${b.description}`.toLowerCase().includes(q.toLowerCase()))
      : data;

    return jsonResponse({ blueprints });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
