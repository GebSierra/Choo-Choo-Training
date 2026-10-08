import { h, animate, reduced, icon } from '../../../dom.js';
import { wordSvg } from '../../../glyphs.js';
import { letterText } from '../../../letters.js';
import { readingItem } from '../../../components/reading-item.js';
import { sparkle } from '../../../components/sparkle.js';
import { timers } from '../../../components/game-kit.js';
import { sfx } from '../../../sfx.js';
import { storyScene, samFace, matSvg } from '../../../art/proto-art.js';
import { picture } from '../../../components/picture.js';
import { INK, hearBtn, fadeIn, pop, dotRow } from './kit.js';

const PACE_MS = 3200; // "Again, faster": each line glows for this long, in turn

// A sentence as big words (our own glyphs for the taught letters, so "a" is single-story).
function lineEl(text, cls = '') {
  return h('span', { class: 'rs-line-words ' + cls, role: 'text', 'aria-label': text }, ...text.split(' ').map((w) => {
    const s = wordSvg(w, { color: INK, all: true, font: true, label: w.replace(/[^A-Za-z]/g, '') });
    s.style.width = `calc(var(--cap, 44px) * ${Number(s.dataset.width) / Number(s.dataset.height)})`;
    s.style.maxWidth = '100%';
    return h('span', { class: 'rs-w' }, s);
  }));
}

// Step 7, Read a Story: three decodable lines, shown big, one at a time, each with its picture. The child reads each line
// aloud; the grown-up judges per line (Got it, or Help: tap the tricky word, its blend model, "Read the whole line again").
// A line that needed Help comes back once. After the lines come the whole story on one page, where "Hear the story" (the
// phone's voice, a fluent model) appears only now that the child has read it, and "Again, faster" lets them reread; then one
// meaning question, "What is fat?", with three picture choices. A wrong pick gets "Let's look again" and the line lights.
export function build(env) {
  const { data, fill, speech, setDone, refresh } = env;
  const S = data.story;
  const lines = S.lines, Q = S.question;
  const T = timers();
  let phase = 'lines', pos = 0, gen = 0, reads = 1, answered = false;
  const q = lines.map((l, i) => i), returned = new Set();
  const host = h('div', { class: 'rs-host' });
  const el = h('div', { class: 'proto story', dataset: { phase: 'lines', pos: '0' } }, host);
  const dots = dotRow(lines.length);
  const item = readingItem(env, { kind: 'line', heart: data.heart, onGot: () => nextLine(), onHelped: () => { if (!returned.has(q[pos])) { q.push(q[pos]); returned.add(q[pos]); } nextLine(); } });
  const storyText = () => lines.map((l) => l.text).join(' ');

  // ---- the lines ----
  function showLine() {
    const l = lines[q[pos]];
    el.dataset.pos = String(pos); el.dataset.line = String(q[pos]);
    const scene = h('div', { class: 'rs-scene' }, storyScene(l.scene));
    host.replaceChildren(h('div', { class: 'rs-pad' }, dots.el, scene, item.el));
    dots.set(Math.min(pos, lines.length - 1));
    item.show(l.text);
    fadeIn(scene);
  }
  function nextLine() {
    pos++;
    if (pos < q.length) { showLine(); refresh(); return; }
    showPage(); refresh();
  }

  // ---- the whole story, to reread ----
  function showPage() {
    phase = 'page'; el.dataset.phase = 'page'; gen++; T.clear();
    const rows = lines.map((l, i) => h('div', { class: 'rs-row', dataset: { line: String(i) } }, h('span', { class: 'rs-thumb' }, storyScene(l.scene)), lineEl(l.text, 'small')));
    const page = h('div', { class: 'rs-page' }, ...rows);
    const faster = h('button', { class: 'btn small ghost', type: 'button', onclick: () => pace() }, icon('redo', 20), 'Again, faster');
    const hear = hearBtn('Hear the story', () => speech.say([{ tts: storyText() }]));
    const msg = h('p', { class: 'rs-msg' }, 'You read it all!');
    const ask = h('button', { class: 'btn small px-next', type: 'button', onclick: () => { showQuestion(); refresh(); } }, 'A question');
    host.replaceChildren(h('div', { class: 'rs-pad' }, msg, page, h('div', { class: 'px-btns' }, hear, faster, ask)));
    fadeIn(page);
    function pace() {
      const g = ++gen; T.clear();
      reads++; el.dataset.reads = String(reads);
      msg.textContent = 'Again, a little faster.';
      rows.forEach((r) => r.classList.remove('pace'));
      rows.forEach((r, i) => T.later(() => { if (g === gen) { rows.forEach((x, k) => x.classList.toggle('pace', k === i)); } }, i * PACE_MS));
      T.later(() => { if (g === gen) { rows.forEach((x) => x.classList.remove('pace')); msg.textContent = 'Well read!'; } }, rows.length * PACE_MS);
    }
  }

  // ---- the meaning question ----
  function showQuestion() {
    phase = 'question'; el.dataset.phase = 'question'; gen++; T.clear();
    answered = false;
    const recheck = h('div', { class: 'rs-recheck', hidden: true }, lineEl(lines[Q.line].text));
    const msg = h('p', { class: 'rs-msg' });
    const face = (name) => (name === 'Sam' ? samFace() : name === 'mat' ? matSvg() : picture({ word: name, image: data.pictures[name].image }));
    const buttons = Q.choices.map((name) => {
      const b = h('button', { class: 'rs-choice', type: 'button', dataset: { choice: name.toLowerCase() }, 'aria-label': name, onclick: () => pick(name, b) },
        h('span', { class: 'rs-choice-pic' }, face(name)), h('span', { class: 'rs-choice-word' }, letterText(name)));
      return b;
    });
    const ask = h('div', { class: 'rs-ask' }, h('p', { class: 'rs-q' }, Q.say), hearBtn('Hear it', () => speech.say([{ tts: Q.say }])));
    host.replaceChildren(h('div', { class: 'rs-pad' }, ask, recheck, h('div', { class: 'rs-choices' }, ...buttons), msg));
    fadeIn(host.firstChild);
    function pick(name, b) {
      if (answered) return;
      if (name.toLowerCase() === Q.answer) {
        answered = true; el.dataset.answer = 'right';
        buttons.forEach((x) => { x.disabled = x !== b; });
        b.classList.add('right');
        recheck.hidden = true;
        msg.textContent = Q.right;
        pop(b, 360);
        sfx.play('star');
        const r = b.getBoundingClientRect(), o = el.getBoundingClientRect();
        sparkle(el, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 14, size: [10, 24], reach: [44, 100] });
        speech.say([{ tts: Q.right }]);
        T.later(() => setDone(true), 2200); // the chime and "Yes! It is a fat map." are heard first
        return;
      }
      // a meaning check, never a guess prompt: a calm "look again" and the line lights up; the pick softly steps back
      el.dataset.answer = 'wrong';
      b.disabled = true; b.classList.add('soft');
      msg.textContent = Q.wrong;
      recheck.hidden = false;
      if (!reduced()) animate(recheck, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1.03)', offset: 0.6 }, { opacity: 1, transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      speech.say([{ tts: Q.wrong }]);
    }
  }

  showLine();
  return {
    el,
    parts: () => (phase === 'lines' ? [{ tts: 'Read the line.' }] : phase === 'page' ? [{ tts: storyText() }] : [{ tts: Q.say }]),
    script: () => fill(S.scripts[phase === 'lines' ? 'line' : phase], ''),
    gist: () => fill(S.scripts[(phase === 'lines' ? 'line' : phase) + 'Gist'], ''),
    again: () => { gen++; T.clear(); phase = 'lines'; el.dataset.phase = 'lines'; pos = 0; q.length = 0; q.push(...lines.map((_, i) => i)); returned.clear(); reads = 1; showLine(); },
    // Next goes lines, then the page, then the question, before it leaves the step
    next: () => { if (phase === 'lines') { showPage(); return true; } if (phase === 'page') { showQuestion(); return true; } return false; },
    cleanup: () => { gen++; T.clear(); item.cleanup(); },
  };
}
