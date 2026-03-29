export const prerender = false;

export async function POST({ request }) {
  const { password } = await request.json();

  const adminPassword = import.meta.env.BABYNAMING_ADMIN_PASSWORD;
  const dailyApiKey = import.meta.env.DAILY_API_KEY;
  const roomName = import.meta.env.BABYNAMING_ROOM_NAME || 'Baby';

  if (!adminPassword || !dailyApiKey) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (password !== adminPassword) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Mint a meeting token via Daily REST API for the private room
  // is_owner: true grants host/admin privileges
  const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dailyApiKey}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        is_owner: true,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6, // expires in 6 hours
      },
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error('Daily API error:', err);
    return new Response(JSON.stringify({ error: 'Failed to create meeting token' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { token } = await tokenRes.json();

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
