/**
 * Soft, flat weather illustrations for a colour e-ink panel.
 *
 * Unlike the 1-bit set in wicons.js these are filled shapes in pale tints with
 * no outlines: a peach sun disc, layered grey clouds, blue rounded drops. On
 * a Spectra 6 panel the tints are dithered from the six inks by the driver,
 * which at this size reads as a fine, paper-like texture rather than noise —
 * the look of the commercial colour e-ink weather frames.
 *
 * cicon(kind, { size, night }) -> SVG string, drawn on a 100-unit grid.
 */
import { SOFT } from './palette.js';

const C = SOFT;

const disc = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

const moon = (cx, cy, r) =>
  `<mask id="mk${cx}${cy}${r}"><rect width="100" height="100" fill="#fff"/>
     <circle cx="${cx + r * 0.5}" cy="${cy - r * 0.35}" r="${r * 0.82}" fill="#000"/></mask>
   <circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.moon}" mask="url(#mk${cx}${cy}${r})"/>`;

/* A cloud from three bumps on a rounded base. (x, y) is the base's left end. */
const cloud = (x, y, w, fill) => {
  const h = w * 0.36;
  return `<g fill="${fill}">
    <rect x="${x}" y="${y - h}" width="${w}" height="${h}" rx="${h / 2}"/>
    <circle cx="${x + w * 0.34}" cy="${y - h * 0.95}" r="${w * 0.2}"/>
    <circle cx="${x + w * 0.6}" cy="${y - h * 1.15}" r="${w * 0.26}"/>
  </g>`;
};

const drops = (xs, y, len = 12) => xs.map((x) =>
  `<line x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + len}" stroke="${C.rain}" stroke-width="5" stroke-linecap="round"/>`).join('');
const flakes = (xs, y) => xs.map((x, i) => disc(x, y + (i % 2) * 8, 3.6, C.snow)).join('');

const DRAW = {
  clear: (n) => (n ? moon(50, 50, 34) : disc(50, 50, 38, C.sun)),
  partly: (n) => (n ? moon(62, 36, 22) : disc(62, 38, 25, C.sun)) + cloud(10, 80, 66, C.cloud),
  cloudy: () => cloud(30, 58, 60, C.cloudDark) + cloud(8, 80, 70, C.cloud),
  fog: () => [34, 50, 66].map((y, i) =>
    `<line x1="${16 + i * 6}" y1="${y}" x2="${84 - (2 - i) * 6}" y2="${y}" stroke="${C.cloudDark}" stroke-width="7" stroke-linecap="round"/>`).join(''),
  showers: (n) => (n ? moon(64, 30, 18) : disc(64, 30, 20, C.sun)) + cloud(10, 66, 66, C.cloud) + drops([30, 50], 76),
  rain: () => cloud(30, 46, 56, C.cloudDark) + cloud(10, 66, 70, C.cloud) + drops([26, 45, 64], 76),
  snow: () => cloud(30, 46, 56, C.cloudDark) + cloud(10, 66, 70, C.cloud) + flakes([26, 45, 64], 80),
  sleet: () => cloud(30, 46, 56, C.cloudDark) + cloud(10, 66, 70, C.cloud) + drops([28, 60], 76) + flakes([44], 80),
  thunder: () => cloud(30, 46, 56, C.cloudDark) + cloud(10, 66, 70, C.cloud)
    + `<path d="M50 62 L38 82 H49 L43 98 L64 74 H53 L58 62 Z" fill="${C.sun}"/>`,
};

export function cicon(kind, { size = 64, night = false } = {}) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100">${(DRAW[kind] ?? DRAW.cloudy)(night)}</svg>`;
}

export function ciconEl(kind, opts) {
  const w = document.createElement('div');
  w.innerHTML = cicon(kind, opts);
  return w.firstElementChild;
}

/* Small line glyphs for the stat grid: sunrise, sunset, wind, humidity,
   rain chance, power. Ink strokes with a single tint, 24-unit grid. */
const G = `fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
const GLYPHS = {
  sunrise: `<path d="M4 18 H20" ${G}/><path d="M7 18 A5 5 0 0 1 17 18 Z" fill="${C.sun}"/><path d="M12 4 V9 M9.5 6.5 L12 4 L14.5 6.5" ${G}/>`,
  sunset: `<path d="M4 18 H20" ${G}/><path d="M7 18 A5 5 0 0 1 17 18 Z" fill="${C.sun}"/><path d="M12 4 V9 M9.5 6.5 L12 9 L14.5 6.5" ${G}/>`,
  wind: `<path d="M3 9 H14 A3 3 0 1 0 11 6 M3 14 H18 A3 3 0 1 1 15 17 M3 19 H9" ${G}/>`,
  humidity: `<path d="M12 3 C12 3 5 11 5 15 A7 7 0 0 0 19 15 C19 11 12 3 12 3 Z" fill="${C.rainLight}"/><path d="M12 3 C12 3 5 11 5 15 A7 7 0 0 0 19 15 C19 11 12 3 12 3 Z" ${G}/>`,
  umbrella: `<path d="M3 12 A9 9 0 0 1 21 12 Z" fill="${C.rainLight}"/><path d="M3 12 A9 9 0 0 1 21 12 Z M12 12 V19 A2 2 0 0 1 8 19" ${G}/>`,
  power: `<path d="M13 2 L5 13 H11 L10 22 L19 10 H13 Z" fill="${C.sunLight}"/><path d="M13 2 L5 13 H11 L10 22 L19 10 H13 Z" ${G}/>`,
  sauna: `<path d="M5 20 H19 M7 20 V13 H17 V20" ${G}/><path d="M9 10 C8 8 10 7 9 5 M12 10 C11 8 13 7 12 5 M15 10 C14 8 16 7 15 5" ${G}/>`,
  home: `<path d="M4 11 L12 4 L20 11 V20 H4 Z" fill="${C.cheapLight}"/><path d="M4 11 L12 4 L20 11 V20 H4 Z M10 20 V14 H14 V20" ${G}/>`,
};

export function glyph(name, size = 24) {
  const w = document.createElement('div');
  w.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24">${GLYPHS[name] ?? ''}</svg>`;
  return w.firstElementChild;
}
