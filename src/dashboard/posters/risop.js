/**
 * Riso, portrait — the risograph poster again, stood upright and pared
 * down. Two discs of translucent ink overprint: the larger is the sky (its
 * ink and its texture: rain as dotted streaks, fog as bands, a crescent at
 * night), the smaller is the price now (sage when cheap, sand, coral when
 * dear), and the temperature is printed over both. The outlook is set as
 * stacked words; the sauna window is a rubber stamp.
 */
import { frame, facts, esc, int, num, euro, uid, hash, rng, measure, SANS } from './common.js';
import { RISO, skyInk, priceInk, MULTIPLY } from './artkit.js';

const W = 480, H = 800;
const T = (x, y, s, { size = 16, weight = 600, fill = RISO.ink, anchor = 'start', ls = 0, extra = '' } = {}) =>
  `<text x="${x}" y="${y}" font-family='${SANS}' font-size="${size}" font-weight="${weight}" letter-spacing="${ls}" text-anchor="${anchor}" fill="${fill}"${extra}>${esc(s)}</text>`;

/* The outlook as two or three stacked words. */
function stack(f) {
  const o = f.out;
  if (o.state === 'dry') return ['DRY', o.head.replace(/^Dry, /, '').toUpperCase()];
  const m = o.head.match(/^(\w+) (until|from) (.+)$/);
  if (m) return [m[1].toUpperCase(), m[2].toUpperCase(), m[3].toUpperCase()];
  return o.head.toUpperCase().split(' ').slice(0, 3);
}

function render(ctx) {
  const f = facts(ctx);
  const R = rng(hash(`${f.d.toDateString()}${f.scenario?.id ?? ''}`));
  const ids = { disc: uid('rd'), dots: uid('rp'), halo: uid('rh') };
  const k = f.sky ?? 'cloudy';
  const sky = skyInk(k, { night: f.night, temp: f.temp });
  const W0 = { x: 262, y: 262, r: 172 };
  // the price disc grows with the price, on a log scale from 0 to 60 c
  const lvl = f.price == null ? 0.3 : Math.max(0, Math.min(1, Math.log2(1 + Math.max(0, f.price) / 2.5) / Math.log2(25)));
  const P0 = { r: 64 + 64 * lvl };
  P0.x = 96 + P0.r * 0.55; P0.y = 452 - P0.r * 0.45;

  let s = `<defs>
    <clipPath id="${ids.disc}"><circle cx="${W0.x}" cy="${W0.y}" r="${W0.r}"/></clipPath>
    <pattern id="${ids.dots}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.5" fill="${RISO.coral}"/></pattern>
  </defs>`;
  s += `<rect width="${W}" height="${H}" fill="${RISO.paper}"/>`;
  // a misregistered halftone ring behind the sky disc, as if the second drum slipped
  s += `<circle cx="${W0.x + 12}" cy="${W0.y + 9}" r="${W0.r}" fill="url(#${ids.dots})" opacity=".55"/>`;
  s += `<circle cx="${W0.x}" cy="${W0.y}" r="${W0.r}" fill="${sky}"/>`;    // opaque: the dots show only where it slipped
  // the sky's texture, inside its disc
  let tex = '';
  if (['rain', 'showers', 'thunder', 'sleet'].includes(k)) {
    for (let i = 0; i < 11; i++) {
      const x = W0.x - W0.r + 26 + i * 30 + R() * 8, y0 = W0.y - W0.r + 20 + R() * 60, len = 150 + R() * 170;
      tex += `<line x1="${x}" y1="${y0}" x2="${x - len * 0.12}" y2="${y0 + len}" stroke="${RISO.blue}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 7"/>`;
    }
  } else if (k === 'fog') {
    for (let y = W0.y - W0.r + 30; y < W0.y + W0.r; y += 38) tex += `<rect x="0" y="${y}" width="${W}" height="15" fill="${RISO.paper}"/>`;
  } else if (k === 'snow') {
    for (let i = 0; i < 60; i++) tex += `<circle cx="${W0.x - W0.r + R() * W0.r * 2}" cy="${W0.y - W0.r + R() * W0.r * 2}" r="${2 + R() * 2.5}" fill="${RISO.paper}"/>`;
  } else if (f.night) {
    tex += `<circle cx="${W0.x + 70}" cy="${W0.y - 58}" r="${W0.r * 0.86}" fill="${RISO.paper}"/>`;     // a crescent
  }
  s += `<g clip-path="url(#${ids.disc})">${tex}</g>`;
  s += `<circle cx="${P0.x.toFixed(1)}" cy="${P0.y.toFixed(1)}" r="${P0.r.toFixed(1)}" fill="${priceInk(f.price)}"${MULTIPLY}/>`;

  // the temperature, overprinted across both
  const t = `${int(f.temp)}°`;
  const size = t.length > 3 ? 196 : 238;
  s += T(34, 470, t, { size, weight: 800, fill: '#2c4a86', ls: -6, extra: MULTIPLY });

  // the outlook, stacked
  const words = stack(f);
  const S = f.sauna;
  const room = S.start != null || S.state === 'now' ? 272 : 404;          // clear of the stamp
  const widest = Math.max(...words.map((w) => measure(w, { size: 100, weight: 750, ls: 0.5 }).w));
  const ws = Math.min(words.length > 2 ? 50 : 58, (room / widest) * 100);
  words.forEach((w, i) => { s += T(38, 568 + i * (ws + 2), w, { size: ws, weight: 750, fill: i === 1 ? RISO.blue : RISO.ink, ls: 0.5 }); });

  // the sauna window, stamped
  if (S.start != null || S.state === 'now') {
    const cx = 380, cy = 640, rot = -12;
    const lines = [['SAUNA', 14, 700, 3]];
    if (S.state === 'now') lines.push(['NOW', 24, 800, 0]);
    else { if (S.tomorrow) lines.push(['TOMORROW', 10.5, 700, 2]); lines.push([S.at, 24, 800, 0]); }
    if (S.cost != null) lines.push([`≈ ${euro(S.cost)}`, 13, 600, 0]);
    // each baseline sits a cap height plus a little below the one above
    const ys = [];
    lines.forEach(([, z], i) => ys.push(i ? ys[i - 1] + z * 0.78 + 7 : 0));
    const off = cy - (ys.at(-1) - lines[0][1] * 0.72) / 2 + lines[0][1] * 0.36;
    let body = '';
    lines.forEach(([txt, z, w, ls], i) => { body += T(cx, (off + ys[i]).toFixed(1), txt, { size: z, weight: w, fill: RISO.green, anchor: 'middle', ls }); });
    s += `<g transform="rotate(${rot} ${cx} ${cy})"><g fill="none" stroke="${RISO.green}">
        <circle cx="${cx}" cy="${cy}" r="62" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="54" stroke-width="1.2"/></g>${body}</g>`;
  }

  // registration marks and the imprint
  for (const [x, y] of [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]]) {
    s += `<g stroke="${RISO.ink}" stroke-width="1" fill="none"><circle cx="${x}" cy="${y}" r="4.5"/><path d="M${x - 8},${y}H${x + 8}M${x},${y - 8}V${y + 8}"/></g>`;
  }
  s += T(38, 760, `${f.place.toUpperCase()} · ${f.time}`, { size: 13, weight: 700, ls: 2.5 })
     + T(442, 760, f.price != null ? `${num(f.price, 1)} c/kWh now` : '', { size: 13, weight: 500, anchor: 'end' });
  return frame('portrait', s, { bg: RISO.paper });
}

export const risoP = {
  id: 'pz-riso-p', orient: 'portrait', name: 'Riso · portrait',
  divider: {
    title: 'Art set',
    intro: 'A graphic designer’s take: one main element per poster, soft riso inks that '
         + 'overprint, generated shapes and typography, and the few facts in a small caption. '
         + 'Data chooses colour, size and position; nothing is drawn as a chart. Tints show as '
         + 'a fine grain on the panel, much like a riso print.',
  },
  blurb: 'The riso poster stood upright and pared down: a disc of sky (its ink and texture — rain '
       + 'streaks, fog bands, a crescent at night) overprinted by a smaller disc that is the price '
       + 'now, the temperature printed over both, the outlook as stacked words, the sauna as a stamp.',
  render,
};
