// The Knot Explorer: every way the shiur showed of tying the shel yad and keeping its yud by the
// bayit (SCP chabura #6, siman 27, sheet #81-94, and the video played in the shiur).
//
// Each method sets the model (model.js):
//   loop: 'near'  the loop (lula'ah) sits right by the knot (Ashkenaz)
//         'far'   the doubled strap comes out the far side of the ma'abarta (Sefardim)
//   holds: whether the yud stays against the bayit when you tighten
//   extras: thread ('top' | 'under'), notch, insert, wrapBayit, overYud, shin (Chabad), slip, chafetz, flip

export const VIDEO = { id: 'sPKx9FJyOAw', url: 'https://youtu.be/sPKx9FJyOAw', title: 'Tying the shel yad: Ashkenaz, Sefard, Chabad and the Chafetz Chaim knot' };

export const BASICS = {
  title: 'The parts, and the yud',
  he: 'חֶלְקֵי תְּפִלִּין שֶׁל יָד',
  text: [
    'The ketzitzah is the box with the parsha inside; the titura is the square base it sits on, sewn shut with gid; the ma’abarta is the tunnel at the back of the titura that the strap runs through (#82).',
    'The knot is a yud. Its body is the yud’s head, and the end of the strap coming out of it is the yud’s leg (Minchat Yitzchak, #83). The leg points toward the heart.',
    'Shulchan Aruch 27:2, from the Gemara (Menachot 35b, “kelapei panim”) and the Zohar: the yud faces the heart, and must not move away from the bayit, “not even in the bag” (Mishnah Berurah 27:10).',
    'Today everyone wears it with the ma’abarta toward the shoulder and the ketzitzah toward the elbow (Beit Yosef, #94); the Terumat HaDeshen says it isn’t critical.',
  ],
};

export const METHODS = [
  {
    id: 'ashkenaz', group: 'The two knots', name: 'Nusach Ashkenaz', he: 'נוּסַח אַשְׁכְּנַז', src: '#86',
    loop: 'near', holds: false,
    text: 'The loop sits right next to the knot. The whole strap is fed through the ma’abarta, comes around the arm and goes through that loop. So when an Ashkenazi tightens, he pulls toward himself, and the pull drags the yud away from the bayit.',
    verdict: 'Kosher and standard, but the yud wanders. That’s why Ashkenazim need one of the fixes below.',
  },
  {
    id: 'sefard', group: 'The two knots', name: 'Sefardim and Edot HaMizrach', he: 'מִנְהַג הַסְּפָרַדִּים', src: '#87',
    loop: 'far', holds: true,
    text: 'Halacha Berura 27:9: the doubled strap is fed through the ma’abarta as a loop and comes out on the second side of the bayit, not by the yud. The free end goes through it from outside. Tightening pulls outward, which draws the yud into the bayit. That’s why a Sefardi ma’abarta is roomy enough for a double strap; in the video it’s pulled through with a string.',
    verdict: 'The yud stays home by itself.',
  },
  {
    id: 'thread', group: 'Five ways to keep the yud home', name: '1 · Tie it with a gid thread', he: 'קְשִׁירָה בְּחוּט שֶׁל גִּיד', src: '#88',
    loop: 'near', holds: true, extras: { thread: 'top' },
    text: 'Kaf HaChaim 27:12: “al kein nahagu ha’olam”: when the tefillin are made, the yud is tied to the bayit with a gid thread so it never moves, even in the bag, using the gid that sews the titura and coming out of the top seam, “so there’s no chatzitzah between the tefillin and his flesh.” In practice sofrim run it through the ma’abarta. The shiur: the most popular solution.',
    verdict: 'Holds, as long as the thread doesn’t snap.',
  },
  {
    id: 'under', group: 'Five ways to keep the yud home', name: '✗ A thread under the titura', he: 'חוּט סָבִיב הַתִּיתוֹרָא', src: 'MB 27:10',
    loop: 'near', holds: true, bad: true, extras: { thread: 'under' },
    text: 'Mishnah Berurah 27:10: some tie the yud with a gid thread, “ve’ra’ui levatel zeh”, because the thread goes around the titura and ends up under it, a chatzitzah between the arm and the tefillin (so too the Levushei Serad). That’s exactly why it’s done from the top seam or through the ma’abarta.',
    verdict: 'Don’t: the thread under the base is a chatzitzah.',
  },
  {
    id: 'notch', group: 'Five ways to keep the yud home', name: 'The Mishnah Berurah’s notch', he: 'חֲתָךְ בַּתִּיתוֹרָא', src: 'MB 27:11',
    loop: 'near', holds: true, extras: { notch: true },
    text: 'Mishnah Berurah 27:11: cut into the titura from above and press the yud against the bayit. That’s how you tell a lefty’s pair from a righty’s: the cut by the ma’abarta is bigger on the side the knot goes. The knot sits snug in the notch.',
    verdict: 'Built into the bayit; helps it stay.',
  },
  {
    id: 'insert', group: 'Five ways to keep the yud home', name: '2 · The Chazon Ish: stuff the ma’abarta', he: 'חֲתִיכַת רְצוּעָה בַּמַּעְבַּרְתָּא', src: '#89',
    loop: 'near', holds: true, extras: { insert: true },
    text: 'Orchot Rabbeinu: Rav Chaim Greineman saw the Chazon Ish’s tefillin: inside the ma’abarta, along its length, a piece of strap lay on top of the strap, between it and the bayit, pressing the strap tight so it can’t slide. The strap moves because there’s air in the tunnel; fill the air and it stays. (The Chazon Ish asked for a piece cut from his own strap.) The maggid shiur has this in his own tefillin, and admits it fell out the day before.',
    verdict: 'Holds, until the piece falls out.',
  },
  {
    id: 'wrapBayit', group: 'Five ways to keep the yud home', name: '3 · Or LeTzion: around the bayit', he: 'כְּרִיכָה סְבִיב הַבַּיִת', src: '#90, #91',
    loop: 'far', holds: true, extras: { wrapBayit: true },
    text: 'Rav Ben Tzion Abba Shaul (Or LeTzion): after the bracha, tighten, wrap the strap once around the bayit, then go straight down to the forearm for the seven wraps, with no wraps on the upper arm. That holds the yud in place. Rav Ovadia (Yabia Omer): our practice is not to wrap the bayit, so the rubbing every day won’t wear down its squareness, a halacha leMoshe miSinai for the bayit and the titura alike.',
    verdict: 'Or LeTzion: preferable. Yabia Omer: don’t, protect the ribua.',
  },
  {
    id: 'overYud', group: 'Five ways to keep the yud home', name: '4 · The Be’er Heitev: over the yud', he: 'רְצוּעָה עַל הַיּוּ״ד', src: 'Rema 27:8',
    loop: 'near', holds: true, extras: { overYud: true },
    text: 'The Be’er Heitev: when you tighten, take the first wrap once over the ma’abarta and the yud, pinning the yud in place, then carry on down the arm. The Rema (27:8): “ve’ein lichroch haretzuah al hatitura”. Mishnah Berurah: the tying is already done, and the strap has less kedusha than the titura, so lechatchila don’t; if it won’t stay any other way, you may.',
    verdict: 'Works; the Rema says lechatchila not.',
  },
  {
    id: 'chabad', group: 'Five ways to keep the yud home', name: 'Chabad: the slipknot and the shin', he: 'קֶשֶׁר חַבַּ״ד', src: '#92, #93',
    loop: 'near', holds: true, extras: { slip: true, shin: true },
    text: 'Ketzot HaShulchan: the strap runs through a small loop inside the knot itself, not a loop on the far side, and that loop opens and closes as you pull. So each morning you actually tie the knot, not just fasten it. Siddur Baal HaTanya (with the Arizal, against the Rema): you may wrap the strap around the titura to hold it, but not around the ketzitzah, and some wrap twice around the titura like a shin. “Vechen anu nohagin.”',
    verdict: 'Tie the knot daily; the shin on the titura holds the yud.',
  },
  {
    id: 'chafetz', group: 'Five ways to keep the yud home', name: '5 · The “Chafetz Chaim knot”', he: 'קֶשֶׁר חָפֵץ חַיִּים', src: 'the video',
    loop: 'near', holds: true, extras: { chafetz: true },
    text: 'An Ashkenaz knot and loop, but when the strap is fed through the ma’abarta it’s folded so a second loop sticks out the far side, like Sefard. The end goes back through the knot and over the titura, locking the yud into the bayit. In the shiur: “nuclear proof”. Two issues: the Chafetz Chaim himself only suggests the thread, not this; and the strap runs over the titura, against the Rema.',
    verdict: 'Nothing moves it; but the Rema, and it isn’t really the Chafetz Chaim’s.',
  },
  {
    id: 'lefty', group: 'A lefty, a righty’s tefillin', name: 'Borrowed: flip it', he: 'אִטֵּר בִּתְפִלִּין שֶׁל יָמִין', src: '#94',
    loop: 'near', holds: false, extras: { flip: true },
    text: 'A lefty borrowing a righty’s pair: on his right arm the knot would face out. Biur Halacha 27:2 (Shvut Yaakov): turn it around, ketzitzah toward the shoulder, ma’abarta toward the hand, so the yud faces the heart: “zeh vadai tov yoter”. Which end faces the shoulder is only custom (Beit Yosef, #94); the yud toward the heart is a din in the Gemara. Best of all: undo the strap and feed it in from the other side. Flipped, the bayit tilts a little off the arm, but better than no tefillin.',
    verdict: 'Yud to the heart wins. Re-threading is better still.',
  },
];
