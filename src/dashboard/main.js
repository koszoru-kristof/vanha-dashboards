import './eink.css';
import plan from '../../data/floorplan.json';
import { buildDevices } from '../devices.js';
import { createBus } from '../state.js';
import { startMock } from '../adapters/mock.js';
import { createHistory } from '../history.js';
import { DESIGNS } from './designs.js';
import { PLAN_DESIGNS } from './designs-plan.js';

/* Same registry and same mock as the 3D view — these are candidate renderings
   of live device state, not mockups with invented numbers. */
const bus = createBus(buildDevices(plan));
startMock(bus, { interval: 2000 });

const ROOMS = [
  { id: 'climate.living',   label: 'Living' },
  { id: 'climate.bedroom',  label: 'Bedroom' },
  { id: 'climate.bathroom', label: 'Bathroom' },
  { id: 'climate.sauna',    label: 'Sauna' },
  { id: 'climate.balcony',  label: 'Balcony' },
];
const TRACKED = ['climate.outdoor', ...ROOMS.map((r) => r.id)];
const hist = createHistory(bus, TRACKED);

const pad2 = (n) => String(n).padStart(2, '0');

function context() {
  const d = new Date();
  return {
    now: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
    dateLong: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    temp: (id) => bus.get(id)?.temperature ?? 0,
    hum: (id) => bus.get(id)?.humidity ?? 0,
    hist,
    rooms: ROOMS,
    outdoor: 'climate.outdoor',
  };
}

const root = document.getElementById('designs');

for (const design of [...DESIGNS, ...PLAN_DESIGNS]) {
  const card = document.createElement('section');
  card.className = 'card';
  card.id = `d-${design.id}`;

  const head = document.createElement('header');
  head.innerHTML = `<h2>${design.name}</h2><p>${design.blurb}</p>`;

  const frame = document.createElement('div');
  frame.className = 'frame';

  card.append(head, frame);
  root.append(card);

  const draw = () => {
    frame.replaceChildren(design.render(context()));
  };
  draw();
  setInterval(draw, 4000);
}

Object.assign(window, { bus, hist, plan });
