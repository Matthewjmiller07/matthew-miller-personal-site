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

/* ----------------------------------------------------------------- raanana --- */

// Raanana age bands (CBS, locality code 8700). Datastore fields are Hebrew
// ('גיל_0_5' … 'גיל_65_פלוס'); keys below match after stripping non-ASCII.
const AGE_RESOURCE = '64edd0ee-3d5d-43ce-8562-c336c24dbc1f';
const AGE_BANDS = [
  ['_0_5', '0–5'],
  ['_6_18', '6–18'],
  ['_19_45', '19–45'],
  ['_46_55', '46–55'],
  ['_56_64', '56–64'],
  ['_65_', '65+'],
];

// 2022 census: selected data by locality and statistical area.
const CENSUS_RESOURCE = '9a9e085f-3bc8-41df-b15f-be0daaf99e30';

// Police "crime records" dataset (תיקי פשיעה), one resource per year.
// Each record is a filed case; totals are dataset records, not a claim about
// unreported crime.
const CRIME_RESOURCES = [
  { year: 2021, resource: '3f71fd16-25b8-4cfe-8661-e6199db3eb12' },
  { year: 2022, resource: 'a59f3e9e-a7fe-4375-97d0-76cea68382c1' },
  { year: 2023, resource: '32aacfc9-3524-4fba-a282-3af052380244' },
  { year: 2024, resource: '5fc13c50-b6f3-4712-b831-a75e0f91a17e' },
  { year: 2025, resource: 'e311b6a1-be5a-4a82-8298-f3afbee07b6b' },
];

const CRIME_GROUP_EN = {
  'עבירות כלפי הרכוש': 'Property',
  'עבירות סדר ציבורי': 'Public order',
  'עבירות כלפי הסדר הציבורי': 'Public order',
  'עבירות נגד גוף': 'Against the person',
  'עבירות גוף': 'Against the person',
  'עבירות נגד אדם': 'Against the person',
  'עבירות מרמה': 'Fraud',
  'עבירות כלפי המוסר': 'Morality',
  'עבירות מוסר': 'Morality',
  'עבירות מין': 'Sex offenses',
  'עבירות כלכליות': 'Economic',
  'עבירות תנועה': 'Traffic',
  'עבירות ביטחון': 'Security',
  'עבירות בטחון': 'Security',
  'עבירות סמים': 'Drugs',
  'עבירות נשק': 'Weapons',
  'עבירות רשוי': 'Licensing',
  'שאר עבירות': 'Other',
  'סעיפי הגדרה': 'Other',
  'שגיאת הזנה': 'Other',
};

/** All datastore records matching a free-text query (the filters= param is flaky). */
async function datastoreAll(resource, q) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const data = await getJson(
      `https://data.gov.il/api/3/action/datastore_search?resource_id=${resource}` +
        `&q=${encodeURIComponent(q)}&limit=2000&offset=${offset}`
    );
    const recs = data.result.records;
    rows.push(...recs);
    offset += recs.length;
    if (offset >= data.result.total || !recs.length) break;
  }
  return rows;
}

async function fetchRaanana() {
  // --- age bands ---------------------------------------------------------
  const ageRows = await datastoreAll(AGE_RESOURCE, 'רעננה');
  const ageRow = ageRows.find((r) => String(r.sml_yeshuv ?? r['סמל_ישוב']) === String(RAANANA_SEMEL));
  if (!ageRow) throw new Error('no Raanana row in age dataset');
  const keys = Object.keys(ageRow);
  const pick = (band) => {
    const k = keys.find((x) => x.replace(/[^0-9a-z_]/gi, '') === band);
    return k ? Number(ageRow[k]) : NaN;
  };
  const ageGroups = AGE_BANDS.map(([key, label]) => ({ label, v: pick(key) })).filter(
    (g) => Number.isFinite(g.v)
  );
  const ageTotal = ageGroups.reduce((s, g) => s + g.v, 0);
  log(`Raanana ages: ${ageGroups.length} bands, total ${ageTotal.toLocaleString('en-US')}`);

  // --- census 2022 locality row ------------------------------------------
  const censusRows = await datastoreAll(CENSUS_RESOURCE, 'רעננה');
  const locRow = censusRows.find(
    (r) => r.LocNameHeb === 'רעננה' && !r.StatArea
  );
  if (!locRow) throw new Error('no Raanana locality row in census dataset');
  const census = {
    year: 2022,
    popApprox: Number(locRow.pop_approx),
    religion: locRow.ReligionHeb,
    bornIsraelPct: Number(locRow.j_isr_pcnt),
    bornAbroadPct: Number(locRow.j_abr_pcnt),
    foreignersPct: Number(locRow.Foreign_pcnt),
    medianAge: Number(locRow.age_median),
    academicPct: Number(locRow.AcadmCert_pcnt),
    ageBands: [
      { label: '0–19', pct: Number(locRow.age0_19_pcnt) },
      { label: '20–64', pct: Number(locRow.age20_64_pcnt) },
      { label: '65+', pct: Number(locRow.age65_pcnt) },
    ],
    birthContinent: [
      { label: 'Israel', pct: Number(locRow.israel_pcnt) },
      { label: 'Europe', pct: Number(locRow.europe_pcnt) },
      { label: 'Americas', pct: Number(locRow.america_pcnt) },
      { label: 'Asia', pct: Number(locRow.asia_pcnt) },
      { label: 'Africa', pct: Number(locRow.africa_pcnt) },
    ],
  };

  // --- religion mix per city: share of the census population living in
  //     statistical areas whose majority religion is X --------------------
  const RELIGION_CITIES = [
    'ירושלים',
    'תל אביב -יפו',
    'חיפה',
    'באר שבע',
    'רעננה',
    'כפר סבא',
    'הוד השרון',
    'בני ברק',
    'אום אל-פחם',
  ];
  const RELIGION_ORDER = ['יהודים', 'מוסלמים', 'נוצרים', 'דרוזים', 'דת אחרת'];
  const religionByCity = [];
  for (const city of RELIGION_CITIES) {
    const rows = await datastoreAll(CENSUS_RESOURCE, city);
    const byRel = {};
    let total = 0;
    for (const r of rows) {
      if (r.LocNameHeb !== city || !r.StatArea || !r.pop_approx) continue;
      const rel = r.ReligionHeb ?? 'אחר';
      byRel[rel] = (byRel[rel] ?? 0) + Number(r.pop_approx);
      total += Number(r.pop_approx);
    }
    const shares = {};
    for (const rel of Object.keys(byRel)) {
      shares[rel] = total ? (100 * byRel[rel]) / total : 0;
    }
    religionByCity.push({
      city,
      total: Math.round(total),
      shares: RELIGION_ORDER.filter((r) => shares[r] > 0).map((r) => ({
        religion: r,
        pct: Math.round(shares[r] * 10) / 10,
      })),
    });
    log(`religion ${city}: ${religionByCity[religionByCity.length - 1].shares.map((s) => `${s.religion} ${s.pct}%`).join(' / ')}`);
  }

  // --- crime 2021–2025 ----------------------------------------------------
  const crimeYears = [];
  for (const { year, resource } of CRIME_RESOURCES) {
    const rows = await datastoreAll(resource, 'רעננה');
    const local = rows.filter((r) => r.Yeshuv === 'רעננה');
    const groups = {};
    const quarters = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    for (const r of local) {
      const g = r.StatisticGroup ?? 'אחר';
      groups[g] = (groups[g] ?? 0) + 1;
      if (quarters[r.Quarter] !== undefined) quarters[r.Quarter] += 1;
    }
    const groupRows = Object.entries(groups)
      .map(([he, v]) => ({ name: CRIME_GROUP_EN[he] ?? 'Other', v }))
      .sort((a, b) => b.v - a.v);
    // Fold the long tail of tiny/misc groups into "Other" for a clean chart.
    const top = groupRows.filter((g) => g.name !== 'Other' && g.v >= 10);
    const otherV = groupRows.filter((g) => !top.includes(g)).reduce((s, g) => s + g.v, 0);
    if (otherV > 0) top.push({ name: 'Other', v: otherV });
    crimeYears.push({
      year,
      total: local.length,
      groups: top.sort((a, b) => b.v - a.v),
      quarters: ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => ({ q, v: quarters[q] })),
    });
    log(`crime ${year}: ${local.length} Raanana records`);
  }

  return {
    updated: today(),
    localityEn: "Ra'anana",
    semel: RAANANA_SEMEL,
    ageGroups,
    ageTotal,
    census,
    religionByCity,
    crime: {
      source: 'Israel Police crime-records dataset via data.gov.il (filed cases, not unreported crime)',
      years: crimeYears,
    },
    sources: [
      'CBS via data.gov.il — residents by locality and age group',
      '2022 Population and Housing Census via data.gov.il — selected data by locality/statistical area',
      'Israel Police via data.gov.il — crime records 2021–2025',
    ],
  };
}

/* ------------------------------------------------------------------ main --- */

await resilient('fx.json', fetchFx);
await resilient('kinneret.json', fetchKinneret);
await resilient('people.json', fetchPeople);
await resilient('elections.json', fetchElections);
await resilient('raanana.json', fetchRaanana);
log('done');
