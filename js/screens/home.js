import { h, animate, icon, reduced } from '../dom.js';
import { glyphSvg } from '../glyphs.js';
import { holdButton } from '../components/hold-button.js';
import { fullscreenButton } from '../components/fullscreen-button.js';
import { firstRunOverlay } from '../components/welcome-card.js';
import { stopIcon, puffEl } from '../art/train2d.js';
import { finishedStop } from '../sequence.js';
import { sfx } from '../sfx.js';
import { music } from '../music.js';
import { kidSvg } from '../art/kid.js';
import { dueLevel, builtLevels } from '../levels.js';
import { starBoard } from '../components/star-board.js';
import { levelBanner } from '../components/level-banner.js';
import { planHome, worldAfter } from '../worlds.js';

// The path is a long winding trail that scrolls: up the screen in portrait (lesson 1 at the bottom, the newest stone at the top),
// along it in landscape (lesson 1 at the left). Every stone, the trail and the scenery are placed from the data and the sizes
// below, so any number of lessons and checkpoints fits.
const STEP_P = 150, TOP_P = 250, BOTTOM_P = 210;   // portrait: pixels between stones, room above the last, room below the first
const STEP_L = 190, LEFT_L = 190, RIGHT_L = 210;   // landscape: the same, along the path
const wave = (i) => Math.sin(i * 1.1 + 0.4);
export const BUBBLE_FLIP_Y = 330;                   // portrait: a bubble flips below its stone when the stone is this near the top of the scene

// Where stone i of n sits: x as a percentage and y in pixels in portrait; x in pixels and y as a percentage in landscape.
export function mapGeometry(n) {
  const H = TOP_P + BOTTOM_P + (n - 1) * STEP_P, W = LEFT_L + RIGHT_L + (n - 1) * STEP_L;
  const stones = Array.from({ length: n }, (_, i) => ({ px: +(50 + 24 * wave(i)).toFixed(1), py: H - BOTTOM_P - i * STEP_P, lx: LEFT_L + i * STEP_L, ly: +(46 + 15 * wave(i + 1.3)).toFixed(1) }));
  return { H, W, stones };
}

// The trail through the stones, with a bend between each pair so it winds.
function trailPoints(g, portrait, tunnel = false) {
  const pts = [portrait ? [30, g.H - 80] : [60, 70]];
  g.stones.forEach((s, i) => {
    const p = portrait ? [s.px, s.py] : [s.lx, s.ly];
    if (i) {
      const q = portrait ? [g.stones[i - 1].px, g.stones[i - 1].py] : [g.stones[i - 1].lx, g.stones[i - 1].ly];
      pts.push(portrait ? [(p[0] + q[0]) / 2 + (i % 2 ? -7 : 7), (p[1] + q[1]) / 2] : [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + (i % 2 ? -6 : 6)]);
    }
    pts.push(p);
  });
  if (tunnel) pts.push(portrait ? [58.8, 170] : [g.W - 95, 58]); // on into the tunnel at the world's end
  return pts;
}

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

function pathSvg(pts, cls, viewBox) {
  const d = curve(pts);
  return h('svg', { class: 'map-path ' + cls, viewBox, preserveAspectRatio: 'none', 'aria-hidden': 'true' },
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

const daisy = () => h('svg', { class: 'daisy', viewBox: '0 0 20 20', 'aria-hidden': 'true' },
  ...[0, 72, 144, 216, 288].map((r) => h('ellipse', { cx: 10, cy: 5, rx: 3.2, ry: 4.4, fill: '#fff', transform: `rotate(${r} 10 10)` })), h('circle', { cx: 10, cy: 10, r: 2.6, fill: '#FFD166' }));

const butterfly = (cls) => h('svg', { class: 'butterfly ' + cls, viewBox: '0 0 40 30', 'aria-hidden': 'true' },
  h('path', { class: 'wing', d: 'M20 15 C12 0 2 2 4 12 C5 20 14 20 20 15 Z', fill: '#ffffff', opacity: 0.55 }),
  h('path', { class: 'wing', d: 'M20 15 C28 0 38 2 36 12 C35 20 26 20 20 15 Z', fill: '#ffffff', opacity: 0.55 }));

// Something placed on the scene by its progress t along the trail (0 at the start, 1 at the end) and its side (-1 to 1, across it).
// In portrait t runs up the scene and the side is left to right; in landscape t runs along it and the side is top to bottom.
// w, hgt: its box in pixels (centred on the point). The scene's own CSS reads --px/--py (portrait) or --lx/--ly (landscape).
function place(g, el, { t, side, w = 0, hgt = 0 }) {
  el.classList.add('pl');
  el.style.setProperty('--px', (50 + side * 44).toFixed(1) + '%');
  el.style.setProperty('--py', Math.round(g.H - 60 - t * (g.H - 120)) + 'px');
  el.style.setProperty('--lx', Math.round(60 + t * (g.W - 120)) + 'px');
  el.style.setProperty('--ly', (50 + side * 40).toFixed(1) + '%');
  if (w) { el.style.width = w + 'px'; el.style.height = (hgt || w) + 'px'; el.style.marginLeft = -w / 2 + 'px'; el.style.marginTop = -(hgt || w) / 2 + 'px'; }
  return el;
}

// The world's end: a hill with an arch, glowing in the next world's colour, and its name. The trail runs into it.
function tunnelIcon(g, next) {
  const svg = h('svg', { class: 'tunnel-art', viewBox: '0 0 160 110', 'aria-hidden': 'true' },
    h('path', { d: 'M6 104 C6 40 40 8 80 8 C120 8 154 40 154 104 Z', fill: '#2FA35E' }),
    h('path', { d: 'M80 8 C120 8 154 40 154 104 L120 104 C120 60 104 24 80 8 Z', fill: '#268A4D' }),
    h('path', { d: 'M40 104 C40 62 58 40 80 40 C102 40 120 62 120 104 Z', fill: '#2B2D5C' }),
    h('path', { d: 'M52 104 C52 72 64 54 80 54 C96 54 108 72 108 104 Z', fill: next.color, stroke: '#FFF8EC', 'stroke-width': 3 }),
    h('path', { d: 'M40 104 C40 62 58 40 80 40 C102 40 120 62 120 104', fill: 'none', stroke: '#C9C4BA', 'stroke-width': 9, 'stroke-linecap': 'round' }));
  const el = h('div', { class: 'scene-tunnel', dataset: { world: next.id }, 'aria-label': `Tunnel to ${next.name}` }, svg, h('span', { class: 'tunnel-name' }, next.name, ' \u2192'));
  const out = place(g, el, { t: 1, side: 0.2, w: 150, hgt: 100 });
  out.style.setProperty('--py', '126px'); // in portrait it stands above the last stone, clear of the top bar
  out.style.setProperty('--lx', (g.W - 95) + 'px'); // in landscape it stands whole at the far end
  return out;
}

// The scenery: soft patches, trees, daisies and bushes repeated along the trail, the house at the start and a pond at the far end.
// Nothing here moves except the two butterflies, and everything is placed by a fixed pattern (the map looks the same every time).
function scenery(g, next = null) {
  const out = [];
  const count = Math.max(6, Math.round(g.stones.length * 0.9));
  for (let k = 0; k < count; k++) {
    const t = (k + 0.5) / count, sgn = k % 2 ? 1 : -1;
    out.push(place(g, h('div', { class: 'scene-patch' }), { t, side: sgn * 0.5, w: 260 + (k % 3) * 60, hgt: 120 + (k % 2) * 30 }));
    out.push(place(g, k % 3 === 2 ? tree('drop', '#4C63F0', '#FFF1DA') : tree('mushroom', '#FFB95E', '#FFF1DA'), { t: (k + 0.15) / count, side: -sgn * 0.93, w: k % 3 === 2 ? 46 : 76, hgt: k % 3 === 2 ? 69 : 114 }));
    if (k % 2 === 0) out.push(place(g, h('div', { class: 'scene-bush' }), { t: (k + 0.8) / count, side: sgn * 1.02, w: 150, hgt: 70 }));
  }
  for (let k = 0; k < g.stones.length * 2; k++) {
    const t = (k + 0.3) / (g.stones.length * 2), side = ((k * 37) % 17) / 17 * 1.7 - 0.85;
    if (Math.abs(side) > 0.3) out.push(place(g, daisy(), { t, side, w: 18 }));
  }
  out.push(place(g, house(), { t: 0, side: -0.55, w: 230, hgt: 178 }));
  out[out.length - 1].classList.add('scene-house');
  if (next) out.push(tunnelIcon(g, next)); else out.push(place(g, h('div', { class: 'scene-water' }), { t: 1, side: 0.9, w: 300, hgt: 190 }));
  // The two butterflies fly by the start of the path (so a new child sees them) and halfway along.
  out.push(place(g, butterfly('b-one'), { t: 0.08, side: 0.5, w: 34, hgt: 26 }), place(g, butterfly('b-two'), { t: 0.5, side: -0.5, w: 26, hgt: 20 }));
  return out;
}

// A stone on the path. A lesson shows its letter and number; a checkpoint ({title}) shows a small crate instead.
function stone(g, i, what, state, onTap, speech, character) {
  const sound = what.sound;
  const accent = sound ? `var(--${sound.glyph})` : '#C99A5B';
  const name = sound ? `Lesson ${what.number}` : what.title;
  const top = sound
    ? h('span', { class: 'stone-top' }, glyphSvg(sound.glyph, { color: accent, label: 'lesson ' + what.number }), h('span', { class: 'stone-num' }, String(what.number)))
    : h('span', { class: 'stone-top stone-sack' }, stopIcon(what));
  const badge = state === 'done'
    ? h('span', { class: 'stone-badge done' }, h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true' }, h('path', { d: 'M5 12.5l4.5 4.5L19 7.5', class: 'tick', fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })))
    : state === 'locked' ? h('span', { class: 'stone-badge lock' }, icon('lock', 16)) : null;
  const btn = h('button', { class: `stone is-${state}`, type: 'button', style: { '--accent': accent }, 'aria-label': `${name}${state === 'locked' ? ', locked' : state === 'done' ? ', done' : ''}`, 'aria-disabled': state === 'locked' ? 'true' : null, onclick: () => onTap(btn, state) },
    state === 'current' ? h('span', { class: 'stone-ring' }) : null, h('span', { class: 'stone-base' }), top, badge,
    state === 'current' && character ? h('span', { class: 'stone-kid', 'aria-hidden': 'true' }, kidSvg({ ...character, pose: 'wave' })) : null);
  const p = g.stones[i];
  const wrap = h('div', { class: 'stone-wrap', style: { '--px': p.px + '%', '--py': p.py + 'px', '--lx': p.lx + 'px', '--ly': p.ly + '%' } });
  if (state === 'current') {
    // Above its stone, or below it when the stone is near the top of the scene (the Grownups pill sits there) and always below in landscape.
    wrap.append(h('button', { class: 'bubble' + (p.py < BUBBLE_FLIP_Y ? ' below' : ''), type: 'button', onclick: () => speech.say([{ tts: 'Tap to start' }]) }, icon('speaker', 18), h('span', {}, 'Tap to start')));
  }
  wrap.append(btn);
  return wrap;
}

// Home: the 3D railway (always on) when WebGL works, else this 2D path. settings.trainWorld stays only so tests can seed the 2D map.
// The probe's context is handed to the renderer, so Home never holds two. Any failure on the way falls back quietly.
// preview (prototype 2, Grownups > Previews): { world, mode, onEnter } builds only that world's stops; null for the real Home.
export async function homeScreen(ctx) {
  const preview = ctx.preview || null;
  ctx.preview = null;
  // The Home builds one world only. When the child has just finished a world, its crossing plays once (js/screens/crossing.js).
  let plan = null;
  if (!preview) {
    plan = ctx.homePlan || planHome(ctx.store, ctx.curriculum);
    ctx.homePlan = null;
    if (plan.cross && !plan.hosted) { const m = await import('./crossing.js'); return m.crossingHost(ctx, plan); }
  }
  if (ctx.store.settings.trainWorld !== false && !ctx.noTrain) {
    let canvas = null, gl = null, soft = false;
    const opts = (antialias) => ({ antialias, alpha: true, powerPreference: 'low-power' });
    try {
      canvas = document.createElement('canvas');
      // Multisampling only on a low-density screen: on a 2x or denser phone the pixels are small enough without it.
      gl = canvas.getContext('webgl2', opts((window.devicePixelRatio || 1) < 2));
      // A software renderer (a test machine, or a phone with no usable GPU) draws without multisampling, shadows or
      // high-density pixels, so it stays responsive. ?hq=1 in the address keeps full quality (for screenshots).
      if (gl && isSoftware(gl) && !/[?&]hq=1/.test(location.search)) {
        loseContext(gl);
        canvas = document.createElement('canvas');
        gl = canvas.getContext('webgl2', opts(false));
        soft = true;
      }
    } catch { gl = null; }
    if (gl) {
      try {
        const m = await import('./home3d.js');
        return m.home3dScreen(ctx, { canvas, gl, soft, preview, plan });
      } catch (e) {
        console.warn('train world unavailable, using the 2D path:', e && e.message);
        loseContext(gl);
        ctx.noTrain = true; // do not try again in this page session
      }
    }
  }
  return mapScreen(ctx, preview, plan);
}

function loseContext(gl) { try { const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } catch { /* fine */ } }
export function isSoftware(gl) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return /swiftshader|llvmpipe|software/i.test(String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)));
  } catch { return false; }
}

// The 2D path (round 3): a long winding trail of stones that scrolls.
export function mapScreen(ctx, preview = null, plan = null) {
  const { store, router, curriculum, speech } = ctx;
  // A level earned since Home was last open (or one replayed from Grownups) shows its banner once (the 2D path has no tunnel or car).
  const replayId = preview ? null : ctx.replayLevel || null;
  if (!preview) ctx.replayLevel = null;
  const due = preview ? null : replayId ? builtLevels(curriculum).find((v) => v.id === replayId) || null : dueLevel(store, curriculum);
  const stars = starBoard(curriculum, store, { hold: due && !replayId && !reduced() ? due.id : null });
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  const total = curriculum.lessons.length;
  const current = store.currentLesson(total);
  const worldId = preview ? preview.world : plan && plan.world ? plan.world.id : null;
  const cross = !preview && plan && plan.cross ? plan.cross : null;
  const arrive = !preview && plan && plan.arrive ? plan.arrive : null;
  const next = worldId ? worldAfter(curriculum, worldId) : null;
  // One numbered path: the lessons in order, each checkpoint right after the lesson it follows.
  const nodes = curriculum.lessons.filter((l) => !worldId || l.world === worldId).flatMap((l) => [{ lesson: l }, ...(curriculum.checkpoints || []).filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
  const g = mapGeometry(nodes.length);
  const scene = h('div', { class: 'scene', style: { '--H': g.H, '--W': g.W } },
    ...scenery(g, next),
    pathSvg(trailPoints(g, true, !!next), 'portrait', `0 0 100 ${g.H}`), pathSvg(trailPoints(g, false, !!next), 'landscape', `0 0 ${g.W} 100`));
  const scroller = h('div', { class: 'map-scroll', role: 'region', 'aria-label': 'The path of lessons', tabindex: '0' }, scene);

  // A swipe along the map never counts as a tap on a stone under the finger.
  let dragged = false, downAt = null;
  scroller.addEventListener('pointerdown', (e) => { dragged = false; downAt = [e.clientX, e.clientY]; });
  scroller.addEventListener('pointermove', (e) => { if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 10) dragged = true; });
  const tap = (fn) => (btn, st) => { if (dragged) { dragged = false; return; } fn(btn, st); };

  const wobble = (btn) => animate(btn, [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)', offset: 0.25 }, { transform: 'rotate(6deg)', offset: 0.6 }, { transform: 'rotate(0)' }], { duration: 260 });
  let currentIndex = 0, found = false; // the stone the map opens on: the current lesson's, else the current sack, else the last stone
  const stones = nodes.map((node, i) => {
    if (node.checkpoint) {
      const c = node.checkpoint;
      // With every lesson done, the first sack not yet done is the current stone (one bubble, not one for each).
      const pending = (curriculum.checkpoints || []).find((k) => !store.isCheckpointDone(k.id) && store.isCheckpointUnlocked(k));
      const state = store.isCheckpointDone(c.id) ? 'done' : (!store.isCheckpointUnlocked(c) ? 'locked' : (current === null && pending && pending.id === c.id ? 'current' : 'open'));
      if (state === 'current') { currentIndex = i; found = true; }
      return stone(g, i, c, state === 'open' ? 'unlocked' : state, tap((btn, st) => { if (st === 'locked') wobble(btn); else router.go(`/checkpoint/${c.id}`); }), speech, store.character());
    }
    const l = node.lesson;
    const state = store.isDone(l.number) ? 'done' : (!store.isUnlocked(l.number) ? 'locked' : (l.number === current ? 'current' : 'open'));
    if (l.number === current) { currentIndex = i; found = true; }
    return stone(g, i, { sound: curriculum.sounds[l.sound], number: l.number }, state === 'open' ? 'current' : state, tap((btn, st) => {
      if (st === 'locked') wobble(btn); else router.go(`/lesson/${l.number}`);
    }), speech, store.character());
  });
  if (!found) currentIndex = nodes.length - 1;
  if (preview) currentIndex = preview.mode === 'in' ? 0 : nodes.length - 1; // a previewed world opens at its start (arriving) or its end (leaving)
  stones.forEach((s) => scene.append(s));
  // A station was just finished: the figure rides to the next stone (the simple version of the 3D sequence).
  const fromStop = preview ? -1 : finishedStop(store, nodes.map((n) => (n.checkpoint ? (store.isCheckpointDone(n.checkpoint.id) && (store.checkpoint(n.checkpoint.id).completedAt || null)) : (store.isDone(n.lesson.number) && (store.lesson(n.lesson.number).completedAt || null)))).map((d) => (d === false || d === undefined ? false : d)), currentIndex);

  const grown = holdButton({ label: 'Grownups · hold', caption: null, hint: 'Press and hold', className: 'pill-hold', onComplete: () => { ctx.gate = { openedAt: Date.now() }; router.go('/grownups'); } });
  const top = h('div', { class: 'home-top' }, grown, stars.el);
  const fs = fullscreenButton({ className: 'home-fs' });
  const root = h('div', { class: 'home' }, scroller, top, ...(fs ? [fs] : []));
  // The theme song waits for the ride and the level banner to finish (it starts at once when neither is due).
  let celebrating = fromStop >= 0 || !!due;
  const gateHold = cross || arrive ? (cross || arrive).gate : null;
  // Everything due is over: when a crossing is due, the loading card comes now (the flat map has no tunnel to ride into).
  const over = () => { celebrating = false; if (cross && cross.onEnter && root.isConnected) later(() => cross.onEnter(), reduced() ? 600 : 900); };
  const showLevel = () => {
    if (!due || !root.isConnected) { over(); return; }
    later(over, reduced() ? 1500 : 3000);
    const i = builtLevels(curriculum).findIndex((v) => v.id === due.id);
    levelBanner({ level: due, host: root, reducedMotion: reduced() });
    stars.pop(i);
    sfx.play(reduced() ? 'star' : 'checkpoint');
  };
  root.cleanup = () => { grown.cleanup(); timers.forEach(clearTimeout); timers.clear(); if (!preview) music.leaveHome(); };
  if (!preview) music.enterHome({ hold: () => celebrating || !!(gateHold && gateHold.active) });

  firstRunOverlay({ store, root });

  // Open with the path's start in view, then glide to the current stone (at once if it is already in view or motion is reduced).
  // Only the stones that will be on screen rise into place, one after another; the rest simply stand there.
  const isPortrait = () => scroller.clientHeight >= scroller.clientWidth;
  const targetScroll = () => {
    const p = g.stones[currentIndex];
    return isPortrait() ? Math.max(0, Math.min(g.H - scroller.clientHeight, p.py - scroller.clientHeight * 0.55)) : Math.max(0, Math.min(g.W - scroller.clientWidth, p.lx - scroller.clientWidth * 0.36));
  };
  // toot, the figure slides along the path to the next stone, puffs of smoke behind it
  function runRide() {
    const target = targetScroll(), portrait = isPortrait();
    const real = stones[currentIndex].querySelector('.stone-kid');
    const mid = (el) => { const r = el.getBoundingClientRect(), o = scene.getBoundingClientRect(); return [r.left - o.left + r.width / 2, r.top - o.top + r.height / 2]; };
    const [ax, ay] = mid(stones[fromStop].querySelector('.stone')), [bx, by] = mid(stones[currentIndex].querySelector('.stone'));
    const dx = -34, dy = -38; // the figure stands a little left of the stone and above its middle
    const kidEl = h('span', { class: 'seq-kid', 'aria-hidden': 'true', style: { left: ax + dx - 30 + 'px', top: ay + dy - 38 + 'px' } }, kidSvg({ ...store.character(), pose: 'wave', still: true }));
    scene.append(kidEl);
    if (real) real.style.visibility = 'hidden';
    setTimeout(() => sfx.play('whistle'), 450); // as the figure sets off
    const MS = 1700;
    const a = kidEl.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${(bx - ax) / 2}px,${(by - ay) / 2 - 22}px)`, offset: 0.5 }, { transform: `translate(${bx - ax}px,${by - ay}px)` }], { duration: MS, delay: 500, easing: 'ease-in-out', fill: 'both' });
    let n = 0;
    const timer = setInterval(() => {
      const r = kidEl.getBoundingClientRect(), o = scene.getBoundingClientRect();
      const p = puffEl();
      Object.assign(p.style, { left: r.left - o.left + r.width / 2 - 12 + 'px', top: r.top - o.top + 6 + 'px', position: 'absolute', zIndex: 3 });
      scene.append(p);
      p.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0.9 }, { transform: 'translate(-14px,-34px) scale(1.7)', opacity: 0 }], { duration: 1000, easing: 'ease-out', fill: 'forwards' }).finished.then(() => p.remove(), () => p.remove());
      if (++n > 14) clearInterval(timer);
    }, 130);
    setTimeout(() => { try { scroller.scrollTo(portrait ? { top: target, behavior: 'smooth' } : { left: target, behavior: 'smooth' }); } catch { /* fine */ } }, 500);
    const stop = () => { clearInterval(timer); kidEl.remove(); if (real) real.style.visibility = ''; later(showLevel, 400); };
    a.finished.then(stop, stop);
  }
  const startScroll = () => (isPortrait() ? Math.max(0, g.H - scroller.clientHeight) : 0);
  const settle = () => {
    const portrait = isPortrait(), start = startScroll(), target = targetScroll(), view = portrait ? scroller.clientHeight : scroller.clientWidth;
    const set = (v) => { if (portrait) scroller.scrollTop = v; else scroller.scrollLeft = v; };
    const visible = (i) => { const p = g.stones[i], pos = portrait ? p.py : p.lx; return pos > target - 60 && pos < target + view + 60; };
    const ride = fromStop >= 0 && !reduced();
    const rideStart = () => { const p = g.stones[fromStop]; return portrait ? Math.max(0, Math.min(g.H - scroller.clientHeight, p.py - scroller.clientHeight * 0.55)) : Math.max(0, Math.min(g.W - scroller.clientWidth, p.lx - scroller.clientWidth * 0.36)); };
    set(ride ? rideStart() : start);
    if (ride) { runRide(); return; }
    if (fromStop >= 0) sfx.play('whistle'); // reduced motion: the figure is simply at the next stone, with one whistle
    later(showLevel, 600);
    if (!reduced()) {
      const shown = stones.map((s, i) => [s, i]).filter(([, i]) => visible(i));
      shown.forEach(([s], k) => {
        s.style.pointerEvents = 'none'; // not tappable until it has landed, so nothing moves under a finger
        animate(s, [{ opacity: 0, transform: 'translateY(12px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 120 + k * 70 });
      });
      setTimeout(() => shown.forEach(([s]) => { s.style.pointerEvents = ''; }), 120 + (shown.length - 1) * 70 + 480);
    }
    if (Math.abs(target - start) > 2) {
      const go = () => { try { scroller.scrollTo(portrait ? { top: target, behavior: reduced() ? 'auto' : 'smooth' } : { left: target, behavior: reduced() ? 'auto' : 'smooth' }); } catch { set(target); } };
      if (reduced()) set(target); else setTimeout(go, 350);
    }
  };
  // The scroller has no size until it is in the page: wait a frame.
  requestAnimationFrame(() => requestAnimationFrame(settle));
  return root;
}
