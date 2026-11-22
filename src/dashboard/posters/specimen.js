/**
 * Specimen — after the Baskerville poster: a type specimen for today's
 * weather. The word for the sky (Rain, Frost, Fog, Sun…) runs up the page in
 * a large serif, its letters echoed as giant outlines cropped at the edges.
 * An ochre headline says what matters in one breath; a paragraph gives every
 * figure; the corner holds the sources, the way a specimen credits its
 * research. Three inks: black ground, paper, ochre.
 */
import { frame, facts, text, measure, esc, INK, SERIF, num, pad2, euro, hash, rng, sources, SIZE } from './common.js';

function headline(f) {
  const o = f.out;
  const first = o.state === 'dry' ? `${num(f.temp)} °C, ${o.head.replace(/^Dry, /, 'dry and ')}`
    : o.state === 'none' ? `${num(f.temp)} °C` : o.head;
  const s = f.sauna;
  const second = s.state === 'now' ? 'Sauna now'
    : s.state === 'none' ? 'No prices yet'
    : s.start == null ? 'Tomorrow’s prices at 14:00'
    : s.tomorrow ? `Sauna tomorrow at ${s.at}`
    : s.state === 'later' ? `Sauna from ${s.at}` : `Sauna at ${s.at}`;
  return `${first}. ${second}.`;
}

function prose(f) {
  const out = [];
  const r = f.range;
  out.push(`At ${f.time} it is ${num(f.temp)} °C in ${f.place}${f.rh != null ? `, ${Math.round(f.rh)} % humidity` : ''}`
    + `${r ? `; today runs from ${num(r.min)} to ${num(r.max)} °C` : ''}.`);
  if (f.out.sub) {
    const sub = f.out.sub.replace(/ · /g, ', ');
    out.push(`${sub[0].toUpperCase()}${sub.slice(1)}.`);
  }
  const st = f.stats;
  if (st) {
    out.push(`Electricity is ${num(f.price, 2)} c/kWh now; today’s high is ${num(st.max.price, 1)} c at `
      + `${pad2(st.max.hour)}:00, the low ${num(st.min.price, 1)} c at ${pad2(st.min.hour)}:00.`);
  }
  const s = f.sauna;
  if (s.cost != null) {
    const when = s.state === 'now' ? 'are the next two, from now'
      : s.state === 'later' ? `left today start at ${s.at}, and none is cheap`
      : `start ${s.tomorrow ? 'tomorrow ' : ''}at ${s.at}`;
    out.push(`The cheapest two hours for the sauna ${when}, at ${num(s.avg, 1)} c: about ${euro(s.cost)} a session with transfer and tax.`);
  }
  return out.join(' ');
}

function render(ctx, orient = 'portrait') {
  const [W, H] = SIZE[orient];
  const u = W / 480;                              // 1 in portrait; the tall sheet sets the word and the column larger
  const f = facts(ctx);
  const word = f.word;
  const R = rng(hash(word));

  // the vertical word: as long as the page allows, never wider than its column
  const probe = measure(word, { size: 100, weight: 700, family: SERIF });
  const size = Math.min(250 * u ** 0.5, 700 / (probe.w / 100), 214 * u ** 0.5 / ((probe.asc + probe.desc) / 100));
  const m = measure(word, { size, weight: 700, family: SERIF });
  const bx = 18 + m.asc;                          // the letters' tops face left, on the page edge
  const x0 = Math.round(bx + m.desc + 26);        // the text column starts past the descenders
  const y0 = H + size * 0.03;                     // the first letter just touches the foot

  // outline letters: the word's own letters, cropped at the top and the right edge
  const letters = [...word.toLowerCase()];
  const pick = (i) => (i === 0 ? word[0] : letters[i % letters.length]);
  const slots = [
    { x: -26 - R() * 30, y: 240 + R() * 30, size: (400 + R() * 60) * u, ch: pick(0) },
    { x: W + 28, y: 190 + R() * 40, size: (360 + R() * 60) * u, ch: pick(1), end: true },
  ];
  let s = '';
  for (const o of slots) {
    s += `<text x="${o.x.toFixed(1)}" y="${o.y.toFixed(1)}" font-family='${SERIF}' font-size="${o.size.toFixed(0)}"`
       + ` font-weight="400" text-anchor="${o.end ? 'end' : 'start'}" fill="none" stroke="${INK.paper}" stroke-width="1.3">${esc(o.ch)}</text>`;
  }
  s += `<text transform="translate(${bx.toFixed(1)} ${y0.toFixed(1)}) rotate(-90)" font-family='${SERIF}'`
     + ` font-size="${size.toFixed(1)}" font-weight="700" fill="${INK.paper}">${esc(word)}</text>`;

  const colW = W - 24 - x0;
  const src = [`${f.weekday} ${f.dayMonth}, ${f.time}`, sources(f).weather.replace(' · ', ', '), sources(f).price.replace(' day-ahead', ''), sources(f).vat];
  // one column, set from the foot up: headline, the figures, then the sources
  const serif = SERIF.replace(/"/g, '\'');
  const html = `
    <div class="abs" style="left:${x0}px;bottom:20px;width:${colW}px;font-family:${serif}">
      <div style="font-weight:700;font-size:${27 * u}px;line-height:${32 * u}px;color:${INK.yellow};letter-spacing:-.2px">${esc(headline(f))}</div>
      <div style="margin-top:16px;font-size:${13.5 * u ** 0.5}px;line-height:${20 * u ** 0.5}px;color:${INK.paper};hyphens:auto" lang="en">${esc(prose(f))}</div>
      <div style="margin-top:18px;font-weight:700;font-size:13px;color:${INK.yellow}">Sources</div>
      ${src.map((l) => `<div style="font-size:12px;line-height:16px;color:${INK.paper}">${esc(l)}</div>`).join('')}
    </div>`;
  return frame(orient, s, { bg: INK.black, html });
}

export const specimenP = {
  id: 'pz-specimen-p', orient: 'portrait', name: 'Specimen · portrait',
  blurb: 'After the Baskerville poster: a type specimen for the day. The word for the sky runs up '
       + 'the page in a large serif, its letters echoed as cropped outlines; an ochre headline '
       + 'says what matters, a paragraph gives every figure, the corner credits the sources.',
  render, tall: true,
};
