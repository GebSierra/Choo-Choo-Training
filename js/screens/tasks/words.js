import { h, animate, reduced } from '../../dom.js';
import { letterText } from '../../letters.js';

// Task 4: two parts come together into a word.
export function build({ lesson, speech, refresh }) {
  const list = lesson.sayingWords;
  let i = 0, revealed = false;
  const body = h('div', { class: 'merge' });
  const el = h('div', { class: 'words-task' }, body);
  const cur = () => list[i];
  const partsFor = () => [{ tts: cur().parts[0] }, { pause: 350 }, { tts: cur().parts[1] }];

  function show() {
    revealed = false;
    const w = cur();
    const tileA = h('div', { class: 'part-tile a' }, h('span', { class: 'emoji' }, w.emoji[0]), h('span', { class: 'word' }, letterText(w.parts[0])));
    const tileB = h('div', { class: 'part-tile b' }, h('span', { class: 'emoji' }, w.emoji[1]), h('span', { class: 'word' }, letterText(w.parts[1])));
    const plus = h('span', { class: 'plus-sign' }, '+');
    const row = h('div', { class: 'parts-row' }, tileA, plus, tileB);
    const merged = h('button', { class: 'merged-tile', type: 'button', 'aria-label': 'Tap to put the parts together' }, h('span', { class: 'q' }, '?'));
    const reveal = () => {
      if (revealed) { speech.say([{ tts: w.word }]); return; }
      revealed = true;
      // Slide the two tiles together, then pop the merged tile in.
      animate(tileA, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(38px)', opacity: 0 }], { duration: 260, fill: 'forwards' });
      animate(tileB, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(-38px)', opacity: 0 }], { duration: 260, fill: 'forwards' });
      animate(plus, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
      merged.replaceChildren(h('span', { class: 'emoji stack' }, w.emoji[1], h('span', { class: 'mini' }, w.emoji[0])), h('span', { class: 'word big' }, letterText(w.word)));
      merged.classList.add('revealed');
      animate(merged, [{ transform: 'scale(.8)', opacity: 0.4 }, { transform: 'scale(1)', opacity: 1 }], { duration: 360, delay: reduced() ? 0 : 200, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      setTimeout(() => speech.say([{ tts: w.word }]), 260);
    };
    merged.addEventListener('click', reveal);
    const nextWord = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { i = (i + 1) % list.length; show(); speech.say(partsFor()); } }, 'Next word');
    body.replaceChildren(row, merged, nextWord);
    animate(row, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
    refresh();
  }
  show();
  return {
    el,
    parts: () => (revealed ? [{ tts: cur().word }] : partsFor()),
    script: () => `I say two parts. You put them together. ${cur().parts[0]} ... ${cur().parts[1]}. What word? Then tap the picture to show the word.`,
    again: () => { show(); speech.say(partsFor()); },
  };
}
