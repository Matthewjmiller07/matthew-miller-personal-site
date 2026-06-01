export const prerender = false;
import { getSheetData, updateSheetData, createSheet, listSheets } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

const AUDIO_SHEET = 'audio-recordings';

async function ensureAudioSheet(spreadsheetId) {
  const sheets = await listSheets(spreadsheetId);
  if (!sheets.some(s => s.title === AUDIO_SHEET)) {
    await createSheet(spreadsheetId, AUDIO_SHEET, ['Date', 'Schedule', 'Filename', 'Url', 'Duration', 'CreatedAt']);
  }
}

export async function POST({ request }) {
  try {
    const { date, schedule = 'default', filename, url, duration } = await request.json();

    if (!date || !url || !filename) {
      return new Response(JSON.stringify({ error: 'Missing date, url, or filename' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const spreadsheetId = GOOGLE_SHEETS_CONFIG.spreadsheetId;
    await ensureAudioSheet(spreadsheetId);
    const range = `${AUDIO_SHEET}!A:F`;
    let rows = [];
    try { rows = (await getSheetData(spreadsheetId, range)) || []; } catch { rows = []; }
    if (rows.length === 0) rows.push(['Date', 'Schedule', 'Filename', 'Url', 'Duration', 'CreatedAt']);
    rows.push([date, schedule, filename, url, String(duration || ''), new Date().toISOString()]);
    await updateSheetData(spreadsheetId, range, rows);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving audio metadata:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
