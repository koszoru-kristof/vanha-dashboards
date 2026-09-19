/**
 * Example automations — this is the bit you are meant to play with.
 *
 * They are ordinary bus subscriptions: react to a device change, write another
 * device. Nothing here knows whether the trigger came from the mock adapter,
 * a click in the 3D view, or a real MQTT message.
 */

export function installAutomations(bus) {
  const off = [];
  const timers = new Map();

  const after = (key, ms, fn) => {
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(fn, ms));
  };

  // 1. Hall motion turns the hall light on, and off again 25 s after it clears.
  off.push(bus.on('motion.hall', ({ state }) => {
    if (state.detected) {
      clearTimeout(timers.get('hall'));
      bus.set('light.hall', { on: true }, 'automation');
    } else {
      after('hall', 25_000, () => bus.set('light.hall', { on: false }, 'automation'));
    }
  }));

  // 2. Same for the bathroom, plus boost the extract fan while it is occupied.
  off.push(bus.on('motion.bathroom', ({ state }) => {
    if (state.detected) {
      clearTimeout(timers.get('bath'));
      bus.set('light.bathroom', { on: true }, 'automation');
      bus.set('vent.bathroom', { flow: 30 }, 'automation');
    } else {
      after('bath', 120_000, () => {
        bus.set('light.bathroom', { on: false }, 'automation');
        bus.set('vent.bathroom', { flow: 18 }, 'automation');
      });
    }
  }));

  // 3. Humidity above 75 % in the bathroom boosts extract until it drops.
  off.push(bus.on('climate.bathroom', ({ state }) => {
    const want = state.humidity > 75 ? 36 : state.humidity < 55 ? 18 : null;
    if (want != null && bus.get('vent.bathroom').flow !== want) {
      bus.set('vent.bathroom', { flow: want }, 'automation');
    }
  }));

  // 4. Any leak sensor going wet raises the alarm: lights on, appliances off.
  for (const d of bus.devices.filter((x) => x.kind === 'leak')) {
    off.push(bus.on(d.id, ({ state }) => {
      if (!state.wet || d.id === 'leak.b_shower') return;   // shower "wet" is normal
      bus.set(`light.${d.room}`, { on: true, brightness: 100 }, 'automation');
      for (const a of bus.devices.filter((x) => x.kind === 'appliance' && x.room === d.room)) {
        bus.set(a.id, { running: false }, 'automation');
      }
      console.warn(`[automation] leak detected at ${d.id}`);
    }));
  }

  // 5. Sauna heater is interlocked with the sauna door: leaving it open stops it.
  off.push(bus.on('contact.sauna_door', ({ state }) => {
    if (!state.open) return;
    after('sauna', 60_000, () => {
      if (bus.get('contact.sauna_door').open && bus.get('heater.sauna').on) {
        bus.set('heater.sauna', { on: false }, 'automation');
      }
    });
  }));

  // 6. Blinds close when the sauna/bedroom is in use at night — placeholder for
  //    whatever schedule logic you want; wired to the bedroom light for now.
  off.push(bus.on('light.bedroom', ({ state }) => {
    bus.set('blind.bedroom', { position: state.on ? 100 : 0 }, 'automation');
  }));

  return () => { off.forEach((f) => f()); timers.forEach(clearTimeout); };
}
