import fs from 'fs';
import path from 'path';
import { getPrintifyHeaders, jsonResponse, postersDir } from './_utils.js';

export async function POST({ request }) {
  try {
    const { imageName } = await request.json();
    if (!imageName) return jsonResponse({ error: 'imageName is required' }, 400);

    const filePath = path.join(postersDir(), imageName);
    if (!fs.existsSync(filePath)) return jsonResponse({ error: 'File not found' }, 404);

    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');

    const payload = {
      file_name: imageName,
      contents: base64,
    };

    const res = await fetch('https://api.printify.com/v1/uploads/images.json', {
      method: 'POST',
      headers: getPrintifyHeaders(),
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      return jsonResponse({ error: 'Upload failed', status: res.status, body: text }, res.status);
    }
    const data = JSON.parse(text);
    return jsonResponse({ success: true, upload: data });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
