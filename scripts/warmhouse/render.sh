#!/usr/bin/env bash
# Render card photos for WarmHouse models: starts the dev server, runs render_images.cjs, stops it.
#   scripts/warmhouse/render.sh [--og] [model-id ...]
set -euo pipefail
cd "$(dirname "$0")/../.."
npx astro dev --port 4399 > /tmp/warmhouse-dev.log 2>&1 &
DEV=$!
trap 'kill $DEV 2>/dev/null || true' EXIT
for _ in $(seq 60); do
  curl -sf -o /dev/null http://localhost:4399/warmhouse/favicon.svg && break
  sleep 2
done
node scripts/warmhouse/render_images.cjs "$@"
