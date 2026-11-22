/**
 * Poster studies for a colour e-ink panel on a living-room wall: typographic,
 * minimal-ink, each still stating the day plainly — outdoor now, the outlook,
 * the price now and across the day, the sauna window.
 *
 * The first five follow the three reference posters (a biennale's cropped
 * numerals, a Baskerville specimen, Mode + Module) or come from them; the next
 * six are original proposals. The last six are the art set (see artkit.js):
 * soft overprinting inks, generated shapes, typography, no charts. Each design
 * carries `orient`, portrait or landscape.
 */
import { numeralP, numeralL } from './numeral.js';
import { weightP, weightL } from './weight.js';
import { specimenP } from './specimen.js';
import { moduleP } from './module.js';
import { tableL, tableP } from './table.js';
import { blueprintL } from './blueprint.js';
import { pulsarP } from './pulsar.js';
import { compositionP, compositionL } from './composition.js';
import { punchcardL } from './punchcard.js';
import { isotypeP } from './isotype.js';
import { sliderule } from './sliderule.js';
import { risoP } from './risop.js';
import { colourFieldP } from './colourfield.js';
import { sentenceP } from './sentence.js';
import { bauhausL } from './bauhaus.js';
import { sunflowerL } from './sunflower.js';
import { cutoutsP } from './cutouts.js';

export const POSTERS = [numeralP, numeralL, weightP, weightL, specimenP, moduleP, tableL, tableP, blueprintL, pulsarP, compositionP, compositionL, punchcardL, isotypeP, sliderule,
  risoP, colourFieldP, sentenceP, bauhausL, sunflowerL, cutoutsP];
