"""Score every כִּי against every translation and write public/data/ki-translations.json.

Run after extract_hebrew.py, fetch_sefaria.py and fetch_classic.py:
  python3 scripts/ki/analyze.py SEFARIA_CACHE CLASSIC_CACHE
"""
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

from align import CODES, LEX, NEAR, NEAR_WEAK, WEAK, WEAK_PENALTY, pick
from fetch_sefaria import SEFARIA_NAME, VERSIONS

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

# key, label, year, source, versification ('heb' = Hebrew numbering, 'kjv' = English), language
TRANSLATIONS = [
    ('wyc', 'Wycliffe', 1395, 'classic', 'kjv', 'en'),
    ('cov', 'Coverdale', 1535, 'classic', 'kjv', 'en'),
    ('bis', "Bishops'", 1568, 'classic', 'kjv', 'en'),
    ('gnv', 'Geneva', 1587, 'classic', 'kjv', 'en'),
    ('kjv1611', 'King James', 1611, 'classic', 'kjv', 'en'),
    ('zunz', 'Zunz (German)', 1838, 'sefaria', 'heb', 'de'),
    ('jps17', 'JPS', 1917, 'sefaria', 'heb', 'en'),
    ('koren', 'Koren', 1962, 'sefaria', 'heb', 'en'),
    ('jps85', 'NJPS', 1985, 'sefaria', 'heb', 'en'),
    ('fox', 'Everett Fox', 1995, 'sefaria', 'heb', 'en'),
]


def main():
    sef, cla = Path(sys.argv[1]), Path(sys.argv[2])
    occ = json.loads((HERE / 'out/hebrew.json').read_text())
    codes = {}
    for key, _label, _y, src, vers, _lang in TRANSLATIONS:
        cache = {}
        out = []
        for o in occ:
            b = o['book']
            if b not in cache:
                f = (sef if src == 'sefaria' else cla) / f'{key}__{b}.json'
                cache[b] = json.loads(f.read_text()) if f.exists() else None
            data = cache[b]
            if data is None:
                out.append('?')
                continue
            c, v = (o['kc'], o['kv']) if vers == 'kjv' else (o['c'], o['v'])
            if src == 'sefaria':
                text = data[c - 1][v - 1] if c - 1 < len(data) and v - 1 < len(data[c - 1]) else ''
            else:
                rows = data.get(str(c)) or []
                text = next((r['text'] for r in rows if r['verse'] == v), '')
            out.append(pick(text, o['pos']) if text else '?')
        codes[key] = ''.join(out)

    # Summary: per translation, overall and per Hebrew context class.
    summary = {}
    for key, *_ in TRANSLATIONS:
        s = codes[key]
        overall = Counter(ch for ch in s if ch != '?')
        by_ctx = defaultdict(Counter)
        for o, ch in zip(occ, s):
            if ch != '?':
                by_ctx[o['ctx']][ch] += 1
        summary[key] = {'n': sum(overall.values()), 'overall': dict(overall.most_common()),
                        'byCtx': {k: dict(v.most_common()) for k, v in by_ctx.items()}}

    payload = {
        'generated': 'scripts/ki/analyze.py',
        'codes': CODES,
        # The matching rule, so the page highlights the same word the analysis picked.
        'rule': {'lex': LEX, 'weak': ''.join(sorted(WEAK)), 'near': NEAR, 'nearWeak': NEAR_WEAK,
                 'weakPenalty': WEAK_PENALTY},
        'sefaria': {'names': SEFARIA_NAME,
                    'versions': {k: v[0] for k, v in VERSIONS.items() if k != 'chouraqui'}},
        'translations': [dict(key=k, label=l, year=y, source=s, versification=vv, lang=lg)
                         for k, l, y, s, vv, lg in TRANSLATIONS],
        'books': sorted({o['book'] for o in occ}, key=[o['book'] for o in occ].index),
        # [bookIndex, ch, v, kjvCh, kjvV, k, pos, ctx, hebrew ki, next two words]
        'occ': [],
        'render': codes,
        'summary': summary,
    }
    bidx = {b: i for i, b in enumerate(payload['books'])}
    for o in occ:
        payload['occ'].append([bidx[o['book']], o['c'], o['v'], o['kc'], o['kv'], o['k'], o['pos'],
                               o['ctx'], o['he'], o['after']])
    out = ROOT / 'public/data/ki-translations.json'
    out.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')))
    print(out, out.stat().st_size)
    for key, *_ in TRANSLATIONS:
        sm = summary[key]
        top = ', '.join(f"{CODES[c]} {round(100 * n / sm['n'])}%" for c, n in list(sm['overall'].items())[:6])
        print(f"{key:10} n={sm['n']:5}  {top}")


if __name__ == '__main__':
    main()
