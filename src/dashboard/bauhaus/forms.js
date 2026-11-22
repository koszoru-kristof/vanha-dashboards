/**
 * Forms — the three Bauhaus forms in their three colours: the yellow
 * triangle, the blue circle, the red square. Here the triangle is the sun,
 * standing as tall on the sheet as the sun stands in the sky (and navy,
 * low, after dark); the circle is the sky in its colour; the square is the
 * price of power, as large as the price is high, in its band's colour. A
 * black ground line holds them.
 */
import { frame, facts, num, euro } from '../posters/common.js';
import { BAU, skyInk, priceInk, priceWord, level, sunAt, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 480, H = 800;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const { u, height } = sunAt(f);
  const ground = 620;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  // the triangle: the sun
  const th = 120 + 320 * height;
  s += `<path d="M48,${ground} L288,${ground} L168,${ground - th} Z" fill="${u == null ? BAU.night : BAU.mustard}"/>`;
  // the circle: the sky
  s += `<circle cx="336" cy="300" r="92" fill="${skyInk(f.sky ?? 'cloudy', { night: f.night })}"/>`;
  // the square: the price
  const side = 60 + 150 * level(f.price);
  s += `<rect x="${(430 - side).toFixed(1)}" y="${(ground - side).toFixed(1)}" width="${side.toFixed(1)}" height="${side.toFixed(1)}" fill="${priceInk(f.price)}"/>`;
  s += `<rect x="0" y="${ground}" width="${W}" height="8" fill="${BAU.black}"/>`;

  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(40, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  s += T(40, 668, u == null ? 'the sun is down' : `the sun ${height > 0.66 ? 'high' : height > 0.25 ? 'up' : 'low'}`, { size: 12, weight: 600, ls: 1 })
     + T(W - 40, 668, f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', { size: 12, weight: 600, ls: 1, anchor: 'end' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the triangle the sun, as tall as it stands · the circle the sky · the square the price, as large as it is',
    `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`,
  ] });
  return frame('portrait', s, { bg: BAU.cream });
}

export const formsP = {
  id: 'bh-forms-p', orient: 'portrait', name: 'Forms · portrait',
  blurb: 'The three Bauhaus forms in their colours: the triangle is the sun, as tall on the sheet as the sun stands '
       + 'in the sky and navy after dark; the circle is the sky in its colour; the square is the price of power, as '
       + 'large as the price is high, in its band’s colour.',
  render,
};
