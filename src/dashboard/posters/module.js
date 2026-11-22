/**
 * Module — after the Mode + Module poster: an ochre sheet (the yellow ink
 * standing in for kraft), three figures stacked in a drawn modular face,
 * thin red geometry laid across them and small print framing it all.
 *
 * The geometry is data: the red line is today's price, hour by hour; the ring
 * is the day's clock with daylight drawn heavy and a dot at now. The stacked
 * figures are the three answers — outdoor temperature, the price now, when
 * to run the sauna — each captioned like a form field.
 */
import { frame, facts, text, measure, INK, num, pad2, hm, euro } from './common.js';
import { modText, modWidth } from './modfont.js';

const W = 480, H = 800;
const PAPER = INK.paper, RED = INK.red, BLACK = INK.black;

/* A small-print block: a bullet (dot or pill), then up to three lines,
   the texts word-wrapped to `width`; the first line is set a little bolder. */
function block(x, y, texts, bullet = 'dot', width = 120) {
  const b = bullet === 'dot'
    ? `<circle cx="${x + 5}" cy="${y - 4}" r="4.5" fill="${BLACK}"/>`
    : `<rect x="${x}" y="${y - 10}" width="24" height="12" rx="6" fill="${BLACK}"/>`;
  const tx = x + (bullet === 'dot' ? 16 : 32);
  const lines = [];
  for (const t of texts.filter(Boolean)) {
    let cur = '';
    for (const w of t.split(' ')) {
      const next = cur ? `${cur} ${w}` : w;
      if (cur && measure(next, { size: 12, weight: lines.length ? 450 : 600 }).w > width) { lines.push(cur); cur = w; }
      else cur = next;
    }
    lines.push(cur);
  }
  return b + lines.slice(0, 3).map((l, i) => text(tx, y + i * 15, l, { size: 12, weight: i ? 450 : 600 })).join('');
}

/* Douglas–Peucker: keep the turning points of a line, drop the rest. */
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts.at(-1)];
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const d = Math.abs((b[1] - a[1]) * x - (b[0] - a[0]) * y + b[0] * a[1] - b[1] * a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d > fd) { fd = d; far = i; }
  }
  return fd <= tol ? [a, b] : [...simplify(pts.slice(0, far + 1), tol).slice(0, -1), ...simplify(pts.slice(far), tol)];
}

function render(ctx) {
  const f = facts(ctx);
  let s = `<rect width="${W}" height="${H}" fill="${INK.yellow}"/>`;

  // the price as its turning points: a few straight red strokes across the sheet
  const ps = f.today.filter((p) => p.price != null);
  if (ps.length > 1) {
    const hi = Math.max(10, ...ps.map((p) => p.price)), lo = Math.min(0, ...ps.map((p) => p.price));
    const k = 330 / (hi - lo);
    const X = (h) => 24 + (h / 23) * (W - 48);
    const Y = (p) => 700 - (p - lo) * k;           // the lowest hour sits on the foot line
    const line = simplify(ps.map((p) => [X(p.hour), Y(p.price)]), 9);
    s += `<polyline points="${line.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="none" stroke="${RED}" stroke-width="3" stroke-linejoin="round"/>`;
    const cur = ps.find((p) => p.hour === f.hour);
    if (cur) s += `<rect x="${X(cur.hour) - 6}" y="${Y(cur.price) - 6}" width="12" height="12" fill="${RED}"/>`;
  }

  // the day's clock: a thin ring, daylight heavy, a dot at now (noon at the top, like the sun)
  const cx = 342, cy = 596, r = 96;
  const ang = (t) => ((new Date(t).getHours() + new Date(t).getMinutes() / 60) / 24) * 2 * Math.PI + Math.PI / 2;
  const pt = (a, rr = r) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${RED}" stroke-width="3"/>`;
  if (f.sun) {
    const a0 = ang(f.sun.rise), a1 = ang(f.sun.set);
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    s += `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}" fill="none" stroke="${RED}" stroke-width="11"/>`;
  }
  const [nx, ny] = pt(ang(f.now));
  s += `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="10" fill="${RED}"/>`;

  // three stacked figures, each with its field caption
  const S = f.sauna;
  const saunaTime = S.state === 'now' ? `${pad2(f.hour)}:00` : S.at;
  const rows = [
    ['OUTDOOR · °C', `${num(f.temp)}°`],
    ['C/KWH · NOW', num(f.price, 2)],
    ...(saunaTime ? [[`${S.state === 'now' ? 'SAUNA · NOW' : S.tomorrow ? 'SAUNA · TOMORROW' : S.state === 'later' ? 'SAUNA · LEAST BAD' : 'SAUNA · TODAY'}`
      + `${S.cost != null ? ` · ≈ ${euro(S.cost).toUpperCase()}` : ''}`, saunaTime]] : []),
  ];
  const gh = 94;
  rows.forEach(([cap, val], i) => {
    const y = 128 + i * 140;
    const h = Math.min(gh, ((W - 44) / modWidth(val, 10)) * 10);
    s += text(26, y - 10, cap, { size: 12, weight: 650, ls: 1.6,
      extra: ` stroke="${INK.yellow}" stroke-width="6" stroke-linejoin="round" paint-order="stroke"` });
    s += modText(val, { x: 22, y, h, color: PAPER });
  });
  // small print, top and bottom
  s += block(24, 40, [`${f.place}, ${f.city}`, `FMI station ${f.station.id}`, `Updated ${f.time}`], 'dot', 118)
     + block(166, 40, [`${f.weekday.slice(0, 3)} ${f.dayMonth}`, f.rh != null ? `RH ${Math.round(f.rh)} % · ${num(f.wind, 0)} m/s` : '', f.range ? `Today ${num(f.range.min)} to ${num(f.range.max)}°` : ''], 'pill', 116)
     + block(322, 40, [f.out.head, f.out.sub?.split(' · ')[0]], 'pill', 124);
  const st = f.stats;
  s += block(24, 730, [st ? `High ${num(st.max.price, 1)} c at ${pad2(st.max.hour)}` : 'No prices', st ? `Low ${num(st.min.price, 1)} c at ${pad2(st.min.hour)}` : '', 'c/kWh incl. VAT'], 'dot', 118)
     + block(166, 730, [f.sun ? `Light ${hm(f.sun.rise)}–${hm(f.sun.set)}` : 'Light –', `Sauna 2 h, ${num(f.kwh, 1)} kWh`, 'incl. transfer, tax'], 'pill', 116);
  s += text(456, 786, 'Weather + Watts', { size: 21, weight: 600, fill: PAPER, anchor: 'end' });
  return frame('portrait', s);
}

export const moduleP = {
  id: 'pz-module-p', orient: 'portrait', name: 'Module · portrait',
  blurb: 'After the Mode + Module poster: ochre sheet, three figures stacked in a drawn modular '
       + 'face — outdoor, price now, sauna time — with thin red geometry that is data: the line '
       + 'is today’s price hour by hour, the ring is the day’s clock with daylight drawn heavy.',
  render,
};
