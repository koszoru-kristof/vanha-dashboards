/**
 * A mock-up of one real device, for trying the portrait posters on it before
 * buying: the Seeed Studio reTerminal E1004.
 *
 *   panel     13.3" E Ink Spectra 6, 1200 x 1600 portrait (~150 ppi, 0.169 mm pitch)
 *   active    202.8 x 270.4 mm (from the pixel count and the 13.3" diagonal)
 *   outline   311 x 376 x 40 mm, aluminium frame (Seeed's "376mm*311mm*40mm")
 *   frame     black, ~8 mm face       } measured off the datasheet photo,
 *   mat       white, ~45 mm all round } which agrees with the outline to 1 mm
 *   price     USD 279.90 (Seeed store, Nov 2026)
 *
 * The posters are composed for this panel at 600 x 800 (3:4, its own
 * aspect) and drawn into a box of exactly 1200 x 1600 CSS px at 2x, one CSS
 * px per device pixel. `?fit=` picks what goes in the box:
 *   native  the poster's 3:4 composition (the default)
 *   fit     the old 3:5 poster scaled to the panel's height, its own ground
 *           carried out to the sides (2x: 960 of the 1200 px across)
 *   fill    the old 3:5 poster scaled to the width, cropped top and bottom
 *           (2.5x: 80 poster px lost at each end)
 * A design that has no 3:4 composition yet falls back to fit.
 * ?mat=none takes the mat away, to see the panel's off-white beside nothing.
 * ?exact on a single poster (?only=) drops the device and shows the 1200 x
 * 1600 box at 1:1, for capture and for sending to the panel.
 *
 * In the mock-up the panel is 480 x 640 CSS px (the pixel box at 0.4), which
 * fixes the scale of everything else: 2.367 px per mm.
 */
import './device.css';

export const E1004 = {
  name: 'reTerminal E1004',
  px: [1200, 1600],
  activeMm: [202.8, 270.4],
  outlineMm: [311, 376],
  depthMm: 40,
  frameMm: 8,
  priceUsd: 279.9,
  url: 'https://www.seeedstudio.com/reTerminal-E1004-p-6692.html',
};

/* The panel's box in the mock-up, and so the millimetre. */
const VIEW = [480, 640];
const MM = VIEW[0] / E1004.activeMm[0];
const SHOWN = VIEW[0] / E1004.px[0];

export const FITS = { native: 'Composed for 3:4', fit: 'Old 3:5, fitted', fill: 'Old 3:5, cropped' };
export const MATS = { white: 'White mat', none: 'No mat' };

/**
 * The panel's pixels: a 1200 x 1600 box with the poster in it. A native
 * poster is 600 x 800 and drawn at 2x; an old 480 x 800 one is fitted or
 * cropped. Vector all the way, so the box is sharp at its own size.
 */
export function pixels(poster, fit = 'native') {
  const [pw, ph] = fit === 'native' ? [600, 800] : [480, 800];
  const s = fit === 'fill' ? E1004.px[0] / pw : E1004.px[1] / ph;
  const box = document.createElement('div');
  box.className = 'e1004-pixels';
  box.style.cssText = `width:${E1004.px[0]}px;height:${E1004.px[1]}px;`
    + `background:${poster.style.background || '#f3f0e8'}`;
  const wrap = document.createElement('div');
  wrap.className = 'e1004-poster';
  wrap.style.cssText = `width:${pw}px;height:${ph}px;transform:translate(-50%,-50%) scale(${s})`;
  wrap.append(poster);
  box.append(wrap);
  return box;
}

/** The device around one poster: frame, mat, and the pixel box at 0.4. */
export function e1004(poster, { fit = 'native', mat = 'white' } = {}) {
  const [ow, oh] = E1004.outlineMm.map((v) => v * MM);
  const el = document.createElement('div');
  el.className = `e1004 mat-${mat}`;
  el.style.cssText = `width:${ow}px;height:${oh}px;--fr:${E1004.frameMm * MM}px;--depth:${E1004.depthMm * MM}px`;
  el.innerHTML = `<div class="e1004-mat"><div class="e1004-window" style="width:${VIEW[0]}px;height:${VIEW[1]}px"></div></div>`;
  const box = pixels(poster, fit);
  box.style.transform = `scale(${SHOWN})`;
  el.querySelector('.e1004-window').append(box);
  return el;
}
