import { getSheetData, sheetValuesToCsv } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

// Debug API endpoint to see raw data from Google Sheets
export async function GET({ request }) {
  try {
    console.log('Debug API - Fetching data from Google Sheets...');
    console.log('Using config:', JSON.stringify(GOOGLE_SHEETS_CONFIG));
    
    const sheetData = await getSheetData(
      GOOGLE_SHEETS_CONFIG.spreadsheetId,
      GOOGLE_SHEETS_CONFIG.range
    );
    
    console.log('Raw sheet data:', JSON.stringify(sheetData));
    
    // Convert sheet data to CSV-like format
    const allRecords = sheetValuesToCsv(sheetData);
    console.log('Converted to records:', JSON.stringify(allRecords));
    
    // Return the data for inspection
    return new Response(JSON.stringify({
      rawSheetData: sheetData,
      records: allRecords,
      config: {
        spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
        range: GOOGLE_SHEETS_CONFIG.range
      }
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in debug API:', error);
    return new Response(JSON.stringify({
      error: `API error: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
