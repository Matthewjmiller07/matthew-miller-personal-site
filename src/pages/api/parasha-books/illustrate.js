// Illustrates a Parasha Book for an uploaded family with FLUX.2 [klein] on Replicate.
//   POST { action: 'cast', people: [{ role, name, image }] }            -> { id }  character sheet from their photos
//   POST { action: 'page', slug, page: 'cover'|n, sheet, people, sisters } -> { id }  one spread, drawn from the sheet
//   GET  ?id=<prediction>                                                -> { status, output, error }
//   GET  ?fetch=<replicate.delivery url>                                 -> image bytes (so the browser can save the book)
// Prompts are built here from the book data — callers can't send arbitrary prompts.
// If PARASHA_BOOKS_CODE is set, every call must carry it as `code`.
import { bookBySlug } from '../../../data/parasha-books/books.mjs';
import { MODEL, ROLES, adaptScene, castSheetPrompt, customCast, imagePrompt } from '../../../data/parasha-books/prompts.mjs';

export const prerender = false;

const MAX_IMAGE_CHARS = 400_000; // ~300 KB data URL per photo (the browser resizes to 640px first)
const DELIVERY = /^https:\/\/replicate\.delivery\//;

const env = (k) => import.meta.env?.[k] || process.env[k] || '';
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function cleanPeople(list) {
  if (!Array.isArray(list)) return null;
  const seen = new Set();
  const people = [];
  for (const p of list.slice(0, 3)) {
    if (!ROLES.includes(p?.role) || seen.has(p.role)) return null;
    seen.add(p.role);
    people.push({ role: p.role, name: typeof p.name === 'string' ? p.name.slice(0, 40).replace(/[^\p{L}\p{M}\s'-]/gu, '') : '' });
  }
  // Keep a stable big → mid → baby order so the sheet matches the prompts.
  return people.length ? people.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role)) : null;
}

async function predict(input) {
  const res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('REPLICATE_API_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { ...input, output_format: 'jpg', go_fast: false } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Replicate ${res.status}`);
  return data.id;
}

export async function POST({ request }) {
  if (!env('REPLICATE_API_TOKEN')) return json({ error: 'Missing REPLICATE_API_TOKEN' }, 500);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (env('PARASHA_BOOKS_CODE') && body.code !== env('PARASHA_BOOKS_CODE')) return json({ error: 'Access code required' }, 403);

  try {
    if (body.action === 'cast') {
      const people = cleanPeople(body.people);
      if (!people) return json({ error: 'Give 1–3 people, each with a distinct role' }, 400);
      const byRole = Object.fromEntries(body.people.map((p) => [p.role, p.image]));
      const images = people.map((p) => byRole[p.role]);
      if (images.some((img) => typeof img !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(img) || img.length > MAX_IMAGE_CHARS)) {
        return json({ error: 'Each person needs a JPEG/PNG/WebP photo under ~300 KB' }, 400);
      }
      return json({ id: await predict({ prompt: castSheetPrompt(people), images, aspect_ratio: '16:9' }) });
    }

    if (body.action === 'page') {
      const book = bookBySlug[body.slug];
      const people = cleanPeople(body.people);
      if (!book || !people) return json({ error: 'Unknown book or cast' }, 400);
      if (typeof body.sheet !== 'string' || !DELIVERY.test(body.sheet)) return json({ error: 'sheet must be a Replicate output URL' }, 400);
      const scene = body.page === 'cover' ? book.cover : book.pages[Number(body.page)]?.scene;
      if (!scene) return json({ error: 'Unknown page' }, 400);
      const prompt = imagePrompt(adaptScene(scene, people, !!body.sisters), customCast(people), people.length);
      return json({ id: await predict({ prompt, images: [body.sheet], aspect_ratio: '3:2' }) });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    return json({ error: err.message }, 502);
  }
}

export async function GET({ url }) {
  const target = url.searchParams.get('fetch');
  if (target) {
    if (!DELIVERY.test(target)) return json({ error: 'Only Replicate output URLs' }, 400);
    const res = await fetch(target);
    if (!res.ok) return json({ error: `Fetch ${res.status}` }, 502);
    return new Response(res.body, { headers: { 'Content-Type': res.headers.get('content-type') || 'image/jpeg' } });
  }

  const id = url.searchParams.get('id');
  if (!id || !/^[a-z0-9]+$/.test(id)) return json({ error: 'id is required' }, 400);
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${env('REPLICATE_API_TOKEN')}` },
  });
  const p = await res.json();
  if (p.model && p.model !== MODEL) return json({ error: 'Not a Parasha Books prediction' }, 403);
  return json({ status: p.status, output: [p.output].flat().filter(Boolean)[0] || null, error: p.error || null }, res.status);
}
