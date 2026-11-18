"""Fetch the classic translations (KJV 1611, Geneva, Bishops', Coverdale, Wycliffe) from the site's
own /api/bible/translation endpoint into a local cache. Usage: python3 fetch_classic.py CACHE_DIR"""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from extract_hebrew import BOOKS
from fetch_sefaria import CHAPTERS

CODES = ['kjv1611', 'gnv', 'bis', 'cov', 'wyc']

cache = Path(sys.argv[1])
cache.mkdir(parents=True, exist_ok=True)
for code in CODES:
    for book, _ in BOOKS:
        f = cache / f'{code}__{book}.json'
        if f.exists():
            continue
        url = f'https://theothermatthewmiller.com/api/bible/translation/{code}/{urllib.parse.quote(book)}'
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                data = json.load(r)
        except Exception as e:  # noqa: BLE001
            print('fail', code, book, e)
            continue
        chapters = data.get('chapters', {})
        if sum(len(v) for v in chapters.values()) >= 1000:
            # The book endpoint used to stop at 1,000 rows; fill the rest chapter by chapter.
            for ch in range(1, CHAPTERS[book] + 1):
                if str(ch) in chapters and ch < max(map(int, chapters)):
                    continue
                with urllib.request.urlopen(f'{url}/{ch}', timeout=60) as r:
                    chapters[str(ch)] = [{'verse': x['verse'], 'text': x['text']} for x in json.load(r)['verses']]
        f.write_text(json.dumps(chapters, ensure_ascii=False))
        time.sleep(0.2)
    print(code, 'done')
