import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

interface DioramaHeroProps {
  modelUrl?: string;
  fallbackImage?: string;
  className?: string;
}

const BG = 0x0a0908;

/** Procedural patina roughness map: mottled bronze, shinier where polished. */
function makePatinaTexture(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#6e6e6e';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 900; i++) {
    const r = 2 + Math.random() * 14;
    const x = Math.random() * s;
    const y = Math.random() * s;
    const v = Math.random();
    // darker = smoother (polished), lighter = rougher (tarnish)
    const shade = v < 0.35 ? 70 + Math.random() * 30 : 120 + Math.random() * 70;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${shade},${shade},${shade},0.5)`);
    g.addColorStop(1, `rgba(${shade},${shade},${shade},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/** Radial fade texture: transparent center, opaque edges — softens the mirror floor. */
function makeFadeTexture(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.5);
  g.addColorStop(0, 'rgba(10,9,8,0)');
  g.addColorStop(0.45, 'rgba(10,9,8,0.35)');
  g.addColorStop(1, 'rgba(10,9,8,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

const DioramaHero = ({
  modelUrl = '/models/scribe-quill.glb',
  fallbackImage = '/diorama/plate.png',
  className = '',
}: DioramaHeroProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setFailed(true);
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    renderer.setPixelRatio(dpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(BG, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.FogExp2(BG, 0.03);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    // Soft studio reflections for the bronze
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // ---------- Stage ----------
    const stage = new THREE.Group();
    scene.add(stage);

    const patina = makePatinaTexture();
    const bronze = new THREE.MeshStandardMaterial({
      color: 0x9c7434,
      metalness: 1.0,
      roughness: 0.42,
      roughnessMap: patina,
      envMapIntensity: 1.15,
    });

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    // Draco decoder vendored locally (public/draco) — no third-party runtime dependency.
    draco.setDecoderPath('/draco/');
    loader.setDRACOLoader(draco);
    let model: THREE.Object3D | null = null;
    loader.load(
      modelUrl,
      (gltf) => {
        model = gltf.scene;
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.material = bronze;
            mesh.castShadow = true;
            mesh.receiveShadow = false;
          }
        });
        // Normalize: fit to ~2.6 units on desktop, smaller on narrow screens
        // so the monument sits below the headline instead of behind it.
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = window.innerWidth >= 1024 ? 2.6 : 2.2;
        const s = targetSize / maxDim;
        model.scale.setScalar(s);
        model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
        stage.add(model);
      },
      undefined,
      () => setFailed(true),
    );

    // ---------- Floor: mirror + soft fade ----------
    const reflector = new Reflector(new THREE.CircleGeometry(26, 64), {
      clipBias: 0.003,
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0x8a8a8a,
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = 0;
    scene.add(reflector);

    const fade = new THREE.Mesh(
      new THREE.PlaneGeometry(52, 52),
      new THREE.MeshBasicMaterial({
        map: makeFadeTexture(),
        transparent: true,
        depthWrite: false,
      }),
    );
    fade.rotation.x = -Math.PI / 2;
    fade.position.y = 0.002;
    scene.add(fade);

    // ---------- Lights ----------
    const key = new THREE.SpotLight(0xffe9c8, 90, 40, 0.5, 0.6, 1.7);
    key.position.set(5.5, 8.5, 4.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 30;
    scene.add(key);
    key.target.position.set(0, 1, 0);
    scene.add(key.target);

    const rim = new THREE.DirectionalLight(0x9db8ff, 1.6);
    rim.position.set(-6, 4.5, -6);
    scene.add(rim);

    const gold = new THREE.PointLight(0xff9d3c, 14, 14, 1.8);
    gold.position.set(-2.8, 1.1, 3.2);
    scene.add(gold);

    scene.add(new THREE.HemisphereLight(0x35313e, 0x0b0806, 0.55));

    // ---------- Atmosphere: soft glow behind the model + warm pool of light
    // on the floor (cheap fakes that read as volumetric light) ----------
    const glowTex = (() => {
      const s = 256;
      const c = document.createElement('canvas');
      c.width = s;
      c.height = s;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,214,150,0.85)');
      g.addColorStop(0.4, 'rgba(255,190,120,0.28)');
      g.addColorStop(1, 'rgba(255,180,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      return new THREE.CanvasTexture(c);
    })();
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    glow.position.set(0.6, 2.6, -3.2);
    scene.add(glow);

    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 6),
      new THREE.MeshBasicMaterial({
        map: glowTex,
        color: 0xffc98a,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0.2, 0.004, 0.3);
    scene.add(pool);

    // ---------- Dust motes ----------
    const DUST = 240;
    const dustPos = new Float32Array(DUST * 3);
    const dustSpeed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 13;
      dustPos[i * 3 + 1] = Math.random() * 5.5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 13;
      dustSpeed[i] = 0.06 + Math.random() * 0.16;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xffdfae,
        size: 0.035,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    scene.add(dust);

    // ---------- Post ----------
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.65, 0.85);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ---------- Choreography state ----------
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMouse = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    // ---------- Drag to spin the monument ----------
    // Horizontal drags rotate the model; vertical touch drags still scroll the
    // page (the wrapper uses touch-action: pan-y so the browser owns those).
    const drag = {
      yaw: 0, pitch: 0,
      vyaw: 0, vpitch: 0,
      dragging: false, lastX: 0, lastY: 0,
      reset: false,
    };
    const PITCH_MIN = -0.22;
    const PITCH_MAX = 0.3;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag.dragging = true;
      drag.reset = false;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.vyaw = 0;
      drag.vpitch = 0;
      wrap.style.cursor = 'grabbing';
      try { wrap.setPointerCapture(e.pointerId); } catch { /* noop */ }
    };
    const onMove = (e: PointerEvent) => {
      if (!drag.dragging) return;
      setInteracted(true);
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.yaw += dx * 0.006;
      drag.pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.0035, PITCH_MIN, PITCH_MAX);
      drag.vyaw = dx * 0.006;
      drag.vpitch = dy * 0.0035;
      if (reducedMotion && model) {
        // No animation loop in reduced-motion mode: re-render on demand.
        model.rotation.y = drag.yaw;
        model.rotation.x = drag.pitch;
        composer.render();
      }
    };
    const onUp = () => {
      if (!drag.dragging) return;
      drag.dragging = false;
      wrap.style.cursor = 'grab';
    };
    // Double-click eases the monument back to its composed resting pose.
    const onDbl = () => { drag.reset = true; };
    let wide = window.innerWidth >= 1024;
    const resize = () => {
      const w = wrap.clientWidth || 1;
      const hgt = wrap.clientHeight || 1;
      wide = window.innerWidth >= 1024;
      camera.aspect = w / hgt;
      camera.updateProjectionMatrix();
      renderer.setSize(w, hgt, false);
      composer.setSize(w, hgt);
      bloom.setSize(w, hgt);
    };

    window.addEventListener('pointermove', onMouse, { passive: true });
    window.addEventListener('resize', resize);
    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('pointercancel', onUp);
    wrap.addEventListener('dblclick', onDbl);
    resize();

    // ---------- Loop ----------
    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;
    let firstFrame = true;
    const lookTarget = new THREE.Vector3();

    const io = new IntersectionObserver(
      (entries) => {
        running = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.02 },
    );
    io.observe(wrap);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!running || document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // Dust drift
      const p = dustGeo.attributes.position as THREE.BufferAttribute;
      const arr = p.array as Float32Array;
      for (let i = 0; i < DUST; i++) {
        arr[i * 3 + 1] += dustSpeed[i] * dt;
        arr[i * 3] += Math.sin(t * 0.4 + i) * 0.0006;
        if (arr[i * 3 + 1] > 5.5) arr[i * 3 + 1] = 0;
      }
      p.needsUpdate = true;

      const sway = reducedMotion ? 0 : Math.sin(t * 0.09) * 0.3;
      const angle = sway + mouse.x * 0.22;
      // On narrow screens the monument drops to the lower half, clear of the
      // centered headline; no scroll dolly there.
      const radius = (wide ? 9.4 : 10.5) + mouse.y * -0.35;
      const height = (wide ? 3.1 : 2.8) + mouse.y * -0.25;
      // Negative xOff swings the camera left of the model, placing the
      // monument right-of-center on wide screens without clipping it.
      const xOff = wide ? -1.0 : 0;
      camera.position.set(Math.sin(angle) * radius + xOff, height, Math.cos(angle) * radius);
      lookTarget.set(xOff, wide ? 1.3 : 2.2, 0);
      camera.lookAt(lookTarget);

      // Model: idle sway plus user drag (with inertia); double-click eases
      // the monument back to its composed resting pose.
      if (model) {
        if (!drag.dragging) {
          drag.yaw += drag.vyaw;
          drag.pitch = THREE.MathUtils.clamp(drag.pitch + drag.vpitch, PITCH_MIN, PITCH_MAX);
          drag.vyaw *= 0.94;
          drag.vpitch *= 0.94;
          if (drag.reset) {
            drag.yaw += (0 - drag.yaw) * 0.12;
            drag.pitch += (0 - drag.pitch) * 0.12;
            if (Math.abs(drag.yaw) < 0.002 && Math.abs(drag.pitch) < 0.002) {
              drag.yaw = 0;
              drag.pitch = 0;
              drag.reset = false;
            }
          }
        }
        model.rotation.y = (reducedMotion ? 0 : Math.sin(t * 0.12) * 0.12) + drag.yaw;
        model.rotation.x = drag.pitch;
      }

      composer.render();
      if (firstFrame) {
        firstFrame = false;
        setReady(true);
      }
    };

    if (reducedMotion) {
      // Single composed frame, no loop
      const once = () => {
        const angle = 0.35;
        const xOff = wide ? -1.0 : 0;
        const r = wide ? 9.0 : 10.5;
        camera.position.set(Math.sin(angle) * r + xOff, wide ? 3.0 : 2.8, Math.cos(angle) * r);
        camera.lookAt(xOff, wide ? 1.3 : 2.0, 0);
        // wait a beat for the model, then render once
        setTimeout(() => {
          composer.render();
          setReady(true);
        }, 2500);
      };
      once();
    } else {
      frame();
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointermove', onMouse);
      window.removeEventListener('resize', resize);
      wrap.removeEventListener('pointerdown', onDown);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
      wrap.removeEventListener('pointercancel', onUp);
      wrap.removeEventListener('dblclick', onDbl);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const m = mesh.material as THREE.Material | THREE.Material[];
          (Array.isArray(m) ? m : [m]).forEach((mm) => mm.dispose());
        }
      });
      patina.dispose();
      pmrem.dispose();
      draco.dispose();
      composer.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 cursor-grab overflow-hidden select-none ${className}`}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      {!failed ? (
        <canvas ref={canvasRef} className="block h-full w-full" />
      ) : (
        <img
          src={fallbackImage}
          alt=""
          className="h-full w-full object-cover"
          style={{ filter: 'brightness(0.85)' }}
        />
      )}
      {/* cinematic vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 75% at 50% 42%, rgba(0,0,0,0) 40%, rgba(4,3,2,0.55) 100%)',
        }}
      />
      {/* legibility scrims: left for headline, bottom for fold */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(100deg, rgba(5,4,3,0.72) 0%, rgba(5,4,3,0.38) 34%, rgba(5,4,3,0) 62%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56"
        style={{ background: 'linear-gradient(to top, rgba(5,4,3,0.85), rgba(5,4,3,0))' }}
      />
      {/* loader */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-1000"
        style={{
          background: '#0a0908',
          opacity: ready || failed ? 0 : 1,
          pointerEvents: ready || failed ? 'none' : 'auto',
        }}
      >
        <p className="font-serif text-lg tracking-[0.35em] text-[#c9a86a] uppercase animate-pulse">
          Preparing the diorama
        </p>
      </div>
      {/* drag hint — fades away the first time the monument is touched */}
      {ready && !failed && !interacted && (
        <div className="pointer-events-none absolute right-6 bottom-6">
          <p className="text-[11px] tracking-[0.3em] text-[#c9a86a]/60 uppercase">
            Drag to explore
          </p>
        </div>
      )}
    </div>
  );
};

export default DioramaHero;
