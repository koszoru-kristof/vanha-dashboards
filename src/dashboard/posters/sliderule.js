/**
 * Slide rule — an instrument set to now. A rule too long for the frame, with
 * four scales: temperature on the upper stator, price and the hours on the
 * slide, wind on the lower stator. Each scale is slid so the current value
 * sits under the cursor's red hairline, and read there, the way a slide rule
 * is read; a small readout by the hairline gives the figure exactly.
 *
 * Red marks on the scales are today's range (temperature, price), the sauna
 * window (hours) and the strongest wind ahead. Black ground, paper rule,
 * black print, red for the cursor and the marks.
 */
import { frame, facts, text, INK, MONO, SANS, num, pad2, hm, euro, HOUR } from './common.js';

const W = 800, H = 480, CX = 400;
const K = INK.black, R = INK.red, P = INK.paper;
const t = (x, y, s, o = {}) => text(x, y, s, { family: SANS, size: 12, weight: 500, fill: K, ...o });

/*
 * One scale along an edge at `y`; ticks grow `dir` (-1 up, +1 down) from it.
 * `at(v)` places a value; ticks every `minor`, longer every `mid`, labelled
 * every `major`.
 */
function scale({ y, dir, from, to, at, minor, mid, major, label }) {
  let s = '';
  const n0 = Math.ceil(from / minor), n1 = Math.floor(to / minor);
  for (let n = n0; n <= n1; n++) {
    const v = +(n * minor).toFixed(6);
    const x = at(v);
    if (x < -10 || x > W + 10) continue;
    const isMaj = Math.abs(v / major - Math.round(v / major)) < 1e-6;
    const isMid = Math.abs(v / mid - Math.round(v / mid)) < 1e-6;
    const len = isMaj ? 15 : isMid ? 10 : 5;
    s += `<line x1="${x.toFixed(1)}" y1="${y}" x2="${x.toFixed(1)}" y2="${y + dir * len}" stroke="${K}" stroke-width="${isMaj ? 1.4 : 0.9}"/>`;
    if (isMaj) s += t(x, y + dir * (len + (dir < 0 ? 4 : 13)), label(v), { size: 12, weight: 600, anchor: 'middle' });
  }
  return s;
}

/* A red range mark along a scale: a bar with its two figures. */
function range(y, x0, x1, a, b) {
  if (!Number.isFinite(x0) || !Number.isFinite(x1)) return '';
  return `<rect x="${Math.min(x0, x1).toFixed(1)}" y="${y - 1.5}" width="${Math.abs(x1 - x0).toFixed(1)}" height="3" fill="${R}"/>`
    + `<rect x="${(x0 - 1).toFixed(1)}" y="${y - 5}" width="2" height="10" fill="${R}"/><rect x="${(x1 - 1).toFixed(1)}" y="${y - 5}" width="2" height="10" fill="${R}"/>`
    + (a ? t(x0 - 4, y + 4, a, { size: 11, weight: 600, fill: R, anchor: 'end' }) : '')
    + (b ? t(x1 + 4, y + 4, b, { size: 11, weight: 600, fill: R }) : '');
}


function render(ctx) {
  const f = facts(ctx);
  const body = { y0: 112, y1: 364 };
  const slide = { y0: 188, y1: 290 };
  let s = `<rect width="${W}" height="${H}" fill="${K}"/>`;
  // the rule: stators and slide, running off both edges
  s += `<rect x="-10" y="${body.y0}" width="${W + 20}" height="${slide.y0 - body.y0 - 3}" fill="${P}"/>`
     + `<rect x="-10" y="${slide.y0}" width="${W + 20}" height="${slide.y1 - slide.y0}" fill="${P}"/>`
     + `<rect x="-10" y="${slide.y1 + 3}" width="${W + 20}" height="${body.y1 - slide.y1 - 3}" fill="${P}"/>`;

  // T, upper stator: °C, 16 px a degree
  const T0 = Number.isFinite(f.temp) ? f.temp : 0;
  const atT = (v) => CX + (v - T0) * 16;
  s += scale({ y: slide.y0 - 3, dir: -1, from: T0 - 30, to: T0 + 30, at: atT, minor: 0.5, mid: 1, major: 5, label: (v) => num(v, 0) });
  if (f.range) s += range(slide.y0 - 44, atT(f.range.min), atT(f.range.max), num(f.range.min), num(f.range.max));

  // P, slide top: c/kWh, 9 px a cent
  const P0 = f.price ?? 0;
  const atP = (v) => CX + (v - P0) * 9;
  s += scale({ y: slide.y0, dir: 1, from: P0 - 50, to: P0 + 50, at: atP, minor: 1, mid: 5, major: 10, label: (v) => num(v, 0) });
  if (f.stats) s += range(slide.y0 + 40, atP(f.stats.min.price), atP(f.stats.max.price), num(f.stats.min.price, 1), num(f.stats.max.price, 1));

  // H, slide bottom: the hours, 16 px an hour, days named at midnight
  const atH = (ms) => CX + ((ms - f.now) / HOUR) * 16;
  const h0 = new Date(f.now); h0.setMinutes(0, 0, 0);
  let hs = '';
  for (let k = -28; k <= 28; k++) {
    const ms = +h0 + k * HOUR, x = atH(ms), d = new Date(ms);
    if (x < -10 || x > W + 10) continue;
    const h = d.getHours();
    const len = h % 6 === 0 ? 15 : h % 3 === 0 ? 10 : 5;
    hs += `<line x1="${x.toFixed(1)}" y1="${slide.y1}" x2="${x.toFixed(1)}" y2="${slide.y1 - len}" stroke="${K}" stroke-width="${h % 6 ? 0.9 : 1.4}"/>`;
    if (h % 3 === 0) hs += t(x, slide.y1 - len - 4, h === 0 ? d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase() : pad2(h), { size: 12, weight: h === 0 ? 700 : 600, anchor: 'middle' });
    for (const q of [15, 30, 45]) {
      const xq = atH(ms + q * 60e3);
      if (q === 30) hs += `<line x1="${xq.toFixed(1)}" y1="${slide.y1}" x2="${xq.toFixed(1)}" y2="${slide.y1 - 3}" stroke="${K}" stroke-width="0.7"/>`;
    }
  }
  s += hs;
  const S = f.sauna;
  if (S.start != null) {
    const x0 = atH(S.start), x1 = atH(S.start + 2 * HOUR);
    s += `<rect x="${x0.toFixed(1)}" y="${slide.y1 - 44}" width="${(x1 - x0).toFixed(1)}" height="5" fill="${R}"/>`
       + t((x0 + x1) / 2, slide.y1 - 50, `SAUNA ${S.cost != null ? euro(S.cost) : ''}`.trim(), { size: 11, weight: 700, fill: R, anchor: 'middle' });
  }
  if (f.sun) {
    for (const [ms, word] of [[f.sun.rise, '↑'], [f.sun.set, '↓']]) {
      for (const off of [-24, 0, 24]) {
        const x = atH(ms + off * HOUR);
        if (x > 120 && x < W - 20 && Math.abs(x - CX) > 44) s += t(x, slide.y1 - 32, `${word}${hm(ms)}`, { size: 10.5, weight: 500, anchor: 'middle' });
      }
    }
  }

  // W, lower stator: m/s, 18 px a metre per second
  const W0 = f.wind ?? 0;
  const atW = (v) => CX + (v - W0) * 18;
  s += scale({ y: slide.y1 + 3, dir: 1, from: Math.max(0, W0 - 30), to: W0 + 30, at: atW, minor: 0.5, mid: 1, major: 5, label: (v) => num(v, 0) });
  const gust = Math.max(...f.fc.between(f.now, f.now + 12 * HOUR).map((r) => r.wind ?? 0), 0);
  if (gust > 0) s += `<polygon points="${atW(gust)},${slide.y1 + 38} ${atW(gust) - 5},${slide.y1 + 48} ${atW(gust) + 5},${slide.y1 + 48}" fill="${R}"/>`
    + t(atW(gust) + 8, slide.y1 + 48, `max ${num(gust, 0)} in 12 h`, { size: 11, weight: 600, fill: R });
  const name = (y, n) => t(20, y, n, { size: 11, weight: 700, ls: 1.4, extra: ` stroke="${P}" stroke-width="7" stroke-linejoin="round" paint-order="stroke"` });
  s += name(body.y0 + 22, 'T  °C OUTDOOR') + name(slide.y0 + 44, 'P  C/KWH') + name(slide.y1 - 30, 'H  HOURS') + name(slide.y1 + 46, 'W  M/S WIND');
  s += t(20, body.y1 - 12, `${f.place.toUpperCase()} · SYSTEM WEATHER + WATTS · No. ${f.station.id} · ${f.dateFi}`, { size: 10.5, weight: 600, ls: 1.4 });

  // the cursor: two bars carrying the exact readings, a glass, the red hairline
  const bar = (y, a, b) => `<rect x="${CX - 76}" y="${y}" width="152" height="22" rx="4" fill="${K}" stroke="${P}" stroke-width="1.2"/>`
    + text(CX - 8, y + 16, a, { family: MONO, size: 12.5, weight: 700, fill: P, anchor: 'end' })
    + text(CX + 8, y + 16, b, { family: MONO, size: 12.5, weight: 700, fill: P });
  s += `<line x1="${CX - 40}" y1="${body.y0}" x2="${CX - 40}" y2="${body.y1}" stroke="${K}" stroke-width="1"/>`
     + `<line x1="${CX + 40}" y1="${body.y0}" x2="${CX + 40}" y2="${body.y1}" stroke="${K}" stroke-width="1"/>`
     + bar(body.y0 - 22, `T ${num(f.temp)}°`, `P ${num(f.price, 2)}`)
     + bar(body.y1, `H ${f.time}`, `W ${num(f.wind, 0)} m/s`)
     + `<rect x="${CX - 0.9}" y="${body.y0 - 22}" width="1.8" height="${body.y1 - body.y0 + 44}" fill="${R}"/>`;

  // for people, off the rule
  s += text(24, 56, `${num(f.temp)} °C · ${f.out.head}`, { size: 24, weight: 600, fill: P })
     + text(24, 82, f.out.sub ? f.out.sub : '', { size: 14, weight: 400, fill: P })
     + text(776, 56, S.cost != null ? `${S.line} · ${euro(S.cost)}` : S.line, { size: 16, weight: 600, fill: P, anchor: 'end' })
     + text(776, 82, `Now ${num(f.price, 2)} c/kWh`, { size: 14, weight: 400, fill: P, anchor: 'end' })
     + text(24, 424, 'Every scale is slid to now: read it at the red hairline. Red on the scales: today’s range,', { size: 13, weight: 400, fill: P })
     + text(24, 442, 'the sauna window, the strongest wind ahead. FMI open data · Nord Pool FI, incl. VAT.', { size: 13, weight: 400, fill: P });
  return frame('landscape', s, { bg: K });
}

export const sliderule = {
  id: 'pz-sliderule-l', orient: 'landscape', name: 'Slide rule · landscape',
  blurb: 'An instrument set to now: a rule too long for the frame, with temperature, price, the '
       + 'hours and wind on its scales, each slid so the current value sits under the cursor’s '
       + 'red hairline. Red marks are today’s range, the sauna window and the strongest wind ahead.',
  render,
};
