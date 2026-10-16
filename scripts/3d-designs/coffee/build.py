"""Build the Coffee Bar: every drink in src/data/coffee-3d/drinks.json as a cup with its layers inside.

  blender -b -P scripts/3d-designs/coffee/build.py -- [--no-render] [--samples N] [--only id,id] [--skip-existing]

Writes to public/3d/coffee-bar/:
  coffee-bar.glb       every drink under its own root node (drink_<id>); layers are <id>__<layer>
                       with extras z0/z1 (fill range, metres, glTF Y) and anchor (label point, glTF coords)
  <id>.webp            a Cycles render of each drink, for the cards
  lineup.webp          a row of drinks, for the hub and the share image

Ceramic cups are lathed to 270° so the missing quarter shows the layers; glass is lathed whole.
"""
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
DATA = json.loads((ROOT / 'src/data/coffee-3d/drinks.json').read_text())
OUT = ROOT / 'public/3d/coffee-bar'
OUT.mkdir(parents=True, exist_ok=True)

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = '--no-render' not in argv
SAMPLES = int(argv[argv.index('--samples') + 1]) if '--samples' in argv else 48
SKIP = '--skip-existing' in argv
ONLY = set(argv[argv.index('--only') + 1].split(',')) if '--only' in argv else None

bpy.ops.wm.read_factory_settings(use_empty=True)

SEGS = 72
CUT = math.radians(270)  # ceramic sweep; the gap faces the camera (+X, -Y)

# Cups live in drinks.json: inner height H, inner radius r0 (bottom) -> r1 (rim) with exponent p
# (p < 1 bowls out early), wall and base thickness, glass or ceramic, handle, saucer radius (0 = none). Metres.
CUPS = DATA['cups']


def hex_rgba(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c] + [1.0]


# ---------- materials ----------
MATS = {}


def material(name, color, rough=0.4, transmission=0.0, sss=0.0, ior=1.45, coat=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = color
    b.inputs['Roughness'].default_value = rough
    b.inputs['IOR'].default_value = ior
    b.inputs['Transmission Weight'].default_value = transmission
    b.inputs['Coat Weight'].default_value = coat
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.004, 0.003, 0.002)
    MATS[name] = m
    return m


LIQUID = {  # kind -> (roughness, subsurface, coat)
    'espresso': (0.12, 0, 0.6), 'americano': (0.1, 0, 0.6), 'black': (0.1, 0, 0.6), 'chocolate': (0.2, 0, 0.4),
    'crema': (0.45, 0.1, 0), 'kaimak': (0.5, 0.1, 0), 'band': (0.3, 0.25, 0), 'dot': (0.6, 0, 0),
    'milk': (0.3, 0.45, 0), 'microfoam': (0.35, 0.4, 0.3), 'foam': (0.85, 0.3, 0), 'cream': (0.75, 0.3, 0),
    'nesfoam': (0.8, 0.2, 0), 'nes': (0.25, 0.3, 0), 'slush': (0.55, 0.2, 0), 'gelato': (0.6, 0.35, 0),
    'grounds': (0.95, 0, 0), 'straw': (0.35, 0, 0),
}


def liquid(kind):
    rough, sss, coat = LIQUID.get(kind, (0.4, 0, 0))
    return material(f'liquid_{kind}', hex_rgba(DATA['colors'][kind]), rough=rough, sss=sss, coat=coat)


GLASS = material('glass', [0.95, 0.97, 1.0, 1.0], rough=0.02, transmission=1.0, ior=1.5)
CERAMIC = material('ceramic', hex_rgba('#2f5f66'), rough=0.2, coat=0.5)  # teal glaze, so white foam reads against it
SECTION = material('section', hex_rgba('#d9cfc0'), rough=0.85)  # the cut face: unglazed bisque


# ---------- geometry ----------
def mesh_object(name, bm, mat, parent, cap_mat=None):
    for e in bm.edges:  # crisp rims and cut faces, smooth walls
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > 0.6:
            e.smooth = False
    caps = bm.faces.layers.int.get('cap')
    for f in bm.faces:
        f.smooth = True
        if cap_mat and caps and f[caps]:
            f.material_index = 1
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    if cap_mat:
        me.materials.append(cap_mat)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = parent
    return ob


def lathe(profile, sweep=2 * math.pi, segs=SEGS):
    """Revolve a closed (r, z) loop about Z. A partial sweep gets flat caps on both cut planes."""
    full = sweep >= 2 * math.pi - 1e-6
    steps = segs if full else max(3, round(segs * sweep / (2 * math.pi)))
    bm = bmesh.new()
    rings = []
    for i in range(steps if full else steps + 1):
        a = sweep * i / steps
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for r, z in profile])
    n = len(profile)
    for i in range(len(rings) - (0 if full else 1)):
        A, B = rings[i], rings[(i + 1) % len(rings)]
        for j in range(n):
            quad = [A[j], A[(j + 1) % n], B[(j + 1) % n], B[j]]
            if len({v.co.to_tuple(7) for v in quad}) >= 3:
                try:
                    bm.faces.new(quad)
                except ValueError:
                    pass
    if not full:
        cap = bm.faces.layers.int.new('cap')
        for ring in (rings[0], rings[-1]):
            try:
                bm.faces.new(ring)[cap] = 1
            except ValueError:
                pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def inner_r(c, z):
    t = min(max(z / c['H'], 0), 1)
    return c['r0'] + (c['r1'] - c['r0']) * t ** c['p']


def cup_profile(c, lift):
    """Closed (r, z) loop of the wall + base, walking out along the bottom, up the outside, down the inside."""
    H, w, b = c['H'], c['wall'], c['base']
    zs = [H * (k / 24) for k in range(25)]
    outer = [(inner_r(c, z) + w, z + b + lift) for z in zs]
    foot = inner_r(c, 0) + w * 0.4
    loop = [(0, lift), (foot, lift), (foot + w * 0.6, lift + w * 0.6)] + outer[1:]
    loop += [(inner_r(c, H) + w * 0.5, H + b + lift + w * 0.35)]  # rounded lip
    loop += [(inner_r(c, z), z + b + lift) for z in reversed(zs)]
    loop += [(0, b + lift)]
    return loop


def layer_profile(c, z0, z1, lift, dome=0.0):
    inset = 0.994 if c['glass'] else 0.998
    zs = [z0 + (z1 - z0) * k / 8 for k in range(9)]
    loop = [(0, z0 + c['base'] + lift)]
    loop += [(inner_r(c, z) * inset, z + c['base'] + lift) for z in zs]
    if dome:
        R = inner_r(c, z1) * inset
        for k in range(1, 12):
            u = k / 12
            loop.append((R * (1 - u), z1 + c['base'] + lift + dome * math.sin(u * math.pi / 2) ** 0.8))
    loop.append((0, z1 + c['base'] + lift + dome))
    return loop


def saucer(radius, parent, sweep):
    prof = [(0, 0), (radius * 0.45, 0), (radius * 0.5, 0.002), (radius * 0.95, 0.007), (radius, 0.0095),
            (radius * 0.97, 0.011), (radius * 0.88, 0.0085), (radius * 0.5, 0.0055), (radius * 0.36, 0.006), (0, 0.006)]
    return mesh_object(parent.name.replace('drink_', '') + '__saucer', lathe(prof), CERAMIC, parent)


def handle(c, lift, parent, name):
    zb, zt = c['H'] * 0.18, c['H'] * 0.78
    mid = lambda z: -(inner_r(c, z) + c['wall'] * 0.5)
    reach = 0.022 if c['H'] < 0.07 else 0.028
    pts = []
    for k in range(17):
        u = k / 16
        z = zb + (zt - zb) * (0.5 - 0.5 * math.cos(u * math.pi))
        bulge = math.sin(u * math.pi) ** 0.7
        pts.append((mid(z) - reach * bulge, 0, z + c['base'] + lift))
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for p, (x, y, z) in zip(sp.points, pts):
        p.co = (x, y, z, 1)
    cu.bevel_depth = 0.0042 if c['H'] < 0.07 else 0.005
    cu.bevel_resolution = 4
    cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    ob.data.materials.clear()
    ob.data.materials.append(GLASS if c['glass'] else CERAMIC)
    for f in ob.data.polygons:
        f.use_smooth = True
    ob.rotation_euler = (0, 0, math.radians(50))  # off to the left of the camera, beside the cutaway
    ob.parent = parent
    return ob


def disc(name, r, h, z, mat, parent):
    return mesh_object(name, lathe([(0, z), (r, z), (r, z + h * 0.7), (r * 0.7, z + h), (0, z + h)]), mat, parent)


def to_gltf(v):  # Blender Z-up -> glTF Y-up
    return [v[0], v[2], -v[1]]


def build_drink(d):
    c = CUPS[d['cup']]
    root = bpy.data.objects.new(f"drink_{d['id']}", None)
    bpy.context.scene.collection.objects.link(root)
    sweep = 2 * math.pi if c['glass'] else CUT
    lift = 0.0
    if c['saucer']:
        saucer(c['saucer'], root, sweep)
        lift = 0.0058
    mesh_object(f"{d['id']}__cup", lathe(cup_profile(c, lift), sweep), GLASS if c['glass'] else CERAMIC, root,
                None if c['glass'] else SECTION)
    if c['handle']:
        handle(c, lift, root, f"{d['id']}__handle")

    fillH = c['H'] * d['fill']
    z = 0.0
    tops = {}
    for L in d['layers']:
        shape = L.get('shape')
        name = f"{d['id']}__{L['id']}"
        mat = liquid(L['kind'])
        if shape == 'dot':
            top = max(tops.values())
            ob = disc(name, inner_r(c, fillH) * 0.28, 0.0016, top - 0.0008, mat, root)
            z0w, z1w = top - 0.0008, top + 0.0008
            anchor = (0, -inner_r(c, fillH) * 0.15, top)
        elif shape == 'scoop':
            R = inner_r(c, fillH) * 0.82
            bm = bmesh.new()
            bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=R)
            for v in bm.verts:  # flatten the bottom where it sits in the coffee, scoop-like ridge
                v.co.z *= 0.9
                v.co *= 1 + 0.025 * math.sin(7 * math.atan2(v.co.y, v.co.x)) * max(0, v.co.z / R)
            cz = c['base'] + fillH + R * 0.25
            bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, cz))
            ob = mesh_object(name, bm, mat, root)
            z0w, z1w = cz - R * 0.9, cz + R * 0.9
            anchor = (R * 0.7, -R * 0.7, cz + R * 0.3)
        elif shape == 'straw':
            bm = bmesh.new()
            bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.0045, radius2=0.0045, depth=c['H'] * 1.35)
            ob = mesh_object(name, bm, mat, root)
            ob.location = (0.012, 0.004, c['base'] + c['H'] * 0.62)
            ob.rotation_euler = (0, math.radians(11), 0)
            z0w, z1w = c['base'] + c['H'] * 0.02, c['base'] + c['H'] * 1.3
            anchor = (0.03, 0, c['base'] + c['H'] * 1.2)
        else:
            z1 = z + fillH * L['frac']
            dome = L.get('dome', 0.0)
            ob = mesh_object(name, lathe(layer_profile(c, z, z1, lift, dome), sweep), mat, root)
            z0w, z1w = z + c['base'] + lift, z1 + c['base'] + lift + dome
            tops[L['id']] = z1w
            zm = (z0w + z1w) / 2 if not dome else z0w + (z1 - z) / 2
            rm = inner_r(c, (z + z1) / 2)
            anchor = (rm * 0.55, 0, zm) if not c['glass'] else (rm * 0.72, -rm * 0.72, zm)
            z = z1
        ob['layer'] = L['id']
        ob['z0'] = round(z0w, 5)
        ob['z1'] = round(z1w, 5)
        ob['anchor'] = [round(a, 5) for a in to_gltf(anchor)]
    root['rim'] = round(c['H'] + c['base'] + lift, 5)
    root['glass'] = c['glass']
    return root


drinks = [d for d in DATA['drinks'] if not ONLY or d['id'] in ONLY]
roots = {d['id']: build_drink(d) for d in drinks}

if not ONLY:
    bpy.ops.export_scene.gltf(filepath=str(OUT / 'coffee-bar.glb'), export_format='GLB', export_extras=True,
                              export_yup=True, export_cameras=False, export_lights=False, export_apply=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=8)
    print('wrote', OUT / 'coffee-bar.glb')

if not RENDER:
    sys.exit(0)

# ---------- stage for the renders ----------
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 10
scene.cycles.transmission_bounces = 10
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Punchy'
scene.view_settings.exposure = -0.7
scene.render.image_settings.file_format = 'WEBP'
scene.render.image_settings.quality = 86
scene.render.film_transparent = False

world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.035, 0.025, 0.02, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.2

floor_mat = material('floor', hex_rgba('#3a2618'), rough=0.45)
bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
bpy.context.active_object.data.materials.append(floor_mat)
bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 1.2, 0), rotation=(math.radians(90), 0, 0))
wall_mat = material('wall', hex_rgba('#1a1210'), rough=0.9)
bpy.context.active_object.data.materials.append(wall_mat)


def add_light(name, energy, loc, size, color=(1, 0.95, 0.88)):
    L = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA'))
    L.data.energy, L.data.size, L.data.color = energy, size, color
    L.location = loc
    L.rotation_euler = (Vector((0, 0, 0.05)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(L)
    return L


lights = [add_light('key', 60, (-0.35, -0.45, 0.55), 0.4), add_light('fill', 14, (0.5, -0.3, 0.2), 0.5, (0.85, 0.9, 1)),
          add_light('rim', 40, (0.2, 0.6, 0.45), 0.3)]

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam


def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == 'MESH' for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    return lo, hi


def aim(target, dist, yaw, pitch, lens):
    cam.data.lens = lens
    d = Vector((math.cos(pitch) * math.cos(yaw), math.cos(pitch) * math.sin(yaw), math.sin(pitch)))
    cam.location = target + d * dist
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()


def show_only(ids):
    for i, r in roots.items():
        hide = i not in ids
        for o in [r] + list(r.children_recursive):
            o.hide_render = hide


scene.render.resolution_x = scene.render.resolution_y = 640
for d in drinks:
    if SKIP and (OUT / f"{d['id']}.webp").exists():
        continue
    show_only({d['id']})
    kids = list(roots[d['id']].children_recursive)
    lo, hi = bounds(kids)
    h = hi.z - lo.z
    size = max(h, hi.x - lo.x, hi.y - lo.y)
    aim(Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z + h * 0.45)), size * 3.4, math.radians(-40), math.radians(32), 70)
    scene.render.filepath = str(OUT / f"{d['id']}.webp")
    bpy.ops.render.render(write_still=True)
    print('rendered', d['id'])

if not ONLY:
    row = ['espresso', 'macchiato', 'cortado', 'cappuccino', 'hafuch', 'latte-macchiato', 'botz', 'ice']
    show_only(set(row))
    x = 0.0
    for i in row:
        r = roots[i]
        lo, hi = bounds(list(r.children_recursive))
        w = hi.x - lo.x
        r.location.x = x - lo.x
        r.location.y = 0.03 * (len(row) // 2 - abs(row.index(i) - len(row) // 2))  # gentle arc
        x += w + 0.025
    bpy.context.view_layer.update()
    kids = [o for i in row for o in roots[i].children_recursive]
    lo, hi = bounds(kids)
    for L in lights:
        L.location.x += (lo.x + hi.x) / 2
        L.data.size *= 2.5
        L.data.energy *= 2.2
    scene.render.resolution_x, scene.render.resolution_y = 1600, 840
    span = hi.x - lo.x  # a 60 mm lens sees about 0.6 of its distance across; leave a margin
    aim(Vector(((lo.x + hi.x) / 2, 0.0, 0.055)), span * 1.95, math.radians(-90), math.radians(13), 60)
    scene.render.filepath = str(OUT / 'lineup.webp')
    bpy.ops.render.render(write_still=True)
    print('rendered lineup')
