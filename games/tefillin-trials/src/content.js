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

// ── Shiur 4 · Yad Keha: the tefillin stand (SCP chabura #4, siman 25-27, sheet #52-75) ──

// The four zones of the upper arm from the sheet's picture (#62), shoulder (-3) to elbow (+3).
// rank: 3 = everyone agrees, 2 = kosher by the Gra only, 0 = not the mitzvah.
export const ARM_ZONES = [
  { id: '1', from: -3, to: -1.75, rank: 0, color: '#ff4a4a', say: 'Out of bounds, up by the shoulder: that’s before the muscle starts. Not “yadcha”, the gova shebayad (Menachot 37a, #59). Not the mitzvah.' },
  { id: '2', from: -1.75, to: 0.15, rank: 2, color: '#a6e35a', say: 'The upper half of the muscle. Rabbeinu Tam (Tosafot, #59) and the Gra (#61): anywhere the muscle rises is kosher. But the Smak (Beit Yosef, #60), the Shulchan Aruch and the Rema want the half nearer the elbow, and the Yechave Daat (#64) says follow them. Aim lower. (If a pair is too big to fit there, the Mishnah Berurah says better a bit higher, kosher by the Gra, than down by the elbow. Better still: buy smaller tefillin.)' },
  { id: '3', from: 0.15, to: 2.15, rank: 3, color: '#3cc45a', say: 'The lower half of the muscle, toward the elbow: kosher by everyone (#62, dark green).' },
  { id: '4', from: 2.15, to: 3, rank: 0, color: '#ff4a4a', say: 'Out of bounds, down by the elbow, where the muscle doesn’t rise. Tefila LeMoshe (#63): you should fit about two of your own fingers between the bayit and the elbow. Not the mitzvah.' },
];

const PERSON = (robe, kippah, extra = {}) => ({ robe, kippah, skin: '#e8c39e', ...extra });

// The morning queue: customers (you choose the arm, place it, time the bracha) and shailos.
export const STAND_QUEUE = [
  {
    kind: 'customer', name: 'Moshe the commuter', look: PERSON('#2b3a55', '#111', { beard: '#3a2a1a' }), tutorial: true, speed: 1.8, knot: 3.2,
    line: 'I’m right-handed, running for the 8:15 bus. Quick!',
    arm: {
      side: 'left',
      options: [
        { t: 'Left arm: his weaker hand, “yad keha”', ok: true },
        { t: 'Right arm: his strong hand', why: '“Yadcha” is written “yadkha”, yad keha, the weak hand (Menachot 37a, #58).' },
        { t: 'Whichever is closer to the table', why: 'The Torah picked the arm: “yadcha”, the weak hand (#58).' },
      ],
      why: 'Menachot 37a (#58): “yadcha” is spelled with a hei, “yad keha”, the weaker hand. Also “ukshartem ... uchtavtam”: you tie with the hand you write with, so it goes on the other one.',
    },
    rosh: {
      line: 'Wait, why is the bracha “lehaniach” and not “likshor”? The pasuk says “ukshartem”!',
      options: [
        { t: 'The mitzvah is for them to rest on you all day, not just a moment of tying', ok: true },
        { t: 'Because Chazal didn’t like the word likshor' },
        { t: 'Because the knots are already tied at the factory' },
      ],
      why: 'Kaf HaChaim 25:46 (#55): “likshor” would sound like one tie on the arm and head and you’re done. “Lehaniach” says they should stay on you. The Mishnah Berurah: with a kamatz, leha-niach, “to set and leave”, not lehaniach with a patach.',
      lesson: 'Lehaniach, not likshor: the mitzvah is that the tefillin rest on you, every moment they’re on (Kaf HaChaim, #55).',
    },
    thanks: 'Shema Yisrael… and I’ll make the bus!',
  },
  {
    kind: 'customer', name: 'Lefty Levi', look: PERSON('#5a2e2e', '#e0b54a'), speed: 2.3,
    line: 'I do everything with my left hand. Writing, eating, throwing.',
    arm: {
      side: 'right',
      options: [
        { t: 'Right arm: for him that’s the weak hand', ok: true },
        { t: 'Left arm, like everyone else', why: 'Menachot 37a (#68): an itter puts them on his right, which is his “left”.' },
        { t: 'Both arms, to be safe', why: 'Not for a full lefty: his right is his yad keha (#68).' },
      ],
      why: 'Menachot 37a (#68): “manich tefillin bimino shehu smolo”. A lefty’s right hand is his weaker hand.',
    },
    thanks: 'My right arm finally gets something to do!',
  },
  {
    kind: 'customer', name: 'Avi the ambidextrous', look: PERSON('#2e5d4b', '#fff', { beard: '#5a3a22' }), speed: 2.6,
    line: 'I’m equally good with both hands. Goalie and pitcher.',
    arm: {
      side: 'left',
      options: [
        { t: 'Left arm, like everyone', ok: true },
        { t: 'Right arm', why: 'Menachot 37a (#68): “shoalet bishtei yadav”, someone who rules both hands, puts it on his left like everyone.' },
        { t: 'He’s exempt: he has no weak hand', why: 'No. Abaye (#68): he puts it on the left.' },
      ],
      why: 'Menachot 37a (#68): “bishoalet bishtei yadav”, both hands equal, puts it on his left, since for him the right is like everyone’s right.',
    },
    thanks: 'Left it is. Both hands are happy.',
  },
  {
    kind: 'shaila', title: 'A quick shaila from your kid', who: 'Your kid',
    line: '“Abba, look at that man! His shel yad is on the muscle, but it’s sticking straight out sideways. Is he yotzei?”',
    options: [
      { t: 'Yes, he’s yotzei. Tilting it toward the heart is how it should be done, but it isn’t me’akev', ok: true },
      { t: 'No: if it doesn’t face the heart he isn’t yotzei' },
      { t: 'Tell him loudly in front of everyone that he isn’t yotzei' },
    ],
    why: 'Shulchan Aruch 27:1 tilts it toward the heart. The Daat Noteh (#66) was asked if that’s me’akev: “לא שמענו שמעכב”. And if you do correct someone, come with the fix, gently, not just the problem.',
    lesson: 'Tilt the shel yad toward the heart; if it sticks out, he’s still yotzei (Daat Noteh, #66).',
  },
  {
    kind: 'customer', name: 'Yoni the artist', look: PERSON('#3a2e5a', '#2c5aa0'), speed: 2.8,
    line: 'I write with my left hand, but I do everything else with my right.',
    arm: {
      side: 'right',
      options: [
        { t: 'Right arm with a bracha (the writing hand decides), then after davening the left without a bracha', ok: true },
        { t: 'Left arm only: his work hand is his right', why: 'The Shulchan Aruch and the Rema go by the writing hand (#69, #71).' },
        { t: 'Right arm only, and that’s it', why: 'Halacha Berura (#71): many poskim go by the work hand, so after davening put them on the left too, without a bracha.' },
      ],
      why: 'Beit Yosef (#69): “ukshartem ... uchtavtam”, the tying hand is the writing hand. So his left is his “right”, and the tefillin go on his right arm (Shulchan Aruch and Rema). Halacha Berura (#71): many say the work hand decides, so after davening put them on the other arm without a bracha. (The Aruch HaShulchan, #70, follows yad keha: the weak hand.)',
      after: 'After davening, he’ll put them on his left arm too, without a bracha (Halacha Berura, #71).',
    },
    thanks: 'Two arms, one bracha. I can live with that.',
  },
  {
    kind: 'shaila', title: 'The bar mitzvah boy', who: 'Bar mitzvah boy',
    line: '“Help! In the middle of davening my shel yad slipped down my arm, and my shel rosh is still on. Do I take off the shel rosh first?”',
    options: [
      { t: 'No. Leave the shel rosh on and quickly put the shel yad back in its place', ok: true },
      { t: 'Yes: “vehayu letotafot” means the shel rosh can never be on without the shel yad' },
      { t: 'Take everything off and start again with new brachot' },
    ],
    why: 'Menachot 36a (#54): put on the shel yad first, take off the shel rosh first, because “as long as they’re between your eyes, there should be two.” But the Mishnah Berurah (siman 25, as the shiur read it): if the shel yad moved from its place, or you put the shel rosh on first by mistake, you don’t take off the shel rosh. Just put on the shel yad right away. (If you only picked up the shel rosh first, put it down and take the shel yad: not like a tallit.)',
    lesson: 'Shel yad slipped mid-davening? Don’t take off the shel rosh; put the shel yad right back (Mishnah Berurah 25).',
  },
  {
    kind: 'customer', name: 'Sgt. Eitan', look: PERSON('#4a5a32', '#111', { beard: '#2a1c12' }),
    line: 'I’m right-handed. I lost my whole left arm in Gaza.',
    arm: {
      side: 'none',
      options: [
        { t: 'He’s exempt from the shel yad, but he still puts on the shel rosh', ok: true },
        { t: 'Put the shel yad on his right arm instead', why: 'His right is his strong hand. The Torah said yad keha, and he has none (Aruch HaShulchan 27:6-7, #72).' },
        { t: 'He’s exempt from tefillin altogether', why: 'The shel yad and shel rosh are two mitzvot; one doesn’t hold back the other. He puts on the shel rosh.' },
      ],
      why: 'Menachot 37a: “ein lo zroa, patur.” The Aruch HaShulchan (#72) explains: “le’ot al yadcha” needs a yad keha, and he has none. The shel rosh is a separate mitzvah, so he still puts that on. (The IDF rabbinate even built a stand that holds the bayit so amputees can wrap it with their stump.)',
      after: 'No shel yad for him: but the shel rosh is its own mitzvah.',
    },
    thanks: 'Hineni. Thank you, brother.',
  },
  {
    kind: 'customer', name: 'Sgt. Dovid', look: PERSON('#4a5a32', '#c0392b'), speed: 3.0, knot: 2.2,
    line: 'I was right-handed. I lost my right hand, and now I do everything with my left.',
    arm: {
      side: 'right',
      options: [
        { t: 'On his right arm: his left is now his main hand, so the right is his yad keha', ok: true },
        { t: 'Left arm, as he always did', why: 'Halichot Shlomo (#74): once his main work is done with the left, it counts as his right.' },
        { t: 'He’s exempt', why: 'He still has an arm with the muscle (the kiborret); only the hand is gone (#74, #75).' },
      ],
      why: 'Halichot Shlomo (#74), Rav Shlomo Zalman: if only the hand was cut off, he still has two arms, and since he now works with his left, that counts as his right, so the tefillin go on the right arm. (If the whole right arm is gone, only the weak left is left.) Halacha Berura (#75): like an itter; and if he can, put them on the left again without a bracha. Shevet HaLevi (#73): a hand that became weak is the yad keha.',
      after: 'If he can, he’ll put them on his left arm after davening too, without a bracha (Halacha Berura, #75).',
    },
    thanks: 'Like an itter now. Am Yisrael chai.',
  },
  {
    kind: 'shaila', title: 'Two pairs at once?', who: 'Reb Shimon',
    line: '“My tefillin are tiny. Can I wear Rashi and Rabbeinu Tam together, both at the same time?”',
    options: [
      { t: 'Yes, if they’re small enough that both sit in the right place: no more than 8 cm together', ok: true },
      { t: 'Never: it’s bal tosif' },
      { t: 'Yes, put one pair on the muscle and the other on the forearm' },
    ],
    why: 'Halichot Olam (#65): you can daven with both pairs at once, so you read Shema and daven with kosher tefillin whether the halacha follows Rashi or Rabbeinu Tam. But they have to be very small, so both are in the place the halacha requires: together no more than 8 cm.',
    lesson: 'Rashi and Rabbeinu Tam together: only if both fit the right place, under 8 cm (Halichot Olam, #65).',
  },
  {
    kind: 'shaila', title: 'Before misheyakir', who: 'The early commuter',
    line: '“I put my tefillin on at 5:30, before misheyakir. Now it’s the zman and I’m making both brachot. May I talk between lehaniach and al mitzvat?”',
    options: [
      { t: 'Yes: both are already on, so lehaniach already covered them; talking can’t cause a new bracha', ok: true },
      { t: 'No: never talk between the two brachot' },
      { t: 'He shouldn’t make any bracha now, since they’re already on' },
    ],
    why: 'Every moment the tefillin are on is the mitzvah, so if you put them on early (or forgot the bracha) you bless once they’re on. Tehila LeDavid (#57): in that case you may pause between the brachot, since lehaniach already went on both and a pause won’t cause another bracha.',
    lesson: 'Forgot the bracha, or put them on before the zman? Bless while they’re on: every second is a mitzvah (#57).',
  },
  {
    kind: 'shaila', title: 'Closing up: your kid’s shoes', who: 'Your kid',
    line: '“Abba, I’m a lefty like Levi. Which shoe do I put on first, and which do I tie first?”',
    options: [
      { t: 'Put on the right shoe first, then the left; then tie the right first, because your tefillin go on your right arm', ok: true },
      { t: 'Right shoe on first, then tie the left first, like everyone' },
      { t: 'It doesn’t matter which shoe' },
    ],
    why: 'Shulchan Aruch siman 2 (as the shiur ended): everyone puts on the right shoe first, but ties the left first, because that’s the arm the tefillin are tied on. The Mishnah Berurah: a lefty, whose tefillin go on his right arm, ties the right shoe first.',
    lesson: 'Shoes: right on first; tie first on the tefillin arm. A lefty ties the right first (Mishnah Berurah, siman 2).',
  },
];

export const STAND_LESSONS = [
  'Like basketball: if any part of the bayit touches the line, it’s out. The whole bayit must sit on the lower half of the muscle (Yechave Daat, #64).',
  'Shel yad first, then shel rosh: “vehayu letotafot”, whenever they’re between your eyes there are two (Menachot 36a, #54).',
  'The bracha comes after placing it on the arm and before tightening: “over la’asiyatan” (Menachot 36a, #56).',
  'The kiborret: the lower half of the muscle by all opinions (#60-#64).',
];

// ── Bracha Catch: the tokens and the rounds (shita by shita) ──
export const TOKENS = {
  L: { he: 'לְהָנִיחַ', en: 'lehaniach', color: '#ffd84a' },
  M: { he: 'עַל מִצְוַת', en: 'al mitzvat', color: '#5fb3ff' },
  B: { he: 'בָּרוּךְ שֵׁם', en: 'Baruch Shem', color: '#ffffff' },
};

// What each shita needs, in order. bonus: Baruch Shem may be caught at the end.
export const ROUNDS = [
  { title: 'Rashi · you didn’t talk', need: ['L'], note: 'One lehaniach covers both tefillin. That’s how Sefardim (Shulchan Aruch 25:5) put them on.' },
  { title: 'Rabbeinu Tam · you didn’t talk', need: ['L', 'M'], bonus: true, note: 'Lehaniach on the shel yad, al mitzvat on the shel rosh, every day. Ashkenazim follow this (Rema) and add Baruch Shem.' },
  { title: 'Rashi · you talked in between', need: ['L', 'M'], note: 'Talking cuts the shel rosh off from the first bracha, so it gets al mitzvat (Shulchan Aruch 25:9).' },
  { title: 'Rabbeinu Tam · you talked in between', need: ['L', 'L', 'M'], bonus: true, note: 'Lehaniach on the shel yad; you talked; now the shel rosh needs lehaniach again plus al mitzvat (Rema 25:9).' },
  { title: 'Rabbeinu Tam’s tefillin: no bracha at all', need: [], dodge: 12, note: 'No bracha on Rabbeinu Tam’s pair. Catch nothing; the brachot are chasing you!' },
  { title: 'Rabbi Akiva Eiger’s tenai', need: ['L', 'M'], bonus: true, note: 'Intend that lehaniach won’t cover the shel rosh if Rashi is right. Then al mitzvat works by both. (The Pri Megadim: don’t actually do this.)' },
];

// ── Shiur 5 · The Ward: amputees and the yud (SCP chabura #5, siman 27, sheet #71-91, and the shiur) ──
// Every patient is right-handed unless he says otherwise. body: the state of each arm, read from
// the shoulder down: 'whole' | 'gone' (nothing left) | 'bicep' (only the upper arm) | 'stump'
// (upper arm and part of the forearm) | 'weak' (there, but he can't use it well) | 'numb' (paralyzed,
// no feeling at all). accept: the [arm, bracha] answers that are right, arm 'left' | 'right' | 'none'.
// rosh: an optional follow-up; 'ROSH' is filled in from your minhag (which brachot on a lone shel rosh).
export const ARM_STATES = {
  whole: { label: 'whole arm', color: '#e8c39e' },
  gone: { label: 'whole arm gone', color: null },
  bicep: { label: 'only the upper arm', color: '#e8c39e' },
  stump: { label: 'upper arm + part of the forearm', color: '#e8c39e' },
  weak: { label: 'weak, healing', color: '#d9b08a' },
  numb: { label: 'paralyzed, no feeling', color: '#9fb2c8' },
};

export const WARD_QUEUE = [
  {
    kind: 'patient', name: 'Sgt. Amit', look: PERSON('#4a5a32', '#111', { beard: '#2a1c12' }), body: { L: 'gone', R: 'whole' },
    line: 'I’m a righty. My whole left arm is gone, from the shoulder. Where does my shel yad go?',
    accept: [['none', null], ['right', false]],
    why: 'Mishnah Berurah 27:6: he has no yad keha left, so he’s patur from the shel yad: like being stuck in the desert on Pesach with no matzah, “ones Rachmana patrei”. We don’t move it to his right arm, just as we wouldn’t wrap it on his chest or his leg. Some are machmir (the Magen Avraham, from the Sifrei) and put it on the right; the Shaar HaTziyun (27:7): then only without a bracha.',
    rosh: 'ROSH',
    thanks: 'Hineni. The shel rosh is its own mitzvah, and I can still do that one.',
  },
  {
    kind: 'patient', name: 'Sgt. Noam', look: PERSON('#4a5a32', '#c0392b'), body: { L: 'bicep', R: 'whole' },
    line: 'From the elbow down my left arm is gone. The muscle is still there.',
    accept: [['left', false]],
    why: 'Menachot 37a: the Tanna Kamma says a gidem is patur; Acherim say he’s chayav, from the extra hei in “yadcha”. Tosafot: no argument, the Tanna Kamma means the whole arm is gone, Acherim mean the muscle is left, so put it on with a bracha. The Or Zarua: they argue exactly here, and the halacha is like the Tanna Kamma: patur. The Rema (27:1): “gidem ... yaniach bli bracha.” The Bach, the Gra and the Eliyah Rabbah say with a bracha, so the Biur Halacha’s way out: no bracha on the shel yad, and have it in mind with the brachot on the shel rosh.',
    rosh: {
      line: 'So no bracha on my arm. When I make the brachot on my shel rosh, what do I have in mind?',
      options: [
        { t: 'That they cover the shel yad too', ok: true },
        { t: 'Only the shel rosh: the shel yad got no bracha, and that’s that' },
        { t: 'Nothing special: say an extra lehaniach on the arm afterward' },
      ],
      why: 'Biur Halacha 27:1: with the brachot on the shel rosh (two for Ashkenazim, one for Sefardim), have in mind that they go on the shel yad as well. That satisfies Tosafot and the Gra without risking a bracha levatala.',
      lesson: 'Only the upper arm left? Shel yad without a bracha; have it in mind with the shel rosh’s brachot (Rema 27:1, Biur Halacha).',
    },
    thanks: 'Acherim and Tosafot, both covered. Am Yisrael chai.',
  },
  {
    kind: 'shaila', title: 'Back to basics: the yud', who: 'Your chavruta',
    line: '“Everyone says the knot of the shel yad is a yud. So where is the yud’s leg, and where is its head?”',
    options: [
      { t: 'The strap’s end coming out of the knot is the leg, pointing toward the heart; the body of the knot is the head', ok: true },
      { t: 'The yud is printed on the bayit, under the shin' },
      { t: 'The leg is the long strap going down to your hand' },
    ],
    why: 'Minchat Yitzchak (#83): on the knot, the end of the strap is the leg of the yud and the body of the knot is its head. It floats right next to the bayit, the leg aimed at the heart. You look at it every morning: now you know what you’re looking at.',
    lesson: 'The yud: the knot is its head, the strap’s end is its leg, aimed at the heart (Minchat Yitzchak, #83).',
  },
  {
    kind: 'patient', name: 'Sgt. Yair', look: PERSON('#4a5a32', '#2c5aa0', { beard: '#5a3a22' }), body: { L: 'stump', R: 'whole' },
    line: 'I lost my left hand and half the forearm. Everything above that is fine.',
    accept: [['left', true]],
    why: 'Mishnah Berurah 27: the upper arm with part of the forearm still looks like a hand: it’s called “yadcha”. His weak left arm is still there, so he keeps putting it on the left, with a bracha.',
    thanks: 'Same arm as always. Baruch Hashem for what’s left.',
  },
  {
    kind: 'patient', name: 'Sgt. Itai', look: PERSON('#4a5a32', '#e0b54a'), body: { L: 'whole', R: 'gone' },
    line: 'I was a righty. My right arm is gone, all of it. Do I switch?',
    accept: [['left', true]],
    why: 'Mishnah Berurah: he’s left with his weak arm, so it goes on the left with a bracha. Why not call him a lefty now? Rav Shlomo Zalman: “lefty” and “righty” only mean something when there are two arms to compare. With the whole right arm gone there’s nothing to compare to: the left is still his yad keha. He can’t tie it himself, so you tie it for him: the mitzvah is that it’s tied on him, not that he ties it.',
    thanks: 'You tie, I wear. That’s how a mitzvah works here.',
  },
  {
    kind: 'shaila', title: 'The string around the knot', who: 'Your chavruta',
    line: '“My friend’s shel yad has a thread wrapped around the knot, tying it to the bayit. What’s that for? Should I get one?”',
    options: [
      { t: 'It keeps the yud touching the bayit so it never slides away. It’s the accepted custom: worth getting', ok: true },
      { t: 'It’s a segulah against the evil eye; skip it' },
      { t: 'It’s pasul: nothing may be tied to the bayit' },
    ],
    why: 'Shulchan Aruch 27:2, from the Zohar: the yud must stay right by the bayit. Kaf HaChaim 27:12 (#86): “al kein nahagu ha’olam”, the world ties the yud to the bayit with a gid thread through the titura so it never moves, even in the bag. Orchot Rabbeinu (#87): the Chazon Ish’s tefillin had a cut piece of strap in the ma’abarta to hold the yud in place.',
    lesson: 'The thread on the knot ties the yud to the bayit so it never moves away (Kaf HaChaim 27:12, #86).',
  },
  {
    kind: 'patient', name: 'Sgt. Ori', look: PERSON('#4a5a32', '#111'), body: { L: 'whole', R: 'stump' },
    line: 'My right hand and half my forearm are gone. I write with my left now, and I’m getting good at it.',
    accept: [['right', true]],
    why: 'The Dagul Mervavah: a righty whose right hand stopped working became a lefty “min hashamayim”. The Mishnah Berurah goes further: kal vachomer if part of the right arm was cut off, he’s a lefty, so his right arm is now his yad keha. He still has part of the forearm, so it’s “yadcha”: with a bracha.',
    rosh: {
      line: 'Rav Shlomo Zalman doesn’t like that jump. So after davening, what do I do?',
      options: [
        { t: 'Move the shel yad to my left arm without a bracha. Never both arms at the same time', ok: true },
        { t: 'Wear a second shel yad on my left arm at the same time, to cover everyone' },
        { t: 'Nothing: the Mishnah Berurah is enough' },
      ],
      why: 'Halichot Shlomo (#77) and Halacha Berura (#76): a stump doesn’t make him a real lefty, so he should put it on both arms, one after the other: never both at once, which looks like adding to the mitzvah. Which goes first? While he still leans on the stump (or a prosthetic), left first with the bracha; once his left hand is really the strong one, right first with the bracha, then the left without one.',
      lesson: 'Lost part of the right arm? Both arms, one after the other, never together; the bracha goes on the arm that’s now yad keha (Halichot Shlomo, #77).',
    },
    thanks: 'Right with a bracha, then left. Got it.',
  },
  {
    kind: 'shaila', title: 'At the Kotel', who: 'The Sefardi man next to you',
    line: 'He wraps the strap around all four sides of his bayit before going down the arm. “Is that how we do it?”',
    options: [
      { t: 'Both are Sefardi practice: Or LeTzion prefers wrapping the bayit; Rav Ovadia doesn’t, to protect its squareness', ok: true },
      { t: 'No: wrapping the bayit is pasul' },
      { t: 'Yes, and every Sefardi must do it' },
    ],
    why: 'Or LeTzion (#88): better to wrap around the bayit, tighten, then go down to the arm. Yabia Omer (#89): our practice is not to wrap the bayit, so its squareness doesn’t wear off from rubbing every day; we rely on the rabbanim and mekubalim who said it’s enough to have it in mind.',
    lesson: 'Wrapping the strap around the bayit: Or LeTzion yes, Yabia Omer no, to guard the bayit’s squareness (#88, #89).',
  },
  {
    kind: 'patient', name: 'Ezra', look: PERSON('#3a2e5a', '#fff', { beard: '#3a2a1a' }), body: { L: 'whole', R: 'weak' },
    line: 'A car accident. My right arm barely works, so I’m learning to write with my left. The doctors say it will heal.',
    accept: [['left', true]],
    why: 'Halichot Shlomo (#78): if the doctors expect the right hand to recover, he keeps putting on the left. Only once they say it won’t heal is it a yad keha, and then the tefillin go on the right (Shevet HaLevi, #74: like a lefty, and he needn’t retrain himself; Halacha Berura 27:24, #76: and if he can, put them on the left again afterward without a bracha).',
    thanks: 'Left for now. Bli neder I’ll ask again when the doctors decide.',
  },
  {
    kind: 'shaila', title: 'A lefty’s plan', who: 'A young volunteer',
    line: '“I’m a lefty. I want to train myself to be right-handed so my tefillin go on the left like everyone. Good idea?”',
    options: [
      { t: 'No. Lechatchila don’t change your nature for that: you’ll probably end up half-and-half, a safek', ok: true },
      { t: 'Yes, it’s a mitzvah to be like everyone' },
      { t: 'Yes, and once you write with your right you’re a righty' },
    ],
    why: 'Piskei Teshuvot 27:15 (#79): lechatchila someone born a lefty shouldn’t change his nature for the sake of tefillin. Some poskim hold it doesn’t help, and you may not fully succeed and end up writing with one hand and working with the other: doubtful which is your yad keha.',
    lesson: 'A lefty shouldn’t retrain himself for tefillin (Piskei Teshuvot 27:15, #79).',
  },
  {
    kind: 'patient', name: 'Mr. Katz', look: PERSON('#2b3a55', '#111', { beard: '#d9d9d9', hat: 'fedora' }), body: { L: 'whole', R: 'numb' },
    line: 'A stroke. My right arm is paralyzed: no movement, no feeling at all. Forever, they say.',
    accept: [['left', true]],
    why: 'Halichot Shlomo (#78): an arm with no feeling at all is as if it isn’t there, like having no right arm, so the left is still his weak arm: tefillin on the left, with a bracha. (Rav Moshe argues on a dead arm: if you cut it and it bleeds, it’s alive. For a numb LEFT arm that’s the difference: Rav Moshe would keep it on the left; Rav Shlomo Zalman, as if it’s gone.)',
    thanks: 'Shema Yisrael… thank you, young man.',
  },
  {
    kind: 'shaila', title: 'The new hand', who: 'The ward nurse',
    line: '“Bed 12 got a hand transplant last month, from a donor. Is it his hand now, for tefillin?”',
    options: [
      { t: 'Yes: it lives from his body and is batel to it, like a young branch grafted onto an old tree', ok: true },
      { t: 'No: it’s the donor’s hand forever' },
      { t: 'Only if the donor was Jewish' },
    ],
    why: 'Sotah 43b: a young orlah branch grafted onto an old tree isn’t orlah: it lives from the tree and is batel to it. Rav Karp: the same for a transplanted hand: it’s his. But for the first weeks it can be numb: Rav Shlomo Zalman would treat it as not there yet, Rav Moshe as alive since blood flows through it.',
    lesson: 'A transplanted hand is his, like a graft on an old tree (Sotah 43b, Rav Karp); while numb, Rav Shlomo Zalman and Rav Moshe argue.',
  },
  {
    kind: 'patient', name: 'Sgt. Gil', look: PERSON('#4a5a32', '#fff'), body: { L: 'whole', R: 'bicep' },
    line: 'My right forearm is gone. Only the upper arm is left, and I do everything with my left now.',
    accept: [['right', false], ['left', false]],
    why: 'By the Mishnah Berurah he’s now a lefty, so the shel yad belongs on his right arm, but all that’s left there is the upper arm: that’s the Rema’s gidem, so no bracha. By Rav Shlomo Zalman he isn’t a real lefty, so it goes on his left, and since the Mishnah Berurah would call that the wrong arm, no bracha there either. Either way: no bracha on the shel yad; have it in mind with the shel rosh’s brachot.',
    thanks: 'No bracha on the arm, but the shel rosh covers it. Todah.',
  },
  {
    kind: 'shaila', title: 'Closing the ward: two ways to tie', who: 'Your chavruta',
    line: '“A Sefardi friend feeds only the loop through the ma’abarta, so it comes out on the far side of the bayit. I keep the loop right by the knot. What changes?”',
    options: [
      { t: 'His tightening pulls the yud into the bayit; mine can tug it away, so I need something holding it (like the thread)', ok: true },
      { t: 'Nothing: it’s just fashion' },
      { t: 'His way is pasul: the loop has to touch the yud' },
    ],
    why: 'Halacha Berura 27:9 (#84, #85): Sefardim and Edot HaMizrach have the doubled strap come out of the ma’abarta on the second side of the bayit, not by the yud, so tightening on the arm pulls toward the outside and draws the yud in. Ashkenazim keep the loop by the knot, so pulling tight tends to drag the yud out: that’s why the thread (#86) matters so much.',
    lesson: 'Sefardi loop on the far side: tightening pulls the yud in. Ashkenazi loop by the knot: keep the yud tied to the bayit (#84-#86).',
  },
];

// Which brachot go on a lone shel rosh, by minhag (Shulchan Aruch and Rema 26:1).
export const LONE_ROSH = {
  ashkenaz: {
    line: 'No shel yad today. Which brachot on my shel rosh? (You’re Ashkenazi.)',
    options: [
      { t: 'Both: lehaniach and al mitzvat, then Baruch Shem', ok: true },
      { t: 'None: without a shel yad there’s no mitzvah' },
      { t: 'Only lehaniach' },
    ],
    why: 'The shel yad and shel rosh are two mitzvot; one doesn’t hold back the other (Menachot 38a). Rema 26:1: on a shel rosh alone, Ashkenazim say both brachot.',
  },
  sefard: {
    line: 'No shel yad today. Which bracha on my shel rosh? (You’re Sefardi.)',
    options: [
      { t: 'One bracha: al mitzvat tefillin', ok: true },
      { t: 'None: without a shel yad there’s no mitzvah' },
      { t: 'Lehaniach and al mitzvat' },
    ],
    why: 'The shel yad and shel rosh are two mitzvot; one doesn’t hold back the other (Menachot 38a). Shulchan Aruch 26:1: a shel rosh alone gets “al mitzvat tefillin”.',
  },
};

export const WARD_LESSONS = [
  'Whole weak arm gone: patur from the shel yad. If he wants, the other arm without a bracha (Mishnah Berurah 27:6, Shaar HaTziyun).',
  'Only the upper arm left: put it on without a bracha (Rema 27:1); have it in mind with the shel rosh’s brachot (Biur Halacha).',
  'Upper arm and part of the forearm: still “yadcha”, with a bracha (Mishnah Berurah).',
  'The yud’s leg points to the heart, and the knot stays touching the bayit (Shulchan Aruch 27:2, #81-#83).',
];

// ── Shiur 6 · The Checkpoint: keeping the yud in place, and chatzitzah (SCP chabura #6, siman 27, sheet #86-111) ──
// People walk through a scanner at the shul door. It lights up whatever sits between the tefillin and
// the body (flag.spot: arm | head | bayit | wrist | hair) and you rule. Between them: shailos.
export const CHECK_QUEUE = [
  {
    kind: 'scan', name: 'Eli', look: PERSON('#3a2e5a', '#111', { beard: '#3a2a1a' }), flag: { spot: 'arm', what: 'bandage over the whole muscle' },
    line: 'Ax throwing. I cut my left biceps; the bandage covers the whole place for the shel yad.',
    options: [
      { t: 'Shel yad on top of the bandage, covered by his sleeve, without a bracha', ok: true },
      { t: 'On top of his shirt sleeve instead, so it doesn’t press on the cut', why: 'Tefillin on top of the sleeve is “derech hachitzonim”, the Mishnah’s heretics’ way (Megillah 24b): the shel yad must be covered, “lecha le’ot”, a sign for you, not for others.' },
      { t: 'Rip the bandage off: nothing may come between', why: 'No: if it hurts to put it on the wound he’s patur from the shel yad (Shulchan Aruch HaRav 27:8). And a bandage isn’t like a shirt.' },
    ],
    why: 'Magen Avraham 27:6 (#96): you may put it on the bandage if there’s no other way, as long as something covers it. Mishnah Berurah HaMevoar (#98): a bandage is like the arm itself, a place normally covered, unlike a shirt. Shulchan Aruch HaRav 27:8 (#99): put it on the bandage without a bracha, and be careful to cover it.',
    lesson: 'A bandage on the biceps: shel yad over it, covered, without a bracha. Never over the shirt (Magen Avraham 27:6, Shulchan Aruch HaRav, #96-#99).',
  },
  {
    kind: 'scan', name: 'Dov', look: PERSON('#2e5d4b', '#c0392b'), flag: { spot: 'head', what: 'bandage where the shel rosh goes' },
    line: 'Stitches on top of my head, right where the shel rosh sits. Thin bandage. Can I put it on?',
    options: [
      { t: 'Yes, over the thin bandage, but no bracha on the shel rosh: have it in mind with the shel yad’s lehaniach', ok: true },
      { t: 'Yes, with both brachot as usual: there’s no chatzitzah for the shel rosh' },
      { t: 'No shel rosh at all until it heals' },
    ],
    why: 'The Rosh (Beit Yosef, #95): from “al yadcha” and “bein einecha” and the kohen’s “al besaro”, nothing may come between the tefillin and the body. The Rashba: there’s no chatzitzah in tefillin at all, and the shel rosh may even go on a hat, since “ve’ra’u kol amei ha’aretz”. So the Rema (27:4): one who puts it on that way doesn’t bless on the shel rosh; the lehaniach on the shel yad covers it.',
    lesson: 'Bandage under the shel rosh: put it on, no bracha on the rosh; the shel yad’s lehaniach covers it (Rema 27:4; Rosh vs Rashba, #95).',
  },
  {
    kind: 'shaila', title: 'Five ways to keep the yud home', who: 'The sofer at the door',
    line: '“Ashkenazi loops pull the yud away every time you tighten. The Mishnah Berurah’s own fix for keeping it by the bayit?”',
    options: [
      { t: 'Cut a notch in the top of the titura so the knot sits snug against the bayit', ok: true },
      { t: 'Glue the yud to the bayit' },
      { t: 'Wrap a gid thread around the titura, underneath' },
    ],
    why: 'Mishnah Berurah 27:11: cut into the titura from above and stick the yud to the bayit (that’s why the ma’abarta of a lefty’s pair has the bigger cut on the other side). 27:10: a gid thread tied around the underside of the titura is a chatzitzah, “ra’ui levatel”. The Kaf HaChaim (#88) ties it from the top seam instead; the Chazon Ish had a piece of strap set in the ma’abarta (#89); Sefardim feed the loop out the far side so tightening pulls the yud in (#87); Chabad’s adjustable loop ties the knot itself (#92).',
    lesson: 'Keep the yud by the bayit: a notch in the titura (Mishnah Berurah 27:11), a thread from the top seam (Kaf HaChaim), never under it (#86-#92).',
  },
  {
    kind: 'scan', name: 'Shimi', look: PERSON('#1d2433', '#e0b54a'), flag: { spot: 'bayit', what: 'a thread looped under the titura' },
    line: 'I tied my yud to the bayit with a thread. It goes right around the bottom of the titura. Good, no?',
    options: [
      { t: 'The thread under the titura is between the bayit and his arm: move it to the top seam', ok: true },
      { t: 'Perfect: the Zohar wants the yud tied to the bayit' },
      { t: 'Fine, a thread is too thin to matter' },
    ],
    why: 'Mishnah Berurah 27:10: the custom of tying the yud with a gid thread “ra’ui levatel”, because the thread goes around the titura and is a chatzitzah between the arm and the tefillin (so too the Levushei Serad). The Kaf HaChaim (#88): tie it with the gid that sews the titura, coming out of the top seam, “so there’s no chatzitzah between the tefillin and his flesh”.',
    lesson: 'A thread holding the yud must not run under the titura: tie it from the top seam (Mishnah Berurah 27:10, Kaf HaChaim, #88).',
  },
  {
    kind: 'scan', name: 'Moti', look: PERSON('#5a2e2e', '#fff'), flag: { spot: 'bayit', what: 'clear nail polish on the bottom' },
    line: 'I sweat a lot, and I shower right before Shacharit. I painted clear nail polish on the bottom of my batim.',
    options: [
      { t: 'Fine: it’s there to protect the tefillin, so it’s no chatzitzah', ok: true },
      { t: 'Chatzitzah: scrape it off before tomorrow' },
      { t: 'Fine only on the shel rosh' },
    ],
    why: 'Halichot Shlomo (#101): you may rub paraffin oil on tefillin against water and sweat; it’s absorbed into the leather. Even ink spilled on the bottom, or lacquer (“lakah”), is kosher: “ein bahem mamash”. Shevet HaLevi (#102): “pashut she’mutar lechatchila”, since it’s done to protect the batim. Wet hair after a shower isn’t a chatzitzah either (Halichot Shlomo, #100).',
    lesson: 'Sealing the batim against sweat or a wet head: allowed, it protects the tefillin (Halichot Shlomo, Shevet HaLevi, #100-#102).',
  },
  {
    kind: 'shaila', title: 'Borrowed tefillin', who: 'Your lefty friend',
    line: '“Your pair is a righty’s. On my right arm the knot faces out. If I flip it, the ma’abarta is toward my elbow and the bayit toward my shoulder. What do I do?”',
    options: [
      { t: 'Flip it: the yud must face the heart; which end faces the shoulder is only custom. Best: re-thread the strap from the other side', ok: true },
      { t: 'Keep the bayit toward the elbow, knot facing out: that’s the minhag' },
      { t: 'You can’t wear a righty’s tefillin at all' },
    ],
    why: 'Beit Yosef (#94), from the Terumat HaDeshen: some put the ma’abarta toward the shoulder, some toward the hand, “ein kepida badavar kulei hai”; today everyone puts the ma’abarta toward the shoulder. But the yud facing the heart is a din in the Gemara. Biur Halacha 27:2 (Shvut Yaakov): a lefty with only a righty’s pair may flip it, bayit toward the shoulder, “ki zeh vadai tov yoter”. Better still: undo the strap and feed it in from the other side.',
    lesson: 'A lefty borrowing a righty’s pair: the yud toward the heart beats which end faces the shoulder; best, re-thread it (Beit Yosef, Biur Halacha, #94).',
  },
  {
    kind: 'scan', name: 'Avi', look: PERSON('#2b3a55', '#2c5aa0', { beard: '#5a3a22' }), flag: { spot: 'hair', what: 'long hair (growing it out for Purim)' },
    line: 'It’s Chanukah and I’m growing my hair out for my Purim costume. My friend says long hair is a chatzitzah.',
    options: [
      { t: 'Your own hair growing in its place isn’t a chatzitzah: “hair is like the head itself”', ok: true },
      { t: 'He’s right: cut it before tefillin tomorrow' },
      { t: 'Only a problem past 10 cm' },
    ],
    why: 'Aruch HaShulchan 27:15 (#103): some want to be strict with very big hair, “but I see no reason: what limit would you give? Hair is like the head itself.” Only a bald man who combs hair over from somewhere else onto the place of the tefillin has a chatzitzah. “And that’s the simple custom, with no doubt at all.”',
    lesson: 'Your own hair in its place is like the head: no chatzitzah, however long (Aruch HaShulchan 27:15, #103).',
  },
  {
    kind: 'scan', name: 'Mr. Gold', look: PERSON('#30245a', '#111', { hat: 'fedora' }), flag: { spot: 'hair', what: 'a massive combover' },
    line: 'Bald on top. I grow it long on the side and comb it right over. Is my combover a chatzitzah?',
    options: [
      { t: 'Most say yes, so move it aside under the bayit; Rav Shlomo Zalman is lenient, since that’s how he wears it', ok: true },
      { t: 'No problem by everyone: it’s his own hair' },
      { t: 'Shave the side so it can’t happen' },
    ],
    why: 'Aruch HaShulchan (#103): hair brought over from another place to the place of the tefillin “vadai yesh chatzitzah”. Maasef LeChol HaMachanot (#104) and Chut Shani (#105): it’s from another place, so it’s chatzitzah, and the question is only how much. Halichot Shlomo (#106): since that’s the normal way for such people, it isn’t considered a chatzitzah. Easy fix: brush it aside where the bayit sits.',
    lesson: 'A combover is hair from elsewhere: most say chatzitzah, Rav Shlomo Zalman is lenient. Brush it aside under the bayit (#103-#106).',
  },
  {
    kind: 'scan', name: 'Reb Ari', look: PERSON('#101218', '#111', { beard: '#d9d9d9' }), flag: { spot: 'hair', what: 'a toupee' },
    line: 'No hair left at all; I wear a toupee to shul. Do the tefillin go on the toupee?',
    options: [
      { t: 'Put them on at home first, on his own head, and say Shema; then he may wear them over the toupee in shul', ok: true },
      { t: 'Always over the toupee: it’s his hair now' },
      { t: 'He must come to shul without it' },
    ],
    why: 'Halichot Shlomo (#109): Rav Shlomo Zalman ruled that a man with no hair who goes out in a toupee, since it’s hard to tell him to daven alone at home every day, should first put the tefillin on his bare head at home and read Shema in them; then he may go daven with the tzibbur and put them on over the toupee. (Implanted hair that grows from the scalp is different: Igrot Moshe, #110, it becomes part of the body, no chatzitzah.)',
    lesson: 'A toupee: tefillin on the bare head at home with Shema first, then over it in shul (Halichot Shlomo, #109). Hair implants aren’t a chatzitzah (Igrot Moshe, #110).',
  },
  {
    kind: 'scan', name: 'Danny', look: PERSON('#4a3a1a', '#2c5aa0'), flag: { spot: 'wrist', what: 'a watch under the straps' },
    line: 'Let’s set the record straight: do I have to take my watch off before tefillin?',
    options: [
      { t: 'It’s proper to take it off, but by the letter of the law only the place of the knot matters, not the wraps', ok: true },
      { t: 'It must come off: the wraps are the mitzvah' },
      { t: 'Wear it on top of the bayit for safekeeping' },
    ],
    why: 'Pri Megadim (#107): be careful with the strap where it ties; lechatchila the wraps too should be on the skin. Teshuvot VeHanhagot (#108): by din the concern is only at the knot; the order of wraps is a minhag, and the straps of the wraps aren’t a real chatzitzah. So it’s proper to take off the watch, as the Dovev Meisharim wrote, but it isn’t an obligation.',
    lesson: 'The watch: proper to take it off, but only the knot’s place is the din; the wraps are minhag (Pri Megadim, Teshuvot VeHanhagot, #107-#108).',
  },
  {
    kind: 'shaila', title: 'Last call: the sleeve', who: 'Your chavruta',
    line: '“The Rashba says there’s no chatzitzah in tefillin at all. So I can put my shel yad on my shirt sleeve and cover it with a sweater, right?”',
    options: [
      { t: 'No: it must sit where the arm is normally covered, and a shirt isn’t that', ok: true },
      { t: 'Yes: no chatzitzah, and the sweater makes it “lecha le’ot”' },
      { t: 'Yes, but only on Shabbat' },
    ],
    why: 'Machatzit HaShekel (#97): by the Rashba the problem with the sleeve isn’t chatzitzah but “vehaya lecha le’ot”, a sign for you and not for others: the shel yad must be covered. Mishnah Berurah HaMevoar (#98): it has to lie in a place people normally cover; on top of a garment isn’t that place, while a bandage on the arm is. Roll up the sleeve.',
    lesson: 'Never on the sleeve, even under a sweater: the shel yad sits where the arm is normally covered (Machatzit HaShekel, #97-#98).',
  },
];

export const CHECK_LESSONS = [
  'No Gemara says there’s chatzitzah in tefillin. The Rosh learns it from “al yadcha” and “bein einecha”; the Rashba says the sleeve is out only because of “lecha le’ot” (#95).',
  'The yud stays touching the bayit, even in the bag (Shulchan Aruch 27:2, Mishnah Berurah 27:10-11).',
  'Things done to protect the tefillin aren’t a chatzitzah (Shevet HaLevi, #102).',
];

// ── One entry per shiur. Deep links: ?shiur=4 (or ?level=4), ?level=stand (see nav.js) ──
export const SHIURIM = [
  {
    shiur: 3, world: 1, title: 'One bracha or two?', he: 'הֶפְסֵק', sub: 'Siman 25 · sheet #36-51 · in the shul',
    levels: [
      { id: 'gauntlet', name: 'The Hefsek Gauntlet', color: '#ff5a4a' },
      { id: 'catch', name: 'Bracha Catch', color: '#5fb3ff' },
      { id: 'table', name: 'Hum or Hush', color: '#7ad1a8' },
    ],
  },
  {
    shiur: 4, world: 2, title: 'Which arm, where, and when', he: 'יָד כֵּהָה', sub: 'Simanim 25-27 · sheet #52-75 · the tefillin stand',
    levels: [{ id: 'stand', name: 'The Tefillin Stand', color: '#ffb347' }],
  },
  {
    shiur: 5, world: 3, title: 'Missing arms, and the yud', he: 'גִּידֵּם', sub: 'Siman 27 · sheet #71-91 · the rehab ward',
    levels: [{ id: 'ward', name: 'The Ward', color: '#ff7ab8' }],
  },
  {
    shiur: 6, world: 4, title: 'The yud stays home, and nothing in between', he: 'חֲצִיצָה', sub: 'Siman 27 · sheet #86-111 · the checkpoint at the shul door',
    levels: [{ id: 'check', name: 'The Checkpoint', color: '#5ad1ff' }],
  },
];
