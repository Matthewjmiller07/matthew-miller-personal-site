import { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Text, Float, Instances, Instance, Sparkles } from '@react-three/drei';
import { FONT } from './Shul.jsx';
import { HALF_X, HALF_Z, BEDS, BODY_STAGE, NURSES } from '../layout.js';

// Shiur 5: a bright rehab ward. Same footprint as the shul, so the crowd code's bounds still fit.
export const WARD = { halfX: HALF_X, halfZ: HALF_Z };
export { BEDS, BODY_STAGE, NURSES };

// Pale vinyl tiles with a faint speckle.
function makeTileTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#dfe6e8'; g.fillRect(0, 0, 256, 256);
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = 214 + Math.floor(rnd() * 16);
    g.fillStyle = `rgb(${v - 6},${v + 2},${v + 4})`;
    g.fillRect(x * 64 + 1, y * 64 + 1, 62, 62);
  }
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(60,80,90,${rnd() * 0.12})`; g.fillRect(rnd() * 256, rnd() * 256, 1.5, 1.5); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(9, 12);
  return t;
}

function Bed({ x, z, side }) {
  // The head of the bed is against the wall; the foot points into the aisle.
  const r = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  return (
    <group position={[x + side * 1.6, 0, z]} rotation-y={r}>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow><boxGeometry args={[1.3, 0.22, 2.4]} /><meshStandardMaterial color="#f7f9fb" roughness={0.8} /></mesh>
      <mesh position={[0, 0.76, -0.25]} castShadow><boxGeometry args={[1.24, 0.08, 1.7]} /><meshStandardMaterial color="#8fc1e3" roughness={0.9} /></mesh>
      <mesh position={[0, 0.82, -0.95]} castShadow><boxGeometry args={[0.8, 0.14, 0.4]} /><meshStandardMaterial color="#ffffff" roughness={0.9} /></mesh>
      <mesh position={[0, 0.95, -1.2]}><boxGeometry args={[1.36, 0.8, 0.06]} /><meshStandardMaterial color="#c9d3db" metalness={0.5} roughness={0.35} /></mesh>
      <mesh position={[0, 0.8, 1.2]}><boxGeometry args={[1.36, 0.5, 0.05]} /><meshStandardMaterial color="#c9d3db" metalness={0.5} roughness={0.35} /></mesh>
      {[[-0.6, -1.1], [0.6, -1.1], [-0.6, 1.1], [0.6, 1.1]].map(([a, b], i) => (
        <mesh key={i} position={[a, 0.26, b]}><cylinderGeometry args={[0.04, 0.04, 0.52, 6]} /><meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.3} /></mesh>
      ))}
      {/* IV pole and a curtain rail */}
      <mesh position={[0.85, 1.1, -1]}><cylinderGeometry args={[0.025, 0.025, 2.2, 6]} /><meshStandardMaterial color="#c9d3db" metalness={0.8} roughness={0.25} /></mesh>
      <mesh position={[0.85, 2.05, -1]}><boxGeometry args={[0.12, 0.2, 0.05]} /><meshStandardMaterial color="#d8f0ff" transparent opacity={0.7} /></mesh>
      <mesh position={[-0.95, 1.55, 0]}><boxGeometry args={[0.04, 2.3, 2.6]} /><meshStandardMaterial color="#7fb7c9" roughness={0.95} transparent opacity={0.55} side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

export function WardRoom() {
  const tiles = useMemo(makeTileTexture, []);
  const { halfX, halfZ } = WARD;
  return (
    <group>
      <color attach="background" args={['#cfe3ee']} />
      <fog attach="fog" args={['#e6f0f5', 40, 95]} />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={['#ffffff', '#9fb3bf', 0.9]} />
      <directionalLight
        position={[-16, 20, 10]} intensity={1.8} color="#fff6e6" castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-28} shadow-camera-right={28}
        shadow-camera-top={30} shadow-camera-bottom={-30} shadow-bias={-0.0004}
      />

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[halfX, 0.5, halfZ]} position={[0, -0.5, 0]} />
        <CuboidCollider args={[0.5, 5, halfZ]} position={[-halfX - 0.5, 5, 0]} />
        <CuboidCollider args={[0.5, 5, halfZ]} position={[halfX + 0.5, 5, 0]} />
        <CuboidCollider args={[halfX, 5, 0.5]} position={[0, 5, -halfZ - 0.5]} />
        <CuboidCollider args={[halfX, 5, 0.5]} position={[0, 5, halfZ + 0.5]} />
        {BEDS.map((b, i) => <CuboidCollider key={i} args={[1.25, 0.6, 0.7]} position={[b.x + b.side * 1.6, 0.6, b.z]} />)}
        <CuboidCollider args={[3.2, 0.6, 0.6]} position={[NURSES.x, 0.6, NURSES.z]} />
        <CuboidCollider args={[6, 0.5, 6]} position={[BODY_STAGE.x, -0.5, BODY_STAGE.z]} />
      </RigidBody>

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[halfX * 2, halfZ * 2]} />
        <meshStandardMaterial map={tiles} roughness={0.55} />
      </mesh>
      {/* a blue guide line down the aisle */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}><planeGeometry args={[0.25, halfZ * 2 - 4]} /><meshStandardMaterial color="#2c7fb8" roughness={0.6} /></mesh>

      {/* walls with a wainscot and long windows */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (halfX + 0.05), 0, 0]} rotation-y={s < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <mesh position={[0, 4, 0]} receiveShadow><planeGeometry args={[halfZ * 2, 8]} /><meshStandardMaterial color="#eef3f5" roughness={0.9} /></mesh>
          <mesh position={[0, 0.6, 0.02]}><planeGeometry args={[halfZ * 2, 1.2]} /><meshStandardMaterial color="#7fb7c9" roughness={0.8} /></mesh>
          {[-18, -9, 0, 9, 18].map((z) => (
            <mesh key={z} position={[z, 3.6, 0.03]}><planeGeometry args={[4.2, 2.6]} /><meshStandardMaterial color="#bfe4ff" emissive="#dff3ff" emissiveIntensity={0.9} toneMapped={false} /></mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 4, -halfZ - 0.05]}><planeGeometry args={[halfX * 2, 8]} /><meshStandardMaterial color="#eef3f5" roughness={0.9} /></mesh>
      <mesh position={[0, 4, halfZ + 0.05]} rotation-y={Math.PI}><planeGeometry args={[halfX * 2, 8]} /><meshStandardMaterial color="#eef3f5" roughness={0.9} /></mesh>
      {/* ceiling light panels */}
      <Instances limit={12}>
        <boxGeometry args={[2.4, 0.06, 1.1]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.4} toneMapped={false} />
        {[-16, -8, 0, 8, 16].flatMap((z) => [-6, 6].map((x) => <Instance key={`${x}${z}`} position={[x, 7.9, z]} />))}
      </Instances>

      {BEDS.map((b, i) => <Bed key={i} {...b} />)}

      {/* the nurses' station, with a sign */}
      <group position={[NURSES.x, 0, NURSES.z]}>
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow><boxGeometry args={[6.4, 1.2, 1.2]} /><meshStandardMaterial color="#f7f9fb" roughness={0.6} /></mesh>
        <mesh position={[0, 1.22, 0]}><boxGeometry args={[6.6, 0.06, 1.4]} /><meshStandardMaterial color="#2c7fb8" roughness={0.4} /></mesh>
        <mesh position={[1.8, 1.45, -0.2]}><boxGeometry args={[0.7, 0.42, 0.04]} /><meshStandardMaterial color="#14161f" emissive="#3aa0ff" emissiveIntensity={0.5} /></mesh>
      </group>
      <Float speed={1.4} rotationIntensity={0.04} floatIntensity={0.15}>
        <group position={[0, 5.4, -halfZ + 0.4]}>
          <mesh><boxGeometry args={[7.4, 1.5, 0.1]} /><meshStandardMaterial color="#14324a" roughness={0.4} /></mesh>
          <Text font={FONT} position={[0, 0.2, 0.07]} fontSize={0.62} color="#ffffff" anchorX="center" direction="rtl">מַחְלֶקֶת שִׁקּוּם</Text>
          <Text font={FONT} position={[0, -0.42, 0.07]} fontSize={0.2} color="#9fd7ff" anchorX="center" letterSpacing={0.25}>REHABILITATION WARD · TEFILLIN ROUNDS</Text>
        </group>
      </Float>
      {/* an Israeli flag by the door */}
      <group position={[halfX - 2.4, 0, halfZ - 1.2]}>
        <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.04, 0.04, 3.2, 6]} /><meshStandardMaterial color="#c9d3db" metalness={0.8} roughness={0.3} /></mesh>
        <mesh position={[-0.6, 2.75, 0]}><planeGeometry args={[1.2, 0.85]} /><meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} /></mesh>
        {[0.28, -0.28].map((y) => <mesh key={y} position={[-0.6, 2.75 + y, 0.005]}><planeGeometry args={[1.2, 0.1]} /><meshStandardMaterial color="#1f4fb5" side={THREE.DoubleSide} /></mesh>)}
      </group>
      <Sparkles count={40} scale={[34, 6, 44]} position={[0, 4, 0]} size={2} speed={0.15} color="#ffffff" opacity={0.3} />
    </group>
  );
}
