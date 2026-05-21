import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { randomUUID } from 'crypto';
import { getSheetData, sheetValuesToCsv, updateSheetData, csvToSheetValues } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const date = formData.get('date');
    const imageFile = formData.get('image');
    const schedule = formData.get('schedule') || 'default';

    if (!date || !imageFile) {
      return new Response(JSON.stringify({ error: 'Missing date or image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const normalizedDate = date.split('T')[0];

    // Save image file to disk
    const uploadsDir = path.join(process.cwd(), 'public', 'images', 'aviya');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${randomUUID()}.${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/images/aviya/${fileName}`;

    // Persist the image URL in the correct data store
    if (schedule === 'default' || !schedule) {
      await updateCsv(normalizedDate, imageUrl);
    } else {
      await updateGoogleSheets(normalizedDate, imageUrl, schedule);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateCsv(date, imageUrl) {
  const csvFilePath = path.join(process.cwd(), 'public', 'aviya.csv');
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  const record = records.find(r => r.Date === date || r.Date.split('T')[0] === date);
  if (!record) throw new Error(`Date ${date} not found in CSV`);

  const images = parseImages(record.Images);
  images.push(imageUrl);
  record.Images = JSON.stringify(images);

  const columns = Object.keys(records[0]);
  fs.writeFileSync(csvFilePath, stringify(records, { header: true, columns }));
}

async function updateGoogleSheets(date, imageUrl, schedule) {
  const range = `${schedule}!A:Z`;
  const sheetData = await getSheetData(GOOGLE_SHEETS_CONFIG.spreadsheetId, range);
  const allRecords = sheetValuesToCsv(sheetData);

  const recordIndex = allRecords.findIndex(r =>
    r.Date === date || (r.Date && r.Date.split('T')[0] === date)
  );
  if (recordIndex === -1) throw new Error(`Date ${date} not found in sheet ${schedule}`);

  const images = parseImages(allRecords[recordIndex].Images);
  images.push(imageUrl);
  allRecords[recordIndex].Images = JSON.stringify(images);

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
