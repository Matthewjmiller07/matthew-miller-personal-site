export const prerender = false;

export async function GET({ url }) {
  const lamin = url.searchParams.get('lamin');
  const lamax = url.searchParams.get('lamax');
  const lomin = url.searchParams.get('lomin');
  const lomax = url.searchParams.get('lomax');

  if (!lamin || !lamax || !lomin || !lomax) {
    return new Response(JSON.stringify({ error: 'Missing bbox params' }), { status: 400 });
  }

  try {
    const resp = await fetch(
      `https://opensky-network.org/api/states/all?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`,
      { headers: { 'User-Agent': 'MatthewMillerPersonalSite/1.0' } }
    );

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `OpenSky returned ${resp.status}` }), { status: resp.status });
    }

    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
