# Smart-home sandbox for a Finnish flat

A digital twin of a 45.5 m² apartment in Espoo for prototyping smart-home ideas before buying any hardware. The flat is rebuilt as an interactive 3D model from its listing floorplan, populated with 41 simulated devices, and paired with a set of e-ink dashboard designs that render the same live device state. Everything reads and writes one state bus, so the mock data source can be swapped for MQTT or Home Assistant in a single file.

The physical side of the project, choosing real sensors and radios, lives in [HARDWARE.md](HARDWARE.md).

## Quick start

```sh
npm install
npm run dev        # 3D flat at http://localhost:5173, dashboards at /dashboard.html
```

Requirements: Node (Vite 8, three.js r186). Python 3 stdlib only if you rebuild the floorplan geometry. Poppler (`pdfimages`) only if you re-extract the plan from the brochure PDF, which is not in git.

---

## 1. The 3D apartment

![Dollhouse view of the flat](docs/preview.png)

A cut-away dollhouse model of the flat with every light, sensor, appliance and opening as a clickable device.

### Controls

| Action | Effect |
|---|---|
| drag / scroll | orbit and zoom |
| click a marker | toggle that device |
| `cut` slider | raise or lower the section plane through the walls |

`window.bus`, `window.plan`, `window.scene` and `window.view` are exposed in the devtools console:

```js
bus.set('light.sauna', { on: true })
bus.set('contact.front_door', { open: true })
bus.snapshot()
```

### Devices

41 devices across 8 rooms: dimmable ceiling lights, blinds, door and window contacts, motion, temperature and humidity, radiator valves, the sauna heater, bathroom underfloor heating, appliance power, water-leak sensors, smoke alarms, and supply and extract ventilation.

Each device has an `id` such as `light.living`, a `kind`, a world position and a list of `controls` the side panel renders generically. Adding a device is one entry in `src/devices.js`. `src/automations.js` holds example rules: motion lighting, humidity boost, leak alarm.

### Geometry

The floorplan in the brochure is an 800×600 raster, not vector art, so the geometry is traced from pixels:

1. `pdfimages` extracts the plan at native resolution.
2. Wall pixels are isolated by colour and decomposed into axis-aligned rectangles.
3. Those rectangles are the constants in `tools/derive_floorplan.py`.
4. Scale is solved from the listed 45.5 m² living area, giving 22.42 mm per source pixel and a 6.46 × 7.09 m interior.

`npm run floorplan` regenerates `data/floorplan.json`. The script refuses to write if any two solids interpenetrate, because coplanar overlapping faces z-fight and the fixture visibly flickers. Touching is fine.

### Connecting real devices

Nothing outside `src/adapters/` knows where state comes from. `src/adapters/mqtt.js` implements the topic convention `flat/<deviceId>/state` inbound and `flat/<deviceId>/set` outbound, but is not wired in yet. To use it:

```sh
brew install mosquitto
# /opt/homebrew/etc/mosquitto/mosquitto.conf:
#   listener 1883
#   listener 9001
#   protocol websockets
#   allow_anonymous true
brew services start mosquitto
npm install mqtt
```

Then in `src/main.js` replace `startMock(bus)` with:

```js
import { connectMqtt } from './adapters/mqtt.js';
await connectMqtt(bus, { url: 'ws://localhost:9001' });
```

A Home Assistant WebSocket client and an `entity_id → device id` map would go in the same place.

---

## 2. E-ink dashboards

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

`dashboard.html` renders candidate layouts for a 7.5″ 800×480 1-bit e-ink panel. They are driven by the same device registry and mock feed as the 3D view, plus live Nord Pool spot prices, so every number on them is real state rather than a mockup. The captures above are 1:1 exports.

Two tabs answer two questions.

### Climate: how is the flat doing?

| Design | Character |
|---|---|
| **Lead** | Hero outdoor figure + 24 h trend, rooms as a KPI strip |
| **Ledger** | Pure typography, no marks. Least ink, fastest refresh |
| **Split** | Outdoor block beside per-room comfort meters (18–24 °C band) |
| **Grid** | Six equal stat tiles with sparklines |
| **Bare** | One number plus a thin strip of context |
| **Dots** | Every room on one shared 16–28 °C track, comfort band heavier |
| **Plan** | The floorplan, each room carrying its own reading |
| **Thermal** | Rooms filled with an ordered hatch, denser is warmer |
| **Drift** | Deviation from a 21 °C setpoint, hatch direction carries the sign |
| **Atlas** | Small plan as an orientation key beside a value column |

The plan-based designs draw `data/floorplan.json` through `src/dashboard/plan2d.js`, a flat SVG renderer with no three.js dependency, which keeps the dashboard bundle around 11 kB. Only rooms with their own sensor get a number. Kitchen and hall are shaded from the living-room sensor, because they share that open volume, but are not labelled.

### Electricity: is now a good time to heat the sauna?

Finland is a single Nord Pool zone and the day-ahead price swings by an order of magnitude within a day, so the answer is mostly "when", not "whether".

| Design | Character |
|---|---|
| **Verdict** | The answer in words as the hero; three stat tiles behind it |
| **Hours** | Today and tomorrow as hourly columns; the sauna window framed |
| **Ribbon** | One cell per hour, classed cheap / normal / dear. A timetable, not a chart |
| **Session** | The price of one sauna in euros, and what waiting would save |
| **Lead + price** | The Lead climate layout with today's ribbon and the verdict along the bottom |
| **Plan + price** | The Plan layout with the right column split between outdoor and electricity |

Data flow:

- `src/adapters/porssisahko.js` fetches the FI day-ahead series from [api.porssisahko.net](https://porssisahko.net), c/kWh incl. 25.5 % VAT, 48 h rolling, folded to hourly means. `vite.config.js` proxies `/api/porssisahko/*` in dev because the API sends no CORS header. On failure it substitutes a shaped synthetic day and the footers say so.
- Tomorrow's prices appear around 14:00 Finnish time. Before that the designs say so rather than drawing nothing.
- `src/prices.js` holds the store and the decision model. Tunable constants: `BANDS` (cheap ≤ 5 c, dear > 15 c), `FIXED_C_PER_KWH` (transfer + tax, 7.5 c, replace with your bill), and `SAUNA` (1.5 h at 70 % duty on the 6 kW `heater.sauna`, ≈ 6.3 kWh, 2 h window, start hours 07–22).

The verdict compares the next two hours with the cheapest remaining window today and tomorrow. A window only wins if it is at least 30 % and 1 c cheaper, so on a near-zero day the answer is simply "now". States: `now`, `wait`, `tomorrow`, `later`, `done`.

### Design rules for 1-bit e-ink

- **Temperatures are headline numbers, not charts.** Climate designs use stat tiles, KPI rows and hero figures. The only plotted marks are sparklines, each beside its current value with high and low labelled. Prices are a schedule you read the shape of, so Hours and Ribbon do plot them, but still print the verdict in words.
- **No greys.** A 1-bit panel dithers them and thin text falls apart. Areas are black, white, or a 45° hatch.
- **Hatch lines are 2 px.** A 1 px hatch antialiases to mid-grey and disappears when the panel driver thresholds at 50 %. Rendering and hard-thresholding the designs is part of checking them.
- Nothing below 15 px, hairlines at exactly 1 px, no sub-pixel geometry.
- **Labels fit the room, never the reverse.** An oversized label pill punches a hole in the wall fill and reads as a doorway.
- Drift is mostly white, so it refreshes faster and ghosts less than Thermal, and it answers "does anything need attention?" directly.
- Outdoor comes from `climate.outdoor`, a weather feed. The glazed balcony runs about 3 °C warm and is deliberately not used as a stand-in.

URL parameters: `?only=<id>` renders one panel at 1:1 with no page chrome, for capture or for the device. `?at=HH:MM` freezes the clock so other verdicts can be inspected.

### Forecast: what will the rest of the day do?

The Forecast tab keeps Lead + price and replaces its "last 24 hours" block with the rest of the day. Outdoor now and the forecast are real FMI data for Tapiola. The big figure stays the observed temperature. Under it, the high and low are for the calendar day, observed since midnight plus forecast to midnight, followed by the wind.

| Design | Character |
|---|---|
| **Today** | 00–24 as one line: observed solid and hatched, forecast dashed, rain as black bars. The scale spans at least 8 °C, so a flat day draws flat |
| **Hours** | The next 18 h as six 3-hourly columns: time, icon, temperature, rain |
| **Parts** | The next three parts of the day as tiles. The night shows its low, the others their high |
| **Words** | The one change in the next 12 h as a sentence ("Rain until 22:00"), plus tomorrow on one line |

`src/weather.js` holds the forecast model (`outlook`, `todayRange`, `dayParts`, `tomorrow`), and `src/dashboard/wicons.js` the 1-bit weather icons.

### The real panel

`panel.html` shows Lead + price and the four forecast views on live data. It is the page meant for the wall:

| Part | Source |
|---|---|
| Outdoor now, 24 h trend, high / low, humidity | FMI open-data observations, Espoo Tapiola station (fmisid 874863), 10 min steps. `src/adapters/fmi.js` |
| Price ribbon, current price, sauna verdict | Nord Pool FI day-ahead via porssisahko.net, as above |
| Forecast views | FMI edited point forecast for the same spot, hourly |
| Indoor strip | Still the mock, labelled **Indoor · simulated** until the room sensors exist |

By default the page cycles through the views, one per minute (`?every=<seconds>` changes that). `/views/<id>` or `?view=<id>` pins one view, and `/views` lists them. In a browser, a click or the arrow keys step to the next view. The view is picked from the clock, so a browser and `/panel.png` show the same one.

If a feed is down or has no data, the header says `No weather` or `No prices` beside the clock, and missing readings print as `–`. It never shows a made-up number as if it were live. In dev it is at `http://localhost:5173/panel.html`.

### Hosting it at home

`server/index.mjs` is a small Node server with no dependencies. It serves the built pages, relays FMI and porssisahko with a cache (on an upstream outage it keeps serving the last good answer), and renders the panel to a PNG:

```sh
npm run build
PORT=8080 npm run serve
```

| URL | For |
|---|---|
| `http://<host>:8080/` | e-ink devices with a browser (Boox, a jailbroken Kindle, an old tablet). Cycles through the views and redraws once a minute |
| `http://<host>:8080/views/<id>` | one view, pinned |
| `http://<host>:8080/panel.png` | devices without one (ESP32 + Waveshare 7.5″, Inkplate, TRMNL in BYOS mode). An 800×480 screenshot, regenerated at most once a minute. Takes `?view=` and `?every=` too |
| `http://<host>:8080/healthz` | upstream and renderer status |

The PNG needs Chrome or Chromium on the host (`sudo apt install chromium` on a Pi; set `CHROME=/path` if it is somewhere unusual). It renders in `Europe/Helsinki` time (override with `PANEL_TZ`). It is still an RGB image with antialiased glyph edges, so the device thresholds it to 1-bit. The designs are drawn to survive that.

To keep it running on a Raspberry Pi or other Linux box, `/etc/systemd/system/eink-panel.service`:

```ini
[Unit]
Description=E-ink panel server
After=network-online.target

[Service]
WorkingDirectory=/home/pi/smarthome_stuff
ExecStart=/usr/bin/node server/index.mjs
Environment=PORT=8080
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl enable --now eink-panel
```

