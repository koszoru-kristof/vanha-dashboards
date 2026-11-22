/**
 * Arch — the day as an arch of concentric bands, one band for each hour of
 * daylight, so the arch is slender in December and broad in June. A red sun
 * travels the arch from left to right between sunrise and sunset; after
 * dark the arch itself goes black. The temperature stands in the opening.
 */
import { frame, facts, num, euro, HOUR } from '../posters/common.js';
import { BAU, sunAt, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 480, H = 800;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const hours = f.dayLen != null ? Math.max(4, Math.round(f.dayLen / HOUR)) : 12;
  const C = { x: 240, y: 560 }, r0 = 92, r1 = 212;
  const { u } = sunAt(f);
  const bandInk = u == null ? BAU.black : BAU.green;                  // the arch goes dark after sunset
  const band = (r1 - r0) / hours;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  // the bands, green and cream by turns
  for (let i = hours - 1; i >= 0; i--) {
    const ro = r0 + (i + 1) * band, ri = r0 + i * band + Math.max(2, band * 0.32);
    s += `<path d="M${C.x - ro},${C.y} A${ro},${ro} 0 0 1 ${C.x + ro},${C.y} L${C.x + ri},${C.y} A${ri},${ri} 0 0 0 ${C.x - ri},${C.y} Z" fill="${bandInk}"/>`;
  }
  s += `<rect x="0" y="${C.y}" width="${W}" height="6" fill="${BAU.black}"/>`;

  // the sun on its way along the arch (held just inside the sheet at either end)
  if (u != null) {
    const a = Math.PI + Math.max(0.08, Math.min(0.92, u)) * Math.PI, rr = r1 + 30;
    s += `<circle cx="${(C.x + rr * Math.cos(a)).toFixed(1)}" cy="${(C.y + rr * Math.sin(a)).toFixed(1)}" r="24" fill="${BAU.red}"/>`;
  }

  // the temperature in the opening
  s += `<text x="${C.x}" y="${C.y - 22}" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="${String(Math.round(f.temp)).length > 2 ? 62 : 74}" font-weight="700" letter-spacing="-2" text-anchor="middle" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;

  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 })
     + T(40, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    `${hours} hours of light${f.sun ? `, ${new Date(f.sun.rise).toTimeString().slice(0, 5)} to ${new Date(f.sun.set).toTimeString().slice(0, 5)}` : ''} · one band an hour · ${u == null ? 'the arch goes dark at night' : 'the sun on its way'}`,
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('portrait', s, { bg: BAU.cream });
}

export const archP = {
  id: 'bh-arch-p', orient: 'portrait', name: 'Arch · portrait',
  blurb: 'The day as an arch of concentric bands, one for each hour of daylight, so the arch is slender in '
       + 'December and broad in June. A red sun travels it from left to right between sunrise and sunset; after '
       + 'dark the arch itself goes black. The temperature stands in the opening.',
  render,
};
