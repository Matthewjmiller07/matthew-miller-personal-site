// Charts for Reckon, drawn as plain HTML and SVG. Bars are single-hue (they show magnitude);
// the cheapest branch is marked with a label as well as an accent, never by colour alone.
// Every chart has a table view underneath for screen readers and for copying numbers.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (n) => '₪' + (Math.round(n * 100) / 100).toFixed(2);
const EPOCH = Date.UTC(2020, 0, 1);

const table = (t, head, rows) => `<details class="tbl"><summary>${t('tableView')}</summary><div class="tbl-wrap"><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;

/**
 * Horizontal bars, one per branch. rows: [{label, value|null, note, best, map}].
 * ref draws a marker line (what you paid) across the bars.
 */
export function storeBars(rows, t, ref = null, withMap = false) {
  const max = Math.max(...rows.map((r) => r.value || 0), ref?.value || 0) || 1;
  const body = rows.map((r) => {
    if (r.value == null) return `<div class="bar-row off"><div class="bar-label"><span>${esc(r.label)}</span><span class="sub">${t('notSold')}</span></div></div>`;
    const tip = `${r.label}: ${money(r.value)}${r.best ? ' · ' + t('cheapest') : ''}`;
    return `<div class="bar-row ${r.best ? 'best' : ''} ${r.partial ? 'partial' : ''}" data-tip="${esc(tip)}" tabindex="0">
      <div class="bar-label"><span>${esc(r.label)}${r.best ? ` <em class="pill">${t('cheapest')}</em>` : ''}${withMap && r.map ? ` <a class="maplink" href="${esc(r.map)}" target="_blank" rel="noopener">${t('map')}</a>` : ''}</span><b>${money(r.value)}</b></div>
      <div class="bar-track"><div class="bar" style="inline-size:${((r.value / max) * 100).toFixed(1)}%"></div>${ref ? `<i class="ref" style="inset-inline-start:${((ref.value / max) * 100).toFixed(1)}%"></i>` : ''}</div>
      ${r.note ? `<div class="sub note">${r.note}</div>` : ''}</div>`;
  }).join('');
  return `<div class="bars">${body}${ref ? `<div class="legend"><i class="ref-key"></i>${esc(ref.label)} ${money(ref.value)}</div>` : ''}</div>`;
}

export function indexChart(S, t, storeName) {
  const { totals } = S.meta.index;
  const rows = S.meta.stores.map((s, i) => ({ s, total: totals[i] })).filter((r) => r.total != null).sort((a, b) => a.total - b.total);
  const min = rows[0].total;
  const max = rows[rows.length - 1].total;
  const body = rows.map((r) => {
    const idx = (r.total / min) * 100;
    const best = r.total === min;
    return `<div class="bar-row ${best ? 'best' : ''}" data-tip="${esc(`${storeName(r.s, true)}: ${money(r.total)} (${idx.toFixed(1)})`)}" tabindex="0">
      <div class="bar-label"><span>${esc(storeName(r.s))}${best ? ` <em class="pill">${t('cheapest')}</em>` : ''}</span><b dir="ltr">${idx.toFixed(1)}${best ? '' : ` <span class="sub">+${(idx - 100).toFixed(1)}%</span>`}</b></div>
      <div class="bar-track"><div class="bar" style="inline-size:${((r.total / max) * 100).toFixed(1)}%"></div></div></div>`;
  }).join('');
  return `<div class="bars">${body}</div>` + table(t, [t('branch'), t('index'), t('basket')], rows.map((r) => [storeName(r.s, true), ((r.total / min) * 100).toFixed(1), money(r.total)]));
}

export function gapsChart(S, t) {
  const gaps = S.meta.gaps.filter((g) => S.items.has(g.code)).slice(0, 12);
  const max = Math.max(...gaps.map((g) => g.hi));
  const body = gaps.map((g) => {
    const r = S.items.get(g.code);
    const a = (g.lo / max) * 100, b = (g.hi / max) * 100;
    return `<button class="gap-row" data-act="open" data-code="${g.code}" data-tip="${esc(`${r[1]}: ${money(g.lo)} – ${money(g.hi)}`)}">
      <span class="gap-name"><bdi>${esc(r[1])}</bdi></span>
      <span class="gap-track" dir="ltr"><i class="gap-line" style="left:${a.toFixed(1)}%;width:${(b - a).toFixed(1)}%"></i><i class="dot lo" style="left:${a.toFixed(1)}%"></i><i class="dot hi" style="left:${b.toFixed(1)}%"></i></span>
      <span class="gap-val"><b>+${money(g.hi - g.lo)}</b><span class="sub" dir="ltr">${money(g.lo)} → ${money(g.hi)}</span></span></button>`;
  }).join('');
  return `<div class="gaps">${body}</div><div class="legend"><i class="dot lo key"></i>${t('low')} <i class="dot hi key"></i>${t('high')}</div>` +
    table(t, [t('product'), t('low'), t('high'), t('gap')], gaps.map((g) => [S.items.get(g.code)[1], money(g.lo), money(g.hi), `${g.pct}%`]));
}

export function offersChart(S, t, storeName) {
  const n = S.meta.stores.length;
  const all = Array(n).fill(0), club = Array(n).fill(0);
  for (const list of Object.values(S.promos)) {
    const seen = new Set();
    for (const p of list) { if (p[5] && p[5] < S.meta.day) continue; const k = p[0] + ':' + p[3]; if (seen.has(k)) continue; seen.add(k); (p[3] ? club : all)[p[0]]++; }
  }
  const max = Math.max(...all.map((v, i) => v + club[i]), 1);
  if (max === 1) return `<p class="sub">…</p>`;
  const body = S.meta.stores.map((s, i) => `<div class="bar-row" tabindex="0" data-tip="${esc(`${storeName(s, true)}: ${all[i]} ${t('everyone')}, ${club[i]} ${t('clubMembers')}`)}">
      <div class="bar-label"><span>${esc(storeName(s))}</span><b>${(all[i] + club[i]).toLocaleString()}</b></div>
      <div class="bar-track stack"><div class="bar s1" style="inline-size:${((all[i] / max) * 100).toFixed(1)}%"></div><div class="bar s2" style="inline-size:${((club[i] / max) * 100).toFixed(1)}%"></div></div></div>`).join('');
  return `<div class="legend"><i class="key s1"></i>${t('everyone')} <i class="key s2"></i>${t('clubMembers')}</div><div class="bars">${body}</div>` +
    table(t, [t('branch'), t('everyone'), t('clubMembers')], S.meta.stores.map((s, i) => [storeName(s, true), all[i], club[i]]));
}

export function changesChart(S, t) {
  const months = 18;
  const now = new Date(EPOCH + S.meta.day * 86400000);
  const keyOf = (d) => d.getUTCFullYear() * 12 + d.getUTCMonth();
  const last = keyOf(now);
  const counts = Array(months).fill(0);
  let older = 0;
  for (const r of S.arr) {
    if (!r[6]) continue;
    const i = months - 1 - (last - keyOf(new Date(EPOCH + r[6] * 86400000)));
    if (i >= 0 && i < months) counts[i]++; else if (i < 0) older++;
  }
  const max = Math.max(...counts, 1);
  const W = 640, H = 260, padL = 8, padB = 34, padT = 30, bw = (W - padL * 2) / months;
  const label = (i, opts) => new Date(Date.UTC(Math.floor((last - (months - 1 - i)) / 12), (last - (months - 1 - i)) % 12, 1)).toLocaleDateString(S.lang === 'he' ? 'he-IL' : 'en-GB', opts);
  const peak = counts.indexOf(max);
  const bars = counts.map((c, i) => {
    const h = Math.max(c ? 2 : 0, (c / max) * (H - padB - padT));
    const x = padL + i * bw + 1, y = H - padB - h, w = bw - 2;
    const r = Math.min(4, h / 2, w / 2);
    // rounded top corners only: the bar stands on the baseline
    const path = `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
    return `<path class="hbar" d="${path}" tabindex="0" data-tip="${esc(`${label(i, { month: 'long', year: 'numeric' })}: ${c.toLocaleString()} ${t('count')}`)}"/>` +
      (i === peak || i === months - 1 ? `<text class="vlabel" x="${x + w / 2}" y="${y - 8}" text-anchor="middle">${c.toLocaleString()}</text>` : '') +
      (i % 4 === (months - 1) % 4 ? `<text class="xlabel" x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${esc(label(i, { month: 'short', year: '2-digit' }))}</text>` : '');
  }).join('');
  return `<svg class="hist" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('changesTitle'))}" dir="ltr"><line class="axis" x1="${padL}" x2="${W - padL}" y1="${H - padB}" y2="${H - padB}"/>${bars}</svg>` +
    table(t, [t('month'), t('count')], [...counts.map((c, i) => [label(i, { month: 'short', year: 'numeric' }), c]), ['<', older]]);
}

/** Step lines of recorded price changes, one per branch (at most four are labelled). */
export function sparkline(hist, S, t, storeName) {
  const series = Object.entries(hist).map(([si, pts]) => ({ s: S.meta.stores[+si], pts })).filter((x) => x.s && x.pts.length).slice(0, 4);
  if (!series.length) return '';
  const days = series.flatMap((x) => x.pts.map((p) => p[0])), vals = series.flatMap((x) => x.pts.map((p) => p[1]));
  const d0 = Math.min(...days), d1 = Math.max(S.meta.day, ...days), v0 = Math.min(...vals) * 0.97, v1 = Math.max(...vals) * 1.03;
  const W = 640, H = 220, pad = 10, padR = 96;
  const X = (d) => pad + ((d - d0) / Math.max(1, d1 - d0)) * (W - pad - padR), Y = (v) => H - 34 - ((v - v0) / Math.max(0.01, v1 - v0)) * (H - 60);
  const date = (d) => new Date(EPOCH + d * 86400000).toLocaleDateString(S.lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short' });
  const lines = series.map((x, i) => {
    let d = '';
    x.pts.forEach((p, j) => { d += j ? ` H${X(p[0]).toFixed(1)} V${Y(p[1]).toFixed(1)}` : `M${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`; });
    const lastP = x.pts[x.pts.length - 1];
    d += ` H${X(d1).toFixed(1)}`;
    return `<path class="line s${i + 1}" d="${d}"/>` + x.pts.map((p) => `<circle class="pt s${i + 1}" cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="5" tabindex="0" data-tip="${esc(`${storeName(x.s)} · ${date(p[0])}: ${money(p[1])}`)}"/>`).join('') +
      `<text class="vlabel" x="${X(d1) + 6}" y="${Y(lastP[1]) + 4}">${money(lastP[1])}</text>`;
  }).join('');
  return `<div class="legend">${series.map((x, i) => `<i class="key s${i + 1}"></i>${esc(storeName(x.s))}`).join(' ')}</div>
    <svg class="hist" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('history'))}" dir="ltr"><line class="axis" x1="${pad}" x2="${W - padR}" y1="${H - 34}" y2="${H - 34}"/>${lines}
    <text class="xlabel" x="${pad}" y="${H - 6}">${date(d0)}</text><text class="xlabel" x="${W - padR}" y="${H - 6}" text-anchor="end">${date(d1)}</text></svg>` +
    table(t, [t('branch'), t('month'), '₪'], series.flatMap((x) => x.pts.map((p) => [storeName(x.s), date(p[0]), money(p[1])])));
}

let tipEl = null;
/** One floating tooltip for anything carrying data-tip: hover, focus or tap. */
export function wireTips(root) {
  if (root.__tips) return;
  root.__tips = true;
  tipEl ||= document.body.appendChild(Object.assign(document.createElement('div'), { className: 'tip', hidden: true }));
  const show = (el) => {
    tipEl.textContent = el.dataset.tip; tipEl.hidden = false;
    const r = el.getBoundingClientRect(), tw = tipEl.offsetWidth;
    tipEl.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2)) + 'px';
    tipEl.style.top = Math.max(8, r.top - tipEl.offsetHeight - 8) + window.scrollY + 'px';
  };
  const hide = () => (tipEl.hidden = true);
  root.addEventListener('pointerover', (e) => { const el = e.target.closest?.('[data-tip]'); el ? show(el) : hide(); });
  root.addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-tip]'); if (el) show(el); });
  root.addEventListener('focusout', hide);
  root.addEventListener('pointerleave', hide);
  window.addEventListener('scroll', hide, { passive: true });
}
