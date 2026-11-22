/**
 * Washing line — is it a drying day? A line strung between two posts, and
 * on it the wash in flat shapes: a shirt, a towel, a pair of socks, a
 * dress, a sheet. They swing out with the wind. If rain is coming within
 * six hours the line is left bare under the streaks. The caption says it
 * plainly: a fine drying day, a slow one, or no washing today.
 */
import { frame, facts, num, euro, HOUR } from '../posters/common.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const wind = Number.isFinite(f.wind) ? f.wind : 3;
  const rh = Number.isFinite(f.rh) ? f.rh : 70;
  const wet = f.wet || f.fc.between(f.now, f.now + 6 * HOUR).some((r) => r.mm >= 0.3);
  const fine = !wet && rh < 80 && wind >= 3 && f.temp >= 8;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  // the posts and the line
  const y0 = 128, sag = 34;
  s += `<rect x="52" y="${y0 - 10}" width="12" height="${400 - y0 + 10}" fill="${BAU.black}"/><rect x="736" y="${y0 - 10}" width="12" height="${400 - y0 + 10}" fill="${BAU.black}"/>`;
  s += `<path d="M58,${y0} Q400,${y0 + sag * 2} 742,${y0}" fill="none" stroke="${BAU.black}" stroke-width="4"/>`;
  s += `<rect x="0" y="400" width="${W}" height="6" fill="${BAU.black}"/>`;
  const lineY = (x) => { const u = (x - 58) / (742 - 58); return y0 + 2 * sag * u * (1 - u) * 2; };
  const skew = -Math.min(24, wind * 1.5);
  const hang = (x, body) => `<g transform="translate(${x} ${lineY(x).toFixed(1)}) skewX(${skew.toFixed(1)})">${body}</g><circle cx="${x}" cy="${lineY(x).toFixed(1)}" r="5" fill="${BAU.black}"/>`;
  if (!wet) {
    s += hang(170, `<path d="M-46,4 L46,4 L34,124 L-34,124 Z" fill="${BAU.green}"/>`);                              // a shirt
    s += hang(300, `<rect x="-32" y="4" width="64" height="150" fill="${BAU.red}"/>`);                              // a towel
    s += hang(400, `<rect x="-28" y="4" width="20" height="66" rx="8" fill="${BAU.black}"/><rect x="8" y="4" width="20" height="66" rx="8" fill="${BAU.black}"/>`);  // socks
    s += hang(500, `<path d="M-14,4 L14,4 L58,150 L-58,150 Z" fill="${BAU.mustard}"/>`);                            // a dress
    s += hang(640, `<rect x="-68" y="4" width="136" height="130" fill="${BAU.white}" stroke="${BAU.black}" stroke-width="3"/>`);   // a sheet
  } else {
    for (let i = 0; i < 18; i++) { const x = 80 + i * 37; s += `<line x1="${x}" y1="${y0 + 30}" x2="${x - 14}" y2="${360}" stroke="${BAU.blue}" stroke-width="3" stroke-dasharray="16 12"/>`; }
    for (const x of [200, 400, 600]) s += `<rect x="${x - 4}" y="${(lineY(x) - 10).toFixed(1)}" width="8" height="22" rx="3" fill="${BAU.black}"/>`;   // the pegs left on the line
  }

  // the words
  s += mark(40, 56, f.place.toLowerCase()) + T(40, 78, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time} · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="84" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="60" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`;
  s += mark(W - 40, 446, wet ? 'no washing today' : fine ? 'a fine drying day' : 'a slow drying day', { size: 26, anchor: 'end' })
     + T(W - 40, 466, `wind ${num(wind, 0)} m/s · humidity ${Math.round(rh)} %`, { size: 12, weight: 500, anchor: 'end' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: '', lines: [
    'the wash swings with the wind · the line is left bare when rain is coming',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame('landscape', s, { bg: BAU.cream });
}

export const washingL = {
  id: 'bh-washing-l', orient: 'landscape', name: 'Washing line · landscape',
  blurb: 'Is it a drying day? A line between two posts with the wash in flat shapes — a shirt, a towel, socks, a '
       + 'dress, a sheet — swinging out with the wind; left bare under the streaks when rain is coming within six '
       + 'hours. A fine drying day, a slow one, or no washing today.',
  render,
};
