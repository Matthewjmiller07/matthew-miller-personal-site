export const prerender = false;

export async function POST({ request }) {
  const { password } = await request.json();

  const adminPassword = import.meta.env.YAHRZEIT_ADMIN_PASSWORD;
  const hostToken = import.meta.env.DAILY_HOST_TOKEN;

  if (!adminPassword || !hostToken) {
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

  return new Response(JSON.stringify({ token: hostToken }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
