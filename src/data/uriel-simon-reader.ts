// The Uriel Simon Reader: a weekly two-page sheet in memory of Prof. Uriel Simon z"l (1929–2026).
// Page 1 is a text (the verses and Simon's own words about them), page 2 a teaching built on them.
//
// Simon's words are quoted in his original Hebrew from "אברהם המקראי – הברכה שבניגודים",
// in בקש שלום ורדפהו (2002), as published on Daat. The English renderings of his Hebrew are ours.
// Bible: Hebrew from Sefaria (Miqra according to the Masorah), English from JPS 1917.

export interface Verse {
  ref: string;
  he: string;
  en: string;
}

export interface Quote {
  he: string;
  en: string;
  where?: string;
}

export interface Sheet {
  slug: string;
  parsha: string;
  parshaHe: string;
  range: string;
  shabbat: string; // ISO date of the Shabbat it is read
  hebDate: string;
  title: string;
  dek: string;
  verses: Verse[];
  quotes: Quote[];
  teaching: string[]; // paragraphs; <em>, <q> and <span class="he"> allowed
  questions: string[];
}

export const source = {
  title: 'אברהם המקראי – הברכה שבניגודים',
  titleEn: 'Biblical Abraham: The Blessing of Contradictions',
  book: 'בקש שלום ורדפהו: שאלות השעה באור המקרא, המקרא באור שאלות השעה',
  bookEn: 'Seek Peace and Pursue It (Yedioth Ahronoth, 2002)',
  href: 'https://www.daat.ac.il/daat/tanach/tora/avraham-2.htm',
};

export const sheets: Sheet[] = [
  {
    slug: 'noach',
    parsha: 'Noach',
    parshaHe: 'נֹחַ',
    range: 'Genesis 6:9–11:32',
    shabbat: '2026-10-17',
    hebDate: '6 Cheshvan 5787',
    title: 'Finished and unfinished',
    dek: 'Noah walked with God. Abraham is told to walk. Uriel Simon on the tense that separates them.',
    verses: [
      {
        ref: 'Genesis 6:9',
        he: 'אֵ֚לֶּה תּוֹלְדֹ֣ת נֹ֔חַ נֹ֗חַ אִ֥ישׁ צַדִּ֛יק תָּמִ֥ים הָיָ֖ה בְּדֹֽרֹתָ֑יו אֶת־הָֽאֱלֹהִ֖ים הִֽתְהַלֶּךְ־נֹֽחַ׃',
        en: 'These are the generations of Noah. Noah was in his generations a man righteous and wholehearted; Noah walked with God.',
      },
      {
        ref: 'Genesis 11:31–32',
        he: 'וַיִּקַּ֨ח תֶּ֜רַח אֶת־אַבְרָ֣ם בְּנ֗וֹ וְאֶת־ל֤וֹט בֶּן־הָרָן֙ בֶּן־בְּנ֔וֹ וְאֵת֙ שָׂרַ֣י כַּלָּת֔וֹ אֵ֖שֶׁת אַבְרָ֣ם בְּנ֑וֹ וַיֵּצְא֨וּ אִתָּ֜ם מֵא֣וּר כַּשְׂדִּ֗ים לָלֶ֙כֶת֙ אַ֣רְצָה כְּנַ֔עַן וַיָּבֹ֥אוּ עַד־חָרָ֖ן וַיֵּ֥שְׁבוּ שָֽׁם׃ וַיִּהְי֣וּ יְמֵי־תֶ֔רַח חָמֵ֥שׁ שָׁנִ֖ים וּמָאתַ֣יִם שָׁנָ֑ה וַיָּ֥מׇת תֶּ֖רַח בְּחָרָֽן׃',
        en: "And Terah took Abram his son, and Lot the son of Haran, his son's son, and Sarai his daughter-in-law, his son Abram's wife; and they went forth with them from Ur of the Chaldees, to go into the land of Canaan; and they came unto Haran, and dwelt there. And the days of Terah were two hundred and five years; and Terah died in Haran.",
      },
      {
        ref: 'Genesis 17:1',
        he: 'וַיְהִ֣י אַבְרָ֔ם בֶּן־תִּשְׁעִ֥ים שָׁנָ֖ה וְתֵ֣שַׁע שָׁנִ֑ים וַיֵּרָ֨א יְהֹוָ֜ה אֶל־אַבְרָ֗ם וַיֹּ֤אמֶר אֵלָיו֙ אֲנִי־אֵ֣ל שַׁדַּ֔י הִתְהַלֵּ֥ךְ לְפָנַ֖י וֶהְיֵ֥ה תָמִֽים׃',
        en: "And when Abram was ninety years old and nine, the LORD appeared to Abram, and said unto him: 'I am God Almighty; walk before Me, and be thou wholehearted.'",
      },
    ],
    quotes: [
      {
        he: 'צדקתו של נח היא בגדר עובדה מוגמרת – "נח איש צדיק תמים היה בדרתיו, את האלהים התהלך (בלשון עבר) נח" (ו׳, 9) – אשר בזכותה הוא מציל מכליה את עצמו ואת ביתו, ומבטיח את עתיד האנושות.',
        en: 'Noah\'s righteousness is an accomplished fact ("Noah was a righteous man, wholehearted in his generations; Noah walked [in the past tense] with God," 6:9), and by its merit he saves himself and his household from annihilation and secures the future of humanity.',
      },
      {
        he: 'צדקתו של אברהם, לעומת זאת, היא בגדר משימה',
        en: "Abraham's righteousness, by contrast, is a task.",
        where: 'on Genesis 17:1',
      },
      {
        he: 'אברהם איננו אבי האנושות, אלא אבי האומה, ובניגוד לאדם וחוה הוא לא נברא בידי הבורא, אלא נבחר על-ידו.',
        en: 'Abraham is not the father of humanity but the father of the nation; and unlike Adam and Eve, he was not created by the Creator but chosen by Him.',
      },
      {
        he: 'על מנת להתחיל התחלה חדשה עליו להתנתק מהוריו-מולידיו ומאחיו התנתקות אתנית, טריטוריאלית וערכית.',
        en: 'To make a new beginning he must detach himself from the parents who bore him and from his brothers: an ethnic, territorial and moral detachment.',
      },
    ],
    teaching: [
      'Parashat Noach opens by telling us who Noah is and closes by telling us where Abram came from. Uriel Simon, who died on 30 September at 97, read the two ends against each other. Noah\'s righteousness, he wrote, is <q>an accomplished fact</q>, and he found the proof in the grammar: <span class="he">אֶת־הָאֱלֹהִים הִתְהַלֶּךְ־נֹחַ</span>, Noah <em>walked</em> with God, in the past tense. The verdict is in before the story starts, and it is enough to carry Noah, his household and the whole human future through the flood.',
      'Abraham gets the same verb, but as a command. Eleven chapters later God says to him, <span class="he">הִתְהַלֵּךְ לְפָנַי וֶהְיֵה תָמִים</span>, "walk before Me, and be wholehearted" (17:1). Noah <em>was</em> <span class="he">תָּמִים</span>; Abraham has to become it. <q>Abraham\'s righteousness, by contrast, is a task.</q>',
      'That is why the last verses of Noach matter. Abraham arrives late, ten generations after Noah, and Simon draws out what that means: he is the father not of humanity but of a nation, and he was not created but chosen. A chosen person has to leave something behind. Terah sets out for Canaan and stops halfway, in Haran (11:31). Next week\'s call, <span class="he">לֶךְ־לְךָ</span>, asks Abram to finish the journey alone, leaving land, birthplace and father\'s house: what Simon calls an ethnic, territorial and moral break.',
      'This is the kind of reading Simon spent his life defending: <em>peshat</em>, the plain sense, read so closely that a verb tense becomes theology. In "The Religious Significance of the Peshat" he argued that searching for what the text actually says is itself a religious duty, and that the plain sense has to be renewed in every generation, because readers and their questions change.',
    ],
    questions: [
      'Noah walked <em>with</em> God; Abraham is told to walk <em>before</em> Him. What is the difference?',
      'Is a finished righteousness a lesser thing? What does Abraham\'s unfinished righteousness make possible that Noah\'s could not?',
      'Terah set out for Canaan and stopped in Haran. What journey have you started that someone else will have to finish?',
    ],
  },
  {
    slug: 'lech-lecha',
    parsha: 'Lech Lecha',
    parshaHe: 'לֶךְ־לְךָ',
    range: 'Genesis 12:1–17:27',
    shabbat: '2026-10-24',
    hebDate: '13 Cheshvan 5787',
    title: 'Love of the land, pursuit of peace',
    dek: 'Abram has just been promised the land, and he gives Lot first choice of it. Uriel Simon on the first of Abraham\'s contradictions.',
    verses: [
      {
        ref: 'Genesis 13:7–9',
        he: 'וַֽיְהִי־רִ֗יב בֵּ֚ין רֹעֵ֣י מִקְנֵֽה־אַבְרָ֔ם וּבֵ֖ין רֹעֵ֣י מִקְנֵה־ל֑וֹט וְהַֽכְּנַעֲנִי֙ וְהַפְּרִזִּ֔י אָ֖ז יֹשֵׁ֥ב בָּאָֽרֶץ׃ וַיֹּ֨אמֶר אַבְרָ֜ם אֶל־ל֗וֹט אַל־נָ֨א תְהִ֤י מְרִיבָה֙ בֵּינִ֣י וּבֵינֶ֔ךָ וּבֵ֥ין רֹעַ֖י וּבֵ֣ין רֹעֶ֑יךָ כִּֽי־אֲנָשִׁ֥ים אַחִ֖ים אֲנָֽחְנוּ׃ הֲלֹ֤א כׇל־הָאָ֙רֶץ֙ לְפָנֶ֔יךָ הִפָּ֥רֶד נָ֖א מֵעָלָ֑י אִם־הַשְּׂמֹ֣אל וְאֵימִ֔נָה וְאִם־הַיָּמִ֖ין וְאַשְׂמְאִֽילָה׃',
        en: "And there was a strife between the herdmen of Abram's cattle and the herdmen of Lot's cattle. And the Canaanite and the Perizzite dwelt then in the land. And Abram said unto Lot: 'Let there be no strife, I pray thee, between me and thee, and between my herdmen and thy herdmen; for we are brethren. Is not the whole land before thee? separate thyself, I pray thee, from me; if thou wilt take the left hand, then I will go to the right; or if thou take the right hand, then I will go to the left.'",
      },
      {
        ref: 'Genesis 13:14–15',
        he: 'וַֽיהֹוָ֞ה אָמַ֣ר אֶל־אַבְרָ֗ם אַחֲרֵי֙ הִפָּֽרֶד־ל֣וֹט מֵֽעִמּ֔וֹ שָׂ֣א נָ֤א עֵינֶ֙יךָ֙ וּרְאֵ֔ה מִן־הַמָּק֖וֹם אֲשֶׁר־אַתָּ֣ה שָׁ֑ם צָפֹ֥נָה וָנֶ֖גְבָּה וָקֵ֥דְמָה וָיָֽמָּה׃ כִּ֧י אֶת־כׇּל־הָאָ֛רֶץ אֲשֶׁר־אַתָּ֥ה רֹאֶ֖ה לְךָ֣ אֶתְּנֶ֑נָּה וּֽלְזַרְעֲךָ֖ עַד־עוֹלָֽם׃',
        en: "And the LORD said unto Abram, after that Lot was separated from him: 'Lift up now thine eyes, and look from the place where thou art, northward and southward and eastward and westward; for all the land which thou seest, to thee will I give it, and to thy seed for ever.'",
      },
    ],
    quotes: [
      {
        he: 'הניגוד הראשון הוא, במונחי העגה הפוליטית שלנו, הניגוד שבין "אהבת הארץ" מכאן ו"רדיפת שלום" מכאן.',
        en: 'The first contrast is, in the terms of our political jargon, the contrast between "love of the land" on the one side and "pursuit of peace" on the other.',
      },
      {
        he: 'צדקתו של אברהם, לעומת זאת, היא בגדר משימה',
        en: "Abraham's righteousness, by contrast, is a task.",
        where: 'on Genesis 17:1, "walk before Me, and be wholehearted"',
      },
      {
        he: 'שאלות השעה באור המקרא, המקרא באור שאלות השעה',
        en: 'The questions of the hour in the light of the Bible; the Bible in the light of the questions of the hour.',
        where: 'the subtitle Simon gave the book in which this essay appears',
      },
    ],
    teaching: [
      'Abram has just been promised the land (12:7) and has walked its length, building altars at Shechem and between Beth-el and Ai. Then his herdsmen and Lot\'s come to blows over pasture, and the Torah adds a detail that makes the quarrel more dangerous, not less: <q>the Canaanite and the Perizzite dwelt then in the land</q>. Abram\'s answer is to give away first choice: <span class="he">הֲלֹא כׇל־הָאָרֶץ לְפָנֶיךָ</span>, "Is not the whole land before thee?"',
      'Uriel Simon named the tension in the vocabulary of Israeli politics: <q>the first contrast is, in the terms of our political jargon, the contrast between "love of the land" on the one side and "pursuit of peace" on the other.</q> He was not a neutral reader. He was one of the founders of Oz VeShalom, the religious-Zionist peace movement, and he called the book this essay appears in <em>Bakesh Shalom Verodfehu</em>, "Seek peace and pursue it." But his point about Abraham is that the Torah does not let either value win. The man who yields first choice is the same man who walks the land, builds its altars and is promised it.',
      'Read the next verses. The promise is renewed not before Abram gives way but straight after: <q>the LORD said unto Abram, after that Lot was separated from him: Lift up now thine eyes … for all the land which thou seest, to thee will I give it</q> (13:14–15). Abram gets the view in every direction once he has stopped insisting on any one of them.',
      'Simon came back to this all his life. In "The Biblical Destinies: Conditional Promises" (<em>Tradition</em>, 1978) he asked whether the Bible\'s promises of the land are absolute or conditional, and used Abraham to separate a people\'s natural attachment to its land from the attachment that comes with being chosen for it. The parasha ends with the verse that frames both: <span class="he">הִתְהַלֵּךְ לְפָנַי וֶהְיֵה תָמִים</span> (17:1). Abraham\'s righteousness, Simon wrote, <q>is a task</q>, and so, on this reading, is the land.',
    ],
    questions: [
      'Abram says, "we are brethren." Is he describing what they are, or what he wants them to be?',
      'Does giving Lot first choice weaken Abram\'s claim to the land, or is it how he makes the claim?',
      'Where do two things you love, a place and peace with the people around you, pull against each other? Do you choose, or hold both?',
    ],
  },
  {
    slug: 'vayera',
    parsha: 'Vayera',
    parshaHe: 'וַיֵּרָא',
    range: 'Genesis 18:1–22:24',
    shabbat: '2026-10-31',
    hebDate: '20 Cheshvan 5787',
    title: 'Here I am, twice',
    dek: 'Abraham argues for Sodom and is silent on Moriah. Uriel Simon on the man who says "Hineni" to God and to his son.',
    verses: [
      {
        ref: 'Genesis 18:23–25',
        he: 'וַיִּגַּ֥שׁ אַבְרָהָ֖ם וַיֹּאמַ֑ר הַאַ֣ף תִּסְפֶּ֔ה צַדִּ֖יק עִם־רָשָֽׁע׃ אוּלַ֥י יֵ֛שׁ חֲמִשִּׁ֥ים צַדִּיקִ֖ם בְּת֣וֹךְ הָעִ֑יר הַאַ֤ף תִּסְפֶּה֙ וְלֹא־תִשָּׂ֣א לַמָּק֔וֹם לְמַ֛עַן חֲמִשִּׁ֥ים הַצַּדִּיקִ֖ם אֲשֶׁ֥ר בְּקִרְבָּֽהּ׃ חָלִ֨לָה לְּךָ֜ מֵעֲשֹׂ֣ת ׀ כַּדָּבָ֣ר הַזֶּ֗ה לְהָמִ֤ית צַדִּיק֙ עִם־רָשָׁ֔ע וְהָיָ֥ה כַצַּדִּ֖יק כָּרָשָׁ֑ע חָלִ֣לָה לָּ֔ךְ הֲשֹׁפֵט֙ כׇּל־הָאָ֔רֶץ לֹ֥א יַעֲשֶׂ֖ה מִשְׁפָּֽט׃',
        en: "And Abraham drew near, and said: 'Wilt Thou indeed sweep away the righteous with the wicked? Peradventure there are fifty righteous within the city; wilt Thou indeed sweep away and not forgive the place for the fifty righteous that are therein? That be far from Thee to do after this manner, to slay the righteous with the wicked, that so the righteous should be as the wicked; that be far from Thee; shall not the Judge of all the earth do justly?'",
      },
      {
        ref: 'Genesis 22:1, 7, 11–12',
        he: 'וַיְהִ֗י אַחַר֙ הַדְּבָרִ֣ים הָאֵ֔לֶּה וְהָ֣אֱלֹהִ֔ים נִסָּ֖ה אֶת־אַבְרָהָ֑ם וַיֹּ֣אמֶר אֵלָ֔יו אַבְרָהָ֖ם וַיֹּ֥אמֶר הִנֵּֽנִי׃ … וַיֹּ֨אמֶר יִצְחָ֜ק אֶל־אַבְרָהָ֤ם אָבִיו֙ וַיֹּ֣אמֶר אָבִ֔י וַיֹּ֖אמֶר הִנֶּ֣נִּֽי בְנִ֑י … וַיִּקְרָ֨א אֵלָ֜יו מַלְאַ֤ךְ יְהֹוָה֙ מִן־הַשָּׁמַ֔יִם וַיֹּ֖אמֶר אַבְרָהָ֣ם ׀ אַבְרָהָ֑ם וַיֹּ֖אמֶר הִנֵּֽנִי׃ וַיֹּ֗אמֶר אַל־תִּשְׁלַ֤ח יָֽדְךָ֙ אֶל־הַנַּ֔עַר וְאַל־תַּ֥עַשׂ ל֖וֹ מְא֑וּמָה',
        en: "And it came to pass after these things, that God did prove Abraham, and said unto him: 'Abraham'; and he said: 'Here am I.' … And Isaac spoke unto Abraham his father, and said: 'My father.' And he said: 'Here am I, my son.' … And the angel of the LORD called unto him out of heaven, and said: 'Abraham, Abraham.' And he said: 'Here am I.' And he said: 'Lay not thy hand upon the lad, neither do thou any thing unto him.'",
      },
    ],
    quotes: [
      {
        he: 'הניגוד השני הוא, במונחי העגה התאולוגית שלנו, הניגוד שבין "ביקורתיות" מכאן ו"קבלת דין עיוורת" מכאן.',
        en: 'The second contrast is, in the terms of our theological jargon, the contrast between "criticism" on the one side and "blind acceptance of judgment" on the other.',
      },
      {
        he: 'מתוך ביטחון גמור בשיפוט המוסרי העצמי שלו הריהו מטיח כלפי בוראו "חללה לך מעשת כדבר הזה להמית צדיק עם רשע"... (י״ח, 25).',
        en: 'Out of complete confidence in his own moral judgment he flings at his Creator, "That be far from Thee to do after this manner, to slay the righteous with the wicked"… (18:25).',
      },
      {
        he: 'אברהם מביע את מסירותו השלמה לאלוהים באמצעות מילת הנוכחות "הנני" (כ״ב, 1).',
        en: 'Abraham expresses his complete devotion to God through the word of presence, "Hineni" (22:1).',
      },
      {
        he: 'אחרי שאברהם הכריע לטובת המחויבות הדתית, נתן מלאך ה׳ תוקף אלוהי למחויבות האנושית.',
        en: 'After Abraham decided in favor of the religious commitment, the angel of the LORD gave divine force to the human commitment.',
      },
    ],
    teaching: [
      'Vayera puts the two most extreme Abraham stories in the same parasha. In one he argues with God over Sodom, bargaining from fifty righteous down to ten: <q>shall not the Judge of all the earth do justly?</q> In the other he rises early and goes to sacrifice his son without a word. Uriel Simon called this the second contrast in Abraham, between <q>criticism</q> and <q>blind acceptance of judgment</q>.',
      'Of Sodom, Simon wrote that Abraham speaks <q>out of complete confidence in his own moral judgment</q>. He noticed that readers tend to pick a side: some admire the Abraham who fights for justice in Sodom (on what he called the mistaken assumption that there were at least ten righteous people there), and some admire the Abraham of Moriah. Simon wanted both, and noted that in each story it turns out, after the fact, that the gap between human and divine morality was only apparent.',
      'For the Akedah he followed a single word. Abraham answers God <span class="he">הִנֵּנִי</span>, "Here am I" (22:1): complete devotion. Then, on the walk up, Isaac says <q>My father</q>, and Abraham answers with the same word, <span class="he">הִנֶּנִּי בְנִי</span>, "Here am I, my son" (22:7). Now, Simon writes, <q>Abraham places himself in the terrible tension of a double, even contradictory, commitment.</q> He stays the boy\'s father to the last moment. Then the angel calls <q>Abraham, Abraham</q>, Abraham says <span class="he">הִנֵּנִי</span> a third time, and the angel forbids him to touch the boy. <q>From now on, the "Hineni" toward his God is not opposed to the "Hineni" toward his son.</q> The religious commitment comes first, and then heaven itself backs the human one.',
      'This is where Simon\'s essay ends up, three contrasts in all: land and peace, protest and acceptance, God and son. If his plain-sense reading holds, he wrote, then Abraham\'s blessing to his descendants is <q>in large measure, the blessing of contradictions</q>: not a compromise between the poles, but the strength to hold both.',
    ],
    questions: [
      'Abraham bargains for Sodom but says nothing on the way to Moriah. Is the silence acceptance, or something else?',
      'Simon says the gap between human and divine morality turned out to be only apparent, in hindsight. What do we do before the hindsight arrives?',
      'Who gets your "Hineni"? When have two of them pulled against each other?',
    ],
  },
];

export const closing = {
  he: 'אם אמנם יש ממשות פשטית בדברים שאמרנו בזה, אזי ברכת אברהם לצאצאיו לדורותיהם היא, במידה רבה, ברכת הניגודים.',
  en: "If there is real plain-sense substance in what we have said here, then Abraham's blessing to his descendants through the generations is, in large measure, the blessing of contradictions.",
};
