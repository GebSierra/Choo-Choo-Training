import { openOutside } from '../../components/grown-gate.js';
import { h, icon } from '../../dom.js';
import { holdButton } from '../../components/hold-button.js';
import { soundPhrase, fit } from '../../lessons.js';
import { shake } from '../../components/game-kit.js';

// Task 3: the only place a child screen leads outside the app, and it sits behind a hold and then a grown-up check.
export function build({ sound, curriculum, speech }) {
  const open = () => openOutside(curriculum.playlistUrl);
  const hold = holdButton({ label: 'Open playlist', caption: 'Hold to open', hint: 'Press and hold', className: 'big', leading: icon('external', 16), onComplete: open });
  // The picture is only decoration, but a child taps it: it answers by wiggling the real button.
  const art = h('div', { class: 'story-art', 'aria-hidden': 'true', onclick: () => shake(hold.button) }, h('span', { class: 'play' }, icon('play', 28)));
  const el = h('div', { class: 'story' }, art, h('h2', {}, 'Time for the sound story.'), hold);
  const parts = [{ tts: 'Time for the sound story.' }];
  return {
    el,
    parts: () => parts,
    script: () => `Say: 'Let's watch the ${soundPhrase(sound)} story.' Then press and hold Open playlist and find the video for ${soundPhrase(sound)}. Come back when it ends.`,
    gist: () => fit(`Say: ${soundPhrase(sound)} story. Hold button.`, `Say: ${soundPhrase(sound)} story.`),
    again: () => speech.say(parts),
    cleanup: hold.cleanup,
  };
}
