/**
 * Blueprint — the day as an engineering drawing, white line on cyanotype blue.
 *
 * Elevation A is the temperature through the day, section B is the price,
 * hatched below its profile like cut ground. A dash-dot centre line marks
 * now; leader notes give the readings, a dimension line gives the peak, and a
 * match line at midnight points to tomorrow when the sauna window lies there.
 * The title block carries the sources and the revision time; the notes carry
 * the outlook, with the one thing that changes today in a yellow revision
 * cloud. Three inks: blue ground, paper line, one yellow mark-up.
 */
import { frame, facts, text, INK, MONO, num, pad2, hm, euro, dayStart, HOUR, uid, smooth } from './common.js';

const W = 800, H = 480;
const P = INK.paper, Y = INK.yellow;
const t = (x, y, s, o = {}) => text(x, y, s, { family: MONO, size: 11.5, weight: 500, fill: P, ...o });
const line = (x1, y1, x2, y2, w = 1, extra = '') =>
  `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${P}" stroke-width="${w}"${extra}/>`;
const arrow = (x, y, dir) => {           // a filled drafting arrowhead pointing `dir` (up/down/right)
  const a = { up: [[0, 0], [-3, 9], [3, 9]], down: [[0, 0], [-3, -9], [3, -9]], right: [[0, 0], [-9, -3], [-9, 3]] }[dir];
  return `<polygon points="${a.map(([dx, dy]) => `${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`).join(' ')}" fill="${P}"/>`;
};
/* A leader note: dot on the feature, a line up to a shoulder, the note above it. */
function leader(x, y, tx, ty, note, anchor = 'start') {
  const sx = anchor === 'start' ? tx + 4 + note.length * 6.9 : tx - 4 - note.length * 6.9;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="${P}"/>` + line(x, y, tx, ty) + line(tx, ty, sx, ty)
    + t(anchor === 'start' ? tx + 4 : tx - 4, ty - 5, note, { anchor, weight: 600 });
}
/* A revision cloud: scallops along a rectangle. */
function cloud(x, y, w, h, r = 7) {
  let d = `M${x},${y}`;
  const edge = (x0, y0, x1, y1) => {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / (r * 2)));
    for (let i = 1; i <= n; i++) d += ` A${r},${r} 0 0 1 ${(x0 + ((x1 - x0) * i) / n).toFixed(1)},${(y0 + ((y1 - y0) * i) / n).toFixed(1)}`;
  };
  edge(x, y, x + w, y); edge(x + w, y, x + w, y + h); edge(x + w, y + h, x, y + h); edge(x, y + h, x, y);
  return `<path d="${d}" fill="none" stroke="${Y}" stroke-width="2"/>`;
}

function render(ctx) {
  const f = facts(ctx);
  const d0 = dayStart(f.now);
  const X0 = 64, X1 = 752;
  const X = (ms) => X0 + ((ms - d0) / (24 * HOUR)) * (X1 - X0);
  const xh = (h) => X0 + (h / 24) * (X1 - X0);
  const hatch = uid('bh');
  let s = `<defs><pattern id="${hatch}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`
        + `<line x1="0" y1="0" x2="0" y2="7" stroke="${P}" stroke-width="1"/></pattern></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${INK.blue}"/>`;

  // sheet: borders, zone marks
  s += `<rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="${P}" stroke-width="1.6"/>`
     + `<rect x="22" y="22" width="${W - 44}" height="${H - 44}" fill="none" stroke="${P}" stroke-width="1"/>`;
  for (let i = 0; i < 8; i++) {
    const cx = 22 + ((i + 0.5) * (W - 44)) / 8;
    s += t(cx, 19, String(i + 1), { size: 10, anchor: 'middle' }) + t(cx, H - 11, String(i + 1), { size: 10, anchor: 'middle' });
    if (i) s += line(22 + (i * (W - 44)) / 8, 8, 22 + (i * (W - 44)) / 8, 22) + line(22 + (i * (W - 44)) / 8, H - 22, 22 + (i * (W - 44)) / 8, H - 8);
  }
  'ABCD'.split('').forEach((c, i) => {
    const cy = 22 + ((i + 0.5) * (H - 44)) / 4;
    s += t(15, cy + 4, c, { size: 10, anchor: 'middle' }) + t(W - 15, cy + 4, c, { size: 10, anchor: 'middle' });
    if (i) s += line(8, 22 + (i * (H - 44)) / 4, 22, 22 + (i * (H - 44)) / 4) + line(W - 22, 22 + (i * (H - 44)) / 4, W - 8, 22 + (i * (H - 44)) / 4);
  });

  // time axis, shared by both views
  const AX = 344;
  s += line(X0, AX, X1, AX, 1);
  for (let h = 0; h <= 24; h++) {
    s += line(xh(h), AX, xh(h), AX + (h % 3 ? 3 : 6));
    if (h % 3 === 0) s += t(xh(h), AX + 17, pad2(h % 24 === 0 && h ? 24 : h), { size: 10.5, anchor: 'middle' });
  }

  // ELEVATION A — temperature, observed then forecast, today
  const obs = f.obs.filter((r) => r.t >= d0 && r.t <= f.now && r.t2m != null).map((r) => [r.t, r.t2m]);
  const ahead = f.fc.between(f.now, d0 + 24 * HOUR).map((r) => [r.t, r.temp]);
  const temps = [...obs, ...ahead].filter(([, v]) => Number.isFinite(v));
  const A = { top: 66, bot: 150 };
  if (temps.length > 1) {
    const vs = temps.map(([, v]) => v);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (hi - lo < 6) { const m = (hi + lo) / 2; lo = m - 3; hi = m + 3; }
    const TY = (v) => A.bot - ((v - lo) / (hi - lo)) * (A.bot - A.top);
    // grid every 2 °C, dotted
    for (let g = Math.ceil(lo / 2) * 2; g <= hi; g += 2) {
      s += line(X0, TY(g), X1, TY(g), 0.6, ' stroke-dasharray="1 4"') + t(X0 - 6, TY(g) + 4, num(g, 0), { size: 10, anchor: 'end' });
    }
    s += `<path d="${smooth(temps.map(([tm, v]) => [X(tm), TY(v)]))}" fill="none" stroke="${P}" stroke-width="2.2"/>`;
    const tNow = Number.isFinite(f.temp) ? f.temp : temps.find(([tm]) => tm >= f.now)?.[1];
    const nx = X(f.now);
    const right = nx < 520;
    s += leader(nx, TY(tNow), nx + (right ? 36 : -36), A.top - 12, `${num(tNow)} °C AT ${f.time}`, right ? 'start' : 'end');
    const mx = temps.reduce((a, b) => (b[1] > a[1] ? b : a)), mn = temps.reduce((a, b) => (b[1] < a[1] ? b : a));
    const lx = (x) => Math.min(X1 - 30, Math.max(X0 + 34, x));
    const clear = (x) => Math.abs(x - nx) > 80;     // the reading's leader owns the space around now
    // under the peak, since the leader notes live above the view
    if (clear(X(mx[0]))) s += t(lx(X(mx[0])), TY(mx[1]) + 16, `MAX ${num(mx[1])}`, { size: 10, anchor: 'middle' });
    if (clear(X(mn[0]))) s += t(lx(X(mn[0])), TY(mn[1]) + 16, `MIN ${num(mn[1])}`, { size: 10, anchor: 'middle' });
  }
  s += t(X0, 44, 'ELEVATION A — TEMPERATURE, °C', { size: 12, weight: 700 }) + line(X0, 48, X0 + 214, 48, 1);

  // SECTION B — price, hatched below its profile
  const B = { top: 208, base: 330 };
  const ps = f.today;
  if (ps.some((p) => p.price != null)) {
    const vals = ps.filter((p) => p.price != null).map((p) => p.price);
    const hi = Math.max(10, ...vals), lo = Math.min(0, ...vals);
    const PY = (v) => B.base - ((v - lo) / (hi - lo)) * (B.base - B.top);
    let d = '';
    ps.forEach((p, i) => {
      if (p.price == null) return;
      const y = PY(p.price);
      d += `${d ? 'L' : 'M'}${xh(i).toFixed(1)},${y.toFixed(1)} L${xh(i + 1).toFixed(1)},${y.toFixed(1)} `;
    });
    const first = ps.findIndex((p) => p.price != null);
    const area = `${d} L${xh(24)},${PY(lo)} L${xh(first)},${PY(lo)} Z`;
    s += `<path d="${area}" fill="url(#${hatch})"/><path d="${d}" fill="none" stroke="${P}" stroke-width="2.2"/>`;
    if (lo < 0) s += line(X0, PY(0), X1, PY(0), 0.8, ' stroke-dasharray="6 3"') + t(X1 + 4, PY(0) + 4, '0', { size: 10 });
    // the peak as a dimension
    const pk = ps.reduce((a, b) => ((b.price ?? -1e9) > (a.price ?? -1e9) ? b : a));
    const px = xh(pk.hour + 0.5);
    const dx = pk.hour < 20 ? px + 26 : px - 26;
    s += line(px, PY(pk.price) - 3, dx + (pk.hour < 20 ? 6 : -6), PY(pk.price) - 3, 0.8)
       + line(dx, PY(lo), dx, PY(pk.price) - 3, 1) + arrow(dx, PY(pk.price) - 3, 'up') + arrow(dx, PY(lo), 'down')
       + (PY(lo) - PY(pk.price) > 96
         ? `<text transform="translate(${dx - 5} ${((PY(lo) + PY(pk.price)) / 2).toFixed(1)}) rotate(-90)" font-family='${MONO}' font-size="11" font-weight="700" fill="${P}" text-anchor="middle">${num(pk.price, 1)} C AT ${pad2(pk.hour)}</text>`
         : t(dx + (pk.hour < 20 ? 8 : -8), PY(pk.price) + 4, `${num(pk.price, 1)} C AT ${pad2(pk.hour)}`, { size: 11, weight: 700, anchor: pk.hour < 20 ? 'start' : 'end' }));
    // reading at now
    const cur = ps.find((p) => p.hour === f.hour);
    if (cur?.price != null) {
      const nx = X(f.now), right = nx < 470;
      s += leader(nx, PY(cur.price), nx + (right ? 30 : -30), B.top - 22, `${num(cur.price, 2)} C/KWH NOW`, right ? 'start' : 'end');
    }
    // the sauna window: a detail circle today, or a match line to tomorrow
    const S = f.sauna;
    if (S.start != null && !S.tomorrow) {
      const h0 = new Date(S.start).getHours();
      const cx = xh(h0 + 1), cy = PY(S.avg);
      s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="24" fill="none" stroke="${P}" stroke-width="1.4" stroke-dasharray="7 3"/>`
         + t(cx, cy - 30, `DETAIL C: SAUNA ${pad2(h0)}-${pad2(h0 + 2)} · ${euro(S.cost)}`.replace(' ', ' '), { size: 10.5, weight: 700, anchor: cx > 560 ? 'end' : cx < 220 ? 'start' : 'middle' });
    }
    if (S.start != null && S.tomorrow) {
      s += line(X1 + 6, B.top - 30, X1 + 6, AX, 2.4, ' stroke-dasharray="14 3 3 3"')
         + `<text transform="translate(${X1 + 17} ${(B.top + AX) / 2 - 20}) rotate(-90)" font-family='${MONO}' font-size="10" font-weight="700" fill="${P}" text-anchor="middle">MATCH LINE · SAUNA TOMORROW ${S.at}</text>`;
    }
  }
  s += t(X0, 200 - 14, 'SECTION B — PRICE, C/KWH', { size: 12, weight: 700 }) + line(X0, 190, X0 + 172, 190, 1);

  // centre line at now
  const nx = X(f.now);
  s += line(nx, 54, nx, AX + 8, 1.2, ' stroke-dasharray="16 4 3 4"')
     + t(nx, AX + 30, 'C', { size: 12, weight: 700, anchor: 'middle' }) + t(nx + 3, AX + 33, 'L', { size: 12, weight: 700, anchor: 'middle' });

  // notes, with the day's change in a revision cloud
  const notes = [
    `1. ${f.out.head.toUpperCase()}.`,
    f.out.sub ? `2. ${f.out.sub.toUpperCase().replace(/ · /g, '; ')}.` : '',
    `${f.out.sub ? 3 : 2}. LIGHT ${f.sun ? `${hm(f.sun.rise)}-${hm(f.sun.set)}` : '-'}; RH ${f.rh != null ? Math.round(f.rh) : '-'} %.`,
  ].filter(Boolean);
  s += t(36, 378, 'NOTES', { size: 11.5, weight: 700 });
  notes.forEach((n, i) => { s += t(36, 404 + i * 19 + (i ? 3 : 0), n.length > 64 ? `${n.slice(0, 63)}…` : n, { size: 10.5 }); });
  const n1 = Math.min(notes[0].length, 64) * 6.3;
  s += cloud(30, 391, n1 + 14, 18) + `<polygon points="${n1 + 64},390 ${n1 + 75},410 ${n1 + 53},410" fill="none" stroke="${Y}" stroke-width="1.6"/>`
     + text(n1 + 64, 407, '1', { family: MONO, size: 10, weight: 700, fill: Y, anchor: 'middle' });

  // title block
  const TB = { x: 486, y: 370, w: 292, h: 88 };
  s += `<rect x="${TB.x}" y="${TB.y}" width="${TB.w}" height="${TB.h}" fill="${INK.blue}" stroke="${P}" stroke-width="1.4"/>`;
  [22, 44, 66].forEach((dy) => { s += line(TB.x, TB.y + dy, TB.x + TB.w, TB.y + dy, 0.8); });
  s += line(TB.x + 206, TB.y, TB.x + 206, TB.y + TB.h, 0.8);
  const cells = [
    [`WEATHER + WATTS · ${f.place.toUpperCase()}`, 'SHEET 1/1'],
    [`DRAWING: TODAY, ${f.dateFi}`, `REV ${f.time}`],
    [`FMI ${f.station.id} · NORD POOL FI`, 'SCALE 1H:29'],
    ['C/KWH INCL. VAT 25.5 %', `${f.weekday.slice(0, 3).toUpperCase()}`],
  ];
  cells.forEach(([a, b], i) => { s += t(TB.x + 6, TB.y + 15 + i * 22, a, { size: 10.5, weight: i ? 500 : 700 }) + t(TB.x + 212, TB.y + 15 + i * 22, b, { size: 10.5 }); });
  return frame('landscape', s, { bg: INK.blue });
}

export const blueprintL = {
  id: 'pz-blueprint-l', orient: 'landscape', name: 'Blueprint · landscape',
  blurb: 'The day as an engineering drawing on cyanotype blue: elevation A is the temperature, '
       + 'section B the price hatched like cut ground, a dash-dot centre line at now, leader notes '
       + 'and a dimension for the readings, a match line to tomorrow, the sources in the title '
       + 'block and the day’s one change in a yellow revision cloud.',
  render,
};
