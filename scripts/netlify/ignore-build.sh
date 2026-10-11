#!/usr/bin/env bash
# Netlify "ignore" command: exit 0 skips the build, exit 1 builds.
#
# Every successful production deploy costs 15 Netlify credits, and the daily pipelines push to
# main several times a day. So pushes to main never deploy on their own. Production deploys
# happen when:
#   - the nightly workflow (.github/workflows/nightly-deploy.yml) calls the build hook at
#     midnight Israel time, and only if main has changed since the live deploy, or
#   - the commit message contains [deploy] (e.g. publishing a newsletter issue, fixing a broken
#     page), or
#   - it was triggered by a build hook or the "Trigger deploy" button.
# Deploy Previews (pull requests) and branch deploys always build: they don't use credits.
# Skipped pushes go live with the next nightly deploy, which builds the latest main.

if [ -n "$INCOMING_HOOK_TITLE" ] || [ -n "$INCOMING_HOOK_BODY" ] || [ -n "$INCOMING_HOOK_URL" ]; then
  echo "Build hook: building."; exit 1
fi
if [ "$CONTEXT" != "production" ]; then
  echo "Context $CONTEXT: building."; exit 1
fi
if git log -1 --format=%B "$COMMIT_REF" 2>/dev/null | grep -qi '\[deploy\]'; then
  echo "[deploy] in the commit message: building."; exit 1
fi
echo "Push to main: skipping to save credits. It goes live with the nightly deploy at midnight Israel time."
echo "Put [deploy] in a commit message to deploy now."
exit 0
