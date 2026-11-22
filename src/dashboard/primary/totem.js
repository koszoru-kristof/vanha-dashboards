/**
 * Totem — the day's facts stacked into one figure, as the catalogue stacks
 * its colour totems: from the plinth up, a block for the price of power
 * (as tall as the price, in its colour), a disc for the air (as wide as the
 * temperature is far from freezing, blue below, red above), a bar for the
 * rain ahead (blue, as long as the millimetres), the sun or the night on
 * top (a yellow disc, or a black one), and a pennant for the wind, as long
 * as it blows. The totem is tall on a hot dear day and squat on a cold
 * cheap one; the sauna window is a yellow notch in the plinth.
 */
import { frame, facts, num, euro, HOUR, SIZE } from '../posters/common.js';
import { PRI, level, mark, foot, saunaLine, priceWord, T } from './primarykit.js';


function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const u = W / 480;                                                       // 1 on the 480 sheet
  const f = facts(ctx);
  const S = f.sauna;
  const cx = W / 2 - 10, ground = 690;
  const wind = Number.isFinite(f.wind) ? f.wind : 3;
  const mm = f.fc.between(f.now, f.now + 12 * HOUR).reduce((a, r) => a + r.mm, 0);
  const t = Number.isFinite(f.temp) ? f.temp : 5;
  // the pieces, bottom up, each with its height
  const pieces = [];
  pieces.push({ h: 34, draw: (y) => `<rect x="${cx - 120 * u}" y="${y}" width="${240 * u}" height="34" fill="${PRI.black}"/>`
    + (S.start != null || S.state === 'now' ? `<rect x="${cx - 120 * u + 24 * u + (S.tomorrow ? 160 : Math.min(160, ((new Date(S.start ?? f.now).getHours()) / 24) * 190)) * u}" y="${y}" width="22" height="34" fill="${PRI.yellow}"/>` : '') });
  const ph = 40 + 200 * level(f.price);
  pieces.push({ h: ph, draw: (y) => `<rect x="${cx - 80 * u}" y="${y}" width="${160 * u}" height="${ph.toFixed(1)}" fill="${f.price == null ? PRI.paper : f.price <= 5 ? PRI.blue : f.price <= 15 ? PRI.paper : PRI.red}" stroke="${PRI.black}" stroke-width="3"/>`
    + T(cx, y + ph / 2 + 6, f.price != null ? `${num(f.price, 1)} c` : '–', { size: 17, weight: 700, anchor: 'middle', fill: f.price != null && (f.price > 15 || f.price <= 5) ? PRI.paper : PRI.black }) });
  const r = (24 + Math.min(90, Math.abs(t) * 3.2)) * u;
  pieces.push({ h: 2 * r, draw: (y) => `<circle cx="${cx}" cy="${(y + r).toFixed(1)}" r="${r.toFixed(1)}" fill="${t <= 0 ? PRI.blue : PRI.red}"/>`
    + T(cx, y + r + 8 * u, `${num(t, 0)}°`, { size: Math.min(44 * u, r * 0.9), weight: 700, anchor: 'middle', fill: PRI.paper }) });
  if (mm >= 0.2) { const bw = Math.min(300, 60 + mm * 24) * u; pieces.push({ h: 26, draw: (y) => `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="26" fill="${PRI.blue}"/>` }); }
  pieces.push({ h: 84 * u, draw: (y) => `<circle cx="${cx}" cy="${y + 42 * u}" r="${42 * u}" fill="${f.night ? PRI.black : f.sky === 'clear' || f.sky === 'partly' ? PRI.yellow : PRI.paper}" stroke="${PRI.black}" stroke-width="3"/>` });
  const pl = (30 + Math.min(16, wind) * 12) * u;
  pieces.push({ h: 30, draw: (y) => `<path d="M${cx - 4},${y} L${cx - 4},${y + 30} L${cx + pl},${y + 15} Z" fill="${PRI.red}"/><rect x="${cx - 8}" y="${y - 6}" width="8" height="42" fill="${PRI.black}"/>` });
  // stack them, scaled to fit under the heading
  const gap = 6;
  const total = pieces.reduce((a, p) => a + p.h + gap, 0);
  const k = Math.min(1, (ground - 150) / total);
  let s = `<rect width="${W}" height="${H}" fill="${PRI.paper}"/>`;
  s += `<rect x="0" y="${ground}" width="${W}" height="6" fill="${PRI.black}"/>`;
  let y = ground;
  let body = '';
  for (const p of pieces) { y -= (p.h + gap) * k; body += p.draw(y / k + (ground - ground / k) * 0 + 0) ; }
  // draw in a scaled group about the ground line
  y = ground; body = '';
  for (const p of pieces) { y -= (p.h + gap); body += p.draw(y); }
  s += `<g transform="translate(${cx} ${ground}) scale(${k.toFixed(3)}) translate(${-cx} ${-ground})">${body}</g>`;
  // the words
  s += mark(30, 60, f.place.toLowerCase())
     + T(30, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(30, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'from the plinth up: the price, the air, the rain ahead, the sky, the wind',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
    [mm >= 0.2 ? `${mm.toFixed(0)} mm of rain in the next 12 h` : 'dry for the next 12 h', `wind ${num(wind, 0)} m/s`, 'the yellow notch is the sauna hour'].join(' · '),
  ] });
  return frame(orient, s, { bg: PRI.paper });
}

export const totemP = {
  id: 'pc-totem-p', orient: 'portrait', name: 'Totem · portrait',
  blurb: 'The day’s facts stacked into one figure: a block for the price (as tall as it is), a disc for the air (as '
       + 'wide as it is far from freezing, blue below, red above), a bar for the rain ahead, the sun or the night on '
       + 'top, and a pennant for the wind. Tall on a hot dear day, squat on a cold cheap one.',
  render, tall: true,
};
