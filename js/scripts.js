import { soundOfLetter, letterUnits, blendAtUnits, endingSay, ORDER_SOUNDS } from './order.js';
const ALL = ORDER_SOUNDS.length; // scripts are for the grown-up: a digraph is one sound in every word (the child's own rows join them by lesson)
// Parent scripts are shown as text. To read one aloud, isolated sounds (mmm, aaammm, sss) become
// recorded clips and everything else goes to text to speech. Nothing is ever a single letter.
export function stretchLetters(word) { return [...word].map((c) => c.repeat(3)).join(''); }

// How a parent writes a sound: a held sound (m, a, s, f, i, n) is stretched, "mmm"; a clipped one (t, d, g, p, h, b, l)
// is short with a dash and never stretched, "t-". `sounds` is the curriculum's sounds table (its `hold` flag decides).
// A sound with two spellings (c and k) is written with its sound letter: "k-" for c and for k alike.
export const soundText = (ch, sounds, word) => {
  const s = sounds && sounds[soundOfLetter(ch)];
  // World 5: a blend pair (st, bl ...) is written as its glide (ssst-, bl-), from the lesson's own table; every letter keeps its sound
  if (s && s.blend && ch.length > 1) { const pair = (s.pairs || []).find((x) => x.g === ch); return pair ? pair.say : s.sayItLike; }
  // World 6: an ending car (or a compound or two-beat word) is a word part: it is written as what the ending says in this word (sss or zzz, iz-, ing-, t- or d-, id-), never as letters
  if (s && s.part && ch === s.glyph) return (word && endingSay(word)) || s.sayItLike;
  // th is one lesson with two kinds: the buzzing one (that, this) is written "thhh", the quiet one (thin, bath) "th-"
  if (ch === 'th' && s && s.voiced) return s.voicedWords && s.voicedWords.includes(word) ? s.voiced : s.sayItLike;
  // a double letter (ff, ll, ss, zz) says the single letter's sound; ck says k-
  if (ch.length === 2 && ch[0] === ch[1] && sounds && sounds[ch[0]]) return soundText(ch[0], sounds);
  if (s && ch.length === 2 && s.hold && s.sayItLike) return s.sayItLike; // a held digraph: shhh
  // A clipped sound is written as its own short text: t-, k- (c and k), kw- (qu), ks- (x). `sayItLike` holds it.
  if (s && s.hold === false && /^[a-z]+-$/.test(s.sayItLike || '')) return s.sayItLike;
  return s && s.hold === false ? `${s.alt && s.alt.length ? s.alt[0] : ch}-` : ch.repeat(3);
};
// A word sound by sound, for a parent to say slowly with no pause: held sounds stretched, clipped ones short: "t-aaa".
// A doubled letter (miss, buzz) is one sound, not two: "mmmiiisss", never "mmmiiissssss".
// World 5: a blend pair is said as one glide (pl-aaannnt-), from the lesson's own table; without that table its letters are said one by one.
const blendOf = (units, i, sounds, level) => { const pair = units[i] + (units[i + 1] || ''); return pair.length === 2 && units[i].length === 1 && units[i + 1].length === 1 && blendAtUnits([units[i], units[i + 1]], level).length && sounds && sounds[soundOfLetter(pair)] && sounds[soundOfLetter(pair)].blend ? pair : null; };
export const slowSounds = (word, sounds, level = ALL) => {
  const units = letterUnits(word, level), out = [];
  for (let i = 0; i < units.length; i++) {
    const pair = blendOf(units, i, sounds, level);
    if (pair) { out.push(soundText(pair, sounds, word)); i++; } else if (units[i] !== units[i - 1]) out.push(soundText(units[i], sounds, word));
  }
  return out.join('');
};
// A picture word: only its first sound is brought out, held ("sssun") or short ("t-iger"); the rest stays as it is.
export const firstSoundOut = (word, sounds, level = ALL) => { const units = letterUnits(word, level), pair = blendOf(units, 0, sounds, level); if (pair) return soundText(pair, sounds, word) + word.slice(2); const u = units[0], n = u === 'q' ? 2 : u.length; return soundText(u, sounds, word) + word.slice(n); };

// A sound token is only stretched runs (mmm) and short sounds with a dash (t-): "t-aaag-". It is shown, never spoken by text to speech.
const PIECE = /([a-z])\1{2,}|(?:kw|ks|ch|th|ng|nk|iz|id|ing|[bcdfgpt][lr]|[a-z])-/g; // [bcdfgpt][lr]: a short-sound blend (bl- cl- fl- pl- gl- br- tr- cr- dr- fr- gr-) is shown, never spoken; iz- id- ing-: the World 6 endings (-es, -ed after t or d, -ing), shown, never spoken
const isPure = (core) => core.replace(PIECE, '') === '';
const pieceKey = (p) => (/^(iz|id|ing)-/.test(p) ? null : p.startsWith('kw') ? 'q' : p.startsWith('ks') ? 'x' : /^(ch|th|ng|nk)-/.test(p) ? p.slice(0, 2) : soundOfLetter(p[0])); // kw- is the sound of qu, ks- of x, ch- th- ng- nk- of the digraphs
const isSoundy = (core) => /([a-z])\1{2,}/.test(core) || /(^|-)(?:kw|ks|ch|th|ng|nk|iz|id|ing|[bcdfgpt][lr]|[a-z])-/.test(core);

// quiet (the default, when the grown up says the sounds): any sentence that contains a sound is left out,
// so only the framing sentences are read ("Now you try. Slide the letter as you say it.").
export function scriptToParts(text, soundKeys, { quiet = false } = {}) {
  if (quiet) {
    const hasSound = (tok) => {
      const m = tok.match(/^['"]*([A-Za-z][A-Za-z-]*)[.,:;!?'"]*$/);
      const core = m ? m[1].toLowerCase() : '';
      return (core && isSoundy(core)) || (core.length === 1 && soundKeys.includes(soundOfLetter(core)));
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
      if (pieces && pieces.every((p) => soundKeys.includes(pieceKey(p)))) { flush(); pieces.forEach((p) => parts.push({ clip: pieceKey(p) })); }
      continue; // a stretch we have no clip for is shown, never spoken
    }
    if (core.length === 1 && soundKeys.includes(soundOfLetter(core)) && m[1] === core) { flush(); parts.push({ clip: soundOfLetter(core) }); continue; }
    buf.push(tok);
  }
  flush();
  return parts;
}

// The one grown-up script for every teaching activity that asks the child to read a word or a sentence (owner decision):
// try it first, sound it out together if some letters are known, and only then model it for the child to imitate. It says no
// letter sounds, so the phone's voice can read it. (Not used in the placement check: that is an assessment, no help is given.)
export const READ_HELP = 'Ask your child to read it. If they know some of the letters, sound it out together. Still stuck? Read it yourself, then have your child say it after you.';
