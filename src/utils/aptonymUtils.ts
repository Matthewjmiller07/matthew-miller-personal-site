// Helper function to highlight the aptonym part of the name
export function highlightAptonym(name: string, part: string) {
  if (!name) return name;
  
  const [firstName, ...lastNameParts] = name.split(' ');
  const lastName = lastNameParts.join(' ');
  
  if (part === 'First') {
    return `<span class="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded">${firstName}</span>${lastName ? ` ${lastName}` : ''}`;
  } else if (part === 'Last' && lastName) {
    return `${firstName} <span class="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded">${lastName}</span>`;
  } else if (part === 'Both') {
    return `<span class="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded">${name}</span>`;
  }
  
  return name;
}
