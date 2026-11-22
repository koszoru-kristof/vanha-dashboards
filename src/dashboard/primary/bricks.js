/**
 * Bricks — the catalogue's scattered bricks, one for each of the next
 * twenty-four hours, thrown across the sheet in a scatter that is fixed
 * for the day. A brick is as long as its hour's power price and coloured
 * by it — blue cheap, white fair, red dear — black through the night,
 * yellow for the sauna window, and a thin black thread joins them in time
 * order, so the eye can walk the day. This hour's brick is outlined.
 */
import { frame, facts, num, euro, rng } from '../posters/common.js';
import { PRI, hours, level, BAND_INK, daySeed, mark, foot, saunaLine, priceWord, T } from './primarykit.js';

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const list = hours(f, 24);
  const R = rng(daySeed(f));
  const placed = [];
  const area = { x0: 60, x1: 740, y0: 116, y1: 396 };
  for (const h of list) {
    const w = 36 + 90 * level(h.price), hgt = 26;
    let best = null;
    for (let k = 0; k < 40; k++) {
      const x = area.x0 + R() * (area.x1 - area.x0 - w), y = area.y0 + R() * (area.y1 - area.y0 - hgt);
      const clash = placed.some((b) => x < b.x + b.w + 6 && x + w + 6 > b.x && y < b.y + b.h + 6 && y + hgt + 6 > b.y);
      if (!clash) { best = { x, y }; break; }
      if (!best || k === 39) best = best ?? { x, y };
    }
    placed.push({ ...best, w, h: hgt, rot: (R() - 0.5) * 14, hour: h });
  }
  let s = `<rect width="${W}" height="${H}" fill="${PRI.paper}"/>`;
  // the thread, in time order
  s += `<path d="M${placed.map((b) => `${(b.x + b.w / 2).toFixed(1)},${(b.y + b.h / 2).toFixed(1)}`).join(' L')}" fill="none" stroke="${PRI.black}" stroke-width="1.5"/>`;
  for (const b of placed) {
    const h = b.hour;
    const ink = h.sauna ? PRI.yellow : h.night && h.band !== 'dear' && h.band !== 'cheap' ? PRI.black : BAND_INK[h.band];
    s += `<rect x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h}" fill="${ink}" stroke="${PRI.black}" stroke-width="${h.now ? 5 : 1.5}" transform="rotate(${b.rot.toFixed(1)} ${(b.x + b.w / 2).toFixed(1)} ${(b.y + b.h / 2).toFixed(1)})"/>`;
  }
  // the words
  s += mark(40, 56, f.place.toLowerCase())
     + T(40, 78, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time} · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="84" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="60" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${PRI.black}">${num(f.temp, 0)}°</text>`;
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'a brick an hour, as long as its price: blue cheap, white fair, red dear, black night, yellow the sauna · this hour outlined',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: PRI.paper });
}

export const bricksL = {
  id: 'pc-bricks-l', orient: 'landscape', name: 'Bricks · landscape',
  blurb: 'Scattered bricks, one per hour of the next twenty-four, in a scatter fixed for the day: each as long as '
       + 'its hour’s power price and coloured by it — blue cheap, white fair, red dear, black through the night, '
       + 'yellow the sauna window — joined by a thin thread in time order. This hour’s brick is outlined.',
  render,
};
