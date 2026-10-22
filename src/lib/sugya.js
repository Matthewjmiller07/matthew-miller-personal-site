// The sugya map: what Jev is asked about each segment of a daf, and how the answers are drawn.
// Shared by /api/mega-talmud-jev, scripts/talmud/sugya-map.mjs, /mega-talmud and /mega-talmud/flow.

export const MOVE_QUESTION = {
  type: 'choice',
  instructions:
    'What move does `segment` make in the Talmudic discussion? `previous` is the segment just before it, for context.',
  criteria: {
    mishnah: 'It quotes or presents the Mishnah that the Gemara is about to discuss.',
    question: 'It raises a question, difficulty, or challenge (kashya), or asks for a source or reason.',
    answer: 'It answers or resolves a question or difficulty that was just raised.',
    verse: 'It derives a law or idea from a verse in the Torah or Tanakh.',
    baraita: 'It cites a tannaitic teaching (a baraita or Tosefta) as evidence or as a challenge.',
    dispute: 'It sets out two or more opinions that disagree.',
    ruling: 'It states the practical halakha or the conclusion of the discussion.',
    story: 'It tells a story, an incident, or an aggadic teaching.',
    explanation: 'It clarifies a term, a case, or the meaning of what was said, without moving the argument forward.',
  },
};

export const NEW_SUGYA_QUESTION = {
  type: 'noul',
  instructions: 'Does `segment` begin a new topic of discussion, rather than continuing the topic of `previous`?',
  criteria: {
    true: 'It opens a new subject, a new mishnah, a new statement under discussion, or an unrelated story.',
    false: 'It continues, challenges, or answers the discussion already under way.',
  },
};

export const MOVE_ORDER = Object.keys(MOVE_QUESTION.criteria);

export const MOVE_LABELS = {
  mishnah: 'Mishnah', question: 'Question', answer: 'Answer', verse: 'From a verse', baraita: 'Baraita',
  dispute: 'Dispute', ruling: 'Ruling', story: 'Story', explanation: 'Explanation',
};

// Palettes are listed in MOVE_ORDER. Viewers can pick one or override single colours (localStorage).
export const PALETTES = {
  classic: { name: 'Classic', colors: ['#5b4a8a', '#b5452b', '#2f7a4f', '#2b6a9a', '#7a5a2b', '#a8327a', '#1f5f5f', '#c27a12', '#7d7468'] },
  illuminated: { name: 'Illuminated manuscript', colors: ['#3b2a6b', '#9c2a1c', '#2e5e3a', '#1f4f8a', '#8a6a2a', '#7a2a5a', '#14454a', '#c9a257', '#b8ab92'] },
  vivid: { name: 'Vivid', colors: ['#6a4cff', '#ff4d3d', '#18b36b', '#1c8cff', '#a86b2d', '#ff3da8', '#00a3a3', '#ffb000', '#9a9a9a'] },
  okabeIto: { name: 'Colour-blind safe', colors: ['#000000', '#d55e00', '#009e73', '#0072b2', '#8c6b2e', '#cc79a7', '#56b4e9', '#e69f00', '#bbbbbb'] },
  ink: { name: 'Ink & parchment', colors: ['#1d1a14', '#7a2e1f', '#4f5e3a', '#3c4f63', '#6b5536', '#6a3b52', '#2f4a48', '#a77b2f', '#c9bfa9'] },
};

export const COLOR_KEY = 'sugya-colors:v1';
export const MIN_SURE = 0.45;   // below this, a move is drawn faded / marked "?"
export const NEW_SUGYA = 0.5;   // Noul threshold for a sugya break
