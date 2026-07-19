# Graetz Psalms emendations — extraction conventions

Source: H. Graetz, *Kritischer Commentar zu den Psalmen nebst Text und Uebersetzung*,
Breslau: Schottlaender, 1882–83. 2 vols.
Scans: Universitätsbibliothek Frankfurt, Freimann-Sammlung (the user's PDFs are these
same digitizations — "semantics visual library" producer, identical page counts).

- Vol 1 (titleinfo 1898979): Psalms 1–60, commentary on PDF pages 169–398.
  Page-view URL id = 1898981 + pdf_page. Printed page = pdf_page − 16.
- Vol 2 (titleinfo 1899383): Psalms 61–150, commentary on PDF pages 9–326.
  Page-view URL id = 1899385 + pdf_page. Printed page = pdf_page + 376.
- Page-view URL: `https://sammlungen.ub.uni-frankfurt.de/freimann/content/pageview/<id>`
- Psalm → page ranges: `page-map.json` (from Frankfurt METS logical structMap).

## What counts as an entry (emendations.json)

Capture only **textual interventions**, not exegesis:
- `emendation` — consonantal change (usually flagged `leg.`, `l.`, "muss emendirt werden", "statt")
- `vocalization` — repointing only
- `deletion` — Graetz strikes words (dittography, gloss)
- `addition` — Graetz supplies missing words
- `transposition` — word/verse order change
- `verse-division` — redivision of verses/psalm boundaries
- `corruption-noted` — Graetz declares the text corrupt/a fragment but proposes no reading

Skip: pure translation notes, grammar observations, parallels with no proposed change.

## Entry fields

- `psalm`, `verse` — **MT numbering** (Sefaria's), located via the Hebrew lemma, not
  Graetz's verse citation (his numbering sometimes drifts). If his printed label
  differs, record it in `graetz_verse`.
- `mt` — the MT reading he targets (as printed in his lemma, unpointed ok)
- `emendation` — his proposed reading
- `kind` — one of the types above
- `certainty` — `certain` | `tentative` ("vielleicht", "wohl", "möglicherweise")
- `note` — concise English summary of his reasoning incl. witnesses (LXX/Pesch./Targum/…)
  and scholars he cites (Ewald, Dyserinck …)
- `volume`, `pdf_page` — page where the emendation is stated (printed page + URL derived)
- `flag` — optional; set when digits/pointing need the high-res verification pass

## Resume state

Batches `batches/batch-NNN.json` each carry `range.pdf_pages`; the highest range is the
resume point. Extracted so far: vol 1 pdf 169–296 (Pss 1–36:7, batches 001–011).

## Pipeline (changed after batch-011)

Pages pdf 169–296 (vol 1) were extracted by rendering page images via the Read tool
(12/batch) — accurate but token-heavy. From vol 1 pdf 297 onward the pipeline is:

1. `scratchpad/ocr-run.sh` — tesseract `-l deu+heb` at 300 dpi over vol 1 pdf 297–398
   and vol 2 pdf 9–326 → `scratchpad/ocr/v{1,2}_pNNN.txt` (background job; `STATUS`
   file appears when done). German OCR is near-perfect; unpointed Hebrew lemmas mostly
   correct; Greek and pointed-text columns garble (ignored).
2. Extract entries from the OCR text (grep markers: `leg.`, `emendirt`, `statt`,
   `LXX`, `Pesch`, `ergänz`, `streichen`, `corrumpirt`, `dittograph`).
3. Verify each `mt` lemma against Sefaria MT; `emendation` cross-checked against
   Graetz's German translation (which incorporates his emendations).
4. Any Hebrew garbled beyond confident reconstruction → `flag` → final targeted
   image pass (render just those pages/regions at high res), together with the
   flags accumulated from the image-read batches 001–011.
