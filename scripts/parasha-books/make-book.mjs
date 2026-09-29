// Renders each Parasha Book as a print-ready HTML file and a PDF.
//   public/parasha-books/<slug>/book.html  — standalone picture book (open in any browser)
//   public/parasha-books/<slug>/book.pdf   — Letter landscape, one picture page + one text page per spread
//
// Usage: node scripts/parasha-books/make-book.mjs [slug ...]
// PDF needs Playwright (local or global install) with Chromium.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { books } from '../../src/data/parasha-books/books.mjs';
import { defaultCast } from '../../src/data/parasha-books/cast.mjs';
import { bookHtml } from '../../src/data/parasha-books/render.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const verses = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/parasha-books/verses.json'), 'utf8'));

async function toPdf(htmlPath, pdfPath) {
  const require = createRequire(import.meta.url);
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: pdfPath, width: '11in', height: '8.5in', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const wanted = process.argv.slice(2);
  for (const book of books.filter((b) => !wanted.length || wanted.includes(b.slug))) {
    const dir = path.join(ROOT, 'public/parasha-books', book.slug);
    if (!fs.existsSync(path.join(dir, 'cover.jpg'))) {
      console.log(`skip ${book.slug}: no illustrations yet`);
      continue;
    }
    const html = path.join(dir, 'book.html');
    const images = {
      cover: 'cover.jpg',
      sheet: '../cast/sisters-modest.jpg',
      pages: book.pages.map((_, i) => `page-${String(i + 1).padStart(2, '0')}.jpg`),
    };
    fs.writeFileSync(html, bookHtml(book, defaultCast, verses, { images, fontBase: '../..' }));
    await toPdf(html, path.join(dir, 'book.pdf'));
    console.log(`✓ ${book.slug}: book.html + book.pdf`);
  }
}
