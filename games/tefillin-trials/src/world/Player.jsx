import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { Vehicle } from 'yuka';
import { Person, LOOKS } from './Person.jsx';
import { touch, useGame } from '../store.js';

// Shared, mutable player state that NPCs, levels and the camera read every frame.
export const player = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  body: null,
  frozen: false,
  speedMul: 1,
  facing: 0,
  motion: { speed: 0 },
  // Yuka proxy so steering behaviours (pursuit, evade) can target the player.
  agent: new Vehicle(),
};

const dir = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const camLook = new THREE.Vector3();

export function Player({ start = [0, 1, 18], yad = true, rosh = false }) {
  const body = useRef();
  const visual = useRef();
  const hand = useRef();
  const [, get] = useKeyboardControls();
  // Mount the strap trail only once the player has a real position, or it streaks from the origin.
  const [trail, setTrail] = useState(false);
  useEffect(() => { const id = setTimeout(() => setTrail(true), 700); return () => clearTimeout(id); }, []);

  useFrame((state, dt) => {
    const b = body.current;
    if (!b) return;
    player.body = b;
    const k = get();
    dir.set((k.right ? 1 : 0) - (k.left ? 1 : 0) + touch.x, 0, (k.back ? 1 : 0) - (k.forward ? 1 : 0) + touch.y);
    if (dir.lengthSq() > 1) dir.normalize();
    const reaction = useGame.getState().reaction;
    const speed = (k.sprint ? 8.5 : 6) * player.speedMul;
    const lv = b.linvel();
    if (player.frozen || reaction || player.cinematic) {
      b.setLinvel({ x: lv.x * 0.8, y: lv.y, z: lv.z * 0.8 }, true);
    } else {
      b.setLinvel({ x: dir.x * speed, y: lv.y, z: dir.z * speed }, true);
    }
    const t = b.translation();
    player.pos.set(t.x, t.y, t.z);
    player.vel.set(lv.x, 0, lv.z);
    player.motion.speed = player.vel.length();
    player.agent.position.set(t.x, 0, t.z);
    player.agent.velocity.set(lv.x, 0, lv.z);

    if (dir.lengthSq() > 0.01 && !player.frozen && !reaction) {
      const targetYaw = Math.atan2(dir.x, dir.z);
      let d = targetYaw - player.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      player.facing += d * Math.min(1, dt * 12);
    }
    if (visual.current) {
      visual.current.position.set(t.x, t.y - 0.85, t.z);
      visual.current.rotation.y = player.facing;
    }

    if (player.cinematic) return;
    // Third-person follow camera with a little shake on hits.
    const shake = useGame.getState().shake > performance.now() ? 0.25 : 0;
    camTarget.set(t.x, t.y + 11, t.z + 12);
    state.camera.position.lerp(camTarget, Math.min(1, dt * 3));
    if (shake) state.camera.position.add({ x: (Math.random() - 0.5) * shake, y: (Math.random() - 0.5) * shake, z: 0 });
    camLook.set(t.x, t.y + 0.5, t.z - 2);
    state.camera.lookAt(camLook);
  });

  return (
    <>
      <RigidBody
        ref={body} name="player" colliders={false} position={start}
        enabledRotations={[false, false, false]} linearDamping={0.5} ccd
      >
        <CapsuleCollider args={[0.5, 0.38]} />
      </RigidBody>
      <group ref={visual} position={[start[0], start[1] - 0.85, start[2]]}>
        <Person {...LOOKS.player} yad={yad} rosh={rosh} motion={player.motion} />
        {yad && trail && (
          // The retzuah streaming behind you as you run: drei <Trail>.
          <Trail width={0.9} length={5} color="#0b0b10" attenuation={(w) => w * w} decay={1.2}>
            <mesh ref={hand} position={[-0.4, 0.95, 0]}><sphereGeometry args={[0.02]} /><meshBasicMaterial color="#000" /></mesh>
          </Trail>
        )}
      </group>
    </>
  );
}
