import { h, icon } from '../../../dom.js';
import { readingItem } from '../../../components/reading-item.js';
import { sparkle } from '../../../components/sparkle.js';
import { timers } from '../../../components/game-kit.js';
import { fadeIn, dotRow } from './kit.js';

const list = (words) => (words.length < 2 ? words.join('') : words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1]);

// Step 5, Read It: "you do". Six words, new ones mixed with review (fit, sat, if, map, fat, sip). The child reads each; the
// grown-up judges (Got it, or Help and the correction script). A word that needed Help comes back once at the end. At the
// end a small results line for the grown-up: "5 of 6 first try. fat came back." setDone(true) after it.
export function build(env) {
  const { data, setDone, refresh } = env;
  const S = data.read;
  const total = S.words.length;
  const T = timers();
  let pos = 0, finished = false;
  const q = [...S.words], firstTry = [], helped = [];
  const dots = dotRow(total);
  const chip = h('p', { class: 'px-chip' }, 'Read it together');
  const holder = h('div', { class: 'rd-holder' });
  const el = h('div', { class: 'proto readit', dataset: { pos: '0', state: 'reading', word: q[0] } }, dots.el, chip, holder);
  const item = readingItem(env, {
    kind: 'word',
    onGot: () => { if (pos < total) firstTry.push(q[pos]); next(); },
    onHelped: () => { if (pos < total) { helped.push(q[pos]); q.push(q[pos]); } next(); },
  });
  holder.append(item.el);

  function show() {
    const back = pos >= total;
    chip.textContent = back ? 'One more try' : 'Read it together';
    el.dataset.pos = String(pos); el.dataset.word = q[pos]; el.dataset.back = back ? '1' : '0';
    dots.set(Math.min(pos, total - 1));
    item.show(q[pos]);
  }
  function next() {
    pos++;
    if (pos < q.length) { show(); refresh(); return; }
    finish();
  }
  function finish() {
    finished = true;
    el.dataset.state = 'done';
    const line = `${firstTry.length} of ${total} first try` + (helped.length ? `. ${list(helped)} came back.` : '!');
    chip.hidden = true; dots.el.hidden = true;
    const card = h('div', { class: 'rd-results', role: 'status' },
      h('span', { class: 'rd-star' }, icon('check', 40)),
      h('p', { class: 'rd-line' }, line),
      h('p', { class: 'rd-note' }, 'For the grown-up'));
    holder.replaceChildren(card);
    fadeIn(card);
    const o = el.getBoundingClientRect(), r = card.getBoundingClientRect();
    sparkle(el, r.left - o.left + r.width / 2, r.top - o.top + 30, { count: 12, size: [10, 22], reach: [40, 90], sound: 'star' });
    T.later(() => setDone(true), 3500); // the grown-up reads the results line before the step moves on
    refresh();
  }

  show();
  return {
    el,
    parts: () => (finished ? [] : [{ tts: 'Read the word.' }]),
    script: () => S.scripts.read,
    gist: () => S.scripts.readGist,
    again: () => { T.clear(); pos = 0; finished = false; q.length = 0; q.push(...S.words); firstTry.length = 0; helped.length = 0; chip.hidden = false; dots.el.hidden = false; el.dataset.state = 'reading'; holder.replaceChildren(item.el); show(); },
    cleanup: () => { item.cleanup(); T.clear(); },
  };
}
