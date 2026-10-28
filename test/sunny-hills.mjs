// World 3, Sunny Hills (lessons 18 to 25: e j w v y z x qu; docs/LESSON-REBUILD.md section 11). Data (no browser): the order and the count, the
// words of every lesson and their decodability proven from scratch, qu as one unit, the stops (every world ends with a Review Stop, Story 3 after
// lesson 22), level three, Story 3's words, and saved progress under the old 17-sound order staying exactly as it was. Browser: the Green Valley to
// Sunny Hills crossing, the Home of World 3, going back W3 to W2 to W1, qu in the games and Saying Sounds, and New Sound for e and qu.
// Run alone with `node test/sunny-hills.mjs [--shots]`; shots (390x844) go to docs/screenshots/sunny-hills/.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN } from './lib.mjs';
import { SPEECH_STUB } from './stubs.mjs';
import { ORDER, ORDER_SOUNDS, LEGACY_ORDER, PRIOR_ORDERS, letterUnits, soundOfLetter, lettersOfSounds, isReadable } from '../js/order.js';
import { GLYPHS } from '../js/glyphs.js';
import { soundText, slowSounds, firstSoundOut } from '../js/scripts.js';
import { lessonsIn, worldDone, currentWorld, reachedWorlds, previousWorld } from '../js/worlds.js';
import { openHome, until, state } from './train.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const BOOK3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/books/book-3.json'), 'utf8'));
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/sunny-hills');
const PHONE = { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 };
const SOUNDS = CUR.lessons.map((L) => L.sound);
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };

// The reading words of each new lesson (Saying Sounds); docs/LESSON-REBUILD.md section 11.
const WORDS = { 18: 'pin pen bet', 19: 'jet jug jog', 20: 'wet web wig', 21: 'van vat vet', 22: 'yes yet yam', 23: 'zip zap buzz', 24: 'six box mix', 25: 'quit quiz quilt' };
const doneL = (n, extra = {}) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it', completedAt: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`, doneAt: 1760000000000 + i, ...extra }]));
const CHARACTER = { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true };
const stopsDone = (n) => Object.fromEntries(CUR.checkpoints.filter((k) => k.after <= n).map((k) => [k.id, { result: 'got-it' }]));
const L12 = { L1: '2026-10-06T10:00:00.000Z', L2: '2026-10-17T10:00:00.000Z' };
// n lessons done, every stop up to them done, the train resting: the child is in the world of lesson n + 1 and has seen it
const world = (n) => CUR.lessons.find((l) => l.number === Math.min(n + 1, 33)).world;
const seed = (n, settings = {}, extra = {}) => state(n, { migrated1912: true, pace4: true, trainIntroDone: true, ...settings }, { lessons: doneL(n), levels: { seen: n >= 25 ? 3 : n >= 17 ? 2 : n >= 6 ? 1 : 0, earned: n >= 25 ? { ...L12, L3: '2026-10-25T10:00:00.000Z' } : n >= 17 ? L12 : n >= 6 ? { L1: L12.L1 } : {} }, worlds: { seen: world(n) }, checkpoints: stopsDone(n), character: CHARACTER, meetDue: false, ...extra });
const settled = (page, ms = 25000) => until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, ms);

// ---- data and the store, no browser ----
export async function dataChecks({ ok }) {
  // 1. the order and the count
  ok(ORDER_SOUNDS.length >= 42 && ORDER_SOUNDS.slice(0, 17).join('') === 'masitpfondchuglrb' && ORDER_SOUNDS.slice(17, 25).join('') === 'ejwvyzxq', 'order: the first 17 unchanged, then e j w v y z x q appended (World 4 and World 5 follow, test/digraph-docks.mjs and test/blend-bay.mjs)');
  ok(ORDER === ORDER_SOUNDS.join(' ') && PRIOR_ORDERS.includes('m a s i t p f o n d c h u g l r b') && ORDER.startsWith(PRIOR_ORDERS[0] + ' ') && ORDER !== LEGACY_ORDER, 'order: the string the 1.9.33 to 1.9.36 saves carry is a prefix of the new one (so nothing is reset)');
  ok(SOUNDS.join(' ') === ORDER && CUR.lessons.length >= 42 && Object.keys(CUR.sounds).join(' ') === ORDER, 'data: 42 lessons (25 of them before World 4), one sound each, in order');
  ok(CUR.lessons.slice(17, 25).every((L) => L.world === 'W3') && lessonsIn(CUR, 'W3').length === 8 && CUR.worlds[2].name === 'Sunny Hills', 'data: lessons 18 to 25 are World 3, Sunny Hills');
  const UNIT = { 18: '2.9', 19: '2.10', 20: '2.10', 21: '2.10', 22: '2.11', 23: '2.11', 24: '2.11', 25: '2.11' };
  ok(CUR.lessons.slice(17, 25).every((L) => L.unit === UNIT[L.number]), 'data: e is unit 2.9, j w v unit 2.10, y z x qu unit 2.11');
  // 2. the words of each lesson, and decodability proven from scratch
  for (const [n, words] of Object.entries(WORDS)) ok(CUR.lessons[n - 1].sayingSounds.filter((w) => w.showLetters).map((w) => w.word).join(' ') === words, `lesson ${n} (${SOUNDS[n - 1]}): reading words are ${words}`);
  for (const L of CUR.lessons.slice(17, 25)) {
    const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, L.number));
    const read = [...L.sayingSounds.filter((w) => w.showLetters).map((w) => w.word), ...(L.board || []).map((b) => b.word), ...L.quickCheck.options.filter((o) => o.glyph).map((o) => o.glyph)];
    ok(read.length >= 6 && read.every((w) => isReadable(w, taught)), `lesson ${L.number}: every child-read word uses only letters taught by it (${read.join(' ')})`);
    ok(read.every((w) => w.length === 1 || !/q(?!u)/.test(w)), `lesson ${L.number}: a q is always followed by u`);
    ok(CUR.sounds[L.sound].mouth && typeof CUR.sounds[L.sound].mouth.voice === 'boolean' && /Voice (on|off)\.$/.test(CUR.sounds[L.sound].mouth.text), `lesson ${L.number}: Watch My Mouth text for ${L.sound}`);
    ok(L.sayingSounds.every((w) => w.showLetters || w.sayOnly || isReadable(w.word, taught)), `lesson ${L.number}: a picture word is only shown as letters when decodable`);
  }
  const tiles = (k) => CUR.sounds[k].words.map((w) => w.word).join(' ');
  ok(tiles('e') === 'egg hen nest tent' && tiles('j') === 'jet jump' && tiles('w') === 'wagon window worm' && tiles('v') === 'van vest volcano' && tiles('y') === 'yarn yoyo' && tiles('z') === 'zebra zipper zoo' && tiles('x') === 'fox box ox' && tiles('q') === 'quack queen quilt', 'pictures: the tiles of the folders e j w v y z x q, no misleading picture (no red, jam, yellow)');
  ok(CUR.sounds.x.endOnly === true && CUR.sounds.x.startWords.length === 0 && CUR.sounds.x.practice.length === 0 && CUR.sounds.x.words.every((w) => w.word.endsWith('x')), 'x: heard at the end of words, so no start words (fox, box, ox)');
  ok(CUR.lessons[19].middle.length === 5 && CUR.lessons.filter((L) => L.middle.length > 4).length === 1, 'w: one extra game in lesson 20 (its name has no w sound), no other lesson has five');
  ok(CUR.sounds.e.asIn === 'egg' && CUR.sounds.e.hold === true && CUR.sounds.e.parentNote.includes('pin') && CUR.sounds.e.parentNote.includes('pen') && CUR.sounds.e.parentNote.includes('bit') && CUR.sounds.e.parentNote.includes('bet'), 'e: as in egg, the grown-up is told to compare pin/pen and bit/bet');
  ok(CUR.sounds.v.parentNote.includes('f') && CUR.sounds.z.parentNote.includes('s') && CUR.sounds.y.parentNote.includes('yet') && CUR.sounds.y.parentNote.includes('wet'), 'v and z are the buzzing partners of f and s; y is contrasted with w (yet/wet)');
  ok(CUR.sounds.v.mouth.voice === true && CUR.sounds.f.mouth.voice === false && CUR.sounds.z.mouth.voice === true && CUR.sounds.s.mouth.voice === false, 'mouth: v and z voice on, their partners f and s voice off');

  // 3. qu: one unit, two letters, kw-
  ok(JSON.stringify(letterUnits('quit')) === '["q","i","t"]' && JSON.stringify(letterUnits('quiz')) === '["q","i","z"]' && JSON.stringify(letterUnits('quilt')) === '["q","i","l","t"]' && JSON.stringify(letterUnits('up')) === '["u","p"]' && JSON.stringify(letterUnits('cup')) === '["c","u","p"]', 'qu: letterUnits keeps qu as one unit (and only after a q)');
  ok(soundOfLetter('q') === 'q' && soundOfLetter('u') === 'u' && CUR.sounds.q.glyph === 'q' && CUR.sounds.q.sayItLike === 'kw-' && CUR.sounds.q.hold === false, 'qu: key q, glyph drawn as "qu", said kw- (clipped)');
  ok(GLYPHS.q.strokes.length === 4 && GLYPHS.q.minX >= 0 && GLYPHS.q.maxX <= 100 && ['e', 'j', 'w', 'v', 'y', 'z', 'x'].every((k) => GLYPHS[k] && GLYPHS[k].strokes.length >= 1), 'glyphs: every World 3 letter has its strokes, qu is one 100-wide glyph');
  ok(soundText('q', CUR.sounds) === 'kw-' && soundText('x', CUR.sounds) === 'ks-' && slowSounds('quit', CUR.sounds) === 'kw-iiit-' && firstSoundOut('quit', CUR.sounds) === 'kw-it' && soundText('e', CUR.sounds) === 'eee', 'qu: the grown-up reads kw-, ks-, "kw-iiit-" (no isolated u) and "kw-it"');
  ok(CUR.lessons[24].sayingSounds.filter((w) => w.showLetters).every((w) => w.word.startsWith('qu')) && CUR.lessons[24].sayingSounds.at(-1).sayOnly === true, 'qu: three qu words to read, and the queen picture is only said');

  // 4. the stops: every world ends with a Review Stop, Story 3 after lesson 22, level three after lesson 25
  const ck = Object.fromEntries(CUR.checkpoints.map((k) => [k.id, k]));
  ok(CUR.checkpoints.filter((k) => !['b4', 'b5', 'x9', 'x10', 'x11', 'x12', 'v10', 'v11', 'v12', 'v13', 'x13', 'x14', 'v14', 'v15', 'b6'].includes(k.id)).map((k) => `${k.id}:${k.after}`).join() === 'r1:4,b1:4,b2:6,b3:22,x1:9,x2:12,x3:14,x4:17,x5:18,x6:21,x7:22,x8:23,v1:3,v6:6,v2:9,v3:12,v4:15,v5:17,v7:20,v8:23,v9:25', 'stops: ids and places (v1 to v5, r1, b1, b2 never move; Tricky Sounds x1 to x8 sit before the Review Stop of their lesson; v6 after 6; b3 after 22; v7, v8, v9 after 20, 23, 25)');
  const nodes = CUR.lessons.flatMap((l) => [{ lesson: l }, ...CUR.checkpoints.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
  for (const w of ['W1', 'W2', 'W3']) {
    const last = nodes.filter((n) => (n.lesson ? n.lesson.world : n.checkpoint.world) === w).at(-1);
    ok(last.checkpoint && last.checkpoint.kind === 'review', `stops: ${w} ends with a Review Stop (${last.checkpoint ? last.checkpoint.id : 'a lesson'})`);
  }
  ok(nodes.findIndex((n) => n.checkpoint && n.checkpoint.id === 'b2') + 1 === nodes.findIndex((n) => n.checkpoint && n.checkpoint.id === 'v6'), 'stops: after lesson 6 Story 2 comes first, then the Review Stop (the train holds at both)');
  ok(ck.v6.plan.every((a) => a.lesson <= 6) && ck.v7.plan.every((a) => a.lesson <= 20) && ck.v8.plan.every((a) => a.lesson <= 23), 'stops: no review stop shows a sound that is not taught yet');
  ok(ck.v9.mix === 'vowels' && [2, 4, 8, 13, 18].every((n) => ck.v9.plan.some((a) => a.lesson === n)) && ['a', 'i', 'o', 'u', 'e'].every((v) => ck.v9.plan.some((a) => CUR.lessons[a.lesson - 1].sound === v)), 'stops: the last Review Stop has an activity on each short vowel a i o u e');
  ok(ck.b3.kind === 'book' && ck.b3.book === 'book-3' && ck.b3.world === 'W3' && JSON.stringify(ck.b3.needs) === JSON.stringify(ORDER_SOUNDS.slice(0, 22)), 'stops: Story 3 is in World 3, after lesson 22 (y), and needs the sounds up to y');
  ok(CUR.levels.slice(0, 5).map((v) => v.after).join() === '6,17,25,33,42' && CUR.levels[2].car === 'flatbed' && CUR.levels[2].needs.length === 25, 'levels: level three comes after lesson 25 (the end of World 3); levels four and five (Worlds 4 and 5) are tested in test/digraph-docks.mjs and test/blend-bay.mjs');

  // 5. Story 3
  const sight = (BOOK3.sight || []).map((w) => w.toLowerCase());
  const taught22 = lettersOfSounds(ORDER_SOUNDS.slice(0, 22));
  const childWords = BOOK3.pages.flatMap((p) => [p.child, p.slider, ...(p.words || [])].filter(Boolean)).flatMap((t) => t.split(/\s+/)).map((w) => w.replace(/[^a-z]/gi, '').toLowerCase()).filter(Boolean);
  ok(childWords.length >= 10 && childWords.every((w) => sight.includes(w) || isReadable(w, taught22)), `story 3: every word the child reads uses only letters taught by lesson 22 (${[...new Set(childWords)].join(' ')})`);
  ok(sight.join() === 'i' && BOOK3.pages.length >= 8 && BOOK3.pages.length <= 10 && BOOK3.pages.at(-1).kind === 'review', `story 3: ${BOOK3.pages.length} pages, the last one a review, only the heart word I (already in the app)`);
  ok(BOOK3.pages.every((p) => !/\b(he|she|him|his|her)\b/i.test(p.read || '') || !/\{name\}/.test(p.read || '')), 'story 3: the child is called by name, never he or she');
  ok(['jet', 'egg', 'van', 'wet', 'yes'].every((w) => BOOK3.pages.some((p) => p.child === w)) && BOOK3.pages.some((p) => /\bdid\b/.test(p.child || '')), 'story 3: it uses the new sounds j e v w y in the child words');

  // 6. saved progress: the 1.9.33 to 1.9.36 order stays as it is; the legacy mapping still works
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const { createStore } = await import('../js/store.js');
  const open = (save) => { mem.clear(); mem.set('reading.v1', JSON.stringify(save)); return createStore(); };
  const settings = { migrated1912: true, pace4: true, speak0: true, layoutA: true, heartA: true, seenScripts: { ...SEEN, 'lesson:9': true }, trainAt: 7, trainDone: 12, perDay: 4 };
  const old17 = (n, extra = {}) => ({ schema: 1, order: PRIOR_ORDERS[0], lessons: doneL(n), checkpoints: stopsDone(Math.min(n, 17)), settings, levels: { seen: 2, earned: L12 }, worlds: { seen: 'W2' }, character: CHARACTER, firstRunDone: true, lastOpened: '2026-10-12T08:00:00.000Z', savedAt: 1760000000000, ...extra });
  let save = old17(17), s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && Object.keys(s.state.lessons).length === 17, 'saves: a finished Green Valley save keeps lessons 1 to 17 exactly (results, dates, tasks)');
  ok(JSON.stringify(s.state.checkpoints) === JSON.stringify(save.checkpoints) && JSON.stringify(s.state.levels.earned) === JSON.stringify(L12) && s.state.worlds.seen === 'W2' && s.state.character.name === 'Lily', 'saves: its stops, levels, world record and character stay');
  ok(s.settings.trainAt === 7 && s.settings.trainDone === 12 && s.settings.seenScripts['lesson:9'] === true && s.settings.perDay === 4, 'saves: its settings, train position and seen scripts stay (nothing is dropped)');
  ok(s.currentLesson(25) === 18 && s.isDone(17) && !s.isDone(18) && s.isUnlocked(18) && !s.isUnlocked(19), 'saves: lesson 18 (e) is the current lesson, 19 is still locked behind it');
  s.setResult(18, 'got-it');
  ok(JSON.parse(mem.get('reading.v1')).order === ORDER && JSON.parse(mem.get('reading.v1')).lessons[17].result === 'got-it' && JSON.parse(mem.get('reading.v1')).lessons[3].completedAt === save.lessons[3].completedAt, 'saves: the next save writes the new order and keeps every older result');
  save = old17(9, { lessons: { ...doneL(9), 10: { tasksDone: [0, 1, 2], result: 'practice-again' } }, checkpoints: stopsDone(9), levels: { seen: 1, earned: { L1: L12.L1 } }, worlds: { seen: 'W2' } });
  s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.state.lessons[10].tasksDone.join() === '0,1,2' && s.state.lessons[10].result === 'practice-again' && s.currentLesson(25) === 10, 'saves: a save mid-way (lesson 10 half done) keeps its task progress and result, no reset');
  save = { ...old17(17), order: ORDER, lessons: doneL(19) };
  s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.currentLesson(25) === 20, 'saves: a save under the new order is read as it is');
  save = { schema: 1, order: 'm a s i t p f o', lessons: doneL(8), checkpoints: {}, settings, firstRunDone: true, lastOpened: '2026-10-12T08:00:00.000Z' };
  s = open(save);
  ok(Object.keys(s.state.lessons).length === 0, 'saves: an unknown order still starts the lessons again once (the 1.8.1 rule is unchanged)');
  const legacy = { schema: 1, order: LEGACY_ORDER, lessons: doneL(13), checkpoints: {}, settings: { ...settings, trainAt: undefined }, firstRunDone: true, lastOpened: '2026-10-12T08:00:00.000Z' };
  s = open(legacy);
  const doneNums = Object.entries(s.state.lessons).filter(([, l]) => l.result === 'got-it').map(([n]) => Number(n)).sort((a, b) => a - b).join();
  ok(doneNums === '1,2,3,4,5,6,7,9,10,12,14,15,17' && s.currentLesson(25) === 8 && !s.isDone(18), `saves: the legacy 13-lesson order still maps by sound (done ${doneNums}; o is the current lesson)`);
  ok(CUR.checkpoints.filter((k) => k.kind === 'review').every((k) => k.id !== 'v6' || !(s.state.checkpoints.v6 && s.state.checkpoints.v6.result)), 'saves: a stop the child never played (v6) carries no result');
  // a finished 17-lesson child is passed the new World 1 stop: the stop behind them never holds the train
  s = open(old17(17, { checkpoints: { r1: { result: 'got-it' }, b1: { result: 'got-it' }, b2: { result: 'got-it' }, v1: { result: 'got-it' }, v2: { result: 'got-it' }, v3: { result: 'got-it' }, v4: { result: 'got-it' }, v5: { result: 'got-it' } } }));
  ok(s.isCheckpointDone(ck.v6) && s.checkpoint('v6').result === null, 'saves: the new World 1 stop v6 counts as passed for a child past lesson 6, with no result written');
  ok(worldDone(s, CUR, 'W2') && currentWorld(s, CUR).id === 'W3' && !worldDone(s, CUR, 'W3'), 'worlds: Green Valley done, Sunny Hills is now the current world');
  ok(reachedWorlds(s, CUR).map((w) => w.id).join() === 'W1,W2,W3' && previousWorld(CUR, 'W3').id === 'W2' && previousWorld(CUR, 'W2').id === 'W1', 'worlds: W3 can go back to W2, and W2 to W1');
}

// ---- the screens, in the browser ----
export async function screenChecks({ browser, url, ok }) {
  // The crossing from Green Valley into Sunny Hills, like World 1 into Green Valley.
  {
    const crossing = state(17, { migrated1912: true, pace4: true, trainIntroDone: true, trainDone: 17 + 5, trainAt: 9999 }, { lessons: doneL(17), levels: { seen: 2, earned: L12 }, worlds: { seen: 'W2' }, checkpoints: stopsDone(17), character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, PHONE, crossing);
    ok(await until(page, () => !!document.querySelector('.world-card.in') || (window.__train && window.__train.world === 'W2' && window.__train.gate && window.__train.gate.phase), null, 20000), 'crossing: Green Valley is done, so the crossing plays');
    ok(await until(page, () => !!document.querySelector('.world-card.in'), null, 25000), 'crossing: the loading card shows between the two worlds');
    ok((await page.locator('.wg-name').textContent()) === 'Sunny Hills', 'crossing: it names Sunny Hills');
    await page.waitForTimeout(600);
    await page.locator('.world-card .wg-go').click();
    ok(await until(page, () => window.__train && window.__train.world === 'W3' && window.__train.frames > 0, null, 20000), 'crossing: Sunny Hills is built after it');
    const w3 = await page.evaluate(() => ({ stops: window.__train.stopCount, l: window.__train.lessonCount, c: window.__train.checkpointCount, start: window.__train.startTunnel, portal: window.__train.portal, sign: window.__train.signText, theme: window.__train.theme, placeholder: window.__train.placeholder, next: window.__train.nextWorld }));
    ok(w3.stops === 16 && w3.l === 8 && w3.c === 8 && w3.start && w3.portal && w3.sign === 'Digraph Docks' && w3.theme === 'sunny-hills' && !w3.placeholder, `crossing: World 3 has its eight lessons and eight stops (four Tricky Sounds among them), a start tunnel, its own look and a portal to Digraph Docks (${JSON.stringify(w3)})`);
    ok(await settled(page, 40000), 'crossing: the train rolls out and settles');
    const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).worlds.seen);
    ok(seen === 'W3', 'crossing: it is recorded, so it plays once');
    const btns = await page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => b.getAttribute('aria-label') + '|' + b.className.replace(/.*is-/, '')));
    ok(/^Lesson 18/.test(btns[0]) && /current/.test(btns[0]) && btns.filter((b) => b.startsWith('Story 3')).length === 1 && btns.filter((b) => b.startsWith('Review Stop')).length === 3 && btns.filter((b) => b.startsWith('Lesson')).length === 8, `home: Lesson 18 is the current stop; Story 3 and three Review Stops are on the line (${btns.join(', ')})`);
    ok(/Review Stop/.test(btns.at(-1)), 'home: World 3 ends with a Review Stop');
    await page.waitForTimeout(3300);
    await shot(page, 'w3-home');
    ok(errors.length === 0, `crossing: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // The Home of World 3 on a normal visit (the crossing is past), and going back W3 to W2 to W1.
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(19));
    ok(await until(page, () => window.__train && window.__train.world === 'W3' && window.__train.frames > 1, null, 20000), 'visit: the Home opens on World 3');
    ok(await settled(page), 'visit: it settles');
    const before = await page.evaluate(() => localStorage.getItem('reading.v1'));
    const show = async (role) => { await page.evaluate((r) => window.__train.show(r === 'back' ? -5 : window.__train.stopCount - 1), role); await page.waitForTimeout(250); return until(page, (r) => { const b = document.querySelector(`.portal-btn[data-role="${r}"]`); return b && b.dataset.shown === '1'; }, role, 5000); };
    ok(await show('back'), 'visit: the start tunnel of World 3 is a button');
    ok((await page.locator('.portal-btn[data-role="back"]').getAttribute('aria-label')) === 'Back to Green Valley', 'visit: it is labelled "Back to Green Valley"');
    await page.locator('.portal-btn[data-role="back"]').click();
    ok(await until(page, () => window.__train && window.__train.world === 'W2' && window.__train.frames > 0, null, 20000), 'visit: World 2 shows, with its stations done');
    ok(await settled(page), 'visit: World 2 settles');
    ok(await page.evaluate(() => !!document.querySelector('.visit-chip')) && await show('back'), 'visit: in the visit World 2 has its own start tunnel back');
    ok((await page.locator('.portal-btn[data-role="back"]').getAttribute('aria-label')) === 'Back to Starter Station', 'visit: it is labelled "Back to Starter Station"');
    await page.locator('.portal-btn[data-role="back"]').click();
    ok(await until(page, () => window.__train && window.__train.world === 'W1' && window.__train.frames > 0, null, 20000), 'visit: and World 1 shows, three worlds back');
    ok(await settled(page), 'visit: World 1 settles');
    ok(await show('forward') && (await page.locator('.portal-btn[data-role="forward"]').getAttribute('aria-label')) === 'On to Green Valley', 'visit: its end tunnel leads on to Green Valley again');
    ok((await page.evaluate(() => localStorage.getItem('reading.v1'))) === before, 'visit: going back and forth changed nothing in the saved progress');
    // a replayed lesson in the visited world records nothing: Lesson 18 is the current lesson of W3, but World 3 is not visited here; replay World 1's lesson 1
    ok(errors.length === 0, `visit: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // New Sound for e and qu (390x844): the letters are drawn, the grown-up note is there.
  for (const [n, key, note] of [[18, 'e', /pin and pen/], [25, 'q', /kw-/]]) {
    const m = await newPage(browser, PHONE);
    await m.page.addInitScript(SPEECH_STUB);
    await m.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneL(n - 1), settings: { seenScripts: SEEN, trainIntroDone: true, migrated1912: true, pace4: true }, firstRunDone: true })}))`);
    await m.page.goto(url + `#/lesson/${n}/task/1`);
    await m.page.waitForSelector('.new-letter');
    await m.page.waitForTimeout(2600);
    const d = await m.page.evaluate(() => ({ strokes: document.querySelectorAll('.letter-card path.stroke').length, card: document.querySelector('.sound-card') && document.querySelector('.sound-card').textContent, tiles: [...document.querySelectorAll('.word-tile')].map((t) => t.getAttribute('aria-label')), inl: [...document.querySelectorAll('.word-tile')].map((t) => t.querySelectorAll('.ltext svg').length).join(), overflow: document.documentElement.scrollWidth > innerWidth + 1, box: (() => { const r = document.querySelector('.letter-card svg').getBoundingClientRect(); return { x: r.x, r: r.right, w: r.width }; })() }));
    ok(d.strokes === GLYPHS[key].strokes.length && !d.overflow && d.box.x >= 0 && d.box.r <= PHONE.width, `New Sound ${key}: the letter is drawn from its ${GLYPHS[key].strokes.length} strokes and fits (${d.strokes} strokes, width ${Math.round(d.box.w)})`);
    ok(key === 'e' ? /egg/.test(d.card) && d.tiles.join() === 'egg,hen,nest,tent' : /kw-/.test(d.card) && d.tiles.join() === 'quack,queen,quilt', `New Sound ${key}: the card and the picture words (${d.card}; ${d.tiles})`);
    if (key === 'q') ok(d.inl === '4,4,4', `New Sound qu: the picture words draw qu once (quack, queen, quilt are 4 letter shapes each: ${d.inl})`);
    await shot(m.page, `${key === 'e' ? 'e' : 'qu'}-new-sound`);
    ok(m.errors.length === 0, `New Sound ${key}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // qu in Saying Sounds: quit is three units, one of them "qu"; and in the Letter Hunt of lesson 25.
  {
    const m = await newPage(browser, PHONE);
    await m.page.addInitScript(SPEECH_STUB);
    await m.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneL(24), settings: { seenScripts: SEEN, trainIntroDone: true, migrated1912: true, pace4: true }, firstRunDone: true })}))`);
    const tasks = CUR.lessons[24].middle;
    const at = (type) => 1 + 2 + (CUR.lessons[24].heart && CUR.lessons[24].heart.length ? 1 : 0) + tasks.indexOf(type); // review, new sound, mouth, the Heart Word step (lesson 25 teaches does and are), then the middle
    await m.page.goto(url + `#/lesson/25/task/${at('sounds')}`);
    await m.page.waitForSelector('.glyph-letter');
    await m.page.waitForTimeout(1200);
    const g = await m.page.evaluate(() => ({ word: document.querySelector('.word-glyphs') && document.querySelector('.word-glyphs').getAttribute('aria-label'), letters: [...document.querySelectorAll('.word-glyphs .glyph-letter')].map((e) => e.dataset.letter).join(), strokes: [...document.querySelectorAll('.word-glyphs .glyph-letter')][0].querySelectorAll('path.stroke').length }));
    ok(g.word === 'quit' && g.letters === 'q,i,t' && g.strokes === 4, `Saying Sounds: quit is q i t, the q drawn as qu in one letter (${g.letters}, ${g.strokes} strokes)`);
    await shot(m.page, 'qu-saying-sounds');
    await m.page.goto(url + `#/lesson/25/task/${at('hunt')}`);
    await m.page.waitForSelector('.sky-letter', { timeout: 10000 });
    await m.page.waitForTimeout(1500);
    const hh = await m.page.evaluate(() => ({ targets: [...document.querySelectorAll('.sky-letter[data-target="1"]')].map((e) => ({ l: e.dataset.letter, strokes: e.querySelectorAll('path.stroke').length })), find: document.querySelector('.find-card') && document.querySelectorAll('.find-card svg').length, others: [...new Set([...document.querySelectorAll('.sky-letter[data-target="0"]')].map((e) => e.dataset.letter))].join('') }));
    ok(hh.targets.length >= 1 && hh.targets.every((t) => t.l === 'q' && t.strokes === 4) && hh.find === 1 && !hh.others.includes('q') && !hh.others.includes('u') || (hh.targets.length >= 1 && hh.targets.every((t) => t.l === 'q' && t.strokes === 4) && hh.find === 1 && !hh.others.includes('q')), `Letter Hunt: the qu balloons carry the one qu glyph (${JSON.stringify(hh)})`);
    ok(m.errors.length === 0, `qu screens: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Story 3: opens at its stop after lesson 22, the cover and a page.
  {
    const m = await newPage(browser, PHONE);
    await m.page.addInitScript(SPEECH_STUB);
    await m.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneL(22), settings: { seenScripts: SEEN, trainIntroDone: true, migrated1912: true, pace4: true }, firstRunDone: true, character: CHARACTER })}))`);
    await m.page.goto(url + '#/checkpoint/b3');
    await m.page.waitForSelector('.book, .book-cover, .book-page', { timeout: 10000 });
    await m.page.waitForTimeout(1500);
    ok(/Pip and the Sunny Hills|Story 3/.test(await m.page.locator('body').innerText()), 'story 3: the cover names the story');
    await shot(m.page, 'story3-cover');
    const next = m.page.locator('.btn.next, .book-next, button:has-text("Open")').first();
    for (let i = 0; i < 2; i++) { if (await next.count()) { await next.click().catch(() => {}); await m.page.waitForTimeout(900); } }
    await m.page.waitForTimeout(800);
    await shot(m.page, 'story3-page');
    ok(m.errors.length === 0, `story 3: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // The end of World 1: Story 2 and then the Review Stop are the last two stops of the line, and the crossing into Green Valley plays after them.
  {
    const st = state(6, { migrated1912: true, pace4: true, trainIntroDone: true, trainDone: 6, trainAt: 9 }, { lessons: doneL(6), levels: { seen: 1, earned: { L1: L12.L1 } }, worlds: { seen: 'W1' }, checkpoints: {}, character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, PHONE, st);
    ok(await until(page, () => window.__train && window.__train.world === 'W1' && window.__train.frames > 1, null, 20000), 'world 1 end: with lesson 6 done the Home shows World 1 first');
    const t = await page.evaluate(() => ({ stops: window.__train.stopCount, c: window.__train.checkpointCount, btns: [...document.querySelectorAll('.station-btn')].map((b) => b.getAttribute('aria-label')) }));
    ok(t.stops === 11 && t.c === 5 && t.btns.at(-2) === 'Story 2' && t.btns.at(-1) === 'Review Stop', `world 1 end: eleven stops, Story 2 then the Review Stop last (${t.btns.slice(-4).join(', ')})`);
    ok(await until(page, () => !!document.querySelector('.world-card.in'), null, 25000) && (await page.locator('.wg-name').textContent()) === 'Green Valley', 'world 1 end: and the crossing into Green Valley plays');
    ok(errors.length === 0, `world 1 end: no errors ${errors.join(' | ')}`);
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
  console.log(`sunny-hills: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
