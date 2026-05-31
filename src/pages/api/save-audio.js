export const prerender = false;
import { getSheetData, updateSheetData, createSheet, listSheets, uploadAudioToDrive } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

const AUDIO_SHEET = 'audio-recordings';

async function ensureAudioSheet(spreadsheetId) {
  const sheets = await listSheets(spreadsheetId);
  if (!sheets.some(s => s.title === AUDIO_SHEET)) {
    await createSheet(spreadsheetId, AUDIO_SHEET, ['Date', 'Schedule', 'Filename', 'FileId', 'Url', 'Duration', 'CreatedAt']);
  }
}

async function persistAudioRecord(date, schedule, filename, fileId, url, duration) {
  const spreadsheetId = GOOGLE_SHEETS_CONFIG.spreadsheetId;
  await ensureAudioSheet(spreadsheetId);

  const range = `${AUDIO_SHEET}!A:G`;
  let rows = [];
  try { rows = (await getSheetData(spreadsheetId, range)) || []; } catch { rows = []; }
  if (rows.length === 0) rows.push(['Date', 'Schedule', 'Filename', 'FileId', 'Url', 'Duration', 'CreatedAt']);

  rows.push([date, schedule, filename, fileId, url, String(duration || ''), new Date().toISOString()]);
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

    // Parse base64 data URL — accept any MIME type (mp4 on iOS, webm on Chrome, etc.)
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return new Response(JSON.stringify({ error: 'Invalid audio data URL' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const mimeType = match[1] || 'audio/webm';
    const audioBuffer = Buffer.from(match[2], 'base64');
    const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const filename = `recording-${date}-${schedule}-${Date.now()}.${ext}`;

    const folderId = process.env.GOOGLE_DRIVE_AUDIO_FOLDER_ID || null;
    const { fileId, url, viewUrl } = await uploadAudioToDrive(audioBuffer, filename, mimeType, folderId);

    await persistAudioRecord(date, schedule, filename, fileId, url, duration);

    return new Response(JSON.stringify({ success: true, fileId, url, viewUrl, filename }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving audio:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
