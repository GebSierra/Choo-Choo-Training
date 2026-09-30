import { h } from '../dom.js';
import { speakButton } from '../components/speak-button.js';
import { slideTrack } from '../components/slide-track.js';
import { tracePad } from '../components/trace-pad.js';

// Debug route #/lab: exercise speech and (later) the slide track and trace pad.
export function labScreen({ speech, curriculum }) {
  const log = h('pre', { id: 'lab-log', class: 'lab-log' });
  const say = (label, parts) => h('button', { class: 'lab-btn', type: 'button', onclick: async () => {
    log.textContent += `> ${label}\n`;
    await speech.say(parts);
    log.textContent += `done ${label}\n`;
  } }, label);
  const pad = tracePad({ letter: 'a' });
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
    h('div', { id: 'lab-extra', class: 'lab-extra' },
      slideTrack({ letter: 'm', speech, sound: curriculum.sounds.m }),
      pad,
      h('div', { class: 'lab-row' }, h('button', { class: 'lab-btn', id: 'lab-show', type: 'button', onclick: () => pad.showMe() }, 'show me'), h('button', { class: 'lab-btn', id: 'lab-clear', type: 'button', onclick: () => pad.clear() }, 'clear'))),
    log);
  return wrap;
}
