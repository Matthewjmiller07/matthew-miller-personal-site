// Fetches Hebrew (with nikkud) + English for every ref in the Parasha Books from Sefaria's v3 API
// and writes src/data/parasha-books/verses.json, keyed by ref. Refs joined with ";" are fetched separately.
import fs from 'node:fs';
import { books } from '../../src/data/parasha-books/books.mjs';

const OUT = new URL('../../src/data/parasha-books/verses.json', import.meta.url);
const HE = 'Tanach with Nikkud';
const EN = 'Tanakh: The Holy Scriptures, published by JPS';

const clean = (s) =>
  String(s)
    .replace(/<sup[^>]*>.*?<\/sup>\s*<i class="footnote">.*?<\/i>/gs, '')
    .replace(/<i class="footnote">.*?<\/i>/gs, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&thinsp;/g, ' ')
    .replace(/\{[פס]\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();

async function get(ref, version) {
  const url = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=${encodeURIComponent(version)}`;
  let res;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(url);
    if (res.ok || res.status < 500) break;
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
  if (!res.ok) throw new Error(`${ref} ${version}: HTTP ${res.status}`);
  const data = await res.json();
  const v = data.versions?.[0];
  if (!v) throw new Error(`${ref} ${version}: no version`);
  return [v.text].flat(Infinity).map(clean);
}

// "Genesis 1:24-31" -> verse numbers [24..31] (single-chapter refs only).
function verseNumbers(ref, n) {
  const m = ref.match(/(\d+):(\d+)/);
  const start = m ? Number(m[2]) : 1;
  return Array.from({ length: n }, (_, i) => `${m ? m[1] : ''}:${start + i}`);
}

const out = {};
for (const book of books) {
  for (const page of book.pages) {
    const parts = [];
    for (const ref of page.ref.split(';').map((r) => r.trim())) {
      const [he, en] = await Promise.all([get(ref, `hebrew|${HE}`), get(ref, `english|${EN}`)]);
      const nums = verseNumbers(ref, he.length);
      parts.push(...he.map((h, i) => ({ v: nums[i], he: h, en: en[i] || '' })));
    }
    out[page.ref] = parts;
    console.log(page.ref, parts.length, 'verses');
  }
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
