"""Run Jev over each transcript section and rate it against the Rambam's 13 principles."""
import json, os, re, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

KEY = os.environ['TYPESAFE_API_KEY']
PRINCIPLES = [
  ("God exists", "God exists and is the cause of all that exists"),
  ("God is one", "God is one, with an absolute unity unlike any other"),
  ("God is incorporeal", "God has no body or physical form and is unaffected by physical events"),
  ("God is eternal", "God is eternal and preceded everything"),
  ("Worship God alone", "Only God may be worshipped and prayed to, with no intermediary"),
  ("Prophecy", "God communicates with human beings through true prophecy"),
  ("Moses' prophecy", "The prophecy of Moses was true and superior to that of all other prophets"),
  ("Torah from Heaven", "The entire Torah we have was given by God to Moses, word for word (Torah min hashamayim), including the Oral Law's core"),
  ("Torah is unchanging", "The Torah will never be replaced, revised, or abrogated"),
  ("God knows our deeds", "God knows human deeds and thoughts"),
  ("Reward and punishment", "God rewards those who keep the commandments and punishes those who transgress"),
  ("The Messiah", "The Messiah will come"),
  ("Resurrection", "The dead will be resurrected"),
]
LEVELS = [
  "The passage does not bear on this principle at all",
  "The passage touches on this topic and is consistent with the principle, or simply affirms it",
  "The passage frames the topic academically or historically in a way some traditionalists would find uncomfortable, without disputing the principle",
  "The passage implies doubt about the principle or presents a view that would undermine it, without rejecting it outright",
  "The passage openly denies or rejects the principle, presenting that denial as true",
]

def ask(state):
    q = {f"p{i+1}": {"type": "score",
        "instructions": f"Rambam's principle of faith #{i+1} ({n}): {d}. How far does what is said in `passage` depart from this principle? Judge the ideas the speakers put forward, not topics merely mentioned.",
        "criteria": LEVELS} for i,(n,d) in enumerate(PRINCIPLES)}
    q["voice"] = {"type": "choice",
        "instructions": "In `passage`, how do the speakers relate to the most theologically sensitive idea discussed?",
        "criteria": {"endorse": "A speaker asserts the idea as their own view",
                     "report": "A speaker describes or quotes what scholars, texts or others hold, without clearly adopting it",
                     "rebut": "A speaker raises the idea in order to argue against it",
                     "none": "Nothing theologically sensitive is discussed"}}
    body = json.dumps({"model": "jev-latest", "state": state, "questions": q}).encode()
    for attempt in range(5):
        try:
            req = urllib.request.Request("https://api.typesafe.ai/v1/systemone", body,
                {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
            return json.load(urllib.request.urlopen(req, timeout=120))
        except Exception as e:
            err = e; time.sleep(3 * (attempt + 1))
    raise err

def parse_srt(path):
    out = []
    for block in open(path, encoding='utf-8', errors='replace').read().strip().split('\n\n'):
        lines = block.strip().split('\n')
        if len(lines) < 3: continue
        m = re.match(r'(\d+):(\d+):(\d+)', lines[1])
        if not m: continue
        t = int(m[1])*3600 + int(m[2])*60 + int(m[3])
        txt = ' '.join(lines[2:]).strip()
        if txt and not re.fullmatch(r'\[.*\]|\(.*\)', txt): out.append((t, txt))
    return out

def sections(segs, target=450):
    cur, words, start = [], 0, None
    for t, txt in segs:
        if start is None: start = t
        cur.append(txt); words += len(txt.split())
        if words >= target and re.search(r'[.?!]$', txt):
            yield start, ' '.join(cur); cur, words, start = [], 0, None
    if cur: yield start, ' '.join(cur)

def run(ep):
    out = f"analysis/{ep['guid']}.json"
    src = f"srt/{ep['guid']}.srt"
    if os.path.exists(out) or not os.path.exists(src): return
    secs = list(sections(parse_srt(src)))
    def one(s):
        start, text = s
        r = ask({"episode": ep['title'], "episode_description": ep['desc'][:600], "passage": text})
        return {"start": start, "text": text, "answers": r["answers"], "tokens": r.get("usage", {}).get("input_tokens")}
    with ThreadPoolExecutor(6) as ex: res = list(ex.map(one, secs))
    json.dump({"guid": ep['guid'], "source": "feed" if 'application/x-subrip' in ep['transcripts'] else "whisper", "sections": res}, open(out, 'w'))
    print(ep['title'][:50], len(res), 'sections', sum(x['tokens'] or 0 for x in res), 'tokens', flush=True)

if __name__ == '__main__':
    eps = json.load(open('episodes.json'))
    only = sys.argv[1:]
    for ep in eps:
        if not only or ep['guid'] in only: run(ep)
