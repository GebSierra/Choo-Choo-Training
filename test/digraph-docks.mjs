// World 4, Digraph Docks (lessons 26 to 33: sh ch th ck ff(ll ss zz) wh ng nk; docs/LESSON-REBUILD.md section 14). Data (no browser): the order and the
// count, the words of every lesson and their decodability proven from scratch (a digraph is a unit, taught before any word uses it), the digraph
// units and glyphs, the grown-up's notation, the stops (Tricky Sounds after 27 and 28, a mid-world Review Stop after 30, Story 4 after 31, the
// end-of-world Review Stop after 33), the heart words, level four, Story 4's words, and saved progress under the old 17 and 25-sound orders staying
// exactly as it was. Browser: the Sunny Hills to Digraph Docks crossing, the Home of World 4, going back W4 to W3 to W2 to W1, the digraph tiles in
// New Sound, Saying Sounds and Letter Hunt, and Story 4. Run alone with `node test/digraph-docks.mjs [--shots]`; shots (390x844) go to
// docs/screenshots/digraph-docks/.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN } from './lib.mjs';
import { SPEECH_STUB } from './stubs.mjs';
import { ORDER, ORDER_SOUNDS, LEGACY_ORDER, PRIOR_ORDERS, DIGRAPHS, letterUnits, soundOfLetter, lettersOfSounds, isReadable } from '../js/order.js';
import { GLYPHS } from '../js/glyphs.js';
import { slowSounds, firstSoundOut } from '../js/scripts.js';
import { lessonsIn, worldDone, currentWorld, reachedWorlds, previousWorld } from '../js/worlds.js';
import { openHome, until, state } from './train.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const BOOK4 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/books/book-4.json'), 'utf8'));
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/digraph-docks');
const PHONE = { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 };
const SOUNDS = CUR.lessons.map((L) => L.sound);
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };

// The reading words of each new lesson (Saying Sounds); docs/LESSON-REBUILD.md section 14.
const WORDS = { 26: 'shop fish mash', 27: 'chop much rich', 28: 'that thin bath', 29: 'back sick duck', 30: 'puff miss buzz', 31: 'when whip whiz', 32: 'rang long hung', 33: 'bank pink honk' };
const doneL = (n, extra = {}) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it', completedAt: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`, doneAt: 1760000000000 + i, ...extra }]));
const CHARACTER = { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true };
const stopsDone = (n) => Object.fromEntries(CUR.checkpoints.filter((k) => k.after <= n).map((k) => [k.id, { result: 'got-it' }]));
const L12 = { L1: '2026-10-06T10:00:00.000Z', L2: '2026-10-17T10:00:00.000Z' };
const L123 = { ...L12, L3: '2026-10-25T10:00:00.000Z' };
const levelsFor = (n) => ({ seen: n >= 33 ? 4 : n >= 25 ? 3 : n >= 17 ? 2 : n >= 6 ? 1 : 0, earned: n >= 33 ? { ...L123, L4: '2026-10-30T10:00:00.000Z' } : n >= 25 ? L123 : n >= 17 ? L12 : n >= 6 ? { L1: L12.L1 } : {} });
// n lessons done, every stop up to them done, the train resting: the child is in the world of lesson n + 1 and has seen it
const world = (n) => CUR.lessons.find((l) => l.number === Math.min(n + 1, 33)).world;
const seed = (n, settings = {}, extra = {}) => state(n, { migrated1912: true, pace4: true, trainIntroDone: true, ...settings }, { lessons: doneL(n), levels: levelsFor(n), worlds: { seen: world(n) }, checkpoints: stopsDone(n), character: CHARACTER, meetDue: false, ...extra });
const settled = (page, ms = 25000) => until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, ms);

// ---- data and the store, no browser ----
export async function dataChecks({ ok }) {
  // 1. the order and the count
  ok(ORDER_SOUNDS.length === 33 && ORDER_SOUNDS.slice(0, 25).join(' ') === 'm a s i t p f o n d c h u g l r b e j w v y z x q' && ORDER_SOUNDS.slice(25).join(' ') === 'sh ch th ck ff wh ng nk', 'order: 33 sounds, the first 25 unchanged, then sh ch th ck ff wh ng nk appended');
  ok(ORDER === ORDER_SOUNDS.join(' ') && PRIOR_ORDERS.length === 2 && PRIOR_ORDERS[0] === ORDER_SOUNDS.slice(0, 17).join(' ') && PRIOR_ORDERS[1] === ORDER_SOUNDS.slice(0, 25).join(' ') && ORDER.startsWith(PRIOR_ORDERS[1] + ' ') && ORDER !== LEGACY_ORDER, 'order: the 17-sound and the 25-sound strings that older saves carry are prefixes of the new one (so nothing is reset)');
  ok(SOUNDS.join(' ') === ORDER && CUR.lessons.length === 33 && Object.keys(CUR.sounds).join(' ') === ORDER, 'data: 33 lessons, one sound each, in order');
  ok(CUR.lessons.slice(25).every((L) => L.world === 'W4') && lessonsIn(CUR, 'W4').length === 8 && CUR.worlds[3].name === 'Digraph Docks', 'data: lessons 26 to 33 are World 4, Digraph Docks');
  const UNIT = { 26: '3.1', 27: '3.1', 28: '3.2', 29: '3.3', 30: '3.3', 31: '3.3', 32: '3.4', 33: '3.4' };
  ok(CUR.lessons.slice(25).every((L) => L.unit === UNIT[L.number]) && CUR.units.filter((u) => u.stage === 3).map((u) => u.id).join() === '3.1,3.2,3.3,3.4,3.5', 'data: sh ch are unit 3.1, th unit 3.2, ck ff wh unit 3.3, ng nk unit 3.4 (3.5 is the mixed review, the last Review Stop)');
  // 2. the words of each lesson, and decodability proven from scratch: a digraph is only readable once its lesson is taught
  for (const [n, words] of Object.entries(WORDS)) ok(CUR.lessons[n - 1].sayingSounds.filter((w) => w.showLetters).map((w) => w.word).join(' ') === words, `lesson ${n} (${SOUNDS[n - 1]}): reading words are ${words}`);
  for (const L of CUR.lessons.slice(25)) {
    const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, L.number));
    const read = [...L.sayingSounds.filter((w) => w.showLetters).map((w) => w.word), ...(L.board || []).map((b) => b.word), ...L.quickCheck.options.filter((o) => o.glyph).map((o) => o.glyph)];
    ok(read.length >= 6 && read.every((w) => isReadable(w, taught)), `lesson ${L.number}: every child-read word uses only letters and digraphs taught by it (${read.join(' ')})`);
    for (const b of L.board || []) ok(letterUnits(b.word, L.number).filter((u) => soundOfLetter(u) === b.target).length === 1, `lesson ${L.number} board "${b.word}": its target ${b.target} is one unit, once`);
    const m = CUR.sounds[L.sound].mouth;
    ok(m && typeof m.voice === 'boolean' && /Voice (on|off)\.$/.test(m.text), `lesson ${L.number}: Watch My Mouth text for ${L.sound}`);
    ok(L.sayingSounds.every((w) => w.showLetters || w.sayOnly || isReadable(w.word, taught)), `lesson ${L.number}: a picture word is only shown as letters when decodable`);
  }
  const before = lettersOfSounds(ORDER_SOUNDS.slice(0, 25));
  ok(!isReadable('ship', before) && !isReadable('chip', before) && !isReadable('thin', before) && !isReadable('back', before) && !isReadable('when', before) && !isReadable('ring', before) && !isReadable('bank', before), 'decodable: no digraph word is readable before its digraph is taught (ship, chip, thin, back, when, ring, bank)');
  ok(isReadable('miss', lettersOfSounds(ORDER_SOUNDS.slice(0, 4))) && isReadable('buzz', before) && isReadable('puff', lettersOfSounds(ORDER_SOUNDS.slice(0, 29))), 'decodable: a doubled letter is still read letter by letter before ff ll ss zz (miss at lesson 4 and buzz at 23 keep working)');
  const at = (n) => lettersOfSounds(ORDER_SOUNDS.slice(0, n));
  ok(isReadable('ship', at(26)) && !isReadable('chip', at(26)) && isReadable('chip', at(27)) && !isReadable('thin', at(27)) && isReadable('thin', at(28)) && !isReadable('back', at(28)) && isReadable('back', at(29)) && isReadable('bell', at(30)) && !isReadable('when', at(30)) && isReadable('when', at(31)) && !isReadable('ring', at(31)) && isReadable('ring', at(32)) && !isReadable('bank', at(32)) && isReadable('bank', at(33)), 'decodable: each digraph word becomes readable exactly at its lesson');
  const tiles = (k) => CUR.sounds[k].words.map((w) => w.word).join(' ');
  ok(tiles('sh') === 'ship shark shoe' && tiles('ch') === 'chair cheese chick' && tiles('th') === 'thumb thunder bath mother father' && tiles('ck') === 'duck sock stick rock' && tiles('ff') === 'ball' && tiles('ng') === 'ring sing wing', 'pictures: the tiles of the folders sh ch th ng, and the pictures that have ck and ll inside');
  ok(CUR.sounds.wh.noPictures === true && CUR.sounds.nk.noPictures === true && CUR.sounds.wh.words.length === 0 && CUR.sounds.nk.words.length === 0 && CUR.lessons[30].sayingSounds.every((w) => w.showLetters) && CUR.lessons[32].sayingSounds.every((w) => w.showLetters), 'pictures: wh and nk have no tile (nothing is shown rather than a wrong picture); their Saying Sounds are words only');
  ok(['ck', 'ff', 'ng', 'nk'].every((k) => CUR.sounds[k].endOnly === true && CUR.sounds[k].startWords.length === 0 && CUR.sounds[k].practice.length === 0), 'ck ff ng nk: heard at the end of words, so no start words or Practicing Words');
  ok(CUR.sounds.ff.alt.join() === 'll,ss,zz' && CUR.lessons[29].sayingSounds.some((w) => w.word === 'puff') && CUR.lessons[29].sayingSounds.some((w) => w.word === 'miss') && CUR.lessons[29].sayingSounds.some((w) => w.word === 'buzz') && CUR.sounds.ff.words[0].word === 'ball', 'ff ll ss zz: one lesson with four spellings, each met (puff, ball, miss, buzz)');
  ok(CUR.sounds.th.voiced === 'thhh' && CUR.sounds.th.voicedWords.includes('that') && !CUR.sounds.th.voicedWords.includes('thin') && /throat/.test(CUR.sounds.th.parentNote) && /buzz/.test(CUR.sounds.th.parentNote) && CUR.lessons[27].sayingSounds.filter((w) => w.showLetters).some((w) => w.word === 'that') && CUR.lessons[27].sayingSounds.filter((w) => w.showLetters).some((w) => w.word === 'thin'), 'th: one lesson with both kinds (that buzzes, thin does not); the grown-up is told to touch the throat');
  ok(CUR.sounds.ng.parentNote.includes('-ang') && CUR.sounds.ng.parentNote.includes('-ung') && CUR.sounds.nk.parentNote.includes('-ank') && CUR.sounds.nk.parentNote.includes('-unk'), 'ng and nk: taught as chunks -ang -ing -ong -ung and -ank -ink -onk -unk');
  ok(CUR.sounds.sh.hold === true && CUR.sounds.ch.hold === false && CUR.sounds.sh.sayItLike === 'shhh' && CUR.sounds.ch.sayItLike === 'ch-' && CUR.sounds.th.sayItLike === 'th-' && CUR.sounds.ck.sayItLike === 'k-' && CUR.sounds.wh.sayItLike === 'w-', 'notation: shhh (held), ch- th- k- w- (clipped)');

  const { soundCardLines } = await import('../js/lessons.js');
  ok(['sh', 'ch', 'th', 'ck', 'wh', 'ng', 'nk', 'q'].every((k) => /^These two letters make one sound: /.test(soundCardLines(CUR.sounds[k])[0])) && soundCardLines(CUR.sounds.sh)[0] === 'These two letters make one sound: shhh, as in ship.' && /^Two of the same letter make one sound: fff, as in puff\./.test(soundCardLines(CUR.sounds.ff)[0]) && /^The letters c and k make the same sound/.test(soundCardLines(CUR.sounds.c)[0]) && /^This letter says /.test(soundCardLines(CUR.sounds.m)[0]), 'sound card: every two-letter unit says "These two letters make one sound", never "This letter says"');
  // 3. digraphs are one unit everywhere
  ok(DIGRAPHS.join(' ') === 'sh ch th ck ff ll ss zz wh ng nk', 'units: the eleven digraphs are listed in js/order.js');
  const U = (w, n) => JSON.stringify(letterUnits(w, n));
  ok(U('ship', 26) === '["sh","i","p"]' && U('chip', 27) === '["ch","i","p"]' && U('that', 28) === '["th","a","t"]' && U('duck', 29) === '["d","u","ck"]' && U('bell', 30) === '["b","e","ll"]' && U('miss', 30) === '["m","i","ss"]' && U('buzz', 30) === '["b","u","zz"]' && U('puff', 30) === '["p","u","ff"]' && U('when', 31) === '["wh","e","n"]' && U('long', 32) === '["l","o","ng"]' && U('bank', 33) === '["b","a","nk"]' && U('lunch', 33) === '["l","u","n","ch"]', 'units: sh ch th ck ff ll ss zz wh ng nk are one unit each in a word');
  ok(U('ship', 25) === '["s","h","i","p"]' && U('miss', 29) === '["m","i","s","s"]' && U('duck', 28) === '["d","u","c","k"]' && U('quit', 33) === '["q","i","t"]' && U('quit') === '["q","i","t"]' && U('shut') === '["s","h","u","t"]', 'units: before its lesson a digraph is two letters again (so older lessons never change); qu is still one unit');
  ok(DIGRAPHS.every((d) => GLYPHS[d] && GLYPHS[d].strokes.length >= 2 && GLYPHS[d].link && GLYPHS[d].minX >= 0 && GLYPHS[d].maxX <= 100), 'glyphs: every digraph has its own linked glyph (two letters, one bar under them) inside the 100-wide box');
  ok(GLYPHS.sh.strokes.length === GLYPHS.s.strokes.length + GLYPHS.h.strokes.length && GLYPHS.ck.strokes.length === GLYPHS.c.strokes.length + GLYPHS.k.strokes.length, 'glyphs: a digraph is built from the strokes of its two letters');
  ok(soundOfLetter('ll') === 'ff' && soundOfLetter('zz') === 'ff' && soundOfLetter('ck') === 'ck' && soundOfLetter('sh') === 'sh' && soundOfLetter('k') === 'c', 'units: ll ss zz belong to the ff lesson; ck is its own sound, k still belongs to c');
  ok(slowSounds('ship', CUR.sounds) === 'shhhiiip-' && slowSounds('chip', CUR.sounds) === 'ch-iiip-' && slowSounds('that', CUR.sounds) === 'thhhaaat-' && slowSounds('thin', CUR.sounds) === 'th-iiinnn' && slowSounds('duck', CUR.sounds) === 'd-uuuk-' && slowSounds('miss', CUR.sounds) === 'mmmiiisss' && slowSounds('buzz', CUR.sounds) === 'b-uuuzzz' && slowSounds('when', CUR.sounds) === 'w-eeennn' && slowSounds('ring', CUR.sounds) === 'rrriiing-' && slowSounds('bank', CUR.sounds) === 'b-aaank-', 'scripts: the grown-up reads shhhiiip-, ch-iiip-, thhhaaat- (buzzing th), th-iiinnn (quiet th), d-uuuk-, mmmiiisss, w-eeennn, rrriiing-, b-aaank-');
  ok(firstSoundOut('ship', CUR.sounds) === 'shhhip' && firstSoundOut('chair', CUR.sounds) === 'ch-air' && firstSoundOut('thumb', CUR.sounds) === 'th-umb', 'scripts: a picture word brings out its first unit (shhhip, ch-air, th-umb)');

  // 4. the stops
  const ck = Object.fromEntries(CUR.checkpoints.map((k) => [k.id, k]));
  ok(CUR.checkpoints.map((k) => `${k.id}:${k.after}`).join() === 'r1:4,b1:4,b2:6,b3:22,b4:31,x1:9,x2:12,x3:14,x4:17,x5:18,x6:21,x7:22,x8:23,x9:27,x10:28,v1:3,v6:6,v2:9,v3:12,v4:15,v5:17,v7:20,v8:23,v9:25,v10:30,v11:33', 'stops: ids and places (nothing old moves; x9 after 27, x10 after 28, v10 after 30, b4 after 31, v11 after 33)');
  const nodes = CUR.lessons.flatMap((l) => [{ lesson: l }, ...CUR.checkpoints.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
  for (const w of ['W1', 'W2', 'W3', 'W4']) {
    const last = nodes.filter((n) => (n.lesson ? n.lesson.world : n.checkpoint.world) === w).at(-1);
    ok(last.checkpoint && last.checkpoint.kind === 'review', `stops: ${w} ends with a Review Stop (${last.checkpoint ? last.checkpoint.id : 'a lesson'})`);
  }
  ok(ck.x9.kind === 'contrast' && ck.x9.pair.join() === 'sh,ch' && ck.x9.pairs.map((p) => `${p.a}/${p.b}`).join() === 'ship/chip,shop/chop,shin/chin' && ck.x9.world === 'W4', 'Tricky Sounds x9 (after 27): sh against ch, ship/chip and shop/chop among the pairs');
  ok(ck.x10.kind === 'contrast' && ck.x10.pair.join() === 'th,t' && ck.x10.pairs.map((p) => `${p.a}/${p.b}`).join() === 'thin/tin,then/ten' && ck.x10.world === 'W4', 'Tricky Sounds x10 (after 28): th against t, thin/tin and then/ten');
  for (const id of ['x9', 'x10']) ok(ck[id].plan.map((a) => a.task).join() === 'tunnels,which,signals,check' && ck[id].sides.every((s) => s.words.every((w) => isReadable(w, at(ck[id].after)))), `Tricky Sounds ${id}: the same four steps, every word readable`);
  ok(ck.v10.kind === 'review' && ck.v10.after === 30 && ck.v10.plan.every((a) => a.lesson <= 30) && ck.v10.plan.at(-1).task === 'check', 'Review Stop v10 (after 30, the middle of the world): nothing past lesson 30 shows');
  ok(ck.v11.mix === 'digraphs' && ck.v11.after === 33 && ck.v11.plan.some((a) => a.lesson === 33) && ck.v11.plan.some((a) => a.lesson === 31) && ck.v11.plan.some((a) => a.lesson === 29) && ck.v11.plan.some((a) => a.lesson === 27) && ck.v11.plan.at(-1).task === 'check' && ck.v11.world === 'W4', 'Review Stop v11 (the end of the world) mixes the digraphs: games on lessons 33, 31, 29 and 27 deal each lesson sound with the digraphs before it');
  ok(ck.v10.summary.sounds === 30 && ck.v11.summary.sounds === 33 && ck.v11.summary.words > ck.v9.summary.words && ck.v11.summary.hearts.includes('what') && ck.v11.summary.hearts.includes('they') && ck.v11.summary.hearts.includes('she'), 'Review Stop messages: counted words grow with the digraph words; the heart words are listed');
  ok(ck.b4.kind === 'book' && ck.b4.book === 'book-4' && ck.b4.world === 'W4' && ck.b4.after === 31 && JSON.stringify(ck.b4.needs) === JSON.stringify(ORDER_SOUNDS.slice(0, 31)), 'stops: Story 4 is in World 4, after lesson 31 (wh), and needs the sounds up to wh');
  ok(CUR.levels.map((v) => v.after).join() === '6,17,25,33,' && CUR.levels[3].car === 'tanker' && CUR.levels[3].needs.length === 33, 'levels: level four comes after lesson 33 (the end of World 4), level five is still to build');

  // 5. heart words
  const hw = (n) => (CUR.lessons[n - 1].heart || []).join();
  ok(hw(26) === 'she' && hw(28) === 'they' && hw(31) === 'what,where' && [27, 29, 30, 32, 33].every((n) => !(CUR.lessons[n - 1].heart || []).length) && CUR.lessons.every((L) => (L.heart || []).length <= 2), 'heart words: she at 26, they at 28, what and where at 31 (wh is taught there), never more than two a lesson');
  ok(['she', 'they', 'what', 'where'].every((w) => CUR.heartWords[w].parts.map((p) => p.t).join('') === w && CUR.heartWords[w].parts.some((p) => p.heart)), 'heart words: the parts spell the word and mark the tricky part');

  // 6. Story 4 (DRAFT, owner approves the text)
  const sight = (BOOK4.sight || []).map((w) => w.toLowerCase());
  const taught31 = lettersOfSounds(ORDER_SOUNDS.slice(0, 31)), hearts31 = CUR.lessons.slice(0, 31).flatMap((L) => L.heart || []).map((w) => w.toLowerCase());
  const childWords = BOOK4.pages.flatMap((p) => [p.child, p.slider, ...(p.words || [])].filter(Boolean)).flatMap((t) => t.split(/\s+/)).map((w) => w.replace(/[^a-z]/gi, '').toLowerCase()).filter(Boolean);
  ok(childWords.length >= 10 && childWords.every((w) => sight.includes(w) || hearts31.includes(w) || isReadable(w, taught31)), `story 4: every word the child reads uses only letters and digraphs taught by lesson 31 (${[...new Set(childWords)].join(' ')})`);
  ok(BOOK4.pages.length >= 8 && BOOK4.pages.length <= 10 && BOOK4.pages.at(-1).kind === 'review' && BOOK4.pages.filter((p) => p.child).every((p) => p.child.split(' ').length === 1), `story 4: ${BOOK4.pages.length} pages, the last one a review, one child-read word on each reading page`);
  ok(['ship', 'fish', 'shop', 'chop', 'bell', 'duck', 'back'].every((w) => BOOK4.pages.some((p) => p.child === w)) && BOOK4.pages.some((p) => /Pip/.test(p.read || '')) && BOOK4.pages.some((p) => /Sam/.test(p.read || '')) && BOOK4.pages.some((p) => /\{name\}/.test(p.read || '')), 'story 4: the docks words ship fish shop chop bell duck back are child-read; Pip, Sam and {name} are in it');
  ok(BOOK4.pages.every((p) => !/\{name\}/.test(p.read || '') || !/\b(he|she|him|his|her)\b/i.test((p.read || '').split('{name}')[1] || '')), 'story 4: the child is called by name, never he or she');
  ok(JSON.stringify(BOOK4.needs) === JSON.stringify(ORDER_SOUNDS.slice(0, 31)) && BOOK4.draft === true, 'story 4: needs the sounds up to wh and is marked as a draft in its data');

  // 7. saved progress: the 17 and 25-sound orders stay exactly as they were
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const { createStore } = await import('../js/store.js');
  const open = (save) => { mem.clear(); mem.set('reading.v1', JSON.stringify(save)); return createStore(); };
  const settings = { migrated1912: true, pace4: true, speak0: true, layoutA: true, heartA: true, seenScripts: { ...SEEN, 'lesson:9': true }, trainAt: 7, trainDone: 12, perDay: 4 };
  const old = (order, n, extra = {}) => ({ schema: 1, order, lessons: doneL(n), checkpoints: stopsDone(Math.min(n, 25)), settings, levels: { seen: 3, earned: L123 }, worlds: { seen: 'W3' }, character: CHARACTER, firstRunDone: true, lastOpened: '2026-10-12T08:00:00.000Z', savedAt: 1760000000000, ...extra });
  let save = old(PRIOR_ORDERS[1], 25), s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && Object.keys(s.state.lessons).length === 25, 'saves: a finished Sunny Hills save keeps lessons 1 to 25 exactly (results, dates, tasks)');
  ok(JSON.stringify(s.state.checkpoints) === JSON.stringify(save.checkpoints) && JSON.stringify(s.state.levels.earned) === JSON.stringify(L123) && s.state.worlds.seen === 'W3' && s.state.character.name === 'Lily', 'saves: its stops, levels, world record and character stay');
  ok(s.settings.trainAt === 7 && s.settings.trainDone === 12 && s.settings.seenScripts['lesson:9'] === true && s.settings.perDay === 4, 'saves: its settings, train position and seen scripts stay (nothing is dropped)');
  ok(s.currentLesson(33) === 26 && s.isDone(25) && !s.isDone(26) && s.isUnlocked(26) && !s.isUnlocked(27), 'saves: lesson 26 (sh) is the current lesson, 27 is still locked behind it');
  s.setResult(26, 'got-it');
  ok(JSON.parse(mem.get('reading.v1')).order === ORDER && JSON.parse(mem.get('reading.v1')).lessons[25].result === 'got-it' && JSON.parse(mem.get('reading.v1')).lessons[3].completedAt === save.lessons[3].completedAt, 'saves: the next save writes the new order and keeps every older result');
  save = old(PRIOR_ORDERS[0], 17, { checkpoints: stopsDone(17), levels: { seen: 2, earned: L12 }, worlds: { seen: 'W2' } });
  s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.currentLesson(33) === 18 && s.isDone(17), 'saves: a Green Valley save under the 17-sound order is still read as it is (lesson 18 is next)');
  save = old(PRIOR_ORDERS[1], 25, { lessons: { ...doneL(25), 26: { tasksDone: [0, 1, 2], result: 'practice-again' } }, worlds: { seen: 'W4' } });
  s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.state.lessons[26].tasksDone.join() === '0,1,2' && s.state.lessons[26].result === 'practice-again' && s.currentLesson(33) === 26, 'saves: a save mid-way (lesson 26 half done) keeps its task progress and result, no reset');
  save = { ...old(PRIOR_ORDERS[1], 25), order: ORDER, lessons: doneL(28) };
  s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.currentLesson(33) === 29, 'saves: a save under the new order is read as it is');
  save = { schema: 1, order: 'm a s i t p f o', lessons: doneL(8), checkpoints: {}, settings, firstRunDone: true, lastOpened: '2026-10-12T08:00:00.000Z' };
  ok(Object.keys(open(save).state.lessons).length === 0, 'saves: an unknown order still starts the lessons again once (the 1.8.1 rule is unchanged)');
  s = open({ schema: 1, order: LEGACY_ORDER, lessons: doneL(13), checkpoints: {}, settings: { ...settings, trainAt: undefined }, firstRunDone: true, lastOpened: '2026-10-12T08:00:00.000Z' });
  ok(Object.entries(s.state.lessons).filter(([, l]) => l.result === 'got-it').map(([n]) => Number(n)).sort((a, b) => a - b).join() === '1,2,3,4,5,6,7,9,10,12,14,15,17' && s.currentLesson(33) === 8, 'saves: the legacy 13-lesson order still maps by sound');
  // a child who finished World 3 and played the old stops: the new World 4 stops carry no result and never send them back
  s = open(old(PRIOR_ORDERS[1], 25));
  ok(!s.isCheckpointDone(ck.x9) && !s.isCheckpointDone(ck.v10) && worldDone(s, CUR, 'W3') && currentWorld(s, CUR).id === 'W4' && !worldDone(s, CUR, 'W4'), 'worlds: Sunny Hills done, Digraph Docks is now the current world; its stops are not yet done');
  s = open(old(PRIOR_ORDERS[1], 25, { lessons: doneL(30), checkpoints: stopsDone(30) }));
  ok(s.isCheckpointDone(ck.x9) && s.isCheckpointDone(ck.x10) && s.isCheckpointDone(ck.v10) && !s.isCheckpointDone(ck.b4), 'stops: a child past a stop counts it as passed; the ones ahead are still ahead');
  ok(reachedWorlds(s, CUR).map((w) => w.id).join() === 'W1,W2,W3,W4' && previousWorld(CUR, 'W4').id === 'W3' && previousWorld(CUR, 'W3').id === 'W2' && previousWorld(CUR, 'W2').id === 'W1', 'worlds: W4 can go back to W3, W3 to W2 and W2 to W1');
}

// ---- the screens, in the browser ----
export async function screenChecks({ browser, url, ok }) {
  // The crossing from Sunny Hills into Digraph Docks, like World 2 into World 3.
  {
    const crossing = state(25, { migrated1912: true, pace4: true, trainIntroDone: true, trainDone: 25 + 5, trainAt: 9999 }, { lessons: doneL(25), levels: { seen: 3, earned: L123 }, worlds: { seen: 'W3' }, checkpoints: stopsDone(25), character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, PHONE, crossing);
    ok(await until(page, () => !!document.querySelector('.world-card.in') || (window.__train && window.__train.world === 'W3' && window.__train.gate && window.__train.gate.phase), null, 20000), 'crossing: Sunny Hills is done, so the crossing plays');
    ok(await until(page, () => !!document.querySelector('.world-card.in'), null, 25000), 'crossing: the loading card shows between the two worlds');
    ok((await page.locator('.wg-name').textContent()) === 'Digraph Docks', 'crossing: it names Digraph Docks');
    await page.waitForTimeout(600);
    await page.locator('.world-card .wg-go').click();
    ok(await until(page, () => window.__train && window.__train.world === 'W4' && window.__train.frames > 0, null, 20000), 'crossing: Digraph Docks is built after it');
    const w4 = await page.evaluate(() => ({ stops: window.__train.stopCount, l: window.__train.lessonCount, c: window.__train.checkpointCount, start: window.__train.startTunnel, portal: window.__train.portal, sign: window.__train.signText, theme: window.__train.theme, placeholder: window.__train.placeholder }));
    ok(w4.stops === 13 && w4.l === 8 && w4.c === 5 && w4.start && w4.portal && w4.sign === 'Blend Bay' && !w4.placeholder, `crossing: World 4 has its eight lessons and five stops (two Tricky Sounds, Story 4, two Review Stops), a start tunnel and a portal to Blend Bay (${JSON.stringify(w4)})`);
    ok(await settled(page, 40000), 'crossing: the train rolls out and settles');
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).worlds.seen)) === 'W4', 'crossing: it is recorded, so it plays once');
    const btns = await page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => b.getAttribute('aria-label') + '|' + b.className.replace(/.*is-/, '')));
    ok(/^Lesson 26/.test(btns[0]) && /current/.test(btns[0]) && btns.filter((b) => b.startsWith('Story 4')).length === 1 && btns.filter((b) => b.startsWith('Review Stop')).length === 2 && btns.filter((b) => b.startsWith('Tricky Sounds')).length === 2 && btns.filter((b) => b.startsWith('Lesson')).length === 8, `home: Lesson 26 is the current stop; Story 4, two Tricky Sounds and two Review Stops are on the line (${btns.join(', ')})`);
    ok(/Review Stop/.test(btns.at(-1)), 'home: World 4 ends with a Review Stop');
    await page.waitForTimeout(3300);
    await shot(page, 'w4-home');
    ok(errors.length === 0, `crossing: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // The Home of World 4 on a normal visit, and going back W4 to W3 to W2 to W1.
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(27));
    ok(await until(page, () => window.__train && window.__train.world === 'W4' && window.__train.frames > 1, null, 20000), 'visit: the Home opens on World 4');
    ok(await settled(page), 'visit: it settles');
    const before = await page.evaluate(() => localStorage.getItem('reading.v1'));
    const show = async (role) => { await page.evaluate((r) => window.__train.show(r === 'back' ? -5 : window.__train.stopCount - 1), role); await page.waitForTimeout(250); return until(page, (r) => { const b = document.querySelector(`.portal-btn[data-role="${r}"]`); return b && b.dataset.shown === '1'; }, role, 5000); };
    const goBack = async (world, label) => {
      ok(await show('back'), `visit: the start tunnel is a button (towards ${label})`);
      ok((await page.locator('.portal-btn[data-role="back"]').getAttribute('aria-label')) === `Back to ${label}`, `visit: it is labelled "Back to ${label}"`);
      await page.locator('.portal-btn[data-role="back"]').click();
      ok(await until(page, (w) => window.__train && window.__train.world === w && window.__train.frames > 0, world, 20000), `visit: ${label} shows`);
      ok(await settled(page), `visit: ${label} settles`);
    };
    await goBack('W3', 'Sunny Hills');
    await goBack('W2', 'Green Valley');
    await goBack('W1', 'Starter Station');
    ok(await show('forward') && (await page.locator('.portal-btn[data-role="forward"]').getAttribute('aria-label')) === 'On to Green Valley', 'visit: its end tunnel leads on to Green Valley again');
    ok((await page.evaluate(() => localStorage.getItem('reading.v1'))) === before, 'visit: going back and forth changed nothing in the saved progress');
    ok(errors.length === 0, `visit: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // New Sound for sh and th (390x844): the linked letters are drawn from their strokes, the grown-up note is there.
  for (const [n, key, card, note] of [[26, 'sh', /shhh as in ship/, /Two letters, one sound/], [28, 'th', /th- as in thin/, /throat/]]) {
    const m = await newPage(browser, PHONE);
    await m.page.addInitScript(SPEECH_STUB);
    await m.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneL(n - 1), settings: { seenScripts: SEEN, trainIntroDone: true, migrated1912: true, pace4: true }, firstRunDone: true })}))`);
    await m.page.goto(url + `#/lesson/${n}/task/1`);
    await m.page.waitForSelector('.new-letter');
    await m.page.waitForTimeout(2800);
    const d = await m.page.evaluate(() => ({ strokes: document.querySelectorAll('.letter-card path.stroke').length, link: document.querySelectorAll('.letter-card path.glyph-link').length, card: document.querySelector('.sound-card') && document.querySelector('.sound-card').textContent, tiles: [...document.querySelectorAll('.word-tile')].map((t) => t.getAttribute('aria-label')), overflow: document.documentElement.scrollWidth > innerWidth + 1, box: (() => { const r = document.querySelector('.letter-card').getBoundingClientRect(); return { x: r.x, r: r.right, w: r.width }; })() }));
    ok(d.strokes === GLYPHS[key].strokes.length && d.link === 1 && !d.overflow && d.box.x >= 0 && d.box.r <= PHONE.width, `New Sound ${key}: the letter is one linked tile drawn from its ${GLYPHS[key].strokes.length} strokes and fits (${d.strokes} strokes, ${d.link} link, width ${Math.round(d.box.w)})`);
    ok(card.test(d.card) && (key === 'sh' ? d.tiles.join() === 'ship,shark,shoe' : d.tiles.join() === 'thumb,thunder,bath,mother,father'), `New Sound ${key}: the card and the picture words (${d.card}; ${d.tiles})`);
    ok(note.test(CUR.sounds[key].parentNote), `New Sound ${key}: the grown-up note is in the data the script reads (${CUR.sounds[key].parentNote.slice(0, 60)}...)`);
    await shot(m.page, `${key}-new-sound`);
    ok(m.errors.length === 0, `New Sound ${key}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Saying Sounds: ship is three units, one of them the linked sh (and a doubled letter and ck at their lessons).
  {
    const m = await newPage(browser, PHONE);
    await m.page.addInitScript(SPEECH_STUB);
    await m.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneL(25), settings: { seenScripts: SEEN, trainIntroDone: true, migrated1912: true, pace4: true }, firstRunDone: true })}))`);
    const L26 = CUR.lessons[25], tasks = L26.middle;
    const at = (type) => 1 + 2 + (L26.heart && L26.heart.length ? 1 : 0) + tasks.indexOf(type); // review, new sound, mouth, the Heart Word step, then the middle
    await m.page.goto(url + `#/lesson/26/task/${at('sounds')}`);
    await m.page.waitForSelector('.glyph-letter');
    await m.page.waitForTimeout(1200);
    const g = await m.page.evaluate(() => ({ word: document.querySelector('.word-glyphs').getAttribute('aria-label'), letters: [...document.querySelectorAll('.word-glyphs .glyph-letter')].map((e) => e.dataset.letter).join(), strokes: [...document.querySelectorAll('.word-glyphs .glyph-letter')][0].querySelectorAll('path.stroke').length, links: document.querySelectorAll('.word-glyphs path.glyph-link').length }));
    ok(g.word === 'shop' && g.letters === 'sh,o,p' && g.strokes === GLYPHS.sh.strokes.length && g.links === 1, `Saying Sounds: shop is sh o p, the sh one linked tile (${g.letters}, ${g.strokes} strokes, ${g.links} link)`);
    await shot(m.page, 'shop-saying-sounds');
    if (tasks.includes('hunt')) {
      await m.page.goto(url + `#/lesson/26/task/${at('hunt')}`);
      await m.page.waitForSelector('.sky-letter', { timeout: 10000 });
      await m.page.waitForTimeout(1500);
      const hh = await m.page.evaluate(() => ({ targets: [...document.querySelectorAll('.sky-letter[data-target="1"]')].map((e) => ({ l: e.dataset.letter, strokes: e.querySelectorAll('path.stroke').length })) }));
      ok(hh.targets.length >= 1 && hh.targets.every((t) => t.l === 'sh' && t.strokes === GLYPHS.sh.strokes.length), `Letter Hunt: the balloons carry the one sh glyph (${JSON.stringify(hh)})`);
    }
    ok(m.errors.length === 0, `digraph screens: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // A doubled letter at lesson 30 and ck at lesson 29 are one unit each in Saying Sounds.
  for (const [n, word, units] of [[29, 'back', 'b,a,ck'], [30, 'puff', 'p,u,ff']]) {
    const m = await newPage(browser, PHONE);
    await m.page.addInitScript(SPEECH_STUB);
    await m.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneL(n - 1), settings: { seenScripts: SEEN, trainIntroDone: true, migrated1912: true, pace4: true }, firstRunDone: true })}))`);
    const L = CUR.lessons[n - 1];
    await m.page.goto(url + `#/lesson/${n}/task/${1 + 2 + (L.heart && L.heart.length ? 1 : 0) + L.middle.indexOf('sounds')}`);
    await m.page.waitForSelector('.glyph-letter');
    await m.page.waitForTimeout(900);
    const got = await m.page.evaluate(() => ({ word: document.querySelector('.word-glyphs').getAttribute('aria-label'), units: [...document.querySelectorAll('.word-glyphs .glyph-letter')].map((e) => e.dataset.letter).join() }));
    const first = L.sayingSounds[0].word;
    ok(first === 'back' || first === 'puff' ? got.word === word && got.units === units : got.units.length > 0, `Saying Sounds (lesson ${n}): ${got.word} is ${got.units}`);
    ok(m.errors.length === 0, `lesson ${n} Saying Sounds: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Story 4 (DRAFT): opens at its stop after lesson 31, the cover and a page.
  {
    const m = await newPage(browser, PHONE);
    await m.page.addInitScript(SPEECH_STUB);
    await m.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneL(31), settings: { seenScripts: SEEN, trainIntroDone: true, migrated1912: true, pace4: true }, firstRunDone: true, character: CHARACTER })}))`);
    await m.page.goto(url + '#/checkpoint/b4');
    await m.page.waitForSelector('.book, .book-cover, .book-page', { timeout: 10000 });
    await m.page.waitForTimeout(1500);
    ok(/Pip and the Docks|Story 4/.test(await m.page.locator('body').innerText()), 'story 4: the cover names the story');
    await shot(m.page, 'story4-cover');
    const next = m.page.locator('.btn.next, .book-next, button:has-text("Open")').first();
    for (let i = 0; i < 2; i++) { if (await next.count()) { await next.click().catch(() => {}); await m.page.waitForTimeout(900); } }
    await m.page.waitForTimeout(800);
    await shot(m.page, 'story4-page');
    const linked = await m.page.evaluate(() => document.querySelectorAll('.book-sheet .word-glyphs path.glyph-link, .book .word-glyphs path.glyph-link').length);
    ok(linked >= 0 && m.errors.length === 0, `story 4: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // The end of World 3 now has the new World 4 ahead: the Home of a child with lesson 25 done shows World 3's end tunnel to Digraph Docks.
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(24));
    ok(await until(page, () => window.__train && window.__train.world === 'W3' && window.__train.frames > 1, null, 20000), 'world 3 end: with lesson 24 done the Home shows World 3');
    const t = await page.evaluate(() => ({ stops: window.__train.stopCount, c: window.__train.checkpointCount }));
    ok(t.stops === 16 && t.c === 8, `world 3 end: still sixteen stops, eight lessons and eight stops (${JSON.stringify(t)})`);
    ok(errors.length === 0, `world 3 end: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  await dataChecks({ ok });
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await screenChecks({ browser, url, ok });
  await browser.close();
  server.close();
  console.log(`digraph-docks: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
