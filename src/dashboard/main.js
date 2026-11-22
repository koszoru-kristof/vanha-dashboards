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
import { leadPrice } from './designs-price.js';
import { MUTED } from './palette.js';
import { COLOUR_FRESH } from './designs-colour.js';
import { SCENARIOS, scenarioContext } from './scenarios.js';
import { PLACES, chosenPlace } from '../places.js';
import { setHome } from '../weather.js';
import { loadMap } from './maps.js';
import { PRINTS } from './prints/index.js';
import { BAUHAUS } from './bauhaus/index.js';
import { PRIMARY } from './primary/index.js';
import { POSTERS } from './posters/index.js';
import { fontsReady } from './posters/common.js';
import { E1004, e1004, pixels, FITS, MATS } from './device.js';
import { deviceStudio } from './studio.js';

/* The colour tab re-renders the wall designs with the palette's four roles
   switched on; everything else about them is identical. */
const COLOUR_DESIGNS = [leadPrice, ...FORECAST_DESIGNS].map((d) => ({
  id: `c-${d.id}`,
  name: `Colour · ${d.name.replace(/^Forecast · /, '')}`,
  blurb: d.blurb,
  colour: true,
  render: (ctx) => d.render({ ...ctx, pal: MUTED }),
}));

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
/* The place the live data is for: ?place=<id>, else the remembered choice,
   else Tapiola (src/places.js). Observations come from the nearest FMI
   station, the forecast and the sun from the place itself. */
const place = chosenPlace();
setHome(place.lat, place.lon);
const map = await loadMap(place.map);
const weather = createWeatherStore();
const forecast = createForecastStore();
startWeatherFeed(weather, null, { fmisid: place.station.id });
startForecastFeed(forecast, { latlon: place.latlon });

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
    /* the rest of the flat, for the designs that draw the house itself:
       lights, blinds, door and window contacts, appliances, radiators */
    device: (id) => bus.get(id) ?? null,
    devices: [...bus.byId.values()],
    hist,
    rooms: ROOMS,
    outdoor: 'climate.outdoor',
    prices,
    verdict: verdict(prices, +d),
    saunaWatts: bus.byId.get('heater.sauna').watts,
    nowMs: +d,
    weather,
    forecast,
    place,
    map,
    indoorLabel: 'Indoor',
  };
}

/* ?scenario=<id>|all|live picks the data for the fresh and poster tabs;
   default all. A scenario is frozen, so only the live variants redraw. */
const scenarioParam = params.get('scenario') ?? 'all';
function withScenarios(designs) {
  const ids = scenarioParam === 'all' ? Object.keys(SCENARIOS) : [scenarioParam];
  return designs.flatMap((d) => ids.map((sid) => ({
    // ?only=<design>&scenario=<id> still finds the bare design id
    id: scenarioParam === 'all' ? `${d.id}--${sid}` : d.id,
    base: d, scenario: sid, orient: d.orient,
    name: SCENARIOS[sid] ? `${d.name} · ${SCENARIOS[sid].name}` : `${d.name} · live`,
    blurb: SCENARIOS[sid] ? SCENARIOS[sid].note : d.blurb,
    live: !SCENARIOS[sid],
    render: (ctx) => d.render(scenarioContext(sid, ctx)),
  })));
}

/* The E1004 tab: every portrait poster from the four series, one scenario at
   a time (the first unless ?scenario= names one), inside the device. */
const deviceFit = FITS[params.get('fit')] ? params.get('fit') : 'native';
const deviceMat = MATS[params.get('mat')] ? params.get('mat') : 'white';
const deviceExact = params.has('exact');
const deviceScenario = scenarioParam === 'all' ? Object.keys(SCENARIOS)[0] : scenarioParam;
/* A design composed for 3:4 says so with `tall: true` and takes the size as
   render(ctx, 'tall'); the rest fall back to their 3:5 poster, fitted. */
const DEVICE_DESIGNS = [...POSTERS, ...PRINTS, ...BAUHAUS, ...PRIMARY]
  .filter((d) => d.orient === 'portrait')
  .map((d) => {
    const fit = deviceFit === 'native' && !d.tall ? 'fit' : deviceFit;
    return {
      id: `e1004-${d.id}`, base: d, orient: deviceExact ? 'exact' : 'device', scenario: deviceScenario,
      name: d.tall || deviceFit !== 'native' ? d.name : `${d.name} (3:5, fitted)`, blurb: d.blurb,
      live: !SCENARIOS[deviceScenario],
      render: (ctx) => {
        const poster = d.render(scenarioContext(deviceScenario, ctx), fit === 'native' ? 'tall' : 'portrait');
        return deviceExact ? pixels(poster, fit) : e1004(poster, { fit, mat: deviceMat });
      },
    };
  });

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
         + `Outdoor now and the forecast are real FMI data for ${place.name}, ${place.city}; indoor and `
         + 'the lower half are as in Lead + price.' },
  { id: 'colour', title: 'Colour', designs: COLOUR_DESIGNS,
    intro: 'The same wall designs for a six-ink colour e-ink panel (Spectra 6, 800×480), '
         + 'previewed in the pigments’ real, muted tones. Colour carries exactly four '
         + 'meanings — yellow sun, blue rain, red for dear hours, green for the sauna '
         + 'window — and nothing else is coloured, so each still reads in 1-bit.' },
  { id: 'fresh', title: 'Colour, fresh', designs: withScenarios(COLOUR_FRESH),
    intro: 'Layered, more artistic proposals for a colour e-ink panel: the neighbourhood map '
         + 'under the weather, a landscape whose hills are the price, a 24 h dial, a riso '
         + 'poster. Shown across synthetic scenarios so each has to handle storm, frost, '
         + 'negative prices, sleet and fog — pick one below, or all of them.',
    chips: true },
  { id: 'posters', title: 'Posters', designs: withScenarios(POSTERS), chips: true, sheet: true, wide: true,
    intro: 'Typographic posters for the living-room wall, portrait and landscape: the same '
         + 'facts stated bluntly — outdoor now, the outlook, the price, the sauna window — '
         + 'set as something worth hanging. Each uses paper, black and at most two of the '
         + 'panel’s four colours, all flat, so the six-ink panel draws them without '
         + 'dithering. The first five grew from the three reference posters; the rest are '
         + 'new directions. All scenarios show as contact sheets; click one for 1:1.' },
  { id: 'prints', title: 'Prints', designs: withScenarios(PRINTS), chips: true, sheet: true, wide: true,
    intro: 'A third series of posters, bolder than the art set: flat saturated inks, hard edges, '
         + 'one graphic idea each, with the temperature and the price the only things that have to '
         + 'be read. Two answer the striped-numeral and grey-composition references; the rest are '
         + 'proposals of their own — a numeral that casts the price as its shadow, a sheet that '
         + 'floods to the temperature, the coming day woven as tartan, an eclipse, a letterpress '
         + 'bill, two figures overprinted, a word texture, arcs, squares, waves. Contact sheets; '
         + 'click one for 1:1.' },
  { id: 'bauhaus', title: 'Bauhaus style', designs: withScenarios(BAUHAUS), chips: true, sheet: true, wide: true,
    intro: 'In the manner of the modern Bauhaus poster reproductions (the classic green collection at '
         + 'bauhausposters.com): a cream or single-colour ground, muted green, black, white and a red '
         + 'accent, an everyday object or a plain figure reduced to a few flat shapes, a small wordmark '
         + 'and spaced capitals at the foot. Each poster draws on more than the weather and the price — '
         + 'where the sun stands, the wind, the hours of daylight, the rooms of the flat and its floor '
         + 'plan. Contact sheets; click one for 1:1.' },
  { id: 'primary', title: 'Primary colours', designs: withScenarios(PRIMARY), chips: true, sheet: true, wide: true,
    intro: 'The palette of the catalogue’s primary collection: red, yellow and blue as flat fields on '
         + 'white, black for structure and type — which happen to be five of the six inks a Spectra 6 '
         + 'panel has, so nothing here is dithered. One colour grammar throughout: blue is water and cold '
         + '(rain, frost, cheap power), red is heat (warm air, dear power), yellow is the sun and the good '
         + 'hours (daylight, the sauna window), black is night and structure, white is the paper and '
         + 'anything fair or mild. Each poster is a composition generated from the inputs — how many hours '
         + 'are cheap, dark, wet or warm, how hard the wind blows, what is switched on in the flat — so the '
         + 'sheet changes with the day. Contact sheets; click one for 1:1.' },
  { id: 'e1004', title: `${E1004.name} · 13.3″, portrait`, designs: DEVICE_DESIGNS, device: true, wide: true,
    intro: 'Options on the left, the poster on the right: see studio.js.' },
];

const root = document.getElementById('designs');
const only = params.get('only');

/* The place chooser at the head of the page. Changing it reloads with
   ?place=<id>, which chosenPlace() then remembers for the other links. */
const chooser = document.getElementById('place');
if (chooser) {
  chooser.innerHTML = PLACES.map((p) => `<option value="${p.id}"${p.id === place.id ? ' selected' : ''}>${p.name}, ${p.city}</option>`).join('');
  chooser.addEventListener('change', () => {
    const u = new URL(location.href);
    u.searchParams.set('place', chooser.value);
    location.href = u;
  });
  const note = document.getElementById('place-note');
  if (note) {
    const st = place.station;
    note.textContent = st.km < 1
      ? `Observations from the FMI ${st.name} station on the spot; forecast, sun and map for ${place.name}.`
      : `No FMI weather station in ${place.name}: observations come from ${st.name}, ${st.km.toFixed(1)} km away; forecast, sun and map are for ${place.name} itself.`;
  }
}
const draws = [];

/* A frame for one design, in its orientation, registered for redraws. */
function frameFor(design) {
  const frame = document.createElement('div');
  frame.className = `frame${['portrait', 'device', 'exact'].includes(design.orient) ? ` ${design.orient}` : ''}`;
  draws.push({ live: design.live !== false, fn: () => frame.replaceChildren(design.render(context())) });
  return frame;
}

/* Contact sheet: one card per design, its scenarios side by side at half
   size, each linking to the poster at 1:1. */
function sheetCards(designs) {
  const byBase = new Map();
  for (const d of designs) byBase.set(d.base, [...(byBase.get(d.base) ?? []), d]);
  return [...byBase].flatMap(([base, variants]) => {
    const card = document.createElement('section');
    card.className = `card sheet-card ${base.orient}`;
    card.id = `d-${base.id}`;
    card.innerHTML = `<header><h3>${base.name}</h3><p>${base.blurb}</p></header>`;
    const row = document.createElement('div');
    row.className = 'sheet';
    for (const v of variants) {
      const a = document.createElement('a');
      a.className = 'thumb';
      a.href = `?only=${v.id}`;
      a.title = 'Open at 1:1';
      a.innerHTML = `<span>${SCENARIOS[v.scenario]?.name ?? 'Live'}</span>`;
      a.append(frameFor(v));
      row.append(a);
    }
    card.append(row);
    return [...(base.divider ? [divider(base.divider)] : []), card];
  });
}

/* A sub-heading inside a tab, before the first design of a new series. */
function divider({ title, intro }) {
  const head = document.createElement('header');
  head.className = 'group-head subgroup';
  head.innerHTML = `<h2>${title}</h2><p>${intro}</p>`;
  return head;
}

for (const section of SECTIONS) {
  const group = document.createElement('div');
  group.className = `group${section.wide ? ' wide' : ''}`;
  group.id = section.id;
  if (!only && !section.device) {
    const head = document.createElement('header');
    head.className = 'group-head';
    head.innerHTML = `<h2>${section.title}</h2><p>${section.intro}</p>`;
    if (section.chips) {
      const chips = document.createElement('p');
      chips.className = 'chips';
      const opts = [['all', 'All scenarios'], ...Object.entries(SCENARIOS).map(([k, v]) => [k, v.name]), ['live', 'Live data']];
      chips.innerHTML = opts.map(([k, v]) =>
        `<a href="?scenario=${k}#${section.id}" class="${k === scenarioParam ? 'on' : ''}">${v}</a>`).join('');
      head.append(chips);
    }
    group.append(head);
  }
  const cards = document.createElement('div');
  cards.className = 'cards';
  if (section.device && !only) {
    const studio = deviceStudio({
      series: [['Posters', POSTERS], ['Prints', PRINTS], ['Bauhaus style', BAUHAUS], ['Primary colours', PRIMARY]]
        .map(([title, ds]) => ({ title, designs: ds.filter((d) => d.orient === 'portrait') })),
      scenarios: SCENARIOS, scenarioContext, context, place,
    });
    draws.push({ live: true, fn: (all) => studio.redraw(all) });
    cards.append(studio.el);
  } else if (section.sheet && scenarioParam === 'all' && !only) {
    cards.append(...sheetCards(section.designs));
  } else {
    for (const design of section.designs) {
      if (only && design.id !== only) continue;
      if (!only && design.base?.divider && design.scenario === (scenarioParam === 'all' ? Object.keys(SCENARIOS)[0] : scenarioParam)) {
        cards.append(divider(design.base.divider));
      }
      const card = document.createElement('section');
      card.className = `card ${design.orient ?? 'landscape'}`;
      card.id = `d-${design.id}`;
      if (!only) {
        const head = document.createElement('header');
        head.innerHTML = `<h3>${design.name}</h3><p>${design.blurb}</p>`;
        card.append(head);
      }
      card.append(frameFor(design));
      cards.append(card);
    }
  }
  if (cards.children.length) group.append(cards);   // keeps .group:empty for ?only=
  root.append(group);
}

/* Everything draws once now and again when the poster fonts are in (posters
   measure text); after that only live designs redraw. */
const drawAll = (all = false) => draws.forEach((d) => (all || d.live) && d.fn(all));
drawAll(true);
fontsReady().then(() => drawAll(true));
setInterval(() => drawAll(), 4000);
prices.subscribe(() => drawAll());
weather.subscribe(() => drawAll());
forecast.subscribe(() => drawAll());

/* Tabs: the hash picks a section, or all of them. */
function showTab() {
  const tab = location.hash.replace('#', '') || 'all';
  document.querySelectorAll('.group').forEach((g) => {
    // the E1004 studio fills the window, so it only shows on its own tab;
    // ?only= pages show whichever group holds the poster, that one included
    g.hidden = only ? false : tab === 'all' ? g.id === 'e1004' : g.id !== tab;
  });
  document.querySelectorAll('nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  document.body.dataset.tab = tab;
  window.scrollTo(0, 0);   // the hash would otherwise scroll the nav off the top
}
window.addEventListener('hashchange', showTab);
showTab();
if (only) document.body.classList.add('only');

Object.assign(window, { bus, hist, plan, prices, weather, forecast });
