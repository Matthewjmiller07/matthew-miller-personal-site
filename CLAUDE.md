# Notes for Claude

## Newsletter desk

Matthew sends a weekly newsletter, The Workshop. Everything that might go into it lives on the
newsletter desk, published unlinked at `/desk/` and as `/desk/all.md` for LLMs. It merges
Markdown files in `writing/desk/`, the issues and kits in `writing/newsletter/`, the
`/everything` feed (`public/data/everything.json`), and notes added live through `/api/desk`
(Supabase `desk_items`). See `writing/desk/README.md`.

Keep the desk current as part of normal work, without being asked:

- When you ship something on the site (a new page, a daf game, a feature, a fix worth telling
  people about), add a bullet to `writing/desk/next-issue.md` in the same commit: what it is,
  its URL path, and one line on why it's interesting.
- When Matthew shares newsletter material (ideas, drafts, quotes, links, LLM drafts), save it
  as a new file in `writing/desk/`, copying the frontmatter from `writing/desk/_TEMPLATE.md`.
- When drafting an issue, start from `/desk/all.md` (or `loadDesk()` in `src/lib/desk.ts`):
  everything since the last `sent` issue is the raw material.
- After an issue is sent, rename `next-issue.md` to the issue's date with `status: sent` and
  start a fresh `next-issue.md` for the following week.
- The desk is public to anyone with the URL: never put private or personal details there.

## Source sheets

New source sheets live in Supabase (main project), not in hand-built pages: one row in
`source_sheets` (slug, title, title_he, subtitle, intro, status) and one row per source in
`source_sheet_sources` (position, section, ref, author, he_text, en_text, note, tags). They render
live at `/sourcesheets/<slug>` and are listed on `/sourcesheets`. Only `status = 'published'`
sheets are readable with the anon key. Schema and the Wisdom seed: `source-sheets-supabase-setup.sql`.
When Matthew shares a source for a sheet, pull the Hebrew from Sefaria and insert it as a new row.
