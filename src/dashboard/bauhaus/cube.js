/**
 * Cube — one large cube in isometric view, its three faces three facts:
 * the top face is the sky in its colour, the left face the price of power,
 * the right face the living room's warmth (green comfortable, red warm,
 * white cool). The cube stands on a black ground line; the figures are set
 * beside each face.
 */
import { frame, facts, num, euro } from '../posters/common.js';
import { BAU, skyInk, priceInk, priceWord, roomInk, mark, foot, saunaLine, T } from './bauhauskit.js';

const W = 800, H = 480;

function render(ctx) {
  const f = facts(ctx);
  const S = f.sauna;
  const living = ctx.temp?.('climate.living');
  const sky = skyInk(f.sky ?? 'cloudy', { night: f.night });
  const power = priceInk(f.price);
  const room = roomInk(living) ?? BAU.grey;
  const C = { x: 400, y: 226 }, a = 150, h = a * 0.5;       // an isometric cube: edges 150 px
  const P = {
    top: [C.x, C.y - 2 * h], left: [C.x - a * 0.866, C.y - h], right: [C.x + a * 0.866, C.y - h],
    mid: [C.x, C.y], bl: [C.x - a * 0.866, C.y + h], br: [C.x + a * 0.866, C.y + h], bottom: [C.x, C.y + 2 * h],
  };
  const poly = (pts, fill) => `<path d="M${pts.map((p) => p.join(',')).join(' L')} Z" fill="${fill}" stroke="${BAU.black}" stroke-width="3" stroke-linejoin="round"/>`;
  let s = `<rect width="${W}" height="${H}" fill="${BAU.cream}"/>`;
  s += `<rect x="0" y="${P.bottom[1] + 8}" width="${W}" height="5" fill="${BAU.black}"/>`;
  s += poly([P.top, P.right, P.mid, P.left], sky) + poly([P.left, P.mid, P.bottom, P.bl], power) + poly([P.mid, P.right, P.br, P.bottom], room);

  // the faces' figures
  s += T(P.left[0] - 30, P.left[1] - 20, f.out.head.toLowerCase(), { size: 14, weight: 500, anchor: 'end' })
     + T(P.left[0] - 30, P.left[1] - 2, 'the sky', { size: 10, weight: 600, ls: 1.5, anchor: 'end' });
  s += T(P.bl[0] - 30, P.bl[1] + 4, f.price != null ? `${num(f.price, 1)} c/kWh, ${priceWord(f.price)}` : 'no prices yet', { size: 14, weight: 500, anchor: 'end' })
     + T(P.bl[0] - 30, P.bl[1] + 22, 'power now', { size: 10, weight: 600, ls: 1.5, anchor: 'end' });
  s += T(P.br[0] + 30, P.br[1] + 4, Number.isFinite(living) && living !== 0 ? `${num(living, 1)}° indoors` : 'no reading', { size: 14, weight: 500 })
     + T(P.br[0] + 30, P.br[1] + 22, 'living room', { size: 10, weight: 600, ls: 1.5 });

  // the words
  s += mark(40, 56, f.place.toLowerCase()) + T(40, 78, `${f.weekday.toLowerCase()} ${f.dayMonth.toLowerCase()} · ${f.time}`, { size: 13, weight: 500 });
  s += `<text x="${W - 40}" y="84" font-family='"Jost Variable", Jost, Futura, sans-serif' font-size="60" font-weight="700" letter-spacing="-2" text-anchor="end" fill="${BAU.black}">${num(f.temp, 0)}°</text>`
     + T(W - 40, 106, 'outdoors', { size: 10, weight: 600, ls: 1.5, anchor: 'end' });
  s += foot(W, H, { left: f.place.toUpperCase(), right: String(f.d.getFullYear()), lines: [
    'three faces, three facts: the sky, the price, the room',
    `${saunaLine(S)}${S.cost != null ? `, about ${euro(S.cost)}` : ''}`,
  ] });
  return frame('landscape', s, { bg: BAU.cream });
}

export const cubeL = {
  id: 'bh-cube-l', orient: 'landscape', name: 'Cube · landscape',
  blurb: 'One large isometric cube, its three faces three facts: the top is the sky in its colour, the left the '
       + 'price of power, the right the living room’s warmth — green comfortable, red warm, white cool — standing '
       + 'on a black ground line with the figures beside each face.',
  render,
};
