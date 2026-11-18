"""Fetch the Sefaria translations used in the ki analysis, whole book at a time, into a local cache.

Usage: python3 scripts/ki/fetch_sefaria.py CACHE_DIR
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from extract_hebrew import BOOKS

SEFARIA_NAME = {'1 Samuel': 'I Samuel', '2 Samuel': 'II Samuel', '1 Kings': 'I Kings', '2 Kings': 'II Kings',
                '1 Chronicles': 'I Chronicles', '2 Chronicles': 'II Chronicles'}
CHAPTERS = {
    'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34, 'Joshua': 24, 'Judges': 21,
    '1 Samuel': 31, '2 Samuel': 24, '1 Kings': 22, '2 Kings': 25, 'Isaiah': 66, 'Jeremiah': 52, 'Ezekiel': 48,
    'Hosea': 14, 'Joel': 4, 'Amos': 9, 'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3,
    'Zephaniah': 3, 'Haggai': 2, 'Zechariah': 14, 'Malachi': 3, 'Psalms': 150, 'Proverbs': 31, 'Job': 42,
    'Song of Songs': 8, 'Ruth': 4, 'Lamentations': 5, 'Ecclesiastes': 12, 'Esther': 10, 'Daniel': 12,
    'Ezra': 10, 'Nehemiah': 13, '1 Chronicles': 29, '2 Chronicles': 36,
}
TORAH = {'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'}

VERSIONS = {
    'fox': ('The Five Books of Moses, by Everett Fox. New York, Schocken Books, 1995', 'torah'),
    'jps85': ('Tanakh: The Holy Scriptures, published by JPS', 'all'),
    'jps17': ('The Holy Scriptures: A New Translation (JPS 1917)', 'all'),
    'koren': ('The Koren Jerusalem Bible', 'all'),
    'zunz': ('Die vier und zwanzig Bücher der Heiligen Schrift. Unter der Redaction von Dr. Zunz übersetzt von H. Arnheim, Dr. Julius Fürst, Dr. M. Sachs. Berlin 1838 [de]', 'all'),
}


def drop_footnotes(t):
    # Footnotes are <i class="footnote">…</i> and can nest other <i> tags inside.
    out, i = [], 0
    while True:
        j = t.find('<i class="footnote">', i)
        if j < 0:
            return ''.join(out) + t[i:]
        out.append(t[i:j])
        depth, k = 0, j
        for m in re.finditer(r'<i\b[^>]*>|</i>', t[j:]):
            depth += 1 if m.group(0) != '</i>' else -1
            if depth == 0:
                k = j + m.end()
                break
        else:
            k = len(t)
        i = k


def strip(t):
    t = re.sub(r'<sup[^>]*class="footnote-marker"[^>]*>.*?</sup>', '', t or '')
    t = drop_footnotes(t)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = re.sub(r'&[a-z#0-9]+;', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def fetch(book, title, chapters):
    name = SEFARIA_NAME.get(book, book)
    ref = urllib.parse.quote(f'{name} 1-{chapters}')
    url = f'https://www.sefaria.org/api/v3/texts/{ref}?version=' + urllib.parse.quote(f'{_lang(title)}|{title}')
    with urllib.request.urlopen(url, timeout=60) as r:
        data = json.load(r)
    vs = data.get('versions') or []
    if not vs:
        return None
    text = vs[0].get('text')
    if CHAPTERS[book] == 1 or (text and isinstance(text[0], str)):
        text = [text]
    return [[strip(v if isinstance(v, str) else ' '.join(v)) for v in ch] for ch in text]


def _lang(title):
    m = re.search(r'\[(\w+)\]$', title)
    return {'fr': 'french', 'de': 'german'}.get(m.group(1), m.group(1)) if m else 'english'


def main():
    cache = Path(sys.argv[1])
    cache.mkdir(parents=True, exist_ok=True)
    for code, (title, scope) in VERSIONS.items():
        for book, _ in BOOKS:
            if scope == 'torah' and book not in TORAH:
                continue
            f = cache / f'{code}__{book}.json'
            if f.exists():
                continue
            try:
                chapters = fetch(book, title, CHAPTERS[book])
            except Exception as e:  # noqa: BLE001
                print('fail', code, book, e)
                continue
            f.write_text(json.dumps(chapters, ensure_ascii=False))
            print(code, book, len(chapters or []))
            time.sleep(0.3)


if __name__ == '__main__':
    main()
