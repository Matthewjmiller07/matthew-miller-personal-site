#!/usr/bin/env node
// One-time script to assign Learning Images to the correct days in aviya.csv
// based on which Genesis chapters appear in each day's readings.

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '..', 'public', 'aviya.csv');

// Chapter number → image path (relative to /public, served at root)
const CHAPTER_IMAGE_MAP = {
  1:  '/Learning Images/ChatGPT Image May 20, 2026, 04_18_39 PM.png',
  2:  '/Learning Images/ChatGPT Image May 20, 2026, 04_18_46 PM.png',
  3:  '/Learning Images/ChatGPT Image May 20, 2026, 04_18_51 PM.png',
  4:  '/Learning Images/ChatGPT Image May 20, 2026, 04_18_59 PM.png',
  5:  '/Learning Images/ChatGPT Image May 20, 2026, 04_19_15 PM.png',
  6:  '/Learning Images/ChatGPT Image May 20, 2026, 04_19_29 PM.png',
  7:  '/Learning Images/ChatGPT Image May 20, 2026, 04_19_35 PM.png',
  8:  '/Learning Images/ChatGPT Image May 20, 2026, 04_19_52 PM (1).png',
  9:  '/Learning Images/ChatGPT Image May 20, 2026, 04_19_52 PM (2).png',
  10: '/Learning Images/ChatGPT Image May 20, 2026, 04_19_52 PM (3).png',
  11: '/Learning Images/ChatGPT Image May 20, 2026, 04_19_53 PM (4).png',
  12: '/Learning Images/ChatGPT Image May 20, 2026, 04_19_53 PM (5).png',
  13: '/Learning Images/ChatGPT Image May 20, 2026, 04_19_53 PM (6).png',
  14: '/Learning Images/ChatGPT Image May 20, 2026, 04_19_53 PM (7).png',
  15: '/Learning Images/ChatGPT Image May 20, 2026, 04_19_53 PM (8).png',
  16: '/Learning Images/ChatGPT Image May 20, 2026, 04_19_54 PM (9).png',
  17: '/Learning Images/ChatGPT Image May 20, 2026, 04_19_54 PM (10).png',
  18: '/Learning Images/ChatGPT Image May 20, 2026, 04_19_54 PM (11).png',
  19: '/Learning Images/ChatGPT Image May 20, 2026, 04_19_54 PM (12).png',
  20: '/Learning Images/ChatGPT Image May 20, 2026, 04_19_54 PM (13).png',
  21: '/Learning Images/ChatGPT Image May 20, 2026, 04_20_17 PM (1).png',
  22: '/Learning Images/ChatGPT Image May 20, 2026, 04_20_17 PM (2).png',
  23: '/Learning Images/ChatGPT Image May 20, 2026, 04_20_17 PM (3).png',
  24: '/Learning Images/ChatGPT Image May 20, 2026, 04_20_17 PM (4).png',
  25: '/Learning Images/ChatGPT Image May 20, 2026, 04_20_18 PM (5).png',
  26: '/Learning Images/ChatGPT Image May 20, 2026, 04_20_18 PM (6).png',
  27: '/Learning Images/ChatGPT Image May 20, 2026, 04_20_18 PM (7).png',
  28: '/Learning Images/ChatGPT Image May 20, 2026, 04_20_18 PM (8).png',
  29: '/Learning Images/ChatGPT Image May 20, 2026, 04_20_18 PM (9).png',
  30: '/Learning Images/ChatGPT Image May 20, 2026, 04_20_19 PM (10).png',
};

// Extract unique Genesis chapter numbers from a reading string like
// "Genesis 1:1, Genesis 1:2, Genesis 2:1, ..."
function extractChapters(reading) {
  const seen = new Set();
  reading.split(',').forEach(ref => {
    const match = ref.trim().match(/Genesis\s+(\d+):/i);
    if (match) seen.add(parseInt(match[1], 10));
  });
  return [...seen].sort((a, b) => a - b);
}

const csv = fs.readFileSync(CSV_PATH, 'utf-8');
const records = parse(csv, { columns: true, skip_empty_lines: true });

let updated = 0;
for (const record of records) {
  const chapters = extractChapters(record.Reading || '');
  const images = chapters.map(ch => CHAPTER_IMAGE_MAP[ch]).filter(Boolean);

  if (images.length > 0) {
    record.Images = JSON.stringify(images);
    updated++;
  }
}

const out = stringify(records, { header: true });
fs.writeFileSync(CSV_PATH, out, 'utf-8');
console.log(`Done. Updated ${updated} rows.`);
