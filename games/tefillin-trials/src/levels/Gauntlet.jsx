import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { Player, player } from '../world/Player.jsx';
import { Agent, useYukaWorld, makeAgent, addBehavior, only, machine, FnState, PursuitBehavior, FleeBehavior, ArriveBehavior, YV3 , STILL } from '../world/Crowd.jsx';
import { LOOKS } from '../world/Person.jsx';
import { BENCHES } from '../world/Shul.jsx';
import { ask, good, bad, shuffle } from './common.jsx';
import { useGame } from '../store.js';
import { useAction, held } from '../input.js';
import { ENCOUNTERS, RECOVERY } from '../content.js';
import { sfx } from '../audio.js';
import { burst } from '../fx.js';

const KADDISH_AT = 26;
const KADDISH_LEN = 9;

export function Gauntlet() {
  const world = useYukaWorld();
  const g = useGame;
  const s = useRef({
    t: 0, hearts: 3, hineni: 60, spoke: false, phase: 'intro', kavana: 0,
    lessons: [], busy: false, pulseReady: 0,
    ritual: { shift: false, mitzvat: false, tight: 0 },
  }).current;
  const [phones, setPhones] = useState([]);
  const phoneBodies = useRef(new Map());
  const wave = useRef();
  const bag = useRef();
  const beacon = useRef();

  const cast = useMemo(() => {
    const shmerel = makeAgent(world, { x: -5, z: 9, maxSpeed: 3.3, look: LOOKS.shmerel, name: 'Shmerel' });
    addBehavior(shmerel, 'pursue', new PursuitBehavior(player.agent, 1), 1.6);
    only(shmerel, 'wander');
    shmerel.kind = 'friend';

    const kid = makeAgent(world, { x: 9, z: -5, maxSpeed: 5.2, look: LOOKS.kid, name: 'Your kid' });
    addBehavior(kid, 'pursue', new PursuitBehavior(player.agent, 0.6), 2);
    kid.kind = 'kid';
    kid.fsm = machine(kid, {
      rest: new FnState((o) => { only(o, 'wander'); o.until = performance.now() + 1600; o.motion.wave = false; }, (o) => { if (performance.now() > o.until) o.fsm.changeTo('dart'); }),
      dart: new FnState((o) => { only(o, 'pursue'); o.until = performance.now() + 2600; o.motion.wave = true; }, (o) => { if (performance.now() > o.until) o.fsm.changeTo('rest'); }),
    }, 'rest');

    const rav = makeAgent(world, { x: 0, z: 23, maxSpeed: 0, wander: false, look: LOOKS.rav, name: 'The Rav' });
    addBehavior(rav, 'pursue', new PursuitBehavior(player.agent, 1.5), 1.4);
    only(rav);
    rav.kind = 'rabbi';

    const gabbai = makeAgent(world, { x: -9, z: -19, maxSpeed: 2.1, look: LOOKS.gabbai, name: 'The Gabbai' });
    addBehavior(gabbai, 'flee', new FleeBehavior(player.agent.position, 4), 0.7);
    gabbai.kind = 'gabbai';

    const chazan = makeAgent(world, { x: 0, z: -0.8, maxSpeed: 0, wander: false, look: LOOKS.chazan });
    chazan.motion.daven = true;
    chazan.faceTarget = { x: 0, z: -24 };

    // Congregants davening at the ends of the benches: obstacles, and the crowd for Kaddish.
    const davening = shuffle(BENCHES).slice(0, 9).map(([x, z], i) => {
      const v = makeAgent(world, {
        x: x + (x < 0 ? 3.1 : -3.1), z: z - 0.6, maxSpeed: 0, wander: false,
        look: { robe: ['#e7e9f0', '#1d2433', '#2a2a2a'][i % 3], tallit: true, yad: true, rosh: true, hat: i % 2 ? 'kippah' : 'fedora', beard: i % 3 ? '#3a2a1a' : null },
      });
      v.motion.daven = true;
      v.faceTarget = { x: 0, z: -24 };
      return v;
    });

    for (const c of [shmerel, kid, rav]) {
      const home = new YV3(c.position.x, 0, c.position.z);
      addBehavior(c, 'home', new ArriveBehavior(home, 2, 0.3), 1);
      c.behaviors.home.active = false;
    }
    return { shmerel, kid, rav, gabbai, chazan, davening, chasers: [shmerel, kid, rav] };
  }, [world]);

  const hud = () => g.getState().setHud({
    hearts: s.hearts, hineni: Math.round(s.hineni), time: s.t, phase: s.phase, spoke: s.spoke,
    kaddish: s.phase === 'kaddish', kavana: s.kavana, ritual: s.phase === 'ritual' ? { ...s.ritual } : null,
    objective: s.phase === 'ritual' ? 'Put on the shel rosh, the right way' : 'Get your shel rosh from the Gabbai. Don’t talk!',
  });

  const lesson = (t) => { if (t && !s.lessons.includes(t)) s.lessons.push(t); };

  const end = (won) => {
    s.phase = 'done';
    const stars = !won ? 0 : s.hearts === 3 && s.t < 100 ? 3 : s.hearts >= 2 ? 2 : 1;
    if (won) { sfx.great(); for (let i = 0; i < 5; i++) setTimeout(() => burst('firework', { x: player.pos.x + (Math.random() - 0.5) * 8, y: 5 + Math.random() * 3, z: player.pos.z - 3 }), i * 260); }
    setTimeout(() => g.getState().finish('gauntlet', {
      won, stars,
      title: won ? 'Shel rosh on. Hineni.' : 'Too many hefsekim',
      stats: [
        ['Time between shel yad and shel rosh', `${Math.round(s.t)}s`],
        ['Hearts left', '♥'.repeat(s.hearts) || '0'],
        ['Hineni meter', `${Math.round(s.hineni)}%`],
        ['Kavana during Kaddish', `${s.kavana.toFixed(1)}s`],
      ],
      lessons: s.lessons.slice(0, 6),
      xp: won ? stars * 80 + Math.round(s.hineni) + Math.round(s.kavana * 4) : 20,
    }), won ? 1600 : 900);
  };

  async function hefsek(why) {
    s.hearts -= 1;
    s.spoke = true;
    lesson(why);
    hud();
    if (s.hearts <= 0) { end(false); return; }
    const r = RECOVERY[g.getState().minhag];
    await new Promise((resolve) => {
      g.getState().setReaction({
        who: 'Hefsek!', line: r.q, options: shuffle(r.options),
        onPick: (o) => {
          g.getState().setReaction(null);
          if (o.ok) good(r.why, 10); else { bad(r.why); s.hineni -= 10; }
          lesson(r.why);
          resolve();
        },
      });
    });
  }

  async function encounter(c) {
    s.busy = true;
    c.resolved = true;
    c.fsm = null;
    only(c);
    c.maxSpeed = STILL;
    c.velocity.set(0, 0, 0);
    c.faceTarget = player.pos;
    c.motion.talk = true;
    c.setSay?.({ who: c.name, text: ENCOUNTERS[c.kind].line.replace(/[“”]/g, '') });
    const ok = await ask(c.kind);
    c.setSay?.(null);
    c.motion.talk = false;
    c.motion.wave = false;
    if (ok) {
      s.hineni = Math.min(100, s.hineni + 8);
      lesson(ENCOUNTERS[c.kind].why);
    } else {
      await hefsek(ENCOUNTERS[c.kind].why);
    }
    // Satisfied: walk back to their seat and daven.
    c.fsm = null;
    c.faceTarget = null;
    c.maxSpeed = 2;
    only(c, 'home');
    setTimeout(() => { c.motion.daven = true; }, 3000);
    s.busy = false;
    hud();
  }

  async function reachGabbai() {
    s.busy = true;
    const gb = cast.gabbai;
    only(gb);
    gb.maxSpeed = STILL;
    gb.velocity.set(0, 0, 0);
    gb.faceTarget = player.pos;
    gb.setSay?.({ who: 'Gabbai', text: 'Is this yours?' });
    const ok = await ask('gabbai');
    gb.setSay?.(null);
    if (ok) lesson(ENCOUNTERS.gabbai.why);
    else await hefsek('Asking about his kids isn’t for the tefillin: that’s a hefsek.');
    if (s.phase === 'done') return;
    gb.hasBag = false;
    player.frozen = true;
    const kissed = await ask('kiss');
    if (kissed) { s.hineni = Math.min(100, s.hineni + 5); lesson(ENCOUNTERS.kiss.why); }
    s.phase = 'ritual';
    s.busy = false;
    hud();
    g.getState().toast(g.getState().minhag === 'ashkenaz'
      ? `Ashkenazi${s.spoke ? ', and you talked' : ''}: which brachot now?`
      : `Sefardi${s.spoke ? ', and you talked' : ''}: which brachot now?`, 'info');
  }

  // Opening beat: the sleeve.
  useEffect(() => {
    player.frozen = false;
    hud();
    const id = setTimeout(async () => {
      const ok = await ask('sleeve');
      if (ok) lesson(ENCOUNTERS.sleeve.why);
      s.phase = 'run';
      hud();
      g.getState().toast('Go! The Gabbai has your shel rosh. Space = Do Not Disturb pulse.', 'info');
    }, 900);
    return () => { clearTimeout(id); player.frozen = false; g.getState().setReaction(null); };
  }, []);

  // ── Phones flung at you (Rapier) ──
  const phoneId = useRef(0);
  const lastPhone = useRef(0);
  function spawnPhone() {
    const side = Math.random() < 0.5 ? -1 : 1;
    const from = new THREE.Vector3(side * 16.5, 2 + Math.random(), player.pos.z + (Math.random() - 0.5) * 10);
    const to = player.pos.clone().add(player.vel.clone().multiplyScalar(0.6));
    const v = to.sub(from).setY(0).normalize().multiplyScalar(13).setY(4);
    const id = phoneId.current++;
    setPhones((p) => [...p.slice(-7), { id, from: from.toArray(), v: v.toArray(), born: performance.now() }]);
  }

  useAction('pulse', () => {
    if (s.phase !== 'run' && s.phase !== 'kaddish') return;
    const now = performance.now();
    if (now < s.pulseReady) return;
    s.pulseReady = now + 2200;
    sfx.pulse();
    burst('pulse', { x: player.pos.x, y: 0.6, z: player.pos.z });
    for (const body of phoneBodies.current.values()) {
      const p = body.translation();
      const d = new THREE.Vector3(p.x - player.pos.x, 0, p.z - player.pos.z);
      const dist = d.length();
      if (dist < 8) {
        d.normalize().multiplyScalar(9 * (1 - dist / 10));
        body.applyImpulse({ x: d.x, y: 3.5, z: d.z }, true);
        body.applyTorqueImpulse({ x: Math.random(), y: Math.random(), z: Math.random() }, true);
      }
    }
    g.getState().setHud({ pulseAt: now + 2200 });
  });

  // Kaddish traps.
  useAction('amen', () => {
    if (s.phase !== 'kaddish' || s.busy) return;
    s.busy = true;
    bad(ENCOUNTERS.kaddish.options[1].why);
    hefsek(ENCOUNTERS.kaddish.options[1].why).then(() => { s.busy = false; });
  });

  // ── Ritual controls ──
  const minhag = () => g.getState().minhag;
  const need = () => ({
    shift: minhag() === 'ashkenaz' && s.spoke,
    mitzvat: minhag() === 'ashkenaz' || s.spoke,
    baruch: minhag() === 'ashkenaz',
  });
  const ritualErr = (msg) => { bad(msg); lesson(msg); s.hearts -= 1; hud(); if (s.hearts <= 0) end(false); };

  useAction('shift', () => {
    if (s.phase !== 'ritual') return;
    const n = need();
    if (!n.shift) return ritualErr(minhag() === 'ashkenaz'
      ? 'You didn’t talk, so your first lehaniach still covers the shel rosh. Saying it again is a bracha she’eina tzricha.'
      : 'Sefardim don’t repeat lehaniach. After talking, just say al mitzvat on the shel rosh (Shulchan Aruch 25:9).');
    if (s.ritual.mitzvat) return ritualErr('Order! Shel yad first: shift it and say lehaniach, then al mitzvat (Shevet HaLevi).');
    s.ritual.shift = true;
    good('Shel yad shifted, knot re-tightened, “lehaniach tefillin.” Now it covers both again (Mishnah Berurah 25:32).', 10);
    hud();
  });
  useAction('mitzvat', () => {
    if (s.phase !== 'ritual') return;
    const n = need();
    if (!n.mitzvat) return ritualErr('Sefardi, no talking: the one lehaniach already covered the shel rosh. Al mitzvat would be a bracha she’eina tzricha (Shulchan Aruch 25:5).');
    if (n.shift && !s.ritual.shift) return ritualErr('You talked: first shift the shel yad and say lehaniach (Mishnah Berurah 25:32; Shevet HaLevi).');
    if (s.ritual.tight >= 1) return ritualErr('The bracha comes before you put it on, not after.');
    if (s.ritual.mitzvat) return;
    s.ritual.mitzvat = true;
    sfx.good();
    burst('collect', { x: player.pos.x, y: 2.4, z: player.pos.z });
    g.getState().toast(minhag() === 'ashkenaz' ? '“...al mitzvat tefillin” (patach: one mitzvah, the shel rosh). Say it quietly; the Kitzur suggests it.' : '“...al mitzvat tefillin”: you talked, so the shel rosh needs its own bracha (Shulchan Aruch 25:9).', 'good');
    hud();
  });
  useAction('action', () => {
    if (s.phase !== 'ritual' || g.getState().reaction) return;
    const n = need();
    if ((n.mitzvat && !s.ritual.mitzvat) || (n.shift && !s.ritual.shift)) {
      g.getState().toast('Bracha first, then put it on.', 'info');
      return;
    }
    s.ritual.tight = Math.min(1, s.ritual.tight + 0.17);
    sfx.step();
    if (s.ritual.tight >= 1) {
      burst('collect', { x: player.pos.x, y: 2.6, z: player.pos.z });
      if (!n.baruch) { good('Shel rosh on, tight, in place. One bracha did it all. Hineni!', 20); end(true); }
      else g.getState().toast('Tight and in place. Now: Baruch Shem (B).', 'info');
    }
    hud();
  });
  useAction('bless', () => {
    if (s.phase !== 'ritual') return;
    const n = need();
    if (!n.baruch) { g.getState().toast('Sefardim make one bracha, so there’s no doubt to cover with Baruch Shem here.', 'info'); return; }
    if (!s.ritual.mitzvat) return ritualErr('Baruch Shem goes after the second bracha, once the shel rosh is on.');
    if (s.ritual.tight < 1) return ritualErr(ENCOUNTERS.baruchshem.options[1].why);
    good('“Baruch shem kevod malchuto le’olam va’ed”, after it was tight. Exactly the Mishnah Berurah (25:21).', 20);
    lesson(ENCOUNTERS.baruchshem.why);
    end(true);
  });

  // ── Main loop ──
  useFrame((_, dt) => {
    const st = g.getState();
    if (s.phase === 'done') return;
    if (st.reaction) return;
    if (s.phase === 'run' || s.phase === 'kaddish' || s.phase === 'ritual') s.t += dt;
    const now = performance.now();

    if (cast.kid.fsm && !cast.kid.resolved && s.phase === 'run') cast.kid.fsm.update();
    if (s.phase === 'run' && s.t > 3) for (const c of [cast.shmerel]) if (!c.resolved && !c.behaviors.pursue.active) only(c, 'pursue');
    if (s.phase === 'run' && s.t > 13 && !cast.rav.resolved && cast.rav.maxSpeed === STILL) {
      cast.rav.maxSpeed = 2.7; only(cast.rav, 'pursue');
      g.getState().toast('The Rav just walked in…', 'info');
    }

    // Kaddish
    if (s.phase === 'run' && s.t > KADDISH_AT && !s.kaddishDone) {
      s.phase = 'kaddish';
      s.kaddishEnd = s.t + KADDISH_LEN;
      sfx.kaddish();
      cast.chazan.setSay?.({ who: 'Chazan', text: 'Yitgadal ve’yitkadash shemei rabba…' });
      for (const c of [...cast.chasers, cast.gabbai]) { c.saved = { speed: c.maxSpeed, active: Object.keys(c.behaviors).filter((k) => c.behaviors[k].active) }; only(c); c.maxSpeed = STILL; c.velocity.set(0, 0, 0); c.faceTarget = { x: 0, z: 0 }; c.motion.daven = true; }
      g.getState().toast('Kaddish! Everyone stops. What do you do?', 'info');
      hud();
    }
    if (s.phase === 'kaddish') {
      if (player.motion.speed < 0.6) s.kavana += dt;
      if (held.hum && !s.busy) { s.busy = true; bad(ENCOUNTERS.kaddish.options[2].why); hefsek(ENCOUNTERS.kaddish.options[2].why).then(() => { s.busy = false; }); }
      if (wave.current) {
        const k = 1 - (s.kaddishEnd - s.t) / KADDISH_LEN;
        const sc = ((k * 3) % 1) * 30;
        wave.current.scale.set(sc, sc, sc);
        wave.current.material.opacity = 0.5 * (1 - (sc / 30));
      }
      if (s.t >= s.kaddishEnd) {
        s.phase = 'run';
        s.kaddishDone = true;
        cast.chazan.setSay?.(null);
        for (const c of [...cast.chasers, cast.gabbai]) { c.maxSpeed = c.saved.speed; only(c, ...c.saved.active); c.faceTarget = c === cast.gabbai && c.hasBag === false ? player.pos : null; c.motion.daven = !!c.resolved; }
        lesson(ENCOUNTERS.kaddish.why);
        good(`Silent, listening, with kavana (Shulchan Aruch 25:10). Kavana bonus: ${s.kavana.toFixed(1)}s`, Math.round(s.kavana * 3));
        if (wave.current) wave.current.scale.set(0, 0, 0);
        hud();
      }
    }

    // Phones
    if (s.phase === 'run' && s.t > 6 && now - lastPhone.current > 4800) { lastPhone.current = now; spawnPhone(); }

    // Encounters
    if ((s.phase === 'run') && !s.busy) {
      for (const c of cast.chasers) {
        if (c.resolved) continue;
        if (Math.hypot(c.position.x - player.pos.x, c.position.z - player.pos.z) < 1.25) { encounter(c); break; }
      }
      const gb = cast.gabbai;
      if (!s.busy && gb.hasBag !== false && Math.hypot(gb.position.x - player.pos.x, gb.position.z - player.pos.z) < 1.5) reachGabbai();
    }

    // The bag the gabbai carries, and a beacon over him.
    const gb = cast.gabbai;
    if (bag.current) {
      if (gb.hasBag !== false) bag.current.position.set(gb.position.x + 0.35, 1.05, gb.position.z + 0.2);
      else bag.current.position.set(player.pos.x, player.pos.y + 0.9 + (s.ritual.tight * 0.6), player.pos.z);
      bag.current.visible = s.ritual.tight < 1;
    }
    if (beacon.current) {
      beacon.current.position.set(gb.position.x, 6, gb.position.z);
      beacon.current.visible = gb.hasBag !== false;
    }

    // Hineni drifts up slowly while you're moving with purpose.
    if (s.phase === 'run') s.hineni = Math.min(100, s.hineni + dt * 0.4);
    if (Math.floor(s.t * 5) !== Math.floor((s.t - dt) * 5)) hud();
  });

  const onPhoneHit = (id) => {
    const p = phones.find((x) => x.id === id);
    if (!p || p.hit) return;
    p.hit = true;
    s.hineni = Math.max(0, s.hineni - 12);
    sfx.buzz();
    g.getState().hit(0.4);
    g.getState().toast('BZZZT. Distracted! (−12 Hineni) Press Space for a Do Not Disturb pulse.', 'bad');
    lesson(ENCOUNTERS.phone.why);
    hud();
  };

  // Clean out old phones.
  useEffect(() => {
    const id = setInterval(() => setPhones((p) => p.filter((x) => performance.now() - x.born < 11000)), 1000);
    return () => clearInterval(id);
  }, []);

  const rosh = s.phase === 'done' || s.ritual.tight >= 1;

  return (
    <>
      <Player start={[12, 1, 20]} yad rosh={rosh} />
      {cast.chasers.map((c) => <Agent key={c.name} v={c} label={c.resolved ? null : c.name} labelColor="#ff8a7a" highlight={!c.resolved} glow="#ff5a4a" />)}
      <Agent v={cast.gabbai} label="Gabbai · your shel rosh" labelColor="#ffd84a" highlight glow="#ffd84a" />
      <group position={[0, 1.2, 0]}><Agent v={cast.chazan} height={2.1} /></group>
      {cast.davening.map((v, i) => <Agent key={i} v={v} />)}

      <group ref={bag}>
        <mesh castShadow><boxGeometry args={[0.38, 0.28, 0.14]} /><meshStandardMaterial color="#3b1a5a" emissive="#7a3cff" emissiveIntensity={0.6} /></mesh>
        <mesh position={[0, 0.02, 0.075]}><planeGeometry args={[0.2, 0.12]} /><meshStandardMaterial color="#e0b54a" emissive="#e0b54a" emissiveIntensity={1.2} toneMapped={false} /></mesh>
      </group>
      <mesh ref={beacon}>
        <cylinderGeometry args={[0.25, 0.6, 12, 16, 1, true]} />
        <meshBasicMaterial color="#ffd84a" transparent opacity={0.18} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={wave} position={[0, 0.15, 0]} rotation-x={-Math.PI / 2} scale={0}>
        <ringGeometry args={[0.92, 1, 64]} />
        <meshBasicMaterial color="#ffd84a" transparent opacity={0.5} toneMapped={false} />
      </mesh>

      {phones.map((p) => (
        <Phone key={p.id} p={p} bodies={phoneBodies.current} onHit={() => onPhoneHit(p.id)} />
      ))}
    </>
  );
}

function Phone({ p, bodies, onHit }) {
  const ref = useRef();
  const screen = useRef();
  useEffect(() => {
    const b = ref.current;
    if (!b) return;
    bodies.set(p.id, b);
    b.setLinvel({ x: p.v[0], y: p.v[1], z: p.v[2] }, true);
    b.setAngvel({ x: Math.random() * 6, y: Math.random() * 6, z: Math.random() * 6 }, true);
    return () => bodies.delete(p.id);
  }, []);
  useFrame(({ clock }) => {
    if (screen.current) screen.current.emissiveIntensity = 1 + Math.sin(clock.elapsedTime * 25) * 1.5;
  });
  return (
    <RigidBody
      ref={ref} position={p.from} colliders={false} restitution={0.5} friction={0.6}
      onCollisionEnter={({ other }) => other.rigidBodyObject?.name === 'player' && onHit()}
    >
      <CuboidCollider args={[0.2, 0.04, 0.38]} />
      <mesh castShadow><boxGeometry args={[0.4, 0.08, 0.76]} /><meshStandardMaterial color="#14161f" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, 0.045, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.34, 0.66]} />
        <meshStandardMaterial ref={screen} color="#2b6cff" emissive="#4aa0ff" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </RigidBody>
  );
}
