import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomUUID } from 'crypto';

// For __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function POST({ request }) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const date = formData.get('date');
    const imageFile = formData.get('image');
    
    if (!date || !imageFile) {
      return new Response(JSON.stringify({ error: 'Missing date or image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'images', 'aviya');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Generate unique filename
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${randomUUID()}.${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);
    
    // Save the file
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    
    // Relative path for the image (to store in CSV)
    const imageUrl = `/images/aviya/${fileName}`;
    
    // Update the CSV file
    const csvFilePath = path.join(process.cwd(), 'public', 'aviya.csv');
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true });
    
    // Clean the date (remove time component if present)
    const normalizedDate = date.split('T')[0]; // Ensure we just have YYYY-MM-DD
    console.log(`Looking for exact date match: ${normalizedDate}`);
    
    // Find the record with exact date match
    const record = records.find(r => {
      try {
        // Direct string comparison
        if (r.Date === normalizedDate) {
          console.log('Exact date match found!');
          return true;
        }
        
        // Compare just the date part (ignoring time component if present)
        const recordDateStr = r.Date.split('T')[0];
        if (recordDateStr === normalizedDate) {
          console.log('Date match found after normalizing!');
          return true;
        }
        
        return false;
      } catch (e) {
        console.error('Error comparing dates:', e);
        return false;
      }
    });
    
    if (!record) {
      return new Response(JSON.stringify({ 
        error: 'Date not found in CSV', 
        requestedDate: normalizedDate 
      }), {
        status: 404, 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update the Images column
    let images = [];
    if (record.Images) {
      try {
        // Try to parse as JSON
        if (record.Images.startsWith('[')) {
          images = JSON.parse(record.Images);
        } else if (record.Images.includes(',')) {
          // Handle comma-separated values
          images = record.Images.split(',').map(img => img.trim());
        } else {
          // Single value
          images = [record.Images.trim()];
        }
      } catch (e) {
        console.error('Error parsing existing images:', e);
        images = record.Images ? [record.Images] : [];
      }
    }
    
    // Add the new image URL
    images.push(imageUrl);
    
    // Store images back as JSON
    record.Images = JSON.stringify(images);
    
    // Write back to CSV
    const columns = Object.keys(records[0]);
    const csv = stringify(records, { header: true, columns });
    fs.writeFileSync(csvFilePath, csv);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Image uploaded successfully',
      imageUrl,
      images
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error uploading image:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
