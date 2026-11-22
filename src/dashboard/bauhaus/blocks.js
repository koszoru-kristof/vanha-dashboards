/**
 * Blocks — the next six hours as a row of blocks in isometric view, after
 * the collection's descending blocks: each block as tall as its hour's
 * price, its top in the price's colour — green cheap, mustard fair, red
 * dear — its sides dark. The hour stands under each block; the sauna's
 * hours carry a white dot. A cheap evening steps down to the right.
 */
import { frame, facts, num, euro, hourStart, HOUR, pad2 } from '../posters/common.js';
import { BAU, level, priceInk, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 800, H = 480;
const DARK = { [BAU.green]: '#2f5a3d', [BAU.mustard]: '#a67c19', [BAU.red]: '#8f2114', [BAU.blue]: '#1c3560', [BAU.grey]: '#6e6c66' };

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const h0 = hourStart(f.now);
  const price = new Map([...f.today, ...f.tomorrow].map((p) => [p.start, p.price]));
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  const n = 6, a = 72, dx = a * 0.866, dy = a * 0.5, x0 = 100, base = 372;
  s += `<rect x="0" y="${base + 8}" width="${W}" height="5" fill="${BAU.black}"/>`;
  for (let i = 0; i < n; i++) {
    const t = h0 + i * HOUR, p = price.get(t);
    const h = 30 + 150 * level(p);
    const ink = p == null ? BAU.grey : priceInk(p);
    const bx = x0 + i * (2 * dx - 6), by = base - i * 0;                    // a row, side by side
    const top = by - h;
    const P = { t: [bx, top - 2 * dy], l: [bx - dx, top - dy], r: [bx + dx, top - dy], m: [bx, top], bl: [bx - dx, by - dy], br: [bx + dx, by - dy], b: [bx, by] };
    const poly = (pts, fill) => `<path d="M${pts.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' L')} Z" fill="${fill}" stroke="${BAU.black}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += poly([P.l, P.m, P.b, P.bl], DARK[ink] ?? BAU.black) + poly([P.m, P.r, P.br, P.b], BAU.black) + poly([P.t, P.r, P.m, P.l], ink);
    if (S.start != null && t >= S.start && t < S.start + 2 * HOUR) s += `<circle cx="${bx}" cy="${(top - dy).toFixed(1)}" r="7" fill="${BAU.white}"/>`;
    s += T(bx, base + 40, i === 0 ? 'NOW' : pad2(new Date(t).getHours()), { size: 11, weight: 700, ls: 2.4, anchor: 'middle' });
  }

  // the words
  s += mark(40, 56, f.place.toLowerCase())
     + T(40, 78, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time} · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="84" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="60" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the next six hours as blocks, as tall as their price · green cheap, mustard fair, red dear · a white dot for the sauna',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: BAU.cream });
}

export const blocksL = {
  id: 'bh-blocks-l', orient: 'landscape', name: 'Blocks · landscape',
  blurb: 'The next six hours as a row of blocks in isometric view, after the collection’s descending blocks: each '
       + 'as tall as its hour’s price, its top in the price’s colour, its sides dark, the sauna’s hours with a white '
       + 'dot. A cheap evening steps down to the right.',
  render,
};
