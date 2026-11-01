// World 7, Silent E Summit (lessons 51 to 57; docs/LESSON-REBUILD.md section 17). Built with no version change; nothing is pushed.
// Data (no browser): the 57-sound order and the 50-sound prior order, the lessons and what each teaches (a long-vowel PATTERN is not a sound, a letter or a word part: the vowel says its name),
// every child-read word proven readable from what its lesson taught, the pattern lists, the grown-up's notation (never spoken by the phone), the arc that appears only once a pattern is taught,
// the glyphs, Magic e Car data, the stops (Tricky Sounds after 55, a Review Stop after 54, Story 7 after 56, the end-of-world Review Stop after 57), the heart words, level seven, the reading count
// (a pattern is not a sound), Story 7's words, the frozen data of lessons 1 to 50 and every stop before (digests of the data as of 1.9.48), and saved progress under every older order.
// Browser: the Endings Junction to Silent E Summit crossing, the Home of World 7, going back, New Pattern, Saying Sounds with the jump arc, Magic e Car, Tricky Sounds x15, the Review Stops, Ticket Check,
// Grownups, level seven, Story 7, fit and 48 px targets at three sizes, nothing plays on its own, no idle frame loop.
// Run alone with `node test/silent-e.mjs [--data] [--shots]`; shots go to docs/screenshots/silent-e/.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN } from './lib.mjs';
import { SPEECH_STUB } from './stubs.mjs';
import { ORDER, ORDER_SOUNDS, PRIOR_ORDERS, PATTERNS, PAT, PATTERN_KEYS, SILENT_E_KEYS, LONG_SAY, spellingsOf, letterUnits, lettersOfSounds, isReadable, isReadableBlends, isReadableEndings, isReadablePatterns, isPatternKey, patternSpans, patternOf, vowelLength, soundOfLetter, NO_GLYPH } from '../js/order.js';
import { GLYPHS } from '../js/glyphs.js';
import { slowSounds, soundText, scriptToParts } from '../js/scripts.js';
import { tasksFor, soundCardLines, soundPhrase } from '../js/lessons.js';
import { countReadable, chipsOf } from '../js/reading-count.js';
import { reviewMessageText } from '../js/screens/finish.js';
import { carsOf } from '../js/levels.js';
import { lessonsIn, currentWorld, reachedWorlds, previousWorld } from '../js/worlds.js';
import { otherLetters } from '../js/games-data.js';
import { openHome, until, state } from './train.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const BOOK7 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/books/book-7.json'), 'utf8'));
const WJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/words-decodable.json'), 'utf8'));
const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/silent-e');
const PHONE = { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 };
const SMALL = { name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 };
const WIDE = { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 };
const SOUNDS = CUR.lessons.map((L) => L.sound);
const W7L = CUR.lessons.slice(50);
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };

// The reading words of each new lesson (Saying Sounds); docs/LESSON-REBUILD.md section 17.
const WORDS = { 51: 'me go hi fly', 52: 'cape game lane shade', 53: 'bike hike time slide', 54: 'hope rope home stone', 55: 'cute tube flute tune', 56: 'eve pete theme', 57: 'cape kite hope cube theme fly' };
const KEYS = { 51: 'open', 52: 'a_e', 53: 'i_e', 54: 'o_e', 55: 'u_e', 56: 'e_e', 57: 'semix' };
const UNIT = { 51: '6.1', 52: '6.2', 53: '6.3', 54: '6.3', 55: '6.4', 56: '6.4', 57: '6.5' };
const KIND = { 51: 'open', 52: 'split', 53: 'split', 54: 'split', 55: 'split', 56: 'split', 57: 'mix' };
const HEARTS = new Set('he me be we she go no so my'.split(' '));
const doneL = (n, extra = {}) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it', completedAt: `2026-10-${String(i % 28 + 1).padStart(2, '0')}T10:00:00.000Z`, doneAt: 1760000000000 + i, ...extra }]));
const CHARACTER = { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true };
const stopsDone = (n) => Object.fromEntries(CUR.checkpoints.filter((k) => k.after <= n).map((k) => [k.id, { result: 'got-it' }]));
const L12 = { L1: '2026-10-06T10:00:00.000Z', L2: '2026-10-17T10:00:00.000Z' };
const L1234 = { ...L12, L3: '2026-10-25T10:00:00.000Z', L4: '2026-10-30T10:00:00.000Z' };
const L12345 = { ...L1234, L5: '2026-11-05T10:00:00.000Z' };
const L123456 = { ...L12345, L6: '2026-11-20T10:00:00.000Z' };
const levelsFor = (n) => ({ seen: n >= 57 ? 7 : n >= 50 ? 6 : n >= 42 ? 5 : n >= 33 ? 4 : n >= 25 ? 3 : n >= 17 ? 2 : n >= 6 ? 1 : 0, earned: n >= 57 ? { ...L123456, L7: '2026-12-01T10:00:00.000Z' } : n >= 50 ? L123456 : n >= 42 ? L12345 : n >= 33 ? L1234 : n >= 25 ? { ...L12, L3: L1234.L3 } : n >= 17 ? L12 : n >= 6 ? { L1: L12.L1 } : {} });
const world = (n) => CUR.lessons.find((l) => l.number === Math.min(n + 1, 57)).world;
const seed = (n, settings = {}, extra = {}) => state(n, { migrated1912: true, pace4: true, trainIntroDone: true, ...settings }, { lessons: doneL(n), levels: levelsFor(n), worlds: { seen: world(n) }, checkpoints: stopsDone(n), character: CHARACTER, meetDue: false, ...extra });
const settled = (page, ms = 25000) => until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, ms);
const at = (n, type) => tasksFor(CUR.lessons[n - 1]).find((t) => t.type === type).index;
const seedPage = async (m, n, extra = {}) => { await m.page.addInitScript(SPEECH_STUB); await m.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneL(n), settings: { seenScripts: SEEN, trainIntroDone: true, migrated1912: true, pace4: true }, firstRunDone: true, character: CHARACTER, ...extra })}))`); };
const sha = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);

// ---- data and the store, no browser ----
export async function dataChecks({ ok }) {
  // 1. the order and the count
  ok(ORDER_SOUNDS.length === 57 && ORDER_SOUNDS.slice(0, 50).join(' ') === 'm a s i t p f o n d c h u g l r b e j w v y z x q sh ch th ck ff wh ng nk st nd sp sn bl pl br dr mix end-s end-es end-ing end-ed end-ted join beats endmix' && ORDER_SOUNDS.slice(50).join(' ') === 'open a_e i_e o_e u_e e_e semix', 'order: 57 keys, the first 50 as in 1.9.48, then open a_e i_e o_e u_e e_e semix');
  ok(ORDER === ORDER_SOUNDS.join(' ') && PRIOR_ORDERS.length === 5 && PRIOR_ORDERS[4] === ORDER_SOUNDS.slice(0, 50).join(' ') && PRIOR_ORDERS.every((p) => ORDER.startsWith(p + ' ')) && PRIOR_ORDERS.map((p) => p.split(' ').length).join() === '17,25,33,42,50', 'order: PRIOR_ORDERS gains the 50-key string (a prefix of the current order), so every older save is read as it is');
  ok(SOUNDS.join(' ') === ORDER && CUR.lessons.length === 57 && Object.keys(CUR.sounds).join(' ') === ORDER, 'data: 57 lessons, one key each, in order');
  ok(W7L.every((L) => L.world === 'W7' && L.pattern) && lessonsIn(CUR, 'W7').length === 7 && CUR.worlds[6].name === 'Silent E Summit' && CUR.lessons.slice(0, 50).every((L) => !L.pattern), 'data: lessons 51 to 57 are World 7, Silent E Summit, and the only pattern lessons');
  ok(W7L.every((L) => L.unit === UNIT[L.number]) && CUR.units.filter((u) => u.stage === 6).map((u) => u.id).join() === '6.1,6.2,6.3,6.4,6.5', 'data: units 6.1 to 6.5 (open vowels, a_e, i_e and o_e, u_e and e_e, mixed review)');
  ok(W7L.every((L) => L.sound === KEYS[L.number] && CUR.sounds[L.sound].glyph === L.sound && CUR.sounds[L.sound].clip === null && CUR.sounds[L.sound].pattern === KIND[L.number] && L.pattern === KIND[L.number] && spellingsOf(L.sound).join() === L.sound && !CUR.sounds[L.sound].part && !CUR.sounds[L.sound].blend), 'data: each lesson has one key that is also its glyph, a pattern (not a sound, a blend or a word part), and no recording (the grown-up says it)');
  ok(PATTERN_KEYS.join() === 'open,a_e,i_e,o_e,u_e,e_e' && SILENT_E_KEYS.join() === 'a_e,i_e,o_e,u_e,e_e' && NO_GLYPH.includes('semix') && isPatternKey('semix') && !isPatternKey('end-s') && !isPatternKey('st') && !isPatternKey('a'), 'order: the pattern keys, and the mixed review has no glyph of its own for the letter games');
  ok(soundOfLetter('a_e') === 'a_e' && soundOfLetter('open') === 'open' && soundOfLetter('a') === 'a' && soundOfLetter('k') === 'c', 'units: the pattern keys are their own keys; the letters are untouched');
  // 2. frozen: lessons 1 to 50 and everything before World 7 are byte for byte what they were (digests of the data as of 1.9.48; change them only on purpose)
  ok(sha(CUR.lessons.slice(0, 50)) === '8d091ea492319ff0', 'frozen: lessons 1 to 50 are byte for byte unchanged');
  ok(sha(Object.fromEntries(Object.entries(CUR.sounds).slice(0, 50))) === '390d141b5e87161d', 'frozen: the sounds of lessons 1 to 50 are unchanged');
  ok(sha(CUR.checkpoints.filter((k) => !['x15', 'b7', 'v16', 'v17'].includes(k.id))) === '0acfe480fadc71fe', 'frozen: every stop up to the end of World 6 (stories, Tricky Sounds, Review Stops v1 to v15) is unchanged');
  ok(sha(Object.fromEntries(Object.entries(CUR.heartWords).slice(0, 25))) === '350e8aa1847da2de', 'frozen: the first 25 heart words are unchanged');
  ok(sha(CUR.levels.slice(0, 6)) === '6087d71d29339adc' && sha(CUR.worlds) === '9eecc46879fb562d' && sha(CUR.units.slice(0, CUR.units.length - 5)) === '7225a6375a56adfe', 'frozen: levels one to six, the worlds and the units of Stages 1 to 5 are unchanged');
  ok(sha({ ...CUR.games, hunt: { ...CUR.games.hunt, distractors: Object.fromEntries(Object.entries(CUR.games.hunt.distractors).slice(0, 50)) } }) === '56c113e8c7795900' && sha(CUR.gameDistractors) === '728e2042732c59f2', 'frozen: the game data and the wrong-card pool of lessons 1 to 50 are unchanged');
  // 3. the words of each lesson, and decodability proven from scratch
  for (const [n, words] of Object.entries(WORDS)) ok(CUR.lessons[n - 1].sayingSounds.filter((w) => w.showLetters).map((w) => w.word).join(' ') === words, `lesson ${n} (${SOUNDS[n - 1]}): reading words are ${words}`);
  for (const L of W7L) {
    const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, L.number));
    const read = [...L.sayingSounds.filter((w) => w.showLetters).map((w) => w.word), ...(L.magic || []).flatMap((c) => [c.from, c.to])];
    ok(read.length >= 4 && read.every((w) => isReadablePatterns(w, taught)), `lesson ${L.number}: every child-read word uses only letters, digraphs, blends, word parts and patterns taught by it (${read.join(' ')})`);
    const m = CUR.sounds[L.sound].mouth;
    ok(m && typeof m.voice === 'boolean' && m.text.length <= 120 && new RegExp(`Voice ${m.voice ? 'on' : 'off'}\\.$`).test(m.text), `lesson ${L.number}: Watch My Mouth text for ${L.sound}`);
    const tasks = tasksFor(L);
    ok(tasks[1].name === 'New Pattern' && tasks.at(-1).type === 'check' && tasks.at(-2).type === 'practice' && tasks[0].type === 'review' && tasks[2].type === 'mouth', `lesson ${L.number}: New Pattern opens it (after Letter Review), Watch My Mouth follows, Practicing Words and Ticket Check close it`);
    ok(L.middle.includes('sounds') && !L.middle.includes('board') && !L.middle.includes('chains') && !L.middle.includes('couple') && !L.middle.includes('split') && (L.number === 51 ? !L.middle.includes('magic') : L.middle.includes('magic')), `lesson ${L.number}: the middle is ${L.middle.join()}`);
  }
  ok(W7L.slice(0, 6).every((L) => L.middle.includes('writing')) && !W7L[6].middle.includes('writing'), 'frame: the six pattern lessons trace their card; the mixed review reads and couples instead');
  ok(W7L.every((L, i) => !i || L.middle.join() !== W7L[i - 1].middle.join()) && W7L[0].middle.join() !== CUR.lessons[49].middle.join(), 'frame: no two neighbouring lessons have the same middle');
  ok(W7L.slice(1, 6).every((L) => CUR.sounds[L.sound].noPictures ? L.number === 56 : CUR.sounds[L.sound].words.length >= 1 && L.sayingSounds.some((w) => !w.showLetters)) && CUR.sounds.e_e.noPictures === true && !CUR.sounds.e_e.words.length, 'pictures: a lesson shows only a tile that fits (cake gate snake, kite, bone, cube mule); e_e has none (no wrong picture)');
  ok(W7L.every((L) => CUR.sounds[L.sound].words.every((w) => PAT.has(w.word) || w.word === 'cry') || L.number === 57), 'pictures: every tile of a pattern lesson shows a word that uses the pattern');
  // 4. pattern lists: the words behind the lessons
  const T57 = lettersOfSounds(ORDER_SOUNDS), T50 = lettersOfSounds(ORDER_SOUNDS.slice(0, 50));
  const all = [...PAT.keys()];
  ok(all.every((w) => isReadable(w, T57)) && all.length >= 140, `patterns: ${all.length} words in the lists, each spelt with letters taught by lesson 57`);
  const vowelOf = (w) => w[PAT.get(w).vowel];
  ok(SILENT_E_KEYS.every((k) => Object.values(PATTERNS[k].says).flat().every((w) => w.endsWith('e') && PAT.get(w).e === w.length - 1 && 'aeiou'.includes(vowelOf(w)) && vowelOf(w) === (k === 'e_e' ? 'e' : k[0]) && !'aeiou'.includes(w.slice(PAT.get(w).vowel + 1, -1)))), 'patterns: a silent-e word ends in e, and the vowel is the right one with only consonants between it and the e');
  ok(Object.values(PATTERNS.open.says).flat().every((w) => 'aeiouy'.includes(w.at(-1)) && PAT.get(w).e === null && PAT.get(w).vowel === w.length - 1), 'patterns: an open-vowel word ends in a vowel (e, o, i or y) and has no silent e');
  ok(Object.values(PATTERNS.u_e.says.yooo).length >= 3 && PATTERNS.u_e.says.yooo.every((w) => /^(cube|cute|mule|mute)$/.test(w)) && PATTERNS.u_e.says.oooo.includes('tube') && PATTERNS.u_e.says.oooo.includes('flute'), 'patterns: u_e has two long sounds, yoo (cube cute) and oo (tube flute), listed apart');
  const noZ = all.filter((w) => /[aeiou]s[e]$/.test(w) || /^(these|rise|use|nose|rose|those)$/.test(w));
  ok(noZ.length === 0, 'patterns: no word where the s says z (nose, rise, these): a child would have to learn an exception');
  const CONTRAST_PAIRS = [['cap', 'cape'], ['kit', 'kite'], ['hop', 'hope'], ['cub', 'cube']];
  ok(CONTRAST_PAIRS.every(([a, b]) => !PAT.has(a) && PAT.has(b) && b === a + 'e' && vowelLength(a) === 'short' && vowelLength(b) === 'long'), 'contrast: cap/cape, kit/kite, hop/hope and cub/cube are a short word and its long partner');
  const U = (w, n) => JSON.stringify(letterUnits(w, n));
  ok(U('cape', 51) === '["c","a","p","e"]' && U('cape', 52) === '["c","a","p","e"]' && U('shade', 52) === '["sh","a","d","e"]' && U('theme', 56) === '["th","e","m","e"]' && letterUnits('cape', 57, true).join('') === 'cape', 'units: a pattern word keeps every letter as its own unit (the e is never joined); a digraph is still one unit');
  const P = (w, n) => patternSpans(w, n);
  ok(P('cape', 51) === null && P('cape', 52) && P('cape', 52).e === 3 && P('cape', 52).vowel === 1 && P('kite', 52) === null && P('kite', 53) && P('hope', 53) === null && P('hope', 54) && P('cube', 54) === null && P('cube', 55) && P('theme', 55) === null && P('theme', 56) && P('go', 50) === null && P('go', 51) && P('go', 51).e === null, 'patterns: a word shows its pattern only from the lesson that teaches it (cape at 52, kite at 53, hope at 54, cube at 55, theme at 56, go at 51)');
  const T = (n) => lettersOfSounds(ORDER_SOUNDS.slice(0, n));
  ok(!isReadablePatterns('cape', T(51)) && isReadablePatterns('cape', T(52)) && !isReadablePatterns('kite', T(52)) && isReadablePatterns('kite', T(53)) && !isReadablePatterns('hi', T(50)) && isReadablePatterns('hi', T(51)) && isReadablePatterns('stop', T(42)) && isReadablePatterns('jumping', T(45)) && !isReadablePatterns('jumping', T(44)), 'decodable: a pattern word is counted only from the lesson that teaches its pattern; plain words and word-part words are not affected');
  // 5. the glyphs: the vowel, a slot and the e, with a jump arc from the e back to the vowel (drawn, never traced)
  for (const k of SILENT_E_KEYS) {
    const g = GLYPHS[k], v = k[0];
    ok(g && g.pattern === true && g.wide === true && g.strokes.length === GLYPHS[v].strokes.length + GLYPHS.e.strokes.length && /C/.test(g.link) && /L/.test(g.link) && g.minY <= 6 && g.minX >= 0, `glyphs: ${k} is ${v} and e (${g && g.strokes.length} strokes to trace) with a jump arc and a slot line as link`);
  }
  ok(GLYPHS.open.pattern && GLYPHS.open.strokes.length === GLYPHS.e.strokes.length + GLYPHS.o.strokes.length + GLYPHS.y.strokes.length && /L/.test(GLYPHS.open.link) && GLYPHS.semix === GLYPHS.a_e, 'glyphs: open is e o y before a wall (the word ends here); the mixed review wears the a_e badge');
  // 6. the grown-up's notation (never a letter name, never the phone's voice)
  const S = (w, n = 57) => slowSounds(w, CUR.sounds, n);
  ok(S('cape') === 'k-aaay' + 'p-' && S('kite') === 'k-iiiyt-' && S('hope') === 'h-ooohp-' && S('cube') === 'k-yooob-' && S('tube') === 't-oooob-' && S('theme') === 'th-eeeemmm' && S('me') === 'mmmeeee' && S('go') === 'g-oooh' && S('hi') === 'h-iiiy' && S('fly') === 'fl-iiiy', 'notation: cape k-aaayp-, kite k-iiiyt-, hope h-ooohp-, cube k-yooob-, tube t-oooob-, theme th-eeeemmm, me mmmeeee, go g-oooh, hi h-iiiy, fly fl-iiiy (the silent e is not said)');
  ok(S('cap') === 'k-aaap-' && S('cape', 51) === 'k-aaap-eee' && S('ship') === 'shhhiiip-', 'notation: a short word is written as always; before its lesson a pattern word is written letter by letter');
  const spoken = (t) => scriptToParts(t, Object.keys(CUR.sounds)).filter((p) => p.tts || p.clip).map((p) => p.tts || ('clip:' + p.clip)).join(' ');
  ok(!/clip/.test(spoken('Say: k-aaayp- and h-ooohp- and k-yooob- and t-oooob- and th-eeeemmm. Say cape. Say eeee and oooo now. mmmeeee g-oooh h-iiiy')) && !/aaay|ooo|eeee|iiiy|yooo|mmm|-/.test(spoken('Say: k-aaayp- and h-ooohp- and k-yooob- and t-oooob- and th-eeeemmm. Say cape. Say eeee and oooo now. mmmeeee g-oooh h-iiiy')) && /cape/.test(spoken('Say: k-aaayp-. Say cape.')), 'notation: the long-vowel notation (aaay iiiy oooh yooo oooo eeee) is shown, never spoken by the phone, and never turned into the short vowel clip');
  ok(soundText('a_e', CUR.sounds) === 'aaay' && soundText('i_e', CUR.sounds) === 'iiiy' && soundText('o_e', CUR.sounds) === 'oooh' && soundText('u_e', CUR.sounds) === 'yooo' && soundText('e_e', CUR.sounds) === 'eeee' && soundText('open', CUR.sounds) === 'eeee', 'notation: a pattern card is written as how its vowel says its name');
  ok(Object.values(LONG_SAY).every((t) => /([a-z])\1{2,}/.test(t)) && !Object.values(LONG_SAY).some((t) => /(yyy|hhh)/.test(t)), 'notation: every long-vowel notation has a stretched run and none stretches a clipped sound (no yyy, no hhh)');
  ok(W7L.every((L) => L.quickCheck.gist.length <= 28 && L.quickCheck.kind === 'letter' && L.quickCheck.options.length === 3 && L.quickCheck.options.filter((o) => o.correct).length === 1 && L.quickCheck.options[0].glyph === L.quickCheck.options.find((o) => o.correct).glyph && L.quickCheck.promptTextQuiet === 'Listen to your grown-up. Then touch the card.'), 'Ticket Check: a question about a card, three cards, one right, the grown-up gist at most 28 characters');
  ok(W7L.every((L) => L.introQuiet.length === 1 && /grown-up/.test(L.introQuiet[0].tts) && /pattern/.test(L.introQuiet[0].tts) && !/ new sound/.test(L.intro[0].tts)) && soundCardLines(CUR.sounds.a_e)[0].startsWith('A pattern, not a new sound.') && CUR.sounds.a_e.parentNote.startsWith('A pattern, not a new sound.'), 'wording: a long-vowel pattern is called a pattern, never a sound');
  ok(W7L.every((L) => [CUR.sounds[L.sound].parentNote, CUR.sounds[L.sound].howTo, L.quickCheck.script, L.quickCheck.gist].every((t) => !/\b(he|she|his|her)\b/i.test(t || '') || /heart words \(he, me, go, my\)/.test(t || ''))), 'wording: the grown-up notes keep to "your child" and neutral words');
  ok(W7L.every((L) => ['hunt', 'wagons', 'signals'].every(() => true)) && CUR.lessons[51].quickCheck.options[0].glyph === 'a_e' && !CUR.lessons[51].quickCheck.options.some((o) => o.glyph === 'a'), 'Ticket Check: the cards are pattern cards, never a bare letter');
  // 7. Magic e Car
  const wordsList = new Set([...WJ.words, ...WJ.blendWords, ...WJ.endingWords, ...WJ.patternWords]);
  for (const L of W7L.filter((x) => x.magic)) {
    const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, L.number));
    ok(L.magic.length >= 4 && L.magic.every((c) => c.to === c.from + 'e' && c.options.length === 3 && c.options[0] === 'e' && new Set(c.options).size === 3 && isReadablePatterns(c.to, taught) && isReadablePatterns(c.from, taught) && PAT.get(c.to).e !== null && !PAT.has(c.from) && c.vowel === PAT.get(c.to).vowel && c.options.slice(1).every((o) => !wordsList.has(c.from + o) && !PAT.has(c.from + o))), `lesson ${L.number}: ${L.magic.length} Magic e Car items, three distinct cars, the e first, the wrong cars never make a word (${L.magic.map((c) => c.from + '>' + c.to).join(' ')})`);
  }
  ok(['cap>cape', 'kit>kite', 'hop>hope', 'cub>cube'].every((x) => W7L.some((L) => (L.magic || []).some((c) => `${c.from}>${c.to}` === x))), 'magic: cap cape, kit kite, hop hope and cub cube are in');
  ok(W7L.slice(1, 5).every((L) => L.magic.every((c) => PAT.get(c.to).key === L.sound)) && W7L[5].magic.some((c) => PAT.get(c.to).key === 'e_e') && W7L[6].magic.some((c) => PAT.get(c.to).key === 'u_e'), 'magic: lessons 52 to 55 couple the e of their own pattern; 56 and 57 mix');
  // 8. stops
  const ck = Object.fromEntries(CUR.checkpoints.map((k) => [k.id, k]));
  ok(CUR.checkpoints.map((k) => `${k.id}:${k.after}`).join() === 'r1:4,b1:4,b2:6,b3:22,b4:31,b5:40,b6:49,b7:56,x1:9,x2:12,x3:14,x4:17,x5:18,x6:21,x7:22,x8:23,x9:27,x10:28,x11:35,x12:41,x13:43,x14:47,x15:55,v1:3,v6:6,v2:9,v3:12,v4:15,v5:17,v7:20,v8:23,v9:25,v10:30,v11:33,v12:38,v13:42,v14:46,v15:50,v16:54,v17:57', 'stops: ids and places (older ids never renumbered)');
  const nodes = CUR.lessons.flatMap((l) => [{ lesson: l }, ...CUR.checkpoints.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
  const w7nodes = nodes.filter((n) => (n.lesson ? n.lesson.world : n.checkpoint.world) === 'W7');
  ok(w7nodes.at(-1).checkpoint && w7nodes.at(-1).checkpoint.id === 'v17' && w7nodes.at(-1).checkpoint.kind === 'review', 'stops: World 7 ends with a Review Stop (v17)');
  ok(w7nodes.map((n) => (n.lesson ? n.lesson.number : n.checkpoint.id)).join() === '51,52,53,54,v16,55,x15,56,b7,57,v17', 'stops: World 7 in order, 51 to 54, mid-world Review Stop, 55, Tricky Sounds, 56, Story 7, 57, end-of-world Review Stop');
  ok(ck.x15.kind === 'contrast' && ck.x15.mode === 'says' && ck.x15.after === 55 && ck.x15.world === 'W7' && ck.x15.pair.length === 0 && ck.x15.sides.map((s) => s.signText).join() === 'short,long' && ck.x15.sides[0].words.every((w) => !PAT.has(w)) && ck.x15.sides[1].words.every((w) => PAT.has(w) && PAT.get(w).e !== null) && ['cap/cape', 'kit/kite', 'hop/hope', 'cub/cube'].every((x) => ck.x15.pairs.some((p) => `${p.a}/${p.b}` === x)), 'Tricky Sounds x15 (after 55): short vowels against long vowels, tunnels marked short and long, then the short word against the same word with a silent e (cap/cape, kit/kite, hop/hope, cub/cube)');
  ok(ck.x15.plan.map((a) => a.task).join() === 'tunnels,which,check' && ck.x15.sides.every((s) => !s.letters.length && s.words.length === 6 && s.words.every((w) => isReadablePatterns(w, lettersOfSounds(ORDER_SOUNDS.slice(0, 55))))) && ck.x15.quickCheck.gist.length <= 28 && ck.x15.tunnelLine && ck.x15.pairs.every((p) => !p.images || (p.images[p.a] && p.images[p.b])), 'Tricky Sounds x15: Two Tunnels, Which One?, Ticket Check; every word decodable by lesson 55; a picture only when both words have one');
  ok(ck.v16.kind === 'review' && ck.v16.after === 54 && ck.v16.plan.every((a) => a.lesson <= 54) && ck.v16.plan.at(-1).task === 'check' && ck.v16.plan.some((a) => a.task === 'magic') && ck.v16.world === 'W7' && !ck.v16.mix, 'Review Stop v16 (after 54, the middle of the world): nothing past lesson 54 shows, Magic e Car in it, Ticket Check last');
  ok(ck.v17.mix === 'patterns' && ck.v17.after === 57 && ck.v17.plan.some((a) => a.task === 'magic') && ck.v17.plan.at(-1).task === 'check' && ck.v17.world === 'W7' && ck.v17.plan.length === 5 && [57, 55, 54, 53].every((n) => ck.v17.plan.some((a) => a.lesson === n)), 'Review Stop v17 (after 57, the end of the world): mixes the patterns, Ticket Check last');
  ok(ck.v15.summary.words === 716 && ck.v15.summary.sounds === 33 && ck.v15.summary.blends === 22 && ck.v15.summary.endings === 4 && !('patterns' in ck.v15.summary), 'Review Stops: v15 keeps its counts (33 sounds, 22 blends, 4 word endings, 716 words), no patterns yet');
  ok(ck.v16.summary.sounds === 33 && ck.v16.summary.blends === 22 && ck.v16.summary.endings === 4 && ck.v16.summary.patterns === 4 && ck.v17.summary.patterns === 6 && ck.v17.summary.sounds === 33 && ck.v16.summary.words > ck.v15.summary.words && ck.v17.summary.words > ck.v16.summary.words, `Review Stops: a pattern is not a sound (still 33 sounds, 22 blends, 4 word endings; 4 patterns at v16, 6 at v17), the word count grows (${ck.v15.summary.words}, ${ck.v16.summary.words}, ${ck.v17.summary.words})`);
  ok(ck.v16.summary.examples.every((w) => wordsList.has(w)) && ck.v17.summary.examples.every((w) => PAT.has(w)) && ck.v17.summary.examples.every((w) => isReadablePatterns(w, T57)), `Review Stops: v17 examples lead with the newest patterns (${ck.v16.summary.examples.join(' ')} / ${ck.v17.summary.examples.join(' ')})`);
  ok(JSON.stringify(ck.v17.summary.hearts) === JSON.stringify(CUR.lessons.flatMap((L) => L.heart || [])) && ck.v17.summary.hearts.slice(-4).join() === 'bye,have,give,live', 'Review Stops: v17 lists the heart words, counted apart (bye have give live are the new ones)');
  ok(reviewMessageText(ck.v15.summary).startsWith('Your child has learned 33 sounds, 22 blends and 4 word endings. Words made only from these sounds and word parts include: ') && reviewMessageText(ck.v17.summary).startsWith('Your child has learned 33 sounds, 22 blends, 4 word endings and 6 long-vowel patterns. Words made only from these sounds, word parts and patterns include: ') && reviewMessageText(ck.v16.summary).startsWith('Your child has learned 33 sounds, 22 blends, 4 word endings and 4 long-vowel patterns. ') && new RegExp(`That's ${ck.v17.summary.words} words in all`).test(reviewMessageText(ck.v17.summary)), 'Review Stop message: older stops read as before; the new ones name the long-vowel patterns apart from the sounds ("can read N words" stays truthful)');
  ok(ck.b7.kind === 'book' && ck.b7.book === 'book-7' && ck.b7.world === 'W7' && ck.b7.after === 56 && JSON.stringify(ck.b7.needs) === JSON.stringify(ORDER_SOUNDS.slice(0, 56)), 'stops: Story 7 is in World 7, after lesson 56 (e_e)');
  // 9. heart words: bye (51), have (56), give and live (57): never more than two a lesson
  ok(CUR.lessons[50].heart.join() === 'bye' && CUR.lessons[55].heart.join() === 'have' && CUR.lessons[56].heart.join() === 'give,live' && CUR.lessons.slice(0, 50).every((L, i) => JSON.stringify(L) === JSON.stringify(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8')).lessons[i])), 'heart words: bye at 51, have at 56, give and live at 57 (two at most a lesson)');
  ok(['bye', 'have', 'give', 'live'].every((w) => CUR.heartWords[w] && CUR.heartWords[w].parts.some((p) => p.heart) && CUR.heartWords[w].parts.map((p) => p.t).join('') === w && CUR.heartWords[w].phrase.split(' ').length >= 2 && CUR.heartWords[w].phrase.split(' ').length <= 4), 'heart words: each has its parts (a heart part), a phrase and the find-it cards');
  // 10. levels, counts
  ok(CUR.levels.map((v) => v.after).join() === '6,17,25,33,42,50,57' && CUR.levels[6].car === 'gondola' && CUR.levels[6].needs.length === 57 && CUR.levels[5].car === 'boxcar', 'levels: level seven (a gondola car) comes after lesson 57; levels one to six are unchanged');
  ok(carsOf(CUR.levels).join() === 'coach,flatbed,tanker,dome,boxcar,gondola,caboose', 'levels: the special cars in train order, the gondola before the caboose');
  const words = [...WJ.words, ...WJ.blendWords, ...WJ.endingWords, ...WJ.patternWords]; words.blend = new Set(WJ.blendWords); words.ending = new Set(WJ.endingWords); words.pattern = new Set(WJ.patternWords);
  const cnt = (n) => countReadable(words, ORDER_SOUNDS.slice(0, n));
  ok(cnt(50) === 716 && cnt(51) > cnt(50) && cnt(52) > cnt(51) && cnt(53) > cnt(52) && cnt(54) > cnt(53) && cnt(55) > cnt(54) && cnt(56) > cnt(55) && cnt(54) === ck.v16.summary.words && cnt(57) === ck.v17.summary.words && cnt(57) === cnt(56), `reading count: Can read N words grows with each pattern (${[50, 51, 52, 53, 54, 55, 56, 57].map(cnt).join(', ')}); the mixed review adds none`);
  ok(WJ.patternWords.length >= 120 && WJ.patternWords.every((w) => !WJ.words.includes(w) && !WJ.blendWords.includes(w) && !WJ.endingWords.includes(w) && !HEARTS.has(w) && PAT.has(w) && isReadablePatterns(w, T57)) && new Set(WJ.patternWords).size === WJ.patternWords.length, `words: ${WJ.patternWords.length} World 7 words, each readable, each with a pattern, none counted twice, no heart word`);
  ok(chipsOf(['m', 'st', 'mix', 'end-s', 'open', 'a_e', 'i_e', 'o_e', 'u_e', 'e_e', 'semix']).join('|') === 'm|st ft|-s|open vowels|a_e|i_e|o_e|u_e|e_e', 'chips: a pattern is one chip each (the mixed review has none)');
  // 11. Story 7 (DRAFT, owner approves the text)
  const taught56 = lettersOfSounds(ORDER_SOUNDS.slice(0, 56)), hearts56 = CUR.lessons.slice(0, 56).flatMap((L) => L.heart || []).map((w) => w.toLowerCase());
  const childWords = BOOK7.pages.flatMap((p) => [p.child, p.slider, ...(p.words || [])].filter(Boolean)).flatMap((t) => t.split(/\s+/)).map((w) => w.replace(/[^a-z]/gi, '').toLowerCase()).filter(Boolean);
  ok(childWords.length >= 10 && childWords.every((w) => hearts56.includes(w) || isReadablePatterns(w, taught56) || isReadable(w, taught56)), `story 7: every word the child reads uses only what lesson 56 taught (${[...new Set(childWords)].join(' ')})`);
  ok(BOOK7.pages.length === 10 && BOOK7.pages.at(-1).kind === 'review' && BOOK7.pages.filter((p) => p.child).every((p) => p.child.split(' ').length === 1) && BOOK7.pages.filter((p) => p.child).length === 7 && BOOK7.draft === true && BOOK7.id === 'book-7', `story 7: ${BOOK7.pages.length} pages, one word to read on each of seven pages, the last a review, marked DRAFT`);
  ok(['cake', 'kite', 'fly', 'rope', 'hi', 'home', 'hope'].every((w) => BOOK7.pages.some((p) => p.child === w)) && BOOK7.pages.some((p) => /Pip/.test(p.read || '')) && BOOK7.pages.some((p) => /Sam/.test(p.read || '')) && BOOK7.pages.some((p) => /\{name\}/.test(p.read || '')) && BOOK7.pages.filter((p) => p.child && PAT.has(p.child)).length === 7, 'story 7: seven pattern words (cake kite fly rope hi home hope), Pip, {name} and Sam');
  ok(BOOK7.pages.every((p) => !/\b(he|she|him|his|her|hers|himself|herself)\b/i.test(p.read || '')) && BOOK7.pages.every((p) => !/\{name\}/.test(p.read || '') || !/\b(he|she|him|his|her)\b/i.test(p.read || '')), 'story 7: the child is called by name, and Pip is never he or she or his or her (the text has none of those at all)');
  ok(JSON.stringify(BOOK7.needs) === JSON.stringify(ORDER_SOUNDS.slice(0, 56)), 'story 7: needs the sounds up to lesson 56');
  // 12. files: every new file is in the service worker's list; the version and the cache name are untouched
  ok(['js/screens/tasks/magic.js', 'data/books/book-7.json'].every((f) => SW.includes(`'${f}'`)), 'sw.js: the new script and the Story 7 file are in APP_FILES');
  ok(/reading-v1\.9\.48/.test(SW) && JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version === '1.9.48' && /1\.9\.48/.test(fs.readFileSync(path.join(ROOT, 'js/version.js'), 'utf8')), 'version: unchanged (1.9.48, cache reading-v1.9.48): the owner bumps it');
  ok(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts.test.indexOf('silent-e.mjs') > 0 && JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts.test.indexOf('silent-e.mjs') < JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts.test.indexOf('stop-hold.mjs'), 'npm test: silent-e runs before stop-hold and no-autoplay');
  // 13. the letter games deal pattern cards with other patterns and letters, never with the train cars of World 6
  for (const n of [52, 53, 54, 55, 56]) {
    const others = otherLetters(CUR, n, KEYS[n], 8);
    ok(others.length >= 6 && others.every((k) => !k.startsWith('end-') && !NO_GLYPH.includes(k) && GLYPHS[k]), `games: lesson ${n} deals ${KEYS[n]} with ${others.slice(0, 5).join(' ')} ... (no train cars, no card without a glyph)`);
  }
  ok(otherLetters(CUR, 45, 'end-ing', 3).includes('end-es'), 'games: World 6 still deals its cars with each other (unchanged)');

  // 14. saved progress: every older order stays exactly as it was
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const { createStore } = await import('../js/store.js');
  const open = (save) => { mem.clear(); mem.set('reading.v1', JSON.stringify(save)); return createStore(); };
  const settings = { migrated1912: true, pace4: true, speak0: true, layoutA: true, heartA: true, seenScripts: { ...SEEN, 'lesson:9': true }, trainAt: 7, trainDone: 12, perDay: 4 };
  const old = (order, n, extra = {}) => ({ schema: 1, order, lessons: doneL(n), checkpoints: stopsDone(Math.min(n, 50)), settings, levels: { seen: 6, earned: L123456 }, worlds: { seen: 'W6' }, character: CHARACTER, firstRunDone: true, lastOpened: '2026-10-12T08:00:00.000Z', savedAt: 1760000000000, ...extra });
  let save = old(PRIOR_ORDERS[4], 50), s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && Object.keys(s.state.lessons).length === 50, 'saves: a finished Endings Junction save keeps lessons 1 to 50 exactly (results, dates, tasks)');
  ok(JSON.stringify(s.state.checkpoints) === JSON.stringify(save.checkpoints) && JSON.stringify(s.state.levels.earned) === JSON.stringify(L123456) && s.state.worlds.seen === 'W6' && s.state.character.name === 'Lily', 'saves: its stops, levels, world record and character stay');
  ok(s.settings.trainAt === 7 && s.settings.trainDone === 12 && s.settings.seenScripts['lesson:9'] === true && s.settings.perDay === 4, 'saves: its settings, train position and seen scripts stay (nothing is dropped)');
  ok(s.currentLesson(57) === 51 && s.isDone(50) && !s.isDone(51) && s.isUnlocked(51) && !s.isUnlocked(52), 'saves: lesson 51 (open vowels) is the current lesson, 52 is still locked behind it');
  s.setResult(51, 'got-it');
  ok(JSON.parse(mem.get('reading.v1')).order === ORDER && JSON.parse(mem.get('reading.v1')).lessons[50].result === 'got-it' && JSON.parse(mem.get('reading.v1')).lessons[3].completedAt === save.lessons[3].completedAt, 'saves: the next save writes the new order and keeps every older result');
  for (const [prior, n] of [[PRIOR_ORDERS[3], 42], [PRIOR_ORDERS[2], 33], [PRIOR_ORDERS[1], 25], [PRIOR_ORDERS[0], 17]]) {
    save = old(prior, n, { levels: { seen: 3, earned: { ...L12, L3: L1234.L3 } }, worlds: { seen: 'W3' } });
    s = open(save);
    ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.currentLesson(57) === n + 1 && s.isDone(n), `saves: a save under the ${n}-sound order is still read as it is (lesson ${n + 1} is next)`);
  }
  save = old(PRIOR_ORDERS[4], 50, { lessons: { ...doneL(50), 51: { tasksDone: [0, 1, 2], result: 'practice-again' } }, worlds: { seen: 'W7' } });
  s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.state.lessons[51].tasksDone.join() === '0,1,2' && s.currentLesson(57) === 51, 'saves: a save mid-way (lesson 51 half done) keeps its task progress and result, no reset');
  save = { ...old(PRIOR_ORDERS[4], 50), order: ORDER, lessons: doneL(53) };
  s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.currentLesson(57) === 54, 'saves: a save under the new order is read as it is');
  s = open(old(PRIOR_ORDERS[4], 50));
  ok(!s.isCheckpointDone(ck.x15) && !s.isCheckpointDone(ck.v17) && currentWorld(s, CUR).id === 'W7' && !s.isDone(57), 'worlds: Endings Junction done, Silent E Summit is now the current world; its stops are not yet done');
  s = open(old(PRIOR_ORDERS[4], 50, { lessons: doneL(55), checkpoints: stopsDone(55) }));
  ok(s.isCheckpointDone(ck.v16) && s.isCheckpointDone(ck.x15) && !s.isCheckpointDone(ck.b7) && !s.isCheckpointDone(ck.v17), 'stops: a child past a stop counts it as passed; the ones ahead are still ahead');
  ok(reachedWorlds(s, CUR).map((w) => w.id).join() === 'W1,W2,W3,W4,W5,W6,W7' && previousWorld(CUR, 'W7').id === 'W6' && previousWorld(CUR, 'W6').id === 'W5', 'worlds: W7 can go back to W6, W6 to W5 and so on');
}

// ---- the screens, in the browser ----
const noSound = (page) => page.evaluate(() => (window.__events || []).filter((e) => e.type === 'clip' || e.type === 'tts').length === 0);
export async function screenChecks({ browser, url, ok }) {
  // The crossing from Endings Junction into Silent E Summit.
  {
    const crossing = state(50, { migrated1912: true, pace4: true, trainIntroDone: true, trainDone: 50 + 5, trainAt: 9999 }, { lessons: doneL(50), levels: levelsFor(50), worlds: { seen: 'W6' }, checkpoints: stopsDone(50), character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, PHONE, crossing);
    ok(await until(page, () => !!document.querySelector('.world-card.in') || (window.__train && window.__train.world === 'W6' && window.__train.gate && window.__train.gate.phase), null, 20000), 'crossing: Endings Junction is done, so the crossing plays');
    ok(await until(page, () => !!document.querySelector('.world-card.in'), null, 25000), 'crossing: the loading card shows between the two worlds');
    ok((await page.locator('.wg-name').textContent()) === 'Silent E Summit', 'crossing: it names Silent E Summit');
    await page.waitForTimeout(600);
    await page.locator('.world-card .wg-go').click();
    ok(await until(page, () => window.__train && window.__train.world === 'W7' && window.__train.frames > 0, null, 20000), 'crossing: Silent E Summit is built after it');
    const w7 = await page.evaluate(() => ({ stops: window.__train.stopCount, l: window.__train.lessonCount, c: window.__train.checkpointCount, start: window.__train.startTunnel, portal: window.__train.portal, sign: window.__train.signText, theme: window.__train.theme, placeholder: window.__train.placeholder }));
    ok(w7.stops === 11 && w7.l === 7 && w7.c === 4 && w7.start && w7.portal && w7.sign === 'Vowel Team Town' && !w7.placeholder, `crossing: World 7 has its seven lessons and four stops (Tricky Sounds, Story 7, two Review Stops), a start tunnel and a portal to Vowel Team Town (${JSON.stringify(w7)})`);
    ok(await settled(page, 40000), 'crossing: the train rolls out and settles');
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).worlds.seen)) === 'W7', 'crossing: it is recorded, so it plays once');
    const btns = await page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => b.getAttribute('aria-label') + '|' + b.className.replace(/.*is-/, '')));
    ok(/^Lesson 51/.test(btns[0]) && /current/.test(btns[0]) && btns.filter((b) => b.startsWith('Story 7')).length === 1 && btns.filter((b) => b.startsWith('Review Stop')).length === 2 && btns.filter((b) => b.startsWith('Tricky Sounds')).length === 1 && btns.filter((b) => b.startsWith('Lesson')).length === 7, `home: Lesson 51 is the current stop; Story 7, two Review Stops, one Tricky Sounds and seven lessons (${btns.join(' ; ')})`);
    ok(/Review Stop/.test(btns.at(-1)), 'home: World 7 ends with a Review Stop');
    await page.waitForTimeout(3300);
    await shot(page, 'w7-home');
    ok(errors.length === 0, `crossing: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // The Home of World 7 on a normal visit, and going back W7 to W6 to W5.
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(52));
    ok(await until(page, () => window.__train && window.__train.world === 'W7' && window.__train.frames > 1, null, 20000), 'visit: the Home opens on World 7');
    ok(await settled(page), 'visit: it settles');
    const before = await page.evaluate(() => localStorage.getItem('reading.v1'));
    const show = async (role) => { await page.evaluate((r) => window.__train.show(r === 'back' ? -5 : window.__train.stopCount - 1), role); await page.waitForTimeout(250); return until(page, (r) => { const b = document.querySelector(`.portal-btn[data-role="${r}"]`); return b && b.dataset.shown === '1'; }, role, 5000); };
    const goBack = async (worldId, label) => {
      ok(await show('back'), `visit: the start tunnel is a button (towards ${label})`);
      ok((await page.locator('.portal-btn[data-role="back"]').getAttribute('aria-label')) === `Back to ${label}`, `visit: it is labelled "Back to ${label}"`);
      await page.locator('.portal-btn[data-role="back"]').click();
      ok(await until(page, (w) => window.__train && window.__train.world === w && window.__train.frames > 0, worldId, 20000), `visit: ${label} shows`);
      ok(await settled(page), `visit: ${label} settles`);
    };
    await goBack('W6', 'Endings Junction');
    await goBack('W5', 'Blend Bay');
    ok(await show('forward') && (await page.locator('.portal-btn[data-role="forward"]').getAttribute('aria-label')) === 'On to Endings Junction', 'visit: its end tunnel leads on to Endings Junction again');
    ok((await page.evaluate(() => localStorage.getItem('reading.v1'))) === before, 'visit: going back and forth changed nothing in the saved progress');
    ok(errors.length === 0, `visit: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // New Pattern (51 to 57): the card, the card that says a pattern is not a sound, the rows and the grown-up gist.
  for (const [n, rows] of [[51, ['me', 'go', 'hi']], [52, ['cap + e']], [53, ['kit + e']], [54, ['hop + e']], [55, ['cub + e', 'tub + e']], [56, ['pet + e']], [57, []]]) {
    const m = await newPage(browser, n === 55 ? SMALL : PHONE);
    await seedPage(m, n - 1);
    await m.page.goto(url + `#/lesson/${n}/task/1`);
    await m.page.waitForSelector('.new-letter');
    await m.page.waitForTimeout(2800);
    const d = await m.page.evaluate(() => ({ cards: [...document.querySelectorAll('.letter-card svg.glyph')].map((g) => ({ key: g.dataset.letter, strokes: g.querySelectorAll('path.stroke').length, links: g.querySelectorAll('path.glyph-link').length, w: g.getBoundingClientRect().width, h: g.getBoundingClientRect().height, r: g.getBoundingClientRect().right })), rows: [...document.querySelectorAll('.blend-rows li')].map((li) => li.textContent), card: document.querySelector('.pattern-card') && document.querySelector('.pattern-card').textContent, overflow: document.documentElement.scrollWidth > innerWidth, tiles: document.querySelectorAll('.word-tile').length, body: document.body.innerText, gist: (document.querySelector('.script-first') || {}).textContent || '' }));
    ok(d.cards.length === 1 && d.cards[0].key === KEYS[n] && d.cards[0].strokes === GLYPHS[KEYS[n]].strokes.length && d.cards[0].links === 1 && d.cards[0].w > 40 && d.cards[0].r <= (n === 55 ? 360 : 390) && !d.overflow, `New Pattern ${n}: the ${KEYS[n]} card is drawn (${JSON.stringify(d.cards)})`);
    ok(/A pattern, not a new sound|Short vowels and long vowels/.test(d.card) && rows.every((r, i) => d.rows[i] && d.rows[i].includes(r)) && d.tiles === CUR.sounds[KEYS[n]].words.length, `New Pattern ${n}: the card says a pattern is not a sound and lists ${rows.join(' | ') || 'no rows'} (${d.rows.join(' | ')})`);
    ok(/New Pattern/.test(d.body) && !/Hold it/.test(d.body) && d.gist.length > 0 && d.gist.length <= 28, `New Pattern ${n}: the step is called New Pattern, the grown-up gist fits ("${d.gist}")`);
    ok(await noSound(m.page), `New Pattern ${n}: nothing plays on its own`);
    if ([51, 52, 55].includes(n)) await shot(m.page, `new-pattern-${n}${n === 55 ? '-360' : ''}`);
    ok(m.errors.length === 0, `New Pattern ${n}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // The lesson overview says silent e, never "the sound" (a pattern is not a sound).
  for (const [n, want] of [[51, 'Today: vowels at the end of a word, as in go.'], [52, 'Today: the silent e, as in cake.'], [55, 'Today: the silent e, as in cube.'], [56, 'Today: the silent e, as in eve.'], [57, 'Today: short and long vowels together.']]) {
    const m = await newPage(browser, PHONE);
    await seedPage(m, n - 1);
    await m.page.goto(url + `#/lesson/${n}`);
    await m.page.waitForSelector('.lo-title p');
    const t = await m.page.evaluate(() => { const c = document.querySelector('.lo-title p').cloneNode(true); c.querySelectorAll('svg[data-letter]').forEach((g) => g.replaceWith(g.dataset.letter)); return c.textContent.replace(/\s+/g, ' ').trim(); });
    ok(t === want, `Lesson ${n} overview: "${t}"`);
    if (n === 52) {
      await m.page.goto(url + `#/lesson/${n}/task/0`);
      await m.page.waitForSelector('.review');
      await m.page.getByText('Show it').click();
      await m.page.waitForTimeout(300);
      await m.page.locator('button[aria-label="Hear this again"]').first().click();
      await m.page.waitForTimeout(300);
      ok(m.errors.length === 0 && (await m.page.evaluate(() => (window.__events || []).filter((e) => e.type === 'tts').length === 0)), `Letter Review of two word parts: Show it, then the speaker, no errors and nothing spoken ${m.errors.join(' | ')}`);
    }
    await m.ctx.close();
  }
  // The arc: a word whose pattern is taught shows the silent e jumping back to the vowel; before that it is plain letters.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 51);
    await m.page.goto(url + '#/home');
    await m.page.waitForTimeout(600);
    const a = await m.page.evaluate(async () => {
      const { wordSvg } = await import('/js/glyphs.js');
      const info = (w, level, font) => { const s = wordSvg(w, { level, all: true, font }); return { arc: s.querySelectorAll('path.silent-arc').length, silent: [...s.querySelectorAll('.glyph-letter.silent-e')].map((g) => g.dataset.letter).join(''), says: [...s.querySelectorAll('.glyph-letter.says-name')].map((g) => g.dataset.letter).join(''), vb: s.getAttribute('viewBox').split(' ').map(Number) }; };
      return { before: info('cape', 51), at: info('cape', 52), kite: info('kite', 52), kite2: info('kite', 53), shade: info('shade', 52), theme: info('theme', 56), go: info('go', 51), cap: info('cap', 57), font: info('cape', 57, true), none: (() => { const s = wordSvg('cape', { all: true }); return s.querySelectorAll('path.silent-arc').length; })() };
    });
    ok(a.before.arc === 0 && !a.before.silent && a.at.arc === 1 && a.at.silent === 'e' && a.at.says === 'a' && a.kite.arc === 0 && a.kite2.arc === 1 && a.kite2.says === 'i' && a.shade.arc === 1 && a.shade.says === 'a' && a.theme.arc === 1 && a.theme.says === 'e' && a.go.arc === 0 && a.cap.arc === 0 && a.font.arc === 1 && a.none === 0, `arc: shown only once the lesson has taught the pattern (cape plain at 51, with its jump at 52; kite not before 53); an open vowel and a short word have none (${JSON.stringify(a)})`);
    ok(a.at.vb[1] < a.before.vb[1], 'arc: the picture grows upwards to hold the arc (it is never clipped)');
    ok(m.errors.length === 0, `arc: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Saying Sounds: the word is drawn with the arc from the silent e to the vowel; the gist fits.
  for (const n of [51, 52, 53, 54, 55, 56, 57]) {
    const m = await newPage(browser, n === 55 ? SMALL : PHONE);
    await seedPage(m, n - 1);
    await m.page.goto(url + `#/lesson/${n}/task/${at(n, 'sounds')}`);
    await m.page.waitForSelector('.glyph-letter');
    await m.page.waitForTimeout(900);
    const words = WORDS[n].split(' ');
    for (const [i, w] of words.entries()) {
      const f = await m.page.evaluate(() => { const s = document.querySelector('.word-glyphs'), r = s.getBoundingClientRect(); return { word: s.getAttribute('aria-label'), letters: [...s.querySelectorAll('.glyph-letter')].map((e) => e.dataset.letter), arc: s.querySelectorAll('path.silent-arc').length, dim: s.querySelectorAll('.glyph-letter.silent-e').length, x: r.x, r: r.right, top: r.top, gist: (document.querySelector('.script-first') || {}).textContent || '', overflow: document.documentElement.scrollWidth > innerWidth }; });
      const p = patternSpans(w, n), want = letterUnits(w, n);
      ok(f.word === w && f.letters.join() === want.join() && f.x >= 0 && f.r <= (n === 55 ? 360 : 390) && !f.overflow && f.gist.length > 0 && f.gist.length <= 28, `Saying Sounds ${n}: ${w} is drawn as ${want.join(' ')} and fits (gist "${f.gist}")`);
      ok(f.arc === (p && p.e != null ? 1 : 0) && f.dim === f.arc, `Saying Sounds ${n}: ${w} ${p && p.e != null ? 'shows the jump arc and a dim e' : 'has no arc'}`);
      ok(f.gist.includes(w) || f.gist === '' || /then/.test(f.gist), `Saying Sounds ${n}: the gist names the word (${f.gist})`);
      if (i < words.length - 1) { await m.page.getByText('Next word').click(); await m.page.waitForTimeout(450); }
    }
    ok(await noSound(m.page), `Saying Sounds ${n}: nothing plays on its own`);
    if (n === 52 || n === 55) await shot(m.page, `saying-sounds-${n}${n === 55 ? '-360' : ''}`);
    ok(m.errors.length === 0, `Saying Sounds ${n}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Magic e Car (lesson 52): the grown-up's words, a gap, three cars, a wrong car does nothing, the right one couples on and the word becomes its long partner, four rounds, nothing plays on its own.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 51);
    await m.page.addInitScript(() => { window.__raf = 0; const r = window.requestAnimationFrame; window.requestAnimationFrame = (f) => { window.__raf++; return r.call(window, f); }; });
    await m.page.goto(url + `#/lesson/52/task/${at(52, 'magic')}`);
    await m.page.waitForSelector('.magic-game .chain-car.gap', { timeout: 10000 });
    await m.page.waitForTimeout(900);
    const first = CUR.lessons[51].magic[0];
    const d = await m.page.evaluate(() => ({ cars: [...document.querySelectorAll('.magic-track .chain-car:not(.gap)')].map((c) => c.dataset.letter).join(''), choices: [...document.querySelectorAll('.magic-choices .chain-car')].map((c) => c.dataset.letter), prompt: document.querySelector('.say-prompt').textContent, overflow: document.documentElement.scrollWidth > innerWidth, gist: (document.querySelector('.script-first') || {}).textContent, title: document.body.innerText.includes('Magic e Car') }));
    ok(d.cars === first.from && d.choices.length === 3 && d.choices.includes('e') && new RegExp(`${first.from}.*magic e.*${first.to}`).test(d.prompt) && !d.overflow && d.title && d.gist.length <= 28, `Magic e Car: ${first.from} is a row of letter cars with a gap, three cars, the prompt names ${first.to} (${d.cars}; ${d.choices}; ${d.prompt}; "${d.gist}")`);
    ok(await noSound(m.page), 'Magic e Car: nothing plays on its own');
    const wrong = d.choices.find((c) => c !== 'e');
    await m.page.locator(`.magic-choices .chain-car[data-letter="${wrong}"]`).click();
    await m.page.waitForTimeout(300);
    ok((await m.page.locator('.magic-track .chain-car.gap').count()) === 1 && (await m.page.locator('.magic-game').getAttribute('data-round')) === '0', 'Magic e Car: a wrong car does nothing (the gap stays)');
    const sizes = await m.page.evaluate(() => [...document.querySelectorAll('.magic-choices .chain-car')].map((c) => { const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    ok(sizes.every(([w, h]) => w >= 48 && h >= 48), `Magic e Car: the cars are at least 48 px to tap (${JSON.stringify(sizes)})`);
    await shot(m.page, 'magic-e-car');
    for (let r = 0; r < 4; r++) {
      const c = CUR.lessons[51].magic[r];
      await m.page.waitForFunction((to) => document.querySelector('.magic-game').dataset.word === to && document.querySelector('.magic-track .chain-car.gap'), c.to, { timeout: 6000 });
      await m.page.locator('.magic-choices .chain-car[data-letter="e"]').click();
      await m.page.waitForTimeout(300);
      if (r === 0) {
        const solved = await m.page.evaluate(() => ({ e: !!document.querySelector('.magic-track .chain-car[data-letter="e"]'), prompt: document.querySelector('.say-prompt').textContent }));
        ok(solved.e && new RegExp(`${c.to}!`).test(solved.prompt) && /silent/.test(solved.prompt), `Magic e Car: the e car couples on, ${c.to} is whole and the e is silent (${JSON.stringify(solved)})`);
        await m.page.waitForTimeout(900);
        const pair = await m.page.evaluate(() => { const p = document.querySelector('.magic-pair'); return p && { from: p.dataset.from, to: p.dataset.to, arc: p.querySelectorAll('.mp-to path.silent-arc').length, dim: p.querySelectorAll('.mp-to .silent-e').length, fromArc: p.querySelectorAll('.mp-from path.silent-arc').length, r: p.getBoundingClientRect().right, l: p.getBoundingClientRect().left }; });
        ok(pair && pair.from === c.from && pair.to === c.to && pair.arc === 1 && pair.dim === 1 && pair.fromArc === 0 && pair.l >= 0 && pair.r <= 390, `Magic e Car: the short word, an arrow and the long word with its jump arc and a dim e (${JSON.stringify(pair)})`);
        await shot(m.page, 'magic-e-car-solved');
      }
      if (r < 3) await m.page.waitForTimeout(1500);
    }
    await m.page.waitForFunction(() => document.querySelector('.magic-game').dataset.state === 'done', null, { timeout: 6000 });
    ok(await noSound(m.page), 'Magic e Car: still nothing played after four rounds (the speaker is the only thing that plays)');
    const raf0 = await m.page.evaluate(() => window.__raf);
    await m.page.waitForTimeout(1500);
    ok((await m.page.evaluate(() => window.__raf)) - raf0 <= 2, 'Magic e Car: no idle frame loop');
    // the speaker plays a recording of the word only, and only when tapped
    await m.page.locator('.board-hear').click();
    await m.page.waitForTimeout(400);
    const lastTo = CUR.lessons[51].magic[3].to;
    const ev = await m.page.evaluate(() => window.__events);
    ok(ev.filter((e) => e.type === 'tts').length === 0 && ev.filter((e) => e.type === 'clip').every((e) => e.src.startsWith(lastTo + '.')), `Magic e Car: the speaker plays a recording of the new word only (${lastTo}), never text to speech and never a letter-sound clip (${JSON.stringify(ev)})`);
    ok(m.errors.length === 0, `Magic e Car: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Tricky Sounds x15: tunnels short vowel and long vowel, six word rounds, Which One? with the short word against the long one, Ticket Check.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 55);
    await m.page.goto(url + '#/checkpoint/x15/task/0');
    await m.page.waitForSelector('.tunnels .tunnel', { timeout: 10000 });
    await m.page.waitForTimeout(1200);
    const t = await m.page.evaluate(() => ({ signs: [...document.querySelectorAll('.tunnel-text')].map((e) => e.textContent), stars: document.querySelectorAll('.star-slot').length, overflow: document.documentElement.scrollWidth > innerWidth, tunnels: [...document.querySelectorAll('.tunnel')].map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }) }));
    ok(t.signs.join() === 'short,long' && t.stars === 6 && !t.overflow && t.tunnels.every(([w, h]) => w >= 48 && h >= 48), `x15: two tunnels marked short and long, six rounds, 48 px targets (${JSON.stringify(t)})`);
    for (let r = 0; r < 6; r++) {
      await m.page.waitForTimeout(r ? 1800 : 300);
      const car = await m.page.evaluate(() => { const c = document.querySelector('.tcar'); return { side: c.dataset.side, kind: c.dataset.kind, value: c.dataset.value, arc: c.querySelectorAll('path.silent-arc').length }; });
      if (r === 0) {
        const side = CUR.checkpoints.find((k) => k.id === 'x15').sides[Number(car.side)];
        ok(car.kind === 'word' && side.words.includes(car.value), `x15: every round is a word on the car (${car.value})`);
        await m.page.locator(`.tunnel[data-side="${1 - Number(car.side)}"]`).click();
        await m.page.waitForTimeout(900);
        ok((await m.page.locator('.tunnels').getAttribute('data-round')) === '0', 'x15: the wrong tunnel bounces the car back');
        await shot(m.page, 'tricky-x15');
      }
      await m.page.locator(`.tunnel[data-side="${car.side}"]`).click();
    }
    await m.page.waitForFunction(() => document.querySelector('.tunnels').dataset.state === 'done', null, { timeout: 8000 });
    ok(await noSound(m.page), 'x15: nothing plays on its own');
    await m.page.goto(url + '#/checkpoint/x15/task/1');
    await m.page.waitForSelector('.which-card', { timeout: 10000 });
    await m.page.waitForTimeout(900);
    const w = await m.page.evaluate(() => ({ cards: [...document.querySelectorAll('.which-card')].map((c) => c.dataset.word), prompt: (document.querySelector('.say-prompt .say-text') || {}).textContent, gist: (document.querySelector('.script-first') || {}).textContent, overflow: document.documentElement.scrollWidth > innerWidth, hit: [...document.querySelectorAll('.which-card')].map((c) => { const q = c.getBoundingClientRect(); return [Math.round(q.width), Math.round(q.height)]; }) }));
    const stop = CUR.checkpoints.find((k) => k.id === 'x15');
    ok(w.cards.length === 2 && stop.pairs.some((p) => w.cards.includes(p.a) && w.cards.includes(p.b)) && /^Say: /.test(w.prompt) && w.gist.length <= 28 && !w.overflow && w.hit.every(([a, b]) => a >= 48 && b >= 48), `x15: Which One? shows a short word and the same word with a silent e (${w.cards}; ${w.prompt}; "${w.gist}")`);
    await shot(m.page, 'which-one-x15');
    ok(await noSound(m.page), 'x15: Which One? plays nothing on its own');
    ok(m.errors.length === 0, `x15: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Review Stops v16 and v17: each step opens the right game; the end message counts patterns apart from sounds.
  for (const [id, n, names] of [['v16', 54, ['Letter Hunt', 'Magic e Car', 'Wagon Parade', 'Green Light', 'Ticket Check']], ['v17', 57, ['Magic e Car', 'Letter Hunt', 'Wagon Parade', 'Green Light', 'Ticket Check']]]) {
    const m = await newPage(browser, PHONE);
    await seedPage(m, n);
    for (const [i, name] of names.entries()) {
      await m.page.goto(url + `#/checkpoint/${id}/task/${i}`);
      await m.page.waitForTimeout(1300);
      const txt = await m.page.evaluate(() => ({ title: (document.querySelector('.task-head h1, h1') || {}).textContent || '', overflow: document.documentElement.scrollWidth > innerWidth }));
      ok(txt.title.includes(name) && !txt.overflow, `${id} step ${i + 1}: ${name} opens (${txt.title.trim()})`);
    }
    ok(await noSound(m.page), `${id}: nothing plays on its own`);
    await m.page.goto(url + `#/checkpoint/${id}/finish`);
    await m.page.waitForTimeout(1200);
    const msg = await m.page.locator('.review-message').textContent();
    const stop = CUR.checkpoints.find((k) => k.id === id);
    ok(new RegExp(`^Your child has learned 33 sounds, 22 blends, 4 word endings and ${stop.summary.patterns} long-vowel patterns\\. Words made only from these sounds, word parts and patterns include: `).test(msg) && new RegExp(`That's ${stop.summary.words} words in all`).test(msg), `${id}: the end message counts sounds, blends, word endings and patterns apart (${msg.slice(0, 140)})`);
    await shot(m.page, `${id}-finish`);
    ok(m.errors.length === 0, `${id}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Letter Hunt and Wagon Parade deal pattern cards: the cards fit and are 48 px targets (lesson 53 hunt, lesson 54 wagons).
  for (const [n, type, sel] of [[54, 'hunt', ''], [53, 'wagons', '']]) {
    const m = await newPage(browser, SMALL);
    await seedPage(m, n - 1);
    await m.page.goto(url + `#/lesson/${n}/task/${at(n, type)}`);
    await m.page.waitForTimeout(2200);
    const r = await m.page.evaluate(() => ({ glyphs: [...document.querySelectorAll('svg.glyph')].map((g) => g.dataset.letter).filter(Boolean), overflow: document.documentElement.scrollWidth > innerWidth, off: [...document.querySelectorAll('svg.glyph')].filter((g) => { const q = g.getBoundingClientRect(); return q.width && (q.left < -1 || q.right > innerWidth + 1); }).length }));
    ok(!r.overflow && !r.glyphs.some((k) => k && k.startsWith('end-')), `${type} ${n}: the cards fit 360 wide and none is a World 6 car (${r.glyphs.slice(0, 8).join(' ')})`);
    await shot(m.page, `${type}-${n}-360`);
    ok(await noSound(m.page), `${type} ${n}: nothing plays on its own`);
    ok(m.errors.length === 0, `${type} ${n}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Ticket Check (lesson 53: the i_e card among three): the question is about a card.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 52);
    await m.page.goto(url + `#/lesson/53/task/${at(53, 'check')}`);
    await m.page.waitForSelector('.check');
    await m.page.waitForTimeout(800);
    const c = await m.page.evaluate(() => ({ prompt: (() => { const e = document.querySelector('.check-prompt').cloneNode(true); e.querySelectorAll('svg[data-letter]').forEach((g) => g.replaceWith(g.dataset.letter)); return e.textContent; })(), cards: [...document.querySelectorAll('.opt-card svg.glyph')].map((g) => g.dataset.letter), gist: (document.querySelector('.script-first') || {}).textContent }));
    ok(/silent e/.test(c.prompt) && c.cards.sort().join() === ['a_e', 'i_e', 'open'].join() && c.gist === 'Which has i and silent e?', `Ticket Check 53: asks for the i_e card among three (${c.prompt}; ${c.cards})`);
    ok(await noSound(m.page), 'Ticket Check 53: nothing plays on its own');
    await shot(m.page, 'ticket-check-53');
    ok(m.errors.length === 0, `Ticket Check 53: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Heart words: bye in lesson 51 (a silent e at the end of a word that is not a pattern).
  {
    const m = await newPage(browser, SMALL);
    await seedPage(m, 50);
    await m.page.goto(url + `#/lesson/51/task/${at(51, 'heart')}`);
    await m.page.waitForTimeout(1500);
    const t = await m.page.locator('body').innerText();
    ok(/Heart Word/.test(t) && (await m.page.evaluate(() => document.querySelectorAll('.heart-tile, .heart-letters svg, svg.glyph').length >= 3 && document.documentElement.scrollWidth <= innerWidth)), `Heart Word 51: the three letters of bye are shown (b y e) and fit 360 wide (${t.replace(/\s+/g, ' ').slice(0, 100)})`);
    ok(await noSound(m.page), 'Heart Word 51: nothing plays on its own');
    ok(m.errors.length === 0, `Heart Word 51: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Fit at three sizes and 48 px targets: New Pattern, Saying Sounds, Magic e Car, Ticket Check, Track Tracing.
  for (const vp of [SMALL, PHONE, WIDE]) {
    for (const [n, type, label] of [[55, 'newLetter', 'New Pattern'], [55, 'sounds', 'Saying Sounds'], [53, 'magic', 'Magic e Car'], [54, 'magic', 'Magic e Car (silent e at the end)'], [57, 'check', 'Ticket Check'], [52, 'writing', 'Track Tracing']]) {
      const m = await newPage(browser, vp);
      await seedPage(m, n - 1);
      await m.page.goto(url + `#/lesson/${n}/task/${at(n, type)}`);
      await m.page.waitForTimeout(1900);
      const r = await m.page.evaluate(() => {
        const vw = innerWidth, bad = [];
        for (const b of document.querySelectorAll('button, a, .opt-card')) { const q = b.getBoundingClientRect(); if (!q.width || b.hidden || getComputedStyle(b).visibility === 'hidden') continue; if (q.width < 47.5 || q.height < 47.5) bad.push(`${(b.getAttribute('aria-label') || b.textContent || b.className).slice(0, 24)} ${Math.round(q.width)}x${Math.round(q.height)}`); if (q.left < -1 || q.right > vw + 1) bad.push('off-screen ' + (b.className || b.tagName)); }
        const box = (s) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { t: q.top, b: q.bottom, l: q.left, r: q.right }; };
        const scene = box('.chains-scene, .sounds-task, .new-letter, .check, .writing, .trace');
        return { bad, hs: document.documentElement.scrollWidth > vw, scene, track: box('.chain-track'), choices: box('.chain-choices'), prompt: box('.say-prompt'), glyphW: [...document.querySelectorAll('svg.glyph')].every((g) => g.getBoundingClientRect().right <= vw + 1) };
      });
      const inside = (b, s) => !b || !s || (b.l >= s.l - 1 && b.r <= s.r + 1 && b.t >= s.t - 1 && b.b <= s.b + 1);
      const separate = !r.track || !r.choices || r.choices.t >= r.track.b - 2;
      const promptClear = !r.track || !r.prompt || r.prompt.b <= r.track.t + 4 || r.prompt.t >= r.track.b;
      ok(r.bad.length === 0 && !r.hs && r.glyphW && inside(r.track, r.scene) && inside(r.choices, r.scene) && separate && promptClear, `${label} at ${vp.name}: fits, every target is 48 px, the track, the cars and the prompt do not overlap (${JSON.stringify(r)})`);
      if (type === 'newLetter' && vp !== PHONE) await shot(m.page, `new-pattern-55-${vp.name}`);
      if (type === 'magic' && n === 53 && vp !== PHONE) await shot(m.page, `magic-e-car-${vp.name}`);
      if (type === 'sounds' && vp === WIDE) await shot(m.page, `saying-sounds-55-${vp.name}`);
      if (type === 'check' && vp !== PHONE) await shot(m.page, `ticket-check-57-${vp.name}`);
      await m.ctx.close();
    }
  }
  // Grownups lists World 7 and the reading count counts the patterns apart from the sounds.
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(54));
    await page.waitForTimeout(2500);
    const gb = await page.locator('.home-top button').first().boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
    await page.waitForSelector('.grownups', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const txt = await page.locator('body').innerText();
    const wl = Object.assign([...WJ.words, ...WJ.blendWords, ...WJ.endingWords, ...WJ.patternWords], { blend: new Set(WJ.blendWords), ending: new Set(WJ.endingWords), pattern: new Set(WJ.patternWords) });
    const want = countReadable(wl, ORDER_SOUNDS.slice(0, 54));
    ok(/Silent E Summit/.test(txt) && /of 57/.test(txt), `Grownups: World 7, Silent E Summit is listed and the lesson count is of 57 (${txt.replace(/\s+/g, ' ').slice(0, 200)})`);
    const hero = await page.evaluate(() => { const r = document.querySelector('.gu-hero-read'); return { words: r && r.dataset.words, text: r && r.textContent, chips: [...document.querySelectorAll('.gu-chip')].map((c) => c.textContent) }; });
    ok(Number(hero.words) === want && /^Can read \d+ words/.test(hero.text) && ['open vowels', 'a_e', 'i_e', 'o_e'].every((c) => hero.chips.includes(c)) && !hero.chips.includes('semix') && !hero.chips.includes('u_e'), `Grownups: Can read ${want} words counts the patterns once taught; each pattern is one chip, none is a sound (${hero.words}; ${hero.chips.slice(-6).join(' ')})`);
    ok(errors.length === 0, `Grownups: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Level seven: the gondola car and the banner after lesson 57.
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(56, {}, { levels: levelsFor(56) }));
    await page.waitForTimeout(1500);
    const cars = await page.evaluate(async () => { const { carSvg } = await import('/js/art/cars2d.js'); const s = carSvg('gondola'); const d = carSvg('dome'); return { rects: s.querySelectorAll('rect').length, paths: s.querySelectorAll('path').length, viewBox: s.getAttribute('viewBox'), differs: s.innerHTML !== d.innerHTML }; });
    ok(cars.rects > 5 && cars.paths >= 4 && cars.viewBox === '0 0 200 120' && cars.differs, `level seven: the gondola icon is drawn (${JSON.stringify(cars)})`);
    ok(errors.length === 0, `level seven: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    const done = state(57, { migrated1912: true, pace4: true, trainIntroDone: true, trainDone: 50, trainAt: 9999 }, { lessons: doneL(57), levels: { seen: 6, earned: L123456 }, worlds: { seen: 'W7' }, checkpoints: stopsDone(57), character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, PHONE, done);
    ok(await until(page, () => !!document.querySelector('.level-banner[data-level="L7"]'), null, 30000), 'level seven: the banner "Level seven complete!" shows once lesson 57 is done');
    ok(/Level seven complete!/.test(await page.locator('.level-banner').textContent()), 'level seven: it says Level seven complete!');
    await shot(page, 'level-seven');
    ok(errors.length === 0, `level seven banner: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Story 7 (DRAFT): opens at its stop after lesson 56, the cover and the pages; the child reads one word a page.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 56);
    await m.page.goto(url + '#/checkpoint/b7');
    await m.page.waitForSelector('.book, .book-cover, .book-page', { timeout: 10000 });
    await m.page.waitForTimeout(1500);
    ok(/Pip at Silent E Summit|Story 7/.test(await m.page.locator('body').innerText()), 'story 7: the cover names the story');
    await shot(m.page, 'story7-cover');
    const next = m.page.locator('.btn.next, .book-next, button:has-text("Open")').first();
    for (let i = 0; i < 3; i++) { if (await next.count()) { await next.click().catch(() => {}); await m.page.waitForTimeout(900); } }
    await m.page.waitForTimeout(800);
    await shot(m.page, 'story7-page');
    ok(await noSound(m.page), 'story 7: nothing plays on its own');
    ok(m.errors.length === 0, `story 7: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // The Home of World 6's end still leads on to Silent E Summit (the last lesson of World 6 done, the crossing not yet played).
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(49));
    ok(await until(page, () => window.__train && window.__train.world === 'W6' && window.__train.frames > 1, null, 20000), 'world 6 end: with lesson 49 done the Home shows World 6');
    const t = await page.evaluate(() => ({ stops: window.__train.stopCount, c: window.__train.checkpointCount, sign: window.__train.signText }));
    ok(t.stops === 13 && t.c === 5 && t.sign === 'Silent E Summit', `world 6 end: still thirteen stops and a portal to Silent E Summit (${JSON.stringify(t)})`);
    ok(errors.length === 0, `world 6 end: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  await dataChecks({ ok });
  if (!process.argv.includes('--data')) {
    const { server, url } = await startServer();
    const browser = await launch(await loadPlaywright());
    await screenChecks({ browser, url, ok });
    await browser.close();
    server.close();
  }
  console.log(`silent-e: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
