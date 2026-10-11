---
name: raanana-events
description: Pull events from the Raanana municipality ticket site (tickets.raanana.muni.il), translate them to English, flag the ones an 8-year-old might like, and publish them to the Raanana Events calendar on /calendars. Use when the user says /raanana-events, "update the Raanana events", shares the ticket-site listing, or pastes Raanana show/event details.
---

# Raanana events: ticket site to calendar

Source: https://tickets.raanana.muni.il/ (Hebrew). Output: `src/data/raanana-events/events.json`,
which `scripts/raanana-events/generate-ics.mjs` turns into three feeds served from
`/calendars/RaananaEvents`:

- `public/calendar/raanana_events.ics`: English, every event
- `public/calendar/raanana_events_he.ics`: Hebrew, every event
- `public/calendar/raanana_events_kids.ics`: English, only `forEight: true` events

## 1. Get the listings

Fetch the ticket site and each event's detail page. The cloud environment's network policy
may block `tickets.raanana.muni.il`; if so, ask Matthew to add it under Allowed domains, or to
paste the listing (text, screenshots or HTML). Never invent events, dates or times.

## 2. One entry per performance

A show with three performances is three entries. Schema:

```json
{
  "id": "re-YYYYMMDD-HHMM-short-slug",
  "title": "English title (translated; transliterate names of performers/shows that are names)",
  "titleHe": "כותרת המקורית, verbatim",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",             // Israel local time, 24h; omit + allDay:true if no time
  "endTime": "HH:MM",          // optional; else durationMinutes (default 90)
  "durationMinutes": 90,
  "venue": "Yad Lebanim Culture Hall, Raanana",
  "venueHe": "היכל התרבות יד לבנים",
  "category": "Kids theater|Concert|Stand-up|Theater|Lecture|Dance|Community|Film|Workshop",
  "ages": "4-9",               // if the site gives an age range
  "agesHe": "גילאי 4-9",
  "price": "₪60",
  "description": "1-3 sentence English translation of the blurb",
  "descriptionHe": "התקציר המקורי",
  "url": "https://tickets.raanana.muni.il/...",   // detail/booking page
  "forEight": true,
  "forEightWhy": "One line: why an 8-year-old would enjoy it",
  "forEightWhyHe": "שורה אחת בעברית"
}
```

`id` must be stable; dedupe on `titleHe` + `date` + `time`. Drop past events only when the
file gets long; never edit the `id` of an existing entry.

## 3. Translating

Natural English, not word-for-word. Keep proper names (performers, show names that are names)
transliterated and add the meaning in the description if it helps. Keep the Hebrew verbatim
in the `*He` fields.

## 4. Flagging for an 8-year-old (`forEight`)

Flag `true` when the event is clearly aimed at or works for an 8-year-old: children's theater
and musicals, family concerts, magic/circus/science shows, kids' workshops, holiday family
events, movies rated for kids, sports days. Respect the site's stated age range (8 must be in
it). Flag `false` for adult theater, stand-up, lectures, late-night shows (starting after 20:00),
and anything that's mainly for toddlers (e.g. "גילאי 2-5"). When unsure, leave it `false`
and say so in the summary. Matthew can flip any flag by editing `forEight` by hand.

## 5. Finish

1. `node scripts/raanana-events/generate-ics.mjs`
2. Add a bullet to `writing/desk/next-issue.md` only if the update is notable (no private details).
3. Commit `events.json` and the three `.ics` files together, then push.
4. Tell Matthew the count added and list the ⭐ picks with dates.
