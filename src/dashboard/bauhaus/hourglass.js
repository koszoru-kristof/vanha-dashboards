/**
 * Hourglass — the wait for the sauna as sand: full in the upper bulb with
 * eight hours or more to go, running down through the day, empty when the
 * window opens. Two black-rimmed bulbs between black caps, green sand, a
 * thin thread of it falling while the wait runs.
 */
import { frame, facts, num, euro, uid, HOUR, SIZE } from '../posters/common.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const ex = W - 480;                 // the extra width of the 3:4 sheet; 0 on the 480 poster
  const f = facts(ctx);
  const S = f.sauna;
  const left = S.state === 'now' ? 0 : S.start != null ? Math.max(0, (S.start - f.now) / HOUR) : null;
  const u = left == null ? 1 : Math.min(1, left / 8);                 // how much sand is still above
  const ids = { up: uid('hu'), down: uid('hd') };
  const G = { x: W / 2, top: 190, waist: 400, bottom: 610, half: 130 + ex / 4, neck: 9 };   // broader bulbs on the wider sheet
  const upper = `M${G.x - G.half},${G.top} L${G.x + G.half},${G.top} L${G.x + G.neck},${G.waist} L${G.x - G.neck},${G.waist} Z`;
  const lower = `M${G.x - G.neck},${G.waist} L${G.x + G.neck},${G.waist} L${G.x + G.half},${G.bottom} L${G.x - G.half},${G.bottom} Z`;
  let s = `<defs><clipPath id="${ids.up}"><path d="${upper}"/></clipPath><clipPath id="${ids.down}"><path d="${lower}"/></clipPath></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  // the sand: a level in the upper bulb, a heap in the lower
  const level = G.waist - (G.waist - G.top - 14) * u;
  s += `<g clip-path="url(#${ids.up})"><rect x="0" y="${level.toFixed(1)}" width="${W}" height="${(G.waist - level).toFixed(1)}" fill="${BAU.green}"/></g>`;
  const heap = (1 - u) * 150;
  s += `<g clip-path="url(#${ids.down})"><path d="M${G.x - G.half - 70},${G.bottom} L${G.x + G.half + 70},${G.bottom} L${G.x + G.half + 70},${G.bottom - heap * 0.55} Q${G.x},${G.bottom - heap * 1.9} ${G.x - G.half - 70},${G.bottom - heap * 0.55} Z" fill="${BAU.green}"/></g>`;
  if (u > 0 && u < 1) s += `<rect x="${G.x - 2}" y="${G.waist}" width="4" height="${(G.bottom - G.waist - heap * 0.9).toFixed(1)}" fill="${BAU.green}"/>`;
  // the glass and the caps
  s += `<path d="${upper}" fill="none" stroke="${BAU.black}" stroke-width="9" stroke-linejoin="round"/><path d="${lower}" fill="none" stroke="${BAU.black}" stroke-width="9" stroke-linejoin="round"/>`;
  s += `<rect x="${G.x - G.half - 30}" y="${G.top - 30}" width="${G.half * 2 + 60}" height="26" rx="4" fill="${BAU.black}"/>`
     + `<rect x="${G.x - G.half - 30}" y="${G.bottom + 4}" width="${G.half * 2 + 60}" height="26" rx="4" fill="${BAU.black}"/>`;

  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(40, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  const say = S.state === 'now' ? 'sauna now' : left == null ? 'no window yet'
    : left < 1 ? 'sauna within the hour' : `sauna in ${Math.round(left)} hour${Math.round(left) === 1 ? '' : 's'}`;
  s += mark(W / 2, 690, say, { size: 28, anchor: 'middle' })
     + T(W / 2, 714, [S.start != null ? `${S.tomorrow ? 'tomorrow ' : ''}at ${S.at}` : null, S.cost != null ? `about ${euro(S.cost)}` : null, f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : null].filter(Boolean).join(' · '), { size: 12, weight: 500, anchor: 'middle' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: ['the sand is the wait for the sauna: full with eight hours to go, empty when the window opens'] });
  return frame(orient, s, { bg: BAU.cream });
}

export const hourglassP = {
  id: 'bh-hourglass-p', orient: 'portrait', name: 'Hourglass · portrait',
  blurb: 'The wait for the sauna as sand: full in the upper bulb with eight hours or more to go, running down through '
       + 'the day, empty when the window opens. Two black-rimmed bulbs between black caps, green sand, a thin thread '
       + 'of it falling while the wait runs.',
  render, tall: true,
};
