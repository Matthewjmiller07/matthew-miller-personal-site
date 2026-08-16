#!/usr/bin/env node
/**
 * Put the Ra'anana shuls on the map.
 *
 * The address list gives a street and number for each shul but no coordinates, so
 * this walks the israel_shuls rows that still have a null lat/lng and geocodes them
 * against OpenStreetMap's Nominatim — free, no key, and required by its usage policy
 * to be called no more than once a second with a real User-Agent identifying the
 * caller. Both rules are honoured below.
 *
 * Anything Nominatim can't place is left alone and reported at the end; the page has
 * a pin-drop mode for finishing those off by hand.
 *
 * Needs, in .env or the environment:
 *   PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (writes bypass RLS, so this must stay server-side)
 *
 * Usage:
 *   node scripts/geocode-israel-shuls.mjs           # only shuls with no coordinates
 *   node scripts/geocode-israel-shuls.mjs --all     # re-geocode everything
 *   node scripts/geocode-israel-shuls.mjs --dry-run # look, don't save
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONTACT = process.env.GEOCODER_CONTACT || 'https://matthewjamesmiller.com';

const ALL = process.argv.includes('--all');
const DRY_RUN = process.argv.includes('--dry-run');

/** Nominatim asks for one request a second and an identifiable agent. */
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = `matthewjamesmiller.com israel-tracker (${CONTACT})`;
const RATE_LIMIT_MS = 1100;

/** Ra'anana's bounding box, so "Herzl 5" doesn't land on a Herzl street in Haifa. */
const VIEWBOX = '34.845,32.210,34.905,32.160';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (...args) => console.log('[geocode]', ...args);

/**
 * Addresses in the list carry parenthetical directions ("אחוזה 98, מרכז אלרם קומה 1"),
 * floor numbers and landmarks. Geocoders choke on all of it — keep the street and the
 * house number and throw the rest away.
 */
function streetAddress(address) {
  if (!address) return null;

  const tidy = (value) =>
    value
      .split(/[,.]/)[0]
      .replace(/קומה\s*\d+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const outside = tidy(address.replace(/\([^)]*\)/g, ' '));

  // Sometimes the real street address is the parenthetical and the lead-in is a
  // landmark — "מרכז אליאב (אחוזה 68)". Prefer whichever half has a house number.
  if (!/\d/.test(outside)) {
    const inside = [...address.matchAll(/\(([^)]*)\)/g)]
      .map((match) => tidy(match[1]))
      .find((candidate) => /\d/.test(candidate));
    if (inside) return inside;
  }

  return outside || null;
}

async function geocode(query, city) {
  const url = `${NOMINATIM}?${new URLSearchParams({
    q: `${query}, ${city}, Israel`,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'il',
    viewbox: VIEWBOX,
    bounded: city === 'רעננה' ? '1' : '0',
  })}`;

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (response.status === 429) {
    log('  rate limited — backing off for 10s');
    await sleep(10_000);
    return geocode(query, city);
  }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const [hit] = await response.json();
  if (!hit) return null;
  return { lat: Number(hit.lat), lng: Number(hit.lon), display: hit.display_name };
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = db.from('israel_shuls').select('id, name_he, address_he, city, lat, lng');
  if (!ALL) query = query.is('lat', null);
  const { data: shuls, error } = await query;
  if (error) throw new Error(error.message);

  const withAddress = shuls.filter((shul) => streetAddress(shul.address_he));
  log(`${shuls.length} shuls to place, ${withAddress.length} of them with a usable address`);

  const failures = [];
  let placed = 0;

  for (const shul of withAddress) {
    const address = streetAddress(shul.address_he);
    let hit = null;
    try {
      hit = await geocode(address, shul.city || 'רעננה');
    } catch (err) {
      log(`  ${shul.name_he}: lookup failed — ${err.message}`);
    }

    if (!hit) {
      failures.push(`${shul.name_he} (${address})`);
    } else if (DRY_RUN) {
      log(`  ${shul.name_he} → ${hit.lat.toFixed(5)}, ${hit.lng.toFixed(5)} · ${hit.display}`);
      placed += 1;
    } else {
      const { error: writeError } = await db
        .from('israel_shuls')
        .update({ lat: hit.lat, lng: hit.lng })
        .eq('id', shul.id);
      if (writeError) {
        failures.push(`${shul.name_he} (save failed: ${writeError.message})`);
      } else {
        log(`  ${shul.name_he} → ${hit.lat.toFixed(5)}, ${hit.lng.toFixed(5)}`);
        placed += 1;
      }
    }

    await sleep(RATE_LIMIT_MS);
  }

  log(`${placed} placed${DRY_RUN ? ' (dry run — nothing saved)' : ''}`);
  if (failures.length) {
    log(`${failures.length} still need a pin dropped by hand:`);
    for (const failure of failures) log(`  · ${failure}`);
  }
}

main().catch((err) => {
  console.error('[geocode] failed:', err.message);
  process.exitCode = 1;
});
