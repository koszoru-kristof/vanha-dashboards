/**
 * Broadside — the day set like a letterpress bill: every line filled to the
 * measure in whatever face suits it, so the shortest words come out largest.
 *
 * Condensed wood type for the place and the plain statements, a Baskerville
 * italic for the day and the small talk, a fat serif for the temperature.
 * Black, with the price's word in red when power is dear and the sauna line
 * in green. Rules between the lines, as a printer would set them.
 */
import { frame, facts, int, num, euro, measure, SANS, SERIF } from '../posters/common.js';
import { PRINT, CONDENSED, DISPLAY, priceWord, fitWidth, T } from './printkit.js';

const W = 480, H = 800, M = 40, MEASURE = W - 2 * M;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const p = f.price;
  const lines = [
    { s: f.place.toUpperCase(), family: CONDENSED, weight: 700, rule: 'double' },
    { s: `${f.weekday} ${f.dayMonth}`, family: SERIF, weight: 400, italic: true, max: 48 },
    { s: `${int(f.temp)}°`, family: DISPLAY, weight: 900, max: 330, extra: ` style="font-variation-settings:'SOFT' 100"` },
    { s: f.out.head.toUpperCase(), family: CONDENSED, weight: 500, rule: 'single' },
    p != null ? { s: `POWER ${num(p, 1)} CENTS`, family: CONDENSED, weight: 700, max: 96 } : { s: 'NO PRICES YET', family: CONDENSED, weight: 700, max: 96 },
    p != null ? { s: priceWord(p).toUpperCase(), family: SERIF, weight: 700, fill: p > 15 ? PRINT.red : PRINT.black, ls: 6, rule: 'single' } : null,
    S.state === 'now' ? { s: 'SAUNA NOW', family: CONDENSED, weight: 700, fill: PRINT.green }
      : S.start != null ? { s: `SAUNA ${S.tomorrow ? 'TOMORROW ' : 'AT '}${S.at}`, family: CONDENSED, weight: 700, fill: PRINT.green } : null,
    S.cost != null ? { s: `about ${euro(S.cost)} a session`, family: SERIF, weight: 400, italic: true, max: 40 } : null,
  ].filter(Boolean);

  // fit each line to the measure, then the whole column to the page
  for (const l of lines) {
    const st = { family: l.family, weight: l.weight, italic: l.italic, ls: l.ls ?? 0 };
    l.size = Math.min(l.max ?? 400, fitWidth(l.s, MEASURE, st));
    const m = measure(l.s, { ...st, size: l.size });
    l.asc = m.asc; l.desc = m.desc;
  }
  const gap = 18, foot = 44;
  const total = lines.reduce((a, l) => a + l.asc + l.desc + gap + (l.rule ? 26 : 0), 0);
  const k = Math.min(1, (H - 2 * M - foot) / total);
  const lead = Math.max(0, (H - 2 * M - foot - total * k) / (lines.length - 1));   // the slack, as leading
  let s = `<rect width="${W}" height="${H}" fill="${PRINT.paper}"/>`;
  let y = M + 6;
  for (const l of lines) {
    const size = l.size * k, asc = l.asc * k, desc = l.desc * k;
    const st = { family: l.family, weight: l.weight, italic: l.italic, ls: (l.ls ?? 0) * k, size };
    const w = measure(l.s, st).w;
    s += T((W - w) / 2, (y + asc).toFixed(1), l.s, { ...st, fill: l.fill ?? PRINT.black, extra: l.extra ?? '' });
    y += asc + desc + gap * k + lead;
    if (l.rule) {
      s += `<rect x="${M}" y="${y.toFixed(1)}" width="${MEASURE}" height="${l.rule === 'double' ? 3 : 1.5}" fill="${PRINT.black}"/>`;
      if (l.rule === 'double') s += `<rect x="${M}" y="${(y + 6).toFixed(1)}" width="${MEASURE}" height="1" fill="${PRINT.black}"/>`;
      y += 26 * k;
    }
  }
  s += T(W / 2, H - 40, `FMI ${f.station.short.toUpperCase()} · NORD POOL FI · ${f.time}`, { size: 10, weight: 600, ls: 2.4, anchor: 'middle', family: SANS });
  return frame('portrait', s, { bg: PRINT.paper });
}

export const broadsideP = {
  id: 'pr-broadside-p', orient: 'portrait', name: 'Broadside · portrait',
  blurb: 'The day set like a letterpress bill: every line filled to the measure in the face that suits it — '
       + 'condensed wood type, a Baskerville italic, a fat serif for the temperature — so the shortest words come '
       + 'out largest. Black, the price’s word in red when dear, the sauna line in green.',
  render,
};
