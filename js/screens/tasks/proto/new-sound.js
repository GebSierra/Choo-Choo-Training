import { h, animate, reduced, icon } from '../../../dom.js';
import { glyphSvg, drawIn } from '../../../glyphs.js';
import { centerGlyph } from '../../../components/letter-face.js';
import { accentOf } from '../../../theme.js';
import { sayPrompt, saySound, sayLine, clipReady } from '../../../components/say-sound.js';
import { tracePad } from '../../../components/trace-pad.js';
import { sparkle } from '../../../components/sparkle.js';
import { timers } from '../../../components/game-kit.js';
import { sfx } from '../../../sfx.js';
import { flowerF, mouthSvg, fBox } from '../../../art/proto-art.js';
import { hearBtn, fadeIn, pop, dotRow } from './kit.js';

const PHASES = ['meet', 'mouth', 'say', 'trace'];
const BREATH = ', a long breath through your teeth';
const MORPH_MS = 2800; // the flower holds this long, then becomes the plain f

// Step 3, New Sound: f. One new idea, in four screens (the shell's Next moves through them):
//   meet   the letter f drawn as a flower (the stem, two leaves and a drooping flower head) that fades to the plain f, with
//          the word "flower" for the grown-up; Hear it plays the f recording, or shows "Say: fff, a long breath through your teeth"
//   mouth  a friendly mouth saying f, top teeth on the bottom lip and air flowing out, with the grown-up's line
//   say    the child says it three times; the grown-up fills three dots
//   trace  Track Tracing for f, with the stroke arrows and numbered starts
// The phone's voice says only "flower" and instructions; the sound is the recording or the prompt.
export function build(env) {
  const { data, fill, speech, curriculum, setDone, refresh } = env;
  const S = data.newsound, key = data.sound, accent = accentOf(key);
  const T = timers();
  const sounds = curriculum.sounds;
  let phase = 'meet', gen = 0, pad = null, strokes = 0, said = 0;
  const host = h('div', { class: 'ns-host' });
  const el = h('div', { class: 'proto newsound', dataset: { phase: 'meet' } }, host);
  const dots = dotRow(PHASES.length);

  const stale = (g) => () => g !== gen;
  const hearIt = (prompt, g) => saySound(env, key, prompt, { extra: BREATH, stale: stale(g) });

  function show() {
    const g = ++gen;
    T.clear();
    if (pad && pad.cleanup) pad.cleanup();
    pad = null;
    el.dataset.phase = phase;
    dots.set(PHASES.indexOf(phase));
    const prompt = sayPrompt();
    const model = (btn) => h('div', { class: 'px-model' }, prompt.el, btn);
    let content;

    if (phase === 'meet') {
      const flower = flowerF();
      const plain = glyphSvg(key, { color: accent, label: 'the plain letter' });
      plain.setAttribute('viewBox', fBox());
      const art = h('div', { class: 'ns-art' }, h('span', { class: 'ns-layer flower' }, flower), h('span', { class: 'ns-layer plain' }, plain));
      const toggle = h('button', { class: 'btn small ghost ns-toggle', type: 'button' });
      let morphed = false;
      const setMorph = (on, animateIt = true) => {
        morphed = on;
        art.classList.toggle('morphed', on);
        toggle.textContent = on ? 'Show the flower' : 'Show the letter';
        el.dataset.morphed = on ? '1' : '0';
        if (on && animateIt) drawIn(plain, { per: 380 });
      };
      toggle.addEventListener('click', () => { T.clear(); setMorph(!morphed); });
      setMorph(false);
      // the flower holds for a moment and then fades to the plain f (not with reduced motion: the button shows it)
      if (!reduced()) T.later(() => { if (g === gen && !morphed) setMorph(true); }, MORPH_MS);
      // "flower" is the picture word, so it is plain text (the lesson's reading is later); only its f is picked out
      const word = h('p', { class: 'ns-word' }, 'f is for ', h('span', { class: 'ns-f', style: { color: accent } }, 'f'), S.word.slice(1));
      content = [h('div', { class: 'ns-card' }, art, word), prompt.el, h('div', { class: 'px-btns' }, hearBtn('Hear it', () => hearIt(prompt, g), { compact: true }), toggle)];
      // with no recording to play, the prompt is shown at once
      if (!clipReady(env, key)) prompt.show(sayLine(key, sounds) + BREATH, key);
      else T.later(() => { if (g === gen && speech.missing.includes(key)) prompt.show(sayLine(key, sounds) + BREATH, key); }, 1600); // the shell's auto-speak tried the recording and it is missing
    } else if (phase === 'mouth') {
      const mouth = mouthSvg();
      const card = h('button', { class: 'ns-mouth', type: 'button', 'aria-label': 'Watch the air again', onclick: () => { mouth.classList.remove('go'); void mouth.getBoundingClientRect(); mouth.classList.add('go'); } }, mouth);
      const line = h('p', { class: 'ns-line' }, fill(S.mouthLine));
      content = [card, line, model(hearBtn('Hear it', () => hearIt(prompt, g)))];
    } else if (phase === 'say') {
      const dotEls = [0, 1, 2].map((k) => h('button', { class: 'ns-dot', type: 'button', 'aria-label': `said it, number ${k + 1}`, onclick: () => tapDot() }));
      const row = h('div', { class: 'ns-dots' }, ...dotEls);
      const msg = h('p', { class: 'ns-line' }, 'Your child says it. You tap a dot each time.');
      const big = h('span', { class: 'ns-bigf' }, centerGlyph(glyphSvg(key, { color: accent, label: 'the letter' }), key));
      content = [big, row, msg, model(hearBtn('Hear it', () => hearIt(prompt, g)))];
      said = 0; el.dataset.said = '0';
      function tapDot() {
        if (g !== gen || said >= 3) return;
        const d = dotEls[said++];
        d.classList.add('on'); d.append(icon('check', 30));
        pop(d, 300); sfx.play('pop', { step: said - 1 });
        el.dataset.said = String(said);
        if (said < 3) return;
        msg.textContent = 'Three times. Well done!';
        const r = row.getBoundingClientRect(), o = el.getBoundingClientRect();
        sparkle(el, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 12, size: [10, 22], reach: [40, 84], sound: 'star' });
      }
    } else {
      pad = tracePad({ letter: key, onStroke: () => { strokes++; el.dataset.strokes = String(strokes); /* never setDone here: no auto-advance, so a grown-up can draw first while the child watches */ } });
      strokes = 0; el.dataset.strokes = '0';
      const showBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: async () => { showBtn.disabled = true; await pad.showMe(); showBtn.disabled = false; } }, icon('play', 20), 'Show me');
      const clearBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { pad.clear(); strokes = 0; el.dataset.strokes = '0'; } }, icon('eraser', 20), 'Clear');
      content = [pad, h('div', { class: 'writing-buttons' }, clearBtn, showBtn)];
    }
    host.replaceChildren(dots.el, h('div', { class: 'ns-body nsp-' + phase }, ...content));
    fadeIn(host.lastChild);
    refresh();
  }

  show();
  return {
    el,
    parts: () => (phase === 'meet' ? [{ clip: key }, { tts: S.word }]
      : phase === 'mouth' ? [{ tts: 'Top teeth on your bottom lip, and blow.' }, { clip: key }]
        : phase === 'say' ? [{ tts: 'Say it three times.' }] : [{ tts: 'Start at the dot. Follow the arrow.' }]),
    script: () => fill(S.scripts[phase], ''),
    gist: () => fill(S.scripts[phase + 'Gist'], ''),
    again: () => { show(); },
    // Next goes through the four screens first
    next: () => { const i = PHASES.indexOf(phase); if (i < PHASES.length - 1) { phase = PHASES[i + 1]; show(); return true; } return false; },
    cleanup: () => { gen++; T.clear(); if (pad && pad.cleanup) pad.cleanup(); },
  };
}
