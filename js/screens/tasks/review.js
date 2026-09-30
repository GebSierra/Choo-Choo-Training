import { h } from '../../dom.js';
import { glyphSvg, drawIn } from '../../glyphs.js';
import { slideTrack } from '../../components/slide-track.js';
import { soundCard } from '../../components/sound-card.js';
import { accentOf } from '../../theme.js';

// Task 1: slide each review letter and say its sound.
export function build({ lesson, curriculum, speech, refresh }) {
  const keys = lesson.review;
  let i = 0;
  const holder = h('div', { class: 'review-body' });
  const dots = h('div', { class: 'review-count' });
  const el = h('div', { class: 'review' }, dots, holder);
  const sound = () => curriculum.sounds[keys[i]];

  function show() {
    const s = sound();
    holder.replaceChildren();
    const g = glyphSvg(s.glyph, { color: accentOf(s.glyph), label: 'review letter' });
    holder.append(h('div', { class: 'letter-card' }, g), slideTrack({ letter: s.glyph, speech, sound: s }), soundCard(s));
    dots.replaceChildren(...keys.map((k, j) => h('i', { class: j === i ? 'on' : '' })));
    drawIn(g, { per: 380 });
    refresh();
  }
  show();
  return {
    el,
    parts: () => { const s = sound(); return [{ clip: s.glyph }, { tts: s.words[0].word }]; },
    script: () => `Slide the letter and say its sound: ${sound().sayItLike}.`,
    again: () => { show(); speech.say([{ clip: sound().glyph }, { tts: sound().words[0].word }]); },
    next: () => { if (i < keys.length - 1) { i++; show(); speech.say([{ clip: sound().glyph }, { tts: sound().words[0].word }]); return true; } return false; },
  };
}
