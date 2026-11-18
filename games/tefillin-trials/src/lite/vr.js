// Hineni Lite in VR (WebXR). In the headset you are the player, first person: the left stick walks,
// the right stick snap-turns, the right trigger picks and acts. The HUD, the questions and the title
// menu live on a panel that floats in front of you (DOM overlays don't exist inside a headset).
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { renderer, scene, camera, player, touch, fire, onFrame, viewHook, vrState } from './engine.js';
import { G, game, subscribe } from './state.js';
import { SHIURIM } from '../content.js';
import { LEVEL_NAMES } from './ui.js';
import { sfx } from '../audio.js';

const PANEL_W = 1.25, PANEL_H = 0.94; // metres
const CW = 1000, CH = 752; // canvas pixels

export function initVR(root) {
  if (!('xr' in navigator)) return;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  // Only offer the button where a headset can actually start a session.
  navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
    if (!ok) return;
    const btn = VRButton.createButton(renderer);
    btn.classList.add('lt-vr-btn');
    root.appendChild(btn);
  }).catch(() => {});

  // The rig: the camera rides on it, so moving the rig moves you.
  const rig = new THREE.Group();
  scene.add(rig);
  rig.add(camera);

  // ── the panel ──
  const canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_W, PANEL_H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false }));
  panel.renderOrder = 10;
  panel.visible = false;
  scene.add(panel);
  window.__vrPanel = panel; // for tests and the console
  let buttons = []; // [{ x, y, w, h, run }]
  let usedH = CH; // the panel shrinks to what it has to say
  let hover = -1;

  function menu() {
    if (G.reaction) return G.reaction.options.map((o) => ({ t: o.t, run: () => G.reaction?.onPick(o) }));
    if (G.screen === 'title') {
      return [
        { t: 'Enter the shul ▸', run: () => { sfx.great(); game.go('hub'); } },
        ...SHIURIM.flatMap((sh) => sh.levels.map((l) => ({ t: `Shiur ${sh.shiur} · ${l.name}`, color: l.color, run: () => game.go(l.id) }))),
        { t: G.minhag === 'ashkenaz' ? 'Minhag: Ashkenazi (two brachot) · switch' : 'Minhag: Sefardi (one bracha) · switch', run: () => game.setMinhag(G.minhag === 'ashkenaz' ? 'sefard' : 'ashkenaz') },
      ];
    }
    if (G.screen === 'results' && G.results) return [{ t: '↻ Play again', run: () => game.go(G.results.level) }, { t: 'Back to the shul ▸', run: () => game.go('hub') }];
    const extra = [];
    if (G.prompt) extra.push({ t: G.prompt, run: () => fire('action') });
    if (G.hud.ritual) extra.push({ t: 'F · shift + lehaniach', run: () => fire('shift') }, { t: 'M · al mitzvat', run: () => fire('mitzvat') }, { t: 'E · tighten', run: () => fire('action') }, { t: 'B · Baruch Shem', run: () => fire('bless') });
    if (G.hud.kaddish) extra.push({ t: '“Amen, yehei shemei rabba!”', run: () => fire('amen') });
    if (G.hud.stage === 'place' || G.hud.stage === 'bless') extra.push({ t: 'E · set it down', run: () => fire('action') }, { t: 'B · lehaniach tefillin', run: () => fire('bless') });
    if (G.hud.stage === 'knot') extra.push({ t: 'E · tie the yud here', run: () => fire('action') });
    if (G.screen !== 'hub') extra.push({ t: '⟵ Back to the shul', run: () => game.go('hub'), quiet: true });
    return extra;
  }

  function wrap(text, x, y, maxW, lh, maxLines = 99) {
    const words = String(text || '').split(' ');
    let line = '', n = 0;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; if (++n >= maxLines - 1) { line += '…'; break; } } else line = test;
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }

  function draw() {
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = 'rgba(10,12,22,0.9)';
    ctx.beginPath(); ctx.roundRect(4, 4, CW - 8, CH - 8, 28); ctx.fill();
    let y = 56;
    ctx.fillStyle = '#ffd84a'; ctx.font = '800 30px Inter, sans-serif';
    const head = G.screen === 'title' ? 'HINENI · The Tefillin Trials' : G.screen === 'results' ? (LEVEL_NAMES[G.results?.level] || 'Results') : (LEVEL_NAMES[G.screen] || 'The shul');
    ctx.fillText(head, 36, y); y += 14;
    const h = G.hud;
    ctx.font = '600 24px Inter, sans-serif'; ctx.fillStyle = '#a9afc6';
    const stats = [h.lives != null ? `♥ ${h.lives}` : h.hearts != null ? `♥ ${h.hearts}` : '', h.score != null ? `${h.score} pts` : '', h.served != null ? `${h.served}/${h.total}` : '', h.hineni != null ? `Hineni ${h.hineni}%` : '', `${G.xp} XP`].filter(Boolean).join('   ·   ');
    y = wrap(stats, 36, y + 30, CW - 72, 30, 1);
    ctx.fillStyle = '#e7e9f0'; ctx.font = '500 26px Inter, sans-serif';
    if (G.screen === 'results' && G.results) {
      ctx.font = '800 34px Georgia, serif'; ctx.fillStyle = '#fff3b0';
      y = wrap(`${'★'.repeat(G.results.stars)}${'☆'.repeat(3 - G.results.stars)}  ${G.results.title}  +${G.results.xp} XP`, 36, y + 10, CW - 72, 40, 2);
      ctx.font = '500 22px Inter, sans-serif'; ctx.fillStyle = '#e7e9f0';
      for (const l of (G.results.lessons || []).slice(0, 4)) y = wrap(`• ${l}`, 36, y + 4, CW - 72, 28, 2);
    } else if (G.reaction) {
      ctx.fillStyle = '#ffd84a'; ctx.font = '700 22px Inter, sans-serif';
      y = wrap(G.reaction.who.toUpperCase(), 36, y + 14, CW - 72, 28, 1);
      ctx.fillStyle = '#ffffff'; ctx.font = '700 28px Georgia, serif';
      y = wrap(G.reaction.line, 36, y + 4, CW - 72, 34, 4);
    } else if (h.objective || G.screen === 'title') {
      y = wrap(G.screen === 'title' ? 'Point and pull the trigger to choose. Left stick walks, right stick turns.' : h.objective, 36, y + 14, CW - 72, 32, 3);
    }
    const toast = G.toasts[G.toasts.length - 1];
    if (toast && !G.reaction && G.screen !== 'title') {
      ctx.fillStyle = toast.tone === 'bad' ? '#ff8a7a' : toast.tone === 'info' ? '#9fd7ff' : '#7ad1a8';
      ctx.font = '500 21px Inter, sans-serif';
      y = wrap(toast.text, 36, y + 8, CW - 72, 26, 3);
    }
    // buttons
    const items = menu();
    buttons = [];
    const bh = items.length > 6 ? 46 : 58, gap = 8;
    let by = y + 12;
    ctx.font = `600 ${items.length > 6 ? 21 : 23}px Inter, sans-serif`;
    items.forEach((it, i) => {
      if (by + bh > CH - 16) return;
      ctx.fillStyle = i === hover ? '#3a2f10' : it.quiet ? 'rgba(22,26,40,.6)' : '#161a28';
      ctx.strokeStyle = i === hover ? '#ffd84a' : it.color || '#3a3f55'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(28, by, CW - 56, bh, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = it.color || '#e7e9f0';
      ctx.save(); ctx.beginPath(); ctx.rect(40, by, CW - 80, bh); ctx.clip();
      ctx.fillText(`${G.reaction ? `${i + 1}. ` : ''}${it.t}`, 44, by + bh / 2 + 8);
      ctx.restore();
      buttons.push({ x: 28, y: by, w: CW - 56, h: bh, run: it.run });
      by += bh + gap;
    });
    usedH = Math.min(CH, Math.max(by, y) + 20);
    ctx.clearRect(0, usedH, CW, CH - usedH);
    ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(4, 4, CW - 8, usedH - 8, 28); ctx.stroke();
    // show only the slice of the canvas that has something on it
    const k = usedH / CH;
    tex.repeat.set(1, k);
    tex.offset.set(0, 1 - k);
    panel.scale.set(1, k, 1);
    tex.needsUpdate = true;
  }
  let dirty = true;
  subscribe(() => { dirty = true; });

  // ── controllers ──
  const ray = new THREE.Raycaster();
  const controllers = [0, 1].map((i) => {
    const c = renderer.xr.getController(i);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -3)]), new THREE.LineBasicMaterial({ color: '#ffd84a' }));
    c.add(line);
    c.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.12), new THREE.MeshBasicMaterial({ color: '#2c3550' })));
    rig.add(c);
    c.addEventListener('connected', (e) => { c.userData.hand = e.data.handedness; c.userData.source = e.data; });
    c.addEventListener('disconnected', () => { c.userData.source = null; });
    c.addEventListener('selectstart', () => {
      if (c.userData.hand === 'left') { touch.hum = true; return; }
      const hit = buttonAt(c);
      if (hit) { sfx.collect(); hit.run(); dirty = true; } else if (!G.reaction) fire('action');
    });
    c.addEventListener('selectend', () => { if (c.userData.hand === 'left') touch.hum = false; });
    c.addEventListener('squeezestart', () => fire(c.userData.hand === 'left' ? 'shift' : 'bless'));
    return c;
  });
  function buttonAt(c) {
    if (!panel.visible) return null;
    const m = new THREE.Matrix4().extractRotation(c.matrixWorld);
    ray.ray.origin.setFromMatrixPosition(c.matrixWorld);
    ray.ray.direction.set(0, 0, -1).applyMatrix4(m);
    const hit = ray.intersectObject(panel)[0];
    if (!hit) return null;
    const px = hit.uv.x * CW, py = (1 - hit.uv.y) * usedH;
    const i = buttons.findIndex((b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h);
    return i >= 0 ? { i, run: buttons[i].run } : null;
  }

  // ── sessions ──
  const headPos = new THREE.Vector3();
  const headDir = new THREE.Vector3();
  let fixedShot = null; // a close-up the level asked for (levels call view() every frame)
  let turnReady = true;
  const pressed = new Set();
  renderer.xr.addEventListener('sessionstart', () => {
    vrState.active = true;
    document.body.classList.add('lt-in-vr');
    panel.visible = true;
    panel.userData.fresh = false;
    camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0);
    rig.position.set(player.pos.x, 0, player.pos.z);
    rig.rotation.set(0, player.mesh ? player.facing + Math.PI : 0, 0);
    dirty = true;
    viewHook.fn = (pos, look) => {
      if (fixedShot && fixedShot.pos.distanceTo(pos) < 0.01) { fixedShot.at = performance.now(); return; }
      fixedShot = { pos: pos.clone(), look: look.clone(), at: performance.now(), placed: false };
    };
  });
  renderer.xr.addEventListener('sessionend', () => {
    vrState.active = false;
    document.body.classList.remove('lt-in-vr');
    panel.visible = false;
    viewHook.fn = null;
    fixedShot = null;
    rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
    camera.position.set(0, 14, 30);
    if (player.mesh) player.mesh.visible = true;
  });

  onFrame(() => {
    if (!vrState.active) return;
    // gamepads: left stick walks, right stick turns, A/B/X/Y buttons
    touch.x = 0; touch.y = 0;
    for (const c of controllers) {
      const gp = c.userData.source?.gamepad;
      if (!gp) continue;
      const ax = gp.axes.length >= 4 ? [gp.axes[2], gp.axes[3]] : [gp.axes[0] || 0, gp.axes[1] || 0];
      if (c.userData.hand === 'left') { touch.x = Math.abs(ax[0]) > 0.15 ? ax[0] : 0; touch.y = Math.abs(ax[1]) > 0.15 ? ax[1] : 0; }
      else {
        if (Math.abs(ax[0]) > 0.7 && turnReady) { rig.rotation.y -= Math.sign(ax[0]) * (Math.PI / 6); turnReady = false; }
        if (Math.abs(ax[0]) < 0.3) turnReady = true;
      }
      gp.buttons.forEach((b, i) => {
        const key = `${c.userData.hand}${i}`;
        if (b.pressed && !pressed.has(key)) {
          pressed.add(key);
          if (i === 4) fire(c.userData.hand === 'left' ? 'mitzvat' : 'pulse'); // X / A
          if (i === 5) fire('amen'); // Y / B
        } else if (!b.pressed) pressed.delete(key);
      });
    }
    // where your head looks, flattened: walking goes that way
    camera.getWorldDirection(headDir);
    headDir.y = 0;
    if (headDir.lengthSq() > 1e-6) headDir.normalize();
    vrState.fwd.x = headDir.x; vrState.fwd.z = headDir.z;
    // a close-up holds the rig there; otherwise you are the player
    const inShot = fixedShot && performance.now() - fixedShot.at < 250;
    if (inShot) {
      if (!fixedShot.placed) {
        fixedShot.placed = true;
        rig.position.set(fixedShot.pos.x, Math.max(0, fixedShot.pos.y - 1.6), fixedShot.pos.z);
        rig.rotation.y = Math.atan2(-(fixedShot.look.x - fixedShot.pos.x), -(fixedShot.look.z - fixedShot.pos.z));
        panel.userData.fresh = false;
      }
    } else {
      fixedShot = null;
      rig.position.set(player.pos.x, 0, player.pos.z);
    }
    if (player.mesh) player.mesh.visible = !!inShot;
    // keep the panel low in front of you, lazily, tilted up toward your face
    camera.getWorldPosition(headPos);
    const want = new THREE.Vector3(vrState.fwd.x, 0, vrState.fwd.z).multiplyScalar(1.5).add(headPos);
    want.y = headPos.y - 0.3 - (PANEL_H * panel.scale.y) / 2;
    if (panel.position.distanceTo(want) > 0.9 || panel.userData.fresh !== true) { panel.position.copy(want); panel.userData.fresh = true; }
    panel.position.y += (want.y - panel.position.y) * 0.2;
    panel.lookAt(headPos);
    // hover
    const right = controllers.find((c) => c.userData.hand === 'right') || controllers[0];
    const h = buttonAt(right)?.i ?? -1;
    if (h !== hover) { hover = h; dirty = true; }
    if (dirty) { dirty = false; draw(); }
  });
  setInterval(() => { if (vrState.active && G.screen === 'gauntlet') dirty = true; }, 500);
}
