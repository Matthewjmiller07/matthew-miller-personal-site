import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { getSheetData, sheetValuesToCsv, updateSheetData, csvToSheetValues } from '../../utils/googleSheetsClient.js';
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

export async function POST({ request }) {
  // Log environment details to help debug
  logEnvironmentDetails();

  try {
    // Parse request body
    const { date, verseNotes, notes } = await request.json();
    const normalizedDate = date ? date.split('T')[0] : null; // Ensure we just have YYYY-MM-DD

    if (!normalizedDate) {
      return new Response(JSON.stringify({
        error: 'Date parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Saving notes for date: ${normalizedDate}`);

    // Determine whether to use Google Sheets or local CSV
    const useGoogleSheets = shouldUseGoogleSheets;
    const isServerlessProd = isServerless && !isDev;
    let saveResult = { success: false };

    console.log('Save environment check:', { isServerless, isDev, isServerlessProd });

    if (useGoogleSheets) {
      // Try to save to Google Sheets
      try {
        console.log('Attempting to save data to Google Sheets...');
        console.log('Google Sheets config:', JSON.stringify({
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          range: GOOGLE_SHEETS_CONFIG.range,
          useInDevelopment: GOOGLE_SHEETS_CONFIG.useInDevelopment,
          useInProduction: GOOGLE_SHEETS_CONFIG.useInProduction
        }));
        
        saveResult = await saveToGoogleSheets(normalizedDate, verseNotes, notes);
        
        // If we got here, Google Sheets save was successful
        console.log('Successfully saved to Google Sheets');
      } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        console.error('Stack trace:', error.stack);
        
        if (isServerlessProd) {
          // In production serverless, don't try to fall back to CSV (read-only filesystem)
          console.error('In production environment - cannot fall back to local CSV (read-only filesystem)');
          return new Response(JSON.stringify({
            success: false,
            message: `Failed to save to Google Sheets: ${error.message}`,
            dataSource: 'google-sheets-failed'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          // Only in development, fall back to local CSV
          console.log('In development environment - falling back to local CSV');
          saveResult = await saveToLocalCsv(normalizedDate, verseNotes, notes);
        }
      }
    } else {
      // Use local CSV
      console.log('Google Sheets is disabled, using local CSV');
      saveResult = await saveToLocalCsv(normalizedDate, verseNotes, notes);
    }

    // Return the result
    return new Response(JSON.stringify({
      success: saveResult.success,
      message: saveResult.message,
      dataSource: saveResult.dataSource
    }), {
      status: saveResult.success ? 200 : 500,
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

// Save to Google Sheets
async function saveToGoogleSheets(date, verseNotes, notes) {
  try {
    // Get existing data from Google Sheets
    const sheetData = await getSheetData(
      GOOGLE_SHEETS_CONFIG.spreadsheetId,
      GOOGLE_SHEETS_CONFIG.range
    );
    
    // Log the raw sheet data for debugging
    console.log(`Raw sheet data has ${sheetData.length} rows, first row has ${sheetData[0]?.length || 0} columns`);
    console.log(`Headers: ${JSON.stringify(sheetData[0])}`);
    
    // Convert sheet data to CSV-like format
    const allRecords = sheetValuesToCsv(sheetData);
    console.log(`Converted to ${allRecords.length} records from Google Sheets`);
    console.log(`First few records:`, allRecords.slice(0, 3));
    
    // Find the record for this date with more flexible matching
    let recordIndex = allRecords.findIndex(r => {
      // Direct string comparison
      if (r.Date === date) return true;
      
      // Try normalizing the date (remove time component if present)
      try {
        const recordDateStr = r.Date ? r.Date.split('T')[0] : null;
        return recordDateStr === date;
      } catch (e) {
        return false;
      }
    });
    
    if (recordIndex === -1) {
      console.log(`No record found for date ${date}, cannot update`);
      console.log(`Available dates in first 10 records:`, allRecords.slice(0, 10).map(r => r.Date));
      return { 
        success: false, 
        message: `Date ${date} not found in schedule`,
        dataSource: 'google-sheets' 
      };
    }
    
    console.log(`Found record for date ${date} at index ${recordIndex}`);
    console.log(`Current record:`, allRecords[recordIndex]);
    
    // Update the record with new notes
    allRecords[recordIndex].Notes = notes || '';
    allRecords[recordIndex].VerseNotes = JSON.stringify(verseNotes || {});
    
    // Convert back to sheet values format
    const updatedSheetValues = csvToSheetValues(allRecords);
    
    // Write back to Google Sheets
    await updateSheetData(
      GOOGLE_SHEETS_CONFIG.spreadsheetId,
      GOOGLE_SHEETS_CONFIG.range,
      updatedSheetValues
    );
    
    console.log(`Successfully updated record for date ${date} in Google Sheets`);
    return { 
      success: true, 
      message: 'Notes saved to Google Sheets',
      dataSource: 'google-sheets'
    };
    
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    throw error;
  }
}

// Save to local CSV
async function saveToLocalCsv(date, verseNotes, notes) {
  try {
    // Try multiple possible file paths
    const csvPaths = [
      path.join(process.cwd(), LOCAL_CSV_CONFIG.path),
      path.join(process.cwd(), 'data', 'aviya.csv'),
      path.join(process.cwd(), 'public', 'aviya.csv')
    ];
    
    let content = null;
    let csvFilePath = null;
    
    // Try each path until we find one that works
    for (const tryPath of csvPaths) {
      try {
        if (fs.existsSync(tryPath)) {
          content = fs.readFileSync(tryPath, 'utf8');
          csvFilePath = tryPath;
          break;
        }
      } catch (err) {
        console.warn(`Couldn't access path: ${tryPath}`);
      }
    }
    
    if (!content || !csvFilePath) {
      console.error('Could not find or read CSV file from any of the expected locations');
      return { 
        success: false, 
        message: 'Could not find or read data file',
        dataSource: 'local-csv'
      };
    }
    
    console.log(`Reading and updating local CSV: ${csvFilePath}`);
    
    // Parse the CSV content
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true
    });
    
    // Find the record for this date
    const recordIndex = records.findIndex(r => r.Date === date);
    
    if (recordIndex === -1) {
      console.log(`No record found for date ${date}, cannot update`);
      return { 
        success: false, 
        message: `Date ${date} not found in schedule`,
        dataSource: 'local-csv'
      };
    }
    
    // Update the record with new notes
    records[recordIndex].Notes = notes || '';
    records[recordIndex].VerseNotes = JSON.stringify(verseNotes || {});
    
    // Write back to CSV
    const csv = stringify(records, { header: true });
    
    // First try to write to the data directory
    const dataDir = path.join(process.cwd(), 'data');
    let writeSuccess = false;
    
    try {
      // Create data dir if it doesn't exist
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const dataFile = path.join(dataDir, 'aviya.csv');
      fs.writeFileSync(dataFile, csv, 'utf8');
      writeSuccess = true;
      console.log(`Successfully wrote updated CSV to data directory: ${dataFile}`);
    } catch (err) {
      console.warn(`Could not write to data directory, trying original path: ${err.message}`);
    }
    
    // If writing to data dir failed, try writing back to original path
    if (!writeSuccess) {
      try {
        fs.writeFileSync(csvFilePath, csv, 'utf8');
        writeSuccess = true;
        console.log(`Successfully wrote updated CSV to original path: ${csvFilePath}`);
      } catch (err) {
        console.error(`Could not write to original path: ${err.message}`);
        return { 
          success: false, 
          message: `Failed to write updated CSV: ${err.message}`,
          dataSource: 'local-csv'
        };
      }
    }
    
    return { 
      success: true, 
      message: 'Notes saved to local CSV',
      dataSource: 'local-csv'
    };
    
  } catch (error) {
    console.error('Error saving to local CSV:', error);
    throw error;
  }
}
