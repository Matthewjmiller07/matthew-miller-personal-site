// Prompt + story helpers shared by the generator script, the illustrate API and the in-browser maker.
import { STYLE, tell } from './books.mjs';

// Uploaded casts run on the cheaper 4B model; the stock books were drawn with 9B (scripts/parasha-books/generate.mjs).
export const MODEL = 'black-forest-labs/flux-2-klein-4b';

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
  if (people.length === 1) {
    return out
      .replace(/the three sisters/g, 'the child')
      .replace(/the older girl|the big sister|her big sister/g, 'the child');
  }
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

const DEFAULT_AGE = { big: 7, mid: 3, baby: 1 };
const who = (p) => {
  const age = p.age || DEFAULT_AGE[p.role];
  return `${p.name || ROLE_WORDS[p.role]}, about ${age} year${age === 1 ? '' : 's'} old${p.look ? `: ${p.look}` : ''}`;
};

// Pages are drawn from the approved sheet (image 1) plus each child's photo (images 2…).
// Tested on 4B: calling image 1 a "sheet" or mentioning its two views makes FLUX paint the child twice;
// "the child in image 1, drawn exactly as there" gives one child who still looks like the photo.
export function customCast(people) {
  if (people.length === 1) {
    return `the child in image 1, drawn exactly as there — same face, skin tone, hair, clothing and art style (image 2 is their real photo, for their face): ${who(people[0])}`;
  }
  const photos = people.map((p, i) => `image ${i + 2} is ${p.name || ROLE_WORDS[p.role]}`).join(', ');
  return `the ${people.length} children in image 1, each drawn exactly as there — same faces, skin tone, hair, clothing and art style (their real photos, for their faces: ${photos}): ${people.map(who).join('; ')}`;
}

// What worked in testing (FLUX.2 klein 4B): a two-view sheet — big waist-up portrait + full body — per child,
// the photo as the identity reference, the child's features written out, and "realistic proportions for their age".
// Full-body-only sheets drift into generic chibi faces.
export function castSheetPrompt(people, notes = '') {
  const n = people.length;
  const layout =
    n === 1
      ? "Character sheet of the child in image 1 for a children's picture book, two views of the same child side by side on a plain cream background: on the left a large waist-up portrait facing the viewer, on the right the same child full body standing."
      : `Character sheet of the ${n} children in the reference photos (${people.map((p, i) => `image ${i + 1} is ${p.name || ROLE_WORDS[p.role]}`).join('; ')}) for a children's picture book, on a plain cream background, left to right in that order: for each child a large waist-up portrait facing the viewer, with the same child full body standing next to it.`;
  return `${layout} Preserve each child's identity exactly from their own photo: face shape, eyes, eyebrows, nose, lips, skin tone, hair, hairline and accessories. ${people.map(who).join('. ')}. Realistic child proportions for their age (not chibi, normal-sized heads). Modest clothing with sleeves, true to the photo. Warm gouache and watercolor, soft painterly edges, gentle warm light. Only ${n === 1 ? 'this one child' : `these ${n} children`}, no text.${notes ? ` Make sure: ${notes}.` : ''}`;
}

// Edit an existing sheet (the image after the photos) with the reader's notes; the photos stay the truth for faces.
export function sheetFixPrompt(people, notes) {
  const n = people.length;
  const sheet = n + 1;
  return `Image ${sheet} is a picture-book character sheet of the ${n === 1 ? 'child in image 1' : `children in images 1 to ${n}`}. Edit image ${sheet}: ${notes}. Make each face match their photo even more closely — face shape, eyes, nose, mouth, skin tone, hair. Otherwise keep the layout, poses, clothing and watercolor style of image ${sheet} unchanged. No text.`;
}

// Story text for an uploaded cast (see tell() in books.mjs for the markup).
export const adaptStory = (text, cast, sisters = true) => tell(text, cast, sisters);
