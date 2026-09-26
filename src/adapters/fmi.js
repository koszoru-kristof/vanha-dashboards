/**
 * Outdoor weather adapter: Finnish Meteorological Institute open data.
 *
 * Real observations, not a forecast model, from the FMI station nearest the
 * flat. Espoo Tapiola (fmisid 874863) is a few km away at sea level, which is
 * as close to "outside the window" as a public station gets. Swap `fmisid` to
 * use another one; the list is at https://www.ilmatieteenlaitos.fi/havaintoasemat.
 *
 * FMI's WFS does send a CORS header, but the panel still goes through the same
 * /api/fmi relay as the prices so the page talks to one origin only (see
 * vite.config.js and server/index.mjs). No API key is needed.
 *
 * Writes the latest reading to `climate.outdoor` on the bus, like any other
 * adapter, and keeps the 24 h series itself for the sparkline and high/low.
 */

export const TAPIOLA = 874863;

const STEP_MIN = 10;          // FMI's native observation interval
const WINDOW_H = 24;

/**
 * The "simple" stored query returns one <BsWfsElement> per (time, parameter).
 * The format is flat and stable, so a regex is enough and keeps this usable
 * from Node as well as the browser. NaN marks a missing sample.
 */
export function parseObservations(xml) {
  const byTime = new Map();
  const re = /<BsWfs:Time>([^<]+)<\/BsWfs:Time>\s*<BsWfs:ParameterName>([^<]+)<\/BsWfs:ParameterName>\s*<BsWfs:ParameterValue>([^<]+)<\/BsWfs:ParameterValue>/g;
  for (const [, time, param, value] of xml.matchAll(re)) {
    const t = Date.parse(time);
    const v = Number(value);
    const row = byTime.get(t) ?? { t };
    row[param] = Number.isFinite(v) ? v : null;
    byTime.set(t, row);
  }
  return [...byTime.values()].sort((a, b) => a.t - b.t);
}

export function fmiUrl({ base = '/api/fmi', fmisid = TAPIOLA, now = Date.now() } = {}) {
  // Rounded to the observation step so repeat loads within ten minutes ask
  // for the same URL, which the server relay can answer from cache.
  const step = STEP_MIN * 60 * 1000;
  const start = new Date(Math.floor((now - WINDOW_H * 3600 * 1000) / step) * step);
  const q = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'getFeature',
    storedquery_id: 'fmi::observations::weather::simple',
    fmisid: String(fmisid), parameters: 't2m,rh', timestep: String(STEP_MIN),
    starttime: start.toISOString().replace(/\.\d+Z$/, 'Z'),
  });
  return `${base}/wfs?${q}`;
}

/**
 * Store for the outdoor series. `latest` is the newest sample that actually
 * has a temperature — FMI publishes a row for the current 10 minutes before
 * the value is in, and that row must not read as a gap.
 */
export function createWeatherStore() {
  let rows = [];
  let source = 'none';
  let fetchedAt = null;
  const subs = new Set();
  const store = {
    set(list, src) {
      rows = list;
      source = src;
      fetchedAt = Date.now();
      for (const fn of subs) fn(store);
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    get source() { return source; },
    get fetchedAt() { return fetchedAt; },
    get rows() { return rows; },
    get latest() { return rows.findLast((r) => r.t2m != null) ?? null; },
    /** Temperatures over the window, gaps dropped, oldest first. */
    series() { return rows.filter((r) => r.t2m != null).map((r) => r.t2m); },
    range() {
      const s = store.series();
      return s.length ? { min: Math.min(...s), max: Math.max(...s) } : { min: 0, max: 0 };
    },
  };
  return store;
}

/**
 * Poll FMI and mirror the latest reading onto the bus. On failure the last
 * good series is kept; `source` goes to 'stale' once it is older than
 * `staleAfter`, so the panel can say so instead of showing an old number as
 * current.
 */
export function startWeatherFeed(store, bus, {
  base = '/api/fmi',
  fmisid = TAPIOLA,
  interval = 10 * 60 * 1000,
  staleAfter = 60 * 60 * 1000,
} = {}) {
  const refresh = async () => {
    try {
      const res = await fetch(fmiUrl({ base, fmisid }), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = parseObservations(await res.text());
      if (!rows.some((r) => r.t2m != null)) throw new Error('no observations');
      store.set(rows, 'fmi');
      const last = store.latest;
      const rh = rows.findLast((r) => r.rh != null)?.rh;
      bus?.set('climate.outdoor', { temperature: last.t2m, ...(rh != null && { humidity: Math.round(rh) }) }, 'fmi');
    } catch (err) {
      console.warn('[weather] FMI unavailable:', err.message);
      const age = store.latest ? Date.now() - store.latest.t : Infinity;
      if (age > staleAfter && store.source !== 'stale') store.set([], 'stale');
    }
  };
  refresh();
  const h = setInterval(refresh, interval);
  return () => clearInterval(h);
}

/* ------------------------------------------------------------- forecast */

/**
 * FMI's edited point forecast: the one their own app and yle.fi show, hourly,
 * a week out (asked for explicitly; the default is three days), refreshed
 * roughly hourly. Asked for by coordinates
 * because forecast points are a grid, not stations; these are Tapiola's, so
 * forecast and observation describe the same spot.
 *
 *   Temperature      °C
 *   WeatherSymbol3   1 clear · 2 partly cloudy · 3 cloudy · 21–23 showers
 *                    31–33 rain · 41–43 snow showers · 51–53 snow
 *                    61–64 thunder · 71–73 sleet showers · 81–83 sleet · 91–92 fog
 *   SmartSymbol      only used for its night flag (+100 after dark)
 *   PoP              probability of precipitation, %
 *   Precipitation1h  mm in the hour
 *   WindSpeedMS      m/s
 */
export const TAPIOLA_LATLON = '60.178,24.787';
const FORECAST_PARAMS = 'Temperature,WeatherSymbol3,SmartSymbol,PoP,Precipitation1h,WindSpeedMS';

export function forecastUrl({ base = '/api/fmi', latlon = TAPIOLA_LATLON, days = 7, now = Date.now() } = {}) {
  // The default is ~3 days; a week is there for the asking. Rounded to the
  // hour so the relay can cache it.
  const end = new Date(Math.floor(now / 3600e3) * 3600e3 + days * 24 * 3600e3);
  const q = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'getFeature',
    storedquery_id: 'fmi::forecast::edited::weather::scandinavia::point::simple',
    latlon, parameters: FORECAST_PARAMS, timestep: '60',
    endtime: end.toISOString().replace(/\.\d+Z$/, 'Z'),
  });
  return `${base}/wfs?${q}`;
}

/** Hourly forecast rows, [{ t, temp, sym, night, pop, mm, wind }], oldest first. */
export function createForecastStore() {
  let rows = [];
  let source = 'none';
  const subs = new Set();
  const store = {
    set(list, src) { rows = list; source = src; for (const fn of subs) fn(store); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    get source() { return source; },
    get rows() { return rows; },
    /** Hours whose start lies in [from, to). */
    between(from, to) { return rows.filter((r) => r.t >= from && r.t < to); },
    /** The hour containing `t`, else the next one (the feed starts at the next full hour). */
    at(t) { return rows.find((r) => r.t + 3600e3 > t) ?? null; },
  };
  return store;
}

export function startForecastFeed(store, {
  base = '/api/fmi',
  latlon = TAPIOLA_LATLON,
  interval = 30 * 60 * 1000,
} = {}) {
  const refresh = async () => {
    try {
      const res = await fetch(forecastUrl({ base, latlon }), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = parseObservations(await res.text())
        .filter((r) => r.Temperature != null)
        .map((r) => ({
          t: r.t, temp: r.Temperature, sym: Math.round(r.WeatherSymbol3 ?? 0),
          night: (r.SmartSymbol ?? 0) > 100, pop: r.PoP ?? 0,
          mm: r.Precipitation1h ?? 0, wind: r.WindSpeedMS ?? null,
        }));
      if (!rows.length) throw new Error('empty forecast');
      store.set(rows, 'fmi');
    } catch (err) {
      console.warn('[forecast] FMI unavailable:', err.message);
      // A forecast ages gracefully for a few hours; drop it only once its
      // first row is well in the past, i.e. the refreshes have failed for long.
      const first = store.rows[0];
      if (!first || Date.now() - first.t > 6 * 3600e3) store.set([], 'stale');
    }
  };
  refresh();
  const h = setInterval(refresh, interval);
  return () => clearInterval(h);
}
