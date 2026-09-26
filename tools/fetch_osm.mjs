#!/usr/bin/env node
/**
 * Bake a neighbourhood map for the panel backgrounds: data/tapiola-map.json.
 *
 * Centred on the FMI Tapiola weather station (the public point the outdoor
 * readings come from), not on the flat. Covers ~2.4 x 1.45 km, which is
 * exactly 800x480 at the panel's aspect, so one map pixel is one panel pixel.
 *
 * Pulls roads, paths, buildings, water, parks and woods from OpenStreetMap via
 * the Overpass API, projects them (equirectangular at this latitude is exact
 * to well under a pixel over 2 km), simplifies to ~1 px, and stores each layer
 * as a single SVG path string so drawing it is one <path> per layer.
 *
 *   node tools/fetch_osm.mjs            (or: node tools/fetch_osm.mjs osm.json)
 *
 * Map data © OpenStreetMap contributors, ODbL. The panel prints the credit.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const CENTER = { lat: 60.178, lon: 24.787 };
const W = 800, H = 480;
const HALF_LAT = 0.0065;                       // ±0.72 km
const HALF_LON = HALF_LAT * (W / H) / Math.cos(CENTER.lat * Math.PI / 180);
const BBOX = [CENTER.lat - HALF_LAT, CENTER.lon - HALF_LON, CENTER.lat + HALF_LAT, CENTER.lon + HALF_LON];

const CLASSES = {
  major:    (t) => /^(motorway|trunk|primary|secondary|tertiary)(_link)?$/.test(t.highway),
  minor:    (t) => /^(residential|unclassified|living_street|service|pedestrian)$/.test(t.highway),
  path:     (t) => /^(footway|cycleway|path|steps|bridleway|track)$/.test(t.highway),
  building: (t) => t.building != null,
  water:    (t) => t.natural === 'water' || t.natural === 'bay',
  wood:     (t) => t.natural === 'wood' || t.landuse === 'forest',
  green:    (t) => ['park', 'pitch'].includes(t.leisure) || ['grass', 'meadow'].includes(t.landuse),
};
const AREAS = new Set(['building', 'water', 'wood', 'green']);

async function load(file) {
  if (file) return JSON.parse(await readFile(file, 'utf8'));
  const b = BBOX.join(',');
  const q = `[out:json][timeout:90];(
    way["highway"](${b});
    way["natural"~"water|coastline|wood|bay"](${b});
    relation["natural"~"water|bay"](${b});
    way["leisure"~"park|pitch"](${b});
    way["landuse"~"grass|forest|meadow"](${b});
    way["building"](${b}););out geom;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', body: new URLSearchParams({ data: q }),
    headers: { 'user-agent': 'smarthome-dashboard-study/0.1' },
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  return res.json();
}

const project = ({ lat, lon }) => [
  ((lon - BBOX[1]) / (BBOX[3] - BBOX[1])) * W,
  ((BBOX[2] - lat) / (BBOX[2] - BBOX[0])) * H,
];

/* Douglas–Peucker to `tol` px. A closed ring starts and ends on the same
   point, which DP would see as a zero-length chord and collapse; so a ring is
   split at the point farthest from its start and each half done separately. */
function simplify(pts, tol = 0.8) {
  if (pts.length < 3) return pts;
  const [fx, fy] = pts[0], [lx, ly] = pts.at(-1);
  if (fx === lx && fy === ly) {
    let far = 1, fd = -1;
    pts.forEach(([x, y], i) => { const d = Math.hypot(x - fx, y - fy); if (d > fd) { fd = d; far = i; } });
    if (fd <= tol) return [];
    return [...simplifyOpen(pts.slice(0, far + 1), tol).slice(0, -1), ...simplifyOpen(pts.slice(far), tol)];
  }
  return simplifyOpen(pts, tol);
}

function simplifyOpen(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let best = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > best) { best = d; idx = i; }
    }
    if (best > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

function toPath(geom, closed) {
  let pts = geom.map(project).map(([x, y]) => [Math.round(x * 2) / 2, Math.round(y * 2) / 2]);
  pts = pts.filter((p, i) => !i || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
  pts = simplify(pts);
  if (pts.length < 2) return '';
  // drop what lies entirely off-panel
  if (pts.every(([x]) => x < -20) || pts.every(([x]) => x > W + 20)
   || pts.every(([, y]) => y < -20) || pts.every(([, y]) => y > H + 20)) return '';
  return `M${pts.map((p) => p.join(' ')).join('L')}${closed ? 'Z' : ''}`;
}

const osm = await load(process.argv[2]);
const layers = Object.fromEntries(Object.keys(CLASSES).map((k) => [k, []]));
for (const el of osm.elements) {
  const t = el.tags ?? {};
  const cls = Object.keys(CLASSES).find((k) => CLASSES[k](t));
  if (!cls) continue;
  const geoms = el.type === 'relation'
    ? (el.members ?? []).filter((m) => m.role === 'outer' && m.geometry).map((m) => m.geometry)
    : el.geometry ? [el.geometry] : [];
  for (const g of geoms) {
    const d = toPath(g, AREAS.has(cls));
    if (d) layers[cls].push(d);
  }
}
const out = {
  w: W, h: H, center: CENTER, bbox: BBOX,
  attribution: '© OpenStreetMap contributors',
  layers: Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.join('')])),
};
const file = resolve(import.meta.dirname, '..', 'data', 'tapiola-map.json');
await writeFile(file, JSON.stringify(out));
console.log(file, Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length])),
  `${(JSON.stringify(out).length / 1024).toFixed(0)} kB`);
