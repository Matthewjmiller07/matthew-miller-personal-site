# Parasha Books

Peshat-based picture books where the kids explore the weekly parasha. Pages live at
`/parasha-books` (library + "make your own") and `/parasha-books/<slug>` (reader).

## Where things are

| What | Where |
| --- | --- |
| Stories, scenes, trailer scripts (with `{BIG}`/`{MID}`/`{BABY}` tokens) | `src/data/parasha-books/books.mjs` |
| Default cast names | `src/data/parasha-books/cast.mjs` |
| Prompt + story adapters (shared by scripts, API, browser) | `src/data/parasha-books/prompts.mjs` |
| Print book renderer (shared by PDF script + browser download) | `src/data/parasha-books/render.mjs` |
| Pesukim (Hebrew: Tanach with Nikkud, English: Koren) | `src/data/parasha-books/verses.json` ← `fetch-sefaria.mjs` |
| Illustrations, voice, music, trailers, PDFs | `public/parasha-books/<slug>/` |
| Jev peshat check (needs `TYPESAFE_API_KEY`) | `src/pages/api/parasha-books/peshat-check.js` |
| Custom-cast illustration (needs `REPLICATE_API_TOKEN`; optional `PARASHA_BOOKS_CODE`) | `src/pages/api/parasha-books/illustrate.js` |

## Adding a parasha

1. Add a book to `books.mjs` (pages anchored to refs; peshat only; no depictions of Hashem).
2. `node scripts/parasha-books/fetch-sefaria.mjs`
3. `REPLICATE_API_TOKEN=… node scripts/parasha-books/generate.mjs --book <slug>` — FLUX.2 [klein] 9B pages
   (conditioned on `public/parasha-books/cast/sisters-modest.jpg`), MiniMax Speech voiceover, MiniMax Music backtrack.
   Look over every picture; regenerate any with stray extra children or details the pesukim don't support.
4. `python3 scripts/parasha-books/make-trailer.py <slug>` — Ken Burns cut on the voiceover's line breaks,
   captions, title card, music sidechain-ducked under the narrator (needs Pillow + ffmpeg / `imageio-ffmpeg`).
5. `node scripts/parasha-books/make-book.mjs <slug>` — `book.html` + `book.pdf` (needs Playwright + Chromium).
6. Open `/parasha-books/<slug>` and press **Check peshat with Jev**.

## Sandboxed sessions

Where `replicate.delivery` / Sefaria aren't reachable (e.g. a cloud Claude session), add
`{ "public/parasha-books/…": "<replicate url>" }` entries to `fetch-manifest.json` and push to a feature
branch: `.github/workflows/parasha-books-fetch.yml` downloads them (and refreshes `verses.json`) and commits back.

## Uploaded casts ("make your own")

Runs on **GPT Image 2 at `quality: low`** (about a cent an image). FLUX.2 [klein] 4B was tried first and was cheap, but
the child's face drifted from page to page; GPT Image held the likeness on every test page. What testing showed:

- **Character sheet:** two views per child — a big waist-up portrait next to full body — built from a *face close-up*
  (the reader taps the face; the browser crops around it), with age and "what stands out" written into the prompt and
  "realistic proportions for their age". Full-body-only sheets drift into generic chibi faces.
- **Iterating:** "Fix this one" sends the photos plus the current sheet with the reader's notes (an edit); "Try a new one"
  re-draws with a fresh seed. Earlier takes stay selectable.
- **Reader's notes** ("put her in a dress") lead the sheet prompt and override the photo's clothes; both views must
  share one outfit and nothing else from the photo (pets, toys) is kept. Every accepted note travels with the sheet
  into the page prompts ("As approved: …").
- **Pages:** references are the approved sheet + the face photos ("<name> from the character sheet (image 1) … image 2
  is their real photo"), drawn exactly once. (On FLUX 4B the whole two-view sheet made it paint the child twice.) Pages also say: face visible, never from behind, and every other figure (keruvim, grown-ups)
  must look different — otherwise FLUX lends the child's face and headband to the angels.
