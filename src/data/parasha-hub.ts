// The parasha hub (/parasha): every per-parasha resource on the site, joined to the 5787
// reading calendar. The calendar is the PhDs on the Parsha season (Israel schedule), so a
// new sheet, reader or book shows up here as soon as its data file exists.
import season from './phds-on-the-parsha/season-5787.json';
import { books } from './parasha-books/books.mjs';
import { sheets as simonSheets } from './uriel-simon-reader';

const SHEET_FILES = import.meta.glob('./parasha-sheets/*.json', { eager: true, import: 'default' }) as Record<
  string,
  { slug: string }
>;

// Spelling-insensitive key: "Lech Lecha", "lech-lecha" and "Lech-Lecha" all become "lechlecha".
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

// Where the season's spelling differs from the site's slugs or Shnayim Mikra's list.
const SLUG_ALIAS: Record<string, string> = { breishit: 'bereshit' };
const SHNAYIM_NAMES = [
  'Bereshit', 'Noach', 'Lech-Lecha', 'Vayera', 'Chayei Sarah', 'Toldot', 'Vayetze', 'Vayishlach',
  'Vayeshev', 'Miketz', 'Vayigash', 'Vayechi', 'Shemot', "Va'era", 'Bo', 'Beshalach',
  'Yitro', 'Mishpatim', 'Terumah', 'Tetzaveh', 'Ki Tisa', 'Vayakhel', 'Pekudei', 'Vayikra',
  'Tzav', 'Shmini', 'Tazria', 'Metzora', 'Acharei Mot', 'Kedoshim', 'Emor', 'Behar',
  'Bechukotai', 'Bamidbar', 'Nasso', "Beha'alotecha", "Sh'lach", 'Korach', 'Chukat', 'Balak',
  'Pinchas', 'Matot', 'Masei', 'Devarim', "Va'etchanan", 'Eikev', "Re'eh", 'Shoftim',
  'Ki Teitzei', 'Ki Tavo', 'Nitzavim', 'Vayelech', "Ha'azinu", "V'Zot HaBerachah",
];
const SHNAYIM_ALIAS: Record<string, string> = {
  breishit: 'bereshit', vayetzei: 'vayetze', naso: 'nasso', behaalotcha: 'behaalotecha',
  shelach: 'shlach', vayeilech: 'vayelech',
};
const shnayimByKey = Object.fromEntries(SHNAYIM_NAMES.map((n) => [key(n), n]));

const sheetSlugByKey = Object.fromEntries(Object.values(SHEET_FILES).map((s) => [key(s.slug), s.slug]));
const bookByKey = Object.fromEntries(books.map((b: { slug: string }) => [key(b.slug), b]));
const simonByKey = Object.fromEntries(simonSheets.map((s) => [key(s.slug), s]));

export interface Link {
  kind: 'simon' | 'sheet' | 'book' | 'phd' | 'mega' | 'shnayim' | 'sefaria';
  label: string;
  href: string;
  note?: string;
}

export interface Week {
  n: number;
  parsha: string;
  hebrew: string;
  ref: string;
  date: string; // Shabbat it is read (Israel)
  book: string;
  links: Link[];
}

export const weeks: Week[] = season.weeks.map((w: any) => {
  const k = SLUG_ALIAS[key(w.parsha)] ?? key(w.parsha);
  const [book, start] = w.ref.split(' ');
  const chapter = start.split(':')[0];
  const links: Link[] = [];

  const simon = simonByKey[k];
  if (simon) links.push({ kind: 'simon', label: 'Uriel Simon Reader', href: `/uriel-simon/${simon.slug}`, note: simon.title });

  const sheetSlug = sheetSlugByKey[k];
  if (sheetSlug) links.push({ kind: 'sheet', label: 'Parasha sheet', href: `/parasha-sheet/${sheetSlug}` });

  const pb = bookByKey[k];
  if (pb) links.push({ kind: 'book', label: 'Picture book', href: `/parasha-books/${pb.slug}`, note: pb.title });

  if (w.guest?.name) {
    links.push({ kind: 'phd', label: 'PhDs on the Parsha', href: '/phds-on-the-parsha', note: `${w.guest.name}, “${w.guest.title}”` });
  }

  links.push({ kind: 'mega', label: 'Mega Bible', href: `/mega-bible?book=${book}&chapter=${chapter}` });

  const shn = shnayimByKey[SHNAYIM_ALIAS[key(w.parsha)] ?? key(w.parsha)];
  if (shn) links.push({ kind: 'shnayim', label: 'Shnayim Mikra', href: `/shnayim?parsha=${encodeURIComponent(shn)}` });

  const sefariaRef = w.ref.replace(/–/g, '-').replace(/ /g, '_');
  links.push({ kind: 'sefaria', label: 'Sefaria', href: `https://www.sefaria.org/${sefariaRef}` });

  return { n: w.n, parsha: w.parsha, hebrew: w.hebrew, ref: w.ref, date: w.date, book, links };
});

export const BOOKS = [
  { name: 'Bereshit', en: 'Genesis', he: 'בראשית' },
  { name: 'Shemot', en: 'Exodus', he: 'שמות' },
  { name: 'Vayikra', en: 'Leviticus', he: 'ויקרא' },
  { name: 'Bamidbar', en: 'Numbers', he: 'במדבר' },
  { name: 'Devarim', en: 'Deuteronomy', he: 'דברים' },
];

// Series that follow the parasha week by week.
export const series = [
  {
    name: 'The Uriel Simon Reader',
    href: '/uriel-simon',
    kind: 'Reader',
    text: 'A text and a teaching each week, in memory of Prof. Uriel Simon z"l: the verses beside his own words, on two printable pages.',
  },
  {
    name: 'Parasha Sheets',
    href: '/parasha-sheet/noach',
    kind: 'Study sheet',
    text: 'Two-page sheets built from the Mega Bible: word and root counts, the words found nowhere else in Tanakh, what the parasha calls God, and Biblical → Modern Hebrew with National Library evidence.',
  },
  {
    name: 'Parasha Books',
    href: '/parasha-books',
    kind: 'Picture book',
    text: 'Peshat-based picture books for kids, with the pesukim on every page. Upload your own children to star in them.',
  },
  {
    name: 'PhDs on the Parsha',
    href: '/phds-on-the-parsha',
    kind: 'Podcast',
    text: 'One parsha, one guest who wrote a doctorate on it. The full 5787 season schedule.',
  },
];

// Tools that work on any parasha.
export const tools = [
  { name: 'Mega Bible', href: '/mega-bible', text: 'The whole Tanakh in one reader: morphology, literary devices, haftarot by rite, translations, 929 audio.' },
  { name: 'Shnayim Mikra', href: '/shnayim', text: 'The parasha twice in Hebrew and once in Targum Onkelos, one aliyah at a time.' },
  { name: 'Parsha Explorer', href: '/parsha-explorer', text: 'Lemmas, parts of speech and word statistics for any parsha or aliyah.' },
  { name: 'Haftarah Explorer', href: '/haftarah-explorer', text: 'Every haftarah across rites: lengths, overlaps and texts.' },
  { name: 'Parsha Art', href: '/parsha-art', text: "This week's parsha from Sefaria's calendar, with its aliyot and an illustration of its iconic scene." },
  { name: 'The Book of Generations', href: '/genealogies', text: 'Every name in the genealogies of Bereshit and Noach, as a family tree and a timeline.' },
  { name: 'Literary Bible', href: '/literary-bible', text: 'The Hebrew Bible with its literary devices colour-coded.' },
  { name: 'Source Sheet Creator', href: '/source-sheet-creator', text: 'Type a topic and get a printable Hebrew–English source sheet.' },
  { name: 'Jewish Learning Hub', href: '/jewish-learning-hub', text: "Today's whole learning calendar: parasha, Daf Yomi, Mishnah, 929, Rambam and more." },
];
