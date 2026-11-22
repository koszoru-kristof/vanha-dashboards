/**
 * Planets — the rooms of the flat as striped planets over a sea of waves,
 * after the catalogue's astral travellers. Each planet is a room, as large
 * as the room's floor, in the colour of its warmth — green comfortable, red
 * warm, white cool — banded with black stripes. The waves beneath run with
 * the wind outside; the outdoor figure stands at the head.
 */
import plan from '../../../data/floorplan.json';
import { frame, facts, num, euro, smooth, uid, SIZE } from '../posters/common.js';
import { BAU, roomInk, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const ROOMS = [
  { id: 'living', sensor: 'climate.living', x: 150, y: 250, label: 'living' },
  { id: 'bedroom', sensor: 'climate.bedroom', x: 350, y: 190, label: 'bedroom' },
  { id: 'balcony', sensor: 'climate.balcony', x: 360, y: 430, label: 'balcony' },
  { id: 'bathroom', sensor: 'climate.bathroom', x: 120, y: 470, label: 'bathroom' },
  { id: 'sauna', sensor: 'climate.sauna', x: 250, y: 360, label: 'sauna' },
];

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const ex = W - 480;                 // the extra width of the 3:4 sheet; 0 on the 480 poster
  const f = facts(ctx);
  const S = f.sauna;
  const wind = Number.isFinite(f.wind) ? f.wind : 3;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  // the sea of waves, with the wind in it
  const amp = 4 + Math.min(16, wind) * 1.4;
  const d = (x, y) => amp * Math.sin((x / 210) * Math.PI * 2 + y / 80) + amp * 0.4 * Math.sin((x / 120) * Math.PI * 2 - y / 55);
  for (let y0 = 300; y0 < 700; y0 += 40) {
    const top = [], bottom = [];
    for (let x = -30; x <= W + 30; x += 18) { top.push([x, y0 + d(x, y0)]); bottom.push([x, y0 + 18 + d(x, y0 + 18)]); }
    const back = bottom.slice().reverse();
    s += `<path d="${smooth(top)} L${back[0][0].toFixed(1)},${back[0][1].toFixed(1)} ${smooth(back).slice(1)} Z" fill="${BAU.black}"/>`;
  }
  // the planets
  // on the wider sheet the planets spread across it (inside the 40 margins) and grow a little
  const sx = (W - 80) / 400, grow = 1 + ex / 1200;
  for (const r0 of ROOMS) {
    const r = { ...r0, x: 40 + (r0.x - 40) * sx };
    const room = plan.rooms.find((q) => q.id === r.id);
    const rad = 16 * Math.sqrt(room?.areaM2 ?? 5) * grow;
    const t = ctx.temp?.(r.sensor);
    const ink = roomInk(t) ?? BAU.grey;
    const clip = uid('pl');
    s += `<defs><clipPath id="${clip}"><circle cx="${r.x}" cy="${r.y}" r="${rad.toFixed(1)}"/></clipPath></defs>`;
    s += `<circle cx="${r.x}" cy="${r.y}" r="${rad.toFixed(1)}" fill="${ink}" stroke="${BAU.black}" stroke-width="3"/>`;
    let bands = '';
    for (let y = r.y - rad + 8; y < r.y + rad; y += 16) bands += `<rect x="${r.x - rad}" y="${y.toFixed(1)}" width="${rad * 2}" height="6" fill="${BAU.black}"/>`;
    s += `<g clip-path="url(#${clip})">${bands}</g>`;
    s += T(r.x, r.y + rad + 18, `${r.label}${Number.isFinite(t) && t !== 0 ? ` ${num(t, 0)}°` : ''}`, { size: 10.5, weight: 700, ls: 1.2, anchor: 'middle', fill: BAU.black, extra: ` stroke="${BAU.cream}" stroke-width="4" paint-order="stroke"` });
  }
  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(40, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`
     + T(W - 40, 112, 'outside', { size: 10, weight: 600, ls: 1.5, anchor: 'end' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'a planet per room, sized by its floor · green comfortable, red warm, white cool',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame(orient, s, { bg: BAU.cream });
}

export const planetsP = {
  id: 'bh-planets-p', orient: 'portrait', name: 'Planets · portrait',
  blurb: 'The rooms of the flat as striped planets over a sea of waves: each planet a room, as large as its floor, in '
       + 'the colour of its warmth — green comfortable, red warm, white cool — banded in black. The waves beneath run '
       + 'with the wind outside.',
  render, tall: true,
};
