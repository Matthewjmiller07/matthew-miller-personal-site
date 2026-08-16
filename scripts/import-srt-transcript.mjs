#!/usr/bin/env node
/**
 * Import a transcript that was produced outside the sync (Sofer's UI, a hand edit,
 * whatever) and wire it into the site.
 *
 *   node scripts/import-srt-transcript.mjs shiur-12 /path/to/shiur12.srt
 *   node scripts/import-srt-transcript.mjs shiur-12 a.srt shiur-13 b.srt shiur-14 c.srt
 *
 * For each pair it:
 *   1. writes src/data/scp-<id>-transcript.json  (the paragraphs the page renders)
 *   2. writes public/scp/<id>/transcript.srt     (the downloadable file)
 *   3. points scp.json's transcriptFile at it
 *   4. marks the shiur done in the job ledger so the sync never re-transcribes it
 *
 * SRT cues are line-wrapped every couple of seconds; the page expects ~30s
 * paragraphs, so cues are merged the same way groupWordsIntoParagraphs does.
 */
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { readJobLedger, writeJobLedger } from './sync-scp-drive.js';

const DATA_FILE = './src/data/scp.json';
const CHUNK_SECONDS = 30;

function srtTimeToSeconds(stamp) {
  const m = stamp.trim().match(/^(\d+):(\d+):(\d+)[,.](\d+)$/);
  if (!m) throw new Error(`Unparseable SRT timestamp: "${stamp}"`);
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
}

function secondsToTimestamp(total) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function parseSrt(raw) {
  const cues = [];
  // Tolerate CRLF and stray blank lines between cues.
  const blocks = raw.replace(/\r\n/g, '\n').split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) continue;

    const timingIndex = lines.findIndex(l => l.includes('-->'));
    if (timingIndex === -1) continue;

    const [start] = lines[timingIndex].split('-->');
    const text = lines
      .slice(timingIndex + 1)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;

    cues.push({ start: srtTimeToSeconds(start), text });
  }
  return cues;
}

function cuesToParagraphs(cues) {
  const paragraphs = [];
  let current = [];
  let chunkStart = cues.length ? cues[0].start : 0;

  for (const cue of cues) {
    if (cue.start - chunkStart >= CHUNK_SECONDS && current.length) {
      paragraphs.push({
        start: secondsToTimestamp(chunkStart),
        startSeconds: Math.floor(chunkStart),
        text: current.join(' ').replace(/\s+/g, ' ').trim(),
      });
      current = [cue.text];
      chunkStart = cue.start;
    } else {
      current.push(cue.text);
    }
  }

  if (current.length) {
    paragraphs.push({
      start: secondsToTimestamp(chunkStart),
      startSeconds: Math.floor(chunkStart),
      text: current.join(' ').replace(/\s+/g, ' ').trim(),
    });
  }
  return paragraphs;
}

async function importOne(shiurId, srtPath, scpData, ledger) {
  const raw = await fs.readFile(srtPath, 'utf8');
  const cues = parseSrt(raw);
  if (!cues.length) throw new Error(`No cues parsed from ${srtPath}`);

  const paragraphs = cuesToParagraphs(cues);
  const lastSeconds = cues[cues.length - 1].start;

  const transcriptPath = `./src/data/scp-${shiurId}-transcript.json`;
  await fs.writeFile(transcriptPath, JSON.stringify(paragraphs, null, 2));

  const srtDest = `./public/scp/${shiurId}/transcript.srt`;
  await fs.mkdir(path.dirname(srtDest), { recursive: true });
  await fs.writeFile(srtDest, raw.replace(/\r\n/g, '\n'));

  const shiur = scpData.shiurim.find(s => s.id === shiurId);
  if (shiur) {
    shiur.transcriptFile = `/scp/${shiurId}/transcript.srt`;
  } else {
    console.log(`  ⚠️  ${shiurId} is not in scp.json — transcript written, catalog not updated`);
  }

  // Mark it done so the scheduled sync never submits this shiur again.
  ledger[shiurId] = {
    ...(ledger[shiurId] || {}),
    status: 'IMPORTED',
    noResubmit: true,
    note: `transcript imported from ${path.basename(srtPath)}`,
    importedAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
  };

  console.log(
    `  ✅ ${shiurId}: ${cues.length} cues → ${paragraphs.length} paragraphs ` +
    `(runs to ${secondsToTimestamp(lastSeconds)})`
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args.length % 2 !== 0) {
    console.error('Usage: node scripts/import-srt-transcript.mjs <shiur-id> <file.srt> [<shiur-id> <file.srt> ...]');
    process.exit(1);
  }

  const scpData = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  const ledger = await readJobLedger();

  for (let i = 0; i < args.length; i += 2) {
    const shiurId = args[i];
    const srtPath = args[i + 1];
    if (!fssync.existsSync(srtPath)) throw new Error(`No such file: ${srtPath}`);
    await importOne(shiurId, srtPath, scpData, ledger);
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(scpData, null, 2));
  await writeJobLedger(ledger);
  console.log('\n📝 scp.json and the job ledger updated.');
}

main().catch(err => {
  console.error(`❌ Import failed: ${err.message}`);
  process.exit(1);
});
