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
    
    console.log('Loading verse notes using CSV file path:', csvFilePath);
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log('Looking for date:', date);
    
    // Clean the date (remove time component if present)
    const normalizedDate = date.split('T')[0]; // Ensure we just have YYYY-MM-DD
    
    // Find the record with exact date match for the current day
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
    
    // Get the readings for the current day to know which verses we need to look for
    const currentDayReadings = [];
    if (record.Reading) {
      const readingStr = record.Reading.replace(/["']/g, ''); // Remove quotes if present
      currentDayReadings.push(...readingStr.split(',').map(r => r.trim()));
    }
    
    console.log('Current day readings:', currentDayReadings);
    
    // The combined verse notes object we'll return
    let verseNotes = {};
    
    // NEW APPROACH: Fetch verse notes from ALL days in the CSV for the verses we're displaying today
    console.log('Searching all records for notes related to today\'s verses...');
    
    // First, get notes from the current day's record
    if (record.VerseNotes) {
      console.log('Raw VerseNotes found in current day CSV record:', record.VerseNotes);
      try {
        let currentDayNotes = {};
        
        // Check if it's already an object
        if (typeof record.VerseNotes === 'object' && record.VerseNotes !== null) {
          currentDayNotes = record.VerseNotes;
        } else if (record.VerseNotes.trim().startsWith('{')) {
          // Parse JSON string
          currentDayNotes = JSON.parse(record.VerseNotes);
        }
        
        // Add to our combined notes
        verseNotes = {...currentDayNotes};
        console.log('Added notes from current day:', currentDayNotes);
      } catch (e) {
        console.error('Error parsing current day verse notes:', e);
      }
    }
    
    // Then check all other days for notes related to verses we're displaying today
    records.forEach((r, index) => {
      // Skip the current day since we already processed it
      if (r.Date === normalizedDate) return;
      
      // Skip if no verse notes
      if (!r.VerseNotes) return;
      
      try {
        let otherDayNotes = {};
        
        // Parse the verse notes from this day
        if (typeof r.VerseNotes === 'object' && r.VerseNotes !== null) {
          otherDayNotes = r.VerseNotes;
        } else if (r.VerseNotes.trim().startsWith('{')) {
          otherDayNotes = JSON.parse(r.VerseNotes);
        } else {
          return; // Skip if can't parse
        }
        
        // Check if any of the verse references match our current day's readings
        Object.keys(otherDayNotes).forEach(verseRef => {
          if (currentDayReadings.includes(verseRef)) {
            console.log(`Found note for ${verseRef} in record for ${r.Date}`);
            
            // Only add if we don't already have a note for this verse
            // This ensures the current day's notes take precedence
            if (!verseNotes[verseRef]) {
              verseNotes[verseRef] = otherDayNotes[verseRef];
            }
          }
        });
      } catch (e) {
        console.error(`Error processing verse notes from day ${r.Date}:`, e);
      }
    });
    
    console.log('Final combined verse notes:', verseNotes);
    
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
