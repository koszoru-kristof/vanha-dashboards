import './eink.css';
import plan from '../../data/floorplan.json';
import { buildDevices } from '../devices.js';
import { createBus } from '../state.js';
import { startMock } from '../adapters/mock.js';
import { startPriceFeed } from '../adapters/porssisahko.js';
import { createWeatherStore, startWeatherFeed, createForecastStore, startForecastFeed } from '../adapters/fmi.js';
import { createHistory } from '../history.js';
import { createPriceStore, verdict } from '../prices.js';
import { DESIGNS } from './designs.js';
import { PLAN_DESIGNS } from './designs-plan.js';
import { PRICE_DESIGNS } from './designs-price.js';
import { FORECAST_DESIGNS } from './designs-forecast.js';

/* Same registry and same mock as the 3D view — these are candidate renderings
   of live device state, not mockups with invented numbers. Prices are the real
   Nord Pool FI day-ahead series when the feed is reachable. */
const bus = createBus(buildDevices(plan));
startMock(bus, { interval: 2000 });
const prices = createPriceStore();
startPriceFeed(prices);
/* Real FMI observations and forecast, used by the forecast studies only; the
   climate studies keep the mock outdoor so they stay comparable. Not given
   the bus, or the mock and FMI would fight over climate.outdoor. */
const weather = createWeatherStore();
const forecast = createForecastStore();
startWeatherFeed(weather, null);
startForecastFeed(forecast);

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

/* ?at=HH[:MM] freezes the clock for the price studies, so a verdict other than
   the one the current hour produces can be looked at. */
const params = new URLSearchParams(location.search);
function nowMs() {
  const at = params.get('at');
  if (!at) return Date.now();
  const [hh, mm = '0'] = at.split(':');
  const d = new Date();
  d.setHours(+hh, +mm, 0, 0);
  return +d;
}

function context() {
  const d = new Date(nowMs());
  return {
    now: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
    dateLong: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    temp: (id) => bus.get(id)?.temperature ?? 0,
    hum: (id) => bus.get(id)?.humidity ?? 0,
    hist,
    rooms: ROOMS,
    outdoor: 'climate.outdoor',
    prices,
    verdict: verdict(prices, +d),
    saunaWatts: bus.byId.get('heater.sauna').watts,
    nowMs: +d,
    weather,
    forecast,
    indoorLabel: 'Indoor',
  };
}

const SECTIONS = [
  { id: 'climate', title: 'Climate', designs: [...DESIGNS, ...PLAN_DESIGNS],
    intro: 'Ten layouts for the flat’s temperatures: outdoor as the lead figure, rooms '
         + 'as tiles, meters, dots on a shared track, or the floorplan itself.' },
  { id: 'electricity', title: 'Electricity', designs: PRICE_DESIGNS,
    intro: 'Six ways to show the Finnish spot price and answer “is now a good time for '
         + 'a sauna?”. Nord Pool FI day-ahead prices, c/kWh incl. VAT; tomorrow appears '
         + 'after ~14:00. The sauna model: a 6 kW heater over a 2 h window, ≈ 6.3 kWh.' },
  { id: 'forecast', title: 'Forecast', designs: FORECAST_DESIGNS,
    intro: 'Lead + price with the “last 24 hours” block replaced by the rest of the day. '
         + 'Outdoor now and the forecast are real FMI data for Tapiola, Espoo; indoor and '
         + 'the lower half are as in Lead + price.' },
];

const root = document.getElementById('designs');
const only = params.get('only');
const draws = [];

for (const section of SECTIONS) {
  const group = document.createElement('div');
  group.className = 'group';
  group.id = section.id;
  if (!only) {
    const head = document.createElement('header');
    head.className = 'group-head';
    head.innerHTML = `<h2>${section.title}</h2><p>${section.intro}</p>`;
    group.append(head);
  }
  for (const design of section.designs) {
    if (only && design.id !== only) continue;
    const card = document.createElement('section');
    card.className = 'card';
    card.id = `d-${design.id}`;
    if (!only) {
      const head = document.createElement('header');
      head.innerHTML = `<h3>${design.name}</h3><p>${design.blurb}</p>`;
      card.append(head);
    }
    const frame = document.createElement('div');
    frame.className = 'frame';
    card.append(frame);
    group.append(card);
    draws.push(() => frame.replaceChildren(design.render(context())));
  }
  root.append(group);
}

const drawAll = () => draws.forEach((d) => d());
drawAll();
setInterval(drawAll, 4000);
prices.subscribe(drawAll);
weather.subscribe(drawAll);
forecast.subscribe(drawAll);

/* Tabs: the hash picks a section, or all of them. */
function showTab() {
  const tab = location.hash.replace('#', '') || 'all';
  document.querySelectorAll('.group').forEach((g) => {
    g.hidden = tab !== 'all' && g.id !== tab;
  });
  document.querySelectorAll('nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  window.scrollTo(0, 0);   // the hash would otherwise scroll the nav off the top
}
window.addEventListener('hashchange', showTab);
showTab();
if (only) document.body.classList.add('only');

Object.assign(window, { bus, hist, plan, prices, weather, forecast });
