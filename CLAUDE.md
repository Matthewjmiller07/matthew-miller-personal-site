# Notes for Claude

## Newsletter desk

Matthew sends a weekly newsletter, The Workshop. Everything that might go into it lives on the
newsletter desk: Markdown files in `writing/desk/`, published unlinked at `/desk/` and as
`/desk/all.md` for LLMs (see `writing/desk/README.md`).

Keep the desk current as part of normal work, without being asked:

- When you ship something on the site (a new page, a daf game, a feature, a fix worth telling
  people about), add a bullet to `writing/desk/next-issue.md` in the same commit: what it is,
  its URL path, and one line on why it's interesting.
- When Matthew shares newsletter material (ideas, drafts, quotes, links, LLM drafts), save it
  as a new file in `writing/desk/`, copying the frontmatter from `writing/desk/_TEMPLATE.md`.
- After an issue is sent, rename `next-issue.md` to the issue's date with `status: sent` and
  start a fresh `next-issue.md` for the following week.
- The desk is public to anyone with the URL: never put private or personal details there.
