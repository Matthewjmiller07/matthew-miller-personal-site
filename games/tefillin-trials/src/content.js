// Everything halachic in the game comes from the SCP chabura on Hilchot Tefillin, siman 25
// (source sheet #36-57) and the shiur that went through it. Sheet numbers are cited as "#37".

export const RAMBAM = {
  he: 'קְדֻשַּׁת תְּפִלִּין קְדֻשָּׁתָן גְּדוֹלָה הִיא, שֶׁכָּל זְמַן שֶׁהַתְּפִלִּין בְּרֹאשׁוֹ שֶׁל אָדָם וְעַל זְרוֹעוֹ הוּא עָנָיו וִירֵא שָׁמַיִם, וְאֵינוֹ נִמְשָׁךְ בִּשְׂחוֹק וּבְשִׂיחָה בְּטֵלָה, וְאֵינוֹ מְהַרְהֵר מַחֲשָׁבוֹת רָעוֹת, אֶלָּא מְפַנֶּה לִבּוֹ בְּדִבְרֵי הָאֱמֶת וְהַצֶּדֶק.',
  en: 'The holiness of tefillin is great: as long as they are on a person’s head and arm, he is humble and God-fearing, is not drawn to joking and idle talk, and does not entertain bad thoughts, but turns his heart to words of truth and justice.',
  ref: 'Rambam, Hilchot Tefillin 4:25',
};

export const HINENI = [
  { who: 'When Hashem calls', line: 'וַיֹּאמֶר אֵלָיו אַבְרָהָם וַיֹּאמֶר הִנֵּנִי', note: 'Learning and davening: the moments you need to be fully present.' },
  { who: 'When your child calls', line: 'וַיֹּאמֶר אָבִי וַיֹּאמֶר הִנֶּנִּי בְנִי', note: 'Yitzchak calls “Abba”. Not on your phone, not somewhere else. Here.' },
  { who: 'When your friends call', line: 'וַיִּקְרָא אֵלָיו מַלְאַךְ ה׳ ... וַיֹּאמֶר הִנֵּנִי', note: 'The malachim were Avraham’s guests. Dinner with friends? Put the phone away.' },
];

// ── Trial 1: the worksheet (the chabura's own questions, answered from the shiur) ──
export const WORKSHEET = [
  {
    q: 'How many brachot do you recite before putting on tefillin? What is the source?',
    options: [
      { t: 'Sefardim make one (lehaniach covers both); Ashkenazim make two (lehaniach on the shel yad, al mitzvat tefillin on the shel rosh)', ok: true },
      { t: 'Everyone makes two; the Gemara says so explicitly' },
      { t: 'Everyone makes one; the Rema agrees with the Shulchan Aruch' },
      { t: 'Three: lehaniach, al mitzvat, and Baruch Shem' },
    ],
    why: 'Menachot 36a (#37): Abaye and Rava say “lo sach, mevarech achat; sach, mevarech shtayim.” Rashi reads it as one bracha for both tefillin, with a second only if you spoke. Rabbeinu Tam (Tosafot Berachot 60b, #38) reads it about the shel rosh alone: it always gets al mitzvat, and if you spoke it gets lehaniach as well. Shulchan Aruch 25:5 rules one bracha (like Rashi, the Rambam and the Rif). The Rema: Ashkenazi custom is two, followed by Baruch Shem.',
  },
  {
    q: 'Your friend is putting on Rabbeinu Tam tefillin and chatting between the shel yad and the shel rosh. Someone runs over: “You can’t talk there!” Is he right?',
    options: [
      { t: 'Yes. There’s no bracha on Rabbeinu Tam tefillin, but the Mishnah Berurah still says not to talk: the two should go on one right after the other', ok: true },
      { t: 'No. No bracha means no problem at all' },
      { t: 'Yes, and now he has to make a bracha on the Rabbeinu Tam shel rosh' },
      { t: 'No. The rule only applies on Chol Hamoed' },
    ],
    why: 'Two reasons talking is an aveira. The Ran (#41): it makes you say an extra bracha you didn’t need, so with no bracha there’s nothing to worry about. The Baal HaMaor (#40): “le’ot al yadecha ... u’lezikaron bein einecha” means the shel rosh must follow the shel yad right away, “one act for both of them.” Mishnah Berurah 25:28 is strict like both: even with Rabbeinu Tam tefillin, on Chol Hamoed, or putting them back on without a bracha, “עבירה היא להסיח ביניהם.”',
  },
  {
    q: 'You’ve just started wrapping the shel yad when the chazan begins Kaddish. May you answer “Amen, yehei shemei rabba” before the shel rosh?',
    options: [
      { t: 'No. Stay silent, listen, and have in mind what they’re saying', ok: true },
      { t: 'Yes. Yehei shemei rabba is too important to miss' },
      { t: 'Only Ashkenazim, since they make a second bracha anyway' },
      { t: 'Yes, as long as you say Baruch Shem afterwards' },
    ],
    why: 'Shulchan Aruch 25:10: if you hear Kaddish or Kedusha between the shel yad and the shel rosh, don’t stop to answer; “שותק ושומע ומכוין למה שאומרים.” Mishnah Berurah 25:36: if you did answer (yehei shemei rabba, Kedusha, Barchu or any amen), you have to bless again. The Ashkenazi second bracha doesn’t help: the lehaniach covers the shel rosh too. Practical tip from the shiur: if Kaddish is about to start, wait, answer, then put them on.',
  },
  {
    q: 'Next day, you finish tightening the shel rosh just as the chazan reaches “yehei shemei rabba.” Do you answer before saying Baruch Shem?',
    options: [
      { t: 'Yes. Answering amen is a full obligation; Baruch Shem is only “good to say”', ok: true },
      { t: 'No. Baruch Shem has to come first to fix the possible bracha levatala' },
      { t: 'No. It’s a hefsek between the bracha and the mitzvah' },
      { t: 'Only if you say Baruch Shem in the middle of the Kaddish' },
    ],
    why: 'Siach Halacha (#45): answer with the tzibbur. Baruch Shem is only lirvacha d’milta (Rema; Mishnah Berurah 25:21) and the Levush leaves it out, while answering amen is a real chiyuv. Rav Shlomo Zalman adds: have your yehei shemei rabba count for the possible bracha levatala too, “הרי זה עולה לכאן ולכאן.” They mean almost the same thing, one in Aramaic.',
  },
  {
    q: 'Shabbat night, you washed first and you’re humming a niggun while 20 other guests wash. The host says “Shh!” Is he right? And may you hum between the shel yad and the shel rosh?',
    options: [
      { t: 'Humming before Hamotzi is fine (Rav Chaim Kanievsky did); between the shel yad and the shel rosh it isn’t', ok: true },
      { t: 'Forbidden in both cases' },
      { t: 'Fine in both; a niggun has no words' },
      { t: 'Forbidden before Hamotzi, fine between the shel yad and the shel rosh' },
    ],
    why: 'After netilat yadayim, the mitzvah of washing is finished. The Rambam lets you talk as long as your mind stays on the meal; the Shulchan Aruch says “טוב ליזהר”, but if you did talk you don’t wash again. Ela Dalet Amot (#48): Rav Chaim Kanievsky wasn’t particular about “nu, nu” and didn’t hold back from humming. After Hamotzi it’s different (Beit Yehudi, #49): the bracha is waiting for the eating. Between the shel yad and the shel rosh is like after Hamotzi, because the lehaniach already covers the shel rosh you haven’t put on yet.',
  },
  {
    q: 'When should you say “Baruch shem kevod malchuto le’olam va’ed”?',
    options: [
      { t: 'Only after the shel rosh is fastened properly in place', ok: true },
      { t: 'While you tighten the shel rosh, to save time' },
      { t: 'Right after the bracha, before you place it' },
      { t: 'After the shel yad, before the shel rosh' },
    ],
    why: 'Mishnah Berurah 25:21: “ויזהר מאוד שלא לומר ברוך שם רק אחר שהידק של ראש כראוי.” Otherwise it’s a hefsek between the bracha and putting them on, the bracha is levatala for sure, and you have to bless again. “והעולם נכשלין בזה”: people running late to shul do this all the time.',
  },
  {
    q: 'The man next to you says “...al mitzvat tefillin” out loud. Should you answer amen?',
    options: [
      { t: 'It’s doubtful, so the Kitzur says it’s better for him to say that bracha quietly', ok: true },
      { t: 'Always. Every bracha you hear gets an amen' },
      { t: 'Never. It’s definitely a bracha levatala' },
      { t: 'Only if you’re Sefardi' },
    ],
    why: 'Siman 215: just as you may not make a bracha levatala, you may not answer amen to one. According to Rashi (when he didn’t talk in between) al mitzvat is unnecessary; according to Rabbeinu Tam it’s required. Kitzur Shulchan Aruch 10:4 (#46): since there’s some doubt, there’s also doubt whether the listener should answer, “על כן נראה לי כי טוב לברך ברכה זאת בלחש.”',
  },
  {
    q: 'You borrow the shul’s spare tefillin, and the shel rosh hangs loose. What does the Mishnah Berurah warn?',
    options: [
      { t: 'You may not fulfill the mitzvah, and your bracha is levatala, with Baruch Shem doing nothing to undo it', ok: true },
      { t: 'No problem; Baruch Shem at the end cancels any bracha levatala' },
      { t: 'It only matters for the shel yad' },
      { t: 'Borrowing tefillin is forbidden' },
    ],
    why: 'Mishnah Berurah 25:2: a borrowed knot may be too big or too small and you’re too lazy (or the owner won’t let you) fix it. Pri Megadim: tefillin not in their place are as if they were still in their bag. So you don’t fulfill the mitzvah, you bless levatala, and transgress lo tisa. The proof from the shiur: we say Baruch Shem every day, and he still calls it levatala. Baruch Shem doesn’t erase the bracha; it only softens it, by praising Hashem’s name right after mentioning it for nothing.',
  },
  {
    q: '“Al mitzvat tefillin”: patach or cholam under the vav?',
    options: [
      { t: 'Patach: mitzvAt, singular, because the bracha is only for the shel rosh', ok: true },
      { t: 'Cholam: mitzvOt, plural, because there are two tefillin' },
      { t: 'Either is fine' },
      { t: 'Kamatz, like Shabbat' },
    ],
    why: 'Mishnah Berurah 25:20: “על מצות בפתח תחת הו׳ שהוא לשון יחידי, ולא יאמר בחולם שהוא לשון רבים, שהרי לא נתקנה ברכה זו כי אם לתפילין של ראש בלבד.”',
  },
];

// ── Trial 2: Rashi vs Rabbeinu Tam. side: 'rashi' | 'rt' | 'both' ──
export const SORT_CARDS = [
  { t: '“Lo sach, mevarech achat” means one bracha that covers both tefillin.', side: 'rashi' },
  { t: '“Lo sach, mevarech achat” is talking about the shel rosh alone.', side: 'rt' },
  { t: 'The shel rosh always gets “al mitzvat tefillin.”', side: 'rt' },
  { t: 'Al mitzvat is said only if you spoke in between.', side: 'rashi' },
  { t: 'If you spoke, the shel rosh gets two brachot: lehaniach again and al mitzvat.', side: 'rt' },
  { t: 'The aveira of talking is putting on the shel rosh without a new bracha.', side: 'rashi' },
  { t: 'Chazal wouldn’t make a whole bracha just for someone who sinned.', side: 'rt' },
  { t: 'Spoke, then blessed? No sin at all: it’s a mitzvah, the reward of a bracha.', side: 'rashi' },
  { t: 'The shel rosh is the gemar mitzvah: four compartments and the shin.', side: 'rt' },
  { t: 'Shulchan Aruch 25:5 rules this way.', side: 'rashi' },
  { t: 'The Rema and Ashkenazi custom follow this view.', side: 'rt' },
  { t: 'The Gra, the Rambam and the Rif rule this way.', side: 'rashi' },
  { t: 'Rav Shlomo Zalman proves it from terumot and maasrot: one bracha is enough.', side: 'rashi' },
  { t: 'The Mishnah Berurah says “we Ashkenazim hold like him.”', side: 'rt' },
  { t: 'You may not talk between the shel yad and the shel rosh.', side: 'both' },
  { t: 'If you spoke in between, the shel rosh gets al mitzvat tefillin.', side: 'both' },
  { t: 'There is a bracha of lehaniach on the shel yad.', side: 'both' },
  { t: 'The Steipler and the Chazon Ish made one bracha, like him.', side: 'rashi' },
];

// ── Trial 3: who said it? ──
export const POSKIM = {
  mahari: { name: 'Mahari ben Chaviv', he: 'מהרי״ב חביב', color: '#c08bff' },
  beityosef: { name: 'Beit Yosef', he: 'בית יוסף', color: '#5fb3ff' },
  steipler: { name: 'The Steipler', he: 'הסטייפלר', color: '#7ad1a8' },
  chafetz: { name: 'Chafetz Chaim', he: 'החפץ חיים', color: '#ffb55f' },
  rsza: { name: 'Rav Shlomo Zalman', he: 'רש״ז אויערבך', color: '#ff7a8a' },
  rae: { name: 'Rabbi Akiva Eiger', he: 'רעק״א', color: '#ffd84a' },
  prim: { name: 'Pri Megadim', he: 'פרי מגדים', color: '#9adf5a' },
  maor: { name: 'Baal HaMaor', he: 'בעל המאור', color: '#ff9b3d' },
  ran: { name: 'The Ran', he: 'הר״ן', color: '#4ad3d8' },
  mb: { name: 'Mishnah Berurah', he: 'משנה ברורה', color: '#e7e9f0' },
  birkat: { name: 'Birkat HaBayit', he: 'ברכת הבית', color: '#ff6fd1' },
  rchaim: { name: 'Rav Chaim Kanievsky', he: 'רב חיים', color: '#8fe0ff' },
  elyashiv: { name: 'Rav Elyashiv', he: 'הגרי״ש', color: '#b0a0ff' },
  beityehudi: { name: 'Beit Yehudi', he: 'בית יהודי', color: '#ffa0a0' },
  piskei: { name: 'Piskei Teshuvot', he: 'פסקי תשובות', color: '#a0ffd0' },
  kitzur: { name: 'Kitzur Shulchan Aruch', he: 'קיצור שו״ע', color: '#ffe0a0' },
  siach: { name: 'Siach Halacha', he: 'שיח הלכה', color: '#a0d0ff' },
  magen: { name: 'Magen Avraham', he: 'מגן אברהם', color: '#d0a070' },
  shevet: { name: 'Shevet HaLevi', he: 'שבט הלוי', color: '#70d090' },
  rmf: { name: 'Rav Moshe Feinstein', he: 'רב משה', color: '#f0f070' },
};

export const WHO_SAID = [
  { who: 'mahari', t: 'Made two brachot like Rabbeinu Tam and added Baruch Shem, to save himself from a possible bracha levatala. He wasn’t convinced by the Zohar passages the mekubalim showed him.' },
  { who: 'beityosef', t: '“I don’t see it: a person shouldn’t walk into a possible bracha levatala and then rely on saying Baruch Shem.”' },
  { who: 'steipler', t: 'Never made a bracha on the shel rosh, out of worry it was levatala, and told his grandson to make one bracha.' },
  { who: 'chafetz', t: 'Ruled that Ashkenazim follow Rabbeinu Tam, yet his grandson reports he made only one bracha himself.' },
  { who: 'rsza', t: 'Made one bracha like the Gra and the Perushim in Eretz Yisrael. Proof: terumot and maasrot are separate mitzvot and still share one bracha.' },
  { who: 'rae', t: 'The life hack: before lehaniach, intend that if the halacha is like Rashi it won’t cover the shel rosh, so al mitzvat works for everyone.' },
  { who: 'prim', t: 'Explained that tenai, then signed off: “ואין לנהוג כן”, don’t actually do it.' },
  { who: 'maor', t: 'The aveira of talking: the Torah wants the shel rosh right after the shel yad, “so it’s one act for both.”' },
  { who: 'ran', t: 'The aveira of talking: you may not cause yourself to say extra brachot when one would have covered it.' },
  { who: 'mb', t: '“Be very careful to say Baruch Shem only after the shel rosh is tightened properly. People stumble on this.”' },
  { who: 'birkat', t: 'Even “shh” to quiet a friend, or “nu”, counts as a word between the shel yad and the shel rosh.' },
  { who: 'rchaim', t: 'Wasn’t particular about saying “nu, nu” between netilat yadayim and Hamotzi, and didn’t hold back from humming a niggun.' },
  { who: 'elyashiv', t: 'Was particular not to say “nu, nu” between netilat yadayim and Hamotzi.' },
  { who: 'beityehudi', t: 'After the bracha of Hamotzi, be careful not to hum any niggun, even without words, before you eat.' },
  { who: 'piskei', t: 'Kiss the shel rosh as you take it out, and look at its two shins, which hint at 613.' },
  { who: 'kitzur', t: 'Since there’s some doubt about al mitzvat, it’s better to say that bracha quietly so no one has to wonder about amen.' },
  { who: 'siach', t: 'Shel rosh tightened, Baruch Shem not yet said, the tzibbur answers yehei shemei rabba: answer with them.' },
  { who: 'magen', t: 'Spoke in between? Shift the shel yad from its place and tighten the knot, so the new lehaniach covers both again.' },
  { who: 'shevet', t: 'Rabbi Akiva Eiger only raised “al mitzvat first” as a doubt. For us, bless on the shel yad first, even after talking.' },
  { who: 'rmf', t: 'On video: a loop or two on the arm, straight to the shel rosh, then back to finish the wraps, to keep the two as close as possible.' },
];

// ── Trial 4: put the steps in order ──
export const RITUALS = [
  {
    title: 'An Ashkenazi morning, by the book',
    sub: 'Rema 25:5 and Mishnah Berurah 25:21',
    steps: [
      'Shel yad on the arm, bracha “lehaniach tefillin”',
      'A few wraps; get to the shel rosh fast',
      'Hold up the shel rosh, bracha “al mitzvat tefillin”',
      'Place the shel rosh and tighten it properly',
      '“Baruch shem kevod malchuto le’olam va’ed”',
      'Finish the wraps on the hand and fingers',
    ],
    why: 'Baruch Shem comes only once the shel rosh is tight in its place (Mishnah Berurah 25:21); before that it’s a hefsek. Rav Moshe did only a loop or two before going straight to the shel rosh.',
  },
  {
    title: 'An Ashkenazi who spoke in between',
    sub: 'Rema 25:9, Mishnah Berurah 25:32, Shevet HaLevi',
    steps: [
      'Shift the shel yad from its place and re-tighten the knot',
      'Bracha “lehaniach tefillin” again',
      'Bracha “al mitzvat tefillin” on the shel rosh',
      'Place the shel rosh and tighten it properly',
      '“Baruch shem kevod malchuto le’olam va’ed”',
    ],
    why: 'Talking means two brachot again (Rema). To keep the new lehaniach from being levatala according to Rashi, the Magen Avraham has you shift the shel yad so it’s like putting both on fresh. Rabbi Akiva Eiger wondered about saying al mitzvat first, but the Shevet HaLevi says the conclusion is the shel yad first.',
  },
  {
    title: 'Rabbeinu Tam tefillin, and Kaddish starts',
    sub: 'Biur Halacha 25:10',
    steps: [
      'Shel yad on, no bracha (it’s Rabbeinu Tam’s pair)',
      'Kaddish! Answer “Amen, yehei shemei rabba”',
      'Shift the shel yad from its place',
      'Put on the shel rosh',
    ],
    why: 'With no bracha in play, the Ran’s worry is gone, so you may answer. But the Baal HaMaor still wants “one act for both”, so move the shel yad before putting on the shel rosh.',
  },
  {
    title: 'Rabbi Akiva Eiger’s hack',
    sub: 'Biur Halacha 25:5 “vetov”, #52',
    steps: [
      'Before the bracha, think: “If the halacha is like Rashi, this lehaniach doesn’t cover the shel rosh”',
      'Bracha “lehaniach tefillin” on the shel yad',
      'Bracha “al mitzvat tefillin” on the shel rosh, now fine by both Rashi and Rabbeinu Tam',
      'Then hear the Pri Megadim: “ואין לנהוג כן”',
    ],
    why: 'By Rashi it’s as if you had spoken, so al mitzvat is a proper bracha. By Rabbeinu Tam, lehaniach covers both and al mitzvat is the usual second bracha. The Olat Tamid said it first. The Pri Megadim says not to do it; the Biur Halacha guesses why: so people don’t get used to second-guessing a minhag Yisrael built on many Rishonim.',
  },
];

// ── Trial 5: the gauntlet. Encounters with the people who walk up to you mid-tefillin ──
// kind maps an NPC (or event) to a dilemma. ok marks the right answer.
export const ENCOUNTERS = {
  friend: {
    name: 'Shmerel', line: '“Nu?! Did you see the game last night?!”',
    options: [
      { t: 'Smile, stay silent, talk to him once the shel rosh is on', ok: true },
      { t: 'Just one word: “later!”', why: 'Biur Halacha 25:9: even one word is a hefsek.' },
      { t: 'Wink and point at your arm', why: 'Mishnah Berurah 25:29: even signaling with your eyes or fingers should be avoided lechatchila. Stay with the mitzvah.' },
    ],
    why: 'No talking between the shel yad and the shel rosh. Even one word counts.',
  },
  rabbi: {
    name: 'The Rav', line: 'Your Rav walks in: “Boker tov!”',
    options: [
      { t: 'Stay silent; greet him after the shel rosh', ok: true },
      { t: '“Boker tov, Rebbe!”, since it’s kavod for your rebbe', why: 'Mishnah Berurah 25:28: forbidden even for speech that’s a mitzvah, like returning your rebbe’s greeting.' },
      { t: 'Say it in Hebrew; lashon hakodesh is different', why: 'Mishnah Berurah 25:29: no speaking, even in lashon hakodesh.' },
    ],
    why: 'Even a mitzvah greeting to your rebbe is a hefsek (Mishnah Berurah 25:28).',
  },
  kid: {
    name: 'Your kid', line: '“ABBA! ABBA! Look what I found!”',
    options: [
      { t: 'Keep quiet; then give him a full Hineni once the shel rosh is on', ok: true },
      { t: '“Shh!”', why: 'Birkat HaBayit (#47): “shh” counts as a word too.' },
      { t: '“Nu, nu!”', why: 'Birkat HaBayit (#47): “nu” is a word. A word is a word.' },
    ],
    why: 'Even “shh” and “nu” count as words (#47). And when he calls, the Akeidah’s second Hineni is him: be fully there for him in a minute.',
  },
  kaddish: {
    name: 'The Chazan', line: '“Yitgadal ve’yitkadash shemei rabba...”',
    options: [
      { t: 'Stop, stay silent, listen and have kavana', ok: true },
      { t: '“Amen, yehei shemei rabba!”', why: 'Shulchan Aruch 25:10; Mishnah Berurah 25:36: answering means blessing again.' },
      { t: 'Hum along with the chazan’s tune', why: 'A niggun here is like humming after Hamotzi (#49): the bracha is waiting.' },
    ],
    why: 'Shulchan Aruch 25:10: “שותק ושומע ומכוין למה שאומרים.”',
  },
  gabbai: {
    name: 'The Gabbai', line: 'He’s holding a tefillin bag: “Is this yours?”',
    options: [
      { t: '“Yes, my shel rosh is in there!” Talking about the tefillin themselves', ok: true },
      { t: 'Ignore him and leave without your shel rosh', why: 'Then you never get your shel rosh. Talking for the tefillin’s own needs doesn’t need a new bracha.' },
      { t: 'Ask him how his kids are doing', why: 'That isn’t for the tefillin: it’s a hefsek.' },
    ],
    why: 'Shulchan Aruch 25:10: “אם שח לצורך תפילין אינו חוזר ומברך.”',
  },
  sleeve: {
    name: 'Your sleeve', line: 'Your sleeve is still rolled up over the shel yad.',
    options: [
      { t: 'Roll it down now; covering the shel yad is part of the mitzvah', ok: true },
      { t: 'Leave it. Rolling it down is a hefsek', why: 'Daat Noteh (#50): allowed. It’s “osek b’nitzrach”, part of doing the mitzvah.' },
    ],
    why: 'Daat Noteh (#50): “מותר, דלא הוי הפסק כיון דעוסק בנצרך.” The Mishnah Berurah says it’s better to cover the shel yad: “lecha le’ot”, a sign for you.',
  },
  kiss: {
    name: 'The shel rosh', line: 'You pull the shel rosh out of the bag.',
    options: [
      { t: 'Kiss it and look at the two shins, then put it on', ok: true },
      { t: 'No kissing! Every motion is a hefsek', why: 'Piskei Teshuvot (#51): kissing it is the custom. Rav Moshe kissed his on video.' },
    ],
    why: 'Piskei Teshuvot (#51): the custom is to kiss it, and the Zohar says to look at the two shins (hinting at 613).',
  },
  phone: {
    name: 'Your phone', line: 'BZZZT. 14 new messages in the family group.',
    options: [
      { t: 'Leave it. Do Not Disturb for the first hour', ok: true },
      { t: 'Just glance at it, silently', why: 'Not talking, but a long unneeded pause and your mind off the mitzvah. Mishnah Berurah 25:29: don’t even pause silently for long. And Hineni.' },
    ],
    why: 'The Rambam: with tefillin on, you aren’t drawn to idle things. Hineni means locked in.',
  },
  baruchshem: {
    name: 'The finish line', line: 'Bracha said, shel rosh on your head, not yet tightened.',
    options: [
      { t: 'Tighten it properly, then “Baruch shem kevod malchuto le’olam va’ed”', ok: true },
      { t: 'Say Baruch Shem while you tighten, to save time', why: 'Mishnah Berurah 25:21: that’s a hefsek, and the bracha is levatala for sure.' },
    ],
    why: 'Mishnah Berurah 25:21: “והעולם נכשלין בזה.”',
  },
};

// After a hefsek in the gauntlet: what now?
export const RECOVERY = {
  ashkenaz: {
    q: 'You spoke. You’re Ashkenazi. Before the shel rosh:',
    options: [
      { t: 'Shift the shel yad and re-tighten; lehaniach; then al mitzvat on the shel rosh', ok: true },
      { t: 'Just al mitzvat, as on any other day' },
      { t: 'Take everything off and go home' },
    ],
    why: 'Rema 25:9: we make lehaniach and al mitzvat on the shel rosh. Mishnah Berurah 25:32 (Magen Avraham): shift the shel yad so the new lehaniach covers it too.',
  },
  sefard: {
    q: 'You spoke. You’re Sefardi. Before the shel rosh:',
    options: [
      { t: 'Bracha “al mitzvat tefillin” on the shel rosh', ok: true },
      { t: 'Lehaniach again, then al mitzvat' },
      { t: 'No bracha; carry on' },
    ],
    why: 'Shulchan Aruch 25:9: “ואם הפסיק, מברך על של ראש על מצות תפילין.”',
  },
};

export const RANKS = [
  [0, 'Bachur in the back row'],
  [150, 'Shacharit regular'],
  [400, 'Chavruta material'],
  [800, 'Siman 25 master'],
  [1300, 'Locked in. Hineni.'],
];
