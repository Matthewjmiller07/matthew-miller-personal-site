export const prerender = false;
import { createClient } from '@supabase/supabase-js';
import { getSheetData, updateSheetData, createSheet, listSheets } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

const AUDIO_SHEET = 'audio-recordings';
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
const BUCKET = 'torah-audio';

async function ensureAudioSheet(spreadsheetId) {
  const sheets = await listSheets(spreadsheetId);
  if (!sheets.some(s => s.title === AUDIO_SHEET)) {
    await createSheet(spreadsheetId, AUDIO_SHEET, ['Date', 'Schedule', 'Filename', 'Url', 'Duration', 'CreatedAt']);
  }
}

async function persistAudioRecord(date, schedule, filename, url, duration) {
  const spreadsheetId = GOOGLE_SHEETS_CONFIG.spreadsheetId;
  await ensureAudioSheet(spreadsheetId);
  const range = `${AUDIO_SHEET}!A:F`;
  let rows = [];
  try { rows = (await getSheetData(spreadsheetId, range)) || []; } catch { rows = []; }
  if (rows.length === 0) rows.push(['Date', 'Schedule', 'Filename', 'Url', 'Duration', 'CreatedAt']);
  rows.push([date, schedule, filename, url, String(duration || ''), new Date().toISOString()]);
  await updateSheetData(spreadsheetId, range, rows);
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { audio: dataUrl, date, schedule = 'default', duration } = body;

    if (!date || !dataUrl) {
      return new Response(JSON.stringify({ error: 'Missing date or audio' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle codec params: data:audio/webm;codecs=opus;base64,...
    const match = dataUrl.match(/^data:(.*?);base64,(.+)$/s);
    if (!match) {
      return new Response(JSON.stringify({ error: 'Invalid audio data URL' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const fullMimeType = match[1] || 'audio/webm';
    const baseMimeType = fullMimeType.split(';')[0] || 'audio/webm';
    const audioBuffer = Buffer.from(match[2], 'base64');
    const ext = baseMimeType.includes('mp4') || baseMimeType.includes('m4a') ? 'm4a'
      : baseMimeType.includes('ogg') ? 'ogg' : 'webm';
    const filename = `${date}/${schedule}-${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, audioBuffer, { contentType: baseMimeType, upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    await persistAudioRecord(date, schedule, filename, publicUrl, duration);

    return new Response(JSON.stringify({ success: true, url: publicUrl, filename }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving audio:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
