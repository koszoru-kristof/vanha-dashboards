/**
 * Punch card — the day's summary keyed onto an 80-column card, in real IBM
 * 029 Hollerith code: every column is one character of the line printed
 * along its top edge, and the holes are that character's punches. The card
 * is paper on a black ground, so the holes show black; its print — the rows'
 * digits, column numbers, the field rules — is blue. Above and below it, the
 * same facts for people.
 */
import { frame, facts, text, esc, INK, MONO, num, pad2, euro } from './common.js';

const W = 800, H = 480;
/* rows top to bottom; a character's punches are named by row */
const ROWS = [12, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const CODE = {
  ' ': [], '&': [12], '-': [11], '/': [0, 1],
  ':': [2, 8], '#': [3, 8], '@': [4, 8], "'": [5, 8], '=': [6, 8], '"': [7, 8],
  '.': [12, 3, 8], '<': [12, 4, 8], '(': [12, 5, 8], '+': [12, 6, 8], '|': [12, 7, 8],
  '!': [11, 2, 8], '$': [11, 3, 8], '*': [11, 4, 8], ')': [11, 5, 8], ';': [11, 6, 8],
  ',': [0, 3, 8], '%': [0, 4, 8], '_': [0, 5, 8], '>': [0, 6, 8], '?': [0, 7, 8],
};
for (let d = 0; d <= 9; d++) CODE[String(d)] = [d];
'ABCDEFGHI'.split('').forEach((c, i) => { CODE[c] = [12, i + 1]; });
'JKLMNOPQR'.split('').forEach((c, i) => { CODE[c] = [11, i + 1]; });
'STUVWXYZ'.split('').forEach((c, i) => { CODE[c] = [0, i + 2]; });

/* The 80 columns, as fields: [label, text, width]. */
function fields(f) {
  const S = f.sauna;
  const t = Number.isFinite(f.temp) ? `${f.temp < 0 ? '-' : '+'}${Math.abs(f.temp).toFixed(1).padStart(4, '0')}C` : '-----C';
  const out = f.out.state === 'wet' && f.out.until ? `${f.out.head.split(' ')[0].toUpperCase()}>${new Date(f.out.until).getHours().toString().padStart(2, '0')}`
    : f.out.state === 'coming' && f.out.from ? `${f.out.head.split(' ')[0].toUpperCase()}@${pad2(new Date(f.out.from).getHours())}`
    : f.out.state === 'fog' ? `FOG>${f.out.head.match(/(\d\d):/)?.[1] ?? '--'}` : 'DRY';
  const p = f.price != null ? f.price.toFixed(2) : '--';
  const when = S.start == null ? 'NONE' : S.tomorrow ? `+1 ${S.at}` : S.state === 'now' ? `NOW ${S.at}` : S.at;
  return [
    ['PLACE', f.place.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 10), 11],   // the 029 has no Ä
    ['DATE', `${pad2(f.d.getDate())}.${pad2(f.d.getMonth() + 1)}.${String(f.d.getFullYear()).slice(2)}`, 9],
    ['TIME', f.time, 6],
    ['TEMP', t, 7],
    ['RH', f.rh != null ? `${Math.round(f.rh)}%` : '--', 5],
    ['WIND', f.wind != null ? `${Math.round(f.wind)}MS` : '--', 5],
    ['OUTLOOK', out, 9],
    ['C/KWH', p, 6],
    ['SAUNA', when, 10],
    ['EUR', S.cost != null ? S.cost.toFixed(2) : '--', 5],
    ['STN', String(f.station.id), 7],
  ];
}

function render(ctx) {
  const f = facts(ctx);
  const cw = 740, ch = 326, cx = 30, cy = 77;
  const pitch = cw * (0.087 / 7.375), col0 = cx + cw * (0.251 / 7.375);
  const rowP = ch * (0.25 / 3.25), row0 = cy + ch * (0.25 / 3.25);
  const hw = 5.2, hh = 12.2;
  const B = INK.blue;

  const fs = fields(f);
  let line = '';
  const bounds = [];
  for (const [label, val, w] of fs) { bounds.push([line.length, w, label]); line += val.toUpperCase().slice(0, w - 1).padEnd(w); }
  line = line.slice(0, 80).padEnd(80);

  let s = `<rect width="${W}" height="${H}" fill="${INK.black}"/>`;
  // the card, corner cut at the top left
  s += `<path d="M${cx + 22},${cy} H${cx + cw} V${cy + ch} H${cx} V${cy + 26} Z" fill="${INK.paper}"/>`;
  // print: field rules, row digits, column numbers
  for (const [start, w, label] of bounds) {
    const x = col0 + (start - 0.5) * pitch;
    if (start) s += `<line x1="${x.toFixed(1)}" y1="${cy + 18}" x2="${x.toFixed(1)}" y2="${cy + ch - 4}" stroke="${B}" stroke-width="1"/>`;
    s += text(x + 3, cy + ch - 6, label, { family: MONO, size: 7.5, weight: 600, fill: B });
  }
  for (let r = 2; r < 12; r++) {
    const y = row0 + r * rowP + 2.6;
    let digits = '';
    for (let c = 0; c < 80; c++) digits += String(ROWS[r]);
    s += `<text x="${(col0 - 2.2).toFixed(1)}" y="${y.toFixed(1)}" font-family='${MONO}' font-size="7.4" letter-spacing="${(pitch - 4.44).toFixed(3)}" fill="${B}" style="white-space:pre">${digits}</text>`;
  }
  let nums = '';
  for (let c = 1; c <= 80; c++) nums += c % 10 === 0 ? String(c).slice(-2, -1) : ' ';
  s += `<text x="${(col0 - 2).toFixed(1)}" y="${(row0 + 2.5 * rowP + 3.5).toFixed(1)}" font-family='${MONO}' font-size="6" letter-spacing="${(pitch - 3.6).toFixed(3)}" fill="${B}" style="white-space:pre">${nums}</text>`;
  // the interpreted line along the top edge
  s += `<text x="${(col0 - 3).toFixed(1)}" y="${cy + 13}" font-family='${MONO}' font-size="10" font-weight="600" letter-spacing="${(pitch - 6).toFixed(3)}" fill="${INK.black}" style="white-space:pre">${esc(line)}</text>`;
  // the holes
  [...line].forEach((c, i) => {
    for (const r of CODE[c] ?? []) {
      const x = col0 + i * pitch - hw / 2, y = row0 + ROWS.indexOf(r) * rowP - hh / 2;
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${hw}" height="${hh}" rx="1" fill="${INK.black}"/>`;
    }
  });

  // for people: above and below the card
  const S = f.sauna;
  s += text(30, 50, `${num(f.temp)} °C`, { family: MONO, size: 28, weight: 700, fill: INK.paper })
     + text(186, 50, f.out.head.toUpperCase(), { family: MONO, size: 16, weight: 600, fill: INK.paper })
     + text(770, 50, `${num(f.price, 2)} C/KWH`, { family: MONO, size: 16, weight: 600, fill: INK.paper, anchor: 'end' })
     + text(30, 436, (S.cost != null ? `${S.line} · ≈ ${euro(S.cost)}` : S.line).toUpperCase(), { family: MONO, size: 16, weight: 600, fill: INK.paper })
     + text(770, 436, `${f.weekday.slice(0, 3).toUpperCase()} ${f.dateFi}`, { family: MONO, size: 16, weight: 500, fill: INK.paper, anchor: 'end' })
     + text(30, 462, 'Keyed in IBM 029 code: each column is one character of the line on the card’s top edge.', { size: 12.5, weight: 400, fill: INK.paper });
  return frame('landscape', s, { bg: INK.black });
}

export const punchcardL = {
  id: 'pz-punchcard-l', orient: 'landscape', name: 'Punch card · landscape',
  blurb: 'The day keyed onto an 80-column card in real IBM 029 Hollerith code — every column is '
       + 'one character of the line along its top edge, the holes are its punches: place, date, '
       + 'time, temperature, humidity, wind, outlook, price, sauna window, cost, station.',
  render,
};
