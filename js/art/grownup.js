// "Watch my mouth": a friendly grown-up, drawn once for every lesson. Head and shoulders, looking straight at the viewer, one
// finger resting at the side of the mouth (this draws the child's eyes to the mouth). The style is the app's own: flat shapes, no
// gradients, no ids. Neutral on purpose: short hair, no beard or make-up, a plain teal top, a warm mid skin tone.
import { h } from '../dom.js';

const SKIN = '#E7B48C', SKIN_SHADE = '#D79F77', HAIR = '#4B342E', EYE = '#2A1E1A', LIP = '#B5575A', TOP = '#14A3A8', TOP_SHADE = '#0F8A8F';

export function grownupSvg() {
  return h('svg', { class: 'grownup-art', viewBox: '0 0 240 230', role: 'img', 'aria-label': 'A friendly grown-up facing the child, with one finger at the side of their mouth' },
    // shoulders and neck
    h('path', { d: 'M18 230 C20 186 58 168 96 162 L144 162 C182 168 220 186 222 230 Z', fill: TOP }),
    h('path', { d: 'M96 162 Q120 182 144 162 L144 168 Q120 190 96 168 Z', fill: TOP_SHADE }),
    h('rect', { x: 102, y: 136, width: 36, height: 34, rx: 12, fill: SKIN_SHADE }),
    // the raised arm: forearm up from the bottom right to the cheek
    h('path', { d: 'M214 232 C206 200 196 176 184 156', fill: 'none', stroke: TOP, 'stroke-width': 30, 'stroke-linecap': 'round' }),
    // ears and head
    h('ellipse', { cx: 63, cy: 98, rx: 8, ry: 12, fill: SKIN_SHADE }), h('ellipse', { cx: 177, cy: 98, rx: 8, ry: 12, fill: SKIN_SHADE }),
    h('ellipse', { cx: 120, cy: 94, rx: 56, ry: 62, fill: SKIN }),
    // hair: a short, soft cap
    h('path', { d: 'M62 88 C54 40 90 20 124 22 C160 22 188 46 178 90 C172 70 160 56 136 52 C112 58 82 56 62 88 Z', fill: HAIR }),
    h('path', { d: 'M92 40 Q112 30 136 36', fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.2 }),
    // eyes looking at you
    h('ellipse', { cx: 98, cy: 94, rx: 10, ry: 11, fill: '#fff' }), h('ellipse', { cx: 142, cy: 94, rx: 10, ry: 11, fill: '#fff' }),
    h('circle', { cx: 98, cy: 95, r: 6, fill: EYE }), h('circle', { cx: 142, cy: 95, r: 6, fill: EYE }),
    h('circle', { cx: 100, cy: 92.5, r: 2, fill: '#fff' }), h('circle', { cx: 144, cy: 92.5, r: 2, fill: '#fff' }),
    h('path', { d: 'M86 78 Q98 70 110 77 M130 77 Q142 70 154 78', fill: 'none', stroke: HAIR, 'stroke-width': 4, 'stroke-linecap': 'round' }),
    // nose, cheeks
    h('path', { d: 'M118 104 Q113 116 119 119 Q124 120 126 117', fill: 'none', stroke: SKIN_SHADE, 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    h('ellipse', { cx: 82, cy: 116, rx: 11, ry: 7, fill: '#F28B82', opacity: 0.4 }), h('ellipse', { cx: 158, cy: 116, rx: 11, ry: 7, fill: '#F28B82', opacity: 0.4 }),
    // a gentle open smile: this is the mouth the child watches
    h('path', { d: 'M100 134 Q120 154 140 134 Q120 140 100 134 Z', fill: LIP, stroke: LIP, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    h('path', { d: 'M106 137 Q120 143 134 137', fill: 'none', stroke: '#fff', 'stroke-width': 3.4, 'stroke-linecap': 'round' }),
    // a soft ring at the corner of the mouth, so the eye goes there
    h('circle', { class: 'gu-ping', cx: 149, cy: 134, r: 11, fill: 'none', stroke: '#F0556A', 'stroke-width': 3 }),
    // the hand: a fist on the cheek side with one finger touching the side of the mouth
    h('rect', { x: 178, y: 156, width: 30, height: 34, rx: 13, fill: SKIN, transform: 'rotate(-28 193 173)' }),
    h('path', { d: 'M184 172 q7 -3 13 2 M187 180 q7 -3 12 2', fill: 'none', stroke: SKIN_SHADE, 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.85 }),
    h('path', { d: 'M190 162 L158 138', fill: 'none', stroke: SKIN, 'stroke-width': 9.5, 'stroke-linecap': 'round' }),
    h('path', { d: 'M176 153 L163 143.5', fill: 'none', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.3 }));
}
