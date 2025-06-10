import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Check if we're running in a Netlify or other serverless environment
// Make sure we're actually checking for truthy values, not just undefined values
const isServerless = Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);
// For local development, always set to false
const isDev = process.env.NODE_ENV === 'development';
const isServerlessMode = isServerless && !isDev;

// Helper to log more details about the environment
function logEnvironmentDetails() {
  console.log('Environment details:');
  console.log('- CWD:', process.cwd());
  console.log('- ENV variables:', Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('KEY')).join(', '));
  console.log('- Platform:', process.platform);
  console.log('- Is serverless:', isServerless ? 'Yes' : 'No');
}

// Function that handles the image deletion logic
export async function POST({ request }) {
  // Log environment details to help with debugging
  logEnvironmentDetails();
  
  try {
    const data = await request.json();
    const { date, imagePath } = data;

    if (!date || !imagePath) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Date and image path are required' 
      }), { status: 400 });
    }
    
    console.log(`Processing delete request for date: ${date}, image: ${imagePath}`);

    // Normalize the date format to YYYY-MM-DD
    let normalizedDate = date;
    if (date.includes('-')) {
      // Already in the right format, just ensure parts are padded correctly
      const [year, month, day] = date.split('-');
      normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    console.log(`Normalized date: ${normalizedDate}`);
    
    // Read the CSV file
    // Try to read from the data directory first (it will have the most up-to-date copy if it exists)
    const dataDir = path.join(process.cwd(), 'data');
    const dataFilePath = path.join(dataDir, 'aviya.csv');
    let csvFilePath = path.join(process.cwd(), 'public', 'aviya.csv');
    
    // Check possible locations in priority order
    const possiblePaths = [
      dataFilePath,                                // Data directory (writable version)
      path.join(process.cwd(), 'public', 'aviya.csv'), // Development
      path.join(process.cwd(), 'dist', 'aviya.csv'),   // Production build
      path.join(process.cwd(), 'aviya.csv')            // Root directory
    ];
    
    let fileFound = false;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        csvFilePath = possiblePath;
        fileFound = true;
        console.log('Found CSV file at:', possiblePath);
        break;
      }
    }
    
    if (!fileFound) {
      console.error('CSV file not found in any expected location');
      return new Response(JSON.stringify({ 
        error: 'CSV file not found', 
        checkedPaths: possiblePaths
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const csv = fs.readFileSync(csvFilePath, 'utf8');
    const records = parse(csv, { columns: true, skip_empty_lines: true });
    
    // Find the record for the given date
    const record = records.find(r => r.Date === normalizedDate);
    if (!record) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `No record found for date: ${normalizedDate}` 
      }), { status: 404 });
    }
    
    // Parse the images from the record
    let images = [];
    if (record.Images) {
      try {
        // Try to parse as JSON first
        if (record.Images.startsWith('[')) {
          images = JSON.parse(record.Images);
        } else if (record.Images.includes(',')) {
          // Otherwise, split by commas if present
          images = record.Images.split(',').map(img => img.trim());
        } else {
          // Single image
          images = [record.Images.trim()];
        }
      } catch (error) {
        console.error('Error parsing images from record:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to parse images from record' 
        }), { status: 500 });
      }
    }
    
    console.log(`Current images: ${JSON.stringify(images)}`);
    
    // Find and remove the image from the array
    const index = images.findIndex(img => {
      // Compare cleaned paths - remove leading slash if present
      const cleanImg = img.startsWith('/') ? img.substring(1) : img;
      const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
      
      // Handle various path formats
      return cleanImg === cleanPath || 
             cleanImg === 'images/aviya/' + path.basename(cleanPath) ||
             cleanImg === '/images/aviya/' + path.basename(cleanPath) ||
             path.basename(cleanImg) === path.basename(cleanPath);
    });
    
    if (index === -1) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Image not found in record: ${imagePath}` 
      }), { status: 404 });
    }
    
    console.log(`Found image at index ${index}, removing it`);
    
    // Remove the image from the array
    const removedImage = images.splice(index, 1)[0];
    
    // Try to delete the actual image file if it's a local file
    if (removedImage && !removedImage.startsWith('http')) {
      try {
        const imageFilePath = path.join(
          process.cwd(), 
          'public', 
          removedImage.startsWith('/') ? removedImage.substring(1) : removedImage
        );
        
        console.log(`Attempting to delete file: ${imageFilePath}`);
        
        // Check if we're in a serverless environment where filesystem operations may be restricted
        if (isServerlessMode) {
          console.log('Serverless environment detected - simulating image deletion');
          // In serverless environment, we'll simulate the deletion but not actually perform it
          // since filesystem operations may be restricted or temporary
          return new Response(JSON.stringify({
            success: true,
            simulated: true,
            message: 'Image deletion simulated in serverless environment',
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Check if file exists
        if (fs.existsSync(imageFilePath)) {
          // Delete the file from the filesystem
          fs.unlinkSync(imageFilePath);
        }
        
        console.log(`Image deleted successfully at ${imageFilePath}`);
      } catch (fileError) {
        console.error('Error deleting image file:', fileError);
        // Continue with CSV update even if file deletion fails
      }
    }
    
    // Update the record with the modified images array
    record.Images = images.length > 0 ? JSON.stringify(images) : '';
    
    // Always try to write to the data directory version if possible
    try {
      // Make sure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Created data directory at:', dataDir);
      }
      
      // Generate the updated CSV content
      const updatedCsv = stringify(records, { header: true });
      
      // Choose the target file path (prefer data directory)
      const targetFilePath = fs.existsSync(dataFilePath) ? dataFilePath : 
                          (fs.existsSync(csvFilePath) && isWritable(csvFilePath)) ? csvFilePath : 
                          dataFilePath;
      
      // Write to the chosen location
      fs.writeFileSync(targetFilePath, updatedCsv);
      console.log('Successfully wrote updated CSV to:', targetFilePath);
      
      // If we wrote to the data directory and it's not the same as the source, copy back to original if possible
      if (targetFilePath === dataFilePath && targetFilePath !== csvFilePath && isWritable(csvFilePath)) {
        try {
          fs.copyFileSync(dataFilePath, csvFilePath);
          console.log('Copied updated CSV back to original location:', csvFilePath);
        } catch (copyError) {
          console.warn('Could not copy back to original location, but data was saved:', copyError.message);
        }
      }
    } catch (writeError) {
      console.error('Failed to write CSV file:', writeError);
      return new Response(JSON.stringify({
        error: 'Failed to write CSV file',
        message: writeError.message
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Helper function to check if a path is writable
    function isWritable(path) {
      try {
        fs.accessSync(path, fs.constants.W_OK);
        return true;
      } catch (error) {
        return false;
      }
    }
    
    console.log(`Successfully updated CSV. Remaining images: ${record.Images}`);
    
    return new Response(JSON.stringify({ 
      success: true,
      remainingImages: images
    }), { status: 200 });
    
  } catch (error) {
    console.error('Error in delete-image.js:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500 });
  }
}
