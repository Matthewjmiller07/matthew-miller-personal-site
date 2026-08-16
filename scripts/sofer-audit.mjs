#!/usr/bin/env node
/**
 * Audit the Sofer AI account against this repo.
 *
 * The scheduled sync used to re-submit a shiur every run when a job timed out or the
 * balance was empty, so the account accumulated many transcriptions with the same title.
 * This lists them, groups them by shiur, shows which ones were actually billed, and can
 * pull down transcripts already paid for.
 *
 *   SOFER_AI_API_KEY=... node scripts/sofer-audit.mjs                  # report only (read-only)
 *   SOFER_AI_API_KEY=... node scripts/sofer-audit.mjs --pull           # + download completed transcripts
 *   SOFER_AI_API_KEY=... node scripts/sofer-audit.mjs --write-ledger   # + pin job IDs so the sync never re-pays
 *
 * --pull implies --write-ledger. Neither ever submits a new job, so this can never
 * cost money.
 */
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import {
  groupWordsIntoParagraphs,
  paragraphsToSrt,
  readJobLedger,
  writeJobLedger,
  JOB_LEDGER_FILE,
} from './sync-scp-drive.js';

const API = 'https://api.sofer.ai/v1';
const KEY = process.env.SOFER_AI_API_KEY;
const PULL = process.argv.includes('--pull');
const WRITE_LEDGER = PULL || process.argv.includes('--write-ledger');

if (!KEY) {
  console.error('❌ SOFER_AI_API_KEY is not set.');
  console.error('   SOFER_AI_API_KEY=sek_... node scripts/sofer-audit.mjs');
  process.exit(1);
}

const auth = { Authorization: `Bearer ${KEY}` };

async function get(pathname) {
  const res = await fetch(`${API}${pathname}`, { headers: auth });
  if (!res.ok) throw new Error(`GET ${pathname} → ${res.status} ${await res.text()}`);
  return res.json();
}

/** Sofer has returned both a bare array and a wrapped object here; accept either. */
function asList(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['transcriptions', 'items', 'data', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function jobId(t) {
  return t.id || t._id || t.transcription_id || t.job_id;
}

/** Titles were submitted as the shiur id ("shiur-12"); recover it however it was written. */
function shiurIdFromTitle(title) {
  const m = String(title || '').match(/shiur[\s#:_-]*(\d+)/i);
  return m ? `shiur-${m[1]}` : null;
}

const BILLED = new Set(['COMPLETED', 'PROCESSING']);

async function main() {
  console.log('🔍 Auditing Sofer AI account…\n');

  try {
    const balance = await get('/balance/');
    console.log(`💰 Balance: ${JSON.stringify(balance)}\n`);
  } catch (err) {
    console.log(`⚠️  Could not read balance: ${err.message}\n`);
  }

  const all = asList(await get('/transcriptions/'));
  console.log(`📋 ${all.length} transcription(s) on the account\n`);

  // Group by shiur so duplicates are obvious.
  const byShiur = new Map();
  const unmatched = [];
  for (const t of all) {
    const id = shiurIdFromTitle(t.title);
    if (!id) {
      unmatched.push(t);
      continue;
    }
    if (!byShiur.has(id)) byShiur.set(id, []);
    byShiur.get(id).push(t);
  }

  const sorted = [...byShiur.entries()].sort(
    (a, b) => parseInt(a[0].split('-')[1], 10) - parseInt(b[0].split('-')[1], 10)
  );

  let totalDuplicates = 0;
  let totalBilled = 0;

  console.log('shiur      jobs  billed  statuses');
  console.log('─────────────────────────────────────────────────────────────');
  for (const [shiurId, jobs] of sorted) {
    const counts = {};
    for (const j of jobs) counts[j.status] = (counts[j.status] || 0) + 1;
    const billed = jobs.filter(j => BILLED.has(j.status)).length;
    totalBilled += billed;
    if (jobs.length > 1) totalDuplicates += jobs.length - 1;

    const summary = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `${s}×${n}`)
      .join(', ');
    const flag = billed > 1 ? '  ← PAID MORE THAN ONCE' : '';
    console.log(`${shiurId.padEnd(10)} ${String(jobs.length).padStart(4)}  ${String(billed).padStart(6)}  ${summary}${flag}`);
  }

  console.log('─────────────────────────────────────────────────────────────');
  console.log(`${sorted.length} shiurim, ${totalDuplicates} duplicate submission(s), ${totalBilled} billable job(s)`);
  if (unmatched.length) {
    console.log(`\n${unmatched.length} transcription(s) with no shiur in the title:`);
    for (const t of unmatched.slice(0, 20)) {
      console.log(`  ${jobId(t)}  ${t.status.padEnd(20)} ${t.title ?? '(untitled)'}`);
    }
    if (unmatched.length > 20) console.log(`  … and ${unmatched.length - 20} more`);
  }

  if (!WRITE_LEDGER) {
    console.log(`\nRe-run with --write-ledger to pin these job IDs into ${JOB_LEDGER_FILE},`);
    console.log('or --pull to also download the transcripts already paid for.');
    return;
  }

  // Pin one job per shiur: prefer a COMPLETED one, else the most advanced status seen.
  const RANK = { COMPLETED: 5, PROCESSING: 4, PENDING: 3, RECEIVED: 2 };
  const ledger = await readJobLedger();
  let pinned = 0;
  let pulled = 0;

  for (const [shiurId, jobs] of sorted) {
    const best = [...jobs].sort((a, b) => (RANK[b.status] || 0) - (RANK[a.status] || 0))[0];
    // Only the *billed* duplicates are worth keeping — those are the ones to raise with
    // Sofer. A long list of dead INSUFFICIENT_FUNDS ids is just noise in the ledger.
    const billedDuplicates = jobs
      .filter(j => BILLED.has(j.status) && jobId(j) !== jobId(best))
      .map(jobId);

    ledger[shiurId] = {
      ...(ledger[shiurId] || {}),
      transcriptionId: jobId(best),
      status: best.status,
      noResubmit: true,
      note: `pinned by sofer-audit; ${jobs.length} job(s) existed on the account`,
      duplicateCount: jobs.length - 1,
      ...(billedDuplicates.length ? { billedDuplicateJobIds: billedDuplicates } : {}),
      lastCheckedAt: new Date().toISOString(),
    };
    pinned++;

    if (!PULL || best.status !== 'COMPLETED') continue;

    const transcriptPath = `./src/data/scp-${shiurId}-transcript.json`;
    if (fssync.existsSync(transcriptPath)) continue;

    try {
      const full = await get(`/transcriptions/${jobId(best)}`);
      const paragraphs = groupWordsIntoParagraphs(full.timestamps || [], 30);
      if (!paragraphs.length) {
        console.log(`  ⚠️  ${shiurId}: job ${jobId(best)} returned no timestamps`);
        continue;
      }
      await fs.mkdir('./src/data', { recursive: true });
      await fs.writeFile(transcriptPath, JSON.stringify(paragraphs, null, 2));

      // Never clobber an SRT that is already there — it may be hand-made or from Drive.
      const srtPath = `./public/scp/${shiurId}/transcript.srt`;
      if (!fssync.existsSync(srtPath) || fssync.statSync(srtPath).size === 0) {
        await fs.mkdir(path.dirname(srtPath), { recursive: true });
        await fs.writeFile(srtPath, paragraphsToSrt(paragraphs));
      } else {
        console.log(`  ℹ️  ${shiurId}: kept the existing transcript.srt`);
      }

      console.log(`  ✅ ${shiurId}: pulled ${paragraphs.length} paragraphs (already paid for)`);
      pulled++;
    } catch (err) {
      console.log(`  ❌ ${shiurId}: could not retrieve — ${err.message}`);
    }
  }

  await writeJobLedger(ledger);
  console.log(`\n📝 Pinned ${pinned} shiur(im) in ${JOB_LEDGER_FILE}`);
  if (PULL) console.log(`📥 Pulled ${pulled} transcript(s) that were already paid for`);
  console.log('   The sync will now collect these jobs and never re-submit them.');
}

main().catch(err => {
  console.error(`❌ Audit failed: ${err.message}`);
  process.exit(1);
});
