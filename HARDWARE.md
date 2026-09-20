# Smart home hardware research

Research notes for kitting out the flat with real devices — the physical
counterpart to the simulated devices in this repo.

- **Location:** Finland
- **Controller:** Home Assistant (local-first, no vendor cloud)
- **Researched:** 2026-09-20
- **Status:** radio/coordinator decided; sensors shortlisted; nothing ordered yet

Prices are VAT-inclusive as found on 2026-09-20 and will drift.

---

## Decisions

| Thing | Decision | Confidence |
|---|---|---|
| Controller | Home Assistant | settled |
| Radio strategy | Both Zigbee and Thread, Zigbee as the backbone | settled |
| Coordinator | SMLIGHT **SLZB-MR4U** (dual radio, PoE) | settled |
| Thread border router | The MR4U's own Silabs radio, running OTBR in HA | settled |
| Temp/humidity | IKEA TIMMERFLOTTE | leaning |
| Presence | Aqara FP300 | leaning |
| Lights | IKEA KAJPLATS, Hue where quality matters | open |
| Switches/relays | Shelly Gen4 in ceiling boxes | open, needs wiring survey |

---

## 1. Platform and protocol model

The mental model that matters, because it is easy to get wrong:

- **Zigbee** — self-contained mesh with its own coordinator. Mature, cheapest
  devices, best battery life, richest vendor features.
- **Thread** — an IPv6 mesh. Just transport. Carries Matter.
- **Matter** — the application layer. Defines what a device *exposes*.
- **Thread Border Router (TBR)** — an IPv6 router bridging the Thread mesh to
  the LAN. **Not a hub.** It does not control devices and has zero influence on
  which features are available.

### The Matter feature ceiling

Matter standardises device types, and the CSA deliberately stripped vendor
specifics to make brands interoperate. So over Matter you get standard clusters
and nothing more — regardless of which border router you use.

Worked example, the Aqara FP300:

| Mode | Exposed |
|---|---|
| Matter over Thread | presence, temp, humidity, lux, sensitivity, timeout |
| Zigbee (with Aqara hub) | the above plus Aqara's extra tuning settings |

Aqara state they "strictly follow the standard when implementing Matter over
Thread" and deliberately do not implement manufacturer-specific clusters.

Generally lost over Matter: deep energy monitoring, pixel-level LED control,
various vendor tuning knobs.

**Consequence:** buying a fancier border router does not unlock features. Choose
the protocol per device based on the features you actually need.

---

## 2. Radios and coordinators

### The constraint that drives everything

A single radio chip runs **either Zigbee or Thread firmware, not both at once**.
Running both networks therefore needs **two radios** — either two dongles or one
dual-radio device.

### Chosen: SMLIGHT SLZB-MR4U

Dual-radio Ethernet/PoE coordinator. Two separate SoCs and two SMA antennas,
Zigbee and Thread running **simultaneously on separate channels**.

| | |
|---|---|
| Zigbee radio | TI CC2674P10 (2024, +20 dBm, extended RAM) |
| Thread radio | Silabs EFR32MG26 (2025, Thread 1.4, 2x RAM vs MG24) |
| Core | ESP32-S3 running SLZB-OS |
| Ethernet | W5500, 802.3af PoE |
| Antennas | 2x external rotatable +5 dBi |
| Price | **EUR 55.99** Domadoo (FR) / **EUR 66.00** Nurkan takaa (Hyrylä, FI) |

Why dual-radio rather than two dongles: one PoE drop, one location, both meshes
sited away from server RF noise, and the two networks land on separate channels
by construction.

### The MR lineup, decoded

SMLIGHT's own FAQ: *"Only the two radio SoCs change. The ESP32-S3 core, the
W5500 Ethernet, PoE transformer, antennas, LEDs, buttons, and firmware are
identical across the entire series."*

It is one product with five chip pairings, spanning EUR 44–56.

| | Zigbee radio (TI) | Thread radio (Silabs) | Domadoo |
|---|---|---|---|
| MR2U | CC2652P (2020) | EFR32MG21 (2019) | EUR 43.99 |
| MR1U | CC2652P7 (2023) | EFR32MG21 (2019) | EUR 50.99 |
| MR3U | CC2674P10 (2024) | EFR32MG24 (2022) | EUR 51.99 |
| **MR4U** | **CC2674P10 (2024)** | **EFR32MG26 (2025)** | **EUR 55.99** |
| MR5U | EFR32MG24 (no TI chip) | EFR32MG24 | EUR 55.99 |

The TI + Silabs pairing is deliberate: TI's Z-Stack is the mature Zigbee
firmware for Zigbee2MQTT/ZHA, Silabs is stronger on OpenThread/OTBR. Each chip
runs the stack it is best at. MR5U drops that for toolchain homogeneity, which
is a firmware-developer concern, not ours.

Notes: MR1U is dominated by MR3U (older chips for EUR 1 less). MR3U is the safe
pick if MG26 firmware maturity turns out to be a problem. Domadoo's MR1U listing
says CC2652P while SMLIGHT says CC2652P7 — unresolved, does not affect the
choice.

### Gotchas to remember at install time

- **Never power via PoE and USB-C simultaneously.** SMLIGHT's marketing claims
  optoelectronic isolation makes it safe; the retailer spec sheet and Howmation's
  review both say it risks damaging the board. Use one source.
- **BLE proxy mode costs the radios.** It requires flashing ESPHome, which drops
  Zigbee and Thread entirely.
- **USB passthrough** supports CP210x / PL2303 / CH340 / CH341 / CH9102 only.
  Native-CDC devices are not on the list — see rejected options below.
- **Channel planning is mandatory.** Zigbee, Thread and Wi-Fi all share 2.4 GHz.
  Park Zigbee on 15/20/25, Thread on a different channel, Wi-Fi on 1/6/11.
  Skipping this is the top cause of flaky meshes.
- **Placement beats antenna specs.** Keep the coordinator away from USB 3 ports,
  SSDs and metal cases. This matters far more than antenna gain.

### Rejected options and why

| Option | Why not |
|---|---|
| Google Home Mini / Nest Mini | **No Thread radio at all.** Cannot be a border router. |
| Google Home Speaker (2026), EUR 119.99 | Is a real TBR, but: black box with no OTBR UI/diagnostics/firmware control; HA must import Thread credentials via the Android companion app, which has a known bug importing a stale dataset instead of the active network; fallback path drags Google's cloud into local automations and causes multi-admin "popcorn" latency. EUR 120 vs EUR 56 for one we control. |
| HA Connect ZBT-2 as a second radio | Fine in itself, but the MR4U makes it unnecessary. |
| ZBT-2 attached to an SLZB-06 via USB passthrough | The ZBT-2 uses an **ESP32-S3 as its USB-serial bridge** (native USB CDC), not a CP210x/CH340. SMLIGHT's compatibility list does not cover it despite a marketing photo showing exactly this. Also unclear whether internal radio + passthrough run concurrently, and OTBR over a serial tunnel is timing-sensitive. |

**Multiple border routers are fine and good for redundancy — but only if they
share one Thread dataset.** Two TBRs with different datasets create two separate
non-communicating meshes. Pick one network owner and make everything join it.

---

## 3. Sensors and devices

### Temperature / humidity

| Device | Protocol | Price | Notes |
|---|---|---|---|
| **IKEA TIMMERFLOTTE** | Matter/Thread | **EUR 9.99** | Display, AAA. Needs a TBR. Best value by a wide margin |
| Aqara T&H | Zigbee | EUR 22.99 (Verkkokauppa) | Tiny, 2+ yr battery, very reliable |
| Sonoff SNZB-02D | Zigbee | ~EUR 13–16 | Display, cheap Zigbee option |

### Presence detection

| Device | Protocol | Price | Notes |
|---|---|---|---|
| **Aqara FP300** | **Thread or Zigbee, switchable** | EUR 40.90–49 (Proshop / Nurkan takaa) | mmWave + PIR hybrid, plus temp/humidity/lux. 3 yr battery Zigbee, 2 yr Thread. Battery-powered mmWave is the notable bit |
| Aqara FP1E | Zigbee | EUR 51.99 | Mains USB, single zone |
| Aqara FP2 | Wi-Fi | ~EUR 70+ | Multi-zone, people counting, fall detection |
| IKEA MYGGSPRAY | Matter/Thread | EUR 9.99 | **PIR motion, not presence.** Drops you when you sit still |

FP300 is the flagship pick and the best argument for keeping both radios — the
protocol is chosen per device.

### Lights

- **IKEA KAJPLATS** — 11 bulbs, Matter/Thread, cheapest Matter bulbs going. In
  Finnish stores since January 2026.
- **Philips Hue** — Zigbee, best colour quality, ~3x price. Can pair directly to
  our own coordinator, skipping the bridge (at the cost of Hue OTA updates).
- Existing IKEA TRADFRI bulbs are Zigbee.

### Switches and relays

- **Shelly 1 / 1PM / 2PM Gen4** — in-wall relays speaking Wi-Fi, Zigbee *and*
  Matter, selectable at install. Power monitoring, keeps the physical switch
  working. The flexible choice.
- **IKEA BILRESA** (button and dial, Thread), **RODRET / SOMRIG** (Zigbee,
  EUR 6–10) — cheap battery remotes.
- **Airam kinetic Zigbee switch** (via Onninen) — battery-free, kinetic.
- **SAVY Zigbee** switches from SuperLED.fi, including a kojerasia model.

### Other IKEA 2026 Matter/Thread sensors

MYGGBETT (door/window), ALPSTUGA (air quality), KLIPPBOK (water leak),
GRILLPLATS (smart plug, later release). All arrived in Finland January 2026.

---

## 4. Finland-specific notes

1. **Wall switch wiring.** Finnish/Nordic installs commonly route supply to the
   ceiling point with a switch loop dropping down, so there is often **no
   neutral at the switch box**. Shelly relays therefore usually go in the
   **kattorasia** at the luminaire, not behind the switch. *Needs a survey of
   the actual boxes in this flat before ordering relays.*
2. **Electrical work is regulated.** Fixed-installation wiring (sähköasennustyö)
   is legally work for a licensed contractor. Plug-in devices and battery
   sensors are DIY; anything inside a kytkinrasia/kattorasia is not.
3. **Cold.** Alkaline cells collapse below roughly -10 C. Use lithium for
   garage, varasto, terrace, mökki — CR2450 for the FP300, Energizer Ultimate
   Lithium AAA for the IKEA sensors.
4. **Retailers.** Verkkokauppa.com, Proshop.fi, Nurkan takaa (also a Hyrylä
   counter), kotiautomaatiokauppa.fi, SuperLED.fi, Onninen, IKEA. Compare on
   Hintaopas.fi — the FP300 spread was EUR 40.90 to EUR 59 for the same box.
   Domadoo (FR) ships within the EU and was consistently cheaper on SMLIGHT.

---

## 5. Open questions

- [ ] Survey the flat's switch boxes — is there neutral at the switch, or is it
      a ceiling-loop install? Determines the whole relay plan.
- [ ] MR4U: confirm EFR32MG26 firmware maturity in HA (ZHA vs Zigbee2MQTT, and
      OTBR support) before ordering. MR3U is the fallback.
- [ ] Decide Zigbee stack: ZHA or Zigbee2MQTT.
- [ ] Pick Zigbee / Thread / Wi-Fi channels as a set, before pairing anything.
- [ ] Count how many temp/humidity points the flat actually needs — Timmerflotte
      at EUR 9.99 makes over-provisioning cheap.
- [ ] Buy from Domadoo (cheaper) or Nurkan takaa (local warranty, ~EUR 10 more)?
- [ ] Map these device classes onto the simulated devices in this repo so the
      3D model and the real installation share one device taxonomy.

---

## Sources

Protocols and platform:
- https://www.howtogeek.com/why-you-should-choose-zigbee-instead-of-thread-for-your-home-assistant-server/
- https://openelab.io/blogs/learn/matter-vs-zigbee-vs-thread-home-assistant
- https://www.xda-developers.com/matter-promise-is-a-mess-and-im-going-back-to-zigbee-only-devices/
- https://www.matteralpha.com/frequently-asked-questions/thread-border-routers-the-complete-list
- https://medium.com/engineering-iot/why-you-cant-use-your-own-openthread-border-router-with-google-apple-or-amazon-b413b6b0ab9e

Coordinators:
- https://smlight.tech/en-US/products/slzb-mrxu
- https://smlight.tech/en-US/products/slzb-06u
- https://www.domadoo.fr/en/403_smlight
- https://verkkokauppa.nurkantakaa.fi/tuote/smlight-slzb-mr4/
- https://howmation.com/en_US/product/smlight-slzb-mr5u-zigbee-thread-ethernet-poe-dual-efr32mg24-usb-passthrough-coordinator
- https://www.smarterhomeshop.eu/SLZB-MR1U-Zigbee-Thread-Ethernet-PoE-USB-LAN-WIFI
- https://smarthomescene.com/reviews/smlight-slzb-mr1-multi-radio-coordinator-setup-and-review/
- https://www.home-assistant.io/connect/zbt-2/
- https://support.nabucasa.com/hc/en-us/articles/31313138988701-About-Home-Assistant-Connect-ZBT-2-firmware-options
- https://github.com/home-assistant/core/issues/177007

Devices:
- https://forum.aqara.com/t/fp300-matter-over-thread-vs-zigbee-functionality/243947
- https://smarthomescene.com/reviews/aqara-fp300-presence-multi-sensor-teardown-and-review/
- https://www.derekseaman.com/2025/11/aqara-fp300-the-ultimate-presence-sensor-home-assistant-edition.html
- https://www.ikea.com/fi/fi/p/timmerflotte-laempoetila-ilmankosteusanturi-aelylaite-30597606/
- https://www.ikea.com/fi/fi/p/myggspray-langaton-liiketunnistin-aelylaite-70604186/
- https://mobiili.fi/2025/11/20/ikea-paljasti-myyntiintulon-aikataulun-suomessa-tallaisia-ovat-uudet-matter-yhteensopivat-alykotituotteet-valaistukseen-antureihin-ja-ohjaukseen/
- https://www.shelly.com/products/shelly-1pm-gen4
- https://www.superled.fi/category/335/zigbee-himmentimet-ja-kytkimet
