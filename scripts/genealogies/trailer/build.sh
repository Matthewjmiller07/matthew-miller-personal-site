#!/usr/bin/env bash
# Build the /genealogies trailer, 16:9 and 9:16, into public/videos/.
# Needs: ffmpeg, Playwright's Chromium, numpy. Fonts: npm pack @fontsource/{frank-ruhl-libre,oswald,inter}
# and copy the woff2 files named in fonts-local.css into ./fonts.
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p out
ROOT=../../..
if [ "${SKIP_RENDER:-}" != 1 ]; then
  for o in horizontal vertical; do
    for w in 0 1 2 3; do node render.mjs $o $w 4 & done; wait
  done
fi
python3 audio.py
for o in horizontal vertical; do
  printf "file '%s'\n" $o-part{0,1,2,3}.mp4 > out/$o.txt
  ffmpeg -loglevel error -y -f concat -safe 0 -i out/$o.txt -c copy out/$o-video.mp4
done
ffmpeg -loglevel error -y -i out/horizontal-video.mp4 -i out/music.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart $ROOT/public/videos/genealogies-trailer.mp4
ffmpeg -loglevel error -y -i out/vertical-video.mp4 -i out/music.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart $ROOT/public/videos/genealogies-trailer-vertical.mp4
# poster: the title card
mkdir -p $ROOT/public/images/genealogies
ffmpeg -loglevel error -y -ss 61 -i out/horizontal-video.mp4 -frames:v 1 -q:v 3 $ROOT/public/images/genealogies/poster.jpg
ls -la $ROOT/public/videos/genealogies-trailer*.mp4
