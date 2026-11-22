/**
 * Week — the six days ahead as a row of discs, each the colour of its
 * day's sky — mustard sun, blue rain with streaks, white snow, grey fog,
 * slate cloud — with the day's high written in it and its name beneath.
 * Today wears a ring. Nothing else: a week you can read from the sofa.
 */
import { frame, facts, num, euro } from '../posters/common.js';
import { days } from '../../weather.js';
import { BAU, skyInk, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 800, H = 480;
const onInk = (hex) => ([BAU.white, BAU.mustard, '#e0b64a', BAU.grey].includes(hex) ? BAU.black : BAU.cream);

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const list = days(f.fc, f.now, 6);
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  const n = Math.max(1, list.length), step = Math.min(124, (W - 120) / n), x0 = W / 2 - ((n - 1) * step) / 2, cy = 262, r = 50;
  list.forEach((d, i) => {
    const x = x0 + i * step, ink = skyInk(d.kind);
    s += `<circle cx="${x.toFixed(1)}" cy="${cy}" r="${r}" fill="${ink}"${ink === BAU.white ? ` stroke="${BAU.black}" stroke-width="3"` : ''}/>`;
    if (['rain', 'showers', 'thunder', 'sleet'].includes(d.kind) && d.mm >= 0.5) for (let j = -2; j <= 2; j++) s += `<line x1="${(x + j * 16 + 4).toFixed(1)}" y1="${cy + 14}" x2="${(x + j * 16 - 4).toFixed(1)}" y2="${cy + 40}" stroke="${BAU.white}" stroke-width="3" stroke-linecap="round"/>`;
    if (i === 0) s += `<circle cx="${x.toFixed(1)}" cy="${cy}" r="${r + 10}" fill="none" stroke="${BAU.black}" stroke-width="3"/>`;
    s += T(x.toFixed(1), cy + (['rain', 'showers', 'thunder', 'sleet'].includes(d.kind) && d.mm >= 0.5 ? -6 : 8), `${num(d.max, 0)}°`, { size: 24, weight: 700, anchor: 'middle', fill: onInk(ink) });
    s += T(x.toFixed(1), cy + r + 34, i === 0 ? 'TODAY' : new Date(d.t).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(), { size: 11, weight: 700, ls: 2.4, anchor: 'middle' })
       + T(x.toFixed(1), cy + r + 52, `${num(d.min, 0)}° at night${d.mm >= 0.5 ? ` · ${d.mm.toFixed(0)} mm` : ''}`, { size: 9.5, weight: 500, anchor: 'middle' });
  });
  if (!list.length) s += T(W / 2, cy, 'waiting for the forecast', { size: 16, weight: 500, anchor: 'middle' });

  // the words
  s += mark(40, 56, f.place.toLowerCase()) + T(40, 78, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time} · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="84" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="60" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`
     + T(W - 40, 106, 'now', { size: 10, weight: 600, ls: 1.5, anchor: 'end' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the days ahead: each disc its day’s sky, the figure its high, the night’s low beneath',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: BAU.cream });
}

export const weekL = {
  id: 'bh-week-l', orient: 'landscape', name: 'Week · landscape',
  blurb: 'The six days ahead as a row of discs, each the colour of its day’s sky — mustard sun, blue rain with '
       + 'streaks, white snow, grey fog, slate cloud — with the day’s high written in it and its name beneath. Today '
       + 'wears a ring.',
  render,
};
