// Hineni Lite: Shiur 4 (the tefillin stand), Shiur 5 (the ward) and Shiur 6 (the checkpoint).
import * as THREE from 'three';
import { G, game } from './state.js';
import { player, spawnPlayer, makeNpc, steer, say, label, burst, dist2, view, box, sphere, cyl, at, mat } from './engine.js';
import { good, bad, pick } from './common.js';
import { LOOKS } from './levels-shul.js';
import { STAND_QUEUE, ARM_ZONES, STAND_LESSONS, WARD_QUEUE, WARD_LESSONS, LONE_ROSH, ARM_STATES, CHECK_QUEUE, CHECK_LESSONS } from '../content.js';
import { STAND, ARM_STAGE, BEDS, BODY_STAGE } from '../layout.js';
import { ARM_CHOICES, BRACHA_CHOICES, judgeWard, knotError, armX, ARM_GEOM } from '../ward-rules.js';
import { sfx } from '../audio.js';

const SKIN = '#e8c39e';
const capsule = (r, len, color) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat(color));

// ── Shiur 4 · The Tefillin Stand ───────────────────────────────────────────
const VENDOR = { x: STAND.x, z: STAND.z - 1.6 };
const COUNTER = { x: STAND.x, z: STAND.z + 1.5 };
const ENTRY = [[-17, 12], [17, 12], [-17, -6], [17, -6]];
const ARM_LEN = 6, BAYIT = 0.62;
const armTop = (x) => { const u = (x - 0.15) / 2.1; return Math.max(1.72, 1.28 + 0.62 * Math.sqrt(Math.max(0, 1 - u * u))); };
const zoneAt = (x) => ARM_ZONES.find((z) => x >= z.from && x < z.to) || ARM_ZONES[ARM_ZONES.length - 1];
function judge(x) { const lo = zoneAt(x - BAYIT / 2), hi = zoneAt(x + BAYIT / 2); return lo.rank < hi.rank ? lo : hi; }

export function stand({ root, d }) {
  spawnPlayer(root, [VENDOR.x - 3, VENDOR.z + 6], { yad: true, rosh: true });
  const s = { i: -1, phase: 'intro', lives: 3, served: 0, score: 0, perfect: 0, lessons: [], slide: 0, dir: 1, speed: 2.2, placedAt: null, tight: 0, blessed: false, arm: 'left', stage: null };
  const kid = makeNpc(root, { x: VENDOR.x + 1.6, z: VENDOR.z - 0.2, speed: 0, look: LOOKS.kid, name: 'Your kid' });
  kid.faceTarget = { x: STAND.x, z: STAND.z + 3 };
  const customers = STAND_QUEUE.map((c, k) => {
    if (c.kind === 'shaila') return null;
    const [x, z0] = ENTRY[k % ENTRY.length];
    const z = z0 - Math.floor(k / ENTRY.length) * 1.4;
    const v = makeNpc(root, { x, z, speed: 3.2, wander: false, look: c.look, name: c.name });
    v.home = { x, z }; v.mode = 'still';
    return v;
  });
  d.add(() => { kid.bubble?.remove(); for (const v of customers) v?.bubble?.remove(); });
  // the arm stage
  const stage = new THREE.Group(); stage.position.set(ARM_STAGE.x, ARM_STAGE.y, ARM_STAGE.z); root.add(stage);
  const arm = new THREE.Group(); stage.add(arm);
  arm.add(at(sphere(0.95, SKIN), -3.3, 1, 0));
  const upper = capsule(0.72, ARM_LEN, SKIN); upper.rotation.z = Math.PI / 2; upper.position.y = 1; arm.add(upper);
  const bic = sphere(1, SKIN); bic.position.set(0.15, 1.28, 0); bic.scale.set(2.1, 0.62, 0.78); arm.add(bic);
  arm.add(at(sphere(0.66, SKIN), 3.4, 1, 0));
  const fore = capsule(0.55, 3.6, SKIN); fore.position.set(3.75, 3.1, 0); fore.rotation.z = -0.18; arm.add(fore);
  const zones = new THREE.Group(); arm.add(zones);
  for (const z of ARM_ZONES) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, z.to - z.from - 0.04, 24, 1, true), mat(z.color, { basic: true, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.z = Math.PI / 2; m.position.set((z.from + z.to) / 2, 1.05, 0); zones.add(m);
  }
  const bayit = new THREE.Group(); bayit.add(box(BAYIT, 0.62, 0.62, '#050507')); bayit.add(at(box(BAYIT + 0.3, 0.06, 0.9, '#050507'), 0, -0.33, 0)); stage.add(bayit);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 8, 32), mat('#050507')); strap.rotation.y = Math.PI / 2; strap.visible = false; stage.add(strap);
  const armTag = label(() => new THREE.Vector3(ARM_STAGE.x, 3.4, ARM_STAGE.z), { className: 'tt-tag lt-sign', y: 0 });
  d.add(() => armTag.remove());

  const hud = (patch = {}) => game.setHud({ lives: s.lives, served: s.served, total: STAND_QUEUE.length, score: s.score, objective: s.objective, stage: s.stageName, tight: s.tight, ...patch });
  const lesson = (t) => { if (t && !s.lessons.includes(t)) s.lessons.push(t); };
  s.objective = 'Morning on the corner. Set up the stand: walk behind the table.';
  hud();
  game.toast('Shiur 4 · Yad Keha. Your kid is running the tefillin stand with you today.', 'info');
  say(kid, 'Your kid', 'Abba, the shin has three heads on one side and four on the other. The Avot and the Imahot!');
  const t0 = setTimeout(() => { say(kid, null); next(); }, 3200);
  d.add(() => clearTimeout(t0));

  function loseLife(msg) { s.lives -= 1; bad(msg); lesson(msg); hud(); if (s.lives <= 0) { finish(false); return true; } return false; }
  const ask = async (who, line, options, why) => (await pick(who, line, options, { why })).ok;
  function next() {
    if (s.phase === 'done') return;
    s.i += 1;
    const c = STAND_QUEUE[s.i];
    if (!c) return finish(true);
    if (c.kind === 'shaila') {
      s.phase = 'shaila'; s.objective = c.title; hud();
      setTimeout(async () => {
        const ok = await ask(c.who, c.line, c.options, c.why);
        if (!ok && loseLife(c.why)) return;
        if (ok) { s.score += 40; lesson(c.lesson); }
        s.served += 1; hud(); setTimeout(next, 900);
      }, 600);
      return;
    }
    const v = customers[s.i];
    v.mode = 'arrive'; v.target = COUNTER; v.faceTarget = null;
    s.phase = 'walking'; s.objective = `${c.name} is walking up to the stand.`; hud();
  }
  async function serve() {
    const c = STAND_QUEUE[s.i];
    const v = customers[s.i];
    s.phase = 'serving'; v.faceTarget = { x: VENDOR.x, z: VENDOR.z }; v.motion.talk = true;
    say(v, c.name, c.line);
    const ok = await ask(c.name, c.line, c.arm.options, c.arm.why);
    say(v, null); v.motion.talk = false;
    if (!ok) { lesson(c.arm.why); if (loseLife(c.arm.why)) return; } else s.score += 30;
    if (c.arm.side === 'none') { game.toast(c.arm.after || 'No shel yad. He still puts on the shel rosh: they are two separate mitzvot.', 'info'); return doRosh(); }
    s.arm = c.arm.side;
    arm.scale.x = s.arm === 'right' ? -1 : 1;
    zones.visible = !!c.tutorial;
    armTag.set(s.arm === 'right' ? 'RIGHT ARM · <span lang="he">יָמִין</span>' : 'LEFT ARM · <span lang="he">שְׂמֹאל</span>');
    s.speed = c.speed || 2.4; s.slide = -ARM_LEN / 2 + 0.5; s.dir = 1; s.tight = 0; s.blessed = false; s.placedAt = null;
    s.stageName = 'place'; s.stage = 'place';
    s.objective = `${s.arm === 'right' ? 'RIGHT' : 'LEFT'} arm. Press E to set the bayit down on the right spot of the muscle.${c.tutorial ? ' (The zones are shown this once.)' : ''}`;
    player.camOverride = true; player.frozen = true;
    hud();
  }
  d.on('action', () => {
    if (G.reaction) return;
    if (s.phase === 'ready') { if (dist2(player.pos, VENDOR) < 2.6) serve(); return; }
    if (s.stage !== 'place' || s.placedAt != null) return;
    s.placedAt = s.slide;
    const z = judge(s.slide);
    const c = STAND_QUEUE[s.i];
    burst(z.rank >= 2 ? 'hineni' : 'hefsek', { x: ARM_STAGE.x + s.slide * (s.arm === 'right' ? -1 : 1), y: 2.2, z: ARM_STAGE.z });
    zones.visible = true;
    if (z.rank === 3) { s.score += 50; s.perfect += 1; game.toast(z.say, 'good'); sfx.good(); }
    else if (z.rank === 2) { s.score += 20; game.toast(z.say, 'info'); lesson(z.say); sfx.collect(); }
    else {
      if (loseLife(z.say)) return;
      setTimeout(() => { if (s.phase === 'done') return; s.placedAt = null; zones.visible = !!c.tutorial; s.objective = 'Try again: move it to the right spot.'; hud(); }, 1400);
      hud(); return;
    }
    s.stageName = 'bless'; s.stage = 'bless';
    s.objective = 'Now the bracha! Press B after it’s on the arm and before the knot is tight.';
    hud();
  });
  d.on('bless', () => {
    if (G.reaction) return;
    if (s.stage === 'place' && s.placedAt == null) { loseLife('Too early: the bracha comes once it’s on the arm, “from placing until tying” (Menachot 36a, #56).'); return; }
    if (s.stage !== 'bless' || s.blessed) return;
    s.blessed = true; sfx.good();
    burst('collect', { x: ARM_STAGE.x, y: 3, z: ARM_STAGE.z });
    const early = s.tight < 0.7;
    s.score += early ? 40 : 25;
    game.toast(early ? '“…lehaniach tefillin.” On the arm, before the knot: right on time (#56).' : '“…lehaniach tefillin.” Just in time, before it was tight.', 'good');
  });
  async function forgot() {
    const c = STAND_QUEUE[s.i];
    const why = 'Lechatchila the bracha comes before the knot is tight (#56). But if you forgot, bless now: every moment the tefillin are on you is the mitzvah. That’s why it’s “lehaniach”, and not like a lulav, which you can’t bless on once you’ve picked it up and done the mitzvah.';
    const ok = await ask(c.name, '“Wait, I didn’t make the bracha, and it’s already tied!”', [
      { t: 'Make it now: the mitzvah goes on for as long as they’re on', ok: true },
      { t: 'Too late, no bracha today, like a lulav once you’ve shaken it', why },
      { t: 'Take it off, put it on again, and bless', why },
    ], why);
    if (!ok) { if (loseLife(why)) return; } else { s.score += 15; lesson('Forgot the bracha before tightening? Bless while it’s on: every second is a mitzvah (#57).'); }
    finishArm();
  }
  function finishArm() {
    const c = STAND_QUEUE[s.i];
    s.stage = null; s.stageName = null; armTag.set('');
    player.camOverride = false; player.frozen = false;
    if (c.arm.after) game.toast(c.arm.after, 'info');
    doRosh();
  }
  async function doRosh() {
    const c = STAND_QUEUE[s.i];
    const v = customers[s.i];
    if (c.rosh) {
      const ok = await ask(c.name, c.rosh.line, c.rosh.options, c.rosh.why);
      if (!ok && loseLife(c.rosh.why)) return;
      if (ok) { s.score += 30; lesson(c.rosh.lesson); }
    }
    v.setTefillin(c.arm.side !== 'none', true);
    v.motion.daven = true;
    burst('hineni', { x: v.position.x, y: 2.2, z: v.position.z });
    say(v, c.name, c.thanks || 'Shema Yisrael…');
    sfx.great(); s.served += 1; s.phase = 'davening'; hud();
    setTimeout(() => { say(v, null); v.motion.daven = false; v.faceTarget = null; v.target = v.home; next(); }, 2600);
  }
  function finish(won) {
    if (s.phase === 'done') return;
    s.phase = 'done'; player.camOverride = false; player.frozen = false; s.stage = null;
    const stars = !won ? 0 : s.lives === 3 ? 3 : s.lives === 2 ? 2 : 1;
    if (won) sfx.great();
    setTimeout(() => game.finish('stand', {
      won, stars, title: won ? 'Every arm, every bracha, every Jew on the corner' : 'The stand closes early today',
      stats: [['Served', `${s.served}/${STAND_QUEUE.length}`], ['Perfect placements', s.perfect], ['Score', s.score], ['Lives left', '♥'.repeat(s.lives) || '0']],
      lessons: [...STAND_LESSONS, ...s.lessons].slice(0, 7), xp: won ? stars * 80 + Math.round(s.score / 4) : 20,
    }), 1200);
  }
  let owned = false;
  return {
    npcs: [kid, ...customers.filter(Boolean)],
    update(dt) {
      for (const v of customers) if (v) steer(v, dt);
      steer(kid, dt);
      if (s.phase === 'done') return;
      if (s.phase === 'walking') {
        const v = customers[s.i];
        if (dist2(v.position, COUNTER) < 0.5) { s.phase = 'ready'; v.faceTarget = { x: VENDOR.x, z: VENDOR.z }; s.objective = `${STAND_QUEUE[s.i].name} is at the stand. Get behind the table and press E.`; hud(); }
      }
      const behind = dist2(player.pos, VENDOR) < 2.6;
      if (s.phase === 'ready' && behind) { owned = true; game.setPrompt(`E · help ${STAND_QUEUE[s.i].name}`); } else if (owned) { owned = false; game.setPrompt(null); }
      if (s.phase === 'ready' && !behind && performance.now() - (s.nudgedAt || 0) > 9000) { s.nudgedAt = performance.now(); say(kid, 'Your kid', 'Abba! Someone’s waiting at the stand!'); setTimeout(() => say(kid, null), 2500); }
      if (s.stage && !G.reaction) {
        const flip = s.arm === 'right' ? -1 : 1;
        if (s.stage === 'place' && s.placedAt == null) {
          s.slide += s.dir * s.speed * dt;
          const lim = ARM_LEN / 2 - BAYIT / 2;
          if (s.slide > lim) { s.slide = lim; s.dir = -1; }
          if (s.slide < -lim) { s.slide = -lim; s.dir = 1; }
        }
        if (s.stage === 'bless') {
          s.tight = Math.min(1, s.tight + dt / (STAND_QUEUE[s.i]?.knot || 2.6));
          if (Math.floor(s.tight * 20) !== Math.floor((s.tight - dt) * 20)) hud();
          if (s.tight >= 1) { s.stage = 'tied'; s.stageName = null; hud(); if (!s.blessed) setTimeout(forgot, 500); else setTimeout(finishArm, 900); }
        }
        const x = s.placedAt ?? s.slide;
        bayit.position.set(x * flip, armTop(x) + 0.31 + (s.placedAt == null ? 0.35 + Math.sin(performance.now() / 160) * 0.05 : 0), 0);
        strap.visible = s.stage !== 'place';
        strap.position.set(x * flip + 0.5 * flip, 1.05, 0);
        const k = 1.35 - 0.35 * s.tight; strap.scale.set(1, k, k);
      }
      if (s.stage) view(new THREE.Vector3(ARM_STAGE.x, 3.2, ARM_STAGE.z + 8.6), new THREE.Vector3(ARM_STAGE.x, 1.6, ARM_STAGE.z), dt);
    },
  };
}

// ── Shiur 5 · The Ward ─────────────────────────────────────────────────────
/** The close-up: a torso, the heart, and both arms as they really are. */
function patientBody(body) {
  const g = new THREE.Group();
  g.add(at(box(1.6, 2.1, 0.8, '#8fc1e3'), 0, 2.25, 0));
  g.add(at(sphere(0.45, SKIN), 0, 3.95, 0));
  g.add(at(sphere(0.12, '#ff3a5a', { basic: true }), 0.32, 2.65, 0.42));
  const { shoulderY, upper, fore, hand } = ARM_GEOM;
  for (const side of ['left', 'right']) {
    const state = side === 'left' ? body.L : body.R;
    const color = ARM_STATES[state].color || SKIN;
    const x = armX(side);
    const elbowY = shoulderY - upper;
    g.add(at(sphere(0.32, state === 'gone' ? '#f4f4f0' : color), x, shoulderY, 0));
    if (state !== 'gone') {
      g.add(at(capsule(0.26, upper - 0.3, color), x, shoulderY - upper / 2, 0));
      const b = at(sphere(0.24, color), x, elbowY + upper * 0.32, 0.12); b.scale.set(1, 1.3, 0.8); g.add(b);
    }
    const foreLen = state === 'bicep' || state === 'gone' ? 0 : state === 'stump' ? fore * 0.45 : fore;
    if (foreLen) g.add(at(capsule(0.21, Math.max(0.05, foreLen - 0.25), color), x, elbowY - foreLen / 2, 0));
    if (foreLen === fore) g.add(at(box(0.32, hand, 0.16, color), x, elbowY - fore - hand / 2, 0));
    if (['gone', 'bicep', 'stump'].includes(state)) g.add(at(sphere(state === 'gone' ? 0.34 : 0.25, '#ffffff'), x, (state === 'gone' ? shoulderY : foreLen ? elbowY - foreLen : elbowY) - 0.05, 0));
    if (state === 'weak') { const sl = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 6, 20, Math.PI), mat('#2c7fb8')); sl.position.set(x, elbowY - 0.25, 0.1); sl.rotation.z = side === 'left' ? 0.5 : -0.5; g.add(sl); }
  }
  return g;
}

function yudKnot() {
  const k = new THREE.Group();
  k.add(box(0.16, 0.16, 0.12, '#0b0b10'));
  k.add(at(box(0.06, 0.04, 0.24, '#ffd84a', { basic: true }), 0, -0.02, 0.17));
  return k;
}

export function ward({ root, d }) {
  spawnPlayer(root, [0, 18], { yad: true, rosh: true });
  const PATIENTS = WARD_QUEUE.filter((c) => c.kind === 'patient');
  const s = { i: -1, phase: 'intro', lives: 3, served: 0, score: 0, perfect: 0, lessons: [], angle: 0, speed: 2.4, stage: null, knotArm: null };
  const agents = PATIENTS.map((p, k) => { const b = BEDS[k]; const v = makeNpc(root, { x: b.x - b.side * 0.9, z: b.z, speed: 0, look: p.look, name: p.name }); v.faceTarget = { x: 0, z: b.z }; v.patient = p; v.tag = label(v, { y: 2.3, style: 'border-color:#ff9ccc;color:#ff9ccc' }); return v; });
  const extras = BEDS.slice(PATIENTS.length).map((b, k) => { const v = makeNpc(root, { x: b.x - b.side * 0.9, z: b.z, speed: 0, look: { robe: ['#8fc1e3', '#d9d9e3', '#4a5a32'][k % 3], kippah: '#111', beard: k % 2 ? '#3a2a1a' : null } }); v.faceTarget = { x: 0, z: b.z }; v.motion.daven = k % 2 === 0; return v; });
  const nurse = makeNpc(root, { x: 3, z: -17, speed: 1.4, look: { robe: '#5fb3c9', kippah: '#5fb3c9', skin: '#e3bf9a' }, name: 'Nurse' });
  const chav = makeNpc(root, { x: -2, z: 14, speed: 1.8, look: LOOKS.shmerel, name: 'Your chavruta' });
  d.add(() => { for (const v of [...agents, nurse, chav]) { v.bubble?.remove(); v.tag?.remove(); } });
  const stage = new THREE.Group(); stage.position.set(BODY_STAGE.x, BODY_STAGE.y, BODY_STAGE.z); root.add(stage);
  let bodyMesh = null;
  const bayitMesh = new THREE.Group(); bayitMesh.add(box(0.32, 0.32, 0.32, '#050507')); bayitMesh.add(at(box(0.46, 0.04, 0.46, '#050507'), 0, -0.17, -0.02)); bayitMesh.visible = false; stage.add(bayitMesh);
  const knot = yudKnot(); knot.visible = false; stage.add(knot);
  const tags = ['left', 'right'].map((side) => label(() => new THREE.Vector3(BODY_STAGE.x + armX(side) * 1.55, 0.6, BODY_STAGE.z + 0.6), { className: 'tt-tag lt-sign', y: 0 }));
  const heartTag = label(() => new THREE.Vector3(BODY_STAGE.x + 0.32, 3, BODY_STAGE.z + 0.5), { className: 'tt-tag', y: 0, style: 'color:#ff7a8a;border-color:#ff7a8a' });
  d.add(() => { for (const t of [...tags, heartTag]) t.remove(); });

  const hud = (patch = {}) => game.setHud({ lives: s.lives, served: s.served, total: WARD_QUEUE.length, score: s.score, objective: s.objective, stage: s.stageName, ...patch });
  const lesson = (t) => { if (t && !s.lessons.includes(t)) s.lessons.push(t); };
  const patientAgent = (c) => agents[PATIENTS.indexOf(c)];
  function loseLife(msg) { s.lives -= 1; bad(msg); lesson(msg); hud(); if (s.lives <= 0) { finish(false); return true; } return false; }
  s.objective = 'Tefillin rounds. The first patient is waiting by his bed.';
  hud();
  game.toast('Shiur 5 · The Ward. You bring tefillin to soldiers and patients, bed by bed.', 'info');
  say(chav, 'Your chavruta', 'Most of them can’t tie it themselves. The mitzvah is that it’s tied on them: we tie.');
  const t0 = setTimeout(() => { say(chav, null); next(); }, 3600);
  d.add(() => clearTimeout(t0));

  function showBody(c) {
    if (bodyMesh) stage.remove(bodyMesh);
    bodyMesh = c ? patientBody(c.body) : null;
    if (bodyMesh) stage.add(bodyMesh);
    tags[0].set(c ? `HIS LEFT · <span lang="he">שְׂמֹאל</span><br><small>${ARM_STATES[c.body.L].label}</small>` : '');
    tags[1].set(c ? `HIS RIGHT · <span lang="he">יָמִין</span><br><small>${ARM_STATES[c.body.R].label}</small>` : '');
    heartTag.set(c ? '♥ heart' : '');
  }
  function next() {
    if (s.phase === 'done') return;
    s.i += 1;
    const c = WARD_QUEUE[s.i];
    if (!c) return finish(true);
    if (c.kind === 'shaila') {
      s.phase = 'shaila'; s.objective = c.title; hud();
      const speaker = c.who === 'The ward nurse' ? nurse : chav;
      say(speaker, c.who, c.line.replace(/[“”]/g, ''));
      setTimeout(async () => {
        const o = await pick(c.who, c.line, c.options, { why: c.why });
        say(speaker, null);
        if (!o.ok && loseLife(c.why)) return;
        if (o.ok) { s.score += 40; lesson(c.lesson); }
        s.served += 1; hud(); setTimeout(next, 800);
      }, 700);
      return;
    }
    s.phase = 'ready'; s.objective = `${c.name} is waiting by his bed. Walk over and press E.`; hud();
  }
  async function serve() {
    const c = WARD_QUEUE[s.i];
    const v = patientAgent(c);
    s.phase = 'serving'; v.motion.talk = true;
    player.camOverride = true; player.frozen = true;
    showBody(c);
    s.stage = 'look'; s.stageName = 'look';
    s.objective = `${c.name}: look at both arms. Which arm, and a bracha or not?`; hud();
    await new Promise((r) => setTimeout(r, 900));
    const armPick = await pick(c.name, c.line, ARM_CHOICES, { keepOrder: true });
    let bracha = null;
    if (armPick.id !== 'none') bracha = (await pick(c.name, armPick.id === 'left' ? 'On the left arm. And the bracha?' : 'On the right arm. And the bracha?', BRACHA_CHOICES, { keepOrder: true })).id === 'yes';
    v.motion.talk = false;
    const verdict = judgeWard(c, armPick.id, bracha);
    if (verdict.ok) { s.score += 60; good(c.why, 20); lesson(c.why.split(':')[0]); }
    else if (loseLife(verdict.reason ? `${verdict.reason} ${c.why}` : c.why)) return;
    const real = verdict.ok ? armPick.id : c.accept[0][0];
    if (real !== 'none') {
      s.knotArm = real; s.angle = Math.random() * Math.PI * 2; s.speed = 2.2 + s.served * 0.12;
      bayitMesh.position.set(armX(real), ARM_GEOM.bayitY, 0.3); bayitMesh.visible = true; knot.visible = true;
      s.stage = 'knot'; s.stageName = 'knot';
      s.objective = 'Tie the yud: press E when its leg points to the heart, right against the bayit.'; hud();
      return;
    }
    afterArm();
  }
  d.on('action', () => {
    if (G.reaction) return;
    if (s.phase === 'ready') { const v = patientAgent(WARD_QUEUE[s.i]); if (v && dist2(player.pos, v.position) < 2.8) serve(); return; }
    if (s.stage !== 'knot' || s.phase !== 'serving') return;
    const deg = Math.round((knotError(s.angle, s.knotArm) * 180) / Math.PI);
    burst(deg < 35 ? 'hineni' : 'hefsek', { x: BODY_STAGE.x + armX(s.knotArm), y: ARM_GEOM.bayitY + 0.5, z: BODY_STAGE.z + 0.6 });
    if (deg < 15) { s.score += 50; s.perfect += 1; game.toast('The yud’s leg points straight at the heart, snug against the bayit (Beit Yosef, #81).', 'good'); sfx.good(); }
    else if (deg < 35) { s.score += 25; sfx.collect(); game.toast(`Close: ${deg}° off. Kosher, but aim the leg right at the heart.`, 'info'); }
    else if (loseLife('The knot faces inward, toward the heart: “kesher shel tefillin tzarich lihiyot kelapei panim” (Menachot 35b, Beit Yosef #81), so the Torah’s words “on your heart” are kept.')) return;
    s.stage = 'look'; s.stageName = null; hud();
    setTimeout(afterArm, 700);
  });
  async function afterArm() {
    const c = WARD_QUEUE[s.i];
    const v = patientAgent(c);
    if (c.rosh) {
      const q = c.rosh === 'ROSH' ? { ...LONE_ROSH[G.minhag], lesson: 'The shel yad and shel rosh are two mitzvot: no arm, still the shel rosh, with its brachot (Shulchan Aruch and Rema 26:1).' } : c.rosh;
      const o = await pick(c.name, q.line, q.options, { why: q.why });
      if (!o.ok && loseLife(q.why)) return;
      if (o.ok) { s.score += 30; lesson(q.lesson); }
    }
    s.stage = null; s.knotArm = null; bayitMesh.visible = false; knot.visible = false; showBody(null);
    player.camOverride = false; player.frozen = false;
    v.setTefillin(c.accept[0][0] !== 'none', true);
    v.motion.daven = true;
    burst('hineni', { x: v.position.x, y: 2.2, z: v.position.z });
    say(v, c.name, c.thanks || 'Shema Yisrael…');
    sfx.great(); s.served += 1; s.phase = 'davening'; hud();
    setTimeout(() => { say(v, null); next(); }, 2400);
  }
  function finish(won) {
    if (s.phase === 'done') return;
    s.phase = 'done'; player.camOverride = false; player.frozen = false; s.stage = null; showBody(null);
    const stars = !won ? 0 : s.lives === 3 ? 3 : s.lives === 2 ? 2 : 1;
    if (won) sfx.great();
    setTimeout(() => game.finish('ward', {
      won, stars, title: won ? 'Every arm that’s left, and every yud on the heart' : 'Rounds end early today',
      stats: [['Patients and shailos', `${s.served}/${WARD_QUEUE.length}`], ['Perfect yuds', s.perfect], ['Score', s.score], ['Lives left', '♥'.repeat(s.lives) || '0']],
      lessons: [...WARD_LESSONS, ...s.lessons].slice(0, 8), xp: won ? stars * 90 + Math.round(s.score / 4) : 20,
    }), 1200);
  }
  let owned = false;
  return {
    npcs: [...agents, ...extras, nurse, chav],
    debug: () => ({ angle: s.angle, arm: s.knotArm }),
    update(dt) {
      for (const v of [...agents, ...extras, nurse, chav]) steer(v, dt);
      const c = WARD_QUEUE[s.i];
      const v = c?.kind === 'patient' ? patientAgent(c) : null;
      for (const a of agents) a.tag.set(a === v && s.phase === 'ready' ? a.name : '');
      const near = v && dist2(player.pos, v.position) < 2.8;
      if (s.phase === 'ready' && near) { owned = true; game.setPrompt(`E · tefillin for ${c.name}`); } else if (owned) { owned = false; game.setPrompt(null); }
      if (s.stage === 'knot' && !G.reaction) s.angle = (s.angle + s.speed * dt) % (Math.PI * 2);
      if (s.knotArm) {
        knot.position.set(armX(s.knotArm) + Math.sin(s.angle) * ARM_GEOM.knotR, ARM_GEOM.bayitY - 0.05, Math.cos(s.angle) * ARM_GEOM.knotR);
        knot.rotation.y = s.angle;
      }
      if (s.stage) view(new THREE.Vector3(BODY_STAGE.x, 2.4, BODY_STAGE.z + 9.2), new THREE.Vector3(BODY_STAGE.x, 1.2, BODY_STAGE.z), dt);
    },
  };
}

// ── Shiur 6 · The Checkpoint ───────────────────────────────────────────────
export const GATE = { x: 0, z: 19.4 };
export const PODIUM = { x: 3.1, z: 20.6 };
const DOOR = { x: 0, z: 23.3 };
// Where the scanner's flag lights up on a person (height above the floor, sideways offset).
export const SPOTS = { arm: [1.35, -0.42], head: [2.05, 0], bayit: [1.4, -0.42], wrist: [0.95, -0.45], hair: [2.12, 0] };

export function check({ root, d }) {
  spawnPlayer(root, [PODIUM.x, PODIUM.z - 1.3], { yad: true, rosh: true });
  const s = { i: -1, phase: 'intro', lives: 3, done: 0, score: 0, lessons: [], scanT: 0 };
  // the scanner arch, its beam and the flag marker
  const arch = new THREE.Group(); arch.position.set(GATE.x, 0, GATE.z); root.add(arch);
  for (const x of [-1.3, 1.3]) arch.add(at(box(0.3, 2.8, 0.5, '#c9d3db'), x, 1.4, 0));
  arch.add(at(box(2.9, 0.35, 0.5, '#c9d3db'), 0, 2.95, 0));
  arch.add(at(box(2.2, 0.1, 0.1, '#5ad1ff', { basic: true }), 0, 2.75, 0.26));
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.08), mat('#5ad1ff', { basic: true, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  beam.rotation.x = -Math.PI / 2; beam.visible = false; arch.add(beam);
  const flag = sphere(0.16, '#ff5ad1', { basic: true }); flag.visible = false; root.add(flag);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 24), mat('#ff5ad1', { basic: true })); flag.add(ring);
  root.add(at(box(1, 1.1, 0.6, '#5a3a20'), PODIUM.x, 0.55, PODIUM.z)); // your podium
  const sofer = makeNpc(root, { x: -3.4, z: 21.5, speed: 0, look: { robe: '#1d2433', kippah: '#111', beard: '#5a3a22' }, name: 'The sofer' });
  sofer.faceTarget = { x: GATE.x, z: GATE.z };
  const chav = makeNpc(root, { x: 5.2, z: 21.8, speed: 0, look: LOOKS.shmerel, name: 'Your chavruta' });
  chav.faceTarget = { x: GATE.x, z: GATE.z };
  const people = CHECK_QUEUE.map((c, k) => {
    if (c.kind !== 'scan') return null;
    const v = makeNpc(root, { x: DOOR.x + (k % 2 ? 1.2 : -1.2), z: DOOR.z, speed: 2.6, wander: false, look: c.look, name: c.name });
    v.mode = 'still'; v.visible = false;
    return v;
  });
  const flagTag = label(flag, { className: 'tt-tag', y: 0.45, style: 'border-color:#ff5ad1;color:#ff9ce6' });
  d.add(() => { flagTag.remove(); for (const v of [...people, sofer, chav]) v?.bubble?.remove(); });
  const extraBoxes = [{ x: -1.3, z: GATE.z, hx: 0.2, hz: 0.3 }, { x: 1.3, z: GATE.z, hx: 0.2, hz: 0.3 }, { x: PODIUM.x, z: PODIUM.z, hx: 0.5, hz: 0.3 }];

  const hud = (patch = {}) => game.setHud({ lives: s.lives, served: s.done, total: CHECK_QUEUE.length, score: s.score, objective: s.objective, stage: s.stage, ...patch });
  const lesson = (t) => { if (t && !s.lessons.includes(t)) s.lessons.push(t); };
  function loseLife(msg) { s.lives -= 1; bad(msg); lesson(msg); hud(); if (s.lives <= 0) { finish(false); return true; } return false; }
  s.objective = 'Shiur 6 · The Checkpoint. Stand at your podium by the scanner.';
  hud();
  game.toast('Shiur 6 · Chatzitzah. Everyone walks through the scanner on the way into shul; you rule on what it finds.', 'info');
  say(chav, 'Your chavruta', 'No Gemara says chatzitzah for tefillin. The Rosh learns it from the pesukim; the Rashba says there isn’t any. Let’s see what walks in.');
  const t0 = setTimeout(() => { say(chav, null); next(); }, 3800);
  d.add(() => clearTimeout(t0));

  function next() {
    if (s.phase === 'done') return;
    s.i += 1;
    const c = CHECK_QUEUE[s.i];
    if (!c) return finish(true);
    if (c.kind === 'shaila') {
      s.phase = 'shaila'; s.objective = c.title; hud();
      const speaker = c.who === 'The sofer at the door' ? sofer : chav;
      say(speaker, c.who, c.line.replace(/[“”]/g, ''));
      setTimeout(async () => {
        const o = await pick(c.who, c.line, c.options, { why: c.why });
        say(speaker, null);
        if (!o.ok && loseLife(c.why)) return;
        if (o.ok) { s.score += 40; lesson(c.lesson); }
        s.done += 1; hud(); setTimeout(next, 800);
      }, 700);
      return;
    }
    const v = people[s.i];
    v.visible = true; v.mode = 'arrive'; v.target = { x: GATE.x, z: GATE.z + 0.1 };
    s.phase = 'walking'; s.objective = `${c.name} is coming through the door.`; hud();
  }
  async function scan() {
    const c = CHECK_QUEUE[s.i];
    const v = people[s.i];
    s.phase = 'scanning'; s.stage = 'scan'; s.scanT = 0;
    beam.visible = true; sfx.pulse();
    player.camOverride = true; player.frozen = true;
    s.objective = `Scanning ${c.name}…`; hud();
    await new Promise((r) => setTimeout(r, 1500));
    beam.visible = false;
    const [y, side] = SPOTS[c.flag.spot];
    v.updateMatrixWorld(true);
    flag.position.copy(v.localToWorld(new THREE.Vector3(side, y, 0.32)));
    flag.visible = true; flagTag.set(`⚠ ${c.flag.what}`);
    sfx.buzz();
    v.motion.talk = true;
    s.objective = `${c.name}: ${c.flag.what}. Your ruling?`; hud();
    const o = await pick(c.name, c.line, c.options, { why: c.why, xp: 20 });
    v.motion.talk = false;
    flag.visible = false; flagTag.set('');
    if (!o.ok) { if (loseLife(c.why)) return; } else { s.score += 60; lesson(c.lesson); }
    player.camOverride = false; player.frozen = false; s.stage = null;
    v.setTefillin(true, true); v.motion.daven = true;
    burst('hineni', { x: v.position.x, y: 2.2, z: v.position.z });
    v.faceTarget = null; v.mode = 'arrive'; v.target = { x: (s.i % 2 ? 1 : -1) * 1.6, z: 10 - (s.i % 4) * 4 };
    s.done += 1; s.phase = 'between'; hud();
    setTimeout(next, 1400);
  }
  d.on('action', () => {
    if (G.reaction || s.phase !== 'ready') return;
    if (dist2(player.pos, PODIUM) < 2.4 || dist2(player.pos, GATE) < 3) scan();
  });
  function finish(won) {
    if (s.phase === 'done') return;
    s.phase = 'done'; player.camOverride = false; player.frozen = false; s.stage = null;
    const stars = !won ? 0 : s.lives === 3 ? 3 : s.lives === 2 ? 2 : 1;
    if (won) sfx.great();
    setTimeout(() => game.finish('check', {
      won, stars, title: won ? 'Nothing in between: the yud home, the shul full' : 'The checkpoint closes early',
      stats: [['Scans and shailos', `${s.done}/${CHECK_QUEUE.length}`], ['Score', s.score], ['Lives left', '♥'.repeat(s.lives) || '0']],
      lessons: [...CHECK_LESSONS, ...s.lessons].slice(0, 8), xp: won ? stars * 90 + Math.round(s.score / 4) : 20,
    }), 1200);
  }
  let owned = false;
  return {
    npcs: [sofer, chav],
    boxes: extraBoxes,
    update(dt) {
      for (const v of people) if (v?.visible) steer(v, dt);
      steer(sofer, dt); steer(chav, dt);
      ring.rotation.y += dt * 4;
      if (s.phase === 'done') return;
      const c = CHECK_QUEUE[s.i];
      if (s.phase === 'walking' && dist2(people[s.i].position, GATE) < 0.35) {
        s.phase = 'ready'; people[s.i].faceTarget = { x: GATE.x, z: GATE.z - 6 };
        s.objective = `${c.name} is in the scanner. Press E at your podium to scan.`; hud();
      }
      const nearPodium = dist2(player.pos, PODIUM) < 2.4 || dist2(player.pos, GATE) < 3;
      if (s.phase === 'ready' && nearPodium) { owned = true; game.setPrompt(`E · scan ${c.name}`); } else if (owned) { owned = false; game.setPrompt(null); }
      if (beam.visible) { s.scanT += dt; beam.position.y = 0.1 + Math.abs(Math.sin(s.scanT * 4)) * 2.5; }
      if (s.stage === 'scan') view(new THREE.Vector3(GATE.x + 1.8, 2.9, GATE.z - 6.5), new THREE.Vector3(GATE.x, 1.3, GATE.z), dt);
    },
  };
}
