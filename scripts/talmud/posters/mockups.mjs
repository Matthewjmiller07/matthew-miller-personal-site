#!/usr/bin/env node
// Printify mockups for the sugya-map posters. Rather than a product per masechet, one existing
// DRAFT product is reused: each poster's art is swapped in, and once Printify has regenerated the
// mockups (their bytes change) they are saved at 2048px as <dir>/<name>/<name>-mockup-<n>.jpg.
// Usage: PRINTIFY_API_KEY=… node scripts/talmud/posters/mockups.mjs --dir <posters dir> --shop <id> --product <id>
//        [--palette illuminated] [--only bekhorot,shas]

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const DIR = opt('dir'), SHOP = opt('shop'), PRODUCT = opt('product'), PAL = opt('palette', 'illuminated');
const ONLY = opt('only') ? new Set(opt('only').split(',')) : null;
const KEY = process.env.PRINTIFY_API_KEY;
if (!DIR || !SHOP || !PRODUCT || !KEY) { console.error('Need --dir, --shop, --product and PRINTIFY_API_KEY'); process.exit(1); }
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (p, init = {}) => {
  const r = await fetch(`https://api.printify.com/v1/${p}`, { ...init, headers: H });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${p}: ${t.slice(0, 200)}`);
  return JSON.parse(t);
};
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const grab = async (src) => Buffer.from(await (await fetch(`${src}${src.includes('?') ? '&' : '?'}s=2048&v=${Date.now()}`)).arrayBuffer());

const names = fs.readdirSync(DIR).filter((n) => fs.existsSync(path.join(DIR, n, `${n}-${PAL}-18x24.png`)) && (!ONLY || ONLY.has(n)));
let product = await api(`shops/${SHOP}/products/${PRODUCT}.json`);
const hashes = async () => Promise.all(product.images.slice(0, 2).map(async (im) => md5(await grab(im.src))));
let last = await hashes();
for (const name of names) {
  const up = await api('uploads/images.json', { method: 'POST', body: JSON.stringify({
    file_name: `${name}-${PAL}-18x24.png`, contents: fs.readFileSync(path.join(DIR, name, `${name}-${PAL}-18x24.png`)).toString('base64') }) });
  const print_areas = product.print_areas.map((a) => ({ variant_ids: a.variant_ids,
    placeholders: a.placeholders.map((ph) => ({ position: ph.position, images: [{ id: up.id, x: 0.5, y: 0.5, scale: 1, angle: 0 }] })) }));
  await api(`shops/${SHOP}/products/${PRODUCT}.json`, { method: 'PUT', body: JSON.stringify({ print_areas }) });
  // Wait until the mockups actually show the new art.
  let ok = false;
  for (let i = 0; i < 24 && !ok; i++) {
    await sleep(5000);
    product = await api(`shops/${SHOP}/products/${PRODUCT}.json`);
    const h = await hashes();   // the flat shot and the room shot must both show the new art
    if (h.every((x, k) => x !== last[k])) { last = h; ok = true; }
  }
  if (!ok) { console.error(`${name}: mockup did not refresh, skipped`); continue; }
  await sleep(3000);   // let the remaining camera angles finish too
  for (const [n, img] of product.images.entries()) fs.writeFileSync(path.join(DIR, name, `${name}-mockup-${n}.jpg`), await grab(img.src));
  console.log(name, `${product.images.length} mockups`);
}
