/**
 * Moon — the moon as it stands tonight, from the calendar's own arithmetic:
 * a great disc, black on its dark side and white where the sun lights it,
 * waxing from the right and waning from the left, so the poster turns over
 * the month. On a green ground, in the way of the collection's eclipsed
 * circles. The temperature stands beside it; the phase is named beneath.
 */
import { frame, facts, num, euro, hm, SIZE } from '../posters/common.js';
import { BAU, moonPhase, moonLit, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const e = W - 480;                                               // the extra width of a 3:4 sheet
  const f = facts(ctx);
  const S = f.sauna;
  const { p, name } = moonPhase(f.now);
  let s = `<rect width="${W}" height="${H}" fill="${BAU.green}"/>`;
  const C = { x: W / 2, y: 380 + e / 12, r: 176 + e / 4 };   // a wider sheet, a greater moon
  s += `<circle cx="${C.x}" cy="${C.y}" r="${C.r}" fill="${BAU.black}"/>`;
  if (p > 0.02 && p < 0.98) s += `<path d="${moonLit(C.x, C.y, C.r, p)}" fill="${BAU.white}"/>`;
  s += `<circle cx="${C.x}" cy="${C.y}" r="${C.r}" fill="none" stroke="${BAU.black}" stroke-width="3"/>`;

  // the words
  s += mark(40, 60, f.place.toLowerCase(), { fill: BAU.cream })
     + T(40, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500, fill: BAU.cream })
     + T(40, 102, f.out.head.toLowerCase(), { size: 13, weight: 500, fill: BAU.cream });
  s += `<text x="${W - 40}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.cream}">${num(f.temp, 0)}°</text>`;
  s += mark(W / 2, 630 + e / 6, name, { fill: BAU.cream, size: 30, anchor: 'middle' })
     + T(W / 2, 656 + e / 6, f.sun ? `sun ${hm(f.sun.rise)} to ${hm(f.sun.set)} · ${Math.round(p * 29.53)} days into the month` : `${Math.round(p * 29.53)} days into the month`, { size: 12, weight: 500, fill: BAU.cream, anchor: 'middle' });
  s += foot(W, H, { left: f.place.toUpperCase(), fill: BAU.cream, right: String(f.d.getFullYear()), lines: [
    'the moon as it stands tonight, lit from the right as it waxes',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame(orient, s, { bg: BAU.green });
}

export const moonP = {
  id: 'bh-moon-p', orient: 'portrait', name: 'Moon · portrait',
  blurb: 'The moon as it stands tonight, from the calendar’s own arithmetic: a great disc, black on its dark side and '
       + 'white where the sun lights it, waxing from the right and waning from the left, so the poster turns over the '
       + 'month. The temperature stands beside it; the phase is named beneath.',
  render, tall: true,
};
