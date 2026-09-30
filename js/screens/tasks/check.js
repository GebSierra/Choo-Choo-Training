import { h, animate } from '../../dom.js';
import { glyphSvg } from '../../glyphs.js';
import { letterText, richText } from '../../letters.js';
import { accentOf } from '../../theme.js';

// Task 7: one question, big cards. Nothing tells the child right or wrong.
export function build({ lesson, sound, speech }) {
  const q = lesson.quickCheck;
  const order = [...q.options].sort(() => Math.random() - 0.5);
  const prompt = h('h2', { class: 'check-prompt' });
  prompt.append(h('span', {}, richText(q.promptText)));
  const cards = order.map((o) => {
    const face = o.glyph
      ? h('span', { class: 'opt-glyph' }, glyphSvg(o.glyph, { color: accentOf(o.glyph), label: 'letter choice' }))
      : h('span', { class: 'opt-pic' }, h('span', { class: 'emoji' }, o.emoji), h('span', { class: 'word' }, letterText(o.word)));
    const b = h('button', { class: 'opt-card', type: 'button', 'aria-pressed': 'false', 'aria-label': o.glyph ? 'letter choice' : o.word, onclick: () => {
      cards.forEach((c) => { c.classList.toggle('picked', c === b); c.setAttribute('aria-pressed', String(c === b)); });
      animate(b, [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }], { duration: 160, fill: 'forwards' }).finished.then(() => {}).catch(() => {});
    } }, face);
    return b;
  });
  const el = h('div', { class: 'check' }, prompt, h('div', { class: 'opts n' + cards.length }, cards));
  return {
    el,
    parts: () => q.prompt,
    script: () => 'Ask the question. Let them tap.',
    again: () => { cards.forEach((c) => { c.classList.remove('picked'); c.setAttribute('aria-pressed', 'false'); }); speech.say(q.prompt); },
  };
}
