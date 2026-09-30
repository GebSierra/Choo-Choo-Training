import { h, animate, icon, reduced } from '../dom.js';
import { glyphSvg } from '../glyphs.js';
import { holdButton } from '../components/hold-button.js';

// Stone positions as percentages of the scene, per orientation (bottom left to top right).
const PORTRAIT = [[26, 74], [58, 50], [72, 27]];
const LANDSCAPE = [[26, 56], [50, 52], [78, 30]];
// Extra bends so the path winds between the stones.
const PORTRAIT_PATH = [[26, 74], [48, 71], [60, 62], [58, 50], [44, 42], [58, 35], [72, 27]];
const LANDSCAPE_PATH = [[26, 56], [36, 63], [44, 60], [50, 52], [62, 46], [70, 38], [78, 30]];

// Stone n's position; a fourth lesson and beyond continue up and to the right.
const at = (list, n) => list[n - 1] || [Math.min(88, list[list.length - 1][0] + 8 * (n - list.length)), Math.max(10, list[list.length - 1][1] - 14 * (n - list.length))];

// Smooth curve through points (Catmull-Rom to cubic Bezier), in a 0..100 box.
function curve(pts) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function pathSvg(pts, cls) {
  const d = curve(pts);
  return h('svg', { class: 'map-path ' + cls, viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
    h('path', { d, class: 'path-shadow', fill: 'none', 'vector-effect': 'non-scaling-stroke' }),
    h('path', { d, class: 'path-line', fill: 'none', 'vector-effect': 'non-scaling-stroke' }));
}

function house() {
  const shingle = (x, y, c) => h('rect', { x, y, width: 26, height: 34, rx: 12, fill: c, transform: `rotate(-28 ${x + 13} ${y + 17})` });
  const svg = h('svg', { class: 'scene-house', viewBox: '0 0 220 170', 'aria-hidden': 'true' },
    h('rect', { x: 120, y: 12, width: 26, height: 50, rx: 6, fill: '#4B3FC4' }),
    h('path', { d: 'M-10 60 L150 10 L235 150 L235 190 L-10 190 Z', fill: '#6C5CE7' }),
    h('path', { d: 'M150 10 L235 150 L235 190 L175 190 Z', fill: '#8C7EF5' }));
  [[8, 62, '#5DE0F0'], [44, 50, '#FFD166'], [80, 38, '#F0556A'], [22, 100, '#FFD166'], [60, 88, '#F0556A'], [98, 76, '#5DE0F0'], [38, 138, '#5DE0F0'], [76, 126, '#FFD166'], [114, 114, '#F0556A'], [140, 100, '#FFD166']].forEach(([x, y, c]) => svg.append(shingle(x, y, c)));
  return svg;
}

const tree = (cls, top, trunk) => h('svg', { class: 'scene-tree ' + cls, viewBox: '0 0 60 90', 'aria-hidden': 'true' },
  h('rect', { x: 26, y: 50, width: 9, height: 38, rx: 4.5, fill: trunk }),
  cls === 'mushroom'
    ? h('path', { d: 'M4 54 C4 20 18 4 31 4 C44 4 56 20 56 54 Z', fill: top })
    : h('path', { d: 'M31 4 C48 26 52 44 52 56 C52 66 42 70 31 70 C20 70 10 66 10 56 C10 44 14 26 31 4 Z', fill: top }),
  // a simple face: two dots and a smile
  ...(cls === 'mushroom' ? [[22, 36], [40, 36], 'M25 43 Q31 49 37 43'] : [[23, 46], [39, 46], 'M26 54 Q31 59 36 54']).map((f, i) => (i < 2 ? h('circle', { cx: f[0], cy: f[1], r: 2.6, fill: '#3A2A1A' }) : h('path', { d: f, fill: 'none', stroke: '#3A2A1A', 'stroke-width': 2.2, 'stroke-linecap': 'round' }))));

const daisy = (x, y) => h('svg', { class: 'daisy', viewBox: '0 0 20 20', style: { left: x + '%', top: y + '%' }, 'aria-hidden': 'true' },
  ...[0, 72, 144, 216, 288].map((r) => h('ellipse', { cx: 10, cy: 5, rx: 3.2, ry: 4.4, fill: '#fff', transform: `rotate(${r} 10 10)` })), h('circle', { cx: 10, cy: 10, r: 2.6, fill: '#FFD166' }));

const butterfly = (cls) => h('svg', { class: 'butterfly ' + cls, viewBox: '0 0 40 30', 'aria-hidden': 'true' },
  h('path', { class: 'wing', d: 'M20 15 C12 0 2 2 4 12 C5 20 14 20 20 15 Z', fill: '#ffffff', opacity: 0.55 }),
  h('path', { class: 'wing', d: 'M20 15 C28 0 38 2 36 12 C35 20 26 20 20 15 Z', fill: '#ffffff', opacity: 0.55 }));

function stone(n, sound, state, onTap, speech) {
  const accent = `var(--${sound.glyph})`;
  const top = h('span', { class: 'stone-top' }, glyphSvg(sound.glyph, { color: accent, label: 'lesson ' + n }), h('span', { class: 'stone-num' }, String(n)));
  const badge = state === 'done'
    ? h('span', { class: 'stone-badge done' }, h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true' }, h('path', { d: 'M5 12.5l4.5 4.5L19 7.5', class: 'tick', fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })))
    : state === 'locked' ? h('span', { class: 'stone-badge lock' }, icon('lock', 16)) : null;
  const btn = h('button', { class: `stone is-${state}`, type: 'button', style: { '--accent': accent }, 'aria-label': `Lesson ${n}${state === 'locked' ? ', locked' : state === 'done' ? ', done' : ''}`, 'aria-disabled': state === 'locked' ? 'true' : null, onclick: () => onTap(btn, state) },
    state === 'current' ? h('span', { class: 'stone-ring' }) : null, h('span', { class: 'stone-base' }), top, badge);
  const wrap = h('div', { class: 'stone-wrap', style: { '--px': at(PORTRAIT, n)[0] + '%', '--py': at(PORTRAIT, n)[1] + '%', '--lx': at(LANDSCAPE, n)[0] + '%', '--ly': at(LANDSCAPE, n)[1] + '%' } });
  if (state === 'current') {
    wrap.append(h('button', { class: 'bubble', type: 'button', onclick: () => speech.say([{ tts: 'Tap to start' }]) }, icon('speaker', 18), h('span', {}, 'Tap to start')));
  }
  wrap.append(btn);
  return wrap;
}

export function homeScreen(ctx) {
  const { store, router, curriculum, speech } = ctx;
  const total = curriculum.lessons.length;
  const current = store.currentLesson(total);
  const scene = h('div', { class: 'scene' },
    h('div', { class: 'scene-patch p1' }), h('div', { class: 'scene-patch p2' }), h('div', { class: 'scene-patch p3' }),
    h('div', { class: 'scene-water' }), h('div', { class: 'scene-bush b1' }), h('div', { class: 'scene-bush b2' }),
    tree('mushroom', '#FFB95E', '#FFF1DA'), tree('drop', '#4C63F0', '#FFF1DA'),
    house(),
    pathSvg(PORTRAIT_PATH, 'portrait'), pathSvg(LANDSCAPE_PATH, 'landscape'),
    daisy(10, 24), daisy(84, 62), daisy(60, 82), daisy(36, 44), daisy(90, 40), daisy(48, 92), daisy(70, 14), daisy(6, 52),
    butterfly('b-one'), butterfly('b-two'));

  const stones = curriculum.lessons.map((l) => {
    const state = store.isDone(l.number) ? 'done' : (!store.isUnlocked(l.number) ? 'locked' : (l.number === current ? 'current' : 'open'));
    return stone(l.number, curriculum.sounds[l.sound], state === 'open' ? 'current' : state, (btn, st) => {
      if (st === 'locked') {
        animate(btn, [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)', offset: 0.25 }, { transform: 'rotate(6deg)', offset: 0.6 }, { transform: 'rotate(0)' }], { duration: 260 });
        return;
      }
      router.go(`/lesson/${l.number}`);
    }, speech);
  });
  stones.forEach((s) => scene.append(s));

  const grown = holdButton({ label: 'Grownups · hold', caption: null, hint: 'Press and hold', className: 'pill-hold', onComplete: () => { ctx.gate = { openedAt: Date.now() }; router.go('/grownups'); } });
  const top = h('div', { class: 'home-top' }, grown);
  const root = h('div', { class: 'home' }, scene, top);

  if (!store.state.firstRunDone) {
    const card = h('div', { class: 'first-run', role: 'dialog', 'aria-label': 'Welcome' },
      h('div', { class: 'first-card' },
        h('div', { class: 'adult-ic' }, icon('adult', 28)),
        h('p', {}, 'Sit with your child. You say the sounds; the app helps. Tap a stone to start.'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => {
          store.setFirstRunDone();
          animate(card, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).finished.then(() => card.remove());
        } }, 'Start')));
    root.append(card);
    animate(card.firstChild, [{ opacity: 0, transform: 'translateY(16px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 500, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }

  // Stones rise into place one after another.
  if (!reduced()) {
    stones.forEach((s, i) => {
      // Not tappable until the last stone has landed, so nothing moves under a finger.
      s.style.pointerEvents = 'none';
      animate(s, [{ opacity: 0, transform: 'translateY(12px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 120 + i * 80 });
    });
    setTimeout(() => stones.forEach((s) => { s.style.pointerEvents = ''; }), 120 + (stones.length - 1) * 80 + 480);
  }
  return root;
}
