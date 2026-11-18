import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { EntityManager } from 'yuka';
import * as THREE from 'three';
import { Player, player } from '../world/Player.jsx';
import { Agent, makeAgent } from '../world/Crowd.jsx';
import { LOOKS } from '../world/Person.jsx';
import { BEDS, BODY_STAGE } from '../world/Ward.jsx';
import { FONT } from '../world/Shul.jsx';
import { useGame } from '../store.js';
import { useAction } from '../input.js';
import { sfx } from '../audio.js';
import { burst } from '../fx.js';
import { good, bad, shuffle } from './common.jsx';
import { WARD_QUEUE, WARD_LESSONS, LONE_ROSH, ARM_STATES } from '../content.js';
import { ARM_CHOICES, BRACHA_CHOICES, judgeWard, knotTarget, knotError, armX, ARM_GEOM } from '../ward-rules.js';

// Shiur 5 · The Ward. Tefillin rounds in a rehab ward: for each patient you read which arm is gone
// and how much of it, pick the arm and whether he says the bracha (siman 27, #71-#79), then tie
// the yud so its leg points to the heart (#81-#86). Between patients: quick shailos.

const PATIENTS = WARD_QUEUE.filter((c) => c.kind === 'patient');

export function WardRounds() {
  const g = useGame;
  const world = useMemo(() => ({ em: new EntityManager(), obstacles: [], timeScale: 1 }), []);
  useFrame((_, dt) => world.em.update(g.getState().reaction ? 0 : Math.min(dt, 0.1)));
  const s = useRef({
    i: -1, phase: 'intro', lives: 3, served: 0, score: 0, perfect: 0, lessons: [], angle: 0, speed: 2.4,
  }).current;
  const [cur, setCur] = useState(null);
  const [stage, setStage] = useState(null); // null | 'look' | 'knot'
  const [knotArm, setKnotArm] = useState(null);
  const knot = useRef();
  const promptOwned = useRef(false);

  // Patients at the foot of their beds, the rest of the ward in the other beds.
  const people = useMemo(() => {
    const agents = PATIENTS.map((p, k) => {
      const b = BEDS[k];
      const v = makeAgent(world, { x: b.x - b.side * 0.9, z: b.z, maxSpeed: 0, wander: false, look: p.look, name: p.name, id: `p${k}` });
      v.faceTarget = { x: 0, z: b.z };
      v.patient = p;
      return v;
    });
    const extras = BEDS.slice(PATIENTS.length).map((b, k) => {
      const v = makeAgent(world, { x: b.x - b.side * 0.9, z: b.z, maxSpeed: 0, wander: false, look: { robe: ['#8fc1e3', '#d9d9e3', '#4a5a32'][k % 3], kippah: '#111', beard: k % 2 ? '#3a2a1a' : null }, id: `x${k}` });
      v.faceTarget = { x: 0, z: b.z };
      v.motion.daven = k % 2 === 0;
      return v;
    });
    const nurse = makeAgent(world, { x: 3, z: -17, maxSpeed: 1.4, look: { robe: '#5fb3c9', kippah: '#5fb3c9', skin: '#e3bf9a' }, name: 'Nurse', id: 'nurse' });
    const chavruta = makeAgent(world, { x: -2, z: 14, maxSpeed: 1.8, look: LOOKS.shmerel, name: 'Your chavruta', id: 'chav' });
    return { agents, extras, nurse, chavruta };
  }, [world]);

  const hud = (patch = {}) => g.getState().setHud({
    lives: s.lives, served: s.served, total: WARD_QUEUE.length, score: s.score, objective: s.objective,
    stage: s.stageName, ...patch,
  });
  const lesson = (t) => { if (t && !s.lessons.includes(t)) s.lessons.push(t); };

  useEffect(() => {
    s.objective = 'Tefillin rounds. The first patient is waiting by his bed.';
    hud();
    g.getState().toast('Shiur 5 · The Ward. You bring tefillin to soldiers and patients, bed by bed.', 'info');
    people.chavruta.setSay?.({ who: 'Your chavruta', text: 'Most of them can’t tie it themselves. The mitzvah is that it’s tied on them: we tie.' });
    const id = setTimeout(() => { people.chavruta.setSay?.(null); next(); }, 3600);
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

  function pick(who, line, options, why, { keepOrder = false } = {}) {
    sfx.talk();
    return new Promise((resolve) => g.getState().setReaction({
      who, line, options: keepOrder ? options : shuffle(options),
      onPick: (o) => {
        g.getState().setReaction(null);
        if (o.ok) good(why, 15); else if (why) { sfx.bad(); g.getState().toast(o.why || why, 'bad'); }
        resolve(o);
      },
    }));
  }

  const patientAgent = (c) => people.agents[PATIENTS.indexOf(c)];

  function next() {
    if (s.phase === 'done') return;
    s.i += 1;
    const c = WARD_QUEUE[s.i];
    if (!c) return finish(true);
    setCur(c);
    if (c.kind === 'shaila') {
      s.phase = 'shaila';
      s.objective = c.title;
      hud();
      const speaker = c.who === 'The ward nurse' ? people.nurse : people.chavruta;
      speaker.setSay?.({ who: c.who, text: c.line.replace(/[“”]/g, '') });
      setTimeout(async () => {
        const o = await pick(c.who, c.line, c.options, c.why);
        speaker.setSay?.(null);
        if (!o.ok && loseLife(c.why)) return;
        if (o.ok) { s.score += 40; lesson(c.lesson); }
        s.served += 1;
        hud();
        setTimeout(next, 800);
      }, 700);
      return;
    }
    s.phase = 'ready';
    s.objective = `${c.name} is waiting by his bed. Walk over and press E.`;
    hud();
  }

  async function serve() {
    const c = WARD_QUEUE[s.i];
    const v = patientAgent(c);
    s.phase = 'serving';
    v.motion.talk = true;
    player.camOverride = true;
    player.frozen = true;
    setStage('look');
    s.stageName = 'look';
    s.objective = `${c.name}: look at both arms. Which arm, and a bracha or not?`;
    hud();
    await new Promise((r) => setTimeout(r, 900));
    // 1 · which arm?
    const arm = await pick(c.name, c.line, ARM_CHOICES, null, { keepOrder: true });
    // 2 · a bracha? (no question if there's no shel yad)
    let bracha = null;
    if (arm.id !== 'none') {
      const b = await pick(c.name, arm.id === 'left' ? 'On the left arm. And the bracha?' : 'On the right arm. And the bracha?', BRACHA_CHOICES, null, { keepOrder: true });
      bracha = b.id === 'yes';
    }
    v.motion.talk = false;
    const verdict = judgeWard(c, arm.id, bracha);
    if (verdict.ok) { s.score += 60; good(c.why, 20); lesson(c.why.split(':')[0]); }
    else if (loseLife(verdict.reason ? `${verdict.reason} ${c.why}` : c.why)) return;
    // 3 · tie the yud on the arm it really goes on
    const real = verdict.ok ? arm.id : c.accept[0][0];
    if (real !== 'none') {
      setKnotArm(real);
      s.angle = Math.random() * Math.PI * 2;
      s.speed = 2.2 + s.served * 0.12;
      s.stageName = 'knot';
      s.objective = 'Tie the yud: press E when its leg points to the heart, right against the bayit.';
      setStage('knot');
      hud();
      return; // the E handler carries on
    }
    afterArm();
  }

  useAction('action', () => {
    if (g.getState().reaction) return;
    if (s.phase === 'ready') {
      const v = patientAgent(WARD_QUEUE[s.i]);
      if (v && Math.hypot(player.pos.x - v.position.x, player.pos.z - v.position.z) < 2.8) serve();
      return;
    }
    if (stage !== 'knot' || s.phase !== 'serving') return;
    const err = knotError(s.angle, knotArm);
    const deg = Math.round((err * 180) / Math.PI);
    burst(deg < 35 ? 'hineni' : 'hefsek', { x: BODY_STAGE.x + armX(knotArm), y: BODY_STAGE.y + ARM_GEOM.bayitY + 0.5, z: BODY_STAGE.z + 0.6 });
    if (deg < 15) { s.score += 50; s.perfect += 1; g.getState().toast('The yud’s leg points straight at the heart, snug against the bayit (Beit Yosef, #81).', 'good'); sfx.good(); }
    else if (deg < 35) { s.score += 25; sfx.collect(); g.getState().toast(`Close: ${deg}° off. Kosher, but aim the leg right at the heart.`, 'info'); }
    else {
      const why = 'The knot faces inward, toward the heart: “kesher shel tefillin tzarich lihiyot kelapei panim” (Menachot 35b, Beit Yosef #81), so the Torah’s words “on your heart” are kept.';
      if (loseLife(why)) return;
    }
    s.stageName = null;
    setStage('look');
    hud();
    setTimeout(afterArm, 700);
  });

  async function afterArm() {
    const c = WARD_QUEUE[s.i];
    const v = patientAgent(c);
    if (c.rosh) {
      const q = c.rosh === 'ROSH' ? { ...LONE_ROSH[g.getState().minhag], lesson: 'The shel yad and shel rosh are two mitzvot: no arm, still the shel rosh, with its brachot (Shulchan Aruch and Rema 26:1).' } : c.rosh;
      const o = await pick(c.name, q.line, q.options, q.why);
      if (!o.ok && loseLife(q.why)) return;
      if (o.ok) { s.score += 30; lesson(q.lesson); }
    }
    setStage(null);
    setKnotArm(null);
    player.camOverride = false;
    player.frozen = false;
    const yad = (judgeWard(c, c.accept[0][0], c.accept[0][1]).ok && c.accept[0][0] !== 'none');
    v.look = { ...v.look, rosh: true, yad };
    v.redraw?.();
    v.motion.daven = true;
    burst('hineni', { x: v.position.x, y: 2.2, z: v.position.z });
    v.setSay?.({ who: c.name, text: c.thanks || 'Shema Yisrael…' });
    sfx.great();
    s.served += 1;
    s.phase = 'davening';
    hud();
    setTimeout(() => { v.setSay?.(null); next(); }, 2400);
  }

  function finish(won) {
    if (s.phase === 'done') return;
    s.phase = 'done';
    player.camOverride = false;
    player.frozen = false;
    setStage(null);
    const stars = !won ? 0 : s.lives === 3 ? 3 : s.lives === 2 ? 2 : 1;
    if (won) sfx.great();
    setTimeout(() => g.getState().finish('ward', {
      won, stars,
      title: won ? 'Every arm that’s left, and every yud on the heart' : 'Rounds end early today',
      stats: [['Patients and shailos', `${s.served}/${WARD_QUEUE.length}`], ['Perfect yuds', s.perfect], ['Score', s.score], ['Lives left', '♥'.repeat(s.lives) || '0']],
      lessons: [...WARD_LESSONS, ...s.lessons].slice(0, 8),
      xp: won ? stars * 90 + Math.round(s.score / 4) : 20,
    }), 1200);
  }

  useFrame((state, dt) => {
    if (s.phase === 'done') return;
    const reaction = g.getState().reaction;
    // prompt when you're next to the waiting patient
    const c = WARD_QUEUE[s.i];
    const v = c?.kind === 'patient' ? patientAgent(c) : null;
    const near = v && Math.hypot(player.pos.x - v.position.x, player.pos.z - v.position.z) < 2.8;
    if (s.phase === 'ready' && near) {
      promptOwned.current = true;
      g.getState().setPrompt(`E · tefillin for ${c.name}`);
    } else if (promptOwned.current) {
      promptOwned.current = false;
      g.getState().setPrompt(null);
    }
    if (stage && !reaction) {
      if (stage === 'knot') s.angle = (s.angle + s.speed * dt) % (Math.PI * 2);
    }
    if (knot.current && knotArm) {
      const x = armX(knotArm);
      knot.current.position.set(x + Math.sin(s.angle) * ARM_GEOM.knotR, ARM_GEOM.bayitY - 0.05, Math.cos(s.angle) * ARM_GEOM.knotR);
      knot.current.rotation.y = s.angle;
    }
    if (stage) {
      state.camera.position.lerp(new THREE.Vector3(BODY_STAGE.x, BODY_STAGE.y + 2.4, BODY_STAGE.z + 9.2), Math.min(1, dt * 4));
      state.camera.lookAt(BODY_STAGE.x, BODY_STAGE.y + 1.2, BODY_STAGE.z);
    }
  });

  useEffect(() => { window.__wardKnot = () => ({ angle: s.angle, target: knotArm && knotTarget(knotArm) }); return () => { delete window.__wardKnot; }; }, [knotArm]);

  const waiting = cur?.kind === 'patient' ? cur : null;
  return (
    <>
      <Player start={[0, 1, 18]} yad rosh />
      {people.agents.map((v) => (
        <PatientAgent key={v.uid} v={v} label={waiting && v.patient === waiting && s.phase === 'ready' ? waiting.name : null} />
      ))}
      {people.extras.map((v) => <Agent key={v.uid} v={v} />)}
      <Agent v={people.nurse} />
      <Agent v={people.chavruta} />
      {cur?.kind === 'patient' && (
        <group position={[BODY_STAGE.x, BODY_STAGE.y, BODY_STAGE.z]}>
          <PatientBody body={cur.body} />
          {knotArm && (
            <group>
              <Bayit x={armX(knotArm)} />
              <group ref={knot}><YudKnot /></group>
            </group>
          )}
        </group>
      )}
    </>
  );
}

function PatientAgent({ v, label }) {
  const [, force] = useState(0);
  useEffect(() => { v.redraw = () => force((n) => n + 1); return () => { v.redraw = null; }; }, [v]);
  return <Agent v={v} label={label} labelColor="#ff9ccc" highlight={!!label} />;
}

const SKIN = '#e8c39e';

/** The close-up: a torso, a heart, and both arms as they really are (#72-#78). */
function PatientBody({ body }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[8, 48]} /><meshStandardMaterial color="#20304a" roughness={0.9} /></mesh>
      <pointLight position={[0, 5, 4]} intensity={50} distance={18} color="#fff6e6" />
      {/* hospital gown, neck and head */}
      <mesh position={[0, 2.25, 0]} castShadow><boxGeometry args={[1.6, 2.1, 0.8]} /><meshStandardMaterial color="#8fc1e3" roughness={0.9} /></mesh>
      <mesh position={[0, 3.45, 0]}><cylinderGeometry args={[0.18, 0.2, 0.3, 12]} /><meshStandardMaterial color={SKIN} /></mesh>
      <mesh position={[0, 3.95, 0]} castShadow><sphereGeometry args={[0.45, 24, 24]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh>
      <mesh position={[0, 4.36, 0]}><sphereGeometry args={[0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1b1d2a" /></mesh>
      {/* the heart, on his left (your right) */}
      <mesh position={[0.32, 2.65, 0.42]}><sphereGeometry args={[0.12, 16, 16]} /><meshStandardMaterial color="#ff3a5a" emissive="#ff3a5a" emissiveIntensity={2.4} toneMapped={false} /></mesh>
      <Billboard position={[0.32, 2.95, 0.5]}><Text font={FONT} fontSize={0.16} color="#ff7a8a" anchorX="center" outlineWidth={0.01} outlineColor="#000">♥ heart</Text></Billboard>
      <Arm side="left" state={body.L} />
      <Arm side="right" state={body.R} />
    </group>
  );
}

/** One arm, shoulder down: upper arm, forearm and hand, drawn only as far as he has them. */
function Arm({ side, state }) {
  const x = armX(side);
  const { shoulderY, upper, fore, hand } = ARM_GEOM;
  const st = ARM_STATES[state];
  const color = st.color || SKIN;
  const elbowY = shoulderY - upper;
  const wristY = elbowY - fore;
  const hasUpper = state !== 'gone';
  const foreLen = state === 'bicep' || state === 'gone' ? 0 : state === 'stump' ? fore * 0.45 : fore;
  const hasHand = foreLen === fore;
  const endY = hasUpper ? (foreLen ? elbowY - foreLen : elbowY) : shoulderY;
  const mat = <meshStandardMaterial color={color} roughness={0.55} />;
  return (
    <group>
      <mesh position={[x, shoulderY, 0]} castShadow><sphereGeometry args={[0.32, 20, 20]} />{state === 'gone' ? <meshStandardMaterial color="#f4f4f0" roughness={0.9} /> : mat}</mesh>
      {hasUpper && <mesh position={[x, shoulderY - upper / 2, 0]} castShadow><capsuleGeometry args={[0.26, upper - 0.3, 8, 16]} />{mat}</mesh>}
      {hasUpper && <mesh position={[x, elbowY + upper * 0.32, 0.12]} scale={[1, 1.3, 0.8]} castShadow><sphereGeometry args={[0.24, 16, 16]} />{mat}</mesh>}
      {foreLen > 0 && <mesh position={[x, elbowY - foreLen / 2, 0]} castShadow><capsuleGeometry args={[0.21, Math.max(0.05, foreLen - 0.25), 8, 16]} />{mat}</mesh>}
      {hasHand && <mesh position={[x, wristY - hand / 2, 0]} castShadow><boxGeometry args={[0.32, hand, 0.16]} />{mat}</mesh>}
      {/* bandage on what was cut */}
      {state !== 'whole' && state !== 'weak' && state !== 'numb' && (
        <mesh position={[x, endY - 0.05, 0]}><sphereGeometry args={[state === 'gone' ? 0.34 : 0.25, 16, 16]} /><meshStandardMaterial color="#ffffff" roughness={0.95} /></mesh>
      )}
      {/* a sling for a weak arm */}
      {state === 'weak' && <mesh position={[x, elbowY - 0.25, 0.1]} rotation-z={side === 'left' ? 0.5 : -0.5}><torusGeometry args={[0.55, 0.06, 6, 24, Math.PI]} /><meshStandardMaterial color="#2c7fb8" /></mesh>}
      <Billboard position={[x * 1.55, 0.35, 0.6]}>
        <Text font={FONT} fontSize={0.2} color="#ffd84a" anchorX="center" outlineWidth={0.012} outlineColor="#000">{side === 'left' ? 'HIS LEFT · שְׂמֹאל' : 'HIS RIGHT · יָמִין'}</Text>
        <Text font={FONT} position={[0, -0.27, 0]} fontSize={0.16} color={state === 'whole' ? '#a9afc6' : '#ff9ccc'} anchorX="center" outlineWidth={0.01} outlineColor="#000">{st.label}</Text>
      </Billboard>
    </group>
  );
}

function Bayit({ x }) {
  return (
    <group position={[x, ARM_GEOM.bayitY, 0.3]}>
      <mesh castShadow><boxGeometry args={[0.32, 0.32, 0.32]} /><meshStandardMaterial color="#050507" roughness={0.18} metalness={0.35} /></mesh>
      <mesh position={[0, -0.17, -0.02]}><boxGeometry args={[0.46, 0.04, 0.46]} /><meshStandardMaterial color="#050507" roughness={0.3} /></mesh>
      <mesh position={[0, -0.05, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.36, 0.03, 6, 32]} /><meshStandardMaterial color="#050507" /></mesh>
    </group>
  );
}

/** The knot: a little black block (the yud's head) with the strap's end (its leg) sticking out. */
function YudKnot() {
  return (
    <group>
      <mesh castShadow><boxGeometry args={[0.16, 0.16, 0.12]} /><meshStandardMaterial color="#0b0b10" roughness={0.3} emissive="#ffd84a" emissiveIntensity={0.25} /></mesh>
      <mesh position={[0, -0.02, 0.17]}><boxGeometry args={[0.06, 0.04, 0.24]} /><meshStandardMaterial color="#ffd84a" emissive="#ffd84a" emissiveIntensity={1.6} toneMapped={false} /></mesh>
    </group>
  );
}
