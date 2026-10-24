import { h, animate, reduced, icon } from '../../dom.js';
import { huntBackdrop } from '../../art/train2d.js';
import { letterFace, tintLetter } from '../../components/letter-face.js';
import { sayPrompt } from '../../components/say-sound.js';
import { sparkle } from '../../components/sparkle.js';
import { timers, watchSize, starRow, shake, shuffle } from '../../components/game-kit.js';
import { accentOf } from '../../theme.js';
import { sfx } from '../../sfx.js';
import { letterUnits, blendAtUnits } from '../../order.js';

const INK = '#1E2140';
const NEXT_MS = 900;

// Add a Car (World 5, Blend Bay). A word is a little train of letter cars; one car is missing. The child taps the car that makes a new word
// (top, stop: add an s). Adding a sound to a word is how the blends are heard: the new word is shown with its blend under one soft bracket.
// The grown-up says the two words (the prompt shows them); a recording of the new word plays only when the speaker is tapped. Nothing plays on its own.
export function build(ctx) {
  const { lesson, speech } = ctx;
  const chains = (lesson.chains || []).slice(0, 4);
  const rounds = chains.length;
  const T = timers();
  let round = 0, locked = true, done = false, W = 0, cars = [];

  const prompt = sayPrompt();
  const word = () => chains[Math.min(round, rounds - 1)];
  const hear = h('button', { class: 'say-hear board-hear', type: 'button', 'aria-label': 'Hear the new word', onclick: () => speech.say([{ word: word().to }]) }, icon('speaker', 26));
  const track = h('div', { class: 'chain-track', role: 'group', 'aria-label': 'word train' });
  const choices = h('div', { class: 'chain-choices', role: 'group', 'aria-label': 'letter cars' });
  const wall = h('div', { class: 'station-wall', 'aria-hidden': 'true' });
  const platform = h('div', { class: 'station-platform', 'aria-hidden': 'true' });
  const stars = starRow(rounds);
  const scene = h('div', { class: 'farm board-scene chains-scene' }, huntBackdrop());
  scene.append(wall, platform, track, choices, prompt.el, hear);
  const el = h('div', { class: 'game board-game chains-game', dataset: { round: '0', state: 'playing', word: '' } }, scene, stars.el);

  const car = (ch, cls = '') => h('span', { class: 'chain-car ' + cls, dataset: { letter: ch } }, letterFace(ch, INK));
  function layout(w) {
    const first = !W;
    W = w;
    if (first) show();
    sizeCars();
  }
  const sizeCars = () => {
    const n = Math.max(letterUnits(word().to, lesson.number).length, 1);
    scene.style.setProperty('--cw', Math.max(44, Math.min(64, Math.floor((W - 28 - 8 * (n - 1)) / n))) + 'px');
  };
  const stopWatching = watchSize(scene, layout);

  function show() {
    const { from, to, at, letter, options } = word();
    sizeCars();
    const units = letterUnits(from, lesson.number);
    el.dataset.word = to; el.dataset.round = String(round);
    cars = units.map((u) => car(u));
    const gap = h('span', { class: 'chain-car gap', 'aria-label': 'the missing car', dataset: { letter: '' } }, h('b', { 'aria-hidden': 'true' }, '+'));
    cars.splice(at, 0, gap);
    track.replaceChildren(...cars);
    choices.replaceChildren(...shuffle(options).map((o) => {
      const b = h('button', { class: 'chain-car choice', type: 'button', 'aria-label': 'letter car', dataset: { letter: o, correct: o === letter ? '1' : '0' } }, letterFace(o, INK));
      b.addEventListener('click', () => choose(b));
      return b;
    }));
    prompt.show(`Say: ${from}. Add a car to make ${to}.`);
    locked = false;
    if (ctx.refresh) ctx.refresh();
  }

  function choose(b) {
    if (done || locked) return;
    if (b.dataset.correct !== '1') { shake(b); return; }
    locked = true;
    const { to, at, letter } = word();
    const gap = track.querySelector('.gap');
    const filled = car(letter, 'fresh');
    gap.replaceWith(filled);
    cars[at] = filled;
    tintLetter(filled.firstChild, accentOf(letter));
    animate(filled, [{ transform: 'translateY(-26px) scale(.8)', opacity: 0 }, { transform: 'translateY(0) scale(1.08)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: reduced() ? 1 : 420 });
    b.classList.add('used');
    for (const i of blendAtUnits(letterUnits(to, lesson.number), lesson.number)) { cars[i].classList.add('in-blend', 'blend-start'); cars[i + 1].classList.add('in-blend', 'blend-end'); }
    track.classList.add('solved');
    const r = filled.getBoundingClientRect(), o = scene.getBoundingClientRect();
    sparkle(scene, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 9, size: [10, 20], reach: [30, 62] });
    sfx.play('pop', { step: round });
    stars.fill(round);
    prompt.show(`Say: ${to}!`);
    round++;
    if (round < rounds) { T.later(() => { track.classList.remove('solved'); show(); }, NEXT_MS); return; }
    done = true;
    T.later(() => { el.dataset.state = 'done'; sfx.play('win'); ctx.setDone(true); }, NEXT_MS);
  }

  function again() {
    T.clear();
    round = 0; done = false; el.dataset.state = 'playing';
    stars.reset(); track.classList.remove('solved');
    show();
  }

  const parts = [{ tts: 'Add a car to make a new word.' }];
  return {
    el, flush: true,
    parts: () => parts,
    gist: () => { const w = word(); return `Add a car: ${w.from} to ${w.to}.`; },
    script: () => "Say the first word, then ask your child to add a car to make the new word. For example: top ... stop. Your child taps the letter car that fits in the gap. The recording of the new word plays only when the speaker is tapped. If they are stuck, say the new word slowly together, holding the first sound.",
    again: () => { again(); },
    cleanup: () => { T.clear(); stopWatching(); },
  };
}
