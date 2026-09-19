/**
 * Side panel: view controls + a live list of every device, grouped by room.
 * Pure DOM, no framework. It only reads/writes through the bus, so swapping the
 * mock adapter for a real broker needs no changes here.
 */
import { DEVICE_KINDS } from './devices.js';

const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};

export function mountPanel({ bus, plan, view, onFocus }) {
  const body = document.getElementById('panel-body');
  const panel = document.getElementById('panel');
  document.getElementById('hide').onclick = () => panel.classList.add('hidden');
  document.getElementById('toggle').onclick = () => panel.classList.remove('hidden');

  /* ---- view controls ---- */
  const vg = el('div', 'group');
  vg.append(el('h2', null, 'View'));
  const vc = el('div', 'controls');

  const checkbox = (label, key) => {
    const l = el('label');
    const i = el('input');
    i.type = 'checkbox';
    i.checked = view[key];
    i.onchange = () => view.set(key, i.checked);
    l.append(i, el('span', null, label));
    return l;
  };

  const cutRow = el('label');
  const cut = el('input');
  cut.type = 'range';
  cut.min = '0.6'; cut.max = '2.6'; cut.step = '0.05';
  cut.value = String(view.cut);
  const cutVal = el('span', null, `${(+cut.value).toFixed(2)} m`);
  cut.oninput = () => { view.set('cut', +cut.value); cutVal.textContent = `${(+cut.value).toFixed(2)} m`; };
  cutRow.append(el('span', null, 'cut'), cut, cutVal);

  vc.append(cutRow, checkbox('room labels', 'labels'),
            checkbox('device markers', 'markers'),
            checkbox('fixtures', 'fixtures'));
  vg.append(vc);
  body.append(vg);

  /* ---- devices, grouped by room ---- */
  const roomName = Object.fromEntries(plan.rooms.map((r) => [r.id, r.name]));
  const roomArea = Object.fromEntries(plan.rooms.map((r) => [r.id, r.areaM2]));
  // Devices can live outside the flat (the outdoor feed), so the group order is
  // the plan's rooms plus any extra buckets the registry introduced.
  const planRooms = plan.rooms.map((r) => r.id);
  const order = [...planRooms, ...new Set(bus.devices
    .map((d) => d.room)
    .filter((id) => !planRooms.includes(id)))];
  const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const byRoom = new Map(order.map((id) => [id, []]));
  for (const d of bus.devices) (byRoom.get(d.room) ?? byRoom.set(d.room, []).get(d.room)).push(d);

  const refreshers = new Map();

  for (const roomId of order) {
    const list = byRoom.get(roomId);
    if (!list?.length) continue;
    const g = el('div', 'group');
    const h = el('h2');
    const area = roomArea[roomId];
    h.append(el('b', null, roomName[roomId] ?? titleCase(roomId)),
             el('span', null, area != null ? `${area} m²` : ''));
    g.append(h);
    for (const d of list) g.append(deviceRow(d));
    body.append(g);
  }

  function deviceRow(d) {
    const row = el('div', 'row clickable');
    const dot = el('i', 'dot');
    const nm = el('div', 'nm');
    nm.append(el('span', null, d.name));
    const val = el('div', 'val');
    row.append(dot, nm, val);

    const toggleCtl = d.controls.find((c) => c.kind === 'toggle');
    const sliders = d.controls.filter((c) => c.kind === 'slider');
    const readouts = d.controls.filter((c) => c.kind === 'readout');

    nm.onclick = (e) => { e.stopPropagation(); onFocus?.(d); };
    row.onclick = () => {
      if (toggleCtl) bus.toggle(d.id, toggleCtl.key, 'ui');
      else onFocus?.(d);
    };

    const sliderEls = sliders.map((c) => {
      const i = el('input');
      i.type = 'range';
      i.min = c.min; i.max = c.max; i.step = c.step;
      i.oninput = () => bus.set(d.id, { [c.key]: +i.value }, 'ui');
      i.onclick = (e) => e.stopPropagation();
      row.insertBefore(i, val);
      return [c, i];
    });

    const refresh = () => {
      const s = bus.get(d.id);
      const active = toggleCtl ? !!s[toggleCtl.key] : sliders.length
        ? +s[sliders[0].key] > 0 : false;
      const alerting = (s.wet === true) || (s.alarm === true);
      dot.className = `dot${alerting ? ' alert' : active ? ' on' : ''}`;
      row.classList.toggle('on', active || alerting);

      const parts = [];
      if (toggleCtl) {
        const [off, on] = toggleCtl.labels ?? ['off', 'on'];
        parts.push(s[toggleCtl.key] ? on : off);
      }
      for (const [c, i] of sliderEls) if (+i.value !== +s[c.key]) i.value = s[c.key];
      for (const c of readouts) parts.push(`${(+s[c.key]).toFixed(c.digits ?? 0)}${c.unit ?? ''}`);
      if (!toggleCtl && !readouts.length && sliders.length) {
        const c = sliders[0];
        parts.push(`${(+s[c.key]).toFixed(0)}${c.unit ?? ''}`);
      }
      val.textContent = parts.join(' · ');
      nm.title = `${d.id} — ${DEVICE_KINDS[d.kind]?.label ?? d.kind}`;
    };

    refresh();
    refreshers.set(d.id, refresh);
    return row;
  }

  bus.subscribe(({ id }) => refreshers.get(id)?.());

  return { refreshAll: () => refreshers.forEach((f) => f()) };
}

/** Small floating tooltip that follows the pointer over 3D objects. */
export function makeHover() {
  const node = document.getElementById('hover');
  return {
    show(text, x, y) {
      node.textContent = text;
      node.style.display = 'block';
      node.style.left = `${x + 14}px`;
      node.style.top = `${y + 14}px`;
    },
    hide() { node.style.display = 'none'; },
  };
}
