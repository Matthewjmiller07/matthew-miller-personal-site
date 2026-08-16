# /israel — the life tracker

A private-ish log of life in Israel, on a public page: which shul for which minyan and
at what time, where Shabbat was spent and who was at each meal, and everywhere else we
get to during the week — all of it on a map of the country.

Anyone can read it. Adding entries needs a passcode.

## The pieces

| Path | What it is |
| --- | --- |
| `src/pages/israel.astro` | The page — hero, styles, and the React island |
| `src/components/israel/` | The tracker: map, forms, lists, stats |
| `src/pages/api/israel.js` | The only write path; service-role key behind a passcode |
| `scripts/build-israel-places.mjs` | Rebuilds the settlement list and the region polygons |
| `scripts/geocode-israel-shuls.mjs` | Turns shul street addresses into map pins |
| `israel-tracker-supabase-setup.sql` | The schema, as applied to Supabase |
| `src/data/israel/shuls.json` | The Ra'anana shul list as seeded into the database |
| `public/data/israel-places.json` | 1,271 settlements — the reference geography |
| `public/data/israel-regions.geojson` | District + sub-district polygons |

## Setup

Two secrets beyond the usual Supabase pair (see `.env.example`):

```
SUPABASE_SERVICE_ROLE_KEY=…    # Supabase dashboard → Project Settings → API
ISRAEL_TRACKER_PASSWORD=…      # whatever you want to type before the forms appear
```

Both must be set in Netlify as well, or the page loads read-only and every save
returns a 500 saying so. Neither may be prefixed `PUBLIC_` — that would ship them to
the browser.

## How the data is split

**Tracking data lives in Supabase**, in six `israel_*` tables: people, shuls, minyanim,
Shabbatot, Shabbat meals, and visits. RLS allows `select` to `anon` and grants no write
policy at all, so the browser's anon key can read everything and change nothing. Writes
go to `/api/israel`, which checks the passcode with a constant-time compare and then
uses the service-role key.

**Reference geography lives in the repo**, as static JSON in `public/data/`. It is
published open government data, not user data — putting it in git keeps it reviewable,
lets the CDN serve it, and saves a database round trip on every page view. Log rows
reference a settlement by its CBS *semel yishuv* code in `place_code`, which is the
join key into `israel-places.json`.

## Where the geography comes from

`scripts/build-israel-places.mjs` builds both static files:

- **Settlements** — the Central Bureau of Statistics register: semel yishuv, Hebrew and
  English name, sub-district (nafa) and regional council for all 1,271 places. The
  script asks data.gov.il's CKAN API for it first, discovering the resource by its
  field names rather than a hardcoded id (those get re-issued on every republish). If
  data.gov.il is unreachable it falls back to a GitHub mirror of the same CBS file.
- **Boundaries** — geoBoundaries `gbOpen` ISR ADM1 (6 districts) and ADM2 (15
  sub-districts), simplified so the browser isn't parsing half a megabyte of rings.
- **Coordinates** — the settlement register has names and codes but no geometry, so
  each place is matched into GeoNames (and Natural Earth, which carries Hebrew names)
  by exact name, by a hand-verified alias table, or by folding the interchangeable
  transliterations together (`PETAH TIQWA` ↔ `Petah Tiqva`). Anything ambiguous is
  dropped rather than guessed: if one coordinate ends up claimed by two settlements,
  both lose it, because a marker in the wrong town is worse than no marker.

That leaves **421 of 1,271 settlements located** — the cities and larger towns, plus
most of the moshavim GeoNames knows. The rest are selectable and searchable, they just
don't draw a marker until they get coordinates.

```bash
node scripts/build-israel-places.mjs        # refresh both files
node scripts/build-israel-places.mjs --offline   # keep what's committed
```

Run it somewhere with open outbound HTTPS. If data.gov.il is blocked the script says
so and carries on with the mirror, so the output is the same shape either way — but the
gov path is the one that can bring back official coordinates for every settlement, and
that is the upgrade to run when the network allows it.

## Shul pins

The 58 shuls came from the Ra'anana address list (52 with addresses) plus six more
locations that appear on the minyan timetable but not the address sheet. The list has
street addresses, not coordinates, so pins arrive one of two ways:

```bash
node scripts/geocode-israel-shuls.mjs --dry-run   # see what Nominatim finds
node scripts/geocode-israel-shuls.mjs             # save the ones it places
```

It geocodes only shuls whose `lat` is still null, cleans the addresses first (the list
is full of floor numbers, landmarks and parentheticals that geocoders choke on), and
honours Nominatim's one-request-per-second policy. Two addresses in the list have no
house number at all — those need the other route: unlock the page, open **Shuls**, hit
**Pin**, and click the spot on the map.

## Everyday use

- **Map** — sub-districts shaded by how much we've logged there, an orange marker per
  town sized by how often, blue markers for shuls.
- **Minyanim** — date, tefillah, shul (the Ra'anana list, or type anywhere else), the
  minyan time, and who came.
- **Shabbat** — one row per Shabbat with the parasha filled in from Hebcal, then tick
  only the meals that happened. Each of the three seudot plus kiddush, dessert and
  melave malka carries its own host, town and attendees, because turning up somewhere
  for just the kiddush is a normal Shabbat.
- **Out & about** — weekday trips anywhere in the country.
- **Shuls** — the whole list, filterable by "has mincha ketana + arvit" and by whether
  I've actually davened there.
- **Patterns** — where I daven, which tefillah, where we go, which meals out, who hosts.

"Whole family" is one tap and means everyone currently marked as family, so adding a
person later doesn't rewrite what past entries meant.
