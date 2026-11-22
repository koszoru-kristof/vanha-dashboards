/**
 * Sunflower — the next day as the seed head of a sunflower. Each seed is a
 * quarter of an hour, laid on the golden-angle spiral from now at the heart
 * outwards, all the same size so the spirals show; its colour is the price
 * of that hour (sage, sand, coral), the sauna window's seeds are green, and
 * hours not yet published are left as paper. The head sits on a soft disc of
 * the sky's colour; the temperature is in its heart and the day is written
 * beside it.
 */
import { frame, facts, esc, int, num, euro, measure, HOUR, SANS } from './common.js';
import { RISO, skyInk, priceInk, tint, DISPLAY, hourWords } from './artkit.js';

const W = 800, H = 480;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));            // 137.5°
const Q = 15 * 60e3;

/* Words, wrapped to a width with the canvas metrics of the face. */
function wrap(s, width, style) {
  const out = [];
  for (const w of s.split(' ')) {
    const line = out.length ? `${out.at(-1)} ${w}` : w;
    if (out.length && measure(line, style).w <= width) out[out.length - 1] = line; else out.push(w);
  }
  return out;
}

function render(ctx) {
  const f = facts(ctx);
  const cx = 262, cy = 240, N = 96, n0 = 14;
  const c = 196 / Math.sqrt(N + n0);
  const price = new Map([...f.today, ...f.tomorrow].map((p) => [p.start, p.price]));
  const q0 = Math.floor(f.now / Q) * Q;
  const S = f.sauna;
  const inSauna = (t) => S.start != null && t >= S.start && t < S.start + 2 * HOUR;

  const sky = skyInk(f.sky ?? 'cloudy', { night: f.night, temp: f.temp });
  let s = `<rect width="${W}" height="${H}" fill="${RISO.paper}"/>`
        + `<circle cx="${cx}" cy="${cy}" r="${c * Math.sqrt(N + n0) + 24}" fill="${tint(sky, f.night ? 0.55 : 0.35)}"/>`;
  let marks = '';
  for (let k = N - 1; k >= 0; k--) {
    const t = q0 + k * Q, n = k + n0;
    const a = n * GOLDEN, rr = c * Math.sqrt(n);
    const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
    const hour = new Date(t); hour.setMinutes(0, 0, 0);
    const p = price.get(+hour);
    const r = c * 0.7;                                  // packed, so the spirals show
    if (p == null) s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${RISO.paper}"/>`;
    else s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${inSauna(t) ? RISO.green : priceInk(p)}"/>`;
    if (k === 0) marks += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + 3).toFixed(1)}" fill="none" stroke="${RISO.ink}" stroke-width="2.4"/>`;
  }
  s += marks;

  // the heart: the temperature
  const t = `${int(f.temp)}°`;
  s += `<text x="${cx + 4}" y="${cy + 24}" font-family='${SANS}' font-size="${t.length > 3 ? 56 : 68}" font-weight="800" letter-spacing="-2" text-anchor="middle" fill="${RISO.ink}">${esc(t)}</text>`;

  // the day, written beside the flower
  const o = f.out;
  const phrase = o.state === 'wet' && o.until ? `${o.head.split(' ')[0]} until ${hourWords(new Date(o.until).getHours())}`
    : o.state === 'fog' && /\d\d:00/.test(o.head) ? `Fog until ${hourWords(+o.head.match(/(\d\d):00/)[1])}`
    : o.state === 'coming' && o.from ? `${o.head.split(' ')[0]} from ${hourWords(new Date(o.from).getHours())}`
    : o.head;
  const X = 530, CW = 244;
  const big = { size: 34, weight: 360, family: DISPLAY };
  let y = 110;
  for (const l of wrap(phrase, CW, big).slice(0, 3)) {
    s += `<text x="${X}" y="${y}" font-family='${DISPLAY}' font-size="34" font-weight="360" fill="${RISO.ink}" style="font-variation-settings:'SOFT' 100">${esc(l)}</text>`;
    y += 40;
  }
  y += 12;
  const lines = [
    f.price != null ? `Power ${num(f.price, 1)} c/kWh now` : 'No prices yet',
    S.start != null ? `${S.line}${S.cost != null ? ` · ${euro(S.cost)}` : ''}` : S.line,
  ];
  for (const l of lines) { s += `<text x="${X}" y="${y}" font-family='${SANS}' font-size="15" font-weight="550" fill="${RISO.ink}">${esc(l)}</text>`; y += 22; }
  const key = { size: 11.5, weight: 500, family: SANS };
  let ky = 390;
  for (const l of wrap('Each seed is a quarter of an hour, from now at the heart outwards; its colour is the price, green the sauna.', CW, key)) {
    s += `<text x="${X}" y="${ky}" font-family='${SANS}' font-size="11.5" font-weight="500" fill="${RISO.ink}">${esc(l)}</text>`;
    ky += 15;
  }
  s += `<text x="${X}" y="452" font-family='${SANS}' font-size="11.5" font-weight="700" letter-spacing="2.2" fill="${RISO.ink}">${f.place.toUpperCase()} · ${f.time}</text>`;
  return frame('landscape', s, { bg: RISO.paper });
}

export const sunflowerL = {
  id: 'pz-sunflower-l', orient: 'landscape', name: 'Sunflower · landscape',
  blurb: 'The next day as a sunflower’s seed head: each seed a quarter hour on the golden-angle '
       + 'spiral from now at the heart outwards, coloured by the price, green for the sauna window, '
       + 'paper where prices are not published yet — on a soft disc of the sky’s colour.',
  render,
};
