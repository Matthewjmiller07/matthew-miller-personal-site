import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Player, player } from '../world/Player.jsx';
import { Agent, useYukaWorld, makeAgent, addBehavior, only, ArriveBehavior, YV3 } from '../world/Crowd.jsx';
import { LOOKS } from '../world/Person.jsx';
import { useGame } from '../store.js';
import { useAction } from '../input.js';
import { sfx } from '../audio.js';
import { burst } from '../fx.js';
import { good, bad, shuffle } from './common.jsx';
import { CHECK_QUEUE, CHECK_LESSONS } from '../content.js';

// Shiur 6 · The Checkpoint. Everyone walks through a scanner at the shul door; it lights up whatever
// sits between their tefillin and their body (#95-#111) and you rule. Between them: shailos on
// keeping the yud by the bayit (#86-#94).

const GATE = { x: 0, z: 19.4 };
const PODIUM = { x: 3.1, z: 20.6 };
const DOOR = { x: 0, z: 23.3 };
// Where the flag lights up, in the person's own frame: [height, sideways].
const SPOTS = { arm: [1.35, -0.42], head: [2.05, 0], bayit: [1.4, -0.42], wrist: [0.95, -0.45], hair: [2.12, 0] };

export function Checkpoint() {
  const g = useGame;
  const world = useYukaWorld();
  const s = useRef({ i: -1, phase: 'intro', lives: 3, done: 0, score: 0, lessons: [], scanT: 0, stage: null }).current;
  const [flag, setFlag] = useState(null); // { pos: [x,y,z], what }
  const beam = useRef();
  const promptOwned = useRef(false);

  const cast = useMemo(() => {
    const sofer = makeAgent(world, { x: -3.4, z: 21.5, maxSpeed: 0, wander: false, look: { robe: '#1d2433', kippah: '#111', beard: '#5a3a22' }, name: 'The sofer', id: 'sofer' });
    sofer.faceTarget = { x: GATE.x, z: GATE.z };
    const chav = makeAgent(world, { x: 5.2, z: 21.8, maxSpeed: 0, wander: false, look: LOOKS.shmerel, name: 'Your chavruta', id: 'chav' });
    chav.faceTarget = { x: GATE.x, z: GATE.z };
    const people = CHECK_QUEUE.map((c, k) => {
      if (c.kind !== 'scan') return null;
      const v = makeAgent(world, { x: DOOR.x + (k % 2 ? 1.2 : -1.2), z: DOOR.z, maxSpeed: 2.6, wander: false, look: c.look, name: c.name, id: `s${k}` });
      v.goal = new YV3(GATE.x, 0, GATE.z + 0.1);
      addBehavior(v, 'go', new ArriveBehavior(v.goal, 1.4, 0.15), 1);
      only(v);
      v.hidden = true;
      return v;
    });
    return { sofer, chav, people };
  }, [world]);

  const hud = (patch = {}) => g.getState().setHud({ lives: s.lives, served: s.done, total: CHECK_QUEUE.length, score: s.score, objective: s.objective, stage: s.stage, ...patch });
  const lesson = (t) => { if (t && !s.lessons.includes(t)) s.lessons.push(t); };

  useEffect(() => {
    s.objective = 'Shiur 6 · The Checkpoint. Stand at your podium by the scanner.';
    hud();
    g.getState().toast('Shiur 6 · Chatzitzah. Everyone walks through the scanner on the way into shul; you rule on what it finds.', 'info');
    cast.chav.setSay?.({ who: 'Your chavruta', text: 'No Gemara says chatzitzah for tefillin. The Rosh learns it from the pesukim; the Rashba says there isn’t any. Let’s see what walks in.' });
    const id = setTimeout(() => { cast.chav.setSay?.(null); next(); }, 3800);
    return () => { clearTimeout(id); player.camOverride = false; player.frozen = false; g.getState().setReaction(null); };
  }, []);

  function loseLife(msg) { s.lives -= 1; bad(msg); lesson(msg); hud(); if (s.lives <= 0) { finish(false); return true; } return false; }

  function pick(who, line, options, why) {
    sfx.talk();
    return new Promise((resolve) => g.getState().setReaction({
      who, line, options: shuffle(options),
      onPick: (o) => {
        g.getState().setReaction(null);
        if (o.ok) good(why, 20); else { sfx.bad(); g.getState().toast(o.why || why, 'bad'); }
        resolve(o);
      },
    }));
  }

  function next() {
    if (s.phase === 'done') return;
    s.i += 1;
    const c = CHECK_QUEUE[s.i];
    if (!c) return finish(true);
    if (c.kind === 'shaila') {
      s.phase = 'shaila'; s.objective = c.title; hud();
      const speaker = c.who === 'The sofer at the door' ? cast.sofer : cast.chav;
      speaker.setSay?.({ who: c.who, text: c.line.replace(/[“”]/g, '') });
      setTimeout(async () => {
        const o = await pick(c.who, c.line, c.options, c.why);
        speaker.setSay?.(null);
        if (!o.ok && loseLife(c.why)) return;
        if (o.ok) { s.score += 40; lesson(c.lesson); }
        s.done += 1; hud(); setTimeout(next, 800);
      }, 700);
      return;
    }
    const v = cast.people[s.i];
    v.hidden = false; v.redraw?.();
    only(v, 'go');
    s.phase = 'walking'; s.objective = `${c.name} is coming through the door.`; hud();
  }

  async function scan() {
    const c = CHECK_QUEUE[s.i];
    const v = cast.people[s.i];
    s.phase = 'scanning'; s.stage = 'scan'; s.scanT = 0;
    if (beam.current) beam.current.visible = true;
    sfx.pulse();
    player.camOverride = true; player.frozen = true;
    s.objective = `Scanning ${c.name}…`; hud();
    await new Promise((r) => setTimeout(r, 1500));
    if (beam.current) beam.current.visible = false;
    const [y, side] = SPOTS[c.flag.spot];
    const yaw = Math.atan2((v.faceTarget?.x ?? 0) - v.position.x, (v.faceTarget?.z ?? 0) - v.position.z);
    // the person's local (side, y, 0.32) in world space
    const lx = side, lz = 0.32;
    const wx = v.position.x + lx * Math.cos(yaw) + lz * Math.sin(yaw);
    const wz = v.position.z - lx * Math.sin(yaw) + lz * Math.cos(yaw);
    setFlag({ pos: [wx, y, wz], what: c.flag.what });
    sfx.buzz();
    v.motion.talk = true;
    s.objective = `${c.name}: ${c.flag.what}. Your ruling?`; hud();
    const o = await pick(c.name, c.line, c.options, c.why);
    v.motion.talk = false;
    setFlag(null);
    if (!o.ok) { if (loseLife(c.why)) return; } else { s.score += 60; lesson(c.lesson); }
    player.camOverride = false; player.frozen = false; s.stage = null;
    v.look = { ...v.look, yad: true, rosh: true };
    v.redraw?.();
    v.motion.daven = true;
    burst('hineni', { x: v.position.x, y: 2.2, z: v.position.z });
    v.faceTarget = null;
    v.goal.set((s.i % 2 ? 1 : -1) * 1.6, 0, 10 - (s.i % 4) * 4);
    s.done += 1; s.phase = 'between'; hud();
    setTimeout(next, 1400);
  }

  useAction('action', () => {
    if (g.getState().reaction || s.phase !== 'ready') return;
    if (Math.hypot(player.pos.x - PODIUM.x, player.pos.z - PODIUM.z) < 2.4 || Math.hypot(player.pos.x - GATE.x, player.pos.z - GATE.z) < 3) scan();
  });

  function finish(won) {
    if (s.phase === 'done') return;
    s.phase = 'done'; player.camOverride = false; player.frozen = false; s.stage = null;
    const stars = !won ? 0 : s.lives === 3 ? 3 : s.lives === 2 ? 2 : 1;
    if (won) sfx.great();
    setTimeout(() => g.getState().finish('check', {
      won, stars, title: won ? 'Nothing in between: the yud home, the shul full' : 'The checkpoint closes early',
      stats: [['Scans and shailos', `${s.done}/${CHECK_QUEUE.length}`], ['Score', s.score], ['Lives left', '♥'.repeat(s.lives) || '0']],
      lessons: [...CHECK_LESSONS, ...s.lessons].slice(0, 8), xp: won ? stars * 90 + Math.round(s.score / 4) : 20,
    }), 1200);
  }

  useFrame((state, dt) => {
    if (s.phase === 'done') return;
    const c = CHECK_QUEUE[s.i];
    const v = cast.people[s.i];
    if (s.phase === 'walking' && v && Math.hypot(v.position.x - GATE.x, v.position.z - GATE.z) < 0.4) {
      s.phase = 'ready';
      v.faceTarget = { x: GATE.x, z: GATE.z - 6 };
      s.objective = `${c.name} is in the scanner. Press E at your podium to scan.`; hud();
    }
    const near = Math.hypot(player.pos.x - PODIUM.x, player.pos.z - PODIUM.z) < 2.4 || Math.hypot(player.pos.x - GATE.x, player.pos.z - GATE.z) < 3;
    if (s.phase === 'ready' && near) { promptOwned.current = true; g.getState().setPrompt(`E · scan ${c.name}`); }
    else if (promptOwned.current) { promptOwned.current = false; g.getState().setPrompt(null); }
    if (beam.current?.visible) { s.scanT += dt; beam.current.position.y = 0.1 + Math.abs(Math.sin(s.scanT * 4)) * 2.5; }
    if (s.stage === 'scan') {
      state.camera.position.lerp(new THREE.Vector3(GATE.x + 1.8, 2.9, GATE.z - 6.5), Math.min(1, dt * 4));
      state.camera.lookAt(GATE.x, 1.3, GATE.z);
    }
  });

  return (
    <>
      <Player start={[PODIUM.x, 1, PODIUM.z - 1.3]} yad rosh />
      <Agent v={cast.sofer} />
      <Agent v={cast.chav} />
      {cast.people.map((v) => v && <Walker key={v.uid} v={v} />)}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.2, 1.4, 0.3]} position={[GATE.x - 1.3, 1.4, GATE.z]} />
        <CuboidCollider args={[0.2, 1.4, 0.3]} position={[GATE.x + 1.3, 1.4, GATE.z]} />
        <CuboidCollider args={[0.5, 0.55, 0.3]} position={[PODIUM.x, 0.55, PODIUM.z]} />
      </RigidBody>
      {/* the scanner arch */}
      <group position={[GATE.x, 0, GATE.z]}>
        {[-1.3, 1.3].map((x) => <mesh key={x} position={[x, 1.4, 0]} castShadow><boxGeometry args={[0.3, 2.8, 0.5]} /><meshStandardMaterial color="#c9d3db" metalness={0.6} roughness={0.3} /></mesh>)}
        <mesh position={[0, 2.95, 0]} castShadow><boxGeometry args={[2.9, 0.35, 0.5]} /><meshStandardMaterial color="#c9d3db" metalness={0.6} roughness={0.3} /></mesh>
        <mesh position={[0, 2.75, 0.26]}><boxGeometry args={[2.2, 0.08, 0.08]} /><meshStandardMaterial color="#5ad1ff" emissive="#5ad1ff" emissiveIntensity={3} toneMapped={false} /></mesh>
        <mesh ref={beam} rotation-x={-Math.PI / 2} visible={false}>
          <planeGeometry args={[2.3, 0.08]} />
          <meshBasicMaterial color="#5ad1ff" transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[PODIUM.x, 0.55, PODIUM.z]} castShadow><boxGeometry args={[1, 1.1, 0.6]} /><meshStandardMaterial color="#5a3a20" roughness={0.6} /></mesh>
      {flag && (
        <group position={flag.pos}>
          <mesh><sphereGeometry args={[0.14, 16, 16]} /><meshStandardMaterial color="#ff5ad1" emissive="#ff5ad1" emissiveIntensity={3} toneMapped={false} /></mesh>
          <Html center position={[0, 0.45, 0]} style={{ pointerEvents: 'none' }}>
            <div className="tt-tag" style={{ borderColor: '#ff5ad1', color: '#ff9ce6', whiteSpace: 'nowrap' }}>⚠ {flag.what}</div>
          </Html>
        </group>
      )}
    </>
  );
}

function Walker({ v }) {
  const [, force] = useState(0);
  useEffect(() => { v.redraw = () => force((n) => n + 1); return () => { v.redraw = null; }; }, [v]);
  if (v.hidden) return null;
  return <Agent v={v} />;
}
