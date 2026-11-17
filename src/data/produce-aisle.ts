// The Produce Aisle (/produce): an Israeli supermarket's fruit-and-vegetable section, one crate
// per Hebrew name. Every biblical verse links into the Mega Bible; every rabbinic source links to
// Sefaria. Rabbinic quotations were checked against Sefaria's texts; Balashon links point at real
// posts listed in src/data/balashon/posts.json.

export type Shape =
  | 'round' | 'apple' | 'citrus' | 'pomegranate' | 'fig' | 'grapes' | 'olive' | 'date'
  | 'melon' | 'zucchini' | 'cucumber' | 'leek' | 'onion' | 'garlic' | 'gourd' | 'beans'
  | 'beet' | 'carrot' | 'tomato' | 'potato' | 'banana' | 'strawberry' | 'peach' | 'lettuce'
  | 'cabbage' | 'herb' | 'pepper' | 'almond' | 'walnut' | 'carob' | 'pod' | 'lentil';

export interface Verse { book: string; ch: number; v: number; he: string; en: string }
export interface Source { ref: string; he?: string; en: string }

export interface Produce {
  id: string;
  he: string;          // as it appears on the price sign
  translit: string;
  en: string;
  section: string;     // Section id
  shape: Shape;
  colors: string[];    // instance colours, picked at random per piece
  price: string;       // ₪ per kilo (or unit), for the sign
  unit?: string;
  hook: string;        // one line under the name
  verses: Verse[];
  rabbinic: Source[];
  word: string;        // where the word comes from
  modern?: string;     // what it does in Israeli Hebrew today
  balashon?: { title: string; url: string };
  search: string;      // the form to search for in Ma'agarim / the Academy / Sefaria
}

export interface Section { id: string; he: string; en: string; blurb: string }

export const sections: Section[] = [
  { id: 'seven', he: 'שבעת המינים', en: 'The Seven Species', blurb: 'Deuteronomy 8:8 praises the land with seven crops. Five of them are in this aisle; wheat and barley are over in bread.' },
  { id: 'egypt', he: 'זכרנו… במצרים', en: 'What we remembered from Egypt', blurb: 'Numbers 11:5: in the desert the people missed Egypt\'s fish "and the cucumbers, the melons, the leeks, the onions and the garlic". The whole complaint is stocked here.' },
  { id: 'simanim', he: 'סימנים', en: 'Rosh Hashanah simanim', blurb: 'Abaye (Keritot 6a): eat gourd, rubia, leek, beet and dates at the new year. Each one became a pun-blessing. The leek and the dates are in the sections next door.' },
  { id: 'coined', he: 'מילים חדשות', en: 'Coined in modern Hebrew', blurb: 'Fruit and vegetables that the Bible never met, or met under another name. Revived Hebrew had to find words for them, by portmanteau, by calque, or by giving up.' },
  { id: 'orchard', he: 'פירות עם עבר', en: 'Fruit with a past', blurb: 'Names with long histories: an apple whose biblical identity is still argued about, a peach named for Persia, and the etrog in the lemon bin.' },
  { id: 'greens', he: 'ירוקים', en: 'Greens and herbs', blurb: 'The Seder\'s lettuce, the cabbage that is spelled like a cherub, the manna\'s coriander, and the pepper that gave the yeshivah its pilpul.' },
  { id: 'bins', he: 'בתפזורת', en: 'The dry bins', blurb: 'Nuts, pods and pulses sold by the scoop: Jeremiah\'s almond, Choni\'s carob, Esau\'s lentils.' },
];

export const produce: Produce[] = [
  // ── Seven Species ─────────────────────────────────────────────────────────
  {
    id: 'grapes', he: 'ענבים', translit: 'anavim', en: 'Grapes', section: 'seven', shape: 'grapes',
    colors: ['#6b2a5e', '#7a3366', '#5a2350', '#8bb04a', '#9cc055'], price: '12.90',
    hook: 'The spies carried one cluster on a pole between two men.',
    verses: [
      { book: 'Numbers', ch: 13, v: 23, he: 'וַיִּכְרְתוּ מִשָּׁם זְמוֹרָה וְאֶשְׁכּוֹל עֲנָבִים אֶחָד וַיִּשָּׂאֻהוּ בַמּוֹט בִּשְׁנָיִם', en: 'They cut down a branch with a single cluster of grapes, and carried it on a pole between two of them.' },
      { book: 'Deuteronomy', ch: 8, v: 8, he: 'אֶרֶץ חִטָּה וּשְׂעֹרָה וְגֶפֶן וּתְאֵנָה וְרִמּוֹן', en: 'A land of wheat and barley, of vines, figs and pomegranates.' },
    ],
    rabbinic: [
      { ref: 'Pesachim 49a', he: 'מָשָׁל לְעִנְּבֵי הַגֶּפֶן בְּעִנְּבֵי הַגֶּפֶן, דָּבָר נָאֶה וּמִתְקַבֵּל', en: 'Marrying a scholar\'s daughter to a scholar is like grapes of the vine with grapes of the vine: lovely and fitting. Grapes of the vine with grapes of the thornbush is ugly.' },
    ],
    word: 'The vine is גֶּפֶן, the fruit עֵנָב, the cluster אֶשְׁכּוֹל. The spies named the valley after that cluster: נַחַל אֶשְׁכּוֹל (Numbers 13:24).',
    modern: 'אֶשְׁכּוֹלִית, grapefruit, is built on אשכול because the fruit hangs in clusters. Two crates of the aisle meet in one word.',
    search: 'ענב',
  },
  {
    id: 'fig', he: 'תאנים', translit: "te'enim", en: 'Figs', section: 'seven', shape: 'fig',
    colors: ['#4a2b4a', '#5c3358', '#6e3d5f', '#7d6a3a'], price: '29.90',
    hook: 'The first clothes in the Bible were fig leaves.',
    verses: [
      { book: 'Genesis', ch: 3, v: 7, he: 'וַיִּתְפְּרוּ עֲלֵה תְאֵנָה וַיַּעֲשׂוּ לָהֶם חֲגֹרֹת', en: 'They sewed fig leaves together and made themselves loincloths.' },
      { book: 'Micah', ch: 4, v: 4, he: 'וְיָשְׁבוּ אִישׁ תַּחַת גַּפְנוֹ וְתַחַת תְּאֵנָתוֹ וְאֵין מַחֲרִיד', en: 'Each will sit under his vine and under his fig tree, and no one will make them afraid.' },
    ],
    rabbinic: [
      { ref: 'Berakhot 40a', en: 'Which tree did Adam eat from? Rabbi Nechemiah says it was a fig: they were repaired by the very thing that ruined them, "they sewed fig leaves".' },
      { ref: 'Eruvin 54a', he: 'מָה תְּאֵנָה זוֹ, כָּל זְמַן שֶׁאָדָם מְמַשְׁמֵשׁ בָּהּ מוֹצֵא בָּהּ תְּאֵנִים', en: 'Why is Torah compared to a fig (Proverbs 27:18)? Every time you search a fig tree you find ripe figs; every time you return to Torah you find new taste.' },
    ],
    word: 'תְּאֵנָה, with a cognate in Aramaic תְּאֵינְתָּא and Arabic tīn. The unripe fig is פַּגָּה (Song 2:13), which is where Beit Pagei, "house of unripe figs" (Bethphage), gets its name.',
    modern: 'פַּגָּה is also Israeli Hebrew for a premature baby: a fig picked before it ripened.',
    search: 'תאנה',
  },
  {
    id: 'pomegranate', he: 'רימונים', translit: 'rimonim', en: 'Pomegranates', section: 'seven', shape: 'pomegranate',
    colors: ['#a5172a', '#b3202f', '#8f1424', '#c43a3a'], price: '9.90',
    hook: 'Embroidered on the hem of the high priest\'s robe.',
    verses: [
      { book: 'Exodus', ch: 28, v: 33, he: 'וְעָשִׂיתָ עַל שׁוּלָיו רִמֹּנֵי תְּכֵלֶת וְאַרְגָּמָן', en: 'On its hem make pomegranates of blue and purple.' },
      { book: 'Song of Songs', ch: 4, v: 3, he: 'כְּפֶלַח הָרִמּוֹן רַקָּתֵךְ', en: 'Your brow is like a slice of pomegranate.' },
    ],
    rabbinic: [
      { ref: 'Berakhot 57a', he: 'אֲפִילּוּ רֵיקָנִין שֶׁבָּךְ מְלֵאִים מִצְוֹת כְּרִמּוֹן', en: 'Reading רַקָּתֵךְ as רֵיקָנִין, "your empty ones": even the emptiest among you are as full of mitzvot as a pomegranate is of seeds.' },
      { ref: 'Mishnah Maasrot 1:2', he: 'הָרִמּוֹנִים, מִשֶּׁיִּמַּסּוּ', en: 'Pomegranates become liable for tithes once they soften.' },
    ],
    word: 'רִמּוֹן goes back to the Bronze Age (Egyptian borrowed it as rmn). Places were named after it: Rimmon, En-Rimmon, Gat-Rimmon.',
    modern: 'רִמּוֹן is also a hand grenade, from the shape and the segments. רימון יד, a hand pomegranate.',
    search: 'רמון',
  },
  {
    id: 'olive', he: 'זיתים', translit: 'zeitim', en: 'Olives', section: 'seven', shape: 'olive',
    colors: ['#3d4a1f', '#4f5c26', '#2a2a22', '#6b7232'], price: '24.90',
    hook: 'The dove brought back an olive leaf.',
    verses: [
      { book: 'Genesis', ch: 8, v: 11, he: 'וְהִנֵּה עֲלֵה זַיִת טָרָף בְּפִיהָ', en: 'And there in its beak was a plucked olive leaf.' },
      { book: 'Psalms', ch: 128, v: 3, he: 'בָּנֶיךָ כִּשְׁתִלֵי זֵיתִים סָבִיב לְשֻׁלְחָנֶךָ', en: 'Your children like olive saplings around your table.' },
    ],
    rabbinic: [
      { ref: 'Menachot 53b', he: 'מָה זַיִת אֵינוֹ מוֹצִיא שַׁמְנוֹ אֶלָּא עַל יְדֵי כְּתִיתָה', en: 'Why is Israel compared to an olive? Rabbi Yochanan: an olive gives its oil only when crushed. Rabbi Yehoshua ben Levi: an olive never sheds its leaves, summer or winter.' },
    ],
    word: 'זַיִת, shared across the Semitic languages (Arabic zaytūn). In the Deuteronomy list the olive is not plain זַיִת but זֵית שֶׁמֶן, the oil olive.',
    modern: 'כְּזַיִת, "an olive\'s bulk", is the smallest amount of food that counts in halakhah, which is why a matzah box tells you how much is a kezayit.',
    search: 'זית',
  },
  {
    id: 'dates', he: 'תמרים', translit: 'tamarim', en: 'Dates', section: 'seven', shape: 'date',
    colors: ['#6b3a1a', '#7a4420', '#5a2e14', '#8a5428'], price: '34.90',
    hook: 'The "honey" of the land of milk and honey, says Rashi.',
    verses: [
      { book: 'Psalms', ch: 92, v: 13, he: 'צַדִּיק כַּתָּמָר יִפְרָח', en: 'The righteous will flourish like the palm.' },
      { book: 'Deuteronomy', ch: 34, v: 3, he: 'בִּקְעַת יְרֵחוֹ עִיר הַתְּמָרִים', en: 'The valley of Jericho, the city of palm trees.' },
    ],
    rabbinic: [
      { ref: 'Rashi on Deuteronomy 8:8', en: 'On "a land of olive oil and honey": the honey is date honey (דבש תמרים), which is how the dates get into the Seven Species.' },
      { ref: 'Megillah 14a', he: 'מָה תָּמָר זֶה אֵין לוֹ אֶלָּא לֵב אֶחָד', en: 'Why did Deborah judge under a palm? A palm has only one heart, and Israel in her generation had one heart for their Father in heaven.' },
      { ref: 'Keritot 6a', en: 'One of Abaye\'s five Rosh Hashanah foods (תמרי), later read as שֶׁיִּתַּמּוּ אוֹיְבֵינוּ, may our enemies be finished.' },
    ],
    word: 'תָּמָר is the palm and its fruit, and a name (Tamar, Genesis 38). The other palm word, דֶּקֶל, is Aramaic, and it is the ancestor of English "date" by way of Greek daktylos.',
    balashon: { title: 'date and dekel', url: 'https://www.balashon.com/2016/12/date-and-dekel.html' },
    search: 'תמר',
  },

  // ── Egypt ─────────────────────────────────────────────────────────────────
  {
    id: 'kishu', he: 'קישואים', translit: "kishu'im", en: 'Zucchini', section: 'egypt', shape: 'zucchini',
    colors: ['#3f6b2a', '#4c7a32', '#5d8a3c', '#355c22'], price: '7.90',
    hook: 'First on the list of things the Israelites missed.',
    verses: [
      { book: 'Numbers', ch: 11, v: 5, he: 'זָכַרְנוּ אֶת הַדָּגָה אֲשֶׁר נֹאכַל בְּמִצְרַיִם חִנָּם אֵת הַקִּשֻּׁאִים', en: 'We remember the fish we ate in Egypt for free, the cucumbers…' },
      { book: 'Isaiah', ch: 1, v: 8, he: 'כִּמְלוּנָה בְמִקְשָׁה', en: 'Like a watchman\'s hut in a cucumber field.' },
    ],
    rabbinic: [
      { ref: 'Mishnah Kilayim 1:2', he: 'הַקִּשּׁוּת וְהַמְּלָפְפוֹן, אֵינָם כִּלְאַיִם זֶה בָזֶה', en: 'The kishut and the melafefon are not forbidden mixtures with each other. Rabbi Yehudah says they are.' },
    ],
    word: 'The Bible\'s קִשֻּׁאִים were probably a long cucumber-like melon (the snake melon). The field they grow in is a מִקְשָׁה.',
    modern: 'Modern Hebrew moved the name to the zucchini (courgette), a New World squash no Israelite ever ate, and gave the cucumber to melafefon.',
    balashon: { title: 'cucumber and kishu', url: 'https://www.balashon.com/2021/11/cucumber-and-kishu.html' },
    search: 'קשוא',
  },
  {
    id: 'avatiach', he: 'אבטיח', translit: 'avatiach', en: 'Watermelon', section: 'egypt', shape: 'melon',
    colors: ['#2d5a1e', '#356623', '#2a521c'], price: '3.90',
    hook: 'The second thing they missed. Israeli summers still run on it.',
    verses: [
      { book: 'Numbers', ch: 11, v: 5, he: 'וְאֵת הָאֲבַטִּחִים', en: '…and the melons.' },
    ],
    rabbinic: [],
    word: 'אֲבַטִּיחַ is the same word as Arabic biṭṭīkh. The watermelon is African, and the Israelites knew it from Egypt; Balashon looks at whether it has anything to do with בִּטָּחוֹן, trust.',
    modern: 'The Israeli summer plate: אבטיח with salty Bulgarian cheese.',
    balashon: { title: 'bitachon and avatiach', url: 'https://www.balashon.com/2023/07/bitachon-and-avatiach.html' },
    search: 'אבטיח',
  },
  {
    id: 'leek', he: 'כרשה', translit: 'karsha', en: 'Leeks', section: 'egypt', shape: 'leek',
    colors: ['#e8eadb', '#dfe5cf'], price: '8.90',
    hook: 'The Torah calls it chatzir, "grass". Onkelos and Rashi say: leek.',
    verses: [
      { book: 'Numbers', ch: 11, v: 5, he: 'וְאֶת הֶחָצִיר', en: '…and the leeks (literally "the grass").' },
    ],
    rabbinic: [
      { ref: 'Rashi on Numbers 11:5', en: 'החציר: כרתי, leeks.' },
      { ref: 'Keritot 6a', he: 'קָרָא וְרוּבְּיָא, כַּרָּתֵי, סִילְקָא וְתַמְרֵי', en: 'Abaye\'s Rosh Hashanah list. כרתי became שֶׁיִּכָּרְתוּ שׂוֹנְאֵינוּ, may our enemies be cut off.' },
      { ref: 'Mishnah Kilayim 1:2', en: 'כְּרֵשִׁים וּכְרֵשֵׁי שָׂדֶה: cultivated leeks and field leeks are not forbidden mixtures.' },
    ],
    word: 'Three words for one vegetable: biblical חָצִיר, Aramaic כַּרְתֵּי (which made the pun with כרת), and mishnaic כְּרֵשׁ, the source of today\'s כְּרֵשָׁה.',
    modern: 'חָצִיר today means hay, so a Numbers 11 reader in Israel pictures the Israelites missing cattle fodder.',
    balashon: { title: 'karti', url: 'https://www.balashon.com/2007/09/karti.html' },
    search: 'כרשה',
  },
  {
    id: 'onion', he: 'בצל', translit: 'batzal', en: 'Onions', section: 'egypt', shape: 'onion',
    colors: ['#b8742e', '#c4823a', '#a86728', '#8a3b5a'], price: '4.90',
    hook: 'Fourth on the list.',
    verses: [
      { book: 'Numbers', ch: 11, v: 5, he: 'וְאֶת הַבְּצָלִים', en: '…and the onions.' },
    ],
    rabbinic: [
      { ref: 'Mishnah Kilayim 1:3', he: 'הַבָּצָל וְהַבְּצַלְצוּל', en: 'Rabbi Akiva adds: the onion and the wild onion (batzaltzul) are not forbidden mixtures with each other.' },
    ],
    word: 'בָּצָל, with Aramaic בּוּצְלָא and Arabic baṣal. The ending of the mishnaic diminutive בְּצַלְצוּל doubles the last syllables, the way Hebrew makes "-ish" words (ירקרק, greenish).',
    modern: 'A בָּצָל is also a flower bulb: tulip bulbs are בצלי צבעונים.',
    search: 'בצל',
  },
  {
    id: 'garlic', he: 'שום', translit: 'shum', en: 'Garlic', section: 'egypt', shape: 'garlic',
    colors: ['#f2ede0', '#ebe3d0', '#e9dccb'], price: '19.90',
    hook: 'Last on the list, and one of Ezra\'s ten enactments.',
    verses: [
      { book: 'Numbers', ch: 11, v: 5, he: 'וְאֶת הַשּׁוּמִים', en: '…and the garlic.' },
    ],
    rabbinic: [
      { ref: 'Bava Kamma 82a', he: 'וְשֶׁיְּהוּ אוֹכְלִין שׁוּם בְּעֶרֶב שַׁבָּת', en: 'Ezra enacted that people eat garlic on Friday night, because of marital intimacy, which the Gemara goes on to explain.' },
      { ref: 'Mishnah Kilayim 1:3', en: 'הַשּׁוּם וְהַשּׁוּמָנִית: garlic and wild garlic, another of Rabbi Akiva\'s pairs.' },
    ],
    word: 'שׁוּם, Aramaic תּוּמָא, Arabic thūm. The Hebrew sh and Aramaic t are the regular sound match (as in שלוש / תלת).',
    modern: 'The same three letters spell שׁוּם, "any" or "no" (שום דבר, nothing). A coincidence of spelling, not a root.',
    search: 'שום',
  },

  // ── Simanim ───────────────────────────────────────────────────────────────
  {
    id: 'gourd', he: 'דלעת', translit: "dla'at", en: 'Pumpkin', section: 'simanim', shape: 'gourd',
    colors: ['#d9781c', '#e08a2a', '#c86a14', '#9aa55a'], price: '5.90',
    hook: 'Abaye\'s קרא: may the decree against us be torn up.',
    verses: [
      { book: '2 Kings', ch: 4, v: 39, he: 'וַיְלַקֵּט מִמֶּנּוּ פַּקֻּעֹת שָׂדֶה', en: 'He gathered wild gourds from it (and the stew became "death in the pot").' },
    ],
    rabbinic: [
      { ref: 'Keritot 6a', en: 'קָרָא, the gourd, first on Abaye\'s list. It later became שֶׁיִּקָּרַע רֹעַ גְּזַר דִּינֵנוּ, may the evil of our decree be torn (קרע) up, and שֶׁיִּקָּרְאוּ לְפָנֶיךָ זְכֻיּוֹתֵינוּ, may our merits be read (קרא) before You.' },
      { ref: 'Mishnah Kilayim 1:2', en: 'דְּלַעַת הַמִּצְרִי וְהָרְמוּצָה: the Egyptian gourd and the rmutzah are not forbidden mixtures.' },
    ],
    word: 'דְּלַעַת is the mishnaic word; the Aramaic is קָרָא. The bottle gourd of the Talmud was an Old World plant; the pumpkin in this crate is American, and inherited the name.',
    modern: 'דַּלַּעַת covers pumpkin and squash; the orange Halloween pumpkin is דלעת ערמונית or just דלעת.',
    search: 'דלעת',
  },
  {
    id: 'lubia', he: 'לוביה', translit: 'lubya', en: 'Black-eyed peas', section: 'simanim', shape: 'beans',
    colors: ['#efe6cf', '#e8dcc0', '#f3ecd9'], price: '14.90',
    hook: 'Rubia: may our merits multiply.',
    verses: [],
    rabbinic: [
      { ref: 'Keritot 6a', en: 'רוּבְּיָא, second on Abaye\'s list. Read with the Hebrew root רבה, it became שֶׁיִּרְבּוּ זְכֻיּוֹתֵינוּ, may our merits increase. Some identify rubia as fenugreek (Hebrew חִלְבָּה), others as black-eyed beans.' },
    ],
    word: 'Aramaic רוּבְּיָא; Arabic lūbiyā, from which Israeli Hebrew took לוּבְיָה. Sephardi families serve the beans on Rosh Hashanah; many Ashkenazi tables use fenugreek or carrots instead.',
    modern: 'In an Israeli shop, לוביה is black-eyed beans or the long green yard-long beans, and חילבה is the fenugreek paste in Yemenite cooking.',
    search: 'רוביא',
  },
  {
    id: 'beet', he: 'סלק', translit: 'selek', en: 'Beets', section: 'simanim', shape: 'beet',
    colors: ['#6a1430', '#7a1a38', '#5c1029'], price: '6.90',
    hook: 'Silka: may our enemies depart.',
    verses: [],
    rabbinic: [
      { ref: 'Keritot 6a', en: 'סִילְקָא, the beet, read as שֶׁיִּסְתַּלְּקוּ אוֹיְבֵינוּ, may our enemies depart (from the root סלק, remove).' },
      { ref: 'Mishnah Kilayim 1:3', en: 'הַתְּרָדִים וְהַלְּעוּנִים: chard (the leafy beet) and its wild relative.' },
    ],
    word: 'Aramaic סִילְקָא is often traced to Greek sikelē, "the Sicilian (plant)". The pun with Hebrew סִלֵּק works only because the borrowed word happens to sound like a native root.',
    modern: 'Modern סֶלֶק is beetroot; תְּרָד, the mishnaic chard, is now spinach.',
    search: 'סלק',
  },
  {
    id: 'carrot', he: 'גזר', translit: 'gezer', en: 'Carrots', section: 'simanim', shape: 'carrot',
    colors: ['#e86a12', '#f07a1e', '#dd5f0c'], price: '4.90',
    hook: 'Not on Abaye\'s list, but on most tables: גזר דין, the decree.',
    verses: [
      { book: 'Genesis', ch: 15, v: 17, he: 'אֲשֶׁר עָבַר בֵּין הַגְּזָרִים הָאֵלֶּה', en: 'Which passed between these pieces (at the covenant between the parts).' },
    ],
    rabbinic: [
    ],
    word: 'The root גזר means to cut: a גֶּזֶר in the Bible is a cut piece. The vegetable\'s name matches Arabic jazar, carrot. The carrot is a later addition to Abaye\'s list: Ashkenazim ate it because Yiddish מערן means both "carrots" and "to increase", and in Hebrew it became a pun on גְּזַר דִּין, the decree.',
    modern: 'גזר is the vegetable, גְּזֵרָה is a decree, and גִּזְרָה is a figure, as in a slim one. The same cut runs through all three.',
    search: 'גזר',
  },

  // ── Coined ────────────────────────────────────────────────────────────────
  {
    id: 'tapuz', he: 'תפוזים', translit: 'tapuzim', en: 'Oranges', section: 'coined', shape: 'citrus',
    colors: ['#f08a12', '#f59a20', '#e87e0a'], price: '5.90',
    hook: 'A two-word phrase from Proverbs, squeezed into one.',
    verses: [
      { book: 'Proverbs', ch: 25, v: 11, he: 'תַּפּוּחֵי זָהָב בְּמַשְׂכִּיּוֹת כָּסֶף', en: 'Golden apples in silver settings: a word spoken at the right time.' },
    ],
    rabbinic: [],
    word: 'תַּפּוּז is a portmanteau of תַּפּוּחַ זָהָב, "golden apple", which is how Hebrew writers had long described the orange, as many European languages did (Dutch sinaasappel, "Chinese apple").',
    modern: 'The Jaffa orange made the תפוז a national brand. Hebrew kept squeezing: the crisps brand תפוצ\'יפס is תפוח אדמה plus chips.',
    search: 'תפוז',
  },
  {
    id: 'agvaniya', he: 'עגבניות', translit: 'agvaniyot', en: 'Tomatoes', section: 'coined', shape: 'tomato',
    colors: ['#d8241c', '#e0301f', '#c81c16', '#e85a20'], price: '7.90',
    hook: 'Named, scandalously, for lust.',
    verses: [
      { book: 'Ezekiel', ch: 23, v: 5, he: 'וַתַּעְגַּב עַל מְאַהֲבֶיהָ', en: 'She lusted after her lovers.' },
    ],
    rabbinic: [],
    word: 'The usual account: in the 1880s Yechiel Michel Pines built עַגְבָנִיָּה from the root עגב, "lust", translating the European "love apple" (pomme d\'amour, Liebesapfel). Some objected to naming a salad vegetable after Ezekiel\'s harlot, and for a while the tomato was also called by its Arabic name, bandura.',
    modern: 'בַּנְדוּרָה survived as slang. The Academy\'s word stuck in print, and the Israeli salad is עגבנייה-מלפפון.',
    search: 'עגבניה',
  },
  {
    id: 'potato', he: 'תפוחי אדמה', translit: "tapuchei adama", en: 'Potatoes', section: 'coined', shape: 'potato',
    colors: ['#c49a5a', '#b88e50', '#caa468'], price: '3.90',
    hook: 'An apple of the earth, borrowed from French and German.',
    verses: [
      { book: 'Genesis', ch: 2, v: 7, he: 'וַיִּיצֶר ה׳ אֱלֹהִים אֶת הָאָדָם עָפָר מִן הָאֲדָמָה', en: 'God formed the man of dust from the ground (אדמה).' },
    ],
    rabbinic: [],
    word: 'תַּפּוּחַ אֲדָמָה is a calque, a word-for-word translation, of French pomme de terre and German Erdapfel. The potato is from the Andes, so there was no older Hebrew word to revive.',
    modern: 'Nobody says it in full: it is תַּפּוּ"א, and the chips are צִ\'יפְּס. The fries in a falafel pita are just צ\'יפס.',
    search: 'תפוח אדמה',
  },
  {
    id: 'melafefon', he: 'מלפפונים', translit: 'melafefonim', en: 'Cucumbers', section: 'coined', shape: 'cucumber',
    colors: ['#2e5a22', '#3a6a2a', '#28501e'], price: '5.90',
    hook: 'In the Mishnah it was a melon.',
    verses: [],
    rabbinic: [
      { ref: 'Mishnah Kilayim 1:2', he: 'הַקִּשּׁוּת וְהַמְּלָפְפוֹן, אֵינָם כִּלְאַיִם זֶה בָזֶה', en: 'The kishut and the melafefon are not forbidden mixtures. Rabbi Yehudah disagrees.' },
    ],
    word: 'Usually traced to Greek mēlopepōn, "apple-melon", a kind of melon. Balashon also weighs a Hebrew root, לפף, "wrap", the source of לָפָה (the wrap-bread) and of לוּף.',
    modern: 'Modern Hebrew gave the cucumber the mishnaic melon\'s name and the zucchini the biblical cucumber\'s name. The Israeli salad was assembled from reassigned words.',
    balashon: { title: 'melafefon', url: 'https://www.balashon.com/2007/04/melafefon.html' },
    search: 'מלפפון',
  },
  {
    id: 'banana', he: 'בננות', translit: 'bananot', en: 'Bananas', section: 'coined', shape: 'banana',
    colors: ['#f2d33a', '#ecc92e', '#f5da4a'], price: '8.90',
    hook: 'The Hebrew word that lost.',
    verses: [],
    rabbinic: [],
    word: 'Hebrew coiners proposed מוֹז, from Arabic mawz, the banana\'s name across the Arab world. Speakers kept the international בננה instead, one of the clearest cases of a coinage that never caught on.',
    modern: 'Banana plantations around the Kinneret date back to the early kibbutzim, so the fruit is local. Its name is not.',
    search: 'מוז',
  },
  {
    id: 'strawberry', he: 'תותים', translit: 'tutim', en: 'Strawberries', section: 'coined', shape: 'strawberry',
    colors: ['#d41c2a', '#c81424', '#e02a34'], price: '19.90',
    hook: 'The Mishnah\'s tut was a mulberry.',
    verses: [],
    rabbinic: [
      { ref: 'Mishnah Maasrot 1:2', he: 'הָאוֹג וְהַתּוּתִים, מִשֶּׁיַּאְדִּימוּ', en: 'Sumac berries and mulberries become liable for tithes when they turn red.' },
    ],
    word: 'תּוּת, Aramaic תּוּתָא, Arabic tūt: the mulberry tree. The garden strawberry arrived much later and was called תּוּת שָׂדֶה, the field mulberry.',
    modern: 'Today תּוּת alone usually means strawberry, and the mulberry is תות עץ.',
    search: 'תות',
  },

  // ── Orchard ───────────────────────────────────────────────────────────────
  {
    id: 'apple', he: 'תפוחים', translit: 'tapuchim', en: 'Apples', section: 'orchard', shape: 'apple',
    colors: ['#c0202a', '#d4342a', '#8fb33a', '#e0b030', '#b51c28'], price: '9.90',
    hook: 'Fruit before leaves, like "we will do and we will hear".',
    verses: [
      { book: 'Song of Songs', ch: 2, v: 3, he: 'כְּתַפּוּחַ בַּעֲצֵי הַיַּעַר כֵּן דּוֹדִי בֵּין הַבָּנִים', en: 'Like an apple tree among the trees of the forest, so is my beloved among the young men.' },
      { book: 'Joel', ch: 1, v: 12, he: 'רִמּוֹן גַּם תָּמָר וְתַפּוּחַ', en: 'Pomegranate, palm and apple tree, all withered.' },
    ],
    rabbinic: [
      { ref: 'Shabbat 88a', he: 'לָמָּה נִמְשְׁלוּ יִשְׂרָאֵל לְתַפּוּחַ? לוֹמַר לְךָ: מָה תַּפּוּחַ זֶה פִּרְיוֹ קוֹדֵם לְעָלָיו', en: 'Why is Israel compared to an apple tree? Its fruit comes before its leaves, as Israel said "we will do" before "we will hear".' },
    ],
    word: 'From the root נפח, to breathe or give off scent: a תַּפּוּחַ is a fragrant fruit. Which fruit the Bible meant (apple, quince, apricot, citron) is argued about by botanists and by Balashon.',
    modern: 'Tapuach is the template for half the aisle: תפוז (golden apple), תפוח אדמה (earth apple), and English "pineapple" is אננס, which mercifully is not.',
    balashon: { title: 'tapuach', url: 'https://www.balashon.com/2006/06/tapuach.html' },
    search: 'תפוח',
  },
  {
    id: 'peach', he: 'אפרסקים', translit: 'afarsekim', en: 'Peaches', section: 'orchard', shape: 'peach',
    colors: ['#f0a060', '#e8884a', '#f4b070', '#e07a4a'], price: '14.90',
    hook: 'The Persian fruit.',
    verses: [],
    rabbinic: [
      { ref: 'Mishnah Maasrot 1:2', he: 'הָאֲפַרְסְקִים, מִשֶּׁיָּטִּילוּ גִידִים', en: 'Peaches become liable for tithes once they show their veins.' },
    ],
    word: 'From Greek persikon (mēlon), "the Persian (apple)", via Latin persicum, which also gave French pêche and English peach. The Mishnah has the fruit under its Greek name.',
    modern: 'אֲפַרְסֵק is peach; the apricot is מִשְׁמֵשׁ (Arabic mishmish), and the nectarine is a נֶקְטָרִינָה.',
    search: 'אפרסק',
  },
  {
    id: 'lemon', he: 'לימונים', translit: 'limonim', en: 'Lemons (and the etrog)', section: 'orchard', shape: 'citrus',
    colors: ['#f2dc2a', '#ecd31e', '#e0d040', '#c8c83a'], price: '7.90',
    hook: 'The Torah\'s "fruit of the hadar tree" is a cousin in the next crate.',
    verses: [
      { book: 'Leviticus', ch: 23, v: 40, he: 'וּלְקַחְתֶּם לָכֶם בַּיּוֹם הָרִאשׁוֹן פְּרִי עֵץ הָדָר', en: 'On the first day take the fruit of the hadar tree.' },
    ],
    rabbinic: [
      { ref: 'Sukkah 35a', en: 'Which fruit is "the fruit of the hadar tree"? A tree whose wood tastes like its fruit: the etrog.' },
    ],
    word: 'לִימוֹן comes from Persian līmūn through Arabic. אֶתְרוֹג comes from Persian too (turunj, also behind Spanish toronja, grapefruit).',
    modern: 'Before Sukkot the supermarket sells lemons and the shuk sells etrogim; an etrog that fails inspection still makes a fine jam.',
    balashon: { title: 'etrog', url: 'https://www.balashon.com/2006/10/etrog.html' },
    search: 'אתרוג',
  },

  // ── Greens ────────────────────────────────────────────────────────────────
  {
    id: 'lettuce', he: 'חסה', translit: 'chasa', en: 'Lettuce', section: 'greens', shape: 'lettuce',
    colors: ['#6aa83a', '#7ab84a', '#5a9a30'], price: '6.90', unit: 'יח׳',
    hook: 'The first choice for maror: God had mercy on us.',
    verses: [
      { book: 'Exodus', ch: 12, v: 8, he: 'וּמַצּוֹת עַל מְרֹרִים יֹאכְלֻהוּ', en: 'They shall eat it with matzah and bitter herbs.' },
    ],
    rabbinic: [
      { ref: 'Pesachim 39a', en: 'The Mishnah lists חֲזֶרֶת first among the bitter herbs. The Gemara: חזרת is חַסָּא, lettuce, and the name is a lesson: דְּחָס רַחֲמָנָא עֲלַן, the Merciful One had mercy on us.' },
    ],
    word: 'Mishnaic חֲזֶרֶת and Aramaic חַסָּא; Arabic khass. Modern Hebrew took the Aramaic, and the חזרת on today\'s seder plate is usually horseradish instead.',
    modern: 'חסה is lettuce. And the חזרת of Pesachim became, by a long detour through Eastern Europe, the horseradish jar.',
    search: 'חסה',
  },
  {
    id: 'cabbage', he: 'כרוב', translit: 'kruv', en: 'Cabbage', section: 'greens', shape: 'cabbage',
    colors: ['#a8c890', '#98bc80', '#7a2a5a'], price: '4.90', unit: 'יח׳',
    hook: 'Spelled exactly like the cherubim on the Ark.',
    verses: [
      { book: 'Exodus', ch: 25, v: 18, he: 'וְעָשִׂיתָ שְׁנַיִם כְּרֻבִים זָהָב', en: 'Make two cherubim of gold.' },
    ],
    rabbinic: [
      { ref: 'Mishnah Kilayim 1:3', he: 'וְהַכְּרוּב וְהַתְּרוֹבְתוֹר', en: 'Cabbage and cauliflower (truvtor) are not forbidden mixtures with each other.' },
    ],
    word: 'Same letters, different roots. The cherub is likely from Akkadian karibu, "one who blesses"; the cabbage from Aramaic כְּרוּבָא, related to Greek krambē. Jastrow tried to unite them as "round things"; Balashon is not convinced.',
    modern: 'כְּרוּבִית, "little cabbage", is cauliflower. The Mishnah\'s תְּרוֹבְתוֹר was retired.',
    balashon: { title: 'kruv', url: 'https://www.balashon.com/2007/07/kruv.html' },
    search: 'כרוב',
  },
  {
    id: 'coriander', he: 'כוסברה', translit: 'kusbara', en: 'Coriander', section: 'greens', shape: 'herb',
    colors: ['#3e8a2a', '#4a9a32', '#357a22'], price: '3.90', unit: 'צרור',
    hook: 'The manna looked like its seed.',
    verses: [
      { book: 'Exodus', ch: 16, v: 31, he: 'וְהוּא כְּזֶרַע גַּד לָבָן', en: 'It was like coriander seed, white.' },
    ],
    rabbinic: [
      { ref: 'Rashi on Exodus 16:31', en: 'זרע גד: an herb whose seed is round, called coliandre in Old French.' },
      { ref: 'Mishnah Kilayim 1:2', en: 'כֻּסְבָּר וְכֻסְבַּר שָׂדֶה: garden and wild coriander are not forbidden mixtures.' },
    ],
    word: 'The Bible says גַּד; the Mishnah says כֻּסְבָּר, close to Arabic kuzbara. Israeli Hebrew settled on כּוּסְבָּרָה.',
    modern: 'A צרור כוסברה is in every Israeli fridge door. גד is now just a name (and Gad, the tribe).',
    search: 'כסבר',
  },
  {
    id: 'pepper', he: 'פלפלים', translit: 'pilpelim', en: 'Peppers', section: 'greens', shape: 'pepper',
    colors: ['#d82020', '#f2c018', '#e87a10', '#2a7a20'], price: '9.90',
    hook: 'Black pepper in the Talmud, bell pepper in the shuk, pilpul in the yeshivah.',
    verses: [],
    rabbinic: [
      { ref: 'Berakhot 36b', en: 'Rabbi Meir reads "a tree for food" (Leviticus 19:23) as a tree whose wood tastes like its fruit, and says that is the pepper: so peppercorns are subject to orlah. Sukkah 35a uses the same test to find the etrog.' },
    ],
    word: 'פִּלְפֵּל came from Sanskrit pippalī, long pepper, along the spice routes, as did Greek peperi and English pepper. The sharp kind of Talmud study, פִּלְפּוּל, is usually tied to the same sharpness.',
    modern: 'The New World capsicum took the old spice\'s name: פלפל אדום, bell pepper; פלפל חריף, chili; פלפל שחור, the original.',
    search: 'פלפל',
  },

  // ── Bins ──────────────────────────────────────────────────────────────────
  {
    id: 'almond', he: 'שקדים', translit: 'shkedim', en: 'Almonds', section: 'bins', shape: 'almond',
    colors: ['#a86a3a', '#b4764a', '#9a5e30'], price: '49.90',
    hook: 'The tree that hurries: first to bloom, at Tu BiShvat.',
    verses: [
      { book: 'Jeremiah', ch: 1, v: 11, he: 'מַקֵּל שָׁקֵד אֲנִי רֹאֶה', en: '"I see an almond branch." (And God: "I am watchful [שֹׁקֵד] over My word.")' },
      { book: 'Numbers', ch: 17, v: 23, he: 'וַיָּצֵץ צִיץ וַיִּגְמֹל שְׁקֵדִים', en: 'Aaron\'s staff blossomed and bore almonds.' },
    ],
    rabbinic: [
      { ref: 'Mishnah Maasrot 1:2', he: 'רַבִּי יְהוּדָה אוֹמֵר, הָאֱגוֹזִים וְהַשְּׁקֵדִים, מִשֶּׁיַּעֲשׂוּ קְלִפָּה', en: 'Rabbi Yehudah: walnuts and almonds become liable for tithes once they form a shell.' },
    ],
    word: 'שָׁקֵד from the root שקד, to be watchful or diligent: the almond wakes first. Jeremiah\'s vision is a pun on that root.',
    modern: 'A שַׁקְדָן is a diligent student. "הַשְּׁקֵדִיָּה פּוֹרַחַת" is the Tu BiShvat song every Israeli kid knows.',
    balashon: { title: 'meged, almond and armageddon', url: 'https://www.balashon.com/2021/09/meged-almond-and-armageddon.html' },
    search: 'שקד',
  },
  {
    id: 'walnut', he: 'אגוזים', translit: 'egozim', en: 'Walnuts', section: 'bins', shape: 'walnut',
    colors: ['#8a6038', '#9a6c40', '#7a5430'], price: '39.90',
    hook: 'King Solomon\'s nut garden.',
    verses: [
      { book: 'Song of Songs', ch: 6, v: 11, he: 'אֶל גִּנַּת אֱגוֹז יָרַדְתִּי', en: 'I went down to the nut garden.' },
    ],
    rabbinic: [
      { ref: 'Rashi on Song of Songs 6:11', he: 'מָה אֱגוֹז זֶה נוֹפֵל בַּטִּיט וְאֵין מַה שֶּׁבְּתוֹכוֹ נִמְאָס', en: 'Why is Israel compared to a nut? It looks like plain wood, but crack it and it is full of chambers of food, as Israel\'s scholars are modest. And a nut falls in the mud and what is inside is not spoiled.' },
      { ref: 'Mishnah Maasrot 1:2', he: 'הָאֱגוֹזִים, מִשֶּׁיַּעֲשׂוּ מְגוּרָה', en: 'Walnuts become liable for tithes once they form their storage chamber.' },
    ],
    word: 'אֱגוֹז, related to Persian gōz and Aramaic אַמְגוֹזָא. The Bible uses it only once, in the Song of Songs.',
    modern: 'אֱגוֹז is any nut and specifically the walnut; אגוז מלך, "king nut", is the walnut in full, and אגוז קוקוס the coconut. In slang an אגוז קשה is a tough nut.',
    search: 'אגוז',
  },
  {
    id: 'carob', he: 'חרובים', translit: 'charuvim', en: 'Carob', section: 'bins', shape: 'carob',
    colors: ['#3a2416', '#4a2e1c', '#2e1c12'], price: '29.90',
    hook: 'Choni\'s seventy-year tree; Rabbi Shimon\'s twelve years in a cave.',
    verses: [],
    rabbinic: [
      { ref: 'Taanit 23a', en: 'Choni HaMe\'agel saw a man planting a carob, which takes seventy years to bear. "Do you expect to live to eat from it?" "I found carobs in the world; my fathers planted for me, and I plant for my children."' },
      { ref: 'Shabbat 33b', en: 'Rabbi Shimon bar Yochai and his son hid in a cave for twelve years; a carob tree and a spring of water were created for them.' },
      { ref: 'Mishnah Kilayim 1:2', en: 'וּפוֹל מִצְרִי וְהֶחָרוּב: the Egyptian bean and the carob are not forbidden mixtures with each other.' },
    ],
    word: 'חָרוּב; Arabic kharrūb, which became English carob. The carob seed was so even in weight that it became a unit of measure, the carat (Greek keration, "little horn", the pod\'s shape).',
    modern: 'Bought by the bag for Tu BiShvat, alongside dried figs and dates.',
    search: 'חרוב',
  },
  {
    id: 'fava', he: 'פול', translit: 'ful', en: 'Fava beans', section: 'bins', shape: 'pod',
    colors: ['#6a9a3a', '#5a8a30', '#7aa848'], price: '12.90',
    hook: 'Food brought to David in the wilderness.',
    verses: [
      { book: '2 Samuel', ch: 17, v: 28, he: 'וְחִטִּים וּשְׂעֹרִים וְקֶמַח וְקָלִי וּפוֹל וַעֲדָשִׁים וְקָלִי', en: 'Wheat, barley, flour, roasted grain, beans and lentils (brought to David fleeing Absalom).' },
      { book: 'Ezekiel', ch: 4, v: 9, he: 'קַח לְךָ חִטִּין וּשְׂעֹרִים וּפוֹל וַעֲדָשִׁים', en: 'Take wheat and barley, beans and lentils (and bake Ezekiel\'s siege bread).' },
    ],
    rabbinic: [
      { ref: 'Mishnah Kilayim 1:2', en: 'פּוֹל מִצְרִי: the "Egyptian bean", paired with the carob.' },
    ],
    word: 'פּוֹל is biblical and still the same bean. Arabic fūl, as in the stewed fūl medammes of every Jerusalem hummus place.',
    modern: 'פּוֹל is the fava, and also any bean of a certain kind: פּוֹלֵי קָפֶה are coffee beans, פולי סויה soybeans.',
    search: 'פול',
  },
  {
    id: 'lentils', he: 'עדשים', translit: 'adashim', en: 'Lentils', section: 'bins', shape: 'lentil',
    colors: ['#c8501e', '#b8461a', '#d45a24'], price: '11.90',
    hook: 'Jacob\'s stew, Esau\'s birthright.',
    verses: [
      { book: 'Genesis', ch: 25, v: 34, he: 'וְיַעֲקֹב נָתַן לְעֵשָׂו לֶחֶם וּנְזִיד עֲדָשִׁים', en: 'Jacob gave Esau bread and lentil stew.' },
    ],
    rabbinic: [
      { ref: 'Bava Batra 16b', en: 'Jacob was cooking lentils because Abraham had died that day, and lentils are mourners\' food: round like a wheel, as mourning comes round to everyone.' },
    ],
    word: 'עֲדָשָׁה, plural עֲדָשִׁים, shared with Arabic ʿadas.',
    modern: 'עֲדָשָׁה is also an optical lens, from the lentil\'s shape (as Latin lens, "lentil", gave English its lens). Contact lenses are עדשות מגע.',
    search: 'עדשים',
  },
];
