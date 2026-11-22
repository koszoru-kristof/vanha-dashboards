/**
 * Tide — the sheet floods to the temperature.
 *
 * Two fields of flat colour meet at a waterline that stands as high as the
 * temperature: near the foot at −25 °C, near the head at +30. Above the
 * line is the sky in its ink; below it, the price in its colour. The line
 * itself sways a little, as water does. The numeral sits on the line and
 * inverts across it, so it reads on both fields; the facts are set in the
 * corners in whichever ink reads on that field.
 */
import { frame, SIZE, facts, esc, int, num, euro, uid, hash, rng, SANS, smooth } from '../posters/common.js';
import { PRINT, skyInk, priceInk, priceWord, onInk, T } from './printkit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const ex = W - 480;                                        // the tall sheet's extra width
  const f = facts(ctx);
  const S = f.sauna;
  const R = rng(hash(`${f.d.toDateString()}${f.scenario?.id ?? ''}`));
  const sky = skyInk(f.sky ?? 'cloudy', { night: f.night, temp: f.temp });
  const power = priceInk(f.price);
  const t = Number.isFinite(f.temp) ? Math.max(-25, Math.min(30, f.temp)) : 5;
  const line = 700 - ((t + 25) / 55) * 600;

  // the waterline: a slow swell, a little chop on it
  const pts = [];
  const a = 5 + R() * 4, ph = R() * Math.PI * 2;
  for (let x = -20; x <= W + 20; x += 20) pts.push([x, line + a * Math.sin((x / 190) * Math.PI + ph) + 2.5 * Math.sin(x / 41 + ph * 2)]);
  const wave = smooth(pts);
  const ids = { up: uid('tu') };
  let s = `<defs>
    <clipPath id="${ids.up}"><path d="${wave} L${W + 20},-20 L-20,-20 Z"/></clipPath>
  </defs>`;
  s += `<rect width="${W}" height="${H}" fill="${sky}"/>`;
  s += `<path d="${wave} L${W + 20},${H + 20} L-20,${H + 20} Z" fill="${power}"/>`;

  // the numeral on the line, inverting across it
  const str = `${int(f.temp)}°`;
  const size = (str.length > 3 ? 190 : 230) * (1 + ex / 600);
  const ny = Math.max(60 + ex * 0.4 + size * 0.72, Math.min(H - 60 - ex * 0.3, line + size * 0.36));   // the bigger tall numeral keeps clear of the corners
  const numeral = (fill) => `<text x="${W / 2}" y="${ny.toFixed(0)}" font-family='${SANS}' font-size="${size}" font-weight="800" letter-spacing="-6" text-anchor="middle" fill="${fill}">${esc(str)}</text>`;
  s += numeral(onInk(power)) + (onInk(sky) === onInk(power) ? '' : `<g clip-path="url(#${ids.up})">${numeral(onInk(sky))}</g>`);

  // the facts, in the corners
  const up = onInk(sky), down = onInk(power);
  s += T(40, 60, f.place.toUpperCase(), { size: 15, weight: 800, ls: 4, fill: up })
     + T(40, 82, `${f.weekday} ${f.dayMonth} · ${f.time}`, { size: 13, weight: 500, fill: up })
     + T(W - 40, 60, f.out.head.toUpperCase(), { size: 12, weight: 700, ls: 1.6, anchor: 'end', fill: up });
  s += T(40, H - 62, f.price != null ? `POWER ${num(f.price, 1)} C/KWH · ${priceWord(f.price).toUpperCase()}` : 'NO PRICES YET', { size: 12, weight: 700, ls: 1.6, fill: down })
     + T(40, H - 40, S.state === 'now' ? `Sauna now${S.cost != null ? `, about ${euro(S.cost)}` : ''}`
        : S.start != null ? `Sauna ${S.tomorrow ? 'tomorrow ' : ''}at ${S.at}${S.cost != null ? `, about ${euro(S.cost)}` : ''}` : S.line, { size: 13, weight: 500, fill: down });
  return frame(orient, s, { bg: sky });
}

export const tideP = {
  id: 'pr-tide-p', orient: 'portrait', name: 'Tide · portrait',
  blurb: 'The sheet floods to the temperature: two flat fields meet at a swaying waterline that stands as high '
       + 'as the temperature (−25 °C at the foot, +30 at the head). Above it the sky in its ink, below it the '
       + 'price in its colour; the numeral sits on the line and inverts across it.',
  render, tall: true,
};
