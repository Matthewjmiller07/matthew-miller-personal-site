// Scrape 5 public-domain old-spelling English OT translations from
// textusreceptusbibles.com and cache them locally as JSON.
// Run: node scripts/import-bible-translations.mjs
//
// Resumable: re-running skips any (translation, book) pair already present
// in the local cache file for that translation.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CACHE_DIR = path.join(process.cwd(), 'scripts', 'data', 'bible-translations');
const DELAY_MS = 900;
const RATE_LIMIT_BACKOFF_MS = 75_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; matthewjmiller07-mega-bible-import/1.0; personal research project)';

const TRANSLATIONS = [
  { slug: 'Wycliffe', code: 'wyc', name: 'Wycliffe Bible (1395)' },
  { slug: 'Coverdale', code: 'cov', name: 'Coverdale Bible (1535)' },
  { slug: 'Bishops', code: 'bis', name: "Bishops' Bible (1568)" },
  { slug: 'Geneva', code: 'gnv', name: 'Geneva Bible (1587)' },
  { slug: 'KJV1611', code: 'kjv1611', name: 'King James Version (1611)' },
];

const BOOKS = [
  { num: 1, name: 'Genesis', chapters: 50 },
  { num: 2, name: 'Exodus', chapters: 40 },
  { num: 3, name: 'Leviticus', chapters: 27 },
  { num: 4, name: 'Numbers', chapters: 36 },
  { num: 5, name: 'Deuteronomy', chapters: 34 },
  { num: 6, name: 'Joshua', chapters: 24 },
  { num: 7, name: 'Judges', chapters: 21 },
  { num: 8, name: 'Ruth', chapters: 4 },
  { num: 9, name: '1 Samuel', chapters: 31 },
  { num: 10, name: '2 Samuel', chapters: 24 },
  { num: 11, name: '1 Kings', chapters: 22 },
  { num: 12, name: '2 Kings', chapters: 25 },
  { num: 13, name: '1 Chronicles', chapters: 29 },
  { num: 14, name: '2 Chronicles', chapters: 36 },
  { num: 15, name: 'Ezra', chapters: 10 },
  { num: 16, name: 'Nehemiah', chapters: 13 },
  { num: 17, name: 'Esther', chapters: 10 },
  { num: 18, name: 'Job', chapters: 42 },
  { num: 19, name: 'Psalms', chapters: 150 },
  { num: 20, name: 'Proverbs', chapters: 31 },
  { num: 21, name: 'Ecclesiastes', chapters: 12 },
  { num: 22, name: 'Song of Songs', chapters: 8 },
  { num: 23, name: 'Isaiah', chapters: 66 },
  { num: 24, name: 'Jeremiah', chapters: 52 },
  { num: 25, name: 'Lamentations', chapters: 5 },
  { num: 26, name: 'Ezekiel', chapters: 48 },
  { num: 27, name: 'Daniel', chapters: 12 },
  { num: 28, name: 'Hosea', chapters: 14 },
  { num: 29, name: 'Joel', chapters: 3 },
  { num: 30, name: 'Amos', chapters: 9 },
  { num: 31, name: 'Obadiah', chapters: 1 },
  { num: 32, name: 'Jonah', chapters: 4 },
  { num: 33, name: 'Micah', chapters: 7 },
  { num: 34, name: 'Nahum', chapters: 3 },
  { num: 35, name: 'Habakkuk', chapters: 3 },
  { num: 36, name: 'Zephaniah', chapters: 3 },
  { num: 37, name: 'Haggai', chapters: 2 },
  { num: 38, name: 'Zechariah', chapters: 14 },
  { num: 39, name: 'Malachi', chapters: 4 },
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ',
};
function unescapeHtml(s) {
  return s
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, code) => {
      if (code[0] === '#') {
        const num = code[1].toLowerCase() === 'x'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
        return Number.isFinite(num) ? String.fromCodePoint(num) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const RATE_LIMITED = Symbol('rate-limited');

// Returns: an array of verses, `null` if the chapter doesn't exist (site 500s
// past the last chapter of a book), or RATE_LIMITED if we got 429'd (site
// responds with a 302 to /Error/TooManyRequests, which a following fetch
// would silently swallow as an empty 200 page).
async function fetchChapter(slug, bookNum, chapter) {
  const url = `https://www.textusreceptusbibles.com/${slug}/${bookNum}/${chapter}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'manual' });
  if (res.status >= 300 && res.status < 400) return RATE_LIMITED;
  if (!res.ok) return null; // treat any non-200/non-3xx (site 500s past last chapter) as "doesn't exist"
  const html = await res.text();
  const verses = [];
  const re = /<td class="ref">\d+:(\d+)<\/td><td>([\s\S]*?)<\/td>/g;
  let m;
  while ((m = re.exec(html))) {
    const verse = parseInt(m[1], 10);
    const text = unescapeHtml(m[2]);
    if (text) verses.push({ verse, text });
  }
  return verses;
}

const NETWORK_RETRY_BASE_MS = 5_000;
const NETWORK_RETRY_MAX_MS = 60_000;

// Retries on transient network errors (ETIMEDOUT, ECONNRESET, DNS blips, etc.)
// with growing backoff — these are expected over a multi-hour run and must
// not be mistaken for "book has ended" (which fetchChapter signals via a
// clean null/empty return, not a thrown error).
async function fetchChapterResilient(slug, bookNum, chapter, code, bookName) {
  let attempt = 0;
  for (;;) {
    try {
      return await fetchChapter(slug, bookNum, chapter);
    } catch (e) {
      attempt++;
      const backoff = Math.min(NETWORK_RETRY_BASE_MS * 2 ** (attempt - 1), NETWORK_RETRY_MAX_MS);
      console.log(`  (network error at ${code}/${bookName} ${chapter}: ${e.cause?.code || e.message} — retry ${attempt} in ${backoff / 1000}s)`);
      await sleep(backoff);
    }
  }
}

async function loadCache(code) {
  const file = path.join(CACHE_DIR, `${code}.json`);
  try {
    const raw = await readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveCache(code, data) {
  await mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${code}.json`);
  await writeFile(file, JSON.stringify(data, null, 2));
}

async function main() {
  for (const t of TRANSLATIONS) {
    let cache = await loadCache(t.code);
    if (!cache) cache = { translation: t.code, name: t.name, books: [] };
    // Self-heal: a prior run may have written bogus zero-chapter book entries
    // (e.g. if a 429 rate-limit page got misread as "book has no chapters").
    // Discard those so they get re-fetched instead of being treated as done.
    cache.books = cache.books.filter((b) => b.chapters.length > 0);
    const doneBooks = new Set(cache.books.map((b) => b.book));

    for (const book of BOOKS) {
      if (doneBooks.has(book.name)) continue;

      const chapters = [];
      let chapterNum = 1;
      let consecutiveMisses = 0;
      // Keep going past the hinted count in case our hint is low; stop after
      // two consecutive misses (defends against a single transient failure).
      while (consecutiveMisses < 2) {
        let verses = await fetchChapterResilient(t.slug, book.num, chapterNum, t.code, book.name);
        while (verses === RATE_LIMITED) {
          console.log(`  (rate limited — backing off ${RATE_LIMIT_BACKOFF_MS / 1000}s at ${t.code}/${book.name} ${chapterNum})`);
          await sleep(RATE_LIMIT_BACKOFF_MS);
          verses = await fetchChapterResilient(t.slug, book.num, chapterNum, t.code, book.name);
        }
        await sleep(DELAY_MS);
        if (!verses || verses.length === 0) {
          consecutiveMisses++;
          if (chapterNum > book.chapters + 2) break; // safety valve
          chapterNum++;
          continue;
        }
        consecutiveMisses = 0;
        chapters.push({ chapter: chapterNum, verses });
        chapterNum++;
      }

      const verseCount = chapters.reduce((n, c) => n + c.verses.length, 0);
      console.log(`${t.code} — ${book.name}: ${chapters.length}/${book.chapters} chapters, ${verseCount} verses`);
      if (chapters.length === 0) {
        console.warn(`  !! WARNING: zero chapters scraped for ${t.code}/${book.name} (book num ${book.num})`);
      }

      cache.books.push({ book: book.name, chapters });
      await saveCache(t.code, cache);
    }

    console.log(`=== ${t.code} (${t.name}) complete: ${cache.books.length}/${BOOKS.length} books ===`);
  }

  console.log('\nAll translations scraped and cached in scripts/data/bible-translations/*.json');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
