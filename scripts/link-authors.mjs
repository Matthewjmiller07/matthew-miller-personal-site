// Link sources to authors by fuzzy-matching sources.author against authors.name
// Run: node scripts/link-authors.mjs
// Options: --dry-run  (show what would change without writing)
//          --force    (re-link even if author_id already set)
// Needs: COFFEE_SUPABASE_SERVICE_KEY in .env

import 'dotenv/config';

const SB_URL = 'https://knbyyykfwwlgnizutqyb.supabase.co/rest/v1';
const SERVICE_KEY = process.env.COFFEE_SUPABASE_SERVICE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

if (!SERVICE_KEY) { console.error('Missing COFFEE_SUPABASE_SERVICE_KEY'); process.exit(1); }

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

// Load all authors once
const authRes = await fetch(`${SB_URL}/authors?select=id,name&order=name.asc`, { headers });
const authors = await authRes.json();

// Load all sources
const srcRes = await fetch(
  `${SB_URL}/sources?select=id,author,author_id&order=author.asc`,
  { headers }
);
const sources = await srcRes.json();

console.log(`Loaded ${authors.length} authors, ${sources.length} sources.`);
if (DRY_RUN) console.log('[DRY RUN — no writes]\n');

function findAuthor(authorText) {
  if (!authorText) return null;
  const clean = authorText.replace(/\(.*?\)/g, '').trim().toLowerCase();
  // Try longest-match first so "Yosef Chaim" beats "Yosef Karo"
  const sorted = [...authors].sort((a, b) => b.name.length - a.name.length);
  for (const a of sorted) {
    const parts = a.name.replace(/\(.*?\)/g, '').trim().toLowerCase().split(/\s+/)
      .filter((w) => w.length > 4 && !/^(rabbi|rav|the|and)$/.test(w));
    if (parts.length === 0) continue;
    // All significant words of the author name must appear in the source author
    if (parts.every((p) => clean.includes(p))) return a;
  }
  // Fallback: last distinctive word
  const words = clean.split(/\s+/).filter((w) => w.length > 4 && !/^(rabbi|rav|the|and)$/.test(w));
  if (!words.length) return null;
  const last = words[words.length - 1];
  return authors.find((a) => a.name.toLowerCase().includes(last)) || null;
}

let linked = 0, skipped = 0, already = 0, unmatched = 0;

for (const source of sources) {
  if (!source.author) { skipped++; continue; }
  if (source.author_id && !FORCE) { already++; continue; }

  const match = findAuthor(source.author);
  if (!match) {
    console.log(`  ✗ no match: "${source.author}"`);
    unmatched++;
    continue;
  }
  if (source.author_id === match.id) { already++; continue; }

  console.log(`  ✓ "${source.author}" → ${match.name}`);
  if (!DRY_RUN) {
    const r = await fetch(`${SB_URL}/sources?id=eq.${source.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ author_id: match.id }),
    });
    if (!r.ok) console.error('    PATCH error:', r.status, await r.text());
    else linked++;
  } else {
    linked++;
  }
}

console.log(`\nDone. Linked: ${linked} | Already set: ${already} | No match: ${unmatched} | No author: ${skipped}`);
