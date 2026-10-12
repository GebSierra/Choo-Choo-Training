import { h, animate, reduced } from '../../dom.js';
import { wordSvg } from '../../glyphs.js';
import { slideBlend, placeBand, startSweep, handCue } from '../../components/slide-blend.js';
import { slowSounds } from '../../scripts.js';
import { confetti } from '../finish.js';

// The first Review Stop's reading moment (owner): the child reads "ma", then "mama". Each word is big, with the slide-to-blend under it
// (the same slide as Saying Sounds); the grown-up taps "Read it!" when the child has read it. After "mama" a gentle celebration (confetti
// from the finish screen, CSS only) and a warm line for the grown-up. The app judges nothing.
export function build({ checkpoint, step, curriculum, speech, refresh, setDone }) {
  const words = (step && step.words) || ['ma', 'mama'];
  const sounds = curriculum.sounds;
  let i = 0, blend = null, bandWatch = null, bandEl = null, sweepAnim = null, cue = null, cueStage = null, celebrated = false;
  const body = h('div', { class: 'sounds-body first-word-body' });
  const el = h('div', { class: 'sounds-task first-word' }, body);
  const stopSweep = () => { if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; } if (cue) { cue.stop(); cue = null; cueStage.classList.remove('cueing'); } };
  const teardown = () => { stopSweep(); if (blend) blend.cleanup(); if (bandWatch) bandWatch.stop(); if (bandEl) bandEl.remove(); blend = bandWatch = bandEl = null; };
  const partsFor = () => [{ tts: words[i] }];

  function show() {
    teardown();
    const word = words[i];
    const stage = h('div', { class: 'sounds-stage first-word-stage', dataset: { word } });
    const art = wordSvg(word, { color: '#1E2140', label: word, all: true });
    art.style.maxWidth = `calc(var(--cap, 120px) * ${Number(art.dataset.width) / Number(art.dataset.height)})`; art.style.margin = '0 auto';
    const sweep = h('span', { class: 'sweep', 'aria-hidden': 'true' });
    const row = h('span', { class: 'glyph-row' }, art, sweep);
    const bar = h('span', { class: 'blend-bar', 'aria-hidden': 'true' }, h('i'));
    const band = h('span', { class: 'slide-band', 'aria-hidden': 'true' });
    stage.append(row, bar, band); bandEl = band;
    const say = h('button', { class: 'btn ghost small', type: 'button', onclick: () => speech.say(partsFor()) }, 'Hear it');
    const readIt = h('button', { class: 'btn primary big read-it', type: 'button', onclick: () => {
      if (i < words.length - 1) { i++; show(); return; }
      celebrate(stage, readIt, say);
    } }, 'Read it!');
    body.replaceChildren(stage, readIt);
    blend = slideBlend({ band, svg: art, host: stage, lift: row, bar, accent: null, onTouch: stopSweep, onTap: () => {} });
    bandWatch = placeBand(band, stage, row);
    sweepAnim = startSweep(sweep);
    if (sweepAnim) { cue = handCue(stage, bar); cueStage = stage; stage.classList.add('cueing'); }
    refresh();
  }

  function celebrate(stage, readIt) {
    if (celebrated) return;
    celebrated = true; teardown();
    readIt.disabled = true;
    const burst = h('span', { class: 'first-word-confetti', style: { '--sc': '1' }, 'aria-hidden': 'true' }, confetti());
    const msg = h('p', { class: 'first-word-msg', role: 'status' }, `Your child just read their first word: ${words[words.length - 1]}!`);
    stage.append(burst);
    body.append(msg);
    stage.classList.add('celebrating');
    if (!reduced()) animate(msg, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'ease-out' });
    speech.autoSay([{ tts: `You read ${words[words.length - 1]}!` }]);
    if (setDone) setDone();
    refresh();
  }
  show();
  return {
    el, lockScroll: true,
    parts: () => partsFor(),
    script: () => `Let your child try first: your child slides a finger under the word and says it. Then tap Read it! If they are stuck, sound it out together. Still stuck? Say it yourself, then have your child say it after you. (Smooth and joined: ${slowSounds(words[i], sounds)}.)`,
    gist: () => 'Slide, say it, tap Read it!',
    again: () => { celebrated = false; i = 0; show(); },
    cleanup: teardown,
  };
}
