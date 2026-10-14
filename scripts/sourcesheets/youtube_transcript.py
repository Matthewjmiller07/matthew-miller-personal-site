#!/usr/bin/env python3
"""Print the transcript of a YouTube video as plain text (for source_sheet_sources.video_transcript).

    pip install youtube-transcript-api
    python3 scripts/sourcesheets/youtube_transcript.py <url-or-id> [lang ...]

Run it from a normal machine: YouTube often blocks cloud/datacenter IPs. Then summarize the text
(Claude can do this) and put it in video_summary.
"""
import re, sys
from youtube_transcript_api import YouTubeTranscriptApi

m = re.search(r"(?:v=|youtu\.be/|shorts/|embed/|live/)([\w-]{11})", sys.argv[1]) or re.fullmatch(r"([\w-]{11})", sys.argv[1])
if not m:
    sys.exit("could not find a video id")
langs = sys.argv[2:] or ["en", "he"]
t = YouTubeTranscriptApi().fetch(m.group(1), languages=langs)
print(" ".join(s.text.replace("\n", " ") for s in t))
