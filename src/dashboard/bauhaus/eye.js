/**
 * Eye — one wide eye across the sheet, after the collection's "Bauhaus
 * Eye". The iris is the colour of the sky; the pupil dilates as the light
 * goes, a pinpoint at noon and wide open at night, because that is what
 * eyes do. Rain falls across the eye as fine lines. The facts are set in
 * the corners.
 */
import { frame, facts, num, euro, uid, rng, hash } from '../posters/common.js';
import { BAU, skyInk, sunAt, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const R = rng(hash(`${f.d.toDateString()}${f.scenario?.id ?? ''}`));
  const k = f.sky ?? 'cloudy';
  const { height } = sunAt(f);
  const iris = skyInk(k, { night: f.night });
  const clip = uid('eye');
  const C = { x: 400, y: 240 }, half = 300, lid = 150;
  const shape = `M${C.x - half},${C.y} Q${C.x},${C.y - lid * 2} ${C.x + half},${C.y} Q${C.x},${C.y + lid * 2} ${C.x - half},${C.y} Z`;
  let s = `<defs><clipPath id="${clip}"><path d="${shape}"/></clipPath></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  s += `<path d="${shape}" fill="${BAU.white}"/>`;
  s += `<g clip-path="url(#${clip})">`;
  s += `<circle cx="${C.x}" cy="${C.y}" r="128" fill="${iris}"/>`;
  s += `<circle cx="${C.x}" cy="${C.y}" r="${(46 + 70 * (1 - height)).toFixed(1)}" fill="${BAU.black}"/>`;   // the pupil dilates as the light goes
  s += `<circle cx="${C.x - 40}" cy="${C.y - 44}" r="16" fill="${BAU.white}"/>`;
  if (['rain', 'showers', 'thunder', 'sleet'].includes(k)) {
    for (let i = 0; i < 14; i++) {
      const x = C.x - half + 40 + i * 42 + R() * 14;
      s += `<line x1="${x.toFixed(1)}" y1="${C.y - lid}" x2="${(x - 40).toFixed(1)}" y2="${C.y + lid}" stroke="${BAU.blue}" stroke-width="3" stroke-dasharray="14 10"/>`;
    }
  }
  s += `</g>`;
  s += `<path d="${shape}" fill="none" stroke="${BAU.black}" stroke-width="9" stroke-linejoin="round"/>`;
  if (f.night || k === 'fog') s += `<path d="M${C.x - half},${C.y} Q${C.x},${C.y - lid * (k === 'fog' ? 1.1 : 0.7)} ${C.x + half},${C.y} Q${C.x},${C.y - lid * 2} ${C.x - half},${C.y} Z" fill="${BAU.cream}" stroke="${BAU.black}" stroke-width="9"/>`;   // a heavy lid at night, and in fog

  // the words
  s += mark(40, 56, f.place.toLowerCase())
     + T(40, 78, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="84" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="60" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`
     + T(W - 40, 106, f.out.head.toLowerCase(), { size: 13, weight: 500, anchor: 'end' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the iris is the sky · the pupil opens as the light goes',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: BAU.cream });
}

export const eyeL = {
  id: 'bh-eye-l', orient: 'landscape', name: 'Eye · landscape',
  blurb: 'One wide eye across the sheet: the iris is the colour of the sky, the pupil dilates as the light goes — '
       + 'a pinpoint at noon, wide open at night — rain falls across it as fine lines, and a heavy lid comes down '
       + 'after dark and in fog.',
  render,
};
