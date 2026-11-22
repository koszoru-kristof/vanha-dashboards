/**
 * Shadow — the temperature casts the price as its shadow.
 *
 * One black numeral on paper, set as large as the sheet allows. Behind it,
 * a long shadow in the price's colour runs off towards the lower right: a
 * short stub when power is cheap, a shadow that leaves the page when it is
 * dear. The price and the sauna are written along the shadow's edge; the
 * day sits in the top corner.
 */
import { frame, facts, esc, int, num, euro, uid, SANS } from '../posters/common.js';
import { PRINT, priceInk, priceWord, level, fitWidth, T } from './printkit.js';

const W = 480, H = 800;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const t = `${int(f.temp)}°`;
  const style = { weight: 800, ls: -8 };
  const size = Math.min(320, fitWidth(t, 372, style));
  const x = 40, y = 150 + size * 0.72;
  const len = 26 + 400 * level(f.price);
  const ink = priceInk(f.price);
  const id = uid('sh');

  let s = `<defs><text id="${id}" x="${x}" y="${y.toFixed(0)}" font-family='${SANS}' font-size="${size.toFixed(0)}" font-weight="800" letter-spacing="${style.ls}">${esc(t)}</text></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${PRINT.paper}"/>`;
  // the shadow: the numeral repeated along the diagonal, in the price's ink
  let shadow = '';
  for (let k = len; k > 0; k -= 1) shadow += `<use href="#${id}" transform="translate(${k} ${k})"/>`;
  s += `<g fill="${ink}">${shadow}</g>`;
  s += `<use href="#${id}" fill="${PRINT.black}"/>`;

  // the price, along the shadow's lower edge
  if (f.price != null) {
    const ax = x + 8 + len * 0.55, ay = y + 14 + len * 0.55;
    s += T(0, 0, `POWER ${num(f.price, 1)} C/KWH · ${priceWord(f.price).toUpperCase()}`,
      { size: 12, weight: 700, ls: 2, fill: PRINT.black, extra: ` transform="translate(${ax.toFixed(0)} ${ay.toFixed(0)}) rotate(45)"` });
  }

  // the day, top corner; the outlook and the sauna at the foot
  s += T(40, 60, f.place.toUpperCase(), { size: 15, weight: 800, ls: 4 })
     + T(40, 82, `${f.weekday} ${f.dayMonth} · ${f.time}`, { size: 13, weight: 500 });
  s += T(40, 712, f.out.head, { size: 26, weight: 500 })
     + T(40, 742, S.state === 'now' ? `Sauna now${S.cost != null ? `, about ${euro(S.cost)}` : ''}`
        : S.start != null ? `Sauna ${S.tomorrow ? 'tomorrow ' : ''}at ${S.at}${S.cost != null ? `, about ${euro(S.cost)}` : ''}` : S.line, { size: 15, weight: 500 })
     + T(40, 764, `The shadow is the price: a stub when cheap, off the page when dear.`, { size: 10.5, weight: 500, fill: '#6b6b70' });
  return frame('portrait', s, { bg: PRINT.paper });
}

export const shadowP = {
  id: 'pr-shadow-p', orient: 'portrait', name: 'Shadow · portrait',
  blurb: 'The temperature casts the price as its shadow: one black numeral, and behind it a long shadow in '
       + 'the price’s colour towards the lower right — a stub when power is cheap, off the page when it is dear. '
       + 'The price is written along the shadow’s edge.',
  render,
};
