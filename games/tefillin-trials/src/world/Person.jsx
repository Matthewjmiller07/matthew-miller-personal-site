import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// A tallit texture: white wool with black stripes near the edge.
let tallitTex = null;
function getTallit() {
  if (tallitTex) return tallitTex;
  const c = document.createElement('canvas');
  c.width = 8; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f2efe6'; g.fillRect(0, 0, 8, 64);
  g.fillStyle = '#1b1d2a';
  for (const y of [40, 46, 50]) g.fillRect(0, y, 8, y === 46 ? 2 : 3);
  tallitTex = new THREE.CanvasTexture(c);
  tallitTex.colorSpace = THREE.SRGBColorSpace;
  return tallitTex;
}

/**
 * A stylized shul-goer built from primitives.
 * motion: a mutable { speed, daven, talk } object; the figure walks, sways (shuckles) and
 * bobs its head from it.
 */
export function Person({
  robe = '#2b3a55', skin = '#e8c39e', kippah = '#1b1d2a', hat = 'kippah', beard = null,
  tallit = false, yad = false, rosh = false, scale = 1, motion, highlight = false, glow = null,
}) {
  const root = useRef();
  const legL = useRef();
  const legR = useRef();
  const armL = useRef();
  const armR = useRef();
  const torso = useRef();
  const head = useRef();
  const phase = useRef(Math.random() * 10);
  const tex = useMemo(() => (tallit ? getTallit() : null), [tallit]);

  useFrame((_, dt) => {
    const m = motion || {};
    const speed = Math.min(1, (m.speed || 0) / 5);
    phase.current += dt * (4 + speed * 8);
    const s = Math.sin(phase.current);
    if (legL.current) {
      legL.current.rotation.x = s * 0.7 * speed;
      legR.current.rotation.x = -s * 0.7 * speed;
      armL.current.rotation.x = -s * 0.6 * speed;
      armR.current.rotation.x = s * 0.6 * speed + (m.wave ? -2.4 + Math.sin(phase.current * 3) * 0.3 : 0);
    }
    // Shuckling: a forward sway while davening.
    const sway = m.daven ? Math.sin(phase.current * 0.5) * 0.22 : 0;
    torso.current.rotation.x = THREE.MathUtils.lerp(torso.current.rotation.x, sway, 0.2);
    head.current.position.y = 1.62 + (m.talk ? Math.abs(Math.sin(phase.current * 2.5)) * 0.05 : 0);
    root.current.position.y = speed > 0.05 ? Math.abs(s) * 0.06 : 0;
  });

  return (
    <group scale={scale}>
      <group ref={root}>
        {/* legs */}
        <group ref={legL} position={[-0.13, 0.75, 0]}>
          <mesh position={[0, -0.36, 0]} castShadow><capsuleGeometry args={[0.09, 0.55, 4, 8]} /><meshStandardMaterial color="#14161f" /></mesh>
          <mesh position={[0, -0.72, 0.05]} castShadow><boxGeometry args={[0.17, 0.09, 0.3]} /><meshStandardMaterial color="#08090d" roughness={0.25} metalness={0.3} /></mesh>
        </group>
        <group ref={legR} position={[0.13, 0.75, 0]}>
          <mesh position={[0, -0.36, 0]} castShadow><capsuleGeometry args={[0.09, 0.55, 4, 8]} /><meshStandardMaterial color="#14161f" /></mesh>
          <mesh position={[0, -0.72, 0.05]} castShadow><boxGeometry args={[0.17, 0.09, 0.3]} /><meshStandardMaterial color="#08090d" roughness={0.25} metalness={0.3} /></mesh>
        </group>
        <group ref={torso} position={[0, 0.75, 0]}>
          {/* body */}
          <RoundedBox args={[0.55, 0.75, 0.32]} radius={0.12} position={[0, 0.4, 0]} castShadow>
            <meshStandardMaterial color={robe} roughness={0.7} />
            {highlight && <Outlines thickness={0.045} color={glow || '#ffd84a'} />}
          </RoundedBox>
          <mesh position={[0, 0.76, 0.03]}><cylinderGeometry args={[0.12, 0.14, 0.1, 16]} /><meshStandardMaterial color="#f4f1e8" roughness={0.8} /></mesh>
          <mesh position={[0, 0.42, 0.165]}><boxGeometry args={[0.16, 0.6, 0.02]} /><meshStandardMaterial color="#f4f1e8" roughness={0.8} /></mesh>
          {tallit && (
            <mesh position={[0, 0.52, 0]} castShadow>
              <cylinderGeometry args={[0.36, 0.42, 0.62, 16, 1, true]} />
              <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.9} />
            </mesh>
          )}
          {/* arms */}
          <group ref={armL} position={[-0.36, 0.7, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow><capsuleGeometry args={[0.075, 0.45, 4, 8]} /><meshStandardMaterial color={robe} /></mesh>
            {yad && (
              <>
                <mesh position={[0.04, -0.12, 0.02]} castShadow><boxGeometry args={[0.12, 0.12, 0.12]} /><meshStandardMaterial color="#050507" roughness={0.25} metalness={0.2} /></mesh>
                <mesh position={[0, -0.38, 0]}><torusGeometry args={[0.09, 0.015, 6, 16]} /><meshStandardMaterial color="#050507" /></mesh>
                <mesh position={[0, -0.48, 0]}><torusGeometry args={[0.085, 0.015, 6, 16]} /><meshStandardMaterial color="#050507" /></mesh>
              </>
            )}
            <mesh position={[0, -0.6, 0]}><sphereGeometry args={[0.07, 10, 10]} /><meshStandardMaterial color={skin} /></mesh>
          </group>
          <group ref={armR} position={[0.36, 0.7, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow><capsuleGeometry args={[0.075, 0.45, 4, 8]} /><meshStandardMaterial color={robe} /></mesh>
            <mesh position={[0, -0.6, 0]}><sphereGeometry args={[0.07, 10, 10]} /><meshStandardMaterial color={skin} /></mesh>
          </group>
        </group>
        {/* head */}
        <group ref={head} position={[0, 1.62, 0]}>
          <mesh castShadow><sphereGeometry args={[0.2, 20, 20]} /><meshStandardMaterial color={skin} roughness={0.6} /></mesh>
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <mesh position={[sx * 0.07, 0.03, 0.17]}><sphereGeometry args={[0.033, 10, 10]} /><meshStandardMaterial color="#fafafa" roughness={0.3} /></mesh>
              <mesh position={[sx * 0.07, 0.03, 0.198]}><sphereGeometry args={[0.018, 8, 8]} /><meshStandardMaterial color="#14110e" roughness={0.2} /></mesh>
              <mesh position={[sx * 0.07, 0.085, 0.18]} rotation={[0, 0, sx * -0.12]}><boxGeometry args={[0.06, 0.012, 0.02]} /><meshStandardMaterial color={beard || '#2a1c12'} /></mesh>
              <mesh position={[sx * 0.2, 0, 0]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color={skin} roughness={0.6} /></mesh>
            </group>
          ))}
          <mesh position={[0, -0.01, 0.2]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color={skin} roughness={0.55} /></mesh>
          {beard && (
            <mesh position={[0, -0.16, 0.1]} rotation={[0.2, 0, Math.PI]}><coneGeometry args={[0.16, 0.34, 12]} /><meshStandardMaterial color={beard} roughness={1} /></mesh>
          )}
          {hat === 'kippah' && (
            <mesh position={[0, 0.13, -0.02]} rotation={[-0.25, 0, 0]}><sphereGeometry args={[0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6]} /><meshStandardMaterial color={kippah} /></mesh>
          )}
          {hat === 'fedora' && (
            <group position={[0, 0.17, 0]}>
              <mesh><cylinderGeometry args={[0.32, 0.32, 0.03, 24]} /><meshStandardMaterial color="#0b0b10" /></mesh>
              <mesh position={[0, 0.11, 0]}><cylinderGeometry args={[0.17, 0.2, 0.2, 24]} /><meshStandardMaterial color="#0b0b10" /></mesh>
            </group>
          )}
          {rosh && (
            <group position={[0, 0.16, 0.13]} rotation={[-0.5, 0, 0]}>
              <mesh castShadow><boxGeometry args={[0.13, 0.13, 0.13]} /><meshStandardMaterial color="#050507" roughness={0.2} metalness={0.3} emissive="#ffd84a" emissiveIntensity={0.08} /></mesh>
              <mesh position={[0, -0.08, -0.05]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2, 0.012, 6, 32]} /><meshStandardMaterial color="#050507" /></mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  );
}

// Preset looks for the cast.
export const LOOKS = {
  player: { robe: '#e7e9f0', kippah: '#2c5aa0', tallit: true, skin: '#e8c39e' },
  shmerel: { robe: '#7a3b2e', kippah: '#e0b54a', beard: '#5a3a22', skin: '#f0cfa8' },
  kid: { robe: '#e0b54a', kippah: '#c0392b', scale: 0.62, skin: '#f3d2b0' },
  rav: { robe: '#101218', hat: 'fedora', beard: '#d9d9d9', skin: '#e3bf9a' },
  gabbai: { robe: '#2e5d4b', kippah: '#111', beard: '#2a1c12', skin: '#d9a77c' },
  chazan: { robe: '#e7e9f0', hat: 'fedora', tallit: true, beard: '#3a2a1a', skin: '#e8c39e' },
  host: { robe: '#30245a', kippah: '#fff', beard: '#6b4a2b', skin: '#eac5a0' },
};
