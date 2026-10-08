import { h, icon } from '../../dom.js';
import { glyphSvg, drawIn } from '../../glyphs.js';
import { slideTrack } from '../../components/slide-track.js';
import { soundCard } from '../../components/sound-card.js';
import { accentOf } from '../../theme.js';
import { soundPhrase, fit } from '../../lessons.js';

// Task 1: slide each review letter and say its sound.
export function build({ lesson, curriculum, speech, refresh }) {
  const keys = lesson.review;
  let i = 0;
  const holder = h('div', { class: 'review-body' });
  const dots = h('div', { class: 'review-count' });
  const el = h('div', { class: 'review' }, dots, holder);
  const sound = () => curriculum.sounds[keys[i]];
  let track = null, revealed = false;
  const say = () => speech.say([{ clip: sound().glyph }, { tts: sound().words[0].word }]);

  // Retrieval first: the answer (the sound card and the recording) stays hidden until the grown-up taps "Show the sound" after the
  // child has tried, or presses Again.
  function reveal() {
    if (revealed) return;
    revealed = true;
    const slot = holder.querySelector('.review-help');
    if (slot) slot.replaceWith(soundCard(sound()));
    el.dataset.revealed = '1';
    say();
    refresh();
  }
  function show() {
    revealed = false;
    el.dataset.revealed = '0';
    const s = sound();
    if (track) track.cleanup();
    holder.replaceChildren();
    const g = glyphSvg(s.glyph, { color: accentOf(s.glyph), label: 'review letter' });
    track = slideTrack({ letter: s.glyph });
    holder.append(h('div', { class: 'letter-card' }, g), track, h('button', { class: 'btn small ghost review-help', type: 'button', onclick: reveal }, icon('speaker', 20), 'Show the sound'));
    dots.replaceChildren(...(keys.length > 1 ? keys.map((k, j) => h('i', { class: j === i ? 'on' : '' })) : []));
    drawIn(g, { per: 380 });
    refresh();
  }
  show();
  return {
    el,
    parts: () => (revealed ? [{ clip: sound().glyph }, { tts: sound().words[0].word }] : [{ tts: 'What sound does this letter make?' }]),
    // Review: the child tries first. Stuck: say it together. Still stuck: the grown-up says it, the child says it after.
    script: () => 'Ask your child to say the sound of this letter. Your child can slide a finger under it. If they are stuck, say the sound together. Still stuck? Say it yourself, then have your child say it after you.',
    gist: () => 'Child says the sound first.',
    again: () => { show(); reveal(); },
    cleanup: () => track.cleanup(),
    next: () => { if (i < keys.length - 1) { i++; show(); return true; } return false; },
  };
}
