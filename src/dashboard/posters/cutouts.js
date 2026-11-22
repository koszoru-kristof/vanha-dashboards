/**
 * Cut-outs — after Matisse's paper cut-outs: a few organic shapes in flat
 * ink, laid on the sheet and overprinting where they meet. Their outlines are
 * generated afresh for each day.
 *
 * The large shape is the temperature: sky blue in a frost, sand when mild,
 * apricot to coral as it warms. Small drops drift across the top, one for each
 * wet hour ahead, as large as the rain; fog lies in long pale ribbons; a sunny
 * sky adds a yellow sun, a clear night a navy moon. The rounder shape is power
 * now, sized and coloured by the price. The green leaf is the sauna window —
 * the bigger the leaf, the more the wait saves. The temperature is written on
 * the large shape; the day is in the caption.
 */
import { frame, facts, esc, int, num, euro, HOUR, SANS, rng, hash, SIZE } from './common.js';
import { RISO, priceInk, blob, leaf, DISPLAY, MULTIPLY } from './artkit.js';

const level = (p) => (p == null ? 0.3 : Math.max(0, Math.min(1, Math.log2(1 + Math.max(0, p) / 2.5) / Math.log2(25))));
const tempInk = (t) => (!Number.isFinite(t) ? RISO.cloud : t <= -8 ? RISO.sky : t <= 2 ? '#b9cfe8'
  : t <= 10 ? RISO.sand : t <= 18 ? RISO.apricot : RISO.coral);

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  // the tall sheet: the shapes spread across the width (u) and grow a little (v)
  const u = W / 480, v = Math.sqrt(u);
  const f = facts(ctx);
  const seed = hash(`${f.d.toDateString()}${f.scenario?.id ?? ''}`);
  const R = rng(seed);
  const k = f.sky ?? 'cloudy';
  const path = (d, fill, extra = MULTIPLY) => `<path d="${d}" fill="${fill}"${extra}/>`;
  let s = `<rect width="${W}" height="${H}" fill="${RISO.paper}"/>`;

  // the sky's pieces, behind: a sun, a moon, fog ribbons
  if (!f.night && (k === 'clear' || k === 'partly')) s += path(blob(372 * u, 132, 58 * v, { seed: seed + 1, wobble: 0.08, lobes: [3, 6] }), RISO.sun);
  if (f.night && (k === 'clear' || k === 'partly')) s += path(blob(368 * u, 128, 52 * v, { seed: seed + 1, wobble: 0.06, lobes: [2, 5] }), RISO.night);
  if (k === 'fog') {
    for (let i = 0; i < 3; i++) s += path(blob((250 + R() * 40) * u, 110 + i * 64, 190 * u, { seed: seed + 10 + i, wobble: 0.12, lobes: [2, 3], squash: 0.13, turn: -0.05 + R() * 0.1 }), RISO.mist);
  }

  // the temperature: the large shape
  s += path(blob(214 * u, 318, 158 * v, { seed: seed + 2, wobble: 0.3, lobes: [3, 5, 7], n: 48 }), tempInk(f.temp));

  // power now: a rounder shape, larger and warmer as the price rises
  const pr = (58 + 60 * level(f.price)) * v;
  s += path(blob(344 * u, 566, pr, { seed: seed + 3, wobble: 0.12, lobes: [2, 4] }), priceInk(f.price));

  // what falls in the next 12 hours: a drop for each wet hour
  const wet = f.fc.between(f.now, f.now + 12 * HOUR).filter((q) => q.mm >= 0.1);
  const snow = k === 'snow';
  wet.slice(0, 12).forEach((q, i) => {
    const x = (236 + (i % 4) * 62 + R() * 26) * u, y = 52 + Math.floor(i / 4) * 78 + (i % 4) * 20 + R() * 18;   // a loose drift
    const r = 12 + Math.min(16, q.mm * 4);
    s += path(blob(x, y, r, { seed: seed + 20 + i, wobble: 0.16, lobes: [2, 3], squash: snow ? 1 : 1.25 }), snow ? RISO.ice : RISO.blue);
  });

  // the sauna window: a leaf, as big as the wait saves
  const S = f.sauna;
  if (S.start != null || S.state === 'now') {
    const save = f.nowCost != null && S.cost != null ? Math.max(0, Math.min(1, (f.nowCost - S.cost) / Math.max(0.5, f.nowCost))) : 0.3;
    const len = (120 + 110 * save) * v;
    s += path(leaf(122 * u, 604, len, len * 0.3, -0.75 + R() * 0.2), RISO.green);
    s += `<text x="${122 * u + len * 0.18}" y="${604 + len * 0.36 + 24}" font-family='${SANS}' font-size="13" font-weight="700" letter-spacing="1.8" fill="${RISO.green}">SAUNA ${esc(S.state === 'now' ? 'NOW' : `${S.tomorrow ? 'TMRW ' : ''}${S.at}`)}</text>`;
  }

  // the temperature, written on its shape
  s += `<text x="${70 * u}" y="378" font-family='${DISPLAY}' font-size="${(int(f.temp).length > 2 ? 118 : 138) * v}" font-weight="420" font-style="italic" fill="${RISO.ink}"${MULTIPLY} style="font-variation-settings:'SOFT' 100">${esc(`${int(f.temp)}°`)}</text>`;

  // the caption
  s += `<text x="36" y="744" font-family='${DISPLAY}' font-size="24" font-weight="380" font-style="italic" fill="${RISO.ink}">${esc(f.out.head)}</text>`
     + `<text x="36" y="772" font-family='${SANS}' font-size="11.5" font-weight="650" letter-spacing="1.8" fill="${RISO.ink}">${esc(
       [`${f.place.toUpperCase()} ${f.time}`, f.price != null ? `${num(f.price, 1)} C/KWH` : null, S.cost != null ? `SAUNA ${euro(S.cost)}` : null].filter(Boolean).join('  ·  '))}</text>`;
  return frame(orient, s, { bg: RISO.paper });
}

export const cutoutsP = {
  id: 'pz-cutouts-p', orient: 'portrait', name: 'Cut-outs · portrait',
  blurb: 'After Matisse’s paper cut-outs: a few organic shapes, new each day. The large one is the '
       + 'temperature (blue when it freezes, sand when mild, coral when warm), drops drift in for the '
       + 'wet hours ahead, the rounder shape is power now, and a green leaf — bigger when waiting '
       + 'saves more — is the sauna window.',
  render, tall: true,
};
