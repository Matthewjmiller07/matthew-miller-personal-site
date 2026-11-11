// A looping GIF of an agent's model turning on its base plate, for outreach emails and DMs.
// Needs the dev server (scripts/warmhouse/render.sh starts one), then:
//   node scripts/warmhouse/render_gif.cjs <agent-slug> [out.gif]
// Writes PNG frames next to the output; scripts/warmhouse/frames_to_gif.py turns them into the GIF.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const slug = process.argv[2];
const out = process.argv[3] || `public/warmhouse/gifs/${slug}.gif`;
const FRAMES = 40;
if (!slug) {
  console.error('usage: node scripts/warmhouse/render_gif.cjs <agent-slug> [out.gif]');
  process.exit(1);
}
const dir = `${out}.frames`;
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  // The tracker's owner flag keeps these renders out of the visit log.
  await page.addInitScript(() => localStorage.setItem('wh-owner', '1'));
  await page.goto(`http://localhost:4399/warmhouse/for/${slug}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: `.wh-nav,.wh-hero-copy,.wh-viewer-hint,.wh-stage-note,.wh-try{display:none!important}
      .wh-hero{padding:24px 0 30px!important}.wh-hero-in{display:block!important}
      .wh-stage{width:560px!important;margin:0 auto}.wh-viewer{aspect-ratio:1/0.8!important;border:0!important;border-radius:0!important}
      .wh-plate{margin-top:-30px!important}
      body,.wh-hero,.wh-stage{background:#F1E8D9!important}.wh-viewer{background:#F1E8D9!important}.wh-stage{padding-bottom:18px}`,
  });
  await page.waitForSelector('.wh-viewer.is-ready');
  const viewer = page.locator('.wh-viewer');
  const stage = page.locator('.wh-stage');
  for (let i = 0; i < FRAMES; i++) {
    await viewer.evaluate((el, y) => el.dispatchEvent(new CustomEvent('wh:yaw', { detail: y })), -0.62 + (i / FRAMES) * Math.PI * 2);
    await page.waitForTimeout(120);
    await stage.screenshot({ path: path.join(dir, `${String(i).padStart(3, '0')}.png`) });
  }
  await browser.close();
  console.log(dir);
})();
