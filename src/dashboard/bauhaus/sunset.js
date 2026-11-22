/**
 * Sunset — a red sun over a black sea of waves, as on the 1923 exhibition
 * poster, except that the sun stands where it really is: rising out of the
 * sea at dawn, high at noon, sinking at dusk. After dark the sheet turns
 * black, the waves cream, and a white moon takes the sun's place. The
 * waves run as high as the wind. The heading states the day.
 */
import { frame, facts, num, euro, smooth, SIZE } from '../posters/common.js';
import { BAU, sunAt, priceWord, T } from './bauhauskit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const f = facts(ctx);
  const S = f.sauna;
  const { u, height } = sunAt(f);
  const night = u == null;
  const ground = night ? BAU.black : BAU.cream, sea = night ? BAU.cream : BAU.black, ink = night ? BAU.cream : BAU.black;
  let s = `<rect width="${W}" height="${H}" fill="${ground}"/>`;

  // the sun (or the moon), behind the sea
  const horizon = 420, R = 112;
  if (!night) s += `<circle cx="${W / 2}" cy="${(horizon + 26 - height * 200).toFixed(1)}" r="${R}" fill="${BAU.red}"/>`;
  else s += `<circle cx="${W / 2 + 60}" cy="300" r="${R * 0.62}" fill="${BAU.white}"/>`;

  // the sea: bands that heave with the wind
  const wind = Number.isFinite(f.wind) ? f.wind : 3;
  const amp = 4 + Math.min(16, wind) * 1.9;
  const d = (x, y) => amp * Math.sin((x / 250) * Math.PI * 2 + y / 92) + amp * 0.45 * Math.sin((x / 135) * Math.PI * 2 - y / 60 + 1.3);
  const pitch = 42, thick = 22;
  for (let y0 = horizon; y0 < H + 40; y0 += pitch) {
    const top = [], bottom = [];
    for (let x = -30; x <= W + 30; x += 18) { top.push([x, y0 + d(x, y0)]); bottom.push([x, y0 + thick + d(x, y0 + thick)]); }
    const back = bottom.slice().reverse();
    s += `<path d="${smooth(top)} L${back[0][0].toFixed(1)},${back[0][1].toFixed(1)} ${smooth(back).slice(1)} Z" fill="${sea}"/>`;
  }

  // the heading
  s += `<text x="40" y="76" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="26" letter-spacing="1" fill="${ink}">`
     + `<tspan font-weight="700">${f.place.toUpperCase()}</tspan><tspan font-weight="400"> ${f.weekday.toUpperCase()}</tspan></text>`;
  s += T(40, 98, `${f.dayMonth.toUpperCase()} · ${f.time}`, { size: 13, weight: 500, ls: 1.2, fill: ink });
  s += T(40, 134, `${num(f.temp, 0)}°  ${f.out.head.toUpperCase()}`, { size: 15, weight: 700, ls: 1.6, fill: ink });
  s += T(40, 156, [f.price != null ? `POWER ${num(f.price, 1)} C/KWH, ${priceWord(f.price).toUpperCase()}` : 'NO PRICES YET',
    S.state === 'now' ? 'SAUNA NOW' : S.start != null ? `SAUNA ${S.tomorrow ? 'TOMORROW ' : ''}${S.at}` : null,
    S.cost != null ? euro(S.cost) : null].filter(Boolean).join('  ·  '), { size: 10, weight: 600, ls: 1.2, fill: ink });
  return frame(orient, s, { bg: ground });
}

export const sunsetP = {
  id: 'bh-sunset-p', orient: 'portrait', name: 'Sunset · portrait',
  blurb: 'A red sun over a black sea of waves, as on the 1923 exhibition poster, except that the sun stands where '
       + 'it really is — rising out of the sea at dawn, high at noon, sinking at dusk — and after dark the sheet '
       + 'turns black under a white moon. The waves run as high as the wind.',
  render, tall: true,
};
