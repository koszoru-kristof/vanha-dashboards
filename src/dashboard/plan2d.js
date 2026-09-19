/**
 * 2D floorplan renderer for the e-ink panel.
 *
 * Reads the same data/floorplan.json as the 3D model, but deliberately does not
 * share code with src/build-flat.js: that module imports three.js, and pulling
 * 700 kB of renderer into a dashboard that draws flat SVG would be absurd.
 *
 * Drawn the way an architectural plan is drawn: walls as solid poché, door
 * openings as gaps in the poché, windows as a thin line across the gap.
 */

let uid = 0;

/* ------------------------------------------------------------- geometry */

/** Spans along a wall's axis that are solid at floor level. */
function solidSpans(wall) {
  const a0 = wall.axis === 'x' ? Math.min(wall.x0, wall.x1) : Math.min(wall.z0, wall.z1);
  const a1 = wall.axis === 'x' ? Math.max(wall.x0, wall.x1) : Math.max(wall.z0, wall.z1);
  const ops = [...wall.openings].sort((p, q) => p.from - q.from);
  const out = [];
  let cursor = a0;
  for (const op of ops) {
    if (op.from - cursor > 1e-4) out.push([cursor, op.from]);
    cursor = op.to;
  }
  if (a1 - cursor > 1e-4) out.push([cursor, a1]);
  return out;
}

export function planGeometry(plan, { balcony = true } = {}) {
  const walls = [];
  const windows = [];
  const doors = [];

  for (const w of plan.walls) {
    const c0 = w.axis === 'x' ? Math.min(w.z0, w.z1) : Math.min(w.x0, w.x1);
    const c1 = w.axis === 'x' ? Math.max(w.z0, w.z1) : Math.max(w.x0, w.x1);
    for (const [s, e] of solidSpans(w)) {
      walls.push(w.axis === 'x'
        ? { x: s, y: c0, w: e - s, h: c1 - c0 }
        : { x: c0, y: s, w: c1 - c0, h: e - s });
    }
    const mid = (c0 + c1) / 2;
    for (const op of w.openings) {
      const seg = w.axis === 'x'
        ? { x1: op.from, y1: mid, x2: op.to, y2: mid }
        : { x1: mid, y1: op.from, x2: mid, y2: op.to };
      (op.type === 'window' ? windows : doors).push(seg);
    }
  }

  const rooms = plan.rooms
    .filter((r) => balcony || r.id !== 'balcony')
    .map((r) => ({ ...r, centroid: centroid(r.polygon) }));

  const bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const grow = (x, y) => {
    bounds.x0 = Math.min(bounds.x0, x); bounds.y0 = Math.min(bounds.y0, y);
    bounds.x1 = Math.max(bounds.x1, x); bounds.y1 = Math.max(bounds.y1, y);
  };
  for (const w of walls) { grow(w.x, w.y); grow(w.x + w.w, w.y + w.h); }
  if (balcony) {
    const b = plan.balcony;
    grow(Math.min(b.x0, b.x1), Math.min(b.z0, b.z1));
    grow(Math.max(b.x0, b.x1), Math.max(b.z0, b.z1));
  }

  return { walls, windows, doors, rooms, bounds };
}

export function centroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    const f = x0 * y1 - x1 * y0;
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  a *= 0.5;
  return [cx / (6 * a), cy / (6 * a)];
}

/* ------------------------------------------------------------- patterns */

/**
 * Ordered hatch ramp. On a 1-bit panel there is no lightness to ramp, so
 * magnitude rides line spacing at a fixed 45deg — denser is more. Angle is kept
 * free so it can carry a diverging sign (45deg vs its 135deg mirror) instead.
 */
/* Line spacing for the ordered ramp, in px. Lines are 2px wide, not 1px: a
   1px diagonal antialiases to mid-grey and a 1-bit panel thresholds it away
   entirely — verified by thresholding the render, where every sparse swatch
   disappeared. 2px always survives. */
export const HATCH_STEPS = [17, 10, 6, 3.8];

export function hatchDefs(prefix) {
  return HATCH_STEPS.map((gap, i) => `
    <pattern id="${prefix}-up-${i}" width="${gap}" height="${gap}"
             patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <rect width="${gap}" height="${gap}" fill="#fff"/>
      <line x1="0" y1="0" x2="0" y2="${gap}" stroke="#000" stroke-width="2"/>
    </pattern>
    <pattern id="${prefix}-dn-${i}" width="${gap}" height="${gap}"
             patternTransform="rotate(135)" patternUnits="userSpaceOnUse">
      <rect width="${gap}" height="${gap}" fill="#fff"/>
      <line x1="0" y1="0" x2="0" y2="${gap}" stroke="#000" stroke-width="2"/>
    </pattern>`).join('');
}

/* --------------------------------------------------------------- render */

/**
 * @param {object} plan  floorplan.json
 * @param {object} opts
 *   w, h        target box in px
 *   balcony     include the balcony outline
 *   fillFor     (room, patternPrefix) => pattern url or '#fff'
 *   labelFor    (room) => [line1, line2] | null
 */
export function planSVG(plan, {
  w, h, balcony = true, fillFor = () => '#fff', labelFor = () => null,
  labelNudge = {},
} = {}) {
  const pre = `p${++uid}`;
  const g = planGeometry(plan, { balcony });
  const bw = g.bounds.x1 - g.bounds.x0;
  const bh = g.bounds.y1 - g.bounds.y0;
  const k = Math.min(w / bw, h / bh);
  const ox = (w - bw * k) / 2 - g.bounds.x0 * k;
  const oy = (h - bh * k) / 2 - g.bounds.y0 * k;
  const X = (v) => (v * k + ox).toFixed(1);
  const Y = (v) => (v * k + oy).toFixed(1);
  const L = (v) => (v * k).toFixed(1);

  const roomPaths = g.rooms.map((r) => {
    const d = r.polygon.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x)},${Y(y)}`).join('') + 'Z';
    return `<path d="${d}" fill="${fillFor(r, pre)}"/>`;
  }).join('');

  const wallRects = g.walls.map((r) =>
    `<rect x="${X(r.x)}" y="${Y(r.y)}" width="${L(r.w)}" height="${L(r.h)}" fill="#000"/>`
  ).join('');

  const winLines = g.windows.map((s) =>
    `<line x1="${X(s.x1)}" y1="${Y(s.y1)}" x2="${X(s.x2)}" y2="${Y(s.y2)}"
           stroke="#000" stroke-width="2"/>`
  ).join('');

  let balconyArt = '';
  if (balcony) {
    const b = plan.balcony;
    const x = Math.min(b.x0, b.x1), y = Math.min(b.z0, b.z1);
    balconyArt = `<rect x="${X(x)}" y="${Y(y)}" width="${L(Math.abs(b.x1 - b.x0))}"
      height="${L(Math.abs(b.z1 - b.z0))}" fill="none" stroke="#000" stroke-width="2"/>`;
  }

  // Labels last, each on a paper pill so they stay readable over any hatch.
  // The label is fitted to the room, never the other way round: an oversized
  // pill punches a white hole through the poché and reads as a doorway.
  const labels = g.rooms.map((r) => {
    const lines = labelFor(r);
    if (!lines) return '';
    const [cap, val] = lines;
    const [dx = 0, dy = 0] = labelNudge[r.id] ?? [0, 0];
    const cx = +X(r.centroid[0]) + dx;
    const cy = +Y(r.centroid[1]) + dy;

    const xs = r.polygon.map((q) => q[0]);
    const ys = r.polygon.map((q) => q[1]);
    const roomW = (Math.max(...xs) - Math.min(...xs)) * k - 7;
    const roomH = (Math.max(...ys) - Math.min(...ys)) * k - 7;

    // shrink to fit, down to a legibility floor
    const capW0 = cap.length * 7.3 + 14;
    const valW0 = val ? String(val).length * 12.6 + 16 : 0;
    const fit = Math.min(1, roomW / Math.max(capW0, valW0));
    const capFont = Math.max(7.5, 10.5 * fit);
    const valFont = Math.max(13, 21 * fit);
    const capW = cap.length * (capFont * 0.7) + 10;
    const valW = val ? String(val).length * (valFont * 0.6) + 10 : 0;

    const wPill = Math.min(Math.max(capW, valW), Math.max(roomW, 26));
    const hPill = Math.min(val ? 40 : 20, Math.max(roomH, 18));
    const twoLine = val && hPill >= 30;
    const capY = twoLine ? cy - 6 : cy + valFont * 0.36;

    return `
      <rect x="${(cx - wPill / 2).toFixed(1)}" y="${(cy - hPill / 2).toFixed(1)}"
            width="${wPill.toFixed(1)}" height="${hPill.toFixed(1)}" fill="#fff"/>
      ${twoLine || !val ? `<text x="${cx.toFixed(1)}" y="${capY.toFixed(1)}"
            text-anchor="middle" font-size="${capFont.toFixed(1)}" font-weight="700"
            letter-spacing="${(capFont * 0.1).toFixed(2)}"
            font-family="Inter, Helvetica, Arial, sans-serif">${cap}</text>` : ''}
      ${val ? `<text x="${cx.toFixed(1)}" y="${(twoLine ? cy + 14 : cy + valFont * 0.36).toFixed(1)}"
            text-anchor="middle" font-size="${valFont.toFixed(1)}" font-weight="700"
            letter-spacing="-.3"
            font-family="Inter, Helvetica, Arial, sans-serif">${val}</text>` : ''}`;
  }).join('');

  const el = document.createElement('div');
  el.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"
      shape-rendering="crispEdges">
      <defs>${hatchDefs(pre)}</defs>
      ${roomPaths}${wallRects}${balconyArt}${winLines}
      <g shape-rendering="geometricPrecision">${labels}</g>
    </svg>`;
  el.firstElementChild.dataset.prefix = pre;
  return el.firstElementChild;
}

/** Pattern url for a value on a 5-step ordered ramp. */
export function rampFill(prefix, value, domain, dir = 'up') {
  const [lo, hi] = domain;
  const t = Math.max(0, Math.min(0.999, (value - lo) / (hi - lo)));
  return `url(#${prefix}-${dir}-${Math.floor(t * HATCH_STEPS.length)})`;
}
