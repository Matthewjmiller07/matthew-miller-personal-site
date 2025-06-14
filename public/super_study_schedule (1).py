# -*- coding: utf-8 -*-
"""Super Study Schedule

Automatically generated by Colab.

Original file is located at
    https://colab.research.google.com/drive/1HiGDUKu_yFi8Iwb3lrpPLGcutk7J_5b5
"""

from google.colab import drive
drive.mount('/content/drive')

!pip install convertdate

import pandas as pd
from datetime import datetime, timedelta
import numpy as np
from convertdate import hebrew
import logging
import json
from google.colab import drive

# --------------------------------
# Setup Logging
# --------------------------------
logging.basicConfig(
    level=logging.DEBUG,  # Change to INFO for less verbosity
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def generate_schedule_csv():
    # Mount Drive at the start (run once per session)
    drive.mount('/content/drive', force_remount=True)

    # -------------------------------------------
    # Prompt for child's name and birth date
    # -------------------------------------------
    child_name = input("Enter the child's name: ").strip()
    user_birth_date_str = input("Enter the child's Gregorian birth date (YYYY-MM-DD): ").strip()
    try:
        birth_year, birth_month, birth_day = map(int, user_birth_date_str.split('-'))
        birth_date_gregorian = datetime(birth_year, birth_month, birth_day)
    except ValueError:
        print("Invalid date format. Please use YYYY-MM-DD.")
        return None

    # -------------------------------------------
    # Convert birth date to Hebrew and display it
    # -------------------------------------------
    h_year, h_month, h_day = hebrew.from_gregorian(birth_year, birth_month, birth_day)
    hebrew_month_names = {
        1: 'ניסן', 2: 'אייר', 3: 'סיון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
        7: 'תשרי', 8: 'חשון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב'
    }
    child_hebrew_birth = f"{h_day} {hebrew_month_names.get(h_month, str(h_month))} {h_year}"
    print(f"\nChild's Hebrew birth date: {child_hebrew_birth}")

    # -------------------------------------------
    # Calculate 5th and 10th Hebrew birthdays
    # -------------------------------------------
    fifth_hebrew_year = h_year + 5
    tenth_hebrew_year = h_year + 10

    fifth_birthday_gregorian = datetime(*hebrew.to_gregorian(fifth_hebrew_year, h_month, h_day))
    tenth_birthday_gregorian = datetime(*hebrew.to_gregorian(tenth_hebrew_year, h_month, h_day))

    fifth_birthday_hebrew = f"{h_day} {hebrew_month_names.get(h_month, str(h_month))} {fifth_hebrew_year}"
    tenth_birthday_hebrew = f"{h_day} {hebrew_month_names.get(h_month, str(h_month))} {tenth_hebrew_year}"

    print(f"5th Hebrew birthday: Gregorian: {fifth_birthday_gregorian.date()} / Hebrew: {fifth_birthday_hebrew}")
    print(f"10th Hebrew birthday: Gregorian: {tenth_birthday_gregorian.date()} / Hebrew: {tenth_birthday_hebrew}\n")

    # -------------------------------------------
    # Check child's current age (approximate)
    # -------------------------------------------
    today = datetime.now()
    age_in_years = (today - birth_date_gregorian).days // 365  # rough approximation
    print(f"Child's approximate Gregorian age: {age_in_years} years")

    # -------------------------------------------
    # Determine schedule START date
    # -------------------------------------------
    if age_in_years >= 5:
        print("Child is older than 5.")
        use_custom = input("Do you want to specify a custom Gregorian start date? (Y/N): ").strip().lower()
        if use_custom.startswith('y'):
            custom_start_str = input("Enter your desired start date (YYYY-MM-DD): ").strip()
            try:
                y, m, d = map(int, custom_start_str.split('-'))
                START_DATE = datetime(y, m, d)
                print(f"Using user-specified start date: {START_DATE.date()}")
            except ValueError:
                print("Invalid custom date. Using 5th Hebrew birthday instead.")
                START_DATE = fifth_birthday_gregorian
        else:
            START_DATE = fifth_birthday_gregorian
            print(f"Using 5th Hebrew birthday as start: {START_DATE.date()}")
    else:
        START_DATE = fifth_birthday_gregorian
        print(f"Child is younger than 5. Start date = 5th Hebrew birthday ({START_DATE.date()})")

    # -------------------------------------------
    # End date always = 10th Hebrew birthday
    # -------------------------------------------
    END_DATE = tenth_birthday_gregorian
    print(f"End date = 10th Hebrew birthday ({END_DATE.date()})\n")

    # -------------------------------------------
    # Load the tracking sheet CSV from Drive
    # -------------------------------------------
    file_path = "/content/drive/MyDrive/Parsha Tracking Sheet - Chapters of Tanach and Mishnah.csv"
    try:
        data_df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Error: Could not find file at {file_path}")
        return None

    # -------------------------------------------
    # Use only Bible data (exclude Mishnah)
    # -------------------------------------------
    bible_df = data_df[data_df['Data Type'] == 'Bible']

    # -------------------------------------------
    # Build Bible verse references
    # -------------------------------------------
    def build_bible_verse_list(row):
        return [f"{row['Book']} {row['Chapter']}:{verse}"
                for verse in range(1, row['Number of Verses or Mishnahs'] + 1)]
    bible_rows = bible_df.apply(build_bible_verse_list, axis=1).tolist()
    bible_verses = [verse for row_list in bible_rows for verse in row_list]

    # -------------------------------------------
    # Distribute Bible verses evenly between START_DATE and END_DATE
    # -------------------------------------------
    def distribute_items_balanced(items, start_date, end_date):
        distributed = []
        current_date = start_date
        while current_date <= end_date:
            days_left = (end_date - current_date).days + 1
            if days_left <= 0:
                break
            items_today = int(np.ceil(len(items) / days_left))
            distributed.append(items[:items_today])
            items = items[items_today:]
            current_date += timedelta(days=1)
        return distributed

    distributed_bible = distribute_items_balanced(bible_verses, START_DATE, END_DATE)

    # -------------------------------------------
    # Build final schedule DataFrame (Bible only)
    # -------------------------------------------
    total_days = (END_DATE - START_DATE).days + 1
    schedule_records = []
    for offset in range(total_days):
        day_date = START_DATE + timedelta(days=offset)
        day_of_week = day_date.strftime("%A")
        bible_for_day = ", ".join(distributed_bible[offset])
        schedule_records.append({
            "Date": day_date.strftime("%Y-%m-%d"),
            "Day of Week": day_of_week,
            "Bible": bible_for_day,
            "Bible Count": len(distributed_bible[offset])
        })
    schedule_df = pd.DataFrame(schedule_records)

    # -------------------------------------------
    # Save the schedule CSV to Drive
    # -------------------------------------------
    output_filename = f"study_schedule_{child_name.replace(' ', '_')}_{user_birth_date_str}.csv"
    out_csv = f"/content/drive/MyDrive/{output_filename}"
    schedule_df.to_csv(out_csv, index=False)
    print(f"Schedule CSV saved to: {out_csv}\n")
    print("Preview of the schedule:")
    print(schedule_df.head())

    # -------------------------------------------
    # Save metadata for next cell
    # -------------------------------------------
    metadata = {"csv_path": out_csv}
    metadata_file = "/content/drive/MyDrive/schedule_metadata.json"
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f)
    print(f"Metadata saved to: {metadata_file}")

    # -------------------------------------------
    # Generate ICS file
    # -------------------------------------------
    ics_lines = []
    ics_lines.append("BEGIN:VCALENDAR")
    ics_lines.append("VERSION:2.0")
    ics_lines.append("PRODID:-//Study Schedule//EN")
    for index, row in schedule_df.iterrows():
        dt = datetime.strptime(row['Date'], "%Y-%m-%d")
        dtstart = dt.strftime("%Y%m%d")
        dtend = (dt + timedelta(days=1)).strftime("%Y%m%d")
        summary = f"{child_name} Schedule"
        description = f"Learn: {row['Bible']}"
        uid = f"{child_name.replace(' ', '_')}_{dtstart}_{index}@study_schedule"
        dtstamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        ics_lines.append("BEGIN:VEVENT")
        ics_lines.append(f"UID:{uid}")
        ics_lines.append(f"DTSTAMP:{dtstamp}")
        ics_lines.append(f"DTSTART;VALUE=DATE:{dtstart}")
        ics_lines.append(f"DTEND;VALUE=DATE:{dtend}")
        ics_lines.append(f"SUMMARY:{summary}")
        ics_lines.append(f"DESCRIPTION:{description}")
        ics_lines.append("END:VEVENT")
    ics_lines.append("END:VCALENDAR")
    ics_content = "\n".join(ics_lines)
    ics_filename = f"study_schedule_{child_name.replace(' ', '_')}_{user_birth_date_str}.ics"
    ics_path = f"/content/drive/MyDrive/{ics_filename}"
    with open(ics_path, "w", encoding="utf-8") as f:
        f.write(ics_content)
    print(f"ICS file saved to: {ics_path}\n")

    return out_csv  # Return the path explicitly

if __name__ == "__main__":
    csv_path = generate_schedule_csv()
    if csv_path:
        print(f"Generated CSV path: {csv_path}")

import pandas as pd
import requests
import re
import os
from tqdm import tqdm
from convertdate import hebrew
from datetime import datetime
import logging
import json
import time
from google.colab import drive

# --------------------------------
# Setup Logging
# --------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# --------------------------------
# Utility Functions
# --------------------------------
def remove_html_tags_and_entities(text):
    text = re.sub(r'<span class=\"mam-spi-pe\">\{(\\u05e4|\\u05e1)\}</span>', r'\1', text)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'&[^;\s]+;', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def escape_latex_special_chars(text):
    special_chars = {
        '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#',
        '_': '\\_', '{': '\\{', '}': '\\}', '~': '\\textasciitilde{}',
        '^': '\\textasciicircum{}', ':': '\\:'
    }
    for char, esc in special_chars.items():
        text = text.replace(char, esc)
    return text

def hebrew_number(num):
    if not isinstance(num, int) or num < 1:
        return str(num)
    hebrew_letters = {
        1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט',
        10: 'י', 20: 'כ', 30: 'ל', 40: 'מ', 50: 'נ', 60: 'ס', 70: 'ע', 80: 'פ', 90: 'צ',
        100: 'ק', 200: 'ר', 300: 'ש', 400: 'ת'
    }
    if num == 15:
        return 'טו'
    if num == 16:
        return 'טז'
    result = ''
    remaining = num
    hundreds = (remaining // 100) * 100
    if hundreds in hebrew_letters:
        result += hebrew_letters[hundreds]
    remaining %= 100
    tens = (remaining // 10) * 10
    if tens in hebrew_letters:
        result += hebrew_letters[tens]
    remaining %= 10
    if remaining in hebrew_letters:
        result += hebrew_letters[remaining]
    return result

def get_sefaria_verse_entries(ref, max_retries=5, timeout=10):
    verse_entries = []
    for single_ref in ref.split(','):
        single_ref = single_ref.strip()
        if not single_ref:
            continue
        logger.debug(f"Fetching Sefaria text for reference: '{single_ref}'")
        url = f'https://www.sefaria.org/api/texts/{single_ref}?context=0'
        success = False
        for attempt in range(1, max_retries + 1):
            try:
                response = requests.get(url, timeout=timeout)
                if response.status_code == 200:
                    success = True
                    break
                else:
                    logger.warning(f"HTTP {response.status_code} for '{single_ref}' (attempt {attempt}/{max_retries})")
            except Exception as e:
                logger.warning(f"Request error for '{single_ref}' (attempt {attempt}/{max_retries}): {e}")
            time.sleep(2 ** (attempt - 1))
        if not success:
            logger.error(f"Failed to retrieve '{single_ref}' after {max_retries} attempts.")
            continue
        try:
            data = response.json()
            he_data = data.get('he', [])
            sections = data.get('sections', [])
            start_chapter = sections[0] if len(sections) > 0 else 1
            start_verse = sections[1] if len(sections) > 1 else 1
            if isinstance(he_data, str):
                verse_text_clean = remove_html_tags_and_entities(he_data)
                verse_entries.append((start_chapter, start_verse, verse_text_clean))
            elif isinstance(he_data, list) and he_data:
                if isinstance(he_data[0], list):
                    for chapter_index, chapter_verses in enumerate(he_data):
                        current_chapter = start_chapter + chapter_index
                        if not isinstance(chapter_verses, list):
                            continue
                        for verse_index, verse_text in enumerate(chapter_verses, start=1):
                            verse_text_clean = remove_html_tags_and_entities(verse_text)
                            verse_entries.append((current_chapter, verse_index, verse_text_clean))
                else:
                    for verse_index, verse_text in enumerate(he_data, start=start_verse):
                        verse_text_clean = remove_html_tags_and_entities(verse_text)
                        verse_entries.append((start_chapter, verse_index, verse_text_clean))
            else:
                logger.warning(f"Unexpected format for '{single_ref}': {he_data}")
        except Exception as e:
            logger.error(f"Error processing data for '{single_ref}': {e}")
    return verse_entries

def generate_latex_source(csv_file_path=None):
    # Mount Drive
    drive.mount('/content/drive', force_remount=True)

    # Get CSV path from metadata if not provided
    metadata_file = "/content/drive/MyDrive/schedule_metadata.json"
    if csv_file_path is None and os.path.exists(metadata_file):
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        csv_file_path = metadata.get('csv_path')
    if not csv_file_path or not os.path.exists(csv_file_path):
        logger.error("No valid CSV path provided or found in metadata.")
        return

    logger.info(f"Reading schedule CSV from: {csv_file_path}")
    try:
        df = pd.read_csv(csv_file_path)
        logger.debug(f"Processing total {len(df)} rows.")
    except Exception as e:
        logger.error(f"Failed to read CSV: {e}")
        return

    hebrew_months = {
        1: 'ניסן', 2: 'אייר', 3: 'סיון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
        7: 'תשרי', 8: 'חשון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב'
    }
    hebrew_days = {
        'Sunday': 'יום ראשון', 'Monday': 'יום שני', 'Tuesday': 'יום שלישי',
        'Wednesday': 'יום רביעי', 'Thursday': 'יום חמישי', 'Friday': 'יום שישי',
        'Saturday': 'שבת'
    }
    hebrew_gregorian_months = {
        1: 'ינואר', 2: 'פברואר', 3: 'מרץ', 4: 'אפריל', 5: 'מאי', 6: 'יוני',
        7: 'יולי', 8: 'אוגוסט', 9: 'ספטמבר', 10: 'אוקטובר', 11: 'נובמבר', 12: 'דצמבר'
    }
    hebrew_book_names = {
        'Genesis': 'בראשית', 'Exodus': 'שמות', 'Leviticus': 'ויקרא', 'Numbers': 'במדבר',
        'Deuteronomy': 'דברים', 'Joshua': 'יהושע', 'Judges': 'שופטים',
        'I Samuel': 'שמואל א', 'II Samuel': 'שמואל ב',
        'I Kings': 'מלכים א', 'II Kings': 'מלכים ב', 'Isaiah': 'ישעיהו', 'Jeremiah': 'ירמיהו',
        'Ezekiel': 'יחזקאל', 'Hosea': 'הושע', 'Joel': 'יואל', 'Amos': 'עמוס', 'Obadiah': 'עובדיה',
        'Jonah': 'יונה', 'Micah': 'מיכה', 'Nahum': 'נחום', 'Habakkuk': 'חבקוק',
        'Zephaniah': 'צפניה', 'Haggai': 'חגי', 'Zechariah': 'זכריה', 'Malachi': 'מלאכי',
        'Psalms': 'תהלים', 'Proverbs': 'משלי', 'Job': 'איוב',
        'Song of Songs': 'שיר השירים', 'Ruth': 'רות', 'Lamentations': 'איכה',
        'Ecclesiastes': 'קהלת', 'Esther': 'אסתר', 'Daniel': 'דניאל', 'Ezra': 'עזרא',
        'Nehemiah': 'נחמיה', 'I Chronicles': 'דברי הימים א', 'II Chronicles': 'דברי הימים ב'
    }

    latex_preamble = r"""
\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage{fontspec}
\usepackage{geometry}
\geometry{a4paper, top=2cm, bottom=2cm, left=2cm, right=2cm}
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\rfoot{\thepage}
\usepackage{hyperref}
\usepackage{polyglossia}
\usepackage{fancybox}
\setmainlanguage{hebrew}
\setotherlanguage{english}
\makeatletter
\providecommand{\bidi@Initialize}{}
\makeatother
\newfontfamily\hebrewfont[Script=Hebrew]{Ezra SIL}
\newfontfamily\englishfont{Ezra SIL}
\setmainfont{Ezra SIL}
\begin{document}
\tableofcontents
\thispagestyle{empty}
\newpage
\setcounter{page}{1}
    """.strip() + "\n"

    checkpoint_file = "/content/drive/MyDrive/latex_checkpoint.tex"
    progress_file = "/content/drive/MyDrive/latex_progress.json"

    if os.path.exists(progress_file):
        with open(progress_file, 'r') as f:
            progress = json.load(f)
        last_processed_idx = progress.get('last_idx', -1)
        logger.info(f"Resuming from row {last_processed_idx + 1}")
    else:
        last_processed_idx = -1
        latex_content = latex_preamble
        with open(checkpoint_file, 'w', encoding='utf-8') as f:
            f.write(latex_content)

    if os.path.exists(checkpoint_file) and last_processed_idx >= 0:
        with open(checkpoint_file, 'r', encoding='utf-8') as f:
            latex_content = f.read()
    else:
        latex_content = latex_preamble

    for idx, row in tqdm(df.iterrows(), total=df.shape[0], desc="Building LaTeX", ncols=100, initial=last_processed_idx + 1):
        if idx <= last_processed_idx:
            continue

        date_str = row['Date']
        day_of_week = row['Day of Week']
        bible_refs = row['Bible']

        try:
            if '-' in date_str:
                y, m, d = date_str.split('-')
                year, month, day = int(y), int(m), int(d)
            else:
                m, d, y = date_str.split('/')
                month, day, year = int(m), int(d), int(y)
            gregorian_date_hebrew = f"{day} {hebrew_gregorian_months.get(month, str(month))} {year}"
            h_year, h_month, h_day = hebrew.from_gregorian(year, month, day)
            hebrew_date = f"{h_day} {hebrew_months.get(h_month, str(h_month))} {h_year}"
            heb_day = hebrew_days.get(day_of_week, day_of_week)
            section_title = f"\\fbox{{\\textbf{{{heb_day} - {hebrew_date} / {gregorian_date_hebrew}}}}}"
            toc_entry = f"{hebrew_date} / {gregorian_date_hebrew}"
            logger.debug(f"Converted date '{date_str}' to Hebrew date '{hebrew_date}', day '{heb_day}'.")
        except Exception as e:
            logger.error(f"Error converting date '{date_str}': {e}")
            section_title = f"\\fbox{{\\textbf{{{date_str} - {day_of_week}}}}}"
            toc_entry = f"{date_str}"

        latex_content += f"\\section*{{{section_title}}}\n"

        if pd.notna(bible_refs) and bible_refs.strip():
            refs_split = [r.strip() for r in bible_refs.split(",") if r.strip()]
            if len(refs_split) == 1:
                parts = refs_split[0].split(' ')
                if len(parts) >= 2 and ':' in parts[-1]:
                    book_name = ' '.join(parts[:-1])
                    chapter, verse = parts[-1].split(':')
                    hebrew_book = hebrew_book_names.get(book_name, book_name)
                    display_bible_ref = f"{hebrew_book} {hebrew_number(int(chapter))}׳:{hebrew_number(int(verse))}׳"
                    toc_bible_ref = display_bible_ref
                else:
                    display_bible_ref = refs_split[0]
                    toc_bible_ref = display_bible_ref
            else:
                first_parts = refs_split[0].split(' ')
                last_parts = refs_split[-1].split(' ')
                if (len(first_parts) >= 2 and ':' in first_parts[-1] and
                    len(last_parts) >= 2 and ':' in last_parts[-1]):
                    book_name_first = ' '.join(first_parts[:-1])
                    chapter_verse_first = first_parts[-1]
                    book_name_last = ' '.join(last_parts[:-1])
                    chapter_verse_last = last_parts[-1]
                    chapter_first, verse_first = chapter_verse_first.split(':')
                    chapter_last, verse_last = chapter_verse_last.split(':')
                    hebrew_book_first = hebrew_book_names.get(book_name_first, book_name_first)
                    hebrew_book_last = hebrew_book_names.get(book_name_last, book_name_last)
                    if book_name_first == book_name_last:
                        display_bible_ref = (f"{hebrew_book_first} {hebrew_number(int(chapter_first))}׳:"
                                            f"{hebrew_number(int(verse_first))}׳—"
                                            f"{hebrew_number(int(chapter_last))}׳:{hebrew_number(int(verse_last))}׳")
                        toc_bible_ref = display_bible_ref
                    else:
                        display_bible_ref = (f"{hebrew_book_first} {hebrew_number(int(chapter_first))}׳:"
                                            f"{hebrew_number(int(verse_first))}׳—"
                                            f"{hebrew_book_last} {hebrew_number(int(chapter_last))}׳:"
                                            f"{hebrew_number(int(verse_last))}׳")
                        toc_bible_ref = display_bible_ref
                else:
                    display_bible_ref = f"{refs_split[0]} ... {refs_split[-1]}"
                    toc_bible_ref = display_bible_ref
        else:
            display_bible_ref = "לא זמין"
            toc_bible_ref = "לא זמין"
            logger.debug("No valid Bible references found.")

        latex_content += f"\\subsection*{{תנ\"ך: {display_bible_ref}}}\n"
        latex_content += f"\\addcontentsline{{toc}}{{section}}{{\\small {toc_entry} — {toc_bible_ref}}}\n"

        if pd.notna(bible_refs) and bible_refs.strip():
            verse_entries = get_sefaria_verse_entries(bible_refs)
            logger.debug(f"Retrieved {len(verse_entries)} verses for references '{bible_refs}'.")

            refs_split = [r.strip() for r in bible_refs.split(",") if r.strip()]
            verse_to_book = []
            for ref in refs_split:
                parts = ref.split(' ')
                if len(parts) >= 2 and ':' in parts[-1]:
                    book = ' '.join(parts[:-1])
                    book_heb = hebrew_book_names.get(book, book)
                    chapter, verse = parts[-1].split(':')
                    try:
                        verse_to_book.append(((int(chapter), int(verse)), book_heb))
                    except ValueError:
                        continue
            verse_to_book.sort()

            def find_book_for(chap, verse):
                last_match = None
                for (c, v), b in verse_to_book:
                    if (chap, verse) >= (c, v):
                        last_match = b
                    else:
                        break
                return last_match

            formatted_text = ""
            current_chapter = None
            previous_book = find_book_for(*verse_entries[0][:2]) if verse_entries else None

            for i, (chapter_num, verse_num, verse_text) in enumerate(verse_entries):
                this_book = find_book_for(chapter_num, verse_num)
                if this_book != previous_book and i > 0:
                    formatted_text += f"\\vspace{{0.75em}}\\par\\noindent\\textbf{{{this_book}}}\n"
                    current_chapter = None
                    previous_book = this_book
                if current_chapter != chapter_num:
                    formatted_text += f"\\vspace{{0.5em}}\\par\\noindent\\textbf{{\\ovalbox{{פרק {hebrew_number(chapter_num)}}}}}\n"
                    current_chapter = chapter_num
                verse_text_escaped = escape_latex_special_chars(verse_text)
                formatted_text += f"\\noindent\\textbf{{\\textsuperscript{{{hebrew_number(verse_num)}}}}}\\,~{verse_text_escaped} "

            latex_content += formatted_text + "\\par\n"
        else:
            logger.debug("Skipping verse retrieval since no references.")

        latex_content += "\\vspace{1em}\n"

        with open(checkpoint_file, 'w', encoding='utf-8') as f:
            f.write(latex_content)
        with open(progress_file, 'w') as f:
            json.dump({'last_idx': idx}, f)
        logger.debug(f"Checkpoint saved at row {idx}")

    latex_content += "\\end{document}"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    final_tex_file_path = f"/content/drive/MyDrive/output_{timestamp}.tex"
    try:
        with open(final_tex_file_path, 'w', encoding='utf-8') as f:
            f.write(latex_content)
        logger.info(f"Final LaTeX file saved to: {final_tex_file_path}")
        if os.path.exists(checkpoint_file):
            os.remove(checkpoint_file)
        if os.path.exists(progress_file):
            os.remove(progress_file)
    except Exception as e:
        logger.error(f"Failed to write final LaTeX file: {e}")
        return

    print("LaTeX source file generated successfully.")
    print(f"File saved to: {final_tex_file_path}")

if __name__ == "__main__":
    # Example usage with the CSV path from the previous cell
    csv_path = generate_schedule_csv()
    if csv_path:
        generate_latex_source(csv_path)
    else:
        generate_latex_source()  # Fallback to metadata

