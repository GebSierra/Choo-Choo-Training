import { h, animate, reduced, icon } from '../../dom.js';
import { wordSvg, hasGlyph } from '../../glyphs.js';
import { letterText } from '../../letters.js';
import { stretchWord, stretchLetters } from '../../scripts.js';
import { slideBlend } from '../../components/slide-blend.js';

// Task 5: stretch the sounds, then say the word.
export function build({ lesson, speech, refresh }) {
  const list = lesson.sayingSounds;
  let i = 0, revealed = false, sweepAnim = null, blend = null;
  const held = new Set([lesson.sound, ...lesson.review]);
  const body = h('div', { class: 'sounds-body' });
  const el = h('div', { class: 'sounds-task' }, body);
  const cur = () => list[i];
  const partsFor = () => {
    const w = cur();
    if (w.showLetters) return [...[...w.word].filter(hasGlyph).map((c) => ({ clip: c })), { pause: 300 }, { tts: w.word }];
    return [{ tts: w.word }];
  };

  function show() {
    revealed = false;
    if (sweepAnim) sweepAnim.cancel();
    if (blend) blend.cleanup();
    blend = null;
    const w = cur();
    const stage = h('button', { class: 'sounds-stage', type: 'button', 'aria-label': 'Tap to show the word' });
    let sweep = null, art;
    if (w.showLetters) {
      art = wordSvg(w.word, { color: '#1E2140', label: 'the letters' });
      sweep = h('span', { class: 'sweep', 'aria-hidden': 'true' });
      const row = h('span', { class: 'glyph-row slidable' }, art, sweep);
      const bar = h('span', { class: 'blend-bar', 'aria-hidden': 'true' }, h('i'));
      stage.append(row, bar);
      // The sweep is only a demonstration: the first touch on the word hands over to the child's finger.
      blend = slideBlend({ row, svg: art, bar, host: stage, onFirstTouch: () => { if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; } sweep.style.opacity = '0'; } });
    } else {
      art = h('span', { class: 'emoji huge' }, w.emoji);
      stage.append(art);
    }
    const label = h('span', { class: 'reveal-word' }, letterText(w.word));
    const hint = h('span', { class: 'tap-hint', 'aria-hidden': 'true' }, icon('tap', 40));
    stage.append(hint, label);
    stage.addEventListener('click', () => {
      if (blend && blend.swallowClick()) return;
      if (revealed) { speech.say(partsFor()); return; }
      revealed = true;
      if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; }
      if (sweep) sweep.style.opacity = '0';
      stage.classList.add('revealed');
      animate(stage, [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      animate(label, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
      speech.say([{ tts: w.word }]);
    });
    const nextWord = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { i = (i + 1) % list.length; show(); speech.say(partsFor()); } }, 'Next word');
    body.replaceChildren(stage, nextWord);
    if (sweep && !reduced()) {
      // A soft highlight glides left to right over 2 s, pauses 600 ms, repeats (2.6 s loop, last 23% idle).
      sweepAnim = sweep.animate([
        { transform: 'translateX(-110%)', opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.06 },
        { opacity: 1, offset: 0.7 },
        { transform: 'translateX(310%)', opacity: 0, offset: 0.77 },
        { transform: 'translateX(310%)', opacity: 0, offset: 1 },
      ], { duration: 2600, iterations: Infinity, easing: 'linear', delay: 300 });
    }
    refresh();
  }
  show();
  return {
    el,
    parts: () => partsFor(),
    script: () => {
      const w = cur();
      const tap = 'Then tap the picture to show the word.';
      if (!w.showLetters) return `Say the word slowly, stretching the first sound: ${stretchWord(w.word, held)}. Then say it fast: ${w.word}. ${tap}`;
      return `Slide your finger under the word as you stretch the sounds: ${[...w.word].map((c) => stretchLetters(c)).join('')}. Then say it fast: ${w.word}. Then tap the word to show it.`;
    },
    again: () => { show(); speech.say(partsFor()); },
    cleanup: () => { if (sweepAnim) sweepAnim.cancel(); if (blend) blend.cleanup(); },
  };
}
