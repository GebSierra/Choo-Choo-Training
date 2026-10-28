import { h, animate } from '../../dom.js';
import { glyphSvg, drawIn } from '../../glyphs.js';
import { slideTrack } from '../../components/slide-track.js';
import { soundCard } from '../../components/sound-card.js';
import { letterText } from '../../letters.js';
import { picture } from '../../components/picture.js';
import { accentOf } from '../../theme.js';
import { soundPhrase, introParts, fit } from '../../lessons.js';
import { wordPartsOf } from '../../order.js';

// World 6: what the grown-up does for a word part. An ending: say the base word, then the ending, then the whole word; slide under the base word and then the ending car.
const exampleOf = (sound) => { const p = sound.parts && sound.parts[0] && sound.parts[0].asIn ? wordPartsOf(sound.parts[0].asIn) : null; return p ? { word: sound.parts[0].asIn, base: p.parts[0], say: sound.parts[0].say } : null; };
const partScript = (sound) => {
  const ex = exampleOf(sound), note = sound.parentNote ? ' ' + sound.parentNote : '';
  if (sound.part === 'ending' && ex) return `I do: say the base word, then the ending, then the whole word: ${ex.base} ... ${ex.say} ... ${ex.word}. We do: slide a finger under the base word, then under the ending car, and say it together. You do: your child slides and says the word alone.${note}`;
  if (sound.part === 'chunk' && ex) return `I do: clap the beats, then say each chunk, then the whole word: ${ex.say.replace('-', ' ... ')} ... ${ex.word}. We do: slide a finger under each chunk and say it together. You do: your child slides and says the word alone.${note}`;
  return `Say each word, find the base word and its ending (or clap the beats), then say the whole word. Your child slides a finger under it and says it.${note}`;
};
const partGist = (sound) => { const ex = exampleOf(sound); if (sound.part === 'ending' && ex) return fit(`Say ${ex.base}, then ${ex.say}: ${ex.word}.`, `${ex.base} + ${ex.say} = ${ex.word}`, 'Base word, then ending.'); if (sound.part === 'chunk' && ex) return fit(`Clap ${ex.say}, then glue.`, 'Clap, split, glue.'); return 'Endings and bigger words.'; };

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
    script: () => (sound.part ? partScript(sound) : sound.blend ? `I do: say each pair slowly and smooth: ${sound.pairs.map((p) => p.say).join(', ')}. Each letter keeps its own sound, so glide with no uh in between. We do: slide a finger under the two letters and say it together. You do: your child slides under the letters and says it alone.${sound.parentNote ? ' ' + sound.parentNote : ''}` : `I do: say ${soundPhrase(sound)}. We do: slide a finger under the letter and say it together. You do: your child slides under the letter and says it alone.${sound.parentNote ? ' ' + sound.parentNote : ''}`),
    gist: () => (sound.part ? partGist(sound) : sound.blend ? fit(`Glide ${sound.sayItLike} as in ${sound.asIn}.`, `Glide ${sound.sayItLike}.`) : fit(`I do: say ${soundPhrase(sound)}.`, `Say ${soundPhrase(sound)}.`)),
    cleanup: () => track.cleanup(),
    again: () => { draw(); speech.say(introParts(lesson, store)); },
  };
}
