#!/usr/bin/env python3
"""
Generate a 3D-printable STL of the 2026 business card calendar.
Renders the PDF to a bitmap, then extrudes dark pixels as raised geometry
on a card base. Best results with resin printers; for FDM scale up 150%.
"""
import subprocess, sys, os
import numpy as np
from PIL import Image
from stl import mesh

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH   = os.path.join(SCRIPT_DIR, "calendar-2026.pdf")
OUT_STL    = os.path.join(SCRIPT_DIR, "calendar-2026.stl")

# ── Physical dimensions (mm) ─────────────────────────────────────────────────
CARD_W   = 89.0
CARD_H   = 51.0
CARD_D   = 2.0   # base thickness
TEXT_H   = 0.5   # raised text height
CORNER_R = 2.5   # rounded corner radius (cosmetic; approx via mesh)

# ── Render PDF to grayscale image ─────────────────────────────────────────────
DPI = 250   # ~0.1mm per pixel at business-card size
PNG_TMP = os.path.join(SCRIPT_DIR, "_cal_render.png")

print(f"Rendering PDF at {DPI} DPI …")
result = subprocess.run([
    "gs", "-dNOPAUSE", "-dBATCH",
    "-sDEVICE=pnggray",
    f"-r{DPI}",
    f"-sOutputFile={PNG_TMP}",
    PDF_PATH,
], capture_output=True, text=True)
if result.returncode != 0:
    print("Ghostscript error:", result.stderr)
    sys.exit(1)

img = Image.open(PNG_TMP)
img_w, img_h = img.size
print(f"Rendered: {img_w} × {img_h} pixels")

# Flip vertically: PDF origin is bottom-left, PIL is top-left
# STL world: +X = right, +Y = up (in card plane), +Z = out of card
img_arr = np.array(img)          # shape (img_h, img_w), values 0–255
img_arr = np.flipud(img_arr)     # flip so row 0 = bottom of card

# mm per pixel
px_mm = CARD_W / img_w
py_mm = CARD_H / img_h

# Threshold: pixels darker than 128 → raised text
text_mask = img_arr < 180       # True where text is present

# Margin in pixels (3mm each side)
margin_x = int(3.5 / px_mm)
margin_y = int(3.0 / py_mm)

# ── Build triangle list ───────────────────────────────────────────────────────
triangles = []

def quad(p0, p1, p2, p3):
    """Add two triangles for a quad face (p0–p3 in CCW order viewed from outside)."""
    triangles.append([p0, p1, p2])
    triangles.append([p0, p2, p3])

def add_box(x0, y0, z0, x1, y1, z1):
    """Add an axis-aligned box as 12 triangles."""
    # Bottom (z = z0, normal -Z)
    quad([x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0])
    # Top (z = z1, normal +Z)
    quad([x0,y0,z1],[x0,y1,z1],[x1,y1,z1],[x1,y0,z1])
    # Front (y = y0, normal -Y)
    quad([x0,y0,z0],[x0,y0,z1],[x1,y0,z1],[x1,y0,z0])
    # Back (y = y1, normal +Y)
    quad([x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1])
    # Left (x = x0, normal -X)
    quad([x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1])
    # Right (x = x1, normal +X)
    quad([x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0])

# Card base
print("Building card base …")
add_box(0, 0, 0, CARD_W, CARD_H, CARD_D)

# Raised text voxels
print("Building text geometry …")
text_pixel_count = int(np.sum(text_mask))
print(f"  {text_pixel_count} text pixels → ~{text_pixel_count * 12} triangles")

for row in range(img_h):
    for col in range(img_w):
        if not text_mask[row, col]:
            continue
        # Convert pixel to mm coordinates
        x0 = col * px_mm
        y0 = row * py_mm
        x1 = x0 + px_mm
        y1 = y0 + py_mm
        # Clamp to card bounds
        x0 = max(0.0, min(x0, CARD_W))
        x1 = max(0.0, min(x1, CARD_W))
        y0 = max(0.0, min(y0, CARD_H))
        y1 = max(0.0, min(y1, CARD_H))
        if x1 <= x0 or y1 <= y0:
            continue
        # Only add top + side faces (bottom is the card top surface)
        # Top face (normal +Z)
        quad([x0,y0,CARD_D+TEXT_H],[x0,y1,CARD_D+TEXT_H],
             [x1,y1,CARD_D+TEXT_H],[x1,y0,CARD_D+TEXT_H])
        # Check neighbors to decide if side faces are exposed
        if row == 0 or not text_mask[row-1, col]:   # front
            quad([x0,y0,CARD_D],[x1,y0,CARD_D],
                 [x1,y0,CARD_D+TEXT_H],[x0,y0,CARD_D+TEXT_H])
        if row == img_h-1 or not text_mask[row+1, col]:  # back
            quad([x0,y1,CARD_D],[x0,y1,CARD_D+TEXT_H],
                 [x1,y1,CARD_D+TEXT_H],[x1,y1,CARD_D])
        if col == 0 or not text_mask[row, col-1]:   # left
            quad([x0,y0,CARD_D],[x0,y0,CARD_D+TEXT_H],
                 [x0,y1,CARD_D+TEXT_H],[x0,y1,CARD_D])
        if col == img_w-1 or not text_mask[row, col+1]:  # right
            quad([x1,y0,CARD_D],[x1,y1,CARD_D],
                 [x1,y1,CARD_D+TEXT_H],[x1,y0,CARD_D+TEXT_H])

# ── Assemble STL mesh ─────────────────────────────────────────────────────────
print(f"Assembling {len(triangles)} triangles …")
card_mesh = mesh.Mesh(np.zeros(len(triangles), dtype=mesh.Mesh.dtype))
for i, tri in enumerate(triangles):
    for j, vert in enumerate(tri):
        card_mesh.vectors[i][j] = vert

card_mesh.save(OUT_STL)
print(f"✓ STL written to {OUT_STL}")
print(f"  ({os.path.getsize(OUT_STL) / 1024:.0f} KB)")
print()
print("Printing notes:")
print("  • Best results: resin printer (0.05mm layer height)")
print("  • FDM: scale to 150% in slicer for minimum feature width")
print("  • Layer height: 0.1mm recommended")
print("  • No supports needed (flat base)")
