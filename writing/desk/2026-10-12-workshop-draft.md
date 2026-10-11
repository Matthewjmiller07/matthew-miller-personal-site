---
title: "Draft: The Workshop, week of 12 October 2026"
date: 2026-10-11
status: draft
tags: next-issue, draft
---

**Subject:** The Workshop: Solomon learns to talk, the Mishnah goes Mega, and four goats walk into a tithe pen

**Preheader:** A week of Solomon: his dream, his trial, his films, and a source sheet on what he asked for.

---

Shalom friends,

This week the workshop kept circling back to one man: King Solomon. The 929 cycle reached the opening chapters of Kings, so I spent the week making David's court and Solomon's dream into things you can hear, watch and search. Also new: a Mega Mishnah, four more daf games, and a source sheet that grows. 31 commits, about 14,000 new lines of code. Here's what shipped.

## 🏆 Headliner: The Mega Bible learned to talk

Open 1 Kings 1, 2 or 3 in the Mega Bible and there are now three bars above the text:

- **Listen.** The 929 narration for the chapter, in a gold player of its own.
- **Full chapter.** The whole chapter read aloud as a multi-voice dramatic reading, word for word. Every segment is checked with Whisper against the text, and the 1 Kings 2 reading came out at 8.1 minutes with zero added or dropped words.
- **Watch.** A lip-synced film. In 1 Kings 1, eleven characters (David, Bathsheba, Nathan, Adonijah, Joab, Benaiah and the rest) each say their own lines to the camera, 7.5 minutes in all. Narration plays over AI scene illustrations.

The story behind the films: every hosted lip-sync model I tried was blocked, asleep or wanted paid hardware. So it runs on Wav2Lip on a plain CPU, offline, at about 0.7 seconds a frame. A full chapter takes around two CPU-hours and costs nothing.

Start with 1 Kings 3. Solomon asks for an understanding heart, and two pages later two mothers bring him one living baby.

[Watch Solomon's chapter →](https://theothermatthewmiller.com/mega-bible)

## 🔎 Also in the Mega Bible: search, cross references, parasha sheets

- **Full-text Tanakh search.** Press `/` and search all 24 books in Hebrew or English. It runs on a static index, with no server, so it's fast and it works on your phone.
- **Cross references.** Every verse now lists its cross references, and clicking one opens the passage in a bottom panel in Hebrew and English (KJV for New Testament refs) without leaving your chapter.
- **Parasha sheets inside the Bible.** If a chapter is covered by one of my parasha sheets, you get a card with its numbers, and the words that appear only once in all of Tanakh are ringed in the text. This week's new sheet is **Lech Lecha**: 13 once-in-Tanakh words (11 of them in the war of the kings), six divine names, and four words that went from Biblical to Modern Hebrew (מולדת, שכר, צדקה, המון), with National Library of Israel posters.

[Search the Tanakh →](https://theothermatthewmiller.com/mega-bible) · [Lech Lecha sheet →](https://theothermatthewmiller.com/parasha-sheet/lech-lecha)

## 📜 New: The Mega Mishnah

All 63 tractates, vocalised Hebrew and English, in the same design as the Mega Siddur. My favourite part is the **Voices** layer: every Tanna, Beit Shammai, Beit Hillel and the Chakhamim are underlined in their own colour, with a tally for each perek, so you can see at a glance who's arguing with whom, and filter to just one sage.

Every mishnah has badges showing where it shows up in the Bavli, Yerushalmi, Tosefta and Tanakh, plus a side panel with Bartenura, Rambam, Tosafot Yom Tov and Tiferet Yisrael. It follows Mishnah Yomit and tracks what you've learned, with siyum counts.

The Mega Bible, Mishnah and Siddur now share a front door at /mega. Any commentary on the Siddur or Mishnah also has a **Link** button: send it to a friend and it opens on that exact note with a gold spotlight.

[Open the Mega Mishnah →](https://theothermatthewmiller.com/mega-mishnah) · [All three →](https://theothermatthewmiller.com/mega)

## 📖 A source sheet that grows: On Wisdom

Source sheets now live in a database instead of being built by hand as pages, so a sheet can keep growing as I find sources. The first one is **On Wisdom**, and it opens with Solomon again: God gives him "a wise and understanding heart," and Radak quotes the sages. The *chakham* holds on to what he learned. The *navon* understands one thing from another.

Got a source on wisdom I should add? Reply and send it.

[Read On Wisdom →](https://theothermatthewmiller.com/sourcesheets/wisdom)

## 🎮 Daf Yomi Arcade: four games from Bekhorot

- **The Lambing Pen of Perhaps** (Bekhorot 18): slide a body to the exact midpoint between two towns (the Rabbis say you can't measure that precisely), then build every possible world in an unwatched lambing pen to find what the kohen is guaranteed.
- **Two Keys to the Womb** (Bekhorot 19): a firstborn needs two keys, "first out" and "opens the womb," and a caesarean birth splits them. You also fire counterexamples at Ravina.
- **The Goat's First Year** (Bekhorot 20): turn a ring calendar around Ze'eiri's thirty days and breed ten kids into the tithe pen.
- **Under the Rod** (Bekhorot 21): play the Gemara's mnemonic tiles in a tug-of-war, and work out what a seller's silence means to Rav, Shmuel and Rabbi Yochanan.

[Play the arcade →](https://theothermatthewmiller.com/daf)

## ⚡ Quick hits

- **Rav Asher Weiss quote cards:** 11 new this week, 16 in all. Two to start with: the blessings at a wedding aren't the bride and groom's, they belong to the public; and the women's section has kedushah too. Tap any card and the shiur plays from that second.
- **Rav Asher Weiss transcript archive:** his TorahAnytime shiurim, transcribed with Whisper, searchable in English, Hebrew and Yiddish, with a link to any moment.
- **929 reels:** every chapter of Kings so far is a short cinematic reel on Instagram at @sidrasecond.
- **My Daily Reader, made by Muse AI:** every morning Muse puts together a reader just for me: the day's daf, aliyah, 929 chapter, Mishnah and Rambam, with a question on top, as a PDF and a Kindle book. Wednesday's question: what does "first" mean in the womb, in the garden, and at the first grave?

## 🤝 Work with me

Everything in this email was built with AI as a co-pilot. I help teams do the same: AI and Claude training, G2 positioning and AEO, and custom websites.

[See how we can work together →](https://theothermatthewmiller.com/services)

---

**31** commits · **14k** lines of code · **3** talking chapters · **$0** for the lip-sync

Reply and tell me what to build next, or which chapter you want to see as a film. I really do read every reply.

Shavua tov from the workshop,
Matthew

---

### Notes for Matthew (not for the email)

- Covers everything since the 5 October issue went out: commits from 6–10 October, live desk notes, and the /everything feed.
- A short clip from the 1 Kings 3 lip-sync film would make a good GIF for the headliner (the two mothers before Solomon).
- I left out the signup popup and the /desk itself (behind the scenes), and the "Mobile search toggle" fix, which is folded into search.
- HTML email: writing/newsletter/2026-10-12-workshop.html (test sent 11 October). Art, GIFs and trailer in public/newsletter/2026-10-12/, built by scripts/newsletter-trailer/build_week_2026_10_12.py.
