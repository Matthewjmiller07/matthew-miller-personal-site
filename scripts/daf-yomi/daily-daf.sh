#!/bin/zsh
# Daily Daf Yomi game build — run headless by launchd (com.matthewmiller.daf-game).
# Uses the local `claude` CLI (subscription auth), so no API tokens are billed.

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

PROMPT='Invoke the /daf-game skill and follow .claude/skills/daf-game/SKILL.md to build the game for today'\''s Daf Yomi. Rules for this automated run:
- First check src/data/daf-yomi/games.json: if today'\''s daf already has an entry, print "already built" and stop without changing anything.
- Build the game fully per the skill (harness, learn the daf, fresh mechanic not used in recent games, page at src/pages/daf/<slug>.astro, manifest entry, verify the page renders).
- Then git add ONLY the files you created or edited for this daf game (scripts/skill/page/data/manifest). NEVER add unrelated working-tree changes.
- Commit with message "Add daf game: <ref> — <title>" plus the Co-Authored-By line, and push to origin main.'

claude -p "$PROMPT" \
  --dangerously-skip-permissions \
  >> "$LOG" 2>&1

echo "=== done $(date) ===" >> "$LOG"
