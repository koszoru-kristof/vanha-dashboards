/**
 * The E1004 tab as a studio: options on the left, one poster on the right,
 * on the device and as large as the window allows.
 *
 * Every choice is kept in the URL (?d=<design>&data=<scenario>&fit=&mat=&view=&size=),
 * so a view can be bookmarked or sent, and nothing reloads when it changes.
 * Arrow keys (up/down) step through the designs.
 */
import { E1004, e1004, pixels, FITS, MATS } from './device.js';
import './studio.css';

const VIEWS = { device: 'On the wall', bare: 'Bare 1200 × 1600' };
const SIZES = { fit: 'Fit to window', px: '1:1 pixels' };

/**
 * series: [{ title, designs }] (portrait designs only)
 * scenarios: SCENARIOS from scenarios.js; scenarioContext(id, ctx) builds one
 * context: () => live ctx
 */
export function deviceStudio({ series, scenarios, scenarioContext, context, place }) {
  const all = series.flatMap((s) => s.designs);
  const q = new URLSearchParams(location.search);
  const pick = (v, opts, d) => (v in opts ? v : d);
  const scenarioOpts = { ...Object.fromEntries(Object.entries(scenarios).map(([k, v]) => [k, v.name])), live: 'Live data' };
  const state = {
    d: all.some((d) => d.id === q.get('d')) ? q.get('d') : all[0].id,
    scenario: pick(q.get('data'), scenarioOpts, Object.keys(scenarios)[0]),
    fit: pick(q.get('fit'), FITS, 'native'),
    mat: pick(q.get('mat'), MATS, 'white'),
    view: pick(q.get('view'), VIEWS, 'device'),
    size: pick(q.get('size'), SIZES, 'fit'),
  };

  const el = document.createElement('div');
  el.className = 'studio';
  el.innerHTML = `
    <aside class="studio-side">
      <h2>${E1004.name}</h2>
      <p class="studio-spec">13.3″ Spectra 6 · 1200 × 1600 px · ~150 ppi<br>
        311 × 376 × 40 mm, black frame, white mat · USD 279.90 ·
        <a href="${E1004.url}" target="_blank" rel="noopener">Seeed store</a></p>
      <div class="studio-opts"></div>
      <h3>Design</h3>
      <div class="studio-list" role="listbox" aria-label="Design"></div>
    </aside>
    <main class="studio-stage">
      <div class="studio-canvas"><div class="studio-zoom"></div></div>
      <footer class="studio-caption"><h4></h4><p></p><a target="_blank">Open alone</a></footer>
    </main>`;

  const opts = el.querySelector('.studio-opts');
  const groups = [
    ['scenario', 'Data', scenarioOpts],
    ['fit', 'Layout', FITS],
    ['view', 'View', VIEWS],
    ['mat', 'Mat', MATS],
    ['size', 'Size', SIZES],
  ];
  for (const [key, label, choices] of groups) {
    const g = document.createElement('fieldset');
    g.dataset.key = key;
    g.innerHTML = `<legend>${label}</legend>` + Object.entries(choices).map(([k, v]) =>
      `<button type="button" data-v="${k}">${v}</button>`).join('');
    g.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) set({ [key]: b.dataset.v });
    });
    opts.append(g);
  }

  const list = el.querySelector('.studio-list');
  for (const s of series) {
    const h = document.createElement('h4');
    h.textContent = s.title;
    list.append(h);
    for (const d of s.designs) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = d.id;
      b.setAttribute('role', 'option');
      b.textContent = d.name.replace(/ · portrait$/i, '');
      b.addEventListener('click', () => set({ d: d.id }));
      list.append(b);
    }
  }

  const zoom = el.querySelector('.studio-zoom');
  const canvas = el.querySelector('.studio-canvas');
  const caption = el.querySelector('.studio-caption');

  function set(patch) {
    Object.assign(state, patch);
    const u = new URL(location.href);
    // 'data', not 'scenario': ?scenario= would also filter the other tabs
    for (const [k, v] of Object.entries(state)) u.searchParams.set(k === 'scenario' ? 'data' : k, v);
    history.replaceState(null, '', u);
    draw();
  }

  function draw() {
    const d = all.find((x) => x.id === state.d);
    const fit = state.fit === 'native' && !d.tall ? 'fit' : state.fit;
    const ctx = scenarioContext(state.scenario, context());
    const poster = d.render(ctx, fit === 'native' ? 'tall' : 'portrait');
    const node = state.view === 'bare' ? pixels(poster, fit) : e1004(poster, { fit, mat: state.mat });
    zoom.replaceChildren(node);
    layout();

    for (const g of opts.querySelectorAll('fieldset')) {
      const k = g.dataset.key;
      g.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === state[k]));
      g.hidden = k === 'mat' && state.view === 'bare';
    }
    list.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.id === state.d;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on);
    });
    caption.querySelector('h4').textContent = `${d.name}${d.tall ? '' : ' (no 3:4 layout yet, fitted)'}`;
    caption.querySelector('p').textContent = state.scenario === 'live'
      ? `Live data for ${place.name}. ${d.blurb}` : `${scenarios[state.scenario].note} ${d.blurb}`;
    const only = new URL(location.href);
    only.search = '';
    only.hash = '';
    only.searchParams.set('only', `e1004-${d.id}`);
    for (const k of ['scenario', 'fit', 'mat']) only.searchParams.set(k, state[k]);
    if (state.view === 'bare') only.searchParams.set('exact', '');
    caption.querySelector('a').href = only;
  }

  /* Fit the device (or the bare pixels) to the stage, or show pixels 1:1. */
  function layout() {
    const node = zoom.firstElementChild;
    if (!node) return;
    const w = node.offsetWidth, h = node.offsetHeight;
    let s = 1;
    if (state.size === 'fit') {
      s = Math.min((canvas.clientWidth - 48) / w, (canvas.clientHeight - 48) / h);
    } else if (state.view === 'device') {
      s = 1 / 0.4;                       // the device's panel at one CSS px per device px
    }
    zoom.style.zoom = s;
    canvas.classList.toggle('scroll', state.size === 'px');
  }

  new ResizeObserver(layout).observe(canvas);
  document.addEventListener('keydown', (e) => {
    if (el.closest('[hidden]') || !['ArrowUp', 'ArrowDown'].includes(e.key) || e.target.closest?.('input,select,textarea')) return;
    const i = all.findIndex((x) => x.id === state.d);
    const next = all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length];
    e.preventDefault();
    set({ d: next.id });
    list.querySelector(`[data-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
  });

  draw();
  requestAnimationFrame(() => list.querySelector('.on')?.scrollIntoView({ block: 'nearest' }));
  return { el, redraw: (all) => (all || state.scenario === 'live') && draw() };
}
