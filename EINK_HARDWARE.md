# E-ink display hardware research

Research notes for choosing the physical e-ink device that shows the 2D
dashboards in this repo on the wall. It is a companion to [HARDWARE.md](HARDWARE.md),
which covers the sensors and radios.

- **Location:** Finland
- **Goal:** simple, calm, ideally a wood frame, minimal configuration
- **Researched:** 2026-09-26
- **Status:** shortlisted; nothing ordered yet

Prices are as found on 2026-09-26 and will drift. USD prices are from US
storefronts; check the EU checkout for the final VAT-inclusive figure.

---

## What the dashboards need

The constraint that narrows everything: the designs are drawn for a **7.5″
800×480 1-bit panel** (see the design rules in [README.md](README.md)), and
`server/index.mjs` already serves them two ways:

| Endpoint | For |
|---|---|
| `http://<host>:8080/` | devices with a browser |
| `http://<host>:8080/panel.png` | devices without one: an 800×480 PNG, regenerated at most once a minute |

A 7.5″ 800×480 black-and-white panel that pulls a PNG from a URL is a zero-redesign
fit. Anything else means a new layout, a colour panel's slow refresh, or both.

---

## Shortlist

| Option | Panel | Frame | Price | How it gets the dashboard | Verdict |
|---|---|---|---|---|---|
| **[TRMNL OG](https://shop.trmnl.com/products/trmnl)** | 7.5″, 800×480, 4 greys | Faux wood (light or dark); also black, white, clear, sage, grey | $139 (+$10 larger battery) | [BYOS](https://docs.trmnl.com/go/diy/byos): polls your server's `/api/display`, free, no licence | **Best overall** |
| **[Seeed reTerminal E1001](https://www.seeedstudio.com/reTerminal-E1001-p-6534.html)** | 7.5″, 800×480, mono | Plastic | ~$79 | TRMNL firmware, ESPHome or SenseCraft ([wiki](https://wiki.seeedstudio.com/reterminal_e10xx_main_page/)) | Cheapest ready-made; put it behind a mat |
| **[Seeed XIAO 7.5″ ePaper Panel](https://www.seeedstudio.com/XIAO-7-5-ePaper-Panel-p-6416.html)** + wooden frame | 7.5″, 800×480, mono | Real wood, DIY (e.g. IKEA RÖDALM, [tutorial](https://tech-my-mind.com/posts/tutos/photoframe-epaper-dashboard/)) | ~$60–130 + frame | TRMNL firmware or ESPHome | **Best real-wood option** |
| **[Waveshare ESP32-S3 PhotoPainter](https://www.waveshare.com/esp32-s3-photopainter.htm)** | 7.3″, 800×480, Spectra 6 colour | Solid wood, white mat | ~€80–100 | Custom firmware needed to fetch the PNG | Right size and real wood, but slow flashing colour refresh |
| **[paperlesspaper OpenPaper 7](https://paperlesspaper.de/en)** | 7.3″, Spectra 6 colour | Solid ash, white mat | €189 | [Cloud API](https://docs.paperlesspaper.de/) push; [community Home Assistant integration](https://community.home-assistant.io/t/custom-integration-eink-display-from-paperlesspaper-for-home-assistant-keen-to-test/1000425) | Nicest object, but cloud-dependent and colour refresh |
| [Soldered Inkplate 10](https://soldered.com/products/inkplate-10) | 9.7″, 1200×825, mono/greys | 3D-printed plastic | €179 | Arduino / MicroPython | Wrong size, no wood |
| [TRMNL X](https://shop.trmnl.com/products/trmnl-x) | 10.3″, 1872×1404, 16 greys | Faux wood and others | $229 (+$10 larger battery) | BYOS | Lovely, but needs a new layout |

---

## 1. [TRMNL OG](https://shop.trmnl.com/products/trmnl) (recommended)

Full specs: [TRMNL OG spec sheet](https://trmnl.com/products/og/spec-sheet).

- 7.5″ 800×480, 4 grey levels. The designs threshold to pure black and white,
  so the grey levels change nothing.
- Faux-wood finishes, Light Wood and Dark Wood. They are a wood-look finish, not real wood.
- 1800 mAh battery (2–6 months depending on refresh rate), 2500 mAh optional.
- **Finland:** EU orders [ship from TRMNL's Berlin warehouse](https://help.trmnl.com/en/articles/10498361-international-customs-duty-fees) with free
  shipping and no duty fees.
- **[BYOS (bring your own server)](https://docs.trmnl.com/go/diy/byos):** the device wakes, calls
  `GET /api/display` on a server you choose, gets JSON with an absolute
  `image_url`, draws it, then sleeps for `refresh_rate` seconds. Self-hosted
  BYOS needs no licence (a $50 [BYOD licence](https://docs.trmnl.com/go/diy/byod-s) exists only for DIY hardware on
  TRMNL's cloud). Point the device at it via *Advanced → Custom Server* ([how-to](https://help.trmnl.com/en/articles/12263392-connect-your-device-to-terminus-byos)).
- **Work needed here:** a TRMNL-compatible `/api/display` endpoint in
  `server/index.mjs` that returns `/panel.png` as the image URL. Roughly
  20 lines; [byos_sinatra](https://github.com/usetrmnl/byos_sinatra) is a small reference for the response format. Alternatively run the official [Terminus](https://help.trmnl.com/en/articles/12263392-connect-your-device-to-terminus-byos) server, but that is more
  moving parts than this repo needs.

## 2. [Seeed reTerminal E1001](https://www.seeedstudio.com/reTerminal-E1001-p-6534.html)

- 7.5″ 800×480 monochrome, ESP32-S3, about 3 months of battery life, SD card slot.
- Ships able to run SenseCraft, Home Assistant/ESPHome or TRMNL firmware ([wiki](https://wiki.seeedstudio.com/reterminal_e10xx_main_page/)), so
  it can use the same BYOS endpoint as the TRMNL OG.
- Plastic housing. It looks best behind the mat of a deep wooden frame.

## 3. [Seeed XIAO 7.5″ ePaper Panel](https://www.seeedstudio.com/XIAO-7-5-ePaper-Panel-p-6416.html) in a wooden frame

- The same 800×480 mono panel with an XIAO ESP32-C3 and a 2000 mAh battery,
  in a thin case. It often sells for around $60 on Seeed sales.
- Fitted into an IKEA wooden frame with a white mat ([tutorial](https://tech-my-mind.com/posts/tutos/photoframe-epaper-dashboard/)) it reads as a framed
  print. That is the "calm, real wood" look, for an evening's fitting.
- Runs TRMNL firmware or ESPHome. Seeed's own [comparison of its e-ink displays for Home Assistant](https://www.seeedstudio.com/blog/2025/10/27/which-is-your-best-e-ink-display-for-your-home-assistant-dashboard/) covers the differences.

## 4. [Waveshare ESP32-S3 PhotoPainter](https://www.waveshare.com/esp32-s3-photopainter.htm)

- 7.3″ E Ink Spectra 6, 800×480, so it is the right pixel size. Solid wood frame with
  white borders, stand and hook. It also has an RTC, an SHTC3 temperature/humidity
  sensor, a TF card slot and battery charging.
- Colour refresh takes roughly 15–30 s with visible flashing. That is fine for art,
  but less calm for a dashboard that updates often. Black and white are in
  its palette, so the 1-bit designs would render correctly.
- You would write custom firmware to fetch `/panel.png`.

## 5. [paperlesspaper OpenPaper 7](https://paperlesspaper.de/en)

- German maker. Solid ash frame with a white mat, 7.3″ Spectra 6 colour, over 6
  months of battery life. Open hardware, firmware and API ([GitHub](https://github.com/paperlesspaper)). Ships in the EU.
- The site lists 1600×1200 for the 7.3″ model, which is doubtful for that
  panel size. Unverified; check before buying.
- Updates are **pushed** through their [cloud API](https://docs.paperlesspaper.de/), with a
  [community HACS integration](https://community.home-assistant.io/t/custom-integration-eink-display-from-paperlesspaper-for-home-assistant-keen-to-test/1000425) for Home Assistant. That breaks the
  "local-first, no vendor cloud" rule in [HARDWARE.md](HARDWARE.md).
- The larger [OpenPaper L](https://paperlesspaper.de/en/openpaper-l) (13.3″, €339) exists too.

## 6. Rejected and why

- **[Soldered Inkplate 10](https://soldered.com/products/inkplate-10)** ([€179 at Welectron](https://www.welectron.com/Soldered-Inkplate-10-97-e-paper-board)): 9.7″ 1200×825 needs a new layout, and the enclosure
  is 3D-printed plastic. The Croatian EU maker is a plus.
- **[TRMNL X](https://shop.trmnl.com/products/trmnl-x)** ([spec sheet](https://trmnl.com/products/x/spec-sheet), [review](https://truenetlab.com/en/blog/trmnl-x-e-ink-information-screen-review/)): 10.3″ 1872×1404 with 16 greys is the best screen here, but at
  4:3 the 5:3 designs would need re-laying out, and it costs $229+.
- **[Visionect Place & Play](https://www.visionect.com/shop/place-play-13/):** a commercial signage product. Pricing is by quote and it
  is overkill for one wall.

---

## Things to decide before buying

- **Battery vs. cable.** The panel shows a clock and redraws every minute. On
  battery these devices usually refresh every 15–30 min to reach months of
  runtime, so the clock would often be stale. Either run the device from USB-C,
  or drop the clock or round it to the refresh interval.
- **One device or two.** TRMNL-style devices can rotate between screens.
  Showing Lead + price and the forecast at the same time means two devices.
- **Where the server runs.** The BYOS endpoint must be reachable on the LAN
  from the device: a Pi, a NAS, or the Home Assistant box.

## Open questions

- Does Seeed collect VAT upfront for Finland, or is there a Finnish or EU reseller?
- The actual EUR checkout price of TRMNL OG for Finland.
- The paperlesspaper OpenPaper 7 resolution.

