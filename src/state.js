/**
 * Device state bus.
 *
 * Deliberately tiny and transport-agnostic: the 3D scene, the side panel and
 * any future MQTT / Home Assistant adapter all talk to this and nothing else.
 * That keeps the "where does state come from" question in exactly one place
 * (src/adapters/), instead of smeared across the render code.
 */

export function createBus(devices) {
  const state = new Map();
  const subs = new Set();
  const perDevice = new Map();

  for (const d of devices) state.set(d.id, { ...d.initial });

  function emit(id, next, prev, origin) {
    const ev = { id, state: next, prev, origin };
    for (const fn of subs) fn(ev);
    const list = perDevice.get(id);
    if (list) for (const fn of list) fn(ev);
  }

  return {
    devices,
    byId: new Map(devices.map((d) => [d.id, d])),

    get(id) {
      return state.get(id);
    },

    /** Merge a patch into a device's state. Origin is just a tag for tracing. */
    set(id, patch, origin = 'local') {
      const prev = state.get(id);
      if (!prev) {
        console.warn(`[bus] unknown device "${id}"`);
        return;
      }
      const next = { ...prev, ...patch };
      let changed = false;
      for (const k of Object.keys(patch)) {
        if (prev[k] !== next[k]) changed = true;
      }
      if (!changed) return;
      state.set(id, next);
      emit(id, next, prev, origin);
    },

    toggle(id, key = 'on', origin = 'local') {
      const cur = state.get(id);
      if (cur && typeof cur[key] === 'boolean') this.set(id, { [key]: !cur[key] }, origin);
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },

    on(id, fn) {
      if (!perDevice.has(id)) perDevice.set(id, new Set());
      perDevice.get(id).add(fn);
      return () => perDevice.get(id).delete(fn);
    },

    /** Plain-object dump; handy for logging or shipping to a broker on connect. */
    snapshot() {
      return Object.fromEntries([...state].map(([k, v]) => [k, { ...v }]));
    },
  };
}
