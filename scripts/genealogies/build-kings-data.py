"""Build public/data/genealogies/kings-names.json from babynamesIL.

Method mirrors the shipped public/data/genealogies/names.json exactly:
- series: yearly counts 1949-2024 per sector|sex group, from load_data()
  (only years with >=5 babies appear in the source; the rest are 0).
  Empty {} when a name never reaches 5 in any single year.
- totals: all-time totals per group, from load_totals() (this table runs
  wider than the yearly series, e.g. it includes 1948, which is why totals
  can exceed the series sum -- verified against shipped מנשה/נדב/אדם).
- peak: max single-year count in the series, else null.
- bestRank: best (lowest) competition rank of the name within its
  sector|sex group in any year, from the full yearly table.

Spellings come from src/data/genealogies/kings.json (counted `names` only;
homograph rows keep their spelling here so the page can show the raw
count with a marker, but the page excludes homographs from kingdom
totals and the trend chart).

Run with a venv that has babynamesil installed, e.g.:

    python3 -m venv /tmp/kings-venv && /tmp/kings-venv/bin/pip install babynamesil
    /tmp/kings-venv/bin/python scripts/genealogies/build-kings-data.py
"""
import json
import sys
from collections import defaultdict

import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KINGS = json.load(open(os.path.join(ROOT, "src/data/genealogies/kings.json")))
SHIPPED = json.load(open(os.path.join(ROOT, "public/data/genealogies/names.json")))

import babynamesil

df = babynamesil.load_data()
tot = babynamesil.load_totals()

YEARS = list(range(1949, 2025))
Y0 = 1949

spellings = sorted({s for k in KINGS for s in k["names"]})

# competition ranks per (sector, sex, year): rank = 1 + # names with larger n
rank_of = {}
for (sec, sex, yr), grp in df.groupby(["sector", "sex", "year"]):
    ordered = grp.sort_values("n", ascending=False)
    ranks = {}
    prev_n, prev_r = None, 0
    for i, (_, r) in enumerate(ordered.iterrows()):
        if r["n"] != prev_n:
            prev_r = i + 1
            prev_n = r["n"]
        ranks[r["name"]] = prev_r
    rank_of[(sec, sex, int(yr))] = ranks

out_names = {}
for sp in spellings:
    sub = df[df.name == sp]
    series = {}
    for (sec, sex), grp in sub.groupby(["sector", "sex"]):
        arr = [0] * len(YEARS)
        for _, r in grp.iterrows():
            arr[int(r.year) - Y0] = int(r.n)
        series[f"{sec}|{sex}"] = arr
    totals = {
        f"{r.sector}|{r.sex}": int(r.total)
        for _, r in tot[tot.name == sp].iterrows()
    }
    peak = None
    for g, arr in series.items():
        m = max(arr)
        if m > 0 and (peak is None or m > peak["n"]):
            peak = {"group": g, "year": Y0 + arr.index(m), "n": int(m)}
    best = None
    for (sec, sex, yr), ranks in rank_of.items():
        if sp in ranks:
            rk = ranks[sp]
            if best is None or rk < best[0]:
                best = [rk, f"{sec}|{sex}|{yr}"]
    if series or totals:
        out_names[sp] = {"series": series, "totals": totals, "peak": peak, "bestRank": best}

out = {
    "source": SHIPPED["source"],
    "years": [1949, 2024],
    "groupTotals": SHIPPED["groupTotals"],
    "names": out_names,
}
with open(os.path.join(ROOT, "public/data/genealogies/kings-names.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False)

# ---- verification: kingdom totals on both bases ----
def king_series_sum(k):
    t = 0
    for s in k["names"]:
        e = out_names.get(s)
        if e:
            for arr in e["series"].values():
                t += sum(arr)
    return t

def king_alltime(k):
    t = 0
    for s in k["names"]:
        e = out_names.get(s)
        if e:
            t += sum(e["totals"].values())
    return t

for kingdom in ("judah", "israel"):
    ks = [k for k in KINGS if k["kingdom"] == kingdom and not k["homograph"]]
    ss = sum(king_series_sum(k) for k in ks)
    at = sum(king_alltime(k) for k in ks)
    print(f"{kingdom}: 1949-2024 series sum = {ss:,} | all-time = {at:,} | kings = {len([k for k in KINGS if k['kingdom']==kingdom])}")
    top = sorted(ks, key=lambda k: king_alltime(k), reverse=True)[:5]
    for k in top:
        print(f"   top {k['en']}: series {king_series_sum(k):,} | all-time {king_alltime(k):,}")
extinct = [k for k in KINGS if king_alltime(k) == 0]
print(f"extinct names (0 babies): {len(extinct)} -> {[k['en'] for k in extinct]}")
print(f"spellings written: {len(out_names)}")
