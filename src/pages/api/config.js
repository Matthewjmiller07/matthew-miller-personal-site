// Configuration for the Aviya Torah Schedule app

// Environment detection with more resilient checks
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isServerless = Boolean(
  process.env.NETLIFY || 
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_VERSION ||
  process.env.NETLIFY_DEV // Also detect Netlify Dev
);

// Determine if we're in a true serverless environment (not local dev)
const isServerlessMode = isServerless && !isDevelopment;

// Google Sheets configuration
export const GOOGLE_SHEETS_CONFIG = {
  // Default spreadsheet ID - replace this with your actual spreadsheet ID
  // Use environment variable if available, otherwise use default
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '1rscI-ubLqs-4Zg8lWB5SLIHE0ngIUm74zTP2jQZpFnQ',
  
  // The range or tab name where your schedule data is stored
  range: process.env.GOOGLE_SPREADSHEET_RANGE || 'aviya2!A1:Z1000',
  
  // How many retry attempts for Google Sheets operations
  maxRetries: 3,
  
  // Whether to use Google Sheets in production environments
  useInProduction: true,
  
  // Whether to use Google Sheets in development environments
  useInDevelopment: true,
  
  // Whether to fall back to local CSV if Google Sheets fails
  useLocalCsvFallback: true,
};

// Local CSV configuration
export const LOCAL_CSV_CONFIG = {
  // Path to the CSV file (relative to project root)
  // Tried in order of priority
  path: 'data/aviya.csv', // Writable version first
  fallbackPaths: [
    'public/aviya.csv',
    'src/pages/api/aviya.csv'
  ],
};

// Export environment variables for use in other modules
export const ENV = {
  isDevelopment,
  isProduction,
  isServerless,
  isServerlessMode
};

// Should we use Google Sheets based on current environment?
export const shouldUseGoogleSheets = 
  (isProduction && GOOGLE_SHEETS_CONFIG.useInProduction) || 
  (isDevelopment && GOOGLE_SHEETS_CONFIG.useInDevelopment) || 
  // Allow override via environment variable
  process.env.USE_GOOGLE_SHEETS === 'true';
