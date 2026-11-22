/**
 * Shared pieces for the poster studies: the facts every poster states, the
 * flat inks, number formatting, font loading and measuring, and the frame in
 * either orientation.
 *
 * A poster is a pure function of ctx (live stores, or a scenario from
 * ../scenarios.js) to one 800x480 or 480x800 element. Posters measure text
 * with a canvas, so they are drawn once the fonts are in (fontsReady()).
 */
import '@fontsource-variable/jost';
import '@fontsource/libre-baskerville/400.css';
import '@fontsource/libre-baskerville/700.css';
import '@fontsource/libre-baskerville/400-italic.css';
import '@fontsource-variable/jetbrains-mono';
import './posters.css';
import { panel } from '../designs.js';
import { INK } from '../palette.js';
import { outlook, todayRange, blockKind, sunTimes } from '../../weather.js';
import { sessionCost, sessionKWh } from '../../prices.js';
import { resolvePlace } from '../../places.js';

export { INK };
export const HOUR = 3600e3;
export const SANS = '"Jost Variable", Jost, Futura, sans-serif';
export const SERIF = '"Libre Baskerville", Baskerville, Georgia, serif';
export const MONO = '"JetBrains Mono Variable", "JetBrains Mono", Menlo, monospace';
/* tall: the 13.3" reTerminal E1004's 3:4, drawn at 2x to its 1200 x 1600 (see ../device.js) */
export const SIZE = { portrait: [480, 800], landscape: [800, 480], tall: [600, 800] };

/* ------------------------------------------------------------ formatting */

export const pad2 = (n) => String(n).padStart(2, '0');
export const hm = (t) => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
export const hh = (t) => pad2(new Date(t).getHours());
export const hourStart = (t) => { const d = new Date(t); d.setMinutes(0, 0, 0); return +d; };
export const dayStart = (t, off = 0) => { const d = new Date(t); return +new Date(d.getFullYear(), d.getMonth(), d.getDate() + off); };
const minus = (s) => s.replace('-', '−');
/** Fixed decimals with a real minus sign; '–' for a missing value. */
export const num = (v, d = 1) => (Number.isFinite(v) ? minus((Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d)) : '–');
/** Rounded, never "−0". */
export const int = (v) => (Number.isFinite(v) ? minus(String(Math.round(v) || 0)) : '–');
export const signed = (v, d = 1) => (Number.isFinite(v) ? `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}` : '–');
export const euro = (v) => (Number.isFinite(v) ? `${v.toFixed(2)}\u00a0€` : '–');   // never wraps off its number
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* SVG ids must be unique on a page that shows many posters at once */
let uidN = 0;
export const uid = (p) => `${p}-${++uidN}`;

/** Deterministic noise, so a redraw does not reshuffle anything. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = (s) => [...String(s)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;

/* ----------------------------------------------------------------- fonts */

/** Resolves once every poster face is loaded (or failed), so measuring is honest. */
export function fontsReady() {
  const faces = [`400 20px ${SANS}`, `400 20px ${SERIF}`, `700 20px ${SERIF}`,
                 `italic 400 20px ${SERIF}`, `400 20px ${MONO}`,
                 '400 20px "Fraunces Variable"', 'italic 400 20px "Fraunces Variable"', '700 20px "Oswald Variable"'];
  return Promise.all(faces.map((f) => document.fonts.load(f, 'Aa0123456789°−€')))
    .then(() => document.fonts.ready).catch(() => {});
}

let mctx = null;
/** Advance and ink box of a string, in px. */
export function measure(s, { size = 100, weight = 400, family = SANS, italic = false, ls = 0 } = {}) {
  mctx ??= document.createElement('canvas').getContext('2d');
  mctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;
  mctx.letterSpacing = `${ls}px`;
  const m = mctx.measureText(s);
  return { w: m.width, l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight,
           asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
}

/** One SVG <text>. `extra` is appended raw (transforms, clip-paths). */
export function text(x, y, s, { size = 16, weight = 400, family = SANS, fill = INK.black, anchor = 'start',
                                ls = 0, italic = false, extra = '' } = {}) {
  return `<text x="${x}" y="${y}" font-family='${family}' font-size="${size}" font-weight="${weight}"`
    + `${italic ? ' font-style="italic"' : ''}${ls ? ` letter-spacing="${ls}"` : ''} text-anchor="${anchor}"`
    + ` fill="${fill}"${extra}>${esc(s)}</text>`;
}

/* ----------------------------------------------------------------- frame */

/**
 * The panel element: an SVG the size of the panel, plus optional HTML on top
 * (for text that has to wrap). `bg` is one of the inks.
 */
export function frame(orient, svg, { bg = INK.paper, html = '' } = {}) {
  const [w, h] = SIZE[orient];
  const p = panel();
  p.classList.add('pp', orient);
  p.style.background = bg;
  p.innerHTML = `<svg class="pp-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg}</svg>${html}`;
  return p;
}

export function waiting(orient, what = 'the forecast') {
  const [w, h] = SIZE[orient];
  return frame(orient, text(w / 2, h / 2, `Waiting for ${what}…`, { size: 20, anchor: 'middle' }));
}

/* ----------------------------------------------------------------- facts */

const WET = new Set(['rain', 'showers', 'snow', 'sleet', 'thunder']);

/** One word for the sky right now, for the posters that set the weather as type. */
export function weatherWord(sky, temp, wind, night) {
  if (sky === 'thunder') return 'Thunder';
  if (sky === 'rain' || sky === 'showers') return 'Rain';
  if (sky === 'sleet') return 'Sleet';
  if (sky === 'snow') return 'Snow';
  if (sky === 'fog') return 'Fog';
  if (Number.isFinite(temp) && temp <= -10) return 'Frost';
  if (wind >= 14) return 'Gale';
  if (sky === 'clear') return night ? 'Stars' : 'Sun';
  if (sky === 'partly') return night ? 'Night' : 'Bright';
  return 'Grey';
}

/* The sauna verdict as posters phrase it: a when, a line, a cost. */
function saunaFacts(v, watts) {
  const w = v.window ?? null;
  const at = w ? `${hh(w.start)}:00` : null;
  const base = { state: v.state, cost: w ? sessionCost(w.avg, watts) : null, avg: w?.avg ?? null,
                 start: w?.start ?? null, tomorrow: w?.offset === 1, at };
  switch (v.state) {
    case 'now': return { ...base, when: 'now', line: 'Sauna now' };
    case 'wait': return { ...base, when: at, line: `Sauna at ${at}` };
    case 'later': return { ...base, when: `from ${at}`, line: `Sauna from ${at}` };
    case 'tomorrow': return { ...base, when: `tomorrow ${at}`, line: `Sauna tomorrow ${at}` };
    case 'done': return w ? { ...base, when: `tomorrow ${at}`, line: `Sauna tomorrow ${at}` }
                          : { ...base, when: null, line: 'Sauna: prices at 14:00' };
    default: return { ...base, when: null, line: 'No prices yet' };
  }
}

/**
 * Everything a poster states, from ctx. Missing feeds give nulls and NaNs,
 * which the formatters above print as '–'.
 */
export function facts(ctx) {
  const now = ctx.nowMs ?? Date.now();
  const d = new Date(now);
  const fc = ctx.forecast;
  const obs = ctx.weather?.latest ?? null;
  const fNow = fc.at(now) ?? fc.rows[0] ?? null;
  const temp = Number.isFinite(obs?.t2m) ? obs.t2m : Number.isFinite(fNow?.temp) ? fNow.temp : NaN;
  const sun = sunTimes(now);
  const night = sun ? now < sun.rise || now > sun.set : false;
  const soon = fc.between(hourStart(now), now + 3 * HOUR);
  const sky = soon.length ? blockKind(soon).kind : null;
  const o = fc.rows.length ? outlook(fc, now) : { state: 'none', head: 'No forecast', sub: '' };
  const prices = ctx.prices;
  const today = prices.hourly(0, now);
  const tomorrow = prices.hourly(1, now);
  const v = ctx.verdict ?? { state: 'none' };
  const watts = ctx.saunaWatts ?? 6000;
  const stats = prices.stats(0, now);
  const wind = fNow?.wind ?? null;
  const P = ctx.place ?? resolvePlace();          // the place the page is set to (src/places.js)
  return {
    place: P.name, city: P.city, lat: P.lat, lon: P.lon, station: P.station,
    now, d, time: hm(now), hour: d.getHours(),
    weekday: d.toLocaleDateString('en-GB', { weekday: 'long' }),
    dayMonth: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
    dateFi: `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`,
    doy: Math.round((dayStart(now) - new Date(d.getFullYear(), 0, 1)) / 864e5) + 1,
    temp, rh: obs?.rh ?? null, wind,
    sun, night, dayLen: sun ? sun.set - sun.rise : null,
    sky, wet: WET.has(sky), fog: sky === 'fog',
    word: weatherWord(sky, temp, wind, night),
    out: { ...o, head: o.head.replace(/ 00:00$/, ' midnight') },
    range: todayRange(ctx.weather, fc, now),
    fc, obs: ctx.weather?.rows ?? [],
    today, tomorrow,
    next: [...today, ...tomorrow].filter((p) => p.start >= hourStart(now) && p.price != null),
    price: prices.at(now), stats,
    v, watts, kwh: sessionKWh(watts),
    nowCost: v.nowWin ? sessionCost(v.nowWin.avg, watts) : null,
    sauna: saunaFacts(v, watts),
    scenario: ctx.scenario ?? null,
  };
}

/** Where the numbers come from; the small print most posters carry. */
export const sources = (f) => ({
  weather: `FMI open data · ${f.station.name} station ${f.station.id}`,
  price: 'Nord Pool FI day-ahead via porssisahko.net',
  vat: 'Prices c/kWh incl. VAT 25.5 %',
});

/* ---------------------------------------------------------------- shapes */

/** Catmull-Rom through points, as an SVG path (open). */
export function smooth(pts, k = 1 / 6) {
  if (pts.length < 2) return '';
  let s = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    s += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return s;
}
