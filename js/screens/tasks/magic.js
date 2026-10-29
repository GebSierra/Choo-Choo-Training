import { h, animate, reduced, icon } from '../../dom.js';
import { huntBackdrop } from '../../art/train2d.js';
import { letterFace } from '../../components/letter-face.js';
import { wordSvg } from '../../glyphs.js';
import { sayPrompt } from '../../components/say-sound.js';
import { sparkle } from '../../components/sparkle.js';
import { timers, watchSize, starRow, shake, shuffle } from '../../components/game-kit.js';
import { accentOf } from '../../theme.js';
import { fit } from '../../lessons.js';
import { sfx } from '../../sfx.js';
import { letterUnits, patternOf } from '../../order.js';

const INK = '#1E2140';
const NEXT_MS = 1700;

// Magic e Car (World 7, Silent E Summit). A short word is a little train of letter cars with a coupler and a gap at the end. The child taps the e car that couples on, and the word
// becomes its long partner: cap becomes cape. The e goes dim (it makes no sound) and a jump arc runs from the e back to the vowel, which now says its name. The wrong cars are letters
// that make no word with the short word. The grown-up says the two words (the prompt shows them); a recording of the new word plays ONLY when the speaker is tapped.
// Nothing plays on its own, a wrong car only wobbles.
export function build(ctx) {
  const { lesson, speech } = ctx;
  const items = (lesson.magic || []).slice(0, 4);
  const rounds = items.length;
  const T = timers();
  let round = 0, locked = true, done = false, W = 0;

  const prompt = sayPrompt();
  const cur = () => items[Math.min(round, rounds - 1)];
  const hear = h('button', { class: 'say-hear board-hear', type: 'button', 'aria-label': 'Hear the new word', onclick: () => speech.say([{ word: cur().to }]) }, icon('speaker', 26));
  const track = h('div', { class: 'chain-track couple-track magic-track', role: 'group', 'aria-label': 'word train' });
  const choices = h('div', { class: 'chain-choices couple-choices magic-choices', role: 'group', 'aria-label': 'cars to couple' });
  const wall = h('div', { class: 'station-wall', 'aria-hidden': 'true' });
  const platform = h('div', { class: 'station-platform', 'aria-hidden': 'true' });
  const stars = starRow(rounds);
  const scene = h('div', { class: 'farm board-scene chains-scene couple-scene magic-scene' }, huntBackdrop());
  const stack = h('div', { class: 'couple-stack' }, track, choices); // the track and the cars share one column under the prompt, so they never overlap at any height
  scene.append(wall, platform, stack, prompt.el, hear);
  const el = h('div', { class: 'game board-game chains-game couple-game magic-game', dataset: { round: '0', state: 'playing', word: '' } }, scene, stars.el);

  const baseCar = (u) => h('span', { class: 'chain-car', dataset: { letter: u } }, letterFace(u, INK));
  const sizeCars = () => {
    const n = Math.max(letterUnits(cur().from, lesson.number).length, 1);
    scene.style.setProperty('--cw', Math.max(36, Math.min(56, Math.floor((W - 28 - 16 - 8 * (n + 2)) / (n + 1)))) + 'px');
  };
  // the column starts under the prompt, which is one to three lines tall depending on the width
  const place = () => { const s = scene.getBoundingClientRect(), p = prompt.el.getBoundingClientRect(); if (s.height && p.height) scene.style.setProperty('--stack-top', Math.max(96, Math.round(p.bottom - s.top + 8)) + 'px'); };
  const stopWatching = watchSize(scene, (w) => { const first = !W; W = w; if (first) show(); sizeCars(); place(); });

  function show() {
    const item = cur();
    sizeCars();
    el.dataset.word = item.to; el.dataset.round = String(round);
    track.classList.remove('solved', 'magic-done');
    const gap = h('span', { class: 'chain-car gap', 'aria-label': 'the missing car', dataset: { letter: '' } }, h('b', { 'aria-hidden': 'true' }, '+'));
    track.replaceChildren(...letterUnits(item.from, lesson.number).map(baseCar), h('span', { class: 'coupler', 'aria-hidden': 'true' }), gap);
    choices.replaceChildren(...shuffle(item.options).map((o) => {
      const b = h('button', { class: 'chain-car choice', type: 'button', 'aria-label': 'letter car', dataset: { letter: o, correct: o === 'e' ? '1' : '0' } }, letterFace(o, INK));
      b.addEventListener('click', () => choose(b));
      return b;
    }));
    prompt.show(`Say: ${item.from}. Add the magic e to make ${item.to}.`);
    place();
    locked = false;
    if (ctx.refresh) ctx.refresh();
  }

  // The short word and its long partner side by side: cap, then cape with the e dim and the jump arc back to the vowel (wordSvg draws both once the pattern is taught).
  function result(item) {
    const accent = accentOf(patternOf(item.to) ? patternOf(item.to).key : lesson.sound);
    const arrow = h('span', { class: 'mp-arrow', 'aria-hidden': 'true' }, '→');
    return h('div', { class: 'magic-pair', dataset: { from: item.from, to: item.to } },
      h('span', { class: 'mp-from' }, wordSvg(item.from, { color: INK, label: item.from, level: lesson.number })), arrow,
      h('span', { class: 'mp-to' }, wordSvg(item.to, { color: accent, label: item.to, level: lesson.number })));
  }

  function choose(b) {
    if (done || locked) return;
    if (b.dataset.correct !== '1') { shake(b); return; }
    locked = true;
    const item = cur();
    const gap = track.querySelector('.gap');
    const filled = h('span', { class: 'chain-car fresh', dataset: { letter: 'e' } }, letterFace('e', accentOf(patternOf(item.to) ? patternOf(item.to).key : lesson.sound)));
    gap.replaceWith(filled);
    animate(filled, [{ transform: 'translateX(40px) scale(.8)', opacity: 0 }, { transform: 'translateX(-4px) scale(1.06)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: reduced() ? 1 : 420 });
    b.classList.add('used');
    track.classList.add('solved');
    const r = filled.getBoundingClientRect(), o = scene.getBoundingClientRect();
    sparkle(scene, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 9, size: [10, 20], reach: [30, 62] });
    sfx.play('pop', { step: round });
    stars.fill(round);
    prompt.show(`Say: ${item.to}! The e is silent. The vowel says its name.`);
    const mine = round;
    // the coupled e car turns into the word: the short word, an arrow, and the long word with its jump
    T.later(() => {
      if (mine !== round) return;
      const pair = result(item);
      track.classList.add('magic-done');
      track.replaceChildren(pair);
      animate(pair, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1)' }], { duration: reduced() ? 1 : 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      place();
    }, reduced() ? 0 : 520);
    round++;
    if (round < rounds) { T.later(show, NEXT_MS); return; }
    done = true;
    T.later(() => { el.dataset.state = 'done'; sfx.play('win'); ctx.setDone(true); }, NEXT_MS);
  }

  function again() {
    T.clear();
    round = 0; done = false; el.dataset.state = 'playing';
    stars.reset();
    show();
  }

  const parts = [{ tts: 'Add the magic e to make a new word.' }];
  return {
    el, flush: true,
    parts: () => parts,
    gist: () => { const w = cur(); return fit(`Magic e: ${w.from} to ${w.to}.`, `${w.from} + e = ${w.to}`, `Make ${w.to}.`); },
    script: () => 'Say the short word, then ask your child to couple the magic e car on to make the long word. For example: cap ... cape. Your child taps the e car that fits in the gap. Then look at the new word together: the e is silent and jumps back to the vowel, and the vowel says its name. The recording of the new word plays only when the speaker is tapped. If they are stuck, say both words slowly together: cap, then cape.',
    again: () => { again(); },
    cleanup: () => { T.clear(); stopWatching(); },
  };
}
