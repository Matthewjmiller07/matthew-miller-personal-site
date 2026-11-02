"""Render each plague kit's assembled GLB to a square card image, and the capsule.

  blender -b -P scripts/3d-designs/plagues/render.py -- [size] [slug ...]

Writes public/3d/plagues/<slug>/<slug>.png (then cwebp turns them into .webp).
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
size = int(argv[0]) if argv else 720
OUT = Path(__file__).resolve().parents[3] / 'public' / '3d' / 'plagues'
slugs = argv[1:] or sorted(p.name for p in OUT.iterdir() if p.is_dir())


def render(slug):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'Standard'
    bpy.ops.import_scene.gltf(filepath=str(OUT / slug / f'{slug}.glb'))
    meshes = [o for o in scene.objects if o.type == 'MESH']
    for o in meshes:
        for slot in o.material_slots:
            m = slot.material
            if m and m.node_tree:
                b = m.node_tree.nodes.get('Principled BSDF')
                if b and m.blend_method == 'BLEND' or (b and b.inputs['Alpha'].default_value < 1):
                    b.inputs['Alpha'].default_value = 1.0
                    b.inputs['Transmission Weight'].default_value = 0.85
                    b.inputs['Roughness'].default_value = 0.15
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (lo + hi) / 2
    radius = max((hi - lo).length / 2, 22)

    world = bpy.data.worlds.new('w')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.055, 0.06, 0.075, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0

    bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, lo.z - 0.01))
    floor = bpy.context.object
    fm = bpy.data.materials.new('floor')
    fm.use_nodes = True
    fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.07, 0.075, 0.09, 1)
    fm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.6
    floor.data.materials.append(fm)

    for loc, energy, sz in (((-60, -80, 110), 90000, 60), ((90, -30, 60), 30000, 40), ((0, 90, 80), 40000, 50)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        light.data.energy = energy
        light.data.size = sz
        d = centre - light.location
        light.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens = 70
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    yaw, pitch = math.radians(-28), math.radians(24)
    dist = radius / math.sin(math.radians(13.5)) * 1.05
    cam.location = centre + Vector((dist * math.cos(pitch) * math.sin(yaw), -dist * math.cos(pitch) * math.cos(yaw), dist * math.sin(pitch)))
    cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()

    scene.render.filepath = str(OUT / slug / f'{slug}.png')
    bpy.ops.render.render(write_still=True)


for s in slugs:
    render(s)
