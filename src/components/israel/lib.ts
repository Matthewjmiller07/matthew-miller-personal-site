import type { MealKind, Person, Place, Shul, Tefillah } from './types';

export const TEFILLOT: { key: Tefillah; label: string; he: string }[] = [
  { key: 'shacharit', label: 'Shacharit', he: 'שחרית' },
  { key: 'mincha', label: 'Mincha', he: 'מנחה' },
  { key: 'arvit', label: 'Arvit', he: 'ערבית' },
  { key: 'mincha_arvit', label: 'Mincha & Arvit', he: 'מנחה וערבית' },
  { key: 'musaf', label: 'Musaf', he: 'מוסף' },
  { key: 'selichot', label: 'Selichot', he: 'סליחות' },
  { key: 'other', label: 'Other', he: 'אחר' },
];

/**
 * The three seudot plus the odd ones out — a kiddush or a dessert is often the only
 * reason we're at someone's house, so each gets its own row rather than a note.
 */
export const MEALS: { key: MealKind; label: string; he: string }[] = [
  { key: 'friday_night', label: 'Friday night', he: 'ליל שבת' },
  { key: 'shabbat_lunch', label: 'Shabbat lunch', he: 'סעודת שחרית' },
  { key: 'seudah_shlishit', label: 'Seudah shlishit', he: 'סעודה שלישית' },
  { key: 'kiddush', label: 'Kiddush', he: 'קידוש' },
  { key: 'dessert', label: 'Dessert', he: 'קינוח' },
  { key: 'melave_malka', label: 'Melave malka', he: 'מלווה מלכה' },
];

export const TEFILLAH_LABEL = Object.fromEntries(
  TEFILLOT.map((t) => [t.key, t.label])
) as Record<Tefillah, string>;

export const MEAL_LABEL = Object.fromEntries(MEALS.map((m) => [m.key, m.label])) as Record<
  MealKind,
  string
>;

/** Ra'anana — where the shul list lives, so where the map opens. */
export const RAANANA: [number, number] = [32.1848, 34.8713];
export const RAANANA_CODE = '8700';

export const todayISO = () => new Date().toLocaleDateString('en-CA');

/** The Saturday of the week containing `from` — Sunday through Saturday counts forward. */
export function nearestShabbat(from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7));
  return date.toLocaleDateString('en-CA');
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "18:30:00" → "18:30"; anything unparseable falls through untouched. */
export const formatTime = (time: string | null) => (time ? time.slice(0, 5) : '');

export const placeLabel = (place: Place) =>
  place.name_en ? `${place.name_he} · ${titleCase(place.name_en)}` : place.name_he;

export const shulLabel = (shul: Shul) =>
  shul.name_en ? `${shul.name_he} · ${shul.name_en}` : shul.name_he;

/** The CBS register shouts its transliterations; the page doesn't need to. */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s\-'"(])([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase());
}

export const personLabel = (person: Person) => person.name;

/**
 * Fold a search term and a candidate down to a comparable form. Hebrew is left
 * alone; Latin loses case, accents and the apostrophes that transliterations
 * scatter around ("Modi'in" should match "modiin").
 */
export function searchKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/["'`׳״]/g, '')
    .trim();
}

export function matches(haystack: string[], needle: string): boolean {
  const key = searchKey(needle);
  if (!key) return true;
  return haystack.some((value) => searchKey(value ?? '').includes(key));
}

/** Whether an attendee list is everyone currently marked as family. */
export function isWholeFamily(attendees: string[], people: Person[]): boolean {
  const family = people.filter((p) => p.in_family).map((p) => p.slug);
  return (
    family.length > 0 &&
    family.every((slug) => attendees.includes(slug)) &&
    attendees.length === family.length
  );
}

export function describeAttendees(attendees: string[], people: Person[]): string {
  if (!attendees.length) return '—';
  if (isWholeFamily(attendees, people)) return 'Whole family';
  const byslug = new Map(people.map((p) => [p.slug, p.name]));
  return attendees.map((slug) => byslug.get(slug) ?? slug).join(', ');
}
