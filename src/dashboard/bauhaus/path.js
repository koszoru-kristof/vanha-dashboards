/**
 * Winding path — the way to the sauna as a path of parallel green lines
 * that winds down the sheet from a black dot, now, to a red dot, the sauna
 * window: one line for every hour of the wait, so a long wait is a broad
 * road and the last hour a single track. The temperature stands at the head.
 */
import { frame, facts, num, euro, HOUR } from '../posters/common.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 480, H = 800;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const hours = S.state === 'now' ? 1 : S.start != null ? Math.max(1, Math.min(9, Math.round((S.start - f.now) / HOUR))) : 4;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  const d = 'M90,200 C90,330 390,300 390,430 C390,560 90,530 90,660';
  const pitch = 16;
  for (let i = hours; i >= 1; i--) {
    s += `<path d="${d}" fill="none" stroke="${BAU.green}" stroke-width="${i * pitch}" stroke-linecap="round"/>`;
    if (i > 1) s += `<path d="${d}" fill="none" stroke="${BAU.cream}" stroke-width="${i * pitch - 7}" stroke-linecap="round"/>`;
  }
  if (hours > 1) s += `<path d="${d}" fill="none" stroke="${BAU.green}" stroke-width="${pitch - 7}" stroke-linecap="round"/>`;
  const dot = 14 + hours * 4;
  s += `<circle cx="90" cy="200" r="${dot}" fill="${BAU.black}"/>`;
  s += `<circle cx="90" cy="660" r="${dot}" fill="${S.start != null || S.state === 'now' ? BAU.red : BAU.grey}"/>`;
  s += T(90 + dot + 16, 206, 'now', { size: 13, weight: 600 })
     + T(90 + dot + 16, 666, S.state === 'now' ? 'sauna now' : S.start != null ? `sauna ${S.tomorrow ? 'tomorrow ' : ''}${S.at}` : 'no window yet', { size: 13, weight: 600 });

  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(40, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    `the way to the sauna: a line for every hour of the wait${S.start != null && S.state !== 'now' ? `, ${hours} now` : ''}`,
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('portrait', s, { bg: BAU.cream });
}

export const pathP = {
  id: 'bh-path-p', orient: 'portrait', name: 'Winding path · portrait',
  blurb: 'The way to the sauna as a path of parallel green lines winding down the sheet from a black dot, now, to '
       + 'a red dot, the sauna window: one line for every hour of the wait, so a long wait is a broad road and the '
       + 'last hour a single track.',
  render,
};
