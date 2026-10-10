// The backdrops of the storybook pages (js/screens/book.js): a whole picture behind Pip, the engine and the kid, drawn
// from what the page says. Flat fills in the house palette, no outlines, nothing animated and no image files.
//
//   bookScene('station')        a <span class="book-scene sc-station"> for the .book-art box (see "storybook pages" in app.css)
//   SCENES                      the kinds: meadow, track, station, hill, picnic, sunset
//
// Two layers, so the picture follows any box shape: the sky (a CSS gradient on .book-scene, with the sun, moon and clouds
// in .sc-top, kept to the top) and the ground (hills, trees, the station, the track in .sc-ground, kept to the bottom).
// Both slice, so a wide box shows the lower part of the ground and a tall box shows all of it. In the ground drawing the
// things that matter for the story stand low (y 100 to 200 of 200); the figures stand at the foot of the box.
const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) el.setAttribute(k, String(v));
  for (const c of kids.flat(Infinity)) if (c) el.append(c);
  return el;
};

export const SCENES = ['meadow', 'track', 'station', 'hill', 'picnic', 'sunset'];

const G = { far: '#B7E6C4', farBlue: '#A9DCCB', mid: '#8AD9A0', near: '#69C98A', nearDark: '#52B676', tuft: '#3FA06A', trunk: '#A87B4F', leaf: '#4FBF7D', leafDark: '#3AA468', red: '#E5484D', sun: '#FFD166', cream: '#F3E6CF', navy: '#2B2D5C' };

const cloud = (x, y, k = 1, fill = '#fff', op = 0.95) => s('g', { transform: `translate(${x} ${y}) scale(${k})`, fill, opacity: op },
  s('circle', { cx: 0, cy: 14, r: 14 }), s('circle', { cx: 22, cy: 6, r: 19 }), s('circle', { cx: 48, cy: 15, r: 13 }), s('rect', { x: -12, y: 14, width: 72, height: 14, rx: 7 }));
const sun = (x, y, r = 20) => s('g', {}, s('circle', { cx: x, cy: y, r: r * 1.9, fill: '#FFF3C4', opacity: 0.45 }), s('circle', { cx: x, cy: y, r: r * 1.35, fill: '#FFE9A8', opacity: 0.7 }), s('circle', { cx: x, cy: y, r, fill: G.sun }));
const tree = (x, y, k = 1) => s('g', { transform: `translate(${x} ${y}) scale(${k})` },
  s('rect', { x: -5, y: -34, width: 10, height: 36, rx: 4, fill: G.trunk }),
  s('circle', { cx: 0, cy: -52, r: 26, fill: G.leafDark }), s('circle', { cx: -14, cy: -40, r: 18, fill: G.leafDark }), s('circle', { cx: 15, cy: -42, r: 17, fill: G.leafDark }),
  s('circle', { cx: -3, cy: -57, r: 22, fill: G.leaf }), s('circle', { cx: -15, cy: -43, r: 14, fill: G.leaf }), s('circle', { cx: 11, cy: -47, r: 12, fill: G.leaf }));
const bush = (x, y, k = 1) => s('g', { transform: `translate(${x} ${y}) scale(${k})` }, s('circle', { cx: -10, cy: -8, r: 11, fill: G.leafDark }), s('circle', { cx: 8, cy: -10, r: 13, fill: G.leafDark }), s('circle', { cx: 0, cy: -14, r: 11, fill: G.leaf }));
const tuft = (x, y, k = 1, fill = G.tuft) => s('path', { transform: `translate(${x} ${y}) scale(${k})`, d: 'M-9 0 L-6 -15 L-3 -4 L0 -19 L3 -4 L6 -14 L9 0 Z', fill });
const flower = (x, y, c) => s('g', {}, s('circle', { cx: x, cy: y, r: 3.2, fill: c }), s('circle', { cx: x, cy: y, r: 1.2, fill: '#FFF3C4' }));
const hills = (a, b) => [
  s('path', { d: 'M0 200 L0 104 C40 76 88 78 132 100 C170 118 206 92 246 84 C300 72 350 92 400 104 L400 200 Z', fill: a }),
  s('path', { d: 'M0 200 L0 132 C50 108 104 112 160 130 C214 148 270 112 330 114 C362 116 384 124 400 130 L400 200 Z', fill: b })];
const grassBase = (top = 150, fill = G.near) => s('path', { d: `M0 200 L0 ${top + 8} C80 ${top - 4} 140 ${top + 6} 210 ${top} C290 ${top - 6} 340 ${top + 4} 400 ${top - 2} L400 200 Z`, fill });

// The track runs across the bottom: a stone bed, two rails, the sleepers (the engine's wheels sit on y 176).
function track(y = 168) {
  const sleepers = [];
  for (let x = -6; x < 410; x += 17) sleepers.push(s('rect', { x, y: y + 6, width: 11, height: 12, rx: 2, fill: '#B8926A' }));
  return s('g', {},
    s('rect', { x: 0, y: y + 1, width: 400, height: 40, fill: '#CDB89A' }), s('rect', { x: 0, y: y + 1, width: 400, height: 3, fill: '#E3D3B8' }),
    ...sleepers,
    s('rect', { x: 0, y: y + 7, width: 400, height: 3.5, rx: 1.5, fill: '#8A6E5A' }), s('rect', { x: 0, y: y + 14, width: 400, height: 3.5, rx: 1.5, fill: '#8A6E5A' }),
    s('rect', { x: 0, y: y + 7, width: 400, height: 1.2, fill: '#C4A58B' }), s('rect', { x: 0, y: y + 14, width: 400, height: 1.2, fill: '#C4A58B' }));
}

function station() {
  return s('g', {},
    s('rect', { x: 196, y: 70, width: 176, height: 78, rx: 8, fill: '#FFF3E0' }), s('rect', { x: 316, y: 70, width: 56, height: 78, rx: 8, fill: '#F2E2C6' }),
    s('rect', { x: 268, y: 98, width: 32, height: 50, rx: 7, fill: '#A87B4F' }), s('circle', { cx: 293, cy: 125, r: 2.4, fill: G.sun }),
    s('rect', { x: 214, y: 92, width: 36, height: 30, rx: 6, fill: '#BFE8FF' }), s('rect', { x: 328, y: 92, width: 34, height: 30, rx: 6, fill: '#BFE8FF' }),
    s('path', { d: 'M217 96 L229 96 L221 116 L217 116 Z', fill: '#fff', opacity: 0.6 }),
    s('path', { d: 'M180 76 Q178 68 188 64 L226 30 L342 30 L382 64 Q392 68 390 76 Z', fill: G.red }),
    s('path', { d: 'M284 30 L342 30 L382 64 Q392 68 390 76 L284 76 Z', fill: '#000', opacity: 0.08 }),
    s('rect', { x: 176, y: 72, width: 218, height: 9, rx: 4.5, fill: '#fff', opacity: 0.92 }),
    s('circle', { cx: 284, cy: 52, r: 14, fill: '#FFF8EC', stroke: G.navy, 'stroke-width': 2 }),
    s('path', { d: 'M284 43 L284 52 L291 56', fill: 'none', stroke: G.navy, 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
    // the platform, a lamp and its sign
    s('rect', { x: 0, y: 144, width: 400, height: 34, fill: '#E9DCC3' }), s('rect', { x: 0, y: 144, width: 400, height: 5, fill: '#FFD166' }),
    s('rect', { x: 0, y: 178, width: 400, height: 22, fill: '#B8A586' }), s('rect', { x: 0, y: 178, width: 400, height: 3, fill: '#8A7A5E' }),
    s('rect', { x: 48, y: 86, width: 5, height: 62, rx: 2, fill: G.navy }), s('circle', { cx: 50.5, cy: 82, r: 9, fill: '#FFF3C4' }), s('circle', { cx: 50.5, cy: 82, r: 5.5, fill: G.sun }));
}

function hillTrack() {
  return s('g', { fill: 'none', 'stroke-linecap': 'round' },
    s('path', { d: 'M-10 190 C60 186 110 172 170 150 C230 128 262 112 300 96 C340 80 372 78 410 82', stroke: '#CDB89A', 'stroke-width': 17 }),
    s('path', { d: 'M-10 190 C60 186 110 172 170 150 C230 128 262 112 300 96 C340 80 372 78 410 82', stroke: '#B8926A', 'stroke-width': 11, 'stroke-dasharray': '3 11' }),
    s('path', { d: 'M-10 187 C60 183 110 169 170 147 C230 125 262 109 300 93 C340 77 372 75 410 79', stroke: '#8A6E5A', 'stroke-width': 2.6 }),
    s('path', { d: 'M-10 194 C60 190 110 176 170 154 C230 132 262 116 300 100 C340 84 372 82 410 86', stroke: '#8A6E5A', 'stroke-width': 2.6 }));
}

function blanket() {
  const sq = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 0) {
    const y0 = 150 + r * 12, y1 = y0 + 12, k0 = 0.62 + 0.38 * (r / 4), k1 = 0.62 + 0.38 * ((r + 1) / 4);
    const x = (cc, k) => 200 + (cc - 4) * 26 * k;
    sq.push(s('path', { d: `M${x(c, k0)} ${y0} L${x(c + 1, k0)} ${y0} L${x(c + 1, k1)} ${y1} L${x(c, k1)} ${y1} Z`, fill: '#E5484D' }));
  }
  return s('g', {}, s('path', { d: 'M92 150 L308 150 L330 198 L70 198 Z', fill: '#FFF3E0' }), ...sq);
}

// Each ground: [sky class, top layer, ground layer].
const BUILD = {
  meadow: () => [
    [sun(338, 46), cloud(46, 44, 0.9), cloud(190, 22, 0.7)],
    [...hills(G.far, G.mid), tree(58, 150, 1.05), bush(352, 148, 1), grassBase(156), tuft(24, 178), tuft(366, 176, 1.2), tuft(310, 190, 0.9), tuft(96, 192, 0.8),
      flower(40, 190, '#FF9F6B'), flower(148, 184, '#E0559C'), flower(262, 192, '#fff'), flower(330, 184, '#FF9F6B'), flower(214, 178, '#B79CF5')]],
  track: () => [
    [sun(338, 46), cloud(60, 36, 0.85), cloud(204, 54, 0.65)],
    [...hills(G.far, G.mid), tree(318, 124, 0.8), bush(46, 128, 0.9), grassBase(132, G.near), track(168), tuft(14, 168, 1.1), tuft(386, 166, 1.2), tuft(40, 170, 0.8), tuft(364, 170, 0.9)]],
  station: () => [
    [sun(54, 46, 18), cloud(120, 34, 0.8), cloud(250, 14, 0.6)],
    [s('rect', { x: 0, y: 122, width: 400, height: 40, fill: G.far }), tree(40, 132, 0.75), tree(176, 128, 0.6), station()]],
  hill: () => [
    [sun(66, 46), cloud(196, 38, 0.9), cloud(310, 70, 0.6)],
    [s('path', { d: 'M0 200 L0 96 C60 70 150 70 216 92 C270 110 320 70 400 66 L400 200 Z', fill: G.farBlue }),
      s('path', { d: 'M0 200 L0 130 C64 102 150 104 214 128 C276 152 330 116 400 112 L400 200 Z', fill: G.mid }),
      s('path', { d: 'M0 200 L0 160 C70 150 150 154 230 172 C300 188 350 170 400 168 L400 200 Z', fill: G.near }), hillTrack(), tree(48, 140, 0.7), bush(364, 120, 0.8), tuft(20, 194, 1), tuft(372, 196, 1.1)]],
  picnic: () => [
    [sun(330, 44), cloud(50, 50, 0.85), cloud(176, 24, 0.7)],
    [s('path', { d: 'M0 200 L0 118 C70 84 150 80 214 96 C280 112 340 100 400 118 L400 200 Z', fill: G.mid }),
      s('path', { d: 'M0 200 L0 150 C80 134 160 136 230 148 C300 160 350 150 400 144 L400 200 Z', fill: G.near }),
      tree(44, 132, 1.1), bush(352, 138, 0.9), blanket(), tuft(24, 186), tuft(378, 184, 1.1), flower(322, 190, '#FF9F6B'), flower(40, 194, '#E0559C')]],
  sunset: () => [
    [s('circle', { cx: 200, cy: 150, r: 60, fill: '#FFE9A8', opacity: 0.35 }), s('circle', { cx: 200, cy: 150, r: 38, fill: '#FFD166' }),
      cloud(34, 54, 0.8, '#FFD6C9', 0.85), cloud(262, 38, 0.7, '#FFD6C9', 0.8),
      ...[[60, 14], [150, 28], [248, 12], [330, 30], [372, 56], [18, 36]].map(([x, y]) => s('circle', { cx: x, cy: y, r: 1.8, fill: '#FFF3C4' }))],
    [s('path', { d: 'M0 200 L0 110 C60 84 130 88 190 110 C250 132 320 92 400 104 L400 200 Z', fill: '#8E7AC0' }),
      s('path', { d: 'M0 200 L0 138 C70 118 140 124 210 142 C280 160 340 130 400 134 L400 200 Z', fill: '#5F9E8A' }),
      s('path', { d: 'M0 200 L0 166 C80 156 160 160 230 172 C300 184 350 170 400 168 L400 200 Z', fill: '#3F8470' }), tree(54, 150, 0.8), tuft(368, 190, 1.1), tuft(30, 192)]],
};

export function bookScene(kind = 'meadow') {
  if (!BUILD[kind]) kind = 'meadow';
  const [top, ground] = BUILD[kind]();
  const mk = (cls, box, par, kids) => s('svg', { class: cls, viewBox: box, preserveAspectRatio: par, 'aria-hidden': 'true', focusable: 'false' }, kids);
  const el = document.createElement('span');
  el.className = `book-scene sc-${kind}`;
  el.setAttribute('aria-hidden', 'true');
  el.append(mk('sc-top', '0 0 400 200', 'xMidYMin slice', top), mk('sc-ground', '0 0 400 200', 'xMidYMax slice', ground));
  return el;
}
