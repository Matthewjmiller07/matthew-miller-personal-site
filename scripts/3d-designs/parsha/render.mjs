// Render each parsha toy's GLB to a square card image (public/3d/parsha/<slug>/<slug>.webp) with three.js
// in headless Chromium, so no Blender is needed.
//
//   node scripts/3d-designs/parsha/render.mjs [size] [slug ...]
//
// Needs playwright and three (THREE_DIR=/path/to/node_modules/three if it isn't in this repo's node_modules).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const OUT = join(ROOT, 'public/3d/parsha');
const THREE = process.env.THREE_DIR || join(ROOT, 'node_modules/three');
if (!existsSync(join(THREE, 'build/three.module.js'))) throw new Error(`three not found at ${THREE}; set THREE_DIR`);

const args = process.argv.slice(2);
const size = /^\d+$/.test(args[0] || '') ? Number(args.shift()) : 720;
const kits = JSON.parse(readFileSync(join(OUT, 'kits.json'), 'utf8')).kits;
const slugs = args.length ? args : kits.map((k) => k.slug);

const page_html = `<!doctype html><html><body style="margin:0;background:#111318">
<script type="importmap">{"imports":{"three":"http://r/three/build/three.module.js","three/addons/":"http://r/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const S = ${size};
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(S, S);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
window.shoot = async (url) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111318);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-40, 90, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 });
  scene.add(sun);
  const gltf = await new GLTFLoader().loadAsync(url);
  gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(gltf.scene);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const c = box.getCenter(new THREE.Vector3());
  const r = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 22);
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 2000);
  cam.position.copy(c).add(new THREE.Vector3(-0.42, 0.62, 1).normalize().multiplyScalar(r * 2.75));
  cam.lookAt(c);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/webp', 0.86);
};
window.ready = true;
</script></body></html>`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: size, height: size } });
await page.route('http://r/**', (route) => {
  const p = new URL(route.request().url()).pathname;
  if (p === '/') return route.fulfill({ body: page_html, contentType: 'text/html' });
  const file = p.startsWith('/three/') ? join(THREE, p.slice(7)) : join(OUT, p.slice(1));
  return route.fulfill({ body: readFileSync(file), contentType: p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
});
page.on('pageerror', (e) => console.error(e));
await page.goto('http://r/');
await page.waitForFunction(() => window.ready);
for (const slug of slugs) {
  const kit = kits.find((k) => k.slug === slug);
  const data = await page.evaluate((u) => window.shoot(u), `http://r/${slug}/${kit.files.glb}`);
  writeFileSync(join(OUT, slug, `${slug}.webp`), Buffer.from(data.split(',')[1], 'base64'));
  console.log('rendered', slug);
}
await browser.close();
