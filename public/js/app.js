/**
 * Torah Schedule Creator - Main Application Logic
 * Handles UI interactions, schedule generation, and file downloads
 */

/**
 * Show a status message
 */
/**
 * Torah Schedule Creator - Main Application Logic
 * Handles UI interactions, schedule generation, and file downloads
 */

/**
 * Show a status message
 */
function showMessage(message) {
    console.log(message);
    // Fall back to alert for important messages
    alert(message);
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap tabs
    const tanachTab = new bootstrap.Tab(document.querySelector('#tanach-tab'));
    const mishnahTab = new bootstrap.Tab(document.querySelector('#mishnah-tab'));

    // Initialize date pickers
    initializeDatePickers();

    // Initialize form event listeners
    initializeFormListeners();

    // Initialize book selection dropdowns
    populateBookSelections();

    // Initialize Mishnah selection dropdowns
    populateMishnayotSelections();

    // Fetch learning of the day
    fetchLearningOfTheDay('Genesis 1:1');

    // Initialize checkbox state and visibility
    const chaptersPerDayCheckbox = document.getElementById('chaptersPerDayCheckbox');
    const timeframeCheckbox = document.getElementById('timeframeCheckbox');
    const chaptersPerDayInputGroup = document.getElementById('chaptersPerDayInputGroup');
    const timeframeInputGroup = document.getElementById('timeframeInputGroup');
    const chaptersPerDayInput = document.getElementById('chaptersPerDayInput');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    function updateInputVisibility() {
        if (chaptersPerDayCheckbox.checked && timeframeCheckbox.checked) {
            chaptersPerDayInputGroup.style.display = 'block';
            timeframeInputGroup.style.display = 'block';
            chaptersPerDayInput.disabled = false;
            startDateInput.disabled = false;
            endDateInput.disabled = false;
        } else if (chaptersPerDayCheckbox.checked) {
            chaptersPerDayInputGroup.style.display = 'block';
            timeframeInputGroup.style.display = 'none';
            chaptersPerDayInput.disabled = false;
            startDateInput.disabled = true;
            endDateInput.disabled = true;
        } else if (timeframeCheckbox.checked) {
            chaptersPerDayInputGroup.style.display = 'none';
            timeframeInputGroup.style.display = 'block';
            chaptersPerDayInput.disabled = true;
            startDateInput.disabled = false;
            endDateInput.disabled = false;
        } else {
            chaptersPerDayInputGroup.style.display = 'none';
            timeframeInputGroup.style.display = 'none';
            chaptersPerDayInput.disabled = true;
            startDateInput.disabled = true;
            endDateInput.disabled = true;
        }
    }

    chaptersPerDayCheckbox.addEventListener('change', updateInputVisibility);
    timeframeCheckbox.addEventListener('change', updateInputVisibility);

    // Initial setup
    updateInputVisibility();

    // Make "Units per day" and "Set timeframe" checked by default
    chaptersPerDayCheckbox.checked = true;
    timeframeCheckbox.checked = true;
    updateInputVisibility(); // Call again to reflect initial checkbox state
});

/**
 * Initialize all date picker fields
 */
function initializeDatePickers() {
    const today = new Date();

    // Tanach date pickers
    const startDatePicker = flatpickr('#startDate', {
        dateFormat: 'Y-m-d',
        defaultDate: today
    });

    flatpickr('#endDate', {
        dateFormat: 'Y-m-d',
        defaultDate: '',
        onOpen: function(selectedDates, dateStr, instance) {
            // Set default to start date when opened if empty
            if (!dateStr) {
                const startDate = document.getElementById('startDate').value;
                if (startDate) {
                    instance.setDate(startDate);
                }
            }
        }
    });

    // Mishnayot date pickers
    flatpickr('#mishnayotStartDate', {
        dateFormat: 'Y-m-d',
        defaultDate: today
    });

    flatpickr('#mishnayotEndDate', {
        dateFormat: 'Y-m-d',
        defaultDate: '',
        onOpen: function(selectedDates, dateStr, instance) {
            // Set default to start date when opened if empty
            if (!dateStr) {
                const startDate = document.getElementById('mishnayotStartDate').value;
                if (startDate) {
                    instance.setDate(startDate);
                }
            }
        }
    });

    // Child schedule date pickers
    flatpickr('#childBirthdate', {
        dateFormat: 'Y-m-d',
        defaultDate: ''
    });

    flatpickr('#customStartDate', {
        dateFormat: 'Y-m-d',
        defaultDate: ''
    });
}

/**
 * Parse a date string in YYYY-MM-DD format to ensure consistent date handling
 * This avoids timezone issues that can occur with the Date constructor
 */
function parseDate(dateStr) {
    if (!dateStr) return new Date();

    const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day); // Month is 0-indexed in JavaScript Date
}

/**
 * Initialize event listeners for form controls
 */
function initializeFormListeners() {
    // Tanach form listeners
    document.getElementById('tanachSelection').addEventListener('change', handleTanachSelectionChange);
    document.getElementById('chidonDivision').addEventListener('change', updateChidonBooksInfo);

    const scheduleTypeRadios = document.querySelectorAll('input[name="scheduleType"]');
    scheduleTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleScheduleTypeChange);
    });

    document.getElementById('generateScheduleBtn').addEventListener('click', generateTanachSchedule);

    // Child schedule form listeners
    document.getElementById('useCustomStartDate').addEventListener('change', function() {
        document.getElementById('customStartDateGroup').style.display =
            this.checked ? 'block' : 'none';
    });

    document.getElementById('childBirthdate').addEventListener('change', updateChildScheduleInfo);
    document.getElementById('customStartDate').addEventListener('change', updateChildScheduleInfo);
    document.getElementById('useCustomStartDate').addEventListener('change', updateChildScheduleInfo);

    // Mishnayot form listeners
    document.getElementById('mishnayotSelection').addEventListener('change', handleMishnayotSelectionChange);

    const mishnayotScheduleTypeRadios = document.querySelectorAll('input[name="mishnayotScheduleType"]');
    mishnayotScheduleTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleMishnayotScheduleTypeChange);
    });

    document.getElementById('sederSelection').addEventListener('change', handleSederSelectionChange);
    document.getElementById('studyWholeSeder').addEventListener('change', handleStudyWholeSederChange);
    document.getElementById('generateMishnayotScheduleBtn').addEventListener('click', generateMishnayotSchedule);

    // Download buttons
    const csvButton = document.getElementById('downloadCsv');
    const icsButton = document.getElementById('downloadIcs');
    const latexButton = document.getElementById('downloadLatex');

    if (csvButton) {
        csvButton.addEventListener('click', downloadScheduleCSV);
    }

    if (icsButton) {
        icsButton.addEventListener('click', downloadScheduleICS);
    }

    if (latexButton) {
        latexButton.addEventListener('click', function() {
            const selectionElement = document.getElementById('tanachSelection');
            const selectionValue = selectionElement.value;
            let learningTitle = '';

            const hebrewTitles = {
                'all': 'כל התנ"ך',
                'torah': 'תורה',
                'neviim': 'נביאים',
                'ketuvim': 'כתובים',
                'chidon': 'חומר חידון התנ"ך',
                'childSchedule': 'לוח לימוד לילדים'
            };

            // Define book name mappings (Hebrew to English)
            const bookNameMap = {
                'בראשית': 'Genesis',
                'שמות': 'Exodus',
                'ויקרא': 'Leviticus',
                'במדבר': 'Numbers',
                'דברים': 'Deuteronomy',
                'יהושע': 'Joshua',
                'שופטים': 'Judges',
                'שמואל א': 'I Samuel',
                'שמואל ב': 'II Samuel',
                'מלכים א': 'I Kings',
                'מלכים ב': 'II Kings',
                'ישעיהו': 'Isaiah',
                'ירמיהו': 'Jeremiah',
                'יחזקאל': 'Ezekiel',
                'הושע': 'Hosea',
                'יואל': 'Joel',
                'עמוס': 'Amos',
                'עובדיה': 'Obadiah',
                'יונה': 'Jonah',
                'מיכה': 'Micah',
                'נחום': 'Nahum',
                'חבקוק': 'Habakkuk',
                'צפניה': 'Zephaniah',
                'חגי': 'Haggai',
                'זכריה': 'Zechariah',
                'מלאכי': 'Malachi',
                'תהלים': 'Psalms',
                'משלי': 'Proverbs',
                'איוב': 'Job',
                'שיר השירים': 'Song of Songs',
                'רות': 'Ruth',
                'איכה': 'Lamentations',
                'קהלת': 'Ecclesiastes',
                'אסתר': 'Esther',
                'דניאל': 'Daniel',
                'עזרא': 'Ezra',
                'נחמיה': 'Nehemiah',
                'דברי הימים א': 'I Chronicles',
                'דברי הימים ב': 'II Chronicles'
            };

            if (selectionValue === 'custom') {
                const bookElement = document.getElementById('bookSelection');
                const englishBookName = bookElement.value;
                // Get Hebrew book name from the book name map
                for (const [hebrew, english] of Object.entries(bookNameMap)) {
                    if (english === englishBookName) {
                        learningTitle = hebrew;
                        break;
                    }
                }
                if (!learningTitle) {
                    learningTitle = 'לוח לימוד תנ"ך';
                }
            } else {
                learningTitle = hebrewTitles[selectionValue] || 'לוח לימוד תנ"ך';
            }

            downloadScheduleLatex(learningTitle);
        });
    }

    // Event listener for fetching learning based on user input
    document.getElementById('fetchLearningBtn').addEventListener('click', function() {
        const reference = document.getElementById('sefariaReference').value;
        fetchLearningOfTheDay(reference);
    });
}

/**
 * Populate book selection dropdowns
 */
function populateBookSelections() {
    const bookSelection = document.getElementById('bookSelection');
    bookSelection.innerHTML = '';
    
    // Add all books from Tanach
    const allBooks = getAllTanachBooks();
    allBooks.forEach(book => {
        const option = document.createElement('option');
        option.value = book.name;
        option.textContent = `${book.name} (${book.hebrewName})`;
        bookSelection.appendChild(option);
    });
}

/**
 * Populate Mishnah selection dropdowns
 */
function populateMishnayotSelections() {
    // Populate Seder selection
    const sederSelection = document.getElementById('sederSelection');
    sederSelection.innerHTML = '';
    
    const sedarim = [
        { value: 'zeraim', label: 'Zeraim (Seeds)' },
        { value: 'moed', label: 'Moed (Festival)' },
        { value: 'nashim', label: 'Nashim (Women)' },
        { value: 'nezikin', label: 'Nezikin (Damages)' },
        { value: 'kodashim', label: 'Kodashim (Holy Things)' },
        { value: 'taharot', label: 'Taharot (Purities)' }
    ];
    
    sedarim.forEach(seder => {
        const option = document.createElement('option');
        option.value = seder.value;
        option.textContent = seder.label;
        sederSelection.appendChild(option);
    });
    
    // Populate tractate selection with all tractates initially
    updateTractateSelection('zeraim');
}

/**
 * Update tractate selection based on selected Seder
 */
function updateTractateSelection(seder) {
    const tractateSelection = document.getElementById('tractateSelection');
    tractateSelection.innerHTML = '';
    
    const tractates = getMishnayotBySeder(seder);
    tractates.forEach(tractate => {
        const option = document.createElement('option');
        option.value = tractate.name;
        option.textContent = `${tractate.name} (${tractate.hebrewName}) - ${tractate.chapters} chapters`;
        tractateSelection.appendChild(option);
    });
}

/**
 * Populate tractate options with all tractates or filtered by seder
 */
function populateTractateOptions(showAll = false) {
    const tractateSelection = document.getElementById('tractateSelection');
    
    if (showAll) {
        // Clear existing options
        tractateSelection.innerHTML = '';
        
        // Add all tractates from all sedarim
        for (const seder in mishnah) {
            const tractates = getMishnayotBySeder(seder);
            
            // Create an optgroup for each seder
            const optgroup = document.createElement('optgroup');
            optgroup.label = seder;
            
            // Add each tractate to the group
            tractates.forEach(tractate => {
                const option = document.createElement('option');
                option.value = tractate.name;
                option.textContent = `${tractate.name} (${tractate.hebrewName}) - ${tractate.chapters} chapters`;
                optgroup.appendChild(option);
            });
            
            tractateSelection.appendChild(optgroup);
        }
    } else {
        // Filter by selected seder
        const seder = document.getElementById('sederSelection').value;
        updateTractateSelection(seder);
    }
}

/**
 * Handle change in Tanach selection dropdown
 */
/**
 * Handle change in Tanach selection dropdown
 */
function handleTanachSelectionChange() {
    const selection = document.getElementById('tanachSelection').value;
    const bookSelectionGroup = document.getElementById('bookSelectionGroup');
    const chidonDivisionGroup = document.getElementById('chidonDivisionGroup');
    const childScheduleGroup = document.getElementById('childScheduleGroup');
    const chaptersPerDayGroup = document.getElementById('chaptersPerDayGroup');
    const timeframeGroup = document.getElementById('timeframeGroup');
    const chaptersPerDayInput = document.getElementById('chaptersPerDayInput');
    const chaptersPerDayCheckbox = document.getElementById('chaptersPerDayCheckbox');
    const timeframeCheckbox = document.getElementById('timeframeCheckbox');

    // Add null checks for all DOM elements
    if (selection === 'custom') {
        if (bookSelectionGroup) bookSelectionGroup.style.display = 'block';
        if (chidonDivisionGroup) chidonDivisionGroup.style.display = 'none';
        if (childScheduleGroup) childScheduleGroup.style.display = 'none';

        resetDatePickers();
        if (timeframeGroup && timeframeCheckbox) timeframeGroup.style.display = timeframeCheckbox.checked ? 'block' : 'none';
        if (chaptersPerDayGroup && chaptersPerDayCheckbox) chaptersPerDayGroup.style.display = chaptersPerDayCheckbox.checked ? 'block' : 'none';
        if (chaptersPerDayInput) chaptersPerDayInput.disabled = chaptersPerDayCheckbox && !chaptersPerDayCheckbox.checked;
    } else if (selection === 'chidon') {
        if (bookSelectionGroup) bookSelectionGroup.style.display = 'none';
        if (chidonDivisionGroup) chidonDivisionGroup.style.display = 'block';
        if (childScheduleGroup) childScheduleGroup.style.display = 'none';

        updateChidonBooksInfo();
    } else if (selection === 'childSchedule') {
        if (bookSelectionGroup) bookSelectionGroup.style.display = 'none';
        if (chidonDivisionGroup) chidonDivisionGroup.style.display = 'none';
        if (childScheduleGroup) childScheduleGroup.style.display = 'block';
        initializeChildScheduleForm();
    } else {
        if (bookSelectionGroup) bookSelectionGroup.style.display = 'none';
        if (chidonDivisionGroup) chidonDivisionGroup.style.display = 'none';
        if (childScheduleGroup) childScheduleGroup.style.display = 'none';
        if (timeframeGroup && timeframeCheckbox) timeframeGroup.style.display = timeframeCheckbox.checked ? 'block' : 'none';
        if (chaptersPerDayGroup && chaptersPerDayCheckbox) chaptersPerDayGroup.style.display = chaptersPerDayCheckbox.checked ? 'block' : 'none';
        if (chaptersPerDayInput && chaptersPerDayCheckbox) chaptersPerDayInput.disabled = !chaptersPerDayCheckbox.checked;
    }
}

/**
 * Reset date pickers to today's date and ensure UI elements are correctly updated
 */
/**
 * Reset date pickers to today's date and ensure UI elements are correctly updated
 */
function resetDatePickers() {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    document.getElementById('startDate').value = formattedToday;  // ✅ Set default start date
    document.getElementById('endDate').value = ''; // Clear end date

    document.getElementById('mishnayotStartDate').value = formattedToday;
    document.getElementById('mishnayotEndDate').value = ''; // Clear end date

    document.getElementById('chaptersPerDayInput').value = ''; // Clear units per day input
    document.getElementById('chaptersPerDayInput').disabled = false; // Re-enable units per day if disabled

    console.log('🛠 Date pickers and UI elements reset. Start date set to today:', formattedToday);
}

/**
 * Update the Chidon parts selection and books information display
 */
function updateChidonBooksInfo() {
    const division = document.getElementById('chidonDivision').value;
    const chidonPartsSelection = document.getElementById('chidonPartsSelection');
    const chidonBooksInfo = document.getElementById('chidonBooksInfo');
    const chidonParts = getChidonParts(division);
    
    // Generate checkboxes for parts selection
    let partsHtml = '';
    chidonParts.forEach(part => {
        partsHtml += `
        <div class="form-check">
            <input class="form-check-input chidon-part" type="checkbox" value="${part.id}" id="${part.id}" checked>
            <label class="form-check-label" for="${part.id}">
                ${part.name}
            </label>
        </div>`;
    });
    chidonPartsSelection.innerHTML = partsHtml;
    
    // Add event listeners to update book info when parts are selected/deselected
    document.querySelectorAll('.chidon-part').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedChidonBooks);
    });
    
    // Update the books information display
    updateSelectedChidonBooks();
}

/**
 * Update the display of selected Chidon books based on selected parts
 */
function updateSelectedChidonBooks() {
    const division = document.getElementById('chidonDivision').value;
    const chidonBooksInfo = document.getElementById('chidonBooksInfo');
    const selectedParts = document.querySelectorAll('.chidon-part:checked');
    const selectedPartIds = Array.from(selectedParts).map(checkbox => checkbox.value);
    
    // Get books from selected parts
    const chidonBooks = getChidonBooks(division, selectedPartIds);
    
    let html = '<ul class="mb-0">';
    chidonBooks.forEach(book => {
        if (book.fullBook) {
            html += `<li>${book.name} (${book.hebrewName}): Complete book</li>`;
        } else if (book.customChapters && book.customChapters.length > 0) {
            html += `<li>${book.name} (${book.hebrewName}): Chapters ${book.customChapters.join(', ')}</li>`;
        }
    });
    html += '</ul>';
    
    if (chidonBooks.length === 0) {
        html = '<p class="text-muted">Please select at least one part to view books.</p>';
    }
    
    chidonBooksInfo.innerHTML = html;
}

/**
 * Initialize the child schedule form
 */
function initializeChildScheduleForm() {
    // Initialize date pickers for birth date and custom start date
    flatpickr('#childBirthdate', {
        dateFormat: 'Y-m-d',
        allowInput: true
    });
    
    flatpickr('#customStartDate', {
        dateFormat: 'Y-m-d',
        allowInput: true
    });
    
    // Add event listener for custom start date checkbox
    document.getElementById('useCustomStartDate').addEventListener('change', function() {
        document.getElementById('customStartDateGroup').style.display = 
            this.checked ? 'block' : 'none';
    });
    
    // Add event listeners to update schedule information when inputs change
    document.getElementById('childBirthdate').addEventListener('change', updateChildScheduleInfo);
    document.getElementById('customStartDate').addEventListener('change', updateChildScheduleInfo);
    document.getElementById('useCustomStartDate').addEventListener('change', updateChildScheduleInfo);
}

/**
 * Update child schedule information based on input values
 */
function updateChildScheduleInfo() {
    const birthdateInput = document.getElementById('childBirthdate');
    const childScheduleInfo = document.getElementById('childScheduleInfo');
    const scheduleDetails = document.getElementById('scheduleDetails');
    
    if (!birthdateInput.value) {
        childScheduleInfo.style.display = 'none';
        return;
    }
    
    try {
        // Parse birth date
        const birthDate = parseDate(birthdateInput.value);
        if (!birthDate) {
            throw new Error('Invalid birth date');
        }
        
        // Show loading message
        scheduleDetails.innerHTML = '<p>Calculating Hebrew dates...</p>';
        childScheduleInfo.style.display = 'block';
        
        // Get Hebrew birth date using Hebcal API
        const birthYear = birthDate.getFullYear();
        const birthMonth = birthDate.getMonth() + 1; // JavaScript months are 0-indexed
        const birthDay = birthDate.getDate();
        
        // Format date for API call (YYYY-MM-DD)
        const dateStr = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
        
        // Fetch Hebrew date from Hebcal API
        fetch(`https://www.hebcal.com/converter?cfg=json&date=${dateStr}&g2h=1`)
            .then(response => response.json())
            .then(data => {
                // Store original Hebrew date information - ensure month name is included
                const originalHebrewDate = data.hebrew;
                const originalHebrewMonthName = getHebrewMonthName(data);
                const originalHebrewDateFormatted = `${data.hebrew} (${data.hd} ${originalHebrewMonthName} ${data.hy})`;
                
                // Get Hebrew date components
                const hebrewYear = data.hy;
                const hebrewMonth = data.hm;
                const hebrewDay = data.hd;
                
                // Calculate 5th Hebrew birthday
                return Promise.all([
                    originalHebrewDateFormatted,
                    fetch(`https://www.hebcal.com/converter?cfg=json&hy=${hebrewYear + 5}&hm=${hebrewMonth}&hd=${hebrewDay}&h2g=1`)
                ]);
            })
            .then(([originalHebrewDateFormatted, response]) => {
                return Promise.all([
                    originalHebrewDateFormatted,
                    response.json()
                ]);
            })
            .then(([originalHebrewDateFormatted, data]) => {
                // Debug: Log the 5th birthday API response with detailed property inspection
                console.log('Hebcal API response for 5th birthday:', data);
                console.log('5th birthday month properties:', {
                    hm: data.hm,
                    hm_type: typeof data.hm,
                    month: data.month,
                    month_type: typeof data.month,
                    hebrew: data.hebrew,
                    hd: data.hd,
                    hy: data.hy
                });
                
                // Get Gregorian date for 5th Hebrew birthday
                const fifthBirthday = new Date(data.gy, data.gm - 1, data.gd);
                
                // Store 5th Hebrew birthday information with proper month name
                // Use our improved getHebrewMonthName function to get the month name
                const fifthHebrewMonthName = getHebrewMonthName(data);
                const fifthHebrewDateFormatted = `${data.hebrew} (${data.hd} ${fifthHebrewMonthName} ${data.hy})`;
                
                // Log the formatted date for debugging
                console.log('Formatted 5th birthday:', {
                    original: data.hebrew,
                    monthName: fifthHebrewMonthName,
                    formatted: fifthHebrewDateFormatted
                });
                
                // Update the start date field automatically
                const tanachStartDate = document.getElementById('startDate');
                if (tanachStartDate) {
                    tanachStartDate.value = formatDateForInput(fifthBirthday);
                    console.log('Setting start date field to:', formatDateForInput(fifthBirthday));
                }
                
                // Get Hebrew date components again for 10th birthday calculation
                const birthDateStr = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
                
                // Fetch Hebrew date from Hebcal API
                return Promise.all([
                    fifthBirthday,
                    fifthHebrewDateFormatted,
                    originalHebrewDateFormatted,
                    fetch(`https://www.hebcal.com/converter?cfg=json&date=${birthDateStr}&g2h=1`)
                ]);
            })
            .then(([fifthBirthday, fifthHebrewDateFormatted, originalHebrewDateFormatted, response]) => {
                return Promise.all([
                    fifthBirthday,
                    fifthHebrewDateFormatted,
                    originalHebrewDateFormatted,
                    response.json()
                ]);
            })
            .then(([fifthBirthday, fifthHebrewDateFormatted, originalHebrewDateFormatted, data]) => {
                // Calculate 10th Hebrew birthday
                const hebrewYear = data.hy;
                const hebrewMonth = data.hm;
                const hebrewDay = data.hd;
                
                return Promise.all([
                    fifthBirthday,
                    fifthHebrewDateFormatted,
                    originalHebrewDateFormatted,
                    fetch(`https://www.hebcal.com/converter?cfg=json&hy=${hebrewYear + 10}&hm=${hebrewMonth}&hd=${hebrewDay}&h2g=1`)
                ]);
            })
            .then(([fifthBirthday, fifthHebrewDateFormatted, originalHebrewDateFormatted, response]) => {
                return Promise.all([
                    fifthBirthday,
                    fifthHebrewDateFormatted,
                    originalHebrewDateFormatted,
                    response.json()
                ]);
            })
            .then(([fifthBirthday, fifthHebrewDateFormatted, originalHebrewDateFormatted, data]) => {
                // Get Gregorian date for 10th Hebrew birthday
                const tenthBirthday = new Date(data.gy, data.gm - 1, data.gd);
                
                // Store 10th Hebrew birthday information with proper month name
                // Use our improved getHebrewMonthName function to get the month name
                const tenthHebrewMonthName = getHebrewMonthName(data);
                const tenthHebrewDateFormatted = `${data.hebrew} (${data.hd} ${tenthHebrewMonthName} ${data.hy})`;
                
                // Log the formatted date for debugging
                console.log('Formatted 10th birthday:', {
                    original: data.hebrew,
                    monthName: tenthHebrewMonthName,
                    formatted: tenthHebrewDateFormatted
                });
                
                // Update the end date field automatically
                const tanachEndDate = document.getElementById('endDate');
                if (tanachEndDate) {
                    tanachEndDate.value = formatDateForInput(tenthBirthday);
                    console.log('Setting end date field to:', formatDateForInput(tenthBirthday));
                }
                
                // Determine start date
                let startDate = fifthBirthday;
                const today = new Date();
                const useCustom = document.getElementById('useCustomStartDate').checked;
                
                if (useCustom) {
                    const customStartInput = document.getElementById('customStartDate');
                    if (customStartInput.value) {
                        startDate = parseDate(customStartInput.value);
                    }
                } else if ((today - birthDate) / (1000 * 60 * 60 * 24 * 365) >= 5) {
                    // If child is already older than 5, use today as start date
                    startDate = today;
                }
                
                // Calculate total days and verses
                const totalDays = Math.round((tenthBirthday - startDate) / (1000 * 60 * 60 * 24));
                const totalVerses = 23145; // Approximate total verses in Tanach
                const versesPerDay = Math.ceil(totalVerses / totalDays);
                
                // Display schedule information with Hebrew dates
                let html = `
                    <h3>Hebrew Date Information:</h3>
                    <p><strong>Birth Date:</strong> ${formatDateForDisplay(birthDate)}</p>
                    <p><strong>Birth Date (Hebrew):</strong> ${originalHebrewDateFormatted}</p>
                    <p><strong>5th Hebrew Birthday:</strong> ${fifthHebrewDateFormatted} (${formatDateForDisplay(fifthBirthday)})</p>
                    <p><strong>10th Hebrew Birthday:</strong> ${tenthHebrewDateFormatted} (${formatDateForDisplay(tenthBirthday)})</p>
                    
                    <h3>Schedule Information:</h3>
                    <p><strong>Child's Age:</strong> ${Math.floor((today - birthDate) / (1000 * 60 * 60 * 24 * 365))} years</p>
                    <p><strong>Start Date:</strong> ${formatDateForDisplay(startDate)}</p>
                    <p><strong>End Date (10th Hebrew birthday):</strong> ${formatDateForDisplay(tenthBirthday)}</p>
                    <p><strong>Total Days:</strong> ${totalDays}</p>
                    <p><strong>Approximate Verses Per Day:</strong> ${versesPerDay}</p>
                `;
                
                scheduleDetails.innerHTML = html;
                childScheduleInfo.style.display = 'block';
            })
            .catch(error => {
                console.error('Error fetching Hebrew dates:', error);
                scheduleDetails.innerHTML = `<p class="text-danger">Error calculating Hebrew dates: ${error.message}</p>`;
            });
    } catch (error) {
        console.error('Error calculating schedule:', error);
        scheduleDetails.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
        childScheduleInfo.style.display = 'block';
    }
}

/**
 * Handle change in schedule type radio buttons
 */
function handleScheduleTypeChange() {
    const scheduleType = document.querySelector('input[name="scheduleType"]:checked').value;
    const chaptersPerDayGroup = document.getElementById('chaptersPerDayGroup');
    const timeframeGroup = document.getElementById('timeframeGroup');
    
    if (scheduleType === 'chaptersPerDay') {
        chaptersPerDayGroup.style.display = 'block';
        timeframeGroup.style.display = 'none';
    } else {
        chaptersPerDayGroup.style.display = 'none';
        timeframeGroup.style.display = 'block';
    }
}

/**
 * Handle change in Mishnayot selection dropdown
 */
function handleMishnayotSelectionChange() {
    const selection = document.getElementById('mishnayotSelection').value;
    const sederSelectionGroup = document.getElementById('sederSelectionGroup');
    
    if (selection === 'seder') {
        sederSelectionGroup.style.display = 'block';
        // Make sure the checkbox is checked by default
        document.getElementById('studyWholeSeder').checked = true;
        // Hide tractate selection initially
        document.getElementById('tractateSelectionContainer').style.display = 'none';
    } else {
        sederSelectionGroup.style.display = 'none';
    }
}

/**
 * Handle change in Study Whole Seder checkbox
 */
function handleStudyWholeSederChange() {
    const studyWholeSeder = document.getElementById('studyWholeSeder').checked;
    const tractateSelectionContainer = document.getElementById('tractateSelectionContainer');
    
    if (studyWholeSeder) {
        tractateSelectionContainer.style.display = 'none';
    } else {
        tractateSelectionContainer.style.display = 'block';
        // Update tractate options based on selected seder
        const seder = document.getElementById('sederSelection').value;
        updateTractateSelection(seder);
        console.log('Tractate selection updated for seder:', seder);
    }
}

/**
 * Handle change in Mishnayot schedule type radio buttons
 */
function handleMishnayotScheduleTypeChange() {
    const scheduleType = document.querySelector('input[name="mishnayotScheduleType"]:checked').value;
    const chaptersPerDayGroup = document.getElementById('mishnayotChaptersPerDayGroup');
    const timeframeGroup = document.getElementById('mishnayotTimeframeGroup');
    
    if (scheduleType === 'chaptersPerDay') {
        chaptersPerDayGroup.style.display = 'block';
        timeframeGroup.style.display = 'none';
    } else {
        chaptersPerDayGroup.style.display = 'none';
        timeframeGroup.style.display = 'block';
    }
}

/**
 * Handle change in Seder selection dropdown
 */
function handleSederSelectionChange() {
    const seder = document.getElementById('sederSelection').value;
    
    // Only update tractate selection if the checkbox is unchecked
    if (!document.getElementById('studyWholeSeder').checked) {
        updateTractateSelection(seder);
    }
}

/**
 * Generate Tanach study schedule
 */
function generateTanachSchedule() {
    // Get form values
    const scheduleNameElement = document.getElementById('scheduleName');
    const name = scheduleNameElement ? scheduleNameElement.value || 'Tanach Study Schedule' : 'Tanach Study Schedule';
    window.scheduleName = name; // Set global schedule name

    const tanachSelectionElement = document.getElementById('tanachSelection');
    const tanachSelection = tanachSelectionElement ? tanachSelectionElement.value : 'custom';

    // Handle child schedule option separately
    if (tanachSelection === 'childSchedule') {
        generateChildTanachSchedule();
        return;
    }

    const customBook = tanachSelection === 'custom' ? document.getElementById('bookSelection').value : null;
    const chidonDivision = tanachSelection === 'chidon' ? document.getElementById('chidonDivision').value : null;

    // Get selected weekdays
    const selectedDays = [];
    document.querySelectorAll('.weekday:checked').forEach(checkbox => {
        selectedDays.push(parseInt(checkbox.value));
    });

    if (selectedDays.length === 0) {
        alert('Please select at least one day of the week for study');
        return;
    }

    // Get schedule type and related values
    const chaptersPerDayCheckbox = document.getElementById('chaptersPerDayCheckbox');
    const timeframeCheckbox = document.getElementById('timeframeCheckbox');
    let startDate, endDate, unitsPerDay;
    const tanachStudyUnitType = document.getElementById('studyUnitType').value;

    if (chaptersPerDayCheckbox.checked) {
        unitsPerDay = parseInt(document.getElementById('chaptersPerDayInput').value);
        if (unitsPerDay < 1) {
            alert(`Please enter a valid number of ${tanachStudyUnitType} per day`);
            return;
        }

        const startDateInput = document.getElementById('startDate');
        if (startDateInput && startDateInput.value) {
            startDate = flatpickr.parseDate(startDateInput.value, 'Y-m-d');
        } else {
            startDate = new Date(); // Default to today if no start date is provided
        }
    } else if (timeframeCheckbox.checked) {
        const startDateInput = document.getElementById('startDate');
        if (startDateInput && startDateInput.value) {
            startDate = flatpickr.parseDate(startDateInput.value, 'Y-m-d');
        } else {
            alert('Please enter a valid start date');
            return;
        }

        const endDateInput = document.getElementById('endDate');
        if (endDateInput && endDateInput.value) {
            endDate = flatpickr.parseDate(endDateInput.value, 'Y-m-d');
            if (startDate >= endDate) {
                alert('Please enter a valid end date that is after the start date');
                return;
            }
        } else {
            endDate = null; // End date is optional
        }
    } else {
        // Handle case where neither checkbox is checked
        alert('Please select either Units per day or Set timeframe');
        return;
    }

    // Get chapters or verses for the selected books
    let units = [];
    console.log('Tanach study unit type selected:', tanachStudyUnitType);

    if (tanachStudyUnitType === 'chapters') {
        units = getChaptersForSelection(tanachSelection, customBook, chidonDivision);
        console.log('Chapters retrieved:', units.length);
    } else if (tanachStudyUnitType === 'verses') {
        console.log('Retrieving verses for selection:', tanachSelection, 'custom book:', customBook, 'chidon division:', chidonDivision);
        units = getTanachVersesForSelection(tanachSelection, customBook, chidonDivision);
        console.log('Verses retrieved:', units.length, 'First few verses:', units.slice(0, 5));
    } else {
        console.error('Unknown study unit type:', tanachStudyUnitType);
    }

    if (units.length === 0) {
        console.error('No units found for selection');
        alert(`No ${tanachStudyUnitType} found for the selected books`);
        return;
    }

    // Generate the schedule
    console.log('About to generate schedule with:', {
        unitsCount: units.length,
        startDate: startDate.toDateString(),
        endDate: endDate ? endDate.toDateString() : 'none',
        unitsPerDay,
        selectedDays,
        studyUnitType: tanachStudyUnitType
    });
    const { schedule, chaptersInfo } = generateSchedule(units, startDate, endDate, unitsPerDay, selectedDays, tanachStudyUnitType);
    console.log('Schedule generated with', schedule.length, 'days');

    // Display the schedule
    displaySchedule(schedule, window.scheduleName, chaptersInfo);
}

/**
 * Generate a child's Tanach schedule (ages 5-10)
 */
function generateChildTanachSchedule() {
    // Get child's information
    const childName = document.getElementById('childName').value;
    if (!childName) {
        alert('Please enter the child\'s name');
        return;
    }

    const birthdateStr = document.getElementById('childBirthdate').value;
    if (!birthdateStr) {
        alert('Please enter the child\'s birth date');
        return;
    }

    const birthDate = parseDate(birthdateStr);
    if (!birthDate) {
        alert('Please enter a valid birth date');
        return;
    }

    // Get selected weekdays
    const selectedDays = [];
    document.querySelectorAll('.weekday:checked').forEach(checkbox => {
        selectedDays.push(parseInt(checkbox.value));
    });

    if (selectedDays.length === 0) {
        alert('Please select at least one day of the week for study');
        return;
    }

    // Format date for API call (YYYY-MM-DD)
    const birthYear = birthDate.getFullYear();
    const birthMonth = birthDate.getMonth() + 1; // JavaScript months are 0-indexed
    const birthDay = birthDate.getDate();
    const dateStr = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;

    // Get Hebrew date and calculate 5th and 10th Hebrew birthdays
    fetch(`https://www.hebcal.com/converter?cfg=json&date=${dateStr}&g2h=1`)
        .then(response => response.json())
        .then(data => {
            const hebrewYear = data.hy;
            const hebrewMonth = data.hm;
            const hebrewDay = data.hd;

            return Promise.all([
                fetch(`https://www.hebcal.com/converter?cfg=json&hy=${hebrewYear + 5}&hm=${hebrewMonth}&hd=${hebrewDay}&h2g=1`),
                fetch(`https://www.hebcal.com/converter?cfg=json&hy=${hebrewYear + 10}&hm=${hebrewMonth}&hd=${hebrewDay}&h2g=1`)
            ]);
        })
        .then(([fifthBirthdayResponse, tenthBirthdayResponse]) => {
            return Promise.all([
                fifthBirthdayResponse.json(),
                tenthBirthdayResponse.json()
            ]);
        })
        .then(([fifthBirthdayData, tenthBirthdayData]) => {
            const fifthBirthday = new Date(fifthBirthdayData.gy, fifthBirthdayData.gm - 1, fifthBirthdayData.gd);
            const tenthBirthday = new Date(tenthBirthdayData.gy, tenthBirthdayData.gm - 1, tenthBirthdayData.gd);

            let startDate = fifthBirthday;
            const today = new Date();
            const useCustom = document.getElementById('useCustomStartDate').checked;

            if (useCustom) {
                const customStartStr = document.getElementById('customStartDate').value;
                if (customStartStr) {
                    startDate = parseDate(customStartStr);
                    if (!startDate) {
                        alert('Please enter a valid custom start date');
                        return;
                    }
                }
            } else if ((today - birthDate) / (1000 * 60 * 60 * 24 * 365) >= 5) {
                startDate = today;
            }

            const verses = getTanachVersesForSelection('all');

            if (verses.length === 0) {
                alert('Error: Could not retrieve Tanach verses');
                return;
            }

            const scheduleName = `${childName}'s Tanach Schedule (Ages 5-10)`;

            // Call the existing generateSchedule function
            const { schedule, chaptersInfo } = generateSchedule(verses, startDate, tenthBirthday, null, selectedDays, 'verses');

            // Display the schedule
            displaySchedule(schedule, scheduleName, createChildScheduleInfoDiv(startDate, tenthBirthday, verses, chaptersInfo));
        })
        .catch(error => {
            console.error('Error calculating Hebrew dates:', error);
            alert(`Error calculating Hebrew dates: ${error.message}`);
        });
}

function createChildScheduleInfoDiv(startDate, endDate, verses, chaptersInfo) {
    const scheduleInfoDiv = document.createElement('div');
    scheduleInfoDiv.className = 'schedule-info';

    scheduleInfoDiv.innerHTML = `
        <h3>Schedule Information:</h3>
        <p><strong>Start Date:</strong> ${formatDateForDisplay(startDate)}</p>
        <p><strong>End Date (10th Hebrew birthday):</strong> ${formatDateForDisplay(endDate)}</p>
        <p><strong>Total Days:</strong> ${Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))}</p>
        <p><strong>Approximate Verses Per Day:</strong> ${Math.ceil(verses.length / chaptersInfo.totalDays)}</p>
    `;

    return scheduleInfoDiv;
}



/**
 * Generate a balanced schedule for children ages 5-10
 * This function creates a schedule that distributes Tanach verses over the period
 * between the start date and the child's 10th birthday
 * 
 * @param {Array} verses - Array of all Tanach verses
 * @param {Date} startDate - When to start the schedule
 * @param {Date} endDate - When to end the schedule (typically 10th birthday)
 * @param {Array} selectedDays - Array of days of the week to study (0-6)
 * @param {Boolean} saturdayEmphasis - Whether to assign more verses on Saturdays
 * @returns {Array} Schedule of daily readings
 */
function generateChildSchedule(verses, startDate, endDate, selectedDays, saturdayEmphasis) {
    // Sort selected days
    selectedDays.sort((a, b) => a - b);
    
    // Calculate total days between start and end dates
    const totalDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Calculate number of study days based on selected weekdays
    const studyDaysPerWeek = selectedDays.length;
    const totalStudyDays = Math.floor(totalDays * (studyDaysPerWeek / 7));
    
    // Create a balanced distribution of verses
    const schedule = [];
    let currentDate = new Date(startDate);
    let verseIndex = 0;
    
    // Get all verses as simple strings
    const verseStrings = verses.map(v => typeof v === 'string' ? v : `${v.book} ${v.chapter}:${v.verse}`);
    
    // Group verses by book to maintain context
    const versesByBook = {};
    verseStrings.forEach(verse => {
        const bookName = verse.split(' ')[0]; // Extract book name from verse reference
        if (!versesByBook[bookName]) {
            versesByBook[bookName] = [];
        }
        versesByBook[bookName].push(verse);
    });
    
    // Create a reading plan that progresses through books
    const books = Object.keys(versesByBook);
    const versesPerDay = Math.ceil(verseStrings.length / totalStudyDays);
    
    // Adjust verses per day for Saturday if emphasis is enabled
    const regularDayVerses = saturdayEmphasis ? 
        Math.ceil(verseStrings.length / (totalStudyDays + (Math.floor(totalDays / 7) * 2))) : 
        versesPerDay;
    const saturdayVerses = saturdayEmphasis ? regularDayVerses * 3 : regularDayVerses;
    
    // Create schedule
    while (verseIndex < verseStrings.length && currentDate < endDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Check if this is a selected study day
        if (selectedDays.includes(dayOfWeek)) {
            // Determine how many verses to read today
            const todayVerses = dayOfWeek === 6 && saturdayEmphasis ? 
                saturdayVerses : regularDayVerses;
            
            const dailyVerses = [];
            let versesNeeded = todayVerses;
            
            // Try to keep verses from the same book together
            for (let i = 0; i < books.length && versesNeeded > 0; i++) {
                const book = books[i];
                const bookVerses = versesByBook[book];
                
                if (bookVerses && bookVerses.length > 0) {
                    const versesToTake = Math.min(versesNeeded, bookVerses.length);
                    const versesForToday = bookVerses.splice(0, versesToTake);
                    dailyVerses.push(...versesForToday);
                    versesNeeded -= versesToTake;
                    
                    // Remove book from list if all verses are used
                    if (bookVerses.length === 0) {
                        delete versesByBook[book];
                    }
                }
            }
            
            if (dailyVerses.length > 0) {
                // Format for display in the schedule table
                schedule.push({
                    date: new Date(currentDate),
                    dayOfWeek: dayNames[dayOfWeek],
                    reading: dailyVerses,
                    completed: false
                });
                
                verseIndex += dailyVerses.length;
            }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return schedule;
}


/**
 * Generate Mishnayot study schedule
 */
function generateMishnayotSchedule() {
    // Get form values
    const name = document.getElementById('mishnayotName').value;
    if (!name) {
        alert('Please enter a name for the schedule');
        return;
    }
    
    const mishnayotSelection = document.getElementById('mishnayotSelection').value;
    let customSeder = null;
    let customTractates = [];
    
    if (mishnayotSelection === 'seder') {
        customSeder = document.getElementById('sederSelection').value;
        
        // Check if studying whole seder or specific tractates
        const studyWholeSeder = document.getElementById('studyWholeSeder').checked;
        if (!studyWholeSeder) {
            // Get selected tractates (multiple selection possible)
            const tractateSelect = document.getElementById('tractateSelection');
            for (let i = 0; i < tractateSelect.selectedOptions.length; i++) {
                customTractates.push(tractateSelect.selectedOptions[i].value);
            }
            
            console.log('Selected tractates:', customTractates);
            
            if (customTractates.length === 0) {
                alert('Please select at least one tractate');
                return;
            }
        }
    }
    
    // Get selected weekdays
    const selectedDays = [];
    document.querySelectorAll('.mishnayotWeekday:checked').forEach(checkbox => {
        selectedDays.push(parseInt(checkbox.value));
    });
    
    if (selectedDays.length === 0) {
        alert('Please select at least one day of the week for study');
        return;
    }
    
    // Get schedule type and related values
    const scheduleType = document.querySelector('input[name="mishnayotScheduleType"]:checked').value;
    let startDate, endDate, unitsPerDay;
    const mishnayotStudyUnitType = document.getElementById('mishnayotStudyUnitType').value;
    
    if (scheduleType === 'chaptersPerDay') {
        unitsPerDay = parseInt(document.getElementById('mishnayotChaptersPerDayInput').value);
        if (unitsPerDay < 1) {
            alert(`Please enter a valid number of ${mishnayotStudyUnitType === 'chapters' ? 'chapters' : 'Mishnayot'} per day`);
            return;
        }
        
        // Parse the date string correctly to avoid timezone issues
        const startDateStr = document.getElementById('mishnayotStartDate').value;
        startDate = startDateStr ? parseDate(startDateStr) : new Date();
        // End date will be calculated based on chapters per day
    } else {
        const startDateStr = document.getElementById('mishnayotStartDate').value;
        startDate = parseDate(startDateStr);
        
        if (!startDate) {
            alert('Please enter a valid start date');
            return;
        }
        
        // Check if end date is provided
        const endDateStr = document.getElementById('mishnayotEndDate').value;
        if (endDateStr && endDateStr.trim() !== '') {
            endDate = parseDate(endDateStr);
            
            if (!endDate || startDate >= endDate) {
                alert('Please enter a valid end date that is after the start date');
                return;
            }
        } else {
            // If no end date is specified, set end date to start date (complete all on start date)
            endDate = new Date(startDate);
        }
    }
    
    // Get chapters or individual mishnayot for the selected tractates
    console.log('Generating schedule with:', { mishnayotSelection, customSeder, customTractates, studyWholeSeder: document.getElementById('studyWholeSeder').checked, mishnayotStudyUnitType });
    
    let units = [];
    if (mishnayotStudyUnitType === 'chapters') {
        units = getMishnayotChaptersForSelection(mishnayotSelection, customSeder, customTractates);
    } else if (mishnayotStudyUnitType === 'mishnayot') {
        units = getMishnayotIndividualForSelection(mishnayotSelection, customSeder, customTractates);
    }
    
    console.log(`${mishnayotStudyUnitType} generated:`, units.length);
    
    if (units.length === 0) {
        alert(`No ${mishnayotStudyUnitType} found for the selected tractates`);
        return;
    }
    
    // Generate the schedule
    console.log('About to generate Mishnayot schedule with:', {
        unitsCount: units.length,
        startDate: startDate.toDateString(),
        endDate: endDate ? endDate.toDateString() : 'none',
        unitsPerDay,
        selectedDays,
        studyUnitType: mishnayotStudyUnitType
    });
    const { schedule, chaptersInfo } = generateSchedule(units, startDate, endDate, unitsPerDay, selectedDays, mishnayotStudyUnitType);
    console.log('Mishnayot schedule generated with', schedule.length, 'days');
    
    // Display the schedule
    displaySchedule(schedule, window.scheduleName, chaptersInfo);
}

/**
 * Generate a study schedule based on parameters
 */
function generateSchedule(units, startDate, endDate, unitsPerDay, selectedDays, studyUnitType = 'chapters') {
    console.log('generateSchedule called with:', {
        unitsLength: units.length,
        startDate: startDate.toDateString(),
        endDate: endDate ? endDate.toDateString() : 'none',
        unitsPerDay,
        selectedDays: selectedDays.join(',')
    });

    const schedule = [];
    let currentDate = new Date(startDate);
    let remainingUnits = [...units];
    let chaptersInfo = {
        totalChapters: units.length,
        totalDays: countStudyDays(startDate, endDate, selectedDays),
        chaptersPerDay: 0,
        studyUnitType: typeof studyUnitType === 'string' ? studyUnitType : 'chapters'
    };

    if (endDate) {
        chaptersInfo.chaptersPerDay = Math.ceil(units.length / chaptersInfo.totalDays);
    } else {
        chaptersInfo.chaptersPerDay = unitsPerDay;
        endDate = calculateEndDate(startDate, units.length, unitsPerDay, selectedDays);
    }

    // Generate schedule entries
    while (currentDate <= endDate && remainingUnits.length > 0) {
        const dayOfWeek = currentDate.getDay();

        if (selectedDays.includes(dayOfWeek)) {
            let dailyUnits;

            if (unitsPerDay) {
                dailyUnits = remainingUnits.slice(0, unitsPerDay);
                remainingUnits = remainingUnits.slice(unitsPerDay);
            } else {
                const daysLeft = countStudyDays(currentDate, endDate, selectedDays);
                if (daysLeft <= 0) break;

                const unitsPerDayDynamic = Math.ceil(remainingUnits.length / daysLeft);
                dailyUnits = remainingUnits.slice(0, unitsPerDayDynamic);
                remainingUnits = remainingUnits.slice(unitsPerDayDynamic);
            }

            if (dailyUnits.length > 0) {
                schedule.push({
                    date: new Date(currentDate),
                    dayOfWeek: getDayName(dayOfWeek),
                    reading: dailyUnits
                });
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    console.log(`Returning schedule with ${schedule.length} days`);
    return { schedule, chaptersInfo };
}

function calculateEndDate(startDate, totalUnits, unitsPerDay, selectedDays) {
    let estimatedEndDate = new Date(startDate);
    let studyDaysFound = 0;
    const totalDays = Math.ceil(totalUnits / unitsPerDay);

    while (studyDaysFound < totalDays) {
        if (selectedDays.includes(estimatedEndDate.getDay())) {
            studyDaysFound++;
        }
        if (studyDaysFound < totalDays) {
            estimatedEndDate.setDate(estimatedEndDate.getDate() + 1);
        }
    }
    return new Date(estimatedEndDate);
}

/**
 * Count the number of study days between two dates
 */
function countStudyDays(startDate, endDate, selectedDays) {
    let count = 0;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        if (selectedDays.includes(currentDate.getDay())) {
            count++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
}

/**
 * Get day name from day number
 */
function getDayName(dayNumber) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date for display in a more readable format
 */
function formatDateForDisplay(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return `${date.toLocaleDateString()}`;
}

/**
 * Format date in Hebrew format
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string with Hebrew month names
 */
function formatHebrewDate(date) {
    if (!(date instanceof Date)) date = new Date(date);
    const day = date.getDate();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed, but our array is 1-indexed
    const year = date.getFullYear();
    return `${day} ${hebrewGregorianMonths[month]} ${year}`;
}

/**
 * Get Hebrew name for a day of week
 * @param {number} dayNum - Day number (0-6, where 0 is Sunday)
 * @returns {string} - Hebrew day name
 */
function getHebrewDayName(dayNum) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return hebrewDays[days[dayNum]] || days[dayNum];
}

/**
 * Get Hebrew month name (transliterated to English or in Hebrew based on current language)
 * @param {number|string} monthInput - Hebrew month number (1-13) or month name string
 * @returns {string} - Hebrew month name in the appropriate language
 */
function getHebrewMonthName(monthInput) {
    console.log('getHebrewMonthName called with:', monthInput, 'currentLang:', currentLang);
    
    // Month name mapping
    const englishNames = {
        1: 'Nisan', 2: 'Iyyar', 3: 'Sivan', 4: 'Tamuz', 5: 'Av', 6: 'Elul',
        7: 'Tishrei', 8: 'Cheshvan', 9: 'Kislev', 10: 'Tevet', 11: "Sh'vat", 12: 'Adar', 13: 'Adar II',
        'Nisan': 'Nisan', 'Iyyar': 'Iyyar', 'Sivan': 'Sivan', 'Tamuz': 'Tamuz', 'Av': 'Av', 'Elul': 'Elul',
        'Tishrei': 'Tishrei', 'Cheshvan': 'Cheshvan', 'Kislev': 'Kislev', 'Tevet': 'Tevet', "Sh'vat": "Sh'vat", 'Adar': 'Adar', 'Adar II': 'Adar II',
        // Add non-standard spellings that might come from the API
        'Shvat': "Sh'vat", 'Iyar': 'Iyyar'
    };
    
    const hebrewNames = {
        1: 'ניסן', 2: 'אייר', 3: 'סיון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
        7: 'תשרי', 8: 'חשון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב',
        'Nisan': 'ניסן', 'Iyyar': 'אייר', 'Sivan': 'סיון', 'Tamuz': 'תמוז', 'Av': 'אב', 'Elul': 'אלול',
        'Tishrei': 'תשרי', 'Cheshvan': 'חשון', 'Kislev': 'כסלו', 'Tevet': 'טבת', "Sh'vat": 'שבט', 'Adar': 'אדר', 'Adar II': 'אדר ב',
        // Add non-standard spellings that might come from the API
        'Shvat': 'שבט', 'Iyar': 'אייר'
    };
    
    // Add more detailed debugging
    console.log('Looking up Hebrew name for:', monthInput); 
    console.log('Hebrew name lookup result:', hebrewNames[monthInput]);
    
    // When in Hebrew mode, return the Hebrew name
    if (currentLang === LANG.HE) {
        console.log('In Hebrew mode, returning Hebrew name');
        // First, normalize the month name to handle variations
        let normalizedMonthInput = monthInput;
        if (monthInput === 'Iyar') normalizedMonthInput = 'Iyyar';
        if (monthInput === 'Shvat') normalizedMonthInput = "Sh'vat";
        
        // Check if we have a direct mapping for the normalized name
        if (hebrewNames[normalizedMonthInput]) {
            console.log('Found direct Hebrew mapping for:', normalizedMonthInput, '->', hebrewNames[normalizedMonthInput]);
            return hebrewNames[normalizedMonthInput];
        }
        
        // If no direct mapping, try the individual checks
        if (normalizedMonthInput === 'Sivan') return 'סיון';
        if (normalizedMonthInput === 'Nisan') return 'ניסן';
        if (normalizedMonthInput === 'Iyyar') return 'אייר';
        if (normalizedMonthInput === 'Tamuz') return 'תמוז';
        if (normalizedMonthInput === 'Av') return 'אב';
        if (normalizedMonthInput === 'Elul') return 'אלול';
        if (normalizedMonthInput === 'Tishrei') return 'תשרי';
        if (normalizedMonthInput === 'Cheshvan') return 'חשון';
        if (normalizedMonthInput === 'Kislev') return 'כסלו';
        if (normalizedMonthInput === 'Tevet') return 'טבת';
        if (normalizedMonthInput === "Sh'vat") return 'שבט';
        if (normalizedMonthInput === 'Adar') return 'אדר';
        if (normalizedMonthInput === 'Adar II') return 'אדר ב';
        
        // If the direct lookup didn't work, try the explicit mapping above
        return hebrewNames[monthInput] || monthInput;
    } else {
        // In English mode, return the transliterated name
        return englishNames[monthInput] || monthInput;
    }
}

/**
 * Updates date cell text with Hebrew date information
 * @param {HTMLElement} cell - The date cell to update
 * @param {Date} gregDate - Gregorian date
 * @param {Object} hebrewDateData - Hebrew date data from Hebcal API
 * @param {string} entryId - The ID of the schedule entry
 */
function updateDateCellText(cell, gregDate, hebrewDateData, entryId) {
    // Don't update if the cell is no longer in the DOM
    if (!cell.isConnected) return;
    
    // Clear existing content
    while (cell.firstChild) {
        cell.removeChild(cell.firstChild);
    }
    
    // Add the Gregorian date in current language format
    const gregDateText = document.createElement('div');
    gregDateText.className = 'gregorian-date'; // Add class for styling
    gregDateText.textContent = currentLang === LANG.HE ? formatHebrewDate(gregDate) : formatDateForDisplay(gregDate);
    if (currentLang === LANG.HE) {
        gregDateText.dir = 'rtl';
    }
    cell.appendChild(gregDateText);
    
    // Add the Hebrew date
    const hebrewDateDiv = document.createElement('div');
    hebrewDateDiv.className = currentLang === LANG.HE ? 'hebrew-date' : 'hebrew-date-english';
    
    if (currentLang === LANG.HE) {
        hebrewDateDiv.dir = 'rtl';
        hebrewDateDiv.textContent = formatHebrew(hebrewDateData);
    } else {
        hebrewDateDiv.textContent = `${hebrewDateData.hd} ${getHebrewMonthName(hebrewDateData.hm)} ${hebrewDateData.hy}`;
    }
    
    cell.appendChild(hebrewDateDiv);
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get Hebrew month name from Hebcal API response
 * This function is designed to work with the Hebcal API v2 response format
 */
function getHebrewMonthName(data) {
    // If data is a string, it's already a month name
    if (typeof data === 'string') {
        return data;
    }
    
    // If data is not an object, return Unknown
    if (!data || typeof data !== 'object') {
        return 'Unknown';
    }
    
    // Log the data for debugging
    console.log('Getting Hebrew month name from:', data);
    
    // Direct approach: If hm is a string, use it (this is the most reliable source)
    if (data.hm && typeof data.hm === 'string') {
        return data.hm;
    }
    
    // If we have heDateParts, use it (this is available in newer API responses)
    if (data.heDateParts && data.heDateParts.m) {
        return data.heDateParts.m;
    }
    
    // If we have a month number in hm, map it to a name
    if (data.hm && typeof data.hm === 'number') {
        const hebrewMonths = {
            1: 'Nisan', 2: 'Iyyar', 3: 'Sivan', 4: 'Tamuz', 5: 'Av', 6: 'Elul',
            7: 'Tishrei', 8: 'Cheshvan', 9: 'Kislev', 10: 'Tevet', 11: "Sh'vat", 12: 'Adar', 13: 'Adar II'
        };
        return hebrewMonths[data.hm] || 'Unknown';
    }
    
    // Last resort: Try to extract from the Hebrew date string
    if (data.hebrew) {
        try {
            // Hebrew date format is typically like: כ״ז בַּאֲדָר א׳ תשפ״ד
            // Split by spaces and get the second part (the month with prefix)
            const parts = data.hebrew.split(' ');
            if (parts.length >= 2) {
                // The month is the second part, sometimes with a prefix ב
                let monthPart = parts[1];
                // Remove the prefix if present (like בַּ)
                if (monthPart.startsWith('בַּ') || monthPart.startsWith('בְּ')) {
                    monthPart = monthPart.substring(2);
                }
                return monthPart;
            }
        } catch (e) {
            console.error('Error extracting month from Hebrew date:', e);
        }
    }
    
    // If all else fails
    return 'Unknown';
}

/**
 * Display the generated schedule in the UI
 */
// Add better styling for the schedule table
function addScheduleTableStyles() {
    // Check if styles already exist
    if (document.getElementById('scheduleTableStyles')) {
        return;
    }

    // Create style element
    const styleEl = document.createElement('style');
    styleEl.id = 'scheduleTableStyles';
    styleEl.textContent = `
        #schedulePreview {
            overflow-x: auto;
            margin-top: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 12px;
            background-color: #ffffff;
            margin-bottom: 2rem;
        }
        
        #scheduleTable {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: 12px;
            overflow: hidden;
            font-size: 16px;
            border: 1px solid #e0e0e0;
        }
        
        #scheduleTable th {
            background-color: #f0f5ff;
            color: #103a9e; /* Darker blue for better contrast and readability */
            padding: 16px 20px;
            font-weight: 600;
            text-align: left;
            border-bottom: 2px solid #d4e3ff;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        #scheduleTable td {
            padding: 16px 20px;
            vertical-align: top;
            border-bottom: 1px solid #e9ecef;
            line-height: 1.5;
        }
        
        #scheduleTable tr:last-child td {
            border-bottom: none;
        }
        
        #scheduleTable tr:nth-child(even) {
            background-color: #f9fafc;
        }
        
        #scheduleTable tr:hover {
            background-color: #f0f7ff;
        }
        
        /* Specific cell styling */
        .date-cell {
            font-weight: 500;
        }
        
        /* Date column styling */
        #scheduleTable td:first-child {
            font-weight: 700;
            color: #000000 !important;
            background-color: #f8f9fa;
        }
        
        /* Day of week column - EXTRA DARK */
        #scheduleTable .day-cell {
            min-width: 100px;
            color: #000000; /* Pure black for maximum contrast */
            font-weight: 700; /* Bold for better visibility */
        }
        
        .reading-cell {
            min-width: 150px;
            color: #000000;
        }
        
        /* Gregorian date styling - EXTRA DARK */
        .gregorian-date {
            color: #000000;
            font-size: 16px;
            font-weight: 800;
            display: block;
            margin-bottom: 6px;
        }
        
        /* Hebrew date styling - EXTRA DARK */
        .hebrew-date, .hebrew-date-english {
            margin-top: 8px;
            font-size: 15px;
            color: #000000; /* Pure black for maximum contrast */
            font-weight: 700; /* Bold for better visibility */
            padding-top: 4px;
            border-top: 1px solid #666; /* Darker border for better visibility */
            display: block;
        }
        
        /* Study days styling - EXTRA DARK */
        #studyDaysHeader { 
            color: #000000 !important; 
            font-weight: 700 !important; 
        }
        .study-day-label { 
            color: #000000 !important; 
            font-weight: 700 !important; 
        }
        
        /* Language toggle button styling */
        #langToggleBtn {
            margin-bottom: 1rem;
        }
        
        /* RTL support for Hebrew mode */
        body[data-lang="he"] #scheduleTable th { text-align: right !important; }
        body[data-lang="he"] #scheduleTable td.day-cell { text-align: right !important; }
        body[data-lang="he"] #scheduleTable td.reading-cell { text-align: right !important; }
        @media (max-width: 768px) {
            #scheduleTable {
                font-size: 15px;
            }
            
            #scheduleTable th {
                padding: 14px 16px;
            }
            
            #scheduleTable td {
                padding: 12px 16px;
            }
            
            .date-cell {
                min-width: 120px;
            }
            
            .day-cell {
                min-width: 80px;
            }
        }
        
        @media (max-width: 640px) {
            #scheduleTable {
                font-size: 14px;
            }
            
            #scheduleTable th, #scheduleTable td {
                padding: 10px 12px;
            }
        }
        
        /* Very small screens */
        @media (max-width: 480px) {
            #scheduleTable {
                font-size: 13px;
            }
            
            #scheduleTable th {
                font-size: 13px;
                padding: 8px 10px;
            }
            
            #scheduleTable td {
                padding: 10px;
            }
            
            /* Keep dates readable on mobile */
            .gregorian-date {
                font-size: 15px;
                font-weight: 700;
            }
            
            .hebrew-date, .hebrew-date-english {
                font-size: 13px;
                font-weight: 700;
                color: #000000;
            }
            
            /* Compact view for date and day */
            .date-cell, .day-cell {
                padding-bottom: 4px;
            }
            
            .reading-cell {
                padding-top: 8px;
            }
        }
    `;
    document.head.appendChild(styleEl);
}

function displaySchedule(schedule, name, additionalInfo = null) {
    // Apply custom styling to the schedule table
    addScheduleTableStyles();
    
    // Add emergency style override for maximum visibility
    const emergencyStyle = document.createElement('style');
    emergencyStyle.innerHTML = `
        #scheduleTable th { color: #000000 !important; font-weight: 700 !important; }
        #scheduleTable td { color: #000000 !important; font-weight: 600 !important; }
        #scheduleTable .gregorian-date { color: #000000 !important; font-weight: 900 !important; }
        #scheduleTable .hebrew-date, .hebrew-date-english { color: #000000 !important; font-weight: 800 !important; }
        #scheduleTable .day-cell { color: #000000 !important; font-weight: 800 !important; }
        /* Day names - extremely high contrast */
        #scheduleTable td.day-cell { color: #000000 !important; font-weight: 800 !important; text-shadow: 0 0 0.5px rgba(0,0,0,0.5) !important; }
        /* Extra specificity for day names */
        tr td.day-cell { color: #000000 !important; font-weight: 800 !important; }
        /* Force text color on span inside day cell if any */
        td.day-cell > span, td.day-cell > div { color: #000000 !important; font-weight: 800 !important; }
        /* Study days */
        #studyDaysHeader { color: #000 !important; font-weight: 800 !important; }
        .study-day-label { color: #000 !important; font-weight: 700 !important; }
        /* Weekday selector black text - MAXIMUM SPECIFICITY AND !IMPORTANT FLAGS */
        .weekday-selector label, div.weekday-selector label, form .weekday-selector label { 
            color: #000000 !important; 
            font-weight: 700 !important; 
            text-shadow: 0 0 0.5px rgba(0,0,0,0.3) !important;
        }
        /* All form labels should be dark */
        label, form label { 
            color: #000000 !important; 
            font-weight: 600 !important;
        }
        /* Direct style for checkbox labels */
        input[type="checkbox"] + label, label > input[type="checkbox"] { 
            color: #000000 !important;
        }
    `;
    document.head.appendChild(emergencyStyle);
    
    // Force black text on weekday selectors and all labels
    if (typeof forceBlackText === 'function') {
        forceBlackText();
        setTimeout(forceBlackText, 300);
    }
    
    // Set the proper language attribute on the body for CSS selectors
    if (TorahData.currentLang() === TorahData.LANG.HE) {
        document.body.setAttribute('data-lang', 'he');
    } else {
        document.body.setAttribute('data-lang', 'en');
    }
    
    // Store the schedule in window.currentSchedule
    window.currentSchedule = schedule;
    if (name) window.scheduleName = name;
    
    // Debug logging
    console.log("✅ Setting window.currentSchedule:", window.currentSchedule);
    console.log("✅ Setting window.scheduleName:", window.scheduleName);
    
    // Add a language toggle button if it doesn't exist
    const resultSection = document.getElementById('resultSection');
    let langToggleBtn = document.getElementById('langToggleBtn');
    if (!langToggleBtn) {
        langToggleBtn = document.createElement('button');
        langToggleBtn.id = 'langToggleBtn';
        langToggleBtn.className = 'btn btn-secondary mb-3';
        langToggleBtn.textContent = currentLang === LANG.EN ? 'עברית' : 'English';
        langToggleBtn.onclick = function() {
            toggleLanguage();
            // Update button text after toggling language
            this.textContent = currentLang === LANG.EN ? 'עברית' : 'English';
            displaySchedule(window.currentSchedule, window.scheduleName, additionalInfo);
        };
        resultSection.insertBefore(langToggleBtn, resultSection.firstChild);
    }
    
    // Global variables for schedule data
    let hebrewSourceTexts = {};
    let scheduleRefs = [];
    let scheduleDays = [];
    let scheduleInfos = [];
    let scheduleNotes = [];
    let scheduleDayNames = [];

    const tableBody = document.getElementById('scheduleTableBody');
    tableBody.innerHTML = '';

    const today = new Date();
    const todayFormatted = today.toLocaleDateString('en-CA');

    let todayReferences = [];

    console.log(`📅 Local Time: ${today.toString()}`);
    console.log(`📅 Local Formatted Date (YYYY-MM-DD): ${todayFormatted}`);

    // Create a map to store books and their occurrences (for LaTeX export only)
    const booksInSchedule = new Map();
    
    // Collect all unique books and their positions
    schedule.forEach((entry, index) => {
        entry.reading.forEach(item => {
            // Extract book name (before any chapter numbers)
            const bookName = item.split(' ')[0];
            if (!booksInSchedule.has(bookName)) {
                booksInSchedule.set(bookName, []);
            }
            booksInSchedule.get(bookName).push(index);
        });
    });
    
    // Display the schedule
    schedule.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.id = 'schedule-row-' + index; // Add ID for TOC linking
        
        // Highlight today's date
        const isToday = new Date(entry.date).toLocaleDateString('en-CA') === todayFormatted;
        if (isToday) {
            row.classList.add('today-row');
        }

        const dateCell = document.createElement('td');
        dateCell.className = 'date-cell';
        const date = new Date(entry.date);
        
        // Fetch Hebrew date information
        if (!entry.hebrewDate) {
            // Store date string in YYYY-MM-DD format for API call
            const dateStr = date.toISOString().split('T')[0];
            
            // Fetch Hebrew date data asynchronously
            fetch(`https://www.hebcal.com/converter?cfg=json&date=${dateStr}&g2h=1`)
                .then(response => response.json())
                .then(data => {
                    // Store Hebrew date info on the entry for future reference
                    entry.hebrewDate = data;
                    
                    // Update the cell text once we have the Hebrew date
                    updateDateCellText(dateCell, date, data, entry.id);
                })
                .catch(error => console.error('Error fetching Hebrew date:', error));
        }
        
        // Format date based on the current language
        if (currentLang === LANG.HE) {
            // Use Hebrew date format for Gregorian date
            dateCell.textContent = formatHebrewDate(date);
            dateCell.dir = 'rtl'; // Right-to-left for Hebrew
            
            // If we already have Hebrew date info, display it
            if (entry.hebrewDate) {
                const hebrewDateDisplay = document.createElement('div');
                hebrewDateDisplay.className = 'hebrew-date';
                hebrewDateDisplay.dir = 'rtl';
                // Extract Hebrew date components
                const hebDay = entry.hebrewDate.hd;
                // Get the month name from the API response - it returns the Hebrew month name in English
                const hebMonthEnglish = entry.hebrewDate.hm;
                const hebYear = entry.hebrewDate.hy;
                
                // Direct mapping of English month names to Hebrew script
                let hebrewMonthName;
                // Normalize month name first
                let normalizedMonthName = hebMonthEnglish;
                if (hebMonthEnglish === 'Iyar' || hebMonthEnglish === 'Iyyar') normalizedMonthName = 'Iyyar';
                if (hebMonthEnglish === 'Shvat' || hebMonthEnglish === "Sh'vat") normalizedMonthName = "Sh'vat";
                
                switch(normalizedMonthName) {
                    case 'Nisan': hebrewMonthName = 'ניסן'; break;
                    case 'Iyyar': hebrewMonthName = 'אייר'; break;
                    case 'Sivan': hebrewMonthName = 'סיון'; break;
                    case 'Tamuz': hebrewMonthName = 'תמוז'; break;
                    case 'Av': hebrewMonthName = 'אב'; break;
                    case 'Elul': hebrewMonthName = 'אלול'; break;
                    case 'Tishrei': hebrewMonthName = 'תשרי'; break;
                    case 'Cheshvan': hebrewMonthName = 'חשון'; break;
                    case 'Kislev': hebrewMonthName = 'כסלו'; break;
                    case 'Tevet': hebrewMonthName = 'טבת'; break;
                    case "Sh'vat": hebrewMonthName = 'שבט'; break;
                    case 'Adar': hebrewMonthName = 'אדר'; break;
                    case 'Adar II': hebrewMonthName = 'אדר ב'; break;
                    default: hebrewMonthName = hebMonthEnglish;
                }
                
                console.log('Hebrew Mode - Month from API:', hebMonthEnglish);
                console.log('Hebrew Mode - Direct Hebrew mapping:', hebrewMonthName);
                console.log('Hebrew Mode - Current language:', currentLang);
                
                hebrewDateDisplay.textContent = `${hebDay} ${hebrewMonthName} ${hebYear}`;
                dateCell.appendChild(hebrewDateDisplay);
            }
        } else {
            dateCell.textContent = formatDateForDisplay(date);
            
            // If we have Hebrew date info, display it in English transliteration
            if (entry.hebrewDate) {
                const hebrewDateDisplay = document.createElement('div');
                hebrewDateDisplay.className = 'hebrew-date-english';
                
                // Extract Hebrew date components
                const hebDay = entry.hebrewDate.hd;
                const hebMonthEnglish = entry.hebrewDate.hm;
                const hebYear = entry.hebrewDate.hy;
                
                // In English mode, we use the English transliteration directly
                // The API already returns proper English transliteration
                console.log('English Mode - Month from API:', hebMonthEnglish);
                
                hebrewDateDisplay.textContent = `${hebDay} ${hebMonthEnglish} ${hebYear}`;
                dateCell.appendChild(hebrewDateDisplay);
            }
        }
        row.appendChild(dateCell);

        // Day cell
        const dayCell = document.createElement('td');
        dayCell.className = 'day-cell';
        
        // Create a strongly styled day name element with inline styling for maximum contrast
        const strongDayName = document.createElement('strong');
        strongDayName.style.color = '#000000'; // Pure black
        strongDayName.style.fontWeight = '800'; // Extra bold
        
        // Get the day of week index (0 = Sunday, 1 = Monday, etc)
        const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            .indexOf(entry.dayOfWeek);
        
        // Format day of week based on language
        if (currentLang === LANG.HE) {
            const hebrewDays = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
            strongDayName.textContent = hebrewDays[dayIndex];
            dayCell.dir = 'rtl'; // Right-to-left for Hebrew
        } else {
            strongDayName.textContent = entry.dayOfWeek;
        }
        
        // Add the styled element to the cell
        dayCell.appendChild(strongDayName);
        if (currentLang === LANG.HE) {
            dayCell.dir = 'rtl'; // Right-to-left for Hebrew
        }
        row.appendChild(dayCell);
        
        // Ensure the day name text is pure black with strong contrast
        // This fixes Sunday, Monday, Tuesday, etc. appearing light
        if (dayCell.textContent) {
            dayCell.style.color = '#000000';
            dayCell.style.fontWeight = '700';
        }
        
        const readingCell = document.createElement('td');
        readingCell.className = 'reading-cell';
        // If in Hebrew mode, try to use Hebrew book names
        if (currentLang === LANG.HE) {
            const hebrewReadings = entry.reading.map(item => {
                // Extract book name and reference parts properly to handle Roman numerals
                // Match the book name pattern (e.g., "I Samuel", "II Kings", etc.)
                const match = item.match(/^((?:I|II|III|IV|1|2|3|4|Song of Songs|[A-Za-z]+)(?: [A-Za-z]+)*) (.+)$/);
                if (match) {
                    const fullBookName = match[1]; // Complete book name including Roman numerals
                    const reference = match[2];   // Chapter and verse reference
                    
                    // Use the helper function to get the Hebrew book name
                    const hebrewName = getHebrewBookName(fullBookName);
                    console.log(`Converting book: [${fullBookName}] to Hebrew: [${hebrewName}]`);
                    
                    return `${hebrewName} ${reference}`;
                }
                // Fallback if match fails
                return item;
            });
            readingCell.textContent = hebrewReadings.join(', ');
            readingCell.dir = 'rtl'; // Right-to-left for Hebrew
        } else {
            readingCell.textContent = entry.reading.join(', ');
        }
        row.appendChild(readingCell);

        tableBody.appendChild(row);

        const entryDateFormatted = new Date(entry.date).toLocaleDateString('en-CA'); 

        if (entryDateFormatted === todayFormatted) {
            todayReferences = todayReferences.concat(entry.reading);
        }
    });

    console.log(`✅ Today's References (${todayFormatted}):`, todayReferences);

    // Update table headers based on language
    const dateHeader = document.querySelector('#scheduleTable th:nth-child(1)');
    const dayHeader = document.querySelector('#scheduleTable th:nth-child(2)');
    const readingHeader = document.querySelector('#scheduleTable th:nth-child(3)');
    
    if (dateHeader && dayHeader && readingHeader) {
        dateHeader.textContent = localise('Date', 'תאריך');
        dayHeader.textContent = localise('Day', 'יום');
        readingHeader.textContent = localise('Reading', 'קריאה');
        
        // Set RTL direction for Hebrew headers
        if (currentLang === LANG.HE) {
            dateHeader.dir = 'rtl';
            dayHeader.dir = 'rtl';
            readingHeader.dir = 'rtl';
        } else {
            dateHeader.dir = 'ltr';
            dayHeader.dir = 'ltr';
            readingHeader.dir = 'ltr';
        }
    }
    
    // Update header and download buttons text
    const resultHeader = document.querySelector('#resultSection h2');
    if (resultHeader) {
        resultHeader.textContent = localise('Your Schedule', 'לוח הזמנים שלך');
        if (currentLang === LANG.HE) {
            resultHeader.dir = 'rtl';
        } else {
            resultHeader.dir = 'ltr';
        }
    }
    
    // Update download buttons
    const csvBtn = document.getElementById('downloadCsvBtn');
    const icsBtn = document.getElementById('downloadIcsBtn');
    const latexBtn = document.getElementById('downloadLatexBtn');
    
    if (csvBtn) csvBtn.textContent = localise('Download CSV', 'הורד CSV');
    if (icsBtn) icsBtn.textContent = localise('Download ICS', 'הורד ICS');
    if (latexBtn) latexBtn.textContent = localise('Download LaTeX', 'הורד LaTeX');
    
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });

    if (todayReferences.length > 0) {
        fetchLearningOfTheDay(todayReferences);
    } else {
        console.warn('⚠️ No readings scheduled for today.');
        document.getElementById('learningContent').innerHTML = '<p>No scheduled readings for today.</p>';
    }

    console.log('💾 Schedule stored in window.currentSchedule:', window.currentSchedule);
    console.log('🏷️ Schedule name stored:', window.scheduleName);
}

/**
 * Helper function to find Hebrew names for Tanach books
 * @param {string} bookName - English book name
 * @returns {string} - Hebrew book name or original if not found
 */
function getHebrewBookName(bookName) {
    // Direct mapping for books with Roman numerals and special cases
    const directMapping = {
        'I Samuel': 'שמואל א',
        '1 Samuel': 'שמואל א',
        'II Samuel': 'שמואל ב',
        '2 Samuel': 'שמואל ב',
        'I Kings': 'מלכים א',
        '1 Kings': 'מלכים א',
        'II Kings': 'מלכים ב',
        '2 Kings': 'מלכים ב',
        'Song of Songs': 'שיר השירים',
        'I Chronicles': 'דברי הימים א',
        '1 Chronicles': 'דברי הימים א',
        'II Chronicles': 'דברי הימים ב',
        '2 Chronicles': 'דברי הימים ב',
        'Genesis': 'בראשית',
        'Exodus': 'שמות', 
        'Leviticus': 'ויקרא',
        'Numbers': 'במדבר',
        'Deuteronomy': 'דברים',
        'Joshua': 'יהושע',
        'Judges': 'שופטים',
        'Ruth': 'רות',
        'Isaiah': 'ישעיהו',
        'Jeremiah': 'ירמיהו',
        'Lamentations': 'איכה',
        'Ezekiel': 'יחזקאל',
        'Daniel': 'דניאל',
        'Hosea': 'הושע',
        'Joel': 'יואל',
        'Amos': 'עמוס',
        'Obadiah': 'עובדיה',
        'Jonah': 'יונה',
        'Micah': 'מיכה',
        'Nahum': 'נחום',
        'Habakkuk': 'חבקוק',
        'Zephaniah': 'צפניה',
        'Haggai': 'חגי',
        'Zechariah': 'זכריה',
        'Malachi': 'מלאכי',
        'Psalms': 'תהלים',
        'Proverbs': 'משלי',
        'Job': 'איוב',
        'Ecclesiastes': 'קהלת',
        'Esther': 'אסתר',
        'Ezra': 'עזרא',
        'Nehemiah': 'נחמיה'
    };
    
    // First check our direct mapping for known problematic cases
    if (directMapping[bookName]) {
        console.log(`Found direct Hebrew mapping for book: ${bookName} -> ${directMapping[bookName]}`);
        return directMapping[bookName];
    }
    
    // If not found in direct mapping, continue with the original approach
    let hebrewName = bookName;
    
    // Check in tanachData object
    for (const category of ['torah', 'neviim', 'ketuvim']) {
        if (tanachData[category]) {
            for (const book of tanachData[category]) {
                if (book.name === bookName && book.hebrewName) {
                    hebrewName = book.hebrewName;
                    return hebrewName;
                }
            }
        }
    }
    
    // Check in chidon data
    for (const division of [chidonData.middleSchool, chidonData.highSchool]) {
        if (division && division.getAllBooks) {
            for (const book of division.getAllBooks()) {
                if (book.name === bookName && book.hebrewName) {
                    hebrewName = book.hebrewName;
                    return hebrewName;
                }
            }
        }
    }
    
    return hebrewName;
}

/**
 * Download the schedule as a CSV file
 */
function downloadScheduleCSV() {
    console.log("📥 Attempting to download CSV...");

    // Check if window.currentSchedule exists
    if (!window.currentSchedule || window.currentSchedule.length === 0) {
        console.warn("⚠️ No schedule found! Cannot download.");
        console.log("🔍 Debug Info - window.currentSchedule:", window.currentSchedule);
        alert('No schedule to download');
        return;
    }

    console.log("✅ Schedule found! Preparing CSV...");
    console.log("📅 Current Schedule:", window.currentSchedule);
    
    const csvContent = [
        'Date,Day of Week,Reading',
        ...window.currentSchedule.map(entry => {
            return `${formatDate(entry.date)},${entry.dayOfWeek},"${entry.reading.join(', ')}"`;  
        })
    ].join('\n');

    console.log("📜 Generated CSV Content:\n", csvContent);

    downloadFile(csvContent, `${window.scheduleName}_schedule.csv`, 'text/csv');
}

function downloadScheduleICS() {
    console.log("📥 Attempting to download ICS...");

    if (!window.currentSchedule || window.currentSchedule.length === 0) {
        console.warn("⚠️ No schedule found! Cannot download.");
        console.log("🔍 Debug Info - window.currentSchedule:", window.currentSchedule);
        alert('No schedule to download');
        return;
    }

    console.log("✅ Schedule found! Preparing ICS...");
    console.log("📅 Current Schedule:", window.currentSchedule);
    
    const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Torah Schedule Creator//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    window.currentSchedule.forEach((entry, index) => {
        const dateStr = formatDate(entry.date).replace(/-/g, '');
        const nextDay = new Date(entry.date);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = formatDate(nextDay).replace(/-/g, '');

        icsLines.push('BEGIN:VEVENT');
        icsLines.push(`UID:${dateStr}-${index}@torahschedule`);
        icsLines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').split('T')[0]}T000000Z`);
        icsLines.push(`DTSTART;VALUE=DATE:${dateStr}`);
        icsLines.push(`DTEND;VALUE=DATE:${nextDayStr}`);
        icsLines.push(`SUMMARY:${window.scheduleName} Study Schedule`);
        icsLines.push(`DESCRIPTION:${entry.reading.join(', ')}`);
        icsLines.push('END:VEVENT');
    });

    icsLines.push('END:VCALENDAR');

    console.log("📜 Generated ICS Content:\n", icsLines.join('\n'));

    downloadFile(icsLines.join('\r\n'), `${window.scheduleName}_schedule.ics`, 'text/calendar');
}

/**
 * Helper function to create LaTeX command strings without Unicode issues
 * @param {string} command - The LaTeX command without backslash
 * @param {string} param - Optional parameter in curly braces
 * @returns {string} - Properly escaped LaTeX command string
 */
function latexCmd(command, param = null) {
    if (param !== null) {
        return '\\' + command + '{' + param + '}';
    }
    return '\\' + command;
}

/**
 * Convert Arabic numerals to Hebrew numerals
 * @param {number} num - The number to convert
 * @returns {string} - Hebrew numeral representation
 */
function toHebrewNumeral(num) {
    if (typeof num !== 'number' || num < 1 || !Number.isInteger(num)) {
        return String(num);
    }

    const hebrewLetters = {
        1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט',
        10: 'י', 20: 'כ', 30: 'ל', 40: 'מ', 50: 'נ', 60: 'ס', 70: 'ע', 80: 'פ', 90: 'צ',
        100: 'ק', 200: 'ר', 300: 'ש', 400: 'ת'
    };

    // Special cases for 15 and 16 (avoid using God's name)
    if (num === 15) return 'טו';
    if (num === 16) return 'טז';

    let result = '';
    let remaining = num;
    
    // Handle hundreds
    const hundreds = Math.floor(remaining / 100) * 100;
    if (hebrewLetters[hundreds]) {
        result += hebrewLetters[hundreds];
    } else if (hundreds > 400) {
        // For numbers > 400, combine tav (400) letters
        for (let i = 0; i < Math.floor(hundreds / 400); i++) {
            result += hebrewLetters[400];
        }
        const remainingHundreds = hundreds % 400;
        if (remainingHundreds > 0 && hebrewLetters[remainingHundreds]) {
            result += hebrewLetters[remainingHundreds];
        }
    }
    remaining %= 100;

    // Handle tens
    const tens = Math.floor(remaining / 10) * 10;
    if (hebrewLetters[tens]) {
        result += hebrewLetters[tens];
    }
    remaining %= 10;

    // Handle ones
    if (hebrewLetters[remaining]) {
        result += hebrewLetters[remaining];
    }

    // Add geresh (apostrophe) for single-character numerals
    if (result.length === 1) {
        result += "'";
    } else if (result.length > 1) {
        // Add gershayim (double apostrophe) before the last character for multi-character numerals
        result = result.slice(0, -1) + '"' + result.slice(-1);
    }

    return result;
}

/**
 * Download the schedule as a LaTeX file
 */
/**
 * Escape special characters in LaTeX
 */
function escapeLatexText(text) {
    if (text === null || text === undefined) {
        return '';
    }
    
    return String(text)
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\^/g, '\\textasciicircum{}')
        .replace(/\\/g, '\\textbackslash{}');
}

/**
 * Download the schedule as a LaTeX file
 * @param {string} learningTitle - Optional Hebrew title for the document
 */
async function downloadScheduleLatex(learningTitle = '') {
    console.log("📥 Attempting to download LaTeX...");

    if (!window.currentSchedule || window.currentSchedule.length === 0) {
        console.warn("⚠️ No schedule found! Cannot download.");
        alert(localise('No schedule to download. Please generate a schedule first.', 'אין לוח זמנים להורדה. נא ליצור לוח זמנים תחילה.'));
        return;
    }

    try {
        console.log("✅ Schedule found! Preparing LaTeX...");
        let documentLines = [];

        // --- LaTeX Preamble ---
        documentLines.push(latexCmd('documentclass[12pt]', 'article'));
        documentLines.push(latexCmd('usepackage', 'fontspec'));
        documentLines.push(latexCmd('usepackage[margin=1in]', 'geometry'));
        documentLines.push(latexCmd('usepackage', 'booktabs'));
        documentLines.push(latexCmd('usepackage', 'longtable'));
        documentLines.push(latexCmd('usepackage', 'polyglossia'));
        documentLines.push(latexCmd('usepackage[colorlinks=true,linkcolor=blue,urlcolor=blue]', 'hyperref'));
        documentLines.push(latexCmd('usepackage', 'titlesec'));
        
        // Set languages
        documentLines.push(latexCmd('setmainlanguage', 'hebrew'));
        documentLines.push(latexCmd('setotherlanguage', 'english'));
        
        // Set fonts for Hebrew
        documentLines.push(latexCmd('newfontfamily') + latexCmd('hebrewfont') + '{Ezra SIL}');
        documentLines.push(latexCmd('setmainfont', 'Ezra SIL'));

        // --- Document Metadata ---
        // Use the provided learningTitle or fall back to scheduleName
        const titleText = escapeLatexText(learningTitle || window.scheduleName || 'לוח לימוד תנ"ך');
        documentLines.push(latexCmd('title') + `{${latexCmd('begin', 'hebrew')}${titleText}${latexCmd('end', 'hebrew')}}`);
        documentLines.push(latexCmd('author') + '{}');
        documentLines.push(latexCmd('date') + '{}'); // Empty date to remove it from title page

        // --- Document Body ---
        documentLines.push(latexCmd('begin', 'document'));
        documentLines.push(latexCmd('maketitle'));
        
        // Table of contents with Hebrew title
        const tocName = `${latexCmd('begin', 'hebrew')}תוכן עניינים${latexCmd('end', 'hebrew')}`;
        documentLines.push(latexCmd('renewcommand') + `{${latexCmd('contentsname')}}{${tocName}}`);
        documentLines.push(latexCmd('tableofcontents'));
        documentLines.push(latexCmd('newpage'));

        // Reset page numbering
        documentLines.push(latexCmd('setcounter', 'page') + '{1}');
        
        // For tracking chapters in the reading
        let lastChapter = null;

        // --- Main Loop for Schedule Entries ---
        for (const entry of window.currentSchedule) {
            // Format date information
            const dateStr = formatDateForDisplay(entry.date);
            const dayStr = currentLang === LANG.HE ? getHebrewDayName(entry.date.getDay()) : getDayName(entry.date.getDay());
            
            // Handle Hebrew date if available
            let hebrewDateInfo = '';
            if (entry.hebrewDate) {
                const { hd, hm, hy } = entry.hebrewDate;
                let hebrewMonthName = hm;
                if (currentLang === LANG.HE) {
                    // Map English month names to Hebrew
                    const monthMap = { 
                        "Nisan": "ניסן", 
                        "Iyyar": "אייר", 
                        "Iyar": "אייר", 
                        "Sivan": "סיון", 
                        "Tamuz": "תמוז", 
                        "Av": "אב", 
                        "Elul": "אלול", 
                        "Tishrei": "תשרי", 
                        "Cheshvan": "חשון", 
                        "Kislev": "כסלו", 
                        "Tevet": "טבת", 
                        "Sh'vat": "שבט", 
                        "Shvat": "שבט", 
                        "Adar": "אדר", 
                        "Adar II": "אדר ב'", 
                    };
                    hebrewMonthName = monthMap[hm] || hm;
                }
                hebrewDateInfo = `${hd} ${hebrewMonthName} ${hy}`;
            }

            // Create section header for this day
            const dateHeaderForTOC = `${dayStr} - ${dateStr}${hebrewDateInfo ? ' | ' + hebrewDateInfo : ''}`;
            const dateHeaderEscaped = escapeLatexText(dateHeaderForTOC);
            
            // Box the date header for emphasis
            let boxedDateHeader = currentLang === LANG.HE ?
                `${latexCmd('begin', 'hebrew')}${latexCmd('centerline')}{${latexCmd('fbox')}{${dateHeaderEscaped}}}${latexCmd('end', 'hebrew')}` :
                `${latexCmd('centerline')}{${latexCmd('fbox')}{${dateHeaderEscaped}}}`;
            
            // Add to table of contents
            documentLines.push(latexCmd('phantomsection'));
            documentLines.push(latexCmd('addcontentsline') + `{toc}{section}{${dateHeaderEscaped}}`);
            documentLines.push(latexCmd('section*') + `{${boxedDateHeader}}`);
            
            
            if (entry.reading && entry.reading.length > 0) {
                // Generate reading range title
                let rangeDescription = '';
                const firstRef = entry.reading[0];
                
                // Extract book name and reference parts properly to handle Roman numerals
                // Match the book name pattern (e.g., "I Samuel", "II Kings", "Song of Songs", etc.)
                const firstRefMatch = firstRef.match(/^((?:I|II|III|IV|1|2|3|4|Song of Songs|[A-Za-z]+)(?: [A-Za-z]+)*) (.+)$/);
                let firstBook, firstRefPart;
                
                if (firstRefMatch) {
                    firstBook = firstRefMatch[1]; // Complete book name including Roman numerals
                    firstRefPart = firstRefMatch[2]; // Chapter and verse reference
                } else {
                    // Fallback to old method
                    const parts = firstRef.split(' ');
                    firstBook = parts[0];
                    firstRefPart = parts.slice(1).join(' ');
                }
                
                const [firstChapter, firstVerse] = firstRefPart.split(':').map(part => parseInt(part));
                
                const lastRef = entry.reading[entry.reading.length - 1];
                const lastRefMatch = lastRef.match(/^((?:I|II|III|IV|1|2|3|4|Song of Songs|[A-Za-z]+)(?: [A-Za-z]+)*) (.+)$/);
                let lastBook, lastRefPart;
                
                if (lastRefMatch) {
                    lastBook = lastRefMatch[1]; // Complete book name including Roman numerals
                    lastRefPart = lastRefMatch[2]; // Chapter and verse reference
                } else {
                    // Fallback to old method
                    const parts = lastRef.split(' ');
                    lastBook = parts[0];
                    lastRefPart = parts.slice(1).join(' ');
                }
                
                const [lastChapterNum, lastVerse] = lastRefPart.split(':').map(part => parseInt(part));
                
                if (currentLang === LANG.HE) {
                    const hebrewBookName = getHebrewBookName(firstBook);
                    console.log(`LaTeX conversion - Book: [${firstBook}] to Hebrew: [${hebrewBookName}]`);
                    
                    if (entry.reading.length === 1 && !isNaN(firstVerse)) { 
                        rangeDescription = `${hebrewBookName} ${toHebrewNumeral(firstChapter)}׳:${toHebrewNumeral(firstVerse)}׳`; 
                    } else if (firstChapter === lastChapterNum && !isNaN(firstVerse) && !isNaN(lastVerse)) { 
                        rangeDescription = `${hebrewBookName} ${toHebrewNumeral(firstChapter)}׳:${toHebrewNumeral(firstVerse)}׳–${toHebrewNumeral(lastVerse)}׳`; 
                    } else if (firstChapter !== lastChapterNum && !isNaN(firstVerse) && !isNaN(lastVerse)) { 
                        rangeDescription = `${hebrewBookName} ${toHebrewNumeral(firstChapter)}׳:${toHebrewNumeral(firstVerse)}׳–${toHebrewNumeral(lastChapterNum)}׳:${toHebrewNumeral(lastVerse)}׳`; 
                    } else if (isNaN(firstVerse) && isNaN(lastVerse) && firstChapter === lastChapterNum) { 
                        rangeDescription = `${hebrewBookName} ${toHebrewNumeral(firstChapter)}׳`; 
                    } else if (isNaN(firstVerse) && isNaN(lastVerse) && firstChapter !== lastChapterNum) { 
                        rangeDescription = `${hebrewBookName} ${toHebrewNumeral(firstChapter)}׳–${toHebrewNumeral(lastChapterNum)}׳`; 
                    } else { 
                        rangeDescription = `${hebrewBookName} ${toHebrewNumeral(firstChapter)}׳`; 
                    }
                } else {
                    if (entry.reading.length === 1 && !isNaN(firstVerse)) { 
                        rangeDescription = `${firstBook} ${firstChapter}:${firstVerse}`; 
                    } else if (firstChapter === lastChapterNum && !isNaN(firstVerse) && !isNaN(lastVerse)) { 
                        rangeDescription = `${firstBook} ${firstChapter}:${firstVerse}-${lastVerse}`; 
                    } else if (isNaN(firstVerse) && isNaN(lastVerse) && firstChapter === lastChapterNum) { 
                        rangeDescription = `${firstBook} ${firstChapter}`; 
                    } else { 
                        rangeDescription = `${firstBook} ${firstChapter}:${firstVerse}-${lastChapterNum}:${lastVerse}`; 
                    }
                }
                
                const readingSectionTitleText = escapeLatexText(rangeDescription);
                const readingSectionTitle = currentLang === LANG.HE ? 
                    `${latexCmd('begin', 'hebrew')}${readingSectionTitleText}${latexCmd('end', 'hebrew')}` : 
                    readingSectionTitleText;
                    
                documentLines.push(latexCmd('subsection*') + `{${readingSectionTitle}}`);
                
                let fullText = [];
                
                for (const ref of entry.reading) {
                    try {
                        const verseData = await fetchSefariaText(ref);
                        
                        if (verseData && verseData.he) {
                            const hebrewContent = Array.isArray(verseData.he) ? verseData.he : [verseData.he];
                            
                            const [, ch, startV] = ref.match(/(\d+):?(\d+)?/) || [null, '1', '1'];
                            const chapterNum = parseInt(ch);
                            const startVerseNum = startV ? parseInt(startV.split('-')[0]) : 1;
                            
                            if (chapterNum !== lastChapter) {
                                if (fullText.length > 0) {
                                    documentLines.push(`${latexCmd('begin', 'hebrew')}${fullText.join(' ')}${latexCmd('end', 'hebrew')}`);
                                }
                                fullText = [`\\fbox{\\textbf{${toHebrewNumeral(chapterNum)}}}`];
                                lastChapter = chapterNum;
                            }
                            
                            hebrewContent.forEach((verse, idx) => {
                                const verseNum = startVerseNum + idx;
                                const cleanedVerse = cleanTextForLatex(verse);
                                fullText.push(`\\textsuperscript{${toHebrewNumeral(verseNum)}}${cleanedVerse}`);
                            });
                        }
                    } catch (fetchError) {
                        console.error(`Error fetching text for ${ref}:`, fetchError);
                    }
                }
                
                if (fullText.length > 0) {
                    documentLines.push(`${latexCmd('begin', 'hebrew')}${fullText.join(' ')}${latexCmd('end', 'hebrew')}`);
                }
            }
            
            documentLines.push(latexCmd('vspace', '2em'));
        }
        
        documentLines.push(latexCmd('end', 'document'));
        
        const latexContent = documentLines.join('\n');
        downloadFile(latexContent, `${window.scheduleName}_schedule.tex`, 'text/plain');
        alert('LaTeX file downloaded successfully!');
        
    } catch (error) {
        console.error('Error generating LaTeX:', error);
        alert(localise('Failed to generate LaTeX file. Please try again.', 'נכשל ביצירת קובץ LaTeX. נא לנסות שוב.'));
    }
}

/**
 * Helper function to download a file
 */
function downloadFile(content, fileName, contentType) {
    console.log(`⬇️ Initiating file download: ${fileName} (Type: ${contentType})`);

    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);

    console.log("✅ File download triggered successfully!");
}

/**
 * Debugging log to check when the schedule is set
 */
/**
 * Debugging log to check when the schedule is set
 */
function setSchedule(schedule, scheduleName) {
    console.log("✅ Storing schedule globally!");
    window.currentSchedule = schedule;
    window.scheduleName = scheduleName;
    console.log("📅 Set window.currentSchedule:", window.currentSchedule);
}

// Check if schedule is set on page load
window.onload = function() {
    console.log("🔄 Page Loaded! Checking if schedule exists...");
    console.log("🛠 window.currentSchedule:", window.currentSchedule);
};

/**
 * Fetch learning of the day from Sefaria API
 */
function fetchLearningOfTheDay(references) {
    if (!Array.isArray(references) || references.length === 0) {
        console.warn('⚠️ No references provided for learning of the day.');
        return;
    }

    const learningContent = document.getElementById('learningContent');
    if (!learningContent) {
        console.warn('⚠️ Learning content element not found.');
        return;
    }
    
    learningContent.innerHTML = '<strong>📖 Learning of the Day:</strong><br><ul style="direction: rtl; text-align: right;"></ul>';
    const contentList = learningContent.querySelector('ul');

    references.forEach(reference => {
        const formattedReference = reference.replace(/\s+/g, '_'); // Convert spaces to underscores
        const url = `https://www.sefaria.org/api/v3/texts/${formattedReference}`;
        console.log(`🔍 Fetching: ${url}`);

        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log(`✅ Response for ${formattedReference}:`, data);

                let hebrewVerses = [];
                if (data.versions && Array.isArray(data.versions) && data.versions.length > 0) {
                    const firstVersion = data.versions.find(v => v.language === "he"); // Get first Hebrew version
                    if (firstVersion) {
                        const textData = firstVersion.text;

                        if (Array.isArray(textData)) {
                            // Multiple verses case
                            hebrewVerses = textData.map((verse, index) => `<strong>${index + 1}:</strong> ${verse}`);
                        } else if (typeof textData === "string") {
                            // Single verse case
                            hebrewVerses = [`<strong>1:</strong> ${textData}`];
                        }
                    }
                }

                // Create list item
                const listItem = document.createElement('li');
                listItem.innerHTML = `<strong>${reference}:</strong><br>${hebrewVerses.length > 0 ? hebrewVerses.join('<br>') : '<span style="color:red;">Text not available</span>'}`;
                contentList.appendChild(listItem);
            })
            .catch(error => {
                console.error(`❌ Error fetching learning of the day for ${reference}:`, error);
            });
    });
}

/**
 * Fetch the Hebrew text for a biblical reference from Sefaria API for LaTeX export
 * @param {string} reference - The biblical reference (e.g. "Genesis 1:1")
 * @returns {Promise<string|null>} - The Hebrew text or null if not found
 */
async function fetchSefariaText(reference) {
  try {
    console.log('Fetching Sefaria text for:', reference);
    
    // Map of common book names to their Sefaria API names
    const bookNameMap = {
      // English names
      'Genesis': 'Genesis',
      'Exodus': 'Exodus',
      'Leviticus': 'Leviticus',
      'Numbers': 'Numbers',
      'Deuteronomy': 'Deuteronomy',
      'Joshua': 'Joshua',
      'Judges': 'Judges',
      'I Samuel': '1 Samuel', 
      '1 Samuel': '1 Samuel',
      'II Samuel': '2 Samuel',
      '2 Samuel': '2 Samuel',
      'I Kings': '1 Kings',
      '1 Kings': '1 Kings',
      'II Kings': '2 Kings',
      '2 Kings': '2 Kings',
      'Isaiah': 'Isaiah',
      'Jeremiah': 'Jeremiah',
      'Ezekiel': 'Ezekiel',
      'Hosea': 'Hosea',
      'Joel': 'Joel',
      'Amos': 'Amos',
      'Obadiah': 'Obadiah',
      'Jonah': 'Jonah', 
      'Micah': 'Micah',
      'Nahum': 'Nahum',
      'Habakkuk': 'Habakkuk',
      'Zephaniah': 'Zephaniah',
      'Haggai': 'Haggai',
      'Zechariah': 'Zechariah',
      'Malachi': 'Malachi',
      'Psalms': 'Psalms',
      'Proverbs': 'Proverbs',
      'Job': 'Job',
      'Song of Songs': 'Song of Songs',
      'Ruth': 'Ruth',
      'Lamentations': 'Lamentations',
      'Ecclesiastes': 'Ecclesiastes',
      'Esther': 'Esther',
      'Daniel': 'Daniel',
      'Ezra': 'Ezra',
      'Nehemiah': 'Nehemiah',
      'I Chronicles': '1 Chronicles',
      '1 Chronicles': '1 Chronicles',
      'II Chronicles': '2 Chronicles',
      '2 Chronicles': '2 Chronicles',
      
      // Hebrew names (with transliteration)
      'בראשית': 'Genesis',
      'שמות': 'Exodus',
      'ויקרא': 'Leviticus',
      'במדבר': 'Numbers',
      'דברים': 'Deuteronomy',
      'יהושע': 'Joshua',
      'שופטים': 'Judges',
      'שמואל א': '1 Samuel',
      'שמואל ב': '2 Samuel',
      'מלכים א': '1 Kings',
      'מלכים ב': '2 Kings',
      'ישעיהו': 'Isaiah',
      'ירמיהו': 'Jeremiah',
      'יחזקאל': 'Ezekiel',
      'הושע': 'Hosea',
      'יואל': 'Joel',
      'עמוס': 'Amos',
      'עובדיה': 'Obadiah',
      'יונה': 'Jonah',
      'מיכה': 'Micah',
      'נחום': 'Nahum',
      'חבקוק': 'Habakkuk',
      'צפניה': 'Zephaniah',
      'חגי': 'Haggai',
      'זכריה': 'Zechariah',
      'מלאכי': 'Malachi',
      'תהלים': 'Psalms',
      'משלי': 'Proverbs',
      'איוב': 'Job',
      'שיר השירים': 'Song of Songs',
      'רות': 'Ruth',
      'איכה': 'Lamentations',
      'קהלת': 'Ecclesiastes',
      'אסתר': 'Esther',
      'דניאל': 'Daniel',
      'עזרא': 'Ezra',
      'נחמיה': 'Nehemiah',
      'דברי הימים א': '1 Chronicles',
      'דברי הימים ב': '2 Chronicles'
    };
    
    // Parse the reference to get the book name and chapter/verse
    const [bookName, ...rest] = reference.split(' ');
    const restOfRef = rest.join(' ');
    
    // Get the standardized book name for Sefaria API
    const sefariaBookName = bookNameMap[bookName] || bookName;
    const sefariaRef = `${sefariaBookName} ${restOfRef}`;
    console.log('Using Sefaria reference:', sefariaRef);
    
    // Add a small delay to avoid API rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Format the reference for the API call
    const encodedRef = encodeURIComponent(sefariaRef);
    const url = `https://www.sefaria.org/api/texts/${encodedRef}?commentary=0&context=0&pad=0`;
    console.log('Fetching from URL:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`HTTP error! status: ${response.status} for reference: ${reference}`);
      return getDefaultText(reference); // Return default mockup text on error
    }
    
    const data = await response.json();
    console.log('Received data:', data);
    
    // Extract the Hebrew text - old API format fallback
    if (data.he && (typeof data.he === 'string' || Array.isArray(data.he))) {
      console.log('Found text in direct .he property');
      return { he: data.he, en: data.text };
    }
    
    // Extract the Hebrew text from v3 API
    if (data.versions && Array.isArray(data.versions)) {
      console.log('Looking for text in versions array');
      const hebrewVersion = data.versions.find(v => v.language === 'he');
      if (hebrewVersion && hebrewVersion.text) {
        console.log('Found Hebrew text in versions');
        return { he: hebrewVersion.text, en: data.text };
      }
    }
    
    // Check for text in the text property
    if (data.text && typeof data.text === 'object' && data.text.he) {
      console.log('Found Hebrew text in text.he property');
      return { he: data.text.he, en: data.text.en };
    }
    
    // Check for simple text array format
    if (data.text && Array.isArray(data.text)) {
      console.log('Found text in text array format');
      return { he: data.text, en: [] }; // Assuming Hebrew text in this case
    }
    
    console.warn('No Hebrew text found for:', reference);
    return getDefaultText(reference); // Return default mockup text
  } catch (error) {
    console.error('Error fetching Sefaria text:', error, 'for reference:', reference);
    return getDefaultText(reference); // Return default mockup text on error
  }
}

// Helper function to return mock text for testing
function getDefaultText(reference) {
  console.log('Using mock text for:', reference);
  
  // Parse reference to extract book name for more specific mock text
  const book = reference.split(' ')[0];
  
  // Default mock texts for different books
  const mockTexts = {
    'Jonah': ["וַיְהִ֤י דְבַר־יְהוָה֙ אֶל־יוֹנָ֣ה בֶן־אֲמִתַּ֔י לֵאמֹֽר׃"],
    'Genesis': ["בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃"],
    'Exodus': ["וְאֵ֗לֶּה שְׁמוֹת֙ בְּנֵ֣י יִשְׂרָאֵ֔ל הַבָּאִ֖ים מִצְרָ֑יְמָה"],
    'default': ["טקסט עברי לדוגמה - זהו טקסט מחזיק מקום"]
  };
  
  return {
    he: mockTexts[book] || mockTexts['default'],
    en: ["Example text placeholder"]
  };
}

// Function to clean HTML and escape LaTeX special characters
function cleanTextForLatex(text) {
  if (!text) return '';
  
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '');
  
  // Replace HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&thinsp;/g, ' ');
  cleaned = cleaned.replace(/&[a-zA-Z0-9#]+;/g, ' ');
  
  // Remove spans with special markers
  cleaned = cleaned.replace(/<span[^>]*>\\{[ps]\\}<\/span>/g, '');
  
  // Escape LaTeX special characters - only those likely in Hebrew text
  // Don't escape backslash or curly braces as they're not common in Hebrew
  cleaned = cleaned.replace(/%/g, '\\%');
  cleaned = cleaned.replace(/#/g, '\\#');
  cleaned = cleaned.replace(/_/g, '\\_');
  cleaned = cleaned.replace(/\$/g, '\\$');
  
  return cleaned;
}

// Language toggle event listener setup
document.addEventListener('DOMContentLoaded', function() {
  // Initialize tanachData for reference validation
  if (window.tanachData) {
    console.log('Loading Tanach reference data...');
    window.tanachData.loadFromCSV().then(success => {
      console.log('Tanach reference data loaded:', success);
    }).catch(err => {
      console.error('Failed to load Tanach reference data:', err);
    });
  }
  
  // Force set ALL labels to black text
  const forceBlackText = function() {
    // Target all weekday selector labels
    const weekdayLabels = document.querySelectorAll('.weekday-selector label');
    weekdayLabels.forEach(label => {
      label.style.color = '#000000';
      label.style.fontWeight = '600';
    });
    
    // Target ALL labels for good measure
    const allLabels = document.querySelectorAll('label');
    allLabels.forEach(label => {
      label.style.color = '#000000';
    });
    
    console.log('✓ Enforced black text on all labels');
  };
  
  // Run immediately and also after a slight delay to catch any dynamic content
  forceBlackText();
  setTimeout(forceBlackText, 500);
  
  const langToggleBtn = document.getElementById('langToggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      TorahData.toggleLanguage();
      // re-render anything that shows human-readable strings
      populateBookSelections();
      populateMishnayotSelections();
      // if a schedule is already displayed, redraw it:
      if (window.currentSchedule) displaySchedule(
        window.currentSchedule,
        window.scheduleName
      );
      // update button label
      langToggleBtn.textContent =
        TorahData.currentLang() === TorahData.LANG.HE ? 'English' : 'עברית';
      
      // Force black text again after language toggle
      forceBlackText();
      // Also after a slight delay as some content may be redrawn
      setTimeout(forceBlackText, 300);
    });
  }
});