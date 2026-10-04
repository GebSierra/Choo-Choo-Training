import { h } from '../../dom.js';
import { glyphSvg } from '../../glyphs.js';
import { letterText, richText } from '../../letters.js';
import { accentOf } from '../../theme.js';
import { soundPhrase, checkPrompt, fit } from '../../lessons.js';
import { picture } from '../../components/picture.js';
import { shuffle } from '../../components/game-kit.js';

// Ticket Check: one question, big cards. Nothing tells the child right or wrong.
export function build({ lesson, sound, speech, store }) {
  const q = lesson.quickCheck;
  const prompted = checkPrompt(q, store);
  const order = shuffle(q.options);
  const prompt = h('h2', { class: 'check-prompt' });
  prompt.append(h('span', {}, richText(prompted.text, { every: true })));
  const cards = order.map((o) => {
    const face = o.glyph
      ? h('span', { class: 'opt-glyph' }, glyphSvg(o.glyph, { color: accentOf(o.glyph), label: 'letter choice' }))
      : h('span', { class: 'opt-pic' }, picture(o), h('span', { class: 'word' }, letterText(o.word)));
    const b = h('button', { class: 'opt-card', type: 'button', 'aria-pressed': 'false', 'aria-label': o.glyph ? 'letter choice' : o.word, onclick: () => {
      cards.forEach((c) => { c.classList.toggle('picked', c === b); c.setAttribute('aria-pressed', String(c === b)); });
    } }, face);
    return b;
  });
  const el = h('div', { class: 'check' }, prompt, h('div', { class: 'opts n' + cards.length }, cards));
  return {
    el,
    parts: () => prompted.parts,
    script: () => `Say: 'Which one ${q.kind === 'picture' ? 'starts with' : 'says'} ${soundPhrase(sound)}?' Let them touch one. There is no right or wrong here.`,
    gist: () => { const verb = q.kind === 'picture' ? 'starts with' : 'says'; return fit(`Ask: which ${verb} ${soundPhrase(sound)}?`, `Ask: ${soundPhrase(sound)}?`); },
    again: () => { cards.forEach((c) => { c.classList.remove('picked'); c.setAttribute('aria-pressed', 'false'); }); speech.say(prompted.parts); },
  };
}
