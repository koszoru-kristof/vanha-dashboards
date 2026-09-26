/**
 * The real panel: Lead + price and its forecast variants on live data, one
 * 800x480 page and nothing else.
 *
 *   outdoor   FMI observations, Espoo Tapiola station     src/adapters/fmi.js
 *   forecast  FMI edited point forecast, same spot         src/adapters/fmi.js
 *   prices    Nord Pool FI day-ahead via porssisahko.net   src/adapters/porssisahko.js
 *   indoor    still the mock until the room sensors exist, and labelled as such
 *
 * Which view:
 *   /views/<id> or ?view=<id>   that one view, always
 *   otherwise                   cycle through all of them, ?every=<seconds> each
 *                               (default 60). The view is picked from the clock,
 *                               so the page and /panel.png agree without talking.
 * In a browser, click or the arrow keys step to the next / previous view.
 *
 * Served by server/index.mjs on the home machine; an e-ink device either opens
 * this page in its own browser or fetches /panel.png, which is this page
 * screenshotted server-side.
 */
import '../dashboard/eink.css';
import plan from '../../data/floorplan.json';
import { buildDevices } from '../devices.js';
import { createBus } from '../state.js';
import { startMock } from '../adapters/mock.js';
import { startPriceFeed } from '../adapters/porssisahko.js';
import { createWeatherStore, startWeatherFeed, createForecastStore, startForecastFeed } from '../adapters/fmi.js';
import { createPriceStore, verdict } from '../prices.js';
import { leadPrice } from '../dashboard/designs-price.js';
import { FORECAST_DESIGNS } from '../dashboard/designs-forecast.js';

export const VIEWS = [leadPrice, ...FORECAST_DESIGNS];

const OUTDOOR = 'climate.outdoor';
const ROOMS = [
  { id: 'climate.living',   label: 'Living' },
  { id: 'climate.bedroom',  label: 'Bedroom' },
  { id: 'climate.bathroom', label: 'Bathroom' },
  { id: 'climate.sauna',    label: 'Sauna' },
  { id: 'climate.balcony',  label: 'Balcony' },
];

const bus = createBus(buildDevices(plan));
const weather = createWeatherStore();
const forecast = createForecastStore();
const prices = createPriceStore();
startWeatherFeed(weather, bus);
startForecastFeed(forecast);
startPriceFeed(prices);
/* Indoor only. Slow, because each redraw costs an e-ink refresh. */
startMock(bus, { interval: 60 * 1000, outdoor: false });

/* Lead reads its sparkline and high/low through ctx.hist. Outdoor is the real
   24 h FMI series; nothing else on these layouts uses history. */
const hist = {
  get: (id) => (id === OUTDOOR ? weather.series() : []),
  range: (id) => (id === OUTDOOR ? weather.range() : { min: NaN, max: NaN }),
};

const pad2 = (n) => String(n).padStart(2, '0');

function alert(view) {
  const out = [];
  if (weather.source !== 'fmi') out.push('No weather');
  if (view !== leadPrice && forecast.source !== 'fmi') out.push('No forecast');
  if (prices.source !== 'porssisahko') out.push('No prices');
  return out.join(' · ') || null;
}

function context(view) {
  const d = new Date();
  return {
    now: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
    temp: (id) => (id === OUTDOOR ? weather.latest?.t2m ?? NaN : bus.get(id)?.temperature ?? NaN),
    hum: (id) => (id === OUTDOOR && weather.source !== 'fmi' ? NaN : bus.get(id)?.humidity ?? NaN),
    hist,
    rooms: ROOMS,
    outdoor: OUTDOOR,
    prices,
    weather,
    forecast,
    verdict: verdict(prices, +d),
    saunaWatts: bus.byId.get('heater.sauna').watts,
    nowMs: +d,
    alert: alert(view),
    indoorLabel: 'Indoor · simulated',
  };
}

/* ------------------------------------------------------------ view pick */

const params = new URLSearchParams(location.search);
const fixedId = location.pathname.match(/^\/views\/([\w-]+)/)?.[1] ?? params.get('view');
const fixed = VIEWS.find((v) => v.id === fixedId) ?? null;
if (fixedId && !fixed) console.warn(`[panel] unknown view "${fixedId}"; cycling instead`);
const every = Math.max(10, Number(params.get('every')) || 60) * 1000;
let manual = 0;                 // steps taken with click / arrow keys

function currentView() {
  if (fixed && !manual) return fixed;
  const base = fixed ? VIEWS.indexOf(fixed) : Math.floor(Date.now() / every);
  return VIEWS[(((base + manual) % VIEWS.length) + VIEWS.length) % VIEWS.length];
}

/* ----------------------------------------------------------------- draw */

const frame = document.getElementById('panel');

/* /views on its own: a plain list of the views, for finding their URLs. */
if (/^\/views\/?$/.test(location.pathname)) {
  frame.style.cssText = 'height:auto;padding:28px;font:18px/1.6 Inter, Helvetica, Arial, sans-serif;';
  frame.innerHTML = `<h1 style="font-size:22px;margin:0 0 12px">Espoo flat — panel views</h1><ul>${
    VIEWS.map((v) => `<li><a href="/views/${v.id}">${v.name}</a> · <a href="/panel.png?view=${v.id}">png</a></li>`).join('')
  }</ul><p><a href="/">/</a> cycles through all of them, <code>?every=&lt;seconds&gt;</code> each.</p>`;
  throw new Error('index only');   // stop here: no feeds needed for a list of links
}
const ready = () => weather.source !== 'none' && prices.source !== 'none' && forecast.source !== 'none';
let shown = null;

/* Hold the first draw until every feed has answered (or failed), so the
   screenshotter never captures a half-filled panel. data-ready is what it
   waits for. */
function draw() {
  if (!ready()) return;
  const view = currentView();
  frame.replaceChildren(view.render(context(view)));
  document.body.dataset.view = view.id;
  document.body.dataset.ready = '1';
  if (shown !== view.id) { shown = view.id; document.title = `Espoo flat · ${view.name}`; }
}

weather.subscribe(draw);
forecast.subscribe(draw);
prices.subscribe(draw);

/* Redraw on the minute for the clock; when cycling, also on each view boundary. */
function tick() {
  draw();
  const toMinute = 60e3 - (Date.now() % 60e3);
  const toSwitch = fixed ? Infinity : every - (Date.now() % every);
  setTimeout(tick, Math.min(toMinute, toSwitch) + 50);
}
setTimeout(tick, 60e3 - (Date.now() % 60e3));

const step = (n) => { manual += n; draw(); };
addEventListener('click', () => step(1));
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') step(1);
  if (e.key === 'ArrowLeft') step(-1);
});

Object.assign(window, { bus, weather, forecast, prices, VIEWS });
