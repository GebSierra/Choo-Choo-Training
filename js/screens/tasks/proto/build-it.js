import { h, animate, reduced } from '../../../dom.js';
import { centeredFace } from '../../../components/letter-face.js';
import { sparkle } from '../../../components/sparkle.js';
import { shake, timers } from '../../../components/game-kit.js';
import { INK, fadeIn, dotRow } from './kit.js';

const POSITION = ['first', 'middle', 'last'];

// Step 6, Build It: spelling with letter tiles (the app's "build the word" step, CURRICULUM.md section 7).
// Word 1: the phone says the whole word ("fat"); three empty boxes; the child taps tiles to fill them left to right, and a
// tap on a filled box sends its tile back. Right: the tiles bounce and the word is said whole. Wrong: the misplaced box
// shakes gently and the grown-up gets a hint line; the app never fixes it for the child.
// Then a word chain, one letter changing each time, in a different place: fat, fit, sit, sip, tip. "Change one letter to make
// fit." The box to change is NOT marked (the child listens); after one wrong try the grown-up hint names the place.
export function build(env) {
  const { data, speech, setDone, refresh } = env;
  const S = data.build;
  const words = [S.first, ...S.chain];
  const TILES = [...data.known, data.sound]; // m a s i t p f
  const T = timers();
  let idx = 0, slots = [], used = new Set(), locked = false, wrong = 0, gen = 0;
  const target = () => words[idx];
  const prevWord = () => words[idx - 1];

  const dots = dotRow(words.length);
  const chip = h('p', { class: 'px-chip' });
  const slotRow = h('div', { class: 'bi-slots', role: 'group', 'aria-label': 'The word being built' });
  const hint = h('div', { class: 'bi-hint', hidden: true, role: 'status' }, h('span', { class: 'say-who', 'aria-hidden': 'true' }, 'Grown-up'), h('span', { class: 'bi-hint-text' }));
  const tray = h('div', { class: 'bi-tray', role: 'group', 'aria-label': 'Letter tiles' });
  const tileEls = new Map(TILES.map((ch) => [ch, h('button', { class: 'bi-tile', type: 'button', 'aria-label': 'a letter tile', dataset: { letter: ch }, onclick: () => place(ch) }, centeredFace(ch, INK))]));
  tray.append(...tileEls.values());
  const el = h('div', { class: 'proto buildit', dataset: { idx: '0', state: 'building', target: S.first, wrong: '0', filled: '' } }, dots.el, chip, slotRow, hint, tray);

  const instruction = () => [{ tts: idx === 0 ? target() : `Change one letter to make ${target()}.` }];
  const word = () => slots.map((s) => s || '').join('');
  const setHint = (text) => { hint.hidden = !text; hint.querySelector('.bi-hint-text').textContent = text || ''; if (text) fadeIn(hint, 200); };
  const sync = () => {
    el.dataset.filled = word();
    slotRow.querySelectorAll('.bi-slot').forEach((s, k) => { s.replaceChildren(...(slots[k] ? [centeredFace(slots[k], INK)] : [])); s.classList.toggle('filled', !!slots[k]); });
    tileEls.forEach((t, ch) => { const u = used.has(ch); t.disabled = u || locked; t.classList.toggle('used', u); });
  };

  function newWord() {
    const g = ++gen;
    locked = false; wrong = 0;
    el.dataset.idx = String(idx); el.dataset.target = target(); el.dataset.wrong = '0'; el.dataset.state = 'building';
    dots.set(idx);
    chip.textContent = idx === 0 ? 'Build the word' : 'Change one letter';
    setHint('');
    if (idx === 0) {
      slots = Array.from({ length: target().length }, () => null);
      used = new Set();
      slotRow.replaceChildren(...slots.map((_, k) => h('button', { class: 'bi-slot', type: 'button', 'aria-label': `box ${k + 1}`, dataset: { i: String(k) }, onclick: () => take(k) })));
    }
    sync();
    if (idx > 0) T.later(() => { if (g === gen) speech.say(instruction()); }, 350);
    refresh();
  }

  function place(ch) {
    if (locked || used.has(ch)) return;
    const k = slots.indexOf(null);
    if (k < 0) return;
    slots[k] = ch; used.add(ch);
    sync();
    if (!reduced()) animate(slotRow.children[k], [{ transform: 'scale(.85)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    if (slots.every(Boolean)) check();
  }
  function take(k) {
    if (locked || !slots[k]) return;
    used.delete(slots[k]); slots[k] = null;
    setHint('');
    sync();
  }

  function check() {
    const w = word(), t = target();
    if (w === t) { right(); return; }
    wrong++; el.dataset.wrong = String(wrong);
    if (idx === 0) {
      // the misplaced boxes shake; the hint names the first of them
      const bad = slots.map((s, k) => (s !== t[k] ? k : -1)).filter((k) => k >= 0);
      bad.forEach((k) => { slotRow.children[k].classList.add('off'); if (!reduced()) shake(slotRow.children[k]); });
      T.later(() => slotRow.querySelectorAll('.off').forEach((s) => s.classList.remove('off')), 900);
      setHint(`Say the word slowly and listen for the ${POSITION[bad[0]]} sound.`);
    } else {
      // the box to change was never marked; now the hint names where it is
      if (!reduced()) shake(slotRow);
      const at = [...t].findIndex((c, k) => c !== prevWord()[k]);
      setHint(`Listen to the ${POSITION[at]} sound.`);
    }
  }

  function right() {
    locked = true; el.dataset.state = 'right';
    sync();
    const g = gen;
    [...slotRow.children].forEach((s, k) => { s.classList.add('right'); if (!reduced()) animate(s, [{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 420, delay: k * 70, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'none' }); });
    const r = slotRow.getBoundingClientRect(), o = el.getBoundingClientRect();
    sparkle(el, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 12, size: [10, 22], reach: [40, 90], sound: 'star' });
    setHint('');
    T.later(() => { if (g === gen) speech.say([{ tts: target() }]); }, 450); // the whole word, read aloud
    if (idx === words.length - 1) { T.later(() => { if (g === gen) { el.dataset.state = 'done'; setDone(true); } }, 1500); return; }
    T.later(() => { if (g !== gen) return; slotRow.querySelectorAll('.right').forEach((s) => s.classList.remove('right')); idx++; newWord(); }, 2300);
  }

  newWord();
  return {
    el,
    parts: () => instruction(),
    script: () => (idx === 0 ? env.fill(S.scripts.first, target()) : S.scripts.chain.replace('@', target())),
    gist: () => (idx === 0 ? env.fill(S.scripts.firstGist, target()) : S.scripts.chainGist.replace('@', target())),
    again: () => { idx = 0; newWord(); },
    cleanup: () => { gen++; T.clear(); },
  };
}
