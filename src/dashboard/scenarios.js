/**
 * Synthetic scenarios for the design studies: whole days that exercise the
 * range a panel has to handle — a storm with an evening price spike, a dark
 * −20 °C cold snap with dear power all day, a sunny Sunday with negative
 * prices, a sleety spring morning, a still foggy dawn.
 *
 * Each one builds the same stores the live adapters fill (observations,
 * forecast, prices), with the clock frozen at a moment in the right season, so
 * sunrise and sunset, the sauna verdict and every derived figure come out of
 * the real code paths. Nothing here is drawn; it is only data.
 */
import { createPriceStore, verdict } from '../prices.js';
import { createWeatherStore, createForecastStore } from '../adapters/fmi.js';
import { sunTimes } from '../weather.js';

const HOUR = 3600e3;
const hourStart = (t) => { const d = new Date(t); d.setMinutes(0, 0, 0); return +d; };
const gauss = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
const hourOf = (t) => new Date(t).getHours() + new Date(t).getMinutes() / 60;

/*
 * A spec gives functions of `x`, hours from now (negative = past), and `t`,
 * the timestamp. sym uses FMI WeatherSymbol3 codes (see src/adapters/fmi.js).
 * price(hour, dayOffset) is c/kWh incl. VAT for that local hour.
 */
export const SCENARIOS = {
  storm: {
    name: 'Autumn storm',
    note: 'October, 17:40. Heavy rain and gusts into the night, evening price spike.',
    at: '2026-10-18T17:40',
    temp: (x) => 9.5 - 0.08 * x + 0.8 * Math.sin(x / 5) - (x > 20 ? (x - 20) * 0.15 : 0),
    rh: () => 94,
    wind: (x) => 9 + 9 * gauss(x, 3, 4),
    mm: (x) => (x > -1 && x < 7 ? 1.2 + 4.5 * gauss(x, 2.5, 1.8) : x >= 7 && x < 9 ? 0.4 : 0),
    sym: (x, mm) => (mm > 3 && x > 1 && x < 3 ? 61 : mm >= 2 ? 33 : mm >= 0.4 ? 32 : mm > 0 ? 21 : x < 30 ? 3 : 2),
    price: (h, d) => (d ? 3 + 6 * gauss(h, 8, 2) + 5 * gauss(h, 18, 2) : 2.5 + 9 * gauss(h, 8, 1.6) + 26 * gauss(h, 18.5, 1.6)),
  },
  frost: {
    name: 'Cold snap',
    note: 'January, 16:20, already dark. −19 °C and falling, power dear all day.',
    at: '2027-01-19T16:20',
    temp: (x) => -19 - 0.25 * Math.max(0, x) + 2.5 * Math.sin((x - 4) / 3.8) * 0.3 + (x > 30 ? (x - 30) * 0.12 : 0),
    rh: () => 78,
    wind: () => 2.5,
    mm: (x) => (x > 40 && x < 52 ? 0.5 : 0),
    sym: (x, mm) => (mm > 0 ? 51 : x > 26 && x < 40 ? 2 : 1),
    price: (h, d) => (d ? 16 + 18 * gauss(h, 9, 2.5) + 14 * gauss(h, 17, 2.5)
                       : 22 + 30 * gauss(h, 8.5, 2) + 36 * gauss(h, 17.5, 2.2) - 12 * gauss(h, 3, 1.5)),
  },
  summer: {
    name: 'Windy Sunday',
    note: 'June, 13:10. Sunny and 23 °C; wind power pushes midday prices below zero.',
    at: '2027-06-20T13:10',
    temp: (x) => { const hr = hourOf(Date.parse('2027-06-20T13:10') + x * HOUR); return 18 + 5.5 * Math.sin(((hr - 9) / 24) * 2 * Math.PI) + 0.4 * Math.sin(x); },
    rh: () => 48,
    wind: (x) => 8 - 3 * gauss(x, 12, 5),
    mm: (x) => (x > 50 && x < 55 ? 1.5 : 0),
    sym: (x, mm) => (mm > 0 ? 21 : x > 5 && x < 10 ? 2 : 1),
    price: (h, d) => (d ? 1.5 + 5 * gauss(h, 19, 2) : -0.9 + 1.2 * gauss(h, 7, 1.5) + 4.5 * gauss(h, 20, 2) - 0.8 * gauss(h, 13, 2.5)),
  },
  sleet: {
    name: 'Spring sleet',
    note: 'April, 08:15. Sleet showers through the morning peak, clearing by afternoon.',
    at: '2027-04-02T08:15',
    temp: (x) => 1.2 + 0.6 * Math.max(0, x) * (x < 7 ? 1 : 0) + (x >= 7 ? 4.2 - (x - 7) * 0.35 : 0),
    rh: () => 89,
    wind: () => 7,
    mm: (x) => (x > -2 && x < 4 ? 0.9 + 0.6 * Math.sin(x * 2) : 0),
    sym: (x, mm) => (mm > 0 ? (x < 2 ? 81 : 71) : x < 8 ? 3 : 2),
    price: (h, d) => (d ? 5 + 7 * gauss(h, 8, 1.5) : 5.5 + 14 * gauss(h, 8, 1.3) + 7 * gauss(h, 18, 2)),
  },
  fog: {
    name: 'Still fog',
    note: 'November, 07:05. Fog over the bay, no wind, flat prices around 8 c.',
    at: '2026-11-12T07:05',
    temp: (x) => 3.1 + 0.25 * Math.max(0, Math.min(x, 7)),
    rh: () => 99,
    wind: () => 0.8,
    mm: () => 0,
    sym: (x) => (x < 4 ? 91 : x < 12 ? 3 : 2),
    price: (h) => 7.5 + 1.8 * Math.sin(h / 3) + 1.2 * gauss(h, 8, 1.5),
  },
};

/** Build a ctx for `id` on top of `base` (rooms, sauna watts, indoor readings). */
export function scenarioContext(id, base) {
  const spec = SCENARIOS[id];
  if (!spec) return base;
  const now = Date.parse(spec.at);            // local time: no Z in the string

  const weather = createWeatherStore();
  const obs = [];
  for (let m = 24 * 60; m >= 0; m -= 10) {
    const t = now - m * 60e3, x = (t - now) / HOUR;
    obs.push({ t, t2m: Math.round(spec.temp(x) * 10) / 10, rh: spec.rh(x) });
  }
  weather.set(obs, 'fmi');

  const forecast = createForecastStore();
  const rows = [];
  for (let k = 1; k <= 7 * 24; k++) {
    const t = hourStart(now) + k * HOUR, x = (t - now) / HOUR;
    const sun = sunTimes(t);
    const mm = Math.max(0, Math.round(spec.mm(x) * 10) / 10);
    rows.push({ t, temp: spec.temp(x), sym: spec.sym(x, mm), night: sun ? t < sun.rise || t > sun.set : false,
                pop: mm > 0 ? 90 : 10, mm, wind: spec.wind(x) });
  }
  forecast.set(rows, 'fmi');

  const prices = createPriceStore();
  const d = new Date(now);
  const list = [];
  for (const off of new Date(now).getHours() >= 14 ? [0, 1] : [0]) {
    for (let h = 0; h < 24; h++) {
      list.push({ start: +new Date(d.getFullYear(), d.getMonth(), d.getDate() + off, h),
                  price: Math.round(spec.price(h, off) * 100) / 100 });
    }
  }
  prices.set(list, 'porssisahko');

  const pad2 = (n) => String(n).padStart(2, '0');
  return {
    ...base,
    now: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
    nowMs: now,
    weather, forecast, prices,
    verdict: verdict(prices, now),
    alert: null,
    scenario: { id, ...spec },
  };
}
