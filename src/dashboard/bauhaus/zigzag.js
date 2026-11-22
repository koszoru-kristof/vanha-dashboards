/**
 * Zigzag — the catalogue's angular stripes: a sheet of black bands on cream
 * that jog together across the page, with one corner in colour. The jog is
 * the wind, gentle in a calm and sharp in a gale; the corner is the price
 * of power in its colour, and the day is set in it.
 */
import { frame, facts, num, euro, SIZE } from '../posters/common.js';
import { BAU, priceInk, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const ex = W - 480;                 // the extra width of the 3:4 sheet; 0 on the 480 poster
  const f = facts(ctx);
  const S = f.sauna;
  const wind = Number.isFinite(f.wind) ? f.wind : 3;
  const amp = 10 + Math.min(16, wind) * 2.4;                    // capped so the bands never close up
  const ink = priceInk(f.price);
  const onInk = ink === BAU.mustard ? BAU.black : BAU.cream;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  // the bands, all with the same jog
  const K = Math.round((W + 40) / 130), pitch = 40, thick = 20;   // the same jog length on any width: 4 legs at 480, 5 at 600
  const xs = Array.from({ length: K + 1 }, (_, k) => -20 + ((W + 40) * k) / K);
  for (let y0 = 170; y0 < H + amp; y0 += pitch) {
    const pts = xs.map((x, k) => `${x.toFixed(1)},${(y0 + (k % 2 ? amp : -amp) * (k === 0 || k === K ? 0.5 : 1)).toFixed(1)}`);
    s += `<path d="M${pts.join(' L')}" fill="none" stroke="${BAU.black}" stroke-width="${thick}" stroke-linejoin="miter"/>`;
  }
  // the corner in colour, carrying the day
  s += `<path d="M0,0 L${W},0 L${W},150 Q${W / 2},${(150 + amp * 0.6).toFixed(1)} 0,${(150 - amp * 0.25).toFixed(1)} Z" fill="${ink}"/>`;
  s += mark(40, 56, f.place.toLowerCase(), { fill: onInk })
     + T(40, 80, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500, fill: onInk })
     + T(40, 98, `${f.out.head.toLowerCase()} · wind ${num(wind, 0)} m/s`, { size: 13, weight: 500, fill: onInk });
  s += `<text x="${W - 40}" y="88" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${onInk}">${num(f.temp, 0)}°</text>`;
  s += T(W - 40, 120, f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', { size: 12, weight: 600, anchor: 'end', fill: onInk });
  // the foot, knocked out of the bands
  s += `<rect x="0" y="${H - 70}" width="${W}" height="70" fill="${BAU.cream}"/>`;
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the bands jog with the wind, gentle in a calm and sharp in a gale · the corner is the price',
    `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`,
  ] });
  return frame(orient, s, { bg: BAU.cream });
}

export const zigzagP = {
  id: 'bh-zigzag-p', orient: 'portrait', name: 'Zigzag · portrait',
  blurb: 'The catalogue’s angular stripes: black bands on cream that jog together across the sheet, gentle in a calm '
       + 'and sharp in a gale, with one corner in the price’s colour carrying the day.',
  render, tall: true,
};
