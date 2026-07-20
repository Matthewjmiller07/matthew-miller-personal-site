#!/usr/bin/env node
// Merge scripts/data/graetz/batches/*.json into src/data/graetz-emendations.json
// Run after adding a batch: node scripts/build-graetz.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'scripts/data/graetz');
const meta = JSON.parse(readFileSync(join(srcDir, 'meta.json'), 'utf8'));

const entries = [];
const batchFiles = readdirSync(join(srcDir, 'batches')).filter(f => /^batch-\d+\.json$/.test(f)).sort();
let maxPage = { volume: 0, pdf_page: 0 };
for (const f of batchFiles) {
  const batch = JSON.parse(readFileSync(join(srcDir, 'batches', f), 'utf8'));
  const [, hi] = batch.range.pdf_pages;
  if (batch.range.volume > maxPage.volume || (batch.range.volume === maxPage.volume && hi > maxPage.pdf_page)) {
    maxPage = { volume: batch.range.volume, pdf_page: hi };
  }
  for (const e of batch.entries) entries.push({ ...e, batch: f.replace('.json', '') });
}

entries.sort((a, b) => a.psalm - b.psalm || a.verse - b.verse || a.pdf_page - b.pdf_page);

for (const e of entries) {
  const vol = meta.volumes[String(e.volume)];
  e.printed_page = e.pdf_page + vol.printed_page_offset;
  e.scan_url = meta.pageview_base + (vol.pageview_id_offset + e.pdf_page);
}

const psalms = [...new Set(entries.map(e => e.psalm))];
const out = {
  source: meta.source,
  scan: meta.scan,
  generated: new Date().toISOString().slice(0, 10),
  progress: {
    batches: batchFiles.length,
    entries: entries.length,
    psalms_covered: psalms.length,
    last_psalm: Math.max(...psalms),
    extracted_through: maxPage,
  },
  entries,
};

const json = JSON.stringify(out, null, 1);
writeFileSync(join(root, 'src/data/graetz-emendations.json'), json);
writeFileSync(join(root, 'public/data/graetz-emendations.json'), json); // fetched by /mega-bible
console.log(`${entries.length} entries, Pss ${Math.min(...psalms)}-${Math.max(...psalms)}, through vol ${maxPage.volume} pdf ${maxPage.pdf_page}`);
