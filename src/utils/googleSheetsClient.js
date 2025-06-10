import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// This file handles authentication and basic operations with the Google Sheets API

// Initialize the Google Sheets client
export async function getGoogleSheetsClient() {
  try {
    console.log('Initializing Google Sheets client...');
    // In production, credentials should be stored securely as environment variables
    // For local dev, we can use a credentials file (not committed to git)
    let credentials;
    
    if (process.env.GOOGLE_CREDENTIALS) {
      console.log('Using GOOGLE_CREDENTIALS from environment variable');
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } else {
      console.log('Attempting to load credentials from local file');
      // For local development, try to load from file
      try {
        // Try multiple possible paths for the credentials file
        const possiblePaths = [
          path.resolve(process.cwd(), 'google-credentials.json'),
          path.resolve(__dirname, '../..', 'google-credentials.json'),
          '/Applications/Apps/matthew-miller-personal-site/google-credentials.json'
        ];
        
        let credentialsPath = null;
        for (const tryPath of possiblePaths) {
          console.log('Checking for credentials at:', tryPath);
          if (fs.existsSync(tryPath)) {
            credentialsPath = tryPath;
            console.log('Found credentials at:', credentialsPath);
            break;
          }
        }
        
        if (!credentialsPath) {
          console.error('No credentials file found at any of these locations:', possiblePaths.join(', '));
          throw new Error('Credentials file not found at any expected location');
        }
        
        const credentialsFile = fs.readFileSync(credentialsPath, 'utf8');
        credentials = JSON.parse(credentialsFile);
        console.log('Loaded credentials successfully for:', credentials.client_email);
      } catch (err) {
        console.error('Failed to load credentials file:', err);
        throw new Error('Google API credentials not found. Create a google-credentials.json file or set GOOGLE_CREDENTIALS env var.');
      }
    }

    // Verify credentials have required fields
    if (!credentials.client_email || !credentials.private_key) {
      console.error('Invalid credentials format - missing required fields');
      throw new Error('Invalid credentials format. Must include client_email and private_key.');
    }

    // Create JWT client with explicit auth
    console.log('Creating JWT auth client for:', credentials.client_email);
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    // Authenticate explicitly before returning
    console.log('Attempting to authenticate client...');
    await auth.authorize();
    console.log('Authentication successful!');

    // Create sheets client
    const sheets = google.sheets({ version: 'v4', auth });
    
    return sheets;
  } catch (error) {
    console.error('Error initializing Google Sheets client:', error);
    throw error;
  }
}

// Get all data from the sheet
export async function getSheetData(spreadsheetId, range) {
  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    return response.data.values;
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

// Update data in the sheet
export async function updateSheetData(spreadsheetId, range, values) {
  try {
    console.log(`Attempting to update Google Sheet: ${spreadsheetId}, range: ${range}`);
    console.log(`First row data (preview): ${JSON.stringify(values[0])}`);
    
    const sheets = await getGoogleSheetsClient();
    
    // Log the auth client details (without sensitive info)
    const auth = sheets.context._options.auth;
    console.log('Auth client info:', {
      type: auth.constructor.name,
      credentials: auth.key ? 'Present' : 'Missing',
      scopes: auth.scopes,
      email: auth.email
    });
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values },
    });
    
    console.log('Google Sheets update successful!');
    return response.data;
  } catch (error) {
    console.error('Error updating sheet data:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      statusText: error.statusText
    });
    if (error.errors) {
      console.error('API errors:', error.errors);
    }
    throw error;
  }
}

// Convert CSV-like data to Google Sheets format (2D array)
export function csvToSheetValues(csvData) {
  if (!csvData || !csvData.length) return [];
  
  // Get the original headers from the first record
  let originalHeaders = [];
  
  // We need to use the headers we got from the original sheet to keep the structure
  for (const key in csvData[0]) {
    // If the key is numeric or looks like a numeric index, attempt to convert it
    if (!isNaN(key)) {
      originalHeaders[parseInt(key)] = key;
    } else {
      originalHeaders.push(key);
    }
  }
  
  // Fill any gaps in numeric indices
  originalHeaders = originalHeaders.filter(h => h !== undefined);
  
  console.log('Using original headers for Sheet:', originalHeaders);
  
  // For numeric headers (0, 1, 2...), we need to find the column indexes for our data
  // This ensures we put data back in the right columns
  let dateColIndex = 0; // Default is first column
  let notesColIndex = 3; // Default is 4th column
  let verseNotesColIndex = 5; // Default is 6th column
  
  // Try to find the columns if they aren't numeric
  if (isNaN(originalHeaders[0])) {
    dateColIndex = originalHeaders.findIndex(h => h === 'Date');
    notesColIndex = originalHeaders.findIndex(h => h === 'Notes');
    verseNotesColIndex = originalHeaders.findIndex(h => h === 'VerseNotes');
  }
  
  if (dateColIndex === -1) dateColIndex = 0;
  if (notesColIndex === -1) notesColIndex = 3;
  if (verseNotesColIndex === -1) verseNotesColIndex = 5;
  
  console.log(`Sheet column mapping for write: Date=${dateColIndex}, Notes=${notesColIndex}, VerseNotes=${verseNotesColIndex}`);
  
  // Now convert records to rows
  const rows = csvData.map(record => {
    const row = new Array(originalHeaders.length).fill('');
    
    // Place data in appropriate columns
    row[dateColIndex] = record.Date || '';
    row[notesColIndex] = record.Notes || '';
    row[verseNotesColIndex] = record.VerseNotes || '';
    
    // Add any other fields that might exist
    for (let i = 0; i < originalHeaders.length; i++) {
      if (i !== dateColIndex && i !== notesColIndex && i !== verseNotesColIndex) {
        // Check if we have data for this column
        const header = originalHeaders[i];
        if (record[header] !== undefined) {
          row[i] = record[header];
        }
      }
    }
    
    return row;
  });
  
  return [originalHeaders, ...rows];
}

// Convert Google Sheets data (2D array) to CSV-like format (array of objects)
export function sheetValuesToCsv(sheetValues) {
  if (!sheetValues || !sheetValues.length) return [];
  
  const headers = sheetValues[0];
  const rows = sheetValues.slice(1);
  
  // Determine the column indices for Date, Notes, and VerseNotes
  // This makes the function more robust against different sheet structures
  let dateColIndex = headers.findIndex(h => h === 'Date');
  let notesColIndex = headers.findIndex(h => h === 'Notes');
  let verseNotesColIndex = headers.findIndex(h => h === 'VerseNotes');
  
  // If we couldn't find the columns by name, assume standard order (for numeric headers)
  if (dateColIndex === -1) dateColIndex = 0; // First column is Date
  if (notesColIndex === -1) notesColIndex = 3; // Fourth column is Notes
  if (verseNotesColIndex === -1) verseNotesColIndex = 5; // Sixth column is VerseNotes
  
  console.log(`Sheet column mapping: Date=${dateColIndex}, Notes=${notesColIndex}, VerseNotes=${verseNotesColIndex}`);
  console.log(`Sample header values: ${JSON.stringify(headers)}`);
  
  return rows.map((row, rowIndex) => {
    const record = {};
    
    // Always ensure we have these critical fields with the correct names
    record['Date'] = row[dateColIndex] || '';
    record['Notes'] = row[notesColIndex] || '';
    record['VerseNotes'] = row[verseNotesColIndex] || '';
    
    // Also include all other columns by their original header names
    headers.forEach((header, index) => {
      if (index !== dateColIndex && index !== notesColIndex && index !== verseNotesColIndex) {
        record[header] = row[index] || '';
      }
    });
    
    return record;
  });
}
