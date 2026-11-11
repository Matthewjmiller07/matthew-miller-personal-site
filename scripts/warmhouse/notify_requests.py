#!/usr/bin/env python3
"""Email new WarmHouse requests from /warmhouse, and alerts when an agent opens their page.

Reads un-notified rows from Supabase `warmhouse_requests` through token-gated RPCs (the same
NEWSLETTER_TOKEN the newsletter uses), sends one email per request to GMAIL_USER with the
agent as Reply-To, and marks them notified. The repo is public, so the log prints counts only.
"""
import json, os, smtplib, sys, urllib.request
from email.message import EmailMessage

SUPABASE = "https://qukziojymwlvmrzapgyo.supabase.co"
ANON = os.environ.get("SUPABASE_ANON_KEY", "")
SITE = "https://theothermatthewmiller.com"
PHOTOS = "https://supabase.com/dashboard/project/qukziojymwlvmrzapgyo/storage/buckets/warmhouse-photos"
FIELDS = [
    ("Picked model", "model_choice"), ("For", "kind"), ("Size", "tier"), ("Home", "property_address"), ("Base plate", "plate_text"),
    ("Closing / gift date", "closing_date"), ("Listing", "listing_url"), ("Brokerage", "brokerage"),
    ("Phone", "phone"), ("Note", "note"),
]


def rpc(name, **args):
    req = urllib.request.Request(
        f"{SUPABASE}/rest/v1/rpc/{name}",
        data=json.dumps(args).encode(),
        headers={"apikey": ANON, "Authorization": f"Bearer {ANON}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read()
    return json.loads(body) if body else None


def main():
    user, pw, token = (os.environ.get(k) for k in ("GMAIL_USER", "GMAIL_APP_PASSWORD", "NEWSLETTER_TOKEN"))
    if not (user and pw and token and ANON):
        sys.exit("Missing GMAIL_USER / GMAIL_APP_PASSWORD / NEWSLETTER_TOKEN / SUPABASE_ANON_KEY.")
    rows = rpc("warmhouse_requests_pending", p_token=token) or []
    print(f"{len(rows)} new request(s)")
    done = []
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(user, pw)
        notify_visits(s, user, token)
        for r in rows:
            lines = [f"{label}: {r[key]}" for label, key in FIELDS if r.get(key)]
            photos = r.get("photo_paths") or []
            if photos:
                lines.append(f"Photos: {len(photos)} sent, in folder {r['id']} at {PHOTOS}")
            page = f"/warmhouse/for/{r['agent_slug']}" if r.get("agent_slug") else "/warmhouse"
            msg = EmailMessage()
            msg["From"] = f"WarmHouse <{user}>"
            msg["To"] = user
            msg["Reply-To"] = r["email"]
            msg["Subject"] = f"WarmHouse request: {r['name']}" + (f", {r['property_address']}" if r.get("property_address") else "")
            msg.set_content(
                f"{r['name']} ({r['email']}) sent a WarmHouse request.\n\n" + "\n".join(lines) +
                f"\n\nReply to this email to answer them directly.\nSent {r['created_at']} from {SITE}{page}\n"
            )
            try:
                s.send_message(msg)
                done.append(r["id"])
            except smtplib.SMTPException:
                print("one send failed; it will be retried next run")
    if done:
        rpc("warmhouse_requests_mark", p_token=token, p_ids=done)
    print(f"emailed {len(done)}")


def notify_visits(s, user, token):
    """One email per agent whose page was opened since the last run."""
    rows = rpc("warmhouse_visits_pending", p_token=token) or []
    print(f"{len(rows)} new agent-page visit(s)")
    if not rows:
        return
    names = {}
    try:
        with open(os.path.join(os.path.dirname(__file__), "../../src/data/warmhouse/agents.json")) as f:
            names = {a["slug"]: a["name"] for a in json.load(f)}
    except OSError:
        pass
    by_slug = {}
    for r in rows:
        by_slug.setdefault(r["slug"], []).append(r)
    done = []
    for slug, visits in by_slug.items():
        earlier = rpc("warmhouse_visit_count", p_token=token, p_slug=slug, p_before=visits[0]["created_at"]) or 0
        who = names.get(slug, slug)
        first = earlier == 0
        lines = [
            f"- {v['created_at'][:16].replace('T', ' ')} UTC on {v.get('device') or 'a device'}"
            + (f", from {v['src']}" if v.get("src") else "")
            + (f", via {v['referrer_host']}" if v.get("referrer_host") else "")
            for v in visits
        ]
        msg = EmailMessage()
        msg["From"] = f"WarmHouse <{user}>"
        msg["To"] = user
        msg["Subject"] = f"{who} {'opened their WarmHouse page' if first else 'is back on their WarmHouse page'}" + (
            f" ({len(visits)} visits)" if len(visits) > 1 else ""
        )
        msg.set_content(
            f"{who} {'just opened their page for the first time' if first else f'opened their page again ({earlier + len(visits)} visits so far)'}.\n\n"
            + "\n".join(lines)
            + f"\n\nTheir page: {SITE}/warmhouse/for/{slug}\nTracker: {SITE}/warmhouse/tracker\n"
            + ("\nA good moment for a follow-up.\n" if first else "")
        )
        try:
            s.send_message(msg)
            done += [v["id"] for v in visits]
        except smtplib.SMTPException:
            print("one visit alert failed; it will be retried next run")
    if done:
        rpc("warmhouse_visits_mark", p_token=token, p_ids=done)
    print(f"alerted on {len(done)} visit(s)")


if __name__ == "__main__":
    main()
