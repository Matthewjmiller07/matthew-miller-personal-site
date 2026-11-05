#!/usr/bin/env node
// Pull the Eleanor von Weisl headband catalog (a Wix store) into
// public/data/headbands/evw.json and the product photos into public/headbands/evw/,
// for the try-on test page at /headband-try-on.
//
//   node scripts/headbands/fetch-evw.mjs            # all products
//   node scripts/headbands/fetch-evw.mjs --limit 5
//
// Wix product pages carry og:title / og:image / product:price:amount meta tags, so we
// read those rather than the store's private API.
import fs from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = 'https://www.eleanorvonweisl.com';
const LIST_PAGES = ['/category/all-products', '/shop', '/'];
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT_JSON = path.join(ROOT, 'public/data/headbands/evw.json');
const OUT_IMG = path.join(ROOT, 'public/headbands/evw');
const UA = 'Mozilla/5.0 (headband try-on catalog fetch)';

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

async function get(url, as = 'text') {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function meta(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i');
  const m = html.match(re) || html.match(re2);
  return m ? decode(m[1]) : null;
}

// Wix serves resized variants like .../media/abc~mv2.jpg/v1/fill/w_400,h_400/...; ask for the original.
function fullSize(src) {
  const m = src.match(/https:\/\/static\.wixstatic\.com\/media\/[^/?"]+/);
  return m ? m[0] : src;
}

function slugify(s) {
  return s.toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const links = new Set();
  for (const p of LIST_PAGES) {
    try {
      const html = await get(ORIGIN + p);
      for (const m of html.matchAll(/(?:https:\/\/www\.eleanorvonweisl\.com)?(\/product-page\/[a-z0-9\-%]+)/gi)) links.add(ORIGIN + m[1]);
    } catch (e) {
      console.warn('skip', p, e.message);
    }
    if (links.size) break;
  }
  if (!links.size) throw new Error('No /product-page/ links found — has the store layout changed?');
  console.log(`found ${links.size} products`);

  await fs.mkdir(OUT_IMG, { recursive: true });
  const products = [];
  for (const url of [...links].slice(0, LIMIT)) {
    try {
      const html = await get(url);
      const name = (meta(html, 'og:title') || url.split('/').pop()).replace(/\s*\|.*$/, '').trim();
      const amount = meta(html, 'product:price:amount');
      const currency = meta(html, 'product:price:currency') || 'ILS';
      const img = meta(html, 'og:image');
      const availability = meta(html, 'product:availability');
      if (!img) { console.warn('no image', url); continue; }
      const slug = slugify(name);
      const src = fullSize(img);
      const ext = (src.match(/\.(jpe?g|png|webp)/i) || ['', 'jpg'])[1].toLowerCase().replace('jpeg', 'jpg');
      const file = `${slug}.${ext}`;
      await fs.writeFile(path.join(OUT_IMG, file), await get(src, 'buffer'));
      products.push({
        slug, name, url,
        price: amount ? Number(amount) : null, currency,
        inStock: availability ? !/out/i.test(availability) : null,
        image: `/headbands/evw/${file}`,
      });
      console.log('✓', name);
    } catch (e) {
      console.warn('✗', url, e.message);
    }
  }

  const prev = JSON.parse(await fs.readFile(OUT_JSON, 'utf8').catch(() => '{}'));
  // Keep any hand-tuned placement or cutout settings from an earlier run.
  const tuned = Object.fromEntries((prev.products || []).map((p) => [p.slug, p]));
  for (const p of products) {
    const t = tuned[p.slug];
    if (t) for (const k of ['cutout', 'fit', 'crop']) if (t[k] !== undefined) p[k] = t[k];
  }
  await fs.writeFile(OUT_JSON, JSON.stringify({
    brand: 'Eleanor von Weisl',
    source: ORIGIN + LIST_PAGES[0],
    fetched: new Date().toISOString(),
    products,
  }, null, 2) + '\n');
  console.log(`wrote ${products.length} products → ${path.relative(ROOT, OUT_JSON)}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
