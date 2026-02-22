// Helper function to format pistachio data for display
export function formatPistachioData(pistachio: any) {
  return {
    ...pistachio,
    hasUrl: pistachio.URL && pistachio.URL !== 'N/A' && pistachio.URL.trim() !== '',
    hasBiblicalVerse: pistachio['Biblical Verse'] && pistachio['Biblical Verse'] !== 'N/A' && pistachio['Biblical Verse'].trim() !== ''
  };
}

// Helper function to get religion badge color
export function getReligionBadgeColor(religion: string) {
  const colors: { [key: string]: string } = {
    'Jewish': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Christian': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Muslim': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  };
  return colors[religion] || colors['Other'];
}

// Helper function to get language badge color
export function getLanguageBadgeColor(language: string) {
  const colors: { [key: string]: string } = {
    'Hebrew': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    'Aramaic': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Greek': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    'English': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  };
  return colors[language] || colors['Other'];
}
