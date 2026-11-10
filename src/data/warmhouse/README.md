# WarmHouse agent pages

Each entry in `agents.json` gets a personal landing page at `/warmhouse/for/<slug>` (not indexed,
not in the sitemap). Put that URL on the QR card that goes in the gift box.

- `name` goes on the page and on the sample base plate; `first` is how the page greets them.
- `listing`: the street address of the listing modeled for them. While it is `null` the page
  pitches a free first model; once set, the page opens on that home ("we modeled 123 Maple Ln").
- `delivered`: set to `true` once the printed model is at their office; the page then says
  "that's 123 Maple Ln on your desk".
- `models`: the models made for this agent, shown first in their gallery and on the hero
  turntable, tagged "Made for you". Each `id` has `public/warmhouse/models/<id>.json` and `.jpg`.

## From a listing to a page

In a Claude Code session, `/warmhouse-listing <agent-slug> [listing link]` does this end to end:
Claude finds the listing, studies the exterior photos, writes a house spec in `specs/`, builds and
renders the model, updates this file and opens a pull request whose deploy preview shows the
finished page. The steps are in `.claude/skills/warmhouse-listing/SKILL.md`. By hand:

1. Write `specs/<id>.json` (start from `scripts/warmhouse/spec.example.json`).
2. `python3 scripts/warmhouse/add_listing.py <agent-slug> src/data/warmhouse/specs/<id>.json`
3. `scripts/warmhouse/render.sh <id>` for the card photo.

A model printed from Blender can be shown instead of a spec-built one: convert its Bambu Studio
3MF with `python3 scripts/warmhouse/model_to_json.py house.3mf public/warmhouse/models/<id>.json`.

`models.json` is the ready-made catalog every page shows; homes whose `areas` match the agent's
`area` come first. The three prototypes are built by `scripts/warmhouse/make_prototypes.py`.

Keep contact details and campaign notes out of this file: the pages and the repo are public.
Requests from the forms land in Supabase `warmhouse_requests` (photos in the private
`warmhouse-photos` bucket) and are emailed by `.github/workflows/warmhouse-notify.yml`.
