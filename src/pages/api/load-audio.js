export const prerender = false;
import { getSheetData } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

const AUDIO_SHEET = 'audio-recordings';

export async function GET({ url }) {
  const date = url.searchParams.get('date');
  const schedule = url.searchParams.get('schedule') || 'default';
  const all = url.searchParams.get('all') === 'true';

  try {
    const rows = await getSheetData(GOOGLE_SHEETS_CONFIG.spreadsheetId, `${AUDIO_SHEET}!A:H`);
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
    const transcriptIdx = headers.indexOf('Transcript');
    const diarizationIdx = headers.indexOf('DiarizationJson');

    const recordings = rows.slice(1)
      .filter(row => all ? row[dateIdx] : (row[dateIdx] === date && row[schedIdx] === schedule))
      .map(row => {
        let segments = [];
        if (diarizationIdx >= 0 && row[diarizationIdx]) {
          try { segments = JSON.parse(row[diarizationIdx]); } catch {}
        }
        return {
          date: row[dateIdx] || '',
          schedule: row[schedIdx] || '',
          filename: row[nameIdx] || '',
          url: row[urlIdx] || '',
          duration: row[durIdx] || '',
          createdAt: row[tsIdx] || '',
          transcript: transcriptIdx >= 0 ? (row[transcriptIdx] || '') : '',
          segments,
        };
      })
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

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
