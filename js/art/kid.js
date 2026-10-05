// The child's figure in 2D: the same flat style and 120 x 150 box as Pip (js/art/pip.js), in a sky-blue tee with a yellow
// star, teal trousers and white shoes. No conductor cap (the cap is Pip's) and no gradients, so no ids and a clone in the
// page turner stays clean. The choices come from js/character.js; the figure never carries a name unless `label` is given.
//
//   kidSvg({ skin, hair, hairColor, pose: 'idle' | 'wave' | 'cheer', still, label })   (skin, hairColor: index)
import { h } from '../dom.js';
import { SKINS, HAIR_COLORS, HAIR_STYLES, OUTFIT, outfitOf, mixHex } from '../character.js';

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
function hairParts(style, col, shade, skinC) {
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
  if (style === 'long') {
    return {
      back: [h('path', { d: 'M30 50 C18 62 28 76 21 92 C25 100 31 95 34 106 C42 100 50 108 60 104 C70 108 78 100 86 106 C89 95 95 100 99 92 C92 76 102 62 90 50 Z', fill: shade }),
        h('path', { d: 'M31 54 C22 64 31 76 25 90 C29 96 33 93 36 102 L84 102 C87 93 91 96 95 90 C89 76 98 64 89 54 Z', fill: col })],
      front: cap('M29 62 C26 30 44 22 60 22 C78 22 94 30 91 62 C88 48 78 38 64 34 C52 40 38 48 29 62 Z'),
    };
  }
  if (style === 'braids') {
    const braid = (x, d) => [0, 1, 2, 3].map((k) => h('ellipse', { cx: x + (k % 2 ? d * 1.6 : -d * 1.6), cy: 72 + k * 9, rx: 5.2, ry: 5.6, fill: k % 2 ? col : shade }));
    return {
      back: [...braid(23, 1), ...braid(97, -1), h('ellipse', { cx: 23, cy: 109, rx: 3.6, ry: 3, fill: OUTFIT.band }), h('ellipse', { cx: 97, cy: 109, rx: 3.6, ry: 3, fill: OUTFIT.band })],
      front: [...cap('M29 60 C26 30 44 22 60 22 C78 22 94 30 91 60 C86 46 76 40 62 38 L58 38 C44 40 34 46 29 60 Z'), h('path', { d: 'M60 23 L60 38', stroke: shade, 'stroke-width': 1.6, 'stroke-linecap': 'round' }), band(30, 62), band(90, 62)],
    };
  }
  if (style === 'afro') {
    return {
      back: [...ring(11, 160, 380, 33, 60, 54).map(([x, y]) => blob(x, y, 13, shade)), blob(60, 46, 30, shade)],
      front: [...ring(7, 212, 328, 28, 60, 58).map(([x, y], k) => blob(x, y, k % 2 ? 9 : 10.5)), blob(60, 30, 11), blob(44, 36, 9), blob(76, 36, 9), blob(34, 48, 8), blob(86, 48, 8)],
    };
  }
  if (style === 'bob') {
    return {
      back: [h('path', { d: 'M25 54 C21 80 24 90 33 92 L87 92 C96 90 99 80 95 54 Z', fill: shade })],
      front: [...cap('M29 62 C26 30 44 22 60 22 C78 22 94 30 91 62 L88 50 C80 43 40 43 32 50 Z'),
        h('path', { d: 'M29 60 C26 74 28 86 34 90 L42 88 C37 80 36 70 37 60 Z', fill: col }), h('path', { d: 'M91 60 C94 74 92 86 86 90 L78 88 C83 80 84 70 83 60 Z', fill: col })],
    };
  }
  if (style === 'buzz') {
    const fuzz = mixHex(col, skinC, 0.45);
    return { back: [], front: [h('path', { d: 'M31 56 C29 34 44 27 60 27 C76 27 91 34 89 56 C85 47 75 41 60 41 C45 41 35 47 31 56 Z', fill: fuzz })] };
  }
  // short: a cap with a three-point fringe
  return { back: [], front: cap('M29 60 C27 32 42 22 60 22 C78 22 93 32 91 60 L86 52 L80 46 L72 52 L64 44 L56 52 L48 45 L40 50 L34 54 Z') };
}

const TORSO = 'M44 92 Q60 88 76 92 Q84 94 83 104 L82 120 Q60 124 38 120 L37 104 Q36 94 44 92 Z';
const HEM = 'M38 114 Q60 119 82 114 L82 120 Q60 124 38 120 Z';
// What the figure wears: { back: behind the legs and body (a hood), front: the shirt and what is on it }.
function outfitParts(o, c, cd) {
  const torso = h('path', { d: TORSO, fill: c }), hem = h('path', { d: HEM, fill: cd, opacity: 0.45 });
  const btn = (x, y) => h('circle', { cx: x, cy: y, r: 1.8, fill: '#FFD166' });
  const back = [];
  let front;
  if (o.id === 'stripes') {
    front = [torso, ...[97, 105, 113].map((y) => h('rect', { x: 38.5, y, width: 43, height: 4.2, fill: o.stripe })), hem];
  } else if (o.id === 'hoodie') {
    back.push(h('ellipse', { cx: 60, cy: 90, rx: 22, ry: 10, fill: cd }));
    front = [torso, hem, h('path', { d: 'M48 91 Q60 100 72 91', fill: 'none', stroke: cd, 'stroke-width': 3.2, 'stroke-linecap': 'round' }),
      h('path', { d: 'M46 108 L74 108 L77 119 Q60 122 43 119 Z', fill: cd, opacity: 0.55 }),
      h('path', { d: 'M55 97 L54 106 M65 97 L66 106', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round' })];
  } else if (o.id === 'dress') {
    front = [torso, h('path', { d: 'M36 112 Q60 118 84 112 L93 131 Q60 140 27 131 Z', fill: c }), h('path', { d: 'M36 112 Q60 118 84 112', fill: 'none', stroke: cd, 'stroke-width': 3, 'stroke-linecap': 'round' }),
      h('path', { d: 'M28 128 Q60 137 92 128', fill: 'none', stroke: '#fff', 'stroke-width': 2, 'stroke-dasharray': '1 5', 'stroke-linecap': 'round', opacity: 0.85 }),
      h('path', { d: 'M50 91 Q60 97 70 91', fill: 'none', stroke: '#fff', 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.8 })];
  } else if (o.id === 'overalls') {
    front = [torso, h('path', { d: 'M37.5 111 Q60 116 82.5 111 L82 120 Q60 124 38 120 Z', fill: o.bib }),
      h('path', { d: 'M49 100 L71 100 L72 114 Q60 117 48 114 Z', fill: o.bib }), h('path', { d: 'M49 100 L46 90 M71 100 L74 90', stroke: o.bib, 'stroke-width': 4.4, 'stroke-linecap': 'round' }),
      h('rect', { x: 55, y: 104, width: 10, height: 7, rx: 1.6, fill: mixHex(o.bib, '#000000', 0.2) }), btn(49.5, 101.5), btn(70.5, 101.5)];
  } else if (o.id === 'vest') {
    front = [torso, h('path', { d: 'M44 92 Q50 90.5 55 92 L60 108 L65 92 Q70 90.5 76 92 Q84 94 83 104 L82 120 Q60 124 38 120 L37 104 Q36 94 44 92 Z', fill: o.vest }),
      h('path', { d: 'M54 91.5 L60 99 L66 91.5 Q60 94 54 91.5 Z', fill: '#E5484D' }), btn(60, 111), btn(60, 116.5), hem];
  } else if (o.id === 'sweater') {
    front = [torso, hem, h('path', { d: 'M38 116 L82 116', stroke: cd, 'stroke-width': 5, 'stroke-linecap': 'butt', opacity: 0.55 }),
      h('path', { d: 'M44 117 V122 M50 117 V123 M56 117 V123.6 M62 117 V123.6 M68 117 V123 M74 117 V122', stroke: cd, 'stroke-width': 1.2, opacity: 0.7 }),
      h('path', { d: 'M49 91.5 Q60 98 71 91.5', fill: 'none', stroke: cd, 'stroke-width': 3.4, 'stroke-linecap': 'round' }),
      h('polygon', { points: star(60, 105, 6.5), fill: OUTFIT.star })];
  } else if (o.id === 'star') {
    front = [torso, hem, h('polygon', { points: star(60, 106, 6.5), fill: OUTFIT.star })];
  } else {
    front = [torso, hem, h('path', { d: 'M49 91.5 Q60 97 71 91.5', fill: 'none', stroke: cd, 'stroke-width': 2.6, 'stroke-linecap': 'round' })];
  }
  return { back, front };
}

export function kidSvg({ skin = 2, hair = 'short', hairColor = 1, outfit = 'star', pose = 'idle', still = false, label = null } = {}) {
  if (!ARMS[pose]) pose = 'idle';
  const skinC = SKINS[skin] || SKINS[2], skinD = mixHex(skinC, '#000000', 0.14);
  const hairC = HAIR_COLORS[hairColor] || HAIR_COLORS[1], hairD = mixHex(hairC, '#000000', 0.22);
  const o = outfitOf(outfit), topC = o.top, teeD = mixHex(topC, '#000000', 0.14), legC = o.legs || skinC;
  const hp = hairParts(HAIR_STYLES.includes(hair) ? hair : 'short', hairC, hairD, skinC);
  const wear = outfitParts(o, topC, teeD);
  const arm = ([d, hx, hy], side) => h('g', { class: `kid-arm kid-arm-${side}` },
    h('path', { d, fill: 'none', stroke: teeD, 'stroke-width': 13, 'stroke-linecap': 'round' }),
    h('path', { d, fill: 'none', stroke: topC, 'stroke-width': 10.5, 'stroke-linecap': 'round' }),
    h('circle', { cx: hx, cy: hy, r: 6.5, fill: skinC }));
  const attrs = { class: `kid pose-${pose}${still ? ' still' : ''}`, viewBox: '0 0 120 150', dataset: { pose } };
  if (label) { attrs.role = 'img'; attrs['aria-label'] = label; } else attrs['aria-hidden'] = 'true';
  return h('svg', attrs,
    h('ellipse', { class: 'kid-shadow', cx: 60, cy: 146, rx: 26, ry: 3.4, fill: 'rgba(60,40,20,.16)' }),
    h('g', { class: 'kid-hop' },
      h('g', { class: 'kid-hair-back' }, ...hp.back),
      h('g', { class: 'kid-wear-back' }, ...wear.back),
      h('rect', { x: 47, y: 116, width: 11, height: 24, rx: 5, fill: legC }), h('rect', { x: 62, y: 116, width: 11, height: 24, rx: 5, fill: legC }),
      h('ellipse', { cx: 52, cy: 141, rx: 9, ry: 5, fill: OUTFIT.shoe }), h('ellipse', { cx: 68, cy: 141, rx: 9, ry: 5, fill: OUTFIT.shoe }),
      h('path', { d: 'M43.5 143.5 Q52 146.5 60.5 143.5 M59.5 143.5 Q68 146.5 76.5 143.5', fill: 'none', stroke: OUTFIT.sole, 'stroke-width': 2, 'stroke-linecap': 'round' }),
      h('g', { class: 'kid-fig' },
        ...wear.front),
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
