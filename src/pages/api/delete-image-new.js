import fs from 'fs';
import path from 'path';
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
    const { date, imagePath } = await request.json();
    
    if (!date || !imagePath) {
      return new Response(JSON.stringify({
        error: 'Date and imagePath parameters are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Request to delete image: ${imagePath} for date: ${date}`);
    
    // In serverless environments, we can't perform file operations
    // but we can inform the client that the deletion will be simulated
    if (isServerlessMode) {
      console.log('Running in serverless environment - simulating image deletion');
      return new Response(JSON.stringify({
        success: true,
        simulated: true,
        message: 'Image deletion simulated (serverless environment)',
        imagePath
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For local environment, actually delete the file
    try {
      // First, verify the path is valid
      if (!imagePath.startsWith('/') || imagePath.includes('..')) {
        throw new Error('Invalid image path');
      }
      
      // Remove leading slash to make path relative to project root
      const relativePath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
      const imageFilePath = path.join(process.cwd(), relativePath);
      
      console.log(`Attempting to delete file: ${imageFilePath}`);
      
      // Check if file exists
      if (!fs.existsSync(imageFilePath)) {
        throw new Error('File not found');
      }
      
      // Delete the file
      fs.unlinkSync(imageFilePath);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Image deleted successfully',
        imagePath
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to delete image: ${error.message}`,
        imagePath
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
