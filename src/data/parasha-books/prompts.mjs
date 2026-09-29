// Prompt + story helpers shared by the generator script, the illustrate API and the in-browser maker.
import { STYLE, tell } from './books.mjs';

// Uploaded casts run on GPT Image 2 at low quality — in side-by-side tests it kept a child's face across pages far
// better than FLUX.2 klein 4B, for about a cent an image. The stock books were drawn with FLUX.2 klein 9B
// (scripts/parasha-books/generate.mjs).
export const MODEL = 'openai/gpt-image-2';

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
// Scenes may carry [[plural|solo]] choices, like story text.
export const pickScene = (scene, n = 3) => scene.replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, (_, many, one) => (n > 1 ? many : one));

export function adaptScene(scene, people, sisters = false) {
  scene = pickScene(scene, people.length);
  const has = new Set(people.map((p) => p.role));
  let parts = scene.split(/,\s|;\s/);
  if (!has.has('mid')) parts = parts.filter((s) => !/toddler/.test(s));
  if (!has.has('baby')) parts = parts.filter((s) => !/\bbaby\b/.test(s));
  let out = parts.join(', ');
  if (people.length === 1) {
    return out
      .replace(/,? (holding hands|hand in hand)( in a row)?/g, '')
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
export function customCast(people, notes = '') {
  const one = people.length === 1;
  const names = people.map((p) => p.name || ROLE_WORDS[p.role]);
  const refs = one
    ? `${names[0]} from the character sheet (image 1) — the same face, hair, accessories and the same outfit; image 2 is their real photo, for the face`
    : `${names.join(', ')} from the character sheet (image 1) — each with the same face, hair, accessories and outfit as there; their real photos, for their faces, are ${names.map((n, i) => `image ${i + 2} (${n})`).join(', ')}`;
  return `${refs}. ${people.map(who).join('; ')}${notes ? `. As approved: ${notes}` : ''}. Draw ${one ? 'them' : 'each child'} exactly once, face clearly visible, never from behind. Only ${one ? 'they look' : 'the children look'} like the reference — every other figure (angels, grown-ups, animals) has a completely different face, hair and clothing. Keep the look of a hand-painted storybook illustration, not photorealistic`;
}

// What worked in testing (FLUX.2 klein 4B, and kept for GPT Image 2): a two-view sheet — big waist-up portrait + full body — per child,
// the photo as the identity reference, the child's features written out, and "realistic proportions for their age".
// Full-body-only sheets drift into generic chibi faces. The reader's notes lead the prompt (and win over the photo
// for clothing), and both views must share one outfit, with nothing carried over from the photo but the child.
export function castSheetPrompt(people, notes = '') {
  const n = people.length;
  const layout =
    n === 1
      ? "Character sheet of the child in image 1 for a children's picture book, two views of the same child side by side on a plain cream background: on the left a large waist-up portrait facing the viewer, on the right the same child full body standing."
      : `Character sheet of the ${n} children in the reference photos (${people.map((p, i) => `image ${i + 1} is ${p.name || ROLE_WORDS[p.role]}`).join('; ')}) for a children's picture book, on a plain cream background, left to right in that order: for each child a large waist-up portrait facing the viewer, with the same child full body standing next to it.`;
  const wish = notes ? ` Required changes, applied to every view: ${notes}.` : '';
  return `${layout}${wish} Preserve each child's identity exactly from their own photo: face shape, eyes, eyebrows, nose, lips, skin tone, hair, hairline and accessories. ${people.map(who).join('. ')}. Realistic child proportions for their age (not chibi, normal-sized heads). Each child wears one outfit, identical in the portrait and the full-body view (the portrait shows the same neckline and sleeves) — ${notes ? 'as required above, otherwise ' : ''}modest, with sleeves; do not copy the clothes from the photo unless they fit. Leave out everything else from the photos: no pets, toys, objects or background. Hand-painted storybook illustration in warm gouache and watercolor, soft painterly edges, gentle warm light, not photorealistic. Only ${n === 1 ? 'this one child' : `these ${n} children`}, no text.`;
}

// Edit an existing sheet (the image after the photos) with the reader's notes; the photos stay the truth for faces.
export function sheetFixPrompt(people, notes) {
  const n = people.length;
  const sheet = n + 1;
  return `Image ${sheet} is a picture-book character sheet of the ${n === 1 ? 'child in image 1' : `children in images 1 to ${n}`}, drawn twice per child (portrait and full body). Change image ${sheet}: ${notes}. Apply the change to both views of ${n === 1 ? 'the child' : 'each child'}, so they match each other. Keep each face true to their photo — face shape, eyes, nose, mouth, skin tone, hair — and keep the layout and watercolor style. Remove any pets, toys or objects. No text.`;
}

// Story text for an uploaded cast (see tell() in books.mjs for the markup).
export const adaptStory = (text, cast, sisters = true) => tell(text, cast, sisters);
