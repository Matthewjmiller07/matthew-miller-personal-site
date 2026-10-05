#!/usr/bin/env python3
"""Crawl a Geni family tree via the Geni API and write it out as GEDCOM 5.5.1.

Starts from one profile and walks outward with the `immediate-family` endpoint
(parents, partners, children, siblings), breadth-first, until it hits the depth
or profile cap. Every API response is cached to disk, so an interrupted crawl
resumes where it left off and re-runs don't re-hit the API.

Usage:
    python3 geni_to_gedcom.py https://www.geni.com/people/Herschel-Grynszpan/6000000036887571515 \
        --depth 6 --max-profiles 3000 --out grynszpan.ged

A token is optional (public profiles work without one) but private relatives
and higher rate limits need one. Get it from https://www.geni.com/platform/developer
and pass --token or set GENI_ACCESS_TOKEN.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import deque
from datetime import date
from pathlib import Path

API = "https://www.geni.com/api"
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
PROFILE_FIELDS = ",".join([
    "id", "guid", "url", "profile_url", "first_name", "middle_name", "last_name", "maiden_name",
    "suffix", "display_name", "names", "gender", "is_alive", "birth", "baptism", "death",
    "burial", "occupation", "about_me", "nicknames", "public",
])


def guid_from_arg(arg):
    m = re.search(r"(\d{10,})", arg)
    if not m:
        sys.exit(f"Can't find a Geni profile id in {arg!r}")
    return m.group(1)


class Geni:
    def __init__(self, token, cache_dir, delay):
        self.token = token
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.delay = delay
        self.calls = 0

    def immediate_family(self, node_id):
        cache = self.cache_dir / f"{node_id}.json"
        if cache.exists():
            return json.loads(cache.read_text())
        params = {"fields": PROFILE_FIELDS}
        if self.token:
            params["access_token"] = self.token
        url = f"{API}/{node_id}/immediate-family?{urllib.parse.urlencode(params)}"
        data = self._get(url)
        cache.write_text(json.dumps(data))
        return data

    def _get(self, url):
        for attempt in range(6):
            time.sleep(self.delay)
            req = urllib.request.Request(url, headers={"User-Agent": "geni-to-gedcom/1.0"})
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    self.calls += 1
                    remaining = resp.headers.get("X-API-Rate-Remaining")
                    window = resp.headers.get("X-API-Rate-Window")
                    if remaining is not None and int(remaining) <= 1 and window:
                        time.sleep(int(window))
                    return json.loads(resp.read())
            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503, 504):
                    wait = int(e.headers.get("X-API-Rate-Window") or 2 ** (attempt + 1))
                    print(f"  HTTP {e.code}, retrying in {wait}s", file=sys.stderr)
                    time.sleep(wait)
                    continue
                if e.code in (401, 403, 404):
                    print(f"  HTTP {e.code} for {url.split('?')[0]} — skipping", file=sys.stderr)
                    return {}
                raise
            except urllib.error.URLError as e:
                wait = 2 ** (attempt + 1)
                print(f"  {e.reason}, retrying in {wait}s", file=sys.stderr)
                time.sleep(wait)
        raise RuntimeError(f"Giving up on {url}")


def crawl(geni, start, depth, max_profiles):
    """BFS over profiles. Returns (profiles, unions) keyed by Geni node id."""
    profiles, unions = {}, {}
    seen = {start}
    queue = deque([(start, 0)])
    while queue and len(profiles) < max_profiles:
        node_id, d = queue.popleft()
        data = geni.immediate_family(node_id)
        nodes = data.get("nodes") or {}
        focus = data.get("focus")
        if focus:
            nodes.setdefault(focus.get("id", node_id), focus)
            seen.add(focus.get("id"))
        for nid, node in nodes.items():
            if nid.startswith("union-"):
                u = unions.setdefault(nid, {"edges": {}})
                u["edges"].update(node.get("edges") or {})
                u.update({k: v for k, v in node.items() if k != "edges"})
            elif nid.startswith("profile-"):
                p = profiles.setdefault(nid, {})
                edges = {**p.get("edges", {}), **(node.get("edges") or {})}
                p.update(node)
                p["edges"] = edges
                if d < depth and nid not in seen:
                    seen.add(nid)
                    queue.append((nid, d + 1))
        name = (profiles.get(focus.get("id")) if focus else None) or {}
        print(f"[{len(profiles):>5} people, {len(queue):>5} queued, depth {d}] "
              f"{name.get('display_name') or node_id}", file=sys.stderr)
    return profiles, unions


# ---------- GEDCOM ----------

def ged_date(ev):
    dt = (ev or {}).get("date") or {}
    y, m, dd = dt.get("year"), dt.get("month"), dt.get("day")
    if not y:
        return None
    parts = []
    if dd and m:
        parts.append(str(dd))
    if m:
        parts.append(MONTHS[int(m) - 1])
    parts.append(str(y))
    s = " ".join(parts)
    if dt.get("circa"):
        s = "ABT " + s
    rng = dt.get("range")
    if rng == "before":
        s = "BEF " + s
    elif rng == "after":
        s = "AFT " + s
    elif rng == "between" and dt.get("end_year"):
        s = f"BET {s} AND {dt['end_year']}"
    return s


def ged_place(ev):
    loc = (ev or {}).get("location") or {}
    if loc.get("place_name"):
        return loc["place_name"]
    parts = [loc.get(k) for k in ("city", "county", "state", "country")]
    parts = [p for p in parts if p]
    return ", ".join(parts) or loc.get("formatted_location")


def text_lines(level, tag, text):
    """Emit a (possibly multi-line, long) value with CONT/CONC."""
    out = []
    for i, line in enumerate(str(text).replace("\r", "").split("\n")):
        chunks = [line[j:j + 200] for j in range(0, len(line), 200)] or [""]
        for k, chunk in enumerate(chunks):
            if i == 0 and k == 0:
                out.append(f"{level} {tag} {chunk}".rstrip())
            elif k == 0:
                out.append(f"{level + 1} CONT {chunk}".rstrip())
            else:
                out.append(f"{level + 1} CONC {chunk}")
    return out


def to_gedcom(profiles, unions, source_url):
    ids = {nid: f"@I{i}@" for i, nid in enumerate(sorted(profiles), 1)}
    fams = {}
    for uid, u in sorted(unions.items()):
        partners = [p for p, e in u["edges"].items() if e.get("rel") == "partner" and p in ids]
        children = [p for p, e in u["edges"].items() if e.get("rel") == "child" and p in ids]
        if len(partners) + len(children) >= 2 or (partners and children):
            fams[uid] = (partners, children)
    fam_ids = {uid: f"@F{i}@" for i, uid in enumerate(fams, 1)}

    L = ["0 HEAD", "1 SOUR geni-to-gedcom", "2 NAME Geni API crawler", "1 GEDC",
         "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8",
         f"1 DATE {date.today().strftime('%d %b %Y').upper()}"]
    L += text_lines(1, "NOTE", f"Crawled from {source_url}")

    for nid, p in sorted(profiles.items(), key=lambda kv: ids[kv[0]]):
        L.append(f"0 {ids[nid]} INDI")
        given = " ".join(x for x in (p.get("first_name"), p.get("middle_name")) if x)
        surname = p.get("last_name") or p.get("maiden_name") or ""
        if given or surname:
            L.append(f"1 NAME {given} /{surname}/".strip() + (f" {p['suffix']}" if p.get("suffix") else ""))
            if given:
                L.append(f"2 GIVN {given}")
            if surname:
                L.append(f"2 SURN {surname}")
        else:
            L.append(f"1 NAME {p.get('display_name') or 'Unknown'}")
        if p.get("maiden_name") and p.get("last_name") and p["maiden_name"] != p["last_name"]:
            L.append(f"1 NAME {given} /{p['maiden_name']}/".strip())
            L.append("2 TYPE birth")
        for lang, n in (p.get("names") or {}).items():
            alt = " ".join(x for x in (n.get("first_name"), n.get("middle_name")) if x)
            alt_sur = n.get("last_name") or n.get("maiden_name") or ""
            if (alt, alt_sur) != (given, surname) and (alt or alt_sur):
                L.append(f"1 NAME {alt} /{alt_sur}/".strip())
                L.append(f"2 LANG {lang}")
        if p.get("nicknames"):
            L.append(f"1 NICK {p['nicknames'] if isinstance(p['nicknames'], str) else ', '.join(p['nicknames'])}")
        g = (p.get("gender") or "").lower()
        L.append(f"1 SEX {'M' if g == 'male' else 'F' if g == 'female' else 'U'}")
        for tag, key in (("BIRT", "birth"), ("BAPM", "baptism"), ("DEAT", "death"), ("BURI", "burial")):
            ev = p.get(key)
            d, pl = ged_date(ev), ged_place(ev)
            if d or pl:
                L.append(f"1 {tag}")
                if d:
                    L.append(f"2 DATE {d}")
                if pl:
                    L.append(f"2 PLAC {pl}")
            elif key == "death" and p.get("is_alive") is False:
                L.append("1 DEAT Y")
        if p.get("occupation"):
            L.append(f"1 OCCU {p['occupation']}")
        for fid_key, e in (p.get("edges") or {}).items():
            if fid_key in fam_ids:
                L.append(f"1 {'FAMC' if e.get('rel') == 'child' else 'FAMS'} {fam_ids[fid_key]}")
        url = p.get("profile_url") or p.get("url")
        if url:
            L.append(f"1 WWW {url}")
        if p.get("guid"):
            L.append(f"1 REFN {p['guid']}")
            L.append("2 TYPE Geni")
        if p.get("about_me"):
            L += text_lines(1, "NOTE", p["about_me"])

    for uid, (partners, children) in fams.items():
        L.append(f"0 {fam_ids[uid]} FAM")
        def sex(pid):
            return (profiles[pid].get("gender") or "").lower()
        husb = [x for x in partners if sex(x) == "male"]
        wife = [x for x in partners if sex(x) == "female"]
        rest = [x for x in partners if x not in husb and x not in wife]
        for x in rest:
            (husb if not husb else wife).append(x)
        if husb:
            L.append(f"1 HUSB {ids[husb[0]]}")
        if wife:
            L.append(f"1 WIFE {ids[wife[0]]}")
        u = unions[uid]
        for tag, key in (("MARR", "marriage"), ("DIV", "divorce")):
            ev = u.get(key)
            d, pl = ged_date(ev), ged_place(ev)
            if d or pl:
                L.append(f"1 {tag}")
                if d:
                    L.append(f"2 DATE {d}")
                if pl:
                    L.append(f"2 PLAC {pl}")
        for c in children:
            L.append(f"1 CHIL {ids[c]}")

    L.append("0 TRLR")
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("profile", help="Geni profile URL or numeric guid")
    ap.add_argument("--token", default=os.environ.get("GENI_ACCESS_TOKEN"))
    ap.add_argument("--depth", type=int, default=6, help="max hops from the start profile (default 6)")
    ap.add_argument("--max-profiles", type=int, default=3000)
    ap.add_argument("--delay", type=float, default=0.5, help="seconds between API calls")
    ap.add_argument("--cache", default=None, help="cache dir (default: .geni-cache/<guid>)")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    guid = guid_from_arg(args.profile)
    start = f"profile-g{guid}"
    geni = Geni(args.token, args.cache or f".geni-cache/{guid}", args.delay)
    profiles, unions = crawl(geni, start, args.depth, args.max_profiles)
    out = args.out or f"geni-{guid}.ged"
    Path(out).write_text(to_gedcom(profiles, unions, args.profile), encoding="utf-8")
    print(f"Wrote {out}: {len(profiles)} people, {len(unions)} unions ({geni.calls} API calls)",
          file=sys.stderr)


if __name__ == "__main__":
    main()
