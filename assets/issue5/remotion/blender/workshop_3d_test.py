"""3D（Blender）の試作：鉄骨加工場で、黒シュナが作業台で測っていて、監督（柴犬）が歩いてきて話しかける（約8秒）。
2026-10-08 ばる「③を試しに見てみたい」。形はすべてプログラムで作る（他人のモデル・素材は使わない）。
使い方：
  静止画：  blender -b -P blender/workshop_3d_test.py -- still 150 out/blender/still.png
  動画：    blender -b -P blender/workshop_3d_test.py -- movie out/blender/test.mp4
"""
import math
import sys

import bmesh
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["still", "150", "still.png"]
MODE = args[0]
FPS = 30
FRAMES = 240

# ---------- 初期化 ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, FRAMES
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
scene.render.resolution_x = scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
try:
    scene.eevee.taa_render_samples = 32
except Exception:
    pass
LOOKS = None
scene.view_settings.view_transform = "AgX" if "AgX" in [v.identifier for v in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items] else "Filmic"


def mat(name, color, rough=0.6, metal=0.0, sheen=0.0, emission=None, strength=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if sheen and "Sheen Weight" in b.inputs:
        b.inputs["Sheen Weight"].default_value = sheen
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m


def noise_mat(name, c1, c2, scale=8.0, rough=0.85):
    """床用：ムラのあるコンクリート"""
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


def smooth(o, level=2):
    for p in o.data.polygons:
        p.use_smooth = True
    if level:
        mod = o.modifiers.new("sub", "SUBSURF")
        mod.levels = mod.render_levels = level
    return o


def add(kind, name, loc, scale=(1, 1, 1), m=None, parent=None, rot=(0, 0, 0), **kw):
    if kind == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=loc, **kw)
    elif kind == "cube":
        bpy.ops.mesh.primitive_cube_add(location=loc, **kw)
    elif kind == "cyl":
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, location=loc, **kw)
    elif kind == "cone":
        bpy.ops.mesh.primitive_cone_add(vertices=24, location=loc, **kw)
    elif kind == "torus":
        bpy.ops.mesh.primitive_torus_add(location=loc, **kw)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.rotation_euler = rot
    if m:
        o.data.materials.append(m)
    if kind in ("sphere", "torus"):
        smooth(o, 1)
    if parent:
        o.parent = parent
        o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o


def empty(name, loc, parent=None):
    o = bpy.data.objects.new(name, None)
    scene.collection.objects.link(o)
    o.location = loc
    if parent:
        o.parent = parent
        o.matrix_parent_inverse = parent.matrix_world.inverted()
    bpy.context.view_layer.update()
    return o


def hemisphere(name, loc, r, m, parent, squash=0.85):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=r, location=loc)
    o = bpy.context.active_object
    o.name = name
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.001], context="VERTS")
    bm.to_mesh(o.data)
    bm.free()
    o.scale = (1, 1, squash)
    o.data.materials.append(m)
    smooth(o, 1)
    o.parent = parent
    o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o


# ---------- 材質 ----------
M = {
    "floor": noise_mat("floor", (0.42, 0.38, 0.33), (0.62, 0.57, 0.5), 6),
    "wall": mat("wall", (0.85, 0.74, 0.58), 0.9, emission=(0.35, 0.27, 0.18), strength=0.6),
    "steel": mat("steel", (0.32, 0.33, 0.35), 0.45, 0.85),
    "rust": mat("rust", (0.36, 0.24, 0.16), 0.7, 0.4),
    "yellow": mat("yellow", (0.95, 0.68, 0.06), 0.35, 0.1),
    "window": mat("window", (1, 0.9, 0.7), 0.2, emission=(1.0, 0.82, 0.55), strength=14),
    "line": mat("line", (0.95, 0.75, 0.05), 0.6),
    "black": mat("black", (0.035, 0.035, 0.04), 0.7, sheen=0.6),
    "silver": mat("silver", (0.72, 0.72, 0.74), 0.75, sheen=0.8),
    "navy": mat("navy", (0.06, 0.1, 0.2), 0.8, sheen=0.4),
    "orange": mat("orange", (0.95, 0.32, 0.05), 0.55),
    "white": mat("white", (0.92, 0.92, 0.9), 0.7, sheen=0.5),
    "nose": mat("nose", (0.02, 0.02, 0.02), 0.25),
    "eye": mat("eye", (0.02, 0.012, 0.008), 0.08),
    "shine": mat("shine", (1, 1, 1), 0.1, emission=(1, 1, 1), strength=2),
    "shiba": mat("shiba", (0.78, 0.38, 0.12), 0.75, sheen=0.7),
    "cream": mat("cream", (0.95, 0.86, 0.72), 0.75, sheen=0.7),
    "grey": mat("grey", (0.55, 0.56, 0.57), 0.8, sheen=0.3),
    "helmet_w": mat("helmet_w", (0.93, 0.93, 0.9), 0.3),
    "board": mat("board", (0.45, 0.28, 0.14), 0.6),
    "paper": mat("paper", (0.95, 0.95, 0.92), 0.8),
    "table": mat("table", (0.5, 0.52, 0.54), 0.5, 0.6),
}

# ---------- 加工場 ----------
add("cube", "floor", (0, 3, 0), (8, 8, 0.01), M["floor"])
for x in (-2.2, 2.2):
    add("cube", f"line{x}", (x, 1.5, 0.012), (0.04, 4, 0.002), M["line"])
add("cube", "wall_back", (0, 7, 3), (8, 0.1, 3), M["wall"])
for i, x in enumerate((-3.6, -1.2, 1.2, 3.6)):
    add("cube", f"win{i}", (x, 6.88, 3.4), (0.8, 0.02, 1.0), M["window"])
    add("cube", f"winbar{i}", (x, 6.85, 3.4), (0.03, 0.03, 1.0), M["steel"])
for x in (-4.5, -1.5, 1.5, 4.5):  # 柱
    add("cube", f"col{x}", (x, 6.6, 3), (0.12, 0.12, 3), M["steel"])
add("cube", "crane", (0, 3.0, 4.6), (5.5, 0.18, 0.18), M["yellow"])
hook_root = empty("hook_root", (0.8, 3.0, 4.4))
add("cyl", "rope", (0.8, 3.0, 3.6), (0.012, 0.012, 0.8), M["steel"], hook_root)
add("torus", "hook", (0.8, 3.0, 2.75), (0.12, 0.12, 0.12), M["steel"], hook_root, rot=(math.pi / 2, 0, 0), major_radius=1, minor_radius=0.25)
# 鋼材の棚（右と左）
for side, x0 in ((-1, -3.4), (1, 3.0)):
    for lvl in range(4):
        add("cube", f"rack{side}{lvl}", (x0, 4.2, 0.4 + lvl * 0.7), (0.9, 0.5, 0.03), M["steel"])
        for k in range(5):
            add("cube", f"beam{side}{lvl}{k}", (x0 + (k - 2) * 0.32, 4.2, 0.48 + lvl * 0.7), (0.12, 0.45, 0.06), M["rust"] if (k + lvl) % 2 else M["steel"])
    for px in (-0.85, 0.85):
        add("cube", f"post{side}{px}", (x0 + px, 4.2, 1.4), (0.04, 0.04, 1.4), M["steel"])
# 作業台
bench = empty("bench", (0.75, 0.15, 0))
add("cube", "bench_top", (0.75, 0.15, 0.62), (0.55, 0.28, 0.025), M["table"], bench)
for dx in (-0.5, 0.5):
    for dy in (-0.24, 0.24):
        add("cube", f"leg{dx}{dy}", (0.75 + dx, 0.15 + dy, 0.31), (0.025, 0.025, 0.31), M["table"], bench)
add("cube", "steel_bar", (0.75, 0.1, 0.68), (0.5, 0.05, 0.04), M["steel"], bench)
tape = add("cube", "tape", (0.35, 0.05, 0.7), (0.05, 0.03, 0.05), M["yellow"], bench)


# ---------- キャラ ----------
def make_dog(name, loc, kind):
    root = empty(f"{name}_root", loc)
    body_m = M["orange"] if kind == "shuna" else M["grey"]
    head_m = M["black"] if kind == "shuna" else M["shiba"]
    face_m = M["silver"] if kind == "shuna" else M["cream"]
    x, y, z = loc
    hips = empty(f"{name}_hips", (x, y, z + 0.3), root)
    J = {"root": root, "hips": hips}
    for s, lx in (("L", 0.08), ("R", -0.08)):
        leg = empty(f"{name}_leg{s}", (x + lx, y, z + 0.27), hips)
        add("sphere", f"{name}_thigh{s}", (x + lx, y, z + 0.16), (0.065, 0.065, 0.12), M["navy"] if kind == "shuna" else M["grey"], leg)
        add("sphere", f"{name}_foot{s}", (x + lx, y - 0.03, z + 0.035), (0.07, 0.09, 0.04), face_m, leg)
        J[f"leg{s}"] = leg
    chest = empty(f"{name}_chest", (x, y, z + 0.32), hips)
    J["chest"] = chest
    add("sphere", f"{name}_torso", (x, y, z + 0.45), (0.2, 0.16, 0.2), body_m, chest)
    if kind == "shuna":
        for zz in (0.39, 0.47):
            add("torus", f"{name}_stripe{zz}", (x, y, z + zz), (0.198, 0.158, 0.02), M["white"], chest, major_radius=1, minor_radius=0.12)
    else:
        add("sphere", f"{name}_pocket", (x + 0.07, y - 0.15, z + 0.52), (0.04, 0.01, 0.03), M["grey"], chest)
    add("torus", f"{name}_towel", (x, y, z + 0.62), (0.13, 0.12, 0.05), M["white"] if kind == "shuna" else M["grey"], chest, major_radius=1, minor_radius=0.35)
    for s, ax in (("L", 0.21), ("R", -0.21)):
        arm = empty(f"{name}_arm{s}", (x + ax, y, z + 0.57), chest)
        add("sphere", f"{name}_sleeve{s}", (x + ax * 1.05, y, z + 0.45), (0.055, 0.055, 0.13), M["navy"] if kind == "shuna" else M["grey"], arm)
        add("sphere", f"{name}_paw{s}", (x + ax * 1.08, y - 0.01, z + 0.32), (0.055, 0.055, 0.05), face_m, arm)
        if kind == "kantoku" and s == "L":
            add("torus", f"{name}_armband", (x + ax * 1.05, y, z + 0.5), (0.06, 0.06, 0.03), M["yellow"], arm, major_radius=1, minor_radius=0.25)
        J[f"arm{s}"] = arm
    if kind == "kantoku":  # クリップボード（右手）
        add("cube", f"{name}_board", (x - 0.24, y - 0.08, z + 0.36), (0.015, 0.09, 0.12), M["board"], J["armR"])
        add("cube", f"{name}_paper", (x - 0.255, y - 0.08, z + 0.37), (0.004, 0.08, 0.1), M["paper"], J["armR"])
        tail = add("torus", f"{name}_tail", (x, y + 0.17, z + 0.42), (0.07, 0.07, 0.07), M["shiba"], hips, rot=(math.pi / 2, 0, 0), major_radius=1, minor_radius=0.45)
    head = empty(f"{name}_head", (x, y, z + 0.66), chest)
    J["head"] = head
    hz = z + 0.86
    add("sphere", f"{name}_skull", (x, y, hz), (0.22, 0.2, 0.2), head_m, head)
    add("sphere", f"{name}_muzzle", (x, y - 0.16, hz - 0.06), (0.12, 0.09, 0.075), face_m, head)
    jaw = empty(f"{name}_jaw", (x, y - 0.1, hz - 0.1), head)
    J["jaw"] = jaw
    if kind == "shuna":
        add("sphere", f"{name}_beard", (x, y - 0.15, hz - 0.15), (0.11, 0.085, 0.085), face_m, jaw)
        for s, ex in (("L", 0.075), ("R", -0.075)):
            add("sphere", f"{name}_brow{s}", (x + ex, y - 0.175, hz + 0.065), (0.055, 0.03, 0.022), M["silver"], head, rot=(0, (0.25 if s == "L" else -0.25), 0))
            add("sphere", f"{name}_ear{s}", (x + ex * 2.7, y - 0.01, hz - 0.03), (0.055, 0.03, 0.11), M["black"], head, rot=(0, (-0.35 if s == "L" else 0.35), 0))
    else:
        add("sphere", f"{name}_chin", (x, y - 0.13, hz - 0.13), (0.08, 0.065, 0.05), M["cream"], jaw)
        for s, ex in (("L", 0.12), ("R", -0.12)):
            add("cone", f"{name}_ear{s}", (x + ex, y + 0.0, hz + 0.19), (0.06, 0.035, 0.09), M["shiba"], head, rot=(0, (-0.35 if s == "L" else 0.35), 0))
            add("sphere", f"{name}_cheek{s}", (x + ex * 0.9, y - 0.12, hz - 0.03), (0.07, 0.05, 0.05), M["cream"], head)
    add("sphere", f"{name}_nose", (x, y - 0.25, hz - 0.04), (0.035, 0.025, 0.025), M["nose"], head)
    for s, ex in (("L", 0.075), ("R", -0.075)):
        add("sphere", f"{name}_eye{s}", (x + ex, y - 0.175, hz + 0.02), (0.03, 0.02, 0.034), M["eye"], head)
        add("sphere", f"{name}_shine{s}", (x + ex + 0.01, y - 0.195, hz + 0.035), (0.008, 0.004, 0.008), M["shine"], head)
    hemisphere(f"{name}_helmet", (x, y, hz + 0.06), 0.235, M["yellow"] if kind == "shuna" else M["helmet_w"], head)
    add("cyl", f"{name}_brim", (x, y - 0.02, hz + 0.06), (0.25, 0.25, 0.012), M["yellow"] if kind == "shuna" else M["helmet_w"], head)
    return J


shuna = make_dog("shuna", (0.75, 0.55, 0), "shuna")
kan = make_dog("kan", (0, 0, 0), "kantoku")


# ---------- 動き ----------
REST = {}


def key(o, f, loc=None, rot=None, dloc=None):
    if o.name not in REST:
        REST[o.name] = o.location.copy()
    if dloc is not None:
        o.location = REST[o.name] + Vector(dloc)
        o.keyframe_insert("location", frame=f)
    if loc is not None:
        o.location = loc
        o.keyframe_insert("location", frame=f)
    if rot is not None:
        o.rotation_euler = rot
        o.keyframe_insert("rotation_euler", frame=f)


WALK_END = 120
TALK1 = (130, 200)  # 監督が話す
TURN = 150  # 黒シュナが振り向く
for f in range(1, FRAMES + 1, 2):
    t = f / FPS
    # 監督：左から歩いてきて、作業台の手前で止まる
    p = min(1.0, f / WALK_END)
    walking = f < WALK_END
    ph = t * 2 * math.pi * 1.6
    x = -2.6 + 2.2 * (1 - (1 - p) ** 2)
    key(kan["root"], f, loc=(x, -0.05 + 0.0, 0), rot=(0, 0, (-1.2 if walking else -0.55 + 0.05 * math.sin(t))))
    key(kan["hips"], f, dloc=(0, 0, (abs(math.sin(ph)) * 0.025 if walking else 0)))
    swing = math.sin(ph) * (0.6 if walking else 0)
    key(kan["legL"], f, rot=(swing, 0, 0))
    key(kan["legR"], f, rot=(-swing, 0, 0))
    key(kan["armL"], f, rot=(-swing * 0.8, 0, 0))
    key(kan["armR"], f, rot=(swing * 0.5 - (0.0 if walking else 0.5), 0, 0))
    talk = TALK1[0] <= f <= TALK1[1]
    key(kan["jaw"], f, rot=((0.25 * abs(math.sin(t * 14)) if talk else 0), 0, 0))
    key(kan["head"], f, rot=((0.06 * math.sin(t * 7) if talk else 0.03 * math.sin(t * 1.3)), 0, 0.05 * math.sin(t * 0.8)))
    # 黒シュナ：作業台で測る（右腕を左右に動かす）→ 振り向く
    working = f < TURN
    key(shuna["armR"], f, rot=((-1.1 + 0.15 * math.sin(t * 3)) if working else -0.2, 0, (0.5 * math.sin(t * 2.2) if working else 0)))
    key(shuna["armL"], f, rot=((-1.0 if working else -0.1), 0, 0))
    turn = min(1.0, max(0.0, (f - TURN) / 15))
    key(shuna["head"], f, rot=((0.35 if working else 0.05) * (1 - turn) + 0.05 * turn, 0, -0.9 * turn + 0.05 * math.sin(t)))
    key(shuna["chest"], f, rot=(0, 0, -0.35 * turn))
    key(shuna["hips"], f, dloc=(0, 0, 0.006 * math.sin(t * 2)))
    # クレーンのフックがゆっくり揺れる
    key(bpy.data.objects["hook_root"], f, rot=(0.04 * math.sin(t * 1.1), 0.03 * math.sin(t * 0.7), 0))

# ---------- 光とカメラ ----------
sun = bpy.data.lights.new("sun", "SUN")
sun.energy = 4.5
sun.color = (1.0, 0.86, 0.65)
sun_o = bpy.data.objects.new("sun", sun)
scene.collection.objects.link(sun_o)
sun_o.rotation_euler = (math.radians(50), 0, math.radians(-35))
fill = bpy.data.lights.new("fill", "AREA")
fill.energy = 350
fill.size = 4
fill.color = (0.85, 0.9, 1.0)
fill_o = bpy.data.objects.new("fill", fill)
scene.collection.objects.link(fill_o)
fill_o.location = (0, -3.5, 3)
fill_o.rotation_euler = (math.radians(55), 0, 0)
world = bpy.data.worlds.new("world")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.28, 0.22, 0.16, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.9
vol = world.node_tree.nodes.new("ShaderNodeVolumePrincipled")
vol.inputs["Density"].default_value = 0.006
vol.inputs["Color"].default_value = (1.0, 0.9, 0.75, 1)
world.node_tree.links.new(vol.outputs["Volume"], world.node_tree.nodes["World Output"].inputs["Volume"])
cam = bpy.data.cameras.new("cam")
cam.lens = 38
cam.dof.use_dof = True
cam.dof.aperture_fstop = 2.8
cam_o = bpy.data.objects.new("cam", cam)
scene.collection.objects.link(cam_o)
scene.camera = cam_o
target = empty("target", (0.2, 0.4, 0.6))
cam.dof.focus_object = target
tc = cam_o.constraints.new("TRACK_TO")
tc.target = target
tc.track_axis = "TRACK_NEGATIVE_Z"
tc.up_axis = "UP_Y"
key(cam_o, 1, loc=(-0.6, -3.6, 1.25))
key(cam_o, FRAMES, loc=(0.3, -2.8, 1.05))
key(target, 1, loc=(-0.3, 0.4, 0.6))
key(target, FRAMES, loc=(0.35, 0.4, 0.6))

for lk in ("AgX - Medium High Contrast", "AgX - Punchy", "Medium High Contrast"):
    try:
        scene.view_settings.look = lk
        break
    except Exception:
        pass
# 窓の外から差し込む光（スポットで光の筋を作る）
for i, x in enumerate((-1.2, 1.2)):
    sp = bpy.data.lights.new(f"beam{i}", "SPOT")
    sp.energy = 2500
    sp.color = (1.0, 0.8, 0.5)
    sp.spot_size = math.radians(35)
    sp.spot_blend = 0.6
    so = bpy.data.objects.new(f"beam{i}", sp)
    scene.collection.objects.link(so)
    so.location = (x - 1.0, 7.5, 4.6)
    so.rotation_euler = (math.radians(-60), math.radians(-12), 0)

# ---------- 書き出し ----------
if MODE == "still":
    scene.frame_set(int(args[1]))
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = args[2]
    bpy.ops.render.render(write_still=True)
else:
    # Blender 5 では動画の直接書き出しの設定が変わったため、PNGの連番で書き出し、あとで ffmpeg で動画にする
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = args[1].rstrip("/\\") + "/f_####"
    bpy.ops.render.render(animation=True)
