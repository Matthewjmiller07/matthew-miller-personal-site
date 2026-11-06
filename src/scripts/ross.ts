// Ross Reads It, all client-side logic.
// Pipeline: PDF, photo (OCR), link or pasted text -> sentence chunking -> Kokoro on a GPU, through
// the Worker -> MP3 in Web Workers -> optional private podcast feed. See workers/rossreadsit.
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const API = 'https://rossreadsit.parasha.workers.dev';
const SAMPLE_RATE = 24000; // Kokoro's native rate, mono
const ENGLISH_CHUNK_CHARS = 1200;
const HEBREW_CHUNK_CHARS = 1200; // Google takes 5,000 bytes a request, and a Hebrew letter is 2
const CONCURRENCY = 12; // sections in progress at once; each has its own MP3 encoder
const GAP_SAMPLES = SAMPLE_RATE / 5; // 200 ms of silence after each section
const CHARS_PER_MINUTE = 915; // measured on Ross's voice
const HEBREW_CHARS_PER_MINUTE = 730; // measured on the Hebrew voice
const MIN_EPISODE_CHARS = 400; // title pages and part dividers start unticked
const MAX_EPISODE_CHARS = 25_000; // about 27 minutes: long chapters become parts, which also keep a stop from losing much
const SKIP_BY_DEFAULT = /^((brief |detailed |short )?contents|table of contents|index|copyright|bibliography|references|notes|acknowledg|dedication|title page|cover|about the author|also by|תוכן|מפתח)/i;
const LIBRARY_KEY = 'ross-library';
const OLD_FEED_KEY = 'pdf-audio-feed-token'; // from when this tool was PDF to Audio

interface Episode { id: number; title: string; duration: number | null; created: string }
interface Feed { token: string; title: string; feedUrl: string; coverUrl: string; coverTitle: string | null; episodes: Episode[] }
interface Me { paid: boolean; paidUntil: string | null; charsLeft: number; hebrewCharsLeft: number; freeLeft: number; feeds: Feed[] }
interface Chapter { title: string; text: string }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const minutes = (chars: number, language = 'en') => Math.max(1, Math.round(chars / (language === 'he' ? HEBREW_CHARS_PER_MINUTE : CHARS_PER_MINUTE)));
const mins = (chars: number, language = 'en') => {
  const n = minutes(chars, language);
  return `${n} ${n === 1 ? 'minute' : 'minutes'}`;
};

let me: Me | null = null;
let cancelled = false;
let stopRequests: AbortController | null = null;
let mp3Blob: Blob | null = null;
let mp3Duration = 0;
let chapters: Chapter[] = [];
let bookTitle = '';
let bookText = '';
let bookRunning = false;

function status(id: string, text: string, bad = false) {
  $(id).textContent = text;
  $(id).classList.toggle('is-bad', bad);
}

function show(step: 'start' | 'review' | 'book' | 'done') {
  for (const s of ['start', 'review', 'book', 'done']) $(s).hidden = s !== step;
}

// --- Library: a random secret in this browser, carried to other devices by a link ---

function getLibrary(): string {
  const fromLink = location.hash.match(/[#&]lib=([a-f0-9]{32})/)?.[1];
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(LIBRARY_KEY);
  } catch {
    // Private window: the library lasts as long as this page.
  }
  const library =
    fromLink ?? stored ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  try {
    localStorage.setItem(LIBRARY_KEY, library);
  } catch {
    // As above.
  }
  if (fromLink) history.replaceState(null, '', location.pathname + location.search);
  return library;
}

const library = getLibrary();

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(API + path, { ...init, headers: { 'X-Library': library, ...(init.headers ?? {}) } });
}

async function apiJson(path: string, method: string, body?: unknown): Promise<Me> {
  const res = await api(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Something went wrong (HTTP ${res.status}).`);
  return data as Me;
}

function untilDate(): string {
  return new Date(me?.paidUntil ?? '').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function setMe(next: Me) {
  me = next;
  $('plan-note').textContent = next.paid && next.paidUntil ? `Your year with Ross runs until ${untilDate()}.` : '';
  renderFeeds();
  void syncCovers();
  if (!$('review').hidden) updateAllowance();
  if (!$('book').hidden) updateBook();
}

async function refresh() {
  let oldFeed: string | null = null;
  try {
    oldFeed = localStorage.getItem(OLD_FEED_KEY);
  } catch {
    // Nothing to bring across.
  }
  if (oldFeed) {
    setMe(await apiJson('/claim', 'POST', { token: oldFeed }));
    localStorage.removeItem(OLD_FEED_KEY);
  } else {
    setMe(await apiJson('/me', 'GET'));
  }
}

// --- Reading things in ---

const FEED_TITLE_CHARS = 70;
const CHAPTER_TITLE_CHARS = 80; // leaves room for ", part 10 of 12" in an episode title of 100

function clipTitle(title: string, max: number): string {
  if (title.length <= max) return title;
  const cut = title.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,:;–—-]+$/, '')}…`;
}

const SMALL_WORDS = /^(a|an|and|as|at|by|for|in|of|on|or|the|to|with)$/;

// Tables of contents often shout. A title in capitals becomes a title in title case.
function tidyChapterTitle(raw: string): string {
  let title = raw.replace(/\s+/g, ' ').trim().replace(/\s+[-–—]\s+/, ': ');
  if (/\p{Lu}/u.test(title) && !/\p{Ll}/u.test(title)) {
    title = title
      .split(' ')
      .map((word, i, words) => {
        if (/^[IVXLC]+[.:,]?$/.test(word)) return word;
        const lower = word.toLowerCase();
        return i > 0 && !words[i - 1].endsWith(':') && SMALL_WORDS.test(lower) ? lower : lower.replace(/\p{L}/u, (c) => c.toUpperCase());
      })
      .join(' ');
  }
  return clipTitle(title, CHAPTER_TITLE_CHARS);
}

function tidyFileTitle(name: string): string {
  const title = name
    .replace(/\.[^.]+$/, '')
    .replace(/_ /g, ': ')
    .replace(/[_\s]+/g, ' ')
    .replace(/[\s(–—-]*\b(pdf|e-?book|pdf e-?book)\b\)?\s*$/i, '')
    .trim();
  return clipTitle(title || name, FEED_TITLE_CHARS);
}

// Page numbers and the titles repeated at the top and bottom of pages would be read out in the
// middle of sentences. A line at a page's edge counts if it's a bare number or recurs on other pages.
function stripRunningHeads(pages: string[]): string[] {
  const key = (line: string) => line.toLowerCase().replace(/[^\p{L}]/gu, '');
  const edges = (lines: string[]) => {
    const filled = lines.flatMap((line, i) => (line.trim() ? [i] : []));
    return new Set([...filled.slice(0, 2), ...filled.slice(-2)]);
  };
  const split = pages.map((page) => page.split('\n'));
  const seen = new Map<string, number>();
  for (const lines of split) {
    const keys = new Set([...edges(lines)].map((i) => key(lines[i])));
    for (const k of keys) if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return split.map((lines) => {
    const atEdge = edges(lines);
    return lines
      .filter((line, i) => {
        if (!atEdge.has(i)) return true;
        const trimmed = line.trim();
        if (/^(\d{1,4}|[ivxlc]{1,7})$/i.test(trimmed)) return false;
        return trimmed.length > 90 || (seen.get(key(line)) ?? 0) < 3;
      })
      .join('\n');
  });
}

function cleanText(raw: string): string {
  return raw
    .replace(/(\p{Ll}) ?-\s*\n\s*(\p{Ll})/gu, '$1$2') // words split across lines
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .replace(/[\u0591-\u05AF]/g, '') // Torah cantillation marks; vowel points stay
    .trim();
}

async function readPdf(data: ArrayBuffer, say: (s: string) => void): Promise<{ text: string; chapters: Chapter[] }> {
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const raw: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    say(`Reading page ${n} of ${doc.numPages}…`);
    const content = await (await doc.getPage(n)).getTextContent();
    raw.push(
      (content.items as { str?: string; hasEOL?: boolean }[]).map((i) => (i.str ?? '') + (i.hasEOL ? '\n' : ' ')).join(''),
    );
  }
  const pages = stripRunningHeads(raw);
  const text = cleanText(pages.join('\n\n'));
  return { text, chapters: await chaptersFromOutline(doc, pages) };
}

// The PDF's own table of contents, when it has one, is the most reliable way to find chapters.
async function chaptersFromOutline(doc: pdfjsLib.PDFDocumentProxy, pages: string[]): Promise<Chapter[]> {
  try {
    const outline = (await doc.getOutline()) ?? [];
    const marks: { title: string; page: number }[] = [];
    for (const item of outline) {
      const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
      if (!dest?.[0]) continue;
      const ref = dest[0];
      const page = typeof ref === 'number' ? ref : await doc.getPageIndex(ref);
      marks.push({ title: tidyChapterTitle(item.title), page });
    }
    marks.sort((x, y) => x.page - y.page);
    const out: Chapter[] = [];
    if (marks.length && marks[0].page > 0) {
      out.push({ title: 'Front matter', text: cleanText(pages.slice(0, marks[0].page).join('\n\n')) });
    }
    marks.forEach((mark, i) => {
      // Entries on the same page share it, so a short entry still gets its text.
      const end = i + 1 < marks.length ? Math.max(marks[i + 1].page, mark.page + 1) : pages.length;
      out.push({ title: mark.title, text: cleanText(pages.slice(mark.page, end).join('\n\n')) });
    });
    return out.filter((c) => c.text);
  } catch {
    return [];
  }
}

// Without a table of contents, look for headings on lines of their own. A line ending in a
// number is a contents-page entry rather than the chapter itself.
const HEADING = /^(chapter|part|book|lesson|unit|פרק|חלק|שיעור)\s+([0-9]+|[ivxlc]+|[a-z]+|[\u05D0-\u05EA"'׳״]{1,5})\b.{0,60}$/i;
function chaptersFromHeadings(text: string): Chapter[] {
  const lines = text.split('\n');
  const starts = lines.flatMap((line, i) => (HEADING.test(line.trim()) && !/\d\s*$/.test(line.replace(/^\D*\d+/, '')) ? [i] : []));
  if (starts.length < 2) return [];
  const out: Chapter[] = [];
  const before = cleanText(lines.slice(0, starts[0]).join('\n'));
  if (before.length > 200) out.push({ title: 'Front matter', text: before });
  starts.forEach((start, i) => {
    out.push({ title: tidyChapterTitle(lines[start]), text: cleanText(lines.slice(start, starts[i + 1] ?? lines.length).join('\n')) });
  });
  // Mostly tiny sections means it found a contents page or running headers, not chapters.
  const real = out.filter((c) => c.text.length > 1000);
  return real.length >= 2 && real.length >= out.length / 2 ? out : [];
}

// A chapter too long for one sitting becomes parts, split between sentences.
function splitLongChapters(list: Chapter[]): Chapter[] {
  return list.flatMap((chapter) => {
    if (chapter.text.length <= MAX_EPISODE_CHARS) return [chapter];
    const sentences = chapter.text.match(/[^.!?…]+[.!?…]*["')\]]*\s*/g) ?? [chapter.text];
    const parts: string[] = [];
    let cur = '';
    for (const sentence of sentences) {
      if (cur && cur.length + sentence.length > MAX_EPISODE_CHARS) {
        parts.push(cur);
        cur = '';
      }
      cur += sentence;
    }
    if (cur) parts.push(cur);
    return parts.map((text, i) => ({ title: `${chapter.title}, part ${i + 1} of ${parts.length}`, text: text.trim() }));
  });
}

interface Taken { text: string; title: string; chapters?: Chapter[] }

async function readImages(files: File[], say: (s: string) => void): Promise<string> {
  say('Getting ready to read your photo…');
  const { createWorker } = await import('tesseract.js');
  let page = 1;
  const worker = await createWorker(['eng', 'heb'], 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        say(`Reading photo ${page} of ${files.length}: ${Math.round(m.progress * 100)}%`);
      }
    },
  });
  const parts: string[] = [];
  try {
    for (const file of files) {
      const { data } = await worker.recognize(file);
      parts.push(data.text);
      page++;
    }
  } finally {
    await worker.terminate();
  }
  return cleanText(parts.join('\n\n'));
}

async function readLink(link: string, say: (s: string) => void): Promise<Taken> {
  say('Fetching the page…');
  const res = await api(`/extract?url=${encodeURIComponent(link)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '' }));
    throw new Error(data.error || `Ross couldn't fetch that page (HTTP ${res.status}).`);
  }
  const host = new URL(link).hostname.replace(/^www\./, '');
  const kind = res.headers.get('X-Content-Kind');
  if (kind === 'pdf') return { ...(await readPdf(await res.arrayBuffer(), say)), title: host };
  const raw = await res.text();
  if (kind === 'text') return { text: cleanText(raw), title: host };
  // DOMParser builds an inert document: nothing in it runs or loads.
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const base = doc.createElement('base');
  base.href = link;
  doc.head.append(base);
  const { Readability } = await import('@mozilla/readability');
  const article = new Readability(doc).parse();
  if (!article?.textContent) throw new Error("Ross couldn't find an article on that page. Try pasting the text instead.");
  return { text: cleanText(article.textContent), title: article.title || host };
}

function firstWords(text: string): string {
  const line = text.trim().split(/\s+/).slice(0, 8).join(' ');
  return line.length < text.trim().length ? `${line}…` : line;
}

function review(text: string, title: string, found: Chapter[] = []) {
  if (!text.trim()) {
    status('start-status', "Ross found no words in that. If it's a scan, try a photo of the page.", true);
    show('start');
    return;
  }
  bookTitle = title;
  bookText = text;
  const list = splitLongChapters(found.length >= 2 ? found : chaptersFromHeadings(text));
  if (list.length >= 2) {
    showBook(list);
    return;
  }
  showSingle(text, title);
}

function showSingle(text: string, title: string) {
  $<HTMLInputElement>('title').value = title;
  $<HTMLTextAreaElement>('text').value = text;
  status('read-status', '');
  $('bar-wrap').hidden = true;
  show('review');
  updateAllowance();
}

async function takeInput(run: (say: (s: string) => void) => Promise<Taken>) {
  const say = (s: string) => status('start-status', s);
  $<HTMLButtonElement>('go').disabled = true;
  $<HTMLButtonElement>('choose').disabled = true;
  try {
    const { text, title, chapters: found } = await run(say);
    say('');
    review(text, title, found);
  } catch (err) {
    status('start-status', err instanceof Error ? err.message : String(err), true);
  } finally {
    $<HTMLButtonElement>('go').disabled = false;
    $<HTMLButtonElement>('choose').disabled = false;
  }
}

function takeFiles(list: FileList | File[] | null | undefined) {
  const files = Array.from(list ?? []);
  if (!files.length) return;
  const name = tidyFileTitle(files[0].name);
  const pdf = files.find((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
  const images = files.filter((f) => f.type.startsWith('image/'));
  if (pdf) void takeInput(async (say) => ({ ...(await readPdf(await pdf.arrayBuffer(), say)), title: tidyFileTitle(pdf.name) }));
  else if (images.length) void takeInput(async (say) => ({ text: await readImages(images, say), title: name }));
  else void takeInput(async () => ({ text: cleanText(await files[0].text()), title: name }));
}

// --- Allowance ---

type Language = 'en' | 'he' | 'other';

function languageOf(text: string): Language {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (!letters.length) return 'en';
  const hebrew = text.match(/\p{Script=Hebrew}/gu) ?? [];
  if (hebrew.length / letters.length > 0.2) return 'he'; // same test as the Worker
  const latin = text.match(/\p{Script=Latin}/gu) ?? [];
  return latin.length / letters.length > 0.8 ? 'en' : 'other';
}

function allowanceFor(language: Language): number {
  return language === 'he' ? (me?.hebrewCharsLeft ?? 0) : (me?.charsLeft ?? 0);
}

function updateAllowance() {
  if (!me) return;
  const value = $<HTMLTextAreaElement>('text').value;
  const length = value.trim().length;
  const language = languageOf(value);
  const left = allowanceFor(language);
  const read = $<HTMLButtonElement>('read');
  const note = $('review-note');
  $('pay').hidden = me.paid || language === 'other' || length <= left;
  read.disabled = language === 'other' || left <= 0 || length === 0;
  if (language === 'other') {
    note.textContent = 'Ross reads English and Hebrew, and this looks like another language.';
  } else if (left <= 0) {
    note.textContent = me.paid
      ? "That's all Ross can read for you today. He's back tomorrow."
      : me.freeLeft <= 0
        ? "You've used your free 5 minutes."
        : "Ross has read all he can for free today. He's back tomorrow, or get a year and he'll read now.";
  } else if (length > left) {
    note.textContent = me.paid
      ? `That's about ${mins(length, language)}. Ross can read the first ${mins(left, language)} for you today.`
      : `That's about ${mins(length, language)}. Your free reading covers the first ${mins(left, language)}.`;
  } else {
    note.textContent = `About ${mins(length, language)}. Fix or delete anything you don't want read aloud.`;
  }
}

// --- Speech ---

function chunkSentences(text: string): string[] {
  const MAX_CHUNK_CHARS = languageOf(text) === 'he' ? HEBREW_CHUNK_CHARS : ENGLISH_CHUNK_CHARS;
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
  // A "sentence" with no punctuation can run long.
  return chunks.flatMap((c) => {
    if (c.length <= MAX_CHUNK_CHARS) return [c];
    const parts: string[] = [];
    for (let i = 0; i < c.length; i += MAX_CHUNK_CHARS) parts.push(c.slice(i, i + MAX_CHUNK_CHARS));
    return parts;
  });
}

// Whole sections only, so Ross never stops mid-sentence and the allowance is never overrun.
function fitToAllowance(chunks: string[], allowance: number): string[] {
  const out: string[] = [];
  let total = 0;
  for (const chunk of chunks) {
    if (total + chunk.length > allowance) break;
    out.push(chunk);
    total += chunk.length;
  }
  return out;
}

class FinalError extends Error {} // Retrying won't help.

function pcmFromWav(wav: ArrayBuffer): Int16Array {
  const view = new DataView(wav);
  if (view.getUint32(0) !== 0x52494646) throw new Error('The voice service sent back something other than audio.');
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
  throw new Error('The audio came back empty.');
}

async function speakOnce(text: string, signal: AbortSignal): Promise<Int16Array> {
  const res = await api('/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });
  if (res.status === 402) throw new FinalError(me?.paid ? "That's all Ross can read for you today." : "That's the end of your free reading.");
  if (res.status === 403) throw new FinalError("Ross doesn't read for this page.");
  if (!res.ok) throw new Error(`The voice service had a problem (HTTP ${res.status}).`);
  // Hebrew comes back as the audio itself; English as a link to it.
  if (res.headers.get('Content-Type')?.startsWith('audio/')) return pcmFromWav(await res.arrayBuffer());
  const { url } = (await res.json()) as { url: string };
  const audio = await fetch(url, { signal });
  if (!audio.ok) throw new Error(`Ross couldn't fetch the audio (HTTP ${audio.status}).`);
  return pcmFromWav(await audio.arrayBuffer());
}

async function speak(text: string, signal: AbortSignal): Promise<Int16Array> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await speakOnce(text, signal);
    } catch (err) {
      if (signal.aborted || err instanceof FinalError || attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

// One encoder per runner, off the main thread: encoding is CPU-heavy (about 40x realtime per
// core) and would otherwise cap the whole pipeline and freeze the page.
function startEncoder() {
  const worker = new Worker('/ross/encoder.js');
  return {
    encode: (pcm: Int16Array) =>
      new Promise<Uint8Array>((resolve, reject) => {
        worker.onmessage = ({ data }) => resolve(data);
        worker.onerror = (e) => reject(new Error(e.message || "The MP3 encoder didn't load."));
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
  chunks: string[],
  onProgress?: (fraction: number) => void,
  statusId = 'read-status',
): Promise<{ blob: Blob; duration: number; done: number }> {
  const started = performance.now();
  const sections: ({ mp3: Uint8Array; samples: number } | undefined)[] = new Array(chunks.length);
  stopRequests = new AbortController();
  const { signal } = stopRequests;
  let next = 0;
  let finished = 0;
  let failure: unknown = null;

  const progress = () => {
    if (onProgress) {
      onProgress(finished / chunks.length);
      return;
    }
    $('bar').style.width = `${(finished / chunks.length) * 100}%`;
    const elapsed = performance.now() - started;
    const left = finished ? Math.ceil(((elapsed / finished) * (chunks.length - finished)) / 1000) : 0;
    status('read-status', `Ross is reading: ${finished} of ${chunks.length} sections${left ? `, about ${left}s left` : ''}`);
  };

  const runner = async () => {
    const encoder = startEncoder();
    try {
      while (next < chunks.length && !cancelled && !failure) {
        const i = next++;
        const pcm = withGap(await speak(chunks[i], signal));
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
  if (message) status(statusId, message, true);
  return { blob: new Blob(parts as BlobPart[], { type: 'audio/mpeg' }), duration: samples / SAMPLE_RATE, done };
}

async function readAloud() {
  if (!me) return;
  const text = $<HTMLTextAreaElement>('text').value.trim();
  const all = chunkSentences(text);
  const chunks = fitToAllowance(all, allowanceFor(languageOf(text)));
  if (!chunks.length) {
    status('read-status', me.paid ? "Ross can't read any more for you today." : 'Your free reading has run out. Get a year and Ross will read this.', true);
    return;
  }
  const read = $<HTMLButtonElement>('read');
  const stop = $<HTMLButtonElement>('stop');
  const mark = $('ross-mark');
  cancelled = false;
  read.disabled = true;
  stop.hidden = false;
  stop.disabled = false;
  $('restart').hidden = true;
  $('bar-wrap').hidden = false;
  $('pay').hidden = true;
  mark.classList.add('is-reading');
  const started = performance.now();
  try {
    const { blob, duration, done } = await synthesize(chunks);
    if (!done) {
      if (cancelled) status('read-status', 'Stopped before any audio was finished.');
      return;
    }
    mp3Blob = blob;
    mp3Duration = duration;
    const url = URL.createObjectURL(blob);
    $<HTMLAudioElement>('player').src = url;
    const download = $<HTMLAnchorElement>('download');
    download.href = url;
    const title = $<HTMLInputElement>('title').value.trim() || firstWords(text);
    download.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'ross'}.mp3`;
    $('done-title').textContent = title;
    const length = `${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, '0')}`;
    const time = ((performance.now() - started) / 1000).toFixed(0);
    $('done-note').textContent =
      done < all.length
        ? `${length} of audio, made in ${time}s. Ross read ${done} of ${all.length} sections; the rest didn't get read.`
        : `${length} of audio, made in ${time}s.`;
    status('add-status', '');
    fillFeedPicker();
    show('done');
  } finally {
    mark.classList.remove('is-reading');
    stop.hidden = true;
    $('restart').hidden = false;
    read.disabled = false;
    void apiJson('/me', 'GET').then(setMe).catch(() => {});
  }
}

async function addEpisode(feedToken: string, title: string, blob: Blob, duration: number) {
  const res = await api('/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'audio/mpeg',
      'X-Feed-Token': feedToken,
      'X-Title': encodeURIComponent(title),
      'X-Duration-Seconds': String(Math.round(duration)),
    },
    body: blob,
  });
  if (res.status === 402) throw new Error('Too much audio has been added today. Try again tomorrow.');
  if (!res.ok) throw new Error(`Adding it failed (HTTP ${res.status}). Try again.`);
  setMe((await res.json()) as Me);
}

// --- Books: one episode per chapter ---

function chapterRows() {
  return [...document.querySelectorAll<HTMLInputElement>('#chapter-list input[type=checkbox]')];
}

function selectedChapters() {
  return chapterRows().filter((box) => box.checked).map((box) => Number(box.value));
}

function targetFeed(): Feed | undefined {
  return me?.feeds.find((f) => f.token === $<HTMLSelectElement>('book-feed').value);
}

function updateBook() {
  if (!me || $('book').hidden) return;
  const feed = targetFeed();
  const done = new Set(feed?.episodes.map((e) => e.title));
  for (const box of chapterRows()) {
    const chapter = chapters[Number(box.value)];
    const already = done.has(chapter.title);
    (box.closest('li') as HTMLElement).dataset.done = already ? '1' : '';
    if (already) box.checked = false;
  }
  const picked = selectedChapters();
  const total = picked.reduce((sum, i) => sum + chapters[i].text.length, 0);
  const language = languageOf(chapters.map((c) => c.text).join(' ').slice(0, 5000));
  const left = allowanceFor(language);
  $('pay-book').hidden = me.paid || language === 'other' || total <= left;
  const read = $<HTMLButtonElement>('read-book');
  read.textContent = `Read ${picked.length} ${picked.length === 1 ? 'episode' : 'episodes'}`;
  read.disabled = bookRunning || picked.length === 0 || language === 'other';
  const hours = minutes(total, language) / 60;
  const size = hours >= 1 ? `about ${hours.toFixed(1)} hours` : `about ${mins(total, language)}`;
  $('book-note').textContent = language === 'other'
    ? 'Ross reads English and Hebrew, and this looks like another language.'
    : total > left
      ? me.paid
        ? `That's ${size}. Ross can read about ${mins(left, language)} for you today. Drop the same file in tomorrow and he picks up where he left off.`
        : left > 0
          ? `That's ${size}. You have about ${mins(left, language)} of free reading left.`
          : `That's ${size}. You've used your free 5 minutes.`
      : `That's ${size}. Keep this tab open while Ross reads.`;
}

function showBook(list: Chapter[]) {
  chapters = list;
  $('book-title').textContent = `Ross split this into ${list.length} episodes`;
  $('chapter-list').replaceChildren(
    ...list.map((chapter, i) => {
      const box = el('input', { type: 'checkbox', value: String(i), checked: !SKIP_BY_DEFAULT.test(chapter.title) && chapter.title !== 'Front matter' && !/\b(front|back) cover\b/i.test(chapter.title) && chapter.text.length >= MIN_EPISODE_CHARS });
      box.addEventListener('change', updateBook);
      return el(
        'li',
        {},
        el('label', {}, box, el('span', { className: 'ross-ch-title', textContent: chapter.title }), el('span', { className: 'ross-ch-len', textContent: `${minutes(chapter.text.length, languageOf(chapter.text))} min` })),
      );
    }),
  );
  fillBookFeeds();
  status('book-status', '');
  $('book-bar-wrap').hidden = true;
  show('book');
  updateBook();
}

const NEW_FEED = 'new';

function fillBookFeeds() {
  const pick = $<HTMLSelectElement>('book-feed');
  const current = pick.value;
  const existing = me?.feeds.find((f) => f.title === bookTitle);
  pick.replaceChildren(
    ...(existing ? [] : [el('option', { value: NEW_FEED, textContent: `A new feed called "${bookTitle}"` })]),
    ...(me?.feeds ?? []).map((f) => el('option', { value: f.token, textContent: f.title })),
  );
  if (existing) pick.value = existing.token;
  else if (current && [...pick.options].some((o) => o.value === current)) pick.value = current;
}

async function readBook() {
  const picked = selectedChapters();
  if (!picked.length || !me) return;
  const read = $<HTMLButtonElement>('read-book');
  const stop = $<HTMLButtonElement>('stop-book');
  const bar = $('book-bar');
  const mark = $('ross-mark');
  cancelled = false;
  bookRunning = true;
  read.disabled = true;
  stop.hidden = false;
  stop.disabled = false;
  $('book-bar-wrap').hidden = false;
  mark.classList.add('is-reading');
  const say = (text: string, bad = false) => status('book-status', text, bad);
  let finished = 0;
  try {
    let token = $<HTMLSelectElement>('book-feed').value;
    if (token === NEW_FEED) {
      const before = new Set(me.feeds.map((f) => f.token));
      setMe(await apiJson('/feeds', 'POST', { title: bookTitle }));
      token = me.feeds.find((f) => !before.has(f.token))?.token ?? '';
      fillBookFeeds();
      $<HTMLSelectElement>('book-feed').value = token;
    }
    for (const index of picked) {
      if (cancelled) break;
      const chapter = chapters[index];
      const language = languageOf(chapter.text);
      const allowance = allowanceFor(language);
      if (language === 'other') {
        say(`"${chapter.title}" isn't in English or Hebrew, so Ross stopped there.`, true);
        break;
      }
      if (chapter.text.length > allowance) {
        const count = `${finished} ${finished === 1 ? 'chapter' : 'chapters'}`;
        say(
          me.paid
            ? finished
              ? `Ross read ${count} today, which is all he can. Drop the same file in tomorrow and he picks up where he left off.`
              : 'The next chapter is longer than what Ross has left for you today. Try again tomorrow.'
            : finished
              ? `Ross read ${count} with your free reading. Get a year, drop the same file in, and he picks up where he left off.`
              : "The next chapter is longer than your free reading. Get a year, or have Ross read the start as one episode.",
          !finished,
        );
        break;
      }
      const label = `${finished + 1} of ${picked.length}: ${chapter.title}`;
      const pieces = chunkSentences(chapter.text);
      const { blob, duration, done } = await synthesize(pieces, (fraction) => {
        bar.style.width = `${((finished + fraction) / picked.length) * 100}%`;
        status('book-status', `Reading ${label}`);
      }, 'book-status');
      if (cancelled) break;
      // Never publish half a chapter as if it were whole.
      if (done < pieces.length) break;
      say(`Adding ${label}`);
      await addEpisode(token, chapter.title, blob, duration);
      finished++;
      bar.style.width = `${(finished / picked.length) * 100}%`;
      updateBook();
      await apiJson('/me', 'GET').then(setMe);
    }
    if (finished === picked.length) say(`Done. ${finished === 1 ? 'The episode is' : `All ${finished} episodes are`} in your feed. Subscribe below if you haven't yet.`);
    else if (cancelled) say(`Stopped. ${finished} ${finished === 1 ? 'chapter is' : 'chapters are'} in your feed.`);
  } catch (err) {
    say(err instanceof Error ? err.message : String(err), true);
  } finally {
    bookRunning = false;
    mark.classList.remove('is-reading');
    stop.hidden = true;
    updateBook();
  }
}

// --- Feeds ---

function fillFeedPicker() {
  const pick = $<HTMLSelectElement>('feed-pick');
  const current = pick.value;
  pick.replaceChildren(
    ...(me?.feeds ?? []).map((f) => {
      const option = document.createElement('option');
      option.value = f.token;
      option.textContent = f.title;
      return option;
    }),
  );
  if (current && [...pick.options].some((o) => o.value === current)) pick.value = current;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}

// --- Cover art: Ross and the feed's title, drawn here so Hebrew is shaped by the browser ---

const COVER_SIZE = 1400; // the smallest Apple Podcasts accepts
const COVER_MARGIN = 110;
const COVER_FONT = '"Bricolage Grotesque", "Heebo", system-ui, sans-serif';

// Lay the title out as big as it fits above Ross, breaking mid-word only when a word can't fit.
function fitTitle(ctx: CanvasRenderingContext2D, title: string, width: number, height: number) {
  const LINE = 1.04;
  const SMALLEST = 74;
  for (let size = 230; size >= SMALLEST; size -= 6) {
    ctx.font = `800 ${size}px ${COVER_FONT}`;
    const fits = (s: string) => ctx.measureText(s).width <= width;
    const words = title.split(/\s+/).flatMap((word) => {
      if (fits(word) || size > SMALLEST) return [word];
      const pieces: string[] = [];
      let cur = '';
      for (const ch of word) {
        if (!fits(cur + ch)) {
          pieces.push(cur);
          cur = '';
        }
        cur += ch;
      }
      return [...pieces, cur];
    });
    if (!words.every(fits)) continue;
    const lines: string[] = [];
    for (const word of words) {
      const last = lines[lines.length - 1];
      if (last !== undefined && fits(`${last} ${word}`)) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    if (lines.length * size * LINE <= height) return { lines, size, step: size * LINE };
  }
  return { lines: [title], size: SMALLEST, step: SMALLEST * LINE };
}

async function drawCover(title: string): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`800 100px "Bricolage Grotesque"`, 'Ross'),
    document.fonts.load(`800 100px "Heebo"`, 'א'),
  ]).catch(() => undefined); // A missing font falls back to the system's.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = COVER_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1b2bd8';
  ctx.fillRect(0, 0, COVER_SIZE, COVER_SIZE);

  // Ross, from public/ross/mark.svg, in its 100-unit square.
  ctx.save();
  ctx.translate(COVER_MARGIN - 60, COVER_SIZE - 400);
  ctx.scale(4, 4);
  ctx.strokeStyle = '#ffc92e';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.stroke(new Path2D('M30 37a35 35 0 0 1 35 35'));
  ctx.stroke(new Path2D('M30 16a56 56 0 0 1 56 56'));
  ctx.fillStyle = '#ffc92e';
  ctx.fill(new Path2D('M46 72a16 16 0 1 1-32 0a16 16 0 1 1 32 0'));
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#10133f';
  for (const x of [23.5, 36.5]) {
    const eye = new Path2D();
    eye.arc(x, 71, 5.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf4';
    ctx.fill(eye);
    ctx.stroke(eye);
    ctx.fillStyle = '#10133f';
    ctx.beginPath();
    ctx.arc(x + 1, 71.4, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.stroke(new Path2D('M29 70.5q1-1 2 0'));
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fffdf4';
  ctx.font = `800 76px ${COVER_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Ross reads it', COVER_SIZE - COVER_MARGIN, COVER_SIZE - 130);

  const rtl = languageOf(title) === 'he';
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = rtl ? 'right' : 'left';
  ctx.fillStyle = '#ffc92e';
  const { lines, size, step } = fitTitle(ctx, title, COVER_SIZE - COVER_MARGIN * 2, COVER_SIZE - COVER_MARGIN - 470);
  ctx.font = `800 ${size}px ${COVER_FONT}`;
  lines.forEach((line, i) => ctx.fillText(line, rtl ? COVER_SIZE - COVER_MARGIN : COVER_MARGIN, COVER_MARGIN + size * 0.85 + i * step));

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No cover'))), 'image/png');
  });
}

// Every new visitor has an empty "My reading", so that one waits until it holds something.
const wantsCover = (feed: Feed) => feed.coverTitle !== feed.title && (feed.episodes.length > 0 || feed.title !== 'My reading');
const coverTried = new Map<string, string>();
let coversRunning = false;

async function syncCovers() {
  if (coversRunning) return;
  coversRunning = true;
  try {
    for (;;) {
      const feed = me?.feeds.find((f) => wantsCover(f) && coverTried.get(f.token) !== f.title);
      if (!feed) return;
      const { token, title } = feed;
      coverTried.set(token, title);
      try {
        const res = await api(`/feeds/${token}/cover`, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/png', 'X-Cover-Title': encodeURIComponent(title) },
          body: await drawCover(title),
        });
        if (!res.ok) continue;
        const cover = (await res.json()) as Pick<Feed, 'coverUrl' | 'coverTitle'>;
        const current = me?.feeds.find((f) => f.token === token);
        if (current) Object.assign(current, cover);
        document.querySelector<HTMLImageElement>(`img[data-cover="${token}"]`)?.setAttribute('src', cover.coverUrl);
      } catch {
        // The feed keeps its current art, and the next visit tries again.
      }
    }
  } finally {
    coversRunning = false;
  }
}

// Saving a title doesn't redraw the list, so the cursor stays wherever the person moved it next.
function titleInput(className: string, label: string, value: string, maxLength: number, path: string) {
  const input = el('input', { className, type: 'text', value, maxLength, ariaLabel: label, dir: 'auto' });
  let saved = value;
  input.addEventListener('change', async () => {
    const title = input.value.trim();
    if (!title) {
      input.value = saved;
      return;
    }
    try {
      me = await apiJson(path, 'PATCH', { title });
      saved = title;
      fillFeedPicker();
      if (!$('book').hidden) updateBook();
      status('feeds-status', 'Saved. Podcast apps show the change the next time they refresh.');
      void syncCovers();
    } catch (err) {
      input.value = saved;
      status('feeds-status', err instanceof Error ? err.message : String(err), true);
    }
  });
  return input;
}

const openEpisodeLists = new Set<string>();

function renderFeeds() {
  fillFeedPicker();
  const say = (s: string, bad = false) => status('feeds-status', s, bad);
  const act = (run: () => Promise<Me>) =>
    run().then(setMe).catch((err) => say(err instanceof Error ? err.message : String(err), true));
  $('feeds').replaceChildren(
    ...(me?.feeds ?? []).map((feed) => {
      const host = feed.feedUrl.replace(/^https?:\/\//, '');
      const name = titleInput('ross-feed-name', 'Feed name', feed.title, FEED_TITLE_CHARS, `/feeds/${feed.token}`);
      const cover = el('img', { className: 'ross-feed-cover', src: feed.coverUrl, alt: '', width: 72, height: 72 });
      cover.dataset.cover = feed.token;
      const copy = el('button', { className: 'ross-link', type: 'button', textContent: 'Copy link' });
      copy.addEventListener('click', async () => {
        await navigator.clipboard.writeText(feed.feedUrl);
        copy.textContent = 'Copied';
        setTimeout(() => (copy.textContent = 'Copy link'), 1500);
      });
      const subs = el(
        'div',
        { className: 'ross-subs' },
        el('a', { className: 'ross-link', href: `podcast://${host}`, textContent: 'Apple Podcasts' }),
        el('a', { className: 'ross-link', href: `overcast://x-callback-url/add?url=${encodeURIComponent(feed.feedUrl)}`, textContent: 'Overcast' }),
        el('a', { className: 'ross-link', href: `pktc://subscribe/${host}`, textContent: 'Pocket Casts' }),
        copy,
      );
      const remove = el('button', { className: 'ross-link', type: 'button', textContent: 'Delete feed' });
      remove.addEventListener('click', () => {
        if (remove.dataset.armed) act(() => apiJson(`/feeds/${feed.token}`, 'DELETE'));
        else {
          remove.dataset.armed = '1';
          remove.textContent = feed.episodes.length
            ? `Delete this feed and its ${feed.episodes.length} ${feed.episodes.length === 1 ? 'episode' : 'episodes'}?`
            : 'Delete this feed?';
        }
      });
      const count = feed.episodes.length;
      const list = el(
        'ul',
        {},
        ...feed.episodes.map((episode) => {
          const del = el('button', { className: 'ross-link', type: 'button', textContent: 'Delete' });
          del.addEventListener('click', () => act(() => apiJson(`/episodes/${episode.id}`, 'DELETE')));
          return el('li', {}, titleInput('ross-ep-name', 'Episode title', episode.title, 100, `/episodes/${episode.id}`), del);
        }),
      );
      const episodes = el(
        'details',
        { className: 'ross-eps', open: openEpisodeLists.has(feed.token) },
        el('summary', { textContent: count ? `${count} ${count === 1 ? 'episode' : 'episodes'}` : 'No episodes yet' }),
        list,
        remove,
      );
      episodes.addEventListener('toggle', () => {
        if (episodes.open) openEpisodeLists.add(feed.token);
        else openEpisodeLists.delete(feed.token);
      });
      return el('article', { className: 'ross-feed' }, el('div', { className: 'ross-feed-top' }, cover, name), subs, episodes);
    }),
  );
}

// --- Wiring ---

function init() {
  const sheet = document.querySelector('.ross-sheet') as HTMLElement;
  for (const type of ['dragenter', 'dragover']) {
    sheet.addEventListener(type, (e) => {
      e.preventDefault();
      sheet.classList.add('is-over');
    });
  }
  sheet.addEventListener('dragleave', (e) => {
    if (!sheet.contains(e.relatedTarget as Node)) sheet.classList.remove('is-over');
  });
  sheet.addEventListener('drop', (e) => {
    e.preventDefault();
    sheet.classList.remove('is-over');
    show('start');
    takeFiles(e.dataTransfer?.files);
  });

  const file = $<HTMLInputElement>('file');
  $('choose').addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    takeFiles(file.files);
    file.value = '';
  });

  const input = $<HTMLTextAreaElement>('input');
  const go = () => {
    const value = input.value.trim();
    if (!value) {
      status('start-status', 'Paste a link or some text first, or choose a file.', true);
      return;
    }
    if (/^https?:\/\/\S+$/i.test(value)) void takeInput((say) => readLink(value, say));
    else void takeInput(async () => ({ text: cleanText(value), title: firstWords(value) }));
  };
  $('go').addEventListener('click', go);
  // Pasting an image, such as a screenshot, works like choosing a file.
  input.addEventListener('paste', (e) => {
    const images = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (images.length) {
      e.preventDefault();
      takeFiles(images);
    }
  });

  $('text').addEventListener('input', updateAllowance);
  $('read').addEventListener('click', () => void readAloud());
  $('stop').addEventListener('click', () => {
    cancelled = true;
    $<HTMLButtonElement>('stop').disabled = true;
    stopRequests?.abort();
  });
  const again = () => {
    input.value = '';
    status('start-status', '');
    show('start');
    input.focus();
  };
  $('restart').addEventListener('click', again);
  $('another').addEventListener('click', again);

  for (const [button, statusId] of [['pay-button', 'read-status'], ['pay-button-book', 'book-status']]) {
    $(button).addEventListener('click', async () => {
      const go = $<HTMLButtonElement>(button);
      go.disabled = true;
      status(statusId, 'Opening checkout…');
      try {
        const res = await api('/checkout', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Something went wrong (HTTP ${res.status}).`);
        location.href = data.url;
      } catch (err) {
        status(statusId, err instanceof Error ? err.message : String(err), true);
        go.disabled = false;
      }
    });
  }

  $('book-feed').addEventListener('change', updateBook);
  $('read-book').addEventListener('click', () => void readBook());
  $('stop-book').addEventListener('click', () => {
    cancelled = true;
    $<HTMLButtonElement>('stop-book').disabled = true;
    stopRequests?.abort();
  });
  $('as-one').addEventListener('click', () => showSingle(bookText, bookTitle));
  $('restart-book').addEventListener('click', again);

  $('add').addEventListener('click', async () => {
    if (!mp3Blob) return;
    const add = $<HTMLButtonElement>('add');
    const pick = $<HTMLSelectElement>('feed-pick');
    add.disabled = true;
    status('add-status', 'Adding…');
    try {
      const feedName = pick.selectedOptions[0]?.textContent ?? 'your feed';
      await addEpisode(pick.value, $('done-title').textContent ?? '', mp3Blob, mp3Duration);
      status('add-status', `Added to ${feedName}. It shows up in your podcast app the next time it checks. Subscribe below if you haven't yet.`);
    } catch (err) {
      status('add-status', err instanceof Error ? err.message : String(err), true);
    } finally {
      add.disabled = false;
    }
  });

  $('new-feed').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $<HTMLInputElement>('new-feed-name');
    try {
      setMe(await apiJson('/feeds', 'POST', { title: name.value }));
      name.value = '';
      status('feeds-status', '');
    } catch (err) {
      status('feeds-status', err instanceof Error ? err.message : String(err), true);
    }
  });

  $('copy-link').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`${location.origin}/ross#lib=${library}`);
    $('copy-link-status').textContent = 'Copied. Open it on your other device. Keep it private: it opens your feeds.';
  });

  const params = new URLSearchParams(location.search);
  const backFromPaying = params.has('paid');
  if (backFromPaying) history.replaceState(null, '', location.pathname);
  refresh()
    .then(() => {
      if (!backFromPaying) return;
      if (me?.paid) status('start-status', `Thank you. Ross will read as much as you like until ${untilDate()}. Give him your file or link again to start. Use "Copy my link" below to put this on your other devices, and keep that link somewhere safe: it's how you get back to your year.`);
      else status('start-status', "Stripe hasn't confirmed your payment yet. Reload this page in a minute.", true);
    })
    .catch(() => status('feeds-status', "Ross couldn't load your feeds. Reload the page to try again.", true));

  const shared = params.get('url');
  if (shared) {
    input.value = shared;
    go();
  }
}

init();
