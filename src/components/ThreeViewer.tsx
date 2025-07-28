import { Canvas } from '@react-three/fiber';
import { OrbitControls, AsciiRenderer, Environment, useGLTF } from '@react-three/drei';
import { Suspense } from 'react';

// GLB Model component
const MODEL_URL = 'https://huggingface.co/matthewjmiller07/my-3d-models/resolve/main/ravasher.glb';

useGLTF.preload(MODEL_URL);

const Model = () => {
  const { scene } = useGLTF(MODEL_URL, true);
  return <primitive object={scene} position={[0, -1, 0]} scale={1.6} />;
};

const ThreeViewer = () => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'black' }}
      >
        <color attach="background" args={['#000']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Suspense fallback={null}>
          <Model />
        </Suspense>
        <Environment preset="city" />
        <AsciiRenderer 
          fgColor="#3b82f6"
          bgColor="transparent"
          characters=" .:-=+*#%@"
          resolution={0.22}
        />
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
        />
      </Canvas>
      <div className="absolute bottom-4 right-4 text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
        Drag to rotate, scroll to zoom
      </div>
    </div>
  );
};

export default ThreeViewer;
