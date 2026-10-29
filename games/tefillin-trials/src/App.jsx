import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls, PerformanceMonitor, Preload } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration, Glitch, ToneMapping, SMAA, DepthOfField, HueSaturation, BrightnessContrast } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode, ToneMappingMode, ShaderPass } from 'postprocessing';
import * as THREE from 'three';
import { Shul } from './world/Shul.jsx';
import { Hub } from './levels/Hub.jsx';
import { Gauntlet } from './levels/Gauntlet.jsx';
import { BrachaCatch } from './levels/BrachaCatch.jsx';
import { ShabbosTable } from './levels/ShabbosTable.jsx';
import { UI } from './UI.jsx';
import { useGame } from './store.js';
import { FX, fxRef } from './fx.js';
import { player } from './world/Player.jsx';

// Mipmap bloom smears a single NaN/Inf pixel across the whole frame. Clamp every built-in
// material's final colour (the dithering chunk closes nearly all of them, drei's reflector and
// troika text included) so one bad pixel can't black out the screen.
THREE.ShaderChunk.dithering_fragment += `
  if (!(gl_FragColor.r == gl_FragColor.r && gl_FragColor.g == gl_FragColor.g && gl_FragColor.b == gl_FragColor.b)) gl_FragColor.rgb = vec3(0.0);
  if (!(gl_FragColor.a == gl_FragColor.a)) gl_FragColor.a = 1.0;
  gl_FragColor.rgb = clamp(gl_FragColor.rgb, 0.0, 64.0);
`;

// Runs first in the composer: scrubs NaN/Inf pixels (from custom shaders such as the reflector's
// blur) out of the scene render before Bloom can spread them.
function makeSanitizePass() {
  const material = new THREE.ShaderMaterial({
    uniforms: { inputBuffer: { value: null } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: `uniform sampler2D inputBuffer; varying vec2 vUv;
      void main() {
        vec4 c = texture2D(inputBuffer, vUv);
        if (any(isnan(c)) || any(isinf(c)) || !(c.r == c.r && c.g == c.g && c.b == c.b && c.a == c.a)) c = vec4(0.0, 0.0, 0.0, 1.0);
        gl_FragColor = vec4(clamp(c.rgb, 0.0, 64.0), c.a);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  return new ShaderPass(material, 'inputBuffer');
}

export const DEBUG = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

const KEYS = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'back', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
];

function Particles() {
  const scene = useThree((s) => s.scene);
  // Created during render so levels can add emitters in their first effects.
  useState(() => {
    if (!fxRef.current) fxRef.current = new FX(scene);
    return null;
  });
  useEffect(() => {
    const fx = fxRef.current;
    const flame = fx.loop([0, 7.5, -22.4], { color: [1, 0.55, 0.15], rate: 30, radius: 0.08, size: [0.12, 0.3], speed: [0.2, 0.6], life: [0.4, 0.8] });
    return () => { fx.batch.deleteSystem(flame); flame.emitter.parent?.remove(flame.emitter); };
  }, []);
  useFrame((_, dt) => fxRef.current?.update(Math.min(dt, 0.05)));
  return null;
}

// Slow orbit over the shul behind the title and results screens.
function Cinematic() {
  const screen = useGame((s) => s.screen);
  useFrame(({ camera, clock }) => {
    if (screen !== 'title' && screen !== 'results') { player.cinematic = false; return; }
    player.cinematic = true;
    const t = clock.elapsedTime * 0.08;
    camera.position.lerp(new THREE.Vector3(Math.sin(t) * 22, 13, Math.cos(t) * 26), 0.03);
    camera.lookAt(0, 2, -4);
  });
  return null;
}

function Post({ low }) {
  const glitchAt = useGame((s) => s.glitch);
  const screen = useGame((s) => s.screen);
  const cinematic = screen === 'title' || screen === 'results';
  const [glitching, setGlitching] = useState(false);
  const offset = useMemo(() => new THREE.Vector2(0.0006, 0.0006), []);
  const sanitize = useMemo(makeSanitizePass, []);
  useEffect(() => {
    if (glitchAt <= performance.now()) return;
    setGlitching(true);
    const id = setTimeout(() => setGlitching(false), glitchAt - performance.now());
    return () => clearTimeout(id);
  }, [glitchAt]);
  useFrame(() => {
    const k = Math.max(0, (useGame.getState().glitch - performance.now()) / 650);
    offset.set(0.0006 + k * 0.012, 0.0006 + k * 0.008);
  });
  return (
    <EffectComposer multisampling={0}>
      <primitive object={sanitize} />
      {!DEBUG.has('nobloom') ? <Bloom mipmapBlur intensity={low ? 0.7 : 1.35} luminanceThreshold={0.85} luminanceSmoothing={0.25} radius={0.85} /> : <></>}
      {!DEBUG.has('noca') ? <ChromaticAberration offset={offset} blendFunction={BlendFunction.NORMAL} /> : <></>}
      {!DEBUG.has('noglitch') ? <Glitch active={glitching} delay={[0, 0]} duration={[0.2, 0.5]} strength={[0.2, 0.5]} mode={GlitchMode.SPORADIC} ratio={0.8} /> : <></>}
      {cinematic && !low ? <DepthOfField focusDistance={0.02} focalLength={0.04} bokehScale={3.2} height={480} /> : <></>}
      <Vignette offset={0.2} darkness={0.8} />
      {!DEBUG.has('nonoise') ? <Noise opacity={0.025} blendFunction={BlendFunction.OVERLAY} /> : <></>}
      {!DEBUG.has('notone') ? <ToneMapping mode={ToneMappingMode.AGX} /> : <></>}
      <HueSaturation saturation={0.18} />
      <BrightnessContrast contrast={0.1} brightness={0.02} />
      {!low ? <SMAA /> : <></>}
    </EffectComposer>
  );
}

function Level() {
  const screen = useGame((s) => s.screen);
  if (screen === 'gauntlet') return <Gauntlet />;
  if (screen === 'catch') return <BrachaCatch />;
  if (screen === 'table') return <ShabbosTable />;
  return <Hub />;
}

export default function App() {
  const levelKey = useGame((s) => s.levelKey);
  const [low, setLow] = useState(false);
  return (
    <KeyboardControls map={KEYS}>
      <Canvas
        shadows
        dpr={low ? 1 : [1, 2]}
        camera={{ position: [0, 14, 30], fov: 50, near: 0.1, far: 200 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NoToneMapping; }}
      >
        <PerformanceMonitor flipflops={1} onDecline={() => setLow(true)} />
        <Suspense fallback={null}>
          <Physics key={levelKey} gravity={[0, -20, 0]} timeStep="vary">
            <Shul />
            <Level />
          </Physics>
          {!DEBUG.has('nofx') && <Particles />}
          <Cinematic />
          {!DEBUG.has('nopost') && <Post low={low} />}
          <Preload all />
        </Suspense>
      </Canvas>
      <UI />
    </KeyboardControls>
  );
}
