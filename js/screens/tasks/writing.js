import { h, icon } from '../../dom.js';
import { tracePad } from '../../components/trace-pad.js';

// Task 6: trace the letter with a finger.
export function build({ lesson, sound, speech }) {
  const pad = tracePad({ letter: sound.glyph });
  const showBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: async () => { showBtn.disabled = true; await pad.showMe(); showBtn.disabled = false; } }, icon('play', 20), 'Show me');
  const clearBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: () => pad.clear() }, icon('eraser', 20), 'Clear');
  const el = h('div', { class: 'writing' }, pad, h('div', { class: 'writing-buttons' }, clearBtn, showBtn));
  const parts = [{ tts: 'Start at the dot. Follow the arrow.' }];
  return {
    el,
    parts: () => parts,
    script: () => 'Start at the dot. Follow the arrow.',
    again: () => { pad.clear(); speech.say(parts); },
    cleanup: () => pad.cleanup && pad.cleanup(),
  };
}
