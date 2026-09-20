/**
 * Candidate e-ink dashboard layouts, 800x480, 1-bit.
 *
 * Form choice, deliberately: this data is "a handful of headline numbers", so
 * every design is a stat tile / KPI row / hero figure rather than a chart. The
 * only plotted marks are 24 h sparklines, and each one sits beside its current
 * value with today's high and low labelled — no value is reachable only by
 * reading a line, which matters doubly here because the medium has no hover.
 *
 * Each design exports render(ctx) -> HTMLElement, where ctx is
 * { now, temp(id), hum(id), hist, rooms, outdoor }.
 */

const COMFORT = [18, 24];   // the indoor band the meters are drawn against

/* ------------------------------------------------------------------ utils */

export function h(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
export const add = (parent, ...kids) => (parent.append(...kids), parent);
export const t1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
export const t0 = (v) => String(Math.round(v));

export function panel() {
  const p = h('div', 'panel');
  return p;
}

/** 24 h sparkline. Hatched area is opt-in; the end dot carries a paper ring. */
let uid = 0;

export function spark(values, { w = 300, h: ht = 70, area = false, dot = true } = {}) {
  const pid = `hatch45-${++uid}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 5;
  const X = (i) => pad + (i / (values.length - 1)) * (w - pad * 2);
  const Y = (v) => ht - pad - ((v - min) / span) * (ht - pad * 2);
  const pts = values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
  const line = `M${pts.join('L')}`;
  const fill = area
    ? `<path d="${line}L${X(values.length - 1).toFixed(1)},${ht - pad}L${X(0).toFixed(1)},${ht - pad}Z"
         fill="url(#${pid})" stroke="none"/>`
    : '';
  const end = dot
    ? `<circle cx="${X(values.length - 1).toFixed(1)}" cy="${Y(values.at(-1)).toFixed(1)}"
         r="5" fill="#000" stroke="#fff" stroke-width="2"/>`
    : '';
  const el = h('div');
  el.innerHTML = `
    <svg width="${w}" height="${ht}" viewBox="0 0 ${w} ${ht}" shape-rendering="geometricPrecision">
      <defs>
        <pattern id="${pid}" width="9" height="9" patternTransform="rotate(45)"
                 patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="#fff"/>
          <line x1="0" y1="0" x2="0" y2="9" stroke="#000" stroke-width="2"/>
        </pattern>
      </defs>
      ${fill}
      <path d="${line}" fill="none" stroke="#000" stroke-width="2"
            stroke-linejoin="round" stroke-linecap="round"/>
      ${end}
    </svg>`;
  return el.firstElementChild;
}

/**
 * Comfort meter: one value against a band, which is the textbook meter case.
 * Solid fill = the reading, 1px track = the scale, ticks = the band edges.
 */
function meter(value, { w = 190, ht = 22, lo = 12, hi = 30 } = {}) {
  const top = 4, trackH = 14;
  const clamp = (v) => Math.max(lo, Math.min(hi, v));
  const pos = (v) => ((clamp(v) - lo) / (hi - lo)) * w;
  const tick = (v) =>
    `<rect x="${(pos(v) - 1).toFixed(1)}" y="0" width="2" height="${ht}" fill="#000"/>`;
  const el = h('div');
  el.innerHTML = `
    <svg width="${w}" height="${ht}" viewBox="0 0 ${w} ${ht}">
      <rect x="0.5" y="${top + 0.5}" width="${w - 1}" height="${trackH - 1}"
            fill="#fff" stroke="#000" stroke-width="1"/>
      <rect x="1" y="${top + 1}" width="${Math.max(2, pos(value) - 1).toFixed(1)}"
            height="${trackH - 2}" fill="#000"/>
      ${tick(COMFORT[0])}${tick(COMFORT[1])}
    </svg>`;
  return el.firstElementChild;
}

export function header(ctx, { pad = 28 } = {}) {
  const bar = h('div', 'row');
  bar.style.cssText = `padding:${pad}px ${pad}px 0;gap:12px;`;
  add(bar,
    h('div', 'cap', 'Espoo flat'),
    add(h('div', 'grow')),
    h('div', 'cap tnum', ctx.now));
  return bar;
}

export function footer(ctx, text) {
  const f = h('div', 'row small');
  f.style.cssText = 'position:absolute;left:28px;right:28px;bottom:16px;gap:10px;';
  add(f, h('div', null, text), add(h('div', 'grow')),
      h('div', 'tnum', `updated ${ctx.now}`));
  return f;
}

/* ------------------------------------------------------------- 1. Lead ---- */
/* Hero figure + KPI row: leads with the one number you actually walk out the
   door for, then the rooms as a strip of stat tiles underneath. */

export const lead = {
  id: 'lead',
  name: 'Lead',
  blurb: 'Hero outdoor figure with a 24 h trend, rooms as a KPI strip. '
       + 'Readable from across the room; one number dominates.',
  render(ctx) {
    const p = panel();
    add(p, header(ctx));

    const main = h('div', 'row');
    main.style.cssText = 'padding:14px 28px 0;gap:26px;align-items:flex-start;';

    const left = h('div', 'col');
    left.style.cssText = 'gap:6px;';
    add(left,
      h('div', 'cap', 'Outdoor'),
      add(h('div', 'row'),
        (() => { const v = h('div', 'hero deg', t1(ctx.temp('climate.outdoor'))); return v; })()),
      (() => {
        const r = h('div', 'row body');
        r.style.cssText = 'gap:20px;padding-top:12px;';
        const { min, max } = ctx.hist.range('climate.outdoor');
        add(r, h('div', 'tnum', `High ${t1(max)}°`), h('div', 'tnum', `Low ${t1(min)}°`),
               h('div', 'tnum', `${t0(ctx.hum('climate.outdoor'))}% rh`));
        return r;
      })());

    const right = h('div', 'col grow');
    right.style.cssText = 'gap:8px;padding-top:8px;';
    add(right,
      h('div', 'cap', 'Last 24 hours'),
      spark(ctx.hist.get('climate.outdoor'), { w: 330, h: 118, area: true }));

    add(main, left, right);
    add(p, main);

    const strip = h('div', 'row');
    strip.style.cssText = 'position:absolute;left:28px;right:28px;bottom:52px;';
    ctx.rooms.forEach((r, i) => {
      if (i) {
        const sep = h('div', 'rule-v');
        sep.style.cssText = 'height:56px;margin:0 20px;';
        add(strip, sep);
      }
      const tile = h('div', 'col grow');
      tile.style.cssText = 'gap:9px;';
      add(tile, h('div', 'cap', r.label), h('div', 'val deg tnum', t1(ctx.temp(r.id))));
      add(strip, tile);
    });
    const stripCap = h('div', 'cap', 'Indoor');
    stripCap.style.cssText = 'position:absolute;left:28px;bottom:134px;';
    const topRule = h('div', 'rule');
    topRule.style.cssText = 'position:absolute;left:28px;right:28px;bottom:126px;width:auto;';
    add(p, stripCap, topRule, strip, footer(ctx, ''));
    return p;
  },
};

/* ----------------------------------------------------------- 2. Ledger ---- */
/* No graphics at all: a column of numbers with dot leaders. Least ink on the
   panel, fastest partial refresh, and the densest of the five. */

export const ledger = {
  id: 'ledger',
  name: 'Ledger',
  blurb: 'Pure typography, no marks. Lowest ink and fastest refresh; '
       + 'scales to more rows than any other layout here.',
  render(ctx) {
    const p = panel();
    const top = h('div', 'row');
    top.style.cssText = 'padding:30px 34px 0;align-items:baseline;gap:14px;';
    add(top,
      h('div', 'mid', ctx.dateLong),
      add(h('div', 'grow')),
      h('div', 'mid tnum', ctx.now));
    add(p, top);

    const rule = h('div', 'rule-thick');
    rule.style.cssText = 'margin:18px 34px 0;width:auto;';
    add(p, rule);

    const list = h('div', 'col');
    list.style.cssText = 'padding:0 34px;';

    const mkRow = (label, value, hum, emphasis) => {
      const r = h('div', 'row');
      r.style.cssText = `align-items:baseline;padding:${emphasis ? 14 : 11}px 0;`;
      add(r,
        h('div', emphasis ? 'mid' : 'val', label),
        h('div', 'leader'),
        h('div', 'small tnum', hum != null ? `${t0(hum)}%` : ''),
        (() => {
          const v = h('div', `${emphasis ? 'big' : 'val'} deg tnum`, t1(value));
          v.style.cssText = 'min-width:150px;text-align:right;';
          return v;
        })());
      return r;
    };

    add(list, mkRow('Outdoor', ctx.temp('climate.outdoor'), ctx.hum('climate.outdoor'), true));
    const r2 = h('div', 'rule');
    add(list, r2);
    ctx.rooms.forEach((r, i) => {
      if (i) add(list, h('div', 'rule'));
      add(list, mkRow(r.label, ctx.temp(r.id), ctx.hum(r.id), false));
    });
    add(p, list);
    return p;
  },
};

/* ------------------------------------------------------------ 3. Split ---- */
/* Outdoor on the left, rooms on the right as comfort meters. The meter adds a
   non-numeric channel: you see "all inside the band" without reading digits. */

export const split = {
  id: 'split',
  name: 'Split',
  blurb: 'Outdoor block beside per-room comfort meters (band 18–24 °C). '
       + 'The only design you can read correctly without reading any digits.',
  render(ctx) {
    const p = panel();
    const wrap = h('div', 'row');
    wrap.style.cssText = 'height:100%;align-items:stretch;';

    const left = h('div', 'col');
    left.style.cssText = 'width:336px;padding:30px 22px 24px 30px;gap:4px;';
    const { min, max } = ctx.hist.range('climate.outdoor');
    add(left,
      h('div', 'cap', 'Outdoor'),
      (() => { const v = h('div', 'hero-s deg', t1(ctx.temp('climate.outdoor')));
               v.style.cssText = 'padding-top:8px;'; return v; })(),
      (() => {
        const r = h('div', 'row body');
        r.style.cssText = 'gap:16px;padding-top:14px;';
        add(r, h('div', 'tnum', `H ${t1(max)}°`), h('div', 'tnum', `L ${t1(min)}°`),
               h('div', 'tnum', `${t0(ctx.hum('climate.outdoor'))}%`));
        return r;
      })(),
      (() => { const s = spark(ctx.hist.get('climate.outdoor'),
                               { w: 282, h: 96, area: true });
               s.style.cssText = 'margin-top:16px;'; return s; })(),
      (() => { const c = h('div', 'small', '24 h'); c.style.cssText = 'padding-top:2px;'; return c; })());

    const divider = h('div', 'rule-v');

    const right = h('div', 'col grow');
    right.style.cssText = 'padding:30px 30px 24px 26px;gap:0;';
    add(right, h('div', 'cap', 'Indoor'));
    const rows = h('div', 'col grow');
    rows.style.cssText = 'justify-content:space-around;padding:6px 0 18px;';
    for (const r of ctx.rooms) {
      const row = h('div', 'row');
      row.style.cssText = 'gap:14px;align-items:center;';
      const name = h('div', 'body', r.label);
      name.style.cssText = 'width:92px;';
      const v = h('div', 'val deg tnum', t1(ctx.temp(r.id)));
      v.style.cssText = 'width:86px;text-align:right;';
      add(row, name, meter(ctx.temp(r.id)), v);
      add(rows, row);
    }
    add(right, rows,
      (() => { const l = h('div', 'small', 'Ticks mark the 18–24 °C comfort band  ·  scale 12–30 °C');
               return l; })());

    add(wrap, left, divider, right);
    add(p, wrap);
    return p;
  },
};

/* ------------------------------------------------------------- 4. Grid ---- */
/* Six equal stat tiles. Outdoor is inverted — emphasis, not decoration: it is
   the one reading that is not a room. */

export const grid = {
  id: 'grid',
  name: 'Grid',
  blurb: 'Six equal stat tiles, each with its own 24 h trend. Outdoor inverted '
       + 'to mark it as the odd one out. Most information, most ink.',
  render(ctx) {
    const p = panel();
    const g = h('div');
    g.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);'
                    + 'grid-template-rows:repeat(2,1fr);height:100%;'
                    + 'gap:1px;background:#000;';

    const cells = [
      { id: 'climate.outdoor', label: 'Outdoor', invert: true },
      ...ctx.rooms.map((r) => ({ id: r.id, label: r.label, invert: false })),
    ].slice(0, 6);

    for (const c of cells) {
      const cell = h('div', `col ${c.invert ? 'invert' : ''}`);
      cell.style.cssText = 'background-color:' + (c.invert ? '#000' : '#fff')
                         + ';padding:20px 20px 14px;gap:4px;';
      const { min, max } = ctx.hist.range(c.id);
      add(cell,
        h('div', 'cap', c.label),
        (() => { const v = h('div', 'big deg', t1(ctx.temp(c.id)));
                 v.style.cssText = 'padding-top:8px;'; return v; })(),
        add(h('div', 'grow')),
        (() => {
          const s = spark(ctx.hist.tail(c.id, 48), { w: 210, h: 40, dot: true });
          if (c.invert) s.querySelectorAll('path,circle').forEach((n) => {
            if (n.getAttribute('stroke') === '#000') n.setAttribute('stroke', '#fff');
            if (n.getAttribute('fill') === '#000') n.setAttribute('fill', '#fff');
            if (n.getAttribute('stroke') === '#fff' && n.tagName === 'circle')
              n.setAttribute('stroke', '#000');
          });
          return s;
        })(),
        (() => {
          const r = h('div', 'row small tnum');
          r.style.cssText = 'gap:12px;';
          add(r, h('div', null, `H ${t1(max)}°`), h('div', null, `L ${t1(min)}°`),
                 add(h('div', 'grow')), h('div', null, `${t0(ctx.hum(c.id))}%`));
          return r;
        })());
      add(g, cell);
    }
    add(p, g);
    return p;
  },
};

/* ------------------------------------------------------------- 5. Bare ---- */
/* "Only the most basic info", taken literally: one number, plus a thin strip
   of context. Exactly one hero figure on the view. */

export const bare = {
  id: 'bare',
  name: 'Bare',
  blurb: 'One number. Everything else is a single strip along the bottom. '
       + 'Legible from the far end of the flat.',
  render(ctx) {
    const p = panel();
    const wrap = h('div', 'col');
    wrap.style.cssText = 'height:100%;padding:34px 34px 0;';

    const top = h('div', 'row');
    add(top, h('div', 'cap', 'Outdoor'), add(h('div', 'grow')),
             h('div', 'cap tnum', ctx.now));
    add(wrap, top);

    const mid = h('div', 'col grow');
    mid.style.cssText = 'justify-content:center;align-items:center;padding-bottom:26px;';
    const { min, max } = ctx.hist.range('climate.outdoor');
    add(mid,
      h('div', 'hero-xl deg', t1(ctx.temp('climate.outdoor'))),
      (() => {
        const r = h('div', 'row body');
        r.style.cssText = 'gap:26px;padding-top:22px;';
        add(r, h('div', 'tnum', `High ${t1(max)}°`), h('div', 'tnum', `Low ${t1(min)}°`),
               h('div', 'tnum', `${t0(ctx.hum('climate.outdoor'))}% humidity`));
        return r;
      })());
    add(wrap, mid);
    add(p, wrap);

    const strip = h('div', 'row');
    strip.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:70px;'
                        + 'border-top:3px solid #000;align-items:center;padding:0 34px;';
    ctx.rooms.slice(0, 4).forEach((r, i) => {
      if (i) {
        const sep = h('div', 'rule-v');
        sep.style.cssText = 'height:30px;margin:0 16px;';
        add(strip, sep);
      }
      const cell = h('div', 'row grow');
      cell.style.cssText = 'gap:10px;align-items:baseline;padding:0 4px;';
      add(cell, h('div', 'small', r.label), add(h('div', 'grow')),
                h('div', 'val deg tnum', t1(ctx.temp(r.id))));
      add(strip, cell);
    });
    add(p, strip);
    return p;
  },
};

/* ------------------------------------------------------------- 6. Dots ---- */
/* Dot plot: every room on one shared track, so the eye compares positions
   rather than reading digits. Indoor rooms share a 16–28 scale with the
   comfort band drawn heavier; balcony and outdoor sit below on their own
   −20…30 scale, because a glazed balcony in autumn is nowhere near 16. */

const DOT_SCALES = {
  indoor:  { lo: 16, hi: 28, step: 2 },
  outdoor: { lo: -20, hi: 30, step: 10 },
};

export const dots = {
  id: 'dots',
  name: 'Dots',
  blurb: 'A dot per room on one shared 16–28 °C track, comfort band drawn heavier. '
       + 'Balcony and outdoor below on their own −20…30 scale. Position does the '
       + 'comparing; the printed value does the reading.',
  render(ctx) {
    const p = panel();
    add(p, header(ctx));

    const W = 744, LABEL = 0, TRACK_X = 150, TRACK_W = 420, VALUE_X = W;
    const FONT = 'Inter, Helvetica, Arial, sans-serif';
    const pos = (sc, v) => TRACK_X + ((v - sc.lo) / (sc.hi - sc.lo)) * TRACK_W;

    const axis = (sc, y, { above = true } = {}) => {
      let out = `<rect x="${TRACK_X}" y="${y}" width="${TRACK_W}" height="1" fill="#000"/>`;
      for (let v = sc.lo; v <= sc.hi; v += sc.step) {
        const x = pos(sc, v);
        const zero = v === 0;
        out += `<rect x="${(x - (zero ? 1 : 0.5)).toFixed(1)}" y="${above ? y - (zero ? 10 : 6) : y}"
                      width="${zero ? 2 : 1}" height="${zero ? 10 : 6}" fill="#000"/>`
             + `<text x="${x.toFixed(1)}" y="${above ? y - 12 : y + 24}" text-anchor="middle" font-size="15"
                      font-weight="500" font-family="${FONT}">${v}</text>`;
      }
      return out;
    };

    const row = (sc, y, label, value, { strong = false, band = null } = {}) => {
      let out = `<text x="${LABEL}" y="${y + 7}" font-size="${strong ? 22 : 19}"
                       font-weight="${strong ? 700 : 500}" font-family="${FONT}">${label}</text>`
              + `<rect x="${TRACK_X}" y="${y}" width="${TRACK_W}" height="1" fill="#000"/>`;
      if (band) {
        out += `<rect x="${pos(sc, band[0]).toFixed(1)}" y="${y - 1}"
                      width="${(pos(sc, band[1]) - pos(sc, band[0])).toFixed(1)}" height="3" fill="#000"/>`;
      }
      // off-scale readings become an arrow at the edge, never a dot in the wrong place
      if (value < sc.lo) {
        out += `<polygon points="${TRACK_X - 2},${y} ${TRACK_X + 12},${y - 8} ${TRACK_X + 12},${y + 8}" fill="#000"/>`;
      } else if (value > sc.hi) {
        const xe = TRACK_X + TRACK_W;
        out += `<polygon points="${xe + 2},${y} ${xe - 12},${y - 8} ${xe - 12},${y + 8}" fill="#000"/>`;
      } else {
        out += `<circle cx="${pos(sc, value).toFixed(1)}" cy="${y}" r="7" fill="#000" stroke="#fff" stroke-width="2"/>`;
      }
      // no letter-spacing here: Chrome mis-measures spaced SVG text for text-anchor="end"
      out += `<text x="${VALUE_X}" y="${y + (strong ? 12 : 10)}" text-anchor="end" font-size="${strong ? 40 : 30}"
                    font-weight="700" font-family="${FONT}">${t1(value)}°</text>`;
      return out;
    };

    const indoor = ctx.rooms.filter((r) => r.id !== 'climate.balcony');
    const rowGap = 48;
    let y = 40;                                  // axis line
    let art = axis(DOT_SCALES.indoor, y);
    indoor.forEach((r, i) => {
      art += row(DOT_SCALES.indoor, y + 34 + i * rowGap, r.label, ctx.temp(r.id), { band: COMFORT });
    });
    const yRule = y + 34 + indoor.length * rowGap - 14;
    art += `<rect x="0" y="${yRule}" width="${W}" height="2" fill="#000"/>`;
    const yBal = yRule + 40;
    art += row(DOT_SCALES.outdoor, yBal, 'Balcony', ctx.temp('climate.balcony'));
    art += row(DOT_SCALES.outdoor, yBal + rowGap + 4, 'Outdoor', ctx.temp(ctx.outdoor), { strong: true });
    art += axis(DOT_SCALES.outdoor, yBal + rowGap + 4 + 30, { above: false });
    const H = yBal + rowGap + 4 + 30 + 30;

    const svg = h('div');
    svg.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
        shape-rendering="geometricPrecision">${art}</svg>`;
    svg.firstElementChild.style.cssText = 'display:block;margin:8px 28px 0;';
    add(p, svg.firstElementChild);
    return p;
  },
};

export const DESIGNS = [lead, ledger, split, grid, bare, dots];
