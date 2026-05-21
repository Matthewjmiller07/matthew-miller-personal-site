#!/usr/bin/env python3
"""
Scrape all Hayom Yom daily entries from Chabad.org.
Structure: overview page → section pages (one per month) → daily entry links.
Outputs a complete ICS file for the Hebrew year 5786/5787.
"""
import re
import time
import json
import requests
from bs4 import BeautifulSoup
from convertdate import hebrew
from datetime import date

BASE = "https://www.chabad.org"

# Kislev section page - starting point
KISLEV_SECTION = f"{BASE}/therebbe/article_cdo/aid/3315255/jewish/Kislev.htm"

# Foreword entry
FOREWORD_AID = "3314964"
FOREWORD_URL = f"{BASE}/therebbe/article_cdo/aid/{FOREWORD_AID}/jewish/Foreword.htm"

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; calendar-builder/1.0)"}

# Hebrew month number → name (convertdate uses Nisan=1, Tishrei=7)
HMONTH_NUM = {
    "Nisan": 1, "Iyar": 2, "Sivan": 3, "Tammuz": 4, "Av": 5, "Elul": 6,
    "Tishrei": 7, "Cheshvan": 8, "Kislev": 9, "Teves": 10, "Tevet": 10,
    "Shvat": 11, "Adar": 12, "Adar I": 12, "Adar-I": 12,
    "Adar II": 13, "Adar-II": 13,
}

def get(url):
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def scrape_section(section_url):
    """Return list of (aid, slug, title) from a monthly section page, and next_section_url."""
    soup = get(section_url)
    entries = []

    # Find all article links matching the daily entry pattern
    for a in soup.find_all("a", href=True):
        href = a["href"]
        # Daily entries look like /therebbe/article_cdo/aid/NNNNNN/jewish/XXX.htm
        # but NOT section pages (which are short like /jewish/Kislev.htm or /jewish/Teves.htm)
        m = re.match(r"/therebbe/article_cdo/aid/(\d+)/jewish/(.+)\.htm$", href)
        if not m:
            continue
        aid = m.group(1)
        slug = m.group(2)
        text = a.get_text(strip=True)
        # Skip section-level entries (very short slugs like "Kislev", "Teves")
        if not re.search(r"\d", slug):
            continue
        if (aid, slug) not in [(e[0], e[1]) for e in entries]:
            entries.append((aid, slug, text))

    # Find Next section link
    next_url = None
    for a in soup.find_all("a", href=True):
        text = a.get_text(strip=True)
        if "Next" in text or text == "»":
            href = a["href"]
            # Only follow section-level links (no digit in slug)
            m = re.match(r"/therebbe/article_cdo/aid/(\d+)/jewish/([A-Za-z-]+)\.htm$", href)
            if m and not re.search(r"\d", m.group(2)):
                next_url = BASE + href
                break

    return entries, next_url


def collect_all_sections():
    """Follow Next links across all monthly sections, collecting all daily entries."""
    all_entries = []
    url = KISLEV_SECTION
    visited = set()

    while url and url not in visited:
        visited.add(url)
        print(f"  Section: {url}")
        entries, next_url = scrape_section(url)
        print(f"    → {len(entries)} daily entries")
        all_entries.extend(entries)
        url = next_url
        if url:
            time.sleep(0.5)

    return all_entries


def parse_hebrew_date_from_slug(slug):
    """
    Parse day number and month name from a URL slug.
    e.g. "19-Kislev" → (19, "Kislev")
         "1-Teves-Rosh-Chodesh-Day-6-of-Chanukah" → (1, "Teves")
         "1-Adar-I" → (1, "Adar I")
    """
    slug = slug.replace("_", "-")
    m = re.match(r"^(\d+)-(.+)$", slug)
    if not m:
        return None, None
    day = int(m.group(1))
    rest = m.group(2)

    # Match month name (handle Adar-I and Adar-II specially)
    for month_name in sorted(HMONTH_NUM.keys(), key=len, reverse=True):
        norm = month_name.replace(" ", "-")
        if rest.startswith(norm):
            return day, month_name
    # Try first word
    first_word = rest.split("-")[0]
    if first_word in HMONTH_NUM:
        return day, first_word
    return day, None


def hebrew_to_gregorian(year, month_name, day):
    """Convert Hebrew date to Gregorian date."""
    hmonth = HMONTH_NUM.get(month_name)
    if hmonth is None:
        return None
    try:
        g = hebrew.to_gregorian(year, hmonth, day)
        return date(*g)
    except Exception:
        return None


def assign_dates(all_entries):
    """
    Assign a Gregorian date to each entry.
    The cycle runs 19 Kislev 5786 through 18 Kislev 5787.
    Adar I entries → 5787 (leap year), Adar II → 5786 (regular Adar).
    """
    result = []

    for aid, slug, title in all_entries:
        day, month_name = parse_hebrew_date_from_slug(slug)
        if day is None or month_name is None:
            print(f"  WARNING: could not parse date from slug '{slug}'")
            continue

        # Determine Hebrew year
        # Kislev (days 19-29), Tevet, Shvat, Adar II, Nissan, Iyar, Sivan,
        # Tammuz, Av, Elul → 5786
        # Adar I → 5787 (leap year only)
        # Tishrei, Cheshvan, Kislev (days 1-18) → 5787
        if month_name in ("Adar I", "Adar-I"):
            year = 5787  # leap year
        elif month_name in ("Tishrei", "Cheshvan"):
            year = 5787
        elif month_name in ("Kislev",):
            # Days 19-29 are in 5786; days 1-18 are in 5787
            if day >= 19:
                year = 5786
            else:
                year = 5787
        else:
            year = 5786

        gdate = hebrew_to_gregorian(year, month_name, day)
        if gdate is None:
            print(f"  WARNING: could not convert {day} {month_name} {year} to Gregorian")
            continue

        result.append({
            "aid": aid,
            "slug": slug,
            "title": title,
            "url": f"{BASE}/therebbe/article_cdo/aid/{aid}/jewish/{slug}.htm",
            "date": gdate.strftime("%Y%m%d"),
            "date_end": (gdate.replace(year=gdate.year) if True else gdate),
            "month_name": month_name,
            "day": day,
            "hebrew_year": year,
        })

    # Sort by Gregorian date
    result.sort(key=lambda x: x["date"])
    return result


def build_ics(foreword_entry, entries):
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Hayom Yom//Tackling Life's Tasks//EN",
        "CALSCALE:GREGORIAN",
        "X-WR-CALNAME:Hayom Yom - Tackling Life's Tasks",
        "X-WR-CALDESC:Daily Chassidic teachings - Hayom Yom",
    ]

    def add_event(dtstart, summary, url, uid):
        # Compute DTEND = day after
        from datetime import datetime, timedelta
        d = datetime.strptime(dtstart, "%Y%m%d")
        dtend = (d + timedelta(days=1)).strftime("%Y%m%d")
        # Escape commas in summary
        summary_esc = summary.replace(",", "\\,")
        lines.extend([
            "BEGIN:VEVENT",
            f"DTSTART;VALUE=DATE:{dtstart}",
            f"DTEND;VALUE=DATE:{dtend}",
            f"SUMMARY:{summary_esc}",
            f"URL:{url}",
            f"DESCRIPTION:{url}",
            f"UID:{uid}",
            "END:VEVENT",
        ])

    # Foreword: placed on 18 Kislev 5786 = Dec 8, 2025
    foreword_gdate = hebrew_to_gregorian(5786, "Kislev", 18)
    add_event(
        foreword_gdate.strftime("%Y%m%d"),
        "Hayom Yom - Foreword",
        FOREWORD_URL,
        f"hayomyom-{FOREWORD_AID}@chabad.org",
    )

    for e in entries:
        add_event(
            e["date"],
            f"Hayom Yom - {e['title']}",
            e["url"],
            f"hayomyom-{e['aid']}@chabad.org",
        )

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


if __name__ == "__main__":
    print("=== Scraping Hayom Yom section pages ===")
    raw_entries = collect_all_sections()
    print(f"\nTotal raw entries: {len(raw_entries)}")

    # Save raw for debugging
    with open("/tmp/hayom_yom_raw.json", "w") as f:
        json.dump(raw_entries, f, indent=2)

    print("\n=== Assigning Gregorian dates ===")
    entries = assign_dates(raw_entries)
    print(f"Total dated entries: {len(entries)}")

    # Save dated for debugging
    with open("/tmp/hayom_yom_dated.json", "w") as f:
        json.dump(
            [{**e, "date_end": None} for e in entries],
            f, indent=2, default=str
        )

    print("\n=== Building ICS ===")
    ics = build_ics(None, entries)

    import os
    out_path = "/Applications/apps/matthew-miller-personal-site/public/calendar/hayom_yom.ics"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", newline="") as f:
        f.write(ics)
    print(f"Wrote {ics.count('BEGIN:VEVENT')} events to {out_path}")
