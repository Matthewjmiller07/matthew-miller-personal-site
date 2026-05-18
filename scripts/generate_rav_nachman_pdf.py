#!/usr/bin/env python3
"""
Generate annotated PDF of Likutei Moharan highlighting anti-intellectual thesis passages.
"""

import json
import re
import zipfile
from pathlib import Path

from bidi.algorithm import get_display
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE = Path("/Applications/apps/matthew-miller-personal-site/public/Rav Nachman")
ZIP_PATH = BASE / "likutei_moharan_anti_intellectual_annotation_package.zip"
OUTPUT_PDF = BASE / "likutei_moharan_annotated.pdf"

# ── Fonts ──────────────────────────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont("ArialHB", "/System/Library/Fonts/ArialHB.ttc", subfontIndex=0))
pdfmetrics.registerFont(TTFont("ArialUnicode", "/Library/Fonts/Arial Unicode.ttf"))
pdfmetrics.registerFont(
    TTFont("TimesNR", "/System/Library/Fonts/Supplemental/Times New Roman.ttf")
)
pdfmetrics.registerFont(
    TTFont("TimesNR-Bold", "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf")
)
pdfmetrics.registerFont(
    TTFont("TimesNR-Italic", "/System/Library/Fonts/Supplemental/Times New Roman Italic.ttf")
)

# ── Colour palette ─────────────────────────────────────────────────────────────
CYAN = colors.HexColor("#0891b2")
CYAN_LIGHT = colors.HexColor("#cffafe")
GOLD = colors.HexColor("#d97706")
GOLD_LIGHT = colors.HexColor("#fef3c7")
GREEN = colors.HexColor("#16a34a")
GREEN_LIGHT = colors.HexColor("#dcfce7")
RED = colors.HexColor("#dc2626")
RED_LIGHT = colors.HexColor("#fee2e2")
GRAY = colors.HexColor("#6b7280")
GRAY_DARK = colors.HexColor("#1f2937")
GRAY_LIGHT = colors.HexColor("#f9fafb")
WHITE = colors.white

STANCE_COLORS = {
    "supports qualified anti-intellectual reading": (RED, RED_LIGHT, "Supports thesis"),
    "counterevidence to broad anti-intellectual reading": (GREEN, GREEN_LIGHT, "Counters thesis"),
    "complicates / mixed": (GOLD, GOLD_LIGHT, "Mixed / nuanced"),
}

# ── Styles ─────────────────────────────────────────────────────────────────────

def make_styles():
    s = getSampleStyleSheet()

    title = ParagraphStyle(
        "DocTitle",
        parent=s["Title"],
        fontName="TimesNR-Bold",
        fontSize=26,
        leading=32,
        textColor=GRAY_DARK,
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    subtitle = ParagraphStyle(
        "DocSubtitle",
        parent=s["Normal"],
        fontName="TimesNR-Italic",
        fontSize=13,
        leading=18,
        textColor=GRAY,
        alignment=TA_CENTER,
        spaceAfter=4,
    )
    section_head = ParagraphStyle(
        "SectionHead",
        parent=s["Heading1"],
        fontName="TimesNR-Bold",
        fontSize=16,
        leading=20,
        textColor=CYAN,
        spaceBefore=18,
        spaceAfter=6,
        borderPad=4,
    )
    body = ParagraphStyle(
        "BodyText",
        parent=s["Normal"],
        fontName="TimesNR",
        fontSize=10,
        leading=15,
        textColor=GRAY_DARK,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )
    body_bold = ParagraphStyle(
        "BodyBold",
        parent=body,
        fontName="TimesNR-Bold",
    )
    label_text = ParagraphStyle(
        "LabelText",
        parent=s["Normal"],
        fontName="TimesNR-Bold",
        fontSize=8,
        leading=10,
        textColor=WHITE,
    )
    ref_text = ParagraphStyle(
        "RefText",
        parent=s["Normal"],
        fontName="TimesNR-Italic",
        fontSize=8,
        leading=11,
        textColor=GRAY,
        spaceAfter=4,
    )
    hebrew = ParagraphStyle(
        "Hebrew",
        parent=s["Normal"],
        fontName="ArialHB",
        fontSize=10,
        leading=16,
        textColor=GRAY_DARK,
        alignment=TA_RIGHT,
        spaceAfter=4,
    )
    note_text = ParagraphStyle(
        "NoteText",
        parent=s["Normal"],
        fontName="TimesNR-Italic",
        fontSize=9,
        leading=13,
        textColor=GRAY,
        spaceAfter=4,
    )
    small_bold = ParagraphStyle(
        "SmallBold",
        parent=s["Normal"],
        fontName="TimesNR-Bold",
        fontSize=8,
        leading=11,
        textColor=GRAY_DARK,
    )

    return {
        "title": title,
        "subtitle": subtitle,
        "section_head": section_head,
        "body": body,
        "body_bold": body_bold,
        "label_text": label_text,
        "ref_text": ref_text,
        "hebrew": hebrew,
        "note_text": note_text,
        "small_bold": small_bold,
    }


# ── HTML-tag stripping ─────────────────────────────────────────────────────────

def strip_html(text: str) -> str:
    """Remove HTML tags, keeping content; collapse whitespace."""
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


def clean_for_paragraph(text: str) -> str:
    """Keep basic bold/italic but strip other tags for reportlab Paragraph."""
    text = re.sub(r"<(?!/?(?:b|i|em|strong)\b)[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


def rtl_text(text: str, max_chars: int = 300) -> str:
    """Apply bidi algorithm for correct RTL display in reportlab. Truncate long text."""
    if len(text) > max_chars:
        text = text[:max_chars] + "…"
    return get_display(text)


# ── Data loading ───────────────────────────────────────────────────────────────

def load_data():
    with zipfile.ZipFile(ZIP_PATH) as z:
        with z.open("likutei_moharan_full_bilingual_anti_intellectual_annotations.json") as f:
            data = json.load(f)
    return data


# ── Page template ──────────────────────────────────────────────────────────────

def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("TimesNR", 9)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(
        letter[0] / 2,
        0.5 * inch,
        f"Likutei Moharan — Annotated Edition  ·  Page {doc.page}",
    )
    # Thin rule above footer
    canvas.setStrokeColor(GRAY)
    canvas.setLineWidth(0.3)
    canvas.line(inch, 0.65 * inch, letter[0] - inch, 0.65 * inch)
    canvas.restoreState()


# ── Building blocks ─────────────────────────────────────────────────────────────

def build_title_page(story, data, styles):
    ta = data.get("thesis_assessment", {})
    stats = data.get("stats", {})

    story.append(Spacer(1, 0.6 * inch))
    story.append(Paragraph("ליקוטי מוהר״ן", styles["title"]))
    story.append(Paragraph("<i>Likutei Moharan</i>", styles["subtitle"]))
    story.append(Paragraph("Rebbe Nachman of Breslov", styles["subtitle"]))
    story.append(Spacer(1, 0.15 * inch))
    story.append(HRFlowable(width="60%", thickness=1.5, color=CYAN, spaceAfter=10))
    story.append(
        Paragraph(
            "Annotated Edition — Anti-Intellectual Thesis Analysis",
            ParagraphStyle(
                "Cover2",
                fontName="TimesNR-Italic",
                fontSize=11,
                leading=16,
                textColor=CYAN,
                alignment=TA_CENTER,
            ),
        )
    )
    story.append(Spacer(1, 0.4 * inch))

    # Thesis box
    why = ta.get("why", "")
    precise = ta.get("precise_thesis", why)
    box_data = [
        [
            Paragraph("Thesis Summary", styles["small_bold"]),
        ],
        [
            Paragraph(clean_for_paragraph(precise or why), styles["body"]),
        ],
    ]
    box_table = Table(box_data, colWidths=[5.5 * inch])
    box_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), CYAN),
                ("TEXTCOLOR", (0, 0), (0, 0), WHITE),
                ("BACKGROUND", (0, 1), (0, 1), CYAN_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.5, CYAN),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, CYAN),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(box_table)
    story.append(Spacer(1, 0.3 * inch))

    # Stats table
    total = stats.get("annotations_total", 0)
    by_stance = stats.get("annotations_by_stance", {})
    supports = by_stance.get("supports qualified anti-intellectual reading", 0)
    counters = by_stance.get("counterevidence to broad anti-intellectual reading", 0)
    mixed = by_stance.get("complicates / mixed", 0)
    scanned = stats.get("hebrew_segments_scanned", 0)

    stat_rows = [
        [
            Paragraph("Statistic", styles["small_bold"]),
            Paragraph("Value", styles["small_bold"]),
        ],
        [Paragraph("Segments scanned", styles["body"]), Paragraph(f"{scanned:,}", styles["body"])],
        [Paragraph("Total annotations", styles["body"]), Paragraph(str(total), styles["body"])],
        [
            Paragraph("Supports thesis", styles["body"]),
            Paragraph(f"{supports} ({100*supports//total}%)" if total else "-", styles["body"]),
        ],
        [
            Paragraph("Counters thesis", styles["body"]),
            Paragraph(f"{counters} ({100*counters//total}%)" if total else "-", styles["body"]),
        ],
        [
            Paragraph("Mixed / nuanced", styles["body"]),
            Paragraph(str(mixed), styles["body"]),
        ],
    ]
    stat_table = Table(stat_rows, colWidths=[3.5 * inch, 2 * inch])
    stat_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GRAY_DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("BACKGROUND", (0, 1), (-1, -1), GRAY_LIGHT),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_LIGHT]),
                ("BOX", (0, 0), (-1, -1), 0.5, GRAY),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(stat_table)
    story.append(PageBreak())


def build_label_legend(story, data, styles):
    schema = data.get("annotation_schema", {})
    labels = schema.get("labels", {})

    story.append(Paragraph("Annotation Labels", styles["section_head"]))
    story.append(
        Paragraph(
            schema.get("important_caveat", ""),
            styles["body"],
        )
    )
    story.append(Spacer(1, 0.1 * inch))

    rows = [
        [
            Paragraph("Label", styles["small_bold"]),
            Paragraph("Stance", styles["small_bold"]),
            Paragraph("Description", styles["small_bold"]),
        ]
    ]
    for key, info in labels.items():
        stance = info.get("stance", "")
        if "counter" in stance:
            bg = GREEN_LIGHT
        elif "support" in stance:
            bg = RED_LIGHT
        else:
            bg = GOLD_LIGHT
        rows.append(
            [
                Paragraph(key, styles["small_bold"]),
                Paragraph(stance.upper(), styles["ref_text"]),
                Paragraph(info.get("description", ""), styles["body"]),
            ]
        )

    tbl = Table(rows, colWidths=[1.8 * inch, 1.2 * inch, 3.0 * inch])
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), GRAY_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BOX", (0, 0), (-1, -1), 0.5, GRAY),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    for i, (key, info) in enumerate(labels.items(), 1):
        stance = info.get("stance", "")
        if "counter" in stance:
            bg = GREEN_LIGHT
        elif "support" in stance:
            bg = RED_LIGHT
        else:
            bg = GOLD_LIGHT
        style.append(("BACKGROUND", (0, i), (-1, i), bg))
    tbl.setStyle(TableStyle(style))
    story.append(tbl)
    story.append(PageBreak())


def annotation_card(ann, styles):
    """Return a list of flowables for one annotation."""
    stance = ann.get("stance", "")
    border_color, bg_color, stance_label = STANCE_COLORS.get(
        stance, (GRAY, GRAY_LIGHT, stance)
    )

    ref = ann.get("ref", "")
    labels = ann.get("labels", [])
    score = ann.get("relevance_score", 0)
    en_text = clean_for_paragraph(ann.get("en_text", ""))
    he_text = ann.get("he_text", "")
    note = ann.get("annotation_note", "")

    # Hebrew: apply bidi for correct RTL in PDF
    he_display = rtl_text(strip_html(he_text)) if he_text else ""

    # Header row: ref | stance badge | labels
    label_str = "  ·  ".join(labels)
    score_str = "★" * score

    header_data = [
        [
            Paragraph(ref, styles["ref_text"]),
            Paragraph(stance_label, styles["ref_text"]),
            Paragraph(score_str, styles["ref_text"]),
        ]
    ]
    header_tbl = Table(header_data, colWidths=[2.5 * inch, 2.5 * inch, 0.75 * inch])
    header_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), border_color),
                ("TEXTCOLOR", (0, 0), (-1, -1), WHITE),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("ALIGN", (1, 0), (1, 0), "CENTER"),
                ("ALIGN", (2, 0), (2, 0), "RIGHT"),
            ]
        )
    )

    # Body: Hebrew | English
    body_rows = []
    if he_display:
        body_rows.append(
            [
                Paragraph(he_display, styles["hebrew"]),
                Paragraph(en_text, styles["body"]),
            ]
        )
    else:
        body_rows.append(
            [
                Paragraph("", styles["body"]),
                Paragraph(en_text, styles["body"]),
            ]
        )

    body_tbl = Table(body_rows, colWidths=[2.6 * inch, 3.15 * inch])
    body_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), bg_color),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("BOX", (0, 0), (-1, -1), 0.5, border_color),
                ("LINEBEFORE", (1, 0), (1, -1), 0.5, border_color),
            ]
        )
    )

    flowables = [header_tbl, body_tbl]

    if note:
        flowables.append(
            Table(
                [[Paragraph(f"Note: {clean_for_paragraph(note)}", styles["note_text"])]],
                colWidths=[5.75 * inch],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), GRAY_LIGHT),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("BOX", (0, 0), (-1, -1), 0.3, GRAY),
                    ]
                ),
            )
        )

    if label_str:
        flowables.append(
            Table(
                [[Paragraph(f"Labels: {label_str}", styles["ref_text"])]],
                colWidths=[5.75 * inch],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), bg_color),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("BOX", (0, 0), (-1, -1), 0.3, border_color),
                    ]
                ),
            )
        )

    flowables.append(Spacer(1, 0.12 * inch))
    return flowables


def build_annotations_section(story, data, styles):
    annotations = data.get("annotations", [])

    # Sort by section then by score desc
    section_order = ["Introduction", "A Pleasant Song", "Part I", "Part II", "Additions from Manuscript"]
    by_section: dict = {}
    for ann in annotations:
        sec = ann.get("section_key", "Other")
        by_section.setdefault(sec, []).append(ann)

    for sec in section_order + [s for s in by_section if s not in section_order]:
        anns = by_section.get(sec)
        if not anns:
            continue

        story.append(Paragraph(sec or "Main Lessons", styles["section_head"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=CYAN, spaceAfter=6))

        # Sort by score descending within section
        anns_sorted = sorted(anns, key=lambda a: -a.get("relevance_score", 0))

        for ann in anns_sorted:
            story.extend(annotation_card(ann, styles))


# ── Main ────────────────────────────────────────────────────────────────────────

def main():
    print("Loading annotation data…")
    data = load_data()
    styles = make_styles()

    print("Building PDF…")
    doc = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=letter,
        leftMargin=inch,
        rightMargin=inch,
        topMargin=inch,
        bottomMargin=0.75 * inch,
        title="Likutei Moharan — Annotated Edition",
        author="Rebbe Nachman of Breslov / Annotations by Matthew Miller",
        subject="Anti-Intellectual Thesis Analysis",
    )

    story = []
    build_title_page(story, data, styles)
    build_label_legend(story, data, styles)
    build_annotations_section(story, data, styles)

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"PDF written to {OUTPUT_PDF}")
    import os
    size = os.path.getsize(OUTPUT_PDF)
    print(f"File size: {size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
