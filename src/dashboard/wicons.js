/**
 * Weather icons for a 1-bit panel.
 *
 * Solid black and white only, drawn on a 48-unit grid with 3-unit strokes so
 * they stay crisp at 48 px (and at 36 / 24, where the strokes scale to whole
 * or half pixels the panel thresholds cleanly). The cloud is white-filled so
 * it can sit in front of a sun or moon and occlude it, the way every weather
 * app draws "partly cloudy", without needing a grey.
 *
 * icon(kind, { size, night }) -> SVG string. Kinds come from src/weather.js.
 */

const S = 'stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';

const sun = (cx, cy, r) => {
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const x1 = cx + Math.cos(a) * (r + 4), y1 = cy + Math.sin(a) * (r + 4);
    const x2 = cx + Math.cos(a) * (r + 9), y2 = cy + Math.sin(a) * (r + 9);
    rays.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ${S}/>`);
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000"/>${rays.join('')}`;
};

/* A crescent: a disc with a paper disc bitten out of it. */
const moon = (cx, cy, r) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000"/>
   <circle cx="${cx + r * 0.55}" cy="${cy - r * 0.45}" r="${r * 0.85}" fill="#fff"/>`;

/* Cloud with a flat base; `dy` shifts it up to make room for what falls. */
const cloud = (dy = 0, x = 0) =>
  `<path transform="translate(${x} ${dy})" fill="#fff" ${S}
     d="M13 37 H36 A8 8 0 0 0 36 21 A11 11 0 0 0 15.5 19 A9 9 0 0 0 13 37 Z"/>`;

const drops = (n, y = 34) => {
  const xs = n === 1 ? [24] : n === 2 ? [18, 29] : [14, 24, 34];
  return xs.map((x) => `<line x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + 8}" ${S}/>`).join('');
};
const flakes = (y = 36) => [14, 24, 34].map((x, i) =>
  `<circle cx="${x}" cy="${y + (i % 2) * 5}" r="2.5" fill="#000"/>`).join('');

const DRAW = {
  clear: (night) => (night ? moon(24, 24, 12) : sun(24, 24, 8)),
  partly: (night) => (night ? moon(18, 17, 9) : sun(17, 16, 6)) + cloud(3, 4),
  cloudy: () => cloud(0),
  fog: () => [16, 23, 30, 37].map((y, i) =>
    `<line x1="${8 + (i % 2) * 5}" y1="${y}" x2="${40 - ((i + 1) % 2) * 5}" y2="${y}" ${S}/>`).join(''),
  showers: (night) => (night ? moon(17, 13, 8) : sun(16, 12, 5)) + cloud(-5, 4) + drops(2),
  rain: () => cloud(-6) + drops(3),
  snow: () => cloud(-7) + flakes(),
  sleet: () => cloud(-6) + `<line x1="17" y1="34" x2="14" y2="42" ${S}/>`
    + `<circle cx="26" cy="37" r="2.5" fill="#000"/><line x1="35" y1="34" x2="32" y2="42" ${S}/>`,
  thunder: () => cloud(-7) + '<path d="M26 30 L19 39 H25 L21 47 L31 36 H25 L28 30 Z" fill="#000"/>',
};

export function icon(kind, { size = 48, night = false } = {}) {
  const body = (DRAW[kind] ?? DRAW.cloudy)(night);
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48">${body}</svg>`;
}

export function iconEl(kind, opts) {
  const w = document.createElement('div');
  w.innerHTML = icon(kind, opts);
  return w.firstElementChild;
}
