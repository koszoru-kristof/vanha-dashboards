/**
 * Exhibition — after the 1923 exhibition poster and the catalogue's wedges:
 * rays from the top corner fan the sheet into wedges, one for each stretch
 * of the coming day in time order — yellow for daylight, blue where it
 * rains, black for the night, red for the sauna window — each as wide as
 * its hours. A black bar crosses the fan at the angle the price is heading,
 * carrying the place in white type, and the temperature stands in the
 * corner the rays come from.
 */
import { frame, facts, num, euro, SIZE } from '../posters/common.js';
import { PRI, hours, runs, mark, foot, saunaLine, priceWord, T } from './primarykit.js';


function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const u = W / 480;                                                       // 1 on the 480 sheet
  const f = facts(ctx);
  const S = f.sauna;
  const list = hours(f, 24);
  const kindOf = (h) => (h.sauna ? 'sauna' : h.night ? 'night' : ['rain', 'showers', 'thunder', 'sleet'].includes(h.sky) ? 'wet' : 'day');
  const INK = { day: PRI.yellow, wet: PRI.blue, night: PRI.black, sauna: PRI.red };
  const rs = runs(list, kindOf);
  const apex = [W + 40, 150], R = 1400;
  let s = `<rect width="${W}" height="${H}" fill="${PRI.paper}"/>`;
  // the fan: from straight down (90°) round to the left (180°), a wedge per run
  let a = Math.PI / 2 + 0.12;
  const span = Math.PI / 2 - 0.24;
  for (const r of rs) {
    const da = (r.hours.length / list.length) * span;
    const p1 = [apex[0] + R * Math.cos(a), apex[1] + R * Math.sin(a)], p2 = [apex[0] + R * Math.cos(a + da), apex[1] + R * Math.sin(a + da)];
    s += `<path d="M${apex[0]},${apex[1]} L${p1[0].toFixed(1)},${p1[1].toFixed(1)} L${p2[0].toFixed(1)},${p2[1].toFixed(1)} Z" fill="${INK[r.key]}"/>`;
    a += da;
  }
  // the rays themselves, in paper, so the wedges read as cut sheets
  a = Math.PI / 2 + 0.12;
  for (const r of rs.slice(0, -1)) {
    a += (r.hours.length / list.length) * span;
    s += `<line x1="${apex[0]}" y1="${apex[1]}" x2="${(apex[0] + R * Math.cos(a)).toFixed(1)}" y2="${(apex[1] + R * Math.sin(a)).toFixed(1)}" stroke="${PRI.paper}" stroke-width="5"/>`;
  }
  // the bar at the angle the price is heading
  const next = f.next.slice(1, 7).map((p) => p.price);
  const later = next.length ? next.reduce((x, y) => x + y, 0) / next.length : null;
  const trend = f.price != null && later != null ? later - f.price : 0;
  const tilt = -48 + Math.max(-14, Math.min(14, -trend * 1.2));           // rising prices tilt it steeper
  const label = `${f.place.toUpperCase()}  ·  ${f.weekday.toUpperCase()} ${f.dayMonth.toUpperCase()}  ·  ${f.time}`;
  const bx = W - 240, by = 470;
  let along = 0, size = 22;
  if (orient === 'tall') {
    // the wider sheet has room for the whole line: centre it on the bar's visible run and fit it there
    const t = (tilt * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t);
    const hi = (W - 24 - bx) / c, lo = Math.max((H - 92 - 24 - by) / sn, (24 - bx) / c);
    along = (hi + lo) / 2;
    size = Math.max(14, Math.min(22, ((hi - lo) / label.length - 4) / 0.52));
  }
  s += `<g transform="translate(${bx} ${by}) rotate(${tilt.toFixed(1)})"><rect x="${-420 * u}" y="-30" width="${840 * u}" height="60" fill="${PRI.black}"/>`
     + T(along.toFixed(1) * 1, (size * 12 / 22).toFixed(1) * 1, label, { size: size.toFixed(1) * 1, weight: 700, ls: 4, anchor: 'middle', fill: PRI.paper }) + `</g>`;

  // a clear band for the foot, under the fan
  s += `<rect x="0" y="${H - 92}" width="${W}" height="92" fill="${PRI.paper}"/>`;

  // the corner: the temperature and the words
  s += `<text x="30" y="${118 + 22 * (u - 1)}" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="${96 * u}" font-weight="700" letter-spacing="-3" fill="${PRI.black}">${num(f.temp, 0)}°</text>`;
  s += mark(30, 154 + 22 * (u - 1), f.out.head.toLowerCase());
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the fan is the day in order: yellow daylight, blue rain, black night, red the sauna window',
    [`price ${trend > 1.5 ? 'rising' : trend < -1.5 ? 'falling' : 'steady'} (the bar’s tilt)`, f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame(orient, s, { bg: PRI.paper });
}

export const exhibitionP = {
  id: 'pc-exhibition-p', orient: 'portrait', name: 'Exhibition · portrait',
  blurb: 'After the 1923 exhibition poster: rays from the top corner fan the sheet into wedges, one per stretch of '
       + 'the coming day — yellow daylight, blue rain, black night, red the sauna window — each as wide as its hours. '
       + 'A black bar crosses at the angle the price is heading, carrying the place in white type.',
  render, tall: true,
};
