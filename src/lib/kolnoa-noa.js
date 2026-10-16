// Noa, Kolnoa's guide: a seven-year-old who wants to chat in Hebrew.
// She asks a question, the learner answers, and Jev picks which of her prewritten replies fits
// (it never writes her lines). Anything can be { m, f } for the learner's grammatical gender;
// Noa's own lines are always feminine first person.
//
// Each reply: when = what Jev matches the learner's answer against, pose = image in
// /images/kolnoa/noa-<pose>.webp.

export const POSES = ['wave', 'cheer', 'think', 'wow', 'oops', 'listen', 'clap'];

export const g = (v, gender) => (v && typeof v === 'object' && !Array.isArray(v) ? v[gender] ?? v.m : v);

export const INTRO = {
  he: { m: 'היי! אני נועה. בוא נדבר עברית!', f: 'היי! אני נועה. בואי נדבר עברית!' },
  en: "Hi! I'm Noa. Let's talk Hebrew!",
};
export const BYE = {
  he: { m: 'היה כיף לדבר איתך! תבוא שוב?', f: 'היה כיף לדבר איתך! תבואי שוב?' },
  en: 'That was fun! Will you come back?',
};

// Used when Jev says the reply isn't Hebrew, or doesn't answer the question.
export const GENERIC = {
  english: { pose: 'oops', he: 'אני מבינה קצת אנגלית… אבל בעברית זה יותר כיף!', en: 'I understand a little English… but it’s more fun in Hebrew!' },
  offtopic: { pose: 'listen', he: 'הממ, לא הבנתי. אפשר עוד פעם?', en: "Hmm, I didn't get that. One more time?" },
};
export const OFFTOPIC_WHEN = "The reply doesn't answer Noa's question, or can't be understood.";

export const QUESTIONS = {
  hello: {
    he: 'מה שלומך?', en: 'How are you?',
    hints: [['טוב, תודה! ומה שלומך?', 'Good, thanks! And how are you?'], ['ככה ככה', 'So-so'], ['מעולה!', 'Great!']],
    replies: {
      asks: { when: 'The learner asks Noa how she is in return (e.g. "ומה שלומך?", "ואת?", "and you?"), whether or not they also say how they are.', pose: 'wave', he: 'אני? אני מצוינת, תודה ששאלת!', en: "Me? I'm great, thanks for asking!" },
      good: { when: 'The learner says they are fine, good or great, without asking Noa back.', pose: 'clap', he: 'איזה יופי! גם אני מצוינת.', en: "Great! I'm great too." },
      meh: { when: 'The learner says they are so-so, tired, sad or not great.', pose: 'think', he: 'אוי. אז נדבר על משהו כיף, טוב?', en: "Aw. Then let's talk about something fun, OK?" },
    },
  },
  name: {
    he: 'איך קוראים לך?', en: "What's your name?",
    hints: [['קוראים לי דני', 'My name is Danny'], ['שמי מאיה', 'My name is Maya'], ['אני מתיו', "I'm Matthew"]],
    replies: {
      same: { when: 'The learner says their name is Noa.', pose: 'wow', he: { m: 'מה? גם אתה נועה?! איזה מצחיק!', f: 'מה? גם את נועה?! אנחנו כמו תאומות!' }, en: "What? You're Noa too?!" },
      gave: { when: 'The learner tells Noa their name.', pose: 'wave', he: 'נעים להכיר! קוראים לי נועה.', en: 'Nice to meet you! My name is Noa.' },
    },
  },
  age: {
    he: { m: 'בן כמה אתה?', f: 'בת כמה את?' }, en: 'How old are you?',
    hints: { m: [['אני בן עשר', "I'm ten"], ['אני בן שלושים', "I'm thirty"]], f: [['אני בת עשר', "I'm ten"], ['אני בת שלושים', "I'm thirty"]] },
    replies: {
      kid: { when: 'The learner is 12 or younger.', pose: 'cheer', he: 'כמעט כמוני! אני בת שבע.', en: "Almost like me! I'm seven." },
      teen: { when: 'The learner is between 13 and 20.', pose: 'wow', he: { m: 'וואו, אתה כמו אח גדול!', f: 'וואו, את כמו אחות גדולה!' }, en: "Wow, you're like a big brother!" },
      adult: { when: 'The learner is older than 20.', pose: 'think', he: { m: 'אתה ממש גדול! אתה יודע לנהוג?', f: 'את ממש גדולה! את יודעת לנהוג?' }, en: "You're really big! Can you drive?" },
      secret: { when: "The learner won't say, or says it's a secret.", pose: 'oops', he: 'סוד? אוקיי, אני לא אגלה לאף אחד!', en: "A secret? OK, I won't tell anyone!" },
    },
  },
  food: {
    he: { m: 'מה אתה אוהב לאכול?', f: 'מה את אוהבת לאכול?' }, en: 'What do you like to eat?',
    hints: { m: [['אני אוהב פיצה', 'I like pizza'], ['אני אוהב פלאפל', 'I like falafel']], f: [['אני אוהבת פיצה', 'I like pizza'], ['אני אוהבת שוקולד', 'I like chocolate']] },
    replies: {
      sweet: { when: 'A sweet treat: chocolate, ice cream, cake, candy, cookies.', pose: 'cheer', he: 'יאמי! אני מתה על מתוקים!', en: "Yum! I'm crazy about sweets!" },
      israeli: { when: 'Israeli or Middle Eastern food: falafel, shawarma, hummus, shakshuka, schnitzel, Bamba, sabich, pita.', pose: 'clap', he: 'זה הכי ישראלי שיש!', en: "That's as Israeli as it gets!" },
      pizza: { when: 'Pizza, pasta, burgers or fries.', pose: 'wow', he: 'גם אני! הייתי אוכלת את זה כל יום.', en: "Me too! I'd eat that every day." },
      healthy: { when: 'Vegetables, fruit, salad or other healthy food.', pose: 'think', he: 'וואו, כמה בריא! אמא שלי הייתה שמחה.', en: 'Wow, so healthy! My mom would be happy.' },
      other: { when: 'Some other food.', pose: 'think', he: 'מעניין! אני חייבת לטעום את זה.', en: 'Interesting! I have to taste that.' },
    },
  },
  color: {
    he: 'מה הצבע האהוב עליך?', en: "What's your favorite color?",
    hints: [['כחול', 'Blue'], ['הצבע האהוב עליי הוא ירוק', 'My favorite color is green'], ['ורוד!', 'Pink!']],
    replies: {
      pink: { when: 'Pink.', pose: 'cheer', he: 'ורוד! כמו הסרט שלי!', en: 'Pink! Like my bow!' },
      other: { when: 'Any color other than pink.', pose: 'clap', he: 'צבע יפה! שלי ורוד, כמובן.', en: 'Nice color! Mine is pink, of course.' },
    },
  },
  pet: {
    he: 'יש לך חיית מחמד?', en: 'Do you have a pet?',
    hints: [['כן, יש לי כלב', 'Yes, I have a dog'], ['יש לי חתולה', 'I have a cat'], ['לא, אין לי', "No, I don't"]],
    replies: {
      dog: { when: 'Yes, a dog.', pose: 'wow', he: 'כלב! אני כל כך רוצה כלב!', en: 'A dog! I want a dog so much!' },
      cat: { when: 'Yes, a cat.', pose: 'clap', he: 'מיאו! חתולים הם הכי רכים.', en: 'Meow! Cats are the softest.' },
      otherpet: { when: 'Yes, some other animal (fish, bird, hamster, rabbit, and so on).', pose: 'wow', he: 'וואו, איזה מגניב!', en: 'Wow, how cool!' },
      none: { when: 'No pet.', pose: 'oops', he: 'גם לי אין. אבא אומר אולי בשנה הבאה.', en: 'Me neither. Dad says maybe next year.' },
    },
  },
  home: {
    he: { m: 'איפה אתה גר?', f: 'איפה את גרה?' }, en: 'Where do you live?',
    hints: { m: [['אני גר בתל אביב', 'I live in Tel Aviv'], ['אני גר בניו יורק', 'I live in New York']], f: [['אני גרה בירושלים', 'I live in Jerusalem'], ['אני גרה בלונדון', 'I live in London']] },
    replies: {
      israel: { when: 'Somewhere in Israel.', pose: 'clap', he: 'אני מכירה! זה ממש קרוב אליי.', en: "I know it! That's really close to me." },
      abroad: { when: 'Somewhere outside Israel.', pose: 'wow', he: { m: 'רחוק! אתה חייב לבוא לבקר.', f: 'רחוק! את חייבת לבוא לבקר.' }, en: 'Far away! You have to come visit.' },
    },
  },
  shabbat: {
    he: { m: 'מה אתה אוהב לעשות בשבת?', f: 'מה את אוהבת לעשות בשבת?' }, en: 'What do you like to do on Shabbat?',
    hints: { m: [['אני אוהב לישון', 'I like to sleep'], ['אני אוכל עם המשפחה', 'I eat with the family']], f: [['אני אוהבת לישון', 'I like to sleep'], ['אני אוכלת עם המשפחה', 'I eat with the family']] },
    replies: {
      family: { when: 'Being with family or friends, eating meals, going to synagogue.', pose: 'clap', he: 'גם אני! ארוחת שבת זה הכי כיף.', en: 'Me too! Shabbat dinner is the best.' },
      outside: { when: 'Going outside: the park, the beach, a walk, sports.', pose: 'cheer', he: 'יאללה לפארק! אני אלופה בנדנדות.', en: "Yalla, to the park! I'm the swing champion." },
      rest: { when: 'Sleeping, resting or reading.', pose: 'think', he: 'מנוחה זה חשוב. אבל אני לא אוהבת לישון בצהריים.', en: "Rest is important. But I don't like naps." },
      other: { when: 'Something else.', pose: 'wow', he: 'רעיון מגניב!', en: 'Cool idea!' },
    },
  },
  movie: {
    he: 'איזה סרט ראית לאחרונה?', en: 'What movie did you see lately?',
    hints: [['ראיתי את פרוזן', 'I saw Frozen'], ['ראיתי סרט מצויר', 'I saw a cartoon'], ['לא ראיתי סרט', "I didn't see a movie"]],
    replies: {
      animated: { when: "An animated film or a kids' movie.", pose: 'cheer', he: 'אני מכירה את כל השירים!', en: 'I know all the songs!' },
      grownup: { when: 'A movie for grown-ups.', pose: 'oops', he: { m: 'זה לא לגיל שלי… אבל ספר לי בלי החלקים המפחידים.', f: 'זה לא לגיל שלי… אבל ספרי לי בלי החלקים המפחידים.' }, en: "That's not for my age… but tell me without the scary parts." },
      none: { when: "Hasn't seen a movie lately, or doesn't remember.", pose: 'think', he: { m: 'מה? בוא נלך לקולנוע!', f: 'מה? בואי נלך לקולנוע!' }, en: "What? Let's go to the cinema!" },
    },
  },
  future: {
    he: { m: 'מה אתה רוצה להיות כשתהיה גדול?', f: 'מה את רוצה להיות כשתהיי גדולה?' }, en: 'What do you want to be when you grow up?',
    hints: { m: [['אני רוצה להיות רופא', 'I want to be a doctor'], ['אני כבר גדול!', "I'm already grown up!"]], f: [['אני רוצה להיות מורה', 'I want to be a teacher'], ['אני כבר גדולה!', "I'm already grown up!"]] },
    replies: {
      already: { when: 'The learner says they are already grown up, or names the job they have now.', pose: 'wow', he: { m: 'אה, נכון! אז אתה כבר יודע הכל.', f: 'אה, נכון! אז את כבר יודעת הכל.' }, en: 'Oh, right! So you already know everything.' },
      job: { when: 'A job or a dream for the future.', pose: 'clap', he: 'מגניב! אני רוצה להיות במאית סרטים.', en: 'Cool! I want to be a movie director.' },
      dunno: { when: "Doesn't know yet.", pose: 'think', he: 'זה בסדר. יש לך המון זמן לחשוב.', en: "That's OK. You have lots of time to think." },
    },
  },
  weather: {
    he: 'מה מזג האוויר אצלך עכשיו?', en: "What's the weather like where you are?",
    hints: [['חם', 'Hot'], ['קר וגשום', 'Cold and rainy'], ['יש שמש', "It's sunny"]],
    replies: {
      hot: { when: 'Hot or sunny.', pose: 'cheer', he: 'יאללה, הולכים לים!', en: "Yalla, let's go to the beach!" },
      cold: { when: 'Cold, rainy, snowy, windy or cloudy.', pose: 'wow', he: { m: 'ברררר! אל תשכח מעיל.', f: 'ברררר! אל תשכחי מעיל.' }, en: "Brrr! Don't forget a coat." },
      nice: { when: 'Pleasant, mild or nice.', pose: 'clap', he: 'מזג אוויר מושלם!', en: 'Perfect weather!' },
    },
  },
  languages: {
    he: { m: 'איזה שפות אתה מדבר?', f: 'איזה שפות את מדברת?' }, en: 'What languages do you speak?',
    hints: { m: [['אני מדבר אנגלית ועברית', 'I speak English and Hebrew'], ['אני מדבר קצת עברית', 'I speak a little Hebrew']], f: [['אני מדברת אנגלית ועברית', 'I speak English and Hebrew'], ['אני מדברת קצת עברית', 'I speak a little Hebrew']] },
    replies: {
      learning: { when: 'Mentions learning Hebrew or speaking a little Hebrew.', pose: 'clap', he: { m: 'ואתה מדבר עברית ממש יפה!', f: 'ואת מדברת עברית ממש יפה!' }, en: 'And you speak Hebrew really nicely!' },
      many: { when: 'Three or more languages.', pose: 'wow', he: { m: 'וואו! אתה גאון!', f: 'וואו! את גאונה!' }, en: "Wow! You're a genius!" },
      other: { when: 'Anything else.', pose: 'cheer', he: 'אני מדברת עברית ואנגלית. וגם שפת חתולים: מיאו!', en: 'I speak Hebrew and English. And cat: meow!' },
    },
  },
};

// Every chat opens with these two, then a few of the rest at random.
export const OPENERS = ['hello', 'name'];

// What a chat client needs (the page and the Chrome extension): questions, hints and replies,
// with Jev's `when` criteria left out, plus the recorded-audio manifest (text -> file).
export const clientData = (audio) => ({
  questions: Object.fromEntries(
    Object.entries(QUESTIONS).map(([id, q]) => [
      id,
      { he: q.he, en: q.en, hints: q.hints, replies: Object.fromEntries(Object.entries(q.replies).map(([rid, r]) => [rid, { pose: r.pose, he: r.he, en: r.en }])) },
    ]),
  ),
  generic: GENERIC,
  intro: INTRO,
  bye: BYE,
  openers: OPENERS,
  audio,
});
