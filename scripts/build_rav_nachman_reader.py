#!/usr/bin/env python3
"""
Merge Likutei Moharan text with annotations into a single reader JSON.
Output: src/data/rav_nachman_reader.json
"""

import json
import re
import zipfile
from pathlib import Path

BASE = Path("/Applications/apps/matthew-miller-personal-site")
EN_PATH = BASE / "public/Rav Nachman/Likutei Moharan - en - merged.json"
HE_PATH = BASE / "public/Rav Nachman/Likutei Moharan - he - merged.json"
ZIP_PATH = BASE / "public/Rav Nachman/likutei_moharan_anti_intellectual_annotation_package.zip"
OUT_PATH = BASE / "src/data/rav_nachman_reader.json"


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def load_annotations():
    with zipfile.ZipFile(ZIP_PATH) as z:
        with z.open("likutei_moharan_full_bilingual_anti_intellectual_annotations.json") as f:
            data = json.load(f)
    return data["annotations"], data["thesis_assessment"], data["stats"], data["annotation_schema"]


def make_ann_key(path):
    """Create a hashable lookup key from source_path_zero_based."""
    return tuple(path)


def load_text(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_segment(text_dict, path):
    """Navigate the text dict using a zero-based path list."""
    node = text_dict
    for step in path:
        if isinstance(node, dict):
            node = node.get(step, None)
        elif isinstance(node, list):
            if isinstance(step, int) and step < len(node):
                node = node[step]
            else:
                return None
        else:
            return None
        if node is None:
            return None
    return node


def flatten_sections(book_text, section_key, annotations_by_key, he_text_dict, lesson_offset=0):
    """
    Convert a section's text into a list of lessons.
    Each lesson is a list of sections; each section is a list of segments.
    Returns a list of lesson objects.
    """
    section = book_text.get(section_key, [])
    lessons = []

    if section_key in ("Introduction", "A Pleasant Song", "Go See",
                       "Additions from Manuscript"):
        # Flat list of segments (no lesson/section nesting)
        segments = []
        for seg_i, seg in enumerate(section):
            seg_text = seg if isinstance(seg, str) else ""
            key = (section_key, seg_i)
            ann = annotations_by_key.get(key)
            he_seg = None
            if he_text_dict:
                he_raw = he_text_dict.get("text", {}).get(section_key, [])
                he_seg = he_raw[seg_i] if seg_i < len(he_raw) else None
                if isinstance(he_seg, list):
                    he_seg = " ".join(str(x) for x in he_seg)
            segments.append({
                "text": seg_text,
                "he": he_seg or "",
                "annotation": ann,
            })
        if segments:
            lessons.append({
                "lesson_num": None,
                "title": section_key or "Main",
                "sections": [{"section_num": None, "segments": segments}],
            })
        return lessons

    # Nested: lessons → sections → segments
    for lesson_i, lesson in enumerate(section):
        lesson_num = lesson_i + 1
        if not isinstance(lesson, list):
            continue
        secs = []
        for sec_i, sec in enumerate(lesson):
            sec_num = sec_i + 1
            if not isinstance(sec, list):
                continue
            segs = []
            for seg_i, seg in enumerate(sec):
                seg_text = seg if isinstance(seg, str) else ""
                key = (section_key, lesson_i, sec_i, seg_i)
                ann = annotations_by_key.get(key)
                # Hebrew
                he_seg = None
                if he_text_dict:
                    he_raw = he_text_dict.get("text", {})
                    he_node = get_segment(he_raw, [section_key, lesson_i, sec_i, seg_i])
                    if isinstance(he_node, str):
                        he_seg = he_node
                segs.append({
                    "text": seg_text,
                    "he": he_seg or "",
                    "annotation": ann,
                })
            if segs:
                secs.append({"section_num": sec_num, "segments": segs})
        if secs:
            lessons.append({
                "lesson_num": lesson_num + lesson_offset,
                "title": f"Lesson {lesson_num + lesson_offset}",
                "sections": secs,
            })
    return lessons


def main():
    print("Loading texts and annotations…")
    en = load_text(EN_PATH)
    he = load_text(HE_PATH)
    annotations, thesis, stats, schema = load_annotations()

    # Build lookup map: tuple(path_zero) → annotation dict (keep highest-score if duplicate)
    ann_by_key = {}
    for ann in annotations:
        key = make_ann_key(ann["source_path_zero_based"])
        existing = ann_by_key.get(key)
        if existing is None or ann.get("relevance_score", 0) > existing.get("relevance_score", 0):
            ann_by_key[key] = ann

    en_text = en["text"]
    he_text = he

    print("Building reader structure…")
    chapters = []

    # Introduction
    intro_lessons = flatten_sections(en_text, "Introduction", ann_by_key, he_text)
    if intro_lessons:
        chapters.append({"chapter": "Introduction", "lessons": intro_lessons})

    # A Pleasant Song
    song_lessons = flatten_sections(en_text, "A Pleasant Song", ann_by_key, he_text)
    if song_lessons:
        chapters.append({"chapter": "A Pleasant Song", "lessons": song_lessons})

    # Part I (empty string key in the JSON)
    part1_lessons = flatten_sections(en_text, "", ann_by_key, he_text)
    if part1_lessons:
        chapters.append({"chapter": "Part I", "lessons": part1_lessons})

    # Part II
    part2_lessons = flatten_sections(en_text, "Part II", ann_by_key, he_text)
    if part2_lessons:
        chapters.append({"chapter": "Part II", "lessons": part2_lessons})

    # Additions from Manuscript
    add_lessons = flatten_sections(en_text, "Additions from Manuscript", ann_by_key, he_text)
    if add_lessons:
        chapters.append({"chapter": "Additions from Manuscript", "lessons": add_lessons})

    # Count annotated segments
    total_segs = sum(
        len(sec["segments"])
        for ch in chapters
        for les in ch["lessons"]
        for sec in les["sections"]
    )
    total_ann = sum(
        1
        for ch in chapters
        for les in ch["lessons"]
        for sec in les["sections"]
        for seg in sec["segments"]
        if seg["annotation"]
    )
    print(f"  {total_segs} total segments, {total_ann} annotated")

    output = {
        "thesis": thesis,
        "stats": stats,
        "schema": schema,
        "chapters": chapters,
    }

    print(f"Writing to {OUT_PATH}…")
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    size = OUT_PATH.stat().st_size
    print(f"Done. File size: {size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
