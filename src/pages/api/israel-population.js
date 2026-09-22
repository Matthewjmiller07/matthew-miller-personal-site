export const prerender = false;

const CKAN_BASE = 'https://data.gov.il/api/3/action/datastore_search';

// CBS resource IDs for population by locality with sector breakdown
const RESOURCE_IDS = [
  '64edd0ee-3d5d-43ce-8562-c336c24dbc1f',
  '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba',
];

export async function GET({ url }) {
  const resourceId = url.searchParams.get('resource_id') || RESOURCE_IDS[0];
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '5000'), 10000);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const upstream = `${CKAN_BASE}?resource_id=${encodeURIComponent(resourceId)}&limit=${limit}&offset=${offset}`;

  try {
    const res = await fetch(upstream, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; IsraelPopDashboard/1.0)',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Upstream returned HTTP ${res.status}`, resourceId }),
        { status: res.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const data = await res.json();
    return new Response(JSON.stringify({ ...data, _proxied_resource: resourceId }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    // Try fallback resource IDs
    for (const rid of RESOURCE_IDS) {
      if (rid === resourceId) continue;
      try {
        const fallback = await fetch(
          `${CKAN_BASE}?resource_id=${encodeURIComponent(rid)}&limit=${limit}&offset=${offset}`,
          { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; IsraelPopDashboard/1.0)' }, signal: AbortSignal.timeout(20000) }
        );
        if (fallback.ok) {
          const data = await fallback.json();
          return new Response(JSON.stringify({ ...data, _proxied_resource: rid, _fallback: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' },
          });
        }
      } catch (_) { /* ignore */ }
    }

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
