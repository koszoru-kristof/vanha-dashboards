/**
 * Turns data/floorplan.json into three.js geometry.
 *
 * Everything is built from the JSON — there are no magic coordinates in here.
 * Walls are extruded as a set of boxes rather than being CSG-subtracted: a wall
 * with openings becomes solid piers + lintels + sills, which is both cheaper
 * and easier to reason about than a boolean mesh.
 */
import * as THREE from 'three';

const OPEN_ANGLE = THREE.MathUtils.degToRad(82);

export function buildFlat(plan, { clippingPlanes = [] } = {}) {
  // Only thin/transparent things are clipped by the section plane. Solids
  // (walls, fixtures) are shortened by setCut() instead: three.js does not cap
  // a clipped mesh, so clipping a box just opens it up and the wall reads as a
  // paper-thin shell with the odd perpendicular face showing through.
  const clip = { clippingPlanes, clipShadows: true };

  const mat = {
    wallInt:  new THREE.MeshStandardMaterial({ color: 0xece7de, roughness: 0.96 }),
    wallExt:  new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.96 }),
    laminate: new THREE.MeshStandardMaterial({ color: 0xb0885a, roughness: 0.62 }),
    tile:     new THREE.MeshStandardMaterial({ color: 0x9ba1a6, roughness: 0.42 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x8b8b87, roughness: 0.92 }),
    glass:    new THREE.MeshStandardMaterial({
      color: 0xa9d6e8, roughness: 0.06, metalness: 0.0,
      transparent: true, opacity: 0.22, side: THREE.DoubleSide, ...clip }),
    door:     new THREE.MeshStandardMaterial({ color: 0xe4ded2, roughness: 0.75, ...clip }),
    frontDoor: new THREE.MeshStandardMaterial({ color: 0x7c5f46, roughness: 0.7, ...clip }),
    blind:    new THREE.MeshStandardMaterial({
      color: 0xcfd4d8, roughness: 0.85, transparent: true, opacity: 0.94,
      side: THREE.DoubleSide, ...clip }),
    counter:  new THREE.MeshStandardMaterial({ color: 0x8a6742, roughness: 0.55 }),
    cabinet:  new THREE.MeshStandardMaterial({ color: 0xdcd6cb, roughness: 0.8 }),
    appliance: new THREE.MeshStandardMaterial({ color: 0xaeb5bd, roughness: 0.34, metalness: 0.5 }),
    sanitary: new THREE.MeshStandardMaterial({ color: 0xf2f4f5, roughness: 0.22 }),
    bench:    new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.72 }),
    slab:     new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 1.0 }),
  };

  const group = new THREE.Group();
  group.name = 'flat';
  const gFloors = new THREE.Group(); gFloors.name = 'floors';
  const gWalls = new THREE.Group(); gWalls.name = 'walls';
  const gGlazing = new THREE.Group(); gGlazing.name = 'glazing';
  const gFixtures = new THREE.Group(); gFixtures.name = 'fixtures';
  group.add(gFloors, gWalls, gGlazing, gFixtures);

  const doors = new Map();    // openingId -> { pivot, angle }
  const blinds = new Map();   // openingId -> mesh
  const roomFloors = new Map();

  /* ---------------- floors ---------------- */

  for (const room of plan.rooms) {
    const shape = new THREE.Shape();
    room.polygon.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat[room.floor] ?? mat.laminate);
    m.position.y = room.id === 'balcony' ? -0.04 : 0.001;
    m.receiveShadow = true;
    m.userData = { kind: 'room', room: room.id };
    gFloors.add(m);
    roomFloors.set(room.id, m);
  }

  // structural slab so the flat does not look like it is floating
  {
    const w = plan.dims.interiorWidth + 1.0;
    const d = plan.dims.interiorDepth + 1.0;
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), mat.slab);
    s.position.set(plan.dims.interiorWidth / 2 - 0.0, -0.12, plan.dims.interiorDepth / 2);
    s.receiveShadow = true;
    gFloors.add(s);
  }

  /* ---------------- walls ---------------- */

  const box = (x0, z0, x1, z1, y0, y1, material) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)),
      material,
    );
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  for (const wall of plan.walls) {
    const material = wall.kind === 'exterior' ? mat.wallExt : mat.wallInt;
    const h = wall.height;
    const alongStart = wall.axis === 'x' ? wall.x0 : wall.z0;
    const alongEnd = wall.axis === 'x' ? wall.x1 : wall.z1;
    const c0 = wall.axis === 'x' ? wall.z0 : wall.x0;
    const c1 = wall.axis === 'x' ? wall.z1 : wall.x1;

    const seg = (a0, a1, y0, y1) =>
      wall.axis === 'x' ? box(a0, c0, a1, c1, y0, y1, material)
                        : box(c0, a0, c1, a1, y0, y1, material);

    const ops = [...wall.openings].sort((a, b) => a.from - b.from);
    let cursor = alongStart;
    for (const op of ops) {
      if (op.from - cursor > 1e-4) gWalls.add(seg(cursor, op.from, 0, h));
      if (op.sill > 1e-4) gWalls.add(seg(op.from, op.to, 0, op.sill));
      if (h - op.head > 1e-4) gWalls.add(seg(op.from, op.to, op.head, h));
      cursor = op.to;
      addOpening(wall, op);
    }
    if (alongEnd - cursor > 1e-4) gWalls.add(seg(cursor, alongEnd, 0, h));
  }

  /** Glass + blind for a window, or a hinged leaf for a door. */
  function addOpening(wall, op) {
    const cMid = wall.axis === 'x' ? (wall.z0 + wall.z1) / 2 : (wall.x0 + wall.x1) / 2;
    const thin = 0.035;

    if (op.type === 'window') {
      const g = wall.axis === 'x'
        ? box(op.from, cMid - thin, op.to, cMid + thin, op.sill, op.head, mat.glass)
        : box(cMid - thin, op.from, cMid + thin, op.to, op.sill, op.head, mat.glass);
      g.castShadow = false;
      g.userData = { kind: 'opening', opening: op.id };
      gGlazing.add(g);

      // Blind: geometry hangs from the head, so scale.y is "fraction closed".
      const w = op.to - op.from;
      const drop = op.head - op.sill;
      const bg = new THREE.BoxGeometry(
        wall.axis === 'x' ? w * 0.98 : 0.02,
        drop,
        wall.axis === 'x' ? 0.02 : w * 0.98,
      );
      bg.translate(0, -drop / 2, 0);
      const bm = new THREE.Mesh(bg, mat.blind);
      bm.position.set(
        wall.axis === 'x' ? (op.from + op.to) / 2 : cMid + 0.05,
        op.head,
        wall.axis === 'x' ? cMid + 0.05 : (op.from + op.to) / 2,
      );
      bm.scale.y = 0.001;
      bm.userData = { kind: 'blind', opening: op.id };
      gGlazing.add(bm);
      blinds.set(op.id, bm);
      return;
    }

    // door leaf on a pivot at the hinge end
    const width = op.to - op.from;
    const height = op.head;
    const dir = op.hinge === 'from' ? 1 : -1;
    const at = op.hinge === 'from' ? op.from : op.to;

    const pivot = new THREE.Group();
    pivot.position.set(
      wall.axis === 'x' ? at : cMid,
      0,
      wall.axis === 'x' ? cMid : at,
    );

    const leafMat = op.id === 'front_door' ? mat.frontDoor : mat.door;
    const leaf = new THREE.Mesh(
      wall.axis === 'x'
        ? new THREE.BoxGeometry(width, height, thin * 1.2)
        : new THREE.BoxGeometry(thin * 1.2, height, width),
      leafMat,
    );
    leaf.position.set(
      wall.axis === 'x' ? (dir * width) / 2 : 0,
      height / 2,
      wall.axis === 'x' ? 0 : (dir * width) / 2,
    );
    leaf.castShadow = true;
    leaf.userData = { kind: 'opening', opening: op.id };
    pivot.add(leaf);
    gGlazing.add(pivot);

    // Rotating about +Y sends +x toward -z, so the x-axis case takes a sign flip.
    const angle = (wall.axis === 'x' ? -1 : 1) * dir * op.swing * OPEN_ANGLE;
    doors.set(op.id, { pivot, angle });
  }

  /* ---------------- fixtures ---------------- */

  const fixtureMat = {
    counter: mat.counter, cabinet: mat.cabinet, appliance: mat.appliance,
    fixture: mat.sanitary, glass: mat.glass, bench: mat.bench,
  };
  for (const f of plan.fixtures) {
    const m = box(f.x0, f.z0, f.x1, f.z1, f.y0, Math.max(f.y1, f.y0 + 0.02),
                  fixtureMat[f.kind] ?? mat.cabinet);
    m.userData = { kind: 'fixture', fixture: f.id, label: f.label, room: f.room };
    gFixtures.add(m);
  }

  /* ---------------- balcony ---------------- */

  {
    const b = plan.balcony;
    const t = b.parapetThickness;
    const slab = box(b.x0, b.z0, b.x1, b.z1, -0.18, -0.04, mat.concrete);
    slab.receiveShadow = true;
    gFloors.add(slab);

    const sides = [
      [b.x0, b.z0, b.x1, b.z0 + t],       // far side (south)
      [b.x0, b.z0, b.x0 + t, b.z1],       // east
      [b.x1 - t, b.z0, b.x1, b.z1],       // west
    ];
    for (const [x0, z0, x1, z1] of sides) {
      gWalls.add(box(x0, z0, x1, z1, -0.04, b.parapetHeight, mat.concrete));
      const g = box(x0, z0, x1, z1, b.parapetHeight, b.glassTop, mat.glass);
      g.castShadow = false;
      gGlazing.add(g);
    }
  }

  /* ---------------- section ---------------- */

  // Every solid box, with the vertical extent it was built at. Captured once,
  // before any sectioning, so setCut() is always absolute rather than relative
  // to whatever the last call did.
  const sectioned = [];
  for (const g of [gWalls, gFixtures]) {
    g.traverse((o) => {
      const h = o.isMesh ? o.geometry.parameters?.height : null;
      if (!h) return;
      sectioned.push({ mesh: o, y0: o.position.y - h / 2, y1: o.position.y + h / 2, h });
    });
  }

  /** Cut the model off at `cut` metres, keeping full wall thickness at the cut. */
  function setCut(cut) {
    for (const s of sectioned) {
      const top = Math.min(s.y1, cut);
      if (top <= s.y0 + 1e-4) {        // entirely above the cut, e.g. a lintel
        s.mesh.visible = false;
        continue;
      }
      s.mesh.visible = true;
      s.mesh.scale.y = (top - s.y0) / s.h;
      s.mesh.position.y = (s.y0 + top) / 2;
    }
  }

  return {
    group, mat, doors, blinds, roomFloors, setCut,
    gFloors, gWalls, gFixtures, gGlazing,
  };
}

/** Area centroid of a closed polygon given as [[x,z], ...]. */
export function polygonCentroid(poly) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i];
    const [x1, z1] = poly[(i + 1) % poly.length];
    const f = x0 * z1 - x1 * z0;
    a += f; cx += (x0 + x1) * f; cz += (z0 + z1) * f;
  }
  a *= 0.5;
  return [cx / (6 * a), cz / (6 * a)];
}

/** Flat text sprite used for the room labels. */
export function makeLabel(text, sub) {
  const pad = 18, fs = 44, sfs = 30;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `600 ${fs}px ui-sans-serif, -apple-system, sans-serif`;
  const w1 = ctx.measureText(text).width;
  ctx.font = `400 ${sfs}px ui-sans-serif, -apple-system, sans-serif`;
  const w2 = sub ? ctx.measureText(sub).width : 0;
  c.width = Math.ceil(Math.max(w1, w2) + pad * 2);
  c.height = Math.ceil(fs + (sub ? sfs + 8 : 0) + pad * 2);

  const g = c.getContext('2d');
  const r = 14;
  g.beginPath();
  g.roundRect(0, 0, c.width, c.height, r);
  g.fillStyle = 'rgba(245,243,238,0.82)';
  g.fill();
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.font = `600 ${fs}px ui-sans-serif, -apple-system, sans-serif`;
  g.fillStyle = 'rgba(20,26,33,0.92)';
  g.fillText(text, c.width / 2, pad);
  if (sub) {
    g.font = `400 ${sfs}px ui-sans-serif, -apple-system, sans-serif`;
    g.fillStyle = 'rgba(20,26,33,0.5)';
    g.fillText(sub, c.width / 2, pad + fs + 8);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: false, depthWrite: false,
  }));
  spr.scale.set((c.width / c.height) * 0.42, 0.42, 1);
  spr.renderOrder = 10;
  return spr;
}
