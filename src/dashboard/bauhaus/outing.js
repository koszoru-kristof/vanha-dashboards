/**
 * Outing — the one thing to take when you go out, drawn as the collection
 * draws a bicycle: a few flat shapes on a single colour.
 *
 * Rain or sleet ahead: the umbrella. Snow, or a hard frost: the skis. A
 * clear warm day: the sunglasses. Cold and dry: the hat. Otherwise: the
 * bicycle. The ground is green for a dry day, blue for a wet one, white
 * for snow; the temperature and the outlook are set small.
 */
import { frame, facts, num, euro, HOUR, SIZE } from '../posters/common.js';
import { BAU, priceWord, mark, foot, saunaLine, T } from './bauhauskit.js';

/* Which object, from the next six hours. */
function pick(f) {
  const ahead = f.fc.between(f.now, f.now + 6 * HOUR);
  const wet = f.wet || ahead.some((r) => r.mm >= 0.3);
  const snowy = f.sky === 'snow' || (Number.isFinite(f.temp) && f.temp <= -3);
  if (snowy) return 'skis';
  if (wet) return 'umbrella';
  if (!f.night && (f.sky === 'clear' || f.sky === 'partly') && f.temp >= 15) return 'sunglasses';
  if (Number.isFinite(f.temp) && f.temp <= 5) return 'hat';
  return 'bicycle';
}

const SAY = { umbrella: 'take the umbrella', skis: 'a day for skis', sunglasses: 'sunglasses weather', hat: 'a hat today', bicycle: 'bicycle weather' };

function object(kind, ink, paper, reach = 0) {   // reach: how much further the sunglasses' arms run to bleed off a wider sheet
  const cx = 240;
  switch (kind) {
    case 'umbrella':
      return `<path d="M${cx - 170},420 A170,170 0 0 1 ${cx + 170},420 Q${cx + 142},400 ${cx + 113},420 Q${cx + 85},400 ${cx + 57},420 Q${cx + 28},400 ${cx},420 Q${cx - 28},400 ${cx - 57},420 Q${cx - 85},400 ${cx - 113},420 Q${cx - 142},400 ${cx - 170},420 Z" fill="${ink}"/>`
        + `<rect x="${cx - 5}" y="250" width="10" height="330" fill="${paper}"/><rect x="${cx - 5}" y="420" width="10" height="160" fill="${ink}"/>`
        // the crook starts on the shaft's centre line, so the 10 px stroke runs on from the 10 px shaft
        + `<path d="M${cx},580 A30,30 0 0 1 ${cx - 60},580" fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round"/>`;
    case 'skis':
      return `<rect x="${cx - 60}" y="200" width="30" height="400" rx="15" fill="${ink}"/><rect x="${cx + 30}" y="200" width="30" height="400" rx="15" fill="${ink}"/>`
        + `<rect x="${cx - 60}" y="200" width="30" height="60" rx="15" fill="${BAU.red}"/><rect x="${cx + 30}" y="200" width="30" height="60" rx="15" fill="${BAU.red}"/>`
        + `<rect x="${cx - 110}" y="260" width="6" height="300" fill="${ink}"/><rect x="${cx + 104}" y="260" width="6" height="300" fill="${ink}"/>`
        + `<circle cx="${cx - 107}" cy="530" r="14" fill="none" stroke="${ink}" stroke-width="5"/><circle cx="${cx + 107}" cy="530" r="14" fill="none" stroke="${ink}" stroke-width="5"/>`;
    case 'sunglasses':
      return `<circle cx="${cx - 96}" cy="410" r="84" fill="${ink}"/><circle cx="${cx + 96}" cy="410" r="84" fill="${ink}"/>`
        + `<path d="M${cx - 14},400 Q${cx},380 ${cx + 14},400" fill="none" stroke="${ink}" stroke-width="10"/>`
        + `<rect x="${cx - 240 - reach}" y="396" width="${62 + reach}" height="10" fill="${ink}"/><rect x="${cx + 178}" y="396" width="${62 + reach}" height="10" fill="${ink}"/>`
        + `<circle cx="${cx - 120}" cy="384" r="16" fill="${paper}"/><circle cx="${cx + 72}" cy="384" r="16" fill="${paper}"/>`;
    case 'hat':
      return `<path d="M${cx - 150},470 A150,150 0 0 1 ${cx + 150},470 Z" fill="${ink}"/>`
        + `<rect x="${cx - 160}" y="470" width="320" height="56" rx="8" fill="${BAU.red}"/>`
        + `<circle cx="${cx}" cy="300" r="34" fill="${BAU.red}"/>`
        + `<rect x="${cx - 130}" y="482" width="260" height="6" fill="${ink}"/><rect x="${cx - 130}" y="508" width="260" height="6" fill="${ink}"/>`;
    default:
      return `<rect x="${cx - 130}" y="226" width="260" height="10" rx="5" fill="${paper}"/>`
        + `<rect x="${cx - 4}" y="236" width="8" height="54" fill="${paper}"/>`
        + `<rect x="${cx - 24}" y="290" width="48" height="190" rx="24" fill="none" stroke="${paper}" stroke-width="8"/>`
        + `<rect x="${cx - 12}" y="318" width="24" height="284" rx="12" fill="${ink}"/>`
        + `<rect x="${cx - 24}" y="516" width="48" height="104" rx="24" fill="none" stroke="${paper}" stroke-width="8"/>`
        + `<rect x="${cx - 60}" y="464" width="120" height="10" rx="5" fill="${ink}"/>`;
  }
}

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const e = W - 480;                                               // the extra width of a 3:4 sheet
  const f = facts(ctx);
  const S = f.sauna;
  const kind = pick(f);
  const ground = kind === 'umbrella' ? BAU.blue : kind === 'skis' ? BAU.white : BAU.green;
  const onWhite = ground === BAU.white;
  const ink = onWhite ? BAU.black : BAU.black, paper = onWhite ? BAU.green : BAU.cream, type = onWhite ? BAU.black : BAU.cream;
  let s = `<rect width="${W}" height="${H}" fill="${ground}"/>`;
  if (e) {
    // a wider sheet: the object grows by a sixth about its middle and the words step down to make room
    const g = 1 + e / 720, reach = W / 2 / g - 240 + 2;
    s += `<g transform="translate(${W / 2},410) scale(${g}) translate(-240,-410)">${object(kind, ink, paper, reach)}</g>`;
  } else s += object(kind, ink, paper);

  s += mark(40, 60, f.place.toLowerCase(), { fill: type })
     + T(40, 84, `${num(f.temp, 0)}° · ${f.out.head.toLowerCase()}`, { size: 13, weight: 500, fill: type })
     + T(40, 102, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 11, weight: 500, fill: type });
  s += mark(W / 2, 668 + e / 5, SAY[kind], { fill: type, size: 30, anchor: 'middle' });
  s += foot(W, H, { left: f.place.toUpperCase(), fill: type, right: String(f.d.getFullYear()), lines: [
    'the one thing to take when you go out, from the next six hours',
    [f.price != null ? `power ${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`].join(' · '),
  ] });
  return frame(orient, s, { bg: ground });
}

export const outingP = {
  id: 'bh-outing-p', orient: 'portrait', name: 'Outing · portrait',
  blurb: 'The one thing to take when you go out, drawn as the collection draws a bicycle: the umbrella for rain, '
       + 'the skis for snow or hard frost, the sunglasses for a clear warm day, the hat for cold and dry, otherwise '
       + 'the bicycle — on green, blue for a wet day, white for snow.',
  render, tall: true,
};
