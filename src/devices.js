/**
 * Device registry.
 *
 * Positions are derived from the floorplan rather than hard-coded, so that
 * re-running tools/derive_floorplan.py (or nudging a wall) moves the devices
 * with the geometry. Everything here is a plausible fit-out for this specific
 * flat, taken from the listing: ceramic hob, dishwasher, fridge/freezer,
 * extractor hood, electric sauna heater, washing-machine point in the
 * bathroom, venetian blinds, mechanical supply/extract ventilation,
 * district-heating radiators.
 */

const KIND = {
  light:     { label: 'Light',        marker: 0xffd9a0 },
  blind:     { label: 'Blind',        marker: 0x7fa8d9 },
  contact:   { label: 'Contact',      marker: 0x9fd97f },
  motion:    { label: 'Motion',       marker: 0xd97fc8 },
  climate:   { label: 'Climate',      marker: 0x7fd9d0 },
  heater:    { label: 'Heater',       marker: 0xd97f5a },
  radiator:  { label: 'Radiator',     marker: 0xd9a05a },
  appliance: { label: 'Appliance',    marker: 0xc0c7d1 },
  leak:      { label: 'Leak sensor',  marker: 0x5aa8d9 },
  smoke:     { label: 'Smoke alarm',  marker: 0xd95a5a },
  vent:      { label: 'Ventilation',  marker: 0x8f9bd9 },
};

export const DEVICE_KINDS = KIND;

/* ---------- geometry helpers ---------- */

function centroid(poly) {
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

function boxCentre(f) {
  return [(f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2];
}

/** Mid-point of an opening, in world XZ. */
function openingCentre(wall, op) {
  const mid = (op.from + op.to) / 2;
  return wall.axis === 'x'
    ? [mid, (wall.z0 + wall.z1) / 2]
    : [(wall.x0 + wall.x1) / 2, mid];
}

/* ---------- registry ---------- */

export function buildDevices(plan) {
  const rooms = Object.fromEntries(plan.rooms.map((r) => [r.id, r]));
  const fixtures = Object.fromEntries(plan.fixtures.map((f) => [f.id, f]));
  const walls = Object.fromEntries(plan.walls.map((w) => [w.id, w]));
  const openings = {};
  for (const w of plan.walls) for (const o of w.openings) openings[o.id] = { wall: w, op: o };

  const ceil = plan.dims.ceilingHeight;
  const out = [];

  const add = (d) => { out.push(d); return d; };

  /* --- ceiling lights, one per room, at the room's area centroid --- */
  const lights = [
    ['living',   'Living room ceiling', 5.0, 3000],
    ['kitchen',  'Kitchen worktop',     3.5, 3500],
    ['hall',     'Hall ceiling',        2.0, 2900],
    ['bedroom',  'Bedroom ceiling',     3.0, 2700],
    ['wardrobe', 'Wardrobe strip',      1.2, 4000],
    ['bathroom', 'Bathroom ceiling',    2.5, 3500],
    ['sauna',    'Sauna light',         0.8, 2200],
    ['balcony',  'Balcony light',       1.5, 2700],
  ];
  for (const [roomId, name, watts, kelvin] of lights) {
    const r = rooms[roomId];
    if (!r) continue;
    const [x, z] = centroid(r.polygon);
    add({
      id: `light.${roomId}`, name, room: roomId, kind: 'light',
      pos: [x, roomId === 'balcony' ? 2.2 : ceil - 0.06, z],
      watts, kelvin,
      initial: { on: roomId === 'living', brightness: 80 },
      controls: [
        { kind: 'toggle', key: 'on' },
        { kind: 'slider', key: 'brightness', min: 5, max: 100, step: 5, unit: '%' },
      ],
    });
  }

  /* --- blinds (the listing includes venetian blinds on the windows) --- */
  for (const [opId, name, roomId] of [
    ['living_window',  'Living room blind', 'living'],
    ['bedroom_window', 'Bedroom blind',     'bedroom'],
  ]) {
    const { wall, op } = openings[opId];
    const [x, z] = openingCentre(wall, op);
    add({
      id: `blind.${roomId}`, name, room: roomId, kind: 'blind',
      pos: [x, op.head + 0.12, z], opening: opId,
      initial: { position: 0 },   // 0 = fully open, 100 = fully closed
      controls: [{ kind: 'slider', key: 'position', min: 0, max: 100, step: 10, unit: '% closed' }],
    });
  }

  /* --- door / window contacts --- */
  for (const [opId, name, roomId] of [
    ['front_door',     'Front door',      'hall'],
    ['balcony_door',   'Balcony door',    'living'],
    ['living_window',  'Living window',   'living'],
    ['bedroom_window', 'Bedroom window',  'bedroom'],
    ['sauna_door',     'Sauna door',      'sauna'],
  ]) {
    const { wall, op } = openings[opId];
    const [x, z] = openingCentre(wall, op);
    add({
      id: `contact.${opId}`, name, room: roomId, kind: 'contact',
      pos: [x, Math.min(op.head, 2.0) - 0.1, z], opening: opId,
      initial: { open: false },
      controls: [{ kind: 'toggle', key: 'open', labels: ['closed', 'open'] }],
    });
  }

  /* --- motion / presence --- */
  for (const [roomId, name] of [
    ['hall', 'Hall motion'], ['bathroom', 'Bathroom motion'], ['living', 'Living presence'],
  ]) {
    const [x, z] = centroid(rooms[roomId].polygon);
    add({
      id: `motion.${roomId}`, name, room: roomId, kind: 'motion',
      pos: [x, ceil - 0.2, z],
      initial: { detected: false },
      controls: [{ kind: 'toggle', key: 'detected', labels: ['clear', 'motion'] }],
    });
  }

  /* --- climate sensors --- */
  for (const [roomId, name, t, h] of [
    ['living',   'Living climate',  21.5, 38],
    ['bedroom',  'Bedroom climate', 20.0, 41],
    ['bathroom', 'Bathroom climate', 23.0, 58],
    ['sauna',    'Sauna climate',   22.0, 45],
    ['balcony',  'Balcony climate',  9.0, 72],
  ]) {
    const [x, z] = centroid(rooms[roomId].polygon);
    add({
      id: `climate.${roomId}`, name, room: roomId, kind: 'climate',
      pos: [x + 0.25, 1.6, z + 0.25],
      initial: { temperature: t, humidity: h },
      controls: [
        { kind: 'readout', key: 'temperature', unit: '°C', digits: 1 },
        { kind: 'readout', key: 'humidity', unit: '%', digits: 0 },
      ],
    });
  }

  /* --- outdoor conditions -----------------------------------------------
     A weather feed rather than a sensor in the flat. The glazed balcony is NOT
     a substitute: glazing runs it several degrees above true outdoor. --- */
  {
    const b = plan.balcony;
    add({
      id: 'climate.outdoor', name: 'Outdoor', room: 'outdoor', kind: 'climate',
      pos: [(b.x0 + b.x1) / 2, 2.8, b.z0 - 1.0],
      initial: { temperature: 9.0, humidity: 72 },
      controls: [
        { kind: 'readout', key: 'temperature', unit: '°C', digits: 1 },
        { kind: 'readout', key: 'humidity', unit: '%', digits: 0 },
      ],
    });
  }

  /* --- sauna heater --- */
  {
    const f = fixtures.s_heater;
    const [x, z] = boxCentre(f);
    add({
      id: 'heater.sauna', name: 'Sauna heater', room: 'sauna', kind: 'heater',
      pos: [x, f.y1 + 0.15, z], watts: 6000,
      initial: { on: false, target: 80 },
      controls: [
        { kind: 'toggle', key: 'on' },
        { kind: 'slider', key: 'target', min: 60, max: 100, step: 5, unit: '°C' },
      ],
    });
  }

  /* --- bathroom underfloor heating (tiled floor, standard in FI) --- */
  {
    const [x, z] = centroid(rooms.bathroom.polygon);
    add({
      id: 'heater.bathroom_floor', name: 'Bathroom underfloor', room: 'bathroom', kind: 'heater',
      pos: [x, 0.08, z], watts: 400,
      initial: { on: true, target: 24 },
      controls: [
        { kind: 'toggle', key: 'on' },
        { kind: 'slider', key: 'target', min: 16, max: 30, step: 1, unit: '°C' },
      ],
    });
  }

  /* --- radiators under the two windows (district heating) --- */
  for (const [opId, roomId, name] of [
    ['living_window',  'living',  'Living radiator'],
    ['bedroom_window', 'bedroom', 'Bedroom radiator'],
  ]) {
    const { wall, op } = openings[opId];
    const [x, z] = openingCentre(wall, op);
    add({
      id: `radiator.${roomId}`, name, room: roomId, kind: 'radiator',
      pos: [x, 0.35, z + 0.20], opening: opId,
      initial: { valve: 45, target: 21 },
      controls: [
        { kind: 'slider', key: 'valve', min: 0, max: 100, step: 5, unit: '% open' },
        { kind: 'readout', key: 'target', unit: '°C', digits: 0 },
      ],
    });
  }

  /* --- appliances with a power reading --- */
  for (const [fid, name, roomId, idle, busy] of [
    ['k_fridge',     'Fridge / freezer', 'kitchen',  1.2, 95],
    ['k_dishwasher', 'Dishwasher',       'kitchen',  0.4, 1800],
    ['k_hob',        'Ceramic hob',      'kitchen',  0.0, 2100],
    ['k_hood',       'Extractor hood',   'kitchen',  0.0, 85],
    ['b_washer',     'Washing machine',  'bathroom', 0.5, 2000],
  ]) {
    const f = fixtures[fid];
    const [x, z] = boxCentre(f);
    add({
      id: `appliance.${fid.replace(/^[kb]_/, '')}`, name, room: roomId, kind: 'appliance',
      pos: [x, f.y1 + 0.08, z], idleW: idle, busyW: busy,
      initial: { running: fid === 'k_fridge', power: fid === 'k_fridge' ? busy : idle },
      controls: [
        { kind: 'toggle', key: 'running' },
        { kind: 'readout', key: 'power', unit: ' W', digits: 0 },
      ],
    });
  }

  /* --- water leak sensors where a leak would actually start --- */
  for (const [fid, name, roomId] of [
    ['k_sink',   'Leak: under sink',      'kitchen'],
    ['b_washer', 'Leak: washing machine', 'bathroom'],
    ['b_shower', 'Leak: shower',          'bathroom'],
  ]) {
    const f = fixtures[fid];
    const [x, z] = boxCentre(f);
    add({
      id: `leak.${fid}`, name, room: roomId, kind: 'leak',
      pos: [x, 0.05, z],
      initial: { wet: false },
      controls: [{ kind: 'toggle', key: 'wet', labels: ['dry', 'WET'] }],
    });
  }

  /* --- smoke alarms (Finnish rule of thumb: one per 60 m2 per storey) --- */
  for (const [roomId, name] of [['living', 'Smoke alarm (living)'], ['bedroom', 'Smoke alarm (bedroom)']]) {
    const [x, z] = centroid(rooms[roomId].polygon);
    add({
      id: `smoke.${roomId}`, name, room: roomId, kind: 'smoke',
      pos: [x + 0.7, ceil - 0.04, z - 0.7],
      initial: { alarm: false, battery: 92 },
      controls: [
        { kind: 'toggle', key: 'alarm', labels: ['ok', 'ALARM'] },
        { kind: 'readout', key: 'battery', unit: '%', digits: 0 },
      ],
    });
  }

  /* --- mechanical supply/extract: extract in the wet rooms + kitchen --- */
  for (const [roomId, name, dir] of [
    ['bathroom', 'Extract: bathroom', 'extract'],
    ['sauna',    'Extract: sauna',    'extract'],
    ['bedroom',  'Supply: bedroom',   'supply'],
    ['living',   'Supply: living',    'supply'],
  ]) {
    const [x, z] = centroid(rooms[roomId].polygon);
    add({
      id: `vent.${roomId}`, name, room: roomId, kind: 'vent',
      pos: [x - 0.6, ceil - 0.03, z + 0.6], direction: dir,
      initial: { flow: dir === 'extract' ? 18 : 12 },
      controls: [{ kind: 'slider', key: 'flow', min: 0, max: 40, step: 2, unit: ' l/s' }],
    });
  }

  return out;
}
