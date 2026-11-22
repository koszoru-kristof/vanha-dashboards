/**
 * The places the dashboards can be set to, and the FMI stations that serve
 * them.
 *
 * A place is a spot on the map with a name: the forecast (a gridded model
 * sampled at a point), the sunrise and sunset, and the neighbourhood map are
 * all for the place itself. Observations — "outdoor now" — can only come from
 * a real weather station, so each place is served by the nearest one in
 * FMI's weather-station network; Leppävaara, for instance, has an HSY air
 * quality monitor but no thermometer FMI publishes, so its readings come from
 * Espoo Tapiola, 4.6 km away. The posters print the station beside the
 * source credit so this stays visible.
 *
 * Pick a place with `?place=<id>` on dashboard.html or panel.html, or the
 * chooser at the head of the studies page; the choice is kept in localStorage.
 */

/** FMI automatic weather stations around the capital (fmisid → where). */
export const STATIONS = {
  874863: { name: 'Espoo Tapiola', short: 'Tapiola', lat: 60.177967, lon: 24.787433 },
  852678: { name: 'Espoo Nuuksio', short: 'Nuuksio', lat: 60.291281, lon: 24.567815 },
  100971: { name: 'Helsinki Kaisaniemi', short: 'Kaisaniemi', lat: 60.17523, lon: 24.94459 },
  101004: { name: 'Helsinki Kumpula', short: 'Kumpula', lat: 60.203071, lon: 24.961305 },
  100968: { name: 'Helsinki-Vantaa airport', short: 'Helsinki-Vantaa', lat: 60.329368, lon: 24.97274 },
};

/** The places on offer. `map` names the baked OSM extract in data/, if there is one. */
export const PLACES = [
  { id: 'tapiola', name: 'Tapiola', city: 'Espoo', lat: 60.178, lon: 24.787, map: 'tapiola' },
  { id: 'leppavaara', name: 'Leppävaara', city: 'Espoo', lat: 60.219, lon: 24.813, map: 'leppavaara' },
  { id: 'matinkyla', name: 'Matinkylä', city: 'Espoo', lat: 60.160, lon: 24.739, map: 'matinkyla' },
  { id: 'espoon-keskus', name: 'Espoon keskus', city: 'Espoo', lat: 60.205, lon: 24.656, map: 'espoon-keskus' },
  { id: 'helsinki', name: 'Helsinki centre', city: 'Helsinki', lat: 60.172, lon: 24.941, map: 'helsinki' },
];

export const DEFAULT_PLACE = 'leppavaara';

/** Great-circle distance in km. */
export function distanceKm(aLat, aLon, bLat, bLon) {
  const r = Math.PI / 180, R = 6371;
  const dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The weather station nearest a point: { id, name, short, lat, lon, km }. */
export function nearestStation(lat, lon) {
  let best = null;
  for (const [id, s] of Object.entries(STATIONS)) {
    const km = distanceKm(lat, lon, s.lat, s.lon);
    if (!best || km < best.km) best = { id: Number(id), ...s, km };
  }
  return best;
}

/**
 * The place for an id (unknown or missing → the default), with its station
 * attached and its coordinates in FMI's `latlon` form.
 */
export function resolvePlace(id) {
  const p = PLACES.find((q) => q.id === id) ?? PLACES.find((q) => q.id === DEFAULT_PLACE);
  return { ...p, station: nearestStation(p.lat, p.lon), latlon: `${p.lat},${p.lon}` };
}

/**
 * Which place a page should use: the URL's `place` wins and is remembered;
 * otherwise the remembered one; otherwise the default.
 */
export function chosenPlace(search = globalThis.location?.search ?? '', storage = globalThis.localStorage) {
  const fromUrl = new URLSearchParams(search).get('place');
  const id = fromUrl ?? storage?.getItem('place') ?? DEFAULT_PLACE;
  const place = resolvePlace(id);
  if (fromUrl && storage && place.id === fromUrl) storage.setItem('place', fromUrl);
  return place;
}
