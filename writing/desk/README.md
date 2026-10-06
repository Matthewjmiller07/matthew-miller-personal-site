---
title: How the newsletter desk works
date: 2026-10-06
status: kit
tags: meta
---

The desk is an unlinked page at https://theothermatthewmiller.com/desk/ that pulls together
everything in progress for The Workshop newsletter.

- Add material: drop a `.md` file into `writing/desk/` (start from `_TEMPLATE.md`), commit, push.
- Sent issues (`writing/newsletter/issues.json`) and the social kits (`writing/newsletter/*.md`)
  show up automatically.
- Give any LLM https://theothermatthewmiller.com/desk/all.md for everything in one file,
  or /desk/index.json for structured data. Each item also has its own /desk/<slug>.md.
- The desk is excluded from the sitemap and sends noindex, but it is not password protected:
  anyone with the URL can read it, so keep anything private out of it.
