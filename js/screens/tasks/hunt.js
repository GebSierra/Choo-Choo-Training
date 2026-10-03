import { h, animate, reduced } from '../../dom.js';
import { engineSvg, stationSvg, huntBackdrop, puffEl, FUNNEL_TOP } from '../../art/train2d.js';
import { pipSvg } from '../../art/pip.js';
import { letterFace, tintLetter } from '../../components/letter-face.js';
import { sparkle } from '../../components/sparkle.js';
import { timers, watchSize, findCard, starRow, shake, idleHints, pulseCard } from '../../components/game-kit.js';
import { skyCells, deal, BOX } from './hunt-deal.js';
import { accentOf } from '../../theme.js';
import { soundPhrase, fit } from '../../lessons.js';
import { sfx } from '../../sfx.js';

const STEPS = 5;     // correct touches to reach the station
const INK = '#1E2140';
const TRAIN_W = 116, GOAL_W = 152;
const DRAG = 10;     // px a finger must travel before a touch counts as a drag
const ARRIVE = 700, DEPART = 1100, LEAVE_MS = 1500, HOP = 500, WIN_AT = 2050;
// The ending (about 2.6 s): the train pulls in (0.7 s), Pip waves and the bunting drops; at 1.1 s smoke billows, it toots
// and chugs off to the right, out of the scene; the win jingle at 2.05 s (after the toot has ended).
const BALLOONS = ['#FFC9C9', '#FFE3A3', '#C4E8FF', '#CDEFD6', '#E2D8FF', '#FFD8BE']; // never tied to which letter is the target
const FADE_OUT = 180, FADE_IN = 260, SWAP = 450; // a new sky: the old one fades out, a fresh one fades in, taps wait

// Where the targets sat in the last few skies, kept between visits so even a new visit never starts with the last layout.
let memory = { slots: 0, deals: [] };

// Letter Hunt. The sky is full of letters on balloons; each one that matches the card pops and the little train (Pip in
// the cab) chugs one step along the track. After every right touch the whole sky is dealt again (see hunt-deal.js), so
// the target never sits in a place the child could learn. The letter a finger lands on is the one chosen, whether it was
// tapped or dragged. Nothing scores, nothing says wrong, nothing is timed. The fifth right letter brings the train into
// the station: Pip waves and the bunting drops, then smoke billows and the train toots and chugs off to the right, out of
// the scene; the win jingle plays and the balloons left over float away. Reduced motion: it simply stands at the station.
export function build({ lesson, sound, speech, curriculum, setDone }) {
  const target = lesson.sound, accent = accentOf(target);
  const cfg = curriculum.games.hunt;
  const others = cfg.distractors[target] || [];
  const T = timers();
  let steps = 0, done = false, locked = false, W = 0, H = 0, grid = [], letters = [], gesture = null, endAnims = [];

  const trainHop = h('div', { class: 'train-hop' }, engineSvg());
  const train = h('div', { class: 'train-wrap', style: { width: TRAIN_W + 'px' } }, trainHop);
  const station = stationSvg({ accent });
  const glow = h('span', { class: 'goal-glow', 'aria-hidden': 'true' });
  const goal = h('div', { class: 'hunt-goal', style: { width: GOAL_W + 'px', height: (GOAL_W * 200) / 240 + 'px' } }, glow, station);
  const sky = h('div', { class: 'sky' });
  const stars = starRow(STEPS);
  const scene = h('div', { class: 'farm hunt-scene' }, huntBackdrop());
  const card = findCard(target);
  scene.append(goal, train, sky, card);
  const el = h('div', { class: 'game hunt', dataset: { steps: '0', state: 'playing' } }, scene, stars.el);
  const seat = () => train.querySelector('.pip-seat');
  const setPip = (pose) => { const s = seat(), old = s.firstChild, p = pipSvg({ pose }); for (const k of ['x', 'y', 'width', 'height']) p.setAttribute(k, old.getAttribute(k)); s.replaceChildren(p); };

  const owner = new WeakMap();
  const startDrift = (l) => {
    if (reduced() || !l.btn.isConnected || l.drift) return;
    l.drift = l.btn.animate([{ transform: 'translateY(-4px)' }, { transform: 'translateY(4px)' }], { duration: 3200 + Math.random() * 2200, direction: 'alternate', iterations: 8, easing: 'ease-in-out', delay: -Math.random() * 3000 }); // about 20 s, then still
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
      l.btn = h('button', { class: 'sky-letter', type: 'button', 'aria-label': 'letter', style: { '--bal': BALLOONS[(i * 5 + memory.deals.length) % BALLOONS.length] }, dataset: { target: isTarget ? '1' : '0', letter: ch, slot: String(i) } }, h('span', { class: 'string', 'aria-hidden': 'true' }), l.face);
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
    const travel = Math.max(40, W - TRAIN_W - 26); // the fifth step ends at the station, in front of its platform
    train.style.setProperty('--travel', travel + 'px');
    train.style.transform = `translateX(${(travel * steps) / STEPS}px)`;
    grid = skyCells(W, H, { goalW: 150 }); // the station's box stays inside the sky's goal reserve
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

  // One step along the track: the wheels turn, the engine bobs and a puff of steam rises from the funnel.
  function chug() {
    const travel = parseFloat(train.style.getPropertyValue('--travel'));
    train.style.transform = `translateX(${(travel * steps) / STEPS}px)`;
    if (reduced()) return;
    train.querySelectorAll('.wheel').forEach((w) => w.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'cubic-bezier(.45,.05,.3,1)' }));
    train.querySelector('.engine-body').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }], { duration: 117, iterations: 6, direction: 'alternate', easing: 'ease-in-out' });
    for (let k = 0; k < 2; k++) T.later(() => puff(), k * 300);
  }
  function puff(big = 1) {
    if (!train.isConnected) return;
    const r = trainHop.getBoundingClientRect(), o = scene.getBoundingClientRect();
    const p = puffEl();
    const x = r.left - o.left + r.width * FUNNEL_TOP.x, y = r.top - o.top + r.height * FUNNEL_TOP.y;
    Object.assign(p.style, { left: x - 12 + 'px', top: y - 14 + 'px' });
    scene.append(p);
    const a = p.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0.95 }, { transform: `translate(${-8 - big * 6}px,${-20 - big * 10}px) scale(${big})`, opacity: 0.9, offset: 0.4 }, { transform: `translate(${-14 - big * 12}px,${-34 - big * 18}px) scale(${1.4 * big})`, opacity: 0 }], { duration: 1100 + big * 300, easing: 'ease-out', fill: 'forwards' });
    a.finished.then(() => p.remove()).catch(() => p.remove());
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
    const string = l.btn.querySelector('.string');
    if (string) animate(string, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    T.later(() => l.btn.remove(), 400);
    sparkle(scene, c.x, c.y, { count: 9, size: [10, 20], reach: [30, 62] });
    sfx.play('pop', { step: steps }); // one step up the scale for each step of the train
    if (steps < STEPS - 1) stars.fill(steps); // the last star waits for the station
    steps++;
    el.dataset.steps = String(steps);
    chug();
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

  // The ending. The train pulls into the station; Pip leans out and waves, the bunting drops and the train toots; the
  // balloons left in the sky float away; then the station glows, the last star fills and the win jingle plays.
  const keep = (a) => { endAnims.push(a); return a; };
  function finish() {
    goal.classList.add('done');
    stars.fill(STEPS - 1);
    done = true;
    el.dataset.state = 'done';
    setDone(true);
  }
  function ending() {
    el.dataset.state = 'ending';
    hints.stop();
    sky.classList.add('done');
    const left = letters.filter((l) => !l.btn.classList.contains('popped'));
    left.forEach((l) => { l.btn.style.pointerEvents = 'none'; if (l.drift) { l.drift.cancel(); l.drift = null; } });
    if (reduced()) {
      left.forEach((l) => animate(l.btn, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }));
      T.later(() => { goal.classList.add('arrived'); setPip('wave'); sfx.play('win'); finish(); }, 400);
      T.later(() => sfx.play('toot'), 2100); // after the jingle, never over it
      return;
    }
    // the balloons drift up and away, each at its own pace
    left.forEach((l, k) => keep(l.btn.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${-(l.y + 140)}px)`, opacity: 0 }], { duration: 1500 + (k % 4) * 260, delay: 200 + (k % 5) * 90, easing: 'cubic-bezier(.4,0,.7,.6)', fill: 'forwards' })));
    T.later(() => {
      goal.classList.add('arrived');
      keep(station.querySelector('.bunting').animate([{ transform: 'translateY(-16px) scaleY(.3)', opacity: 0 }, { transform: 'translateY(2px) scaleY(1.05)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
      setPip('wave');
      keep(seat().animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: 'translate(6px,-3px) rotate(8deg)' }], { duration: 300, fill: 'forwards', easing: 'ease-out' }));
      puff();
    }, ARRIVE);
    // smoke billows from the funnel and the train chugs off to the right, out of the scene, with a toot
    T.later(() => {
      sfx.play('toot');
      for (let k = 0; k < 6; k++) T.later(() => puff(1.6 + (k % 3) * 0.3), k * 170);
      const away = W + 30 - train.getBoundingClientRect().left + scene.getBoundingClientRect().left;
      keep(trainHop.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${away}px)` }], { duration: LEAVE_MS, easing: 'cubic-bezier(.55,0,.75,.55)', fill: 'forwards' }));
      train.querySelectorAll('.wheel').forEach((w) => keep(w.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(900deg)' }], { duration: LEAVE_MS, easing: 'cubic-bezier(.55,0,.75,.55)' })));
      keep(train.querySelector('.engine-body').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }], { duration: 110, iterations: 12, direction: 'alternate' }));
      el.dataset.train = 'leaving';
    }, DEPART);
    T.later(() => {
      keep(goal.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }], { duration: HOP, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
      sparkle(scene, W - 8 - GOAL_W / 2, H - 40 - GOAL_W * 0.45, { count: 28, size: [16, 34], reach: [80, 170] });
      sfx.play('win');
      finish();
    }, WIN_AT);
  }

  function again() {
    T.clear();
    endAnims.forEach((a) => a.cancel()); endAnims = [];
    gesture = null;
    hints.arm();
    steps = 0; done = false; locked = false;
    el.dataset.steps = '0'; el.dataset.state = 'playing'; el.dataset.train = '';
    sky.classList.remove('done');
    goal.classList.remove('done', 'arrived');
    setPip('idle');
    scene.querySelectorAll('.steam-puff').forEach((p) => p.remove());
    stars.reset();
    train.style.transition = 'none';
    train.style.transform = 'translateX(0)';
    void train.offsetWidth;
    train.style.transition = '';
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
    cleanup: () => { T.clear(); hints.stop(); sky.replaceChildren(); stopWatching(); endAnims.forEach((a) => a.cancel()); },
  };
}
