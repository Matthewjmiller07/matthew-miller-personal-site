#!/usr/bin/env node
/**
 * Generate cartoon portraits for the /about page testimonials.
 *
 * Uses Google's latest Gemini image model with Google Search grounding turned on,
 * so the model looks up reference photographs of each person before drawing them.
 * The API returns image bytes inline as base64, so nothing is downloaded from a CDN.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/generate-testimonial-portraits.mjs
 *
 * Options:
 *   GEMINI_IMAGE_MODEL=...  pin a specific model (default: newest image model available)
 *   ONLY=dovi               only regenerate people whose slug matches this substring
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment.');
  process.exit(1);
}

const API = 'https://generativelanguage.googleapis.com/v1beta';
const OUT_DIR = path.resolve(fileURLToPath(new URL('../public/images/testimonials', import.meta.url)));

/**
 * One shared style contract, repeated verbatim for every portrait. This is what
 * keeps the three avatars looking like a matched set rather than three unrelated
 * drawings.
 */
const STYLE = `
STYLE (follow exactly and identically for every portrait in this set):
- Flat vector editorial illustration, modern tech-brand style. Clean confident linework.
- Head-and-shoulders bust, subject centred, facing the viewer, three-quarter turn.
- Warm, friendly, dignified expression. Respectful and flattering — never a caricature,
  never exaggerated or unflattering features.
- Soft cel shading with two tones per surface. No photorealism, no gradients, no texture.
- Limited palette built around cyan (#0891b2) and slate, with natural skin tones.
- Plain flat very light slate background (#f1f5f9), no scenery, no props, no text.
- Square 1:1 composition with even margin around the head; the bust fills roughly
  70% of the frame height and is cropped cleanly at the chest.
- Consistent lighting across the set: soft key light from the upper left.
`.trim();

const PEOPLE = [
  {
    slug: 'rabbi-efrem-goldberg',
    subject:
      'Rabbi Efrem Goldberg, the Senior Rabbi of the Boca Raton Synagogue (BRS) in Boca Raton, Florida, ' +
      'a well-known Orthodox rabbi, speaker and podcast host (his site is rabbiefremgoldberg.org).',
  },
  {
    slug: 'rabbi-dovi-nadel',
    subject:
      'Rabbi Dovi Nadel, the coordinator/head of the USA Chidon HaTanach (the American national Bible contest) ' +
      'and a faculty member at SAR High School in Riverdale, New York.',
  },
  {
    slug: 'eleanor-von-weisl',
    subject:
      'Eleanor von Weisl, the British-born founder of the fashion label Eleanor Von Weisl, ' +
      'which makes hand-crafted luxury headbands and headwear (eleanorvonweisl.com, Instagram @eleanorvonweisl).',
  },
];

function buildPrompt(subject) {
  return `First, use Google Search to find reference photographs and descriptions of this person so the ` +
    `likeness is accurate: ${subject}\n\n` +
    `Then draw a single cartoon portrait avatar of that person, based on what the reference images show ` +
    `(face shape, hair, facial hair, glasses, typical head covering, and usual attire).\n\n${STYLE}`;
}

/** Ask the API which image-capable models exist and pick the newest-looking one. */
async function resolveModel() {
  if (process.env.GEMINI_IMAGE_MODEL) return process.env.GEMINI_IMAGE_MODEL;

  const res = await fetch(`${API}/models?key=${API_KEY}&pageSize=200`);
  if (!res.ok) throw new Error(`models.list failed: ${res.status} ${await res.text()}`);
  const { models = [] } = await res.json();

  const candidates = models
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /image/.test(n) && !/embedding|vision|imagen/.test(n));

  if (!candidates.length) throw new Error('No image-generation models available to this key.');

  // Prefer the highest generation number, then "pro" over "flash".
  candidates.sort((a, b) => {
    const gen = (s) => Number((s.match(/gemini-(\d+)/) || [])[1] || 0);
    if (gen(b) !== gen(a)) return gen(b) - gen(a);
    const pro = (s) => (/pro/.test(s) ? 1 : 0);
    return pro(b) - pro(a);
  });

  console.log(`Image models available: ${candidates.join(', ')}`);
  return candidates[0];
}

async function generate(model, person) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: buildPrompt(person.subject) }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '1:1' },
    },
  };

  const res = await fetch(`${API}/models/${model}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`${person.slug}: ${res.status} ${await res.text()}`);

  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const image = parts.find((p) => p.inlineData || p.inline_data);

  if (!image) {
    const text = parts.map((p) => p.text).filter(Boolean).join(' ').slice(0, 400);
    const finish = json.candidates?.[0]?.finishReason;
    throw new Error(`${person.slug}: no image returned (finishReason=${finish}). Model said: ${text}`);
  }

  const inline = image.inlineData || image.inline_data;
  const ext = (inline.mimeType || inline.mime_type || 'image/png').split('/')[1].replace('jpeg', 'jpg');
  const file = path.join(OUT_DIR, `${person.slug}.${ext === 'png' ? 'png' : ext}`);
  await writeFile(file, Buffer.from(inline.data, 'base64'));

  const queries = json.candidates?.[0]?.groundingMetadata?.webSearchQueries;
  console.log(`✓ ${person.slug} → ${path.relative(process.cwd(), file)}`);
  if (queries?.length) console.log(`   grounded on searches: ${queries.join(' | ')}`);
}

const model = await resolveModel();
console.log(`Using model: ${model}\n`);
await mkdir(OUT_DIR, { recursive: true });

const only = process.env.ONLY;
for (const person of PEOPLE) {
  if (only && !person.slug.includes(only)) continue;
  try {
    await generate(model, person);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exitCode = 1;
  }
}
