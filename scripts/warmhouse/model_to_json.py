#!/usr/bin/env python3
"""Turn a 4-colour Bambu Studio 3MF (one part per filament) into the small JSON the
WarmHouse pages draw with three.js.

  python3 scripts/warmhouse/model_to_json.py house.3mf public/warmhouse/models/<name>.json

Output: {"size": [x, y, z] in mm, "parts": [{"color": "#hex", "v": [ints, 0.01 mm], "i": [indices]}]}
with the model centred on x/y and sitting on z = 0.
"""
import json, re, sys, zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"}
# Filament colours are pure (#000000 black); these read better on screen.
SCREEN = {"#FFFFFF": "#F4F1EA", "#000000": "#34312F"}


def main(src, out):
    z = zipfile.ZipFile(src)
    root = ET.fromstring(z.read("3D/3dmodel.model"))
    comps = root.findall(".//m:component", NS)
    objs = {o.get("id"): o for o in ET.fromstring(z.read("3D/Objects/object_1.model")).findall(".//m:object", NS)}
    colours = json.loads(z.read("Metadata/project_settings.config"))["filament_colour"]
    extruder = {}
    for part in ET.fromstring(z.read("Metadata/model_settings.config")).iter("part"):
        for md in part.findall("metadata"):
            if md.get("key") == "extruder":
                extruder[part.get("id")] = int(md.get("value"))
    parts, allv = [], []
    for c in comps:
        t = [float(x) for x in c.get("transform").split()]
        mesh = objs[c.get("objectid")].find("m:mesh", NS)
        verts = []
        for v in mesh.find("m:vertices", NS):
            x, y, zz = float(v.get("x")), float(v.get("y")), float(v.get("z"))
            verts.append((t[0]*x + t[3]*y + t[6]*zz + t[9], t[1]*x + t[4]*y + t[7]*zz + t[10], t[2]*x + t[5]*y + t[8]*zz + t[11]))
        idx = [int(tr.get(k)) for tr in mesh.find("m:triangles", NS) for k in ("v1", "v2", "v3")]
        col = colours[extruder.get(c.get("objectid"), 1) - 1].upper()[:7]
        parts.append((SCREEN.get(col, col), verts, idx))
        allv += verts
    lo = [min(v[k] for v in allv) for k in range(3)]
    hi = [max(v[k] for v in allv) for k in range(3)]
    cx, cy = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2
    data = {
        "size": [round(hi[k] - lo[k], 1) for k in range(3)],
        "parts": [
            {"color": col, "v": [round(n * 100) for v in verts for n in (v[0] - cx, v[1] - cy, v[2] - lo[2])], "i": idx}
            for col, verts, idx in parts
        ],
    }
    with open(out, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(data["size"], sum(len(p["i"]) for p in data["parts"]) // 3, "triangles")


if __name__ == "__main__":
    main(*sys.argv[1:3])
