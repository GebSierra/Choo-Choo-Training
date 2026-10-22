// Lesson rebuild, phase B (docs/LESSON-REBUILD.md section 9): the curriculum's sound order (f o n d c/k h u g l r b after m a s i t p),
// 17 lessons, every reading word decodable from the sounds taught so far, the one c/k lesson with both letters, saved progress MAPPED
// by sound from the old 13-lesson order (never reset), lessons that cannot be skipped, and World 2 ending at lesson 17.
// Run alone with `node test/phase-b.mjs`. Screenshots go to docs/screenshots/phase-b/.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, doneThrough } from './lib.mjs';
import { ORDER, ORDER_SOUNDS, LEGACY_ORDER, SPELLINGS, spellingsOf, soundOfLetter, lettersOfSounds, letterUnits, isReadable } from '../js/order.js';
import { tasksFor } from '../js/lessons.js';
import { earnedLevels } from '../js/levels.js';
import { worldDone, currentWorld, lessonsIn } from '../js/worlds.js';
import { isIsolated } from './check-content.mjs';
import { WORD_BANK, DOCKS_BANK } from '../js/games-data.js';
import { GLYPHS } from '../js/glyphs.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const SHOTS = path.join(ROOT, 'docs/screenshots/phase-b');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
// text that draws every a from our glyph: read the sentence's own aria-label
const said = (loc) => loc.locator('[aria-label]').first().getAttribute('aria-label');
const until = (page, fn, arg, timeout = 10000) => page.waitForFunction(fn, arg, { timeout }).then(() => true).catch(() => false);

// ---- 1. the order and the count ----
const SOUNDS = CUR.lessons.map((L) => L.sound);
ok(CUR.lessons.length === 33 && ORDER_SOUNDS.length === 33, 'there are 33 lessons (17 of them in Worlds 1 and 2; World 3 adds 18 to 25, test/sunny-hills.mjs; World 4 adds 26 to 33, test/digraph-docks.mjs)');
ok(SOUNDS.join(' ') === ORDER && SOUNDS.slice(0, 25).join('') === 'masitpfondchuglrbejwvyzxq' && SOUNDS.slice(0, 17).join('') === 'masitpfondchuglrb', `the lessons teach m a s i t p f o n d c h u g l r b, then World 3 e j w v y z x q, then World 4 sh ch th ck ff wh ng nk (${SOUNDS.join('')})`);
ok(ORDER.includes(' ') && ORDER !== LEGACY_ORDER && LEGACY_ORDER === 'masitpnfdhgbl', 'ORDER holds spaces, so it can never equal the legacy single-letter string');
ok(CUR.lessons.slice(0, 6).map((L) => L.sound).join('') === 'masitp' && CUR.lessons.slice(0, 6).every((L) => L.world === 'W1'), 'World 1 is lessons 1 to 6 (m a s i t p), unchanged');
ok(CUR.lessons.slice(6, 17).every((L) => L.world === 'W2') && lessonsIn(CUR, 'W2').length === 11 && lessonsIn(CUR, 'W2').at(-1).number === 17, 'World 2 (Green Valley) is lessons 7 to 17 and ends at lesson 17');
const UNIT_OF = { f: '2.4', o: '2.4', n: '2.5', d: '2.5', c: '2.6', h: '2.6', u: '2.7', g: '2.7', l: '2.7', r: '2.8', b: '2.8' };
ok(CUR.lessons.slice(6, 17).every((L) => L.unit === UNIT_OF[L.sound]), 'units: 2.4 f o, 2.5 n d, 2.6 c(k) h, 2.7 u g l, 2.8 r b');
ok(Object.keys(CUR.sounds).join('') === SOUNDS.join('') && !CUR.sounds.k, 'one sound per lesson: c/k is one sound with the key c (there is no sound k)');
ok(CUR.checkpoints.map((k) => `${k.id}:${k.after}`).join() === 'r1:4,b1:4,b2:6,b3:22,b4:31,x1:9,x2:12,x3:14,x4:17,x5:18,x6:21,x7:22,x8:23,x9:27,x10:28,v1:3,v6:6,v2:9,v3:12,v4:15,v5:17,v7:20,v8:23,v9:25,v10:30,v11:33', 'the stops keep their ids and places (r1, b1, b2, v1 to v5), World 3 adds Story 3 (b3 after 22) and Review Stops v6 (after 6, end of World 1), v7, v8, v9 (after 20, 23, 25), then the eight Tricky Sounds stops x1 to x8; World 4 adds Story 4 (b4 after 31), Tricky Sounds x9 and x10 (after 27, 28) and Review Stops v10 and v11 (after 30, 33)');
ok(CUR.levels[0].after === 6 && CUR.levels[1].after === 17 && CUR.levels[2].after === 25 && CUR.levels[3].after === 33, 'level one comes after lesson 6, level two after lesson 17, level three after lesson 25, level four after lesson 33 (the end of each world)');
const fakeStore = (n) => ({ isDone: (k) => k <= n, lesson: () => ({}), currentLesson: (t) => (n >= t ? null : n + 1), worlds: () => ({ seen: null }) });
ok(earnedLevels(CUR, fakeStore(16)).length === 1 && earnedLevels(CUR, fakeStore(17)).length === 2 && earnedLevels(CUR, fakeStore(24)).length === 2 && earnedLevels(CUR, fakeStore(25)).length === 3, 'levels: level two is earned by lesson 17, not before');
ok(!worldDone(fakeStore(16), CUR, 'W2') && worldDone(fakeStore(17), CUR, 'W2') && currentWorld(fakeStore(17), CUR).id === 'W3' && currentWorld(fakeStore(6), CUR).id === 'W2', 'worlds: World 2 is done at lesson 17 (the current world is then World 3); after lesson 6 the current world is World 2');
ok(Object.keys(SPELLINGS).join() === 'c,ff' && spellingsOf('c').join('') === 'ck' && spellingsOf('ff').join() === 'ff,ll,ss,zz' && soundOfLetter('k') === 'c' && soundOfLetter('m') === 'm', 'order.js: c has two spellings, c and k');
for (const L of CUR.lessons) {
  const m = tasksFor(L).map((t) => t.type);
  ok(m.at(-1) === 'check' && m.at(-2) === 'practice' && (L.number === 1 || m[0] === 'review') && m[m.indexOf('newLetter') + 1] === 'mouth', `lesson ${L.number} keeps the lesson frame`);
}
for (let n = 8; n <= 33; n++) ok(CUR.lessons[n - 1].middle.join() !== CUR.lessons[n - 2].middle.join(), `lessons ${n - 1} and ${n} have different middles`);

// ---- 2. every word a child reads is decodable from the sounds taught up to and including that lesson ----
const SIGHT = ['is', 'i', 'it'];
for (const L of CUR.lessons) {
  const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, L.number));
  const readable = (w) => isReadable(w, taught);
  for (const w of L.sayingSounds.filter((x) => x.showLetters)) ok(readable(w.word), `lesson ${L.number} Saying Sounds "${w.word}" uses only taught letters`);
  for (const b of L.board || []) { ok(readable(b.word) && [...WORD_BANK, ...DOCKS_BANK].includes(b.word), `lesson ${L.number} Station Board "${b.word}" is decodable and from the word bank`); ok(letterUnits(b.word, L.number).filter((ch) => soundOfLetter(ch) === b.target).length === 1, `lesson ${L.number} board "${b.word}" holds its target ${b.target} once`); }
  for (const o of L.quickCheck.options) if (o.glyph) ok(taught.has(o.glyph), `lesson ${L.number} Ticket Check letter ${o.glyph} is taught`);
  if (L.number >= 7) for (const w of L.sayingSounds.filter((x) => !x.showLetters)) ok(!!w.sayOnly === (!readable(w.word) || ['wagon', 'yarn', 'zebra', 'queen', 'thumb'].includes(w.word) || (w.word === 'ball' && L.number >= 30)), `lesson ${L.number} picture word "${w.word}": letters shown only when decodable (sayOnly ${!!w.sayOnly})`);
  ok(L.review.every((k) => ORDER_SOUNDS.indexOf(k) < L.number - 1), `lesson ${L.number} reviews only earlier sounds`);
}
// the new Green Valley words, by lesson (docs/LESSON-REBUILD.md section 9)
const WORDS = { 7: 'fat fit if', 8: 'top pop sit', 9: 'nap not tin', 10: 'dad dip sad', 11: 'cap kit cot', 12: 'hat him hot', 13: 'mud cup hut', 14: 'tag dig pig', 15: 'lap lip lid', 16: 'rat rip rug', 17: 'bat big bad' };
for (const [n, w] of Object.entries(WORDS)) ok(CUR.lessons[n - 1].sayingSounds.filter((x) => x.showLetters).map((x) => x.word).join(' ') === w, `lesson ${n} reading words are ${w}`);
// wrong cards never carry the lesson's own sound (nor, for c/k, a g word or "queen"); the pool still holds enough
{
  const { sackPool } = await import('../js/lessons.js');
  for (const L of CUR.lessons.filter((x) => x.number >= 7)) {
    const taught = ORDER_SOUNDS.slice(0, L.number), pool = sackPool(CUR, { sounds: taught }).filter((w) => !(w.avoid || []).includes(L.sound));
    ok((pool.length >= 6 || L.number >= 21) && pool.every((w) => !spellingsOf(L.sound).includes(w.word[0]) && soundOfLetter(w.word[0]) !== L.sound), `lesson ${L.number}: ${pool.length} wrong cards, none starting with its own sound`);
    for (const o of L.quickCheck.options) if (!o.correct && o.word) ok(soundOfLetter(o.word[0]) !== L.sound && !(L.sound === 'c' && /^(g|qu)/.test(o.word)), `lesson ${L.number} Ticket Check wrong card "${o.word}" is not its own sound`);
  }
  const cPool = sackPool(CUR, { sounds: ORDER_SOUNDS.slice(0, 11) }).filter((w) => !(w.avoid || []).includes('c')).map((w) => w.word);
  ok(!cPool.some((w) => ['goat', 'gate', 'queen', 'kite', 'corn', 'cat', 'king'].includes(w)), `lesson 11 wrong cards hold no k, c, g or qu word (${cPool.join(' ')})`);
}

// ---- 3. the c/k lesson in the data ----
{
  const s = CUR.sounds.c, L = CUR.lessons[10];
  ok(s.glyph === 'c' && s.alt.join() === 'k' && s.sayItLike === 'k-' && s.hold === false && s.clip === 'assets/audio/sounds/c.mp3', 'c/k: key c, glyph c, second spelling k, the parent says "k-", clipped, clip c.mp3');
  ok(s.words.some((w) => w.word[0] === 'c') && s.words.some((w) => w.word[0] === 'k'), 'c/k: the pictures include c words and k words');
  ok(L.sayingSounds.some((w) => w.word[0] === 'c') && L.sayingSounds.some((w) => w.word[0] === 'k'), 'c/k: the reading words include a c word and a k word');
  ok(L.board.some((b) => b.word.includes('k')) && L.board.some((b) => b.word.includes('c')), `c/k: Station Board has a c word and a k word (${L.board.map((b) => b.word).join(' ')})`);
  ok(L.quickCheck.promptText === 'Which picture starts with k-?' && !isIsolated(L.quickCheck.promptText), 'c/k: Ticket Check reads "Which picture starts with k-?"');
  ok(/Do not add uh/.test(s.howTo) && !/kkk|ccc/i.test(JSON.stringify(s)), 'c/k: how-to text says no uh and never stretches the clipped sound');
  ok(CUR.sounds.o.asIn === 'octopus' && CUR.sounds.u.asIn === 'umbrella' && CUR.sounds.r.hold === true && CUR.sounds.r.sayItLike === 'rrr', 'o, u and r: o as in octopus, u as in umbrella, r held (rrr)');
  for (const k of 'ocur') ok(CUR.sounds[k].mouth && typeof CUR.sounds[k].mouth.voice === 'boolean' && CUR.sounds[k].mouth.text.length <= 120, `Watch My Mouth text for ${k}`);
}

// ---- 4. saved progress is mapped by sound ----
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { createStore } = await import('../js/store.js');
const open = (saved) => { mem.clear(); mem.set('reading.v1', JSON.stringify(saved)); return createStore(); };
const legacyLessons = (n, extra = {}) => ({ ...Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [0, 1], result: 'got-it', completedAt: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`, doneAt: 1000 + i }])), ...extra });
const legacy = (extra = {}) => ({
  schema: 1, order: LEGACY_ORDER, lastOpened: '2026-10-08T00:00:00Z',
  lessons: legacyLessons(9, { 10: { tasksDone: [0, 1, 2], result: null, completedAt: null }, 11: { tasksDone: [0], result: 'practice-again', completedAt: '2026-10-09T10:00:00.000Z' } }),
  checkpoints: { r1: { result: 'got-it' }, b1: { result: 'got-it' }, b2: { result: 'got-it', completedAt: '2026-10-06T10:00:00.000Z' } },
  settings: { rate: 1.0, trainAt: 7, trainDone: 12, trainIntroDone: true, perDay: 3, seenScripts: { 'lesson:8': true, 'lesson:10': true, newLetter: true, 'tip:1:newLetter': true } },
  character: { name: 'Lily', made: true }, firstRunDone: true, meetDue: false, worlds: { seen: 'W2' }, levels: { seen: 1, earned: { L1: '2026-10-04T10:00:00.000Z' } }, savedAt: 123456, ...extra,
});
{
  // legacy: m a s i t p n f d done (lessons 7 8 9 = n f d), h unfinished (10), g practice-again (11)
  let s = open(legacy());
  const L = (n) => s.state.lessons[n];
  ok(s.state.order === ORDER && JSON.parse(mem.get('reading.v1')).order === ORDER, 'mapping: the migrated state is saved under the new order, in the same reading.v1 key');
  ok([1, 2, 3, 4, 5, 6, 7, 9, 10].every((n) => s.isDone(n)) && !s.isDone(8) && !s.isDone(11), 'mapping: n f d done become f (7), n (9), d (10) done; o (8) and c/k (11) are not done');
  ok(L(9).result === 'got-it' && L(9).completedAt === '2026-10-07T10:00:00.000Z' && L(9).doneAt === 1006 && L(7).completedAt === '2026-10-08T10:00:00.000Z' && L(10).completedAt === '2026-10-09T10:00:00.000Z', 'mapping: finished lessons keep their result and dates (n moved from 7 to 9, f from 8 to 7, d from 9 to 10)');
  ok(L(7).tasksDone.join() === '0,1' && L(9).tasksDone.join() === '0,1', 'mapping: finished lessons keep their task list');
  ok(L(12) && L(12).tasksDone.length === 0 && L(12).result === null, 'mapping: the unfinished lesson (h, 10 to 12) starts its tasks again');
  ok(L(14) && L(14).tasksDone.length === 0 && L(14).result === 'practice-again' && L(14).completedAt === '2026-10-09T10:00:00.000Z', 'mapping: a practice-again lesson (g, 11 to 14) keeps its result but starts its tasks again');
  ok(!L(8) && !L(11) && !L(13) && !L(16), 'mapping: o, c/k, u and r have no saved lesson');
  ok(s.currentLesson(17) === 8 && s.isUnlocked(8), 'lock rule: o is the current lesson');
  ok(s.isUnlocked(9) && s.isUnlocked(10) && !s.isUnlocked(11) && !s.isUnlocked(12) && !s.isUnlocked(14) && !s.isNaturallyUnlocked(17), 'lock rule: c/k (11) is NOT open just because d (10) is done; nothing after o opens');
  ok(s.settings.trainAt === undefined && s.settings.trainDone === undefined, 'mapping: trainAt and trainDone are dropped (Home records fresh counts and plays no ride)');
  ok(!('lesson:8' in s.settings.seenScripts) && !('lesson:10' in s.settings.seenScripts) && s.settings.seenScripts.newLetter === true && s.settings.seenScripts['tip:1:newLetter'] === true, 'mapping: seenScripts lesson: keys dropped, the rest kept');
  ok(s.settings.rate === 1 && s.settings.trainIntroDone === true && s.settings.perDay === 3, 'mapping: other settings kept');
  ok(s.character().name === 'Lily' && s.state.firstRunDone === true && s.worlds().seen === 'W2' && s.levels().seen === 1 && typeof s.levels().earned.L1 === 'string' && s.state.savedAt === 123456, 'mapping: character, welcome, worlds.seen, levels and savedAt kept');
  ok(s.state.checkpoints.r1.result === 'got-it' && s.state.checkpoints.b2.completedAt === '2026-10-06T10:00:00.000Z' && s.isCheckpointDone({ id: 'b2', after: 6 }), 'mapping: the World 1 stops (by id) stay');
  // finishing o opens c/k, in order
  s.setResult(8, 'got-it');
  ok(s.currentLesson(17) === 11 && s.isUnlocked(11) && !s.isUnlocked(12), 'lock rule: finishing o makes c/k the current lesson and opens it');
  s.setResult(11, 'got-it'); s.setResult(12, 'got-it');
  ok(s.currentLesson(17) === 13 && s.isUnlocked(13) && !s.isUnlocked(14), 'lock rule: the next lessons open one at a time');
  // reload: parsing the saved state again changes nothing (an already mapped save is not mapped twice)
  const again = createStore();
  ok(again.state.order === ORDER && again.isDone(9) && !again.isDone(13) && again.currentLesson(17) === 13, 'mapping: opening the mapped save again changes nothing');

  // every legacy lesson done: o c/k u r are the four still to do
  s = open(legacy({ lessons: legacyLessons(13) }));
  ok([1, 2, 3, 4, 5, 6, 7, 9, 10, 12, 14, 15, 17].every((n) => s.isDone(n)) && [8, 11, 13, 16].every((n) => !s.isDone(n)) && s.currentLesson(17) === 8, 'all 13 old lessons done: o, c/k, u and r are still to do, o is current');
  ok(earnedLevels(CUR, s).length === 1, 'all 13 old lessons done: level two is not earned until lesson 17');
  // a save older than per-lesson results: a later done lesson counted for the ones before (implied done); the mapping writes that down
  s = open(legacy({ lessons: { 9: { tasksDone: [], result: 'got-it' } }, checkpoints: {} }));
  ok([1, 2, 3, 4, 5, 6, 7, 9, 10].every((n) => s.isDone(n)) && !s.isDone(8) && s.isCheckpointDone({ id: 'b2', after: 6 }), 'implied done lessons (only the last result saved) are mapped as done too');
  // the nth lesson of an unfinished legacy save
  s = open(legacy({ lessons: legacyLessons(7, { 8: { tasksDone: [0, 1, 2, 3], result: null } }) }));
  ok(s.isDone(9) && s.isDone(6) && !s.isDone(7) && s.currentLesson(17) === 7 && s.lesson(7).tasksDone.length === 0, 'legacy save with n done and f in progress: f (7) is the current lesson and its tasks start again');
  // no order, or an unknown order, keeps today's behaviour
  const plain = legacy(); delete plain.order;
  s = open(plain);
  ok(Object.keys(s.state.lessons).length === 0 && s.currentLesson(17) === 1 && s.settings.trainAt === undefined && s.character().name === 'Lily', 'no order field (a real install): lessons start again, character kept (the old rule)');
  s = open(legacy({ order: 'zyx' }));
  ok(Object.keys(s.state.lessons).length === 0 && s.currentLesson(17) === 1, 'an unknown order resets the lessons once (the old rule)');
  const seed = legacy({ order: 'zyx' }); delete seed.lastOpened;
  s = open(seed);
  ok(Object.keys(s.state.lessons).length > 0, 'an unknown order without lastOpened (a test seed) keeps its lessons');
  s = open({ ...legacy(), order: ORDER, lessons: doneThrough(8) });
  ok(s.isDone(8) && s.currentLesson(17) === 9 && JSON.parse(mem.get('reading.v1')).order === ORDER, 'a save under the new order is read as it is');
  // a later done lesson no longer completes the ones before it (under the new order)
  s = open({ ...legacy(), order: ORDER, lessons: { 9: { tasksDone: [], result: 'got-it' } }, checkpoints: {} });
  ok(s.isDone(9) && !s.isDone(1) && !s.isDone(8) && s.currentLesson(17) === 1, 'new order: only a lesson with its own result is done');
  // adopt (the cloud copy) goes through the same mapping
  s = open({ schema: 1, order: ORDER, lessons: {}, settings: {} });
  s.adopt(legacy());
  ok(s.state.order === ORDER && s.isDone(9) && !s.isDone(8) && s.currentLesson(17) === 8 && s.settings.trainAt === undefined && s.state.savedAt === 123456, 'adopt: a cloud copy with the old order is mapped too, and keeps its own savedAt');
  // the pace limit: o is the next new lesson; resting follows the rule "every earlier lesson done"
  s = open(legacy({ settings: { perDay: 1, pace4: true, migrated1912: true, speak0: true, layoutA: true } }));
  s.setResult(8, 'got-it');
  ok(s.isResting(11) && !s.isResting(12) && !s.isResting(9), 'pace limit: after one new lesson today the next new lesson (c/k) rests; lessons not yet reachable do not');
}

// ---- 5. the browser: the c/k lesson, a mapped save on Home, a cloud pull ----
const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());
const VPS = [{ name: 'phone', width: 390, height: 844, deviceScaleFactor: 2 }, { name: 'small', width: 360, height: 640, deviceScaleFactor: 2 }, { name: 'land', width: 915, height: 412, deviceScaleFactor: 2 }];
const seed = (obj) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(obj))}); }`;
const base = (n, extra = {}) => ({ schema: 1, order: ORDER, lessons: doneThrough(n), settings: { seenScripts: SEEN, perDay: 0 }, firstRunDone: true, meetDue: false, character: { name: 'Lily', made: true }, ...extra });
async function page(vp, state, route, { tips = false } = {}) {
  const made = await newPage(browser, vp);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(seed(state));
  await made.page.goto(url + route);
  return made;
}
const fits = (p, sel) => p.evaluate((q) => [...document.querySelectorAll(q)].every((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.left >= -0.5 && r.right <= innerWidth + 0.5 && r.top >= -0.5 && r.bottom <= innerHeight + 0.5; }), sel);
const noScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
fs.mkdirSync(SHOTS, { recursive: true });
const idx = (n, type) => tasksFor(CUR.lessons[n - 1]).find((t) => t.type === type).index;

for (const vp of VPS) {
  const tag = `${vp.name}`;
  // New Sound shows both letters
  {
    const { ctx, page: p, errors } = await page(vp, base(10), `#/lesson/11/task/${idx(11, 'newLetter')}`);
    await p.waitForSelector('.new-letter');
    await p.waitForTimeout(1600);
    const r = await p.evaluate(() => ({ glyphs: [...document.querySelectorAll('.new-letter .letter-card svg.glyph')].map((g) => g.dataset.letter), card: document.querySelector('.new-letter .sound-card').innerText, pair: !!document.querySelector('.letter-card.pair') }));
    ok(r.pair && r.glyphs.join() === 'c,k', `${tag} New Sound: the card shows both letters c and k (${r.glyphs})`);
    ok(/c and k make the same sound: k-/.test(r.card.replace(/\s+/g, ' ')), `${tag} New Sound: the sound card says "c and k make the same sound: k-" (${r.card.replace(/\s+/g, ' ')})`);
    ok(await fits(p, '.new-letter .letter-card, .new-letter .sound-card') && await noScroll(p), `${tag} New Sound: fits the screen`);
    // the big card draws the one glyph table: every stroke of c and k is the data's, and once the draw-in has finished the whole letter is there
    await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'), null, { timeout: 8000 }).catch(() => {});
    const paths = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.new-letter .letter-card svg.glyph')].map((g) => [g.dataset.letter, [...g.querySelectorAll('path.stroke')].map((x) => ({ d: x.getAttribute('d'), off: getComputedStyle(x).strokeDashoffset, o: getComputedStyle(x).opacity }))])));
    ok(['c', 'k'].every((l) => JSON.stringify(paths[l].map((x) => x.d)) === JSON.stringify(GLYPHS[l].strokes.map((x) => x.d))) && paths.k.length === 3, `${tag} New Sound: the big card draws the house c and k strokes (k has ${paths.k.length})`);
    ok(paths.k.every((x) => (x.off === '0px' || x.off === 'none' || parseFloat(x.off) === 0) && x.o === '1'), `${tag} New Sound: the k is fully drawn once the draw-in ends (${JSON.stringify(paths.k.map((x) => x.off))})`);
    if (vp.name === 'phone') await p.screenshot({ path: path.join(SHOTS, 'ck-new-sound-390x844.png') });
    ok(errors.length === 0, `${tag} New Sound c/k: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Watch My Mouth: both letters named; the phone says no isolated sound
  {
    const { ctx, page: p, errors } = await page(vp, base(10), `#/lesson/11/task/${idx(11, 'mouth')}`);
    await p.waitForSelector('.mouth-task');
    await p.waitForTimeout(1800);
    const same = (await said(p.locator('.mouth-same'))).replace(/\s+/g, ' ').trim();
    ok(same === 'c and k make the same sound.', `${tag} Watch My Mouth: "${same}"`);
    await p.click('.mouth-how-btn');
    ok(/How to make k-/.test(await p.locator('.mouth-how-title').innerText()) && await fits(p, '.mouth-same, .mouth-art') && await noScroll(p), `${tag} Watch My Mouth: the how-to panel names k- and everything fits`);
    ok((await p.evaluate(() => window.__spoken.slice())).every((x) => !isIsolated(x)), `${tag} Watch My Mouth c/k: the phone says no isolated sound`);
    ok(errors.length === 0, `${tag} Watch My Mouth c/k: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}
{
  const vp = VPS[0];
  // the overview shows both letters
  const { ctx, page: p, errors } = await page(vp, base(10), '#/lesson/11');
  await p.waitForSelector('.lesson-overview');
  const head = (await said(p.locator('.lo-title p'))).replace(/\s+/g, ' ');
  ok(/c and k make the same sound, k-/.test(head), `overview: "${head}"`);
  const chips = await p.evaluate(() => [...document.querySelectorAll('.task-card')].map((c) => [...c.querySelectorAll('.chip-glyph svg')].map((g) => g.dataset.letter).join('')));
  ok(chips.filter((c) => c === 'ck').length >= 5, `overview: the task chips show both letters (${chips.join(' ')})`);
  ok(await p.evaluate(() => [...document.querySelectorAll('.task-card .card-art .big-glyph.pair svg.glyph')].length >= 2), 'overview: New Sound and Track Tracing show both letters');
  await ctx.close();
}
{
  const vp = VPS[0];
  const { ctx, page: p, errors } = await page(vp, base(10), '#/lesson/11/task/' + idx(11, 'hunt'));
  await p.waitForSelector('.sky-letter');
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => ({ t: [...document.querySelectorAll('.sky-letter[data-target="1"]')].map((b) => b.dataset.letter), o: [...document.querySelectorAll('.sky-letter[data-target="0"]')].map((b) => b.dataset.letter), card: !!document.querySelector('.find-card.pair') }));
  ok(r.t.length >= 4 && r.t.every((x) => x === 'c' || x === 'k') && r.t.includes('c') && r.t.includes('k') && r.o.every((x) => x !== 'c' && x !== 'k'), `Letter Hunt: the targets are c and k balloons (${r.t}), the others are neither (${r.o})`);
  ok(r.card, 'Letter Hunt: the Find card shows both letters');
  await ctx.close();
}
{
  // Station Board, Green Light and Wagon Parade accept either spelling
  const vp = VPS[0];
  let { ctx, page: p } = await page(vp, base(10), '#/lesson/11/task/' + idx(11, 'board'));
  await p.waitForSelector('.flap-tile');
  const b = await p.evaluate(() => [...document.querySelectorAll('.flap-tile')].map((t) => t.dataset.letter + (t.dataset.target === '1' ? '*' : '')).join(' '));
  ok(/(c|k)\*/.test(b) && !/[a-jl-z]\*/.test(b.replace(/c\*|k\*/g, '')), `Station Board: a c or k tile is the target (${b})`);
  await ctx.close();
  const s = CUR.lessons[10];
  ok(s.middle.includes('board') && s.middle.includes('hunt') && s.middle.includes('sounds') && s.middle.includes('writing'), 'lesson 11 middle: board, sounds, hunt, writing');
  ({ ctx, page: p } = await page(vp, base(10), '#/lesson/11/task/' + idx(11, 'writing')));
  await p.waitForSelector('.trace-pad');
  ok((await p.locator('.letter-pick').count()) === 2 && (await p.evaluate(() => document.querySelector('.trace-pad').dataset.letter)) === 'c', 'Track Tracing: two letter buttons, c first');
  const box = await p.locator('.letter-pick').first().boundingBox();
  ok(box.width >= 47.9 && box.height >= 47.9, `Track Tracing: the letter buttons are at least 48 px (${box.width}x${box.height})`);
  await p.locator('.letter-pick').nth(1).click();
  await p.waitForTimeout(300);
  ok((await p.evaluate(() => document.querySelector('.trace-pad').dataset.letter)) === 'k' && (await p.locator('.letter-pick[aria-pressed="true"]').getAttribute('data-letter')) === 'k', 'Track Tracing: tapping k switches the pad to k');
  ok(await fits(p, '.writing-buttons .btn') && await noScroll(p), 'Track Tracing: the buttons fit');
  await ctx.close();
  // Green Light and Wagon Parade in a later lesson that lists c/k as an earlier sound never mistake c for the target
  const gl = CUR.lessons.find((L) => L.number > 11 && L.middle.includes('signals'));
  ({ ctx, page: p } = await page(vp, base(gl.number - 1), `#/lesson/${gl.number}/task/${idx(gl.number, 'signals')}`));
  await p.waitForSelector('.signal');
  ok(await p.evaluate((k) => [...document.querySelectorAll('.signal')].filter((b) => b.dataset.target === '1').every((b) => b.dataset.letter === k), gl.sound), `Green Light (lesson ${gl.number}): only the ${gl.sound} lamp is the target`);
  await ctx.close();
}
{
  // Ticket Check: the prompt says k- as text for the grown-up; the phone says no isolated sound
  const { ctx, page: p } = await page(VPS[0], base(10), '#/lesson/11/task/' + idx(11, 'check'));
  await p.waitForSelector('.check');
  ok((await said(p.locator('.check-prompt'))).trim() === 'Which picture starts with k-?', 'Ticket Check c/k: "Which picture starts with k-?"');
  await p.waitForTimeout(1500);
  ok((await p.evaluate(() => window.__spoken.slice())).every((x) => !isIsolated(x)), 'Ticket Check c/k: the phone says no isolated sound');
  await ctx.close();
}
{
  // Saying Sounds: a picture word with untaught letters is only said (sayOnly): no letters to slide under
  const { ctx, page: p } = await page(VPS[0], base(6), '#/lesson/7/task/' + idx(7, 'sounds'));
  await p.waitForSelector('.sounds-stage');
  for (let i = 0; i < 3; i++) { await p.click('.sounds-task .btn.ghost.small'); await p.waitForTimeout(150); }
  await p.waitForSelector('.sounds-stage');
  await p.click('.sounds-stage');
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => !document.querySelector('.sounds-stage .glyph-row')), 'Saying Sounds: the picture word "fish" (sh is not taught) shows no letters to read');
  await ctx.close();
}
{
  // Home: a mapped save (n f d done) shows o as the current stop and c/k locked; the W2 path at 390x844
  const state = { ...legacy(), lastOpened: '2026-10-08T00:00:00Z', settings: { ...legacy().settings, seenScripts: { ...SEEN } } };
  const { ctx, page: p, errors } = await page(VPS[0], state, '#/home');
  await p.waitForSelector('.home');
  await p.waitForTimeout(2500);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')));
  ok(st.order === ORDER && st.lessons[7] && st.lessons[9] && st.lessons[10] && !st.lessons[8] && st.settings.trainAt !== undefined, `Home: the legacy save was mapped on load and Home recorded a fresh train position (${st.settings.trainAt})`);
  ok(await until(p, () => !!document.querySelector('.start-btn, .stone, .home'), null, 4000), 'Home: opens');
  const btns = await p.evaluate(() => [...document.querySelectorAll('[data-lesson], .stone, button.stop-btn')].map((b) => (b.getAttribute('aria-label') || b.textContent).trim().replace(/\s+/g, ' ')));
  ok(btns.length > 0, `Home: lesson stops are listed (${btns.slice(0, 14).join(' | ')})`);
  await p.screenshot({ path: path.join(SHOTS, 'w2-home-390x844.png') });
  ok(errors.length === 0, `Home (mapped save): no errors ${errors.join(' | ')}`);
  await ctx.close();
}
{
  // the o lesson overview
  const { ctx, page: p, errors } = await page(VPS[0], base(7), '#/lesson/8');
  await p.waitForSelector('.lesson-overview');
  await p.waitForTimeout(700);
  ok((await p.locator('.lo-title h1').innerText()).trim() === 'Lesson 8' && /o as in octopus/.test((await said(p.locator('.lo-title p'))).replace(/\s+/g, ' ')), 'o lesson overview: Lesson 8, "the sound o as in octopus"');
  await p.screenshot({ path: path.join(SHOTS, 'o-overview-390x844.png') });
  await ctx.close();
  // a locked lesson cannot be opened by the address
  const locked = await page(VPS[0], { ...base(9), lessons: { ...doneThrough(7), 9: { tasksDone: [], result: 'got-it' } } }, '#/lesson/11');
  await locked.page.waitForTimeout(800);
  ok(!(await locked.page.evaluate(() => location.hash)).startsWith('#/lesson/11'), 'c/k (11) cannot be opened while o (8) is not done');
  await locked.ctx.close();
}

// ---- 6. the cloud copy: a fresh device signing in takes a copy with the old order and maps it ----
{
  const SB = 'https://fake-project.supabase.test';
  const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type, accept, prefer', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS', 'access-control-allow-credentials': 'true' };
  const row = { data: legacy({ savedAt: Date.now() + 1000 }), updated_at: new Date().toISOString() };
  const pushes = [];
  const made = await newPage(browser, VPS[0]);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(`window.__config = { url: '${SB}', key: 'anon-key-for-tests', providers: [] };`);
  await made.ctx.route('**/*', async (route) => {
    const req = route.request(), u = new URL(req.url());
    if (u.origin === new URL(url).origin || u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
    if (u.origin !== SB) return route.abort();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const json = (status, body) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });
    const p = u.pathname;
    if (p === '/auth/v1/token') return json(200, { access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: 'user-1', email: 'mum@example.com' } });
    if (p === '/auth/v1/user') return json(200, { id: 'user-1', email: 'mum@example.com', app_metadata: { provider: 'email' } });
    if (p === '/rest/v1/progress' && req.method() === 'GET') return json(200, [row]);
    if (p === '/rest/v1/progress' && req.method() === 'POST') { pushes.push(JSON.parse(req.postData())); return json(201); }
    return json(404, { message: 'unknown ' + p });
  });
  await made.page.goto(url + '#/home');
  await made.page.waitForSelector('.signin, .screen');
  await made.page.fill('input[name=email]', 'mum@example.com');
  await made.page.fill('input[name=password]', 'correct-horse');
  await made.page.click('.si-go');
  await until(made.page, () => { try { const s = JSON.parse(localStorage.getItem('reading.v1')); return !!s && s.order && s.lessons && Object.keys(s.lessons).length > 0; } catch { return false; } }, null, 10000);
  await made.page.waitForTimeout(1500);
  const st = await made.page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')));
  ok(st && st.order === ORDER && st.lessons[7] && st.lessons[9] && st.lessons[10] && !st.lessons[8] && !st.lessons[11], `cloud pull: a copy with the old order is mapped on sign-in (lessons ${st && Object.keys(st.lessons).join(',')})`);
  ok(st && st.lessons[9] && st.lessons[9].completedAt === '2026-10-07T10:00:00.000Z' && st.character.name === 'Lily', 'cloud pull: finished lessons keep their dates, the character is kept');
  ok(st && !('lesson:8' in (st.settings.seenScripts || {})), 'cloud pull: the per-lesson seen scripts are dropped');
  await made.page.waitForTimeout(3000);
  ok(pushes.every((b) => b.data.order === ORDER), 'cloud pull: what is pushed back afterwards is under the new order');
  ok(made.errors.filter((e) => !/Failed to load resource/.test(e)).length === 0, `cloud pull: no errors ${made.errors.join(' | ')}`);
  await made.ctx.close();
}

await browser.close(); server.close();
console.log(`phase-b: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
