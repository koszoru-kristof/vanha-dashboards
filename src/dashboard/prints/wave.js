/**
 * Wave — the day's nerves, as sixty-four upright lines.
 *
 * Each line is a quarter of an hour of the next twenty-four, left to right,
 * and it sways by the price of its hour: straight and calm where power is
 * cheap, rolling where it is dear, so the pattern shows at once where the
 * still water lies. The sauna window's lines are green. The temperature
 * stands in a paper disc cut out of the pattern.
 */
import { frame, facts, esc, int, num, euro, hourStart, HOUR, SANS } from '../posters/common.js';
import { PRINT, level, priceWord, T } from './printkit.js';

const W = 800, H = 480, N = 64;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const h0 = hourStart(f.now);
  const price = new Map([...f.today, ...f.tomorrow].map((p) => [p.start, p.price]));
  let s = `<rect width="${W}" height="${H}" fill="${PRINT.paper}"/>`;
  const x0 = 34, x1 = W - 34, top = 44, bottom = H - 44;
  for (let i = 0; i < N; i++) {
    const t = h0 + (i / N) * 24 * HOUR;
    const hour = hourStart(t);
    const p = price.get(hour);
    const amp = p == null ? 0 : 3 + 26 * level(p);
    const sauna = S.start != null && hour >= S.start && hour < S.start + 2 * HOUR;
    const x = x0 + ((x1 - x0) * i) / (N - 1);
    let d = '';
    for (let y = top; y <= bottom; y += 5) {
      const xx = x + amp * Math.sin((y / 150) * Math.PI * 2 + i * 0.33);
      d += `${d ? 'L' : 'M'}${xx.toFixed(1)},${y}`;
    }
    s += `<path d="${d}" fill="none" stroke="${sauna ? PRINT.green : p == null ? '#b8b4ab' : PRINT.black}" stroke-width="${sauna ? 3.2 : 2.4}" stroke-linecap="round"/>`;
  }

  // the temperature, in a disc cut out of the pattern
  const C = { x: 400, y: 240, r: 122 };
  s += `<circle cx="${C.x}" cy="${C.y}" r="${C.r}" fill="${PRINT.paper}"/>`;
  const t = `${int(f.temp)}°`;
  s += `<text x="${C.x + 4}" y="${C.y + 30}" font-family='${SANS}' font-size="${t.length > 3 ? 84 : 98}" font-weight="800" letter-spacing="-4" text-anchor="middle" fill="${PRINT.black}">${esc(t)}</text>`;
  s += T(C.x, C.y + 62, f.out.head.toUpperCase(), { size: 11, weight: 700, ls: 1.8, anchor: 'middle' });

  // the facts, in the clear margins
  s += T(x0, 26, `${f.place.toUpperCase()} · ${f.weekday.toUpperCase()} ${f.dayMonth.toUpperCase()} · ${f.time}`, { size: 11, weight: 700, ls: 2 })
     + T(x1, 26, 'THE NEXT 24 HOURS, LEFT TO RIGHT · CALM WHERE CHEAP', { size: 9, weight: 600, ls: 1.4, anchor: 'end', fill: '#8a8a8e' });
  s += T(x0, H - 18, f.price != null ? `POWER ${num(f.price, 1)} C/KWH · ${priceWord(f.price).toUpperCase()}` : 'NO PRICES YET', { size: 11, weight: 700, ls: 2 })
     + T(x1, H - 18, S.state === 'now' ? `SAUNA NOW${S.cost != null ? ` · ${euro(S.cost)}` : ''}`
        : S.start != null ? `SAUNA ${S.tomorrow ? 'TOMORROW ' : ''}${S.at}${S.cost != null ? ` · ${euro(S.cost)}` : ''}` : S.line.toUpperCase(), { size: 11, weight: 700, ls: 2, anchor: 'end' });
  return frame('landscape', s, { bg: PRINT.paper });
}

export const waveL = {
  id: 'pr-wave-l', orient: 'landscape', name: 'Wave · landscape',
  blurb: 'Sixty-four upright lines, a quarter of an hour each for the next twenty-four, swaying by the price '
       + 'of their hour: straight and calm where power is cheap, rolling where it is dear, the sauna window’s '
       + 'lines green. The temperature stands in a paper disc cut out of the pattern.',
  render,
};
