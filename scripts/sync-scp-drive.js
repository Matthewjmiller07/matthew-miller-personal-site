#!/usr/bin/env node
/**
 * Sync SCP files from Google Drive
 * Expects folder structure: /shiur-1/audio.mp3, /shiur-1/notes.pdf, etc.
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_SCP_FOLDER_ID;
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;  // For public folders
const OUTPUT_DIR = './public/scp';

if (!DRIVE_FOLDER_ID) {
  console.log('⚠️  GOOGLE_DRIVE_SCP_FOLDER_ID not set. Skipping Drive sync.');
  process.exit(0);
}

async function authenticate() {
  // Option 1: API Key for public folders (simplest)
  if (API_KEY) {
    return null;  // API key doesn't need auth object
  }

  // Option 2: Service account
  let credentials;
  if (SERVICE_ACCOUNT_KEY) {
    credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    credentials = JSON.parse(await fs.readFile(credsPath, 'utf8'));
  } else {
    console.error('❌ No credentials found. Set one of:');
    console.error('   - GOOGLE_DRIVE_API_KEY (for public folders)');
    console.error('   - GOOGLE_SERVICE_ACCOUNT_KEY');
    console.error('   - GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return auth;
}

async function downloadFile(drive, fileId, destPath, auth) {
  let response;

  if (!auth && API_KEY) {
    // Use direct download URL with API key for public files
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    const dest = fssync.createWriteStream(destPath);
    await pipeline(res.body, dest);
  } else {
    // Use authenticated API
    response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    const dest = fssync.createWriteStream(destPath);
    await pipeline(response.data, dest);
  }
}

async function listFolderContents(drive, folderId, auth) {
  const params = {
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size)',
  };

  // If using API key, add it to params
  if (!auth && API_KEY) {
    params.key = API_KEY;
  }

  const res = await drive.files.list(params);
  return res.data.files || [];
}

async function syncShiurFolder(drive, folderId, shiurNum, auth) {
  const shiurDir = path.join(OUTPUT_DIR, `shiur-${shiurNum}`);
  const files = await listFolderContents(drive, folderId, auth);

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    let destName;
    let isGoogleDoc = false;

    // Check for Google Doc (mimeType)
    if (file.mimeType === 'application/vnd.google-apps.document') {
      destName = 'notes.pdf';
      isGoogleDoc = true;
    }
    // Map file extensions to expected names
    else if (ext === '.mp3') destName = 'audio.mp3';
    else if (ext === '.m4a') destName = 'audio.m4a';  // Keep m4a as-is
    else if (ext === '.pdf') destName = 'notes.pdf';
    else if (ext === '.srt') destName = 'transcript.srt';
    else if (ext === '.doc' || ext === '.docx') destName = 'notes.docx';
    else continue; // Skip unknown files

    const destPath = path.join(shiurDir, destName);

    // Check if file needs updating (skip if exists and size matches)
    try {
      const stats = await fs.stat(destPath);
      if (stats.size === parseInt(file.size || 0)) {
        console.log(`  ⏭️  ${destName} (up to date)`);
        continue;
      }
    } catch {
      // File doesn't exist, will download
    }

    console.log(`  ⬇️  Downloading ${destName}...`);
    if (isGoogleDoc) {
      await downloadGoogleDoc(drive, file.id, destPath, auth);
    } else {
      await downloadFile(drive, file.id, destPath, auth);
    }
  }
}

async function downloadGoogleDoc(drive, fileId, destPath, auth) {
  // Export Google Doc as PDF
  let response;

  if (!auth && API_KEY) {
    // Use export URL with API key
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application%2Fpdf&key=${API_KEY}`;
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    const dest = fssync.createWriteStream(destPath);
    await pipeline(res.body, dest);
  } else {
    // Use authenticated API
    const res = await drive.files.export(
      { fileId, mimeType: 'application/pdf' },
      { responseType: 'stream' }
    );

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    const dest = fssync.createWriteStream(destPath);
    await pipeline(res.data, dest);
  }
}

async function findAllShiurFolders(drive, folderId, auth, depth = 0) {
  // Recursively find all folders matching shiur pattern
  const results = [];
  const files = await listFolderContents(drive, folderId, auth);
  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');

  for (const folder of folders) {
    // Check if this is a shiur folder
    const match = folder.name.match(/shiur[\s#:-]*(\d+)/i);
    if (match) {
      results.push({ folder, shiurNum: match[1] });
    } else if (depth < 3) {
      // Recurse into subfolders (max 3 levels deep)
      const subResults = await findAllShiurFolders(drive, folder.id, auth, depth + 1);
      results.push(...subResults);
    }
  }

  return results;
}

async function main() {
  console.log('🎧 Syncing SCP files from Google Drive...');

  const auth = await authenticate();

  // Create drive client - auth can be null for API key mode
  const drive = google.drive({ version: 'v3', auth: auth || undefined });

  // Recursively find all shiur folders (handles nested structure)
  const shiurFolders = await findAllShiurFolders(drive, DRIVE_FOLDER_ID, auth);

  if (shiurFolders.length === 0) {
    console.log('⚠️  No shiur folders found in Drive. Expected folders like "Shiur #1", "shiur-2", etc.');
    console.log('   Searched in folder ID:', DRIVE_FOLDER_ID);
    process.exit(0);
  }

  console.log(`Found ${shiurFolders.length} shiur folder(s)`);

  for (const { folder, shiurNum } of shiurFolders) {
    console.log(`📁 ${folder.name} (shiur-${shiurNum}):`);
    await syncShiurFolder(drive, folder.id, shiurNum, auth);
  }

  console.log('✅ SCP sync complete!');
}

main().catch(err => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
