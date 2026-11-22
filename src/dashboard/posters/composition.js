/**
 * Composition — today's prices as a Mondrian. The panel's inks are his
 * palette, so the day is laid out as one: each hour a rectangle whose area is
 * its price, cut in time order (every cut keeps earlier hours left of or above
 * later ones), thick black lines between.
 *
 * Colour is rationed and means one thing each: red for the dearest hours
 * (dear by the fixed 15 c band, at most four), blue for the sauna window,
 * yellow for now, black for an hour below zero. Everything else is paper.
 * One rectangle is the caption — its number is the day of the year.
 */
import { frame, facts, text, measure, INK, num, pad2, euro } from './common.js';
import { BANDS } from '../../prices.js';

/* Ordered binary split: cut the run of hours where its price halves, across
   the longer side, and recurse. */
function layout(items, x, y, w, h, out = []) {
  if (items.length === 1) { out.push({ ...items[0], x, y, w, h }); return out; }
  const total = items.reduce((s, i) => s + i.area, 0);
  let acc = 0, cut = 1, best = Infinity;
  for (let i = 1; i < items.length; i++) {
    acc += items[i - 1].area;
    const d = Math.abs(acc - total / 2);
    if (d < best) { best = d; cut = i; }
  }
  const a = items.slice(0, cut), b = items.slice(cut);
  const fa = a.reduce((s, i) => s + i.area, 0) / total;
  if (w >= h) { layout(a, x, y, w * fa, h, out); layout(b, x + w * fa, y, w * (1 - fa), h, out); }
  else { layout(a, x, y, w, h * fa, out); layout(b, x, y + h * fa, w, h * (1 - fa), out); }
  return out;
}

function render(orient) {
  return (ctx) => {
    const f = facts(ctx);
    const [W, H] = orient === 'portrait' ? [480, 800] : [800, 480];
    const L = orient === 'portrait' ? 9 : 8;                   // line weight
    const cap = orient === 'portrait' ? { x: 0, y: 0, w: W, h: 168 } : { x: 0, y: 0, w: 236, h: H };
    const field = orient === 'portrait' ? { x: 0, y: cap.h, w: W, h: H - cap.h } : { x: cap.w, y: 0, w: W - cap.w, h: H };

    const hours = f.today.filter((p) => p.price != null);
    const dear = [...hours].filter((p) => p.price > BANDS.dear).sort((a, b) => b.price - a.price).slice(0, 4).map((p) => p.hour);
    const sauna = f.sauna.start != null && !f.sauna.tomorrow ? new Date(f.sauna.start).getHours() : null;
    const colour = (p) => (p.hour === f.hour ? INK.yellow
      : sauna != null && (p.hour === sauna || p.hour === sauna + 1) ? INK.blue
      : p.price < 0 ? INK.black
      : dear.includes(p.hour) ? INK.red : INK.paper);
    const items = hours.map((p) => ({ ...p, area: Math.max(p.price, 0.6) }));
    const blocks = items.length ? layout(items, field.x, field.y, field.w, field.h) : [];

    // a rectangle, drawn inside the black lines except where it meets the edge
    const rect = (b, fill) => {
      const x0 = b.x <= 0.5 ? 0 : b.x + L / 2, y0 = b.y <= 0.5 ? 0 : b.y + L / 2;
      const x1 = b.x + b.w >= W - 0.5 ? W : b.x + b.w - L / 2, y1 = b.y + b.h >= H - 0.5 ? H : b.y + b.h - L / 2;
      return { s: `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${Math.max(0, x1 - x0).toFixed(1)}" height="${Math.max(0, y1 - y0).toFixed(1)}" fill="${fill}"/>`, x0, y0, x1, y1 };
    };
    let s = `<rect width="${W}" height="${H}" fill="${INK.black}"/>`;
    for (const b of blocks) {
      const fill = colour(b);
      const r = rect(b, fill === INK.black ? INK.paper : fill);
      s += r.s;
      // below zero: a black field inside a paper ring, so it never merges with the lines
      if (fill === INK.black) {
        s += `<rect x="${(r.x0 + 5).toFixed(1)}" y="${(r.y0 + 5).toFixed(1)}" width="${Math.max(0, r.x1 - r.x0 - 10).toFixed(1)}" height="${Math.max(0, r.y1 - r.y0 - 10).toFixed(1)}" fill="${INK.black}"/>`;
        r.x0 += 5; r.y0 += 5; r.x1 -= 5; r.y1 -= 5;
      }
      const ink = fill === INK.paper || fill === INK.yellow ? INK.black : INK.paper;
      if (r.x1 - r.x0 >= 40 && r.y1 - r.y0 >= 36) {
        s += text(r.x0 + 8, r.y0 + 19, pad2(b.hour), { size: 14, weight: 650, fill: ink })
           + text(r.x0 + 8, r.y0 + 35, num(b.price, 1), { size: 13, weight: 400, fill: ink });
      } else if (r.x1 - r.x0 >= 24 && r.y1 - r.y0 >= 20) {
        s += text(r.x0 + 5, r.y0 + 15, pad2(b.hour), { size: 12, weight: 650, fill: ink });
      }
    }

    // the caption rectangle
    const c = rect(cap, INK.paper);
    s += c.s;
    const cx = c.x0 + 20;
    const lines = [
      [`COMPOSITION NO. ${f.doy}`, { size: 12, weight: 650, ls: 2 }],
      [`Prices, ${f.weekday} ${f.dayMonth}`, { size: orient === 'portrait' ? 22 : 20, weight: 500 }],
      [`${num(f.temp)} °C · ${f.out.head}`, { size: 16, weight: 450 }],
      [f.sauna.cost != null ? `${f.sauna.line} · ${euro(f.sauna.cost)}` : f.sauna.line, { size: 16, weight: 450 }],
      [f.price != null ? `Now ${num(f.price, 2)} c/kWh, updated ${f.time}` : 'No price', { size: 13, weight: 400 }],
    ];
    const key = [[INK.red, 'dearest'], [INK.yellow, 'now'], [INK.blue, 'sauna'], ...(hours.some((p) => p.price < 0) ? [[INK.black, 'below 0']] : [])];
    if (orient === 'portrait') {
      s += text(cx, 36, lines[0][0], lines[0][1])
         + text(W - 20, 36, f.price != null ? `NOW ${num(f.price, 2)} C · ${f.time}` : '', { size: 12, weight: 650, ls: 1.2, anchor: 'end' })
         + text(cx, 66, lines[1][0], lines[1][1])
         + text(cx, 93, lines[2][0], lines[2][1])
         + text(cx, 117, lines[3][0], lines[3][1]);
      let kx = cx;
      for (const [col, word] of key) {
        s += `<rect x="${kx}" y="${137}" width="12" height="12" fill="${col}"/>` + text(kx + 17, 148, word, { size: 12, weight: 450 });
        kx += 30 + measure(word, { size: 12, weight: 450 }).w;
      }
      s += text(W - 20, 148, 'Area is price', { size: 12, weight: 450, anchor: 'end' });
    } else {
      let y = 48;
      const wrapAt = 196;
      for (const [t0, st] of lines) {
        // the long lines wrap at a word near the column width
        const words = t0.split(' ');
        let cur = '';
        const flush = () => { s += text(cx, y, cur, st); y += st.size * 1.35; cur = ''; };
        for (const w of words) {
          const next = cur ? `${cur} ${w}` : w;
          if (cur && measure(next, st).w > wrapAt) flush();
          cur = cur ? `${cur} ${w}` : w;
        }
        flush();
        y += 6;
      }
      let ky = H - 104;
      for (const [col, word] of key) {
        s += `<rect x="${cx}" y="${ky - 10}" width="12" height="12" fill="${col}"/>` + text(cx + 18, ky, word, { size: 12, weight: 450 });
        ky += 18;
      }
      s += text(cx, H - 22, 'Area is price', { size: 12, weight: 450 });
    }
    return frame(orient, s, { bg: INK.black });
  };
}

const BLURB = 'Today’s prices as a Mondrian — the panel’s inks are his palette. Each hour is a '
  + 'rectangle whose area is its price, cut in time order; red marks the dearest hours, blue the '
  + 'sauna window, yellow now, black an hour below zero. The caption is one of the rectangles.';

export const compositionP = { id: 'pz-composition-p', orient: 'portrait', name: 'Composition · portrait', blurb: BLURB, render: render('portrait') };
export const compositionL = { id: 'pz-composition-l', orient: 'landscape', name: 'Composition · landscape', blurb: BLURB, render: render('landscape') };
