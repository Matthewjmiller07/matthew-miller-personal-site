import likuteiPeshatimEvents from '../data/likutei-peshatim/events.json';
import raananaGaniYolaEvents from '../data/raanana-gani-yola/events.json';

export const siteBase = 'https://theothermatthewmiller.com';

// `slug` is the path segment used at /calendars/<slug>/ — keep it stable
// once published, since it's a public URL people may subscribe/link to.
const rawCalendars = [
  {
    slug: 'JewishHolidays',
    id: 'jewish_holidays',
    name: 'Jewish Holidays — Work-Impacting Days',
    description: 'Every Jewish holiday that affects the work week, 2026–2030, served live by my whenarethejewishholidays.com API. Each event includes the Hebrew date, a short description, and whether work is traditionally prohibited. Want Chol HaMoed, fasts, or the Israeli scheme included? The feed URL takes API parameters — see the docs.',
    file: 'https://whenarethejewishholidays.com/api/v1/calendar.ics?from=2026&to=2030',
    external: true,
    source: 'https://whenarethejewishholidays.com',
    tags: ['Jewish', 'Holidays', 'Live API'],
    eventCount: 65,
    note: 'Generated on demand — subscribing keeps it current automatically. API docs at whenarethejewishholidays.com/docs.',
  },
  {
    slug: 'HayomYom',
    id: 'hayom_yom',
    name: 'Hayom Yom — Tackling Life\'s Tasks',
    description: 'Daily Chassidic teachings from the Lubavitcher Rebbe. Each event links directly to the corresponding entry on Chabad.org. Covers the full Hebrew year cycle: 19 Kislev 5786 through 18 Kislev 5787, plus Adar I entries for leap year 5787.',
    file: '/calendar/hayom_yom.ics',
    source: 'https://www.chabad.org/therebbe/article_cdo/aid/3314961/jewish/Hayom-Yom-Tackling-Lifes-Tasks.htm',
    tags: ['Jewish', 'Chassidic', 'Daily Study'],
    eventCount: 384,
    note: 'Adar entries (Feb/Mar 2026) serve as regular Adar in non-leap years. Adar I entries (Feb/Mar 2027) are for the 5787 leap year.',
  },
  {
    slug: 'LikuteiPeshatim',
    id: 'likutei_peshatim',
    name: 'Likutei Peshatim — Community Events',
    description: 'Dated events parsed weekly from the Hebrew Theological College (HTC) Likutei Peshatim newsletter: shiurim, drashos, fast-day schedules, community events, and yahrzeits for the Chicago Orthodox community.',
    file: '/calendar/likutei_peshatim.ics',
    source: 'https://htc.edu',
    tags: ['Jewish', 'Chicago', 'Community', 'Weekly'],
    eventCount: likuteiPeshatimEvents.length,
    note: 'Auto-updated weekly from the newsletter. Includes shiurim/drashos, fast-day schedules, races, and yahrzeits with best-effort date parsing — always double-check exact times with the source shul/organization. Each event\'s calendar description includes the source text it was parsed from.',
  },
  {
    slug: 'RaananaYola',
    id: 'raanana_gani_yola',
    name: 'Gani Yol"a Raanana — School Calendar (תשפ"ז)',
    nameHe: 'גני יול"א רעננה — לוח שנת הלימודים (תשפ"ז)',
    description: 'Vacation days, extended-day (Yol"a) activity-hour windows, and holidays for Raanana\'s Gani Yol"a kindergarten program, school year 5787 (2026–2027). Transcribed from the municipality\'s official school-year calendar.',
    descriptionHe: 'ימי חופשה, שעות פעילות יול"א מורחבת וחגים עבור גני יול"א ברעננה, שנת הלימודים תשפ"ז (2026–2027). מועתק מלוח השנה הרשמי של העירייה.',
    file: '/calendar/raanana_gani_yola.ics',
    fileHe: '/calendar/raanana_gani_yola_he.ics',
    source: 'https://www.raanana.muni.il',
    tags: ['Raanana', 'School', 'Kindergarten'],
    eventCount: raananaGaniYolaEvents.length,
    note: 'Static for the 5787 school year — re-transcribed each year from the municipality\'s calendar, not auto-updated. Hanukkah and Purim party dates are set by the kindergarten staff closer to the time and aren\'t included. Per Ministry of Education/Yol"a policy, during vacation weeks there is no kindergarten activity on Fridays (this doesn\'t apply to regular in-session Fridays).',
    noteHe: 'לוח סטטי לשנת הלימודים תשפ"ז — מועתק מחדש מדי שנה מלוח העירייה, אינו מתעדכן אוטומטית. מועדי מסיבות חנוכה ופורים נקבעים ע"י צוות הגן בסמוך למועד ואינם כלולים כאן. על פי מדיניות משרד החינוך/יול"א, בשבועות החופשה אין פעילות יול"א בימי שישי (אינו חל על ימי שישי רגילים בזמן לימודים).',
  },
];

export function getCalendars() {
  return rawCalendars.map(cal => {
    const icsHttps = cal.external ? cal.file : `${siteBase}${cal.file}`;
    const result = { ...cal, icsHttps, icsWebcal: icsHttps.replace(/^https:/, 'webcal:') };
    if (cal.fileHe) {
      const icsHttpsHe = cal.external ? cal.fileHe : `${siteBase}${cal.fileHe}`;
      result.icsHttpsHe = icsHttpsHe;
      result.icsWebcalHe = icsHttpsHe.replace(/^https:/, 'webcal:');
    }
    return result;
  });
}

export function getCalendarBySlug(slug) {
  return getCalendars().find(cal => cal.slug === slug);
}
