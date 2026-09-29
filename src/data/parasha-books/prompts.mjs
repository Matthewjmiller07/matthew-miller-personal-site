// Prompt + story helpers shared by the generator script, the illustrate API and the in-browser maker.
import { STYLE } from './books.mjs';

export const MODEL = 'black-forest-labs/flux-2-klein-9b';

export const CAST =
  'the three sisters from the reference image, keeping their exact faces, hair and art style: the 6-year-old big sister with long wavy light-brown hair and a pink bow headband in a modest pink dress with short puffed sleeves; the 2-year-old toddler with dark-brown curly ringlets and a pink bow in a modest floral dress with short puffed sleeves; the one-year-old baby with dark wispy hair in a white short-sleeved onesie';

// "Exactly three children" keeps FLUX from cloning a sister into the background.
export const imagePrompt = (scene, cast = CAST, count = 3) =>
  `${scene}. Exactly ${['', 'one child', 'two children', 'three children'][count]}, no other children. Characters: ${cast}. ${STYLE}`;

export const ROLES = ['big', 'mid', 'baby'];
const ROLE_WORDS = {
  big: 'the oldest child',
  mid: 'the younger child',
  baby: 'the baby',
};
const COUNT = ['', 'the child', 'the two children', 'the three children'];

// Retarget a scene written for "the three sisters" at an uploaded cast.
// people: [{ role: 'big'|'mid'|'baby' }], sisters: keep "sister" wording.
export function adaptScene(scene, people, sisters = false) {
  const has = new Set(people.map((p) => p.role));
  let parts = scene.split(/,\s|;\s/);
  if (!has.has('mid')) parts = parts.filter((s) => !/toddler/.test(s));
  if (!has.has('baby')) parts = parts.filter((s) => !/\bbaby\b/.test(s));
  let out = parts.join(', ');
  if (!sisters) {
    out = out
      .replace(/the three sisters/g, COUNT[people.length])
      .replace(/the older girl|the big sister/g, ROLE_WORDS.big)
      .replace(/her big sister/g, ROLE_WORDS.big)
      .replace(/the toddler/g, ROLE_WORDS.mid);
  } else if (people.length !== 3) {
    out = out.replace(/the three sisters/g, people.length === 2 ? 'the two sisters' : 'the girl');
  }
  return out;
}

export function customCast(people) {
  const desc = people.map((p) => `${ROLE_WORDS[p.role]}${p.name ? ` (${p.name})` : ''}`).join(', ');
  return `the children from the reference character sheet, keeping their exact faces, skin tone, hair, clothing and art style: ${desc}`;
}

export function castSheetPrompt(people) {
  const order = people.map((p, i) => `${['left', 'middle', 'right'][i]}: ${ROLE_WORDS[p.role]} from reference photo ${i + 1}`).join('; ');
  return `Children's picture-book character sheet of the ${people.length === 1 ? 'child' : `${people.length} children`} from the reference photos, full body, standing side by side on a plain cream background — ${order}. Keep each child's real facial features, face shape, skin tone and hair from their own photo. Modest clothing with sleeves. Warm gouache and watercolor storybook illustration, soft painterly edges, gentle light, expressive, no text.`;
}

// Story text: fill names; drop sentences about roles nobody is playing; optionally de-sister.
export function adaptStory(text, cast, sisters = true) {
  const missing = ROLES.filter((r) => !cast[r]?.name).map((r) => `{${r.toUpperCase()}}`);
  let out = text;
  if (missing.length) {
    const sentences = out.match(/[^.!?]+[.!?]+["”']?\s*/g) || [out];
    out = sentences.filter((s) => !missing.some((m) => s.includes(m))).join('');
  }
  if (!sisters) {
    out = out
      .replace(/the three sisters/gi, (m) => (m[0] === 'T' ? 'The explorers' : 'the explorers'))
      .replace(/her sister's/g, 'her friend\'s')
      .replace(/\bsisters\b/g, 'friends')
      .replace(/\bsister\b/g, 'friend');
  }
  return out
    .replaceAll('{BIG}', cast.big?.name || '')
    .replaceAll('{MID}', cast.mid?.name || '')
    .replaceAll('{BABY}', cast.baby?.name || '')
    .trim();
}
