# Espoo flat — interactive 3D flat

An interactive 3D model of the apartment in `input/esite_1393807_*.pdf` (the
listing brochure — kept out of git, see `.gitignore`), built to
be a sandbox for smart-home experiments: every light, sensor, appliance and
opening is a first-class device with state you can drive from code or from a
broker.

![dollhouse view](docs/preview.png)

## Running it

```sh
npm install     # already done
npm run dev     # http://localhost:5173
```

Controls:

| | |
|---|---|
| drag / scroll | orbit and zoom the dollhouse view |
| click a marker | toggle that device |
| `cut` slider | raise or lower the section plane through the walls |

`window.bus`, `window.plan`, `window.scene` and `window.view` are exposed for
poking at from the devtools console, e.g.:

```js
bus.set('light.sauna', { on: true })
bus.set('contact.front_door', { open: true })
bus.snapshot()
```

## What had to be installed

This was a bare machine. In order:

| | why |
|---|---|
| `brew install poppler` | `pdftotext` / `pdftoppm` / `pdfimages`, to read the PDF and pull the floorplan out of it |
| `brew install node` | Node 26 + npm, for Vite |
| `npm install three` | the renderer (r186) |
| `npm install -D vite` | dev server and bundler |

Python is only used by `tools/derive_floorplan.py`, which is plain stdlib — the
system `python3` is enough. (Tracing the plan originally used Pillow + NumPy in
a throwaway venv; that work is baked into the constants in that script, so you
do not need them to rebuild the geometry.)

## Where the geometry comes from

Page 5 of the brochure is the floorplan, but it is **an embedded 800×600 JPEG,
not vector art** — so there was nothing to read coordinates out of directly.
Instead:

1. `pdfimages` extracts the raster at its native resolution.
2. Wall pixels are isolated by colour (the dark green fill), then decomposed
   into axis-aligned rectangles and cross-checked with scanline runs.
3. Those pixel rectangles are the constants in `tools/derive_floorplan.py`.
4. Scale is solved from the listing's stated **45.5 m² living area**. That
   figure is the area per the articles of association, measured by local
   convention to the inner faces of the enclosing walls and including interior
   partitions. It gives **22.42 mm per source pixel** and a 6.46 × 7.09 m
   interior.

Re-generate with `npm run floorplan`. That script refuses to write if any two
solids interpenetrate: overlapping boxes produce coplanar faces of differing
size, the depth test then picks a different winner per frame, and the fixture
visibly vibrates. Touching is fine — back-to-back faces are culled — so the
kitchen run is built as abutting units rather than a worktop slab with the
appliances buried inside it.

Room areas come out as:

| | | |
|---|---:|---|
| Living room | 14.67 m² | |
| Bedroom | 8.70 m² | |
| Kitchen | 5.54 m² | open to the living room across the peninsula |
| Bathroom | 5.23 m² | tiled, washing-machine nook |
| Hall | 4.53 m² | open to the living room |
| Walk-in wardrobe | 2.79 m² | off the bedroom |
| Sauna | 1.81 m² | |
| | **43.27 m²** | + 2.23 m² of partitions = 45.5 m² |
| Glazed balcony | 8.11 m² | not part of the living area |

### Accuracy caveats — please read before trusting a dimension

- The plan itself carries a printed **“indicative, not to scale”** disclaimer.
  Everything here inherits that. Treat wall positions as ±5 cm, and the balcony —
  which looks drawn generously at 3.15 × 2.84 m — as less reliable than the
  interior.
- **Ceiling height (2.50 m) is a guess.** The listing does not state it; 2.5 m is
  typical for a 1997 concrete-panel block. Change `CEILING` in the derive script
  if you measure it.
- Window sill/head heights (0.80 / 2.20 m) and all door heights are conventional
  values, not measured.
- Appliance identification in the kitchen run is partly inferred. The listing
  confirms a fridge/freezer, dishwasher, ceramic hob and extractor hood exist;
  which drawn box is which is a judgement call beyond the hob, which is
  unambiguous (four burner circles).
- The plan is drawn **south-up** — the listing states that both the window aspect
  and the balcony face south, and all glazing is on the top wall. So in world
  space `-Z` is south. This matters if you start doing daylight simulation; it is
  recorded in `orientation` in the JSON.

## Layout

```
data/floorplan.json        generated geometry: walls, openings, rooms, fixtures (metres)
tools/derive_floorplan.py  pixel tracing -> floorplan.json, with the source constants
src/build-flat.js          floorplan.json -> three.js meshes
src/devices.js             device registry; positions derived from the floorplan
src/state.js               transport-agnostic state bus
src/automations.js         example rules (motion lighting, humidity boost, leak alarm)
src/adapters/mock.js       simulated sensors, so it does something out of the box
src/adapters/mqtt.js       the seam for real state — not wired up yet
src/adapters/porssisahko.js  Nord Pool FI spot prices (live, with synthetic fallback)
src/prices.js              price store, bands, sauna session cost, the verdict
src/dashboard/             e-ink studies: climate, floorplan and electricity designs
src/ui.js                  side panel
src/main.js                scene, camera, picking, state -> scene sync
```

The important boundary is that **nothing except `src/adapters/` knows where state
comes from.** The scene, the panel and the automations all read and write
`bus`. That is what makes swapping the mock for something real a one-file change.

## The device model

41 devices across 8 rooms: ceiling lights (dimmable), blinds, door/window
contacts, motion, temperature/humidity, radiator valves, the sauna heater,
bathroom underfloor heating, appliance power, water-leak sensors, smoke alarms
and supply/extract ventilation.

Each has an `id` like `light.living` or `contact.front_door`, a `kind`, a world
position, and a list of `controls` that the panel renders generically. Adding a
device is a single entry in `src/devices.js`; no changes anywhere else.

## Wiring it to something real

`src/adapters/mqtt.js` has the connection code and the topic convention
(`flat/<deviceId>/state` inbound, `flat/<deviceId>/set` outbound), but is not
called. To use it:

```sh
brew install mosquitto
# add to /opt/homebrew/etc/mosquitto/mosquitto.conf:
#   listener 1883
#   listener 9001
#   protocol websockets
#   allow_anonymous true
brew services start mosquitto
npm install mqtt
```

then in `src/main.js` replace the `startMock(bus)` call with:

```js
import { connectMqtt } from './adapters/mqtt.js';
await connectMqtt(bus, { url: 'ws://localhost:9001' });
```

For Home Assistant instead, the same file is where a WebSocket-API client and an
`entity_id → device id` map would go.

## E-ink dashboard studies

`dashboard.html` (`npm run dev`, then `/dashboard.html`) renders ten candidate
layouts for a 7.5&Prime; 800&times;480 e-ink panel, driven by the same registry and
mock feed as the 3D view — they are renderings of live device state, not mockups
with invented numbers.

| Design | Character |
|---|---|
| **Lead** | Hero outdoor figure + 24 h trend, rooms as a KPI strip |
| **Ledger** | Pure typography, no marks. Least ink, fastest refresh, most rows |
| **Split** | Outdoor block beside per-room comfort meters (18–24 °C band) |
| **Grid** | Six equal stat tiles with sparklines; outdoor inverted |
| **Bare** | One number, plus a thin strip of context |
| **Dots** | Dot plot: every room on one shared 16–28 °C track, comfort band heavier; balcony and outdoor below on a −20…30 scale |
| **Plan** | The floorplan itself, each room carrying its own reading |
| **Thermal** | Rooms filled with an ordered hatch — denser is warmer |
| **Drift** | Deviation from a 21 °C setpoint; hatch direction carries the sign |
| **Atlas** | Small plan as an orientation key beside a precise value column |

Design constraints, and why:

- **The data's job is "a handful of headline numbers", so none of these is a
  chart.** They are stat tiles, KPI rows and hero figures. The only plotted
  marks are 24 h sparklines, and every one sits beside its current value with
  the day's high and low labelled — no value is reachable only by reading a
  line, which matters doubly on a medium with no hover or tooltips.
- **No greys.** A 1-bit panel has to dither them, and dithered grey is where
  thin text and soft fills fall apart. Areas are black, white, or a 45° hatch.
  Greyscale is the print / `forced-colors` case, so texture rather than tone is
  the secondary channel.
- Nothing below 15 px, hairlines at exactly 1 px, no sub-pixel geometry.
- Outdoor comes from `climate.outdoor`, a weather feed. The glazed balcony is
  deliberately *not* used as a stand-in — glazing runs it ~3 °C warm, and the
  mock models that offset.

The plan-based four share `src/dashboard/plan2d.js`, which draws
`data/floorplan.json` as an architectural plan — walls as solid poché, door
openings as gaps, windows as a line across the gap. It deliberately does **not**
share code with `src/build-flat.js`: that module imports three.js, and pulling
700 kB of renderer into a flat-SVG dashboard would be absurd (the dashboard
bundle is ~11 kB as a result).

Two things those four get right that are easy to get wrong:

- **Only rooms with their own sensor get a number.** Printing one in the kitchen
  would imply a sensor that isn't there. Kitchen and hall are *shaded* from the
  living-room sensor, because they are the same open volume with no doors
  between them, but they are not labelled.
- **Labels are fitted to the room, never the reverse.** An oversized white label
  pill punches a hole through the poché and reads as a doorway — which is what
  the sauna label did before the fit logic went in.

### What the 1-bit threshold taught us

Rendering these and then hard-thresholding at 50 %, which is what a mono panel
driver does, caught something no amount of looking at the browser would:
**a 1 px hatch line antialiases to mid-grey and thresholds away to nothing.**
Three of the four scale swatches in Thermal vanished completely. Hatch lines are
now 2 px, with spacings rescaled to keep the ramp's density ratios.

Worth knowing when picking: Thermal covers nearly the whole plan in ink, which
on e-ink means a slower full refresh and more ghosting. Drift is mostly white —
only out-of-band rooms are hatched — so it is much cheaper to display, and it
answers "does anything need attention?" directly. Absolute thermal mapping of a
well-heated flat is inherently low-contrast: every indoor room sits within about
3 °C, so most of the plan lands in adjacent bins.

### What they look like

Exported from the browser at 1:1, live mock climate and live spot prices
(Sunday 20 September 2026, evening — a near-zero price day with a 17 c spike
the next morning).

| | |
|---|---|
| ![Lead](docs/dash-lead.png) | ![Dots](docs/dash-dots.png) |
| Lead | Dots |
| ![Plan](docs/dash-plan.png) | ![Drift](docs/dash-drift.png) |
| Plan | Drift |
| ![Verdict](docs/dash-verdict.png) | ![Hours](docs/dash-hours.png) |
| Verdict | Hours |
| ![Ribbon](docs/dash-ribbon.png) | ![Lead + price](docs/dash-lead-price.png) |
| Ribbon | Lead + price |

## Electricity price studies

The second tab of `dashboard.html` (`#electricity`) is about one question: **is
now a good time to heat the sauna?** Finland is a single Nord Pool bidding zone,
and the day-ahead price swings by an order of magnitude within a day, so the
answer is mostly "when", not "whether".

| Design | Character |
|---|---|
| **Verdict** | The answer in words as the hero; three stat tiles behind it. No plot |
| **Hours** | Today and tomorrow as hourly columns on one scale; the sauna window framed and underlined |
| **Ribbon** | One cell per hour, classed cheap / normal / dear. A timetable, not a chart; least ink |
| **Session** | The price of *one sauna* in euros, and what waiting would save |
| **Lead + price** | The Lead climate layout with today's ribbon and the verdict along the bottom |
| **Plan + price** | The Plan layout with the right column split between outdoor and electricity |

Where the numbers come from:

- `src/adapters/porssisahko.js` fetches the FI day-ahead series from
  [api.porssisahko.net](https://porssisahko.net) — c/kWh **incl. VAT 25.5 %**,
  48 h rolling, hourly (the 15-minute v2 series is folded to hourly means).
  The API sends no CORS header, so `vite.config.js` proxies `/api/porssisahko/*`
  to it in dev; whatever hosts the panel does the same. If the fetch fails the
  adapter substitutes a shaped synthetic day and the footers say so.
- Tomorrow's prices are published around 14:00 Finnish time. Before that, the
  designs say "published around 14:00" rather than drawing nothing.
- `src/prices.js` holds the store and the decision model. Constants worth
  tuning: `BANDS` (cheap ≤ 5 c, dear > 15 c, absolute so "cheap" means the same
  every day), `FIXED_C_PER_KWH` (transfer + electricity tax, 7.5 c — replace
  with your bill), and `SAUNA` (1.5 h at 70 % duty on the 6 kW heater registered
  as `heater.sauna`, ≈ 6.3 kWh, evaluated over a 2 h window, start hours 07–22).

The verdict compares the next two hours with the cheapest remaining window today
and the cheapest window tomorrow. A window only wins if it is *clearly* cheaper —
30 % less **and** at least 1 c — because on a windy Sunday every hour is under a
cent and the right answer is simply "now". States: `now`, `wait` (cheaper later
today), `tomorrow`, `later` (nothing cheap left today), `done` (past sauna hours).

Design notes specific to prices:

- **This data *is* a chart.** Unlike temperatures, a spot price is a schedule
  you read the shape of, so Hours and Ribbon plot it — but every design still
  prints the verdict in words and the price as a number.
- **Selective labels.** Hours labels only now, the window mean, and each day's
  max and min, skipping any that would collide. 48 numbers along the top would
  be unreadable.
- **The sauna window is a 2 px frame plus a bar under the axis**, not a fill. A
  solid black band with white columns cut out was tried first: striking, but on
  a cheap day it dwarfed every column and read as the peak. A hatch behind 13 px
  columns turns to mush at 1-bit.
- **Ribbon cells are ordinal, not magnitude.** Three absolute classes need no
  scale, which is what makes the strip short enough to sit under a climate
  layout (Lead + price).
- `?only=<id>` renders one panel at 1:1 with no page chrome, for capture or for
  the device; `?at=HH:MM` freezes the clock so other verdicts can be inspected.

## Possible next steps

- Sun/daylight simulation — the orientation data is already in the JSON, so a
  real solar position for Espoo (60.2 °N) would drop straight in.
- Replace the schematic fixture boxes with proper models, or match materials to
  the listing photos on pages 6–8 of the PDF.
- Record device state over time and scrub through it, to test automations
  against a replay rather than by hand.
- Heat model per room, so radiator and window state actually affect the
  temperature sensors instead of the current hand-waved mock.
