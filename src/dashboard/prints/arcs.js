/**
 * Arcs — the coming hours as a rainbow rising from the corner.
 *
 * Ten quarter-rings share a centre at the lower left: the innermost is this
 * hour, each ring outward the next, and every ring wears the price of its
 * hour — green cheap, yellow fair, red dear, blue below zero, the sauna
 * window's rings green. Hours not yet priced are left as paper. The
 * temperature stands in the open sky at the upper right, with the day
 * beneath it.
 */
import { frame, facts, esc, int, num, euro, hourStart, HOUR, SANS } from '../posters/common.js';
import { PRINT, priceInk, priceWord, T } from './printkit.js';

const W = 800, H = 480, N = 10;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const h0 = hourStart(f.now);
  const price = new Map([...f.today, ...f.tomorrow].map((p) => [p.start, p.price]));
  const r0 = 118, step = 34;
  let s = `<rect width="${W}" height="${H}" fill="${PRINT.paper}"/>`;
  for (let i = 0; i < N; i++) {
    const t = h0 + i * HOUR, p = price.get(t);
    const ri = r0 + i * step, ro = ri + step - 2;
    const sauna = S.start != null && t >= S.start && t < S.start + 2 * HOUR;
    const fill = p == null ? PRINT.paper : sauna ? PRINT.green : priceInk(p);
    s += `<path d="M0,${H - ro} A${ro},${ro} 0 0 1 ${ro},${H} L${ri},${H} A${ri},${ri} 0 0 0 0,${H - ri} Z" fill="${fill}"`
       + `${p == null ? ` stroke="${PRINT.black}" stroke-width="1"` : ''}/>`;
  }
  // the hour, at the heart
  s += T(20, H - 22, `${f.time}`, { size: 15, weight: 800, ls: 1 })
     + T(20, H - 46, 'NOW', { size: 10, weight: 700, ls: 2.4 });

  // the temperature in the open sky, the day beneath
  const t = `${int(f.temp)}°`;
  s += `<text x="${W - 40}" y="196" font-family='${SANS}' font-size="${t.length > 3 ? 150 : 176}" font-weight="800" letter-spacing="-7" text-anchor="end" fill="${PRINT.black}">${esc(t)}</text>`;
  s += T(W - 40, 240, f.out.head, { size: 22, weight: 500, anchor: 'end' })
     + T(W - 40, 268, `${f.place}, ${f.weekday} ${f.dayMonth}`, { size: 14, weight: 500, anchor: 'end' })
     + T(W - 40, 296, 'Each ring an hour, from now at the corner;', { size: 10.5, weight: 500, anchor: 'end', fill: '#8a8a8e' })
     + T(W - 40, 311, 'green cheap, yellow fair, red dear.', { size: 10.5, weight: 500, anchor: 'end', fill: '#8a8a8e' });
  s += T(W - 40, H - 62, f.price != null ? `POWER ${num(f.price, 1)} C/KWH · ${priceWord(f.price).toUpperCase()}` : 'NO PRICES YET', { size: 11.5, weight: 700, ls: 2, anchor: 'end' })
     + T(W - 40, H - 40, (S.state === 'now' ? `SAUNA NOW${S.cost != null ? ` · ${euro(S.cost)}` : ''}`
        : S.start != null ? `SAUNA ${S.tomorrow ? 'TOMORROW ' : ''}${S.at}${S.cost != null ? ` · ${euro(S.cost)}` : ''}` : S.line.toUpperCase()), { size: 11.5, weight: 700, ls: 2, anchor: 'end' });
  return frame('landscape', s, { bg: PRINT.paper });
}

export const arcsL = {
  id: 'pr-arcs-l', orient: 'landscape', name: 'Arcs · landscape',
  blurb: 'The coming hours as a rainbow rising from the corner: ten quarter-rings, the innermost this hour, '
       + 'each wearing the price of its hour — green cheap, yellow fair, red dear — and the sauna window’s rings '
       + 'green. The temperature stands in the open sky.',
  render,
};
