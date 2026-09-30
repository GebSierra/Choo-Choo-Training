import { h, animate } from '../../dom.js';
import { glyphSvg, drawIn } from '../../glyphs.js';
import { slideTrack } from '../../components/slide-track.js';
import { soundCard } from '../../components/sound-card.js';
import { letterText } from '../../letters.js';
import { accentOf } from '../../theme.js';

// Task 2: the new letter, its sound card, the slide track and the example pictures.
export function build({ lesson, sound, speech, refresh }) {
  const accent = accentOf(sound.glyph);
  const g = glyphSvg(sound.glyph, { color: accent, label: 'new letter' });
  const card = h('button', { class: 'letter-card big tappable', type: 'button', 'aria-label': 'Watch the letter being written', onclick: () => drawIn(g) }, g);
  const tiles = h('div', { class: 'word-strip' }, sound.words.map((w) => {
    const pic = w.image
      ? h('img', { src: w.image, alt: '', width: 120, height: 120, loading: 'eager', draggable: 'false' })
      : h('span', { class: 'emoji' }, w.emoji);
    const t = h('button', { class: 'word-tile', type: 'button', 'aria-label': w.word, onclick: () => { speech.say([{ tts: w.word }]); animate(t, [{ transform: 'scale(1)' }, { transform: 'scale(.94)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 260 }); } },
      h('span', { class: 'pic' }, pic), h('span', { class: 'word' }, letterText(w.word, { tint: sound.glyph })));
    return t;
  }));
  const el = h('div', { class: 'new-letter' }, card, soundCard(sound), slideTrack({ letter: sound.glyph, speech, sound }), tiles);
  return {
    el,
    parts: () => lesson.intro,
    script: () => `Say ${sound.sayItLike}. Now you try. Slide the letter as you say it.`,
    onShow: () => drawIn(g),
    again: () => { drawIn(g); speech.say(lesson.intro); },
  };
}
