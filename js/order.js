// The sound order of the lessons (docs/CURRICULUM.md, docs/LESSON-REBUILD.md phase B): one sound key per lesson. Phase B switched to the
// curriculum's order: Starter Station m a s i t p, Green Valley f o n d c(k) h u g l r b. A key is a sound; a sound can have more than one
// spelling (/k/ is spelt c or k: one lesson, data key 'c', second spelling 'k').
export const ORDER_SOUNDS = ['m', 'a', 's', 'i', 't', 'p', 'f', 'o', 'n', 'd', 'c', 'h', 'u', 'g', 'l', 'r', 'b'];
// Saved progress carries the order it was saved under. Joined with spaces so it can never equal a legacy one-character-per-lesson string.
export const ORDER = ORDER_SOUNDS.join(' ');
// The order before phase B (13 lessons, one letter each): a save made under it is mapped by sound (js/store.js), never reset.
export const LEGACY_ORDER = 'masitpnfdhgbl';

// Spellings: a sound key whose sound is written with more than one letter. The first letter is the key and the glyph.
export const SPELLINGS = { c: ['c', 'k'] };
export const spellingsOf = (key) => SPELLINGS[key] || [key];
// The sound key a written letter belongs to ('k' belongs to 'c'; every other letter is its own key).
export const soundOfLetter = (ch) => { for (const [key, list] of Object.entries(SPELLINGS)) if (list.includes(ch)) return key; return ch; };
// Every letter that sound keys are written with, as a Set (the decodability rules work with letters).
export const lettersOfSounds = (keys) => new Set(keys.flatMap(spellingsOf));
