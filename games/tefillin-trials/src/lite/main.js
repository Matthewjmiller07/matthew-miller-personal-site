// Hineni Lite: boot. Builds the engine, the UI and the VR button, then swaps levels on demand.
import * as THREE from 'three';
import '../styles.css';
import './lite.css';
import { initEngine, startLoop, onFrame, scene, camera, player, updatePlayer, setWorld, clearLabels, view, vrState } from './engine.js';
import { G, game, onGo } from './state.js';
import { initUI } from './ui.js';
import { showWorld, worldFor } from './worlds.js';
import { bag } from './common.js';
import { hub, gauntlet, bracha, table } from './levels-shul.js';
import { stand, ward, check } from './levels-more.js';
import { initVR } from './vr.js';
import { sfx, setMuteSource } from '../audio.js';

const LEVELS = { hub, gauntlet, catch: bracha, table, stand, ward, check };

const root = document.getElementById('tefillin-trials-root');
root.innerHTML = '';
initEngine(root);
initUI(root);
setMuteSource(() => G.muted);
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => sfx.unlock(), { once: true, capture: true });

let current = null; // { group, d, level }
function load(screen) {
  if (current) {
    current.d.dispose();
    scene.remove(current.group);
    current = null;
  }
  clearLabels();
  game.setPrompt(null);
  const make = LEVELS[screen];
  const w = showWorld(worldFor(screen === 'results' || screen === 'title' ? (G.results?.level || 'hub') : screen));
  if (!make) {
    // title / results: the slow orbit over the world, nobody in it
    setWorld(w);
    player.mesh = null;
    player.cinematic = true;
    window.__lite = { G, game, player, level: null };
    return;
  }
  player.cinematic = false;
  const group = new THREE.Group();
  scene.add(group);
  const d = bag();
  const level = make({ root: group, d });
  setWorld({ ...w, boxes: [...w.boxes, ...(level.boxes || [])] });
  current = { group, d, level };
  window.__lite = { G, game, player, level };
}
onGo(load);
load(G.screen);

onFrame((dt, t) => {
  if (player.cinematic) {
    // a slow orbit behind the menus; in a headset, a still spot at the back of the shul instead
    if (vrState.active) view(new THREE.Vector3(0, 1.6, 15), new THREE.Vector3(0, 1.6, 0), dt);
    else { const k = t * 0.08; view(new THREE.Vector3(Math.sin(k) * 22, 13, Math.cos(k) * 26), new THREE.Vector3(0, 2, -4), dt, 1.8); }
    return;
  }
  if (!current) return;
  updatePlayer(dt, { paused: !!G.reaction, npcs: current.level.npcs || [] });
  current.level.update(dt);
});

initVR(root);
startLoop();
window.__camera = camera;
