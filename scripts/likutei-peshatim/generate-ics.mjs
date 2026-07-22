#!/usr/bin/env node
/**
 * Builds public/calendar/likutei_peshatim.ics from
 * src/data/likutei-peshatim/events.json. Deterministic — no LLM calls here;
 * the LLM's job (via claude -p) is only to populate events.json.
 *
 * Local wall-clock times in events.json are in America/Chicago and are
 * converted to UTC per-event using the actual offset for that event's date
 * (so DST transitions resolve correctly without a VTIMEZONE block).
 */

import fs from 'node:fs';
import path from 'node:path';

const TZ = 'America/Chicago';
const repoRoot = process.cwd();
const eventsPath = path.join(repoRoot, 'src', 'data', 'likutei-peshatim', 'events.json');
const outPath = path.join(repoRoot, 'public', 'calendar', 'likutei_peshatim.ics');

const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));

function chicagoOffsetMinutes(dateISO) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  });
  const part = dtf.formatToParts(new Date(`${dateISO}T12:00:00Z`)).find((p) => p.type === 'timeZoneName');
  const m = part?.value.match(/GMT([+-]\d+)/);
  return m ? parseInt(m[1], 10) * 60 : -360;
}

function utcStamp(dateISO, timeHHMM) {
  const [y, mo, d] = dateISO.split('-').map(Number);
  const [hh, mm] = timeHHMM.split(':').map(Number);
  const offsetMin = chicagoOffsetMinutes(dateISO);
  const utcMillis = Date.UTC(y, mo - 1, d, hh, mm) - offsetMin * 60000;
  const dt = new Date(utcMillis);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;
}

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
    // avoid splitting a multi-byte char
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
  "PRODID:-//Likutei Peshatim//Community Events//EN",
  'CALSCALE:GREGORIAN',
  'X-WR-CALNAME:Likutei Peshatim - Community Events',
  'X-WR-CALDESC:Dated events parsed from the weekly HTC Likutei Peshatim newsletter',
];

const sorted = [...events].sort((a, b) => (a.date + (a.time ?? '00:00')).localeCompare(b.date + (b.time ?? '00:00')));

for (const ev of sorted) {
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${ev.id}@likutei-peshatim.theothermatthewmiller.com`);
  lines.push(`DTSTAMP:${utcStamp(ev.date, '12:00')}`);

  if (ev.allDay || !ev.time) {
    lines.push(`DTSTART;VALUE=DATE:${dateStamp(ev.date)}`);
    lines.push(`DTEND;VALUE=DATE:${ev.endDate ? nextDateStamp(ev.endDate) : nextDateStamp(ev.date)}`);
  } else {
    lines.push(`DTSTART:${utcStamp(ev.date, ev.time)}`);
    if (ev.endTime) {
      lines.push(`DTEND:${utcStamp(ev.date, ev.endTime)}`);
    } else {
      const [h, m] = ev.time.split(':').map(Number);
      const durationMin = ev.durationMinutes ?? 60;
      const endTotal = h * 60 + m + durationMin;
      const endTime = `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
      lines.push(`DTEND:${utcStamp(ev.date, endTime)}`);
    }
  }

  lines.push(foldLine(`SUMMARY:${escapeText(ev.title)}`));
  if (ev.location) lines.push(foldLine(`LOCATION:${escapeText(ev.location)}`));
  if (ev.description) lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
  if (ev.category) lines.push(`CATEGORIES:${escapeText(ev.category)}`);
  lines.push('END:VEVENT');
}

lines.push('END:VCALENDAR');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\r\n') + '\r\n', 'utf8');
console.log(`Wrote ${sorted.length} events to ${path.relative(repoRoot, outPath)}`);
