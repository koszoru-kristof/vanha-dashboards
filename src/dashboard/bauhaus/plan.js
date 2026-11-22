/**
 * Plan — the flat itself as a composition of flat colour and black line.
 *
 * The real floor plan, walls in black, each room a block in the colour of
 * its own temperature: green where it is comfortable, red where it is warm
 * (the sauna, heated), white where it is cool (the glazed balcony), cream
 * where there is no sensor. The outdoor figure sits at the head, so the
 * whole sheet is inside against outside.
 */
import plan from '../../../data/floorplan.json';
import { planGeometry } from '../plan2d.js';
import { frame, facts, num, euro } from '../posters/common.js';
import { BAU, roomInk, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 480, H = 800;
const SENSOR = { living: 'climate.living', bedroom: 'climate.bedroom', bathroom: 'climate.bathroom', sauna: 'climate.sauna', balcony: 'climate.balcony' };
const G = planGeometry(plan);

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const b = G.bounds;
  const k = Math.min(400 / (b.x1 - b.x0), 560 / (b.y1 - b.y0));
  const ox = (W - (b.x1 - b.x0) * k) / 2 - b.x0 * k, oy = 130 - b.y0 * k;
  const X = (x) => (ox + x * k).toFixed(1), Y = (y) => (oy + y * k).toFixed(1);
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;

  // the rooms, in their colours
  const temps = {};
  for (const r of G.rooms) {
    const t = SENSOR[r.id] ? ctx.temp?.(SENSOR[r.id]) : null;
    temps[r.id] = t;
    const ink = roomInk(t);
    const d = `M${r.polygon.map(([x, y]) => `${X(x)},${Y(y)}`).join(' L')} Z`;
    s += `<path d="${d}" fill="${ink ?? BAU.cream}" stroke="${BAU.black}" stroke-width="${ink ? 0 : 1.5}"/>`;
  }
  // the balcony glazing, and the walls in black
  const bl = plan.balcony;
  s += `<rect x="${X(Math.min(bl.x0, bl.x1))}" y="${Y(Math.min(bl.z0, bl.z1))}" width="${(Math.abs(bl.x1 - bl.x0) * k).toFixed(1)}" height="${(Math.abs(bl.z1 - bl.z0) * k).toFixed(1)}" fill="none" stroke="${BAU.black}" stroke-width="3"/>`;
  for (const w of G.walls) s += `<rect x="${X(w.x)}" y="${Y(w.y)}" width="${Math.max(4, w.w * k).toFixed(1)}" height="${Math.max(4, w.h * k).toFixed(1)}" fill="${BAU.black}"/>`;
  // each room's figure
  for (const r of G.rooms) {
    const t = temps[r.id];
    if (!Number.isFinite(t) || t === 0) continue;
    const ink = roomInk(t) === BAU.white ? BAU.black : BAU.white;
    s += T(X(r.centroid[0]), (+Y(r.centroid[1]) + 6).toFixed(1), `${num(t, 0)}°`, { size: 17, weight: 700, anchor: 'middle', fill: ink });
  }

  // the outside, at the head
  s += mark(40, 60, f.place.toLowerCase());
  s += `<text x="${W - 40}" y="88" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  s += T(40, 84, f.out.head.toLowerCase(), { size: 14, weight: 500 })
     + T(40, 102, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 11, weight: 500 });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the flat as it is: green comfortable, red warm, white cool, cream unmeasured',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('portrait', s, { bg: BAU.cream });
}

export const planP = {
  id: 'bh-plan-p', orient: 'portrait', name: 'Plan · portrait',
  blurb: 'The flat itself as a composition: the real floor plan, walls in black, each room a block in the colour '
       + 'of its own temperature — green comfortable, red warm, white cool, cream where there is no sensor — with '
       + 'the outdoor figure at the head, inside against outside.',
  render,
};
