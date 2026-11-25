// The Mishneh Torah, read by Jev. Every halakha of all fourteen books goes to TypeSafe's Jev model as
// state, with one request asking the questions below at once. Code (scripts/mishneh-torah/analyze.mjs)
// aggregates the answers into the insights and generative art on /mishneh-torah.

export const VOICE = {
  command: ['Command', 'An obligation: something a person or court must do.'],
  prohibition: ['Prohibition', 'A prohibition: something one must not do, or that is forbidden or invalid.'],
  definition: ['Definition', 'Defines a term, a category, a measure or a boundary (what counts as X, how much, which kinds).'],
  procedure: ['Procedure', 'Describes how something is done, step by step: a ritual, a process, a court procedure.'],
  case: ['Case', 'Rules on a specific case or scenario: "if a person did X and then Y, then..."'],
  reason: ['Reason', 'Explains why: the purpose, rationale or logic behind a law.'],
  belief: ['Belief', 'Teaches what to believe or know: God, prophecy, the world, the soul, the future.'],
  ethic: ['Character', 'Exhorts or describes good character, piety, or how a wise person behaves.'],
  history: ['History', 'Tells history, a chain of tradition, or a story about the past.'],
};

export const REALM = {
  mind: ['Mind', 'thought, knowledge, belief, intention, the heart and character'],
  body: ['Body', 'the human body: illness, death, birth, blood, skin, eating as an act'],
  food: ['Food', 'food and drink: what may be eaten, meat, wine, bread, produce as food'],
  creatures: ['Creatures', 'animals: livestock, birds, fish, insects, slaughter, offerings of animals'],
  land: ['Land', 'fields, crops, trees, seeds, the soil and its produce'],
  things: ['Objects', 'vessels, clothing, tools, scrolls, garments, physical objects'],
  money: ['Money', 'money, property, debts, sales, wages, damages, ownership'],
  places: ['Places', 'buildings, the Temple, cities, houses, courtyards, the Land of Israel'],
  time: ['Time', 'days, Shabbat, festivals, years, the calendar, the hours of the day'],
  words: ['Words', 'speech, oaths, vows, blessings, prayer, testimony, documents and writing'],
  people: ['People', 'relationships between people: family, marriage, court, king, community, servants'],
};

export const ACTOR = {
  everyone: ['Everyone', 'every Jew, any person'],
  priest: ['Priests', 'kohanim, Levites, the High Priest'],
  court: ['Court', 'judges, a court, the Sanhedrin, witnesses'],
  king: ['King', 'the king, the nation, an army, a prophet'],
  householder: ['Householder', 'an owner, farmer, buyer, seller, employer or borrower'],
  family: ['Family', 'husband, wife, parents, children'],
  sage: ['Sage', 'a Torah scholar, a teacher, a student, a wise or pious person'],
  nobody: ['No one', 'no one in particular: it describes things, not what a person does'],
};

const choice = (instructions, opts) => ({
  type: 'choice',
  instructions,
  criteria: Object.fromEntries(Object.entries(opts).map(([k, [l, d]]) => [k, `${l}: ${d}`])),
});

export const HALAKHA_QUESTIONS = {
  voice: choice('What is `halakha` mainly doing?', VOICE),
  realm: choice('What part of the world is `halakha` mostly about?', REALM),
  actor: choice('Who is `halakha` addressed to, or about whose actions is it?', ACTOR),
  abstraction: {
    type: 'score',
    instructions: 'How concrete or abstract is `halakha`?',
    criteria: [
      'Physical: things you could touch, measure or see',
      'Mostly concrete: a physical situation with some legal reasoning',
      'Mixed: concrete cases and abstract principles together',
      'Mostly abstract: principles, categories and legal concepts',
      'Abstract: pure thought, belief, philosophy or theology',
    ],
  },
  stakes: {
    type: 'score',
    instructions: 'How high are the stakes in `halakha`: what happens if it is broken or ignored?',
    criteria: [
      'None: a description, definition or good advice; nothing is at stake',
      'Minor: a rabbinic matter, an invalid act that is simply repeated, or a small loss',
      'Serious: a Torah prohibition, a sin offering, lashes, or a real financial obligation',
      'Grave: excision (karet), death at the hand of Heaven, or exile',
      'Capital: a court execution, idolatry, or matters of life and death',
    ],
  },
  warmth: {
    type: 'score',
    instructions: 'How much human warmth, compassion or feeling does `halakha` carry?',
    criteria: [
      'Dry: technical rules with no feeling',
      'Neutral: practical and matter-of-fact',
      'Humane: care for people is visible in the rule',
      'Warm: kindness, dignity, love or mercy is the point',
      'Moving: it reads like ethics or devotion, and could move a reader',
    ],
  },
  today: {
    type: 'noul',
    instructions: 'Could a Jew keep or apply `halakha` today, with no Temple, no Sanhedrin and no king (anywhere in the world)?',
    criteria: {
      true: 'It applies in practice today.',
      false: 'It depends on the Temple, sacrifices, ritual purity for the Temple, a Sanhedrin, a king, the Jubilee or other institutions that do not exist now.',
    },
  },
  number: {
    type: 'noul',
    instructions: 'Does `halakha` turn on a number or measurement (a quantity, size, weight, time span or count)?',
    criteria: { true: 'A specific number, measure or count matters to the rule.', false: 'No number or measure is involved.' },
  },
  why: {
    type: 'noul',
    instructions: 'Does `halakha` give a reason, purpose or explanation for a law (not just state what the law is)?',
    criteria: { true: 'It explains why (because, so that, the reason is, for this is).', false: 'It only states the law, with no reason.' },
  },
};

// One Choice per chapter over its own halakhot: the single most memorable one.
export const chapterQuestions = (halakhot) => ({
  gem: {
    type: 'choice',
    instructions: {
      question: 'Which halakha in `chapter` would most surprise, move or delight a modern reader who has never studied the Mishneh Torah?',
      prefer: 'A striking idea, a vivid image, a humane ruling, or a principle that still speaks today.',
      avoid: 'Plain definitions and lists, unless the chapter has nothing better.',
    },
    criteria: Object.fromEntries(halakhot.map(([n, t]) => [`h${n}`, t.length > 300 ? `${t.slice(0, 297)}…` : t])),
  },
  mood: choice('What is the overall mood of `chapter`?', {
    awe: ['Awe', 'awe, holiness, God and the sublime'],
    order: ['Order', 'calm order: careful rules, measures and categories'],
    justice: ['Justice', 'justice, fairness and the court'],
    mercy: ['Mercy', 'mercy, kindness and care for the weak'],
    joy: ['Joy', 'joy, festival and celebration'],
    grief: ['Grief', 'death, mourning and loss'],
    danger: ['Danger', 'sin, punishment, impurity and danger'],
    wisdom: ['Wisdom', 'wisdom, learning and the good life'],
  }),
});

export const BOOKS_EN = {
  'Sefer Madda': 'Knowledge', 'Sefer Ahavah': 'Love', 'Sefer Zemanim': 'Seasons', 'Sefer Nashim': 'Women',
  'Sefer Kedushah': 'Holiness', 'Sefer Haflaah': 'Utterances', 'Sefer Zeraim': 'Seeds', 'Sefer Avodah': 'Service',
  'Sefer Korbanot': 'Offerings', 'Sefer Taharah': 'Purity', 'Sefer Nezikim': 'Damages', 'Sefer Kinyan': 'Acquisition',
  'Sefer Mishpatim': 'Judgements', 'Sefer Shoftim': 'Judges',
};

// Michael's question: does what still applies change between the Land of Israel and the diaspora?
// Two Nouls per halakha, asked of every halakha (scripts/mishneh-torah/israel.mjs).
export const ISRAEL_QUESTIONS = {
  israel: {
    type: 'noul',
    instructions: 'Could a Jew living in the Land of Israel keep or apply `halakha` today, with no Temple, no Sanhedrin and no king?',
    criteria: {
      true: 'It applies in practice in the Land of Israel today (including laws of the Land such as tithes, terumah, the Sabbatical year, orlah or mixed species, as practised today).',
      false: 'It depends on the Temple, sacrifices, purity for the Temple, a Sanhedrin, a king or the Jubilee, so it cannot be kept even in the Land of Israel today.',
    },
  },
  diaspora: {
    type: 'noul',
    instructions: 'Could a Jew living outside the Land of Israel (in the diaspora) keep or apply `halakha` today?',
    criteria: {
      true: 'It applies in practice outside the Land of Israel today.',
      false: 'It applies only in the Land of Israel (tithes, terumah, the Sabbatical year, gifts of the field and similar), or it depends on the Temple, a Sanhedrin or a king.',
    },
  },
};
