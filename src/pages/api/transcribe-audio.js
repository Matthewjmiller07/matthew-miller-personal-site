export const prerender = false;

import { InferenceClient } from '@huggingface/inference';
import { getSheetData, updateSheetData } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

const MODEL = 'openai/whisper-large-v3';
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

  // Fetch the audio from Supabase (public URL)
  let audioBuffer;
  try {
    const audioRes = await fetch(url);
    if (!audioRes.ok) throw new Error(`Could not fetch audio: ${audioRes.status}`);
    audioBuffer = Buffer.from(await audioRes.arrayBuffer());
  } catch (err) {
    return new Response(JSON.stringify({ error: `Failed to fetch audio: ${err.message}` }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Transcribe via HF Inference Providers (hf-inference provider for Whisper)
  let transcript;
  try {
    const client = new InferenceClient(token);
    const result = await client.automaticSpeechRecognition({
      model: MODEL,
      data: audioBuffer,
    });
    transcript = result?.text?.trim() ?? '';
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
