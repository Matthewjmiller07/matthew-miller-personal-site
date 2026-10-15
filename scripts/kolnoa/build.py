#!/usr/bin/env python3
"""Build a Kolnoa (bilingual film/talk) lesson from a YouTube video with human English + Hebrew captions.

    pip install youtube-transcript-api
    python3 scripts/kolnoa/build.py <youtube-id-or-url> [--slug name] [--limit N]

Run it from a normal machine (YouTube blocks cloud IPs). Needs TYPESAFE_API_KEY in .env.
Writes src/data/kolnoa/<slug>.json, which /kolnoa/<slug> renders and /api/kolnoa-jev grades against.

Pipeline:
  1. Fetch the human English and Hebrew caption tracks. The Hebrew is sometimes timed to an older
     upload, so find the time shift that lines its cue starts up with the English.
  2. Merge English cues into sentences (sentence end, or ~14s) and give each sentence the Hebrew
     cues whose midpoints fall inside it.
  3. Ask Jev, per sentence, in one request:
       - which English word each Hebrew word translates (Choice over the English tokens, or none)
       - how hard the Hebrew is for an English-speaking learner (Score)
       - whether it's an everyday phrase worth learning (Noul)
       - whether the Hebrew faithfully renders the English (Noul) — unfaithful pairs skip drills
"""
import argparse, concurrent.futures as cf, json, os, re, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / 'src/data/kolnoa'
URL = 'https://api.typesafe.ai/v1/systemone'
MODEL = 'jev-latest'


def env_key():
    if os.environ.get('TYPESAFE_API_KEY'):
        return os.environ['TYPESAFE_API_KEY']
    for line in (ROOT / '.env').read_text().splitlines():
        if line.startswith('TYPESAFE_API_KEY='):
            return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('TYPESAFE_API_KEY missing')


KEY = env_key()


def system_one(state, questions, tries=5):
    body = json.dumps({'model': MODEL, 'state': state, 'questions': questions}).encode()
    for attempt in range(tries):
        req = urllib.request.Request(URL, body, {'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)['answers']
        except urllib.error.HTTPError as e:
            if e.code in (429, 529, 500, 502, 503) and attempt < tries - 1:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f'TypeSafe {e.code}: {e.read()[:300]!r}')


def clean(t):
    return re.sub(r'\s+', ' ', t.replace('\n', ' ')).strip()


CACHE = ROOT / '.cache/kolnoa'


def fetch_tracks(vid):
    """Captions are cached in .cache/kolnoa so rebuilds don't hit YouTube (it rate-limits quickly)."""
    cached = CACHE / f'{vid}.json'
    if cached.exists():
        d = json.loads(cached.read_text())
        return [tuple(c) for c in d['en']], [tuple(c) for c in d['he']]
    en, he = fetch_tracks_live(vid)
    CACHE.mkdir(parents=True, exist_ok=True)
    cached.write_text(json.dumps({'en': en, 'he': he}, ensure_ascii=False))
    return en, he


def fetch_tracks_live(vid):
    from youtube_transcript_api import YouTubeTranscriptApi
    tl = YouTubeTranscriptApi().list(vid)
    human = [t for t in tl if not t.is_generated]
    en = next(t for t in human if t.language_code.startswith('en')).fetch()
    he = next(t for t in human if t.language_code in ('iw', 'he')).fetch()
    return [(s.start, s.duration, clean(s.text)) for s in en], [(s.start, s.duration, clean(s.text)) for s in he]


def is_sound(t):
    return bool(re.fullmatch(r'[(\[].*[)\]]', t))  # (Laughter), [צחוק]


def best_offset(en, he):
    """Hebrew tracks are sometimes timed to an older upload (e.g. with a TED intro). Find the shift
    that lines up the most cue starts; segmentation can differ, so only some starts will match."""
    en_starts = sorted(s for s, _, _ in en)
    import bisect
    def hits(off):
        n = 0
        for s, _, _ in he:
            t = s + off
            i = bisect.bisect_left(en_starts, t)
            if any(0 <= j < len(en_starts) and abs(en_starts[j] - t) < 0.3 for j in (i - 1, i)):
                n += 1
        return n
    return max((o / 10 for o in range(-1200, 1201)), key=lambda o: (hits(o), -abs(o)))


def to_sentences(en, he):
    """Sentences come from the English cues; each Hebrew cue joins the sentence its (shifted) midpoint falls in."""
    out, cur = [], None
    for i, (start, dur, text) in enumerate(en):
        end = en[i + 1][0] if i + 1 < len(en) else start + dur
        if is_sound(text):
            if cur:
                out.append(cur)
                cur = None
            continue
        if cur is None:
            cur = {'start': start, 'end': end, 'en': text}
        else:
            cur['end'] = end
            cur['en'] += ' ' + text
        if re.search(r'[.?!]["\')]?$', text) or cur['end'] - cur['start'] > 14:
            out.append(cur)
            cur = None
    if cur:
        out.append(cur)
    off = best_offset(en, he)
    print(f'hebrew offset {off:+.1f}s', file=sys.stderr)
    he = [(s + off, d, t) for s, d, t in he if not is_sound(t) and not re.match(r'(תרגום|מתרגם|מתרגמת)', t)]
    for sent in out:
        sent['he'] = ' '.join(t for s, d, t in he if sent['start'] <= s + min(d, 6) / 2 < sent['end'])
    return [s for s in out if s['he'] and s['en']]


TOKEN = re.compile(r"[\w֐-׿'’\"״׳-]+")


def tokens(text):
    return [m.group(0).strip('-') for m in TOKEN.finditer(text) if m.group(0).strip('-"')]


LEVEL = {
    'type': 'score',
    'instructions': 'How hard is the Hebrew sentence `hebrew` for an English speaker learning Hebrew to understand when heard in a video, given `english` is its meaning?',
    'criteria': [
        'Beginner: short, common everyday words and simple grammar a first-year learner knows.',
        'Elementary: familiar vocabulary with a few less common words or a longer clause.',
        'Intermediate: abstract or less common vocabulary, idioms, or several clauses.',
        'Advanced: literary, technical, or idiomatic Hebrew that challenges fluent learners.',
    ],
}
EVERYDAY = {
    'type': 'noul',
    'instructions': 'Is `hebrew` (or a phrase inside it) something a Hebrew learner could reuse in everyday conversation?',
    'criteria': {
        'true': 'It contains a natural, reusable expression for daily life: opinions, feelings, time, plans, reactions, small talk.',
        'false': 'It is specific to this talk\'s narrow subject or technical content, with nothing reusable for daily speech.',
    },
}
FAITHFUL = {
    'type': 'noul',
    'instructions': 'Does `hebrew` express the same meaning as `english`, so a learner can use one to understand the other?',
    'criteria': {
        'true': 'The two say essentially the same thing, allowing for normal translation differences.',
        'false': 'Part of one sentence is missing from the other, or they say different things (misaligned subtitles).',
    },
}


def judge(sent):
    he_toks, en_toks = tokens(sent['he']), tokens(sent['en'])
    options = {f'{j}: {w}': None for j, w in enumerate(en_toks)}
    options['none'] = 'No single English word here translates it (grammar particle, or the meaning is spread across the phrase).'
    questions = {'level': LEVEL, 'everyday': EVERYDAY, 'faithful': FAITHFUL}
    for k, w in enumerate(he_toks):
        questions[f'w{k}'] = {
            'type': 'choice',
            'instructions': f'Hebrew word #{k} of `hebrew_words` is "{w}". As it is used in `hebrew`, which word of `english_words` (numbered by position) is its translation in `english`? For a Hebrew word with an attached prefix (ו, ה, ב, ל, מ, ש, כ), choose the English word for its main part.',
            'criteria': options,
        }
    state = {'hebrew': sent['he'], 'english': sent['en'],
             'hebrew_words': {str(k): w for k, w in enumerate(he_toks)},
             'english_words': {str(j): w for j, w in enumerate(en_toks)}}
    a = system_one(state, questions)
    align = []
    for k in range(len(he_toks)):
        ans = a[f'w{k}']
        c = ans['choice']
        align.append(int(c.split(':')[0]) if c != 'none' and ans['probabilities'][c] >= 0.35 else None)
    return {
        'start': round(sent['start'], 2), 'end': round(sent['end'], 2),
        'en': sent['en'], 'he': sent['he'],
        'enWords': en_toks, 'heWords': he_toks, 'align': align,
        'level': round(a['level']['score'], 2),
        'everyday': round(a['everyday']['noul'], 2),
        'faithful': round(a['faithful']['noul'], 2),
    }


def oembed(vid):
    try:
        with urllib.request.urlopen(f'https://www.youtube.com/oembed?url=https://youtu.be/{vid}&format=json', timeout=20) as r:
            d = json.load(r)
            return d['title'], d['author_name']
    except Exception:
        return vid, ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--slug')
    ap.add_argument('--limit', type=int)
    args = ap.parse_args()
    m = re.search(r'(?:v=|youtu\.be/|embed/|shorts/)([\w-]{11})', args.video) or re.fullmatch(r'([\w-]{11})', args.video)
    vid = m.group(1)
    title, author = oembed(vid)
    slug = args.slug or re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:60]

    en, he = fetch_tracks(vid)
    sents = to_sentences(en, he)[: args.limit]
    print(f'{title}: {len(sents)} sentences', file=sys.stderr)
    with cf.ThreadPoolExecutor(8) as ex:
        lines = list(ex.map(judge, sents))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = {'slug': slug, 'youtubeId': vid, 'title': title, 'channel': author,
           'source': f'https://www.youtube.com/watch?v={vid}', 'lines': lines}
    (OUT_DIR / f'{slug}.json').write_text(json.dumps(out, ensure_ascii=False, indent=0))
    print(f'wrote src/data/kolnoa/{slug}.json', file=sys.stderr)


if __name__ == '__main__':
    main()
