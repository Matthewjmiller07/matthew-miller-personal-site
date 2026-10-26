"""Pick the evidence sentence for each flagged section (Jev choice), then write the site's data file."""
import json, os, re, sys, glob, urllib.request
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
from jev import PRINCIPLES, KEY

WATCH = 0.4  # P(level 3 or 4) at which a section is shown
OUT = '/Applications/apps/matthew-miller-personal-site/src/data/jj/podcast.json'

def hi(a): return a['probabilities'].get('3', 0) + a['probabilities'].get('4', 0)

def sentences(text):
    s = [x.strip() for x in re.split(r'(?<=[.?!])\s+', re.sub(r'Speaker \d+:\s*', '', text)) if len(x.split()) >= 5]
    return s[:200]

def pick(text, p):
    sents = sentences(text)
    n, d = PRINCIPLES[p]
    q = {"s": {"type": "choice",
        "instructions": f"Which sentence in `passage` most directly states the idea that departs from Rambam's principle #{p+1} ({n}: {d})?",
        "criteria": {f"s{i}": s for i, s in enumerate(sents)}}}
    body = json.dumps({"model": "jev-latest", "state": {"passage": text}, "questions": q}).encode()
    r = json.load(urllib.request.urlopen(urllib.request.Request("https://api.typesafe.ai/v1/systemone", body,
        {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}), timeout=120))
    i = int(r['answers']['s']['choice'][1:])
    words = ' '.join(sents[i:i+2]).split()
    return ' '.join(words[:55]) + (' …' if len(words) > 55 else '')

eps = json.load(open('episodes.json'))
episodes = []
for ep in eps:
    f = f"analysis/{ep['guid']}.json"
    if not os.path.exists(f):
        episodes.append({"n": ep['title'].split('.')[0], "title": ep['title'], "link": ep['link'], "date": ep['date'][5:16], "pending": True}); continue
    d = json.load(open(f))
    todo = [s for s in d['sections'] if 'excerpt' not in s and max(hi(s['answers'][f'p{i+1}']) for i in range(13)) >= WATCH]
    def go(s):
        top = max(range(13), key=lambda i: hi(s['answers'][f'p{i+1}']))
        s['excerpt'] = pick(s['text'], top)
    with ThreadPoolExecutor(6) as ex: list(ex.map(go, todo))
    json.dump(d, open(f, 'w'))
    secs = []
    for s in d['sections']:
        a = s['answers']
        secs.append({"t": s['start'], "r": [round(a[f'p{i+1}']['score'], 1) for i in range(13)],
                     "h": [round(hi(a[f'p{i+1}']), 2) for i in range(13)], "v": a['voice']['choice'],
                     **({"x": s['excerpt']} if 'excerpt' in s else {})})
    episodes.append({"n": ep['title'].split('.')[0], "title": ep['title'], "link": ep['link'], "date": ep['date'][5:16],
                     "dur": ep['dur'], "src": d['source'], "sections": secs})
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({"principles": [{"name": n, "text": t} for n, t in PRINCIPLES], "watch": WATCH,
           "feed": "https://www.spreaker.com/show/5779269/episodes/feed", "episodes": episodes}, open(OUT, 'w'), ensure_ascii=False)
print(sum(1 for e in episodes if not e.get('pending')), 'analyzed;', sum(len([s for s in e.get('sections', []) if 'x' in s]) for e in episodes), 'flagged sections;', os.path.getsize(OUT), 'bytes')
