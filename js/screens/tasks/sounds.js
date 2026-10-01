import { h, animate, reduced, icon } from '../../dom.js';
import { wordSvg, hasGlyph } from '../../glyphs.js';
import { letterText } from '../../letters.js';
import { slowSounds, firstSoundOut } from '../../scripts.js';
import { slideBlend, placeBand, startSweep, handCue } from '../../components/slide-blend.js';
import { picture } from '../../components/picture.js';
import { accentOf } from '../../theme.js';
import { fit } from '../../lessons.js';

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
    if (w.showLetters) return [...[...w.word].filter(hasGlyph).map((c) => ({ clip: c })), { pause: 300 }, { tts: w.word }];
    return [{ tts: w.word }];
  };
  const stopSweep = () => { if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; } if (cue) { cue.stop(); cue = null; cueStage.classList.remove('cueing'); } };
  const teardown = () => { stopSweep(); if (blend) blend.cleanup(); if (bandWatch) bandWatch.stop(); if (bandEl) bandEl.remove(); blend = null; bandWatch = null; bandEl = null; };

  // The word as a slidable row of letters on the stage: the row, a progress bar, and a generous band to slide on.
  // perLetter: each letter lights in its own colour (m blue, a red, s green); otherwise all in the lesson's colour.
  function mountWord(stage, w, before, { perLetter, capped, cap = 96 }) {
    const art = wordSvg(w.word, { color: '#1E2140', label: w.word, all: true });
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
      label = h('span', { class: 'reveal-word' }, letterText(w.word));
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
      else { const row = mountWord(stage, w, hint, { perLetter: false, capped: true }); animate(row, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260 }); }
      speech.say([{ tts: w.word }]);
    };
    tapStage = () => { if (revealed) speech.say(partsFor()); else reveal(); };
    stage.addEventListener('click', () => { if (blend && blend.swallowClick()) return; tapStage(); });
    const nextWord = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { i = (i + 1) % list.length; show(); speech.say(partsFor()); } }, 'Next word');
    body.replaceChildren(stage, nextWord);
    refresh();
  }
  show();
  return {
    el, lockScroll: true,
    parts: () => partsFor(),
    script: () => {
      const w = cur();
      // A held sound is stretched ("sss"), a clipped one is short ("t-") and never stretched.
      if (!w.showLetters) return `Say the word slowly, ${sounds[w.word[0]] && sounds[w.word[0]].hold === false ? 'with a short first sound' : 'stretching the first sound'}: ${firstSoundOut(w.word, sounds)}. Then say it fast: ${w.word}. Then tap the picture to show the word, and slide your finger across the word as you say it slowly.`;
      return `Slide your finger under the word as you say the sounds: ${slowSounds(w.word, sounds)}. Then say it fast: ${w.word}. Then tap the word to show it.`;
    },
    gist: () => {
      const w = cur(), stretched = w.showLetters ? slowSounds(w.word, sounds) : firstSoundOut(w.word, sounds);
      return fit(`Stretch: ${stretched}, then ${w.word}.`, `${stretched}, then ${w.word}.`);
    },
    again: () => { show(); speech.say(partsFor()); },
    cleanup: teardown,
  };
}
