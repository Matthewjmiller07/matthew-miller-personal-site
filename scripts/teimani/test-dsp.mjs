// Runs the Teimani detectors over a folder of WAV files and prints what they hear.
//   node scripts/teimani/test-dsp.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';
import { analyze, sustain, vowel, onsetFriction, trill, place } from '../../public/teimani/dsp.js';

function readWav(file) {
  const b = fs.readFileSync(file);
  let p = 12, sr = 22050, data = null;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4);
    if (id === 'fmt ') sr = b.readUInt32LE(p + 12);
    if (id === 'data') { data = b.subarray(p + 8, Math.min(b.length, p + 8 + (len || b.length))); break; }
    p += 8 + len;
  }
  const x = new Float32Array(data.length >> 1);
  for (let i = 0; i < x.length; i++) x[i] = data.readInt16LE(i * 2) / 32768;
  return { x, sr };
}

const dir = process.argv[2];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.wav')).sort()) {
  const { x, sr } = readWav(path.join(dir, f));
  const fr = analyze(x, sr);
  const vw = vowel(fr), on = onsetFriction(fr), tr = trill(x, sr);
  const sv = sustain(fr, true), su = sustain(fr, false);
  const pl = vw ? place(vw.f1, vw.f2) : null;
  console.log(f.padEnd(22),
    vw ? `F1 ${vw.f1.toFixed(0).padStart(4)} F2 ${vw.f2.toFixed(0).padStart(4)} open ${pl.open.toFixed(2)} front ${pl.front.toFixed(2)}` : 'no vowel'.padEnd(40),
    `| voiced ${String(sv.ms).padStart(4)}ms voiceless ${String(su.ms).padStart(4)}ms hf ${su.hf.toFixed(2)} cen ${su.centroid.toFixed(0)}`,
    `| onset ${on ? on.ms : '-'}ms | trill ${tr.strength.toFixed(2)}@${tr.rate.toFixed(0)}Hz`);
}
