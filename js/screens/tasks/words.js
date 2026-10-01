import { h, animate, reduced } from '../../dom.js';
import { letterText } from '../../letters.js';
import { wordSvg } from '../../glyphs.js';
import { slideBlend, placeBand } from '../../components/slide-blend.js';
import { accentOf } from '../../theme.js';
import { fit } from '../../lessons.js';

// Task 4: two parts come together into a word. Once the word is shown, a finger slid across it lights the picture (a
// colour wash that follows the finger) and the letters of the word one by one.
export function build({ lesson, speech, refresh }) {
  const list = lesson.sayingWords;
  let i = 0, revealed = false, sayTimer = 0, blend = null, bandWatch = null, bandEl = null;
  const body = h('div', { class: 'merge' });
  const el = h('div', { class: 'words-task' }, body);
  const cur = () => list[i];
  const partsFor = () => [{ tts: cur().parts[0] }, { pause: 350 }, { tts: cur().parts[1] }];

  const teardown = () => { clearTimeout(sayTimer); if (blend) blend.cleanup(); if (bandWatch) bandWatch.stop(); if (bandEl) bandEl.remove(); blend = null; bandWatch = null; bandEl = null; };

  function show() {
    teardown();
    revealed = false;
    const w = cur();
    const tileA = h('div', { class: 'part-tile a' }, h('span', { class: 'emoji' }, w.emoji[0]), h('span', { class: 'word' }, letterText(w.parts[0])));
    const tileB = h('div', { class: 'part-tile b' }, h('span', { class: 'emoji' }, w.emoji[1]), h('span', { class: 'word' }, letterText(w.parts[1])));
    const plus = h('span', { class: 'plus-sign' }, '+');
    const row = h('div', { class: 'parts-row' }, tileA, plus, tileB);
    const merged = h('button', { class: 'merged-tile', type: 'button', 'aria-label': 'Tap to put the parts together' }, h('span', { class: 'q' }, '?'));
    const reveal = () => {
      revealed = true;
      // Slide the two tiles together, then pop the merged tile in.
      animate(tileA, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(88px) scale(.9)', opacity: 0 }], { duration: 260, fill: 'forwards' });
      animate(tileB, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(-88px) scale(.9)', opacity: 0 }], { duration: 260, fill: 'forwards' });
      animate(plus, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
      // The picture twice: dimmed underneath, full colour on top and clipped to the finger's progress.
      const pic = (cls) => h('span', { class: 'emoji stack ' + cls }, w.emoji[1], h('span', { class: 'mini' }, w.emoji[0]));
      const bright = pic('bright');
      bright.style.clipPath = 'inset(0 100% 0 0)';
      const art = wordSvg(w.word, { color: '#1E2140', label: w.word, all: true });
      art.style.maxWidth = `calc(var(--cap, 56px) * ${Number(art.dataset.width) / 66})`; // the word never grows taller than --cap
      const letters = h('span', { class: 'word-letters' }, art);
      const bar = h('span', { class: 'blend-bar', 'aria-hidden': 'true' }, h('i'));
      const band = h('span', { class: 'slide-band', 'aria-hidden': 'true' });
      merged.replaceChildren(h('span', { class: 'wash' }, pic('dim'), bright), letters, bar);
      merged.classList.add('revealed');
      el.append(band); bandEl = band;
      blend = slideBlend({ band, svg: art, host: el, lift: merged, bar, accent: accentOf(lesson.sound), onProgress: (p) => { bright.style.clipPath = `inset(0 ${100 - p * 100}% 0 0)`; }, onTap: tapped });
      bandWatch = placeBand(band, el, letters);
      animate(merged, [{ transform: 'scale(.8)', opacity: 0.4 }, { transform: 'scale(1)', opacity: 1 }], { duration: 360, delay: reduced() ? 0 : 200, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      sayTimer = setTimeout(() => speech.say([{ tts: w.word }]), 260);
    };
    const tapped = () => { if (revealed) speech.say([{ tts: w.word }]); else reveal(); };
    merged.addEventListener('click', () => { if (blend && blend.swallowClick()) return; tapped(); });
    const nextWord = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { i = (i + 1) % list.length; show(); speech.say(partsFor()); } }, 'Next word');
    body.replaceChildren(row, merged, nextWord);
    animate(row, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
    refresh();
  }
  show();
  return {
    el, lockScroll: true,
    parts: () => (revealed ? [{ tts: cur().word }] : partsFor()),
    script: () => `Say the two parts slowly: '${cur().parts[0]} ... ${cur().parts[1]}.' Ask: 'What word?' Tap the ? to show it. Then slide your finger across the picture as you say ${cur().word} slowly.`,
    gist: () => { const p = `${cur().parts[0]} ... ${cur().parts[1]}`; return fit(`Say: ${p}. What word?`, `${p}. What word?`, `${p}?`); },
    again: () => { show(); speech.say(partsFor()); },
    cleanup: teardown,
  };
}
