/**
 * Moving circle — a field of upright black lines, the day from midnight at
 * the left to midnight at the right, and one disc laid over it where the
 * hour now stands, in the colour of the sky. The lines are green through
 * the hours of daylight and black in the dark. A red band marks the sauna
 * window. The disc moves across the sheet through the day and back to the
 * left edge at midnight.
 */
import { frame, facts, num, euro, dayStart, HOUR } from '../posters/common.js';
import { BAU, skyInk, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const x0 = 40, x1 = W - 40, top = 120, bottom = 380;
  const d0 = dayStart(f.now);
  const X = (t) => x0 + ((x1 - x0) * Math.max(0, Math.min(24 * HOUR, t - d0))) / (24 * HOUR);
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  // the sauna window, as a red band behind the lines
  if (S.start != null) {
    const sd = dayStart(S.start) === d0;                       // today, not tomorrow
    if (sd) s += `<rect x="${X(S.start).toFixed(1)}" y="${top - 12}" width="${(X(S.start + 2 * HOUR) - X(S.start)).toFixed(1)}" height="${bottom - top + 24}" fill="${BAU.red}"/>`;
  }
  // the lines: one every quarter hour, green by day
  for (let i = 0; i <= 96; i++) {
    const t = d0 + (i / 96) * 24 * HOUR;
    const day = f.sun ? t >= f.sun.rise && t <= f.sun.set : false;
    s += `<rect x="${(X(t) - 1.5).toFixed(1)}" y="${top}" width="3" height="${bottom - top}" fill="${day ? BAU.green : BAU.black}"/>`;
  }
  // the disc, where the hour stands
  const cx = X(f.now);
  s += `<circle cx="${cx.toFixed(1)}" cy="${(top + bottom) / 2}" r="86" fill="${skyInk(f.sky ?? 'cloudy', { night: f.night })}" stroke="${BAU.cream}" stroke-width="8"/>`;
  ['00', '06', '12', '18', '24'].forEach((h, i) => { s += T(x0 + ((x1 - x0) * i) / 4, bottom + 26, h, { size: 10, weight: 700, ls: 2, anchor: 'middle' }); });

  // the words
  s += mark(40, 56, f.place.toLowerCase())
     + T(40, 78, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time} · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="84" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="60" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the day from midnight to midnight · green lines by daylight · the disc is now, in the sky’s colour · the red band the sauna',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: BAU.cream });
}

export const movingL = {
  id: 'bh-moving-l', orient: 'landscape', name: 'Moving circle · landscape',
  blurb: 'A field of upright lines, the day from midnight at the left to midnight at the right, green through the '
       + 'hours of daylight; one disc laid over it where the hour now stands, in the colour of the sky; a red band '
       + 'for the sauna window. The disc crosses the sheet through the day.',
  render,
};
