/**
 * Torah Schedule Creator - Data Module
 * Contains all the data structures for Tanach books and Mishnah tractates
 */

// Chidon curriculum data
const chidonData = {
    // Middle School Division (Grades 6-8)
    middleSchool: {
        parts: [
            {
                id: 'ms-part1',
                name: 'Part 1: Deuteronomy',
                books: [
                    { name: "Deuteronomy", hebrewName: "דברים", chapters: 34, fullBook: true }
                ]
            },
            {
                id: 'ms-part2',
                name: 'Part 2: I Samuel',
                books: [
                    { name: "I Samuel", hebrewName: "שמואל א", chapters: 31, fullBook: true }
                ]
            },
            {
                id: 'ms-part3',
                name: 'Part 3: Ruth',
                books: [
                    { name: "Ruth", hebrewName: "רות", chapters: 4, fullBook: true }
                ]
            },
            {
                id: 'ms-part4',
                name: 'Part 4: I Chronicles (Selected)',
                books: [
                    { name: "I Chronicles", hebrewName: "דברי הימים א", chapters: null, customChapters: [13, 14, 15, 16, 17, 21, 22, 28, 29] }
                ]
            }
        ],
        getAllBooks: function() {
            return this.parts.flatMap(part => part.books);
        }
    },
    
    // High School Division (Grades 9-12)
    highSchool: {
        parts: [
            {
                id: 'hs-part1',
                name: 'Part 1: Deuteronomy',
                books: [
                    { name: "Deuteronomy", hebrewName: "דברים", chapters: 34, fullBook: true }
                ]
            },
            {
                id: 'hs-part2',
                name: 'Part 2: I Samuel',
                books: [
                    { name: "I Samuel", hebrewName: "שמואל א", chapters: 31, fullBook: true }
                ]
            },
            {
                id: 'hs-part3',
                name: 'Part 3: Ruth',
                books: [
                    { name: "Ruth", hebrewName: "רות", chapters: 4, fullBook: true }
                ]
            },
            {
                id: 'hs-part4',
                name: 'Part 4: I Chronicles (Selected)',
                books: [
                    { name: "I Chronicles", hebrewName: "דברי הימים א", chapters: null, customChapters: [13, 14, 15, 16, 17, 21, 22, 28, 29] }
                ]
            },
            {
                id: 'hs-part5',
                name: 'Part 5: Jeremiah (Selected)',
                books: [
                    { name: "Jeremiah", hebrewName: "ירמיה", chapters: null, customChapters: [1, 2].concat([...Array(19).keys()].map(i => i + 18)) } // Chapters 1-2, 18-36
                ]
            }
        ],
        getAllBooks: function() {
            return this.parts.flatMap(part => part.books);
        }
    }
};

// Tanach data organization
const tanachData = {
    // Torah (Five Books of Moses)
    torah: [
        { name: "Genesis", hebrewName: "בראשית", chapters: 50 },
        { name: "Exodus", hebrewName: "שמות", chapters: 40 },
        { name: "Leviticus", hebrewName: "ויקרא", chapters: 27 },
        { name: "Numbers", hebrewName: "במדבר", chapters: 36 },
        { name: "Deuteronomy", hebrewName: "דברים", chapters: 34 }
    ],
    
    // Nevi'im (Prophets)
    neviim: [
        { name: "Joshua", hebrewName: "יהושע", chapters: 24 },
        { name: "Judges", hebrewName: "שופטים", chapters: 21 },
        { name: "I Samuel", hebrewName: "שמואל א", chapters: 31 },
        { name: "II Samuel", hebrewName: "שמואל ב", chapters: 24 },
        { name: "I Kings", hebrewName: "מלכים א", chapters: 22 },
        { name: "II Kings", hebrewName: "מלכים ב", chapters: 25 },
        { name: "Isaiah", hebrewName: "ישעיה", chapters: 66 },
        { name: "Jeremiah", hebrewName: "ירמיה", chapters: 52 },
        { name: "Ezekiel", hebrewName: "יחזקאל", chapters: 48 },
        { name: "Hosea", hebrewName: "הושע", chapters: 14 },
        { name: "Joel", hebrewName: "יואל", chapters: 4 },
        { name: "Amos", hebrewName: "עמוס", chapters: 9 },
        { name: "Obadiah", hebrewName: "עובדיה", chapters: 1 },
        { name: "Jonah", hebrewName: "יונה", chapters: 4 },
        { name: "Micah", hebrewName: "מיכה", chapters: 7 },
        { name: "Nahum", hebrewName: "נחום", chapters: 3 },
        { name: "Habakkuk", hebrewName: "חבקוק", chapters: 3 },
        { name: "Zephaniah", hebrewName: "צפניה", chapters: 3 },
        { name: "Haggai", hebrewName: "חגי", chapters: 2 },
        { name: "Zechariah", hebrewName: "זכריה", chapters: 14 },
        { name: "Malachi", hebrewName: "מלאכי", chapters: 3 }
    ],
    
    // Ketuvim (Writings)
    ketuvim: [
        { name: "Psalms", hebrewName: "תהלים", chapters: 150 },
        { name: "Proverbs", hebrewName: "משלי", chapters: 31 },
        { name: "Job", hebrewName: "איוב", chapters: 42 },
        { name: "Song of Songs", hebrewName: "שיר השירים", chapters: 8 },
        { name: "Ruth", hebrewName: "רות", chapters: 4 },
        { name: "Lamentations", hebrewName: "איכה", chapters: 5 },
        { name: "Ecclesiastes", hebrewName: "קהלת", chapters: 12 },
        { name: "Esther", hebrewName: "אסתר", chapters: 10 },
        { name: "Daniel", hebrewName: "דניאל", chapters: 12 },
        { name: "Ezra", hebrewName: "עזרא", chapters: 10 },
        { name: "Nehemiah", hebrewName: "נחמיה", chapters: 13 },
        { name: "I Chronicles", hebrewName: "דברי הימים א", chapters: 29 },
        { name: "II Chronicles", hebrewName: "דברי הימים ב", chapters: 36 }
    ]
};

// Mishnah data organization by Seder (Order) and Tractate
const mishnayotData = {
    // Zeraim (Seeds) - Agricultural laws
    zeraim: [
        { name: "Berachot", hebrewName: "ברכות", chapters: 9 },
        { name: "Peah", hebrewName: "פאה", chapters: 8 },
        { name: "Damai", hebrewName: "דמאי", chapters: 7 },
        { name: "Kilayim", hebrewName: "כלאים", chapters: 9 },
        { name: "Sheviit", hebrewName: "שביעית", chapters: 10 },
        { name: "Terumot", hebrewName: "תרומות", chapters: 11 },
        { name: "Maasrot", hebrewName: "מעשרות", chapters: 5 },
        { name: "Maaser Sheni", hebrewName: "מעשר שני", chapters: 5 },
        { name: "Challah", hebrewName: "חלה", chapters: 4 },
        { name: "Orlah", hebrewName: "ערלה", chapters: 3 },
        { name: "Bikkurim", hebrewName: "ביכורים", chapters: 4 }
    ],
    
    // Moed (Festival) - Laws of Shabbat and Festivals
    moed: [
        { name: "Shabbat", hebrewName: "שבת", chapters: 24 },
        { name: "Eruvin", hebrewName: "עירובין", chapters: 10 },
        { name: "Pesachim", hebrewName: "פסחים", chapters: 10 },
        { name: "Shekalim", hebrewName: "שקלים", chapters: 8 },
        { name: "Yoma", hebrewName: "יומא", chapters: 8 },
        { name: "Sukkah", hebrewName: "סוכה", chapters: 5 },
        { name: "Beitzah", hebrewName: "ביצה", chapters: 5 },
        { name: "Rosh Hashanah", hebrewName: "ראש השנה", chapters: 4 },
        { name: "Taanit", hebrewName: "תענית", chapters: 4 },
        { name: "Megillah", hebrewName: "מגילה", chapters: 4 },
        { name: "Moed Katan", hebrewName: "מועד קטן", chapters: 3 },
        { name: "Chagigah", hebrewName: "חגיגה", chapters: 3 }
    ],
    
    // Nashim (Women) - Laws related to marriage and divorce
    nashim: [
        { name: "Yevamot", hebrewName: "יבמות", chapters: 16 },
        { name: "Ketubot", hebrewName: "כתובות", chapters: 13 },
        { name: "Nedarim", hebrewName: "נדרים", chapters: 11 },
        { name: "Nazir", hebrewName: "נזיר", chapters: 9 },
        { name: "Sotah", hebrewName: "סוטה", chapters: 9 },
        { name: "Gittin", hebrewName: "גיטין", chapters: 9 },
        { name: "Kiddushin", hebrewName: "קידושין", chapters: 4 }
    ],
    
    // Nezikin (Damages) - Civil and criminal law
    nezikin: [
        { name: "Bava Kamma", hebrewName: "בבא קמא", chapters: 10 },
        { name: "Bava Metzia", hebrewName: "בבא מציעא", chapters: 10 },
        { name: "Bava Batra", hebrewName: "בבא בתרא", chapters: 10 },
        { name: "Sanhedrin", hebrewName: "סנהדרין", chapters: 11 },
        { name: "Makkot", hebrewName: "מכות", chapters: 3 },
        { name: "Shevuot", hebrewName: "שבועות", chapters: 8 },
        { name: "Eduyot", hebrewName: "עדויות", chapters: 8 },
        { name: "Avodah Zarah", hebrewName: "עבודה זרה", chapters: 5 },
        { name: "Avot", hebrewName: "אבות", chapters: 6 },
        { name: "Horayot", hebrewName: "הוריות", chapters: 3 }
    ],
    
    // Kodashim (Holy things) - Temple service and sacrifices
    kodashim: [
        { name: "Zevachim", hebrewName: "זבחים", chapters: 14 },
        { name: "Menachot", hebrewName: "מנחות", chapters: 13 },
        { name: "Chullin", hebrewName: "חולין", chapters: 12 },
        { name: "Bekhorot", hebrewName: "בכורות", chapters: 9 },
        { name: "Arakhin", hebrewName: "ערכין", chapters: 9 },
        { name: "Temurah", hebrewName: "תמורה", chapters: 7 },
        { name: "Keritot", hebrewName: "כריתות", chapters: 6 },
        { name: "Meilah", hebrewName: "מעילה", chapters: 6 },
        { name: "Tamid", hebrewName: "תמיד", chapters: 7 },
        { name: "Middot", hebrewName: "מידות", chapters: 5 },
        { name: "Kinnim", hebrewName: "קינים", chapters: 3 }
    ],
    
    // Taharot (Purities) - Ritual purity and impurity
    taharot: [
        { name: "Kelim", hebrewName: "כלים", chapters: 30 },
        { name: "Oholot", hebrewName: "אהלות", chapters: 18 },
        { name: "Negaim", hebrewName: "נגעים", chapters: 14 },
        { name: "Parah", hebrewName: "פרה", chapters: 12 },
        { name: "Tahorot", hebrewName: "טהרות", chapters: 10 },
        { name: "Mikvaot", hebrewName: "מקוואות", chapters: 10 },
        { name: "Niddah", hebrewName: "נידה", chapters: 10 },
        { name: "Makhshirin", hebrewName: "מכשירין", chapters: 6 },
        { name: "Zavim", hebrewName: "זבים", chapters: 5 },
        { name: "Tevul Yom", hebrewName: "טבול יום", chapters: 4 },
        { name: "Yadayim", hebrewName: "ידיים", chapters: 4 },
        { name: "Uktzin", hebrewName: "עוקצין", chapters: 3 }
    ]
};

// Helper function to get all books from Tanach
function getAllTanachBooks() {
    return [...tanachData.torah, ...tanachData.neviim, ...tanachData.ketuvim];
}

// Helper function to get books for Chidon curriculum
function getChidonBooks(division, selectedParts = []) {
    if (!division || !chidonData[division]) {
        return [];
    }
    
    // If no specific parts are selected, return all books for the division
    if (!selectedParts || selectedParts.length === 0) {
        return chidonData[division].getAllBooks();
    }
    
    // Return only books from the selected parts
    const books = [];
    chidonData[division].parts.forEach(part => {
        if (selectedParts.includes(part.id)) {
            books.push(...part.books);
        }
    });
    
    return books;
}

// Helper function to get parts for a Chidon division
function getChidonParts(division) {
    if (!division || !chidonData[division]) {
        return [];
    }
    return chidonData[division].parts;
}

// Helper function to get all tractates from Mishnah
function getAllMishnayotTractates() {
    return [
        ...mishnayotData.zeraim,
        ...mishnayotData.moed,
        ...mishnayotData.nashim,
        ...mishnayotData.nezikin,
        ...mishnayotData.kodashim,
        ...mishnayotData.taharot
    ];
}

// Helper function to get tractates by seder
function getMishnayotBySeder(seder) {
    return mishnayotData[seder] || [];
}

// Helper function to build chapter references for a book
function buildChapterReferences(book, totalChapters) {
    const chapters = [];
    for (let i = 1; i <= totalChapters; i++) {
        chapters.push(`${book} ${i}`);
    }
    return chapters;
}

// Helper function to get all chapters for selected books
function getChaptersForSelection(selection, customBook = null, chidonDivision = null) {
    let chapters = [];
    
    if (selection === 'all') {
        // All of Tanach
        getAllTanachBooks().forEach(book => {
            chapters = chapters.concat(buildChapterReferences(book.name, book.chapters));
        });
    } else if (selection === 'torah') {
        // Torah only
        tanachData.torah.forEach(book => {
            chapters = chapters.concat(buildChapterReferences(book.name, book.chapters));
        });
    } else if (selection === 'neviim') {
        // Nevi'im only
        tanachData.neviim.forEach(book => {
            chapters = chapters.concat(buildChapterReferences(book.name, book.chapters));
        });
    } else if (selection === 'ketuvim') {
        // Ketuvim only
        tanachData.ketuvim.forEach(book => {
            chapters = chapters.concat(buildChapterReferences(book.name, book.chapters));
        });
    } else if (selection === 'custom' && customBook) {
        // Individual book
        const allBooks = getAllTanachBooks();
        const book = allBooks.find(b => b.name === customBook);
        if (book) {
            chapters = buildChapterReferences(book.name, book.chapters);
        }
    } else if (selection === 'chidon' && chidonDivision) {
        // Chidon curriculum
        const selectedParts = document.querySelectorAll('.chidon-part:checked');
        const selectedPartIds = Array.from(selectedParts).map(checkbox => checkbox.value);
        const chidonBooks = getChidonBooks(chidonDivision, selectedPartIds);
        
        chidonBooks.forEach(book => {
            if (book.fullBook && book.chapters) {
                // Full book with standard chapter count
                chapters = chapters.concat(buildChapterReferences(book.name, book.chapters));
            } else if (book.customChapters && book.customChapters.length > 0) {
                // Book with specific chapters
                book.customChapters.forEach(chapterNum => {
                    chapters.push(`${book.name} ${chapterNum}`);
                });
            }
        });
    }
    
    return chapters;
}

// Helper function to get all verses for selected books
function getTanachVersesForSelection(selection, customBook = null, chidonDivision = null) {
    console.log('getTanachVersesForSelection called with:', { selection, customBook });
    let verses = [];
    
    // Verse counts per chapter for each book (approximate)
    const verseData = {
        // Torah books have detailed verse counts per chapter
        'Genesis': [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26],
        'Exodus': [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38],
        'Leviticus': [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 56, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34],
        'Numbers': [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13],
        'Deuteronomy': [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12]
    };
    console.log('Verse data loaded for books:', Object.keys(verseData));
    
    // Helper function to build verse references for a book
    function buildVerseReferences(book, chapterVerseCounts = null) {
        console.log('Building verse references for book:', book.name, 'with', book.chapters, 'chapters');
        const verses = [];
        for (let chapter = 1; chapter <= book.chapters; chapter++) {
            // Use tanachData if available, otherwise fall back to provided verse counts or default
            let verseCount = 25; // Default fallback
            
            // Check if we have verse counts from tanachData
            if (window.tanachData && window.tanachData.books && window.tanachData.books[book.name] && 
                window.tanachData.books[book.name][chapter]) {
                verseCount = window.tanachData.books[book.name][chapter];
            } 
            // If not, use provided chapter verse counts if available
            else if (chapterVerseCounts && chapterVerseCounts[chapter-1]) {
                verseCount = chapterVerseCounts[chapter-1];
            }
            
            console.log(`Chapter ${chapter} has ${verseCount} verses`);
            for (let verse = 1; verse <= verseCount; verse++) {
                verses.push(`${book.name} ${chapter}:${verse}`);
            }
        }
        console.log(`Generated ${verses.length} verses for ${book.name}`);
        return verses;
    }
    
    console.log('Processing selection:', selection);
    if (selection === 'all') {
        // All Tanach
        console.log('Getting all Tanach books');
        const allBooks = getAllTanachBooks();
        console.log('Found', allBooks.length, 'books in Tanach');
        allBooks.forEach(book => {
            verses = verses.concat(buildVerseReferences(book, verseData[book.name]));
        });
    } else if (selection === 'torah') {
        // Torah only
        console.log('Getting Torah books');
        tanachData.torah.forEach(book => {
            verses = verses.concat(buildVerseReferences(book, verseData[book.name]));
        });
    } else if (selection === 'neviim') {
        // Neviim only
        console.log('Getting Neviim books');
        tanachData.neviim.forEach(book => {
            verses = verses.concat(buildVerseReferences(book, verseData[book.name]));
        });
    } else if (selection === 'ketuvim') {
        // Ketuvim only
        console.log('Getting Ketuvim books');
        tanachData.ketuvim.forEach(book => {
            verses = verses.concat(buildVerseReferences(book, verseData[book.name]));
        });
    } else if (selection === 'custom' && customBook) {
        // Custom book
        console.log('Getting custom book:', customBook);
        const allBooks = getAllTanachBooks();
        const book = allBooks.find(b => b.name === customBook);
        if (book) {
            console.log('Found book:', book.name, 'with', book.chapters, 'chapters');
            verses = buildVerseReferences(book, verseData[book.name]);
        } else {
            console.error('Custom book not found:', customBook);
        }
    } else if (selection === 'chidon' && chidonDivision) {
        // Chidon curriculum
        console.log('Getting Chidon books for division:', chidonDivision);
        const selectedParts = document.querySelectorAll('.chidon-part:checked');
        const selectedPartIds = Array.from(selectedParts).map(checkbox => checkbox.value);
        console.log('Selected part IDs:', selectedPartIds);
        const chidonBooks = getChidonBooks(chidonDivision, selectedPartIds);
        
        chidonBooks.forEach(book => {
            if (book.fullBook && book.chapters) {
                // Full book with standard chapter count
                verses = verses.concat(buildVerseReferences(book, verseData[book.name]));
            } else if (book.customChapters && book.customChapters.length > 0) {
                // Book with specific chapters
                const allBooks = getAllTanachBooks();
                const fullBook = allBooks.find(b => b.name === book.name);
                
                if (fullBook) {
                    book.customChapters.forEach(chapterNum => {
                        // For each chapter, add all verses
                        const verseCount = verseData[book.name] ? verseData[book.name][chapterNum-1] : 25;
                        for (let verse = 1; verse <= verseCount; verse++) {
                            verses.push(`${book.name} ${chapterNum}:${verse}`);
                        }
                    });
                }
            }
        });
    } else {
        console.error('Unknown selection type:', selection);
    }
    
    console.log(`Returning ${verses.length} verses total`);
    return verses;
}

// Helper function to get all chapters for selected Mishnah tractates
function getMishnayotChaptersForSelection(selection, customSeder = null, customTractates = []) {
    let chapters = [];
    
    if (selection === 'all') {
        // All of Mishnayot
        getAllMishnayotTractates().forEach(tractate => {
            chapters = chapters.concat(buildChapterReferences(tractate.name, tractate.chapters));
        });
    } else if (selection === 'seder' && customSeder) {
        // Check if we're studying specific tractates or the whole seder
        const studyWholeSeder = document.getElementById('studyWholeSeder').checked;
        console.log('In data.js - studyWholeSeder:', studyWholeSeder);
        console.log('In data.js - customTractates:', customTractates);
        
        if (studyWholeSeder) {
            // Specific Seder - all tractates
            const tractates = mishnayotData[customSeder] || [];
            console.log('In data.js - studying whole seder, tractates:', tractates.map(t => t.name));
            tractates.forEach(tractate => {
                chapters = chapters.concat(buildChapterReferences(tractate.name, tractate.chapters));
            });
        } else if (customTractates && customTractates.length > 0) {
            // Specific tractates from the seder
            const tractates = mishnayotData[customSeder] || [];
            console.log('In data.js - studying specific tractates from', customSeder, 'available tractates:', tractates.map(t => t.name));
            
            customTractates.forEach(tractateName => {
                console.log('Looking for tractate:', tractateName);
                const tractate = tractates.find(t => t.name === tractateName);
                if (tractate) {
                    console.log('Found tractate:', tractate.name, 'with', tractate.chapters, 'chapters');
                    chapters = chapters.concat(buildChapterReferences(tractate.name, tractate.chapters));
                } else {
                    console.log('Tractate not found:', tractateName);
                }
            });
        }
    }
    
    return chapters;
}

// Helper function to get all individual Mishnayot for selected tractates
function getMishnayotIndividualForSelection(selection, customSeder = null, customTractates = []) {
    let mishnayot = [];
    
    // Counts of Mishnayot per chapter for each tractate
    // These counts are based on the actual data from the CSV file
    const mishnayotCounts = {
        // Zeraim
        'Berachot': [5, 8, 6, 7, 5, 8, 5, 8, 5],
        'Peah': [6, 8, 8, 11, 8, 11, 8, 9],
        'Damai': [4, 5, 6, 7, 11, 12, 8],
        'Kilayim': [9, 11, 7, 9, 8, 9, 8, 6, 10],
        'Sheviit': [8, 10, 10, 10, 9, 6, 7, 11, 9, 9],
        'Terumot': [10, 6, 9, 13, 9, 6, 7, 12, 7, 12, 10],
        'Maasrot': [8, 8, 10, 6, 8],
        'Maaser Sheni': [7, 10, 13, 12, 15],
        'Challah': [9, 8, 10, 11],
        'Orlah': [9, 17, 9],
        'Bikkurim': [11, 11, 12, 5],
        // Moed
        'Shabbat': [11, 7, 6, 2, 4, 10, 4, 7, 7, 6, 6, 6, 7, 4, 3, 8, 8, 3, 6, 5, 3, 6, 5, 5],
        'Eruvin': [10, 6, 9, 11, 9, 10, 11, 11, 4, 15],
        'Pesachim': [7, 8, 8, 9, 10, 6, 13, 8, 11, 9],
        'Shekalim': [7, 5, 4, 9, 6, 6, 7, 8],
        'Yoma': [8, 7, 11, 6, 7, 8, 5, 9],
        'Sukkah': [11, 9, 15, 10, 8],
        'Beitzah': [10, 10, 8, 7, 7],
        'Rosh Hashanah': [9, 8, 9, 9],
        'Taanit': [7, 10, 9, 8],
        'Megillah': [11, 6, 6, 10],
        'Moed Katan': [10, 5, 9],
        'Chagigah': [8, 7, 8],
        // Nashim
        'Yevamot': [4, 10, 10, 13, 6, 6, 6, 6, 6, 9, 7, 6, 13, 9, 10, 7],
        'Ketubot': [10, 10, 9, 12, 9, 7, 10, 8, 9, 6, 6, 4, 11],
        'Nedarim': [4, 5, 11, 8, 6, 10, 9, 7, 10, 8, 12],
        'Nazir': [7, 10, 7, 7, 7, 11, 4, 2, 5],
        'Sotah': [9, 6, 8, 5, 5, 4, 8, 7, 15],
        'Gittin': [6, 7, 8, 9, 9, 7, 9, 10, 10],
        'Kiddushin': [10, 10, 13, 14],
        // Nezikin
        'Bava Kamma': [4, 6, 11, 9, 7, 6, 7, 7, 12, 10],
        'Bava Metzia': [8, 11, 12, 12, 11, 8, 11, 9, 13, 6],
        'Bava Batra': [6, 14, 8, 9, 11, 8, 4, 8, 10, 8],
        'Sanhedrin': [6, 5, 8, 5, 5, 6, 11, 7, 6, 6, 6],
        'Makkot': [10, 8, 16],
        'Shevuot': [7, 5, 11, 13, 5, 7, 8, 6],
        'Eduyot': [14, 10, 12, 12, 7, 3, 9, 7],
        'Avodah Zarah': [9, 7, 10, 12, 12],
        'Avot': [18, 16, 18, 22, 23, 11],
        'Horayot': [5, 7, 8],
        // Kodashim
        'Zevachim': [4, 5, 6, 6, 8, 7, 6, 12, 7, 8, 8, 6, 8, 10],
        'Menachot': [4, 5, 7, 5, 9, 7, 6, 7, 9, 9, 9, 5, 11],
        'Chullin': [7, 10, 7, 7, 5, 7, 6, 6, 8, 4, 2, 5],
        'Bekhorot': [7, 9, 4, 10, 6, 12, 7, 10, 8],
        'Arakhin': [4, 6, 5, 4, 6, 5, 5, 7, 8],
        'Temurah': [6, 3, 5, 4, 6, 5, 6, 12],
        'Keritot': [7, 6, 10, 3, 8, 9],
        'Meilah': [4, 9, 8, 6, 5, 6],
        'Tamid': [4, 5, 9, 3, 6, 3, 4],
        'Middot': [9, 6, 8, 7, 4],
        'Kinnim': [4, 5, 6],
        // Tahorot
        'Kelim': [9, 8, 8, 4, 11, 4, 6, 11, 8, 8, 9, 8, 8, 8, 6, 8, 17, 9, 10, 7, 3, 10, 5, 17, 9, 9, 12, 10, 8, 4],
        'Oholot': [8, 7, 7, 3, 7, 7, 6, 6, 16, 7, 9, 8, 6, 7, 10, 5, 5, 10],
        'Negaim': [6, 5, 8, 11, 5, 8, 5, 10, 3, 10, 12, 7, 12, 13],
        'Parah': [4, 5, 11, 4, 9, 5, 12, 11, 9, 6, 9, 11],
        'Tahorot': [9, 8, 8, 13, 9, 10, 9, 9, 9, 8],
        'Mikvaot': [8, 10, 4, 5, 6, 11, 7, 5, 7, 8],
        'Niddah': [7, 7, 7, 7, 9, 14, 5, 4, 11, 8],
        'Makhshirin': [6, 11, 8, 10, 11, 8],
        'Zavim': [6, 4, 3, 7, 12],
        'Tevul Yom': [5, 8, 6, 7],
        'Yadayim': [5, 4, 5, 8],
        'Uktzin': [6, 10, 12]
    };
    
    // Helper function to build individual Mishnah references
    function buildMishnayotReferences(tractate) {
        const mishnayot = [];
        
        for (let chapter = 1; chapter <= tractate.chapters; chapter++) {
            // If we have detailed mishnah counts, use them, otherwise estimate 8 mishnayot per chapter
            const mishnayotCount = mishnayotCounts[tractate.name] ? mishnayotCounts[tractate.name][chapter-1] : 8;
            
            for (let mishnah = 1; mishnah <= mishnayotCount; mishnah++) {
                mishnayot.push(`${tractate.name} ${chapter}:${mishnah}`);
            }
        }
        
        return mishnayot;
    }
    
    if (selection === 'all') {
        // All of Mishnayot
        getAllMishnayotTractates().forEach(tractate => {
            mishnayot = mishnayot.concat(buildMishnayotReferences(tractate));
        });
    } else if (selection === 'seder' && customSeder) {
        // Check if we're studying specific tractates or the whole seder
        const studyWholeSeder = document.getElementById('studyWholeSeder').checked;
        
        if (studyWholeSeder) {
            // Specific Seder - all tractates
            const tractates = mishnayotData[customSeder] || [];
            
            tractates.forEach(tractate => {
                const tractateRefs = buildMishnayotReferences(tractate);
                mishnayot = mishnayot.concat(tractateRefs);
            });
        } else if (customTractates && customTractates.length > 0) {
            // Specific tractates from the seder
            const tractates = mishnayotData[customSeder] || [];
            
            customTractates.forEach(tractateName => {
                const tractate = tractates.find(t => t.name === tractateName);
                if (tractate) {
                    const tractateRefs = buildMishnayotReferences(tractate);
                    mishnayot = mishnayot.concat(tractateRefs);
                }
            });
        }
    }
    
    return mishnayot;
}

/*  public/js/data.js  ─────────────────────────────────────────────
    Central data + language helpers for the Torah Schedule Creator
   ──────────────────────────────────────────────────────────────── */

/* ---------- 1. global language state & helpers ---------- */
const LANG = { EN: 'en', HE: 'he' };
let currentLang = LANG.EN;                        // default = English

function toggleLanguage() {
  currentLang = currentLang === LANG.EN ? LANG.HE : LANG.EN;
  // Broadcast so any component can rerender
  document.dispatchEvent(new CustomEvent('langchange', { detail: currentLang }));
}
function localise(en, he) {
  return currentLang === LANG.HE ? he : en;
}

/* ---------- 2. dictionaries you asked for ---------- */
const hebrewMonths = {
  1: 'ניסן', 2: 'אייר', 3: 'סיון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
  7: 'תשרי', 8: 'חשון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב'
};
const hebrewDays = {
  Sunday: 'יום ראשון', Monday: 'יום שני', Tuesday: 'יום שלישי',
  Wednesday: 'יום רביעי', Thursday: 'יום חמישי', Friday: 'יום שישי',
  Saturday: 'שבת'
};
const hebrewGregorianMonths = {
  1: 'ינואר', 2: 'פברואר', 3: 'מרץ', 4: 'אפריל', 5: 'מאי', 6: 'יוני',
  7: 'יולי', 8: 'אוגוסט', 9: 'ספטמבר', 10: 'אוקטובר', 11: 'נובמבר', 12: 'דצמבר'
};

/* ---------- 3. date helpers (Gregorian & Hebcal) ---------- */
function pad(n) { return n.toString().padStart(2, '0'); }

function formatGregorian(date) {
  const y = date.getFullYear();
  const m = currentLang === LANG.HE
    ? hebrewGregorianMonths[date.getMonth() + 1]
    : date.toLocaleString('default', { month: 'long' });
  const d = pad(date.getDate());
  return currentLang === LANG.HE ? `${d} ${m} ${y}` : `${y} ${m} ${d}`;
}

/*  hDate is {hy, hm, hd}.  Use Hebcal JSON “converter?g2h” response */
function formatHebrew(hDate) {
  const mName = hebrewMonths[hDate.hm];
  return `${hDate.hd} ${mName} ${hDate.hy}`;
}

/* ---------- 4.  ⬇️  EVERYTHING YOU HAD BEFORE REMAINS ⬇️  ---------- */
/*  — Tanach data, Mishnah data, Chidon data, plus all helper
      functions (getAllTanachBooks, getChidonBooks, etc.).  Just
      paste your giant existing block here unchanged.               */
/* ----------------------------------------------------------------- */

/* ---------- 5. public export (UMD style) ---------- */
window.TorahData = {
  /* i18n */
  LANG, currentLang: () => currentLang, toggleLanguage, localise,
  hebrewMonths, hebrewDays, hebrewGregorianMonths,
  formatGregorian, formatHebrew,

  /* original exports */
  chidonData, tanachData, mishnayotData,
  getAllTanachBooks, getChidonBooks, getChidonParts,
  getAllMishnayotTractates, getMishnayotBySeder,
  getChaptersForSelection, getTanachVersesForSelection,
  getMishnayotChaptersForSelection, getMishnayotIndividualForSelection
};
