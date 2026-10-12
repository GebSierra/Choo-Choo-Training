// The sound order of the lessons (docs/CURRICULUM.md, docs/LESSON-REBUILD.md phase B): one sound key per lesson. Phase B switched to the
// curriculum's order: Starter Station m a s i t p, Green Valley f o n d c(k) h u g l r b. A key is a sound; a sound can have more than one
// spelling (/k/ is spelt c or k: one lesson, data key 'c', second spelling 'k').
export const ORDER_SOUNDS = ['m', 'a', 's', 'i', 't', 'p', 'f', 'o', 'n', 'd', 'c', 'h', 'u', 'g', 'l', 'r', 'b',
  // World 3 Sunny Hills (lessons 18 to 25): e j w v y z x qu. q is one unit of two letters (q and its u) that says kw; its glyph is drawn as "qu".
  'e', 'j', 'w', 'v', 'y', 'z', 'x', 'q'];
// Saved progress carries the order it was saved under. Joined with spaces so it can never equal a legacy one-character-per-lesson string.
export const ORDER = ORDER_SOUNDS.join(' ');
// Orders that were saved before sounds were appended to the end (1.9.33 to 1.9.36 stored the first 17). Lessons 1 to 17 keep their numbers, so a save
// under one of them is the same order as the current one: nothing is mapped and nothing is reset (js/store.js parse).
export const PRIOR_ORDERS = [ORDER_SOUNDS.slice(0, 17).join(' ')];
// The order before phase B (13 lessons, one letter each): a save made under it is mapped by sound (js/store.js), never reset.
export const LEGACY_ORDER = 'masitpnfdhgbl';

// Spellings: a sound key whose sound is written with more than one letter. The first letter is the key and the glyph.
export const SPELLINGS = { c: ['c', 'k'] };
export const spellingsOf = (key) => SPELLINGS[key] || [key];
// The sound key a written letter belongs to ('k' belongs to 'c'; every other letter is its own key).
export const soundOfLetter = (ch) => { for (const [key, list] of Object.entries(SPELLINGS)) if (list.includes(ch)) return key; return ch; };
// Every letter that sound keys are written with, as a Set (the decodability rules work with letters).
export const lettersOfSounds = (keys) => new Set(keys.flatMap(spellingsOf));
// The letters of a word as written units: "qu" is one unit (q, whose glyph includes its u), so the u after a q is dropped. Used wherever a word is
// split into the things a child slides under, hears or taps: quit -> q i t.
export const letterUnits = (word) => [...word].filter((c, i, a) => !(c === 'u' && a[i - 1] === 'q'));
