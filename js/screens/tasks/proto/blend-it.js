import { h, reduced } from '../../../dom.js';
import { wordSvg } from '../../../glyphs.js';
import { accentOf } from '../../../theme.js';
import { slideBlend, placeBand, startSweep, handCue } from '../../../components/slide-blend.js';
import { sayPrompt, sayBlend } from '../../../components/say-sound.js';
import { timers } from '../../../components/game-kit.js';
import { INK, hearBtn, fadeIn, modelOnEntry, modelParts } from './kit.js';

const LIGHT_MS = 700; // each letter lights for this long under the sliding marker

// Step 4, Blend It: "demonstrate, then imitate" (CURRICULUM.md section 4). For each new word:
//   I do   the blend model plays (the recording, or the prompt "Say: fffiiit-") while each letter lights in turn under a
//          sliding marker; the child watches and listens
//   We do  the grown-up and child slide a finger along the word together and say it together; "Again together" plays the
//          model once more. You do is step 5 (Read It).
// setDone(true) once the last word has been slid.
export function build(env) {
  const { data, fill, speech, setDone, refresh } = env;
  const S = data.blend;
  const T = timers();
  const prompt = sayPrompt();
  let i = 0, mode = 'ido', gen = 0, slid = false, first = true, blend = null, bandWatch = null, bandEl = null, cue = null, sweepAnim = null;
  const body = h('div', { class: 'bi-body' });
  const el = h('div', { class: 'proto blendit', dataset: { mode: 'ido', word: S.words[0], slid: '0', state: 'playing' } }, body);
  const word = () => S.words[i];
  const stale = (g) => () => g !== gen;

  const stopDemo = () => { if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; } if (cue) { cue.stop(); cue = null; } };
  const teardown = () => { stopDemo(); if (blend) blend.cleanup(); if (bandWatch) bandWatch.stop(); if (bandEl) bandEl.remove(); blend = null; bandWatch = null; bandEl = null; T.clear(); };

  function show() {
    teardown();
    const w = word(), g = ++gen;
    slid = false; mode = 'ido';
    Object.assign(el.dataset, { mode, word: w, slid: '0', state: 'playing' });
    const chip = h('p', { class: 'px-chip bi-mode' }, 'I do');
    const hear = hearBtn('Hear it again', () => { if (mode === 'ido') demo(g); else sayBlend(env, w, prompt, { stale: stale(g) }); }, { compact: true });
    const model = h('div', { class: 'px-model' }, prompt.el, hear);
    prompt.hide();
    const art = wordSvg(w, { color: INK, all: true, label: w });
    art.style.width = `calc(var(--cap, 96px) * ${Number(art.dataset.width) / Number(art.dataset.height)})`;
    art.style.maxWidth = '100%';
    const sweep = h('span', { class: 'sweep', 'aria-hidden': 'true' });
    const row = h('span', { class: 'glyph-row bi-row' }, art, sweep);
    const bar = h('span', { class: 'blend-bar', 'aria-hidden': 'true' }, h('i'));
    const board = h('div', { class: 'bi-board' }, row, bar);
    const slot = h('div', { class: 'bi-next' });
    body.replaceChildren(chip, model, board, slot);
    fadeIn(board);
    const letters = [...art.querySelectorAll('.glyph-letter')];
    letters.forEach((l) => l.style.setProperty('--accent', accentOf(l.dataset.letter.toLowerCase())));
    const fillBar = bar.firstChild;

    // I do: the model plays and the letters light one by one under a marker that slides along the bar.
    function demo(g0) {
      if (g0 !== gen) return;
      letters.forEach((l) => l.classList.remove('lit', 'current'));
      fillBar.style.transition = 'none'; fillBar.style.transform = 'scaleX(0)';
      void fillBar.offsetWidth;
      const total = letters.length * LIGHT_MS;
      if (!reduced()) { fillBar.style.transition = `transform ${total}ms linear`; fillBar.style.transform = 'scaleX(1)'; } else fillBar.style.transform = 'scaleX(1)';
      letters.forEach((l, k) => T.later(() => {
        if (g0 !== gen || mode !== 'ido') return;
        letters.forEach((x, n) => x.classList.toggle('current', n === k));
        l.classList.add('lit');
      }, k * LIGHT_MS));
      T.later(() => {
        if (g0 !== gen || mode !== 'ido') return;
        letters.forEach((x) => x.classList.remove('current'));
        if (!slot.firstChild) { slot.append(h('button', { class: 'btn small px-next', type: 'button', onclick: () => weDo(g0) }, 'Now we do it')); fadeIn(slot); }
      }, total + 200);
    }

    // We do: both slide along the word and say it together.
    function weDo(g0) {
      if (g0 !== gen) return;
      mode = 'wedo'; el.dataset.mode = 'wedo';
      chip.textContent = 'We do';
      slot.replaceChildren();
      letters.forEach((l) => l.classList.remove('lit', 'current'));
      fillBar.style.transition = ''; fillBar.style.transform = 'scaleX(0)';
      const band = h('span', { class: 'slide-band', 'aria-hidden': 'true' });
      board.append(band); bandEl = band;
      blend = slideBlend({ band, svg: art, host: board, lift: row, bar, accent: null, onTouch: stopDemo, onProgress: (p) => { if (p >= 1 && !slid) { slid = true; slidDone(g0); } } });
      bandWatch = placeBand(band, board, row);
      T.later(() => { if (g0 === gen && bandWatch) bandWatch.place(); }, 450);
      sweepAnim = startSweep(sweep);
      if (sweepAnim) cue = handCue(board, bar);
      slot.append(h('button', { class: 'btn small ghost px-again', type: 'button', onclick: () => { stopDemo(); sweepAnim = startSweep(sweep); if (sweepAnim) cue = handCue(board, bar); sayBlend(env, w, prompt, { stale: stale(g0) }); } }, 'Again together'));
      fadeIn(slot);
      refresh();
    }

    function slidDone(g0) {
      if (g0 !== gen) return;
      el.dataset.slid = '1';
      T.later(() => {
        if (g0 !== gen) return;
        speech.say([{ tts: w }]);
        if (i < S.words.length - 1) slot.append(h('button', { class: 'btn small px-next', type: 'button', onclick: () => { i++; show(); } }, 'Next word'));
        else { el.dataset.state = 'done'; setDone(true); }
        fadeIn(slot);
      }, reduced() ? 100 : 900);
    }

    // The first model plays through the shell's auto-speak (parts below); later words play it here.
    if (first) { first = false; modelOnEntry(env, w, prompt, T, stale(g)); } else sayBlend(env, w, prompt, { stale: stale(g) });
    T.later(() => demo(g), 450);
    refresh();
  }

  show();
  return {
    el, lockScroll: true,
    parts: () => (mode === 'ido' ? modelParts(env, word(), 'Watch and listen.') : [{ tts: 'Slide your finger along the letters and say it together.' }]),
    script: () => fill(S.scripts[mode], word()),
    gist: () => fill(S.scripts[mode + 'Gist'], word()),
    again: () => { i = 0; show(); },
    cleanup: () => { teardown(); gen++; },
  };
}
