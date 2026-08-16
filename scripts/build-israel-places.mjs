#!/usr/bin/env node
/**
 * Build the reference geography for /israel.
 *
 * Two outputs, both static assets rather than database rows: this is published
 * reference data, so it belongs in git next to the code that reads it, and the page
 * can fetch it straight from the CDN instead of spending a Supabase round trip.
 *
 *   public/data/israel-places.json       — every Israeli settlement (city, moshav,
 *                                          kibbutz, yishuv…) with its CBS "semel
 *                                          yishuv", Hebrew + English name, sub-district
 *                                          (nafa), regional council and, where we can
 *                                          resolve it, a lat/lng for the map marker.
 *   public/data/israel-regions.geojson   — district (mehoz) and sub-district (nafa)
 *                                          polygons, so places can be shaded by area.
 *
 * Sources, in preference order:
 *   1. data.gov.il (CKAN) — the authoritative Israeli open-government catalogue.
 *      Discovered at runtime rather than hardcoded, because resource ids get
 *      re-issued whenever a dataset is republished.
 *   2. A GitHub mirror of the same CBS settlement file, used when data.gov.il is
 *      unreachable (corporate egress policies commonly block it).
 *
 * Boundaries come from geoBoundaries (gbOpen, ISR ADM1/ADM2), which republishes the
 * official administrative divisions under CC-BY. data.gov.il's own municipal-boundary
 * layer is preferred when the catalogue is reachable.
 *
 * Usage:  node scripts/build-israel-places.mjs [--offline]
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DATA_DIR = path.join(ROOT, 'public', 'data');

const CKAN = 'https://data.gov.il/api/3/action';
const MIRROR_SETTLEMENTS =
  'https://raw.githubusercontent.com/royts/israel-cities/master/israel-cities.json';
const GEOBOUNDARIES = (level) =>
  `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/ISR/${level}/geoBoundaries-ISR-${level}.geojson`;
const GEONAMES_CITIES =
  'https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json';
const NATURAL_EARTH_PLACES =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson';

const OFFLINE = process.argv.includes('--offline');

/* ------------------------------------------------------------------ helpers */

const log = (...args) => console.log('[israel-places]', ...args);

async function getJson(url, { timeout = 120_000 } = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

/**
 * The CBS settlement file is distributed with its parentheses already mirrored
 * for RTL display, so "אבו ג'ווייעד )שבט(" arrives with the closing bracket
 * first. Put them back the way Postgres and every other consumer expects.
 */
function fixBidiParens(value) {
  if (typeof value !== 'string') return value;
  const open = value.indexOf('(');
  const close = value.indexOf(')');
  if (close !== -1 && (open === -1 || close < open)) {
    return value.replace(/[()]/g, (c) => (c === '(' ? ')' : '('));
  }
  return value;
}

const clean = (value) => fixBidiParens(String(value ?? '').trim()).replace(/\s+/g, ' ');

/** Fold a place name down to something two different transliterations can agree on. */
function normalizeName(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/* ------------------------------------------------- settlements (data.gov.il) */

/**
 * Walk the CKAN catalogue looking for the settlement register. We match on the
 * datastore's own field names rather than on a dataset title, so a rename upstream
 * doesn't silently break the build.
 */
async function findSettlementResource() {
  const queries = ['רשימת יישובים', 'יישובים', 'סמל ישוב'];
  for (const q of queries) {
    let payload;
    try {
      payload = await getJson(
        `${CKAN}/package_search?q=${encodeURIComponent(q)}&rows=25`,
        { timeout: 60_000 }
      );
    } catch (err) {
      log(`  catalogue search "${q}" failed: ${err.message}`);
      continue;
    }
    for (const pkg of payload?.result?.results ?? []) {
      for (const resource of pkg.resources ?? []) {
        if (!resource.datastore_active) continue;
        try {
          const probe = await getJson(
            `${CKAN}/datastore_search?resource_id=${resource.id}&limit=1`,
            { timeout: 60_000 }
          );
          const fields = (probe?.result?.fields ?? []).map((f) => f.id);
          if (fields.some((f) => /סמל_ישוב|semel_yeshuv/i.test(f))) {
            log(`  using data.gov.il resource ${resource.id} (${pkg.title})`);
            return { resourceId: resource.id, fields };
          }
        } catch {
          /* resource not queryable — keep looking */
        }
      }
    }
  }
  return null;
}

async function fetchSettlementsFromGov() {
  const found = await findSettlementResource();
  if (!found) return null;

  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const page = await getJson(
      `${CKAN}/datastore_search?resource_id=${found.resourceId}&limit=${pageSize}&offset=${offset}`
    );
    const records = page?.result?.records ?? [];
    rows.push(...records);
    if (records.length < pageSize) break;
  }
  log(`  data.gov.il returned ${rows.length} settlements`);

  const pick = (row, ...names) => {
    for (const name of names) {
      for (const key of Object.keys(row)) {
        if (key.replace(/\s+/g, '_') === name) return row[key];
      }
    }
    return undefined;
  };

  return rows.map((row) => ({
    code: clean(pick(row, 'סמל_ישוב', 'semel_yeshuv')),
    name_he: clean(pick(row, 'שם_ישוב', 'name')),
    name_en: clean(pick(row, 'שם_ישוב_לועזי', 'english_name')),
    subdistrict_code: clean(pick(row, 'סמל_נפה', 'semel_napa')),
    subdistrict_he: clean(pick(row, 'שם_נפה', 'shem_napa')),
    council_he: clean(pick(row, 'שם_מועצה', 'shem_moaatza')),
    // The gov file carries ITM grid coordinates on some vintages of the dataset.
    lat: Number(pick(row, 'קו_רוחב', 'lat')) || null,
    lng: Number(pick(row, 'קו_אורך', 'lng')) || null,
  }));
}

async function fetchSettlementsFromMirror() {
  const raw = await getJson(MIRROR_SETTLEMENTS);
  // Row 0 of the mirror is the original Hebrew header row.
  const rows = raw.filter((row) => /^\d+$/.test(String(row.semel_yeshuv ?? '').trim()));
  log(`  mirror returned ${rows.length} settlements`);
  return rows.map((row) => ({
    code: clean(row.semel_yeshuv),
    name_he: clean(row.name),
    name_en: clean(row.english_name),
    subdistrict_code: clean(row.semel_napa),
    subdistrict_he: clean(row.shem_napa),
    council_he: clean(row.shem_moaatza),
    lat: null,
    lng: null,
  }));
}

/* ------------------------------------------------------------- coordinates */

/**
 * Hebrew place names get romanised half a dozen ways — the CBS register writes
 * "PETAH TIQWA" where GeoNames writes "Petah Tiqva", "BE'ER SHEVA" against
 * "Beersheba". Fold the interchangeable consonants together so the two spellings
 * of one town collapse onto the same key.
 */
function canonicalizeTranslit(name) {
  return normalizeName(name)
    .replace(/tz|ts/g, 'z')
    .replace(/kh|ch/g, 'h')
    .replace(/q/g, 'k')
    .replace(/w/g, 'v')
    .replace(/(.)\1+/g, '$1');
}

/**
 * Places whose CBS romanisation and GeoNames spelling are too far apart for the
 * transliteration folding to bridge — "ZEFAT" and "Safed" are the same city, but no
 * mechanical rule gets you from one to the other. Keyed on the Hebrew name, which is
 * unambiguous; the coordinates still come from the source data, never from here.
 */
const GEONAMES_ALIASES = {
  'אבו גוש': 'Abū Ghaush',
  'אום אל-פחם': 'Umm el Faḥm',
  'אום אל-קוטוף': 'Umm el Quṭūf',
  'אילת': 'Eilat',
  'אלון שבות': 'Alon shvut',
  'אלפי מנשה': 'Alfei Menasheh',
  'אפרת': 'Efrata',
  'בורגתה': 'Burgata',
  'בית אל': 'Beit El',
  'בית חורון': 'Beit Horon',
  'בית יצחק-שער חפר': 'Bet Yitsẖaq Sha’ar H̱efer',
  'בני ברק': 'Bnei Brak',
  'בני דרור': 'Bne Dror',
  'בני עי"ש': 'Bnei Ayish',
  'בני ראם': 'Bne Re’em',
  'בת עין': 'Bat A\'in',
  'ג\'דיידה-מכר': 'Judeida Makr',
  'ג\'לג\'וליה': 'Jaljūlya',
  'ג\'סר א-זרקא': 'Jisr ez Zarqā',
  'גבעת חיים (מאוחד)': 'Giv‘at H̱ayyim Me’uẖad',
  'גבעת שמואל': 'Giv\'at Shmuel',
  'גני מודיעין': 'Ganei Modi\'in',
  'גני תקווה': 'Ganei Tikva',
  'דבוריה': 'Dabbūrīya',
  'דבירה': 'Dvira',
  'דייר אל-אסד': 'Deir el Asad',
  'הזורעים': 'HaZor‘im',
  'הרצליה': 'Herzliya',
  'חספין': 'H̱ispin',
  'חצור הגלילית': 'H̱atsor HaGlilit',
  'טובא-זנגריה': 'Tūbā Zangarīya',
  'כאוכב אבו אל-היג\'א': 'Kaukab Abū el Hījā',
  'כוכב מיכאל': 'Kokhav Michael Sobell',
  'כסיפה': 'Kuseifa',
  'כסרא-סמיע': 'Kisra - Sume\'a',
  'כפר ביל"ו': 'Kfar Bilu',
  'כפר ברא': 'Kafr Barā',
  'כפר האורנים': 'Kfar NaOranim',
  'כפר הס': 'Kfar Hess',
  'כפר הרא"ה': 'Kfar HaRo’e',
  'כפר ורבורג': 'Kfar Warburg',
  'כפר ורדים': 'Kfar Vradim',
  'כפר חב"ד': 'Kfar H̱abad',
  'כפר חיטים': 'Kfar H̱ittim',
  'כפר יאסיף': 'Kfar Yasif',
  'כפר יונה': 'Kfar Yona',
  'כפר כמא': 'Kafr Kammā',
  'כפר כנא': 'Kafr Kannā',
  'כפר מנדא': 'Kafr Mandā',
  'כפר מנחם': 'Kfar Menaẖem',
  'כפר מצר': 'Kafr Miṣr',
  'כפר נטר': 'Kfar Netter',
  'כפר סבא': 'Kfar Saba',
  'כפר סירקין': 'Kfar Syrkin',
  'כפר פינס': 'Kfar Pines',
  'כפר קאסם': 'Kafr Qāsim',
  'כפר קרע': 'Kafr Qari‘',
  'כפר ראש הנקרה': 'Kfar Rosh HaNiqra',
  'כפר שמריהו': 'Kfar Shmaryahu',
  'כפר תבור': 'Kfar Tavor',
  'מבשרת ציון': 'Mevasseret Tsiyyon',
  'מג\'ד אל-כרום': 'Majd el Kurūm',
  'מגאר': 'Maghār',
  'מודיעין עילית': 'Modiin Ilit',
  'מודיעין-מכבים-רעות': 'Modi‘in Makkabbim Re‘ut',
  'מוקייבלה': 'Muqeibila',
  'מזרעה': 'El Mazra‘a',
  'מיתר': 'Meitar',
  'מסילת ציון': 'Mesillat Tsiyyon',
  'מעיליא': 'Mi‘ilyā',
  'מעלה אדומים': 'Ma‘ale Adummim',
  'נווה דניאל': 'Neve Daniel',
  'נוף איילון': 'Nof Ayalon',
  'נחף': 'Naḥf',
  'נס ציונה': 'Ness Ziona',
  'עין ורד': 'Ein Vered',
  'עין מאהל': '‘Ein Māhil',
  'עין שריד': 'Ein Sarid',
  'עכו': 'Acre',
  'עלי זהב': 'Alei Zahav',
  'עספיא': '‘Isfiyā',
  'ערערה': '‘Ara-‘Ar‘ara',
  'פוריה עילית': 'Poria Illit',
  'צור יצחק': 'Tsur Itshak',
  'צפת': 'Safed',
  'צרופה': 'Tsrufa',
  'קרית שמונה': 'Qiryat Shmona',
  'רומאנה': 'Rummāna',
  'ריחאניה': 'Riẖaniya',
  'שדה ורבורג': 'Sde Warburg',
  'שדה יעקב': 'Sde Ya‘aqov',
  'שדה נחמיה': 'Sde Neẖemya',
  'שדה עוזיהו': 'Sde ‘Uziyyahu',
  'שדות ים': 'Sdot Yam',
  'שדי חמד': 'Sde H̱emed',
  'שדרות': 'Sderot',
  'שייח\' דנון': 'Esh Sheikh Dannūn',
  'שלומי': 'Shlomi',
  'שתולים': 'Shtulim',
  'תראבין א-צאנע (שבט)': 'Tirabin al-Sana',
};

/**
 * The settlement register is a name/code list — it has no geometry. Build a
 * coordinate index from two open sources and match settlements into it:
 * GeoNames (broad, romanised only) and Natural Earth (a handful of cities, but
 * carrying Hebrew names, so those match exactly rather than by transliteration).
 *
 * Coverage is partial by design. GeoNames only carries populated places above its
 * size cutoff, so the smallest moshavim come out with no marker until someone drops
 * a pin on the map or the gov geometry layer fills them in.
 */
async function buildCoordinateIndex() {
  const exact = new Map();
  const canonical = new Map();
  const hebrew = new Map();

  const cities = await getJson(GEONAMES_CITIES, { timeout: 300_000 });
  for (const city of cities) {
    if (city.country !== 'IL' && city.country !== 'PS') continue;
    const point = { lat: Number(city.lat), lng: Number(city.lng), source: 'geonames' };
    const key = normalizeName(city.name);
    if (key && !exact.has(key)) exact.set(key, point);
    const canon = canonicalizeTranslit(city.name);
    if (canon) {
      // Ambiguous keys are worse than no key — remember the clash and skip both.
      canonical.set(canon, canonical.has(canon) ? null : point);
    }
  }

  try {
    const ne = await getJson(NATURAL_EARTH_PLACES, { timeout: 300_000 });
    for (const feature of ne.features ?? []) {
      const props = feature.properties ?? {};
      if (props.ADM0NAME !== 'Israel' && props.ISO_A2 !== 'IL') continue;
      const [lng, lat] = feature.geometry?.coordinates ?? [];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const point = { lat, lng, source: 'natural-earth' };
      if (props.NAME_HE) hebrew.set(clean(props.NAME_HE), point);
      const key = normalizeName(props.NAME_EN || props.NAME);
      if (key) exact.set(key, point);
    }
  } catch (err) {
    log(`  Natural Earth lookup skipped (${err.message})`);
  }

  log(
    `  coordinate index: ${exact.size} romanised, ${hebrew.size} Hebrew, ` +
      `${[...canonical.values()].filter(Boolean).length} unambiguous canonical keys`
  );
  return { exact, canonical, hebrew };
}

function attachCoordinates(places, index) {
  const counts = {};

  for (const place of places) {
    if (place.lat && place.lng) {
      place.geo_source = place.geo_source ?? 'data.gov.il';
      continue;
    }

    const alias = GEONAMES_ALIASES[place.name_he];

    // 1. Hebrew name, exact — the most trustworthy match available.
    let hit = index.hebrew.get(place.name_he);

    // 2. A hand-verified alias, resolved against the source index.
    if (!hit && alias) hit = index.exact.get(normalizeName(alias)) ?? null;

    // 3. Romanised name, exact.
    if (!hit) hit = index.exact.get(normalizeName(place.name_en)) ?? null;

    // 4. Romanised name, folded through the transliteration equivalences. Keys that
    //    two different source places share were dropped when the index was built.
    if (!hit) hit = index.canonical.get(canonicalizeTranslit(place.name_en)) ?? null;

    place.lat = hit?.lat ?? null;
    place.lng = hit?.lng ?? null;
    place.geo_source = hit?.source ?? null;
  }

  // A single point claimed by two settlements means at least one of them is wrong,
  // and a marker in the wrong town is worse than no marker at all. Drop both.
  const byPoint = new Map();
  for (const place of places) {
    if (!place.lat) continue;
    const key = `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`;
    byPoint.set(key, [...(byPoint.get(key) ?? []), place]);
  }
  let discarded = 0;
  for (const claimants of byPoint.values()) {
    if (claimants.length === 1) continue;
    for (const place of claimants) {
      place.lat = null;
      place.lng = null;
      place.geo_source = null;
      discarded += 1;
    }
  }

  for (const place of places) {
    if (place.geo_source) counts[place.geo_source] = (counts[place.geo_source] ?? 0) + 1;
  }
  const located = places.filter((p) => p.lat && p.lng).length;
  log(
    `  ${located}/${places.length} settlements located ` +
      `(${JSON.stringify(counts)}; ${discarded} dropped as ambiguous)`
  );
  return places;
}

/* ---------------------------------------------------------------- polygons */

/**
 * geoBoundaries ships ADM1 (mehozot / districts) and ADM2 (nafot / sub-districts).
 * We keep both in one FeatureCollection, tagged by level, and thin the rings so the
 * browser isn't parsing half a megabyte of coordinates on every page view.
 */
function simplifyRing(ring, tolerance) {
  if (ring.length <= 8) return ring;
  const kept = [ring[0]];
  for (const point of ring.slice(1, -1)) {
    const last = kept[kept.length - 1];
    if (Math.abs(point[0] - last[0]) > tolerance || Math.abs(point[1] - last[1]) > tolerance) {
      kept.push(point);
    }
  }
  kept.push(ring[ring.length - 1]);
  return kept.length >= 4 ? kept : ring;
}

function simplifyGeometry(geometry, tolerance = 0.0015) {
  const walk = (coords, depth) =>
    depth === 1 ? simplifyRing(coords, tolerance) : coords.map((c) => walk(c, depth - 1));
  if (geometry.type === 'Polygon') {
    return { ...geometry, coordinates: walk(geometry.coordinates, 2) };
  }
  if (geometry.type === 'MultiPolygon') {
    return { ...geometry, coordinates: walk(geometry.coordinates, 3) };
  }
  return geometry;
}

async function buildRegions() {
  const features = [];
  for (const [level, kind] of [
    ['ADM1', 'district'],
    ['ADM2', 'subdistrict'],
  ]) {
    const collection = await getJson(GEOBOUNDARIES(level), { timeout: 180_000 });
    for (const feature of collection.features ?? []) {
      features.push({
        type: 'Feature',
        properties: {
          level: kind,
          name_en: feature.properties?.shapeName ?? '',
          shape_id: feature.properties?.shapeID ?? '',
        },
        geometry: simplifyGeometry(feature.geometry),
      });
    }
    log(`  ${level}: ${collection.features?.length ?? 0} polygons`);
  }
  return { type: 'FeatureCollection', features };
}

/**
 * The sub-district polygons are labelled in English; the settlement register names
 * them in Hebrew. Bridge the two so the map can shade the nafa a place sits in.
 */
const SUBDISTRICT_HE_BY_EN = {
  "Be'er Sheva": 'באר שבע',
  Jerusalem: 'ירושלים',
  Ashqelon: 'אשקלון',
  'Tel Aviv': 'תל אביב',
  Zefat: 'צפת',
  Rehovot: 'רחובות',
  Ramla: 'רמלה',
  'Petah Tiqwa': 'פתח תקווה',
  HaSharon: 'השרון',
  Haifa: 'חיפה',
  Hadera: 'חדרה',
  Akko: 'עכו',
  "Yizre'el": 'יזרעאל',
  Golan: 'גולן',
  Kinneret: 'כנרת',
};

/* -------------------------------------------------------------------- main */

async function main() {
  await mkdir(PUBLIC_DATA_DIR, { recursive: true });

  const placesPath = path.join(PUBLIC_DATA_DIR, 'israel-places.json');
  const regionsPath = path.join(PUBLIC_DATA_DIR, 'israel-regions.geojson');

  if (OFFLINE) {
    if (!existsSync(placesPath)) throw new Error('--offline set but no israel-places.json on disk');
    log('offline: keeping the committed dataset as-is');
    return;
  }

  log('fetching settlements…');
  let places = null;
  try {
    places = await fetchSettlementsFromGov();
  } catch (err) {
    log(`  data.gov.il unavailable (${err.message})`);
  }
  if (!places?.length) {
    log('  falling back to the GitHub mirror of the CBS settlement file');
    places = await fetchSettlementsFromMirror();
  }

  log('resolving coordinates…');
  try {
    places = attachCoordinates(places, await buildCoordinateIndex());
  } catch (err) {
    log(`  coordinate lookup failed (${err.message}) — markers will be sparse`);
  }

  for (const place of places) {
    place.subdistrict_en =
      Object.entries(SUBDISTRICT_HE_BY_EN).find(([, he]) => he === place.subdistrict_he)?.[0] ?? '';
  }
  places.sort((a, b) => a.name_he.localeCompare(b.name_he, 'he'));

  log('fetching region polygons…');
  const regions = await buildRegions();
  for (const feature of regions.features) {
    feature.properties.name_he = SUBDISTRICT_HE_BY_EN[feature.properties.name_en] ?? '';
  }

  await writeFile(placesPath, `${JSON.stringify(places, null, 2)}\n`, 'utf8');
  await writeFile(regionsPath, `${JSON.stringify(regions)}\n`, 'utf8');

  const withCoords = places.filter((p) => p.lat && p.lng).length;
  log(`wrote ${places.length} places (${withCoords} located) → ${path.relative(ROOT, placesPath)}`);
  log(`wrote ${regions.features.length} polygons → ${path.relative(ROOT, regionsPath)}`);
}

main().catch((err) => {
  console.error('[israel-places] failed:', err);
  process.exitCode = 1;
});
