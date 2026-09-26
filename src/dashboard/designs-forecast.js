/**
 * Forecast studies: Lead + price with the "last 24 hours" block replaced by
 * what the rest of the day will do. Four answers to "what is it going to be
 * like today?", from most graphic to none at all:
 *
 *   Today      the calendar day as one line: observed so far, forecast after
 *   Hours      the next 18 h as six 3-hourly columns, weather-app style
 *   Parts      the next three parts of the day as tiles
 *   Words      the change that matters, as a sentence, plus tomorrow
 *
 * All four keep the hero (the observed temperature now) and the lower half of
 * Lead + price unchanged, so they differ only where they differ.
 *
 * ctx adds: weather (FMI observation store), forecast (FMI forecast store).
 * Outdoor "now" is always the observation; the forecast is only the future.
 */
import { h, add, t1, t0, panel, header } from './designs.js';
import { leadPriceBottom } from './designs-price.js';
import { iconEl } from './wicons.js';
import { outlook, todayRange, dayParts, tomorrow, blockKind, kind, isWet } from '../weather.js';

const FONT = 'Inter, Helvetica, Arial, sans-serif';
const HOUR = 3600 * 1000;
const hh = (t) => String(new Date(t).getHours()).padStart(2, '0');
const hourStart = (t) => { const d = new Date(t); d.setMinutes(0, 0, 0); return +d; };
const dayStart = (t, off = 0) => { const d = new Date(t); return +new Date(d.getFullYear(), d.getMonth(), d.getDate() + off); };
const deg = (v) => `${t0(v)}°`;
const mmTxt = (mm) => (mm < 0.1 ? '' : mm < 1 ? '< 1 mm' : `${Math.round(mm)} mm`);

/* The top block is a fixed height in every variant, so the indoor strip and
   the ribbon sit on the same pixel rows as in Lead + price. */
const TOP_H = 158;

const outdoorNow = (ctx) => ctx.weather?.latest?.t2m ?? NaN;

/** Hero column: observed now, today's high and low, wind now. */
function hero(ctx) {
  const left = h('div', 'col'); left.style.cssText = 'gap:6px;flex:none;';
  const r = todayRange(ctx.weather, ctx.forecast, ctx.nowMs);
  const wind = ctx.forecast.at(ctx.nowMs)?.wind;
  const line = h('div', 'row body'); line.style.cssText = 'gap:18px;padding-top:10px;';
  add(line,
    h('div', 'tnum', `High ${r ? t1(r.max) : '–'}°`),
    h('div', 'tnum', `Low ${r ? t1(r.min) : '–'}°`),
    ...(wind != null ? [h('div', 'tnum', `${Math.round(wind)} m/s`)] : []));
  add(left, h('div', 'cap', 'Outdoor'), h('div', 'hero-s deg', t1(outdoorNow(ctx))), line);
  return left;
}

function frame(ctx, right) {
  const p = panel();
  add(p, header(ctx));
  const main = h('div', 'row');
  main.style.cssText = `padding:12px 28px 0;gap:26px;align-items:flex-start;height:${TOP_H}px;`;
  right.classList.add('grow');
  add(main, hero(ctx), right);
  add(p, main);
  return leadPriceBottom(ctx, p);
}

const noForecast = () => {
  const c = h('div', 'col'); c.style.cssText = 'gap:8px;padding-top:4px;';
  add(c, h('div', 'cap', 'Forecast'), h('div', 'body', 'No forecast — FMI unreachable'));
  return c;
};

/* ------------------------------------------------------------ 16. Today -- */

/**
 * The calendar day 00–24 on one line: observed hours solid with the hatch
 * under them, forecast hours dashed, the dot at now. Rain as black ticks on
 * the baseline. The vertical scale spans at least 8 °C, so a flat grey day
 * draws flat instead of being stretched into drama.
 */
let uid = 0;
function todayChart(ctx, { w = 432, ht = 116 } = {}) {
  const pid = `fc-hatch-${++uid}`;
  const now = ctx.nowMs;
  const d0 = dayStart(now), d1 = dayStart(now, 1);
  const seen = (ctx.weather?.rows ?? []).filter((r) => r.t >= d0 && r.t <= now && r.t2m != null)
    .map((r) => ({ t: r.t, v: r.t2m }));
  const nowV = outdoorNow(ctx);
  const ahead = ctx.forecast.between(now, d1 + 1).map((r) => ({ t: r.t, v: r.temp, mm: r.mm }));
  const all = [...seen, ...ahead].map((p) => p.v).filter(Number.isFinite);
  const el = h('div');
  if (!all.length) { el.innerHTML = `<svg width="${w}" height="${ht}"></svg>`; return el.firstElementChild; }

  const labH = 20, rainH = 14, top = 8;
  const plotB = ht - labH - rainH - 4;
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 8) { const m = (hi + lo) / 2; lo = m - 4; hi = m + 4; }
  const X = (t) => ((t - d0) / (d1 - d0)) * (w - 2) + 1;
  const Y = (v) => plotB - ((v - lo) / (hi - lo)) * (plotB - top);
  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');

  // the observed line ends at the live reading, the forecast line starts there
  const seenPts = Number.isFinite(nowV) ? [...seen, { t: now, v: nowV }] : seen;
  const aheadPts = Number.isFinite(nowV) ? [{ t: now, v: nowV }, ...ahead] : ahead;
  const area = seenPts.length > 1
    ? `<path d="${path(seenPts)}L${X(seenPts.at(-1).t).toFixed(1)},${plotB}L${X(seenPts[0].t).toFixed(1)},${plotB}Z" fill="url(#${pid})"/>`
    : '';
  const rainBase = plotB + 4 + rainH;
  const rain = ahead.filter(isWet).map((r) => {
    const bh = Math.max(3, Math.round((Math.min(r.mm, 3) / 3) * rainH));
    return `<rect x="${(X(r.t) + 1).toFixed(0)}" y="${rainBase - bh}" width="${Math.max(3, Math.floor(X(r.t + HOUR) - X(r.t)) - 2)}" height="${bh}" fill="#000"/>`;
  }).join('');
  const ticks = [0, 6, 12, 18, 24].map((hr) => {
    const x = X(d0 + hr * HOUR);
    const anchor = hr === 0 ? 'start' : hr === 24 ? 'end' : 'middle';
    return `<rect x="${Math.round(x) - (hr === 24 ? 1 : 0)}" y="${rainBase}" width="1" height="5" fill="#000"/>
      <text x="${x.toFixed(0)}" y="${ht - 2}" text-anchor="${anchor}" font-size="15" font-weight="700"
        font-family="${FONT}">${String(hr % 24).padStart(2, '0')}</text>`;
  }).join('');

  el.innerHTML = `
    <svg width="${w}" height="${ht}" viewBox="0 0 ${w} ${ht}">
      <defs><pattern id="${pid}" width="9" height="9" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width="9" height="9" fill="#fff"/><line x1="0" y1="0" x2="0" y2="9" stroke="#000" stroke-width="2"/>
      </pattern></defs>
      ${area}
      <path d="${path(seenPts)}" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
      <path d="${path(aheadPts)}" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="6 5"/>
      <rect x="0" y="${rainBase}" width="${w}" height="1" fill="#000"/>
      ${rain}${ticks}
      ${Number.isFinite(nowV) ? `<circle cx="${X(now).toFixed(1)}" cy="${Y(nowV).toFixed(1)}" r="5" fill="#000" stroke="#fff" stroke-width="2"/>` : ''}
    </svg>`;
  return el.firstElementChild;
}

export const fcToday = {
  id: 'fc-today',
  name: 'Forecast · Today',
  blurb: 'The calendar day as one line: what has been observed since midnight is solid '
       + 'and hatched, the forecast to midnight is dashed, rain sits as black ticks on the '
       + 'baseline. The headline says the one change that matters.',
  render(ctx) {
    if (!ctx.forecast.rows.length) return frame(ctx, noForecast());
    const o = outlook(ctx.forecast, ctx.nowMs);
    const right = h('div', 'col'); right.style.cssText = 'gap:6px;padding-top:0;';
    const capRow = h('div', 'row'); capRow.style.cssText = 'gap:12px;align-items:baseline;';
    add(capRow, h('div', 'cap', 'Today'), add(h('div', 'grow')), h('div', 'body', o.head));
    add(right, capRow, todayChart(ctx));
    return frame(ctx, right);
  },
};

/* ------------------------------------------------------------ 17. Hours -- */

export const fcHours = {
  id: 'fc-hours',
  name: 'Forecast · Hours',
  blurb: 'The next 18 hours as six 3-hourly columns — time, sky, temperature, rain — the '
       + 'row every weather app has. Stat tiles, no plotted marks.',
  render(ctx) {
    if (!ctx.forecast.rows.length) return frame(ctx, noForecast());
    const right = h('div', 'col'); right.style.cssText = 'gap:8px;';
    add(right, h('div', 'cap', 'Next hours'));
    const row = h('div', 'row'); row.style.cssText = 'align-items:stretch;';
    const start = hourStart(ctx.nowMs) + HOUR;
    for (let i = 0; i < 6; i++) {
      const t = start + i * 3 * HOUR;
      const block = ctx.forecast.between(t, t + 3 * HOUR);
      if (!block.length) break;
      const at = block[0];
      const { kind: k, night } = blockKind(block);
      const mm = block.reduce((s, r) => s + r.mm, 0);
      if (i) { const sep = h('div', 'rule-v'); sep.style.cssText = 'margin:0 0;'; add(row, sep); }
      const col = h('div', 'col grow'); col.style.cssText = 'align-items:center;gap:4px;';
      add(col, h('div', 'cap tnum', hh(t)), iconEl(k, { size: 48, night }),
        h('div', 'val tnum', deg(at.temp)),
        (() => { const m = h('div', 'small tnum', mmTxt(mm) || ' '); m.style.cssText = 'min-height:19px;'; return m; })());
      add(row, col);
    }
    add(right, row);
    return frame(ctx, right);
  },
};

/* ------------------------------------------------------------ 18. Parts -- */

export const fcParts = {
  id: 'fc-parts',
  name: 'Forecast · Parts',
  blurb: 'The next three parts of the day — say Evening, Tonight, Morning — as tiles with '
       + 'the temperature that matters for each: the low for the night, the high otherwise.',
  render(ctx) {
    if (!ctx.forecast.rows.length) return frame(ctx, noForecast());
    const right = h('div', 'row'); right.style.cssText = 'align-items:stretch;padding-top:0;';
    dayParts(ctx.forecast, ctx.nowMs, 3).forEach((part, i) => {
      if (i) { const sep = h('div', 'rule-v'); sep.style.cssText = 'margin:0 16px;'; add(right, sep); }
      const tile = h('div', 'col grow'); tile.style.cssText = 'gap:8px;';
      const fig = h('div', 'row'); fig.style.cssText = 'gap:8px;';
      add(fig, iconEl(part.kind, { size: 48, night: part.night }), h('div', 'val tnum', deg(part.temp)));
      add(tile, h('div', 'cap', part.label), fig,
        h('div', 'small', part.pick === 'min' ? 'low' : 'high'),
        h('div', 'small', mmTxt(part.mm) ? `rain ${mmTxt(part.mm)}` : 'dry'));
      add(right, tile);
    });
    return frame(ctx, right);
  },
};

/* ------------------------------------------------------------ 19. Words -- */

const SKY = { clear: 'Sunny', partly: 'Some sun', cloudy: 'Cloudy', fog: 'Fog', showers: 'Showers',
              rain: 'Rain', snow: 'Snow', sleet: 'Sleet', thunder: 'Thunder' };

export const fcWords = {
  id: 'fc-words',
  name: 'Forecast · Words',
  blurb: 'No marks at all: the one change in the next 12 hours as a sentence — “Rain until '
       + '22:00”, “Dry, sunny” — with the detail under it and tomorrow on one line.',
  render(ctx) {
    if (!ctx.forecast.rows.length) return frame(ctx, noForecast());
    const o = outlook(ctx.forecast, ctx.nowMs);
    const first = ctx.forecast.at(ctx.nowMs);
    const right = h('div', 'col'); right.style.cssText = 'gap:6px;';
    const headRow = h('div', 'row'); headRow.style.cssText = 'gap:12px;padding-top:4px;';
    add(headRow, iconEl(o.rows?.length ? blockKind(o.rows.slice(0, 3)).kind : kind(first?.sym),
                        { size: 48, night: first?.night }),
      (() => { const t = h('div', 'val', o.head); t.style.cssText = 'font-size:32px;'; return t; })());
    const sub = h('div', 'small', o.sub);
    sub.style.cssText = 'max-width:430px;';
    add(right, h('div', 'cap', 'Next 12 hours'), headRow, sub);
    const tm = tomorrow(ctx.forecast, ctx.nowMs);
    if (tm) {
      const rule = h('div', 'rule'); rule.style.cssText = 'margin:8px 0 4px;';
      const tr = h('div', 'row'); tr.style.cssText = 'gap:10px;';
      add(tr, h('div', 'cap', 'Tomorrow'), iconEl(tm.kind, { size: 24 }),
        h('div', 'body tnum', `${SKY[tm.kind]} · ${t0(tm.min)}–${t0(tm.max)}°${mmTxt(tm.mm) ? ` · rain ${mmTxt(tm.mm)}` : ''}`));
      add(right, rule, tr);
    }
    return frame(ctx, right);
  },
};

export const FORECAST_DESIGNS = [fcToday, fcHours, fcParts, fcWords];
