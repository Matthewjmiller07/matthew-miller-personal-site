import { getSheetData, updateSheetData, createSheet, listSheets } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

// Environment detection
const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production' || env === 'netlify';
const isDev = env === 'development';
const isServerless = Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);

console.log(`add-custom-schedule.js: Running in ${env} environment (isProduction: ${isProduction})`);

export async function POST({ request }) {
  console.log('============== ADD CUSTOM SCHEDULE ==============');
  console.log('Environment details:');
  console.log('- Is development:', isDev ? 'Yes' : 'No');
  console.log('- Is serverless:', isServerless ? 'Yes' : 'No');
  
  try {
    // Parse request body
    const { name, schedule } = await request.json();
    
    if (!name || !schedule || !Array.isArray(schedule)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Schedule name and valid schedule data are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Adding custom schedule: ${name} with ${schedule.length} entries`);
    
    try {
      const result = await addCustomScheduleToSheet(name, schedule);
      
      return new Response(JSON.stringify({
        success: true,
        message: `Schedule "${name}" added successfully with ${result.entriesAdded} entries`,
        ...result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error adding schedule to Google Sheets:', error);
      console.error('Stack trace:', error.stack);
      
      return new Response(JSON.stringify({
        success: false,
        message: `Failed to add schedule to Google Sheets: ${error.message}`,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error in API handler:', error);
    return new Response(JSON.stringify({
      success: false,
      message: `API error: ${error.message}`,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Add custom schedule to Google Sheets by creating a new sheet
async function addCustomScheduleToSheet(scheduleName, scheduleData) {
  // Sanitize schedule name for sheet name (remove spaces, special chars)
  const safeScheduleName = scheduleName.replace(/[^a-zA-Z0-9]/g, '_');
  
  try {
    console.log(`Creating new sheet for schedule: ${scheduleName}`);

    // Check if a sheet with this name already exists
    const sheets = await listSheets(GOOGLE_SHEETS_CONFIG.spreadsheetId);
    const existingSheet = sheets.find(sheet => sheet.title === safeScheduleName);
    
    if (existingSheet) {
      throw new Error(`A sheet named "${safeScheduleName}" already exists`);
    }
    
    // Define our standard columns for the new sheet
    const headers = ['Date', 'DayOfWeek', 'Reading', 'Notes', 'VerseNotes', 'Images'];
    
    // Create the new sheet
    await createSheet(GOOGLE_SHEETS_CONFIG.spreadsheetId, safeScheduleName, headers);
    
    // Prepare the data for the new sheet
    const sheetData = [];
    
    // First row is headers
    sheetData.push(headers);
    
    // Add all schedule entries as rows
    let entriesAdded = 0;
    const unmatchedEntries = [];
    
    // Sort schedule entries by date
    scheduleData.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });
    
    // Add each schedule entry as a row
    scheduleData.forEach(entry => {
      if (entry.date) {
        // Format date as YYYY-MM-DD
        const normalizedDate = entry.date.split('T')[0];
        
        // Create a row for this entry
        const row = [
          normalizedDate,                    // Date
          entry.dayOfWeek || '',             // DayOfWeek
          String(entry.reading || ''),       // Reading (ensure it's a string)
          '',                               // Notes (start empty)
          '{}',                             // VerseNotes (start with empty JSON)
          entry.images ? JSON.stringify(entry.images) : '[]' // Images
        ];
        
        // Debug the values to ensure they're valid for Google Sheets API
        console.log(`Row data for entry ${normalizedDate}: ${JSON.stringify(row)}`);
        
        // Additional validation to ensure all values are strings
        for (let i = 0; i < row.length; i++) {
          if (row[i] === null || row[i] === undefined) {
            row[i] = ''; // Replace null/undefined with empty string
          } else if (typeof row[i] !== 'string') {
            row[i] = String(row[i]); // Convert all non-string values to strings
          }
        }
        
        sheetData.push(row);
        entriesAdded++;
      } else {
        // Track entries without dates
        unmatchedEntries.push(entry);
      }
    });
    
    console.log(`Prepared ${entriesAdded} rows for the new sheet`);
    
    if (unmatchedEntries.length > 0) {
      console.log(`Found ${unmatchedEntries.length} entries without valid dates`);
    }
    
    // Write the data to the new sheet
    const sheetRange = `${safeScheduleName}!A1:${String.fromCharCode(64 + headers.length)}${sheetData.length}`;
    console.log(`Writing data to range: ${sheetRange}`);
    
    await updateSheetData(
      GOOGLE_SHEETS_CONFIG.spreadsheetId,
      sheetRange,
      sheetData
    );
    
    // Also register this schedule in a master "schedules" sheet if it exists
    try {
      // Check if "schedules" sheet exists
      const schedulesSheet = sheets.find(sheet => sheet.title === 'schedules');
      
      if (!schedulesSheet) {
        // Create a schedules master sheet if it doesn't exist
        await createSheet(GOOGLE_SHEETS_CONFIG.spreadsheetId, 'schedules', 
          ['Name', 'SheetName', 'CreatedAt', 'EntryCount', 'DateRange', 'Description']);
      }
      
      // Get date range info
      let dateRange = '';
      if (scheduleData.length > 0) {
        const sortedData = [...scheduleData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstDate = sortedData[0].date.split('T')[0];
        const lastDate = sortedData[sortedData.length - 1].date.split('T')[0];
        dateRange = `${firstDate} to ${lastDate}`;
      }
      
      // Add this schedule to the master list
      const now = new Date().toISOString();
      
      // First, get existing schedule data to determine next row
      const existingSchedules = await getSheetData(
        GOOGLE_SHEETS_CONFIG.spreadsheetId,
        'schedules!A:F'
      );
      
      console.log(`Found ${existingSchedules ? existingSchedules.length : 0} existing schedules in master list`);
      
      // Determine the next row (1-indexed in Sheets API)
      // Row 1 is headers, so we start at row 2 if no data, or after the last row if data exists
      const nextRow = existingSchedules ? existingSchedules.length + 1 : 2;
      console.log(`Adding new schedule to row ${nextRow}`);
      
      // Append the new schedule to the next available row
      await updateSheetData(
        GOOGLE_SHEETS_CONFIG.spreadsheetId,
        `schedules!A${nextRow}:F${nextRow}`,
        [[
          scheduleName,                // Name (original name with spaces)
          safeScheduleName,            // SheetName (sanitized name)
          now,                         // CreatedAt
          entriesAdded.toString(),     // EntryCount
          dateRange,                   // DateRange
          ''                           // Description (empty for now)
        ]]
      );
      
    } catch (error) {
      console.warn('Error registering schedule in master list:', error.message);
      // Continue even if this fails
    }
    
    return { 
      sheetName: safeScheduleName,
      entriesAdded,
      unmatchedEntries: unmatchedEntries.length,
      totalScheduleEntries: scheduleData.length
    };
  } catch (error) {
    console.error('Error creating sheet for schedule:', error);
    throw error;
  }
}
