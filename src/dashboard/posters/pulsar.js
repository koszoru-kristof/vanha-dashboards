/**
 * Pulsar — the week ahead as a ridgeline plot, after the pulsar plot on the
 * Unknown Pleasures sleeve. One white line per day, stacked back to front,
 * each the day's hourly temperature on the same scale, each hiding the ones
 * behind it. Rain, sleet or snow make the line tremble, as much as falls. At
 * the front, a red ridge: today's electricity price, hour by hour.
 *
 * Calm, dry days draw as smooth hills; a storm shakes its line. The same
 * scale for every day means a cold snap sinks the whole range.
 */
import { frame, facts, text, INK, SANS, num, int, pad2, euro, dayStart, HOUR, rng, SIZE } from './common.js';

const X0 = 70;
let W = 480, X1 = 404;                    // set per render: the ridges run to 76 px short of the edge
const P = INK.paper;

/* One ridge: [x, y] at `step` samples per hour, with seeded tremor where it rains. */
function ridge(rows, base, T, k, seed) {
  const R = rng(seed);
  const pts = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], next = rows[i + 1] ?? r;
    for (let s = 0; s < 4; s++) {
      const u = s / 4, h = r.h + u;
      const temp = r.temp + (next.temp - r.temp) * u;
      const mm = r.mm ?? 0;
      const shake = mm > 0 ? Math.min(30, 9 * Math.sqrt(mm)) * (R() - 0.25) : 0;
      pts.push([X0 + (h / 24) * (X1 - X0), base - (temp - T) * k - Math.max(0, shake)]);
      if (i === rows.length - 1) break;
    }
  }
  return pts;
}
const pathOf = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');

function render(ctx, orient = 'portrait') {
  [W] = SIZE[orient];
  X1 = W - 76;
  const H = SIZE[orient][1];
  const u = W / 480;
  const f = facts(ctx);
  const d0 = dayStart(f.now);
  // the days: today from observations then forecast, the rest from the forecast
  const days = [];
  for (let k = 0; k < 7; k++) {
    const a = d0 + k * 24 * HOUR, b = a + 24 * HOUR;
    let rows = f.fc.between(a, b).map((r) => ({ h: (r.t - a) / HOUR, temp: r.temp, mm: r.mm }));
    if (k === 0) {
      const seen = f.obs.filter((r) => r.t >= a && r.t <= f.now && r.t2m != null && new Date(r.t).getMinutes() === 0)
        .map((r) => ({ h: (r.t - a) / HOUR, temp: r.t2m, mm: 0 }));
      rows = [...seen, ...rows.filter((r) => r.h > (f.now - a) / HOUR)];
    }
    rows = rows.filter((r) => Number.isFinite(r.temp)).sort((x, y) => x.h - y.h);
    if (rows.length >= (k === 0 ? 2 : 18)) days.push({ k, t: a, rows });
  }
  let s = `<rect width="${W}" height="${H}" fill="${INK.black}"/>`;
  if (days.length) {
    const all = days.flatMap((d) => d.rows.map((r) => r.temp));
    const lo = Math.min(...all), hi = Math.max(...all);
    const k = Math.min(10 * u, 120 * u / Math.max(4, hi - lo));
    const gap = 58, front = 628;
    // back to front: each ridge filled black below its line, so it hides the ones behind
    let labels = '';
    const left = [], right = [];
    const halo = ` stroke="${INK.black}" stroke-width="4" paint-order="stroke"`;
    for (const d of [...days].reverse()) {
      const base = front - d.k * gap;
      const pts = ridge(d.rows, base, lo, k, 7 + d.k * 31);
      const fill = `${pathOf(pts)}L${pts.at(-1)[0].toFixed(1)},${base + 40}L${pts[0][0].toFixed(1)},${base + 40}Z`;
      s += `<path d="${fill}" fill="${INK.black}"/><path d="${pathOf(pts)}" fill="none" stroke="${P}" stroke-width="${d.k ? 1.6 : 2.4}" stroke-linejoin="round"/>`;
      // labels sit on the line itself, at its ends, so a warm day's raised line keeps its name
      const temps = d.rows.map((r) => r.temp);
      const day = d.k === 0 ? 'TODAY' : new Date(d.t).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
      const yl = d.k === 0 ? base - (d.rows[0].temp - lo) * k : pts[0][1];
      left.push({ y: yl, s: day });
      right.push({ y: pts.at(-1)[1], s: `${int(Math.max(...temps))}° ${int(Math.min(...temps))}°` });
      if (d.k === 0 && Number.isFinite(f.temp)) {
        const x = X0 + ((f.now - d0) / (24 * HOUR)) * (X1 - X0);
        labels += `<circle cx="${x.toFixed(1)}" cy="${(base - (f.temp - lo) * k).toFixed(1)}" r="5" fill="${P}"/>`;
      }
    }
    // where two lines end close together, their labels step apart
    const spread = (ls) => { ls.sort((a, b) => a.y - b.y); for (let i = 1; i < ls.length; i++) ls[i].y = Math.max(ls[i].y, ls[i - 1].y + 13); return ls; };
    for (const l of spread(left)) labels += text(X0 - 8, l.y + 4, l.s, { size: 11, weight: 650, ls: 1, fill: P, anchor: 'end', extra: halo });
    for (const l of spread(right)) labels += text(X1 + 8, l.y + 4, l.s, { size: 11, weight: 500, fill: P, extra: halo });
    s += labels;
  }

  // the front ridge: today's price, in red
  const ps = f.today.filter((p) => p.price != null);
  const pb = 732;
  if (ps.length > 1) {
    const plo = Math.min(0, ...ps.map((p) => p.price)), phi = Math.max(10, ...ps.map((p) => p.price));
    const kp = 84 * u / (phi - plo);
    const pts = ps.map((p) => [X0 + ((p.hour + 0.5) / 24) * (X1 - X0), pb - (p.price - plo) * kp]);
    s += `<path d="${pathOf(pts)}L${pts.at(-1)[0]},${pb + 30}L${pts[0][0]},${pb + 30}Z" fill="${INK.black}"/>`
       + `<path d="${pathOf(pts)}" fill="none" stroke="${INK.red}" stroke-width="2.4" stroke-linejoin="round"/>`;
    const cur = ps.find((p) => p.hour === f.hour);
    if (cur) s += `<circle cx="${(X0 + ((cur.hour + 0.5) / 24) * (X1 - X0)).toFixed(1)}" cy="${(pb - (cur.price - plo) * kp).toFixed(1)}" r="5" fill="${INK.red}"/>`;
    const pk = ps.reduce((a, b) => (b.price > a.price ? b : a));
    s += text(X0 - 8, pts[0][1] + 4, 'PRICE', { size: 11, weight: 650, ls: 1, fill: INK.red, anchor: 'end' })
       + text(X1 + 8, pts.at(-1)[1] + 4, `${num(pk.price, 1)} c ${pad2(pk.hour)}`, { size: 11, weight: 500, fill: INK.red });
  }
  for (const h of [0, 6, 12, 18, 24]) {
    s += text(X0 + (h / 24) * (X1 - X0), pb + 30, pad2(h), { size: 11, weight: 500, fill: P, anchor: 'middle' });
  }
  s += text(24, 776, 'White: hourly temperature, one line a day, one scale. Tremor: rain.', { size: 11.5, weight: 400, fill: P })
     + text(24, 791, `Red: today’s price, c/kWh. Now ${num(f.price, 2)} c. FMI ${f.station.id} · Nord Pool FI.`, { size: 11.5, weight: 400, fill: P });
  const head = text(24, 42, `SEVEN DAYS · ${f.place.toUpperCase()}`, { size: 12, weight: 600, ls: 3, fill: P })
     + text(W - 24, 42, `${f.weekday.slice(0, 3).toUpperCase()} ${f.dayMonth.toUpperCase()} · ${f.time}`, { size: 12, weight: 500, ls: 1.5, fill: P, anchor: 'end' })
     + text(20, 118, `${num(f.temp)}°`, { size: 70 * u, weight: 300, ls: -1.5, fill: P })
     + text(W - 24, 92, f.out.head, { size: 17, weight: 600, fill: P, anchor: 'end' })
     + text(W - 24, 114, f.sauna.cost != null ? `${f.sauna.line} · ${euro(f.sauna.cost)}` : f.sauna.line, { size: 14, weight: 400, fill: P, anchor: 'end' });
  s += head;
  return frame(orient, s, { bg: INK.black });
}

export const pulsarP = {
  id: 'pz-pulsar-p', orient: 'portrait', name: 'Pulsar · portrait',
  blurb: 'The week ahead as a ridgeline, after the Unknown Pleasures sleeve: one line a day, each '
       + 'its hourly temperature on one shared scale, stacked so each hides the one behind; rain '
       + 'makes a line tremble. At the front, a red ridge is today’s price.',
  render, tall: true,
};
