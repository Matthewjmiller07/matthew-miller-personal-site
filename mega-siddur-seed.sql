-- Starter commentary for the Mega Siddur (run after mega-siddur-supabase-setup.sql).
-- These are anchored by prayer_names, so each follows its prayer into every
-- service and nusach whose section has that name.

insert into public.siddur_commentary (prayer_names, kind, title, anchor_text, body, author, source, source_pages, source_url, tags) values
(
  '{modeh ani}', 'history', 'A late arrival to the siddur', 'מוֹדֶה אֲנִי',
  'Modeh Ani is not in the Talmud or the Geonic siddurim. Its earliest known appearance is in *Seder HaYom* by R. Moshe ibn Makhir of Safed (first printed Venice, 1599), from where it spread into nearly every rite.

Because it contains no Divine Name, the custom is to say it immediately on waking, even before washing the hands.',
  null, 'Seder HaYom; Mishnah Berurah 1:8', null, 'https://www.sefaria.org/Mishnah_Berurah.1.8', '{origins,morning}'
),
(
  '{patriarchs}', 'halacha', 'Where we bow', 'בָּרוּךְ אַתָּה',
  'The Talmud fixes four bows in the Amidah: at the beginning and end of *Avot*, and at the beginning and end of *Modim*. Adding bows at the beginning or end of other blessings is discouraged.

Megillah 17b grounds the opening blessing in Psalms 29:1 — "Ascribe to the Lord, O sons of the mighty" (*havu la-Shem benei elim*) — read as "mention the Patriarchs before Him".',
  null, 'Berakhot 34a; Megillah 17b', null, 'https://www.sefaria.org/Berakhot.34a', '{amidah,bowing}'
),
(
  '{thanksgiving}', 'halacha', 'Modim — the second pair of bows', 'מוֹדִים אֲנַחְנוּ לָךְ',
  'Bow at *Modim* and again at *Barukh Attah* at its close (Berakhot 34a). During the leader''s repetition the congregation says *Modim DeRabbanan* quietly — a composite of the formulas of several Amoraim recorded at Sotah 40a.',
  null, 'Berakhot 34a; Sotah 40a', null, 'https://www.sefaria.org/Sotah.40a', '{amidah,bowing}'
),
(
  '{shema,the shema}', 'halacha', 'Covering the eyes', 'שְׁמַע יִשְׂרָאֵל',
  'Rabbi Yehudah HaNasi would pass his hands over his eyes while reciting the first verse (Berakhot 13b) — the source for covering the eyes so nothing distracts from accepting the yoke of Heaven. Intent (*kavanah*) is indispensable for the first verse.',
  null, 'Berakhot 13b', null, 'https://www.sefaria.org/Berakhot.13b', '{shema,kavanah}'
),
(
  '{alenu,aleinu}', 'history', 'From Rosh Hashanah to every day', 'עָלֵינוּ לְשַׁבֵּחַ',
  'Aleinu was composed as the introduction to *Malkhuyot* in the Rosh Hashanah Musaf — tradition attributes it to Rav (3rd c.). It entered the daily service as the closing prayer in medieval Ashkenaz and from there spread to all rites.

The line *she-hem mishtachavim le-hevel va-rik* was removed from many printed Ashkenazi siddurim under censorship; some congregations have restored it.',
  null, null, null, null, '{origins,censorship}'
);
