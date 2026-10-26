#!/bin/zsh
# Transcribe every episode without a feed transcript, oldest first. Resumable.
cd "${0:A:h}/.."
python3 -I -c "
import json
for e in reversed(json.load(open('episodes.json'))):
    if 'application/x-subrip' not in e['transcripts']: print(e['guid'], e['mp3'])
" | while read guid url; do
  [[ -s srt/$guid.srt ]] && continue
  curl -sL -o audio/$guid.mp3 "$url" || continue
  ffmpeg -nostdin -loglevel error -y -i audio/$guid.mp3 -ar 16000 -ac 1 audio/$guid.wav
  whisper-cli -m models/ggml-base.en.bin -t 4 -bs 1 -bo 1 -osrt -of srt/$guid.tmp -np -f audio/$guid.wav && mv srt/$guid.tmp.srt srt/$guid.srt
  rm -f audio/$guid.mp3 audio/$guid.wav
  echo "$(date +%T) done $guid"
done
echo ALLDONE
