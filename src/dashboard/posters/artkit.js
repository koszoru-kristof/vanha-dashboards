/**
 * Shared pieces for the art set of posters: soft riso inks and what they
 * mean, words for numbers (for the posters that write the day out), and
 * generated organic shapes.
 *
 * The art set works like a print designer's series rather than a dashboard:
 * one main element per poster, the temperature the only large figure, the
 * rest in a small caption. Data chooses colour, size and position; nothing is
 * drawn as a chart.
 */
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import { RISO } from '../palette.js';
import { kind as kindOf } from '../../weather.js';
import { sunTimes } from '../../weather.js';
import { HOUR, rng, smooth } from './common.js';

export { RISO };
export const DISPLAY = '"Fraunces Variable", Fraunces, Georgia, serif';
export const MULTIPLY = ' style="mix-blend-mode:multiply"';

/* ------------------------------------------------------------ the inks */

/** The sky's ink for a WeatherSymbol3 kind, by day or night. */
export function skyInk(k, { night = false, temp = NaN } = {}) {
  const frost = Number.isFinite(temp) && temp <= -10;
  switch (k) {
    case 'clear': return night ? RISO.night : frost ? RISO.ice : temp >= 20 ? RISO.apricot : RISO.sun;
    case 'partly': return night ? RISO.dusk : frost ? RISO.ice : '#f5d98e';
    case 'rain': case 'showers': return RISO.sky;
    case 'thunder': return '#86a5d4';
    case 'sleet': return '#b3c4d9';
    case 'snow': return RISO.ice;
    case 'fog': return RISO.mist;
    default: return night ? '#8e95a8' : RISO.cloud;
  }
}

/** `ink` mixed toward paper by `k` (0 = ink, 1 = paper): a tint, as a riso screen would give. */
export function tint(ink, k = 0.5, paper = RISO.paper) {
  const c = (h, i) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(c(ink, i) + (c(paper, i) - c(ink, i)) * k).toString(16).padStart(2, '0')).join('')}`;
}

/** Price ink, on the same absolute bands as the rest of the studies. */
export function priceInk(p) {
  if (p == null) return RISO.cloud;
  if (p < 0) return RISO.mint;
  if (p <= 5) return RISO.sage;
  if (p <= 15) return RISO.sand;
  if (p <= 30) return RISO.coral;
  return '#d4553f';
}

/** The sky for the forecast hour starting at `t`: kind, night, ink. */
export function hourSky(f, t) {
  const r = f.fc.at(t);
  const sun = sunTimes(t);
  const night = sun ? t + HOUR / 2 < sun.rise || t + HOUR / 2 > sun.set : false;
  const k = r ? kindOf(r.sym) : 'cloudy';
  return { k, night, mm: r?.mm ?? 0, temp: r?.temp ?? NaN, ink: skyInk(k, { night, temp: r?.temp }) };
}

/* ------------------------------------------------------ numbers as words */

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function words(n) {
  n = Math.round(Math.abs(n));
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`;
  return String(n);
}

/** "three in the night", "one in the afternoon", "noon", "midnight". */
export function hourWords(h) {
  if (h === 0) return 'midnight';
  if (h === 12) return 'noon';
  const w = words(h > 12 ? h - 12 : h);
  return `${w} ${h < 5 ? 'in the night' : h < 12 ? 'in the morning' : h < 18 ? 'in the afternoon' : 'in the evening'}`;
}

/** "ten degrees", "twenty below zero", "zero". */
export function tempWords(t) {
  if (!Number.isFinite(t)) return 'unknown';
  const r = Math.round(t);
  if (r === 0) return 'zero degrees';
  if (r < 0) return `${words(r)} below zero`;
  return `${words(r)} degree${r === 1 ? '' : 's'}`;
}

/** "seventy cents", "one euro seventy", "two euros". */
export function euroWords(e) {
  if (!Number.isFinite(e)) return '';
  const c = Math.round(e * 20) * 5;              // to five cents
  if (c < 100) return `${words(c)} cents`;
  const eu = Math.floor(c / 100), rest = Math.round((c % 100) / 10) * 10;
  return `${words(eu)} euro${eu === 1 ? '' : 's'}${rest ? ` ${words(rest)}` : ''}`;
}

/* ---------------------------------------------------------------- shapes */

/**
 * A smooth organic closed shape round (cx, cy): radius r modulated by a few
 * seeded sine waves, traced through `n` points with a closed Catmull-Rom.
 */
export function blob(cx, cy, r, { seed = 1, wobble = 0.18, lobes = [2, 3, 5], n = 36, squash = 1, turn = 0 } = {}) {
  const R = rng(seed);
  const waves = lobes.map((k) => ({ k, a: wobble * (0.4 + R() * 0.6) / Math.sqrt(k), p: R() * Math.PI * 2 }));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const m = 1 + waves.reduce((s, w) => s + w.a * Math.sin(w.k * t + w.p), 0);
    const x = Math.cos(t) * r * m, y = Math.sin(t) * r * m * squash;
    pts.push([cx + x * Math.cos(turn) - y * Math.sin(turn), cy + x * Math.sin(turn) + y * Math.cos(turn)]);
  }
  return closed(pts);
}

/** A closed Catmull-Rom path through points. */
export function closed(pts, k = 1 / 6) {
  const n = pts.length;
  let s = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    s += `C${(p1[0] + (p2[0] - p0[0]) * k).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) * k).toFixed(1)} `
       + `${(p2[0] - (p3[0] - p1[0]) * k).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) * k).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return `${s}Z`;
}

/** A leaf: pointed at both ends, one side fuller, turned by `turn` radians. */
export function leaf(cx, cy, len, width, turn = 0, bend = 0.25) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16, x = (u - 0.5) * len, y = Math.sin(u * Math.PI) ** 0.8 * width * (1 + bend * (u - 0.5));
    pts.push([x, -y]);
  }
  for (let i = 15; i >= 1; i--) {
    const u = i / 16, x = (u - 0.5) * len, y = Math.sin(u * Math.PI) ** 0.9 * width * 0.8;
    pts.push([x, y]);
  }
  const rot = pts.map(([x, y]) => [cx + x * Math.cos(turn) - y * Math.sin(turn), cy + x * Math.sin(turn) + y * Math.cos(turn)]);
  return closed(rot, 1 / 7);
}

export { smooth };
