// Haftarah Explorer script (ported from standalone project)
// NOTE: Data is loaded from /data/new_haftarah_with_individual_verses.json on this site.

// Define rites and global variables for storing data
const rites = ["Chabad","Ashkenazi", "Sephardi", "Yemenite", "Italian", "Karaite", "Romaniote"];

// Word Analysis Variables
let activeFilters = {}; // Track active filters
let sortOrders = {}; // Track sort order for each type (A-Z, Z-A, by count)

// Morphological data (same as Parsha Explorer)
let lemmaData = {};
let morphologyData = {};
const DATA_BASE_PATH = '/parsha-explorer/data/';
let bookOrder = [
  "Joshua", "Judges", "I Samuel", "II Samuel", "I Kings", "II Kings", 
  "Isaiah", "Jeremiah", "Ezekiel", "Hosea", "Joel", "Amos", 
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", 
  "Zephaniah", "Haggai", "Zechariah", "Malachi"
];

// Total number of verses in each book of the Bible
const totalVersesPerBook = {
  "Joshua": 658,
  "Judges": 618,
  "I Samuel": 811,
  "II Samuel": 695,
  "I Kings": 817,
  "II Kings": 719,
  "Isaiah": 1291,
  "Jeremiah": 1364,
  "Ezekiel": 1273,
  "Hosea": 197,
  "Joel": 73,
  "Amos": 146,
  "Obadiah": 21,
  "Jonah": 48,
  "Micah": 105,
  "Nahum": 47,
  "Habakkuk": 56,
  "Zephaniah": 53,
  "Haggai": 38,
  "Zechariah": 211,
  "Malachi": 55
};

// Assign consistent colors to each rite
const riteColors = {
  "Ashkenazi": "rgba(255, 99, 132, 0.6)", // Red
  "Sephardi": "rgba(54, 162, 235, 0.6)",  // Blue
  "Yemenite": "rgba(75, 192, 192, 0.6)",  // Green
  "Italian": "rgba(153, 102, 255, 0.6)",  // Purple
  "Karaite": "rgba(255, 206, 86, 0.6)",   // Yellow
  "Romaniote": "rgba(0, 128, 128, 0.6)",  // Teal
  "Chabad": "rgba(255, 159, 64, 0.6)"     // Orange
};

let haftarahData = {};
let bookVerseCountsByRite = {};  // Store total verses for each book
let riteLengths = {};
let overlapData = {};
let activeRites = new Set(rites);  // Track active rites
let chartOrder = "default"; // Track chart order preference
let showOverlap = false;  // Track whether to show overlapping verses or not

let bookChartInstance = null;  // To hold the Chart.js instance for the book chart
let lengthChartInstance = null;  // To hold the Chart.js instance for the length chart
let parshaSelect;
let weeklyReadingsContainer;
let longestToShortestChartInstance = null;
let allParshiotLengthChartInstance = null;
let uniqueVersesByRiteAndBook = {};

async function setDefaultParsha() {
  try {
    const response = await fetch('https://www.sefaria.org/api/calendars');
    const data = await response.json();
    const parshaItem = data.calendar_items.find(item => item.title.en === "Parashat Hashavua");

    if (parshaItem) {
      let parshaName = parshaItem.displayValue.en;
      if (parshaName.includes('-')) {
        if (parshaName === "Acharei Mot-Kedoshim") {
          parshaName = parshaName.split('-')[0].trim();
        } else {
          parshaName = parshaName.split('-')[1].trim();
        }
      }

      let found = false;
      for (const option of parshaSelect.options) {
        const normalizedOptionText = option.text.replace(/’/g, "'");
        const normalizedParshaName = parshaName.replace(/’/g, "'");
        if (normalizedOptionText === normalizedParshaName) {
          option.selected = true;
          found = true;
          filterChartsByParsha(normalizedParshaName);
          await generateWeeklyReadings(normalizedParshaName);
          createLengthChart(normalizedParshaName);
          break;
        }
      }

      if (!found) {
        resetChartsAndReadings();
      }
    } else {
      resetChartsAndReadings();
    }
  } catch (error) {
    console.error('[DefaultParsha] Error fetching current parsha:', error);
    resetChartsAndReadings();
  }
}

// Load the updated JSON file with lengths and individual verses
async function loadHaftarahReadings() {
  const response = await fetch('/data/new_haftarah_with_individual_verses.json');
  const data = await response.json();
  haftarahData = data;
  processData();  // After loading data, process it
}

function processData() {
  riteLengths = {};
  overlapData = {};
  uniqueVersesByRiteAndBook = {};

  rites.forEach(rite => {
    bookVerseCountsByRite[rite] = {};
    riteLengths[rite] = [];
    uniqueVersesByRiteAndBook[rite] = {};
  });

  Object.keys(haftarahData).forEach(parsha => {
    rites.forEach(rite => {
      const readingData = haftarahData[parsha][rite];
      if (readingData) {
        const verses = readingData.individual_verses;
        verses.forEach(verse => {
          const book = getBookName(verse);
          bookVerseCountsByRite[rite][book] ??= {
            unique: 0,
            overlap: {},
            uniqueVerses: [],
            overlapVerses: {},
          };
          const verseKey = `${verse}-${rite}`;
          overlapData[verseKey] ??= { rites: [], parshas: [] };
          overlapData[verseKey].rites.push(rite);
          overlapData[verseKey].parshas.push(parsha);

          const overlapCount = overlapData[verseKey].rites.length;
          bookVerseCountsByRite[rite][book].overlap[overlapCount] ??= 0;
          bookVerseCountsByRite[rite][book].overlapVerses[overlapCount] ??= [];

          if (overlapCount > 1) {
            bookVerseCountsByRite[rite][book].overlap[overlapCount]++;
            bookVerseCountsByRite[rite][book].overlapVerses[overlapCount].push({ verse, parsha });
          } else {
            bookVerseCountsByRite[rite][book].unique++;
            bookVerseCountsByRite[rite][book].uniqueVerses.push({ verse, parsha });
          }

          uniqueVersesByRiteAndBook[rite][book] ??= new Set();
          uniqueVersesByRiteAndBook[rite][book].add(verse);
        });

        riteLengths[rite].push(verses.length);
      }
    });
  });

  toggleChartOrder();
  createLengthChart();
  populatePercentageTable();
}

function getBookName(ref) {
  const match = ref.match(/([IV]*\s?[a-zA-Z]+)\s\d+:/);
  return match ? match[1].trim() : ref;
}

function toggleChartOrder() {
  console.log(`[toggleChartOrder] chartOrder=${chartOrder}`);
  if (chartOrder === "mostUsed") {
    // Sort books by total verses across all parshiot for the active rites
    const totalVersesByBook = {};
    // Use the global riteLengths to compute per-book totals across all parshiot
    Object.keys(haftarahData).forEach(parsha => {
      Object.keys(haftarahData[parsha]).forEach(rite => {
        if (!activeRites.has(rite)) return;
        const readingData = haftarahData[parsha][rite];
        if (readingData && readingData.individual_verses) {
          readingData.individual_verses.forEach(verse => {
            const book = getBookName(verse);
            totalVersesByBook[book] = (totalVersesByBook[book] || 0) + 1;
          });
        }
      });
    });
    console.log(`[toggleChartOrder] totalVersesByBook=`, totalVersesByBook);
    bookOrder = Object.keys(totalVersesByBook).sort((a, b) => totalVersesByBook[b] - totalVersesByBook[a]);
    console.log(`[toggleChartOrder] sorted bookOrder=`, bookOrder);
  } else {
    bookOrder = [
      "Joshua", "Judges", "I Samuel", "II Samuel", "I Kings", "II Kings", 
      "Isaiah", "Jeremiah", "Ezekiel", "Hosea", "Joel", "Amos", 
      "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", 
      "Zephaniah", "Haggai", "Zechariah", "Malachi"
    ];
    console.log(`[toggleChartOrder] reset to default bookOrder=`, bookOrder);
  }

  createBookChart();
  createLengthChart();
  populatePercentageTable();
}

function createBookChart(selectedParsha = null) {
  const canvas = document.getElementById('bookChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (bookChartInstance) {
    bookChartInstance.destroy();
  }

  const datasets = [];
  Array.from(activeRites).forEach(rite => {
    let combinedCounts;
    if (selectedParsha) {
      combinedCounts = bookOrder.map(book => {
        const counts = bookVerseCountsByRite[rite][book] || { unique: 0, overlap: { 2: 0, 3: 0 } };
        return counts.unique + (counts.overlap[2] || 0) + (counts.overlap[3] || 0);
      });
      datasets.push({
        label: rite,
        data: combinedCounts,
        backgroundColor: riteColors[rite],
        stack: false,
      });
    } else {
      const uniqueCounts = bookOrder.map(book => {
        const counts = bookVerseCountsByRite[rite][book] || { unique: 0, overlap: { 2: 0, 3: 0 } };
        return counts.unique;
      });
      const doubleCounts = bookOrder.map(book => {
        const counts = bookVerseCountsByRite[rite][book] || { unique: 0, overlap: { 2: 0, 3: 0 } };
        return (counts.overlap[2] || 0) * 2;
      });
      const tripleCounts = bookOrder.map(book => {
        const counts = bookVerseCountsByRite[rite][book] || { unique: 0, overlap: { 2: 0, 3: 0 } };
        return (counts.overlap[3] || 0) * 3;
      });

      datasets.push({
        label: `${rite} Unique`,
        data: uniqueCounts,
        backgroundColor: riteColors[rite],
        stack: rite,
      });
      datasets.push({
        label: `${rite} 2x`,
        data: doubleCounts,
        backgroundColor: riteColors[rite] ? riteColors[rite].replace('0.6', '0.4') : 'rgba(0,0,0,0.2)',
        stack: rite,
      });
      datasets.push({
        label: `${rite} 3x`,
        data: tripleCounts,
        backgroundColor: riteColors[rite] ? riteColors[rite].replace('0.6', '0.2') : 'rgba(0,0,0,0.2)',
        stack: rite,
      });
    }
  });

  bookChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: bookOrder,
      datasets,
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          stacked: !selectedParsha,
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (tooltipItem) {
              const datasetLabel = tooltipItem.dataset.label;
              const value = tooltipItem.raw;
              if (datasetLabel.includes('2x')) {
                return `${datasetLabel}: ${value / 2} verses (multiplied by 2)`;
              } else if (datasetLabel.includes('3x')) {
                return `${datasetLabel}: ${value / 3} verses (multiplied by 3)`;
              }
              return `${datasetLabel}: ${value} verses`;
            },
          },
        },
      },
    },
  });
}

function createLengthChart(selectedParsha = null) {
  const canvas = document.getElementById('lengthChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (lengthChartInstance) {
    lengthChartInstance.destroy();
  }

  const datasets = [];
  const riteLengths = [];
  Array.from(activeRites).forEach(rite => {
    let totalLength = 0;
    if (selectedParsha) {
      totalLength = haftarahData[selectedParsha][rite]?.total_length || 0;
    } else {
      totalLength = Object.keys(haftarahData).reduce((sum, parsha) => {
        return sum + (haftarahData[parsha][rite]?.total_length || 0);
      }, 0);
    }
    riteLengths.push({ rite, length: totalLength });
  });

  // Always sort by length descending for this chart
  riteLengths.sort((a, b) => b.length - a.length);
  console.log(`[createLengthChart] riteLengths sorted=`, riteLengths.map(r => `${r.rite}:${r.length}`));

  const dataset = {
    label: selectedParsha ? `Length for ${selectedParsha}` : 'Total length across all parshiot',
    data: riteLengths.map(r => r.length),
    backgroundColor: riteLengths.map(r => riteColors[r.rite]),
    borderWidth: 1,
  };

  lengthChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: riteLengths.map(r => r.rite),
      datasets: [dataset],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });

  // Update the title in the DOM
  const lengthChartSection = canvas.closest('.bg-card-bg-light, .bg-card-bg-dark');
  if (lengthChartSection) {
    const titleElement = lengthChartSection.querySelector('h2');
    if (titleElement) {
      titleElement.textContent = selectedParsha
        ? `Total length of readings by rite for ${selectedParsha}`
        : 'Total length of readings by rite';
    }
  }

  // When a parsha is selected, default sorting to 'mostUsed' (length) for other charts
  if (selectedParsha) {
    const mostUsedRadio = document.querySelector('input[type=radio][value=mostUsed]');
    if (mostUsedRadio && !mostUsedRadio.checked) {
      mostUsedRadio.checked = true;
      chartOrder = 'mostUsed';
      createLongestToShortestChart();
    }
  }
}

// Populate the dropdown with available parshiot
function populateDropdown() {
  if (!parshaSelect || !haftarahData) return;

  // Clear existing options
  parshaSelect.innerHTML = '';

  // Default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a Parsha';
  parshaSelect.appendChild(defaultOption);

  // Add parshiot in the natural order as they appear in the JSON
  for (const parsha of Object.keys(haftarahData)) {
    const option = document.createElement('option');
    option.value = parsha;
    option.textContent = parsha;
    parshaSelect.appendChild(option);
  }
}

function populatePercentageTable(selectedParsha = null) {
  const table = document.querySelector('#percentageTable');
  if (!table) return;
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  thead.innerHTML = '';

  const headerRow = thead.insertRow();
  headerRow.insertCell().textContent = 'Book';
  Array.from(rites).forEach(rite => {
    const headerCell = document.createElement('th');
    headerCell.textContent = rite;
    headerRow.appendChild(headerCell);
  });

  bookOrder.forEach(book => {
    const row = tbody.insertRow();
    row.insertCell().textContent = book;

    rites.forEach(rite => {
      const cell = row.insertCell();
      if (activeRites.has(rite)) {
        const counts = bookVerseCountsByRite[rite][book] || {
          unique: 0,
          overlap: {},
          uniqueVerses: [],
          overlapVerses: {},
        };
        const totalVerses = totalVersesPerBook[book];
        let versesRead = counts.unique;
        for (const overlapCount in counts.overlap) {
          versesRead += counts.overlap[overlapCount];
        }
        const percentage = Math.min((versesRead / totalVerses) * 100, 100).toFixed(2);
        cell.textContent = `${percentage}%`;
        if (percentage === '0.00') {
          cell.style.backgroundColor = 'lightgrey';
          cell.style.color = 'darkgrey';
        } else {
          cell.style.backgroundColor = riteColors[rite];
        }
      } else {
        cell.textContent = '';
      }
    });
  });

  // Update the title in the DOM
  const percentageTableSection = table.closest('.bg-card-bg-light, .bg-card-bg-dark');
  console.log(`[populatePercentageTable] selectedParsha=${selectedParsha} percentageTableSection=`, percentageTableSection);
  if (percentageTableSection) {
    const titleElement = percentageTableSection.querySelector('h2');
    console.log(`[populatePercentageTable] titleElement=`, titleElement);
    if (titleElement) {
      const newTitle = selectedParsha
        ? `Percentage of each book read per rite for ${selectedParsha}`
        : 'Percentage of each book read per rite';
      console.log(`[populatePercentageTable] setting title to: ${newTitle}`);
      titleElement.textContent = newTitle;
    }
  }
}

function filterChartsByParsha(parsha) {
  console.log(`[filterChartsByParsha] parsha=${parsha}`);
  riteLengths = {};
  bookVerseCountsByRite = {};
  uniqueVersesByRiteAndBook = {};

  rites.forEach(rite => {
    bookVerseCountsByRite[rite] = {};
    riteLengths[rite] = 0;
    uniqueVersesByRiteAndBook[rite] = {};
  });

  rites.forEach(rite => {
    const readingData = haftarahData[parsha][rite];
    if (readingData) {
      const verses = readingData.individual_verses;
      verses.forEach(verse => {
        const book = getBookName(verse);
        bookVerseCountsByRite[rite][book] ??= {
          unique: 0,
          overlap: {},
          uniqueVerses: [],
          overlapVerses: {},
        };
        const verseKey = `${verse}-${rite}`;
        const overlapCount = overlapData[verseKey]?.rites.length || 1;
        bookVerseCountsByRite[rite][book].overlap[overlapCount] ??= 0;
        bookVerseCountsByRite[rite][book].overlapVerses[overlapCount] ??= [];
        if (overlapCount > 1) {
          bookVerseCountsByRite[rite][book].overlap[overlapCount]++;
          bookVerseCountsByRite[rite][book].overlapVerses[overlapCount].push({ verse, parsha });
        } else {
          bookVerseCountsByRite[rite][book].unique++;
          bookVerseCountsByRite[rite][book].uniqueVerses.push({ verse, parsha });
        }
        uniqueVersesByRiteAndBook[rite][book] ??= new Set();
        uniqueVersesByRiteAndBook[rite][book].add(verse);
      });
      riteLengths[rite] += readingData.total_length || 0;
    }
  });

  // When a parsha is selected, default sorting to 'mostUsed' (length) if not already set
  const mostUsedRadio = document.querySelector('input[type=radio][value=mostUsed]');
  const defaultRadio = document.querySelector('input[type=radio][value=default]');
  if (mostUsedRadio && !mostUsedRadio.checked) {
    mostUsedRadio.checked = true;
    chartOrder = 'mostUsed';
    console.log(`[filterChartsByParsha] forced chartOrder to mostUsed`);
  }
  // Hide the "Default parsha order" option when a parsha is selected
  if (defaultRadio) {
    const defaultLabel = defaultRadio.closest('label');
    if (defaultLabel) defaultLabel.style.display = 'none';
  }

  toggleChartOrder();
  createLengthChart(parsha);
  populatePercentageTable(parsha);
}

function resetChartsAndReadings() {
  console.log(`[resetChartsAndReadings] called`);
  if (weeklyReadingsContainer) {
    weeklyReadingsContainer.innerHTML = '';
  }
  // Show the "Default parsha order" option again when resetting
  const defaultRadio = document.querySelector('input[type=radio][value=default]');
  if (defaultRadio) {
    const defaultLabel = defaultRadio.closest('label');
    if (defaultLabel) defaultLabel.style.display = 'inline-flex';
  }
  processData();
  toggleChartOrder();
  createLengthChart();
  createAllParshiotLengthChart();
  populatePercentageTable();
}

async function generateWeeklyReadings(selectedParsha) {
  if (!weeklyReadingsContainer) return;
  weeklyReadingsContainer.innerHTML = '';

  const parshaContainer = document.createElement('div');
  parshaContainer.classList.add('parsha-container');

  const parshaTitle = document.createElement('h2');
  parshaTitle.textContent = `Parsha: ${selectedParsha}`;
  parshaContainer.appendChild(parshaTitle);

  // Update legend to show only active rites
  const legendContent = document.getElementById('legendContent');
  if (legendContent) {
    legendContent.innerHTML = '';
    // Shared verse item (always shown if any rites active)
    const sharedSpan = document.createElement('span');
    sharedSpan.className = 'inline-block px-2 py-1 rounded font-semibold border';
    sharedSpan.style.backgroundColor = '#ffffff';
    sharedSpan.style.borderColor = '#d1d5db';
    sharedSpan.style.color = '#000000';
    sharedSpan.textContent = 'Shared by multiple rites';
    legendContent.appendChild(sharedSpan);
    // Add only active rites
    Array.from(activeRites).forEach(rite => {
      const span = document.createElement('span');
      span.className = 'inline-block px-2 py-1 rounded font-semibold text-white border';
      // Set colors directly via inline styles
      const colors = {
        Chabad: { bg: '#ea580c', border: '#c2410c' },
        Ashkenazi: { bg: '#3b82f6', border: '#2563eb' },
        Sephardi: { bg: '#ec4899', border: '#db2777' },
        Portuguese: { bg: '#10b981', border: '#059669' },
        Italian: { bg: '#ef4444', border: '#dc2626' },
        Yemenite: { bg: '#f97316', border: '#ea580c' },
        Romaniote: { bg: '#fbbf24', border: '#f59e0b', text: '#000000' },
        Karaite: { bg: '#a855f7', border: '#9333ea' }
      };
      const riteColors = colors[rite] || { bg: '#6b7280', border: '#4b5563' };
      span.style.backgroundColor = riteColors.bg;
      span.style.borderColor = riteColors.border;
      span.style.color = riteColors.text || '#ffffff';
      span.style.textShadow = '1px 1px 1px rgba(0,0,0,0.3)';
      console.log(`[generateWeeklyReadings] legend for ${rite}: bg=${riteColors.bg}, border=${riteColors.border}, text=${riteColors.text || '#ffffff'}`);
      span.textContent = rite;
      legendContent.appendChild(span);
    });
  }

  const verseRiteMap = {};

  for (const rite of Object.keys(haftarahData[selectedParsha])) {
    if (!activeRites.has(rite)) continue;
    const readingData = haftarahData[selectedParsha][rite];
    if (readingData) {
      let reference = readingData.references[0];
      reference = reference
        .replace('I Kings', 'I_Kings')
        .replace('II Kings', 'II_Kings')
        .replace('I Samuel', 'I_Samuel')
        .replace('II Samuel', 'II_Samuel');
      const formattedReference = reference.replace(/ /g, '.').replace(':', '.');

      const hebrewVerses = await fetchHebrewTextRange(formattedReference);
      let currentChapter = parseInt(formattedReference.split('.')[1], 10);
      let verseIndex = parseInt(formattedReference.split('.')[2].split('–')[0], 10);

      const versesWithIndices = [];
      hebrewVerses.forEach((chapterVerses, chapterOffset) => {
        if (Array.isArray(chapterVerses)) {
          currentChapter += chapterOffset;
          if (chapterOffset > 0) verseIndex = 1;
          chapterVerses.forEach((text, index) => {
            versesWithIndices.push({ chapter: currentChapter, verse: verseIndex + index, text, rite });
          });
        } else {
          versesWithIndices.push({ chapter: currentChapter, verse: verseIndex, text: chapterVerses, rite });
          verseIndex++;
        }
      });

      const riteContainer = document.createElement('div');
      riteContainer.classList.add('rite-container');
      
      // Create collapsible header
      const riteHeader = document.createElement('div');
      riteHeader.classList.add('rite-header');
      riteHeader.style.cssText = 'cursor: pointer; user-select: none; display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 0.375rem; margin-bottom: 0.5rem;';
      
      const riteTitle = document.createElement('h3');
      riteTitle.textContent = `${rite} Rite - ${reference.replace('_', ' ')}`;
      riteTitle.style.cssText = 'margin: 0; color: #1f2937 !important;';
      
      const expandIcon = document.createElement('span');
      expandIcon.textContent = '▼';
      expandIcon.style.cssText = 'transition: transform 0.2s; color: #1f2937;';
      
      riteHeader.appendChild(riteTitle);
      riteHeader.appendChild(expandIcon);
      
      // Create verses container (initially hidden)
      const versesContainer = document.createElement('div');
      versesContainer.classList.add('verses-container');
      versesContainer.style.cssText = 'display: none;';
      
      riteContainer.appendChild(riteHeader);
      riteContainer.appendChild(versesContainer);
      parshaContainer.appendChild(riteContainer);

      // Add click handler for expand/collapse
      riteHeader.addEventListener('click', () => {
        const isExpanded = versesContainer.style.display !== 'none';
        versesContainer.style.display = isExpanded ? 'none' : 'block';
        expandIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
      });

      versesWithIndices.forEach(({ chapter, verse, text }) => {
        const verseKey = `${chapter}:${verse}`;
        addVerseToMap(verseKey, text, rite, verseRiteMap);
      });
    }
  }

  for (const verseKey of Object.keys(verseRiteMap).sort((a, b) => {
    const [aChapter, aVerse] = a.split(':').map(Number);
    const [bChapter, bVerse] = b.split(':').map(Number);
    return aChapter === bChapter ? aVerse - bVerse : aChapter - bChapter;
  })) {
    const { rites, text } = verseRiteMap[verseKey];
    if (!rites.some(rite => activeRites.has(rite))) continue;

    console.log(`[generateWeeklyReadings] verseKey=${verseKey} rites=${JSON.stringify(rites)} activeRites=${JSON.stringify(Array.from(activeRites))}`);

    const verseSpan = document.createElement('span');
    verseSpan.classList.add('verse-span');
    
    // Create verse label
    const verseLabel = document.createElement('strong');
    verseLabel.textContent = `${verseKey}: `;
    verseSpan.appendChild(verseLabel);
    
    // Create Hebrew text container with morphological data
    const hebrewText = document.createElement('span');
    hebrewText.className = 'hebrew-text';
    
    // Extract chapter and verse from verseKey to load XML
    const [chapter, verse] = verseKey.split(':').map(Number);
    const mappedBookName = mapBookName(chapter);
    
    if (mappedBookName && text) {
      // Create basic word containers first
      const words = text.split(/\s+/).filter(word => word.length > 0);
      words.forEach(word => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word-container';
        wordSpan.textContent = word;
        
        // Add basic morphological attributes that will work with Parsha Explorer functions
        // These will be enhanced when we integrate with Parsha Explorer's XML loading
        wordSpan.setAttribute("data-lemma", `H${word.length}`); // Placeholder lemma
        
        hebrewText.appendChild(wordSpan);
        hebrewText.appendChild(document.createTextNode(' '));
      });
      
      // Store verse info for later morphological loading
      hebrewText.setAttribute('data-book', mappedBookName);
      hebrewText.setAttribute('data-chapter', chapter);
      hebrewText.setAttribute('data-verse', verse);
    } else {
      hebrewText.textContent = text;
    }
    
    verseSpan.appendChild(hebrewText);

    if (rites.length > 1) {
      console.log(`[generateWeeklyReadings] marking ${verseKey} as SHARED (rites.length=${rites.length})`);
      verseSpan.classList.add('shared-verse');
      console.log(`[generateWeeklyReadings] applied classes to ${verseKey}:`, verseSpan.className);
    } else {
      const uniqueRite = rites[0].toLowerCase();
      console.log(`[generateWeeklyReadings] marking ${verseKey} as UNIQUE to ${uniqueRite}`);
      verseSpan.classList.add(`${uniqueRite}-unique-verse`);
      console.log(`[generateWeeklyReadings] applied classes to ${verseKey}:`, verseSpan.className);
    }

    rites.forEach(rite => {
      if (activeRites.has(rite)) {
        const riteContainers = parshaContainer.getElementsByClassName('rite-container');
        for (const container of riteContainers) {
          const header = container.querySelector('.rite-header');
          if (header && header.textContent.includes(`${rite} Rite -`)) {
            const versesContainer = container.querySelector('.verses-container');
            versesContainer.appendChild(verseSpan.cloneNode(true));
            break;
          }
        }
      }
    });
  }

  weeklyReadingsContainer.appendChild(parshaContainer);
  
  // Load morphological data for all verses using Parsha Explorer's approach
  setTimeout(async () => {
    await loadMorphologicalDataForAllVerses();
    // Update word counts after morphological data is loaded
    updateWordCounts('allWords');
  }, 100);
}

function addVerseToMap(verseKey, verseText, rite, verseRiteMap) {
  if (!verseRiteMap[verseKey]) {
    verseRiteMap[verseKey] = { rites: [], text: verseText };
  }
  verseRiteMap[verseKey].rites.push(rite);
}

async function fetchHebrewTextRange(reference) {
  try {
    const response = await fetch(`https://www.sefaria.org/api/texts/${reference}?lang=he&context=0`);
    const data = await response.json();
    return Array.isArray(data.he) ? data.he : ['[Text not available]'];
  } catch (error) {
    console.error(`Error fetching Hebrew text for reference: ${reference}`, error);
    return ['Error fetching text'];
  }
}

function createOverlapHeatmap(selectedParsha) {
  const container = document.getElementById('overlapHeatmap');
  if (!container) return;

  const activeRiteList = Array.from(activeRites);
  if (activeRiteList.length < 2) {
    container.innerHTML = '<p class="text-sm text-secondary-light dark:text-secondary-dark">Select at least 2 rites to see overlap.</p>';
    return;
  }

  // Build verse-to-rites mapping
  const verseToRites = {};
  activeRiteList.forEach(rite => {
    const readingData = haftarahData[selectedParsha][rite];
    if (readingData) {
      readingData.individual_verses.forEach(verse => {
        if (!verseToRites[verse]) {
          verseToRites[verse] = new Set();
        }
        verseToRites[verse].add(rite);
      });
    }
  });

  // Calculate pairwise overlaps and store verse lists
  const overlapMatrix = {};
  const overlapVerses = {};
  activeRiteList.forEach(rite1 => {
    overlapMatrix[rite1] = {};
    overlapVerses[rite1] = {};
    activeRiteList.forEach(rite2 => {
      if (rite1 === rite2) {
        // Get unique verses for this rite
        const verses = Object.keys(verseToRites)
          .filter(verse => verseToRites[verse].size === 1 && verseToRites[verse].has(rite1))
          .sort();
        overlapMatrix[rite1][rite2] = verses.length;
        overlapVerses[rite1][rite2] = verses;
      } else {
        // Get shared verses between rite1 and rite2
        const verses = Object.keys(verseToRites)
          .filter(verse => verseToRites[verse].has(rite1) && verseToRites[verse].has(rite2))
          .sort();
        overlapMatrix[rite1][rite2] = verses.length;
        overlapVerses[rite1][rite2] = verses;
      }
    });
  });

  // Find max value for color scaling
  const maxValue = Math.max(...Object.values(overlapMatrix).flatMap(row => Object.values(row)));

  // Create HTML table
  let html = '<table class="text-sm border-collapse"><thead><tr><th class="p-2"></th>';
  activeRiteList.forEach(rite => {
    html += `<th class="p-2 text-xs font-medium">${rite}</th>`;
  });
  html += '</tr></thead><tbody>';

  activeRiteList.forEach(rite1 => {
    html += `<tr><td class="p-2 text-xs font-medium">${rite1}</td>`;
    activeRiteList.forEach(rite2 => {
      const value = overlapMatrix[rite1][rite2];
      const verses = overlapVerses[rite1][rite2];
      const intensity = maxValue > 0 ? value / maxValue : 0;
      const bgColor = rite1 === rite2 
        ? `rgba(59, 130, 246, ${0.2 + intensity * 0.6})`  // Blue for unique
        : `rgba(16, 185, 129, ${0.2 + intensity * 0.6})`; // Green for shared
      
      // Create verse list for tooltip
      const verseList = verses.length > 0 ? verses.join(', ') : 'None';
      const tooltipText = verses.length > 0 
        ? `${value} verses: ${verseList}`
        : 'No shared verses';
      
      html += `<td class="p-2 text-center border border-gray-300 dark:border-gray-600 cursor-help hover:opacity-80 transition-opacity" 
                   style="background-color: ${bgColor}" 
                   title="${tooltipText}">${value}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  html += '<div class="mt-2 text-xs text-secondary-light dark:text-secondary-dark">';
  html += '<p>Diagonal: unique verses per rite | Off-diagonal: shared verses between pairs</p>';
  html += '<p>Hover over cells to see which verses are included</p>';
  html += '</div>';

  container.innerHTML = html;

  // Add custom tooltips
  container.querySelectorAll('td[title]').forEach(cell => {
    cell.addEventListener('mouseenter', (e) => {
      const tooltip = document.createElement('div');
      tooltip.className = 'absolute z-50 p-2 text-xs bg-gray-900 text-white rounded shadow-lg max-w-xs';
      tooltip.style.left = e.pageX + 'px';
      tooltip.style.top = (e.pageY + 10) + 'px';
      tooltip.textContent = e.target.getAttribute('title');
      tooltip.id = 'heatmap-tooltip';
      document.body.appendChild(tooltip);
    });

    cell.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById('heatmap-tooltip');
      if (tooltip) tooltip.remove();
    });

    cell.addEventListener('mousemove', (e) => {
      const tooltip = document.getElementById('heatmap-tooltip');
      if (tooltip) {
        tooltip.style.left = e.pageX + 'px';
        tooltip.style.top = (e.pageY + 10) + 'px';
      }
    });
  });
}

function createAllParshiotLengthChart() {
  const canvas = document.getElementById('allParshiotLengthChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (allParshiotLengthChartInstance) {
    allParshiotLengthChartInstance.destroy();
  }

  const parshiot = Object.keys(haftarahData);
  const datasets = Array.from(activeRites).map(rite => {
    const data = parshiot.map(parsha => haftarahData[parsha][rite]?.total_length || 0);
    return {
      label: rite,
      data,
      backgroundColor: riteColors[rite],
      stack: rite,
    };
  });

  allParshiotLengthChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: parshiot,
      datasets,
    },
    options: {
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
      },
    },
  });
}

function createLongestToShortestChart(selectedParsha = null) {
  const canvas = document.getElementById('longestToShortestChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (longestToShortestChartInstance) {
    longestToShortestChartInstance.destroy();
  }

  let riteLengths = [];

  if (selectedParsha && chartOrder === 'mostUsed') {
    // Use the selected parsha's lengths for each rite
    riteLengths = activeRiteList.map(rite => ({
      rite,
      length: haftarahData[selectedParsha][rite]?.total_length || 0,
    }));
    // Sort by length descending
    riteLengths.sort((a, b) => b.length - a.length);
    console.log(`[createLongestToShortestChart] per-parsha lengths for ${selectedParsha}:`, riteLengths);
  } else {
    // Global totals across all parshiot
    const globalLengths = {};
    Object.keys(haftarahData).forEach(parsha => {
      Object.keys(haftarahData[parsha]).forEach(rite => {
        if (!activeRites.has(rite)) return;
        const length = haftarahData[parsha][rite]?.total_length || 0;
        globalLengths[rite] = (globalLengths[rite] || 0) + length;
      });
    });
    console.log(`[createLongestToShortestChart] globalLengths=`, globalLengths);
    riteLengths = Object.entries(globalLengths).map(([rite, length]) => ({ rite, length }));
    if (chartOrder === 'mostUsed') {
      riteLengths.sort((a, b) => b.length - a.length);
    } else {
      riteLengths.sort((a, b) => rites.indexOf(a.rite) - rites.indexOf(b.rite));
    }
  }

  console.log(`[createLongestToShortestChart] final riteLengths=`, riteLengths.map(r => `${r.rite}:${r.length}`));

  const dataset = {
    label: selectedParsha ? `Length for ${selectedParsha}` : 'Total length across all parshiot',
    data: riteLengths.map(item => item.length),
    backgroundColor: riteLengths.map(item => riteColors[item.rite]),
    borderWidth: 1,
  };

  longestToShortestChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: riteLengths.map(item => item.rite),
      datasets: [dataset],
    },
    options: {
      indexAxis: 'y', // horizontal bar chart to make order clearer
      scales: {
        x: {
          beginAtZero: true,
        },
        y: {
          reverse: true, // show highest at top
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      }
    },
  });
}

// Load lemma data from XML and store in lemmaData (same as Parsha Explorer)
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
            const xlit = wordNode ? wordNode.getAttribute("xlit") || '' : '';

            lemmaData[lemmaID] = { word: word, definition: definition, xlit: xlit };
        });

        console.log("Loaded lemma data:", Object.keys(lemmaData).length, "entries");
        
        // Debug: Show a sample BDB entry
        if (lemmaData['H4325']) {
            console.log("Sample BDB entry H4325 (water):", lemmaData['H4325']);
        } else {
            console.log("H4325 not found in lemma data");
        }
    } catch (error) {
        console.error("Error loading lemma data:", error);
    }
}

// Load morphology data from Oshm.xml (same as Parsha Explorer)
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
            const code = entry.getAttribute("n");
            const description = entry.textContent || '';
            if (code) {
                morphologyData[code] = description;
            }
        });

        console.log("Loaded morphology data:", Object.keys(morphologyData).length, "entries");
    } catch (error) {
        console.error("Error loading morphology data:", error);
    }
}

// Helper function to get nodes by tag name with namespace (same as Parsha Explorer)
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

// Load verse with morphological data using Parsha Explorer's approach
async function loadVerseWithMorphology(bookName, chapter, verse, hebrewText) {
    try {
        console.log(`[loadVerseWithMorphology] Starting to load ${bookName}.${chapter}:${verse}`);
        
        // Use the same XML loading approach as Parsha Explorer
        const response = await fetch(`${DATA_BASE_PATH}${bookName}.xml`);
        if (!response.ok) throw new Error(`Failed to load ${bookName} XML data`);
        
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "application/xml");
        
        console.log(`[loadVerseWithMorphology] Loaded XML for ${bookName}, looking for verse ${chapter}:${verse}`);
        
        // Find the specific verse
        const verseNode = xmlDoc.querySelector(`verse[osisID="${bookName}.${chapter}.${verse}"]`);
        if (verseNode) {
            console.log(`[loadVerseWithMorphology] Found verse node for ${bookName}.${chapter}:${verse}`);
            
            // Clear existing content and add morphological word containers
            hebrewText.innerHTML = '';
            
            // Use the exact same approach as Parsha Explorer
            const words = getNodesByTagNameNS(verseNode, 'w');
            console.log(`[loadVerseWithMorphology] Found ${words.length} words in verse ${bookName}.${chapter}:${verse}`);
            
            let nounCount = 0, properNounCount = 0, verbCount = 0, adverbCount = 0;
            
            words.forEach((word, index) => {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'word-container';
                wordSpan.textContent = word.textContent;

                const lemma = word.getAttribute("lemma");
                const morphCode = word.getAttribute("morph");
                const morphDescription = morphologyData[morphCode] || 'Not available in data.';

                console.log(`[loadVerseWithMorphology] Word ${index}: "${word.textContent}", lemma: ${lemma}, morph: ${morphCode}`);

                if (lemma) {
                    wordSpan.setAttribute("data-lemma", lemma);
                }

                // Highlight and categorize based on morphology code (same as Parsha Explorer)
                if (morphCode && /(^|[^V])N/.test(morphCode)) {
                    wordSpan.classList.add("highlight-noun");
                    nounCount++;
                    console.log(`[loadVerseWithMorphology] Word "${word.textContent}" categorized as noun (morph: ${morphCode})`);

                    if (/(Np|VNp)/.test(morphCode)) {
                        wordSpan.classList.add("highlight-proper-noun");
                        properNounCount++;
                        console.log(`[loadVerseWithMorphology] Word "${word.textContent}" categorized as proper noun`);
                    }
                }

                if (morphologyData[morphCode]?.toLowerCase().includes("construct") &&
                    morphologyData[morphCode]?.toLowerCase().includes("noun") &&
                    !morphologyData[morphCode]?.toLowerCase().includes("suffix")) {
                    wordSpan.classList.add('construct-noun');
                }

                // Check for verbs specifically
                if (morphCode && morphCode.includes("V")) { 
                    wordSpan.classList.add('highlight-verb');
                    verbCount++;
                    console.log(`[loadVerseWithMorphology] Word "${word.textContent}" categorized as verb (morph: ${morphCode})`);
                }

                // Check for adverbs
                if (morphCode && morphCode.includes("D")) { 
                    wordSpan.classList.add('highlight-adverb');
                    adverbCount++;
                    console.log(`[loadVerseWithMorphology] Word "${word.textContent}" categorized as adverb (morph: ${morphCode})`);
                }

                // Add word click functionality (same as Parsha Explorer)
                wordSpan.onclick = async () => {
                    // Find or create word info container
                    let wordInfo = hebrewText.querySelector('.word-info');
                    if (!wordInfo) {
                        wordInfo = document.createElement('div');
                        wordInfo.className = 'word-info';
                        hebrewText.appendChild(wordInfo);
                    }
                    
                    // Get the BDB lemma word if available
                    let lemmaDisplay = lemma;
                    if (lemma) {
                        const lemmaParts = lemma.split('/');
                        for (const part of lemmaParts) {
                            if (part.match(/^\d+\s*[a-z]?$/i)) {
                                const numberPart = part.replace(/\s+[a-z]$/i, '').trim();
                                const cleanLemma = `H${numberPart}`;
                                if (lemmaData[cleanLemma]) {
                                    lemmaDisplay = `${lemma} (${lemmaData[cleanLemma].word})`;
                                    break;
                                }
                            }
                        }
                    }
                    
                    wordInfo.innerHTML = `
                        <section><span class="section-title">Word:</span> ${word.textContent}</section>
                        <section><span class="section-title">Lemma:</span> ${lemmaDisplay || 'Not available'}</section>
                        <section><span class="section-title">Morphology Code:</span> ${morphCode || 'Not available'}</section>
                        <section><span class="section-title">Morphology Description:</span> ${morphDescription}</section>
                        <div class="search-options">
                            <button onclick="displayLemmaOccurrences('${lemma}', 'section')">Find in Section</button>
                            <button onclick="findInTanach('${lemma}')">Find in Tanach</button>
                        </div>`;
                };

                hebrewText.appendChild(wordSpan);
                hebrewText.appendChild(document.createTextNode(' '));
            });
            
            console.log(`[loadVerseWithMorphology] Completed ${bookName}.${chapter}:${verse} - Nouns: ${nounCount}, Proper Nouns: ${properNounCount}, Verbs: ${verbCount}, Adverbs: ${adverbCount}`);
        } else {
            console.warn(`[loadVerseWithMorphology] Verse node not found for ${bookName}.${chapter}:${verse}`);
        }
    } catch (error) {
        console.error(`[loadVerseWithMorphology] Error loading morphological data for ${bookName}.${chapter}:${verse}:`, error);
    }
}

// Load morphological data for all displayed verses (using Parsha Explorer's approach)
async function loadMorphologicalDataForAllVerses() {
    const hebrewTextElements = document.querySelectorAll('.hebrew-text[data-book]');
    
    console.log(`[loadMorphologicalDataForAllVerses] Found ${hebrewTextElements.length} verses to process`);
    console.log(`[loadMorphologicalDataForAllVerses] Morphology data available: ${Object.keys(morphologyData).length} entries`);
    
    for (const hebrewText of hebrewTextElements) {
        const bookName = hebrewText.getAttribute('data-book');
        const chapter = hebrewText.getAttribute('data-chapter');
        const verse = hebrewText.getAttribute('data-verse');
        
        console.log(`[loadMorphologicalDataForAllVerses] Processing ${bookName}.${chapter}:${verse}`);
        
        if (bookName && chapter && verse) {
            await loadVerseWithMorphology(bookName, parseInt(chapter), parseInt(verse), hebrewText);
        }
    }
    
    console.log('[loadMorphologicalDataForAllVerses] Finished loading morphological data for all verses');
    
    // Log the final state of word containers
    const allWordContainers = document.querySelectorAll('.word-container');
    console.log(`[loadMorphologicalDataForAllVerses] Total word containers: ${allWordContainers.length}`);
    
    let nounCount = 0, properNounCount = 0, verbCount = 0, adverbCount = 0;
    allWordContainers.forEach(container => {
        if (container.classList.contains('highlight-noun')) nounCount++;
        if (container.classList.contains('highlight-proper-noun')) properNounCount++;
        if (container.classList.contains('highlight-verb')) verbCount++;
        if (container.classList.contains('highlight-adverb')) adverbCount++;
    });
    
    console.log(`[loadMorphologicalDataForAllVerses] Word type counts - Nouns: ${nounCount}, Proper Nouns: ${properNounCount}, Verbs: ${verbCount}, Adverbs: ${adverbCount}`);
}

// Map chapter numbers to book names for XML loading (using correct XML filenames)
function mapBookName(chapter) {
    // Map chapter ranges to book names based on haftarah structure
    if (chapter >= 11 && chapter <= 15) return 'Hos';  // Hosea 11-14
    if (chapter >= 1 && chapter <= 3) return 'Joel';  // Joel 1-3
    if (chapter >= 1 && chapter <= 9) return 'Amos';  // Amos 1-9
    if (chapter == 1) return 'Obad';                  // Obadiah 1
    if (chapter >= 1 && chapter <= 4) return 'Jonah'; // Jonah 1-4
    if (chapter >= 1 && chapter <= 7) return 'Mic';   // Micah 1-7
    if (chapter >= 1 && chapter <= 3) return 'Nah';   // Nahum 1-3
    if (chapter >= 1 && chapter <= 3) return 'Hab';   // Habakkuk 1-3
    if (chapter >= 1 && chapter <= 3) return 'Zeph';  // Zephaniah 1-3
    if (chapter >= 1 && chapter <= 2) return 'Hag';   // Haggai 1-2
    if (chapter >= 1 && chapter <= 14) return 'Zech'; // Zechariah 1-14
    if (chapter >= 1 && chapter <= 3) return 'Mal';   // Malachi 1-3
    
    // Prophetic books from Torah/Haftarah
    if (chapter >= 1 && chapter <= 24) return 'Josh';    // Joshua 1-24
    if (chapter >= 1 && chapter <= 21) return 'Judg';    // Judges 1-21
    if (chapter >= 1 && chapter <= 31) return '1Sam';    // I Samuel 1-31
    if (chapter >= 1 && chapter <= 24) return '2Sam';    // II Samuel 1-24
    if (chapter >= 1 && chapter <= 22) return '1Kgs';    // I Kings 1-22
    if (chapter >= 1 && chapter <= 25) return '2Kgs';    // II Kings 1-25
    if (chapter >= 1 && chapter <= 66) return 'Isa';     // Isaiah 1-66
    if (chapter >= 1 && chapter <= 52) return 'Jer';     // Jeremiah 1-52
    if (chapter >= 1 && chapter <= 48) return 'Ezek';    // Ezekiel 1-48
    
    return null;
}

// Initialize once DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  parshaSelect = document.getElementById('parsha-select');
  weeklyReadingsContainer = document.getElementById('weekly-readings');
  const bookChartContainer = document.getElementById('bookChartContainer');

  if (!parshaSelect || !weeklyReadingsContainer || !bookChartContainer) {
    console.error("Haftarah Explorer: required DOM elements not found.");
    return;
  }

  // Update URL when filters change
  function updateURL() {
    const params = new URLSearchParams();
    if (parshaSelect.value) params.set('parsha', parshaSelect.value);
    if (activeRites.size < rites.length) {
      params.set('rites', Array.from(activeRites).join(','));
    }
    if (chartOrder !== 'default') params.set('order', chartOrder);
    const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newURL);
  }

  // Load morphological data first
  await loadLemmaData();
  await loadMorphologyData();

  // Add morphological toggle handler
  const morphologyToggle = document.getElementById('morphology-toggle');
  if (morphologyToggle) {
    morphologyToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        loadMorphologicalDataForAllVerses();
        updateWordCounts();
        updateTypeCounts();
        // Show word analysis container
        const wordAnalysisContainer = document.getElementById('wordAnalysisContainer');
        if (wordAnalysisContainer) {
          wordAnalysisContainer.style.display = 'block';
        }
      } else {
        // Hide morphological highlights and word info
        const wordContainers = document.querySelectorAll('.word-container');
        wordContainers.forEach(container => {
          container.classList.remove('highlight-noun', 'highlight-verb', 'highlight-proper-noun', 'highlight-adverb', 'construct-noun', 'filtered-highlight');
        });
        // Hide word info displays
        const wordInfos = document.querySelectorAll('.word-info');
        wordInfos.forEach(info => info.innerHTML = '');
        // Hide word analysis container
        const wordAnalysisContainer = document.getElementById('wordAnalysisContainer');
        if (wordAnalysisContainer) {
          wordAnalysisContainer.style.display = 'none';
        }
      }
    });
  }

  loadHaftarahReadings().then(async () => {
    populateDropdown();
    
    // Apply URL query parameters if present
    const urlParams = new URLSearchParams(window.location.search);
    const parshaParam = urlParams.get('parsha');
    const ritesParam = urlParams.get('rites');
    const orderParam = urlParams.get('order');

    // Set active rites from URL or default to all
    if (ritesParam) {
      // First uncheck all checkboxes
      document.querySelectorAll('#rite-selection input[type=checkbox]').forEach(cb => cb.checked = false);
      activeRites.clear();
      const selectedRites = ritesParam.split(',').map(r => r.trim());
      selectedRites.forEach(rite => {
        if (rites.includes(rite)) {
          activeRites.add(rite);
        }
      });
      // Check only the specified checkboxes after a short delay
      setTimeout(() => {
        selectedRites.forEach(rite => {
          const checkbox = document.querySelector(`input[type=checkbox][value="${rite}"]`);
          if (checkbox) checkbox.checked = true;
        });
      }, 100);
    }

    // Set sorting order from URL or default
    if (orderParam === 'mostUsed' || orderParam === 'default') {
      chartOrder = orderParam;
      const radio = document.querySelector(`input[type=radio][value="${orderParam}"]`);
      if (radio) radio.checked = true;
    }

    // Set parsha from URL or use default
    if (parshaParam && haftarahData[parshaParam]) {
      parshaSelect.value = parshaParam;
    } else {
      await setDefaultParsha();
    }

    const initialParsha = parshaSelect.value;
    const haftarahLengthChartContainer = document.getElementById('haftarahLengthChartContainer');
    const allParshiotLengthChartContainer = document.getElementById('allParshiotLengthChartContainer');
    const overlapHeatmapContainer = document.getElementById('overlapHeatmapContainer');
    const weeklyReadingsContainer = document.getElementById('weeklyReadingsContainer');
    const wordAnalysisContainer = document.getElementById('wordAnalysisContainer');
    if (initialParsha) {
      bookChartContainer.style.display = 'none';
      if (haftarahLengthChartContainer) haftarahLengthChartContainer.style.display = 'none';
      if (allParshiotLengthChartContainer) allParshiotLengthChartContainer.style.display = 'none';
      if (overlapHeatmapContainer) overlapHeatmapContainer.style.display = 'block';
      if (weeklyReadingsContainer) weeklyReadingsContainer.style.display = 'block';
      if (wordAnalysisContainer) wordAnalysisContainer.style.display = 'block';
      // Apply filters for URL parsha
      filterChartsByParsha(initialParsha);
      await generateWeeklyReadings(initialParsha);
      createLengthChart(initialParsha);
      createOverlapHeatmap(initialParsha);
    } else {
      bookChartContainer.style.display = 'block';
      if (haftarahLengthChartContainer) haftarahLengthChartContainer.style.display = 'none';
      if (allParshiotLengthChartContainer) allParshiotLengthChartContainer.style.display = 'block';
      if (overlapHeatmapContainer) overlapHeatmapContainer.style.display = 'none';
      if (weeklyReadingsContainer) weeklyReadingsContainer.style.display = 'none';
      if (wordAnalysisContainer) wordAnalysisContainer.style.display = 'none';
      createLengthChart();
      createBookChart();
      createAllParshiotLengthChart();
      populatePercentageTable();
    }
  });

  parshaSelect.addEventListener('change', async () => {
    const selectedParsha = parshaSelect.value;
    const haftarahLengthChartContainer = document.getElementById('haftarahLengthChartContainer');
    const allParshiotLengthChartContainer = document.getElementById('allParshiotLengthChartContainer');
    const overlapHeatmapContainer = document.getElementById('overlapHeatmapContainer');
    const weeklyReadingsContainer = document.getElementById('weeklyReadingsContainer');
    const wordAnalysisContainer = document.getElementById('wordAnalysisContainer');
    if (selectedParsha) {
      bookChartContainer.style.display = 'none';
      if (haftarahLengthChartContainer) haftarahLengthChartContainer.style.display = 'none';
      if (allParshiotLengthChartContainer) allParshiotLengthChartContainer.style.display = 'none';
      if (overlapHeatmapContainer) overlapHeatmapContainer.style.display = 'block';
      if (weeklyReadingsContainer) weeklyReadingsContainer.style.display = 'block';
      if (wordAnalysisContainer) wordAnalysisContainer.style.display = 'block';
      filterChartsByParsha(selectedParsha);
      await generateWeeklyReadings(selectedParsha);
      createLengthChart(selectedParsha);
      createOverlapHeatmap(selectedParsha);
    } else {
      bookChartContainer.style.display = 'block';
      if (haftarahLengthChartContainer) haftarahLengthChartContainer.style.display = 'none';
      if (allParshiotLengthChartContainer) allParshiotLengthChartContainer.style.display = 'block';
      if (overlapHeatmapContainer) overlapHeatmapContainer.style.display = 'none';
      if (weeklyReadingsContainer) weeklyReadingsContainer.style.display = 'none';
      if (wordAnalysisContainer) wordAnalysisContainer.style.display = 'none';
      // Reset to default order when no parsha is selected
      chartOrder = 'default';
      const defaultRadio = document.querySelector('input[type=radio][value=default]');
      const mostUsedRadio = document.querySelector('input[type=radio][value=mostUsed]');
      if (defaultRadio) defaultRadio.checked = true;
      if (mostUsedRadio) mostUsedRadio.checked = false;
      resetChartsAndReadings();
      createAllParshiotLengthChart();
    }
    updateURL();
  });

  document.querySelectorAll('#rite-selection input[type=checkbox]').forEach(checkbox => {
    checkbox.addEventListener('change', async event => {
      const rite = event.target.value;
      if (event.target.checked) {
        activeRites.add(rite);
      } else {
        activeRites.delete(rite);
      }
      const selectedParsha = parshaSelect.value;
      if (selectedParsha) {
        await generateWeeklyReadings(selectedParsha);
        createLengthChart(selectedParsha);
        createOverlapHeatmap(selectedParsha);
      } else {
        createLengthChart();
      }
      createBookChart();
      populatePercentageTable();
      createAllParshiotLengthChart();
      updateURL();
    });
  });

  document.querySelectorAll('#order-toggle input[type=radio]').forEach(radio => {
    radio.addEventListener('change', event => {
      chartOrder = event.target.value;
      if (!parshaSelect.value) {
        toggleChartOrder();
      }
      createAllParshiotLengthChart();
      updateURL();
    });
  });
});

// Word Analysis Functions
function toggleSortOrder(typeClass) {
    console.log(`[toggleSortOrder] Toggling sort order for ${typeClass}`);
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
    if (sortBtn) sortBtn.textContent = sortLabels[sortOrders[typeClass]];
    
    // Refresh displays if they're currently visible
    const wordsContainer = document.getElementById(`${typeClass}-words`);
    const uniqueContainer = document.getElementById(`${typeClass}-unique-words`);
    
    if (wordsContainer && wordsContainer.style.display === 'block') {
        displayWords(typeClass);
    }
    if (uniqueContainer && uniqueContainer.style.display === 'block') {
        displayUniqueWords(typeClass);
    }
}

function displayWords(typeClass) {
    const words = getWordsFromHaftarahText(typeClass);
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
    const container = document.getElementById(`${typeClass}-words`);
    if (container) container.innerHTML = `Total Words: ${wordsDisplay}`;
}

function displayUniqueWords(typeClass) {
    const words = getWordsFromHaftarahText(typeClass);
    let sortedWords = Array.from(words.keys());
    
    switch(sortOrders[typeClass] || 'alpha') {
        case 'alpha':
            sortedWords.sort((wordA, wordB) => wordA.localeCompare(wordB, 'he', { sensitivity: 'base' }));
            break;
        case 'reverse-alpha':
            sortedWords.sort((wordA, wordB) => wordB.localeCompare(wordA, 'he', { sensitivity: 'base' }));
            break;
        case 'count':
            sortedWords.sort((wordA, wordB) => words.get(wordB) - words.get(wordA));
            break;
        case 'reverse-count':
            sortedWords.sort((wordA, wordB) => words.get(wordA) - words.get(wordB));
            break;
    }
    
    const wordsDisplay = sortedWords.join(', ');
    const container = document.getElementById(`${typeClass}-unique-words`);
    if (container) container.innerHTML = `Unique Lemmas: ${wordsDisplay}`;
}

function getWordsFromHaftarahText(typeClass) {
    const words = new Map();
    const weeklyReadings = document.getElementById('weekly-readings');
    if (!weeklyReadings) return words;
    
    const wordContainers = weeklyReadings.querySelectorAll('.word-container');
    
    wordContainers.forEach(wordSpan => {
        // Filter by morphological type if specified
        if (typeClass && !wordSpan.classList.contains(typeClass)) {
            return;
        }
        
        const word = wordSpan.textContent.trim();
        const lemma = wordSpan.getAttribute('data-lemma');
        
        // Use lemma if available, otherwise fall back to cleaned text
        let wordKey = '';
        if (lemma) {
            // Handle complex lemma formats: split by / and process each part
            const lemmaParts = lemma.split('/');
            let foundWord = false;
            
            for (const part of lemmaParts) {
                if (part.match(/^\d+\s*[a-z]?$/i)) {
                    // This is a number with optional letter suffix (e.g., "5971 a", "5869 a")
                    const numberPart = part.replace(/\s+[a-z]$/i, '').trim();
                    const cleanLemma = `H${numberPart}`;
                    
                    if (lemmaData[cleanLemma]) {
                        wordKey = lemmaData[cleanLemma].word;
                        foundWord = true;
                        break;
                    }
                } else if (part.length > 0 && part.match(/^[\u0590-\u05FF]+$/)) {
                    // This is already a Hebrew word - use it directly
                    wordKey = part;
                    foundWord = true;
                    break;
                }
            }
            
            if (!foundWord) {
                // Fall back to cleaned text (remove diacritics)
                wordKey = word.replace(/[\u0591-\u05C7]/g, '');
            }
        } else {
            // Fall back to cleaned text (remove diacritics)
            wordKey = word.replace(/[\u0591-\u05C7]/g, ''); // Remove cantillation and vowel points
        }
        
        if (wordKey.length > 0) {
            words.set(wordKey, (words.get(wordKey) || 0) + 1);
        }
    });
    
    return words;
}

function toggleFilter(typeClass) {
    // Toggle highlighting of specific word types (same as Parsha Explorer)
    const wordContainers = document.querySelectorAll('.word-container');
    const checkbox = document.getElementById(`${typeClass}-checkbox`);
    
    if (!checkbox) return;
    
    const isActive = checkbox.checked;
    activeFilters[typeClass] = isActive;
    
    wordContainers.forEach(wordSpan => {
        if (isActive && wordSpan.classList.contains(typeClass)) {
            wordSpan.classList.add('filtered-highlight');
        } else {
            wordSpan.classList.remove('filtered-highlight');
        }
    });
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

function toggleUniqueWordsDisplay(typeClass) {
    const uniqueWordsListContainer = document.getElementById(`${typeClass}-unique-words`);
    if (uniqueWordsListContainer.style.display === 'block') {
        uniqueWordsListContainer.style.display = 'none';
    } else {
        displayUniqueWords(typeClass);
        uniqueWordsListContainer.style.display = 'block';
    }
}

function showAllWords() {
    // Reset all filters and show all verses
    activeFilters = {};
    const verseSpans = document.querySelectorAll('.verse-span');
    verseSpans.forEach(span => {
        span.style.display = 'inline-block';
    });
    
    // Reset checkboxes
    document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// Word Analysis Chart Functions
function updateChart() {
    const chartType = document.getElementById('chartTypeSelect').value;
    const filterBox = document.querySelector('.filter-box');
    const chart = document.getElementById('chart');
    const lemmaUsageChart = document.getElementById('lemmaUsageChart');
    
    // Show the filter box and chart elements
    filterBox.style.display = 'block';
    chart.style.display = 'block';
    lemmaUsageChart.style.display = 'block';
    
    // Update counts based on current chart type
    updateWordCounts(chartType);
    
    // Create the chart
    createWordAnalysisChart(chartType);
}

function updateWordCounts(chartType) {
    console.log(`[updateWordCounts] Starting word count update for chartType: ${chartType}`);
    
    const weeklyReadings = document.getElementById('weekly-readings');
    if (!weeklyReadings) {
        console.log(`[updateWordCounts] weekly-readings container not found`);
        return;
    }

    // Count words by morphological type using lemmas (not text)
    const nounWords = new Map();
    const properNounWords = new Map();
    const verbWords = new Map();
    const adverbWords = new Map();

    const wordContainers = weeklyReadings.querySelectorAll('.word-container');
    console.log(`[updateWordCounts] Found ${wordContainers.length} word containers`);
    
    let totalNounCount = 0, totalProperNounCount = 0, totalVerbCount = 0, totalAdverbCount = 0;
    
    wordContainers.forEach((wordSpan, index) => {
        const word = wordSpan.textContent.trim();
        const lemma = wordSpan.getAttribute('data-lemma');
        
        // Use lemma if available, otherwise fall back to cleaned text
        let wordKey = '';
        if (lemma) {
            console.log(`[updateWordCounts] Processing lemma: ${lemma}`);
            
            // Handle complex lemma formats: split by / and process each part
            const lemmaParts = lemma.split('/');
            let foundWord = false;
            
            for (const part of lemmaParts) {
                if (part.match(/^\d+\s*[a-z]?$/i)) {
                    // This is a number with optional letter suffix (e.g., "5971 a", "5869 a")
                    const numberPart = part.replace(/\s+[a-z]$/i, '').trim();
                    const cleanLemma = `H${numberPart}`;
                    console.log(`[updateWordCounts] Trying lemma part: ${part} -> ${cleanLemma}`);
                    
                    if (lemmaData[cleanLemma]) {
                        wordKey = lemmaData[cleanLemma].word;
                        console.log(`[updateWordCounts] Found BDB entry for ${cleanLemma}: "${wordKey}" (full diacritics)`);
                        foundWord = true;
                        break;
                    } else {
                        console.log(`[updateWordCounts] No lemma data found for ${cleanLemma}`);
                    }
                } else if (part.length > 0 && part.match(/^[\u0590-\u05FF]+$/)) {
                    // This is already a Hebrew word - use it directly
                    wordKey = part;
                    console.log(`[updateWordCounts] Using Hebrew word directly: ${wordKey}`);
                    foundWord = true;
                    break;
                }
            }
            
            if (!foundWord) {
                console.log(`[updateWordCounts] No valid lemma found in ${lemma}, falling back to cleaned text`);
                // Fall back to cleaned text (remove diacritics)
                wordKey = word.replace(/[\u0591-\u05C7]/g, '');
            }
        } else {
            // Fall back to cleaned text (remove diacritics)
            wordKey = word.replace(/[\u0591-\u05C7]/g, ''); // Remove cantillation and vowel points
        }
        
        if (wordKey.length > 0) {
            if (wordSpan.classList.contains('highlight-noun')) {
                nounWords.set(wordKey, (nounWords.get(wordKey) || 0) + 1);
                totalNounCount++;
            }
            if (wordSpan.classList.contains('highlight-proper-noun')) {
                properNounWords.set(wordKey, (properNounWords.get(wordKey) || 0) + 1);
                totalProperNounCount++;
            }
            if (wordSpan.classList.contains('highlight-verb')) {
                verbWords.set(wordKey, (verbWords.get(wordKey) || 0) + 1);
                totalVerbCount++;
            }
            if (wordSpan.classList.contains('highlight-adverb')) {
                adverbWords.set(wordKey, (adverbWords.get(wordKey) || 0) + 1);
                totalAdverbCount++;
            }
        }
    });
    
    console.log(`[updateWordCounts] Raw counts - Nouns: ${totalNounCount}, Proper Nouns: ${totalProperNounCount}, Verbs: ${totalVerbCount}, Adverbs: ${totalAdverbCount}`);
    console.log(`[updateWordCounts] Unique counts - Nouns: ${nounWords.size}, Proper Nouns: ${properNounWords.size}, Verbs: ${verbWords.size}, Adverbs: ${adverbWords.size}`);

    // Update the display counts
    console.log(`[updateWordCounts] Updating UI counts...`);
    updateTypeCounts('highlight-noun', nounWords);
    updateTypeCounts('highlight-proper-noun', properNounWords);
    updateTypeCounts('highlight-verb', verbWords);
    updateTypeCounts('highlight-adverb', adverbWords);
    
    console.log(`[updateWordCounts] Word count update completed`);
}

function updateTypeCounts(typeClass, wordMap) {
    const totalCount = Array.from(wordMap.values()).reduce((sum, count) => sum + count, 0);
    const uniqueCount = wordMap.size;
    
    console.log(`[updateTypeCounts] ${typeClass} - Total: ${totalCount}, Unique: ${uniqueCount}`);
    
    const countElement = document.getElementById(`${typeClass}-count`);
    const uniqueCountElement = document.getElementById(`${typeClass}-unique-count`);
    
    console.log(`[updateTypeCounts] ${typeClass} - Found count element: ${!!countElement}, unique element: ${!!uniqueCountElement}`);
    
    if (countElement) {
        countElement.textContent = totalCount;
        console.log(`[updateTypeCounts] ${typeClass} - Updated count element to: ${totalCount}`);
    }
    if (uniqueCountElement) {
        uniqueCountElement.textContent = uniqueCount;
        console.log(`[updateTypeCounts] ${typeClass} - Updated unique count element to: ${uniqueCount}`);
    }
}

function createWordAnalysisChart(chartType) {
    const canvas = document.getElementById('lemmaUsageChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.wordAnalysisChartInstance) {
        window.wordAnalysisChartInstance.destroy();
    }
    
    // Get word data for the selected type
    const wordData = getWordDataForType(chartType);
    
    // Create the chart
    window.wordAnalysisChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: wordData.labels,
            datasets: [{
                label: `Word Frequency`,
                data: wordData.data,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Frequency'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hebrew Words'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Word Type Analysis - Morphological Data'
                }
            }
        }
    });
}

function getWordDataForType(chartType) {
    const weeklyReadings = document.getElementById('weekly-readings');
    if (!weeklyReadings) return { labels: [], data: [] };
    
    const wordFrequency = new Map();
    const wordContainers = weeklyReadings.querySelectorAll('.word-container');
    
    // Determine which CSS class to filter by based on chart type
    let filterClass = '';
    switch (chartType) {
        case 'properNouns':
            filterClass = 'highlight-proper-noun';
            break;
        case 'verbs':
            filterClass = 'highlight-verb';
            break;
        case 'adverbs':
            filterClass = 'highlight-adverb';
            break;
        case 'allWords':
        default:
            filterClass = ''; // Get all words
            break;
    }
    
    wordContainers.forEach(wordSpan => {
        // Filter by morphological type if specified
        if (filterClass && !wordSpan.classList.contains(filterClass)) {
            return;
        }
        
        const word = wordSpan.textContent.trim();
        const lemma = wordSpan.getAttribute('data-lemma');
        
        // Use lemma if available, otherwise fall back to cleaned text
        let wordKey = '';
        if (lemma) {
            // Handle complex lemma formats: split by / and process each part
            const lemmaParts = lemma.split('/');
            let foundWord = false;
            
            for (const part of lemmaParts) {
                if (part.match(/^\d+\s*[a-z]?$/i)) {
                    // This is a number with optional letter suffix (e.g., "5971 a", "5869 a")
                    const numberPart = part.replace(/\s+[a-z]$/i, '').trim();
                    const cleanLemma = `H${numberPart}`;
                    
                    if (lemmaData[cleanLemma]) {
                        wordKey = lemmaData[cleanLemma].word;
                        foundWord = true;
                        break;
                    }
                } else if (part.length > 0 && part.match(/^[\u0590-\u05FF]+$/)) {
                    // This is already a Hebrew word - use it directly
                    wordKey = part;
                    foundWord = true;
                    break;
                }
            }
            
            if (!foundWord) {
                // Fall back to cleaned text (remove diacritics)
                wordKey = word.replace(/[\u0591-\u05C7]/g, '');
            }
        } else {
            // Fall back to cleaned text (remove diacritics)
            wordKey = word.replace(/[\u0591-\u05C7]/g, ''); // Remove cantillation and vowel points
        }
        
        if (wordKey.length > 0) {
            wordFrequency.set(wordKey, (wordFrequency.get(wordKey) || 0) + 1);
        }
    });
    
    // Sort by frequency and take top 20
    const sortedWords = Array.from(wordFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
    
    return {
        labels: sortedWords.map(([word]) => word),
        data: sortedWords.map(([, count]) => count)
    };
}

// Function to display lemma occurrences in the current section (same as Parsha Explorer)
function displayLemmaOccurrences(lemma, scope) {
    if (!lemma) return;
    
    console.log(`[displayLemmaOccurrences] Finding occurrences of lemma: ${lemma}`);
    
    // Remove previous highlights
    document.querySelectorAll('.filtered-highlight').forEach(el => {
        el.classList.remove('filtered-highlight');
    });
    
    // Find and highlight all words with the matching lemma
    const wordContainers = document.querySelectorAll('.word-container');
    let foundCount = 0;
    
    wordContainers.forEach(wordSpan => {
        const wordLemma = wordSpan.getAttribute('data-lemma');
        if (wordLemma && wordLemma.includes(lemma)) {
            wordSpan.classList.add('filtered-highlight');
            foundCount++;
        }
    });
    
    console.log(`[displayLemmaOccurrences] Found and highlighted ${foundCount} occurrences of lemma ${lemma}`);
    
    // Scroll to first occurrence
    if (foundCount > 0) {
        const firstOccurrence = document.querySelector('.filtered-highlight');
        if (firstOccurrence) {
            firstOccurrence.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// Function to find lemma in Tanach (same as Parsha Explorer)
function findInTanach(lemma) {
    if (!lemma) return;
    
    console.log(`[findInTanach] Searching for lemma ${lemma} in Tanach`);
    
    // Extract numeric part from lemma
    const numericLemma = lemma.match(/\d+/)?.[0];
    if (!numericLemma) {
        console.log(`[findInTanach] No numeric lemma found in ${lemma}`);
        return;
    }
    
    // Open Sefaria or other Tanach search with the lemma
    const searchUrl = `https://www.sefaria.org.il/search?q=${numericLemma}&lang=he`;
    window.open(searchUrl, '_blank');
    
    console.log(`[findInTanach] Opening search for lemma ${numericLemma} in new tab`);
}
