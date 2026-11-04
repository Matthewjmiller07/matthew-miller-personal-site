import { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Text, Float, Environment, Lightformer, Sparkles, Sky, Instances, Instance } from '@react-three/drei';
import { FONT } from './Shul.jsx';

// World 2: a Jerusalem-stone street corner on a bright morning, with a tefillin stand.
export const STREET = { halfX: 22, halfZ: 18 };
export const STAND = { x: 0, z: -2 }; // the table's centre; customers stand on +z, you behind on -z
export const ARM_STAGE = { x: 0, y: 0, z: -60 }; // off-screen close-up stage for the arm

// Warm limestone with mortar lines and a little noise.
function makeStoneTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e6d3ad'; g.fillRect(0, 0, 256, 256);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let r = 0; r < 8; r++) {
    const off = r % 2 ? 32 : 0;
    for (let k = -1; k < 4; k++) {
      const x = k * 64 + off, y = r * 32;
      const v = 200 + Math.floor(rnd() * 40);
      g.fillStyle = `rgb(${v + 20},${v},${v - 40})`;
      g.fillRect(x + 2, y + 2, 60, 28);
    }
  }
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(90,70,40,${rnd() * 0.12})`; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeCobbleTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#6b6258'; g.fillRect(0, 0, 256, 256);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < 256; y += 21) for (let x = (y / 21) % 2 ? -10 : 0; x < 256; x += 21) {
    const v = 120 + Math.floor(rnd() * 50);
    g.fillStyle = `rgb(${v + 12},${v + 4},${v - 8})`;
    g.beginPath(); g.roundRect(x + 1.5, y + 1.5, 18, 18, 5); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 8);
  return t;
}

function Building({ position, size, stone, windows = 3, floors = 3, awning }) {
  const [w, h, d] = size;
  const tex = useMemo(() => { const t = stone.clone(); t.repeat.set(w / 4, h / 4); t.needsUpdate = true; return t; }, [stone, w, h]);
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      {/* window grid with green shutters and arched tops */}
      {Array.from({ length: floors }).map((_, f) => Array.from({ length: windows }).map((__, k) => {
        const x = -w / 2 + (w / windows) * (k + 0.5);
        const y = 2.2 + f * (h - 2.5) / floors;
        return (
          <group key={`${f}-${k}`} position={[x, y, d / 2 + 0.02]}>
            <mesh><planeGeometry args={[1, 1.5]} /><meshStandardMaterial color="#1d2a35" emissive="#ffd9a0" emissiveIntensity={f === 0 && k === 1 ? 0.6 : 0.08} roughness={0.2} metalness={0.4} /></mesh>
            <mesh position={[0, 0.75, 0]}><circleGeometry args={[0.5, 16, 0, Math.PI]} /><meshStandardMaterial color="#1d2a35" roughness={0.2} /></mesh>
            {[-0.72, 0.72].map((sx) => <mesh key={sx} position={[sx, 0, 0.02]}><planeGeometry args={[0.42, 1.5]} /><meshStandardMaterial color="#2f6b55" roughness={0.7} /></mesh>)}
            <mesh position={[0, -0.82, 0.08]}><boxGeometry args={[1.3, 0.1, 0.2]} /><meshStandardMaterial color="#d9c49b" /></mesh>
          </group>
        );
      }))}
      {awning && (
        <mesh position={[0, 3.1, d / 2 + 0.7]} rotation-x={0.35} castShadow>
          <boxGeometry args={[w * 0.7, 0.06, 1.6]} />
          <meshStandardMaterial color={awning} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

function StreetLamp({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.2, 0]} castShadow><cylinderGeometry args={[0.07, 0.11, 4.4, 10]} /><meshStandardMaterial color="#20242c" metalness={0.7} roughness={0.4} /></mesh>
      <mesh position={[0, 4.5, 0]}><cylinderGeometry args={[0.28, 0.16, 0.5, 6]} /><meshStandardMaterial color="#20242c" metalness={0.7} roughness={0.4} /></mesh>
      <mesh position={[0, 4.45, 0]}><sphereGeometry args={[0.16, 12, 12]} /><meshStandardMaterial color="#fff3c8" emissive="#ffd88a" emissiveIntensity={2.5} toneMapped={false} /></mesh>
    </group>
  );
}

function Tree({ position, s = 1 }) {
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.6, 0.5, 0.7, 14]} /><meshStandardMaterial color="#b9a07a" roughness={0.9} /></mesh>
      <mesh position={[0, 1.4, 0]} castShadow><cylinderGeometry args={[0.08, 0.12, 1.6, 8]} /><meshStandardMaterial color="#5a3d25" /></mesh>
      {[[0, 2.6, 0, 0.9], [0.45, 2.3, 0.2, 0.6], [-0.4, 2.35, -0.15, 0.65]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color={i ? '#4f8a3c' : '#5d9a45'} roughness={0.85} flatShading /></mesh>
      ))}
    </group>
  );
}

/** The tefillin stand: a folding table, a striped awning, boxes of tefillin and a sign. */
export function Stand() {
  return (
    <group position={[STAND.x, 0, STAND.z]}>
      {/* table */}
      <mesh position={[0, 0.92, 0]} castShadow receiveShadow><boxGeometry args={[4.2, 0.08, 1.4]} /><meshStandardMaterial color="#f4f1e8" roughness={0.7} /></mesh>
      <mesh position={[0, 0.5, 0.71]}><planeGeometry args={[4.2, 0.85]} /><meshStandardMaterial color="#1f3f7a" roughness={0.8} /></mesh>
      <Text font={FONT} position={[0, 0.55, 0.73]} fontSize={0.36} color="#ffd84a" anchorX="center" direction="rtl" outlineWidth={0.008} outlineColor="#000">הֲנָחַת תְּפִלִּין</Text>
      {[-1.9, 1.9].map((x) => [-0.55, 0.55].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.45, z]}><cylinderGeometry args={[0.03, 0.03, 0.9, 6]} /><meshStandardMaterial color="#9aa0aa" metalness={0.8} roughness={0.3} /></mesh>
      )))}
      {/* tefillin bags and boxes on the table */}
      {[-1.4, -0.7, 0.6, 1.3].map((x, i) => (
        <group key={x} position={[x, 1.02, -0.2 + (i % 2) * 0.25]}>
          <mesh castShadow><boxGeometry args={[0.42, 0.16, 0.3]} /><meshStandardMaterial color={['#5a1620', '#1d2433', '#2e5d4b', '#3a2e5a'][i]} roughness={0.6} /></mesh>
          <mesh position={[0, 0.09, 0]}><boxGeometry args={[0.43, 0.02, 0.31]} /><meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.3} /></mesh>
        </group>
      ))}
      <group position={[0, 1.08, 0.25]}>
        <mesh castShadow><boxGeometry args={[0.2, 0.2, 0.2]} /><meshStandardMaterial color="#050507" roughness={0.2} metalness={0.3} /></mesh>
        <mesh position={[0, -0.1, 0]}><boxGeometry args={[0.32, 0.02, 0.32]} /><meshStandardMaterial color="#050507" /></mesh>
      </group>
      {/* awning poles and stripes */}
      {[-2.1, 2.1].map((x) => (
        <mesh key={x} position={[x, 1.6, -1.25]} castShadow><cylinderGeometry args={[0.04, 0.04, 3.2, 8]} /><meshStandardMaterial color="#d9dde5" metalness={0.8} roughness={0.25} /></mesh>
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-2.1 + 0.2625 + i * 0.525, 3.05, -1.05]} rotation-x={0.55} castShadow>
          <boxGeometry args={[0.525, 0.04, 0.8]} />
          <meshStandardMaterial color={i % 2 ? '#f4f1e8' : '#2c5aa0'} roughness={0.8} />
        </mesh>
      ))}
      {/* sign */}
      <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.15}>
        <group position={[0, 3.75, -1.3]}>
          <mesh><boxGeometry args={[3.4, 0.75, 0.08]} /><meshStandardMaterial color="#141826" roughness={0.4} /></mesh>
          <mesh position={[0, 0, -0.01]}><boxGeometry args={[3.5, 0.85, 0.06]} /><meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.3} /></mesh>
          <Text font={FONT} position={[0, 0.06, 0.05]} fontSize={0.36} color="#ffd84a" anchorX="center" direction="rtl">יָד כֵּהָה</Text>
          <Text font={FONT} position={[0, -0.24, 0.05]} fontSize={0.12} color="#e7e9f0" anchorX="center" letterSpacing={0.2}>TEFILLIN STAND · FREE</Text>
        </group>
      </Float>
    </group>
  );
}

export function Street() {
  const stone = useMemo(makeStoneTexture, []);
  const cobble = useMemo(makeCobbleTexture, []);
  const { halfX, halfZ } = STREET;
  return (
    <group>
      <color attach="background" args={['#9cc6ea']} />
      <fog attach="fog" args={['#cfe2f0', 35, 90]} />
      <Sky distance={4500} sunPosition={[30, 18, 20]} turbidity={6} rayleigh={1.4} mieCoefficient={0.004} mieDirectionalG={0.85} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#dff0ff', '#a58a60', 0.8]} />
      <directionalLight
        position={[18, 24, 14]} intensity={2.4} color="#fff1d6" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30}
        shadow-camera-top={30} shadow-camera-bottom={-30} shadow-bias={-0.0004}
      />
      {!new URLSearchParams(location.search).has('noenv') && <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} color="#dcefff" />
        <Lightformer form="rect" intensity={2} position={[20, 5, 10]} rotation-y={-Math.PI / 2} scale={[20, 6, 1]} color="#ffe6c0" />
      </Environment>}

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[halfX, 0.5, halfZ]} position={[0, -0.5, 0]} />
        <CuboidCollider args={[0.5, 5, halfZ]} position={[-halfX - 0.5, 5, 0]} />
        <CuboidCollider args={[0.5, 5, halfZ]} position={[halfX + 0.5, 5, 0]} />
        <CuboidCollider args={[halfX, 5, 0.5]} position={[0, 5, -halfZ - 0.5]} />
        <CuboidCollider args={[halfX, 5, 0.5]} position={[0, 5, halfZ + 0.5]} />
        {/* the stand's table */}
        <CuboidCollider args={[2.1, 0.5, 0.7]} position={[STAND.x, 0.5, STAND.z]} />
        {/* the arm stage floor, far away */}
        <CuboidCollider args={[6, 0.5, 6]} position={[ARM_STAGE.x, -0.5, ARM_STAGE.z]} />
      </RigidBody>

      {/* cobbles, a pale sidewalk and a crosswalk */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[halfX * 2, halfZ * 2]} />
        <meshStandardMaterial map={cobble} roughness={0.92} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, -halfZ + 4]} receiveShadow>
        <planeGeometry args={[halfX * 2, 6]} />
        <meshStandardMaterial color="#d8cbb0" roughness={0.9} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[-halfX + 4, 0.025, 8 - i * 1.3]}><planeGeometry args={[4, 0.6]} /><meshStandardMaterial color="#f4f1e8" roughness={0.8} /></mesh>
      ))}

      {/* buildings around the square */}
      <Building position={[-12, 0, -halfZ - 3]} size={[14, 11, 6]} stone={stone} windows={4} awning="#2c5aa0" />
      <Building position={[6, 0, -halfZ - 3]} size={[12, 13, 6]} stone={stone} windows={3} floors={4} awning="#7a3b2e" />
      <Building position={[18, 0, -halfZ - 2]} size={[9, 9, 6]} stone={stone} windows={2} />
      <group rotation-y={Math.PI / 2}><Building position={[4, 0, -halfX - 3]} size={[22, 10, 6]} stone={stone} windows={5} /></group>
      <group rotation-y={-Math.PI / 2}><Building position={[-4, 0, -halfX - 3]} size={[22, 12, 6]} stone={stone} windows={5} floors={4} awning="#2e5d4b" /></group>
      {/* a little shul across the square, with its name over the door */}
      <group position={[0, 0, -halfZ - 1]}>
        <mesh position={[0, 0.02, 0.3]}><boxGeometry args={[2, 3, 0.1]} /><meshStandardMaterial color="#5b3a1e" /></mesh>
        <Text font={FONT} position={[0, 3.6, 0.2]} fontSize={0.42} color="#2c3b5a" anchorX="center" direction="rtl">בֵּית הַכְּנֶסֶת</Text>
      </group>

      {[[-9, 6], [9, 6], [-9, -10], [9, -10]].map(([x, z]) => <StreetLamp key={`${x}${z}`} position={[x, 0, z]} />)}
      {[[-16, 10, 1.2], [16, 10, 1.1], [-17, -8, 1], [17, -8, 1.25]].map(([x, z, s]) => <Tree key={`${x}${z}`} position={[x, 0, z]} s={s} />)}

      {/* benches along the square */}
      <Instances limit={6} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.1, 0.6]} />
        <meshStandardMaterial color="#6b4527" roughness={0.6} />
        {[[-14, 2], [14, 2], [-14, -4], [14, -4]].map(([x, z], i) => <Instance key={i} position={[x, 0.5, z]} rotation-y={Math.PI / 2} />)}
      </Instances>

      <Stand />
      <Sparkles count={60} scale={[40, 8, 34]} position={[0, 4, 0]} size={2.2} speed={0.2} color="#fffbe8" opacity={0.35} />
    </group>
  );
}
