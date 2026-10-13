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
// Behaalotcha/Beha'alotecha, Chukat/Chukkat, Vayetzei/Vayetze and Pinchas/Pinhas all collapse.
export function skeleton(name) {
  return name
    .toLowerCase()
    .replace(PARSHA_LABEL, '')
    .replace(/[^a-z]/g, '')
    .replace(/[ck]h/g, 'h')
    .replace(/t[sz]/g, 'z')
    .replace(/ck/g, 'k')
    .replace(/w/g, 'v')
    .replace(/[aeiouy]/g, '')
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
        he: text.match(/[א-ת][֑-ׇא-ת]*/)?.[0] ?? null,
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
