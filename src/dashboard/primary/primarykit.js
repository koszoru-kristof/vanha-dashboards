/**
 * Shared pieces for the primary-colour posters: the Bauhaus triad on white
 * with black, as in the catalogue's "primary" collection, and a fixed grammar
 * for what each colour means so the compositions can be generated from the
 * data without a legend.
 *
 *   blue    water and cold: rain, frost, and cheap power
 *   red     heat: warm air, dear power, the sauna hot or wanted now
 *   yellow  the sun, daylight, and the good hours (the sauna window)
 *   black   night, and the structure: bars, frames, type
 *   white   the paper; fair prices and mild air stay uncoloured
 *
 * These five are the Spectra 6 panel's own inks (its sixth, green, is not
 * used here), so every poster in this set prints with no dithering at all.
 */
import { hourStart, HOUR } from '../posters/common.js';
import { kind as kindOf, sunTimes } from '../../weather.js';
export { mark, foot, T, wrap, sunAt, saunaLine, level, priceWord, moonPhase, moonLit } from '../bauhaus/bauhauskit.js';

export const PRI = {
  paper: '#f5f2eb',
  black: '#141414',
  red: '#c8352a',
  yellow: '#e9b826',
  blue: '#2a4b8f',
};

/* ------------------------------------------------------------ meanings */

export const band = (p) => (p == null ? 'none' : p <= 5 ? 'cheap' : p <= 15 ? 'fair' : 'dear');
export const BAND_INK = { cheap: PRI.blue, fair: PRI.paper, dear: PRI.red, none: PRI.paper };
export const priceInk = (p) => BAND_INK[band(p)];
/** Air: blue at or below freezing, paper when mild, yellow when warm, red when hot. */
export const tempInk = (t) => (!Number.isFinite(t) ? PRI.paper : t <= 0 ? PRI.blue : t <= 12 ? PRI.paper : t <= 22 ? PRI.yellow : PRI.red);
/** The sky: yellow sun, blue rain, black night, paper for cloud, snow and fog. */
export function skyInk(k, night = false) {
  if (night) return PRI.black;
  if (['rain', 'showers', 'thunder', 'sleet'].includes(k)) return PRI.blue;
  if (k === 'clear' || k === 'partly') return PRI.yellow;
  return PRI.paper;
}
/** Type that reads on a field of `hex`. */
export const onInk = (hex) => ([PRI.black, PRI.blue, PRI.red].includes(hex) ? PRI.paper : PRI.black);

/* ------------------------------------------------------------- the hours */

/**
 * The next `n` hours from the top of this one: for each, its start, the
 * price and its band, the forecast sky and whether it is dark, the air,
 * the rain, and whether it falls in the sauna window.
 */
export function hours(f, n = 24) {
  const h0 = hourStart(f.now);
  const price = new Map([...f.today, ...f.tomorrow].map((p) => [p.start, p.price]));
  const S = f.sauna;
  return Array.from({ length: n }, (_, i) => {
    const t = h0 + i * HOUR, r = f.fc.at(t + HOUR / 2), sun = sunTimes(t);
    const night = sun ? t + HOUR / 2 < sun.rise || t + HOUR / 2 > sun.set : false;
    const p = price.get(t) ?? null;
    return { i, t, price: p, band: band(p), sky: r ? kindOf(r.sym) : 'cloudy', night,
             temp: r?.temp ?? NaN, mm: r?.mm ?? 0, wind: r?.wind ?? null,
             sauna: S.start != null && t >= S.start && t < S.start + 2 * HOUR, now: i === 0 };
  });
}

/** A run-length grouping of hours by a key. */
export function runs(list, key) {
  const out = [];
  for (const h of list) {
    const k = key(h);
    if (out.length && out.at(-1).key === k) out.at(-1).hours.push(h);
    else out.push({ key: k, hours: [h] });
  }
  return out;
}

/** Deterministic noise per day and scenario, so a redraw moves nothing. */
export function daySeed(f) {
  return [...`${f.d.toDateString()}${f.scenario?.id ?? ''}`].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
}
