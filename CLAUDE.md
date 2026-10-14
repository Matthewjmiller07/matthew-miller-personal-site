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
- Sending an issue: send a test first, then merge to main with the issue marked `published` in
  `writing/newsletter/issues.json`. Media the email links on the site (e.g. the trailer at
  `/newsletter/<slug>/trailer.mp4`) is only live once Netlify deploys main, so don't call the issue
  sent until that deploy is live. `scripts/newsletter/deliver.py` enforces this: it holds the send
  while any `/newsletter/<slug>/` link in the email isn't live, and the hourly run retries.
  Put `[deploy]` in the publish commit (or PR title) so Netlify deploys it right away instead of at midnight (see below).

## Netlify credits

Each successful production deploy costs 15 Netlify credits, and the site ran out once. So pushes to
main never deploy on their own: `scripts/netlify/ignore-build.sh` (the `ignore` command in
`netlify.toml`) skips them. `.github/workflows/nightly-deploy.yml` calls a Netlify build hook at
midnight Israel time, and only if main has moved since the live deploy (the build writes
`/build-info.json` with its commit), so everything merged that day goes live in one deploy.
To see work before then, open a PR: Deploy Previews are free. Only use `[deploy]` in a commit
message when something has to be live now (a newsletter issue, a fix to a broken page); never in the
daily pipelines.

## Stale-tree guard

`.github/workflows/stale-tree-guard.yml` runs on every push to main. If a commit sets 3+ files
back to versions they already had (or deletes files added in the last 3 weeks), it was made from
an out-of-date checkout: the guard restores those files in a follow-up commit, keeps the push's new
content, and fails so Matthew gets an email. Pipelines that push to main must pull main first and
commit only the files they changed. Put `[allow-revert]` in a commit message for an intentional
mass rollback.

## Source sheets

New source sheets live in Supabase (main project), not in hand-built pages: one row in
`source_sheets` (slug, title, title_he, subtitle, intro, status) and one row per source in
`source_sheet_sources` (position, section, ref, author, he_text, en_text, note, tags). They render
live at `/sourcesheets/<slug>` and are listed on `/sourcesheets`. Only `status = 'published'`
sheets are readable with the anon key. Schema and the Wisdom seed: `source-sheets-supabase-setup.sql`.
When Matthew shares a source for a sheet, pull the Hebrew from Sefaria and insert it as a new row.
A source can also carry a video: set `video_url` (any YouTube link; `?t=` is honored, or use `video_start`
seconds) and it embeds in the card. Optional `video_summary` shows under it and `video_transcript` sits in a
collapsible block. When Matthew shares a YouTube link for a sheet, insert it as a source row; fetch the
transcript with `scripts/sourcesheets/youtube_transcript.py` (YouTube may block cloud IPs, so if it fails ask
Matthew to paste the transcript) and write the summary yourself.
