#!/usr/bin/env python3
"""Put a listing's model on an agent's WarmHouse page.

  python3 scripts/warmhouse/add_listing.py <agent-slug> src/data/warmhouse/specs/<id>.json

Builds public/warmhouse/models/<id>.json from the spec and sets the agent's `listing` and `models`
in src/data/warmhouse/agents.json (the spec's `name` is the address shown on the page and plate).
Run scripts/warmhouse/render.sh <id> afterwards for the card photo.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_house  # noqa: E402

AGENTS = "src/data/warmhouse/agents.json"


def main(slug, spec_path):
    spec = json.load(open(spec_path))
    ident = os.path.splitext(os.path.basename(spec_path))[0]
    address = (spec.get("name") or "").strip()
    if not address:
        sys.exit('The spec needs a "name": the street address shown on the page.')
    agents = json.load(open(AGENTS))
    agent = next((a for a in agents if a["slug"] == slug), None)
    if not agent:
        sys.exit(f'No agent "{slug}" in {AGENTS}. Slugs: {", ".join(a["slug"] for a in agents)}')
    build_house.main(spec_path)
    entry = {"id": ident, "name": address, "blurb": spec.get("blurb") or "Your listing, modeled from the listing photos and ready to print."}
    agent["models"] = [entry] + [m for m in agent.get("models", []) if m["id"] != ident]
    agent["listing"] = address
    with open(AGENTS, "w") as f:
        f.write("[\n" + ",\n".join("  " + json.dumps(a, ensure_ascii=False) for a in agents) + "\n]\n")
    print(f"{slug}: /warmhouse/for/{slug} now leads with {address}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:3])
