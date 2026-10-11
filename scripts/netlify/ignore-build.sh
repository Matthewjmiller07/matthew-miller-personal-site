#!/usr/bin/env bash
# Netlify "ignore" command: exit 0 skips the build, exit 1 builds.
#
# Every successful production deploy costs 15 Netlify credits, and the daily pipelines push to
# main several times a day. So a push to main deploys only when:
#   - the commit message contains [deploy] (e.g. publishing a newsletter issue), or
#   - the last production deploy is more than MIN_HOURS old (so the site still updates daily), or
#   - it was triggered by a build hook or the "Trigger deploy" button, or
#   - it's not production (Deploy Previews and branch deploys don't use credits).
# Skipped pushes are picked up by the next deploy, which builds the latest main.
MIN_HOURS=${MIN_HOURS:-20}

if [ -n "$INCOMING_HOOK_TITLE" ] || [ -n "$INCOMING_HOOK_BODY" ]; then
  echo "Build hook: building."; exit 1
fi
if [ "$CONTEXT" != "production" ]; then
  echo "Context $CONTEXT: building."; exit 1
fi
if git log -1 --format=%B "$COMMIT_REF" 2>/dev/null | grep -qi '\[deploy\]'; then
  echo "[deploy] in the commit message: building."; exit 1
fi
last=$(git log -1 --format=%ct "$CACHED_COMMIT_REF" 2>/dev/null)
if [ -z "$last" ]; then
  echo "No record of the last deploy ($CACHED_COMMIT_REF): building."; exit 1
fi
age=$(( ($(date +%s) - last) / 3600 ))
if [ "$age" -ge "$MIN_HOURS" ]; then
  echo "Last deploy's commit is ${age}h old: building."; exit 1
fi
echo "Last deploy's commit is ${age}h old (< ${MIN_HOURS}h): skipping to save credits."
echo "Put [deploy] in a commit message to deploy now."
exit 0
