import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export async function POST({ request }) {
  try {
    // Parse the request body
    const body = await request.json();
    const { date, verseNotes, notes } = body;
    
    if (!date) {
      return new Response(JSON.stringify({ error: 'Date is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Allowing empty notes and verseNotes for cases where we want to clear them
    if (!verseNotes || typeof verseNotes !== 'object') {
      console.warn('No verse notes provided or invalid format');
    }
    
    console.log(`Processing save verse notes for date: ${date}`);
    
    // Make sure we're using a clean date format (YYYY-MM-DD)
    const normalizedDate = date.split('T')[0]; // Remove any time component
    
    // Read the CSV file - handle both dev and production paths
    let csvFilePath = path.join(process.cwd(), 'public', 'aviya.csv');
    
    // Check if the file exists at the standard path
    if (!fs.existsSync(csvFilePath)) {
      // If not found, try the path that might be used in production
      csvFilePath = path.join(process.cwd(), 'dist', 'aviya.csv');
      if (!fs.existsSync(csvFilePath)) {
        // Last resort, try looking for it in the root directory
        csvFilePath = path.join(process.cwd(), 'aviya.csv');
        if (!fs.existsSync(csvFilePath)) {
          console.error('CSV file not found in any expected location');
          return new Response(JSON.stringify({ 
            error: 'CSV file not found', 
            checkedPaths: [
              path.join(process.cwd(), 'public', 'aviya.csv'),
              path.join(process.cwd(), 'dist', 'aviya.csv'),
              path.join(process.cwd(), 'aviya.csv')
            ] 
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    console.log('Using CSV file path:', csvFilePath);
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    // Find the exact record for this date
    const recordIndex = records.findIndex(r => {
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
    
    if (recordIndex === -1) {
      console.error(`Date not found in schedule: ${normalizedDate}`);
      return new Response(JSON.stringify({ 
        error: 'Date not found in schedule', 
        requestedDate: normalizedDate 
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Update the record with verse notes and general notes
    const record = records[recordIndex];
    
    // Ensure we have a VerseNotes column in our records
    if (!record.hasOwnProperty('VerseNotes')) {
      // Add the VerseNotes column to all records
      records.forEach(r => {
        r.VerseNotes = '';
      });
    }
    
    // Store verse notes as JSON
    if (verseNotes && typeof verseNotes === 'object') {
      record.VerseNotes = JSON.stringify(verseNotes);
      console.log('Saved verse notes:', verseNotes);
    }
    
    // Update the general notes if provided
    if (notes !== undefined) {
      record.Notes = notes;
      console.log('Saved general notes:', notes);
    } else if (record.Notes === undefined) {
      // Make sure the Notes column exists
      record.Notes = '';
    }
    
    // Write back to CSV
    // Ensure we have all the key columns in the right order
    const essentialColumns = ['Date', 'Day of Week', 'Reading', 'Notes', 'Images', 'VerseNotes'];
    essentialColumns.forEach(col => {
      if (!records[0].hasOwnProperty(col) && col !== 'VerseNotes') {
        records.forEach(r => {
          r[col] = '';
        });
      }
    });
    
    try {
      const csv = stringify(records, { header: true });
      
      // Check if we have write permissions
      try {
        fs.accessSync(csvFilePath, fs.constants.W_OK);
      } catch (accessError) {
        console.error('No write permission to CSV file:', accessError);
        return new Response(JSON.stringify({ 
          error: 'No write permission to CSV file',
          path: csvFilePath,
          message: accessError.message 
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Write the file
      fs.writeFileSync(csvFilePath, csv);
      console.log('Successfully updated CSV file at:', csvFilePath);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Notes saved successfully',
        path: csvFilePath 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (writeError) {
      console.error('Error writing CSV file:', writeError);
      return new Response(JSON.stringify({ 
        error: 'Error writing to CSV file', 
        message: writeError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('Error saving verse notes:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
