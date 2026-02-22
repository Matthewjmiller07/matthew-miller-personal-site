import { getPrintifyHeaders, jsonResponse, getShopId } from './_utils.js';

export async function GET({ url }) {
  try {
    const shopId = await getShopId();
    const perPage = url.searchParams.get('per_page') || 50;
    const q = url.searchParams.get('q');

    const res = await fetch(`https://api.printify.com/v1/shops/${encodeURIComponent(shopId)}/products.json?page=1&per_page=${encodeURIComponent(perPage)}`,
      { headers: getPrintifyHeaders() }
    );
    if (!res.ok) {
      return jsonResponse({ error: 'Failed to fetch products', status: res.status, body: await res.text() }, res.status);
    }
    const products = await res.json();

    const filtered = q
      ? products.data?.filter((p) => `${p.title}`.toLowerCase().includes(q.toLowerCase())) || []
      : products.data || [];

    return jsonResponse({ products: filtered });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
