/**
 * Map — the neighbourhood round the chosen place as a print: the bay in
 * blue, parks and woods in green, the streets in black on cream, the
 * buildings a shade darker than the ground, and a red dot for the station
 * itself. After dark the sheet inverts, streets in cream on black; rain
 * falls across the whole map as white streaks. The day is set in a band at
 * the head and the foot.
 */
import { frame, facts, num, euro, rng, hash } from '../posters/common.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

/* The baked OpenStreetMap extract for the place comes in ctx.map (src/dashboard/maps.js). */

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const R = rng(hash(`${f.d.toDateString()}${f.scenario?.id ?? ''}`));
  const N = f.night;
  const L = ctx.map?.layers;
  const c = N ? { bg: BAU.black, land: BAU.black, green: '#24402d', wood: '#1c3323', water: BAU.night, building: '#2a2a2c', path: '#4a4a4e', minor: '#9a9585', major: BAU.cream, ink: BAU.cream }
              : { bg: BAU.cream, land: BAU.cream, green: BAU.green, wood: '#3e6a4c', water: BAU.blue, building: '#c9c1ad', path: '#b9b19d', minor: BAU.black, major: BAU.black, ink: BAU.black };
  let s = `<rect width="${W}" height="${H}" fill="${c.bg}"/>`;
  if (!L) s += T(W / 2, 250, `no map baked for ${f.place} yet · node tools/fetch_osm.mjs --place <id>`, { size: 13, weight: 500, anchor: 'middle', fill: c.ink });
  else s += `<path d="${L.green}" fill="${c.green}"/><path d="${L.wood}" fill="${c.wood}"/><path d="${L.water}" fill="${c.water}"/><path d="${L.building}" fill="${c.building}"/>`;
  if (L) s += `<path d="${L.path}" fill="none" stroke="${c.path}" stroke-width="1"/>`
     + `<path d="${L.minor}" fill="none" stroke="${c.minor}" stroke-width="1.6" stroke-linecap="round"/>`
     + `<path d="${L.major}" fill="none" stroke="${c.major}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (f.wet) for (let i = 0; i < 40; i++) { const x = R() * W, y = 60 + R() * 360; s += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 10).toFixed(0)}" y2="${(y + 34).toFixed(0)}" stroke="${BAU.white}" stroke-width="3" stroke-linecap="round"/>`; }
  s += `<circle cx="400" cy="240" r="13" fill="${BAU.red}"/><circle cx="400" cy="240" r="22" fill="none" stroke="${BAU.red}" stroke-width="3"/>`;

  // the bands
  const band = N ? BAU.black : BAU.cream;
  s += `<rect x="0" y="0" width="${W}" height="62" fill="${band}"/><rect x="0" y="416" width="${W}" height="64" fill="${band}"/>`;
  s += mark(40, 42, f.place.toLowerCase(), { fill: c.ink })
     + T(150, 42, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time} · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500, fill: c.ink });
  s += T(W - 40, 46, `${num(f.temp, 0)}°`, { size: 40, weight: 700, ls: -1, anchor: 'end', fill: c.ink });
  s += foot(W, H, { left: f.place.toUpperCase(), fill: c.ink, right: String(f.d.getFullYear()), lines: [
    `the streets round ${f.place.toLowerCase()} · the red dot is the spot the forecast is for · openstreetmap`,
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: band });
}

export const mapL = {
  id: 'bh-map-l', orient: 'landscape', name: 'Map · landscape',
  divider: { title: 'Third set', intro: 'A third pass, on what was still uncovered: the neighbourhood map, the sauna’s own sensor, '
    + 'the six-day forecast, today against tomorrow’s prices, the rooms’ sizes from the floor plan, the season, a washing day. '
    + 'Two more motifs from the catalogue join — the angular zigzag and striped planets over waves.' },
  blurb: 'The neighbourhood round the chosen place as a print: water in blue, parks and woods in green, streets '
       + 'in black on cream, a red dot for the spot the forecast is for. After dark the sheet inverts, streets in cream on black; rain '
       + 'falls across the whole map as white streaks.',
  render,
};
