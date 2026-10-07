import { h, animate, reduced } from '../../../dom.js';
import { wordSvg } from '../../../glyphs.js';
import { centeredFace } from '../../../components/letter-face.js';
import { sayPrompt } from '../../../components/say-sound.js';
import { judgeBar } from '../../../components/judge-bar.js';
import { sparkle } from '../../../components/sparkle.js';
import { shake, timers } from '../../../components/game-kit.js';
import { sfx } from '../../../sfx.js';
import { INK, hearBtn, fadeIn, pop } from './kit.js';
import { READ_HELP } from '../../../scripts.js';

// PROTOTYPE 5: a heart-word step for "the" (unit 2.3). Five sub-steps in the task shell (its dots count them):
//   meet   the word as big tiles: "th" is ONE linked tile (two letters, one sound), "e" has a small red heart above it
//   map    tap th (its sound), tap the heart ("uh", the heart pops), slide a finger under the whole word and say it; judge bar
//   fix    "fix the word" (CURRICULUM.md section 12): the grown-up says it as spelled ("thee") and asks for the real word; judge bar
//   spell  tiles t h e plus distractors from the taught letters, three boxes; wrong shakes, never auto-fixed
//   find   "Sam sat at the map.": the child taps "the", then reads the whole sentence; judge bar; then a fluent model
// Voice rule (CURRICULUM.md section 3, rule 8): the phone's voice says the whole word "the", whole sentences and instructions.
// It never says an isolated sound, and never "thee". The sounds are the grown-up's recording or a prompt: "th" uses
// assets/audio/sounds/th-buzz.mp3 (or .webm) when it exists, the tricky part uses assets/audio/heart/the-e.mp3 when it exists;
// without a file the screen shows the grown-up prompt ("Say: th (buzzing, tongue between your teeth)", "Say: uh").
export const WORD = 'the';
export const SENTENCE = 'Sam sat at the map.';
export const TIP = 'Most "sight words" are only partly tricky. In "said," only the "ai" is unusual. Sound out the regular letters together, and learn just the tricky part by heart.';
export const PHASES = ['meet', 'map', 'fix', 'spell', 'find'];
export const SOUND = {
  th: { key: 'th-buzz', src: 'assets/audio/sounds/th-buzz.mp3', text: 'Say: th (buzzing, tongue between your teeth)' },
  uh: { key: 'the-e', src: 'assets/audio/heart/the-e.mp3', text: 'Say: uh' },
};
const TRAY = ['s', 'e', 'm', 'h', 'a', 't']; // t h e and the taught letters m a s, shuffled once
// say: the words on the grown-up's sheet. speak: what the sheet's speaker reads aloud (whole sentences, never a sound or "thee").
const SCRIPTS = {
  meet: { say: 'This is a heart word. Most of it sounds out, but one part is tricky: here, the letter e says \'uh\'. We learn that part by heart. ' + READ_HELP + ' Then tap "Hear it".', gist: 'Heart word: the. Read it together.', speak: 'This is a heart word. Most of it sounds out, but one part is tricky. We learn that part by heart. ' + READ_HELP + ' Then tap Hear it.' },
  map: { say: 'Your child taps th and says its sound (buzzing, tongue between the teeth), then taps the heart: the letter e says \'uh\'. Then slide a finger under the whole word and say it together: the.', gist: 'Tap th, tap the heart, slide, say it.', speak: 'Your child taps each part, then slides a finger under the whole word and says it.' },
  fix: { say: 'Say it the way it\'s spelled: thee. Ask: what\'s the real word? Your child says the. This builds flexible reading: when a word sounds odd, try the other sound.', gist: 'Say it as spelled. Ask: what\'s the real word?', speak: 'Say it the way it\'s spelled, then ask: what\'s the real word? This builds flexible reading: when a word sounds odd, try the other sound.' },
  spell: { say: 'The phone says the word. Your child taps the tiles to fill the boxes from left to right. Tap a filled box to send its tile back. A wrong tile only shakes: we never fix it for them.', gist: 'Child spells the word.', speak: 'The phone says the word. Your child taps the tiles to fill the boxes from left to right.' },
  find: { say: 'Read the sentence together, then your child taps the heart word "the". ' + READ_HELP + ' Tap Got it if it went smoothly, or Help to read it together one word at a time.', gist: 'Read it together, tap "the".', speak: 'Read the sentence together, then your child taps the heart word. ' + READ_HELP + ' Tap Got it if it went smoothly, or Help to read it together one word at a time.' },
};
const HINT = ['first', 'middle', 'last'];
const LIGHT_MS = 650;
const popAnim = (n) => animate(n, [{ transform: 'scale(1)' }, { transform: 'scale(1.5)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });

// The little red heart that marks the tricky part.
export const heartSvg = (cls = '') => h('svg', { class: 'hw-heart ' + cls, viewBox: '0 0 32 30', role: 'img', 'aria-label': 'heart' },
  h('path', { d: 'M16 28 C6 20 2 14 2 9 C2 4.5 5.5 2 9 2 C12 2 14.5 3.6 16 6.4 C17.5 3.6 20 2 23 2 C26.5 2 30 4.5 30 9 C30 14 26 20 16 28 Z', fill: '#E5484D', stroke: '#B8323A', 'stroke-width': 2, 'stroke-linejoin': 'round' }),
  h('path', { d: 'M8 8.5 C8.6 6.8 10 6 11.4 6', fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 2, 'stroke-linecap': 'round' }));

export const faceOf = (txt) => { const s = wordSvg(txt, { color: INK, all: true, label: txt }); s.style.width = `calc(var(--cap, 64px) * ${Number(s.dataset.width) / Number(s.dataset.height)})`; s.style.maxWidth = '100%'; return s; };

// The word as tiles. th is one linked tile, e has the heart. interactive: the tiles are buttons (Map it).
export function wordTiles({ interactive = false, onTh, onHeart } = {}) {
  const heart = heartSvg();
  const th = h(interactive ? 'button' : 'div', { class: 'hw-tile th', dataset: { part: 'th' }, ...(interactive ? { type: 'button', 'aria-label': 'th, two letters, one sound', onclick: () => onTh && onTh() } : { role: 'img', 'aria-label': 'th' }) },
    faceOf('th'), h('span', { class: 'hw-link', 'aria-hidden': 'true' }));
  const e = h(interactive ? 'button' : 'div', { class: 'hw-tile e', dataset: { part: 'e' }, ...(interactive ? { type: 'button', 'aria-label': 'e, the heart part', onclick: () => onHeart && onHeart() } : { role: 'img', 'aria-label': 'e' }) },
    h('span', { class: 'hw-heartwrap', 'aria-hidden': 'true' }, heart), faceOf('e'));
  const el = h('div', { class: 'hw-word', role: 'group', 'aria-label': 'the' }, th, e);
  return { el, th, e, heart };
}

export function build(env) {
  const { speech, store, setDone, refresh, setPos } = env;
  const T = timers();
  let phase = 'meet', gen = 0, current = null;
  const host = h('div', { class: 'hw-host' });
  const el = h('div', { class: 'proto heart', dataset: { phase: 'meet', state: 'working' } }, host);
  const say = (text) => speech.say([{ tts: text }]);

  // Plays the grown-up's recording of a part when one exists, else shows the prompt. Resolves 'clip', 'prompt' or 'stale'.
  async function sayPart(kind, prompt, stale) {
    const S = SOUND[kind];
    if (store.settings.playSounds && !speech.missing.includes(S.key)) {
      prompt.hide();
      await speech.say([{ src: S.src, key: S.key }]);
      if (stale()) return 'stale';
      if (!speech.missing.includes(S.key)) return 'clip';
    }
    prompt.show(S.text, S.key);
    return 'prompt';
  }
  const lightOnce = (node, ms = 800) => { node.classList.add('lit'); T.later(() => node.classList.remove('lit'), ms); };
  const finish = (g, delay = 600) => T.later(() => { if (g !== gen) return; el.dataset.state = 'done'; setDone(true); }, delay);
  const burst = (node, opts = {}) => { const r = node.getBoundingClientRect(), o = el.getBoundingClientRect(); sparkle(el, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 12, size: [10, 22], reach: [40, 90], sound: 'star', ...opts }); };

  function show() {
    const g = ++gen;
    T.clear();
    if (current && current.cleanup) current.cleanup();
    el.dataset.phase = phase; el.dataset.state = 'working';
    for (const k of ['th', 'heart', 'slid', 'help', 'found', 'miss', 'filled', 'wrong']) delete el.dataset[k];
    setPos(PHASES.indexOf(phase));
    const prompt = sayPrompt();
    current = ({ meet, map, fix, spell, find })[phase](g, prompt);
    host.replaceChildren(h('div', { class: 'hw-pad hwp-' + phase }, current.el));
    fadeIn(host.firstChild);
    refresh();
  }

  // ---- 1. Meet it ----
  function meet() {
    let revealed = false;
    const tiles = wordTiles();
    const chip = h('p', { class: 'px-chip' }, 'Can you read it?');
    const slot = h('div', { class: 'hw-btns' });
    const tried = h('button', { class: 'btn small hw-tried', type: 'button', onclick: () => {
      revealed = true; el.dataset.state = 'heard';
      chip.textContent = 'This is a heart word';
      slot.replaceChildren(hearBtn('Hear it', () => say(WORD)));
      fadeIn(slot);
      lightOnce(tiles.e, 1200); popAnim(tiles.heart);
      refresh();
    } }, 'Your child had a go');
    slot.append(tried);
    const legend = h('p', { class: 'hw-legend' }, heartSvg('small'), h('span', {}, 'The heart marks the tricky part.'));
    return { el: h('div', { class: 'hw-col' }, chip, tiles.el, legend, slot), parts: () => [{ tts: revealed ? WORD : 'Look at the word. Can you read it?' }] };
  }

  // ---- 2. Map it ----
  function map(g, prompt) {
    let tappedTh = false, tappedHeart = false, slid = false, helpId = 0;
    const tiles = wordTiles({
      interactive: true,
      onTh: () => { tappedTh = true; el.dataset.th = '1'; tiles.th.classList.remove('next'); lightOnce(tiles.th); mark(); sayPart('th', prompt, () => g !== gen); },
      onHeart: () => { tappedHeart = true; el.dataset.heart = '1'; tiles.e.classList.remove('next'); if (!reduced()) popAnim(tiles.heart); lightOnce(tiles.e); mark(); sayPart('uh', prompt, () => g !== gen); },
    });
    const chip = h('p', { class: 'px-chip' }, 'Tap each part');
    const fill = h('i', {});
    const strip = h('div', { class: 'hw-slide', role: 'group', 'aria-label': 'Slide under the word and say it', hidden: true, dataset: { progress: '0' } }, h('span', { class: 'hw-slide-hint' }, 'Slide under the word and say it'), h('span', { class: 'hw-slide-bar' }, fill));
    const judge = judgeBar({ onGot: () => got(), onHelp: () => help() });
    judge.hide();
    el.dataset.th = '0'; el.dataset.heart = '0'; el.dataset.slid = '0';

    function mark() {
      if (tappedTh && tappedHeart) { if (strip.hidden) { chip.textContent = 'Slide under the word'; strip.hidden = false; fadeIn(strip); } }
      else if (tappedTh) { chip.textContent = 'Now tap the heart'; tiles.e.classList.add('next'); }
      else { chip.textContent = 'Now tap th'; tiles.th.classList.add('next'); }
    }
    // the slide: a finger moves left to right along the strip; the tiles light as it passes; reaching the end completes it
    let pointer = null;
    const set = (p) => { fill.style.transform = `scaleX(${p})`; strip.dataset.progress = p.toFixed(2); tiles.th.classList.toggle('lit', p > 0.04); tiles.e.classList.toggle('lit', p > 0.55); };
    const at = (ev) => { const r = strip.getBoundingClientRect(); return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); };
    strip.addEventListener('pointerdown', (ev) => { if (slid) return; pointer = ev.pointerId; try { strip.setPointerCapture(ev.pointerId); } catch { /* ignore */ } set(Math.min(at(ev), 0.08)); });
    strip.addEventListener('pointermove', (ev) => { if (slid || ev.pointerId !== pointer) return; const p = at(ev); set(Math.max(Number(strip.dataset.progress), p)); if (p >= 0.96) complete(); });
    const up = (ev) => { if (ev.pointerId !== pointer) return; pointer = null; if (!slid) set(0); };
    strip.addEventListener('pointerup', up); strip.addEventListener('pointercancel', up);

    function complete() {
      slid = true; pointer = null; el.dataset.slid = '1';
      set(1);
      if (!reduced()) animate(tiles.el, [{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      chip.textContent = 'Now say it';
      judge.show(); fadeIn(judge.el);
    }
    function got() {
      judge.hide(); chip.textContent = 'You read the heart word!';
      pop(tiles.el, 360); burst(tiles.el);
      T.later(() => { if (g === gen) say(WORD); }, 350);
      finish(g, 1500);
    }
    // Help replays the parts, th and then the heart, then the child slides and says the word again.
    async function help() {
      const mine = ++helpId, stale = () => g !== gen || mine !== helpId;
      el.dataset.help = '1';
      judge.hide();
      chip.textContent = 'Listen to the parts';
      tiles.th.classList.add('lit'); tiles.e.classList.remove('lit');
      await sayPart('th', prompt, stale);
      if (stale()) return;
      tiles.th.classList.remove('lit'); tiles.e.classList.add('lit');
      if (!reduced()) popAnim(tiles.heart);
      await sayPart('uh', prompt, stale);
      if (stale()) return;
      T.later(() => { if (stale()) return; slid = false; el.dataset.slid = '0'; set(0); chip.textContent = 'Slide and say it again'; }, 600);
    }
    mark(); tiles.th.classList.add('next'); chip.textContent = 'Tap each part';

    return { el: h('div', { class: 'hw-col' }, chip, tiles.el, h('div', { class: 'px-model' }, prompt.el), strip, judge.el), parts: () => [{ tts: 'Tap each part of the word.' }] };
  }

  // ---- 3. Fix the word ----
  function fix(g) {
    const tiles = wordTiles();
    const card = h('section', { class: 'hw-fix', 'aria-label': 'For the grown-up' },
      h('span', { class: 'say-who', 'aria-hidden': 'true' }, 'Grown-up'),
      h('p', { class: 'hw-fix-line' }, 'Say it the way it\'s spelled: ', h('strong', {}, 'thee'), '.'),
      h('p', { class: 'hw-fix-ask' }, 'Ask: what\'s the real word?'),
      h('p', { class: 'hw-fix-note' }, 'This builds flexible reading: when a word sounds odd, try the other sound.'));
    const hint = h('div', { class: 'ri-panel hw-hint', hidden: true, role: 'status' }, h('p', { class: 'ri-text' }, 'Try the other sound for the letter e. The real word is "the".'), hearBtn('Hear it', () => say(WORD), { compact: true }));
    const judge = judgeBar({ onGot: () => got(), onHelp: () => help() });
    const msg = h('p', { class: 'px-chip' }, 'Say the real word');
    function got() { judge.hide(); hint.hidden = true; msg.textContent = 'Yes! The real word is "the".'; pop(tiles.el, 360); burst(tiles.el); T.later(() => { if (g === gen) say(WORD); }, 350); finish(g, 1500); }
    function help() { hint.hidden = false; fadeIn(hint); judge.show(); el.dataset.help = '1'; }
    return { el: h('div', { class: 'hw-col' }, msg, tiles.el, card, hint, judge.el), parts: () => [{ tts: 'What is the real word?' }] };
  }

  // ---- 4. Spell it ----
  function spell(g) {
    const slots = [null, null, null], used = new Set();
    let locked = false, wrong = 0;
    const chip = h('p', { class: 'px-chip' }, 'Spell the word');
    const slotRow = h('div', { class: 'bi-slots', role: 'group', 'aria-label': 'The word being built' }, ...[0, 1, 2].map((k) => h('button', { class: 'bi-slot', type: 'button', 'aria-label': `box ${k + 1}`, dataset: { i: String(k) }, onclick: () => take(k) })));
    const hint = h('div', { class: 'bi-hint', hidden: true, role: 'status' }, h('span', { class: 'say-who', 'aria-hidden': 'true' }, 'Grown-up'), h('span', { class: 'bi-hint-text' }));
    const tray = h('div', { class: 'bi-tray', role: 'group', 'aria-label': 'Letter tiles' });
    const tileEls = new Map(TRAY.map((ch) => [ch, h('button', { class: 'bi-tile', type: 'button', 'aria-label': 'a letter tile', dataset: { letter: ch }, onclick: () => place(ch) }, centeredFace(ch, INK))]));
    tray.append(...tileEls.values());
    el.dataset.filled = ''; el.dataset.wrong = '0';
    const word = () => slots.map((s) => s || '').join('');
    const setHint = (t) => { hint.hidden = !t; hint.querySelector('.bi-hint-text').textContent = t || ''; if (t) fadeIn(hint, 200); };
    const sync = () => {
      el.dataset.filled = word();
      slotRow.querySelectorAll('.bi-slot').forEach((s, k) => { s.replaceChildren(...(slots[k] ? [centeredFace(slots[k], INK)] : [])); s.classList.toggle('filled', !!slots[k]); });
      tileEls.forEach((t, ch) => { const u = used.has(ch); t.disabled = u || locked; t.classList.toggle('used', u); });
    };
    function place(ch) {
      if (locked || used.has(ch)) return;
      const k = slots.indexOf(null);
      if (k < 0) return;
      slots[k] = ch; used.add(ch); sync();
      if (!reduced()) animate(slotRow.children[k], [{ transform: 'scale(.85)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      if (slots.every(Boolean)) check();
    }
    function take(k) { if (locked || !slots[k]) return; used.delete(slots[k]); slots[k] = null; setHint(''); sync(); }
    function check() {
      if (word() === WORD) { right(); return; }
      wrong++; el.dataset.wrong = String(wrong);
      // the misplaced boxes shake and the hint names the first of them; nothing is moved or fixed for the child
      const bad = slots.map((s, k) => (s !== WORD[k] ? k : -1)).filter((k) => k >= 0);
      bad.forEach((k) => { slotRow.children[k].classList.add('off'); if (!reduced()) shake(slotRow.children[k]); });
      T.later(() => slotRow.querySelectorAll('.off').forEach((s) => s.classList.remove('off')), 900);
      setHint(`Say the word slowly and listen for the ${HINT[bad[0]]} sound.`);
    }
    function right() {
      locked = true; el.dataset.state = 'right'; sync();
      [...slotRow.children].forEach((s, k) => { s.classList.add('right'); if (!reduced()) animate(s, [{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 420, delay: k * 70, easing: 'cubic-bezier(.34,1.56,.64,1)' }); });
      burst(slotRow); setHint('');
      T.later(() => { if (g === gen) say(WORD); }, 450);
      finish(g, 1500);
    }
    sync();
    // the phone says the word as the box opens (the shell's auto-speak plays parts())
    return { el: h('div', { class: 'hw-col' }, chip, slotRow, hint, tray), parts: () => [{ tts: WORD }] };
  }

  // ---- 5. Find it ----
  function find(g) {
    const words = SENTENCE.split(' ');
    let found = false;
    const chip = h('p', { class: 'px-chip hw-find-chip' }, 'Read the sentence together, then tap the heart word');
    const bare = (w) => w.replace(/[^A-Za-z]/g, '');
    const tiles = words.map((w, i) => h('button', { class: 'ri-tile wtile hw-w', type: 'button', 'aria-label': bare(w), dataset: { word: bare(w).toLowerCase(), i: String(i) }, onclick: () => pick(i) },
      h('span', { class: 'hw-wheart', 'aria-hidden': 'true' }, heartSvg('small')), faceOf(w)));
    const line = h('div', { class: 'hw-line', role: 'group', 'aria-label': SENTENCE }, ...tiles);
    const msg = h('p', { class: 'hw-msg', role: 'status' });
    const slot = h('div', { class: 'hw-btns' });
    const judge = judgeBar({ onGot: () => got(), onHelp: () => help() });
    judge.hide();
    el.dataset.found = '0';
    function pick(i) {
      if (found) return;
      const t = tiles[i];
      if (t.dataset.word !== WORD) {
        if (!reduced()) shake(t);
        msg.textContent = 'Not that one. Look for the word with the tricky part.';
        el.dataset.miss = String((Number(el.dataset.miss) || 0) + 1);
        return;
      }
      found = true; el.dataset.found = '1';
      t.classList.add('found');
      tiles.forEach((x) => { if (x !== t) x.classList.add('soft'); });
      sfx.play('star');
      if (!reduced()) popAnim(t);
      burst(t, { count: 8 });
      chip.textContent = 'Read it together'; msg.textContent = '';
      judge.show(); fadeIn(judge.el);
    }
    function got() {
      judge.hide(); chip.textContent = 'You read it!';
      if (!reduced()) tiles.forEach((t, i) => animate(t, [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 360, delay: i * 50, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
      burst(line);
      slot.replaceChildren(hearBtn('Hear it', () => say(SENTENCE))); fadeIn(slot);
      finish(g, 1200);
    }
    // Help: read it together, one word at a time, each word lighting in turn; then the child reads it again.
    function help() {
      judge.hide(); el.dataset.help = '1';
      chip.textContent = 'Say it after your grown-up';
      tiles.forEach((t) => t.classList.remove('lit'));
      tiles.forEach((t, i) => T.later(() => { if (g === gen) tiles.forEach((x, k) => x.classList.toggle('lit', k === i)); }, i * LIGHT_MS));
      T.later(() => { if (g !== gen) return; tiles.forEach((x) => x.classList.remove('lit')); chip.textContent = 'Now read it again'; judge.show(); fadeIn(judge.el); }, tiles.length * LIGHT_MS + 200);
    }
    return { el: h('div', { class: 'hw-col' }, chip, line, msg, slot, judge.el), parts: () => [{ tts: 'Read the sentence together, then tap the heart word.' }] };
  }

  show();
  return {
    el,
    parts: () => (current ? current.parts() : []),
    scriptParts: () => [{ tts: SCRIPTS[phase].speak }],
    script: () => SCRIPTS[phase].say,
    gist: () => SCRIPTS[phase].gist,
    again: () => show(),
    // Next goes through the five sub-steps before it leaves the screen
    next: () => { const i = PHASES.indexOf(phase); if (i < PHASES.length - 1) { phase = PHASES[i + 1]; show(); return true; } return false; },
    cleanup: () => { gen++; T.clear(); },
  };
}
