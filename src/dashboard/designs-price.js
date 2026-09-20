/**
 * Electricity-price studies: "is now a good time for a sauna?"
 *
 * Same 800x480 1-bit contract as the climate designs. The data's job here is
 * different, though: a spot price is a *schedule* — 24 (or 48) hourly values
 * whose shape you read to pick a time — so unlike the climate studies these do
 * plot. Two forms recur:
 *
 *   columns  hourly price as a column chart, the cheapest sauna window framed
 *            and underlined, "now" as a marker under the axis. Magnitude is
 *            the message.
 *   ribbon   one cell per hour, classed into three absolute bands
 *            (white = cheap, hatch = normal, black = dear). Ordinal, not
 *            magnitude — it reads like a timetable, and it is the compact
 *            form that fits under an existing climate layout.
 *
 * Every design also prints the verdict in words and the current price as a
 * number, so nothing is reachable only by reading a mark.
 *
 * ctx adds: prices (store), verdict, saunaWatts, nowMs.
 */
import { BANDS, band, sessionCost, sessionKWh, verdictText, SAUNA } from '../prices.js';
import { h, add, t1, t0, panel, header, footer, spark } from './designs.js';
import { planWithTemps } from './designs-plan.js';

let uid = 0;
const FONT = 'Inter, Helvetica, Arial, sans-serif';
const hh = (hr) => `${String(hr).padStart(2, '0')}:00`;
const fmtC = (p) => p == null ? '–'
  : Math.abs(p) < 0.05 ? '0.0'
  : `${p < 0 ? '−' : ''}${Math.abs(p).toFixed(1)}`;
const eur = (v) => `${v.toFixed(2)} €`;
const cap = (x, y, text, anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="15" font-weight="700"
     letter-spacing="1.6" font-family="${FONT}">${text}</text>`;
const num = (x, y, text, anchor = 'middle', size = 16) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="700"
     font-family="${FONT}">${text}</text>`;

function sourceText(store) {
  if (store.source === 'porssisahko') return 'Nord Pool FI day-ahead via porssisahko.net · c/kWh incl. VAT 25.5 %';
  if (store.source === 'synthetic') return 'Simulated prices — live feed unreachable';
  return 'No price feed';
}

const hatchDef = (id, gap = 6) => `
  <pattern id="${id}" width="${gap}" height="${gap}" patternTransform="rotate(45)"
           patternUnits="userSpaceOnUse">
    <rect width="${gap}" height="${gap}" fill="#fff"/>
    <line x1="0" y1="0" x2="0" y2="${gap}" stroke="#000" stroke-width="2"/>
  </pattern>`;

/* --------------------------------------------------------------- columns */

/**
 * Hourly columns for today (and tomorrow when published), on one shared
 * scale. Selective labels only: now, the sauna window, the max and the min.
 */
function columns(ctx, { w = 744, h: H = 290, days = [0, 1], compact = false } = {}) {
  const store = ctx.prices;
  const sets = days.map((o) => ({ offset: o, hours: store.hourly(o) }))
    .filter((d) => d.hours.length);
  const el = h('div');
  if (!sets.length) {
    el.innerHTML = `<svg width="${w}" height="${H}"></svg>`;
    return el.firstElementChild;
  }

  const gutter = compact ? 30 : 38;                 // right-hand scale labels
  const top = compact ? 22 : 44;                    // day caps + value labels
  const bottom = compact ? 34 : 40;                 // marker + hour ticks
  const dayGap = sets.length > 1 ? 22 : 0;
  const n = sets.length * 24;
  const plotW = w - gutter;
  const plotH = H - top - bottom;
  const base = top + plotH;
  const slotW = (plotW - dayGap) / n;
  const barW = Math.min(24, Math.floor(slotW) - 2);
  const all = sets.flatMap((s) => s.hours.map((p) => p.price).filter((p) => p != null));
  const maxP = Math.max(10, Math.ceil(Math.max(...all) / 5) * 5);
  const yOf = (p) => base - (Math.max(0, p) / maxP) * plotH;
  const x0 = (di, i) => di * (24 * slotW + dayGap) + i * slotW;   // slot left edge
  const xc = (di, i) => x0(di, i) + slotW / 2;

  const now = new Date(ctx.nowMs);
  const nowHour = now.getHours();
  const v = ctx.verdict;
  const winDi = v.window ? sets.findIndex((s) => s.offset === v.window.offset) : -1;

  let art = '';
  // scale rules at the band thresholds, labelled in the gutter
  for (const [val, txt] of [[BANDS.cheap, `${BANDS.cheap}`], [BANDS.dear, `${BANDS.dear}`]]) {
    if (val >= maxP) continue;
    const y = yOf(val);
    art += `<rect x="0" y="${(y - 0.5).toFixed(1)}" width="${plotW + 6}" height="1" fill="#000"/>`
         + num(plotW + 10, (y + 5).toFixed(1), txt, 'start', 15);
  }
  art += num(plotW + 10, base + 5, '0', 'start', 15);
  // baseline
  art += `<rect x="0" y="${base}" width="${plotW}" height="2" fill="#000"/>`;

  // the sauna window: a 2px frame around its columns and a 4px bar under the
  // axis. A solid black band was tried first — striking, but on a cheap day
  // it dwarfed every column and read as the day's peak.
  let bandBox = null;
  if (winDi >= 0) {
    const bx = x0(winDi, v.window.i0), bw = (v.window.i1 - v.window.i0 + 1) * slotW;
    bandBox = { x: bx, w: bw };
    art += `<rect x="${(bx + 1).toFixed(1)}" y="${top + 1}" width="${(bw - 2).toFixed(1)}" height="${plotH - 1}"
                  fill="none" stroke="#000" stroke-width="2"/>`
         + `<rect x="${bx.toFixed(1)}" y="${base + 2}" width="${bw.toFixed(1)}" height="4" fill="#000"/>`;
  }

  sets.forEach((s, di) => {
    if (!compact) art += cap(x0(di, 0), 14, s.offset === 0 ? 'TODAY' : 'TOMORROW');
    s.hours.forEach((p, i) => {
      if (p.price == null) return;
      const y = yOf(p.price);
      const hgt = Math.max(2, base - y);            // a 2px stub keeps a free hour visible
      art += `<rect x="${(xc(di, i) - barW / 2).toFixed(1)}" y="${(base - hgt).toFixed(1)}"
                    width="${barW}" height="${hgt.toFixed(1)}" fill="#000"/>`;
    });
    // hour ticks
    for (const hr of [0, 6, 12, 18]) {
      if (s.offset === 0 && Math.abs(hr - nowHour) <= 2) continue;   // "now" sits there
      const x = x0(di, hr);
      art += `<rect x="${x.toFixed(1)}" y="${base}" width="1" height="6" fill="#000"/>`
           + num(x + 3, base + 26, String(hr).padStart(2, '0'), 'start', 15);
    }
    // today's "now" marker
    if (s.offset === 0) {
      const cx = xc(0, nowHour);
      art += `<polygon points="${(cx).toFixed(1)},${base + 8} ${(cx - 6).toFixed(1)},${base + 17} ${(cx + 6).toFixed(1)},${base + 17}" fill="#000"/>`
           + cap(cx, base + 32, 'NOW', 'middle');
    }
  });

  // selective value labels, placed in priority order, skipping collisions
  const placed = [];
  const label = (x, text, prio) => {
    const wTxt = text.length * 9.5 + 6;
    if (placed.some(([a, b]) => x + wTxt / 2 > a && x - wTxt / 2 < b)) return;
    placed.push([x - wTxt / 2, x + wTxt / 2]);
    return `<text x="${x.toFixed(1)}" y="${top - 6}" text-anchor="middle" font-size="16"
              font-weight="700" font-family="${FONT}">${text}</text>`;
  };
  let labels = '';
  const today = sets[0];
  if (bandBox) labels += label(bandBox.x + bandBox.w / 2, `${fmtC(v.window.avg)} c`) ?? '';
  if (today.offset === 0 && today.hours[nowHour]?.price != null && !compact) {
    labels += label(xc(0, nowHour), fmtC(today.hours[nowHour].price)) ?? '';
  }
  if (!compact) {
    for (const [di, s] of sets.entries()) {
      const st = store.stats(s.offset);
      if (!st) continue;
      labels += label(xc(di, st.max.hour), fmtC(st.max.price)) ?? '';
      labels += label(xc(di, st.min.hour), fmtC(st.min.price)) ?? '';
    }
  }

  el.innerHTML = `<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" shape-rendering="crispEdges">
      ${art}<g shape-rendering="geometricPrecision">${labels}</g></svg>`;
  return el.firstElementChild;
}

/* ---------------------------------------------------------------- ribbon */

/**
 * 24 cells for one day, filled by absolute band. Sauna window bracketed above,
 * "now" marked below. Ordinal, so it never needs a scale.
 */
function ribbon(ctx, offset, { w = 744, h: cellH = 34, hourLabels = true, bracket = true } = {}) {
  const hours = ctx.prices.hourly(offset);
  const pid = `rb-${++uid}`;
  const topPad = bracket ? 10 : 0;
  const below = hourLabels ? 36 : 18;
  const H = topPad + cellH + below;
  const cellW = w / 24;
  const el = h('div');
  if (!hours.length) {
    el.innerHTML = `<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">
      <rect x="0.5" y="${topPad + 0.5}" width="${w - 1}" height="${cellH - 1}" fill="#fff" stroke="#000"/>
      ${num(w / 2, topPad + cellH / 2 + 6, 'published around 14:00', 'middle', 16)}</svg>`;
    return el.firstElementChild;
  }
  const v = ctx.verdict;
  const nowHour = new Date(ctx.nowMs).getHours();
  let art = '';
  hours.forEach((p, i) => {
    const b = band(p.price);
    const fill = b === 'cheap' ? '#fff' : b === 'dear' ? '#000' : b === 'normal' ? `url(#${pid})` : '#fff';
    art += `<rect x="${(i * cellW).toFixed(1)}" y="${topPad}" width="${cellW.toFixed(1)}" height="${cellH}" fill="${fill}"/>`;
  });
  // grid: outer frame + a 1px divider at every hour (past, unpriced hours stay unframed)
  const first = hours.findIndex((p) => p.price != null);
  art += `<rect x="${(first * cellW + 0.5).toFixed(1)}" y="${topPad + 0.5}" width="${((24 - first) * cellW - 1).toFixed(1)}"
                height="${cellH - 1}" fill="none" stroke="#000" stroke-width="1"/>`;
  for (let i = first + 1; i < 24; i++) {
    art += `<rect x="${(i * cellW - 0.5).toFixed(1)}" y="${topPad}" width="1" height="${cellH}" fill="#000"/>`;
  }
  if (hourLabels) {
    for (const hr of [0, 6, 12, 18]) {
      if (offset === 0 && Math.abs(hr - nowHour) <= 2) continue;
      art += `<rect x="${(hr * cellW).toFixed(1)}" y="${topPad + cellH}" width="1" height="5" fill="#000"/>`
           + num(hr * cellW + 3, topPad + cellH + 24, String(hr).padStart(2, '0'), 'start', 15);
    }
  }
  if (offset === 0) {
    const cx = (nowHour + 0.5) * cellW;
    art += `<polygon points="${cx.toFixed(1)},${topPad + cellH + 3} ${(cx - 6).toFixed(1)},${topPad + cellH + 13} ${(cx + 6).toFixed(1)},${topPad + cellH + 13}" fill="#000"/>`;
    if (hourLabels) art += cap(cx, topPad + cellH + 28, 'NOW', 'middle');
  }
  if (bracket && v.window && v.window.offset === offset) {
    const bx = v.window.i0 * cellW, bw = (v.window.i1 - v.window.i0 + 1) * cellW;
    art += `<rect x="${bx.toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="4" fill="#000"/>`
         + `<rect x="${bx.toFixed(1)}" y="0" width="2" height="8" fill="#000"/>`
         + `<rect x="${(bx + bw - 2).toFixed(1)}" y="0" width="2" height="8" fill="#000"/>`;
  }
  el.innerHTML = `<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" shape-rendering="crispEdges">
      <defs>${hatchDef(pid)}</defs>${art}</svg>`;
  return el.firstElementChild;
}

function ribbonLegend() {
  const row = h('div', 'row small');
  row.style.cssText = 'gap:22px;';
  const sw = (fill) => {
    const s = h('div');
    s.style.cssText = 'width:34px;height:18px;flex:none;';
    s.innerHTML = `<svg width="34" height="18"><defs>${hatchDef('lg-rb')}</defs>
      <rect x="0.5" y="0.5" width="33" height="17" fill="${fill}" stroke="#000"/></svg>`;
    return s;
  };
  for (const [fill, text] of [['#fff', `under ${BANDS.cheap} c`], ['url(#lg-rb)', `${BANDS.cheap}–${BANDS.dear} c`], ['#000', `over ${BANDS.dear} c`]]) {
    const item = h('div', 'row'); item.style.cssText = 'gap:8px;';
    add(item, sw(fill), h('div', null, text));
    add(row, item);
  }
  return row;
}

/* --------------------------------------------------------------- shared */

const headClass = (text) => (text.length <= 9 ? 'hero-s' : 'big');

function statTile(label, value, sub, { wide = false } = {}) {
  const t = h('div', 'col');
  t.style.cssText = `gap:8px;${wide ? 'flex:1;' : ''}`;
  add(t, h('div', 'cap', label), h('div', 'big', value));
  if (sub) add(t, h('div', 'small', sub));
  return t;
}

const bandWord = (p) => ({ cheap: 'cheap', normal: 'normal', dear: 'dear' }[band(p)] ?? '');

/* ---------------------------------------------------------- 10. Verdict -- */

export const verdictDesign = {
  id: 'verdict',
  name: 'Verdict',
  blurb: 'Answer first: whether to heat the sauna now, in words, as the hero. The '
       + 'prices behind the answer follow as three stat tiles. No plot at all.',
  render(ctx) {
    const p = panel();
    add(p, header(ctx));
    const v = ctx.verdict;
    const text = verdictText(v, ctx.saunaWatts);
    const body = h('div', 'col');
    body.style.cssText = 'padding:22px 28px 0;gap:6px;';
    add(body, h('div', 'cap', 'Sauna · electricity'));
    const head = h('div', headClass(text.head), text.head);
    head.style.cssText = 'padding-top:10px;';
    const sub = h('div', 'body', text.sub);
    sub.style.cssText = 'padding-top:10px;';
    add(body, head, sub);
    add(p, body);

    const rule = h('div', 'rule');
    rule.style.cssText = 'margin:26px 28px 0;width:auto;';
    add(p, rule);

    const tiles = h('div', 'row');
    tiles.style.cssText = 'padding:22px 28px 0;gap:24px;align-items:flex-start;';
    // All three tiles are 2 h window means, so they compare like with like.
    const nw = v.nowWin;
    add(tiles, statTile('Now', nw ? `${fmtC(nw.avg)} c` : `${fmtC(v.nowPrice)} c`,
      nw ? `next 2 h · ${bandWord(nw.avg)}` : v.nowPrice != null ? `this hour · ${bandWord(v.nowPrice)}` : '', { wide: true }));
    const bt = v.bestToday;
    add(tiles, statTile('Cheapest today', bt ? `${fmtC(bt.avg)} c` : '–',
      bt ? `2 h from ${hh(bt.hour)} · ${bandWord(bt.avg)}` : 'no sauna hours left', { wide: true }));
    const tm = v.bestTomorrow;
    add(tiles, statTile('Tomorrow', tm ? `${fmtC(tm.avg)} c` : '–',
      tm ? `2 h from ${hh(tm.hour)} · ${bandWord(tm.avg)}` : 'published around 14:00', { wide: true }));
    add(p, tiles, footer(ctx, sourceText(ctx.prices)));
    return p;
  },
};

/* ------------------------------------------------------------ 11. Hours -- */

export const hours = {
  id: 'hours',
  name: 'Hours',
  blurb: 'Today and tomorrow as hourly columns on one scale. The cheapest sauna '
       + 'window is framed and underlined; the 5 and 15 c rules give the absolute '
       + 'bands; labels only on the window, now, max and min.',
  render(ctx) {
    const p = panel();
    add(p, header(ctx));
    const v = ctx.verdict;
    const text = verdictText(v, ctx.saunaWatts);
    const row = h('div', 'row');
    row.style.cssText = 'padding:14px 28px 0;gap:16px;align-items:baseline;';
    add(row, h('div', 'cap', 'Electricity · c/kWh'), add(h('div', 'grow')),
             h('div', 'cap', 'Sauna'), h('div', 'val', text.head));
    add(p, row);
    const chart = columns(ctx, { w: 744, h: 286 });
    chart.style.cssText = 'display:block;margin:10px 28px 0;';
    add(p, chart);
    const sub = h('div', 'body', text.sub);
    sub.style.cssText = 'padding:8px 28px 0;';
    add(p, sub, footer(ctx, sourceText(ctx.prices)));
    return p;
  },
};

/* ----------------------------------------------------------- 12. Ribbon -- */

export const ribbonDesign = {
  id: 'ribbon',
  name: 'Ribbon',
  blurb: 'Each hour is a cell classed cheap / normal / dear — a timetable, not a '
       + 'chart. Reads at a glance which hours are off-limits; the bracket marks the '
       + 'sauna window. Least ink of the price designs.',
  render(ctx) {
    const p = panel();
    add(p, header(ctx));
    const v = ctx.verdict;
    const text = verdictText(v, ctx.saunaWatts);

    const top = h('div', 'row');
    top.style.cssText = 'padding:16px 28px 0;gap:26px;align-items:flex-end;';
    const left = h('div', 'col'); left.style.cssText = 'gap:8px;';
    add(left, h('div', 'cap', 'Sauna'), h('div', 'mid', text.head), h('div', 'body', text.sub));
    const right = h('div', 'col'); right.style.cssText = 'gap:6px;align-items:flex-end;flex:none;';
    add(right, h('div', 'cap', 'Now'), h('div', 'big', `${fmtC(v.nowPrice)} c`));
    add(top, left, add(h('div', 'grow')), right);
    add(p, top);

    for (const [offset, label, padTop] of [[0, 'Today', 22], [1, 'Tomorrow', 12]]) {
      const c = h('div', 'cap', label);
      c.style.cssText = `padding:${padTop}px 28px 0;`;
      const r = ribbon(ctx, offset, { w: 744, h: 34, hourLabels: true });
      r.style.cssText = 'display:block;margin:6px 28px 0;';
      add(p, c, r);
    }
    const legend = ribbonLegend();
    legend.style.cssText += 'position:absolute;left:28px;bottom:46px;';
    add(p, legend, footer(ctx, sourceText(ctx.prices)));
    return p;
  },
};

/* ---------------------------------------------------------- 13. Session -- */

export const session = {
  id: 'session',
  name: 'Session',
  blurb: 'The price of one sauna, in euros, instead of c/kWh. Now versus the '
       + 'cheapest window today and tomorrow, and — the actual decision — what '
       + 'waiting would save. Often the honest answer is "a few cents".',
  render(ctx) {
    const p = panel();
    add(p, header(ctx));
    const v = ctx.verdict;
    const W = ctx.saunaWatts;
    const kwh = sessionKWh(W);
    const nowCost = v.nowWin ? sessionCost(v.nowWin.avg, W) : null;

    const wrap = h('div', 'row');
    wrap.style.cssText = 'padding:20px 28px 0;gap:30px;align-items:stretch;';
    const left = h('div', 'col');
    left.style.cssText = 'width:380px;gap:8px;';
    add(left, h('div', 'cap', 'A sauna now'),
      (() => { const e = h('div', 'hero-s', nowCost != null ? eur(nowCost) : '–'); e.style.cssText = 'padding-top:8px;'; return e; })(),
      (() => { const b = h('div', 'body',
                 v.nowWin ? `${kwh.toFixed(1)} kWh · spot ${fmtC(v.nowWin.avg)} c + 7.5 c transfer & tax`
                          : 'outside sauna hours');
               b.style.cssText = 'padding-top:12px;'; return b; })());
    const divider = h('div', 'rule-v');
    const right = h('div', 'col grow');
    right.style.cssText = 'gap:26px;padding-left:4px;';
    const alt = (label, w) => {
      const c = h('div', 'col'); c.style.cssText = 'gap:6px;';
      add(c, h('div', 'cap', label),
        h('div', 'big', w ? eur(sessionCost(w.avg, W)) : '–'),
        h('div', 'small', w ? `2 h from ${hh(w.hour)} at ${fmtC(w.avg)} c` : label === 'Tomorrow' ? 'published around 14:00' : 'no sauna hours left'));
      return c;
    };
    add(right, alt('Cheapest today', v.bestToday), alt('Tomorrow', v.bestTomorrow));
    add(wrap, left, divider, right);
    add(p, wrap);

    const rule = h('div', 'rule');
    rule.style.cssText = 'position:absolute;left:28px;right:28px;bottom:104px;width:auto;';
    const saving = (() => {
      const cands = [v.bestToday, v.bestTomorrow].filter(Boolean);
      if (!cands.length || nowCost == null) return null;
      const best = cands.reduce((a, b) => (b.avg < a.avg ? b : a));
      // in whole cents, so the saving agrees with the rounded tiles above it
      const delta = (Math.round(nowCost * 100) - Math.round(sessionCost(best.avg, W) * 100)) / 100;
      return { best, delta };
    })();
    const line = h('div', 'row');
    line.style.cssText = 'position:absolute;left:28px;right:28px;bottom:52px;align-items:baseline;gap:14px;';
    if (saving && saving.delta >= 0.01) {
      add(line, h('div', 'mid', `Waiting saves ${eur(saving.delta)}`),
                h('div', 'body', `${saving.best.offset ? 'tomorrow' : 'today'} at ${hh(saving.best.hour)}`));
    } else if (nowCost != null) {
      add(line, h('div', 'mid', 'Waiting saves nothing'), h('div', 'body', 'now is the cheapest window left'));
    } else {
      add(line, h('div', 'mid', verdictText(v, W).head));
    }
    add(p, rule, line, footer(ctx, sourceText(ctx.prices)));
    return p;
  },
};

/* ------------------------------------------------------ 14. Lead + price -- */

export const leadPrice = {
  id: 'lead-price',
  name: 'Lead + price',
  blurb: 'The existing Lead layout with today’s price ribbon and a one-line sauna '
       + 'verdict added along the bottom. Shows the price living inside the climate '
       + 'panel rather than on a screen of its own.',
  render(ctx) {
    const p = panel();
    add(p, header(ctx));
    const main = h('div', 'row');
    main.style.cssText = 'padding:12px 28px 0;gap:26px;align-items:flex-start;';
    const left = h('div', 'col'); left.style.cssText = 'gap:6px;';
    const { min, max } = ctx.hist.range('climate.outdoor');
    add(left, h('div', 'cap', 'Outdoor'),
      h('div', 'hero-s deg', t1(ctx.temp('climate.outdoor'))),
      (() => { const r = h('div', 'row body'); r.style.cssText = 'gap:18px;padding-top:10px;';
               add(r, h('div', 'tnum', `High ${t1(max)}°`), h('div', 'tnum', `Low ${t1(min)}°`),
                      h('div', 'tnum', `${t0(ctx.hum('climate.outdoor'))}% rh`)); return r; })());
    const right = h('div', 'col grow'); right.style.cssText = 'gap:8px;padding-top:4px;';
    add(right, h('div', 'cap', 'Last 24 hours'),
      spark(ctx.hist.get('climate.outdoor'), { w: 330, h: 92, area: true }));
    add(main, left, right);
    add(p, main);

    const indoorCap = h('div', 'cap', 'Indoor');
    indoorCap.style.cssText = 'padding:22px 28px 0;';
    const rule1 = h('div', 'rule'); rule1.style.cssText = 'margin:8px 28px 0;width:auto;';
    const strip = h('div', 'row'); strip.style.cssText = 'padding:10px 28px 0;';
    ctx.rooms.forEach((r, i) => {
      if (i) { const sep = h('div', 'rule-v'); sep.style.cssText = 'height:46px;margin:0 18px;'; add(strip, sep); }
      const tile = h('div', 'col grow'); tile.style.cssText = 'gap:6px;';
      add(tile, h('div', 'cap', r.label), h('div', 'val deg tnum', t1(ctx.temp(r.id))));
      add(strip, tile);
    });
    add(p, indoorCap, rule1, strip);

    const v = ctx.verdict;
    const text = verdictText(v, ctx.saunaWatts);
    const rule2 = h('div', 'rule'); rule2.style.cssText = 'margin:16px 28px 0;width:auto;';
    const prow = h('div', 'row');
    prow.style.cssText = 'padding:10px 28px 0;gap:14px;align-items:baseline;';
    add(prow, h('div', 'cap', 'Electricity'), h('div', 'body tnum', `${fmtC(v.nowPrice)} c/kWh`),
              add(h('div', 'grow')), h('div', 'cap', 'Sauna'), h('div', 'body', text.head));
    const rb = ribbon(ctx, 0, { w: 744, h: 24, hourLabels: true });
    rb.style.cssText = 'display:block;margin:6px 28px 0;';
    add(p, rule2, prow, rb);
    return p;
  },
};

/* ------------------------------------------------------ 15. Plan + price -- */

export const planPrice = {
  id: 'plan-price',
  name: 'Plan + price',
  blurb: 'The Plan layout with the right-hand column split between outdoor and '
       + 'electricity: the current price as a figure, the verdict in words, and '
       + 'today’s columns small underneath as the evidence.',
  render(ctx) {
    const p = panel();
    const wrap = h('div', 'row');
    wrap.style.cssText = 'height:100%;align-items:stretch;';
    const left = h('div'); left.style.cssText = 'padding:17px 0 17px 16px;';
    add(left, planWithTemps(ctx));

    const right = h('div', 'col grow');
    right.style.cssText = 'padding:26px 28px 18px 20px;gap:0;';
    const v = ctx.verdict;
    const text = verdictText(v, ctx.saunaWatts);
    add(right,
      (() => { const r = h('div', 'row'); r.style.cssText = 'align-items:baseline;';
               add(r, h('div', 'cap', 'Outdoor'), add(h('div', 'grow')), h('div', 'cap tnum', ctx.now)); return r; })(),
      (() => { const r = h('div', 'row'); r.style.cssText = 'gap:16px;align-items:baseline;padding-top:6px;';
               add(r, h('div', 'big deg', t1(ctx.temp('climate.outdoor'))),
                      h('div', 'small tnum', `${t0(ctx.hum('climate.outdoor'))}% rh`)); return r; })(),
      (() => { const r = h('div', 'rule'); r.style.cssText = 'margin:18px 0 16px;'; return r; })(),
      h('div', 'cap', 'Electricity now'),
      (() => { const r = h('div', 'row'); r.style.cssText = 'gap:12px;align-items:baseline;padding-top:6px;';
               add(r, h('div', 'big', `${fmtC(v.nowPrice)} c`), h('div', 'small', v.nowPrice != null ? `per kWh · ${bandWord(v.nowPrice)}` : '')); return r; })(),
      (() => { const r = h('div', 'row'); r.style.cssText = 'gap:10px;align-items:baseline;padding-top:14px;';
               add(r, h('div', 'cap', 'Sauna'), h('div', 'body', text.head)); return r; })(),
      (() => { const c = columns(ctx, { w: 322, h: 118, days: [0], compact: true });
               c.style.cssText = 'display:block;margin-top:14px;'; return c; })(),
      add(h('div', 'grow')),
      h('div', 'small', ctx.prices.source === 'porssisahko' ? 'Nord Pool FI · incl. VAT' : sourceText(ctx.prices)));
    add(wrap, left, right);
    add(p, wrap);
    return p;
  },
};

export const PRICE_DESIGNS = [verdictDesign, hours, ribbonDesign, session, leadPrice, planPrice];
