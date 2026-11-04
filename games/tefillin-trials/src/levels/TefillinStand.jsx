import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { EntityManager, GameEntity } from 'yuka';
import * as THREE from 'three';
import { Player, player } from '../world/Player.jsx';
import { Agent, makeAgent, addBehavior, only, ArriveBehavior, YV3, STILL } from '../world/Crowd.jsx';
import { LOOKS, Person } from '../world/Person.jsx';
import { STAND, ARM_STAGE } from '../world/Street.jsx';
import { FONT } from '../world/Shul.jsx';
import { useGame } from '../store.js';
import { useAction } from '../input.js';
import { sfx } from '../audio.js';
import { burst } from '../fx.js';
import { good, bad, shuffle } from './common.jsx';
import { STAND_QUEUE, ARM_ZONES, STAND_LESSONS } from '../content.js';

// World 2 · Yad Keha: the tefillin stand. Passers-by come up one at a time. For each one you
// pick the arm (siman 27), land the bayit on the right part of the muscle (#59-#64), and time
// the bracha between placing and tightening (#55-#56). Between customers come quick shailos.

const VENDOR = { x: STAND.x, z: STAND.z - 1.6 };
const COUNTER = new YV3(STAND.x, 0, STAND.z + 1.5);
const ENTRY = [[-17, 12], [17, 12], [-17, -6], [17, -6]];

// The upper arm on the close-up stage runs from the shoulder (x = -3) to the elbow (x = +3).
const ARM_LEN = 6;
const BAYIT = 0.62; // the bayit's width along the arm
// Height of the top of the arm at x: the capsule (1.72), raised over the biceps bulge.
const armTop = (x) => { const u = (x - 0.15) / 2.1; return Math.max(1.72, 1.28 + 0.62 * Math.sqrt(Math.max(0, 1 - u * u))); };
const zoneAt = (x) => ARM_ZONES.find((z) => x >= z.from && x < z.to) || ARM_ZONES[ARM_ZONES.length - 1];

function useStreetWorld() {
  const world = useMemo(() => {
    // the table, as two circles
    const obstacles = [-1.2, 1.2].map((dx) => {
      const e = new GameEntity();
      e.position.set(STAND.x + dx, 0, STAND.z);
      e.boundingRadius = 0.9;
      return e;
    });
    return { em: new EntityManager(), obstacles, timeScale: 1 };
  }, []);
  useFrame((_, dt) => {
    const paused = !!useGame.getState().reaction;
    world.em.update(paused ? 0 : Math.min(dt, 0.1));
  });
  return world;
}

/** Judge a bayit centred at x on the upper arm: the worst zone any part of it touches wins. */
export function judge(x) {
  const lo = zoneAt(x - BAYIT / 2);
  const hi = zoneAt(x + BAYIT / 2);
  return lo.rank < hi.rank ? lo : hi;
}

export function TefillinStand() {
  const g = useGame;
  const world = useStreetWorld();
  const s = useRef({
    i: -1, phase: 'intro', lives: 3, served: 0, score: 0, perfect: 0, lessons: [],
    slide: 0, dir: 1, speed: 2.2, placedAt: null, tight: 0, blessed: false, arm: 'left', showZones: true,
  }).current;
  const [cur, setCur] = useState(null); // the current queue entry
  const [stage, setStage] = useState(null); // null | 'place' | 'bless' | 'tied'
  const [zonesOn, setZonesOn] = useState(false);
  const [flip, setFlip] = useState(false);
  const bayit = useRef();
  const strap = useRef();
  const promptOwned = useRef(false);

  const kid = useMemo(() => {
    const v = makeAgent(world, { x: VENDOR.x + 1.6, z: VENDOR.z - 0.2, maxSpeed: 0, wander: false, look: LOOKS.kid, name: 'Your kid' });
    v.faceTarget = { x: STAND.x, z: STAND.z + 3 };
    return v;
  }, [world]);

  const customers = useMemo(() => STAND_QUEUE.map((c, k) => {
    if (c.kind === 'shaila') return null;
    const [x, z0] = ENTRY[k % ENTRY.length];
    const z = z0 - Math.floor(k / ENTRY.length) * 1.4;
    const v = makeAgent(world, { x, z, maxSpeed: 3.2, wander: false, look: c.look, name: c.name, id: `c${k}` });
    v.home = new YV3(x, 0, z);
    addBehavior(v, 'go', new ArriveBehavior(v.home, 1.4, 0.15), 1);
    v.active = false;
    return v;
  }), [world]);

  const hud = (patch = {}) => g.getState().setHud({
    lives: s.lives, served: s.served, total: STAND_QUEUE.length, score: s.score,
    objective: s.objective, stage: s.stageName, tight: s.tight, arm: s.arm, zones: s.showZones, ...patch,
  });
  const lesson = (t) => { if (t && !s.lessons.includes(t)) s.lessons.push(t); };

  useEffect(() => {
    s.objective = 'Morning on the corner. Set up the stand: walk behind the table.';
    hud();
    g.getState().toast('World 2 · Yad Keha. Your kid is running the tefillin stand with you today.', 'info');
    kid.setSay?.({ who: 'Your kid', text: 'Abba, the shin has three heads on one side and four on the other. The Avot and the Imahot!' });
    const id = setTimeout(() => { kid.setSay?.(null); next(); }, 3200);
    return () => { clearTimeout(id); player.camOverride = false; player.frozen = false; g.getState().setReaction(null); };
  }, []);

  function loseLife(msg) {
    s.lives -= 1;
    bad(msg);
    lesson(msg);
    hud();
    if (s.lives <= 0) { finish(false); return true; }
    return false;
  }

  function next() {
    if (s.phase === 'done') return;
    s.i += 1;
    const c = STAND_QUEUE[s.i];
    if (!c) return finish(true);
    setCur(c);
    if (c.kind === 'shaila') { s.phase = 'shaila'; s.objective = c.title; hud(); setTimeout(() => runShaila(c), 600); return; }
    const v = customers[s.i];
    v.active = true;
    v.behaviors.go.target = COUNTER;
    v.faceTarget = null;
    s.phase = 'walking';
    s.objective = `${c.name} is walking up to the stand.`;
    hud();
  }

  async function runShaila(c) {
    const ok = await pick(c.who, c.line, c.options, c.why);
    if (!ok && loseLife(c.why)) return;
    if (ok) { s.score += 40; lesson(c.lesson); }
    s.served += 1;
    hud();
    setTimeout(next, 900);
  }

  function pick(who, line, options, why) {
    sfx.talk();
    return new Promise((resolve) => g.getState().setReaction({
      who, line, options: shuffle(options),
      onPick: (o) => {
        g.getState().setReaction(null);
        if (o.ok) good(why, 15); else { sfx.bad(); g.getState().toast(o.why || why, 'bad'); }
        resolve(!!o.ok);
      },
    }));
  }

  async function serve() {
    const c = STAND_QUEUE[s.i];
    const v = customers[s.i];
    s.phase = 'serving';
    v.faceTarget = { x: VENDOR.x, z: VENDOR.z };
    v.motion.talk = true;
    v.setSay?.({ who: c.name, text: c.line });
    // 1 · which arm?
    const ok = await pick(c.name, c.line, c.arm.options, c.arm.why);
    v.setSay?.(null);
    v.motion.talk = false;
    if (!ok) { lesson(c.arm.why); if (loseLife(c.arm.why)) return; }
    else s.score += 30;
    if (c.arm.side === 'none') {
      // no shel yad: straight to the shel rosh
      g.getState().toast(c.arm.after || 'No shel yad. He still puts on the shel rosh: they are two separate mitzvot.', 'info');
      return doRosh();
    }
    s.arm = c.arm.side;
    s.showZones = !!c.tutorial;
    setZonesOn(!!c.tutorial);
    setFlip(c.arm.side === 'right');
    s.speed = c.speed || 2.4;
    s.slide = -ARM_LEN / 2 + 0.5;
    s.dir = 1;
    s.tight = 0;
    s.blessed = false;
    s.placedAt = null;
    s.stageName = 'place';
    s.objective = `${c.arm.side === 'right' ? 'RIGHT' : 'LEFT'} arm. Press E to set the bayit down on the right spot of the muscle.${c.tutorial ? ' (The zones are shown this once.)' : ''}`;
    player.camOverride = true;
    player.frozen = true;
    setStage('place');
    hud();
  }

  // E: set the bayit down
  useAction('action', () => {
    if (g.getState().reaction) return;
    if (s.phase === 'ready') {
      if (Math.hypot(player.pos.x - VENDOR.x, player.pos.z - VENDOR.z) < 2.6) serve();
      return;
    }
    if (stage !== 'place' || s.placedAt != null) return;
    s.placedAt = s.slide;
    const z = judge(s.slide);
    const c = STAND_QUEUE[s.i];
    burst(z.rank >= 2 ? 'hineni' : 'hefsek', { x: ARM_STAGE.x + s.slide * (s.arm === 'right' ? -1 : 1), y: ARM_STAGE.y + 2.2, z: ARM_STAGE.z });
    s.showZones = true;
    setZonesOn(true);
    if (z.rank === 3) { s.score += 50; s.perfect += 1; g.getState().toast(z.say, 'good'); sfx.good(); }
    else if (z.rank === 2) { s.score += 20; g.getState().toast(z.say, 'info'); lesson(z.say); sfx.collect(); }
    else {
      if (loseLife(z.say)) return;
      // a bad spot: he moves it and you try again
      setTimeout(() => { if (s.phase === 'done') return; s.placedAt = null; s.showZones = !!c.tutorial; setZonesOn(!!c.tutorial); s.objective = 'Try again: move it to the right spot.'; hud(); }, 1400);
      hud();
      return;
    }
    s.stageName = 'bless';
    s.objective = 'Now the bracha! Press B after it’s on the arm and before the knot is tight.';
    setStage('bless');
    hud();
  });

  // B: the bracha
  useAction('bless', () => {
    if (g.getState().reaction) return;
    if (stage === 'place' && s.placedAt == null) {
      loseLife('Too early: the bracha comes once it’s on the arm, “from placing until tying” (Menachot 36a, #56).');
      return;
    }
    if (stage !== 'bless' || s.blessed) return;
    s.blessed = true;
    sfx.good();
    burst('collect', { x: ARM_STAGE.x, y: ARM_STAGE.y + 3, z: ARM_STAGE.z });
    const early = s.tight < 0.7;
    s.score += early ? 40 : 25;
    g.getState().toast(early ? '“…lehaniach tefillin.” On the arm, before the knot: right on time (#56).' : '“…lehaniach tefillin.” Just in time, before it was tight.', 'good');
  });

  // The knot is tight and nobody said the bracha.
  async function forgot() {
    const c = STAND_QUEUE[s.i];
    const why = 'Lechatchila the bracha comes before the knot is tight (#56). But if you forgot, bless now: every moment the tefillin are on you is the mitzvah. That’s why it’s “lehaniach”, and not like a lulav, which you can’t bless on once you’ve picked it up and done the mitzvah.';
    const ok = await pick(c.name, '“Wait, I didn’t make the bracha, and it’s already tied!”', [
      { t: 'Make it now: the mitzvah goes on for as long as they’re on', ok: true },
      { t: 'Too late, no bracha today, like a lulav once you’ve shaken it', why },
      { t: 'Take it off, put it on again, and bless', why },
    ], why);
    if (!ok) { if (loseLife(why)) return; } else { s.score += 15; lesson('Forgot the bracha before tightening? Bless while it’s on: every second is a mitzvah (#57).'); }
    finishArm();
  }

  function finishArm() {
    const c = STAND_QUEUE[s.i];
    setStage(null);
    s.stageName = null;
    player.camOverride = false;
    player.frozen = false;
    if (c.arm.after) g.getState().toast(c.arm.after, 'info');
    doRosh();
  }

  async function doRosh() {
    const c = STAND_QUEUE[s.i];
    const v = customers[s.i];
    if (c.rosh) {
      const ok = await pick(c.name, c.rosh.line, c.rosh.options, c.rosh.why);
      if (!ok && loseLife(c.rosh.why)) return;
      if (ok) { s.score += 30; lesson(c.rosh.lesson); }
    }
    v.look = { ...v.look, rosh: true, yad: c.arm.side !== 'none' };
    v.redraw?.();
    v.motion.daven = true;
    burst('hineni', { x: v.position.x, y: 2.2, z: v.position.z });
    v.setSay?.({ who: c.name, text: c.thanks || 'Shema Yisrael…' });
    sfx.great();
    s.served += 1;
    s.phase = 'davening';
    hud();
    setTimeout(() => {
      v.setSay?.(null);
      v.motion.daven = false;
      v.faceTarget = null;
      v.behaviors.go.target = v.home;
      setTimeout(() => { v.active = false; }, 6000);
      next();
    }, 2600);
  }

  function finish(won) {
    if (s.phase === 'done') return;
    s.phase = 'done';
    player.camOverride = false;
    player.frozen = false;
    setStage(null);
    const stars = !won ? 0 : s.lives === 3 ? 3 : s.lives === 2 ? 2 : 1;
    if (won) sfx.great();
    setTimeout(() => g.getState().finish('stand', {
      won, stars,
      title: won ? 'Every arm, every bracha, every Jew on the corner' : 'The stand closes early today',
      stats: [['Served', `${s.served}/${STAND_QUEUE.length}`], ['Perfect placements', s.perfect], ['Score', s.score], ['Lives left', '♥'.repeat(s.lives) || '0']],
      lessons: [...STAND_LESSONS, ...s.lessons].slice(0, 7),
      xp: won ? stars * 80 + Math.round(s.score / 4) : 20,
    }), 1200);
  }

  // Debug/test hook, like window.__tt: where the sliding bayit is right now.
  useEffect(() => { window.__standSlide = () => s.slide; window.__standCustomers = () => customers.map((v) => v && [v.name, v.position.x.toFixed(1), v.position.z.toFixed(1), v.velocity.length().toFixed(2)]); return () => { delete window.__standSlide; delete window.__standCustomers; }; }, []);

  useFrame((state, dt) => {
    if (s.phase === 'done') return;
    const reaction = g.getState().reaction;
    // the customer arrives at the counter
    if (s.phase === 'walking') {
      const v = customers[s.i];
      if (v && Math.hypot(v.position.x - COUNTER.x, v.position.z - COUNTER.z) < 0.5) {
        s.phase = 'ready';
        v.faceTarget = { x: VENDOR.x, z: VENDOR.z };
        s.objective = `${STAND_QUEUE[s.i].name} is at the stand. Get behind the table and press E.`;
        hud();
      }
    }
    // prompt to help when the player is behind the table
    const behind = Math.hypot(player.pos.x - VENDOR.x, player.pos.z - VENDOR.z) < 2.6;
    if (s.phase === 'ready' && behind) {
      promptOwned.current = true;
      g.getState().setPrompt(`E · help ${STAND_QUEUE[s.i].name}`);
    } else if (promptOwned.current) {
      promptOwned.current = false;
      g.getState().setPrompt(null);
    }
    if (s.phase === 'ready' && !behind && performance.now() - (s.nudgedAt || 0) > 9000) {
      s.nudgedAt = performance.now();
      kid.setSay?.({ who: 'Your kid', text: 'Abba! Someone’s waiting at the stand!' });
      setTimeout(() => kid.setSay?.(null), 2500);
    }

    // close-up: the sliding bayit and the tightening knot
    if (stage && !reaction) {
      const flip = s.arm === 'right' ? -1 : 1;
      if (stage === 'place' && s.placedAt == null) {
        s.slide += s.dir * s.speed * dt;
        const lim = ARM_LEN / 2 - BAYIT / 2;
        if (s.slide > lim) { s.slide = lim; s.dir = -1; }
        if (s.slide < -lim) { s.slide = -lim; s.dir = 1; }
      }
      if (stage === 'bless') {
        s.tight = Math.min(1, s.tight + dt / (STAND_QUEUE[s.i]?.knot || 2.6));
        if (Math.floor(s.tight * 20) !== Math.floor((s.tight - dt) * 20)) hud();
        if (s.tight >= 1) {
          setStage('tied');
          s.stageName = null;
          hud();
          if (!s.blessed) setTimeout(forgot, 500);
          else setTimeout(finishArm, 900);
        }
      }
      const x = s.placedAt ?? s.slide;
      if (bayit.current) bayit.current.position.set(x * flip, armTop(x) + 0.31 + (s.placedAt == null ? 0.35 + Math.sin(state.clock.elapsedTime * 6) * 0.05 : 0), 0);
      if (strap.current) {
        strap.current.visible = stage !== 'place';
        strap.current.position.x = x * flip + 0.5 * flip;
        const k = 1.35 - 0.35 * s.tight;
        strap.current.scale.set(1, k, k);
      }
      // camera on the arm
      state.camera.position.lerp(new THREE.Vector3(ARM_STAGE.x, ARM_STAGE.y + 3.2, ARM_STAGE.z + 8.6), Math.min(1, dt * 4));
      state.camera.lookAt(ARM_STAGE.x, ARM_STAGE.y + 1.6, ARM_STAGE.z);
    }
  });

  return (
    <>
      <Player start={[VENDOR.x - 3, 1, VENDOR.z + 6]} yad rosh />
      <Agent v={kid} />
      {customers.map((v) => v && <CustomerAgent key={v.uid} v={v} />)}
      <ArmStage flip={flip} zones={!!stage && zonesOn} bayitRef={bayit} strapRef={strap} label={cur?.arm?.side === 'right' ? 'RIGHT ARM · יָמִין' : 'LEFT ARM · שְׂמֹאל'} />
    </>
  );
}

function CustomerAgent({ v }) {
  // Re-render when the customer gets his tefillin so the Person shows them.
  const [, force] = useState(0);
  useEffect(() => { v.redraw = () => force((n) => n + 1); return () => { v.redraw = null; }; }, [v]);
  return <Agent v={v} />;
}

/** The close-up of an upper arm with the four zones of #62. */
function ArmStage({ flip, zones, bayitRef, strapRef, label }) {
  const skin = '#e8c39e';
  const f = flip ? -1 : 1;
  return (
    <group position={[ARM_STAGE.x, ARM_STAGE.y, ARM_STAGE.z]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[9, 48]} /><meshStandardMaterial color="#20263a" roughness={0.9} /></mesh>
      <pointLight position={[0, 6, 5]} intensity={60} distance={20} color="#fff1d6" />
      <group scale={[f, 1, 1]}>
        {/* shoulder, upper arm, biceps, elbow and the forearm raised (like the sheet's picture) */}
        <mesh position={[-3.3, 1, 0]} castShadow><sphereGeometry args={[0.95, 32, 32]} /><meshStandardMaterial color={skin} roughness={0.55} /></mesh>
        <mesh position={[0, 1, 0]} rotation-z={Math.PI / 2} castShadow><capsuleGeometry args={[0.72, ARM_LEN, 12, 32]} /><meshStandardMaterial color={skin} roughness={0.55} /></mesh>
        <mesh position={[0.15, 1.28, 0]} scale={[2.1, 0.62, 0.78]} castShadow><sphereGeometry args={[1, 32, 32]} /><meshStandardMaterial color={skin} roughness={0.5} /></mesh>
        <mesh position={[3.4, 1, 0]} castShadow><sphereGeometry args={[0.66, 24, 24]} /><meshStandardMaterial color={skin} roughness={0.55} /></mesh>
        <mesh position={[3.75, 3.1, 0]} rotation-z={-0.18} castShadow><capsuleGeometry args={[0.55, 3.6, 12, 24]} /><meshStandardMaterial color={skin} roughness={0.55} /></mesh>
        <mesh position={[4.05, 5.6, 0]} castShadow><sphereGeometry args={[0.72, 20, 20]} /><meshStandardMaterial color={skin} roughness={0.55} /></mesh>
        {zones && ARM_ZONES.map((z) => (
          <group key={z.id}>
            <mesh position={[(z.from + z.to) / 2, 1.05, 0]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[1.02, 1.02, z.to - z.from - 0.04, 32, 1, true]} />
              <meshBasicMaterial color={z.color} transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
            </mesh>
            <Billboard position={[(z.from + z.to) / 2, 2.55, 0]}>
              <Text font={FONT} fontSize={0.36} color={z.color} outlineWidth={0.02} outlineColor="#000" anchorX="center">{z.id}</Text>
            </Billboard>
          </group>
        ))}
        <Billboard position={[0, -0.25, 1.4]}>
          <Text font={FONT} fontSize={0.22} color="#a9afc6" anchorX="center">{'shoulder                                      elbow'}</Text>
        </Billboard>
      </group>
      {/* the bayit and the strap (not mirrored: positioned from code) */}
      <group ref={bayitRef} position={[0, 1.5, 0]}>
        <mesh castShadow><boxGeometry args={[BAYIT, 0.62, 0.62]} /><meshStandardMaterial color="#050507" roughness={0.18} metalness={0.35} /></mesh>
        <mesh position={[0, -0.33, 0]}><boxGeometry args={[BAYIT + 0.3, 0.06, 0.9]} /><meshStandardMaterial color="#050507" roughness={0.3} /></mesh>
        <mesh position={[0, 0, 0.32]}><planeGeometry args={[0.2, 0.2]} /><meshStandardMaterial color="#ffd84a" emissive="#ffd84a" emissiveIntensity={0.4} /></mesh>
      </group>
      <mesh ref={strapRef} position={[0, 1.05, 0]} rotation-y={Math.PI / 2} visible={false}>
        <torusGeometry args={[0.78, 0.07, 8, 40]} />
        <meshStandardMaterial color="#050507" roughness={0.3} />
      </mesh>
      <Billboard position={[0, 3.7, 0]}>
        <Text font={FONT} fontSize={0.42} color="#ffd84a" anchorX="center" outlineWidth={0.02} outlineColor="#000">{label}</Text>
      </Billboard>
    </group>
  );
}
