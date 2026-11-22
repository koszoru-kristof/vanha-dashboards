/**
 * Eclipse — the price eclipses the day.
 *
 * One disc in the sky's ink — yellow sun, blue rain, navy night, pale fog —
 * and a second disc of paper sliding across it from the upper right by as
 * much as power costs: the whole disc when it is cheap, a thin crescent
 * when it is dear. A small green moon circles the disc at the sauna hour,
 * midnight at the top and noon at the foot. The temperature is written
 * beneath in a light italic; the day in a few small lines.
 */
import { frame, SIZE, facts, esc, int, num, euro } from '../posters/common.js';
import { PRINT, DISPLAY, skyInk, priceWord, level, T } from './printkit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const ex = W - 480;                                        // the tall sheet's extra width
  const f = facts(ctx);
  const S = f.sauna;
  const C = { x: W / 2, y: 300 - ex / 5, r: 178 + ex / 8 };     // tall: a larger disc, raised so the moon's orbit keeps its foot
  const sky = skyInk(f.sky ?? 'cloudy', { night: f.night, temp: f.temp });
  const cover = level(f.price);
  const d = C.r * (2 - 1.82 * cover);                              // the shadow's centre, from the disc's
  const ang = -0.62;
  const sx = C.x + d * Math.cos(ang), sy = C.y + d * Math.sin(ang);
  let s = `<rect width="${W}" height="${H}" fill="${PRINT.paper}"/>`;
  s += `<circle cx="${C.x}" cy="${C.y}" r="${C.r}" fill="${sky}"/>`;
  s += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${C.r}" fill="${PRINT.paper}"/>`;

  // the sauna's moon
  const when = S.state === 'now' ? f.now : S.start;
  if (when != null) {
    const h = new Date(when).getHours() + new Date(when).getMinutes() / 60;
    const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
    const orbit = C.r + 30;
    s += `<circle cx="${(C.x + orbit * Math.cos(a)).toFixed(1)}" cy="${(C.y + orbit * Math.sin(a)).toFixed(1)}" r="9" fill="${PRINT.green}"/>`;
  }

  // the temperature, and the day
  const t = `${int(f.temp)}°`;
  s += `<text x="${W / 2}" y="640" font-family='${DISPLAY}' font-size="${(t.length > 3 ? 120 : 140) + ex / 12}" font-weight="300" font-style="italic" text-anchor="middle" fill="${PRINT.black}" style="font-variation-settings:'SOFT' 100">${esc(t)}</text>`;
  const lines = [
    `${f.place}, ${f.weekday} ${f.dayMonth}, ${f.time}`,
    `${f.out.head}${f.price != null ? ` · power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : ''}`,
    S.state === 'now' ? `Sauna now${S.cost != null ? `, about ${euro(S.cost)}` : ''}`
      : S.start != null ? `Sauna ${S.tomorrow ? 'tomorrow ' : ''}at ${S.at}${S.cost != null ? `, about ${euro(S.cost)}` : ''}` : S.line,
  ];
  lines.forEach((l, i) => { s += T(W / 2, 692 + i * 21, l, { size: 13, weight: 500, anchor: 'middle' }); });
  s += T(W / 2, 768, 'THE PRICE ECLIPSES THE DAY · THE GREEN MOON IS THE SAUNA HOUR', { size: 8.5, weight: 700, ls: 1.6, anchor: 'middle', fill: '#8a8a8e' });
  return frame(orient, s, { bg: PRINT.paper });
}

export const eclipseP = {
  id: 'pr-eclipse-p', orient: 'portrait', name: 'Eclipse · portrait',
  blurb: 'The price eclipses the day: one disc in the sky’s ink, and a disc of paper sliding across it by as '
       + 'much as power costs — the whole disc when cheap, a thin crescent when dear. A small green moon circles '
       + 'it at the sauna hour, midnight at the top, noon at the foot.',
  render, tall: true,
};
