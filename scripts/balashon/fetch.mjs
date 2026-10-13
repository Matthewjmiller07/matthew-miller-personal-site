// Pulls Balashon's parasha posts into src/data/balashon/posts.json for the /balashon 2-pagers.
// Balashon (balashon.com, David Curwin's "Hebrew Language Detective") is a Blogger blog that
// files posts under a label per parasha ("Parashat Noach"); the labels and each label's posts
// come from the public Blogger JSON feeds. Run by .github/workflows/balashon-fetch.yml.
// We keep only a teaser (first ~120 words) of each post; the sheets link to the full post.
import { readFileSync, writeFileSync } from 'node:fs';

const BASE = 'https://www.balashon.com';
const OUT = new URL('../../src/data/balashon/posts.json', import.meta.url);
const SEASON = new URL('../../src/data/phds-on-the-parsha/season-5787.json', import.meta.url);
const TEASER_WORDS = 120;
const PARSHA_LABEL = /^(parash?at|parshat)\s+/i;

export const slugOf = (s) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

// A spelling-insensitive skeleton for transliterations: Bereishit/Breishit/Bereshit,
// Behaalotcha/Beha'alotecha, Chukat/Chukkat, Vayetzei/Vayetze, Terumah/Teruma and Pinchas/Pinhas
// all collapse. Y stays a consonant, so Vayera and Va'era stay apart.
export function skeleton(name) {
  return name
    .toLowerCase()
    .replace(PARSHA_LABEL, '')
    .replace(/([aeiou])h\b/g, '$1')
    .replace(/[^a-z]/g, '')
    .replace(/[ck]h/g, 'h')
    .replace(/t[sz]/g, 'z')
    .replace(/ck/g, 'k')
    .replace(/w/g, 'v')
    .replace(/[aeiou]/g, '')
    .replace(/(.)\1+/g, '$1');
}

// A label can cover two parshiyot read together ("Parashat Vayakhel-Pekudei"); it counts for both.
export function labelsFor(parsha, labels) {
  const want = skeleton(parsha);
  return labels.filter((l) =>
    l.replace(PARSHA_LABEL, '').split(/\s*[-–/&]\s*|\s+and\s+/i).some((part) => skeleton(part) === want) ||
    skeleton(l) === want);
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function toText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

// Post titles are transliterations ("tzohar", "stav and horef"); find the Hebrew word in the post
// that spells the first one. Both sides become rough consonant classes and the best-matching
// Hebrew word wins if it shares enough of them; otherwise no headword (better none than wrong).
const HE_CLASS = { ב: 'B', ג: 'G', ד: 'D', ו: 'V', ז: 'Z', ח: 'K', ט: 'T', כ: 'K', ך: 'K', ל: 'L', מ: 'M', ם: 'M', נ: 'N', ן: 'N', ס: 'S', פ: 'P', ף: 'P', צ: 'S', ץ: 'S', ק: 'K', ר: 'R', ש: 'S', ת: 'T' };
const heClasses = (w) => [...w.replace(/[\u0591-\u05C7]/g, '')].map((c) => HE_CLASS[c] ?? '').join('');
const latinClasses = (w) => w.toLowerCase()
  .replace(/[ck]h/g, 'K').replace(/t[sz]|sh/g, 'S').replace(/th/g, 'T').replace(/ph/g, 'P')
  .replace(/h/g, '').replace(/[aeiouyw'’\s-]/g, '')
  .replace(/[bv]/g, 'B').replace(/[fp]/g, 'P').replace(/[kqcx]/g, 'K').replace(/[sz]/g, 'S')
  .toUpperCase().replace(/V/g, 'B');
function lcs(a, b) {
  const row = Array(b.length + 1).fill(0);
  for (const x of a) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = x === b[j - 1] ? prev + 1 : Math.max(row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[b.length];
}
export function headword(title, text) {
  const want = latinClasses(title.split(/\s+and\s+|,|\//)[0]);
  if (!want) return null;
  let best = null, bestScore = 0;
  for (const he of text.match(/[\u05D0-\u05EA][\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA]*/g) ?? []) {
    const got = heClasses(he).replace(/V/g, 'B');
    if (!got) continue;
    // Vav is often a vowel, so an unmatched B in the Hebrew costs only half.
    const common = lcs(want, got);
    const extra = got.length - common;
    const extraB = [...got].filter((c) => c === 'B').length - [...want].filter((c) => c === 'B').length;
    const penalty = Math.max(0, extra - Math.max(0, extraB)) + Math.max(0, Math.min(extra, extraB)) / 2;
    const score = common / (want.length + penalty);
    if (score > bestScore) { best = he; bestScore = score; }
  }
  return bestScore >= 0.6 ? best : null;
}

async function getJson(url) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'theothermatthewmiller.com parasha sheets' } });
      if (!res.ok) throw new Error(`${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      if (i >= 3) throw err;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
}

async function labelPosts(label) {
  const posts = [];
  // Blogger pages label feeds 150 at a time with 1-based start-index.
  for (let start = 1; ; start += 150) {
    const data = await getJson(`${BASE}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=150&start-index=${start}`);
    const entries = data.feed?.entry ?? [];
    for (const e of entries) {
      const text = toText(e.content?.$t ?? e.summary?.$t ?? '');
      const words = text.split(/\s+/);
      posts.push({
        title: toText(e.title?.$t ?? ''),
        url: (e.link ?? []).find((l) => l.rel === 'alternate')?.href ?? '',
        published: (e.published?.$t ?? '').slice(0, 10),
        he: headword(toText(e.title?.$t ?? ''), text),
        teaser: words.length > TEASER_WORDS ? `${words.slice(0, TEASER_WORDS).join(' ')}…` : text,
        words: words.length,
        labels: (e.category ?? []).map((c) => c.term).filter((t) => PARSHA_LABEL.test(t)),
      });
    }
    if (entries.length < 150) return posts;
  }
}

async function main() {
  const season = JSON.parse(readFileSync(SEASON, 'utf8'));
  // max-results=0 returns just the feed header, whose category list is every label on the blog.
  const head = await getJson(`${BASE}/feeds/posts/summary?alt=json&max-results=0`);
  const allLabels = (head.feed?.category ?? []).map((c) => c.term);
  const labels = allLabels.filter((t) => PARSHA_LABEL.test(t));
  if (!labels.length) throw new Error(`no parasha labels among ${allLabels.length} labels`);
  console.log(`${labels.length} parasha labels: ${labels.join(' | ')}`);

  const byLabel = {};
  const parshiot = {};
  for (const w of season.weeks) {
    const matched = labelsFor(w.parsha, labels);
    const posts = new Map();
    for (const label of matched) {
      byLabel[label] ??= await labelPosts(label);
      for (const p of byLabel[label]) posts.set(p.url, p);
    }
    const sorted = [...posts.values()].sort((a, b) => a.published.localeCompare(b.published));
    parshiot[slugOf(w.parsha)] = {
      parsha: w.parsha,
      labels: matched,
      posts: sorted.map(({ labels: ls, ...p }) => ({
        ...p,
        otherParshiot: ls.filter((l) => !matched.includes(l)).map((l) => l.replace(PARSHA_LABEL, '')),
      })),
    };
    console.log(`${w.parsha.padEnd(18)} ${String(sorted.length).padStart(3)} posts  ${matched.join(', ') || '(no label)'}`);
  }
  const unused = labels.filter((l) => !Object.values(parshiot).some((p) => p.labels.includes(l)));
  if (unused.length) console.log(`labels not matched to any parasha: ${unused.join(' | ')}`);

  writeFileSync(OUT, `${JSON.stringify({ source: BASE, fetched: new Date().toISOString().slice(0, 10), unmatchedLabels: unused, parshiot }, null, 1)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((err) => { console.error(err); process.exit(1); });
