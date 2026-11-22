/**
 * The baked neighbourhood maps (data/<id>-map.json, from tools/fetch_osm.mjs),
 * loaded on demand: each is ~200–300 kB of SVG paths, and a page only ever
 * needs the one for its place. A place without an extract gets null, and the
 * map designs say so instead of drawing the wrong streets.
 */
const MAPS = import.meta.glob('../../data/*-map.json');

/** The map for a place's `map` id, or null when none has been baked. */
export async function loadMap(id) {
  const load = MAPS[`../../data/${id}-map.json`];
  if (!load) return null;
  const mod = await load();
  return mod.default ?? mod;
}
