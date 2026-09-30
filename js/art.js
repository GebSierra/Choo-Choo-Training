// Our own storybook art for the games, as small inline SVG in the app's colors: a sheep, a barn, a burlap sack,
// a gold star and the farm backdrop. Rounded shapes, flat fills, no bitmaps.
import { h } from './dom.js';

const INK = '#1E2140';
export const STAR_PATH = 'M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z';

export const starSvg = (cls = '') => h('svg', { class: 'gold-star ' + cls, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
  h('path', { d: STAR_PATH, fill: '#FFD166', stroke: '#F0A93B', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }));

// Sky, sun, soft clouds, rolling hills, a white picket fence and grass. The sun and clouds sit still.
// Only the ground is sized in pixels, so portrait and landscape both get the same look.
export function farmBackdrop() {
  const cloud = (cls, w) => h('svg', { class: 'farm-cloud ' + cls, viewBox: '0 0 120 50', width: w, 'aria-hidden': 'true' },
    h('g', { fill: '#fff', opacity: 0.6 }, h('circle', { cx: 34, cy: 30, r: 18 }), h('circle', { cx: 60, cy: 22, r: 22 }), h('circle', { cx: 88, cy: 31, r: 16 }), h('rect', { x: 28, y: 30, width: 68, height: 16, rx: 8 })));
  const sun = h('svg', { class: 'farm-sun', viewBox: '0 0 80 80', width: 58, 'aria-hidden': 'true' },
    h('circle', { cx: 40, cy: 40, r: 34, fill: '#FFE9A8', opacity: 0.55 }), h('circle', { cx: 40, cy: 40, r: 22, fill: '#FFD166' }));
  const hills = h('svg', { class: 'farm-hills', viewBox: '0 0 100 40', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
    h('path', { d: 'M0 40 L0 22 C14 6 34 6 48 22 C58 30 66 30 74 22 C84 12 94 10 100 16 L100 40 Z', fill: '#9BDDA6' }),
    h('path', { d: 'M0 40 L0 30 C18 18 34 20 50 30 C64 38 80 24 100 26 L100 40 Z', fill: '#6FCB85' }));
  const fence = h('div', { class: 'farm-fence', 'aria-hidden': 'true' }, ...Array.from({ length: 26 }, () => h('i')));
  return [h('div', { class: 'farm-sky' }), sun, cloud('c1', 96), cloud('c2', 70), hills, fence, h('div', { class: 'farm-grass' })];
}

// The sheep stands facing right: a cloud of overlapping white circles, a soft purple face with tiny round glasses.
// Legs are two groups (.leg-a and .leg-b) so they can trot in turn; .wave-leg lifts to wave.
export function sheepSvg() {
  const fluff = [[38, 52, 21], [62, 44, 24], [86, 52, 21], [50, 64, 19], [74, 64, 19], [28, 62, 13], [92, 62, 13], [62, 58, 24]];
  const leg = (x, cls) => h('g', { class: 'leg ' + cls, style: { 'transform-box': 'fill-box', 'transform-origin': '50% 0%' } },
    h('rect', { x, y: 68, width: 10, height: 28, rx: 5, fill: '#8C7EF5' }), h('rect', { x, y: 88, width: 10, height: 8, rx: 4, fill: '#5A4BD6' }));
  return h('svg', { class: 'sheep', viewBox: '0 0 134 104', 'aria-hidden': 'true' },
    h('ellipse', { cx: 64, cy: 99, rx: 46, ry: 4.5, fill: 'rgba(30,33,64,.16)' }),
    h('g', { class: 'legs' }, leg(30, 'leg-a'), leg(68, 'leg-a'), leg(44, 'leg-b'), leg(82, 'leg-b wave-leg')),
    h('g', { class: 'sheep-body' },
      h('g', { fill: '#DCE2F4' }, ...fluff.map(([x, y, r]) => h('circle', { cx: x, cy: y + 4, r }))),
      h('g', { fill: '#FFFFFF' }, ...fluff.map(([x, y, r]) => h('circle', { cx: x, cy: y, r }))),
      h('circle', { cx: 18, cy: 60, r: 9, fill: '#fff' }),
      h('g', { fill: 'none', stroke: '#DCE2F4', 'stroke-width': 2.6, 'stroke-linecap': 'round' },
        h('path', { d: 'M34 50 q6 -8 13 -2' }), h('path', { d: 'M58 36 q7 -7 14 0' }), h('path', { d: 'M74 54 q6 -7 13 -1' }), h('path', { d: 'M46 68 q6 -6 12 0' }), h('path', { d: 'M68 70 q6 -6 12 0' }), h('path', { d: 'M28 64 q3 -5 8 -2' })),
      h('ellipse', { cx: 96, cy: 42, rx: 6.5, ry: 11, fill: '#9E8EEB', transform: 'rotate(-28 96 42)' }),
      h('ellipse', { cx: 121, cy: 42, rx: 6.5, ry: 11, fill: '#9E8EEB', transform: 'rotate(28 121 42)' }),
      h('ellipse', { cx: 108, cy: 56, rx: 18, ry: 17, fill: '#BBAEF6' }),
      h('g', { fill: '#fff' }, h('circle', { cx: 100, cy: 40, r: 8 }), h('circle', { cx: 111, cy: 37, r: 8.5 }), h('circle', { cx: 120, cy: 41, r: 7 })),
      h('circle', { cx: 101, cy: 55, r: 6.6, fill: 'rgba(255,255,255,.55)', stroke: INK, 'stroke-width': 1.8 }),
      h('circle', { cx: 116, cy: 55, r: 6.6, fill: 'rgba(255,255,255,.55)', stroke: INK, 'stroke-width': 1.8 }),
      h('path', { d: 'M107.6 55 L109.4 55', stroke: INK, 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
      h('circle', { cx: 102, cy: 55.5, r: 2.1, fill: INK }), h('circle', { cx: 117, cy: 55.5, r: 2.1, fill: INK }),
      h('circle', { cx: 97, cy: 65, r: 3.2, fill: '#F0556A', opacity: 0.3 }), h('circle', { cx: 120, cy: 65, r: 3.2, fill: '#F0556A', opacity: 0.3 }),
      h('path', { d: 'M104 66 Q109 70 114 66', fill: 'none', stroke: INK, 'stroke-width': 1.9, 'stroke-linecap': 'round' })));
}

// A red barn with white trim and two X doors. The door leaves (.door-l, .door-r) are separate so they can swing open
// from their outer edges; .barn-dark is the interior they reveal.
export function barnSvg({ interior = false } = {}) {
  const leaf = (x, cls, origin) => h('g', { class: 'door ' + cls, style: { 'transform-box': 'fill-box', 'transform-origin': origin } },
    h('rect', { x, y: 100, width: 58, height: 92, rx: 2, fill: '#D8424A', stroke: '#fff', 'stroke-width': 4 }),
    h('path', { d: `M${x + 5} 105 L${x + 53} 187 M${x + 53} 105 L${x + 5} 187`, stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round' }));
  return h('svg', { class: 'barn-art', viewBox: '0 0 240 200', 'aria-hidden': 'true' },
    h('ellipse', { cx: 120, cy: 194, rx: 112, ry: 6, fill: 'rgba(30,33,64,.16)' }),
    h('path', { d: 'M6 88 L42 42 L120 16 L198 42 L234 88 Z', fill: '#B5313B', stroke: '#fff', 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    h('rect', { x: 22, y: 84, width: 196, height: 108, rx: 4, fill: '#D8424A', stroke: '#fff', 'stroke-width': 5 }),
    h('g', { stroke: '#B5313B', 'stroke-width': 2, opacity: 0.35 }, ...[38, 54, 70, 154, 170, 186, 202].map((x) => h('line', { x1: x, y1: 88, x2: x, y2: 190 }))),
    h('rect', { x: 100, y: 44, width: 40, height: 30, rx: 4, fill: '#7A2530', stroke: '#fff', 'stroke-width': 4 }),
    h('path', { d: 'M104 48 L136 70 M136 48 L104 70', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round' }),
    h('rect', { class: 'barn-dark', x: 62, y: 100, width: 116, height: 92, rx: 2, fill: interior ? '#2B1A2B' : '#D8424A' }),
    leaf(62, 'door-l', '0% 50%'), leaf(120, 'door-r', '100% 50%'));
}

// A burlap sack with stitching and a rope tie. The glyph is laid over its front patch by the game (.sack-front).
export function sackSvg() {
  return h('svg', { class: 'sack-art', viewBox: '0 0 160 184', 'aria-hidden': 'true' },
    h('ellipse', { cx: 80, cy: 178, rx: 58, ry: 5, fill: 'rgba(30,33,64,.16)' }),
    h('path', { d: 'M46 56 C34 86 14 112 18 150 C20 170 42 176 80 176 C118 176 140 170 142 150 C146 112 126 86 114 56 Z', fill: '#DDB97E' }),
    h('path', { d: 'M114 56 C126 86 146 112 142 150 C140 170 118 176 80 176 C108 172 118 160 122 140 C126 110 120 80 114 56 Z', fill: '#C99A5B' }),
    h('path', { d: 'M40 62 C36 38 52 30 62 42 C68 28 92 28 98 42 C108 30 124 38 120 62 Z', fill: '#E8C996' }),
    h('path', { d: 'M62 44 C68 54 92 54 98 44', fill: 'none', stroke: '#B98A4E', 'stroke-width': 3, 'stroke-linecap': 'round' }),
    h('rect', { x: 38, y: 84, width: 84, height: 72, rx: 14, fill: '#F7EAD0' }),
    h('path', { d: 'M42 160 C44 168 60 170 80 170', fill: 'none', stroke: '#A9793F', 'stroke-width': 2, 'stroke-dasharray': '5 5', 'stroke-linecap': 'round' }),
    h('path', { d: 'M120 160 C118 168 102 170 80 170', fill: 'none', stroke: '#A9793F', 'stroke-width': 2, 'stroke-dasharray': '5 5', 'stroke-linecap': 'round' }),
    h('path', { d: 'M44 66 C62 76 98 76 116 66', fill: 'none', stroke: '#8A5A2B', 'stroke-width': 7, 'stroke-linecap': 'round' }),
    h('circle', { cx: 80, cy: 74, r: 7, fill: '#8A5A2B' }),
    h('path', { d: 'M78 78 C70 90 66 96 62 100 M82 78 C90 90 96 94 100 98', fill: 'none', stroke: '#8A5A2B', 'stroke-width': 5, 'stroke-linecap': 'round' }));
}
