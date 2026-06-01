export const prerender = false;
import { createClient } from '@supabase/supabase-js';
import { getSheetData, updateSheetData, getGoogleSheetsClient } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

const AUDIO_SHEET = 'audio-recordings';
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
const BUCKET = 'torah-audio';

export async function POST({ request }) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return new Response(JSON.stringify({ error: 'Missing filename' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete from Supabase Storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const storageKey = filename.includes('/storage/v1/object/public/' + BUCKET + '/')
      ? filename.split('/storage/v1/object/public/' + BUCKET + '/')[1]
      : filename;

    const { error: deleteError } = await supabase.storage.from(BUCKET).remove([storageKey]);
    if (deleteError) throw new Error(deleteError.message);

    // Remove from Google Sheets
    const spreadsheetId = GOOGLE_SHEETS_CONFIG.spreadsheetId;
    const range = `${AUDIO_SHEET}!A:F`;
    let rows = [];
    try { rows = (await getSheetData(spreadsheetId, range)) || []; } catch { rows = []; }

    if (rows.length > 1) {
      const headers = rows[0];
      const nameIdx = headers.indexOf('Filename');
      const filtered = [headers, ...rows.slice(1).filter(row => row[nameIdx] !== filename)];

      // Clear the range first so removed rows don't linger, then rewrite
      const sheets = await getGoogleSheetsClient();
      await sheets.spreadsheets.values.clear({ spreadsheetId, range });

      if (filtered.length > 1) {
        await updateSheetData(spreadsheetId, range, filtered);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting audio:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
