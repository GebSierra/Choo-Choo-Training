import { h } from '../dom.js';
import { speakButton } from '../components/speak-button.js';

// Debug route #/lab: exercise speech and (later) the slide track and trace pad.
export function labScreen({ speech, curriculum }) {
  const log = h('pre', { id: 'lab-log', class: 'lab-log' });
  const say = (label, parts) => h('button', { class: 'lab-btn', type: 'button', onclick: async () => {
    log.textContent += `> ${label}\n`;
    await speech.say(parts);
    log.textContent += `done ${label}\n`;
  } }, label);
  const wrap = h('div', { class: 'debug' },
    h('h1', {}, 'Lab'),
    h('div', { class: 'lab-row' },
      say('speak moon', [{ tts: 'moon' }]),
      say('clip m', [{ clip: 'm' }]),
      say('clip a', [{ clip: 'a' }]),
      say('clip s', [{ clip: 's' }]),
      say('mixed', [{ tts: 'Today we learn a new sound:' }, { clip: 'm' }, { tts: 'moon' }]),
      say('missing clip', [{ tts: 'before' }, { src: 'assets/audio/sounds/none.webm' }, { tts: 'after' }]),
      say('single letter (refused)', [{ tts: 'm' }, { tts: 'sss' }, { tts: 'done' }]),
    ),
    h('div', { class: 'lab-row' }, speakButton({ speech, getParts: () => [{ tts: 'moon' }], label: 'Hear moon' })),
    h('div', { id: 'lab-extra' }),
    log);
  return wrap;
}
