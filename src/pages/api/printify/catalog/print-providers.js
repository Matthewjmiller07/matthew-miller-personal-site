import { getPrintifyHeaders, jsonResponse } from '../../printify/_utils.js';

export async function GET({ url }) {
  try {
    const blueprintId = url.searchParams.get('blueprint_id');
    if (!blueprintId) return jsonResponse({ error: 'blueprint_id is required' }, 400);

    const res = await fetch(`https://api.printify.com/v1/catalog/blueprints/${encodeURIComponent(blueprintId)}/print_providers.json`, {
      headers: getPrintifyHeaders(),
    });
    if (!res.ok) {
      return jsonResponse({ error: 'Failed to fetch print providers', status: res.status, body: await res.text() }, res.status);
    }
    const data = await res.json();
    return jsonResponse({ print_providers: data });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
