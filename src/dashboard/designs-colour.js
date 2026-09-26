/**
 * Ground-up, layered proposals for a colour e-ink panel (Spectra 6, 800x480).
 *
 * Each is one SVG built back to front, so the layers are literal:
 *
 *   Neighbourhood  the streets around the Tapiola station as the ground layer,
 *                  weather painted over it (a sun the roads run across, rain
 *                  streaks, fog banks, a night sky), power as a transit line
 *                  whose stops are hours and whose colour is the tariff
 *   Horizon        a landscape: the sky's bands are the time of day and the
 *                  weather, the sun sits on its real sunrise–sunset arc, the
 *                  hills are the next 24 h of prices — fields coloured by
 *                  tariff, a lake where the price drops below zero, a sauna
 *                  cabin smoking at the cheapest window
 *   Dial           a 24 h clock face: daylight ring, rain ticks, price as
 *                  radial bars, temperature as a polar line, one hand for now
 *   Riso           a risograph poster: overprinted inks with a misregistered
 *                  halftone, huge numerals, the outlook as stacked words, the
 *                  tariff as a ticket stub and the sauna as a rubber stamp
 *
 * Tints are dithered by the panel driver; text is ink (or paper on dark sky)
 * and never below 15 px, except the OSM credit.
 *
 * Designed to be judged across scenarios (src/dashboard/scenarios.js), since
 * one live afternoon shows only one of the states each must handle.
 */
import '@fontsource-variable/jost';
import './colour.css';
import MAP from '../../data/tapiola-map.json';
import { panel } from './designs.js';
import { SOFT as C } from './palette.js';
import { outlook, todayRange, blockKind, sunTimes, tomorrow, kind as kindOf } from '../weather.js';
import { band, sessionCost, verdictText, BANDS } from '../prices.js';

const HOUR = 3600e3;
const W = 800, H = 480;
const FONT = '"Jost Variable", Jost, Futura, sans-serif';
const pad2 = (n) => String(n).padStart(2, '0');
const hhmm = (t) => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const hh = (t) => pad2(new Date(t).getHours());
const hourStart = (t) => { const d = new Date(t); d.setMinutes(0, 0, 0); return +d; };
const r0 = (v) => (Number.isFinite(v) ? String(Math.round(v)).replace('-', '−') : '–');
const r1 = (v) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1).replace('-', '−') : '–');
const cents = (p) => (p == null ? '–' : Math.abs(p) < 0.05 ? '0.0' : p.toFixed(1).replace('-', '−'));
/* Below zero is its own state — you are paid to use power — so it gets blue. */
const NEG = '#8fb0d8';
const bandFill = (p) => (p != null && p < 0 ? NEG : { cheap: C.cheap, normal: C.normal, dear: C.dear }[band(p)] ?? C.cloud);
const bandWord = (p) => (p != null && p < 0 ? 'below zero' : { cheap: 'cheap', normal: 'normal', dear: 'dear' }[band(p)] ?? '');
/* "21:00", or "tomorrow 13:00" when the window is on the next day */
const winAt = (w) => `${w.offset === 1 ? 'tomorrow ' : ''}${hh(w.start)}:00`;
const WET = new Set(['rain', 'showers', 'snow', 'sleet', 'thunder']);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* SVG ids must be unique per page, and the studies show many panels at once */
let uid = 0;

/* deterministic scatter, so a redraw does not reshuffle the rain */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function T(x, y, s, { size = 16, weight = 500, anchor = 'start', fill = C.ink, halo = null, ls = 0, italic = false } = {}) {
  const h = halo ? ` stroke="${halo}" stroke-width="5" stroke-linejoin="round" paint-order="stroke"` : '';
  return `<text x="${x}" y="${y}" font-family='${FONT}' font-size="${size}" font-weight="${weight}"${italic ? ' font-style="italic"' : ''} letter-spacing="${ls}" text-anchor="${anchor}" fill="${fill}"${h}>${esc(s)}</text>`;
}

/* A flat cloud: a rounded base with two bumps. (cx, by) = centre of the base. */
function cloud(cx, by, w, fill) {
  const h = w * 0.34;
  return `<g fill="${fill}"><rect x="${cx - w / 2}" y="${by - h}" width="${w}" height="${h}" rx="${h / 2}"/>
    <circle cx="${cx - w * 0.14}" cy="${by - h * 0.95}" r="${w * 0.21}"/><circle cx="${cx + w * 0.12}" cy="${by - h * 1.2}" r="${w * 0.26}"/></g>`;
}

/* ---------------------------------------------------------------- model */

function model(ctx) {
  const now = ctx.nowMs;
  const fc = ctx.forecast;
  const obs = ctx.weather?.latest ?? null;
  const sun = sunTimes(now);
  const night = sun ? now < sun.rise || now > sun.set : false;
  const soon = fc.between(hourStart(now), now + 3 * HOUR);
  const sky = soon.length ? blockKind(soon).kind : 'cloudy';
  const first = fc.at(now);
  const o = outlook(fc, now);
  const next24 = [...ctx.prices.hourly(0, now), ...ctx.prices.hourly(1, now)]
    .filter((p) => p.start >= hourStart(now) && p.price != null).slice(0, 24);
  const later = [...ctx.prices.hourly(1, now)].filter((p) => p.price != null && p.start >= hourStart(now) + 24 * HOUR);
  const v = ctx.verdict;
  return {
    now, fc, T: obs?.t2m ?? NaN, sun, night, sky, wet: WET.has(sky),
    fog: sky === 'fog' || kindOf(first?.sym) === 'fog',
    mmNow: first?.mm ?? 0, wind: first?.wind ?? null,
    range: todayRange(ctx.weather, fc, now),
    out: { ...o, head: o.head.replace(/ 00:00$/, ' midnight') },
    tmrw: tomorrow(fc, now),
    next24, later, v,
    win: v.window ?? null,
    nowPrice: v.nowPrice ?? null,
    sauna: verdictText(v, ctx.saunaWatts),
    winCost: v.window ? sessionCost(v.window.avg, ctx.saunaWatts) : null,
    dusk: sun ? Math.min(Math.abs(now - sun.rise), Math.abs(now - sun.set)) < 50 * 60e3 : false,
  };
}

function frame(svg) {
  const p = panel();
  p.classList.add('cp');
  p.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg>`;
  return p;
}
const waiting = () => frame(T(24, 40, 'Waiting for the forecast…', { size: 22 }));

/* ======================================================== Neighbourhood == */

export const artMap = {
  id: 'art-map',
  name: 'Neighbourhood',
  blurb: 'The streets around the Tapiola station as the ground layer, with the weather '
       + 'painted over it: a sun the roads run across, rain streaks, fog banks, or the same '
       + 'map by night. Electricity is a transit line along the bottom — stops are hours, '
       + 'the line’s colour is the tariff, the sauna is a stop.',
  render(ctx) {
    const m = model(ctx);
    if (!m.fc.rows.length) return waiting();
    const L = MAP.layers;
    const N = m.night;
    const col = N
      ? { bg: '#2b3752', green: '#33425e', wood: '#35475f', water: '#46597f', building: '#3b4966', path: '#4b5a78', minor: '#6a7792', major: '#95a0b6', text: '#f4f1e8' }
      : m.fog
        ? { bg: '#ffffff', green: '#eef1ec', wood: '#e8eee4', water: '#e4ebf4', building: '#efeeeb', path: '#e1e3e6', minor: '#cfd3d8', major: '#b4bac2', text: C.ink }
        : { bg: '#ffffff', green: '#e3ecdc', wood: '#d4e2cc', water: '#cddcee', building: '#e8e5df', path: '#d5d8dc', minor: '#b2b7be', major: '#8b929b', text: C.ink };
    let s = `<rect width="${W}" height="${H}" fill="${col.bg}"/>`;
    // 1. ground: land use
    s += `<path d="${L.green}" fill="${col.green}"/><path d="${L.wood}" fill="${col.wood}"/>`
       + `<path d="${L.water}" fill="${col.water}"/><path d="${L.building}" fill="${col.building}"/>`;
    // 2. sky under the streets: the sun, or the moon and stars
    const R = rng(7);
    if (!N && (m.sky === 'clear' || m.sky === 'partly')) {
      s += `<circle cx="640" cy="120" r="150" fill="${C.sunLight}" opacity=".75"/><circle cx="640" cy="120" r="88" fill="${C.sun}" opacity=".9"/>`;
    }
    if (N) {
      for (let i = 0; i < 70; i++) s += `<circle cx="${(R() * W).toFixed(0)}" cy="${(R() * 300).toFixed(0)}" r="${R() < 0.15 ? 1.8 : 1.1}" fill="#f3e7b5" opacity=".9"/>`;
      if (!m.wet && !m.fog) s += `<circle cx="660" cy="96" r="40" fill="#efe0a6"/><circle cx="680" cy="82" r="34" fill="${col.bg}"/>`;
    }
    // 3. streets
    s += `<path d="${L.path}" fill="none" stroke="${col.path}" stroke-width=".9"/>`
       + `<path d="${L.minor}" fill="none" stroke="${col.minor}" stroke-width="1.3" stroke-linecap="round"/>`
       + `<path d="${L.major}" fill="none" stroke="${col.major}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    // 4. weather over the streets
    if (m.wet && m.sky !== 'snow') {
      const n = Math.round(70 + 150 * Math.min(1, m.mmNow / 4));
      const rain = N ? '#8fa8d4' : C.rain;
      for (let i = 0; i < n; i++) {
        const x = R() * (W + 60) - 30, y = R() * (H - 90), l = 10 + R() * 12;
        s += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - l * 0.35).toFixed(0)}" y2="${(y + l).toFixed(0)}" stroke="${rain}" stroke-width="2" stroke-linecap="round" opacity=".85"/>`;
      }
    }
    if (m.sky === 'snow' || m.sky === 'sleet') {
      for (let i = 0; i < 160; i++) s += `<circle cx="${(R() * W).toFixed(0)}" cy="${(R() * (H - 90)).toFixed(0)}" r="${(1.5 + R() * 2).toFixed(1)}" fill="${N ? '#e9eef8' : C.snow}"/>`;
    }
    if (m.fog) {
      // by night the fog is a dim veil, not white stripes
      for (let i = 0; i < 6; i++) s += `<rect x="${-40 + R() * 80}" y="${20 + i * 62 + R() * 14}" width="${880}" height="${30 + R() * 16}" rx="20" fill="${N ? '#56637f' : '#ffffff'}" opacity="${N ? 0.55 : 0.7}"/>`;
    }
    if ((m.wind ?? 0) >= 10) {
      for (let i = 0; i < 5; i++) {
        const y = 60 + i * 60 + R() * 20, x = 80 + R() * 400;
        s += `<path d="M${x} ${y} q60 -14 120 0 t120 0 a12 12 0 1 0 -10 -18" fill="none" stroke="${N ? '#aeb8cc' : '#7b8491'}" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>`;
      }
    }
    // 5. the pin at the station, and the callout card
    s += `<circle cx="400" cy="240" r="9" fill="#fff" opacity=".9"/><circle cx="400" cy="240" r="5" fill="${C.ink}"/>`;
    s += `<path d="M322 178 L396 236" stroke="${N ? '#fff' : C.ink}" stroke-width="1.5"/>`;
    s += `<rect x="24" y="22" width="300" height="168" rx="16" fill="#ffffff" stroke="${C.ink}" stroke-width="1.5"/>`;
    s += T(44, 52, 'TAPIOLA', { size: 15, weight: 600, ls: 2.5 }) + T(304, 52, `${ctx.now}`, { size: 17, weight: 500, anchor: 'end' });
    s += T(40, 124, `${r1(m.T)}°`, { size: 76, weight: 430, ls: -1.5 });
    s += T(44, 154, m.out.head, { size: 20, weight: 600 });
    s += T(44, 178, `${m.range ? `${r0(m.range.min)}…${r0(m.range.max)}°` : ''} · wind ${m.wind != null ? Math.round(m.wind) : '–'} m/s`, { size: 16, weight: 450 });
    // 6. power as a transit line
    const x0 = 196, x1 = 770, y = 420, step = (x1 - x0) / 23;
    s += `<rect x="16" y="372" width="768" height="96" rx="16" fill="#ffffff" opacity=".92"/>`;
    s += T(32, 408, 'Power', { size: 16, weight: 600 }) + T(32, 444, `${cents(m.nowPrice)}`, { size: 34, weight: 500 })
       + T(32 + 16 * cents(m.nowPrice).length + 12, 444, 'c/kWh', { size: 15, weight: 450 });
    const P = m.next24;
    s += `<line x1="${x0}" y1="${y}" x2="${x0 + (P.length - 1) * step}" y2="${y}" stroke="#ffffff" stroke-width="14" stroke-linecap="round"/>`;
    for (let i = 0; i + 1 < P.length; i++) {
      s += `<line x1="${x0 + i * step}" y1="${y}" x2="${x0 + (i + 1) * step}" y2="${y}" stroke="${bandFill((P[i].price + P[i + 1].price) / 2)}" stroke-width="9" stroke-linecap="round"/>`;
    }
    P.forEach((q, i) => {
      const x = x0 + i * step;
      const inWin = m.win && q.start >= m.win.start && q.start < m.win.start + 2 * HOUR;
      if (i === 0) s += `<circle cx="${x}" cy="${y}" r="10" fill="#fff" stroke="${C.ink}" stroke-width="3"/>`;
      else if (i % 3 === 0) s += `<circle cx="${x}" cy="${y}" r="5.5" fill="#fff" stroke="${C.ink}" stroke-width="2"/>`;
      if (inWin && q.start === m.win.start) s += `<circle cx="${x + step / 2}" cy="${y}" r="13" fill="none" stroke="${C.go}" stroke-width="3"/>`;
      if (i % 3 === 0) s += T(x, y + 32, i === 0 ? 'now' : hh(q.start), { size: 15, weight: i === 0 ? 650 : 450, anchor: 'middle' });
    });
    if (m.win) {
      const i = P.findIndex((q) => q.start === m.win.start);
      if (i >= 0) {
        const x = x0 + (i + 0.5) * step;
        const lx = Math.min(x1 - 170, Math.max(x0, x - 80));
        s += T(lx, y - 22, `Sauna ${winAt(m.win)} · ${m.winCost.toFixed(2)} €`, { size: 16, weight: 650, fill: C.go });
      } else {
        s += T(x0, y - 22, `Sauna: ${m.sauna.head}`, { size: 16, weight: 600 });
      }
    } else {
      s += T(x0, y - 22, `Sauna: ${m.sauna.head}`, { size: 16, weight: 600 });
    }
    if (P.length && P.length < 24) {
      const xe = x0 + (P.length - 1) * step + 22, room = 780 - xe;
      const note = room > 200 ? 'tomorrow’s prices at ~14:00' : room > 110 ? 'more at ~14:00' : '';
      if (note) s += T(xe, y + 5, note, { size: 15, weight: 450, fill: C.ink });
    }
    s += T(784, 366, '© OpenStreetMap contributors', { size: 12, weight: 450, anchor: 'end', fill: N ? col.text : C.ink, halo: N ? col.bg : '#fff' });
    return frame(s);
  },
};

/* ============================================================== Horizon == */

const SKIES = {
  day:        ['#cfe0f1', '#d9e7f4', '#e4eef8', '#eff5fb'],
  dusk:       ['#8f9fc3', '#d9b8b0', '#f0cdb0', '#f8e3c9'],
  night:      ['#232e47', '#2b3753', '#34415f', '#3e4b6b'],
  grey:       ['#cfd4db', '#d9dde2', '#e2e5e9', '#eceef1'],
  greyDusk:   ['#9aa3b6', '#b9b6bd', '#d3c9c6', '#e6ddd6'],
  greyNight:  ['#343c4e', '#3c4558', '#454e62', '#4e586c'],
};

function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export const artHorizon = {
  id: 'art-horizon',
  name: 'Horizon',
  blurb: 'A landscape. The sky’s bands are the time of day and the weather; the sun or moon '
       + 'sits on its real sunrise–sunset arc. The hills are the next 24 h of prices: fields '
       + 'coloured by tariff, a lake where power drops below zero, and a sauna cabin smoking '
       + 'at the cheapest window.',
  render(ctx) {
    const m = model(ctx);
    if (!m.fc.rows.length) return waiting();
    const u = ++uid;
    const overcast = m.wet || m.sky === 'cloudy' || m.fog;
    const bands = m.night ? (overcast ? SKIES.greyNight : SKIES.night)
      : overcast ? (m.dusk ? SKIES.greyDusk : SKIES.grey) : m.dusk ? SKIES.dusk : SKIES.day;
    const light = m.night ? '#f4f1e8' : C.ink;
    let s = '';
    let sunLabels = '';
    let bodyX = W / 2;
    const bandH = [0, 90, 170, 240, 480];
    bands.forEach((c, i) => { s += `<rect x="0" y="${bandH[i]}" width="${W}" height="${bandH[i + 1] - bandH[i]}" fill="${c}"/>`; });
    const R = rng(11);
    if (m.night && !overcast) {
      for (let i = 0; i < 90; i++) s += `<circle cx="${(R() * W).toFixed(0)}" cy="${(R() * 250).toFixed(0)}" r="${R() < 0.12 ? 1.8 : 1}" fill="#f3e7b5"/>`;
    }
    // the day's arc, sunrise at left, sunset at right
    const ax0 = 70, ax1 = 730, ay = 236, apex = 70;
    const arcY = (f) => ay - Math.sin(Math.PI * f) * (ay - apex);
    const arcX = (f) => ax0 + f * (ax1 - ax0);
    if (m.sun) {
      // the quadratic's control point sits at twice the apex height, so the curve peaks at `apex`
      s += `<path d="M${ax0} ${ay} Q400 ${2 * apex - ay} ${ax1} ${ay}" fill="none" stroke="${m.night ? '#8d98b3' : '#9aa3b1'}" stroke-width="1.5" stroke-dasharray="2 7" stroke-linecap="round"/>`;
      if (!m.night) {
        const f = (m.now - m.sun.rise) / (m.sun.set - m.sun.rise);
        // behind cloud the sun is only a paler disc, no halo
        bodyX = arcX(f);
        s += overcast
          ? `<circle cx="${arcX(f)}" cy="${arcY(f)}" r="34" fill="#f1e2cc"/>`
          : `<circle cx="${arcX(f)}" cy="${arcY(f)}" r="56" fill="${C.sunLight}" opacity=".8"/><circle cx="${arcX(f)}" cy="${arcY(f)}" r="34" fill="${C.sun}"/>`;
      } else {
        // the moon rides the night the same way, sunset to sunrise
        const set = m.now > m.sun.set ? m.sun.set : m.sun.set - 24 * HOUR;
        const rise = m.now > m.sun.set ? m.sun.rise + 24 * HOUR : m.sun.rise;
        const f = (m.now - set) / (rise - set);
        const cx = arcX(f), cy = arcY(f);
        bodyX = cx;
        s += `<circle cx="${cx}" cy="${cy}" r="26" fill="#efe0a6"/><circle cx="${cx + 13}" cy="${cy - 10}" r="22" fill="${bands[Math.min(3, Math.floor(cy / 90))]}"/>`;
      }
      const riseNext = m.sun.rise + (m.now > m.sun.set ? 24 * HOUR : 0);
      const lh = { size: 15, weight: 500, fill: light, halo: bands[2] };
      if (bodyX > ax0 + 70) sunLabels += T(ax0 - 10, ay - 12, m.night ? `↓ ${hhmm(m.sun.set)}` : `↑ ${hhmm(m.sun.rise)}`, lh);
      if (bodyX < ax1 - 70) sunLabels += T(ax1 + 10, ay - 12, m.night ? `↑ ${hhmm(riseNext)}` : `↓ ${hhmm(m.sun.set)}`, { ...lh, anchor: 'end' });
    }
    // clouds and what falls from them
    const nClouds = { clear: 0, partly: 2, cloudy: 4, fog: 0 }[m.sky] ?? 5;
    const cfill = m.night ? '#56617a' : m.wet ? '#aab2be' : '#f6f7f9';
    for (let i = 0; i < nClouds; i++) {
      const cx = 120 + i * (560 / Math.max(1, nClouds - 1)) + (R() - 0.5) * 60, by = 150 + R() * 60, w = 110 + R() * 70;
      s += cloud(cx, by, w, cfill);
      if (m.wet) {
        const snow = m.sky === 'snow' || m.sky === 'sleet';
        const n = 4 + Math.round(Math.min(1, m.mmNow / 3) * 8);
        for (let k = 0; k < n; k++) {
          const x = cx - w * 0.4 + R() * w * 0.8, y = by + 8 + R() * 40;
          s += snow ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.5" fill="${m.night ? '#dfe6f3' : C.snow}"/>`
                    : `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 3).toFixed(0)}" y2="${(y + 11).toFixed(0)}" stroke="${m.night ? '#8fa8d4' : C.rain}" stroke-width="2.2" stroke-linecap="round"/>`;
        }
      }
    }
    if (m.fog) for (let i = 0; i < 5; i++) s += `<rect x="-30" y="${120 + i * 38}" width="860" height="22" rx="11" fill="#fff" opacity=".75"/>`;

    // hills: the next 24 h of prices
    const P = m.next24;
    if (P.length > 1) {
      const all = [...P, ...m.later].map((q) => q.price);
      const pMax = Math.max(12, ...all), pMin = Math.min(0, ...all);
      const top = 250, base = 452;
      const Y = (p) => base - 16 - ((p - pMin) / (pMax - pMin)) * (base - 16 - top);
      const X = (i) => (i / 23) * W;           // always 24 h wide, so a short feed leaves a gap
      // back range: the day after, paler
      const back = m.later.slice(0, 24);
      if (back.length > 3) {
        const bp = back.map((q, i) => [(i / (back.length - 1)) * W, Y(q.price) - 26]);
        s += `<path d="${smooth(bp)}L${W},${H}L0,${H}Z" fill="${m.night ? '#4a5a52' : '#c7d4c1'}"/>`;
      }
      // sea level at 0 c, drawn before the hills so it shows only where they dip below it
      if (pMin < 0) {
        s += `<rect x="0" y="${Y(0)}" width="${W}" height="${H - Y(0)}" fill="${C.rainLight}"/>`
           + `<line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}" stroke="${C.rain}" stroke-width="1.5"/>`;
      }
      const ridge = P.map((q, i) => [X(i), Y(q.price)]);
      // not yet published: a flat, pale plain to the edge
      if (P.length < 24) {
        const yl = ridge.at(-1)[1];
        s += `<rect x="${X(P.length - 1)}" y="${yl}" width="${W}" height="${H - yl}" fill="${m.night ? '#4b5367' : '#e3e5e9'}"/>`;
        s += T((X(P.length - 1) + W) / 2, yl + 30, 'prices after 14:00', { size: 15, weight: 500, anchor: 'middle', fill: m.night ? '#f4f1e8' : C.ink });
      }
      const hill = `${smooth(ridge)}L${X(P.length - 1)},${H}L0,${H}Z`;
      s += `<clipPath id="hz-clip-${u}"><path d="${hill}"/></clipPath><g clip-path="url(#hz-clip-${u})">`;
      P.forEach((q, i) => {
        const xa = i === 0 ? 0 : (X(i - 1) + X(i)) / 2, xb = i === P.length - 1 ? X(i) : (X(i) + X(i + 1)) / 2;
        s += `<rect x="${xa.toFixed(1)}" y="0" width="${(xb - xa + 0.6).toFixed(1)}" height="${H}" fill="${bandFill(q.price)}"/>`;
      });
      // furrows, so the fields read as land and not as a bar chart
      for (let y = top; y < H; y += 9) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y + 4}" stroke="#ffffff" stroke-width="1" opacity=".35"/>`;
      s += `</g><path d="${smooth(ridge)}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
      if (pMin < 0) {
        const xs = P.map((q, i) => (q.price < 0 ? X(i) : null)).filter((x) => x != null);
        if (xs.length) s += T(Math.max(90, (xs[0] + xs.at(-1)) / 2), Y(0) + 22, 'below zero', { size: 15, weight: 600, anchor: 'middle', fill: C.rain, halo: '#fff' });
      }
      // the sauna cabin at the recommended window
      if (m.win) {
        const i = P.findIndex((q) => q.start === m.win.start);
        if (i >= 0) {
          const x = (X(i) + X(Math.min(P.length - 1, i + 1))) / 2;
          const yb = Y((P[i].price + (P[i + 1]?.price ?? P[i].price)) / 2);
          s += `<g transform="translate(${x.toFixed(1)} ${yb.toFixed(1)})">
            <path d="M-8 -34 C-14 -44 -2 -50 -8 -62 M-9 -34 C-3 -44 -15 -50 -7 -66" fill="none" stroke="${m.night ? '#c9cfdb' : '#7b8491'}" stroke-width="2" stroke-linecap="round"/>
            <rect x="-12" y="-34" width="6" height="12" fill="${C.ink}"/>
            <path d="M-20 -14 L0 -30 L20 -14 Z" fill="${C.ink}"/><rect x="-15" y="-14" width="30" height="16" fill="${C.ink}"/>
            <rect x="-4" y="-8" width="8" height="10" fill="${C.sun}"/></g>`;
          const lx = Math.min(W - 16, Math.max(16, x));
          s += T(lx, yb - 74, `Sauna ${winAt(m.win)} · ${m.winCost.toFixed(2)} €`, { size: 16, weight: 650, anchor: lx > W - 120 ? 'end' : lx < 120 ? 'start' : 'middle', fill: C.ink, halo: '#fff' });
        }
      }
      // hour marks on the land
      for (let i = 0; i < P.length; i += 6) s += T(Math.max(14, X(i)), 472, i === 0 ? 'now' : hh(P[i].start), { size: 15, weight: 600, anchor: i === 0 ? 'start' : 'middle', fill: C.ink, halo: '#fff' });
    }
    s += sunLabels;
    // type over the sky
    s += T(28, 92, `${r1(m.T)}°`, { size: 84, weight: 430, fill: light, ls: -1.5 });
    s += T(32, 126, m.out.head, { size: 21, weight: 600, fill: light });
    s += T(32, 150, m.range ? `today ${r0(m.range.min)}…${r0(m.range.max)}°` : '', { size: 16, weight: 450, fill: light });
    s += T(772, 44, `${ctx.now}`, { size: 20, weight: 500, fill: light, anchor: 'end' });
    s += T(772, 76, `${cents(m.nowPrice)} c/kWh`, { size: 22, weight: 600, fill: light, anchor: 'end' });
    s += T(772, 98, `power ${bandWord(m.nowPrice)} now`, { size: 16, weight: 450, fill: light, anchor: 'end' });
    if (!m.win || !P.some((q) => q.start === m.win.start)) {
      s += T(772, 122, `sauna: ${m.sauna.head.toLowerCase()}`, { size: 16, weight: 600, fill: light, anchor: 'end' });
    }
    return frame(s);
  },
};

/* ================================================================= Dial == */

export const artDial = {
  id: 'art-dial',
  name: 'Dial',
  blurb: 'A 24-hour clock face, noon at the top. Rings from the inside out: temperature as '
       + 'a polar line, rain as blue ticks, daylight as a warm arc, and price as radial bars '
       + 'coloured by tariff. One hand for now; the sauna window is a green arc on the rim.',
  render(ctx) {
    const m = model(ctx);
    if (!m.fc.rows.length) return waiting();
    const cx = 246, cy = 240;
    const ang = (t) => { const d = new Date(t); const h = d.getHours() + d.getMinutes() / 60; return ((h - 12) / 24) * 2 * Math.PI; };
    const P2 = (a, r) => [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
    const arc = (a0, a1, r0, r1) => {
      const large = ((a1 - a0 + 4 * Math.PI) % (2 * Math.PI)) > Math.PI ? 1 : 0;
      const [x0, y0] = P2(a0, r1), [x1, y1] = P2(a1, r1), [x2, y2] = P2(a1, r0), [x3, y3] = P2(a0, r0);
      return `M${x0.toFixed(1)},${y0.toFixed(1)}A${r1},${r1} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}A${r0},${r0} 0 ${large} 0 ${x3.toFixed(1)},${y3.toFixed(1)}Z`;
    };
    let s = '';
    for (let r = 40; r <= 228; r += 12) s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e7e9ed" stroke-width="1"/>`;
    // daylight ring
    s += `<circle cx="${cx}" cy="${cy}" r="160" fill="none" stroke="#dde3ee" stroke-width="18"/>`;
    if (m.sun) s += `<path d="${arc(ang(m.sun.rise), ang(m.sun.set), 151, 169)}" fill="${C.sunLight}"/>`;
    // rain ticks, just inside the daylight ring
    const t0 = hourStart(m.now);
    for (const r of m.fc.between(t0, t0 + 24 * HOUR)) {
      if (r.mm < 0.1) continue;
      const a = ang(r.t + HOUR / 2);
      const [xa, ya] = P2(a, 140), [xb, yb] = P2(a, 140 - Math.min(16, 5 + r.mm * 4));
      s += `<line x1="${xa.toFixed(1)}" y1="${ya.toFixed(1)}" x2="${xb.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="${kindOf(r.sym) === 'snow' ? C.snow : C.rain}" stroke-width="5" stroke-linecap="round"/>`;
    }
    // price bars
    const maxP = Math.max(12, ...m.next24.map((q) => q.price));
    for (const q of m.next24) {
      const a0 = ang(q.start) + 0.018, a1 = ang(q.start + HOUR) - 0.018;
      const len = 6 + (Math.max(0, q.price) / maxP) * 44;
      s += `<path d="${arc(a0, a1, 174, 174 + len)}" fill="${bandFill(q.price)}"/>`;
    }
    if (m.win) s += `<path d="${arc(ang(m.win.start), ang(m.win.start + 2 * HOUR), 224, 230)}" fill="${C.go}"/>`;
    // temperature, polar, over the next 24 h
    const temps = m.fc.between(t0, t0 + 25 * HOUR);
    if (temps.length > 2) {
      const vs = temps.map((r) => r.temp);
      let lo = Math.min(...vs), hi = Math.max(...vs);
      if (hi - lo < 6) { const c = (hi + lo) / 2; lo = c - 3; hi = c + 3; }
      const pts = temps.map((r) => P2(ang(r.t), 96 + ((r.temp - lo) / (hi - lo)) * 32));
      s += `<path d="M${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('L')}" fill="none" stroke="${C.warm}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    for (const [h, lab] of [[0, '00'], [6, '06'], [12, '12'], [18, '18']]) {
      const [x, y] = P2(((h - 12) / 24) * 2 * Math.PI, 160);
      s += T(x, y + 5, lab, { size: 15, weight: 600, anchor: 'middle' });
    }
    // the hand
    const [hx, hy] = P2(ang(m.now), 232), [ix, iy] = P2(ang(m.now), 84);
    s += `<line x1="${ix.toFixed(1)}" y1="${iy.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`
       + `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="5" fill="${C.ink}"/>`;
    // centre
    s += `<circle cx="${cx}" cy="${cy}" r="82" fill="#fff"/>`;
    s += T(cx, cy + 14, `${r1(m.T)}°`, { size: 50, weight: 480, anchor: 'middle', ls: -1 });
    s += T(cx, cy + 42, ctx.now, { size: 16, weight: 500, anchor: 'middle' });

    // right column
    const x = 506;
    const d = new Date(m.now);
    s += T(x, 46, d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), { size: 17, weight: 500 });
    s += T(x, 96, m.out.head, { size: 28, weight: 560 });
    s += T(x, 124, m.tmrw ? `Tomorrow ${r0(m.tmrw.min)}…${r0(m.tmrw.max)}°` : '', { size: 17, weight: 450 });
    s += `<line x1="${x}" y1="150" x2="776" y2="150" stroke="${C.cloudDark}" stroke-width="1"/>`;
    s += T(x, 180, 'Electricity now', { size: 16, weight: 500 });
    s += T(x, 236, cents(m.nowPrice), { size: 58, weight: 450, ls: -1 });
    s += T(x + 30 * cents(m.nowPrice).length + 14, 236, 'c/kWh', { size: 17, weight: 450 });
    s += `<rect x="${x}" y="252" width="${14 + 9 * bandWord(m.nowPrice).length}" height="26" rx="13" fill="${bandFill(m.nowPrice)}"/>`
       + T(x + 7, 270, bandWord(m.nowPrice), { size: 15, weight: 650 });
    s += `<rect x="${x}" y="306" width="14" height="6" rx="3" fill="${C.go}"/>` + T(x + 22, 313, 'Sauna', { size: 16, weight: 600 });
    s += T(x, 344, m.sauna.head, { size: 24, weight: 560 });
    if (m.win) s += T(x, 370, `2 h from ${hh(m.win.start)}:00 ≈ ${m.winCost.toFixed(2)} €`, { size: 17, weight: 450 });
    const lg = [[C.cheap, `≤ ${BANDS.cheap} c`], [C.normal, `${BANDS.cheap}–${BANDS.dear}`], [C.dear, `> ${BANDS.dear} c`],
                ...(m.next24.some((q) => q.price < 0) ? [[NEG, '< 0 c']] : [])];
    lg.forEach(([c, t], i) => { const gx = x + i * (lg.length > 3 ? 70 : 92); s += `<rect x="${gx}" y="424" width="16" height="16" rx="3" fill="${c}"/>` + T(gx + 21, 438, t, { size: 15, weight: 450 }); });
    s += `<rect x="${x}" y="450" width="16" height="16" rx="8" fill="${C.sunLight}"/>` + T(x + 22, 464, 'daylight', { size: 15, weight: 450 })
       + `<rect x="${x + 110}" y="456" width="16" height="4" rx="2" fill="${C.warm}"/>` + T(x + 132, 464, 'temperature', { size: 15, weight: 450 });
    return frame(s);
  },
};

/* ================================================================= Riso == */

export const artRiso = {
  id: 'art-riso',
  name: 'Riso',
  blurb: 'A risograph poster. Two inks overprint where they cross, a halftone copy sits '
       + 'slightly off-register, the temperature is set huge and the outlook as stacked '
       + 'words. The tariff is a ticket stub; the sauna recommendation is a rubber stamp.',
  render(ctx) {
    const m = model(ctx);
    if (!m.fc.rows.length) return waiting();
    const u = ++uid;
    const INK_A = m.night ? '#2f4a7c' : '#3a5a8c';                                 // blue
    const INK_B = m.night ? '#e9d79a' : m.wet ? '#c9d6ea' : m.sky === 'cloudy' || m.fog ? '#d4d8de' : C.sun;
    const OVER = m.night ? '#4a5a78' : m.wet ? '#35507f' : m.sky === 'cloudy' || m.fog ? '#4b5a70' : '#6b4a5c';
    let s = `<defs>
      <pattern id="ht-${u}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><circle cx="3.5" cy="3.5" r="1.7" fill="${C.dear}"/></pattern>
      <pattern id="ht2-${u}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)"><circle cx="3" cy="3" r="1.3" fill="${INK_A}"/></pattern>
      <clipPath id="disc-${u}"><circle cx="232" cy="210" r="168"/></clipPath></defs>`;
    s += `<circle cx="244" cy="222" r="168" fill="url(#ht-${u})" opacity="${m.wet || m.night ? 0.35 : 0.8}"/>`;   // misregistered halftone
    s += `<circle cx="232" cy="210" r="168" fill="${INK_B}"/>`;
    if (m.wet) {
      for (let i = 0; i < 9; i++) s += `<line x1="${120 + i * 26}" y1="${60 + (i % 3) * 18}" x2="${96 + i * 26}" y2="${380 + (i % 2) * 20}" stroke="url(#ht2-${u})" stroke-width="10" stroke-linecap="round" clip-path="url(#disc-${u})"/>`;
    }
    if (m.fog) for (let i = 0; i < 6; i++) s += `<rect x="60" y="${80 + i * 48}" width="360" height="16" rx="8" fill="#fff" clip-path="url(#disc-${u})"/>`;
    // numerals: blue, and the overprint where they cross the disc
    const num = `${r0(m.T)}°`;
    const big = num.length > 3 ? 190 : 230;
    const numT = (fill) => `<text x="36" y="392" font-family='${FONT}' font-size="${big}" font-weight="700" letter-spacing="-10" fill="${fill}">${esc(num)}</text>`;
    s += numT(INK_A) + `<g clip-path="url(#disc-${u})">${numT(OVER)}</g>`;
    // stacked outlook words
    const words = m.out.head.toUpperCase().replace(',', '').split(' ').slice(0, 4);
    words.forEach((wd, i) => { s += T(470, 78 + i * 50, wd, { size: 46, weight: 700, ls: 1, fill: i % 2 ? INK_A : C.ink }); });
    const yAfter = 78 + words.length * 50;
    s += T(472, yAfter - 8, m.tmrw ? `tomorrow ${r0(m.tmrw.min)}…${r0(m.tmrw.max)}°` : '', { size: 17, weight: 500, italic: true });
    // the tariff stub
    const sx = 470, sy = 318, sw = 306, sh = 128;
    s += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="6" fill="#fff" stroke="${C.ink}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    s += T(sx + 14, sy + 26, 'POWER · NEXT 24 H', { size: 15, weight: 700, ls: 2 });
    s += T(sx + sw - 14, sy + 26, `${cents(m.nowPrice)} c now`, { size: 16, weight: 600, anchor: 'end' });
    const P = m.next24, bw = (sw - 28) / 24, maxP = Math.max(12, ...P.map((q) => q.price));
    P.forEach((q, i) => {
      const bh = 4 + (Math.max(0, q.price) / maxP) * 64;
      s += `<rect x="${(sx + 14 + i * bw).toFixed(1)}" y="${(sy + sh - 22 - bh).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" fill="${bandFill(q.price)}"/>`;
      if (q.price < 0) s += `<rect x="${(sx + 14 + i * bw).toFixed(1)}" y="${sy + sh - 22}" width="${(bw - 2).toFixed(1)}" height="4" fill="${C.rain}"/>`;
    });
    for (let i = 0; i < P.length; i += 6) s += T(sx + 14 + i * bw, sy + sh - 5, i ? hh(P[i].start) : 'now', { size: 15, weight: 500 });
    // the stamp
    const stamp = m.win
      ? ['SAUNA', `${m.win.offset === 1 ? 'TMRW ' : ''}${hh(m.win.start)}:00`, `≈ ${m.winCost.toFixed(2)} €`]
      : ['SAUNA', m.sauna.head.toUpperCase().slice(0, 12), ''];
    s += `<g transform="translate(398 408) rotate(-12)">
      <circle r="56" fill="#fff" fill-opacity=".6" stroke="${C.go}" stroke-width="3"/><circle r="48" fill="none" stroke="${C.go}" stroke-width="1.5"/>
      ${T(0, -14, stamp[0], { size: 15, weight: 800, anchor: 'middle', fill: C.go, ls: 3 })}
      ${T(0, 7, stamp[1], { size: 17, weight: 800, anchor: 'middle', fill: C.go })}
      ${T(0, 27, stamp[2], { size: 15, weight: 700, anchor: 'middle', fill: C.go })}</g>`;
    // registration marks and the imprint
    for (const [x, y] of [[14, 14], [786, 14], [14, 466], [786, 466]]) {
      s += `<g stroke="${C.ink}" stroke-width="1"><line x1="${x - 7}" y1="${y}" x2="${x + 7}" y2="${y}"/><line x1="${x}" y1="${y - 7}" x2="${x}" y2="${y + 7}"/><circle cx="${x}" cy="${y}" r="4" fill="none"/></g>`;
    }
    s += T(36, 458, `TAPIOLA · ${ctx.now}`, { size: 15, weight: 700, ls: 2.5 });
    return frame(s);
  },
};

export const COLOUR_FRESH = [artMap, artHorizon, artDial, artRiso];
