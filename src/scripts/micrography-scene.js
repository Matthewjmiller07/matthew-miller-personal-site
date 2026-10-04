// Scene editor for the micrography studio: arrange a photo (optionally with its
// background removed) and simple shapes / words on a stage, then hand the flattened
// grayscale-ish composition to the micrography engine as its source image.
//
// In micrography, darkness becomes ink — so each object's "shade" sets how dense and
// heavy its letters will be. Background removal leaves bare paper (white) behind.
//
// Background removal uses MediaPipe's Selfie Segmenter (Apache-2.0), running fully in
// the browser. It's tuned for people; for other photos, click-to-erase (flood fill by
// color) and the erase/restore brushes do the job.

const MP_VERSION = '0.10.14';
const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
const WORK_MAX = 1400; // working resolution for the photo + its mask

const HEBREW = /[֐-׿]/;

// ————— Shapes, drawn in a 100×100 box —————
function starPath(ctx, points, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const x = 50 + r * Math.cos(a), y = 50 + r * Math.sin(a);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

const tri = (ctx, up) => {
  const r = 46, a0 = up ? -Math.PI / 2 : Math.PI / 2;
  for (let i = 0; i < 3; i++) {
    const a = a0 + (i * 2 * Math.PI) / 3;
    const x = 50 + r * Math.cos(a), y = 50 + r * Math.sin(a);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
};

export const SHAPES = {
  circle: { label: 'Circle', draw(ctx) { ctx.beginPath(); ctx.arc(50, 50, 46, 0, Math.PI * 2); } },
  heart: {
    label: 'Heart',
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(50, 90);
      ctx.bezierCurveTo(20, 68, 4, 50, 4, 31);
      ctx.bezierCurveTo(4, 15, 16, 6, 29, 6);
      ctx.bezierCurveTo(39, 6, 46, 12, 50, 20);
      ctx.bezierCurveTo(54, 12, 61, 6, 71, 6);
      ctx.bezierCurveTo(84, 6, 96, 15, 96, 31);
      ctx.bezierCurveTo(96, 50, 80, 68, 50, 90);
      ctx.closePath();
    },
  },
  star: { label: 'Star', draw(ctx) { starPath(ctx, 5, 48, 20); } },
  magen: {
    label: 'Star of David',
    draw(ctx) { ctx.beginPath(); tri(ctx, true); tri(ctx, false); },
  },
  crescent: {
    label: 'Crescent',
    draw(ctx) {
      ctx.beginPath();
      ctx.arc(46, 50, 44, Math.PI * 0.25, Math.PI * 1.75, false);
      ctx.arc(62, 50, 36, Math.PI * 1.68, Math.PI * 0.32, true);
      ctx.closePath();
    },
  },
  arch: {
    label: 'Arch',
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(14, 96); ctx.lineTo(14, 46);
      ctx.arc(50, 46, 36, Math.PI, 0);
      ctx.lineTo(86, 96); ctx.closePath();
    },
  },
  tree: {
    label: 'Tree',
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(45, 96); ctx.lineTo(45, 62); ctx.lineTo(55, 62); ctx.lineTo(55, 96); ctx.closePath();
      [[50, 30, 24], [30, 46, 18], [70, 46, 18], [40, 22, 14], [62, 22, 14]].forEach(([x, y, r]) => {
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
      });
    },
  },
  hamsa: {
    label: 'Hamsa',
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(50, 96);
      ctx.bezierCurveTo(31, 96, 20, 84, 20, 68);
      ctx.lineTo(20, 60);
      ctx.bezierCurveTo(11, 58, 6, 51, 9, 45);
      ctx.bezierCurveTo(12, 39, 19, 41, 23, 47);
      ctx.lineTo(24, 22); ctx.quadraticCurveTo(28, 14, 32, 22);
      ctx.lineTo(34, 40); ctx.lineTo(36, 13); ctx.quadraticCurveTo(41, 5, 46, 13);
      ctx.lineTo(48, 38); ctx.lineTo(50, 9); ctx.quadraticCurveTo(55, 1, 60, 9);
      ctx.lineTo(60, 38); ctx.lineTo(64, 13); ctx.quadraticCurveTo(69, 5, 73, 13);
      ctx.lineTo(70, 40); ctx.lineTo(73, 22); ctx.quadraticCurveTo(77, 14, 81, 22);
      ctx.lineTo(78, 47);
      ctx.bezierCurveTo(82, 41, 89, 39, 92, 45);
      ctx.bezierCurveTo(95, 51, 90, 58, 81, 60);
      ctx.lineTo(80, 68);
      ctx.bezierCurveTo(80, 84, 69, 96, 50, 96);
      ctx.closePath();
    },
    // the eye, punched out in paper
    after(ctx, paper) {
      ctx.save();
      ctx.fillStyle = paper;
      ctx.beginPath(); ctx.ellipse(50, 70, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.arc(50, 70, 5, 0, Math.PI * 2); ctx.fill();
    },
  },
  candle: {
    label: 'Candle',
    draw(ctx) {
      ctx.beginPath();
      ctx.rect(38, 40, 24, 56);
      ctx.moveTo(50, 6);
      ctx.bezierCurveTo(60, 18, 60, 30, 50, 34);
      ctx.bezierCurveTo(40, 30, 40, 18, 50, 6);
    },
  },
  menorah: {
    label: 'Menorah',
    draw(ctx) {
      ctx.beginPath();
      ctx.rect(47, 30, 6, 56);            // shaft
      ctx.rect(30, 86, 40, 8);            // base
      for (const r of [12, 24, 36]) {     // three pairs of branches
        ctx.moveTo(50 - r, 30);
        ctx.arc(50, 30, r, Math.PI, 0, true);
        ctx.arc(50, 30, r - 5, 0, Math.PI, false);
        ctx.closePath();
      }
      for (const x of [14, 26, 38, 50, 62, 74, 86]) { // flames
        ctx.moveTo(x, 12); ctx.bezierCurveTo(x + 5, 18, x + 4, 26, x, 27); ctx.bezierCurveTo(x - 4, 26, x - 5, 18, x, 12);
      }
    },
  },
  sun: {
    label: 'Sun',
    draw(ctx) {
      ctx.beginPath();
      ctx.arc(50, 50, 24, 0, Math.PI * 2);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6, b = 0.13;
        ctx.moveTo(50 + 30 * Math.cos(a - b), 50 + 30 * Math.sin(a - b));
        ctx.lineTo(50 + 48 * Math.cos(a), 50 + 48 * Math.sin(a));
        ctx.lineTo(50 + 30 * Math.cos(a + b), 50 + 30 * Math.sin(a + b));
        ctx.closePath();
      }
    },
  },
  waves: {
    label: 'Waves',
    draw(ctx) {
      ctx.beginPath();
      for (const y of [30, 50, 70]) {
        ctx.moveTo(4, y);
        for (let x = 4; x <= 96; x += 23) ctx.bezierCurveTo(x + 6, y - 9, x + 17, y - 9, x + 23, y);
        ctx.lineTo(96, y + 8);
        for (let x = 96; x >= 4; x -= 23) ctx.bezierCurveTo(x - 6, y - 1, x - 17, y - 1, x - 23, y + 8);
        ctx.closePath();
      }
    },
  },
};

// ————— Background removal —————
let segmenterPromise = null;
function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(MP_WASM);
      return ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MP_MODEL, delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    })().catch((e) => { segmenterPromise = null; throw e; });
  }
  return segmenterPromise;
}

function grayFor(shade) {
  const v = Math.round(255 * (1 - shade));
  return `rgb(${v},${v},${v})`;
}

export function createScene({ canvas, font, onChange, onSelect }) {
  const ctx = canvas.getContext('2d');
  const state = {
    layers: [],        // bottom → top
    selected: null,
    aspect: 'auto',    // 'auto' | '3:4' | '1:1' | '4:3'
    tool: 'move',      // 'move' | 'erase' | 'restore' | 'wand'
    brush: 0.04,       // brush radius as a fraction of the stage width
    tolerance: 36,
  };
  let nextId = 1;

  const photoLayer = () => state.layers.find((l) => l.type === 'photo');

  function stageAspect() {
    if (state.aspect === '3:4') return 4 / 3;
    if (state.aspect === '1:1') return 1;
    if (state.aspect === '4:3') return 3 / 4;
    const p = photoLayer();
    return p ? p.h / p.w : 1;
  }

  // ——— Photo layer ———
  function rebuildCut(L) {
    const c = L.cut.getContext('2d');
    c.globalCompositeOperation = 'copy';
    c.drawImage(L.work, 0, 0);
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(L.mask, 0, 0);
    c.globalCompositeOperation = 'source-over';
  }

  function setPhoto(img) {
    const nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
    const f = Math.min(1, WORK_MAX / Math.max(nw, nh));
    const w = Math.max(1, Math.round(nw * f)), h = Math.max(1, Math.round(nh * f));
    const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const work = mk(), mask = mk(), cut = mk();
    work.getContext('2d').drawImage(img, 0, 0, w, h);
    const m = mask.getContext('2d'); m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
    const old = photoLayer();
    const L = { id: nextId++, type: 'photo', w, h, work, mask, cut, x: 0.5, y: 0.5, size: 1, rot: 0, bgRemoved: false };
    rebuildCut(L);
    if (old) state.layers[state.layers.indexOf(old)] = L; else state.layers.unshift(L);
    state.aspect = state.aspect || 'auto';
    fitPhoto(L);
    select(null);
    changed();
  }

  // size = width as a fraction of the stage width; fit the photo inside the stage
  function fitPhoto(L) {
    const A = stageAspect();
    L.size = Math.min(1, A / (L.h / L.w));
    L.x = 0.5; L.y = 0.5; L.rot = 0;
  }

  async function removeBackground(onStatus) {
    const L = photoLayer();
    if (!L) throw new Error('Add a photo first');
    onStatus?.('Loading the background remover (first time only)…');
    const seg = await getSegmenter();
    onStatus?.('Finding the person…');
    const result = seg.segment(L.work);
    const masks = result.confidenceMasks || [];
    if (!masks.length) throw new Error('No mask returned');
    const mw = masks[0].width, mh = masks[0].height;
    // single-mask models give "person"; multi-class models put background first
    const conf = masks.length > 1 ? masks[0].getAsFloat32Array().map((v) => 1 - v) : masks[0].getAsFloat32Array();
    masks.forEach((m) => m.close());
    const tmp = document.createElement('canvas'); tmp.width = mw; tmp.height = mh;
    const t = tmp.getContext('2d');
    const id = t.createImageData(mw, mh);
    let kept = 0;
    for (let i = 0; i < conf.length; i++) {
      let a = (conf[i] - 0.25) / 0.5; a = a < 0 ? 0 : a > 1 ? 1 : a;
      a = a * a * (3 - 2 * a);
      id.data[i * 4 + 3] = Math.round(a * 255);
      kept += a;
    }
    t.putImageData(id, 0, 0);
    if (kept / conf.length < 0.01) throw new Error("Couldn't find a person — try click-to-erase instead");
    const mctx = L.mask.getContext('2d');
    mctx.globalCompositeOperation = 'copy';
    mctx.filter = 'blur(1px)';
    mctx.drawImage(tmp, 0, 0, L.w, L.h);
    mctx.filter = 'none';
    mctx.globalCompositeOperation = 'source-over';
    L.bgRemoved = true;
    rebuildCut(L);
    changed();
    onStatus?.('');
  }

  function resetMask() {
    const L = photoLayer();
    if (!L) return;
    const m = L.mask.getContext('2d');
    m.globalCompositeOperation = 'source-over';
    m.fillStyle = '#000'; m.fillRect(0, 0, L.w, L.h);
    L.bgRemoved = false;
    rebuildCut(L);
    changed();
  }

  // Flood-fill erase from a seed pixel by color distance (great for plain backdrops)
  function wandErase(L, sx, sy) {
    const { w, h } = L;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
    const px = L.work.getContext('2d').getImageData(0, 0, w, h).data;
    const mctx = L.mask.getContext('2d');
    const md = mctx.getImageData(0, 0, w, h);
    const seed = (sy * w + sx) * 4;
    const sr = px[seed], sg = px[seed + 1], sb = px[seed + 2];
    const tol2 = state.tolerance * state.tolerance * 3;
    const seen = new Uint8Array(w * h);
    const stack = [sy * w + sx];
    while (stack.length) {
      const i = stack.pop();
      if (seen[i]) continue;
      seen[i] = 1;
      const o = i * 4;
      const dr = px[o] - sr, dg = px[o + 1] - sg, db = px[o + 2] - sb;
      if (dr * dr + dg * dg + db * db > tol2) continue;
      md.data[o + 3] = 0;
      const x = i % w;
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (i >= w) stack.push(i - w);
      if (i < w * (h - 1)) stack.push(i + w);
    }
    mctx.putImageData(md, 0, 0);
    // soften the cut edge a touch
    const soft = document.createElement('canvas'); soft.width = w; soft.height = h;
    const s = soft.getContext('2d'); s.filter = 'blur(1px)'; s.drawImage(L.mask, 0, 0);
    mctx.globalCompositeOperation = 'copy'; mctx.drawImage(soft, 0, 0); mctx.globalCompositeOperation = 'source-over';
    L.bgRemoved = true;
    rebuildCut(L);
  }

  function paintMask(L, sx, sy, restore) {
    const m = L.mask.getContext('2d');
    const r = (state.brush * canvas.width) / ((L.size * canvas.width) / L.w);
    m.globalCompositeOperation = restore ? 'source-over' : 'destination-out';
    m.fillStyle = '#000';
    m.beginPath(); m.arc(sx, sy, r, 0, Math.PI * 2); m.fill();
    m.globalCompositeOperation = 'source-over';
    if (!restore) L.bgRemoved = true;
  }

  // ——— Shapes & words ———
  function addShape(kind) {
    const L = { id: nextId++, type: 'shape', kind, x: 0.5, y: 0.5, size: 0.35, rot: 0, shade: 0.85, outline: false };
    state.layers.push(L);
    select(L);
    changed();
  }

  function addText(text) {
    const L = { id: nextId++, type: 'text', text: String(text).slice(0, 40), x: 0.5, y: 0.5, size: 0.6, rot: 0, shade: 0.9, outline: false };
    state.layers.push(L);
    select(L);
    changed();
  }

  function textMetrics(L, ctx2) {
    ctx2.font = `700 100px ${font}`;
    const mw = Math.max(1, ctx2.measureText(L.text).width);
    return { mw };
  }

  // ——— Drawing ———
  function drawLayer(c, L, W, H, paper) {
    c.save();
    c.translate(L.x * W, L.y * H);
    c.rotate(L.rot);
    const w = L.size * W;
    if (L.type === 'photo') {
      const h = (w * L.h) / L.w;
      c.imageSmoothingQuality = 'high';
      c.drawImage(L.cut, -w / 2, -h / 2, w, h);
    } else if (L.type === 'text') {
      const { mw } = textMetrics(L, c);
      const fs = (100 * w) / mw;
      c.font = `700 ${fs}px ${font}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.direction = HEBREW.test(L.text) ? 'rtl' : 'ltr';
      if (L.outline) { c.lineWidth = fs * 0.06; c.strokeStyle = grayFor(L.shade); c.strokeText(L.text, 0, 0); }
      else { c.fillStyle = grayFor(L.shade); c.fillText(L.text, 0, 0); }
    } else {
      const s = w / 100;
      c.scale(s, s);
      c.translate(-50, -50);
      const shape = SHAPES[L.kind];
      c.fillStyle = c.strokeStyle = grayFor(L.shade);
      shape.draw(c);
      if (L.outline) { c.lineWidth = 4; c.lineJoin = 'round'; c.stroke(); }
      else c.fill(L.kind === 'magen' ? 'nonzero' : 'nonzero');
      if (shape.after && !L.outline) shape.after(c, paper);
    }
    c.restore();
  }

  function halfExtents(L, W) {
    const w = L.size * W;
    if (L.type === 'photo') return [w / 2, (w * L.h) / L.w / 2];
    if (L.type === 'text') {
      const { mw } = textMetrics(L, ctx);
      return [w / 2, ((100 * w) / mw) * 0.6];
    }
    return [w / 2, w / 2];
  }

  function toLocal(L, px, py, W, H) {
    const dx = px - L.x * W, dy = py - L.y * H;
    const c = Math.cos(-L.rot), s = Math.sin(-L.rot);
    return [dx * c - dy * s, dx * s + dy * c];
  }

  function render() {
    const cssW = canvas.clientWidth || 480;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(cssW * dpr), H = Math.round(W * stageAspect());
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    // checkerboard hint where the photo background was removed
    for (const L of state.layers) drawLayer(ctx, L, W, H, '#ffffff');
    const L = state.selected;
    if (L) {
      const [hx, hy] = halfExtents(L, W);
      ctx.save();
      ctx.translate(L.x * W, L.y * H); ctx.rotate(L.rot);
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeStyle = '#8a2417';
      ctx.strokeRect(-hx - 4 * dpr, -hy - 4 * dpr, 2 * hx + 8 * dpr, 2 * hy + 8 * dpr);
      ctx.restore();
    }
  }

  // The composition handed to the micrography engine
  function exportCanvas(longSide = 1600) {
    const A = stageAspect();
    const W = A <= 1 ? longSide : Math.round(longSide / A);
    const H = Math.round(W * A);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, W, H);
    for (const L of state.layers) drawLayer(x, L, W, H, '#ffffff');
    return c;
  }

  // ——— Interaction ———
  let drag = null;
  // Capture keeps a drag alive when the finger/mouse leaves the canvas; some
  // browsers throw if the pointer is already gone, which must not abort the drag.
  const capture = (e) => { try { canvas.setPointerCapture(e.pointerId); } catch (_) {} };
  function stagePoint(e) {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * canvas.width, ((e.clientY - r.top) / r.height) * canvas.height];
  }
  function photoPoint(L, px, py) {
    const W = canvas.width, H = canvas.height;
    const [lx, ly] = toLocal(L, px, py, W, H);
    const scale = (L.size * W) / L.w;
    return [Math.round(lx / scale + L.w / 2), Math.round(ly / scale + L.h / 2)];
  }
  function hit(px, py) {
    const W = canvas.width, H = canvas.height;
    for (let i = state.layers.length - 1; i >= 0; i--) {
      const L = state.layers[i];
      const [hx, hy] = halfExtents(L, W);
      const [lx, ly] = toLocal(L, px, py, W, H);
      if (Math.abs(lx) <= hx && Math.abs(ly) <= hy) return L;
    }
    return null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const [px, py] = stagePoint(e);
    const P = photoLayer();
    if (state.tool !== 'move' && P) {
      const [sx, sy] = photoPoint(P, px, py);
      if (state.tool === 'wand') { wandErase(P, sx, sy); changed(); return; }
      capture(e);
      drag = { paint: true, P };
      paintMask(P, sx, sy, state.tool === 'restore');
      rebuildCut(P); render();
      return;
    }
    const L = hit(px, py);
    select(L);
    if (L) {
      capture(e);
      drag = { L, ox: px / canvas.width - L.x, oy: py / canvas.height - L.y };
    }
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const [px, py] = stagePoint(e);
    if (drag.paint) {
      const [sx, sy] = photoPoint(drag.P, px, py);
      paintMask(drag.P, sx, sy, state.tool === 'restore');
      rebuildCut(drag.P);
      render();
      return;
    }
    drag.L.x = Math.min(1.2, Math.max(-0.2, px / canvas.width - drag.ox));
    drag.L.y = Math.min(1.2, Math.max(-0.2, py / canvas.height - drag.oy));
    render();
  });
  const endDrag = () => { if (drag) { drag = null; changed(); } };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    if (!state.selected || state.tool !== 'move') return;
    e.preventDefault();
    state.selected.size = Math.min(3, Math.max(0.03, state.selected.size * (e.deltaY < 0 ? 1.06 : 1 / 1.06)));
    changed();
  }, { passive: false });

  function select(L) {
    state.selected = L;
    onSelect?.(L);
  }
  function changed() {
    render();
    onChange?.();
  }

  window.addEventListener('resize', render);

  return {
    state,
    render,
    setPhoto,
    removeBackground,
    resetMask,
    addShape,
    addText,
    exportCanvas,
    hasContent: () => state.layers.length > 0,
    hasPhoto: () => !!photoLayer(),
    selected: () => state.selected,
    setTool(t) { state.tool = t; },
    setBrush(f) { state.brush = f; },
    setTolerance(t) { state.tolerance = t; },
    setAspect(a) {
      state.aspect = a;
      const P = photoLayer();
      if (P) fitPhoto(P);
      changed();
    },
    update(props) {
      if (!state.selected) return;
      Object.assign(state.selected, props);
      changed();
    },
    remove() {
      const L = state.selected;
      if (!L) return;
      state.layers.splice(state.layers.indexOf(L), 1);
      select(null);
      changed();
    },
    restack(dir) {
      const L = state.selected;
      if (!L) return;
      const i = state.layers.indexOf(L);
      state.layers.splice(i, 1);
      if (dir === 'front') state.layers.push(L); else state.layers.unshift(L);
      changed();
    },
    clear() {
      state.layers = [];
      select(null);
      changed();
    },
  };
}
