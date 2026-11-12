// Content for Teimani: the sounds, the lessons and the challenges.
// The reading taught is the central (Sana'a) tradition; where Sharab differs it is said so.

// Every sound has an IPA symbol, a plain-English handle, and either a robot clip or vowel resonances.
export const SOUNDS = {
  b: { ipa: 'b', like: '<b>b</b> in <i>boy</i>', clip: 'b' },
  v: { ipa: 'v', like: '<b>v</b> in <i>vine</i>', clip: 'v' },
  g: { ipa: 'g', like: '<b>g</b> in <i>go</i>', clip: 'g' },
  j: { ipa: 'dʒ', like: '<b>j</b> in <i>jam</i>', clip: 'j' },
  gh: { ipa: 'ɣ', like: 'a gargled g, like the Parisian <i>r</i>', clip: 'gh' },
  d: { ipa: 'd', like: '<b>d</b> in <i>door</i>', clip: 'd' },
  dh: { ipa: 'ð', like: '<b>th</b> in <i>this</i> (buzzing)', clip: 'dh' },
  k: { ipa: 'k', like: '<b>k</b> in <i>king</i>', clip: 'k' },
  kh: { ipa: 'x', like: '<b>ch</b> in <i>Bach</i>', clip: 'kh' },
  p: { ipa: 'p', like: '<b>p</b> in <i>pen</i>', clip: 'p' },
  f: { ipa: 'f', like: '<b>f</b> in <i>fan</i>', clip: 'f' },
  t: { ipa: 't', like: '<b>t</b> in <i>top</i>', clip: 't' },
  th: { ipa: 'θ', like: '<b>th</b> in <i>think</i> (no buzz)', clip: 'th' },
  w: { ipa: 'w', like: '<b>w</b> in <i>water</i>', clip: 'w' },
  hh: { ipa: 'ħ', like: 'a tight, breathy h: fogging a mirror', clip: 'hh' },
  ayin: { ipa: 'ʕ', like: 'a squeezed throat sound, the buzzing twin of ħ', clip: 'ayin' },
  glottal: { ipa: 'ʔ', like: 'the catch in the middle of <i>uh-oh</i>', clip: 'glottal' },
  q: { ipa: 'q', like: 'a k made as far back as the tongue goes', clip: 'q' },
  tt: { ipa: 'tˤ', like: 'a heavy t, tongue root pulled back', clip: 'tt' },
  ss: { ipa: 'sˤ', like: 'a heavy s, tongue root pulled back', clip: 'ss' },
  r: { ipa: 'r', like: 'a rolled r, as in Spanish <i>perro</i>', clip: 'r' },
  s: { ipa: 's', like: '<b>s</b> in <i>sun</i>', clip: 's' },
  sh: { ipa: 'ʃ', like: '<b>sh</b> in <i>ship</i>', clip: 'sh' },
  // vowels: `at` is the spot on the mouth map (open 0..1, front 0..1), `f` the resonances to synthesize
  aw: { ipa: 'ɔ', like: '<b>aw</b> in <i>law</i>', vowel: true, at: [0.66, 0.1], f: [570, 850, 2450] },
  a: { ipa: 'a', like: '<b>a</b>, between <i>cat</i> and <i>father</i>', vowel: true, at: [0.98, 0.45], f: [760, 1400, 2500] },
  e: { ipa: 'e', like: '<b>ay</b> in <i>day</i>, cut short before it glides', vowel: true, at: [0.3, 0.88], f: [400, 2100, 2700] },
  oe: { ipa: 'ø', like: 'French <i>peu</i>, German <i>schön</i>: say “ay” with rounded lips', vowel: true, at: [0.36, 0.52], f: [400, 1450, 2250] },
  i: { ipa: 'i', like: '<b>ee</b> in <i>see</i>', vowel: true, at: [0, 1], f: [280, 2300, 3000] },
  u: { ipa: 'u', like: '<b>oo</b> in <i>moon</i>', vowel: true, at: [0, 0], f: [310, 820, 2350] },
};

// The decoder drawer: symbols a newcomer has not met, in teaching order.
export const DECODER = ['th', 'dh', 'kh', 'gh', 'j', 'w', 'hh', 'ayin', 'glottal', 'tt', 'ss', 'q', 'r', 'sh', 'aw', 'a', 'e', 'oe', 'i', 'u'];

export const BEGED = [
  { he: 'ב', name: 'Bet', hard: 'b', soft: 'v', where: 'lips' },
  { he: 'ג', name: 'Gimel', hard: 'j', soft: 'gh', where: 'back', note: 'Sana’a. In Sharab the dotted letter is [g].' },
  { he: 'ד', name: 'Dalet', hard: 'd', soft: 'dh', where: 'teeth' },
  { he: 'כ', name: 'Kaf', hard: 'k', soft: 'kh', where: 'back' },
  { he: 'פ', name: 'Pe', hard: 'p', soft: 'f', where: 'lips' },
  { he: 'ת', name: 'Tav', hard: 't', soft: 'th', where: 'teeth' },
];

// Familiar words in the Sana'a reading. `say` is a rough respelling for people who skip the IPA.
export const WORDS = [
  { he: 'שָׁלוֹם', ipa: 'ʃɔˈløm', say: 'shaw-LÖM', en: 'peace' },
  { he: 'שַׁבָּת', ipa: 'ʃabˈbɔθ', say: 'shab-BAWTH', en: 'Sabbath' },
  { he: 'בָּרוּךְ', ipa: 'bɔˈrux', say: 'baw-RUKH', en: 'blessed' },
  { he: 'תּוֹרָה', ipa: 'tøˈrɔ', say: 'tö-RAW', en: 'Torah' },
  { he: 'מֶלֶךְ', ipa: 'ˈmalax', say: 'MA-lakh', en: 'king' },
  { he: 'אֱמֶת', ipa: 'ʔăˈmaθ', say: 'a-MATH', en: 'truth' },
  { he: 'דָּוִד', ipa: 'dɔˈwið', say: 'daw-WIDH', en: 'David' },
  { he: 'גָּדוֹל', ipa: 'dʒɔˈðøl', say: 'jaw-DHÖL', en: 'great' },
  { he: 'קָדוֹשׁ', ipa: 'gɔˈðøʃ', say: 'gaw-DHÖSH', en: 'holy' },
  { he: 'עוֹלָם', ipa: 'ʕøˈlɔm', say: 'ʕö-LAWM', en: 'world' },
  { he: 'מֹשֶׁה', ipa: 'møˈʃa', say: 'mö-SHA', en: 'Moses' },
  { he: 'אֶחָד', ipa: 'ʔaˈħɔð', say: 'a-ḤAWDH', en: 'one' },
  { he: 'יִשְׂרָאֵל', ipa: 'jisrɔˈʔel', say: 'yis-raw-ʔEL', en: 'Israel' },
  { he: 'צִיּוֹן', ipa: 'sˤijˈjøn', say: 'ṣiy-YÖN', en: 'Zion' },
];

const H = (s) => `<span class="he" lang="he" dir="rtl">${s}</span>`;
const I = (s) => `<span class="ipa">[${s}]</span>`;
const P = (id) => `<button class="snd" data-play="${id}" aria-label="Hear it"><span class="ipa">[${SOUNDS[id].ipa}]</span></button>`;

export const LEVELS = [
  // ------------------------------------------------------------------ 1
  {
    id: 'beged', n: 1, title: 'Pop & Hiss', he: 'בגד כפת', color: 'saffron',
    blurb: 'Six letters, twelve sounds. What the dot really does.',
    lesson: [
      { h: 'Six letters lead a double life', html: `
        <p>${H('ב ג ד כ פ ת')}: the <b>beged kefet</b> letters. Each one has two sounds. With a dot inside (a <i>dagesh</i>) it is one sound; without the dot it is another.</p>
        <p>Israeli Hebrew still does this for three of them: ${H('בּ')}/${H('ב')}, ${H('כּ')}/${H('כ')}, ${H('פּ')}/${H('פ')}. Ashkenazi reading keeps a fourth, ${H('תּ')}/${H('ת')}, as t/s.</p>
        <p class="hl">Yemenite reading keeps <b>all six pairs</b>. Twelve different sounds.</p>` },
      { h: 'Pops and hisses', html: `
        <p>The two sounds of each letter are made in the <b>same place</b> in the mouth. Only the airflow changes.</p>
        <div class="two">
          <div class="pill pop"><b>Pop</b><small>linguists say <i>stop</i></small><span>The air is blocked completely, then let go: ${P('b')} ${P('t')} ${P('k')}</span></div>
          <div class="pill hiss"><b>Hiss</b><small>linguists say <i>fricative</i></small><span>The air squeezes through a narrow gap: ${P('v')} ${P('th')} ${P('kh')}</span></div>
        </div>
        <p><b>The test:</b> you can hold a hiss for as long as you have breath (<i>fffff</i>). You cannot hold a pop. Try to hold a <i>t</i>: nothing comes out until you let go.</p>
        <p class="hl">Dot = pop. No dot = hiss.</p>` },
      { h: 'Reading the symbols', html: `
        <p>The square brackets hold <b>IPA</b>, the International Phonetic Alphabet. Its one rule: <b>one symbol, one sound, always.</b> English spelling can’t promise that (<i>th</i> is two different sounds in <i>think</i> and <i>this</i>).</p>
        <p>Most IPA letters mean what you expect. This level needs four new ones. Tap each to hear it:</p>
        <ul class="sym">
          <li>${P('th')} <b>theta</b>: th in <i>think</i>. Tongue tip between the teeth, no voice.</li>
          <li>${P('dh')} <b>eth</b>: th in <i>this</i>. Same place, voice switched on.</li>
          <li>${P('kh')} ch in <i>Bach</i> or <i>Chanukah</i>.</li>
          <li>${P('gh')} <b>gamma</b>: the same place as [x], voice switched on. A soft gargle.</li>
        </ul>
        <p class="fine">The clips are a robot voice: a rough sketch of each sound, not a Yemenite reader.</p>` },
      { h: 'All twelve', html: `<div data-widget="beged"></div>
        <p class="fine">The dotted ${H('גּ')} shown is the Sana’a one, ${I('dʒ')}. It has a level to itself.</p>` },
      { h: 'Why would a letter do this?', html: `
        <p>A pop needs the mouth fully shut for a moment. Right after a vowel the mouth is wide open, and speakers of ancient Hebrew stopped bothering to shut it all the way. The pop leaked, and became a hiss.</p>
        <p>So, roughly: <b>after a vowel, no dot</b>. At the start of a word or after a closed syllable, the dot stays.</p>
        <p>One root shows both: ${H('כָּתַב')} ${I('kɔˈθav')} “he wrote” and ${H('יִכְתֹּב')} ${I('jixˈtøv')} “he will write”. The ${H('כ')} and ${H('ת')} swap roles.</p>` },
    ],
    challenges: [
      { type: 'choice', q: 'What sound is this?', big: 'תּ', opts: ['t', 'th', 's', 'dh'], why: 'Dot = pop. Tav with a dot is a plain [t].' },
      { type: 'choice', q: 'And without the dot?', big: 'ת', opts: ['th', 't', 's', 'dh'], why: 'No dot = hiss, in the same place: [θ], as in <i>think</i>. Ashkenazi reading turned this one into [s]; Israeli reading dropped it.' },
      { type: 'choice', q: 'What sound is this?', big: 'ד', opts: ['dh', 'd', 'th', 'v'], why: 'Dalet without a dot is [ð], th in <i>this</i>. The voice stays on, as it does for [d].' },
      { type: 'choice', q: 'Which of these can you hold for three seconds?', opts: ['f', 'p', 't', 'k'], why: '[f] is a hiss: air keeps flowing. The other three are pops.' },
      { type: 'hold', sound: 'th', voiced: false, he: 'ת', tip: 'Tongue tip lightly between your teeth. Blow. No voice.' },
      { type: 'choice', q: 'What sound is this?', big: 'ג', opts: ['gh', 'g', 'j', 'kh'], why: 'Gimel without a dot is [ɣ]: the back of the tongue nearly touches the soft palate while the voice buzzes.' },
      { type: 'choice', q: `${H('שַׁבָּת')} ends with which sound?`, opts: ['th', 't', 's', 'dh'], why: `No dot in the final ${H('ת')}, so ${I('ʃabˈbɔθ')}: “shabbawth”.` },
      { type: 'hold', sound: 'dh', voiced: true, he: 'ד', tip: 'Same tongue position as [θ], but hum while you do it. You should feel your tongue tickle.' },
      { type: 'match', q: 'Pair each pop with its hiss.', pairs: [['b', 'v'], ['d', 'dh'], ['k', 'kh'], ['t', 'th'], ['p', 'f']] },
      { type: 'choice', q: `${H('דָּוִד')}. Which is right?`, opts: [I('dɔˈwið'), I('dɔˈvid'), I('daˈvid'), I('ðɔˈwid')], raw: true, why: `First ${H('דּ')} has a dot: [d]. Last ${H('ד')} has none: [ð]. And ${H('ו')} is [w]. “Daw-widh.”` },
      { type: 'hold', sound: 'kh', voiced: false, he: 'כ', tip: 'Back of the tongue raised toward the soft palate, as in <i>Bach</i>. Keep the air going.' },
      { type: 'choice', q: `${H('כָּתַב')} “he wrote”. Which is right?`, opts: [I('kɔˈθav'), I('kaˈtav'), I('xɔˈθav'), I('kɔˈθab')], raw: true, why: `${H('כּ')} pop, ${H('ת')} hiss, ${H('ב')} hiss.` },
    ],
  },
  // ------------------------------------------------------------------ 2
  {
    id: 'jimel', n: 2, title: 'The Jimel Case', he: 'גּ', color: 'henna',
    blurb: 'Sana’a says “jimel”. Here is why linguists say that one is borrowed.',
    lesson: [
      { h: 'Meet jimel', html: `
        <p>In Sana’a, the dotted ${H('גּ')} is read ${P('j')}, the j of <i>jam</i>. The letter is called <b>jimel</b>, and ${H('גָּדוֹל')} “great” is ${I('dʒɔˈðøl')}.</p>
        <p>It is the best-known mark of a Yemenite reader. It is also the one feature that most scholars think is <b>not</b> ancient. The case against it rests on three pieces of evidence.</p>` },
      { h: 'Evidence 1: it breaks the pattern', html: `
        <p>Level 1’s rule: the dot changes <i>how</i> the air moves, never <i>where</i> the sound is made.</p>
        <div data-widget="mouth"></div>
        <p>Soft ${H('ג')} is ${P('gh')}, made at the <b>back</b> of the mouth. Its pop partner at the back is ${P('g')}. But ${P('j')} is made at the <b>front</b>, just behind the gum ridge. And it is not a clean pop: it is a pop with a hiss fused onto it (linguists say <i>affricate</i>).</p>
        <p class="hl">Five pairs share a place. Jimel is the only one that doesn’t.</p>` },
      { h: 'Evidence 2: the Arabic fingerprint', html: `
        <p>Yemenite Jews spoke Arabic every day. Compare how each region’s Arabic says two letters with how its Jews read Hebrew:</p>
        <table class="grid">
          <tr><th></th><th>Arabic ج</th><th>Hebrew ${H('גּ')}</th><th>Arabic ق</th><th>Hebrew ${H('ק')}</th></tr>
          <tr><th>Sana’a</th><td>${I('dʒ')}</td><td>${I('dʒ')}</td><td>${I('g')}</td><td>${I('g')}</td></tr>
          <tr><th>Sharab</th><td>${I('g')}</td><td>${I('g')}</td><td>${I('q')}</td><td>${I('q')}</td></tr>
        </table>
        <p>In both places the Hebrew matches the Arabic next door. Notice Sana’a did keep a [g]. It just moved to ${H('ק')}: ${H('קָדוֹשׁ')} is ${I('gɔˈðøʃ')}.</p>
        <p>The [dʒ] itself is an Arabic sound change. The old Semitic sound was [g]: Hebrew ${H('גָּמָל')} <i>gamal</i>, Arabic <i>jamal</i>, and Cairo still says <i>gamal</i>.</p>` },
      { h: 'Evidence 3: an old witness', html: `
        <p><i>Sefer Yetzirah</i>, one of the oldest Hebrew books to discuss the letters, sorts the alphabet by where in the mouth each letter is made. One of its five groups is:</p>
        <p class="center big">${H('גיכ״ק')}</p>
        <p>Gimel sits with ${H('כ')} and ${H('ק')}, the back-of-the-mouth family. That is where [g] and [ɣ] live.</p>` },
      { h: 'So is it “wrong”?', html: `
        <p><b>The defence.</b> Rav Yosef Qafih, the great Yemenite scholar of the last century, argued that Yemenite reading was not shaped by Arabic. His strongest point: Yemenite Jews say ${P('p')} and ${P('v')}, two sounds Arabic does not have at all.</p>
        <p><b>The verdict.</b> “Wrong” needs its quotation marks. Jimel has been read in Sana’a for centuries, and for the people who inherited it, it is the correct reading. The evidence makes a narrower claim: it is probably not how ${H('גּ')} sounded when the dots were invented. The Sharab reading, [g], fits the pattern.</p>
        <p class="fine">The classic fieldwork on all this is Shelomo Morag’s study of the Yemenite reading traditions.</p>` },
    ],
    challenges: [
      { type: 'choice', q: 'In Sana’a, what sound is this?', big: 'גּ', opts: ['j', 'g', 'gh', 'kh'], why: 'Jimel: [dʒ], the j of <i>jam</i>.' },
      { type: 'place', q: 'Where in the mouth is this hiss made?', sound: 'gh', a: 'back' },
      { type: 'place', q: 'And this one, the Sana’a pop that is supposed to be its partner?', sound: 'j', a: 'ridge', why: 'Front of the mouth. Its soft partner [ɣ] is at the back: the pair does not share a place.' },
      { type: 'choice', q: 'Which pop is made in the same place as [ɣ]?', opts: ['g', 'j', 'd', 'b'], why: '[g] and [ɣ] are both made with the back of the tongue against the soft palate. That is the Sharab pairing.' },
      { type: 'jimel', want: 'j', tip: `Say ${H('גַּם')} the Sana’a way: <b>jam</b>.` },
      { type: 'jimel', want: 'g', tip: `Now the Sharab way: <b>gam</b>, with a clean pop.` },
      { type: 'choice', q: `In Sana’a, how does ${H('קוֹל')} “voice” start?`, opts: ['g', 'k', 'q', 'j'], why: `Sana’a reads ${H('ק')} as [g]: ${I('gøl')}. The [g] sound was never lost. It moved house.` },
      { type: 'choice', q: 'In Sharab, Arabic ج is [g]. So Sharabi Jews read גּ as…', opts: ['g', 'j', 'q', 'gh'], why: 'Each community’s Hebrew matches its neighbours’ Arabic. That match is the fingerprint.' },
      { type: 'choice', q: '[dʒ] is a pop with a hiss fused on. Which other sound is built that way?', opts: [`<b>ch</b> in <i>church</i>`, `<b>th</b> in <i>think</i>`, `<b>k</b> in <i>king</i>`, `<b>m</b> in <i>moon</i>`], raw: true, why: '<i>Ch</i> is t + sh fused, just as <i>j</i> is d + zh fused. Linguists call both affricates.' },
      { type: 'choice', q: 'What is Rav Qafih’s best argument that Arabic did not shape Yemenite Hebrew?', opts: ['Yemenites say [p] and [v], which Arabic lacks', 'Jimel appears in the Torah scroll', 'Sharab also says jimel', 'Arabic has no [dʒ]'], raw: true, why: 'If Arabic had flattened the reading, [p] and [v] should have gone first. They survived.' },
      { type: 'choice', q: `${H('גָּדוֹל')} in Sana’a:`, opts: [I('dʒɔˈðøl'), I('gaˈdol'), I('ɣɔˈðøl'), I('dʒɔˈdøl')], raw: true, why: `Dotted ${H('גּ')}: [dʒ]. Undotted ${H('ד')}: [ð]. “Jaw-dhöl.”` },
    ],
  },
  // ------------------------------------------------------------------ 3
  {
    id: 'unmerged', n: 3, title: 'Nothing Merged', he: 'ח ע ט צ', color: 'teal',
    blurb: 'The letters Israeli Hebrew folded together, kept apart.',
    lesson: [
      { h: 'Twins that stayed different', html: `
        <p>In Israeli Hebrew several pairs of letters sound the same, which is why spelling is hard. In Yemenite reading every one of these is a different sound:</p>
        <table class="grid">
          <tr><td>${H('ח')} ${P('hh')}</td><td>is not</td><td>${H('כ')} ${P('kh')}</td></tr>
          <tr><td>${H('ע')} ${P('ayin')}</td><td>is not</td><td>${H('א')} ${P('glottal')}</td></tr>
          <tr><td>${H('ט')} ${P('tt')}</td><td>is not</td><td>${H('תּ')} ${P('t')}</td></tr>
          <tr><td>${H('ק')} ${P('g')}</td><td>is not</td><td>${H('כּ')} ${P('k')}</td></tr>
          <tr><td>${H('ו')} ${P('w')}</td><td>is not</td><td>${H('ב')} ${P('v')}</td></tr>
        </table>
        <p class="fine">Only ${H('ס')} and ${H('שׂ')} share a sound, [s].</p>` },
      { h: 'The throat pair: ħ and ʕ', html: `
        <p>${P('hh')} for ${H('ח')}: breathe out as if fogging a mirror, then tighten the throat until the breath turns hoarse. It is a hiss made in the throat, with no scrape at the roof of the mouth. (The scrape is ${P('kh')}, which belongs to ${H('כ')}.)</p>
        <p>${P('ayin')} for ${H('ע')}: the same squeeze with the voice on. Say “aaah” and tighten the throat in the middle of it.</p>
        <p>${P('glottal')} for ${H('א')}: only the tiny catch between the two halves of <i>uh-oh</i>.</p>` },
      { h: 'The heavy pair: tˤ and sˤ', html: `
        <p>The small raised ˤ means “heavy”: say the plain sound while pulling the root of the tongue back toward the throat. The vowel next to it turns darker.</p>
        <p>${H('ט')} is ${P('tt')}, a heavy [t].</p>
        <p>${H('צ')} is ${P('ss')}, a heavy [s]. <b>Never “ts”.</b> ${H('צִיּוֹן')} is ${I('sˤijˈjøn')}.</p>` },
      { h: 'Waw, resh and doubles', html: `
        <p>${H('ו')} is ${P('w')}. Always. ${H('וְ')} “and” starts with a w. So ${H('עָנָו')} “humble” ${I('ʕɔˈnɔw')} and ${H('עֵנָב')} “grape” ${I('ʕeˈnɔv')} end differently.</p>
        <p>${H('ר')} is ${P('r')}, rolled on the tip of the tongue. Not the Israeli throat r, not the English one.</p>
        <p>A strong dagesh means the consonant is held for double time: ${H('שַׁבָּת')} is ${I('ʃabˈbɔθ')}, with the lips shut for a beat on the b.</p>` },
    ],
    challenges: [
      { type: 'choice', q: 'What sound is this?', big: 'ח', opts: ['hh', 'kh', 'ayin', 'glottal'], why: `${H('ח')} is the throat hiss [ħ]. [x] belongs to undotted ${H('כ')}.` },
      { type: 'choice', q: 'What sound is this?', big: 'צ', opts: ['ss', 's', 'tt', 'sh'], why: 'A heavy s, [sˤ]. The “ts” reading is European.' },
      { type: 'choice', q: 'What sound is this?', big: 'ו', opts: ['w', 'v', 'u', 'b'], why: 'Waw is [w]. That keeps it apart from undotted ב, which is [v].' },
      { type: 'word', q: `You hear ${I('ʕim')}. Which word?`, opts: ['עִם', 'אִם'], gloss: ['with', 'if'], why: `[ʕ] is ${H('ע')}. With the catch [ʔ] it would be ${H('אִם')}.` },
      { type: 'hold', sound: 'hh', voiced: false, he: 'ח', tip: 'Fog a mirror, then tighten your throat. Keep the tongue low: no scrape.' },
      { type: 'word', q: `You hear ${I('gɔˈrɔ')} in Sana’a. Which word?`, opts: ['קָרָא', 'כָּרָה'], gloss: ['he read', 'he dug'], why: `Sana’a ${H('ק')} is [g]. ${H('כָּרָה')} is ${I('kɔˈrɔ')}.` },
      { type: 'word', q: `You hear ${I('tˤɔˈʕɔ')}. Which word?`, opts: ['טָעָה', 'תָּעָה'], gloss: ['he erred', 'he wandered'], why: `The heavy [tˤ] is ${H('ט')}. In Israeli Hebrew these two words sound identical.` },
      { type: 'trill', tip: `Roll a ${H('ר')}: <b>rrrr</b>. Tongue tip loose behind the upper teeth, and blow.` },
      { type: 'word', q: `You hear ${I('ʕɔˈnɔw')}. Which word?`, opts: ['עָנָו', 'עֵנָב'], gloss: ['humble', 'grape'], why: 'It ends in [w], so the last letter is ו.' },
      { type: 'word', q: `You hear ${I('mɔˈħɔr')}. Which word?`, opts: ['מָחָר', 'מָכַר'], gloss: ['tomorrow', 'he sold'], why: `[ħ] is ${H('ח')}. “He sold” is ${I('mɔˈxar')}, with the scrape.` },
      { type: 'choice', q: `${H('צִיּוֹן')}. Which is right?`, opts: [I('sˤijˈjøn'), I('tsiˈjon'), I('sijˈjon'), I('tˤijˈjøn')], raw: true, why: 'Heavy s, a doubled y, and the Sana’a ḥolam [ø].' },
      { type: 'word', q: `You hear ${I('ʔɔˈvað')}. Which word?`, opts: ['אָבַד', 'עָבַד'], gloss: ['he was lost', 'he worked'], why: `[ʔ] is ${H('א')}. With [ʕ] it would be “he worked”.` },
    ],
  },
  // ------------------------------------------------------------------ 4
  {
    id: 'vowels', n: 4, title: 'The Vowel Map', he: 'אָ אַ אֵ אֹ', color: 'indigo',
    blurb: 'Steer a dot around your own mouth with your voice.',
    lesson: [
      { h: 'A vowel is a mouth shape', html: `
        <p>Vowels differ in two ways: how <b>open</b> the jaw is, and whether the tongue is pushed <b>forward</b> or pulled <b>back</b>. Plot those two and you get a map of the mouth.</p>
        <div data-widget="vmap"></div>
        <p>Tap a vowel to hear it. Say “ee… oo” and feel your tongue slide back. Say “ee… ah” and feel your jaw drop.</p>` },
      { h: 'The Sana’a vowels', html: `
        <table class="grid vow">
          <tr><td>${H('בָ')}</td><td>qamatz</td><td>${P('aw')}</td><td>“aw”. Every qamatz, long or short.</td></tr>
          <tr><td>${H('בַ')} ${H('בֶ')}</td><td>pataḥ, segol</td><td>${P('a')}</td><td><b>The same sound.</b></td></tr>
          <tr><td>${H('בֵ')}</td><td>tzere</td><td>${P('e')}</td><td>Pure, no glide to “ee”.</td></tr>
          <tr><td>${H('בֹ')}</td><td>ḥolam</td><td>${P('oe')}</td><td>Lips rounded, tongue forward.</td></tr>
          <tr><td>${H('בִ')}</td><td>ḥiriq</td><td>${P('i')}</td><td></td></tr>
          <tr><td>${H('בֻ')} ${H('וּ')}</td><td>qubbutz, shuruq</td><td>${P('u')}</td><td></td></tr>
        </table>
        <p>So ${H('מֶלֶךְ')} “king” is ${I('ˈmalax')}, and ${H('שָׁלוֹם')} is ${I('ʃɔˈløm')}.</p>` },
      { h: 'Why pataḥ and segol are one', html: `
        <p>The vowel dots in a printed Chumash are the <b>Tiberian</b> system. For centuries Yemenite scribes used a different one, the <b>Babylonian</b> system, written <i>above</i> the letters. It has one sign where Tiberian has two: pataḥ and segol.</p>
        <p>The reading kept that even after the printed books changed. ${H('אֱמֶת')} “truth” is ${I('ʔăˈmaθ')}.</p>
        <p class="hl">Ḥolam is the regional one: [ø] in Sana’a, and in Sharab it merges with tzere, so ${H('שָׁלוֹם')} becomes ${I('ʃɔˈlem')}.</p>` },
      { h: 'The shva is a chameleon', html: `
        <p>A sounded shva is a very quick ${I('ă')}: ${H('בְּרֵאשִׁית')} is ${I('băreˈʃiθ')}.</p>
        <p>Two things change its colour:</p>
        <ul class="sym">
          <li><b>Before ${H('י')}</b> it becomes a quick [i]: ${H('בְּיוֹם')} ${I('bĭˈjøm')}.</li>
          <li><b>Before ${H('א ה ח ע')}</b> it copies the next vowel: ${H('בְּאֵר')} ${I('bĕˈʔer')}, ${H('וְהָיָה')} ${I('wɔ̆hɔˈjɔ')}.</li>
        </ul>` },
      { h: 'Words you know, re-tuned', html: `<div data-widget="words"></div>` },
    ],
    challenges: [
      { type: 'choice', q: 'What vowel is this?', big: 'בָ', opts: ['aw', 'a', 'oe', 'u'], why: 'Qamatz is [ɔ], “aw”. Ashkenazi readers will feel at home.' },
      { type: 'same', q: 'In Sana’a, do these two sound the same?', pair: ['בַ', 'בֶ'], a: true, why: 'Pataḥ and segol are one vowel, [a]. The Babylonian system wrote them with a single sign.' },
      { type: 'calibrate' },
      { type: 'vowel', target: 'aw', he: 'בָ', tip: 'Jaw half open, tongue back, lips slightly rounded: “aw”.' },
      { type: 'same', q: 'In Sana’a, do these two sound the same?', pair: ['בָ', 'בַ'], a: false, why: 'Qamatz [ɔ] and pataḥ [a] are different. Israeli Hebrew merged them.' },
      { type: 'choice', q: `${H('מֶלֶךְ')} “king”:`, opts: [I('ˈmalax'), I('ˈmelex'), I('ˈmelek'), I('ˈmɔlɔx')], raw: true, why: 'Both segols are [a]. “Malakh.”' },
      { type: 'vowel', target: 'e', he: 'בֵ', tip: 'Start to say “day” and freeze on the vowel before it slides to “ee”.' },
      { type: 'choice', q: 'What vowel is this, in Sana’a?', big: 'בֹ', opts: ['oe', 'aw', 'u', 'e'], why: 'Ḥolam is [ø]: the tongue of “ay” with the lips of “oh”.' },
      { type: 'vowel', target: 'oe', he: 'בֹ', tip: 'Hold “ay”, then round your lips into a small circle without moving your tongue.' },
      { type: 'same', q: 'In <b>Sharab</b>, do these two sound the same?', pair: ['בֹ', 'בֵ'], a: true, why: 'In the Sharab region ḥolam merged with tzere. In Sana’a they are different: [ø] and [e].' },
      { type: 'choice', q: `${H('בְּיוֹם')} “on the day”. How is the shva read?`, opts: [I('bĭˈjøm'), I('băˈjøm'), I('bĕˈjøm'), I('bjøm')], raw: true, why: `Before ${H('י')} the shva turns into a quick [i].` },
      { type: 'choice', q: `${H('וְהָיָה')} “and it will be”:`, opts: [I('wɔ̆hɔˈjɔ'), I('văhaˈja'), I('wăhɔˈjɔ'), I('wĭhɔˈjɔ')], raw: true, why: `Before ${H('ה')} the shva copies the next vowel, a qamatz. “Waw-haw-yaw.”` },
      { type: 'vowel', target: 'a', he: 'בַ', tip: 'Jaw wide open: “ah”. This is pataḥ, and segol too.' },
      { type: 'choice', q: `${H('שָׁלוֹם')} in Sana’a:`, opts: [I('ʃɔˈløm'), I('ʃaˈlom'), I('ʃɔˈlojm'), I('sɔˈløm')], raw: true, why: 'Qamatz [ɔ], ḥolam [ø].' },
    ],
  },
  // ------------------------------------------------------------------ 5
  {
    id: 'boss', n: 5, title: 'Read the Verse', he: 'בְּרֵאשִׁית', color: 'gold',
    blurb: 'Everything at once: build Genesis 1:1 sound by sound, then read it.',
    lesson: [
      { h: 'The first verse', html: `
        <p class="center big">${H('בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ')}</p>
        <p>Seven words. They contain a pop and a hiss from the same letter, the Sana’a ḥolam, two chameleon shvas, a doubled consonant, a waw, and a heavy ${H('צ')}.</p>
        <p>You will build each word one piece at a time. The wrong choices are how other traditions read the same letters.</p>
        <p class="fine">In the kuttab, Yemenite boys sat in a circle around a single book, so many learned to read it sideways and upside down. You get to read it the right way up.</p>` },
    ],
    challenges: [
      { type: 'build', he: 'בְּרֵאשִׁית', en: 'In the beginning', segs: [['bă', 'be', 'vă'], ['re', 'rej', 'ri'], ['ʃiθ', 'ʃit', 'ʃis']], why: 'A quick [ă] for the shva, a pure tzere, and the final ת without a dot is [θ].' },
      { type: 'build', he: 'בָּרָא', en: 'created', segs: [['bɔ', 'ba', 'vɔ'], ['rɔ', 'ra', 'rø']], why: 'Two qamatzes: “baw-raw”.' },
      { type: 'build', he: 'אֱלֹהִים', en: 'God', segs: [['ʔă', 'ʔe', 'ʕă'], ['lø', 'lo', 'lɔ'], ['him', 'xim', 'ħim']], why: 'The ḥataf-segol is a quick [a], because segol is [a]. Then the Sana’a ḥolam.' },
      { type: 'build', he: 'אֵת', en: '(object marker)', segs: [['ʔeθ', 'ʔet', 'ʕeθ']], why: 'Tzere, then a hissed ת.' },
      { type: 'build', he: 'הַשָּׁמַיִם', en: 'the heavens', segs: [['haʃ', 'hɔʃ', 'ħaʃ'], ['ʃɔ', 'ʃa', 'sɔ'], ['ma', 'mɔ', 'me'], ['jim', 'jam', 'wim']], why: 'The dagesh doubles the ש: “hash-shaw-ma-yim”.' },
      { type: 'build', he: 'וְאֵת', en: 'and', segs: [['wĕ', 'wă', 'vĕ'], ['ʔeθ', 'ʔet', 'ʔes']], why: `Waw is [w], and its shva sits before ${H('א')}, so it copies the tzere: a quick [e].` },
      { type: 'build', he: 'הָאָרֶץ', en: 'the earth', segs: [['hɔ', 'ha', 'ħɔ'], ['ʔɔ', 'ʔa', 'ʕɔ'], ['rasˤ', 'rets', 'resˤ']], why: 'Segol is [a], and צ is the heavy [sˤ]: “haw-aw-raṣ”.' },
      { type: 'self', q: 'Now read the whole verse aloud. Record it, listen back, and mark yourself honestly.',
        he: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ',
        ipa: 'băreˈʃiθ bɔˈrɔ ʔăløˈhim ʔeθ haʃʃɔˈmajim wĕˈʔeθ hɔˈʔɔrasˤ',
        checks: ['Both ת endings hissed: [θ], not t or s', 'Every qamatz as “aw” [ɔ]', 'אֱלֹהִים with the rounded [ø]', 'וְאֵת starting with [w], not v', 'הָאָרֶץ ending in a heavy s, not “ts”', 'The ש of הַשָּׁמַיִם held double'] },
    ],
  },
];

export const RANKS = [
  { xp: 0, name: 'Guest', he: 'אוֹרֵחַ' },
  { xp: 150, name: 'Talmid', he: 'תַּלְמִיד' },
  { xp: 400, name: 'Qore', he: 'קוֹרֵא' },
  { xp: 700, name: 'Mori', he: 'מָארִי' },
];

export const PLACES = {
  lips: 'Lips',
  teeth: 'Tongue tip at the teeth',
  ridge: 'Front, behind the gum ridge',
  back: 'Back of the tongue',
  throat: 'Throat',
};
