#!/usr/bin/env node
// Builds the Reckon data set: every product and price at every Ra'anana branch of the chains
// in sources.mjs, read from the price files the chains publish by law.
//
//   node scripts/reckon/build-data.mjs --out <dir> [--prev <dir>]
//
// --prev points at the previous data set (the reckon-data branch); prices that changed since
// then are appended to history.json, so the price-history charts grow by themselves.
//
// Output (all JSON, arrays kept positional so the files stay small):
//   meta.json     stores, counts, the index basket, biggest gaps
//   catalog.json  { stores: [ids], items: [[code, name, maker, size, weighted, [price per store|null], changedDay]] }
//   promos.json   { code: [[storeIdx, qty, totalForQty, clubOnly(0|1), text, endDay]] }
//   history.json  { code: { storeIdx: [[day, price], ...] } }   day = days since 2020-01-01
import fs from 'node:fs';
import path from 'node:path';
import { SOURCES, raananaStores, blocks, field } from './sources.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const OUT = args.out || 'public/reckon/data';
const PREV = args.prev;

const EPOCH = Date.UTC(2020, 0, 1);
const dayOf = (iso) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((t - EPOCH) / 86400000) : 0;
};
const today = dayOf(new Date().toISOString());
const round2 = (n) => Math.round(n * 100) / 100;

// Store formats, so the app can say what kind of shop each branch is.
const FORMATS = {
  'שופרסל דיל': { en: 'Shufersal Deal', kind: 'discount' },
  'שופרסל שלי': { en: 'Shufersal Sheli', kind: 'neighbourhood' },
  'שופרסל אקספרס': { en: 'Shufersal Express', kind: 'convenience' },
  Be: { en: 'Be (pharmacy)', kind: 'pharmacy' },
};

// English for the streets we know, so the app reads naturally for English speakers.
const STREETS_EN = {
  המלאכה: 'HaMelacha', החרושת: 'HaHaroshet', אחוזה: 'Ahuza', האחוזה: 'Ahuza', 'משה דיין': 'Moshe Dayan',
  'רבקה גובר': 'Rivka Guber', 'בר אילן': 'Bar Ilan', ויצמן: 'Weizmann', התעשיה: "HaTa'asiya", הנופר: 'HaNofar',
  'בן גוריון': 'Ben Gurion', ירושלים: 'Yerushalayim', קזן: 'Kazan', אוסטרובסקי: 'Ostrovsky', הסדנא: 'HaSadna',
  זרחין: 'Zarhin', התדהר: 'HaTidhar', 'יגאל אלון': 'Yigal Alon',
};
const addressEn = (address) => {
  const m = address.match(/^(.*?)\s*(\d+)?$/);
  const street = STREETS_EN[m?.[1]?.trim()];
  return street ? `${street}${m[2] ? ' ' + m[2] : ''}` : '';
};

const clean = (s) => s.replace(/\s+/g, ' ').trim();

function sizeLabel(item) {
  const qty = parseFloat(field(item, 'Quantity'));
  const unit = clean(field(item, 'UnitQty') || field(item, 'UnitOfMeasure'));
  if (!qty || !unit || /לא ידוע/.test(unit)) return '';
  if (qty === 1 && /יחיד/.test(unit)) return '';
  return `${round2(qty)} ${unit}`;
}

function parsePrices(xml) {
  const items = new Map();
  for (const it of blocks(xml, 'Item')) {
    const code = field(it, 'ItemCode');
    const price = parseFloat(field(it, 'ItemPrice'));
    if (!code || !(price > 0)) continue;
    items.set(code, {
      name: clean(field(it, 'ItemName', 'ItemNm')),
      maker: clean(field(it, 'ManufactureName', 'ManufacturerName')).replace(/^(לא ידוע|כללי|-)$/, ''),
      size: sizeLabel(it),
      weighted: field(it, 'bIsWeighted') === '1' ? 1 : 0,
      price: round2(price),
      changed: dayOf(field(it, 'PriceUpdateTime', 'PriceUpdateDate')),
    });
  }
  return items;
}

/**
 * Keep the promotions a shopper can act on at the shelf: a sale price, "N for X", or "1+1".
 * Coupons, gifts and store-wide promos covering hundreds of items are left out.
 */
function parsePromos(xml, prices) {
  const out = new Map();
  const now = Date.now();
  for (const p of blocks(xml, 'Promotion')) {
    if (field(p, 'AdditionalIsCoupon') === '1') continue;
    const start = Date.parse(field(p, 'PromotionStartDateTime', 'PromotionStartDate'));
    const end = Date.parse(field(p, 'PromotionEndDateTime', 'PromotionEndDate'));
    if ((start && start > now) || (end && end < now)) continue;
    const text = clean(field(p, 'PromotionDescription'));
    const club = /^0\b/.test(field(p, 'ClubID', 'ClubId')) ? 0 : 1;
    const promoItems = [...blocks(p, 'PromotionItem')];
    if (!promoItems.length || promoItems.length > 150) continue;
    const plus = text.match(/(\d)\s*\+\s*(\d)/); // "1+1", "2+1"
    for (const pi of promoItems) {
      const code = field(pi, 'ItemCode');
      const reg = prices.get(code)?.price;
      if (!reg) continue;
      const reward = field(pi, 'RewardType');
      const minQty = parseFloat(field(pi, 'MinQty')) || 1;
      const dp = parseFloat(field(pi, 'DiscountedPrice'));
      let qty;
      let total;
      if (plus && reward === '0') {
        const buy = +plus[1];
        const free = +plus[2];
        qty = buy + free;
        total = round2(reg * buy);
      } else if ((reward === '1' || reward === '10' || reward === '3') && dp > 0) {
        qty = minQty;
        total = round2(dp);
      } else continue;
      if (!(qty >= 1) || qty > 12 || !Number.isInteger(qty)) continue;
      const unit = total / qty;
      if (unit >= reg - 0.005 || unit < reg * 0.2) continue; // not a saving, or implausible
      const row = [qty, total, club, text, end ? dayOf(new Date(end).toISOString()) : 0];
      const list = out.get(code) || [];
      // one best offer for everyone, one best for club members
      const same = list.findIndex((r) => r[2] === club);
      if (same < 0) list.push(row);
      else if (unit < list[same][1] / list[same][0]) list[same] = row;
      out.set(code, list);
    }
  }
  return out;
}

async function main() {
  const stores = [];
  const perStore = [];
  const problems = [];

  for (const src of SOURCES) {
    let branches = [];
    try {
      branches = raananaStores(await src.stores());
    } catch (err) {
      problems.push(`${src.key}: ${err.message}`);
      continue;
    }
    for (const st of branches) {
      try {
        const files = await src.files(st);
        if (!files.price) throw new Error('no full price file');
        const prices = parsePrices(await src.download(files.price));
        if (prices.size < 200) throw new Error(`only ${prices.size} items`);
        let promos = new Map();
        if (files.promo) {
          try {
            promos = parsePromos(await src.download(files.promo), prices);
          } catch (err) {
            problems.push(`${src.key}/${st.storeId} promos: ${err.message}`);
          }
        }
        const fmt = FORMATS[st.subChainName] || { en: st.subChainName || st.chainName, kind: 'supermarket' };
        const address = clean(st.address.replace(/([^\s\d])(\d)/, '$1 $2').replace(/^רח\./, ''));
        stores.push({
          id: `${src.key}-${st.storeId}`,
          chain: src.key,
          chainName: st.chainName,
          format: st.subChainName || st.chainName,
          formatEn: fmt.en,
          kind: fmt.kind,
          name: clean(st.name),
          address,
          addressEn: addressEn(address),
          city: 'רעננה',
          items: prices.size,
          file: files.price.name,
          fileTime: (files.price.name.match(/-(\d{8})(\d{4})?/) || []).slice(1).filter(Boolean).join(''),
        });
        perStore.push({ prices, promos });
        console.log(`${src.key} ${st.storeId} ${st.name}: ${prices.size} items, ${promos.size} with offers`);
      } catch (err) {
        problems.push(`${src.key}/${st.storeId} ${st.name}: ${err.message}`);
      }
    }
  }
  if (!stores.length) throw new Error(`No stores read. ${problems.join(' | ')}`);

  // Cheapest formats first reads better everywhere in the app.
  const order = stores.map((_, i) => i).sort((a, b) => stores[b].items - stores[a].items);
  const S = order.map((i) => stores[i]);
  const P = order.map((i) => perStore[i]);

  const codes = new Map();
  P.forEach(({ prices }, si) => {
    for (const [code, it] of prices) {
      let row = codes.get(code);
      if (!row) {
        row = { name: it.name, maker: it.maker, size: it.size, weighted: it.weighted, prices: Array(S.length).fill(null), changed: 0 };
        codes.set(code, row);
      }
      if (it.name.length > row.name.length) row.name = it.name;
      if (!row.maker) row.maker = it.maker;
      if (!row.size) row.size = it.size;
      row.prices[si] = it.price;
      row.changed = Math.max(row.changed, it.changed);
    }
  });

  const items = [...codes].map(([code, r]) => [code, r.name, r.maker, r.size, r.weighted, r.prices, r.changed]);
  items.sort((a, b) => a[1].localeCompare(b[1], 'he'));

  const promos = {};
  P.forEach(({ promos: pm }, si) => {
    for (const [code, list] of pm) for (const row of list) (promos[code] ||= []).push([si, ...row]);
  });

  // ---- history: append every price that differs from the previous run ----
  let history = {};
  let prevCatalog = null;
  if (PREV) {
    try {
      history = JSON.parse(fs.readFileSync(path.join(PREV, 'history.json'), 'utf8'));
      prevCatalog = JSON.parse(fs.readFileSync(path.join(PREV, 'catalog.json'), 'utf8'));
    } catch {
      /* first run */
    }
  }
  let changes = 0;
  if (prevCatalog) {
    const prevIdx = new Map(prevCatalog.stores.map((id, i) => [id, i]));
    const prevItems = new Map(prevCatalog.items.map((r) => [r[0], r]));
    const prevDay = prevCatalog.day || today - 1;
    // history is keyed by store index, so re-key if the store order changed
    const remap = prevCatalog.stores.map((id) => S.findIndex((s) => s.id === id));
    if (remap.some((v, i) => v !== i)) {
      const next = {};
      for (const [code, byStore] of Object.entries(history)) {
        for (const [oldIdx, series] of Object.entries(byStore)) {
          const ni = remap[+oldIdx];
          if (ni >= 0) (next[code] ||= {})[ni] = series;
        }
      }
      history = next;
    }
    for (const row of items) {
      const prev = prevItems.get(row[0]);
      if (!prev) continue;
      S.forEach((s, si) => {
        const pi = prevIdx.get(s.id);
        const before = pi == null ? null : prev[5][pi];
        const after = row[5][si];
        if (before == null || after == null || before === after) return;
        const series = ((history[row[0]] ||= {})[si] ||= [[prevDay, before]]);
        if (series[series.length - 1][0] === today) series[series.length - 1][1] = after;
        else series.push([today, after]);
        if (series.length > 120) series.splice(0, series.length - 120);
        changes++;
      });
    }
  }

  // ---- the index basket: everyday items every grocery branch carries ----
  const grocery = S.map((s, i) => (s.kind === 'pharmacy' ? -1 : i)).filter((i) => i >= 0);
  const everywhere = items.filter((r) => !r[4] && grocery.every((i) => r[5][i] != null));
  const indexTotals = S.map((_, si) => (grocery.includes(si) ? round2(everywhere.reduce((sum, r) => sum + r[5][si], 0)) : null));

  const gaps = items
    .map((r) => {
      const ps = r[5].filter((p) => p != null);
      if (ps.length < 4 || r[4]) return null;
      const lo = Math.min(...ps);
      const hi = Math.max(...ps);
      return hi > lo && lo >= 4 ? { code: r[0], lo, hi, pct: Math.round(((hi - lo) / lo) * 100) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct || b.hi - a.hi)
    .slice(0, 40);

  const meta = {
    updated: new Date().toISOString(),
    day: today,
    city: 'רעננה',
    cityEn: "Ra'anana",
    stores: S,
    products: items.length,
    prices: items.reduce((n, r) => n + r[5].filter((p) => p != null).length, 0),
    offers: Object.values(promos).reduce((n, l) => n + l.length, 0),
    changesSinceLastRun: changes,
    index: { items: everywhere.length, totals: indexTotals },
    gaps,
    problems,
    source: 'Price-transparency files published by the chains under Israeli law (תקנות שקיפות מחירים)',
  };

  fs.mkdirSync(OUT, { recursive: true });
  const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data));
  write('meta.json', meta);
  write('catalog.json', { day: today, stores: S.map((s) => s.id), items });
  write('promos.json', promos);
  write('history.json', history);
  for (const f of ['meta', 'catalog', 'promos', 'history']) {
    console.log(`${f}.json ${(fs.statSync(path.join(OUT, `${f}.json`)).size / 1024).toFixed(0)} KB`);
  }
  console.log(`${S.length} stores, ${items.length} products, ${meta.prices} prices, ${meta.offers} offers, ${changes} changes`);
  if (problems.length) console.log('Problems:\n  ' + problems.join('\n  '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
