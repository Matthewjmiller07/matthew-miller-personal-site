#!/bin/zsh
# Daily Daf Yomi game build — run headless by launchd (com.matthewmiller.daf-game).
# Uses the local `claude` CLI (subscription auth), so no API tokens are billed.
# Catches up: builds EVERY daf missing since the newest games.json entry
# (bounded by missing-dafs.mjs), so sleep/power-off gaps self-heal on next run.

set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/v24.13.1/bin:/usr/local/bin:/usr/bin:/bin"

REPO="/Applications/apps/matthew-miller-personal-site"
LOG_DIR="$HOME/Library/Logs/daf-game"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/$(date +%Y-%m-%d).log"

cd "$REPO"
echo "=== daf-game run $(date) ===" >> "$LOG"

# Pick up anything other automations pushed; autostash tolerates local dirty files.
git pull --rebase --autostash origin main >> "$LOG" 2>&1 || true

MISSING=$(node scripts/daf-yomi/missing-dafs.mjs)
if [[ -z "$MISSING" ]]; then
  echo "already built — no missing dafs" >> "$LOG"
  echo "=== done $(date) ===" >> "$LOG"
  exit 0
fi

echo "missing dafs:\n$MISSING" >> "$LOG"

echo "$MISSING" | while read -r REF; do
  [[ -z "$REF" ]] && continue
  echo "--- building: $REF ---" >> "$LOG"
  PROMPT="Invoke the /daf-game skill and follow .claude/skills/daf-game/SKILL.md to build the Daf Yomi game for \"$REF\". Rules for this automated run:
- If src/data/daf-yomi/games.json already has an entry for $REF, print \"already built\" and stop without changing anything.
- Build the game fully per the skill (harness with the explicit ref \"$REF\", learn the daf, fresh mechanic not used in recent games, page at src/pages/daf/<slug>.astro, manifest entry, verify the page renders).
- Then git add ONLY the files you created or edited for this daf game (page, data, manifest). NEVER add unrelated working-tree changes.
- Commit with message \"Add daf game: $REF — <title>\" plus the Co-Authored-By line, and push to origin main."
  claude -p "$PROMPT" --dangerously-skip-permissions >> "$LOG" 2>&1 || echo "FAILED: $REF" >> "$LOG"
done

echo "=== done $(date) ===" >> "$LOG"
