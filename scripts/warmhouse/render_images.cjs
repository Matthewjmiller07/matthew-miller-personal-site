// Product images for the model cards and the share image, taken from the page's own 3D viewer.
//   npx astro dev --port 4399 &   then   node scripts/warmhouse/render_images.cjs [model-id ...]
const { chromium } = require('playwright');
const fs = require('fs');
const dir = 'public/warmhouse/models';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await page.goto('http://localhost:4399/warmhouse?yaw=-0.55', { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '.wh-viewer{width:400px!important;aspect-ratio:5/4!important;border-radius:0!important;border:0!important}.wh-viewer-hint{display:none}.wh-plate{visibility:hidden}' });
  await page.waitForSelector('.wh-viewer.is-ready');
  const viewer = page.locator('.wh-viewer');
  for (const id of ids) {
    await viewer.evaluate((el, file) => el.dispatchEvent(new CustomEvent('wh:model', { detail: file })), `/warmhouse/models/${id}.json`);
    await page.waitForTimeout(1200);
    await viewer.screenshot({ path: `${dir}/${id}.jpg`, type: 'jpeg', quality: 86 });
    console.log(id);
  }
  // Share image: the whole hero at 1200x630.
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await og.goto('http://localhost:4399/warmhouse?yaw=-0.55', { waitUntil: 'networkidle' });
  await og.addStyleTag({ content: '.wh-nav{position:static}.wh-hero{padding-top:28px}.wh-viewer-hint,.wh-try,.wh-stage-note{display:none}.wh-hero h1{font-size:3.4rem}' });
  await og.waitForSelector('.wh-viewer.is-ready');
  await og.waitForTimeout(1200);
  await og.screenshot({ path: 'public/warmhouse/og.jpg', type: 'jpeg', quality: 88 });
  await browser.close();
})();
