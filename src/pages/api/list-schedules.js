import { listSheets, getSheetData } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG } from './config.js';

// Environment detection
const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production' || env === 'netlify';
const isDev = env === 'development';
const isServerless = Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);

console.log(`list-schedules.js: Running in ${env} environment (isProduction: ${isProduction})`);

export async function GET({ request }) {
  console.log('============== LIST SCHEDULES ==============');
  console.log('Environment details:');
  console.log('- Is development:', isDev ? 'Yes' : 'No');
  console.log('- Is serverless:', isServerless ? 'Yes' : 'No');
  
  try {
    // First check if we have a schedules master sheet
    let schedules = [];
    
    try {
      const allSheets = await listSheets(GOOGLE_SHEETS_CONFIG.spreadsheetId);
      console.log(`Found ${allSheets.length} sheets in the spreadsheet`);
      
      // Check if we have the schedules master sheet
      const schedulesSheet = allSheets.find(sheet => sheet.title === 'schedules');
      
      if (schedulesSheet) {
        // Get data from the schedules sheet
        const scheduleData = await getSheetData(
          GOOGLE_SHEETS_CONFIG.spreadsheetId,
          'schedules!A:F'
        );
        
        // Skip header row
        if (scheduleData && scheduleData.length > 1) {
          // Extract schedule info from rows
          // Expected columns: Name, SheetName, CreatedAt, EntryCount, DateRange, Description
          schedules = scheduleData.slice(1).map(row => ({
            name: row[0] || '',
            sheetName: row[1] || '',
            createdAt: row[2] || '',
            entryCount: parseInt(row[3]) || 0,
            dateRange: row[4] || '',
            description: row[5] || '',
          }));
        }
      } else {
        // No master schedules sheet, fallback to listing all non-system sheets
        const systemSheets = ['Sheet1', 'schedules'];
        schedules = allSheets
          .filter(sheet => !systemSheets.includes(sheet.title))
          .map(sheet => ({
            name: sheet.title,
            sheetName: sheet.title,
            createdAt: '',
            entryCount: 0,
            dateRange: '',
            description: 'Schedule sheet'
          }));
      }
      
    } catch (error) {
      console.error('Error getting schedules from master sheet:', error);
      // Fall back to just listing all sheets
      const allSheets = await listSheets(GOOGLE_SHEETS_CONFIG.spreadsheetId);
      const systemSheets = ['Sheet1', 'schedules'];
      schedules = allSheets
        .filter(sheet => !systemSheets.includes(sheet.title))
        .map(sheet => ({
          name: sheet.title,
          sheetName: sheet.title,
          createdAt: '',
          entryCount: 0,
          description: 'Schedule sheet'
        }));
    }
    
    return new Response(JSON.stringify({
      success: true,
      schedules: schedules
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error listing schedules:', error);
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
