import { getSheetData, updateSheetData } from '../../src/utils/googleSheetsClient.js';

const HF_ASR_URL = 'https://router.huggingface.co/fal-ai/fal-ai/whisper';
const AUDIO_SHEET = 'audio-recordings';
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1rscI-ubLqs-4Zg8lWB5SLIHE0ngIUm74zTP2jQZpFnQ';

async function ensureColumns() {
  const rows = await getSheetData(SPREADSHEET_ID, `${AUDIO_SHEET}!A1:H1`).catch(() => []);
  if (!rows?.length) return;
  const headers = rows[0];
  let changed = false;
  if (!headers.includes('Transcript')) { headers[6] = 'Transcript'; changed = true; }
  if (!headers.includes('DiarizationJson')) { headers[7] = 'DiarizationJson'; changed = true; }
  if (changed) await updateSheetData(SPREADSHEET_ID, `${AUDIO_SHEET}!A1:H1`, [headers]).catch(() => {});
}

async function saveTranscript(date, schedule, filename, transcript, segmentsJson) {
  await ensureColumns();
  const rows = await getSheetData(SPREADSHEET_ID, `${AUDIO_SHEET}!A:H`).catch(() => []);
  if (!rows || rows.length <= 1) return;
  const headers = rows[0];
  const dateIdx = headers.indexOf('Date');
  const schedIdx = headers.indexOf('Schedule');
  const nameIdx = headers.indexOf('Filename');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][dateIdx] === date && rows[i][schedIdx] === schedule && rows[i][nameIdx] === filename) {
      rows[i][6] = transcript;
      rows[i][7] = segmentsJson;
      await updateSheetData(SPREADSHEET_ID, `${AUDIO_SHEET}!A:H`, rows);
      return;
    }
  }
}

function buildSegments(chunks) {
  if (!chunks?.length) return [];
  const segments = [];
  let cur = null;
  for (const chunk of chunks) {
    const speaker = chunk.speaker ?? 'SPEAKER_00';
    if (!cur || cur.speaker !== speaker) {
      cur = { speaker, text: chunk.text.trim(), start: chunk.timestamp?.[0] ?? 0, end: chunk.timestamp?.[1] ?? 0 };
      segments.push(cur);
    } else {
      cur.text += ' ' + chunk.text.trim();
      cur.end = chunk.timestamp?.[1] ?? cur.end;
    }
  }
  return segments;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const token = process.env.HF_TOKEN;
  if (!token) { console.error('HF_TOKEN not configured'); return; }

  let body;
  try { body = await req.json(); } catch { console.error('Invalid JSON'); return; }

  const { url, date, schedule = 'default', filename } = body;
  if (!url) { console.error('url required'); return; }

  try {
    const hfRes = await fetch(HF_ASR_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: url, diarize: true, num_speakers: 2 }),
    });
    if (!hfRes.ok) {
      const err = await hfRes.json().catch(() => ({}));
      throw new Error(err.error || err.detail || `HF returned ${hfRes.status}`);
    }
    const result = await hfRes.json();
    const transcript = (result?.text ?? '').trim();
    const segments = buildSegments(result?.chunks);
    if (date && filename) {
      await saveTranscript(date, schedule, filename, transcript, JSON.stringify(segments));
    }
    console.log(`Transcription complete: ${filename}`);
  } catch (err) {
    console.error('Transcription error:', err);
  }
};
