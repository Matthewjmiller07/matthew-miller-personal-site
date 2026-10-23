// The Painted Torah: Jev art-directs a painting for every chapter of the Torah. One request per chapter
// picks the most paintable verse (a Choice over the chapter's own verses) and, for that same moment, the
// setting, time of day, atmosphere, composition, palette, painting tradition, tension and scale. Code turns
// the answers into a FLUX.2 [klein] 4B prompt. Shared by scripts/painted-torah/build.mjs and /painted-torah.

const MOMENT = 'the single most paintable moment in `chapter` (the scene a painter would choose to show this chapter)';

export const OPTIONS = {
  setting: {
    garden: ['Garden', 'a lush garden with rivers and fruit trees'],
    wilderness: ['Wilderness', 'an open desert wilderness of sand and rock'],
    mountain: ['Mountain', 'a great mountain rising from the desert'],
    river: ['River', 'the banks of a great river, reeds and water'],
    sea: ['Sea', 'the open sea and its shore'],
    field: ['Fields', 'fields and pastures with flocks'],
    well: ['Well', 'a desert well or spring among palms'],
    camp: ['Tents', 'a camp of tents in the desert'],
    city: ['City', 'an ancient walled city with gates and streets'],
    palace: ['Palace', 'the hall of an Egyptian palace with columns'],
    sanctuary: ['Sanctuary', 'the Tabernacle courtyard, its altar and curtains'],
    cosmos: ['Cosmos', 'the sky, the waters and the newly made world, with no people'],
  },
  time: {
    dawn: ['Dawn', 'at dawn, first light low on the horizon'],
    day: ['Day', 'in bright daylight'],
    dusk: ['Dusk', 'at dusk, long warm shadows'],
    night: ['Night', 'at night, under stars or moonlight'],
    timeless: ['Timeless', 'in timeless, sourceless light'],
  },
  atmosphere: {
    clear: ['Clear', 'clear still air'],
    storm: ['Storm', 'storm and wind, churning sky'],
    fire: ['Fire', 'fire, smoke and glowing embers'],
    cloud: ['Cloud', 'heavy cloud and mist'],
    water: ['Flood', 'rain, flood or crashing water'],
    haze: ['Haze', 'dust and desert haze'],
    darkness: ['Darkness', 'deep darkness pierced by a single light'],
  },
  shot: {
    vista: ['Vista', 'a vast landscape with tiny distant figures'],
    multitude: ['Multitude', 'a great crowd, a whole people in motion'],
    group: ['Group', 'a small group of two to four people'],
    figure: ['One figure', 'a single figure'],
    detail: ['Detail', 'a close-up on one object or gesture'],
    empty: ['No people', 'nature alone, no people'],
  },
  palette: {
    ochre: ['Ochre & gold', 'ochre, sand and burnished gold'],
    night: ['Indigo', 'deep indigo and silver'],
    verdant: ['Green', 'emerald, olive and fresh green'],
    ember: ['Ember', 'crimson, ember orange and ash'],
    pearl: ['Pearl', 'pearl white, pale blue and silver'],
    earth: ['Earth', 'umber, clay and warm brown'],
    sea: ['Sea', 'teal, turquoise and foam white'],
  },
  style: {
    chiaroscuro: ['Chiaroscuro oil', 'a Rembrandt-like chiaroscuro oil painting, figures emerging from darkness'],
    luminist: ['Luminous landscape', 'a luminous Romantic landscape painting in the manner of Turner, light dissolving the scene'],
    manuscript: ['Jewel-toned oil', 'a richly detailed Orientalist oil painting in jewel tones and gold, in the manner of Gérôme'],
    fresco: ['Fresco', 'a faded Roman-era wall painting on plaster, soft earthy pigments, like the frescoes of Pompeii'],
    woodcut: ['Expressionist', 'a dark expressionist oil painting with heavy black outlines, in the manner of Rouault'],
    watercolor: ['Ink & watercolour', 'a loose ink and watercolour painting with soft washes'],
    mosaic: ['Mosaic', 'an ancient floor mosaic of small stone tesserae'],
  },
};

const choice = (instructions, opts, describe) => ({
  type: 'choice',
  instructions,
  criteria: Object.fromEntries(Object.entries(opts).map(([k, [, d]]) => [k, describe ? describe[k] || d : d])),
});

/** Jev questions for one chapter. `verses` is [[n, text], ...]; the moment is a Choice over them. */
export function questions(verses) {
  return {
    moment: {
      type: 'choice',
      instructions: {
        question: 'Which verse of `chapter` gives the most vivid, specific visual moment to paint?',
        prefer: 'A concrete scene with people, places or objects you could actually see. Suitable for a family audience.',
        avoid: 'Verses that are only lists, genealogies, numbers, laws or speech with nothing visible, unless the chapter has nothing better. Violence, nudity or intimacy.',
      },
      criteria: Object.fromEntries(verses.map(([n, t]) => [`v${n}`, t.length > 320 ? `${t.slice(0, 317)}…` : t])),
    },
    setting: choice(`Picture ${MOMENT}. Where does it take place?`, OPTIONS.setting),
    time: choice(`Picture ${MOMENT}. What time of day is it, or the light it should be painted in?`, OPTIONS.time),
    atmosphere: choice(`Picture ${MOMENT}. What is the air and weather of the scene?`, OPTIONS.atmosphere),
    shot: choice(`Picture ${MOMENT}. How should a painter compose it?`, OPTIONS.shot),
    palette: choice(`Picture ${MOMENT}. Which colour palette suits it best?`, OPTIONS.palette),
    style: choice(`Picture ${MOMENT}. Which painting tradition would show it best, given its mood and subject?`, OPTIONS.style, {
      chiaroscuro: 'Chiaroscuro oil: intimate human drama, faces, night, inner conflict',
      luminist: 'Luminous landscape: vast nature, sea, sky, storms and wonders',
      manuscript: 'Jewel-toned oil: ceremony, the sanctuary, lists made beautiful, festive or sacred order',
      fresco: 'Fresco: national events, processions, Egypt, the Exodus told as a story',
      woodcut: 'Expressionist: harsh judgement, fear, rebellion, plague and punishment',
      watercolor: 'Ink & watercolour: quiet pastoral and family moments, journeys, wells and flocks',
      mosaic: 'Mosaic: creation, the order of the world, symbolic and timeless scenes',
    }),
    tension: {
      type: 'score',
      instructions: `Picture ${MOMENT}. How much tension or danger does it carry?`,
      criteria: [
        'Serene: peace, rest, blessing or quiet ritual',
        'Gentle: a calm moment with some feeling or expectation',
        'Charged: conflict, longing, fear or a hard choice is in the air',
        'Dramatic: confrontation, flight, grief or a sudden turn',
        'Terrifying: catastrophe, judgement, death or overwhelming power',
      ],
    },
    scale: {
      type: 'score',
      instructions: `Picture ${MOMENT}. How large is the scale of what is happening?`,
      criteria: [
        'Intimate: one or two people, a private moment',
        'Family: a household or a few people',
        'Tribal: a clan, a camp, a city',
        'National: the whole people of Israel or an empire',
        'Cosmic: the world itself, sky, sea and creation',
      ],
    },
    divine: {
      type: 'noul',
      instructions: `Picture ${MOMENT}. Is God's presence a visible part of the scene (a voice from fire or cloud, glory on the mountain, a pillar of fire, an angel, miraculous light)?`,
      criteria: {
        true: 'The divine presence is something the painting must show (as fire, cloud, light or an angel).',
        false: 'The scene is human and natural; nothing miraculous needs to be shown.',
      },
    },
  };
}

const TENSION = ['serene', 'gentle', 'charged', 'dramatic', 'terrifying'];
const SCALE = ['intimate', 'familial', 'tribal', 'national', 'cosmic'];
const level = (words, x) => words[Math.max(0, Math.min(words.length - 1, Math.round(x)))];

// The verse as a scene for the image model. FLUX.2 [klein] copies whole sentences into the picture as
// captions, so the verse becomes a lowercase run of words: quoted speech and speech verbs are dropped,
// and divine names are deleted (any word for the divine makes the model paint figures in the sky), so God
// is never drawn as a person. The prompt is all positive phrasing (the distilled model treats "no X" as "X").
// The page itself always shows the real verse.
export function sceneText(verse) {
  return verse
    .replace(/[“"][^”"]*[”"]?/g, ' ')
    .replace(/[‘'][^’']{12,}[’']/g, ' ')
    .replace(/\b(angels?)\s+of\s+(?:the\s+)?(?:ETERNAL|LORD|Lord|GOD|God)\b/g, '$1')
    .replace(/\b(?:before|to|unto|by|of|from|with)\s+(?:the\s+)?(?:ETERNAL|LORD|Lord|GOD|God)(?:\s+(?:your|our|their|his|my)?\s*God)?\b/g, ' ')
    .replace(/\b(?:the\s+)?(?:ETERNAL|LORD|Lord|GOD)(?:\s+(?:your|our|their|his|my)?\s*God)?\b/g, ' ')
    .replace(/\b(?:your|our|their|his|my|the)\s+(?:God|GOD)\b/g, ' ')
    .replace(/\b(?:God|GOD)\b/g, ' ')
    .replace(/\bheaven\b/gi, 'sky')
    // phrases the model takes literally as a figure floating in the sky
    .replace(/\bwho\s+(?:led|brought|took|carried)\s+(?:you|us|them|him)\b/gi, ' ')
    .replace(/\bexalted\b/gi, 'chief')
    .replace(/\b(?:said|says|saying|spoke|speak|told|answered|replied|called out|commanded|declared)\b(?:\s+(?:to|unto)\s+(?:\w+\s+){0,3}?\w+)?/gi, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/[—–;:,.!?()]/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase()
    .split(' ').slice(0, 24).join(' ');
}
const ANGEL = /\b(angel|angels|cherub|cherubim)\b/i;   // not "messenger" (human envoys) or "seraph serpents"

/** The FLUX prompt for a chapter, built only from Jev's answers and the chosen verse. */
export function buildPrompt({ verse, a }) {
  const o = (k) => OPTIONS[k][a[k]][1];
  const people = !(a.shot === 'empty' || a.setting === 'cosmos');
  return [
    `${o('style')}, a full-bleed painting depicting ${sceneText(verse)};`,
    `${o('setting')}, ${o('time')}, ${o('atmosphere')};`,
    `${o('shot')}; ${level(TENSION, a.tension)} mood, ${level(SCALE, a.scale)} in scale; palette of ${o('palette')};`,
    people ? 'ancient Near East, every person in simple modest robes and head coverings;' : 'an empty world of land, water and sky;',
    /\bcherub/i.test(verse) ? 'the cherubim two golden statues with outspread wings;'
      : ANGEL.test(verse) ? 'the angel a tall fully robed figure of soft light;' : '',
    a.divine >= 0.5 ? 'a towering pillar of fire or a blazing bright cloud;' : '',
  ].filter(Boolean).join(' ').replace(/;$/, '.');
}

export const BOOKS = [['Genesis', 50, 'בראשית'], ['Exodus', 40, 'שמות'], ['Leviticus', 27, 'ויקרא'], ['Numbers', 36, 'במדבר'], ['Deuteronomy', 34, 'דברים']];

// The parsha a painting belongs to, by the verse it actually paints (a chapter can straddle two
// parshiyot). `weeks` is the season calendar: [{ parsha, hebrew, ref: "Genesis 6:9–11:32" }, ...].
export const parshaSlug = (s) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
export function parshaOf(weeks, book, ch, v) {
  const at = ch * 1000 + v;
  return weeks.find((w) => {
    const m = w.ref.match(/^(\w+) (\d+):(\d+)[–-](?:(\d+):)?(\d+)$/);
    if (!m || m[1] !== book) return false;
    const from = +m[2] * 1000 + +m[3], to = +(m[4] || m[2]) * 1000 + +m[5];
    return at >= from && at <= to;
  });
}
