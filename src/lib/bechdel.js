// The Bechdel test for Tanakh: does a chapter have (1) two named women (2) who talk to each other
// (3) about something other than a man? Jev answers each step as a Noul. Step 3 is asked in two
// strengths, so readers can choose. Shared by scripts/bible/bechdel.mjs and /mega-bible.

export const BECHDEL_QUESTIONS = {
  named: {
    type: 'noul',
    instructions: 'Does `passage` include at least two women who are each named (given a personal name, like Ruth or Naomi)?',
    criteria: {
      true: 'Two or more women in the passage have personal names.',
      false: 'Fewer than two named women appear; unnamed women ("a woman", "his wife", "the daughter of Pharaoh") do not count.',
    },
  },
  talk: {
    type: 'noul',
    instructions: 'In `passage`, do two of the named women speak directly to each other (not only to a man, or through a messenger)?',
    criteria: {
      true: 'One named woman speaks to another named woman in the passage.',
      false: 'No named woman addresses another named woman directly.',
    },
  },
  notMan: {
    type: 'noul',
    instructions:
      'Assume the women in `passage` speak to each other. Is at least one thing they say to each other about something other than a man (a husband, son, king, or any other male)?',
    criteria: {
      true: 'Some of their conversation is about something else: God, a journey, a plan, loyalty, food, their own lives.',
      false: 'Everything they say to each other concerns a man, or they never speak to each other.',
    },
  },
  notManStrict: {
    type: 'noul',
    instructions:
      'Assume the women in `passage` speak to each other. Is their conversation mostly about something other than a man (a husband, son, king, or any other male)?',
    criteria: {
      true: 'Most of what they say to each other is about something other than a man.',
      false: 'Most of what they say to each other concerns a man, or they never speak to each other.',
    },
  },
};

export const BECHDEL_STEPS = [
  ['named', 'Two named women'],
  ['talk', 'Talk to each other'],
  ['notMan', 'About something other than a man'],
];
export const BECHDEL_PASS = 0.5;   // each step's Noul threshold
