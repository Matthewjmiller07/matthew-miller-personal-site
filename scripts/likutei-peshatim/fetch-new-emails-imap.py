#!/usr/bin/env python3
"""
Cloud twin of fetch-new-emails.mjs, for the GitHub Actions run
(.github/workflows/likutei-peshatim.yml). Same output contract, but reads Gmail
over IMAP with an app password instead of the local `gws` OAuth CLI, so it needs
no Mac and no OAuth refresh token that can quietly expire.

Env: LP_GMAIL_USER (falls back to GMAIL_USER) and LP_GMAIL_APP_PASSWORD (falls back
to GMAIL_APP_PASSWORD) — the inbox the newsletter is delivered to.
Optional: LP_MAX_PER_RUN (default 3), LP_LOOKBACK (Gmail duration, default 120d).

Gmail's X-GM-MSGID is the same number as the Gmail API message id (in decimal), so
ids written here match the ones already in processed-emails.json.

Prints one JSON line per new email to stdout, oldest first: {id, subject, date, textFile}
"""

import email
import email.policy
import html
import imaplib
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

MAX_PER_RUN = int(os.environ.get("LP_MAX_PER_RUN", "3"))
LOOKBACK = os.environ.get("LP_LOOKBACK", "120d")
QUERY = f'subject:"Likutei Peshatim" newer_than:{LOOKBACK}'

repo_root = Path.cwd()
processed_path = repo_root / "src" / "data" / "likutei-peshatim" / "processed-emails.json"
scratch_dir = Path(tempfile.gettempdir()) / "likutei-peshatim-fetch"
scratch_dir.mkdir(parents=True, exist_ok=True)

user = os.environ.get("LP_GMAIL_USER") or os.environ.get("GMAIL_USER")
password = os.environ.get("LP_GMAIL_APP_PASSWORD") or os.environ.get("GMAIL_APP_PASSWORD")
if not user or not password:
    sys.exit("Missing LP_GMAIL_USER/GMAIL_USER or LP_GMAIL_APP_PASSWORD/GMAIL_APP_PASSWORD.")


def html_to_text(markup):
    markup = re.sub(r"(?is)<(script|style|head)\b.*?</\1>", "", markup)
    markup = re.sub(r"(?i)<br\s*/?>|</(p|div|tr|li|h[1-6]|table)>", "\n", markup)
    text = html.unescape(re.sub(r"<[^>]+>", "", markup))
    text = re.sub(r"[ \t ]+", " ", text)
    return re.sub(r"\n\s*\n+", "\n\n", text).strip()


def body_text(msg):
    plain = msg.get_body(preferencelist=("plain",))
    if plain is not None:
        return plain.get_content()
    rich = msg.get_body(preferencelist=("html",))
    if rich is not None:
        return html_to_text(rich.get_content())
    return "(no plaintext body found)"


processed_ids = {p["id"] for p in json.loads(processed_path.read_text())}

imap = imaplib.IMAP4_SSL("imap.gmail.com")
imap.login(user, password)
imap.select('"[Gmail]/All Mail"', readonly=True)

typ, data = imap.uid("SEARCH", "X-GM-RAW", f'"{QUERY.replace(chr(34), chr(92) + chr(34))}"')
if typ != "OK":
    sys.exit(f"IMAP search failed: {data}")
uids = data[0].split()

# The search is a loose keyword match: it also catches GitHub's own "Run failed: Likutei
# Peshatim calendar" notifications, which would otherwise be parsed as issues. Real issues
# have a subject that starts with "Likutei Peshatim" (checked on the headers below).
SUBJECT_RE = re.compile(r"^\s*(re:\s*|fwd?:\s*)?Likutei Peshatim\b", re.I)

candidates = []  # (internal_ts, id, uid)
if uids:
    typ, meta = imap.uid("FETCH", b",".join(uids), "(X-GM-MSGID INTERNALDATE BODY.PEEK[HEADER.FIELDS (SUBJECT)])")
    for item in meta:
        if not isinstance(item, tuple):
            continue
        line = item[0].decode()
        m_id = re.search(r"X-GM-MSGID (\d+)", line)
        m_uid = re.search(r"UID (\d+)", line)
        m_date = re.search(r'INTERNALDATE "([^"]+)"', line)
        if not (m_id and m_uid and m_date):
            continue
        subject = str(email.message_from_bytes(item[1], policy=email.policy.default)["Subject"] or "")
        if not SUBJECT_RE.match(subject):
            continue
        gmail_id = format(int(m_id.group(1)), "x")
        if gmail_id in processed_ids:
            continue
        ts = datetime.strptime(m_date.group(1), "%d-%b-%Y %H:%M:%S %z")
        candidates.append((ts, gmail_id, m_uid.group(1)))

candidates.sort()  # oldest first, so a backlog is worked through in order
for ts, gmail_id, uid in candidates[:MAX_PER_RUN]:
    typ, raw = imap.uid("FETCH", uid, "(BODY.PEEK[])")
    msg = email.message_from_bytes(raw[0][1], policy=email.policy.default)
    text_file = scratch_dir / f"{gmail_id}.txt"
    text_file.write_text(body_text(msg), encoding="utf8")
    print(json.dumps({
        "id": gmail_id,
        "subject": str(msg["Subject"] or ""),
        "date": ts.astimezone(timezone.utc).strftime("%Y-%m-%d"),
        "textFile": str(text_file),
    }))

imap.logout()
