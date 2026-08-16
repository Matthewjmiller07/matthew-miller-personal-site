#!/usr/bin/env node
// Build the semantic search index for /search.
//
// Gathers text chunks from site content (SCP shiur transcripts, Rav Nachman
// reader, writings), embeds them via Hugging Face Inference Providers, and
// writes src/data/search-index.json. Chunks whose text is unchanged reuse
// their existing vector, so incremental runs only pay for new content.
//
// Requires HF_TOKEN (a Hugging Face access token with "Inference Providers"
// permission). Without it the script exits gracefully so builds don't break —
// the committed index keeps serving until the next embed run.
//
// Usage: node scripts/build-search-index.mjs

import fs from 'fs';
import crypto from 'crypto';
import { InferenceClient } from '@huggingface/inference';

const MODEL = 'intfloat/multilingual-e5-large-instruct';
// e5-instruct convention: documents are embedded as-is, queries get this prefix.
const QUERY_PREFIX =
  'Instruct: Given a search query, retrieve relevant passages from Torah lectures, source sheets, and writings\nQuery: ';

const INDEX_PATH = './src/data/search-index.json';
const SCP_CATALOG = './src/data/scp.json';
const RAV_NACHMAN = './src/data/rav_nachman_reader.json';

const BATCH_SIZE = 32;
const TARGET_CHUNK_CHARS = 700; // transcripts + writings (timestamp granularity matters)
const RAV_NACHMAN_CHUNK_CHARS = 1200; // long-form text; larger chunks keep the index lean
// The provider enforces a hard 512-token context for e5 with no auto-truncation.
// Hebrew tokenizes densely (~3 chars/token), so cap what we send for embedding;
// full text is still stored for display.
const MAX_EMBED_CHARS = 1400;

// ─── Helpers ────────────────────────────────────────────────────────────────

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

const stripHtml = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function clock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function readJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// ─── Content sources ────────────────────────────────────────────────────────
// Each chunk: { id, type, title, url, text, t? } — t is seconds into audio.

function collectScpChunks() {
  const catalog = readJson(SCP_CATALOG);
  const shiurim = Array.isArray(catalog) ? catalog : catalog?.shiurim ?? [];
  const chunks = [];

  for (const shiur of shiurim) {
    const label = `Shiur ${shiur.number}: ${shiur.title}`;

    if (shiur.description) {
      chunks.push({
        id: `scp-${shiur.id}-meta`,
        type: 'shiur',
        title: label,
        url: `/scp?shiur=${shiur.id}`,
        text: [shiur.title, shiur.hebrewTitle, shiur.description].filter(Boolean).join('. '),
      });
    }

    const transcript = readJson(`./src/data/scp-${shiur.id}-transcript.json`);
    if (!Array.isArray(transcript)) continue;

    // Merge consecutive paragraphs into ~TARGET_CHUNK_CHARS windows, keeping
    // the start time of the first paragraph for audio deep-links.
    let buf = [];
    let bufStart = 0;
    const flush = () => {
      if (buf.length === 0) return;
      const text = buf.join(' ');
      chunks.push({
        id: `scp-${shiur.id}-t${bufStart}`,
        type: 'shiur',
        title: label,
        url: `/scp?shiur=${shiur.id}&t=${bufStart}`,
        t: bufStart,
        clock: clock(bufStart),
        text,
      });
      buf = [];
    };

    for (const para of transcript) {
      if (!para?.text) continue;
      if (buf.length === 0) bufStart = Math.max(0, Math.floor(para.startSeconds ?? 0));
      buf.push(para.text.trim());
      if (buf.join(' ').length >= TARGET_CHUNK_CHARS) flush();
    }
    flush();
  }

  return chunks;
}

function collectRavNachmanChunks() {
  const data = readJson(RAV_NACHMAN);
  if (!data) return [];
  const chunks = [];

  if (data.thesis) {
    chunks.push({
      id: 'rav-nachman-thesis',
      type: 'rav-nachman',
      title: 'Rav Nachman Reader — Thesis',
      url: '/rav-nachman#thesis',
      text: stripHtml(String(data.thesis)),
    });
  }

  for (const chapter of data.chapters ?? []) {
    for (const lesson of chapter.lessons ?? []) {
      const lessonTitle = lesson.lesson_num != null ? `Lesson ${lesson.lesson_num}` : lesson.title;
      const title = `Rav Nachman — ${chapter.chapter}: ${lesson.title}`;
      const segments = (lesson.sections ?? [])
        .flatMap((sec) => sec.segments ?? [])
        .map((seg) => stripHtml(seg.text ?? ''))
        .filter(Boolean);

      // Split long lessons into multiple chunks at segment boundaries.
      let buf = [];
      let part = 0;
      const flush = () => {
        if (buf.length === 0) return;
        chunks.push({
          id: `rav-nachman-${sha1(chapter.chapter + lessonTitle)}-${part++}`,
          type: 'rav-nachman',
          title,
          url: '/rav-nachman#reader',
          text: buf.join(' '),
        });
        buf = [];
      };
      for (const text of segments) {
        if (buf.length > 0 && buf.join(' ').length + text.length >= RAV_NACHMAN_CHUNK_CHARS) flush();
        buf.push(text);
      }
      flush();
    }
  }

  return chunks;
}

function collectWritingChunks() {
  const writings = [
    { file: './writing/eulogy.md', title: 'Legacy of Blessed Contentment (Eulogy)', url: '/writings/legacy-of-blessed-contentment' },
  ];
  const chunks = [];

  for (const w of writings) {
    let raw;
    try {
      raw = fs.readFileSync(w.file, 'utf8');
    } catch {
      continue;
    }
    const paragraphs = raw.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.length > 40);
    let buf = [];
    let part = 0;
    const flush = () => {
      if (buf.length === 0) return;
      chunks.push({
        id: `writing-${sha1(w.url)}-${part++}`,
        type: 'writing',
        title: w.title,
        url: w.url,
        text: buf.join(' '),
      });
      buf = [];
    };
    for (const p of paragraphs) {
      buf.push(p);
      if (buf.join(' ').length >= TARGET_CHUNK_CHARS) flush();
    }
    flush();
  }

  return chunks;
}

// ─── Embedding ──────────────────────────────────────────────────────────────

async function embedBatch(client, texts) {
  let inputs = texts.map((t) => t.slice(0, MAX_EMBED_CHARS));
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const out = await client.featureExtraction({ model: MODEL, inputs });
      // Single input returns number[]; batched returns number[][]
      return inputs.length === 1 && typeof out[0] === 'number' ? [out] : out;
    } catch (err) {
      const detail = JSON.stringify(err.httpResponse?.body ?? err.message);
      if (attempt === 4) {
        console.error(`  ❌ Batch failed permanently: ${detail.slice(0, 400)}`);
        throw err;
      }
      if (/context length|reduce the length/i.test(detail)) {
        // Token-dense text (Hebrew) blew the 512-token limit — shorten and retry
        inputs = inputs.map((t) => t.slice(0, Math.floor(t.length * 0.6)));
        console.log('  ✂️  Over token limit, retrying with shorter inputs...');
      } else {
        const wait = attempt * 5000;
        console.log(`  ⚠️  Embed batch failed (${detail.slice(0, 200)}), retrying in ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
}

// Quantize a float vector to int8 packed as base64. Cosine similarity is
// scale-invariant per vector, so per-vector max-abs scaling loses almost
// nothing while shrinking the index ~7x vs. JSON floats.
function quantizeVec(vec) {
  let maxAbs = 0;
  for (const x of vec) maxAbs = Math.max(maxAbs, Math.abs(x));
  if (maxAbs === 0) maxAbs = 1;
  const q = Int8Array.from(vec, (x) => Math.max(-127, Math.min(127, Math.round((x / maxAbs) * 127))));
  return Buffer.from(q.buffer).toString('base64');
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const chunks = [
    ...collectScpChunks(),
    ...collectRavNachmanChunks(),
    ...collectWritingChunks(),
  ];
  console.log(`📚 Collected ${chunks.length} chunks`);

  // Reuse vectors from the existing index when text hasn't changed
  const existing = readJson(INDEX_PATH);
  const cache = new Map();
  if (existing?.model === MODEL) {
    for (const c of existing.chunks ?? []) {
      if (c.vec) cache.set(c.id + ':' + c.hash, c.vec);
    }
  }

  for (const c of chunks) c.hash = sha1(c.text);
  const pending = chunks.filter((c) => !cache.has(c.id + ':' + c.hash));
  console.log(`♻️  ${chunks.length - pending.length} cached, ${pending.length} to embed`);

  if (pending.length > 0) {
    const token = process.env.HF_TOKEN;
    if (!token) {
      console.log('⏭️  HF_TOKEN not set — skipping embedding. Existing search-index.json (if any) remains in use.');
      process.exit(0);
    }
    const client = new InferenceClient(token);
    try {
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        const vectors = await embedBatch(client, batch.map((c) => c.text));
        batch.forEach((c, j) => cache.set(c.id + ':' + c.hash, quantizeVec(vectors[j])));
        console.log(`  🧮 Embedded ${Math.min(i + BATCH_SIZE, pending.length)}/${pending.length}`);
      }
    } catch (err) {
      // An embedding outage — depleted credits, provider downtime — must not
      // fail the whole site build. Chunks that never got a vector are filtered
      // out at query time (see src/pages/api/search.js), so search keeps
      // working on everything already embedded; only the newest content is
      // missing until the next successful build.
      const detail = err.httpResponse?.body?.error ?? err.message;
      console.warn(`  ⚠️  Embedding unavailable — keeping ${cache.size} already-embedded chunk(s).`);
      console.warn(`     ${String(detail).slice(0, 200)}`);
      console.warn(`     ${pending.length} new chunk(s) will stay unsearchable until this succeeds.`);
    }
  }

  const index = {
    model: MODEL,
    queryPrefix: QUERY_PREFIX,
    encoding: 'int8-base64',
    builtAt: new Date().toISOString(),
    chunks: chunks.map((c) => ({ ...c, vec: cache.get(c.id + ':' + c.hash) })),
  };

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index));
  const mb = (fs.statSync(INDEX_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`✅ Wrote ${INDEX_PATH} (${index.chunks.length} chunks, ${mb}MB)`);
}

main().catch((err) => {
  console.error('❌ Search index build failed:', err);
  process.exit(1);
});
