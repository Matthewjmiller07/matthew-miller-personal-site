// Generates the Kohelet reader's illustrations with FLUX 2 Klein 4B on Replicate.
// Usage: REPLICATE_API_TOKEN=... node scripts/kohelet/gen-images.mjs [--only name,name] [--refs a.jpg,b.jpg]
// Portrait prompts (withRef) are conditioned on reference stills of J.J. Kimche.
import fs from 'node:fs';
import path from 'node:path';

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error('REPLICATE_API_TOKEN missing');

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const only = flag('--only')?.split(',');
const refPaths = (flag('--refs') || '').split(',').filter(Boolean);
const refs = refPaths.map((p) => `data:image/jpeg;base64,${fs.readFileSync(p).toString('base64')}`);

const OUT = path.join(process.cwd(), 'public', 'images', 'kohelet');
fs.mkdirSync(OUT, { recursive: true });

const STYLE =
  'cinematic chiaroscuro photograph, pure black background, single warm tungsten key light from the side, deep shadows, muted amber and gold highlights, shallow depth of field, 35mm film grain, restrained and elegant, no text, no letters';
const HIM =
  'the bearded man from the reference photos (short receding brown hair, full trimmed auburn-brown beard, navy suit jacket, light blue checked shirt, no tie)';

const JOBS = [
  // Portraits
  { name: 'hero', ar: '16:9', withRef: true, prompt: `${HIM} seated in a worn brown leather armchair, exhaling a faint visible plume of breath vapor that hangs and dissolves in a shaft of light, contemplative gaze upward, ${STYLE}` },
  { name: 'essay-1', ar: '16:9', withRef: true, prompt: `${HIM} writing with a fountain pen on a sheet of paper at a dark wooden desk, a single oil lamp, an old Hebrew scroll unrolled beside him, Jerusalem stone wall faintly visible behind, ${STYLE}` },
  { name: 'essay-2', ar: '16:9', withRef: true, prompt: `${HIM} standing on a stone terrace at dawn looking at the sun rising over the Judean hills, his breath visible in the cold air, wind moving his jacket, small against the landscape, ${STYLE}` },
  { name: 'essay-3', ar: '16:9', withRef: true, prompt: `${HIM} smiling gently at a simple wooden table with a round loaf of bread, a clay cup of red wine, a small flask of olive oil, a folded white linen cloth, candlelight, warm and quiet evening, ${STYLE}` },
  { name: 'essay-4', ar: '16:9', withRef: true, prompt: `${HIM} seen from behind at a slight angle, standing alone in a vast dark desert under an enormous starry sky, a tiny figure beneath the Milky Way, ${STYLE}` },
  { name: 'essay-5', ar: '16:9', withRef: true, prompt: `${HIM} sitting beside a blossoming almond tree at dusk, white petals falling, a cracked golden bowl and a broken clay pitcher on the ground by a well, contemplative, ${STYLE}` },
  { name: 'essay-6', ar: '16:9', withRef: true, prompt: `${HIM} in a dark library holding an open leather-bound book, towering shelves of old commentaries receding into shadow, a reading lamp pooling gold light, ${STYLE}` },
  { name: 'trailer-a', ar: '16:9', withRef: true, prompt: `extreme close-up portrait of ${HIM}, serious expression, looking straight into the camera, half his face in shadow, ${STYLE}` },
  { name: 'trailer-b', ar: '16:9', withRef: true, prompt: `${HIM} gesturing with a pen mid-sentence while lecturing, seated in a brown leather armchair, black studio, ${STYLE}` },
  // Chapter plates (no person)
  { name: 'ch-1', ar: '3:2', prompt: `a river flowing endlessly into a dark sea under a rising sun, wind rippling the water, cyclical and timeless, ${STYLE}` },
  { name: 'ch-2', ar: '3:2', prompt: `an abandoned royal garden with empty reflecting pools, gold vessels and silver coins scattered on stone, overgrown vineyards, dusk, ${STYLE}` },
  { name: 'ch-3', ar: '3:2', prompt: `an antique brass hourglass with sand falling on a stone ledge, a seedling sprouting beside it and a fallen dry leaf, ${STYLE}` },
  { name: 'ch-4', ar: '3:2', prompt: `a threefold cord of rough rope coiled on a dark wooden table, lit by a single lamp, ${STYLE}` },
  { name: 'ch-5', ar: '3:2', prompt: `the dark threshold of an ancient stone temple doorway, a single sandal print in the dust, silence, ${STYLE}` },
  { name: 'ch-6', ar: '3:2', prompt: `an overflowing treasure chest in an empty dark room, coins spilling out, no one there, ${STYLE}` },
  { name: 'ch-7', ar: '3:2', prompt: `a small glass bottle of precious perfumed oil beside a funeral shroud of white linen, ${STYLE}` },
  { name: 'ch-8', ar: '3:2', prompt: `an ancient king's signet ring and a sealed scroll on black velvet, ${STYLE}` },
  { name: 'ch-9', ar: '3:2', prompt: `a loaf of bread, a cup of wine and a jar of oil on a white cloth, set for two, candlelight, ${STYLE}` },
  { name: 'ch-10', ar: '3:2', prompt: `a dead fly floating on the surface of fragrant oil in an alabaster jar, macro, ${STYLE}` },
  { name: 'ch-11', ar: '3:2', prompt: `a hand scattering bread upon dark moving water at first light, ${STYLE}` },
  { name: 'ch-12', ar: '3:2', prompt: `a broken golden bowl, a snapped silver cord and a shattered clay pitcher beside a stone well, almond blossoms falling, ${STYLE}` },
];

async function run(job) {
  const dest = path.join(OUT, `${job.name}.jpg`);
  const input = { prompt: job.prompt, aspect_ratio: job.ar, output_format: 'jpg', output_quality: 88, go_fast: true };
  if (job.withRef && refs.length) input.images = refs;
  let resp = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-2-klein-4b/predictions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' },
    body: JSON.stringify({ input }),
  });
  let data = await resp.json();
  while (data.status && !['succeeded', 'failed', 'canceled'].includes(data.status)) {
    await new Promise((r) => setTimeout(r, 1500));
    data = await (await fetch(data.urls.get, { headers: { Authorization: `Bearer ${token}` } })).json();
  }
  if (data.status !== 'succeeded') throw new Error(`${job.name}: ${data.error || data.detail || resp.status}`);
  const url = Array.isArray(data.output) ? data.output[0] : data.output;
  fs.writeFileSync(dest, Buffer.from(await (await fetch(url)).arrayBuffer()));
  console.log('✓', job.name);
}

const todo = JOBS.filter((j) => !only || only.includes(j.name));
for (let i = 0; i < todo.length; i += 4) {
  await Promise.all(todo.slice(i, i + 4).map((j) => run(j).catch((e) => console.error('✗', e.message))));
}
