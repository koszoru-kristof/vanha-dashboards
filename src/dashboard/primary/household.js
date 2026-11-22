/**
 * Household — the flat itself as a Color Grid: a room per row, a kind of
 * thing per column, and a cell takes colour only where something is
 * happening. Yellow where a light is on. Blue where a window or door
 * stands open. Red where power is being drawn — an appliance running, a
 * heater or an underfloor loop on. The last column is the room's air:
 * blue when cool, white when comfortable, red when warm. On a quiet
 * evening the sheet is nearly all white with black rules; on a busy one it
 * fills with colour. The weather outside stands in the corner.
 */
import { frame, facts, num, euro } from '../posters/common.js';
import { PRI, mark, foot, saunaLine, priceWord, T } from './primarykit.js';

const W = 480, H = 800;
const ROOMS = [['living', 'living room'], ['kitchen', 'kitchen'], ['hall', 'hall'], ['bedroom', 'bedroom'], ['bathroom', 'bathroom'], ['sauna', 'sauna']];
const COLS = ['light', 'open', 'power', 'air'];

function cellInk(ctx, room, col) {
  const devs = (ctx.devices ?? []).filter((d) => d.room === room);
  const st = (d) => ctx.device?.(d.id) ?? {};
  switch (col) {
    case 'light': return devs.some((d) => d.kind === 'light' && st(d).on) ? PRI.yellow : null;
    case 'open': return devs.some((d) => d.kind === 'contact' && st(d).open) ? PRI.blue : null;
    case 'power': return devs.some((d) => (d.kind === 'appliance' && st(d).running && (st(d).power ?? 0) > 200)
      || (d.kind === 'heater' && st(d).on) || (d.kind === 'radiator' && (st(d).valve ?? 0) > 50)) ? PRI.red : null;
    case 'air': {
      const c = devs.find((d) => d.kind === 'climate');
      const t = c ? st(c).temperature : null;
      if (!Number.isFinite(t) || t === 0) return null;
      if (room === 'sauna') return t >= 45 ? PRI.red : null;
      return t < 18 ? PRI.blue : t > 24 ? PRI.red : null;
    }
    default: return null;
  }
}

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const G = { x: 130, y: 190, cw: 76, ch: 76, bar: 8 };
  let s = `<rect width="${W}" height="${H}" fill="${PRI.paper}"/>`;
  let lit = 0;
  ROOMS.forEach(([room, label], r) => {
    COLS.forEach((col, c) => {
      const ink = cellInk(ctx, room, col);
      if (ink) { lit++; s += `<rect x="${G.x + c * G.cw}" y="${G.y + r * G.ch}" width="${G.cw}" height="${G.ch}" fill="${ink}"/>`; }
    });
    s += T(G.x - 14, G.y + r * G.ch + G.ch / 2 + 4, label, { size: 11.5, weight: 600, anchor: 'end' });
  });
  // the black rules of the grid
  for (let c = 0; c <= COLS.length; c++) s += `<rect x="${G.x + c * G.cw - G.bar / 2}" y="${G.y - G.bar / 2}" width="${G.bar}" height="${ROOMS.length * G.ch + G.bar}" fill="${PRI.black}"/>`;
  for (let r = 0; r <= ROOMS.length; r++) s += `<rect x="${G.x - G.bar / 2}" y="${G.y + r * G.ch - G.bar / 2}" width="${COLS.length * G.cw + G.bar}" height="${G.bar}" fill="${PRI.black}"/>`;
  COLS.forEach((col, c) => { s += T(G.x + c * G.cw + G.cw / 2, G.y - 18, col.toUpperCase(), { size: 10, weight: 700, ls: 2, anchor: 'middle' }); });

  // outside, in the corner
  s += mark(30, 60, f.place.toLowerCase())
     + T(30, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(30, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += `<text x="${W - 30}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${PRI.black}">${num(f.temp, 0)}°</text>`
     + T(W - 30, 112, 'outside', { size: 10, weight: 600, ls: 1.5, anchor: 'end' });
  s += T(W - 30, 700, lit === 0 ? 'all quiet' : `${lit} thing${lit === 1 ? '' : 's'} going on`, { size: 22, weight: 500, anchor: 'end' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'rows are rooms: yellow a light on, blue a door or window open, red power being drawn',
    'air: blue cool, red warm, white comfortable · the sauna red when hot',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('portrait', s, { bg: PRI.paper });
}

export const householdP = {
  id: 'pc-household-p', orient: 'portrait', name: 'Household · portrait',
  blurb: 'The flat as a Color Grid: a room per row, a kind of thing per column, and a cell takes colour only where '
       + 'something is happening — yellow a light on, blue a window or door open, red power being drawn, the air blue '
       + 'when cool and red when warm. A quiet evening is nearly all white; a busy one fills with colour.',
  render,
};
