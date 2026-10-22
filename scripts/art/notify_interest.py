#!/usr/bin/env python3
"""Email Matthew about new "I'd buy this" requests from /shas-art.

Reads un-notified rows from Supabase `art_interest` through token-gated RPCs (the same
NEWSLETTER_TOKEN the newsletter uses), sends one email per request to GMAIL_USER with the
buyer as Reply-To, and marks them notified. The repo is public, so the log prints counts only.
"""
import json, os, smtplib, sys, urllib.request
from email.message import EmailMessage

SUPABASE = "https://qukziojymwlvmrzapgyo.supabase.co"
ANON = os.environ.get("SUPABASE_ANON_KEY", "")
SITE = "https://theothermatthewmiller.com"


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
    rows = rpc("art_interest_pending", p_token=token) or []
    print(f"{len(rows)} new request(s)")
    if not rows:
        return
    done = []
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(user, pw)
        for r in rows:
            what = " · ".join(x for x in (r.get("poster"), r.get("format"), r.get("colourway")) if x) or "a poster"
            msg = EmailMessage()
            msg["From"] = f"Shas Art <{user}>"
            msg["To"] = user
            msg["Reply-To"] = r["email"]
            msg["Subject"] = f"Someone wants to buy: {what}"
            msg.set_content(
                f"{r.get('name') or 'Someone'} ({r['email']}) is interested in buying:\n\n  {what}\n\n"
                f"Note: {r.get('note') or '(none)'}\n\nReply to this email to answer them directly.\n"
                f"Sent {r['created_at']} from {SITE}/shas-art\n"
            )
            try:
                s.send_message(msg)
                done.append(r["id"])
            except smtplib.SMTPException:
                print("one send failed; it will be retried next run")
    if done:
        rpc("art_interest_mark", p_token=token, p_ids=done)
    print(f"emailed {len(done)}")


if __name__ == "__main__":
    main()
