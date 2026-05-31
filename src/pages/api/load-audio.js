export const prerender = false;
import { getSheetData } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

const AUDIO_SHEET = 'audio-recordings';

export async function GET({ url }) {
  const date = url.searchParams.get('date');
  const schedule = url.searchParams.get('schedule') || 'default';

  if (!date) {
    return new Response(JSON.stringify({ error: 'Missing date' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rows = await getSheetData(GOOGLE_SHEETS_CONFIG.spreadsheetId, `${AUDIO_SHEET}!A:G`);
    if (!rows || rows.length <= 1) {
      return new Response(JSON.stringify({ recordings: [] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    const headers = rows[0];
    const dateIdx = headers.indexOf('Date');
    const schedIdx = headers.indexOf('Schedule');
    const nameIdx = headers.indexOf('Filename');
    const urlIdx = headers.indexOf('Url');
    const durIdx = headers.indexOf('Duration');
    const tsIdx = headers.indexOf('CreatedAt');

    const recordings = rows.slice(1)
      .filter(row => row[dateIdx] === date && row[schedIdx] === schedule)
      .map(row => ({
        filename: row[nameIdx] || '',
        url: row[urlIdx] || '',
        duration: row[durIdx] || '',
        createdAt: row[tsIdx] || '',
      }));

    return new Response(JSON.stringify({ recordings }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error loading audio:', error);
    return new Response(JSON.stringify({ recordings: [], error: error.message }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
}
