import { HDate, Event, HebrewCalendar, Locale } from '@hebcal/core';
import axios from 'axios';

export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text?: string;
  hebrewText?: string;
}

export interface ScheduleEntry {
  date: Date;
  hebrewDate: string;
  verses: Verse[];
  isShabbat: boolean;
  dayOfWeek: string;
  ageGroup?: string;
  studyFocus?: string;
}

export interface ScheduleOptions {
  childName: string;
  birthDate: Date;
  startDate: Date;
  endDate: Date;
  extraShabbatContent?: boolean;
  includeHebrewDates?: boolean;
  showVerseContent?: boolean;
}

// Book metadata with verse counts for the entire Tanach
const TORAH_BOOKS = [
  { name: 'Genesis', hebrewName: 'בראשית', chapters: 50, verses: 1533 },
  { name: 'Exodus', hebrewName: 'שמות', chapters: 40, verses: 1209 },
  { name: 'Leviticus', hebrewName: 'ויקרא', chapters: 27, verses: 859 },
  { name: 'Numbers', hebrewName: 'במדבר', chapters: 36, verses: 1288 },
  { name: 'Deuteronomy', hebrewName: 'דברים', chapters: 34, verses: 955 },
];

const NEVIIM_BOOKS = [
  { name: 'Joshua', hebrewName: 'יהושע', chapters: 24, verses: 658 },
  { name: 'Judges', hebrewName: 'שופטים', chapters: 21, verses: 618 },
  { name: 'I Samuel', hebrewName: 'שמואל א', chapters: 31, verses: 810 },
  { name: 'II Samuel', hebrewName: 'שמואל ב', chapters: 24, verses: 695 },
  { name: 'I Kings', hebrewName: 'מלכים א', chapters: 22, verses: 816 },
  { name: 'II Kings', hebrewName: 'מלכים ב', chapters: 25, verses: 719 },
  { name: 'Isaiah', hebrewName: 'ישעיהו', chapters: 66, verses: 1292 },
  { name: 'Jeremiah', hebrewName: 'ירמיהו', chapters: 52, verses: 1364 },
  { name: 'Ezekiel', hebrewName: 'יחזקאל', chapters: 48, verses: 1273 },
  { name: 'Hosea', hebrewName: 'הושע', chapters: 14, verses: 197 },
  { name: 'Joel', hebrewName: 'יואל', chapters: 4, verses: 73 },
  { name: 'Amos', hebrewName: 'עמוס', chapters: 9, verses: 146 },
  { name: 'Obadiah', hebrewName: 'עובדיה', chapters: 1, verses: 21 },
  { name: 'Jonah', hebrewName: 'יונה', chapters: 4, verses: 48 },
  { name: 'Micah', hebrewName: 'מיכה', chapters: 7, verses: 105 },
  { name: 'Nahum', hebrewName: 'נחום', chapters: 3, verses: 47 },
  { name: 'Habakkuk', hebrewName: 'חבקוק', chapters: 3, verses: 56 },
  { name: 'Zephaniah', hebrewName: 'צפניה', chapters: 3, verses: 53 },
  { name: 'Haggai', hebrewName: 'חגי', chapters: 2, verses: 38 },
  { name: 'Zechariah', hebrewName: 'זכריה', chapters: 14, verses: 211 },
  { name: 'Malachi', hebrewName: 'מלאכי', chapters: 3, verses: 55 },
];

const KETUVIM_BOOKS = [
  { name: 'Psalms', hebrewName: 'תהלים', chapters: 150, verses: 2527 },
  { name: 'Proverbs', hebrewName: 'משלי', chapters: 31, verses: 915 },
  { name: 'Job', hebrewName: 'איוב', chapters: 42, verses: 1070 },
  { name: 'Song of Songs', hebrewName: 'שיר השירים', chapters: 8, verses: 117 },
  { name: 'Ruth', hebrewName: 'רות', chapters: 4, verses: 85 },
  { name: 'Lamentations', hebrewName: 'איכה', chapters: 5, verses: 154 },
  { name: 'Ecclesiastes', hebrewName: 'קהלת', chapters: 12, verses: 222 },
  { name: 'Esther', hebrewName: 'אסתר', chapters: 10, verses: 167 },
  { name: 'Daniel', hebrewName: 'דניאל', chapters: 12, verses: 357 },
  { name: 'Ezra', hebrewName: 'עזרא', chapters: 10, verses: 280 },
  { name: 'Nehemiah', hebrewName: 'נחמיה', chapters: 13, verses: 406 },
  { name: 'I Chronicles', hebrewName: 'דברי הימים א', chapters: 29, verses: 943 },
  { name: 'II Chronicles', hebrewName: 'דברי הימים ב', chapters: 36, verses: 822 },
];

const ALL_BOOKS = [...TORAH_BOOKS, ...NEVIIM_BOOKS, ...KETUVIM_BOOKS];
const TOTAL_VERSES = ALL_BOOKS.reduce((sum, book) => sum + book.verses, 0);

// Helper function to get Hebrew date string
function getHebrewDateString(date: Date): string {
  const hdate = new HDate(date);
  const day = hdate.getDate();
  const month = hdate.getMonthNameHeb();
  const year = hdate.getFullYear();
  const dayOfWeek = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'][hdate.getDay()];
  
  return `${day} ${month} ${year}, ${dayOfWeek}`;
}

// Helper to get verses from Sefaria API
async function getVerseText(book: string, chapter: number, verse: number): Promise<{he: string, en: string} | null> {
  try {
    const ref = `${book}.${chapter}.${verse}`;
    const response = await axios.get(`https://www.sefaria.org/api/texts/${ref}?commentary=0&context=0`);
    return {
      he: response.data.he,
      en: response.data.text
    };
  } catch (error) {
    console.error(`Error fetching verse ${book} ${chapter}:${verse}:`, error);
    return null;
  }
}

// Main function to generate the schedule
export async function generateTorahSchedule(
  options: ScheduleOptions
): Promise<ScheduleEntry[]> {
  const {
    childName,
    birthDate,
    startDate,
    endDate,
    extraShabbatContent = false,
    includeHebrewDates = true,
    showVerseContent = false
  } = options;

  // Calculate total study days (excluding Shabbat if needed)
  const start = new Date(startDate);
  const end = new Date(endDate);
  let currentDate = new Date(start);
  let studyDays = 0;
  
  // Count study days (excluding Shabbat)
  while (currentDate <= end) {
    if (currentDate.getDay() !== 6) { // Not Shabbat
      studyDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Calculate verses per day
  const versesPerDay = Math.ceil(TOTAL_VERSES / studyDays);
  
  // Generate schedule
  const schedule: ScheduleEntry[] = [];
  currentDate = new Date(start);
  let currentVerseIndex = 0;
  
  // Iterate through each book and chapter to create verse list
  const allVerses: {book: string; chapter: number; verse: number}[] = [];
  
  for (const book of ALL_BOOKS) {
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      // Get verse count for this chapter (simplified - in reality, you'd need the actual verse counts per chapter)
      const verseCount = Math.ceil(book.verses / book.chapters);
      for (let verse = 1; verse <= verseCount; verse++) {
        allVerses.push({
          book: book.name,
          chapter,
          verse
        });
      }
    }
  }
  
  // Create daily schedule
  currentDate = new Date(start);
  
  while (currentDate <= end && currentVerseIndex < allVerses.length) {
    const isShabbat = currentDate.getDay() === 6; // Saturday
    
    if (!isShabbat || extraShabbatContent) {
      // Get verses for this day
      const dayVerses = allVerses.slice(currentVerseIndex, currentVerseIndex + versesPerDay);
      currentVerseIndex += versesPerDay;
      
      // Fetch verse content if needed
      let verses: Verse[] = [];
      
      if (showVerseContent) {
        // Fetch content for each verse
        for (const verse of dayVerses) {
          const verseContent = await getVerseText(verse.book, verse.chapter, verse.verse);
          verses.push({
            book: verse.book,
            chapter: verse.chapter,
            verse: verse.verse,
            text: verseContent?.en || '',
            hebrewText: verseContent?.he || ''
          });
        }
      } else {
        // Just add references without content
        verses = dayVerses.map(v => ({
          book: v.book,
          chapter: v.chapter,
          verse: v.verse
        }));
      }
      
      // Add to schedule
      schedule.push({
        date: new Date(currentDate),
        hebrewDate: includeHebrewDates ? getHebrewDateString(currentDate) : '',
        verses,
        isShabbat,
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()],
        ageGroup: getAgeGroup(birthDate, currentDate),
        studyFocus: getStudyFocus(currentDate.getDay())
      });
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return schedule;
}

// Helper to get age group based on birth date
function getAgeGroup(birthDate: Date, currentDate: Date): string {
  const age = currentDate.getFullYear() - birthDate.getFullYear();
  if (age < 5) return 'Pre-Study';
  if (age < 6) return 'Year 1 (Age 5-6)';
  if (age < 7) return 'Year 2 (Age 6-7)';
  if (age < 8) return 'Year 3 (Age 7-8)';
  if (age < 9) return 'Year 4 (Age 8-9)';
  if (age < 10) return 'Year 5 (Age 9-10)';
  return 'Post-Study';
}

// Helper to get study focus based on day of week
function getStudyFocus(dayOfWeek: number): string {
  const focuses = [
    'Weekly Torah Portion',
    'Neviim (Prophets)',
    'Ketuvim (Writings)',
    'Weekly Torah Portion Review',
    'Neviim (Prophets)',
    'Weekly Preparation',
    'Shabbat' // Shouldn't normally be used as we skip Shabbat
  ];
  return focuses[dayOfWeek];
}

// Format schedule for display
export function formatScheduleForDisplay(schedule: ScheduleEntry[]) {
  return schedule.map(entry => {
    const date = new Date(entry.date);
    const hebrewDate = new HDate(date);
    
    return {
      ...entry,
      formattedDate: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      hebrewDate: hebrewDate.toString('h') + ' ' + 
                 hebrewDate.getMonthName() + ' ' + 
                 hebrewDate.getFullYear(),
      verses: entry.verses.map(v => ({
        ref: `${v.book} ${v.chapter}:${v.verse}`,
        text: v.hebrewText || v.text || ''
      }))
    };
  });
}

// Generate LaTeX source for the schedule
export function generateLatexSource(schedule: ScheduleEntry[], childName: string): string {
  let latex = `
\documentclass[12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage{geometry}
\usepackage{fontspec}
\usepackage{polyglossia}
\setmainfont{David CLM}
\newfontfamily\hebrewfont{David CLM}
\setdefaultlanguage{hebrew}
\setotherlanguage{english}
\geometry{a4paper, margin=2cm}
\title{לוח תוכנית לימוד תורה לילד/ה}
\author{${childName}}
\begin{document}
\maketitle
\begin{center}
\begin{tabular}{|l|p{10cm}|}
\hline
\textbf{תאריך} & \textbf{פרשת השבוע} \\
\hline
`;

  schedule.forEach(entry => {
    const date = new Date(entry.date);
    const dateStr = date.toLocaleDateString('he-IL');
    const hebrewDate = new HDate(date);
    const hebrewDateStr = hebrewDate.toString('h') + ' ' + 
                         hebrewDate.getMonthName() + ' ' + 
                         hebrewDate.getFullYear();
    
    const verseRefs = entry.verses
      .map(v => `${v.book} ${v.chapter}:${v.verse}`)
      .join(', ');
    
    latex += `${dateStr} (${hebrewDateStr}) & ${verseRefs} \\
\hline
`;
  });

  latex += `\end{tabular}
\end{center}
\end{document}`;

  return latex;
}

export default generateTorahSchedule;
