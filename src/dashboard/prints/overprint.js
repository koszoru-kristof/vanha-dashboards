/**
 * Overprint — the two figures of the day printed over each other in two inks.
 *
 * The temperature runs across the sheet in deep blue; the price runs up it,
 * turned on its side, in the price's colour. Where the two cross, the inks
 * overprint and go dark, as on a two-colour poster from a single press.
 * Nothing else is large: each figure carries its unit in small capitals at
 * its foot, and the day sits in the bottom corner.
 */
import { frame, SIZE, facts, esc, int, num, euro, SANS } from '../posters/common.js';
import { PRINT, MULTIPLY, priceInk, priceWord, fitWidth, T } from './printkit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const ex = W - 480;                                        // the tall sheet's extra width
  const f = facts(ctx);
  const S = f.sauna;
  let s = `<rect width="${W}" height="${H}" fill="${PRINT.paper}"/>`;
  const ink = f.price != null ? priceInk(f.price) : PRINT.slate;
  const tInk = ink === PRINT.blue ? PRINT.black : PRINT.blue;         // two inks that stay two

  // the temperature, across
  const t = `${int(f.temp)}°`;
  const ts = Math.min(300 + ex * 0.4, fitWidth(t, 400 + ex * 0.8, { weight: 800, ls: -8 }));
  s += `<text x="40" y="430" font-family='${SANS}' font-size="${ts.toFixed(0)}" font-weight="800" letter-spacing="-8" fill="${tInk}"${MULTIPLY}>${esc(t)}</text>`;
  s += T(44, 462, 'OUTDOOR °C', { size: 11, weight: 700, ls: 2.4, fill: tInk });

  // the price, up the sheet
  if (f.price != null) {
    const p = num(f.price, 1);
    const ps = Math.min(290 + ex * 0.3, fitWidth(p, 600 + ex * 0.3, { weight: 800, ls: -8 }));
    s += `<text transform="translate(${W - 50} 764) rotate(-90)" font-family='${SANS}' font-size="${ps.toFixed(0)}" font-weight="800" letter-spacing="-8" fill="${ink}"${MULTIPLY}>${esc(p)}</text>`;
    s += T(0, 0, `POWER C/KWH · ${priceWord(f.price).toUpperCase()}`, { size: 11, weight: 700, ls: 2.4, fill: ink === PRINT.yellow ? PRINT.black : ink, extra: ` transform="translate(${W - 22} 764) rotate(-90)"` });
  } else {
    s += T(0, 0, 'NO PRICES YET', { size: 11, weight: 700, ls: 2.4, extra: ` transform="translate(${W - 22} 764) rotate(-90)"` });
  }

  // the day, at the head; the sources at the foot
  s += T(40, 56, f.place.toUpperCase(), { size: 15, weight: 800, ls: 4 })
     + T(40, 78, `${f.weekday} ${f.dayMonth} · ${f.time}`, { size: 13, weight: 500 })
     + T(40, 108, f.out.head, { size: 17, weight: 500 })
     + T(40, 130, S.state === 'now' ? `Sauna now${S.cost != null ? `, about ${euro(S.cost)}` : ''}`
        : S.start != null ? `Sauna ${S.tomorrow ? 'tomorrow ' : ''}at ${S.at}${S.cost != null ? `, about ${euro(S.cost)}` : ''}` : S.line, { size: 13, weight: 500 })
     + T(40, 766, `FMI ${f.station.short.toUpperCase()} · NORD POOL FI`, { size: 9.5, weight: 700, ls: 2 });
  return frame(orient, s, { bg: PRINT.paper });
}

export const overprintP = {
  id: 'pr-overprint-p', orient: 'portrait', name: 'Overprint · portrait',
  blurb: 'The two figures of the day printed over each other in two inks: the temperature across the sheet in '
       + 'deep blue, the price up it on its side in the price’s colour, the inks going dark where they cross, as on '
       + 'a two-colour poster from a single press.',
  render, tall: true,
};
