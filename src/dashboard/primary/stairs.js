/**
 * Stairs — after the catalogue's school stairs: the next eight hours as a
 * staircase from left to right, each step set at the height of that hour's
 * temperature, so the stair climbs through a warming afternoon and falls
 * into a cold night. The risers are the sky of the hour — yellow sun, blue
 * rain, black night, white cloud — and the treads are black. The figure
 * stands on the first step.
 */
import { frame, facts, num, euro, pad2 } from '../posters/common.js';
import { PRI, hours, skyInk, mark, foot, saunaLine, priceWord, T } from './primarykit.js';

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const list = hours(f, 8);
  const temps = list.map((h) => (Number.isFinite(h.temp) ? h.temp : f.temp));
  const lo = Math.min(...temps), hi = Math.max(...temps);
  const span = Math.max(4, hi - lo);
  const ground = 372, x0 = 40, tread = (W - 80) / 8, minH = 60, maxH = 220;
  const yOf = (t) => ground - (minH + ((t - lo) / span) * (maxH - minH));
  let s = `<rect width="${W}" height="${H}" fill="${PRI.paper}"/>`;
  list.forEach((h, i) => {
    const x = x0 + i * tread, y = yOf(temps[i]);
    const ink = skyInk(h.sky, h.night);
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${tread.toFixed(1)}" height="${(ground - y).toFixed(1)}" fill="${ink}"${ink === PRI.paper ? ` stroke="${PRI.black}" stroke-width="1.5"` : ''}/>`;
    s += `<rect x="${x.toFixed(1)}" y="${(y - 5).toFixed(1)}" width="${tread.toFixed(1)}" height="10" fill="${PRI.black}"/>`;   // the tread
    if (h.sauna) s += `<rect x="${(x + 8).toFixed(1)}" y="${(y + 10).toFixed(1)}" width="${(tread - 16).toFixed(1)}" height="14" fill="${PRI.yellow}"/>`;
    s += T(x + tread / 2, ground + 24, i === 0 ? 'NOW' : pad2(new Date(h.t).getHours()), { size: 10, weight: 700, ls: 1.6, anchor: 'middle' })
       + T(x + tread / 2, y - 14, `${num(temps[i], 0)}°`, { size: 12, weight: 700, anchor: 'middle' });
  });
  s += `<rect x="0" y="${ground}" width="${W}" height="6" fill="${PRI.black}"/>`;
  // the words
  s += mark(40, 56, f.place.toLowerCase())
     + T(40, 78, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time} · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="84" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="60" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${PRI.black}">${num(f.temp, 0)}°</text>`;
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'eight hours as steps at the height of their temperature · risers the sky: yellow sun, blue rain, black night · yellow the sauna',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: PRI.paper });
}

export const stairsL = {
  id: 'pc-stairs-l', orient: 'landscape', name: 'Stairs · landscape',
  blurb: 'The next eight hours as a staircase, each step at the height of its hour’s temperature, so the stair '
       + 'climbs through a warming afternoon and falls into a cold night. The risers are the sky of the hour — yellow '
       + 'sun, blue rain, black night — and the treads black; a yellow tread is the sauna window.',
  render,
};
