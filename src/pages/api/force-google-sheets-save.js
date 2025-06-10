import { getSheetData, sheetValuesToCsv, updateSheetData, csvToSheetValues } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

// Test endpoint to force a Google Sheets save operation
export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || '2026-06-01';
    const testNote = `Test note at ${new Date().toISOString()}`;
    
    console.log('====== GOOGLE SHEETS FORCE SAVE TEST ======');
    console.log(`Testing with date: ${date}`);
    console.log(`Using spreadsheetId: ${GOOGLE_SHEETS_CONFIG.spreadsheetId}`);
    console.log(`Using range: ${GOOGLE_SHEETS_CONFIG.range}`);
    
    // Step 1: Fetch current data
    console.log('\n📡 Step 1: Fetching current data from sheet...');
    const sheetData = await getSheetData(
      GOOGLE_SHEETS_CONFIG.spreadsheetId, 
      GOOGLE_SHEETS_CONFIG.range
    );
    
    if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to retrieve sheet data',
        dataReceived: sheetData
      }, null, 2), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    console.log(`Got ${sheetData.length} rows from sheet`);
    console.log(`Headers: ${sheetData[0].join(', ')}`);
    
    // Step 2: Convert to records
    console.log('\n🔄 Step 2: Converting to records...');
    const records = sheetValuesToCsv(sheetData);
    console.log(`Converted to ${records.length} records`);
    
    // Step 3: Find and update record
    console.log(`\n🔍 Step 3: Looking for record with Date = "${date}"...`);
    const recordIndex = records.findIndex(r => r.Date === date);
    
    if (recordIndex === -1) {
      return new Response(JSON.stringify({
        success: false,
        error: `No record found for date ${date}`,
        availableDates: records.map(r => r.Date).join(', ')
      }, null, 2), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    console.log(`Found record at index ${recordIndex}`);
    console.log('Original record:', records[recordIndex]);
    
    // Step 4: Update the record
    console.log('\n✏️ Step 4: Updating record...');
    const oldNotes = records[recordIndex].Notes || '';
    const oldVerseNotes = records[recordIndex].VerseNotes || '{}';
    
    // Make a small change to test write permissions
    records[recordIndex].Notes = testNote;
    
    // Add to verse notes JSON if it exists
    let verseNotes = {};
    try {
      verseNotes = JSON.parse(records[recordIndex].VerseNotes || '{}');
    } catch (e) {
      console.warn('Could not parse existing verse notes:', e);
    }
    
    verseNotes['TestVerse'] = testNote;
    records[recordIndex].VerseNotes = JSON.stringify(verseNotes);
    
    console.log('Updated record:', records[recordIndex]);
    
    // Step 5: Convert back to sheet values
    console.log('\n🔄 Step 5: Converting back to sheet values...');
    const updatedSheetValues = csvToSheetValues(records);
    console.log(`Converted back to ${updatedSheetValues.length} rows`);
    
    // Step 6: Write to Google Sheets
    console.log('\n📝 Step 6: Writing to Google Sheets...');
    const updateResult = await updateSheetData(
      GOOGLE_SHEETS_CONFIG.spreadsheetId,
      GOOGLE_SHEETS_CONFIG.range,
      updatedSheetValues
    );
    
    console.log('Update result:', updateResult);
    console.log('====== TEST COMPLETE ======');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Successfully tested Google Sheets write access',
      date: date,
      testNote: testNote,
      originalNotes: oldNotes,
      originalVerseNotes: oldVerseNotes,
      updatedVerseNotes: records[recordIndex].VerseNotes
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in force save test:', error);
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
