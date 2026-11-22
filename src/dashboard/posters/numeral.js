/**
 * Numeral — after the biennale poster: numerals too big for the page,
 * cropped by its edges, black on paper and paper on black.
 *
 * The page is today, midnight to midnight: top to bottom in portrait, left to
 * right in landscape. The hours before sunrise and after sunset are black, so
 * the poster darkens through the autumn and is nearly all paper in June. The
 * temperature is set across that boundary and inverts where it crosses it.
 * The margin is the timetable: each hour's price at its own hour, the current
 * hour in red, the sauna window marked in yellow; the night hours before six
 * carry the caption instead.
 */
import { frame, facts, text, measure, INK, SANS, num, int, pad2, hm, dayStart, uid, HOUR, euro, SIZE } from './common.js';

const WEIGHT = 800;

/* Wrap words to a width, for the narrow caption column. */
function wrap(s, width, style) {
  const out = [];
  for (const word of s.split(' ')) {
    const line = out.length ? `${out.at(-1)} ${word}` : word;
    if (out.length && measure(line, style).w <= width) out[out.length - 1] = line;
    else out.push(word);
  }
  return out;
}

/* The glyphs of a rounded temperature: an optional minus, then its digits. */
function glyphs(t) {
  const r = Math.round(t);
  if (!Number.isFinite(r)) return { neg: false, digits: ['–'] };
  return { neg: r < 0, digits: String(Math.abs(r)).split('') };
}

/* Price text that fits a narrow cell: one decimal under ten, whole cents above. */
const cellPrice = (p) => (p == null ? '–' : Math.abs(p) < 9.95 ? num(p, 1) : int(p));

/** Paint `svg` twice: ink where the ground is paper, paper where it is black. */
const both = (svg, ids) =>
  `<g clip-path="url(#${ids.day})" fill="${INK.black}">${svg}</g>`
  + `<g clip-path="url(#${ids.night})" fill="${INK.paper}">${svg}</g>`;

function captionLines(f) {
  return {
    place: f.place.toUpperCase(),
    date: `${f.weekday.slice(0, 3)} ${f.dayMonth}`,
    temp: `${num(f.temp)} °C`,
    at: `at ${f.time}`,
    out: f.out.head,
    sauna: f.sauna.line,
    cost: f.sauna.cost != null ? `≈ ${euro(f.sauna.cost)} a session` : '',
    light: f.sun ? `Light ${hm(f.sun.rise)}–${hm(f.sun.set)}` : null,
  };
}

/* --------------------------------------------------------------- portrait */

function portrait(ctx, orient = 'portrait') {
  const f = facts(ctx);
  const [W, H] = SIZE[orient];
  // the field takes the extra width; the numerals grow with it, cropping harder top and bottom
  const COL = Math.round(W * 352 / 480), u = COL / 352, v = Math.sqrt(u);
  const d0 = dayStart(f.now);
  const Y = (t) => ((t - d0) / (24 * HOUR)) * H;
  const yRise = f.sun ? Y(f.sun.rise) : 0, ySet = f.sun ? Y(f.sun.set) : H;
  const ids = { day: uid('nd'), night: uid('nn'), field: uid('nf') };
  const row = H / 24;

  let s = `<defs>
    <clipPath id="${ids.day}"><rect x="0" y="${yRise}" width="${W}" height="${ySet - yRise}"/></clipPath>
    <clipPath id="${ids.night}"><rect x="0" y="0" width="${W}" height="${yRise}"/><rect x="0" y="${ySet}" width="${W}" height="${H - ySet}"/></clipPath>
    <clipPath id="${ids.field}"><rect x="0" y="0" width="${COL}" height="${H}"/></clipPath></defs>`;
  s += `<rect x="0" y="0" width="${W}" height="${yRise}" fill="${INK.black}"/><rect x="0" y="${ySet}" width="${W}" height="${H - ySet}" fill="${INK.black}"/>`;

  // the numerals, stacked: minus bar, then one or two digits, cropped by the page and the margin
  const { neg, digits } = glyphs(f.temp);
  const st = { size: 100, weight: WEIGHT };
  let g = '';
  const place = (ch, targetW, maxH, anchorX, alignRight, top) => {
    const m = measure(ch, st);
    const inkW = m.l + m.r, inkH = m.asc + m.desc;
    const k = Math.min(targetW / inkW, maxH / inkH);
    const size = 100 * k;
    const x = alignRight ? anchorX - m.r * k : anchorX + m.l * k;
    const y = top + m.asc * k;
    g += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family='${SANS}' font-size="${size.toFixed(1)}" font-weight="${WEIGHT}">${ch}</text>`;
    return { w: inkW * k, h: inkH * k, top, bottom: top + inkH * k };
  };
  const barH = 62;
  const top0 = neg ? 150 : -34;
  if (neg) g += `<rect x="18" y="52" width="${170 * u}" height="${barH}"/>`;
  if (digits.length === 1) {
    place(digits[0], 372 * u, (neg ? 560 : 600) * v, COL + 8, true, neg ? 190 : 120);
  } else {
    const dh = (neg ? 330 : 420) * v;
    const a = place(digits[0], 350 * u, dh, -14, false, top0);
    place(digits[1], 350 * u, dh, COL + 12, true, Math.max(a.bottom - 34, H - dh + 40));
  }
  s += `<g clip-path="url(#${ids.field})">${both(g, ids)}</g>`;

  // margin: the timetable from 06:00, and the caption above it
  const cap = captionLines(f);
  let m = `<rect x="${COL}" y="0" width="1" height="${H}"/>`;
  const today = f.today;
  for (const p of today) {
    if (p.hour < 6) continue;
    const y0 = p.hour * row;
    const cur = p.hour === f.hour;
    if (cur) continue;                                  // drawn on its red plate below
    m += text(COL + 10, y0 + 22, pad2(p.hour), { size: 13, weight: 500, fill: 'inherit' })
       + text(W - 10, y0 + 22.5, cellPrice(p.price), { size: 16, weight: 600, anchor: 'end', fill: 'inherit' });
  }
  const capStyle = { size: 14, weight: 450 };
  const X0 = COL + 10, CW = W - X0 - 8;
  let c = text(X0, 26, cap.place, { size: 12, weight: 650, ls: 1.6, fill: 'inherit' })
        + text(X0, 44, cap.date, { size: 13, weight: 450, fill: 'inherit' })
        + text(X0, 76, cap.temp, { size: 24, weight: 700, fill: 'inherit' })
        + text(X0, 94, cap.at, { size: 13, weight: 450, fill: 'inherit' });
  let cy = 118;
  for (const l of wrap(cap.out, CW, { ...capStyle, weight: 600 })) { c += text(X0, cy, l, { ...capStyle, weight: 600, fill: 'inherit' }); cy += 17; }
  cy += 5;
  for (const l of [...wrap(cap.sauna, CW, capStyle), cap.cost].filter(Boolean)) { c += text(X0, cy, l, { ...capStyle, fill: 'inherit' }); cy += 17; }
  if (cap.light && cy < 190) c += text(X0, cy + 5, cap.light, { size: 13, weight: 450, fill: 'inherit' });
  m += c;
  s += both(m, ids);

  // now: the current hour on a red plate, and a red line across the page
  if (f.hour >= 6) {
    const y0 = f.hour * row, p = today.find((q) => q.hour === f.hour);
    s += `<rect x="${COL}" y="${y0}" width="${W - COL}" height="${row}" fill="${INK.red}"/>`
       + text(COL + 10, y0 + 22, pad2(f.hour), { size: 13, weight: 600, fill: INK.paper })
       + text(W - 10, y0 + 22.5, cellPrice(p?.price), { size: 16, weight: 700, anchor: 'end', fill: INK.paper });
  }
  // the sauna window, if it is today and in the timetable
  if (f.sauna.start != null && !f.sauna.tomorrow) {
    const h0 = new Date(f.sauna.start).getHours();
    if (h0 >= 6) s += `<rect x="${COL + 1}" y="${h0 * row}" width="6" height="${row * 2}" fill="${INK.yellow}"/>`;
  }
  s += `<rect x="0" y="${(Y(f.now) - 1).toFixed(1)}" width="${W}" height="2" fill="${INK.red}"/>`;
  return frame(orient, s);
}

/* -------------------------------------------------------------- landscape */

function landscape(ctx) {
  const f = facts(ctx);
  const W = 800, H = 480, STRIP = 376, FIRST = 7;    // the caption sits over 00–07
  const d0 = dayStart(f.now);
  const X = (t) => ((t - d0) / (24 * HOUR)) * W;
  const xRise = f.sun ? X(f.sun.rise) : 0, xSet = f.sun ? X(f.sun.set) : W;
  const ids = { day: uid('nd'), night: uid('nn'), field: uid('nf') };
  const col = W / 24;

  let s = `<defs>
    <clipPath id="${ids.day}"><rect x="${xRise}" y="0" width="${xSet - xRise}" height="${H}"/></clipPath>
    <clipPath id="${ids.night}"><rect x="0" y="0" width="${xRise}" height="${H}"/><rect x="${xSet}" y="0" width="${W - xSet}" height="${H}"/></clipPath>
    <clipPath id="${ids.field}"><rect x="0" y="0" width="${W}" height="${STRIP}"/></clipPath></defs>`;
  s += `<rect x="0" y="0" width="${xRise}" height="${H}" fill="${INK.black}"/><rect x="${xSet}" y="0" width="${W - xSet}" height="${H}" fill="${INK.black}"/>`;

  // the numerals in one line, as large as the field allows, cropped top and bottom
  const str = (Number.isFinite(f.temp) ? int(f.temp) : '–');
  const st = { size: 100, weight: WEIGHT };
  const m0 = measure(str, st);
  const inkW = m0.l + m0.r, inkH = m0.asc + m0.desc;
  const k = Math.min(760 / inkW, 440 / inkH);
  const x = (W - inkW * k) / 2 + m0.l * k;
  const y = STRIP + 26 - m0.desc * k;              // the strip crops the feet a little
  const g = `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family='${SANS}' font-size="${(100 * k).toFixed(1)}" font-weight="${WEIGHT}">${str}</text>`;
  s += `<g clip-path="url(#${ids.field})">${both(g, ids)}</g>`;

  // strip: the caption over 00–06, then an hour per column
  const cap = captionLines(f);
  let m = `<rect x="0" y="${STRIP}" width="${W}" height="1"/>`;
  for (const p of f.today) {
    if (p.hour < FIRST || p.hour === f.hour) continue;
    const cx = p.hour * col + col / 2;
    m += text(cx, STRIP + 27, pad2(p.hour), { size: 13, weight: 500, anchor: 'middle', fill: 'inherit' })
       + text(cx, STRIP + 52, cellPrice(p.price), { size: 13.5, weight: 600, anchor: 'middle', fill: 'inherit' });
  }
  m += text(14, STRIP + 24, `${cap.place} · ${cap.date.toUpperCase()}`, { size: 12, weight: 650, ls: 1.4, fill: 'inherit' })
     + text(14, STRIP + 50, `${cap.temp} ${cap.at}`, { size: 19, weight: 700, fill: 'inherit' })
     + text(14, STRIP + 72, cap.out, { size: 14, weight: 600, fill: 'inherit' })
     + text(14, STRIP + 92, cap.cost ? `${cap.sauna} · ${cap.cost.replace(' a session', '')}` : cap.sauna, { size: 14, weight: 450, fill: 'inherit' });
  s += both(m, ids);

  if (f.sauna.start != null && !f.sauna.tomorrow) {
    const h0 = new Date(f.sauna.start).getHours();
    if (h0 >= FIRST) s += `<rect x="${h0 * col}" y="${STRIP + 1}" width="${col * 2}" height="6" fill="${INK.yellow}"/>`;
  }
  if (f.hour >= FIRST) {
    const x0 = f.hour * col, p = f.today.find((q) => q.hour === f.hour);
    s += `<rect x="${x0}" y="${STRIP}" width="${col}" height="${H - STRIP}" fill="${INK.red}"/>`
       + text(x0 + col / 2, STRIP + 27, pad2(f.hour), { size: 13, weight: 600, anchor: 'middle', fill: INK.paper })
       + text(x0 + col / 2, STRIP + 52, cellPrice(p?.price), { size: 13.5, weight: 700, anchor: 'middle', fill: INK.paper });
  }
  s += `<rect x="${(X(f.now) - 1).toFixed(1)}" y="0" width="2" height="${H}" fill="${INK.red}"/>`;
  return frame('landscape', s);
}

const BLURB = 'After the biennale poster. The page is today, midnight to midnight; the hours before '
  + 'sunrise and after sunset are black, so it darkens through the autumn. The temperature is set '
  + 'in numerals too big for the page, inverting where they cross into the night. The margin is the '
  + 'timetable — each hour’s price at its own hour, now in red, the sauna window in yellow.';

export const numeralP = { id: 'pz-numeral-p', orient: 'portrait', name: 'Numeral · portrait', blurb: BLURB, render: portrait, tall: true };
export const numeralL = { id: 'pz-numeral-l', orient: 'landscape', name: 'Numeral · landscape', blurb: BLURB, render: landscape };
