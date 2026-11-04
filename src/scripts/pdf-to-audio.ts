// PDF to Audio — all client-side logic.
// Pipeline: pdf.js extraction -> sentence chunking -> Kokoro TTS on a GPU (parallel requests
// through the pdf-to-audio Worker) -> lamejs MP3 encode in a Web Worker -> optional upload to
// Cloudflare R2 + tokenized RSS feed. The PDF stays on the device; the text is sent to be spoken.

// ---------------------------------------------------------------------------
// CONFIG — the one place that knows about the server side. Flip uploadEnabled
// to true once the R2 bucket + pdf-to-audio Worker are live (see
// workers/pdf-to-audio/wrangler.toml). Until then the page works fully except
// upload: MP3 download + downloadable feed XML still work.
// ---------------------------------------------------------------------------
export const PDF_AUDIO_CONFIG = {
  workerUrl: 'https://pdf-to-audio.parasha.workers.dev',
  uploadEnabled: true,
};

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const SAMPLE_RATE = 24000; // Kokoro-82M native sample rate (mono)
const MAX_CHUNK_CHARS = 1200; // sentence-based chunks; the Worker accepts up to 4,000
const CONCURRENCY = 12; // sections in progress at once; each has its own MP3 encoder
const GAP_SAMPLES = SAMPLE_RATE / 5; // 200 ms of silence after each section

let extractedText = '';
let mp3Blob: Blob | null = null;
let mp3DurationSec = 0;
let mp3Filename = 'chapter.mp3';
let cancelled = false;
let stopRequests: AbortController | null = null;

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
const KEY_STORAGE = 'pdf-audio-key';
function storedKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}
function rememberKey(key: string) {
  try {
    localStorage.setItem(KEY_STORAGE, key);
  } catch {
    // Private window: the key just has to be pasted again next time.
  }
}
function uploadKey(): string {
  // init() copies a #key= from the link into the field.
  return ($('upload-key') as HTMLInputElement).value.trim() || storedKey();
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
    // The last alternative keeps trailing text that has no final punctuation.
    .match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) ?? [text];
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

class AuthError extends Error {}

function pcmFromWav(wav: ArrayBuffer): Int16Array {
  const view = new DataView(wav);
  if (view.getUint32(0) !== 0x52494646) throw new Error('Speech service returned something other than audio.');
  if (view.getUint32(24, true) !== SAMPLE_RATE) throw new Error('Unexpected audio sample rate.');
  let pos = 12;
  while (pos + 8 <= view.byteLength) {
    const size = view.getUint32(pos + 4, true);
    if (view.getUint32(pos) === 0x64617461) {
      const end = Math.min(pos + 8 + size, view.byteLength);
      return new Int16Array(wav.slice(pos + 8, end - ((end - pos - 8) % 2)));
    }
    pos += 8 + size + (size % 2);
  }
  throw new Error('Audio had no data section.');
}

async function speakOnce(text: string, key: string, signal: AbortSignal): Promise<Int16Array> {
  const res = await fetch(`${PDF_AUDIO_CONFIG.workerUrl}/tts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });
  if (res.status === 401) throw new AuthError('That key was not accepted.');
  if (!res.ok) throw new Error(`Speech service error (HTTP ${res.status}).`);
  const { url } = (await res.json()) as { url: string };
  const audio = await fetch(url, { signal });
  if (!audio.ok) throw new Error(`Could not fetch audio (HTTP ${audio.status}).`);
  return pcmFromWav(await audio.arrayBuffer());
}

async function speak(text: string, key: string, signal: AbortSignal): Promise<Int16Array> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await speakOnce(text, key, signal);
    } catch (err) {
      if (signal.aborted || err instanceof AuthError || attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

// One encoder per runner, off the main thread: encoding is CPU-heavy (about 40x realtime per
// core) and would otherwise cap the whole pipeline and freeze the page.
function startEncoder() {
  const worker = new Worker('/pdf-audio-encoder.js');
  return {
    encode: (pcm: Int16Array) =>
      new Promise<Uint8Array>((resolve, reject) => {
        worker.onmessage = ({ data }) => resolve(data);
        worker.onerror = (e) => reject(new Error(e.message || 'MP3 encoder failed to load.'));
        worker.postMessage(pcm, [pcm.buffer]);
      }),
    stop: () => worker.terminate(),
  };
}

function withGap(pcm: Int16Array): Int16Array {
  const out = new Int16Array(pcm.length + GAP_SAMPLES);
  out.set(pcm);
  return out;
}

async function synthesize(
  text: string,
  key: string,
): Promise<{ blob: Blob; durationSec: number; chunksDone: number; failure: string; authFailed: boolean }> {
  const chunks = chunkSentences(text);
  const started = performance.now();
  const sections: ({ mp3: Uint8Array; samples: number } | undefined)[] = new Array(chunks.length);
  stopRequests = new AbortController();
  const { signal } = stopRequests;
  let next = 0;
  let finished = 0;
  let failure: unknown = null;

  const progress = () => {
    setBar('synth-bar', (finished / chunks.length) * 100);
    const elapsed = performance.now() - started;
    const left = finished ? Math.ceil(((elapsed / finished) * (chunks.length - finished)) / 1000) : 0;
    setText(
      'synth-status',
      `Finished ${finished} of ${chunks.length} sections${left ? `, about ${left}s left` : ''}…`,
    );
  };

  const runner = async () => {
    const encoder = startEncoder();
    try {
      while (next < chunks.length && !cancelled && !failure) {
        const i = next++;
        const pcm = withGap(await speak(chunks[i], key, signal));
        const samples = pcm.length;
        sections[i] = { mp3: await encoder.encode(pcm), samples };
        finished++;
        progress();
      }
    } catch (err) {
      if (!cancelled && !failure) {
        failure = err;
        stopRequests?.abort(); // No point finishing audio past a gap.
      }
    } finally {
      encoder.stop();
    }
  };

  progress();
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, runner));

  // Keep everything up to the first missing section: audio must never silently skip a passage.
  const parts: Uint8Array[] = [];
  let samples = 0;
  let done = 0;
  for (const section of sections) {
    if (!section) break;
    parts.push(section.mp3);
    samples += section.samples;
    done++;
  }

  const message = failure instanceof Error ? failure.message : failure ? String(failure) : '';
  setBar('synth-bar', (done / chunks.length) * 100);
  if (done === chunks.length) {
    setText('synth-status', `Done in ${((performance.now() - started) / 1000).toFixed(0)}s.`);
  } else if (done === 0) {
    setText('synth-status', message || 'Stopped before any audio was finished.');
  } else {
    setText(
      'synth-status',
      `Stopped after ${done} of ${chunks.length} sections${message ? `: ${message}` : '.'} Partial audio below.`,
    );
  }
  return {
    blob: new Blob(parts as BlobPart[], { type: 'audio/mpeg' }),
    durationSec: samples / SAMPLE_RATE,
    chunksDone: done,
    failure: message,
    authFailed: failure instanceof AuthError,
  };
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
  <description>Chapters converted to audio with Kokoro TTS. Private feed: anyone with this URL can listen.</description>
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
      if (!text) {
        setText('extract-status', 'This PDF has no selectable text (it may be a scan), so there is nothing to read aloud.');
        return;
      }
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

  // Pre-fill the access key from the URL hash (#key=...), if present.
  const m = location.hash.match(/[#&]key=([^&]+)/);
  if (m) ($('upload-key') as HTMLInputElement).value = decodeURIComponent(m[1]);

  // A key from the link is remembered on this device; the field stays out of the way.
  if (m) rememberKey(decodeURIComponent(m[1]));
  if (uploadKey()) $('key-block').classList.add('hidden');

  // Feed section visibility depends on the config flag.
  if (!PDF_AUDIO_CONFIG.uploadEnabled) {
    $('upload-live').classList.add('hidden');
    $('upload-stub').classList.remove('hidden');
  }

  ($('synthesize-btn') as HTMLButtonElement).addEventListener('click', async () => {
    const btn = $('synthesize-btn') as HTMLButtonElement;
    const stopBtn = $('stop-btn') as HTMLButtonElement;
    btn.disabled = true;
    const text = ($('extracted-text') as HTMLTextAreaElement).value.trim();
    if (!text) {
      setText('synth-status', 'Nothing to synthesize — the text box is empty.');
      btn.disabled = false;
      return;
    }
    const key = uploadKey();
    if (!key) {
      setText('synth-status', 'Paste your access key first (it came with the link to this page).');
      btn.disabled = false;
      return;
    }
    cancelled = false;
    stopBtn.classList.remove('hidden');
    stopBtn.disabled = false;
    stopBtn.onclick = () => {
      cancelled = true;
      stopBtn.disabled = true;
      stopRequests?.abort();
    };
    try {
      const { blob, durationSec, chunksDone, authFailed } = await synthesize(text, key);
      if (authFailed) {
        // Don't keep offering a bad key on the next visit.
        try {
          localStorage.removeItem(KEY_STORAGE);
        } catch {
          // Nothing stored, then.
        }
        ($('upload-key') as HTMLInputElement).value = '';
        $('key-block').classList.remove('hidden');
      }
      if (chunksDone === 0) return;
      rememberKey(key);
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
      stopBtn.classList.add('hidden');
    }
  });

  ($('upload-btn') as HTMLButtonElement).addEventListener('click', async () => {
    const btn = $('upload-btn') as HTMLButtonElement;
    const key = uploadKey();
    if (!key) {
      setText('upload-status', 'Paste your access key first (it came with the link to this page).');
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
        setText('upload-status', `Upload failed (HTTP ${res.status}) — check the access key and try again.`);
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
