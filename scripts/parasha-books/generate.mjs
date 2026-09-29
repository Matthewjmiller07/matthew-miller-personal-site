// Generates Parasha Book media on Replicate:
//   illustrations — FLUX.2 [klein] 9B, conditioned on the cast reference sheet
//   voiceover     — MiniMax Speech 2.8 HD (deep trailer voice)
//   backtrack     — MiniMax Music 2.6 (light instrumental underscore)
//
// Usage:
//   REPLICATE_API_TOKEN=... node scripts/parasha-books/generate.mjs [--book noach] [--only images|voice|music] [--force]
//   node scripts/parasha-books/generate.mjs --print            # just print the jobs (no token needed)
// Files land in public/parasha-books/<slug>/ (page-01.jpg …, cover.jpg, voice.mp3, music.mp3).
// Then: python3 scripts/parasha-books/make-trailer.py && node scripts/parasha-books/make-pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import { books } from '../../src/data/parasha-books/books.mjs';
import { imagePrompt } from '../../src/data/parasha-books/prompts.mjs';

export const REF_URL =
  'https://raw.githubusercontent.com/Matthewjmiller07/matthew-miller-personal-site/main/public/parasha-books/cast/sisters-modest.jpg';

// SSML-ish pauses MiniMax understands: <#0.5#>
export const voiceScript = (lines) => lines.join(' <#1.0#> ');

export const musicPrompt = (book) =>
  `Light cinematic trailer underscore for a children's Bible adventure — ${book.tagline} Soft sustained strings, gentle melodic motif, warm low percussion that slowly builds, hopeful and full of wonder, sparse and uncluttered so a narrator can speak over it, instrumental, 60 seconds`;

export function jobs(book) {
  const dir = `public/parasha-books/${book.slug}`;
  const list = [
    { kind: 'images', dest: `${dir}/cover.jpg`, model: 'black-forest-labs/flux-2-klein-9b', input: { prompt: imagePrompt(book.cover), images: [REF_URL], aspect_ratio: '3:2', output_format: 'jpg', go_fast: false } },
    ...book.pages.map((p, i) => ({
      kind: 'images',
      dest: `${dir}/page-${String(i + 1).padStart(2, '0')}.jpg`,
      model: 'black-forest-labs/flux-2-klein-9b',
      input: { prompt: imagePrompt(p.scene), images: [REF_URL], aspect_ratio: '3:2', output_format: 'jpg', go_fast: false },
    })),
    { kind: 'voice', dest: `${dir}/voice.mp3`, model: 'minimax/speech-2.8-hd', input: { text: voiceScript(book.trailer), voice_id: 'English_Deep-VoicedGentleman', emotion: 'surprised', speed: 0.9, pitch: -2, sample_rate: 44100 } },
    { kind: 'music', dest: `${dir}/music.mp3`, model: 'minimax/music-2.6', input: { prompt: musicPrompt(book), is_instrumental: true } },
  ];
  return list;
}

async function run(job, token) {
  const res = await fetch(`https://api.replicate.com/v1/models/${job.model}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' },
    body: JSON.stringify({ input: job.input }),
  });
  let pred = await res.json();
  if (!res.ok) throw new Error(pred.detail || `HTTP ${res.status}`);
  while (!['succeeded', 'failed', 'canceled'].includes(pred.status)) {
    await new Promise((r) => setTimeout(r, 3000));
    pred = await (await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${token}` } })).json();
  }
  if (pred.status !== 'succeeded') throw new Error(pred.error || pred.status);
  const url = [pred.output].flat()[0];
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.mkdirSync(path.dirname(job.dest), { recursive: true });
  fs.writeFileSync(job.dest, buf);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const selected = books.filter((b) => !flag('--book') || b.slug === flag('--book'));
  const all = selected.flatMap(jobs).filter((j) => !flag('--only') || j.kind === flag('--only'));
  if (args.includes('--print')) {
    console.log(JSON.stringify(all, null, 1));
    process.exit(0);
  }
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN missing');
  const todo = all.filter((j) => args.includes('--force') || !fs.existsSync(j.dest));
  console.log(`${todo.length} jobs`);
  // A few at a time keeps us under Replicate's rate limits.
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(
      todo.slice(i, i + 4).map((j) =>
        run(j, token).then(() => console.log('✓', j.dest), (e) => console.warn('✗', j.dest, e.message)),
      ),
    );
  }
}
