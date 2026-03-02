export const prerender = false;

export async function GET({ request }) {
  const url = new URL(request.url);
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const tzid = url.searchParams.get('tzid') || 'America/Chicago';

  if (!lat || !lng) {
    return new Response(JSON.stringify({ error: 'lat and lng are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const hebcalUrl = `https://www.hebcal.com/zmanim?cfg=json&latitude=${lat}&longitude=${lng}&tzid=${encodeURIComponent(tzid)}&date=${date}`;
    const res = await fetch(hebcalUrl);
    if (!res.ok) throw new Error(`Hebcal API error: ${res.status}`);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
