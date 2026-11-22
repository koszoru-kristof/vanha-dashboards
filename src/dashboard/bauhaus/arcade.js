/**
 * Arcade — a row of five arches, and through each the sky as it will be:
 * now, in three hours, in six, nine and twelve. Mustard for sun, blue for
 * rain with white streaks, white for snow, grey for fog, black for night
 * with a small moon. The hour stands under each opening; the day is cut
 * into the entablature above, in cream on black.
 */
import { frame, facts, num, euro, hourStart, HOUR, pad2 } from '../posters/common.js';
import { kind as kindOf, sunTimes } from '../../weather.js';
import { BAU, skyInk, priceWord, foot, saunaLine, T } from './bauhauskit.js';

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const h0 = hourStart(f.now);
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  // the entablature, with the day cut into it
  s += `<rect x="0" y="40" width="${W}" height="64" fill="${BAU.black}"/>`;
  s += T(40, 80, f.place.toUpperCase(), { size: 20, weight: 700, ls: 6, fill: BAU.cream })
     + T(W - 40, 80, `${num(f.temp, 0)}°  ·  ${f.out.head.toUpperCase()}  ·  ${f.weekday.slice(0, 3).toUpperCase()} ${f.time}`, { size: 13, weight: 600, ls: 2, fill: BAU.cream, anchor: 'end' });

  // the arches
  const n = 5, col = 24, open = (W - 80 - (n + 1) * col) / n, top = 104, base = 372, r = open / 2;
  for (let i = 0; i <= n; i++) s += `<rect x="${40 + i * (open + col)}" y="${top}" width="${col}" height="${base - top}" fill="${BAU.black}"/>`;
  s += `<rect x="0" y="${base}" width="${W}" height="10" fill="${BAU.black}"/>`;
  for (let i = 0; i < n; i++) {
    const t = h0 + i * 3 * HOUR, row = f.fc.at(t + HOUR / 2), sun = sunTimes(t);
    const night = sun ? t + HOUR / 2 < sun.rise || t + HOUR / 2 > sun.set : false;
    const k = row ? kindOf(row.sym) : 'cloudy';
    const x = 40 + col + i * (open + col);
    const ink = skyInk(k, { night });
    // the spandrels stay black: an arched opening cut from the wall
    s += `<rect x="${x}" y="${top}" width="${open}" height="${r + 20}" fill="${BAU.black}"/>`;
    s += `<path d="M${x},${base} L${x},${top + r + 20} A${r},${r} 0 0 1 ${x + open},${top + r + 20} L${x + open},${base} Z" fill="${ink}"/>`;
    if (['rain', 'showers', 'thunder', 'sleet'].includes(k)) for (let j = 0; j < 5; j++) { const lx = x + 14 + j * (open / 5); s += `<line x1="${lx}" y1="${top + r + 40}" x2="${lx - 16}" y2="${base - 24}" stroke="${BAU.white}" stroke-width="3" stroke-dasharray="12 10"/>`; }
    if (k === 'snow') for (let j = 0; j < 7; j++) s += `<circle cx="${x + 16 + ((j * 37) % (open - 32))}" cy="${top + r + 50 + ((j * 53) % (base - top - r - 90))}" r="4" fill="${BAU.black}"/>`;
    if (k === 'fog') for (let y = top + r + 44; y < base - 10; y += 26) s += `<rect x="${x}" y="${y}" width="${open}" height="8" fill="${BAU.cream}"/>`;
    if (night && (k === 'clear' || k === 'partly')) s += `<circle cx="${x + open * 0.6}" cy="${top + r + 30}" r="16" fill="${BAU.cream}"/>`;
    s += T(x + open / 2, base + 34, i === 0 ? 'NOW' : pad2(new Date(t).getHours()), { size: 11, weight: 700, ls: 2.4, anchor: 'middle' });
  }

  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'through each arch the sky as it will be: now, then every three hours',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: BAU.cream });
}

export const arcadeL = {
  id: 'bh-arcade-l', orient: 'landscape', name: 'Arcade · landscape',
  blurb: 'A row of five arches, and through each the sky as it will be — now, in three hours, in six, nine and '
       + 'twelve: mustard sun, blue rain with white streaks, white snow, grey fog, black night with a small moon. The '
       + 'day is cut into the entablature above.',
  render,
};
