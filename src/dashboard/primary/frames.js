/**
 * Frames — after the catalogue's Temporal Rupture: concentric frames, the
 * outermost this hour and each one inward the next, coloured by the power
 * price of that hour (blue cheap, white fair, red dear, black through the
 * night, yellow for the sauna window). The lower half of the stack is
 * shifted sideways by the wind, so a still day is whole and a gale breaks
 * it. The temperature stands in the head.
 */
import { frame, facts, num, euro, uid, SIZE } from '../posters/common.js';
import { PRI, hours, BAND_INK, mark, foot, saunaLine, priceWord, T } from './primarykit.js';


function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const u = W / 480;                                                       // 1 on the 480 sheet
  const f = facts(ctx);
  const S = f.sauna;
  const list = hours(f, 8);
  const wind = Number.isFinite(f.wind) ? f.wind : 3;
  const shift = Math.round(Math.min(16, wind) * 2.4 * u);
  const box = { x: 40 + (W - 480) / 4, y: 150, w: 400 + (W - 480) / 2, h: 520 }, step = 20 + (W - 480) / 40;   // room on the right for the break
  const ids = { up: uid('fu'), down: uid('fd') };
  const mid = box.y + box.h / 2;
  let stack = '';
  list.forEach((h, i) => {
    const inset = i * step;
    const ink = h.sauna ? PRI.yellow : h.night && h.band === 'fair' ? PRI.black : BAND_INK[h.band];
    stack += `<rect x="${box.x + inset}" y="${box.y + inset}" width="${box.w - 2 * inset}" height="${box.h - 2 * inset}" fill="${ink}" stroke="${PRI.black}" stroke-width="3"/>`;
  });
  const inner = list.length * step;
  stack += `<rect x="${box.x + inner}" y="${box.y + inner}" width="${box.w - 2 * inner}" height="${box.h - 2 * inner}" fill="${PRI.paper}" stroke="${PRI.black}" stroke-width="3"/>`;
  let s = `<defs><clipPath id="${ids.up}"><rect x="0" y="0" width="${W}" height="${mid}"/></clipPath><clipPath id="${ids.down}"><rect x="0" y="${mid}" width="${W}" height="${H - mid}"/></clipPath></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${PRI.paper}"/>`;
  s += `<g clip-path="url(#${ids.up})">${stack}</g><g clip-path="url(#${ids.down})" transform="translate(${shift} 0)">${stack}</g>`;
  // the temperature, in the head
  s += `<text x="${W - box.x}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="${64 * u}" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${PRI.black}">${num(f.temp, 0)}°</text>`;
  // the words
  s += mark(box.x, 60, f.place.toLowerCase())
     + T(box.x, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(box.x, 102, `${f.out.head.toLowerCase()} · wind ${num(wind, 0)} m/s`, { size: 13, weight: 500 });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'frames from now inward, an hour each: blue cheap, white fair, red dear, black night',
    ['yellow the sauna', 'the break is the wind', f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', saunaLine(S)].join(' · '),
  ] });
  return frame(orient, s, { bg: PRI.paper });
}

export const framesP = {
  id: 'pc-frames-p', orient: 'portrait', name: 'Frames · portrait',
  blurb: 'Concentric frames, the outermost this hour and each one inward the next, coloured by that hour’s power '
       + 'price — blue cheap, white fair, red dear, black through the night, yellow the sauna window. The lower half '
       + 'is shifted by the wind, so a still day is whole and a gale breaks it.',
  render, tall: true,
};
