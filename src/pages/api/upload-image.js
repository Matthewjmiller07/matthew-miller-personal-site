export const prerender = false;
import { getSheetData, updateSheetData, createSheet, listSheets } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

export const IMAGE_UPLOADS_SHEET = 'image-uploads';

async function ensureImageUploadsSheet(spreadsheetId) {
  try {
    const sheets = await listSheets(spreadsheetId);
    if (!sheets.some(s => s.title === IMAGE_UPLOADS_SHEET)) {
      await createSheet(spreadsheetId, IMAGE_UPLOADS_SHEET, ['Date', 'Schedule', 'Images']);
    }
  } catch (e) {
    console.warn('Could not ensure image-uploads sheet:', e.message);
  }
}

async function persistImageUrl(date, imageUrl, schedule) {
  const spreadsheetId = GOOGLE_SHEETS_CONFIG.spreadsheetId;
  await ensureImageUploadsSheet(spreadsheetId);

  const range = `${IMAGE_UPLOADS_SHEET}!A:C`;
  let rows = [];
  try {
    rows = (await getSheetData(spreadsheetId, range)) || [];
  } catch {
    rows = [];
  }

  if (rows.length === 0) rows.push(['Date', 'Schedule', 'Images']);

  const existingIdx = rows.findIndex((row, i) => i > 0 && row[0] === date && row[1] === schedule);
  if (existingIdx > 0) {
    let imgs = [];
    try { imgs = JSON.parse(rows[existingIdx][2] || '[]'); } catch { imgs = []; }
    imgs.push(imageUrl);
    rows[existingIdx][2] = JSON.stringify(imgs);
  } else {
    rows.push([date, schedule, JSON.stringify([imageUrl])]);
  }

  await updateSheetData(spreadsheetId, range, rows);
}

export async function POST({ request }) {
  try {
    // Body: { image: "data:image/...;base64,...", filename, date, schedule }
    const body = await request.json();
    const { image: dataUrl, date, schedule = 'default' } = body;

    if (!date || !dataUrl) {
      return new Response(JSON.stringify({ error: 'Missing date or image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!dataUrl.startsWith('data:image/')) {
      return new Response(JSON.stringify({ error: 'Invalid image data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalizedDate = date.split('T')[0];

    // Store the base64 data URL directly in the image-uploads Google Sheet
    await persistImageUrl(normalizedDate, dataUrl, schedule);

    return new Response(JSON.stringify({ success: true, imageUrl: dataUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
