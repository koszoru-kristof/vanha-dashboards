/**
 * MQTT / Home Assistant seam.
 *
 * Nothing in the rest of the app knows about transports — this file is the only
 * place that would. It is intentionally not wired up yet; see README for the
 * two ways to fill it in.
 *
 *   A) MQTT over WebSockets
 *      brew install mosquitto
 *      # /opt/homebrew/etc/mosquitto/mosquitto.conf
 *      #   listener 1883
 *      #   listener 9001
 *      #   protocol websockets
 *      #   allow_anonymous true
 *      brew services start mosquitto
 *      npm install mqtt
 *
 *   B) Home Assistant WebSocket API
 *      Create a long-lived access token in your HA profile and map
 *      entity_id -> device id below.
 *
 * Topic convention assumed here: `flat/<deviceId>/state` carries a JSON object
 * that is merged into the device state, and `flat/<deviceId>/set` is what the
 * UI publishes when someone changes something.
 */

export const TOPIC_PREFIX = 'flat';

/**
 * @param {ReturnType<import('../state.js').createBus>} bus
 * @param {{url?: string, prefix?: string}} opts
 */
export async function connectMqtt(bus, { url = 'ws://localhost:9001', prefix = TOPIC_PREFIX } = {}) {
  const { default: mqtt } = await import('mqtt');   // npm install mqtt
  const client = mqtt.connect(url);

  client.on('connect', () => {
    client.subscribe(`${prefix}/+/state`);
    // announce what we have, so a broker-side consumer can discover devices
    for (const d of bus.devices) {
      client.publish(`${prefix}/${d.id}/config`,
        JSON.stringify({ id: d.id, name: d.name, kind: d.kind, room: d.room }),
        { retain: true });
    }
  });

  client.on('message', (topic, payload) => {
    const id = topic.slice(prefix.length + 1, -'/state'.length);
    if (!bus.byId.has(id)) return;
    try {
      bus.set(id, JSON.parse(payload.toString()), 'mqtt');
    } catch {
      console.warn(`[mqtt] bad payload on ${topic}`);
    }
  });

  // echo local changes outward, but never re-publish what we just received
  bus.subscribe(({ id, state, origin }) => {
    if (origin === 'mqtt') return;
    client.publish(`${prefix}/${id}/set`, JSON.stringify(state));
  });

  return () => client.end();
}
