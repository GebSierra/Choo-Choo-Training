import { h, animate, reduced } from '../../dom.js';
import { sheepSvg, barnSvg, barnBackSvg } from '../../art.js';
import { letterFace, tintLetter } from '../../components/letter-face.js';
import { sparkle } from '../../components/sparkle.js';
import { timers, farm, watchSize, findCard, starRow, shake, idleHints, pulseCard } from '../../components/game-kit.js';
import { skyCells, deal, BOX } from './hunt-deal.js';
import { accentOf } from '../../theme.js';
import { soundPhrase, fit } from '../../lessons.js';
import { sfx } from '../../sfx.js';

const STEPS = 5;     // correct touches to cross the field
const INK = '#1E2140';
const SHEEP_W = 130, GOAL_W = 150;
const DRAG = 10;     // px a finger must travel before a touch counts as a drag
const TROT = 700, OPEN = 400, WALK = 600, SHUT = 350, HOP = 500; // the ending: about 2.6 s
const FADE_OUT = 180, FADE_IN = 260, SWAP = 450; // a new sky: the old one fades out, a fresh one fades in, taps wait

// Where the targets sat in the last few skies, kept between visits so even a new visit never starts with the last layout.
let memory = { slots: 0, deals: [] };

// Letter Hunt. The sky is full of small letters; each one that matches the card pops and the sheep trots on.
// After every right touch the whole sky is dealt again (see hunt-deal.js), so the target never sits in a place the child
// could learn. The letter a finger lands on is the one chosen, whether it was tapped or dragged. Nothing scores, nothing
// says wrong, nothing is timed. The fifth right letter sends the sheep into the barn.
export function build({ lesson, sound, speech, curriculum, setDone }) {
  const target = lesson.sound, accent = accentOf(target);
  const cfg = curriculum.games.hunt;
  const others = cfg.distractors[target] || [];
  const T = timers();
  let steps = 0, done = false, locked = false, W = 0, H = 0, grid = [], letters = [], gesture = null, endAnims = [];

  const sheepHop = h('div', { class: 'sheep-hop' }, sheepSvg());
  const sheep = h('div', { class: 'sheep-wrap', style: { width: SHEEP_W + 'px' } }, sheepHop);
  // The barn is drawn in two layers with the sheep between them, so the sheep can walk in through the open doors.
  const back = barnBackSvg(), front = barnSvg({ hole: true });
  const doors = [front.querySelector('.door-l'), front.querySelector('.door-r')];
  const glow = h('span', { class: 'goal-glow', 'aria-hidden': 'true' });
  const goal = h('div', { class: 'hunt-goal', style: { width: GOAL_W + 'px', height: (GOAL_W * 200) / 240 + 'px' } }, glow, back, front);
  front.classList.add('barn-front');
  const sky = h('div', { class: 'sky' });
  const stars = starRow(STEPS);
  const scene = farm();
  const card = findCard(target);
  scene.append(goal, sheep, sky, card);
  const el = h('div', { class: 'game hunt', dataset: { steps: '0', state: 'playing' } }, scene, stars.el);

  const owner = new WeakMap();
  const startDrift = (l) => {
    if (reduced() || !l.btn.isConnected || l.drift) return;
    l.drift = l.btn.animate([{ transform: 'translateY(-4px)' }, { transform: 'translateY(4px)' }], { duration: 3200 + Math.random() * 2200, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: -Math.random() * 3000 });
  };
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
      l.btn = h('button', { class: 'sky-letter', type: 'button', 'aria-label': 'letter', dataset: { target: isTarget ? '1' : '0', letter: ch, slot: String(i) } }, l.face);
      // A touch is handled by the sky's pointer events; a click with no pointer (keyboard, screen reader) chooses the letter too.
      l.btn.addEventListener('click', (e) => { if (e.detail === 0) choose(l); });
      owner.set(l.btn, l);
      l.btn.style.left = l.x - BOX / 2 + 'px';
      l.btn.style.top = l.y - BOX / 2 + 'px';
      sky.append(l.btn);
      startDrift(l);
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
    if (first || steps < STEPS) dealSky();
  }
  const stopWatching = watchSize(scene, layout);
  // Eight quiet seconds: the Find this card swells twice and the target letters in view swell once.
  const hints = idleHints(scene, () => {
    if (locked || done || gesture) return;
    pulseCard(card);
    letters.filter((l) => l.isTarget && l.btn.isConnected && !l.btn.classList.contains('popped')).forEach((l) => l.face.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 500, easing: 'ease-in-out' }));
  });

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

  const centre = (l) => { const r = l.btn.getBoundingClientRect(), o = scene.getBoundingClientRect(); return { x: r.left + r.width / 2 - o.left, y: r.top + r.height / 2 - o.top }; };

  // A letter has been chosen, by a tap, a drag or a key. A wrong one wobbles (a dragged one also goes home); nothing else happens.
  function choose(l, dragged = false) {
    if (done || locked || !l.btn.isConnected || l.btn.classList.contains('popped')) return;
    if (!l.isTarget) { if (dragged) springBack(l); else { shake(l.face); if (l.drift) l.drift.play(); } return; }
    const c = centre(l);
    if (l.drift) { l.drift.cancel(); l.drift = null; }
    l.btn.style.pointerEvents = 'none';
    l.btn.classList.add('popped');
    tintLetter(l.face.firstChild, accent);
    animate(l.face, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 340, fill: 'forwards' });
    T.later(() => l.btn.remove(), 400);
    sparkle(scene, c.x, c.y, { count: 9, size: [10, 20], reach: [30, 62] });
    sfx.play('pop', { step: steps }); // one step up the scale for each step of the sheep
    if (steps < STEPS - 1) stars.fill(steps); // the last star waits for the barn
    steps++;
    el.dataset.steps = String(steps);
    trot();
    if (steps < STEPS) { redeal(); return; }
    locked = true;
    ending();
  }

  // A dragged letter that was not the right one goes back to its place with a small shake.
  function springBack(l) {
    const from = l.btn.style.transform || 'none';
    l.btn.style.transform = '';
    l.btn.classList.remove('dragging');
    if (reduced()) { startDrift(l); return; }
    const a = l.btn.animate([{ transform: from }, { transform: 'translate3d(0,0,0)', offset: 0.55 }, { transform: 'translate3d(-6px,0,0)', offset: 0.72 }, { transform: 'translate3d(4px,0,0)', offset: 0.88 }, { transform: 'translate3d(0,0,0)' }], { duration: 460, easing: 'ease-out' });
    a.finished.then(() => startDrift(l)).catch(() => {});
  }

  // The letter under a point, for a drag that began on the open sky.
  function letterAt(x, y) {
    let best = null, d = BOX / 2;
    for (const l of letters) {
      if (!l.btn.isConnected || l.btn.classList.contains('popped')) continue;
      const r = l.btn.getBoundingClientRect(), k = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (k <= d) { d = k; best = l; }
    }
    return best;
  }

  // Lift: the letter leaves its drifting and follows the finger.
  function lift(g) {
    const l = g.l, r0 = l.btn.getBoundingClientRect();
    if (l.drift) { l.drift.cancel(); l.drift = null; }
    const r1 = l.btn.getBoundingClientRect();
    g.base = { x: r0.left - r1.left, y: r0.top - r1.top };
    l.btn.classList.add('dragging');
  }

  const inside = (e, r) => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  sky.addEventListener('pointerdown', (e) => {
    if (gesture || done || locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (inside(e, card.getBoundingClientRect())) return; // the Find this card is only a picture
    const b = e.target.closest && e.target.closest('.sky-letter'), l = b ? owner.get(b) : null;
    if (l && l.btn.classList.contains('popped')) return;
    gesture = { id: e.pointerId, l, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, drag: false, base: { x: 0, y: 0 } };
    try { sky.setPointerCapture(e.pointerId); } catch {}
    if (l && l.drift) l.drift.pause(); // a finger on a letter holds it still
  });
  sky.addEventListener('pointermove', (e) => {
    const g = gesture;
    if (!g || e.pointerId !== g.id) return;
    g.dx = e.clientX - g.sx; g.dy = e.clientY - g.sy;
    if (!g.drag && Math.hypot(g.dx, g.dy) > DRAG) { g.drag = true; if (g.l) lift(g); }
    if (g.drag && g.l) g.l.btn.style.transform = `translate3d(${g.base.x + g.dx}px,${g.base.y + g.dy}px,0)${reduced() ? '' : ' scale(1.12)'}`;
  });
  sky.addEventListener('pointerup', (e) => {
    const g = gesture;
    if (!g || e.pointerId !== g.id) return;
    gesture = null;
    let l = g.l;
    if (!g.drag) { if (l) { if (l.drift) l.drift.play(); choose(l); } return; }
    if (!l) l = letterAt(e.clientX, e.clientY); // a drag that began on the sky and lifted on a letter
    if (l) choose(l, true);
  });
  sky.addEventListener('pointercancel', (e) => {
    const g = gesture;
    if (!g || e.pointerId !== g.id) return;
    gesture = null;
    if (!g.l) return;
    if (g.drag) springBack(g.l); else if (g.l.drift) g.l.drift.play();
  });

  // The ending. The sheep trots to the barn, the doors open, it walks in and shrinks away, the doors close, the barn hops.
  const keep = (a) => { endAnims.push(a); return a; };
  const door = (open, ms) => doors.forEach((d) => keep(d.animate([{ transform: `scaleX(${open ? 1 : 0.1})` }, { transform: `scaleX(${open ? 0.1 : 1})` }], { duration: ms, fill: 'forwards', easing: 'cubic-bezier(.2,.8,.2,1)' })));
  function ending() {
    el.dataset.state = 'ending';
    hints.stop();
    sky.classList.add('done');
    // The last frame is the barn, the stars and the glow: the letters left in the sky fade away as the ending starts.
    letters.filter((l) => !l.btn.classList.contains('popped')).forEach((l) => { l.btn.style.pointerEvents = 'none'; animate(l.face, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }); });
    if (reduced()) {
      T.later(() => { sheep.style.visibility = 'hidden'; goal.classList.add('done'); stars.fill(STEPS - 1); sfx.play('win'); done = true; el.dataset.state = 'done'; setDone(true); }, 400);
      return;
    }
    T.later(() => door(true, OPEN), TROT);
    T.later(() => {
      const s = sheepHop.getBoundingClientRect(), b = front.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (s.left + s.width / 2), dy = b.top + b.height * 0.955 - s.bottom;
      keep(sheepHop.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px)` }], { duration: WALK, fill: 'forwards', easing: 'ease-in-out' }));
      keep(sheepHop.firstChild.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.7)', opacity: 0 }], { duration: 500, delay: WALK - 500, fill: 'forwards', easing: 'ease-in' }));
      const swing = (sel, from, to) => sheep.querySelectorAll(sel).forEach((g) => keep(g.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }], { duration: 300, iterations: 2, direction: 'alternate', easing: 'ease-in-out' })));
      swing('.leg-a', 16, -16); swing('.leg-b', -16, 16);
    }, TROT + OPEN);
    T.later(() => { sheep.style.visibility = 'hidden'; door(false, SHUT); }, TROT + OPEN + WALK);
    T.later(() => {
      goal.classList.add('done');
      keep(goal.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }], { duration: HOP, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
      sparkle(scene, W - 8 - GOAL_W / 2, H - 40 - GOAL_W * 0.4, { count: 28, size: [16, 34], reach: [80, 170] });
      sfx.play('win');
      stars.fill(STEPS - 1);
      done = true;
      el.dataset.state = 'done';
      setDone(true);
    }, TROT + OPEN + WALK + SHUT);
  }

  function again() {
    T.clear();
    endAnims.forEach((a) => a.cancel()); endAnims = [];
    gesture = null;
    hints.arm();
    steps = 0; done = false; locked = false;
    el.dataset.steps = '0'; el.dataset.state = 'playing';
    sky.classList.remove('done');
    goal.classList.remove('done');
    sheep.style.visibility = '';
    stars.reset();
    sheep.style.transition = 'none';
    sheep.style.transform = 'translateX(0)';
    void sheep.offsetWidth;
    sheep.style.transition = '';
    letters.forEach((l) => { if (l.drift) l.drift.cancel(); });
    sky.replaceChildren(); // every button, including one still popping when Again was pressed
    letters = [];
    dealSky(); // a fresh random layout, never the one before
  }

  const say = [{ tts: cfg.say }];
  return {
    el, flush: true,
    parts: () => say,
    gist: () => fit(`Find ${soundPhrase(sound)}. Touch it.`, `Find ${soundPhrase(sound)}.`),
    script: () => `Say: 'Find the letter that says ${soundPhrase(sound)}. Touch it.' Then say ${soundPhrase(sound)} together.`,
    again: () => { again(); speech.say(say); },
    cleanup: () => { T.clear(); hints.stop(); sky.replaceChildren(); stopWatching(); },
  };
}
