export const prerender = false;

function getToken() {
  return process.env.REPLICATE_API_TOKEN || import.meta.env?.REPLICATE_API_TOKEN || '';
}

export async function GET({ url }) {
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = getToken();
  const resp = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await resp.json();
  return new Response(JSON.stringify(data), {
    status: resp.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
