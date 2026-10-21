import { h, icon } from '../../dom.js';
import { tracePad } from '../../components/trace-pad.js';
import { glyphSvg } from '../../glyphs.js';
import { accentOf } from '../../theme.js';
import { spellings } from '../../lessons.js';

// Task 6: trace the letter with a finger. Nothing here judges the drawing: Next is never held back, so a child who cannot draw
// the letter yet can still move on (the script says so to the grown-up).
// c and k: one sound with two spellings. Two small letter buttons in the top right corner of the pad switch it between them (c first).
export const WRITE_HELP = "I do: draw the letter while your child watches. We do: trace it together, one finger each. You do: your child traces it alone. Start at the dot and follow the arrow. It does not have to look right yet. You can move on any time.";
export const WRITE_HELP_PAIR = "I do: draw the letter while your child watches. We do: trace it together, one finger each. You do: your child traces it alone. Start at the dot and follow the arrow. Then tap the other letter and do it again. Both letters make the same sound. It does not have to look right yet. You can move on any time.";
export function build({ sound, speech }) {
  const letters = spellings(sound);
  let pad = tracePad({ letter: letters[0] });
  const showBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: async () => { showBtn.disabled = true; await pad.showMe(); showBtn.disabled = false; } }, icon('play', 20), 'Show me');
  const clearBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: () => pad.clear() }, icon('eraser', 20), 'Clear');
  const picks = letters.length > 1 ? letters.map((ch, i) => h('button', { class: 'letter-pick', type: 'button', 'aria-pressed': String(i === 0), 'aria-label': 'Trace this letter', dataset: { letter: ch }, onclick: () => {
    if (pad.dataset.letter === ch) return;
    pad.cleanup && pad.cleanup();
    const next = tracePad({ letter: ch });
    next.dataset.letter = ch;
    pad.replaceWith(next); pad = next;
    picks.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.letter === ch)));
  } }, glyphSvg(ch, { color: accentOf(ch), label: 'letter' }))) : [];
  pad.dataset.letter = letters[0];
  const wrap = h('div', { class: 'pad-wrap' }, pad, picks.length ? h('div', { class: 'letter-picks' }, ...picks) : null);
  const el = h('div', { class: 'writing' }, wrap, h('div', { class: 'writing-buttons' }, clearBtn, showBtn));
  const parts = [{ tts: 'Start at the dot. Follow the arrow.' }];
  return {
    el,
    parts: () => parts,
    script: () => (letters.length > 1 ? WRITE_HELP_PAIR : WRITE_HELP),
    gist: () => 'Draw, then your child tries.',
    again: () => { pad.clear(); speech.say(parts); },
    cleanup: () => pad.cleanup && pad.cleanup(),
  };
}
