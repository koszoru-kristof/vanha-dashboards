/**
 * Tartan — the coming day woven into cloth.
 *
 * The warp runs upright: one thread an hour for the next twenty-four, each
 * in the ink of its sky — yellow sun, blue rain, navy night, pale fog — with
 * a fine dark line at every hour. The weft runs across in the same hours'
 * prices, green through yellow to red, laid over the warp as a twill, so
 * where two colours cross they mix in a fine diagonal weave as they do in a
 * real sett. The sauna hours are picked out in green thread. A paper label
 * is stitched on over the cloth with the temperature and the facts.
 */
import { frame, facts, esc, int, num, euro, uid, hourStart, HOUR, SANS } from '../posters/common.js';
import { kind as kindOf, sunTimes } from '../../weather.js';
import { PRINT, skyInk, priceInk, priceWord, T } from './printkit.js';

const W = 800, H = 480, N = 24;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const h0 = hourStart(f.now);
  const price = new Map([...f.today, ...f.tomorrow].map((p) => [p.start, p.price]));
  const hours = Array.from({ length: N }, (_, i) => {
    const t = h0 + i * HOUR, r = f.fc.at(t + HOUR / 2), sun = sunTimes(t);
    const night = sun ? t + HOUR / 2 < sun.rise || t + HOUR / 2 > sun.set : false;
    return { t, sky: skyInk(r ? kindOf(r.sym) : 'cloudy', { night, temp: r?.temp }), price: price.get(t) ?? null };
  });
  const wx = W / N, wy = H / N;
  const ids = { twill: uid('tw'), mask: uid('tm') };
  let s = `<defs>
    <pattern id="${ids.twill}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="3.2" fill="#fff"/></pattern>
    <mask id="${ids.mask}"><rect width="${W}" height="${H}" fill="url(#${ids.twill})"/></mask>
  </defs>`;
  s += `<rect width="${W}" height="${H}" fill="${PRINT.paper}"/>`;
  // the warp: the skies
  hours.forEach((h, i) => { s += `<rect x="${(i * wx).toFixed(2)}" y="0" width="${(wx + 0.5).toFixed(2)}" height="${H}" fill="${h.sky}"/>`; });
  // the weft: the prices, woven over as a twill
  let weft = '';
  hours.forEach((h, i) => {
    if (h.price == null) return;
    weft += `<rect x="0" y="${(i * wy).toFixed(2)}" width="${W}" height="${(wy - 2.5).toFixed(2)}" fill="${priceInk(h.price)}"/>`;
  });
  s += `<g mask="url(#${ids.mask})">${weft}</g>`;
  // fine dark lines between the hours, and the sauna hours picked out in green thread
  hours.forEach((h, i) => {
    s += `<rect x="${(i * wx - 0.6).toFixed(2)}" y="0" width="1.2" height="${H}" fill="${PRINT.black}" opacity=".55"/>`;
    if (S.start != null && h.t >= S.start && h.t < S.start + 2 * HOUR) s += `<rect x="${(i * wx + 4).toFixed(2)}" y="0" width="3" height="${H}" fill="${PRINT.green}"/>`;
  });

  // the label, stitched on
  const L = { x: 486, y: 274, w: 274, h: 166 };
  s += `<rect x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}" rx="3" fill="${PRINT.paper}"/>`
     + `<rect x="${L.x + 7}" y="${L.y + 7}" width="${L.w - 14}" height="${L.h - 14}" rx="2" fill="none" stroke="${PRINT.black}" stroke-width="1.4" stroke-dasharray="5 4"/>`;
  const t = `${int(f.temp)}°`;
  s += T(L.x + 22, L.y + 34, `${f.place.toUpperCase()} · ${f.weekday.slice(0, 3).toUpperCase()} ${f.dayMonth.toUpperCase()} · ${f.time}`, { size: 9.5, weight: 700, ls: 1.8 });
  s += `<text x="${L.x + 20}" y="${L.y + 104}" font-family='${SANS}' font-size="${t.length > 3 ? 66 : 76}" font-weight="800" letter-spacing="-3" fill="${PRINT.black}">${esc(t)}</text>`;
  s += T(L.x + 22, L.y + 124, f.out.head, { size: 13, weight: 600 })
     + T(L.x + 22, L.y + 140, f.price != null ? `Power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'No prices yet', { size: 11.5, weight: 500 })
     + T(L.x + 22, L.y + 155, S.state === 'now' ? `Sauna now${S.cost != null ? `, about ${euro(S.cost)}` : ''}`
        : S.start != null ? `Sauna ${S.tomorrow ? 'tomorrow ' : ''}at ${S.at}${S.cost != null ? `, about ${euro(S.cost)}` : ''}` : S.line, { size: 11.5, weight: 500 });
  return frame('landscape', s, { bg: PRINT.paper });
}

export const tartanL = {
  id: 'pr-tartan-l', orient: 'landscape', name: 'Tartan · landscape',
  blurb: 'The coming day woven into cloth: upright threads are the next twenty-four hours’ skies, threads '
       + 'across are the same hours’ prices, woven over them as a twill so the colours mix where they cross, '
       + 'the sauna hours picked out in green thread. A paper label is stitched on with the temperature and the facts.',
  render,
};
