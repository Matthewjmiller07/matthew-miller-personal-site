// Convert NationalCanopyTreesV2 shapefile to a sampled GeoJSON
// Usage: node scripts/prepare-canopy.js
// Output: public/data/canopy-sample.geojson

import { createRequire } from 'module';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const shapefile = require('shapefile');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const INPUT_DIR = path.join(projectRoot, 'src', 'data', 'nationalcanopytreesv2');
const SHP = path.join(INPUT_DIR, 'NationalCanopyTreesV2.shp');
const DBF = path.join(INPUT_DIR, 'NationalCanopyTreesV2.dbf');
const OUTPUT_DIR = path.join(projectRoot, 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'canopy-sample.geojson');

const MAX_FEATURES = 3000;

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function convert() {
  console.log('Reading shapefile:', SHP);
  const source = await shapefile.open(SHP, DBF, { encoding: 'utf8' });
  const features = [];
  let count = 0;

  while (true) {
    const { done, value } = await source.read();
    if (done) break;

    // value: { type: 'Feature', properties: {...}, geometry: {...} }
    if (value && value.geometry) {
      features.push({ type: 'Feature', properties: value.properties || {}, geometry: value.geometry });
      count++;
      if (count >= MAX_FEATURES) break;
    }
  }

  console.log(`Collected ${features.length} features (sampled)`);
  const fc = { type: 'FeatureCollection', features };
  await ensureDir(OUTPUT_DIR);
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(fc));
  console.log('Wrote', OUTPUT_FILE);
}

convert().catch((err) => {
  console.error('Failed to convert shapefile:', err);
  process.exit(1);
});
