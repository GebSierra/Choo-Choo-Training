// World 5, Blend Bay (lessons 34 to 42: st ft, nd mp nt, sp sk, sn sw sm sl, bl cl fl, pl gl, br tr cr, dr fr gr, mixed review; docs/LESSON-REBUILD.md section 15).
// A blend is NOT a new sound: each letter keeps its own sound, so there is no new letter unit and no new taught letter. Data (no browser): the order and the count,
// the words of every lesson and their decodability (letters, digraphs and blends taught by then), blends never joined into one unit, the blend glyphs (two plain letters,
// no bar), the grown-up's notation, Add a Car chains, the stops (Tricky Sounds after 35 and 41, a Review Stop after 38, Story 5 after 40, the end-of-world Review Stop
// after 42), no new heart words, level five, the reading count, Story 5's words, and saved progress under the old 17, 25 and 33-sound orders staying exactly as it was.
// Browser: the Digraph Docks to Blend Bay crossing, the Home of World 5, going back, New Blend, a five-sound word in Saying Sounds at 360x640, Add a Car, Grownups,
// Story 5. Run alone with `node test/blend-bay.mjs [--shots]`; shots go to docs/screenshots/blend-bay/.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN } from './lib.mjs';
import { SPEECH_STUB } from './stubs.mjs';
import { ORDER, ORDER_SOUNDS, PRIOR_ORDERS, BLENDS, spellingsOf, letterUnits, soundOfLetter, lettersOfSounds, isReadable, isReadableBlends, blendSpans, blendPairsIn } from '../js/order.js';
import { GLYPHS } from '../js/glyphs.js';
import { slowSounds } from '../js/scripts.js';
import { tasksFor, soundCardLines } from '../js/lessons.js';
import { countReadable, chipsOf } from '../js/reading-count.js';
import { lessonsIn, worldDone, currentWorld, reachedWorlds, previousWorld } from '../js/worlds.js';
import { openHome, until, state } from './train.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const BOOK5 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/books/book-5.json'), 'utf8'));
const WJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/words-decodable.json'), 'utf8'));
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/blend-bay');
const PHONE = { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 };
const SMALL = { name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 };
const SOUNDS = CUR.lessons.map((L) => L.sound);
const W5L = CUR.lessons.slice(33, 42); // World 6 (Endings Junction) comes after these nine; test/endings-junction.mjs covers it
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };

// The reading words of each new lesson (Saying Sounds); docs/LESSON-REBUILD.md section 15.
const WORDS = { 34: 'lost soft gift', 35: 'hand lamp jump', 36: 'stop spin skip', 37: 'snap swim smash slip', 38: 'block clap flag', 39: 'plan plum glad', 40: 'brush trip crib', 41: 'drop frog grin', 42: 'stamp crust blend frost plant crash think' };
const PAIRS = { 34: 'st ft', 35: 'nd mp nt', 36: 'sp sk', 37: 'sn sw sm sl', 38: 'bl cl fl', 39: 'pl gl', 40: 'br tr cr', 41: 'dr fr gr', 42: 'st mp' };
const doneL = (n, extra = {}) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it', completedAt: `2026-10-${String(i % 28 + 1).padStart(2, '0')}T10:00:00.000Z`, doneAt: 1760000000000 + i, ...extra }]));
const CHARACTER = { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true };
const stopsDone = (n) => Object.fromEntries(CUR.checkpoints.filter((k) => k.after <= n).map((k) => [k.id, { result: 'got-it' }]));
const L12 = { L1: '2026-10-06T10:00:00.000Z', L2: '2026-10-17T10:00:00.000Z' };
const L123 = { ...L12, L3: '2026-10-25T10:00:00.000Z' };
const L1234 = { ...L123, L4: '2026-10-30T10:00:00.000Z' };
const levelsFor = (n) => ({ seen: n >= 42 ? 5 : n >= 33 ? 4 : n >= 25 ? 3 : n >= 17 ? 2 : n >= 6 ? 1 : 0, earned: n >= 42 ? { ...L1234, L5: '2026-11-05T10:00:00.000Z' } : n >= 33 ? L1234 : n >= 25 ? L123 : n >= 17 ? L12 : n >= 6 ? { L1: L12.L1 } : {} });
const world = (n) => CUR.lessons.find((l) => l.number === Math.min(n + 1, 42)).world;
const seed = (n, settings = {}, extra = {}) => state(n, { migrated1912: true, pace4: true, trainIntroDone: true, ...settings }, { lessons: doneL(n), levels: levelsFor(n), worlds: { seen: world(n) }, checkpoints: stopsDone(n), character: CHARACTER, meetDue: false, ...extra });
const settled = (page, ms = 25000) => until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, ms);
const at = (n, type) => tasksFor(CUR.lessons[n - 1]).find((t) => t.type === type).index;
const seedPage = async (m, n, extra = {}) => { await m.page.addInitScript(SPEECH_STUB); await m.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneL(n), settings: { seenScripts: SEEN, trainIntroDone: true, migrated1912: true, pace4: true }, firstRunDone: true, character: CHARACTER, ...extra })}))`); };

// ---- data and the store, no browser ----
export async function dataChecks({ ok }) {
  // 1. the order and the count
  ok(ORDER_SOUNDS.length >= 42 && ORDER_SOUNDS.slice(0, 33).join(' ') === 'm a s i t p f o n d c h u g l r b e j w v y z x q sh ch th ck ff wh ng nk' && ORDER_SOUNDS.slice(33, 42).join(' ') === 'st nd sp sn bl pl br dr mix', 'order: 42 sounds, the first 33 unchanged, the nine blend lessons appended');
  ok(ORDER === ORDER_SOUNDS.join(' ') && PRIOR_ORDERS.length >= 3 && PRIOR_ORDERS[2] === ORDER_SOUNDS.slice(0, 33).join(' ') && ORDER.startsWith(PRIOR_ORDERS[2] + ' ') && ORDER.startsWith(PRIOR_ORDERS[1] + ' ') && ORDER.startsWith(PRIOR_ORDERS[0] + ' '), 'order: the 17, 25 and 33-sound strings are prefixes of the current one (PRIOR_ORDERS)');
  ok(SOUNDS.join(' ') === ORDER && CUR.lessons.length >= 42 && Object.keys(CUR.sounds).join(' ') === ORDER, 'data: the 42 lessons of Worlds 1 to 5 (and any after them), one key each, in order');
  ok(W5L.every((L) => L.world === 'W5' && L.blend === true) && lessonsIn(CUR, 'W5').length === 9 && CUR.worlds[4].name === 'Blend Bay' && CUR.lessons.slice(0, 33).every((L) => !L.blend), 'data: lessons 34 to 42 are World 5, Blend Bay, and the only blend lessons');
  const UNIT = { 34: '4.1', 35: '4.1', 36: '4.2', 37: '4.2', 38: '4.3', 39: '4.3', 40: '4.4', 41: '4.4', 42: '4.5' };
  ok(W5L.every((L) => L.unit === UNIT[L.number]) && CUR.units.filter((u) => u.stage === 4).map((u) => u.id).join() === '4.1,4.2,4.3,4.4,4.5', 'data: units 4.1 to 4.5 (ending blends, s-blends, l-blends, r-blends, mixed review)');
  ok(Object.entries(PAIRS).every(([n, p]) => spellingsOf(CUR.lessons[n - 1].sound).join(' ') === p) && Object.values(BLENDS).flat().length === 22, 'order: each blend lesson lists its pairs (22 pairs in all: st ft nd mp nt sp sk sn sw sm sl bl cl fl pl gl br tr cr dr fr gr)');
  ok(W5L.every((L) => CUR.sounds[L.sound].blend === true && CUR.sounds[L.sound].clip === null && CUR.sounds[L.sound].pairs.map((p) => p.g).join(' ') === PAIRS[L.number]), 'data: every blend sound lists its pairs with the grown-up notation and has no recording (the grown-up says it)');
  // 2. the words of each lesson, and decodability proven from scratch
  for (const [n, words] of Object.entries(WORDS)) ok(CUR.lessons[n - 1].sayingSounds.filter((w) => w.showLetters).map((w) => w.word).join(' ') === words, `lesson ${n} (${SOUNDS[n - 1]}): reading words are ${words}`);
  for (const L of W5L) {
    const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, L.number));
    const read = [...L.sayingSounds.filter((w) => w.showLetters).map((w) => w.word), ...(L.chains || []).flatMap((c) => [c.from, c.to])];
    ok(read.length >= 6 && read.every((w) => isReadableBlends(w, taught)), `lesson ${L.number}: every child-read word uses only letters, digraphs and blends taught by it (${read.join(' ')})`);
    ok(L.sayingSounds.every((w) => w.showLetters || w.sayOnly || isReadable(w.word, taught)), `lesson ${L.number}: a picture word is only shown as letters when decodable`);
    const m = CUR.sounds[L.sound].mouth;
    ok(m && typeof m.voice === 'boolean' && /Voice (on|off)\.$/.test(m.text) && m.text.length <= 120, `lesson ${L.number}: Watch My Mouth text for ${L.sound}`);
    ok(letterUnits(L.sayingSounds[0].word, L.number).every((u) => u.length === 1 || ['sh', 'ch', 'th', 'ck', 'ng', 'nk', 'wh', 'ff', 'll', 'ss', 'zz'].includes(u)), `lesson ${L.number}: a blend is never joined into one unit`);
    ok(!(L.heart || []).length, `lesson ${L.number}: no new heart word (the curriculum lists none for 4.x)`);
    ok(L.middle.includes('sounds') && L.middle.includes('writing') && L.middle.includes('chains') && !L.middle.includes('board') && !L.middle.includes('signals'), `lesson ${L.number}: the middle is ${L.middle.join()} (Add a Car instead of the Station Board)`);
    const tasks = tasksFor(L);
    ok(tasks[1].name === 'New Blend' && tasks.at(-1).type === 'check' && tasks.at(-2).type === 'practice', `lesson ${L.number}: New Blend opens it, Practicing Words and Ticket Check close it`);
  }
  const at33 = lettersOfSounds(ORDER_SOUNDS.slice(0, 33)), before = lettersOfSounds(ORDER_SOUNDS.slice(0, 35));
  ok(isReadable('stop', at33) && !isReadableBlends('stop', at33) && isReadableBlends('last', before) && !isReadableBlends('stop', lettersOfSounds(ORDER_SOUNDS.slice(0, 33))) && isReadableBlends('sand', before) && !isReadableBlends('snap', before) && isReadableBlends('snap', lettersOfSounds(ORDER_SOUNDS.slice(0, 37))), 'decodable: letters alone read stop at lesson 33, but a blend is counted as taught only from its lesson (last at 34, sand at 35, snap at 37)');
  ok(blendPairsIn('stamp').join() === 'st,mp' && blendPairsIn('ship').length === 0 && blendPairsIn('think').length === 0 && blendPairsIn('crash').join() === 'cr' && blendPairsIn('flesh').join() === 'fl', 'blends: found in the written word, never inside a digraph (stamp st mp, crash cr, ship and think none)');
  ok(JSON.stringify(blendSpans('stamp', 42)) === '[{"at":0,"len":2},{"at":3,"len":2}]' && blendSpans('sand', 34).length === 0 && blendSpans('sand', 35).length === 1, 'blends: the highlight spans follow the lessons taught (sand has none at 34, one at 35)');
  const U = (w, n) => JSON.stringify(letterUnits(w, n));
  ok(U('stamp', 42) === '["s","t","a","m","p"]' && U('crash', 42) === '["c","r","a","sh"]' && U('think', 42) === '["th","i","nk"]' && U('stop', 36) === '["s","t","o","p"]', 'units: blends stay two letters; digraphs stay one unit (crash is c r a sh)');
  // 3. the blend glyphs: two plain letters side by side, no bar
  for (const p of Object.values(BLENDS).flat()) ok(GLYPHS[p] && GLYPHS[p].strokes.length === GLYPHS[p[0]].strokes.length + GLYPHS[p[1]].strokes.length && !GLYPHS[p].link && GLYPHS[p].blend === true && GLYPHS[p].minX >= 0 && GLYPHS[p].maxX <= 100, `glyphs: ${p} is two plain letters (${GLYPHS[p] && GLYPHS[p].strokes.length} strokes, no bar, inside the box)`);
  ok(GLYPHS.sh.link && !GLYPHS.st.link, 'glyphs: a digraph has its bar, a blend does not (each letter keeps its own sound)');
  ok(soundOfLetter('ft') === 'st' && soundOfLetter('sk') === 'sp' && soundOfLetter('tr') === 'br' && soundOfLetter('mp') === 'nd' && soundOfLetter('k') === 'c', 'units: each pair belongs to its lesson key; the old keys are untouched');
  // 4. the grown-up's notation (a held first sound is stretched, two short sounds glide; never a letter name, never the phone's voice)
  const say = (k, g) => CUR.sounds[k].pairs.find((p) => p.g === g).say;
  ok(say('st', 'st') === 'ssst-' && say('st', 'ft') === 'ffft-' && say('nd', 'mp') === 'mmmp-' && say('sn', 'sn') === 'sssnnn' && say('sn', 'sm') === 'sssmmm' && say('bl', 'cl') === 'cl-' && say('br', 'tr') === 'tr-' && say('dr', 'gr') === 'gr-', 'notation: ssst- ffft- mmmp- sssnnn sssmmm cl- tr- gr-');
  ok(W5L.every((L) => soundCardLines(CUR.sounds[L.sound])[0].startsWith('Each letter keeps its sound. Glide them together: ')), 'cards: the sound card says each letter keeps its sound and the blend is a glide');
  ok(slowSounds('stop', CUR.sounds) === 'ssst-ooop-' && !/uh/.test(CUR.sounds.st.howTo.replace('Do not add uh', '')), 'scripts: stop is said ssst-ooop- (the s held, then glide); no uh');
  ok(W5L.every((L) => L.quickCheck.gist.length <= 28 && L.quickCheck.kind === 'letter' && L.quickCheck.options.length === 3 && L.quickCheck.options.filter((o) => o.correct).length === 1), 'Ticket Check: a letter question, three cards, one right, the grown-up gist at most 28 characters');
  // 5. Add a Car: one letter car makes a new word
  for (const L of W5L) {
    const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, L.number));
    ok(L.chains.length >= 4 && L.chains.every((c) => {
      const a = letterUnits(c.from, L.number), b = letterUnits(c.to, L.number);
      return b.length === a.length + 1 && b[c.at] === c.letter && [...b.slice(0, c.at), ...b.slice(c.at + 1)].join('') === a.join('') && c.options.length === 3 && new Set(c.options).size === 3 && c.options[0] === c.letter && b.length <= 5 && isReadableBlends(c.to, taught) && blendPairsIn(c.to).length >= 1;
    }), `lesson ${L.number}: ${L.chains.length} Add a Car chains, each one added letter, three distinct cars, the new word uses a blend (${L.chains.map((c) => c.from + '>' + c.to).join(' ')})`);
  }
  const known = new Set([...WJ.words, ...WJ.blendWords]);
  ok(W5L.every((L) => L.chains.every((c) => c.options.slice(1).every((o) => !known.has([...letterUnits(c.from, L.number).slice(0, c.at), o, ...letterUnits(c.from, L.number).slice(c.at)].join(''))))), 'chains: a wrong car never makes a word of the list');
  ok(['top>stop', 'sad>sand', 'cap>camp', 'sap>snap'].every((x) => W5L.some((L) => L.chains.some((c) => `${c.from}>${c.to}` === x))), 'chains: top stop, sad sand, cap camp and sap snap are in');
  // 6. stops
  const ck = Object.fromEntries(CUR.checkpoints.map((k) => [k.id, k]));
  ok(CUR.checkpoints.filter((k) => k.after <= 42).map((k) => `${k.id}:${k.after}`).join() === 'r1:4,b1:4,b2:6,b3:22,b4:31,b5:40,x1:9,x2:12,x3:14,x4:17,x5:18,x6:21,x7:22,x8:23,x9:27,x10:28,x11:35,x12:41,v1:3,v6:6,v2:9,v3:12,v4:15,v5:17,v7:20,v8:23,v9:25,v10:30,v11:33,v12:38,v13:42', 'stops: ids and places (older ids never renumbered)');
  const nodes = CUR.lessons.flatMap((l) => [{ lesson: l }, ...CUR.checkpoints.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
  for (const w of ['W1', 'W2', 'W3', 'W4', 'W5']) {
    const last = nodes.filter((n) => (n.lesson ? n.lesson.world : n.checkpoint.world) === w).at(-1);
    ok(last.checkpoint && last.checkpoint.kind === 'review', `stops: ${w} ends with a Review Stop (${last.checkpoint ? last.checkpoint.id : 'a lesson'})`);
  }
  ok(ck.x11.kind === 'contrast' && ck.x11.mode === 'ends' && ck.x11.pair.join() === 'nd,d' && ck.x11.pairs.map((p) => `${p.a}/${p.b}`).join() === 'sand/sad,camp/cap,bent/bet,lamp/lap' && ck.x11.world === 'W5', 'Tricky Sounds x11 (after 35): with and without the melted n or m, sand/sad, camp/cap, bent/bet, lamp/lap');
  ok(ck.x12.kind === 'contrast' && ck.x12.pair.join() === 'bl,br' && ck.x12.pairs.map((p) => `${p.a}/${p.b}`).join() === 'blush/brush,bled/bred,blink/brink' && ck.x12.world === 'W5', 'Tricky Sounds x12 (after 41): bl against br (l and r are the classic mix-up), blush/brush, bled/bred, blink/brink');
  for (const id of ['x11', 'x12']) ok(ck[id].plan.map((a) => a.task).join() === 'tunnels,which,signals,check' && ck[id].sides.every((s) => s.words.every((w) => isReadableBlends(w, lettersOfSounds(ORDER_SOUNDS.slice(0, ck[id].after))))), `Tricky Sounds ${id}: the same four steps, every word decodable by lesson ${ck[id].after}`);
  ok(ck.v12.kind === 'review' && ck.v12.after === 38 && ck.v12.plan.every((a) => a.lesson <= 38) && ck.v12.plan.at(-1).task === 'check' && ck.v12.plan.some((a) => a.task === 'chains') && ck.v12.world === 'W5', 'Review Stop v12 (after 38, the middle of the world): nothing past lesson 38 shows');
  ok(ck.v13.mix === 'blends' && ck.v13.after === 42 && [41, 40, 39, 38].every((n) => ck.v13.plan.some((a) => a.lesson === n)) && ck.v13.plan.at(-1).task === 'check' && ck.v13.world === 'W5', 'Review Stop v13 (after 42, the end of the world): mixes every blend family, Ticket Check last');
  ok(ck.v11.summary.words === 337 && ck.v11.summary.sounds === 33 && !('blends' in ck.v11.summary) && ck.v12.summary.sounds === 33 && ck.v12.summary.blends === 14 && ck.v13.summary.blends === 22 && ck.v13.summary.words > ck.v12.summary.words && ck.v12.summary.words > ck.v11.summary.words, `Review Stops: a blend is not a sound (33 sounds, 14 then 22 blends), the word count grows (${ck.v11.summary.words}, ${ck.v12.summary.words}, ${ck.v13.summary.words})`);
  ok(ck.b5.kind === 'book' && ck.b5.book === 'book-5' && ck.b5.world === 'W5' && ck.b5.after === 40 && JSON.stringify(ck.b5.needs) === JSON.stringify(ORDER_SOUNDS.slice(0, 40)), 'stops: Story 5 is in World 5, after lesson 40 (br tr cr)');
  // 7. levels, counts
  ok(CUR.levels.slice(0, 5).map((v) => v.after).join() === '6,17,25,33,42' && CUR.levels[4].car === 'dome' && CUR.levels[4].needs.length === 42, 'levels: level five (dome) comes after lesson 42, the placeholder is gone');
  const words = [...WJ.words, ...WJ.blendWords]; words.blend = new Set(WJ.blendWords);
  const cnt = (n) => countReadable(words, ORDER_SOUNDS.slice(0, n));
  ok(cnt(33) === 337 && cnt(34) > cnt(33) && cnt(35) > cnt(34) && cnt(42) > cnt(38) && cnt(42) === ck.v13.summary.words && cnt(38) === ck.v12.summary.words, `reading count: Can read N words grows with the blend words (${cnt(33)}, ${cnt(34)}, ${cnt(35)}, ${cnt(38)}, ${cnt(42)})`);
  ok(WJ.blendWords.length >= 150 && WJ.blendWords.every((w) => !WJ.words.includes(w) && isReadableBlends(w, lettersOfSounds(ORDER_SOUNDS)) && blendPairsIn(w).length >= 1), `words: ${WJ.blendWords.length} World 5 words, each readable and each with a blend`);
  ok(chipsOf(['m', 'st', 'nd', 'mix']).join('|') === 'm|st ft|nd mp nt', 'chips: a blend lesson is one chip listing its pairs (the mixed review has none)');
  // 8. Story 5 (DRAFT, owner approves the text)
  const taught40 = lettersOfSounds(ORDER_SOUNDS.slice(0, 40)), hearts40 = CUR.lessons.slice(0, 40).flatMap((L) => L.heart || []).map((w) => w.toLowerCase());
  const childWords = BOOK5.pages.flatMap((p) => [p.child, p.slider, ...(p.words || [])].filter(Boolean)).flatMap((t) => t.split(/\s+/)).map((w) => w.replace(/[^a-z]/gi, '').toLowerCase()).filter(Boolean);
  ok(childWords.length >= 10 && childWords.every((w) => hearts40.includes(w) || isReadableBlends(w, taught40)), `story 5: every word the child reads uses only letters, digraphs and blends taught by lesson 40 (${[...new Set(childWords)].join(' ')})`);
  ok(BOOK5.pages.length >= 8 && BOOK5.pages.length <= 10 && BOOK5.pages.at(-1).kind === 'review' && BOOK5.pages.filter((p) => p.child).every((p) => p.child.split(' ').length === 1) && BOOK5.draft === true, `story 5: ${BOOK5.pages.length} pages, one word to read on a page, the last a review, marked DRAFT`);
  ok(['sand', 'crab', 'swim', 'flag', 'clap', 'trip', 'stop'].every((w) => BOOK5.pages.some((p) => p.child === w)) && BOOK5.pages.every((p) => !p.child || blendPairsIn(p.child).length >= 1) && BOOK5.pages.some((p) => /Pip/.test(p.read || '')) && BOOK5.pages.some((p) => /Sam/.test(p.read || '')) && BOOK5.pages.some((p) => /\{name\}/.test(p.read || '')), 'story 5: seven blend words (sand crab swim flag clap trip stop), Pip, {name} and Sam');
  ok(BOOK5.pages.every((p) => !/\{name\}/.test(p.read || '') || !/\b(he|she|him|his|her)\b/i.test((p.read || '').split('{name}')[1] || '')), 'story 5: the child is called by name, never he or she');
  ok(JSON.stringify(BOOK5.needs) === JSON.stringify(ORDER_SOUNDS.slice(0, 40)), 'story 5: needs the sounds up to lesson 40');

  // 9. saved progress: the old orders stay exactly as they were
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const { createStore } = await import('../js/store.js');
  const open = (save) => { mem.clear(); mem.set('reading.v1', JSON.stringify(save)); return createStore(); };
  const settings = { migrated1912: true, pace4: true, speak0: true, layoutA: true, heartA: true, seenScripts: { ...SEEN, 'lesson:9': true }, trainAt: 7, trainDone: 12, perDay: 4 };
  const old = (order, n, extra = {}) => ({ schema: 1, order, lessons: doneL(n), checkpoints: stopsDone(Math.min(n, 33)), settings, levels: { seen: 4, earned: L1234 }, worlds: { seen: 'W4' }, character: CHARACTER, firstRunDone: true, lastOpened: '2026-10-12T08:00:00.000Z', savedAt: 1760000000000, ...extra });
  let save = old(PRIOR_ORDERS[2], 33), s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && Object.keys(s.state.lessons).length === 33, 'saves: a finished Digraph Docks save keeps lessons 1 to 33 exactly (results, dates, tasks)');
  ok(JSON.stringify(s.state.checkpoints) === JSON.stringify(save.checkpoints) && JSON.stringify(s.state.levels.earned) === JSON.stringify(L1234) && s.state.worlds.seen === 'W4' && s.state.character.name === 'Lily', 'saves: its stops, levels, world record and character stay');
  ok(s.settings.trainAt === 7 && s.settings.trainDone === 12 && s.settings.seenScripts['lesson:9'] === true && s.settings.perDay === 4, 'saves: its settings, train position and seen scripts stay (nothing is dropped)');
  ok(s.currentLesson(42) === 34 && s.isDone(33) && !s.isDone(34) && s.isUnlocked(34) && !s.isUnlocked(35), 'saves: lesson 34 (st ft) is the current lesson, 35 is still locked behind it');
  s.setResult(34, 'got-it');
  ok(JSON.parse(mem.get('reading.v1')).order === ORDER && JSON.parse(mem.get('reading.v1')).lessons[33].result === 'got-it' && JSON.parse(mem.get('reading.v1')).lessons[3].completedAt === save.lessons[3].completedAt, 'saves: the next save writes the new order and keeps every older result');
  for (const [prior, n] of [[PRIOR_ORDERS[1], 25], [PRIOR_ORDERS[0], 17]]) {
    save = old(prior, n, { checkpoints: stopsDone(n), levels: { seen: 3, earned: L123 }, worlds: { seen: 'W3' } });
    s = open(save);
    ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.currentLesson(42) === n + 1 && s.isDone(n), `saves: a save under the ${n}-sound order is still read as it is (lesson ${n + 1} is next)`);
  }
  save = old(PRIOR_ORDERS[2], 33, { lessons: { ...doneL(33), 34: { tasksDone: [0, 1, 2], result: 'practice-again' } }, worlds: { seen: 'W5' } });
  s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.state.lessons[34].tasksDone.join() === '0,1,2' && s.currentLesson(42) === 34, 'saves: a save mid-way (lesson 34 half done) keeps its task progress and result, no reset');
  save = { ...old(PRIOR_ORDERS[2], 33), order: ORDER, lessons: doneL(36) };
  s = open(save);
  ok(JSON.stringify(s.state.lessons) === JSON.stringify(save.lessons) && s.currentLesson(42) === 37, 'saves: a save under the new order is read as it is');
  s = open(old(PRIOR_ORDERS[2], 33));
  ok(!s.isCheckpointDone(ck.x11) && !s.isCheckpointDone(ck.v13) && worldDone(s, CUR, 'W4') && currentWorld(s, CUR).id === 'W5' && !worldDone(s, CUR, 'W5'), 'worlds: Digraph Docks done, Blend Bay is now the current world; its stops are not yet done');
  s = open(old(PRIOR_ORDERS[2], 33, { lessons: doneL(40), checkpoints: stopsDone(40) }));
  ok(s.isCheckpointDone(ck.x11) && s.isCheckpointDone(ck.v12) && s.isCheckpointDone(ck.b5) && !s.isCheckpointDone(ck.x12) && !s.isCheckpointDone(ck.v13), 'stops: a child past a stop counts it as passed; the ones ahead are still ahead');
  ok(reachedWorlds(s, CUR).map((w) => w.id).join() === 'W1,W2,W3,W4,W5' && previousWorld(CUR, 'W5').id === 'W4' && previousWorld(CUR, 'W4').id === 'W3', 'worlds: W5 can go back to W4, W4 to W3 and so on');
}

// ---- the screens, in the browser ----
export async function screenChecks({ browser, url, ok }) {
  // The crossing from Digraph Docks into Blend Bay.
  {
    const crossing = state(33, { migrated1912: true, pace4: true, trainIntroDone: true, trainDone: 33 + 5, trainAt: 9999 }, { lessons: doneL(33), levels: { seen: 4, earned: L1234 }, worlds: { seen: 'W4' }, checkpoints: stopsDone(33), character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, PHONE, crossing);
    ok(await until(page, () => !!document.querySelector('.world-card.in') || (window.__train && window.__train.world === 'W4' && window.__train.gate && window.__train.gate.phase), null, 20000), 'crossing: Digraph Docks is done, so the crossing plays');
    ok(await until(page, () => !!document.querySelector('.world-card.in'), null, 25000), 'crossing: the loading card shows between the two worlds');
    ok((await page.locator('.wg-name').textContent()) === 'Blend Bay', 'crossing: it names Blend Bay');
    await page.waitForTimeout(600);
    await page.locator('.world-card .wg-go').click();
    ok(await until(page, () => window.__train && window.__train.world === 'W5' && window.__train.frames > 0, null, 20000), 'crossing: Blend Bay is built after it');
    const w5 = await page.evaluate(() => ({ stops: window.__train.stopCount, l: window.__train.lessonCount, c: window.__train.checkpointCount, start: window.__train.startTunnel, portal: window.__train.portal, sign: window.__train.signText, theme: window.__train.theme, placeholder: window.__train.placeholder }));
    ok(w5.stops === 14 && w5.l === 9 && w5.c === 5 && w5.start && w5.portal && w5.sign === 'Endings Junction', `crossing: World 5 has its nine lessons and five stops (two Tricky Sounds, Story 5, two Review Stops), a start tunnel and a portal to Endings Junction (${JSON.stringify(w5)})`);
    ok(await settled(page, 40000), 'crossing: the train rolls out and settles');
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).worlds.seen)) === 'W5', 'crossing: it is recorded, so it plays once');
    const btns = await page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => b.getAttribute('aria-label') + '|' + b.className.replace(/.*is-/, '')));
    ok(/^Lesson 34/.test(btns[0]) && /current/.test(btns[0]) && btns.filter((b) => b.startsWith('Story 5')).length === 1 && btns.filter((b) => b.startsWith('Review Stop')).length === 2 && btns.filter((b) => b.startsWith('Tricky Sounds')).length === 2 && btns.filter((b) => b.startsWith('Lesson')).length === 9, `home: Lesson 34 is the current stop; Story 5, two Review Stops, two Tricky Sounds and nine lessons (${btns.join(' ; ')})`);
    ok(/Review Stop/.test(btns.at(-1)), 'home: World 5 ends with a Review Stop');
    await page.waitForTimeout(3300);
    await shot(page, 'w5-home');
    ok(errors.length === 0, `crossing: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // The Home of World 5 on a normal visit, and going back W5 to W4 to W3.
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(35));
    ok(await until(page, () => window.__train && window.__train.world === 'W5' && window.__train.frames > 1, null, 20000), 'visit: the Home opens on World 5');
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
    await goBack('W4', 'Digraph Docks');
    await goBack('W3', 'Sunny Hills');
    ok(await show('forward') && (await page.locator('.portal-btn[data-role="forward"]').getAttribute('aria-label')) === 'On to Digraph Docks', 'visit: its end tunnel leads on to Digraph Docks again');
    ok((await page.evaluate(() => localStorage.getItem('reading.v1'))) === before, 'visit: going back and forth changed nothing in the saved progress');
    ok(errors.length === 0, `visit: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // New Blend (lesson 34 and 35, 390x844): two plain letters (no bar), a card that says each letter keeps its sound, the tiles and the grown-up gist.
  for (const [n, pairs, rows, tiles] of [[34, ['st', 'ft'], ['ssst-', 'ffft-'], 'nest,vest'], [35, ['nd', 'mp', 'nt'], ['nnnd-', 'mmmp-', 'nnnt-'], 'tent,hand,jump']]) {
    const m = await newPage(browser, PHONE);
    await seedPage(m, n - 1);
    await m.page.goto(url + `#/lesson/${n}/task/1`);
    await m.page.waitForSelector('.new-letter');
    await m.page.waitForTimeout(2800);
    const d = await m.page.evaluate(() => ({ title: document.querySelector('.task-title, .shell-title, h1') && document.querySelector('.task-title, .shell-title, h1').textContent, cards: [...document.querySelectorAll('.letter-card svg.glyph')].map((g) => ({ strokes: g.querySelectorAll('path.stroke').length, links: g.querySelectorAll('path.glyph-link').length })), rows: [...document.querySelectorAll('.blend-rows li')].map((li) => li.textContent), card: document.querySelector('.blend-card') && document.querySelector('.blend-card').textContent, tiles: [...document.querySelectorAll('.word-tile')].map((t) => t.getAttribute('aria-label')), overflow: document.documentElement.scrollWidth > innerWidth, gist: (document.querySelector('.script-gist, .gist, [data-gist]') || {}).textContent || '' }));
    ok(d.cards.length === pairs.length && d.cards.every((c, i) => c.strokes === GLYPHS[pairs[i]].strokes.length && c.links === 0) && !d.overflow, `New Blend ${n}: the pairs ${pairs.join(' ')} are drawn as plain letters with no bar (${JSON.stringify(d.cards)})`);
    ok(/Each letter keeps its own sound/.test(d.card) && rows.every((r, i) => d.rows[i] && d.rows[i].includes(r)) && d.tiles.join() === tiles, `New Blend ${n}: the card says each letter keeps its sound and lists ${rows.join(' ')} (${d.rows.join(' | ')}; tiles ${d.tiles})`);
    ok(/New Blend/.test(await m.page.locator('body').innerText()), `New Blend ${n}: the step is called New Blend`);
    await shot(m.page, `new-blend-${n}`);
    ok(m.errors.length === 0, `New Blend ${n}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Saying Sounds: the blend is drawn under one soft bracket; a five-sound word fits at 360x640 (lesson 42: stamp, crust, blend, frost, plant).
  for (const [vp, n, word, marks, name] of [[PHONE, 36, 'stop', 1, 'stop-saying-sounds'], [SMALL, 42, 'stamp', 2, 'stamp-saying-sounds-360']]) {
    const m = await newPage(browser, vp);
    await seedPage(m, n - 1);
    await m.page.goto(url + `#/lesson/${n}/task/${at(n, 'sounds')}`);
    await m.page.waitForSelector('.glyph-letter');
    await m.page.waitForTimeout(1200);
    const g = await m.page.evaluate(() => { const s = document.querySelector('.word-glyphs'), r = s.getBoundingClientRect(); return { word: s.getAttribute('aria-label'), letters: [...s.querySelectorAll('.glyph-letter')].map((e) => e.dataset.letter).join(), marks: s.querySelectorAll('path.blend-mark').length, inBlend: s.querySelectorAll('.glyph-letter.in-blend').length, links: s.querySelectorAll('path.glyph-link').length, box: { x: r.x, r: r.right, w: r.width, h: r.height }, overflow: document.documentElement.scrollWidth > innerWidth, gist: document.body.innerText.includes('Next word') }; });
    ok(g.word === CUR.lessons[n - 1].sayingSounds[0].word && g.letters.replace(/,/g, '') === word && g.marks === marks && g.inBlend === marks * 2 && g.links === 0, `Saying Sounds (lesson ${n}): ${g.word} is drawn letter by letter with ${marks} blend bracket(s) (${g.letters}, ${g.marks} brackets, ${g.links} bars)`);
    ok(g.box.x >= 0 && g.box.r <= vp.width && !g.overflow, `Saying Sounds (lesson ${n}) at ${vp.name}: the word fits (x ${Math.round(g.box.x)} to ${Math.round(g.box.r)}, width ${Math.round(g.box.w)})`);
    if (n === 42) {
      for (const w of ['crust', 'blend', 'frost', 'plant']) {
        await m.page.getByText('Next word').click();
        await m.page.waitForTimeout(500);
        const f = await m.page.evaluate(() => { const s = document.querySelector('.word-glyphs'), r = s.getBoundingClientRect(); return { word: s.getAttribute('aria-label'), units: s.querySelectorAll('.glyph-letter').length, x: r.x, r: r.right }; });
        ok(f.word === w && f.units === 5 && f.x >= 0 && f.r <= vp.width, `Saying Sounds (lesson 42): ${w} is a five-sound word and fits 360x640 (${f.units} letters, ${Math.round(f.x)} to ${Math.round(f.r)})`);
      }
    }
    await shot(m.page, name);
    ok(m.errors.length === 0, `Saying Sounds ${n}: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Add a Car: the grown-up's words, a gap, three letter cars, a wrong car does nothing, the right car couples in, the new word shows its blend, nothing plays on its own.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 35);
    await m.page.goto(url + `#/lesson/36/task/${at(36, 'chains')}`);
    await m.page.waitForSelector('.chains-game .chain-car.gap', { timeout: 10000 });
    await m.page.waitForTimeout(900);
    const first = CUR.lessons[35].chains[0];
    const d = await m.page.evaluate(() => ({ cars: [...document.querySelectorAll('.chain-track .chain-car')].map((c) => c.dataset.letter || '+'), choices: [...document.querySelectorAll('.chain-choices .chain-car')].map((c) => c.dataset.letter), prompt: document.querySelector('.say-prompt').textContent, events: window.__events ? window.__events.length : 0, overflow: document.documentElement.scrollWidth > innerWidth }));
    ok(d.cars.join('') === (first.from.slice(0, first.at) + '+' + first.from.slice(first.at)) && d.choices.length === 3 && d.choices.includes(first.letter) && new RegExp(`${first.from}.*${first.to}`).test(d.prompt) && !d.overflow, `Add a Car: ${first.from} with a gap, three cars, the prompt names ${first.to} (${d.cars.join('')}; ${d.choices}; ${d.prompt})`);
    ok(d.events === 0, 'Add a Car: nothing plays on its own');
    const wrong = d.choices.find((c) => c !== first.letter);
    await m.page.locator(`.chain-choices .chain-car[data-letter="${wrong}"]`).click();
    await m.page.waitForTimeout(300);
    ok((await m.page.locator('.chain-track .chain-car.gap').count()) === 1 && (await m.page.locator('.chains-game').getAttribute('data-round')) === '0', 'Add a Car: a wrong car does nothing (the gap stays)');
    await shot(m.page, 'add-a-car');
    for (let r = 0; r < 4; r++) {
      const c = CUR.lessons[35].chains[r];
      await m.page.waitForFunction((to) => document.querySelector('.chains-game').dataset.word === to && document.querySelector('.chain-track .chain-car.gap'), c.to, { timeout: 5000 });
      await m.page.locator(`.chain-choices .chain-car[data-letter="${c.letter}"]`).click();
      await m.page.waitForTimeout(300);
      if (r === 0) {
        const solved = await m.page.evaluate(() => ({ word: [...document.querySelectorAll('.chain-track .chain-car')].map((x) => x.dataset.letter).join(''), blend: document.querySelectorAll('.chain-track .chain-car.in-blend').length }));
        ok(solved.word === c.to && solved.blend === 2, `Add a Car: the right car couples in, ${c.to} shows its blend (${solved.word}, ${solved.blend} cars bracketed)`);
      }
      if (r < 3) await m.page.waitForTimeout(800);
    }
    await m.page.waitForFunction(() => document.querySelector('.chains-game').dataset.state === 'done', null, { timeout: 5000 });
    ok(await m.page.evaluate(() => window.__events.filter((e) => e.type === 'clip' || e.type === 'tts').length === 0), 'Add a Car: still nothing played after four rounds (the speaker is the only thing that plays)');
    ok(m.errors.length === 0, `Add a Car: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // Grownups lists World 5 and the reading count.
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(36));
    await page.waitForTimeout(2500);
    const gb = await page.locator('.home-top button').first().boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
    await page.waitForSelector('.grownups', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const txt = await page.locator('body').innerText();
    ok(/Blend Bay/.test(txt) && /of 50/.test(txt), `Grownups: World 5, Blend Bay is listed and the lesson count is of 50 (${txt.replace(/\s+/g, ' ').slice(0, 260)})`);
    ok(errors.length === 0, `Grownups: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Story 5 (DRAFT): opens at its stop after lesson 40, the cover and a page.
  {
    const m = await newPage(browser, PHONE);
    await seedPage(m, 40);
    await m.page.goto(url + '#/checkpoint/b5');
    await m.page.waitForSelector('.book, .book-cover, .book-page', { timeout: 10000 });
    await m.page.waitForTimeout(1500);
    ok(/Pip at the Bay|Story 5/.test(await m.page.locator('body').innerText()), 'story 5: the cover names the story');
    await shot(m.page, 'story5-cover');
    const next = m.page.locator('.btn.next, .book-next, button:has-text("Open")').first();
    for (let i = 0; i < 3; i++) { if (await next.count()) { await next.click().catch(() => {}); await m.page.waitForTimeout(900); } }
    await m.page.waitForTimeout(800);
    await shot(m.page, 'story5-page');
    ok(m.errors.length === 0, `story 5: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
  // The Home of World 4's end still leads on to Blend Bay (the last lesson of World 4 done, the crossing not yet played).
  {
    const { ctx, page, errors } = await openHome(browser, url, PHONE, seed(32));
    ok(await until(page, () => window.__train && window.__train.world === 'W4' && window.__train.frames > 1, null, 20000), 'world 4 end: with lesson 32 done the Home shows World 4');
    const t = await page.evaluate(() => ({ stops: window.__train.stopCount, c: window.__train.checkpointCount, sign: window.__train.signText }));
    ok(t.stops === 13 && t.c === 5 && t.sign === 'Blend Bay', `world 4 end: still thirteen stops and a portal to Blend Bay (${JSON.stringify(t)})`);
    ok(errors.length === 0, `world 4 end: no errors ${errors.join(' | ')}`);
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
  console.log(`blend-bay: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
