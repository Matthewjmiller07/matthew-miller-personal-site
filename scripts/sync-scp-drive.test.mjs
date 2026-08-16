/**
 * Regression tests for the Sofer AI cost guardrails in sync-scp-drive.js.
 *
 * Sofer AI bills per submission and this script runs unattended twice a day, so the
 * invariant under test is simple: never POST /v1/transcriptions/ for a shiur we have
 * already paid for. A silent regression here costs real money (it once cost ~$10),
 * which is why these are pinned down.
 *
 *   npm run test:scp
 */
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = path.join(REPO, 'src/data/scp-transcription-jobs.json');
const SCP_JSON = path.join(REPO, 'src/data/scp.json');

let ledgerBackup;
let transcribeNewShiurim;

/** Shiurim with audio on disk but no transcript — the ones the sync would act on. */
function candidateShiurim() {
  const data = JSON.parse(fs.readFileSync(SCP_JSON, 'utf8'));
  return data.shiurim
    .filter(s => s.audioFile && fs.existsSync(path.join(REPO, 'public', s.audioFile)))
    .filter(s => !fs.existsSync(path.join(REPO, `src/data/scp-${s.id}-transcript.json`)))
    .map(s => s.id);
}

const calls = { submit: 0, status: 0, retrieve: 0 };
let statusToReturn = 'COMPLETED';

function installFakeSofer() {
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.endsWith('/v1/transcriptions/') && opts.method === 'POST') {
      calls.submit++;
      return { ok: true, json: async () => `job-${JSON.parse(opts.body).info.title}` };
    }
    if (u.includes('/status')) {
      calls.status++;
      return { ok: true, json: async () => ({ status: statusToReturn }) };
    }
    calls.retrieve++;
    return { ok: true, json: async () => ({ timestamps: [{ word: 'shalom', start: 0 }] }) };
  };
}

/** Remove transcripts a test caused to be written, and restore the real ledger. */
function cleanup() {
  for (const id of candidateShiurim().concat(JSON.parse(ledgerBackup) && Object.keys(JSON.parse(ledgerBackup)))) {
    fs.rmSync(path.join(REPO, `src/data/scp-${id}-transcript.json`), { force: true });
    fs.rmSync(path.join(REPO, `public/scp/${id}/transcript.srt`), { force: true });
  }
  fs.writeFileSync(LEDGER, ledgerBackup);
}

// The script logs a line per shiur. Left alone, that volume of output corrupts the
// test runner's IPC stream, so capture it instead — and keep it available for debugging.
const logged = [];
const realLog = console.log;
const realError = console.error;

before(async () => {
  ledgerBackup = fs.readFileSync(LEDGER, 'utf8');
  process.env.SOFER_AI_API_KEY = 'test-key';
  process.env.OPENAI_API_KEY = '';
  process.env.SOFER_MAX_NEW_JOBS = '2';
  delete process.env.NETLIFY;
  console.log = (...a) => logged.push(a.join(' '));
  console.error = (...a) => logged.push(a.join(' '));
  installFakeSofer();
  ({ transcribeNewShiurim } = await import('./sync-scp-drive.js'));
});

beforeEach(() => {
  calls.submit = calls.status = calls.retrieve = 0;
  statusToReturn = 'COMPLETED';
  fs.writeFileSync(LEDGER, ledgerBackup);
});

after(() => {
  cleanup();
  console.log = realLog;
  console.error = realError;
});

test('a shiur with a ledger entry is never re-submitted', async () => {
  await transcribeNewShiurim();
  assert.equal(calls.submit, 0, 'submitted a new paid job for an already-recorded shiur');
  cleanup();
});

test('an already-paid-for COMPLETED job is collected for free', async () => {
  const recorded = Object.keys(JSON.parse(ledgerBackup));
  await transcribeNewShiurim();
  assert.equal(calls.submit, 0);
  assert.equal(calls.retrieve, recorded.length, 'did not retrieve every completed job');
  for (const id of recorded) {
    assert.ok(
      fs.existsSync(path.join(REPO, `src/data/scp-${id}-transcript.json`)),
      `${id} transcript was not written for the site to read`
    );
  }
  cleanup();
});

test('an empty balance never triggers a submission', async () => {
  statusToReturn = 'INSUFFICIENT_FUNDS';
  await transcribeNewShiurim();
  assert.equal(calls.submit, 0, 'submitted into an empty balance');
  cleanup();
});

test('noResubmit survives the audio file changing', async () => {
  const tampered = JSON.parse(ledgerBackup);
  for (const entry of Object.values(tampered)) entry.audioBytes = 1;
  fs.writeFileSync(LEDGER, JSON.stringify(tampered, null, 2));
  statusToReturn = 'INSUFFICIENT_FUNDS';
  await transcribeNewShiurim();
  assert.equal(calls.submit, 0, 'a changed audio size re-enabled paid submission');
  cleanup();
});

test('genuinely new shiurim are still transcribed, capped per run', async () => {
  fs.writeFileSync(LEDGER, '{}\n');
  const candidates = candidateShiurim();
  await transcribeNewShiurim();

  const expected = Math.min(2, candidates.length);
  assert.equal(calls.submit, expected, `expected ${expected} submissions under the 2/run cap`);

  if (candidates.length) {
    const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
    assert.ok(
      Object.keys(ledger).length >= expected,
      'submitted jobs were not recorded in the ledger — a crash here would re-charge'
    );
  }
  cleanup();
});

test('an existing transcript short-circuits before any network call', async () => {
  fs.writeFileSync(LEDGER, '{}\n');
  const candidates = candidateShiurim();
  if (!candidates.length) return;

  const id = candidates[0];
  fs.writeFileSync(path.join(REPO, `src/data/scp-${id}-transcript.json`), '[]');
  await transcribeNewShiurim();

  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  assert.ok(!ledger[id], `${id} was submitted despite already having a transcript`);
  cleanup();
});
