// One desk item as plain Markdown.
import type { APIRoute, GetStaticPaths } from 'astro';
import { loadDesk, itemToMarkdown, type DeskItem } from '../../lib/desk';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = () =>
  loadDesk().map((item) => ({ params: { slug: item.slug }, props: { item } }));

export const GET: APIRoute = ({ props }) =>
  new Response(itemToMarkdown(props.item as DeskItem), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
