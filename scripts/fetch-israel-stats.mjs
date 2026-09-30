#!/usr/bin/env node
/**
 * Fetch the open-data series behind the "Israel in numbers" section of /israel.
 *
 * Everything lands as static JSON in public/data/israel-stats/, committed to git,
 * so the page renders from the CDN and never depends on a government server at
 * view time. Re-run to refresh; Netlify runs this on every build.
 *
 * Sources:
 *   - Bank of Israel SDMX (exchange rates, USD/EUR/GBP vs ILS, weekly since 2006)
 *   - israel.com/data CSVs (Kinneret level, winter gains, population, aliyah)
 *   - data.gov.il CKAN datastore (Knesset election results per locality, 19th-25th)
 *
 * Any single source may fail (network, rate limit, republished resources). A
 * failure keeps the previously committed file and warns — the build never breaks
 * because a ministry had a bad day. Pass --offline to skip fetching entirely.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'data', 'israel-stats');
const OFFLINE = process.argv.includes('--offline');

const log = (...args) => console.log('[israel-stats]', ...args);

async function getText(url, { timeout = 120_000 } = {}) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: { 'User-Agent': 'matthewjamesmiller.com israel-stats builder' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function getJson(url, opts) {
  return JSON.parse(await getText(url, opts));
}

/** Minimal CSV parser that handles the simple, unquoted files we consume. */
function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()));
    return row;
  });
}

async function writeJson(name, data) {
  await mkdir(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, name);
  await writeFile(file, JSON.stringify(data) + '\n');
  log('wrote', name, `(${(JSON.stringify(data).length / 1024).toFixed(1)} kB)`);
}

/** Run a fetcher, keeping the committed file on failure. */
async function resilient(name, fetchFn) {
  const file = path.join(OUT_DIR, name);
  if (OFFLINE) {
    log(name, '— offline, keeping committed copy');
    return;
  }
  try {
    const data = await fetchFn();
    await writeJson(name, data);
  } catch (err) {
    if (existsSync(file)) {
      log('WARN', name, 'fetch failed, keeping committed copy:', err.message);
    } else {
      log('ERROR', name, 'fetch failed and no committed copy exists:', err.message);
      throw err;
    }
  }
}

const today = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ FX --- */

const BOI_SDMX =
  'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0';
const BOI_CURRENT = 'https://www.boi.org.il/PublicApi/GetExchangeRates';

function isoWeekKey(dateStr) {
  // Monday-starting ISO week key, good enough for downsampling to one point/week.
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

async function fetchFx() {
  const start = '2006-01-01';
  const end = today();
  const series = {};
  for (const ccy of ['USD', 'EUR', 'GBP']) {
    const url = `${BOI_SDMX}/RER_${ccy}_ILS?startPeriod=${start}&endPeriod=${end}&format=csv`;
    const rows = parseCsv(await getText(url));
    const byWeek = new Map();
    for (const row of rows) {
      if (!row.TIME_PERIOD || !row.OBS_VALUE) continue;
      byWeek.set(isoWeekKey(row.TIME_PERIOD), [row.TIME_PERIOD, Number(row.OBS_VALUE)]);
    }
    series[ccy] = [...byWeek.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    log(`FX ${ccy}: ${series[ccy].length} weekly points`);
  }
  let latest = {};
  try {
    const cur = await getJson(BOI_CURRENT);
    for (const r of cur.exchangeRates ?? []) latest[r.key] = { rate: r.currentExchangeRate, updated: r.lastUpdate };
  } catch (err) {
    log('WARN FX latest rates unavailable:', err.message);
  }
  return { updated: today(), source: 'Bank of Israel', latest, series };
}

/* -------------------------------------------------------------- Kinneret --- */

async function fetchKinneret() {
  const monthly = parseCsv(await getText('https://www.israel.com/data/kinneret-water-level-monthly.csv'))
    .filter((r) => r.date && r.level_m !== '')
    .map((r) => [r.date, Number(r.level_m)]);
  const winters = parseCsv(await getText('https://www.israel.com/data/kinneret-winter-gain.csv'))
    .filter((r) => r.winter && r.gain_m !== '' && r.complete === 'yes')
    .map((r) => ({
      winter: r.winter,
      gain_m: Number(r.gain_m),
      low_m: Number(r.winter_low_m),
      high_m: Number(r.spring_high_m),
    }));
  log(`Kinneret: ${monthly.length} monthly readings, ${winters.length} winters`);
  return {
    updated: today(),
    source: 'israel.com/data (Mekorot/Water Authority series)',
    // The famous gauge lines, metres below sea level:
    upperRedLine: -208.8,
    lowerRedLine: -213.0,
    blackLine: -214.4,
    monthly,
    winters,
  };
}

/* ---------------------------------------------------------------- people --- */

async function fetchPeople() {
  const population = parseCsv(await getText('https://www.israel.com/data/israel-population.csv'))
    .filter((r) => r.year && r.population)
    .map((r) => [Number(r.year), Number(r.population)]);
  const aliyah = parseCsv(await getText('https://www.israel.com/data/aliyah-by-year.csv'))
    .filter((r) => r.year && r.olim !== '')
    .map((r) => [Number(r.year), Number(r.olim)]);
  const byCountry = parseCsv(await getText('https://www.israel.com/data/aliyah-by-country.csv'))
    .filter((r) => r.country && r.total)
    .map((r) => {
      const byYear = {};
      for (let y = 2015; y <= 2025; y++) if (r[String(y)] !== '') byYear[y] = Number(r[String(y)]);
      return { country: r.country, region: r.region, total: Number(r.total), byYear };
    })
    .sort((a, b) => b.total - a.total);
  log(`People: ${population.length} population years, ${aliyah.length} aliyah years, ${byCountry.length} countries`);
  return { updated: today(), source: 'israel.com/data (CBS series)', population, aliyah, byCountry };
}

/* ------------------------------------------------------------ elections --- */

// Per-locality result resources of the Central Elections Committee dataset,
// Knessets 19-25 (resource ids re-issued on republish; refresh from
// package_show?id=votes-knesset if a fetch starts 404ing).
const ELECTION_RESOURCES = [
  { knesset: 25, year: 2022, resource: 'b392b8ee-ba45-4ea0-bfed-f03a1a36e99c' },
  { knesset: 24, year: 2021, resource: '9921a347-8466-4ef4-81f9-22523c5c4632' },
  { knesset: 23, year: 2020, resource: '3dc36e20-25d6-4496-ba6a-71d9bc917349' },
  { knesset: 22, year: 2019, resource: 'bd22cd14-138c-4917-931a-ef628c2a5a30', label: 'Sep 2019' },
  { knesset: 21, year: 2019, resource: '1a1c7b2b-e819-4ba9-b159-d68e3566c58b', label: 'Apr 2019' },
  { knesset: 20, year: 2015, resource: '929b50c6-f455-4be2-b438-ec6af01421f2' },
  { knesset: 19, year: 2013, resource: 'c20cdcef-4d42-4241-a41b-6ca7ae51002d' },
];

// Ballot letter -> party for the letters that actually win votes in Raanana.
// Letter histories verified against Hebrew Wikipedia (אותיות, per-Knesset
// election pages) on 2026-09-30. Older datasets spell some letters with
// non-final forms (מרץ for מרצ), so lookup normalizes final letters first.
const PARTY_NAMES = {
  25: { מחל: 'Likud', פה: 'Yesh Atid', ט: 'Religious Zionism', כנ: 'National Unity', שס: 'Shas', ג: 'United Torah Judaism', ל: 'Yisrael Beiteinu', אמת: 'Labor', מרצ: 'Meretz', ב: 'Habayit Hayehudi', ום: "Hadash–Ta'al", עם: "Ra'am" },
  24: { מחל: 'Likud', פה: 'Yesh Atid', שס: 'Shas', ג: 'United Torah Judaism', כנ: 'Blue & White', ל: 'Yisrael Beiteinu', ב: 'Yamina', ת: 'New Hope', ט: 'Religious Zionism', אמת: 'Labor', מרצ: 'Meretz', ום: 'Joint List', עם: "Ra'am" },
  23: { מחל: 'Likud', פה: 'Blue & White', שס: 'Shas', ג: 'United Torah Judaism', אמת: 'Labor–Gesher–Meretz', ל: 'Yisrael Beiteinu', טב: 'Yamina', נצ: 'Otzma Yehudit' },
  22: { מחל: 'Likud', פה: 'Blue & White', שס: 'Shas', ג: 'United Torah Judaism', אמת: 'Labor–Gesher', ל: 'Yisrael Beiteinu', טב: 'Yamina', מרצ: 'Democratic Union', נצ: 'Otzma Yehudit' },
  21: { מחל: 'Likud', פה: 'Blue & White', שס: 'Shas', ג: 'United Torah Judaism', אמת: 'Labor', ל: 'Yisrael Beiteinu', מרצ: 'Meretz', טב: 'Union of Right-Wing Parties', נ: 'New Right', כ: 'Kulanu', ום: "Hadash–Ta'al", עם: "Ra'am–Balad", ף: 'Zehut' },
  20: { מחל: 'Likud', אמת: 'Zionist Union', פה: 'Yesh Atid', שס: 'Shas', ג: 'United Torah Judaism', ל: 'Yisrael Beiteinu', טב: 'Habayit Hayehudi', כ: 'Kulanu', מרצ: 'Meretz', קצ: 'Yachad', ודעם: 'Joint List' },
  19: { מחל: 'Likud–Beiteinu', פה: 'Yesh Atid', טב: 'Habayit Hayehudi', שס: 'Shas', ג: 'United Torah Judaism', אמת: 'Labor', צפ: 'Hatnuah', מרצ: 'Meretz', כנ: 'Kadima', ום: 'Hadash', עם: "Ra'am–Ta'al" },
};

/** Fold final Hebrew letter forms so dataset spellings match the keys above. */
const unfoldFinal = (s) => s.replace(/[ךםןףץ]/g, (c) => ({ ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' })[c]);
const partyName = (knesset, letter) => PARTY_NAMES[knesset]?.[unfoldFinal(letter)] ?? letter;

const RAANANA_SEMEL = 8700;
const isMetaField = (k) =>
  k === '_id' ||
  /סמל ועדה/.test(k) ||
  /שם ישוב|שם יישוב/.test(k) ||
  /סמל ישוב|סמל יישוב/.test(k) ||
  ['בזב', 'מצביעים', 'פסולים', 'כשרים'].includes(k);

async function fetchElections() {
  const elections = [];
  const unmapped = new Set();
  for (const { knesset, year, resource, label } of ELECTION_RESOURCES) {
    // Older resources ingest every column as text and spell the semel field
    // differently ('סמל ישוב' vs 'סמל יישוב'), so discover it instead of assuming.
    const probe = await getJson(
      `https://data.gov.il/api/3/action/datastore_search?resource_id=${resource}&limit=1`
    );
    const fields = probe.result.fields;
    const semelField = fields.find((f) => /סמל/.test(f.id) && /ישוב|יישוב/.test(f.id));
    if (!semelField) throw new Error(`no semel field for Knesset ${knesset}`);
    const semelValue = semelField.type === 'text' ? String(RAANANA_SEMEL) : RAANANA_SEMEL;
    const filter = encodeURIComponent(JSON.stringify({ [semelField.id]: semelValue }));
    const url =
      `https://data.gov.il/api/3/action/datastore_search?resource_id=${resource}` +
      `&filters=${filter}&limit=5`;
    const data = await getJson(url);
    const rec = data.result.records[0];
    if (!rec) throw new Error(`no Raanana row for Knesset ${knesset}`);
    const valid = Number(rec['כשרים']);
    const parties = Object.entries(rec)
      .filter(([k, v]) => !isMetaField(k) && Number(v) > 0)
      .map(([letter, v]) => ({
        letter,
        name: partyName(knesset, letter),
        votes: Number(v),
        pct: valid ? (100 * Number(v)) / valid : 0,
      }))
      .sort((a, b) => b.votes - a.votes);
    for (const p of parties.slice(0, 6)) {
      if (p.name === p.letter && p.pct >= 2) unmapped.add(`${knesset}:${p.letter}`);
    }
    elections.push({
      knesset,
      year,
      label: label ?? String(year),
      eligible: Number(rec['בזב']),
      voted: Number(rec['מצביעים']),
      valid,
      turnoutPct: rec['בזב'] ? (100 * Number(rec['מצביעים'])) / Number(rec['בזב']) : 0,
      parties: parties.slice(0, 8),
    });
    log(`Knesset ${knesset}: ${parties[0].name} ${parties[0].pct.toFixed(1)}%, turnout ${(100 * Number(rec['מצביעים'])) / Number(rec['בזב'])}.`);
  }
  if (unmapped.size) log('WARN unmapped party letters with >=2%:', [...unmapped].join(', '));
  return {
    updated: today(),
    source: 'Central Elections Committee via data.gov.il',
    locality: 'רעננה',
    localityEn: "Ra'anana",
    semel: RAANANA_SEMEL,
    elections,
  };
}

/* ------------------------------------------------------------------ main --- */

await resilient('fx.json', fetchFx);
await resilient('kinneret.json', fetchKinneret);
await resilient('people.json', fetchPeople);
await resilient('elections.json', fetchElections);
log('done');
