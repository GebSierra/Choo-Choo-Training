import { h, animate, reduced } from '../../dom.js';
import { wordSvg } from '../../glyphs.js';
import { sayPrompt } from '../../components/say-sound.js';
import { judgeBar } from '../../components/judge-bar.js';
import { sparkle } from '../../components/sparkle.js';
import { shake, timers } from '../../components/game-kit.js';
import { sfx } from '../../sfx.js';
import { INK, hearBtn, fadeIn, pop } from './proto/kit.js';

// Heart Word: the step after Watch My Mouth in a lesson that teaches heart words (docs/CURRICULUM.md section 12, docs/LESSON-REBUILD.md section 13).
// A heart word is one the child learns by heart, because a part of it does not follow the sounds yet. For each word of lesson.heart, two sub-steps
// (the shell's Next moves through them; the lesson's own dots count tasks, not sub-steps):
//   meet  the word big, hearts hidden; the child has a go; the heart appears on the tricky part (the regular parts stay plain);
//         the grown-up says the word and the child reads it; judge bar
//   find  the grown-up says the word, the child finds it among 3 cards; then a tiny phrase that uses it, read together; judge bar
// Voice rule: the phone's voice never says the word, a sound or a phrase (never text to speech). The word is the grown-up's recording
// (assets/audio/heart/<word>.mp3, or .webm) when one exists; without it the screen shows "Say: the". All wording comes from curriculum.heartWords.
export const clipOf = (w) => ({ key: `heart-${w.toLowerCase()}`, src: `assets/audio/heart/${w.toLowerCase()}.mp3` });
export const TIP = 'A heart word is a word we learn by heart, because a part of it does not follow the sounds yet. Most of the word still sounds out. The little heart marks only the tricky part.';
const LINKED = new Set(['th', 'ou', 'ai', 'oe', 'are']); // letters that make one sound are drawn as one linked tile
const LIGHT_MS = 650;
const popAnim = (n) => animate(n, [{ transform: 'scale(1)' }, { transform: 'scale(1.5)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });

// The little red heart that marks the tricky part.
export const heartSvg = (cls = '') => h('svg', { class: 'hw-heart ' + cls, viewBox: '0 0 32 30', role: 'img', 'aria-label': 'heart' },
  h('path', { d: 'M16 28 C6 20 2 14 2 9 C2 4.5 5.5 2 9 2 C12 2 14.5 3.6 16 6.4 C17.5 3.6 20 2 23 2 C26.5 2 30 4.5 30 9 C30 14 26 20 16 28 Z', fill: '#E5484D', stroke: '#B8323A', 'stroke-width': 2, 'stroke-linejoin': 'round' }),
  h('path', { d: 'M8 8.5 C8.6 6.8 10 6 11.4 6', fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 2, 'stroke-linecap': 'round' }));

// A one-letter word (a, I) is labelled "the word a": a screen reader must never read a lone letter, which it would say by name.
export const faceOf = (txt, font = false, label = txt.length === 1 ? `the word ${txt}` : txt) => { const s = wordSvg(txt, { color: INK, all: true, font, label }); s.style.width = `calc(var(--cap, 64px) * ${Number(s.dataset.width) / Number(s.dataset.height)})`; s.style.maxWidth = '100%'; return s; };

// The word as tiles, one per part: a regular part is plain, the heart part has the heart above it (hidden while `plain`).
export function wordTiles(data, { plain = false } = {}) {
  const tiles = data.parts.map((p) => h('div', { class: 'hw-tile ' + (p.heart ? 'heart-part' : 'regular'), dataset: { part: p.t, heart: p.heart ? '1' : '0' }, role: 'img', 'aria-label': p.heart ? `${p.t}, the heart part` : `${p.t}, a regular part` },
    ...(p.heart ? [h('span', { class: 'hw-heartwrap', 'aria-hidden': 'true' }, heartSvg())] : []), faceOf(p.t, false, 'letters'), ...(LINKED.has(p.t) ? [h('span', { class: 'hw-link', 'aria-hidden': 'true' })] : [])));
  const el = h('div', { class: 'hw-word' + (plain ? ' plain' : ''), role: 'group', 'aria-label': `the word ${data.word}` }, ...tiles);
  return { el, tiles, hearts: tiles.filter((t) => t.dataset.heart === '1') };
}

const scriptFor = (phase, data) => ({
  meet: { say: `Let your child try the word first. Then tap "Your child had a go". The heart marks the part we know by heart. ${data.tricky} Say the word, point to the heart, and have your child read it. Tap Got it if it went well. Tap Help to say it together once more.`,
    gist: 'Child tries. Then say it.', speak: 'Let your child try the word first. Then tap the button. The heart marks the part we know by heart. Say the word, and have your child read it. Tap Got it if it went well.' },
  find: { say: 'Say the word, then your child taps it among the three cards. A wrong card only shakes: let your child look again. Then read the little phrase together. Tap Got it if it went well. Tap Help to read it together, one word at a time.',
    gist: 'Say it. Child taps the word.', speak: 'Say the word, then your child taps it among the three cards. Then read the little phrase together. Tap Got it if it went well.' },
})[phase];

export function build(env) {
  const { speech, store, curriculum, lesson, setDone, refresh, setPos } = env;
  const words = (lesson && lesson.heart) || [];
  const steps = words.flatMap((w) => [{ phase: 'meet', w }, { phase: 'find', w }]);
  const T = timers();
  let at = 0, gen = 0, current = null;
  const host = h('div', { class: 'hw-host' });
  const el = h('div', { class: 'proto heart', dataset: { phase: 'meet', word: words[0] || '', state: 'working' } }, host);
  const data = (w) => curriculum.heartWords[w];

  // The grown-up says the word: the recording when one can play, else the prompt "Say: the". Never the phone's voice.
  async function sayWord(w, prompt, stale = () => false) {
    const C = clipOf(w);
    if (store.settings.playSounds && !speech.missing.includes(C.key)) {
      prompt.hide();
      await speech.say([{ src: C.src, key: C.key }]);
      if (stale()) return 'stale';
      if (!speech.missing.includes(C.key)) return 'clip';
    }
    prompt.show(`Say: ${w}`, C.key);
    return 'prompt';
  }
  const finish = (g, delay = 600) => T.later(() => { if (g !== gen) return; el.dataset.state = 'done'; if (at === steps.length - 1) setDone(true); }, delay);
  const burst = (node, opts = {}) => { const r = node.getBoundingClientRect(), o = el.getBoundingClientRect(); sparkle(el, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 12, size: [10, 22], reach: [40, 90], sound: 'star', ...opts }); };

  function show() {
    const g = ++gen;
    T.clear();
    if (current && current.cleanup) current.cleanup();
    const { phase, w } = steps[at];
    el.dataset.phase = phase; el.dataset.word = w; el.dataset.state = 'working'; el.dataset.step = String(at);
    for (const k of ['help', 'found', 'miss', 'revealed']) delete el.dataset[k];
    if (setPos) setPos(at);
    const prompt = sayPrompt();
    current = (phase === 'meet' ? meet : find)(g, prompt, w, data(w));
    host.replaceChildren(h('div', { class: 'hw-pad hwp-' + phase }, current.el));
    fadeIn(host.firstChild);
    refresh();
  }

  // ---- meet: the child has a go, the heart shows the tricky part, the grown-up says it, the child reads it ----
  function meet(g, prompt, w, d) {
    const tiles = wordTiles(d, { plain: true });
    const chip = h('p', { class: 'px-chip' }, 'Try to read it');
    const legend = h('p', { class: 'hw-legend', hidden: true }, heartSvg('small'), h('span', {}, 'The heart marks the part to know by heart.'));
    const slot = h('div', { class: 'hw-btns' });
    const judge = judgeBar({ onGot: () => got(), onHelp: () => help() });
    judge.hide();
    const hint = h('p', { class: 'hw-note', hidden: true, role: 'status' });
    const tried = h('button', { class: 'btn small hw-tried', type: 'button', onclick: () => {
      el.dataset.revealed = '1'; el.dataset.state = 'heard';
      tiles.el.classList.remove('plain');
      chip.textContent = 'Say it together. Then read it';
      legend.hidden = false; fadeIn(legend);
      tiles.hearts.forEach((t) => { t.classList.add('lit'); T.later(() => t.classList.remove('lit'), 1200); });
      if (!reduced()) tiles.hearts.forEach((t) => popAnim(t.querySelector('.hw-heart')));
      slot.replaceChildren(hearBtn('Hear it', () => sayWord(w, prompt, () => g !== gen), { compact: true }));
      sayWord(w, prompt, () => g !== gen);
      judge.show(); fadeIn(judge.el);
      refresh();
    } }, 'Your child had a go');
    slot.append(tried);
    function got() {
      judge.hide(); hint.hidden = true; chip.textContent = 'You read a heart word!';
      pop(tiles.el, 360); burst(tiles.el);
      finish(g, 1200);
    }
    function help() {
      el.dataset.help = '1';
      legend.hidden = true; hint.hidden = false; hint.textContent = d.tricky; fadeIn(hint);
      chip.textContent = 'Say it together once more';
      sayWord(w, prompt, () => g !== gen);
    }
    return { el: h('div', { class: 'hw-col' }, chip, tiles.el, legend, h('div', { class: 'px-model hw-sayrow' }, prompt.el, slot), hint, judge.el), parts: () => [{ tts: 'Look at the word. Try to read it.' }], script: () => scriptFor('meet', d).say, gist: () => scriptFor('meet', d).gist, speak: () => scriptFor('meet', d).speak };
  }

  // ---- find: three cards, then the phrase ----
  function find(g, prompt, w, d) {
    // the same order every time for one word, so a retry looks the same; the right card is not always in the same place
    const order = [w, ...d.find].map((x, i) => ({ x, k: (i * 7 + w.length * 3 + w.charCodeAt(0)) % 5 })).sort((a, b) => a.k - b.k || a.x.localeCompare(b.x));
    let found = false, misses = 0;
    const chip = h('p', { class: 'px-chip hw-find-chip' }, 'Listen. Then touch the word');
    const cards = order.map(({ x }) => h('button', { class: 'ri-tile wtile hw-w hw-card', type: 'button', 'aria-label': x.length === 1 ? `the word ${x}` : x, dataset: { word: x, right: x === w ? '1' : '0' }, onclick: () => pick(x, cardOf(x)) },
      h('span', { class: 'hw-wheart', 'aria-hidden': 'true' }, heartSvg('small')), faceOf(x, true)));
    const cardOf = (x) => cards[order.findIndex((o) => o.x === x)];
    const row = h('div', { class: 'hw-cards', role: 'group', 'aria-label': 'Three words' }, ...cards);
    const msg = h('p', { class: 'hw-msg', role: 'status' });
    const words = d.phrase.split(' ');
    const phrase = h('div', { class: 'hw-phrase', hidden: true, role: 'group', 'aria-label': 'Read it together' }, ...words.map((x) => h('span', { class: 'hw-pw' + (x.toLowerCase() === w.toLowerCase() ? ' target' : ''), dataset: { word: x.toLowerCase() } }, faceOf(x, true))));
    const judge = judgeBar({ onGot: () => got(), onHelp: () => help() });
    judge.hide();
    el.dataset.found = '0';
    function pick(x, card) {
      if (found) return;
      if (x !== w) {
        if (!reduced()) shake(card);
        misses++; el.dataset.miss = String(misses);
        msg.textContent = 'Not that one. Look again.';
        if (misses >= 2) { cards.find((c) => c.dataset.right === '1').classList.add('hint'); msg.textContent = 'Look for the word the heart is in.'; }
        return;
      }
      found = true; el.dataset.found = '1';
      card.classList.add('found');
      cards.forEach((c) => { if (c !== card) c.classList.add('soft'); });
      sfx.play('star');
      if (!reduced()) popAnim(card);
      burst(card, { count: 8 });
      prompt.hide(); msg.textContent = '';
      chip.textContent = 'Read it together';
      phrase.hidden = false; fadeIn(phrase);
      judge.show(); fadeIn(judge.el);
      refresh();
    }
    function got() {
      judge.hide(); chip.textContent = 'You read it!';
      const ws = [...phrase.children];
      if (!reduced()) ws.forEach((t, i) => animate(t, [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 360, delay: i * 50, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
      burst(phrase);
      finish(g, 1200);
    }
    // Help: read the phrase together, one word at a time, each word lighting in turn; then the child reads it again.
    function help() {
      judge.hide(); el.dataset.help = '1';
      chip.textContent = 'Say it after your grown-up';
      const ws = [...phrase.children];
      ws.forEach((t, i) => T.later(() => { if (g === gen) ws.forEach((x, k) => x.classList.toggle('lit', k === i)); }, i * LIGHT_MS));
      T.later(() => { if (g !== gen) return; ws.forEach((x) => x.classList.remove('lit')); chip.textContent = 'Now read it again'; judge.show(); fadeIn(judge.el); }, ws.length * LIGHT_MS + 200);
    }
    // the grown-up says the word as the step opens: with a recording it plays, without one the prompt shows at once
    T.later(() => { if (g === gen && !found) sayWord(w, prompt, () => g !== gen || found); }, 500);
    return { el: h('div', { class: 'hw-col' }, chip, h('div', { class: 'px-model' }, prompt.el), row, msg, phrase, judge.el), parts: () => [{ tts: 'Listen to your grown-up. Then touch the word.' }], script: () => scriptFor('find', d).say, gist: () => scriptFor('find', d).gist, speak: () => scriptFor('find', d).speak };
  }

  show();
  return {
    el,
    parts: () => (current ? current.parts() : []),
    scriptParts: () => [{ tts: current.speak() }],
    script: () => current.script(),
    gist: () => current.gist(),
    again: () => show(),
    // Next goes through the sub-steps before it leaves the screen
    next: () => { if (at < steps.length - 1) { at++; show(); return true; } return false; },
    cleanup: () => { gen++; T.clear(); },
  };
}
