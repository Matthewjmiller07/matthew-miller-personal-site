# WarmHouse agent pages

Each entry in `agents.json` gets a personal landing page at `/warmhouse/for/<slug>` (not indexed,
not in the sitemap). Put that URL on the QR card that goes in the gift box.

- `name` goes on the page and on the sample base plate; `first` is how the page greets them.
- `listing`: the street address of the listing you modeled for them, e.g. `"123 Maple Ln, Glenview"`.
  While it is `null` the page pitches a free first model; once set, the page talks about the model
  on their desk and the plate shows that address.
- `models` (optional): models made for this agent, shown first in their gallery and on the hero
  turntable, tagged "Made for you": `[{ "id": "123-maple-ln", "name": "123 Maple Ln", "blurb": "..." }]`.
  Each `id` needs `public/warmhouse/models/<id>.json` and `<id>.jpg`:
  1. `python3 scripts/warmhouse/model_to_json.py house.3mf public/warmhouse/models/<id>.json`
     (a Bambu Studio 3MF with one part per filament), then
  2. `npx astro dev --port 4399` and `node scripts/warmhouse/render_images.cjs <id>` for the photo.

`models.json` is the ready-made catalog every page shows; homes whose `areas` match the agent's
`area` come first. The three prototypes are built by `scripts/warmhouse/make_prototypes.py`.

Keep contact details and campaign notes out of this file: the pages and the repo are public.
Requests from the forms land in Supabase `warmhouse_requests` (photos in the private
`warmhouse-photos` bucket) and are emailed by `.github/workflows/warmhouse-notify.yml`.
