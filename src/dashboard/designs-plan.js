/**
 * Floorplan-based e-ink layouts.
 *
 * The plan is the label: a temperature sitting inside its room needs no legend
 * and no room name spelled out, which buys back a lot of space on a small
 * panel. Every design here still prints the number, so the drawing is never
 * the only way to read a value.
 */
import plan from '../../data/floorplan.json';
import { planSVG, rampFill, hatchDefs, HATCH_STEPS } from './plan2d.js';

const TARGET = 21;          // indoor setpoint the Drift design measures against
const DEADBAND = 1.0;
const RAMP = [18, 24];      // domain of the Thermal ramp, degC

/* Rooms that actually have a sensor. Only these get a number printed on the
   plan — putting one in the kitchen would imply a sensor that does not exist. */
const ROOM_SENSOR = {
  living: 'climate.living',
  bedroom: 'climate.bedroom',
  bathroom: 'climate.bathroom',
  sauna: 'climate.sauna',
};
/* Kitchen and hall are the same open volume as the living room (no doors
   between them), and the wardrobe opens off the bedroom — so they can be
   *shaded* from those sensors even though they are not *labelled*. */
const SHARES = { kitchen: 'climate.living', hall: 'climate.living', wardrobe: 'climate.bedroom' };

const sensorFor = (id) => ROOM_SENSOR[id] ?? null;
const shadeFor = (id) => ROOM_SENSOR[id] ?? SHARES[id] ?? null;

/* Short enough to fit the room it sits in. */
const SHORT = {
  living: 'LIVING', bedroom: 'BEDROOM', kitchen: 'KITCHEN', hall: 'HALL',
  wardrobe: 'WARDROBE', bathroom: 'BATHROOM', sauna: 'SAUNA', balcony: 'BALCONY',
};

/* The living room is L-shaped, so its area centroid sits low in the notch;
   nudge the label into the part a reader thinks of as the living room. */
const NUDGE = { living: [0, -38], bathroom: [-6, 0] };

const PLAN_BOX = { w: 402, h: 446, balcony: false };

function h(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
const add = (p, ...k) => (p.append(...k), p);
const t1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const t0 = (v) => String(Math.round(v));
const panel = () => h('div', 'panel');

function sideHead(ctx, title) {
  const c = h('div', 'col');
  c.style.cssText = 'gap:2px;';
  add(c, h('div', 'cap', title));
  return c;
}

/** Swatch + caption rows, for the texture scales. */
function legend(rows) {
  const box = h('div', 'col');
  box.style.cssText = 'gap:7px;';
  for (const [fill, text] of rows) {
    const r = h('div', 'row');
    r.style.cssText = 'gap:9px;align-items:center;';
    const sw = h('div');
    sw.style.cssText = 'width:44px;height:24px;border:1px solid #000;flex:none;';
    sw.innerHTML = `<svg width="42" height="22"><rect width="42" height="22" fill="${fill}"/></svg>`;
    add(r, sw, h('div', 'small', text));
    add(box, r);
  }
  return box;
}

/** A hidden svg holding the hatch patterns the legend swatches reference. */
function patternHost(prefix) {
  const d = h('div');
  d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  d.innerHTML = `<svg><defs>${hatchDefs(prefix)}</defs></svg>`;
  return d;
}

/* -------------------------------------------------------------- 6. Plan -- */

export const planDesign = {
  id: 'plan',
  name: 'Plan',
  blurb: 'The floorplan is the layout. Each room carries its own reading, so no '
       + 'room names or legend are needed; outdoor sits beside it as the hero.',
  render(ctx) {
    const p = panel();
    const wrap = h('div', 'row');
    wrap.style.cssText = 'height:100%;align-items:stretch;';

    const svg = planSVG(plan, {
      ...PLAN_BOX, labelNudge: NUDGE,
      labelFor: (r) => {
        const s = sensorFor(r.id);
        return s ? [SHORT[r.id], `${t1(ctx.temp(s))}°`] : null;
      },
    });
    const left = h('div');
    left.style.cssText = 'padding:17px 0 17px 16px;';
    add(left, svg);

    const right = h('div', 'col grow');
    right.style.cssText = 'padding:30px 28px 22px 20px;gap:0;';
    const { min, max } = ctx.hist.range('climate.outdoor');
    add(right,
      sideHead(ctx, 'Outdoor'),
      (() => { const v = h('div', 'hero-s deg', t1(ctx.temp('climate.outdoor')));
               v.style.cssText = 'padding-top:6px;'; return v; })(),
      (() => {
        const r = h('div', 'row body');
        r.style.cssText = 'gap:14px;padding-top:12px;';
        add(r, h('div', 'tnum', `H ${t1(max)}°`), h('div', 'tnum', `L ${t1(min)}°`),
               h('div', 'tnum', `${t0(ctx.hum('climate.outdoor'))}%`));
        return r;
      })(),
      (() => {
        const r = h('div', 'row body');
        r.style.cssText = 'gap:10px;padding-top:20px;align-items:baseline;';
        add(r, h('div', 'small', 'BALCONY'), add(h('div', 'grow')),
               h('div', 'val deg tnum', t1(ctx.temp('climate.balcony'))));
        return r;
      })(),
      add(h('div', 'grow')),
      (() => { const c = h('div', 'small', 'South is at the top — every window '
                 + 'and the balcony face south.'); return c; })(),
      (() => { const c = h('div', 'small tnum', `updated ${ctx.now}`);
               c.style.cssText = 'padding-top:8px;'; return c; })());

    add(wrap, left, right);
    add(p, wrap);
    return p;
  },
};

/* ----------------------------------------------------------- 7. Thermal -- */

export const thermal = {
  id: 'thermal',
  name: 'Thermal',
  blurb: 'Rooms filled with an ordered hatch — denser is warmer. A 1-bit panel '
       + 'has no lightness to ramp, so magnitude rides line spacing instead.',
  render(ctx) {
    const p = panel();
    const wrap = h('div', 'row');
    wrap.style.cssText = 'height:100%;align-items:stretch;';

    const svg = planSVG(plan, {
      ...PLAN_BOX, labelNudge: NUDGE,
      fillFor: (r, pre) => {
        const s = shadeFor(r.id);
        return s ? rampFill(pre, ctx.temp(s), RAMP, 'up') : '#fff';
      },
      labelFor: (r) => {
        const s = sensorFor(r.id);
        return s ? [SHORT[r.id], `${t1(ctx.temp(s))}°`] : null;
      },
    });
    const left = h('div');
    left.style.cssText = 'padding:17px 0 17px 16px;';
    add(left, svg);

    const pre = 'lgT';
    const right = h('div', 'col grow');
    right.style.cssText = 'padding:28px 26px 22px 20px;gap:0;';
    const step = (RAMP[1] - RAMP[0]) / HATCH_STEPS.length;
    const rows = HATCH_STEPS.map((_, i) => [
      `url(#${pre}-up-${i})`,
      i === 0 ? `under ${RAMP[0] + step}°`
        : i === HATCH_STEPS.length - 1 ? `over ${RAMP[1] - step}°`
        : `${RAMP[0] + i * step}–${RAMP[0] + (i + 1) * step}°`,
    ]).reverse();

    add(right, patternHost(pre),
      sideHead(ctx, 'Outdoor'),
      (() => { const v = h('div', 'big deg', t1(ctx.temp('climate.outdoor')));
               v.style.cssText = 'padding:4px 0 18px;'; return v; })(),
      h('div', 'cap', 'Scale'),
      (() => { const l = legend(rows); l.style.cssText = 'gap:7px;padding-top:10px;'; return l; })(),
      add(h('div', 'grow')),
      (() => { const c = h('div', 'small tnum', `updated ${ctx.now}`); return c; })());

    add(wrap, left, right);
    add(p, wrap);
    return p;
  },
};

/* ------------------------------------------------------------- 8. Drift -- */

export const drift = {
  id: 'drift',
  name: 'Drift',
  blurb: `Deviation from a ${TARGET} °C setpoint rather than absolute temperature. `
       + 'Hatch direction carries the sign, blank means within band — so "which '
       + 'rooms need attention" is answerable without reading a digit.',
  render(ctx) {
    const p = panel();
    const wrap = h('div', 'row');
    wrap.style.cssText = 'height:100%;align-items:stretch;';

    const delta = (id) => ctx.temp(id) - TARGET;
    const svg = planSVG(plan, {
      ...PLAN_BOX, labelNudge: NUDGE,
      // One density, two directions: the angle carries the sign and the printed
      // number carries the magnitude. Varying both at once made neither read.
      fillFor: (r, pre) => {
        const s = shadeFor(r.id);
        if (!s) return '#fff';
        const d = delta(s);
        if (Math.abs(d) <= DEADBAND) return '#fff';
        return `url(#${pre}-${d > 0 ? 'up' : 'dn'}-2)`;
      },
      labelFor: (r) => {
        const s = sensorFor(r.id);
        if (!s) return null;
        const d = delta(s);
        const sign = d > 0 ? '+' : d < 0 ? '−' : '±';
        return [SHORT[r.id], `${sign}${t1(Math.abs(d))}`];
      },
    });
    const left = h('div');
    left.style.cssText = 'padding:17px 0 17px 16px;';
    add(left, svg);

    const pre = 'lgD';
    const right = h('div', 'col grow');
    right.style.cssText = 'padding:28px 26px 22px 20px;gap:0;';
    add(right, patternHost(pre),
      sideHead(ctx, `Target ${TARGET}°`),
      (() => {
        const off = Object.values(ROOM_SENSOR)
          .filter((s) => Math.abs(delta(s)) > DEADBAND).length;
        const v = h('div', 'big', String(off));
        v.style.cssText = 'padding:6px 0 0;';
        return v;
      })(),
      (() => {
        const off = Object.values(ROOM_SENSOR)
          .filter((s) => Math.abs(delta(s)) > DEADBAND).length;
        return h('div', 'body', `${off === 1 ? 'room' : 'rooms'} outside band`);
      })(),
      (() => { const c = h('div', 'cap'); c.textContent = 'Key';
               c.style.cssText = 'padding-top:24px;'; return c; })(),
      (() => {
        const l = legend([
          [`url(#${pre}-up-2)`, `above ${TARGET + DEADBAND}°`],
          ['#fff', `within ±${DEADBAND}°`],
          [`url(#${pre}-dn-2)`, `below ${TARGET - DEADBAND}°`],
        ]);
        l.style.cssText = 'gap:7px;padding-top:10px;';
        return l;
      })(),
      add(h('div', 'grow')),
      (() => { const c = h('div', 'small tnum',
                 `outdoor ${t1(ctx.temp('climate.outdoor'))}°  ·  ${ctx.now}`); return c; })());

    add(wrap, left, right);
    add(p, wrap);
    return p;
  },
};

/* ------------------------------------------------------------- 9. Atlas -- */

export const atlas = {
  id: 'atlas',
  name: 'Atlas',
  blurb: 'Small plan as an orientation key beside a precise value column. '
       + 'The plan answers "where", the list answers "exactly what".',
  render(ctx) {
    const p = panel();
    const wrap = h('div', 'row');
    wrap.style.cssText = 'height:100%;align-items:stretch;';

    const left = h('div', 'col');
    left.style.cssText = 'width:404px;padding:26px 18px 20px 30px;';
    const topRow = h('div', 'row');
    topRow.style.cssText = 'align-items:baseline;gap:12px;padding-bottom:10px;';
    add(topRow, h('div', 'cap', 'Outdoor'), add(h('div', 'grow')),
                h('div', 'cap tnum', ctx.now));
    const heroRow = h('div', 'row');
    heroRow.style.cssText = 'align-items:flex-end;gap:16px;';
    const { min, max } = ctx.hist.range('climate.outdoor');
    add(heroRow,
      h('div', 'hero-s deg', t1(ctx.temp('climate.outdoor'))),
      (() => { const c = h('div', 'col'); c.style.cssText = 'gap:4px;padding-bottom:12px;';
               add(c, h('div', 'small tnum', `H ${t1(max)}°`),
                      h('div', 'small tnum', `L ${t1(min)}°`),
                      h('div', 'small tnum', `${t0(ctx.hum('climate.outdoor'))}%`));
               return c; })());
    add(left, topRow, heroRow);

    const rule = h('div', 'rule');
    rule.style.cssText = 'margin:18px 0 4px;';
    add(left, rule);

    const list = h('div', 'col grow');
    list.style.cssText = 'justify-content:space-evenly;';
    for (const r of ctx.rooms) {
      const row = h('div', 'row');
      row.style.cssText = 'align-items:baseline;';
      add(row, h('div', 'body', r.label), h('div', 'leader'),
               h('div', 'small tnum', `${t0(ctx.hum(r.id))}%`),
               (() => { const v = h('div', 'val deg tnum', t1(ctx.temp(r.id)));
                        v.style.cssText = 'min-width:96px;text-align:right;'; return v; })());
      add(list, row);
    }
    add(left, list);

    const divider = h('div', 'rule-v');

    const right = h('div', 'col grow');
    right.style.cssText = 'padding:26px 22px 20px;align-items:center;';
    add(right, (() => { const c = h('div', 'cap', 'Plan');
                        c.style.cssText = 'align-self:flex-start;'; return c; })());
    // Names only: the column beside it already carries every value, and
    // repeating them on the plan is what made the labels collide with walls.
    const svg = planSVG(plan, {
      w: 330, h: 384, balcony: false, labelNudge: NUDGE,
      labelFor: (r) => [SHORT[r.id]],
    });
    svg.style.cssText = 'margin-top:4px;';
    add(right, svg);

    add(wrap, left, divider, right);
    add(p, wrap);
    return p;
  },
};

export const PLAN_DESIGNS = [planDesign, thermal, drift, atlas];
