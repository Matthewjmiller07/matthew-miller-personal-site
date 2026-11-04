// Ross Reads It, all client-side logic.
// Pipeline: PDF, photo (OCR), link or pasted text -> sentence chunking -> Kokoro on a GPU, through
// the Worker -> MP3 in Web Workers -> optional private podcast feed. See workers/rossreadsit.
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const API = 'https://rossreadsit.parasha.workers.dev';
const SAMPLE_RATE = 24000; // Kokoro's native rate, mono
const MAX_CHUNK_CHARS = 1200;
const CONCURRENCY = 12; // sections in progress at once; each has its own MP3 encoder
const GAP_SAMPLES = SAMPLE_RATE / 5; // 200 ms of silence after each section
const CHARS_PER_MINUTE = 915; // measured on Ross's voice
const LIBRARY_KEY = 'ross-library';
const OLD_FEED_KEY = 'pdf-audio-feed-token'; // from when this tool was PDF to Audio

interface Episode { id: number; title: string; duration: number | null; created: string }
interface Feed { token: string; title: string; feedUrl: string; episodes: Episode[] }
interface Me { hasEmail: boolean; charsLeft: number; sharedLeft: number; freeChars: number; emailChars: number; feeds: Feed[] }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const minutes = (chars: number) => Math.max(1, Math.round(chars / CHARS_PER_MINUTE));

let me: Me | null = null;
let cancelled = false;
let stopRequests: AbortController | null = null;
let mp3Blob: Blob | null = null;
let mp3Duration = 0;

function status(id: string, text: string, bad = false) {
  $(id).textContent = text;
  $(id).classList.toggle('is-bad', bad);
}

function show(step: 'start' | 'review' | 'done') {
  for (const s of ['start', 'review', 'done']) $(s).hidden = s !== step;
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

function setMe(next: Me) {
  me = next;
  renderFeeds();
  if (!$('review').hidden) updateAllowance();
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

function cleanText(raw: string): string {
  return raw
    .replace(/(\w)-\n(\w)/g, '$1$2') // words split across lines
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

async function readPdf(data: ArrayBuffer, say: (s: string) => void): Promise<string> {
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const parts: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    say(`Reading page ${n} of ${doc.numPages}…`);
    const content = await (await doc.getPage(n)).getTextContent();
    parts.push(
      (content.items as { str?: string; hasEOL?: boolean }[]).map((i) => (i.str ?? '') + (i.hasEOL ? '\n' : ' ')).join(''),
    );
  }
  return cleanText(parts.join('\n\n'));
}

async function readImages(files: File[], say: (s: string) => void): Promise<string> {
  say('Getting ready to read your photo…');
  const { createWorker } = await import('tesseract.js');
  let page = 1;
  const worker = await createWorker('eng', 1, {
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

async function readLink(link: string, say: (s: string) => void): Promise<{ text: string; title: string }> {
  say('Fetching the page…');
  const res = await api(`/extract?url=${encodeURIComponent(link)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '' }));
    throw new Error(data.error || `Ross couldn't fetch that page (HTTP ${res.status}).`);
  }
  const host = new URL(link).hostname.replace(/^www\./, '');
  const kind = res.headers.get('X-Content-Kind');
  if (kind === 'pdf') return { text: await readPdf(await res.arrayBuffer(), say), title: host };
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

function review(text: string, title: string) {
  if (!text.trim()) {
    status('start-status', "Ross found no words in that. If it's a scan, try a photo of the page.", true);
    show('start');
    return;
  }
  $<HTMLInputElement>('title').value = title;
  $<HTMLTextAreaElement>('text').value = text;
  status('read-status', '');
  $('bar-wrap').hidden = true;
  show('review');
  updateAllowance();
}

async function takeInput(run: (say: (s: string) => void) => Promise<{ text: string; title: string }>) {
  const say = (s: string) => status('start-status', s);
  $<HTMLButtonElement>('go').disabled = true;
  $<HTMLButtonElement>('choose').disabled = true;
  try {
    const { text, title } = await run(say);
    say('');
    review(text, title);
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
  const name = files[0].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  const pdf = files.find((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
  const images = files.filter((f) => f.type.startsWith('image/'));
  if (pdf) void takeInput(async (say) => ({ text: await readPdf(await pdf.arrayBuffer(), say), title: pdf.name.replace(/\.pdf$/i, '') }));
  else if (images.length) void takeInput(async (say) => ({ text: await readImages(images, say), title: name }));
  else void takeInput(async () => ({ text: cleanText(await files[0].text()), title: name }));
}

// --- Allowance ---

function isMostlyEnglish(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  const latin = text.match(/\p{Script=Latin}/gu) ?? [];
  return letters.length === 0 || latin.length / letters.length > 0.8;
}

function updateAllowance() {
  if (!me) return;
  const length = $<HTMLTextAreaElement>('text').value.trim().length;
  const left = me.charsLeft;
  const needsEmail = !me.hasEmail && me.sharedLeft > 0 && length > left;
  const read = $<HTMLButtonElement>('read');
  const note = $('review-note');
  $('email-form').hidden = !needsEmail;
  const english = isMostlyEnglish($<HTMLTextAreaElement>('text').value);
  read.disabled = !english || left <= 0 || length === 0;
  if (!english) {
    note.textContent = 'Ross reads English only for now, and this looks like another language.';
  } else if (left <= 0) {
    note.textContent = me.sharedLeft <= 0
      ? "Ross has read all he can for everyone today. He's back tomorrow."
      : me.hasEmail
        ? "That's all Ross can read for you today. He's back tomorrow."
        : "That's today's free reading.";
  } else if (length > left) {
    note.textContent = `That's about ${minutes(length)} minutes. Ross can read the first ${minutes(left)} for you today.`;
  } else {
    note.textContent = `About ${minutes(length)} ${minutes(length) === 1 ? 'minute' : 'minutes'}. Fix or delete anything you don't want read aloud.`;
  }
}

// --- Speech ---

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
  if (res.status === 402) throw new FinalError("That's all Ross can read for today.");
  if (res.status === 403) throw new FinalError("Ross doesn't read for this page.");
  if (!res.ok) throw new Error(`The voice service had a problem (HTTP ${res.status}).`);
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

async function synthesize(chunks: string[]): Promise<{ blob: Blob; duration: number; done: number }> {
  const started = performance.now();
  const sections: ({ mp3: Uint8Array; samples: number } | undefined)[] = new Array(chunks.length);
  stopRequests = new AbortController();
  const { signal } = stopRequests;
  let next = 0;
  let finished = 0;
  let failure: unknown = null;

  const progress = () => {
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
  if (message) status('read-status', message, true);
  return { blob: new Blob(parts as BlobPart[], { type: 'audio/mpeg' }), duration: samples / SAMPLE_RATE, done };
}

async function readAloud() {
  if (!me) return;
  const text = $<HTMLTextAreaElement>('text').value.trim();
  const all = chunkSentences(text);
  const chunks = fitToAllowance(all, me.charsLeft);
  if (!chunks.length) {
    status('read-status', "Ross doesn't have enough reading left today for that. Try a shorter piece.", true);
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
  $('email-form').hidden = true;
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

function renderFeeds() {
  fillFeedPicker();
  const say = (s: string, bad = false) => status('feeds-status', s, bad);
  const act = (run: () => Promise<Me>) =>
    run().then(setMe).catch((err) => say(err instanceof Error ? err.message : String(err), true));
  $('feeds').replaceChildren(
    ...(me?.feeds ?? []).map((feed) => {
      const host = feed.feedUrl.replace(/^https?:\/\//, '');
      const name = el('input', { className: 'ross-feed-name', type: 'text', value: feed.title, maxLength: 80, ariaLabel: 'Feed name' });
      name.addEventListener('change', () => {
        if (name.value.trim()) act(() => apiJson(`/feeds/${feed.token}`, 'PATCH', { title: name.value }));
        else name.value = feed.title;
      });
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
          return el('li', {}, el('span', { textContent: episode.title }), del);
        }),
      );
      const episodes = el(
        'details',
        { className: 'ross-eps' },
        el('summary', { textContent: count ? `${count} ${count === 1 ? 'episode' : 'episodes'}` : 'No episodes yet' }),
        list,
        remove,
      );
      return el('article', { className: 'ross-feed' }, el('div', { className: 'ross-feed-top' }, name), subs, episodes);
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

  $('email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      setMe(await apiJson('/email', 'POST', { email: $<HTMLInputElement>('email').value }));
      status('read-status', 'Saved. Ross can read for up to 30 minutes a day now.');
    } catch (err) {
      status('read-status', err instanceof Error ? err.message : String(err), true);
    }
  });

  $('add').addEventListener('click', async () => {
    if (!mp3Blob) return;
    const add = $<HTMLButtonElement>('add');
    const pick = $<HTMLSelectElement>('feed-pick');
    add.disabled = true;
    status('add-status', 'Adding…');
    try {
      const res = await api('/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-Feed-Token': pick.value,
          'X-Title': encodeURIComponent($('done-title').textContent ?? ''),
          'X-Duration-Seconds': String(Math.round(mp3Duration)),
        },
        body: mp3Blob,
      });
      if (res.status === 402) throw new Error('Too much audio has been added today. Try again tomorrow.');
      if (!res.ok) throw new Error(`Adding it failed (HTTP ${res.status}). Try again.`);
      const feedName = pick.selectedOptions[0]?.textContent ?? 'your feed';
      setMe((await res.json()) as Me);
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

  refresh().catch(() => status('feeds-status', "Ross couldn't load your feeds. Reload the page to try again.", true));

  const shared = new URLSearchParams(location.search).get('url');
  if (shared) {
    input.value = shared;
    go();
  }
}

init();
