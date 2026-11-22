/**
 * Balance — today against tomorrow on a beam balance. The two pans carry
 * the rest of today's prices and tomorrow's, each in its own colour, and
 * the dearer day sinks. Before tomorrow's prices are published, at two in
 * the afternoon, the beam lies level with the right pan empty. The verdict
 * is written beneath: wait for tomorrow, or today is the day.
 */
import { frame, facts, num, euro, dayStart } from '../posters/common.js';
import { BAU, priceInk, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 800, H = 480;
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const today = mean(f.next.filter((p) => p.start < dayStart(f.now, 1)).map((p) => p.price));
  const tomorrow = mean(f.tomorrow.filter((p) => p.price != null).map((p) => p.price));
  const both = today != null && tomorrow != null;
  const tilt = both ? Math.max(-8, Math.min(8, ((today - tomorrow) / Math.max(2, Math.abs(today), Math.abs(tomorrow))) * 16)) : 0;   // degrees; the dearer day sinks
  const t = (tilt * Math.PI) / 180;
  const C = { x: 400, y: 196 }, arm = 262, drop = 46, pan = 44, ground = 384;
  const L = [C.x - arm * Math.cos(t), C.y + arm * Math.sin(t)], Rr = [C.x + arm * Math.cos(t), C.y - arm * Math.sin(t)];
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  // the stand and the beam
  s += `<path d="M${C.x - 64},${ground} L${C.x},${C.y + 10} L${C.x + 64},${ground} Z" fill="${BAU.black}"/><rect x="0" y="${ground}" width="${W}" height="6" fill="${BAU.black}"/>`;
  s += `<rect x="${C.x - arm}" y="${C.y - 7}" width="${arm * 2}" height="14" rx="7" fill="${BAU.black}" transform="rotate(${(-tilt).toFixed(2)} ${C.x} ${C.y})"/>`;
  s += `<circle cx="${C.x}" cy="${C.y}" r="12" fill="${BAU.cream}" stroke="${BAU.black}" stroke-width="5"/>`;
  // the pans
  const panAt = (E, ink, empty) => `<line x1="${E[0].toFixed(1)}" y1="${E[1].toFixed(1)}" x2="${E[0].toFixed(1)}" y2="${(E[1] + drop).toFixed(1)}" stroke="${BAU.black}" stroke-width="3"/>`
    + (empty ? `<circle cx="${E[0].toFixed(1)}" cy="${(E[1] + drop + pan).toFixed(1)}" r="${pan}" fill="none" stroke="${BAU.black}" stroke-width="4" stroke-dasharray="8 6"/>`
             : `<circle cx="${E[0].toFixed(1)}" cy="${(E[1] + drop + pan).toFixed(1)}" r="${pan}" fill="${ink}"/>`);
  s += panAt(L, priceInk(today), today == null) + panAt(Rr, priceInk(tomorrow), tomorrow == null);
  s += T(L[0].toFixed(1), (L[1] + drop + pan + 6).toFixed(1), today != null ? `${num(today, 1)}` : '–', { size: 18, weight: 700, anchor: 'middle', fill: BAU.cream })
     + T(Rr[0].toFixed(1), (Rr[1] + drop + pan + 6).toFixed(1), tomorrow != null ? `${num(tomorrow, 1)}` : '', { size: 18, weight: 700, anchor: 'middle', fill: BAU.cream });
  s += T(L[0].toFixed(1), (L[1] - 18).toFixed(1), 'TODAY', { size: 10.5, weight: 700, ls: 2.4, anchor: 'middle' }) + T(Rr[0].toFixed(1), (Rr[1] - 18).toFixed(1), 'TOMORROW', { size: 10.5, weight: 700, ls: 2.4, anchor: 'middle' });

  // the verdict
  const say = !both ? (today == null ? 'no prices yet' : 'tomorrow’s prices come at 14:00')
    : tomorrow < today * 0.8 - 0.5 ? 'wait for tomorrow' : today < tomorrow * 0.8 - 0.5 ? 'today is the day' : 'much the same either day';
  s += mark(W - 40, 84, say, { size: 26, anchor: 'end' })
     + T(W - 40, 106, [today != null ? `rest of today ${num(today, 1)} c/kWh` : null, tomorrow != null ? `tomorrow ${num(tomorrow, 1)}` : null].filter(Boolean).join(' · '), { size: 12, weight: 500, anchor: 'end' });
  s += mark(40, 56, f.place.toLowerCase()) + T(40, 78, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time} · ${num(f.temp, 0)}°, ${f.out.head.toLowerCase()}`, { size: 13, weight: 500 });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the pans carry the rest of today’s prices and tomorrow’s · the dearer day sinks',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh now, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: BAU.cream });
}

export const balanceL = {
  id: 'bh-balance-l', orient: 'landscape', name: 'Balance · landscape',
  blurb: 'Today against tomorrow on a beam balance: the pans carry the rest of today’s prices and tomorrow’s, each in '
       + 'its own colour, and the dearer day sinks. Before tomorrow’s prices are published the beam lies level with '
       + 'the right pan empty. The verdict is written above: wait for tomorrow, or today is the day.',
  render,
};
