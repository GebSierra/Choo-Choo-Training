// The train world in 2D, for the games: the little engine with Pip in its cab, a station, an open goods wagon, a picture
// crate, and the backdrops (balloon sky with hills and a track; the loading dock). Same palette and soft rounded look
// as the 3D railway on Home and as Pip (js/art/pip.js). Flat fills with one or two soft shades, no outlines over 2 px.
import { h } from '../dom.js';
import { pipSvg } from './pip.js';

export const TRAIN = { red: '#E5484D', redDark: '#C93A40', sun: '#FFD166', sunDark: '#E5A73A', navy: '#2B2D5C', navyLight: '#3A3D78', cream: '#F3E6CF', wood: '#C99A5B', woodDark: '#A87B4F', rail: '#8A6E5A', sleeper: '#B8926A' };
const C = TRAIN;

// A wheel that can turn (.wheel, rotating about its own centre).
const wheel = (cx, cy, r, color = C.red) => h('g', { class: 'wheel', style: { 'transform-box': 'fill-box', 'transform-origin': '50% 50%' } },
  h('circle', { cx, cy, r, fill: color }), h('circle', { cx, cy, r: r - 3.5, fill: 'none', stroke: 'rgba(0,0,0,.14)', 'stroke-width': 2 }),
  h('rect', { x: cx - 2, y: cy - r + 3, width: 4, height: 2 * r - 6, rx: 2, fill: C.sun }), h('circle', { cx, cy, r: r * 0.36, fill: C.sun }));

// The engine, facing right, with Pip in the cab. .pip-seat holds Pip (swapped for a waving Pip at a station); .funnel-top
// marks where steam comes out (in the 150 by 110 box).
export function engineSvg({ pose = 'idle' } = {}) {
  const pip = pipSvg({ pose });
  for (const [k, v] of Object.entries({ x: 14, y: 4, width: 42, height: 52.5 })) pip.setAttribute(k, v);
  return h('svg', { class: 'engine-art', viewBox: '0 0 150 110', 'aria-hidden': 'true' },
    h('ellipse', { cx: 76, cy: 104, rx: 64, ry: 4.5, fill: 'rgba(60,40,20,.18)' }),
    h('g', { class: 'engine-body' },
      // the cab: back wall, Pip, then the front panel that hides his legs
      h('rect', { x: 12, y: 14, width: 48, height: 62, rx: 8, fill: C.redDark }),
      h('g', { class: 'pip-seat' }, pip),
      h('rect', { x: 12, y: 46, width: 48, height: 30, rx: 7, fill: C.red }),
      h('rect', { x: 12, y: 46, width: 48, height: 5, rx: 2.5, fill: C.sun }),
      h('rect', { x: 8, y: 4, width: 58, height: 9, rx: 4.5, fill: C.navy }),
      h('rect', { x: 8, y: 11, width: 58, height: 3, rx: 1.5, fill: C.sun }),
      h('rect', { x: 13, y: 13, width: 4, height: 34, rx: 2, fill: C.red }), h('rect', { x: 55, y: 13, width: 4, height: 34, rx: 2, fill: C.red }),
      // the boiler, its bands, the dome, the funnel and the lamp
      h('rect', { x: 56, y: 40, width: 72, height: 34, rx: 16, fill: C.navy }),
      h('rect', { x: 60, y: 44, width: 64, height: 8, rx: 4, fill: '#fff', opacity: 0.12 }),
      h('rect', { x: 74, y: 40, width: 5, height: 34, fill: C.sun }), h('rect', { x: 100, y: 40, width: 5, height: 34, fill: C.sun }),
      h('path', { d: 'M78 41 Q78 30 87 30 Q96 30 96 41 Z', fill: C.sun }),
      h('path', { d: 'M108 41 L110 24 L104 17 L128 17 L122 24 L124 41 Z', fill: C.navy }),
      h('rect', { x: 102, y: 13, width: 28, height: 6, rx: 3, fill: C.sun }),
      h('rect', { x: 122, y: 37, width: 14, height: 40, rx: 6, fill: C.navyLight }),
      h('circle', { cx: 137, cy: 50, r: 5.5, fill: C.sun }), h('circle', { cx: 138.5, cy: 48.5, r: 2, fill: '#fff', opacity: 0.7 }),
      // the footplate, chassis and cowcatcher
      h('rect', { x: 6, y: 72, width: 134, height: 7, rx: 3.5, fill: C.sun }),
      h('rect', { x: 14, y: 78, width: 118, height: 9, rx: 4, fill: C.navy }),
      h('path', { d: 'M132 79 L148 97 L132 97 Z', fill: C.sun })),
    wheel(40, 86, 15), wheel(76, 86, 15), wheel(114, 90, 11),
    h('rect', { x: 34, y: 84, width: 86, height: 4, rx: 2, fill: C.sunDark, class: 'rod' }));
}
export const FUNNEL_TOP = { x: 116 / 150, y: 12 / 110 }; // where steam leaves the funnel, as a fraction of the engine's box

// A little station for the end of the Hunt track: platform, building with a canopy roof in the lesson's colour, a clock,
// and bunting (.bunting) over the roof that drops down when the train arrives.
export function stationSvg({ accent = C.red } = {}) {
  const flags = ['#E5484D', '#FFD166', '#5AC8FA', '#4FC97E', '#B79CF5', '#FF9F6B', '#E5484D', '#FFD166'];
  return h('svg', { class: 'station-art', viewBox: '0 0 240 200', 'aria-hidden': 'true' },
    h('ellipse', { cx: 120, cy: 190, rx: 112, ry: 6, fill: 'rgba(60,40,20,.14)' }),
    h('rect', { x: 46, y: 88, width: 148, height: 72, rx: 8, fill: '#FFF3E0' }),
    h('rect', { x: 150, y: 88, width: 44, height: 72, rx: 8, fill: '#F2E2C6' }),
    h('rect', { x: 106, y: 110, width: 30, height: 50, rx: 7, fill: C.woodDark }), h('circle', { cx: 129, cy: 136, r: 2.4, fill: C.sun }),
    h('rect', { x: 60, y: 108, width: 32, height: 26, rx: 6, fill: '#BFE8FF' }), h('rect', { x: 150, y: 108, width: 32, height: 26, rx: 6, fill: '#BFE8FF' }),
    h('path', { d: 'M62 112 L74 112 L66 130 L62 130 Z', fill: '#fff', opacity: 0.6 }),
    h('path', { d: 'M18 94 Q16 86 26 82 L64 50 L176 50 L214 82 Q224 86 222 94 Z', fill: accent }),
    h('path', { d: 'M120 50 L176 50 L214 82 Q224 86 222 94 L120 94 Z', fill: '#000', opacity: 0.08 }),
    h('rect', { x: 14, y: 90, width: 212, height: 9, rx: 4.5, fill: '#fff', opacity: 0.9 }),
    h('circle', { cx: 120, cy: 70, r: 15, fill: '#FFF8EC', stroke: C.navy, 'stroke-width': 2 }),
    h('path', { d: 'M120 61 L120 70 L127 74', fill: 'none', stroke: C.navy, 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
    h('rect', { x: 6, y: 158, width: 228, height: 22, rx: 8, fill: C.cream }),
    h('rect', { x: 6, y: 158, width: 228, height: 5, rx: 2.5, fill: C.sun }),
    h('g', { class: 'bunting', style: { 'transform-box': 'fill-box', 'transform-origin': '50% 0%' } },
      h('path', { d: 'M30 30 Q120 50 210 30', fill: 'none', stroke: '#8A6E5A', 'stroke-width': 1.6 }),
      ...flags.map((c, i) => { const t = (i + 0.5) / flags.length, x = 30 + 180 * t, y = 30 + Math.sin(Math.PI * t) * 10; return h('path', { d: `M${x - 8} ${y - 1} L${x + 8} ${y - 1} L${x} ${y + 14} Z`, fill: c }); })));
}

// Puffy white cloud (a few circles).
const cloud = (cls, w) => h('svg', { class: 'tw-cloud ' + cls, viewBox: '0 0 120 50', width: w, 'aria-hidden': 'true' },
  h('g', { fill: '#fff' }, h('circle', { cx: 34, cy: 30, r: 18 }), h('circle', { cx: 60, cy: 22, r: 22 }), h('circle', { cx: 88, cy: 31, r: 16 }), h('rect', { x: 28, y: 30, width: 68, height: 16, rx: 8 })));

// The Letter Hunt scene: a warm sky, a soft sun, clouds, rolling hills, grass and a short track along the bottom.
export function huntBackdrop() {
  const sun = h('svg', { class: 'tw-sun', viewBox: '0 0 80 80', width: 58, 'aria-hidden': 'true' }, h('circle', { cx: 40, cy: 40, r: 34, fill: '#FFE9A8', opacity: 0.6 }), h('circle', { cx: 40, cy: 40, r: 22, fill: '#FFD166' }));
  const hills = h('svg', { class: 'tw-hills', viewBox: '0 0 100 40', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
    h('path', { d: 'M0 40 L0 20 C12 6 30 6 44 20 C54 30 64 28 72 20 C82 10 94 10 100 16 L100 40 Z', fill: '#A6E3B4' }),
    h('path', { d: 'M0 40 L0 30 C18 18 34 20 50 30 C64 38 80 24 100 26 L100 40 Z', fill: '#78D193' }));
  return [h('div', { class: 'tw-sky' }), sun, cloud('c1', 96), cloud('c2', 70), hills, h('div', { class: 'tw-grass' }), h('div', { class: 'tw-track', 'aria-hidden': 'true' })];
}

// An open goods wagon, facing right, with a cream panel on its side for the letter (.wagon-panel, filled by the game),
// a lid (.wagon-lid) that swings shut, and wheels.
export function wagonSvg() {
  return h('svg', { class: 'wagon-art', viewBox: '0 0 200 150', 'aria-hidden': 'true' },
    h('ellipse', { cx: 100, cy: 144, rx: 86, ry: 5, fill: 'rgba(60,40,20,.18)' }),
    h('rect', { x: 26, y: 112, width: 148, height: 12, rx: 5, fill: C.navy }),
    h('rect', { x: 16, y: 40, width: 168, height: 76, rx: 12, fill: '#D65A4A' }),
    h('rect', { x: 16, y: 84, width: 168, height: 32, rx: 12, fill: '#000', opacity: 0.08 }),
    ...[48, 152].map((x) => h('rect', { x, y: 44, width: 5, height: 68, rx: 2.5, fill: '#B8463A' })),
    h('rect', { x: 12, y: 34, width: 176, height: 10, rx: 5, fill: C.sun }),
    h('rect', { class: 'wagon-panel-bg', x: 66, y: 50, width: 68, height: 58, rx: 12, fill: '#FFF8EC' }),
    h('g', { class: 'wagon-lid', style: { 'transform-box': 'fill-box', 'transform-origin': '0% 100%' } },
      h('rect', { x: 14, y: 22, width: 172, height: 14, rx: 7, fill: C.navy }), h('rect', { x: 14, y: 22, width: 172, height: 5, rx: 2.5, fill: '#fff', opacity: 0.2 })),
    wheel(52, 126, 14, C.navy), wheel(148, 126, 14, C.navy),
    h('rect', { x: 2, y: 104, width: 16, height: 6, rx: 3, fill: C.navy }), h('rect', { x: 182, y: 104, width: 16, height: 6, rx: 3, fill: C.navy }));
}

// The Loading Dock scene: the same sky, hills, grass and track (the game lays its wooden platform over it).
export const dockBackdrop = () => huntBackdrop();

// A soft puff of steam, placed by the caller.
export const puffEl = () => h('span', { class: 'steam-puff', 'aria-hidden': 'true' });

// A wooden crate, front on: the Sound Station's icon on the 2D path, the finish screen and in Grownups.
export function crateSvg() {
  return h('svg', { class: 'crate-art', viewBox: '0 0 100 100', 'aria-hidden': 'true' },
    h('ellipse', { cx: 50, cy: 94, rx: 40, ry: 4, fill: 'rgba(60,40,20,.16)' }),
    h('rect', { x: 10, y: 12, width: 80, height: 78, rx: 12, fill: C.wood }),
    h('rect', { x: 10, y: 12, width: 80, height: 78, rx: 12, fill: 'none', stroke: C.woodDark, 'stroke-width': 2 }),
    h('rect', { x: 20, y: 22, width: 60, height: 58, rx: 7, fill: '#D9AE72' }),
    h('path', { d: 'M24 26 L76 76 M76 26 L24 76', stroke: C.woodDark, 'stroke-width': 7, 'stroke-linecap': 'round' }),
    h('rect', { x: 10, y: 12, width: 80, height: 8, rx: 4, fill: '#fff', opacity: 0.18 }));
}
