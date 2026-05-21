#!/usr/bin/env node
/**
 * Sync SCP files from Google Drive
 * Expects folder structure: /shiur-1/audio.mp3, /shiur-1/notes.pdf, etc.
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_SCP_FOLDER_ID;
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;  // For public folders
const SOFER_AI_API_KEY = process.env.SOFER_AI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OUTPUT_DIR = './public/scp';
const DATA_FILE = './src/data/scp.json';

if (!DRIVE_FOLDER_ID) {
  console.log('⚠️  GOOGLE_DRIVE_SCP_FOLDER_ID not set. Skipping Drive sync.');
  process.exit(0);
}

async function authenticate() {
  // Option 1: API Key for public folders (simplest)
  if (API_KEY) {
    return null;  // API key doesn't need auth object
  }

  // Option 2: Service account
  let credentials;
  if (SERVICE_ACCOUNT_KEY) {
    credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    credentials = JSON.parse(await fs.readFile(credsPath, 'utf8'));
  } else {
    console.error('❌ No credentials found. Set one of:');
    console.error('   - GOOGLE_DRIVE_API_KEY (for public folders)');
    console.error('   - GOOGLE_SERVICE_ACCOUNT_KEY');
    console.error('   - GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return auth;
}

async function downloadFile(drive, fileId, destPath, auth) {
  let response;

  if (!auth && API_KEY) {
    // Use direct download URL with API key for public files
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    const dest = fssync.createWriteStream(destPath);
    await pipeline(res.body, dest);
  } else {
    // Use authenticated API
    response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    const dest = fssync.createWriteStream(destPath);
    await pipeline(response.data, dest);
  }
}

async function listFolderContents(drive, folderId, auth) {
  const params = {
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size)',
  };

  // If using API key, add it to params
  if (!auth && API_KEY) {
    params.key = API_KEY;
  }

  const res = await drive.files.list(params);
  return res.data.files || [];
}

async function syncShiurFolder(drive, folderId, shiurNum, auth) {
  const shiurDir = path.join(OUTPUT_DIR, `shiur-${shiurNum}`);
  const files = await listFolderContents(drive, folderId, auth);

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    let destName;
    let isGoogleDoc = false;

    // Check for Google Doc (mimeType)
    if (file.mimeType === 'application/vnd.google-apps.document') {
      destName = 'notes.pdf';
      isGoogleDoc = true;
    }
    // Map file extensions to expected names
    else if (ext === '.mp3') destName = 'audio.mp3';
    else if (ext === '.m4a') destName = 'audio.m4a';  // Keep m4a as-is
    else if (ext === '.pdf') destName = 'notes.pdf';
    else if (ext === '.srt') destName = 'transcript.srt';
    else if (ext === '.doc' || ext === '.docx') destName = 'notes.docx';
    else continue; // Skip unknown files

    const destPath = path.join(shiurDir, destName);

    // Check if file needs updating (skip if exists and size matches)
    try {
      const stats = await fs.stat(destPath);
      if (stats.size === parseInt(file.size || 0)) {
        console.log(`  ⏭️  ${destName} (up to date)`);
        continue;
      }
    } catch {
      // File doesn't exist, will download
    }

    console.log(`  ⬇️  Downloading ${destName}...`);
    if (isGoogleDoc) {
      await downloadGoogleDoc(drive, file.id, destPath, auth);
    } else {
      await downloadFile(drive, file.id, destPath, auth);
    }
  }
}

async function downloadGoogleDoc(drive, fileId, destPath, auth) {
  // Export Google Doc as PDF
  let response;

  if (!auth && API_KEY) {
    // Use export URL with API key
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application%2Fpdf&key=${API_KEY}`;
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    const dest = fssync.createWriteStream(destPath);
    await pipeline(res.body, dest);
  } else {
    // Use authenticated API
    const res = await drive.files.export(
      { fileId, mimeType: 'application/pdf' },
      { responseType: 'stream' }
    );

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    const dest = fssync.createWriteStream(destPath);
    await pipeline(res.data, dest);
  }
}

async function findAllShiurFolders(drive, folderId, auth, depth = 0) {
  // Recursively find all folders matching shiur pattern
  const results = [];
  const files = await listFolderContents(drive, folderId, auth);
  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');

  for (const folder of folders) {
    // Check if this is a shiur folder
    const match = folder.name.match(/shiur[\s#:-]*(\d+)/i);
    if (match) {
      results.push({ folder, shiurNum: match[1] });
    } else if (depth < 3) {
      // Recurse into subfolders (max 3 levels deep)
      const subResults = await findAllShiurFolders(drive, folder.id, auth, depth + 1);
      results.push(...subResults);
    }
  }

  return results;
}

async function loadExistingScpData() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    // Return default structure if file doesn't exist
    return {
      series: {
        title: "SCP — Semichas Chaver Program",
        subtitle: "Yoreh Deah with Rabbi Leibtag",
        instructor: "Rabbi Leibtag",
        description: "Shiurim covering Yoreh Deah",
        imageUrl: "/scp/cover.jpg",
        feedUrl: "https://theothermatthewmiller.com/scp/feed.xml",
        siteUrl: "https://theothermatthewmiller.com/scp"
      },
      shiurim: []
    };
  }
}

async function getAudioDuration(audioPath) {
  try {
    // Try ffprobe first
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);

    const { stdout } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { timeout: 10000 }
    );
    const seconds = parseFloat(stdout.trim());
    if (!isNaN(seconds)) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return {
        duration: `${mins}:${secs.toString().padStart(2, '0')}`,
        durationSeconds: Math.floor(seconds)
      };
    }
  } catch {
    // ffprobe not available or failed
  }
  return null;
}

function formatDateForShiur(date) {
  return date.toISOString().split('T')[0];
}

async function updateScpData(shiurFolders) {
  const data = await loadExistingScpData();
  const existingIds = new Set(data.shiurim.map(s => s.id));
  let added = 0;
  let updated = 0;

  for (const { shiurNum } of shiurFolders) {
    const shiurId = `shiur-${shiurNum}`;
    const shiurDir = path.join(OUTPUT_DIR, shiurId);

    // Check what files exist locally
    let audioFile = null;
    let notesFile = null;
    let transcriptFile = null;

    try {
      const files = await fs.readdir(shiurDir);
      for (const file of files) {
        const lower = file.toLowerCase();
        if (lower.startsWith('audio')) {
          audioFile = `/scp/${shiurId}/${file}`;
        } else if (lower === 'notes.pdf') {
          notesFile = `/scp/${shiurId}/${file}`;
        } else if (lower === 'transcript.srt') {
          transcriptFile = `/scp/${shiurId}/${file}`;
        }
      }
    } catch {
      // Directory doesn't exist yet
      continue;
    }

    // Skip if no audio file (required minimum)
    if (!audioFile) continue;

    // Get audio duration if available
    let durationInfo = null;
    const localAudioPath = path.join(shiurDir, path.basename(audioFile));
    if (fssync.existsSync(localAudioPath)) {
      durationInfo = await getAudioDuration(localAudioPath);
    }

    if (existingIds.has(shiurId)) {
      // Update existing shiur with any new files found
      const existing = data.shiurim.find(s => s.id === shiurId);
      let changed = false;

      if (audioFile && !existing.audioFile) {
        existing.audioFile = audioFile;
        changed = true;
      }
      if (notesFile && !existing.notesFile) {
        existing.notesFile = notesFile;
        changed = true;
      }
      if (transcriptFile && !existing.transcriptFile) {
        existing.transcriptFile = transcriptFile;
        changed = true;
      }
      if (durationInfo && !existing.duration) {
        existing.duration = durationInfo.duration;
        existing.durationSeconds = durationInfo.durationSeconds;
        changed = true;
      }

      if (changed) updated++;
    } else {
      // Create new shiur entry
      const today = new Date();
      data.shiurim.push({
        id: shiurId,
        number: parseInt(shiurNum, 10),
        title: `Shiur ${shiurNum}`,
        hebrewTitle: "",
        date: formatDateForShiur(today),
        description: "",
        audioFile: audioFile,
        notesFile: notesFile || undefined,
        transcriptFile: transcriptFile || undefined,
        duration: durationInfo?.duration || "0:00",
        durationSeconds: durationInfo?.durationSeconds || 0,
        topics: [],
        jokes: [],
        disgracefulFoods: []
      });
      added++;
    }
  }

  // Sort shiurim by number
  data.shiurim.sort((a, b) => a.number - b.number);

  // Write updated data file
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));

  return { added, updated, total: data.shiurim.length };
}

// ─── Sofer AI Transcription ───────────────────────────────────────────────

function secondsToTimestamp(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function secondsToSrtTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function groupWordsIntoParagraphs(words, chunkSeconds = 30) {
  if (!words || words.length === 0) return [];

  const paragraphs = [];
  let currentWords = [];
  let chunkStart = words[0].start;

  for (const word of words) {
    if (word.start - chunkStart >= chunkSeconds && currentWords.length > 0) {
      const text = currentWords.map(w => w.word).join(' ').trim();
      paragraphs.push({ start: secondsToTimestamp(chunkStart), startSeconds: Math.floor(chunkStart), text });
      currentWords = [word];
      chunkStart = word.start;
    } else {
      currentWords.push(word);
    }
  }

  if (currentWords.length > 0) {
    const text = currentWords.map(w => w.word).join(' ').trim();
    paragraphs.push({ start: secondsToTimestamp(chunkStart), startSeconds: Math.floor(chunkStart), text });
  }

  return paragraphs;
}

function paragraphsToSrt(paragraphs) {
  return paragraphs.map((para, i) => {
    const endSec = i + 1 < paragraphs.length
      ? paragraphs[i + 1].startSeconds - 0.001
      : para.startSeconds + 30;
    return `${i + 1}\n${secondsToSrtTime(para.startSeconds)} --> ${secondsToSrtTime(endSec)}\n${para.text}`;
  }).join('\n\n') + '\n';
}

async function transcribeWithSoferAI(audioPath, shiurId) {
  if (!SOFER_AI_API_KEY) {
    console.log('  ⏭️  SOFER_AI_API_KEY not set — skipping auto-transcription');
    return;
  }

  // Don't block Netlify builds with long-running transcription (GitHub Actions is fine — it commits results back)
  if (process.env.NETLIFY) {
    console.log(`  ⏭️  Netlify build detected — skipping transcription for ${shiurId} (handled by GitHub Actions)`);
    return;
  }

  const transcriptJsonPath = `./src/data/scp-${shiurId}-transcript.json`;
  try {
    await fs.access(transcriptJsonPath);
    console.log(`  ⏭️  Transcript already exists for ${shiurId}`);
    return;
  } catch {
    // File doesn't exist — proceed with transcription
  }

  console.log(`  🎙️  Transcribing ${shiurId} with Sofer AI...`);

  const audioBuffer = await fs.readFile(audioPath);
  const audioBase64 = audioBuffer.toString('base64');

  const submitRes = await fetch('https://api.sofer.ai/v1/transcriptions/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SOFER_AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_file: audioBase64,
      info: {
        model: 'v1',
        primary_language: 'en',
        title: shiurId,
        num_speakers: 1,
      },
    }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Sofer AI submission failed (${submitRes.status}): ${err}`);
  }

  const submitData = await submitRes.json();
  const transcriptionId = typeof submitData === 'string'
    ? submitData
    : (submitData.id || submitData._id || submitData.job_id || submitData.transcription_id);
  if (!transcriptionId) {
    throw new Error(`Sofer AI did not return a transcription ID. Response: ${JSON.stringify(submitData)}`);
  }
  console.log(`  ⏳ Job submitted: ${transcriptionId} — polling for completion...`);

  let status = 'PENDING';
  let attempts = 0;
  const maxAttempts = 180; // 15 min max (5s intervals)

  while (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(status) && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 5000));
    attempts++;

    const statusRes = await fetch(
      `https://api.sofer.ai/v1/transcriptions/${transcriptionId}/status`,
      { headers: { 'Authorization': `Bearer ${SOFER_AI_API_KEY}` } }
    );

    if (statusRes.ok) {
      const data = await statusRes.json();
      status = data.status;
      if (attempts % 12 === 0) console.log(`  ⏳ Still ${status}... (${attempts * 5}s elapsed)`);
    }
  }

  if (status !== 'COMPLETED') {
    throw new Error(`Transcription ended with status ${status} after ${attempts * 5}s`);
  }

  const fullRes = await fetch(`https://api.sofer.ai/v1/transcriptions/${transcriptionId}`, {
    headers: { 'Authorization': `Bearer ${SOFER_AI_API_KEY}` },
  });

  if (!fullRes.ok) {
    throw new Error(`Failed to retrieve transcript (${fullRes.status})`);
  }

  const fullData = await fullRes.json();
  const words = fullData.timestamps || [];
  const paragraphs = groupWordsIntoParagraphs(words, 30);

  // Save JSON transcript
  await fs.mkdir('./src/data', { recursive: true });
  await fs.writeFile(transcriptJsonPath, JSON.stringify(paragraphs, null, 2));
  console.log(`  ✅ Transcript JSON saved: ${transcriptJsonPath}`);

  // Save SRT file
  const srtPath = `./public/scp/${shiurId}/transcript.srt`;
  await fs.writeFile(srtPath, paragraphsToSrt(paragraphs));
  console.log(`  ✅ SRT saved: ${srtPath}`);

  // Extract jokes and disgraced foods via OpenAI
  await analyzeTranscriptWithAI(paragraphs, shiurId);
}

function timestampToSeconds(ts) {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

async function analyzeTranscriptWithAI(paragraphs, shiurId) {
  if (!OPENAI_API_KEY) {
    console.log('  ⏭️  OPENAI_API_KEY not set — skipping AI analysis');
    return;
  }

  console.log(`  🤖 Analyzing transcript for jokes and disgraced foods...`);

  const transcriptText = paragraphs
    .map(p => `[${secondsToTimestamp(p.startSeconds)}] ${p.text}`)
    .join('\n');

  const prompt = `You are analyzing a Torah class transcript for two specific recurring bits:

1. JOKES: The rabbi tells jokes or makes humorous quips. Extract any jokes, puns, or funny remarks.
2. DISGRACED FOODS: The rabbi singles out specific foods as unworthy, embarrassing, or otherwise "disgraced." This is a recurring gag where certain foods are called out by name.

For each item found, provide the timestamp (HH:MM:SS format from the transcript), the text/food name, and brief context.

Return ONLY valid JSON in this exact format:
{
  "jokes": [
    { "timestamp": "HH:MM:SS", "text": "the joke text" }
  ],
  "disgracefulFoods": [
    { "food": "food name", "timestamp": "HH:MM:SS", "context": "brief quote or context" }
  ]
}

If none are found, return empty arrays. Do not include anything outside the JSON object.

TRANSCRIPT:
${transcriptText}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ❌ OpenAI API error (${res.status}): ${err}`);
    return;
  }

  const result = await res.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    console.error('  ❌ No content in OpenAI response');
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('  ❌ Failed to parse OpenAI JSON response:', e.message);
    return;
  }

  const jokes = (parsed.jokes || []).map(j => ({
    timestamp: j.timestamp,
    timestampSeconds: timestampToSeconds(j.timestamp),
    text: j.text,
  }));
  const disgracefulFoods = (parsed.disgracefulFoods || []).map(f => ({
    food: f.food,
    timestamp: f.timestamp,
    timestampSeconds: timestampToSeconds(f.timestamp),
    context: f.context,
  }));

  console.log(`  🎭 Found ${jokes.length} joke(s), ${disgracefulFoods.length} disgraced food(s)`);

  // Update scp.json
  const data = await loadExistingScpData();
  const shiur = data.shiurim.find(s => s.id === shiurId);
  if (shiur) {
    shiur.jokes = jokes;
    shiur.disgracefulFoods = disgracefulFoods;
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`  ✅ scp.json updated with jokes/foods for ${shiurId}`);
  }
}

async function transcribeNewShiurim() {
  if (!SOFER_AI_API_KEY) {
    console.log('  ⏭️  SOFER_AI_API_KEY not set — skipping transcription');
    return;
  }

  const data = await loadExistingScpData();

  for (const shiur of data.shiurim) {
    if (!shiur.audioFile) continue;

    const audioPath = path.join('./public', shiur.audioFile);
    if (!fssync.existsSync(audioPath)) continue;

    await transcribeWithSoferAI(audioPath, shiur.id).catch(err => {
      console.error(`  ❌ Transcription failed for ${shiur.id}: ${err.message}`);
    });
  }
}

async function analyzeUntranscribed() {
  if (!OPENAI_API_KEY) {
    console.log('  ⏭️  OPENAI_API_KEY not set — skipping AI analysis');
    return;
  }

  const data = await loadExistingScpData();
  for (const shiur of data.shiurim) {
    // Only analyze shiurim that have a transcript but no jokes/foods yet
    const hasTranscript = fssync.existsSync(`./src/data/scp-${shiur.id}-transcript.json`);
    const alreadyAnalyzed = shiur.jokes?.length > 0 || shiur.disgracefulFoods?.length > 0;
    if (!hasTranscript || alreadyAnalyzed) continue;

    console.log(`  📖 Loading transcript for ${shiur.id}...`);
    try {
      const raw = await fs.readFile(`./src/data/scp-${shiur.id}-transcript.json`, 'utf-8');
      const paragraphs = JSON.parse(raw);
      await analyzeTranscriptWithAI(paragraphs, shiur.id);
    } catch (err) {
      console.error(`  ❌ Analysis failed for ${shiur.id}: ${err.message}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎧 Syncing SCP files from Google Drive...');

  const auth = await authenticate();

  // Create drive client - auth can be null for API key mode
  const drive = google.drive({ version: 'v3', auth: auth || undefined });

  // Recursively find all shiur folders (handles nested structure)
  const shiurFolders = await findAllShiurFolders(drive, DRIVE_FOLDER_ID, auth);

  if (shiurFolders.length === 0) {
    console.log('⚠️  No shiur folders found in Drive. Expected folders like "Shiur #1", "shiur-2", etc.');
    console.log('   Searched in folder ID:', DRIVE_FOLDER_ID);
    process.exit(0);
  }

  console.log(`Found ${shiurFolders.length} shiur folder(s)`);

  for (const { folder, shiurNum } of shiurFolders) {
    console.log(`📁 ${folder.name} (shiur-${shiurNum}):`);
    await syncShiurFolder(drive, folder.id, shiurNum, auth);
  }

  // Update scp.json with new shiurim
  console.log('\n📝 Updating scp.json...');
  const { added, updated, total } = await updateScpData(shiurFolders);
  if (added > 0) console.log(`  ➕ Added ${added} new shiurim`);
  if (updated > 0) console.log(`  🔄 Updated ${updated} existing shiurim`);
  console.log(`  📊 Total: ${total} shiurim in catalog`);

  // Auto-transcribe any shiurim that have audio but no transcript
  console.log('\n🎙️  Checking for untranscribed shiurim...');
  await transcribeNewShiurim();

  // Analyze transcripts that haven't been processed for jokes/foods yet
  console.log('\n🤖 Checking for unanalyzed transcripts...');
  await analyzeUntranscribed();

  console.log('\n✅ SCP sync complete!');
}

main().catch(err => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
