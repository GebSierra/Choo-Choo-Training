// Builds lessons 4 to 13 (i t p n f d h g b l) into data/curriculum.json from one compact table, so ten lessons are never
// hand-edited. Lessons 1 to 3, the sounds m a s and checkpoint c1 are left exactly as they are.
// Run: node tools/gen-lessons.mjs [last lesson, default 13]      (then: node test/check-content.mjs)
// It also rewrites the picture list in sw.js from the data, so every tile in use is precached.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../test/lib.mjs';
import { usedImages } from './precache-images.mjs';

const FILE = path.join(ROOT, 'data/curriculum.json');
const tile = (folder, word) => ({ word, image: `assets/images/mentava/web/${folder}/${word}.webp` });
const lastLesson = Number(process.argv[2] || 13);

// sound, how to say it, tiles (folder/word; the word begins with the sound), letter words (only letters taught so far),
// one picture word for Saying Sounds, four compound words (parts + one emoji each), the Quick Check and the games' distractor letters.
const TABLE = [
  { n: 4, k: 'i', practice: ['igloo'], say: 'i', asIn: 'igloo', hold: true, not: null, how: 'Say i as in igloo. Keep your mouth small and relaxed.',
    tiles: ['i/igloo', 'i/sit', 'i/stick'], start: ['i/igloo'], words: ['sis', 'miss', 'am'], pic: 'igloo',
    compounds: [['pine', 'apple', '🌲', '🍎'], ['spider', 'web', '🕷️', '🕸️'], ['light', 'house', '💡', '🏠'], ['drum', 'stick', '🥁', '🪵']],
    qc: { kind: 'letter', others: ['m', 's'] }, hunt: 'masonedp' },
  { n: 5, k: 't', practice: ['tiger', 'table', 'tent'], say: 't-', hold: false, not: 'tuh', how: 'Tap the tip of your tongue just behind your top teeth. Short and crisp: t-. Do not add uh.',
    tiles: ['t/tiger', 't/table', 't/tree', 'e/tent'], words: ['at', 'sit', 'mat'], pic: 'table',
    compounds: [['tree', 'house', '🌳', '🏠'], ['tea', 'pot', '🍵', '🍲'], ['cow', 'boy', '🐄', '👦'], ['sand', 'box', '🏖️', '📦']],
    qc: { kind: 'picture', word: 'table', others: ['wagon', 'camel'] }, hunt: 'masone' },
  { n: 6, k: 'p', practice: ['pig', 'pot', 'panda'], say: 'p-', hold: false, not: 'puh', how: 'Close your lips, then let out a tiny puff of air. Short: p-. Do not add uh.',
    tiles: ['p/pig', 'p/panda', 'p/pumpkin', 'o/pot'], words: ['pat', 'tip', 'map'], pic: 'pig',
    compounds: [['pop', 'corn', '💥', '🌽'], ['paint', 'brush', '🎨', '🖌️'], ['paper', 'clip', '📄', '📎'], ['space', 'ship', '🪐', '🚢']],
    qc: { kind: 'letter', others: ['s', 't'] }, hunt: 'mstoeifn' },
  { n: 7, k: 'n', practice: ['nose', 'nut', 'nest'], say: 'nnn', hold: true, not: 'nuh', how: 'Put your tongue behind your top teeth and hum through your nose. Hold it: nnn. Do not add uh.',
    tiles: ['n/nut', 'n/nose', 'n/necklace', 'e/nest'], words: ['man', 'pin', 'tan'], pic: 'nut',
    compounds: [['pea', 'nut', '🫛', '🥜'], ['note', 'book', '📝', '📖'], ['moon', 'light', '🌙', '💡'], ['ant', 'hill', '🐜', '⛰️']],
    qc: { kind: 'picture', word: 'nut', others: ['window', 'chair'] }, hunt: 'astoeifd' },
  { n: 8, k: 'f', practice: ['fish', 'fan', 'fox'], say: 'fff', hold: true, not: 'fuh', how: 'Rest your top teeth on your bottom lip and blow. Hold it: fff. Do not add uh.',
    tiles: ['f/fan', 'f/fish', 'f/fork', 'x/fox'], words: ['fan', 'fit', 'fin'], pic: 'fish',
    compounds: [['fish', 'bowl', '🐟', '🥣'], ['flower', 'pot', '🌸', '🪴'], ['fire', 'truck', '🔥', '🚚'], ['butter', 'fly', '🧈', '🪰']],
    qc: { kind: 'letter', others: ['m', 'a'] }, hunt: 'masone' },
  { n: 9, k: 'd', practice: ['duck', 'dog', 'door'], say: 'd-', hold: false, not: 'duh', how: 'Tap your tongue behind your top teeth and let your voice out. Short: d-. Do not add uh.',
    tiles: ['d/duck', 'd/deer', 'd/dog', 'd/door', 'd/dolphin'], words: ['dad', 'sad', 'dip'], pic: 'duck',
    compounds: [['doll', 'house', '🪆', '🏠'], ['door', 'bell', '🚪', '🔔'], ['rain', 'drop', '🌧️', '💧'], ['bull', 'dog', '🐂', '🐕']],
    qc: { kind: 'picture', word: 'duck', others: ['robot', 'yarn'] }, hunt: 'mstonif' },
  { n: 10, k: 'h', practice: ['hat', 'hand', 'horse'], say: 'h-', hold: false, not: 'huh', how: 'Breathe out as if fogging a mirror. Short: h-. Do not add uh.',
    tiles: ['h/hat', 'h/hand', 'h/hippo', 'e/hen', 'or/horse'], words: ['hat', 'him', 'hid'], pic: 'hippo',
    compounds: [['horse', 'shoe', '🐴', '👟'], ['hat', 'box', '👒', '📦'], ['bird', 'house', '🐦', '🏠'], ['ham', 'burger', '🍖', '🍔']],
    qc: { kind: 'letter', others: ['m', 's'] }, hunt: 'astoeifd' },
  { n: 11, k: 'g', practice: ['goat', 'gate'], say: 'g-', hold: false, not: 'guh', how: 'Lift the back of your tongue and let your voice out. Short: g-. Do not add uh.',
    tiles: ['g/goat', 'g/gate'], words: ['tag', 'dig', 'pig'], pic: 'goat',
    compounds: [['gold', 'fish', '🪙', '🐟'], ['egg', 'plant', '🥚', '🌱'], ['dragon', 'fly', '🐉', '🪰'], ['dog', 'house', '🐕', '🏠']],
    qc: { kind: 'picture', word: 'goat', others: ['rabbit', 'van'] }, hunt: 'mstonif' },
  { n: 12, k: 'b', practice: ['ball', 'bus', 'banana'], say: 'b-', hold: false, not: 'buh', how: 'Close your lips, then let your voice pop out. Short: b-. Do not add uh.',
    tiles: ['b/baby', 'b/banana', 'b/ball', 'b/bear', 'b/bus'], words: ['bat', 'bad', 'big'], pic: 'ball',
    compounds: [['basket', 'ball', '🧺', '🏀'], ['butter', 'cup', '🧈', '☕'], ['snow', 'ball', '❄️', '⚽'], ['bean', 'bag', '🫘', '👜']],
    qc: { kind: 'letter', others: ['m', 't'] }, hunt: 'mstoeifn' },
  { n: 13, k: 'l', practice: ['leaf', 'leg', 'ladder'], say: 'l-', hold: false, not: 'ull or luh', how: 'Put the tip of your tongue behind your top teeth. Say lion but stop before ion: l-. Do not add uh.',
    tiles: ['l/leaf', 'l/leg', 'l/ladder', 'ie/light'], words: ['lap', 'lip', 'lid'], pic: 'leaf',
    compounds: [['lady', 'bug', '👩', '🐛'], ['lunch', 'box', '🥪', '📦'], ['flower', 'bed', '🌸', '🛏️'], ['sun', 'light', '☀️', '💡']],
    qc: { kind: 'picture', word: 'leaf', others: ['umbrella', 'van'] }, hunt: 'masoendp' },
];

// Words for the wrong cards of the Sound Sack and Quick Check: tiles whose word begins with none of the sounds taught so far.
// avoid: sounds that are too close to the word's first sound to mix in (n with m, egg with a or i, v with f, k with g, ch with t or s ...).
const POOL_ADD = [
  ['c-k/cat', ['g']], ['ie/kite', ['g']], ['or/corn', ['g']], ['r/robot', ['l']], ['v/volcano', ['f']], ['w/worm', []], ['y/yarn', ['i']], ['u/umbrella', []],
  ['o/octopus', ['a']], ['ch/chair', ['t', 's']], ['ch/cheese', ['t', 's']], ['ch/chick', ['t', 's']],
];
const AVOID = { egg: ['a', 'i'], nest: ['m'], nut: ['m'], nose: ['m'], jet: ['d'], van: ['f'], vest: ['f'], camel: ['g'], candy: ['g'], king: ['g'], koala: ['g'], rabbit: ['l'], rocket: ['l'] };

const c = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const old = { sounds: ['m', 'a', 's'], lessons: 3 };
c.sounds = Object.fromEntries(old.sounds.map((k) => [k, c.sounds[k]]));
c.lessons = c.lessons.slice(0, old.lessons);
for (const k of ['hunt', 'barn']) c.games[k].distractors = Object.fromEntries(old.sounds.map((s) => [s, c.games[k].distractors[s]]));
c.checkpoints = (c.checkpoints || []).filter((k) => k.kind);

const phrase = (e) => (e.asIn ? `${e.say} as in ${e.asIn}` : e.say);
const QUIET = [{ tts: 'Today we learn a new letter. Your grown up will say its sound.' }];

// The shared pool of wrong cards: the old words plus a few more, each with the sounds it must not appear next to.
const have = new Set(c.gameDistractors.map((w) => w.word));
for (const [t, avoid] of POOL_ADD) { const w = tile(...t.split('/')); if (!have.has(w.word)) { c.gameDistractors.push(avoid.length ? { ...w, avoid } : w); have.add(w.word); } }
const ALL_AVOID = { ...Object.fromEntries(POOL_ADD.map(([t, a]) => [t.split('/')[1], a])), ...AVOID };
for (const w of c.gameDistractors) { const a = ALL_AVOID[w.word]; if (a && a.length) w.avoid = [...new Set([...(w.avoid || []), ...a])]; }


for (const e of TABLE.filter((t) => t.n <= lastLesson)) {
  const words = e.tiles.map((t) => tile(...t.split('/')));
  const start = (e.start ? e.start.map((t) => tile(...t.split('/'))) : words).filter((w) => w.word[0] === e.k);
  c.sounds[e.k] = { glyph: e.k, sayItLike: e.say, hold: e.hold, doNotSay: e.not, howTo: e.how, asIn: e.asIn || null, clip: null, words, startWords: start, practice: e.practice };
  const pickPicture = (w) => words.find((x) => x.word === w) || (() => { throw new Error('no tile for ' + w); })();
  const sayingSounds = [...e.words.map((w) => ({ word: w, emoji: null, showLetters: true })), { ...pickPicture(e.pic), showLetters: false }];
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
    sayingWords: e.compounds.map(([a, b, ea, eb]) => ({ parts: [a, b], word: a + b, emoji: [ea, eb] })),
    sayingSounds,
    quickCheck: {
      prompt: [{ tts: ask }, { clip: e.k }, ...qTail], promptQuiet: [{ tts: quiet }],
      promptText: `${ask} ${phrase(e)}?`, promptTextQuiet: quiet, kind: e.qc.kind, options,
    },
  });
  // Distractor letters for the two games, visually unlike the target.
  for (const kind of ['hunt', 'barn']) c.games[kind].distractors[e.k] = [...e.hunt];
}

for (const w of c.gameDistractors) if (w.avoid) { w.avoid = w.avoid.filter((k) => k in c.sounds); if (!w.avoid.length) delete w.avoid; }

// Each stop that needs sounds sits after the first lesson by which all of them are taught.
const taughtAt = (s) => { const i = c.lessons.findIndex((L) => L.sound === s); if (i < 0) throw new Error('untaught sound ' + s); return i + 1; };
for (const k of c.checkpoints) if (Array.isArray(k.needs)) k.after = Math.max(...k.needs.map(taughtAt));

c.games.wagons = { say: 'Tap every wagon that has the sound.' };
c.games.signals = { say: 'Listen. Then tap the light that makes the sound.' };

fs.writeFileSync(FILE, JSON.stringify(c, null, 2) + '\n');

// The precache list in sw.js: every tile curriculum.json uses.
const SW = path.join(ROOT, 'sw.js');
let sw = fs.readFileSync(SW, 'utf8');
const list = usedImages(c);
const lines = []; let line = '  ';
for (const f of list) { const item = `'${f}', `; if ((line + item).length > 150) { lines.push(line.trimEnd()); line = '  '; } line += item; }
lines.push(line.trimEnd());
sw = sw.replace(/(\/\/ picture tiles curriculum\.json uses[^\n]*\n)[\s\S]*?(\n\];)/, `$1${lines.join('\n')}$2`);
fs.writeFileSync(SW, sw);
console.log(`gen-lessons: ${c.lessons.length} lessons, ${Object.keys(c.sounds).length} sounds, ${c.checkpoints.length} checkpoints, ${list.length} tiles in the precache list`);
