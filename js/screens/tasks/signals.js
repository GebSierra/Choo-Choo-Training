import { h, animate, reduced, icon } from '../../dom.js';
import { engineSvg, signalSvg, huntBackdrop, puffEl, FUNNEL_TOP } from '../../art/train2d.js';
import { pipSvg } from '../../art/pip.js';
import { letterFace } from '../../components/letter-face.js';
import { sayPrompt, saySound } from '../../components/say-sound.js';
import { timers, watchSize, starRow, shake, idleHints, shuffle } from '../../components/game-kit.js';
import { order, roundTargets, roundsFor, otherLetters } from '../../games-data.js';
import { soundPhrase, fit } from '../../lessons.js';
import { sfx } from '../../sfx.js';

const INK = '#1E2140';
const TRAIN_W = 116, LEAVE_MS = 1500, NEXT_MS = 900, FIRST_MS = 400;

// Green Light. Four railway signal posts stand beside the track; each lamp carries a letter. The grown-up's recorded sound
// plays (or "Say: aaa" shows for the grown-up to say), and the child taps the lamp with that letter: it turns green, Pip
// cheers in the cab and the little engine rolls one step along the track. A wrong lamp only shakes, and the sound plays again.
// After the last round the engine toots and rolls out of the scene. Nothing is timed and nothing is red.
export function build(ctx) {
  const { lesson, sound, speech, curriculum } = ctx;
  const rounds = roundsFor(lesson, 'signals');
  const targets = roundTargets(order(curriculum), lesson.number, rounds);
  const T = timers();
  let round = 0, locked = true, done = false, lastSlot = -1, W = 0, H = 0, endAnims = [], serial = 0;

  const prompt = sayPrompt();
  const hear = h('button', { class: 'say-hear signal-hear', type: 'button', 'aria-label': 'Hear the sound again', onclick: () => hearAgain() }, icon('speaker', 32));
  const buttons = Array.from({ length: 4 }, () => {
    const plate = h('span', { class: 'signal-plate' });
    const b = h('button', { class: 'signal', type: 'button', 'aria-label': 'signal lamp' }, signalSvg(), plate);
    b.plate = plate;
    b.addEventListener('click', () => choose(b));
    return b;
  });
  const row = h('div', { class: 'signal-row' }, buttons);
  const trainHop = h('div', { class: 'train-hop' }, engineSvg());
  const train = h('div', { class: 'train-wrap', style: { width: TRAIN_W + 'px' } }, trainHop);
  const stars = starRow(rounds);
  const scene = h('div', { class: 'farm signals-scene' }, huntBackdrop());
  scene.append(row, prompt.el, hear, train);
  const el = h('div', { class: 'game signals', dataset: { round: '0', state: 'playing' } }, scene, stars.el);

  const seat = () => train.querySelector('.pip-seat');
  const setPip = (pose) => { const s = seat(), old = s.firstChild, p = pipSvg({ pose }); for (const k of ['x', 'y', 'width', 'height']) p.setAttribute(k, old.getAttribute(k)); s.replaceChildren(p); };
  const say = () => saySound(ctx, targets[round], prompt, { stale: () => done || locked });
  function hearAgain() { if (!done) saySound(ctx, targets[round], prompt, { stale: () => false }); }

  function layout(w, hgt) {
    const first = !W;
    W = w; H = hgt;
    const travel = Math.max(40, W - TRAIN_W - 26);
    train.style.setProperty('--travel', travel + 'px');
    train.style.transform = `translateX(${(travel * round) / rounds}px)`;
    // the posts share what is left between the prompt row and the track
    const sb = Math.max(108, Math.min(200, Math.round(H * 0.26)));
    const avail = H - 100 - sb;
    const sw = Math.max(72, Math.min(110, (W - 32 - 24) / 4, avail / 1.7));
    scene.style.setProperty('--sw', sw + 'px');
    scene.style.setProperty('--sb', sb + 'px');
    if (first) newRound();
  }
  const stopWatching = watchSize(scene, layout);

  function newRound() {
    const mine = ++serial;
    const target = targets[round];
    let letters;
    do letters = shuffle([target, ...otherLetters(curriculum, lesson.number, target, 3)]); while (letters.indexOf(target) === lastSlot && letters.length > 1);
    lastSlot = letters.indexOf(target);
    buttons.forEach((b, i) => {
      b.dataset.letter = letters[i];
      b.dataset.target = letters[i] === target ? '1' : '0';
      b.plate.replaceChildren(letterFace(letters[i], INK));
      b.classList.remove('go');
      b.disabled = false;
    });
    el.dataset.round = String(round);
    prompt.hide();
    locked = false;
    T.later(() => { if (mine === serial && !done) say(); }, FIRST_MS);
  }

  function chug() {
    const travel = parseFloat(train.style.getPropertyValue('--travel'));
    train.style.transform = `translateX(${(travel * round) / rounds}px)`;
    if (reduced()) return;
    train.querySelectorAll('.wheel').forEach((w) => w.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'cubic-bezier(.45,.05,.3,1)' }));
    train.querySelector('.engine-body').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }], { duration: 117, iterations: 6, direction: 'alternate', easing: 'ease-in-out' });
    for (let k = 0; k < 2; k++) T.later(() => puff(), k * 300);
  }
  function puff(big = 1) {
    if (!train.isConnected) return;
    const r = trainHop.getBoundingClientRect(), o = scene.getBoundingClientRect();
    const p = puffEl();
    Object.assign(p.style, { left: r.left - o.left + r.width * FUNNEL_TOP.x - 12 + 'px', top: r.top - o.top + r.height * FUNNEL_TOP.y - 14 + 'px' });
    scene.append(p);
    const a = p.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0.95 }, { transform: `translate(${-8 - big * 6}px,${-20 - big * 10}px) scale(${big})`, opacity: 0.9, offset: 0.4 }, { transform: `translate(${-14 - big * 12}px,${-34 - big * 18}px) scale(${1.4 * big})`, opacity: 0 }], { duration: 1100 + big * 300, easing: 'ease-out', fill: 'forwards' });
    a.finished.then(() => p.remove()).catch(() => p.remove());
  }

  function choose(b) {
    if (done || locked) return;
    if (b.dataset.target !== '1') { shake(b); say(); return; }
    locked = true;
    b.classList.add('go');
    sfx.play('pop', { step: round });
    stars.fill(round);
    round++;
    el.dataset.round = String(round);
    setPip('cheer');
    T.later(() => setPip('idle'), 900);
    chug();
    if (round < rounds) { T.later(newRound, NEXT_MS); return; }
    done = true;
    hints.stop();
    T.later(ending, NEXT_MS);
  }

  // The ending: the engine toots, smoke billows and it rolls out to the right; the win jingle follows the toot.
  const keep = (a) => { endAnims.push(a); return a; };
  function finish() { el.dataset.state = 'done'; ctx.setDone(true); }
  function ending() {
    el.dataset.state = 'ending';
    if (reduced()) { sfx.play('win'); finish(); return; }
    sfx.play('toot');
    for (let k = 0; k < 5; k++) T.later(() => puff(1.6 + (k % 3) * 0.3), k * 170);
    const away = W + 30 - train.getBoundingClientRect().left + scene.getBoundingClientRect().left;
    keep(trainHop.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${away}px)` }], { duration: LEAVE_MS, easing: 'cubic-bezier(.55,0,.75,.55)', fill: 'forwards' }));
    train.querySelectorAll('.wheel').forEach((w) => keep(w.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(900deg)' }], { duration: LEAVE_MS, easing: 'cubic-bezier(.55,0,.75,.55)' })));
    keep(train.querySelector('.engine-body').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }], { duration: 110, iterations: 12, direction: 'alternate' }));
    T.later(() => { sfx.play('win'); finish(); }, 1600);
  }

  // Eight quiet seconds: the bell swells and Pip points at it.
  const hints = idleHints(scene, () => {
    if (locked || done) return;
    hear.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 500, iterations: 2, easing: 'ease-in-out' });
    setPip('point'); T.later(() => setPip('idle'), 1600);
  });

  function again() {
    T.clear();
    endAnims.forEach((a) => a.cancel()); endAnims = [];
    hints.arm();
    round = 0; done = false; lastSlot = -1;
    el.dataset.state = 'playing';
    stars.reset();
    setPip('idle');
    scene.querySelectorAll('.steam-puff').forEach((p) => p.remove());
    train.style.transition = 'none';
    train.style.transform = 'translateX(0)';
    void train.offsetWidth;
    train.style.transition = '';
    newRound();
  }

  const parts = [{ tts: curriculum.games.signals.say }];
  return {
    el, flush: true,
    parts: () => parts,
    gist: () => fit(`Tap the light for ${soundPhrase(sound)}.`, `Light for ${soundPhrase(sound)}.`, 'Tap the right light.'),
    script: () => `Say: 'Listen. Which light says ${soundPhrase(sound)}? Tap it.' If no recording plays, say the sound shown at the top.`,
    again: () => { again(); speech.say(parts); },
    cleanup: () => { T.clear(); hints.stop(); stopWatching(); endAnims.forEach((a) => a.cancel()); },
  };
}
