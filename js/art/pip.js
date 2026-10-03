// Pip, the baby conductor, in 2D: a toddler with a big round head, a navy conductor cap a size too big (with a gold
// badge showing a tiny train), a red neckerchief, navy overalls with two gold buttons over a cream shirt, and little
// brown boots. The same colours and proportions as the 3D Pip on the Home railway (js/train/pip3d.js reads PIP below).
//
//   pipSvg({ pose: 'wave' | 'cheer' | 'idle' | 'point', still })   (still: no animation at all, for small or hidden copies)
//
// Pip never says anything and never shows a letter: he only reacts. Idle: a gentle breathing bob, a blink every few
// seconds and a glance around (css .pip). 'wave' waves hello, 'cheer' hops once with both arms up and tips his cap,
// 'point' points to the right. Every animation is CSS, so reduced motion simply holds the resting pose.
import { h } from '../dom.js';

export const PIP = {
  skin: '#E2A57C', skinLight: '#F2C29C', skinShade: '#C98A63',
  cap: '#2B2D5C', capLight: '#3D4182', capDark: '#1E2046',
  badge: '#FFD166', badgeEdge: '#E5A73A',
  scarf: '#E5484D', scarfShade: '#C73B41',
  shirt: '#FFF0D8', shirtShade: '#F2DCB8', shirtEdge: '#E2C49A',
  overalls: '#2B2D5C', overallsLight: '#3A3E78',
  button: '#FFD166',
  boot: '#7A4A2A', bootLight: '#9A6440',
  hair: '#6B4226',
  eye: '#2A1E1A', cheek: '#F28B82', mouth: '#7A3B2E',
};
export const POSES = ['idle', 'wave', 'cheer', 'point'];

let uid = 0;

// The arms for each pose: a cream sleeve from the shoulder and a round hand. [left, right], as [sleeve path, hand x, hand y].
const ARMS = {
  idle: [['M43 97 Q36 106 35 117', 35, 119], ['M77 97 Q84 106 85 117', 85, 119]],
  wave: [['M43 97 Q36 106 35 117', 35, 119], ['M77 97 Q97 95 102 78', 103, 73]],
  cheer: [['M43 97 Q23 95 18 78', 17, 73], ['M77 97 Q97 95 102 78', 103, 73]],
  point: [['M43 97 Q36 106 35 117', 35, 119], ['M77 97 Q92 99 103 95', 106, 94]],
};

export function pipSvg({ pose = 'idle', still = false } = {}) {
  if (!ARMS[pose]) pose = 'idle';
  const id = `pip${++uid}`;
  const C = PIP;
  const arm = ([d, hx, hy], side) => h('g', { class: `pip-arm pip-arm-${side}` },
    h('path', { d, fill: 'none', stroke: C.shirtEdge, 'stroke-width': 13.5, 'stroke-linecap': 'round' }),
    h('path', { d, fill: 'none', stroke: C.shirt, 'stroke-width': 10.5, 'stroke-linecap': 'round' }),
    h('path', { d, fill: 'none', stroke: C.shirtShade, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.7, transform: 'translate(1.6 1.4)' }),
    h('circle', { cx: hx, cy: hy, r: 6.4, fill: `url(#${id}-skin)` }),
    pose === 'point' && side === 'r' ? h('rect', { x: hx + 2, y: hy - 2.6, width: 9, height: 4.4, rx: 2.2, fill: C.skin }) : null,
    (pose === 'wave' || pose === 'cheer') && (side === 'r' || pose === 'cheer') ? h('ellipse', { cx: hx + (side === 'r' ? -5 : 5), cy: hy + 2, rx: 2.4, ry: 3.4, fill: C.skin, transform: `rotate(${side === 'r' ? -30 : 30} ${hx} ${hy})` }) : null);

  const smile = pose === 'cheer'
    ? [h('path', { d: 'M51.5 77 Q60 90 68.5 77 Q60 80.5 51.5 77 Z', fill: '#8A2F2A' }), h('ellipse', { cx: 60, cy: 84, rx: 3.6, ry: 2, fill: '#F08080' })]
    : [h('path', { d: 'M53 78 Q60 84.5 67 78', fill: 'none', stroke: C.mouth, 'stroke-width': 2.4, 'stroke-linecap': 'round' })];

  return h('svg', { class: `pip pose-${pose}${still ? ' still' : ''}`, viewBox: '0 0 120 150', 'aria-hidden': 'true', dataset: { pose } },
    h('defs', {},
      h('radialGradient', { id: `${id}-skin`, cx: '40%', cy: '34%', r: '72%' }, h('stop', { offset: '0', 'stop-color': C.skinLight }), h('stop', { offset: '0.6', 'stop-color': C.skin }), h('stop', { offset: '1', 'stop-color': C.skinShade })),
      h('linearGradient', { id: `${id}-cap`, x1: 0, y1: 0, x2: 0.3, y2: 1 }, h('stop', { offset: '0', 'stop-color': C.capLight }), h('stop', { offset: '1', 'stop-color': C.cap })),
      h('linearGradient', { id: `${id}-ov`, x1: 0, y1: 0, x2: 1, y2: 0 }, h('stop', { offset: '0', 'stop-color': C.overallsLight }), h('stop', { offset: '1', 'stop-color': C.capDark }))),
    h('ellipse', { class: 'pip-shadow', cx: 60, cy: 146, rx: 28, ry: 3.6, fill: 'rgba(60,40,20,.18)' }),
    h('g', { class: 'pip-hop' }, h('g', { class: 'pip-fig' },
      // boots and legs
      h('ellipse', { cx: 48.5, cy: 140, rx: 10.5, ry: 6.5, fill: C.boot }), h('ellipse', { cx: 71.5, cy: 140, rx: 10.5, ry: 6.5, fill: C.boot }),
      h('ellipse', { cx: 46, cy: 137.6, rx: 5, ry: 2.2, fill: C.bootLight }), h('ellipse', { cx: 69, cy: 137.6, rx: 5, ry: 2.2, fill: C.bootLight }),
      h('rect', { x: 41, y: 116, width: 16, height: 22, rx: 7, fill: `url(#${id}-ov)` }), h('rect', { x: 63, y: 116, width: 16, height: 22, rx: 7, fill: `url(#${id}-ov)` }),
      // shirt, overalls, straps and buttons
      h('rect', { x: 37, y: 88, width: 46, height: 38, rx: 16, fill: C.shirtEdge }), h('rect', { x: 38.5, y: 89.5, width: 43, height: 35, rx: 15, fill: C.shirt }),
      h('path', { d: 'M38 115 Q38 108 45 108 L75 108 Q82 108 82 115 L82 118 Q82 130 70 130 L50 130 Q38 130 38 118 Z', fill: `url(#${id}-ov)` }),
      h('rect', { x: 46, y: 99, width: 28, height: 17, rx: 5, fill: `url(#${id}-ov)` }),
      h('path', { d: 'M48.5 101 L45 92 M71.5 101 L75 92', stroke: C.overalls, 'stroke-width': 4.6, 'stroke-linecap': 'round' }),
      h('rect', { x: 54, y: 105, width: 12, height: 7.5, rx: 2.6, fill: C.overallsLight }),
      h('circle', { cx: 49.5, cy: 103.5, r: 2.5, fill: C.button, stroke: C.badgeEdge, 'stroke-width': 0.8 }), h('circle', { cx: 70.5, cy: 103.5, r: 2.5, fill: C.button, stroke: C.badgeEdge, 'stroke-width': 0.8 }),
      arm(ARMS[pose][0], 'l'), arm(ARMS[pose][1], 'r'),
      // the neckerchief
      h('path', { d: 'M41 89 Q60 96 79 89 L64.5 104 Q60 108.5 55.5 104 Z', fill: C.scarf }),
      h('path', { d: 'M60 93.5 Q70 93 79 89 L64.5 104 Q62 106.6 60 106.8 Z', fill: C.scarfShade, opacity: 0.55 }),
      h('ellipse', { cx: 60, cy: 92.5, rx: 5, ry: 3.6, fill: '#D94148' }),
      // the head
      h('g', { class: 'pip-head' },
        h('circle', { cx: 27, cy: 64, r: 7, fill: C.skin }), h('circle', { cx: 93, cy: 64, r: 7, fill: C.skinShade }),
        h('circle', { cx: 27.5, cy: 64.5, r: 3.4, fill: C.skinShade, opacity: 0.7 }), h('circle', { cx: 92.5, cy: 64.5, r: 3.4, fill: '#B87A55', opacity: 0.7 }),
        h('circle', { class: 'pip-skull', cx: 60, cy: 60, r: 34, fill: `url(#${id}-skin)` }),
        h('path', { d: 'M31 46 Q27 55 33 58 Q33 53 37 52 Q35 49 38 46 Z', fill: C.hair }),
        h('path', { d: 'M89 46 Q93 55 87 58 Q87 53 83 52 Q85 49 82 46 Z', fill: C.hair }),
        h('g', { class: 'pip-eyes' }, h('g', { class: 'pip-look' },
          h('ellipse', { cx: 47, cy: 63, rx: 5.2, ry: 6.4, fill: C.eye }), h('ellipse', { cx: 73, cy: 63, rx: 5.2, ry: 6.4, fill: C.eye }),
          h('circle', { cx: 49, cy: 60.3, r: 2.1, fill: '#fff' }), h('circle', { cx: 75, cy: 60.3, r: 2.1, fill: '#fff' }),
          h('circle', { cx: 45.6, cy: 65.8, r: 0.9, fill: '#fff', opacity: 0.8 }), h('circle', { cx: 71.6, cy: 65.8, r: 0.9, fill: '#fff', opacity: 0.8 }))),
        h('ellipse', { cx: 38.5, cy: 73, rx: 6, ry: 4, fill: C.cheek, opacity: 0.55 }), h('ellipse', { cx: 81.5, cy: 73, rx: 6, ry: 4, fill: C.cheek, opacity: 0.55 }),
        h('ellipse', { cx: 60, cy: 71, rx: 3.4, ry: 2.6, fill: C.skinShade }), h('ellipse', { cx: 59, cy: 70.2, rx: 1.2, ry: 0.8, fill: '#fff', opacity: 0.45 }),
        ...smile),
      // the cap, a size too big, with a tuft of hair peeking out under it
      h('g', { class: 'pip-cap' },
        h('path', { d: 'M24 45 C21 22 39 8 60 8 C82 8 99 22 96 45 Z', fill: `url(#${id}-cap)` }),
        h('ellipse', { cx: 45, cy: 20, rx: 10, ry: 4, fill: '#fff', opacity: 0.16, transform: 'rotate(-24 45 20)' }),
        h('path', { d: 'M23.5 39 Q60 33 96.5 39 L96.5 45.5 Q60 39.5 23.5 45.5 Z', fill: C.capDark }),
        h('path', { d: 'M43 46 Q38 52 42 55 Q42 51 46 50.5 Q46 48 49 47 Z', fill: C.hair }),
        h('path', { d: 'M25 43.5 Q60 38.5 95 43.5 Q98 48.5 90 51.5 Q60 58.5 30 51.5 Q22 48.5 25 43.5 Z', fill: C.cap }),
        h('path', { d: 'M32 48.5 Q60 54 88 48.5', fill: 'none', stroke: '#fff', 'stroke-width': 1.2, opacity: 0.14, 'stroke-linecap': 'round' }),
        h('circle', { cx: 60, cy: 26, r: 7.6, fill: C.badge, stroke: C.badgeEdge, 'stroke-width': 1.2 }),
        h('rect', { x: 54.6, y: 24.4, width: 7.2, height: 4, rx: 1, fill: C.cap }),
        h('rect', { x: 60.4, y: 21.2, width: 4.4, height: 7.2, rx: 1, fill: C.cap }),
        h('rect', { x: 55.6, y: 21.8, width: 2, height: 3, rx: 0.6, fill: C.cap }),
        h('circle', { cx: 57, cy: 29.4, r: 1.4, fill: C.cap }), h('circle', { cx: 62.6, cy: 29.4, r: 1.4, fill: C.cap })))));
}
