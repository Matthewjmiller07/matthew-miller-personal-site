import { getSheetData, sheetValuesToCsv, updateSheetData, csvToSheetValues } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

// Environment detection
const isDev = process.env.NODE_ENV === 'development';
const isServerless = Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);

export async function POST({ request }) {
  console.log('============== DELETE VERSE NOTES V2 ==============');
  console.log('Environment details:');
  console.log('- CWD:', process.cwd());
  console.log('- Is development:', isDev ? 'Yes' : 'No');
  console.log('- Is serverless:', isServerless ? 'Yes' : 'No');
  
  try {
    // Parse request body
    const { date, reference } = await request.json();
    const normalizedDate = date ? date.split('T')[0] : null; // Ensure we just have YYYY-MM-DD

    if (!normalizedDate) {
      return new Response(JSON.stringify({
        error: 'Date parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!reference) {
      return new Response(JSON.stringify({
        error: 'Reference parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Deleting V2 note for date: ${normalizedDate}, reference: ${reference}`);
    
    // Always use Google Sheets in V2 endpoint
    try {
      console.log('Deleting from Google Sheets directly...');
      const result = await deleteFromGoogleSheets(normalizedDate, reference);
      
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error deleting from Google Sheets:', error);
      console.error('Stack trace:', error.stack);
      
      return new Response(JSON.stringify({
        success: false,
        message: `Failed to delete from Google Sheets: ${error.message}`,
        error: error.message,
        dataSource: 'google-sheets-failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
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

// Delete verse note from Google Sheets
async function deleteFromGoogleSheets(date, reference) {
  try {
    // Get existing data from Google Sheets
    const sheetData = await getSheetData(
      GOOGLE_SHEETS_CONFIG.spreadsheetId,
      GOOGLE_SHEETS_CONFIG.range
    );
    
    // Log the raw sheet data for debugging
    console.log(`Raw sheet data has ${sheetData.length} rows, first row has ${sheetData[0]?.length || 0} columns`);
    
    // Convert sheet data to CSV-like format
    const allRecords = sheetValuesToCsv(sheetData);
    console.log(`Converted to ${allRecords.length} records from Google Sheets`);
    
    // Find the record for this date
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
      console.log(`No record found for date ${date}, cannot delete note`);
      return { 
        success: false, 
        message: `Date ${date} not found in schedule`,
        dataSource: 'google-sheets' 
      };
    }
    
    console.log(`Found record for date ${date} at index ${recordIndex}`);
    
    // Get the current verse notes
    let verseNotes = {};
    if (allRecords[recordIndex].VerseNotes) {
      try {
        verseNotes = JSON.parse(allRecords[recordIndex].VerseNotes);
        console.log('Current verse notes:', verseNotes);
      } catch (e) {
        console.warn(`Could not parse verse notes JSON for ${date}:`, e);
      }
    }
    
    // Check if the reference exists
    if (!(reference in verseNotes)) {
      console.log(`Reference ${reference} not found in verse notes for ${date}`);
      return { 
        success: false, 
        message: `Note for ${reference} not found`,
        dataSource: 'google-sheets' 
      };
    }
    
    // Delete the reference
    delete verseNotes[reference];
    console.log(`Deleted reference ${reference}, remaining notes:`, verseNotes);
    
    // Update the record with the modified verse notes
    allRecords[recordIndex].VerseNotes = JSON.stringify(verseNotes);
    
    // Convert back to sheet values format
    const updatedSheetValues = csvToSheetValues(allRecords);
    
    // Write back to Google Sheets
    await updateSheetData(
      GOOGLE_SHEETS_CONFIG.spreadsheetId,
      GOOGLE_SHEETS_CONFIG.range,
      updatedSheetValues
    );
    
    console.log(`Successfully deleted note for ${reference} on ${date} in Google Sheets`);
    return { 
      success: true, 
      message: `Note deleted for ${reference}`,
      dataSource: 'google-sheets'
    };
    
  } catch (error) {
    console.error('Error deleting from Google Sheets:', error);
    throw error;
  }
}
