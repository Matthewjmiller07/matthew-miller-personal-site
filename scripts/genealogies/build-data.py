"""Build the data for /genealogies: every person and people named in the genealogies of
parashat Bereshit (Gen 4-5) and Noach (Gen 10-11), joined to Israeli baby-name counts.

Names data: babynamesIL (Aviezer Lifshitz, CC0), a repackaging of Israel's Central Bureau of
Statistics release 391/2025 (names of babies born 1949-2024, by sector and sex; yearly rows only
where a name was given to 5+ babies, totals include every registration).

    git clone --depth 1 https://github.com/aviezerl/babynamesIL /tmp/bn
    python3 scripts/genealogies/build-data.py /tmp/bn/data-raw

Writes src/data/genealogies/people.json (small, imported by the page) and
public/data/genealogies/names.json (yearly series, fetched by the page).
"""
import csv, json, os, sys
from collections import defaultdict

SRC = sys.argv[1] if len(sys.argv) > 1 else 'babynamesIL/data-raw'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# id, en, he (pointed, as in the Masoretic text), parasha, ref, line, parent, sex, kind,
# begat (age at the named son), lived (lifespan), born (Anno Mundi), modern spellings to match,
# wiki (English Wikipedia title), note, and optional caveat on homographs.
B, N = 'bereshit', 'noach'
P = []
def add(id, en, he, par, ref, line, parent, sex='M', kind='person', names=(), wiki=None, note='',
        begat=None, lived=None, born=None, caveat=None, spouse=None, mother=None):
    P.append(dict(id=id, en=en, he=he, parasha=par, ref=ref, line=line, parent=parent, sex=sex,
                  kind=kind, names=list(names), wiki=wiki, note=note, begat=begat, lived=lived,
                  born=born, caveat=caveat, spouse=spouse, mother=mother))

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

# Later names worth comparing in the explorer (not counted in the genealogy).
RENAMED = {'abram': 'אברהם', 'sarai': 'שרה'}

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
HOMOGRAPHS = {'seba', 'madai', 'serug', 'gomer', 'sabtah'}
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
json.dump(names_out, open(os.path.join(ROOT, 'public/data/genealogies/names.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
print(len(P), 'figures;', len(names_out['names']), 'spellings with Israeli data')
for p in sorted(P, key=lambda p: -p['israel'])[:15]:
    print(f"  {p['en']:28} {p['israel']:>7}")
