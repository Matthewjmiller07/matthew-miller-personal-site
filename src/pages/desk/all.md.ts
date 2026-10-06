// Everything on the newsletter desk as one Markdown file, for pasting into or fetching from any LLM.
import type { APIRoute } from 'astro';
import { loadDesk, itemToMarkdown, DESK_PREAMBLE } from '../../lib/desk';

export const prerender = true;

export const GET: APIRoute = () => {
  const items = loadDesk();
  const toc = items.map((i) => `- ${i.date} [${i.status}] ${i.title}`).join('\n');
  const body = `# The Workshop newsletter desk\n\n${DESK_PREAMBLE}\n\n## Contents\n\n${toc}\n\n---\n\n${items
    .map(itemToMarkdown)
    .join('\n---\n\n')}`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
};
