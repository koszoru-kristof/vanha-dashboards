/**
 * Kiulu — the sauna bucket seen from above, with the ladle laid across it,
 * composed like the turntable poster: a great white disc cut by the edge of
 * the sheet, and an arm reaching in from the other side.
 *
 * The ladle points at the sauna's hour on the rim, midnight at the top and
 * noon at the foot, the way a tonearm rests on a record. The sheet is the
 * price's colour — green when cheap, red when dear — and the small type
 * says when and for how much.
 */
import { frame, facts, num, euro, SIZE } from '../posters/common.js';
import { BAU, priceInk, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const f = facts(ctx);
  const S = f.sauna;
  const p = f.price;
  const ground = p == null ? BAU.cream : p <= 15 && p > 5 ? BAU.cream : priceInk(p);
  const onCream = ground === BAU.cream;
  const disc = onCream ? BAU.black : BAU.white, ink = onCream ? BAU.black : BAU.white;
  let s = `<rect width="${W}" height="${H}" fill="${ground}"/>`;

  // the bucket: a disc cut by the left edge, the water a ring within
  const C = { x: 150 + (W - 480) * 0.6, y: 390 - (W - 480) / 12, r: 300 + (W - 480) / 12 }, q = C.r / 300;   // a wider sheet: the bucket steps in and grows
  s += `<circle cx="${C.x}" cy="${C.y}" r="${C.r}" fill="${disc}"/>`;
  s += `<circle cx="${C.x}" cy="${C.y}" r="${112 * q}" fill="${ground}"/>`
     + `<circle cx="${C.x}" cy="${C.y}" r="${96 * q}" fill="none" stroke="${disc}" stroke-width="3"/>`
     + `<circle cx="${C.x}" cy="${C.y}" r="9" fill="${disc}"/>`;

  // the ladle, from the right edge to the sauna's hour on the rim
  const when = S.state === 'now' ? f.now : S.start;
  if (when != null) {
    const h = new Date(when).getHours() + new Date(when).getMinutes() / 60;
    const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
    const cup = [C.x + (C.r - 46) * Math.cos(a), C.y + (C.r - 46) * Math.sin(a)];
    const pivot = [W + 10, 250];
    const elbow = [(pivot[0] + cup[0]) / 2 + 30, (pivot[1] + cup[1]) / 2 - 40];
    s += `<path d="M${pivot[0]},${pivot[1]} L${elbow[0].toFixed(1)},${elbow[1].toFixed(1)} L${cup[0].toFixed(1)},${cup[1].toFixed(1)}" fill="none" stroke="${ground}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>`
       + `<path d="M${pivot[0]},${pivot[1]} L${elbow[0].toFixed(1)},${elbow[1].toFixed(1)} L${cup[0].toFixed(1)},${cup[1].toFixed(1)}" fill="none" stroke="${onCream ? BAU.green : BAU.black}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`
       + `<circle cx="${cup[0].toFixed(1)}" cy="${cup[1].toFixed(1)}" r="30" fill="${onCream ? BAU.green : BAU.black}"/>`
       + `<circle cx="${cup[0].toFixed(1)}" cy="${cup[1].toFixed(1)}" r="14" fill="${disc}"/>`;
  }

  // the words
  s += mark(W - 40, 720, saunaLine(S), { fill: ink, size: 28, anchor: 'end' });
  s += T(W - 40, 744, [S.cost != null ? `about ${euro(S.cost)}` : null, p != null ? `power ${num(p, 1)} c/kWh, ${priceWord(p)}` : 'no prices yet'].filter(Boolean).join(' · '), { size: 12, weight: 500, fill: ink, anchor: 'end' });
  s += mark(W - 40, 60, f.place.toLowerCase(), { fill: ink, anchor: 'end' })
     + T(W - 40, 82, `${num(f.temp, 0)}° · ${f.out.head.toLowerCase()} · ${f.time}`, { size: 12, weight: 500, fill: ink, anchor: 'end' });
  return frame(orient, s, { bg: ground });
}

export const kiuluP = {
  id: 'bh-kiulu-p', orient: 'portrait', name: 'Kiulu · portrait',
  blurb: 'The sauna bucket from above with the ladle laid across it, composed like the turntable poster: a white '
       + 'disc cut by the edge, an arm reaching in from the other side. The ladle points at the sauna’s hour on '
       + 'the rim, midnight at the top; the sheet is the price’s colour, green when cheap, red when dear.',
  render, tall: true,
};
