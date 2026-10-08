import { h, animate, reduced, icon } from '../../../dom.js';
import { glyphSvg } from '../../../glyphs.js';
import { centerGlyph } from '../../../components/letter-face.js';
import { accentOf } from '../../../theme.js';
import { sayPrompt, saySound } from '../../../components/say-sound.js';
import { judgeBar } from '../../../components/judge-bar.js';
import { readingItem } from '../../../components/reading-item.js';
import { sparkle } from '../../../components/sparkle.js';
import { timers } from '../../../components/game-kit.js';
import { build as buildWagons } from '../wagons.js';
import { hearBtn, fadeIn, dotRow } from './kit.js';

const HEAR_MS = 2500; // the answer button comes only after the child has had time to try

// Step 2, Quick Review: retrieval practice. Four letter cards (p, t, i, then the older m): "Say it!", the child says the
// sound FIRST, and only then does "Hear it" appear (the recording, or the prompt "Say: p-"). The grown-up taps Got it or
// Help; Help plays the sound, the child says it again, and the card comes back once at the end. Then two review words to
// read (the judge bar and the correction script), then a short Wagon Parade for p whose find card says "Say it, then find it!".
export function build(env) {
  const { data, fill, speech, curriculum, setDone, refresh } = env;
  const S = data.recall;
  const T = timers();
  let phase = 'letters', gen = 0, pos = 0, wpos = 0, wagons = null;
  const lq = [...S.letters], lReturned = new Set(), wq = [...S.words], wReturned = new Set();
  const host = h('div', { class: 'rc-host' });
  const el = h('div', { class: 'proto recall', dataset: { phase: 'letters', pos: '0' } }, host);
  const dots = dotRow(S.letters.length);

  const setPhase = (p) => { phase = p; el.dataset.phase = p; };

  // ---- letters ----
  function showLetter() {
    const g = ++gen, key = lq[pos], back = pos >= S.letters.length;
    el.dataset.pos = String(pos); el.dataset.key = key;
    const prompt = sayPrompt();
    const hear = hearBtn('Hear it', () => saySound(env, key, prompt, { stale: () => g !== gen }));
    hear.hidden = true;
    const panel = h('div', { class: 'ri-panel', hidden: true, role: 'status' });
    const judge = judgeBar({ onGot: () => got(), onHelp: () => help() });
    const card = h('div', { class: 'rc-card' + (back ? ' back' : ''), dataset: { letter: key } },
      h('p', { class: 'rc-say' }, back ? 'Once more!' : 'Say it!'),
      h('span', { class: 'rc-glyph' }, centerGlyph(glyphSvg(key, { color: accentOf(key), label: 'the letter to say' }), key)));
    host.replaceChildren(h('div', { class: 'rc-pad' }, dots.el, card, h('div', { class: 'px-model' }, prompt.el, hear), panel, judge.el));
    dots.set(Math.min(pos, S.letters.length - 1));
    fadeIn(card);
    // Retrieval first: the answer is offered only after a moment to try, or after Help.
    T.later(() => { if (g === gen) { hear.hidden = false; fadeIn(hear, 200); } }, HEAR_MS);

    function got() {
      if (g !== gen) return;
      gen++; judge.hide();
      const r = card.getBoundingClientRect(), o = el.getBoundingClientRect();
      sparkle(el, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 8, size: [10, 18], reach: [30, 60] });
      T.later(nextLetter, reduced() ? 0 : 420);
    }
    function help() {
      if (g !== gen) return;
      judge.hide(); hear.hidden = false;
      const send = h('button', { class: 'btn small ghost go', type: 'button', onclick: () => {
        if (g !== gen) return;
        gen++;
        if (!back && !lReturned.has(key)) { lq.push(key); lReturned.add(key); }
        nextLetter();
      } }, 'Said it again');
      panel.hidden = false;
      panel.replaceChildren(h('p', { class: 'ri-text' }, 'Listen. Say it together. Then your child says it alone. This card comes back once at the end.'), h('div', { class: 'ri-btns' }, send));
      fadeIn(panel, 220);
      saySound(env, key, prompt, { stale: () => g !== gen });
    }
  }
  function nextLetter() {
    pos++;
    if (pos < lq.length) { showLetter(); refresh(); return; }
    showWords(); refresh();
  }

  // ---- words ----
  let item = null;
  function showWords() {
    setPhase('words'); gen++;
    T.clear();
    if (!item) item = readingItem(env, { kind: 'word', onGot: nextWord, onHelped: (t) => { if (!wReturned.has(t)) { wq.push(t); wReturned.add(t); } nextWord(); } });
    wordDots = dotRow(S.words.length);
    host.replaceChildren(h('div', { class: 'rc-pad' }, wordDots.el, h('p', { class: 'px-chip' }, 'Read it together'), item.el));
    showWord();
  }
  let wordDots = null;
  function showWord() {
    item.show(wq[wpos]);
    wordDots.set(Math.min(wpos, S.words.length - 1));
    el.dataset.pos = String(wpos); el.dataset.word = wq[wpos];
  }
  function nextWord() {
    wpos++;
    if (wpos < wq.length) { showWord(); refresh(); return; }
    showWagons(); refresh();
  }

  // ---- Wagon Parade for p, with "Say it, then find it!" ----
  function showWagons() {
    setPhase('wagons'); gen++;
    const key = S.wagonSound;
    const lesson = curriculum.lessons.find((l) => l.sound === key);
    // two parades (the short count) of the real game; sayFirst keeps the sound back until the child has tried
    wagons = buildWagons({ ...env, lesson: { ...lesson, games: ['wagons', 'wagons'] }, sound: curriculum.sounds[key], sayFirst: true });
    host.replaceChildren(wagons.el);
    el.classList.add('is-game');
  }

  function startOver() {
    gen++; T.clear();
    if (wagons) { wagons.cleanup(); wagons = null; }
    el.classList.remove('is-game');
    pos = 0; wpos = 0; lq.length = 0; lq.push(...S.letters); lReturned.clear(); wq.length = 0; wq.push(...S.words); wReturned.clear();
    if (item) { item.cleanup(); item = null; }
    setPhase('letters');
    showLetter();
  }

  showLetter();
  return {
    el, flush: true,
    parts: () => (phase === 'letters' ? [{ tts: 'Say the sound.' }] : phase === 'words' ? [{ tts: 'Read the word.' }] : [{ tts: 'Say the sound first, then find it.' }]),
    script: () => fill(S.scripts[phase], ''),
    gist: () => fill(S.scripts[phase + 'Gist'], ''),
    again: () => { startOver(); refresh(); },
    cleanup: () => { gen++; T.clear(); if (item) item.cleanup(); if (wagons) wagons.cleanup(); },
  };
}
