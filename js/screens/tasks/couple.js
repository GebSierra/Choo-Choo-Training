import { h, animate, reduced, icon } from '../../dom.js';
import { huntBackdrop } from '../../art/train2d.js';
import { letterFace } from '../../components/letter-face.js';
import { glyphSvg, wordSvg } from '../../glyphs.js';
import { sayPrompt } from '../../components/say-sound.js';
import { sparkle } from '../../components/sparkle.js';
import { timers, watchSize, starRow, shake, shuffle } from '../../components/game-kit.js';
import { accentOf } from '../../theme.js';
import { fit } from '../../lessons.js';
import { sfx } from '../../sfx.js';
import { letterUnits } from '../../order.js';

const INK = '#1E2140';
const NEXT_MS = 900;
const EW = 100; // the width of the car that couples on (an ending car or a word car), in px

// Couple a Car (World 6, Endings Junction). A base word is a little train of letter cars with a coupler and a gap at the end. The child taps the car that couples on to make the
// new word: an ending car (jump + -ing = jumping) or a word car (sun + set = sunset). The wrong cars are other endings, other words or plain letters that make no word here.
// The grown-up says the two words (the prompt shows them); a recording of the new word plays only when the speaker is tapped. Nothing plays on its own, a wrong car only wobbles.
export function build(ctx) {
  const { lesson, speech } = ctx;
  const items = (lesson.couples || []).slice(0, 4);
  const rounds = items.length;
  const T = timers();
  let round = 0, locked = true, done = false, W = 0;

  const prompt = sayPrompt();
  const cur = () => items[Math.min(round, rounds - 1)];
  const hear = h('button', { class: 'say-hear board-hear', type: 'button', 'aria-label': 'Hear the new word', onclick: () => speech.say([{ word: cur().to }]) }, icon('speaker', 26));
  const track = h('div', { class: 'chain-track couple-track', role: 'group', 'aria-label': 'word train' });
  const choices = h('div', { class: 'chain-choices couple-choices', role: 'group', 'aria-label': 'cars to couple' });
  const wall = h('div', { class: 'station-wall', 'aria-hidden': 'true' });
  const platform = h('div', { class: 'station-platform', 'aria-hidden': 'true' });
  const stars = starRow(rounds);
  const scene = h('div', { class: 'farm board-scene chains-scene couple-scene' }, huntBackdrop());
  const stack = h('div', { class: 'couple-stack' }, track, choices); // the track and the cars share one column under the prompt, so they never overlap at any height
  scene.append(wall, platform, stack, prompt.el, hear);
  const el = h('div', { class: 'game board-game chains-game couple-game', dataset: { round: '0', state: 'playing', word: '' } }, scene, stars.el);

  const baseCar = (u) => h('span', { class: 'chain-car', dataset: { letter: u } }, letterFace(u, INK));
  // The car that couples on: an ending car is the glyph of its lesson key; a word car shows the word; a plain letter is a letter car.
  const faceOf = (item, o) => (item.kind === 'word' ? wordSvg(o, { color: INK, label: 'word', level: lesson.number }) : o.startsWith('end-') ? glyphSvg(o, { color: INK, label: 'ending' }) : letterFace(o, INK));
  const sizeCars = () => {
    const n = Math.max(letterUnits(cur().from, lesson.number).length, 1);
    scene.style.setProperty('--cw', Math.max(40, Math.min(56, Math.floor((W - 28 - EW - 14 - 4 * n) / n))) + 'px');
    scene.style.setProperty('--ew', EW + 'px');
  };
  // the column starts under the prompt, which is one to three lines tall depending on the width
  const place = () => { const s = scene.getBoundingClientRect(), p = prompt.el.getBoundingClientRect(); if (s.height && p.height) scene.style.setProperty('--stack-top', Math.max(96, Math.round(p.bottom - s.top + 8)) + 'px'); };
  const stopWatching = watchSize(scene, (w) => { const first = !W; W = w; if (first) show(); sizeCars(); place(); });

  function show() {
    const item = cur();
    sizeCars();
    el.dataset.word = item.to; el.dataset.round = String(round); el.dataset.kind = item.kind;
    const gap = h('span', { class: 'chain-car gap end', 'aria-label': 'the missing car', dataset: { letter: '' } }, h('b', { 'aria-hidden': 'true' }, '+'));
    track.replaceChildren(...letterUnits(item.from, lesson.number).map(baseCar), h('span', { class: 'coupler', 'aria-hidden': 'true' }), gap);
    choices.replaceChildren(...shuffle(item.options).map((o) => {
      const b = h('button', { class: 'chain-car choice end', type: 'button', 'aria-label': item.kind === 'word' ? 'word car' : o.startsWith('end-') ? 'ending car' : 'letter car', dataset: { part: o, correct: o === item.part ? '1' : '0' } }, faceOf(item, o));
      b.addEventListener('click', () => choose(b));
      return b;
    }));
    prompt.show(`Say: ${item.from}. Add a car to make ${item.to}.`);
    place();
    locked = false;
    if (ctx.refresh) ctx.refresh();
  }

  function choose(b) {
    if (done || locked) return;
    if (b.dataset.correct !== '1') { shake(b); return; }
    locked = true;
    const item = cur();
    const gap = track.querySelector('.gap');
    const accent = accentOf(item.kind === 'ending' ? item.part : lesson.sound);
    const filled = h('span', { class: 'chain-car end fresh', dataset: { part: item.part } }, item.kind === 'word' ? wordSvg(item.part, { color: accent, label: 'word', level: lesson.number }) : glyphSvg(item.part, { color: accent, label: 'ending' }));
    gap.replaceWith(filled);
    animate(filled, [{ transform: 'translateX(40px) scale(.8)', opacity: 0 }, { transform: 'translateX(-4px) scale(1.06)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: reduced() ? 1 : 420 });
    b.classList.add('used');
    track.classList.add('solved');
    const r = filled.getBoundingClientRect(), o = scene.getBoundingClientRect();
    sparkle(scene, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 9, size: [10, 20], reach: [30, 62] });
    sfx.play('pop', { step: round });
    stars.fill(round);
    prompt.show(`Say: ${item.to}!`);
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
    gist: () => { const w = cur(); return fit(`Add a car: ${w.from} to ${w.to}.`, `${w.from} + car = ${w.to}`, `Make ${w.to}.`); },
    script: () => 'Say the base word, then ask your child to couple a car on to make the new word. For example: jump ... jumping. Your child taps the car that fits in the gap: an ending car such as -ing, or a short word such as set in sun and set. The recording of the new word plays only when the speaker is tapped. If they are stuck, say the new word slowly together: the base word first, then the ending.',
    again: () => { again(); },
    cleanup: () => { T.clear(); stopWatching(); },
  };
}
