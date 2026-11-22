/**
 * Table — the raw numbers as the picture. The panel is filled edge to edge
 * with the hourly forecast and prices, printed in a monospace like a line
 * printer's output, and a giant temperature sits in it — red, or slate blue
 * below zero — with the table running on through it in paper. From across
 * the room it reads "9°"; up close it reads as the table it is: hour,
 * temperature, chance and amount of rain, wind, sky, price and a bar of that
 * price in characters.
 *
 * Two copies of the same text, one masked by the numeral and one clipped to
 * it, so a character can be half black, half paper where the edge cuts it.
 */
import { frame, facts, measure, esc, INK, SANS, MONO, pad2, hm, HOUR, uid, SIZE } from './common.js';
import { kind } from '../../weather.js';

const FS = 13.6, LH = 16, CW = FS * 0.6;      // JetBrains Mono advances 0.6 em
const SKY = { clear: 'CLEAR', partly: 'PARTLY', cloudy: 'CLOUDY', showers: 'SHOWERS', rain: 'RAIN',
              snow: 'SNOW', thunder: 'THUNDER', sleet: 'SLEET', fog: 'FOG' };
const SKY6 = { ...SKY, showers: 'SHOWER', thunder: 'THUNDR' };

const rp = (s, n) => String(s).padStart(n).slice(-n);
const lp = (s, n) => String(s).padEnd(n).slice(0, n);
const t1 = (v) => (Number.isFinite(v) ? `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(1)}` : '  -  ');
const c2 = (p) => (p == null ? '  -  ' : p.toFixed(2));
const bar = (p, perChar, room) => {
  if (p == null) return '';
  if (p < 0) return '<'.repeat(Math.max(1, Math.round(-p / perChar)));
  const n = Math.round(p / perChar);
  return n > room ? `${'#'.repeat(room - 1)}>` : '#'.repeat(n);
};
const up = (s) => s.toUpperCase().replace(/−/g, '-').replace(/–/g, '-').replace(/·/g, '/');

/* The next hours: forecast rows joined to the price of their hour. */
function hours(f, n) {
  const price = new Map([...f.today, ...f.tomorrow].map((p) => [p.start, p.price]));
  const t0 = new Date(f.now); t0.setMinutes(0, 0, 0);
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = +t0 + k * HOUR;
    const r = f.fc.at(t);
    out.push({ t, r, price: price.get(t) ?? null });
  }
  return out;
}

function sheet(orient, lines, numeral, ink = INK.red) {
  const [W, H] = SIZE[orient];
  const ids = { clip: uid('tc'), mask: uid('tm') };
  const body = (weight, fill) => lines.map((l, i) =>
    `<text x="${4}" y="${(i + 1) * LH - 3.5}" font-family='${MONO}' font-size="${FS}" font-weight="${weight}" fill="${fill}" style="white-space:pre">${esc(l)}</text>`).join('');
  const glyph = (fill) => numeral.map((g) => `<text x="${g.x.toFixed(1)}" y="${g.y.toFixed(1)}" font-family='${SANS}' font-size="${g.size.toFixed(1)}" font-weight="800" fill="${fill}">${esc(g.s)}</text>`).join('');
  const s = `<defs><clipPath id="${ids.clip}">${glyph('#000')}</clipPath>
      <mask id="${ids.mask}"><rect width="${W}" height="${H}" fill="#fff"/>${glyph('#000')}</mask></defs>
    <g mask="url(#${ids.mask})">${body(400, INK.black)}</g>
    ${glyph(ink)}
    <g clip-path="url(#${ids.clip})">${body(560, INK.paper)}</g>`;
  return frame(orient, s);
}

/** Fit a string of numerals into a box: size and baseline so its ink fills (w, h) at (x, y). */
function fitGlyph(s, x, y, w, h) {
  const m = measure(s, { size: 100, weight: 800 });
  const k = Math.min(w / (m.l + m.r), h / (m.asc + m.desc));
  const inkW = (m.l + m.r) * k, inkH = (m.asc + m.desc) * k;
  return { s, size: 100 * k, x: x + (w - inkW) / 2 + m.l * k, y: y + (h - inkH) / 2 + m.asc * k };
}

const deg = (t) => (Number.isFinite(t) ? `${Math.round(t) || 0}`.replace('-', '−') : '–');

function landscape(ctx) {
  const f = facts(ctx);
  const cols = Math.floor((800 - 8) / CW);
  const sep = '-'.repeat(cols);
  const light = f.sun ? `LIGHT ${hm(f.sun.rise)}-${hm(f.sun.set)}` : '';
  const L = [
    lp(`${up(f.place)} ${up(f.city)} ${f.lat.toFixed(3)}N ${f.lon.toFixed(3)}E  FMI ${f.station.id}  ${up(f.weekday.slice(0, 3))} ${f.dateFi} ${f.time}  ${light}`, cols),
    sep,
    lp('HOUR    TEMP   POP  MM/H  WIND  SKY        C/KWH  1 # = 1 C', cols),
  ];
  const room = cols - 51;
  for (const h of hours(f, 24)) {
    const r = h.r;
    L.push(lp(`${hm(h.t)}  ${rp(t1(r?.temp), 6)}  ${rp(r ? `${Math.round(r.pop ?? 0)}%` : '-', 4)}  ${rp(r ? r.mm.toFixed(1) : '-', 4)}  `
      + `${rp(r?.wind != null ? Math.round(r.wind) : '-', 4)}  ${lp(r ? SKY[kind(r.sym)] : '-', 9)}  ${rp(c2(h.price), 6)}  ${bar(h.price, 1, room)}`, cols));
  }
  L.push(sep);
  const S = f.sauna;
  L.push(lp(`NOW ${f.time}  ${t1(f.temp)} C  RH ${f.rh != null ? Math.round(f.rh) : '-'} %  WIND ${f.wind != null ? Math.round(f.wind) : '-'} M/S  `
    + `PRICE ${c2(f.price)} C/KWH  ${up(S.line)}${S.cost != null ? ` ~${S.cost.toFixed(2)} EUR` : ''}`, cols));
  L.push(lp(`OUTLOOK ${up(f.out.head)}. ${up(f.out.sub ?? '')}`, cols));
  const g = [fitGlyph(`${deg(f.temp)}°`, 30, 14, 740, 452)];
  return sheet('landscape', L, g, f.temp < 0 ? INK.blue : INK.red);
}

function portrait(ctx, orient = 'portrait') {
  const f = facts(ctx);
  const [W] = SIZE[orient];
  const tall = orient === 'tall';             // 72 columns: room for the city, the chance of rain and a longer bar
  const cols = Math.floor((W - 8) / CW);
  const sep = '-'.repeat(cols);
  const light = f.sun ? `  LIGHT ${hm(f.sun.rise)}-${hm(f.sun.set)}` : '';
  const L = [
    lp(`${up(f.place)}${tall ? ` ${up(f.city)}` : ''} ${f.lat.toFixed(3)}N ${f.lon.toFixed(3)}E  FMI ${f.station.id}`, cols),
    lp(`${up(f.weekday.slice(0, 3))} ${f.dateFi} ${f.time}  NOW ${t1(f.temp)} C  ${c2(f.price)} C${tall ? light : ''}`, cols),
    sep,
    lp(tall ? 'HH   TEMP   POP  MM/H WIND SKY     C/KWH  1 # = 2 C' : 'HH   TEMP  MM/H WIND SKY     C/KWH  1 # = 2 C', cols),
  ];
  const room = cols - (tall ? 42 : 36), perChar = 2;
  let last = new Date(f.now).getDate();
  for (const h of hours(f, 42)) {
    const d = new Date(h.t);
    if (d.getDate() !== last) {
      last = d.getDate();
      L.push(lp(`-- ${up(d.toLocaleDateString('en-GB', { weekday: 'short' }))} ${d.getDate()}.${d.getMonth() + 1}. ${sep}`, cols));
    }
    const r = h.r;
    const pop = tall ? `  ${rp(r ? `${Math.round(r.pop ?? 0)}%` : '-', 4)}` : '';
    L.push(lp(`${pad2(d.getHours())}  ${rp(t1(r?.temp), 6)}${pop}  ${rp(r ? r.mm.toFixed(1) : '-', 4)} ${rp(r?.wind != null ? Math.round(r.wind) : '-', 4)} `
      + `${lp(r ? SKY6[kind(r.sym)] : '-', 7)} ${rp(c2(h.price), 6)}  ${bar(h.price, perChar, room)}`, cols));
  }
  const S = f.sauna;
  while (L.length > 47) L.pop();
  L.push(sep);
  L.push(lp(`${up(f.out.head)}`, cols));
  L.push(lp(`${up(S.line)}${S.cost != null ? ` ~${S.cost.toFixed(2)} EUR` : ''}`, cols));
  // the numeral stacked in portrait: one digit per half, the sign above
  const r = Math.round(f.temp);
  const digits = Number.isFinite(r) ? String(Math.abs(r)).split('') : ['–'];
  const g = [];
  const gw = W - 40;
  if (r < 0) g.push(fitGlyph('−', 40, 30, 180 * (W / 480), 90));
  if (digits.length === 1) g.push(fitGlyph(digits[0], 20, r < 0 ? 140 : 60, gw, r < 0 ? 620 : 680));
  else {
    const top = r < 0 ? 130 : 30;
    const hh = (770 - top) / 2;
    g.push(fitGlyph(digits[0], 20, top, gw, hh - 10), fitGlyph(digits[1], 20, top + hh + 10, gw, hh - 10));
  }
  return sheet(orient, L, g, f.temp < 0 ? INK.blue : INK.red);
}

const BLURB = 'The raw hourly forecast and prices, printed edge to edge in a monospace like line-printer '
  + 'output, with a giant red temperature the table runs on through in paper: from the sofa it '
  + 'reads as the number, up close as the table — hour, temperature, rain, wind, sky, price, a bar.';

export const tableL = { id: 'pz-table-l', orient: 'landscape', name: 'Table · landscape', blurb: BLURB, render: landscape };
export const tableP = { id: 'pz-table-p', orient: 'portrait', name: 'Table · portrait', blurb: BLURB, render: portrait, tall: true };
