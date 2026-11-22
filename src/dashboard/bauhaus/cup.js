/**
 * Cup — after the collection's cup with its scent rising: a green cup on
 * its saucer, and above it the steam as black discs, one for every twenty-five
 * points of humidity in the air outside, so a damp foggy morning steams
 * and a dry June afternoon barely breathes. The temperature stands beside.
 */
import { frame, facts, num, euro, SIZE } from '../posters/common.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const ex = W - 480;                 // the extra width of the 3:4 sheet; 0 on the 480 poster
  const f = facts(ctx);
  const S = f.sauna;
  const rh = Number.isFinite(f.rh) ? f.rh : 70;
  const puffs = Math.max(1, Math.min(4, Math.round(rh / 25)));
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  // the cup, its handle and its saucer
  // on the wider sheet the cup grows and moves right, so cup and handle sit centred
  const C = { x: 220 + ex * 0.3, y: 520, r: 130 + ex / 6 };
  const k = C.r / 130;                // the cup's own scale, 1 on the 480 poster
  s += `<path d="M${C.x - C.r},${C.y} A${C.r},${C.r} 0 0 0 ${C.x + C.r},${C.y} Z" fill="${BAU.green}"/>`;
  s += `<path d="M${C.x + C.r - 10 * k},${C.y + 30 * k} A${54 * k},${54 * k} 0 1 1 ${C.x + C.r - 10 * k},${C.y + 108 * k}" fill="none" stroke="${BAU.green}" stroke-width="${22 * k}"/>`;
  s += `<rect x="${C.x - C.r - 30 * k}" y="${C.y + C.r + 6}" width="${C.r * 2 + 60 * k}" height="14" rx="7" fill="${BAU.black}"/>`;
  // the steam
  for (let i = 0; i < puffs; i++) {
    const r = (64 - i * 9) * k, cy = C.y - 110 - i * 92, cx = C.x + (i % 2 ? 44 : -20) * k + i * 6;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${BAU.black}"/>`;
  }
  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(40, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  s += mark(W - 40, 690 + ex / 4, `humidity ${Math.round(rh)} %`, { size: 24, anchor: 'end' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the steam rises with the damp in the air outside, a puff for each twenty-five points',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame(orient, s, { bg: BAU.cream });
}

export const cupP = {
  id: 'bh-cup-p', orient: 'portrait', name: 'Cup · portrait',
  blurb: 'After the collection’s cup with its scent rising: a green cup on its saucer, and above it the steam as black '
       + 'discs, one for every twenty-five points of humidity outside, so a damp foggy morning steams and a dry June '
       + 'afternoon barely breathes.',
  render, tall: true,
};
