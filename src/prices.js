/**
 * Spot electricity prices and the "is it a good time for a sauna" model.
 *
 * Finland is one Nord Pool bidding zone (FI). Day-ahead prices for tomorrow are
 * published around 14:00 Finnish time, so from the afternoon on the dashboard
 * can compare today with tomorrow; before that, tomorrow is simply unknown.
 *
 * Prices here are c/kWh **including VAT (25.5 %)**, which is what Finnish
 * consumer apps show and what porssisahko.net serves. Transfer fee and
 * electricity tax are added on top by the DSO and do not vary by hour, so they
 * never affect *when* to run the sauna — only what a session costs in euros.
 *
 * Nothing in here knows where prices come from; src/adapters/ fills the store.
 */

/* c/kWh incl. VAT. Absolute bands, so a "cheap" hour means the same thing on a
   stormy day as on a still one; the relative ranking (cheapest window today)
   is computed separately. Tune to taste. */
export const BANDS = { cheap: 5, dear: 15 };

/* Transfer + electricity tax, c/kWh incl. VAT. Caruna Espoo night/day transfer
   averages ~4.5 c and the tax is 2.83 c — a round 7.5 c is close enough for a
   session estimate. Replace with the figure on your own bill. */
export const FIXED_C_PER_KWH = 7.5;

/* A sauna session, for the cost model. A 1.8 m² sauna has a 6 kW heater
   (registered on heater.sauna); it runs flat out for the warm-up and then
   cycles on the thermostat, so ~70 % duty over the whole session. The session
   is evaluated over a 2 h price window because 1.5 h straddles hour boundaries.
   Candidate start hours are restricted to waking hours — a 03:00 window may be
   the cheapest of the day, but it is not a sauna time. */
export const SAUNA = { hours: 1.5, duty: 0.7, window: 2, startHours: [7, 22] };

export const sessionKWh = (watts) => (watts / 1000) * SAUNA.hours * SAUNA.duty;

/** Euros for a session at an average spot price (c/kWh), fixed charges included. */
export function sessionCost(avgSpotC, watts, { fixed = true } = {}) {
  const c = avgSpotC + (fixed ? FIXED_C_PER_KWH : 0);
  return (c * sessionKWh(watts)) / 100;
}

export const band = (price) =>
  price == null ? null : price <= BANDS.cheap ? 'cheap' : price > BANDS.dear ? 'dear' : 'normal';

const HOUR = 3600 * 1000;

/**
 * Store of hourly prices. `set()` takes [{ start: ms, price: c/kWh }] in any
 * order and any coverage; the queries below slice it by local calendar day.
 */
export function createPriceStore() {
  let points = new Map();     // start ms -> price
  let source = 'none';
  let fetchedAt = null;
  const subs = new Set();

  const dayStart = (offset, now) => {
    const d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
  };

  const store = {
    set(list, src = 'unknown') {
      points = new Map(list.map((p) => [+p.start, p.price]));
      source = src;
      fetchedAt = Date.now();
      for (const fn of subs) fn(store);
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    get source() { return source; },
    get fetchedAt() { return fetchedAt; },
    get size() { return points.size; },

    /** Price for the hour containing `t` (ms), or null. */
    at(t = Date.now()) {
      const d = new Date(t);
      d.setMinutes(0, 0, 0);
      return points.get(+d) ?? null;
    },

    /**
     * The 24 hours of a local calendar day (0 = today, 1 = tomorrow), as
     * [{ hour, start, price }], price null where the feed has no value. Empty
     * if the day is not usable: every hour from now on (all 24 for a future
     * day) must be present — a half-published day would draw as a cliff, which
     * reads as a price crash. Hours already in the past may be missing, since
     * a rolling 48 h feed drops them first. Built with Date arithmetic so DST
     * days (23 / 25 h) do not shift the grid.
     */
    hourly(offset = 0, now = Date.now()) {
      const d0 = dayStart(offset, now);
      const need = offset === 0 ? new Date(now).getHours() : 0;
      const out = [];
      for (let h = 0; h < 24; h++) {
        const start = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), h);
        const price = points.get(+start) ?? null;
        if (price == null && h >= need) return [];
        out.push({ hour: h, start: +start, price });
      }
      return out;
    },

    /** Contiguous windows of `n` hours in a day, with the mean price of each. */
    windows(offset, n = SAUNA.window, { notBefore = null, startHours = SAUNA.startHours, now = Date.now() } = {}) {
      const day = store.hourly(offset, now);
      const out = [];
      for (let i = 0; i + n <= day.length; i++) {
        const h = day[i].hour;
        if (h < startHours[0] || h >= startHours[1]) continue;
        if (notBefore != null && day[i].start < notBefore) continue;
        const slice = day.slice(i, i + n);
        if (slice.some((p) => p.price == null)) continue;
        out.push({
          offset, i0: i, i1: i + n - 1, hour: h, start: day[i].start,
          avg: slice.reduce((s, p) => s + p.price, 0) / n,
        });
      }
      return out;
    },

    best(offset, opts) {
      const w = store.windows(offset, SAUNA.window, opts);
      return w.length ? w.reduce((a, b) => (b.avg < a.avg ? b : a)) : null;
    },

    stats(offset = 0, now = Date.now()) {
      const day = store.hourly(offset, now).filter((p) => p.price != null);
      if (!day.length) return null;
      const ps = day.map((p) => p.price);
      const min = day[ps.indexOf(Math.min(...ps))];
      const max = day[ps.indexOf(Math.max(...ps))];
      return { min, max, avg: ps.reduce((a, b) => a + b, 0) / ps.length };
    },
  };
  return store;
}

/**
 * The decision. Returns one of
 *   now       start the sauna now
 *   wait      a clearly cheaper window comes later today
 *   tomorrow  tomorrow has a clearly cheaper window than anything left today
 *   later     nothing cheap left today; the least bad remaining window
 *   done      today's sauna hours are over; points at tomorrow if published
 *   none      no prices at all
 * "Clearly cheaper" is 30 % cheaper AND at least 1 c — on a near-zero day like
 * a windy Sunday every hour is cheap and the answer should just be "now".
 */
export function verdict(store, now = Date.now()) {
  const today = store.hourly(0, now);
  if (!today.length) return { state: 'none' };

  const d = new Date(now);
  const hour = d.getHours();
  const hourStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour);
  const nowWin = store.windows(0, SAUNA.window, { notBefore: +hourStart, startHours: [0, 24], now })
    .find((w) => w.hour === hour) ?? null;
  const bestToday = store.best(0, { notBefore: +hourStart, now });
  const bestTomorrow = store.best(1, { now });
  const nowPrice = store.at(now);

  const clearly = (a, b) => b != null && a != null && b.avg < a.avg * 0.7 && b.avg < a.avg - 1;
  const inHours = hour >= SAUNA.startHours[0] && hour < SAUNA.startHours[1];

  const base = { nowPrice, nowWin, bestToday, bestTomorrow, hour };
  if (!inHours || !nowWin) {
    if (hour >= SAUNA.startHours[1] || !bestToday) {
      return { ...base, state: 'done', window: bestTomorrow };
    }
    return { ...base, state: 'wait', window: bestToday };   // too early: first sensible window
  }
  if (bestToday && !clearly(nowWin, bestToday)) {
    if (clearly(nowWin, bestTomorrow) && nowWin.avg > BANDS.cheap) {
      return { ...base, state: 'tomorrow', window: bestTomorrow };
    }
    return { ...base, state: 'now', window: nowWin };
  }
  if (bestToday && clearly(nowWin, bestToday)) {
    if (clearly(bestToday, bestTomorrow) && bestToday.avg > BANDS.cheap) {
      return { ...base, state: 'tomorrow', window: bestTomorrow };
    }
    return { ...base, state: bestToday.avg > BANDS.dear ? 'later' : 'wait', window: bestToday };
  }
  return { ...base, state: 'now', window: nowWin };
}

const hh = (h) => `${String(h).padStart(2, '0')}:00`;

/** Short copy for the verdict, sized for a headline plus one line of detail. */
export function verdictText(v, watts) {
  const cost = (w) => (w ? `≈ ${sessionCost(w.avg, watts).toFixed(2)} €` : '');
  switch (v.state) {
    case 'none':
      return { head: 'No prices', sub: 'Waiting for the day-ahead feed' };
    case 'now':
      return { head: 'Good now', sub: `Next 2 h average ${v.nowWin.avg.toFixed(1)} c · session ${cost(v.nowWin)}` };
    case 'wait':
      return { head: `Wait until ${hh(v.window.hour)}`, sub: `${v.window.avg.toFixed(1)} c then · session ${cost(v.window)}` };
    case 'later':
      return { head: `Pricey today`, sub: `Least bad from ${hh(v.window.hour)} at ${v.window.avg.toFixed(1)} c · ${cost(v.window)}` };
    case 'tomorrow':
      return { head: `Tomorrow ${hh(v.window.hour)}`, sub: `${v.window.avg.toFixed(1)} c then, vs ${(v.nowWin ?? v.bestToday).avg.toFixed(1)} c today · session ${cost(v.window)}` };
    case 'done':
      return v.window
        ? { head: `Tomorrow ${hh(v.window.hour)}`, sub: `${v.window.avg.toFixed(1)} c · session ${cost(v.window)}` }
        : { head: 'Not today', sub: 'Tomorrow’s prices arrive around 14:00' };
  }
  return { head: '', sub: '' };
}
