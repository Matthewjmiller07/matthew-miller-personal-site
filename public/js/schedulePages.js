/**
 * Torah Schedule Individual Pages Generator
 * This module handles the generation of individual HTML pages for each day in a Torah reading schedule.
 */

/**
 * Generates individual HTML pages for each day in a Torah schedule
 * @param {Array} schedule - The complete Torah reading schedule
 * @param {string} scheduleName - Name of the schedule
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} - Array of generated page URLs
 */
function generateSchedulePages(schedule, scheduleName, options = {}) {
    // Default options
    const config = {
        outputDir: options.outputDir || 'schedule-pages',
        includeHebrewDates: options.includeHebrewDates !== false,
        language: options.language || 'en',
        includeNavigation: options.includeNavigation !== false,
        template: options.template || 'default',
        downloadAsZip: options.downloadAsZip !== false,
        ...options
    };

    console.log(`Generating individual pages for schedule: ${scheduleName}`);
    console.log(`Configuration: `, config);
    
    return new Promise(async (resolve, reject) => {
        try {
            const generatedPages = [];
            const htmlFiles = [];
            
            // First, generate all HTML content
            for (let i = 0; i < schedule.length; i++) {
                const entry = schedule[i];
                const date = new Date(entry.date);
                const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
                const fileName = `${dateStr}.html`;
                
                // Generate the HTML content for this day
                const pageContent = generateDayPageHTML(entry, schedule, i, scheduleName, config);
                
                // Store the HTML content
                htmlFiles.push({
                    fileName: fileName,
                    content: pageContent
                });
                
                generatedPages.push({
                    date: entry.date,
                    dayOfWeek: entry.dayOfWeek,
                    fileName: fileName,
                    content: pageContent
                });
            }

            // Generate index page
            const indexContent = generateIndexHTML(schedule, scheduleName, config);
            htmlFiles.push({
                fileName: 'index.html',
                content: indexContent
            });
            
            // If downloadAsZip option is true, create a zip file
            if (config.downloadAsZip) {
                // Check if JSZip is available
                if (typeof JSZip === 'undefined') {
                    // Load JSZip dynamically if not available
                    await loadJSZip();
                }
                
                const zip = new JSZip();
                const folder = zip.folder(config.outputDir.replace(/\//g, '-'));
                
                // Add all HTML files to the zip
                htmlFiles.forEach(file => {
                    folder.file(file.fileName, file.content);
                });
                
                // Generate the zip file
                zip.generateAsync({type:"blob"}).then(function(content) {
                    // Trigger download of the zip file
                    const zipFileName = `${scheduleName.replace(/\s+/g, '-')}-schedule.zip`;
                    downloadBlob(content, zipFileName, 'application/zip');
                    resolve(generatedPages);
                });
            } else {
                // Create a chain of downloads for individual files
                let downloadIndex = 0;
                
                const downloadNext = () => {
                    if (downloadIndex < htmlFiles.length) {
                        const file = htmlFiles[downloadIndex++];
                        const blob = new Blob([file.content], {type: 'text/html'});
                        
                        // Create a prefix for the filename to ensure proper order
                        let downloadName = file.fileName;
                        if (file.fileName !== 'index.html') {
                            // For day files, add a sequence number
                            downloadName = `${String(downloadIndex).padStart(3, '0')}-${file.fileName}`;
                        }
                        
                        downloadBlob(blob, downloadName, 'text/html');
                        
                        // Schedule the next download
                        setTimeout(downloadNext, 500);
                    } else {
                        resolve(generatedPages);
                    }
                };
                
                // Start the download chain
                downloadNext();
            }
        } catch (error) {
            console.error('Error generating pages:', error);
            reject(error);
        }
    });
}

/**
 * Generates the HTML content for a single day's page
 * @param {Object} entry - The schedule entry for this day
 * @param {Array} schedule - The complete schedule (for navigation)
 * @param {number} currentIndex - Index of the current entry in the schedule
 * @param {string} scheduleName - Name of the schedule
 * @param {Object} config - Configuration options
 * @returns {string} - HTML content for the page
 */
function generateDayPageHTML(entry, schedule, currentIndex, scheduleName, config) {
    const date = new Date(entry.date);
    const dateDisplay = formatDateForDisplay(date);
    const readings = entry.reading.join(', ');
    
    // Previous and next links for navigation
    let prevLink = '', nextLink = '';
    if (config.includeNavigation) {
        if (currentIndex > 0) {
            const prevDate = new Date(schedule[currentIndex - 1].date).toISOString().split('T')[0];
            prevLink = `<a href="/${config.outputDir}/${prevDate}.html" class="nav-button prev-button">&larr; Previous Day</a>`;
        }
        
        if (currentIndex < schedule.length - 1) {
            const nextDate = new Date(schedule[currentIndex + 1].date).toISOString().split('T')[0];
            nextLink = `<a href="/${config.outputDir}/${nextDate}.html" class="nav-button next-button">Next Day &rarr;</a>`;
        }
    }
    
    // Hebrew date display if available and enabled
    let hebrewDateHTML = '';
    if (config.includeHebrewDates && entry.hebrewDate) {
        const hebDay = entry.hebrewDate.hd;
        const hebMonthName = getHebrewMonthName(entry.hebrewDate.hm);
        const hebYear = entry.hebrewDate.hy;
        hebrewDateHTML = `
            <div class="hebrew-date-container">
                <div class="hebrew-date" style="color: #000000; font-weight: 800;">${hebDay} ${hebMonthName} ${hebYear}</div>
            </div>
        `;
    }
    
    // Basic HTML template for the individual day page
    return `<!DOCTYPE html>
<html lang="${config.language === 'he' ? 'he' : 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${dateDisplay} - ${scheduleName} - Torah Reading Schedule</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            max-width: 800px;
            margin: 0 auto;
            padding: 1rem;
            color: #333;
        }
        .page-header {
            text-align: ${config.language === 'he' ? 'right' : 'left'};
            border-bottom: 1px solid #ccc;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
            direction: ${config.language === 'he' ? 'rtl' : 'ltr'};
        }
        .date-display {
            font-size: 1.5rem;
            font-weight: bold;
            color: #000;
            margin: 0;
        }
        .day-name {
            font-size: 1.2rem;
            color: #555;
            margin: 0.5rem 0;
        }
        .hebrew-date-container {
            margin: 1rem 0;
            direction: ${config.language === 'he' ? 'rtl' : 'ltr'};
        }
        .schedule-name {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 2rem;
        }
        .readings-container {
            margin: 2rem 0;
            direction: ${config.language === 'he' ? 'rtl' : 'ltr'};
        }
        .readings-header {
            font-size: 1.2rem;
            color: #000;
            margin-bottom: 0.5rem;
        }
        .reading-item {
            font-size: 1.1rem;
            padding: 0.5rem 0;
        }
        .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 2rem;
            border-top: 1px solid #ccc;
            padding-top: 1rem;
        }
        .nav-button {
            text-decoration: none;
            padding: 0.5rem 1rem;
            background: #f0f0f0;
            color: #333;
            border-radius: 4px;
        }
        .back-to-schedule {
            text-align: center;
            margin: 2rem 0;
        }
        .back-to-schedule a {
            text-decoration: none;
            color: #0066cc;
        }
    </style>
</head>
<body dir="${config.language === 'he' ? 'rtl' : 'ltr'}">
    <div class="page-header">
        <h1 class="date-display">${dateDisplay}</h1>
        <div class="day-name">${entry.dayOfWeek}</div>
        ${hebrewDateHTML}
        <div class="schedule-name">
            ${scheduleName}
        </div>
    </div>
    
    <div class="readings-container">
        <h2 class="readings-header">Torah Reading</h2>
        <div class="reading-item">
            ${readings}
        </div>
    </div>
    
    <div class="navigation">
        ${prevLink}
        ${nextLink}
    </div>
    
    <div class="back-to-schedule">
        <a href="/torahschedule.html">Back to Full Schedule</a>
    </div>
</body>
</html>`;
}

/**
 * Format a date for display
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
function formatDateForDisplay(date) {
    if (!date) return '';
    
    // Format as MM/DD/YYYY
    const d = new Date(date);
    const month = d.getMonth() + 1; // getMonth() is zero-based
    const day = d.getDate();
    const year = d.getFullYear();
    
    return `${month}/${day}/${year}`;
}

/**
 * Get the Hebrew month name in English
 * @param {string} monthName - The month name from Hebcal API
 * @returns {string} - The Hebrew month name
 */
function getHebrewMonthName(monthName) {
    if (!monthName) return '';
    
    // Normalize some month names for consistency
    let normalizedMonthName = monthName;
    if (monthName === 'Iyar' || monthName === 'Iyyar') normalizedMonthName = 'Iyyar';
    if (monthName === 'Shvat' || monthName === "Sh'vat") normalizedMonthName = "Sh'vat";
    
    return normalizedMonthName;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateSchedulePages,
        generateDayPageHTML
    };
} else {
    // When in browser context, add to window
    window.generateSchedulePages = generateSchedulePages;
}
