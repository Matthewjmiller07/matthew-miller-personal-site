// Standalone, print-ready HTML for a Parasha Book (Letter landscape: a picture page + a text page per spread).
// Pure — used by scripts/parasha-books/make-book.mjs (HTML + PDF) and the in-browser maker (download).
import { castStory } from './books.mjs';
import { castNames } from './cast.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const listNames = (names) => (names.length < 3 ? names.join(' & ') : `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`);

// images: { cover, sheet, pages: [..] } URLs; fonts: base URL of the fonts folders.
// story(text) lets the caller adapt the story text (defaults to plain name fill).
export function bookHtml(book, cast, verses, { images, fontBase = '..', story } = {}) {
  const names = castNames(cast);
  const tell = story || ((t) => castStory(t, cast));
  const spreads = book.pages
    .map((p, i) => {
            const vs = verses[p.ref] || [];
      // Long passages get smaller type; very long ones move to their own page.
      const size = vs.reduce((n, v) => n + v.he.length + v.en.length, 0);
      const own = size > 1900;
      const torah = `
    <div class="torah${!own && size > 1100 ? ' dense' : ''}">
      <div class="label">From the Torah · ${esc(p.ref.replace(/Genesis /g, 'Bereshit '))}</div>
      ${vs
        .map(
          (v) => `<div class="v"><div class="he" dir="rtl" lang="he"><sup>${esc(v.v.split(':')[1])}</sup> ${esc(v.he)}</div><div class="en"><sup>${esc(v.v)}</sup> ${esc(v.en)}</div></div>`,
        )
        .join('')}
    </div>`;
      return `
  <section class="page picture">
    <img src="${images.pages[i]}" alt="${esc(p.title)}">
    <div class="banner"><span class="num">${i + 1}</span>${esc(p.title)}</div>
  </section>
  <section class="page text">
    <header><span class="ref">${esc(p.ref.replace(/Genesis /g, 'Bereshit '))}</span><h2>${esc(p.title)}</h2></header>
    <p class="story">${esc(tell(p.story))}</p>
    <div class="look"><b>Look closely:</b> ${esc(p.question)}<div class="answer">${esc(p.answer)}</div></div>
    ${own ? '' : torah}
    <footer>${esc(book.parasha)} · ${i + 1}</footer>
  </section>${own ? `
  <section class="page text torah-page">${torah}
    <footer>${esc(book.parasha)} · ${i + 1}</footer>
  </section>` : ''}`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(book.parasha)} — ${esc(book.title)}</title>
<style>
@font-face { font-family: 'Crimson'; src: url('${fontBase}/parasha-books/fonts/CrimsonPro-Regular.ttf'); }
@font-face { font-family: 'Crimson'; font-style: italic; src: url('${fontBase}/parasha-books/fonts/CrimsonPro-Italic.ttf'); }
@font-face { font-family: 'Crimson'; font-weight: 700; src: url('${fontBase}/parasha-books/fonts/CrimsonPro-Bold.ttf'); }
@font-face { font-family: 'Shoulders'; font-weight: 700; src: url('${fontBase}/parasha-books/fonts/BigShoulders-Bold.ttf'); }
@font-face { font-family: 'NotoHeb'; src: url('${fontBase}/fonts/NotoSerifHebrew-Regular.ttf'); }
@font-face { font-family: 'NotoHeb'; font-weight: 700; src: url('${fontBase}/fonts/NotoSerifHebrew-Bold.ttf'); }
@page { size: 11in 8.5in; margin: 0; }
:root { --ink: #2b2118; --paper: #fbf5ea; --accent: ${book.color}; --muted: #7a6a58; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #d9cfbf; color: var(--ink); font-family: 'Crimson', Georgia, serif; }
.page { width: 11in; height: 8.5in; margin: 0.4in auto; background: var(--paper); position: relative; overflow: hidden;
  box-shadow: 0 6px 30px rgba(0,0,0,.18); break-after: page; page-break-after: always; }
.picture img, .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.banner { position: absolute; left: 0.5in; bottom: 0.45in; background: rgba(251,245,234,.93); padding: .14in .3in .14in .16in;
  border-radius: 999px; font-family: 'Shoulders', sans-serif; font-size: 26pt; letter-spacing: .02em; display: flex; align-items: center; gap: .16in; }
.banner .num { background: var(--accent); color: #fff; width: .52in; height: .52in; border-radius: 50%; display: grid; place-items: center; font-size: 20pt; }
.text { padding: .6in .8in .5in; display: flex; flex-direction: column; gap: .16in; }
.text header .ref { font-family: 'Shoulders', sans-serif; color: var(--accent); letter-spacing: .08em; text-transform: uppercase; font-size: 12pt; }
.text h2 { font-family: 'Shoulders', sans-serif; font-size: 34pt; margin: .02in 0 0; line-height: 1; }
.story { font-size: 16.5pt; line-height: 1.42; margin: 0; }
.look { border-left: 4px solid var(--accent); padding: .06in .18in; font-size: 13pt; background: rgba(0,0,0,.03); }
.look .answer { font-style: italic; color: var(--muted); font-size: 11pt; margin-top: .04in; }
.torah { margin-top: auto; border-top: 1px solid rgba(0,0,0,.15); padding-top: .1in; display: grid; gap: .05in; }
.torah .label { font-family: 'Shoulders', sans-serif; font-size: 10pt; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
.torah .v { display: grid; grid-template-columns: 1fr 1fr; gap: .25in; align-items: start; }
.torah .he { font-family: 'NotoHeb', serif; font-size: 11.5pt; line-height: 1.55; text-align: right; }
.torah .en { font-size: 9.5pt; line-height: 1.35; color: #4a3d30; }
.torah sup { color: var(--accent); font-size: 7pt; }
.torah.dense .he { font-size: 10pt; line-height: 1.45; }
.torah.dense .en { font-size: 8.5pt; line-height: 1.28; }
.torah-page .torah { margin-top: 0; border-top: 0; }
.torah-page .torah .he { font-size: 12.5pt; }
.torah-page .torah .en { font-size: 10.5pt; }
.text footer { position: absolute; bottom: .25in; right: .8in; font-size: 9pt; color: var(--muted); }
.cover .title { position: absolute; inset: auto 0 0 0; padding: .9in .7in .55in; color: #fff8ec;
  background: linear-gradient(to top, rgba(20,12,4,.85), rgba(20,12,4,.45) 65%, transparent); }
.cover .he { font-family: 'NotoHeb', serif; font-weight: 700; font-size: 36pt; color: var(--accent); }
.cover h1 { font-family: 'Shoulders', sans-serif; font-size: 60pt; margin: 0; line-height: .95; letter-spacing: .01em; }
.cover .sub { font-size: 20pt; font-style: italic; margin-top: .08in; }
.cover .kicker { font-family: 'Shoulders', sans-serif; letter-spacing: .14em; text-transform: uppercase; font-size: 13pt; opacity: .85; }
.intro { padding: .7in .9in; display: grid; grid-template-rows: auto 1fr auto; gap: .2in; }
.intro h2 { font-family: 'Shoulders', sans-serif; font-size: 36pt; margin: 0; }
.intro img { width: 100%; height: 100%; object-fit: contain; min-height: 0; }
.intro p { font-size: 14pt; line-height: 1.4; margin: 0; }
.end { display: grid; place-items: center; text-align: center; padding: 1in; }
.end h2 { font-family: 'Shoulders', sans-serif; font-size: 54pt; margin: 0; }
.end p { font-size: 16pt; max-width: 7in; line-height: 1.45; }
.end .credits { font-size: 10pt; color: var(--muted); }
@media screen and (max-width: 11.5in) {
  .page { width: 100%; height: auto; aspect-ratio: 11 / 8.5; margin: 12px 0; }
  .text, .intro, .end { aspect-ratio: auto; min-height: 60vw; }
}
@media print { html, body { background: none; } .page { margin: 0; box-shadow: none; } }
</style>
</head>
<body>
  <section class="page cover">
    <img src="${images.cover}" alt="">
    <div class="title">
      <div class="kicker">A Parasha Book · Parashat ${esc(book.parasha)}</div>
      <div class="he" dir="rtl" lang="he">${esc(book.hebrew)}</div>
      <h1>${esc(book.title)}</h1>
      <div class="sub">starring ${esc(listNames(names))}</div>
    </div>
  </section>
  <section class="page intro">
    <h2>Meet the explorers</h2>
    <img src="${images.sheet}" alt="${esc(listNames(names))}">
    <p><b>${esc(listNames(names))}</b> are about to climb into Parashat ${esc(book.parasha)} (${esc(book.range)}).
    Everything they see on these pages comes straight from the pesukim — the plain meaning, the <i>peshat</i>.
    Each picture page is followed by the words of the Torah it comes from, in Hebrew and English, and a question to look for in the text.</p>
  </section>
  ${spreads}
  <section class="page end">
    <div>
      <h2>The End</h2>
      <p>${esc(book.tagline)} Read it again this Shabbat — and see how much more you can find in the pesukim.</p>
      <p class="credits">Pesukim from Sefaria (Tanach with Nikkud · The Koren Jerusalem Bible). Illustrations made with FLUX.2 [klein]. Peshat fidelity checked with Jev.</p>
    </div>
  </section>
</body>
</html>
`;
}

