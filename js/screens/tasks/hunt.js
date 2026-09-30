import { h, animate, reduced } from '../../dom.js';
import { sheepSvg, barnSvg } from '../../art.js';
import { letterFace, tintLetter } from '../../components/letter-face.js';
import { sparkle } from '../../components/sparkle.js';
import { timers, farm, watchSize, findCard, starRow, shake } from '../../components/game-kit.js';
import { skyCells, deal } from './hunt-deal.js';
import { accentOf } from '../../theme.js';
import { soundPhrase } from '../../lessons.js';

const STEPS = 5;     // correct touches to cross the field
const BOX = 56;      // touch target
const INK = '#1E2140';
const SHEEP_W = 100, GOAL_W = 88;
const FADE_OUT = 180, FADE_IN = 260, SWAP = 450; // a new sky: the old one fades out, a fresh one fades in, taps wait

// Where the targets sat in the last few skies, kept between visits so even a new visit never starts with the last layout.
let memory = { slots: 0, deals: [] };

// Task 7: Letter Hunt. The sky is full of small letters; each one that matches the card pops and the sheep trots on.
// After every right touch the whole sky is dealt again (see hunt-deal.js), so the target never sits in a place the child
// could learn. Nothing scores, nothing says wrong, nothing is timed.
export function build({ lesson, sound, speech, curriculum }) {
  const target = lesson.sound, accent = accentOf(target);
  const cfg = curriculum.games.hunt;
  const others = cfg.distractors[target];
  const T = timers();
  let steps = 0, done = false, locked = false, W = 0, H = 0, grid = [], letters = [];

  const sheepHop = h('div', { class: 'sheep-hop' }, sheepSvg());
  const sheep = h('div', { class: 'sheep-wrap', style: { width: SHEEP_W + 'px' } }, sheepHop);
  const goal = h('div', { class: 'hunt-goal', style: { width: GOAL_W + 'px' } }, barnSvg());
  const sky = h('div', { class: 'sky' });
  const stars = starRow(STEPS);
  const scene = farm();
  scene.append(goal, sheep, sky, findCard(target));
  const el = h('div', { class: 'game hunt', dataset: { steps: '0', state: 'playing' } }, scene, stars.el);

  const jitter = (room) => Math.round((Math.random() * 2 - 1) * Math.min(6, room)); // a few pixels, so equal slots never look equal

  // Deals a whole new sky onto the grid. The letters that have popped finish their own animation and are left alone.
  function dealSky() {
    letters.filter((l) => !l.btn.classList.contains('popped')).forEach((l) => { if (l.drift) l.drift.cancel(); l.btn.remove(); });
    if (memory.slots !== grid.length) memory = { slots: grid.length, deals: [] };
    const d = deal({ positions: grid, history: memory.deals, rng: Math.random, target, distractors: others });
    memory.deals = [...memory.deals, d.targets].slice(-12);
    letters = d.letters.map((ch, i) => {
      const isTarget = d.targets.includes(i), c = grid[i];
      const l = { i, isTarget, x: c.x + jitter(c.jx), y: c.y + jitter(c.jy) };
      l.face = h('span', { class: 'face' }, letterFace(ch, INK));
      l.btn = h('button', { class: 'sky-letter', type: 'button', 'aria-label': 'letter', dataset: { target: isTarget ? '1' : '0', letter: ch, slot: String(i) }, onclick: () => tap(l) }, l.face);
      l.btn.style.left = l.x - BOX / 2 + 'px';
      l.btn.style.top = l.y - BOX / 2 + 'px';
      sky.append(l.btn);
      if (!reduced()) {
        l.drift = l.btn.animate([{ transform: 'translateY(-4px)' }, { transform: 'translateY(4px)' }], { duration: 3200 + Math.random() * 2200, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: -Math.random() * 3000 });
        // A finger on a letter holds it still.
        l.btn.addEventListener('pointerdown', () => l.drift.pause());
        for (const t of ['pointerup', 'pointercancel', 'pointerleave']) l.btn.addEventListener(t, () => l.drift.play());
      }
      animate(l.face, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: FADE_IN });
      return l;
    });
  }

  function layout(w, hgt) {
    const first = !W;
    W = w; H = hgt;
    const travel = Math.max(40, W - SHEEP_W - GOAL_W - 26);
    sheep.style.setProperty('--travel', travel + 'px');
    sheep.style.transform = `translateX(${(travel * steps) / STEPS}px)`;
    grid = skyCells(W, H, { goalW: GOAL_W });
    // The scene changed size (the parent script wrapped, or the phone turned): deal the sky again onto the new grid.
    if (first || !done) dealSky();
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

  // The rest of the sky fades out, a fresh random one fades in; touches are ignored while that takes place, so a finger
  // never lands on a letter that is moving or about to go.
  function redeal() {
    locked = true;
    letters.filter((l) => !l.btn.classList.contains('popped')).forEach((l) => { l.btn.style.pointerEvents = 'none'; animate(l.face, [{ opacity: 1 }, { opacity: 0 }], { duration: FADE_OUT, fill: 'forwards' }); });
    T.later(dealSky, reduced() ? 0 : FADE_OUT);
    T.later(() => { locked = false; }, reduced() ? 0 : SWAP);
  }

  function tap(l) {
    if (done || locked || l.btn.classList.contains('popped')) return;
    if (!l.isTarget) { shake(l.face); return; }
    if (l.drift) l.drift.cancel();
    l.btn.style.pointerEvents = 'none';
    l.btn.classList.add('popped');
    tintLetter(l.face.firstChild, accent);
    animate(l.face, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 340, fill: 'forwards' });
    T.later(() => l.btn.remove(), 400);
    sparkle(scene, l.x, l.y, { count: 9, size: [10, 20], reach: [30, 62] });
    stars.fill(steps);
    steps++;
    el.dataset.steps = String(steps);
    trot();
    if (steps < STEPS) { redeal(); return; }
    locked = true;
    T.later(finish, 950);
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
    steps = 0; done = false; locked = false;
    el.dataset.steps = '0'; el.dataset.state = 'playing';
    sky.classList.remove('done');
    stars.reset();
    sheep.style.transition = 'none';
    sheep.style.transform = 'translateX(0)';
    void sheep.offsetWidth;
    sheep.style.transition = '';
    letters.forEach((l) => l.btn.remove());
    letters = [];
    dealSky(); // a fresh random layout, never the one before
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
