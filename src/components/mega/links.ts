// Cross-links between the Mega readers: turn a Sefaria ref into a link to the reader that holds it.
import talmudToc from '../../data/mega-talmud/toc.json';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const BAVLI = new Set(talmudToc.sedarim.flatMap((s) => s.tractates.map((t) => t.name)));
const TANAKH = new Set([
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings',
  'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
  'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel',
  'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles',
]);

export type MegaLink = { href: string; label: string };

export function megaLink(ref: string): MegaLink | null {
  let m = ref.match(/^Mishnah (.+?) (\d+):(\d+)/);
  if (m) return { href: `/mega-mishnah?t=${slug('Mishnah ' + m[1])}&p=${m[2]}&m=${m[3]}`, label: 'Mega Mishnah' };
  m = ref.match(/^Mishneh Torah, (.+?) (\d+)(?::(\d+))?/);
  if (m) return { href: `/mega-maimonides?s=${slug(m[1])}&c=${m[2]}${m[3] ? `&h=${m[3]}` : ''}`, label: 'Mega Maimonides' };
  m = ref.match(/^(.+?) (\d+)([ab])(?::(\d+))?/);
  if (m && BAVLI.has(m[1])) return { href: `/mega-talmud?t=${slug(m[1])}&d=${m[2]}${m[4] ? `&s=${m[2]}${m[3]}:${m[4]}` : ''}`, label: 'Mega Talmud' };
  m = ref.match(/^(.+?) (\d+):(\d+)/);
  if (m && TANAKH.has(m[1])) {
    // Mega Bible names the numbered books "1 Samuel", Sefaria "I Samuel".
    const book = m[1].replace(/^II /, '2 ').replace(/^I /, '1 ');
    return { href: `/mega-bible?book=${encodeURIComponent(book)}&chapter=${m[2]}&verse=${m[3]}`, label: 'Mega Bible' };
  }
  return null;
}
