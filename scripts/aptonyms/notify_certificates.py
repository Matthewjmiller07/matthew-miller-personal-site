#!/usr/bin/env python3
"""Emails for aptonym certificates (/aptonyms/certificate).

1. Each new claim → one email to GMAIL_USER with the claim and its review link (Reply-To: the claimant).
2. Each decision → one email to the claimant: their certificate and LinkedIn link, or a kind no.

Reads Supabase `aptonym_certificates` through RPCs gated by NEWSLETTER_TOKEN (see
aptonym-certificates-supabase-setup.sql). The repo is public, so the log prints counts only.
"""
import json, os, smtplib, sys, urllib.parse, urllib.request
from email.message import EmailMessage

SUPABASE = "https://qukziojymwlvmrzapgyo.supabase.co"
ANON = os.environ.get("SUPABASE_ANON_KEY", "")
SITE = "https://theothermatthewmiller.com"
ISSUER = "The Aptonym Registry"
PART = {"First": "First name", "Last": "Surname", "Both": "Whole name"}


def rpc(name, **args):
    req = urllib.request.Request(
        f"{SUPABASE}/rest/v1/rpc/{name}",
        data=json.dumps(args).encode(),
        headers={"apikey": ANON, "Authorization": f"Bearer {ANON}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read()
    return json.loads(body) if body else None


def claims(s, user, token):
    rows = rpc("aptonym_claims_pending", p_token=token) or []
    print(f"{len(rows)} new claim(s)")
    done = []
    for r in rows:
        review = f"{SITE}/aptonyms/certificate/review?" + urllib.parse.urlencode({"code": r["code"], "k": r["review_token"]})
        lines = [
            f"Name: {r['name']}",
            f"Aptonym: {PART.get(r['aptonym_part'], r['aptonym_part'])}",
            f"Profession: {r['profession']}",
            f"How it fits: {r['how_it_fits']}",
            f"LinkedIn: {r.get('linkedin_url') or '(none)'}",
            f"Link: {r.get('proof_url') or '(none)'}",
            f"Email: {r['email']}",
        ]
        msg = EmailMessage()
        msg["From"] = f"{ISSUER} <{user}>"
        msg["To"] = user
        msg["Reply-To"] = r["email"]
        msg["Subject"] = f"Aptonym claim: {r['name']} ({r['profession']})"
        msg.set_content(
            f"{r['name']} wants a Certified Aptonym certificate.\n\n" + "\n".join(lines) +
            f"\n\nReview, tidy the wording, and issue or decline:\n{review}\n\nCredential ID once issued: {r['code']}\n"
        )
        try:
            s.send_message(msg)
            done.append(r["code"])
        except smtplib.SMTPException:
            print("one send failed; it will be retried next run")
    if done:
        rpc("aptonym_claims_mark", p_token=token, p_codes=done)


def decisions(s, user, token):
    rows = rpc("aptonym_decisions_pending", p_token=token) or []
    print(f"{len(rows)} decision(s) to send")
    done = []
    for r in rows:
        first = r["name"].split()[0]
        page = f"{SITE}/aptonyms/certificate/{r['code']}"
        note = (r.get("note_from_registrar") or "").strip()
        msg = EmailMessage()
        msg["From"] = f"{ISSUER} <{user}>"
        msg["To"] = r["email"]
        msg["Reply-To"] = user
        if r["status"] == "issued":
            msg["Subject"] = "It's official: you're a Certified Aptonym"
            msg.set_content(
                f"Hi {first},\n\n"
                f"Your name fits what you do, and now it's on the record. Your Certificate of Aptonymity is live:\n\n"
                f"{page}\n\n"
                f"To put it on LinkedIn, open that page and press \"Add to LinkedIn profile\". It fills in\n"
                f"Licenses & certifications for you:\n\n"
                f"  Name: Certified Aptonym\n  Issuing organization: {ISSUER}\n  Credential ID: {r['code']}\n  Credential URL: {page}\n\n"
                f"The same page has a share button and a downloadable image of the certificate.\n"
                + (f"\nA note from the registrar: {note}\n" if note else "")
                + f"\nCongratulations,\nMatthew Miller\nRegistrar, {ISSUER}\n{SITE}/aptonyms\n"
            )
        else:
            msg["Subject"] = "About your aptonym claim"
            msg.set_content(
                f"Hi {first},\n\nThanks for sending in your claim. This one isn't one the registry can certify"
                + (f": {note}" if note else ". The registry only certifies names that clearly fit what their owner does.")
                + f"\n\nIf there's more to the story, just reply to this email.\n\nMatthew Miller\nRegistrar, {ISSUER}\n"
            )
        try:
            s.send_message(msg)
            done.append(r["code"])
        except smtplib.SMTPException:
            print("one send failed; it will be retried next run")
    if done:
        rpc("aptonym_decisions_mark", p_token=token, p_codes=done)
    print(f"sent {len(done)} decision email(s)")


def main():
    user, pw, token = (os.environ.get(k) for k in ("GMAIL_USER", "GMAIL_APP_PASSWORD", "NEWSLETTER_TOKEN"))
    if not (user and pw and token and ANON):
        sys.exit("Missing GMAIL_USER / GMAIL_APP_PASSWORD / NEWSLETTER_TOKEN / SUPABASE_ANON_KEY.")
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(user, pw)
        claims(s, user, token)
        decisions(s, user, token)


if __name__ == "__main__":
    main()
