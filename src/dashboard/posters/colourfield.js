/**
 * Colour field — after Rothko: two soft-edged fields of colour floating on
 * a warm ground, and nothing else but a line of type at the foot.
 *
 * The upper field is the sky now, in its ink; it is as tall as the day is
 * light, so it shrinks through the autumn and fills the canvas in June. The
 * lower field is the electricity price now, sage to coral. When a sauna
 * window is coming, a thin green band glows between them. The temperature is
 * written into the sky field in its own ink, a shade darker; the facts are in
 * the caption.
 */
import { frame, facts, esc, num, euro, uid, hash, HOUR, SANS, SIZE } from './common.js';
import { RISO, skyInk, priceInk, DISPLAY, MULTIPLY, tempWords } from './artkit.js';

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const u = W / 480;                         // margins and the figure keep their proportion on the tall sheet
  const f = facts(ctx);
  const seed = hash(`${f.d.toDateString()}${f.scenario?.id ?? ''}`) % 997;
  const ids = { soft: uid('cfs'), grain: uid('cfg') };
  const sky = skyInk(f.sky ?? 'cloudy', { night: f.night, temp: f.temp });
  const power = priceInk(f.price);
  const light = f.dayLen != null ? Math.max(0.3, Math.min(0.78, f.dayLen / (24 * HOUR))) : 0.5;
  const top = 40, bottom = 676, gap = 26, x0 = 38 * u, x1 = W - 38 * u;
  const split = top + (bottom - top - gap) * light;

  // painterly edges: displace the rectangles' outlines with noise, then soften
  let s = `<defs>
    <filter id="${ids.soft}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="3.2"/>
    </filter>
    <filter id="${ids.grain}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves="3" seed="${seed + 3}" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.42" result="a"/>
      <feComposite in="a" in2="SourceGraphic" operator="in"/>
    </filter>
  </defs>`;
  s += `<rect width="${W}" height="${H}" fill="#ebe3d5"/>`;
  const field = (y, h, ink) => `<g filter="url(#${ids.soft})"><rect x="${x0}" y="${y.toFixed(1)}" width="${x1 - x0}" height="${h.toFixed(1)}" rx="6" fill="${ink}"/></g>`
    + `<g filter="url(#${ids.grain})"><rect x="${x0 + 6}" y="${(y + 6).toFixed(1)}" width="${x1 - x0 - 12}" height="${(h - 12).toFixed(1)}" fill="${ink}"/></g>`;
  s += field(top, split - top, sky);
  s += field(split + gap, bottom - split - gap, power);

  // a sauna window ahead: a thin band of green light between the fields
  if (f.sauna.start != null) {
    s += `<g filter="url(#${ids.soft})"><rect x="${x0 + 24}" y="${(split + gap / 2 - 3).toFixed(1)}" width="${x1 - x0 - 48}" height="6" rx="3" fill="${RISO.sage}"/></g>`;
  }

  // the temperature, written into the sky in its own ink, a shade darker
  const t = `${num(f.temp, 0)}°`;
  const tSize = Math.min(150 * u, (split - top) * 0.62);
  const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const tAt = `x="${x0 + 26}" y="${(split - 26).toFixed(1)}" font-family='${DISPLAY}' font-size="${tSize.toFixed(0)}" font-weight="300" font-style="italic"`;
  s += lum(sky) < 0.35
    ? `<text ${tAt} fill="${RISO.paper}" opacity=".5">${esc(t)}</text>`          // on a night sky, a paler tone
    : `<text ${tAt} fill="${sky}"${MULTIPLY}>${esc(t)}</text><text ${tAt} fill="${sky}"${MULTIPLY} opacity=".6">${esc(t)}</text>`;

  // the caption: a line to read, and the figures
  const S = f.sauna;
  const said = `${tempWords(f.temp)[0].toUpperCase()}${tempWords(f.temp).slice(1)}, ${f.out.head[0].toLowerCase()}${f.out.head.slice(1)}.`;
  const figs = [`${f.place.toUpperCase()} ${f.time}`, f.price != null ? `${num(f.price, 1)} C/KWH` : null,
    S.start != null ? `${S.line.toUpperCase()}${S.cost != null ? ` · ${euro(S.cost)}` : ''}` : null].filter(Boolean).join('  ·  ');
  s += `<text x="${W / 2}" y="728" font-family='${DISPLAY}' font-size="22" font-style="italic" font-weight="380" text-anchor="middle" fill="${RISO.ink}">${esc(said)}</text>`
     + `<text x="${W / 2}" y="758" font-family='${SANS}' font-size="11.5" font-weight="600" letter-spacing="1.6" text-anchor="middle" fill="${RISO.ink}">${esc(figs)}</text>`;
  return frame(orient, s, { bg: '#ebe3d5' });
}

export const colourFieldP = {
  id: 'pz-colourfield-p', orient: 'portrait', name: 'Colour field · portrait',
  blurb: 'After Rothko: two soft fields of colour — the sky now above, as tall as the day is light; '
       + 'the price now below, sage to coral — with a thin green band between them when a sauna '
       + 'window is coming. The temperature is written into the sky, a shade darker.',
  render, tall: true,
};
