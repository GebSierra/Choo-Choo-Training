import { h } from '../dom.js';
import { soundText, slowSounds } from '../scripts.js';

// The tap games say a letter sound with the grown-up's recorded clip (Grownups, "Recorded sounds"), never with the
// phone's voice. Without a clip they show "Say: aaa" for the grown-up and carry on.
// A future professional voice plugs in at curriculum.sounds[k].clip (written by tools/gen-lessons.mjs): drop <k>.mp3 files
// into assets/audio/sounds/ and update CLIP_CREDIT in js/screens/grownups.js. No change here.
export const sayLine = (key, sounds) => `Say: ${soundText(key, sounds)}` + (sounds[key].asIn ? ` (as in ${sounds[key].asIn})` : '');
export function clipReady({ store, curriculum, speech }, key) {
  return !!store.settings.playSounds && !!(curriculum.sounds[key] && curriculum.sounds[key].clip) && !speech.missing.includes(key);
}
// The prompt pill: the game puts prompt.el at the top of its scene. show(text) shows it and swells it once; hide().
export function sayPrompt() {
  const text = h('span', { class: 'say-text' });
  const el = h('div', { class: 'say-prompt', role: 'status', hidden: true }, h('span', { class: 'say-who', 'aria-hidden': 'true' }, 'Grown-up'), text);
  return { el, show(t, key) { text.textContent = t; el.dataset.key = key || ''; el.hidden = false; if (!matchMedia('(prefers-reduced-motion: reduce)').matches) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 420 }); }, hide() { el.hidden = true; } };
}
// Plays the sound of key; resolves 'clip' when the clip played, else shows the prompt and resolves 'prompt'.
// lead: text before the sound on the prompt (Station Board: "This is sad."); with a clip only the lead shows.
// stale: a function; when it says true after the clip attempt, the game has moved on and nothing is shown.
// extra: more words after the prompt for the grown-up ("Say: fff, a long breath through your teeth").
export async function saySound(ctx, key, prompt, { lead = '', stale = () => false, extra = '' } = {}) {
  const full = (lead ? `Say: ${lead} Tap ${soundText(key, ctx.curriculum.sounds)}.` : sayLine(key, ctx.curriculum.sounds)) + extra;
  if (clipReady(ctx, key)) {
    if (lead) prompt.show(`Say: ${lead}`, key); else prompt.hide();
    await ctx.speech.say([{ clip: key }]);
    if (stale()) return 'stale';
    if (!ctx.speech.missing.includes(key)) return 'clip';
  }
  prompt.show(full, key);
  return 'prompt';
}

// A connected blend model ("fffiiit"): the grown-up's recording assets/audio/blends/<word>.mp3 (or .webm), a stretched word
// that is never text to speech. Without it, or with "Play recorded letter sounds" off, the prompt "Say: fffiiit-" shows. The
// stretched text always comes from slowSounds, never by hand. Resolves 'clip', 'prompt' or 'stale'.
export const blendLine = (word, sounds) => `Say: ${slowSounds(word.toLowerCase(), sounds)}`;
export const blendReady = ({ store, speech }, word) => !!store.settings.playSounds && !speech.missingBlends.includes(word.toLowerCase());
export async function sayBlend(ctx, word, prompt, { stale = () => false } = {}) {
  const w = word.toLowerCase();
  if (blendReady(ctx, w)) {
    prompt.hide();
    await ctx.speech.say([{ blend: w }]);
    if (stale()) return 'stale';
    if (!ctx.speech.missingBlends.includes(w)) return 'clip';
  }
  prompt.show(blendLine(w, ctx.curriculum.sounds), w);
  return 'prompt';
}
