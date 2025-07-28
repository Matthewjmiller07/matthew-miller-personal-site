import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const WebGLTest = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('WebGLTest: Starting initialization');
    
    if (!mountRef.current) {
      console.log('WebGLTest: mountRef is not ready');
      return;
    }

    try {
      console.log('WebGLTest: Creating Three.js scene');
      
      // Check WebGL support
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        throw new Error('WebGL is not supported in this browser');
      }
      
      console.log('WebGLTest: WebGL context created successfully');

      // Create a simple Three.js scene
      const scene = new THREE.Scene();
      const width = mountRef.current.clientWidth || 300;
      const height = mountRef.current.clientHeight || 300;
      const aspectRatio = width / height;
      
      console.log('WebGLTest: Setting up camera with dimensions', { width, height, aspectRatio });
      
      const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
      camera.position.z = 5;
      
      console.log('WebGLTest: Creating WebGL renderer');
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: 'high-performance'
      });
      
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0); // Transparent background
      
      // Add a simple cube
      console.log('WebGLTest: Creating cube');
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        wireframe: false 
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      
      // Add axes helper
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
      
      // Add grid helper
      const gridHelper = new THREE.GridHelper(10, 10);
      scene.add(gridHelper);
      
      // Append renderer to DOM
      console.log('WebGLTest: Appending renderer to DOM');
      
      mountRef.current.appendChild(renderer.domElement);
      
      // Handle window resize
      const handleResize = () => {
        if (!mountRef.current) return;
        const newWidth = mountRef.current.clientWidth;
        const newHeight = mountRef.current.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Animation loop
      console.log('WebGLTest: Starting animation loop');
      let animationFrameId: number;
      
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
      };
      
      // Start animation
      animate();
      setIsInitialized(true);
      console.log('WebGLTest: Initialization complete');
      
      // Cleanup
      return () => {
        console.log('WebGLTest: Cleaning up');
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        
        
        
        renderer.dispose();
        geometry.dispose();
        material.dispose();
      };
      
    } catch (err) {
      console.error('WebGLTest: Error initializing WebGL:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '400px',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '0.5rem',
        border: '1px solid #333'
      }}
    >
      {error ? (
        <div style={{ 
          padding: '1rem',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid rgba(255, 0, 0, 0.5)',
          borderRadius: '0.25rem',
          maxWidth: '80%',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>WebGL Error</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.9em', wordBreak: 'break-word' }}>{error}</div>
        </div>
      ) : !isInitialized ? (
        <p>Initializing WebGL...</p>
      ) : null}
      

    </div>
  );
};

export default WebGLTest;
