/**
 * Sentence — the day written out, as on a book cover: one paragraph in a
 * large, soft serif, set as big as the page allows. Three phrases carry a
 * band of riso ink behind them — the temperature in the sky's colour, the
 * price in its band's colour, the sauna in green. A pale disc of sky sits
 * behind the corner of the text; the figures are in a line at the foot.
 */
import { frame, facts, esc, num, euro, SANS } from './common.js';
import { RISO, skyInk, priceInk, tint, DISPLAY, tempWords, hourWords, euroWords } from './artkit.js';

const W = 480, H = 800;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const hl = (s, ink) => `<span class="hl" style="--hl:${tint(ink, 0.42)}">${esc(s)}</span>`;   // a pale band: the text stays navy on it

function paragraph(f) {
  const sky = skyInk(f.sky ?? 'cloudy', { night: f.night, temp: f.temp });
  const how = { rain: 'and raining', showers: 'with showers', thunder: 'and stormy', sleet: 'with sleet',
    snow: 'and snowing', fog: 'in fog', clear: f.night ? 'under a clear sky' : 'and sunny',
    partly: f.night ? 'and mostly clear' : 'and bright', cloudy: 'and grey' }[f.sky] ?? '';
  const out = [`${hl(cap(tempWords(f.temp)), sky)} ${how} in ${f.place}.`];

  const o = f.out;
  const fall = (o.head.split(' ')[0] ?? 'rain').toLowerCase();
  const at = (t) => hourWords(new Date(t).getHours());
  if (o.state === 'wet') out.push(o.until ? `The ${fall} stops at ${at(o.until)}.` : `The ${fall} keeps on all day.`);
  else if (o.state === 'coming') out.push(`${cap(fall)} comes at ${at(o.from)}.`);
  else if (o.state === 'fog') {
    const h = o.head.match(/(\d\d):00/);
    out.push(h ? `The fog lifts at ${hourWords(+h[1])}.` : 'The fog stays all day.');
  } else if (o.state === 'dry') out.push('It stays dry.');

  const p = f.price;
  const word = p == null ? null : p < 0 ? 'less than nothing' : p <= 5 ? 'cheap' : p <= 15 ? 'fairly priced' : 'dear';
  const power = word ? `Power is ${hl(word, priceInk(p))}${p < 0 ? ' just now' : ''}` : 'There are no prices yet';
  const S = f.sauna;
  const cost = S.cost != null ? `, for about ${euroWords(S.cost)}` : '';
  if (S.state === 'now') out.push(`${power}, so take the ${hl('sauna now', RISO.sage)}${cost}.`);
  else if (S.start != null) out.push(`${power}; the ${hl(`sauna is best ${S.tomorrow ? 'tomorrow ' : ''}at ${hourWords(new Date(S.start).getHours())}`, RISO.sage)}${cost}.`);
  else out.push(`${power}.`);
  return out.join(' ');
}

/* The largest size at which the paragraph fits the box, measured in the page. */
function fitSize(html, width, height, css) {
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;visibility:hidden;left:-9999px;top:0;width:${width}px;${css}`;
  probe.innerHTML = html;
  document.body.append(probe);
  let lo = 20, hi = 64;
  for (let i = 0; i < 9; i++) {
    const mid = (lo + hi) / 2;
    probe.style.fontSize = `${mid}px`;
    if (probe.offsetHeight <= height) lo = mid; else hi = mid;
  }
  probe.remove();
  return Math.floor(lo * 2) / 2;
}

function render(ctx) {
  const f = facts(ctx);
  const sky = skyInk(f.sky ?? 'cloudy', { night: f.night, temp: f.temp });
  const html = paragraph(f);
  const css = `font-family:${DISPLAY.replace(/"/g, "'")};font-weight:340;line-height:1.14;letter-spacing:-.005em;`
    + `font-variation-settings:'SOFT' 100,'WONK' 1;color:${RISO.ink}`;
  const size = fitSize(html, 404, 560, css);

  const S = f.sauna;
  const figs = [`${num(f.temp)} °C`, f.price != null ? `${num(f.price, 1)} c/kWh` : null,
    S.start != null ? `sauna ${S.at}${S.tomorrow ? ' tomorrow' : ''}${S.cost != null ? `, ${euro(S.cost)}` : ''}` : null].filter(Boolean).join('  ·  ');
  const svg = `<rect width="${W}" height="${H}" fill="${RISO.paper}"/>
    <circle cx="${W - 40}" cy="120" r="170" fill="${tint(sky, f.night ? 0.62 : 0.45)}"/>`;
  const out = `
    <style>.pp .hl { background: linear-gradient(transparent 18%, var(--hl) 18%, var(--hl) 92%, transparent 92%);
      -webkit-box-decoration-break: clone; box-decoration-break: clone; padding: 0 .08em; mix-blend-mode: multiply; }</style>
    <div class="abs" style="left:38px;top:40px;font:600 12px/1 ${SANS.replace(/"/g, "'")};letter-spacing:2.4px;color:${RISO.ink}">${f.place.toUpperCase()} · ${esc(f.weekday.toUpperCase())} ${esc(f.dayMonth.toUpperCase())} · ${f.time}</div>
    <div class="abs" style="left:38px;top:92px;width:404px;${css};font-size:${size}px">${html}</div>
    <div class="abs" style="left:38px;bottom:34px;width:404px;font:500 12.5px/1.4 ${SANS.replace(/"/g, "'")};letter-spacing:.4px;color:${RISO.ink}">${esc(figs)}</div>`;
  return frame('portrait', svg, { bg: RISO.paper, html: out });
}

export const sentenceP = {
  id: 'pz-sentence-p', orient: 'portrait', name: 'Sentence · portrait',
  blurb: 'The day written out as one paragraph in a large, soft serif, set as big as the page '
       + 'allows. Three phrases carry a band of riso ink — the temperature in the sky’s colour, the '
       + 'price in its band’s colour, the sauna in green — under a pale disc of sky.',
  render,
};
