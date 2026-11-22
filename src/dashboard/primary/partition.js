/**
 * Partition — a Neo-Plasticist grid grown from the coming day.
 *
 * The next twenty-four hours are grouped into runs of the same kind — cheap
 * power (blue), fair (white), dear (red) — and the two hours of the sauna
 * window are cut out as their own yellow cell. Each run becomes a rectangle
 * whose area is its share of the day, laid down by slicing the sheet in turn
 * from the left and from the top, with black bars between. So a day of flat
 * prices is a few large fields and a spiky day a busy grid; the sheet is
 * different every day and the same day is always the same. The temperature
 * stands in the largest field.
 */
import { frame, facts, num, euro } from '../posters/common.js';
import { PRI, BAND_INK, hours, runs, onInk, mark, foot, saunaLine, priceWord, T } from './primarykit.js';

const W = 480, H = 800;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const list = hours(f, 24);
  const rs = runs(list, (h) => (h.sauna ? 'sauna' : h.band));
  const total = list.length;
  let region = { x: 30, y: 128, w: W - 60, h: 560 };
  const cells = [];
  rs.forEach((r, i) => {
    const share = r.hours.length / total;
    const remaining = rs.slice(i).reduce((a, q) => a + q.hours.length, 0) / total;
    const frac = i === rs.length - 1 ? 1 : share / remaining;            // of what is left
    const vertical = region.w >= region.h;                                 // cut the longer way
    let cell;
    if (vertical) { const w = region.w * frac; cell = { ...region, w }; region = { ...region, x: region.x + w, w: region.w - w }; }
    else { const h = region.h * frac; cell = { ...region, h }; region = { ...region, y: region.y + h, h: region.h - h }; }
    cells.push({ ...cell, run: r });
  });

  let s = `<rect width="${W}" height="${H}" fill="${PRI.paper}"/>`;
  const ink = (r) => (r.key === 'sauna' ? PRI.yellow : BAND_INK[r.key]);
  for (const c of cells) s += `<rect x="${c.x.toFixed(1)}" y="${c.y.toFixed(1)}" width="${c.w.toFixed(1)}" height="${c.h.toFixed(1)}" fill="${ink(c.run)}"/>`;
  for (const c of cells) s += `<rect x="${c.x.toFixed(1)}" y="${c.y.toFixed(1)}" width="${c.w.toFixed(1)}" height="${c.h.toFixed(1)}" fill="none" stroke="${PRI.black}" stroke-width="10"/>`;
  // the current hour: a black dot in the first cell's corner
  const c0 = cells[0];
  s += `<circle cx="${(c0.x + 26).toFixed(1)}" cy="${(c0.y + 26).toFixed(1)}" r="9" fill="${PRI.black}"/>`;
  // the temperature in the largest field
  const big = cells.reduce((a, c) => (c.w * c.h > a.w * a.h ? c : a));
  const size = Math.min(110, big.w * 0.42, big.h * 0.8);
  s += `<text x="${(big.x + big.w / 2).toFixed(1)}" y="${(big.y + big.h / 2 + size * 0.36).toFixed(1)}" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="${size.toFixed(0)}" font-weight="700" letter-spacing="-2" text-anchor="middle" fill="${onInk(ink(big.run))}">${num(f.temp, 0)}°</text>`;

  // the words
  s += mark(30, 60, f.place.toLowerCase())
     + T(30, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(30, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += T(W - 30, 84, f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', { size: 13, weight: 500, anchor: 'end' })
     + T(W - 30, 102, `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`, { size: 13, weight: 500, anchor: 'end' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'a field per run of hours, as large as its share: blue cheap, white fair, red dear, yellow the sauna',
    'the dot is now · the temperature stands in the largest field'
  ] });
  return frame('portrait', s, { bg: PRI.paper });
}

export const partitionP = {
  id: 'pc-partition-p', orient: 'portrait', name: 'Partition · portrait',
  blurb: 'A Neo-Plasticist grid grown from the coming day: the next twenty-four hours grouped into runs of cheap '
       + '(blue), fair (white) and dear (red) power, the sauna window cut out in yellow, each run a field as large '
       + 'as its share of the day, sliced in turn from the left and the top with black bars between.',
  render,
};
