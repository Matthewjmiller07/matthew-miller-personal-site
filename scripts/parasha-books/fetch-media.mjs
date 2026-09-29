// Downloads every entry in fetch-manifest.json ({ "public/…/file": "https://…" }) that isn't on disk yet.
// Run by .github/workflows/parasha-books-fetch.yml; also works locally where replicate.delivery is reachable.
import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(fs.readFileSync(new URL('./fetch-manifest.json', import.meta.url), 'utf8'));
let ok = 0, skipped = 0, failed = 0;
for (const [dest, url] of Object.entries(manifest)) {
  if (!dest.startsWith('public/parasha-books/')) { console.warn('refusing', dest); failed++; continue; }
  if (fs.existsSync(dest)) { skipped++; continue; }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    ok++;
  } catch (err) {
    console.warn(`failed ${dest}: ${err.message}`);
    failed++;
  }
}
console.log(`fetched ${ok}, already had ${skipped}, failed ${failed}`);
