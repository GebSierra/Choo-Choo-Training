import { h, icon } from '../dom.js';

// The round speaker button. Tapping speaks; tapping while speaking cancels.
// getParts is called at tap time so the button always speaks the current task state.
export function speakButton({ speech, getParts, label = 'Hear it', accent }) {
  const bars = h('span', { class: 'bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const dot = h('span', { class: 'missing-dot', title: 'Recorded sound missing', hidden: true });
  const btn = h('button', {
    class: 'speak-btn', type: 'button', 'aria-label': label, style: accent ? { '--accent': accent } : {},
    onclick: () => { if (speech.speaking) speech.cancel(); else speech.say(getParts()); },
  }, icon('speaker', 26), bars, dot);
  let wasConnected = false;
  const sync = () => {
    if (btn.isConnected) wasConnected = true; else if (wasConnected) { off(); return; }
    btn.classList.toggle('is-speaking', speech.speaking); dot.hidden = speech.missing.length === 0;
  };
  const off = speech.onChange(sync);
  sync();
  btn.cleanup = off;
  return btn;
}
