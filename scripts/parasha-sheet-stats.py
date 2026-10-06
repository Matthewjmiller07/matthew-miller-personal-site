#!/usr/bin/env python3
"""Numbers for a Mega Bible parasha sheet, computed from the OSHB morphology.

    python3 scripts/parasha-sheet-stats.py Gen 12:1 17:27 [--units units.json]

Prints JSON with the "stats", "topRoots", "divine" and "hapax" blocks the
sheets in src/data/parasha-sheets/*.json use, plus word counts for any
narrative units passed in (a list of {"he","en","ref":"12:1–12:9"}).

Counting rules (they reproduce the published Noach and Bereshit figures):
  * a word is one <w> element (prefixes and suffixes ride on their host);
  * a lemma is the Strong's number of the content word, prefixes
    (b/, c/, d/, l/, m/, k/, s/) ignored and homograph letters kept, so
    1254 a and 1254 b are two lemmas — "unique_lemmas" and "once_only"
    (lemmas used exactly once in the parasha) count these;
  * a hapax is a root (homograph letter dropped) found exactly once in the
    whole Tanakh;
  * the object marker אֵת (H853) is left out of the top-roots list.
Glosses come from HebrewStrong.xml and are short dictionary glosses only;
the sheet's prose and per-word notes are written by hand.
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / 'public' / 'parsha-explorer' / 'data'
NS = {'o': 'http://www.bibletechnologies.net/2003/OSIS/namespace'}
SKIP = {'HebrewStrong.xml', 'Oshm.xml', 'VerseMap.xml'}
DIVINE = [('3068', "ה'", 'the Name (Hashem)'), ('430', 'אֱלֹהִים', 'God'), ('136', 'אֲדֹנָי', 'Adonai'),
          ('410', 'אֵל', 'El'), ('7706', 'שַׁדַּי', 'Shaddai'), ('5945', 'עֶלְיוֹן', 'Elyon')]
NIKKUD = re.compile(r'[֑-ֽֿ֯׀׃-׆]')  # cantillation & marks, keep vowels


def lemma_of(lemma: str) -> str:
    if '+' in lemma:  # first half of a two-word name (עַשְׁתְּרֹת קַרְנַיִם): counted with its second half
        return ''
    content = [p.strip() for p in lemma.split('/') if re.match(r'^\d', p.strip())]
    return content[-1] if content else ''


def root_of(lemma: str) -> str:
    if '+' in lemma:
        return ''
    parts = [p.strip() for p in lemma.split('/')]
    content = [p for p in parts if re.match(r'^\d', p)]
    if not content:
        return ''
    return re.sub(r'\s*[a-z]$', '', content[-1]).strip()


def words(book_file: Path):
    tree = ET.parse(book_file)
    for verse in tree.iter('{%s}verse' % NS['o']):
        osis = verse.get('osisID', '')
        _, ch, v = osis.split('.')
        for w in verse.iter('{%s}w' % NS['o']):
            yield int(ch), int(v), w.get('lemma', ''), (w.text or '')


def strongs():
    out = {}
    tree = ET.parse(DATA / 'HebrewStrong.xml')
    for e in tree.iter():
        if e.tag.endswith('entry') and e.get('id', '').startswith('H'):
            num = e.get('id')[1:]
            w = next((x for x in e if x.tag.endswith('w')), None)
            meaning = next((x for x in e if x.tag.endswith('meaning')), None)
            usage = next((x for x in e if x.tag.endswith('usage')), None)
            gloss = ''.join((meaning if meaning is not None else usage).itertext()).strip() if (meaning is not None or usage is not None) else ''
            out[num] = {'form': (w.text or '').strip() if w is not None else '', 'gloss': re.sub(r'\s+', ' ', gloss)[:120]}
    return out


def hapax_list(rows, hapax_roots, lex):
    out, held = [], ''
    for ch, v, l, text in rows:
        clean = NIKKUD.sub('', text.replace('/', ''))
        if '+' in l:
            held = f'{held}{clean} '
            continue
        r = root_of(l)
        if r in hapax_roots:
            out.append({'ch': ch, 'v': v, 'he': held + clean, 'root': lex.get(r, {}).get('form', ''),
                        'strong': f'H{r}', 'gloss': lex.get(r, {}).get('gloss', '')})
        held = ''
    return out


def in_range(ch, v, a, b):
    return (ch, v) >= a and (ch, v) <= b


def parse_cv(s):
    c, v = s.split(':')
    return int(c), int(v)


def main():
    book, start, end = sys.argv[1], parse_cv(sys.argv[2]), parse_cv(sys.argv[3])
    units = []
    if '--units' in sys.argv:
        units = json.loads(Path(sys.argv[sys.argv.index('--units') + 1]).read_text())

    tanakh = Counter()
    for f in sorted(DATA.glob('*.xml')):
        if f.name in SKIP:
            continue
        for _, _, lemma, _ in words(f):
            r = root_of(lemma)
            if r:
                tanakh[r] += 1

    rows = [(ch, v, lemma, text) for ch, v, lemma, text in words(DATA / f'{book}.xml') if in_range(ch, v, start, end)]
    per_verse = Counter((ch, v) for ch, v, _, _ in rows)
    roots = Counter(r for r in (root_of(l) for _, _, l, _ in rows) if r)
    lemmas = Counter(x for x in (lemma_of(l) for _, _, l, _ in rows) if x)
    lex = strongs()

    longest = max(per_verse.items(), key=lambda kv: (kv[1], -kv[0][0], -kv[0][1]))
    shortest = min(per_verse.items(), key=lambda kv: (kv[1], kv[0]))
    hapax_roots = {r for r, n in roots.items() if tanakh[r] == 1}
    out = {
        'stats': {
            'verses': len(per_verse),
            'words': len(rows),
            'unique_lemmas': len(lemmas),
            'once_only': sum(1 for n in lemmas.values() if n == 1),
            'avg_per_verse': round(len(rows) / len(per_verse), 1),
            'longest_verse': {'chapter': longest[0][0], 'verse': longest[0][1], 'words': longest[1]},
            'shortest_verse': {'chapter': shortest[0][0], 'verse': shortest[0][1], 'words': shortest[1]},
        },
        'topRoots': [{'form': "ה'" if r == '3068' else lex.get(r, {}).get('form', ''), 'strong': f'H{r}', 'gloss': lex.get(r, {}).get('gloss', ''), 'count': n}
                     for r, n in roots.most_common(11) if r != '853'][:10],
        'divine': [{'he': he, 'en': en, 'n': roots[num]} for num, he, en in DIVINE if roots[num]],
        'hapax': hapax_list(rows, hapax_roots, lex),
    }
    if units:
        for u in units:
            a, b = [parse_cv(x) for x in re.split(r'[–-]', u['ref'])]
            u['words'] = sum(n for (ch, v), n in per_verse.items() if in_range(ch, v, a, b))
        out['units'] = units
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
