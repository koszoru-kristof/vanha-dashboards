/**
 * Tree — one tree through the year: a round crown on a black trunk, pale
 * green in May, full green through the summer, mustard in the autumn, and
 * a bare black ring from November to April. In autumn the wind takes the
 * leaves, a few small discs drifting off to the right, more the harder it
 * blows; snow, or a hard frost, leaves a white cap on the crown.
 */
import { frame, facts, num, euro, rng, hash, SIZE } from '../posters/common.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const ex = W - 480;                 // the extra width of the 3:4 sheet; 0 on the 480 poster
  const f = facts(ctx);
  const S = f.sauna;
  const R = rng(hash(`${f.d.toDateString()}${f.scenario?.id ?? ''}`));
  const m = f.d.getMonth() + 1;
  const season = m === 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m === 9 || m === 10 ? 'autumn' : 'bare';
  const crown = { spring: '#8fb98a', summer: BAU.green, autumn: BAU.mustard, bare: null }[season];
  const wind = Number.isFinite(f.wind) ? f.wind : 3;
  const snow = f.sky === 'snow' || (Number.isFinite(f.temp) && f.temp <= -8);
  const C = { x: W / 2, y: 330, r: 150 + ex / 4 };   // a broader crown on the wider sheet
  const tw = 32 + ex / 20;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  s += `<rect x="${C.x - tw / 2}" y="${C.y}" width="${tw}" height="${656 - C.y}" fill="${BAU.black}"/>`;
  s += `<rect x="0" y="656" width="${W}" height="8" fill="${BAU.black}"/>`;
  s += crown ? `<circle cx="${C.x}" cy="${C.y}" r="${C.r}" fill="${crown}"/>` : `<circle cx="${C.x}" cy="${C.y}" r="${C.r - 5}" fill="none" stroke="${BAU.black}" stroke-width="10"/>`;
  if (snow) s += `<path d="M${C.x - C.r},${C.y} A${C.r},${C.r} 0 0 1 ${C.x + C.r},${C.y} Z" fill="${BAU.white}" stroke="${BAU.black}" stroke-width="${crown ? 0 : 3}"/>`;
  if (season === 'autumn') {
    const n = Math.round(Math.min(14, wind * 0.9));
    for (let i = 0; i < n; i++) s += `<circle cx="${(C.x + 60 + ex / 4 + R() * 200 + i * 6).toFixed(0)}" cy="${(C.y - 40 + R() * 280).toFixed(0)}" r="${(6 + R() * 6).toFixed(1)}" fill="${BAU.mustard}"/>`;
  }
  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(40, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  const word = { spring: 'first leaves', summer: 'in full leaf', autumn: wind >= 6 ? 'the wind takes the leaves' : 'turning', bare: snow ? 'bare, under snow' : 'bare' }[season];
  s += mark(W - 40, 706, word, { size: 24, anchor: 'end' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'one tree through the year: green in summer, mustard in autumn, a bare ring in winter',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame(orient, s, { bg: BAU.cream });
}

export const treeP = {
  id: 'bh-tree-p', orient: 'portrait', name: 'Tree · portrait',
  blurb: 'One tree through the year: a round crown on a black trunk, pale green in May, full green through the '
       + 'summer, mustard in autumn with the wind taking the leaves, a bare black ring from November to April, and a '
       + 'white cap of snow in a hard frost.',
  render, tall: true,
};
