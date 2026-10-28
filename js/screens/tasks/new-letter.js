import { h, animate } from '../../dom.js';
import { glyphSvg, drawIn } from '../../glyphs.js';
import { slideTrack } from '../../components/slide-track.js';
import { soundCard } from '../../components/sound-card.js';
import { letterText } from '../../letters.js';
import { picture } from '../../components/picture.js';
import { accentOf } from '../../theme.js';
import { soundPhrase, introParts, fit } from '../../lessons.js';

// Task 2: the new letter, its sound card, the slide track and the example pictures.
export function build({ lesson, sound, speech, store }) {
  const accent = accentOf(sound.glyph);
  // c and k: one sound, two spellings. Both letters sit in the one card, drawn in turn.
  const letters = [sound.glyph, ...(sound.alt || [])];
  const gs = letters.map((ch) => glyphSvg(ch, { color: accent, label: 'new letter' }));
  const draw = () => gs.forEach((x, i) => drawIn(x, { delay: i * 700 }));
  gs.forEach((x, i) => drawIn(x, { delay: 300 + i * 700 })); // started now, not in onShow: the hidden first frame must be there from the start
  const card = h('button', { class: 'letter-card big tappable' + (gs.length > 1 ? ' pair' : ''), type: 'button', 'aria-label': 'Watch the letter being written', onclick: draw }, ...gs);
  const tiles = h('div', { class: 'word-strip' }, sound.words.map((w) => {
    const t = h('button', { class: 'word-tile', type: 'button', 'aria-label': w.word, onclick: () => { speech.say([{ tts: w.word }]); animate(t, [{ transform: 'scale(1)' }, { transform: 'scale(.94)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 260 }); } },
      h('span', { class: 'pic' }, picture(w)), h('span', { class: 'word' }, letterText(w.word, { tint: sound.glyph, level: lesson.number })));
    return t;
  }));
  const track = slideTrack({ letter: sound.glyph });
  const el = h('div', { class: 'new-letter' }, card, soundCard(sound, { lead: true }), track, tiles);
  return {
    el,
    parts: () => introParts(lesson, store),
    // I do, we do, you do: the grown-up models, then they slide together, then the child slides alone.
    script: () => (sound.blend ? `I do: say each pair slowly and smooth: ${sound.pairs.map((p) => p.say).join(', ')}. Each letter keeps its own sound, so glide with no uh in between. We do: slide a finger under the two letters and say it together. You do: your child slides under the letters and says it alone.${sound.parentNote ? ' ' + sound.parentNote : ''}` : `I do: say ${soundPhrase(sound)}. We do: slide a finger under the letter and say it together. You do: your child slides under the letter and says it alone.${sound.parentNote ? ' ' + sound.parentNote : ''}`),
    gist: () => (sound.blend ? fit(`Glide ${sound.sayItLike} as in ${sound.asIn}.`, `Glide ${sound.sayItLike}.`) : fit(`I do: say ${soundPhrase(sound)}.`, `Say ${soundPhrase(sound)}.`)),
    cleanup: () => track.cleanup(),
    again: () => { draw(); speech.say(introParts(lesson, store)); },
  };
}
