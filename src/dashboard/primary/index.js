/**
 * Primary colours — a fifth series for the wall, in the palette of the
 * catalogue's "primary" collection: red, yellow and blue as flat fields on
 * white, with black for structure and type. The five are the Spectra 6
 * panel's own inks, so nothing here is dithered. Each poster is a
 * composition generated from the inputs — how many hours are cheap, dark,
 * wet or warm; how hard the wind blows; what is switched on in the flat —
 * under one colour grammar (see primarykit.js), so the sheet changes with
 * the day without a legend.
 */
import { partitionP } from './partition.js';
import { exhibitionP } from './exhibition.js';
import { shuttersP } from './shutters.js';
import { framesP } from './frames.js';
import { totemP } from './totem.js';
import { householdP } from './household.js';
import { dotwallL } from './dotwall.js';
import { keysL } from './keys.js';
import { bricksL } from './bricks.js';
import { stairsL } from './stairs.js';

export const PRIMARY = [partitionP, exhibitionP, shuttersP, framesP, totemP, householdP, dotwallL, keysL, bricksL, stairsL];
