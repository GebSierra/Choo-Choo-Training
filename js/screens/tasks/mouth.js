import { h, animate, icon } from '../../dom.js';
import { grownupSvg } from '../../art/grownup.js';
import { sayPrompt, saySound, sayLine, clipReady } from '../../components/say-sound.js';
import { timers } from '../../components/game-kit.js';
import { soundPhrase } from '../../lessons.js';

// Watch My Mouth: the step after New Sound. One picture of a grown-up with a finger at the side of the mouth, the grown-up's
// instruction, the sound as a recording (or the prompt "Say: mmm" when there is none), and an optional "How to make this sound"
// panel (lips, teeth, tongue, voice on or off). The phone's voice never says the sound: its only words here are "Watch your
// grown-up's mouth." for the child.
export const MOUTH_SCRIPT = 'It helps your child to see someone else make the sound. Put a finger at the side of your mouth (this draws their eyes to your mouth) and ask your child to look at your mouth. Make the sound, then have them say it after you.';

export function build(env) {
  const { sound, speech, refresh } = env;
  const key = sound.glyph;
  const T = timers();
  const prompt = sayPrompt();
  let gen = 0;
  const stale = (g) => () => g !== gen;

  const art = h('div', { class: 'mouth-art' }, grownupSvg());
  const hear = h('button', { class: 'btn small ghost px-hear', type: 'button', 'aria-label': 'Hear the sound', onclick: () => saySound(env, key, prompt, { stale: stale(gen) }) }, icon('speaker', 22), h('span', { class: 'px-hear-label' }, 'Hear it'));

  // "How to make this sound": a small panel under the buttons, closed until asked for.
  const m = sound.mouth || { voice: null, text: sound.howTo };
  const panelId = 'mouth-how-' + key;
  const panel = h('section', { class: 'mouth-how', id: panelId, hidden: true, 'aria-label': 'How to make this sound' },
    h('p', { class: 'mouth-how-title' }, `How to make ${soundPhrase(sound)}`, m.voice === null ? null : h('span', { class: 'mouth-voice ' + (m.voice ? 'on' : 'off') }, m.voice ? 'Voice on' : 'Voice off')),
    h('p', { class: 'mouth-how-text' }, m.text));
  const how = h('button', { class: 'btn small ghost mouth-how-btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': panelId, onclick: () => {
    const open = panel.hidden;
    panel.hidden = !open;
    how.setAttribute('aria-expanded', String(open));
    how.querySelector('.mouth-how-label').textContent = open ? 'Hide' : 'How to make this sound';
    if (open) animate(panel, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220 });
    refresh();
  } }, icon('mouth', 22), h('span', { class: 'mouth-how-label' }, 'How to make this sound'));

  const el = h('div', { class: 'proto mouth-task', dataset: { sound: key } }, h('div', { class: 'ns-body' }, art, prompt.el, h('div', { class: 'px-btns' }, hear, how), panel));

  // With no recording to play, the prompt is shown at once; with one, only if the shell's auto-play finds it missing.
  if (!clipReady(env, key)) prompt.show(sayLine(key, env.curriculum.sounds), key);
  else T.later(() => { if (speech.missing.includes(key)) prompt.show(sayLine(key, env.curriculum.sounds), key); }, 1600);

  return {
    el,
    parts: () => [{ tts: "Watch your grown-up's mouth." }, { clip: key }],
    script: () => MOUTH_SCRIPT,
    gist: () => 'Finger at mouth. Say it.',
    again: () => { gen++; prompt.hide(); saySound(env, key, prompt, { stale: stale(gen) }); },
    cleanup: () => { gen++; T.clear(); },
  };
}
