// Builds lessons 4 to 17 (i t p f o n d c h u g l r b: js/order.js) into data/curriculum.json from one compact table, so fourteen lessons are never
// hand-edited. Lessons 1 to 3, the sounds m a s and checkpoint c1 keep their hand-made data; every lesson (1 to 17) then gets the
// same treatment at the end: its `middle` task list (js/games-data.js MIDDLES), its `games`, and every sound its "Watch my mouth" panel.
// Run: node tools/gen-lessons.mjs [last lesson, default 17]      (then: node test/check-content.mjs)
// It also rewrites the picture list in sw.js from the data, so every tile in use is precached.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../test/lib.mjs';
import { usedImages } from './precache-images.mjs';
import { boardWords, middleFor, TAP_GAMES } from '../js/games-data.js';
import { ORDER_SOUNDS, spellingsOf, soundOfLetter, lettersOfSounds } from '../js/order.js';

const FILE = path.join(ROOT, 'data/curriculum.json');
const tile = (folder, word) => ({ word, image: `assets/images/mentava/web/${folder}/${word}.webp` });
const lastLesson = Number(process.argv[2] || 17);

// sound, how to say it, tiles (folder/word; the word begins with the sound), letter words (only letters taught so far),
// one picture word for Saying Sounds, the Quick Check and the games' distractor letters.
const TABLE = [
  { n: 4, k: 'i', practice: ['igloo'], say: 'i', asIn: 'igloo', hold: true, not: null, how: 'Say i as in igloo. Keep your mouth small and relaxed.',
    tiles: ['i/igloo', 'i/sit', 'i/stick'], start: ['i/igloo'], words: ['sis', 'miss', 'am'], pic: 'igloo',
    qc: { kind: 'letter', others: ['m', 's'] }, hunt: 'masonedp' },
  { n: 5, k: 't', practice: ['tiger', 'table', 'tent'], say: 't-', hold: false, not: 'tuh', how: 'Tap the tip of your tongue just behind your top teeth. Short and crisp: t-. Do not add uh.',
    tiles: ['t/tiger', 't/table', 't/tree', 'e/tent'], words: ['at', 'sit', 'mat'], pic: 'table',
    qc: { kind: 'picture', word: 'table', others: ['wagon', 'camel'] }, hunt: 'masone' },
  { n: 6, k: 'p', practice: ['pig', 'pot', 'panda'], say: 'p-', hold: false, not: 'puh', how: 'Close your lips, then let out a tiny puff of air. Short: p-. Do not add uh.',
    tiles: ['p/pig', 'p/panda', 'p/pumpkin', 'o/pot'], words: ['pat', 'tip', 'map'], pic: 'pig',
    qc: { kind: 'letter', others: ['s', 't'] }, hunt: 'mstoeifn' },
  // ---- Green Valley (phase B, the curriculum's order): f o n d c(k) h u g l r b. Reading words use only the letters taught up to and including the lesson.
  { n: 7, k: 'f', practice: ['fish', 'fan', 'fox'], say: 'fff', hold: true, not: 'fuh', how: 'Rest your top teeth on your bottom lip and blow. Hold it: fff. Do not add uh.',
    tiles: ['f/fan', 'f/fish', 'f/fork', 'x/fox'], words: ['fat', 'fit', 'if'], pic: 'fish',
    qc: { kind: 'picture', word: 'fish', others: ['window', 'chair'] }, hunt: 'masoendp' },
  { n: 8, k: 'o', practice: ['octopus'], say: 'o', asIn: 'octopus', hold: true, not: null, how: 'Say o as in octopus. Open your mouth wide and round.',
    tiles: ['o/octopus', 'o/pot', 'o/rock'], start: ['o/octopus'], words: ['top', 'pop', 'sit'], pic: 'pot',
    qc: { kind: 'letter', others: ['m', 't'] }, hunt: 'msitpfnh' },
  { n: 9, k: 'n', practice: ['nose', 'nut', 'nest'], say: 'nnn', hold: true, not: 'nuh', how: 'Put your tongue behind your top teeth and hum through your nose. Hold it: nnn. Do not add uh.',
    tiles: ['n/nut', 'n/nose', 'n/necklace', 'e/nest'], words: ['nap', 'not', 'tin'], pic: 'nut',
    qc: { kind: 'picture', word: 'nut', others: ['window', 'van'] }, hunt: 'asitpfoe' },
  { n: 10, k: 'd', practice: ['duck', 'dog', 'door'], say: 'd-', hold: false, not: 'duh', how: 'Tap your tongue behind your top teeth and let your voice out. Short: d-. Do not add uh.',
    tiles: ['d/duck', 'd/deer', 'd/dog', 'd/door', 'd/dolphin'], words: ['dad', 'dip', 'sad'], pic: 'duck',
    qc: { kind: 'letter', others: ['m', 's'] }, hunt: 'msitfone' },
  // c and k are ONE lesson: one sound /k/, two spellings. The data key is c (glyph c), `alt` lists the second spelling. The parent says "k-".
  { n: 11, k: 'c', alt: ['k'], practice: ['cat', 'king', 'camel'], say: 'k-', hold: false, not: 'kuh', how: 'Lift the back of your tongue, then let it drop with a puff of air. Short: k-. Do not add uh.',
    tiles: ['c-k/camel', 'c-k/candy', 'c-k/cat', 'c-k/king', 'c-k/koala'], words: ['cap', 'kit', 'cot'], pic: 'cat',
    qc: { kind: 'picture', word: 'cat', others: ['window', 'van'] }, hunt: 'masitpfn' },
  { n: 12, k: 'h', practice: ['hat', 'hand', 'horse'], say: 'h-', hold: false, not: 'huh', how: 'Breathe out as if fogging a mirror. Short: h-. Do not add uh.',
    tiles: ['h/hat', 'h/hand', 'h/hippo', 'e/hen', 'or/horse'], words: ['hat', 'him', 'hot'], pic: 'hippo',
    qc: { kind: 'letter', others: ['m', 's'] }, hunt: 'masitpfo' },
  { n: 13, k: 'u', practice: ['umbrella', 'up'], say: 'u', asIn: 'umbrella', hold: true, not: null, how: 'Say u as in umbrella. Keep your mouth relaxed and open a little.',
    tiles: ['u/umbrella', 'u/sun', 'u/bug', 'u/up'], start: ['u/umbrella', 'u/up'], words: ['mud', 'cup', 'hut'], pic: 'sun',
    qc: { kind: 'picture', word: 'umbrella', others: ['window', 'van'] }, hunt: 'masitpfo' },
  { n: 14, k: 'g', practice: ['goat', 'gate'], say: 'g-', hold: false, not: 'guh', how: 'Lift the back of your tongue and let your voice out. Short: g-. Do not add uh.',
    tiles: ['g/goat', 'g/gate'], words: ['tag', 'dig', 'pig'], pic: 'goat',
    qc: { kind: 'letter', others: ['m', 's'] }, hunt: 'masitfoc' },
  { n: 15, k: 'l', practice: ['leaf', 'leg', 'ladder'], say: 'l-', hold: false, not: 'ull or luh', how: 'Put the tip of your tongue behind your top teeth. Say lion but stop before ion: l-. Do not add uh.',
    tiles: ['l/leaf', 'l/leg', 'l/ladder', 'ie/light'], words: ['lap', 'lip', 'lid'], pic: 'leaf',
    qc: { kind: 'picture', word: 'leaf', others: ['wagon', 'yarn'] }, hunt: 'masponcd' },
  { n: 16, k: 'r', practice: ['rabbit', 'robot', 'rocket'], say: 'rrr', hold: true, not: 'ruh', how: 'Pull your tongue back and let your voice hum. Hold it: rrr. Do not add uh.',
    tiles: ['r/rabbit', 'r/robot', 'r/rocket'], words: ['rat', 'rip', 'rug'], pic: 'robot',
    qc: { kind: 'letter', others: ['m', 's'] }, hunt: 'masitpfo' },
  { n: 17, k: 'b', practice: ['ball', 'bus', 'banana'], say: 'b-', hold: false, not: 'buh', how: 'Close your lips, then let your voice pop out. Short: b-. Do not add uh.',
    tiles: ['b/baby', 'b/banana', 'b/ball', 'b/bear', 'b/bus'], words: ['bat', 'big', 'bad'], pic: 'ball',
    qc: { kind: 'picture', word: 'ball', others: ['wagon', 'yarn'] }, hunt: 'masitfon' },
];

// Words for the wrong cards of the Sound Sack and Quick Check: tiles whose word begins with none of the sounds taught so far.
// avoid: sounds that are too close to the word's first sound to mix in (n with m, egg with a or i, v with f, k with g, ch with t or s ...).
const POOL_ADD = [
  ['c-k/cat', ['g']], ['ie/kite', ['g']], ['or/corn', ['g']], ['r/robot', ['l']], ['v/volcano', ['f']], ['w/worm', []], ['y/yarn', ['i']], ['u/umbrella', []],
  ['o/octopus', ['a']], ['ch/chair', ['t', 's']], ['ch/cheese', ['t', 's']], ['ch/chick', ['t', 's']],
];
const AVOID = { egg: ['a', 'i'], nest: ['m'], nut: ['m'], nose: ['m'], jet: ['d'], van: ['f'], vest: ['f'], camel: ['g'], candy: ['g'], king: ['g'], koala: ['g'], rabbit: ['l'], rocket: ['l'],
  // phase B: c/k is a lesson of its own, so the g and qu words stay out of its rounds; r keeps w words out of its rounds
  goat: ['c'], gate: ['c'], queen: ['c'], worm: ['r'], wagon: ['r'], window: ['r'] };

// The plan's units and worlds (docs/CURRICULUM.md sections 9 and 11). A unit is a group of new sounds; a world is one stretch of
// track, with a tunnel at its end. Only Stage 1 and Stage 2 units are listed in full; worlds 4 to 11 name their units by id.
const UNITS = [
  { id: '1.1', stage: 1, title: 'Left to right', sounds: [] }, { id: '1.2', stage: 1, title: 'First sounds', sounds: [] }, { id: '1.3', stage: 1, title: 'Blending', sounds: [] },
  { id: '2.1', stage: 2, sounds: ['m', 'a', 's'] }, { id: '2.2', stage: 2, sounds: ['i', 't'] }, { id: '2.3', stage: 2, sounds: ['p'] },
  { id: '2.4', stage: 2, sounds: ['f', 'o'] }, { id: '2.5', stage: 2, sounds: ['n', 'd'] }, { id: '2.6', stage: 2, sounds: ['c', 'k', 'h'] },
  { id: '2.7', stage: 2, sounds: ['u', 'g', 'l'] }, { id: '2.8', stage: 2, sounds: ['r', 'b'] }, { id: '2.9', stage: 2, sounds: ['e'] },
  { id: '2.10', stage: 2, sounds: ['j', 'w', 'v'] }, { id: '2.11', stage: 2, sounds: ['y', 'z', 'x', 'qu'] },
];
const stageUnits = (stage, count) => Array.from({ length: count }, (_, i) => `${stage}.${i + 1}`);
// PLACEHOLDER names: the owner will choose the real ones. Colours come from the house palette (css/app.css).
const WORLDS = [
  { id: 'W1', n: 1, name: 'Starter Station', color: '#F0556A', units: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'] },
  { id: 'W2', n: 2, name: 'Green Valley', color: '#3DD68C', units: ['2.4', '2.5', '2.6', '2.7', '2.8'] },
  { id: 'W3', n: 3, name: 'Sunny Hills', color: '#FFD166', units: ['2.9', '2.10', '2.11'] },
  { id: 'W4', n: 4, name: 'Digraph Docks', color: '#5AC8FA', units: stageUnits(3, 5) },
  { id: 'W5', n: 5, name: 'Blend Bay', color: '#6C5CE7', units: stageUnits(4, 5) },
  { id: 'W6', n: 6, name: 'Endings Junction', color: '#7DB8F5', units: stageUnits(5, 5) },
  { id: 'W7', n: 7, name: 'Silent E Summit', color: '#5FE3B0', units: stageUnits(6, 5) },
  { id: 'W8', n: 8, name: 'Vowel Team Town', color: '#CDC4F8', units: stageUnits(7, 6) },
  { id: 'W9', n: 9, name: 'Bossy R Bridge', color: '#5DE0F0', units: stageUnits(8, 5) },
  { id: 'W10', n: 10, name: 'Sliding Slopes', color: '#E0559C', units: stageUnits(9, 3) },
  { id: 'W11', n: 11, name: 'Tricky Peak', color: '#5A4BD6', units: stageUnits(10, 6) },
];

const c = JSON.parse(fs.readFileSync(FILE, 'utf8'));
delete c.playlistUrl; delete c.alphabetSongUrl; // owner 2026-10-08: no outside YouTube links anywhere
const old = { sounds: ['m', 'a', 's'], lessons: 3 };
c.sounds = Object.fromEntries(old.sounds.map((k) => [k, c.sounds[k]]));
c.lessons = c.lessons.slice(0, old.lessons);
for (const k of ['hunt']) c.games[k].distractors = Object.fromEntries(old.sounds.map((s) => [s, c.games[k].distractors[s]]));
delete c.games.barn; // Barn Doors is gone (v1.9.3): the tap games take its place
// Checkpoints: the stories (b1, b2) keep their hand-made data; Smooth Ride (r1, kind 'ride') became Read It Again (kind 'reread'; its
// microphone is gone, docs/LESSON-REBUILD.md section 10); the Review Stops are generated below. The id r1 is kept so saved results stay valid.
delete c.games.ride;
const REREAD = {
  id: 'r1', kind: 'reread', title: 'Read It Again', needs: ['m', 'a', 's', 'i'],
  // A tiny story the grown-up reads once and the child then reads back. Only letters taught by lesson 4 (m a s i) and the heart word
  // I that Story 1 already uses: test/check-content.mjs checks every word.
  story: ['I am Sam.', 'I miss Sis.', 'Sis! Sis! I am Sam!'], sight: ['I'],
};
c.checkpoints = [REREAD, ...(c.checkpoints || []).filter((k) => k.kind === 'book')];

const phrase = (e) => (e.asIn ? `${e.say} as in ${e.asIn}` : e.say);
const QUIET = [{ tts: 'Today we learn a new letter. Your grown up will say its sound.' }];

// The shared pool of wrong cards: the old words plus a few more, each with the sounds it must not appear next to.
const have = new Set(c.gameDistractors.map((w) => w.word));
for (const [t, avoid] of POOL_ADD) { const w = tile(...t.split('/')); if (!have.has(w.word)) { c.gameDistractors.push(avoid.length ? { ...w, avoid } : w); have.add(w.word); } }
const ALL_AVOID = { ...Object.fromEntries(POOL_ADD.map(([t, a]) => [t.split('/')[1], a])), ...AVOID };
for (const w of c.gameDistractors) { const a = ALL_AVOID[w.word]; if (a && a.length) w.avoid = [...new Set([...(w.avoid || []), ...a])]; }


for (const e of TABLE.filter((t) => t.n <= lastLesson)) {
  const words = e.tiles.map((t) => tile(...t.split('/')));
  const start = (e.start ? e.start.map((t) => tile(...t.split('/'))) : words).filter((w) => spellingsOf(e.k).includes(w.word[0]));
  c.sounds[e.k] = { glyph: e.k, ...(e.alt ? { alt: e.alt } : {}), sayItLike: e.say, hold: e.hold, doNotSay: e.not, howTo: e.how, asIn: e.asIn || null, clip: `assets/audio/sounds/${e.k}.mp3`, words, startWords: start, practice: e.practice };
  const pickPicture = (w) => words.find((x) => x.word === w) || (() => { throw new Error('no tile for ' + w); })();
  // Every word a child reads must be spelt with the letters taught up to this lesson. A picture word whose letters are not all taught yet
  // (from lesson 7 on) is only said, never shown as letters to slide under: sayOnly (js/screens/tasks/sounds.js).
  const taughtNow = lettersOfSounds(ORDER_SOUNDS.slice(0, e.n));
  for (const w of e.words) if (![...w].every((ch) => taughtNow.has(ch))) throw new Error(`lesson ${e.n}: "${w}" uses a letter that is not taught yet`);
  const picOnly = e.n >= 7 && ![...e.pic].every((ch) => taughtNow.has(ch));
  const sayingSounds = [...e.words.map((w) => ({ word: w, emoji: null, showLetters: true })), { ...pickPicture(e.pic), showLetters: false, ...(picOnly ? { sayOnly: true } : {}) }];
  const asInTail = e.asIn ? [{ tts: `as in ${e.asIn}.` }] : [];
  const qTail = e.asIn ? [{ tts: `as in ${e.asIn}?` }] : [];
  let options;
  if (e.qc.kind === 'letter') options = [e.k, ...e.qc.others].map((g, i) => ({ glyph: g, correct: i === 0 }));
  else {
    options = [{ ...pickPicture(e.qc.word), correct: true }, ...e.qc.others.map((w) => { const t = c.gameDistractors.find((x) => x.word === w); if (!t) throw new Error('no pool word ' + w); return { word: t.word, image: t.image, correct: false }; })];
  }
  const ask = e.qc.kind === 'letter' ? 'Which letter says' : 'Which picture starts with';
  const quiet = e.qc.kind === 'letter' ? 'Listen to your grown up. Then touch the letter.' : 'Listen. Touch the one that starts the same.';
  c.lessons.push({
    number: e.n, sound: e.k, review: e.n >= 3 ? [c.lessons[e.n - 3].sound, c.lessons[e.n - 2].sound] : [],
    intro: [{ tts: 'Today we learn a new sound:' }, { clip: e.k }, ...asInTail],
    introQuiet: QUIET,
    sayingSounds,
    quickCheck: {
      prompt: [{ tts: ask }, { clip: e.k }, ...qTail], promptQuiet: [{ tts: quiet }],
      promptText: `${ask} ${phrase(e)}?`, promptTextQuiet: quiet, kind: e.qc.kind, options,
    },
  });
  // Distractor letters for the two games, visually unlike the target.
  for (const kind of ['hunt']) c.games[kind].distractors[e.k] = [...e.hunt];
}

for (const w of c.gameDistractors) if (w.avoid) { w.avoid = w.avoid.filter((k) => k in c.sounds); if (!w.avoid.length) delete w.avoid; }

// Each stop that needs sounds sits after the first lesson by which all of them are taught.
const taughtAt = (s) => { const i = c.lessons.findIndex((L) => L.sound === s); if (i < 0) throw new Error('untaught sound ' + s); return i + 1; };
for (const k of c.checkpoints) if (Array.isArray(k.needs)) k.after = Math.max(...k.needs.map(taughtAt));

// Station Board words: for every lesson that has a full list (lessons 5 on), the proven short words of the bank.
for (const L of c.lessons) { const b = boardWords(c.lessons.map((x) => x.sound), L.number, 4); if (b) L.board = b; else delete L.board; }

// Review Stops (docs/LESSON-REBUILD.md section 10): a short run of the fun games on letters already taught, nothing new. Each activity
// names the lesson whose sound it is about (`lesson`); the games then mix that sound with the earlier ones (js/games-data.js
// roundTargets, otherLetters), so nothing past `after` ever shows. The plans lean on the three newest sounds, with one older sound
// in most stops, a different mix at every stop, and Ticket Check last. Picked by hand, then checked here and in test/check-content.mjs.
const REVIEW_AFTER = [3, 9, 12, 15, 17];
const REVIEW_PLANS = {
  3: [['hunt', 3], ['wagons', 2], ['hunt', 1], ['check', 2]], // three sounds only: Green Light needs a fourth letter for its lamps
  9: [['hunt', 8], ['signals', 9], ['wagons', 6], ['check', 8]],
  12: [['board', 12], ['wagons', 11], ['hunt', 7], ['check', 12]],
  15: [['wagons', 15], ['hunt', 13], ['board', 10], ['check', 14]],
  17: [['board', 17], ['hunt', 16], ['signals', 11], ['check', 16]],
};
// Ticket Check is always a letter question (lessons 2, 4, 6 ...): its wrong cards are letters taught by then, where a picture question
// shows pictures (and their words) that begin with letters not taught yet.
REVIEW_AFTER.forEach((after, i) => {
  if (after > c.lessons.length) return;
  const plan = REVIEW_PLANS[after].map(([task, lesson]) => {
    const L = c.lessons[lesson - 1];
    if (lesson > after || !L) throw new Error(`review stop after ${after}: lesson ${lesson} is not taught yet`);
    if (task === 'signals' && lesson < 2) throw new Error('Green Light needs two sounds');
    if (task === 'check' && L.quickCheck.kind !== 'letter') throw new Error(`review stop after ${after}: lesson ${lesson}'s Ticket Check is a picture question`);
    if (task === 'board' && !L.board) throw new Error(`review stop after ${after}: lesson ${lesson} has no Station Board words`);
    return { task, lesson };
  });
  if (plan[plan.length - 1].task !== 'check') throw new Error('Ticket Check comes last');
  c.checkpoints.push({ id: `v${i + 1}`, kind: 'review', title: 'Review Stop', after, plan });
});

c.games.board = { say: 'Find the sound in the word.' };
// "How to make this sound" for the Watch My Mouth step (docs/CURRICULUM.md section 5 and the unit notes in section 11): lips, teeth,
// tongue and whether the voice is on, in one to three short sentences. `voice` is shown as a small badge beside the text.
const MOUTH = {
  m: { voice: true, text: 'Lips together. Hum through your nose. Voice on.' },
  a: { voice: true, text: 'Open your mouth wide, with your jaw down. Keep your tongue low and flat. Voice on.' },
  s: { voice: false, text: 'Teeth close together. Tongue behind your teeth. Blow a thin stream of air. Voice off.' },
  i: { voice: true, text: 'Keep your mouth small and relaxed. Tongue a little forward. Voice on.' },
  t: { voice: false, text: 'Touch your tongue tip just behind your top teeth. Let out a quick puff of air. Voice off.' },
  p: { voice: false, text: 'Lips together, then open them with a quick puff of air. Voice off.' },
  n: { voice: true, text: 'Tongue behind your top teeth. Hum through your nose. Voice on.' },
  f: { voice: false, text: 'Top teeth on your bottom lip. Blow air out. Voice off.' },
  d: { voice: true, text: 'Tap your tongue behind your top teeth, quick and light. Voice on.' },
  h: { voice: false, text: 'Open your mouth a little. Breathe out, as if fogging a mirror. Voice off.' },
  g: { voice: true, text: 'Lift the back of your tongue to the roof of your mouth. Let it drop quickly. Voice on.' },
  b: { voice: true, text: 'Lips together, then pop them open. Voice on.' },
  l: { voice: true, text: 'Touch your tongue tip behind your top teeth. Let the sound flow around it. Voice on.' },
  o: { voice: true, text: 'Open your mouth wide and round, like an O. Keep your tongue low and still. Voice on.' },
  c: { voice: false, text: 'Lift the back of your tongue to the roof of your mouth. Drop it with a quick puff of air. Voice off.' }, // c and k: one sound
  u: { voice: true, text: 'Open your mouth a little. Keep your jaw and tongue relaxed and low. Voice on.' },
  r: { voice: true, text: 'Pull your tongue back and up, without touching the roof. Round your lips a little. Voice on.' },
};
for (const [k, m] of Object.entries(MOUTH)) if (c.sounds[k]) c.sounds[k].mouth = m;
for (const k of Object.keys(c.sounds)) if (!MOUTH[k]) throw new Error('no Watch My Mouth text for ' + k);

c.games.wagons = { say: 'Tap every wagon that has the sound.' };
c.games.signals = { say: 'Listen. Then tap the light that makes the sound.' };

// The middle of every lesson (js/games-data.js MIDDLES) and the tap games in it. The frame around it lives in js/lessons.js tasksFor.
// Word Cars (sayingWords) is gone from the lessons: the white paper says sound awareness works best tied to letters.
const ORDER_NOW = c.lessons.map((x) => x.sound);
if (ORDER_NOW.join(' ') !== ORDER_SOUNDS.slice(0, ORDER_NOW.length).join(' ')) throw new Error('the lessons must follow js/order.js ORDER_SOUNDS');
for (const L of c.lessons) {
  delete L.sayingWords;
  L.middle = middleFor(ORDER_NOW, L.number);
  L.games = L.middle.filter((t) => TAP_GAMES.includes(t));
}

// Milestones (docs/PLAN-v1.9.md). A level is earned when its `after` lesson is done; after is null while a needed sound
// is not built yet. Keep levels 4 to 15 sounds apart. Level two is the end of Green Valley (World 2): all 17 sounds of lessons 1 to 17
// (k is the second spelling of c, so it is not a separate need). Later levels name the sounds still to build.
const ALL17 = ORDER_SOUNDS;
const LEVELS = [
  { id: 'L1', n: 1, car: 'caboose', needs: ['m', 'a', 's', 'i', 't', 'p'] },
  { id: 'L2', n: 2, car: 'coach', needs: ALL17 },
  { id: 'L3', n: 3, car: 'flatbed', needs: [...ALL17, 'e'] },
  { id: 'L4', n: 4, car: 'tanker', needs: [...ALL17, ...'ewjvxyzq'] },
  { id: 'L5', n: 5, car: 'dome', needs: [...ALL17, ...'ewjvxyzq', 'sh', 'ch', 'th', 'ng', 'ck'] },
];
const builtAt = (s) => { const i = c.lessons.findIndex((L) => L.sound === s); return i < 0 ? null : i + 1; };
c.levels = LEVELS.map((v) => { const at = v.needs.map(builtAt); return { ...v, after: at.includes(null) ? null : Math.max(...at) }; });

// Units and worlds: each lesson belongs to the unit that teaches its sound, and so to that unit's world; a checkpoint
// belongs to the world of the lesson it follows.
c.units = UNITS;
c.worlds = WORLDS;
for (const L of c.lessons) {
  const u = UNITS.find((x) => x.sounds.includes(L.sound));
  const w = u && WORLDS.find((x) => x.units.includes(u.id));
  if (!w) throw new Error('no unit or world for sound ' + L.sound);
  L.unit = u.id; L.world = w.id;
}
for (const k of c.checkpoints) { const l = c.lessons.find((x) => x.number === k.after); if (!l) throw new Error('checkpoint ' + k.id + ' has no lesson ' + k.after); k.world = l.world; }

fs.writeFileSync(FILE, JSON.stringify(c, null, 2) + '\n');

// The precache list in sw.js: every tile curriculum.json uses.
const SW = path.join(ROOT, 'sw.js');
let sw = fs.readFileSync(SW, 'utf8');
const list = usedImages(c);
const lines = []; let line = '  ';
for (const f of list) { const item = `'${f}', `; if ((line + item).length > 150) { lines.push(line.trimEnd()); line = '  '; } line += item; }
lines.push(line.trimEnd());
sw = sw.replace(/(\/\/ picture tiles curriculum\.json uses[^\n]*\n)[\s\S]*?(\n\];)/, `$1${lines.join('\n')}$2`);
// Recorded sounds are optional precache files: one per sound clip (a missing file never stops the install).
sw = sw.replace(/OPTIONAL_FILES = \[[^\]]*\];/, `OPTIONAL_FILES = [${Object.values(c.sounds).map((s) => s.clip).filter(Boolean).map((f) => `'${f}'`).join(', ')}];`);
fs.writeFileSync(SW, sw);
console.log(`gen-lessons: ${c.lessons.length} lessons, ${Object.keys(c.sounds).length} sounds, ${c.levels.filter((v) => v.after !== null).length} built levels, ${c.checkpoints.length} checkpoints, ${list.length} tiles in the precache list`);
