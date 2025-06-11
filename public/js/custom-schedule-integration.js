/**
 * Custom Schedule Integration - Add features to save schedules to Google Sheets
 */

document.addEventListener('DOMContentLoaded', () => {
    // Add event listener for Save to Google Sheets button
    const saveToGoogleSheetsBtn = document.getElementById('saveToGoogleSheets');
    if (saveToGoogleSheetsBtn) {
        saveToGoogleSheetsBtn.addEventListener('click', saveScheduleToGoogleSheets);
    }
});

/**
 * Save the current schedule to Google Sheets
 */
async function saveScheduleToGoogleSheets() {
    // Check if there's a schedule to save
    if (!window.currentSchedule || window.currentSchedule.length === 0) {
        showMessage('No schedule to save. Please generate a schedule first.');
        return;
    }

    try {
        // Prompt for schedule name
        const defaultName = window.scheduleName || 'Torah Schedule';
        const scheduleName = prompt('Enter a name for this schedule (will be used as the sheet name):', defaultName);
        
        if (!scheduleName) {
            // User cancelled
            return;
        }

        // Disable button and show loading state
        const saveButton = document.getElementById('saveToGoogleSheets');
        const originalText = saveButton.textContent;
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';

        // Format the schedule data for the API
        const scheduleData = window.currentSchedule.map(item => ({
            date: item.date,
            dayOfWeek: item.dayOfWeek,
            reading: item.reading
        }));

        // Call the API to save the schedule
        const response = await fetch('/api/add-custom-schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: scheduleName,
                schedule: scheduleData
            })
        });

        const result = await response.json();

        // Reset button state
        saveButton.disabled = false;
        
        if (response.ok) {
            saveButton.textContent = 'Saved!';
            showMessage(`Schedule "${scheduleName}" saved successfully! A new sheet named "${result.sheetName}" was created with ${result.entriesAdded} entries.`);
            
            // Reset button text after a delay
            setTimeout(() => {
                saveButton.textContent = originalText;
            }, 3000);
        } else {
            saveButton.textContent = originalText;
            showMessage(`Error saving schedule: ${result.message || 'Unknown error'}`);
            console.error('Error saving to Google Sheets:', result);
        }
    } catch (error) {
        console.error('Error saving schedule to Google Sheets:', error);
        document.getElementById('saveToGoogleSheets').textContent = 'Save to Google Sheets';
        document.getElementById('saveToGoogleSheets').disabled = false;
        showMessage(`Error: ${error.message}`);
    }
}

// Helper to show messages (re-using the one from app.js for consistency)
function showCustomMessage(message) {
    if (typeof showMessage === 'function') {
        showMessage(message);
    } else {
        console.log(message);
        alert(message);
    }
}
