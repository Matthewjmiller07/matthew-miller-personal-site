import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import {
  EntityManager, Vehicle, GameEntity, WanderBehavior, ObstacleAvoidanceBehavior, ArriveBehavior,
  PursuitBehavior, FleeBehavior, SeekBehavior, StateMachine, State, Vector3 as YV3,
} from 'yuka';
import { Person } from './Person.jsx';
import { BENCHES, BIMAH, HALF_X, HALF_Z } from './Shul.jsx';
import { useGame } from '../store.js';

// ── Yuka plumbing ───────────────────────────────────────────────────────────

// "Standing still" speed. A true 0 makes Yuka's pursuit and obstacle avoidance divide by zero.
export const STILL = 1e-4;

// Obstacles every agent steers around: two circles per bench, the bimah, the aron.
export function makeObstacles() {
  const obs = [];
  const add = (x, z, r) => { const e = new GameEntity(); e.position.set(x, 0, z); e.boundingRadius = r; obs.push(e); };
  for (const [x, z] of BENCHES) { add(x - 1.5, z, 1.35); add(x + 1.5, z, 1.35); }
  add(BIMAH.x, BIMAH.z, BIMAH.half * 1.45);
  add(0, -HALF_Z + 1, 3.2);
  return obs;
}

export function useYukaWorld() {
  const world = useMemo(() => ({ em: new EntityManager(), obstacles: makeObstacles(), timeScale: 1 }), []);
  useFrame((_, dt) => {
    const paused = !!useGame.getState().reaction;
    world.em.update(paused ? 0 : Math.min(dt, 0.1) * world.timeScale);
  });
  return world;
}

/** A vehicle with sane defaults, obstacle avoidance and a wander fallback. */
export function makeAgent(world, { x = 0, z = 0, maxSpeed = 2, wander = true, look = {}, name = '', id = '' } = {}) {
  const v = new Vehicle();
  v.position.set(x, 0, z);
  v.maxSpeed = maxSpeed || STILL;
  v.baseSpeed = maxSpeed || STILL;
  v.maxForce = 12;
  v.boundingRadius = 0.45;
  v.look = look;
  v.name = name;
  v.uid = id || name;
  v.motion = { speed: 0, daven: false, talk: false, wave: false };
  const avoid = new ObstacleAvoidanceBehavior(world.obstacles);
  avoid.weight = 3;
  v.steering.add(avoid);
  v.behaviors = { avoid };
  if (wander) {
    const w = new WanderBehavior(1.2, 4, 3);
    v.steering.add(w);
    v.behaviors.wander = w;
  }
  world.em.add(v);
  return v;
}

export function addBehavior(v, key, behavior, weight = 1) {
  behavior.weight = weight;
  v.steering.add(behavior);
  v.behaviors[key] = behavior;
  return behavior;
}

export function only(v, ...keys) {
  for (const [k, b] of Object.entries(v.behaviors)) b.active = k === 'avoid' || keys.includes(k);
}

// Yuka state-machine helpers for the poskim and the kid.
export class FnState extends State {
  constructor(enter, execute, exit) { super(); this.e = enter; this.x = execute; this.o = exit; }
  enter(o) { this.e?.(o); }
  execute(o) { this.x?.(o); }
  exit(o) { this.o?.(o); }
}

export function machine(owner, states, initial) {
  const sm = new StateMachine(owner);
  for (const [id, st] of Object.entries(states)) sm.add(id, st);
  sm.changeTo(initial);
  return sm;
}

export { Vehicle, WanderBehavior, ArriveBehavior, PursuitBehavior, FleeBehavior, SeekBehavior, YV3 };

// ── Rendering an agent ──────────────────────────────────────────────────────

/** Draws a Yuka vehicle as a person, with a kinematic Rapier body so you bump into them. */
export function Agent({ v, label, highlight = false, labelColor = '#e7e9f0', height = 0.88 }) {
  const body = useRef();
  const vis = useRef();
  const [say, setSay] = useState(null);
  useEffect(() => { v.setSay = setSay; return () => { v.setSay = null; }; }, [v]);

  useFrame((_, dt) => {
    // Guard: a steering edge case must never feed NaN into Rapier.
    if (!Number.isFinite(v.position.x) || !Number.isFinite(v.position.z)) {
      if (v.lastGood) v.position.copy(v.lastGood); else v.position.set(0, 0, 0);
      v.velocity.set(0, 0, 0);
    } else {
      (v.lastGood ||= v.position.clone()).copy(v.position);
    }
    if (!Number.isFinite(v.velocity.x)) v.velocity.set(0, 0, 0);
    // keep agents on the floor and inside the walls
    v.position.y = 0;
    v.velocity.y = 0;
    v.position.x = Math.max(-HALF_X + 0.8, Math.min(HALF_X - 0.8, v.position.x));
    v.position.z = Math.max(-HALF_Z + 2, Math.min(HALF_Z - 0.8, v.position.z));
    const sp = v.velocity.length();
    v.motion.speed = sp;
    body.current?.setNextKinematicTranslation({ x: v.position.x, y: height, z: v.position.z });
    if (vis.current) {
      vis.current.position.set(v.position.x, 0, v.position.z);
      let yaw = vis.current.rotation.y;
      if (v.faceTarget) {
        yaw = Math.atan2(v.faceTarget.x - v.position.x, v.faceTarget.z - v.position.z);
      } else if (sp > 0.15) {
        yaw = Math.atan2(v.velocity.x, v.velocity.z);
      }
      let d = yaw - vis.current.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      vis.current.rotation.y += d * Math.min(1, dt * 8);
    }
  });

  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[v.position.x, height, v.position.z]}>
        <CapsuleCollider args={[0.5, 0.36 * (v.look.scale || 1)]} />
      </RigidBody>
      <group ref={vis}>
        <Person {...v.look} motion={v.motion} highlight={highlight} />
        {(label || say) && (
          <Html position={[0, 2.35 * (v.look.scale || 1), 0]} center distanceFactor={15} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            {say ? (
              <div className="tt-bubble">{say.who && <b>{say.who}</b>}{say.text}</div>
            ) : (
              <div className="tt-tag" style={{ borderColor: labelColor, color: labelColor }}>{label}</div>
            )}
          </Html>
        )}
      </group>
    </>
  );
}
