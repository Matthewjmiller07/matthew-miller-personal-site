#!/usr/bin/env node
/**
 * Builds public/calendar/raanana_gani_yola.ics from
 * src/data/raanana-gani-yola/events.json — vacation days, extended-day
 * (Yol"a) activity-hour windows, and holidays for Raanana's Gani Yol"a
 * kindergarten program, transcribed from the municipality's official
 * school-year calendar. All events are all-day; re-run this script by hand
 * whenever the source events.json changes (e.g. a new school year's
 * calendar is transcribed).
 */

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const eventsPath = path.join(repoRoot, 'src', 'data', 'raanana-gani-yola', 'events.json');
const outPath = path.join(repoRoot, 'public', 'calendar', 'raanana_gani_yola.ics');

const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));

function dateStamp(dateISO) {
  return dateISO.replaceAll('-', '');
}

function nextDateStamp(dateISO) {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
}

function escapeText(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line) {
  // RFC 5545: lines >75 octets should be folded with CRLF + leading space
  const bytes = Buffer.byteLength(line, 'utf8');
  if (bytes <= 75) return line;
  const out = [];
  let rest = line;
  let first = true;
  while (Buffer.byteLength(rest, 'utf8') > (first ? 75 : 74)) {
    let cut = first ? 75 : 74;
    while (Buffer.byteLength(rest.slice(0, cut), 'utf8') > (first ? 75 : 74)) cut--;
    out.push((first ? '' : ' ') + rest.slice(0, cut));
    rest = rest.slice(cut);
    first = false;
  }
  out.push(' ' + rest);
  return out.join('\r\n');
}

const lines = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Raanana Gani Yol\'a//School Calendar//EN',
  'CALSCALE:GREGORIAN',
  'X-WR-CALNAME:Raanana Gani Yol\'a - School Calendar',
  'X-WR-CALDESC:Vacation days, Yol\'a activity-hour windows, and holidays for Raanana\'s Gani Yol\'a kindergarten program',
];

const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

for (const ev of sorted) {
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${ev.id}@raanana-gani-yola.theothermatthewmiller.com`);
  lines.push(`DTSTAMP:${dateStamp(ev.date)}T120000Z`);
  lines.push(`DTSTART;VALUE=DATE:${dateStamp(ev.date)}`);
  lines.push(`DTEND;VALUE=DATE:${nextDateStamp(ev.endDate ?? ev.date)}`);
  lines.push(foldLine(`SUMMARY:${escapeText(ev.title)}`));
  if (ev.description) lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
  if (ev.category) lines.push(`CATEGORIES:${escapeText(ev.category)}`);
  lines.push('END:VEVENT');
}

lines.push('END:VCALENDAR');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\r\n') + '\r\n', 'utf8');
console.log(`Wrote ${sorted.length} events to ${path.relative(repoRoot, outPath)}`);
