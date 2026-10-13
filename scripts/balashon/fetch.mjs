// Pulls Balashon's parasha posts into src/data/balashon/posts.json for the /balashon 2-pagers.
// Balashon (balashon.com, David Curwin's "Hebrew Language Detective") is a Blogger blog that
// files posts under a label per parasha ("Parashat Noach"); the labels and each label's posts
// come from the public Blogger JSON feeds. Run by .github/workflows/balashon-fetch.yml.
// Each week features the posts whose word appears in that parasha, with the verse from Sefaria
// and the opening of the post; the rest get a short teaser. Every item links to the full post.
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const BASE = 'https://www.balashon.com';
const OUT = new URL('../../src/data/balashon/posts.json', import.meta.url);
const GLOSSES = new URL('../../src/data/balashon/glosses.json', import.meta.url);
// Posts still needing a one-line gloss: written by scripts/balashon/glosses.mjs in the Action, or
// by hand in a Claude session, then dropped from the queue. The queue keeps only each post's opening.
const QUEUE = new URL('../../src/data/balashon/gloss-queue.json', import.meta.url);
const SEASON = new URL('../../src/data/phds-on-the-parsha/season-5787.json', import.meta.url);
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
    // Inline tags vanish without a gap ("<i>coper</i>," → "coper,"); anything else is a word break.
    .replace(/<\/?(?:i|b|em|strong|span|a|u|font|sup|sub|small|big)\b[^>]*>/gi, '')
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
  return bestHebrew(title, text)?.he ?? null;
}
function bestHebrew(title, text) {
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
  return bestScore >= 0.6 ? { he: best, score: bestScore } : null;
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

// Block-level HTML → paragraphs of plain text (Blogger posts mix <p>, <div> and <br><br>).
export function toParagraphs(html) {
  return toText(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d|blockquote)>|<(p|div|li|h\d|blockquote)\b[^>]*>/gi, '\uE000'),
  )
    .split('\uE000')
    .map((t) => t.trim())
    .filter((t) => t.split(/\s+/).length > 1 || /[א-ת]/.test(t));
}

// The opening of a post, whole paragraphs where possible, cut at a sentence end otherwise.
export function excerpt(paragraphs, budget) {
  const out = [];
  let used = 0;
  for (const para of paragraphs) {
    const n = para.split(/\s+/).length;
    if (used + n <= budget) { out.push(para); used += n; continue; }
    if (budget - used >= 35 || !out.length) {
      let part = '';
      for (const sentence of para.match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) ?? [para]) {
        if ((part + sentence).split(/\s+/).length + used > budget) break;
        part += sentence;
      }
      if (part.trim()) out.push(part.trim());
    }
    return { paragraphs: out, complete: false };
  }
  return { paragraphs: out, complete: true };
}

// ── Hebrew matching against the parasha text ──
const FINALS = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
const bare = (w) => w.replace(/[֑-ׇ]/g, '').replace(/[ךםןףץ]/g, (c) => FINALS[c]).replace(/[^א-ת]/g, '');
const noMatres = (w) => w[0] + w.slice(1).replace(/[וי]/g, ''); // a leading yod/vav is a consonant
// Every way to read a word: up to two prefix letters off the front, and a feminine/plural ending off
// the back, noting what was stripped so short stems only match near-exact.
function readings(word, prefixes = 'והבלמכש') {
  const w = bare(word);
  const out = [];
  for (let p = 0; p <= 2 && p < w.length - 1; p++) {
    if (p && !prefixes.includes(w[p - 1])) break;
    const stem = w.slice(p);
    out.push({ s: noMatres(stem), p, pre: w.slice(0, p), e: '' });
    for (const e of ['ה', 'ת', 'ים', 'ות']) {
      if (stem.endsWith(e) && stem.length - e.length >= 2) out.push({ s: noMatres(stem.slice(0, -e.length)), p, pre: w.slice(0, p), e });
    }
  }
  return out.filter((r) => r.s.length >= 2);
}
export function sameWord(a, b) {
  for (const x of readings(a, 'ה')) for (const y of readings(b)) {
    // Two-letter stems (לט, תב) only match nearly as written: at most a ה or ו in front of the
    // verse's word and the same kind of ending, so חום doesn't find לחם.
    const sameEnd = x.e === y.e || (/^[הת]$/.test(x.e) && /^[הת]$/.test(y.e));
    if (x.s === y.s && (x.s.length >= 3 || (x.p === 0 && /^[הו]?$/.test(y.pre) && sameEnd))) return true;
  }
  return false;
}

const SEFARIA = 'https://www.sefaria.org/api/v3/texts';
const HE_VERSION = 'hebrew|Miqra according to the Masorah';
const EN_VERSION = 'english|The Holy Scriptures: A New Translation (JPS 1917)';
const cleanVerse = (t) => String(t)
  .replace(/<sup[^>]*>.*?<\/sup>\s*<i class="footnote">.*?<\/i>/gs, '')
  .replace(/<i class="footnote">.*?<\/i>/gs, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;|&thinsp;/g, ' ')
  .replace(/\{[פס]\}/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// "Genesis 6:9–11:32" → [{ ref: "Genesis 6:9", he, en }, …]
async function parashaVerses(range) {
  const ref = range.replace(/–/g, '-');
  const [book, span] = [ref.slice(0, ref.lastIndexOf(' ')), ref.slice(ref.lastIndexOf(' ') + 1)];
  const [startCh, startV] = span.split('-')[0].split(':').map(Number);
  const get = async (version) => {
    const data = await getJson(`${SEFARIA}/${encodeURIComponent(ref)}?version=${encodeURIComponent(version)}`);
    const text = data.versions?.[0]?.text;
    if (!text) throw new Error(`no ${version} for ${ref}`);
    return Array.isArray(text[0]) ? text : [text];
  };
  const [he, en] = await Promise.all([get(HE_VERSION), get(EN_VERSION)]);
  const verses = [];
  he.forEach((chapter, ci) => chapter.forEach((t, vi) => {
    const ch = startCh + ci;
    const v = (ci === 0 ? startV : 1) + vi;
    verses.push({ ref: `${book} ${ch}:${v}`, he: cleanVerse(t), en: cleanVerse(en[ci]?.[vi] ?? '') });
  }));
  return verses;
}

// Hebrew words in the post that spell any part of its title ("stav and horef" → סתיו, חורף).
// Only confident matches, so a loose one ("alchemy" → חם) can't tie a post to a verse.
function titleWords(title, text) {
  const parts = title.split(/\s+and\s+|,|\/|\s+-\s+|\?/).map((t) => t.trim()).filter(Boolean);
  return [...new Set(parts.map((p) => bestHebrew(p, text)).filter((b) => b && b.score >= 0.75).map((b) => b.he))];
}

// How much the post itself is about this parasha: 2 if it cites a verse in the parasha's range or
// says "this week's parasha", 1 if it only names the parasha, 0 if neither.
const BOOKS = {
  Genesis: 'genesis|bereishit|bereshit|breishit|gen\\.?', Exodus: 'exodus|shemot|shmot|ex\\.?|exod\\.?',
  Leviticus: 'leviticus|vayikra|lev\\.?', Numbers: 'numbers|bamidbar|num\\.?', Deuteronomy: 'deuteronomy|devarim|deut\\.?',
};
// Verses in the parasha's range the post cites ("Bereshit 6:16", "Genesis 11:9"), as "6:16".
function citedVerses(text, range) {
  const book = range.slice(0, range.lastIndexOf(' '));
  const [from, to] = range.slice(range.lastIndexOf(' ') + 1).split(/[–-]/).map((r) => r.split(':').map(Number));
  const at = (c, v) => c * 1000 + v;
  const out = new Set();
  for (const m of text.toLowerCase().matchAll(new RegExp(`\\b(?:${BOOKS[book] ?? book.toLowerCase()})\\s*(\\d+):(\\d+)`, 'g'))) {
    const x = at(+m[1], +m[2]);
    if (x >= at(...from) && x <= at(...to)) out.add(`${+m[1]}:${+m[2]}`);
  }
  return out;
}

export function mentionsParasha(text, parsha, labels, range) {
  const t = text.toLowerCase();
  if (citedVerses(text, range).size || /this week'?s (?:parasha|parsha|parashah|torah reading|portion)/.test(t)) return 2;
  const names = [parsha, ...labels.map((l) => l.replace(PARSHA_LABEL, ''))].map((n) => n.toLowerCase().replace(/['’]/g, "'?"));
  return names.some((n) => new RegExp(`\\b${n.replace(/ /g, '[ -]')}\\b`).test(t)) ? 1 : 0;
}

// The verse where the word appears, preferring the verses the post itself cites.
export function findVerse(words, verses, cited = new Set()) {
  const own = verses.filter((v) => cited.has(v.ref.slice(v.ref.lastIndexOf(' ') + 1)));
  for (const v of [...own, ...verses]) {
    for (const token of v.he.split(/[\s־]+/)) {
      if (words.some((w) => sameWord(w, token))) return { ref: v.ref, he: v.he, en: v.en, word: token.replace(/[׀׃׆:,.;]+$/g, '') };
    }
  }
  return null;
}

async function labelPosts(label) {
  const posts = [];
  // Blogger pages label feeds 150 at a time with 1-based start-index.
  for (let start = 1; ; start += 150) {
    const data = await getJson(`${BASE}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=150&start-index=${start}`);
    const entries = data.feed?.entry ?? [];
    for (const e of entries) {
      const html = e.content?.$t ?? e.summary?.$t ?? '';
      const text = toText(html);
      const title = toText(e.title?.$t ?? '');
      posts.push({
        title,
        url: (e.link ?? []).find((l) => l.rel === 'alternate')?.href ?? '',
        published: (e.published?.$t ?? '').slice(0, 10),
        he: headword(title, text),
        hebrew: titleWords(title, text),
        text,
        paragraphs: toParagraphs(html),
        words: text.split(/\s+/).length,
        labels: (e.category ?? []).map((c) => c.term).filter((t) => PARSHA_LABEL.test(t)),
      });
    }
    if (entries.length < 150) return posts;
  }
}

const FEATURES = 3;
const FEATURE_WORDS = 340; // stored; the page trims each slot to fit two pages
const TEASER = 40;

async function main() {
  const season = JSON.parse(readFileSync(SEASON, 'utf8'));
  // max-results=0 returns just the feed header, whose category list is every label on the blog.
  const head = await getJson(`${BASE}/feeds/posts/summary?alt=json&max-results=0`);
  const allLabels = (head.feed?.category ?? []).map((c) => c.term);
  const labels = allLabels.filter((t) => PARSHA_LABEL.test(t));
  if (!labels.length) throw new Error(`no parasha labels among ${allLabels.length} labels`);
  console.log(`${labels.length} parasha labels: ${labels.join(' | ')}`);

  const glosses = existsSync(GLOSSES) ? JSON.parse(readFileSync(GLOSSES, 'utf8')) : {};
  const queue = new Map();
  const byLabel = {};
  const parshiot = {};
  for (const w of season.weeks) {
    const matched = labelsFor(w.parsha, labels);
    const byUrl = new Map();
    for (const label of matched) {
      byLabel[label] ??= await labelPosts(label);
      for (const p of byLabel[label]) byUrl.set(p.url, p);
    }
    let verses = [];
    try { verses = await parashaVerses(w.ref); } catch (err) { console.warn(`${w.parsha}: no Sefaria text (${err.message})`); }

    const posts = [...byUrl.values()].map((p) => ({ ...p, verse: findVerse(p.hebrew, verses, citedVerses(p.text, w.ref)), cited: citedVerses(p.text, w.ref), aboutThis: mentionsParasha(p.text, w.parsha, matched, w.ref), otherParshiot: p.labels.filter((l) => !matched.includes(l)).map((l) => l.replace(PARSHA_LABEL, '')) }));
    // Feature posts whose word is in this week's text: first those that quote the very verse their
    // word is in, then those that otherwise discuss this parasha; then the ones filed under the fewest
    // other parshiyot, then the fuller write-ups.
    const ownVerse = (p) => p.verse && p.cited.has(p.verse.ref.slice(p.verse.ref.lastIndexOf(' ') + 1));
    const rank = (p) => (p.verse ? 0 : 1000) - (ownVerse(p) ? 200 : 0) - p.aboutThis * 100 + p.otherParshiot.length * 10 - Math.min(p.words, 600) / 100;
    const featured = [...posts].sort((a, b) => rank(a) - rank(b)).slice(0, FEATURES);
    const order = (p) => (p.verse ? verses.findIndex((v) => v.ref === p.verse.ref) : 1e6);
    featured.sort((a, b) => order(a) - order(b));
    const rest = posts.filter((p) => !featured.includes(p)).sort((a, b) => a.published.localeCompare(b.published));

    parshiot[slugOf(w.parsha)] = {
      parsha: w.parsha,
      labels: matched,
      featured: featured.map((p) => {
        const ex = excerpt(p.paragraphs, FEATURE_WORDS);
        return { title: p.title, url: p.url, published: p.published, he: p.verse?.word ?? p.he, hebrew: p.hebrew, verse: p.verse, paragraphs: ex.paragraphs, complete: ex.complete, words: p.words, otherParshiot: p.otherParshiot };
      }),
      posts: rest.map((p) => ({
        // The headword: as written in this week's verse, else a confident match for the title.
        title: p.title, url: p.url, published: p.published, he: p.verse?.word ?? p.hebrew[0] ?? null, gloss: glosses[p.url] ?? null,
        teaser: excerpt(p.paragraphs, TEASER).paragraphs.join(' '),
        verse: p.verse ? p.verse.ref : null, otherParshiot: p.otherParshiot,
      })),
    };
    for (const p of posts) {
      if (!glosses[p.url]) queue.set(p.url, { url: p.url, title: p.title, he: p.he, text: p.paragraphs.join('\n').split(/\s+/).slice(0, 220).join(' ') });
    }
    console.log(`${w.parsha.padEnd(18)} ${String(posts.length).padStart(3)} posts, ${posts.filter((p) => p.verse).length} in the text · featuring ${featured.map((p) => `${p.title}${p.verse ? ` (${p.verse.ref})` : ''}`).join('; ')}`);
  }
  const unused = labels.filter((l) => !Object.values(parshiot).some((p) => p.labels.includes(l)));
  if (unused.length) console.log(`labels not matched to any parasha: ${unused.join(' | ')}`);

  if (queue.size) writeFileSync(QUEUE, `${JSON.stringify([...queue.values()], null, 1)}\n`);
  else if (existsSync(QUEUE)) unlinkSync(QUEUE);
  console.log(`${queue.size} posts without a gloss`);
  writeFileSync(OUT, `${JSON.stringify({ source: BASE, fetched: new Date().toISOString().slice(0, 10), unmatchedLabels: unused, parshiot }, null, 1)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((err) => { console.error(err); process.exit(1); });
