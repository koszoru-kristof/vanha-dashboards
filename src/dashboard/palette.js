/**
 * Colour for a colour e-ink panel, used sparingly.
 *
 * Target: an E Ink Spectra 6 panel (e.g. Waveshare 7.3" E6, 800x480 — the
 * same size as the 1-bit designs). It has six inks: black, white, red, yellow,
 * blue, green. There are no tints: anything else is dithered, which on e-ink
 * reads as grain, so every coloured area is one of those inks, solid.
 *
 * The pigments look far calmer than their sRGB names — the red is brick, the
 * blue is slate — so `MUTED` previews the panel as it actually looks. `PURE`
 * is what to send the driver, which maps each pixel to its nearest ink; both
 * put each role on the same ink, so the preview is honest about placement.
 *
 * Colour carries meaning in exactly four roles, and nothing else is coloured:
 *   sun    the sun in weather icons                           yellow
 *   rain   what falls: drops, flakes, rain bars               blue
 *   dear   expensive hours on the price ribbon                red
 *   go     the recommended sauna window                       green
 * Text, numbers, rules and the hero stay black, so the panel still reads
 * fully on a 1-bit display with the colours thresholded away.
 */

export const MUTED = {
  name: 'muted',
  sun: '#d4ae45',
  rain: '#3f5f8f',
  dear: '#a8473b',
  go: '#55784e',
};

export const PURE = {
  name: 'pure',
  sun: '#ffff00',
  rain: '#0000ff',
  dear: '#ff0000',
  go: '#00ff00',
};

/**
 * SOFT: the palette for the ground-up colour proposals. These do use tints —
 * peach, sage, sand, pale blue — which a Spectra 6 driver dithers from its six
 * inks, the way commercial colour e-ink weather frames do. Kept to pale,
 * warm-leaning values so the dither reads as paper texture. Text is always
 * `ink`, never a tint: dithered small type breaks up.
 */
export const SOFT = {
  ink: '#23262b',
  line: '#23262b',
  paper: '#ffffff',
  sun: '#f0a55e',
  sunLight: '#f8d9ab',
  moon: '#e4cf8f',
  cloud: '#d3d7de',
  cloudDark: '#9aa3b1',
  rain: '#6d8fc2',
  rainLight: '#c9d8ee',
  snow: '#9fb6da',
  night: '#eef1f6',
  cheap: '#a3c49a',
  cheapLight: '#dcebd6',
  normal: '#ead294',
  dear: '#dd8a70',
  go: '#4d8a58',
  warm: '#e0925f',
};
