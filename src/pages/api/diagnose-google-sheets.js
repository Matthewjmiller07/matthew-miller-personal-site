import { getGoogleSheetsClient, getSheetData } from '../../utils/googleSheetsClient.js';
import { GOOGLE_SHEETS_CONFIG, ENV } from './config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function GET() {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV,
        is_production: ENV.isProduction,
        is_development: ENV.isDevelopment,
        is_serverless: ENV.isServerless,
        cwd: process.cwd(),
        dirname: __dirname
      },
      google_sheets: {
        config: {
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          range: GOOGLE_SHEETS_CONFIG.range,
          useInProduction: GOOGLE_SHEETS_CONFIG.useInProduction,
          useInDevelopment: GOOGLE_SHEETS_CONFIG.useInDevelopment
        },
        credentials: {
          env_var_exists: Boolean(process.env.GOOGLE_CREDENTIALS),
          env_var_length: process.env.GOOGLE_CREDENTIALS ? process.env.GOOGLE_CREDENTIALS.length : 0,
          local_credentials_found: false,
          local_credentials_paths: []
        }
      },
      auth_test: {
        status: 'pending'
      }
    };
    
    // Check for local credential files
    const possiblePaths = [
      path.resolve(process.cwd(), 'google-credentials.json'),
      path.resolve(__dirname, '../..', 'google-credentials.json'),
      '/Applications/Apps/matthew-miller-personal-site/google-credentials.json'
    ];
    
    for (const credPath of possiblePaths) {
      try {
        const exists = fs.existsSync(credPath);
        diagnostics.google_sheets.credentials.local_credentials_paths.push({
          path: credPath,
          exists,
          size: exists ? fs.statSync(credPath).size : 0
        });
        
        if (exists) {
          diagnostics.google_sheets.credentials.local_credentials_found = true;
        }
      } catch (e) {
        diagnostics.google_sheets.credentials.local_credentials_paths.push({
          path: credPath,
          exists: false,
          error: e.message
        });
      }
    }
    
    // Test auth
    try {
      console.log('Testing Google Sheets auth...');
      const client = await getGoogleSheetsClient();
      
      diagnostics.auth_test = {
        status: 'success',
        auth_type: client.auth ? client.auth.constructor.name : 'unknown',
        scopes: client.auth ? client.auth._scopes : []
      };
      
      // Try to get sheet data
      try {
        console.log('Testing sheet data fetch...');
        const sheetData = await getSheetData(
          GOOGLE_SHEETS_CONFIG.spreadsheetId,
          GOOGLE_SHEETS_CONFIG.range
        );
        
        diagnostics.sheet_data_test = {
          status: 'success',
          row_count: Array.isArray(sheetData) ? sheetData.length : 0,
          sample_row: Array.isArray(sheetData) && sheetData.length > 0 ? 
            { date: sheetData[0].Date, headers: Object.keys(sheetData[0]) } : null
        };
      } catch (error) {
        diagnostics.sheet_data_test = {
          status: 'error',
          message: error.message,
          code: error.code,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        };
      }
    } catch (error) {
      diagnostics.auth_test = {
        status: 'error',
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      };
    }
    
    return new Response(JSON.stringify(diagnostics, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message,
      stack: err.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
