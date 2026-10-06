#!/usr/bin/env python3
"""Append an entry to the Everything hub manifest (public/data/everything.json).

The hub is Matthew's unlinked, noindex'd dump of everything the workshop
produces — the single place the newsletter's LLM pulls from.

Usage:
    everything_add.py --type reel --date 2026-10-07 --title "929 reel — II Samuel 22" \\
        --summary "Dramatic reel posted to @sidrasecond." \\
        --url "https://www.instagram.com/reel/ABC/" \\
        --details '{"929_chapter": 285, "account": "@sidrasecond"}' \\
        [--id 2026-10-07-reel] [--push "Add reel to Everything feed"]

Idempotency: entries are keyed by --id (default "{date}-{type}"); an existing
entry with the same id is REPLACED, so cron re-runs never duplicate.
--push: git add + commit the manifest and push via the Git Data API
        (push_site.py), so the change goes live on Netlify.
"""
import argparse, json, os, subprocess, sys
from datetime import datetime
from zoneinfo import ZoneInfo

WORK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(WORK, "public", "data", "everything.json")
PUSH_SCRIPT = os.path.expanduser("~/workspace/rav-asher-weiss-page/push_site.py")


def load():
    with open(MANIFEST, "r", encoding="utf-8") as f:
        return json.load(f)


def save(manifest):
    tmp = MANIFEST + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, MANIFEST)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--type", required=True,
                    help="daily-reader | daf-insight | friday-roundup | reel | full-audio | quote-cards | transcripts | newsletter | note")
    ap.add_argument("--date", default=None, help="YYYY-MM-DD (default: today, Asia/Jerusalem)")
    ap.add_argument("--title", required=True)
    ap.add_argument("--summary", required=True)
    ap.add_argument("--url", default=None)
    ap.add_argument("--details", default=None, help="JSON object string")
    ap.add_argument("--id", default=None, help="entry id (default: {date}-{type})")
    ap.add_argument("--push", default=None, metavar="COMMIT_MSG",
                    help="also commit + push the manifest live with this commit message")
    args = ap.parse_args()

    date = args.date or datetime.now(ZoneInfo("Asia/Jerusalem")).strftime("%Y-%m-%d")
    entry_id = args.id or f"{date}-{args.type}"
    details = json.loads(args.details) if args.details else {}

    manifest = load()
    entry = {
        "id": entry_id,
        "date": date,
        "type": args.type,
        "title": args.title,
        "summary": args.summary,
        "url": args.url,
        "details": details,
    }

    entries = [e for e in manifest.get("entries", []) if e.get("id") != entry_id]
    entries.append(entry)
    entries.sort(key=lambda e: (e.get("date", ""), e.get("id", "")), reverse=True)
    manifest["entries"] = entries
    manifest["updated"] = datetime.now(ZoneInfo("Asia/Jerusalem")).isoformat(timespec="seconds")
    save(manifest)
    print(f"wrote entry {entry_id} ({len(entries)} total)")

    if args.push:
        rel = os.path.relpath(MANIFEST, WORK)
        subprocess.run(["git", "add", rel], cwd=WORK, check=True)
        subprocess.run(["git", "commit", "-m", args.push], cwd=WORK, check=True)
        subprocess.run([sys.executable, PUSH_SCRIPT, "--message", args.push], check=True)
        print("pushed live")


if __name__ == "__main__":
    main()
