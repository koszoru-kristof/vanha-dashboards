#!/usr/bin/env python3
"""
Derive data/floorplan.json from the estate-agent PDF floorplan.

Source: input/esite_1393807_A4_versio_2_*.pdf, page 5 (the floorplan page).
The floorplan on that page is an embedded 800x600 JPEG (not vector), so all
geometry below was traced from that raster: wall pixels were isolated by colour
(the dark green fill), then decomposed into axis-aligned rectangles and verified
with scanline runs. Every constant in PX_* is a pixel coordinate in that
800x600 image; nothing here is eyeballed from a screenshot.

Scale is calibrated from the listing's stated living area of 45.5 m2. That is
the area per the articles of association, which by local convention is measured
to the inner faces of the apartment's enclosing walls and includes interior
partitions.

The plan carries a printed disclaimer to the effect of "indicative, not to
scale", so treat everything here as +/- a few centimetres.

Run:  python3 tools/derive_floorplan.py
"""
import json
import math
from pathlib import Path

# --- calibration -----------------------------------------------------------
# Interior extent, inner faces of the enclosing walls, in source pixels.
INNER_X = (255, 543)   # 288 px
INNER_Y = (160, 476)   # 316 px
# A ~7 px deep service shaft eats into the interior along the west wall in the
# bathroom/sauna strip; subtract it before solving for scale.
SHAFT_PX = 7 * 72
LIVING_AREA_M2 = 45.5

interior_px2 = (INNER_X[1] - INNER_X[0]) * (INNER_Y[1] - INNER_Y[0]) - SHAFT_PX
S = math.sqrt(LIVING_AREA_M2 / interior_px2)   # metres per pixel
OX, OY = INNER_X[0], INNER_Y[0]                # world origin = interior SE corner

CEILING = 2.50      # not given in the listing; typical for a 1997 Finnish block
DOOR_HEAD = 2.05
SAUNA_DOOR_HEAD = 1.90
BALCONY_DOOR_HEAD = 2.10
WIN_SILL, WIN_HEAD = 0.80, 2.20


def x(px):
    return round((px - OX) * S, 4)


def z(py):
    return round((py - OY) * S, 4)


def d(px):
    return round(px * S, 4)


# --- walls -----------------------------------------------------------------
# (id, kind, px rect x0,y0,x1,y1, axis, [openings])
# An opening is (id, type, a0_px, a1_px, sill, head, hinge, swing) where a0/a1
# are pixel coordinates along `axis` (absolute, same frame as the rect).
# hinge is "from"/"to"/None and swing is +1/-1 along the wall's cross axis;
# both are read off the door-swing arcs drawn on the plan.
PX_WALLS = [
    # exterior. Top of the plan is SOUTH: the listing states the windows and the
    # balcony both face south, and they are all drawn on the top wall.
    ("ext_south", "exterior", 240, 145, 559, 160, "x", [
        ("balcony_door", "door",   290, 322, 0.0, BALCONY_DOOR_HEAD, "from", +1),
        ("living_window", "window", 324, 407, WIN_SILL, WIN_HEAD, None, 0),
        ("bedroom_window", "window", 445, 522, WIN_SILL, WIN_HEAD, None, 0),
    ]),
    ("ext_north", "exterior", 246, 476, 553, 487, "x", [
        ("front_door", "door", 289, 327, 0.0, DOOR_HEAD, "from", +1),   # opens to the stair
    ]),
    ("ext_east_upper", "exterior", 240, 145, 255, 277, "z", []),
    ("ext_east_lower", "exterior", 246, 277, 255, 487, "z", []),
    ("ext_west_upper", "exterior", 543, 145, 559, 277, "z", []),
    ("ext_west_mid",   "exterior", 543, 277, 553, 400, "z", []),
    ("ext_west_lower", "exterior", 536, 400, 553, 477, "z", []),   # + service shaft

    # interior partitions
    ("living_bedroom", "interior", 417, 160, 422, 308, "z", [
        ("bedroom_door", "door", 267, 299, 0.0, DOOR_HEAD, "to", -1),
    ]),
    ("bedroom_south", "interior", 416, 303, 543, 308, "x", [
        ("wardrobe_door", "door", 484, 512, 0.0, DOOR_HEAD, "to", -1),
    ]),
    ("kitchen_pier", "interior", 449, 308, 480, 326, "x", []),
    ("wardrobe_kitchen", "interior", 475, 326, 480, 396, "z", []),
    ("hall_wet", "interior", 337, 366, 342, 487, "z", [
        ("bathroom_door", "door", 403, 435, 0.0, DOOR_HEAD, "from", -1),
    ]),
    ("bathroom_south", "interior", 337, 396, 553, 400, "x", []),
    ("bathroom_sauna", "interior", 479, 400, 486, 472, "z", [
        ("sauna_door", "door", 400, 429, 0.0, SAUNA_DOOR_HEAD, "to", -1),
    ]),
]

# --- rooms -----------------------------------------------------------------
# The drawing labels rooms with letter codes: OH = living room, MH = bedroom,
# K = kitchen, ET = hall, VH = walk-in wardrobe, KPH = bathroom.
PX_ROOMS = [
    ("living",   "Living room", "laminate",
     [(255, 160), (417, 160), (417, 310), (342, 310), (342, 366), (255, 366)]),
    ("kitchen",  "Kitchen", "laminate",
     [(342, 310), (449, 310), (449, 326), (475, 326), (475, 396), (342, 396)]),
    ("hall",     "Hall", "laminate",
     [(255, 366), (337, 366), (337, 476), (255, 476)]),
    ("bedroom",  "Bedroom", "laminate",
     [(422, 160), (543, 160), (543, 303), (422, 303)]),
    ("wardrobe", "Walk-in wardrobe", "laminate",
     [(480, 308), (543, 308), (543, 396), (480, 396)]),
    ("bathroom", "Bathroom", "tile",
     [(342, 400), (479, 400), (479, 476), (342, 476)]),
    ("sauna",    "Sauna", "tile",
     [(486, 400), (536, 400), (536, 472), (486, 472)]),
    ("balcony",  "Glazed balcony", "concrete",
     [(283, 20), (412, 20), (412, 145), (283, 145)]),
]

# --- fixtures --------------------------------------------------------------
# (id, room, kind, px rect, y0, y1, label)
PX_FIXTURES = [
    # Kitchen. Boxes here must only ever touch, never interpenetrate: two solids
    # sharing a volume give coplanar faces, and the depth test then flickers
    # between them as the camera moves. So the run is a strip of abutting units
    # (front face at py 368, back against the wall at py 394), the worktop sits
    # on top of the base cabinets rather than containing them, and the
    # integrated appliances are front panels standing just proud of the
    # cabinet faces -- which is also how they actually look.
    ("k_peninsula", "kitchen", "counter",   337, 310, 420, 342, 0.00, 0.90, "Dining / work surface"),
    ("k_fridge",    "kitchen", "appliance", 342, 368, 370, 394, 0.00, 1.85, "Fridge / freezer"),
    ("k_base",      "kitchen", "cabinet",   370, 368, 474, 394, 0.00, 0.86, "Base cabinets"),
    ("k_counter",   "kitchen", "counter",   370, 366, 474, 394, 0.86, 0.92, "Worktop"),
    ("k_dishwasher","kitchen", "appliance", 372, 365, 394, 368, 0.06, 0.84, "Dishwasher"),
    ("k_hob",       "kitchen", "appliance", 396, 370, 425, 392, 0.92, 0.95, "Ceramic hob"),
    ("k_sink",      "kitchen", "fixture",   428, 370, 450, 392, 0.92, 0.95, "Sink"),
    ("k_tall",      "kitchen", "cabinet",   452, 336, 474, 364, 0.00, 2.10, "Tall cabinet"),
    # Wall cabinets stop either side of the hood instead of enclosing it.
    ("k_wall_left", "kitchen", "cabinet",   370, 368, 396, 384, 1.45, 2.15, "Wall cabinets"),
    ("k_wall_right","kitchen", "cabinet",   425, 368, 474, 384, 1.45, 2.15, "Wall cabinets"),
    ("k_hood",      "kitchen", "appliance", 396, 368, 425, 386, 1.55, 1.80, "Extractor hood"),

    # bathroom
    ("b_washer",  "bathroom", "appliance", 342, 449, 366, 476, 0.00, 0.85, "Washing machine"),
    ("b_vanity",  "bathroom", "cabinet",   372, 456, 407, 476, 0.00, 0.82, "Vanity unit"),
    ("b_basin",   "bathroom", "fixture",   377, 439, 402, 458, 0.82, 0.92, "Washbasin"),
    ("b_wc",      "bathroom", "fixture",   415, 447, 434, 476, 0.00, 0.78, "Toilet"),
    ("b_shower",  "bathroom", "fixture",   438, 435, 477, 476, 0.00, 0.02, "Rain shower"),
    ("b_screen",  "bathroom", "glass",     436, 435, 438, 476, 0.00, 2.00, "Shower screen"),

    # sauna
    ("s_heater",     "sauna", "appliance", 519, 401, 536, 419, 0.00, 0.85, "Electric sauna heater"),
    ("s_bench_low",  "sauna", "bench",     487, 452, 536, 472, 0.00, 0.50, "Lower bench"),
    ("s_bench_high", "sauna", "bench",     487, 432, 536, 452, 0.00, 0.90, "Upper bench"),
    ("s_step",       "sauna", "bench",     489, 416, 512, 430, 0.00, 0.45, "Step"),

    # wardrobe
    ("vh_shelves", "wardrobe", "cabinet", 480, 368, 543, 396, 0.00, 2.10, "Shelving"),
    # Against the apartment's outer (west) wall — the opposite side would
    # sit in the doorway.
    ("vh_rail",    "wardrobe", "cabinet", 523, 308, 543, 368, 0.00, 2.10, "Hanging rail"),
]

# --- balcony ---------------------------------------------------------------
PX_BALCONY = dict(slab=(277, 14, 418, 145), parapet_px=6, parapet_h=1.00, glass_h=2.20)


def wall_json(wid, kind, x0, y0, x1, y1, axis, openings):
    out = {
        "id": wid, "kind": kind, "axis": axis,
        "x0": x(x0), "z0": z(y0), "x1": x(x1), "z1": z(y1),
        "height": CEILING,
        "thickness": d(y1 - y0) if axis == "x" else d(x1 - x0),
        "openings": [],
    }
    for oid, otype, a0, a1, sill, head, hinge, swing in openings:
        conv = x if axis == "x" else z
        out["openings"].append({
            "id": oid, "type": otype,
            "from": conv(a0), "to": conv(a1),
            "sill": sill, "head": head,
            "width": d(a1 - a0),
            "hinge": hinge, "swing": swing,
        })
    return out


def overlaps(a, b, eps=1e-6):
    """Volume shared by two axis-aligned boxes, as (dx, dy, dz) or None."""
    dx = min(a["x1"], b["x1"]) - max(a["x0"], b["x0"])
    dz = min(a["z1"], b["z1"]) - max(a["z0"], b["z0"])
    dy = min(a["y1"], b["y1"]) - max(a["y0"], b["y0"])
    if dx > eps and dy > eps and dz > eps:
        return (dx, dy, dz)
    return None


def check_solids(doc):
    """Interpenetrating solids z-fight at render time, so refuse to ship them.

    Touching is fine (back-to-back faces are culled); sharing a volume is not.
    """
    boxes = list(doc["fixtures"])
    for w in doc["walls"]:
        boxes.append({"id": f"wall:{w['id']}", "x0": min(w["x0"], w["x1"]),
                      "x1": max(w["x0"], w["x1"]), "z0": min(w["z0"], w["z1"]),
                      "z1": max(w["z0"], w["z1"]), "y0": 0.0, "y1": w["height"]})
    bad = []
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            a, b = boxes[i], boxes[j]
            if a["id"].startswith("wall:") and b["id"].startswith("wall:"):
                continue                      # walls are meant to knit together
            hit = overlaps(a, b, eps=0.002)   # ignore sub-2 mm slivers
            if hit:
                bad.append((a["id"], b["id"], hit))
    return bad


def poly_area(pts):
    a = 0.0
    for i in range(len(pts)):
        px0, py0 = pts[i]
        px1, py1 = pts[(i + 1) % len(pts)]
        a += px0 * py1 - px1 * py0
    return abs(a) / 2


def main():
    root = Path(__file__).resolve().parent.parent
    doc = {
        "meta": {
            "title": "2-room flat, Espoo",
            "description": "2 rooms + kitchenette + sauna, 45.5 m2, 3rd floor of 3, built 1997",
            "source": "input/esite_1393807_A4_versio_2_"
                      "1e6104372d85431e85e19d29455bb65a.pdf, page 5 (floorplan)",
            "sourceNote": "The plan is printed with an 'indicative, not to "
                          "scale' disclaimer. Geometry traced from the embedded "
                          "800x600 raster and scaled to the stated 45.5 m2.",
            "generatedBy": "tools/derive_floorplan.py",
        },
        "scale": {
            "metresPerSourcePixel": round(S, 6),
            "sourceImage": [800, 600],
            "originSourcePixel": [OX, OY],
        },
        # Plan is drawn with south at the top: the listing states that both the
        # window aspect and the balcony face south, and every window plus the
        # balcony sits on the top wall. So world -Z is south, +Z is north.
        "orientation": {"north": [0, 0, 1], "south": [0, 0, -1],
                        "east": [-1, 0, 0], "west": [1, 0, 0],
                        "note": "Plan drawn south-up; windows and balcony face south."},
        "dims": {
            "ceilingHeight": CEILING,
            "interiorWidth": d(INNER_X[1] - INNER_X[0]),
            "interiorDepth": d(INNER_Y[1] - INNER_Y[0]),
            "livingAreaM2": LIVING_AREA_M2,
        },
        "walls": [wall_json(*w) for w in PX_WALLS],
        "rooms": [],
        "fixtures": [],
        "balcony": {},
    }

    for rid, name, floor, poly in PX_ROOMS:
        doc["rooms"].append({
            "id": rid, "name": name, "floor": floor,
            "polygon": [[x(px), z(py)] for px, py in poly],
            "areaM2": round(poly_area(poly) * S * S, 2),
        })

    for fid, room, kind, x0, y0, x1, y1, ay0, ay1, label in PX_FIXTURES:
        doc["fixtures"].append({
            "id": fid, "room": room, "kind": kind, "label": label,
            "x0": x(x0), "z0": z(y0), "x1": x(x1), "z1": z(y1),
            "y0": ay0, "y1": ay1,
        })

    bx0, by0, bx1, by1 = PX_BALCONY["slab"]
    doc["balcony"] = {
        "x0": x(bx0), "z0": z(by0), "x1": x(bx1), "z1": z(by1),
        "parapetThickness": d(PX_BALCONY["parapet_px"]),
        "parapetHeight": PX_BALCONY["parapet_h"],
        "glassTop": PX_BALCONY["glass_h"],
        "openSide": "north",   # the side against the building
    }

    bad = check_solids(doc)
    if bad:
        print("REFUSING TO WRITE - interpenetrating solids would z-fight:")
        for first, second, (dx, dy, dz) in bad:
            print(f"    {first} <-> {second}   "
                  f"overlap {dx*1000:.0f} x {dy*1000:.0f} x {dz*1000:.0f} mm")
        raise SystemExit(1)

    out = root / "data" / "floorplan.json"
    out.write_text(json.dumps(doc, indent=2) + "\n")
    tot = sum(r["areaM2"] for r in doc["rooms"] if r["id"] != "balcony")
    print(f"wrote {out.relative_to(root)}")
    print(f"  scale            {S*1000:.3f} mm per source pixel")
    print(f"  interior         {doc['dims']['interiorWidth']} x {doc['dims']['interiorDepth']} m")
    print(f"  room floor area  {tot:.2f} m2 (+{LIVING_AREA_M2-tot:.2f} m2 of partitions "
          f"= {LIVING_AREA_M2} m2 stated living area)")
    for r in doc["rooms"]:
        print(f"    {r['id']:<9} {r['areaM2']:>6.2f} m2  {r['name']}")


if __name__ == "__main__":
    main()
