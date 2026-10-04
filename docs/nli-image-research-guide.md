# Querying the National Library of Israel (NLI) for parasha-sheet evidence

This is the exact, battle-tested method used to find real, verifiable images and
archival records from the National Library of Israel (NLI) for the "Biblical →
Modern Hebrew" sections of the parasha sheets on this site. It exists because this
sandbox cannot reach `nli.org.il` or `iiif.nli.org.il` directly — all outbound
network access to NLI goes through two Supabase Edge Functions that relay the
request server-side. Any agent (including Muse AI) doing this research should
follow this exact path rather than trying to hit NLI's API directly, unless it has
been confirmed to have direct outbound HTTPS access.

## The hard rule, before anything else

**Never fabricate or guess an FL image identifier, a record ID, or a URL.** Every
image embedded in a parasha sheet must come from a real NLI search result, with a
manifest you actually fetched and an image you actually retrieved and looked at.
If a search turns up nothing usable, the entry ships with no image — that is a
normal, expected outcome (roughly half of this site's parasha-sheet entries have
no image evidence), not a failure state to paper over.

## Architecture: why a relay is needed

- `iiif.nli.org.il`, `api.nli.org.il`, and `*.supabase.co` are not directly
  reachable from this environment's network policy.
- The relay is two Supabase Edge Functions in project `qukziojymwlvmrzapgyo`:
  - **`nli-search`** — searches NLI's Open Library API and parses the response.
  - **`nli-image-b64`** — fetches one IIIF image and returns it as base64 JSON
    (needed because Postgres/pg_net can't carry raw binary through a text column).
- Both functions are called via Postgres's `net.http_get()` (the `pg_net`
  extension), which is asynchronous: you fire the request, then poll a response
  table a few seconds later.
- If the agent running this has *direct* outbound HTTPS access (Muse AI may),
  all of this can be collapsed to plain HTTPS requests — see "Direct-access
  shortcut" at the end. The request/response shapes are identical either way.

## Step 1 — Search NLI for a candidate term

Call `nli-search` with your Hebrew search term. Via the Supabase relay:

```sql
select net.http_get(
  url := 'https://qukziojymwlvmrzapgyo.supabase.co/functions/v1/nli-search',
  params := jsonb_build_object('q', '<hebrew search term>', 'limit', '20'),
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
  ),
  timeout_milliseconds := 30000
) as id;
```

This returns a request `id` immediately. Wait ~10–15 seconds, then read the result:

```sql
select id, status_code, content, error_msg from net._http_response where id = <id>;
```

**Important defaults and gotchas, learned the hard way:**

- **Always pass `timeout_milliseconds := 30000`** (or higher). The pg_net default
  is 5000ms, which is routinely too short for `nli-search` when it resolves IIIF
  manifests for multiple hits — you'll just get `error_msg: "Timeout of 5000 ms
  reached"` and `content: null`, which looks like total failure but is just a
  too-short timeout.
- `limit` caps at 30.
- Pass `resolve=0` to skip manifest resolution and get a fast triage pass (titles
  and record types only, no `flIds`) when you just want to see what's out there
  before committing to the slower full search.
- **NLI's own backend is flaky.** You will regularly get back
  `{"error":"search 500","body":"unsuccessfully to connect with nliWs"}` even
  with a correct, well-formed request. This is NLI's problem, not yours — retry
  the identical query 1–3 times with a ~10–15 second gap. It usually succeeds on
  the 2nd or 3rd attempt. If it fails 4+ times in a row, try a different but
  related search term rather than continuing to hammer the same one.

### Reading a search result

Each hit in the `results` array looks like:

```json
{
  "id": "https://www.nli.org.il/en/archives/NNL_ARCHIVE_AL...",
  "title": "עלון - 'מבול - הסרט'.",
  "type": "archive",
  "recordid": "990049233480205171",
  "identifier": "NNL_ARCHIVE_AL11342683600005171",
  "date": "19891102",
  "subjects": ["Ephemera"],
  "manifestUrl": "https://iiif.nli.org.il/IIIFv21/990049233480205171/manifest",
  "flIds": ["FL58235059"],
  "manifestLabel": "...",
  "rights": ["..."],
  "canvasCount": 1
}
```

- `manifestUrl: null` and `flIds: []` means this specific record has no
  digitized image attached (text-only catalog entry) — still useful for citing a
  real book/paper title in prose, just not as an embedded image.
- A **short `flIds` array (1–3 items) on a record whose title directly matches
  your search term** is the best kind of hit: a single-sheet flyer, poster, or
  photograph, not a 400-page scanned book where you'd have to guess which page.
- A long `flIds` array (dozens to hundreds) usually means a multi-page scanned
  book — skip these unless you have a specific page in mind; otherwise you're
  guessing which page has the content you want.
- Judge relevance from the `title` field and `subjects` array before doing
  anything else. Many searches for an ordinary modern Hebrew word return mostly
  irrelevant noise (unrelated books that merely contain the word) — read titles
  carefully rather than grabbing the first flId you see.

## Step 2 — Fetch and read the IIIF manifest (if you don't already have flIds)

If a promising hit has `manifestUrl` but you want more detail (full rights
statement, canvas list, description), fetch it directly — manifests are public
JSON, no auth needed:

```sql
select net.http_get(
  url := '<manifestUrl from the search hit>',
  timeout_milliseconds := 20000
) as id;
```

Then read `net._http_response` the same way as above. The manifest gives you:

- `license` — **check this before using the image.** A URL ending in
  `.../fair-use` means the Library's own fair-use terms apply and the image is
  safe to embed with attribution. A `license` of
  `.../no-license-subject-to-copyright` (or similar) means the record is
  copyright-restricted — **do not embed the image**; you may still cite the
  record and its metadata in prose, but do not display the picture.
- `attribution` — the credit line to use (sometimes bilingual, sometimes just
  Hebrew — use the Library's own wording).
- `description` — often the single most useful field; frequently gives you
  exact dates, names, and context that you'd otherwise have to guess at.
- `sequences[0].canvases[]` — each canvas has an `@id` (the FL identifier) and
  `width`/`height`. For a single-canvas record this tells you immediately which
  FL id to use; for a multi-canvas record you'd need a reason to pick a specific
  one (skip unless you have that reason).

## Step 3 — Fetch the actual image to verify it

Never cite or embed an image you have not actually looked at. Fetch it through
the relay:

```sql
select net.http_get(
  url := 'https://qukziojymwlvmrzapgyo.supabase.co/functions/v1/nli-image-b64',
  params := jsonb_build_object('fl', '<FL identifier, e.g. FL58235059>', 'size', '500,'),
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
  ),
  timeout_milliseconds := 25000
) as id;
```

Notes on this function's contract:

- The query param is **`fl`**, not `id` or `fl_id` — an `FL\d+` identifier only.
- `size` must match `^\d{2,4},$` (e.g. `"500,"`, `"800,"`) — a width with a
  trailing comma, IIIF's "scale to this width, auto height" syntax.
- Response shape: `{"fl": "...", "size": "...", "bytes": N, "b64len": N, "b64": "<base64 jpeg>"}`.
  On an upstream failure it returns **HTTP 200** with `{"error": "upstream <code>", "src": "..."}`
  or `{"error": "not an image (<content-type>)", "src": "..."}` — always check
  for an `error` key in the parsed JSON, not just the HTTP status.
- Decode the `b64` field and write it to a file, then actually view the image
  before deciding to use it. Looking at the image is not optional — metadata can
  be misleading (wrong canvas, a blank page, a cover rather than the content
  page, etc.).

### A real IIIF sizing gotcha

When requesting the **full-resolution** image directly from
`https://iiif.nli.org.il/IIIFv21/<FL>/full/<size>/0/default.jpg` (bypassing the
relay, e.g. for the final `img` URL embedded in the site), **always use
`/full/max/0/default.jpg`**, never a fixed pixel width like `/full/600,/`. If the
source image's native width is smaller than the requested width, the Cantaloupe
IIIF server refuses to upscale and returns a 403. `max` always succeeds and
simply returns the image at its native resolution. This caused real broken
images on this site before the fix.

## Step 4 — Decide if it's usable, and write an honest citation

Before using an image or record as "evidence" for a Biblical → Modern Hebrew
entry, it should satisfy all of:

1. **It genuinely uses the term/phrase itself** — a flyer, program, song sheet,
   book cover, or campaign poster whose own title or text contains the modern
   Hebrew word or phrase you're illustrating. A manuscript illustration of a
   Biblical scene (e.g. a medieval depiction of the Tower of Babel) is a real and
   verifiable find, but it is evidence of *illustration*, not of *modern usage* —
   don't present one as the other.
2. **The license is clear and compatible with display** (see Step 2).
3. **You've actually looked at the image** and it matches what the metadata
   claims.
4. **The citation is honest about what it shows.** Credit line, date, and a link
   back to the NLI catalog page (`https://www.nli.org.il/en/.../<recordid or
   identifier>`) should all come straight from the manifest/search metadata, not
   be invented or embellished.

If a search comes up empty or everything found is irrelevant/restricted, that's a
legitimate outcome — write the entry without an embedded image rather than
stretching a weak match.

## Rate of success, set expectations accordingly

In practice, expect to try several search terms per parasha before landing a
genuinely good, single-item, rights-clear image hit — most searches return either
nothing relevant, multi-hundred-page scanned books with no obvious page to pick,
or NLI's backend 500ing outright. Budget for 5–10 search attempts (with retries)
to land 1–2 solid image-backed entries; it is completely normal and expected for
some entries in the final page to have no image at all.

## Direct-access shortcut (if the calling agent has outbound HTTPS)

If Muse AI (or whatever agent is doing this) can reach the public internet
directly, skip the Supabase relay entirely and call NLI's endpoints the same way
the edge functions do internally:

- **Search:** NLI's Open Library API (what `nli-search` wraps) — JSON-LD response
  with DC-prefixed predicate URIs; each value is `{"@value": "..."}` or
  `{"@id": "..."}`-wrapped. The two edge functions' source (in this Supabase
  project, functions `nli-search` id `ef6a9caf-b958-46b3-bc11-6e045de11990` and
  `nli-image-b64` id `c425f13c-8581-4b84-a6b6-1769339e1c2e`) can be read via
  `mcp__Supabase__get_edge_function` for the exact parsing logic if needed.
- **Manifest:** `GET https://iiif.nli.org.il/IIIFv21/<recordid>/manifest` — plain
  IIIF Presentation API v2 JSON, no auth.
- **Image:** `GET https://iiif.nli.org.il/IIIFv21/<FL-id>/full/max/0/default.jpg`
  — plain JPEG, no auth. Use `max`, not a fixed width (see the sizing gotcha
  above).

All the same rules apply: verify the license in the manifest, actually look at
the image, never guess an identifier, and only cite what you've confirmed.
