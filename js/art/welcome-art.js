// The four little scenes at the top of the welcome card (js/components/welcome-card.js), one per page, drawn as flat SVG in the
// house palette and soft rounded shapes (the same look as Pip and the 2D train world). Each is a 320 by 170 box anchored to
// the bottom of its band and scaled to fill it (slice): what matters in each scene sits in the middle 170 units, so a tall,
// narrow band shows the middle and a short, wide one shows everything. The word "mom"
// needs the whole width, so on a short landscape screen (a narrow column) it is fitted instead (meet); the ground runs on past both sides. Nothing here speaks, and the only
// words are the "mmm" in the speech bubble and the letters on the three wagons. The only motion is a few steam puffs, a
// twinkling star and a wagon bob, all finite CSS (transform and opacity), and all off under reduced motion.
import { h } from '../dom.js';
import { engineSvg, wagonSvg, TRAIN as C } from './train2d.js';
import { pipSvg } from './pip.js';
import { accentOf } from '../theme.js';

const W = 320, H = 170;
const wide = () => matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
const frame = (kids, meet = false) => h('svg', { class: 'wc-scene', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: meet && wide() ? 'xMidYMax meet' : 'xMidYMax slice', 'aria-hidden': 'true', focusable: 'false' }, ...kids);
const at = (el, x, y, w, hgt) => { for (const [k, v] of Object.entries({ x, y, width: w, height: hgt })) el.setAttribute(k, v); return el; };
const cloud = (x, y, s = 1, op = 0.95) => h('g', { transform: `translate(${x} ${y}) scale(${s})`, opacity: op }, h('ellipse', { cx: 0, cy: 6, rx: 22, ry: 8, fill: '#fff' }), h('circle', { cx: -8, cy: 0, r: 9, fill: '#fff' }), h('circle', { cx: 6, cy: -3, r: 11, fill: '#fff' }));
const sparkle = (x, y, r, cls = '') => h('path', { class: 'wc-spark ' + cls, d: `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`, fill: '#fff' });
const hills = () => [
  h('ellipse', { cx: 40, cy: 168, rx: 120, ry: 44, fill: '#9BE0B4' }),
  h('ellipse', { cx: 250, cy: 170, rx: 130, ry: 48, fill: '#7FD39F' }),
  h('rect', { x: -400, y: 150, width: W + 800, height: 40, fill: '#6CC78F' }),
];
// The track along the bottom: two rails on sleepers.
const track = (y = 152) => [
  ...Array.from({ length: 52 }, (_, k) => h('rect', { x: k * 20 - 406, y: y + 4, width: 14, height: 5, rx: 2, fill: C.sleeper })),
  h('rect', { x: -400, y: y + 1, width: W + 800, height: 3.5, rx: 1.7, fill: C.rail }),
];
const puffs = (x, y) => [0, 1, 2].map((k) => h('circle', { class: 'wc-puff', style: { 'animation-delay': `${k * 0.9}s` }, cx: x + k * 2, cy: y, r: 6 + k * 1.6, fill: '#fff' }));

// Page 1: Pip waves from the engine, a puff of steam rising.
function railway() {
  const eng = engineSvg({ pose: 'wave' });
  at(eng, 86, 38, 150, 110);
  return frame([cloud(104, 34, 1), cloud(268, 44, 0.8, 0.85), h('circle', { cx: 238, cy: 26, r: 14, fill: C.sun }), cloud(60, 60, 0.7, 0.8), ...hills(), ...track(),
    h('g', { class: 'wc-pip' }, eng), ...puffs(211, 40)]);
}

// Page 2: a little stack of books with a star on top.
function books() {
  const book = (x, y, w, col, dark, rot = 0) => h('g', { transform: `rotate(${rot} ${x + w / 2} ${y + 9})` },
    h('rect', { x, y, width: w, height: 18, rx: 4, fill: col }), h('rect', { x: x + 4, y: y + 3, width: w - 8, height: 12, rx: 2, fill: '#FFF8EC' }),
    h('rect', { x, y, width: 9, height: 18, rx: 4, fill: dark }), h('path', { d: `M${x + 14} ${y + 7} h${w - 28} M${x + 14} ${y + 11} h${w - 36}`, stroke: '#D9CBB0', 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
  const star = h('g', { class: 'wc-star', style: { 'transform-origin': '160px 40px' } },
    h('circle', { cx: 160, cy: 40, r: 25, fill: '#fff', opacity: 0.35 }),
    h('path', { d: 'M160 18 L166.6 32.2 L182 34 L170.6 44.4 L173.6 59.6 L160 52 L146.4 59.6 L149.4 44.4 L138 34 L153.4 32.2 Z', fill: C.sun, stroke: C.sunDark, 'stroke-width': 2, 'stroke-linejoin': 'round' }));
  return frame([cloud(48, 40, 1), cloud(268, 30, 0.9, 0.85), ...hills(),
    h('ellipse', { cx: 160, cy: 154, rx: 74, ry: 6, fill: 'rgba(60,40,20,.16)' }),
    book(98, 136, 124, '#E5484D', '#B93339'), book(110, 117, 100, '#4FB0E8', '#2F83B8', -2), book(104, 98, 108, C.sun, C.sunDark, 2), book(118, 80, 84, '#7B6AE6', '#5A4BD6', -1),
    star, sparkle(112, 52, 7, 'a'), sparkle(212, 56, 6, 'b'), sparkle(236, 100, 5, 'c')]);
}

// Page 3: Pip says "mmm" in a speech bubble.
function bubble() {
  const pip = pipSvg({ pose: 'idle' });
  at(pip, 58, 58, 72, 90);
  return frame([cloud(86, 34, 0.9, 0.85), cloud(248, 44, 0.8, 0.8), ...hills(), ...track(),
    pip,
    h('g', { class: 'wc-bubble' },
      h('path', { d: 'M138 80 L121 98 L146 104 Z', fill: '#fff' }),
      h('rect', { x: 134, y: 46, width: 124, height: 68, rx: 32, fill: '#fff' }),
      h('text', { x: 196, y: 93, 'text-anchor': 'middle', 'font-size': 40, 'font-weight': 900, fill: accentOf('m'), 'font-family': 'Nunito, system-ui, sans-serif', 'letter-spacing': 1 }, 'mmm')),
    sparkle(250, 30, 6, 'a'), sparkle(118, 40, 5, 'b')]);
}

// Page 4: the word "mom" on three wagons.
function wagons() {
  const wag = (x, letter) => {
    const w = at(wagonSvg({ body: '#E5764A', rib: '#C65A32' }), x, 76, 100, 75);
    return [w, h('text', { x: x + 50, y: 127.5, 'text-anchor': 'middle', 'font-size': 36, 'font-weight': 900, fill: accentOf(letter), 'font-family': 'Nunito, system-ui, sans-serif' }, letter)];
  };
  return frame([cloud(50, 36, 1), cloud(272, 28, 0.85, 0.85), h('circle', { cx: 28, cy: 24, r: 13, fill: C.sun }), ...hills(), ...track(),
    h('g', { class: 'wc-cars' }, h('rect', { x: 100, y: 128, width: 8, height: 3, rx: 1.5, fill: C.navy }), h('rect', { x: 208, y: 128, width: 8, height: 3, rx: 1.5, fill: C.navy }),
      ...wag(4, 'm'), ...wag(108, 'o'), ...wag(212, 'm')),
    sparkle(80, 56, 6, 'a'), sparkle(236, 52, 6, 'b'), sparkle(160, 36, 5, 'c')], true);
}

export const WELCOME_ART = [railway, books, bubble, wagons];
// Sky colours behind each scene (CSS custom properties on the band).
export const WELCOME_SKY = [['#BFE8FF', '#F2FAFF'], ['#FFE7B8', '#FFF8EC'], ['#D9D2FF', '#F6F3FF'], ['#BDEFD6', '#F1FBF6']];
