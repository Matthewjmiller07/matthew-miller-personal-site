// Hineni Lite: the HUD, as plain DOM with the full game's CSS classes. Each region re-renders only
// when its own slice of state changes.
import { G, game, subscribe, rankFor } from './state.js';
import { fire, touch, esc, on } from './engine.js';
import { RAMBAM, HINENI, WHO_SAID, RANKS, SHIURIM, TOKENS } from '../content.js';
import { fetchBoard, postScore } from '../leaderboard.js';
import { levelLink, shiurFor } from '../nav.js';
import { sfx } from '../audio.js';

export const LEVEL_NAMES = Object.fromEntries(SHIURIM.flatMap((sh) => sh.levels.map((l) => [l.id, `Shiur ${sh.shiur} · ${l.name}`])));
const LB_LEVELS = SHIURIM.flatMap((sh) => sh.levels.map((l) => ({ ...l, world: sh.world, shiur: sh.shiur })));
const FULL_URL = '/tefillin-trials';

const hearts = (n, max = 3) => `<span class="tt-hearts">${Array.from({ length: max }, (_, i) => `<span class="${i < n ? 'on' : ''}">♥</span>`).join('')}</span>`;
const stars = (n) => [0, 1, 2].map((i) => `<span class="${i < n ? 'on' : ''}">★</span>`).join('');

function title() {
  return `<div class="tt-title"><div class="tt-title-card">
    <div class="tt-kicker">Hilchot Tefillin · Simanim 25–27 · Lite: plain three.js, loads fast</div>
    <h1 class="tt-logo"><span lang="he" dir="rtl">הִנֵּנִי</span><small>HINENI · The Tefillin Trials</small></h1>
    <p class="tt-rambam" lang="he" dir="rtl">${RAMBAM.he}</p>
    <p class="tt-rambam-en">${RAMBAM.en} <i>(${RAMBAM.ref})</i></p>
    <div class="tt-hinenis">${HINENI.map((h) => `<div class="tt-hineni"><b>${h.who}</b><span lang="he" dir="rtl">${h.line}</span><em>${h.note}</em></div>`).join('')}</div>
    <div class="tt-minhag"><span>You put on tefillin like:</span>
      <button data-act="minhag:ashkenaz" aria-pressed="${G.minhag === 'ashkenaz'}">Ashkenazim · two brachot</button>
      <button data-act="minhag:sefard" aria-pressed="${G.minhag === 'sefard'}">Sefardim · one bracha</button></div>
    <button class="tt-play" data-act="start">Enter the shul ▸</button>
    <div class="tt-shiurim">${SHIURIM.map((sh) => `<div class="tt-shiur">
      <div class="tt-shiur-head"><b>Shiur ${sh.shiur}</b><span lang="he" dir="rtl">${sh.he}</span></div>
      <div class="tt-shiur-title">${sh.title}</div><small>${sh.sub}</small>
      <div class="tt-shiur-levels">${sh.levels.map((l) => `<button data-act="go:${l.id}" style="border-color:${l.color};color:${l.color}">${l.name} ▸</button>`).join('')}</div>
    </div>`).join('')}</div>
    <button class="tt-lb-open" data-act="lb:ward">🏆 Leaderboard</button>
    <p class="tt-controls">WASD / arrows to move · Shift to run · E to talk/act · Space: Do Not Disturb pulse · H to hum · B to bless · 1–3 to choose. Link straight to a shiur with <code>?shiur=5</code> or a level with <code>?level=ward</code>. <a href="${FULL_URL}${location.search}" style="color:var(--gold-hi)">Full 3D version ▸</a></p>
  </div></div>`;
}

function top() {
  const next = RANKS.find(([min]) => min > G.xp)?.[0] ?? G.xp;
  const prev = [...RANKS].reverse().find(([min]) => min <= G.xp)?.[0] ?? 0;
  const pct = next === prev ? 100 : ((G.xp - prev) / (next - prev)) * 100;
  return `<div class="tt-top">
    <div class="tt-rank"><b>${rankFor(G.xp)}</b><div class="tt-xp"><div style="width:${pct}%"></div></div><small>${G.xp} XP · ${G.minhag === 'ashkenaz' ? 'Ashkenazi' : 'Sefardi'}</small></div>
    <div class="tt-sefer" title="Poskim you've talked to">📜 ${G.sayings.length}/${WHO_SAID.length}</div>
    <div class="tt-top-btns">
      ${G.screen !== 'hub' ? '<button data-act="go:hub">⟵ Shul</button>' : ''}
      <button data-act="lb:${LEVEL_NAMES[G.screen] ? G.screen : 'ward'}" aria-label="Leaderboard">🏆</button>
      <button data-act="mute" aria-label="Toggle sound">${G.muted ? '🔇' : '🔊'}</button>
    </div></div>`;
}

function hud() {
  const h = G.hud;
  const obj = h.objective ? `<div class="tt-objective">${h.objective}</div>` : '';
  switch (G.screen) {
    case 'hub': {
      const all = SHIURIM.flatMap((sh) => sh.levels.map((l) => ({ ...l, shiur: sh.shiur })));
      const total = all.reduce((a, l) => a + (G.stars[l.id] || 0), 0);
      return `<div class="tt-objective"><b>The shul</b> · Walk up to the poskim and press E to hear their ruling (${G.sayings.length}/${WHO_SAID.length}). Step into a glowing ring to play: ${all.map((l) => `<span style="color:${l.color}">Shiur ${l.shiur} · ${l.name}</span>`).join(', ')}. ★ ${total}/${all.length * 3}</div>`;
    }
    case 'gauntlet': {
      const cool = h.pulseAt && h.pulseAt > performance.now();
      return `${obj}<div class="tt-stats">${hearts(h.hearts ?? 3)}
        <div class="tt-meter"><span>Hineni</span><div><div style="width:${h.hineni ?? 60}%"></div></div></div>
        <div class="tt-timer">⏱ ${Math.round(h.time || 0)}s</div>
        <div class="tt-pulse ${cool ? 'cool' : ''}">⚡ DND ${cool ? '…' : 'ready'}</div>
        ${h.spoke ? '<div class="tt-flag">you talked: extra brachot</div>' : ''}</div>
        ${h.kaddish ? `<div class="tt-kaddish"><div class="tt-kaddish-title">KADDISH</div><button class="tt-amen" data-act="fire:amen">“AMEN, YEHEI SHEMEI RABBA!” <kbd>Q</kbd></button><div class="tt-kaddish-sub">…or stand still, stay silent and listen with kavana · ${(h.kavana || 0).toFixed(1)}s</div></div>` : ''}
        ${h.ritual ? `<div class="tt-ritual"><div class="tt-ritual-title">The shel rosh. Get the order right.</div><div class="tt-ritual-btns">
          <button class="${h.ritual.shift ? 'done' : ''}" data-act="fire:shift"><kbd>F</kbd>Shift the shel yad + <span lang="he">לְהָנִיחַ</span></button>
          <button class="${h.ritual.mitzvat ? 'done' : ''}" data-act="fire:mitzvat"><kbd>M</kbd><span lang="he">עַל מִצְוַת תְּפִלִּין</span></button>
          <button data-act="fire:action" class="tighten"><kbd>E</kbd>Tighten (tap!)<span class="tt-tight"><span style="width:${h.ritual.tight * 100}%"></span></span></button>
          <button data-act="fire:bless"><kbd>B</kbd><span lang="he">בָּרוּךְ שֵׁם</span></button></div></div>` : ''}`;
    }
    case 'catch':
      return `<div class="tt-objective"><b>Round ${h.round}/${h.rounds}: ${h.title || ''}</b><br>${h.objective || ''}</div>
        <div class="tt-stats">${hearts(h.lives ?? 3)}<div class="tt-timer">${h.dodge ? `Survive ${Math.ceil(h.timeLeft || 0)}s` : `⏱ ${Math.ceil(h.timeLeft || 0)}s`}</div><div class="tt-score">${h.score || 0} pts</div></div>
        ${h.need ? `<div class="tt-slots">${h.need.length === 0 ? '<div class="tt-slot none">No brachot. Dodge!</div>' : ''}${h.need.map((k, i) => `<div class="tt-slot ${i < h.progress ? 'got' : i === h.progress ? 'next' : ''}" style="border-color:${TOKENS[k].color};color:${TOKENS[k].color}"><span lang="he" dir="rtl">${TOKENS[k].he}</span><small>${TOKENS[k].en}</small></div>`).join('')}${h.bonus ? '<div class="tt-slot next bonus"><span lang="he" dir="rtl">בָּרוּךְ שֵׁם</span><small>bonus!</small></div>' : ''}</div>` : ''}`;
    case 'table':
      return `${obj}<div class="tt-stats">${hearts(h.lives ?? 3)}<div class="tt-humok ${h.humOk ? 'ok' : 'no'}">${h.humOk ? '♪ humming OK' : '🤫 no humming'}</div><div class="tt-score">♪ ${h.notes || 0}</div>${h.eatLeft != null ? `<div class="tt-timer">Eat! ${h.eatLeft.toFixed(1)}s</div>` : ''}</div>`;
    case 'stand':
      return `${obj}<div class="tt-stats">${hearts(h.lives ?? 3)}<div class="tt-score">Served ${h.served || 0}/${h.total || 0}</div><div class="tt-score">${h.score || 0} pts</div></div>
        ${h.stage === 'place' || h.stage === 'bless' ? `<div class="tt-ritual tt-arm"><div class="tt-ritual-title">${h.stage === 'place' ? 'Set the bayit on the muscle' : 'Tightening the knot… say the bracha!'}</div><div class="tt-ritual-btns tt-arm-btns">
          <button class="${h.stage === 'bless' ? 'done' : ''}" data-act="fire:action"><kbd>E</kbd>Set it down here</button>
          <button data-act="fire:bless"><kbd>B</kbd><span lang="he">לְהָנִיחַ תְּפִלִּין</span><span class="tt-tight"><span style="width:${(h.tight || 0) * 100}%;${h.tight > 0.7 ? 'background:#ff5a4a' : ''}"></span></span></button></div>
          <div class="tt-arm-legend"><span style="color:#3cc45a">■ everyone</span><span style="color:#a6e35a">■ the Gra only</span><span style="color:#ff4a4a">■ not the mitzvah</span></div></div>` : ''}`;
    case 'check':
      return `${obj}<div class="tt-stats">${hearts(h.lives ?? 3)}<div class="tt-score">Checked ${h.served || 0}/${h.total || 0}</div><div class="tt-score">${h.score || 0} pts</div></div>`;
    case 'ward':
      return `${obj}<div class="tt-stats">${hearts(h.lives ?? 3)}<div class="tt-score">Rounds ${h.served || 0}/${h.total || 0}</div><div class="tt-score">${h.score || 0} pts</div></div>
        ${h.stage === 'knot' ? '<div class="tt-ritual tt-arm"><div class="tt-ritual-title">Tie the yud: its leg toward the heart ♥</div><div class="tt-ritual-btns tt-arm-btns"><button data-act="fire:action"><kbd>E</kbd>Tie it here</button></div></div>' : ''}`;
    default: return '';
  }
}

function reaction() {
  const r = G.reaction;
  if (!r) return '';
  return `<div class="tt-reaction"><div class="tt-reaction-who">${esc(r.who)}</div><div class="tt-reaction-line">${esc(r.line)}</div>
    <div class="tt-reaction-opts">${r.options.map((o, i) => `<button data-act="pick:${i}"><kbd>${i + 1}</kbd>${esc(o.t)}</button>`).join('')}</div></div>`;
}

function results() {
  const r = G.results;
  if (!r || G.screen !== 'results') return '';
  return `<div class="tt-results"><div class="tt-results-card">
    <div class="tt-kicker">${LEVEL_NAMES[r.level]}</div><h2>${esc(r.title)}</h2>
    <div class="tt-bigstars">${stars(r.stars)}</div>
    <div class="tt-results-stats">${r.stats.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
    <div class="tt-xpgain">+${r.xp} XP</div>
    ${r.lessons?.length ? `<div class="tt-lessons"><b>What you learned</b><ul>${r.lessons.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>` : ''}
    <div class="tt-lb-post"><b>🏆 Leaderboard · ${LEVEL_NAMES[r.level]}</b>
      <form data-form="post"><input name="name" value="${esc(G.player)}" maxlength="24" placeholder="Your name" aria-label="Your name for the leaderboard"><button type="submit">Post ${r.xp}</button></form>
      <div class="lt-post-note"></div><div class="lt-board"><div class="tt-lb-note">Loading…</div></div>
      <button class="tt-lb-more" data-act="lb:${r.level}">Full leaderboard ▸</button></div>
    <div class="tt-results-btns"><button data-act="go:${r.level}">↻ Play again</button><button class="primary" data-act="go:hub">Back to the shul ▸</button></div>
  </div></div>`;
}

function board(rows, mark) {
  if (!rows) return '<div class="tt-lb-note">Loading…</div>';
  if (!rows.length) return '<div class="tt-lb-note">No scores yet. Be the first!</div>';
  return `<ol class="tt-lb-list">${rows.map((row, i) => `<li class="${G.player && row.player.toLowerCase() === G.player.toLowerCase() ? 'me' : ''} ${mark === i + 1 ? 'new' : ''}">
    <span class="tt-lb-rank">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="tt-lb-name">${esc(row.player)}</span>
    <span class="tt-lb-stars">${'★'.repeat(row.stars)}<i>${'★'.repeat(3 - row.stars)}</i></span><b>${row.score}</b></li>`).join('')}</ol>`;
}

function leaderboard() {
  const level = G.leaderboard;
  if (!level) return '';
  const sh = shiurFor(level);
  return `<div class="tt-lb" data-act="lbclose"><div class="tt-lb-card" data-stop>
    <button class="tt-lb-x" data-act="lbclose" aria-label="Close">✕</button>
    <div class="tt-kicker">Leaderboard</div><h2>🏆 ${LEVEL_NAMES[level]}</h2>
    ${sh ? `<div class="tt-lb-sub">Shiur ${sh.shiur} · ${sh.sub}</div>` : ''}
    <div class="tt-lb-tabs">${LB_LEVELS.map((l) => `<button data-act="lb:${l.id}" aria-pressed="${l.id === level}" style="--c:${l.color}"><small>S${l.shiur}</small> ${l.name}</button>`).join('')}</div>
    <div class="lt-board"><div class="tt-lb-note">Loading…</div></div>
    <div class="tt-results-btns"><button data-act="copy:${level}">🔗 Copy link to this level</button><button class="primary" data-act="play:${level}">Play it ▸</button></div>
  </div></div>`;
}

function touchControls() {
  if (!matchMedia('(pointer: coarse)').matches || G.reaction || G.screen === 'title' || G.screen === 'results') return '';
  return `<div class="tt-touch"><div class="tt-joy" data-joy><div class="tt-knob"></div></div><div class="tt-touch-btns">
    <button data-touch="action">E</button>
    ${G.screen === 'gauntlet' ? '<button data-touch="pulse">⚡</button>' : ''}
    ${G.screen === 'stand' ? '<button data-touch="bless">B</button>' : ''}
    ${G.screen === 'table' ? '<button data-touch="hum">♪</button>' : ''}</div></div>`;
}

const REGIONS = [
  ['title', () => (G.screen === 'title' ? `title|${G.minhag}` : ''), title],
  ['top', () => (G.screen === 'title' ? '' : `${G.xp}|${G.sayings.length}|${G.muted}|${G.screen}|${G.minhag}`), top],
  ['hud', () => `${G.screen}|${JSON.stringify(G.hud)}|${G.screen === 'hub' ? `${G.sayings.length}|${JSON.stringify(G.stars)}` : ''}`, hud],
  ['results', () => (G.screen === 'results' ? G.results : null), results],
  ['lb', () => G.leaderboard || '', leaderboard],
  ['reaction', () => G.reaction, reaction],
  ['prompt', () => (G.prompt && !G.reaction && G.screen !== 'title' && G.screen !== 'results' ? G.prompt : ''), () => `<button class="tt-prompt" data-act="fire:action">${esc(G.prompt)}</button>`],
  ['toasts', () => G.toasts.map((t) => t.id).join(','), () => `<div class="tt-toasts">${G.toasts.map((t) => `<div class="tt-toast ${t.tone}">${esc(t.text)}</div>`).join('')}</div>`],
  ['touch', () => `${G.screen}|${!!G.reaction}`, touchControls],
];

export function initUI(root) {
  const ui = document.createElement('div');
  ui.className = 'tt-ui';
  root.appendChild(ui);
  const els = {};
  const keysSeen = {};
  for (const [name] of REGIONS) { els[name] = document.createElement('div'); els[name].className = `lt-region lt-${name}`; ui.appendChild(els[name]); }

  const render = () => {
    for (const [name, key, fn] of REGIONS) {
      const k = key();
      if (keysSeen[name] === k) continue;
      keysSeen[name] = k;
      els[name].innerHTML = k === '' || k === null ? '' : fn();
      if (name === 'results' && k) loadBoard(els.results.querySelector('.lt-board'), G.results.level, 5);
      if (name === 'lb' && k) loadBoard(els.lb.querySelector('.lt-board'), G.leaderboard, 25);
      if (name === 'touch') bindJoystick(els.touch);
    }
  };
  subscribe(render);
  render();
  // the gauntlet's DND cooldown changes with time, not state
  setInterval(() => { if (G.screen === 'gauntlet') { keysSeen.hud = null; render(); } }, 400);

  on('pick', (i) => { const o = G.reaction?.options[i]; if (o) G.reaction.onPick(o); });

  ui.addEventListener('click', async (e) => {
    const stop = e.target.closest('[data-stop]');
    const t = e.target.closest('[data-act]');
    if (!t || (stop && !stop.contains(t))) return;
    if (stop && t.dataset.act === 'lbclose' && t.classList.contains('tt-lb')) return;
    const [act, arg] = t.dataset.act.split(':');
    if (act === 'start') { sfx.unlock(); sfx.great(); game.go('hub'); }
    else if (act === 'go') { sfx.unlock(); game.go(arg); }
    else if (act === 'minhag') game.setMinhag(arg);
    else if (act === 'mute') game.toggleMute();
    else if (act === 'fire') fire(arg);
    else if (act === 'pick') { const o = G.reaction?.options[Number(arg)]; if (o) G.reaction.onPick(o); }
    else if (act === 'lb') game.showLeaderboard(arg);
    else if (act === 'lbclose') game.showLeaderboard(null);
    else if (act === 'play') { game.showLeaderboard(null); game.go(arg); }
    else if (act === 'copy') { try { await navigator.clipboard.writeText(levelLink(arg)); t.textContent = '✓ Link copied'; } catch { /* blocked */ } }
  });
  ui.addEventListener('keydown', (e) => { if (e.target.tagName === 'INPUT') e.stopPropagation(); });
  ui.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const btn = form.querySelector('button');
    if (!name || btn.disabled) return;
    btn.disabled = true; btn.textContent = 'Saving…';
    game.setPlayer(name);
    const r = G.results;
    const note = els.results.querySelector('.lt-post-note');
    try {
      const res = await postScore({ player: name, level: r.level, score: r.xp, stars: r.stars, minhag: G.minhag });
      form.remove();
      note.innerHTML = `<div class="tt-lb-note good">Saved${res.rank ? `: you’re #${res.rank}` : ''}!</div>`;
      els.results.querySelector('.lt-board').innerHTML = board(res.scores.slice(0, 5), res.rank);
    } catch (err) {
      btn.disabled = false; btn.textContent = `Post ${r.xp}`;
      note.innerHTML = `<div class="tt-lb-note bad">${esc(err.message)}</div>`;
    }
  });
}

async function loadBoard(el, level, limit) {
  if (!el) return;
  try { el.innerHTML = board(await fetchBoard(level, limit)); } catch (e) { el.innerHTML = `<div class="tt-lb-note bad">${esc(e.message)}</div>${board([])}`; }
}

function bindJoystick(container) {
  const base = container.querySelector('[data-joy]');
  for (const b of container.querySelectorAll('[data-touch]')) {
    const name = b.dataset.touch;
    b.addEventListener('touchstart', (e) => { e.preventDefault(); if (name === 'hum') touch.hum = true; else fire(name); });
    if (name === 'hum') b.addEventListener('touchend', () => { touch.hum = false; });
  }
  if (!base) return;
  const knob = base.querySelector('.tt-knob');
  const move = (e) => {
    const r = base.getBoundingClientRect();
    const t = e.touches[0];
    let x = (t.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    touch.x = x; touch.y = y;
    knob.style.transform = `translate(${x * 40}px, ${y * 40}px)`;
  };
  const stop = () => { touch.x = 0; touch.y = 0; knob.style.transform = ''; };
  base.addEventListener('touchstart', move);
  base.addEventListener('touchmove', move);
  base.addEventListener('touchend', stop);
  base.addEventListener('touchcancel', stop);
}
