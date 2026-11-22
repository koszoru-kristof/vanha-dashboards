/**
 * Kiuas — the sauna stove, a black column with its basket of stones, and
 * the sauna's own thermometer for a figure. The stones are grey while the
 * sauna is cold, mustard as it warms, red when it is hot, and steam rises
 * from a hot stove. Beneath it, when to heat: the sauna window and what it
 * costs.
 */
import { frame, facts, num, euro, smooth, SIZE } from '../posters/common.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const ex = W - 480;                 // the extra width of the 3:4 sheet; 0 on the 480 poster
  const f = facts(ctx);
  const S = f.sauna;
  const st = ctx.temp?.('climate.sauna');
  const sauna = Number.isFinite(st) && st !== 0 ? st : null;
  const hot = sauna != null && sauna >= 45, warming = sauna != null && sauna >= 30 && !hot;
  const stone = hot ? BAU.red : warming ? BAU.mustard : BAU.grey;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;

  // the stove and its stones
  // on the wider sheet the stove is broader and its stones bigger, a little left of centre to keep the steam clear of the words
  const B = { x: 150 + ex / 12, y: 300, w: 180 + ex / 3, h: 400 };
  const k = B.w / 180;                // the stove's own scale, 1 on the 480 poster
  s += `<rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10" fill="${BAU.black}"/>`;
  s += `<rect x="${B.x + 60 * k}" y="${B.y + B.h - 46}" width="${60 * k}" height="18" rx="4" fill="${S.state === 'now' || hot ? BAU.red : BAU.cream}"/>`;   // the vent glows when it is time to heat
  const rows = [[0, 4], [1, 3], [2, 4]];
  for (const [r, n] of rows) for (let i = 0; i < n; i++) {
    const cx = B.x + B.w / 2 + (i - (n - 1) / 2) * 40 * k, cy = B.y + 34 * k + r * 34 * k;
    s += `<circle cx="${cx}" cy="${cy}" r="${19 * k}" fill="${stone}"/>`;
  }
  // the steam, from a hot stove
  if (hot) for (let j = 0; j < 3; j++) {
    const x = B.x + (40 + j * 50) * k, pts = [];
    for (let y = B.y - 10; y >= 150; y -= 14) pts.push([x + 12 * Math.sin((y / 34) + j), y]);
    s += `<path d="${smooth(pts)}" fill="none" stroke="${BAU.black}" stroke-width="7" stroke-linecap="round"/>`;
  }

  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, `${num(f.temp, 0)}° outside · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500 })
     + T(40, 102, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 11, weight: 500 });
  s += `<text x="${W - 40}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${sauna != null ? `${num(sauna, 0)}°` : '–'}</text>`
     + T(W - 40, 112, 'in the sauna', { size: 10, weight: 600, ls: 1.5, anchor: 'end' });
  s += mark(W - 40, 250, hot ? 'the sauna is hot' : warming ? 'the sauna is warming' : S.state === 'now' ? 'heat it now' : S.start != null ? `heat it ${S.tomorrow ? 'tomorrow ' : ''}at ${S.at}` : saunaLine(S), { size: 26, anchor: 'end' })
     + T(W - 40, 274, hot || warming ? `${saunaLine(S)}${S.cost != null ? ` · about ${euro(S.cost)}` : ''}` : S.cost != null ? `about ${euro(S.cost)} a session` : 'the stove is cold', { size: 12, weight: 500, anchor: 'end' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the stones grey while the sauna is cold, mustard as it warms, red when hot · the vent glows when it is time',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', f.out.head.toLowerCase()].join(' · '),
  ] });
  return frame(orient, s, { bg: BAU.cream });
}

export const kiuasP = {
  id: 'bh-kiuas-p', orient: 'portrait', name: 'Kiuas · portrait',
  blurb: 'The sauna stove, a black column with its basket of stones, and the sauna’s own thermometer for a figure: '
       + 'the stones grey while the sauna is cold, mustard as it warms, red when it is hot, with steam rising. Beneath '
       + 'it, when to heat and what it costs.',
  render, tall: true,
};
