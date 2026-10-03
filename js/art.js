// Our own storybook art for the games, as small inline SVG in the app's colors: a barn,
// a gold star and the farm backdrop. Rounded shapes, flat fills, no bitmaps.
import { h } from './dom.js';

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
