# Thanksgiving: Gratitude assets

Everything on `/thanksgiving` and `/sourcesheets/gratitude` comes from `src/data/thanksgiving-gratitude.json`.

- `build_pdf.py`: renders `public/thanksgiving/gratitude-source-sheet.pdf` (Playwright, letter size).
- `hyperframes/film.html`: the 36s 16:9 film. The four 5s clips (`assets/clip0..3.mp4`) were made with
  Higgsfield (Grok Video 1.5 Lite, text-to-video, 720p); `public/thanksgiving/stills/` are frames from them.
- `hyperframes/one-root.html`: the 24s 9:16 short on the root י-ד-ה (pure HTML/CSS/GSAP, no footage).
- `music.py`: synthesizes the score (`python3 music.py assets/score.wav 36`, `score-v.wav 24`).

To re-render: `npx hyperframes init <dir> --example blank`, drop a composition in as `index.html`, put the
clips, score, fonts (Cormorant Garamond, Inter, `public/fonts/NotoSerifHebrew-Variable.ttf`) in `assets/`,
then `npx hyperframes render -o out.mp4 --fps 30`.
The Supabase rows were written from the same JSON.
