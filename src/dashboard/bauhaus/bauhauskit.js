/**
 * Shared pieces for the Bauhaus-style posters — the fourth series for the
 * wall, in the manner of the modern "Bauhaus poster" reproductions: a cream
 * or single-colour ground, a muted green, black, white and one red accent;
 * an everyday object or a plain geometric figure reduced to a few flat
 * shapes; a small lowercase wordmark and a line of spaced capitals at the
 * foot. Data drives the figure — where the sun stands, how far a flag flies,
 * which rooms are warm — and the facts are written small.
 */
import { esc, measure, SANS } from '../posters/common.js';

export const BAU = {
  cream: '#ece5d4',
  green: '#4a7c59',
  black: '#171717',
  white: '#f7f4ec',
  red: '#c8321f',
  mustard: '#d6a323',
  blue: '#2c4f8a',
  grey: '#9a9891',
  night: '#353d52',       // the night sky, a shade off the black it is drawn against
};

/* ------------------------------------------------------------ meanings */

/** The price on a log scale from 0 to ~60 c, clamped 0..1; 0.3 when unknown. */
export const level = (p) => (p == null ? 0.3 : Math.max(0, Math.min(1, Math.log2(1 + Math.max(0, p) / 2.5) / Math.log2(25))));
export const priceWord = (p) => (p == null ? 'no prices' : p < 0 ? 'below zero' : p <= 5 ? 'cheap' : p <= 15 ? 'fair' : 'dear');
/** Price colour in this palette: green cheap, mustard fair, red dear, blue below zero. */
export const priceInk = (p) => (p == null ? BAU.grey : p < 0 ? BAU.blue : p <= 5 ? BAU.green : p <= 15 ? BAU.mustard : BAU.red);
/** A room's colour: white when cool, green when comfortable, red when warm. */
export const roomInk = (t) => (!Number.isFinite(t) || t === 0 ? null : t < 18 ? BAU.white : t <= 24 ? BAU.green : BAU.red);
/** The sky's ink in this palette. */
export function skyInk(k, { night = false } = {}) {
  if (night) return BAU.night;
  switch (k) {
    case 'clear': return BAU.mustard;
    case 'partly': return '#e0b64a';
    case 'rain': case 'showers': case 'thunder': return BAU.blue;
    case 'sleet': case 'snow': return BAU.white;
    case 'fog': return BAU.grey;
    default: return '#7d8a80';
  }
}

/** Where the sun stands: u from 0 at sunrise to 1 at sunset, or null at night; and its height 0..1. */
export function sunAt(f) {
  if (!f.sun) return { u: null, height: 0 };
  const u = (f.now - f.sun.rise) / (f.sun.set - f.sun.rise);
  if (u < 0 || u > 1) return { u: null, height: 0 };
  return { u, height: Math.sin(Math.PI * u) };
}

/* ---------------------------------------------------------------- type */

export const T = (x, y, s, { size = 13, weight = 600, fill = BAU.black, anchor = 'start', ls = 0, family = SANS, extra = '' } = {}) =>
  `<text x="${x}" y="${y}" font-family='${family}' font-size="${size}" font-weight="${weight}" letter-spacing="${ls}" text-anchor="${anchor}" fill="${fill}"${extra}>${esc(s)}</text>`;

/** The small lowercase wordmark, as "bauhaus" sits on the prints. */
export const mark = (x, y, s, { fill = BAU.black, size = 22, anchor = 'start' } = {}) =>
  T(x, y, s, { size, weight: 500, ls: 0.4, fill, anchor });

/**
 * The foot of a print: spaced capitals left (the place) and right (the
 * year), and up to three tiny lines beneath.
 */
export function foot(W, H, { fill = BAU.black, left = '', right = '', lines = [] } = {}) {
  let s = T(40, H - 46, left, { size: 12, weight: 700, ls: 4, fill })
        + T(W - 40, H - 46, right, { size: 12, weight: 700, ls: 4, fill, anchor: 'end' });
  lines.filter(Boolean).forEach((l, i) => { s += T(40, H - 28 + i * 10, l, { size: 7.5, weight: 600, ls: 1, fill }); });
  return s;
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

/** The sauna in one short lowercase phrase. */
export const saunaLine = (S) => (S.state === 'now' ? 'sauna now' : S.start != null ? `sauna ${S.tomorrow ? 'tomorrow ' : ''}${S.at}` : S.line.toLowerCase());

/* ---------------------------------------------------------------- moon */

const SYNODIC = 29.530588853 * 864e5;
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
/** The moon tonight: its age as a fraction of the month (0 new, 0.5 full) and a name. */
export function moonPhase(t) {
  const p = (((t - NEW_MOON) % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC;
  const name = p < 0.03 || p > 0.97 ? 'new moon' : p < 0.22 ? 'waxing crescent' : p < 0.28 ? 'first quarter' : p < 0.47 ? 'waxing gibbous'
    : p < 0.53 ? 'full moon' : p < 0.72 ? 'waning gibbous' : p < 0.78 ? 'last quarter' : 'waning crescent';
  return { p, name };
}

/** The lit part of a moon of radius R at phase p, as a path. */
export function moonLit(cx, cy, R, p) {
  const k = Math.cos(2 * Math.PI * p), rx = Math.max(0.5, R * Math.abs(k));
  if (p < 0.5) return `M${cx},${cy - R} A${R},${R} 0 0 1 ${cx},${cy + R} A${rx.toFixed(1)},${R} 0 0 ${k > 0 ? 0 : 1} ${cx},${cy - R} Z`;
  return `M${cx},${cy - R} A${R},${R} 0 0 0 ${cx},${cy + R} A${rx.toFixed(1)},${R} 0 0 ${k > 0 ? 1 : 0} ${cx},${cy - R} Z`;
}
