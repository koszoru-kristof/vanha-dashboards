/**
 * A modular display face, drawn rather than installed: every figure is one
 * thick monoline stroke on a 10-unit grid — straight runs, circular corners,
 * flat ends — after the modular lettering of the Mode + Module poster.
 *
 * Only what the posters set in it: figures, the decimal point, colon, minus,
 * degree and plus. Paths are centrelines; the stroke is 2.2 units.
 *
 *   modText('−19.7°', { x, y, h, color })   top-left at (x, y), cap height h
 *   modWidth('−19.7°', h)                   its advance in px
 */
const S = 2.2;          // stroke, in grid units
const GAP = 1.3;        // between figures

/* [advance, centreline path, filled dots as [cx, cy, r]] */
const G = {
  '0': [8, 'M1.1,4 A2.9,2.9 0 0 1 6.9,4 V6 A2.9,2.9 0 0 1 1.1,6 Z'],
  '1': [4.4, 'M1,3.3 A2.2,2.2 0 0 1 3.2,1.1 V8.9'],
  '2': [8, 'M1.1,4 A2.9,2.9 0 1 1 5.86,6.22 L1.1,8.9 H6.9'],
  '3': [8, 'M1.1,1.1 H4.95 A1.95,1.95 0 0 1 4.95,5 H2.9 M4.95,5 A1.95,1.95 0 0 1 4.95,8.9 H1.1'],
  '4': [8, 'M1.1,1.1 V6.2 H6.9 M5.3,2.6 V8.9'],
  '5': [8, 'M6.9,1.1 H1.1 V4.6 H4.75 A2.15,2.15 0 0 1 4.75,8.9 H1.1'],
  '6': [8, 'M6.3,1.1 H4 A2.9,2.9 0 0 0 1.1,4 V6.75 M1.1,6.75 A2.15,2.15 0 0 1 3.25,4.6 H4.75 A2.15,2.15 0 0 1 6.9,6.75 A2.15,2.15 0 0 1 4.75,8.9 H3.25 A2.15,2.15 0 0 1 1.1,6.75 Z'],
  '7': [8, 'M1.1,1.1 H6.9 L3.2,8.9'],
  '8': [8, 'M1.5,3.05 A1.95,1.95 0 0 1 3.45,1.1 H4.55 A1.95,1.95 0 0 1 6.5,3.05 A1.95,1.95 0 0 1 4.55,5 H3.45 A1.95,1.95 0 0 1 1.5,3.05 Z M1.1,6.95 A1.95,1.95 0 0 1 3.05,5 H4.95 A1.95,1.95 0 0 1 6.9,6.95 A1.95,1.95 0 0 1 4.95,8.9 H3.05 A1.95,1.95 0 0 1 1.1,6.95 Z'],
  '9': [8, 'M1.1,3.25 A2.15,2.15 0 0 1 3.25,1.1 H4.75 A2.15,2.15 0 0 1 6.9,3.25 A2.15,2.15 0 0 1 4.75,5.4 H3.25 A2.15,2.15 0 0 1 1.1,3.25 Z M6.9,3.25 V6 A2.9,2.9 0 0 1 4,8.9 H1.7'],
  '.': [2.6, '', [[1.3, 7.8, 1.25]]],
  ':': [2.6, '', [[1.3, 3.7, 1.25], [1.3, 7.8, 1.25]]],
  '−': [6.4, 'M0.6,5 H5.8'],
  '-': [6.4, 'M0.6,5 H5.8'],
  '°': [4.2, '', [], 'M0.8,2.5 a1.3,1.3 0 1 0 2.6,0 a1.3,1.3 0 1 0 -2.6,0'],
  '+': [8, 'M1.1,5 H6.9 M4,2.1 V7.9'],
  ' ': [3, ''],
};

export function modWidth(str, h) {
  const k = h / 10;
  const chars = [...str].filter((c) => G[c]);
  return (chars.reduce((s, c) => s + G[c][0], 0) + GAP * Math.max(0, chars.length - 1)) * k;
}

export function modText(str, { x = 0, y = 0, h = 100, color = '#000' } = {}) {
  const k = h / 10;
  let cx = 0, out = '';
  for (const c of str) {
    const g = G[c];
    if (!g) continue;
    const [adv, d, dots = [], ring] = g;
    if (d) out += `<path d="${d}" transform="translate(${cx} 0)"/>`;
    for (const [dx, dy, r] of dots) out += `<circle cx="${cx + dx}" cy="${dy}" r="${r}" fill="${color}" stroke="none"/>`;
    if (ring) out += `<path d="${ring}" transform="translate(${cx} 0)" stroke-width="1.15"/>`;
    cx += adv + GAP;
  }
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(4)})" fill="none" stroke="${color}"`
    + ` stroke-width="${S}" stroke-linecap="butt" stroke-linejoin="round">${out}</g>`;
}
