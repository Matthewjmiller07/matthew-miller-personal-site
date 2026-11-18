"""Every כִּי (Strong's H3588) in the Hebrew Bible, from the OSHB XML the Mega Bible already uses.

For each occurrence: its reference (Hebrew and KJV versification), where it falls in the verse
(as a fraction of the verse's words, used to find the matching English word), and a Hebrew
syntactic context class. Writes scripts/ki/out/hebrew.json.
"""
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'public/parsha-explorer/data'
OUT = Path(__file__).resolve().parent / 'out'
OUT.mkdir(exist_ok=True)
NS = {'o': 'http://www.bibletechnologies.net/2003/OSIS/namespace'}

BOOKS = [
    ('Genesis', 'Gen'), ('Exodus', 'Exod'), ('Leviticus', 'Lev'), ('Numbers', 'Num'), ('Deuteronomy', 'Deut'),
    ('Joshua', 'Josh'), ('Judges', 'Judg'), ('1 Samuel', '1Sam'), ('2 Samuel', '2Sam'), ('1 Kings', '1Kgs'),
    ('2 Kings', '2Kgs'), ('Isaiah', 'Isa'), ('Jeremiah', 'Jer'), ('Ezekiel', 'Ezek'), ('Hosea', 'Hos'),
    ('Joel', 'Joel'), ('Amos', 'Amos'), ('Obadiah', 'Obad'), ('Jonah', 'Jonah'), ('Micah', 'Mic'),
    ('Nahum', 'Nah'), ('Habakkuk', 'Hab'), ('Zephaniah', 'Zeph'), ('Haggai', 'Hag'), ('Zechariah', 'Zech'),
    ('Malachi', 'Mal'), ('Psalms', 'Ps'), ('Proverbs', 'Prov'), ('Job', 'Job'), ('Song of Songs', 'Song'),
    ('Ruth', 'Ruth'), ('Lamentations', 'Lam'), ('Ecclesiastes', 'Eccl'), ('Esther', 'Esth'), ('Daniel', 'Dan'),
    ('Ezra', 'Ezra'), ('Nehemiah', 'Neh'), ('1 Chronicles', '1Chr'), ('2 Chronicles', '2Chr'),
]
OSIS2NAME = {o: n for n, o in BOOKS}

# Verbs after which ki usually introduces what is seen / known / said ("that").
PERCEPTION = {'7200', '3045', '8085', '559', '2142', '5046', '995', '539', '7650', '1696', '7919', '4672', '3820'}
OATH = {'2416', '2425'}  # חַי — "as X lives, ki ..."


def strongs(lemma: str) -> str:
    # "c/3588 a" -> "3588"; prefixes are single letters before a slash.
    core = lemma.split('/')[-1].strip()
    return re.sub(r'\D.*$', '', core)


def load_versemap():
    m = {}
    root = ET.parse(DATA / 'VerseMap.xml').getroot()
    for v in root.iter():
        if v.tag.endswith('verse') and v.get('wlc') and v.get('kjv'):
            m.setdefault(v.get('wlc'), v.get('kjv'))
    return m


def classify(words, i, lemma_full):
    """Hebrew-side context class for the ki at words[i]."""
    if lemma_full.endswith('3588 b'):
        return 'ki-im'
    if lemma_full.endswith('3588 c'):
        return 'ki-al-ken'
    prev = [strongs(w.get('lemma', '')) for w in words[max(0, i - 5):i]]
    if any(p in OATH for p in prev):
        return 'oath'
    if any(p in PERCEPTION for p in prev):
        return 'object'
    nxt = words[i + 1:i + 3]
    nxt_morph = [w.get('morph', '') for w in nxt]
    imperfect_next = any(re.match(r'^H(?:[^/]*/)*V[a-zA-Z]i', m) or re.match(r'^HV[a-zA-Z]i', m) for m in nxt_morph)
    if i <= 1 and imperfect_next:
        return 'conditional'
    if i == 0:
        return 'initial'
    return 'clause'


def main():
    vmap = load_versemap()
    occ = []
    for name, osis in BOOKS:
        tree = ET.parse(DATA / f'{osis}.xml')
        for verse in tree.getroot().iter('{%s}verse' % NS['o']):
            vid = verse.get('osisID')
            if not vid:
                continue
            words = list(verse.iter('{%s}w' % NS['o']))
            # Skip qere words inside <note> (they duplicate a ketiv already counted).
            notes_w = set()
            for note in verse.iter('{%s}note' % NS['o']):
                for w in note.iter('{%s}w' % NS['o']):
                    notes_w.add(id(w))
            words = [w for w in words if id(w) not in notes_w]
            n = len(words)
            k = 0
            for i, w in enumerate(words):
                lemma = w.get('lemma', '')
                if strongs(lemma) != '3588':
                    continue
                _, ch, vs = vid.split('.')
                kjv = vmap.get(vid, vid)
                _, kch, kvs = kjv.split('.')
                heb = ''.join(w.itertext()).replace('/', '')
                after = ' '.join(''.join(x.itertext()).replace('/', '') for x in words[i + 1:i + 3])
                occ.append({
                    'book': name, 'c': int(ch), 'v': int(vs), 'kc': int(kch), 'kv': int(kvs),
                    'k': k, 'pos': round((i + 0.5) / n, 4), 'n': n,
                    'ctx': classify(words, i, lemma), 'he': heb, 'after': after,
                })
                k += 1
    (OUT / 'hebrew.json').write_text(json.dumps(occ, ensure_ascii=False))
    from collections import Counter
    print(len(occ), Counter(o['ctx'] for o in occ).most_common())


if __name__ == '__main__':
    main()
