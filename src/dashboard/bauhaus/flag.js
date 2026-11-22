/**
 * Flag — a flag on a black pole, flying as far as the wind carries it.
 *
 * In a calm the cloth hangs in a short fold; in a gale it streams to the
 * edge of the sheet and ripples. It is a signal flag: its colour is the
 * price of power now — green cheap, mustard fair, red dear, blue below
 * zero — so the flag says at a glance whether to run the sauna, and how
 * hard the wind blows outside.
 */
import { frame, facts, num, euro, smooth, SIZE } from '../posters/common.js';
import { BAU, priceInk, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const e = W - 480;                                               // the extra width of a 3:4 sheet
  const f = facts(ctx);
  const S = f.sauna;
  const wind = Number.isFinite(f.wind) ? f.wind : 3;
  const ink = priceInk(f.price);
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;

  // the pole
  const px = 96 + e / 5;
  s += `<rect x="${px - 6}" y="120" width="12" height="${H - 120}" fill="${BAU.black}"/>`;
  s += `<circle cx="${px}" cy="118" r="12" fill="${BAU.black}"/>`;

  // the cloth: its length and its ripple from the wind
  const len = (90 + Math.min(16, wind) * 19) * ((W - px - 6) / 378);   // a gale still reaches the edge
  const amp = 4 + Math.min(16, wind) * 1.6;
  const sag = Math.max(0, 60 - wind * 5);                          // a calm flag droops
  const top = [], bottom = [];
  const y0 = 150, hgt = 230 + e / 4;
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, x = px + 6 + len * u;
    const wave = amp * Math.sin(u * Math.PI * 2.2 - 0.6) * u;
    top.push([x, y0 + sag * u * u + wave]);
    bottom.push([x, y0 + hgt + sag * u * u * 1.4 + wave]);
  }
  const back = bottom.slice().reverse();
  s += `<path d="${smooth(top)} L${back[0][0].toFixed(1)},${back[0][1].toFixed(1)} ${smooth(back).slice(1)} Z" fill="${ink}"/>`;

  // the words
  s += mark(W - 40, 60, f.place.toLowerCase(), { anchor: 'end' })
     + T(W - 40, 82, `${num(f.temp, 0)}° · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500, anchor: 'end' })
     + T(W - 40, 100, `wind ${num(wind, 0)} m/s · ${f.time}`, { size: 11, weight: 500, anchor: 'end' });
  s += mark(W - 40, 640, f.price != null ? priceWord(f.price) : 'no prices', { size: 30, anchor: 'end', fill: ink === BAU.mustard ? BAU.black : ink })
     + T(W - 40, 664, f.price != null ? `power ${num(f.price, 1)} c/kWh` : 'prices come at 14:00', { size: 13, weight: 500, anchor: 'end' })
     + T(W - 40, 684, `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`, { size: 13, weight: 500, anchor: 'end' });
  s += foot(W, H, { left: '', right: String(f.d.getFullYear()), lines: [] })
     + T(px + 30, H - 46, f.place.toUpperCase(), { size: 12, weight: 700, ls: 4 })
     + T(px + 30, H - 28, 'the flag flies as far as the wind · its colour is the price', { size: 7.5, weight: 600, ls: 1 });
  return frame(orient, s, { bg: BAU.cream });
}

export const flagP = {
  id: 'bh-flag-p', orient: 'portrait', name: 'Flag · portrait',
  blurb: 'A flag on a black pole, flying as far as the wind carries it — a short fold in a calm, streaming and '
       + 'rippling in a gale. It is a signal flag: its colour is the price of power now, green cheap, mustard fair, '
       + 'red dear, blue below zero.',
  render, tall: true,
};
