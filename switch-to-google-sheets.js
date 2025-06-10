// Simple script to switch between local CSV and Google Sheets implementations

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to original files and new implementations
const files = [
  {
    original: path.join(__dirname, 'src/pages/api/load-verse-notes.js'),
    new: path.join(__dirname, 'src/pages/api/load-verse-notes-new.js'),
    backup: path.join(__dirname, 'src/pages/api/load-verse-notes-backup.js')
  },
  {
    original: path.join(__dirname, 'src/pages/api/save-verse-notes.js'),
    new: path.join(__dirname, 'src/pages/api/save-verse-notes-new.js'),
    backup: path.join(__dirname, 'src/pages/api/save-verse-notes-backup.js')
  },
  {
    original: path.join(__dirname, 'src/pages/api/delete-image.js'),
    new: path.join(__dirname, 'src/pages/api/delete-image-new.js'),
    backup: path.join(__dirname, 'src/pages/api/delete-image-backup.js')
  }
];

// Function to enable Google Sheets implementation
function enableGoogleSheets() {
  for (const file of files) {
    try {
      // Create backup of original file if it exists and no backup exists yet
      if (fs.existsSync(file.original) && !fs.existsSync(file.backup)) {
        fs.copyFileSync(file.original, file.backup);
        console.log(`✅ Created backup of ${path.basename(file.original)}`);
      }
      
      // Copy new implementation to original location
      if (fs.existsSync(file.new)) {
        fs.copyFileSync(file.new, file.original);
        console.log(`✅ Switched to Google Sheets implementation for ${path.basename(file.original)}`);
      } else {
        console.error(`❌ New implementation not found: ${path.basename(file.new)}`);
      }
    } catch (err) {
      console.error(`❌ Error processing ${path.basename(file.original)}: ${err.message}`);
    }
  }
  
  console.log('\n✅ Google Sheets integration is now enabled!');
  console.log('To revert back to local CSV implementation, run:');
  console.log('node switch-to-google-sheets.js --revert');
}

// Function to revert back to original implementation
function revertToOriginal() {
  for (const file of files) {
    try {
      // Restore from backup if it exists
      if (fs.existsSync(file.backup)) {
        fs.copyFileSync(file.backup, file.original);
        console.log(`✅ Reverted ${path.basename(file.original)} to original implementation`);
      } else {
        console.error(`❌ Backup not found for ${path.basename(file.original)}`);
      }
    } catch (err) {
      console.error(`❌ Error reverting ${path.basename(file.original)}: ${err.message}`);
    }
  }
  
  console.log('\n✅ Reverted back to original implementation!');
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--revert')) {
  revertToOriginal();
} else {
  enableGoogleSheets();
}
