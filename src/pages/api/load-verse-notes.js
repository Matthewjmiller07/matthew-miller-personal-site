import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { getSheetData, sheetValuesToCsv } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG, LOCAL_CSV_CONFIG, shouldUseGoogleSheets } from './config.js';

// Environment detection
const isDev = process.env.NODE_ENV === 'development';
const isServerless = Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);
const isServerlessMode = isServerless && !isDev;

// Helper to log more details about the environment
function logEnvironmentDetails() {
  console.log('Environment details:');
  console.log('- CWD:', process.cwd());
  console.log('- ENV variables:', Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('KEY')).join(', '));
  console.log('- Platform:', process.platform);
  console.log('- Is serverless:', isServerless ? 'Yes' : 'No');
  console.log('- Using Google Sheets:', shouldUseGoogleSheets ? 'Yes' : 'No');
}

export async function GET({ request }) {
  // Log environment details to help debug
  logEnvironmentDetails();
  
  try {
    // Get the date from the query parameters
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const normalizedDate = date ? date.split('T')[0] : null; // Ensure we just have YYYY-MM-DD

    if (!normalizedDate) {
      return new Response(JSON.stringify({
        error: "Date parameter is required"
      }), {
        status: 400, 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Determine whether to use Google Sheets or local CSV
    const useGoogleSheets = shouldUseGoogleSheets || url.searchParams.get('useSheets') === 'true';
    const isServerlessProd = isServerless && !isDev;
    
    console.log(`Environment check for loading:`, { isServerless, isDev, isServerlessProd });
    console.log(`Using Google Sheets: ${useGoogleSheets}`);
    
    let allRecords = [];
    let record = null;
    let dataSource = 'unknown'; // Track where we loaded data from
    
    // Force Google Sheets in production regardless of other settings
    const shouldForceGoogleSheets = isServerlessProd;
    if (shouldForceGoogleSheets && !useGoogleSheets) {
      console.log('In production serverless environment - forcing Google Sheets usage');
    }
    
    // === FETCH DATA FROM SOURCE ===
    // Either Google Sheets or local CSV file
    
    if (useGoogleSheets || shouldForceGoogleSheets) {
      // Try to fetch from Google Sheets
      try {
        console.log('Fetching data from Google Sheets...');
        console.log('Google Sheets config:', JSON.stringify({
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          range: GOOGLE_SHEETS_CONFIG.range
        }));
        
        const sheetData = await getSheetData(
          GOOGLE_SHEETS_CONFIG.spreadsheetId,
          GOOGLE_SHEETS_CONFIG.range
        );
        
        if (!sheetData || !Array.isArray(sheetData)) {
          console.error('Invalid sheet data format:', sheetData);
          throw new Error('Invalid sheet data format');
        }
        
        console.log(`Raw sheet data: ${sheetData.length} rows, first row has ${sheetData[0]?.length || 0} columns`);
        console.log(`Headers: ${JSON.stringify(sheetData[0])}`);
        
        // Convert sheet data to CSV-like format using our improved function
        allRecords = sheetValuesToCsv(sheetData);
        console.log(`Converted to ${allRecords.length} records from Google Sheets`);
        console.log(`First record: ${JSON.stringify(allRecords[0])}`);
        
        // Data source tracking
        dataSource = 'google-sheets';
      } catch (error) {
        console.error('Error accessing Google Sheets:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
        // Fall back to local CSV
        console.log('Falling back to local CSV due to Google Sheets error');
        allRecords = await loadFromLocalCsv();
        dataSource = 'local-csv';
      }
    } else {
      // Use local CSV
      allRecords = await loadFromLocalCsv();
      dataSource = 'local-csv';
    }
    
    // Find the record for this date
    record = allRecords.find(r => {
      // Direct string comparison
      if (r.Date === normalizedDate) return true;
      
      // Try normalizing the date (remove time component if present)
      try {
        const recordDateStr = r.Date ? r.Date.split('T')[0] : null;
        return recordDateStr === normalizedDate;
      } catch (e) {
        return false;
      }
    });
    
    if (!record) {
      console.log(`No record found for date: ${normalizedDate}`);
      return new Response(JSON.stringify({ 
        error: 'Date not found in schedule',
        date: normalizedDate
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`Found record for date ${normalizedDate}`);
    
    // Get the readings for the current day
    const currentDayReadings = [];
    if (record.Reading) {
      const readingStr = record.Reading.replace(/["']/g, ''); // Remove quotes if present
      currentDayReadings.push(...readingStr.split(',').map(r => r.trim()));
    }
    console.log('Current day readings:', currentDayReadings);
    
    // === EXTRACT VERSE NOTES ===
    // The combined verse notes object we'll return
    let verseNotes = {};
    
    // First, get notes from the current day's record
    if (record.VerseNotes) {
      try {
        let currentDayNotes = {};
        
        console.log('VerseNotes type:', typeof record.VerseNotes);
        console.log('VerseNotes raw value:', record.VerseNotes);
        
        // Check if it's already an object or needs parsing
        if (typeof record.VerseNotes === 'object' && record.VerseNotes !== null) {
          currentDayNotes = record.VerseNotes;
          console.log('Using object directly');
        } else if (typeof record.VerseNotes === 'string' && record.VerseNotes.trim().startsWith('{')) {
          // Parse JSON string
          console.log('Parsing JSON string:', record.VerseNotes);
          currentDayNotes = JSON.parse(record.VerseNotes);
        }
        
        // Add to our combined notes
        verseNotes = {...currentDayNotes};
        console.log('Added notes from current day:', Object.keys(currentDayNotes).length);
        console.log('Verse notes found:', JSON.stringify(currentDayNotes));
      } catch (e) {
        console.error('Error parsing current day verse notes:', e);
      }
    } else {
      console.log('No verse notes found in record');
    }
    
    // Then check all other days for notes related to verses we're displaying today
    allRecords.forEach(r => {
      // Skip the current day since we already processed it
      if (r.Date === normalizedDate) return;
      
      // Skip if no verse notes
      if (!r.VerseNotes) return;
      
      try {
        let otherDayNotes = {};
        
        // Parse the verse notes from this day
        if (typeof r.VerseNotes === 'object' && r.VerseNotes !== null) {
          otherDayNotes = r.VerseNotes;
        } else if (typeof r.VerseNotes === 'string' && r.VerseNotes.trim().startsWith('{')) {
          otherDayNotes = JSON.parse(r.VerseNotes);
        } else {
          return; // Skip if can't parse
        }
        
        // Check if any of the verse references match our current day's readings
        Object.keys(otherDayNotes).forEach(verseRef => {
          if (currentDayReadings.includes(verseRef)) {
            // Only add if we don't already have a note for this verse
            // This ensures the current day's notes take precedence
            if (!verseNotes[verseRef]) {
              verseNotes[verseRef] = otherDayNotes[verseRef];
            }
          }
        });
      } catch (e) {
        console.error('Error processing verse notes from other day:', e);
      }
    });
    
    console.log(`Returning data for ${normalizedDate} from source: ${dataSource}`);
    console.log(`Verse notes: ${JSON.stringify(verseNotes)}`);
    
    // Return the record data
    return new Response(JSON.stringify({
      date: normalizedDate,
      notes: record.Notes || '',
      verseNotes: verseNotes,
      dataSource: dataSource
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in API handler:', error);
    return new Response(JSON.stringify({
      error: `API error: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper function to load data from local CSV file
async function loadFromLocalCsv() {
  // Try multiple possible file paths
  const csvPaths = [
    path.join(process.cwd(), LOCAL_CSV_CONFIG.path),
    path.join(process.cwd(), 'data', 'aviya.csv'),
    path.join(process.cwd(), 'public', 'aviya.csv'),
    path.join(process.cwd(), 'src', 'pages', 'api', 'aviya.csv')
  ];
  
  let content = null;
  let foundPath = null;
  
  // Try each path until we find one that works
  for (const tryPath of csvPaths) {
    try {
      if (fs.existsSync(tryPath)) {
        content = fs.readFileSync(tryPath, 'utf8');
        foundPath = tryPath;
        break;
      }
    } catch (err) {
      console.warn(`Couldn't access path: ${tryPath}`);
    }
  }
  
  if (!content) {
    console.error('Could not find or read CSV file from any of the expected locations');
    throw new Error('Could not find or read data file');
  }
  
  console.log(`Reading data from local CSV: ${foundPath}`);
  
  // Parse the CSV content
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true
  });
  
  return records;
}
