import { h } from '../dom.js';

// The world-themed practice look (developer-mode preview, settings.newPractice). Everything is static: a sky with two clouds,
// a low-poly landscape band in the world's colours (the colours are CSS variables set per data-world in css/app.css), and a
// little train on a track for the progress. The look itself lives in css/app.css ("practice world"); this file only builds the
// few elements CSS cannot, so the screen stays as cheap as before (no frame loop, one finished transition when a step changes).

// Hill ridges as points in a 1200 x 240 box (the band is bottom-aligned and may be cropped at the sides or the top).
const RIDGES = {
  far: [[0, 128], [90, 104], [210, 122], [330, 88], [450, 118], [570, 98], [700, 132], [830, 84], [960, 114], [1080, 96], [1200, 120]],
  mid: [[0, 158], [120, 132], [250, 150], [380, 118], [520, 156], [640, 134], [780, 166], [900, 128], [1040, 152], [1130, 136], [1200, 150]],
  near: [[0, 196], [140, 176], [300, 198], [450, 170], [610, 200], [760, 178], [920, 204], [1060, 180], [1200, 196]],
};
const pts = (a) => a.map(([x, y]) => `${x},${y}`).join(' ');

// One ridge: the body, a lit facet on every rising edge and a shaded one on every falling edge (the flat, low-poly look).
function ridge(name, list) {
  const g = h('g', { class: `pw-${name}` }, h('polygon', { class: 'body', points: pts([...list, [1200, 240], [0, 240]]) }));
  for (let i = 0; i < list.length - 1; i++) {
    const [x0, y0] = list[i], [x1, y1] = list[i + 1];
    if (y1 < y0) g.append(h('polygon', { class: 'lit', points: pts([[x0, y0], [x1, y1], [x1, y0]]) }));
    else if (y1 > y0) g.append(h('polygon', { class: 'shade', points: pts([[x0, y0], [x1, y1], [x0, y1]]) }));
  }
  return g;
}

function pine(x, y, s) {
  return h('g', { class: 'pw-tree' },
    h('polygon', { points: pts([[x, y - 30 * s], [x - 11 * s, y - 6 * s], [x + 11 * s, y - 6 * s]]) }),
    h('polygon', { points: pts([[x, y - 18 * s], [x - 14 * s, y + 6 * s], [x + 14 * s, y + 6 * s]]) }),
    h('rect', { x: x - 2 * s, y: y + 6 * s, width: 4 * s, height: 6 * s }));
}

// The landscape band, anchored to the bottom edge of the screen, and the sky decoration (clouds, sun) at the top.
export function landscape() {
  const land = h('svg', { class: 'pw-land', viewBox: '0 0 1200 240', preserveAspectRatio: 'xMidYMax slice', 'aria-hidden': 'true', focusable: 'false' },
    ridge('far', RIDGES.far),
    h('g', { class: 'pw-sea' }, h('rect', { x: 0, y: 118, width: 1200, height: 130 }), h('rect', { class: 'glint', x: 140, y: 138, width: 90, height: 5, rx: 2 }), h('rect', { class: 'glint', x: 520, y: 150, width: 120, height: 5, rx: 2 }), h('rect', { class: 'glint', x: 900, y: 140, width: 100, height: 5, rx: 2 })),
    ridge('mid', RIDGES.mid),
    pine(318, 126, 1), pine(352, 130, .8), pine(884, 136, 1), pine(1130, 142, .75),
    ridge('near', RIDGES.near));
  const sky = h('svg', { class: 'pw-sky', viewBox: '0 0 400 260', preserveAspectRatio: 'xMidYMin slice', 'aria-hidden': 'true', focusable: 'false' },
    h('circle', { class: 'sun-halo', cx: 330, cy: 70, r: 44 }), h('circle', { class: 'sun', cx: 330, cy: 70, r: 24 }),
    h('g', { class: 'cloud' }, h('rect', { x: 20, y: 96, width: 86, height: 20, rx: 10 }), h('rect', { x: 40, y: 84, width: 44, height: 20, rx: 10 })),
    h('g', { class: 'cloud c2' }, h('rect', { x: 236, y: 150, width: 70, height: 16, rx: 8 }), h('rect', { x: 252, y: 140, width: 36, height: 16, rx: 8 })));
  return [sky, land];
}

// A little engine facing right (drawn in a 44 x 28 box).
function engine() {
  return h('svg', { viewBox: '0 0 44 28', 'aria-hidden': 'true', focusable: 'false' },
    h('rect', { x: 29, y: 3, width: 6, height: 8, rx: 1.5, fill: '#3B3F58' }), h('rect', { x: 27.5, y: 2, width: 9, height: 3, rx: 1.5, fill: '#3B3F58' }),
    h('rect', { x: 20, y: 7, width: 6, height: 4, rx: 2, fill: '#FFD166' }),
    h('rect', { x: 15, y: 10, width: 25, height: 12, rx: 5, fill: '#E5484D' }),
    h('rect', { x: 15, y: 17, width: 25, height: 3, fill: '#B8343A' }),
    h('rect', { x: 2, y: 8, width: 14, height: 14, rx: 2.5, fill: '#FFF4D6' }),
    h('rect', { x: 0, y: 4, width: 18, height: 5, rx: 2, fill: '#8C5A32' }),
    h('rect', { x: 5, y: 11, width: 7, height: 6, rx: 1.5, fill: '#8FD3F4' }),
    h('circle', { cx: 39.5, cy: 15, r: 1.8, fill: '#FFE9A8' }),
    ...[[9, 23.5, 4.3], [22, 24, 3.6], [33, 24, 3.6]].map(([cx, cy, r]) => h('g', {}, h('circle', { cx, cy, r, fill: '#3B3F58' }), h('circle', { cx, cy, r: r * .38, fill: '#FFD166' }))));
}

// Progress as a train on a track: the engine stands at the current step, finished steps are coupled wagons behind it, the
// steps still to come are sleepers on the track. Moving the engine is one CSS transform transition (none under reduced motion).
export function trainBar({ steps, pos, from, stepNoun }) {
  const cells = Array.from({ length: steps }, (_, i) => h('i', { class: 'tk' + (i < pos ? ' past' : ''), style: { '--k': i } }, h('b', { class: 'tk-tie' }), h('b', { class: 'tk-car' })));
  const eng = h('span', { class: 'tk-engine', style: { '--at': from >= 0 && from !== pos ? from : pos } }, engine());
  const track = h('span', { class: 'tk-track', style: { '--n': steps } }, h('span', { class: 'tk-rail' }), cells, eng);
  const bar = h('div', { class: 'dots train', role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': steps, 'aria-valuenow': pos + 1, 'aria-label': `${stepNoun} ${pos + 1} of ${steps}` }, track);
  const setPos = (i) => {
    const at = Math.min(i, steps - 1);
    eng.style.setProperty('--at', at);
    cells.forEach((c, k) => c.classList.toggle('past', k < i));
    bar.setAttribute('aria-valuenow', String(at + 1));
    bar.setAttribute('aria-label', `${stepNoun} ${at + 1} of ${steps}`);
  };
  return { bar, setPos };
}
