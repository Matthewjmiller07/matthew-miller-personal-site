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
    
    // In production, we need to handle the case where the CSV might be read-only
    // Create data directory if it doesn't exist - this should be writable in most environments
    const dataDir = path.join(process.cwd(), 'data');
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Created data directory at:', dataDir);
      }
    } catch (mkdirError) {
      console.warn('Could not create data directory:', mkdirError.message);
      // Continue with the process as we'll try other locations
    }
    
    // If we're in production, try to use the data directory first
    const dataFilePath = path.join(dataDir, 'aviya.csv');
    let shouldCopyToDataDir = false;
    let sourceFilePath;
    
    // Check for file existence in various locations
    if (fs.existsSync(dataFilePath)) {
      // We have a writable copy in the data dir, use it
      console.log('Using writable CSV in data directory:', dataFilePath);
      csvFilePath = dataFilePath;
    } else if (!fs.existsSync(csvFilePath)) {
      // Look in other locations
      const altPaths = [
        path.join(process.cwd(), 'dist', 'aviya.csv'),
        path.join(process.cwd(), 'aviya.csv')
      ];
      
      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          sourceFilePath = altPath;
          csvFilePath = altPath;
          shouldCopyToDataDir = true;
          console.log('Found CSV at alternate location:', altPath);
          break;
        }
      }
      
      if (!sourceFilePath) {
        console.error('CSV file not found in any expected location');
        return new Response(JSON.stringify({ 
          error: 'CSV file not found', 
          checkedPaths: [
            path.join(process.cwd(), 'public', 'aviya.csv'),
            path.join(process.cwd(), 'dist', 'aviya.csv'),
            path.join(process.cwd(), 'aviya.csv'),
            dataFilePath
          ] 
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // If we should copy to data dir, do it now
      if (shouldCopyToDataDir) {
        try {
          fs.copyFileSync(sourceFilePath, dataFilePath);
          console.log('Copied CSV to data directory for write access');
          // Use the data directory version going forward
          csvFilePath = dataFilePath;
        } catch (copyError) {
          console.warn('Could not copy CSV to data directory:', copyError.message);
          // Continue using the original file path - we'll test write permissions later
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
      // Generate the updated CSV content
      const csv = stringify(records, { header: true });
      
      // Make sure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Created data directory at:', dataDir);
      }
      
      // Choose the best target file path (prefer data directory)
      let targetFilePath = csvFilePath;
      
      // Function to check if a path is writable
      function isWritable(path) {
        try {
          fs.accessSync(path, fs.constants.W_OK);
          return true;
        } catch (error) {
          return false;
        }
      }
      
      // If data path exists, use it, otherwise check if original path is writable
      if (fs.existsSync(dataFilePath)) {
        targetFilePath = dataFilePath;
      } else if (!isWritable(csvFilePath)) {
        targetFilePath = dataFilePath; // Default to data directory if original isn't writable
      }
      
      // Write to the chosen location
      fs.writeFileSync(targetFilePath, csv);
      console.log('Successfully wrote updated CSV to:', targetFilePath);
      
      // If we wrote to the data directory and it's not the same as the source, 
      // try to copy back to original if possible (for consistency)
      if (targetFilePath === dataFilePath && targetFilePath !== csvFilePath && isWritable(csvFilePath)) {
        try {
          fs.copyFileSync(dataFilePath, csvFilePath);
          console.log('Copied updated CSV back to original location:', csvFilePath);
        } catch (copyError) {
          console.warn('Could not copy back to original location, but data was saved:', copyError.message);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Notes saved successfully',
        path: targetFilePath 
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
