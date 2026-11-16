// The Atlas: every public page on the site as a star, grouped into constellations.
//
// Built at build time straight from src/pages, so a new page shows up on /atlas
// without anyone touching this file. Each page's title and description come from
// its own <Layout title=… description=…>. What this file adds on top:
//   - HIDDEN: pages that must never be charted (private, unlinked, admin, duplicates)
//   - CONSTELLATIONS: the groups, and the rules that sort a page into one
//   - OVERRIDES: a nicer name or blurb for pages whose own title doesn't read well
//
// A page no rule matches lands in "Curiosities", so nothing is ever lost.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export interface Constellation {
  id: string;
  name: string;
  he: string;
  blurb: string;
  color: string;
}

export interface Star {
  path: string;
  title: string;
  desc: string;
  group: string;
  /** 1 = ordinary, 2 = notable, 3 = a hub or flagship */
  mag: 1 | 2 | 3;
  isNew: boolean;
  /** extra words the search should match: what people actually call the thing */
  keywords?: string;
}

export const CONSTELLATIONS: Constellation[] = [
  { id: 'talmud', name: 'The Daf', he: 'הדף', blurb: 'A playable game for the daily daf, and the Talmud as data and art.', color: '#e8b45a' },
  { id: 'tanakh', name: 'Tanakh', he: 'תנ״ך', blurb: 'Readers, maps of names and kings, and the parasha every which way.', color: '#7fb6e6' },
  { id: 'practice', name: 'Halacha & Prayer', he: 'הלכה ותפילה', blurb: 'Siddur, Mishnah, Rambam, zmanim and the kitchen.', color: '#b79cf0' },
  { id: 'voices', name: 'Shiurim', he: 'שיעורים', blurb: 'Thousands of hours of Torah, transcribed and searchable.', color: '#f08f6e' },
  { id: 'israel', name: 'Israel & Hebrew', he: 'ארץ ולשון', blurb: 'Life in Israel in data, and Hebrew learned sideways.', color: '#63d2c0' },
  { id: 'pulse', name: 'Live Pulse', he: 'דופק', blurb: 'Dashboards wired to the world as it happens.', color: '#ef6f8f' },
  { id: 'studio', name: 'Studio', he: 'סטודיו', blurb: 'Art, 3D prints, films and things made for the fun of it.', color: '#f2d06b' },
  { id: 'home', name: 'Home', he: 'בית', blurb: 'Kids, parenting and household experiments.', color: '#9ad27a' },
  { id: 'matthew', name: 'Matthew', he: 'מתתיהו', blurb: 'Who I am, what I do for work, and the newsletter.', color: '#f4eee1' },
  { id: 'misc', name: 'Curiosities', he: 'שונות', blurb: 'Everything that refuses a category.', color: '#a9b4c4' },
];

// Never charted. Mirrors the sitemap filter in astro.config.mjs, plus pages that are
// personal, made for one client, admin tools, or near-duplicates of a charted page.
const HIDDEN: RegExp[] = [
  /^\/(404|atlas|index)$/,
  /^\/(aaron-33-film|family|dweck-sukkot-picks|everything|eulogy|babynaming|yahrzeit)$/,
  /^\/(desk|parasha-books|proposals|aviya-schedules|torah-schedules)(\/|$)/,
  /^\/(aviya|rabbi-dweck-dashboard|competitive-intel|print-quote|color|pistachios-old)$/,
  /^\/warmhouse\/(for|tracker)/,
  /^\/ross\/kit$/,
  /^\/art\/sukkah-posters$/,
  /^\/writings\/legacy-of-blessed-contentment$/,
  /^\/kosher-cafes-(google-map|maps|maps-simple)$/,
  /^\/zmanim-widget\/fullscreen$/,
  /^\/dayan-fuerst-transcripts$/,
];

// First match wins.
const RULES: [RegExp, string][] = [
  [/^\/daf(\/|$)|^\/(mega-talmud|shas-art|taz-bach|shechalak)$/, 'talmud'],
  [/^\/(transcriptions|scp|sourcesheets)(\/|$)/, 'voices'],
  [/^\/(rav-asher-weiss|rav-asher-weiss-booklets|jewish-studies|jj|search|source-sheet-creator|language|memory|stiff-necked-people|language-of-blessing|torahschedule|studyschedules|books|rav-nachman|phds-on-the-parsha|uriel-simon|yom-tov-sheini)$/, 'voices'],
  [/^\/(929|parasha-sheet)(\/|$)|^\/3d\/(parsha|plagues)$/, 'tanakh'],
  [/^\/(mega-bible|literary-bible|painted-torah|genealogies|kings-names|kohelet|psalm-emotions|haftarah-explorer|parsha-art|parsha-explorer|parasha|shnayim|bible-coins|biblical-timelines|graetz|sefaria-memory)$/, 'tanakh'],
  [/^\/(zmanim-widget|3d-print-tools\/leshem-yichud|calendars)(\/|$)/, 'practice'],
  [/^\/(mega|mega-siddur|siddur|mega-mishnah|mega-maimonides|omer|zmanim|zmanim-watchface|bracha|kosher-scanner|kashrus-publications|cheese|tefillin-trials|jewish-learning-hub|moreh|coffee)$/, 'practice'],
  [/^\/(israel|kolnoa|balashon|aptonyms)(\/|$)/, 'israel'],
  [/^\/(kosher-cafes|imported-foods|tourism-library|oleh-car|kids-in-wartime|lost-in-translation|trees)$/, 'israel'],
  [/^\/(air-quality|arxiv-feed|chess-puzzle|chicago-pulse|crypto-vibes|github-trending|hn-live|iss-now|live-sports|on-this-day|quake-watch|radio-world|sky-above|solar-watch|wiki-pulse|world-pulse|weather|weather-avatar)$/, 'pulse'],
  [/^\/(art|3d|3d-print-tools)(\/|$)/, 'studio'],
  [/^\/(catapult|color-by-number|micrography|ai-matthew|face-demo|Gucci|localopoly|business-card-calendar|business-card-designer|videos)$/, 'studio'],
  [/^\/(parenting|warmhouse)(\/|$)/, 'home'],
  [/^\/(kids|qidquotes|ross|pistachios|tjs|mansions)$/, 'home'],
  [/^\/newsletter(\/|$)/, 'matthew'],
  [/^\/(about|services|projects|writings|media-appearances|tech|timeline|ai-training|agentforce|random-facts)$/, 'matthew'],
];

// Flagships and hubs burn brighter.
const BRIGHT: Record<string, 2 | 3> = {
  '/daf': 3, '/mega': 3, '/mega-bible': 3, '/mega-talmud': 2, '/mega-siddur': 2, '/mega-mishnah': 2,
  '/mega-maimonides': 2, '/transcriptions': 3, '/search': 2, '/scp': 2, '/sourcesheets': 2,
  '/rav-asher-weiss': 2, '/parasha': 3, '/painted-torah': 2, '/929': 2, '/genealogies': 2,
  '/israel': 3, '/kolnoa': 2, '/world-pulse': 3, '/zmanim': 3, '/siddur': 2, '/art': 2, '/3d': 3,
  '/micrography': 2, '/shas-art': 2, '/about': 3, '/projects': 2, '/newsletter': 3, '/writings': 2,
  '/services': 2, '/parenting': 2, '/kids': 2, '/ross': 2, '/videos': 2, '/books': 2, '/calendars': 2,
  '/warmhouse': 2, '/literary-bible': 2, '/phds-on-the-parsha': 2,
};

const OVERRIDES: Record<string, { title?: string; desc?: string }> = {
  '/ai-training': { title: 'AI Training', desc: 'Hands-on AI and Claude training for teams.' },
  '/balashon': { title: 'Balashon', desc: 'Hebrew word histories: where a word came from and how it got here.' },
  '/warmhouse': { title: 'WarmHouse', desc: 'A house listing turned into a 3D model you can walk around.' },
  '/Gucci': { title: 'The Fifth Avenue Fabulist', desc: 'A satirical tabloid, entirely fabricated and AI-illustrated.' },
  '/929': { desc: 'Tanakh a chapter a day, each one illuminated.' },
  '/trees': { title: 'Israel’s Urban Forest', desc: 'Tree canopy data for Israeli cities.' },
  '/jj': { title: 'Against the Thirteen Principles', desc: 'The Podcast of Jewish Ideas, sorted by which of the Thirteen Principles each episode pushes on.' },
  '/tefillin-trials': { title: 'Hineni: The Tefillin Trials' },
  '/transcriptions/breitowitz-qa': { title: 'Rabbi Breitowitz Q&A', desc: 'Rabbi Yitzchak Breitowitz’s Q&A sessions, transcribed and searchable.' },
  '/transcriptions/dayan-fuerst': { title: 'Dayan Fuerst', desc: 'Every Dayan Fuerst shiur, transcribed with click-to-seek audio.' },
  '/transcriptions/halacha-headlines': { title: 'Halacha Headlines', desc: 'The Halacha Headlines podcast, transcribed and searchable.' },
  '/transcriptions/rabbi-jeremy-wieder': { title: 'Rabbi Jeremy Wieder', desc: 'Rabbi Jeremy Wieder’s shiurim, transcribed and searchable.' },
  '/transcriptions/rav-asher-weiss': { title: 'Rav Asher Weiss (transcripts)', desc: 'The Rav Asher Weiss shiur archive, transcribed.' },
  '/transcriptions/rav-hershel-schachter': { title: 'Rav Hershel Schachter', desc: 'Rav Hershel Schachter’s shiurim, transcribed and searchable.' },
  '/transcriptions': { desc: 'Shiur archives transcribed end to end: search any word, click to hear it said.' },
  '/studyschedules': { desc: 'Ready-made Torah study schedules.' },
  '/shnayim': { title: 'Shnayim Mikra', desc: 'Torah with Targum Onkelos, one aliyah at a time.' },
  '/ai-matthew': { desc: 'A slideshow of AI-made portraits.' },
  '/business-card-designer': { desc: 'Design a business card in the browser.' },
  '/israel/place-names': { desc: 'How Israeli towns are officially spelled in English, and why it’s never what you expect.' },
  '/tourism-library': { title: 'Tourism Library', desc: 'An analysis of the Israel Ministry of Tourism’s image library.' },
  '/agentforce': { title: 'Agentforce Academy', desc: 'A practice ground for AI agent skills.' },
  '/zmanim-widget': { title: 'Zmanim Widget' },
  '/rav-asher-weiss': { desc: 'Quote cards from his shiurim. Tap any card to hear the moment in his own voice.' },
  '/rav-asher-weiss-booklets': { desc: 'His weekly parasha booklets, collected.' },
  '/jewish-studies': { title: 'The Podcast of Jewish Ideas', desc: 'Every episode of the podcast.' },
};

const KEYWORDS: Record<string, string> = {
  '/mega-maimonides': 'rambam mishneh torah',
  '/mega-talmud': 'gemara bavli shas daf yomi',
  '/mega-bible': 'tanach tanakh chumash torah neviim ketuvim',
  '/mega-mishnah': 'mishna mishnayot',
  '/mega-siddur': 'tefillah davening prayer',
  '/siddur': 'tefillah davening prayer',
  '/shnayim': 'shnayim mikra parsha onkelos',
  '/zmanim': 'times shabbat candle lighting sunset',
  '/kohelet': 'ecclesiastes',
  '/psalm-emotions': 'psalms tehillim',
  '/moreh': 'rambam maimonides guide for the perplexed',
  '/rav-nachman': 'breslov rebbe nachman',
  '/transcriptions': 'shiur shiurim torah lectures',
};

const PAGES_DIR = path.join(process.cwd(), 'src', 'pages');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name !== 'api') walk(full, out);
    } else if (/\.(astro|md|mdx)$/.test(name) && !name.includes('[')) {
      out.push(full);
    }
  }
  return out;
}

const decode = (s: string) =>
  s
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\\'/g, "'")
    .replace(/\s+/g, ' ').trim();

/** Value of a `const name = '…'` (possibly on the following line) in frontmatter. */
function constValue(src: string, name: string): string | null {
  const m = src.match(new RegExp(`const\\s+${name}\\s*=\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|'((?:[^'\\\\]|\\\\.)*)'|\`([^\`$]*)\`)`));
  return m ? (m[1] ?? m[2] ?? m[3] ?? null) : null;
}

/** Value of a JSX attribute: a literal, or a `{identifier}` resolved from frontmatter. */
function attr(src: string, name: string): string | null {
  const m = src.match(new RegExp(`<\\w*Layout\\b[^>]*?\\s${name}=(?:"([^"]*)"|'([^']*)'|\\{"([^"]*)"\\}|\\{'([^']*)'\\}|\\{\`([^\`]*)\`\\}|\\{(\\w+)\\})`, 's'));
  if (!m) return null;
  if (m[6]) return constValue(src, m[6]);
  const lit = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? null;
  if (lit && lit.includes('${')) {
    // `${pageTitle} | ${SITE_TITLE}` → resolve the first identifier, drop the site suffix
    const id = lit.match(/\$\{(\w+)\}/)?.[1];
    const v = id ? constValue(src, id) : null;
    return v ?? (lit.replace(/\s*[|—-]?\s*\$\{[^}]+\}/g, '').trim() || null);
  }
  return lit;
}

function cleanTitle(t: string): string {
  return decode(t)
    .replace(/\s+\|\s+.*$/, '')
    .replace(/\s+[-–—]\s+Matthew Miller$/i, '')
    .replace(/\s*[—–-]\s*Daf Yomi Game:.*$/, '')
    .replace(/\s*[—–-]\s*Parenting$/, '')
    .trim();
}

function fallbackTitle(route: string): string {
  const leaf = route.split('/').filter(Boolean).pop() ?? route;
  return leaf.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Paths of pages first committed in the last few weeks; empty if git can't say. */
function recentlyAdded(days = 21): Set<string> {
  const fresh = new Set<string>();
  try {
    const log = execSync(
      `git log --min-parents=1 --since="${days} days ago" --diff-filter=A --name-only --format= -- src/pages`,
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    for (const line of log.split('\n')) if (line.trim()) fresh.add(path.join(process.cwd(), line.trim()));
  } catch {
    /* no git at build time: nothing is marked new */
  }
  return fresh;
}

export function loadAtlas(): { stars: Star[]; constellations: Constellation[] } {
  const fresh = recentlyAdded();
  const stars: Star[] = [];

  for (const file of walk(PAGES_DIR)) {
    const rel = path.relative(PAGES_DIR, file).replace(/\\/g, '/').replace(/\.(astro|md|mdx)$/, '');
    const route = '/' + rel.replace(/(^|\/)index$/, '').replace(/\/$/, '');
    if (route === '/' || HIDDEN.some((re) => re.test(route))) continue;

    const src = fs.readFileSync(file, 'utf8');
    const o = OVERRIDES[route] ?? {};
    const isDaf = /^\/daf\/./.test(route);

    let title = o.title ?? attr(src, 'title') ?? constValue(src, 'pageTitle') ?? constValue(src, 'title')
      ?? src.match(/<title>([^<{]+)<\/title>/)?.[1] ?? '';
    title = cleanTitle(title);
    if (!title || title.includes('${') || route.startsWith('/parasha-sheet/')) {
      // Parasha sheets title themselves from data; name them from the path.
      title = fallbackTitle(route) + (route.startsWith('/parasha-sheet/') ? ' — parasha sheet' : '');
    }

    let desc = o.desc ?? attr(src, 'description') ?? constValue(src, 'pageDescription')
      ?? src.match(/name="description"\s+content="([^"]+)"/)?.[1] ?? '';
    desc = decode(desc);
    if (desc.includes('${')) desc = '';
    if (route.startsWith('/parasha-sheet/')) desc = 'A two-page study sheet: word counts, rare words and Hebrew then-and-now.';
    if (isDaf) {
      // "Bekhorot 10: a firstborn donkey's…" → keep the daf as a tag on the title line
      const daf = fallbackTitle(route).replace(/ (\d+)$/, ' $1');
      desc = desc.replace(new RegExp(`^${daf}\\s*[:—–-]\\s*`, 'i'), '');
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);
      title = `${title} · ${daf}`;
    }

    const group = RULES.find(([re]) => re.test(route))?.[1] ?? 'misc';
    stars.push({
      path: route,
      title,
      desc,
      group,
      mag: BRIGHT[route] ?? 1,
      isNew: fresh.has(file),
      keywords: isDaf ? 'daf yomi game talmud gemara' : KEYWORDS[route],
    });
  }

  // A shallow clone reports every file as added by its oldest commit. If that
  // happened, "new" means nothing, so drop it rather than light up the whole sky.
  if (stars.filter((s) => s.isNew).length > stars.length * 0.3) stars.forEach((s) => (s.isNew = false));

  stars.sort((a, b) => a.path.localeCompare(b.path, 'en', { numeric: true }));
  const used = new Set(stars.map((s) => s.group));
  return { stars, constellations: CONSTELLATIONS.filter((c) => used.has(c.id)) };
}
