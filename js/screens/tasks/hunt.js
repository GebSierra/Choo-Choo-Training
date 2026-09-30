import { h, animate, reduced } from '../../dom.js';
import { sheepSvg, barnSvg } from '../../art.js';
import { letterFace, tintLetter } from '../../components/letter-face.js';
import { sparkle } from '../../components/sparkle.js';
import { timers, farm, watchSize, findCard, starRow, shake } from '../../components/game-kit.js';
import { accentOf } from '../../theme.js';
import { soundPhrase } from '../../lessons.js';

const SLOTS = 14;    // letters in the sky
const STEPS = 5;     // correct touches to cross the field
const BOX = 56;      // touch target
const INK = '#1E2140';
const SHEEP_W = 100, GOAL_W = 88;

// Task 7: Letter Hunt. The sky is full of small letters; each one that matches the card pops and the sheep trots on.
// Nothing scores, nothing says wrong, nothing is timed.
export function build({ lesson, sound, speech, curriculum }) {
  const target = lesson.sound, accent = accentOf(target);
  const cfg = curriculum.games.hunt;
  const others = cfg.distractors[target];
  const T = timers();
  let steps = 0, done = false, W = 0, H = 0, slots = [], mix = [];

  const sheepHop = h('div', { class: 'sheep-hop' }, sheepSvg());
  const sheep = h('div', { class: 'sheep-wrap', style: { width: SHEEP_W + 'px' } }, sheepHop);
  const goal = h('div', { class: 'hunt-goal', style: { width: GOAL_W + 'px' } }, barnSvg());
  const sky = h('div', { class: 'sky' });
  const stars = starRow(STEPS);
  const scene = farm();
  scene.append(goal, sheep, sky, findCard(target));
  const el = h('div', { class: 'game hunt', dataset: { steps: '0', state: 'playing' } }, scene, stars.el);

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const nextDistractor = () => { if (!mix.length) mix = [...others].sort(() => Math.random() - 0.5); return mix.pop(); };
  const visibleTargets = () => slots.filter((s) => s.isTarget && !s.busy).length;

  // Cells of a loose grid in the sky, clear of the "Find this" card, the speaker button and the grass.
  function cells() {
    const y0 = 10, yMax = H - 92;
    const cols = Math.max(1, Math.floor((W - 20) / 70)), rows = Math.max(1, Math.floor((yMax - y0) / 68));
    const cw = (W - 20) / cols, ch = (yMax - y0) / rows;
    const keepOut = [[0, 0, 120, 80], [W - 76, 0, W, 76], [W * 0.56 - 8, 0, W * 0.56 + 64, 72], [W - GOAL_W - 20, H - 140, W, H]]; // find card, speaker button, sun, goal barn
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = 10 + cw * (c + 0.5), y = y0 + ch * (r + 0.5);
      if (keepOut.some(([a, b, c2, d]) => x + BOX / 2 > a && x - BOX / 2 < c2 && y + BOX / 2 > b && y - BOX / 2 < d)) continue;
      out.push({ x, y, jx: Math.max(0, Math.floor((cw - BOX - 12) / 2)), jy: Math.max(0, Math.floor((ch - BOX - 12) / 2)) });
    }
    const n = Math.min(SLOTS, out.length);
    return Array.from({ length: n }, (_, i) => out[Math.floor(((i + 0.5) * out.length) / n)]);
  }

  const place = (s) => {
    s.btn.style.left = s.x + s.dx - BOX / 2 + 'px';
    s.btn.style.top = s.y + s.dy - BOX / 2 + 'px';
  };

  function fill(s, isTarget, enter) {
    const ch = isTarget ? target : nextDistractor();
    s.isTarget = isTarget; s.busy = false;
    const face = h('span', { class: 'face' }, letterFace(ch, INK));
    const btn = h('button', { class: 'sky-letter', type: 'button', 'aria-label': 'letter', dataset: { target: isTarget ? '1' : '0', letter: ch }, onclick: () => tap(s) }, face);
    s.btn = btn; s.face = face;
    place(s);
    sky.append(btn);
    if (!reduced()) {
      s.drift = btn.animate([{ transform: 'translateY(-4px)' }, { transform: 'translateY(4px)' }], { duration: 3200 + Math.random() * 2200, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: -Math.random() * 3000 });
      // A finger on a letter holds it still.
      btn.addEventListener('pointerdown', () => s.drift.pause());
      for (const t of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(t, () => { if (!s.busy) s.drift.play(); });
    }
    if (enter !== undefined) animate(face, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: enter });
  }

  function populate() {
    sky.replaceChildren();
    slots = cells().map((c) => ({ ...c, dx: Math.round((Math.random() * 2 - 1) * c.jx), dy: Math.round((Math.random() * 2 - 1) * c.jy) }));
    const want = new Set();
    const nTargets = Math.min(slots.length, 4 + Math.floor(Math.random() * 2));
    while (want.size < nTargets) want.add(Math.floor(Math.random() * slots.length));
    slots.forEach((s, i) => fill(s, want.has(i), 30 * i));
  }

  function layout(w, hgt) {
    const first = !W;
    W = w; H = hgt;
    const travel = Math.max(40, W - SHEEP_W - GOAL_W - 26);
    sheep.style.setProperty('--travel', travel + 'px');
    sheep.style.transform = `translateX(${(travel * steps) / STEPS}px)`;
    if (first) return populate();
    // The scene changed size (the parent script wrapped, or the phone turned): put the same letters on the new grid.
    const fresh = cells();
    slots.slice(fresh.length).forEach((s) => { if (s.drift) s.drift.cancel(); s.btn.remove(); });
    slots = slots.slice(0, fresh.length);
    slots.forEach((s, i) => { s.x = fresh[i].x; s.y = fresh[i].y; place(s); });
    for (let i = slots.length; i < fresh.length && !done; i++) {
      const s = { ...fresh[i], dx: 0, dy: 0 };
      slots.push(s);
      fill(s, false, 0);
    }
    while (!done && visibleTargets() < 4) {
      const s = slots.find((x) => !x.isTarget && !x.busy);
      if (!s) break;
      if (s.drift) s.drift.cancel();
      s.btn.remove();
      fill(s, true, 0);
    }
  }
  const stopWatching = watchSize(scene, layout);

  function trot() {
    const travel = parseFloat(sheep.style.getPropertyValue('--travel'));
    sheep.style.transform = `translateX(${(travel * steps) / STEPS}px)`;
    if (reduced()) return;
    const swing = (sel, from, to) => sheep.querySelectorAll(sel).forEach((g) => g.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }], { duration: 300, iterations: 3, direction: 'alternate', easing: 'ease-in-out' }));
    swing('.leg-a', 16, -16); swing('.leg-b', -16, 16);
    sheep.querySelector('.sheep-body').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }], { duration: 150, iterations: 6, direction: 'alternate', easing: 'ease-in-out' });
  }

  function refill(s) {
    if (s.drift) s.drift.cancel();
    s.btn.remove();
    const t = visibleTargets();
    fill(s, t < 4 ? true : t >= 5 ? false : Math.random() < 0.4, 0);
  }

  function tap(s) {
    if (done || s.busy) return;
    if (!s.isTarget) { shake(s.face); return; }
    s.busy = true;
    if (s.drift) s.drift.cancel();
    s.btn.style.pointerEvents = 'none';
    s.btn.classList.add('popped');
    tintLetter(s.face.firstChild, accent);
    animate(s.face, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 340, fill: 'forwards' });
    sparkle(scene, s.x + s.dx, s.y + s.dy, { count: 9, size: [10, 20], reach: [30, 62] });
    stars.fill(steps);
    steps++;
    el.dataset.steps = String(steps);
    trot();
    if (steps < STEPS) T.later(() => refill(s), 500);
    else T.later(finish, 950);
  }

  function finish() {
    done = true;
    el.dataset.state = 'done';
    sky.classList.add('done');
    sparkle(scene, W - 8 - GOAL_W / 2, H - 40 - 50, { count: 28, size: [16, 34], reach: [80, 170] });
    if (reduced()) return;
    sheepHop.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-22px)' }, { transform: 'translateY(0)' }], { duration: 440, iterations: 2, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    sheep.querySelector('.wave-leg').animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-55deg)' }], { duration: 330, iterations: 6, direction: 'alternate', easing: 'ease-in-out', delay: 300 });
  }

  function again() {
    T.clear();
    steps = 0; done = false;
    el.dataset.steps = '0'; el.dataset.state = 'playing';
    sky.classList.remove('done');
    stars.reset();
    sheep.style.transition = 'none';
    sheep.style.transform = 'translateX(0)';
    void sheep.offsetWidth;
    sheep.style.transition = '';
    populate();
  }

  const say = [{ tts: cfg.say }];
  return {
    el, flush: true,
    parts: () => say,
    script: () => `Say: 'Find the letter that says ${soundPhrase(sound)}. Touch it.' Then say ${soundPhrase(sound)} together.`,
    again: () => { again(); speech.say(say); },
    cleanup: () => { T.clear(); stopWatching(); },
  };
}
