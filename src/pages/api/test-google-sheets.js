import { getSheetData, sheetValuesToCsv, updateSheetData, csvToSheetValues } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

// Test API endpoint to check Google Sheets access
export async function GET({ request }) {
  try {
    console.log('Testing Google Sheets connection...');
    console.log('Using config:', JSON.stringify({
      spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
      range: GOOGLE_SHEETS_CONFIG.range
    }));
    
    // 1. Try fetching data
    console.log('Step 1: Testing read access...');
    const sheetData = await getSheetData(
      GOOGLE_SHEETS_CONFIG.spreadsheetId,
      GOOGLE_SHEETS_CONFIG.range
    );
    
    if (!sheetData || !Array.isArray(sheetData)) {
      throw new Error('Received invalid sheet data');
    }
    
    console.log(`Successfully read ${sheetData.length} rows from Google Sheet`);
    
    // 2. Convert to records
    const records = sheetValuesToCsv(sheetData);
    console.log(`Converted to ${records.length} records`);
    
    // 3. Try to update (but don't actually change anything)
    console.log('Step 2: Testing write access...');
    if (records.length > 0) {
      // Make a minimal change and change back
      const testRecord = records[0];
      const testColumn = Object.keys(testRecord)[0]; // Get first column
      const originalValue = testRecord[testColumn];
      
      // Temporarily change value
      testRecord[testColumn] = originalValue + ' (test)';
      const updatedValues = csvToSheetValues(records);
      
      // Update Google Sheets
      console.log('Sending test update to Google Sheets...');
      const updateResult = await updateSheetData(
        GOOGLE_SHEETS_CONFIG.spreadsheetId,
        GOOGLE_SHEETS_CONFIG.range,
        updatedValues
      );
      
      // Revert change
      testRecord[testColumn] = originalValue;
      await updateSheetData(
        GOOGLE_SHEETS_CONFIG.spreadsheetId,
        GOOGLE_SHEETS_CONFIG.range,
        csvToSheetValues(records)
      );
      
      console.log('Successfully tested write access!');
    }
    
    // Return success
    return new Response(JSON.stringify({
      success: true,
      message: 'Google Sheets connection test passed',
      sheetInfo: {
        rowCount: sheetData.length,
        recordCount: records.length,
        headers: sheetData[0]
      }
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error testing Google Sheets API:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
