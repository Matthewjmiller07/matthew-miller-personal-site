import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export async function POST({ request }) {
  try {
    // Parse the request body
    const body = await request.json();
    const { date, verseNotes } = body;
    
    if (!date || !verseNotes || Object.keys(verseNotes).length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid data' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log(`Processing save verse notes for date: ${date}`);
    
    // Make sure we're using a clean date format (YYYY-MM-DD)
    const normalizedDate = date.split('T')[0]; // Remove any time component
    
    // Read the CSV file
    const csvFilePath = path.join(process.cwd(), 'public', 'aviya.csv');
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
    
    // Update the record with verse notes
    const record = records[recordIndex];
    
    // Ensure we have a VerseNotes column in our records
    if (!record.hasOwnProperty('VerseNotes')) {
      // Add the VerseNotes column to all records
      records.forEach(r => {
        r.VerseNotes = '';
      });
    }
    
    // Store verse notes as JSON
    record.VerseNotes = JSON.stringify(verseNotes);
    
    // Make sure we're preserving the existing Notes column
    if (record.Notes === undefined) {
      record.Notes = '';
    }
    
    // Write back to CSV
    const columns = Object.keys(records[0]);
    // Ensure we have all the key columns in the right order
    const essentialColumns = ['Date', 'Day of Week', 'Reading', 'Notes', 'Images', 'VerseNotes'];
    essentialColumns.forEach(col => {
      if (!columns.includes(col) && col !== 'VerseNotes') {
        columns.push(col);
      }
    });
    
    const csv = stringify(records, { header: true, columns });
    fs.writeFileSync(csvFilePath, csv);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
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
