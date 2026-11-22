/**
 * Homage — after Albers: three squares nested and settled low, and a column
 * of type beside them.
 *
 * The outer square is the sky in its ink, the middle square the price in
 * its colour, the innermost paper with the temperature on it — so the whole
 * day is three flat colours and one figure. The column states the facts in
 * plain sentences.
 */
import { frame, facts, esc, int, num, euro, hm, SANS } from '../posters/common.js';
import { PRINT, skyInk, priceInk, priceWord, degrees, T, wrap } from './printkit.js';

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const sky = skyInk(f.sky ?? 'cloudy', { night: f.night, temp: f.temp });
  const power = priceInk(f.price);
  const sq = (x, y, a, fill) => `<rect x="${x}" y="${y}" width="${a}" height="${a}" fill="${fill}"/>`;
  let s = `<rect width="${W}" height="${H}" fill="${PRINT.paper}"/>`;
  // the squares sit lower in each other, as Albers set them
  s += sq(44, 40, 400, sky) + sq(94, 112, 300, power) + sq(144, 184, 200, f.night ? PRINT.black : PRINT.paper);
  const t = `${int(f.temp)}°`;
  s += `<text x="244" y="308" font-family='${SANS}' font-size="${t.length > 3 ? 78 : 92}" font-weight="700" letter-spacing="-3" text-anchor="middle" fill="${f.night ? PRINT.paper : PRINT.black}">${esc(t)}</text>`;

  // the column
  const X = 520, CW = 240;
  s += T(X, 78, f.place, { size: 34, weight: 700 })
     + T(X, 106, `${f.weekday} ${f.dayMonth}, ${f.time}`, { size: 15, weight: 400 })
     + `<rect x="${X}" y="128" width="${CW}" height="2" fill="${PRINT.black}"/>`;
  const paras = [
    `${degrees(f.temp)}, ${f.out.head[0].toLowerCase()}${f.out.head.slice(1)}.`,
    f.price != null ? `Power ${num(f.price, 1)} c/kWh now, ${priceWord(f.price)}${f.stats ? `; today from ${num(f.stats.min.price, 1)} to ${num(f.stats.max.price, 1)}` : ''}.` : 'No prices for today yet.',
    S.state === 'now' ? `Sauna now${S.cost != null ? `, about ${euro(S.cost)} a session` : ''}.`
      : S.start != null ? `Sauna ${S.tomorrow ? 'tomorrow ' : ''}at ${S.at}${S.cost != null ? `, about ${euro(S.cost)} a session` : ''}.` : `${S.line}.`,
    f.sun ? `Light from ${hm(f.sun.rise)} to ${hm(f.sun.set)}.` : '',
  ].filter(Boolean);
  let y = 160;
  for (const p of paras) { for (const l of wrap(p, CW, { size: 15, weight: 500 })) { s += T(X, y, l, { size: 15, weight: 500 }); y += 21; } y += 10; }
  s += T(X, H - 60, 'The outer square is the sky, the middle the price,', { size: 10.5, weight: 500, fill: '#6b6b70' })
     + T(X, H - 46, 'the inner one the temperature.', { size: 10.5, weight: 500, fill: '#6b6b70' })
     + T(X, H - 22, `FMI ${f.station.short.toUpperCase()} · NORD POOL FI`, { size: 9.5, weight: 700, ls: 2 });
  return frame('landscape', s, { bg: PRINT.paper });
}

export const homageL = {
  id: 'pr-homage-l', orient: 'landscape', name: 'Homage · landscape',
  blurb: 'After Albers: three squares nested and settled low — the sky in its ink, the price in its colour, '
       + 'paper with the temperature on it — so the whole day is three flat colours and one figure, with the facts '
       + 'in a column of plain sentences beside them.',
  render,
};
