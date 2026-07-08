// Loads the JSON caches produced by scripts/import-bible-translations.mjs
// into the Supabase public.bible_translations table via PostgREST bulk upsert.
// Run: node scripts/load-bible-translations.mjs
// Needs: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env
//   (requires a temporary INSERT policy on bible_translations for the anon role)

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
const CACHE_DIR = path.join(process.cwd(), 'scripts', 'data', 'bible-translations');
const BATCH_SIZE = 2000;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const CODES = ['wyc', 'cov', 'bis', 'gnv', 'kjv1611'];

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertBatch(rows) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bible_translations?on_conflict=translation,book,chapter,verse`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upsert failed: ${res.status} ${text.slice(0, 500)}`);
  }
}

async function main() {
  for (const code of CODES) {
    const file = path.join(CACHE_DIR, `${code}.json`);
    const data = JSON.parse(await readFile(file, 'utf-8'));

    const rows = [];
    for (const b of data.books) {
      for (const c of b.chapters) {
        for (const v of c.verses) {
          rows.push({ translation: code, book: b.book, chapter: c.chapter, verse: v.verse, text: v.text });
        }
      }
    }

    console.log(`${code}: ${rows.length} rows to load`);
    const batches = chunk(rows, BATCH_SIZE);
    for (let i = 0; i < batches.length; i++) {
      await upsertBatch(batches[i]);
      console.log(`  batch ${i + 1}/${batches.length} loaded`);
    }
    console.log(`${code}: done`);
  }

  console.log('\nAll translations loaded.');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
