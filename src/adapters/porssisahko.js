/**
 * Spot price adapter: Nord Pool FI day-ahead prices via api.porssisahko.net.
 *
 * The API has no CORS header, so a browser cannot call it directly; in dev the
 * Vite server proxies /api/porssisahko/* to it (see vite.config.js). Whatever
 * serves the e-ink panel in production does the same, server-side.
 *
 * Falls back to a synthetic two-day curve when the fetch fails, and tags the
 * store's `source` so the panel can say which one it is showing. Like the mock
 * climate adapter, this only writes through the store — the dashboard cannot
 * tell the difference.
 *
 * v1 is hourly. v2 is the 15-minute market-time-unit series (since Oct 2025);
 * both are accepted and folded to hourly means, which is the resolution a
 * sauna decision needs.
 */

const HOUR = 3600 * 1000;

export function parsePrices(json) {
  const byHour = new Map();
  for (const p of json.prices ?? []) {
    const t = new Date(p.startDate);
    t.setMinutes(0, 0, 0);
    const k = +t;
    const cur = byHour.get(k) ?? { sum: 0, n: 0 };
    cur.sum += p.price; cur.n += 1;
    byHour.set(k, cur);
  }
  return [...byHour].map(([start, { sum, n }]) => ({ start, price: sum / n }))
    .sort((a, b) => a.start - b.start);
}

/**
 * A plausible Finnish spot day: cheap night, a sharp morning peak, an afternoon
 * dip, a softer evening peak. Tomorrow appears after 14:00, as in reality.
 */
export function syntheticPrices(now = Date.now()) {
  const d = new Date(now);
  const day0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = d.getHours() >= 14 ? [0, 1] : [0];
  const out = [];
  for (const off of days) {
    const lift = off ? 1.6 : 1;            // tomorrow a touch dearer, so the comparison has a story
    for (let h = 0; h < 24; h++) {
      const start = new Date(day0.getFullYear(), day0.getMonth(), day0.getDate() + off, h);
      const night = 2.2;
      const morning = 13 * Math.exp(-((h - 8) ** 2) / 2.2);
      const evening = 8 * Math.exp(-((h - 19) ** 2) / 4.5);
      const noon = 2.5 * Math.exp(-((h - 13) ** 2) / 6);
      const wobble = Math.sin(h * 1.7 + off) * 0.4;
      out.push({ start: +start, price: Math.max(-0.1, (night + morning + evening + noon) * lift + wobble) });
    }
  }
  return out;
}

export function startPriceFeed(store, {
  url = '/api/porssisahko/v1/latest-prices.json',
  interval = 30 * 60 * 1000,
} = {}) {
  const refresh = async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pts = parsePrices(await res.json());
      if (!pts.length) throw new Error('empty');
      store.set(pts, 'porssisahko');
    } catch (err) {
      console.warn('[prices] live feed unavailable, using synthetic prices:', err.message);
      if (store.source !== 'porssisahko') store.set(syntheticPrices(), 'synthetic');
    }
  };
  refresh();
  const h = setInterval(refresh, interval);
  return () => clearInterval(h);
}
