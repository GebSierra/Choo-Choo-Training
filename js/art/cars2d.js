// The five special cars as small flat SVG icons (the level banner): caboose red with a cupola, coach sky-blue with three
// windows, flatbed navy with a wooden block, tanker mint with a round tank, dome lilac with a pale dome. Same palette
// as the 3D cars in js/train/train.js and the rest of the train world.
import { h } from '../dom.js';
import { TRAIN } from './train2d.js';

const C = TRAIN, SKY = '#7DB8F5', MINT = '#5FE3B0', LILAC = '#CDC4F8', PALE = '#EDE8FF';
const wheels = () => [50, 150].map((cx) => h('g', {}, h('circle', { cx, cy: 100, r: 13, fill: C.navy }), h('circle', { cx, cy: 100, r: 5.5, fill: C.sun })));
const chassis = () => [h('rect', { x: 14, y: 86, width: 172, height: 10, rx: 4, fill: C.navy }), h('rect', { x: 2, y: 90, width: 14, height: 5, rx: 2.5, fill: C.navy }), h('rect', { x: 184, y: 90, width: 14, height: 5, rx: 2.5, fill: C.navy })];
const win = (x, y, w = 24, hh = 22) => h('rect', { x, y, width: w, height: hh, rx: 5, fill: '#FFF6D6' });

const BODY = {
  caboose: () => [
    h('rect', { x: 78, y: 12, width: 44, height: 28, rx: 6, fill: C.redDark }), win(86, 19, 12, 14), win(102, 19, 12, 14), h('rect', { x: 74, y: 8, width: 52, height: 7, rx: 3.5, fill: C.sun }),
    h('rect', { x: 22, y: 36, width: 156, height: 52, rx: 9, fill: C.red }), h('rect', { x: 22, y: 36, width: 156, height: 7, rx: 3.5, fill: C.sun }),
    win(44, 52), win(88, 52), win(132, 52),
  ],
  coach: () => [
    h('rect', { x: 18, y: 28, width: 164, height: 60, rx: 12, fill: SKY }), h('rect', { x: 18, y: 28, width: 164, height: 8, rx: 4, fill: C.sun }),
    win(36, 46, 30, 24), win(86, 46, 30, 24), win(136, 46, 30, 24), h('rect', { x: 18, y: 76, width: 164, height: 5, fill: 'rgba(0,0,0,.12)' }),
  ],
  flatbed: () => [
    h('rect', { x: 16, y: 74, width: 168, height: 14, rx: 5, fill: C.navy }), h('rect', { x: 16, y: 74, width: 168, height: 4, rx: 2, fill: C.sun }),
    h('rect', { x: 48, y: 22, width: 104, height: 52, rx: 8, fill: C.wood }), h('rect', { x: 48, y: 22, width: 104, height: 8, rx: 4, fill: '#E3BC84' }),
    h('rect', { x: 68, y: 22, width: 7, height: 52, fill: C.woodDark }), h('rect', { x: 125, y: 22, width: 7, height: 52, fill: C.woodDark }),
  ],
  tanker: () => [
    h('rect', { x: 20, y: 72, width: 160, height: 16, rx: 6, fill: C.navy }),
    h('rect', { x: 26, y: 20, width: 148, height: 62, rx: 31, fill: MINT }), h('rect', { x: 26, y: 20, width: 148, height: 14, rx: 7, fill: 'rgba(255,255,255,.35)' }),
    h('rect', { x: 62, y: 20, width: 6, height: 62, fill: 'rgba(0,0,0,.12)' }), h('rect', { x: 132, y: 20, width: 6, height: 62, fill: 'rgba(0,0,0,.12)' }),
    h('rect', { x: 92, y: 10, width: 16, height: 12, rx: 4, fill: C.sun }),
  ],
  dome: () => [
    h('rect', { x: 18, y: 44, width: 164, height: 44, rx: 10, fill: LILAC }), h('rect', { x: 18, y: 44, width: 164, height: 7, rx: 3.5, fill: C.sun }),
    h('path', { d: 'M40 44 C40 6 160 6 160 44 Z', fill: PALE }), h('path', { d: 'M52 44 C56 20 144 20 148 44 Z', fill: 'rgba(125,184,245,.35)' }),
    win(36, 58, 26, 20), win(87, 58, 26, 20), win(138, 58, 26, 20),
  ],
};

export function carSvg(kind, cls = '') {
  const body = BODY[kind] || BODY.coach;
  return h('svg', { class: 'car-svg ' + cls, viewBox: '0 0 200 120', 'aria-hidden': 'true' },
    h('ellipse', { cx: 100, cy: 112, rx: 86, ry: 4, fill: 'rgba(60,40,20,.18)' }), ...chassis(), ...body(), ...wheels());
}
