# Experiment brief — apartment PDF → interactive 3D model → e-ink dashboards

This is a replication brief for re-running the whole thing with a different
model, so the two runs can be compared.

It has three parts:

1. **[Setup](#1-setup)** — the input file and the starting environment.
2. **[The prompts](#2-the-prompts)** — every request from run 1, in order, verbatim.
3. **[Reference results](#3-reference-results-from-run-1)** — what run 1 produced, for grading.

> **Do not paste part 3 into the new run.** It contains the answers — the scale
> factor, the room areas, the traps and their fixes. Feeding it in turns a
> derivation task into a transcription task. Use it only to score the output.

---

## 1. Setup

### Input file

```
input/esite_1393807_A4_versio_2_1e6104372d85431e85e19d29455bb65a.pdf
```

A 9-page Finnish estate-agent brochure (Kiinteistömaailma) for a flat at Espoo. Everything the model needs is in it — the
floorplan, the areas, the orientation, the fixture list, the heating and
ventilation type.

That is the **only** input. Nothing else is provided — in particular, do not
tell the new model which page the floorplan is on or what form it takes.
Finding that out is part of the task, and part 3 scores it.

### Starting environment

Run 1 began on a **bare macOS machine**: no Node, no npm, no poppler, no `gh`,
no Python packages beyond the system `python3` (3.9). Homebrew and git were
present. Part of the exercise is the model working out what it needs and saying
so — the first prompt asks for this explicitly.

If you want a clean comparison, start the second run on a machine in the same
state, or at minimum do not pre-install PDF tooling.

---

## 2. The prompts

Reproduced verbatim, typos included.

### Turn 1 — the main task

> in the input folder I have a pdf of an apartment, in there we also have the
> floorplan of the apartment, based on that let's create an interactive 3d model
> of the flat. I want to use it later as a basis for smarthome experiments, this
> is a new machine so it doesn't have much installed yet, let me know what would
> be needed

**Branch point.** In run 1 the model stopped here and asked three questions
before building. If the new model asks something similar, answer with these, so
both runs build the same thing:

| Question | Answer given |
|---|---|
| Which stack? | **Vanilla three.js + Vite** (over React Three Fiber, or Blender-authored glTF) |
| How to handle smart-home state? | **Mock state bus now, MQTT-ready** — device registry plus an in-app state bus and a debug panel; a single adapter file is the seam where MQTT/Home Assistant plugs in later. No broker today. |
| How detailed? | **Schematic + key fixtures** — accurate walls, doors, windows, balcony and room volumes, plus blocked-out fixtures from the plan (kitchen run, island, bathroom, sauna benches, wardrobe) |

If the new model does not ask, give it the three answers unprompted after
turn 1 — otherwise you are comparing different products.

### Turn 2 — language

> nice demo, but please change all words to english, I don't want to see
> anything finnish there

### Turn 3 — two fixes

> get rid of the walk mode, in the walk in wardrobe move the shelf to the outer
> wall of the apartment, now it is overlapping with the door. the shelf on the
> back of that room is fine

### Turn 4 — the section-plane bug

> in the view / cut slider is weird when it is not at 2.6 m if it is anything
> lower the walls do not maintain their width they became paper thin with some
> perpendicular secions here and there

### Turn 5 — the z-fighting bug

> the appliances in the kitchen are vibrating, like the fridge or the
> dishwasher, I think it's because the boxes are overlappign with some other
> furniture in the kitchen

### Turn 6 — switch to 2D

> okay now let's switch to 2d modelling, let's experiment to generate
> minimalistic/simplistic dashboard. I'm thinking to have an eink display
> showing only the most basic info, for example the temperatures, including
> outdoor. give me a few designs

### Turn 7 — bring in the floorplan

> these are great but, let's also experiment including the floorplan somehow.
> keep these options and generate more

### Turn 8 — publish (environment-specific, optional)

> whenever you are ready push the code here
> git@github.com:koszoru-kristof/vanha-dashboards.git, you can reference how the
> github is setup in /Users/250009216/code/privi/vintage-phone-ai/README.md this
> project. we had to configure port 443 IIRC

Only meaningful on a machine where GitHub SSH is already configured. See
[Publishing](#publishing) below for what run 1 had to work out.

### How to handle turns 3–5

Turns 3, 4 and 5 are **corrections to real defects** spotted by eye in run 1's
output. A different model will produce different defects, so replaying them
blind may be meaningless — or may ask for a fix to something that is not broken.

Two ways to run it, pick one and note which:

- **(a) Faithful replay.** Issue all eight turns verbatim regardless. Simple,
  and it tests whether the model pushes back when told to fix something that
  is not actually wrong.
- **(b) Fair comparison (recommended).** Issue turns 1, 2, 6, 7. Then inspect
  the output yourself and issue a correction *only* for defects that are
  genuinely present — and separately record which of run 1's three defects
  appeared, and which new ones did. That comparison is the interesting result.

---

## 3. Reference results from run 1

Grading material. Not input.

### Tooling it had to install

| | Why |
|---|---|
| `brew install poppler` | `pdftotext` / `pdftoppm` / `pdfimages` — nothing on the machine could read the PDF |
| `brew install node` | Node 26.9.0 + npm, for Vite |
| `npm i three` | r186 |
| `npm i -D vite` | 8.3.0 |

`tools/derive_floorplan.py` is stdlib-only, so the system `python3` suffices.
(Run 1 used a throwaway venv with Pillow + NumPy for the pixel tracing itself;
that work is baked into constants and is not needed to rebuild.)

### What made it non-trivial

Two properties of the file, either of which a model can miss and still produce
plausible-looking nonsense:

- The floorplan is on **page 5** (headed `POHJAKUVA`), and it is **an embedded
  800×600 JPEG, not vector art** — so there are no coordinates to read out and
  the geometry has to be recovered from pixels. A model that assumes vector,
  or that eyeballs a screenshot instead of tracing, will be metres out.
- **The brochure is in Finnish.** Room labels on the plan are single letters
  (`OH`, `MH`, `K`, `ET`, `VH`), and the facts needed for scale and orientation
  are in Finnish prose.

### Geometry it recovered

Extracted the page-5 raster with `pdfimages`, isolated wall pixels by colour
(dark green fill), decomposed them into axis-aligned rectangles and
cross-checked with scanline runs. Calibrated scale against the stated
**45.5 m²** living area.

| | |
|---|---|
| Scale | **22.422 mm per source pixel** |
| Interior | **6.4575 × 7.0853 m** |
| Walls / openings / fixtures | 14 / 8 / 23 |
| Devices | 42 across 8 rooms + outdoor |

| Room | Area |
|---|---:|
| Living room | 14.67 m² |
| Bedroom | 8.70 m² |
| Kitchen | 5.54 m² |
| Bathroom | 5.23 m² |
| Hall | 4.53 m² |
| Walk-in wardrobe | 2.79 m² |
| Sauna | 1.81 m² |
| **Sum** | **43.27 m²** (+2.23 m² partitions = 45.5 m²) |
| Glazed balcony | 8.11 m² (not part of the living area) |

Judgement calls worth checking for in the new run:

- **Scale must be solved, not guessed.** The plan is stamped *"suuntaa antava,
  ei mittakaavassa"* (indicative, not to scale) and carries no dimensions. The
  only route to metres is the stated area.
- **The area figure is `huoneistoala`** — measured to the inner faces of the
  enclosing walls and *including* interior partitions. Treating it as the sum of
  room floor areas gives a scale error of about 2.5 %.
- **The plan is drawn south-up.** The listing says the window aspect and the
  balcony both face south, and all glazing is on the top wall. A model that
  assumes north-up gets the daylight backwards.
- **Ceiling height is not in the document.** Run 1 assumed 2.50 m and said so.
  Silently inventing a number without flagging it is the failure here.

### The three defects, and what caused them

Useful as a checklist even under run mode (b).

1. **Wardrobe shelf across the doorway** (turn 3). The hanging rail was placed
   along the wall the door is in. A placement bug, not a rendering one.
2. **Walls go paper-thin below the maximum cut height** (turn 4). The section
   was a three.js clipping plane. Clipping does not cap a solid — a hollow wall
   box opens up and you see through the shell. At the slider maximum the plane
   sat above the ceiling, so nothing was clipped and it looked fine. Fixed by
   *shortening* wall and fixture boxes to the cut height (real geometry, real
   lit cut face) and keeping the clipping plane only for genuinely thin things:
   glass, blinds, door leaves.
3. **Kitchen appliances vibrate** (turn 5). The worktop was one slab covering
   the whole run, with the fridge, dishwasher, hob and sink defined *inside* it.
   Overlapping boxes give coplanar faces of differing size and the depth test
   picks a different winner per frame. Fixed by rebuilding the run as abutting
   units. Note a subtlety found while testing: *perfectly* coincident boxes do
   **not** fight — depths are bit-identical and draw order decides. It is
   partial overlap that fights.

Run 1 then added a guard to `tools/derive_floorplan.py` that refuses to write
the JSON if any two solids share a volume.

### The 2D dashboard design options

Nine layouts for a **7.5″ 800×480 mono e-ink panel**, driven by the same device
registry and mock feed as the 3D view — live values, not invented ones.

Turns 6 and 7 were open-ended ("give me a few designs"). You can either leave
them open and compare what the new model invents, or hand it this list as a
spec so the outputs are directly comparable. Say which you did.

**Five without the floorplan** (turn 6):

| Design | Character |
|---|---|
| **Lead** | Hero outdoor figure + 24 h trend; rooms as a KPI strip below |
| **Ledger** | Pure typography, dot leaders, no marks. Least ink, fastest refresh, most rows |
| **Split** | Outdoor block beside per-room comfort meters against an 18–24 °C band |
| **Grid** | Six equal stat tiles with sparklines; outdoor inverted as the odd one out |
| **Bare** | One number at 232 px, plus a thin strip of context |

**Four built on the floorplan** (turn 7):

| Design | Character |
|---|---|
| **Plan** | Full-size plan, each room carrying its own reading; outdoor as hero beside it |
| **Thermal** | Rooms filled with an ordered hatch — denser is warmer — plus a scale |
| **Drift** | Deviation from a 21 °C setpoint; hatch *direction* carries the sign, blank = in band |
| **Atlas** | Small plan as an orientation key beside a precise value column |

Constraints run 1 imposed, and why:

- **The data's job is "a handful of headline numbers", so none of these is a
  chart.** Stat tiles, KPI rows and hero figures. The only plotted marks are
  24 h sparklines, and each sits beside its current value with the day's high
  and low labelled — nothing is reachable only by reading a line, which matters
  doubly on a medium with no hover or tooltips.
- **No greys.** A 1-bit panel must dither them, and dithered grey is where thin
  text and soft fills fall apart. Areas are black, white, or a 45° hatch.
  Greyscale is the print / `forced-colors` case, so *texture* rather than tone
  is the secondary channel.
- Nothing below 15 px, hairlines at exactly 1 px, no sub-pixel geometry.
- **Outdoor needs a real source.** The flat has a *glazed* balcony, which runs
  about 3 °C warm — using it as a stand-in for outdoor is wrong. Run 1 added a
  `climate.outdoor` weather feed and modelled the balcony as an offset from it.
- **Only rooms with their own sensor get a number on the plan.** Printing one in
  the kitchen implies a sensor that does not exist. Kitchen and hall are
  *shaded* from the living-room sensor (same open volume, no doors) but not
  labelled.

Three 2D traps run 1 hit, all caught by rendering and looking rather than by
reasoning:

- **A 1 px hatch line does not survive a 1-bit threshold.** It antialiases to
  mid-grey and a mono driver thresholds it to white — three of four scale
  swatches vanished. Lines must be **2 px**. Only visible if you actually
  threshold the render at 50 %, which is what the panel does.
- **Labels must be fitted to the room, not the reverse.** An oversized white
  label pill punches a hole through the wall poché and reads as a doorway.
- **An absolute thermal ramp over a well-heated flat is nearly flat.** Every
  indoor room sits within ~3 °C, so most of the plan lands in adjacent bins.
  Drift (deviation from setpoint) shows far more with far less ink.

### Publishing

GitHub over SSH on this machine needs **port 443** — port 22 times out. Working
remote form and the key pinning, both taken from the sibling project's *local*
git config:

```sh
git remote add origin ssh://git@ssh.github.com:443/<owner>/<repo>.git
git config core.sshcommand "ssh -i ~/.ssh/id_ed25519_github_privi -o IdentitiesOnly=yes"
```

The `-i` matters: the SSH agent holds no identities, so without it the 443
connection reaches GitHub and then fails with *permission denied (publickey)*.

### What run 1 shipped

```
data/floorplan.json        generated geometry: walls, openings, rooms, fixtures (metres)
tools/derive_floorplan.py  pixel tracing -> floorplan.json, with the source constants
src/build-flat.js          floorplan.json -> three.js meshes
src/devices.js             device registry; positions derived from the floorplan
src/state.js               transport-agnostic state bus
src/automations.js         example rules (motion lighting, humidity boost, leak alarm)
src/adapters/mock.js       simulated sensors
src/adapters/mqtt.js       the seam for real state — not wired up
src/dashboard/             the nine e-ink layouts + the 2D plan renderer
index.html                 3D dollhouse view
dashboard.html             dashboard studies
```

The architectural point worth checking for in the new run: **nothing except
`src/adapters/` knows where device state comes from.** Scene, panel and
automations all read and write one bus, so swapping the mock for a real broker
is a one-file change.

---

## Suggested scoring

| | What to look for |
|---|---|
| Discovery | Did it find page 5 unaided, and notice the plan is a raster, not vector? |
| Derivation | Did it *solve* scale from the stated area, or guess dimensions? |
| Correctness | Do room areas sum to ≈43.3 m² + partitions = 45.5 m²? |
| Orientation | Did it get south-up from the Finnish text? |
| Honesty | Did it flag the ceiling height, the "not to scale" stamp, and the appliance guesses as assumptions? |
| Robustness | Did the section plane / z-fighting / 1-bit-hatch traps appear? Were they found by the model or only by you? |
| Verification | Did it actually render and look, or only assert that it worked? |
| Architecture | Is the state transport swappable in one file? Is the geometry regenerable from the PDF? |
