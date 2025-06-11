import { getSheetData, sheetValuesToCsv, updateSheetData, csvToSheetValues } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

// Environment detection
const isDev = process.env.NODE_ENV === 'development';
const isServerless = Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);

export async function POST({ request }) {
  console.log('============== SAVE VERSE NOTES V2 ==============');
  console.log('Environment details:');
  console.log('- Is development:', isDev ? 'Yes' : 'No');
  console.log('- Is serverless:', isServerless ? 'Yes' : 'No');
  
  try {
    // Parse request body
    const { date, verseNotes, notes, sheet } = await request.json();
    const normalizedDate = date ? date.split('T')[0] : null; // Ensure we just have YYYY-MM-DD

    if (!normalizedDate) {
      return new Response(JSON.stringify({
        error: 'Date parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Saving V2 notes for date: ${normalizedDate}`);
    console.log('Google Sheets config:', JSON.stringify({
      spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
      range: GOOGLE_SHEETS_CONFIG.range
    }));
    
    // Always save directly to Google Sheets in V2 endpoint
    try {
      console.log('Saving to Google Sheets directly...');
      // Get sheet name from request or use default
      const sheetName = sheet || 'default';
      console.log(`Using sheet: ${sheetName}`);
      
      const result = await saveToGoogleSheets(normalizedDate, verseNotes, notes, sheetName);
      
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error saving to Google Sheets:', error);
      console.error('Stack trace:', error.stack);
      
      return new Response(JSON.stringify({
        success: false,
        message: `Failed to save to Google Sheets: ${error.message}`,
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

// Save notes to Google Sheets
async function saveToGoogleSheets(date, verseNotes, notes, sheetName = 'default') {
  try {
    // Determine which sheet/range to use based on the schedule parameter
    let range;
    if (sheetName === 'default' || !sheetName) {
      // Default to 'Aviya' sheet if no specific schedule is provided
      range = 'Aviya!A:Z';
      console.log('Using default Aviya sheet for saving (v2)');
    } else {
      // Use the specified sheet name with full column range
      range = `${sheetName}!A:Z`;
      console.log(`Using custom sheet for saving (v2): ${range}`);
    }
    
    console.log(`Using range: ${range}`);
    
    // Get existing data from Google Sheets
    const sheetData = await getSheetData(
      GOOGLE_SHEETS_CONFIG.spreadsheetId,
      range
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
      range,
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
