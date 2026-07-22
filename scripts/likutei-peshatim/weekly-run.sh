#!/bin/zsh
# Likutei Peshatim newsletter -> calendar build — run headless by launchd
# (com.matthewmiller.likutei-peshatim). Uses the local `claude` CLI (subscription
# auth, no API tokens billed) and the local `gws` CLI (read-only Gmail OAuth).
#
# Scheduled daily except Saturday via launchd's Weekday key; this in-script
# guard is a defensive backstop (e.g. a run that starts before midnight and
# crosses into Shabbos, or a manual invocation on a Saturday).
#
# Naturally self-healing: fetch-new-emails.mjs only ever returns emails not yet
# recorded in processed-emails.json, so a missed week is picked up next run.

set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/v24.13.1/bin:/usr/local/bin:/usr/bin:/bin"

REPO="/Applications/apps/matthew-miller-personal-site"
LOG_DIR="$HOME/Library/Logs/likutei-peshatim"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/$(date +%Y-%m-%d).log"

if [[ "$(date +%u)" == "6" ]]; then
  echo "=== $(date) === Shabbos — skipping" >> "$LOG"
  exit 0
fi

cd "$REPO"
echo "=== likutei-peshatim run $(date) ===" >> "$LOG"

git pull --rebase --autostash origin main >> "$LOG" 2>&1 || true

NEW_EMAILS=$(node scripts/likutei-peshatim/fetch-new-emails.mjs 2>>"$LOG")
if [[ -z "$NEW_EMAILS" ]]; then
  echo "no new emails" >> "$LOG"
  echo "=== done $(date) ===" >> "$LOG"
  exit 0
fi

echo "$NEW_EMAILS" | while read -r LINE; do
  [[ -z "$LINE" ]] && continue
  ID=$(echo "$LINE" | node -e "process.stdin.once('data',d=>console.log(JSON.parse(d).id))")
  SUBJECT=$(echo "$LINE" | node -e "process.stdin.once('data',d=>console.log(JSON.parse(d).subject))")
  TEXTFILE=$(echo "$LINE" | node -e "process.stdin.once('data',d=>console.log(JSON.parse(d).textFile))")
  echo "--- processing: $SUBJECT ($ID) ---" >> "$LOG"

  PROMPT="Invoke the /likutei-peshatim skill and follow .claude/skills/likutei-peshatim/SKILL.md to parse the Likutei Peshatim email \"$SUBJECT\" (Gmail message id $ID). Rules for this automated run:
- If src/data/likutei-peshatim/processed-emails.json already has an entry for message id $ID, print \"already processed\" and stop without changing anything.
- The raw plaintext body is already saved at: $TEXTFILE — read it directly (no need to re-fetch from Gmail).
- Follow the skill fully: extract calendar-worthy events (including yahrzeits as all-day events), resolve dates per the skill's rules, append to events.json with unique ids, dedupe against existing entries.
- Append an entry to processed-emails.json for this email (even if eventCount is 0), run generate-ics.mjs, then git add ONLY the files touched (events.json, processed-emails.json, public/calendar/likutei_peshatim.ics). NEVER add unrelated working-tree changes.
- Commit with message \"Add Likutei Peshatim events: <parsha/subject> - <date>\" plus the Co-Authored-By line, and push to origin main."
  claude -p "$PROMPT" --dangerously-skip-permissions >> "$LOG" 2>&1 || echo "FAILED: $SUBJECT ($ID)" >> "$LOG"
done

echo "=== done $(date) ===" >> "$LOG"
