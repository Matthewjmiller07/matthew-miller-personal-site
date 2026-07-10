#!/usr/bin/env node
/**
 * Prints the refs of Daf Yomi dafs that have no game yet, one per line,
 * from the day after the newest games.json entry through today (inclusive).
 * Looks back at most MAX_LOOKBACK_DAYS so a long-dead machine can't queue
 * a month of builds. Prints nothing when fully caught up.
 *
 * Used by scripts/daf-yomi/daily-daf.sh and .github/workflows/daf-game.yml.
 */

import fs from 'node:fs';
import path from 'node:path';

const MAX_LOOKBACK_DAYS = 14;
const TZ = 'America/Chicago';

const manifestPath = path.join(process.cwd(), 'src', 'data', 'daf-yomi', 'games.json');
const games = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const haveRefs = new Set(games.map((g) => g.ref));
const newestDate = games.map((g) => g.date).sort().at(-1);

function localToday() {
  // YYYY-MM-DD in the site's home timezone, regardless of where this runs (CI is UTC)
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function* datesFromTo(fromISO, toISO) {
  const d = new Date(fromISO + 'T12:00:00Z');
  const end = new Date(toISO + 'T12:00:00Z');
  while (d <= end) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

async function dafFor(dateISO) {
  const [y, m, day] = dateISO.split('-').map(Number);
  const url = `https://www.sefaria.org/api/calendars?year=${y}&month=${m}&day=${day}&timezone=${encodeURIComponent(TZ)}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const cal = await res.json();
  return cal.calendar_items.find((i) => i.title.en === 'Daf Yomi')?.ref ?? null;
}

const today = localToday();
const floor = new Date(Date.now() - MAX_LOOKBACK_DAYS * 86400e3).toISOString().slice(0, 10);
let from = newestDate ? nextDay(newestDate) : today;
if (from < floor) from = floor;

function nextDay(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const missing = [];
for (const date of datesFromTo(from, today)) {
  const ref = await dafFor(date);
  if (ref && !haveRefs.has(ref) && !missing.includes(ref)) missing.push(ref);
}
for (const ref of missing) console.log(ref);
