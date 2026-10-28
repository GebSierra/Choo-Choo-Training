// World 6, Endings Junction (lessons 43 to 50: -s, -es, -ing, -ed in two ways, compound words, two-beat words, mixed review; docs/LESSON-REBUILD.md section 16).
// An ending is a WORD PART: not a new sound and not a new letter. The child finds the base word, then the ending (jump + -ing), or claps the beats, splits and glues (nap | kin).
// Data (no browser): the order and the count, the words of every lesson and their decodability (letters, digraphs, blends and the word part taught by then), an ending is one unit
// only once its lesson has taught it, the car glyphs, the grown-up's notation (never spoken by the phone), Couple a Car and Clap, Split, Glue data, the stops (Tricky Sounds after 43 and
// 47, a Review Stop after 46, Story 6 after 49, the end-of-world Review Stop after 50), no new heart words, level six, the reading count (endings are not sounds), Story 6's words, the
// frozen data of lessons 1 to 42 and the stops before, and saved progress under every older order staying exactly as it was.
// Browser: the Blend Bay to Endings Junction crossing, the Home of World 6, going back, New Ending, Saying Sounds with an ending car and with chunks, Couple a Car, Clap Split Glue,
// the Tricky Sounds stops, the Review Stops, Ticket Check, Grownups, Story 6, fit and 48 px targets at three sizes, nothing plays on its own, no idle frame loop.
// Run alone with `node test/endings-junction.mjs [--data] [--shots]`; shots go to docs/screenshots/endings-junction/.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN } from './lib.mjs';
import { SPEECH_STUB } from './stubs.mjs';
import { ORDER, ORDER_SOUNDS, PRIOR_ORDERS, ENDED, CHUNKS, PARTS, WORD_PART_KEYS, spellingsOf, letterUnits, lettersOfSounds, isReadable, isReadableBlends, isReadableEndings, endingSay, endingKeyOf, chunkSpans, soundOfLetter } from '../js/order.js';
import { GLYPHS } from '../js/glyphs.js';
import { slowSounds, scriptToParts } from '../js/scripts.js';
import { tasksFor, soundCardLines } from '../js/lessons.js';
import { countReadable, chipsOf } from '../js/reading-count.js';
import { reviewMessageText } from '../js/screens/finish.js';
import { carsOf } from '../js/levels.js';
import { lessonsIn, currentWorld, reachedWorlds, previousWorld } from '../js/worlds.js';
import { openHome, until, state } from './train.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const BOOK6 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/books/book-6.json'), 'utf8'));
const WJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/words-decodable.json'), 'utf8'));
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/endings-junction');
const PHONE = { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 };
const SMALL = { name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 };
const WIDE = { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 };
const SOUNDS = CUR.lessons.map((L) => L.sound);
const W6L = CUR.lessons.slice(42);
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };

// The reading words of each new lesson (Saying Sounds); docs/LESSON-REBUILD.md section 16.
const WORDS = { 43: 'cats maps dogs bugs', 44: 'boxes wishes buses dishes', 45: 'jumping fishing resting singing helping', 46: 'jumped picked filled spilled', 47: 'landed rested lifted melted', 48: 'sunset catfish bathtub bedbug hotdog', 49: 'napkin rabbit picnic kitten basket', 50: 'cats boxes jumping jumped landed sunset napkin' };
const KEYS = { 43: 'end-s', 44: 'end-es', 45: 'end-ing', 46: 'end-ed', 47: 'end-ted', 48: 'join', 49: 'beats', 50: 'endmix' };
const UNIT = { 43: '5.1', 44: '5.1', 45: '5.2', 46: '5.3', 47: '5.3', 48: '5.4', 49: '5.4', 50: '5.5' };
const doneL = (n, extra = {}) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it', completedAt: `2026-10-${String(i % 28 + 1).padStart(2, '0')}T10:00:00.000Z`, doneAt: 1760000000000 + i, ...extra }]));
const CHARACTER = { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true };
const stopsDone = (n) => Object.fromEntries(CUR.checkpoints.filter((k) => k.after <= n).map((k) => [k.id, { result: 'got-it' }]));
const L12 = { L1: '2026-10-06T10:00:00.000Z', L2: '2026-10-17T10:00:00.000Z' };
const L1234 = { ...L12, L3: '2026-10-25T10:00:00.000Z', L4: '2026-10-30T10:00:00.000Z' };
const L12345 = { ...L1234, L5: '2026-11-05T10:00:00.000Z' };
const levelsFor = (n) => ({ seen: n >= 50 ? 6 : n >= 42 ? 5 : n >= 33 ? 4 : n >= 25 ? 3 : n >= 17 ? 2 : n >= 6 ? 1 : 0, earned: n >= 50 ? { ...L12345, L6: '2026-11-20T10:00:00.000Z' } : n >= 42 ? L12345 : n >= 33 ? L1234 : n >= 25 ? { ...L12, L3: L1234.L3 } : n >= 17 ? L12 : n >= 6 ? { L1: L12.L1 } : {} });
const world = (n) => CUR.lessons.find((l) => l.number === Math.min(n + 1, 50)).world;
const seed = (n, settings = {}, extra = {}) => state(n, { migrated1912: true, pace4: true, trainIntroDone: true, ...settings }, { lessons: doneL(n), levels: levelsFor(n), worlds: { seen: world(n) }, checkpoints: stopsDone(n), character: CHARACTER, meetDue: false, ...extra });
const settled = (page, ms = 25000) => until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, ms);
const at = (n, type) => tasksFor(CUR.lessons[n - 1]).find((t) => t.type === type).index;
const seedPage = async (m, n, extra = {}) => { await m.page.addInitScript(SPEECH_STUB); await m.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneL(n), settings: { seenScripts: SEEN, trainIntroDone: true, migrated1912: true, pace4: true }, firstRunDone: true, character: CHARACTER, ...extra })}))`); };
const sha = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);

// ---- data and the store, no browser ----
export async function dataChecks({ ok }) {
  // 1. the order and the count
  ok(ORDER_SOUNDS.length === 50 && ORDER_SOUNDS.slice(0, 42).join(' ') === 'm a s i t p f o n d c h u g l r b e j w v y z x q sh ch th ck ff wh ng nk st nd sp sn bl pl br dr mix' && ORDER_SOUNDS.slice(42).join(' ') === 'end-s end-es end-ing end-ed end-ted join beats endmix', 'order: 50 sounds, the first 42 unchanged, the eight Endings Junction lessons appended');
  ok(ORDER === ORDER_SOUNDS.join(' ') && PRIOR_ORDERS.length === 4 && PRIOR_ORDERS[3] === ORDER_SOUNDS.slice(0, 42).join(' ') && PRIOR_ORDERS.every((p) => ORDER.startsWith(p + ' ')) && PRIOR_ORDERS.map((p) => p.split(' ').length).join() === '17,25,33,42', 'order: the 17, 25, 33 and 42-sound strings are prefixes of the current one (PRIOR_ORDERS), so every older save is read as it is');
  ok(SOUNDS.join(' ') === ORDER && CUR.lessons.length === 50 && Object.keys(CUR.sounds).join(' ') === ORDER, 'data: 50 lessons, one key each, in order');
  ok(W6L.every((L) => L.world === 'W6' && L.part) && lessonsIn(CUR, 'W6').length === 8 && CUR.worlds[5].name === 'Endings Junction' && CUR.lessons.slice(0, 42).every((L) => !L.part), 'data: lessons 43 to 50 are World 6, Endings Junction, and the only word-part lessons');
  ok(W6L.every((L) => L.unit === UNIT[L.number]) && CUR.units.filter((u) => u.stage === 5).map((u) => u.id).join() === '5.1,5.2,5.3,5.4,5.5', 'data: units 5.1 to 5.5 (-s and -es, -ing, -ed, compound and two-beat words, mixed review)');
  ok(W6L.every((L) => L.sound === KEYS[L.number] && CUR.sounds[L.sound].glyph === L.sound && CUR.sounds[L.sound].clip === null && CUR.sounds[L.sound].part === L.part && spellingsOf(L.sound).join() === L.sound), 'data: each lesson has one key that is also its glyph, a word part, and no recording (the grown-up says it)');
  ok(W6L.map((L) => L.part).join() === 'ending,ending,ending,ending,ending,chunk,chunk,mix', 'data: five ending lessons, two bigger-word lessons (compound, two beats), one mixed review');
  // 2. frozen: lessons 1 to 42 and everything before World 6 are byte for byte what they were (digests of the data as of 1.9.46; change them only on purpose)
  ok(sha(CUR.lessons.slice(0, 42)) === 'f740de405288080f', 'frozen: lessons 1 to 42 are byte for byte unchanged');
  ok(sha(Object.fromEntries(Object.entries(CUR.sounds).slice(0, 42))) === 'f4abe1ddbf35f482', 'frozen: the sounds of lessons 1 to 42 are unchanged');
  ok(sha(CUR.checkpoints.filter((k) => k.after <= 42 && !['x13', 'x14', 'b6', 'v14', 'v15'].includes(k.id))) === '595f6a5a47fcbb17', 'frozen: every stop up to the end of World 5 (stories, Tricky Sounds, Review Stops v1 to v13) is unchanged');
  ok(sha(CUR.heartWords) === '350e8aa1847da2de', 'frozen: the heart words are unchanged');
  // 3. the words of each lesson, and decodability proven from scratch
  for (const [n, words] of Object.entries(WORDS)) ok(CUR.lessons[n - 1].sayingSounds.filter((w) => w.showLetters).map((w) => w.word).join(' ') === words, `lesson ${n} (${SOUNDS[n - 1]}): reading words are ${words}`);
  for (const L of W6L) {
    const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, L.number));
    const read = [...L.sayingSounds.filter((w) => w.showLetters).map((w) => w.word), ...(L.couples || []).flatMap((c) => [c.from, c.to]), ...(L.splits || []).map((s) => s.word)];
    ok(read.length >= 5 && read.every((w) => isReadableEndings(w, taught)), `lesson ${L.number}: every child-read word uses only letters, digraphs, blends and word parts taught by it (${read.join(' ')})`);
    ok(L.sayingSounds.every((w) => w.showLetters) && CUR.sounds[L.sound].noPictures === true && !CUR.sounds[L.sound].words.length, `lesson ${L.number}: no picture (no tile shows a word with an ending; a wrong picture is never used)`);
    const m = CUR.sounds[L.sound].mouth;
    ok(m && (m.voice === null || typeof m.voice === 'boolean') && m.text.length <= 120 && (m.voice === null || new RegExp(`Voice ${m.voice ? 'on' : 'off'}\\.$`).test(m.text)), `lesson ${L.number}: Watch My Mouth text for ${L.sound}`);
    ok(!(L.heart || []).length, `lesson ${L.number}: no new heart word (the curriculum lists none for 5.x)`);
    const tasks = tasksFor(L);
    ok(tasks[1].name === (L.part === 'ending' ? 'New Ending' : 'Bigger Words') && tasks.at(-1).type === 'check' && tasks.at(-2).type === 'practice' && tasks[0].type === 'review' && tasks[2].type === 'mouth', `lesson ${L.number}: ${tasks[1].name} opens it (after Letter Review), Watch My Mouth follows, Practicing Words and Ticket Check close it`);
    ok(L.middle.includes('sounds') && (L.middle.includes('writing') || L.part !== 'ending') && L.middle.includes('couple') && !L.middle.includes('board') && !L.middle.includes('chains'), `lesson ${L.number}: the middle is ${L.middle.join()}`);
  }
  ok(W6L.slice(0, 5).every((L) => L.middle.includes('writing')) && W6L.slice(5).every((L) => !L.middle.includes('writing') && L.middle.includes('split')), 'frame: the ending lessons trace their car; the bigger-word lessons split and glue instead');
  ok(W6L.every((L, i) => !i || L.middle.join() !== W6L[i - 1].middle.join()), 'frame: no two neighbouring lessons have the same middle');
  // 4. word parts: the lists behind the units
  for (const [key, e] of Object.entries(ENDED)) {
    const all = Object.entries(e.says).flatMap(([say, bases]) => bases.map((b) => [say, b]));
    ok(all.every(([, b]) => isReadableBlends(b, lettersOfSounds(ORDER_SOUNDS.slice(0, 42))) && PARTS.has(b + e.suffix)), `${key}: every base word is a plain readable word and has its ending word (${all.length} words)`);
  }
  const lastOf = (b) => b.slice(-2) === 'ck' ? 'k' : b.slice(-2) === 'sh' || b.slice(-2) === 'ch' ? b.slice(-2) : b.slice(-2) === 'ff' ? 'f' : b.slice(-2) === 'll' ? 'l' : b.slice(-2) === 'ng' ? 'ng' : b.slice(-2) === 'zz' ? 'zz' : b.slice(-2) === 'ss' ? 'ss' : b.slice(-1);
  ok(ENDED['end-s'].says.sss.every((b) => ['t', 'p', 'k', 'f'].includes(lastOf(b)) || ['ck'].includes(b.slice(-2)) || b.slice(-1) === 'p') && ENDED['end-s'].says.zzz.every((b) => ['b', 'd', 'g', 'n', 'm', 'l'].includes(lastOf(b))), 'rule: -s says sss after a quiet sound (p t k f) and zzz after a buzzing one (b d g n m l)');
  ok(ENDED['end-es'].says['iz-'].every((b) => ['s', 'x', 'sh', 'ch', 'ss', 'zz'].includes(lastOf(b))), 'rule: -es follows s, x, sh, ch, ss or zz and adds a beat');
  ok(ENDED['end-ed'].says['t-'].every((b) => ['p', 'k', 'f', 'sh', 'ch', 'x', 's', 'ss', 'ck'].includes(lastOf(b)) || b.slice(-2) === 'ck') && ENDED['end-ed'].says['d-'].every((b) => ['l', 'zz', 'ng', 'n', 'm', 'b', 'g'].includes(lastOf(b))), 'rule: -ed says t- after a quiet sound and d- after a buzzing one');
  ok(ENDED['end-ted'].says['id-'].every((b) => ['t', 'd'].includes(b.slice(-1))), 'rule: -ed says id-, a whole extra beat, after t or d');
  ok(Object.values(CHUNKS).every((l) => l.every((x) => x.split('+').length === 2 && x.split('+').every((p) => isReadable(p, lettersOfSounds(ORDER_SOUNDS.slice(0, 42)))))), 'chunks: every piece of a compound or two-beat word is readable');
  ok(CHUNKS.join.every((x) => x.split('+').every((p) => PARTS.has(p) || /^[a-z]{2,}$/.test(p))), 'chunks: a compound word is two short words');
  const T42 = lettersOfSounds(ORDER_SOUNDS.slice(0, 42)), T45 = lettersOfSounds(ORDER_SOUNDS.slice(0, 45));
  const U = (w, n) => JSON.stringify(letterUnits(w, n));
  ok(U('jumping', 44) === '["j","u","m","p","i","ng"]' && U('jumping', 45) === '["j","u","m","p","end-ing"]' && U('cats', 42) === '["c","a","t","s"]' && U('cats', 43) === '["c","a","t","end-s"]' && U('fishing', 45) === '["f","i","sh","end-ing"]' && U('boxes', 44) === '["b","o","x","end-es"]', 'units: an ending is one unit only once its lesson has taught it (jumping at 44 is j u m p i ng, at 45 j u m p -ing)');
  ok(U('landed', 47) === '["l","a","n","d","end-ted"]' && U('jumped', 46) === '["j","u","m","p","end-ed"]' && U('sunset', 50) === '["s","u","n","s","e","t"]' && U('think', 50) === '["th","i","nk"]' && U('sing', 50) === '["s","i","ng"]' && letterUnits('jumping', 50, true).join('') === 'jumping', 'units: the ending is last; a compound or two-beat word keeps every letter; sing is not an ending word; the reading font keeps every letter');
  ok(!isReadableEndings('jumping', T42) && isReadableBlends('jumping', T42) && isReadableEndings('jumping', T45) && !isReadableEndings('landed', lettersOfSounds(ORDER_SOUNDS.slice(0, 46))) && isReadableEndings('landed', lettersOfSounds(ORDER_SOUNDS.slice(0, 47))) && isReadableEndings('stop', T42), 'decodable: a word with an ending is counted only from the lesson that teaches the ending (jumping at 45, landed at 47); plain words are not affected');
  ok(JSON.stringify(chunkSpans('sunset', 48)) === '[{"at":0,"len":3},{"at":3,"len":3}]' && chunkSpans('sunset', 47) === null && chunkSpans('napkin', 48) === null && JSON.stringify(chunkSpans('napkin', 49)) === '[{"at":0,"len":3},{"at":3,"len":3}]' && endingKeyOf('sunset') === null && endingKeyOf('dogs') === 'end-s', 'chunks: a compound word splits from lesson 48, a two-beat word from lesson 49');
  ok(soundOfLetter('end-ing') === 'end-ing' && ORDER_SOUNDS.slice(42).every((k) => k === soundOfLetter(k)) && soundOfLetter('k') === 'c' && soundOfLetter('st') === 'st', 'units: the new keys are their own keys; the old keys are untouched');
  // 5. the car glyphs: the ending's letters inside a frame with a coupler stub, the ending of its letters is as large as everywhere else
  for (const [k, letters] of [['end-s', 's'], ['end-es', 'es'], ['end-ing', 'ing'], ['end-ed', 'ed'], ['end-ted', 'ed']]) {
    const g = GLYPHS[k];
    ok(g && g.end === true && g.strokes.length === [...letters].reduce((n, c) => n + GLYPHS[c].strokes.length, 0) && /M/.test(g.link) && g.minX >= -2 && g.maxX <= 162 && (letters.length === 3 ? g.wide === true : true), `glyphs: ${k} is the letters ${letters} (${g && g.strokes.length} strokes) in a car with a coupler (link frame), ${g && g.wide ? 'wide' : 'normal width'}`);
  }
  ok(GLYPHS['end-ted'].link !== GLYPHS['end-ed'].link && GLYPHS['end-ted'].link.includes('L') && GLYPHS['end-ted'].minY < GLYPHS['end-ed'].minY, 'glyphs: the extra-beat -ed has two dots above its car, the plain -ed has none');
  ok(GLYPHS.join.strokes.length === 2 && GLYPHS.beats.strokes.length === 2 && GLYPHS.endmix === GLYPHS['end-ing'] && GLYPHS.join.minX >= 0 && GLYPHS.join.maxX <= 100, 'glyphs: join is two little cars and a plus, beats is two hops; the mixed review wears the -ing car');
  ok(GLYPHS.sh.link && !GLYPHS.st.link && GLYPHS['end-s'].link, 'glyphs: a digraph has its bar, a blend has none, an ending has its car frame (three different ideas)');
  // 6. the grown-up's notation (never a letter name, never the phone's voice)
  const S = (w) => slowSounds(w, CUR.sounds);
  ok(S('cats') === 'k-aaat-sss' && S('dogs') === 'd-ooog-zzz' && S('boxes') === 'b-oooks-iz-' && S('jumping') === 'j-uuummmp-ing-' && S('jumped') === 'j-uuummmp-t-' && S('filled') === 'fffiiil-d-' && S('landed') === 'l-aaannnd-id-', 'notation: cats k-aaat-sss, dogs d-ooog-zzz, boxes b-oooks-iz-, jumping j-uuummmp-ing-, jumped t-, filled d-, landed id-');
  ok(endingSay('cats') === 'sss' && endingSay('dogs') === 'zzz' && endingSay('boxes') === 'iz-' && endingSay('jumped') === 't-' && endingSay('filled') === 'd-' && endingSay('landed') === 'id-' && endingSay('sunset') === null, 'notation: what the ending says is looked up per word (sss or zzz, iz-, t- or d-, id-)');
  const spoken = (t) => scriptToParts(t, Object.keys(CUR.sounds)).filter((p) => p.tts).map((p) => p.tts).join(' ');
  ok(!/ing|iz|id/.test(spoken('Say: j-uuummmp-ing- and b-oooks-iz- and l-aaannnd-id-')) && scriptToParts('Say: j-uuummmp-ing-', Object.keys(CUR.sounds)).every((p) => !p.clip || p.clip.length), 'notation: ing- iz- id- are shown, never spoken by the phone (they are not turned into text to speech)');
  ok(W6L.every((L) => L.quickCheck.gist.length <= 28 && L.quickCheck.kind === 'letter' && L.quickCheck.options.length === 3 && L.quickCheck.options.filter((o) => o.correct).length === 1 && L.quickCheck.options[0].glyph === L.quickCheck.options.find((o) => o.correct).glyph && L.quickCheck.promptTextQuiet === 'Listen to your grown-up. Then touch the car.'), 'Ticket Check: a question about a car, three cards, one right, the grown-up gist at most 28 characters');
  ok(W6L.every((L) => L.introQuiet.length === 1 && /grown-up/.test(L.introQuiet[0].tts) && !/sound/.test(L.introQuiet[0].tts.replace('Today we', ''))) && CUR.sounds['end-s'].parentNote.startsWith('An ending is a word part, not a new sound.') && soundCardLines(CUR.sounds['end-ing'])[0].startsWith('A word ending, not a new sound.'), 'wording: an ending is called a word part, never a sound');
  // 7. Couple a Car and Clap, Split, Glue
  const wordsList = new Set([...WJ.words, ...WJ.blendWords, ...WJ.endingWords]);
  for (const L of W6L.filter((x) => x.couples)) {
    const keys = ORDER_SOUNDS.slice(0, L.number), taught = lettersOfSounds(keys);
    ok(L.couples.length >= 4 && L.couples.every((c) => {
      const p = PARTS.get(c.to);
      return c.options.length === 3 && new Set(c.options).size === 3 && c.options[0] === c.part && p && keys.includes(p.key) && c.from === p.parts[0] && isReadableEndings(c.to, taught) && c.options.slice(1).every((o) => o !== c.part) && (c.kind === 'ending' ? c.part === p.key && !['end-ed', 'end-ted'].includes(c.options[1]) || (c.part !== 'end-ed' && c.part !== 'end-ted') : c.part === c.to.slice(c.from.length) && c.options.slice(1).every((o) => !wordsList.has(c.from + o) && !PARTS.has(c.from + o)));
    }), `lesson ${L.number}: ${L.couples.length} Couple a Car items, three distinct cars, the right one first, wrong cars never make a word (${L.couples.map((c) => c.from + '>' + c.to).join(' ')})`);
  }
  ok(W6L.slice(0, 5).every((L) => L.couples.every((c) => c.kind === 'ending' && c.options.every((o) => o.startsWith('end-') || /^[a-z]$/.test(o)))) && W6L.slice(0, 5).every((L) => L.couples.every((c) => !(c.part === 'end-ed' && c.options.includes('end-ted')) && !(c.part === 'end-ted' && c.options.includes('end-ed')))) && W6L.slice(5).every((L) => L.couples.some((c) => c.kind === 'word')), 'couple: ending lessons couple ending cars (never the two -ed cars against each other); bigger-word lessons couple word cars');
  ok(['cat>cats', 'jump>jumping', 'land>landed', 'sun>sunset', 'nap>napkin'].every((x) => W6L.some((L) => (L.couples || []).some((c) => `${c.from}>${c.to}` === x))), 'couple: cat cats, jump jumping, land landed, sun sunset and nap napkin are in');
  for (const L of W6L.filter((x) => x.splits)) ok(L.splits.length >= 3 && L.splits.every((s) => PARTS.get(s.word) && s.parts.join('') === s.word && s.parts.length === 2 && letterUnits(s.word, L.number).length <= 6 && PARTS.get(s.word).key in CHUNKS && ORDER_SOUNDS.slice(0, L.number).includes(PARTS.get(s.word).key)), `lesson ${L.number}: ${L.splits.length} Clap, Split, Glue words, each two chunks, at most six letters (${L.splits.map((s) => s.parts.join('|')).join(' ')})`);
  ok(W6L[5].splits.every((s) => PARTS.get(s.word).key === 'join') && W6L[6].splits.every((s) => PARTS.get(s.word).key === 'beats') && W6L[6].splits.every((s) => /[^aeiou][^aeiou]$/.test(s.parts[0]) === false || true), 'split: compound words in lesson 48, two-beat words in lesson 49');
  // 8. stops
  const ck = Object.fromEntries(CUR.checkpoints.map((k) => [k.id, k]));
  ok(CUR.checkpoints.map((k) => `${k.id}:${k.after}`).join() === 'r1:4,b1:4,b2:6,b3:22,b4:31,b5:40,b6:49,x1:9,x2:12,x3:14,x4:17,x5:18,x6:21,x7:22,x8:23,x9:27,x10:28,x11:35,x12:41,x13:43,x14:47,v1:3,v6:6,v2:9,v3:12,v4:15,v5:17,v7:20,v8:23,v9:25,v10:30,v11:33,v12:38,v13:42,v14:46,v15:50', 'stops: ids and places (older ids never renumbered)');
  const nodes = CUR.lessons.flatMap((l) => [{ lesson: l }, ...CUR.checkpoints.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
  const last = nodes.filter((n) => (n.lesson ? n.lesson.world : n.checkpoint.world) === 'W6').at(-1);
  ok(last.checkpoint && last.checkpoint.id === 'v15' && last.checkpoint.kind === 'review', 'stops: World 6 ends with a Review Stop (v15)');
  ok(nodes.filter((n) => (n.lesson ? n.lesson.world : n.checkpoint.world) === 'W6').map((n) => (n.lesson ? n.lesson.number : n.checkpoint.id)).join() === '43,x13,44,45,46,v14,47,x14,48,49,b6,50,v15', 'stops: World 6 in order, 43, Tricky Sounds, 44, 45, 46, mid-world Review Stop, 47, Tricky Sounds, 48, 49, Story 6, 50, end-of-world Review Stop');
  ok(ck.x13.kind === 'contrast' && ck.x13.mode === 'says' && ck.x13.after === 43 && ck.x13.world === 'W6' && ck.x13.pair.length === 0 && ck.x13.sides.map((s) => s.signText).join() === 'sss,zzz' && ck.x13.sides[0].words.every((w) => endingSay(w) === 'sss') && ck.x13.sides[1].words.every((w) => endingSay(w) === 'zzz') && ck.x13.pairs.map((p) => `${p.a}/${p.b}`).join() === 'cat/cats,dog/dogs,map/maps,bug/bugs', 'Tricky Sounds x13 (after 43): the ending -s says sss or zzz, tunnels sss and zzz, then the base word against the word with its ending');
  ok(ck.x14.kind === 'contrast' && ck.x14.mode === 'says' && ck.x14.after === 47 && ck.x14.sides.map((s) => s.signText).join() === 'one beat,extra beat' && ck.x14.sides[0].words.every((w) => ['t-', 'd-'].includes(endingSay(w))) && ck.x14.sides[1].words.every((w) => endingSay(w) === 'id-') && ck.x14.pairs.map((p) => `${p.a}/${p.b}`).join() === 'jump/jumped,land/landed,rest/rested,fill/filled', 'Tricky Sounds x14 (after 47): -ed with one beat (t or d) against -ed with an extra beat (id)');
  for (const id of ['x13', 'x14']) ok(ck[id].plan.map((a) => a.task).join() === 'tunnels,which,check' && ck[id].sides.every((s) => !s.letters.length && s.words.length === 6 && s.words.every((w) => isReadableEndings(w, lettersOfSounds(ORDER_SOUNDS.slice(0, ck[id].after))))) && ck[id].quickCheck.gist.length <= 28 && ck[id].tunnelLine && ck[id].pairs.every((p) => !p.images), `Tricky Sounds ${id}: Two Tunnels, Which One?, Ticket Check; every word decodable by lesson ${ck[id].after}; no picture where a word has none`);
  ok(ck.v14.kind === 'review' && ck.v14.after === 46 && ck.v14.plan.every((a) => a.lesson <= 46) && ck.v14.plan.at(-1).task === 'check' && ck.v14.plan.some((a) => a.task === 'couple') && ck.v14.world === 'W6' && !ck.v14.mix, 'Review Stop v14 (after 46, the middle of the world): nothing past lesson 46 shows, Couple a Car in it, Ticket Check last');
  ok(ck.v15.mix === 'endings' && ck.v15.after === 50 && ck.v15.plan.some((a) => a.task === 'split') && ck.v15.plan.some((a) => a.task === 'couple') && ck.v15.plan.at(-1).task === 'check' && ck.v15.world === 'W6' && ck.v15.plan.length === 5, 'Review Stop v15 (after 50, the end of the world): mixes the endings and the bigger words, Ticket Check last');
  ok(ck.v13.summary.words === 515 && ck.v13.summary.sounds === 33 && ck.v13.summary.blends === 22 && !('endings' in ck.v13.summary), 'Review Stops: v13 keeps its counts (33 sounds, 22 blends, 515 words), no endings yet');
  ok(ck.v14.summary.sounds === 33 && ck.v14.summary.blends === 22 && ck.v14.summary.endings === 4 && ck.v15.summary.endings === 4 && ck.v15.summary.sounds === 33 && ck.v14.summary.words > ck.v13.summary.words && ck.v15.summary.words > ck.v14.summary.words, `Review Stops: an ending is not a sound (still 33 sounds and 22 blends; 4 word endings: -s -es -ing -ed), the word count grows (${ck.v13.summary.words}, ${ck.v14.summary.words}, ${ck.v15.summary.words})`);
  ok(ck.v14.summary.examples.every((w) => PARTS.has(w)) && ck.v15.summary.examples.every((w) => PARTS.has(w)) && ck.v15.summary.examples.every((w) => isReadableEndings(w, lettersOfSounds(ORDER_SOUNDS))), `Review Stops: the examples lead with the newest word parts (${ck.v14.summary.examples.join(' ')} / ${ck.v15.summary.examples.join(' ')})`);
  ok(reviewMessageText(ck.v13.summary).startsWith('Your child has learned 33 sounds and 22 blends. Words made only from these sounds include: ') && reviewMessageText(ck.v15.summary).startsWith('Your child has learned 33 sounds, 22 blends and 4 word endings. Words made only from these sounds and word parts include: ') && /^Your child has learned 25 sounds\. Words made only from these sounds include: /.test(reviewMessageText(ck.v9.summary)), 'Review Stop message: older stops read as before; the new ones say 33 sounds, 22 blends and 4 word endings (an ending is not a sound)');
  ok(ck.b6.kind === 'book' && ck.b6.book === 'book-6' && ck.b6.world === 'W6' && ck.b6.after === 49 && JSON.stringify(ck.b6.needs) === JSON.stringify(ORDER_SOUNDS.slice(0, 49)), 'stops: Story 6 is in World 6, after lesson 49 (two-beat words)');
  // 9. levels, counts
  ok(CUR.levels.map((v) => v.after).join() === '6,17,25,33,42,50' && CUR.levels[5].car === 'boxcar' && CUR.levels[5].needs.length === 50 && CUR.levels[4].car === 'dome', 'levels: level six (a box car) comes after lesson 50; levels one to five are unchanged');
  ok(carsOf(CUR.levels).join() === 'coach,flatbed,tanker,dome,boxcar,caboose', 'levels: the special cars in train order, the box car before the caboose');
  const words = [...WJ.words, ...WJ.blendWords, ...WJ.endingWords]; words.blend = new Set(WJ.blendWords); words.ending = new Set(WJ.endingWords);
  const cnt = (n) => countReadable(words, ORDER_SOUNDS.slice(0, n));
  ok(cnt(42) === 515 && cnt(43) > cnt(42) && cnt(44) > cnt(43) && cnt(45) > cnt(44) && cnt(47) > cnt(46) && cnt(48) > cnt(47) && cnt(49) > cnt(48) && cnt(46) === ck.v14.summary.words && cnt(50) === ck.v15.summary.words && cnt(50) === cnt(49), `reading count: Can read N words grows with each word part (${cnt(42)}, ${cnt(43)}, ${cnt(44)}, ${cnt(45)}, ${cnt(46)}, ${cnt(47)}, ${cnt(48)}, ${cnt(49)}, ${cnt(50)}); the mixed review adds none`);
  ok(WJ.endingWords.length >= 150 && WJ.endingWords.every((w) => !WJ.words.includes(w) && !WJ.blendWords.includes(w) && PARTS.has(w) && isReadableEndings(w, lettersOfSounds(ORDER_SOUNDS))) && new Set(WJ.endingWords).size === WJ.endingWords.length, `words: ${WJ.endingWords.length} World 6 words, each readable, each with a word part, none counted twice`);
  ok(chipsOf(['m', 'st', 'mix', 'end-s', 'end-es', 'end-ing', 'end-ed', 'end-ted', 'join', 'beats', 'endmix']).join('|') === 'm|st ft|-s|-es|-ing|-ed|-ed beat|compound words|two beats', 'chips: a word part is one chip each (the mixed review has none)');
  // 10. Story 6 (DRAFT, owner approves the text)
  const taught49 = lettersOfSounds(ORDER_SOUNDS.slice(0, 49)), hearts49 = CUR.lessons.slice(0, 49).flatMap((L) => L.heart || []).map((w) => w.toLowerCase());
  const childWords = BOOK6.pages.flatMap((p) => [p.child, p.slider, ...(p.words || [])].filter(Boolean)).flatMap((t) => t.split(/\s+/)).map((w) => w.replace(/[^a-z]/gi, '').toLowerCase()).filter(Boolean);
  ok(childWords.length >= 10 && childWords.every((w) => hearts49.includes(w) || isReadableEndings(w, taught49)), `story 6: every word the child reads uses only what lesson 49 taught (${[...new Set(childWords)].join(' ')})`);
  ok(BOOK6.pages.length === 10 && BOOK6.pages.at(-1).kind === 'review' && BOOK6.pages.filter((p) => p.child).every((p) => p.child.split(' ').length === 1) && BOOK6.draft === true && BOOK6.id === 'book-6', `story 6: ${BOOK6.pages.length} pages, one word to read on a page, the last a review, marked DRAFT`);
  ok(['cats', 'boxes', 'jumping', 'landed', 'picnic', 'hotdog', 'sunset'].every((w) => BOOK6.pages.some((p) => p.child === w)) && BOOK6.pages.every((p) => !p.child || PARTS.has(p.child)) && BOOK6.pages.some((p) => /Pip/.test(p.read || '')) && BOOK6.pages.some((p) => /Sam/.test(p.read || '')) && BOOK6.pages.some((p) => /\{name\}/.test(p.read || '')), 'story 6: seven word-part words (cats boxes jumping landed picnic hotdog sunset), Pip, {name} and Sam');
  ok(BOOK6.pages.every((p) => !/\b(he|she|him|his|her|hers)\b/i.test(p.read || '')) && BOOK6.pages.every((p) => !/\{name\}/.test(p.read || '') || !/\b(he|she|him|his|her)\b/i.test(p.read || '')), 'story 6: the child is called by name, never he or she (the text has no he or she at all)');
  ok(JSON.stringify(BOOK6.needs) === JSON.stringify(ORDER_SOUNDS.slice(0, 49)), 'story 6: needs the sounds up to lesson 49');

  // 11. saved progress: every older order stays exactly as it was
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const { createStore } = await import('../js/store.js');
  const open = (save) => { mem.clear(); mem.set('reading.v1', JSON.stringify(save)); return createStore(); };
  const settings = { migrated1912: true, pace4: true, speak0: true, layoutA: true, heartA: true, seenScripts: { ...SEEN, 'lesson:9': true }, trainAt: 7, trainDone: 12, perDay: 4 };
  const old = (order, n, extra = {}) => ({ schema: 1, order, lessons: doneL(n), checkpoints: stopsDone(Math.min(n, 42)), settings, levels: { seen: 5, earned: L12345 }, worlds: { seen: 'W5' }, character: CHARACTER, firstRunDone: true, lastOpened: '2026-10-12T08:00:00.000Z', savedAt: 1760000000000, ...extra });
  let save = old(PRIOR_ORDERS[3], 42), s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && Object.keys(s.state.lessons).length === 42, 'saves: a finished Blend Bay save keeps lessons 1 to 42 exactly (results, dates, tasks)');
  ok(JSON.stringify(s.state.checkpoints) === JSON.stringify(save.checkpoints) && JSON.stringify(s.state.levels.earned) === JSON.stringify(L12345) && s.state.worlds.seen === 'W5' && s.state.character.name === 'Lily', 'saves: its stops, levels, world record and character stay');
  ok(s.settings.trainAt === 7 && s.settings.trainDone === 12 && s.settings.seenScripts['lesson:9'] === true && s.settings.perDay === 4, 'saves: its settings, train position and seen scripts stay (nothing is dropped)');
  ok(s.currentLesson(50) === 43 && s.isDone(42) && !s.isDone(43) && s.isUnlocked(43) && !s.isUnlocked(44), 'saves: lesson 43 (-s) is the current lesson, 44 is still locked behind it');
  s.setResult(43, 'got-it');
  ok(JSON.parse(mem.get('reading.v1')).order === ORDER && JSON.parse(mem.get('reading.v1')).lessons[42].result === 'got-it' && JSON.parse(mem.get('reading.v1')).lessons[3].completedAt === save.lessons[3].completedAt, 'saves: the next save writes the new order and keeps every older result');
  for (const [prior, n] of [[PRIOR_ORDERS[2], 33], [PRIOR_ORDERS[1], 25], [PRIOR_ORDERS[0], 17]]) {
    save = old(prior, n, { levels: { seen: 3, earned: { ...L12, L3: L1234.L3 } }, worlds: { seen: 'W3' } });
    s = open(save);
    ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.currentLesson(50) === n + 1 && s.isDone(n), `saves: a save under the ${n}-sound order is still read as it is (lesson ${n + 1} is next)`);
  }
  save = old(PRIOR_ORDERS[3], 42, { lessons: { ...doneL(42), 43: { tasksDone: [0, 1, 2], result: 'practice-again' } }, worlds: { seen: 'W6' } });
  s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.state.lessons[43].tasksDone.join() === '0,1,2' && s.currentLesson(50) === 43, 'saves: a save mid-way (lesson 43 half done) keeps its task progress and result, no reset');
  save = { ...old(PRIOR_ORDERS[3], 42), order: ORDER, lessons: doneL(45) };
  s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.currentLesson(50) === 46, 'saves: a save under the new order is read as it is');
  s = open(old(PRIOR_ORDERS[3], 42));
  ok(!s.isCheckpointDone(ck.x13) && !s.isCheckpointDone(ck.v15) && currentWorld(s, CUR).id === 'W6' && !s.isDone(50), 'worlds: Blend Bay done, Endings Junction is now the current world; its stops are not yet done');
  s = open(old(PRIOR_ORDERS[3], 42, { lessons: doneL(46), checkpoints: stopsDone(46) }));
  ok(s.isCheckpointDone(ck.x13) && s.isCheckpointDone(ck.v14) && !s.isCheckpointDone(ck.x14) && !s.isCheckpointDone(ck.b6) && !s.isCheckpointDone(ck.v15), 'stops: a child past a stop counts it as passed; the ones ahead are still ahead');
  ok(reachedWorlds(s, CUR).map((w) => w.id).join() === 'W1,W2,W3,W4,W5,W6' && previousWorld(CUR, 'W6').id === 'W5' && previousWorld(CUR, 'W5').id === 'W4', 'worlds: W6 can go back to W5, W5 to W4 and so on');
}

// ---- the screens, in the browser ----
const firstWord = (n) => CUR.lessons[n - 1].sayingSounds[0].word;
const noSound = (page) => page.evaluate(() => (window.__events || []).filter((e) => e.type === 'clip' || e.type === 'tts').length === 0);
export async function screenChecks({ browser, url, ok }) {
  // The crossing from Blend Bay into Endings Junction.
  {
    const crossing = state(42, { migrated1912: true, pace4: true, trainIntroDone: true, trainDone: 42 + 5, trainAt: 9999 }, { lessons: doneL(42), levels: levelsFor(42), worlds: { seen: 'W5' }, checkpoints: stopsDone(42), character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, PHONE, crossing);
    ok(await until(page, () => !!document.querySelector('.world-card.in') || (window.__train && window.__train.world === 'W5' && window.__train.gate && window.__train.gate.phase), null, 20000), 'crossing: Blend Bay is done, so the crossing plays');
    ok(await until(page, () => !!document.querySelector('.world-card.in'), null, 25000), 'crossing: the loading card shows between the two worlds');
    ok((await page.locator('.wg-name').textContent()) === 'Endings Junction', 'crossing: it names Endings Junction');
    await page.waitForTimeout(600);
    await page.locator('.world-card .wg-go').click();
    ok(await until(page, () => window.__train && window.__train.world === 'W6' && window.__train.frames > 0, null, 20000), 'crossing: Endings Junction is built after it');
    const w6 = await page.evaluate(() => ({ stops: window.__train.stopCount, l: window.__train.lessonCount, c: window.__train.checkpointCount, start: window.__train.startTunnel, portal: window.__train.portal, sign: window.__train.signText, theme: window.__train.theme, placeholder: window.__train.placeholder }));
    ok(w6.stops === 13 && w6.l === 8 && w6.c === 5 && w6.start && w6.portal && w6.sign === 'Silent E Summit', `crossing: World 6 has its eight lessons and five stops (two Tricky Sounds, Story 6, two Review Stops), a start tunnel and a portal to Silent E Summit (${JSON.stringify(w6)})`);
    ok(await settled(page, 40000), 'crossing: the train rolls out and settles');
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).worlds.seen)) === 'W6', 'crossing: it is recorded, so it plays once');
    const btns = await page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => b.getAttribute('aria-label') + '|' + b.className.replace(/.*is-/, '')));
    ok(/^Lesson 43/.test(btns[0]) && /current/.test(btns[0]) && btns.filter((b) => b.startsWith('Story 6')).length === 1 && btns.filter((b) => b.startsWith('Review Stop')).length === 2 && btns.filter((b) => b.startsWith('Tricky Sounds')).length === 2 && btns.filter((b) => b.startsWith('Lesson')).length === 8, `home: Lesson 43 is the current stop; Story 6, two Review Stops, two Tricky Sounds and eight lessons (${btns.join(' ; ')})`);
    ok(/Review Stop/.test(btns.at(-1)), 'home: World 6 ends with a Review Stop');
    await page.waitForTimeout(3300);
    await shot(page, 'w6-home');
    ok(errors.length === 0, `crossing: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // The Home of World 6 on a normal visit, and going back W6 to W5 to W4.
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(44));
    ok(await until(page, () => window.__train && window.__train.world === 'W6' && window.__train.frames > 1, null, 20000), 'visit: the Home opens on World 6');
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
    await goBack('W5', 'Blend Bay');
    await goBack('W4', 'Digraph Docks');
    ok(await show('forward') && (await page.locator('.portal-btn[data-role="forward"]').getAttribute('aria-label')) === 'On to Blend Bay', 'visit: its end tunnel leads on to Blend Bay again');
    ok((await page.evaluate(() => localStorage.getItem('reading.v1'))) === before, 'visit: going back and forth changed nothing in the saved progress');
    ok(errors.length === 0, `visit: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // New Ending (43, 45, 47) and Bigger Words (48, 49): the car, the card that says an ending is a word part, the rows and the grown-up gist.
  for (const [n, rows, title] of [[43, ['cat + -s', 'dog + -s'], 'New Ending'], [45, ['jump + -ing'], 'New Ending'], [47, ['land + -ed'], 'New Ending'], [48, ['sun + set'], 'Bigger Words'], [49, ['nap + kin'], 'Bigger Words']]) {
    const m = await newPage(browser, PHONE);
    await seedPage(m, n - 1);
    await m.page.goto(url + `#/lesson/${n}/task/1`);
    await m.page.waitForSelector('.new-letter');
    await m.page.waitForTimeout(2800);
    const d = await m.page.evaluate(() => ({ cards: [...document.querySelectorAll('.letter-card svg.glyph')].map((g) => ({ key: g.dataset.letter, strokes: g.querySelectorAll('path.stroke').length, links: g.querySelectorAll('path.glyph-link').length, w: g.getBoundingClientRect().width, h: g.getBoundingClientRect().height })), rows: [...document.querySelectorAll('.blend-rows li')].map((li) => li.textContent), card: document.querySelector('.part-card') && document.querySelector('.part-card').textContent, overflow: document.documentElement.scrollWidth > innerWidth, tiles: document.querySelectorAll('.word-tile').length, body: document.body.innerText }));
    ok(d.cards.length === 1 && d.cards[0].key === KEYS[n] && d.cards[0].strokes === GLYPHS[KEYS[n]].strokes.length && (n < 48 ? d.cards[0].links === 1 : true) && d.cards[0].w > 40 && !d.overflow, `${title} ${n}: the ${KEYS[n]} glyph is drawn (${JSON.stringify(d.cards)})`);
    ok(/not a new sound|Bigger words are built/.test(d.card) && rows.every((r, i) => d.rows[i] && d.rows[i].includes(r)) && d.tiles === 0, `${title} ${n}: the card says an ending is a word part, not a new sound, and lists ${rows.join(' | ')} (${d.rows.join(' | ')})`);
    ok(new RegExp(title).test(d.body) && !/Hold it/.test(d.body), `${title} ${n}: the step is called ${title}`);
    ok(await noSound(m.page), `${title} ${n}: nothing plays on its own`);
    await shot(m.page, `new-ending-${n}`);
    ok(m.errors.length === 0, `${title} ${n}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Saying Sounds: the ending is one car coupled to the base word; every gist fits the collapsed bar (28 characters) and names the base word and the ending.
  for (const n of [43, 44, 45, 46, 47, 48, 49, 50]) {
    const m = await newPage(browser, n === 45 ? SMALL : PHONE);
    await seedPage(m, n - 1);
    await m.page.goto(url + `#/lesson/${n}/task/${at(n, 'sounds')}`);
    await m.page.waitForSelector('.glyph-letter');
    await m.page.waitForTimeout(900);
    const words = WORDS[n].split(' ');
    for (const [i, w] of words.entries()) {
      const f = await m.page.evaluate(() => { const s = document.querySelector('.word-glyphs'), r = s.getBoundingClientRect(); return { word: s.getAttribute('aria-label'), letters: [...s.querySelectorAll('.glyph-letter')].map((e) => e.dataset.letter), cars: s.querySelectorAll('.glyph-letter[data-letter^="end-"]').length, links: s.querySelectorAll('path.glyph-link').length, marks: s.querySelectorAll('path.chunk-mark').length, inChunk: s.querySelectorAll('.glyph-letter.in-chunk').length, x: r.x, r: r.right, gist: (document.querySelector('.script-first') || {}).textContent || '', overflow: document.documentElement.scrollWidth > innerWidth }; });
      const part = PARTS.get(w);
      const want = letterUnits(w, n);
      ok(f.word === w && f.letters.join() === want.join() && f.x >= 0 && f.r <= (n === 45 ? 360 : 390) && !f.overflow && f.gist.length > 0 && f.gist.length <= 28, `Saying Sounds ${n}: ${w} is drawn as ${want.join(' ')} and fits (gist "${f.gist}")`);
      if (part && part.key in ENDED) ok(f.cars === 1 && f.letters.at(-1) === part.key && f.links >= 1 && f.gist.includes(part.parts[0]) && f.gist.includes(endingSay(w)), `Saying Sounds ${n}: ${w} is the base word ${part.parts[0]} and one ending car (${part.key})`);
      else if (part) ok(f.cars === 0 && f.marks === 2 && f.inChunk === want.length && f.gist.includes(part.parts[0]) && f.gist.includes(part.parts[1]), `Saying Sounds ${n}: ${w} is drawn as two chunks, ${part.parts.join(' + ')}, a bracket under each`);
      if (i < words.length - 1) { await m.page.getByText('Next word').click(); await m.page.waitForTimeout(450); }
    }
    ok(await noSound(m.page), `Saying Sounds ${n}: nothing plays on its own`);
    if (n === 45 || n === 48) await shot(m.page, `saying-sounds-${n}${n === 45 ? '-360' : ''}`);
    ok(m.errors.length === 0, `Saying Sounds ${n}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Couple a Car (lesson 45, ending cars): the grown-up's words, a gap, three cars, a wrong car does nothing, the right one couples on, four rounds, nothing plays on its own.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 44);
    await m.page.addInitScript(() => { window.__raf = 0; const r = window.requestAnimationFrame; window.requestAnimationFrame = (f) => { window.__raf++; return r.call(window, f); }; });
    await m.page.goto(url + `#/lesson/45/task/${at(45, 'couple')}`);
    await m.page.waitForSelector('.couple-game .chain-car.gap', { timeout: 10000 });
    await m.page.waitForTimeout(900);
    const first = CUR.lessons[44].couples[0];
    const d = await m.page.evaluate(() => ({ cars: [...document.querySelectorAll('.couple-track .chain-car:not(.end)')].map((c) => c.dataset.letter).join(''), choices: [...document.querySelectorAll('.couple-choices .chain-car')].map((c) => c.dataset.part), prompt: document.querySelector('.say-prompt').textContent, overflow: document.documentElement.scrollWidth > innerWidth, gist: (document.querySelector('.script-first') || {}).textContent, title: document.body.innerText.includes('Couple a Car') }));
    ok(d.cars === first.from && d.choices.length === 3 && d.choices.includes(first.part) && new RegExp(`${first.from}.*${first.to}`).test(d.prompt) && !d.overflow && d.title && d.gist.length <= 28, `Couple a Car: ${first.from} is a row of letter cars with a gap, three cars, the prompt names ${first.to} (${d.cars}; ${d.choices}; ${d.prompt}; "${d.gist}")`);
    ok(await noSound(m.page), 'Couple a Car: nothing plays on its own');
    const wrong = d.choices.find((c) => c !== first.part);
    await m.page.locator(`.couple-choices .chain-car[data-part="${wrong}"]`).click();
    await m.page.waitForTimeout(300);
    ok((await m.page.locator('.couple-track .chain-car.gap').count()) === 1 && (await m.page.locator('.couple-game').getAttribute('data-round')) === '0', 'Couple a Car: a wrong car does nothing (the gap stays)');
    const sizes = await m.page.evaluate(() => [...document.querySelectorAll('.couple-choices .chain-car')].map((c) => { const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    ok(sizes.every(([w, h]) => w >= 48 && h >= 48), `Couple a Car: the cars are at least 48 px to tap (${JSON.stringify(sizes)})`);
    await shot(m.page, 'couple-a-car');
    for (let r = 0; r < 4; r++) {
      const c = CUR.lessons[44].couples[r];
      await m.page.waitForFunction((to) => document.querySelector('.couple-game').dataset.word === to && document.querySelector('.couple-track .chain-car.gap'), c.to, { timeout: 5000 });
      await m.page.locator(`.couple-choices .chain-car[data-part="${c.part}"]`).click();
      await m.page.waitForTimeout(300);
      if (r === 0) {
        const solved = await m.page.evaluate(() => ({ car: !!document.querySelector('.couple-track .chain-car.end[data-part]'), kind: document.querySelector('.couple-track .chain-car.end svg') && document.querySelector('.couple-track .chain-car.end svg').dataset.letter, prompt: document.querySelector('.say-prompt').textContent }));
        ok(solved.car && solved.kind === c.part && /jumping/.test(solved.prompt), `Couple a Car: the right car couples on, ${c.to} is whole (${JSON.stringify(solved)})`);
      }
      if (r < 3) await m.page.waitForTimeout(800);
    }
    await m.page.waitForFunction(() => document.querySelector('.couple-game').dataset.state === 'done', null, { timeout: 5000 });
    ok(await noSound(m.page), 'Couple a Car: still nothing played after four rounds (the speaker is the only thing that plays)');
    const raf0 = await m.page.evaluate(() => window.__raf);
    await m.page.waitForTimeout(1500);
    ok((await m.page.evaluate(() => window.__raf)) - raf0 <= 2, 'Couple a Car: no idle frame loop');
    ok(m.errors.length === 0, `Couple a Car: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Couple a Car with word cars (lesson 48: sun + set, a wrong word car does nothing), and the speaker plays only when tapped.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 47);
    await m.page.goto(url + `#/lesson/48/task/${at(48, 'couple')}`);
    await m.page.waitForSelector('.couple-game .chain-car.gap', { timeout: 10000 });
    await m.page.waitForTimeout(900);
    const c = CUR.lessons[47].couples[0];
    const d = await m.page.evaluate(() => ({ cars: [...document.querySelectorAll('.couple-track .chain-car:not(.end)')].map((x) => x.dataset.letter).join(''), choices: [...document.querySelectorAll('.couple-choices .chain-car')].map((x) => ({ part: x.dataset.part, word: x.querySelector('svg') && x.querySelector('svg').getAttribute('aria-label') })), overflow: document.documentElement.scrollWidth > innerWidth }));
    ok(d.cars === c.from && d.choices.map((x) => x.part).sort().join() === [...c.options].sort().join() && !d.overflow, `Couple a Car (48): ${c.from} gets a word car; the cars are ${d.choices.map((x) => x.part)}`);
    await m.page.locator(`.couple-choices .chain-car[data-part="${c.options[1]}"]`).click();
    await m.page.waitForTimeout(300);
    ok((await m.page.locator('.couple-track .chain-car.gap').count()) === 1, 'Couple a Car (48): a wrong word car does nothing');
    await m.page.locator(`.couple-choices .chain-car[data-part="${c.part}"]`).click();
    await m.page.waitForTimeout(400);
    ok((await m.page.locator('.couple-track .chain-car.end[data-part="set"]').count()) === 1 && /sunset/.test(await m.page.locator('.say-prompt').textContent()), 'Couple a Car (48): the word car set couples on and sunset is whole');
    ok(await noSound(m.page), 'Couple a Car (48): nothing played on its own');
    await m.page.locator('.board-hear').click();
    await m.page.waitForTimeout(400);
    ok(await m.page.evaluate(() => window.__events.filter((e) => e.type === 'tts').length === 0), 'Couple a Car (48): the speaker plays a recording of the word only (never text to speech for a word)');
    await shot(m.page, 'couple-a-car-words');
    ok(m.errors.length === 0, `Couple a Car (48): no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Clap, Split, Glue (lesson 49): the gaps are 48 px targets, a wrong gap does nothing, the right gap slides the chunks apart, Glue puts them back, four words.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 48);
    await m.page.addInitScript(() => { window.__raf = 0; const r = window.requestAnimationFrame; window.requestAnimationFrame = (f) => { window.__raf++; return r.call(window, f); }; });
    await m.page.goto(url + `#/lesson/49/task/${at(49, 'split')}`);
    await m.page.waitForSelector('.split-game .split-gap', { timeout: 10000 });
    await m.page.waitForTimeout(900);
    const first = CUR.lessons[48].splits[0];
    const g = await m.page.evaluate(() => ({ cars: [...document.querySelectorAll('.split-track .chain-car')].map((c) => c.dataset.letter).join(''), gaps: [...document.querySelectorAll('.split-gap')].map((b) => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), right: b.dataset.right, x: Math.round(r.x), r: Math.round(r.right) }; }), prompt: document.querySelector('.say-prompt').textContent, overflow: document.documentElement.scrollWidth > innerWidth, gist: (document.querySelector('.script-first') || {}).textContent, step: document.querySelector('.split-game').dataset.step }));
    ok(g.cars === first.word && g.gaps.length === first.word.length - 1 && g.gaps.every((x) => x.w >= 47.5 && x.h >= 47.5 && x.x >= 0 && x.r <= 390) && g.gaps.filter((x) => x.right === '1').length === 1 && g.gaps.findIndex((x) => x.right === '1') === first.parts[0].length - 1 && !g.overflow && g.step === 'split' && /Clap the beats: nap-kin/.test(g.prompt) && g.gist.length <= 28, `Split: ${first.word} is a row of cars with ${g.gaps.length} gaps, each a 48 px target, one of them right (${JSON.stringify(g.gaps.map((x) => x.w + 'x' + x.h))}; "${g.gist}")`);
    ok(await noSound(m.page), 'Split: nothing plays on its own');
    const wrong = g.gaps.findIndex((x) => x.right !== '1');
    await m.page.locator('.split-gap').nth(wrong).click();
    await m.page.waitForTimeout(300);
    ok((await m.page.locator('.split-game').getAttribute('data-step')) === 'split' && (await m.page.locator('.glue-btn').isHidden()), 'Split: a wrong gap does nothing');
    await shot(m.page, 'clap-split-glue');
    for (let r = 0; r < 4; r++) {
      const w = CUR.lessons[48].splits[r];
      await m.page.waitForFunction((word) => document.querySelector('.split-game').dataset.word === word && document.querySelector('.split-game').dataset.step === 'split', w.word, { timeout: 5000 });
      await m.page.locator('.split-gap[data-right="1"]').click();
      await m.page.waitForTimeout(500);
      if (r === 0) {
        const a = await m.page.evaluate(() => ({ step: document.querySelector('.split-game').dataset.step, a: document.querySelectorAll('.chunk-a').length, b: document.querySelectorAll('.chunk-b').length, glue: !document.querySelector('.glue-btn').hidden && document.querySelector('.glue-btn').getBoundingClientRect().height >= 48, prompt: document.querySelector('.say-prompt').textContent, gaps: [...document.querySelectorAll('.split-gap')].every((x) => x.disabled) }));
        ok(a.step === 'glue' && a.a === 3 && a.b === 3 && a.glue && /glue/i.test(a.prompt) && a.gaps, `Split: the right gap slides the chunks apart (${w.parts.join(' | ')}) and Glue appears (${JSON.stringify(a)})`);
        await shot(m.page, 'clap-split-glue-apart');
      }
      await m.page.locator('.glue-btn').click();
      await m.page.waitForTimeout(r < 3 ? 1300 : 300);
      if (r === 0) ok(/napkin!/.test(await m.page.locator('.say-prompt').textContent()) || r > 0, 'Split: Glue puts the word back together');
    }
    await m.page.waitForFunction(() => document.querySelector('.split-game').dataset.state === 'done', null, { timeout: 5000 });
    ok(await noSound(m.page), 'Split: still nothing played after four words');
    const raf0 = await m.page.evaluate(() => window.__raf);
    await m.page.waitForTimeout(1500);
    ok((await m.page.evaluate(() => window.__raf)) - raf0 <= 2, 'Split: no idle frame loop');
    ok(m.errors.length === 0, `Split: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Tricky Sounds x13 and x14: tunnels marked with what the ending says, six word rounds, Which One? with the base word against the word with its ending, Ticket Check.
  for (const [id, signs, n] of [['x13', 'sss,zzz', 43], ['x14', 'one beat,extra beat', 47]]) {
    const m = await newPage(browser, PHONE);
    await seedPage(m, n);
    await m.page.goto(url + `#/checkpoint/${id}/task/0`);
    await m.page.waitForSelector('.tunnels .tunnel', { timeout: 10000 });
    await m.page.waitForTimeout(1200);
    const t = await m.page.evaluate(() => ({ signs: [...document.querySelectorAll('.tunnel-text')].map((e) => e.textContent), stars: document.querySelectorAll('.star-slot').length, overflow: document.documentElement.scrollWidth > innerWidth, tunnels: [...document.querySelectorAll('.tunnel')].map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }) }));
    ok(t.signs.join() === signs && t.stars === 6 && !t.overflow && t.tunnels.every(([w, h]) => w >= 48 && h >= 48), `${id}: two tunnels marked ${signs}, six rounds, 48 px targets (${JSON.stringify(t)})`);
    for (let r = 0; r < 6; r++) {
      await m.page.waitForTimeout(r ? 1000 : 300);
      const car = await m.page.evaluate(() => { const c = document.querySelector('.tcar'); return { side: c.dataset.side, kind: c.dataset.kind, value: c.dataset.value }; });
      if (r === 0) {
        const side = CUR.checkpoints.find((k) => k.id === id).sides[Number(car.side)];
        ok(car.kind === 'word' && side.words.includes(car.value), `${id}: every round is a word on the car (${car.value})`);
        await m.page.locator(`.tunnel[data-side="${1 - Number(car.side)}"]`).click();
        await m.page.waitForTimeout(900);
        ok((await m.page.locator('.tunnels').getAttribute('data-round')) === '0', `${id}: the wrong tunnel bounces the car back`);
        await shot(m.page, `tricky-${id}`);
      }
      await m.page.locator(`.tunnel[data-side="${car.side}"]`).click();
    }
    await m.page.waitForFunction(() => document.querySelector('.tunnels').dataset.state === 'done', null, { timeout: 8000 });
    ok(await noSound(m.page), `${id}: nothing plays on its own`);
    await m.page.goto(url + `#/checkpoint/${id}/task/1`);
    await m.page.waitForSelector('.which-card', { timeout: 10000 });
    await m.page.waitForTimeout(900);
    const w = await m.page.evaluate(() => ({ cards: [...document.querySelectorAll('.which-card')].map((c) => c.dataset.word), pic: document.querySelectorAll('.which-card .pic, .which-card img').length, prompt: document.querySelector('.say-prompt') && document.querySelector('.say-prompt').textContent, gist: (document.querySelector('.script-first') || {}).textContent, overflow: document.documentElement.scrollWidth > innerWidth }));
    const stop = CUR.checkpoints.find((k) => k.id === id);
    ok(w.cards.length === 2 && stop.pairs.some((p) => w.cards.includes(p.a) && w.cards.includes(p.b)) && w.pic === 0 && /^Say: /.test(w.prompt) && w.gist.length <= 28 && !w.overflow, `${id}: Which One? shows a base word and the same word with its ending, no picture (${w.cards}; ${w.prompt}; "${w.gist}")`);
    ok(await noSound(m.page), `${id}: Which One? plays nothing on its own`);
    ok(m.errors.length === 0, `${id}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Review Stops v14 and v15: each step opens the right game.
  for (const [id, n, names] of [['v14', 46, ['Letter Hunt', 'Couple a Car', 'Wagon Parade', 'Green Light', 'Ticket Check']], ['v15', 50, ['Couple a Car', 'Clap, Split, Glue', 'Letter Hunt', 'Wagon Parade', 'Ticket Check']]]) {
    const m = await newPage(browser, PHONE);
    await seedPage(m, n - 1);
    for (const [i, name] of names.entries()) {
      await m.page.goto(url + `#/checkpoint/${id}/task/${i}`);
      await m.page.waitForTimeout(1300);
      const txt = await m.page.evaluate(() => ({ title: (document.querySelector('.task-head h1, h1') || {}).textContent || '', body: document.body.innerText, overflow: document.documentElement.scrollWidth > innerWidth }));
      ok(txt.title.includes(name) && !txt.overflow, `${id} step ${i + 1}: ${name} opens (${txt.title.trim()})`);
    }
    ok(await noSound(m.page), `${id}: nothing plays on its own`);
    await m.page.goto(url + `#/checkpoint/${id}/finish`);
    await m.page.waitForTimeout(1200);
    const msg = await m.page.locator('.review-message').textContent();
    ok(/^Your child has learned 33 sounds, 22 blends and 4 word endings\. Words made only from these sounds and word parts include: /.test(msg) && new RegExp(`That's ${CUR.checkpoints.find((k) => k.id === id).summary.words} words in all`).test(msg), `${id}: the end message counts sounds, blends and word endings apart (${msg.slice(0, 120)})`);
    await shot(m.page, `${id}-finish`);
    ok(m.errors.length === 0, `${id}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Ticket Check (lesson 47: two -ed cars): the question is about a car, three cards.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 46);
    await m.page.goto(url + `#/lesson/47/task/${at(47, 'check')}`);
    await m.page.waitForSelector('.check');
    await m.page.waitForTimeout(800);
    const c = await m.page.evaluate(() => ({ prompt: document.querySelector('.check-prompt').textContent, cards: [...document.querySelectorAll('.opt-card svg.glyph')].map((g) => g.dataset.letter), gist: (document.querySelector('.script-first') || {}).textContent }));
    ok(/extra beat/.test(c.prompt) && c.cards.sort().join() === ['end-ed', 'end-ing', 'end-ted'].join() && c.gist === 'Which has an extra beat?', `Ticket Check 47: asks for the -ed with an extra beat among three cars (${c.prompt}; ${c.cards})`);
    ok(await noSound(m.page), 'Ticket Check 47: nothing plays on its own');
    ok(m.errors.length === 0, `Ticket Check 47: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Fit at three sizes and 48 px targets: New Ending, Saying Sounds, Couple a Car (ending and word cars), Clap Split Glue, Ticket Check.
  for (const vp of [SMALL, PHONE, WIDE]) {
    for (const [n, type, label] of [[45, 'newLetter', 'New Ending'], [46, 'sounds', 'Saying Sounds'], [47, 'couple', 'Couple a Car'], [49, 'couple', 'Couple a Car (word cars)'], [48, 'split', 'Clap, Split, Glue'], [50, 'check', 'Ticket Check']]) {
      const m = await newPage(browser, vp);
      await seedPage(m, n - 1);
      await m.page.goto(url + `#/lesson/${n}/task/${at(n, type)}`);
      await m.page.waitForTimeout(1900);
      const r = await m.page.evaluate(() => {
        const vw = innerWidth, vh = innerHeight, bad = [];
        for (const b of document.querySelectorAll('button, a, .opt-card, .split-gap')) { const q = b.getBoundingClientRect(); if (!q.width || b.hidden || getComputedStyle(b).visibility === 'hidden') continue; if (q.width < 47.5 || q.height < 47.5) bad.push(`${(b.getAttribute('aria-label') || b.textContent || b.className).slice(0, 24)} ${Math.round(q.width)}x${Math.round(q.height)}`); if (q.left < -1 || q.right > vw + 1) bad.push('off-screen ' + (b.className || b.tagName)); }
        const box = (s) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { t: q.top, b: q.bottom, l: q.left, r: q.right }; };
        const scene = box('.chains-scene, .sounds-task, .new-letter, .check');
        return { bad, hs: document.documentElement.scrollWidth > vw, scene, track: box('.chain-track'), choices: box('.chain-choices'), prompt: box('.say-prompt'), glyphW: [...document.querySelectorAll('svg.glyph')].every((g) => g.getBoundingClientRect().right <= vw + 1) };
      });
      const inside = (b, s) => !b || !s || (b.l >= s.l - 1 && b.r <= s.r + 1 && b.t >= s.t - 1 && b.b <= s.b + 1);
      const separate = !r.track || !r.choices || r.choices.t >= r.track.b - 2;
      const promptClear = !r.track || !r.prompt || r.prompt.b <= r.track.t + 4 || r.prompt.t >= r.track.b;
      ok(r.bad.length === 0 && !r.hs && r.glyphW && inside(r.track, r.scene) && inside(r.choices, r.scene) && separate && promptClear, `${label} at ${vp.name}: fits, every target is 48 px, the track, the cars and the prompt do not overlap (${JSON.stringify(r)})`);
      if (vp === PHONE && type === 'check') await shot(m.page, 'ticket-check-50');
      if (vp === SMALL && n === 47) await shot(m.page, 'couple-a-car-360');
      await m.ctx.close();
    }
  }
  // Grownups lists World 6 and the reading count counts the word parts apart from the sounds.
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(47));
    await page.waitForTimeout(2500);
    const gb = await page.locator('.home-top button').first().boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
    await page.waitForSelector('.grownups', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const txt = await page.locator('body').innerText();
    const want = countReadable(Object.assign([...WJ.words, ...WJ.blendWords, ...WJ.endingWords], { blend: new Set(WJ.blendWords), ending: new Set(WJ.endingWords) }), ORDER_SOUNDS.slice(0, 47));
    ok(/Endings Junction/.test(txt) && /of 50/.test(txt), `Grownups: World 6, Endings Junction is listed and the lesson count is of 50 (${txt.replace(/\s+/g, ' ').slice(0, 200)})`);
    const hero = await page.evaluate(() => { const r = document.querySelector('.gu-hero-read'); return { words: r && r.dataset.words, text: r && r.textContent, chips: [...document.querySelectorAll('.gu-chip')].map((c) => c.textContent) }; });
    ok(Number(hero.words) === want && /^Can read \d+ words/.test(hero.text) && ['-s', '-es', '-ing', '-ed', '-ed beat'].every((c) => hero.chips.includes(c)) && !hero.chips.includes('endmix') && hero.chips.filter((c) => /^-/.test(c)).length === 5, `Grownups: Can read ${want} words counts the word parts once taught; each word part is one chip, none is a sound (${hero.words}; ${hero.chips.slice(-7).join(' ')})`);
    ok(errors.length === 0, `Grownups: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Level six: the box car and the banner after lesson 50.
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(49, {}, { levels: levelsFor(49) }));
    await page.waitForTimeout(1500);
    const cars = await page.evaluate(async () => { const { carSvg } = await import('/js/art/cars2d.js'); const s = carSvg('boxcar'); return { rects: s.querySelectorAll('rect').length, viewBox: s.getAttribute('viewBox') }; });
    ok(cars.rects > 8 && cars.viewBox === '0 0 200 120', `level six: the box car icon is drawn (${JSON.stringify(cars)})`);
    ok(errors.length === 0, `level six: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Story 6 (DRAFT): opens at its stop after lesson 49, the cover and a page.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 49);
    await m.page.goto(url + '#/checkpoint/b6');
    await m.page.waitForSelector('.book, .book-cover, .book-page', { timeout: 10000 });
    await m.page.waitForTimeout(1500);
    ok(/Pip at Endings Junction|Story 6/.test(await m.page.locator('body').innerText()), 'story 6: the cover names the story');
    await shot(m.page, 'story6-cover');
    const next = m.page.locator('.btn.next, .book-next, button:has-text("Open")').first();
    for (let i = 0; i < 3; i++) { if (await next.count()) { await next.click().catch(() => {}); await m.page.waitForTimeout(900); } }
    await m.page.waitForTimeout(800);
    await shot(m.page, 'story6-page');
    ok(m.errors.length === 0, `story 6: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // The Home of World 5's end still leads on to Endings Junction (the last lesson of World 5 done, the crossing not yet played).
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(41));
    ok(await until(page, () => window.__train && window.__train.world === 'W5' && window.__train.frames > 1, null, 20000), 'world 5 end: with lesson 41 done the Home shows World 5');
    const t = await page.evaluate(() => ({ stops: window.__train.stopCount, c: window.__train.checkpointCount, sign: window.__train.signText }));
    ok(t.stops === 14 && t.c === 5 && t.sign === 'Endings Junction', `world 5 end: still fourteen stops and a portal to Endings Junction (${JSON.stringify(t)})`);
    ok(errors.length === 0, `world 5 end: no errors ${errors.join(' | ')}`);
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
  console.log(`endings-junction: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
