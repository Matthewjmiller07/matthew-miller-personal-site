import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, X, BookOpen } from 'lucide-react'; // Loader2 used in WordSheet

// ============================================================
// Shacharit text — baked in from Sefaria's Siddur Ashkenaz,
// Weekday, Shacharit (api/v3/texts, nikkud preserved).
// ============================================================
const SEFARIA_TEXT = {
  "modeh-ani": {
    "he": [
      "מוֹדֶה אֲנִי לְפָנֶֽיךָ מֶֽלֶךְ חַי וְקַיָּם שֶׁהֶחֱזַֽרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה, רַבָּה אֱמוּנָתֶֽךָ:",
      "רֵאשִׁית חָכְמָה יִרְאַת יְהֹוָה, שֵֽׂכֶל טוֹב לְכָל־עֹשֵׂיהֶם, תְּהִלָּתוֹ עוֹמֶֽדֶת לָעַד: בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד:"
    ],
    "en": [
      "I give thanks to You living and everlasting King for You have restored my soul with mercy. Great is Your faithfulness.",
      "The beginning of wisdom is fear of Adonoy, good understanding to all who perform [His commandments], His praise endures forever. Blessed [is His] Name, Whose glorious kingdom is forever and ever."
    ]
  },
  "asher-yatzar": {
    "he": [
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם אֲשֶׁר יָצַר אֶת־הָאָדָם בְּחָכְמָה וּבָֽרָא בוֹ נְקָבִים נְקָבִים חֲלוּלִים חֲלוּלִים גָּלוּי וְיָדֽוּעַ לִפְנֵי כִסֵּא כְבוֹדֶֽךָ שֶׁאִם יִפָּתֵֽחַ אֶחָד מֵהֶם אוֹ יִסָּתֵם אֶחָד מֵהֶם אִי אֶפְשַׁר לְהִתְקַיֵּם וְלַעֲמֹד לְפָנֶֽיךָ אֲפִילוּ שָׁעָה אֶחָת. בָּרוּךְ אַתָּה יְהֹוָה רוֹפֵא כָל־בָּשָׂר וּמַפְלִיא לַעֲשׂוֹת:"
    ],
    "en": [
      "Blessed are You, Adonoy our God, King of the Universe, Who formed man with wisdom and created within him openings and hollows. It is obvious and known in the presence of Your glorious throne that if one of them were ruptured, or if one of them were blocked, it would be impossible to exist and stand in Your Presence even for a short while. Blessed are You, Adonoy, Who heals all flesh and performs wonders."
    ]
  },
  "morning-blessings": {
    "he": [
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם אֲשֶׁר נָתַן לַשֶּֽׂכְוִי בִינָה לְהַבְחִין בֵּין יוֹם וּבֵין לָֽיְלָה:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם שֶׁלֹּא עָשַֽׂנִי גּוֹי:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם שֶׁלֹּא עָשַֽׂנִי עָֽבֶד:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם שֶׁלֹּא עָשַֽׂנִי אִשָּׁה:",
      "(נשים אומרות: בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם שֶׁעָשַֽׂנִי כִּרְצוֹנוֹ:)",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם פּוֹקֵֽחַ עִוְרִים:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם מַלְבִּישׁ עֲרֻמִּים:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם מַתִּיר אֲסוּרִים:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם זוֹקֵף כְּפוּפִים:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם רוֹקַע הָאָֽרֶץ עַל הַמָּֽיִם:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם שֶׁעָשָׂה לִי כָּל־צָרְכִּי:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם הַמֵּכִין מִצְעֲדֵי גָֽבֶר:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם אוֹזֵר יִשְׂרָאֵל בִּגְבוּרָה:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם עוֹטֵר יִשְׂרָאֵל בְּתִפְאָרָה:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם הַנּוֹתֵן לַיָּעֵף כֹּֽחַ:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם הַמַּעֲבִיר שֵׁנָה מֵעֵינָי וּתְנוּמָה מֵעַפְעַפָּי:",
      "וִיהִי רָצוֹן מִלְּ֒פָנֶֽיךָ יְהֹוָה אֱלֹהֵֽינוּ וֵאלֹהֵי אֲבוֹתֵֽינוּ שֶׁתַּרְגִּילֵֽנוּ בְּתוֹרָתֶֽךָ וְדַבְּ֒קֵֽנוּ בְּמִצְוֹתֶֽיךָ, וְאַל תְּבִיאֵֽנוּ לֹא לִידֵי חֵטְא וְלֹא לִידֵי עֲבֵרָה וְעָוֹן וְלֹא לִידֵי נִסָּיוֹן וְלֹא לִידֵי בִזָּיוֹן וְאַל יִשְׁלֹט בָּֽנוּ יֵֽצֶר הָרָע וְהַרְחִיקֵֽנוּ מֵאָדָם רָע וּמֵחָבֵר רָע וְדַבְּ֒קֵֽנוּ בְּיֵֽצֶר הַטּוֹב וּבְמַעֲשִׂים טוֹבִים וְכוֹף אֶת־יִצְרֵֽנוּ לְהִשְׁתַּעְבֶּד־לָךְ וּתְנֵֽנוּ הַיּוֹם וּבְכָל־יוֹם לְחֵן וּלְחֶֽסֶד וּלְרַחֲמִים בְּעֵינֶֽיךָ וּבְעֵינֵי כָל־רוֹאֵֽינוּ וְתִגְמְ֒לֵֽנוּ חֲסָדִים טוֹבִים: בָּרוּךְ אַתָּה יְהֹוָה גּוֹמֵל חֲסָדִים טוֹבִים לְעַמּוֹ יִשְׂרָאֵל:",
      "יְהִי רָצוֹן מִלְּ֒פָנֶֽיךָ יְהֹוָה אֱלֹהַי וֵאלֹהֵי אֲבוֹתַי שֶׁתַּצִּילֵֽנִי הַיּוֹם וּבְכָל־יוֹם מֵעַזֵּי פָנִים וּמֵעַזּוּת פָּנִים מֵאָדָם רָע וּמֵחָבֵר רָע וּמִשָּׁכֵן רָע וּמִפֶּֽגַע רָע וּמִשָּׂטָן הַמַּשְׁחִית מִדִּין קָשֶׁה וּמִבַּֽעַל דִּין קָשֶׁה, בֵּין שֶׁהוּא בֶן בְּרִית וּבֵין שֶׁאֵינוֹ בֶן בְּרִית:"
    ],
    "en": [
      "Blessed are You, Adonoy our God, King of the Universe, Who gives the rooster understanding to distinguish between day and night.",
      "Blessed are You, Adonoy our God, King of the Universe, Who did not make me a gentile.",
      "Blessed are You, Adonoy our God, King of the Universe, Who did not make me a slave.",
      "Blessed are You, Adonoy our God, King of the Universe, Who did not make me a woman.",
      "(A woman says: Blessed are You, Adonoy our God, King of the Universe, Who made me according to His will.)",
      "Blessed are You, Adonoy our God, King of the Universe, Who gives sight to the blind.",
      "Blessed are You, Adonoy our God, King of the Universe, Who clothes the naked.",
      "Blessed are You, Adonoy our God, King of the Universe, Who releases the imprisoned.",
      "Blessed are You, Adonoy our God, King of the Universe, Who straightens the bent.",
      "Blessed are You, Adonoy our God, King of the Universe, Who spreads the earth above the waters.",
      "Blessed are You, Adonoy our God, King of the Universe, Who provided me with all my needs.",
      "Blessed are You, Adonoy our God, King of the Universe, Who prepares the steps of man.",
      "Blessed are You, Adonoy our God, King of the Universe, Who girds Israel with might.",
      "Blessed are You, Adonoy our God, King of the Universe, Who crowns Israel with glory.",
      "Blessed are You, Adonoy our God, King of the Universe, Who gives strength to the weary.",
      "Blessed are You, Adonoy our God, King of the Universe, Who removes sleep from my eyes and slumber from my eyelids.",
      "And may it be Your will Adonoy, our God And God of our fathers, to make us study Torah regularly, and hold fast to Your commandments. Do not bring us into the grasp of sin, nor into the grasp of transgression or iniquity. Do not cause us to be tested, or brought to disgrace. Let us not be ruled over by the Evil Inclination. Keep us far from an evil person, and from an evil companion. Make us hold fast to the Good Inclination, and to good deeds, and compel our Evil Inclination to be subservient to You. Grant us this day and every day favor, kindness, and compassion in Your eyes and in the eyes of all who see us, and bestow bountiful kindness upon us, Blessed are You, Adonoy, Who bestows bountiful kindness upon His people Israel.",
      "May it be Your will, Adonoy, my God and God of my fathers, to save me today and every day from arrogant men and from arrogance; from an evil man, from an evil companion, from an evil neighbor; from an evil mishap and from the destructive Satan; from a difficult judgment and a difficult opponent, whether he is a [fellow Jew] or not a [fellow Jew]."
    ]
  },
  "shema": {
    "he": [
      "יחיד אומר",
      "אֵל מֶֽלֶךְ נֶאֱמָן:",
      "שְׁמַע יִשְׂרָאֵל יְהֹוָה אֱלֹהֵֽינוּ יְהֹוָה אֶחָד:",
      "יש להפסיק מעט בין אחד לברוך כי עיקר קבול עול מלכות שמים היא פסוק ראשון. ויאמר בלחש:",
      "בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד:",
      "וְאָהַבְתָּ אֵת יְהֹוָה אֱלֹהֶֽיךָ בְּכָל֯־לְ֯בָבְ֒ךָ וּבְכָל־נַפְשְׁ֒ךָ וּבְכָל־מְאֹדֶֽךָ: וְהָיוּ הַדְּ֒בָרִים הָאֵֽלֶּה אֲשֶׁר֯ אָ֯נֹכִי מְצַוְּ֒ךָ הַיּוֹם עַל֯־לְ֯בָבֶֽךָ: וְשִׁנַּנְתָּם לְבָנֶֽיךָ וְדִבַּרְתָּ בָּם בְּשִׁבְתְּ֒ךָ בְּבֵיתֶֽךָ וּבְלֶכְתְּ֒ךָ בַדֶּֽרֶךְ וּבְשָׁכְבְּ֒ךָ וּבְקוּמֶֽךָ: וּקְשַׁרְתָּם לְאוֹת עַל֯־יָ֯דֶֽךָ וְהָיוּ לְטֹטָפֹת בֵּין עֵינֶֽיךָ: וּכְתַבְתָּם עַל־מְזֻזוֹת בֵּיתֶֽךָ וּבִשְׁעָרֶֽיךָ:",
      "וְהָיָה אִם־שָׁמֹֽעַ תִּשְׁמְ֒עוּ אֶל־מִצְוֹתַי אֲשֶׁר֯ אָ֯נֹכִי מְצַוֶּה אֶתְכֶם הַיּוֹם לְאַהֲבָה אֶת־יְהֹוָה אֱלֹהֵיכֶם וּלְעָבְדוֹ בְּכָל֯־לְ֯בַבְכֶם וּבְכָל־נַפְשְׁ֒כֶם: וְנָתַתִּי מְטַר֯־אַ֯רְצְ֒כֶם בְּעִתּוֹ֯ י֯וֹרֶה וּמַלְקוֹשׁ וְאָסַפְתָּ דְגָנֶֽךָ וְתִירשְׁ֒ךָ וְיִצְהָרֶֽךָ: וְנָתַתִּי עֵֽשֶׂב֯ בְּ֯שָׂדְ֒ךָ לִבְהֶמְתֶּֽךָ וְאָכַלְתָּ וְשָׂבָֽעְתָּ: הִשָּׁמְ֒רוּ לָכֶם פֶּן֯־יִ֯פְתֶּה לְבַבְכֶם וְסַרְתֶּם וַעֲבַדְתֶּם אֱלֹהִים֯ אֲ֯חֵרִים וְהִשְׁתַּחֲוִיתֶם לָהֶם: וְחָרָה אַף־יְהֹוָה בָּכֶם וְעָצַר֯ אֶ֯ת־הַשָּׁמַֽיִם וְלֹא֯־יִ֯הְיֶה מָטָר וְהָאֲדָמָה לֹא תִתֵּן אֶת֯־יְ֯בוּלָהּ וַאֲבַדְתֶּם֯ מְ֯הֵרָה מֵעַל הָאָֽרֶץ הַטֹּבָה אֲשֶׁר֯ יְ֯הֹוָה נֹתֵן לָכֶם: וְשַׂמְתֶּם֯ אֶ֯ת־דְּבָרַי֯ אֵֽ֯לֶּה עַל֯־לְ֯בַבְכֶם וְעַל־נַפְשְׁ֒כֶם וּקְשַׁרְתֶּם֯ אֹ֯תָם לְאוֹת עַל֯־יֶ֯דְכֶם וְהָיוּ לְטוֹטָפֹת בֵּין עֵינֵיכֶם: וְלִמַּדְתֶּם֯ אֹ֯תָם אֶת־בְּנֵיכֶם לְדַבֵּר בָּם בְּשִׁבְתְּ֒ךָ בְּבֵיתֶֽךָ וּבְלֶכְתְּ֒ךָ בַדֶּֽרֶךְ וּבְשָׁכְבְּ֒ךָ וּבְקוּמֶֽךָ: וּכְתַבְתָּם עַל־מְזוּזוֹת בֵּיתֶֽךָ וּבִשְׁעָרֶֽיךָ: לְמַֽעַן֯ יִ֯רְבּוּ יְמֵיכֶם וִימֵי בְנֵיכֶם עַל הָאֲדָמָה אֲשֶׁר נִשְׁבַּע יְהֹוָה לַאֲבֹתֵיכֶם לָתֵת לָהֶם כִּימֵי הַשָּׁמַֽיִם עַל־הָאָֽרֶץ:",
      "וַֽיֹּאמֶר֯ יְ֯הֹוָה֯ אֶ֯ל־משֶׁה לֵּאמֹר: דַּבֵּר֯ אֶ֯ל־בְּנֵי יִשְׂרָאֵל וְאָמַרְתָּ אֲלֵהֶם וְעָשׂוּ לָהֶם צִיצִת עַל־כַּנְפֵי בִגְ֒דֵיהֶם לְדֹרֹתָם וְנָתְ֒נוּ עַל־צִיצִת הַכָּנָף֯ פְּ֯תִיל תְּכֵֽלֶת: וְהָיָה לָכֶם לְצִיצִת וּרְאִיתֶם֯ אֹ֯תוֹ וּזְכַרְתֶּם֯ אֶ֯ת־כָּל־מִצְוֹת֯ יְ֯הֹוָה וַעֲשִׂיתֶם֯ אֹ֯תָם וְלֹא תָתֽוּרוּ אַחֲרֵי לְבַבְכֶם וְאַחֲרֵי עֵינֵיכֶם אֲשֶׁר֯־אַ֯תֶּם זֹנִים֯ אַ֯חֲרֵיהֶם: לְמַֽעַן תִּזְכְּ֒רוּ וַעֲשִׂיתֶם֯ אֶ֯ת־כָּל־מִצְוֹתָי וִהְיִיתֶם קְדשִׁים לֵאלֹהֵיכֶם: אֲנִי יְהֹוָה אֱלֹהֵיכֶם֯ אֲ֯שֶׁר הוֹצֵֽאתִי אֶתְכֶם֯ מֵ֯אֶֽרֶץ מִצְרַֽיִם לִהְיוֹת לָכֶם לֵאלֹהִים֯ אֲ֯נִי יְהֹוָה אֱלֹהֵיכֶם֯:",
      "יש לצרף אֱלֹהֵיכֶם לאֱמֶת",
      "אֱ֯מֶת",
      "שליח ציבור:",
      "יְהֹוָה אֱלֹהֵיכֶם֯ אֱ֯מֶת:"
    ],
    "en": [
      "The following three words should be said when praying without a minyan:",
      "(Almighty, faithful King)",
      "Hear, Israel: Adonoy is our God, Adonoy is One.",
      "The following two lines are to be said silently:",
      "Blessed [is His] Name, Whose glorious kingdom is forever and ever.",
      "And you shall love Adonoy your God with all your heart and with all your soul and with all your possessions. And these words which I command you today, shall be upon your heart. And you shall teach them sharply to your children. And you shall discuss them when you sit in your house, and when you travel on the road, and when you lie down and when you rise. And you shall bind them for a sign upon your hand, and they shall be for totafos between your eyes. And you shall write them upon the doorposts of your house and upon your gateways.",
      "And it will be— if you vigilantly obey My commandments which I command you this day, to love Adonoy your God, and serve Him with your entire hearts and with your entire souls— that I will give rain for your land in its proper time, the early (autumn) rain and the late (spring) rain; and you will harvest your grain and your wine and your oil. And I will put grass in your fields for your cattle, and you will eat and be satisfied. Beware lest your hearts be swayed and you turn astray, and you worship alien gods and bow to them. And Adonoy’s fury will blaze among you, and He will close off the heavens and there will be no rain and the earth will not yield its produce; and you will perish swiftly from the good land which Adonoy gives you. Place these words of Mine upon your hearts and upon your souls,— and bind them for a sign upon your hands, and they shall be for totafos between your eyes. And you shall teach them to your sons, to speak them when you sit in your house, and when you travel on the road, and when you lie down and when you rise. And you shall write them upon the doorposts of your house and upon your gateways. In order that your days be prolonged, and the days of your children, upon the land which Adonoy swore to your fathers to give them [for as long] as the heavens are above the earth.",
      "And Adonoy spoke to Moses saying: Speak to the children of Israel, and tell them to make for themselves fringes on the corners of their garments throughout their generations; and they will place with the fringes of each corner a thread of blue. And it will be to you for fringes, and you will look upon it and you will remember all the commandments of Adonoy, and you will perform them; and you will not turn aside after your hearts and after your eyes which cause you to go astray. In order that you will remember and perform all My commandments; and you will be holy unto your God. I am Adonoy, your God, Who brought you out of the land of Egypt to be your God: I am Adonoy, your God—",
      "You must be careful to connect the last words of Shema, ה’ אֱלֺקֵיכֶם (Adonoy, your God), with the word אמת (is true) without pause or interruption so that these three words form one sentence, meaning “Adonoy your God is true” (Maseches Berachos 13a).",
      "—is true—",
      "The chazan repeats:",
      "Adonoy, your God, is true."
    ]
  },
  "avot": {
    "he": [
      "המתפלל צריך שיכוין בליבו פירוש המילות שהוא מוציא בשפתיו. ואם אינו יכול לכוין פירוש המילות לכל הפחות צריך שיחשוב בשעת התפילה בדברים המכניעים את הלב ומכוונים את לבו לאביו שבשמים. יכוין רגליו זה אצל זה כאילו אינן אלא אחת. ויזהר להתפלל בלחש. ולא ירמוז בעיניו ולא יקרוץ בשפתיו ולא יראה באצבעותיו ואינו פוסק אפילו לקדיש וקדושה וברכו (קיצשו\"ע יח)",
      "אֲדֹנָי שְׂפָתַי תִּפְתָּח וּפִי יַגִּיד תְּהִלָּתֶֽךָ:",
      "בָּרוּךְ אַתָּה יְהֹוָה אֱלֹהֵֽינוּ וֵאלֹהֵי אֲבוֹתֵֽינוּ אֱלֹהֵי אַבְרָהָם אֱלֹהֵי יִצְחָק וֵאלֹהֵי יַעֲקֹב הָאֵל הַגָּדוֹל הַגִּבּוֹר וְהַנּוֹרָא אֵל עֶלְיוֹן גּוֹמֵל חֲסָדִים טוֹבִים וְקוֹנֵה הַכֹּל וְזוֹכֵר חַסְדֵי אָבוֹת וּמֵבִיא גוֹאֵל לִבְנֵי בְנֵיהֶם לְמַֽעַן שְׁמוֹ בְּאַהֲבָה:",
      "בעשי\"ת: זָכְרֵֽנוּ לְחַיִּים מֶֽלֶךְ חָפֵץ בַּחַיִּים וְכָתְבֵֽנוּ בְּסֵֽפֶר הַחַיִּים לְמַעַנְךָ אֱלֹהִים חַיִּים:",
      "אם לא אמר זכרנו ונזכר לאחר שכבר אמר בא\"י אינו חוזר אבל אם נזכר קודם שאמר השם אף שאמר ברוך אתה אומר זכרנו כו' מלך עוזר כסדר. הטועה ומזכיר זכרנו בשאר ימות השנה אם נזכר קודם שאמר וכתבנו פוסק ומתחיל מלך עוזר וגו' אבל אם אמר וכתבנו חוזר לראש התפלה. (דה\"ח)",
      "מֶֽלֶךְ עוֹזֵר וּמוֹשִֽׁיעַ וּמָגֵן: בָּרוּךְ אַתָּה יְהֹוָה מָגֵן אַבְרָהָם:"
    ],
    "en": [
      "Fundamentals of Kuzari, (Metsudah Publications, 1979) pages 269, 271, 273. When reciting Shemoneh Esrei, you must adhere to these rules: 1. Before beginning the prayer, take three steps backwards and then return to your former position. Upon completing the prayer, take three steps backwards and return. 2. Keep your feet together. 3. Concentrate on the meaning of the words you are uttering. Remove all distracting thoughts and worries from your mind. 4. You may not interrupt Shemoneh Esrei by talking, not even by answering Amein. If you should hear Kedushah, Kaddish, or Barechu while saying the Shemoneh Esrei, you should remain silent and listen to the Chazzan’s words. 5. At the beginning and end of the first blessing, at the beginning and end of the blessing that begins: “We are thankful to You,” (page 133) and ends with “The Beneficent is Your Name,” (page 140) we half-kneel and bow in the following manner: At the word “Blessed,” bend your knees; at the word “You,” bend forward until the vertebrae of your spinal cord are loosened; at “Adonoy,” return to your upright position in keeping with the verse, “Adonoy straightens the bent” (Psalms 146:8). 6. Each individual recites Shemoneh Esrei in silence. Only the prayer leader, the Chazzan, ever recites it aloud, and then only after the entire congregation, himself included, has recited it silently.",
      "My Master, open my lips, and my mouth will declare Your praise.",
      "Blessed are You, Adonoy, our God, and God of our fathers, God of Abraham, God of Isaac, and God of Jacob, the Almighty, the Great, the Powerful, the Awesome, most high Almighty, Who bestows beneficent kindness, Who possesses everything, Who remembers the piety of the Patriarchs, and Who brings a redeemer to their children’s children, for the sake of His Name, with love.",
      "(During the Ten Days of Penitence add: Remember us for life King, Who desires life; and inscribe us in the Book of Life, for Your sake, Living God.)",
      "If you forgot to say this, and became aware of your omission before saying the blessing, you should recite it. If you have already said “Blessed are You Adonoy,” you must continue the prayers without saying “Remember.”",
      "King, Helper, and Deliverer and Shield. Blessed are You, Adonoy, Shield of Abraham."
    ]
  },
  "avodah": {
    "he": [
      "רְצֵה יְהֹוָה אֱלֹהֵֽינוּ בְּעַמְּ֒ךָ יִשְׂרָאֵל וּבִתְפִלָּתָם וְהָשֵׁב אֶת הָעֲבוֹדָה לִדְבִיר בֵּיתֶֽךָ וְאִשֵּׁי יִשְׂרָאֵל וּתְפִלָּתָם בְּאַהֲבָה תְקַבֵּל בְּרָצוֹן וּתְהִי לְרָצוֹן תָּמִיד עֲבוֹדַת יִשְׂרָאֵל עַמֶּֽךָ:",
      "בראש חדש ובחול המועד אומרים זה:",
      "אֱלֹהֵֽינוּ וֵאלֹהֵי אֲבוֹתֵֽינוּ יַעֲלֶה וְיָבֹא וְיַגִּֽיעַ וְיֵרָאֶה וְיֵרָצֶה וְיִשָּׁמַע וְיִפָּקֵד וְיִזָּכֵר זִכְרוֹנֵֽנוּ וּפִקְדוֹנֵֽנוּ וְזִכְרוֹן אֲבוֹתֵֽינוּ. וְזִכְרוֹן מָשִֽׁיחַ בֶּן דָּוִד עַבְדֶּֽךָ. וְזִכְרוֹן יְרוּשָׁלַֽיִם עִיר קָדְשֶֽׁךָ. וְזִכְרוֹן כָּל עַמְּ֒ךָ בֵּית יִשְׂרָאֵל לְפָנֶֽיךָ. לִפְלֵיטָה לְטוֹבָה לְחֵן וּלְחֶֽסֶד וּלְרַחֲמִים לְחַיִּים וּלְשָׁלוֹם. בְּיוֹם לר\"ח: רֹאשׁ הַחֹֽדֶשׁ הַזֶּה: לפסח: חַג הַמַּצּוֹת הַזֶּה: לסכות: חַג הַסֻּכּוֹת הַזֶּה: זָכְרֵֽנוּ יְהֹוָה אֱלֹהֵֽינוּ בּוֹ לְטוֹבָה. וּפָקְדֵֽנוּ בוֹ לִבְרָכָה. וְהוֹשִׁיעֵֽנוּ בוֹ לְחַיִּים. וּבִדְבַר יְשׁוּעָה וְרַחֲמִים חוּס וְחָנֵּֽנוּ וְרַחֵם עָלֵֽינוּ וְהוֹשִׁיעֵֽנוּ. כִּי אֵלֶֽיךָ עֵינֵֽינוּ כִּי אֵל מֶֽלֶךְ חַנּוּן וְרַחוּם אָֽתָּה:",
      "שכח ולא אמר יעלה ויבא אם נזכר קודם שאמר יהיו לרצון חוזר ומתחיל רצה. ואפלו אם נזכר קודם שהתחיל מודים כיון שסים ברכת המחזיר שכינתו לציון צריך להתחיל רצה. אך אם נזכר קודם ברכת המחזיר שכינתו לציון אומרו שם ומסים ותחזינה עינינו וכו'. ואם לא נזכר עד לאחר יהיו לרצון וגו' חוזר לראש התפלה.",
      "וְתֶחֱזֶֽינָה עֵינֵֽינוּ בְּשׁוּבְ֒ךָ לְצִיּוֹן בְּרַחֲמִים: בָּרוּךְ אַתָּה יְהֹוָה הַמַּחֲזִיר שְׁכִינָתוֹ לְצִיּוֹן:"
    ],
    "en": [
      "Be pleased, Adonoy, our God, with Your people, Israel, and their prayer; and restore the service to the Holy of Holies in Your abode, and the fire-offerings of Israel; and accept their prayer, lovingly and willingly. And may You always find pleasure with the service of Your people, Israel.",
      "On regular weekdays continue, “And may our eyes”. On Rosh Chodesh and on Chol HaMoed, the following prayer is added:",
      "Our God and God of our fathers, may there ascend, come, and reach, appear, be desired, and heard, counted and recalled our remembrance and reckoning; the remembrance of our fathers; the remembrance of the Messiah the son of David, Your servant; the remembrance of Jerusalem, city of Your Sanctuary and the remembrance of Your entire people, the House of Israel, before You for survival, for well-being, for favor, kindliness, compassion, for life and peace on this day of the: Rosh Chodesh/Festival of Matzos/Festival of Sukkos. Remember us Adonoy, our God, on this day for well-being; be mindful of us on this day for blessing, and deliver us for life. In accord with the promise of deliverance and compassion, spare us and favor us, have compassion on us and deliver us; for our eyes are directed to You, because You are the Almighty Who is King, Gracious, and Merciful.",
      "If you forgot to say this at Shacharis, (the Morning Service) or at Mincha (the Afternoon Service), but realized your omission before saying מוֹדִים, “We are thankful,” you should say it at that time and continue with מוֹדִים. If you became aware of your omission after saying “מוֹדִים” “We are thankful,” but before concluding the Shemoneh Esrei [and taking three steps backwards], start again from רְצֵה, “Be pleased.” If you had completed the Shemoneh Esrei and then remembered, you must repeat the entire Shemoneh Esrei from the beginning. If you are in doubt, follow the same procedure as above. If you had already said the Musaf prayer and recalled your omission, it is the opinion of some authorities, that the Shemoneh Esrei of Shacharis be repeated as a נְדָבָה, a free-will-offering of prayer, rather than an obligatory prayer.",
      "And may our eyes behold Your merciful return to Zion. Blessed are You, Adonoy, Who returns His Divine Presence to Zion."
    ]
  },
  "ashrei": {
    "he": [
      "אַשְׁרֵי יוֹשְׁ֒בֵי בֵיתֶֽךָ עוֹד יְהַלְלֽוּךָ סֶּֽלָה:",
      "אַשְׁרֵי הָעָם שֶׁכָּֽכָה לּוֹ אַשְׁרֵי הָעָם שֶׁיְהֹוָה אֱלֺהָיו:",
      "תְּהִלָּה לְדָוִד אֲרוֹמִמְךָ אֱלוֹהַי הַמֶּֽלֶךְ וַאֲבָרְ֒כָה שִׁמְךָ לְעוֹלָם וָעֶד:",
      "בְּכָל־יוֹם אֲבָרְ֒כֶֽךָ וַאֲהַלְלָה שִׁמְךָ לְעוֹלָם וָעֶד:",
      "גָּדוֹל יְהֹוָה וּמְהֻלָּל מְאֹד וְלִגְ֒דֻלָּתוֹ אֵין חֵֽקֶר:",
      "דּוֹר לְדוֹר יְשַׁבַּח מַעֲשֶׂיךָ וּגְבוּרֹתֶֽיךָ יַגִּֽידוּ:",
      "הֲדַר כְּבוֹד הוֹדֶֽךָ וְדִבְרֵי נִפְלְ֒אֹתֶֽיךָ אָשִֽׂיחָה:",
      "וֶעֱזוּז נוֹרְ֒אוֹתֶֽיךָ יֹאמֵֽרוּ וּגְדֻלָּתְ֒ךָ אֲסַפְּ֒רֶֽנָּה:",
      "זֵֽכֶר רַב־טוּבְ֒ךָ יַבִּֽיעוּ וְצִדְ֒קָתְ֒ךָ יְרַנֵּֽנוּ:",
      "חַנּוּן וְרַחוּם יְהֹוָה אֶֽרֶךְ אַפַּֽיִם וּגְדָל־חָֽסֶד:",
      "טוֹב־יְהֹוָה לַכֹּל וְרַחֲמָיו עַל־כָּל־מַעֲשָׂיו:",
      "יוֹדֽוּךָ יְהֹוָה כָּל־מַעֲשֶֽׂיךָ וַחֲסִידֶֽיךָ יְבָרְ֒כֽוּכָה:",
      "כְּבוֹד מַלְכוּתְ֒ךָ יֹאמֵֽרוּ וּגְבוּרָתְ֒ךָ יְדַבֵּֽרוּ:",
      "לְהוֹדִֽיעַ לִבְנֵי הָאָדָם גְּבוּרֹתָיו וּכְבוֹד הֲדַר מַלְכוּתוֹ:",
      "מַלְכוּתְ֒ךָ מַלְכוּת כָּל־עֹלָמִים וּמֶמְשַׁלְתְּ֒ךָ בְּכָל־דּוֹר וָדֹר:",
      "סוֹמֵךְ יְהֹוָה לְכָל־הַנֹּפְ֒לִים וְזוֹקֵף לְכָל־הַכְּ֒פוּפִים:",
      "עֵינֵי־כֹל אֵלֶֽיךָ יְשַׂבֵּֽרוּ וְאַתָּה נוֹתֵן־לָהֶם אֶת־אָכְלָם בְּעִתּוֹ:",
      "פּוֹתֵֽחַ אֶת־יָדֶֽךָ וּמַשְׂבִּֽיעַ לְכָל־חַי רָצוֹן:",
      "צַדִּיק יְהֹוָה בְּכָל־דְּרָכָיו וְחָסִיד בְּכָל־מַעֲשָׂיו:",
      "קָרוֹב יְהֹוָה לְכָל־קֹרְ֒אָיו לְכֹל אֲשֶׁר יִקְרָאֻֽהוּ בֶאֱמֶת:",
      "רְצוֹן־יְרֵאָיו יַעֲשֶׂה וְאֶת־שַׁוְעָתָם יִשְׁמַע וְיוֹשִׁיעֵם:",
      "שׁוֹמֵר יְהֹוָה אֶת־כָּל־אֹהֲבָיו וְאֵת כָּל־הָרְ֒שָׁעִים יַשְׁמִיד:",
      "תְּהִלַּת יְהֹוָה יְדַבֶּר פִּי וִיבָרֵךְ כָּל־בָּשָׂר שֵׁם קָדְשׁוֹ לְעוֹלָם וָעֶד:",
      "וַאֲנַֽחְנוּ נְבָרֵךְ יָהּ מֵעַתָּה וְעַד־עוֹלָם הַלְ֒לוּיָהּ:"
    ],
    "en": [
      "Fortunate are those who dwell in Your house; may they continue to praise You, Selah.",
      "Fortunate is the people whose lot is thus; Fortunate is the people for whom Adonoy is their God.",
      "A praise by David! I will exalt You, my God, the King, and bless Your Name forever and ever.",
      "Every day I will bless You and extol Your Name forever and ever.",
      "Adonoy is great and highly extolled, and His greatness is unfathomable.",
      "One generation to another will praise Your works and Your mighty acts they will declare.",
      "The splendor of Your glorious majesty, and the words of Your wonders I will speak.",
      "Of Your awesome might, they will speak, and Your greatness I will recount.",
      "Mention of Your bountifulness they will express, and in Your righteousness joyfully exult.",
      "Adonoy is gracious and compassionate, slow to anger and great in kindliness.",
      "Adonoy is good to all, His mercy encompasses all His works.",
      "All Your works will thank You, Adonoy, and Your pious ones will bless You.",
      "Of the honor of Your kingship, they will speak and Your might they will declare.",
      "To reveal to men His mighty acts, and the glorious splendor of His kingship.",
      "Your kingship is the kingship for all times, and Your dominion is in every generation.",
      "Adonoy supports all the fallen, and straightens all the bent.",
      "The eyes of all look expectantly to You, and You give them their food at its proper time.",
      "You open Your hand and satisfy the desire of every living being.",
      "Adonoy is just in all His ways, and benevolent in all His deeds.",
      "Adonoy is near to all who call upon Him, to all who call upon Him in truth.",
      "The will of those who fear Him He fulfills; He hears their cry and delivers them.",
      "Adonoy watches over all those who love Him, and will destroy all the wicked.",
      "Praise of Adonoy, my mouth will declare, and all flesh will bless His holy Name forever and ever.",
      "And we will bless God from now on forever. Praise God."
    ]
  }
};

const SECTIONS = [
  { id: 'modeh-ani',         hebrew: 'מוֹדֶה אֲנִי',      name: 'Modeh Ani',      subtitle: 'Gratitude on waking',      lookupRef: 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Modeh Ani' },
  { id: 'asher-yatzar',      hebrew: 'אֲשֶׁר יָצַר',      name: 'Asher Yatzar',   subtitle: 'The body as a wonder',     lookupRef: 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Asher Yatzar' },
  { id: 'morning-blessings', hebrew: 'בִּרְכוֹת הַשַּׁחַר', name: 'Birkot HaShachar', subtitle: 'Morning blessings',    lookupRef: 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Morning Blessings' },
  { id: 'shema',             hebrew: 'קְרִיאַת שְׁמַע',    name: 'Shema',          subtitle: 'Declaration of unity',     lookupRef: 'Siddur Ashkenaz, Weekday, Shacharit, Blessings of the Shema, Shema' },
  { id: 'avot',              hebrew: 'אָבוֹת',             name: 'Avot',           subtitle: 'Amidah: the Patriarchs',  lookupRef: 'Siddur Ashkenaz, Weekday, Shacharit, Amidah, Patriarchs' },
  { id: 'avodah',            hebrew: 'עֲבוֹדָה',           name: 'Avodah',         subtitle: 'Amidah: Temple service',  lookupRef: 'Siddur Ashkenaz, Weekday, Shacharit, Amidah, Temple Service' },
  { id: 'ashrei',            hebrew: 'אַשְׁרֵי',           name: 'Ashrei',         subtitle: 'Tehillim 145',            lookupRef: 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei Dezimra, Ashrei' },
];

const COLORS = {
  parchment: '#F3ECDC',
  parchmentDeep: '#E8DEC5',
  ink: '#1C1814',
  inkSoft: 'rgba(28, 24, 20, 0.66)',
  inkFaint: 'rgba(28, 24, 20, 0.38)',
  burgundy: '#6B2020',
  gold: '#9C7A2A',
};

const FONTS = {
  hebrew: "'Frank Ruhl Libre', 'David Libre', serif",
  display: "'Cormorant Garamond', 'Playfair Display', serif",
  body: "'EB Garamond', 'Source Serif Pro', Georgia, serif",
  label: "'Cormorant Garamond', serif",
};

const SAVED_WORDS_STORAGE = 'iyyun.savedWords';

// Pre-written commentary — keyed by "<section-id>-<paragraph-index>"
const BAKED_DEEPER = {
  'modeh-ani-0': `The prayer deliberately omits God's name — a halakhic necessity, since it is recited immediately upon waking, before washing one's hands, when pronouncing a formal blessing would be inappropriate. The Mishnah Berurah (1:8) stresses this: gratitude that requires nothing to be in place first is the most fundamental kind. The Siddur teaches you to thank God before you have even become ritually capable of doing so.

"שֶׁהֶחֱזַֽרְתָּ בִּי" — note the preposition בִּי, not לִי. The soul was not handed back *to* me from outside, but restored *within* me. The Maharal of Prague (Netzach Yisrael, ch. 1) teaches that sleep is the soul's partial departure — it hovers above the body. Upon return, the soul re-integrates; it does not merely re-enter. Waking is not retrieval but reunion.

"רַבָּה אֱמוּנָתֶֽךָ" quotes Lamentations 3:23 directly, from the most desolate book in Tanakh: "They are new every morning — great is Your faithfulness." Eikhah speaks of destruction; Modeh Ani borrows its language for renewal. This is not coincidence: every morning is built on the rubble of the night, and faithfulness means trusting that renewal is still possible even from the deepest ruin.`,

  'asher-yatzar-0': `The blessing originates in Berakhot 60b, where Rav Yehuda recited it after using the bathroom. Its structure is unusual: rather than thanking God for what He does, it is structured around what would happen if something went wrong — "it would be impossible to exist and stand before You." Rav Shimshon Raphael Hirsch identifies this as a characteristic pattern of Jewish gratitude: recognizing the gift by imagining its absence. You don't notice the body until it fails; this blessing forces that awareness into daily speech.

"נְקָבִים נְקָבִים חֲלוּלִים חֲלוּלִים" — each noun is doubled rather than simply pluralized. The Taz (OC 6:1) explains this as emphasizing variety: "openings upon openings, hollows upon hollows" — many different kinds of each, not merely many of one kind. The body is not a single system but layered systems, each its own category of wonder.

"מַפְלִיא לַעֲשׂוֹת" — "performs wonders." The Chida (Birkei Yosef OC 6) notes that this closing phrase deliberately places the body's ordinary function — digestion, circulation, respiration — into the category of פְּלִיאָה (wonder). The Talmud (Niddah 31a) records R. Yishmael teaching anatomy to students as a lesson in theology: the miracle is not dramatic intervention but daily sustaining. Kavanah: this is not a formula. It is an acknowledgment that the body worked again.`,

  'morning-blessings-0': `The word שֶׂכְוִי is disputed. Most render it "rooster," following the Talmudic gloss (Berakhot 60b). But Ibn Ezra on Job 38:36 — where the same word appears alongside טֻחוֹת (inner wisdom) — argues it means "heart" or "mind." If so, the blessing thanks God not for the rooster's crow but for the human heart's capacity to discern night from day, to know when it is time to rise. The Ohr HaChaim accepts both readings: God gave the rooster discernment, and God gave the human heart discernment to hear it.

The seven morning blessings in Berakhot 60b map onto the acts of waking in sequence: hearing the rooster → standing → opening eyes → getting dressed → tying shoes → walking → putting on a belt. Each blessing thanks God for the specific physical act of resuming life. The Tur (OC 46) notes these blessings were originally recited at the moment of each action; they were moved to synagogue because most people were too rushed to say them at the right time — a concession to human reality that permanently reshaped the structure of Shacharit.`,

  'shema-2': `The verse's grammar is odd: "יְהֹוָה אֱלֹהֵֽינוּ יְהֹוָה אֶחָד" — why repeat the divine name twice? The Sifri explains: "Adonoy is our God now; in the future He will be God of all." The first instance asserts a present, particular relationship — He is *our* God specifically. The second asserts ultimate universal sovereignty — He is One, absolutely. The verse is simultaneously a personal confession of present faith and an eschatological declaration.

Berakhot 13b rules that the dalet of אֶחָד must be elongated in recitation — long enough to consciously declare God's sovereignty in all four directions, heaven, and earth. The gematria of ד is 4; the word's full shape enacts the declaration. The Shulchan Aruch (OC 61:6) codifies this: the minimum is time enough to think of God as King over all directions. The elongation is not a cantillation convention — it is the mitzvah itself.

Berakhot 61b records R. Akiva's death under Roman torture. As the iron combs raked his flesh, he recited the Shema. His students called out: even now? He answered: "All my life I was troubled by the verse 'with all your soul' — even when He takes your soul. Now that the moment has come, shall I not fulfill it?" He died stretching the word אֶחָד. This is the kavanah the Shulchan Aruch wants in your mind when you lengthen that final letter.`,

  'avot-2': `"הָאֵל הַגָּדוֹל הַגִּבּוֹר וְהַנּוֹרָא" — these three attributes come from Devarim 10:17. Yoma 69b records that Jeremiah, witnessing the Temple's destruction, omitted "awesome" from his prayer — how can God be called awesome when foreigners desecrate His sanctuary? Daniel, watching Israel enslaved to Babylon, dropped "powerful." The Men of the Great Assembly restored all three and explained: God's greatness is most visible in His restraint — not destroying the wicked immediately is the supreme exercise of strength. His awesomeness is visible in Israel's survival at all. The blessing thus contains a complete theology of exile embedded in three adjectives.

"וְזוֹכֵר חַסְדֵי אָבוֹת" — biblical זָכַר (remember) always implies consequential action, not passive recall. The Ramban (Shemot 2:24) notes that God's "remembering" of the covenant with Abraham was immediately followed by the beginning of the Exodus — memory activates redemption. Kavanah at this word: you are not recalling history. You are invoking an active mechanism that was designed to respond.`,

  'ashrei-9': `חַנּוּן and רַחוּם are two distinct attributes placed together deliberately. חַנּוּן derives from חֵן — favor bestowed without merit, cold in its logic. רַחוּם comes from רֶחֶם (womb) — primal, biological, maternal love. Shemot Rabbah 33:1: just as a mother cannot forget the child of her womb, God cannot ultimately abandon Israel. The Psalm places both in God's character: pure logic and primal love coexist. Neither alone is sufficient; together they describe a God who gives even when there is no reason to, and who cannot stop even if He wanted to.

This verse is among the Thirteen Divine Attributes (Shemot 34:6–7). Rosh HaShanah 17b teaches that God showed Moshe this formula specifically as a structure for prayer: "whenever Israel sins, let them perform this order and I will forgive." The Ran (ad loc.) makes a striking point — we are not imitating God's character by reciting His names; we are activating a covenant clause. These are not descriptions. They are terms of a legal agreement concluded at Sinai.

Psalm 145 is an alphabetical acrostic that skips the letter nun entirely. The Talmud (Berakhot 4b) explains: nun begins נְפִילָה (falling), evoking Amos 5:2, "fallen is the virgin of Israel." By omitting nun, the Psalm enacts its own theology — praise that refuses to incorporate collapse. The verse immediately after in the acrostic (סוֹמֵךְ יְהֹוָה לְכָל הַנֹּפְלִים, "God supports all who fall") answers the omission directly: the fallen are not absent from the Psalm. They are held within it.`,

  'ashrei-16': `"יְשַׂבֵּֽרוּ" — not from שָׂבַע (to be satisfied) but from שָׂבַר (to hope, to wait in expectation). The eyes of all creation look to God *in hope*, not in satisfaction. This changes the verse's entire register: it describes not a completed act of feeding but a posture of oriented waiting. R. Levi Yitzchak of Berditchev teaches that this is the essence of prayer — not petition but direction, not demand but the posture of turning toward God before anything is given.

The following verse — "פּוֹתֵֽחַ אֶת יָדֶֽךָ" (You open Your hand) — is so important that the Talmud (Berakhot 4b) rules: one who recited Ashrei without kavvanah on this verse must repeat the entire Psalm. The Shulchan Aruch (OC 51:7) codifies this. No other single verse in the entire daily liturgy carries this specific halakhic requirement for conscious intent. The reason, as the Vilna Gaon explains, is that this verse is the entire theology of divine providence compressed into one line — that God feeds every living creature in its proper time.

Avoda Zara 3a records that God sustains even the tiny horania worm invisible in the depths of the millstone river — a creature no human has ever deliberately considered. The Chofetz Chaim reportedly kept this verse on a card at his desk and recited it whenever financial anxiety arose. Kavanah: pause on "בְּעִתּוֹ" — *in its time*. Not always now. Not always as expected. But the timing belongs to Him.`,
};

// ============================================================
// Helpers
// ============================================================
const NIKKUD_RE = /[\u0591-\u05C7]/g;
const stripNikkud = (s) => (s || '').replace(NIKKUD_RE, '');
const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();

// Split Hebrew text into tokens: words (clickable) vs separators (punctuation/spaces)
function tokenize(text) {
  const re = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7׳״]*/g;
  const parts = [];
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ word: false, text: text.slice(last, m.index) });
    parts.push({ word: true, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ word: false, text: text.slice(last) });
  return parts;
}

// Rank lexicon entries — prefer Klein (clean modern/biblical Hebrew),
// then BDB, then Jastrow. Skip entries that are just pointers.
const LEXICON_ORDER = {
  'Klein Dictionary': 1,
  'BDB Dictionary': 2,
  'BDB Augmented Strong': 3,
  'Jastrow Dictionary': 4,
};

function extractDefinition(entry) {
  const content = entry.content || {};
  const senses = Array.isArray(content.senses) ? content.senses : [];
  const collect = (arr) => {
    const out = [];
    for (const s of arr) {
      if (s && typeof s === 'object') {
        if (s.definition) out.push(stripHtml(s.definition));
        if (Array.isArray(s.senses)) out.push(...collect(s.senses));
      }
    }
    return out;
  };
  const defs = collect(senses).filter(Boolean);
  // Try top-level definition too
  if (!defs.length && content.definition) defs.push(stripHtml(content.definition));
  return defs;
}

function makeSavedWordKey({ word, lookupRef, phrase, custom }) {
  if (custom) return `custom|${stripNikkud(word || '')}|${stripNikkud(phrase || '')}`;
  return `${stripNikkud(word || '')}|${lookupRef || ''}|${stripNikkud(phrase || '')}`;
}

function parseSavedWords() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVED_WORDS_STORAGE);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildSavedWord({ wordInfo, lexicon, contextHint, selectedName }) {
  const primary = lexicon?.entries?.[0];
  const fallbackDefinition = contextHint?.text || primary?.definitions?.[0] || '';
  const sourceLabel = contextHint
    ? contextHint.label
    : primary
      ? primary.lexicon.replace(/\s*Dictionary$/i, '').replace(/BDB Augmented Strong/i, 'BDB')
      : 'Saved';

  return {
    key: makeSavedWordKey(wordInfo),
    word: wordInfo?.word || '',
    stripped: stripNikkud(wordInfo?.word || ''),
    phrase: wordInfo?.phrase || '',
    lookupRef: wordInfo?.lookupRef || '',
    sectionName: selectedName || '',
    definition: fallbackDefinition,
    sourceLabel,
    headword: contextHint?.headword || primary?.headword || wordInfo?.word || '',
    notes: '',
    custom: false,
    savedAt: new Date().toISOString(),
  };
}

function getContextHint(wordInfo) {
  const word = stripNikkud(wordInfo?.word || '');
  const phrase = stripNikkud(wordInfo?.phrase || '');

  if (word === 'מודה' && phrase.includes('מודה אני')) {
    return {
      label: 'Context',
      headword: 'מוֹדֶה',
      text: 'Here this is the verbal form "I acknowledge / give thanks," not the noun מוֹדָה meaning "fashion." In Modeh Ani it functions as a first-person expression of gratitude: "I thank before You" or "I acknowledge before You."',
      keywords: ['thank', 'thanks', 'acknowledge', 'praise', 'confess', 'admit'],
      fallbackForms: ['ידה', 'ידי', 'יודה'],
    };
  }

  return null;
}

// ============================================================
// Lexicon cache — shared across the session
// ============================================================
const lexiconCache = new Map();

// Generate fallback forms by stripping common Hebrew prefixes.
// Sefaria's lexicon indexes headwords, not inflected forms, so
// "בחמלה" won't match but "חמלה" will.
function candidateForms(word) {
  const s = stripNikkud(word);
  if (!s) return [];
  const forms = new Set([s]);

  // Strip pronominal/possessive suffixes (ך, כם, נו, הם, הן, יו, ה, י)
  const stripSuffix = (str) => {
    const suffixes = ['תיך','נוך','יכם','יהם','יהן','יכן','נו','כם','כן','הם','הן','יו','יה','ך','ה','י','ם','ן','ת'];
    for (const suf of suffixes) {
      if (str.length >= suf.length + 2 && str.endsWith(suf)) {
        return str.slice(0, -suf.length);
      }
    }
    return str;
  };

  // ש+ה double prefix (e.g., שהחזרת)
  if (s.length >= 4 && s[0] === 'ש' && s[1] === 'ה') forms.add(s.slice(2));
  // Single-letter prefixes: ב, ו, כ, ל, מ, ש, ה
  if (s.length >= 3 && 'בוכלמשה'.includes(s[0])) forms.add(s.slice(1));
  // Two-letter prefixes
  if (s.length >= 4) {
    const two = s.slice(0, 2);
    if (['ול','וב','וכ','ומ','כש','לכ','מה','וה','שה','ובה','ולה'].includes(two)) {
      forms.add(s.slice(2));
    }
  }

  // Also try stripping suffixes from each candidate
  const withSuffixStripped = new Set();
  for (const f of forms) {
    const stripped = stripSuffix(f);
    if (stripped !== f && stripped.length >= 2) withSuffixStripped.add(stripped);
  }
  for (const f of withSuffixStripped) forms.add(f);

  return [...forms];
}

function flattenDefinitions(entry) {
  return (entry.definitions || []).join(' ').toLowerCase();
}

function scoreEntry(entry, contextHint) {
  let score = entry.rank * 10;
  const defs = flattenDefinitions(entry);
  const morphology = (entry.morphology || '').toLowerCase();
  const languageCode = (entry.languageCode || '').toLowerCase();

  if (contextHint?.keywords?.length) {
    const matchesKeyword = contextHint.keywords.some((k) => defs.includes(k));
    if (matchesKeyword) score -= 40;
    else score += 25;
  }

  if (defs.includes('fashion')) score += 40;
  if (defs.includes('ship') || defs.includes('fleet') || defs.includes('hand')) score += 20;
  if (morphology.includes('verb') || morphology.includes('hif') || morphology.includes('participle')) score -= 10;
  if (morphology.includes('n.') || morphology.includes('f.n.') || morphology.includes('m.n.')) score += 5;
  if (languageCode === 'fw') score += 25;

  return score;
}

async function fetchLexiconEntries(form, lookupRef) {
  const params = new URLSearchParams();
  if (lookupRef) params.set('lookup_ref', lookupRef);
  const query = params.toString();
  const url = `https://www.sefaria.org/api/words/${encodeURIComponent(form)}${query ? `?${query}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const raw = Array.isArray(data) ? data : [];
  return raw.map((e) => ({
    headword: e.headword || '',
    lexicon: e.parent_lexicon || 'Unknown',
    morphology: (e.content && e.content.morphology) || '',
    definitions: extractDefinition(e),
    rank: LEXICON_ORDER[e.parent_lexicon] || 99,
    languageCode: e.language_code || '',
  })).filter((e) => e.definitions.length > 0);
}

async function lookupLexicon(word, lookupRef, contextHint) {
  const key = `${stripNikkud(word)}|${lookupRef || ''}`;
  if (!stripNikkud(word)) return { entries: [], triedForms: [] };
  if (lexiconCache.has(key)) return lexiconCache.get(key);

  const forms = candidateForms(word);
  const fallbackForms = (contextHint?.fallbackForms || []).filter(Boolean);
  const allForms = [...new Set([...forms, ...fallbackForms])];
  const entries = [];
  let usedForm = stripNikkud(word);
  const triedForms = [];

  for (const form of allForms) {
    triedForms.push(form);
    try {
      const normalized = await fetchLexiconEntries(form, lookupRef);
      if (normalized.length === 0) continue;
      entries.push(...normalized);
      if (usedForm === stripNikkud(word)) usedForm = form;
    } catch (e) {
      // try next candidate form
    }
  }

  entries.sort((a, b) => scoreEntry(a, contextHint) - scoreEntry(b, contextHint));
  const seen = new Set();
  const deduped = [];
  for (const e of entries) {
    if (seen.has(e.lexicon)) continue;
    seen.add(e.lexicon);
    deduped.push(e);
    if (deduped.length >= 3) break;
  }

  const result = { entries: deduped, usedForm, triedForms };
  lexiconCache.set(key, result);
  return result;
}

// ============================================================
// Word bottom sheet
// ============================================================
function WordSheet({ wordInfo, onClose, onSaveWord, onRemoveWord, isSaved, selectedName }) {
  const [lexicon, setLexicon] = useState(null);
  const [lexiconLoading, setLexiconLoading] = useState(true);

  const word = wordInfo?.word;
  const contextHint = getContextHint(wordInfo);

  useEffect(() => {
    if (!word) return;
    setLexicon(null);
    setLexiconLoading(true);
    lookupLexicon(word, wordInfo?.lookupRef, contextHint)
      .then(setLexicon)
      .catch(() => setLexicon({ entries: [], triedForms: [] }))
      .finally(() => setLexiconLoading(false));
  }, [word, wordInfo?.lookupRef, contextHint]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!word) return null;
  const stripped = stripNikkud(word);
  const primary = lexicon?.entries?.[0];
  const rest = lexicon?.entries?.slice(1) || [];
  const canSave = Boolean(contextHint?.text || primary?.definitions?.[0]);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(28,24,20,0.35)',
          zIndex: 50, animation: 'fadein 0.2s ease',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          maxHeight: '70vh',
          background: COLORS.parchment,
          borderTop: `1px solid ${COLORS.gold}66`,
          boxShadow: '0 -8px 40px rgba(28,24,20,0.2)',
          zIndex: 51,
          overflowY: 'auto',
          borderRadius: '12px 12px 0 0',
          animation: 'slideup 0.3s cubic-bezier(0.2, 0.9, 0.2, 1)',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: '40px', height: '4px', background: `${COLORS.ink}22`, borderRadius: '2px' }} />
        </div>

        <div style={{ padding: '8px 24px 28px', maxWidth: '640px', margin: '0 auto' }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div dir="rtl" lang="he" style={{ fontFamily: FONTS.hebrew, fontSize: '32px', lineHeight: 1.1, color: COLORS.ink, fontWeight: 500 }}>
                {word}
              </div>
              {stripped !== word && (
                <div dir="rtl" style={{ fontFamily: FONTS.hebrew, fontSize: '15px', color: COLORS.inkFaint, marginTop: '4px' }}>
                  {stripped}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  if (!canSave) return;
                  if (isSaved) {
                    onRemoveWord?.(makeSavedWordKey(wordInfo));
                  } else {
                    onSaveWord?.(buildSavedWord({ wordInfo, lexicon, contextHint, selectedName }));
                  }
                }}
                disabled={!canSave}
                style={{
                  border: `1px solid ${isSaved ? COLORS.burgundy : COLORS.gold}66`,
                  background: isSaved ? `${COLORS.burgundy}12` : 'transparent',
                  color: isSaved ? COLORS.burgundy : COLORS.gold,
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  opacity: canSave ? 1 : 0.45,
                  padding: '8px 10px',
                  fontFamily: FONTS.label,
                  fontSize: '11px',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                {isSaved ? 'Saved' : 'Save word'}
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{ border: 'none', background: 'transparent', color: COLORS.inkSoft, cursor: 'pointer', padding: '8px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* loading */}
          {lexiconLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: COLORS.inkFaint, fontStyle: 'italic', padding: '12px 0' }}>
              <Loader2 size={16} className="animate-spin" />
              Looking up…
            </div>
          )}

          {/* primary entry */}
          {contextHint && (
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                <div dir="rtl" style={{ fontFamily: FONTS.hebrew, fontSize: '26px', color: COLORS.ink, fontWeight: 500 }}>
                  {contextHint.headword}
                </div>
                <div style={{
                  fontFamily: FONTS.label,
                  fontSize: '10px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: COLORS.burgundy,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  {contextHint.label}
                </div>
              </div>
              <div style={{
                fontFamily: FONTS.display,
                fontSize: '20px',
                lineHeight: 1.4,
                color: COLORS.ink,
                fontWeight: 500,
                padding: '12px 14px',
                background: `${COLORS.burgundy}0C`,
                borderLeft: `2px solid ${COLORS.burgundy}`,
              }}>
                {contextHint.text}
              </div>
            </div>
          )}

          {!lexiconLoading && primary && (
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                <div dir="rtl" style={{ fontFamily: FONTS.hebrew, fontSize: '26px', color: COLORS.ink, fontWeight: 500 }}>
                  {primary.headword}
                </div>
                <div style={{
                  fontFamily: FONTS.label,
                  fontSize: '10px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: COLORS.gold,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  {primary.lexicon.replace(/\s*Dictionary$/i, '').replace(/BDB Augmented Strong/i, 'BDB')}
                </div>
              </div>
              {primary.morphology && (
                <div style={{ fontSize: '12px', color: COLORS.inkFaint, fontStyle: 'italic', marginBottom: '10px' }}>
                  {primary.morphology}
                </div>
              )}
              <div style={{
                fontFamily: FONTS.display,
                fontSize: '20px',
                lineHeight: 1.4,
                color: COLORS.ink,
                fontWeight: 500,
                padding: '12px 14px',
                background: `${COLORS.gold}0C`,
                borderLeft: `2px solid ${COLORS.gold}`,
              }}>
                {primary.definitions[0]}
              </div>
              {primary.definitions.length > 1 && (
                <ol style={{ margin: '12px 0 0', paddingLeft: '20px', color: COLORS.inkSoft, fontFamily: FONTS.body, fontSize: '14px', lineHeight: 1.6 }}>
                  {primary.definitions.slice(1, 4).map((d, j) => (
                    <li key={j} style={{ marginBottom: '4px' }}>{d}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* other lexicons */}
          {!lexiconLoading && rest.length > 0 && (
            <div style={{ marginTop: '8px', paddingTop: '14px', borderTop: `1px solid ${COLORS.ink}12` }}>
              <div style={{
                fontFamily: FONTS.label,
                fontSize: '10px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: COLORS.inkFaint,
                fontWeight: 700,
                marginBottom: '12px',
              }}>
                Other lexicons
              </div>
              {rest.map((entry, i) => (
                <div key={i} style={{
                  marginBottom: '14px',
                  paddingBottom: '14px',
                  borderBottom: i < rest.length - 1 ? `1px solid ${COLORS.ink}10` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px', gap: '12px' }}>
                    <div dir="rtl" style={{ fontFamily: FONTS.hebrew, fontSize: '20px', color: COLORS.ink, fontWeight: 500 }}>
                      {entry.headword}
                    </div>
                    <div style={{
                      fontFamily: FONTS.label,
                      fontSize: '10px',
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: COLORS.gold,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}>
                      {entry.lexicon.replace(/\s*Dictionary$/i, '').replace(/BDB Augmented Strong/i, 'BDB')}
                    </div>
                  </div>
                  {entry.morphology && (
                    <div style={{ fontSize: '11px', color: COLORS.inkFaint, fontStyle: 'italic', marginBottom: '4px' }}>
                      {entry.morphology}
                    </div>
                  )}
                  <ol style={{ margin: 0, paddingLeft: '18px', color: COLORS.ink, fontFamily: FONTS.body, fontSize: '14px', lineHeight: 1.55 }}>
                    {entry.definitions.slice(0, 3).map((d, j) => (
                      <li key={j} style={{ marginBottom: '3px' }}>{d}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}

          {/* no results */}
          {!lexiconLoading && (!lexicon || lexicon.entries.length === 0) && (
            <div style={{ color: COLORS.inkSoft, fontStyle: 'italic', fontSize: '14px', lineHeight: 1.6, padding: '12px 0' }}>
              No direct lexicon entry. This is likely an inflected form (participle, construct state, or word with prefix/suffix) that Sefaria's lexicons don't index. Try tapping a simpler form elsewhere, or look up the root on{' '}
              <a
                href={`https://www.sefaria.org/search?q=${encodeURIComponent(stripped)}&tab=text`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: COLORS.gold, textDecoration: 'underline' }}
              >
                Sefaria directly
              </a>
              .
            </div>
          )}

          <div style={{
            marginTop: '20px',
            fontSize: '10px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: COLORS.inkFaint,
            fontFamily: FONTS.label,
            fontWeight: 500,
            textAlign: 'center',
          }}>
            Lexicon · Sefaria
          </div>
        </div>
      </div>
    </>
  );
}


// ============================================================
// Hebrew line — renders text with tappable word tokens
// ============================================================
function HebrewLine({ text, onWordTap }) {
  const tokens = tokenize(text);
  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        fontFamily: FONTS.hebrew,
        fontSize: 'clamp(20px, 5vw, 24px)',
        lineHeight: 1.9,
        color: COLORS.ink,
        textAlign: 'right',
        fontWeight: 400,
      }}
    >
      {tokens.map((t, i) =>
        t.word ? (
          <span
            key={i}
            onClick={() => onWordTap({ word: t.text, phrase: text })}
            className="iyyun-word"
          >
            {t.text}
          </span>
        ) : (
          <span key={i}>{t.text}</span>
        )
      )}
    </div>
  );
}

function FlashcardsPanel({
  savedWords,
  flashcardIndex,
  setFlashcardIndex,
  revealFlashcard,
  setRevealFlashcard,
  manualWord,
  setManualWord,
  manualMeaning,
  setManualMeaning,
  onAddManualWord,
  onRemoveWord,
}) {
  const hasCards = savedWords.length > 0;
  const activeCard = hasCards ? savedWords[Math.min(flashcardIndex, savedWords.length - 1)] : null;

  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div dir="rtl" style={{ fontFamily: FONTS.hebrew, fontSize: 'clamp(32px, 8vw, 44px)', lineHeight: 1.1, color: COLORS.ink, fontWeight: 500 }}>
          אוצר מילים
        </div>
        <div style={{ marginTop: '12px', fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: COLORS.burgundy, fontFamily: FONTS.label, fontWeight: 600 }}>
          Flashcards
        </div>
        <div style={{ marginTop: '4px', fontStyle: 'italic', color: COLORS.inkSoft, fontSize: '14px' }}>
          Saved words for review and memorization
        </div>
      </div>

      <section style={{
        marginBottom: '28px',
        padding: '18px',
        background: `${COLORS.parchmentDeep}AA`,
        border: `1px solid ${COLORS.gold}22`,
      }}>
        <div style={{ fontFamily: FONTS.label, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: COLORS.burgundy, fontWeight: 700, marginBottom: '12px' }}>
          Add Word
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          <input
            value={manualWord}
            onChange={(e) => setManualWord(e.target.value)}
            placeholder="Hebrew word"
            dir="rtl"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: `1px solid ${COLORS.ink}22`,
              background: 'rgba(255,255,255,0.45)',
              color: COLORS.ink,
              padding: '11px 12px',
              fontFamily: FONTS.hebrew,
              fontSize: '20px',
            }}
          />
          <textarea
            value={manualMeaning}
            onChange={(e) => setManualMeaning(e.target.value)}
            placeholder="Meaning, translation, or note"
            rows={3}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: `1px solid ${COLORS.ink}22`,
              background: 'rgba(255,255,255,0.45)',
              color: COLORS.ink,
              padding: '11px 12px',
              fontFamily: FONTS.body,
              fontSize: '15px',
              resize: 'vertical',
            }}
          />
          <div>
            <button
              onClick={onAddManualWord}
              disabled={!manualWord.trim() || !manualMeaning.trim()}
              style={{
                border: `1px solid ${COLORS.ink}`,
                background: COLORS.ink,
                color: COLORS.parchment,
                cursor: manualWord.trim() && manualMeaning.trim() ? 'pointer' : 'not-allowed',
                opacity: manualWord.trim() && manualMeaning.trim() ? 1 : 0.45,
                padding: '9px 14px',
                fontFamily: FONTS.label,
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Add to deck
            </button>
          </div>
        </div>
      </section>

      <div style={{ marginBottom: '18px', textAlign: 'center', color: COLORS.inkSoft, fontSize: '14px' }}>
        {hasCards ? `${flashcardIndex + 1} of ${savedWords.length} saved` : 'No saved words yet'}
      </div>

      {activeCard ? (
        <section style={{
          padding: '24px',
          border: `1px solid ${COLORS.gold}33`,
          background: 'rgba(255,255,255,0.28)',
          minHeight: '320px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
              <div>
                <div dir="rtl" style={{ fontFamily: FONTS.hebrew, fontSize: 'clamp(34px, 10vw, 48px)', lineHeight: 1.1, color: COLORS.ink, fontWeight: 500 }}>
                  {activeCard.word}
                </div>
                {activeCard.sectionName && (
                  <div style={{ marginTop: '8px', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: COLORS.inkFaint, fontFamily: FONTS.label }}>
                    {activeCard.sectionName}
                  </div>
                )}
              </div>
              <button
                onClick={() => onRemoveWord(activeCard.key)}
                style={{
                  border: `1px solid ${COLORS.burgundy}55`,
                  background: 'transparent',
                  color: COLORS.burgundy,
                  cursor: 'pointer',
                  padding: '7px 10px',
                  fontFamily: FONTS.label,
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                Remove
              </button>
            </div>

            {revealFlashcard ? (
              <div style={{
                fontFamily: FONTS.display,
                fontSize: '24px',
                lineHeight: 1.5,
                color: COLORS.ink,
                padding: '16px 18px',
                background: `${COLORS.gold}0C`,
                borderLeft: `2px solid ${COLORS.gold}`,
                whiteSpace: 'pre-wrap',
              }}>
                {activeCard.definition}
              </div>
            ) : (
              <div style={{
                padding: '34px 18px',
                textAlign: 'center',
                border: `1px dashed ${COLORS.ink}22`,
                color: COLORS.inkFaint,
                fontFamily: FONTS.label,
                fontSize: '12px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}>
                Think first, then reveal
              </div>
            )}

            {activeCard.phrase && (
              <div style={{ marginTop: '18px' }}>
                <div style={{ fontFamily: FONTS.label, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: COLORS.inkFaint, marginBottom: '8px' }}>
                  Context
                </div>
                <div dir="rtl" style={{ fontFamily: FONTS.hebrew, fontSize: '18px', lineHeight: 1.8, color: COLORS.inkSoft }}>
                  {activeCard.phrase}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '26px', display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setFlashcardIndex((prev) => (prev - 1 + savedWords.length) % savedWords.length);
                  setRevealFlashcard(false);
                }}
                style={{
                  border: `1px solid ${COLORS.gold}66`,
                  background: 'transparent',
                  color: COLORS.gold,
                  cursor: 'pointer',
                  padding: '8px 14px',
                  fontFamily: FONTS.label,
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                Previous
              </button>
              <button
                onClick={() => {
                  setFlashcardIndex((prev) => (prev + 1) % savedWords.length);
                  setRevealFlashcard(false);
                }}
                style={{
                  border: `1px solid ${COLORS.gold}66`,
                  background: 'transparent',
                  color: COLORS.gold,
                  cursor: 'pointer',
                  padding: '8px 14px',
                  fontFamily: FONTS.label,
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                Next
              </button>
            </div>
            <button
              onClick={() => setRevealFlashcard((prev) => !prev)}
              style={{
                border: `1px solid ${COLORS.ink}`,
                background: COLORS.ink,
                color: COLORS.parchment,
                cursor: 'pointer',
                padding: '8px 14px',
                fontFamily: FONTS.label,
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              {revealFlashcard ? 'Hide answer' : 'Reveal answer'}
            </button>
          </div>
        </section>
      ) : (
        <section style={{
          padding: '28px 24px',
          textAlign: 'center',
          border: `1px dashed ${COLORS.ink}22`,
          color: COLORS.inkSoft,
          fontSize: '15px',
          lineHeight: 1.6,
        }}>
          Tap Hebrew words in the prayers and save them, or add your own word manually here.
        </section>
      )}
    </main>
  );
}

// ============================================================
// Main
// ============================================================
export default function Iyyun() {
  const [viewMode, setViewMode] = useState('text');
  const [selected, setSelected] = useState(SECTIONS[0]);
  const [deeperByKey, setDeeperByKey] = useState({});
  const [activeWordInfo, setActiveWordInfo] = useState(null);
  const [savedWords, setSavedWords] = useState(() => parseSavedWords());
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [revealFlashcard, setRevealFlashcard] = useState(false);
  const [manualWord, setManualWord] = useState('');
  const [manualMeaning, setManualMeaning] = useState('');

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=Cormorant+Garamond:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [selected]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SAVED_WORDS_STORAGE, JSON.stringify(savedWords));
  }, [savedWords]);

  useEffect(() => {
    if (savedWords.length === 0) {
      setFlashcardIndex(0);
      setRevealFlashcard(false);
      return;
    }
    if (flashcardIndex > savedWords.length - 1) {
      setFlashcardIndex(savedWords.length - 1);
    }
  }, [savedWords, flashcardIndex]);

  function saveWord(nextWord) {
    setSavedWords((prev) => {
      const existingIndex = prev.findIndex((item) => item.key === nextWord.key);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...nextWord };
        return updated;
      }
      return [nextWord, ...prev];
    });
  }

  function removeWord(key) {
    setSavedWords((prev) => prev.filter((item) => item.key !== key));
  }

  function addManualWord() {
    const word = manualWord.trim();
    const definition = manualMeaning.trim();
    if (!word || !definition) return;

    saveWord({
      key: makeSavedWordKey({ word, phrase: definition, custom: true }),
      word,
      stripped: stripNikkud(word),
      phrase: '',
      lookupRef: '',
      sectionName: 'Manual',
      definition,
      sourceLabel: 'Manual',
      headword: word,
      notes: '',
      custom: true,
      savedAt: new Date().toISOString(),
    });
    setManualWord('');
    setManualMeaning('');
    setViewMode('flashcards');
    setFlashcardIndex(0);
    setRevealFlashcard(false);
  }

  function goDeeper(index) {
    const key = `${selected.id}-${index}`;
    setDeeperByKey((prev) => ({ ...prev, [key]: BAKED_DEEPER[key] }));
  }

  const sectionData = SEFARIA_TEXT[selected.id] || { he: [], en: [] };
  const paragraphs = Array.from(
    { length: Math.max(sectionData.he.length, sectionData.en.length) },
    (_, i) => ({ he: sectionData.he[i] || '', en: sectionData.en[i] || '' })
  ).filter((p) => p.he || p.en);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(ellipse at top, ${COLORS.parchment} 0%, ${COLORS.parchmentDeep} 100%)`,
        color: COLORS.ink,
        fontFamily: FONTS.body,
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.06,
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <header style={{ padding: '48px 24px 28px', textAlign: 'center', borderBottom: `1px solid ${COLORS.ink}14` }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.32em', textTransform: 'uppercase', color: COLORS.burgundy, fontFamily: FONTS.label, fontWeight: 600, marginBottom: '10px' }}>
            · עיון ·
          </div>
          <h1 style={{ fontFamily: FONTS.display, fontWeight: 500, fontSize: 'clamp(28px, 7vw, 40px)', letterSpacing: '0.01em', lineHeight: 1.1, margin: 0 }}>
            Iyyun
          </h1>
          <p style={{ marginTop: '8px', fontStyle: 'italic', color: COLORS.inkSoft, fontSize: '15px', letterSpacing: '0.02em' }}>
            A study of weekday Shacharit, phrase by phrase
          </p>
          <p style={{ marginTop: '6px', fontSize: '12px', letterSpacing: '0.12em', color: COLORS.inkFaint, fontFamily: FONTS.label }}>
            <BookOpen size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            Tap any word for its definition
          </p>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', color: COLORS.gold }}>
            <div style={{ height: '1px', width: '28px', background: COLORS.gold, opacity: 0.5 }} />
            <span style={{ fontSize: '10px', letterSpacing: '0.3em' }}>◆</span>
            <div style={{ height: '1px', width: '28px', background: COLORS.gold, opacity: 0.5 }} />
          </div>
        </header>

        <nav style={{ overflowX: 'auto', whiteSpace: 'nowrap', padding: '20px 16px', borderBottom: `1px solid ${COLORS.ink}10`, WebkitOverflowScrolling: 'touch' }}>
          <button
            onClick={() => setViewMode('text')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '10px',
              padding: '10px 16px',
              borderRadius: '2px',
              border: viewMode === 'text' ? `1px solid ${COLORS.ink}` : `1px solid ${COLORS.ink}22`,
              background: viewMode === 'text' ? COLORS.ink : 'transparent',
              color: viewMode === 'text' ? COLORS.parchment : COLORS.ink,
              cursor: 'pointer',
              fontFamily: FONTS.label,
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              minWidth: '130px',
            }}
          >
            Learn
          </button>
          <button
            onClick={() => setViewMode('flashcards')}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '2px',
              marginRight: '10px',
              padding: '10px 16px',
              borderRadius: '2px',
              border: viewMode === 'flashcards' ? `1px solid ${COLORS.ink}` : `1px solid ${COLORS.ink}22`,
              background: viewMode === 'flashcards' ? COLORS.ink : 'transparent',
              color: viewMode === 'flashcards' ? COLORS.parchment : COLORS.ink,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              fontFamily: FONTS.body,
              minWidth: '140px',
              textAlign: 'left',
            }}
          >
            <span style={{ fontFamily: FONTS.hebrew, fontSize: '18px', lineHeight: 1.1 }} dir="rtl">
              כרטיסיות
            </span>
            <span style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: viewMode === 'flashcards' ? 0.75 : 0.55, fontFamily: FONTS.label, fontWeight: 500 }}>
              {savedWords.length} saved
            </span>
          </button>
          {SECTIONS.map((s) => {
            const active = viewMode === 'text' && s.id === selected.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSelected(s);
                  setViewMode('text');
                }}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '2px',
                  marginRight: '10px',
                  padding: '10px 16px',
                  borderRadius: '2px',
                  border: active ? `1px solid ${COLORS.ink}` : `1px solid ${COLORS.ink}22`,
                  background: active ? COLORS.ink : 'transparent',
                  color: active ? COLORS.parchment : COLORS.ink,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  fontFamily: FONTS.body,
                  minWidth: '140px',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: FONTS.hebrew, fontSize: '18px', lineHeight: 1.1 }} dir="rtl">
                  {s.hebrew}
                </span>
                <span style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: active ? 0.75 : 0.55, fontFamily: FONTS.label, fontWeight: 500 }}>
                  {s.name}
                </span>
              </button>
            );
          })}
        </nav>

        {viewMode === 'flashcards' ? (
          <FlashcardsPanel
            savedWords={savedWords}
            flashcardIndex={flashcardIndex}
            setFlashcardIndex={setFlashcardIndex}
            revealFlashcard={revealFlashcard}
            setRevealFlashcard={setRevealFlashcard}
            manualWord={manualWord}
            setManualWord={setManualWord}
            manualMeaning={manualMeaning}
            setManualMeaning={setManualMeaning}
            onAddManualWord={addManualWord}
            onRemoveWord={removeWord}
          />
        ) : (
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>
          <div style={{ marginBottom: '36px', textAlign: 'center' }}>
            <div dir="rtl" style={{ fontFamily: FONTS.hebrew, fontSize: 'clamp(32px, 8vw, 44px)', lineHeight: 1.1, color: COLORS.ink, fontWeight: 500 }}>
              {selected.hebrew}
            </div>
            <div style={{ marginTop: '12px', fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: COLORS.burgundy, fontFamily: FONTS.label, fontWeight: 600 }}>
              {selected.name}
            </div>
            <div style={{ marginTop: '4px', fontStyle: 'italic', color: COLORS.inkSoft, fontSize: '14px' }}>
              {selected.subtitle}
            </div>
          </div>

          {paragraphs.map((p, i) => {
            const key = `${selected.id}-${i}`;
            const deeper = deeperByKey[key];
            const hasBaked = Boolean(BAKED_DEEPER[key]);
            return (
              <article key={i} style={{ marginBottom: '32px', paddingBottom: '28px', borderBottom: i < paragraphs.length - 1 ? `1px solid ${COLORS.ink}12` : 'none' }}>
                {p.he && <HebrewLine text={p.he} onWordTap={(info) => setActiveWordInfo({ ...info, lookupRef: selected.lookupRef })} />}
                {p.en && (
                  <div style={{ marginTop: p.he ? '14px' : 0, fontFamily: FONTS.body, fontSize: '16px', lineHeight: 1.65, color: COLORS.inkSoft, fontStyle: 'italic' }}>
                    {p.en}
                  </div>
                )}
                {(hasBaked || deeper) && (
                  <div style={{ marginTop: '16px' }}>
                    {!deeper && hasBaked && (
                      <button
                        onClick={() => goDeeper(i)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '7px 14px',
                          border: `1px solid ${COLORS.gold}66`,
                          background: 'transparent',
                          color: COLORS.gold,
                          fontFamily: FONTS.label,
                          fontSize: '12px',
                          letterSpacing: '0.22em',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          cursor: 'pointer',
                          borderRadius: '2px',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = `${COLORS.gold}14`; e.currentTarget.style.borderColor = COLORS.gold; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${COLORS.gold}66`; }}
                      >
                        <Sparkles size={12} strokeWidth={2} />
                        Go deeper
                      </button>
                    )}
                    {deeper && (
                      <div style={{ marginTop: '4px', padding: '20px 22px', background: `${COLORS.gold}0C`, borderLeft: `2px solid ${COLORS.gold}`, borderRadius: '1px', fontFamily: FONTS.body, fontSize: '15px', lineHeight: 1.75, color: COLORS.ink, whiteSpace: 'pre-wrap' }}>
                        <div style={{ fontFamily: FONTS.label, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: COLORS.gold, fontWeight: 700, marginBottom: '10px' }}>
                          · Iyyun ·
                        </div>
                        {deeper}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: `1px solid ${COLORS.ink}10`, textAlign: 'center', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: COLORS.inkFaint, fontFamily: FONTS.label, fontWeight: 500 }}>
            Text & lexicon via Sefaria · Commentary by Iyyun
            <div style={{ marginTop: '8px' }}>
              Built by{' '}
              <a href="https://github.com/Admiller007" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.burgundy, textDecoration: 'underline' }}>
                Aaron Miller
              </a>
            </div>
          </div>
        </main>
        )}
      </div>

      <WordSheet
        wordInfo={activeWordInfo}
        onClose={() => setActiveWordInfo(null)}
        onSaveWord={saveWord}
        onRemoveWord={removeWord}
        isSaved={activeWordInfo ? savedWords.some((item) => item.key === makeSavedWordKey(activeWordInfo)) : false}
        selectedName={selected.name}
      />

      <style>{`
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.ink}22; border-radius: 3px; }
        @keyframes fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
        article { animation: fadein 0.4s ease both; }
        .iyyun-word {
          cursor: pointer;
          border-radius: 2px;
          padding: 0 1px;
          transition: background 0.15s ease, color 0.15s ease;
          border-bottom: 1px dotted transparent;
        }
        .iyyun-word:hover {
          background: ${COLORS.gold}1F;
          border-bottom-color: ${COLORS.gold};
        }
        .iyyun-word:active {
          background: ${COLORS.gold}33;
        }
      `}</style>
    </div>
  );
}
