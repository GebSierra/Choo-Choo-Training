import { h, animate, reduced, icon } from '../../dom.js';
import { wordSvg, hasGlyph } from '../../glyphs.js';
import { letterText } from '../../letters.js';
import { slowSounds, firstSoundOut } from '../../scripts.js';
import { slideBlend, placeBand, startSweep, handCue } from '../../components/slide-blend.js';
import { picture } from '../../components/picture.js';
import { accentOf } from '../../theme.js';
import { fit } from '../../lessons.js';
import { soundOfLetter, letterUnits, startSound, wordPartsOf, endingSay } from '../../order.js';

// Task 5: stretch the sounds, then say the word. Words that show letters can be slid under with a finger; a picture word
// shows its letters, slidable in the same way, once the picture is tapped.
export function build({ lesson, curriculum, speech, refresh }) {
  const list = lesson.sayingSounds;
  let i = 0, revealed = false, sweepAnim = null, cue = null, cueStage = null, blend = null, bandWatch = null, bandEl = null;
  const sounds = curriculum.sounds;
  const body = h('div', { class: 'sounds-body' });
  const el = h('div', { class: 'sounds-task' }, body);
  const cur = () => list[i];
  const partsFor = () => {
    const w = cur();
    // Owner (2026-10-24): no letter-by-letter clips here; they played on their own and sounded like a wrong word. The grown-up says the
    // stretched word from the Say this bar; only a recording of the whole word plays, and only when the speaker is tapped.
    return [{ word: w.word }];
  };
  const stopSweep = () => { if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; } if (cue) { cue.stop(); cue = null; cueStage.classList.remove('cueing'); } };
  const teardown = () => { stopSweep(); if (blend) blend.cleanup(); if (bandWatch) bandWatch.stop(); if (bandEl) bandEl.remove(); blend = null; bandWatch = null; bandEl = null; };

  // The word as a slidable row of letters on the stage: the row, a progress bar, and a generous band to slide on.
  // perLetter: each letter lights in its own colour (m blue, a red, s green); otherwise all in the lesson's colour.
  function mountWord(stage, w, before, { perLetter, capped, cap = 96 }) {
    const art = wordSvg(w.word, { color: '#1E2140', label: w.word, all: true, level: lesson.number });
    if (capped) { art.style.maxWidth = `calc(var(--cap, ${cap}px) * ${Number(art.dataset.width) / Number(art.dataset.height)})`; art.style.margin = '0 auto'; }
    const sweep = h('span', { class: 'sweep', 'aria-hidden': 'true' });
    const row = h('span', { class: 'glyph-row' }, art, sweep);
    const bar = h('span', { class: 'blend-bar', 'aria-hidden': 'true' }, h('i'));
    const band = h('span', { class: 'slide-band', 'aria-hidden': 'true' });
    before.before(row, bar);
    stage.append(band); bandEl = band;
    blend = slideBlend({ band, svg: art, host: stage, lift: row, bar, accent: perLetter ? null : accentOf(lesson.sound), onTouch: stopSweep, onTap: () => tapStage(stage) });
    bandWatch = placeBand(band, stage, row);
    sweepAnim = startSweep(sweep);
    if (sweepAnim) { cue = handCue(stage, bar); cueStage = stage; stage.classList.add('cueing'); } // the slide cue; the static hand only means tap
    return row;
  }

  let tapStage = () => {};

  function show() {
    teardown();
    revealed = false;
    const w = cur();
    const stage = h('button', { class: 'sounds-stage', type: 'button', 'aria-label': 'Tap to show the word' });
    const hint = h('span', { class: 'tap-hint', 'aria-hidden': 'true' }, icon('tap', 40));
    let label = null;
    if (w.showLetters) {
      label = h('span', { class: 'reveal-word' }, letterText(w.word, { level: lesson.number }));
      stage.append(hint, label);
      mountWord(stage, w, hint, { perLetter: true, capped: true, cap: 120 });
    } else {
      stage.append(picture(w, 'huge'), hint);
    }
    const reveal = () => {
      revealed = true;
      stage.classList.add('revealed');
      animate(stage, [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      if (w.showLetters) { stopSweep(); animate(label, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260 }); }
      // A picture word with letters not taught yet (sayOnly) is only said: its letters are never shown to read.
      else if (!w.sayOnly) { const row = mountWord(stage, w, hint, { perLetter: false, capped: true }); animate(row, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260 }); }
      speech.say([{ word: w.word }]);
    };
    tapStage = () => { if (revealed) speech.say(partsFor()); else reveal(); };
    stage.addEventListener('click', () => { if (blend && blend.swallowClick()) return; tapStage(); });
    const nextWord = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { i = (i + 1) % list.length; show(); } }, 'Next word');
    body.replaceChildren(stage, nextWord);
    refresh();
  }
  show();
  return {
    el, lockScroll: true,
    parts: () => partsFor(),
    targetWords: () => [cur().word],
    script: () => {
      const w = cur();
      // A held sound is stretched ("sss"), a clipped one is short ("t-") and never stretched.
      // Only the very first Saying Sounds (lesson 1) is new to the child: I do, we do, you do. After that the child recalls first;
      // the grown-up steps in only after a failed try (together, then say it and have the child say it after).
      const first = lesson.number === 1, held = sounds[startSound(w.word)] && sounds[startSound(w.word)].hold === false ? 'with a short first sound' : 'stretching the first sound';
      const help = 'If they are stuck, sound it out together. Still stuck? Say it yourself, then have your child say it after you.';
      // World 6: a word with an ending, or a compound or two-beat word. The child finds the base word and the ending (or the two chunks), then glues them.
      const part = w.showLetters ? wordPartsOf(w.word) : null;
      if (part && lesson.part) {
        const ending = part.parts.length === 2 && part.key.startsWith('end-');
        const how = ending ? `Find the base word first (${part.parts[0]}), then the ending car (${endingSay(w.word)}).` : `Clap the beats (${part.parts.join('-')}), then read each chunk.`;
        return `Let your child try first. Your child slides a finger under the word and says it. ${how} Tap the word to show it. ${help} (Smooth and joined: ${slowSounds(w.word, sounds)}. Then fast: ${w.word}.)`;
      }
      if (w.sayOnly) return `Let your child say the word first. Tap the picture to hear it. If they are stuck, say it together. Still stuck? Say it yourself, then have your child say it after you. (Slowly, ${held}: ${firstSoundOut(w.word, sounds)}. Then fast: ${w.word}.)`;
      if (!w.showLetters) return first
        ? `I do: say the word slowly, ${held}: ${firstSoundOut(w.word, sounds)}. Then say it fast: ${w.word}. We do: tap the picture. Slide a finger under the word and say it together, slowly. You do: your child slides and says the word. ${help}`
        : `Let your child try first. Tap the picture to show the word. Your child slides a finger under it and says it. ${help} (Slowly, ${held}: ${firstSoundOut(w.word, sounds)}. Then fast: ${w.word}.)`;
      return first
        ? `I do: slide your finger under the word and say it smooth and joined: ${slowSounds(w.word, sounds)}. Then say it fast: ${w.word}. We do: slide together and say it together. You do: your child slides and says the word. Tap the word to show it. ${help}`
        : `Let your child try first: your child slides a finger under the word and says it. Tap the word to show it. ${help} (Smooth and joined: ${slowSounds(w.word, sounds)}. Then fast: ${w.word}.)`;
    },
    gist: () => {
      const w = cur(), part = w.showLetters && lesson.part ? wordPartsOf(w.word) : null;
      if (part) return part.parts.length === 2 && part.key.startsWith('end-') ? fit(`${part.parts[0]} + ${endingSay(w.word)} = ${w.word}`, `${w.word}: ${part.parts[0]} + ${endingSay(w.word)}`, w.word) : fit(`${part.parts.join('-')}, then ${w.word}.`, `${part.parts.join('-')} = ${w.word}`, w.word);
      const stretched = w.showLetters ? slowSounds(w.word, sounds) : firstSoundOut(w.word, sounds);
      return `${stretched}, then ${w.word}.`;
    },
    again: () => { show(); },
    cleanup: teardown,
  };
}
