/**
 * Keys — the coming day as a keyboard: twenty-four keys, an hour each,
 * from now at the left. Daylight hours are white keys and the night's are
 * black ones, so the keyboard shows where the dark falls. The sauna
 * window's keys are yellow, this hour's key is red, and a blue key is an
 * hour of rain. The temperature stands above the keys.
 */
import { frame, facts, num, euro, pad2 } from '../posters/common.js';
import { PRI, hours, mark, foot, saunaLine, priceWord, T } from './primarykit.js';

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const list = hours(f, 24);
  const x0 = 40, kw = (W - 80) / 24, top = 150, bottom = 356;
  let s = `<rect width="${W}" height="${H}" fill="${PRI.paper}"/>`;
  s += `<rect x="${x0 - 6}" y="${top - 10}" width="${W - 80 + 12}" height="${bottom - top + 20}" fill="${PRI.black}"/>`;
  list.forEach((h, i) => {
    const x = x0 + i * kw;
    const wet = ['rain', 'showers', 'thunder', 'sleet'].includes(h.sky);
    const ink = h.now ? PRI.red : h.sauna ? PRI.yellow : wet ? PRI.blue : h.night ? PRI.black : PRI.paper;
    const short = h.night && !h.now && !h.sauna && !wet;                 // a black key is the short one
    s += `<rect x="${(x + 1.5).toFixed(1)}" y="${top}" width="${(kw - 3).toFixed(1)}" height="${short ? (bottom - top) * 0.62 : bottom - top}" rx="3" fill="${ink}"${short ? ` stroke="${PRI.paper}" stroke-width="1.5"` : ''}/>`;
    s += T(x + kw / 2, bottom + 28, i === 0 ? 'NOW' : pad2(new Date(h.t).getHours()), { size: 9.5, weight: 700, ls: 1.4, anchor: 'middle' });
  });
  // the words
  s += mark(40, 56, f.place.toLowerCase())
     + T(40, 78, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time} · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="130" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="110" font-weight="700" letter-spacing="-4" text-anchor="end" fill="${PRI.black}">${num(f.temp, 0)}°</text>`;
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'a key an hour from now: white by day, black at night, blue rain, yellow the sauna window, red this hour',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: PRI.paper });
}

export const keysL = {
  id: 'pc-keys-l', orient: 'landscape', name: 'Keys · landscape',
  blurb: 'The coming day as a keyboard: twenty-four keys, an hour each, from now at the left — white by day, black '
       + 'at night so the keyboard shows where the dark falls, blue for an hour of rain, yellow the sauna window, red '
       + 'this hour.',
  render,
};
