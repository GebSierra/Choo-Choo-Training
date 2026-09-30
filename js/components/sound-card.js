import { h, icon } from '../dom.js';
import { richText } from '../letters.js';
import { accentOf } from '../theme.js';
import { soundCardLines } from '../lessons.js';

// "This letter says mmm. Hold it. Do not say muh." plus how to make the sound.
export function soundCard(sound) {
  const accent = accentOf(sound.glyph);
  const lines = soundCardLines(sound);
  const first = h('p', { class: 'sc-first' });
  first.append('This letter says ');
  first.append(h('strong', {}, sound.sayItLike === 'a' ? richText('a') : sound.sayItLike));
  first.append(sound.asIn ? `, as in ${sound.asIn}.` : '.');
  const rest = lines.slice(1);
  return h('div', { class: 'sound-card', style: { '--accent': accent } },
    h('span', { class: 'sc-ic' }, icon('speaker', 20)),
    h('div', { class: 'sc-text' }, first, rest.length ? h('p', { class: 'sc-rules' }, rest.join(' ')) : null, h('p', { class: 'sc-how' }, richText(sound.howTo))));
}
