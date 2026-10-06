// Our own pictures for the f lesson prototype (house palette, flat style, no gradients and no ids, so a clone stays clean):
// the letter f drawn as a flower, the mouth saying f, a mat, and the three small scenes of the mini-story.
import { h } from '../dom.js';
import { glyphView } from '../glyphs.js';
import { kidSvg } from './kid.js';
import { TRAIN } from './train2d.js';

const GREEN = '#2FB37A', LEAF = '#3DD68C', LEAF_VEIN = '#1E8E5E', PETAL = '#F0556A', CENTER = '#FFD166', CENTER_DOT = '#E5A73A';

// The letter f as a flower: the f's tall stem is the flower's stem, its top hook ends in a drooping flower head, and its
// crossbar is two leaves. It uses the plain f's own box (glyphView), so the flower and the letter can swap in place.
// The box the flower and the plain f share, trimmed to the letter (and the flower head) so both sit centred and swap in place.
export const fBox = () => { const v = glyphView('f'); return `8 ${v.top} 72 ${v.h}`; };
export function flowerF() {
  const cx = 63, cy = 32;
  const petals = Array.from({ length: 6 }, (_, k) => {
    const a = (-90 + k * 60) * Math.PI / 180;
    return h('circle', { cx: (cx + Math.cos(a) * 7.4).toFixed(1), cy: (cy + Math.sin(a) * 7.4).toFixed(1), r: 5.6, fill: PETAL });
  });
  const leaf = (x, y, rot, flip) => h('g', { transform: `translate(${x} ${y}) rotate(${rot}) scale(${flip} 1)` },
    h('path', { d: 'M0 0 C4 -8 14 -9 20 -2 C14 6 4 7 0 0 Z', fill: LEAF }),
    h('path', { d: 'M1 0 C6 -1 12 -2 18 -2', fill: 'none', stroke: LEAF_VEIN, 'stroke-width': 1.3, 'stroke-linecap': 'round' }));
  return h('svg', { class: 'flower-f', viewBox: fBox(), role: 'img', 'aria-label': 'the letter f drawn as a flower' },
    // the stem: the f's own stroke, from the top of the hook down to the ground
    h('path', { d: 'M60 24 C58 18 53 15 47 15 C41 15 38 20 38 28 L38 80', fill: 'none', stroke: GREEN, 'stroke-width': 11.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    h('path', { d: 'M38 20 L38 78', fill: 'none', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.22, transform: 'translate(-2.4 0)' }),
    // the crossbar becomes two leaves, one each side of the stem
    leaf(38, 42, -20, -1), leaf(38, 42, 14, 1),
    // a short bent neck, and the drooping flower head
    h('g', { class: 'flower-head' },
      h('path', { d: 'M60 24 Q66 22 64 27', fill: 'none', stroke: GREEN, 'stroke-width': 5, 'stroke-linecap': 'round' }),
      h('g', { transform: `rotate(18 ${cx} ${cy - 4})` }, ...petals, h('circle', { cx, cy, r: 5.4, fill: CENTER }), h('circle', { cx: cx - 1.4, cy: cy - 1.6, r: 1.6, fill: CENTER_DOT }), h('circle', { cx: cx + 1.8, cy: cy + 1.2, r: 1.2, fill: CENTER_DOT }))));
}

// A mouth saying f, from the front: the top teeth rest on the bottom lip, and air flows out below (three small arrows that
// move down and fade, three times: CSS, finite). Give the svg the class `go` again to replay them.
export function mouthSvg() {
  const lip = '#E8707B', lipLow = '#F28B97', skin = '#F6D3B8', shade = '#EDBFA0';
  const chip = (x, y, w, text) => h('g', { class: 'mouth-tag' },
    h('rect', { x, y, width: w, height: 26, rx: 13, fill: '#fff', stroke: '#CFD3E8', 'stroke-width': 1.5 }),
    h('text', { x: x + w / 2, y: y + 18, 'text-anchor': 'middle', fill: '#1E2140' }, text));
  const arrow = (x, i) => h('g', { class: `air air-${i}` }, h('path', { d: `M${x} 150 L${x} 172 M${x - 8} 164 L${x} 173 L${x + 8} 164`, fill: 'none', stroke: '#14A3A8', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  return h('svg', { class: 'mouth go', viewBox: '0 0 240 200', role: 'img', 'aria-label': 'A mouth with the top teeth resting on the bottom lip and air blowing out' },
    h('rect', { x: 14, y: 8, width: 212, height: 130, rx: 64, fill: skin }),
    h('ellipse', { cx: 120, cy: 46, rx: 15, ry: 10, fill: shade }), h('circle', { cx: 113, cy: 50, r: 2.2, fill: '#B98B6E' }), h('circle', { cx: 127, cy: 50, r: 2.2, fill: '#B98B6E' }),
    h('ellipse', { cx: 54, cy: 90, rx: 17, ry: 10, fill: '#F28B82', opacity: 0.5 }), h('ellipse', { cx: 186, cy: 90, rx: 17, ry: 10, fill: '#F28B82', opacity: 0.5 }),
    h('ellipse', { cx: 120, cy: 92, rx: 48, ry: 9, fill: '#7A3B2E' }),
    h('path', { d: 'M68 92 C90 101 150 101 172 92 C168 120 144 130 120 130 C96 130 72 120 68 92 Z', fill: lipLow }),
    h('path', { d: 'M96 103 C110 108 130 108 144 103', fill: 'none', stroke: lip, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.6 }),
    h('rect', { class: 'teeth', x: 92, y: 80, width: 56, height: 21, rx: 7, fill: '#fff', stroke: '#E5DACB', 'stroke-width': 1.5 }),
    h('path', { d: 'M106 82 L106 100 M120 82 L120 100 M134 82 L134 100', stroke: '#E5DACB', 'stroke-width': 1.5 }),
    h('path', { d: 'M62 90 C78 70 104 72 120 79 C136 72 162 70 178 90 C160 90 140 86 120 86 C100 86 80 90 62 90 Z', fill: lip }),
    chip(6, 20, 78, 'top teeth'), h('path', { d: 'M62 46 L104 82', stroke: '#1E2140', 'stroke-width': 2, 'stroke-linecap': 'round' }), h('circle', { cx: 104, cy: 82, r: 4, fill: '#1E2140' }),
    chip(160, 108, 76, 'bottom lip'), h('path', { d: 'M160 121 L140 114', stroke: '#1E2140', 'stroke-width': 2, 'stroke-linecap': 'round' }), h('circle', { cx: 140, cy: 114, r: 4, fill: '#1E2140' }),
    arrow(96, 1), arrow(120, 2), arrow(144, 3));
}

// A woven mat seen a little from above (the picture for "mat"): red with a yellow and a green stripe, fringed at both ends.
export function matSvg() {
  const band = (y0, y1, c) => h('path', { d: `M${19 - (y0 - 24) * 0.17} ${y0} L${103 + (y0 - 24) * 0.17} ${y0} L${103 + (y1 - 24) * 0.17} ${y1} L${19 - (y1 - 24) * 0.17} ${y1} Z`, fill: c });
  const fringe = (y, dir) => Array.from({ length: 9 }, (_, i) => {
    const x = (y === 24 ? 22 : 12) + i * 10.4;
    return h('path', { d: `M${x} ${y} l${(i - 4) * 0.5} ${dir * 7}`, stroke: '#F3E6CF', 'stroke-width': 2.4, 'stroke-linecap': 'round' });
  });
  return h('svg', { class: 'art-mat', viewBox: '4 12 112 62', role: 'img', 'aria-label': 'a mat' },
    h('ellipse', { cx: 60, cy: 70, rx: 52, ry: 6, fill: 'rgba(60,40,20,.14)' }),
    h('path', { d: 'M19 24 L103 24 L112 62 L10 62 Z', fill: '#D65A4A' }),
    band(30, 36, '#FFD166'), band(44, 50, '#4FB783'), band(54, 58, '#FFD166'),
    h('path', { d: 'M19 24 L103 24 L112 62 L10 62 Z', fill: 'none', stroke: '#B8463A', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }),
    ...fringe(24, -1), ...fringe(62, 1));
}

// ---- the mini-story ----
const SAM = { skin: 3, hair: 'curly', hairColor: 0, outfit: 'green' };
const SIS = { skin: 1, hair: 'ponytail', hairColor: 3, outfit: 'dress' };
export const kidAt = (look, x, y, w, pose = 'idle') => { const k = kidSvg({ ...look, pose, still: true }); k.setAttribute('class', 'kid-in-scene'); k.setAttribute('x', x); k.setAttribute('y', y); k.setAttribute('width', w); k.setAttribute('height', (w * 150) / 120); return k; };
export const samFace = () => { const k = kidSvg({ ...SAM, still: true, label: 'Sam' }); k.setAttribute('viewBox', '12 6 96 96'); k.classList.add('face-crop'); return k; };

const table = () => h('g', {},
  h('rect', { x: 34, y: 128, width: 9, height: 20, rx: 3, fill: TRAIN.woodDark }), h('rect', { x: 197, y: 128, width: 9, height: 20, rx: 3, fill: TRAIN.woodDark }),
  h('path', { d: 'M30 100 L210 100 L228 122 L12 122 Z', fill: TRAIN.wood }),
  h('rect', { x: 12, y: 122, width: 216, height: 9, rx: 3, fill: TRAIN.woodDark }));
// the map on the table: cream paper, a green hill and a path that ends at the red X
const paperMap = (x = 0, y = 0, k = 1) => h('g', { transform: `translate(${x} ${y}) scale(${k})` },
  h('path', { d: 'M82 103 L158 103 L170 119 L70 119 Z', fill: '#FFF3D6', stroke: '#E6CFA0', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
  h('path', { d: 'M92 116 L104 108 L112 116 Z', fill: '#7FD36B' }),
  h('path', { d: 'M96 115 C106 110 112 117 122 112 C130 108 134 111 140 108', fill: 'none', stroke: '#B8926A', 'stroke-width': 1.6, 'stroke-dasharray': '2 3', 'stroke-linecap': 'round' }),
  h('path', { d: 'M140 105 L148 113 M148 105 L140 113', stroke: '#E5484D', 'stroke-width': 2.6, 'stroke-linecap': 'round' }));

export function storyScene(name) {
  const svg = (...kids) => h('svg', { class: `story-scene story-${name}`, viewBox: '0 0 240 150', role: 'img', 'aria-hidden': 'true' },
    h('rect', { x: 0, y: 0, width: 240, height: 150, fill: '#D6F1FF' }), h('circle', { cx: 206, cy: 28, r: 15, fill: '#FFD166' }),
    h('path', { d: 'M0 112 C40 100 80 104 120 110 C160 116 200 104 240 108 L240 150 L0 150 Z', fill: '#BFEAA8' }),
    h('rect', { x: 0, y: 132, width: 240, height: 18, fill: '#8FD67A' }),
    h('ellipse', { cx: 120, cy: 146, rx: 100, ry: 5, fill: 'rgba(60,40,20,.14)' }), ...kids);
  if (name === 'sam-sat') return svg(kidAt(SAM, 74, 8, 92, 'idle'), table(), paperMap());
  if (name === 'sis-sat') return svg(kidAt(SIS, 74, 8, 92, 'idle'), table(), paperMap(), h('path', { d: 'M196 100 L196 70', stroke: '#8A6E5A', 'stroke-width': 3, 'stroke-linecap': 'round' }), h('path', { d: 'M196 70 L216 77 L196 84 Z', fill: '#E5484D' }));
  // a fat map: a big thick scroll, still partly rolled, and Sam amazed beside it
  return svg(
    kidAt(SAM, 4, 30, 62, 'cheer'),
    h('path', { d: 'M92 96 L214 96 L226 124 L80 124 Z', fill: '#FFF3D6', stroke: '#E6CFA0', 'stroke-width': 2, 'stroke-linejoin': 'round' }),
    h('path', { d: 'M110 118 L124 104 L136 118 Z', fill: '#7FD36B' }),
    h('path', { d: 'M196 102 L208 114 M208 102 L196 114', stroke: '#E5484D', 'stroke-width': 3.4, 'stroke-linecap': 'round' }),
    h('rect', { x: 66, y: 34, width: 138, height: 72, rx: 36, fill: '#F3E6CF', stroke: '#D9C39A', 'stroke-width': 3 }),
    h('path', { d: 'M92 40 C84 56 84 84 92 100 M118 38 C112 56 112 84 118 102 M146 38 C140 56 140 84 146 102 M174 40 C168 56 168 84 174 100', fill: 'none', stroke: '#E1CDA5', 'stroke-width': 3, 'stroke-linecap': 'round' }),
    h('circle', { cx: 78, cy: 70, r: 33, fill: '#FFF3D6', stroke: '#D9C39A', 'stroke-width': 3 }),
    h('circle', { cx: 78, cy: 70, r: 22, fill: 'none', stroke: '#D9C39A', 'stroke-width': 3 }),
    h('circle', { cx: 78, cy: 70, r: 11, fill: 'none', stroke: '#D9C39A', 'stroke-width': 3 }),
    h('circle', { cx: 78, cy: 70, r: 3.5, fill: '#D9C39A' }));
}

// The letters of a wordSvg moved apart by `gap` (user units each): the tiles of "break it" and of the warm-up blend. The
// geometry the slide-to-blend reads (data-x0, data-x1, data-width) moves with them.
// tiles: a rounded white tile behind each letter (class tile-bg, which `.lit` tints); pad: room kept around the row for them.
export function spreadWord(svg, gap, { tiles = false, pad = 0 } = {}) {
  const groups = [...svg.querySelectorAll('.glyph-letter')];
  const vb = svg.getAttribute('viewBox').split(' ').map(Number);
  groups.forEach((g, i) => {
    const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute('transform'));
    const x0 = Number(g.dataset.x0), x1 = Number(g.dataset.x1), shift = pad + i * gap;
    if (tiles) g.prepend(h('rect', { class: 'tile-bg', x: x0 - Number(m[1]) - 9, y: vb[1] + 3, width: x1 - x0 + 18, height: vb[3] - 6, rx: 12 }));
    g.setAttribute('transform', `translate(${Number(m[1]) + shift} ${m[2]})`);
    g.dataset.x0 = String(x0 + shift); g.dataset.x1 = String(x1 + shift);
    g.dataset.tx = String(Number(m[1]) + shift);
  });
  const w = Number(svg.dataset.width) + (groups.length - 1) * gap + pad * 2;
  svg.dataset.width = String(w);
  vb[2] = w;
  svg.setAttribute('viewBox', vb.join(' '));
  svg.dataset.gap = String(gap);
  return svg;
}
