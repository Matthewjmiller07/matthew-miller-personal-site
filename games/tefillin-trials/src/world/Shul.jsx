import { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { MeshReflectorMaterial, Text, Float, Environment, Lightformer, Instances, Instance, Sparkles } from '@react-three/drei';

export const HALF_X = 18;
export const HALF_Z = 24;
export const FONT = `${import.meta.env.BASE_URL}fonts/NotoSerifHebrew-Bold.ttf`;

// Bench rows: [x, z] centers, each 5.5 wide.
export const BENCHES = [];
for (const z of [-16, -12, -8, 8, 12, 16]) for (const x of [-12, -4.5, 4.5, 12]) BENCHES.push([x, z]);
export const BIMAH = { x: 0, z: 0, half: 2.6 };

export function Shul() {
  const windows = useMemo(() => {
    const w = [];
    for (const z of [-18, -9, 0, 9, 18]) { w.push([-HALF_X + 0.05, z, Math.PI / 2]); w.push([HALF_X - 0.05, z, -Math.PI / 2]); }
    return w;
  }, []);

  return (
    <group>
      <color attach="background" args={['#07080d']} />
      <fog attach="fog" args={['#07080d', 30, 70]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#ffe9c4', '#1b2033', 0.6]} />
      <directionalLight
        position={[12, 22, 10]} intensity={1.6} color="#ffe2b0" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-26} shadow-camera-right={26}
        shadow-camera-top={30} shadow-camera-bottom={-30} shadow-bias={-0.0004}
      />
      <pointLight position={[0, 6, -20]} intensity={40} color="#ffb347" distance={18} />
      {!new URLSearchParams(location.search).has('noenv') && <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.5} position={[0, 8, -10]} scale={[20, 4, 1]} color="#ffe6c0" />
        <Lightformer form="ring" intensity={4} position={[0, 6, 6]} scale={4} color="#ffd27a" />
        <Lightformer form="rect" intensity={1.5} position={[-15, 4, 0]} rotation-y={Math.PI / 2} scale={[30, 3, 1]} color="#9fc4ff" />
        <Lightformer form="rect" intensity={1.5} position={[15, 4, 0]} rotation-y={-Math.PI / 2} scale={[30, 3, 1]} color="#9fc4ff" />
      </Environment>}

      {/* Floor */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HALF_X, 0.5, HALF_Z]} position={[0, -0.5, 0]} />
        {/* walls */}
        <CuboidCollider args={[0.5, 5, HALF_Z]} position={[-HALF_X - 0.5, 5, 0]} />
        <CuboidCollider args={[0.5, 5, HALF_Z]} position={[HALF_X + 0.5, 5, 0]} />
        <CuboidCollider args={[HALF_X, 5, 0.5]} position={[0, 5, -HALF_Z - 0.5]} />
        <CuboidCollider args={[HALF_X, 5, 0.5]} position={[0, 5, HALF_Z + 0.5]} />
        {/* bimah */}
        <CuboidCollider args={[BIMAH.half, 0.6, BIMAH.half]} position={[0, 0.6, 0]} />
        {/* aron */}
        <CuboidCollider args={[3, 3, 0.8]} position={[0, 3, -HALF_Z + 0.8]} />
        {BENCHES.map(([x, z], i) => <CuboidCollider key={i} args={[2.75, 0.45, 0.35]} position={[x, 0.45, z]} />)}
      </RigidBody>

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[HALF_X * 2, HALF_Z * 2]} />
        {new URLSearchParams(location.search).has('noreflect') ? <meshStandardMaterial color="#3b2a1d" /> : (
        <MeshReflectorMaterial
          blur={[300, 80]} resolution={512} mixBlur={1} mixStrength={18} roughness={0.85}
          depthScale={1.1} minDepthThreshold={0.4} maxDepthThreshold={1.3} color="#3b2a1d" metalness={0.4}
        />)}
      </mesh>
      {/* aisle runner */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 12]} receiveShadow>
        <planeGeometry args={[3, 22]} />
        <meshStandardMaterial color="#5a1620" roughness={0.95} />
      </mesh>

      {/* Walls */}
      {[
        [[-HALF_X, 4.5, 0], [0.3, 9, HALF_Z * 2]],
        [[HALF_X, 4.5, 0], [0.3, 9, HALF_Z * 2]],
        [[0, 4.5, -HALF_Z], [HALF_X * 2, 9, 0.3]],
        [[0, 0.35, HALF_Z], [HALF_X * 2, 0.7, 0.3]],
      ].map(([p, s], i) => (
        <mesh key={i} position={p} receiveShadow><boxGeometry args={s} /><meshStandardMaterial color="#e9dcc4" roughness={0.9} /></mesh>
      ))}
      {/* Tall windows, glowing (bloom picks them up) */}
      {windows.map(([x, z, ry], i) => (
        <group key={i} position={[x, 4.8, z]} rotation-y={ry}>
          <mesh><planeGeometry args={[2.2, 5]} /><meshStandardMaterial color="#cfe4ff" emissive="#9cc7ff" emissiveIntensity={1.6} toneMapped={false} /></mesh>
          <mesh position={[0, 2.5, 0.01]}><circleGeometry args={[1.1, 24, 0, Math.PI]} /><meshStandardMaterial color="#ffe6a8" emissive="#ffcf6b" emissiveIntensity={1.8} toneMapped={false} /></mesh>
        </group>
      ))}

      {/* Benches, instanced */}
      <Instances limit={BENCHES.length * 2} castShadow receiveShadow>
        <boxGeometry args={[5.5, 0.12, 0.6]} />
        <meshStandardMaterial color="#6b4527" roughness={0.6} />
        {BENCHES.map(([x, z], i) => <Instance key={`s${i}`} position={[x, 0.5, z]} />)}
        {BENCHES.map(([x, z], i) => <Instance key={`b${i}`} position={[x, 0.95, z + 0.32]} scale={[1, 7, 0.25]} />)}
      </Instances>

      {/* Bimah */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow><boxGeometry args={[BIMAH.half * 2, 1.2, BIMAH.half * 2]} /><meshStandardMaterial color="#7a5230" roughness={0.5} /></mesh>
        <mesh position={[0, 1.8, -0.4]} rotation-x={-0.35} castShadow><boxGeometry args={[2.4, 0.08, 1.4]} /><meshStandardMaterial color="#5a1620" /></mesh>
        <mesh position={[0, 1.4, -0.4]}><boxGeometry args={[0.3, 0.5, 0.3]} /><meshStandardMaterial color="#7a5230" /></mesh>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * BIMAH.half, 1.6, 0]}><boxGeometry args={[0.1, 0.8, BIMAH.half * 2]} /><meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.25} /></mesh>
        ))}
      </group>

      {/* Aron Kodesh */}
      <group position={[0, 0, -HALF_Z + 0.6]}>
        <mesh position={[0, 3, 0]} castShadow><boxGeometry args={[6, 6, 1.2]} /><meshStandardMaterial color="#5b3a1e" roughness={0.45} /></mesh>
        <mesh position={[0, 2.8, 0.62]}><planeGeometry args={[4, 4.6]} /><meshStandardMaterial color="#6d0f1c" roughness={0.8} /></mesh>
        <mesh position={[0, 3.6, 0.63]}><ringGeometry args={[0.55, 0.7, 6]} /><meshStandardMaterial color="#e0b54a" emissive="#e0b54a" emissiveIntensity={0.6} metalness={1} roughness={0.2} /></mesh>
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} position={[x, 6.6, 0]}><capsuleGeometry args={[0.38, 0.7, 6, 12]} /><meshStandardMaterial color="#f1ead8" emissive="#fff6dc" emissiveIntensity={0.25} /></mesh>
        ))}
        <Text font={FONT} position={[0, 0.8, 0.64]} fontSize={0.32} color="#e0b54a" anchorX="center" direction="rtl">
          דַּע לִפְנֵי מִי אַתָּה עוֹמֵד
        </Text>
        {/* ner tamid */}
        <mesh position={[0, 7.6, 0.9]}><sphereGeometry args={[0.18, 16, 16]} /><meshStandardMaterial color="#ff8a3d" emissive="#ff6a00" emissiveIntensity={4} toneMapped={false} /></mesh>
      </group>

      {/* The Rambam, glowing on the front wall over the Aron */}
      <Float speed={1.2} rotationIntensity={0} floatIntensity={0.25}>
        <Text font={FONT} position={[0, 8.3, -HALF_Z + 0.25]} fontSize={0.5} maxWidth={30} textAlign="center" color="#ffe6a8" anchorX="center" direction="rtl" outlineWidth={0.01} outlineColor="#3a2a10">
          כָּל זְמַן שֶׁהַתְּפִלִּין בְּרֹאשׁוֹ ... מְפַנֶּה לִבּוֹ בְּדִבְרֵי הָאֱמֶת וְהַצֶּדֶק
        </Text>
      </Float>
      <Sparkles count={120} scale={[34, 8, 44]} position={[0, 5, 0]} size={2.4} speed={0.25} color="#ffe6a8" opacity={0.5} />

      {/* Chandeliers */}
      {[[-8, -10], [8, -10], [-8, 10], [8, 10]].map(([x, z], i) => (
        <group key={i} position={[x, 7.4, z]}>
          <mesh><torusGeometry args={[0.9, 0.05, 8, 32]} /><meshStandardMaterial color="#c9a24a" metalness={1} roughness={0.3} /></mesh>
          {Array.from({ length: 8 }).map((_, k) => (
            <mesh key={k} position={[Math.cos((k / 8) * Math.PI * 2) * 0.9, 0.15, Math.sin((k / 8) * Math.PI * 2) * 0.9]}>
              <sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color="#fff2c8" emissive="#ffd88a" emissiveIntensity={5} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
