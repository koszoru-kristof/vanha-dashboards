/**
 * Lamp — a pendant lamp on a green ground, drawn with the bicycle poster's
 * economy: a cord, a shade, a bulb and a cone of light.
 *
 * The lamp is lit when power is cheap: a wide white cone falls to the foot
 * of the sheet. It narrows when the price is fair, and when power is dear
 * the lamp is off — the cone is gone and the bulb is only an outline. The
 * sauna's hour is written in the light; the day is at the head.
 */
import { frame, facts, num, euro } from '../posters/common.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 480, H = 800;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const p = f.price;
  const lit = p != null && p <= 15;
  const wide = p != null && p <= 5;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.green}"/>`;

  // the cone of light, to the foot
  const rim = { y: 372, half: 64 };
  if (lit) {
    const spread = wide ? 236 : 128;
    s += `<path d="M${240 - rim.half},${rim.y} L${240 + rim.half},${rim.y} L${240 + spread},${H} L${240 - spread},${H} Z" fill="${BAU.white}"/>`;
  }
  // the cord, the shade, the bulb
  s += `<rect x="238" y="0" width="4" height="250" fill="${BAU.white}"/>`;
  s += `<path d="M${240 - rim.half},${rim.y} L${240 - 22},${250} L${240 + 22},${250} L${240 + rim.half},${rim.y} Z" fill="${BAU.black}"/>`;
  s += lit ? `<circle cx="240" cy="${rim.y + 6}" r="22" fill="${BAU.white}"/>`
           : `<circle cx="240" cy="${rim.y + 6}" r="22" fill="none" stroke="${BAU.white}" stroke-width="3"/>`;

  // the day at the head; the price and the sauna
  s += mark(40, 60, f.place.toLowerCase(), { fill: BAU.white });
  s += T(40, 84, `${num(f.temp, 0)}° · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500, fill: BAU.white })
     + T(40, 102, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 11, weight: 500, fill: BAU.white });
  const inLight = lit ? BAU.black : BAU.white;
  const reach = lit ? rim.half + ((wide ? 236 : 128) - rim.half) * ((H - 30 - rim.y) / (H - rim.y)) : 0;   // the cone's half-width at the foot
  const footInk = 240 - reach <= 40 ? BAU.black : BAU.white;
  s += T(240, 700, p != null ? `power ${num(p, 1)} c/kWh, ${priceWord(p)}` : 'no prices yet', { size: 16, weight: 600, anchor: 'middle', fill: inLight })
     + T(240, 724, `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`, { size: 14, weight: 500, anchor: 'middle', fill: inLight });
  s += foot(W, H, { left: f.place.toUpperCase(), fill: footInk, right: String(f.d.getFullYear()), lines: ['the lamp is lit while power is cheap · fmi · nord pool fi'] });
  return frame('portrait', s, { bg: BAU.green });
}

export const lampP = {
  id: 'bh-lamp-p', orient: 'portrait', name: 'Lamp · portrait',
  blurb: 'A pendant lamp on a green ground, drawn with the bicycle poster’s economy: a cord, a shade, a bulb and '
       + 'a cone of light. The lamp is lit while power is cheap — a wide cone to the foot of the sheet — narrows '
       + 'when the price is fair, and is off, bulb in outline, when power is dear.',
  render,
};
