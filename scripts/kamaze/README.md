# Kama Ze data

`/kamaze/` is a static app in `public/kamaze/`. Its prices come from the files supermarket chains
publish under the Israeli price-transparency regulations.

- `sources.mjs`: one reader per chain (`stores()`, `files(store)`, `download(file)`). Today only
  Shufersal, whose site needs no login. Add a chain by adding a reader to `SOURCES`.
- `build-data.mjs`: keeps the branches whose city is Ra'anana (CBS code 8700), reads each one's
  full price and promotion file, and writes `meta.json`, `catalog.json`, `promos.json`,
  `history.json`.
- `.github/workflows/kamaze-data.yml` runs it twice a day and force-pushes the result to the
  `kamaze-data` branch. The app loads from there (raw.githubusercontent.com) and falls back to
  the snapshot in `public/kamaze/data/`, so no deploy is needed for fresh prices.

Run locally: `node scripts/kamaze/build-data.mjs --out public/kamaze/data`.

The OCR and barcode libraries in `public/kamaze/vendor/` are copied from the npm packages
`tesseract.js`, `tesseract.js-core`, `@tesseract.js-data/eng` and `zxing-wasm`.
