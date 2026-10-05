import { chromium } from 'playwright';
import fs from 'fs';
const TEXT = 'בראשית ברא אלהים את השמים ואת הארץ והארץ היתה תהו ובהו וחשך על פני תהום ורוח אלהים מרחפת על פני המים ויאמר אלהים יהי אור ויהי אור';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage();
await p.goto('http://127.0.0.1:8765/index.html');
await p.waitForFunction(() => window.ready);
for (const [id, ink] of [['p1', 'gold'], ['p1', 'sepia'], ['p2', 'ink']]) {
  const frames = await p.evaluate(([id, ink, t]) => window.run(id, ink, t, 1200), [id, ink, TEXT]);
  fs.mkdirSync(`out-${id}-${ink}`, { recursive: true });
  frames.forEach((d, i) => fs.writeFileSync(`out-${id}-${ink}/${String(i).padStart(3, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log(id, ink, frames.length, 'frames');
}
await b.close();
