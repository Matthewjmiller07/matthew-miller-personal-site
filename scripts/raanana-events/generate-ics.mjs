#!/usr/bin/env node
/**
 * Builds the Raanana events & shows calendars from
 * src/data/raanana-events/events.json (shows, concerts, kids' theater and
 * community events listed on the municipality's ticket site,
 * https://tickets.raanana.muni.il/, translated to English):
 *
 *   public/calendar/raanana_events.ics       English, every event
 *   public/calendar/raanana_events_he.ics    Hebrew, every event
 *   public/calendar/raanana_events_kids.ics  English, only events flagged
 *                                            `forEight` (an 8-year-old might like it)
 *
 * Flagged events get a ⭐ prefix and a "Kid pick" category in the full feeds.
 * Times in events.json are Asia/Jerusalem wall-clock "HH:MM" and are
 * converted to UTC per event, so DST is handled.
 */

import fs from 'node:fs';
import path from 'node:path';

const TZ = 'Asia/Jerusalem';
const repoRoot = process.cwd();
const eventsPath = path.join(repoRoot, 'src', 'data', 'raanana-events', 'events.json');
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));

const pad = (n) => String(n).padStart(2, '0');

function offsetMinutes(dateISO, timeHHMM) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset', hour: '2-digit' });
  const part = dtf.formatToParts(new Date(`${dateISO}T${timeHHMM}:00Z`)).find((p) => p.type === 'timeZoneName');
  const m = part?.value.match(/GMT([+-]\d+)(?::(\d+))?/);
  return m ? parseInt(m[1], 10) * 60 + Math.sign(parseInt(m[1], 10)) * parseInt(m[2] ?? '0', 10) : 120;
}

function utcStamp(dateISO, timeHHMM) {
  const [y, mo, d] = dateISO.split('-').map(Number);
  const [hh, mm] = timeHHMM.split(':').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, hh, mm) - offsetMinutes(dateISO, timeHHMM) * 60000);
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;
}

function addMinutes(dateISO, timeHHMM, minutes) {
  const [y, mo, d] = dateISO.split('-').map(Number);
  const [hh, mm] = timeHHMM.split(':').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, hh, mm + minutes));
  return {
    date: `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`,
    time: `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`,
  };
}

function dateStamp(dateISO) {
  return dateISO.replaceAll('-', '');
}

function nextDateStamp(dateISO) {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
}

function escapeText(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line) {
  // RFC 5545: lines >75 octets should be folded with CRLF + leading space
  if (Buffer.byteLength(line, 'utf8') <= 75) return line;
  const out = [];
  let rest = line;
  let first = true;
  while (Buffer.byteLength(rest, 'utf8') > (first ? 75 : 74)) {
    const limit = first ? 75 : 74;
    let cut = limit;
    while (Buffer.byteLength(rest.slice(0, cut), 'utf8') > limit) cut--;
    out.push((first ? '' : ' ') + rest.slice(0, cut));
    rest = rest.slice(cut);
    first = false;
  }
  out.push(' ' + rest);
  return out.join('\r\n');
}

function describe(ev, lang) {
  const he = lang === 'he';
  const parts = [];
  if (ev.forEight) parts.push(he ? `⭐ מתאים לבן/בת 8: ${ev.forEightWhyHe || ev.forEightWhy || ''}`.trim() : `⭐ Kid pick (age 8): ${ev.forEightWhy || ''}`.trim());
  const body = he ? (ev.descriptionHe || ev.description) : ev.description;
  if (body) parts.push(body);
  if (!he && ev.titleHe) parts.push(`Hebrew title: ${ev.titleHe}`);
  const ages = he ? (ev.agesHe || ev.ages) : ev.ages;
  if (ages) parts.push(he ? `גילאים: ${ages}` : `Ages: ${ages}`);
  const price = he ? (ev.priceHe || ev.price) : ev.price;
  if (price) parts.push(he ? `מחיר: ${price}` : `Price: ${price}`);
  if (ev.url) parts.push(he ? `כרטיסים: ${ev.url}` : `Tickets: ${ev.url}`);
  return parts.join('\n\n');
}

function buildIcs({ calName, calDesc, lang, filter = () => true }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//theothermatthewmiller.com//Raanana Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeText(calName)}`),
    foldLine(`X-WR-CALDESC:${escapeText(calDesc)}`),
    `X-WR-TIMEZONE:${TZ}`,
  ];

  const sorted = events
    .filter(filter)
    .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`));

  for (const ev of sorted) {
    const baseTitle = lang === 'he' ? (ev.titleHe || ev.title) : ev.title;
    const title = ev.forEight ? `⭐ ${baseTitle}` : baseTitle;
    const location = lang === 'he' ? (ev.venueHe || ev.venue) : (ev.venue || ev.venueHe);
    const categories = [ev.category, ev.forEight ? (lang === 'he' ? 'מתאים לבן/בת 8' : 'Kid pick') : null].filter(Boolean);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@raanana-events.theothermatthewmiller.com`);
    lines.push(`DTSTAMP:${dateStamp(ev.date)}T120000Z`);
    if (ev.allDay || !ev.time) {
      lines.push(`DTSTART;VALUE=DATE:${dateStamp(ev.date)}`);
      lines.push(`DTEND;VALUE=DATE:${nextDateStamp(ev.endDate ?? ev.date)}`);
    } else {
      const end = ev.endTime
        ? { date: ev.date, time: ev.endTime }
        : addMinutes(ev.date, ev.time, ev.durationMinutes ?? 90);
      lines.push(`DTSTART:${utcStamp(ev.date, ev.time)}`);
      lines.push(`DTEND:${utcStamp(end.date, end.time)}`);
    }
    lines.push(foldLine(`SUMMARY:${escapeText(title)}`));
    if (location) lines.push(foldLine(`LOCATION:${escapeText(location)}`));
    const description = describe(ev, lang);
    if (description) lines.push(foldLine(`DESCRIPTION:${escapeText(description)}`));
    if (ev.url) lines.push(foldLine(`URL:${ev.url}`));
    if (categories.length) lines.push(foldLine(`CATEGORIES:${categories.map(escapeText).join(',')}`));
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return { lines, count: sorted.length };
}

function writeIcs(fileName, built) {
  const outPath = path.join(repoRoot, 'public', 'calendar', fileName);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, built.lines.join('\r\n') + '\r\n', 'utf8');
  console.log(`Wrote ${built.count} events to ${path.relative(repoRoot, outPath)}`);
}

writeIcs('raanana_events.ics', buildIcs({
  calName: 'Raanana - Events & Shows',
  calDesc: 'Shows, concerts, kids\' theater and community events from the Raanana municipality ticket site, translated to English. ⭐ = an 8-year-old might like it.',
  lang: 'en',
}));

writeIcs('raanana_events_he.ics', buildIcs({
  calName: 'רעננה - אירועים והופעות',
  calDesc: 'הופעות, קונצרטים, הצגות ילדים ואירועי קהילה מאתר הכרטיסים של עיריית רעננה. ⭐ = מתאים לבן/בת 8.',
  lang: 'he',
}));

writeIcs('raanana_events_kids.ics', buildIcs({
  calName: 'Raanana - Kid Picks (age 8)',
  calDesc: 'Only the Raanana events an 8-year-old might like.',
  lang: 'en',
  filter: (ev) => ev.forEight,
}));
