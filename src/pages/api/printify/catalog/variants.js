import { getPrintifyHeaders, jsonResponse } from '../../printify/_utils.js';

export async function GET({ url }) {
  try {
    const blueprintId = url.searchParams.get('blueprint_id');
    const printProviderId = url.searchParams.get('print_provider_id');
    if (!blueprintId || !printProviderId) {
      return jsonResponse({ error: 'blueprint_id and print_provider_id are required' }, 400);
    }

    const res = await fetch(
      `https://api.printify.com/v1/catalog/blueprints/${encodeURIComponent(blueprintId)}/print_providers/${encodeURIComponent(printProviderId)}/variants.json`,
      { headers: getPrintifyHeaders() }
    );
    if (!res.ok) {
      return jsonResponse({ error: 'Failed to fetch variants', status: res.status, body: await res.text() }, res.status);
    }
    const data = await res.json();
    return jsonResponse({ variants: data });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
