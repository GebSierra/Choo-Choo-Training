// Parent scripts are shown as text. To read one aloud, isolated sounds (mmm, aaammm, sss) become
// recorded clips and everything else goes to text to speech. Nothing is ever a single letter.
export function stretchLetters(word) { return [...word].map((c) => c.repeat(3)).join(''); }

// How a parent writes a sound: a held sound (m, a, s, f, i, n) is stretched, "mmm"; a clipped one (t, d, g, p, h, b, l)
// is short with a dash and never stretched, "t-". `sounds` is the curriculum's sounds table (its `hold` flag decides).
export const soundText = (ch, sounds) => (sounds && sounds[ch] && sounds[ch].hold === false ? `${ch}-` : ch.repeat(3));
// A word sound by sound, for a parent to say slowly with no pause: held sounds stretched, clipped ones short: "t-aaa".
export const slowSounds = (word, sounds) => [...word].map((c) => soundText(c, sounds)).join('');
// A picture word: only its first sound is brought out, held ("sssun") or short ("t-iger"); the rest stays as it is.
export const firstSoundOut = (word, sounds) => soundText(word[0], sounds) + word.slice(1);

// A sound token is only stretched runs (mmm) and short sounds with a dash (t-): "t-aaag-". It is shown, never spoken by text to speech.
const PIECE = /([a-z])\1{2,}|[a-z]-/g;
const isPure = (core) => core.replace(PIECE, '') === '';
const isSoundy = (core) => /([a-z])\1{2,}/.test(core) || /(^|-)[a-z]-/.test(core);

// quiet (the default, when the grown up says the sounds): any sentence that contains a sound is left out,
// so only the framing sentences are read ("Now you try. Slide the letter as you say it.").
export function scriptToParts(text, soundKeys, { quiet = false } = {}) {
  if (quiet) {
    const hasSound = (tok) => {
      const m = tok.match(/^['"]*([A-Za-z][A-Za-z-]*)[.,:;!?'"]*$/);
      const core = m ? m[1].toLowerCase() : '';
      return (core && isSoundy(core)) || (core.length === 1 && soundKeys.includes(core));
    };
    // A quotation that runs over several sentences is one unit: a sound inside it drops all of it, never a fragment.
    const units = [];
    let inQuote = false;
    for (const s of text.replaceAll('...', '\u2026').split(/(?<=[.?!]['"]?)\s+/)) {
      if (inQuote) units[units.length - 1] += ' ' + s; else units.push(s);
      const opens = /(^|\s)['"]/.test(s), closes = /['"]$/.test(s);
      inQuote = inQuote ? !closes : opens && !closes;
    }
    text = units.filter((u) => !u.split(/\s+/).some(hasSound)).join(' ').replaceAll('\u2026', '...');
  }
  const parts = [];
  let buf = [];
  const flush = () => { const t = buf.join(' ').trim(); if (t) parts.push({ tts: t }); buf = []; };
  for (const tok of text.split(/\s+/)) {
    if (!tok) continue;
    if (tok === '...') { flush(); parts.push({ pause: 450 }); continue; }
    const m = tok.match(/^['"]*([A-Za-z][A-Za-z-]*)[.,:;!?'"]*$/); // quotes around a sound ('Which one says mmm?') are not part of it
    const core = m ? m[1].toLowerCase() : '';
    if (core && isSoundy(core)) {
      const pieces = isPure(core) ? core.match(PIECE) : null;
      if (pieces && pieces.every((p) => soundKeys.includes(p[0]))) { flush(); pieces.forEach((p) => parts.push({ clip: p[0] })); }
      continue; // a stretch we have no clip for is shown, never spoken
    }
    if (core.length === 1 && soundKeys.includes(core) && m[1] === core) { flush(); parts.push({ clip: core }); continue; }
    buf.push(tok);
  }
  flush();
  return parts;
}
