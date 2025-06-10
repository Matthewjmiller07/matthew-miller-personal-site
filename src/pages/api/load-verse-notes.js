import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export async function GET({ request }) {
  try {
    // Get the date from the query parameters
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    
    if (!date) {
      return new Response(JSON.stringify({ error: 'Date parameter is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Read the CSV file
    const csvFilePath = path.join(process.cwd(), 'public', 'aviya.csv');
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log('Looking for date:', date);
    
    // Clean the date (remove time component if present)
    const normalizedDate = date.split('T')[0]; // Ensure we just have YYYY-MM-DD
    
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
        console.error('Date parsing error for', r.Date, e);
        return false;
      }
    });
    
    if (!record) {
      return new Response(JSON.stringify({ error: 'Date not found in schedule' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Check if we have verse notes for this date
    let verseNotes = {};
    if (record.VerseNotes) {
      try {
        verseNotes = JSON.parse(record.VerseNotes);
      } catch (e) {
        console.error('Error parsing verse notes:', e);
        // Continue with empty verse notes if parsing fails
      }
    }
    
    // Include the general notes from the Notes column
    const notes = record.Notes || '';
    
    return new Response(JSON.stringify({ verseNotes, notes }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Error retrieving verse notes:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
