// PDF to Audio — all client-side logic.
// Pipeline: pdf.js extraction -> sentence chunking -> Kokoro TTS (af_heart, in-browser)
// -> lamejs MP3 encode -> optional upload to Cloudflare R2 + tokenized RSS feed.
// Nothing leaves the device until the user presses "Upload & get feed link".

// ---------------------------------------------------------------------------
// CONFIG — the one place that knows about the server side. Flip uploadEnabled
// to true once the R2 bucket + pdf-to-audio Worker are live (see
// workers/pdf-to-audio/wrangler.toml). Until then the page works fully except
// upload: MP3 download + downloadable feed XML still work.
// ---------------------------------------------------------------------------
export const PDF_AUDIO_CONFIG = {
  workerUrl: 'https://pdf-to-audio.parasha.workers.dev',
  uploadEnabled: false,
};

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { KokoroTTS } from 'kokoro-js';

// lamejs is NOT imported: its CJS entry is broken (ReferenceError: MPEGMode is not
// defined) and its bundle only works as a window global. The page loads the vendored
// /public/lame.all.js as a classic script; this accessor reads the global.
function getLamejs(): {
  Mp3Encoder: new (
    channels: number,
    sampleRate: number,
    kbps: number,
  ) => { encodeBuffer: (pcm: Int16Array) => Int8Array; flush: () => Int8Array };
} {
  const g = (globalThis as unknown as { lamejs?: unknown }).lamejs;
  if (!g || typeof g !== 'object' || !('Mp3Encoder' in (g as Record<string, unknown>))) {
    throw new Error('MP3 encoder (lamejs) failed to load — reload the page.');
  }
  return g as {
    Mp3Encoder: new (
      channels: number,
      sampleRate: number,
      kbps: number,
    ) => { encodeBuffer: (pcm: Int16Array) => Int8Array; flush: () => Int8Array };
  };
}

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const SAMPLE_RATE = 24000; // Kokoro-82M native sample rate (mono)
const MAX_CHUNK_CHARS = 350; // sentence-based chunks; keeps the tab responsive

let extractedText = '';
let mp3Blob: Blob | null = null;
let mp3DurationSec = 0;
let mp3Filename = 'chapter.mp3';
let tts: Awaited<ReturnType<typeof KokoroTTS.from_pretrained>> | null = null;

// --- helpers ---------------------------------------------------------------

function setBar(id: string, pct: number) {
  ($(id) as HTMLElement).style.width = `${Math.max(0, Math.min(100, pct))}%`;
}
function setText(id: string, s: string) {
  $(id).textContent = s;
}
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'chapter';
}
function feedToken(): string {
  const KEY = 'pdf-audio-feed-token';
  let t = localStorage.getItem(KEY);
  if (!t) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    t = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(KEY, t);
  }
  return t;
}
function uploadKey(): string {
  const m = location.hash.match(/[#&]key=([^&]+)/);
  if (m) return decodeURIComponent(m[1]);
  return ($('upload-key') as HTMLInputElement).value.trim();
}

// --- 1. extraction ---------------------------------------------------------

function cleanExtracted(raw: string): string {
  return raw
    .replace(/(\w)-\n(\w)/g, '$1$2') // de-hyphenate words split across lines
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

async function extractPdf(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const parts: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    // hasEOL preserves line breaks (paragraph structure survives into the preview
    // the user edits); a naive join(" ") flattens everything into one wall of text.
    const text = (tc.items as { str?: string; hasEOL?: boolean }[])
      .map((i) => (i.str ?? '') + (i.hasEOL ? '\n' : ' '))
      .join('');
    parts.push(text);
    setBar('extract-bar', (n / doc.numPages) * 100);
    setText('extract-status', `Reading page ${n} of ${doc.numPages}…`);
    await new Promise((r) => setTimeout(r, 0)); // let the UI breathe
  }
  setText('extract-status', `Done — ${doc.numPages} pages.`);
  return cleanExtracted(parts.join('\n\n'));
}

// --- 2. chunking -----------------------------------------------------------

function chunkSentences(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .match(/[^.!?…]+[.!?…]+["')\]]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if (cur && cur.length + piece.length + 1 > MAX_CHUNK_CHARS) {
      chunks.push(cur);
      cur = piece;
    } else {
      cur = cur ? `${cur} ${piece}` : piece;
    }
  }
  if (cur) chunks.push(cur);
  // Safety: hard-split any over-long chunk (e.g. a sentence with no terminator).
  const out: string[] = [];
  for (const c of chunks) {
    if (c.length <= MAX_CHUNK_CHARS) out.push(c);
    else for (let i = 0; i < c.length; i += MAX_CHUNK_CHARS) out.push(c.slice(i, i + MAX_CHUNK_CHARS));
  }
  return out;
}

// --- 3. TTS ----------------------------------------------------------------

async function loadTts(onProgress: (pct: number, label: string) => void) {
  if (tts) return tts;
  const opts: Record<string, unknown> = {
    // WebGPU + fp32 is the README-recommended combo (~311 MB first download).
    dtype: 'fp32',
    device: 'webgpu',
    progress_callback: (p: { status: string; progress?: number; file?: string }) => {
      if (typeof p.progress === 'number') onProgress(p.progress, p.file ?? p.status);
    },
  };
  try {
    tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', opts);
  } catch (e) {
    // WebGPU unavailable (or blocked) — fall back to WASM + q8 (~88 MB).
    onProgress(0, 'WebGPU unavailable, falling back to WASM…');
    tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      ...opts,
      dtype: 'q8',
      device: 'wasm',
    });
  }
  return tts;
}

function floatToInt16(floats: Float32Array): Int16Array {
  const out = new Int16Array(floats.length);
  for (let i = 0; i < floats.length; i++) {
    const v = Math.max(-1, Math.min(1, floats[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

function encodeMp3(pcm: Float32Array): Blob {
  const encoder = new (getLamejs().Mp3Encoder)(1, SAMPLE_RATE, 96);
  const int16 = floatToInt16(pcm);
  const parts: Uint8Array[] = [];
  const BLOCK = 1152;
  for (let i = 0; i < int16.length; i += BLOCK) {
    const chunk = int16.subarray(i, i + BLOCK);
    const encoded = encoder.encodeBuffer(chunk);
    if (encoded.length) parts.push(new Uint8Array(encoded));
  }
  const flushed = encoder.flush();
  if (flushed.length) parts.push(new Uint8Array(flushed));
  return new Blob(parts as BlobPart[], { type: 'audio/mpeg' });
}

async function synthesize(text: string): Promise<{ blob: Blob; durationSec: number }> {
  const chunks = chunkSentences(text);
  const engine = await loadTts((pct, label) => {
    setBar('model-bar', pct);
    setText('model-status', `Loading voice model… ${Math.round(pct)}% ${label}`);
  });
  setBar('model-bar', 100);
  setText('model-status', 'Voice model loaded (cached in your browser for next time).');

  const pieces: Float32Array[] = [];
  let total = 0;
  for (let i = 0; i < chunks.length; i++) {
    setBar('synth-bar', (i / chunks.length) * 100);
    setText('synth-status', `Speaking chunk ${i + 1} of ${chunks.length}…`);
    const audio = await engine.generate(chunks[i], { voice: 'af_heart' });
    const data = audio.audio as Float32Array;
    pieces.push(data);
    total += data.length;
    await new Promise((r) => setTimeout(r, 0));
  }
  const pcm = new Float32Array(total);
  let off = 0;
  for (const p of pieces) {
    pcm.set(p, off);
    off += p.length;
  }
  setBar('synth-bar', 100);
  setText('synth-status', `Done — ${chunks.length} chunks.`);
  return { blob: encodeMp3(pcm), durationSec: total / SAMPLE_RATE };
}

// --- 4. feed ---------------------------------------------------------------

function rssEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface Episode {
  title: string;
  audioUrl: string;
  bytes: number;
  durationSec: number;
  pubDate: Date;
}

function buildFeedXml(feedTitle: string, episodes: Episode[]): string {
  const items = episodes
    .map(
      (e) => `  <item>
    <title>${rssEscape(e.title)}</title>
    <guid isPermaLink="false">${rssEscape(e.audioUrl)}</guid>
    <pubDate>${e.pubDate.toUTCString()}</pubDate>
    <enclosure url="${rssEscape(e.audioUrl)}" length="${e.bytes}" type="audio/mpeg" />
    <itunes:duration>${Math.round(e.durationSec)}</itunes:duration>
  </item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
<channel>
  <title>${rssEscape(feedTitle)}</title>
  <link>${rssEscape(PDF_AUDIO_CONFIG.workerUrl)}/pdf-to-audio</link>
  <description>Chapters converted to audio in the browser with Kokoro TTS. Private feed: anyone with this URL can listen.</description>
  <language>en</language>
${items}
</channel>
</rss>
`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// --- UI wiring -------------------------------------------------------------

function show(id: string) {
  $(id).classList.remove('hidden');
}

function handleFile(file: File | undefined | null) {
  if (!file) return;
  if (!/\.pdf$/i.test(file.name)) {
    setText('file-info', 'Please choose a PDF file.');
    return;
  }
  setText('file-info', `${file.name} — ${(file.size / 1024).toFixed(0)} KB`);
  show('extract-section');
  setBar('extract-bar', 0);
  extractPdf(file)
    .then((text) => {
      extractedText = text;
      ($('extracted-text') as HTMLTextAreaElement).value = text;
      setText(
        'extract-stats',
        `${text.length.toLocaleString()} characters, ~${Math.round(text.split(/\s+/).length).toLocaleString()} words. Skim it — delete anything you don't want read aloud, then synthesize.`,
      );
      show('tts-section');
      mp3Filename = `${slugify(file.name)}-${new Date().toISOString().slice(0, 10)}.mp3`;
    })
    .catch((err) => {
      setText('extract-status', `Extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    });
}

function init() {
  const dz = $('dropzone');
  const input = $('file-input') as HTMLInputElement;
  dz.addEventListener('click', () => input.click());
  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('border-emerald-500');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('border-emerald-500'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('border-emerald-500');
    handleFile(e.dataTransfer?.files?.[0]);
  });
  input.addEventListener('change', () => handleFile(input.files?.[0]));

  // Pre-fill the upload key from the URL hash (#key=...), if present.
  const m = location.hash.match(/[#&]key=([^&]+)/);
  if (m) ($('upload-key') as HTMLInputElement).value = decodeURIComponent(m[1]);

  // Feed section visibility depends on the config flag.
  if (!PDF_AUDIO_CONFIG.uploadEnabled) {
    $('upload-live').classList.add('hidden');
    $('upload-stub').classList.remove('hidden');
  }

  ($('synthesize-btn') as HTMLButtonElement).addEventListener('click', async () => {
    const btn = $('synthesize-btn') as HTMLButtonElement;
    btn.disabled = true;
    const text = ($('extracted-text') as HTMLTextAreaElement).value.trim();
    if (!text) {
      setText('synth-status', 'Nothing to synthesize — the text box is empty.');
      btn.disabled = false;
      return;
    }
    try {
      setText('synth-status', 'Starting…');
      const { blob, durationSec } = await synthesize(text);
      mp3Blob = blob;
      mp3DurationSec = durationSec;
      const url = URL.createObjectURL(blob);
      ($('player') as HTMLAudioElement).src = url;
      const dl = $('download-mp3') as HTMLAnchorElement;
      dl.href = url;
      dl.download = mp3Filename;
      const mins = Math.floor(durationSec / 60);
      const secs = Math.round(durationSec % 60);
      setText(
        'audio-stats',
        `${mp3Filename} — ${mins}:${String(secs).padStart(2, '0')} of audio, ${(blob.size / 1024 / 1024).toFixed(1)} MB MP3.`,
      );
      show('audio-section');
      show('feed-section');
    } catch (err) {
      setText('synth-status', `Synthesis failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      btn.disabled = false;
    }
  });

  ($('upload-btn') as HTMLButtonElement).addEventListener('click', async () => {
    const btn = $('upload-btn') as HTMLButtonElement;
    const key = uploadKey();
    if (!key) {
      setText('upload-status', 'Paste the upload key first (it came with the link to this page).');
      return;
    }
    if (!mp3Blob) return;
    btn.disabled = true;
    setText('upload-status', 'Uploading MP3…');
    try {
      const token = feedToken();
      const res = await fetch(`${PDF_AUDIO_CONFIG.workerUrl}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'X-Feed-Token': token,
          'X-Filename': mp3Filename,
          'X-Duration-Seconds': String(Math.round(mp3DurationSec)),
          'Content-Type': 'audio/mpeg',
        },
        body: mp3Blob,
      });
      if (!res.ok) {
        setText('upload-status', `Upload failed (HTTP ${res.status}) — check the key and try again.`);
        return;
      }
      const data = (await res.json()) as { feedUrl: string };
      ($('feed-url') as HTMLElement).textContent = data.feedUrl;
      $('feed-result').classList.remove('hidden');
      setText('upload-status', 'Uploaded. Your feed keeps the same link for later chapters.');
    } catch (err) {
      setText('upload-status', `Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      btn.disabled = false;
    }
  });

  ($('copy-feed') as HTMLButtonElement).addEventListener('click', async () => {
    const url = ($('feed-url') as HTMLElement).textContent ?? '';
    await navigator.clipboard.writeText(url);
    setText('upload-status', 'Feed URL copied.');
  });

  ($('new-feed') as HTMLButtonElement).addEventListener('click', () => {
    localStorage.removeItem('pdf-audio-feed-token');
    $('feed-result').classList.add('hidden');
    setText('upload-status', 'New feed started — the next upload gets a fresh feed link.');
  });

  ($('download-feed') as HTMLButtonElement).addEventListener('click', () => {
    if (!mp3Blob) return;
    const token = feedToken();
    const audioUrl = `${PDF_AUDIO_CONFIG.workerUrl}/audio/${token}/${encodeURIComponent(mp3Filename)}`;
    const xml = buildFeedXml('PDF to Audio — private feed', [
      {
        title: mp3Filename.replace(/\.mp3$/i, '').replace(/_/g, ' '),
        audioUrl,
        bytes: mp3Blob.size,
        durationSec: mp3DurationSec,
        pubDate: new Date(),
      },
    ]);
    downloadBlob(new Blob([xml], { type: 'application/rss+xml' }), 'podcast-feed.xml');
  });
}

init();
