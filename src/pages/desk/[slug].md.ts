// One desk item as plain Markdown.
import type { APIRoute } from 'astro';
import { loadDesk, itemToMarkdown } from '../../lib/desk';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const item = (await loadDesk()).find((i) => i.slug === params.slug);
  if (!item) return new Response('Not on the desk.\n', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  return new Response(itemToMarkdown(item), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'X-Robots-Tag': 'noindex', 'Access-Control-Allow-Origin': '*' },
  });
};
