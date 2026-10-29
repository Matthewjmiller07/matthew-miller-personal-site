// three.quarks particle effects: pooled bursts plus looping ambient emitters.
import * as THREE from 'three';
import {
  BatchedRenderer, ParticleSystem, RenderMode, ConstantValue, IntervalValue, ConstantColor,
  SphereEmitter, ConeEmitter, ColorOverLife, SizeOverLife, Gradient, PiecewiseBezier, Bezier,
  ForceOverLife, Vector3 as QV3, Vector4 as QV4,
} from 'three.quarks';

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.7)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const PRESETS = {
  // Golden "Hineni" burst for getting it right.
  hineni: { count: 70, life: [0.5, 1.1], speed: [3, 9], size: [0.12, 0.35], from: [1, 0.9, 0.45], to: [1, 0.55, 0.1], up: 4 },
  // Red smoke and sparks for a hefsek.
  hefsek: { count: 90, life: [0.6, 1.4], speed: [2, 6], size: [0.3, 0.9], from: [1, 0.25, 0.15], to: [0.25, 0.05, 0.05], up: 2 },
  // Blue shockwave ring for the Do Not Disturb pulse.
  pulse: { count: 120, life: [0.35, 0.6], speed: [10, 16], size: [0.15, 0.3], from: [0.5, 0.85, 1], to: [0.2, 0.3, 1], flat: true },
  // A little puff when you catch a bracha.
  collect: { count: 30, life: [0.3, 0.7], speed: [1.5, 4], size: [0.08, 0.2], from: [0.9, 1, 1], to: [0.4, 0.8, 1], up: 3 },
  // Music notes when you hum.
  hum: { count: 4, life: [0.8, 1.2], speed: [1, 2], size: [0.15, 0.25], from: [0.8, 1, 0.6], to: [0.3, 1, 0.8], up: 3 },
  // Victory fireworks.
  firework: { count: 160, life: [0.9, 1.8], speed: [6, 13], size: [0.12, 0.3], from: [1, 1, 1], to: [1, 0.4, 0.8], up: -6 },
};

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.batch = new BatchedRenderer();
    scene.add(this.batch);
    this.material = new THREE.MeshBasicMaterial({
      map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.pools = {};
    this.loops = [];
    for (const [name, p] of Object.entries(PRESETS)) {
      this.pools[name] = { i: 0, systems: Array.from({ length: name === 'collect' || name === 'hum' ? 6 : 3 }, () => this.makeBurst(p)) };
    }
  }

  makeBurst(p) {
    const behaviors = [
      new ColorOverLife(new Gradient(
        [[new QV3(...p.from), 0], [new QV3(...p.to), 1]],
        [[1, 0], [0, 1]],
      )),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.9, 0.5, 0), 0]])),
    ];
    if (p.up) behaviors.push(new ForceOverLife(new ConstantValue(0), new ConstantValue(p.up), new ConstantValue(0)));
    const sys = new ParticleSystem({
      duration: 3,
      looping: false,
      autoDestroy: false,
      worldSpace: true,
      shape: p.flat ? new ConeEmitter({ radius: 0.3, angle: Math.PI / 2 - 0.05, thickness: 1 }) : new SphereEmitter({ radius: 0.35, thickness: 0.15 }),
      startLife: new IntervalValue(...p.life),
      startSpeed: new IntervalValue(...p.speed),
      startSize: new IntervalValue(...p.size),
      startColor: new ConstantColor(new QV4(1, 1, 1, 1)),
      emissionOverTime: new ConstantValue(0),
      emissionBursts: [{ time: 0, count: new ConstantValue(p.count), cycle: 1, interval: 0.01, probability: 1 }],
      behaviors,
      material: this.material,
      renderMode: RenderMode.BillBoard,
    });
    if (p.flat) sys.emitter.rotation.x = -Math.PI / 2;
    sys.pause();
    this.scene.add(sys.emitter);
    this.batch.addSystem(sys);
    return sys;
  }

  burst(name, pos) {
    const pool = this.pools[name];
    if (!pool) return;
    const sys = pool.systems[pool.i++ % pool.systems.length];
    sys.emitter.position.set(pos.x, pos.y, pos.z);
    sys.emitter.updateMatrixWorld(true);
    sys.restart();
    sys.play();
  }

  // Looping ambient emitters: portal sparks, the ner tamid flame.
  loop(pos, { color = [1, 0.8, 0.4], rate = 18, size = [0.08, 0.2], speed = [0.6, 1.6], life = [1, 2], radius = 0.8 } = {}) {
    const sys = new ParticleSystem({
      duration: 2,
      looping: true,
      worldSpace: true,
      shape: new ConeEmitter({ radius, angle: 0.25, thickness: 1 }),
      startLife: new IntervalValue(...life),
      startSpeed: new IntervalValue(...speed),
      startSize: new IntervalValue(...size),
      startColor: new ConstantColor(new QV4(...color, 1)),
      emissionOverTime: new ConstantValue(rate),
      behaviors: [
        new ColorOverLife(new Gradient([[new QV3(...color), 0], [new QV3(...color), 1]], [[0, 0], [1, 0.2], [0, 1]])),
      ],
      material: this.material,
      renderMode: RenderMode.BillBoard,
    });
    sys.emitter.rotation.x = -Math.PI / 2;
    sys.emitter.position.set(...pos);
    this.scene.add(sys.emitter);
    this.batch.addSystem(sys);
    this.loops.push(sys);
    return sys;
  }

  dropLoops() {
    for (const s of this.loops) {
      this.batch.deleteSystem(s);
      this.scene.remove(s.emitter);
    }
    this.loops = [];
  }

  update(dt) {
    this.batch.update(dt);
  }
}

// One shared instance, created by <Effects/> once the scene exists.
export const fxRef = { current: null };
export const burst = (name, pos) => fxRef.current?.burst(name, pos);
