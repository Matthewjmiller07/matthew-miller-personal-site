/**
 * Astro Schedule Generator
 * Generates Astro template files for a Torah reading schedule
 * with calendar navigation and detailed reading content
 */

// Helper function to format dates consistently
function formatDateForAstro(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Generate the index page with calendar view
function generateAstroIndex(schedule, scheduleName, options = {}) {
    const { language = 'en' } = options;
    const isRTL = language === 'he';
    
    // Group by month for the calendar view
    const months = [];
    let currentMonth = null;
    
    schedule.forEach(entry => {
        const date = new Date(entry.date);
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        if (!currentMonth || currentMonth.monthKey !== monthKey) {
            currentMonth = {
                monthKey,
                monthName: date.toLocaleString(language, { month: 'long', year: 'numeric' }),
                year,
                month: month + 1,
                weeks: []
            };
            months.push(currentMonth);
            
            // Add empty days at the start of the month
            const firstDay = new Date(year, month, 1).getDay();
            const startOffset = isRTL ? (6 - firstDay) % 7 : firstDay === 0 ? 6 : firstDay - 1;
            currentMonth.weeks.push(Array(startOffset).fill(null));
        }
        
        // Add day to current week or start new week
        let currentWeek = currentMonth.weeks[currentMonth.weeks.length - 1];
        if (currentWeek.length >= 7) {
            currentWeek = [];
            currentMonth.weeks.push(currentWeek);
        }
        
        currentWeek.push({
            date: entry.date,
            day: date.getDate(),
            reading: entry.reading[0], // Just show first reading in calendar
            isToday: false // You might want to calculate this
        });
    });
    
    // Generate the Astro template
    return `---
// src/pages/schedule/${scheduleName.replace(/\s+/g, '-').toLowerCase()}/index.astro
import Layout from '../../../layouts/Layout.astro';
import Calendar from '../../../components/Calendar.astro';

const pageTitle = "${scheduleName} - Torah Reading Schedule";
const pageDescription = "Daily Torah reading schedule with calendar navigation";

// Import all the daily pages for linking
${schedule.map((_, i) => `import Day${i} from './day-${i}.astro';`).join('\n')}
---

<Layout title={pageTitle} description={pageDescription}>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">${scheduleName}</h1>
    
    <!-- Calendar Navigation -->
    <div class="mb-8">
      <h2 class="text-xl font-semibold mb-4">Calendar View</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${months.map(month => `
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 class="text-lg font-semibold mb-3">${month.monthName}</h3>
            <table class="w-full">
              <thead>
                <tr>
                  ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => 
                    `<th class="text-xs p-1 text-gray-500">${isRTL ? day.split('').reverse().join('') : day}</th>`
                  ).join('')}
                </tr>
              </thead>
              <tbody>
                ${month.weeks.map(week => `
                  <tr>
                    ${Array(7).fill().map((_, i) => {
                      const day = week[i];
                      if (!day) return '<td class="p-1"></td>';
                      return `
                        <td class="p-1">
                          <a 
                            href="/schedule/${scheduleName.replace(/\s+/g, '-').toLowerCase()}/day-${schedule.findIndex(d => d.date === day.date)}" 
                            class="block text-center p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
                            title="${day.reading}"
                          >
                            ${day.day}
                          </a>
                        </td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- List View -->
    <div class="mb-8">
      <h2 class="text-xl font-semibold mb-4">Complete Schedule</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
          <thead class="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reading</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            ${schedule.map((entry, i) => `
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    <a href="/schedule/${scheduleName.replace(/\s+/g, '-').toLowerCase()}/day-${i}" class="hover:underline">
                      ${new Date(entry.date).toLocaleDateString(language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </a>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-900 dark:text-gray-300">
                    ${entry.reading.join(', ')}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</Layout>

<style>
  /* Add any custom styles here */
</style>`;
}

// Generate an individual day page
function generateAstroDayPage(entry, schedule, index, scheduleName, options = {}) {
    const { language = 'en' } = options;
    const isRTL = language === 'he';
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString(language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Navigation
    const prevDay = index > 0 ? `day-${index - 1}` : null;
    const nextDay = index < schedule.length - 1 ? `day-${index + 1}` : null;
    
    return `---
// src/pages/schedule/${scheduleName.replace(/\s+/g, '-').toLowerCase()}/day-${index}.astro
import Layout from '../../../../layouts/Layout.astro';

const pageTitle = "${formattedDate} - ${scheduleName}";
const pageDescription = "Daily Torah reading for ${formattedDate}";

// Navigation links
const prevDay = ${prevDay ? `'${prevDay}'` : 'null'};
const nextDay = ${nextDay ? `'${nextDay}'` : 'null'};
---

<Layout title={pageTitle} description={pageDescription}>
  <div class="container mx-auto px-4 py-8">
    <!-- Navigation -->
    <div class="flex justify-between items-center mb-6">
      ${prevDay ? `
        <a 
          href={"/schedule/${scheduleName.replace(/\s+/g, '-').toLowerCase()}/" + prevDay} 
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          ← Previous Day
        </a>
      ` : '<div></div>'}
      
      <a 
        href="/schedule/${scheduleName.replace(/\s+/g, '-').toLowerCase()}/" 
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      >
        Back to Calendar
      </a>
      
      ${nextDay ? `
        <a 
          href={"/schedule/${scheduleName.replace(/\s+/g, '-').toLowerCase()}/" + nextDay} 
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Next Day →
        </a>
      ` : '<div></div>'}
    </div>
    
    <!-- Date Header -->
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-bold">${formattedDate}</h1>
      <p class="text-xl text-gray-600 dark:text-gray-300">${scheduleName}</p>
    </div>
    
    <!-- Reading Content -->
    <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-8">
      <div class="px-4 py-5 sm:px-6">
        <h2 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          Torah Reading
        </h2>
      </div>
      <div class="border-t border-gray-200 dark:border-gray-700">
        <dl>
          ${entry.reading.map((reading, i) => `
            <div class="${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">
                Reading ${i + 1}
              </dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-gray-200 sm:mt-0 sm:col-span-2">
                ${reading}
              </dd>
            </div>
          `).join('')}
        </dl>
      </div>
    </div>
    
    <!-- Notes Section -->
    <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-8">
      <div class="px-4 py-5 sm:px-6">
        <h2 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          Study Notes
        </h2>
      </div>
      <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
        <div class="space-y-4">
          <div>
            <label for="notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows="6"
              class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white p-2"
              placeholder="Add your study notes, questions, or reflections here..."
            ></textarea>
          </div>
          <div>
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Navigation Buttons -->
    <div class="flex justify-between mt-8">
      ${prevDay ? `
        <a 
          href={"/schedule/${scheduleName.replace(/\s+/g, '-').toLowerCase()}/" + prevDay} 
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          ← Previous Day
        </a>
      ` : '<div></div>'}
      
      ${nextDay ? `
        <a 
          href={"/schedule/${scheduleName.replace(/\s+/g, '-').toLowerCase()}/" + nextDay} 
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Next Day →
        </a>
      ` : '<div></div>'}
    </div>
  </div>
</Layout>

<style>
  /* Add any custom styles here */
</style>`;
}

// Main function to generate all Astro files
export async function generateAstroSchedule(schedule, scheduleName, options = {}) {
    const files = [];
    const safeScheduleName = scheduleName.replace(/\s+/g, '-').toLowerCase();
    
    // Generate index page with calendar view
    const indexContent = generateAstroIndex(schedule, scheduleName, options);
    files.push({
        path: `pages/schedule/${safeScheduleName}/index.astro`,
        content: indexContent
    });
    
    // Generate individual day pages
    schedule.forEach((entry, index) => {
        const dayContent = generateAstroDayPage(entry, schedule, index, scheduleName, options);
        files.push({
            path: `pages/schedule/${safeScheduleName}/day-${index}.astro`,
            content: dayContent
        });
    });
    
    return files;
}

// Export for use in the browser
if (typeof window !== 'undefined') {
    window.generateAstroSchedule = generateAstroSchedule;
}
