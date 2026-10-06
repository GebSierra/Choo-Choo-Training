import { h, animate, reduced } from '../../../dom.js';
import { firstSoundOut, soundText } from '../../../scripts.js';
import { emojiFrame } from '../../../components/picture.js';
import { sayPrompt, blendReady } from '../../../components/say-sound.js';
import { sparkle } from '../../../components/sparkle.js';
import { timers, shake } from '../../../components/game-kit.js';
import { sfx } from '../../../sfx.js';
import { hearBtn, fadeIn, pop, dotRow } from './kit.js';

// Stage 1 sound play (CURRICULUM.md section 11), three small activities for the ordinary task shell:
//   story  1.1  four pictures of a tiny story; tap them from left to right
//   first  1.2  "Where is mmmilk?": tap the picture that starts with the sound the grown-up holds
//   hear   1.3  hear a smooth word ("sssuuunnn") and tap its picture
//   break  1.3  a picture and one empty dot per sound; tap a dot for each sound
// No letters are ever shown. The phone's voice says whole words and instructions only: a stretched word is the grown-up's
// recording (assets/audio/blends/<word>.mp3) or the prompt "Say: sssuuunnn", built from soundText; never text to speech.

// The word sound by sound ("sssuuunnn"), from the word's own sounds list.
export const stretchOf = (round, sounds) => round.sounds.map((k) => soundText(k, sounds)).join('');
const wordFill = (fill, text, round, sounds) => fill(text).replace(/\{(first|stretch|word)\}/g, (_, k) => (!round ? '' : k === 'first' ? firstSoundOut(round.target, sounds) : k === 'stretch' ? (round.sounds ? stretchOf(round, sounds) : round.target) : round.target));
const pic = (data, w, cls = '') => emojiFrame(data.pictures[w], cls);

// The stretched word: the recording when one can play, else the grown-up prompt. Resolves 'clip', 'prompt' or 'stale'.
async function sayStretch(env, w, text, prompt, stale) {
  if (blendReady(env, w)) {
    prompt.hide();
    await env.speech.say([{ blend: w }]);
    if (stale()) return 'stale';
    if (!env.speech.missingBlends.includes(w)) return 'clip';
  }
  prompt.show(text, w);
  return 'prompt';
}
// On entry the shell's auto-speak plays parts(); the prompt shows at once when no recording can play, or once one turns out missing.
function onEntry(env, w, text, prompt, T, stale) {
  if (!blendReady(env, w)) { prompt.show(text, w); return; }
  T.later(() => { if (!stale() && env.speech.missingBlends.includes(w)) prompt.show(text, w); }, 1500);
}
const entryParts = (env, w, instruction) => (blendReady(env, w) ? [{ blend: w }] : [{ tts: instruction }]);
const bounce = (el) => animate(el, [{ transform: 'translateY(0)' }, { transform: 'translateY(-12px)', offset: 0.35 }, { transform: 'translateY(0)', offset: 0.65 }, { transform: 'translateY(-5px)', offset: 0.82 }, { transform: 'translateY(0)' }], { duration: 520 });

// ---- 1.1 left to right ----
export function buildStory(env) {
  const { data, step, fill, setDone, refresh, speech } = env;
  const T = timers();
  let next = 0, finished = false;
  const el = h('div', { class: 'proto story-row', dataset: { next: '0', state: 'playing' } });
  const tiles = step.pics.map(([em], k) => h('button', { class: 'lr-pic' + (k === 0 ? ' is-start' : ''), type: 'button', 'aria-label': `picture ${k + 1}`, dataset: { i: String(k) }, onclick: () => tap(k) }, emojiFrame(em)));
  const row = h('div', { class: 'lr-row' }, ...tiles);
  const arrow = h('svg', { class: 'lr-arrow', viewBox: '0 0 300 26', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M6 13 H282', fill: 'none', stroke: 'currentColor', 'stroke-width': 6, 'stroke-linecap': 'round' }),
    h('path', { d: 'M266 3 L290 13 L266 23', fill: 'none', stroke: 'currentColor', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  const hint = h('p', { class: 'wu-hint' }, 'Tap the pictures from left to right.');
  el.append(h('p', { class: 'px-chip' }, 'Tell the story'), row, arrow, hint);
  fadeIn(row);

  function tap(k) {
    if (finished) return;
    if (k < next) { speech.say([{ tts: step.pics[k][1] }]); return; } // a picture already lit tells its line again
    if (k > next) { bounce(tiles[next]); return; } // out of order: the right next picture bounces, nothing else
    tiles[k].classList.remove('is-start');
    tiles[k].classList.add('lit');
    pop(tiles[k].firstChild, 320);
    sfx.play('pop', { step: k });
    speech.say([{ tts: step.pics[k][1] }]);
    next++; el.dataset.next = String(next);
    if (next < tiles.length) return;
    finished = true; el.dataset.state = 'done';
    hint.hidden = true;
    const r = row.getBoundingClientRect(), o = el.getBoundingClientRect();
    sparkle(el, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 12, size: [10, 20], reach: [40, 90], sound: 'sparkle' });
    T.later(() => setDone(true), 600);
  }
  return {
    el, lockScroll: false,
    parts: () => [{ tts: 'Tap the pictures in order, from left to right.' }],
    script: () => fill(step.script), gist: () => fill(step.gist),
    again: () => { T.clear(); next = 0; finished = false; el.dataset.next = '0'; el.dataset.state = 'playing'; hint.hidden = false; tiles.forEach((t, k) => { t.classList.remove('lit'); t.classList.toggle('is-start', k === 0); }); refresh(); },
    cleanup: () => T.clear(),
  };
}

// ---- 1.2 first sounds and 1.3 hear the word: pick the picture ----
export function buildPick(env) {
  const { data, step, fill, setDone, refresh, speech, curriculum } = env;
  const sounds = curriculum.sounds;
  const first = step.kind === 'first';
  const T = timers();
  const prompt = sayPrompt();
  let i = 0, gen = 0, locked = false;
  const dots = dotRow(step.rounds.length);
  const body = h('div', { class: 'pk-body' });
  const el = h('div', { class: 'proto pick', dataset: { kind: step.kind, round: '0', state: 'playing' } }, body);
  const round = () => step.rounds[i];
  const textOf = (r) => (first ? `Say: Where is ${firstSoundOut(r.target, sounds)}?` : `Say: ${stretchOf(r, sounds)}`);
  const stale = (g) => () => g !== gen;

  function show(entry = false) {
    T.clear();
    const r = round(), g = ++gen;
    locked = false;
    el.dataset.round = String(i); el.dataset.target = r.target; el.dataset.state = 'playing';
    const chip = h('p', { class: 'px-chip' }, first ? 'Listen for the first sound' : 'Which one is it?');
    const hear = hearBtn('Hear it again', () => sayStretch(env, r.target, textOf(r), prompt, stale(g)), { compact: true });
    prompt.hide();
    const opts = r.options.map((w) => h('button', { class: 'pk-opt', type: 'button', 'aria-label': w, dataset: { word: w }, onclick: () => choose(w, opts) }, pic(data, w)));
    body.replaceChildren(dots.el, chip, h('div', { class: 'px-model' }, prompt.el, hear), h('div', { class: 'pk-opts' }, ...opts));
    dots.set(i);
    fadeIn(body.lastChild);
    if (entry) onEntry(env, r.target, textOf(r), prompt, T, stale(g)); else sayStretch(env, r.target, textOf(r), prompt, stale(g));
    refresh();
  }
  function choose(w, opts) {
    if (locked) return;
    const btn = opts.find((o) => o.dataset.word === w);
    if (w !== round().target) { shake(btn); return; } // a gentle wiggle: no red, no sound of failure
    locked = true;
    const g = gen;
    btn.classList.add('right');
    opts.forEach((o) => { if (o !== btn) o.classList.add('soft'); });
    pop(btn.firstChild, 320);
    sfx.play('pop', { step: 2 });
    speech.say([{ tts: w }]);
    const r = btn.getBoundingClientRect(), o = el.getBoundingClientRect();
    sparkle(el, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 8, size: [10, 18], reach: [30, 60] });
    T.later(() => {
      if (g !== gen) return;
      if (i < step.rounds.length - 1) { i++; show(); return; }
      el.dataset.state = 'done'; dots.set(step.rounds.length); setDone(true);
    }, reduced() ? 200 : 1300);
  }
  show(true);
  return {
    el, lockScroll: false,
    parts: () => entryParts(env, round().target, first ? 'Listen to the grown-up. Tap the picture that starts the same way.' : 'Listen. Tap the picture of the word.'),
    script: () => wordFill(fill, step.script, round(), sounds), gist: () => wordFill(fill, step.gist, round(), sounds),
    again: () => { i = 0; show(); },
    cleanup: () => { gen++; T.clear(); },
  };
}

// ---- 1.3 break it apart: a dot for each sound ----
export function buildBreak(env) {
  const { data, step, fill, setDone, refresh, speech, curriculum } = env;
  const sounds = curriculum.sounds;
  const T = timers();
  const prompt = sayPrompt();
  let i = 0, gen = 0;
  const body = h('div', { class: 'sg-body' });
  const el = h('div', { class: 'proto segment', dataset: { round: '0', lit: '0', state: 'playing' } }, body);
  const round = () => step.rounds[i];
  const stale = (g) => () => g !== gen;

  function show(entry = false) {
    T.clear();
    const r = round(), g = ++gen, text = `Say: ${stretchOf(r, sounds)}`;
    let lit = 0;
    el.dataset.round = String(i); el.dataset.word = r.target; el.dataset.lit = '0'; el.dataset.state = 'playing';
    const chip = h('p', { class: 'px-chip' }, 'Break it apart');
    const hear = hearBtn('Hear it again', () => sayStretch(env, r.target, text, prompt, stale(g)), { compact: true });
    prompt.hide();
    const dotBtns = r.sounds.map((_, k) => h('button', { class: 'sg-dot', type: 'button', 'aria-label': `dot ${k + 1}`, dataset: { i: String(k) }, onclick: () => tap() }));
    const hint = h('p', { class: 'wu-hint' }, 'Tap a dot for each sound.');
    const slot = h('div', { class: 'wu-next' });
    body.replaceChildren(chip, h('div', { class: 'sg-pic' }, pic(data, r.target, 'huge')), h('div', { class: 'px-model' }, prompt.el, hear), h('div', { class: 'sg-dots' }, ...dotBtns), hint, slot);
    fadeIn(body.querySelector('.sg-dots'));
    function tap() {
      if (g !== gen || lit >= dotBtns.length) return;
      const d = dotBtns[lit];
      d.classList.add('lit');
      pop(d, 300);
      sfx.play('pop', { step: lit });
      lit++; el.dataset.lit = String(lit);
      if (lit < dotBtns.length) return;
      el.dataset.state = 'broken';
      hint.hidden = true;
      const rr = d.parentNode.getBoundingClientRect(), o = el.getBoundingClientRect();
      sparkle(el, rr.left - o.left + rr.width / 2, rr.top - o.top + rr.height / 2, { count: 10, size: [10, 20], reach: [34, 70], sound: 'sparkle' });
      T.later(() => {
        if (g !== gen) return;
        speech.say([{ tts: r.target }]);
        if (i < step.rounds.length - 1) { slot.append(h('button', { class: 'btn small px-next', type: 'button', onclick: () => { i++; show(); } }, 'Next word')); fadeIn(slot); } else { el.dataset.state = 'done'; setDone(true); }
      }, 500);
    }
    if (entry) onEntry(env, r.target, text, prompt, T, stale(g)); else sayStretch(env, r.target, text, prompt, stale(g));
    refresh();
  }
  show(true);
  return {
    el, lockScroll: false,
    parts: () => entryParts(env, round().target, 'Listen to the grown-up. Tap a dot for each sound.'),
    script: () => wordFill(fill, step.script, round(), sounds), gist: () => wordFill(fill, step.gist, round(), sounds),
    again: () => { i = 0; show(); },
    cleanup: () => { gen++; T.clear(); },
  };
}

export const BUILDERS = { story: buildStory, first: buildPick, hear: buildPick, break: buildBreak };
