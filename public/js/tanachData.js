/**
 * Tanach Reference Data - Contains verse counts for biblical books
 * Used to validate references before API calls
 */

// Store chapter and verse counts for all books in Tanach
// Define as window property, not as local variable to avoid redeclaration
window.tanachData = window.tanachData || {
  // Will be populated from CSV
  books: {},
  
  // Load the data from CSV file
  async loadFromCSV() {
    try {
      const response = await fetch('/Parsha Tracking Sheet - Chapters of Tanach - Parsha Tracking Sheet - Chapters of Tanach (1).csv');
      if (!response.ok) {
        throw new Error(`Failed to load Tanach data: ${response.status}`);
      }
      
      const csvText = await response.text();
      const rows = csvText.split('\n').map(row => row.split(','));
      
      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 4) continue;
        
        const dataType = row[0]?.trim();
        if (dataType !== 'Bible') continue;
        
        const book = row[1]?.trim();
        const chapter = parseInt(row[2]?.trim(), 10);
        const verseCount = parseInt(row[3]?.trim(), 10);
        
        if (!book || isNaN(chapter) || isNaN(verseCount)) continue;
        
        if (!this.books[book]) {
          this.books[book] = {};
        }
        
        this.books[book][chapter] = verseCount;
      }
      
      console.log('Loaded Tanach reference data:', Object.keys(this.books).length, 'books');
      return true;
    } catch (error) {
      console.error('Error loading Tanach data:', error);
      return false;
    }
  },
  
  // Check if a reference is valid
  isValidReference(book, chapter, verse) {
    if (!this.books[book]) {
      console.warn(`Book "${book}" not found in reference data`);
      return false;
    }
    
    if (!this.books[book][chapter]) {
      console.warn(`Chapter ${chapter} not found in book "${book}"`);
      return false;
    }
    
    const maxVerse = this.books[book][chapter];
    if (verse > maxVerse) {
      console.warn(`Verse ${verse} exceeds maximum (${maxVerse}) for ${book} ${chapter}`);
      return false;
    }
    
    return true;
  },
  
  // Parse a reference string and check if it's valid
  parseReference(referenceString) {
    // Format expected: "BookName Chapter:Verse" or "BookName Chapter:VerseStart-VerseEnd"
    try {
      // Handle multi-part book names like "I Kings"
      const parts = referenceString.split(' ');
      let book, chapterVersePart;
      
      if (parts.length >= 2) {
        // Check if it starts with "I " or "II "
        if (parts[0] === 'I' || parts[0] === 'II') {
          book = parts[0] + ' ' + parts[1];
          chapterVersePart = parts.slice(2).join(' ');
        } else {
          book = parts[0];
          chapterVersePart = parts.slice(1).join(' ');
        }
      } else {
        return null; // Invalid format
      }
      
      // Parse chapter:verse format
      const [chapterStr, verseStr] = chapterVersePart.split(':');
      if (!chapterStr || !verseStr) return null;
      
      const chapter = parseInt(chapterStr, 10);
      
      // Handle verse range (e.g., "1-10")
      if (verseStr.includes('-')) {
        const [startVerse, endVerse] = verseStr.split('-').map(v => parseInt(v, 10));
        
        // Validate start and end verses
        const maxVerse = this.books[book]?.[chapter] || 0;
        
        if (isNaN(startVerse) || isNaN(endVerse) || 
            startVerse < 1 || endVerse > maxVerse || 
            startVerse > endVerse) {
          console.warn(`Invalid verse range ${startVerse}-${endVerse} for ${book} ${chapter}`);
          return null;
        }
        
        return {
          book,
          chapter,
          startVerse,
          endVerse,
          isRange: true
        };
      } else {
        // Single verse
        const verse = parseInt(verseStr, 10);
        if (!this.isValidReference(book, chapter, verse)) {
          return null;
        }
        
        return {
          book,
          chapter,
          startVerse: verse,
          endVerse: verse,
          isRange: false
        };
      }
    } catch (err) {
      console.error('Error parsing reference:', err);
      return null;
    }
  },
  
  // Get maximum verse for a given book and chapter
  getMaxVerse(book, chapter) {
    return this.books[book]?.[chapter] || 0;
  }
};

// Object is already exported as window.tanachData
