// The Knot Explorer: one shel yad on an arm, every way of tying it and keeping its yud by the bayit.
// Plain three.js: physically based leather under a studio environment, orbit controls, DOM labels.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeArm, buildTefillin } from './model.js';
import { METHODS, BASICS, VIDEO, STEPS } from './data.js';
import './knots.css';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const root = document.getElementById('knots-root');
root.innerHTML = `
  <canvas class="kx-canvas"></canvas>
  <div class="kx-labels"></div>
  <header class="kx-head">
    <div><span class="kx-he" lang="he" dir="rtl">קֶשֶׁר שֶׁל יָד</span><b>The Knot Explorer</b><small>Hilchot Tefillin · Shiur 6 · siman 27 · sheet #81-94</small></div>
    <nav>
      <button class="kx-btn" data-act="video">▶ The video</button>
      <a class="kx-btn" href="/tefillin-trials?shiur=6">Shiur 6 in the game ▸</a>
    </nav>
  </header>
  <aside class="kx-list"></aside>
  <section class="kx-card"></section>
  <div class="kx-tools">
    <button class="kx-btn kx-primary" data-act="pull">⟲ Tighten</button>
    <button class="kx-btn" data-act="view:heart">♥ Heart side</button>
    <button class="kx-btn" data-act="view:top">Above</button>
    <button class="kx-btn" data-act="view:out">Outside</button>
    <button class="kx-btn" data-act="labels" aria-pressed="true">Labels</button>
  </div>
  <div class="kx-video" hidden>
    <div class="kx-video-card">
      <button class="kx-x" data-act="close" aria-label="Close">✕</button>
      <div class="kx-video-title">${esc(VIDEO.title)}</div>
      <div class="kx-frame"></div>
      <p>Played in the shiur: the Ashkenaz knot (and how the loop should sit tight against it), the Sefardi knot fed through with a string, the Chabad slipknot, and the “Chafetz Chaim knot”. Say <span lang="he">הִנְנִי קוֹשֵׁר לְשֵׁם קְדֻשַּׁת תְּפִלִּין</span> before you tie. <a href="${VIDEO.url}" target="_blank" rel="noopener">Open on YouTube ↗</a></p>
    </div>
  </div>`;

// ── scene ──
const canvas = $('.kx-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#14161f');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 1.6;
controls.maxDistance = 14;
controls.target.set(0.4, 1.05, -0.2);

const key = new THREE.DirectionalLight('#fff3e2', 2.4);
key.position.set(3, 7, -5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight('#9fc4ff', 1.2);
rim.position.set(-4, 3, 6);
scene.add(rim);
const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -3.9; floor.receiveShadow = true;
scene.add(floor);
const glow = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshBasicMaterial({ color: '#1f2433', transparent: true, opacity: 0.6 }));
glow.rotation.x = -Math.PI / 2; glow.position.y = -3.91; scene.add(glow);

const arm = makeArm();
scene.add(arm);

// ── labels ──
const labelLayer = $('.kx-labels');
let labels = [];
const LABELS = {
  bayit: ['Ketzitzah · the bayit', 'קְצִיצָה'], titura: ['Titura · the base', 'תִּיתוֹרָא'], maabarta: ['Ma’abarta · the tunnel', 'מַעְבַּרְתָּא'],
  yud: ['The yud’s head · the knot', 'יו״ד'], leg: ['The yud’s leg', 'רֶגֶל הַיּוּ״ד'], loop: ['The loop', 'לוּלָאָה'], heart: ['♥ toward the heart', 'לְצַד הַלֵּב'],
  thread: ['Gid thread', 'חוּט שֶׁל גִּיד'], under: ['✗ Thread under the titura: chatzitzah', 'חֲצִיצָה'], notch: ['The notch', 'חֲתָךְ'],
  insert: ['The Chazon Ish’s piece', 'חֲתִיכַת רְצוּעָה'], wrap: ['Around the bayit', 'כְּרִיכָה'], over: ['Over the yud', 'עַל הַיּוּ״ד'],
  shin: ['Twice around the titura: a shin', 'כְּמִין שִׁי״ן'], loop2: ['Second loop, out the far side', 'לוּלָאָה'],
  free: ['The free end of the strap', 'הָרְצוּעָה'],
};
let showLabels = true;
function setLabels(anchors) {
  for (const l of labels) l.el.remove();
  labels = Object.entries(anchors).filter(([k]) => LABELS[k]).map(([k, p]) => {
    const el = document.createElement('div');
    el.className = `kx-label ${k === 'under' ? 'bad' : ''} ${k === 'heart' ? 'heart' : ''}`;
    el.innerHTML = `${esc(LABELS[k][0])} <span lang="he" dir="rtl">${LABELS[k][1]}</span>`;
    labelLayer.appendChild(el);
    return { el, p: p.clone() };
  });
}
const tmp = new THREE.Vector3();
function placeLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const l of labels) {
    tmp.copy(l.p).applyMatrix4(current.group.matrixWorld).project(camera);
    const vis = showLabels && tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    l.el.style.display = vis ? '' : 'none';
    l.el.style.transform = `translate(-50%, -100%) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
  }
}

// ── methods ──
let current = null;
let method = null;
let pull = { t: 0, dir: 0 };
const list = $('.kx-list');
const groups = [...new Set(METHODS.map((m) => m.group))];
list.innerHTML = `<button class="kx-item kx-basics" data-m="basics"><b>${esc(BASICS.title)}</b><span lang="he" dir="rtl">${BASICS.he}</span></button>` +
  groups.map((g) => `<div class="kx-group">${esc(g)}</div>${METHODS.filter((m) => m.group === g).map((m) => `<button class="kx-item ${m.bad ? 'bad' : ''}" data-m="${m.id}"><b>${esc(m.name)}</b><span lang="he" dir="rtl">${m.he}</span><small>${esc(m.src)}</small></button>`).join('')}`).join('');

const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
let stepI = null; // which step of the tying is shown, or null for the finished knot
let playing = null;

function build(stage) {
  if (current) scene.remove(current.group);
  current = buildTefillin(method, stage);
  scene.add(current.group);
  setLabels(current.anchors);
  pull = { t: 0, dir: 0 };
  current.update(0);
  const pb = $('[data-act="pull"]'); if (pb) pb.textContent = '⟲ Tighten';
}

function stepsHtml(id) {
  const steps = STEPS[id];
  if (!steps) return '';
  const i = stepI;
  const st = i == null ? null : steps[i];
  return `<div class="kx-steps">
    <div class="kx-steps-head"><b>Watch it tied</b><span>as in the video</span></div>
    <div class="kx-dots">${steps.map((_, k) => `<button data-act="step:${k}" class="${k === i ? 'on' : ''}" aria-label="Step ${k + 1}">${k + 1}</button>`).join('')}<button data-act="step:done" class="${i == null ? 'on' : ''}">✓</button></div>
    ${st ? `<p class="kx-step-text"><b>Step ${i + 1}.</b> ${esc(st.text)}</p>
      <div class="kx-step-btns"><button class="kx-btn" data-act="step:prev">◀</button><button class="kx-btn" data-act="step:next">${i + 1 < steps.length ? 'Next ▶' : 'Done ✓'}</button><button class="kx-btn" data-act="watch:${st.t}">▶ ${mmss(st.t)} in the video</button></div>`
      : `<div class="kx-step-btns"><button class="kx-btn kx-primary" data-act="step:0">▶ Tie it step by step</button><button class="kx-btn" data-act="play">Auto-play</button><button class="kx-btn" data-act="watch:${steps[0].t}">▶ ${mmss(steps[0].t)} in the video</button></div>`}
  </div>`;
}

function showStep(i) {
  const steps = STEPS[method.id];
  if (!steps) return;
  stepI = i;
  const st = i == null ? null : steps[i];
  build(st ? st.stage : undefined);
  view(st ? st.cam : 'heart');
  if (st?.pull) setTimeout(() => { if (stepI === i) pull.dir = 1; }, 900);
  const box = $('.kx-steps');
  if (box) box.outerHTML = stepsHtml(method.id);
}

function select(id, step = null) {
  const m = METHODS.find((x) => x.id === id) || METHODS[0];
  const basics = id === 'basics';
  method = basics ? METHODS[0] : m;
  clearInterval(playing); playing = null;
  stepI = !basics && STEPS[m.id] && step != null ? step : null;
  build(stepI != null ? STEPS[m.id][stepI].stage : undefined);
  const wasMirrored = mirrored;
  mirrored = !!method.extras?.flip;
  if (stepI != null) view(STEPS[m.id][stepI].cam);
  else if (mirrored !== wasMirrored) view('heart');
  for (const b of list.querySelectorAll('.kx-item')) b.classList.toggle('on', b.dataset.m === (basics ? 'basics' : m.id));
  const card = $('.kx-card');
  card.innerHTML = basics
    ? `<div class="kx-kicker">The basics · #82, #83, #94</div><h2>${esc(BASICS.title)} <span lang="he" dir="rtl">${BASICS.he}</span></h2>${BASICS.text.map((t) => `<p>${esc(t)}</p>`).join('')}<p class="kx-hint">Pick a method on the left, then press <b>Tighten</b> to see which way the pull moves the yud. Ashkenaz, Sefard, Chabad and the Chafetz Chaim knot can be tied step by step, as in the video.</p>`
    : `<div class="kx-kicker">${esc(m.group)} · ${esc(m.src)}</div><h2>${esc(m.name)} <span lang="he" dir="rtl">${m.he}</span></h2>${stepsHtml(m.id)}<p>${esc(m.text)}</p><div class="kx-verdict ${m.bad ? 'bad' : m.holds ? 'good' : 'warn'}">${m.holds ? (m.bad ? '✗ ' : '✓ ') : '↔ '}${esc(m.verdict)}</div><div class="kx-hold" hidden></div>`;
  try { history.replaceState(null, '', `${location.pathname}?m=${basics ? 'basics' : m.id}${stepI != null ? `&step=${stepI + 1}` : ''}`); } catch { /* ignore */ }
}
list.addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) { select(b.dataset.m); list.classList.remove('open'); } });

// ── camera presets ──
const VIEWS = {
  heart: [new THREE.Vector3(2.6, 3.4, -6.4), new THREE.Vector3(0.6, 0.9, -0.2)],
  top: [new THREE.Vector3(0.6, 7.6, -0.8), new THREE.Vector3(0.6, 1.1, 0)],
  out: [new THREE.Vector3(2.0, 3.0, 6.4), new THREE.Vector3(0.6, 0.9, 0.2)],
  knot: [new THREE.Vector3(-1.0, 3.0, -4.1), new THREE.Vector3(0.35, 0.95, -0.7)],
  far: [new THREE.Vector3(-0.7, 3.1, 4.4), new THREE.Vector3(0.35, 0.95, 0.6)],
};
let flyTo = null;
let mirrored = false; // the lefty's flipped pair sits on the other end of the arm
function view(name) {
  const [pos, tgt] = VIEWS[name];
  const m = (v) => (mirrored ? new THREE.Vector3(-v.x, v.y, v.z) : v.clone());
  flyTo = [m(pos), m(tgt)];
}
camera.position.copy(VIEWS.heart[0]);
controls.target.copy(VIEWS.heart[1]);

root.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const [act, arg] = t.dataset.act.split(':');
  if (act === 'pull') { pull.dir = pull.t > 0.5 ? -1 : 1; t.textContent = pull.dir > 0 ? '⟲ Loosen' : '⟲ Tighten'; }
  if (act === 'view') view(arg);
  if (act === 'labels') { showLabels = !showLabels; t.setAttribute('aria-pressed', String(showLabels)); }
  if (act === 'video' || act === 'watch') {
    $('.kx-video').hidden = false;
    const start = act === 'watch' ? `&start=${Math.max(0, Number(arg) - 1)}&autoplay=1` : '';
    $('.kx-frame').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${VIDEO.id}?rel=0${start}" title="${esc(VIDEO.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }
  if (act === 'step') {
    clearInterval(playing); playing = null;
    const n = STEPS[method.id]?.length || 0;
    if (arg === 'done') showStep(null);
    else if (arg === 'next') showStep(stepI == null ? 0 : stepI + 1 < n ? stepI + 1 : null);
    else if (arg === 'prev') showStep(stepI == null ? n - 1 : Math.max(0, stepI - 1));
    else showStep(Number(arg));
    try { history.replaceState(null, '', `${location.pathname}?m=${method.id}${stepI != null ? `&step=${stepI + 1}` : ''}`); } catch { /* ignore */ }
  }
  if (act === 'play') {
    const n = STEPS[method.id]?.length || 0;
    showStep(0);
    playing = setInterval(() => { if (stepI == null || stepI + 1 >= n) { clearInterval(playing); playing = null; if (stepI != null) showStep(null); return; } showStep(stepI + 1); }, 4200);
  }
  if (act === 'close' || (act === undefined && t.classList.contains('kx-video'))) { $('.kx-video').hidden = true; $('.kx-frame').innerHTML = ''; }
});
$('.kx-video').addEventListener('click', (e) => { if (e.target === e.currentTarget) { e.currentTarget.hidden = true; $('.kx-frame').innerHTML = ''; } });
$('.kx-list').insertAdjacentHTML('beforebegin', '<button class="kx-btn kx-menu" aria-label="Methods">☰ Methods</button>');
$('.kx-menu').addEventListener('click', () => list.classList.toggle('open'));

// ── loop ──
function resize() {
  const w = root.clientWidth, h = root.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (pull.dir) {
    pull.t = Math.max(0, Math.min(1, pull.t + pull.dir * dt / 1.4));
    if (pull.t === 0 || pull.t === 1) {
      if (pull.t === 1) {
        const gap = current.update(1);
        const hold = $('.kx-hold');
        if (hold) { hold.hidden = false; hold.className = `kx-hold ${gap > 0.01 ? 'warn' : 'good'}`; hold.textContent = gap > 0.01 ? 'Tightened: the pull dragged the yud away from the bayit.' : 'Tightened: the yud stayed against the bayit.'; }
      }
      pull.dir = 0;
    }
  }
  if (current) current.update(pull.t);
  if (flyTo) {
    camera.position.lerp(flyTo[0], Math.min(1, dt * 3.5));
    controls.target.lerp(flyTo[1], Math.min(1, dt * 3.5));
    if (camera.position.distanceTo(flyTo[0]) < 0.02) flyTo = null;
  }
  controls.update();
  renderer.render(scene, camera);
  if (current) placeLabels();
});
controls.addEventListener('start', () => { flyTo = null; });

const qs = new URLSearchParams(location.search);
const q = qs.get('m');
const qStep = Number(qs.get('step')) || 0;
select(q && (q === 'basics' || METHODS.some((m) => m.id === q)) ? q : 'basics', qStep ? qStep - 1 : null);
// a link straight to a step opens on that step's shot
if (flyTo) { camera.position.copy(flyTo[0]); controls.target.copy(flyTo[1]); flyTo = null; }
window.__knots = { select, METHODS, camera };
