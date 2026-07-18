"""Ultra-realistic silicone spatula — procedural Blender generator.

Builds a premium silicone-head spatula (deep-red paddle, brushed stainless
handle) entirely from Python: parametric geometry, procedural PBR materials,
studio three-point lighting, and a Cycles render.

Usage:
    python generate_spatula.py -- --out render.png --res 1600 1200 \
        --samples 128 [--blend out.blend] [--glb out.glb]
"""

import argparse
import math
import sys

import bpy
import bmesh
from mathutils import Vector

MM = 0.001  # millimetres → metres


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def smoothstep(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def set_input(node, names, value):
    """Set a node input by trying several possible socket names."""
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return True
    return False


def new_object(name, bm, collection):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    collection.objects.link(obj)
    for p in me.polygons:
        p.use_smooth = True
    return obj


# ---------------------------------------------------------------------------
# silicone head: paddle + neck in ONE mesh so shading blends across the joint
# ---------------------------------------------------------------------------

def paddle_outline(theta):
    """Star-shaped paddle outline: straighter right edge, rounder left,
    rounded tip, soft shoulders toward the neck.  ~60 x 122 mm overall,
    with sub-mm molded edge waviness.  Returns (x, y) in mm."""
    c, s = math.cos(theta), math.sin(theta)
    a = lerp(31.0, 29.0, smoothstep(-0.25, 0.25, c))   # left → right
    b = lerp(70.0, 52.0, smoothstep(-0.25, 0.25, s))   # front(tip) → back
    wR = max(c, 0.0) ** 2
    wL = max(-c, 0.0) ** 2
    wB = max(s, 0.0) ** 2
    wF = max(-s, 0.0) ** 2
    n = (wR * 4.2 + wL * 2.6 + wB * 2.2 + wF * 3.0) / (wR + wL + wB + wF)
    r = ((abs(c) / a) ** n + (abs(s) / b) ** n) ** (-1.0 / n)
    r *= 1.0 + 0.003 * math.sin(7 * theta + 1.3) + 0.002 * math.sin(13 * theta)
    return r * c, r * s


def paddle_top(s_radial):
    """Working face: a smooth, gently dished bowl (rim at 0, centre -2 mm).
    All stiffening thickness goes to the underside, like a real molded head."""
    return -2.0 * (1.0 - s_radial ** 2)


def paddle_thickness(x, y, s_radial):
    """Thickness (mm): thin flexible front lip, sturdier shoulders, and an
    underside centre spine that grows toward the neck."""
    t_edge = lerp(0.9, 2.2, smoothstep(-45.0, 10.0, y))
    ramp = smoothstep(-55.0, 40.0, y)
    t_center = lerp(3.2, 7.2, ramp)
    rib_w = lerp(8.0, 11.0, ramp)
    g = math.exp(-(x / rib_w) ** 2)
    edge_fade = 1.0 - smoothstep(0.72, 1.0, s_radial)
    return t_edge + (t_center - t_edge) * g * edge_fade


def add_paddle(bm):
    N, M = 256, 48

    def surf_vert(i, j, top_side):
        theta = 2 * math.pi * j / N
        bx, by = paddle_outline(theta)
        s = i / M
        x, y = bx * s, by * s
        zt = paddle_top(s)
        z = zt if top_side else zt - paddle_thickness(x, y, s)
        return bm.verts.new((x * MM, y * MM, z * MM))

    outer = {}
    for top_side in (True, False):
        z0 = paddle_top(0.0) - (0.0 if top_side else paddle_thickness(0, 0, 0))
        pole = bm.verts.new((0.0, 0.0, z0 * MM))
        rings = [[surf_vert(i, j, top_side) for j in range(N)]
                 for i in range(1, M + 1)]
        for j in range(N):
            a, b = rings[0][j], rings[0][(j + 1) % N]
            bm.faces.new((pole, a, b) if top_side else (pole, b, a))
        for i in range(M - 1):
            for j in range(N):
                v1, v2 = rings[i][j], rings[i][(j + 1) % N]
                v3, v4 = rings[i + 1][(j + 1) % N], rings[i + 1][j]
                bm.faces.new((v1, v2, v3, v4) if top_side
                             else (v4, v3, v2, v1))
        outer[top_side] = rings[M - 1]

    for j in range(N):
        bm.faces.new((outer[True][j], outer[False][j],
                      outer[False][(j + 1) % N], outer[True][(j + 1) % N]))


def superellipse_ring(bm, y_mm, wx_mm, wz_mm, n, zc_mm=0.0, segs=64):
    ring = []
    for k in range(segs):
        t = 2 * math.pi * k / segs
        c, s = math.cos(t), math.sin(t)
        x = wx_mm * (abs(c) ** (2.0 / n)) * (1 if c >= 0 else -1)
        z = wz_mm * (abs(s) ** (2.0 / n)) * (1 if s >= 0 else -1)
        ring.append(bm.verts.new((x * MM, y_mm * MM, (z + zc_mm) * MM)))
    return ring


def loft(bm, rings, cap_start=True, cap_end=True):
    for i in range(len(rings) - 1):
        r1, r2 = rings[i], rings[i + 1]
        for j in range(len(r1)):
            bm.faces.new((r1[j], r1[(j + 1) % len(r1)],
                          r2[(j + 1) % len(r2)], r2[j]))
    for ring, first in ((rings[0], True), (rings[-1], False)):
        if (first and not cap_start) or (not first and not cap_end):
            continue
        center = Vector((0, 0, 0))
        for v in ring:
            center += v.co
        center /= len(ring)
        cv = bm.verts.new(center)
        for j in range(len(ring)):
            a, b = ring[j], ring[(j + 1) % len(ring)]
            bm.faces.new((cv, a, b) if first else (cv, b, a))


def add_neck(bm):
    """Monotonic silicone neck: starts buried in the paddle spine, rises to
    the handle axis, and ends in a crisp overmold collar with a square
    shoulder that wraps the front of the steel tube."""
    ys = [32, 40, 48, 56, 64, 72, 80, 88, 94, 99, 103, 107, 110, 112]
    wxs = [16.5, 14.6, 13.2, 12.4, 11.9, 11.6, 11.5, 11.5,
           11.7, 12.2, 13.0, 13.4, 13.4, 13.4]
    wzs = [2.6, 3.4, 4.2, 5.0, 5.8, 6.6, 7.3, 8.0,
           8.6, 9.2, 9.8, 10.2, 10.2, 10.2]
    # collar cross-section is squarer than the tube
    ns = [2.8] * 11 + [4.0, 4.0, 4.0]
    # ring centres: follow the paddle spine mid-thickness, then level out
    zcs = [-4.6, -4.2, -3.2, -2.2, -1.4, -0.7, -0.3, -0.1,
           0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    rings = [superellipse_ring(bm, y, wx, wz, n, zc)
             for y, wx, wz, n, zc in zip(ys, wxs, wzs, ns, zcs)]
    loft(bm, rings)


def build_head(collection):
    bm = bmesh.new()
    add_paddle(bm)
    add_neck(bm)
    return new_object("HeadSilicone", bm, collection)


# ---------------------------------------------------------------------------
# handle (brushed steel)
# ---------------------------------------------------------------------------

def build_handle(collection):
    """Brushed stainless oval tube: subtle barrel swell where the palm sits,
    a scored seam groove before the domed end cap, and a hanging hole."""
    bm = bmesh.new()
    WX, WZ, N_EXP = 11.0, 7.8, 2.3
    profile = [
        (100, 1.00), (115, 1.00), (140, 1.02), (170, 1.05), (200, 1.07),
        (230, 1.07), (260, 1.05), (285, 1.00), (305, 0.96), (314, 0.94),
        (316, 0.94), (317.2, 0.923), (318, 0.94),   # cap seam V-groove
    ]
    rings = [superellipse_ring(bm, y, WX * m, WZ * m, N_EXP)
             for y, m in profile]
    R, CAP = 11.3, 0.94
    for phi in [0.25, 0.45, 0.65, 0.82, 0.94]:
        ang = phi * math.pi / 2
        scale = CAP * math.cos(ang)
        rings.append(superellipse_ring(bm, 318 + R * math.sin(ang),
                                       WX * scale, WZ * scale, N_EXP))
    loft(bm, rings, cap_start=True, cap_end=True)
    obj = new_object("HandleSteel", bm, collection)

    # hanging hole through the flat of the handle
    bpy.ops.mesh.primitive_cylinder_add(
        radius=3.2 * MM, depth=40 * MM, vertices=48,
        location=(0, 297 * MM, 0))
    cut = bpy.context.active_object
    cut.name = "HoleCutter"
    mod = obj.modifiers.new("Hole", 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cut
    try:
        mod.solver = 'EXACT'
    except Exception:
        pass
    cut.hide_render = True
    cut.hide_viewport = True
    return obj


# ---------------------------------------------------------------------------
# materials
# ---------------------------------------------------------------------------

def make_silicone_material():
    mat = bpy.data.materials.new("Silicone")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]

    set_input(bsdf, ["Base Color"], (0.24, 0.010, 0.010, 1.0))  # chili red
    set_input(bsdf, ["Subsurface Weight", "Subsurface"], 0.12)
    set_input(bsdf, ["Subsurface Radius"], (0.006, 0.0012, 0.001))
    set_input(bsdf, ["Subsurface Scale"], 1.0)
    set_input(bsdf, ["Sheen Weight", "Sheen"], 0.18)
    set_input(bsdf, ["Sheen Roughness"], 0.3)
    set_input(bsdf, ["Specular IOR Level", "Specular"], 0.25)

    # shared object-space coordinates so grain is consistent in world mm
    coord = nt.nodes.new("ShaderNodeTexCoord")

    # matte mottle on roughness
    noise_s = nt.nodes.new("ShaderNodeTexNoise")
    noise_s.inputs["Scale"].default_value = 9.0
    noise_s.inputs["Detail"].default_value = 4.0
    nt.links.new(coord.outputs["Object"], noise_s.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = 0.35
    ramp.inputs["From Max"].default_value = 0.65
    ramp.inputs["To Min"].default_value = 0.52
    ramp.inputs["To Max"].default_value = 0.70
    nt.links.new(noise_s.outputs["Fac"], ramp.inputs["Value"])

    # sparse dust specks: lighten color and dull roughness where they land
    voro = nt.nodes.new("ShaderNodeTexVoronoi")
    voro.inputs["Scale"].default_value = 1800.0
    nt.links.new(coord.outputs["Object"], voro.inputs["Vector"])
    dust = nt.nodes.new("ShaderNodeMath")
    dust.operation = 'LESS_THAN'
    dust.inputs[1].default_value = 0.025
    nt.links.new(voro.outputs["Distance"], dust.inputs[0])
    dust_amt = nt.nodes.new("ShaderNodeMath")
    dust_amt.operation = 'MULTIPLY'
    dust_amt.inputs[1].default_value = 0.5
    nt.links.new(dust.outputs["Value"], dust_amt.inputs[0])
    mix_col = nt.nodes.new("ShaderNodeMix")
    mix_col.data_type = 'RGBA'
    mix_col.inputs["B"].default_value = (0.65, 0.62, 0.60, 1.0)
    mix_col.inputs["A"].default_value = (0.24, 0.010, 0.010, 1.0)
    nt.links.new(dust_amt.outputs["Value"], mix_col.inputs["Factor"])
    nt.links.new(mix_col.outputs["Result"], bsdf.inputs["Base Color"])
    dust_rough = nt.nodes.new("ShaderNodeMath")
    dust_rough.operation = 'MULTIPLY_ADD'
    dust_rough.inputs[1].default_value = 0.2
    nt.links.new(dust.outputs["Value"], dust_rough.inputs[0])
    nt.links.new(ramp.outputs["Result"], dust_rough.inputs[2])
    nt.links.new(dust_rough.outputs["Value"], bsdf.inputs["Roughness"])

    # satin micro grain + shader-level edge rounding across the whole head
    noise_b = nt.nodes.new("ShaderNodeTexNoise")
    noise_b.inputs["Scale"].default_value = 350.0
    noise_b.inputs["Detail"].default_value = 4.0
    nt.links.new(coord.outputs["Object"], noise_b.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.3
    bump.inputs["Distance"].default_value = 0.0002
    bevel = nt.nodes.new("ShaderNodeBevel")
    bevel.inputs["Radius"].default_value = 0.0015
    bevel.samples = 12
    nt.links.new(noise_b.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bevel.outputs["Normal"], bump.inputs["Normal"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def make_steel_material():
    mat = bpy.data.materials.new("BrushedSteel")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]

    set_input(bsdf, ["Base Color"], (0.58, 0.575, 0.56, 1.0))
    set_input(bsdf, ["Metallic"], 1.0)
    set_input(bsdf, ["Anisotropic"], 0.6)

    # lengthwise brushing → highlight smears around the circumference
    tangent = nt.nodes.new("ShaderNodeTangent")
    tangent.direction_type = 'RADIAL'
    tangent.axis = 'Y'
    nt.links.new(tangent.outputs["Tangent"], bsdf.inputs["Tangent"])

    # brushing: noise stretched hard along the handle axis (Y)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (220.0, 1.5, 220.0)
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1.0
    noise.inputs["Detail"].default_value = 6.0
    noise.inputs["Roughness"].default_value = 0.7
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])

    rough = nt.nodes.new("ShaderNodeMapRange")
    rough.inputs["From Min"].default_value = 0.3
    rough.inputs["From Max"].default_value = 0.7
    rough.inputs["To Min"].default_value = 0.26
    rough.inputs["To Max"].default_value = 0.46
    nt.links.new(noise.outputs["Fac"], rough.inputs["Value"])

    # blotchy handling smudges: dull the streak and darken slightly
    smudge = nt.nodes.new("ShaderNodeTexNoise")
    smudge.inputs["Scale"].default_value = 6.0
    smudge.inputs["Detail"].default_value = 8.0
    nt.links.new(coord.outputs["Object"], smudge.inputs["Vector"])
    smudge_ramp = nt.nodes.new("ShaderNodeMapRange")
    smudge_ramp.inputs["From Min"].default_value = 0.55
    smudge_ramp.inputs["From Max"].default_value = 0.75
    smudge_ramp.inputs["To Min"].default_value = 0.0
    smudge_ramp.inputs["To Max"].default_value = 0.20
    nt.links.new(smudge.outputs["Fac"], smudge_ramp.inputs["Value"])
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = 'ADD'
    nt.links.new(rough.outputs["Result"], add.inputs[0])
    nt.links.new(smudge_ramp.outputs["Result"], add.inputs[1])
    nt.links.new(add.outputs["Value"], bsdf.inputs["Roughness"])
    mix_col = nt.nodes.new("ShaderNodeMix")
    mix_col.data_type = 'RGBA'
    mix_col.inputs["Factor"].default_value = 0.0
    mix_col.inputs["A"].default_value = (0.58, 0.575, 0.56, 1.0)
    mix_col.inputs["B"].default_value = (0.45, 0.45, 0.45, 1.0)
    fac = nt.nodes.new("ShaderNodeMath")
    fac.operation = 'MULTIPLY'
    fac.inputs[1].default_value = 0.25
    nt.links.new(smudge_ramp.outputs["Result"], fac.inputs[0])
    nt.links.new(fac.outputs["Value"], mix_col.inputs["Factor"])
    nt.links.new(mix_col.outputs["Result"], bsdf.inputs["Base Color"])

    # brushing grooves as bump + rounded edges
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.25
    bump.inputs["Distance"].default_value = 0.0001
    bevel = nt.nodes.new("ShaderNodeBevel")
    bevel.inputs["Radius"].default_value = 0.0008
    bevel.samples = 8
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bevel.outputs["Normal"], bump.inputs["Normal"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def make_floor_material():
    mat = bpy.data.materials.new("StudioFloor")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    set_input(bsdf, ["Base Color"], (0.55, 0.55, 0.56, 1.0))
    set_input(bsdf, ["Specular IOR Level", "Specular"], 0.5)
    # mottled roughness + faint sweep texture under raking light
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 14.0
    noise.inputs["Detail"].default_value = 6.0
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = 0.3
    ramp.inputs["From Max"].default_value = 0.7
    ramp.inputs["To Min"].default_value = 0.18
    ramp.inputs["To Max"].default_value = 0.32
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Value"])
    nt.links.new(ramp.outputs["Result"], bsdf.inputs["Roughness"])
    tex = nt.nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = 40.0
    tex.inputs["Detail"].default_value = 8.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.0001
    nt.links.new(tex.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


# ---------------------------------------------------------------------------
# scene: floor, lights, camera, world
# ---------------------------------------------------------------------------

def build_scene(spatula_parts):
    scene = bpy.context.scene

    # ---- lay the spatula down naturally -----------------------------------
    root = bpy.data.objects.new("SpatulaRoot", None)
    scene.collection.objects.link(root)
    for obj in spatula_parts:
        obj.parent = root
    # rest tilt: paddle belly and handle belly both touch the floor
    root.rotation_euler = (math.radians(-1.3), 0.0, math.radians(-38.0))
    bpy.context.view_layer.update()

    # drop so the lowest evaluated point presses gently into the floor
    deps = bpy.context.evaluated_depsgraph_get()
    min_z = 1e9
    for obj in spatula_parts:
        ev = obj.evaluated_get(deps)
        me = ev.to_mesh()
        mw = ev.matrix_world
        for v in me.vertices:
            min_z = min(min_z, (mw @ v.co).z)
        ev.to_mesh_clear()
    root.location.z = -min_z - 0.2 * MM
    bpy.context.view_layer.update()

    # ---- floor and backdrop: seamless studio sweep -------------------------
    bpy.ops.mesh.primitive_plane_add(size=4.0, location=(0, 0, 0))
    floor = bpy.context.active_object
    floor.name = "Floor"
    floor.data.materials.append(make_floor_material())

    bpy.ops.mesh.primitive_plane_add(size=4.0, location=(0, 2.2, 1.2),
                                     rotation=(math.radians(75), 0, 0))
    back = bpy.context.active_object
    back.name = "Backdrop"
    back.data.materials.append(bpy.data.materials["StudioFloor"])

    # negative-fill flag: dark card off-camera right so the steel has a
    # dark stripe to reflect and doesn't vanish against the white set
    flag_mat = bpy.data.materials.new("Flag")
    flag_mat.use_nodes = True
    fb = flag_mat.node_tree.nodes["Principled BSDF"]
    set_input(fb, ["Base Color"], (0.015, 0.015, 0.015, 1.0))
    set_input(fb, ["Roughness"], 0.9)
    bpy.ops.mesh.primitive_plane_add(
        size=1.0, location=(0.75, 0.3, 0.5),
        rotation=(math.radians(90), 0, math.radians(-70)))
    flag = bpy.context.active_object
    flag.name = "NegFillFlag"
    flag.scale = (2.6, 1.2, 1.0)
    flag.data.materials.append(flag_mat)
    flag.visible_camera = False  # reflections only — never in frame

    # ---- lights ------------------------------------------------------------
    def area_light(name, loc, rot, size, size_y, watts, color):
        data = bpy.data.lights.new(name, 'AREA')
        data.shape = 'RECTANGLE'
        data.size, data.size_y = size, size_y
        data.energy = watts
        data.color = color
        obj = bpy.data.objects.new(name, data)
        obj.location = loc
        obj.rotation_euler = rot
        scene.collection.objects.link(obj)
        return obj

    # key — soft box, upper left, raking so the paddle face gets a gradient
    area_light("Key", (-0.60, -0.35, 0.50),
               (math.radians(-42), math.radians(-30), math.radians(12)),
               0.6, 0.6, 80, (1.0, 0.975, 0.94))
    # fill — cooler, front-right, just enough to keep shadows from dying
    area_light("Fill", (0.62, -0.45, 0.35),
               (math.radians(-55), math.radians(48), 0),
               1.1, 1.1, 8, (0.88, 0.92, 1.0))
    # rim — behind-left, rakes the paddle tip so the thin edge glows (SSS)
    area_light("Rim", (-0.12, 0.68, 0.40),
               (math.radians(125), 0, math.radians(-8)),
               1.2, 0.25, 75, (1.0, 1.0, 1.0))
    # overhead strip — the long soft streak on the brushed steel
    area_light("Streak", (0.05, 0.15, 0.85),
               (0, 0, math.radians(52)),
               1.6, 0.32, 22, (1.0, 1.0, 1.0))

    # ---- world -------------------------------------------------------------
    world = bpy.data.worlds.new("Studio")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.8, 0.81, 0.83, 1.0)
    bg.inputs["Strength"].default_value = 0.08
    scene.world = world

    # ---- camera: low hero three-quarter ------------------------------------
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = 56.0
    cam_data.sensor_width = 36.0
    cam = bpy.data.objects.new("Camera", cam_data)
    cam.location = (-0.02, -0.44, 0.25)
    scene.collection.objects.link(cam)
    scene.camera = cam

    target = bpy.data.objects.new("CamTarget", None)
    target.location = (0.07, 0.03, 0.008)
    scene.collection.objects.link(target)
    con = cam.constraints.new('TRACK_TO')
    con.target = target
    con.track_axis = 'TRACK_NEGATIVE_Z'
    con.up_axis = 'UP_Y'

    # focus on the paddle/neck junction, independent of the framing target
    focus = bpy.data.objects.new("FocusTarget", None)
    focus.location = (0.025, 0.032, 0.006)
    scene.collection.objects.link(focus)
    cam_data.dof.use_dof = True
    cam_data.dof.focus_object = focus
    cam_data.dof.aperture_fstop = 6.3
    cam_data.dof.aperture_blades = 9
    cam_data.dof.aperture_rotation = 0.2


# ---------------------------------------------------------------------------
# render settings
# ---------------------------------------------------------------------------

def setup_render(res_x, res_y, samples):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.015
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    scene.cycles.max_bounces = 8
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'

    # Khronos PBR Neutral keeps saturated product colors faithful where
    # AgX would wash them toward pastel; fall back to AgX if unavailable.
    try:
        scene.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception:
        scene.view_settings.view_transform = 'AgX'
        scene.view_settings.look = 'AgX - Punchy'
    scene.view_settings.exposure = -0.35


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--res", nargs=2, type=int, default=[1280, 960])
    ap.add_argument("--samples", type=int, default=128)
    ap.add_argument("--blend", default=None)
    ap.add_argument("--glb", default=None)
    args = ap.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    coll = scene.collection

    head = build_head(coll)
    handle = build_handle(coll)

    head.data.materials.append(make_silicone_material())
    handle.data.materials.append(make_steel_material())

    build_scene([head, handle])
    setup_render(args.res[0], args.res[1], args.samples)

    if args.blend:
        bpy.ops.wm.save_as_mainfile(filepath=args.blend)

    scene.render.filepath = args.out
    bpy.ops.render.render(write_still=True)
    print("RENDER DONE:", args.out)

    if args.glb:
        for obj in list(bpy.data.objects):
            obj.select_set(obj.name in {"HeadSilicone", "HandleSteel"})
        try:
            bpy.ops.export_scene.gltf(filepath=args.glb, export_format='GLB',
                                      use_selection=True, export_apply=True)
        except TypeError:
            bpy.ops.export_scene.gltf(filepath=args.glb, export_format='GLB',
                                      export_apply=True)
        print("GLB DONE:", args.glb)


if __name__ == "__main__":
    main()
