#!/usr/bin/env node
// Pre-record every line Noa says (src/lib/kolnoa-noa.js) so /kolnoa/noa plays real audio
// instead of the browser's robotic Hebrew voice. Her lines are all prewritten, so this runs once
// per change and nothing is generated at play time.
//
//   node scripts/kolnoa/noa_voice.mjs [--voice Leda] [--force]
//
// Uses Gemini 3.1 Flash TTS on Replicate (REPLICATE_API_TOKEN in .env) and ffmpeg. Writes
// public/audio/kolnoa/noa/<hash>.mp3 and src/data/kolnoa/noa-audio.json (text -> file).
// Only lines without a recording for this voice are recorded. Gemini's safety filter sometimes
// flags harmless lines (E005), so failures are retried, then reported and left out.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUESTIONS, GENERIC, INTRO, BYE } from '../../src/lib/kolnoa-noa.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'public/audio/kolnoa/noa');
const MANIFEST = join(ROOT, 'src/data/kolnoa/noa-audio.json');
const MODEL = 'google/gemini-3.1-flash-tts';
const STYLE =
  'Speak as Noa, a cheerful, bright seven-year-old Israeli girl, native Hebrew with a natural Israeli accent. ' +
  'Playful, warm and curious, clear and a little slow for a Hebrew learner.';

const args = process.argv.slice(2);
const old = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { voice: null, files: {} };
const voice = args.includes('--voice') ? args[args.indexOf('--voice') + 1] : old.voice || 'Leda';
const force = args.includes('--force'); // file names include the voice, so a new voice records fresh files anyway

const token =
  process.env.REPLICATE_API_TOKEN ||
  readFileSync(join(ROOT, '.env'), 'utf8').match(/^REPLICATE_API_TOKEN=["']?([^"'\n]+)/m)?.[1];
if (!token) throw new Error('REPLICATE_API_TOKEN missing');

const both = (v) => (v && typeof v === 'object' ? [v.m, v.f] : [v]);
const lines = new Set([
  ...both(INTRO.he), ...both(BYE.he),
  ...Object.values(GENERIC).flatMap((r) => both(r.he)),
  ...Object.values(QUESTIONS).flatMap((q) => [...both(q.he), ...Object.values(q.replies).flatMap((r) => both(r.he))]),
]);

async function tts(text) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'wait' },
      body: JSON.stringify({ input: { text, prompt: STYLE, voice, language_code: 'he-IL' } }),
    });
    if (res.status === 429 && attempt < 6) { await new Promise((r) => setTimeout(r, 3000 * (attempt + 1))); continue; }
    let p = await res.json();
    while (!['succeeded', 'failed', 'canceled'].includes(p.status)) {
      await new Promise((r) => setTimeout(r, 1500));
      p = await (await fetch(p.urls.get, { headers })).json();
    }
    if (p.status !== 'succeeded') {
      if (attempt < 4) continue;
      throw new Error(`${text}: ${p.error}`);
    }
    const url = Array.isArray(p.output) ? p.output[0] : p.output;
    return Buffer.from(await (await fetch(url)).arrayBuffer());
  }
}

mkdirSync(OUT, { recursive: true });
const files = {};
const todo = [];
for (const text of lines) {
  const name = createHash('sha1').update(`${voice}:${text}`).digest('hex').slice(0, 12) + '.mp3';
  files[text] = `/audio/kolnoa/noa/${name}`;
  if (force || !existsSync(join(OUT, name))) todo.push([text, name]);
}
console.error(`${lines.size} lines, recording ${todo.length} with ${voice}`);

// A few at a time: Replicate rate-limits bursts.
for (let i = 0; i < todo.length; i += 4) {
  await Promise.all(todo.slice(i, i + 4).map(async ([text, name]) => {
    const raw = join(OUT, `${name}.raw`);
    try {
      writeFileSync(raw, await tts(text));
    } catch (e) {
      console.error(`  FAILED ${e.message}`);
      delete files[text];
      return;
    }
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-ac', '1', '-b:a', '64k', join(OUT, name)]);
    unlinkSync(raw);
    console.error(`  ${text}`);
  }));
}

// Drop recordings no line uses any more.
const keep = new Set(Object.values(files).map((f) => f.split('/').pop()));
for (const f of readdirSync(OUT)) if (!keep.has(f)) unlinkSync(join(OUT, f));
writeFileSync(MANIFEST, JSON.stringify({ voice, files }, null, 1) + '\n');
console.error(`wrote ${MANIFEST.replace(ROOT + '/', '')}`);
