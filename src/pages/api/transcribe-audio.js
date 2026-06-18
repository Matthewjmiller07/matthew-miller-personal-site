export const prerender = false;

import { getSheetData, updateSheetData } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

// fal-ai/whisper via the HF router — accepts a URL, fetches audio itself.
const HF_ASR_URL = 'https://router.huggingface.co/fal-ai/fal-ai/whisper';

const AUDIO_SHEET = 'audio-recordings';

async function ensureColumns(spreadsheetId) {
  const rows = await getSheetData(spreadsheetId, `${AUDIO_SHEET}!A1:H1`).catch(() => []);
  if (!rows?.length) return;
  const headers = rows[0];
  let changed = false;
  if (!headers.includes('Transcript')) { headers[6] = 'Transcript'; changed = true; }
  if (!headers.includes('DiarizationJson')) { headers[7] = 'DiarizationJson'; changed = true; }
  if (changed) await updateSheetData(spreadsheetId, `${AUDIO_SHEET}!A1:H1`, [headers]).catch(() => {});
}

async function saveTranscript(date, schedule, filename, transcript, segmentsJson) {
  const spreadsheetId = GOOGLE_SHEETS_CONFIG.spreadsheetId;
  await ensureColumns(spreadsheetId);

  const rows = await getSheetData(spreadsheetId, `${AUDIO_SHEET}!A:H`).catch(() => []);
  if (!rows || rows.length <= 1) return;

  const headers = rows[0];
  const dateIdx = headers.indexOf('Date');
  const schedIdx = headers.indexOf('Schedule');
  const nameIdx = headers.indexOf('Filename');

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][dateIdx] === date && rows[i][schedIdx] === schedule && rows[i][nameIdx] === filename) {
      rows[i][6] = transcript;
      rows[i][7] = segmentsJson;
      await updateSheetData(spreadsheetId, `${AUDIO_SHEET}!A:H`, rows);
      return;
    }
  }
}

// Build speaker-turn segments from whisper chunks (each chunk has a .speaker field when diarized).
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

export async function POST({ request }) {
  const token = import.meta.env.HF_TOKEN || process.env.HF_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'HF_TOKEN not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { url, date, schedule = 'default', filename } = body;
  if (!url) {
    return new Response(JSON.stringify({ error: 'url is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  let transcript, segments;
  try {
    const hfRes = await fetch(HF_ASR_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio_url: url, diarize: true, num_speakers: 2 }),
    });
    if (!hfRes.ok) {
      const err = await hfRes.json().catch(() => ({}));
      throw new Error(err.error || err.detail || `HF returned ${hfRes.status}`);
    }
    const result = await hfRes.json();
    transcript = (result?.text ?? '').trim();
    segments = buildSegments(result?.chunks);
  } catch (err) {
    console.error('Transcription error:', err);
    return new Response(JSON.stringify({ error: `Transcription failed: ${err.message}` }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (date && filename) {
    saveTranscript(date, schedule, filename, transcript, JSON.stringify(segments)).catch((err) =>
      console.error('Failed to save transcript to sheet:', err)
    );
  }

  return new Response(JSON.stringify({ transcript, segments }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
