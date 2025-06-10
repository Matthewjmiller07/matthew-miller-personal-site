import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Function that handles the image deletion logic
export async function POST({ request }) {
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
    const csvFilePath = path.join(process.cwd(), 'public', 'aviya.csv');
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
        
        if (fs.existsSync(imageFilePath)) {
          fs.unlinkSync(imageFilePath);
          console.log(`Deleted file: ${imageFilePath}`);
        } else {
          console.log(`File not found: ${imageFilePath}`);
        }
      } catch (fileError) {
        console.error('Error deleting image file:', fileError);
        // Continue with CSV update even if file deletion fails
      }
    }
    
    // Update the record with the modified images array
    record.Images = images.length > 0 ? JSON.stringify(images) : '';
    
    // Write the updated CSV back to the file
    const updatedCsv = stringify(records, { header: true });
    fs.writeFileSync(csvFilePath, updatedCsv);
    
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
