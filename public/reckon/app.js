// Reckon: grocery prices branch by branch, starting with Ra'anana. Everything runs in the browser: the price data is
// a few static JSON files, the list lives in localStorage, and barcode and receipt reading
// happen on the device.
import { STR, DICT, SUGGEST } from '/reckon/i18n.js';
import { indexChart, gapsChart, changesChart, offersChart, storeBars, sparkline, wireTips } from '/reckon/charts.js';

const LIVE = 'https://raw.githubusercontent.com/matthewjmiller07/matthew-miller-personal-site/reckon-data/';
const LOCAL = '/reckon/data/';
const SITE = 'https://theothermatthewmiller.com/reckon/';
const EPOCH = Date.UTC(2020, 0, 1);

const store = {
  // 'kamaze.' was the app's first name; lists saved under it still load.
  get(k, d) { try { const v = localStorage.getItem('reckon.' + k) ?? localStorage.getItem('kamaze.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('reckon.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

export const S = {
  lang: store.get('lang', (navigator.language || 'en').startsWith('he') ? 'he' : 'en'),
  club: store.get('club', false),
  tab: 'search',
  list: store.get('list', []), // [{c: code, q: qty, d: done}]
  shop: false,
  meta: null, items: new Map(), arr: [], promos: {}, history: {}, base: LOCAL,
  query: '', receipt: null, shared: null,
};

export const t = (k, ...a) => { const v = (STR[S.lang] || STR.en)[k] ?? STR.en[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const money = (n) => (n == null ? '' : '₪' + (Math.round(n * 100) / 100).toFixed(2));
const round2 = (n) => Math.round(n * 100) / 100;
const $ = (sel, el = document) => el.querySelector(sel);
const dayToDate = (d) => new Date(EPOCH + d * 86400000);
export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => d.toLocaleDateString(S.lang === 'he' ? 'he-IL' : 'en-GB', opts);

export function storeName(s, long = false) {
  if (S.lang === 'he') return s.name;
  const where = s.addressEn || s.address;
  const fmt = long ? s.formatEn : s.formatEn.replace('Shufersal ', '').replace(' (pharmacy)', '');
  return `${fmt} · ${where}`;
}

// ---------------- data ----------------

async function getJson(url, ms = 20000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

async function loadData() {
  const [live, local] = await Promise.allSettled([getJson(LIVE + 'meta.json', 6000), getJson(LOCAL + 'meta.json')]);
  const pick = live.status === 'fulfilled' && (local.status !== 'fulfilled' || live.value.updated > local.value.updated) ? [LIVE, live.value] : [LOCAL, local.value];
  if (!pick[1]) throw new Error('no data');
  let [base, meta] = pick;
  let catalog;
  try {
    catalog = await getJson(base + 'catalog.json', 45000);
  } catch (err) {
    if (base === LOCAL || local.status !== 'fulfilled') throw err;
    [base, meta] = [LOCAL, local.value];
    catalog = await getJson(base + 'catalog.json', 45000);
  }
  S.base = base; S.meta = meta; S.arr = catalog.items;
  S.items = new Map(catalog.items.map((r) => [r[0], r]));
  for (const r of S.arr) r.n = norm(r[1] + ' ' + r[2]);
  getJson(base + 'promos.json', 45000).then((p) => { S.promos = p; render(); }).catch(() => {});
  getJson(base + 'history.json', 45000).then((h) => { S.history = h; }).catch(() => {});
}

// ---------------- search ----------------

const norm = (s) => s.toLowerCase().replace(/[֑-ׇ]/g, '').replace(/["'`׳״.,()\-/%]/g, ' ').replace(/\s+/g, ' ').trim();
const FINALS = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
const fold = (s) => s.replace(/[ךםןףץ]/g, (c) => FINALS[c]);

/** Turn a query into groups of alternatives: every group must match, any alternative will do. */
function queryGroups(q) {
  let rest = ' ' + norm(q) + ' ';
  const groups = [];
  // longest dictionary phrases first ("olive oil" before "oil")
  for (const phrase of Object.keys(DICT).sort((a, b) => b.length - a.length)) {
    const needle = ' ' + phrase + ' ';
    if (rest.includes(needle)) {
      groups.push([phrase, ...DICT[phrase]].map((w) => fold(norm(w))));
      rest = rest.replace(needle, ' ');
    }
  }
  for (const w of rest.trim().split(' ').filter(Boolean)) groups.push([fold(w)]);
  return groups;
}

export function search(q, limit = 60) {
  const digits = q.replace(/\D/g, '');
  if (digits.length >= 6 && digits.length === q.trim().length) {
    const hit = findCode(digits);
    if (hit) return [hit];
  }
  const groups = queryGroups(q);
  if (!groups.length) return [];
  const out = [];
  for (const r of S.arr) {
    const hay = (r.f ||= fold(r.n));
    let score = 0;
    let ok = true;
    for (const g of groups) {
      let best = -1;
      for (const alt of g) {
        const i = hay.indexOf(alt);
        if (i < 0) continue;
        const wordStart = i === 0 || hay[i - 1] === ' ';
        best = Math.max(best, (i === 0 ? 4 : wordStart ? 2 : 0) + (wordStart && (hay[i + alt.length] === ' ' || i + alt.length === hay.length) ? 2 : 0));
      }
      if (best < 0) { ok = false; break; }
      score += best;
    }
    if (!ok) continue;
    const carried = r[5].reduce((n, p) => n + (p != null), 0);
    out.push([score * 3 + carried - r[1].length / 40, r]);
  }
  out.sort((a, b) => b[0] - a[0]);
  return out.slice(0, limit).map((x) => x[1]);
}

/** Barcodes arrive with or without leading zeros and check digits; find the catalogue's spelling. */
export function findCode(code) {
  const c = String(code).replace(/\D/g, '');
  if (!c) return null;
  const bare = c.replace(/^0+/, '');
  return S.items.get(c) || S.items.get(bare) || S.items.get('0' + c) || (c.length === 12 ? S.items.get('0' + c) : null) || null;
}

// ---------------- pricing ----------------

/** What `qty` of a product costs at store index si, using the best offer the shopper qualifies for. */
export function cost(code, si, qty = 1) {
  const row = S.items.get(code);
  const reg = row?.[5][si];
  if (reg == null) return null;
  let total = reg * qty;
  let promo = null;
  for (const p of S.promos[code] || []) {
    if (p[0] !== si || (p[3] && !S.club) || (p[5] && p[5] < S.meta.day)) continue;
    const n = Math.floor(qty / p[1]);
    if (!n) continue;
    const c = n * p[2] + (qty - n * p[1]) * reg;
    if (c < total - 0.001) { total = c; promo = p; }
  }
  return { total: round2(total), reg, promo };
}

export function basket(lines) {
  const stores = S.meta.stores.map((s, si) => {
    let total = 0;
    const missing = [];
    for (const l of lines) {
      const c = cost(l.c, si, l.q);
      if (c) total += c.total; else missing.push(l.c);
    }
    return { si, s, total: round2(total), missing };
  });
  const ranked = stores.filter((x) => x.missing.length < lines.length).sort((a, b) => a.missing.length - b.missing.length || a.total - b.total);
  const best = ranked[0] || null;
  const peers = best ? ranked.filter((x) => x.missing.length === best.missing.length) : [];
  const worst = peers.length > 1 ? peers[peers.length - 1] : null;

  // Best pair of stores, each item bought wherever it is cheaper.
  let split = null;
  for (let a = 0; a < stores.length; a++) {
    for (let b = a + 1; b < stores.length; b++) {
      let total = 0, miss = 0, na = 0, nb = 0;
      const plan = {};
      for (const l of lines) {
        const ca = cost(l.c, a, l.q), cb = cost(l.c, b, l.q);
        if (!ca && !cb) { miss++; continue; }
        const useA = ca && (!cb || ca.total <= cb.total);
        total += useA ? ca.total : cb.total;
        plan[l.c] = useA ? a : b;
        useA ? na++ : nb++;
      }
      if (!na || !nb) continue;
      if (!split || miss < split.miss || (miss === split.miss && total < split.total)) split = { a, b, total: round2(total), miss, na, nb, plan };
    }
  }
  if (split && best && !(split.miss < best.missing.length || split.total < best.total - 0.99)) split = null;
  return { stores, ranked, best, worst, split };
}

// ---------------- list ----------------

const saveList = () => store.set('list', S.list);
const inList = (code) => S.list.find((l) => l.c === code);
function setQty(code, q) {
  const l = inList(code);
  if (q <= 0) S.list = S.list.filter((x) => x.c !== code);
  else if (l) l.q = q;
  else S.list.push({ c: code, q });
  saveList();
}

function listLink(lines = S.list) {
  return SITE + '#l=' + lines.map((l) => (l.q === 1 ? l.c : `${l.c}x${l.q}`)).join(',');
}

function parseShared() {
  const m = location.hash.match(/l=([\dx.,]+)/);
  if (!m) return null;
  const lines = m[1].split(',').map((p) => { const [c, q] = p.split('x'); return { c, q: Math.max(1, Math.min(99, parseFloat(q) || 1)) }; }).filter((l) => S.items.has(l.c));
  return lines.length ? lines : null;
}

function whatsappText(lines, b) {
  const date = fmtDate(new Date(), { day: 'numeric', month: 'short' });
  const out = [`🛒 *Reckon · ${S.lang === 'he' ? S.meta.city : S.meta.cityEn}* (${date})`, ''];
  const line = (l, si) => {
    const r = S.items.get(l.c);
    const c = si == null ? null : cost(l.c, si, l.q);
    const name = [r[1], r[3]].filter(Boolean).join(' · ');
    return `▫️ ${l.q > 1 ? l.q + '× ' : ''}${name}${c ? ' — ' + money(c.total) + (c.promo ? ' 🏷️' : '') : ''}`;
  };
  if (!b.best) {
    out.push(...lines.map((l) => line(l)));
  } else if (b.split) {
    const { a, b: bb, plan, total } = b.split;
    for (const si of [a, bb]) {
      const mine = lines.filter((l) => plan[l.c] === si);
      out.push(`📍 *${storeName(S.meta.stores[si], true)}*`, ...mine.map((l) => line(l, si)), '');
    }
    out.push(`*${t('total')}: ${money(total)}*`, `(${storeName(b.best.s)}: ${money(b.best.total)})`);
  } else {
    out.push(`📍 *${t('cheapest')}: ${storeName(b.best.s, true)}*`, ...lines.map((l) => line(l, b.best.si)), '', `*${t('total')}: ${money(b.best.total)}*`);
    if (b.best.missing.length) out.push(`(${t('missing', b.best.missing.length)})`);
    if (b.worst && b.worst.total - b.best.total >= 1) out.push(`💰 ${t('save')} ${money(b.worst.total - b.best.total)} ${t('vs')} ${storeName(b.worst.s)}`);
  }
  out.push('', listLink(lines));
  return out.join('\n');
}

// ---------------- views ----------------

const offerText = (p) => {
  const what = p[1] > 1 ? t('forQty', p[1], money(p[2])) : money(p[2]);
  return `${what}${p[3] ? ' · ' + t('clubOnly') : ''}`;
};

function priceSummary(r) {
  const ps = r[5].filter((p) => p != null);
  const lo = Math.min(...ps), hi = Math.max(...ps);
  return { lo, hi, n: ps.length, pct: lo ? Math.round(((hi - lo) / lo) * 100) : 0 };
}

function productRow(r) {
  const { lo, hi, n } = priceSummary(r);
  const has = inList(r[0]);
  const offers = (S.promos[r[0]] || []).some((p) => S.club || !p[3]);
  return `<li class="row" data-act="open" data-code="${r[0]}">
    <div class="row-main"><bdi class="name">${esc(r[1])}</bdi>
      <span class="sub"><bdi>${esc([r[2], r[3]].filter(Boolean).join(' · '))}</bdi>${r[4] ? ` · ${t('perKg')}` : ''} · ${t('stores', n)}${offers ? ` · <span class="tag">${t('offer')}</span>` : ''}</span></div>
    <div class="row-price"><b>${money(lo)}</b>${hi > lo ? `<span class="sub">– ${money(hi)}</span>` : ''}</div>
    <button class="plus ${has ? 'on' : ''}" data-act="toggle" data-code="${r[0]}" aria-label="${has ? t('remove') : t('add')}">${has ? '✓' : '+'}</button>
  </li>`;
}

function viewSearch() {
  const res = S.query.trim() ? search(S.query) : null;
  const m = S.meta;
  return `<section>
    <div class="searchbar"><input id="q" type="search" inputmode="search" autocomplete="off" placeholder="${esc(t('searchPh'))}" value="${esc(S.query)}" aria-label="${t('search')}"><button class="icon-btn" data-act="tab" data-tab="scan" aria-label="${t('scan')}">${ICON.scan}</button></div>
    <div id="results">${resultsHtml(res)}</div>
    ${res ? '' : `<div class="card soft"><p class="sub">${t('updated')} ${fmtDate(new Date(m.updated), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${m.products.toLocaleString()} ${t('products')} · ${m.stores.length} ${t('branches')}</p><p class="sub">${t('coverage')}</p></div>`}
  </section>`;
}

function resultsHtml(res) {
  if (!res) {
    return `<p class="sub pad">${t('popular')}:</p><div class="chips">${SUGGEST.map((w) => `<button class="chip" data-act="suggest" data-q="${esc(w)}">${esc(w)}</button>`).join('')}</div>`;
  }
  if (!res.length) return `<p class="empty">${t('noResults')}</p>`;
  return `<p class="sub pad">${t('results', res.length)}${res.length === 60 ? '+' : ''}</p><ul class="rows">${res.map(productRow).join('')}</ul>`;
}

function viewList() {
  if (!S.list.length) {
    return `<section><h2>${t('listTitle')}</h2><div class="empty-state"><div class="big">🛒</div><h3>${t('emptyList')}</h3><p class="sub">${t('emptyListHint')}</p>
      <button class="btn" data-act="tab" data-tab="search">${t('search')}</button> <button class="btn ghost" data-act="tab" data-tab="scan">${t('scan')}</button></div></section>`;
  }
  const lines = S.list.filter((l) => S.items.has(l.c));
  const b = basket(lines);
  const best = b.best;
  const rows = lines.map((l) => {
    const r = S.items.get(l.c);
    const c = best ? cost(l.c, best.si, l.q) : null;
    return `<li class="row ${l.d ? 'done' : ''}">
      ${S.shop ? `<input type="checkbox" class="tick" data-act="done" data-code="${l.c}" ${l.d ? 'checked' : ''} aria-label="${t('done')}">` : ''}
      <div class="row-main" data-act="open" data-code="${l.c}"><bdi class="name">${esc(r[1])}</bdi><span class="sub"><bdi>${esc([r[2], r[3]].filter(Boolean).join(' · '))}</bdi>${c?.promo ? ` · <span class="tag">${esc(offerText(c.promo))}</span>` : ''}</span></div>
      <div class="row-price"><b>${c ? money(c.total) : '—'}</b>${c ? '' : `<span class="sub">${t('notSold')}</span>`}</div>
      <div class="stepper"><button data-act="dec" data-code="${l.c}" aria-label="-">−</button><span>${l.q}</span><button data-act="inc" data-code="${l.c}" aria-label="+">+</button></div>
    </li>`;
  }).join('');
  const saving = b.worst ? b.worst.total - best.total : 0;
  return `<section>
    <div class="head-row"><h2>${t('listTitle')} <span class="count">${lines.length}</span></h2>
      <label class="switch"><input type="checkbox" data-act="shop" ${S.shop ? 'checked' : ''}><span>${t('shopMode')}</span></label></div>
    ${best ? `<div class="card hero">
      <span class="eyebrow">${t('bestStore')}</span>
      <div class="hero-line"><strong>${esc(storeName(best.s, true))}</strong><b class="hero-num">${money(best.total)}</b></div>
      <p class="sub">${best.missing.length ? t('missing', best.missing.length) : t('allItems')}${saving >= 1 ? ` · ${t('save')} <b>${money(saving)}</b> ${t('vs')} ${esc(storeName(b.worst.s))}` : ''}</p>
      ${b.split ? `<p class="split"><b>${t('split')}:</b> ${t('splitHint', esc(storeName(S.meta.stores[b.split.a])), esc(storeName(S.meta.stores[b.split.b])), money(best.total - b.split.total))} (${money(b.split.total)})</p>` : ''}
    </div>` : ''}
    <div class="actions">
      <button class="btn wa" data-act="wa">${ICON.wa} ${t('whatsapp')}</button>
      <button class="btn ghost" data-act="share">${t('share')}</button>
      <button class="btn ghost" data-act="copy">${t('copy')}</button>
    </div>
    <ul class="rows">${rows}</ul>
    <div class="card"><h3>${t('compare')}</h3>${storeBars(b.stores.map((x) => ({ label: storeName(x.s), value: x.missing.length === lines.length ? null : x.total, note: x.missing.length ? t('missing', x.missing.length) : '', partial: x.missing.length > 0, best: best && x.si === best.si })), t)}</div>
    <label class="switch block"><input type="checkbox" data-act="club" ${S.club ? 'checked' : ''}><span>${t('clubToggle')}<small>${t('clubHint')}</small></span></label>
    <button class="btn danger ghost" data-act="clear">${t('clear')}</button>
  </section>`;
}

function viewScan() {
  return `<section><h2>${t('scanTitle')}</h2><p class="sub">${t('scanHint')}</p>
    <div class="cam" id="cam"><video id="video" playsinline muted></video><div class="reticle"></div>
      <button class="btn cam-btn" data-act="cam" id="camBtn">${ICON.scan} ${t('startCam')}</button></div>
    <p id="scanMsg" class="notice" hidden></p>
    <form class="inline" data-form="code"><input name="code" inputmode="numeric" pattern="[0-9]*" placeholder="${esc(t('enterCode'))}" aria-label="${esc(t('enterCode'))}"><button class="btn">${t('lookup')}</button></form>
    <label class="btn ghost file">${t('scanFromPhoto')}<input type="file" accept="image/*" capture="environment" data-file="barcode" hidden></label>
  </section>`;
}

function viewReceipt() {
  const R = S.receipt;
  if (!R) {
    return `<section><h2>${t('receiptTitle')}</h2><p class="sub">${t('receiptHint')}</p>
      <label class="drop"><div class="big">🧾</div><b>${t('receiptPick')}</b><span class="sub">🔒 ${t('receiptPrivacy')}</span><input type="file" accept="image/*" data-file="receipt" hidden></label></section>`;
  }
  if (R.busy) return `<section><h2>${t('receiptTitle')}</h2><div class="card center"><div class="spinner"></div><p>${esc(R.status)}</p><progress max="1" value="${R.progress || 0}"></progress></div></section>`;
  if (!R.lines.length) {
    return `<section><h2>${t('receiptTitle')}</h2><div class="card"><p>${t('receiptNone')}</p></div><button class="btn" data-act="receiptReset">${t('tryAgain')}</button></section>`;
  }
  const b = basket(R.lines);
  const best = b.best;
  const paid = R.paid;
  const diff = paid && best ? paid - best.total : 0;
  return `<section><h2>${t('receiptTitle')}</h2>
    <div class="card hero"><span class="eyebrow">${t('receiptFound', R.lines.length)}</span>
      ${best ? `<p class="lead">${t('receiptBest', `<strong>${esc(storeName(best.s, true))}</strong>`, `<b class="hero-num sm">${money(best.total)}</b>`)}</p>` : ''}
      ${paid ? `<p class="${diff >= 1 ? 'good' : 'sub'}">${diff >= 1 ? t('receiptSave', `<b>${money(diff)}</b>`) : t('receiptOk')}</p>` : ''}
      <label class="paid"><span>${t('paidEdit')}</span><input type="number" step="0.01" inputmode="decimal" value="${paid ?? ''}" data-input="paid" placeholder="₪"></label>
    </div>
    <div class="card"><h3>${t('compare')}</h3>${storeBars(b.stores.map((x) => ({ label: storeName(x.s), value: x.missing.length === R.lines.length ? null : x.total, note: x.missing.length ? t('missing', x.missing.length) : '', partial: x.missing.length > 0, best: best && x.si === best.si })), t, paid ? { value: paid, label: t('paid') } : null)}</div>
    <ul class="rows">${R.lines.map((l) => { const r = S.items.get(l.c); return `<li class="row" data-act="open" data-code="${l.c}"><div class="row-main"><bdi class="name">${esc(r[1])}</bdi><span class="sub">${[l.q > 1 ? l.q + '×' : '', l.paid ? `${t('paid')} ${money(l.paid)}` : ''].filter(Boolean).join(' · ')}</span></div><div class="row-price"><b>${best && cost(l.c, best.si, l.q) ? money(cost(l.c, best.si, l.q).total) : '—'}</b></div></li>`; }).join('')}</ul>
    ${R.unmatched.length ? `<details class="card"><summary>${t('unmatched')} (${R.unmatched.length})</summary><p class="sub mono">${R.unmatched.map(esc).join(' · ')}</p></details>` : ''}
    <div class="actions"><button class="btn" data-act="receiptAdd">${t('addAll')}</button><button class="btn wa" data-act="receiptWa">${ICON.wa} ${t('whatsapp')}</button><button class="btn ghost" data-act="receiptReset">${t('tryAgain')}</button></div>
  </section>`;
}

function viewInsights() {
  const m = S.meta;
  const tiles = [[m.stores.length, t('branches')], [m.products.toLocaleString(), t('products')], [m.prices.toLocaleString(), t('prices')], [m.offers.toLocaleString(), t('offers')]];
  return `<section class="viz-root"><h2>${t('insightsTitle')}</h2>
    <div class="tiles">${tiles.map(([n, l]) => `<div class="tile"><b>${n}</b><span>${l}</span></div>`).join('')}</div>
    <div class="card"><h3>${t('indexTitle')}</h3><p class="sub">${t('indexSub', m.index.items.toLocaleString())}</p>${indexChart(S, t, storeName)}</div>
    <div class="card"><h3>${t('gapsTitle')}</h3><p class="sub">${t('gapsSub')}</p>${gapsChart(S, t)}</div>
    <div class="card"><h3>${t('offersTitle')}</h3><p class="sub">${t('offersSub')}</p>${offersChart(S, t, storeName)}</div>
    <div class="card"><h3>${t('changesTitle')}</h3><p class="sub">${t('changesSub')}</p>${changesChart(S, t)}</div>
    <p class="sub">${t('source')} ${t('updated')} ${fmtDate(new Date(m.updated), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.</p>
    <p class="sub">${t('coverage')} <a href="/reckon/why/">${t('why')}</a></p>
  </section>`;
}

function productSheet(code) {
  const r = S.items.get(code);
  if (!r) return '';
  const { lo, hi, n, pct } = priceSummary(r);
  const l = inList(code);
  const rows = S.meta.stores.map((s, si) => {
    const c = cost(code, si, 1);
    const offers = (S.promos[code] || []).filter((p) => p[0] === si && (!p[5] || p[5] >= S.meta.day));
    return { label: storeName(s), value: r[5][si], best: hi > lo && r[5][si] === lo, note: offers.map((p) => `🏷️ ${offerText(p)}${p[5] ? ` · ${t('until')} ${fmtDate(dayToDate(p[5]), { day: 'numeric', month: 'short' })}` : ''}`).join('<br>'), map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.chainName} ${s.address} רעננה`)}`, c };
  });
  const hist = S.history[code];
  return `<div class="sheet-head"><div><bdi class="name lg">${esc(r[1])}</bdi><div class="sub"><bdi>${esc([r[2], r[3]].filter(Boolean).join(' · '))}</bdi>${r[4] ? ` · ${t('perKg')}` : ''}</div><div class="sub en-name" id="offName"></div></div>
      <img id="offImg" alt="" hidden><button class="icon-btn" data-act="closeSheet" aria-label="${t('close')}">✕</button></div>
    <p class="${hi > lo ? 'callout' : 'sub'}">${n === 1 ? t('oneStore') : hi > lo ? t('spread', money(lo), money(hi), pct) : t('samePrice')}</p>
    ${storeBars(rows, t, null, true)}
    <div class="actions sticky">${l
      ? `<div class="stepper lg"><button data-act="dec" data-code="${code}">−</button><span>${l.q}</span><button data-act="inc" data-code="${code}">+</button></div><span class="sub">${t('added')}</span>`
      : `<button class="btn" data-act="toggle" data-code="${code}">+ ${t('add')}</button>`}</div>
    <h3>${t('history')}</h3>
    ${hist ? sparkline(hist, S, t, storeName) : `<p class="sub">${t('historyNone')}</p>`}
    <p class="sub">${t('lastChanged')}: ${r[6] ? fmtDate(dayToDate(r[6])) : '—'} · <span class="mono">${esc(code)}</span></p>`;
}

const ICON = {
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  scan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 8v8M12 8v8M16 8v8"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/></svg>',
  insights: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8.2 19z"/><path d="M9 9.500c0 3 2.500 5.500 5.500 5.500"/></svg>',
};

const VIEWS = { search: viewSearch, scan: viewScan, list: viewList, receipt: viewReceipt, insights: viewInsights };

export function render() {
  if (!S.meta) return;
  document.documentElement.lang = S.lang;
  document.documentElement.dir = S.lang === 'he' ? 'rtl' : 'ltr';
  const focusQ = document.activeElement?.id === 'q';
  const pos = focusQ ? document.activeElement.selectionStart : 0;
  $('#tagline').textContent = t('tagline');
  $('#langBtn').textContent = t('lang');
  $('#whyLink').textContent = t('why');
  $('#main').innerHTML = (S.shared ? `<div class="card banner"><b>${t('sharedList')}</b> (${S.shared.length} ${t('items')})<div class="actions"><button class="btn" data-act="sharedUse">${t('sharedUse')}</button><button class="btn ghost" data-act="sharedMerge">${t('sharedMerge')}</button><button class="btn ghost" data-act="sharedDismiss">${t('dismiss')}</button></div></div>` : '') + VIEWS[S.tab]();
  $('#nav').innerHTML = ['search', 'scan', 'list', 'receipt', 'insights'].map((k) => `<button data-act="tab" data-tab="${k}" class="${S.tab === k ? 'on' : ''}" ${S.tab === k ? 'aria-current="page"' : ''}>${ICON[k]}<span>${t(k)}</span>${k === 'list' && S.list.length ? `<i class="badge">${S.list.length}</i>` : ''}</button>`).join('');
  if (focusQ) { const q = $('#q'); q?.focus(); q?.setSelectionRange(pos, pos); }
  const sheet = $('#sheet');
  if (sheet.open && sheet.dataset.code) $('#sheetBody').innerHTML = productSheet(sheet.dataset.code);
  wireTips(document);
}

function openProduct(code) {
  const sheet = $('#sheet');
  sheet.dataset.code = code;
  $('#sheetBody').innerHTML = productSheet(code);
  if (!sheet.open) sheet.showModal();
  wireTips(sheet);
  // Photo and English name from Open Food Facts, when it knows the product. Purely a nicety.
  if (navigator.onLine && /^\d{8,13}$/.test(code)) {
    fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name_en,image_small_url`, { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json()).then((j) => {
        if (sheet.dataset.code !== code || !j.product) return;
        const img = $('#offImg'), en = $('#offName');
        if (j.product.image_small_url && img) { img.src = j.product.image_small_url; img.hidden = false; }
        if (j.product.product_name_en && en && S.lang === 'en') en.textContent = j.product.product_name_en;
      }).catch(() => {});
  }
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2600);
}

function setTab(tab) {
  if (S.tab === 'scan' && tab !== 'scan') stopCamera();
  S.tab = tab; render(); window.scrollTo(0, 0);
}

// ---------------- barcode scanning ----------------

let stream = null, scanTimer = null, zxingReady = null;
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.append(s); });
}

async function zxing() {
  zxingReady ||= loadScript('/reckon/vendor/zxing-reader.js').then(() => {
    window.ZXingWASM.prepareZXingModule({ overrides: { locateFile: (p) => '/reckon/vendor/' + p }, fireImmediately: true });
    return window.ZXingWASM;
  });
  return zxingReady;
}

/** Read barcodes from a video frame, image or canvas. Native detector when the browser has one. */
export async function detectBarcodes(source) {
  if ('BarcodeDetector' in window) {
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      const det = new window.BarcodeDetector({ formats: FORMATS.filter((f) => supported.includes(f)) });
      const found = await det.detect(source);
      if (found.length) return found.map((f) => f.rawValue);
      if (source instanceof HTMLVideoElement) return [];
    } catch { /* fall through to the wasm reader */ }
  }
  const w = source.videoWidth || source.naturalWidth || source.width, h = source.videoHeight || source.naturalHeight || source.height;
  if (!w || !h) return [];
  const scale = Math.min(1, 1600 / Math.max(w, h));
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, cv.width, cv.height);
  const z = await zxing();
  const res = await z.readBarcodes(ctx.getImageData(0, 0, cv.width, cv.height), { formats: ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'Code128'], tryHarder: true, maxNumberOfSymbols: 4 });
  return res.filter((r) => r.isValid !== false).map((r) => r.text);
}

function handleCode(raw, quiet = false) {
  const code = String(raw).replace(/\D/g, '');
  const hit = findCode(code);
  if (hit) { navigator.vibrate?.(60); stopCamera(); openProduct(hit[0]); return true; }
  if (!quiet) { const m = $('#scanMsg'); if (m) { m.textContent = t('unknownCode', code); m.hidden = false; } }
  return false;
}

async function startCamera() {
  const msg = $('#scanMsg'); msg.hidden = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (err) {
    msg.textContent = err?.name === 'NotFoundError' || !navigator.mediaDevices ? t('camNone') : t('camDenied'); msg.hidden = false; return;
  }
  const video = $('#video');
  video.srcObject = stream; await video.play();
  $('#cam').classList.add('live'); $('#camBtn').innerHTML = t('stopCam');
  if (!('BarcodeDetector' in window)) zxing();
  let busy = false, lastMiss = '';
  scanTimer = setInterval(async () => {
    if (busy || video.readyState < 2) return;
    busy = true;
    try {
      for (const code of await detectBarcodes(video)) {
        if (handleCode(code, code === lastMiss)) break;
        lastMiss = code;
      }
    } catch { /* keep scanning */ }
    busy = false;
  }, 220);
}

function stopCamera() {
  clearInterval(scanTimer); scanTimer = null;
  stream?.getTracks().forEach((tr) => tr.stop()); stream = null;
  const cam = $('#cam'); if (cam) { cam.classList.remove('live'); $('#camBtn').innerHTML = `${ICON.scan} ${t('startCam')}`; }
}

function fileToImage(file) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(file); });
}

// ---------------- receipt reading ----------------

let ocrWorker = null;
async function ocr(canvas, onProgress) {
  if (!window.Tesseract) await loadScript('/reckon/vendor/tesseract.min.js');
  ocrWorker ||= await window.Tesseract.createWorker('eng', 1, {
    workerPath: '/reckon/vendor/worker.min.js', corePath: '/reckon/vendor/tesseract-core-simd-lstm.wasm.js', langPath: '/reckon/vendor', gzip: true,
    logger: (m) => m.status === 'recognizing text' && onProgress?.(m.progress),
  });
  await ocrWorker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
  return (await ocrWorker.recognize(canvas)).data.text;
}

/** Scale up small photos, grey them and stretch the contrast: thermal paper is faint. */
function prepImage(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const scale = Math.min(2400 / w, 5000 / h, Math.max(1, 1500 / w));
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  const d = ctx.getImageData(0, 0, cv.width, cv.height), px = d.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) { const g = (px[i] * 77 + px[i + 1] * 150 + px[i + 2] * 29) >> 8; px[i] = g; hist[g]++; }
  const total = px.length / 4; let lo = 0, hi = 255, acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > total * 0.02) { lo = i; break; } }
  acc = 0; for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > total * 0.3) { hi = i; break; } }
  const span = Math.max(40, hi - lo);
  for (let i = 0; i < px.length; i += 4) { const v = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / span)); px[i] = px[i + 1] = px[i + 2] = v; }
  ctx.putImageData(d, 0, 0);
  return cv;
}

/** Pull product lines out of receipt text: any number that is a barcode we sell, plus the price beside it. */
export function parseReceipt(text) {
  const lines = [], unmatched = [], seen = new Map();
  const rows = text.split(/\n+/);
  let maxAmount = 0;
  rows.forEach((row, i) => {
    const flat = row.replace(/[oO]/g, '0').replace(/[lI|]/g, '1').replace(/(\d),(\d{2})\b/g, '$1.$2');
    const amounts = [...flat.matchAll(/(?<![\d.])(\d{1,4}\.\d{2})(?!\d)/g)].map((m) => parseFloat(m[1]));
    for (const a of amounts) if (a > maxAmount && a < 20000) maxAmount = a;
    for (const m of flat.replace(/(\d) (?=\d{3,})/g, '$1').matchAll(/(?<!\d)(\d{7,14})(?!\d)/g)) {
      const hit = findCode(m[1]);
      if (!hit) { if (m[1].length >= 12) unmatched.push(m[1]); continue; }
      let q = 1;
      const next = (rows[i + 1] || '') + ' ' + row;
      const mult = next.match(/(\d{1,2})\s*[xX×*]\s*\d+[.,]\d{2}/) || next.match(/\d+[.,]\d{2}\s*[xX×*]\s*(\d{1,2})\b/);
      if (mult) q = Math.min(99, Math.max(1, parseInt(mult[1], 10)));
      const paid = amounts.filter((a) => a < 2000).pop() || null;
      if (seen.has(hit[0])) { seen.get(hit[0]).q += q; continue; }
      const line = { c: hit[0], q, paid };
      seen.set(hit[0], line); lines.push(line);
    }
  });
  const sum = lines.reduce((s, l) => s + (l.paid || 0), 0);
  const paid = maxAmount >= sum * 0.5 && maxAmount > 0 ? maxAmount : sum ? round2(sum) : null;
  return { lines, unmatched: [...new Set(unmatched)].slice(0, 20), paid };
}

async function readReceipt(file) {
  S.receipt = { busy: true, status: t('loadingOcr'), progress: 0, lines: [], unmatched: [] };
  render();
  try {
    const img = await fileToImage(file);
    const cv = prepImage(img);
    const text = await ocr(cv, (p) => { S.receipt.status = t('reading'); S.receipt.progress = p; const pr = $('progress'); if (pr) pr.value = p; });
    const parsed = parseReceipt(text);
    // Barcode symbols printed on the receipt (some chains print one per item) count too.
    try { for (const c of await detectBarcodes(img)) { const hit = findCode(c); if (hit && !parsed.lines.some((l) => l.c === hit[0])) parsed.lines.push({ c: hit[0], q: 1, paid: null }); } } catch { /* optional */ }
    S.receipt = { busy: false, ...parsed, text };
  } catch (err) {
    console.error(err);
    S.receipt = { busy: false, lines: [], unmatched: [], paid: null };
  }
  render();
}

// ---------------- events ----------------

async function shareText(text) {
  if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* cancelled */ return; } }
  await copyText(text);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  toast(t('copied'));
}
const openWhatsApp = (text) => window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');

const ACTIONS = {
  tab: (el) => setTab(el.dataset.tab),
  open: (el) => openProduct(el.dataset.code),
  closeSheet: () => $('#sheet').close(),
  toggle: (el) => { const c = el.dataset.code; setQty(c, inList(c) ? 0 : 1); render(); },
  inc: (el) => { setQty(el.dataset.code, (inList(el.dataset.code)?.q || 0) + 1); render(); },
  dec: (el) => { setQty(el.dataset.code, (inList(el.dataset.code)?.q || 0) - 1); render(); },
  done: (el) => { const l = inList(el.dataset.code); if (l) { l.d = el.checked; saveList(); render(); } },
  shop: (el) => { S.shop = el.checked; render(); },
  club: (el) => { S.club = el.checked; store.set('club', S.club); render(); },
  suggest: (el) => { S.query = el.dataset.q; render(); },
  clear: () => { if (confirm(t('clearConfirm'))) { S.list = []; saveList(); render(); } },
  wa: () => { const lines = S.list.filter((l) => S.items.has(l.c)); openWhatsApp(whatsappText(lines, basket(lines))); },
  share: () => { const lines = S.list.filter((l) => S.items.has(l.c)); shareText(whatsappText(lines, basket(lines))); },
  copy: () => { const lines = S.list.filter((l) => S.items.has(l.c)); copyText(whatsappText(lines, basket(lines))); },
  cam: () => (stream ? stopCamera() : startCamera()),
  lang: () => { S.lang = S.lang === 'he' ? 'en' : 'he'; store.set('lang', S.lang); render(); },
  receiptReset: () => { S.receipt = null; render(); },
  receiptAdd: () => { for (const l of S.receipt.lines) setQty(l.c, (inList(l.c)?.q || 0) + l.q); setTab('list'); },
  receiptWa: () => openWhatsApp(whatsappText(S.receipt.lines, basket(S.receipt.lines))),
  sharedUse: () => { S.list = S.shared; S.shared = null; saveList(); history.replaceState(null, '', location.pathname); setTab('list'); },
  sharedMerge: () => { for (const l of S.shared) setQty(l.c, (inList(l.c)?.q || 0) + l.q); S.shared = null; history.replaceState(null, '', location.pathname); setTab('list'); },
  sharedDismiss: () => { S.shared = null; history.replaceState(null, '', location.pathname); render(); },
  install: async () => { if (installEvt) { installEvt.prompt(); installEvt = null; $('#installBtn').hidden = true; } else toast(t('installIos')); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.matches('input[type=checkbox]')) return;
  if (el.dataset.act === 'open' && e.target.closest('button,[data-act]:not([data-act=open])')) return;
  ACTIONS[el.dataset.act]?.(el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.matches('input[type=checkbox][data-act]')) ACTIONS[el.dataset.act]?.(el);
  if (el.dataset.file === 'receipt' && el.files[0]) readReceipt(el.files[0]);
  if (el.dataset.file === 'barcode' && el.files[0]) {
    fileToImage(el.files[0]).then(detectBarcodes).then((codes) => {
      if (!codes.some((c) => handleCode(c))) { const m = $('#scanMsg'); if (!codes.length) { m.textContent = t('noResults'); m.hidden = false; } }
    });
  }
  if (el.dataset.input === 'paid') { S.receipt.paid = parseFloat(el.value) || null; render(); }
});
let searchTimer;
document.addEventListener('input', (e) => {
  if (e.target.id !== 'q') return;
  S.query = e.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { $('#results').innerHTML = resultsHtml(S.query.trim() ? search(S.query) : null); }, 90);
});
document.addEventListener('submit', (e) => {
  if (e.target.dataset.form !== 'code') return;
  e.preventDefault();
  handleCode(new FormData(e.target).get('code'));
});
$('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') e.target.close(); });

let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; const b = $('#installBtn'); b.hidden = false; b.textContent = t('install'); });
const setOnline = () => { const o = $('#offline'); o.hidden = navigator.onLine; o.textContent = t('offline'); };
window.addEventListener('online', setOnline); window.addEventListener('offline', setOnline);

async function boot() {
  $('#main').innerHTML = `<div class="card center"><div class="spinner"></div><p>${t('loading')}</p></div>`;
  try {
    await loadData();
  } catch (err) {
    console.error(err);
    $('#main').innerHTML = `<div class="card center"><p>${t('loadFail')}</p><button class="btn" onclick="location.reload()">↻</button></div>`;
    return;
  }
  S.shared = parseShared();
  const want = new URLSearchParams(location.search).get('tab');
  if (VIEWS[want]) S.tab = want;
  const isIos = /iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone;
  if (isIos) { const b = $('#installBtn'); b.hidden = false; b.textContent = t('install'); }
  setOnline();
  render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('/reckon/sw.js', { scope: '/reckon/' }).catch(() => {});
}

window.reckon = { S, search, basket, parseReceipt, detectBarcodes, findCode, whatsappText, readReceipt, cost };
boot();
