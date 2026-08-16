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
let scpBackup;
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

/**
 * Every transcript/SRT path that existed before the suite ran. These are real
 * committed files, so cleanup must never touch them — only files a test created.
 */
let preexistingFiles;

function snapshotExistingFiles() {
  const data = JSON.parse(fs.readFileSync(SCP_JSON, 'utf8'));
  preexistingFiles = new Set();
  for (const s of data.shiurim) {
    for (const p of [
      path.join(REPO, `src/data/scp-${s.id}-transcript.json`),
      path.join(REPO, `public/scp/${s.id}/transcript.srt`),
    ]) {
      if (fs.existsSync(p)) preexistingFiles.add(p);
    }
  }
}

const FIXTURE_PREFIX = 'shiur-900';

/**
 * Append synthetic shiurim to scp.json that reuse a real audio file but have no
 * transcript, so the "needs transcribing" path can be exercised without depending on
 * the repo happening to contain an untranscribed shiur — it no longer does. Removed
 * by cleanup(), which also restores scp.json wholesale.
 */
function withFixtureShiurim(count = 1) {
  const data = JSON.parse(fs.readFileSync(SCP_JSON, 'utf8'));
  const donor = data.shiurim.find(
    s => s.audioFile && fs.existsSync(path.join(REPO, 'public', s.audioFile))
  );
  assert.ok(donor, 'no shiur with audio on disk to build a fixture from');

  const made = [];
  for (let i = 1; i <= count; i++) {
    const id = `${FIXTURE_PREFIX}${i}-test-fixture`;
    data.shiurim.push({ id, number: 9000 + i, title: 'test fixture', audioFile: donor.audioFile });
    made.push({ id, audioFile: donor.audioFile });
  }
  fs.writeFileSync(SCP_JSON, JSON.stringify(data, null, 2));
  return made;
}

function fixtureIds() {
  return [1, 2, 3, 4].map(i => `${FIXTURE_PREFIX}${i}-test-fixture`);
}

/** Remove only files a test created, and restore the real ledger and catalog. */
function cleanup() {
  const data = JSON.parse(fs.readFileSync(SCP_JSON, 'utf8'));
  const ids = data.shiurim.map(s => s.id).concat(fixtureIds());
  for (const id of ids) {
    for (const p of [
      path.join(REPO, `src/data/scp-${id}-transcript.json`),
      path.join(REPO, `public/scp/${id}/transcript.srt`),
    ]) {
      if (!preexistingFiles.has(p)) fs.rmSync(p, { force: true });
    }
  }
  for (const id of fixtureIds()) {
    fs.rmSync(path.join(REPO, `public/scp/${id}`), { recursive: true, force: true });
  }
  fs.writeFileSync(LEDGER, ledgerBackup);
  fs.writeFileSync(SCP_JSON, scpBackup);
}

// The script logs a line per shiur. Left alone, that volume of output corrupts the
// test runner's IPC stream, so capture it instead — and keep it available for debugging.
const logged = [];
const realLog = console.log;
const realError = console.error;

before(async () => {
  ledgerBackup = fs.readFileSync(LEDGER, 'utf8');
  scpBackup = fs.readFileSync(SCP_JSON, 'utf8');
  snapshotExistingFiles();
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
  fs.writeFileSync(SCP_JSON, scpBackup);
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
  // Build the condition explicitly rather than relying on repo state: a shiur with
  // audio, a COMPLETED job on record, and no transcript yet. Once every real shiur
  // has a transcript this scenario stops occurring naturally, but the retrieval path
  // still has to work for the next one.
  const [{ id: fixtureId, audioFile }] = withFixtureShiurim(1);
  fs.writeFileSync(
    LEDGER,
    JSON.stringify({ [fixtureId]: { transcriptionId: 'paid-job', status: 'COMPLETED', audioFile } }, null, 2)
  );

  await transcribeNewShiurim();

  assert.equal(calls.submit, 0, 'paid again for a job already on record');
  assert.equal(calls.retrieve, 1, 'did not retrieve the completed job');
  assert.ok(
    fs.existsSync(path.join(REPO, `src/data/scp-${fixtureId}-transcript.json`)),
    'transcript was not written for the site to read'
  );
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
  const made = withFixtureShiurim(3); // three candidates, cap is 2
  assert.equal(candidateShiurim().filter(id => id.startsWith(FIXTURE_PREFIX)).length, 3);

  await transcribeNewShiurim();

  assert.equal(calls.submit, 2, 'the 2-jobs-per-run cap did not hold');

  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  assert.equal(
    Object.keys(ledger).length, 2,
    'submitted jobs were not recorded in the ledger — a crash here would re-charge'
  );
  for (const id of Object.keys(ledger)) {
    assert.ok(ledger[id].transcriptionId, `${id} recorded without a transcription id`);
    assert.ok(made.some(m => m.id === id), `unexpected shiur ${id} was submitted`);
  }
  cleanup();
});

test('an existing transcript short-circuits before any network call', async () => {
  fs.writeFileSync(LEDGER, '{}\n');
  const [{ id }] = withFixtureShiurim(1);
  fs.writeFileSync(path.join(REPO, `src/data/scp-${id}-transcript.json`), '[]');

  await transcribeNewShiurim();

  assert.equal(calls.submit, 0, 'submitted despite a transcript already being on disk');
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  assert.ok(!ledger[id], `${id} was submitted despite already having a transcript`);
  cleanup();
});
