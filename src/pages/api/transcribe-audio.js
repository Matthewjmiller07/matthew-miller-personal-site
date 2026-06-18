export const prerender = false;

import { getSheetData, updateSheetData } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

// fal-ai/whisper via the HF router — accepts a URL, fetches audio itself.
// This avoids binary/content-type issues with hf-inference serverless.
const HF_ASR_URL = 'https://router.huggingface.co/fal-ai/fal-ai/whisper';

const AUDIO_SHEET = 'audio-recordings';
const TRANSCRIPT_COL = 'Transcript'; // column G

// Ensure the Transcript column header exists in the sheet.
async function ensureTranscriptColumn(spreadsheetId) {
  const rows = await getSheetData(spreadsheetId, `${AUDIO_SHEET}!A1:G1`).catch(() => []);
  if (!rows?.length) return;
  const headers = rows[0];
  if (!headers.includes(TRANSCRIPT_COL)) {
    // Append the header to row 1 at position G
    headers[6] = TRANSCRIPT_COL;
    await updateSheetData(spreadsheetId, `${AUDIO_SHEET}!A1:G1`, [headers]).catch(() => {});
  }
}

async function saveTranscript(date, schedule, filename, transcript) {
  const spreadsheetId = GOOGLE_SHEETS_CONFIG.spreadsheetId;
  await ensureTranscriptColumn(spreadsheetId);

  const rows = await getSheetData(spreadsheetId, `${AUDIO_SHEET}!A:G`).catch(() => []);
  if (!rows || rows.length <= 1) return;

  const headers = rows[0];
  const dateIdx = headers.indexOf('Date');
  const schedIdx = headers.indexOf('Schedule');
  const nameIdx = headers.indexOf('Filename');

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][dateIdx] === date && rows[i][schedIdx] === schedule && rows[i][nameIdx] === filename) {
      rows[i][6] = transcript;
      await updateSheetData(spreadsheetId, `${AUDIO_SHEET}!A:G`, rows);
      return;
    }
  }
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

  // Pass the Supabase public URL directly to fal-ai/whisper — it fetches the
  // audio itself, which avoids all binary/content-type issues with serverless.
  let transcript;
  try {
    const hfRes = await fetch(HF_ASR_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio_url: url }),
    });
    if (!hfRes.ok) {
      const err = await hfRes.json().catch(() => ({}));
      throw new Error(err.error || err.detail || `HF returned ${hfRes.status}`);
    }
    const result = await hfRes.json();
    // fal-ai/whisper returns { text, chunks, ... }
    transcript = (result?.text ?? '').trim();
  } catch (err) {
    console.error('Transcription error:', err);
    return new Response(JSON.stringify({ error: `Transcription failed: ${err.message}` }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Persist transcript to Google Sheets asynchronously (don't block the response)
  if (date && filename) {
    saveTranscript(date, schedule, filename, transcript).catch((err) =>
      console.error('Failed to save transcript to sheet:', err)
    );
  }

  return new Response(JSON.stringify({ transcript }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
