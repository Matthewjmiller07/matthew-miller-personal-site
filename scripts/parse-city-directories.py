#!/usr/bin/env python3
"""
Best-effort parser for OCR'd city directory text (Polk-style wrapped
entries and comma-style UK/Canadian directories) into name / occupation /
address / source rows.

City directory OCR text is messy: entries wrap across multiple physical
lines, ad blocks and running heads are interleaved, ditto marks (") stand
in for a repeated surname, and abbreviations vary (h=home, r=rooms/renter,
b=boards). This is a best-effort heuristic extractor tuned to maximize
recall on real Polk/comma-style directories while dropping chunks that
don't look like a name+address entry, rather than emitting garbage.

Key insight: a new directory entry (almost) always starts at the
beginning of an OCR line, with the surname (or a ditto mark) as its first
token. Wrapped continuation lines start with a lowercase word or a
mid-address token. We use that line-start signal to group wrapped lines
back into whole entries, rather than trying to split a single joined blob
by address markers (which merges unrelated entries together whenever an
entry lacks an explicit h/r/b marker).

Usage:
    python3 parse-city-directories.py file1.txt [file2.txt ...] --out entries.csv
"""

import argparse
import csv
import os
import re
import sys

# Lines with zero lowercase letters are almost always ad headers / captions /
# page furniture (business ad blocks, "TEL. MAIN 1036", running heads), never
# real directory entries (which always contain a lowercase occupation word
# or lowercase given-name letters).
NOISE_LINE_RE = re.compile(r'^[^a-z]*$')

# A line ending in "word-" (hyphen glued to a letter, no space before it) is
# an OCR line-wrap mid-word; join without a space and drop the hyphen.
HYPHEN_WRAP_RE = re.compile(r'[A-Za-z]-$')

# A line that starts a new entry: a ditto mark, or a capitalized "surname"
# token immediately followed by another capitalized token / initial / an
# open-paren (the start of "Surname Firstname" or "Surname (spouse)").
ENTRY_START_RE = re.compile(
    r'^(?:"|[A-Z][A-Za-z\'’\-]{1,25}[.,]?\s+(?:[A-Z][A-Za-z\'’.\-]*|\())'
)

# Common street-suffix / directional words that make a 2-capitalized-word
# line look like an entry start but are actually a wrapped street address
# continuation (e.g. "Lincoln Way E", "Colfax av"). Used to suppress those
# false positives.
STREET_WORD_RE = re.compile(
    r'^(?:Way|Ave?|Avenue|Blvd|Boulevard|St|Street|Rd|Road|Dr|Drive|Pl|Place|'
    r'Ct|Court|Ter|Terrace|Ln|Lane|Pk|Park|Sq|Square|Hwy|Highway|N|S|E|W|Ne|Nw|Se|Sw)\.?$'
)

ADDR_RE = re.compile(
    r'\b(?P<mark>[HRBhrb])\.?\s?(?P<house>\d{1,6}[½%]?)'
    r'(?P<street>(?:\s+[A-Za-z0-9&\'.]+){0,5})'
)

DITTO_RE = re.compile(r'^"\s*')
SURNAME_RE = re.compile(r'^(?P<surname>[A-Z][A-Za-z\'’\-]{1,25})[.,]?\s+')
GIVEN_RE = re.compile(
    r'^(?P<given>(?:[A-Z][A-Za-z\'’.\-]*\s*){1,2})'
    r'(?:\((?P<spouse>[^)]{1,40})\))?[\s,]*'
)

MIN_OCCUPATION_LEN = 2
MAX_ENTRY_LEN = 220  # discard implausibly long blobs (multiple entries got merged)


def is_noise(line):
    return not line or NOISE_LINE_RE.match(line) is not None


def is_entry_start(line):
    m = ENTRY_START_RE.match(line)
    if not m:
        return False
    if line.startswith('"'):
        return True
    # suppress false positives where the 2nd capitalized token is a street suffix
    tokens = line.split()
    if len(tokens) >= 2 and STREET_WORD_RE.match(tokens[1].strip(',.')):
        return False
    return True


def group_entries(raw_text):
    """Yield raw entry-text blobs by grouping wrapped continuation lines
    under the line that starts each entry."""
    kept = [ln.strip() for ln in raw_text.splitlines()]
    kept = [ln for ln in kept if not is_noise(ln)]

    buf = []
    for line in kept:
        if is_entry_start(line) and buf:
            yield merge_wrapped(buf)
            buf = [line]
        else:
            buf.append(line)
    if buf:
        yield merge_wrapped(buf)


def merge_wrapped(lines):
    merged = []
    for part in lines:
        if merged and HYPHEN_WRAP_RE.search(merged[-1]) and part[:1].islower():
            merged[-1] = merged[-1][:-1] + part
        else:
            merged.append(part)
    return " ".join(merged)


def parse_entry(blob, last_surname):
    if not blob or len(blob) > MAX_ENTRY_LEN:
        return None, last_surname

    ditto_m = DITTO_RE.match(blob)
    if ditto_m:
        surname = last_surname
        after_name = blob[ditto_m.end():]
    else:
        sn_m = SURNAME_RE.match(blob)
        if not sn_m:
            return None, last_surname
        surname = sn_m.group("surname")
        after_name = blob[sn_m.end():]
    if not surname:
        return None, last_surname

    gv_m = GIVEN_RE.match(after_name)
    if gv_m:
        given = (gv_m.group("given") or "").strip().rstrip(",")
        rest = after_name[gv_m.end():].strip(" ,")
    else:
        given = ""
        rest = after_name.strip(" ,")

    addr_matches = list(ADDR_RE.finditer(rest))
    if not addr_matches:
        return None, surname
    addr_m = addr_matches[-1]

    occupation = rest[: addr_m.start()].strip(" ,;")
    if len(occupation) < MIN_OCCUPATION_LEN:
        occupation = ""

    street = re.sub(r'\s+', ' ', addr_m.group("street")).strip()
    address = f'{addr_m.group("mark")}{addr_m.group("house")} {street}'.strip()

    name = f"{surname}, {given}".strip(", ")
    return {
        "name": name,
        "occupation": occupation,
        "address": address,
    }, surname


def parse_entries(text, source):
    rows = []
    last_surname = None
    for blob in group_entries(text):
        row, last_surname = parse_entry(blob, last_surname)
        if row:
            row["source"] = source
            rows.append(row)
    return rows


def source_for(path):
    base = os.path.splitext(os.path.basename(path))[0]
    # strip an 8-hex-char upload prefix like "92097b8a-polksouthbendind00polk"
    m = re.match(r'^[0-9a-f]{8}-(.+)$', base)
    identifier = m.group(1) if m else base
    return f"{identifier} (https://archive.org/details/{identifier})"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+", help="OCR .txt files to parse")
    ap.add_argument("--out", default="city_directory_entries.csv", help="Output CSV path")
    args = ap.parse_args()

    all_rows = []
    for path in args.files:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            raw = f.read()
        source = source_for(path)
        rows = parse_entries(raw, source)
        print(f"[{os.path.basename(path)}] {len(rows)} entries extracted", file=sys.stderr)
        all_rows.extend(rows)

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["name", "occupation", "address", "source"])
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"\nTotal: {len(all_rows)} entries -> {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
