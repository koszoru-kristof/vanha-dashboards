/**
 * Shared pieces for the prints — a third series of posters for the wall,
 * bolder than the art set: flat saturated inks, hard edges, type set like a
 * poster, each design one graphic idea. Data picks the colour, the size or
 * the position of that one idea; nothing is drawn as a chart.
 *
 * The inks are the panel's six pigments, a shade brighter than MUTED so the
 * preview has the punch of print; the few others (orange, the grey ground,
 * the pale skies) dither, and the driver's grain reads as paper.
 */
import '@fontsource-variable/oswald';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import { esc, measure, SANS } from '../posters/common.js';

export const PRINT = {
  paper: '#f1ede4',
  grey: '#d8d4cb',        // the warm grey ground of a printed poster
  black: '#1c1c1e',
  red: '#d9452f',
  blue: '#2a5ca8',
  yellow: '#f0c04c',
  green: '#3e8c5f',
  orange: '#ea6a2e',
  navy: '#22304f',
  dusk: '#4a5878',
  slate: '#8d99ad',
  ice: '#c8d8e6',
  mist: '#cfd0cc',
};

export const CONDENSED = '"Oswald Variable", Oswald, "Arial Narrow", sans-serif';
export const DISPLAY = '"Fraunces Variable", Fraunces, Georgia, serif';
export const MULTIPLY = ' style="mix-blend-mode:multiply"';

/* ------------------------------------------------------------ meanings */

/** The price on a log scale from 0 to ~60 c, clamped 0..1; 0.3 when unknown. */
export const level = (p) => (p == null ? 0.3 : Math.max(0, Math.min(1, Math.log2(1 + Math.max(0, p) / 2.5) / Math.log2(25))));

/** Price ink on the studies' bands: blue below zero, green cheap, yellow fair, red dear. */
export function priceInk(p) {
  if (p == null) return PRINT.slate;
  if (p < 0) return PRINT.blue;
  if (p <= 5) return PRINT.green;
  if (p <= 15) return PRINT.yellow;
  return PRINT.red;
}

/** "10 degrees", "1 degree", "−20 degrees". */
export const degrees = (t) => { const r = Math.round(t); return Number.isFinite(r) ? `${r < 0 ? '−' : ''}${Math.abs(r)} degree${Math.abs(r) === 1 ? '' : 's'}` : 'no reading'; };

export const priceWord = (p) => (p == null ? 'no prices' : p < 0 ? 'below zero' : p <= 5 ? 'cheap' : p <= 15 ? 'fair' : 'dear');

/** The sky's ink for a WeatherSymbol3 kind, by day or night. */
export function skyInk(k, { night = false, temp = NaN } = {}) {
  switch (k) {
    case 'clear': return night ? PRINT.navy : PRINT.yellow;
    case 'partly': return night ? PRINT.dusk : '#f2cd6e';
    case 'rain': case 'showers': case 'thunder': return PRINT.blue;
    case 'sleet': case 'snow': return PRINT.ice;
    case 'fog': return PRINT.mist;
    default: return night ? '#3b4560' : PRINT.slate;
  }
}

export const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/** Type colour that reads on a field of `hex`. */
export const onInk = (hex) => (lum(hex) > 0.4 ? PRINT.black : PRINT.paper);

/* ---------------------------------------------------------------- type */

/** One line of type; `family` defaults to the geometric sans. */
export const T = (x, y, s, { size = 13, weight = 600, fill = PRINT.black, anchor = 'start', ls = 0, family = SANS, italic = false, extra = '' } = {}) =>
  `<text x="${x}" y="${y}" font-family='${family}' font-size="${size}" font-weight="${weight}"${italic ? ' font-style="italic"' : ''}`
  + ` letter-spacing="${ls}" text-anchor="${anchor}" fill="${fill}"${extra}>${esc(s)}</text>`;

/** The size at which `s` is `width` wide. */
export function fitWidth(s, width, style = {}) {
  const w = measure(s, { ...style, size: 100 }).w;
  return w > 0 ? (width / w) * 100 : 100;
}

/** Words wrapped to a width with the face's real metrics. */
export function wrap(s, width, style) {
  const out = [];
  for (const w of s.split(' ')) {
    const line = out.length ? `${out.at(-1)} ${w}` : w;
    if (out.length && measure(line, style).w <= width) out[out.length - 1] = line; else out.push(w);
  }
  return out;
}

/** A pattern of parallel stripes, half ink, half open, at `angle` degrees. */
export function stripes(id, { period = 14, angle = 0, ink = PRINT.black, duty = 0.5, shift = 0 } = {}) {
  return `<pattern id="${id}" width="${period}" height="${period}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle}) translate(0 ${shift})">`
    + `<rect width="${period}" height="${(period * duty).toFixed(2)}" fill="${ink}"/></pattern>`;
}
