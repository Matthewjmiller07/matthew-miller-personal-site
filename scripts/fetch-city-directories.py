#!/usr/bin/env python3
"""
Fetch city directory OCR text from archive.org.

Run this LOCALLY (this sandbox's network can't reach archive.org). It searches
archive.org for city directory volumes, downloads their OCR'd full text
(*_djvu.txt), and writes a manifest.csv tying each text file back to its
source (title, year, archive.org URL) — so the file/manifest can be handed
off for name/occupation/address parsing into a sheet.

Usage:
    python3 fetch-city-directories.py --query "city directory" --rows 15 --outdir ./city_directories
    python3 fetch-city-directories.py --identifiers chicagocitydirec1900chic,detroitcitydirec1905detr --outdir ./city_directories
    python3 fetch-city-directories.py --query "city directory" --year-min 1900 --year-max 1920 --rows 25 --outdir ./city_directories

No third-party dependencies — standard library only.
"""

import argparse
import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

SEARCH_URL = "https://archive.org/advancedsearch.php"
METADATA_URL = "https://archive.org/metadata/{identifier}"
DOWNLOAD_URL = "https://archive.org/download/{identifier}/{filename}"
DETAILS_URL = "https://archive.org/details/{identifier}"

USER_AGENT = "Mozilla/5.0 (compatible; city-directory-fetcher/1.0; personal research use)"


def http_get(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def http_get_json(url, timeout=60):
    return json.loads(http_get(url, timeout=timeout))


def search_identifiers(query, rows, year_min, year_max, sort):
    q = f"title:({query}) AND mediatype:texts"
    if year_min or year_max:
        lo = year_min or "0"
        hi = year_max or "9999"
        q += f" AND year:[{lo} TO {hi}]"

    params = [
        ("q", q),
        ("fl[]", "identifier"),
        ("fl[]", "title"),
        ("fl[]", "year"),
        ("fl[]", "downloads"),
        ("rows", str(rows)),
        ("page", "1"),
        ("output", "json"),
    ]
    if sort:
        params.append(("sort[]", sort))

    url = SEARCH_URL + "?" + urllib.parse.urlencode(params)
    print(f"[search] {url}", file=sys.stderr)
    data = http_get_json(url)
    docs = data.get("response", {}).get("docs", [])
    print(f"[search] found {len(docs)} items", file=sys.stderr)
    return docs


def pick_text_file(files):
    """Return the best OCR text filename from an item's file list, or None."""
    txt_candidates = [f for f in files if f.get("format") == "DjVuTXT"]
    if not txt_candidates:
        txt_candidates = [
            f for f in files
            if f.get("name", "").endswith("_djvu.txt")
        ]
    if not txt_candidates:
        # fall back to any plain .txt that isn't a metadata/log file
        txt_candidates = [
            f for f in files
            if f.get("name", "").endswith(".txt")
            and "_meta" not in f.get("name", "")
            and "_files" not in f.get("name", "")
        ]
    if not txt_candidates:
        return None
    return txt_candidates[0]["name"]


def fetch_item(identifier, outdir, delay):
    meta_url = METADATA_URL.format(identifier=identifier)
    try:
        meta = http_get_json(meta_url)
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        print(f"[skip] {identifier}: metadata fetch failed ({e})", file=sys.stderr)
        return None

    files = meta.get("files", [])
    txt_name = pick_text_file(files)
    if not txt_name:
        print(f"[skip] {identifier}: no OCR text file found", file=sys.stderr)
        return None

    title = meta.get("metadata", {}).get("title", identifier)
    year = meta.get("metadata", {}).get("year", "")

    dl_url = DOWNLOAD_URL.format(identifier=identifier, filename=txt_name)
    local_name = f"{identifier}.txt"
    local_path = f"{outdir}/{local_name}"

    print(f"[fetch] {identifier} -> {local_path}", file=sys.stderr)
    try:
        content = http_get(dl_url, timeout=180)
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        print(f"[skip] {identifier}: text download failed ({e})", file=sys.stderr)
        return None

    with open(local_path, "wb") as f:
        f.write(content)

    time.sleep(delay)

    return {
        "identifier": identifier,
        "title": title,
        "year": year,
        "txt_file": local_name,
        "source_url": DETAILS_URL.format(identifier=identifier),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--query", default="city directory", help="Search query (used in title search). Default: 'city directory'")
    ap.add_argument("--rows", type=int, default=15, help="Max number of items to fetch from search. Default: 15")
    ap.add_argument("--sort", default="downloads desc", help="Sort order, e.g. 'downloads desc' or 'year asc'. Default: 'downloads desc'")
    ap.add_argument("--year-min", default=None, help="Restrict to items with year >= this value")
    ap.add_argument("--year-max", default=None, help="Restrict to items with year <= this value")
    ap.add_argument("--identifiers", default=None, help="Comma-separated archive.org identifiers to fetch directly, skipping search")
    ap.add_argument("--outdir", default="./city_directories", help="Output directory for .txt files + manifest.csv")
    ap.add_argument("--delay", type=float, default=1.0, help="Seconds to sleep between downloads (politeness). Default: 1.0")
    args = ap.parse_args()

    import os
    os.makedirs(args.outdir, exist_ok=True)

    if args.identifiers:
        identifiers = [i.strip() for i in args.identifiers.split(",") if i.strip()]
    else:
        docs = search_identifiers(args.query, args.rows, args.year_min, args.year_max, args.sort)
        identifiers = [d["identifier"] for d in docs if d.get("identifier")]

    if not identifiers:
        print("No identifiers to fetch.", file=sys.stderr)
        sys.exit(1)

    manifest_rows = []
    for i, identifier in enumerate(identifiers, 1):
        print(f"--- [{i}/{len(identifiers)}] {identifier} ---", file=sys.stderr)
        row = fetch_item(identifier, args.outdir, args.delay)
        if row:
            manifest_rows.append(row)

    manifest_path = f"{args.outdir}/manifest.csv"
    with open(manifest_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["identifier", "title", "year", "txt_file", "source_url"])
        writer.writeheader()
        writer.writerows(manifest_rows)

    print(f"\nDone. Fetched {len(manifest_rows)}/{len(identifiers)} volumes.", file=sys.stderr)
    print(f"Manifest: {manifest_path}", file=sys.stderr)
    print(f"Text files: {args.outdir}/*.txt", file=sys.stderr)


if __name__ == "__main__":
    main()
