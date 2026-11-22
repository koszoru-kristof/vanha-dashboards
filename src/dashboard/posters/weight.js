/**
 * Weight — a price chart made of type. Today's hours, 00 to 23, are set in
 * a variable font whose weight is that hour's price: a hairline hour is
 * nearly free, a black one is dear. The scale is fixed and logarithmic
 * (0 → 60 c/kWh), so a calm day stays calm and a spike still shows.
 *
 * Hours below zero are set in outline — the grid pays you. Hours already gone
 * are struck through, the current one is red, the sauna window is underlined
 * in yellow. The rest is plain print: the temperature in a hairline weight
 * against the heavy grid, the outlook, the numbers behind the weights.
 */
import { frame, facts, text, measure, INK, SANS, num, pad2, hh, euro } from './common.js';

const MAX_C = 60;
/** c/kWh → font weight 100–900 on a log scale; null below zero. */
export const weightOf = (p) => (p < 0 ? null
  : Math.round(100 + 800 * Math.min(1, Math.log2(1 + p / 2.5) / Math.log2(1 + MAX_C / 2.5))));

function grid(f, { x0, y0, cols, rows, cw, ch }) {
  // one size for every cell, so the widest (heaviest) pair still fits
  const wide = measure('00', { size: 100, weight: 900, ls: -2 });
  const size = Math.min(((cw - 24) / wide.w) * 100, ch * 1.05);   // heavy pairs keep a gap
  const capH = measure('0', { size, weight: 500 }).asc;
  let s = '';
  for (const p of f.today) {
    const i = p.hour, cx = x0 + (i % cols) * cw + cw / 2, top = y0 + Math.floor(i / cols) * ch;
    const base = top + (ch + capH) / 2;
    const cur = i === f.hour;
    const w = p.price == null ? 100 : weightOf(p.price);
    const fill = cur ? INK.red : INK.black;
    const style = `font-family='${SANS}' font-size="${size.toFixed(1)}" letter-spacing="${(-size / 50).toFixed(2)}" text-anchor="middle"`;
    s += w == null
      ? `<text x="${cx}" y="${base.toFixed(1)}" ${style} font-weight="420" fill="none" stroke="${fill}" stroke-width="${(size / 48).toFixed(2)}">${pad2(i)}</text>`
      : `<text x="${cx}" y="${base.toFixed(1)}" ${style} font-weight="${w}" fill="${fill}">${pad2(i)}</text>`;
    if (i < f.hour) {                       // gone: struck through
      const half = measure(pad2(i), { size, weight: w ?? 420, ls: -size / 50 }).w / 2 + 4;
      s += `<rect x="${(cx - half).toFixed(1)}" y="${(base - capH / 2 - 1).toFixed(1)}" width="${(half * 2).toFixed(1)}" height="2.2" fill="${INK.black}"/>`;
    }
  }
  // the sauna window, underlined, when it is today
  if (f.sauna.start != null && !f.sauna.tomorrow) {
    for (let k = 0; k < 2; k++) {
      const i = new Date(f.sauna.start).getHours() + k;
      if (i > 23) break;
      const cx = x0 + (i % cols) * cw + cw / 2, top = y0 + Math.floor(i / cols) * ch;
      s += `<rect x="${cx - cw / 2 + 8}" y="${(top + (ch + capH) / 2 + 9).toFixed(1)}" width="${cw - 16}" height="7" fill="${INK.yellow}"/>`;
    }
  }
  return s;
}

function numbersLine(f) {
  const st = f.stats;
  if (!st) return 'No prices yet';
  return `Now ${num(f.price, 2)} c/kWh · high ${num(st.max.price, 1)} at ${pad2(st.max.hour)} · low ${num(st.min.price, 1)} at ${pad2(st.min.hour)}`;
}
const saunaLine = (f) => (f.sauna.cost != null ? `${f.sauna.line} · ${euro(f.sauna.cost)}` : f.sauna.line);
const LEGEND = 'Weight is price, hairline 0 to black 60 c · outline: below zero';

function portrait(ctx) {
  const f = facts(ctx);
  let s = text(24, 40, `${f.place.toUpperCase()} · ${f.weekday.toUpperCase()} ${f.dayMonth.toUpperCase()} · ${f.time}`, { size: 12, weight: 650, ls: 1.5 })
        + text(20, 112, `${num(f.temp)}°`, { size: 76, weight: 200, ls: -2 })
        + text(456, 82, f.out.head, { size: 18, weight: 600, anchor: 'end' })
        + text(456, 106, saunaLine(f), { size: 15, weight: 450, anchor: 'end' });
  s += grid(f, { x0: 18, y0: 140, cols: 4, rows: 6, cw: 111, ch: 97 });
  s += text(24, 752, numbersLine(f), { size: 14, weight: 500 })
     + text(24, 774, LEGEND, { size: 13, weight: 400 });
  return frame('portrait', s);
}

function landscape(ctx) {
  const f = facts(ctx);
  let s = text(24, 34, `${f.place.toUpperCase()} · ${f.weekday.toUpperCase()} ${f.dayMonth.toUpperCase()} · ${f.time}`, { size: 12, weight: 650, ls: 1.5 })
        + text(20, 92, `${num(f.temp)}°`, { size: 64, weight: 200, ls: -2 })
        + text(776, 60, f.out.head, { size: 18, weight: 600, anchor: 'end' })
        + text(776, 84, saunaLine(f), { size: 15, weight: 450, anchor: 'end' });
  s += grid(f, { x0: 16, y0: 104, cols: 8, rows: 3, cw: 96, ch: 110 });
  s += text(24, 452, numbersLine(f), { size: 14, weight: 500 })
     + text(776, 452, LEGEND, { size: 13, weight: 400, anchor: 'end' });
  return frame('landscape', s);
}

const BLURB = 'Today’s hours set in a variable font whose weight is the price, on a fixed log scale: '
  + 'a hairline hour is nearly free, a black one is dear, an outlined one is below zero. '
  + 'Gone hours are struck through, now is red, the sauna window underlined in yellow.';

export const weightP = { id: 'pz-weight-p', orient: 'portrait', name: 'Weight · portrait', blurb: BLURB, render: portrait };
export const weightL = { id: 'pz-weight-l', orient: 'landscape', name: 'Weight · landscape', blurb: BLURB, render: landscape };
