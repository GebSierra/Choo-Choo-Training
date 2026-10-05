// The child's figure in 2D: the same flat style and 120 x 150 box as Pip (js/art/pip.js), in a sky-blue tee with a yellow
// star, teal trousers and white shoes. No conductor cap (the cap is Pip's) and no gradients, so no ids and a clone in the
// page turner stays clean. The choices come from js/character.js; the figure never carries a name unless `label` is given.
//
//   kidSvg({ skin, hair, hairColor, pose: 'idle' | 'wave' | 'cheer', still, label })   (skin, hairColor: index)
import { h } from '../dom.js';
import { SKINS, HAIR_COLORS, HAIR_STYLES, OUTFIT } from '../character.js';

const mixHex = (a, b, k) => {
  const p = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const [r, g, bl] = p(a).map((v, i) => Math.round(v + (p(b)[i] - v) * k));
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
};
const EYE = '#2A1E1A', CHEEK = '#F28B82', MOUTH = '#7A3B2E';

// Where the arms are: [sleeve path, hand x, hand y] for the left and the right arm.
const ARMS = {
  idle: [['M40 97 Q34 106 33 116', 33, 119], ['M80 97 Q86 106 87 116', 87, 119]],
  wave: [['M40 97 Q34 106 33 116', 33, 119], ['M80 97 Q98 95 103 78', 104, 73]],
  cheer: [['M40 97 Q22 95 17 78', 16, 73], ['M80 97 Q98 95 103 78', 104, 73]],
};

const star = (cx, cy, r) => Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`; }).join(' ');
const ring = (n, a0, a1, rad, cx = 60, cy = 58) => Array.from({ length: n }, (_, k) => { const a = ((a0 + ((a1 - a0) * k) / (n - 1)) * Math.PI) / 180; return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; });

// Hair: { back, front } as arrays of elements, from the colour and its shade.
function hairParts(style, col, shade) {
  const blob = (cx, cy, r, fill = col) => h('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r, fill });
  const band = (cx, cy) => h('ellipse', { cx, cy, rx: 4, ry: 3, fill: OUTFIT.band });
  const cap = (d) => [h('path', { d, fill: col }), h('path', { d: 'M40 30 Q60 24 82 32', fill: 'none', stroke: '#fff', 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.18 })];
  if (style === 'curly') {
    return {
      back: [[27, 62, 8], [25, 72, 7.5], [93, 62, 8], [95, 72, 7.5]].map(([x, y, r]) => blob(x, y, r, shade)),
      front: [...ring(9, 200, 340, 30).map(([x, y], k) => blob(x, y, k % 2 ? 9 : 10)), blob(50, 27, 9), blob(60, 23, 9.5), blob(70, 27, 9), blob(44, 38, 7), blob(76, 38, 7)],
    };
  }
  if (style === 'puffs') {
    return { back: [blob(26, 34, 14, shade), blob(94, 34, 14, shade), blob(26, 34, 11), blob(94, 34, 11)], front: [...cap('M30 54 C28 30 44 24 60 24 C76 24 92 30 90 54 C80 43 40 43 30 54 Z'), band(35, 45), band(85, 45)] };
  }
  if (style === 'ponytail') {
    return {
      back: [h('path', { d: 'M84 38 C108 34 114 70 101 94 C97 78 92 64 83 56 Z', fill: shade }), h('path', { d: 'M84 40 C104 38 108 68 100 88 C96 74 91 64 84 56 Z', fill: col })],
      front: [...cap('M29 58 C26 30 44 22 60 22 C78 22 94 32 91 58 C86 44 74 38 56 36 C44 40 34 46 29 58 Z'), band(88, 44)],
    };
  }
  if (style === 'bun') {
    return { back: [blob(60, 21, 14, shade), blob(60, 21, 11.5)], front: [...cap('M29 58 C27 30 44 23 60 23 C76 23 93 30 91 58 C86 47 78 41 60 41 C42 41 34 47 29 58 Z'), band(60, 32)] };
  }
  // short: a cap with a three-point fringe
  return { back: [], front: cap('M29 60 C27 32 42 22 60 22 C78 22 93 32 91 60 L86 52 L80 46 L72 52 L64 44 L56 52 L48 45 L40 50 L34 54 Z') };
}

export function kidSvg({ skin = 2, hair = 'short', hairColor = 1, pose = 'idle', still = false, label = null } = {}) {
  if (!ARMS[pose]) pose = 'idle';
  const skinC = SKINS[skin] || SKINS[2], skinD = mixHex(skinC, '#000000', 0.14);
  const hairC = HAIR_COLORS[hairColor] || HAIR_COLORS[1], hairD = mixHex(hairC, '#000000', 0.22);
  const teeD = mixHex(OUTFIT.tee, '#000000', 0.14);
  const hp = hairParts(HAIR_STYLES.includes(hair) ? hair : 'short', hairC, hairD);
  const arm = ([d, hx, hy], side) => h('g', { class: `kid-arm kid-arm-${side}` },
    h('path', { d, fill: 'none', stroke: teeD, 'stroke-width': 13, 'stroke-linecap': 'round' }),
    h('path', { d, fill: 'none', stroke: OUTFIT.tee, 'stroke-width': 10.5, 'stroke-linecap': 'round' }),
    h('circle', { cx: hx, cy: hy, r: 6.5, fill: skinC }));
  const attrs = { class: `kid pose-${pose}${still ? ' still' : ''}`, viewBox: '0 0 120 150', dataset: { pose } };
  if (label) { attrs.role = 'img'; attrs['aria-label'] = label; } else attrs['aria-hidden'] = 'true';
  return h('svg', attrs,
    h('ellipse', { class: 'kid-shadow', cx: 60, cy: 146, rx: 26, ry: 3.4, fill: 'rgba(60,40,20,.16)' }),
    h('g', { class: 'kid-hop' },
      h('g', { class: 'kid-hair-back' }, ...hp.back),
      h('rect', { x: 47, y: 116, width: 11, height: 24, rx: 5, fill: OUTFIT.trousers }), h('rect', { x: 62, y: 116, width: 11, height: 24, rx: 5, fill: OUTFIT.trousers }),
      h('ellipse', { cx: 52, cy: 141, rx: 9, ry: 5, fill: OUTFIT.shoe }), h('ellipse', { cx: 68, cy: 141, rx: 9, ry: 5, fill: OUTFIT.shoe }),
      h('path', { d: 'M43.5 143.5 Q52 146.5 60.5 143.5 M59.5 143.5 Q68 146.5 76.5 143.5', fill: 'none', stroke: OUTFIT.sole, 'stroke-width': 2, 'stroke-linecap': 'round' }),
      h('g', { class: 'kid-fig' },
        h('path', { d: 'M44 92 Q60 88 76 92 Q84 94 83 104 L82 120 Q60 124 38 120 L37 104 Q36 94 44 92 Z', fill: OUTFIT.tee }),
        h('path', { d: 'M38 114 Q60 119 82 114 L82 120 Q60 124 38 120 Z', fill: teeD, opacity: 0.45 }),
        h('polygon', { points: star(60, 106, 6.5), fill: OUTFIT.star })),
      arm(ARMS[pose][0], 'l'), arm(ARMS[pose][1], 'r'),
      h('rect', { x: 53, y: 82, width: 14, height: 14, rx: 5, fill: skinD }),
      h('circle', { cx: 30, cy: 60, r: 6, fill: skinC }), h('circle', { cx: 90, cy: 60, r: 6, fill: skinC }),
      h('circle', { cx: 30.5, cy: 60.5, r: 3, fill: skinD, opacity: 0.6 }), h('circle', { cx: 89.5, cy: 60.5, r: 3, fill: skinD, opacity: 0.6 }),
      h('circle', { class: 'kid-head', cx: 60, cy: 58, r: 30, fill: skinC }),
      h('g', { class: 'kid-eyes' },
        h('ellipse', { cx: 49, cy: 60, rx: 3.4, ry: 4.2, fill: EYE }), h('ellipse', { cx: 71, cy: 60, rx: 3.4, ry: 4.2, fill: EYE }),
        h('circle', { cx: 50.2, cy: 58.2, r: 1.3, fill: '#fff' }), h('circle', { cx: 72.2, cy: 58.2, r: 1.3, fill: '#fff' })),
      h('ellipse', { cx: 42, cy: 70, rx: 5.4, ry: 3.6, fill: CHEEK, opacity: 0.55 }), h('ellipse', { cx: 78, cy: 70, rx: 5.4, ry: 3.6, fill: CHEEK, opacity: 0.55 }),
      h('path', { d: 'M52 71 Q60 78.5 68 71', fill: 'none', stroke: MOUTH, 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
      h('g', { class: 'kid-hair-front' }, ...hp.front)));
}
