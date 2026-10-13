"""Build the data for /genealogies: every person and people named in the genealogies of the
Torah and Ruth (Genesis 4-5, 10-11, 22, 25, 29-30, 35-36, 46; Exodus 6; Ruth 4), joined to Israeli
baby-name counts.

Names data: babynamesIL (Aviezer Lifshitz, CC0), a repackaging of Israel's Central Bureau of
Statistics release 391/2025 (names of babies born 1949-2024, by sector and sex; yearly rows only
where a name was given to 5+ babies, totals include every registration).

    git clone --depth 1 https://github.com/aviezerl/babynamesIL /tmp/bn
    python3 scripts/genealogies/build-data.py /tmp/bn/data-raw

Writes src/data/genealogies/people.json and sections.json (small, imported by the page) and
public/data/genealogies/names.json (yearly series, fetched by the page).
"""
import csv, json, os, sys
from collections import defaultdict

SRC = sys.argv[1] if len(sys.argv) > 1 else 'babynamesIL/data-raw'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# id, en, he (pointed, as in the Masoretic text), parasha, ref, line, parent, sex, kind,
# begat (age at the named son), lived (lifespan), born (Anno Mundi), modern spellings to match,
# wiki (English Wikipedia title), note, and optional caveat on homographs.
# The genealogies, in the order they appear. Each figure belongs to the one it is first listed in
# (sec) and to any later list that names it again (also).
SECTIONS = [
    dict(id='adam', en='Adam to Noah', he='מאדם עד נח', ref='Genesis 4–5'),
    dict(id='nations', en='The Table of Nations', he='תולדות בני נח', ref='Genesis 10'),
    dict(id='shem', en='Shem to Abram', he='תולדות שם', ref='Genesis 11:10–32'),
    dict(id='abraham', en='Abraham to Jacob', he='מאברהם עד יעקב', ref='Genesis 16–29'),
    dict(id='nahor', en='The children of Nahor', he='בני נחור', ref='Genesis 22:20–24'),
    dict(id='keturah', en='The sons of Keturah', he='בני קטורה', ref='Genesis 25:1–4'),
    dict(id='ishmael', en='The sons of Ishmael', he='תולדות ישמעאל', ref='Genesis 25:12–16'),
    dict(id='jacob', en='The sons of Jacob', he='בני יעקב', ref='Genesis 29–30, 35:16–26'),
    dict(id='esau', en='The line of Esau', he='תולדות עשו', ref='Genesis 36:1–19'),
    dict(id='egypt', en='The seventy who went down to Egypt', he='שבעים נפש', ref='Genesis 46:8–27'),
    dict(id='levi', en='Reuben, Simeon and Levi', he='ראשי בית אבותם', ref='Exodus 6:14–25'),
    dict(id='david', en='Perez to David', he='תולדות פרץ', ref='Ruth 4:18–22'),
]
SEC_IDS = [x['id'] for x in SECTIONS]

# Weekly portions, by the verse each starts at.
PARASHOT = [('Genesis', 1, 1, 'Bereshit'), ('Genesis', 6, 9, 'Noach'), ('Genesis', 12, 1, 'Lech Lecha'),
            ('Genesis', 18, 1, 'Vayera'), ('Genesis', 23, 1, 'Chayei Sarah'), ('Genesis', 25, 19, 'Toldot'),
            ('Genesis', 28, 10, 'Vayetzei'), ('Genesis', 32, 4, 'Vayishlach'), ('Genesis', 37, 1, 'Vayeshev'),
            ('Genesis', 41, 1, 'Miketz'), ('Genesis', 44, 18, 'Vayigash'), ('Genesis', 47, 28, 'Vayechi'),
            ('Exodus', 1, 1, 'Shemot'), ('Exodus', 6, 2, 'Va’era')]
def parasha_of(ref):
    book, cv = ref.rsplit(' ', 1)
    ch, v = (int(x) for x in cv.split('-')[0].split(':'))
    found = None
    for b, c, vv, name in PARASHOT:
        if b == book and (c, vv) <= (ch, v):
            found = name
    return found or ('Megillat Ruth' if book == 'Ruth' else None)

B, N = 'bereshit', 'noach'   # kept so the calls below read as before; the parasha comes from ref
P = []
CUR = None
def add(id, en, he, par, ref, line, parent, sex='M', kind='person', names=(), wiki=None, note='',
        begat=None, lived=None, born=None, caveat=None, spouse=None, mother=None, also=(), sec=None):
    if sec is None and CUR is None:
        ch = int(ref.split(' ')[1].split(':')[0])
        sec = 'adam' if ch <= 5 else 'nations' if ch == 10 else 'shem'
    P.append(dict(id=id, en=en, he=he, parasha=parasha_of(ref), ref=ref, line=line, parent=parent, sex=sex,
                  kind=kind, names=list(names), wiki=wiki, note=note, begat=begat, lived=lived,
                  born=born, caveat=caveat, spouse=spouse, mother=mother,
                  secs=[sec or CUR] + [x for x in also if x != (sec or CUR)]))

# ---- Bereshit: Adam, Eve and their sons (Gen 4:1-2, 4:25)
add('adam', 'Adam', 'אָדָם', B, 'Genesis 5:1-5', 'adam', None, names=['אדם'], wiki='Adam',
    note='The first human. Lived 930 years, long enough to overlap Lamech, Noah’s father.',
    begat=130, lived=930, born=0, spouse='eve')
add('eve', 'Eve', 'חַוָּה', B, 'Genesis 3:20', 'adam', None, 'F', names=['חוה', 'חווה'], wiki='Eve',
    note='“Mother of all the living” (3:20). Her age is never given.', spouse='adam')
add('cain', 'Cain', 'קַיִן', B, 'Genesis 4:1', 'cain', 'adam', names=['קין'], wiki='Cain and Abel',
    note='Farmer, first murderer, founder of the first city.', mother='eve')
add('abel', 'Abel', 'הֶבֶל', B, 'Genesis 4:2', 'adam', 'adam', names=['הבל'], wiki='Cain and Abel',
    note='Shepherd, killed by his brother. His name means “breath, vapour”.', mother='eve')

# ---- Cain's line (Gen 4:17-22)
add('enoch-c', 'Enoch (son of Cain)', 'חֲנוֹךְ', B, 'Genesis 4:17', 'cain', 'cain', names=['חנוך'],
    wiki='Enoch (son of Cain)', note='Cain named the first city after him.')
add('irad', 'Irad', 'עִירָד', B, 'Genesis 4:18', 'cain', 'enoch-c', names=['עירד'], wiki='Irad',
    note='A name that came back: Israelis have named about 200 boys Irad.')
add('mehujael', 'Mehujael', 'מְחוּיָאֵל', B, 'Genesis 4:18', 'cain', 'irad', names=['מחויאל'],
    wiki='Mehujael', note='Spelled two ways in the same verse: מְחוּיָאֵל and מְחִיָּיאֵל.')
add('methushael', 'Methushael', 'מְתוּשָׁאֵל', B, 'Genesis 4:18', 'cain', 'mehujael', names=['מתושאל'],
    wiki='Methushael', note='Near-twin of Methuselah in Seth’s line.')
add('lamech-c', 'Lamech (son of Methushael)', 'לֶמֶךְ', B, 'Genesis 4:18-24', 'cain', 'methushael',
    names=['למך'], wiki='Lamech (descendant of Cain)',
    note='The first man with two wives. Sings them a boast of revenge.')
add('adah', 'Adah', 'עָדָה', B, 'Genesis 4:19', 'cain', None, 'F', names=['עדה'], wiki='Adah',
    note='With Zillah, the first women named after Eve. Ada is still an Israeli name.', spouse='lamech-c')
add('zillah', 'Zillah', 'צִלָּה', B, 'Genesis 4:19', 'cain', None, 'F', names=['צילה', 'צלה'],
    wiki='Zillah', note='Mother of the first smith. Today’s Tzila.', spouse='lamech-c')
add('jabal', 'Jabal', 'יָבָל', B, 'Genesis 4:20', 'cain', 'lamech-c', names=['יבל'], wiki='Jabal (Bible)',
    note='Ancestor of herders who live in tents.', mother='adah')
add('jubal', 'Jubal', 'יוּבָל', B, 'Genesis 4:21', 'cain', 'lamech-c', names=['יובל'], wiki='Jubal (Bible)',
    note='Ancestor of all who play lyre and pipe. As Yuval, the most-given name in these chapters.',
    mother='adah')
add('tubal-cain', 'Tubal-cain', 'תּוּבַל קַיִן', B, 'Genesis 4:22', 'cain', 'lamech-c', names=['תובל'],
    wiki='Tubal-cain', note='Forger of copper and iron tools. Israelis drop the “Cain”: Tuval.',
    mother='zillah')
add('naamah', 'Naamah', 'נַעֲמָה', B, 'Genesis 4:22', 'cain', 'lamech-c', 'F', names=['נעמה'],
    wiki='Naamah (Genesis)', note='Sister of Tubal-cain. Given in both Jewish and Muslim families today.',
    mother='zillah')

# ---- Seth's line (Gen 5)
add('seth', 'Seth', 'שֵׁת', B, 'Genesis 5:3-8', 'seth', 'adam', names=['שת'], wiki='Seth',
    note='“God has provided me another offspring in place of Abel” (4:25).', begat=105, lived=912,
    born=130, mother='eve')
add('enosh', 'Enosh', 'אֱנוֹשׁ', B, 'Genesis 5:6-11', 'seth', 'seth', names=['אנוש'], wiki='Enos (biblical figure)',
    note='In his days people “began to invoke the name of God” (4:26). His name means “human”.',
    begat=90, lived=905, born=235)
add('kenan', 'Kenan', 'קֵינָן', B, 'Genesis 5:9-14', 'seth', 'enosh', names=['קינן'], wiki='Kenan',
    note='Kinan is given in Jewish, Muslim and Druze families alike.', begat=70, lived=910, born=325)
add('mahalalel', 'Mahalalel', 'מַהֲלַלְאֵל', B, 'Genesis 5:12-17', 'seth', 'kenan', names=['מהללאל'],
    wiki='Mahalalel', note='“Praise of God”.', begat=65, lived=895, born=395)
add('jared', 'Jared', 'יֶרֶד', B, 'Genesis 5:15-20', 'seth', 'mahalalel', names=['ירד'], wiki='Jared (biblical figure)',
    note='Yered, “descent”. A hit in English, rare in Hebrew.', begat=162, lived=962, born=460)
add('enoch', 'Enoch', 'חֲנוֹךְ', B, 'Genesis 5:18-24', 'seth', 'jared', names=['חנוך'], wiki='Enoch',
    note='“Walked with God; then he was no more, for God took him.” 365 years, one per day of the solar year.',
    begat=65, lived=365, born=622)
add('methuselah', 'Methuselah', 'מְתוּשֶׁלַח', B, 'Genesis 5:21-27', 'seth', 'enoch', names=['מתושלח'],
    wiki='Methuselah', note='969 years, the longest life in the Bible. By the dates, he dies in the year of the Flood.',
    begat=187, lived=969, born=687)
add('lamech', 'Lamech', 'לֶמֶךְ', B, 'Genesis 5:25-31', 'seth', 'methuselah', names=['למך'],
    wiki='Lamech (father of Noah)', note='Lived 777 years. Names his son for comfort.', begat=182,
    lived=777, born=874)
add('noah', 'Noah', 'נֹחַ', B, 'Genesis 5:28-32', 'seth', 'lamech', names=['נח', 'נוח'], wiki='Noah',
    note='“This one will provide us relief.” 950 years (9:29). In Muslim families the name is Nuh.',
    begat=500, lived=950, born=1056)

# ---- Noach: Noah's sons (Gen 10:1, 11:10)
add('shem', 'Shem', 'שֵׁם', N, 'Genesis 11:10-11', 'shem', 'noah', names=['שם'], wiki='Shem',
    note='Literally “name”. Father of the Semites; outlives Abraham by the dates.', begat=100, lived=600,
    born=1558)
add('ham', 'Ham', 'חָם', N, 'Genesis 10:6', 'ham', 'noah', names=['חם'], wiki='Ham (son of Noah)',
    note='Father of Cush, Egypt, Put and Canaan.')
add('japheth', 'Japheth', 'יֶפֶת', N, 'Genesis 10:2', 'japheth', 'noah', names=['יפת'],
    wiki='Japheth', note='“May God enlarge Japheth” (9:27). Father of the maritime nations.')

# ---- Sons of Japheth (10:2-4)
for id, en, he, nm, w, nt in [
    ('gomer', 'Gomer', 'גֹּמֶר', ['גומר'], 'Gomer', 'Linked with the Cimmerians.'),
    ('magog', 'Magog', 'מָגוֹג', ['מגוג'], 'Magog (Bible)', 'Later the land of Gog, in Ezekiel’s war at the end of days.'),
    ('madai', 'Madai', 'מָדַי', ['מדי'], 'Madai', 'The Medes.'),
    ('javan', 'Javan', 'יָוָן', ['יון'], 'Javan', 'Greece: Yavan is still the Hebrew for Greece.'),
    ('tubal', 'Tubal', 'תֻבָל', ['תובל'], 'Tubal', 'Shares a spelling with Tubal-cain’s Tuval.'),
    ('meshech', 'Meshech', 'מֶשֶׁךְ', ['משך'], 'Meshech', 'Paired with Tubal across the prophets.'),
    ('tiras', 'Tiras', 'תִירָס', ['תירס'], 'Tiras', 'In modern Hebrew, תירס means corn.'),
]:
    add(id, en, he, N, 'Genesis 10:2', 'japheth', 'japheth', kind='people', names=nm, wiki=w, note=nt,
        caveat='Madai is spelled like the modern name Maddie (מדי), so most of these births are Maddies.' if id == 'madai'
        else 'The 9 babies spelled גומר are all in Muslim families: a different, Arabic name.' if id == 'gomer'
        else 'Tuval counts are shared with Tubal-cain.' if id == 'tubal' else None)
for id, en, he, nm, w, nt in [
    ('ashkenaz', 'Ashkenaz', 'אַשְׁכְּנַז', ['אשכנז'], 'Ashkenaz', 'Medieval Jews read it as Germany: hence Ashkenazim.'),
    ('riphath', 'Riphath', 'רִיפַת', ['ריפת'], 'Riphath', 'Five Israeli boys have carried it.'),
    ('togarmah', 'Togarmah', 'תֹגַרְמָה', ['תוגרמה'], 'Togarmah', 'Read by medieval writers as the Turkic peoples.'),
]:
    add(id, en, he, N, 'Genesis 10:3', 'japheth', 'gomer', kind='people', names=nm, wiki=w, note=nt)
for id, en, he, nm, w, nt in [
    ('elishah', 'Elishah', 'אֱלִישָׁה', ['אלישה'], 'Elishah', 'Not the prophet Elisha (אלישע), though Israeli parents use both.'),
    ('tarshish', 'Tarshish', 'תַרְשִׁישׁ', ['תרשיש'], 'Tarshish', 'The far port Jonah tried to flee to.'),
    ('kittim', 'Kittim', 'כִּתִּים', ['כתים'], 'Kittim', 'Cyprus, later a code name for Rome in the Dead Sea Scrolls.'),
    ('dodanim', 'Dodanim', 'דֹדָנִים', ['דודנים'], 'Dodanim', 'Rodanim (Rhodes) in Chronicles.'),
]:
    add(id, en, he, N, 'Genesis 10:4', 'japheth', 'javan', kind='people', names=nm, wiki=w, note=nt)

# ---- Sons of Ham (10:6-20)
for id, en, he, nm, w, nt in [
    ('cush', 'Cush', 'כּוּשׁ', ['כוש'], 'Cush (Bible)', 'Nubia and Ethiopia.'),
    ('mizraim', 'Mizraim', 'מִצְרַיִם', ['מצרים'], 'Mizraim', 'Egypt, still Mitzrayim in Hebrew.'),
    ('put', 'Put', 'פוּט', ['פוט'], 'Phut', 'Libya, most likely.'),
    ('canaan', 'Canaan', 'כְּנַעַן', ['כנען'], 'Canaan (son of Ham)', 'The land’s first namesake. A few dozen Israeli babies are Kna’an.'),
]:
    add(id, en, he, N, 'Genesis 10:6', 'ham', 'ham', kind='people', names=nm, wiki=w, note=nt)
for id, en, he, nm, w, nt, cv in [
    ('seba', 'Seba', 'סְבָא', ['סבא'], 'Seba (biblical figure)', 'A southern people, famed for gifts (Ps 72:10).',
     'Spelled like the Arabic girls’ name Saba (סבא): almost all these births are Sabas, not Sebas.'),
    ('havilah-c', 'Havilah (son of Cush)', 'חֲוִילָה', ['חוילה'], 'Havilah', 'A land of gold, named back in Eden (2:11).', None),
    ('sabtah', 'Sabtah', 'סַבְתָּה', ['סבתה'], 'Sabtah', 'Southern Arabia.', 'The 6 babies spelled סבתה are in Muslim families: likely a different name.'),
    ('raamah', 'Raamah', 'רַעְמָה', ['רעמה'], 'Raamah', 'Father of Sheba and Dedan.', None),
    ('sabteca', 'Sabteca', 'סַבְתְּכָא', ['סבתכא'], 'Sabteca', 'Southern Arabia.', None),
]:
    add(id, en, he, N, 'Genesis 10:7', 'ham', 'cush', kind='people', names=nm, wiki=w, note=nt, caveat=cv)
add('sheba-r', 'Sheba (son of Raamah)', 'שְׁבָא', N, 'Genesis 10:7', 'ham', 'raamah', kind='people',
    names=['שבא'], wiki='Sheba', note='The Sheba of the queen who visits Solomon.',
    caveat='Counts for שבא are shared with Joktan’s son Sheba.')
add('dedan', 'Dedan', 'דְּדָן', N, 'Genesis 10:7', 'ham', 'raamah', kind='people', names=['דדן'],
    wiki='Dedan', note='An oasis trading town in north-west Arabia.')
add('nimrod', 'Nimrod', 'נִמְרֹד', N, 'Genesis 10:8-12', 'ham', 'cush', names=['נמרוד'], wiki='Nimrod',
    note='“A mighty hunter before God”, builder of Babel and Nineveh. A rebel in the Midrash, a popular Israeli name.')
for id, en, he, nm, w in [
    ('ludim', 'Ludim', 'לוּדִים', ['לודים'], 'Ludim'), ('anamim', 'Anamim', 'עֲנָמִים', ['ענמים'], 'Anamim'),
    ('lehabim', 'Lehabim', 'לְהָבִים', ['להבים'], 'Lehabim'), ('naphtuhim', 'Naphtuhim', 'נַפְתֻּחִים', ['נפתחים'], 'Naphtuhim'),
    ('pathrusim', 'Pathrusim', 'פַּתְרֻסִים', ['פתרוסים'], 'Pathrusim'),
    ('casluhim', 'Casluhim', 'כַּסְלֻחִים', ['כסלוחים'], 'Casluhim'),
    ('caphtorim', 'Caphtorim', 'כַּפְתֹּרִים', ['כפתורים'], 'Caphtor'),
]:
    add(id, en, he, N, 'Genesis 10:13-14', 'ham', 'mizraim', kind='people', names=nm, wiki=w,
        note='The Philistines came from here.' if id == 'casluhim' else 'Crete, home of the Philistines in Amos 9:7.' if id == 'caphtorim' else 'One of Egypt’s peoples.')
add('sidon', 'Sidon', 'צִידֹן', N, 'Genesis 10:15', 'ham', 'canaan', kind='people', names=['צידון'],
    wiki='Sidon', note='Canaan’s firstborn: the Phoenician port city.')
add('heth', 'Heth', 'חֵת', N, 'Genesis 10:15', 'ham', 'canaan', kind='people', names=['חת'], wiki='Heth',
    note='Ancestor of the Hittites, who sell Abraham the cave of Machpelah.')
for id, en, he, w in [
    ('jebusite', 'Jebusite', 'הַיְבוּסִי', 'Jebusites'), ('amorite', 'Amorite', 'הָאֱמֹרִי', 'Amorites'),
    ('girgashite', 'Girgashite', 'הַגִּרְגָּשִׁי', 'Girgashites'), ('hivite', 'Hivite', 'הַחִוִּי', 'Hivites'),
    ('arkite', 'Arkite', 'הַעַרְקִי', 'Arkite'), ('sinite', 'Sinite', 'הַסִּינִי', 'Sinite'),
    ('arvadite', 'Arvadite', 'הָאַרְוָדִי', 'Arwad'), ('zemarite', 'Zemarite', 'הַצְּמָרִי', 'Zemarites'),
    ('hamathite', 'Hamathite', 'הַחֲמָתִי', 'Hama'),
]:
    add(id, en, he, N, 'Genesis 10:16-18', 'ham', 'canaan', kind='people', names=[], wiki=w,
        note='Held Jerusalem until David.' if id == 'jebusite' else 'A Canaanite clan.')

# ---- Sons of Shem (10:21-31)
for id, en, he, nm, w, nt in [
    ('elam', 'Elam', 'עֵילָם', ['עילם'], 'Elam', 'South-west Iran. Eilam is a living Israeli boys’ name.'),
    ('asshur', 'Asshur', 'אַשּׁוּר', ['אשור'], 'Ashur (Bible)', 'Assyria.'),
    ('arpachshad', 'Arpachshad', 'אַרְפַּכְשַׁד', ['ארפכשד'], 'Arpachshad', 'Born two years after the Flood.'),
    ('lud', 'Lud', 'לוּד', ['לוד'], 'Lud', 'Lydia, perhaps.'),
    ('aram', 'Aram', 'אֲרָם', ['ארם'], 'Aram (biblical figure)', 'Aramaeans. Given in Jewish, Muslim, Christian and Druze families.'),
]:
    is_line = id == 'arpachshad'
    add(id, en, he, N, 'Genesis 10:22', 'shem', 'shem', kind='person' if is_line else 'people', names=nm,
        wiki=w, note=nt, begat=35 if is_line else None, lived=438 if is_line else None,
        born=1658 if is_line else None)
for id, en, he, nm, w in [('uz', 'Uz', 'עוּץ', ['עוץ'], 'Uz (son of Aram)'), ('hul', 'Hul', 'חוּל', ['חול'], 'Hul'),
                         ('gether', 'Gether', 'גֶתֶר', ['גתר'], 'Gether'), ('mash', 'Mash', 'מַשׁ', ['מש'], 'Mash (biblical figure)')]:
    add(id, en, he, N, 'Genesis 10:23', 'shem', 'aram', kind='people', names=nm, wiki=w,
        note='Job’s homeland is “the land of Uz”.' if id == 'uz' else 'A son of Aram.')
add('shelah', 'Shelah', 'שֶׁלַח', N, 'Genesis 11:12-15', 'shem', 'arpachshad', names=['שלח'],
    wiki='Shelah (son of Arpachshad)', note='Lived 433 years.', begat=30, lived=433, born=1693)
add('eber', 'Eber', 'עֵבֶר', N, 'Genesis 11:14-17', 'shem', 'shelah', names=['עבר'], wiki='Eber',
    note='Eponym of the Hebrews (עברים). In the Midrash, Jacob studies in his academy.', begat=34,
    lived=464, born=1723)
add('peleg', 'Peleg', 'פֶּלֶג', N, 'Genesis 11:16-19', 'shem', 'eber', names=['פלג'], wiki='Peleg',
    note='“In his days the earth was divided.” In rabbinic chronology, Babel falls in the year he dies.',
    begat=30, lived=239, born=1757)
add('joktan', 'Joktan', 'יָקְטָן', N, 'Genesis 10:25-29', 'shem', 'eber', kind='person', names=['יקטן'],
    wiki='Joktan', note='Father of thirteen southern Arabian peoples.')
for id, en, he, nm, w, nt, cv in [
    ('almodad', 'Almodad', 'אַלְמוֹדָד', ['אלמודד'], 'Almodad', 'A son of Joktan.', None),
    ('sheleph', 'Sheleph', 'שֶׁלֶף', ['שלף'], 'Sheleph', 'Fifteen Israeli boys are Shelef.', None),
    ('hazarmaveth', 'Hazarmaveth', 'חֲצַרְמָוֶת', ['חצרמות'], 'Hazarmaveth', 'Hadhramaut, in Yemen: “court of death”.', None),
    ('jerah', 'Jerah', 'יֶרַח', ['ירח'], 'Jerah', 'Means “moon”.', None),
    ('hadoram', 'Hadoram', 'הֲדוֹרָם', ['הדורם'], 'Hadoram', 'A son of Joktan.', None),
    ('uzal', 'Uzal', 'אוּזָל', ['אוזל'], 'Uzal', 'Sana’a, by tradition.', None),
    ('diklah', 'Diklah', 'דִּקְלָה', ['דקלה'], 'Diklah', '“Palm tree.” A son in Genesis, a daughter in Israel: about 2,000 girls.', None),
    ('obal', 'Obal', 'עוֹבָל', ['עובל'], 'Obal', 'Ebal in Chronicles.', None),
    ('abimael', 'Abimael', 'אֲבִימָאֵל', ['אבימאל'], 'Abimael', '“My father is God.”', None),
    ('sheba-j', 'Sheba (son of Joktan)', 'שְׁבָא', ['שבא'], 'Sheba', 'A second Sheba, in Shem’s line.', 'Counts for שבא are shared with Raamah’s son Sheba.'),
    ('ophir', 'Ophir', 'אוֹפִיר', ['אופיר'], 'Ophir', 'The land of gold. As Ofir, given to over 21,000 Israeli boys and girls.', None),
    ('havilah-j', 'Havilah (son of Joktan)', 'חֲוִילָה', ['חוילה'], 'Havilah', 'A second Havilah, in Shem’s line.', None),
    ('jobab', 'Jobab', 'יוֹבָב', ['יובב'], 'Jobab', 'Sixty-one Israeli boys are Yovav.', None),
]:
    add(id, en, he, N, 'Genesis 10:26-29', 'shem', 'joktan', kind='people', names=nm, wiki=w, note=nt, caveat=cv)

# ---- Shem to Abram (11:18-32)
add('reu', 'Reu', 'רְעוּ', N, 'Genesis 11:18-21', 'shem', 'peleg', names=['רעו'], wiki='Reu',
    note='Lifespans keep shrinking: 239 years.', begat=32, lived=239, born=1787)
add('serug', 'Serug', 'שְׂרוּג', N, 'Genesis 11:20-23', 'shem', 'reu', names=['שרוג'], wiki='Serug',
    note='Lifespans keep shrinking: 230 years.', begat=30, lived=230, born=1819,
    caveat='The 13 babies spelled שרוג are girls in Muslim families: almost certainly the Arabic name Shuruq.')
add('nahor', 'Nahor', 'נָחוֹר', N, 'Genesis 11:22-25', 'shem', 'serug', names=['נחור'], wiki='Nahor, son of Serug',
    note='The shortest life on the list: 148 years.', begat=29, lived=148, born=1849)
add('terah', 'Terah', 'תֶּרַח', N, 'Genesis 11:24-32', 'shem', 'nahor', names=['תרח'], wiki='Terah',
    note='Idol-maker in the Midrash. Leaves Ur for Canaan and stops at Haran.', begat=70, lived=205, born=1878)
add('abram', 'Abram', 'אַבְרָם', N, 'Genesis 11:26-31', 'shem', 'terah', names=['אברם'], wiki='Abraham',
    note='Born 1948 by the reckoning from Creation. Renamed Abraham (אברהם, 70,000+ Israeli boys) in Genesis 17.',
    lived=175, born=1948, spouse='sarai')
add('nahor-2', 'Nahor (son of Terah)', 'נָחוֹר', N, 'Genesis 11:26-29', 'shem', 'terah', names=['נחור'],
    wiki='Nahor, son of Terah', note='Grandfather of Rebecca.', spouse='milcah')
add('haran', 'Haran', 'הָרָן', N, 'Genesis 11:26-28', 'shem', 'terah', names=['הרן'], wiki='Haran (biblical figure)',
    note='Dies in Ur “in the lifetime of his father”. In the Midrash, in Nimrod’s furnace.')
add('lot', 'Lot', 'לוֹט', N, 'Genesis 11:27-31', 'shem', 'haran', names=['לוט'], wiki='Lot (biblical person)',
    note='Goes with Abram to Canaan.')
add('sarai', 'Sarai', 'שָׂרָי', N, 'Genesis 11:29-31', 'shem', None, 'F', names=['שרי'], wiki='Sarah',
    note='“Sarai was infertile.” Becomes Sarah (שרה, 65,000+ Israeli girls).', spouse='abram',
    caveat='שרי is also read Sheri: not every one of these babies is a Sarai.')
add('milcah', 'Milcah', 'מִלְכָּה', N, 'Genesis 11:29', 'shem', 'haran', 'F', names=['מלכה'], wiki='Milcah',
    note='Daughter of Haran, wife of Nahor. Malka: almost 20,000 Israeli girls.', spouse='nahor-2')
add('iscah', 'Iscah', 'יִסְכָּה', N, 'Genesis 11:29', 'shem', 'haran', 'F', names=['יסכה'], wiki='Iscah',
    note='Mentioned once. Rashi identifies her with Sarai. Yiska: 3,500 Israeli girls.')

# Figures named again in a later list.
EXTRA = {'noah': ['nations'], 'shem': ['nations'], 'arpachshad': ['shem'], 'shelah': ['nations'],
         'eber': ['nations'], 'peleg': ['nations'], 'abram': ['abraham', 'keturah'],
         'sarai': ['abraham'], 'nahor-2': ['nahor'], 'milcah': ['nahor']}
for p in P:
    p['secs'] += [x for x in EXTRA.get(p['id'], []) if x not in p['secs']]
by0 = {p['id']: p for p in P}
by0['abram']['begat'] = 100
by0['sarai'].update(born=1958, lived=127)   # ten years younger than Abram (17:17); 127 years (23:1)

# Spellings Israeli families use for the same figure in Arabic (Ibrahim, Musa…): counted with the
# Hebrew, and named in the panel.
K, I = 'kin', 'israel'

# ---- Abraham to Jacob: the births that join the lists (Genesis 16-29)
CUR = 'abraham'
add('hagar', 'Hagar', 'הָגָר', N, 'Genesis 16:1', K, None, 'F', names=['הגר', "האג'ר", 'האגר', "הג'ר", 'הגאר'],
    wiki='Hagar', note='Sarai’s Egyptian maid, mother of Ishmael. Hajar, in Muslim families, is the same woman.',
    spouse='abram')
add('ishmael', 'Ishmael', 'יִשְׁמָעֵאל', N, 'Genesis 16:15', K, 'abram', names=['ישמעאל', 'אסמעיל', 'יסמעיל', 'סמאעיל', 'סמעיל'],
    wiki='Ishmael', note='Born when Abram was 86. Lived 137 years. In Arabic, Isma‘il.', mother='hagar',
    born=2034, lived=137, also=['ishmael'])
add('isaac', 'Isaac', 'יִצְחָק', N, 'Genesis 21:3', I, 'abram', names=['יצחק', 'איסחאק', 'איסחק', 'יסחק'],
    wiki='Isaac', note='Born when Abraham was 100: “laughter”. Lived 180 years, five more than Abraham.',
    mother='sarai', born=2048, lived=180, begat=60, spouse='rebekah')
CUR = 'nahor'
add('reumah', 'Reumah', 'רְאוּמָה', N, 'Genesis 22:24', K, None, 'F', names=['ראומה'],
    note='Nahor’s concubine. Reuma is a living Israeli name: about 200 girls.', spouse='nahor-2')
for id, en, he, nm, w, nt in [
    ('uz-n', 'Uz (son of Nahor)', 'עוּץ', ['עוץ'], None, 'Nahor’s firstborn. The land of Uz is Job’s home.'),
    ('buz', 'Buz', 'בּוּז', ['בוז'], None, 'Elihu, the young man who answers Job, is “the Buzite”.'),
    ('kemuel', 'Kemuel', 'קְמוּאֵל', ['קמואל'], None, '“The father of Aram.”'),
    ('chesed', 'Chesed', 'כֶּשֶׂד', ['כשד'], None, 'Read as the father of the Kasdim, the Chaldeans.'),
    ('hazo', 'Hazo', 'חֲזוֹ', ['חזו'], None, 'A son of Nahor and Milcah.'),
    ('pildash', 'Pildash', 'פִּלְדָּשׁ', ['פלדש'], None, 'A son of Nahor and Milcah.'),
    ('jidlaph', 'Jidlaph', 'יִדְלָף', ['ידלף'], None, 'A son of Nahor and Milcah.'),
    ('bethuel', 'Bethuel', 'בְּתוּאֵל', ['בתואל'], 'Bethuel', 'Father of Rebekah and Laban.'),
]:
    add(id, en, he, N, 'Genesis 22:21' if id in ('uz-n', 'buz', 'kemuel') else 'Genesis 22:22', K, 'nahor-2',
        names=nm, wiki=w, note=nt, mother='milcah')
add('rebekah', 'Rebekah', 'רִבְקָה', N, 'Genesis 22:23', K, 'bethuel', 'F', names=['רבקה'], wiki='Rebecca',
    note='The only granddaughter named in the list, and the reason it is there: Isaac’s wife. Rivka: 42,000 Israeli girls.',
    spouse='isaac', also=['abraham'])
for id, en, he, nm in [('tebah', 'Tebah', 'טֶבַח', ['טבח']), ('gaham', 'Gaham', 'גַּחַם', ['גחם']),
                       ('tahash', 'Tahash', 'תַּחַשׁ', ['תחש'])]:
    add(id, en, he, N, 'Genesis 22:24', K, 'nahor-2', names=nm, mother='reumah',
        note='Tahash is also the hide that covered the Tabernacle.' if id == 'tahash' else 'A son of Nahor and Reumah.',
        caveat='טבח is also the Hebrew for “cook”.' if id == 'tebah' else None)
add('maacah', 'Maacah', 'מַעֲכָה', N, 'Genesis 22:24', K, 'nahor-2', 'F', names=['מעכה'], mother='reumah',
    note='The one daughter in Nahor’s list. Also the name of David’s wife, Absalom’s mother.')

CUR = 'abraham'
add('laban', 'Laban', 'לָבָן', N, 'Genesis 24:29', K, 'bethuel', names=['לבן'], wiki='Laban (Bible)',
    note='Rebekah’s brother, Jacob’s uncle and father-in-law. “White”. About 75 Israeli boys.')
add('esau', 'Esau', 'עֵשָׂו', N, 'Genesis 25:25', K, 'isaac', names=['עשו'], wiki='Esau',
    note='The elder twin, “red and hairy”. Sells his birthright for lentil stew.', mother='rebekah',
    born=2108, also=['esau'])
add('jacob', 'Jacob', 'יַעֲקֹב', N, 'Genesis 25:26', I, 'isaac', names=['יעקב', 'יעקוב'], wiki='Jacob',
    note='Born holding Esau’s heel. Renamed Israel. Lived 147 years. Ya‘qub in Arabic.', mother='rebekah',
    born=2108, lived=147, also=['jacob', 'egypt'])

# ---- Keturah (Genesis 25:1-4)
CUR = 'keturah'
add('keturah', 'Keturah', 'קְטוּרָה', N, 'Genesis 25:1', K, None, 'F', names=['קטורה'], wiki='Keturah',
    note='Abraham’s wife after Sarah. In the Midrash she is Hagar. 21 Israeli girls.', spouse='abram')
for id, en, he, nm, w, nt in [
    ('zimran', 'Zimran', 'זִמְרָן', ['זמרן'], None, 'From the root for song, זמר.'),
    ('jokshan', 'Jokshan', 'יָקְשָׁן', ['יקשן'], None, 'Father of a second Sheba and Dedan.'),
    ('medan', 'Medan', 'מְדָן', ['מדן'], None, 'Next to Midian in the list; ten Israeli boys are Medan.'),
    ('midian', 'Midian', 'מִדְיָן', ['מדין', 'מדיאן'], 'Midian', 'Ancestor of Moses’ in-laws. Madyan, in Muslim families, is the Midian of the Quran.'),
    ('ishbak', 'Ishbak', 'יִשְׁבָּק', ['ישבק'], None, 'A son of Abraham and Keturah.'),
    ('shuah', 'Shuah', 'שׁוּחַ', ['שוח'], None, 'Job’s friend Bildad is “the Shuhite”.'),
]:
    add(id, en, he, N, 'Genesis 25:2', K, 'abram', names=nm, wiki=w, note=nt, mother='keturah')
add('sheba-k', 'Sheba (son of Jokshan)', 'שְׁבָא', N, 'Genesis 25:3', K, 'jokshan', names=['שבא'],
    note='A third Sheba.', caveat='Counts for שבא are shared with the other two Shebas.')
add('dedan-k', 'Dedan (son of Jokshan)', 'דְּדָן', N, 'Genesis 25:3', K, 'jokshan', names=['דדן'],
    note='A second Dedan, like the one in the Table of Nations.')
for id, en, he, w in [('asshurim', 'Asshurim', 'אַשּׁוּרִם', None), ('letushim', 'Letushim', 'לְטוּשִׁם', None),
                      ('leummim', 'Leummim', 'לְאֻמִּים', None)]:
    add(id, en, he, N, 'Genesis 25:3', K, 'dedan-k', kind='people', names=[], wiki=w,
        note='A people descended from Dedan. Leummim also just means “nations”.' if id == 'leummim' else 'A people descended from Dedan.')
for id, en, he, nm, nt in [
    ('ephah', 'Ephah', 'עֵיפָה', ['עיפה'], 'Isaiah’s “camels of Midian and Ephah” (60:6).'),
    ('epher', 'Epher', 'עֵפֶר', ['עפר'], '“Dust.” The modern Ofer is spelled עופר.'),
    ('hanoch-m', 'Hanoch (son of Midian)', 'חֲנֹךְ', ['חנוך'], 'A third Enoch.'),
    ('abida', 'Abida', 'אֲבִידָע', ['אבידע'], '“My father knows.” 34 Israeli boys.'),
    ('eldaah', 'Eldaah', 'אֶלְדָּעָה', ['אלדעה'], '“God has known.”'),
]:
    add(id, en, he, N, 'Genesis 25:4', K, 'midian', names=nm, note=nt,
        caveat='Counts for חנוך are shared with the other Enochs.' if id == 'hanoch-m' else None)

# ---- Ishmael (Genesis 25:12-16)
CUR = 'ishmael'
for i, (id, en, he, nm, w, nt, cv) in enumerate([
    ('nebaioth', 'Nebaioth', 'נְבָיֹת', ['נביות'], 'Nebaioth', 'Ishmael’s firstborn; Esau marries his sister.', None),
    ('kedar', 'Kedar', 'קֵדָר', ['קדר'], 'Kedar', 'The black tents of Kedar (Song 1:5).',
     'Almost all the babies spelled קדר are Muslim girls: a different Arabic name.'),
    ('adbeel', 'Adbeel', 'אַדְבְּאֵל', ['אדבאל'], None, 'A son of Ishmael.', None),
    ('mibsam', 'Mibsam', 'מִבְשָׂם', ['מבשם'], None, 'From בשם, “perfume”.', None),
    ('mishma', 'Mishma', 'מִשְׁמָע', ['משמע'], None, '“Hearing”, like Ishmael himself.', None),
    ('dumah', 'Dumah', 'דּוּמָה', ['דומה'], None, '“Silence.” Dumat al-Jandal, in Arabia.', None),
    ('massa', 'Massa', 'מַשָּׂא', ['משא'], None, 'The home, perhaps, of King Lemuel (Proverbs 31:1).', None),
    ('hadad', 'Hadad', 'חֲדַד', ['חדד'], None, 'A son of Ishmael.', None),
    ('tema', 'Tema', 'תֵימָא', ['תימא'], None, 'The oasis of Tayma, in Arabia.', None),
    ('jetur', 'Jetur', 'יְטוּר', ['יטור'], None, 'The Ituraeans.', None),
    ('naphish', 'Naphish', 'נָפִישׁ', ['נפיש'], None, 'A son of Ishmael.', None),
    ('kedmah', 'Kedmah', 'קֵדְמָה', ['קדמה'], None, '“Eastward”, the last of the twelve chieftains.', None),
]):
    add(id, en, he, N, 'Genesis 25:13' if i < 4 else 'Genesis 25:14' if i < 7 else 'Genesis 25:15', K, 'ishmael',
        names=nm, wiki=w, note=nt, caveat=cv)

# ---- Jacob's wives and children (Genesis 29:16-30:24, 35:16-26)
CUR = 'jacob'
add('leah', 'Leah', 'לֵאָה', N, 'Genesis 29:16', K, 'laban', 'F', names=['לאה'], wiki='Leah',
    note='Laban’s elder daughter. Mother of six tribes. 28,000 Israeli girls.', spouse='jacob', also=['abraham'])
add('rachel', 'Rachel', 'רָחֵל', N, 'Genesis 29:16', K, 'laban', 'F', names=['רחל'], wiki='Rachel',
    note='Jacob’s beloved. Dies giving birth to Benjamin on the road to Bethlehem. 59,000 Israeli girls.',
    spouse='jacob', also=['abraham'])
add('bilhah', 'Bilhah', 'בִּלְהָה', N, 'Genesis 29:29', I, None, 'F', names=['בלהה'], wiki='Bilhah',
    note='Rachel’s maid, mother of Dan and Naphtali. Nearly 1,000 Israeli girls.', spouse='jacob')
add('zilpah', 'Zilpah', 'זִלְפָּה', N, 'Genesis 29:24', I, None, 'F', names=['זלפה'], wiki='Zilpah',
    note='Leah’s maid, mother of Gad and Asher.', spouse='jacob')
for id, en, he, nm, w, mom, ref, nt in [
    ('reuben', 'Reuben', 'רְאוּבֵן', ['ראובן'], 'Reuben (son of Jacob)', 'leah', 'Genesis 29:32', '“See, a son.” The firstborn.'),
    ('simeon', 'Simeon', 'שִׁמְעוֹן', ['שמעון'], 'Simeon (son of Jacob)', 'leah', 'Genesis 29:33', '“God has heard.” 36,000 Israeli boys.'),
    ('levi', 'Levi', 'לֵוִי', ['לוי'], 'Levi', 'leah', 'Genesis 29:34', 'Ancestor of the priests and Levites. Lived 137 years (Exodus 6:16).'),
    ('judah', 'Judah', 'יְהוּדָה', ['יהודה'], 'Judah (son of Jacob)', 'leah', 'Genesis 29:35', '“This time I will praise.” The Jews are named after him.'),
    ('dan', 'Dan', 'דָּן', ['דן'], 'Dan (son of Jacob)', 'bilhah', 'Genesis 30:6', '“God has judged me.” Among the top Israeli boys’ names for decades.'),
    ('naphtali', 'Naphtali', 'נַפְתָּלִי', ['נפתלי'], 'Naphtali', 'bilhah', 'Genesis 30:8', '“Wrestlings of God.”'),
    ('gad', 'Gad', 'גָּד', ['גד'], 'Gad (son of Jacob)', 'zilpah', 'Genesis 30:11', '“Good fortune.”'),
    ('asher', 'Asher', 'אָשֵׁר', ['אשר'], 'Asher', 'zilpah', 'Genesis 30:13', '“Happy.”'),
    ('issachar', 'Issachar', 'יִשָּׂשכָר', ['יששכר'], 'Issachar', 'leah', 'Genesis 30:18', '“There is a reward.” Spelled with a silent second ש.'),
    ('zebulun', 'Zebulun', 'זְבֻלוּן', ['זבולון'], 'Zebulun', 'leah', 'Genesis 30:20', 'The seafaring tribe.'),
    ('dinah', 'Dinah', 'דִּינָה', ['דינה'], 'Dinah', 'leah', 'Genesis 30:21', 'Jacob’s only named daughter. 11,000 Israeli girls.'),
    ('joseph', 'Joseph', 'יוֹסֵף', ['יוסף', 'יוסוף'], 'Joseph (Genesis)', 'rachel', 'Genesis 30:24', '“May God add.” Lived 110 years. Yusuf in Arabic: one of the few names given in every group.'),
    ('benjamin', 'Benjamin', 'בִּנְיָמִן', ['בנימין'], 'Benjamin', 'rachel', 'Genesis 35:18', 'Rachel named him Ben-oni, “son of my sorrow”; Jacob renamed him.'),
]:
    sx = 'F' if id == 'dinah' else 'M'
    extra = dict(born=2195, lived=137) if id == 'levi' else dict(born=2199, lived=110) if id == 'joseph' else {}
    add(id, en, he, N, ref, I, 'jacob', sx, names=nm, wiki=w, note=nt, mother=mom, also=['egypt'] + (['levi'] if id in ('reuben', 'simeon', 'levi') else []), **extra)

# ---- Esau (Genesis 36:1-19)
CUR = 'esau'
add('adah-e', 'Adah (wife of Esau)', 'עָדָה', N, 'Genesis 36:2', K, None, 'F', names=['עדה'],
    note='Daughter of Elon the Hittite. A second Adah, after Lamech’s wife.', spouse='esau',
    caveat='Counts for עדה are shared with Lamech’s wife Adah.')
add('oholibamah', 'Oholibamah', 'אׇהֳלִיבָמָה', N, 'Genesis 36:2', K, None, 'F', names=['אהליבמה'],
    note='Daughter of Anah, granddaughter of Zibeon the Hivite.', spouse='esau')
add('basemath', 'Basemath', 'בָּשְׂמַת', N, 'Genesis 36:3', K, 'ishmael', 'F', names=['בשמת', 'בוסמת'],
    note='Ishmael’s daughter: the two rejected brothers’ lines marry. As Bosmat, about 400 Israeli girls.', spouse='esau')
for id, en, he, nm, w, mom, nt in [
    ('eliphaz', 'Eliphaz', 'אֱלִיפַז', ['אליפז'], None, 'adah-e', 'Esau’s firstborn. Job’s friend Eliphaz the Temanite carries the name of his son.'),
    ('reuel', 'Reuel', 'רְעוּאֵל', ['רעואל'], None, 'basemath', 'Also the name of Moses’ father-in-law (Exodus 2:18).'),
    ('jeush', 'Jeush', 'יְעוּשׁ', ['יעוש'], None, 'oholibamah', 'Written יעיש, read יעוש.'),
    ('jalam', 'Jalam', 'יַעְלָם', ['יעלם'], None, 'oholibamah', 'A son of Esau and Oholibamah.'),
    ('korah-e', 'Korah (son of Esau)', 'קֹרַח', ['קורח'], None, 'oholibamah', 'Not the Levite rebel: an Edomite chief.'),
]:
    add(id, en, he, N, 'Genesis 36:4' if id in ('eliphaz', 'reuel') else 'Genesis 36:5', K, 'esau', names=nm, wiki=w,
        note=nt, mother=mom)
for id, en, he, nm, nt, cv in [
    ('teman', 'Teman', 'תֵּימָן', ['תימן'], 'Gives his name to a region of Edom; in modern Hebrew, Teman is Yemen.', None),
    ('omar', 'Omar', 'אוֹמָר', ['אומר'], 'A son of Eliphaz.', 'The common name Omer/Omar is spelled עומר; these few babies are spelled as in Genesis.'),
    ('zepho', 'Zepho', 'צְפוֹ', ['צפו'], 'A son of Eliphaz.', None),
    ('gatam', 'Gatam', 'גַּעְתָּם', ['געתם'], 'A son of Eliphaz.', None),
    ('kenaz', 'Kenaz', 'קְנַז', ['קנז'], 'Caleb is “the Kenizzite”.', 'The babies spelled קנז are Muslim girls: the Arabic Kanz, “treasure”.'),
]:
    add(id, en, he, N, 'Genesis 36:11', K, 'eliphaz', names=nm, note=nt, caveat=cv)
add('timna', 'Timna', 'תִּמְנַע', N, 'Genesis 36:12', K, None, 'F', names=['תמנע'], spouse='eliphaz',
    note='Eliphaz’s concubine, mother of Amalek. Also a valley of copper mines in the Arava. 135 Israeli girls.')
add('amalek', 'Amalek', 'עֲמָלֵק', N, 'Genesis 36:12', K, 'eliphaz', names=['עמלק'], wiki='Amalek', mother='timna',
    note='Ancestor of Israel’s arch-enemy. The one name nobody gives.')
for id, en, he, nm, nt, cv in [
    ('nahath', 'Nahath', 'נַחַת', ['נחת'], '“Rest, contentment.”', None),
    ('zerah-e', 'Zerah (son of Reuel)', 'זֶרַח', ['זרח'], '“Sunrise.”', 'Counts for זרח are shared with Judah’s son Zerah.'),
    ('shammah', 'Shammah', 'שַׁמָּה', ['שמה'], 'A son of Reuel.', 'The babies spelled שמה are Muslim girls: a different, Arabic name.'),
    ('mizzah', 'Mizzah', 'מִזָּה', ['מזה'], 'A son of Reuel.', None),
]:
    add(id, en, he, N, 'Genesis 36:13', K, 'reuel', names=nm, note=nt, caveat=cv)

# ---- The seventy who went down to Egypt (Genesis 46:8-27)
CUR = 'egypt'
def sons(parent, ref, rows, also=()):
    for row in rows:
        id, en, he, nm = row[:4]
        nt = row[4] if len(row) > 4 else ''
        cv = row[5] if len(row) > 5 else None
        add(id, en, he, N, ref, I, parent, names=nm, note=nt, caveat=cv, also=also)
sons('reuben', 'Genesis 46:9', [
    ('hanoch-r', 'Hanoch (son of Reuben)', 'חֲנוֹךְ', ['חנוך'], 'A fourth Enoch.', 'Counts for חנוך are shared with the other Enochs.'),
    ('pallu', 'Pallu', 'פַלּוּא', ['פלוא'], 'Ancestor of Dathan and Abiram, who rebel with Korah.'),
    ('hezron-r', 'Hezron (son of Reuben)', 'חֶצְרֹן', ['חצרון'], 'Shares his name with Judah’s grandson.'),
    ('carmi', 'Carmi', 'כַרְמִי', ['כרמי'], '“My vineyard.” Karmi: about 1,500 Israeli babies.'),
], also=['levi'])
sons('simeon', 'Genesis 46:10', [
    ('jemuel', 'Jemuel', 'יְמוּאֵל', ['ימואל'], 'Nemuel in Numbers 26.'),
    ('jamin', 'Jamin', 'יָמִין', ['ימין'], '“Right hand.” Yamin: about 200 Israeli boys.'),
    ('ohad', 'Ohad', 'אֹהַד', ['אוהד'], 'Missing from the census in Numbers. Today a common name: 7,600 Israeli boys.'),
    ('jachin', 'Jachin', 'יָכִין', ['יכין'], 'Also the name of a pillar of Solomon’s Temple.'),
    ('zohar', 'Zohar (son of Simeon)', 'צֹחַר', ['צחר'], 'Spelled צחר: not the modern Zohar (זוהר, “radiance”).'),
    ('shaul-s', 'Saul (son of Simeon)', 'שָׁאוּל', ['שאול'], '“The son of a Canaanite woman.” The first Saul in the Bible.'),
], also=['levi'])
sons('levi', 'Genesis 46:11', [
    ('gershon', 'Gershon', 'גֵּרְשׁוֹן', ['גרשון'], 'Ancestor of the Gershonites, who carried the Tabernacle’s curtains.'),
    ('kohath', 'Kohath', 'קְהָת', ['קהת'], 'Grandfather of Moses. Lived 133 years (Exodus 6:18).'),
    ('merari', 'Merari', 'מְרָרִי', ['מררי'], 'Ancestor of the Merarites, who carried the boards and pillars.'),
], also=['levi'])
by0 = {p['id']: p for p in P}
by0['kohath']['lived'] = 133
sons('judah', 'Genesis 46:12', [
    ('er', 'Er', 'עֵר', ['ער'], 'Judah’s firstborn, “wicked in the eyes of God”. Died in Canaan.'),
    ('onan', 'Onan', 'אוֹנָן', ['אונן'], 'Died in Canaan.'),
    ('shelah-j', 'Shelah (son of Judah)', 'שֵׁלָה', ['שלה'], 'The son Tamar was promised.'),
    ('perez', 'Perez', 'פֶרֶץ', ['פרץ'], 'Tamar’s son, “breach”. Ancestor of David.'),
    ('zerah-j', 'Zerah (son of Judah)', 'זָרַח', ['זרח'], 'Perez’s twin, with the scarlet thread on his hand.', 'Counts for זרח are shared with Reuel’s son Zerah.'),
])
for x in ('perez',):
    by0 = {p['id']: p for p in P}
    by0[x]['wiki'] = 'Perez (son of Judah)'; by0[x]['secs'].append('david')
for x, w in [('er', 'Er (biblical person)'), ('onan', 'Onan'), ('zerah-j', None)]:
    by0[x]['wiki'] = w
sons('perez', 'Genesis 46:12', [
    ('hezron-p', 'Hezron (son of Perez)', 'חֶצְרֹן', ['חצרון'], 'Ancestor of David.'),
    ('hamul', 'Hamul', 'חָמוּל', ['חמול'], 'A grandson of Judah.'),
], also=())
by0 = {p['id']: p for p in P}
by0['hezron-p']['secs'].append('david')
sons('issachar', 'Genesis 46:13', [
    ('tola', 'Tola', 'תּוֹלָע', ['תולע'], '“Worm” or “scarlet”. A judge of Israel carries the name (Judges 10:1).'),
    ('puvah', 'Puvah', 'פֻוָה', ['פוה', 'פואה'], 'Puah in Chronicles.'),
    ('iob', 'Iob', 'יוֹב', ['יוב'], 'Jashub in Numbers 26.'),
    ('shimron', 'Shimron', 'שִׁמְרֹן', ['שמרון'], 'A son of Issachar.'),
])
sons('zebulun', 'Genesis 46:14', [
    ('sered', 'Sered', 'סֶרֶד', ['סרד'], 'A son of Zebulun.'),
    ('elon', 'Elon', 'אֵלוֹן', ['אלון'], 'A son of Zebulun.', 'אלון is also Alon, “oak”: nearly all these babies are Alons.'),
    ('jahleel', 'Jahleel', 'יַחְלְאֵל', ['יחלאל'], 'A son of Zebulun.'),
])
by0 = {p['id']: p for p in P}
sons('gad', 'Genesis 46:16', [
    ('ziphion', 'Ziphion', 'צִפְיוֹן', ['צפיון'], 'Zephon in Numbers 26.'),
    ('haggi', 'Haggi', 'חַגִּי', ['חגי'], 'Spelled like the prophet Haggai.', 'Counts for חגי include babies named for the prophet Haggai.'),
    ('shuni', 'Shuni', 'שׁוּנִי', ['שוני'], 'A son of Gad.'),
    ('ezbon', 'Ezbon', 'אֶצְבֹּן', ['אצבון'], 'Ozni in Numbers 26.'),
    ('eri', 'Eri', 'עֵרִי', ['ערי'], 'A son of Gad.'),
    ('arodi', 'Arodi', 'אֲרוֹדִי', ['ארודי'], 'A son of Gad.'),
    ('areli', 'Areli', 'אַרְאֵלִי', ['אראלי'], 'A son of Gad.'),
])
sons('asher', 'Genesis 46:17', [
    ('imnah', 'Imnah', 'יִמְנָה', ['ימנה'], 'A son of Asher.', 'ימנה is also the Arabic girls’ name Yumna.'),
    ('ishvah', 'Ishvah', 'יִשְׁוָה', ['ישוה'], 'A son of Asher.'),
    ('ishvi', 'Ishvi', 'יִשְׁוִי', ['ישוי'], 'A son of Asher.'),
    ('beriah', 'Beriah', 'בְרִיעָה', ['בריעה'], 'A son of Asher.'),
])
add('serah', 'Serah', 'שֶׂרַח', N, 'Genesis 46:17', I, 'asher', 'F', names=['שרח', 'סרח'], wiki='Serah',
    note='The only granddaughter of Jacob named. In the Midrash she tells Jacob that Joseph lives, and never dies.')
sons('beriah', 'Genesis 46:17', [
    ('heber', 'Heber', 'חֶבֶר', ['חבר'], '“Companion.” A great-grandson of Jacob.'),
    ('malchiel', 'Malchiel', 'מַלְכִּיאֵל', ['מלכיאל'], '“God is my king.”'),
])
add('asenath', 'Asenath', 'אָסְנַת', N, 'Genesis 46:20', I, None, 'F', names=['אסנת'], wiki='Asenath',
    note='Daughter of Poti-phera, priest of On. Osnat: over 5,000 Israeli girls.', spouse='joseph')
sons('joseph', 'Genesis 46:20', [
    ('manasseh', 'Manasseh', 'מְנַשֶּׁה', ['מנשה'], '“God has made me forget my hardship.”'),
    ('ephraim', 'Ephraim', 'אֶפְרָיִם', ['אפרים'], '“God has made me fertile.” Jacob blesses him before his elder brother.'),
])
by0 = {p['id']: p for p in P}
for x in ('manasseh', 'ephraim'):
    by0[x]['mother'] = 'asenath'
by0['manasseh']['wiki'] = 'Manasseh (tribal patriarch)'; by0['ephraim']['wiki'] = 'Ephraim'
sons('benjamin', 'Genesis 46:21', [
    ('bela', 'Bela', 'בֶּלַע', ['בלע'], 'A son of Benjamin.'),
    ('becher', 'Becher', 'בֶכֶר', ['בכר'], 'A son of Benjamin.', 'Almost all the babies spelled בכר are Muslim boys: the Arabic Bakr.'),
    ('ashbel', 'Ashbel', 'אַשְׁבֵּל', ['אשבל'], 'A son of Benjamin.'),
    ('gera', 'Gera', 'גֵּרָא', ['גרא'], 'A son of Benjamin.'),
    ('naaman', 'Naaman', 'נַעֲמָן', ['נעמן'], 'Shares a name with the Aramean general Elisha heals.'),
    ('ehi', 'Ehi', 'אֵחִי', ['אחי'], 'A son of Benjamin.', 'אחי is also “my brother”.'),
    ('rosh', 'Rosh', 'רֹאשׁ', ['ראש'], '“Head.”'),
    ('muppim', 'Muppim', 'מֻפִּים', ['מפים'], 'A son of Benjamin.'),
    ('huppim', 'Huppim', 'חֻפִּים', ['חפים'], 'A son of Benjamin.'),
    ('ard', 'Ard', 'אָרְדְּ', ['ארד'], 'A son of Benjamin.', 'ארד is also the modern name Arad: most of these babies are Arads.'),
])
sons('dan', 'Genesis 46:23', [('hushim', 'Hushim', 'חֻשִׁים', ['חושים'], 'Dan’s only son. In the Midrash, the deaf son who strikes Esau at Jacob’s burial.')])
sons('naphtali', 'Genesis 46:24', [
    ('jahzeel', 'Jahzeel', 'יַחְצְאֵל', ['יחצאל'], 'A son of Naphtali.'),
    ('guni', 'Guni', 'גוּנִי', ['גוני'], 'A son of Naphtali.', 'גוני is also the modern Goni, and Johnny in Christian Arab families.'),
    ('jezer', 'Jezer', 'יֵצֶר', ['יצר'], 'A son of Naphtali.'),
    ('shillem', 'Shillem', 'שִׁלֵּם', ['שילם'], 'A son of Naphtali.'),
])

# ---- The heads of Reuben, Simeon and Levi (Exodus 6:14-25)
CUR = 'levi'
sons('gershon', 'Exodus 6:17', [('libni', 'Libni', 'לִבְנִי', ['לבני'], 'A grandson of Levi.'),
                                ('shimei', 'Shimei', 'שִׁמְעִי', ['שמעי'], 'A grandson of Levi.')])
sons('kohath', 'Exodus 6:18', [
    ('amram', 'Amram', 'עַמְרָם', ['עמרם'], 'Father of Aaron, Moses and Miriam. Lived 137 years. Imran, in Arabic.'),
    ('izhar', 'Izhar', 'יִצְהָר', ['יצהר'], '“Fresh oil.” Father of Korah.'),
    ('hebron', 'Hebron', 'חֶבְרוֹן', ['חברון'], 'Shares a name with the city.'),
    ('uzziel', 'Uzziel', 'עֻזִּיאֵל', ['עוזיאל'], '“God is my strength.”'),
])
sons('merari', 'Exodus 6:19', [('mahli', 'Mahli', 'מַחְלִי', ['מחלי'], 'A grandson of Levi.'),
                               ('mushi', 'Mushi', 'מוּשִׁי', ['מושי'], 'A grandson of Levi.')])
by0 = {p['id']: p for p in P}
by0['amram']['lived'] = 137; by0['amram']['wiki'] = 'Amram'; by0['kohath']['wiki'] = 'Kohath'
by0['gershon']['wiki'] = 'Gershon'; by0['merari']['wiki'] = 'Merari'; by0['izhar']['wiki'] = 'Izhar'
add('jochebed', 'Jochebed', 'יוֹכֶבֶד', N, 'Exodus 6:20', I, 'levi', 'F', names=['יוכבד'], wiki='Jochebed',
    note='Amram’s aunt and wife, mother of Moses. Yocheved: almost 6,000 Israeli girls.', spouse='amram')
add('aaron', 'Aaron', 'אַהֲרֹן', N, 'Exodus 6:20', I, 'amram', names=['אהרון', 'אהרן', 'הארון'], wiki='Aaron',
    note='The first High Priest. 83 at the Exodus, lived 123 years. Harun, in Arabic.', mother='jochebed',
    born=2365, lived=123, spouse='elisheba')
add('moses', 'Moses', 'מֹשֶׁה', N, 'Exodus 6:20', I, 'amram', names=['משה', 'מושה', 'מוסא'], wiki='Moses',
    note='80 at the Exodus, lived 120 years. With Musa, the Arabic form, one of the most-given names in Israel.',
    mother='jochebed', born=2368, lived=120)
sons('izhar', 'Exodus 6:21', [
    ('korah-l', 'Korah', 'קֹרַח', ['קורח'], 'Leads the rebellion against Moses (Numbers 16). His sons survive and sing Psalms.'),
    ('nepheg', 'Nepheg', 'נֶפֶג', ['נפג'], 'A son of Izhar.'),
    ('zichri', 'Zichri', 'זִכְרִי', ['זכרי'], '“My remembrance.”'),
])
sons('uzziel', 'Exodus 6:22', [
    ('mishael', 'Mishael', 'מִישָׁאֵל', ['מישאל'], 'Carries out Nadab and Abihu’s bodies. Also one of Daniel’s companions.'),
    ('elzaphan', 'Elzaphan', 'אֶלְצָפָן', ['אלצפן'], 'Helps carry out Nadab and Abihu.'),
    ('sithri', 'Sithri', 'סִתְרִי', ['סתרי'], '“My hiding place.”'),
])
by0 = {p['id']: p for p in P}
by0['korah-l']['wiki'] = 'Korah'
add('elisheba', 'Elisheba', 'אֱלִישֶׁבַע', N, 'Exodus 6:23', I, 'amminadab', 'F', names=['אלישבע'], wiki='Elisheba',
    note='Daughter of Amminadab, sister of Nahshon: Judah marries Levi. Elisheva: 10,000 Israeli girls.', spouse='aaron')
sons('aaron', 'Exodus 6:23', [
    ('nadab', 'Nadab', 'נָדָב', ['נדב'], 'Killed with Abihu for offering “alien fire”. Nadav: 16,700 Israeli boys.'),
    ('abihu', 'Abihu', 'אֲבִיהוּא', ['אביהוא'], 'Killed with Nadab. Nobody names a baby Abihu.'),
    ('eleazar', 'Eleazar', 'אֶלְעָזָר', ['אלעזר'], 'High Priest after Aaron.'),
    ('ithamar', 'Ithamar', 'אִיתָמָר', ['איתמר'], 'Itamar: over 21,000 Israeli boys.'),
])
by0 = {p['id']: p for p in P}
for x in ('nadab', 'abihu', 'eleazar', 'ithamar'):
    by0[x]['mother'] = 'elisheba'
by0['eleazar']['wiki'] = 'Eleazar'; by0['ithamar']['wiki'] = 'Ithamar'; by0['nadab']['wiki'] = 'Nadab and Abihu'
by0['abihu']['wiki'] = 'Nadab and Abihu'
sons('korah-l', 'Exodus 6:24', [
    ('assir', 'Assir', 'אַסִּיר', ['אסיר'], 'A son of Korah.', 'אסיר is also the Arabic name Asir.'),
    ('elkanah', 'Elkanah', 'אֶלְקָנָה', ['אלקנה'], 'Samuel’s father carries the name.'),
    ('abiasaph', 'Abiasaph', 'אֲבִיאָסָף', ['אביאסף'], 'Evyasaf: a living Israeli name.'),
])
sons('eleazar', 'Exodus 6:25', [('phinehas', 'Phinehas', 'פִּינְחָס', ['פנחס', 'פינחס'], 'Zealot for God (Numbers 25), rewarded with a covenant of peace.')])
by0 = {p['id']: p for p in P}
by0['phinehas']['wiki'] = 'Phinehas'

# ---- Perez to David (Ruth 4:18-22)
CUR = 'david'
for id, en, he, nm, w, parent, ref, nt in [
    ('ram', 'Ram', 'רָם', ['רם'], None, 'hezron-p', 'Ruth 4:19', '“High.”'),
    ('amminadab', 'Amminadab', 'עַמִּינָדָב', ['עמינדב'], 'Amminadab', 'ram', 'Ruth 4:19', 'Father-in-law of Aaron.'),
    ('nahshon', 'Nahshon', 'נַחְשׁוֹן', ['נחשון'], 'Nahshon', 'amminadab', 'Ruth 4:20', 'In the Midrash, the first into the Red Sea before it split.'),
    ('salmon', 'Salmon', 'שַׂלְמוֹן', ['שלמון'], 'Salmon (biblical figure)', 'nahshon', 'Ruth 4:20', 'Salmah in one verse, Salmon in the next.'),
    ('boaz', 'Boaz', 'בֹּעַז', ['בועז'], 'Boaz', 'salmon', 'Ruth 4:21', 'Marries Ruth in Bethlehem.'),
]:
    add(id, en, he, N, ref, I, parent, names=nm, wiki=w, note=nt)
add('ruth', 'Ruth', 'רוּת', N, 'Ruth 4:13', I, None, 'F', names=['רות'], wiki='Ruth (biblical figure)',
    note='The Moabite who chose Naomi’s people. 28,700 Israeli girls.', spouse='boaz')
for id, en, he, nm, w, parent, ref, nt in [
    ('obed', 'Obed', 'עוֹבֵד', ['עובד'], 'Obed (biblical figure)', 'boaz', 'Ruth 4:21', 'Named by the neighbours: “a son is born to Naomi”.'),
    ('jesse', 'Jesse', 'יִשַׁי', ['ישי'], 'Jesse', 'obed', 'Ruth 4:22', 'Yishai: 12,800 Israeli babies.'),
    ('david', 'David', 'דָּוִד', ['דוד', 'דאוד', 'דאווד'], 'David', 'jesse', 'Ruth 4:22', 'The last word of the book. Counting Da’ud, given in every one of Israel’s groups.'),
]:
    add(id, en, he, N, ref, I, parent, names=nm, wiki=w, note=nt, mother='ruth' if id == 'obed' else None)
CUR = None

# Later names worth comparing in the explorer (not counted in the genealogy).
RENAMED = {'abram': 'אברהם', 'sarai': 'שרה', 'jacob': 'ישראל'}

# Generations from Adam, computed from parent links.
by = {p['id']: p for p in P}
def gen(p):
    if p['id'] in ('adam', 'eve'):
        return 1
    if p['parent']:
        return gen(by[p['parent']]) + 1
    if p['spouse']:
        return gen(by[p['spouse']])
    return 1
for p in P:
    p['gen'] = gen(p)
    if p['born'] is not None and p['lived'] is not None:
        p['died'] = p['born'] + p['lived']

# ---- Israeli names
spellings = set(s for p in P for s in p['names']) | set(RENAMED.values())
YEARS = list(range(1949, 2025))
series = defaultdict(lambda: defaultdict(lambda: [0] * len(YEARS)))
group_totals = defaultdict(lambda: [0] * len(YEARS))   # all babies per sector/sex/year (from prop)
rank = defaultdict(dict)
seen = defaultdict(lambda: defaultdict(int))
with open(os.path.join(SRC, 'babynamesIL.csv'), encoding='utf-8') as f:
    for r in csv.DictReader(f):
        y = int(r['year']); i = y - 1949
        key = f"{r['sector']}|{r['sex']}"
        n = int(r['n'])
        if r['name'] in spellings:
            series[r['name']][key][i] += n
        # births in the group, recovered from n/prop (same for every row of a group-year)
        if not group_totals[key][i] and float(r['prop']) > 0:
            group_totals[key][i] = round(n / float(r['prop']))
        seen[(key, y)][r['name']] = n
# Rank of each spelling within its sector/sex/year (1 = most given).
ranks = defaultdict(dict)
for (key, y), names in seen.items():
    # competition ranking: ties share a rank (1 + names given more often)
    counts = sorted(names.values(), reverse=True)
    pos = {nm: counts.index(c) + 1 for nm, c in names.items()}
    for s in spellings:
        if s in pos:
            ranks[s][f'{key}|{y}'] = pos[s]
totals = defaultdict(dict)
with open(os.path.join(SRC, 'babynamesIL_totals.csv'), encoding='utf-8') as f:
    for r in csv.DictReader(f):
        if r['name'] in spellings:
            totals[r['name']][f"{r['sector']}|{r['sex']}"] = int(r['total'])

# Spellings that in Israel are overwhelmingly a different name: shown with a caveat, left out of
# the rankings and totals.
HOMOGRAPHS = {'seba', 'madai', 'serug', 'gomer', 'sabtah', 'kedar', 'kenaz', 'shammah', 'becher', 'elon',
              'ard', 'guni', 'imnah', 'assir', 'haggi', 'ehi'}
for p in P:
    p['homograph'] = p['id'] in HOMOGRAPHS
    p['israel'] = sum(sum(totals.get(s, {}).values()) for s in p['names'])
    if p['id'] in RENAMED:
        p['renamed'] = RENAMED[p['id']]

names_out = {
    'source': 'Israel Central Bureau of Statistics, release 391/2025, via babynamesIL (CC0)',
    'years': [YEARS[0], YEARS[-1]],
    'groupTotals': {k: v for k, v in group_totals.items()},
    'names': {s: {'series': dict(series[s]), 'totals': totals.get(s, {}),
                  'peak': None} for s in sorted(spellings) if s in totals or s in series},
}
for s, d in names_out['names'].items():
    best = None
    for key, arr in d['series'].items():
        for i, n in enumerate(arr):
            if n and (best is None or n > best[2]):
                best = (key, YEARS[i], n)
    d['peak'] = {'group': best[0], 'year': best[1], 'n': best[2]} if best else None
    d['bestRank'] = min(((r, k) for k, r in ranks[s].items()), default=None)

os.makedirs(os.path.join(ROOT, 'src/data/genealogies'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'public/data/genealogies'), exist_ok=True)
json.dump(P, open(os.path.join(ROOT, 'src/data/genealogies/people.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
json.dump(SECTIONS, open(os.path.join(ROOT, 'src/data/genealogies/sections.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
json.dump(names_out, open(os.path.join(ROOT, 'public/data/genealogies/names.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
print(len(P), 'figures;', len(names_out['names']), 'spellings with Israeli data')
none = [p['en'] for p in P if p['names'] and not p['israel']]
print(len(none), 'named figures not in the CBS records:', ', '.join(none))
