/**
 * Isotype — the day counted in pictograms, after Otto Neurath and Gerd
 * Arntz: every symbol is a fixed quantity, repeated, never scaled; a part is
 * a symbol cut short. Twenty-four suns and moons for the hours of light and
 * dark, drops for millimetres of rain, arrows for wind, bolts for the price,
 * coins for a sauna now against a sauna at the best time. Black on paper,
 * with red for now and for the recommendation. Set in Jost, a Futura, which
 * is what Isotype was set in.
 */
import { frame, facts, text, INK, num, pad2, hm, euro, HOUR, dayStart, uid, SIZE } from './common.js';

/* Set per render: the sheet's width, and the symbol scale (1 in portrait; the tall sheet
   sets every symbol a size up, so twelve still fill a row edge to edge). */
let W = 480, U = 1;
/* 32x32 pictograms, solid */
const ICON = {
  sun: `<circle cx="16" cy="16" r="7.2"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) =>
    `<polygon points="16,1.2 18.2,6.4 13.8,6.4" transform="rotate(${a} 16 16)"/>`).join('')}`,
  moon: '<path d="M20.5,3.5 A12.5,12.5 0 1 0 28.5,22 A10,10 0 0 1 20.5,3.5 Z"/>',
  drop: '<path d="M16,2.5 C16,2.5 6.5,14.5 6.5,20.2 A9.5,9.5 0 0 0 25.5,20.2 C25.5,14.5 16,2.5 16,2.5 Z"/>',
  flake: `${[0, 60, 120].map((a) => `<rect x="14.4" y="2" width="3.2" height="28" transform="rotate(${a} 16 16)"/>`).join('')}<circle cx="16" cy="16" r="4"/>`,
  arrow: '<path d="M2,12.5 H18 V6 L30,16 L18,26 V19.5 H2 Z"/>',
  bolt: '<path d="M19,1.5 L6.5,18 H14.5 L11,30.5 L25.5,12.5 H17.5 L21.5,1.5 Z"/>',
  coin: '<circle cx="16" cy="16" r="13"/><circle cx="16" cy="16" r="9" fill="none" stroke="#f3f0e8" stroke-width="2"/>',
};

/* A row of `n` symbols (a fraction cuts the last one), wrapping at `per`. */
function count(kind, n, x, y, { size: size0 = 26, pitch: pitch0 = 33, per = 12, fill = INK.black, hollow = false } = {}) {
  const size = size0 * U, pitch = pitch0 * U;
  let s = '';
  const whole = Math.floor(n + 1e-6), part = n - whole;
  const k = size / 32;
  const put = (i, frac) => {
    const cx = x + (i % per) * pitch, cy = y + Math.floor(i / per) * (size + 8);
    const g = `<g transform="translate(${cx} ${cy}) scale(${k})" fill="${hollow ? 'none' : fill}"${hollow ? ` stroke="${fill}" stroke-width="2.2"` : ''}>${ICON[kind]}</g>`;
    if (frac >= 1) return g;
    const id = uid('iso');
    return `<clipPath id="${id}"><rect x="${cx}" y="${cy - 2}" width="${(size * frac).toFixed(1)}" height="${size + 4}"/></clipPath><g clip-path="url(#${id})">${g}</g>`;
  };
  for (let i = 0; i < whole; i++) s += put(i, 1);
  if (part >= 0.25) s += put(whole, part);
  return { s, rows: Math.ceil((whole + (part >= 0.25 ? 1 : 0)) / per) || 1 };
}

const label = (y, head, sub) => text(48, y, head, { size: 16, weight: 600 }) + (sub ? text(W - 48, y, sub, { size: 12.5, weight: 400, anchor: 'end' }) : '');

function render(ctx, orient = 'portrait') {
  [W] = SIZE[orient];
  U = W / 480;
  const row = 26 * U + 8;                            // one row of symbols
  const f = facts(ctx);
  const d0 = dayStart(f.now);
  let s = text(48, 44, `${f.place.toUpperCase()} · ${f.weekday.toUpperCase()} ${f.dayMonth.toUpperCase()}`, { size: 12, weight: 650, ls: 2 })
        + text(44, 112, `${num(f.temp)} °C`, { size: 64 * U, weight: 700, ls: -1 })
        + text(W - 48, 86, f.out.head, { size: 17, weight: 600, anchor: 'end' })
        + text(W - 48, 108, `updated ${f.time}`, { size: 12.5, weight: 400, anchor: 'end' });
  // each block measures itself first, so the free space can be shared out between them
  const blocks = [];
  const add = (h, draw) => blocks.push({ h, draw });

  // hours of light and dark: one symbol an hour, now in red
  const light = f.dayLen != null ? `${Math.floor(f.dayLen / HOUR)} h ${pad2(Math.round((f.dayLen % HOUR) / 60e3))} min of light` : '';
  add(14 + 2 * row, (y) => {
    let o = label(y, 'The day', f.sun ? `${light}, ${hm(f.sun.rise)}–${hm(f.sun.set)}` : '');
    for (let h = 0; h < 24; h++) {
      const mid = d0 + (h + 0.5) * HOUR;
      const lit = f.sun && mid > f.sun.rise && mid < f.sun.set;
      const cx = 48 + (h % 12) * 33 * U, cy = y + 14 + Math.floor(h / 12) * row;
      o += `<g transform="translate(${cx} ${cy}) scale(${26 * U / 32})" fill="${h === f.hour ? INK.red : INK.black}">${ICON[lit ? 'sun' : 'moon']}</g>`;
    }
    return o;
  });

  // what falls in the next 12 hours: one drop (or flake) a millimetre
  const next12 = f.fc.between(f.now, f.now + 12 * HOUR);
  const mm = next12.reduce((a, r) => a + (r.mm ?? 0), 0);
  const snow = f.sky === 'snow';
  const rain = mm >= 0.1 ? count(snow ? 'flake' : 'drop', Math.min(mm, 36), 48, 0) : null;
  add(14 + (rain ? rain.rows * row : row), (y) => label(y, snow ? 'Snow, next 12 hours' : 'Rain, next 12 hours', `${num(mm, 1)} mm`)
    + (rain ? count(snow ? 'flake' : 'drop', Math.min(mm, 36), 48, y + 14).s : text(48, y + 34, 'None', { size: 15, weight: 400 })));

  // wind: one arrow for 2 m/s
  const nw = Math.min((f.wind ?? 0) / 2, 24);
  add(14 + count('arrow', nw, 48, 0).rows * row, (y) => label(y, 'Wind now', `${num(f.wind, 0)} m/s`)
    + (nw >= 0.25 ? count('arrow', nw, 48, y + 14).s : text(48, y + 34, 'Calm', { size: 15, weight: 400 })));

  // price now: one bolt for 4 c/kWh; below zero, one hollow bolt
  const neg = f.price != null && f.price < 0;
  const nb = neg ? 1 : Math.min((f.price ?? 0) / 4, 24);
  add(14 + count('bolt', nb, 48, 0).rows * row, (y) => label(y, 'Electricity now', `${num(f.price, 2)} c/kWh`)
    + count('bolt', nb, 48, y + 14, { hollow: neg }).s);

  // a sauna: coins of 20 cents, now against the recommended window
  const S = f.sauna;
  const rows = [];
  if (S.state !== 'now' && f.nowCost != null) rows.push(['Now', f.nowCost, INK.black]);
  if (S.cost != null) {
    const when = S.line.replace('Sauna ', '');
    rows.push([S.state === 'now' ? 'Now, and as good as it gets today' : `${when[0].toUpperCase()}${when.slice(1)}`, S.cost, INK.red]);
  }
  const coinRows = rows.map(([, eur]) => count('coin', Math.min(eur / 0.2, 28), 48, 0, { size: 22, pitch: 27, per: 14 }).rows);
  add(16 + rows.reduce((a, _, i) => a + 18 + coinRows[i] * (22 * U + 8) + 8, 0), (y) => {
    let o = label(y, 'A sauna, 2 hours', 'incl. transfer and tax');
    y += 16;
    rows.forEach(([who, eur, fill], i) => {
      o += text(48, y + 12, who, { size: 12.5, weight: 500, fill });
      y += 18;
      o += count('coin', Math.min(eur / 0.2, 28), 48, y, { size: 22, pitch: 27, per: 14, fill }).s
         + text(W - 48, y - 6, euro(eur), { size: 14, weight: 600, anchor: 'end', fill });
      y += coinRows[i] * (22 * U + 8) + 8;
    });
    return o;
  });

  const top = 168, bottom = 744;
  const gap = Math.max(30, Math.min(64, (bottom - top - blocks.reduce((a, b) => a + b.h, 0)) / (blocks.length - 1)));
  let y = top;
  for (const b of blocks) { s += b.draw(y); y += b.h + gap; }

  s += text(48, 772, 'Sun or moon: an hour · drop: 1 mm · arrow: 2 m/s · bolt: 4 c/kWh · coin: 20 cents', { size: 11, weight: 450 })
     + text(48, 788, `FMI open data, ${f.station.short} ${f.station.id} · Nord Pool FI via porssisahko.net, incl. VAT`, { size: 11, weight: 400 });
  return frame(orient, s);
}

export const isotypeP = {
  id: 'pz-isotype-p', orient: 'portrait', name: 'Isotype · portrait',
  blurb: 'The day counted in pictograms, after Neurath and Arntz: each symbol a fixed amount, '
       + 'repeated, never scaled — suns and moons for the hours of light and dark, drops for '
       + 'millimetres of rain, arrows for wind, bolts for the price, coins for a sauna now '
       + 'against one at the best time.',
  render, tall: true,
};
