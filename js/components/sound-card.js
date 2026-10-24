import { h, icon } from '../dom.js';
import { richText } from '../letters.js';
import { accentOf } from '../theme.js';
import { soundCardLines, isTwoLetterSound } from '../lessons.js';

// "This letter says mmm. Hold it. Do not say muh." plus how to make the sound.
// lead: the parent carries the sound, so on New Sound this card is the main instruction and is drawn larger.
export function soundCard(sound, { lead = false } = {}) {
  const accent = accentOf(sound.glyph);
  if (sound.blend) return blendCard(sound, lead, accent);
  const lines = soundCardLines(sound);
  const first = h('p', { class: 'sc-first' });
  if (isTwoLetterSound(sound)) { // two letters, one sound (sh, qu, ff ll ss zz ...)
    first.append(sound.glyph === 'ff' ? 'Two of the same letter make one sound: ' : 'These two letters make one sound: ');
    first.append(h('strong', {}, sound.sayItLike), sound.asIn ? `, as in ${sound.asIn}.` : '.');
  } else if (sound.alt && sound.alt.length) { // c and k: one sound, two spellings
    first.append(`The letters ${[sound.glyph, ...sound.alt].join(' and ')} make the same sound: `);
    first.append(h('strong', {}, sound.sayItLike), '.');
  } else {
    first.append('This letter says ');
    first.append(h('strong', {}, sound.sayItLike === 'a' ? richText('a') : sound.sayItLike));
    first.append(sound.asIn ? ` as in ${sound.asIn}.` : '.');
  }
  const rest = lines.slice(1);
  return h('div', { class: 'sound-card' + (lead ? ' lead' : '') + (sound.alt && sound.alt.length ? ' pair' : ''), style: { '--accent': accent } },
    h('span', { class: 'sc-ic' }, icon('speaker', 20)),
    h('div', { class: 'sc-text' }, first, rest.length ? h('p', { class: 'sc-rules' }, rest.join(' ')) : null, h('p', { class: 'sc-how' }, richText(sound.howTo, { every: true }))));
}

// A blend (World 5) is not one sound: each letter keeps its own sound and the two glide together. One line for each pair: "s + t: ssst-, as in last".
function blendCard(sound, lead, accent) {
  const first = h('p', { class: 'sc-first' }, 'Two sounds, glided together. Each letter keeps its own sound.');
  const rows = h('ul', { class: 'blend-rows' }, sound.pairs.map((p) => h('li', { dataset: { pair: p.g } }, h('span', { class: 'br-pair' }, p.g.split('').join(' + ')), h('span', { class: 'br-say' }, h('strong', {}, p.say), p.asIn ? `, as in ${p.asIn}` : ''))));
  return h('div', { class: 'sound-card blend-card' + (lead ? ' lead' : ''), style: { '--accent': accent } },
    h('span', { class: 'sc-ic' }, icon('speaker', 20)),
    h('div', { class: 'sc-text' }, first, rows, sound.doNotSay ? h('p', { class: 'sc-rules' }, `Do not say ${sound.doNotSay}.`) : null, h('p', { class: 'sc-how' }, richText(sound.howTo, { every: true }))));
}
