/**
 * Outdoor forecast model: turns FMI's hourly rows into the few things the
 * panel says — "rain until 22:00", today's high and low, what the evening,
 * the night and tomorrow look like.
 *
 * Like src/prices.js, nothing here knows where the rows come from; the
 * adapters in src/adapters/fmi.js fill the stores. Forecast rows are
 * { t, temp, sym, night, pop, mm, wind }; observation rows { t, t2m, rh }.
 */

const HOUR = 3600 * 1000;

/* An hour counts as wet from a tenth of a millimetre — below that FMI's
   "light rain" is a few drops nobody takes an umbrella for. */
export const WET_MM = 0.1;

/** WeatherSymbol3 → one of a handful of kinds the icons and copy know. */
export function kind(sym) {
  if (sym === 1) return 'clear';
  if (sym === 2) return 'partly';
  if (sym === 3) return 'cloudy';
  if (sym >= 21 && sym <= 23) return 'showers';
  if (sym >= 31 && sym <= 33) return 'rain';
  if ((sym >= 41 && sym <= 43) || (sym >= 51 && sym <= 53)) return 'snow';
  if (sym >= 61 && sym <= 64) return 'thunder';
  if ((sym >= 71 && sym <= 73) || (sym >= 81 && sym <= 83)) return 'sleet';
  if (sym === 91 || sym === 92) return 'fog';
  return 'cloudy';
}

const PRECIP = new Set(['showers', 'rain', 'snow', 'sleet', 'thunder']);
export const isWet = (r) => r.mm >= WET_MM;

/** The word for what is falling. Showers and thunder read as rain in a headline. */
function fallWord(rows) {
  const counts = {};
  for (const r of rows) {
    const k = kind(r.sym);
    const w = k === 'snow' ? 'Snow' : k === 'sleet' ? 'Sleet' : 'Rain';
    counts[w] = (counts[w] ?? 0) + r.mm;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Rain';
}

const hh = (t) => `${String(new Date(t).getHours()).padStart(2, '0')}:00`;
const hourStart = (t) => { const d = new Date(t); d.setMinutes(0, 0, 0); return +d; };
const dayStart = (t, off = 0) => { const d = new Date(t); return +new Date(d.getFullYear(), d.getMonth(), d.getDate() + off); };

/**
 * The next-12-hours headline, verdict style: what changes and when.
 *   wet now   "Rain until 22:00" · "Rain all evening"
 *   dry now   "Rain from 15:00"  · "Dry" + the sky
 */
export function outlook(forecast, now = Date.now(), { horizon = 12 } = {}) {
  const rows = forecast.between(hourStart(now), now + horizon * HOUR);
  if (!rows.length) return { head: 'No forecast', sub: '', state: 'none' };
  const wetNow = isWet(rows[0]);
  const windMax = Math.max(...rows.map((r) => r.wind ?? 0));
  const windTxt = windMax >= 10 ? ` · wind up to ${Math.round(windMax)} m/s` : '';

  if (wetNow) {
    const i = rows.findIndex((r) => !isWet(r));
    const wet = i < 0 ? rows : rows.slice(0, i);
    const word = fallWord(wet);
    const peak = wet.reduce((a, b) => (b.mm > a.mm ? b : a));
    const head = i < 0 ? `${word} for the next ${horizon} h` : `${word} until ${hh(rows[i].t)}`;
    const after = i < 0 ? '' : ` · then ${skyWord(rows.slice(i, i + 4))}`;
    return { state: 'wet', head, until: i < 0 ? null : rows[i].t,
             sub: `Heaviest ${peak.mm.toFixed(1)} mm/h around ${hh(peak.t)}${after}${windTxt}`, rows };
  }
  const i = rows.findIndex(isWet);
  if (i >= 0) {
    const j = rows.findIndex((r, k) => k > i && !isWet(r));
    const wet = rows.slice(i, j < 0 ? undefined : j);
    const word = fallWord(wet);
    const mm = wet.reduce((s, r) => s + r.mm, 0);
    return { state: 'coming', head: `${word} from ${hh(rows[i].t)}`, from: rows[i].t,
             sub: `${j < 0 ? 'Into the night' : `Until ${hh(rows[j].t)}`} · ${mm.toFixed(0) === '0' ? '< 1' : mm.toFixed(0)} mm${windTxt}`, rows };
  }
  // fog is the one dry condition worth a headline, because it lifts
  if (kind(rows[0].sym) === 'fog') {
    const j = rows.findIndex((r) => kind(r.sym) !== 'fog');
    return { state: 'fog', head: j < 0 ? 'Fog all day' : `Fog until ${hh(rows[j].t)}`,
             sub: j < 0 ? `No rain${windTxt}` : `then ${skyWord(rows.slice(j, j + 4))} · no rain${windTxt}`, rows };
  }
  return { state: 'dry', head: `Dry, ${skyWord(rows)}`,
           sub: `No rain in the next ${horizon} hours${windTxt}`, rows };
}

/** "clear" / "some cloud" / "cloudy" / "foggy", from the hours' symbols. */
function skyWord(rows) {
  const ks = rows.map((r) => kind(r.sym));
  const n = (k) => ks.filter((x) => x === k).length;
  if (n('fog') * 2 >= ks.length) return 'foggy';
  if (n('clear') * 2 >= ks.length) return rows.every((r) => r.night) ? 'clear' : 'sunny';
  if (n('cloudy') * 2 >= ks.length) return 'cloudy';
  return 'some cloud';
}

/**
 * Today's high and low: what has been observed since midnight plus what is
 * forecast until the next one, so at 16:00 the "high" is not just this
 * morning's and at 08:00 the "low" is not just last night's.
 */
export function todayRange(weather, forecast, now = Date.now()) {
  const d0 = dayStart(now), d1 = dayStart(now, 1);
  const seen = (weather?.rows ?? []).filter((r) => r.t >= d0 && r.t2m != null).map((r) => r.t2m);
  const ahead = forecast.between(now, d1).map((r) => r.temp);
  const all = [...seen, ...ahead];
  return all.length ? { min: Math.min(...all), max: Math.max(...all) } : null;
}

/**
 * The representative sky for a block of hours: if it is wet for a couple of
 * hours, the kind of wet; otherwise the commonest sky. The block's night flag
 * follows its majority so an evening block after sunset gets a moon.
 */
export function blockKind(rows) {
  const wet = rows.filter(isWet);
  const pool = wet.length >= 2 ? wet : rows.filter((r) => !isWet(r));
  const counts = {};
  for (const r of pool.length ? pool : rows) {
    // a "light rain" symbol on a dry hour is a trace; draw it as the cloud it is
    let k = kind(r.sym);
    if (wet.length < 2 && PRECIP.has(k)) k = 'cloudy';
    counts[k] = (counts[k] ?? 0) + 1;
  }
  let k = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'cloudy';
  if (wet.length >= 2 && !PRECIP.has(k)) k = 'rain';
  return { kind: k, night: rows.filter((r) => r.night).length * 2 > rows.length };
}

/**
 * The next three parts of the day after the current one: Evening 18–24,
 * Night 00–06, Morning 06–12, Afternoon 12–18. Past midnight the night is
 * "Tonight" until 06:00. Each carries its sky, the temperature that matters
 * for it (the low for the night, the high otherwise) and total rain.
 */
const PARTS = [
  { name: 'Night', from: 0, to: 6, pick: 'min' },
  { name: 'Morning', from: 6, to: 12, pick: 'max' },
  { name: 'Afternoon', from: 12, to: 18, pick: 'max' },
  { name: 'Evening', from: 18, to: 24, pick: 'max' },
];

export function dayParts(forecast, now = Date.now(), count = 3) {
  const out = [];
  const h = new Date(now).getHours();
  let day = 0, p = PARTS.findIndex((x) => h >= x.from && h < x.to);
  // the current part only if most of it is still ahead, otherwise start at the next
  if (h - PARTS[p].from >= 3) { p += 1; if (p === PARTS.length) { p = 0; day = 1; } }
  while (out.length < count) {
    const part = PARTS[p];
    const d0 = dayStart(now, day);
    const from = Math.max(now, d0 + part.from * HOUR);
    const rows = forecast.between(hourStart(from), d0 + part.to * HOUR);
    if (rows.length) {
      const temps = rows.map((r) => r.temp);
      const mm = rows.reduce((s, r) => s + r.mm, 0);
      out.push({
        // the first night ahead is "Tonight", whichever side of midnight it is
        label: part.name === 'Night' && !out.some((o) => o.pick === 'min') ? 'Tonight' : part.name,
        ...blockKind(rows), pick: part.pick,
        temp: part.pick === 'min' ? Math.min(...temps) : Math.max(...temps),
        mm, rows,
      });
    }
    p += 1; if (p === PARTS.length) { p = 0; day += 1; }
    if (day > 2) break;
  }
  return out;
}

/** Tomorrow's daytime (06–21) at a glance: sky, low to high, rain. */
export function tomorrow(forecast, now = Date.now()) {
  const d1 = dayStart(now, 1);
  const all = forecast.between(d1, d1 + 24 * HOUR);
  const day = forecast.between(d1 + 6 * HOUR, d1 + 21 * HOUR);
  if (!day.length) return null;
  const temps = all.map((r) => r.temp);
  return { ...blockKind(day), min: Math.min(...temps), max: Math.max(...temps),
           mm: day.reduce((s, r) => s + r.mm, 0) };
}

/**
 * Sunrise and sunset for a day, by the standard sunrise equation (NOAA's
 * simplified form, good to a minute or two at this latitude). FMI's forecast
 * does not carry them. Returns ms timestamps, or null for polar day / night,
 * which Espoo at 60°N never quite reaches.
 */
export function sunTimes(t = Date.now(), lat = 60.178, lon = 24.787) {
  const rad = Math.PI / 180;
  const d = new Date(t);
  const noon = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const n = Math.round(noon / 86400000 + 2440587.5 - 2451545.0 + 0.0008);
  const Js = n - lon / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360;
  const Cc = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const L = (M + Cc + 180 + 102.9372) % 360;
  const Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
  const dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
  const cosW = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
  if (cosW < -1 || cosW > 1) return null;
  const w = Math.acos(cosW) / rad;
  const ms = (J) => (J - 2440587.5) * 86400000;
  return { rise: ms(Jt - w / 360), set: ms(Jt + w / 360) };
}

/** One summary per local calendar day: sky over the daytime, low, high, rain. */
export function days(forecast, now = Date.now(), count = 6) {
  const out = [];
  for (let i = 0; i < count + 1 && out.length < count; i++) {
    const d0 = dayStart(now, i), d1 = dayStart(now, i + 1);
    const all = forecast.between(d0, d1);
    if (all.length < (i === 0 ? 1 : 18)) continue;      // a partial last day would lie about its low
    const day = all.filter((r) => { const h = new Date(r.t).getHours(); return h >= 7 && h <= 20; });
    const temps = all.map((r) => r.temp);
    out.push({ t: d0, ...blockKind(day.length ? day : all), night: false,
               min: Math.min(...temps), max: Math.max(...temps),
               mm: all.reduce((s, r) => s + r.mm, 0) });
  }
  return out;
}
