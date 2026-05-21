import { createSign } from 'crypto';
import path from 'path';
import { getSheetData, updateSheetData, createSheet, listSheets } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

export const IMAGE_UPLOADS_SHEET = 'image-uploads';

async function getCredentials() {
  if (process.env.GOOGLE_CREDENTIALS) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS);
  }
  const { default: fs } = await import('fs');
  const credPath = path.resolve(process.cwd(), 'google-credentials.json');
  return JSON.parse(fs.readFileSync(credPath, 'utf8'));
}

async function getDriveToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const sigInput = `${header}.${claims}`;
  const sign = createSign('RSA-SHA256');
  sign.write(sigInput);
  sign.end();
  const sig = sign.sign(credentials.private_key, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth2:grant_type:jwt-bearer',
      assertion: `${sigInput}.${sig}`,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Drive auth failed: ${data.error_description || JSON.stringify(data)}`);
  return data.access_token;
}

async function uploadToDrive(buffer, fileName, mimeType) {
  const credentials = await getCredentials();
  const token = await getDriveToken(credentials);

  const boundary = `----AviyaBoundary${Date.now()}`;
  const meta = JSON.stringify({ name: fileName });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n`, 'utf8'),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`, 'utf8'),
    buffer,
    Buffer.from(`\r\n--${boundary}--`, 'utf8'),
  ]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body,
    }
  );

  const uploadData = await uploadRes.json();
  if (!uploadData.id) throw new Error(`Drive upload failed: ${JSON.stringify(uploadData)}`);

  // Make the file publicly readable
  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });

  return `https://drive.google.com/uc?export=view&id=${uploadData.id}`;
}

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
    // Accept JSON body: { image: "data:image/...;base64,...", filename, date, schedule }
    const body = await request.json();
    const { image: dataUrl, filename = 'upload.jpg', date, schedule = 'default' } = body;

    if (!date || !dataUrl) {
      return new Response(JSON.stringify({ error: 'Missing date or image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) throw new Error('Invalid image data (expected base64 data URL)');

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const normalizedDate = date.split('T')[0];
    const ext = filename.split('.').pop() || mimeType.split('/')[1] || 'jpg';
    const fileName = `${normalizedDate}-${schedule}-${Date.now()}.${ext}`;

    const imageUrl = await uploadToDrive(buffer, fileName, mimeType);
    await persistImageUrl(normalizedDate, imageUrl, schedule);

    return new Response(JSON.stringify({ success: true, imageUrl }), {
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
