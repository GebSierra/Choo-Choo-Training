// Our own storybook art for the games, as small inline SVG in the app's colors: a gold star
// and the farm backdrop. Rounded shapes, flat fills, no bitmaps.
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
