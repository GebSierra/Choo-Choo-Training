import { h, icon } from '../../dom.js';
import { tracePad } from '../../components/trace-pad.js';

// Task 6: trace the letter with a finger. Nothing here judges the drawing: Next is never held back, so a child who cannot draw
// the letter yet can still move on (the script says so to the grown-up).
export const WRITE_HELP = "I do: draw the letter while your child watches. We do: trace it together, one finger each. You do: your child traces it alone. Start at the dot and follow the arrow. It does not have to look right yet. Your child can still move on.";
export function build({ sound, speech }) {
  const pad = tracePad({ letter: sound.glyph });
  const showBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: async () => { showBtn.disabled = true; await pad.showMe(); showBtn.disabled = false; } }, icon('play', 20), 'Show me');
  const clearBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: () => pad.clear() }, icon('eraser', 20), 'Clear');
  const el = h('div', { class: 'writing' }, pad, h('div', { class: 'writing-buttons' }, clearBtn, showBtn));
  const parts = [{ tts: 'Start at the dot. Follow the arrow.' }];
  return {
    el,
    parts: () => parts,
    script: () => WRITE_HELP,
    gist: () => 'Draw it, then they try.',
    again: () => { pad.clear(); speech.say(parts); },
    cleanup: () => pad.cleanup && pad.cleanup(),
  };
}
