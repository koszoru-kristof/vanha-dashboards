/**
 * Shutters — the catalogue's horizontal stripes, one for each of the next
 * twenty-four hours from the top down. A stripe's colour is its air: blue
 * at or below freezing, white when mild, yellow when warm, red when hot.
 * Night hours are drawn shorter, so the silhouette steps in where it is
 * dark and the shape of the day is there before you read a figure. Rain
 * hours carry a blue drop at the end. The temperature runs up the right
 * edge in black.
 */
import { frame, facts, num, euro, SIZE } from '../posters/common.js';
import { PRI, hours, tempInk, mark, foot, saunaLine, priceWord, T } from './primarykit.js';


function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const u = W / 480;                                                       // 1 on the 480 sheet
  const f = facts(ctx);
  const S = f.sauna;
  const list = hours(f, 24);
  const top = 130, bottom = 690, pitch = (bottom - top) / 24, gap = 5;
  let s = `<rect width="${W}" height="${H}" fill="${PRI.paper}"/>`;
  list.forEach((h, i) => {
    const y = top + i * pitch, len = (h.night ? 220 : 320) * u;
    const ink = tempInk(h.temp);
    s += `<rect x="30" y="${y.toFixed(1)}" width="${len}" height="${(pitch - gap).toFixed(1)}" fill="${ink}"${ink === PRI.paper ? ` stroke="${PRI.black}" stroke-width="1.5"` : ''}/>`;
    if (h.mm >= 0.2) s += `<circle cx="${30 + len + 14}" cy="${(y + (pitch - gap) / 2).toFixed(1)}" r="${Math.min(8, 3 + h.mm * 2).toFixed(1)}" fill="${PRI.blue}"/>`;
    if (h.sauna) s += `<rect x="18" y="${y.toFixed(1)}" width="6" height="${(pitch - gap).toFixed(1)}" fill="${PRI.yellow}"/>`;
  });
  s += `<rect x="30" y="${top - 8}" width="${320 * u}" height="4" fill="${PRI.black}"/>`;     // now, on top
  // the temperature, up the right edge
  s += `<text transform="translate(${W - 16} ${bottom}) rotate(-90)" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="${108 * u}" font-weight="700" letter-spacing="-3" fill="${PRI.black}">${num(f.temp, 0)}°</text>`;
  // the words
  s += mark(30, 60, f.place.toLowerCase())
     + T(30, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(30, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'an hour a stripe, from now down: blue freezing, white mild, yellow warm, red hot · short at night',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)} (the yellow tab)`, 'a blue drop where it rains'].join(' · '),
  ] });
  return frame(orient, s, { bg: PRI.paper });
}

export const shuttersP = {
  id: 'pc-shutters-p', orient: 'portrait', name: 'Shutters · portrait',
  blurb: 'Horizontal stripes, one for each of the next twenty-four hours from the top down, coloured by the air — '
       + 'blue freezing, white mild, yellow warm, red hot — and drawn shorter where it is dark, so the silhouette steps '
       + 'in for the night. A blue drop marks a rainy hour, a yellow tab the sauna window.',
  render, tall: true,
};
