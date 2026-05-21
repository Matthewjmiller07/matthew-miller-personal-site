import { randomUUID } from 'crypto';
import { google } from 'googleapis';
import { PassThrough } from 'stream';
import path from 'path';
import { getSheetData, updateSheetData, createSheet, listSheets } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

const DRIVE_FOLDER_NAME = 'aviya-schedule-images';
export const IMAGE_UPLOADS_SHEET = 'image-uploads';

async function getCredentials() {
  if (process.env.GOOGLE_CREDENTIALS) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS);
  }
  const { default: fs } = await import('fs');
  const credentialsPath = path.resolve(process.cwd(), 'google-credentials.json');
  return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
}

async function getGoogleDriveClient() {
  const credentials = await getCredentials();
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  await auth.authorize();
  return google.drive({ version: 'v3', auth });
}

async function uploadToDrive(buffer, fileName, mimeType) {
  const drive = await getGoogleDriveClient();

  // Find or create the upload folder
  const folderSearch = await drive.files.list({
    q: `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive'
  });

  let folderId;
  if (folderSearch.data.files.length > 0) {
    folderId = folderSearch.data.files[0].id;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });
    folderId = folder.data.id;
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { role: 'reader', type: 'anyone' }
    });
  }

  // Upload the file as a stream
  const stream = new PassThrough();
  stream.end(buffer);

  const uploaded = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: stream },
    fields: 'id'
  });

  const fileId = uploaded.data.id;

  // Make the file publicly readable
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' }
  });

  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

async function ensureImageUploadsSheet(spreadsheetId) {
  const sheets = await listSheets(spreadsheetId);
  const exists = sheets.some(s => s.title === IMAGE_UPLOADS_SHEET);
  if (!exists) {
    await createSheet(spreadsheetId, IMAGE_UPLOADS_SHEET, ['Date', 'Schedule', 'Images']);
  }
}

async function persistImageUrl(date, imageUrl, schedule) {
  const spreadsheetId = GOOGLE_SHEETS_CONFIG.spreadsheetId;
  await ensureImageUploadsSheet(spreadsheetId);

  const range = `${IMAGE_UPLOADS_SHEET}!A:C`;
  let rows = [];
  try {
    const data = await getSheetData(spreadsheetId, range);
    rows = data || [];
  } catch {
    rows = [['Date', 'Schedule', 'Images']];
  }

  if (rows.length === 0) rows.push(['Date', 'Schedule', 'Images']);

  // Find matching row (skip header)
  const existingIdx = rows.findIndex((row, i) =>
    i > 0 && row[0] === date && row[1] === schedule
  );

  if (existingIdx > 0) {
    let existing = [];
    try { existing = JSON.parse(rows[existingIdx][2] || '[]'); } catch { existing = []; }
    existing.push(imageUrl);
    rows[existingIdx][2] = JSON.stringify(existing);
  } else {
    rows.push([date, schedule, JSON.stringify([imageUrl])]);
  }

  await updateSheetData(spreadsheetId, range, rows);
}

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
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const fileExt = imageFile.name?.split('.').pop() || 'jpg';
    const fileName = `${normalizedDate}-${schedule}-${Date.now()}-${randomUUID().slice(0, 8)}.${fileExt}`;
    const mimeType = imageFile.type || 'image/jpeg';

    const imageUrl = await uploadToDrive(buffer, fileName, mimeType);
    await persistImageUrl(normalizedDate, imageUrl, schedule);

    return new Response(JSON.stringify({ success: true, imageUrl }), {
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
