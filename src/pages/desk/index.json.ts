// Structured version of the newsletter desk, with each item's full body and its own .md URL.
import type { APIRoute } from 'astro';
import { loadDesk, DESK_PREAMBLE } from '../../lib/desk';

export const prerender = true;

export const GET: APIRoute = () => {
  const items = loadDesk().map((i) => ({ ...i, url: `/desk/${i.slug}.md` }));
  return new Response(JSON.stringify({ about: DESK_PREAMBLE, count: items.length, items }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
};
