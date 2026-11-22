/**
 * Texture — the outlook, repeated until it is a fabric, with the temperature
 * cut out of it.
 *
 * Row upon row of the day's headline in small capitals — RAIN UNTIL 03:00 ·
 * RAIN UNTIL 03:00 · … — fills the sheet as a grey weave. The temperature
 * is a single huge numeral in the price's colour, and inside it the weave
 * runs on in paper, so the figure is cut from the cloth rather than laid on
 * it. A clear band at the head and the foot carries the facts.
 */
import { frame, facts, esc, int, num, euro, uid, measure, SANS } from '../posters/common.js';
import { PRINT, priceInk, priceWord, fitWidth, T } from './printkit.js';

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const ids = { cut: uid('txc'), keep: uid('txk') };
  const t = `${int(f.temp)}°`;
  const size = Math.min(430, fitWidth(t, 690, { weight: 800, ls: -10 }));
  const numeral = (fill) => `<text x="${W / 2}" y="${(H / 2 + size * 0.34).toFixed(0)}" font-family='${SANS}' font-size="${size.toFixed(0)}" font-weight="800" letter-spacing="-10" text-anchor="middle" fill="${fill}">${esc(t)}</text>`;

  // the weave: the headline repeated, rows offset so the columns never line up
  const phrase = `${f.out.head.toUpperCase()}  ·  `;
  const st = { size: 11, weight: 600, ls: 1.2 };
  const pw = measure(phrase, st).w + st.ls;
  const reps = Math.ceil(W / pw) + 2;
  let weave = '';
  for (let i = 0, y = 72; y < H - 52; i++, y += 17) {
    const off = -((i * 53) % pw);
    weave += `<text x="${off.toFixed(1)}" y="${y}" font-family='${SANS}' font-size="${st.size}" font-weight="${st.weight}" letter-spacing="${st.ls}">${esc(phrase.repeat(reps))}</text>`;
  }
  let s = `<defs>
    <clipPath id="${ids.keep}">${numeral('#000')}</clipPath>
    <mask id="${ids.cut}"><rect width="${W}" height="${H}" fill="#fff"/>${numeral('#000')}</mask>
  </defs>`;
  s += `<rect width="${W}" height="${H}" fill="${PRINT.paper}"/>`;
  s += numeral(priceInk(f.price));
  s += `<g fill="#7d786f" mask="url(#${ids.cut})">${weave}</g>`;
  s += `<g fill="${PRINT.paper}" opacity=".62" clip-path="url(#${ids.keep})">${weave}</g>`;

  // the bands of facts
  s += T(40, 40, `${f.place.toUpperCase()} · ${f.weekday.toUpperCase()} ${f.dayMonth.toUpperCase()} · ${f.time}`, { size: 11.5, weight: 700, ls: 2.2 })
     + T(W - 40, 40, `${num(f.temp)} °C`, { size: 11.5, weight: 700, ls: 2.2, anchor: 'end' });
  s += T(40, H - 28, f.price != null ? `POWER ${num(f.price, 1)} C/KWH · ${priceWord(f.price).toUpperCase()}` : 'NO PRICES YET', { size: 11.5, weight: 700, ls: 2.2 })
     + T(W - 40, H - 28, S.state === 'now' ? `SAUNA NOW${S.cost != null ? ` · ${euro(S.cost)}` : ''}`
        : S.start != null ? `SAUNA ${S.tomorrow ? 'TOMORROW ' : ''}${S.at}${S.cost != null ? ` · ${euro(S.cost)}` : ''}` : S.line.toUpperCase(), { size: 11.5, weight: 700, ls: 2.2, anchor: 'end' });
  return frame('landscape', s, { bg: PRINT.paper });
}

export const textureL = {
  id: 'pr-texture-l', orient: 'landscape', name: 'Texture · landscape',
  blurb: 'The outlook repeated until it is a fabric — RAIN UNTIL 03:00 · RAIN UNTIL 03:00 · … — in rows of small '
       + 'capitals, with the temperature cut out of it: one huge numeral in the price’s colour, inside which the '
       + 'weave runs on in paper.',
  render,
};
