import { h, animate, reduced } from '../dom.js';
import { wordSvg } from '../glyphs.js';
import { accentOf } from '../theme.js';
import { centeredFace, tintLetter } from './letter-face.js';
import { sayPrompt, saySound, sayBlend } from './say-sound.js';
import { judgeBar } from './judge-bar.js';
import { timers } from './game-kit.js';

const INK = '#1E2140';
const LIGHT_MS = 650; // how long each letter stays lit while the blend model plays
export const bare = (w) => w.replace(/[^A-Za-z]/g, '');

// One thing for the child to read, judged by the grown-up (owner decision 6A): the item as big tiles, then the judge bar.
//   kind 'word': a row of letter tiles.   kind 'line': a row of word tiles (a sentence).
// "Got it" calls onGot(text). "Help" runs the correction script (CURRICULUM.md section 4), with the grown-up tapping the
// tricky unit and the app showing, never saying, the sounds:
//   word:  1 tap the tricky letter, it lights   2 that letter's sound (recording, or the prompt "Say: fff")
//          3 the word's blend model (recording, or "Say: fffiiit-") while the letters light in turn; the child blends again
//          4 onHelped(text), and the step brings the item back once at the end.
//   line:  1 tap the tricky word   2 its blend model (or, for a heart word, the word to say)   3 "Read the whole line again",
//          judged again   4 onHelped(text).
// Retrieval first: nothing is played until the grown-up taps Help; the child has already tried by then. There is no red.
// The phone's voice says only the whole word, in the panel's "Hear the word" button, which comes after Help.
export function readingItem(ctx, { kind = 'word', heart = [], onGot, onHelped }) {
  const { speech, curriculum } = ctx;
  const T = timers();
  const prompt = sayPrompt();
  const stage = h('div', { class: 'ri-stage' });
  const panel = h('div', { class: 'ri-panel', hidden: true, role: 'status', 'aria-live': 'polite' });
  const judge = judgeBar({ onGot: () => got(), onHelp: () => help() });
  const el = h('div', { class: `reading-item ri-${kind}`, dataset: { phase: 'idle' } }, stage, prompt.el, panel, judge.el);
  let text = '', units = [], tiles = [], phase = 'idle', tricky = -1, gen = 0;
  const setPhase = (p) => { phase = p; el.dataset.phase = p; };
  const stale = (g) => () => g !== gen;

  const btn = (label, fn, cls = 'ghost') => h('button', { class: `btn small ${cls}`, type: 'button', onclick: fn }, label);
  function setPanel(line, ...buttons) {
    panel.hidden = false;
    panel.replaceChildren(h('p', { class: 'ri-text' }, line), buttons.length ? h('div', { class: 'ri-btns' }, ...buttons) : null);
    animate(panel, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220 });
  }

  function show(next) {
    gen++; T.clear();
    text = next;
    units = kind === 'word' ? [...next] : next.split(' ');
    tricky = -1;
    tiles = units.map((u, i) => {
      const face = kind === 'word'
        ? centeredFace(u, INK)
        : (() => { const s = wordSvg(u, { color: INK, all: true, font: true, label: bare(u) }); s.style.width = `calc(var(--cap, 52px) * ${Number(s.dataset.width) / Number(s.dataset.height)})`; s.style.maxWidth = '100%'; return s; })();
      return h('button', { class: `ri-tile ${kind === 'word' ? 'ltile' : 'wtile'}`, type: 'button', disabled: true, 'aria-label': kind === 'word' ? `letter ${i + 1}` : bare(u), dataset: { i: String(i) }, onclick: () => pick(i) }, face);
    });
    stage.replaceChildren(...tiles);
    prompt.hide(); panel.hidden = true; panel.replaceChildren();
    judge.show();
    setPhase('read');
    animate(stage, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240 });
  }

  function got() {
    if (phase !== 'read' && phase !== 'again') return;
    const first = phase === 'read', g = gen;
    setPhase('done'); judge.hide();
    if (!reduced()) tiles.forEach((t, i) => animate(t, [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 360, delay: i * 50, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'none' }));
    T.later(() => { if (g === gen) { if (first) onGot(text); else onHelped(text); } }, reduced() ? 0 : 520);
  }

  function help() {
    if (phase !== 'read' && phase !== 'again') return;
    gen++; T.clear();
    prompt.hide();
    tiles.forEach((t) => t.classList.remove('tricky', 'lit'));
    tricky = -1;
    setPhase('tap'); judge.hide();
    tiles.forEach((t) => { t.disabled = false; t.classList.add('pick'); });
    setPanel(kind === 'word' ? 'Tap the letter that was tricky.' : 'Tap the word that was tricky.');
  }

  function pick(i) {
    if (phase !== 'tap') return;
    tricky = i;
    tiles.forEach((t) => { t.disabled = true; t.classList.remove('pick'); });
    tiles[i].classList.add('tricky');
    if (!reduced()) animate(tiles[i], [{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'none' });
    if (kind === 'word') soundStep(); else modelStep();
  }

  // Word, step 2: the tricky letter's own sound. The panel's words are for the grown-up; the sound is a recording or the prompt.
  async function soundStep() {
    setPhase('sound');
    const key = text[tricky].toLowerCase(), g = gen;
    setPanel("This letter's sound:", btn('Hear it again', () => saySound(ctx, key, prompt, { stale: stale(g) })), btn('Now blend the word', () => blendStep(), 'ghost go'));
    await saySound(ctx, key, prompt, { stale: stale(g) });
  }

  // Lights the word's letter tiles one after another, in step with the blend model; clearLit() puts them back.
  const clearLit = () => tiles.forEach((t) => { t.classList.remove('lit', 'current'); if (kind === 'word') tintLetter(t.firstChild, INK); });
  function lightLetters() {
    const g = gen;
    clearLit();
    tiles.forEach((t, i) => T.later(() => {
      if (g !== gen) return;
      tiles.forEach((x, k) => x.classList.toggle('current', k === i));
      t.classList.add('lit');
      tintLetter(t.firstChild, accentOf(text[i].toLowerCase()));
    }, i * LIGHT_MS));
    T.later(() => { if (g === gen) tiles.forEach((x) => x.classList.remove('current')); }, tiles.length * LIGHT_MS);
  }

  // Word, step 3: the blend model, with each letter lit in turn. The child blends it again.
  function blendStep() {
    setPhase('blend');
    const g = gen, w = bare(text);
    const model = () => { lightLetters(); return sayBlend(ctx, w, prompt, { stale: stale(g) }); };
    setPanel('Say the whole word. Then have your child say it after you.',
      btn('Hear it again', () => { model(); }),
      btn('Hear the word', () => speech.say([{ tts: w }])),
      btn('Done', () => complete(), 'ghost go'));
    model();
  }

  // Line, step 2: the tricky word. A heart word is said whole; any other word gets its blend model with its letters lit.
  async function modelStep() {
    setPhase('model');
    const g = gen, w = bare(units[tricky]), svg = tiles[tricky].firstChild;
    const letters = [...svg.querySelectorAll('.glyph-letter')];
    const again = () => setAgain();
    if (heart.includes(w)) {
      setPanel(`"${w}" is a heart word. Say it, then have your child say it.`, ...(w.length > 1 ? [btn('Hear the word', () => speech.say([{ tts: w }]))] : []), btn('Read the whole line again', again, 'ghost go'));
      if (w.length > 1) speech.say([{ tts: w }]);
      return;
    }
    const model = () => {
      letters.forEach((l) => l.classList.remove('lit', 'current'));
      letters.forEach((l, i) => { l.style.setProperty('--accent', accentOf(l.dataset.letter.toLowerCase())); T.later(() => { if (g === gen) { letters.forEach((x, k) => x.classList.toggle('current', k === i)); l.classList.add('lit'); } }, i * LIGHT_MS); });
      T.later(() => { if (g === gen) letters.forEach((x) => x.classList.remove('current')); }, letters.length * LIGHT_MS);
      return sayBlend(ctx, w, prompt, { stale: stale(g) });
    };
    setPanel('Say the tricky word together. Then your child says it alone.', btn('Hear it again', () => { model(); }), btn('Read the whole line again', again, 'ghost go'));
    model();
  }

  function setAgain() {
    gen++; T.clear();
    prompt.hide();
    tiles.forEach((t) => { t.classList.remove('lit', 'current'); t.firstChild.querySelectorAll && t.firstChild.querySelectorAll('.glyph-letter').forEach((l) => l.classList.remove('lit', 'current')); });
    setPhase('again');
    setPanel('Read the whole line again.');
    judge.show();
  }

  function complete() {
    if (phase === 'done') return;
    setPhase('done'); panel.hidden = true; prompt.hide(); gen++; T.clear();
    onHelped(text);
  }

  return {
    el, show,
    get phase() { return phase; },
    get tricky() { return tricky; },
    cleanup() { gen++; T.clear(); },
  };
}
