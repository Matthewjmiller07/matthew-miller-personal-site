import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.25} penumbra={1} />
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
      <OrbitControls enableZoom enableRotate />
      <Environment preset="city" />
    </>
  );
}

export default function Simple3DViewer() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 6] }}>
        <Scene />
      </Canvas>
    </div>
  );
}
