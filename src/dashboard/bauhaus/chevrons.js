/**
 * Chevrons — where the price of power is heading, as a stack of nested
 * chevrons: pointing down in green when the coming hours are cheaper than
 * now, up in red when they are dearer, and lying as flat bars in black when
 * nothing much changes. The figures are set small beneath.
 */
import { frame, facts, num, euro, SIZE } from '../posters/common.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const ex = W - 480;                 // the extra width of the 3:4 sheet; 0 on the 480 poster
  const f = facts(ctx);
  const S = f.sauna;
  const next = f.next.slice(1, 7).map((p) => p.price);
  const later = next.length ? next.reduce((a, b) => a + b, 0) / next.length : null;
  const delta = f.price != null && later != null ? later - f.price : 0;
  const dir = Math.abs(delta) < 1.5 ? 0 : delta > 0 ? -1 : 1;                 // -1 up (dearer), 1 down (cheaper)
  const ink = dir === 0 ? BAU.black : dir > 0 ? BAU.green : BAU.red;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  const n = 6, cx = W / 2, half = 170 + ex * 0.35, rise = 110, pitch = 56, sw = 24 + ex / 40;   // broader and bolder on the wider sheet
  for (let i = 0; i < n; i++) {
    const y = 210 + i * pitch;
    const tip = dir === 0 ? y : y + dir * rise;
    s += `<path d="M${cx - half},${y} L${cx},${tip} L${cx + half},${y}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }

  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(40, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  const word = f.price == null ? 'no prices yet' : dir === 0 ? 'power steady' : dir > 0 ? 'power getting cheaper' : 'power getting dearer';
  s += mark(W / 2, 640, word, { size: 28, anchor: 'middle', fill: ink })
     + T(W / 2, 666, f.price != null ? `${num(f.price, 1)} c/kWh now${later != null ? `, about ${num(later, 1)} over the next six hours` : ''}` : 'prices come at 14:00', { size: 12.5, weight: 500, anchor: 'middle' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'down in green when the coming hours are cheaper, up in red when dearer, flat when steady',
    `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''} · ${f.price != null ? priceWord(f.price) : ''}`,
  ] });
  return frame(orient, s, { bg: BAU.cream });
}

export const chevronsP = {
  id: 'bh-chevrons-p', orient: 'portrait', name: 'Chevrons · portrait',
  blurb: 'Where the price of power is heading, as a stack of nested chevrons: pointing down in green when the coming '
       + 'hours are cheaper than now, up in red when they are dearer, and lying as flat black bars when nothing much changes.',
  render, tall: true,
};
