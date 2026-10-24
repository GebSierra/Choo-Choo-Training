// The sound order of the lessons (docs/CURRICULUM.md, docs/LESSON-REBUILD.md phase B): one sound key per lesson. Phase B switched to the
// curriculum's order: Starter Station m a s i t p, Green Valley f o n d c(k) h u g l r b. A key is a sound; a sound can have more than one
// spelling (/k/ is spelt c or k: one lesson, data key 'c', second spelling 'k').
export const ORDER_SOUNDS = ['m', 'a', 's', 'i', 't', 'p', 'f', 'o', 'n', 'd', 'c', 'h', 'u', 'g', 'l', 'r', 'b',
  // World 3 Sunny Hills (lessons 18 to 25): e j w v y z x qu. q is one unit of two letters (q and its u) that says kw; its glyph is drawn as "qu".
  'e', 'j', 'w', 'v', 'y', 'z', 'x', 'q',
  // World 4 Digraph Docks (lessons 26 to 33): sh ch th ck ff(ll ss zz) wh ng nk. A digraph is ONE sound written with TWO letters: it is one unit everywhere
  // (docs/LESSON-REBUILD.md section 14). th is one lesson with two kinds (buzzing and quiet); ff, ll, ss and zz are one lesson with four spellings.
  'sh', 'ch', 'th', 'ck', 'ff', 'wh', 'ng', 'nk',
  // World 5 Blend Bay (lessons 34 to 42): a blend is NOT a new sound. Each letter keeps its own sound, so there is no new letter unit and no new taught letter;
  // the key names the lesson's blend family (SPELLINGS lists its pairs). 34 st ft, 35 nd mp nt, 36 sp sk (st again at the start), 37 sn sw sm sl, 38 bl cl fl,
  // 39 pl gl, 40 br tr cr, 41 dr fr gr; 'mix' (42) is the mixed review: blends at both ends, no pair of its own.
  'st', 'nd', 'sp', 'sn', 'bl', 'pl', 'br', 'dr', 'mix'];
// Saved progress carries the order it was saved under. Joined with spaces so it can never equal a legacy one-character-per-lesson string.
export const ORDER = ORDER_SOUNDS.join(' ');
// Orders that were saved before sounds were appended to the end (1.9.33 to 1.9.36 stored the first 17). Lessons 1 to 17 keep their numbers, so a save
// under one of them is the same order as the current one: nothing is mapped and nothing is reset (js/store.js parse).
export const PRIOR_ORDERS = [ORDER_SOUNDS.slice(0, 17).join(' '), ORDER_SOUNDS.slice(0, 25).join(' '), ORDER_SOUNDS.slice(0, 33).join(' ')];
// The order before phase B (13 lessons, one letter each): a save made under it is mapped by sound (js/store.js), never reset.
export const LEGACY_ORDER = 'masitpnfdhgbl';

// Spellings: a sound key whose sound is written with more than one letter. The first letter is the key and the glyph.
// Blend families (World 5): the pairs of one lesson. A pair is two letters that each keep their own sound; it is never one unit (letterUnits does not join it).
export const BLENDS = { st: ['st', 'ft'], nd: ['nd', 'mp', 'nt'], sp: ['sp', 'sk'], sn: ['sn', 'sw', 'sm', 'sl'], bl: ['bl', 'cl', 'fl'], pl: ['pl', 'gl'], br: ['br', 'tr', 'cr'], dr: ['dr', 'fr', 'gr'] };
export const SPELLINGS = { c: ['c', 'k'], ff: ['ff', 'll', 'ss', 'zz'], ...BLENDS, mix: ['st', 'mp'] }; // mix (lesson 42) shows st and mp: blends at both ends of stamp
// A blend lesson's key. 'mix' (lesson 42) has no pair of its own, so it has no glyph and the letter games never deal it.
export const isBlendKey = (key) => key in BLENDS || key === 'mix';
export const NO_GLYPH = ['mix'];
export const spellingsOf = (key) => SPELLINGS[key] || [key];
// The sound key a written letter belongs to ('k' belongs to 'c'; every other letter is its own key).
export const soundOfLetter = (ch) => { for (const [key, list] of Object.entries(SPELLINGS)) if (list.includes(ch)) return key; return ch; };
// Every letter that sound keys are written with, as a Set (the decodability rules work with letters). A blend lesson adds its pairs (st, ft ...): isReadable ignores them, isReadableBlends needs them.
export const lettersOfSounds = (keys) => new Set(keys.flatMap(spellingsOf));
// The blend pairs written in a word: [{ at, len: 2 }] over the written letters, for the highlight in Saying Sounds. Only pairs of lessons taught by `lesson` (a number) count; a blend is
// two consonants side by side before or after the vowel (stop, jump), never part of a digraph (ship, think). Words are still read letter by letter.
const ALL_PAIRS = Object.values(BLENDS).flat();
export function blendSpans(word, lesson = ORDER_SOUNDS.length) {
  const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, lesson)), units = letterUnits(word, lesson, true), out = [];
  let at = 0;
  for (let u = 0; u < units.length; u++) {
    const a = units[u], b = units[u + 1];
    if (b && a.length === 1 && b.length === 1 && ALL_PAIRS.includes(a + b) && taught.has(a + b)) { out.push({ at, len: 2 }); at += 2; u++; continue; }
    at += a.length;
  }
  return out;
}
// Every blend pair a word uses (taught or not), as strings: stamp -> st, mp.
export function blendPairsIn(word) {
  const units = letterUnits(word, ORDER_SOUNDS.length, true), out = [];
  for (let u = 0; u < units.length - 1; u++) if (units[u].length === 1 && units[u + 1].length === 1 && ALL_PAIRS.includes(units[u] + units[u + 1])) { out.push(units[u] + units[u + 1]); u++; }
  return out;
}
// Digraphs: two letters, one sound, one unit. A double letter (ff ll ss zz) is the same sound as the single letter, so before its lesson a word such as
// "miss" or "buzz" is still read letter by letter; every other digraph is only a unit (and a word only readable) once its lesson is taught.
export const DIGRAPHS = ['sh', 'ch', 'th', 'ck', 'ff', 'll', 'ss', 'zz', 'wh', 'ng', 'nk'];
const DOUBLES = ['ff', 'll', 'ss', 'zz'];
const taughtSet = (ctx) => (ctx == null ? null : typeof ctx === 'number' ? lettersOfSounds(ORDER_SOUNDS.slice(0, ctx)) : ctx);
// The letters of a word as written units: "qu" is one unit (q, whose glyph includes its u), so the u after a q is dropped: quit -> q i t.
// `ctx` (a lesson number, or the Set from lettersOfSounds) also joins the digraphs taught by then into one unit: ship -> sh i p, bell -> b e ll.
// Without ctx only qu is joined (older callers); keepU keeps the u after a q (the reading font draws every letter).
export function letterUnits(word, ctx, keepU = false) {
  const taught = taughtSet(ctx), a = [...word], out = [];
  for (let i = 0; i < a.length; i++) {
    if (!keepU && a[i] === 'u' && a[i - 1] === 'q') continue;
    const two = a[i] + (a[i + 1] || '');
    if (taught && taught.has(two) && DIGRAPHS.includes(two)) { out.push(two); i++; continue; }
    out.push(a[i]);
  }
  return out;
}
// Can a child read this word with the units in `taught` (a Set from lettersOfSounds)? Every letter must be taught, and a digraph must be taught as a
// unit: "ship" is not readable before sh, even though s, h, i and p are (only the double letters fall back to their single letters).
export function isReadable(word, taught) {
  const a = [...word];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 'u' && a[i - 1] === 'q') { if (!taught.has('u')) return false; continue; }
    const two = a[i] + (a[i + 1] || '');
    if (DIGRAPHS.includes(two)) { if (taught.has(two)) { i++; continue; } if (!DOUBLES.includes(two)) return false; }
    if (!taught.has(a[i])) return false;
  }
  return true;
}
// The sound key a word begins with, a digraph first: shop -> sh, chip -> ch, ball -> b.
export const startSound = (word) => { const two = word.slice(0, 2); return soundOfLetter(DIGRAPHS.includes(two) ? two : word[0]); };

// The World 5 words (data/words-decodable.json `blendWords`) count as readable only once every blend they use is taught (stop is readable by letters at lesson 4, but
// "blast" is counted when bl and st are both taught): the old list keeps its letters-only rule so no earlier Review Stop changes.
export const isReadableBlends = (word, taught) => isReadable(word, taught) && blendPairsIn(word).every((p) => taught.has(p));
