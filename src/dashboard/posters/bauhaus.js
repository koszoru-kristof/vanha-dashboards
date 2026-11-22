/**
 * Bauhaus — a circle, a diagonal and a half-circle in balance, with type.
 *
 * The circle is the sky, in its ink (navy after dark); rain crosses it as
 * fine diagonal strokes, fog as bands, snow as dots. The diagonal is power:
 * as heavy as the price now is high, in its band's colour, and tilted up or
 * down as prices rise or fall over the next hours. The green half-circle
 * rising from the foot is the sauna window, its time set inside it. The
 * temperature and the outlook are set top right in a bold geometric sans.
 */
import { frame, facts, esc, int, num, euro, HOUR, SANS, rng, hash, uid } from './common.js';
import { RISO, skyInk, priceInk, MULTIPLY } from './artkit.js';

const W = 800, H = 480;
const T = (x, y, s, { size = 13, weight = 600, fill = RISO.ink, anchor = 'start', ls = 0, extra = '' } = {}) =>
  `<text x="${x}" y="${y}" font-family='${SANS}' font-size="${size}" font-weight="${weight}" letter-spacing="${ls}" text-anchor="${anchor}" fill="${fill}"${extra}>${esc(s)}</text>`;
/* small type knocks the diagonal out around itself, so it stays crisp where they cross */
const KNOCK = ` stroke="${RISO.paper}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"`;
const level = (p) => (p == null ? 0.3 : Math.max(0, Math.min(1, Math.log2(1 + Math.max(0, p) / 2.5) / Math.log2(25))));

function render(ctx) {
  const f = facts(ctx);
  const R = rng(hash(`${f.d.toDateString()}${f.scenario?.id ?? ''}`));
  const k = f.sky ?? 'cloudy';
  const clip = uid('bc');
  const C = { x: 238, y: 236, r: 176 };
  let s = `<defs><clipPath id="${clip}"><circle cx="${C.x}" cy="${C.y}" r="${C.r}"/></clipPath></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${RISO.paper}"/>`;

  // power: a diagonal band, heavy when dear, tilted with where prices go next
  const next = f.next.slice(0, 6).map((p) => p.price);
  const trend = next.length > 1 ? (next.slice(-2).reduce((a, b) => a + b, 0) / 2) - next[0] : 0;
  const tilt = -18 - Math.max(-14, Math.min(14, trend * 1.4));        // degrees; rising prices tilt it up
  const thick = 26 + 70 * level(f.price);
  s += `<rect x="-200" y="${(300 - thick / 2).toFixed(1)}" width="1200" height="${thick.toFixed(1)}" fill="${priceInk(f.price)}"`
     + ` transform="rotate(${tilt.toFixed(1)} 400 300)"${MULTIPLY}/>`;

  // the sky: a circle in its ink, with the weather drawn inside it
  const sky = skyInk(k, { night: f.night, temp: f.temp });
  s += `<circle cx="${C.x}" cy="${C.y}" r="${C.r}" fill="${sky}"${MULTIPLY}/>`;
  let wx = '';
  const wet = ['rain', 'showers', 'thunder', 'sleet'].includes(k);
  if (wet) {
    const mm = f.fc.between(f.now, f.now + 3 * HOUR).reduce((a, q) => a + q.mm, 0);
    const n = Math.round(6 + Math.min(10, mm * 1.5));
    for (let i = 0; i < n; i++) {
      const x = C.x - C.r + ((i + 0.5) / n) * C.r * 2.4;
      wx += `<line x1="${x.toFixed(1)}" y1="${C.y - C.r}" x2="${(x - 120).toFixed(1)}" y2="${C.y + C.r}" stroke="${RISO.blue}" stroke-width="${(2.5 + R() * 2).toFixed(1)}"${MULTIPLY}/>`;
    }
  } else if (k === 'fog') {
    for (let y = C.y - C.r + 40; y < C.y + C.r; y += 44) wx += `<rect x="0" y="${y}" width="${W}" height="14" fill="${RISO.paper}"/>`;
  } else if (k === 'snow') {
    for (let i = 0; i < 40; i++) wx += `<circle cx="${C.x - C.r + R() * C.r * 2}" cy="${C.y - C.r + R() * C.r * 2}" r="${3 + R() * 3}" fill="${RISO.paper}"/>`;
  }
  s += `<g clip-path="url(#${clip})">${wx}</g>`;

  // the sauna window: a green half-circle rising from the foot
  const S = f.sauna;
  if (S.start != null || S.state === 'now') {
    const hx = 612, hr = 84;
    s += `<path d="M${hx - hr},${H} A${hr},${hr} 0 0 1 ${hx + hr},${H} Z" fill="${RISO.green}"${MULTIPLY}/>`
       + T(hx, H - 40, S.state === 'now' ? 'NOW' : S.at, { size: 24, weight: 800, fill: RISO.paper, anchor: 'middle' })
       + T(hx, H - 18, S.tomorrow ? 'SAUNA TOMORROW' : 'SAUNA', { size: 10.5, weight: 700, fill: RISO.paper, anchor: 'middle', ls: 1.6 });
  }

  // type: the temperature, the outlook, the figures
  const t = `${int(f.temp)}°`;
  s += T(770, 178, t, { size: t.length > 3 ? 138 : 162, weight: 800, anchor: 'end', ls: -4, extra: MULTIPLY })
     + `<rect x="${770 - 250}" y="200" width="250" height="4" fill="${RISO.ink}"/>`
     + T(770, 236, f.out.head.toUpperCase(), { size: 19, weight: 750, anchor: 'end', ls: 0.8, extra: KNOCK })
     + T(770, 262, f.price != null ? `POWER ${num(f.price, 1)} C/KWH NOW` : 'NO PRICES YET', { size: 12, weight: 650, anchor: 'end', ls: 1.6, extra: KNOCK })
     + T(770, 282, S.cost != null ? `SAUNA ${S.tomorrow ? 'TOMORROW ' : ''}${S.state === 'now' ? 'NOW' : S.at} · ${euro(S.cost)}` : '', { size: 12, weight: 650, anchor: 'end', ls: 1.6, extra: KNOCK });
  s += T(30, 452, `${f.place.toUpperCase()} · ${f.time}`, { size: 11.5, weight: 700, ls: 2.2 });
  return frame('landscape', s, { bg: RISO.paper });
}

export const bauhausL = {
  id: 'pz-bauhaus-l', orient: 'landscape', name: 'Bauhaus · landscape',
  blurb: 'A circle, a diagonal and a half-circle in balance: the circle is the sky in its ink (rain '
       + 'crosses it as fine strokes, fog as bands), the diagonal is power — as heavy as the price is '
       + 'high, tilted with where prices go next — and the green half-circle is the sauna window.',
  render,
};
