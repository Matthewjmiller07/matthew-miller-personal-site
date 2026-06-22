export const prerender = false;

export async function GET({ url }) {
  const q = url.searchParams.get('q') || '';
  const start = url.searchParams.get('start') || '0';
  const max = url.searchParams.get('max') || '10';
  const sortBy = url.searchParams.get('sortBy') || 'submittedDate';
  const sortOrder = url.searchParams.get('sortOrder') || 'descending';

  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing q param' }), { status: 400 });
  }

  try {
    const arxivUrl = `https://export.arxiv.org/api/query?${q}&start=${start}&max_results=${max}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    const resp = await fetch(arxivUrl, {
      headers: { 'User-Agent': 'MatthewMillerPersonalSite/1.0' },
    });
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `arXiv returned ${resp.status}` }), { status: resp.status });
    }
    const text = await resp.text();
    return new Response(text, { headers: { 'Content-Type': 'application/atom+xml' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
