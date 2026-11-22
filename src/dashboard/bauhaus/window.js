/**
 * Window — the room's own view: a black window frame with the sky in its
 * four panes, and the radiator beneath it.
 *
 * The panes are the colour of the sky now — mustard sun, blue rain with
 * streaks on the glass, white snow, grey fog, black night with a moon in the
 * upper pane. The radiator is red while the flat is heating (cold outside)
 * and a bare outline when it is not, with the living room's temperature on
 * it. The outdoor figure hangs on the wall above.
 */
import { frame, facts, num, euro, rng, hash } from '../posters/common.js';
import { BAU, skyInk, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 480, H = 800;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const R = rng(hash(`${f.d.toDateString()}${f.scenario?.id ?? ''}`));
  const k = f.sky ?? 'cloudy';
  const sky = skyInk(k, { night: f.night });
  const living = ctx.temp?.('climate.living');
  const heating = Number.isFinite(f.temp) && f.temp < 12;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;

  // the frame and its four panes
  const F = { x: 88, y: 150, w: 304, h: 330, bar: 16 };
  s += `<rect x="${F.x}" y="${F.y}" width="${F.w}" height="${F.h}" fill="${BAU.black}"/>`;
  const pw = (F.w - 3 * F.bar) / 2, ph = (F.h - 3 * F.bar) / 2;
  const panes = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([i, j]) => ({ x: F.x + F.bar + i * (pw + F.bar), y: F.y + F.bar + j * (ph + F.bar) }));
  for (const p of panes) s += `<rect x="${p.x}" y="${p.y}" width="${pw}" height="${ph}" fill="${sky}"/>`;
  // what is on the glass
  const wet = ['rain', 'showers', 'thunder', 'sleet'].includes(k);
  for (const p of panes) {
    if (wet) for (let i = 0; i < 5; i++) { const x = p.x + 12 + i * (pw / 5) + R() * 10, y0 = p.y + R() * 40; s += `<line x1="${x.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${(x - 14).toFixed(1)}" y2="${(y0 + 60 + R() * 60).toFixed(1)}" stroke="${BAU.white}" stroke-width="3" stroke-linecap="round"/>`; }
    if (k === 'snow') for (let i = 0; i < 9; i++) s += `<circle cx="${(p.x + 10 + R() * (pw - 20)).toFixed(1)}" cy="${(p.y + 10 + R() * (ph - 20)).toFixed(1)}" r="4" fill="${BAU.black}"/>`;
    if (k === 'fog') for (let y = p.y + 22; y < p.y + ph; y += 30) s += `<rect x="${p.x}" y="${y}" width="${pw}" height="10" fill="${BAU.cream}"/>`;
  }
  if (f.night && (k === 'clear' || k === 'partly')) s += `<circle cx="${panes[1].x + pw * 0.62}" cy="${panes[1].y + ph * 0.4}" r="26" fill="${BAU.cream}"/>`;
  s += `<rect x="${F.x - 18}" y="${F.y + F.h}" width="${F.w + 36}" height="14" fill="${BAU.black}"/>`;   // the sill

  // the radiator beneath
  const bars = 8, bw = 22, gap = 12, rx = W / 2 - (bars * bw + (bars - 1) * gap) / 2, ry = 540, rh = 130;
  for (let i = 0; i < bars; i++) {
    const x = rx + i * (bw + gap);
    s += heating ? `<rect x="${x}" y="${ry}" width="${bw}" height="${rh}" rx="11" fill="${BAU.red}"/>`
                 : `<rect x="${x + 1.5}" y="${ry + 1.5}" width="${bw - 3}" height="${rh - 3}" rx="10" fill="none" stroke="${BAU.black}" stroke-width="3"/>`;
  }
  s += `<rect x="${rx - 10}" y="${ry + 24}" width="${bars * bw + (bars - 1) * gap + 20}" height="6" fill="${BAU.black}"/>`
     + `<rect x="${rx - 10}" y="${ry + rh - 30}" width="${bars * bw + (bars - 1) * gap + 20}" height="6" fill="${BAU.black}"/>`;
  s += T(W / 2, ry + rh + 26, Number.isFinite(living) && living !== 0 ? `${num(living, 1)}° in the living room · ${heating ? 'heating' : 'heating off'}` : heating ? 'heating' : 'heating off', { size: 11, weight: 600, ls: 1, anchor: 'middle' });

  // the words
  s += mark(40, 60, f.place.toLowerCase())
     + T(40, 84, f.out.head.toLowerCase(), { size: 13, weight: 500 })
     + T(40, 102, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 11, weight: 500 });
  s += `<text x="${W - 40}" y="92" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="64" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'the sky in the panes · the radiator red while the flat is heating',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('portrait', s, { bg: BAU.cream });
}

export const windowP = {
  id: 'bh-window-p', orient: 'portrait', name: 'Window · portrait',
  divider: { title: 'Second set', intro: 'More of the same manner, from another pass through the collection: an arcade, a moving '
    + 'circle, eclipsed circles, a winding path, descending blocks, the cup and its steam, chevrons. Two new sources join in: '
    + 'the real phase of the moon tonight, and the humidity outside.' },
  blurb: 'The room’s own view: a black window frame with the sky in its four panes — mustard sun, blue rain with streaks '
       + 'on the glass, white snow, grey fog, black night with a moon — and the radiator beneath, red while the flat is '
       + 'heating, with the living room’s temperature on it.',
  render,
};
