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
  'st', 'nd', 'sp', 'sn', 'bl', 'pl', 'br', 'dr', 'mix',
  // World 6 Endings Junction (lessons 43 to 50): an ending is a WORD PART, not a new sound and not a new letter. Each key names the lesson's word part (ENDED, CHUNKS below):
  // 43 -s (says sss after a quiet sound, zzz after a buzzing one: cats, dogs), 44 -es (boxes), 45 -ing (jumping), 46 -ed says t or d (jumped, filled),
  // 47 -ed says ed, a whole extra beat (landed), 48 compound words (sunset), 49 two-beat words (napkin), 50 the mixed review ('endmix': no part of its own).
  'end-s', 'end-es', 'end-ing', 'end-ed', 'end-ted', 'join', 'beats', 'endmix',
  // World 7 Silent E Summit (lessons 51 to 57): a long-vowel PATTERN is not a new sound, not a new letter and not a word part. 51 'open' (a vowel at the end of a word says its name: he, go, hi, my),
  // 52 a_e (cape), 53 i_e (kite), 54 o_e (hope), 55 u_e (cube, tube), 56 e_e (Pete), 57 'semix' the mixed review (no pattern of its own). Every silent-e pattern is taught with its short-vowel partner (cap/cape).
  // PATTERNS below lists the words; the vowel says its name and the e makes no sound.
  'open', 'a_e', 'i_e', 'o_e', 'u_e', 'e_e', 'semix'];
// Saved progress carries the order it was saved under. Joined with spaces so it can never equal a legacy one-character-per-lesson string.
export const ORDER = ORDER_SOUNDS.join(' ');
// Orders that were saved before sounds were appended to the end (1.9.33 to 1.9.36 stored the first 17). Lessons 1 to 17 keep their numbers, so a save
// under one of them is the same order as the current one: nothing is mapped and nothing is reset (js/store.js parse).
export const PRIOR_ORDERS = [ORDER_SOUNDS.slice(0, 17).join(' '), ORDER_SOUNDS.slice(0, 25).join(' '), ORDER_SOUNDS.slice(0, 33).join(' '), ORDER_SOUNDS.slice(0, 42).join(' '), ORDER_SOUNDS.slice(0, 50).join(' ')];
// The order before phase B (13 lessons, one letter each): a save made under it is mapped by sound (js/store.js), never reset.
export const LEGACY_ORDER = 'masitpnfdhgbl';

// Spellings: a sound key whose sound is written with more than one letter. The first letter is the key and the glyph.
// Blend families (World 5): the pairs of one lesson. A pair is two letters that each keep their own sound; it is never one unit (letterUnits does not join it).
export const BLENDS = { st: ['st', 'ft'], nd: ['nd', 'mp', 'nt'], sp: ['sp', 'sk'], sn: ['sn', 'sw', 'sm', 'sl'], bl: ['bl', 'cl', 'fl'], pl: ['pl', 'gl'], br: ['br', 'tr', 'cr'], dr: ['dr', 'fr', 'gr'] };
export const SPELLINGS = { c: ['c', 'k'], ff: ['ff', 'll', 'ss', 'zz'], ...BLENDS, mix: ['st', 'mp'] }; // mix (lesson 42) shows st and mp: blends at both ends of stamp
// A blend lesson's key. 'mix' (lesson 42) has no pair of its own, so it has no glyph and the letter games never deal it.
export const isBlendKey = (key) => key in BLENDS || key === 'mix';
export const NO_GLYPH = ['mix', 'endmix', 'semix']; // 'endmix' (World 6, lesson 50) and 'semix' (World 7, lesson 57) have no part or pattern of their own either
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
// The same, over a word's units (letterUnits): the unit index where each taught blend starts (a blend is two single-letter units side by side).
export function blendAtUnits(units, lesson = ORDER_SOUNDS.length) {
  const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, lesson)), out = [];
  for (let u = 0; u < units.length - 1; u++) if (units[u].length === 1 && units[u + 1].length === 1 && ALL_PAIRS.includes(units[u] + units[u + 1]) && taught.has(units[u] + units[u + 1])) { out.push(u); u++; }
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
export function letterUnits(word, ctx, keepU = false, joinEndings = !keepU) {
  const taught = taughtSet(ctx);
  // World 6: an ending a lesson has taught is one unit, last (jump + end-ing). The reading font (keepU) draws every letter, so it keeps the letters.
  if (taught && joinEndings) { const key = endingKeyOf(word); if (key && taught.has(key)) return [...letterUnits(word.slice(0, word.length - ENDED[key].suffix.length), ctx), key]; }
  const a = [...word], out = [];
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

// ---- World 6, Endings Junction: word parts. An ending (-s, -es, -ing, -ed) is NOT a sound and no letter is new: the child finds the base word, then the ending, one chunk.
// A lesson key names its part. In a word of ENDED that lesson has taught, letterUnits puts the ending last as ONE unit whose name is the lesson key ("end-ing": the
// glyph of that key, a car coupled to the word). Compound words (join) and two-beat words (beats) keep every letter as its own unit; CHUNKS lists their parts so the
// screens can draw them split and glued. The lists are curated: a word is only here when its base is a real short-vowel word (no doubled letter, no dropped e).
const list = (s) => s.split(/\s+/).filter(Boolean);
// `says` lists how the grown-up writes the ending for each group of bases: s says sss after a quiet sound (p t k f) and zzz after a buzzing one (b d g n m l); -es is a whole
// extra beat (iz-); -ed says t- after a quiet sound, d- after a buzzing one, and id- (an extra beat) after t or d.
export const ENDED = {
  'end-s': { suffix: 's', says: {
    sss: list('cat hat bat rat mat pet nut cap map tap lip cup kit pit sit sip tip chip ship shop duck sock rock pack kick lick neck deck jet vet'),
    zzz: list('dog bug pen bed tub hen pig bib job rug jug web wig leg lid kid dad hill bell tell can fan van pan tin pin bun sun drum frog plan swim') } },
  'end-es': { suffix: 'es', says: { 'iz-': list('box fox mix wax wish dish fish rush mash bus kiss miss pass hiss mess dress fuss buzz fizz lunch bunch bench') } },
  'end-ing': { suffix: 'ing', says: { 'ing-': list('jump fish rest sing help camp lift pick kick pack melt bend hunt sink honk bang ring sniff yell fill spill sell tell smell spell kiss miss pass buzz puff nest land send lend bank think track rush wish dash crash lick tick') } },
  'end-ed': { suffix: 'ed', says: {
    't-': list('jump wish pick kick pack help camp rush fix mix sniff puff huff pass kiss miss hiss bump pump limp stamp lick'),
    'd-': list('fill spill yell smell spell drill buzz bang') } },
  'end-ted': { suffix: 'ed', says: { 'id-': list('land rest lift melt hunt end hand sand nest list last test dent plant tilt drift gift add') } },
};
// Compound words: two short words glued (sun + set). Two-beat words: clap the beats, split between the two consonants, read each chunk, glue (nap + kin).
export const CHUNKS = {
  join: list('sun+set cat+fish bath+tub bed+bug hot+dog back+pack sand+box cat+nap cob+web hill+top lap+top pig+pen bob+cat up+hill up+set dust+pan fish+net hand+stand sun+fish'),
  beats: list('nap+kin rab+bit pic+nic kit+ten bas+ket mag+net in+sect hel+met pup+pet trum+pet muf+fin pump+kin rock+et pock+et'),
};
// word -> { key, parts }: parts are [base, ending] for an ending word (the ending is the lesson key) and the pieces for a chunk word.
export const PARTS = new Map();
for (const [key, e] of Object.entries(ENDED)) for (const [say, bases] of Object.entries(e.says)) for (const base of bases) { const word = base + e.suffix; if (!PARTS.has(word)) PARTS.set(word, { key, say, parts: [base, key] }); }
for (const [key, items] of Object.entries(CHUNKS)) for (const item of items) { const parts = item.split('+'); PARTS.set(parts.join(''), { key, parts }); }
export const WORD_PART_KEYS = ['end-s', 'end-es', 'end-ing', 'end-ed', 'end-ted', 'join', 'beats'];
export const isEndKey = (key) => WORD_PART_KEYS.includes(key) || key === 'endmix';
// The ending a word ends in, as the key of the lesson that teaches it ('end-ing'), or null for a word with no ending or a chunk word.
export const endingKeyOf = (word) => { const p = PARTS.get(word); return p && p.key in ENDED ? p.key : null; };
export const wordPartsOf = (word) => PARTS.get(word) || null;
// How the grown-up writes the ending of a word (sss, zzz, iz-, ing-, t-, d-, id-), or null for a word with no ending.
export const endingSay = (word) => { const p = PARTS.get(word); return p && p.say ? p.say : null; };
// The ending a lesson key writes, as letters ('end-ed' -> 'ed'): the glyph of the car shows these.
export const endingLetters = (key) => (ENDED[key] ? ENDED[key].suffix : null);
// Chunks of a compound or two-beat word that its lesson has taught, as [{ at, len }] over the written letters (sun+set: 0,3 and 3,3); null before that lesson. ctx: a lesson number or a Set from lettersOfSounds.
export function chunkSpans(word, ctx) {
  const p = PARTS.get(word);
  if (!p || !(p.key in CHUNKS)) return null;
  const taught = taughtSet(ctx);
  if (taught && !taught.has(p.key)) return null;
  let at = 0;
  return p.parts.map((x) => { const o = { at, len: x.length }; at += x.length; return o; });
}
// Does the word use a word part (an ending, a compound or two beats) that the keys taught so far have not taught yet? (A word with no part is always fine.)
export const partTaught = (word, taught) => { const p = PARTS.get(word); return !p || taught.has(p.key); };
// The World 6 words (data/words-decodable.json `endingWords`) count once every letter, every blend and the word part they use is taught.
export const isReadableEndings = (word, taught) => isReadableBlends(word, taught) && partTaught(word, taught);

// ---- World 7, Silent E Summit: long-vowel patterns. A pattern is NOT a new sound, a new letter or a word part: the vowel says its name. With a silent e (a_e, i_e, o_e, u_e, e_e) the e makes no sound and
// jumps back over one consonant to the vowel (cap becomes cape); in an open syllable (key 'open') a vowel at the end of the word says its name (he, go, hi, my). A word keeps every letter as its own unit
// (no unit joins the e), so the pattern is drawn as an arc from the e to the vowel (js/glyphs.js) and only once its lesson has taught it. PATTERNS is curated like ENDED: `says` groups the words by how the
// grown-up writes the vowel (the notation is shown, never spoken). Words of `open` that are heart words (he me be we she go no so my) stay heart words and are not counted as readable words.
export const PATTERN_KEYS = ['open', 'a_e', 'i_e', 'o_e', 'u_e', 'e_e'];
export const SILENT_E_KEYS = ['a_e', 'i_e', 'o_e', 'u_e', 'e_e'];
export const isPatternKey = (key) => PATTERN_KEYS.includes(key) || key === 'semix';
// How the grown-up writes each long vowel (a stretched run is shown, never spoken; ooo is never used alone: it is short o): a aaay, i iiiy, o oooh, e eeee, u yooo (cube) or oooo (tube).
export const LONG_SAY = { a: 'aaay', i: 'iiiy', o: 'oooh', e: 'eeee', 'u-yoo': 'yooo', 'u-oo': 'oooo' };
export const PATTERNS = {
  open: { says: { eeee: list('he me be we she'), oooh: list('go no so'), iiiy: list('hi my by fly cry try dry fry sky shy spy') } },
  a_e: { says: { aaay: list('cape cake make bake lake take wake name game same came late gate hate date safe wave save cave gave shape shade plane snake grape frame flame skate state jade made fade wade lane mane cane pane sale tale male pale maze blaze brave crane crate grade trade blame shake flake stake tape mate rate fate') } },
  i_e: { says: { iiiy: list('kite bike hike like time dime lime line mine nine pine fine five dive hive wide ride side hide slide smile while white shine slime drive crime bride pride stripe bite site mite wine dine spine pipe ripe') } },
  o_e: { says: { oooh: list('hope rope home bone note joke poke woke stone stove globe smoke hole pole mole vote rode code robe cone slope') } },
  u_e: { says: { yooo: list('cube cute mule mute'), oooo: list('tube flute tune rule prune plume dune') } },
  e_e: { says: { eeee: list('eve pete theme steve') } },
};
// word -> { key, say, vowel, e }: `vowel` and `e` are letter indexes over the written word (e is null for an open vowel; the vowel is the last letter).
export const PAT = new Map();
for (const [key, p] of Object.entries(PATTERNS)) for (const [say, ws] of Object.entries(p.says)) for (const word of ws) {
  if (PAT.has(word)) throw new Error('pattern word listed twice: ' + word);
  let vowel = word.length - 1, e = null;
  if (key !== 'open') { e = word.length - 1; vowel = e - 1; while (vowel >= 0 && !'aeiou'.includes(word[vowel])) vowel--; }
  PAT.set(word, { key, say, vowel, e });
}
export const patternOf = (word) => PAT.get(word) || null;
// The pattern a word shows once its lesson has taught it (ctx: a lesson number or a Set from lettersOfSounds), as { key, say, vowel, e }, else null. An open vowel has no jump (e is null).
export function patternSpans(word, ctx) {
  const p = PAT.get(word);
  if (!p) return null;
  const taught = taughtSet(ctx);
  if (taught && !taught.has(p.key)) return null;
  return p;
}
// Is a word of the lists (data/words-decodable.json `patternWords`) readable once the pattern, and every letter, blend and word part, is taught?
export const patternTaught = (word, taught) => { const p = PAT.get(word); return !p || taught.has(p.key); };
export const isReadablePatterns = (word, taught) => isReadableEndings(word, taught) && patternTaught(word, taught);
// The long-vowel notation of a word at `ctx`: what the grown-up writes for the vowel (aaay), or null when the word shows no pattern yet.
export const patternSay = (word) => { const p = PAT.get(word); return p ? p.say : null; };
// Contrast: does the word say a long vowel (it has a pattern) or a short one?
export const vowelLength = (word) => (PAT.has(word) ? 'long' : 'short');
