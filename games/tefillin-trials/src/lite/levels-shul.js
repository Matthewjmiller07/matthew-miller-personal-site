// Hineni Lite: the shul levels. The hub (poskim and portals) and Shiur 3's three trials: the
// Hefsek Gauntlet, Bracha Catch and Hum or Hush. Same rules and content as the full game.
import * as THREE from 'three';
import { G, game } from './state.js';
import { player, spawnPlayer, makeNpc, steer, say, label, burst, shuffle, dist2, humming, at, box, sphere, cyl, mat } from './engine.js';
import { good, bad, ask, portal } from './common.js';
import { POSKIM, WHO_SAID, ENCOUNTERS, RECOVERY, TOKENS, ROUNDS, SHIURIM } from '../content.js';
import { BENCHES } from '../layout.js';
import { sfx, humNote } from '../audio.js';

const LOOKS = {
  shmerel: { robe: '#7a3b2e', kippah: '#e0b54a', beard: '#5a3a22', skin: '#f0cfa8' },
  kid: { robe: '#e0b54a', kippah: '#c0392b', scale: 0.62, skin: '#f3d2b0' },
  rav: { robe: '#101218', hat: 'fedora', beard: '#d9d9d9', skin: '#e3bf9a' },
  gabbai: { robe: '#2e5d4b', kippah: '#111', beard: '#2a1c12', skin: '#d9a77c' },
  chazan: { robe: '#e7e9f0', hat: 'fedora', tallit: true, beard: '#3a2a1a', skin: '#e8c39e' },
  host: { robe: '#30245a', kippah: '#fff', beard: '#6b4a2b', skin: '#eac5a0' },
};
export { LOOKS };
const ROBES = ['#101218', '#1d2433', '#2a2a2a', '#3a2e22', '#1b2a3a', '#26202e'];
const LEVEL_COLOR = Object.fromEntries(SHIURIM.flatMap((s) => s.levels.map((l) => [l.id, { ...l, shiur: s.shiur, he: s.he }])));

function freeSpot() {
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() * 2 - 1) * 15, z = (Math.random() * 2 - 1) * 19;
    if (BENCHES.every(([bx, bz]) => Math.abs(bx - x) > 3.3 || Math.abs(bz - z) > 1)) if (Math.hypot(x, z) > 4.2) return [x, z];
  }
  return [0, 10];
}

// ── The hub ─────────────────────────────────────────────────────────────────
export function hub({ root, d }) {
  spawnPlayer(root, [0, 19], { yad: true, rosh: true });
  const poskim = WHO_SAID.map((w, i) => {
    const p = POSKIM[w.who];
    const [x, z] = freeSpot();
    const old = /Rav|Rabbi|Chaim|Steipler|Chafetz|Moshe|Elyashiv|Yosef|Mahari|Akiva|Maor|Ran|Megadim|Magen/.test(p.name);
    const v = makeNpc(root, { x, z, speed: 1.1, name: p.name, look: { robe: ROBES[i % ROBES.length], hat: old ? 'fedora' : 'kippah', kippah: p.color, beard: old ? (i % 3 ? '#e2e2e2' : '#3b2a1a') : null, tallit: i % 4 === 0 } });
    v.uid = w.who; v.saying = w.t; v.color = p.color; v.motion.daven = Math.random() < 0.4;
    v.tag = label(v, { y: 2.3, style: `border-color:${p.color};color:${p.color}` });
    d.add(() => { v.tag.remove(); v.bubble?.remove(); });
    return v;
  });
  const kid = makeNpc(root, { x: 3, z: 6, speed: 4.5, look: LOOKS.kid });
  const chazan = makeNpc(root, { x: 0, z: -0.8, speed: 0, look: LOOKS.chazan });
  chazan.position.y = 1.2; chazan.motion.daven = true; chazan.faceTarget = { x: 0, z: -24 };
  const portals = [
    ['gauntlet', -12, 20.5], ['catch', 12, 20.5], ['table', -12, -20], ['stand', 12, -20], ['ward', -12, 0], ['check', 12, 0],
  ].map(([id, x, z]) => { const l = LEVEL_COLOR[id]; return l && portal(root, d, { x, z, color: l.color, title: `Shiur ${l.shiur} · ${l.name}`, he: l.he, stars: G.stars[id] || 0, onEnter: () => game.go(id) }); }).filter(Boolean);
  let near = null;
  d.on('action', () => {
    if (!near || G.reaction) return;
    const v = near;
    v.talkUntil = performance.now() + 7000;
    say(v, v.name, v.saying);
    sfx.talk();
    if (game.learn(v.uid)) {
      sfx.collect();
      burst('collect', { x: v.position.x, y: 2, z: v.position.z });
      game.toast(`+20 XP · ${v.name} joins your sefer (${G.sayings.length}/${WHO_SAID.length})`);
    }
  });
  let owned = false;
  return {
    npcs: [...poskim, kid],
    update(dt) {
      let best = null, bd = 2.2;
      for (const v of poskim) {
        const talking = v.talkUntil > performance.now();
        if (!talking && v.bubble?.html) say(v, null);
        v.mode = talking ? 'still' : 'wander';
        v.faceTarget = talking ? player.pos : null;
        v.motion.talk = talking;
        steer(v, dt);
        const dd = dist2(v.position, player.pos);
        if (dd < bd) { best = v; bd = dd; }
      }
      for (const v of poskim) v.tag.set(v === best ? v.name : '');
      steer(kid, dt); steer(chazan, dt);
      near = best;
      for (const p of portals) p.update(dt);
      if (best) { owned = true; game.setPrompt(`E · ask ${best.name}`); } else if (owned) { owned = false; game.setPrompt(null); }
    },
  };
}

// ── The Hefsek Gauntlet ────────────────────────────────────────────────────
const KADDISH_AT = 26, KADDISH_LEN = 9;
export function gauntlet({ root, d }) {
  spawnPlayer(root, [12, 20], { yad: true, rosh: false });
  const s = { t: 0, hearts: 3, hineni: 60, spoke: false, phase: 'intro', kavana: 0, lessons: [], busy: false, pulseReady: 0, ritual: { shift: false, mitzvat: false, tight: 0 }, lastPhone: 0 };
  const npc = (o, kind) => { const v = makeNpc(root, o); v.kind = kind; v.home = { x: o.x, z: o.z }; v.tag = label(v, { y: 2.3 * (o.look.scale || 1), style: 'border-color:#ff8a7a;color:#ff8a7a', html: o.name }); d.add(() => { v.tag.remove(); v.bubble?.remove(); }); return v; };
  const shmerel = npc({ x: -5, z: 9, speed: 3.3, look: LOOKS.shmerel, name: 'Shmerel' }, 'friend');
  const kid = npc({ x: 9, z: -5, speed: 5.2, look: LOOKS.kid, name: 'Your kid' }, 'kid');
  const rav = npc({ x: 0, z: 23, speed: 2.7, look: LOOKS.rav, name: 'The Rav', wander: false }, 'rabbi');
  rav.mode = 'still';
  const gabbai = npc({ x: -9, z: -19, speed: 2.1, look: LOOKS.gabbai, name: 'Gabbai · your shel rosh' }, 'gabbai');
  gabbai.tag.el.style.cssText = 'border-color:#ffd84a;color:#ffd84a';
  gabbai.mode = 'flee';
  const chazan = makeNpc(root, { x: 0, z: -0.8, speed: 0, look: LOOKS.chazan });
  chazan.position.y = 1.2; chazan.motion.daven = true; chazan.faceTarget = { x: 0, z: -24 };
  d.add(() => chazan.bubble?.remove());
  const davening = shuffle(BENCHES).slice(0, 9).map(([x, z], i) => {
    const v = makeNpc(root, { x: x + (x < 0 ? 3.1 : -3.1), z: z - 0.6, speed: 0, look: { robe: ['#e7e9f0', '#1d2433', '#2a2a2a'][i % 3], tallit: true, yad: true, rosh: true, hat: i % 2 ? 'kippah' : 'fedora', beard: i % 3 ? '#3a2a1a' : null } });
    v.motion.daven = true; v.faceTarget = { x: 0, z: -24 };
    return v;
  });
  const chasers = [shmerel, kid, rav];
  const bagMesh = box(0.38, 0.28, 0.14, '#7a3cff', { basic: true });
  root.add(bagMesh);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 12, 12, 1, true), mat('#ffd84a', { basic: true, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
  root.add(beacon);
  const phones = [];
  const lesson = (t) => { if (t && !s.lessons.includes(t)) s.lessons.push(t); };
  const hud = () => game.setHud({
    hearts: s.hearts, hineni: Math.round(s.hineni), time: s.t, spoke: s.spoke, kaddish: s.phase === 'kaddish', kavana: s.kavana,
    ritual: s.phase === 'ritual' ? { ...s.ritual } : null,
    objective: s.phase === 'ritual' ? 'Put on the shel rosh, the right way' : 'Get your shel rosh from the Gabbai. Don’t talk!',
  });

  const end = (won) => {
    s.phase = 'done';
    const stars = !won ? 0 : s.hearts === 3 && s.t < 100 ? 3 : s.hearts >= 2 ? 2 : 1;
    if (won) { sfx.great(); for (let i = 0; i < 5; i++) setTimeout(() => burst('firework', { x: player.pos.x + (Math.random() - 0.5) * 8, y: 5, z: player.pos.z - 3 }), i * 260); }
    setTimeout(() => game.finish('gauntlet', {
      won, stars, title: won ? 'Shel rosh on. Hineni.' : 'Too many hefsekim',
      stats: [['Time between shel yad and shel rosh', `${Math.round(s.t)}s`], ['Hearts left', '♥'.repeat(s.hearts) || '0'], ['Hineni meter', `${Math.round(s.hineni)}%`], ['Kavana during Kaddish', `${s.kavana.toFixed(1)}s`]],
      lessons: s.lessons.slice(0, 6), xp: won ? stars * 80 + Math.round(s.hineni) + Math.round(s.kavana * 4) : 20,
    }), won ? 1600 : 900);
  };
  async function hefsek(why) {
    s.hearts -= 1; s.spoke = true; lesson(why); hud();
    if (s.hearts <= 0) { end(false); return; }
    const r = RECOVERY[G.minhag];
    await new Promise((resolve) => game.setReaction({
      who: 'Hefsek!', line: r.q, options: shuffle(r.options),
      onPick: (o) => { game.setReaction(null); if (o.ok) good(r.why, 10); else { bad(r.why); s.hineni -= 10; } lesson(r.why); resolve(); },
    }));
  }
  async function encounter(c) {
    s.busy = true; c.resolved = true; c.mode = 'still'; c.vel.set(0, 0, 0); c.faceTarget = player.pos; c.motion.talk = true;
    c.tag.set('');
    say(c, c.name, ENCOUNTERS[c.kind].line.replace(/[“”]/g, ''));
    const ok = await ask(c.kind);
    say(c, null); c.motion.talk = false; c.motion.wave = false;
    if (ok) { s.hineni = Math.min(100, s.hineni + 8); lesson(ENCOUNTERS[c.kind].why); } else await hefsek(ENCOUNTERS[c.kind].why);
    c.faceTarget = null; c.speed = 2; c.mode = 'arrive'; c.target = c.home;
    setTimeout(() => { c.motion.daven = true; }, 3000);
    s.busy = false; hud();
  }
  async function reachGabbai() {
    s.busy = true;
    gabbai.mode = 'still'; gabbai.vel.set(0, 0, 0); gabbai.faceTarget = player.pos;
    say(gabbai, 'Gabbai', 'Is this yours?');
    const ok = await ask('gabbai');
    say(gabbai, null);
    if (ok) lesson(ENCOUNTERS.gabbai.why); else await hefsek('Asking about his kids isn’t for the tefillin: that’s a hefsek.');
    if (s.phase === 'done') return;
    gabbai.hasBag = false; gabbai.tag.set('');
    player.frozen = true;
    if (await ask('kiss')) { s.hineni = Math.min(100, s.hineni + 5); lesson(ENCOUNTERS.kiss.why); }
    s.phase = 'ritual'; s.busy = false; hud();
    game.toast(`${G.minhag === 'ashkenaz' ? 'Ashkenazi' : 'Sefardi'}${s.spoke ? ', and you talked' : ''}: which brachot now?`, 'info');
  }
  hud();
  const t0 = setTimeout(async () => {
    if (await ask('sleeve')) lesson(ENCOUNTERS.sleeve.why);
    s.phase = 'run'; hud();
    game.toast('Go! The Gabbai has your shel rosh. Space = Do Not Disturb pulse.', 'info');
  }, 900);
  d.add(() => clearTimeout(t0));

  d.on('pulse', () => {
    if (s.phase !== 'run' && s.phase !== 'kaddish') return;
    const now = performance.now();
    if (now < s.pulseReady) return;
    s.pulseReady = now + 2200;
    sfx.pulse();
    burst('pulse', { x: player.pos.x, y: 0.6, z: player.pos.z });
    for (const p of phones) {
      const dx = p.mesh.position.x - player.pos.x, dz = p.mesh.position.z - player.pos.z, dd = Math.hypot(dx, dz);
      if (dd < 8) { p.v.set((dx / dd) * 9 * (1 - dd / 10), 3.5, (dz / dd) * 9 * (1 - dd / 10)); p.dead = true; }
    }
    game.setHud({ pulseAt: now + 2200 });
  });
  d.on('amen', () => {
    if (s.phase !== 'kaddish' || s.busy) return;
    s.busy = true; bad(ENCOUNTERS.kaddish.options[1].why);
    hefsek(ENCOUNTERS.kaddish.options[1].why).then(() => { s.busy = false; });
  });
  const need = () => ({ shift: G.minhag === 'ashkenaz' && s.spoke, mitzvat: G.minhag === 'ashkenaz' || s.spoke, baruch: G.minhag === 'ashkenaz' });
  const ritualErr = (msg) => { bad(msg); lesson(msg); s.hearts -= 1; hud(); if (s.hearts <= 0) end(false); };
  d.on('shift', () => {
    if (s.phase !== 'ritual') return;
    const n = need();
    if (!n.shift) return ritualErr(G.minhag === 'ashkenaz' ? 'You didn’t talk, so your first lehaniach still covers the shel rosh. Saying it again is a bracha she’eina tzricha.' : 'Sefardim don’t repeat lehaniach. After talking, just say al mitzvat on the shel rosh (Shulchan Aruch 25:9).');
    if (s.ritual.mitzvat) return ritualErr('Order! Shel yad first: shift it and say lehaniach, then al mitzvat (Shevet HaLevi).');
    s.ritual.shift = true; good('Shel yad shifted, knot re-tightened, “lehaniach tefillin.” Now it covers both again (Mishnah Berurah 25:32).', 10); hud();
  });
  d.on('mitzvat', () => {
    if (s.phase !== 'ritual') return;
    const n = need();
    if (!n.mitzvat) return ritualErr('Sefardi, no talking: the one lehaniach already covered the shel rosh. Al mitzvat would be a bracha she’eina tzricha (Shulchan Aruch 25:5).');
    if (n.shift && !s.ritual.shift) return ritualErr('You talked: first shift the shel yad and say lehaniach (Mishnah Berurah 25:32; Shevet HaLevi).');
    if (s.ritual.tight >= 1) return ritualErr('The bracha comes before you put it on, not after.');
    if (s.ritual.mitzvat) return;
    s.ritual.mitzvat = true; sfx.good(); burst('collect', { x: player.pos.x, y: 2.4, z: player.pos.z });
    game.toast(G.minhag === 'ashkenaz' ? '“...al mitzvat tefillin” (patach: one mitzvah, the shel rosh). Say it quietly; the Kitzur suggests it.' : '“...al mitzvat tefillin”: you talked, so the shel rosh needs its own bracha (Shulchan Aruch 25:9).', 'good');
    hud();
  });
  d.on('action', () => {
    if (s.phase !== 'ritual' || G.reaction) return;
    const n = need();
    if ((n.mitzvat && !s.ritual.mitzvat) || (n.shift && !s.ritual.shift)) { game.toast('Bracha first, then put it on.', 'info'); return; }
    s.ritual.tight = Math.min(1, s.ritual.tight + 0.17);
    sfx.step();
    if (s.ritual.tight >= 1) {
      burst('collect', { x: player.pos.x, y: 2.6, z: player.pos.z });
      player.mesh.setTefillin(true, true);
      if (!n.baruch) { good('Shel rosh on, tight, in place. One bracha did it all. Hineni!', 20); end(true); } else game.toast('Tight and in place. Now: Baruch Shem (B).', 'info');
    }
    hud();
  });
  d.on('bless', () => {
    if (s.phase !== 'ritual') return;
    const n = need();
    if (!n.baruch) { game.toast('Sefardim make one bracha, so there’s no doubt to cover with Baruch Shem here.', 'info'); return; }
    if (!s.ritual.mitzvat) return ritualErr('Baruch Shem goes after the second bracha, once the shel rosh is on.');
    if (s.ritual.tight < 1) return ritualErr(ENCOUNTERS.baruchshem.options[1].why);
    good('“Baruch shem kevod malchuto le’olam va’ed”, after it was tight. Exactly the Mishnah Berurah (25:21).', 20);
    lesson(ENCOUNTERS.baruchshem.why);
    end(true);
  });

  const phoneGeo = new THREE.BoxGeometry(0.4, 0.08, 0.76);
  function spawnPhone() {
    const side = Math.random() < 0.5 ? -1 : 1;
    const from = new THREE.Vector3(side * 16.5, 2 + Math.random(), player.pos.z + (Math.random() - 0.5) * 10);
    const to = player.pos.clone().add(player.vel.clone().multiplyScalar(0.6));
    const v = to.sub(from).setY(0).normalize().multiplyScalar(13).setY(4);
    const mesh = new THREE.Mesh(phoneGeo, mat('#4aa0ff', { basic: true }));
    mesh.position.copy(from);
    root.add(mesh);
    phones.push({ mesh, v, born: performance.now() });
  }

  let pausedKaddish = null;
  return {
    npcs: [...chasers, gabbai, ...davening],
    update(dt) {
      for (const v of [...chasers, gabbai, chazan, ...davening]) steer(v, dt, player.pos);
      // the bag and the beacon
      if (gabbai.hasBag !== false) bagMesh.position.set(gabbai.position.x + 0.35, 1.05, gabbai.position.z + 0.2);
      else bagMesh.position.set(player.pos.x, 0.9 + s.ritual.tight * 0.6 + 1, player.pos.z);
      bagMesh.visible = s.ritual.tight < 1;
      beacon.position.set(gabbai.position.x, 6, gabbai.position.z);
      beacon.visible = gabbai.hasBag !== false;
      // phones fly, bounce and fade
      for (let i = phones.length - 1; i >= 0; i--) {
        const p = phones[i];
        p.v.y -= 20 * dt;
        p.mesh.position.addScaledVector(p.v, dt);
        p.mesh.rotation.x += dt * 6; p.mesh.rotation.z += dt * 4;
        if (p.mesh.position.y < 0.05) { p.mesh.position.y = 0.05; p.v.y *= -0.4; p.v.x *= 0.7; p.v.z *= 0.7; }
        if (!p.dead && !p.hit && dist2(p.mesh.position, player.pos) < 0.7 && p.mesh.position.y < 2) {
          p.hit = true;
          s.hineni = Math.max(0, s.hineni - 12); sfx.buzz(); game.hit(0.4);
          game.toast('BZZZT. Distracted! (−12 Hineni) Press Space for a Do Not Disturb pulse.', 'bad');
          lesson(ENCOUNTERS.phone.why); hud();
        }
        if (performance.now() - p.born > 11000) { root.remove(p.mesh); phones.splice(i, 1); }
      }
      if (s.phase === 'done' || G.reaction) return;
      if (s.phase === 'run' || s.phase === 'kaddish' || s.phase === 'ritual') s.t += dt;
      const now = performance.now();
      if (s.phase === 'run') {
        if (!kid.resolved) {
          kid.cycle = (kid.cycle || 0) + dt;
          const dart = kid.cycle % 4.2 > 1.6;
          kid.mode = dart ? 'pursue' : 'wander'; kid.motion.wave = dart;
        }
        if (s.t > 3 && !shmerel.resolved) shmerel.mode = 'pursue';
        if (s.t > 13 && !rav.resolved && rav.mode === 'still' && !rav.started) { rav.started = true; rav.mode = 'pursue'; game.toast('The Rav just walked in…', 'info'); }
      }
      if (s.phase === 'run' && s.t > KADDISH_AT && !s.kaddishDone) {
        s.phase = 'kaddish'; s.kaddishEnd = s.t + KADDISH_LEN; sfx.kaddish();
        say(chazan, 'Chazan', 'Yitgadal ve’yitkadash shemei rabba…');
        pausedKaddish = [...chasers, gabbai].map((c) => [c, c.mode]);
        for (const c of [...chasers, gabbai]) { c.mode = 'still'; c.faceTarget = { x: 0, z: 0 }; c.motion.daven = true; }
        game.toast('Kaddish! Everyone stops. What do you do?', 'info');
        hud();
      }
      if (s.phase === 'kaddish') {
        if (player.speed < 0.6) s.kavana += dt;
        if (humming() && !s.busy) { s.busy = true; bad(ENCOUNTERS.kaddish.options[2].why); hefsek(ENCOUNTERS.kaddish.options[2].why).then(() => { s.busy = false; }); }
        if (s.t >= s.kaddishEnd) {
          s.phase = 'run'; s.kaddishDone = true; say(chazan, null);
          for (const [c, m] of pausedKaddish) { c.mode = m; c.faceTarget = null; c.motion.daven = !!c.resolved; }
          lesson(ENCOUNTERS.kaddish.why);
          good(`Silent, listening, with kavana (Shulchan Aruch 25:10). Kavana bonus: ${s.kavana.toFixed(1)}s`, Math.round(s.kavana * 3));
          hud();
        }
      }
      if (s.phase === 'run' && s.t > 6 && now - s.lastPhone > 4800) { s.lastPhone = now; spawnPhone(); }
      if (s.phase === 'run' && !s.busy) {
        for (const c of chasers) if (!c.resolved && dist2(c.position, player.pos) < 1.25) { encounter(c); break; }
        if (!s.busy && gabbai.hasBag !== false && dist2(gabbai.position, player.pos) < 1.5) reachGabbai();
      }
      if (s.phase === 'run') s.hineni = Math.min(100, s.hineni + dt * 0.4);
      if (Math.floor(s.t * 5) !== Math.floor((s.t - dt) * 5)) hud();
    },
  };
}

// ── Bracha Catch ───────────────────────────────────────────────────────────
const ARENA = { x: [-13, 13], z: [-20, -4] };
export function bracha({ root, d }) {
  spawnPlayer(root, [6, -8], { yad: true, rosh: false });
  const s = { round: 0, progress: 0, lives: 3, roundT: 0, score: 0, phase: 'intro', bonusUntil: 0, lessons: [], gotBonus: false, lastSpawn: 0 };
  const tokens = [];
  const round = () => ROUNDS[s.round];
  const hud = () => game.setHud({
    round: s.round + 1, rounds: ROUNDS.length, title: round()?.title, need: round()?.need, progress: s.progress,
    lives: s.lives, score: s.score, timeLeft: Math.max(0, (round()?.dodge || 25) - s.roundT), dodge: !!round()?.dodge,
    bonus: s.bonusUntil > performance.now(), objective: round()?.note,
  });
  const clearTokens = () => { for (const t of tokens.splice(0)) { root.remove(t.mesh); t.tag.remove(); } };
  function startRound(i) {
    s.round = i; s.progress = 0; s.roundT = 0; s.phase = 'play'; s.gotBonus = false; s.bonusUntil = 0;
    clearTokens();
    game.toast(`Round ${i + 1}: ${ROUNDS[i].title}`, 'info');
    hud();
  }
  function finishLevel(won) {
    s.phase = 'done'; clearTokens();
    const stars = !won ? 0 : s.lives === 3 ? 3 : s.lives === 2 ? 2 : 1;
    if (won) sfx.great();
    setTimeout(() => game.finish('catch', {
      won, stars, title: won ? 'Rashi and Rabbeinu Tam, both caught' : 'Too many brachot she’einan tzrichot',
      stats: [['Score', s.score], ['Lives left', '♥'.repeat(s.lives) || '0'], ['Rounds cleared', `${won ? ROUNDS.length : s.round}/${ROUNDS.length}`]],
      lessons: ['Rashi: “lo sach, mevarech achat” means one bracha for both; talking adds al mitzvat (#37).', 'Rabbeinu Tam: the shel rosh always gets al mitzvat; talking adds lehaniach (#38).', 'Shulchan Aruch: one bracha. Rema: Ashkenazim make two, plus Baruch Shem.', 'The Gra, the Steipler, the Chazon Ish and Rav Shlomo Zalman made one bracha (#43, #44).', ...s.lessons].slice(0, 6),
      xp: won ? stars * 70 + s.score : 15,
    }), 1200);
  }
  function roundWon() {
    s.score += 50 + Math.max(0, Math.round((25 - s.roundT) * 2));
    good(round().note, 25);
    if (s.round + 1 >= ROUNDS.length) finishLevel(true); else { s.phase = 'between'; setTimeout(() => startRound(s.round + 1), 1800); }
    hud();
  }
  function lose(msg) {
    s.lives -= 1; bad(msg);
    if (!s.lessons.includes(msg)) s.lessons.push(msg);
    hud();
    if (s.lives <= 0) finishLevel(false);
  }
  hud();
  const t0 = setTimeout(() => startRound(0), 1200);
  d.add(() => { clearTimeout(t0); clearTokens(); });
  const geo = new THREE.SphereGeometry(0.42, 16, 12);
  function spawn() {
    const r = round();
    const want = r.need[s.progress];
    let type = want && Math.random() < 0.45 ? want : ['L', 'M', 'B'][Math.floor(Math.random() * 3)];
    if (r.dodge) type = ['L', 'M', 'B'][Math.floor(Math.random() * 3)];
    const target = [ARENA.x[0] + Math.random() * (ARENA.x[1] - ARENA.x[0]), ARENA.z[0] + Math.random() * (ARENA.z[1] - ARENA.z[0])];
    const from = new THREE.Vector3((Math.random() - 0.5) * 3, 6.5, -21.5);
    const mesh = new THREE.Mesh(geo, mat(TOKENS[type].color, { basic: true }));
    mesh.position.copy(from);
    root.add(mesh);
    const tag = label(mesh, { y: 0.9, className: 'tt-tag lt-token', html: `<span lang="he" dir="rtl">${TOKENS[type].he}</span>`, style: `color:${TOKENS[type].color};border-color:${TOKENS[type].color}` });
    tokens.push({ mesh, tag, type, v: new THREE.Vector3((target[0] - from.x) * 0.75, 7, (target[1] - from.z) * 0.75), born: performance.now() });
    if (tokens.length > 14) { const t = tokens.shift(); root.remove(t.mesh); t.tag.remove(); }
  }
  function catchToken(type) {
    const r = round();
    if (r.dodge) return lose('Rabbeinu Tam’s tefillin go on with no bracha. That was a bracha levatala.');
    if (s.bonusUntil) {
      if (type === 'B' && !s.gotBonus) { s.gotBonus = true; s.score += 40; game.toast('+40 · Baruch Shem after it’s all on: “tov lomar” (Rema).', 'good'); }
      else if (type !== 'B') lose(`An extra ${TOKENS[type].en}? That’s a bracha she’eina tzricha (the Ran).`);
      hud(); return;
    }
    const want = r.need[s.progress];
    if (type === want) {
      s.progress += 1; s.score += 20;
      if (s.progress >= r.need.length) {
        if (r.bonus) { s.bonusUntil = performance.now() + 3200; game.toast('All brachot said. Catch a Baruch Shem for a bonus!', 'info'); } else roundWon();
      }
    } else if (type === 'B') lose('Baruch Shem now? Not before the shel rosh is on and tight: it’s a hefsek (Mishnah Berurah 25:21).');
    else lose(`${TOKENS[type].en} isn’t what this shita needs here.`);
    hud();
  }
  return {
    update(dt) {
      for (let i = tokens.length - 1; i >= 0; i--) {
        const t = tokens[i];
        if (G.reaction) break;
        t.v.y -= 20 * dt;
        if (round()?.dodge && s.phase === 'play') { const dx = player.pos.x - t.mesh.position.x, dz = player.pos.z - t.mesh.position.z, dd = Math.hypot(dx, dz) || 1; t.v.x += (dx / dd) * 3.5 * dt; t.v.z += (dz / dd) * 3.5 * dt; }
        t.v.x *= 1 - 0.25 * dt; t.v.z *= 1 - 0.25 * dt;
        t.mesh.position.addScaledVector(t.v, dt);
        const p = t.mesh.position;
        if (p.y < 0.42) { p.y = 0.42; t.v.y = Math.abs(t.v.y) * 0.85; t.v.x *= 0.85; t.v.z *= 0.85; }
        if (Math.abs(p.x) > 17.5) { t.v.x *= -1; p.x = Math.sign(p.x) * 17.5; }
        if (p.z < -23 || p.z > 23) { t.v.z *= -1; p.z = Math.max(-23, Math.min(23, p.z)); }
        if (performance.now() - t.born > 9000) { root.remove(t.mesh); t.tag.remove(); tokens.splice(i, 1); }
      }
      if (s.phase !== 'play' || G.reaction) return;
      s.roundT += dt;
      const r = round();
      const now = performance.now();
      if (now - s.lastSpawn > (r.dodge ? 420 : 650)) { s.lastSpawn = now; spawn(); }
      if (r.dodge) { if (s.roundT >= r.dodge) { roundWon(); return; } }
      else if (s.roundT > 25 && !s.bonusUntil) { lose('Too slow! The shel rosh has to come right after the shel yad (Baal HaMaor, #40).'); if (s.phase === 'play') { s.roundT = 0; s.progress = 0; } }
      if (s.bonusUntil && now > s.bonusUntil) { s.bonusUntil = 0; roundWon(); return; }
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (dist2(t.mesh.position, player.pos) > 1.05 || t.mesh.position.y > 2.6) continue;
        root.remove(t.mesh); t.tag.remove(); tokens.splice(i, 1);
        burst('collect', t.mesh.position); sfx.collect();
        catchToken(t.type);
        break;
      }
      if (Math.floor(s.roundT * 4) !== Math.floor((s.roundT - dt) * 4)) hud();
    },
  };
}

// ── Hum or Hush ────────────────────────────────────────────────────────────
const TABLE_Z = 20.5;
const SINK = [-14.5, 21];
const SEATS = [[-3, 19.3], [0, 19.3], [3, 19.3], [-3, 21.7], [0, 21.7], [3, 21.7]];
export function table({ root, d }) {
  spawnPlayer(root, [-6.4, TABLE_Z], { yad: false, rosh: false });
  const s = { t: 0, phase: 'intro', notes: 0, lives: 3, lastNote: 0, lastPenalty: 0, ate: false, eatBy: 0, lessons: [], queue: [] };
  const host = makeNpc(root, { x: 5.6, z: TABLE_Z, speed: 0, look: LOOKS.host, name: 'Host' });
  host.faceTarget = { x: 0, z: TABLE_Z };
  const guests = SEATS.map(([x, z], i) => {
    const v = makeNpc(root, { x, z, speed: 3, wander: false, look: i === 4 ? LOOKS.kid : { robe: ['#3a2e5a', '#1d2433', '#5a2e2e', '#2e5a4b', '#2a2a2a', '#4a3a1a'][i], kippah: ['#fff', '#111', '#2c5aa0', '#e0b54a', '#111', '#c0392b'][i], beard: i % 2 ? '#3a2a1a' : null } });
    v.seat = { x, z }; v.sink = { x: SINK[0] + 1.2, z: SINK[1] - 1 + (i % 3) * 0.8 };
    v.mode = 'arrive'; v.target = v.seat; v.faceTarget = { x, z: TABLE_Z };
    return v;
  });
  const kid = guests[4];
  d.add(() => { host.bubble?.remove(); kid.bubble?.remove(); });
  // table, candles, challah cover, sink
  root.add(at(box(9.6, 0.08, 1.7, '#f5f1e6'), 0, 0.88, TABLE_Z));
  for (const x of [-0.4, 0.4]) { root.add(at(cyl(0.04, 0.04, 0.4, '#fff8e8', 8), x, 1.12, TABLE_Z)); root.add(at(sphere(0.06, '#ffb347', { basic: true }, 8), x, 1.38, TABLE_Z)); }
  root.add(at(box(0.9, 0.18, 0.5, '#6d0f1c'), 4.6, 1.02, TABLE_Z));
  root.add(at(box(1.4, 1, 1, '#d8d8de'), SINK[0], 0.5, SINK[1]));
  root.add(at(cyl(0.13, 0.11, 0.25, '#c9a24a', 12), SINK[0], 1.1, SINK[1]));
  const extraBoxes = [{ x: 0, z: TABLE_Z, hx: 4.8, hz: 0.85 }];
  const challot = [];
  const hud = () => game.setHud({
    notes: s.notes, lives: s.lives, eatLeft: s.phase === 'hamotzi' ? Math.max(0, s.eatBy - s.t) : null,
    humOk: s.phase === 'washing' || s.phase === 'zemirot',
    objective: { intro: 'You washed first. Take your seat…', washing: 'Hold H (or ♪) to hum while the others wash', hamotzi: 'Hamotzi! No humming. Grab a piece of challah (E) and eat', zemirot: 'Zemirot! Sing it out', done: '' }[s.phase],
  });
  const lesson = (t) => { if (!s.lessons.includes(t)) s.lessons.push(t); };
  hud();
  game.toast('Shabbat night. You washed first and sat down. 20 guests still to wash…', 'info');
  function sendNextToWash() {
    const v = s.queue.shift();
    if (!v) return;
    v.faceTarget = null; v.target = v.sink; v.washing = true;
    setTimeout(() => { v.target = v.seat; setTimeout(() => { v.faceTarget = { x: v.seat.x, z: TABLE_Z }; v.washing = false; }, 3500); }, 3800);
  }
  async function hostShh() {
    say(host, 'Host', 'Shh! You can’t sing now, we’re between washing and Hamotzi!');
    sfx.talk();
    await new Promise((resolve) => game.setReaction({
      who: 'The host', line: '“Shh! No singing between netilat yadayim and Hamotzi!”',
      options: shuffle([
        { t: 'Keep humming softly. The washing is done, and Rav Chaim Kanievsky hummed here', ok: true },
        { t: 'Panic: go wash again', why: 'Even if you had spoken, you wouldn’t wash again. The netilah was already complete.' },
        { t: 'Stop and never sing at a Shabbat meal again', why: 'Too strict! Before Hamotzi a wordless niggun is fine (Ela Dalet Amot, #48).' },
      ]),
      onPick: (o) => {
        game.setReaction(null);
        const why = 'Between netilah and Hamotzi the mitzvah of washing is done. The Rambam allows talking if your mind stays on the meal; Shulchan Aruch: “טוב ליזהר”. Rav Chaim wasn’t makpid on “nu nu” and hummed niggunim (#48). Rav Elyashiv was makpid.';
        if (o.ok) good(why, 20); else { bad(o.why); s.lives -= 1; }
        lesson(why); resolve();
      },
    }));
    say(host, null);
  }
  function hamotzi() {
    s.phase = 'hamotzi'; s.eatBy = s.t + 9;
    say(host, 'Host', 'Baruch Atah… hamotzi lechem min ha’aretz!');
    say(kid, 'Kid', 'LAI LAI LAI!! 🎵'); kid.motion.wave = true;
    sfx.good();
    for (let i = 0; i < 7; i++) {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.25, 4, 8), mat('#c8873a'));
      mesh.position.set(5.2, 1.6, TABLE_Z);
      root.add(mesh);
      challot.push({ mesh, v: new THREE.Vector3(-3 - Math.random() * 9, 4 + Math.random() * 2, (Math.random() - 0.5) * 6) });
    }
    hud();
  }
  d.on('action', () => {
    if (s.phase !== 'hamotzi' || s.ate || G.reaction) return;
    for (let i = 0; i < challot.length; i++) {
      const c = challot[i];
      if (dist2(c.mesh.position, player.pos) >= 1.6) continue;
      s.ate = true;
      root.remove(c.mesh); challot.splice(i, 1);
      burst('hineni', { x: c.mesh.position.x, y: c.mesh.position.y + 0.5, z: c.mesh.position.z });
      const fast = s.eatBy - s.t;
      good(`Ate the challah, ${fast > 5 ? 'fast!' : 'just in time.'} After Hamotzi, eat right away and don’t hum first (Beit Yehudi, #49).`, Math.round(fast * 6));
      lesson('After Hamotzi: no niggun until you eat (Beit Yehudi, #49). Between the shel yad and the shel rosh works like this, not like before Hamotzi.');
      say(host, null); say(kid, null); kid.motion.wave = false;
      s.phase = 'zemirot'; s.zemirotEnd = s.t + 12;
      game.toast('Zemirot! Now sing your heart out.', 'good');
      hud();
      return;
    }
    game.toast('Get closer to a piece of challah.', 'info');
  });
  function end() {
    s.phase = 'done';
    const stars = s.lives <= 0 ? 0 : s.lives === 3 && s.notes >= 30 ? 3 : s.lives >= 2 ? 2 : 1;
    sfx.great();
    for (let i = 0; i < 4; i++) setTimeout(() => burst('firework', { x: (Math.random() - 0.5) * 8, y: 5, z: TABLE_Z - 2 }), i * 250);
    lesson('So between the shel yad and the shel rosh: no humming. The lehaniach is already waiting on the shel rosh, like Hamotzi waiting on the bread.');
    setTimeout(() => game.finish('table', {
      won: s.lives > 0, stars, title: s.lives > 0 ? 'Gut Shabbos!' : 'The challah got cold',
      stats: [['Notes hummed (when allowed)', s.notes], ['Lives left', '♥'.repeat(Math.max(0, s.lives)) || '0']],
      lessons: s.lessons.slice(0, 5), xp: stars * 60 + s.notes,
    }), 1400);
  }
  return {
    npcs: [host, ...guests],
    boxes: extraBoxes,
    update(dt) {
      for (const v of [host, ...guests]) steer(v, dt);
      for (const c of challot) {
        c.v.y -= 20 * dt; c.mesh.position.addScaledVector(c.v, dt); c.mesh.rotation.x += dt * 3;
        if (c.mesh.position.y < 0.1) { c.mesh.position.y = 0.1; c.v.set(c.v.x * 0.5, Math.abs(c.v.y) * 0.3, c.v.z * 0.5); }
        if (Math.abs(c.mesh.position.z - TABLE_Z) < 0.85 && Math.abs(c.mesh.position.x) < 4.8 && c.mesh.position.y < 1 && c.v.y < 0) { c.mesh.position.y = 1; c.v.set(c.v.x * 0.6, 0, c.v.z * 0.6); }
      }
      if (s.phase === 'done' || G.reaction) return;
      s.t += dt;
      if (s.phase === 'intro' && s.t > 2.5) { s.phase = 'washing'; s.queue = shuffle([...guests]); hud(); }
      if (s.phase === 'washing') {
        if (!s.nextWash || s.t > s.nextWash) { s.nextWash = s.t + 3.2; sendNextToWash(); }
        if (!s.shhDone && s.t > 10) { s.shhDone = true; hostShh(); }
        if (s.t > 24 && guests.every((v) => !v.washing)) hamotzi();
      }
      if (s.phase === 'hamotzi' && s.t > s.eatBy) {
        s.lives -= 1; bad('The bracha was waiting on the bread! Eat right after Hamotzi.');
        s.eatBy = s.t + 6;
        if (s.lives <= 0) return end();
        hud();
      }
      if (s.phase === 'zemirot' && s.t > s.zemirotEnd) return end();
      if (humming() && s.t - s.lastNote > 0.3) {
        s.lastNote = s.t; humNote();
        burst('hum', { x: player.pos.x, y: 2, z: player.pos.z });
        if (s.phase === 'washing' || s.phase === 'zemirot') s.notes += s.phase === 'zemirot' ? 2 : 1;
        if (s.phase === 'hamotzi' && s.t - s.lastPenalty > 2) {
          s.lastPenalty = s.t; s.lives -= 1;
          bad('After Hamotzi, no niggun before you eat (Beit Yehudi, #49).');
          lesson('After Hamotzi, no niggun before you eat (Beit Yehudi, #49).');
          if (s.lives <= 0) return end();
        }
      }
      if (Math.floor(s.t * 4) !== Math.floor((s.t - dt) * 4)) hud();
    },
  };
}
