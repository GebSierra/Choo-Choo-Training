import { h, icon } from '../../dom.js';
import { holdButton } from '../../components/hold-button.js';
import { soundPhrase } from '../../lessons.js';

// Task 3: the only place a child screen leads outside the app, and it sits behind a hold.
export function build({ lesson, sound, curriculum, speech }) {
  const open = () => {
    const w = window.open(curriculum.playlistUrl, '_blank');
    if (w) w.opener = null;
  };
  const el = h('div', { class: 'story' },
    h('div', { class: 'story-art' }, h('span', { class: 'play' }, icon('play', 52))),
    h('h2', {}, 'Time for the sound story.'),
    holdButton({ label: 'Open playlist', caption: 'Hold to open', hint: 'Press and hold', className: 'big', leading: icon('external', 16), onComplete: open }));
  const parts = [{ tts: 'Time for the sound story.' }];
  return {
    el,
    parts: () => parts,
    script: () => `Say: 'Let's watch the ${soundPhrase(sound)} story.' Then press and hold Open playlist and find the video for ${soundPhrase(sound)}. Come back when it ends.`,
    again: () => speech.say(parts),
  };
}
