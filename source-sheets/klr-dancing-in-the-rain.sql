-- KLR Women's Shiur, Rosh Chodesh Cheshvan: "Dancing in the Rain".
-- Digitised from the printed handout. Texts on Sefaria come from Sefaria (with its English);
-- sources tagged not-on-sefaria were transcribed from the handout and translated by us.
-- Re-runnable: a source is only inserted if its position is still empty.

insert into public.source_sheets (slug, title, title_he, subtitle, intro, status)
values (
  'klr-dancing-in-the-rain',
  'Dancing in the Rain',
  'ראש חודש חשון',
  'Discovering Hashem''s hidden miracles in every drop',
  'KLR Women''s Shiur (Kehilat Lev Ra''anana), Rosh Chodesh Cheshvan. When we start asking for rain, why it sits in the blessing of the resurrection of the dead, and why rain waits for prayer: from the Mishnah and the Siddur through the Gemara to the Maharal, Rav Elya Lopian and Rebbe Bunim of Peshischa.',
  'published'
)
on conflict (slug) do update set
  title = excluded.title, title_he = excluded.title_he, subtitle = excluded.subtitle,
  intro = excluded.intro, status = excluded.status, updated_at = now();

insert into public.source_sheet_sources (sheet_id, position, section, ref, author, he_text, en_text, note, tags)
select s.id, v.position, null, v.ref, v.author, v.he_text, v.en_text, v.note, v.tags
from public.source_sheets s,
(values
(1, 'Mishnah Taanit 1:3', 'Mishnah Taanit', $h$בִּשְׁלשָׁה בְמַרְחֶשְׁוָן שׁוֹאֲלִין אֶת הַגְּשָׁמִים. רַבָּן גַּמְלִיאֵל אוֹמֵר, בְּשִׁבְעָה בוֹ, חֲמִשָּׁה עָשָׂר יוֹם אַחַר הֶחָג, כְּדֵי שֶׁיַּגִּיעַ אַחֲרוֹן שֶׁבְּיִשְׂרָאֵל לִנְהַר פְּרָת׃$h$,
 $e$On the third of Marḥeshvan one starts to request rain. Rabban Gamliel says: on the seventh of the month, fifteen days after the festival of Sukkot, so that the last pilgrim of the Jewish people can reach the Euphrates River.$e$, null, '{rain,cheshvan}'::text[]),

(2, 'Shulchan Arukh, Orach Chayim 114:1', 'Shulchan Arukh, Orach Chayim 114:1 & 117:1', $h$סימן קיד: מתחילין לומר בברכה שנייה משיב הרוח ומוריד הגשם בתפלת מוסף של יום טוב האחרון של חג.
סימן קיז: ברכת השנים צריך לומר בה בימות הגשמים ותן טל ומטר... ובארץ ישראל מתחילין לשאול מליל שבעה במרחשון.$h$,
 $e$114: We start to say "Who makes the wind blow and the rain fall" in the second blessing, in the Musaf prayer of the last day of the festival (Shemini Atzeret).
117: In the blessing of the years, during the rainy season, one must say "and give dew and rain"... and in the Land of Israel we start to ask for rain from the night of 7 Marḥeshvan.$e$, null, '{rain,halacha,tefillah}'::text[]),

(3, 'Siddur Ashkenaz, Weekday, Shacharit, Amidah, Divine Might', 'Siddur: the Amidah, Gevurot', $h$אַתָּה גִּבּוֹר לְעוֹלָם אֲדֹנָי, מְחַיֵּה מֵתִים אַתָּה, רַב לְהוֹשִׁיעַ.
בקיץ: מוֹרִיד הַטָּל. בחורף: מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם.
מְכַלְכֵּל חַיִּים בְּחֶסֶד, מְחַיֵּה מֵתִים בְּרַחֲמִים רַבִּים, סוֹמֵךְ נוֹפְלִים, וְרוֹפֵא חוֹלִים, וּמַתִּיר אֲסוּרִים, וּמְקַיֵּם אֱמוּנָתוֹ לִישֵׁנֵי עָפָר. מִי כָמוֹךָ בַּעַל גְּבוּרוֹת וּמִי דּוֹמֶה לָּךְ, מֶלֶךְ מֵמִית וּמְחַיֶּה וּמַצְמִיחַ יְשׁוּעָה.
וְנֶאֱמָן אַתָּה לְהַחֲיוֹת מֵתִים. בָּרוּךְ אַתָּה ה׳, מְחַיֵּה הַמֵּתִים.$h$,
 $e$You are mighty forever, my Master; You are the Resurrector of the dead, the Powerful One to deliver us.
In summer: He causes the dew to descend. In winter: Causer of the wind to blow and of the rain to fall.
Sustainer of the living with kindliness, Resurrector of the dead with great mercy, Supporter of the fallen, Healer of the sick, Releaser of the imprisoned, and Fulfiller of His faithfulness to those who sleep in the dust. Who is like You, Master of mighty deeds, and who can be compared to You? King Who causes death and restores life, and causes deliverance to sprout forth.
And You are faithful to restore the dead to life. Blessed are You, Adonoy, Resurrector of the dead.$e$, null, '{tefillah,amidah}'::text[]),

(4, 'Siddur Ashkenaz, Weekday, Shacharit, Amidah, Prosperity', 'Siddur: the Amidah, Birkat HaShanim', $h$בָּרֵךְ עָלֵינוּ ה׳ אֱלֹהֵינוּ אֶת הַשָּׁנָה הַזֹּאת וְאֶת כָּל מִינֵי תְבוּאָתָהּ לְטוֹבָה, וְתֵן (בקיץ: בְּרָכָה) (בחורף: טַל וּמָטָר לִבְרָכָה) עַל פְּנֵי הָאֲדָמָה, וְשַׂבְּעֵנוּ מִטּוּבָהּ, וּבָרֵךְ שְׁנָתֵנוּ כַּשָּׁנִים הַטּוֹבוֹת לִבְרָכָה, כִּי אֵל טוֹב וּמֵטִיב אַתָּה וּמְבָרֵךְ הַשָּׁנִים. בָּרוּךְ אַתָּה ה׳, מְבָרֵךְ הַשָּׁנִים.$h$,
 $e$Bless for us, Adonoy our God, this year and all the varieties of its produce for good, and bestow (in summer: blessing) (in winter: dew and rain for a blessing) upon the face of the earth; satisfy us from its bounty and bless our year like the good years, for a blessing, for You are a good God who does good and blesses the years. Blessed are You, Adonoy, Blesser of the years.$e$, null, '{tefillah,amidah}'::text[]),

(5, 'Taanit 2a:12-2b:1', 'Gemara Taanit 2a', $h$אָמַר רַבִּי יוֹחָנָן: שְׁלֹשָׁה מַפְתְּחוֹת בְּיָדוֹ שֶׁל הַקָּדוֹשׁ בָּרוּךְ הוּא שֶׁלֹּא נִמְסְרוּ בְּיַד שָׁלִיחַ, וְאֵלּוּ הֵן: מַפְתֵּחַ שֶׁל גְּשָׁמִים, מַפְתֵּחַ שֶׁל חַיָּה, וּמַפְתֵּחַ שֶׁל תְּחִיַּית הַמֵּתִים. מַפְתֵּחַ שֶׁל גְּשָׁמִים — דִּכְתִיב: ״יִפְתַּח ה׳ לְךָ אֶת אוֹצָרוֹ הַטּוֹב אֶת הַשָּׁמַיִם לָתֵת מְטַר אַרְצְךָ בְּעִתּוֹ״. מַפְתֵּחַ שֶׁל חַיָּה מִנַּיִן — דִּכְתִיב: ״וַיִּזְכֹּר אֱלֹהִים אֶת רָחֵל וַיִּשְׁמַע אֵלֶיהָ אֱלֹהִים וַיִּפְתַּח אֶת רַחְמָהּ״. מַפְתֵּחַ שֶׁל תְּחִיַּית הַמֵּתִים מִנַּיִן — דִּכְתִיב: ״וִידַעְתֶּם כִּי אֲנִי ה׳ בְּפִתְחִי אֶת קִבְרוֹתֵיכֶם״.$h$,
 $e$Rabbi Yoḥanan said: There are three keys in the hand of the Holy One, Blessed be He, which were not transmitted to an intermediary: the key of rain, the key of birthing, and the key of the resurrection of the dead. The key of rain, as it is written: "The Lord will open for you His good treasure, the heavens, to give the rain of your land in its due time" (Deuteronomy 28:12). The key of birthing, as it is written: "And God remembered Rachel and listened to her, and He opened her womb" (Genesis 30:22). The key of the resurrection of the dead, as it is written: "And you shall know that I am the Lord when I have opened your graves" (Ezekiel 37:13).$e$, null, '{rain,techiyat-hametim}'::text[]),

(6, 'Chiddushei HaRitva on Taanit 2a', 'Ritva', $h$וקבעוהו חכמים בתחיית המתים לפי ששקולה כתחיית המתים, שהוא ענין דומה לו, שהזורעים נקברים תחת הקרקע וצומחים ע״י הגשמים ויוצאים בכמה [לבושין], והוא ג״כ לראיה על תחיית המתים, כדאמר בכתובות ק״ו מחטה, כענין שאמר הכתוב ״ויציצו מעיר כעשב הארץ״. וגם שבני אדם כשהגשמים נעצרים ומזונותיהם נמנעים הם נחשבים למתים, והקב״ה מחיה אותם ע״י הגשמים. ועוד שכל ענין החסדים שבברכה זו מבטל מערכת הכוכבים, ולפי׳ נקראת ברכת גבורות, וכן ענין ירידת גשמים.$h$,
 $e$The Sages fixed it in the blessing of the resurrection of the dead because rain is equal to the resurrection of the dead; it is a parallel process. What is sown is buried under the ground, sprouts through the rain and comes up in many [garments]. This is also a proof of the resurrection of the dead, as the Gemara in Ketubot argues "a fortiori from a grain of wheat", as the verse says, "And they shall blossom out of the city like the grass of the earth." Also, when the rains are held back and people's food is withheld, they are counted as dead, and the Holy One, Blessed be He, revives them through the rain. And further, all the kindnesses in this blessing override the order of the stars, which is why it is called the blessing of Gevurot (mighty acts), and so too the falling of rain.$e$, 'Hebrew transcribed from the handout; English translation ours.', '{rain,techiyat-hametim,not-on-sefaria}'::text[]),

(7, 'Aderet Eliyahu, Vezot HaBerakhah', 'The Vilna Gaon (R. Eliyahu ben Shlomo Zalman)', $h$ולכן אמרו רז״ל מזכירין גבורות גשמים בתחיית המתים, ואמרו מתוך שהיא שקולה כתחיית המתים לפיכך קבעוה בתחיית המתים. והענין, כי הגשמים אינן ע״פ הטבע כלל, כי כל הדברים שבעולם אומרים הפילוסופים שהוא ע״פ הטבע, אף זריחת השמש ושקיעתה, אבל על הגשמים רואים שפעמים לא ירד כלל, ופעמים ירד בכל יום ויום, ולכן נקרא גבורות גשמים, שבזה ניכר גבורות ה׳ יותר מכל הדברים. וז״ש מתוך שהיא שקולה וכו׳, כי גם בתחיית המתים מודים כולם שהוא אינו ע״פ טבע, שע״פ טבע לא יתכן שיהא האדם הנרקב מזמן רב לחזור ולהיות, ולכן קבעוה בתחיית המתים.$h$,
 $e$That is why the Sages said that we mention the might of rain in the blessing of the resurrection of the dead, and said that because it is equal to the resurrection of the dead, they fixed it there. The point is that rain does not follow nature at all. The philosophers say that everything in the world follows nature, even the rising and setting of the sun; but with rain we see that sometimes it does not fall at all and sometimes it falls every single day. That is why it is called the "might" of rain: in it God's might is more evident than in anything else. And that is what they meant by "because it is equal": about the resurrection of the dead, too, everyone agrees that it is not natural, since by nature a person long decayed could not return and live. So they placed it in the blessing of the resurrection of the dead.$e$, 'Hebrew transcribed from the handout; English translation ours.', '{rain,techiyat-hametim,not-on-sefaria}'::text[]),

(8, 'Genesis 2:5', 'Bereishit 2:5 with Rashi', $h$וְכֹל שִׂיחַ הַשָּׂדֶה טֶרֶם יִהְיֶה בָאָרֶץ וְכָל־עֵשֶׂב הַשָּׂדֶה טֶרֶם יִצְמָח כִּי לֹא הִמְטִיר ה׳ אֱלֹהִים עַל־הָאָרֶץ וְאָדָם אַיִן לַעֲבֹד אֶת־הָאֲדָמָה׃
רש״י: וְכָל עֵשֶׂב הַשָּׂדֶה טֶרֶם יִצְמַח, עֲדַיִן לֹא צָמַח, וּבְג׳ שֶׁכָּתוּב ״תּוֹצֵא הָאָרֶץ״, לֹא יָצְאוּ, אֶלָּא עַל פֶּתַח קַרְקַע עָמְדוּ עַד יוֹם שִׁשִּׁי. וּמַה טַּעַם לֹא הִמְטִיר? לְפִי שֶׁאָדָם אַיִן לַעֲבֹד אֶת הָאֲדָמָה, וְאֵין מַכִּיר בְּטוֹבָתָם שֶׁל גְּשָׁמִים, וּכְשֶׁבָּא אָדָם וְיָדַע שֶׁהֵם צֹרֶךְ לָעוֹלָם, הִתְפַּלֵּל עֲלֵיהֶם וְיָרְדוּ וְצָמְחוּ הָאִילָנוֹת וְהַדְּשָׁאִים.$h$,
 $e$When no shrub of the field was yet on earth and no grasses of the field had yet sprouted, because the Lord God had not sent rain upon the earth and there was no human to till the soil.
Rashi: "And every herb of the field had not yet grown." On the third day, when it is written "The earth brought forth", they did not come out but stood at the opening of the ground until the sixth day. And why had He not sent rain? Because there was no man to work the ground, and no one to recognise the goodness of rain. When Adam came and understood that rain is a need of the world, he prayed for it, and it fell, and the trees and grasses sprouted.$e$, null, '{rain,tefillah,bereishit}'::text[]),

(9, 'Chullin 60b:5', 'Gemara Chullin 60b', $h$רַב אַסִּי רָמֵי, כְּתִיב: ״וַתּוֹצֵא הָאָרֶץ דֶּשֶׁא״ בִּתְלָתָא בְּשַׁבָּא, וּכְתִיב: ״וְכׇל שִׂיחַ הַשָּׂדֶה טֶרֶם יִהְיֶה בָאָרֶץ״ בְּמַעֲלֵי שַׁבְּתָא, מְלַמֵּד שֶׁיָּצְאוּ דְּשָׁאִים וְעָמְדוּ עַל פֶּתַח קַרְקַע, עַד שֶׁבָּא אָדָם הָרִאשׁוֹן וּבִקֵּשׁ עֲלֵיהֶם רַחֲמִים, וְיָרְדוּ גְּשָׁמִים וְצָמְחוּ, לְלַמֶּדְךָ שֶׁהַקָּדוֹשׁ בָּרוּךְ הוּא מִתְאַוֶּה לִתְפִלָּתָן שֶׁל צַדִּיקִים.$h$,
 $e$Rav Asi raises a contradiction between two verses. It is written: "And the earth brought forth grass" (Genesis 1:12), on the third day of Creation, and it is written: "No shrub of the field was yet in the earth" (Genesis 2:5), on the eve of Shabbat. This teaches that the grasses emerged and stood at the opening of the ground until Adam, the first man, came and prayed for mercy upon them, and rain came, and they sprouted. This is to teach you that the Holy One, Blessed be He, desires the prayers of the righteous.$e$, null, '{rain,tefillah}'::text[]),

(10, 'Genesis 25:21', 'Bereishit 25:21 (Toldot)', $h$וַיֶּעְתַּר יִצְחָק לַה׳ לְנֹכַח אִשְׁתּוֹ כִּי עֲקָרָה הִוא וַיֵּעָתֶר לוֹ ה׳ וַתַּהַר רִבְקָה אִשְׁתּוֹ׃$h$,
 $e$Isaac pleaded with the Lord on behalf of his wife, because she was barren; and the Lord responded to his plea, and his wife Rebekah conceived.$e$, null, '{tefillah,bereishit}'::text[]),

(11, 'Yevamot 64a:9', 'Gemara Yevamot 64a', $h$אָמַר רַבִּי יִצְחָק: מִפְּנֵי מָה הָיוּ אֲבוֹתֵינוּ עֲקוּרִים — מִפְּנֵי שֶׁהַקָּדוֹשׁ בָּרוּךְ הוּא מִתְאַוֶּה לִתְפִלָּתָן שֶׁל צַדִּיקִים.$h$,
 $e$Rabbi Yitzḥak said: For what reason were our forefathers infertile? Because the Holy One, Blessed be He, desires the prayers of the righteous.$e$, null, '{tefillah}'::text[]),

(12, 'Chiddushei Aggadot, Yevamot 64a', 'Maharal of Prague', $h$כלל הדבר, כי השי״ת רוצה וחפץ שיהיה העלול נתלה בעלה, ולא יהיה נפרד מאתו. והתפילה היא התקשרות עלול בעלה, ולכך הוא מתאוה לתפילתן של צדיקים. ודבר זה יש לך להבין מאד.$h$,
 $e$The sum of it is that God wants and desires that the effect stay bound to its Cause and not be separated from Him. Prayer is the bond of the effect to its Cause, and that is why He desires the prayers of the righteous. Understand this well.$e$, 'Hebrew transcribed from the handout; English translation ours.', '{tefillah,maharal,not-on-sefaria}'::text[]),

(13, 'Ben Yehoyada, Sanhedrin 101a', 'R. Yosef Chaim of Baghdad', $h$אלף
דלת
מם$h$,
 $e$Aleph, Dalet, Mem: the three letters of אדם (Adam, "man"), each spelled out in full.$e$, 'As printed on the handout, the source is just these three spelled-out letters.', '{tefillah,adam,not-on-sefaria}'::text[]),

(14, 'Lev Eliyahu, Ekev', 'R. Elyah Lopian, Lev Eliyahu, Parashat Ekev, p. 260', $h$והיו באמת זמנים שלא ירדו גשמים, ולא הועיל שום חכמה, הנה לא הלכו אצל חכמי הטבע שיעשו מכונה להורדת גשמים... וידעו כולם כי אם יתקבצו כל חכמי עולם שבכל הדורות — אין בכחם להוריד אפילו טפה אחת של גשמים. ולמי פנו? — אל חוני המעגל, ואל אבא חלקיה, ואל חנן הנחבא, והם התפללו — וירדו גשמים! (ראה תענית כ״ג).
וכן מצינו בגמרא ומדרשים בהרבה חכמים שהתפללו על הגשמים שירדו — והועילה תפלתם. כל זה להודיע לבאי עולם שיש השגחה פרטית בכל הבריאה, ושהצדיקים שמוצאים חן בעיני השי״ת — ישמע אל שועתם ויושיע כל העם עבורם.$h$,
 $e$There really were times when no rain fell and no wisdom helped. They did not go to the scientists to build a machine to bring down rain... Everyone knew that if all the wise men of every generation gathered together, it would not be in their power to bring down even one drop of rain. So to whom did they turn? To Ḥoni the Circle-Drawer, to Abba Ḥilkiyah, to Ḥanan HaNeḥba. They prayed, and the rain fell! (See Taanit 23.)
So too we find in the Gemara and the Midrashim many sages who prayed for rain to fall, and their prayer worked. All this is to make known to everyone in the world that there is individual Providence over all creation, and that the righteous who find favour in God's eyes, He hears their cry and saves the whole people for their sake.$e$, 'Hebrew transcribed from the handout; English translation ours.', '{rain,tefillah,mussar,not-on-sefaria}'::text[]),

(15, 'Taanit 7b:2', 'Gemara Taanit 7b', $h$אָמַר רַבִּי חָמָא בְּרַבִּי חֲנִינָא: גָּדוֹל יוֹם הַגְּשָׁמִים כְּיוֹם שֶׁנִּבְרְאוּ שָׁמַיִם וָאָרֶץ.$h$,
 $e$Rabbi Ḥama, son of Rabbi Ḥanina, said: The day of the rains is as great as the day on which the heavens and earth were created.$e$, null, '{rain,creation}'::text[]),

(16, 'Genesis 3:14-19', 'Bereishit 3:14, 16, 19', $h$יד וַיֹּאמֶר ה׳ אֱלֹהִים אֶל־הַנָּחָשׁ כִּי עָשִׂיתָ זֹּאת אָרוּר אַתָּה מִכׇּל־הַבְּהֵמָה וּמִכֹּל חַיַּת הַשָּׂדֶה עַל־גְּחֹנְךָ תֵלֵךְ וְעָפָר תֹּאכַל כׇּל־יְמֵי חַיֶּיךָ׃
טז אֶל־הָאִשָּׁה אָמַר הַרְבָּה אַרְבֶּה עִצְּבוֹנֵךְ וְהֵרֹנֵךְ בְּעֶצֶב תֵּלְדִי בָנִים וְאֶל־אִישֵׁךְ תְּשׁוּקָתֵךְ וְהוּא יִמְשׇׁל־בָּךְ׃
יט בְּזֵעַת אַפֶּיךָ תֹּאכַל לֶחֶם עַד שׁוּבְךָ אֶל־הָאֲדָמָה כִּי מִמֶּנָּה לֻקָּחְתָּ כִּי־עָפָר אַתָּה וְאֶל־עָפָר תָּשׁוּב׃$h$,
 $e$14 Then the Lord God said to the serpent, "Because you did this, more cursed shall you be than all cattle and all the wild beasts: on your belly shall you crawl and dirt shall you eat all the days of your life."
16 And to the woman He said, "I will greatly expand your toil and your pregnancies; in hardship shall you bear children. Yet your urge shall be for your husband, and his will shall prevail over yours."
19 "By the sweat of your brow shall you get bread to eat, until you return to the ground, for from it you were taken. For dust you are, and to dust you shall return."$e$, null, '{bereishit,tefillah}'::text[]),

(17, 'Chidushei Simcha, Bereishit', 'R. Simcha Bunim of Peshischa', $h$ויאמר ה״א אל הנחש וכו׳ ועפר תאכל כל ימי חייך. השיב הה״ק הרבי ר׳ בונם זי״ע לאיש א׳ אשר שאל על קללת הנחש ״עפר תאכל״ וכו׳, דלכאורה מה זאת קללה? הלא בטח נתן השי״ת טבע לנחש שיהי׳ יכול לחיות בעפר, ועוד ברכה הוא שימצא מחסורו בכל מקום בואו. והשיבו, כי זאת היא קללה: כי לאדה״ר אמר ״בזעת אפך תאכל לחם״, ואם יהי׳ מחוסר פרנסה אז יבקש מהשי״ת עי״ז; ולאשה אמר ״בעצב תלדי בנים״, ואם תבוא עת ללדת תבקש רחמים מאת השי״ת. ויש להם עוד שייכות והתקשרות עם השי״ת לבוא לפניו בתפלה ותחנונים. רק הנחש, הוא מקור הטומאה, נתן לו השי״ת כל מחסורו, שיהי׳ מאכלו עפר אשר יש לו תמיד, כדי שלא יהי׳ לו עוד שום שייכות עמו לבקש ממנו איזה דבר. כמו כן נותן השי״ת פעמים לרשע גדול בריאות ועשירות הכל, שלא יבוא עוד בתפלתו לפניו ית״ש בשום פעם וכו׳ (מצמיח ישועות ד׳ כ״ז).$h$,
 $e$"And the Lord God said to the serpent... and dust shall you eat all the days of your life." Someone once asked the holy Rebbe Reb Bunim about the serpent's curse, "dust shall you eat": what kind of curse is that? Surely God gave the serpent a nature that lets it live on dust, and it is even a blessing, since it finds what it needs wherever it goes. He answered that this is exactly the curse. To Adam God said, "By the sweat of your brow shall you eat bread", so when he lacks a livelihood he will ask God for it. To the woman He said, "In pain shall you bear children", so when her time to give birth comes she will ask God for mercy. They still have a connection and a bond with God, coming before Him in prayer and supplication. Only the serpent, the source of impurity, God gave everything it needs, food of dust that it always has, so that it would have no further connection with Him and never need to ask Him for anything. In the same way God sometimes gives a great wicked man health and wealth and everything, so that he will never again come before Him in prayer.$e$, 'Hebrew transcribed from the handout; English translation ours.', '{tefillah,chassidut,bereishit,not-on-sefaria}'::text[])
) as v(position, ref, author, he_text, en_text, note, tags)
where s.slug = 'klr-dancing-in-the-rain'
  and not exists (select 1 from public.source_sheet_sources x where x.sheet_id = s.id and x.position = v.position);
