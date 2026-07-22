---
name: likutei-peshatim
description: Parse a Likutei Peshatim (HTC weekly Torah newsletter) email into calendar events and publish them to /calendars. Use when the user says /likutei-peshatim, "parse this week's Likutei Peshatim", or names a specific email/message ID to process.
---

# Likutei Peshatim — newsletter to calendar

Every week HTC emails "Likutei Peshatim: <Parsha> - <Year>" to matthewjmiller07@gmail.com.
It's a dense community bulletin (Torah insights, shul announcements, job postings, yahrzeits,
event listings) mixed together in one wall of text. This skill extracts the calendar-worthy
events and appends them to `src/data/likutei-peshatim/events.json`, which
`scripts/likutei-peshatim/generate-ics.mjs` turns into `public/calendar/likutei_peshatim.ics`,
served from the `/calendars` page.

## 1. Get the raw email

Automated runs pass a scratch text file path (written by
`scripts/likutei-peshatim/fetch-new-emails.mjs`, which uses the local `gws` CLI — read-only
Gmail OAuth scope, no API billing). For an ad hoc run on a specific message, fetch it directly:

```bash
gws gmail users messages get --params '{"userId":"me","id":"<messageId>","format":"full"}'
```

The plaintext body is at `payload.parts[].body.data` (or nested deeper for
multipart/mixed) — base64url-decode it.

**First check `src/data/likutei-peshatim/processed-emails.json`** — if this message ID is
already there, stop; it's already been parsed. Never reprocess.

## 2. What counts as an event

Include anything with a resolvable date: shiurim, drashos, screenings, races, fast-day
schedules, fundraising campaigns with a date window, Scholar-in-Residence talks, and
**yahrzeits** (as all-day events — Matthew has explicitly asked for these to be included).

Skip: job postings, open-ended asks ("join our waitlist", "seeking a...for hire"), and
anything with no date at all.

Granularity: prefer one event per distinct time/session rather than collapsing a whole
schedule into one block (e.g. a Tisha B'Av schedule with 4 service times → 4 events, not 1).
When several locations share one time (e.g. "NILI Shabbat shiurim, all at 5:30 PM" across
3 homes), one event with all locations/speakers in the description is fine.

## 3. Resolving dates

The email header always anchors a Hebrew date to a Gregorian one, e.g.
`2 Av 5786 | July 16, 2026`. Most events already give an explicit Gregorian date in the
body ("Monday evening, July 20th") — use that directly.

For Hebrew-only dates (yahrzeits are almost always given only as "7 Av", "כ״ח תמוז", etc.):
compute the Gregorian date by taking the day-offset from the anchor Hebrew date **within the
same Hebrew month** and applying that offset to the anchor Gregorian date. E.g. anchor
`2 Av = July 16`; "7 Av" → July 16 + (7-2) = July 21. If the target Hebrew date is in a
different month than the anchor, use general Hebrew-calendar knowledge (or a neighboring
week's email, which will anchor that month) — don't guess blindly.

**Sanity-check every resolved date against known fixed points** (e.g. Tisha B'Av, which
other events in the same email often reference explicitly) and against day-of-week where
stated ("Wednesday 8/22/26" that doesn't line up with the Hebrew-date math is very likely a
copy-paste typo in the newsletter itself — trust the math, note the correction in the
event's description, don't blindly transcribe an inconsistent date).

Times are America/Chicago local time — store as plain `"HH:MM"` (24h), not with an offset;
`generate-ics.mjs` handles the UTC/DST conversion.

## 4. Event schema

Append to `src/data/likutei-peshatim/events.json` (array), each entry:

```json
{
  "id": "lp-YYYYMMDD-short-slug",
  "title": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",            // omit or set allDay:true for all-day (yahrzeits, etc.)
  "endTime": "HH:MM",         // optional; else durationMinutes (default 60) is used
  "durationMinutes": 60,      // optional
  "endDate": "YYYY-MM-DD",    // optional, for multi-day all-day spans
  "allDay": false,
  "location": "string or null",
  "description": "string",
  "sourceExcerpt": "verbatim quote from the email this event was parsed from",
  "category": "shiur|drasha|screening|race|fast|campaign|event|yahrzeit",
  "sourceMessageId": "<gmail message id>",
  "sourceSubject": "<email subject>",
  "sourceDate": "YYYY-MM-DD"  // date the email was sent
}
```

`id` must be unique and stable — dedupe against existing entries in events.json (same
title+date already present from a prior week means don't re-add).

## 5. Finish: mark processed, rebuild, ship

1. Append `{id, subject, date, eventCount}` to `src/data/likutei-peshatim/processed-emails.json`
   for this message — **even if eventCount is 0** (e.g. an addendum with no dated content),
   so it's never reprocessed.
2. Run `node scripts/likutei-peshatim/generate-ics.mjs` to rebuild the ICS file.
3. `git add` only the 3 files touched (events.json, processed-emails.json,
   public/calendar/likutei_peshatim.ics) plus calendars.astro if the event count line needs
   no edit (it's computed from events.json automatically — don't touch calendars.astro for
   routine runs).
4. Commit (`Add Likutei Peshatim events: <Parsha> - <date>`) and push to origin main.
