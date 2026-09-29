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
