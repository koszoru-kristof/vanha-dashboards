/**
 * Dot wall — the next two days as a wall of dots, eight to a row, an hour
 * each, reading left to right and down. A dot is blue where power is
 * cheap, white where fair, red where dear; the sauna window's dots are
 * yellow; hours not yet priced are small black points. Night hours wear a
 * black ring, so the wall shows the days and nights as bands. The dot for
 * this hour is the large one.
 */
import { frame, facts, num, euro } from '../posters/common.js';
import { PRI, hours, BAND_INK, mark, foot, saunaLine, priceWord, T } from './primarykit.js';

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const list = hours(f, 48);
  const cols = 8, x0 = 116, y0 = 112, px = 82, py = 50, r = 19;
  let s = `<rect width="${W}" height="${H}" fill="${PRI.paper}"/>`;
  list.forEach((h, i) => {
    const cx = x0 + (i % cols) * px, cy = y0 + Math.floor(i / cols) * py;
    if (h.band === 'none') { s += `<circle cx="${cx}" cy="${cy}" r="5" fill="${PRI.black}"/>`; return; }
    const ink = h.sauna ? PRI.yellow : BAND_INK[h.band];
    const rr = h.now ? r + 8 : r;
    s += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${ink}" stroke="${PRI.black}" stroke-width="${h.night ? 4 : ink === PRI.paper ? 1.5 : 0}"/>`;
  });
  // the hours at the head of the rows
  for (let rIdx = 0; rIdx < 6; rIdx++) {
    const h = list[rIdx * cols];
    s += T(x0 - 52, y0 + rIdx * py + 4, new Date(h.t).getHours().toString().padStart(2, '0'), { size: 10.5, weight: 700, ls: 1.5, anchor: 'end' });
  }
  // the words
  s += mark(40, 56, f.place.toLowerCase())
     + T(40, 78, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time} · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="84" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="60" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${PRI.black}">${num(f.temp, 0)}°</text>`;
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the next 48 hours as dots, eight to a row: blue cheap, white fair, red dear, yellow the sauna · ringed at night · small where unpriced',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: PRI.paper });
}

export const dotwallL = {
  id: 'pc-dotwall-l', orient: 'landscape', name: 'Dot wall · landscape',
  blurb: 'The next two days as a wall of dots, an hour each, eight to a row: blue where power is cheap, white fair, '
       + 'red dear, yellow the sauna window, small black points where not yet priced. Night hours wear a black ring, '
       + 'so the wall shows days and nights as bands; this hour is the large dot.',
  render,
};
