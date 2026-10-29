import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Float, Text, Html } from '@react-three/drei';
import { useGame } from '../store.js';
import { sfx } from '../audio.js';
import { burst, fxRef } from '../fx.js';
import { player } from '../world/Player.jsx';
import { FONT } from '../world/Shul.jsx';
import { useAction } from '../input.js';
import { ENCOUNTERS } from '../content.js';

export const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

const at = () => ({ x: player.pos.x, y: player.pos.y + 1, z: player.pos.z });

export function good(text, xp = 15) {
  const g = useGame.getState();
  sfx.good();
  burst('hineni', at());
  if (text) g.toast(text, 'good');
  g.addXp(xp);
}

export function bad(text) {
  const g = useGame.getState();
  sfx.bad();
  g.hit();
  burst('hefsek', at());
  if (text) g.toast(text, 'bad');
}

/** Pop a quick in-world decision. Resolves with true when the right option was picked. */
export function ask(kind, overrides = {}) {
  const e = { ...ENCOUNTERS[kind], ...overrides };
  sfx.talk();
  return new Promise((resolve) => {
    useGame.getState().setReaction({
      who: e.name,
      line: e.line,
      options: shuffle(e.options),
      onPick: (o) => {
        useGame.getState().setReaction(null);
        if (o.ok) good(e.why);
        else bad(o.why || e.why);
        resolve(!!o.ok);
      },
    });
  });
}

/** A glowing doorway into a level, with a Rapier sensor and three.quarks sparks. */
export function Portal({ position, color = '#e0b54a', title, he, stars = 0, onEnter }) {
  const [inside, setInside] = useState(false);
  const ring = useRef();
  useEffect(() => {
    const fx = fxRef.current;
    const c = [parseInt(color.slice(1, 3), 16) / 255, parseInt(color.slice(3, 5), 16) / 255, parseInt(color.slice(5, 7), 16) / 255];
    const sys = fx?.loop([position[0], 0.1, position[2]], { color: c, rate: 26, radius: 1.1, speed: [1, 2.6] });
    return () => {
      if (sys && fx) { fx.batch.deleteSystem(sys); sys.emitter.parent?.remove(sys.emitter); fx.loops = fx.loops.filter((s) => s !== sys); }
    };
  }, []);
  useFrame((_, dt) => { if (ring.current) ring.current.rotation.z += dt * (inside ? 2.5 : 0.6); });
  useEffect(() => { useGame.getState().setPrompt(inside ? `E · enter ${title}` : null); }, [inside]);
  useAction('action', () => { if (inside && !useGame.getState().reaction) onEnter(); });

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          sensor args={[1.3, 1.5, 1.3]} position={[0, 1.5, 0]}
          onIntersectionEnter={({ other }) => other.rigidBodyObject?.name === 'player' && setInside(true)}
          onIntersectionExit={({ other }) => other.rigidBodyObject?.name === 'player' && setInside(false)}
        />
      </RigidBody>
      <mesh ref={ring} position={[0, 2.2, 0]}>
        <torusGeometry args={[1.5, 0.09, 12, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={inside ? 4 : 1.8} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.1, 1.5, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <Float speed={2} floatIntensity={0.5}>
        <Text font={FONT} position={[0, 4.4, 0]} fontSize={0.55} color={color} anchorX="center" direction="rtl" outlineWidth={0.01} outlineColor="#000">{he}</Text>
      </Float>
      <Html position={[0, 3.75, 0]} center distanceFactor={16} style={{ pointerEvents: 'none' }}>
        <div className="tt-portal" style={{ borderColor: color }}>
          <div>{title}</div>
          <div className="tt-stars">{[0, 1, 2].map((i) => <span key={i} className={i < stars ? 'on' : ''}>★</span>)}</div>
        </div>
      </Html>
    </group>
  );
}

/** Runs a callback on a fixed timeline: [[seconds, fn], ...]; pauses during reactions. */
export function useTimeline(events, deps = []) {
  const t = useRef(0);
  const done = useRef(new Set());
  useEffect(() => { t.current = 0; done.current = new Set(); }, deps);
  useFrame((_, dt) => {
    if (useGame.getState().reaction) return;
    t.current += dt;
    events.forEach(([sec, fn], i) => {
      if (!done.current.has(i) && t.current >= sec) { done.current.add(i); fn(); }
    });
  });
  return t;
}
