import { SOUNDS, DECODER, BEGED, WORDS, LEVELS, RANKS, PLACES } from './data.js';
import { analyze, sustain, vowel, onsetFriction, trill, place, DEFAULT_CORNERS } from './dsp.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const he = (s) => `<span class="he" lang="he" dir="rtl">${s}</span>`;
const ipa = (s) => `<span class="ipa">[${s}]</span>`;
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- saved progress
const KEY = 'teimani.v1';
let save = { best: {}, stars: {}, corners: null, mic: null };
try { save = { ...save, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* private mode */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* ignore */ } };
const totalXp = () => Object.values(save.best).reduce((a, b) => a + b, 0);
const rankOf = (xp) => [...RANKS].reverse().find((r) => xp >= r.xp);

// ---------------------------------------------------------------- sound out
let ac;
const AC = () => (ac ||= new (window.AudioContext || window.webkitAudioContext)());
const clips = {};

function tone(freq, t0, dur, type = 'sine', vol = 0.12) {
  const c = AC(), o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + t0);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t0 + dur);
  o.connect(g).connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.02);
}
const sfx = {
  ok: () => { tone(660, 0, 0.12); tone(990, 0.09, 0.18); },
  bad: () => { tone(180, 0, 0.22, 'sawtooth', 0.07); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, 'triangle')),
  tick: () => tone(880, 0, 0.04, 'sine', 0.05),
};

// A vowel is a buzz shaped by three resonances. Synthesizing it lets the reference match the map exactly.
function playVowel(f) {
  const c = AC(), t = c.currentTime, o = c.createOscillator(), out = c.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(128, t); o.frequency.linearRampToValueAtTime(112, t + 0.7);
  const bws = [70, 90, 130], gains = [1, 0.55, 0.22];
  f.forEach((fc, k) => {
    const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fc; b.Q.value = fc / bws[k];
    const g = c.createGain(); g.gain.value = gains[k];
    o.connect(b).connect(g).connect(out);
  });
  out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(0.5, t + 0.05);
  out.gain.setValueAtTime(0.5, t + 0.55); out.gain.linearRampToValueAtTime(0, t + 0.7);
  out.connect(c.destination); o.start(t); o.stop(t + 0.75);
}

function play(id) {
  const s = SOUNDS[id];
  if (!s) return;
  if (s.vowel) return playVowel(s.f);
  const a = (clips[id] ||= new Audio(`audio/${s.clip}.mp3`));
  a.currentTime = 0; a.play().catch(() => {});
}

// ---------------------------------------------------------------- microphone
const Mic = {
  on: false, sr: 48000, chunks: [], total: 0, floor: 0.003, stream: null,
  async start() {
    if (this.on) return true;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-mic');
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const c = AC(); await c.resume();
    this.sr = c.sampleRate;
    const src = c.createMediaStreamSource(this.stream), mute = c.createGain();
    mute.gain.value = 0; mute.connect(c.destination);
    const push = (d) => { this.chunks.push(d); this.total += d.length; while (this.chunks.length > 1 && this.total - this.base() > this.sr * 12) this.chunks.shift(); };
    try {
      await c.audioWorklet.addModule('recorder-worklet.js');
      const node = new AudioWorkletNode(c, 'teimani-recorder');
      node.port.onmessage = (e) => push(e.data);
      src.connect(node).connect(mute);
    } catch {
      const sp = c.createScriptProcessor(2048, 1, 1);
      sp.onaudioprocess = (e) => push(e.inputBuffer.getChannelData(0).slice());
      src.connect(sp).connect(mute);
    }
    this.on = true; save.mic = 'on'; persist();
    await sleep(450);
    this.floor = Math.min(0.02, Math.max(0.0015, rms(this.last(0.3))));
    return true;
  },
  base() { return this.total - this.chunks.reduce((a, c) => a + c.length, 0); },
  mark() { return this.total; },
  since(mark) {
    const from = Math.max(mark, this.base()), out = new Float32Array(this.total - from);
    let pos = this.base(), o = 0;
    for (const c of this.chunks) {
      if (pos + c.length > from) { const s = Math.max(0, from - pos); out.set(c.subarray(s), o); o += c.length - s; }
      pos += c.length;
    }
    return out;
  },
  last(sec) { return this.since(this.total - Math.round(sec * this.sr)); },
};
const rms = (x) => { let e = 0; for (let i = 0; i < x.length; i++) e += x[i] * x[i]; return Math.sqrt(e / Math.max(1, x.length)); };
function playSamples(x, sr) {
  const c = AC(), b = c.createBuffer(1, x.length, sr); b.copyToChannel(x, 0);
  const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start();
}

// ---------------------------------------------------------------- widgets used in lessons
const sndBtn = (id, extra = '') => `<button class="snd ${extra}" data-play="${id}" aria-label="Hear ${SOUNDS[id].ipa}">${ipa(SOUNDS[id].ipa)}</button>`;

function begedTable() {
  return `<table class="grid beged"><tr><th></th><th>with dot<br><small>pop</small></th><th>no dot<br><small>hiss</small></th></tr>
  ${BEGED.map((b) => `<tr><th>${he(b.he)}<small>${b.name}</small></th>
    <td>${he(b.he + 'ּ')} ${sndBtn(b.hard)}<small>${SOUNDS[b.hard].like}</small></td>
    <td>${he(b.he)} ${sndBtn(b.soft)}<small>${SOUNDS[b.soft].like}</small></td></tr>`).join('')}</table>`;
}

const STATIONS = {
  lips: { x: 47, y: 121, sounds: ['b', 'v', 'p', 'f'] },
  teeth: { x: 72, y: 117, sounds: ['d', 'dh', 't', 'th'] },
  ridge: { x: 92, y: 97, sounds: ['j'] },
  back: { x: 198, y: 99, sounds: ['k', 'kh', 'g', 'gh'] },
  throat: { x: 236, y: 160, sounds: ['hh', 'ayin'] },
};
function mouthSVG(pick = false) {
  const dots = Object.entries(STATIONS).map(([k, s]) => `<g class="station ${k}" data-station="${k}" tabindex="0" role="button" aria-label="${PLACES[k]}">
      <circle cx="${s.x}" cy="${s.y}" r="13" class="halo"/><circle cx="${s.x}" cy="${s.y}" r="6.5" class="dot"/></g>`).join('');
  return `<div class="mouth ${pick ? 'pick' : ''}">
  <svg viewBox="0 0 300 230" role="img" aria-label="Side view of the mouth">
    <path class="head" d="M150,8 C70,8 38,52 36,92 L18,112 Q16,118 30,119 L36,119 Q30,126 37,131 Q32,138 40,142 L44,160 Q50,186 96,188 L128,190 L134,230 L276,230 L276,70 C262,28 214,8 150,8 Z"/>
    <path class="cavity" d="M44,118 L62,116 Q70,112 76,106 Q86,90 110,80 Q150,66 186,76 Q212,84 218,104 Q222,118 226,128 L250,128 L250,226 L214,226 L212,178 Q150,196 96,178 Q60,170 50,140 Q44,130 44,118 Z"/>
    <path class="tongue" d="M66,138 Q84,118 120,112 Q170,104 204,120 Q224,134 224,170 L222,226 L214,226 L210,182 Q150,198 98,180 Q64,168 66,138 Z"/>
    <path class="tooth" d="M62,104 L70,104 L68,119 L63,119 Z"/><path class="tooth" d="M60,128 L67,128 L68,142 L61,142 Z"/>
    <path class="lip" d="M36,104 Q46,106 50,116 L40,119 Z"/><path class="lip" d="M38,127 Q48,128 50,138 L42,142 Z"/>
    ${pick ? '' : '<path class="link" d="M92,97 Q140,40 198,99"/><text x="145" y="52" class="lbl warn" text-anchor="middle">one letter, two places</text>'}
    ${dots}
    <text x="14" y="216" class="lbl">← front of the mouth</text>
  </svg>
  <div class="mouth-out">${pick ? '' : 'Tap a spot to see which sounds are made there.'}</div></div>`;
}

// Mouth-map coordinates: tongue forward on the left, jaw closed at the top.
const vxy = (open, front) => {
  const o = Math.max(-0.15, Math.min(1.15, open)), f = Math.max(-0.2, Math.min(1.2, front));
  return [72 + 55 * o + (1 - f) * (200 - 55 * o), 56 + 138 * o];
};
const VSIGN = { aw: 'ָ', a: 'ַ ֶ', e: 'ֵ', oe: 'ֹ', i: 'ִ', u: 'ֻ' };
function vmapSVG(target) {
  const corners = [vxy(0, 1), vxy(0, 0), vxy(1, 0), vxy(1, 1)].map((p) => p.join(',')).join(' ');
  const nodes = ['i', 'e', 'a', 'aw', 'oe', 'u'].map((id) => {
    const [x, y] = vxy(...SOUNDS[id].at);
    return `<g class="vnode ${id === target ? 'target' : ''}" data-play="${id}" tabindex="0" role="button" aria-label="Hear ${SOUNDS[id].ipa}">
      ${id === target ? `<circle cx="${x}" cy="${y}" r="30" class="ring"/>` : ''}
      <circle cx="${x}" cy="${y}" r="17"/><text x="${x}" y="${y + 6}" text-anchor="middle" class="vipa">${SOUNDS[id].ipa}</text>
      <text x="${x}" y="${y - 22}" text-anchor="middle" class="vhe">ב${VSIGN[id].split(' ')[0]}</text></g>`;
  }).join('');
  return `<div class="vmap"><svg viewBox="0 0 310 232">
    <polygon points="${corners}" class="quad"/>
    <text x="56" y="13" class="lbl">← tongue forward</text><text x="290" y="13" class="lbl" text-anchor="end">tongue back →</text>
    <text class="lbl" transform="translate(14,96) rotate(-90)" text-anchor="middle">jaw closed ↑</text><text class="lbl" transform="translate(14,180) rotate(-90)" text-anchor="middle">↓ jaw open</text>
    ${nodes}<circle id="vdot" r="9" cx="-30" cy="-30"/></svg></div>`;
}

const wordList = () => `<div class="words">${WORDS.map((w) => `<div class="word"><b>${he(w.he)}</b>${ipa(w.ipa)}<small>${w.say} · ${w.en}</small></div>`).join('')}</div>`;

function hydrate(root) {
  $$('[data-widget]', root).forEach((el) => {
    const w = el.dataset.widget;
    el.innerHTML = w === 'beged' ? begedTable() : w === 'mouth' ? mouthSVG() : w === 'vmap' ? vmapSVG() : w === 'words' ? wordList() : '';
  });
}

document.addEventListener('click', (e) => {
  const p = e.target.closest('[data-play]');
  if (p && !p.closest('.opt')) { play(p.dataset.play); p.classList.remove('pulse'); void p.offsetWidth; p.classList.add('pulse'); }
  const st = e.target.closest('.mouth:not(.pick) [data-station]');
  if (st) {
    const k = st.dataset.station, m = st.closest('.mouth');
    $$('.station', m).forEach((s) => s.classList.toggle('sel', s === st));
    $('.mouth-out', m).innerHTML = `<b>${PLACES[k]}:</b> ${STATIONS[k].sounds.map((s) => sndBtn(s)).join(' ')}${k === 'ridge' ? ' <span class="warn">the Sana’a גּ, far from its partner [ɣ]</span>' : ''}`;
  }
});
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g[tabindex]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });

// ---------------------------------------------------------------- screens
function home() {
  stopLoops();
  const xp = totalXp(), rank = rankOf(xp), next = RANKS.find((r) => r.xp > xp);
  const pct = next ? Math.round(100 * (xp - rank.xp) / (next.xp - rank.xp)) : 100;
  app.innerHTML = `
  <header class="hero">
    <div class="band"></div>
    <p class="kicker">A pronunciation game</p>
    <h1>Teimani <span>${he('תֵּימָנִי')}</span></h1>
    <p class="sub">Learn to read Hebrew the way the Jews of Yemen do. Five levels, your own voice, and a microphone that checks your work.</p>
    <div class="rank"><div><b>${rank.name}</b> ${he(rank.he)}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <small>${xp} XP${next ? ` · ${next.xp - xp} to ${next.name}` : ' · top rank'}</small></div>
  </header>
  <main class="path">
    ${LEVELS.map((l) => `<button class="lvl ${l.color}" data-level="${l.id}">
      <span class="num">${l.n}</span>
      <span class="body"><b>${l.title}</b><span class="lhe">${he(l.he)}</span><small>${l.blurb}</small></span>
      <span class="stars" aria-label="${save.stars[l.id] || 0} of 3 stars">${[1, 2, 3].map((i) => `<i class="${(save.stars[l.id] || 0) >= i ? 'on' : ''}">★</i>`).join('')}</span>
    </button>`).join('')}
    <button class="lvl lab" data-lab><span class="num">♪</span><span class="body"><b>Sound Lab</b><small>Every sound on one board, and the live vowel map. No score.</small></span></button>
  </main>
  <footer class="foot">
    <p>The microphone is analysed on your device. Nothing is recorded or uploaded. Chrome or Safari, on a phone or laptop.</p>
    <p>This teaches the Sana’a reading and notes where Sharab differs. The robot clips are sketches: for the real thing, sit with a Yemenite reader. <a href="/projects">More projects</a></p>
  </footer>`;
  $$('[data-level]').forEach((b) => (b.onclick = () => lesson(LEVELS.find((l) => l.id === b.dataset.level), 0)));
  $('[data-lab]').onclick = lab;
  window.scrollTo(0, 0);
}

const topbar = (title, right = '') => `<div class="top"><button class="x" data-home aria-label="Back to levels">✕</button><div class="ttl">${title}</div><div class="right">${right}</div></div>`;
const bindHome = () => $$('[data-home]').forEach((b) => (b.onclick = home));

function lesson(level, i) {
  stopLoops();
  const card = level.lesson[i], last = i === level.lesson.length - 1;
  app.innerHTML = `${topbar(`Level ${level.n} · ${level.title}`, `<span class="dots">${level.lesson.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>`)}
  <main class="card ${level.color}"><h2>${card.h}</h2>${card.html}</main>
  <div class="actions">
    ${i ? '<button class="btn ghost" data-prev>Back</button>' : '<span></span>'}
    <button class="btn" data-next>${last ? 'Start the challenges' : 'Next'}</button>
  </div>
  <button class="skip" data-skip>${last ? '' : 'Skip to the challenges'}</button>`;
  hydrate(app); bindHome();
  $('[data-next]').onclick = () => (last ? startRun(level) : lesson(level, i + 1));
  if (i) $('[data-prev]').onclick = () => lesson(level, i - 1);
  $('[data-skip]').onclick = () => startRun(level);
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- a run through one level
let run = null, loops = [];
const stopLoops = () => { loops.forEach(clearInterval); loops = []; };

function startRun(level) { run = { level, i: 0, hearts: 3, score: 0, streak: 0, right: 0, n: level.challenges.length }; challenge(); }

function challenge() {
  stopLoops();
  const { level, i } = run, ch = level.challenges[i];
  app.innerHTML = `${topbar(`<div class="prog"><i style="width:${100 * i / run.n}%"></i></div>`,
    `<span class="hearts" aria-label="${run.hearts} lives">${'♥'.repeat(run.hearts)}<s>${'♥'.repeat(3 - run.hearts)}</s></span>`)}
  <div class="hud"><span>${run.score} XP</span>${run.streak > 1 ? `<span class="streak">${run.streak} in a row</span>` : ''}</div>
  <main class="stage ${level.color}" id="stage"></main><div id="fb"></div>`;
  bindHome();
  RENDER[ch.type]($('#stage'), ch);
  window.scrollTo(0, 0);
}

// result: true | false | 'skip'. Mic passes are worth more; skips cost nothing.
function finish(result, ch, extra = {}) {
  stopLoops();
  const good = result === true;
  let gained = 0;
  if (good) { run.streak++; run.right++; gained = extra.xp ?? 10 + Math.min(run.streak, 5); run.score += gained; sfx.ok(); }
  else if (result === false) { run.streak = 0; run.hearts--; sfx.bad(); }
  $$('#stage button').forEach((b) => (b.disabled = true));
  const why = extra.why ?? ch.why ?? '';
  $('#fb').innerHTML = `<div class="fb ${good ? 'good' : result === 'skip' ? 'skipd' : 'bad'}">
    <div><b>${good ? pick(['Yes.', 'Right.', 'Exactly.', 'That’s it.']) + ` +${gained} XP` : result === 'skip' ? 'Skipped.' : 'Not quite.'}</b><p>${why}</p></div>
    <button class="btn" id="go">Continue</button></div>`;
  $('.hud').firstElementChild.textContent = `${run.score} XP`;
  $('#go').focus();
  $('#go').onclick = () => {
    if (run.hearts <= 0) return fail();
    run.i++;
    run.i >= run.n ? results() : challenge();
  };
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function fail() {
  app.innerHTML = `${topbar('')}<main class="card end"><div class="bigemoji">📜</div><h2>Out of lives</h2>
    <p>The Mori taps the page and says: again, from the top. You got ${run.right} right.</p>
    <div class="actions"><button class="btn ghost" data-lesson>Reread the lesson</button><button class="btn" data-retry>Try again</button></div></main>`;
  bindHome();
  $('[data-retry]').onclick = () => startRun(run.level);
  $('[data-lesson]').onclick = () => lesson(run.level, 0);
}

function results() {
  const { level } = run, stars = Math.max(1, run.hearts);
  const before = rankOf(totalXp());
  save.best[level.id] = Math.max(save.best[level.id] || 0, run.score);
  save.stars[level.id] = Math.max(save.stars[level.id] || 0, stars);
  persist();
  const after = rankOf(totalXp()), nextLevel = LEVELS[level.n];
  sfx.win(); confetti();
  app.innerHTML = `${topbar('')}<main class="card end ${level.color}">
    <div class="stars big">${[1, 2, 3].map((i) => `<i class="${stars >= i ? 'on' : ''}" style="animation-delay:${i * 0.18}s">★</i>`).join('')}</div>
    <h2>${level.title}: done</h2>
    <p class="score">${run.score} XP · ${run.right} of ${run.n} right</p>
    ${after.name !== before.name ? `<p class="hl">New rank: <b>${after.name}</b> ${he(after.he)}</p>` : ''}
    ${level.id === 'boss' ? `<p>You have read the first verse of the Torah as it is read in Sana’a.</p>` : ''}
    <div class="actions"><button class="btn ghost" data-home>All levels</button>
    ${nextLevel ? `<button class="btn" data-nextlvl>Level ${nextLevel.n}: ${nextLevel.title}</button>` : '<button class="btn" data-lab>Open the Sound Lab</button>'}</div></main>`;
  bindHome();
  if (nextLevel) $('[data-nextlvl]').onclick = () => lesson(nextLevel, 0);
  else $('[data-lab]').onclick = lab;
}

function confetti() {
  const c = document.createElement('div'); c.className = 'confetti';
  const colors = ['#e0a526', '#b23a2e', '#1f7a7a', '#2b3a7a', '#f3d58a'];
  c.innerHTML = Array.from({ length: 60 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${colors[i % 5]};animation-delay:${Math.random() * 0.6}s;animation-duration:${1.6 + Math.random() * 1.4}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join('');
  document.body.appendChild(c); setTimeout(() => c.remove(), 3600);
}

// ---------------------------------------------------------------- challenge types
const RENDER = {};
const soundOpt = (id) => `${ipa(SOUNDS[id].ipa)}<small>${SOUNDS[id].like}</small>`;

function options(stage, ch, head, opts, render, cls = '') {
  const order = shuffle(opts.map((o, k) => ({ o, k })));
  stage.innerHTML = `${head}<div class="opts ${cls}">${order.map(({ o, k }) => `<button class="opt" data-k="${k}">${render(o, k)}</button>`).join('')}</div>`;
  $$('.opt', stage).forEach((b) => (b.onclick = () => {
    const good = b.dataset.k === '0';
    b.classList.add(good ? 'right' : 'wrong');
    if (!good) $('.opt[data-k="0"]', stage).classList.add('right');
    finish(good, ch);
  }));
}
const qHead = (ch) => `<p class="q">${ch.q}</p>${ch.big ? `<div class="bigletter">${he(ch.big)}</div>` : ''}`;

RENDER.choice = (stage, ch) => options(stage, ch, qHead(ch), ch.opts, (o) => (ch.raw ? o : soundOpt(o)), ch.raw ? 'raw' : '');
RENDER.word = (stage, ch) => options(stage, ch, qHead(ch), ch.opts, (o, k) => `${he(o)}<small>${ch.gloss[k]}</small>`, 'words2');

RENDER.same = (stage, ch) => {
  stage.innerHTML = `<p class="q">${ch.q}</p><div class="bigletter pair">${he(ch.pair[0])}<span>vs</span>${he(ch.pair[1])}</div>
    <div class="opts two"><button class="opt" data-v="1">Same sound</button><button class="opt" data-v="0">Different</button></div>`;
  $$('.opt', stage).forEach((b) => (b.onclick = () => { const good = (b.dataset.v === '1') === ch.a; b.classList.add(good ? 'right' : 'wrong'); finish(good, ch); }));
};

RENDER.place = (stage, ch) => {
  stage.innerHTML = `<p class="q">${ch.q}</p><div class="center">${sndBtn(ch.sound, 'huge')}</div>${mouthSVG(true)}`;
  play(ch.sound);
  $$('[data-station]', stage).forEach((s) => (s.onclick = () => {
    if (stage.dataset.done) return; stage.dataset.done = 1;
    const good = s.dataset.station === ch.a;
    s.classList.add(good ? 'right' : 'wrong'); $(`.station.${ch.a}`, stage).classList.add('right');
    finish(good, ch, { why: `${PLACES[ch.a]}. ${ch.why || ''}` });
  }));
};

RENDER.match = (stage, ch) => {
  const left = shuffle(ch.pairs.map((p) => p[0])), right = shuffle(ch.pairs.map((p) => p[1]));
  stage.innerHTML = `<p class="q">${ch.q}</p><div class="match"><div>${left.map((s) => `<button class="m l" data-s="${s}">${ipa(SOUNDS[s].ipa)}</button>`).join('')}</div>
    <div>${right.map((s) => `<button class="m r" data-s="${s}">${ipa(SOUNDS[s].ipa)}</button>`).join('')}</div></div><p class="fine center">Tap a pop on the left, then its hiss on the right.</p>`;
  let sel = null, misses = 0, done = 0;
  $$('.m', stage).forEach((b) => (b.onclick = () => {
    play(b.dataset.s);
    if (b.classList.contains('l')) { $$('.m.l', stage).forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); sel = b; return; }
    if (!sel) return;
    const good = ch.pairs.some((p) => p[0] === sel.dataset.s && p[1] === b.dataset.s);
    if (good) { [sel, b].forEach((x) => { x.classList.add('paired'); x.classList.remove('sel'); x.disabled = true; }); sel = null; sfx.tick(); if (++done === ch.pairs.length) finish(misses < 2, ch, { why: 'Each pair is made in one place: lips, teeth, or the back of the tongue. Only the airflow differs.' }); }
    else { misses++; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); }
  }));
};

RENDER.build = (stage, ch) => {
  let k = 0, missed = false;
  const built = [];
  const step = () => {
    stage.innerHTML = `<p class="q">Build the Sana’a reading, piece by piece.</p><div class="bigletter word">${he(ch.he)}</div><p class="center fine">${ch.en}</p>
      <div class="built">${ipa(built.join('') + '<u>…</u>')}</div>
      <div class="opts three">${shuffle(ch.segs[k].map((s, n) => ({ s, n }))).map(({ s, n }) => `<button class="opt seg" data-n="${n}"><span class="ipa">${s}</span></button>`).join('')}</div>
      <p class="fine center">Piece ${k + 1} of ${ch.segs.length}</p>`;
    $$('.opt', stage).forEach((b) => (b.onclick = () => {
      if (b.dataset.n !== '0') { missed = true; b.classList.add('wrong', 'shake'); b.disabled = true; sfx.bad(); return; }
      built.push(ch.segs[k][0]); sfx.tick();
      if (++k < ch.segs.length) return step();
      $('.built', stage).innerHTML = ipa(built.join(''));
      $$('.opt', stage).forEach((x) => (x.disabled = true));
      finish(!missed, ch, { why: `${ipa(built.join(''))} ${ch.why}` });
    }));
  };
  step();
};

// ----- microphone challenges
function micShell(stage, ch, head, body) {
  stage.innerHTML = `${head}<div class="micbox">${body}</div>
    <div class="microw"><button class="btn mic" id="micgo">🎙 ${Mic.on ? 'Start' : 'Turn on the microphone'}</button>
    <button class="skip" id="micskip">Can’t use a mic right now</button></div><p class="fine center" id="michint"></p>`;
  $('#micskip').onclick = () => {
    stage.innerHTML = `${head}<p class="center">No microphone, so you are the judge. Try it out loud a few times.</p>
      <div class="opts two"><button class="opt" data-v="1">I’ve got it</button><button class="opt" data-v="0">Not yet</button></div>`;
    $$('.opt', stage).forEach((b) => (b.onclick = () => finish(b.dataset.v === '1' ? true : 'skip', ch, { xp: 5, why: ch.selfWhy || 'Come back to this one with a microphone when you can.' })));
  };
}
async function ensureMic() {
  try { await Mic.start(); return true; }
  catch (e) {
    $('#michint').innerHTML = `<span class="warn">${e.name === 'NotAllowedError' ? 'Microphone permission was refused. Allow it in the browser’s address bar, or mark yourself below.' : 'No microphone found here. You can mark yourself below.'}</span>`;
    return false;
  }
}
const meter = (label) => `<div class="meter"><i id="mfill"></i></div><div class="mlabel" id="mlabel">${label}</div>`;

RENDER.hold = (stage, ch) => {
  const s = SOUNDS[ch.sound], NEED = 700;
  micShell(stage, { ...ch, selfWhy: `A hiss can be held. ${ch.voiced ? 'Voice on.' : 'Voice off.'}` },
    `<p class="q">Hold this sound for a full second.</p><div class="center">${he(ch.he)} ${sndBtn(ch.sound, 'huge')}</div><p class="center">${ch.tip}</p>
     <p class="center chips"><span>air keeps flowing</span><span>${ch.voiced ? 'voice ON (buzz)' : 'voice OFF (whisper)'}</span></p>`,
    meter('Waiting…'));
  $('#micgo').onclick = async () => {
    if (!(await ensureMic())) return;
    $('#micgo').disabled = true; $('#micgo').textContent = 'Listening…';
    const mark = Mic.mark(), t0 = Date.now();
    loops.push(setInterval(() => {
      const fr = analyze(Mic.since(mark), Mic.sr, { formants: false });
      if (fr.length < 5) return;
      const res = sustain(fr, ch.voiced, Mic.floor), other = sustain(fr, !ch.voiced, Mic.floor);
      $('#mfill').style.width = `${Math.min(100, 100 * res.ms / NEED)}%`;
      $('#mlabel').textContent = res.ms ? `${(res.ms / 1000).toFixed(1)} s held` : other.ms > 150 ? (ch.voiced ? 'I hear air but no voice…' : 'Your voice is on…') : 'Go on…';
      const scrape = (ch.sound === 'hh' || ch.sound === 'kh') && res.centroid > 4300;
      if (res.ms >= NEED && !scrape) return finish(true, ch, { xp: 15, why: `Held for ${(res.ms / 1000).toFixed(1)} s with the voice ${ch.voiced ? 'on' : 'off'}. That is ${ipa(s.ipa)}: air flowing the whole time, which no pop can do.` });
      if (Date.now() - t0 > 6000) {
        stopLoops();
        const msg = scrape ? 'That hissed at the teeth, like s or sh. Keep the tongue tip down and make the sound further back.'
          : other.ms > 350 ? (ch.voiced ? 'I heard air but no buzz. Hum while you do it: put a finger on your throat and feel it vibrate.' : 'Your voice was on. Whisper it: only air, no hum.')
          : res.heard < 200 ? 'I could barely hear anything. Move closer to the microphone and try again.'
          : 'It kept stopping. Don’t let the tongue seal the air off: leave a small gap and keep breathing out.';
        retry(msg);
      }
    }, 100));
  };
};
function retry(msg) {
  sfx.bad();
  $('#michint').innerHTML = `<span class="warn">${msg}</span>`;
  const b = $('#micgo'); b.disabled = false; b.textContent = '🎙 Try again';
}

const dist = (p, at) => Math.hypot(p.open - at[0], (p.front - at[1]) * 0.8);
function vowelTargets() {
  const c = save.corners || DEFAULT_CORNERS, t = {};
  for (const id of ['aw', 'a', 'e', 'oe', 'i', 'u']) t[id] = [...SOUNDS[id].at];
  t.a[1] = Math.max(0.2, Math.min(0.7, place(c.a.f1, c.a.f2, c).front));
  return t;
}
// Follows the voice around the map. Calls onPos with the placed vowel, or null when silent.
function trackVowel(onPos) {
  let sm = null;
  loops.push(setInterval(() => {
    const vw = vowel(analyze(Mic.last(0.32), Mic.sr), Mic.floor), dot = $('#vdot');
    if (!dot) return;
    if (!vw) { sm = null; dot.setAttribute('cx', -30); onPos(null); return; }
    const p = place(vw.f1, vw.f2, save.corners || DEFAULT_CORNERS);
    sm = sm ? { open: sm.open * 0.5 + p.open * 0.5, front: sm.front * 0.5 + p.front * 0.5 } : p;
    const [x, y] = vxy(sm.open, sm.front);
    dot.setAttribute('cx', x); dot.setAttribute('cy', y);
    onPos(sm, vw);
  }, 90));
}

RENDER.vowel = (stage, ch) => {
  const s = SOUNDS[ch.target];
  micShell(stage, { ...ch, selfWhy: `${ipa(s.ipa)}: ${s.like}.` },
    `<p class="q">Steer the dot into the ring and hold it there.</p><div class="center">${he(ch.he)} ${sndBtn(ch.target, 'huge')}</div><p class="center">${ch.tip}</p>`,
    `${vmapSVG(ch.target)}${meter('Sing the vowel on one steady note.')}`);
  $('#micgo').onclick = async () => {
    if (!(await ensureMic())) return;
    $('#micgo').disabled = true; $('#micgo').textContent = 'Listening…';
    const T = vowelTargets();
    let inside = 0;
    trackVowel((p) => {
      if (!p) { $('#mlabel').textContent = 'Sing the vowel on one steady note.'; return; }
      const d = dist(p, T[ch.target]);
      const nearest = Object.keys(T).reduce((a, b) => (dist(p, T[a]) < dist(p, T[b]) ? a : b));
      const hit = d < 0.3 && (nearest === ch.target || d < 0.2);
      inside = hit ? inside + 90 : Math.max(0, inside - 60);
      $('#mfill').style.width = `${Math.min(100, inside / 6)}%`;
      const o = p.open - T[ch.target][0], f = p.front - T[ch.target][1];
      $('#mlabel').textContent = hit ? 'There. Hold it…' : Math.abs(o) > Math.abs(f) ? (o > 0 ? 'Close your jaw a little' : 'Open your jaw more') : (f > 0 ? 'Pull the tongue back, or round your lips' : 'Push the tongue forward');
      if (inside >= 600) finish(true, ch, { xp: 15, why: `You held ${ipa(s.ipa)}. The dot is drawn from the two lowest resonances of your voice, which is all a vowel is.` });
    });
  };
};

RENDER.calibrate = (stage, ch) => {
  const steps = [['i', 'ee', 'as in <i>see</i>'], ['a', 'ah', 'as in <i>father</i>, jaw wide'], ['u', 'oo', 'as in <i>moon</i>, lips rounded']];
  const got = {};
  let k = 0;
  const done = (ok) => {
    stopLoops();
    // Many English speakers say "oo" with the tongue forward, so the back edge of the map
    // is taken from whichever is further back: the "oo" or a point behind the "ah".
    if (ok) got.u.f2 = Math.min(got.u.f2, got.a.f2 * 0.8);
    const good = ok && got.i.f2 > got.u.f2 * 1.35 && got.a.f1 > (got.i.f1 + got.u.f1) / 2 + 130;
    if (good) { save.corners = got; persist(); }
    finish(good ? true : 'skip', ch, { xp: 10, why: good ? 'Tuned. The map now fits your voice: those three vowels are its corners.' : 'I could not get a clean reading, so the map will use a typical voice. It still works; the ring is just a little less exact.' });
  };
  stage.innerHTML = `<p class="q">Tune the map to your voice.</p><p class="center">Every voice has different resonances. Sing three vowels you already know, about a second each, and the map will fit yours.</p>
    <div class="cal">${steps.map(([id, w, d], n) => `<div class="calstep" data-n="${n}"><b>${w}</b><small>${d}</small><span class="tick"></span></div>`).join('')}</div>
    <div class="micbox">${meter('')}</div>
    <div class="microw"><button class="btn mic" id="micgo">🎙 ${Mic.on ? 'Start' : 'Turn on the microphone'}</button><button class="skip" id="micskip">Skip tuning</button></div><p class="fine center" id="michint"></p>`;
  $('#micskip').onclick = () => done(false);
  $('#micgo').onclick = async () => {
    if (!(await ensureMic())) return;
    $('#micgo').disabled = true;
    const next = () => {
      $$('.calstep', stage).forEach((el, n) => el.classList.toggle('on', n === k));
      $('#micgo').textContent = `Sing “${steps[k][1]}”…`;
      let acc = 0, f1s = [], f2s = [], quiet = k === 0 ? 2 : 0; // wait for a pause so the last vowel's tail is not counted
      stopLoops();
      loops.push(setInterval(() => {
        const vw = vowel(analyze(Mic.last(0.25), Mic.sr), Mic.floor);
        if (!vw) { quiet++; acc = 0; f1s = []; f2s = []; }
        else if (quiet >= 2) { acc += 100; f1s.push(vw.f1); f2s.push(vw.f2); }
        $('#mfill').style.width = `${Math.min(100, acc / 8)}%`;
        if (acc >= 800) {
          const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
          got[steps[k][0]] = { f1: med(f1s), f2: med(f2s) };
          $(`.calstep[data-n="${k}"] .tick`, stage).textContent = '✓'; sfx.tick();
          stopLoops();
          if (++k < 3) setTimeout(next, 700); else done(true);
        }
      }, 100));
    };
    next();
  };
};

function recordTake(sec, label) {
  return new Promise((resolve) => {
    const mark = Mic.mark(), t0 = Date.now();
    loops.push(setInterval(() => {
      const el = (Date.now() - t0) / 1000;
      $('#mfill').style.width = `${Math.min(100, 100 * el / sec)}%`; $('#mlabel').textContent = label;
      if (el >= sec) { stopLoops(); resolve(Mic.since(mark)); }
    }, 50));
  });
}

RENDER.jimel = (stage, ch) => {
  const want = ch.want;
  micShell(stage, { ...ch, selfWhy: want === 'j' ? '[dʒ] rubs on the way out.' : '[g] is a clean pop from the back of the tongue.' },
    `<p class="q">${ch.tip}</p><div class="center">${he('גַּם')} ${ipa(want === 'j' ? 'dʒam' : 'gam')} ${sndBtn(want, 'huge')}</div>
     <p class="center">The microphone times the hiss between the pop and the vowel. A clean [g] has almost none. A [dʒ] rubs.</p>`,
    `${meter('Press start, then say the word once.')}<div class="gauge"><span>clean pop [g]</span><div><i id="needle"></i></div><span>rub [dʒ]</span></div>`);
  $('#micgo').onclick = async () => {
    if (!(await ensureMic())) return;
    $('#micgo').disabled = true; $('#micgo').textContent = 'Say it now…';
    const x = await recordTake(1.8, 'Listening…');
    const on = onsetFriction(analyze(x, Mic.sr, { formants: false }), Mic.floor);
    if (!on) return retry('I did not catch a word. Say it once, clearly, close to the microphone.');
    $('#needle').style.left = `${Math.min(100, on.ms * 1.6)}%`;
    const heard = on.ms >= 20 ? 'j' : 'g';
    $('#mlabel').textContent = `${on.ms} ms of hiss: that sounded like ${heard === 'j' ? 'jimel [dʒ]' : 'gimel [g]'}.`;
    if (heard === want) return finish(true, ch, { xp: 15, why: `${on.ms} ms of hiss before the vowel. ${want === 'j' ? 'That rub is what makes [dʒ] a pop-plus-hiss, and it happens at the front of the mouth.' : 'A clean release at the back of the tongue: the pop that pairs with [ɣ].'}` });
    retry(want === 'j' ? `I heard a clean pop (${on.ms} ms of hiss). Let it rub: <b>j</b>am.` : `I heard ${on.ms} ms of hiss, which is a j. Make a hard <b>g</b>, as in <i>go</i>.`);
  };
};

RENDER.trill = (stage, ch) => {
  micShell(stage, { ...ch, selfWhy: 'A rolled r is the tongue tip fluttering in the airstream.' },
    `<p class="q">${ch.tip}</p><div class="center">${he('ר')} ${sndBtn('r', 'huge')}</div>
     <p class="center">A rolled r is the tongue tip tapping about 25 times a second. The microphone looks for that flutter.</p>`, meter('Press start, then roll for a second.'));
  let tries = 0;
  $('#micgo').onclick = async () => {
    if (!(await ensureMic())) return;
    $('#micgo').disabled = true; $('#micgo').textContent = 'Roll it…';
    const x = await recordTake(2.2, 'Listening…');
    const t = trill(x, Mic.sr, Mic.floor);
    if (t.strength >= 0.7) return finish(true, ch, { xp: 15, why: `A flutter at about ${Math.round(t.rate)} taps a second. That is a true trill.` });
    tries++;
    retry(`No steady flutter yet. Relax the tongue tip and push more air: try “drrr” or “trrr”.${tries > 1 ? ' Plenty of adults need weeks for this one, so skip it if you like.' : ''}`);
  };
};

RENDER.self = (stage, ch) => {
  stage.innerHTML = `<p class="q">${ch.q}</p><div class="bigletter verse">${he(ch.he)}</div><p class="center versei">${ipa(ch.ipa)}</p>
    <div class="microw"><button class="btn mic" id="rec">🎙 Record</button><button class="btn ghost" id="pb" disabled>▶ Listen back</button></div><p class="fine center" id="michint"></p>
    <div class="checks">${ch.checks.map((c, i) => `<label><input type="checkbox" data-i="${i}"> ${c}</label>`).join('')}</div>
    <div class="center"><button class="btn" id="selfdone">Mark it</button></div>`;
  let take = null, mark = 0, rec = false;
  $('#rec').onclick = async () => {
    if (!rec) { if (!(await ensureMic())) return; mark = Mic.mark(); rec = true; $('#rec').textContent = '■ Stop'; $('#rec').classList.add('live'); }
    else { take = Mic.since(mark); rec = false; $('#rec').textContent = '🎙 Record again'; $('#rec').classList.remove('live'); $('#pb').disabled = false; }
  };
  $('#pb').onclick = () => take && playSamples(take, Mic.sr);
  $('#selfdone').onclick = () => {
    const n = $$('.checks input:checked', stage).length;
    finish(true, ch, { xp: 5 * n, why: n === ch.checks.length ? 'All six. Read it to someone who has not heard Yemenite reading before and watch their face.' : `${n} of ${ch.checks.length}. The ones you left unticked are your practice list: each has its own level.` });
  };
};

// ---------------------------------------------------------------- sound lab
function lab() {
  stopLoops();
  app.innerHTML = `${topbar('Sound Lab')}
  <main class="card lab">
    <h2>The live vowel map</h2>
    <p>Turn on the microphone and sing any vowel. The dot shows where your mouth is. Tap a circle to hear that vowel.</p>
    ${vmapSVG()}<div class="microw"><button class="btn mic" id="micgo">🎙 ${Mic.on ? 'Follow my voice' : 'Turn on the microphone'}</button></div><p class="fine center" id="michint"></p>
    <h2>The symbol decoder</h2><p>Every IPA symbol the game uses that English spelling does not.</p>
    <div class="decoder">${DECODER.map((id) => `<div>${sndBtn(id)}<small>${SOUNDS[id].like}</small></div>`).join('')}</div>
    <h2>Beged kefet</h2>${begedTable()}
    <h2>Where each sound is made</h2>${mouthSVG()}
    <h2>Words</h2>${wordList()}
  </main>`;
  bindHome();
  $('#micgo').onclick = async () => {
    if (!(await ensureMic())) return;
    $('#micgo').disabled = true; $('#micgo').textContent = 'Listening…';
    trackVowel((p, vw) => { $('#michint').textContent = p ? `resonances: ${Math.round(vw.f1)} Hz and ${Math.round(vw.f2)} Hz` : 'Sing a vowel…'; });
  };
  window.scrollTo(0, 0);
}

// Deep links for testing and sharing: #level-id, #level-id/3 (a challenge), #lab
function route() {
  const [id, n] = location.hash.slice(1).split('/');
  const level = LEVELS.find((l) => l.id === id);
  if (id === 'lab') return lab();
  if (!level) return home();
  if (n === undefined) return lesson(level, 0);
  startRun(level); run.i = Math.min(level.challenges.length - 1, Number(n) || 0); challenge();
}
window.addEventListener('hashchange', route);
route();
