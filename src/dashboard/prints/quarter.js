/**
 * Quarter — a geometric composition on warm grey: a quarter-circle, an arch,
 * circles, a pair of rules, a few upright lines, small type in columns.
 *
 * The quarter-circle is the sky, in its ink. The large circle is power now,
 * in the price's colour and as big as the price; the small circle above it
 * is the price at the sauna hour, so the two can be compared at a glance. The
 * black arch is the sauna's doorway — it stands only while a window is ahead
 * — and the upright lines count the hours until it opens. The temperature is
 * stacked one glyph to a line at the foot, like a signature.
 */
import { frame, facts, int, num, euro, hm, HOUR } from '../posters/common.js';
import { PRINT, skyInk, priceInk, priceWord, degrees, level, T, wrap } from './printkit.js';

const W = 480, H = 800;
const small = { size: 10.5, weight: 500, fill: PRINT.black };

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const sky = skyInk(f.sky ?? 'cloudy', { night: f.night, temp: f.temp });
  let s = `<rect width="${W}" height="${H}" fill="${PRINT.grey}"/>`;

  // the title: the place in bold, the day light
  s += `<text x="${W / 2}" y="72" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="34" text-anchor="middle" fill="${PRINT.black}">`
     + `<tspan font-weight="700">${f.place}</tspan><tspan font-weight="300"> ${f.weekday}</tspan></text>`;

  // three columns of small type under it
  const cols = [
    `${degrees(f.temp)}, ${f.out.head[0].toLowerCase()}${f.out.head.slice(1)}.`,
    f.price != null ? `Power ${num(f.price, 1)} c/kWh now, ${priceWord(f.price)}.` : 'No prices for today yet.',
    S.state === 'now' ? `Sauna now${S.cost != null ? `, about ${euro(S.cost)}` : ''}.`
      : S.start != null ? `Sauna ${S.tomorrow ? 'tomorrow ' : ''}at ${S.at}${S.cost != null ? `, about ${euro(S.cost)}` : ''}.` : `${S.line}.`,
  ];
  cols.forEach((c, i) => wrap(c, 124, small).slice(0, 3).forEach((l, j) => { s += T(40 + i * 150, 112 + j * 14, l, small); }));

  // the sky: a quarter-circle, its corner at the lower left
  const Q = { x: 158, y: 440, r: 184 };
  s += `<path d="M${Q.x},${Q.y} L${Q.x},${Q.y - Q.r} A${Q.r},${Q.r} 0 0 1 ${Q.x + Q.r},${Q.y} Z" fill="${sky}"/>`;

  // power now, and at the sauna hour
  const big = 40 + 52 * level(f.price);
  s += `<circle cx="${350 + (92 - big) * 0.3}" cy="${248 - (92 - big) * 0.4}" r="${big.toFixed(1)}" fill="${priceInk(f.price)}"/>`;
  if (S.avg != null) {
    const r = 16 + 34 * level(S.avg);
    s += `<circle cx="158" cy="${(208 - r * 0.2).toFixed(1)}" r="${r.toFixed(1)}" fill="${priceInk(S.avg)}"/>`;
  }

  // the pair of rules
  s += `<rect x="112" y="286" width="90" height="6" fill="${PRINT.black}"/><rect x="112" y="306" width="90" height="6" fill="${PRINT.black}"/>`;

  // the sauna's doorway, and the hours until it opens
  const ahead = S.start != null || S.state === 'now';
  if (ahead) {
    const A = { x: 160, top: 358, w: 176, leg: 44, foot: 542 };
    const ro = A.w / 2, ri = ro - A.leg;
    s += `<path d="M${A.x - ro},${A.foot} L${A.x - ro},${A.top + ro} A${ro},${ro} 0 0 1 ${A.x + ro},${A.top + ro} L${A.x + ro},${A.foot} `
       + `L${A.x + ri},${A.foot} L${A.x + ri},${A.top + ro} A${ri},${ri} 0 0 0 ${A.x - ri},${A.top + ro} L${A.x - ri},${A.foot} Z" fill="${PRINT.black}"/>`;
    const hours = S.state === 'now' ? 0 : Math.max(1, Math.min(8, Math.round((S.start - f.now) / HOUR)));
    for (let i = 0; i < hours; i++) s += `<rect x="${268 + i * 20}" y="${392}" width="4" height="${250}" fill="${PRINT.black}"/>`;
    s += T(268, 664, S.state === 'now' ? 'SAUNA NOW' : `SAUNA ${S.tomorrow ? 'TOMORROW ' : ''}${S.at} · ${hours} H`, { size: 9.5, weight: 700, ls: 1.4 });
  }

  // the temperature, stacked at the foot
  [...`${int(f.temp)}°`].forEach((g, i) => { s += T(34, 566 + i * 30, g, { size: 30, weight: 700, ls: -0.5 }); });

  // small paragraphs down the right
  const paras = [
    f.out.sub ? f.out.sub.split(' · ').map((p) => `${p[0].toUpperCase()}${p.slice(1)}.`).join(' ') : '',
    f.stats ? `Today from ${num(f.stats.min.price, 1)} to ${num(f.stats.max.price, 1)} c/kWh.` : '',
    f.sun ? `Light ${hm(f.sun.rise)} to ${hm(f.sun.set)}.` : '',
    `FMI ${f.station.short}, Nord Pool FI. ${f.time}.`,
  ].filter(Boolean);
  let y = 688;
  for (const p of paras) { for (const l of wrap(p, 200, small).slice(0, 2)) { s += T(W - 40, y, l, { ...small, anchor: 'end' }); y += 13; } y += 6; }
  return frame('portrait', s, { bg: PRINT.grey });
}

export const quarterP = {
  id: 'pr-quarter-p', orient: 'portrait', name: 'Quarter · portrait',
  blurb: 'A geometric composition on warm grey. The quarter-circle is the sky in its ink; the large circle '
       + 'is power now, coloured and sized by the price, the small one the price at the sauna hour; the black '
       + 'arch is the sauna’s doorway, standing while a window is ahead, with the hours until it opens as upright lines.',
  render,
};
