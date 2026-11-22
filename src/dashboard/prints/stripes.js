/**
 * Stripes — an op-art numeral on a sheet of one saturated colour.
 *
 * The sheet is the price: green when cheap, yellow when fair, red when dear,
 * blue below zero. The temperature is set in glyphs far too big for the
 * sheet, stepping down across it, each one screened in stripes — black, then
 * paper, then black — that interfere where they overlap. The wind ripples the
 * stripes: straight on a still day, wavy in a gale. The place runs off the
 * top edge and comes back in at the other side, as on a printed wrap; two
 * small blocks of type at the foot carry the facts.
 */
import { frame, facts, esc, int, num, euro, uid, hash, measure, SANS } from '../posters/common.js';
import { PRINT, priceInk, priceWord, onInk, stripes, fitWidth, T } from './printkit.js';

const W = 480, H = 800;

function render(ctx) {
  const f = facts(ctx);
  const ground = priceInk(f.price);
  const ink = onInk(ground);
  const glyphs = [...int(f.temp)];
  const n = glyphs.length;
  const size = n >= 3 ? 400 : n === 2 ? 490 : 580;
  const ids = { a: uid('spa'), b: uid('spb'), wave: uid('spw') };
  const seed = hash(`${f.d.toDateString()}${f.scenario?.id ?? ''}`) % 997;
  const wind = Number.isFinite(f.wind) ? f.wind : 3;
  const ripple = Math.min(24, 2 + wind * 1.4);

  let s = `<defs>
    ${stripes(ids.a, { period: 14, angle: 0, ink: PRINT.black })}
    ${stripes(ids.b, { period: 15, angle: -6, ink: PRINT.paper })}
    <filter id="${ids.wave}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.003 0.008" numOctaves="1" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="${ripple.toFixed(1)}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>`;
  s += `<rect width="${W}" height="${H}" fill="${ground}"/>`;

  // the glyphs, stepping down the sheet; an echo in paper stripes behind each black one
  const x0 = n >= 3 ? -34 : n === 2 ? 14 : 70;
  const y0 = n >= 3 ? 430 : n === 2 ? 480 : 640;
  const dx = size * 0.34, dy = size * 0.35;
  const glyph = (g, x, y, pat) => `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-family='${SANS}' font-size="${size}" font-weight="800" fill="url(#${pat})">${esc(g)}</text>`;
  let cascade = '';
  glyphs.forEach((g, i) => {
    const x = x0 + i * dx, y = y0 + i * dy;
    if (i % 2 === 0) cascade += glyph(g, x - size * 0.13, y - size * 0.11, ids.b);   // the echo
    cascade += glyph(g, x, y, i % 2 === 0 ? ids.a : ids.b);
  });
  s += `<g filter="url(#${ids.wave})">${cascade}</g>`;

  // the place, wrapped round the top edge
  const place = f.place.toUpperCase();
  const ps = { size: Math.min(62, fitWidth(place, 400, { weight: 700, ls: 6 })), weight: 700, ls: 6 };
  const pw = measure(place, ps).w + ps.ls;
  const seen = 176;                                          // the cut falls through the O
  const fixed = ` textLength="${pw.toFixed(1)}" lengthAdjust="spacing"`;   // both halves the measured width, so they join
  s += T(W - seen, 78, place, { ...ps, fill: ink, extra: fixed }) + T(-(pw - seen), 78, place, { ...ps, fill: ink, extra: fixed });

  // two blocks of small type, at the foot, clear of the glyphs
  const S = f.sauna;
  const block = (x, y, lines) => `<rect x="${x}" y="${y - 22}" width="20" height="1.5" fill="${ink}"/>`
    + lines.map((l, i) => T(x, y + i * 14, l, { size: 10.5, weight: 600, ls: 0.6, fill: ink })).join('');
  s += block(40, 700, [`${f.weekday.toUpperCase()} ${f.dayMonth.toUpperCase()} · ${f.time}`, `OUTDOOR ${num(f.temp)} °C`, f.out.head.toUpperCase()]);
  s += block(40, 758, [f.price != null ? `POWER ${num(f.price, 1)} C/KWH · ${priceWord(f.price).toUpperCase()}` : 'NO PRICES YET',
    S.start != null || S.state === 'now' ? `SAUNA ${S.state === 'now' ? 'NOW' : `${S.tomorrow ? 'TOMORROW ' : ''}${S.at}`}` : S.line.toUpperCase(),
    S.cost != null ? `ABOUT ${euro(S.cost)} A SESSION` : 'NORD POOL FI · FMI']);
  return frame('portrait', s, { bg: ground });
}

export const stripesP = {
  id: 'pr-stripes-p', orient: 'portrait', name: 'Stripes · portrait',
  blurb: 'An op-art numeral on a sheet of one colour. The sheet is the price (green cheap, yellow fair, '
       + 'red dear, blue below zero); the temperature steps down it in glyphs too big for the page, '
       + 'screened in black and paper stripes that interfere where they overlap. The wind ripples the stripes.',
  render,
};
