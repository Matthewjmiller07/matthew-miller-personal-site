import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { getSheetData, sheetValuesToCsv, updateSheetData, csvToSheetValues } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

const isDev = process.env.NODE_ENV === 'development';
const isServerless = Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);

export async function POST({ request }) {
  try {
    const { date, imagePath, schedule = 'default' } = await request.json();

    if (!date || !imagePath) {
      return new Response(JSON.stringify({ error: 'date and imagePath are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!imagePath.startsWith('/') || imagePath.includes('..')) {
      return new Response(JSON.stringify({ error: 'Invalid image path' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const normalizedDate = date.split('T')[0];

    // Delete the physical file (only in non-serverless or dev)
    if (!isServerless || isDev) {
      const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
      const imageFilePath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(imageFilePath)) {
        fs.unlinkSync(imageFilePath);
        console.log(`Deleted file: ${imageFilePath}`);
      }
    }

    // Remove the image reference from the data store
    try {
      if (schedule === 'default' || !schedule) {
        await removeFromCsv(normalizedDate, imagePath);
      } else {
        await removeFromGoogleSheets(normalizedDate, imagePath, schedule);
      }
    } catch (err) {
      console.error('Error removing image reference from data store:', err);
      // Don't fail the whole request — file was already deleted
    }

    return new Response(JSON.stringify({ success: true, imagePath }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in delete-image handler:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function removeFromCsv(date, imagePath) {
  const csvFilePath = path.join(process.cwd(), 'public', 'aviya.csv');
  if (!fs.existsSync(csvFilePath)) return;
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  const record = records.find(r => r.Date === date || r.Date?.split('T')[0] === date);
  if (!record) return;

  const images = parseImages(record.Images).filter(img => img !== imagePath);
  record.Images = images.length ? JSON.stringify(images) : '';

  const columns = Object.keys(records[0]);
  fs.writeFileSync(csvFilePath, stringify(records, { header: true, columns }));
}

async function removeFromGoogleSheets(date, imagePath, schedule) {
  const range = `${schedule}!A:Z`;
  const sheetData = await getSheetData(GOOGLE_SHEETS_CONFIG.spreadsheetId, range);
  const allRecords = sheetValuesToCsv(sheetData);

  const recordIndex = allRecords.findIndex(r =>
    r.Date === date || (r.Date && r.Date.split('T')[0] === date)
  );
  if (recordIndex === -1) return;

  const images = parseImages(allRecords[recordIndex].Images).filter(img => img !== imagePath);
  allRecords[recordIndex].Images = images.length ? JSON.stringify(images) : '';

  const updatedSheetValues = csvToSheetValues(allRecords);
  await updateSheetData(GOOGLE_SHEETS_CONFIG.spreadsheetId, range, updatedSheetValues);
}

function parseImages(raw) {
  if (!raw) return [];
  try {
    if (typeof raw === 'string' && raw.startsWith('[')) return JSON.parse(raw);
    if (typeof raw === 'string' && raw.includes(',')) return raw.split(',').map(s => s.trim());
    return raw ? [String(raw).trim()] : [];
  } catch {
    return raw ? [String(raw)] : [];
  }
}
