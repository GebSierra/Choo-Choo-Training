import { h, animate, reduced } from '../../../dom.js';
import { wordSvg } from '../../../glyphs.js';
import { slideBlend, placeBand, startSweep, handCue } from '../../../components/slide-blend.js';
import { sayPrompt, sayBlend } from '../../../components/say-sound.js';
import { centeredFace } from '../../../components/letter-face.js';
import { sparkle } from '../../../components/sparkle.js';
import { timers } from '../../../components/game-kit.js';
import { spreadWord } from '../../../art/proto-art.js';
import { sfx } from '../../../sfx.js';
import { INK, wordPicture, hearBtn, fadeIn, pop, modelOnEntry, modelParts } from './kit.js';

const GAP = 34;

// Step 1, Sound Warm-up. Round A, blend: the letters of a word stand apart on tiles; the blend model plays (the grown-up's
// recording, or the prompt "Say: sssaaat-"); the child slides a finger along under them while saying it, and the tiles glide
// together into the word, with its picture. Round B, break it: a picture and three empty boxes; the grown-up says the word
// slowly, and each box the child taps shows the next letter.
export function build(env) {
  const { data, fill, speech, setDone, refresh } = env;
  const S = data.warmup;
  const T = timers();
  const prompt = sayPrompt();
  let round = 'a', i = 0, gen = 0, finished = false, blend = null, bandWatch = null, bandEl = null, cue = null, sweepAnim = null, first = true;
  const body = h('div', { class: 'wu-body' });
  const el = h('div', { class: 'proto warmup', dataset: { round: 'a', word: S.blend[0], state: 'playing' } }, body);
  const list = () => (round === 'a' ? S.blend : S.break);
  const word = () => list()[i];
  const stale = (g) => () => g !== gen;

  const stopDemo = () => { if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; } if (cue) { cue.stop(); cue = null; } };
  const teardown = () => { stopDemo(); if (blend) blend.cleanup(); if (bandWatch) bandWatch.stop(); if (bandEl) bandEl.remove(); blend = null; bandWatch = null; bandEl = null; T.clear(); };
  const mark = (state) => { el.dataset.state = state; };

  function nextButton(label, fn) {
    const b = h('button', { class: 'btn small px-next', type: 'button', onclick: fn }, label);
    fadeIn(b);
    return b;
  }

  // ---- round A ----
  function showA() {
    teardown();
    finished = false; mark('playing');
    const w = word(), g = ++gen;
    el.dataset.round = 'a'; el.dataset.word = w;
    const chip = h('p', { class: 'px-chip' }, 'Blend it');
    const model = h('div', { class: 'px-model' }, prompt.el, hearBtn('Hear it', () => sayBlend(env, w, prompt, { stale: stale(g) }), { compact: true }));
    prompt.hide();
    const svg = spreadWord(wordSvg(w, { color: INK, all: true, label: w }), GAP, { tiles: true, pad: 10 });
    svg.style.width = `calc(var(--wcap, 110px) * ${Number(svg.dataset.width) / Number(svg.dataset.height)})`; // the word never grows taller than --wcap
    svg.style.maxWidth = '100%';
    const sweep = h('span', { class: 'sweep', 'aria-hidden': 'true' });
    const row = h('span', { class: 'glyph-row wu-row' }, svg, sweep);
    const bar = h('span', { class: 'blend-bar', 'aria-hidden': 'true' }, h('i'));
    const board = h('div', { class: 'wu-board' }, row, bar);
    const pic = h('div', { class: 'wu-pic' }, h('span', { class: 'wu-q', 'aria-hidden': 'true' }, '?'));
    const slot = h('div', { class: 'wu-next' });
    body.replaceChildren(chip, model, board, pic, slot);
    fadeIn(board);

    const band = h('span', { class: 'slide-band', 'aria-hidden': 'true' });
    board.append(band); bandEl = band;
    blend = slideBlend({ band, svg, host: board, lift: row, bar, accent: null, onTouch: stopDemo, onProgress: (p) => { if (p >= 1 && !finished) done(g); } });
    bandWatch = placeBand(band, board, row);
    T.later(() => { if (g === gen && bandWatch) bandWatch.place(); }, 450); // measured again once the screen has slid in (a moving screen skews the first measure)
    sweepAnim = startSweep(sweep);
    if (sweepAnim) cue = handCue(board, bar);

    // The recording plays through the shell's auto-speak (parts below); with none, the prompt shows now.
    if (first) { first = false; modelOnEntry(env, w, prompt, T, stale(g)); } else sayBlend(env, w, prompt, { stale: stale(g) });

    function done(g0) {
      if (g0 !== gen) return;
      finished = true; mark('blended');
      T.later(() => {
        if (g0 !== gen) return;
        // the tiles glide together into the word and the picture appears
        const groups = [...svg.querySelectorAll('.glyph-letter')], n = groups.length;
        groups.forEach((gr, k) => {
          const tx = Number(gr.dataset.tx), ty = gr.getAttribute('transform').split(' ')[1].replace(')', '');
          const dx = ((n - 1) / 2 - k) * GAP;
          animate(gr, [{ transform: `translate(${tx}px, ${ty}px)` }, { transform: `translate(${tx + dx}px, ${ty}px)` }], { duration: 560, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
          const bg = gr.querySelector('.tile-bg');
          if (bg) animate(bg, [{ opacity: 1 }, { opacity: 0 }], { duration: 360, fill: 'forwards' });
        });
        pic.replaceChildren(wordPicture(data, w, 'huge'));
        pop(pic.firstChild);
        speech.say([{ tts: w }]);
        if (band.isConnected) band.remove();
        slot.append(i < S.blend.length - 1
          ? nextButton('Next word', () => { i++; showA(); refresh(); })
          : nextButton('Now break words apart', () => { round = 'b'; i = 0; showB(); refresh(); }));
      }, reduced() ? 100 : 800);
    }
    refresh();
  }

  // ---- round B ----
  function showB() {
    teardown();
    finished = false; mark('playing');
    const w = word(), g = ++gen;
    el.dataset.round = 'b'; el.dataset.word = w;
    const chip = h('p', { class: 'px-chip' }, 'Break it apart');
    const pic = h('div', { class: 'wu-pic big' }, wordPicture(data, w, 'huge'));
    let shown = 0;
    const boxes = [...w].map((ch, k) => h('button', { class: 'wu-box', type: 'button', 'aria-label': `box ${k + 1}`, dataset: { i: String(k) }, onclick: () => tap() }));
    const row = h('div', { class: 'wu-boxes' }, ...boxes);
    const hint = h('p', { class: 'wu-hint' }, 'Tap a box for each sound.');
    const slot = h('div', { class: 'wu-next' });
    body.replaceChildren(chip, pic, row, hint, slot);
    fadeIn(row);
    function tap() {
      if (g !== gen || shown >= w.length) return;
      const k = shown++, box = boxes[k];
      box.append(centeredFace(w[k], INK));
      box.classList.add('filled');
      pop(box.firstChild, 320);
      sfx.play('pop', { step: k });
      el.dataset.shown = String(shown);
      if (shown < w.length) return;
      finished = true; mark('broken');
      hint.hidden = true;
      const r = row.getBoundingClientRect(), o = el.getBoundingClientRect();
      sparkle(el, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 10, size: [10, 20], reach: [34, 70], sound: 'sparkle' });
      T.later(() => {
        if (g !== gen) return;
        speech.say([{ tts: w }]);
        if (i < S.break.length - 1) slot.append(nextButton('Next word', () => { i++; showB(); refresh(); }));
        else { mark('done'); setDone(true); }
      }, 500);
    }
    refresh();
  }

  showA();
  return {
    el, lockScroll: true,
    parts: () => (round === 'a' ? modelParts(env, word(), 'Slide your finger along the letters, and say the word.') : [{ tts: 'Tap a box for each sound.' }]),
    script: () => fill(round === 'a' ? S.scripts.a : S.scripts.b, word()),
    gist: () => fill(round === 'a' ? S.scripts.aGist : S.scripts.bGist, word()),
    again: () => { round = 'a'; i = 0; showA(); },
    cleanup: () => { teardown(); gen++; },
  };
}
