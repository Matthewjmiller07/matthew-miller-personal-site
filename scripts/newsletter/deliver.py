"""Deliver the latest published Workshop issue to every subscriber who hasn't had it.

Run hourly by .github/workflows/newsletter-deliver.yml. Because it works from "who hasn't
had the latest issue", the same run handles the weekly send and late signups: someone who
joins on Thursday gets Monday's issue within the hour.

An issue goes out only once "published": true is set on it in writing/newsletter/issues.json.
Needs repo secrets GMAIL_USER, GMAIL_APP_PASSWORD and NEWSLETTER_TOKEN.
"""
import json, os, re, smtplib, sys, time, urllib.request
from email.message import EmailMessage

SUPABASE = "https://qukziojymwlvmrzapgyo.supabase.co"
ANON = os.environ.get("SUPABASE_ANON_KEY", "")
MAX_PER_RUN = 80  # stays well under Gmail's daily sending limit


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

    issues = [i for i in json.load(open("writing/newsletter/issues.json")) if i.get("published")]
    if not issues:
        print("No published issue yet; nothing to send.")
        return
    issue = max(issues, key=lambda i: i["date"])
    pending = [row["email"] for row in rpc("newsletter_pending", p_token=token, p_issue=issue["slug"]) or []]
    print(f"{issue['slug']}: {len(pending)} subscriber(s) waiting")
    if not pending:
        return

    html = open(issue["html"], encoding="utf-8").read()
    text = re.sub(r"(?is)<(head|style)\b.*?</\1>", "", html)
    text = re.sub(r"[ \t]+", " ", re.sub(r"\n\s*\n+", "\n\n", re.sub(r"<[^>]+>", " ", text))).strip()

    sent = 0
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(user, pw)
        for email in pending[:MAX_PER_RUN]:
            msg = EmailMessage()
            msg["From"] = f"Matthew Miller <{user}>"
            msg["To"] = email
            msg["Subject"] = issue["subject"]
            msg["List-Unsubscribe"] = f"<mailto:{user}?subject=unsubscribe>"
            msg.set_content(text)
            msg.add_alternative(html, subtype="html")
            try:
                s.send_message(msg)
            except smtplib.SMTPException as e:
                print(f"failed {email}: {e}")
                continue
            rpc("newsletter_mark_sent", p_token=token, p_issue=issue["slug"], p_email=email)
            sent += 1
            time.sleep(1)
    print(f"sent {sent}, {len(pending) - sent} left for the next run")


if __name__ == "__main__":
    main()
