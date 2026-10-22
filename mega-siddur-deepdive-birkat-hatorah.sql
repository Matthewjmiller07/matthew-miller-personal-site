-- Mega Siddur deep dive: pesukim before Birkat HaTorah (applied 2026-10-22).
-- The deep dive follows the Torah blessings into every nusach; the three pointer notes sit on the
-- exact paragraphs (in Sefaria's Ashkenaz and Sefard siddurim) where verses come before the blessing.

insert into public.siddur_commentary (ref, segment, prayer_names, kind, title, anchor_text, body, source, source_url, tags, sort_order) values
(
  null, null, '{torah blessings,blessings on torah}', 'deepdive',
  'Verses before the blessing: which siddurim get the order right?', 'אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לַעֲסֹק בְּדִבְרֵי תוֹרָה',
  $body$Rabbi Elyada made the point that only the Koren siddur gets this right: it doesn't put verses like רֵאשִׁית חָכְמָה יִרְאַת ה׳ (Tehillim 111:10) before Birkat HaTorah. Many siddurim print that verse right after Modeh Ani, so the first words of Tanakh you say each morning come before the blessing over Torah. Is Koren really alone? Here is the halacha, then what each siddur actually prints.

**The halacha**

- **Shulchan Aruch OC 46:9.** "One should not read verses before Birkat HaTorah, even when saying them as supplication." Some say there is no concern when they are said only as supplication, but "it is proper to be concerned for the first view."
- **Rema, there.** The custom follows the lenient view: Selichot are said before the Torah blessings, and so are the verses said on entering shul. But "the custom is to arrange Birkat HaTorah immediately after Asher Yatzar, and one should not change it."
- **Mishnah Berurah 46:27–28.** Nowadays everyone is strict like the Tur and says no verses at all before Birkat HaTorah. So even in the Selichot season, say Birkat HaTorah before Selichot.
- **Sephardim** follow the Mechaber. Rav Ovadia Yosef reads the prohibition as a stringent custom, so someone caught in a minyan before blessing may still join Kedusha and the Thirteen Attributes (Yabia Omer 4 OC 7; 9 OC 108:29).
- **Doing a mitzvah is different.** Putting on tzitzit before Birkat HaTorah is fine (Biur HaGra 47:10; Mishnah Berurah 47:7). Doing a mitzvah isn't Torah study. Only the verses are the problem.

**What the siddurim print** (checked against the texts on Sefaria, and a page guide for ArtScroll)

- **Koren Shalem (Ashkenaz):** Modeh Ani, then washing, Asher Yatzar, Elokai Neshama, tzitzit, Birkat HaTorah. Tallit, tefillin and Ma Tovu all come after. No verses before the blessing. ✔
- **Chabad, Tehillat Hashem:** Modeh Ani, then washing, Asher Yatzar, Elokai Neshama, Birchot HaShachar, Birkat HaTorah. It adds an instruction: be very careful with this blessing, and "it is forbidden to utter words of Torah until one has blessed." No ראשית חכמה. ✔
- **Edot HaMizrach** (Sefaria's edition, which follows the Ben Ish Chai): Modeh Ani, then Birchot HaShachar, Birkat HaTorah. Tallit, tefillin and korbanot come later. ✔
- **Siddur Ashkenaz on Sefaria** (the text this Mega Siddur shows): Modeh Ani is followed directly by ראשית חכמה and ברוך שם כבוד מלכותו. Birkat HaTorah otherwise comes early, before tallit, tefillin and Ma Tovu. ✘ (one verse)
- **ArtScroll (Complete, Ashkenaz):** tzitzit, tallit (p. 2) and tefillin (p. 4), then Ma Tovu, Adon Olam and Yigdal (p. 12), then Birchos HaTorah (p. 14). Ma Tovu is a string of verses, and the tallit and tefillin passages include verses too. This is the Rema's "verses on entering shul." ✘
- **Siddur Sefard on Sefaria** (the linear Weekday Siddur Sefard has the same order): ראשית חכמה after washing, then tallit (ברכי נפשי, מה יקר), tefillin (וארשתיך) followed by the full Torah passages קדש and והיה כי יביאך (Shemot 13), then Ma Tovu, Adon Olam and Yigdal. Only after all that come Birchot HaShachar and Birkat HaTorah. ✘ This one is furthest from the Mishnah Berurah: whole parshiyot of Chumash before the blessing.

**So is Koren alone?**

Not quite. Chabad and Edot HaMizrach keep every verse until after Birkat HaTorah too. What sets Koren apart is that it does this *within nusach Ashkenaz*. It moves tallit, tefillin and Ma Tovu after the blessing, which is the order the Rema calls the custom and the Mishnah Berurah calls today's practice. Among the Ashkenaz siddurim checked here, Rabbi Elyada's point holds.

**What the other siddurim are relying on:** the lenient view in Shulchan Aruch 46:9, that verses said as prayer rather than study don't need the blessing. That view is the Rema's own basis for Ma Tovu and Selichot.

**What you can do:** say Birkat HaTorah right after Asher Yatzar and Elokai Neshama. Then ראשית חכמה, Ma Tovu and the tallit verses all fall after it.

**Not checked yet:** Rinat Yisrael, Ishei Yisrael (Gra), Olat Re'iyah, Avodat Yisrael (Baer), Ish Matzliach and Kol Eliyahu. Corrections welcome.$body$,
  'Shulchan Arukh OC 46:9 with Rema; Mishnah Berurah 46:27–28, 47:7; Yabia Omer 4 OC 7; the siddurim on Sefaria',
  'https://www.sefaria.org/Shulchan_Arukh%2C_Orach_Chayim.46.9', '{birkat-hatorah,siddur-order,deep-dive}', -10
),
(
  'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Modeh Ani', 2, '{}', 'halacha',
  'A verse before Birkat HaTorah', 'רֵאשִׁית חָכְמָה יִרְאַת יְהֹוָה',
  $body$This is Tehillim 111:10, said here before the Torah blessings. The Shulchan Aruch (OC 46:9) says not to say verses before Birkat HaTorah even as prayer. The Mishnah Berurah (46:28) says that today everyone is strict about this. Koren and Chabad's Tehillat Hashem leave this line out.

See the deep dive on Torah Blessings for how each siddur orders it.$body$,
  'Shulchan Arukh OC 46:9; Mishnah Berurah 46:28', 'https://www.sefaria.org/Mishnah_Berurah.46.28', '{birkat-hatorah,siddur-order}', 0
),
(
  'Siddur Sefard, Upon Arising, Modeh Ani', 4, '{}', 'halacha',
  'A verse before Birkat HaTorah', 'רֵאשִׁית חָכְמָה יִרְאַת יְהֹוָה',
  $body$Tehillim 111:10, said after washing but before Birkat HaTorah, which this siddur only reaches after tallit, tefillin and Ma Tovu. The Shulchan Aruch (OC 46:9) says not to say verses before the blessing even as prayer. The Mishnah Berurah (46:28) says that today everyone is strict about this.

See the deep dive on Blessings on Torah.$body$,
  'Shulchan Arukh OC 46:9; Mishnah Berurah 46:28', 'https://www.sefaria.org/Mishnah_Berurah.46.28', '{birkat-hatorah,siddur-order}', 0
),
(
  'Siddur Sefard, Upon Arising, Tefilin', 13, '{}', 'halacha',
  'A whole parsha before Birkat HaTorah', 'קַדֶּשׁ־לִי כָל־בְּכוֹר',
  $body$Here the full passages of קדש and והיה כי יביאך (Shemot 13:1–16) come before Birkat HaTorah. That is reading Chumash, not just a verse said as prayer. If you say these at this point, it's worth having made the Torah blessings first, right after Asher Yatzar.

See the deep dive on Blessings on Torah.$body$,
  'Shulchan Arukh OC 46:9; Mishnah Berurah 46:27–28', 'https://www.sefaria.org/Mishnah_Berurah.46.28', '{birkat-hatorah,siddur-order,tefillin}', 0
)
returning id, kind, ref, segment;
