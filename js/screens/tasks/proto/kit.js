import { h, animate, icon } from '../../../dom.js';
import { slowSounds, soundText } from '../../../scripts.js';
import { picture, emojiFrame } from '../../../components/picture.js';
import { matSvg } from '../../../art/proto-art.js';
import { blendReady, blendLine } from '../../../components/say-sound.js';

// Small pieces the prototype lesson's steps share (js/screens/tasks/proto/*.js).
export const INK = '#1E2140';

// Scripts hold {blend:fit} (the stretched word), {blend:@} (the word on screen) and {sound:f}. The stretched text is always
// built by slowSounds and soundText from the sounds table, never written by hand.
export const makeFill = (sounds) => (text, word = '') => text.replace(/\{(blend|sound):([A-Za-z@]+)\}/g, (_, kind, x) => {
  const w = (x === '@' ? word : x).toLowerCase();
  return kind === 'blend' ? slowSounds(w, sounds) : soundText(w, sounds);
});

// A word's picture: one of the app's picture tiles, an emoji, or our own drawing (the mat).
export function wordPicture(data, word, cls = '') {
  const p = data.pictures[word];
  if (!p) return null;
  if (p.image) return picture({ word, image: p.image }, cls);
  if (p.emoji) return emojiFrame(p.emoji, cls);
  return h('span', { class: 'pic-frame art-frame ' + cls, role: 'img', 'aria-label': word }, matSvg());
}

// compact: on a short screen only the speaker shows, so the button fits on one line beside the grown-up's prompt.
export const hearBtn = (label, onclick, { compact = false } = {}) => h('button', { class: 'btn small ghost px-hear' + (compact ? ' compact' : ''), type: 'button', 'aria-label': label, onclick }, icon('speaker', 22), h('span', { class: 'px-hear-label' }, label));
export const fadeIn = (el, ms = 260) => animate(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: ms });
export const pop = (el, ms = 360) => animate(el, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: ms, easing: 'cubic-bezier(.34,1.56,.64,1)' });

// When a step opens, the shell's auto-speak plays parts() (a blend recording, if one can play). This shows the grown-up
// prompt at once when no recording will play, and shows it after the attempt if the recording turns out to be missing.
export function modelOnEntry(ctx, word, prompt, T, stale = () => false) {
  const w = word.toLowerCase();
  if (!blendReady(ctx, w)) { prompt.show(blendLine(w, ctx.curriculum.sounds), w); return; }
  T.later(() => { if (!stale() && ctx.speech.missingBlends.includes(w)) prompt.show(blendLine(w, ctx.curriculum.sounds), w); }, 1500);
}

// What the shell's speaker plays for a blend model: the recording when one can play, else a spoken instruction (never a sound).
export const modelParts = (ctx, word, instruction) => (blendReady(ctx, word.toLowerCase()) ? [{ blend: word.toLowerCase() }] : [{ tts: instruction }]);

// The little dots that count the cards of a phase (done ones filled, the current one wide).
export function dotRow(n) {
  const dots = Array.from({ length: n }, () => h('i', { class: 'px-dot' }));
  const el = h('div', { class: 'px-dots', 'aria-hidden': 'true' }, ...dots);
  return { el, set(i) { dots.forEach((d, k) => { d.classList.toggle('done', k < i); d.classList.toggle('now', k === i); }); } };
}
