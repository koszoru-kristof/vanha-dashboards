/**
 * Modules — the next twenty-four hours as a grid of Bauhaus modules, four
 * across and six down, reading left to right and top to bottom. The shape
 * of each module is its hour's sky — a disc for clear, a half-disc for some
 * cloud, a square for grey, a quarter-disc where it rains or snows, three
 * bars in fog — and its colour is the hour's price: green cheap, black
 * fair, red dear, an outline where prices are not yet published. The sauna
 * window's modules carry a white dot.
 */
import { frame, facts, num, euro, hourStart, HOUR } from '../posters/common.js';
import { kind as kindOf, sunTimes } from '../../weather.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 480, H = 800;

function module_(k, night, x, y, a, ink, outline) {
  const st = outline ? `fill="none" stroke="${BAU.black}" stroke-width="2.5"` : `fill="${ink}"`;
  switch (k) {
    case 'clear': return night ? `<path d="M${x + a / 2},${y} A${a / 2},${a / 2} 0 1 0 ${x + a / 2},${y + a} A${a * 0.18},${a * 0.5} 0 1 1 ${x + a / 2},${y} Z" ${st}/>`
                                : `<circle cx="${x + a / 2}" cy="${y + a / 2}" r="${a / 2}" ${st}/>`;
    case 'partly': return `<path d="M${x},${y + a / 2} A${a / 2},${a / 2} 0 0 1 ${x + a},${y + a / 2} L${x + a},${y + a} L${x},${y + a} Z" ${st}/>`;
    case 'rain': case 'showers': case 'thunder': case 'sleet': case 'snow':
      return `<path d="M${x},${y + a} L${x},${y} A${a},${a} 0 0 1 ${x + a},${y + a} Z" ${st}/>`;
    case 'fog': return [0, 1, 2].map((i) => `<rect x="${x}" y="${y + i * (a / 3) + a / 18}" width="${a}" height="${a / 4.5}" ${st}/>`).join('');
    default: return `<rect x="${x}" y="${y}" width="${a}" height="${a}" ${st}/>`;
  }
}

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const h0 = hourStart(f.now);
  const price = new Map([...f.today, ...f.tomorrow].map((p) => [p.start, p.price]));
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  const a = 78, gap = 24, x0 = (W - 4 * a - 3 * gap) / 2, y0 = 150;
  for (let i = 0; i < 24; i++) {
    const t = h0 + i * HOUR, r = f.fc.at(t + HOUR / 2), sun = sunTimes(t);
    const night = sun ? t + HOUR / 2 < sun.rise || t + HOUR / 2 > sun.set : false;
    const k = r ? kindOf(r.sym) : 'cloudy', p = price.get(t);
    const ink = p == null ? null : p <= 5 ? BAU.green : p <= 15 ? BAU.black : BAU.red;
    const x = x0 + (i % 4) * (a + gap), y = y0 + Math.floor(i / 4) * (a + gap);
    s += module_(k, night, x, y, a, ink ?? BAU.black, p == null);
    if (S.start != null && t >= S.start && t < S.start + 2 * HOUR) s += `<circle cx="${x + a / 2}" cy="${y + a / 2}" r="7" fill="${BAU.white}"/>`;
  }

  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(40, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="90" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the next 24 hours: shape the sky (disc clear, half some cloud, square grey, quarter rain, bars fog)',
    'colour the price (green cheap, black fair, red dear, outline unpublished) · white dot the sauna',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('portrait', s, { bg: BAU.cream });
}

export const modulesP = {
  id: 'bh-modules-p', orient: 'portrait', name: 'Modules · portrait',
  blurb: 'The next twenty-four hours as a grid of Bauhaus modules: the shape is the hour’s sky (disc, half-disc, '
       + 'square, quarter-disc, bars) and the colour its price (green cheap, black fair, red dear, outline where '
       + 'not yet published), the sauna window’s modules carrying a white dot.',
  render,
};
