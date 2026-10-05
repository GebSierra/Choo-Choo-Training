import { h, animate, reduced, icon } from '../../dom.js';
import { engineSvg, wagonSvg, huntBackdrop, puffEl, FUNNEL_TOP } from '../../art/train2d.js';
import { pipSvg } from '../../art/pip.js';
import { letterFace } from '../../components/letter-face.js';
import { sayPrompt, saySound } from '../../components/say-sound.js';
import { sparkle } from '../../components/sparkle.js';
import { timers, watchSize, findCard, starRow, idleHints, pulseCard } from '../../components/game-kit.js';
import { roundsFor, otherLetters, parade } from '../../games-data.js';
import { soundPhrase, fit } from '../../lessons.js';
import { sfx } from '../../sfx.js';

const INK = '#1E2140';
const TRAIN_W = 116, WAGON_W = 104, GAP = 16, SIZE = 8, HITS = 3, SPEED = 80; // px and px per second
const SLOT = WAGON_W + GAP, LOOP = SIZE * SLOT, OFF = 120; // a wagon is drawn from -OFF to LOOP - OFF, so it wraps out of sight
const NEXT_MS = 900, FIRST_MS = 400;
// Soft wagon colours that are never tied to which letter is the target.
const PAINT = [{ body: '#D65A4A', rib: '#B8463A' }, { body: '#5AA7DD', rib: '#3F86BD' }, { body: '#4FB783', rib: '#3A9568' }, { body: '#9B7FE0', rib: '#7B5FC0' }];
const CROSS = 'M6 6 L26 26 M26 6 L6 26';

// Wagon Parade. Toy goods wagons roll along a siding, coupled in a loop, each with a wooden crate that carries a letter.
// The grown-up's recorded sound plays on every tap (or "Say: mmm" shows for the grown-up); the child taps every wagon whose
// crate has the sound. A right wagon hops, uncouples and speeds ahead with a puff from the engine and a cheer from Pip;
// a wrong one only gets a soft red cross. The loop brings a missed wagon round again: nothing is timed. The one
// requestAnimationFrame loop runs only while a parade is rolling. Reduced motion: the wagons stand still in rows.
export function build(ctx) {
  const { lesson, sound, speech, curriculum } = ctx;
  const target = lesson.sound;
  const rounds = roundsFor(lesson, 'wagons');
  const others = otherLetters(curriculum, lesson.number, target, 3);
  const T = timers();
  let round = 0, hitsLeft = 0, hitsDone = 0, locked = true, done = false, rolling = false, W = 0, H = 0, offset = 0, raf = 0, last = 0, wagons = [], endAnims = [], serial = 0, still = reduced();

  const prompt = sayPrompt();
  const card = findCard(target);
  const hear = h('button', { class: 'say-hear wagon-hear', type: 'button', 'aria-label': 'Hear the sound again', onclick: () => saySound(ctx, target, prompt) }, icon('speaker', 32));
  const rail = h('div', { class: 'parade-rail', 'aria-hidden': 'true' });
  const lane = h('div', { class: 'parade' + (still ? ' still' : '') });
  const trainHop = h('div', { class: 'train-hop' }, engineSvg());
  const train = h('div', { class: 'train-wrap', style: { width: TRAIN_W + 'px' } }, trainHop);
  const stars = starRow(rounds);
  const scene = h('div', { class: 'farm wagons-scene' }, huntBackdrop());
  scene.append(rail, lane, card, prompt.el, hear, train);
  const el = h('div', { class: 'game wagons', dataset: { round: '0', state: 'playing' } }, scene, stars.el);

  const seat = () => train.querySelector('.pip-seat');
  const setPip = (pose) => { const s = seat(), old = s.firstChild, p = pipSvg({ pose }); for (const k of ['x', 'y', 'width', 'height']) p.setAttribute(k, old.getAttribute(k)); s.replaceChildren(p); };
  const stale = () => done;
  const hearOne = () => saySound(ctx, target, prompt, { stale });

  function puff(big = 1) {
    if (!train.isConnected) return;
    const r = trainHop.getBoundingClientRect(), o = scene.getBoundingClientRect();
    const p = puffEl();
    Object.assign(p.style, { left: r.left - o.left + r.width * FUNNEL_TOP.x - 12 + 'px', top: r.top - o.top + r.height * FUNNEL_TOP.y - 14 + 'px' });
    scene.append(p);
    const a = p.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0.95 }, { transform: `translate(${-8 - big * 6}px,${-20 - big * 10}px) scale(${big})`, opacity: 0.9, offset: 0.4 }, { transform: `translate(${-14 - big * 12}px,${-34 - big * 18}px) scale(${1.4 * big})`, opacity: 0 }], { duration: 1100 + big * 300, easing: 'ease-out', fill: 'forwards' });
    a.finished.then(() => p.remove()).catch(() => p.remove());
  }
  function chug() {
    if (reduced()) return;
    train.querySelectorAll('.wheel').forEach((w) => w.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'cubic-bezier(.45,.05,.3,1)' }));
    train.querySelector('.engine-body').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }], { duration: 117, iterations: 6, direction: 'alternate', easing: 'ease-in-out' });
    puff();
  }

  // ---- the wagons ----
  const place = (w) => { w.pos.style.transform = `translate3d(${((((w.x0 + offset) % LOOP) + LOOP) % LOOP) - OFF}px,0,0)`; };
  function layout(w, hgt) {
    const first = !W;
    W = w; H = hgt;
    const travel = Math.max(40, W - TRAIN_W - 26);
    train.style.setProperty('--travel', travel + 'px');
    if (first) newParade();
  }
  const stopWatching = watchSize(scene, layout);

  function newParade() {
    const mine = ++serial;
    lane.replaceChildren();
    const letters = parade(target, others, { size: SIZE, hits: HITS });
    wagons = letters.map((ch, i) => {
      const paint = PAINT[(i + round) % PAINT.length];
      const btn = h('button', { class: 'parade-wagon', type: 'button', 'aria-label': 'wagon', dataset: { letter: ch, target: ch === target ? '1' : '0', slot: String(i) } },
        wagonSvg(paint), h('span', { class: 'crate' }, letterFace(ch, INK)));
      const pos = h('div', { class: 'pw' }, btn);
      const w = { i, ch, isTarget: ch === target, btn, pos, x0: i * SLOT, gone: false };
      btn.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; tap(w); });
      btn.addEventListener('click', (e) => { if (e.detail === 0) tap(w); });
      lane.append(pos);
      return w;
    });
    hitsLeft = HITS; hitsDone = 0; locked = false;
    el.dataset.round = String(round);
    prompt.hide();
    if (still) {
      wagons.forEach((w) => { w.pos.style.transform = ''; });
    } else {
      // the first target rolls in at once: it starts a little way in from the left edge
      const first = wagons.find((w) => w.isTarget);
      offset = W * 0.12 - first.x0;
      wagons.forEach(place);
      start();
    }
    wagons.forEach((w) => animate(w.btn, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 }));
    T.later(() => { if (mine === serial && !done) hearOne(); }, FIRST_MS);
  }

  // The one animation loop: it exists only while wagons are rolling.
  function frame(t) {
    raf = 0;
    if (!rolling) return;
    const dt = Math.max(0, (t - last) / 1000);
    last = t;
    offset += SPEED * dt;
    wagons.forEach((w) => { if (!w.gone) place(w); });
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (still || rolling || document.hidden || done) return;
    rolling = true; last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() { rolling = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  const onVisible = () => { if (document.hidden) stop(); else if (hitsLeft > 0 && !locked) start(); };
  document.addEventListener('visibilitychange', onVisible);

  function tap(w) {
    if (done || locked || w.gone) return;
    hearOne(); // every tap plays the sound (or shows what to say)
    if (!w.isTarget) { wrong(w); return; }
    w.gone = true;
    hitsLeft--;
    sfx.play('pop', { step: hitsDone });
    hitsDone++;
    const r = w.btn.getBoundingClientRect(), o = scene.getBoundingClientRect();
    sparkle(scene, r.left - o.left + r.width / 2, r.top - o.top + r.height / 3, { count: 9, size: [10, 20], reach: [30, 62] });
    setPip('cheer'); T.later(() => setPip('idle'), 900);
    chug();
    if (still) animate(w.btn, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    else {
      endAnims.push(w.btn.animate([{ transform: 'translateY(0)', offset: 0 }, { transform: 'translateY(-18px)', offset: 0.35 }, { transform: 'translate(0,0)', offset: 0.5 }, { transform: `translateX(${W + 200}px)`, offset: 1 }], { duration: 1000, easing: 'ease-in', fill: 'forwards' }));
    }
    w.btn.style.pointerEvents = 'none';
    if (hitsLeft > 0) return;
    // the parade is over: the wagons stop rolling, the star fills, the next parade follows
    locked = true;
    stop();
    round++;
    stars.fill(round - 1);
    el.dataset.round = String(round);
    if (round >= rounds) { done = true; hints.stop(); T.later(ending, NEXT_MS); return; }
    T.later(() => { wagons.forEach((x) => { if (!x.gone) animate(x.btn, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' }); }); }, NEXT_MS - 300);
    T.later(newParade, NEXT_MS);
  }

  function wrong(w) {
    const x = h('svg', { class: 'no-x', viewBox: '0 0 32 32', 'aria-hidden': 'true' }, h('path', { d: CROSS, stroke: '#E5484D', 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }));
    w.pos.append(x);
    const a = x.animate([{ opacity: 0 }, { opacity: 0.7, offset: 0.25 }, { opacity: 0.7, offset: 0.6 }, { opacity: 0 }], { duration: reduced() ? 400 : 600 });
    a.finished.then(() => x.remove()).catch(() => x.remove());
  }

  function ending() {
    el.dataset.state = 'ending';
    setPip('wave');
    if (reduced()) { sfx.play('win'); finish(); return; }
    sfx.play('toot');
    for (let k = 0; k < 4; k++) T.later(() => puff(1.5 + (k % 3) * 0.3), k * 170);
    T.later(() => { sfx.play('win'); finish(); }, 1600);
  }
  function finish() { el.dataset.state = 'done'; ctx.setDone(true); }

  const hints = idleHints(scene, () => {
    if (locked || done) return;
    pulseCard(card);
    hear.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 500, iterations: 2, easing: 'ease-in-out' });
  });

  function again() {
    T.clear(); stop();
    endAnims.forEach((a) => a.cancel()); endAnims = [];
    hints.arm();
    round = 0; done = false; still = reduced();
    el.dataset.state = 'playing';
    stars.reset(); setPip('idle');
    scene.querySelectorAll('.steam-puff').forEach((p) => p.remove());
    newParade();
  }

  const parts = [{ tts: curriculum.games.wagons.say }];
  return {
    el, flush: true,
    parts: () => parts,
    gist: () => fit(`Tap every ${soundPhrase(sound)}.`, 'Tap every one.'),
    script: () => `Say: 'Tap every wagon that says ${soundPhrase(sound)}.' Every tap plays the sound; say it with them.`,
    again: () => { again(); speech.say(parts); },
    cleanup: () => { T.clear(); stop(); document.removeEventListener('visibilitychange', onVisible); hints.stop(); stopWatching(); endAnims.forEach((a) => a.cancel()); },
  };
}
