/**
 * Mock adapter: makes the model feel alive without a broker.
 *
 * It only writes through the bus, exactly like a real adapter would, so the
 * rest of the app cannot tell the difference. Delete or disable this once
 * src/adapters/mqtt.js is pointed at something real.
 */

/** A shallow diurnal swing so the outdoor reading is not a flat line. */
function diurnal(date = new Date()) {
  const hours = date.getHours() + date.getMinutes() / 60;
  return Math.sin(((hours - 9) / 24) * Math.PI * 2);   // peak mid-afternoon
}

export function startMock(bus, { interval = 1500, baseOutdoor = 8.5 } = {}) {
  const jitter = (v, amp) => v + (Math.random() - 0.5) * amp;
  const r1 = (v) => Math.round(v * 10) / 10;

  const tick = () => {
    // appliances: power follows the running flag
    for (const d of bus.devices) {
      if (d.kind !== 'appliance') continue;
      const s = bus.get(d.id);
      const target = s.running ? d.busyW * (0.85 + Math.random() * 0.3) : d.idleW;
      bus.set(d.id, { power: Math.round(target * 10) / 10 }, 'mock');
    }

    // outdoor drifts around a shallow day/night curve; the glazed balcony sits
    // a few degrees above it and correspondingly drier
    const outdoorT = r1(baseOutdoor + diurnal() * 3.2 + (Math.random() - 0.5) * 0.3);
    const outdoorH = Math.round(jitter(72 - diurnal() * 8, 3));
    bus.set('climate.outdoor', { temperature: outdoorT, humidity: outdoorH }, 'mock');
    bus.set('climate.balcony', {
      temperature: r1(outdoorT + 3.4),
      humidity: Math.max(25, outdoorH - 14),
    }, 'mock');

    // sauna heats toward its setpoint and cools back to room temperature
    {
      const h = bus.get('heater.sauna');
      const c = bus.get('climate.sauna');
      const goal = h.on ? h.target : 22;
      const rate = h.on ? 0.06 : 0.02;
      bus.set('climate.sauna', {
        temperature: r1(c.temperature + (goal - c.temperature) * rate),
        humidity: Math.round(Math.max(12, 45 - (c.temperature - 22) * 0.35)),
      }, 'mock');
    }

    // an open window or balcony door pulls the room toward outdoor conditions
    for (const [climateId, contactId] of [
      ['climate.living', 'contact.living_window'],
      ['climate.bedroom', 'contact.bedroom_window'],
    ]) {
      const c = bus.get(climateId);
      const open = bus.get(contactId).open;
      const goal = open ? outdoorT : 21.3;
      bus.set(climateId, {
        temperature: r1(jitter(c.temperature + (goal - c.temperature) * 0.05, 0.04)),
        humidity: Math.round(c.humidity + (open ? outdoorH - c.humidity : 38 - c.humidity) * 0.05),
      }, 'mock');
    }

    // bathroom humidity rises while the shower is wet, falls with extract running
    {
      const c = bus.get('climate.bathroom');
      const showering = bus.get('leak.b_shower').wet;
      const flow = bus.get('vent.bathroom').flow;
      const goal = showering ? 88 : 46 - flow * 0.3;
      bus.set('climate.bathroom', {
        temperature: r1(jitter(c.temperature, 0.06)),
        humidity: Math.round(c.humidity + (goal - c.humidity) * 0.12),
      }, 'mock');
    }
  };

  tick();
  const h = setInterval(tick, interval);
  return () => clearInterval(h);
}
