/**
 * Rolling per-device history, for sparklines.
 *
 * Seeded with a plausible 24 h curve on start so a freshly loaded dashboard has
 * a trend to draw instead of a single dot, then topped up from the bus.
 */

export function createHistory(bus, ids, {
  points = 96,                  // 24 h at 15 min
  stepMs = 15 * 60 * 1000,
  key = 'temperature',
} = {}) {
  const series = new Map();

  for (const id of ids) {
    const now = bus.get(id)?.[key] ?? 0;
    const indoor = id !== 'climate.outdoor' && id !== 'climate.balcony';
    const amp = indoor ? 0.6 : 3.2;
    const swingAt = (hoursAgo) => Math.sin(((24 - hoursAgo - 9) / 24) * Math.PI * 2);
    const nowSwing = swingAt(0);
    const arr = [];
    for (let i = points - 1; i >= 0; i--) {
      // Shallow diurnal swing, expressed as a delta from the swing at "now", so
      // the curve arrives at the live value instead of being snapped to it (a
      // snapped last point puts a visible step in the sparkline tip).
      const hoursAgo = (i * stepMs) / 3.6e6;
      const noise = (Math.random() - 0.5) * (indoor ? 0.25 : 0.5) * (i === 0 ? 0 : 1);
      arr.push(now + (swingAt(hoursAgo) - nowSwing) * amp + noise);
    }
    series.set(id, arr);
  }

  let last = Date.now();
  bus.subscribe(({ id, state }) => {
    if (!series.has(id) || state[key] == null) return;
    const arr = series.get(id);
    arr[arr.length - 1] = state[key];       // always keep the tip live
    if (Date.now() - last >= stepMs) {      // and roll the window on schedule
      last = Date.now();
      arr.push(state[key]);
      while (arr.length > points) arr.shift();
    }
  });

  return {
    get: (id) => series.get(id) ?? [],
    /** Last `n` samples, for a short sparkline. */
    tail: (id, n) => (series.get(id) ?? []).slice(-n),
    range: (id) => {
      const a = series.get(id) ?? [];
      return a.length ? { min: Math.min(...a), max: Math.max(...a) } : { min: 0, max: 0 };
    },
  };
}
