/**
 * Drops — the next twelve hours as a grid of circles, three across and
 * four down, an hour each, left to right and top to bottom. A dry hour is a
 * black disc. A wet hour lets a green drop fall from its disc, as long as
 * the rain is heavy; snow leaves a white disc ringed in black, fog a grey
 * ring. So a dry day is twelve plain discs, and a storm a sheet of drips.
 */
import { frame, facts, num, euro, hourStart, HOUR } from '../posters/common.js';
import { kind as kindOf } from '../../weather.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 480, H = 800;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const h0 = hourStart(f.now);
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  const R = 40, cols = 3, x0 = 100, y0 = 190, dx = 140, dy = 134;
  for (let i = 0; i < 12; i++) {
    const t = h0 + i * HOUR, r = f.fc.at(t + HOUR / 2);
    const k = r ? kindOf(r.sym) : 'cloudy', mm = r?.mm ?? 0;
    const cx = x0 + (i % cols) * dx, cy = y0 + Math.floor(i / cols) * dy;
    if (mm >= 0.1 && k !== 'snow') {
      const len = Math.min(dy - 18, 20 + mm * 16);
      // a drop: the disc, a neck that narrows, a smaller bead at the end
      s += `<path d="M${cx - R},${cy} A${R},${R} 0 1 1 ${cx + R},${cy} C${cx + R},${cy + len * 0.55} ${cx + 12},${cy + len - 14} ${cx + 12},${cy + len} `
         + `A12,12 0 0 1 ${cx - 12},${cy + len} C${cx - 12},${cy + len - 14} ${cx - R},${cy + len * 0.55} ${cx - R},${cy} Z" fill="${BAU.green}"/>`;
    } else if (k === 'snow' || (mm >= 0.1 && k === 'snow')) {
      s += `<circle cx="${cx}" cy="${cy}" r="${R - 2}" fill="${BAU.white}" stroke="${BAU.black}" stroke-width="4"/>`;
    } else if (k === 'fog') {
      s += `<circle cx="${cx}" cy="${cy}" r="${R - 6}" fill="none" stroke="${BAU.grey}" stroke-width="12"/>`;
    } else {
      s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${BAU.black}"/>`;
    }
    if (i === 0) s += `<circle cx="${cx}" cy="${cy}" r="${R + 9}" fill="none" stroke="${BAU.black}" stroke-width="2"/>`;
  }

  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="90" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  s += T(40, 102, f.out.head.toLowerCase(), { size: 13, weight: 500 });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the next twelve hours, an hour a disc, ringed now · a drop falls where it rains',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('portrait', s, { bg: BAU.cream });
}

export const dropsP = {
  id: 'bh-drops-p', orient: 'portrait', name: 'Drops · portrait',
  blurb: 'The next twelve hours as a grid of discs, an hour each. A dry hour is a black disc; a wet hour lets a '
       + 'green drop fall from its disc, as long as the rain is heavy; snow leaves a white disc ringed in black, fog '
       + 'a grey ring. A dry day is twelve plain discs, a storm a sheet of drips.',
  render,
};
