#!/usr/bin/env node
/**
 * Finds Likutei Peshatim newsletter emails not yet recorded in
 * processed-emails.json, fetches their plaintext body via the `gws` CLI
 * (local OAuth, read-only Gmail scope), and writes each to a scratch file
 * for a `claude -p` invocation to parse into events.json.
 *
 * Bounded to MAX_PER_RUN so a first run (or a long-dead machine) can't try
 * to backfill the entire mailing-list history in one go.
 *
 * Prints one JSON line per new email to stdout: {id, subject, date, textFile}
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const MAX_PER_RUN = 3;
const SUBJECT_QUERY = 'subject:"Likutei Peshatim"';

const repoRoot = process.cwd();
const processedPath = path.join(repoRoot, 'src', 'data', 'likutei-peshatim', 'processed-emails.json');
const scratchDir = path.join(os.tmpdir(), 'likutei-peshatim-fetch');
fs.mkdirSync(scratchDir, { recursive: true });

function gws(args) {
  const out = execFileSync('gws', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(out);
}

function decodeBase64Url(data) {
  return Buffer.from(data, 'base64').toString('utf8');
}

function plaintextOf(payload) {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  for (const part of payload.parts ?? []) {
    if (part.mimeType === 'text/plain' && part.body?.data) return decodeBase64Url(part.body.data);
  }
  // multipart/alternative nested inside multipart/mixed etc.
  for (const part of payload.parts ?? []) {
    const found = plaintextOf(part);
    if (found) return found;
  }
  return null;
}

const processed = JSON.parse(fs.readFileSync(processedPath, 'utf8'));
const processedIds = new Set(processed.map((p) => p.id));

const list = gws([
  'gmail', 'users', 'messages', 'list',
  '--params', JSON.stringify({ userId: 'me', q: SUBJECT_QUERY, maxResults: 10 }),
]);

const candidates = (list.messages ?? [])
  .map((m) => m.id)
  .filter((id) => !processedIds.has(id))
  .reverse() // Gmail returns newest-first; process oldest-first for sane chronological commits
  .slice(-MAX_PER_RUN);

for (const id of candidates) {
  const msg = gws(['gmail', 'users', 'messages', 'get', '--params', JSON.stringify({ userId: 'me', id, format: 'full' })]);
  const subjectHeader = msg.payload.headers?.find((h) => h.name === 'Subject')?.value ?? '';
  const text = plaintextOf(msg.payload) ?? '(no plaintext body found)';
  const dateISO = new Date(Number(msg.internalDate)).toISOString().slice(0, 10);

  const textFile = path.join(scratchDir, `${id}.txt`);
  fs.writeFileSync(textFile, text, 'utf8');

  console.log(JSON.stringify({ id, subject: subjectHeader, date: dateISO, textFile }));
}
