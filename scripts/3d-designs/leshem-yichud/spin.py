"""Render frames of the card on its stand turning a full circle, for the spinning GIF.

  blender -b -P scripts/3d-designs/leshem-yichud/spin.py -- <out_dir> [frames] [size] [glb] [start_frame]

Then ffmpeg turns the frames into public/3d/leshem-yichud/leshem-yichud-spin.gif:

  ffmpeg -y -framerate 16 -i <out_dir>/f%03d.png -vf "split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" -loop 0 public/3d/leshem-yichud/leshem-yichud-spin.gif
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out = Path(argv[0] if argv else '/tmp/ly-spin')
frames = int(argv[1]) if len(argv) > 1 else 48
size = int(argv[2]) if len(argv) > 2 else 560
out.mkdir(parents=True, exist_ok=True)

glb = Path(argv[3]) if len(argv) > 3 else \
    Path(__file__).resolve().parents[3] / 'public' / '3d' / 'leshem-yichud' / 'leshem-yichud-stand-preview.glb'

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(glb))

# trimesh wrote the print's Z-up coordinates and the importer read them as Y-up: stand it back up
root = bpy.data.objects.new('root', None)
scene.collection.objects.link(root)
for o in list(scene.objects):
    if o is not root and o.parent is None:
        o.parent = root
root.rotation_euler = (-math.pi / 2, 0, 0)
bpy.context.view_layer.update()

pts = [o.matrix_world @ Vector(c) for o in scene.objects if o.type == 'MESH' for c in o.bound_box]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
center = (lo + hi) / 2
pivot = bpy.data.objects.new('pivot', None)  # spin about the vertical axis through the middle
scene.collection.objects.link(pivot)
pivot.location = (center.x, center.y, lo.z)
bpy.context.view_layer.update()
root.parent = pivot
root.matrix_parent_inverse = pivot.matrix_world.inverted()

height = hi.z - lo.z
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
cam.data.lens = 60
cam.location = (center.x, center.y - height * 2.6, lo.z + height * 0.75)
target = Vector((center.x, center.y, lo.z + height * 0.46))
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam

for name, energy, loc in (('key', 3000000, (-1, -1.4, 1.6)), ('fill', 1000000, (1.4, -0.8, 0.6)), ('rim', 2000000, (0.4, 1.5, 1.2))):
    light = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA'))
    light.data.energy = energy
    light.data.size = height
    light.location = center + Vector(loc) * height * 2.2
    light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(light)

world = bpy.data.worlds.new('world')
world.use_nodes = True
# near black where the camera looks; soft grey-blue in reflections, so the back mirror reads as a mirror
nt = world.node_tree
dark = nt.nodes['Background']
dark.inputs[0].default_value = (0.006, 0.007, 0.01, 1)
soft = nt.nodes.new('ShaderNodeBackground')
soft.inputs[0].default_value = (0.42, 0.46, 0.55, 1)
soft.inputs[1].default_value = 0.6
mix = nt.nodes.new('ShaderNodeMixShader')
path = nt.nodes.new('ShaderNodeLightPath')
nt.links.new(path.outputs['Is Camera Ray'], mix.inputs[0])
nt.links.new(soft.outputs[0], mix.inputs[1])
nt.links.new(dark.outputs[0], mix.inputs[2])
nt.links.new(mix.outputs[0], nt.nodes['World Output'].inputs[0])
scene.world = world

scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.eevee.taa_render_samples = 16
scene.render.resolution_x = scene.render.resolution_y = size
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
scene.render.image_settings.file_format = 'PNG'

start = int(argv[4]) if len(argv) > 4 else 0  # resume a run that was cut short
for i in range(start, frames):
    pivot.rotation_euler = (0, 0, 2 * math.pi * i / frames)
    scene.render.filepath = str(out / f'f{i:03d}.png')
    bpy.ops.render.render(write_still=True)
