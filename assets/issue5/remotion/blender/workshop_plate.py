"""3Dの鉄骨加工場の「背景の映像」（キャラクターなし）を作る。MCPは使わず、コマンドで実行する。
形はすべてプログラムで作る（他人のモデル・素材は使わない）。2Dの4匹と字幕は、Remotion で上に重ねる。
冒頭の見本：端材の山に寄って始め、引いて加工場の全体を見せる（第1話の冒頭に使う）。
使い方：
  静止画：  blender -b -P blender/workshop_plate.py -- still 1 out/blender/plate-f1.png
  動画：    blender -b -P blender/workshop_plate.py -- movie out/blender/plate        （連番PNGを書く）
"""
import math
import random
import sys

import bpy
from mathutils import Euler, Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["still", "1", "plate.png"]
MODE = args[0]
FPS = 30
FRAMES = 300
RES = 540

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, FRAMES
ids = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
scene.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in ids else "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = scene.render.resolution_y = RES
scene.render.film_transparent = False
try:
    scene.eevee.taa_render_samples = 24
except Exception:
    pass
vts = [v.identifier for v in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items]
scene.view_settings.view_transform = "AgX" if "AgX" in vts else "Filmic"
random.seed(7)


def mat(name, color, rough=0.6, metal=0.0, emission=None, strength=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m


def noise_mat(name, c1, c2, scale=6.0, rough=0.85):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].color = (*c1, 1)
    r.color_ramp.elements[1].color = (*c2, 1)
    nt.links.new(n.outputs["Fac"], r.inputs["Fac"])
    nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    return m


M = {
    "floor": noise_mat("floor", (0.17, 0.15, 0.13), (0.36, 0.32, 0.27), 3.0),
    "wall": mat("wall", (0.78, 0.66, 0.5), 0.9),
    "steel": mat("steel", (0.36, 0.37, 0.4), 0.42, 0.85),
    "steel2": mat("steel2", (0.5, 0.51, 0.54), 0.5, 0.8),
    "dark": mat("dark", (0.07, 0.07, 0.08), 0.7, 0.3),
    "yellow": mat("yellow", (0.95, 0.68, 0.06), 0.4, 0.1),
    "window": mat("window", (1, 0.9, 0.7), 0.2, emission=(1.0, 0.82, 0.55), strength=22),
    "rack": mat("rack", (0.5, 0.25, 0.1), 0.6, 0.4),
}


def box(name, loc, size, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    o.rotation_euler = Euler(rot)
    o.data.materials.append(m)
    return o


def cyl(name, loc, r, h, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=h, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = Euler(rot)
    o.data.materials.append(m)
    return o


def hbeam(name, loc, length, m, rot=(0, 0, 0), s=0.16):
    """H形の鉄骨（上下のフランジ＋ウェブ）。length は x 方向。"""
    parts = [
        box(name + "_t", (loc[0], loc[1], loc[2] + s * 0.45), (length, s, s * 0.12), m, rot),
        box(name + "_b", (loc[0], loc[1], loc[2] - s * 0.45), (length, s, s * 0.12), m, rot),
        box(name + "_w", loc, (length, s * 0.1, s * 0.9), m, rot),
    ]
    return parts


# ---------- 建物 ----------
box("floor", (0, 8, -0.05), (24, 34, 0.1), M["floor"])
box("wall_back", (0, 24, 4), (24, 0.4, 8), M["wall"])
box("wall_L", (-12, 8, 4), (0.4, 34, 8), M["wall"])
box("wall_R", (12, 8, 4), (0.4, 34, 8), M["wall"])
box("ceiling", (0, 8, 8.1), (24, 34, 0.2), M["dark"])
for y in (1, 6, 11, 16, 21):  # 屋根の鉄骨
    hbeam(f"truss{y}", (0, y, 7.4), 24, M["steel"], s=0.5)
for y in range(0, 24, 4):  # 窓（左の壁の高い所）
    box(f"win{y}", (-11.75, y + 2, 5.4), (0.1, 2.4, 1.6), M["window"])
for y in range(-2, 24, 5):  # 床の黄色い線
    box(f"line{y}", (-4.2, y + 2, 0.01), (0.12, 4, 0.01), M["yellow"])
    box(f"lineR{y}", (4.2, y + 2, 0.01), (0.12, 4, 0.01), M["yellow"])

# ---------- 天井クレーン ----------
hbeam("crane", (0, 9, 6.6), 22, M["yellow"], s=0.7)
box("trolley", (3.2, 9, 6.15), (1.2, 1.2, 0.5), M["yellow"])
cyl("chain", (3.2, 9, 5.0), 0.04, 2.2, M["dark"])
bpy.ops.mesh.primitive_torus_add(location=(3.2, 9, 3.8), major_radius=0.22, minor_radius=0.05, rotation=(math.pi / 2, 0, 0))
bpy.context.active_object.data.materials.append(M["steel2"])

# ---------- 右の棚（鉄骨の置き場） ----------
for x in (6.2, 8.6, 11.0):
    for y in (6, 10, 14):
        box(f"post{x}_{y}", (x, y, 1.6), (0.12, 0.12, 3.2), M["rack"])
for z in (0.6, 1.7, 2.8):
    for y0 in (6, 10):
        box(f"shelf{z}_{y0}", (8.6, y0 + 2, z), (5.0, 4.2, 0.08), M["rack"])
        for k in range(4):
            hbeam(f"rb{z}_{y0}_{k}", (8.6, y0 + 0.5 + k * 1.0, z + 0.18), 4.6, M["steel"], s=0.3)

# ---------- 左：帯のこ盤と作業台 ----------
box("saw_base", (-7.5, 8, 0.7), (1.8, 1.4, 1.4), M["dark"])
box("saw_body", (-7.5, 8, 1.7), (1.4, 0.6, 1.4), M["yellow"])
box("saw_arm", (-7.5, 8, 2.6), (2.2, 0.4, 0.4), M["yellow"])
box("bench", (-6.0, 3.5, 0.45), (3.0, 1.2, 0.9), M["steel2"])
box("bench_top", (-6.0, 3.5, 0.92), (3.1, 1.3, 0.08), M["dark"])

# ---------- 手前の端材の山 ----------
PILE = Vector((0.0, 0.6, 0.0))
for r in range(6):
    n = 8 - r
    for k in range(n):
        ln = 0.7 + random.random() * 1.1
        x = PILE.x + (k - (n - 1) / 2) * 0.3 + random.uniform(-0.08, 0.08)
        z = 0.07 + r * 0.115
        y = PILE.y + random.uniform(-0.12, 0.12)
        rot = (random.uniform(-0.06, 0.06), random.uniform(-0.05, 0.05), random.uniform(-0.45, 0.45))
        kind = random.random()
        mm = M["steel"] if kind < 0.6 else (M["steel2"] if kind < 0.85 else M["rack"])
        box(f"off{r}_{k}", (x, y, z), (ln, 0.12, 0.12), mm, rot)

# ---------- 光 ----------
world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.16, 0.12, 0.09, 1)
bg.inputs["Strength"].default_value = 0.8
sun = bpy.data.lights.new("sun", "SUN")
sun.energy = 3.2
sun.color = (1.0, 0.82, 0.58)
sun.angle = math.radians(4)
so = bpy.data.objects.new("sun", sun)
scene.collection.objects.link(so)
so.rotation_euler = Euler((math.radians(58), 0, math.radians(75)))
for i, (x, y) in enumerate(((0, 5), (0, 13), (0, 19))):
    a = bpy.data.lights.new(f"area{i}", "AREA")
    a.energy = 1000
    a.size = 4
    a.color = (1.0, 0.9, 0.75)
    ao = bpy.data.objects.new(f"area{i}", a)
    scene.collection.objects.link(ao)
    ao.location = (x, y, 6.8)
    ao.rotation_euler = Euler((0, 0, 0))

# ---------- カメラ（端材の山に寄って始め、引く） ----------
cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 32
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
tgt = bpy.data.objects.new("tgt", None)
scene.collection.objects.link(tgt)
con = cam.constraints.new("TRACK_TO")
con.target = tgt
con.track_axis = "TRACK_NEGATIVE_Z"
con.up_axis = "UP_Y"

keys = [
    # フレーム, カメラの位置, 見る先
    (1, (0.5, -2.2, 0.55), (0.0, 0.6, 0.45)),
    (66, (0.2, -5.6, 1.3), (0.0, 3.0, 1.2)),
    (150, (-0.4, -8.2, 1.7), (0.3, 6.0, 1.6)),
    (300, (-0.9, -8.8, 1.8), (0.6, 6.0, 1.65)),
]
for f, p, t in keys:
    cam.location = p
    tgt.location = t
    cam.keyframe_insert("location", frame=f)
    tgt.keyframe_insert("location", frame=f)
for fc in list(cam.animation_data.action.fcurves) + list(tgt.animation_data.action.fcurves) if hasattr(cam.animation_data.action, "fcurves") else []:
    for kp in fc.keyframe_points:
        kp.interpolation = "BEZIER"

if MODE == "still":
    scene.frame_set(int(args[1]))
    scene.render.filepath = args[2]
    bpy.ops.render.render(write_still=True)
else:
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = args[1] + "/f"
    bpy.ops.render.render(animation=True)
print("DONE", MODE)
