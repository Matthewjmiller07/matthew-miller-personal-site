const DATA_BASE_PATH = '/parsha-explorer/data/';
let morphologyData = {};
let properNounCounts = {}; // Stores counts of proper nouns across parshas
let verbCounts = {}; // Initialize verbCounts here
let lemmaData = {};
let lemmaUsageChart; // Declare a global chart variable if not already defined
let currentAliya = null;
let activeFilters = {}; // Track active filters
let sortOrders = {}; // Track sort order for each type (A-Z, Z-A, by count)
let chartInstance = null;
let adverbCounts = {};

const highlightMap = {
    "HN": "highlight-hn",
    "HV": "highlight-hv",
    "HD": "highlight-hd"
    // Add more mappings as needed
};

// Load morphology data from Oshm.xml
async function loadMorphologyData() {
    
    try {
        const response = await fetch(`${DATA_BASE_PATH}Oshm.xml`);
        if (!response.ok) throw new Error("Failed to load morphology data");
        
        const text = await response.text();
        
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "application/xml");

        // Load morphology data into a key-value structure
        const entries = xmlDoc.querySelectorAll("entryFree");
        entries.forEach(entry => {
            const code = entry.getAttribute("n").trim();
            const description = entry.textContent.trim();
            morphologyData[code] = description;
        });
        
        
    } catch (error) {
        console.error("Error loading morphology data:", error);
    }
}

// Ensure loadMorphologyData runs before any clicks
loadMorphologyData().then(() => {
    console.log("CSS DEBUG: Checking body color", window.getComputedStyle(document.body).color);
    console.log("CSS DEBUG: Body element classes", document.body.className);
});



// Ensure loadLemmaData runs before any clicks
loadLemmaData().then(() => {
    
});
const books = {
    "Genesis": {
        "chapters": [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 54, 33, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26]
    },
    "Exodus": {
        "chapters": [22, 25, 22, 31, 23, 30, 29, 28, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 37, 30, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38]
    },
    "Leviticus": {
        "chapters": [17, 16, 17, 35, 26, 23, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34]
    },
    "Numbers": {
        "chapters": [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 35, 28, 32, 22, 29, 35, 41, 30, 25, 19, 65, 23, 31, 39, 17, 54, 42, 56, 29, 34, 13]
    },
    "Deuteronomy": {
        "chapters": [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 31, 19, 29, 23, 22, 20, 22, 21, 20, 23, 29, 26, 22, 19, 19, 26, 69, 28, 20, 30, 52, 29, 12]
    },
    "Joshua": {
        "chapters": [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33]
    },
    "Judges": {
        "chapters": [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25]
    },
    "1 Samuel": {
        "chapters": [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 16, 23, 28, 23, 44, 25, 12, 25, 11, 31, 13]
    },
    "2 Samuel": {
        "chapters": [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 32, 44, 26, 22, 51, 39, 25]
    },
    "1 Kings": {
        "chapters": [53, 46, 28, 20, 32, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 54]
    },
    "2 Kings": {
        "chapters": [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 20, 22, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30]
    },
    "Isaiah": {
        "chapters": [31, 22, 26, 6, 30, 13, 25, 23, 20, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 11, 25, 24]
    },
    "Jeremiah": {
        "chapters": [19, 37, 25, 31, 31, 30, 34, 23, 25, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34]
    },
    "Ezekiel": {
        "chapters": [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 44, 37, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35]
    },
    "Hosea": {
        "chapters": [9, 25, 5, 19, 15, 11, 16, 14, 17, 15, 11, 15, 15, 10]
    },
    "Joel": {
        "chapters": [20, 27, 5, 21]
    },
    "Amos": {
        "chapters": [15, 16, 15, 13, 27, 14, 17, 14, 15]
    },
    "Obadiah": {
        "chapters": [21]
    },
    "Jonah": {
        "chapters": [16, 11, 10, 11]
    },
    "Micah": {
        "chapters": [16, 13, 12, 14, 14, 16, 20]
    },
    "Nahum": {
        "chapters": [14, 14, 19]
    },
    "Habakkuk": {
        "chapters": [17, 20, 19]
    },
    "Zephaniah": {
        "chapters": [18, 15, 20]
    },
    "Haggai": {
        "chapters": [15, 23]
    },
    "Zechariah": {
        "chapters": [17, 17, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21]
    },
    "Malachi": {
        "chapters": [14, 17, 24]
    },
    "Psalms": {
        "chapters": [6, 12, 9, 9, 13, 11, 18, 10, 21, 18, 7, 9, 6, 7, 5, 11, 15, 51, 15, 10, 14, 32, 6, 10, 22, 12, 14, 9, 11, 13, 25, 11, 22, 23, 28, 13, 40, 23, 14, 18, 14, 12, 5, 27, 18, 12, 10, 15, 21, 23, 21, 11, 7, 9, 24, 14, 12, 12, 18, 14, 9, 13, 12, 11, 14, 20, 8, 36, 37, 6, 24, 20, 28, 23, 11, 13, 21, 72, 13, 20, 17, 8, 19, 13, 14, 17, 7, 19, 53, 17, 16, 16, 5, 23, 11, 13, 12, 9, 9, 5, 8, 29, 22, 35, 45, 48, 43, 14, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 14, 10, 8, 12, 15, 21, 10, 20, 14, 9, 6]
    },
    "Proverbs": {
        "chapters": [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31]
    },
    "Job": {
        "chapters": [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 32, 26, 17]
    },
    "Song of Songs": {
        "chapters": [17, 17, 11, 16, 16, 12, 14, 14]
    },
    "Ruth": {
        "chapters": [22, 23, 18, 22]
    },
    "Lamentations": {
        "chapters": [22, 22, 66, 22, 22]
    },
    "Ecclesiastes": {
        "chapters": [18, 26, 22, 17, 19, 12, 29, 17, 18, 20, 10, 14]
    },
    "Esther": {
        "chapters": [22, 23, 15, 17, 14, 14, 10, 17, 32, 3]
    },
    "Daniel": {
        "chapters": [21, 49, 33, 34, 30, 29, 28, 27, 27, 21, 45, 13]
    },
    "Ezra": {
        "chapters": [11, 70, 13, 24, 17, 22, 28, 36, 15, 44]
    },
    "Nehemiah": {
        "chapters": [11, 20, 38, 17, 19, 19, 72, 18, 37, 40, 36, 47, 31]
    },
    "1 Chronicles": {
        "chapters": [54, 55, 24, 43, 41, 66, 40, 40, 44, 14, 47, 41, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30]
    },
    "2 Chronicles": {
        "chapters": [18, 17, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 23, 14, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23]
    }
};

const bookMap = {
    "Genesis": "Gen.xml",
    "Exodus": "Exod.xml",
    "Leviticus": "Lev.xml",
    "Numbers": "Num.xml",
    "Deuteronomy": "Deut.xml",
    "Joshua": "Josh.xml",
    "Judges": "Judg.xml",
    "1 Samuel": "1Sam.xml",
    "2 Samuel": "2Sam.xml",
    "1 Kings": "1Kgs.xml",
    "2 Kings": "2Kgs.xml",
    "Isaiah": "Isa.xml",
    "Jeremiah": "Jer.xml",
    "Ezekiel": "Ezek.xml",
    "Hosea": "Hos.xml",
    "Joel": "Joel.xml",
    "Amos": "Amos.xml",
    "Obadiah": "Obad.xml",
    "Jonah": "Jonah.xml",
    "Micah": "Mic.xml",
    "Nahum": "Nah.xml",
    "Habakkuk": "Hab.xml",
    "Zephaniah": "Zeph.xml",
    "Haggai": "Hag.xml",
    "Zechariah": "Zech.xml",
    "Malachi": "Mal.xml",
    "Psalms": "Ps.xml",
    "Proverbs": "Prov.xml",
    "Job": "Job.xml",
    "Song of Songs": "Song.xml",
    "Ruth": "Ruth.xml",
    "Lamentations": "Lam.xml",
    "Ecclesiastes": "Eccl.xml",
    "Esther": "Esth.xml",
    "Daniel": "Dan.xml",
    "Ezra": "Ezra.xml",
    "Nehemiah": "Neh.xml",
    "1 Chronicles": "1Chr.xml",
    "2 Chronicles": "2Chr.xml"
};

const parshaData = {
    "Bereshit": {
        "Whole Parsha": "Genesis 1:1-6:8",
        "Aliya 1": "Genesis 1:1-2:3",
        "Aliya 2": "Genesis 2:4-2:19",
        "Aliya 3": "Genesis 2:20-3:21",
        "Aliya 4": "Genesis 3:22-4:18",
        "Aliya 5": "Genesis 4:19-4:22",
        "Aliya 6": "Genesis 4:23-5:24",
        "Aliya 7": "Genesis 5:25-6:8"
    },
    "Noach": {
        "Whole Parsha": "Genesis 6:9-11:32",
        "Aliya 1": "Genesis 6:9-6:22",
        "Aliya 2": "Genesis 7:1-7:16",
        "Aliya 3": "Genesis 7:17-8:14",
        "Aliya 4": "Genesis 8:15-9:7",
        "Aliya 5": "Genesis 9:8-9:17",
        "Aliya 6": "Genesis 9:18-10:32",
        "Aliya 7": "Genesis 11:1-11:32"
    },
    "Lech-Lecha": {
        "Whole Parsha": "Genesis 12:1-17:27",
        "Aliya 1": "Genesis 12:1-12:13",
        "Aliya 2": "Genesis 12:14-13:4",
        "Aliya 3": "Genesis 13:5-13:18",
        "Aliya 4": "Genesis 14:1-14:20",
        "Aliya 5": "Genesis 14:21-15:6",
        "Aliya 6": "Genesis 15:7-17:6",
        "Aliya 7": "Genesis 17:7-17:27"
    },
    "Vayera": {
        "Whole Parsha": "Genesis 18:1-22:24",
        "Aliya 1": "Genesis 18:1-18:14",
        "Aliya 2": "Genesis 18:15-18:33",
        "Aliya 3": "Genesis 19:1-19:20",
        "Aliya 4": "Genesis 19:21-21:4",
        "Aliya 5": "Genesis 21:5-21:21",
        "Aliya 6": "Genesis 21:22-21:34",
        "Aliya 7": "Genesis 22:1-22:24"
    },
    "Chayei Sarah": {
        "Whole Parsha": "Genesis 23:1-25:18",
        "Aliya 1": "Genesis 23:1-23:16",
        "Aliya 2": "Genesis 23:17-24:9",
        "Aliya 3": "Genesis 24:10-24:26",
        "Aliya 4": "Genesis 24:27-24:52",
        "Aliya 5": "Genesis 24:53-24:67",
        "Aliya 6": "Genesis 25:1-25:11",
        "Aliya 7": "Genesis 25:12-25:18"
    },
    "Toldot": {
        "Whole Parsha": "Genesis 25:19-28:9",
        "Aliya 1": "Genesis 25:19-26:5",
        "Aliya 2": "Genesis 26:6-26:12",
        "Aliya 3": "Genesis 26:13-26:22",
        "Aliya 4": "Genesis 26:23-26:29",
        "Aliya 5": "Genesis 26:30-27:27",
        "Aliya 6": "Genesis 27:28-28:4",
        "Aliya 7": "Genesis 28:5-28:9"
    },
    "Vayetze": {
        "Whole Parsha": "Genesis 28:10-32:3",
        "Aliya 1": "Genesis 28:10-28:22",
        "Aliya 2": "Genesis 29:1-29:17",
        "Aliya 3": "Genesis 29:18-30:13",
        "Aliya 4": "Genesis 30:14-30:27",
        "Aliya 5": "Genesis 30:28-31:16",
        "Aliya 6": "Genesis 31:17-31:42",
        "Aliya 7": "Genesis 31:43-32:3"
    },
    "Vayishlach": {
        "Whole Parsha": "Genesis 32:4-36:43",
        "Aliya 1": "Genesis 32:4-32:13",
        "Aliya 2": "Genesis 32:14-32:30",
        "Aliya 3": "Genesis 32:31-33:5",
        "Aliya 4": "Genesis 33:6-33:20",
        "Aliya 5": "Genesis 34:1-35:11",
        "Aliya 6": "Genesis 35:12-36:19",
        "Aliya 7": "Genesis 36:20-36:43"
    },
    "Vayeshev": {
        "Whole Parsha": "Genesis 37:1-40:23",
        "Aliya 1": "Genesis 37:1-37:11",
        "Aliya 2": "Genesis 37:12-37:22",
        "Aliya 3": "Genesis 37:23-37:36",
        "Aliya 4": "Genesis 38:1-38:30",
        "Aliya 5": "Genesis 39:1-39:6",
        "Aliya 6": "Genesis 39:7-39:23",
        "Aliya 7": "Genesis 40:1-40:23"
    },
    "Miketz": {
        "Whole Parsha": "Genesis 41:1-44:17",
        "Aliya 1": "Genesis 41:1-41:14",
        "Aliya 2": "Genesis 41:15-41:38",
        "Aliya 3": "Genesis 41:39-41:52",
        "Aliya 4": "Genesis 41:53-42:18",
        "Aliya 5": "Genesis 42:19-43:15",
        "Aliya 6": "Genesis 43:16-43:29",
        "Aliya 7": "Genesis 43:30-44:17"
    },
    "Vayigash": {
        "Whole Parsha": "Genesis 44:18-47:27",
        "Aliya 1": "Genesis 44:18-44:30",
        "Aliya 2": "Genesis 44:31-45:7",
        "Aliya 3": "Genesis 45:8-45:18",
        "Aliya 4": "Genesis 45:19-45:27",
        "Aliya 5": "Genesis 45:28-46:27",
        "Aliya 6": "Genesis 46:28-47:10",
        "Aliya 7": "Genesis 47:11-47:27"
    },
    "Vayechi": {
        "Whole Parsha": "Genesis 47:28-50:26",
        "Aliya 1": "Genesis 47:28-48:9",
        "Aliya 2": "Genesis 48:10-48:16",
        "Aliya 3": "Genesis 48:17-48:22",
        "Aliya 4": "Genesis 49:1-49:18",
        "Aliya 5": "Genesis 49:19-49:26",
        "Aliya 6": "Genesis 49:27-50:20",
        "Aliya 7": "Genesis 50:21-50:26"
    },
    "Shemot": {
        "Whole Parsha": "Exodus 1:1-6:1",
        "Aliya 1": "Exodus 1:1-1:17",
        "Aliya 2": "Exodus 1:18-2:10",
        "Aliya 3": "Exodus 2:11-2:25",
        "Aliya 4": "Exodus 3:1-3:15",
        "Aliya 5": "Exodus 3:16-4:17",
        "Aliya 6": "Exodus 4:18-4:31",
        "Aliya 7": "Exodus 5:1-6:1"
    },
    "Va'era": {
        "Whole Parsha": "Exodus 6:2-9:35",
        "Aliya 1": "Exodus 6:2-6:13",
        "Aliya 2": "Exodus 6:14-6:28",
        "Aliya 3": "Exodus 6:29-7:7",
        "Aliya 4": "Exodus 7:8-8:6",
        "Aliya 5": "Exodus 8:7-8:18",
        "Aliya 6": "Exodus 8:19-9:16",
        "Aliya 7": "Exodus 9:17-9:35"
    },
    "Bo": {
        "Whole Parsha": "Exodus 10:1-13:16",
        "Aliya 1": "Exodus 10:1-10:11",
        "Aliya 2": "Exodus 10:12-10:23",
        "Aliya 3": "Exodus 10:24-11:3",
        "Aliya 4": "Exodus 11:4-12:20",
        "Aliya 5": "Exodus 12:21-12:28",
        "Aliya 6": "Exodus 12:29-12:51",
        "Aliya 7": "Exodus 13:1-13:16"
    },
    "Beshalach": {
        "Whole Parsha": "Exodus 13:17-17:16",
        "Aliya 1": "Exodus 13:17-14:8",
        "Aliya 2": "Exodus 14:9-14:14",
        "Aliya 3": "Exodus 14:15-14:25",
        "Aliya 4": "Exodus 14:26-15:26",
        "Aliya 5": "Exodus 15:27-16:10",
        "Aliya 6": "Exodus 16:11-16:36",
        "Aliya 7": "Exodus 17:1-17:16"
    },
    "Yitro": {
        "Whole Parsha": "Exodus 18:1-20:23",
        "Aliya 1": "Exodus 18:1-18:12",
        "Aliya 2": "Exodus 18:13-18:23",
        "Aliya 3": "Exodus 18:24-18:27",
        "Aliya 4": "Exodus 19:1-19:6",
        "Aliya 5": "Exodus 19:7-19:19",
        "Aliya 6": "Exodus 19:20-20:14",
        "Aliya 7": "Exodus 20:15-20:23"
    },
    "Mishpatim": {
        "Whole Parsha": "Exodus 21:1-24:18",
        "Aliya 1": "Exodus 21:1-21:19",
        "Aliya 2": "Exodus 21:20-22:3",
        "Aliya 3": "Exodus 22:4-22:26",
        "Aliya 4": "Exodus 22:27-23:5",
        "Aliya 5": "Exodus 23:6-23:19",
        "Aliya 6": "Exodus 23:20-23:25",
        "Aliya 7": "Exodus 23:26-24:18"
    },
    "Terumah": {
        "Whole Parsha": "Exodus 25:1-27:19",
        "Aliya 1": "Exodus 25:1-25:16",
        "Aliya 2": "Exodus 25:17-25:30",
        "Aliya 3": "Exodus 25:31-26:14",
        "Aliya 4": "Exodus 26:15-26:30",
        "Aliya 5": "Exodus 26:31-26:37",
        "Aliya 6": "Exodus 27:1-27:8",
        "Aliya 7": "Exodus 27:9-27:19"
    },
    "Tetzaveh": {
        "Whole Parsha": "Exodus 27:20-30:10",
        "Aliya 1": "Exodus 27:20-28:12",
        "Aliya 2": "Exodus 28:13-28:30",
        "Aliya 3": "Exodus 28:31-28:43",
        "Aliya 4": "Exodus 29:1-29:18",
        "Aliya 5": "Exodus 29:19-29:37",
        "Aliya 6": "Exodus 29:38-29:46",
        "Aliya 7": "Exodus 30:1-30:10"
    },
    "Ki Tisa": {
        "Whole Parsha": "Exodus 30:11-34:35",
        "Aliya 1": "Exodus 30:11-31:17",
        "Aliya 2": "Exodus 31:18-33:11",
        "Aliya 3": "Exodus 33:12-33:16",
        "Aliya 4": "Exodus 33:17-33:23",
        "Aliya 5": "Exodus 34:1-34:9",
        "Aliya 6": "Exodus 34:10-34:26",
        "Aliya 7": "Exodus 34:27-34:35"
    },
    "Vayakhel": {
        "Whole Parsha": "Exodus 35:1-38:20",
        "Aliya 1": "Exodus 35:1-35:20",
        "Aliya 2": "Exodus 35:21-35:29",
        "Aliya 3": "Exodus 35:30-36:7",
        "Aliya 4": "Exodus 36:8-36:19",
        "Aliya 5": "Exodus 36:20-37:16",
        "Aliya 6": "Exodus 37:17-37:29",
        "Aliya 7": "Exodus 38:1-38:20"
    },
    "Pekudei": {
        "Whole Parsha": "Exodus 38:21-40:38",
        "Aliya 1": "Exodus 38:21-39:1",
        "Aliya 2": "Exodus 39:2-39:21",
        "Aliya 3": "Exodus 39:22-39:32",
        "Aliya 4": "Exodus 39:33-39:43",
        "Aliya 5": "Exodus 40:1-40:16",
        "Aliya 6": "Exodus 40:17-40:27",
        "Aliya 7": "Exodus 40:28-40:38"
    },
    "Vayikra": {
        "Whole Parsha": "Leviticus 1:1-5:26",
        "Aliya 1": "Leviticus 1:1-1:13",
        "Aliya 2": "Leviticus 1:14-2:6",
        "Aliya 3": "Leviticus 2:7-2:16",
        "Aliya 4": "Leviticus 3:1-3:17",
        "Aliya 5": "Leviticus 4:1-4:26",
        "Aliya 6": "Leviticus 4:27-5:10",
        "Aliya 7": "Leviticus 5:11-5:26"
    },
    "Tzav": {
        "Whole Parsha": "Leviticus 6:1-8:36",
        "Aliya 1": "Leviticus 6:1-6:11",
        "Aliya 2": "Leviticus 6:12-7:10",
        "Aliya 3": "Leviticus 7:11-7:38",
        "Aliya 4": "Leviticus 8:1-8:13",
        "Aliya 5": "Leviticus 8:14-8:21",
        "Aliya 6": "Leviticus 8:22-8:29",
        "Aliya 7": "Leviticus 8:30-8:36"
    },
    "Shmini": {
        "Whole Parsha": "Leviticus 9:1-11:47",
        "Aliya 1": "Leviticus 9:1-9:16",
        "Aliya 2": "Leviticus 9:17-9:23",
        "Aliya 3": "Leviticus 9:24-10:11",
        "Aliya 4": "Leviticus 10:12-10:15",
        "Aliya 5": "Leviticus 10:16-10:20",
        "Aliya 6": "Leviticus 11:1-11:32",
        "Aliya 7": "Leviticus 11:33-11:47"
    },
    "Tazria": {
        "Whole Parsha": "Leviticus 12:1-13:59",
        "Aliya 1": "Leviticus 12:1-13:5",
        "Aliya 2": "Leviticus 13:6-13:17",
        "Aliya 3": "Leviticus 13:18-13:23",
        "Aliya 4": "Leviticus 13:24-13:28",
        "Aliya 5": "Leviticus 13:29-13:39",
        "Aliya 6": "Leviticus 13:40-13:54",
        "Aliya 7": "Leviticus 13:55-13:59"
    },
    "Metzora": {
        "Whole Parsha": "Leviticus 14:1-15:33",
        "Aliya 1": "Leviticus 14:1-14:12",
        "Aliya 2": "Leviticus 14:13-14:20",
        "Aliya 3": "Leviticus 14:21-14:32",
        "Aliya 4": "Leviticus 14:33-14:53",
        "Aliya 5": "Leviticus 14:54-15:15",
        "Aliya 6": "Leviticus 15:16-15:28",
        "Aliya 7": "Leviticus 15:29-15:33"
    },
    "Acharei Mot": {
        "Whole Parsha": "Leviticus 16:1-18:30",
        "Aliya 1": "Leviticus 16:1-16:17",
        "Aliya 2": "Leviticus 16:18-16:24",
        "Aliya 3": "Leviticus 16:25-16:34",
        "Aliya 4": "Leviticus 17:1-17:7",
        "Aliya 5": "Leviticus 17:8-18:5",
        "Aliya 6": "Leviticus 18:6-18:21",
        "Aliya 7": "Leviticus 18:22-18:30"
    },
    "Kedoshim": {
        "Whole Parsha": "Leviticus 19:1-20:27",
        "Aliya 1": "Leviticus 19:1-19:14",
        "Aliya 2": "Leviticus 19:15-19:22",
        "Aliya 3": "Leviticus 19:23-19:32",
        "Aliya 4": "Leviticus 19:33-19:37",
        "Aliya 5": "Leviticus 20:1-20:7",
        "Aliya 6": "Leviticus 20:8-20:22",
        "Aliya 7": "Leviticus 20:23-20:27"
    },
    "Emor": {
        "Whole Parsha": "Leviticus 21:1-24:23",
        "Aliya 1": "Leviticus 21:1-21:15",
        "Aliya 2": "Leviticus 21:16-22:16",
        "Aliya 3": "Leviticus 22:17-22:33",
        "Aliya 4": "Leviticus 23:1-23:22",
        "Aliya 5": "Leviticus 23:23-23:32",
        "Aliya 6": "Leviticus 23:33-23:44",
        "Aliya 7": "Leviticus 24:1-24:23"
    },
    "Behar": {
        "Whole Parsha": "Leviticus 25:1-26:2",
        "Aliya 1": "Leviticus 25:1-25:13",
        "Aliya 2": "Leviticus 25:14-25:18",
        "Aliya 3": "Leviticus 25:19-25:24",
        "Aliya 4": "Leviticus 25:25-25:28",
        "Aliya 5": "Leviticus 25:29-25:38",
        "Aliya 6": "Leviticus 25:39-25:46",
        "Aliya 7": "Leviticus 25:47-26:2"
    },
    "Bechukotai": {
        "Whole Parsha": "Leviticus 26:3-27:34",
        "Aliya 1": "Leviticus 26:3-26:5",
        "Aliya 2": "Leviticus 26:6-26:9",
        "Aliya 3": "Leviticus 26:10-26:46",
        "Aliya 4": "Leviticus 27:1-27:15",
        "Aliya 5": "Leviticus 27:16-27:21",
        "Aliya 6": "Leviticus 27:22-27:28",
        "Aliya 7": "Leviticus 27:29-27:34"
    },
    "Bamidbar": {
        "Whole Parsha": "Numbers 1:1-4:20",
        "Aliya 1": "Numbers 1:1-1:19",
        "Aliya 2": "Numbers 1:20-1:54",
        "Aliya 3": "Numbers 2:1-2:34",
        "Aliya 4": "Numbers 3:1-3:13",
        "Aliya 5": "Numbers 3:14-3:39",
        "Aliya 6": "Numbers 3:40-3:51",
        "Aliya 7": "Numbers 4:1-4:20"
    },
    "Nasso": {
        "Whole Parsha": "Numbers 4:21-7:89",
        "Aliya 1": "Numbers 4:21-4:37",
        "Aliya 2": "Numbers 4:38-4:49",
        "Aliya 3": "Numbers 5:1-5:10",
        "Aliya 4": "Numbers 5:11-6:27",
        "Aliya 5": "Numbers 7:1-7:41",
        "Aliya 6": "Numbers 7:42-7:71",
        "Aliya 7": "Numbers 7:72-7:89"
    },
    "Beha'alotecha": {
        "Whole Parsha": "Numbers 8:1-12:16",
        "Aliya 1": "Numbers 8:1-8:14",
        "Aliya 2": "Numbers 8:15-8:26",
        "Aliya 3": "Numbers 9:1-9:14",
        "Aliya 4": "Numbers 9:15-10:10",
        "Aliya 5": "Numbers 10:11-10:34",
        "Aliya 6": "Numbers 10:35-11:29",
        "Aliya 7": "Numbers 11:30-12:16"
    },
    "Sh'lach": {
        "Whole Parsha": "Numbers 13:1-15:41",
        "Aliya 1": "Numbers 13:1-13:20",
        "Aliya 2": "Numbers 13:21-14:7",
        "Aliya 3": "Numbers 14:8-14:25",
        "Aliya 4": "Numbers 14:26-15:7",
        "Aliya 5": "Numbers 15:8-15:16",
        "Aliya 6": "Numbers 15:17-15:26",
        "Aliya 7": "Numbers 15:27-15:41"
    },
    "Korach": {
        "Whole Parsha": "Numbers 16:1-18:32",
        "Aliya 1": "Numbers 16:1-16:13",
        "Aliya 2": "Numbers 16:14-16:19",
        "Aliya 3": "Numbers 16:20-17:8",
        "Aliya 4": "Numbers 17:9-17:15",
        "Aliya 5": "Numbers 17:16-17:24",
        "Aliya 6": "Numbers 17:25-18:20",
        "Aliya 7": "Numbers 18:21-18:32"
    },
    "Chukat": {
        "Whole Parsha": "Numbers 19:1-22:1",
        "Aliya 1": "Numbers 19:1-19:17",
        "Aliya 2": "Numbers 19:18-20:6",
        "Aliya 3": "Numbers 20:7-20:13",
        "Aliya 4": "Numbers 20:14-20:21",
        "Aliya 5": "Numbers 20:22-21:9",
        "Aliya 6": "Numbers 21:10-21:20",
        "Aliya 7": "Numbers 21:21-22:1"
    },
    "Balak": {
        "Whole Parsha": "Numbers 22:2-25:9",
        "Aliya 1": "Numbers 22:2-22:12",
        "Aliya 2": "Numbers 22:13-22:20",
        "Aliya 3": "Numbers 22:21-22:38",
        "Aliya 4": "Numbers 22:39-23:12",
        "Aliya 5": "Numbers 23:13-23:26",
        "Aliya 6": "Numbers 23:27-24:13",
        "Aliya 7": "Numbers 24:14-25:9"
    },
    "Pinchas": {
        "Whole Parsha": "Numbers 25:10-30:1",
        "Aliya 1": "Numbers 25:10-26:4",
        "Aliya 2": "Numbers 26:5-26:51",
        "Aliya 3": "Numbers 26:52-27:5",
        "Aliya 4": "Numbers 27:6-27:23",
        "Aliya 5": "Numbers 28:1-28:15",
        "Aliya 6": "Numbers 28:16-29:11",
        "Aliya 7": "Numbers 29:12-30:1"
    },
    "Matot": {
        "Whole Parsha": "Numbers 30:2-32:42",
        "Aliya 1": "Numbers 30:2-31:12",
        "Aliya 2": "Numbers 31:13-31:54",
        "Aliya 3": "Numbers 32:1-32:19",
        "Aliya 4": "Numbers 32:20-33:49",
        "Aliya 5": "Numbers 33:50-34:15",
        "Aliya 6": "Numbers 34:16-35:8",
        "Aliya 7": "Numbers 35:9-36:13"
    },
    "Masei": {
        "Whole Parsha": "Numbers 33:1-36:13",
        "Aliya 1": "",
        "Aliya 2": "",
        "Aliya 3": "",
        "Aliya 4": "",
        "Aliya 5": "",
        "Aliya 6": "",
        "Aliya 7": ""
    },
    "Devarim": {
        "Whole Parsha": "Deuteronomy 1:1-3:22",
        "Aliya 1": "Deuteronomy 1:1-1:10",
        "Aliya 2": "Deuteronomy 1:11-1:21",
        "Aliya 3": "Deuteronomy 1:22-1:38",
        "Aliya 4": "Deuteronomy 1:39-2:1",
        "Aliya 5": "Deuteronomy 2:2-2:30",
        "Aliya 6": "Deuteronomy 2:31-3:14",
        "Aliya 7": "Deuteronomy 3:15-3:22"
    },
    "Va'etchanan": {
        "Whole Parsha": "Deuteronomy 3:23-7:11",
        "Aliya 1": "Deuteronomy 3:23-4:4",
        "Aliya 2": "Deuteronomy 4:5-4:40",
        "Aliya 3": "Deuteronomy 4:41-4:49",
        "Aliya 4": "Deuteronomy 5:1-5:18",
        "Aliya 5": "Deuteronomy 5:19-6:3",
        "Aliya 6": "Deuteronomy 6:4-6:25",
        "Aliya 7": "Deuteronomy 7:1-7:11"
    },
    "Eikev": {
        "Whole Parsha": "Deuteronomy 7:12-11:25",
        "Aliya 1": "Deuteronomy 7:12-8:10",
        "Aliya 2": "Deuteronomy 8:11-9:3",
        "Aliya 3": "Deuteronomy 9:4-9:29",
        "Aliya 4": "Deuteronomy 10:1-10:11",
        "Aliya 5": "Deuteronomy 10:12-11:9",
        "Aliya 6": "Deuteronomy 11:10-11:21",
        "Aliya 7": "Deuteronomy 11:22-11:25"
    },
    "Re'eh": {
        "Whole Parsha": "Deuteronomy 11:26-16:17",
        "Aliya 1": "Deuteronomy 11:26-12:10",
        "Aliya 2": "Deuteronomy 12:11-12:28",
        "Aliya 3": "Deuteronomy 12:29-13:19",
        "Aliya 4": "Deuteronomy 14:1-14:21",
        "Aliya 5": "Deuteronomy 14:22-14:29",
        "Aliya 6": "Deuteronomy 15:1-15:18",
        "Aliya 7": "Deuteronomy 15:19-16:17"
    },
    "Shoftim": {
        "Whole Parsha": "Deuteronomy 16:18-21:9",
        "Aliya 1": "Deuteronomy 16:18-17:13",
        "Aliya 2": "Deuteronomy 17:14-17:20",
        "Aliya 3": "Deuteronomy 18:1-18:5",
        "Aliya 4": "Deuteronomy 18:6-18:13",
        "Aliya 5": "Deuteronomy 18:14-19:13",
        "Aliya 6": "Deuteronomy 19:14-20:9",
        "Aliya 7": "Deuteronomy 20:10-21:9"
    },
    "Ki Teitzei": {
        "Whole Parsha": "Deuteronomy 21:10-25:19",
        "Aliya 1": "Deuteronomy 21:10-21:21",
        "Aliya 2": "Deuteronomy 21:22-22:7",
        "Aliya 3": "Deuteronomy 22:8-23:7",
        "Aliya 4": "Deuteronomy 23:8-23:24",
        "Aliya 5": "Deuteronomy 23:25-24:4",
        "Aliya 6": "Deuteronomy 24:5-24:13",
        "Aliya 7": "Deuteronomy 24:14-25:19"
    },
    "Ki Tavo": {
        "Whole Parsha": "Deuteronomy 26:1-29:8",
        "Aliya 1": "Deuteronomy 26:1-26:11",
        "Aliya 2": "Deuteronomy 26:12-26:15",
        "Aliya 3": "Deuteronomy 26:16-26:19",
        "Aliya 4": "Deuteronomy 27:1-27:10",
        "Aliya 5": "Deuteronomy 27:11-28:6",
        "Aliya 6": "Deuteronomy 28:7-28:69",
        "Aliya 7": "Deuteronomy 29:1-29:8"
    },
    "Nitzavim": {
        "Whole Parsha": "Deuteronomy 29:9-30:20",
        "Aliya 1": "Deuteronomy 29:9-29:28",
        "Aliya 2": "Deuteronomy 30:1-30:6",
        "Aliya 3": "Deuteronomy 30:7-30:14",
        "Aliya 4": "Deuteronomy 30:15-31:6",
        "Aliya 5": "Deuteronomy 31:7-31:13",
        "Aliya 6": "Deuteronomy 31:14-31:19",
        "Aliya 7": "Deuteronomy 31:20-31:30"
    },
    "Vayelech": {
        "Whole Parsha": "Deuteronomy 31:1-31:30",
        "Aliya 1": "",
        "Aliya 2": "",
        "Aliya 3": "",
        "Aliya 4": "",
        "Aliya 5": "",
        "Aliya 6": "",
        "Aliya 7": ""
    },
    "Ha'azinu": {
        "Whole Parsha": "Deuteronomy 32:1-32:52",
        "Aliya 1": "Deuteronomy 32:1-32:6",
        "Aliya 2": "Deuteronomy 32:7-32:12",
        "Aliya 3": "Deuteronomy 32:13-32:18",
        "Aliya 4": "Deuteronomy 32:19-32:28",
        "Aliya 5": "Deuteronomy 32:29-32:39",
        "Aliya 6": "Deuteronomy 32:40-32:43",
        "Aliya 7": "Deuteronomy 32:44-32:52"
    },
    "V'Zot HaBerachah": {
        "Whole Parsha": "Deuteronomy 33:1-34:12",
        "Aliya 1": "Deuteronomy 33:1-33:7",
        "Aliya 2": "Deuteronomy 33:8-33:12",
        "Aliya 3": "Deuteronomy 33:13-33:17",
        "Aliya 4": "Deuteronomy 33:18-33:21",
        "Aliya 5": "Deuteronomy 33:22-33:26",
        "Aliya 6": "Deuteronomy 33:27-34:12",
        "Aliya 7": "Genesis 1:1-2:3"
    },
        };

        const parshaNames = Object.keys(parshaData); 
        let selectedParsha = parshaNames[0]; // Track the currently selected Parsha

// Helper function to get nodes by tag name, namespace-aware
function getNodesByTagNameNS(node, tagName) {
    if (!node || typeof node.getElementsByTagNameNS !== 'function') {
        return [];
    }
    const nodes = node.getElementsByTagNameNS('*', tagName);
    if (nodes && nodes.length) {
        return Array.from(nodes);
    }
    if (typeof node.getElementsByTagName === 'function') {
        return Array.from(node.getElementsByTagName(tagName));
    }
    return [];
}

async function fetchBookData(bookId) {
    const bookFilename = bookMap[bookId];
    if (!bookFilename) {
        console.error(`Book ID ${bookId} not found in bookMap.`);
        showError(`Invalid book selected.`);
        return;
    }
    try {
        const response = await fetch(`${DATA_BASE_PATH}${bookFilename}`);
        if (!response.ok) throw new Error(`Failed to load book data for ${bookId}`);
        const text = await response.text();
        const parser = new DOMParser();
        return parser.parseFromString(text, "application/xml");
    } catch (error) {
        console.error("Error fetching book data:", error);
        showError("Could not fetch data. Please try again later.");
    }
}


function populateParshaDropdown(bookName) {
            const parshaSelect = document.getElementById('parshaSelect');
            parshaSelect.innerHTML = '<option value="">Select Parsha</option>';

            for (let parsha in parshaData) {
                // Check if the Parsha belongs to the selected book
                if (parshaData[parsha]["Whole Parsha"].startsWith(bookName)) {
                    let option = document.createElement('option');
                    option.value = parsha;
                    option.textContent = parsha;
                    parshaSelect.appendChild(option);
                }
            }
        }


    function loadAliyot() {
    const parshaSelect = document.getElementById('parshaSelect');
    const aliyaSelect = document.getElementById('aliyaSelect');

    aliyaSelect.innerHTML = '<option value="">Select Aliya</option>'; // Reset options

    const selectedParsha = parshaSelect.value;
    if (!selectedParsha) return;

    const aliyot = parshaData[selectedParsha];
    for (let aliya in aliyot) {
        let option = document.createElement('option');
        option.value = aliyot[aliya];
        option.textContent = aliya;
        aliyaSelect.appendChild(option);
    }

    // Check if the currentAliya exists in the new Parsha's options
    if (currentAliya && Array.from(aliyaSelect.options).some(option => option.value === currentAliya)) {
        // Restore the previously selected Aliya if it still exists
        aliyaSelect.value = currentAliya;
        // We do not call loadAliyaRangeFromAliya() here to avoid unnecessary reload
    } else {
        currentAliya = null;
        const [startRef, endRef] = aliyot["Whole Parsha"].split("-");
        loadAliyaRange(startRef.trim(), endRef.trim(), selectedParsha); // Remove "Whole Parsha" argument
    }
}


function loadAliyaRangeFromAliya() {
    const aliyaSelect = document.getElementById('aliyaSelect');
    currentAliya = aliyaSelect.value; // Update the currently selected Aliya
    if (currentAliya) {
        const [startRef, endRef] = currentAliya.split("-").map(ref => ref.trim());
        loadAliyaRange(startRef, endRef);
    }
}

async function loadAliyaRange(startRef = null, endRef = null, parsha = null) {
    resetContainers(); // Clear the containers at the start
    resetFilters(); // Reset filters at the start of loading a new Aliya range
    properNounCounts = {};
    verbCounts = {};

    // Retrieve the selected Parsha if not provided
    if (!parsha) {
        const parshaSelect = document.getElementById('parshaSelect');
        parsha = parshaSelect ? parshaSelect.value : null;
    }

    // Retrieve the selected Aliya name
    const aliyaSelect = document.getElementById('aliyaSelect');
    const selectedAliya = aliyaSelect.options[aliyaSelect.selectedIndex].text; // Get the Aliya label

    if (!startRef || !endRef) {
        if (!aliyaSelect.value) {
            showError("Please select a valid Aliya.");
            return;
        }
        [startRef, endRef] = aliyaSelect.value.split("-").map(ref => ref.trim());
    }

    const [startBook, startRefPoint] = startRef.split(" ");
    const [startChapter, startVerse] = startRefPoint.split(":").map(Number);
    const [endChapter, endVerse] = endRef.includes(":") ? endRef.split(":").map(Number) : [startChapter, parseInt(endRef.trim())];
    
    console.log(`Loading aliya range: ${startBook} ${startChapter}:${startVerse} - ${endChapter}:${endVerse}`);

    const xmlData = await fetchBookData(startBook);
    if (!xmlData) {
        showError("Failed to load XML data");
        return;
    }

    let bookCode = startBook.slice(0, 3);
    if (startBook === "Exodus") bookCode = "Exod";
    if (startBook === "Deuteronomy") bookCode = "Deut";

    const verseContainer = document.getElementById('verseContainer');
    verseContainer.innerHTML = '';
    console.log('Processing chapters for verses (aliya range)...');
    
    // Update the title to include Parsha, Aliya (or Whole Parsha), and reference range
if (parsha) {
    const aliyaSelect = document.getElementById('aliyaSelect');
    let title;

    if (aliyaSelect.value) {
        // If a specific Aliya is selected, use the Aliya name in the title
        const selectedAliya = aliyaSelect.options[aliyaSelect.selectedIndex].text;
        title = `${parsha} - ${selectedAliya}: ${startBook} ${startChapter}:${startVerse} - ${endChapter}:${endVerse}`;
    } else {
        // If no Aliya is selected, show "Whole Parsha" in the title
        title = `${parsha} - Whole Parsha: ${startBook} ${startChapter}:${startVerse} - ${endChapter}:${endVerse}`;
    }

    document.getElementById('referenceDisplay').textContent = title;
} else {
    console.error("Parsha is not selected.");
    document.getElementById('referenceDisplay').textContent = "Please select a Parsha.";
}

    for (let chapter = startChapter; chapter <= endChapter; chapter++) {
        const chapterOsisID = `${bookCode}.${chapter}`;
        const chapterNode = getNodesByTagNameNS(xmlData, 'chapter').find(node => node.getAttribute('osisID') === chapterOsisID);

        if (!chapterNode) {
            console.warn(`Chapter not found: ${chapterOsisID}`);
            continue;
        }
        console.log(`Processing chapter ${chapterOsisID} with ${getNodesByTagNameNS(chapterNode, 'verse').length} verses`);

        const maxVerse = (chapter === endChapter) ? endVerse : Infinity;
        const minVerse = (chapter === startChapter) ? startVerse : 1;

        getNodesByTagNameNS(chapterNode, 'verse').forEach(verseNode => {
    const verseNumber = parseInt(verseNode.getAttribute("osisID").split(".")[2]);

    if (verseNumber >= minVerse && verseNumber <= maxVerse) {
        const verseDiv = document.createElement('div');
        verseDiv.className = 'verse-container';
        console.log('Created verse div with class:', verseDiv.className);

        const verseLabel = document.createElement('div');
        verseLabel.className = 'verse-label';
        verseLabel.textContent = `${startBook} ${chapter}:${verseNumber}`;
        verseDiv.appendChild(verseLabel);

        const hebrewText = document.createElement('div');
        hebrewText.className = 'hebrew-text';

        getNodesByTagNameNS(verseNode, 'w').forEach(word => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-container';
    wordSpan.textContent = word.textContent;

    const lemma = word.getAttribute("lemma");
   

    const morphCode = word.getAttribute("morph");
    const morphDescription = morphologyData[morphCode];

    if (lemma) {
        // Set data-lemma attribute for all words, including verbs
        wordSpan.setAttribute("data-lemma", lemma);
    } else {
        console.warn(`No lemma found for word: ${word.textContent}`);
    }

    // Highlight and categorize based on morphology code
    if (morphCode && /(^|[^V])N/.test(morphCode)) {
        wordSpan.classList.add("highlight-noun");

        if (/(Np|VNp)/.test(morphCode)) {
            wordSpan.classList.add("highlight-proper-noun");
            properNounCounts[lemma] = (properNounCounts[lemma] || 0) + 1;
        }
    }

    if (morphologyData[morphCode]?.toLowerCase().includes("construct") &&
        morphologyData[morphCode]?.toLowerCase().includes("noun") &&
        !morphologyData[morphCode]?.toLowerCase().includes("suffix")) {
        wordSpan.classList.add('construct-noun');
    }

    // Check for verbs specifically and count them
    if (morphCode && morphCode.includes("V")) { 
        wordSpan.classList.add('highlight-verb');
        verbCounts[lemma] = (verbCounts[lemma] || 0) + 1;
    }

    if (morphCode && morphCode.includes("D")) {
  wordSpan.classList.add('highlight-adverb'); // Add the class to the wordSpan
  adverbCounts[lemma] = (adverbCounts[lemma] || 0) + 1;
}

    if (morphCode && /^HR(\b|\/|$)/.test(morphCode)) {
    }

    wordSpan.onclick = async () => {
        const wordInfo = verseDiv.querySelector('.word-info');
        wordInfo.innerHTML = `
            <section><span class="section-title">Word:</span> ${word.textContent}</section>
            <section><span class="section-title">Lemma:</span> ${lemma}</section>
            <section><span class="section-title">Morphology Code:</span> ${morphCode}</section>
            <section><span class="section-title">Morphology Description:</span> ${morphDescription || 'Not available in data.'}</section>
            <div class="search-options">
                <button onclick="displayLemmaOccurrences('${lemma}', 'section')">Find in Section</button>
                <button onclick="findInTanach('${lemma}')">Find in Tanach</button>
            </div>`;

        const bdbSection = document.createElement('section');
        bdbSection.className = 'bdb-section';

        const lemmaID = `H${lemma.replace(/\D/g, '')}`;
        const lemmaInfo = lemmaData[lemmaID];
        bdbSection.innerHTML = `<span class="section-title">BDB Entry</span><br>`;

        if (lemmaInfo) {
            bdbSection.innerHTML += `<strong>Word:</strong> ${lemmaInfo.word}<br><strong>Definition:</strong> ${lemmaInfo.definition}<br>`;
        } else {
            bdbSection.innerHTML += "No BDB data available for this lemma.";
        }

        wordInfo.appendChild(bdbSection);
    };

    hebrewText.appendChild(wordSpan);
});

        verseDiv.appendChild(hebrewText);

        const wordInfo = document.createElement('div');
        wordInfo.className = 'word-info';
        wordInfo.textContent = 'Click a word to see details';
        verseDiv.appendChild(wordInfo);

        verseContainer.appendChild(verseDiv);
        console.log('Verse content:', verseDiv.textContent.substring(0, 100) + '...');
        console.log('Added verse to container, total verses:', verseContainer.children.length);
    

    // Call lemma usage calculation after verse loading completes
   
                
            }
        });
    }

    initializeWordCounts();
    calculateLemmaUsagePercentage();

    if (Object.keys(properNounCounts).length > 0 || Object.keys(verbCounts).length > 0 || Object.keys(adverbCounts).length > 0 || Object.keys(adverbCounts).length > 0) {
        updateChart();
    } else {
        console.warn("No proper nouns, verbs, or adverbs found in the selected range.");
    }

    // Add these lines to show the hidden elements:
    document.getElementById('referenceDisplay').style.display = 'block';
    document.querySelector('.filter-box').style.display = 'block';
    document.querySelector('.controls').style.display = 'block';
    
    document.getElementById('tableToggleWrapper').style.display = 'block';
   
    document.querySelector('.lemma-search').style.display = 'block';
    document.querySelector('button[onclick="showAllWords()"]').style.display = 'block'; 
    document.getElementById('verseContainer').style.display = 'block';
    console.log('Verse container display set to block'); 
    document.getElementById('chartControls').style.display = 'block';


}

async function loadVerse() {
    resetContainers(); // Clear the containers at the start
    resetFilters(); // Reset filters at the start of loading new verses
    properNounCounts = {};
    verbCounts = {};
    adverbCounts = {};
    prepositionCounts = {};

    const rangeInput = document.getElementById('verseRange').value.trim();
    const bookSelect = document.getElementById('bookSelect').value;
    const verseContainer = document.getElementById('verseContainer');
    verseContainer.innerHTML = ''; // Clear any previous verses
    console.log('Processing chapters for verses (custom range)...');

    const booksToLoad = (bookSelect === "Whole Tanach") ? Object.keys(bookMap) : [bookSelect];
    let title = bookSelect === "Whole Tanach" ? "Whole Tanach" : bookSelect;
    const usedLemmas = new Set(); // Track used lemmas for logging unused lemmas later

    for (const book of booksToLoad) {
        const xmlFile = bookMap[book];
        if (!xmlFile) {
            console.error(`Book ID ${book} not found in bookMap.`);
            continue;
        }

        const xmlData = await fetchBookData(book);
        if (!xmlData) continue;

        const bookCode = xmlFile.replace(".xml", "");
        const chapterCount = books[book].chapters.length;

        // Initialize start and end chapters and verses based on input
        let startChapter = 1,
            endChapter = chapterCount,
            startVerse = 1,
            endVerse = books[book].chapters[chapterCount - 1];

        if (bookSelect !== "Whole Tanach" && rangeInput) {
            const rangeParsed = parseRangeInput(rangeInput, book);
            startChapter = rangeParsed.startChapter;
            startVerse = rangeParsed.startVerse;
            endChapter = rangeParsed.endChapter;
            endVerse = rangeParsed.endVerse;
            title = `${book} ${rangeInput}`;
        }

        // Update title display
        document.getElementById('referenceDisplay').textContent = title;

        // Main loop through chapters and verses
        for (let chapter = startChapter; chapter <= endChapter; chapter++) {
            const chapterNode = getNodesByTagNameNS(xmlData, 'chapter').find(node => node.getAttribute('osisID') === `${bookCode}.${chapter}`);
            if (!chapterNode) continue;

            const maxVerse = (chapter === endChapter) ? endVerse : books[book].chapters[chapter - 1];
            const minVerse = (chapter === startChapter) ? startVerse : 1;

            getNodesByTagNameNS(chapterNode, 'verse').forEach(verseNode => {
                const verseNumber = parseInt(verseNode.getAttribute("osisID").split(".")[2]);

                if (verseNumber >= minVerse && verseNumber <= maxVerse) {
                    const verseDiv = document.createElement('div');
                    verseDiv.className = 'verse-container';

                    const verseLabel = document.createElement('div');
                    verseLabel.className = 'verse-label';
                    verseLabel.textContent = `${book} ${chapter}:${verseNumber}`; // Fixed `startBook` to `book`
                    verseDiv.appendChild(verseLabel);

                    const hebrewText = document.createElement('div');
                    hebrewText.className = 'hebrew-text';

                    getNodesByTagNameNS(verseNode, 'w').forEach(word => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-container';
    wordSpan.textContent = word.textContent;

    const lemma = word.getAttribute("lemma");

    const morphCode = word.getAttribute("morph");
    const morphDescription = morphologyData[morphCode];

    if (lemma) {
        // Set data-lemma attribute for all words, including verbs
        wordSpan.setAttribute("data-lemma", lemma);
    } else {
        console.warn(`No lemma found for word: ${word.textContent}`);
    }

    // Highlight and categorize based on morphology code
    if (morphCode && /(^|[^V])N/.test(morphCode)) {
        wordSpan.classList.add("highlight-noun");

        if (/(Np|VNp)/.test(morphCode)) {
            wordSpan.classList.add("highlight-proper-noun");
            properNounCounts[lemma] = (properNounCounts[lemma] || 0) + 1;
        }
    }

    if (morphologyData[morphCode]?.toLowerCase().includes("construct") &&
        morphologyData[morphCode]?.toLowerCase().includes("noun") &&
        !morphologyData[morphCode]?.toLowerCase().includes("suffix")) {
        wordSpan.classList.add('construct-noun');
    }

    // Check for verbs specifically and count them
    if (morphCode && morphCode.includes("V")) { 
        wordSpan.classList.add('highlight-verb');
        verbCounts[lemma] = (verbCounts[lemma] || 0) + 1;
    }

    if (morphCode && morphCode.includes("D")) {
  wordSpan.classList.add('highlight-adverb'); // Add the class to the wordSpan
  adverbCounts[lemma] = (adverbCounts[lemma] || 0) + 1;
}

    if (morphCode && /^HR(\b|\/|$)/.test(morphCode)) {
    }

    wordSpan.onclick = async () => {
        const wordInfo = verseDiv.querySelector('.word-info');
        wordInfo.innerHTML = `
            <section><span class="section-title">Word:</span> ${word.textContent}</section>
            <section><span class="section-title">Lemma:</span> ${lemma}</section>
            <section><span class="section-title">Morphology Code:</span> ${morphCode}</section>
            <section><span class="section-title">Morphology Description:</span> ${morphDescription || 'Not available in data.'}</section>
            <div class="search-options">
                <button onclick="displayLemmaOccurrences('${lemma}', 'section')">Find in Section</button>
                <button onclick="findInTanach('${lemma}')">Find in Tanach</button>
            </div>`;

        const bdbSection = document.createElement('section');
        bdbSection.className = 'bdb-section';

        const lemmaID = `H${lemma.replace(/\D/g, '')}`;
        const lemmaInfo = lemmaData[lemmaID];
        bdbSection.innerHTML = `<span class="section-title">BDB Entry</span><br>`;

        if (lemmaInfo) {
            bdbSection.innerHTML += `<strong>Word:</strong> ${lemmaInfo.word}<br><strong>Definition:</strong> ${lemmaInfo.definition}<br>`;
        } else {
            bdbSection.innerHTML += "No BDB data available for this lemma.";
        }

        wordInfo.appendChild(bdbSection);
    };

    hebrewText.appendChild(wordSpan);
});

                    verseDiv.appendChild(hebrewText);

                    const wordInfo = document.createElement('div');
                    wordInfo.className = 'word-info';
                    wordInfo.textContent = 'Click a word to see details';
                    verseDiv.appendChild(wordInfo);

                    verseContainer.appendChild(verseDiv);
        console.log('Verse content:', verseDiv.textContent.substring(0, 100) + '...');
        console.log('Added verse to container, total verses:', verseContainer.children.length);
                }
            });
        }
    }

    initializeWordCounts();
    
    calculateLemmaUsagePercentage();

    if (Object.keys(properNounCounts).length > 0 || Object.keys(verbCounts).length > 0 || Object.keys(adverbCounts).length > 0 || Object.keys(adverbCounts).length > 0) {
        updateChart();
    }

    if (bookSelect === "Whole Tanach") {
        const allLemmaIDs = Object.keys(lemmaData);
        const unusedLemmas = allLemmaIDs.filter(lemmaID => !usedLemmas.has(lemmaID));
        console.log("Unused lemmas:", unusedLemmas);
    }

    // Add these lines to show the hidden elements:
    document.getElementById('referenceDisplay').style.display = 'block';
    document.querySelector('.filter-box').style.display = 'block';
    document.querySelector('.controls').style.display = 'block';
    
    document.getElementById('tableToggleWrapper').style.display = 'block';
    document.querySelector('.lemma-search').style.display = 'block';
    document.querySelector('button[onclick="showAllWords()"]').style.display = 'block'; 
    document.getElementById('verseContainer').style.display = 'block';
    console.log('Verse container display set to block'); 
    document.getElementById('chartControls').style.display = 'block';
}

// Function moved to avoid duplication

async function findInTanach(lemmaNumber) {
    const numericLemmaNumber = lemmaNumber.match(/\d+/)?.[0];

    if (!numericLemmaNumber) {
        console.error("Invalid lemma number. Please provide a valid lemma.");
        return;
    }

    // Reset to Whole Tanach
    document.getElementById("bookSelect").value = "Whole Tanach";
    document.getElementById("verseRange").value = ""; // Clear any range input

    // Load the whole Tanach into the verse container
    await loadVerse();

    // After loading, filter and highlight the lemma
    displayLemmaOccurrences(numericLemmaNumber);
}

// Function to display lemma details upon word click
async function displayLemmaOnWordClick(wordSpan, wordText, lemma, morphCode, morphDescription) {
    const lemmaNumber = lemma.match(/\d+/)?.[0];
    const wordInfo = wordSpan.closest('.verse-container').querySelector('.word-info');
    wordInfo.innerHTML = `
        <section><span class="section-title">Word:</span> ${wordText}</section>
        <section><span class="section-title">Lemma:</span> ${lemma}</section>
        <section><span class="section-title">Morphology Code:</span> ${morphCode}</section>
        <section><span class="section-title">Morphology Description:</span> ${morphDescription || 'Not available in data.'}</section>
        <div class="search-options">
            <button onclick="displayLemmaOccurrences('${lemmaNumber}', 'section')">Find in Section</button>
        </div>`;

    const bdbSection = document.createElement('section');
    bdbSection.className = 'bdb-section';

    if (lemmaNumber) {
        const lemmaID = `H${lemmaNumber}`;
        const lemmaInfo = lemmaData[lemmaID];

        if (lemmaInfo) {
            bdbSection.innerHTML = `<span class="section-title">BDB Entry</span><br>`;
            bdbSection.innerHTML += `<strong>Word:</strong> ${lemmaInfo.word}<br><strong>Definition:</strong> ${lemmaInfo.definition}`;
        } else {
            bdbSection.innerHTML = "No BDB data available for this lemma.";
        }
    } else {
        bdbSection.innerHTML = "Invalid lemma format.";
    }

    wordInfo.appendChild(bdbSection);
}

// Helper function for parsing the range input
function parseRangeInput(rangeInput, book) {
    let startChapter, startVerse, endChapter, endVerse;
    if (/^\d+$/.test(rangeInput)) {
        startChapter = parseInt(rangeInput, 10);
        endChapter = startChapter;
        startVerse = 1;
        endVerse = books[book].chapters[startChapter - 1];
    } else if (/^\d+-\d+$/.test(rangeInput)) {
        [startChapter, endChapter] = rangeInput.split("-").map(Number);
        startVerse = 1;
        endVerse = books[book].chapters[endChapter - 1];
    } else if (rangeInput.includes("-")) {
        const [start, end] = rangeInput.split("-");
        [startChapter, startVerse] = start.split(":").map(Number);
        [endChapter, endVerse] = end.split(":").map(Number);
    } else {
        [startChapter, startVerse] = rangeInput.split(":").map(Number);
        endChapter = startChapter;
        endVerse = startVerse;
    }
    return { startChapter, startVerse, endChapter, endVerse };
}


function expandMorphology(morphCode, button) {
   
    
    const standardizedCode = morphCode.trim();
    const wordInfo = button.parentNode;

    if (button.textContent === "Expand Morphology") {
        

        if (morphologyData.hasOwnProperty(standardizedCode)) {
            const description = morphologyData[standardizedCode];
            wordInfo.innerHTML += `<br><strong>Morphology Description:</strong> ${description}`;
            button.textContent = "Hide Morphology";
            
        } else {
            wordInfo.innerHTML += `<br><strong>Morphology Description:</strong> Not found in Oshm.xml`;
            
        }
    } else {
        const description = wordInfo.querySelector('br + strong');
        if (description) description.remove(); // Remove expanded description
        button.textContent = "Expand Morphology";
        
    }
}

// Ensure morphology data is loaded on page load
window.onload = async function() {
    await loadMorphologyData(); // Preload morphology data
    populateParshaDropdown();
};



        

        function showError(message) {
            const errorDiv = document.getElementById('error');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }

        window.onload = populateParshaDropdown;
        

        function countVerbsAndProperNouns(wordSpan, morphDescription, lemmaNumber) {
    // Count proper nouns based on morphology code
    if (morphDescription.toLowerCase().includes("proper noun")) {
        properNounCounts[lemmaNumber] = (properNounCounts[lemmaNumber] || 0) + 1;
    }

    // Count verbs based on morphology description
    if (morphDescription.toLowerCase().includes("verb")) {
        verbCounts[lemmaNumber] = (verbCounts[lemmaNumber] || 0) + 1;
    }
}
        
function updateChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    const chartTypeSelect = document.getElementById('chartTypeSelect').value;
    console.log("Chart type selected:", chartTypeSelect);
    console.log("Proper noun counts available:", Object.keys(properNounCounts).length);
    console.log("Verb counts available:", Object.keys(verbCounts).length);
    console.log("Adverb counts available:", Object.keys(adverbCounts).length);
    
    let consolidatedData = {}; 
    let chartLabels = [], chartData = [], chartLabel = '', chartLemmas = [];

    const getFilteredLabel = (lemmaNumber) => {
        const baseLemma = lemmaNumber.match(/\d+/)?.[0];
        if (!baseLemma) {
            console.error(`Unable to parse base lemma from lemmaNumber: ${lemmaNumber}`);
            return lemmaNumber;
        }
        const lemmaID = `H${baseLemma}`;
        const entry = lemmaData[lemmaID] || {};
        const word = entry.word || baseLemma;
        const xlit = entry.xlit || '';
        return { label: `${word} (${xlit})`, xlit, baseLemma };
    };

    const addToConsolidatedData = (lemmaNumber, frequency) => {
        const baseLemma = lemmaNumber.match(/\d+/)?.[0];
        if (!baseLemma) {
            console.error(`Unable to parse base lemma from lemmaNumber: ${lemmaNumber}`);
            return;
        }
        const { label, xlit } = getFilteredLabel(baseLemma);
        if (consolidatedData[baseLemma]) {
            consolidatedData[baseLemma].frequency += frequency;
        } else {
            consolidatedData[baseLemma] = {
                label,
                frequency: frequency,
                lemmaNumber: baseLemma,
                xlit
            };
        }
    };

    if (chartTypeSelect === "properNouns") {
        console.log("Proper noun counts before processing:", properNounCounts);
        Object.entries(properNounCounts)
            .filter(([lemma]) => !lemma.includes("+"))
            .forEach(([lemma, frequency]) => addToConsolidatedData(lemma, frequency));
        chartLabel = 'Proper Noun Frequency';
} else if (chartTypeSelect === "verbs") {
    Object.entries(verbCounts)
        .filter(([lemma]) => !lemma.includes("+"))
        .forEach(([lemma, frequency]) => addToConsolidatedData(lemma, frequency));
    chartLabel = 'Verb Frequency';
} else if (chartTypeSelect === "adverbs") { // New condition for adverbs
    Object.entries(adverbCounts)
        .filter(([lemma]) => !lemma.includes("+"))
        .forEach(([lemma, frequency]) => addToConsolidatedData(lemma, frequency));
    chartLabel = 'Adverb Frequency';

    const sortedData = Object.values(consolidatedData).sort((a, b) => b.frequency - a.frequency);
    chartLabels = sortedData.slice(0, 10).map(item => item.label);
    chartData = sortedData.slice(0, 10).map(item => item.frequency);
    chartLemmas = sortedData.slice(0, 10).map(item => item.lemmaNumber);

    const fullTableHTML = sortedData.map((item, index) => `
        <tr onclick="handleTableRowClick('${item.lemmaNumber}', ${index})">
            <td>${item.label}</td>
            <td>${item.frequency}</td>
        </tr>
    `).join("");

    // Only update the tbody, not the entire table
    const tbody = document.querySelector("#fullLemmaTable tbody");
    if (tbody) {
        tbody.innerHTML = fullTableHTML;
    }

    // Hide the table by default when updating the chart
    document.getElementById("fullLemmaTableWrapper").style.display = "none";
    document.getElementById("toggleTableButton").textContent = "Show Full Table";

    // Add console.log statements to check the data
    console.log("Chart Labels:", chartLabels);
    console.log("Chart Data:", chartData);
    console.log("Chart Label:", chartLabel);
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: chartLabel,
                data: chartData,
                backgroundColor: Array(chartLabels.length).fill('rgba(255, 205, 86, 0.8)'),
                borderColor: Array(chartLabels.length).fill('rgba(255, 159, 64, 1)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { beginAtZero: true },
                y: { beginAtZero: true }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const clickedIndex = elements[0].index;
                    const selectedLemmaNumber = chartLemmas[clickedIndex];
                    filterByLemmaNumber(selectedLemmaNumber); // Filter verses using correct logic
                    highlightSelectionInChart(clickedIndex); // Highlight chart bar

// Log chart instance to check if it's created
console.log("Chart instance:", chartInstance);

// Explicitly show the chart canvas only if there is data
const chartCanvas = document.getElementById('chart');
if (chartData.length > 0) {
    chartCanvas.style.display = 'block';
} else {
    chartCanvas.style.display = 'none';
}
    }

}

function highlightSelectionInTable(selectedIndex) {
    const rows = document.querySelectorAll("#fullLemmaTable tbody tr");
    rows.forEach((row, index) => {
        // Add 'selected' class only to the clicked row
        row.classList.toggle("selected", index === selectedIndex);
    });
}

function handleTableClick(lemmaNumber, rowIndex, chartType) {
    filterByLemmaNumber(lemmaNumber, chartType); // Filters verses
    highlightSelectionInTable(rowIndex); // Highlights the clicked table row
    highlightSelectionInChart(rowIndex); // Highlights the corresponding chart bar
}



function filterByLemmaNumber(lemmaNumber) {
    document.getElementById("lemmaInput").value = lemmaNumber; // Populate input field for transparency
    filterByLemma(); // Use the updated filter function
    scrollToVersesContainer(); // Scroll to verses container
}
// Highlight a row in the table
function highlightSelectionInTable(selectedRow) {
    document.querySelectorAll("#fullLemmaTable tbody tr").forEach(row => row.classList.remove("selected"));
    selectedRow.classList.add("selected");
}

function highlightSelectionInChart(index) {
    const dataset = chartInstance.data.datasets[0];
    const matchHighlightColor = getComputedStyle(document.documentElement).getPropertyValue('--match-highlight-color').trim();

    dataset.backgroundColor = dataset.backgroundColor.map((color, i) => 
        i === index ? matchHighlightColor : 'rgba(255, 205, 86, 0.8)' // Default bar color
    );
    chartInstance.update(); // Refresh chart to apply changes
}

// Handle clicking on a table row
function handleTableRowClick(lemmaNumber, rowIndex) {
    const tableRow = document.querySelectorAll("#fullLemmaTable tbody tr")[rowIndex];
    filterByLemmaNumber(lemmaNumber); // Filter verses using correct lemma logic
    highlightSelectionInTable(tableRow); // Highlight table row
    highlightSelectionInChart(rowIndex); // Highlight chart bar
}

// Handle clicking on a chart bar
function handleChartBarClick(lemmaNumber, chartIndex) {
    const tableRow = document.querySelectorAll("#fullLemmaTable tbody tr")[chartIndex];
    filterByLemmaNumber(lemmaNumber); // Filter verses using correct lemma logic
    highlightSelectionInTable(tableRow); // Highlight table row
    highlightSelectionInChart(chartIndex); // Highlight chart bar
}

function scrollToVersesContainer() {
    const versesContainer = document.getElementById("verseContainer");
    if (versesContainer) {
        setTimeout(() => {
            versesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
}

function filterVersesByLemma(selectedLemma, chartTypeSelect) {
    const isVerbFilter = chartTypeSelect === 'verbs';
    const verseContainer = document.getElementById('verseContainer');
    const verses = verseContainer.querySelectorAll('.verse-container');

    let found = false;

    verses.forEach(verse => {
        const words = verse.querySelectorAll('.word-container');
        
        const hasLemma = Array.from(words).some(wordSpan => {
            const wordLemma = wordSpan.getAttribute('data-lemma');
            const isVerb = wordSpan.classList.contains('highlight-verb');
            const isProperNoun = wordSpan.classList.contains('highlight-proper-noun');

            const lemmaRegex = new RegExp(`(^|[a-z]+/)${selectedLemma}(/|$)`, 'i');

            if (isVerbFilter) {
                return lemmaRegex.test(wordLemma) && isVerb;
            } else {
                return lemmaRegex.test(wordLemma) && isProperNoun;
            }
        });

        verse.style.display = hasLemma ? 'block' : 'none';
        if (hasLemma) found = true;
    });

    if (!found) {
        console.warn(`No verses found with lemma: ${selectedLemma}`);
    }
}




function resetFilters() {
    activeFilters = {}; // Clear all active filters

    // Uncheck all filter checkboxes
    document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Hide any word lists that might be open
    document.querySelectorAll('.word-list').forEach(list => {
        list.style.display = 'none';
    });
}

// Initialize counts and populate word counts in the UI
async function initializeWordCounts() {
    await loadLemmaData(); // Ensure BDB data is loaded

    // Add 'highlight-adverb' to the filterTypes array:
    const filterTypes = ["highlight-noun", "highlight-proper-noun", "construct-noun", "highlight-verb", "highlight-adverb"]; 
    
    for (const typeClass of filterTypes) {
        const totalWords = getTotalWords(typeClass); 
        const uniqueWords = getUniqueWordsByLemma(typeClass); 

        const totalCountElement = document.getElementById(`${typeClass}-count`);
        if (totalCountElement) {
            totalCountElement.textContent = totalWords.size;
        }

        const uniqueCountElement = document.getElementById(`${typeClass}-unique-count`);
        if (uniqueCountElement) {
            uniqueCountElement.textContent = uniqueWords.size;
        }
    }
}
// Gather total word occurrences, treating compounds as single units
// Gather total word occurrences, treating compounds as single units
// Gather total word occurrences, treating compounds as single units with detailed logging
function getTotalWords(typeClass) {
    const words = new Map();
    let compoundInProgress = false;
    let compoundText = "";
    let compoundKey = "";
    let compoundCounted = new Set(); // Track compounds already counted in the verse

    
    document.querySelectorAll(`.word-container.${typeClass}`).forEach((wordSpan, index, allSpans) => {
        const lemma = wordSpan.getAttribute("data-lemma");
        const wordText = wordSpan.textContent;

       

        if (lemma && lemma.includes("+")) {
            // Start or continue a compound
            compoundInProgress = true;
            compoundText = wordText;
            compoundKey = lemma.replace("+", ""); // Use base lemma without "+"
            
        } else if (compoundInProgress) {
            // Add the second part of the compound
            compoundText += ` ${wordText}`;
            compoundInProgress = false;

            // Check if the compound has already been counted for this verse
            if (!compoundCounted.has(compoundText)) {
                compoundCounted.add(compoundText);
                words.set(compoundText, (words.get(compoundText) || 0) + 1);
                
            } else {
               
            }
        } else {
            // Normal word, not part of a compound
            words.set(wordText, (words.get(wordText) || 0) + 1);
           
        }
    });

   
    return words;
}


// Helper function to normalize text by removing vowels and accents
function normalizeText(text) {
    return text.normalize("NFD").replace(/[\u0591-\u05C7]/g, ""); // Strip Hebrew diacritics
}


// Gather unique lemmas by numeric ID only, handling compounds




// Toggle filter state on checkbox click
function toggleFilter(typeClass) {
    const verseContainer = document.getElementById('verseContainer');
    const verses = verseContainer.querySelectorAll('.verse-container');
    const checkbox = document.getElementById(`${typeClass}-checkbox`);

    if (checkbox.checked) {
        activeFilters[typeClass] = true;
    } else {
        delete activeFilters[typeClass];
    }

    verses.forEach(verse => {
        const wordSpans = verse.querySelectorAll('.word-container');
        
        wordSpans.forEach(wordSpan => {
            if (wordSpan.classList.contains(typeClass)) {
                if (checkbox.checked) {
                    // Show highlight for this type
                    wordSpan.style.setProperty('background-color', '', 'important');
                    wordSpan.style.setProperty('color', '', 'important');
                    wordSpan.style.setProperty('border', '', 'important');
                    wordSpan.classList.remove('highlight-hidden');
                } else {
                    // Hide highlight for this type
                    wordSpan.classList.add('highlight-hidden');
                    if (typeClass === 'highlight-noun') {
                        wordSpan.style.setProperty('background-color', 'transparent', 'important');
                    } else if (typeClass === 'highlight-verb') {
                        wordSpan.style.setProperty('background-color', 'transparent', 'important');
                    } else if (typeClass === 'highlight-adverb') {
                        wordSpan.style.setProperty('background-color', 'transparent', 'important');
                    } else if (typeClass === 'highlight-proper-noun') {
                        wordSpan.style.setProperty('border', 'none', 'important');
                    } else if (typeClass === 'construct-noun') {
                        wordSpan.style.setProperty('border', 'none', 'important');
                        wordSpan.style.setProperty('background-color', 'transparent', 'important');
                    }
                }
            }
        });

        // Show verse if it has any active highlights or if no filters are active
        const hasActiveHighlight = Array.from(wordSpans).some(wordSpan =>
            Object.keys(activeFilters).some(filterClass => 
                wordSpan.classList.contains(filterClass)
            )
        );

        verse.style.display = Object.keys(activeFilters).length === 0 || hasActiveHighlight ? 'block' : 'none';
    });
}

function toggleSortOrder(typeClass) {
    if (!sortOrders[typeClass]) {
        sortOrders[typeClass] = 'alpha'; // Default to alphabetical
    }
    
    // Cycle through sort orders: alpha -> reverse-alpha -> count -> reverse-count -> alpha
    switch(sortOrders[typeClass]) {
        case 'alpha':
            sortOrders[typeClass] = 'reverse-alpha';
            break;
        case 'reverse-alpha':
            sortOrders[typeClass] = 'count';
            break;
        case 'count':
            sortOrders[typeClass] = 'reverse-count';
            break;
        case 'reverse-count':
            sortOrders[typeClass] = 'alpha';
            break;
    }
    
    // Update button text
    const sortBtn = document.querySelector(`button[onclick="toggleSortOrder('${typeClass}')"]`);
    const sortLabels = {
        'alpha': 'Sort: A-Z',
        'reverse-alpha': 'Sort: Z-A',
        'count': 'Sort: Count ↑',
        'reverse-count': 'Sort: Count ↓'
    };
    sortBtn.textContent = sortLabels[sortOrders[typeClass]];
    
    // Refresh displays if they're currently visible
    const wordsContainer = document.getElementById(`${typeClass}-words`);
    const uniqueContainer = document.getElementById(`${typeClass}-unique-words`);
    
    if (wordsContainer.style.display === 'block') {
        displayWords(typeClass);
    }
    if (uniqueContainer.style.display === 'block') {
        displayUniqueWords(typeClass);
    }
}

function displayWords(typeClass) {
    const words = getTotalWords(typeClass);
    let sortedWords = Array.from(words.entries());
    
    switch(sortOrders[typeClass] || 'alpha') {
        case 'alpha':
            sortedWords.sort(([wordA], [wordB]) => wordA.localeCompare(wordB, 'he', { sensitivity: 'base' }));
            break;
        case 'reverse-alpha':
            sortedWords.sort(([wordA], [wordB]) => wordB.localeCompare(wordA, 'he', { sensitivity: 'base' }));
            break;
        case 'count':
            sortedWords.sort(([, countA], [, countB]) => countB - countA);
            break;
        case 'reverse-count':
            sortedWords.sort(([, countA], [, countB]) => countA - countB);
            break;
    }
    
    const wordsDisplay = sortedWords.map(([word, count]) => `${word} (${count})`).join(', ');
    document.getElementById(`${typeClass}-words`).innerHTML = `Total Words: ${wordsDisplay}`;
}

function displayUniqueWords(typeClass) {
    const uniqueWords = getUniqueWordsByLemma(typeClass);
    let sortedWords = Array.from(uniqueWords.entries());
    
    switch(sortOrders[typeClass] || 'alpha') {
        case 'alpha':
            sortedWords.sort(([lemmaA, wordA], [lemmaB, wordB]) => wordA.localeCompare(wordB, 'he', { sensitivity: 'base' }));
            break;
        case 'reverse-alpha':
            sortedWords.sort(([lemmaA, wordA], [lemmaB, wordB]) => wordB.localeCompare(wordA, 'he', { sensitivity: 'base' }));
            break;
        case 'count':
            // For unique words, sort by frequency in the original words map
            const totalWords = getTotalWords(typeClass);
            sortedWords.sort(([lemmaA, wordA], [lemmaB, wordB]) => {
                const countA = Array.from(totalWords.entries()).filter(([word]) => word === wordA).reduce((sum, [, count]) => sum + count, 0);
                const countB = Array.from(totalWords.entries()).filter(([word]) => word === wordB).reduce((sum, [, count]) => sum + count, 0);
                return countB - countA;
            });
            break;
        case 'reverse-count':
            const totalWordsRev = getTotalWords(typeClass);
            sortedWords.sort(([lemmaA, wordA], [lemmaB, wordB]) => {
                const countA = Array.from(totalWordsRev.entries()).filter(([word]) => word === wordA).reduce((sum, [, count]) => sum + count, 0);
                const countB = Array.from(totalWordsRev.entries()).filter(([word]) => word === wordB).reduce((sum, [, count]) => sum + count, 0);
                return countA - countB;
            });
            break;
    }
    
    const wordsDisplay = sortedWords.map(([, word]) => word).join(', ');
    document.getElementById(`${typeClass}-unique-words`).innerHTML = `Unique Lemmas: ${wordsDisplay}`;
}

function toggleWordsDisplay(typeClass) {
    const wordsListContainer = document.getElementById(`${typeClass}-words`);
    if (wordsListContainer.style.display === 'block') {
        wordsListContainer.style.display = 'none';
    } else {
        displayWords(typeClass);
        wordsListContainer.style.display = 'block';
    }
}

// Toggle unique lemma display with root words from BDB entries
function toggleUniqueWordsDisplay(typeClass) {
    const uniqueWordsListContainer = document.getElementById(`${typeClass}-unique-words`);
    if (uniqueWordsListContainer.style.display === 'block') {
        uniqueWordsListContainer.style.display = 'none';
    } else {
        displayUniqueWords(typeClass);
        uniqueWordsListContainer.style.display = 'block';
    }
}

// Load lemma data from XML and store in lemmaData
async function loadLemmaData() {
    try {
        const response = await fetch(`${DATA_BASE_PATH}HebrewStrong.xml`);
        if (!response.ok) throw new Error("Failed to load lemma data");

        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "application/xml");

        const entries = xmlDoc.querySelectorAll("entry");
        entries.forEach(entry => {
            const lemmaID = entry.getAttribute("id");
            const wordNode = entry.querySelector("w");
            const word = wordNode ? wordNode.textContent : '';
            const definition = entry.querySelector("def") ? entry.querySelector("def").textContent : '';
            const xlit = wordNode ? wordNode.getAttribute("xlit") || '' : ''; // Get xlit if available

            lemmaData[lemmaID] = { word: word, definition: definition, xlit: xlit };
        });

        console.log("Loaded lemma data:", lemmaData); // Log to confirm data loading
    } catch (error) {
        console.error("Error loading lemma data:", error);
    }
}


// Initialize counts on page load
window.addEventListener('load', initializeWordCounts);

function showAllWords() {
    const verseContainer = document.getElementById('verseContainer');
    verseContainer.querySelectorAll('.verse-container').forEach(verse => {
        verse.style.display = 'block'; // Show all verses
    });
}

function updateParshaFromSlider() {
    const slider = document.getElementById('parshaSlider');
    const sliderValue = parseInt(slider.value);
    const parshaName = parshaNames[sliderValue];

    const parshaSelect = document.getElementById('parshaSelect');
    parshaSelect.value = parshaName;

    document.getElementById('sliderValue').textContent = parshaName;

    loadAliyot(); // Load Aliyot but keep the current Aliya selection
}

function displayLemmaOccurrences(lemmaNumber) {
    const numericLemmaNumber = lemmaNumber.match(/\d+/)?.[0];
    const verseContainer = document.getElementById('verseContainer');
    const verses = verseContainer.querySelectorAll('.verse-container');

    if (!numericLemmaNumber) {
        console.error("Invalid lemma number for highlighting.");
        return;
    }

    // Clear previous highlights
    document.querySelectorAll('.word-container').forEach(word => {
        word.classList.remove('selected-word', 'match-highlight');
    });
    verses.forEach(verse => {
        verse.classList.remove('highlighted-verse');
        verse.style.display = 'none'; // Hide all verses initially
    });

    let foundMatch = false;

    verses.forEach(verse => {
        const words = verse.querySelectorAll('.word-container');
        let containsLemma = false;

        words.forEach(wordSpan => {
            const wordLemma = wordSpan.getAttribute('data-lemma');
            const lemmaMatch = wordLemma?.match(/\d+/);

            if (lemmaMatch && lemmaMatch[0] === numericLemmaNumber) {
                containsLemma = true;
                wordSpan.classList.add('match-highlight'); // Highlight matched word
            }
        });

        if (containsLemma) {
            foundMatch = true;

            // Display the matched verse and highlight the container
            verse.style.display = 'block';
            verse.classList.add('highlighted-verse');
        }
    });

    if (foundMatch) {
        // Scroll to the first highlighted verse
        const firstMatch = document.querySelector('.verse-container.highlighted-verse');
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } else {
        console.warn(`No occurrences found for lemma: ${numericLemmaNumber}`);
    }
}

async function searchOccurrencesInSection(lemmaNumber) {
    const referenceRange = document.getElementById('referenceDisplay').textContent.match(/(\w+ \d+:\d+) - (\d+:\d+)/);
    if (!referenceRange) {
        console.error("No valid range found in referenceDisplay.");
        return [];
    }

    const [_, startRef, endVerse] = referenceRange;
    const [startBook, startChapter, startVerse] = startRef.split(/[\s:]+/);
    const endChapter = startChapter; // Assuming a single chapter here; modify if range spans multiple chapters
    const endVerseNumber = parseInt(endVerse);

    const versesInRange = getCurrentLoadedVerses().filter(verseNode => {
        const osisID = verseNode.getAttribute("osisID").split(".");
        const chapter = parseInt(osisID[1]);
        const verse = parseInt(osisID[2]);

        return (
            chapter === parseInt(startChapter) &&
            verse >= parseInt(startVerse) && verse <= endVerseNumber
        );
    });

    return extractOccurrencesFromVerses(versesInRange, lemmaNumber);
}

// Helper to get currently loaded verses within the selected range
function getCurrentLoadedVerses() {
    return Array.from(document.querySelectorAll("#verseContainer .verse-container")).map(verseDiv =>
        verseDiv.querySelector("verse")
    );
}

// Utility to extract occurrences from the verses
function extractOccurrencesFromVerses(verses, lemmaNumber) {
    const occurrences = [];

    verses.forEach(verse => {
        getNodesByTagNameNS(verse, 'w').forEach(word => {
            if (word.getAttribute("lemma")?.includes(lemmaNumber)) {
                const verseText = verse.textContent.trim();
                occurrences.push(`Verse: ${verse.getAttribute("osisID")} - ${verseText}`);
            }
        });
    });

    return occurrences;
}

async function findOccurrencesByLemma(lemmaNumber, range = 'section') {
    const occurrences = [];

    // Determine nodes to search based on the range
    let nodesToSearch = [];
    if (range === 'section') {
        nodesToSearch = document.querySelectorAll('.verse-container'); // current loaded section
    } else if (range === 'book') {
        const bookName = document.getElementById('bookSelect').value;
        const xmlData = await fetchBookData(bookName);
        nodesToSearch = Array.from(xmlData.querySelectorAll('verse'));
    } else if (range === 'bible') {
        const allBooks = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"]; // Add other books as needed
        for (const book of allBooks) {
            const bookData = await fetchBookData(book);
            nodesToSearch = nodesToSearch.concat(Array.from(bookData.querySelectorAll('verse')));
        }
    }

    nodesToSearch.forEach(verseNode => {
        const reference = verseNode.getAttribute("osisID");
        Array.from(verseNode.querySelectorAll('.word-container')).forEach(wordSpan => {
            const lemmaAttribute = wordSpan.getAttribute("data-lemma");
            if (lemmaAttribute && lemmaAttribute === lemmaNumber) {
                occurrences.push({ text: wordSpan.textContent, reference, verseNode });
            }
        });
    });

    return occurrences;
}

function filterByLemma() {
    const lemmaInput = document.getElementById("lemmaInput").value.trim();
    const numericLemma = lemmaInput.match(/\d+/)?.[0]; // Extract only the numeric part of the lemma
    const verseContainer = document.getElementById("verseContainer");
    const verses = verseContainer.querySelectorAll(".verse-container");

    if (!numericLemma) {
        console.warn("Invalid lemma input. Please enter a valid lemma.");
        return;
    }

    verses.forEach(verse => {
        const words = verse.querySelectorAll(".word-container");
        let containsLemma = false;

        words.forEach(wordSpan => {
            const wordLemma = wordSpan.getAttribute("data-lemma");
            const wordNumericLemma = wordLemma?.match(/\d+/)?.[0]; // Extract numeric part from word lemma
            if (wordNumericLemma === numericLemma) {
                wordSpan.classList.add("highlight-lemma-occurrence"); // Highlight matched words
                containsLemma = true;
            } else {
                wordSpan.classList.remove("highlight-lemma-occurrence"); // Remove highlight from non-matching words
            }
        });

        // Show or hide the verse based on whether it contains the lemma
        verse.style.display = containsLemma ? "block" : "none";
    });
}

// Function to track lemmas in verseContainer and display a chart of their usage
function calculateLemmaUsagePercentage() {
    const uniqueLemmas = new Set();

    // Collect all unique lemmas present in the displayed verses
    document.querySelectorAll('#verseContainer .word-container[data-lemma]').forEach(wordSpan => {
        const lemmaID = wordSpan.getAttribute("data-lemma");
        
        if (lemmaID) {
            // Extract the base lemma (ignoring any compound markers like "+")
            const match = lemmaID.match(/\d+/);
            if (match) {
                const baseLemma = match[0];
                uniqueLemmas.add(baseLemma);
            }
        }
    });

    // Define the total number of lemmas in BDB and calculate the usage percentage
    const totalBDBLemmas = 8674;
    const usedLemmaCount = uniqueLemmas.size;
    const usagePercentage = ((usedLemmaCount / totalBDBLemmas) * 100).toFixed(2); // Rounding for display

    

    // Display the result in a chart
    displayLemmaUsageChart(usedLemmaCount, totalBDBLemmas, usagePercentage);
}


// Function to render the chart
// Display lemma usage chart with used lemmas vs. unused in BDB

// Function to render the chart
function displayLemmaUsageChart(usedLemmaCount, totalBDBLemmas, usagePercentage) {
    const chartElement = document.getElementById('lemmaUsageChart');
    if (!chartElement) {
        console.error("Chart container not found.");
        return;
    }

    // Show the chart container
    chartElement.style.display = 'block';

    const ctx = chartElement.getContext('2d');

    // Destroy the previous chart instance if it exists to reset
    if (lemmaUsageChart) {
        lemmaUsageChart.destroy();
    }

    // Create a new chart instance and store it in the global variable
    lemmaUsageChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Used Lemmas', 'Unused Lemmas'],
            datasets: [{
                data: [usedLemmaCount, totalBDBLemmas - usedLemmaCount],
                backgroundColor: ['#4CAF50', '#FFC107'],
                hoverBackgroundColor: ['#388E3C', '#FFA000']
            }]
        },
        options: {
            title: {
                display: true,
                text: `Lemma Usage Percentage: ${usagePercentage}%`
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function getUniqueWordsByLemma(typeClass) {
    const uniqueWords = new Map();
    const wordElements = document.querySelectorAll(`.word-container.${typeClass}`);

    wordElements.forEach(wordSpan => {
        const lemmaAttribute = wordSpan.getAttribute("data-lemma");

        if (lemmaAttribute) {
            // Detect if lemma is a compound
            const baseLemmaMatch = lemmaAttribute.match(/\d+/);
            if (baseLemmaMatch) {
                const baseLemma = baseLemmaMatch[0]; // Base lemma number
                const displayWord = lemmaData[`H${baseLemma}`]?.word || wordSpan.textContent;

                // Store only unique entries for base lemmas
                if (!uniqueWords.has(baseLemma)) {
                    uniqueWords.set(baseLemma, displayWord);
                    
                }
            }
        } else {
            console.warn(`No data-lemma attribute found for word: ${wordSpan.textContent}`);
        }
    });

    return uniqueWords;
}

function resetContainers() {
    const verseContainer = document.getElementById('verseContainer');

    // Reset the content of containers if they exist
    if (verseContainer) verseContainer.innerHTML = '';
}
function toggleTable() {
    const tableWrapper = document.getElementById('fullLemmaTableWrapper');
    const toggleButton = document.getElementById('toggleTableButton');

    if (tableWrapper.style.display === 'none') {
        tableWrapper.style.display = 'block';
        toggleButton.textContent = 'Hide Full Table';
    } else {
        tableWrapper.style.display = 'none';
        toggleButton.textContent = 'Show Full Table';
    }
}
function handleBookChange() {
            const bookSelect = document.getElementById('bookSelect');
            const parshaSection = document.getElementById('parshaSection');
            if (bookSelect.value === 'Genesis' || bookSelect.value === 'Exodus' || 
                bookSelect.value === 'Leviticus' || bookSelect.value === 'Numbers' || 
                bookSelect.value === 'Deuteronomy') {
                parshaSection.style.display = 'block';
                populateParshaDropdown(bookSelect.value); // Pass the book name to populateParshaDropdown
            } else {
                parshaSection.style.display = 'none';
                resetParshaAliya();
            }
        }
        function handleVerseRangeInput() {
            resetParshaAliya();
        }

        function resetParshaAliya() {
            const parshaSelect = document.getElementById('parshaSelect');
            const aliyaSelect = document.getElementById('aliyaSelect');
            parshaSelect.value = "";
            aliyaSelect.innerHTML = '<option value="">Select Aliya</option>'; 
        }


        async function loadContent() {
            console.log("CSS DEBUG: loadContent called");
            console.log("CSS DEBUG: Current body color", window.getComputedStyle(document.body).color);
            
            const bookSelect = document.getElementById('bookSelect').value;
            const aliyaSelect = document.getElementById('aliyaSelect').value;

            if (bookSelect && aliyaSelect) {
                loadAliyaRange(); // Load the selected Aliya
            } else if (bookSelect) {
                loadVerse(); // Load the verse/range or the whole book
            } else {
                showError("Please select a book.");
            }
        }
