"""Send a newsletter HTML file through Gmail SMTP, images and all.

Run by .github/workflows/newsletter-send.yml whenever writing/newsletter/send.json changes:
  {"html": "writing/newsletter/2026-10-05-workshop.html", "subject": "...", "to": ["..."]}
Needs repo secrets GMAIL_USER and GMAIL_APP_PASSWORD (a Google app password, not the
account password). The Gmail connector strips <img> tags, which is why this exists.
"""
import json, os, re, smtplib, sys
from email.message import EmailMessage

cfg = json.load(open("writing/newsletter/send.json"))
user, pw = os.environ.get("GMAIL_USER"), os.environ.get("GMAIL_APP_PASSWORD")
if not user or not pw:
    sys.exit("Missing GMAIL_USER / GMAIL_APP_PASSWORD repo secrets.")

html = open(cfg["html"], encoding="utf-8").read()
text = re.sub(r"(?is)<(head|style)\b.*?</\1>", "", html)
text = re.sub(r"<[^>]+>", " ", text)
text = re.sub(r"[ \t]+", " ", re.sub(r"\n\s*\n+", "\n\n", text)).strip()

msg = EmailMessage()
msg["From"] = f"Matthew Miller <{user}>"
msg["To"] = ", ".join(cfg["to"])
msg["Subject"] = cfg["subject"]
msg.set_content(text)
msg.add_alternative(html, subtype="html")

with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
    s.login(user, pw)
    s.send_message(msg)
print(f"sent {cfg['html']} to {len(cfg['to'])} recipient(s)")
