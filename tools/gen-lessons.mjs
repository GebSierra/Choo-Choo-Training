// Builds lessons 4 to 33 (i t p f o n d c h u g l r b e j w v y z x qu sh ch th ck ff wh ng nk: js/order.js) into data/curriculum.json from one compact table, so twenty-two lessons are never
// hand-edited. Lessons 1 to 3, the sounds m a s and checkpoint c1 keep their hand-made data; every lesson (1 to 25) then gets the
// same treatment at the end: its `middle` task list (js/games-data.js MIDDLES), its `games`, and every sound its "Watch my mouth" panel.
// Run: node tools/gen-lessons.mjs [last lesson, default 25]      (then: node test/check-content.mjs)
// It also rewrites the picture list in sw.js from the data, so every tile in use is precached.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../test/lib.mjs';
import { usedImages } from './precache-images.mjs';
import { boardWords, middleFor, TAP_GAMES, WORD_BANK, DOCKS_BANK } from '../js/games-data.js';
import { ORDER_SOUNDS, BLENDS, isBlendKey, spellingsOf, soundOfLetter, lettersOfSounds, letterUnits, isReadable, isReadableBlends, blendPairsIn } from '../js/order.js';

const FILE = path.join(ROOT, 'data/curriculum.json');
const tile = (folder, word) => ({ word, image: `assets/images/mentava/web/${folder}/${word}.webp` });
const lastLesson = Number(process.argv[2] || 42);

// sound, how to say it, tiles (folder/word; the word begins with the sound), letter words (only letters taught so far),
// one picture word for Saying Sounds, the Quick Check and the games' distractor letters.
const TABLE = [
  { n: 4, k: 'i', practice: ['igloo'], say: 'iii', asIn: 'igloo', hold: true, not: null, how: 'Say iii as in igloo. Keep your mouth small and relaxed.',
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
  { n: 8, k: 'o', practice: ['octopus'], say: 'ooo', asIn: 'octopus', hold: true, not: null, how: 'Say ooo as in octopus. Open your mouth wide and round.',
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
  { n: 13, k: 'u', practice: ['umbrella', 'up'], say: 'uuu', asIn: 'umbrella', hold: true, not: null, how: 'Say uuu as in umbrella. Keep your mouth relaxed and open a little.',
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
  // ---- Sunny Hills (World 3, lessons 18 to 25): e j w v y z x qu. e is taught alone and contrasted with i (pin/pen, bit/bet); w gets an extra game
  // (EXTRA_MIDDLES: its name has no w in it); v and z are the buzzing partners of f and s; x is two sounds (ks-) heard at the END of words, so it has no
  // start word; qu is one unit of two letters (key q, glyph drawn as "qu") that says kw-. `sayOnly: true` forces a picture word to be said, never
  // shown as letters (yarn, zebra, wagon and queen are not spelt the way the letters sound). `note` is a short grown-up line on the New Sound screen.
  { n: 18, k: 'e', practice: ['egg'], say: 'eee', asIn: 'egg', hold: true, not: null, how: 'Say eee as in egg. Open your mouth a little, wider than for iii.',
    tiles: ['e/egg', 'e/hen', 'e/nest', 'e/tent'], start: ['e/egg'], words: ['pin', 'pen', 'bet'], pic: 'egg',
    qc: { kind: 'letter', others: ['m', 't'] }, hunt: 'mtpfdnhl',
    note: 'Let your child say the i sound first (iii as in igloo). Then compare pin and pen: which one has the new sound? Later, bit and bet.' },
  { n: 19, k: 'j', practice: ['jet', 'jump'], say: 'j-', hold: false, not: 'juh', how: 'Let the sound pop out with your lips a little round. Short: j-. Do not add uh.',
    tiles: ['j/jet', 'j/jump'], words: ['jet', 'jug', 'jog'], pic: 'jump',
    qc: { kind: 'picture', word: 'jet', others: ['wagon', 'yarn'] }, hunt: 'mapsfonh' },
  { n: 20, k: 'w', practice: ['worm', 'wagon'], say: 'w-', hold: false, not: 'wuh', how: 'Round your lips, then open them quickly. Short: w-. Do not add uh.',
    tiles: ['w/wagon', 'w/window', 'w/worm'], words: ['wet', 'web', 'wig'], pic: 'wagon', sayOnly: true,
    qc: { kind: 'letter', others: ['s', 't'] }, hunt: 'asitpfdg',
    note: 'The name of the letter w does not have its sound in it, so this lesson has one extra game. Say the sound, w-, not the letter name.' },
  { n: 21, k: 'v', practice: ['van', 'vest'], say: 'vvv', hold: true, not: 'vuh', how: 'Rest your top teeth on your bottom lip, like f, and turn your voice on. Hold it: vvv. Do not add uh.',
    tiles: ['v/van', 'v/vest', 'v/volcano'], words: ['van', 'vat', 'vet'], pic: 'vest',
    qc: { kind: 'picture', word: 'van', others: ['yarn', 'zebra'] }, hunt: 'asitpfdb',
    note: 'The sound vvv is the buzzing partner of fff. Let your child say fff first, then vvv, with a hand on the throat. Then compare fan and van.' },
  { n: 22, k: 'y', practice: ['yarn', 'yoyo'], say: 'y-', hold: false, not: 'yuh', how: 'Smile a little and lift the middle of your tongue, then glide down. Short: y-. Do not add uh.',
    tiles: ['y/yarn', 'y/yoyo'], words: ['yes', 'yet', 'yam'], pic: 'yarn', sayOnly: true,
    qc: { kind: 'letter', others: ['s', 'm'] }, hunt: 'asitpfdb',
    note: 'The name of the letter y starts with a different sound. Say the sound, y-, not the letter name. Compare yet and wet: which one starts with y-?' },
  { n: 23, k: 'z', practice: ['zebra', 'zoo'], say: 'zzz', hold: true, not: 'zuh', how: 'Close your teeth, like s, and turn your voice on. Hold it: zzz. Do not add uh.',
    tiles: ['z/zebra', 'z/zipper', 'z/zoo'], words: ['zip', 'zap', 'buzz'], pic: 'zebra', sayOnly: true,
    qc: { kind: 'letter', others: ['m', 't'] }, hunt: 'maitpfdh',
    note: 'The sound zzz is the buzzing partner of sss. Let your child say sss first, then zzz, with a hand on the throat.' },
  { n: 24, k: 'x', endOnly: true, practice: [], say: 'ks-', hold: false, not: null, how: 'x is two quick sounds, k and s, said together. Short: ks-. It comes at the end of a word.',
    tiles: ['x/fox', 'x/box', 'x/ox'], start: [], words: ['six', 'box', 'mix'], pic: 'fox',
    qc: { kind: 'letter', others: ['s', 'm'] }, hunt: 'masitpfd',
    note: 'The letter x comes at the end of words. Say fox, six and box slowly, and let your child listen for the last sound.' },
  { n: 25, k: 'q', practice: ['quack', 'queen'], say: 'kw-', hold: false, not: null, how: 'q always comes with u. Together they say kw-, quickly, as one sound.',
    tiles: ['q/quack', 'q/queen', 'q/quilt'], words: ['quit', 'quiz', 'quilt'], pic: 'queen', sayOnly: true,
    qc: { kind: 'letter', others: ['m', 's'] }, hunt: 'mstifnhl',
    note: 'The letter q is always followed by u. Treat qu as one unit. Together they say kw-.' },
  // ---- Digraph Docks (World 4, lessons 26 to 33): sh ch th ck ff(ll ss zz) wh ng nk. A digraph is ONE sound written with TWO letters (one unit everywhere: js/order.js DIGRAPHS).
  // endOnly: heard at the end of words (no start word, no Practicing Words round). noPictures: no picture tile with that spelling exists yet (docs/IMAGE-PROMPTS.md), so the lesson has none,
  // never a wrong one. th is one lesson with two kinds: `voiced` is how the grown-up writes the buzzing one, `voicedWords` the words that use it.
  { n: 26, k: 'sh', practice: ['ship', 'shark', 'shoe'], say: 'shhh', asIn: 'ship', hold: true, not: null, how: 'Say shhh as in ship, like asking for quiet. Hold it: shhh.',
    tiles: ['sh/ship', 'sh/shark', 'sh/shoe'], words: ['shop', 'fish', 'mash'], pic: 'ship',
    qc: { kind: 'letter', others: ['m', 's'] }, hunt: 'sthmafpn',
    note: 'Two letters, one sound. Slide under both letters at once: shhh. Compare sip and ship: which one has the new sound?' },
  { n: 27, k: 'ch', practice: ['chair', 'cheese', 'chick'], say: 'ch-', asIn: 'chip', hold: false, not: 'chuh', how: 'Say ch- as in chip, like a quick sneeze. Short: ch-. Do not add uh.',
    tiles: ['ch/chair', 'ch/cheese', 'ch/chick'], words: ['chop', 'much', 'rich'], pic: 'chick',
    qc: { kind: 'letter', others: ['sh', 'm'] }, hunt: 'sthcmpfn',
    note: 'Two letters, one sound. Say ch- like a quick sneeze, not chuh. Compare ship and chip: which one starts with the new sound?' },
  { n: 28, k: 'th', practice: ['thumb', 'thunder'], say: 'th-', asIn: 'thin', voiced: 'thhh', voicedWords: ['that', 'this', 'then', 'them', 'they', 'the'], hold: false, not: 'tuh or fuh', how: 'Say th- as in thin: poke your tongue out between your teeth and blow. Do not add uh.',
    tiles: ['th-unvoiced/thumb', 'th-unvoiced/thunder', 'th-unvoiced/bath', 'th-voiced/mother', 'th-voiced/father'], words: ['that', 'thin', 'bath'], pic: 'thumb', sayOnly: true,
    qc: { kind: 'letter', others: ['t', 'sh'] }, hunt: 'stmfpdnh',
    note: 'The letters th make two sounds, with the tongue between the teeth for both. Put a hand on your throat. In that it buzzes (thhh). In thin it does not (th-). Say both and feel the difference. Quiet th is easy to mix up with f: compare fin and thin.' },
  { n: 29, k: 'ck', endOnly: true, practice: [], say: 'k-', hold: false, not: 'kuh', how: 'ck says k-, the same sound as c and k. It comes right after a short vowel at the end of a word.',
    tiles: ['d/duck', 's/sock', 'i/stick', 'o/rock'], start: [], words: ['back', 'sick', 'duck'], pic: 'sock',
    qc: { kind: 'letter', others: ['m', 't'] }, hunt: 'masitpfd',
    note: 'Two letters, one sound: ck says k- and comes at the end of a short word, like back and duck. Slide under both letters at once.' },
  { n: 30, k: 'ff', alt: ['ll', 'ss', 'zz'], endOnly: true, practice: [], say: 'fff', asIn: 'puff', hold: true, not: null, how: 'Two of the same letter say the same sound as one: ff says fff, ll says l-, ss says sss, zz says zzz.',
    tiles: ['b/ball'], start: [], words: ['puff', 'miss', 'buzz'], pic: 'ball', sayOnly: true,
    qc: { kind: 'letter', others: ['m', 't'] }, hunt: 'masitpdh',
    note: 'Doubled letters come right after a short vowel at the end of a short word: puff, bell, miss, buzz. Two letters, one sound: the same sound the single letter makes. Slide under both letters at once.' },
  { n: 31, k: 'wh', noPictures: true, practice: [], say: 'w-', asIn: 'when', hold: false, not: 'wuh', how: 'wh says w-, the same sound as w. Round your lips, then open them quickly. Do not add uh.',
    tiles: [], start: [], words: ['when', 'whip', 'whiz'], pic: null,
    qc: { kind: 'letter', others: ['w', 'm'] }, hunt: 'masitpfd',
    note: 'The letters wh say the same sound as w. Slide under both letters at once. Compare wig and whip: which one has the new letters?' },
  { n: 32, k: 'ng', endOnly: true, practice: [], say: 'ng-', hold: false, not: null, how: 'ng is one sound at the end of a word, like the end of sing. Hum through your nose with the back of your tongue up.',
    tiles: ['ng/ring', 'ng/sing', 'ng/wing'], start: [], words: ['rang', 'long', 'hung'], pic: 'ring',
    qc: { kind: 'letter', others: ['n', 'm'] }, hunt: 'masitpfd',
    note: 'The letters ng are taught as chunks: -ang, -ing, -ong, -ung. The vowel sounds a little different before ng, so read the whole chunk: rang, sing, long, hung.' },
  { n: 33, k: 'nk', endOnly: true, noPictures: true, practice: [], say: 'nk-', hold: false, not: null, how: 'nk is n, then a quick k, at the end of a word, like the end of bank. Back of your tongue up, then a puff.',
    tiles: [], start: [], words: ['bank', 'pink', 'honk'], pic: null,
    qc: { kind: 'letter', others: ['ng', 'm'] }, hunt: 'masitpfd',
    note: 'The letters nk are taught as chunks: -ank, -ink, -onk, -unk. Read the whole chunk: bank, pink, honk, junk.' },

  // ---- Blend Bay (World 5, lessons 34 to 42): blends are NOT new sounds. Each letter keeps its own sound, so no new letter unit and no new taught letter: the lesson teaches
  // gliding two sounds together ("ssstop", not "suh-top"). `blend` lists the lesson's pairs (js/order.js BLENDS): g the two letters, say how the grown-up writes the glide
  // (a held first sound is stretched: ssst-; two short sounds glide: bl-), asIn an example word. The first pair is the lesson's glyph, the rest are `alt`. practice: only
  // lesson 37 has a picture that starts with its first pair (snail, snake); the rest are met in the tiles and the words. qc: the Ticket Check, a letter question about a pair.
  { n: 34, k: 'st', blend: [{ g: 'st', say: 'ssst-', asIn: 'last' }, { g: 'ft', say: 'ffft-', asIn: 'soft' }], practice: [], hold: false, not: 'suh-t',
    how: 'Say the s and the t as one smooth glide: ssst-. Keep the s going, then tap the t. Do not add uh between them.',
    tiles: ['e/nest', 'v/vest'], start: [], words: ['lost', 'soft', 'gift'], pic: 'nest',
    qc: { kind: 'letter', target: 'st', others: ['ft', 'sh'] }, hunt: 'mohnuabe',
    note: 'A blend is two sounds said close together. Each letter keeps its own sound: s says sss and t says t-. At the end of a word the s and t glide together: last, nest, soft, gift.' },
  { n: 35, k: 'nd', blend: [{ g: 'nd', say: 'nnnd-', asIn: 'hand' }, { g: 'mp', say: 'mmmp-', asIn: 'lamp' }, { g: 'nt', say: 'nnnt-', asIn: 'tent' }], practice: [], hold: false, not: 'nuh-d',
    how: 'Say the n or m and then the d, p or t straight after it, no uh between. The n or m melts into the vowel, so listen for it.',
    tiles: ['e/tent', 'h/hand', 'j/jump'], start: [], words: ['hand', 'lamp', 'jump'], pic: 'tent',
    qc: { kind: 'letter', target: 'nd', others: ['mp', 'st'] }, hunt: 'mohubaeg',
    note: 'The n or m in nd, mp and nt melts into the vowel, so it is easy to leave out: sad becomes sand, cap becomes camp. Say the word slowly and let your child hear the nnn or mmm before the last sound. The next stop, Tricky Sounds, practices exactly this.' },
  { n: 36, k: 'sp', blend: [{ g: 'sp', say: 'sssp-', asIn: 'spin' }, { g: 'sk', say: 'sssk-', asIn: 'skip' }], practice: [], hold: false, not: 'suh-p',
    how: 'Hold the s and slide straight into the next sound: sssp-. Do not say suh-p. st works the same way: ssstop.',
    tiles: ['i/stick', 'ar/star'], start: [], words: ['stop', 'spin', 'skip'], pic: 'stick',
    qc: { kind: 'letter', target: 'sp', others: ['sk', 'st'] }, hunt: 'mohnubae',
    note: 'Hold the s, then slide into the next sound: sssp-in, not suh-pin. The pair st from lesson 34 now comes at the start of words too: stop, step. Chains add a missing sound to make a new word: top, stop.' },
  { n: 37, k: 'sn', blend: [{ g: 'sn', say: 'sssnnn', asIn: 'snap' }, { g: 'sw', say: 'sssw-', asIn: 'swim' }, { g: 'sm', say: 'sssmmm', asIn: 'smash' }, { g: 'sl', say: 'sssl-', asIn: 'slip' }], practice: ['snail', 'snake'], hold: true, not: 'suh-n',
    how: 'Hold the s and slide into the next sound: sssnnn. Do not say suh-n. The same for sw, sm and sl.',
    tiles: ['s/snail', 's/snake'], words: ['snap', 'swim', 'smash', 'slip'], pic: 'snail',
    qc: { kind: 'letter', target: 'sn', others: ['sw', 'sp'] }, hunt: 'mohubaeg',
    note: 'Four more s-blends: sn, sw, sm, sl. Hold the s, then slide into the next sound. Try a chain: sap, snap; lip, slip; wing, swing.' },
  { n: 38, k: 'bl', blend: [{ g: 'bl', say: 'bl-', asIn: 'block' }, { g: 'cl', say: 'cl-', asIn: 'clap' }, { g: 'fl', say: 'fl-', asIn: 'flag' }], practice: [], hold: false, not: 'buh-l',
    how: 'Glide the first sound straight into l: bl-, cl-, fl-. Say block, not buh-lock.',
    tiles: ['ow/cloud'], start: [], words: ['block', 'clap', 'flag'], pic: 'cloud',
    qc: { kind: 'letter', target: 'bl', others: ['cl', 'fl'] }, hunt: 'mohnuaet',
    note: 'The l-blends: bl, cl, fl. Glide the first sound straight into l: block, not buh-lock. Keep it quick and smooth.' },
  { n: 39, k: 'pl', blend: [{ g: 'pl', say: 'pl-', asIn: 'plan' }, { g: 'gl', say: 'gl-', asIn: 'glad' }], practice: [], hold: false, not: 'puh-l',
    how: 'Glide the first sound straight into l: pl-, gl-. Say plan, not puh-lan.',
    tiles: ['oo-moon/glue'], start: [], words: ['plan', 'plum', 'glad'], pic: 'glue',
    qc: { kind: 'letter', target: 'pl', others: ['gl', 'bl'] }, hunt: 'mohnuaet',
    note: 'Two more l-blends: pl and gl. Glide into l: plan, not puh-lan; glad, not guh-lad.' },
  { n: 40, k: 'br', blend: [{ g: 'br', say: 'br-', asIn: 'brush' }, { g: 'tr', say: 'tr-', asIn: 'trip' }, { g: 'cr', say: 'cr-', asIn: 'crab' }], practice: [], hold: false, not: 'buh-r',
    how: 'Glide the first sound straight into r: br-, tr-, cr-. Say brush, not buh-rush.',
    tiles: ['a/crab', 'ae/train', 't/tree', 'ie/cry'], start: [], words: ['brush', 'trip', 'crib'], pic: 'crab',
    qc: { kind: 'letter', target: 'br', others: ['cr', 'bl'] }, hunt: 'mohnuaes',
    note: 'The r-blends start here: br, tr, cr. Glide into r. Note that tr often sounds close to chr (trip) and that is normal speech.' },
  { n: 41, k: 'dr', blend: [{ g: 'dr', say: 'dr-', asIn: 'drum' }, { g: 'fr', say: 'fr-', asIn: 'frog' }, { g: 'gr', say: 'gr-', asIn: 'grin' }], practice: [], hold: false, not: 'duh-r',
    how: 'Glide the first sound straight into r: dr-, fr-, gr-. Say drum, not duh-rum.',
    tiles: ['oo-moon/fruit'], start: [], words: ['drop', 'frog', 'grin'], pic: 'fruit',
    qc: { kind: 'letter', target: 'dr', others: ['fr', 'tr'] }, hunt: 'mohnuaes',
    note: 'The last r-blends: dr, fr, gr. Glide into r. Note that dr often sounds close to jr (drip) and that is normal speech.' },
  { n: 42, k: 'mix', blend: [{ g: 'st', say: 'ssst-', asIn: 'stamp' }, { g: 'mp', say: 'mmmp-', asIn: 'stamp' }], practice: [], hold: false, not: null,
    how: 'Blends can come at the start of a word, at the end, or both: stamp, crust, plant. Glide each pair, with no uh.',
    tiles: ['i/stick', 'e/tent', 'a/crab'], start: [], words: ['stamp', 'crust', 'blend', 'frost', 'plant', 'crash', 'think'], pic: null,
    qc: { kind: 'letter', target: 'mp', others: ['sp', 'br'], text: 'Which letters are at the end of lamp?' }, hunt: 'mohnuabe',
    note: 'The longest short-vowel words yet: stamp, crust, blend, frost, plant (five sounds each). Let your child slide under the whole word, gliding each blend. crash, flesh and think mix blends with digraphs.' },
];

// Heart words (docs/CURRICULUM.md section 12): n is the lesson that teaches the word (never more than 2 a lesson). `parts` are [letters, heart]: the regular
// parts sound out, the heart part is the tricky part to know by heart. `tricky` is what the grown-up reads. `phrase` is the tiny "use it" phrase and `find` the two
// wrong cards of the find-it round: each word is spelt with letters taught by lesson n or is a heart word taught by n (test/check-content.mjs proves it).
const P = (...a) => a.map((x) => (Array.isArray(x) ? { t: x[0], heart: true } : { t: x }));
const END = 'The vowel at the end of the word says its name.';
const HEART = [
  { n: 3, w: 'a', parts: P(['a']), tricky: 'The letter a says "uh" here.', phrase: 'a mass', find: ['am', 'Sam'] },
  { n: 4, w: 'I', parts: P(['I']), tricky: 'A one-letter word that says long i. It is always a capital letter.', phrase: 'I am Sam', find: ['am', 'Sam'] },
  { n: 4, w: 'is', parts: P('i', ['s']), tricky: 'The letter s says "z" here.', phrase: 'Sis is Sam', find: ['Sam', 'am'] },
  { n: 6, w: 'the', parts: P('th', ['e']), tricky: 'The letter e says "uh" here.', phrase: 'the map', find: ['map', 'sit'] },
  { n: 10, w: 'to', parts: P('t', ['o']), tricky: 'The letter o says "oo" here.', phrase: 'to Dad', find: ['dad', 'map'] },
  { n: 18, w: 'he', parts: P('h', ['e']), tricky: END, phrase: 'he is a hen', find: ['bed', 'pen'] },
  { n: 18, w: 'me', parts: P('m', ['e']), tricky: END, phrase: 'Ben and me', find: ['red', 'tin'] },
  { n: 19, w: 'be', parts: P('b', ['e']), tricky: END, phrase: 'be big', find: ['pen', 'tip'] },
  { n: 19, w: 'go', parts: P('g', ['o']), tricky: END, phrase: 'go to bed', find: ['jet', 'bad'] },
  { n: 20, w: 'no', parts: P('n', ['o']), tricky: END, phrase: 'no web', find: ['web', 'jet'] },
  { n: 20, w: 'so', parts: P('s', ['o']), tricky: END, phrase: 'so wet', find: ['wet', 'hug'] },
  { n: 21, w: 'we', parts: P('w', ['e']), tricky: END, phrase: 'we win', find: ['van', 'jet'] },
  { n: 21, w: 'want', parts: P('w', ['a'], 'nt'), tricky: 'The letter a says "o" after w.', phrase: 'I want a pet', find: ['van', 'jam'] },
  { n: 22, w: 'was', parts: P('w', ['a'], ['s']), tricky: 'The letter a says "u" and the letter s says "z" here.', phrase: 'it was wet', find: ['yes', 'jam'] },
  { n: 22, w: 'my', parts: P('m', ['y']), tricky: 'The letter y says long i here.', phrase: 'my pet', find: ['pen', 'jug'] },
  { n: 23, w: 'you', parts: P('y', ['ou']), tricky: 'The letters ou say "oo" here.', phrase: 'you can zip', find: ['zip', 'zap'] },
  { n: 23, w: 'of', parts: P('o', ['f']), tricky: 'The letter f says "v" here.', phrase: 'a cup of jam', find: ['zap', 'yes'] },
  { n: 24, w: 'said', parts: P('s', ['ai'], 'd'), tricky: 'The letters ai say short e here.', phrase: 'Dad said yes', find: ['six', 'mix'] },
  { n: 24, w: 'do', parts: P('d', ['o']), tricky: 'The letter o says "oo" here.', phrase: 'do not mix', find: ['box', 'fox'] },
  { n: 25, w: 'does', parts: P('d', ['oe'], ['s']), tricky: 'The letters oe say short u and the letter s says "z" here.', phrase: 'he does a quiz', find: ['quiz', 'quit'] },
  { n: 25, w: 'are', parts: P(['are']), tricky: 'The whole word is tricky. Say it as one piece.', phrase: 'you are a queen', find: ['quit', 'zip'] },
  // World 4: she (26), they (28); what and where both wait for wh, so they come at 31
  { n: 26, w: 'she', parts: P('sh', ['e']), tricky: END, phrase: 'she is a hen', find: ['shop', 'shed'] },
  { n: 28, w: 'they', parts: P('th', ['ey']), tricky: 'The letters ey say long a here.', phrase: 'they can go', find: ['then', 'thin'] },
  { n: 31, w: 'what', parts: P('wh', ['a'], 't'), tricky: 'The letter a says "u" here.', phrase: 'what is it', find: ['when', 'whip'] },
  { n: 31, w: 'where', parts: P('wh', ['ere']), tricky: 'The letters ere say "air" here.', phrase: 'where is Dad', find: ['when', 'whiz'] },
];

// Words for the wrong cards of the Sound Sack and Quick Check: tiles whose word begins with none of the sounds taught so far.
// avoid: sounds that are too close to the word's first sound to mix in (n with m, egg with a or i, v with f, k with g, ch with t or s ...).
const POOL_ADD = [
  ['c-k/cat', ['g']], ['ie/kite', ['g']], ['or/corn', ['g']], ['r/robot', ['l']], ['v/volcano', ['f']], ['w/worm', []], ['y/yarn', ['i']], ['u/umbrella', []],
  ['o/octopus', ['a']], ['z/zebra', ['s']], ['ch/chair', ['t', 's', 'sh']], ['ch/cheese', ['t', 's', 'sh']], ['ch/chick', ['t', 's', 'sh']],
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
  { id: '2.10', stage: 2, sounds: ['j', 'w', 'v'] }, { id: '2.11', stage: 2, sounds: ['y', 'z', 'x', 'q'] },
  // Stage 3, Digraph Docks (World 4): 3.1 sh ch, 3.2 th, 3.3 ck ff(ll ss zz) wh, 3.4 ng nk, 3.5 mixed review (no new sound)
  { id: '3.1', stage: 3, sounds: ['sh', 'ch'] }, { id: '3.2', stage: 3, sounds: ['th'] }, { id: '3.3', stage: 3, sounds: ['ck', 'ff', 'wh'] },
  { id: '3.4', stage: 3, sounds: ['ng', 'nk'] }, { id: '3.5', stage: 3, sounds: [] },
  // Stage 4, Blend Bay (World 5): 4.1 ending blends st ft, nd mp nt (34, 35), 4.2 s-blends (36, 37), 4.3 l-blends (38, 39), 4.4 r-blends (40, 41), 4.5 mixed review (42)
  { id: '4.1', stage: 4, sounds: ['st', 'nd'] }, { id: '4.2', stage: 4, sounds: ['sp', 'sn'] }, { id: '4.3', stage: 4, sounds: ['bl', 'pl'] },
  { id: '4.4', stage: 4, sounds: ['br', 'dr'] }, { id: '4.5', stage: 4, sounds: ['mix'] },
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
// Story 3 (World 3, after lesson 22 y): data/books/book-3.json. The stop sits after the first lesson by which all its needed sounds are taught (below).
const BOOK3 = { id: 'b3', kind: 'book', title: 'Story 3', book: 'book-3', needs: ORDER_SOUNDS.slice(0, 22) };
// Story 4 (World 4, after lesson 31 wh): data/books/book-4.json. DRAFT: the owner approves the story text.
const BOOK4 = { id: 'b4', kind: 'book', title: 'Story 4', book: 'book-4', needs: ORDER_SOUNDS.slice(0, 31) };
// Story 5 (World 5, after lesson 40 br tr cr): data/books/book-5.json. DRAFT: the owner approves the story text.
const BOOK5 = { id: 'b5', kind: 'book', title: 'Story 5', book: 'book-5', needs: ORDER_SOUNDS.slice(0, 40) };
const books = (c.checkpoints || []).filter((k) => k.kind === 'book' && !['b3', 'b4', 'b5'].includes(k.id));
c.checkpoints = [REREAD, ...books, BOOK3, BOOK4, BOOK5];

const fitG = (...o) => o.find((x) => x.length <= 28) || o[o.length - 1];
const phrase = (e) => (e.asIn ? `${e.say} as in ${e.asIn}` : e.say);
const QUIET = [{ tts: 'Today we learn a new letter. Your grown-up will say its sound.' }];

// The shared pool of wrong cards: the old words plus a few more, each with the sounds it must not appear next to.
const have = new Set(c.gameDistractors.map((w) => w.word));
for (const [t, avoid] of POOL_ADD) { const w = tile(...t.split('/')); if (!have.has(w.word)) { c.gameDistractors.push(avoid.length ? { ...w, avoid } : w); have.add(w.word); } }
const ALL_AVOID = { ...Object.fromEntries(POOL_ADD.map(([t, a]) => [t.split('/')[1], a])), ...AVOID };
for (const w of c.gameDistractors) { const a = ALL_AVOID[w.word]; if (a && a.length) w.avoid = [...new Set([...(w.avoid || []), ...a])]; }


for (const e of TABLE.filter((t) => t.blend)) {
  e.say = e.blend[0].say; e.asIn = e.blend[0].asIn; e.alt = e.blend.slice(1).map((b) => b.g);
  if (spellingsOf(e.k).join() !== [e.blend[0].g, ...e.alt].join()) throw new Error(`lesson ${e.n}: js/order.js SPELLINGS for ${e.k} must list ${[e.blend[0].g, ...e.alt]}`);
}
for (const e of TABLE.filter((t) => t.n <= lastLesson)) {
  const words = e.tiles.map((t) => tile(...t.split('/')));
  const start = (e.start ? e.start.map((t) => tile(...t.split('/'))) : words).filter((w) => spellingsOf(e.k).some((sp) => w.word.startsWith(sp)));
  c.sounds[e.k] = { glyph: e.blend ? e.blend[0].g : e.k, ...(e.blend ? { blend: true, pairs: e.blend } : {}), ...(e.alt ? { alt: e.alt } : {}), sayItLike: e.say, hold: e.hold, doNotSay: e.not, howTo: e.how, ...(e.endOnly ? { endOnly: true } : {}), ...(e.noPictures ? { noPictures: true } : {}), ...(e.voiced ? { voiced: e.voiced, voicedWords: e.voicedWords } : {}), ...(e.note ? { parentNote: e.note } : {}), asIn: e.asIn || null, clip: e.blend ? null : `assets/audio/sounds/${e.k}.mp3`, words, startWords: start, practice: e.practice };
  const pickPicture = (w) => words.find((x) => x.word === w) || (() => { throw new Error('no tile for ' + w); })();
  // Every word a child reads must be spelt with the letters taught up to this lesson. A picture word whose letters are not all taught yet
  // (from lesson 7 on) is only said, never shown as letters to slide under: sayOnly (js/screens/tasks/sounds.js).
  const taughtNow = lettersOfSounds(ORDER_SOUNDS.slice(0, e.n));
  for (const w of e.words) if (!(e.blend ? isReadableBlends : isReadable)(w, taughtNow)) throw new Error(`lesson ${e.n}: "${w}" uses a letter or a blend that is not taught yet`);
  const picOnly = e.pic && (e.sayOnly || (e.n >= 7 && !isReadable(e.pic, taughtNow)));
  const sayingSounds = [...e.words.map((w) => ({ word: w, emoji: null, showLetters: true })), ...(e.pic ? [{ ...pickPicture(e.pic), showLetters: false, ...(picOnly ? { sayOnly: true } : {}) }] : [])];
  const asInTail = e.asIn ? [{ tts: `as in ${e.asIn}.` }] : [];
  const qTail = e.asIn ? [{ tts: `as in ${e.asIn}?` }] : [];
  let options;
  if (e.qc.kind === 'letter') options = [e.qc.target || e.k, ...e.qc.others].map((g, i) => ({ glyph: g, correct: i === 0 }));
  else {
    options = [{ ...pickPicture(e.qc.word), correct: true }, ...e.qc.others.map((w) => { const t = c.gameDistractors.find((x) => x.word === w); if (!t) throw new Error('no pool word ' + w); return { word: t.word, image: t.image, correct: false }; })];
  }
  const ask = e.qc.kind === 'letter' ? 'Which letter says' : 'Which picture starts with';
  const quiet = e.qc.kind === 'letter' ? 'Listen to your grown-up. Then touch the letter.' : 'Listen. Touch the one that starts the same.';
  const qb = e.blend ? (() => { const t = e.blend.find((b) => b.g === (e.qc.target || e.k)) || e.blend[0], q = 'Listen to your grown-up. Then touch the letters.'; const text = e.qc.text || `Which letters say ${t.say} as in ${t.asIn}?`;
    return { prompt: [{ tts: 'Which letters make the blend?' }], promptQuiet: [{ tts: q }], promptText: text, promptTextQuiet: q, gist: fitG(e.qc.text ? 'Which is at the end of lamp?' : `Which says ${t.say}?`, `Ask: ${t.say}?`), script: e.qc.text ? "Say: 'Which letters are at the end of lamp?' Your child touches one card. The app does not say right or wrong. The grown-up decides. If it was not the right one, say the blend together, slowly." : `Say: 'Which letters say ${t.say} as in ${t.asIn}?' Your child touches one card. The app does not say right or wrong. The grown-up decides. If it was not the right one, say the blend together, slowly.` }; })() : null;
  c.lessons.push({
    number: e.n, sound: e.k, ...(e.blend ? { blend: true } : {}), review: e.n >= 3 ? [c.lessons[e.n - 3].sound, c.lessons[e.n - 2].sound] : [],
    intro: e.blend ? [{ tts: 'Today we learn a new blend.' }] : [{ tts: 'Today we learn a new sound:' }, { clip: e.k }, ...asInTail],
    introQuiet: e.blend ? [{ tts: 'Today we learn a new blend. Your grown-up will say it.' }] : QUIET,
    sayingSounds,
    quickCheck: e.blend ? { ...qb, kind: 'letter', options } : {
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
// Every world ends with a Review Stop (owner rule, World 3 build): after lessons 6, 17 and 25 (the end of Starter Station, Green Valley and Sunny Hills),
// with more inside the worlds. The ids are fixed (never renumbered: a saved result is keyed by id), so v1 to v5 stay where they were and the new stops are v6 to v9.
const REVIEW_AFTER = [[3, 'v1'], [6, 'v6'], [9, 'v2'], [12, 'v3'], [15, 'v4'], [17, 'v5'], [20, 'v7'], [23, 'v8'], [25, 'v9'], [30, 'v10'], [33, 'v11'], [38, 'v12'], [42, 'v13']];
const REVIEW_PLANS = {
  // three sounds only: Green Light needs a fourth letter for its lamps. The first stop also has the child's first word: ma, then mama (the 'read' step)
  3: [['hunt', 3], ['wagons', 2], ['hunt', 1], ['read', 3, ['ma', 'mama']], ['check', 2]],
  9: [['hunt', 8], ['signals', 9], ['wagons', 6], ['check', 8]],
  12: [['board', 12], ['wagons', 11], ['hunt', 7], ['check', 12]],
  15: [['wagons', 15], ['hunt', 13], ['board', 10], ['check', 14]],
  17: [['board', 17], ['hunt', 16], ['signals', 11], ['check', 16]],
  // World 1 ends here (Story 2 sits at the same stop): the six sounds m a s i t p, with the three newest leading
  6: [['hunt', 6], ['wagons', 5], ['signals', 2], ['check', 6]],
  // Sunny Hills: e j w, then v y z, then the last stop mixes all five short vowels (a i o u e): one activity on each, Ticket Check on a (a letter question)
  20: [['wagons', 20], ['hunt', 19], ['signals', 4], ['check', 20]], // Wagon Parade on w also deals j and e; Letter Hunt on j deals e; Green Light on i keeps e and i apart
  23: [['board', 23], ['signals', 22], ['wagons', 7], ['check', 22]], // f is the unvoiced partner of v
  25: [['hunt', 18], ['wagons', 13], ['signals', 8], ['hunt', 4], ['check', 2]],
  // Digraph Docks: the middle stop leans on th ck ff (with sh from before); the last stop mixes all the digraphs (the games deal each lesson's sound with the earlier ones)
  30: [['signals', 30], ['hunt', 28], ['board', 29], ['check', 26]],
  33: [['wagons', 33], ['signals', 31], ['hunt', 29], ['board', 27], ['check', 30]],
  // Blend Bay: the middle stop leans on the three newest blend lessons (36 37 38) and an older one; the last stop mixes every family (each game deals its lesson's pairs with the ones before it)
  38: [['hunt', 38], ['wagons', 36], ['chains', 37], ['check', 35]],
  42: [['wagons', 41], ['hunt', 40], ['chains', 42], ['signals', 39], ['check', 38]],
};
// Ticket Check is always a letter question (lessons 2, 4, 6 ...): its wrong cards are letters taught by then, where a picture question
// shows pictures (and their words) that begin with letters not taught yet.
// The grown-up's message at the end of a stop: N sounds taught (c/k and qu count once each: one lesson is one sound) and W, how many words of
const NAMES = new Set(['sam', 'tim', 'pam', 'pip', 'kim', 'ben', 'ted', 'dan', 'meg', 'jen', 'jim', 'tom', 'bob', 'nan', 'pat']);
// data/words-decodable.json use only the letters taught by then. W is counted here, never typed. The examples are a sample of those words,
// favouring words the child has already met in the lessons and books, then words that use the newest letters; at most 8 (all of them when fewer).
const WORDS_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/words-decodable.json'), 'utf8'));
const WORD_LIST = [...WORDS_JSON.words, ...(WORDS_JSON.blendWords || [])];
const BLEND_ONLY = new Set(WORDS_JSON.blendWords || []);
for (const w of BLEND_ONLY) if (WORDS_JSON.words.includes(w) || !isReadableBlends(w, lettersOfSounds(ORDER_SOUNDS))) throw new Error('blendWords: "' + w + '" is in the old list or is not readable once every blend is taught');
const readableNow = (w, taught) => (BLEND_ONLY.has(w) ? isReadableBlends(w, taught) : isReadable(w, taught));
// The words a child has met in the lessons: those of lessons 1 to 33 for every stop (as before World 5, so no earlier stop changes), and of the World 5 lessons up to the stop's own.
const metBy = (after) => new Set([...c.lessons.filter((L) => L.number <= Math.max(33, after)).flatMap((L) => [...L.sayingSounds.map((w) => w.word), ...(L.board || []).map((b) => b.word)]), ...Object.entries(c.sounds).filter(([k]) => ORDER_SOUNDS.indexOf(k) < Math.max(33, after)).flatMap(([, x]) => x.words.map((w) => w.word))]);
// Add a Car (task 'chains', js/screens/tasks/chains.js): a word train gains one letter car to make a new word (top, stop). `from` and `to` differ by one letter unit; the
// child picks the car from three (the right one and two that make no word there). Every word is spelt with letters, digraphs and blends taught by the lesson.
const CHAINS = {
  34: [['pat', 'past'], ['bet', 'best'], ['lot', 'lost'], ['lit', 'lift']],
  35: [['sad', 'sand'], ['cap', 'camp'], ['bet', 'bent'], ['ten', 'tent'], ['lap', 'lamp'], ['had', 'hand']],
  36: [['top', 'stop'], ['pin', 'spin'], ['pot', 'spot'], ['sip', 'skip']],
  37: [['sap', 'snap'], ['lip', 'slip'], ['wing', 'swing'], ['mash', 'smash']],
  38: [['lack', 'black'], ['cap', 'clap'], ['lip', 'flip'], ['lag', 'flag'], ['lock', 'block']],
  39: [['pan', 'plan'], ['pug', 'plug'], ['pot', 'plot'], ['lad', 'glad']],
  40: [['rip', 'trip'], ['cab', 'crab'], ['rush', 'brush'], ['rag', 'brag'], ['rib', 'crib']],
  41: [['rip', 'drip'], ['fog', 'frog'], ['rum', 'drum'], ['gin', 'grin'], ['rub', 'grub']],
  42: [['rust', 'crust'], ['pant', 'plant'], ['band', 'bland'], ['sand', 'stand'], ['lump', 'plump'], ['camp', 'cramp'], ['last', 'blast']],
};
const KNOWN = new Set([...WORD_LIST, ...WORD_BANK, ...DOCKS_BANK]);
const CAR_LETTERS = [...'bcdfghjklmnprstwz'];
function chainsFor(n) {
  const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, n));
  return (CHAINS[n] || []).map(([from, to]) => {
    for (const w of [from, to]) if (!isReadableBlends(w, taught)) throw new Error(`lesson ${n} chain: "${w}" is not readable by lesson ${n}`);
    const a = letterUnits(from, n), b = letterUnits(to, n);
    const at = b.findIndex((u, i) => u !== a[i]);
    if (b.length !== a.length + 1 || at < 0 || b.filter((_, i) => i !== at).join('') !== a.join('')) throw new Error(`lesson ${n} chain ${from} to ${to}: not one added letter`);
    const letter = b[at], form = (u) => [...a.slice(0, at), u, ...a.slice(at)].join('');
    const fake = CAR_LETTERS.filter((u) => u !== letter && u !== a[at - 1] && u !== a[at] && !KNOWN.has(form(u)) && !(u + letter === 'sc') && ![letter + u, u + letter].some((x) => x === 'xx'));
    const opts = [letter, fake[(n + at) % fake.length], fake[(n + at + 5) % fake.length]];
    if (new Set(opts).size < 3) throw new Error(`lesson ${n} chain ${from}: no distractors`);
    return { from, to, at, letter, options: opts };
  });
}
for (const L of c.lessons) { delete L.chains; if (CHAINS[L.number]) L.chains = chainsFor(L.number); }


function reviewSummary(after) {
  const met = metBy(after);
  const sounds = ORDER_SOUNDS.slice(0, after), taught = lettersOfSounds(sounds), newest = lettersOfSounds(sounds.slice(-3));
  const readable = WORD_LIST.filter((w) => readableNow(w, taught));
  const newPairs = new Set(sounds.filter((k) => k in BLENDS).slice(-3).flatMap((k) => BLENDS[k])); // World 5: the words that use the newest blends lead
  const score = (w) => (met.has(w) ? 100 : 0) + (after > 33 ? blendPairsIn(w).filter((q) => newPairs.has(q)).length * 40 : 0) + [...new Set(letterUnits(w, taught))].filter((ch) => newest.has(ch)).length * 10 + Math.min(w.length, 4);
  const examples = readable.map((w, i) => ({ w, i })).sort((a, b) => score(b.w) - score(a.w) || a.i - b.i).slice(0, 8).map((x) => (NAMES.has(x.w) ? x.w[0].toUpperCase() + x.w.slice(1) : x.w)); // names are shown capitalised (Sam)
  const blends = new Set(sounds.flatMap((k) => (isBlendKey(k) && k !== 'mix' ? BLENDS[k] : []))).size;
  return { sounds: sounds.filter((k) => !isBlendKey(k)).length, ...(blends ? { blends } : {}), words: readable.length, examples, hearts: HEART.filter((x) => x.n <= after).map((x) => x.w) };
}
REVIEW_AFTER.forEach(([after, id]) => {
  if (after > c.lessons.length) return;
  const plan = REVIEW_PLANS[after].map(([task, lesson, words]) => {
    const L = c.lessons[lesson - 1];
    if (lesson > after || !L) throw new Error(`review stop after ${after}: lesson ${lesson} is not taught yet`);
    if (task === 'signals' && lesson < 2) throw new Error('Green Light needs two sounds');
    if (task === 'check' && L.quickCheck.kind !== 'letter') throw new Error(`review stop after ${after}: lesson ${lesson}'s Ticket Check is a picture question`);
    if (task === 'chains' && !(L.chains || []).length) throw new Error(`review stop after ${after}: lesson ${lesson} has no chains`);
    if (task === 'board' && !L.board) throw new Error(`review stop after ${after}: lesson ${lesson} has no Station Board words`);
    if (task === 'read') for (const w of words) if (!isReadable(w, lettersOfSounds(ORDER_SOUNDS.slice(0, after)))) throw new Error(`review stop after ${after}: "${w}" is not readable yet`);
    return { task, lesson, ...(words ? { words } : {}) };
  });
  if (plan[plan.length - 1].task !== 'check') throw new Error('Ticket Check comes last');
  c.checkpoints.push({ id, kind: 'review', title: 'Review Stop', after, ...(after === 25 ? { mix: 'vowels' } : after === 33 ? { mix: 'digraphs' } : after === 42 ? { mix: 'blends' } : {}), summary: reviewSummary(after), plan });
});

// Tricky Sounds (checkpoint kind "contrast", ids x1 to x8; docs/LESSON-REBUILD.md section 12): a stop that sets two easily mixed sounds side by side.
// Each has Two Tunnels (sort a letter or a word by its sound), Which One? (a minimal pair: the grown-up says one word, the child taps it),
// Green Light on just the two sounds, then a short Ticket Check (a letter question). `sides` are the tunnels; `pairs` the minimal pairs [word of side one,
// word of side two]; every word is spelt with letters taught by `after`. A pair gets pictures only when BOTH words have a tile on disk.
const TILE_DIR = path.join(ROOT, 'assets/images/mentava/web');
const tileFor = (w) => { for (const d of fs.readdirSync(TILE_DIR)) if (fs.existsSync(path.join(TILE_DIR, d, w + '.webp'))) return `assets/images/mentava/web/${d}/${w}.webp`; return null; };
const CONTRAST = [
  { id: 'x1', after: 9, pair: ['m', 'n'], check: ['n', 'm', 's'],
    sides: [{ sign: ['m'], letters: ['m'], words: ['map', 'mat', 'mop', 'mom'] }, { sign: ['n'], letters: ['n'], words: ['nap', 'nip', 'not', 'nan'] }],
    pairs: [['map', 'nap'], ['am', 'an']] },
  { id: 'x2', after: 12, pair: ['h', 'a'], check: ['h', 'a', 's'], hint: "Breathe it out, like fogging a mirror: h-. No 'huh.'",
    line: "Easy to miss: the breath sound h-. A word can start with it or not, like hat and at. Let's listen closely.", end: 'Great listening! Your child can hear when a word starts with h- and when it does not.',
    sides: [{ sign: ['h'], letters: ['h'], words: ['hat', 'hit', 'ham', 'hop', 'hot', 'him'] }, { signText: 'no h', letters: ['a', 'i', 'o'], words: ['at', 'it', 'am', 'as', 'an', 'on'] }],
    pairs: [['hat', 'at'], ['hit', 'it'], ['ham', 'am'], ['has', 'as']] },
  { id: 'x3', after: 14, pair: ['c', 'g'], check: ['g', 'c', 'm'],
    sides: [{ sign: ['c', 'k'], letters: ['c', 'k'], words: ['cat', 'cap', 'cot', 'cup', 'kid', 'kit'] }, { sign: ['g'], letters: ['g'], words: ['gap', 'got', 'gum', 'gas', 'gift'] }],
    pairs: [['cap', 'gap'], ['cot', 'got']] },
  { id: 'x4', after: 17, pair: ['b', 'd'], check: ['d', 'b', 'm'],
    sides: [{ sign: ['b'], letters: ['b'], words: ['big', 'bad', 'bug', 'bib', 'bus', 'bat'] }, { sign: ['d'], letters: ['d'], words: ['dad', 'dig', 'dug', 'did', 'dog', 'dip'] }],
    pairs: [['bad', 'dad'], ['big', 'dig'], ['bug', 'dug'], ['bib', 'did']] },
  { id: 'x5', after: 18, pair: ['i', 'e'], check: ['e', 'i', 'm'], mode: 'vowel',
    sides: [{ sign: ['i'], letters: ['i'], words: ['pin', 'bit', 'tin', 'sit', 'pig', 'lip'] }, { sign: ['e'], letters: ['e'], words: ['pen', 'bet', 'ten', 'set', 'hen', 'leg'] }],
    pairs: [['pin', 'pen'], ['bit', 'bet'], ['tin', 'ten'], ['sit', 'set']] },
  { id: 'x6', after: 21, pair: ['f', 'v'], check: ['v', 'f', 'm'],
    sides: [{ sign: ['f'], letters: ['f'], words: ['fan', 'fit', 'fig', 'fun', 'fed', 'fat'] }, { sign: ['v'], letters: ['v'], words: ['van', 'vet', 'vat', 'vest'] }],
    pairs: [['fan', 'van'], ['fat', 'vat']] },
  { id: 'x7', after: 22, pair: ['w', 'y'], check: ['y', 'w', 't'], whichLetters: 2,
    sides: [{ sign: ['w'], letters: ['w'], words: ['wet', 'web', 'wig', 'wag', 'win'] }, { sign: ['y'], letters: ['y'], words: ['yet', 'yes', 'yam', 'yum', 'yap'] }],
    pairs: [['wet', 'yet']] },
  { id: 'x8', after: 23, pair: ['s', 'z'], check: ['z', 's', 'm'],
    sides: [{ sign: ['s'], letters: ['s'], words: ['sit', 'sad', 'sun', 'sap', 'sip', 'set'] }, { sign: ['z'], letters: ['z'], words: ['zip', 'zap', 'zest', 'zigzag'] }],
    pairs: [['sip', 'zip'], ['sap', 'zap']] },
  // Digraph Docks: sh and ch (the two that sound alike), then th and t. Pairs differ in the first sound; a picture shows only when both words have a tile (ship has one, chip does not yet).
  { id: 'x9', after: 27, pair: ['sh', 'ch'], check: ['ch', 'sh', 'm'],
    sides: [{ sign: ['sh'], letters: ['sh'], words: ['ship', 'shop', 'shed', 'shin', 'shut'] }, { sign: ['ch'], letters: ['ch'], words: ['chip', 'chop', 'chat', 'chin', 'chug'] }],
    pairs: [['ship', 'chip'], ['shop', 'chop'], ['shin', 'chin']] },
  { id: 'x10', after: 28, pair: ['th', 't'], check: ['th', 't', 'm'], hint: 'For th the tongue peeks out between the teeth. For t it stays behind the teeth.',
    sides: [{ sign: ['th'], letters: ['th'], words: ['thin', 'that', 'this', 'then', 'thud'] }, { sign: ['t'], letters: ['t'], words: ['tin', 'ten', 'tap', 'tub', 'tip'] }],
    pairs: [['thin', 'tin'], ['then', 'ten']] },
  // Blend Bay: the melted n or m (sad / sand, cap / camp: mode 'ends', the word is sorted by how it ends), then bl against br (l and r are the classic mix-up, blush / brush).
  // A blend lesson's pairs are not new sounds: the tunnels sort a pair (nd mp nt) against the same ending with no n or m (d p t).
  { id: 'x11', after: 35, pair: ['nd', 'd'], check: ['nd', 'd', 'mp'], mode: 'ends', hint: 'Listen for the nnn or mmm that melts into the vowel: sand has it, sad does not.',
    line: "Easy to miss: the n or m that melts into the vowel. Sand has it, sad does not. Let's listen closely.", end: 'Great listening! Your child can hear the n or m in sand, camp and tent, and when it is missing.',
    sides: [{ sign: ['nd', 'mp', 'nt'], letters: ['nd', 'mp', 'nt'], words: ['sand', 'hand', 'lamp', 'camp', 'bent', 'tent'] }, { sign: ['d', 'p', 't'], letters: ['d', 'p', 't'], words: ['sad', 'had', 'lap', 'cap', 'bet', 'pat'] }],
    pairs: [['sand', 'sad'], ['camp', 'cap'], ['bent', 'bet'], ['lamp', 'lap']] },
  { id: 'x12', after: 41, pair: ['bl', 'br'], check: ['br', 'bl', 'cr'], hint: 'For bl the tongue touches behind the top teeth. For br it pulls back and stays away.',
    sides: [{ sign: ['bl'], letters: ['bl'], words: ['black', 'block', 'blob', 'blot', 'blush', 'bled'] }, { sign: ['br'], letters: ['br'], words: ['brag', 'brat', 'brim', 'brush', 'brisk', 'brick'] }],
    pairs: [['blush', 'brush'], ['bled', 'bred'], ['blink', 'brink']] },
];
const contrastStops = [];
const say2 = (k) => { const s = c.sounds[k]; return s.asIn ? `${s.sayItLike} as in ${s.asIn}` : s.sayItLike; };
for (const x of CONTRAST) {
  if (x.after > c.lessons.length) continue;
  const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, x.after));
  const first = (side, w) => (x.mode === 'ends' ? side.letters.some((l) => w.endsWith(l)) && !x.sides.some((o) => o !== side && o.letters.some((l) => l.length > 1 && w.endsWith(l))) : x.mode === 'vowel' ? w.includes(side.letters[0]) && !x.sides.some((o) => o !== side && w.includes(o.letters[0])) : side.letters.some((l) => w.startsWith(l)) && !x.sides.some((o) => o !== side && o.letters.some((l) => l.length > 1 && w.startsWith(l))));
  const inSide = (side, w) => side.letters.some((l) => w.includes(l)) && !x.sides.some((o) => o !== side && o.letters.some((l) => w.includes(l))); // a pair may differ at the end (am / an)
  for (const side of x.sides) for (const w of side.words) if (!(x.after >= 34 ? isReadableBlends : isReadable)(w, taught) || !first(side, w)) throw new Error(`${x.id}: "${w}" is not a decodable word of its tunnel`);
  for (const [a, b] of x.pairs) if (![a, b].every((w, i) => (x.after >= 34 ? isReadableBlends : isReadable)(w, taught) && (first(x.sides[i], w) || inSide(x.sides[i], w)))) throw new Error(`${x.id}: pair ${a}/${b} is not decodable or sits in the wrong tunnel`);
  for (const k of [...x.pair, ...x.check]) if (!taught.has(k) && !ORDER_SOUNDS.slice(0, x.after).includes(k)) throw new Error(`${x.id}: ${k} is not taught yet`);
  const [key, mate, other] = x.check;
  const ask = 'Which letter says', quiet = 'Listen to your grown-up. Then touch the letter.';
  const sk = c.sounds[key], tail = sk.asIn ? [{ tts: `as in ${sk.asIn}.` }] : [];
  const pairs = x.pairs.map(([a, b]) => { const ia = tileFor(a), ib = tileFor(b); return { a, b, ...(ia && ib ? { images: { [a]: ia, [b]: ib } } : {}) }; });
  const A = x.pair.map(say2);
  contrastStops.push({ id: x.id, kind: 'contrast', title: 'Tricky Sounds', after: x.after, pair: x.pair, sides: x.sides, pairs, ...(x.whichLetters ? { whichLetters: x.whichLetters } : {}), ...(x.mode === 'ends' ? { mode: 'ends' } : {}), ...(x.hint ? { hint: x.hint } : {}),
    line: x.line || `Two sounds that are easy to mix up: ${A[0]} and ${A[1]}. Let's listen closely.`,
    end: x.end || `Great listening! Your child can tell ${A[0]} from ${A[1]}.`,
    quickCheck: { prompt: [{ tts: ask }, { clip: key }, ...tail], promptQuiet: [{ tts: quiet }], promptText: `${ask} ${say2(key)}?`, promptTextQuiet: quiet, kind: 'letter', options: [key, mate, other].map((g, i) => ({ glyph: g, correct: i === 0 })) },
    plan: [{ task: 'tunnels' }, { task: 'which' }, { task: 'signals', lesson: x.after, pair: x.pair }, { task: 'check', lesson: x.after }] });
}
// On the line a Tricky Sounds stop comes before the Review Stop that follows the same lesson (a world still ends with its Review Stop).
c.checkpoints.splice(c.checkpoints.findIndex((k) => k.kind === 'review'), 0, ...contrastStops);

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
  e: { voice: true, text: 'Open your mouth a little, a bit wider than for i. Keep your tongue forward and relaxed. Voice on.' },
  j: { voice: true, text: 'Round your lips a little. Press your tongue up, then let the sound burst out. Voice on.' },
  w: { voice: true, text: 'Round your lips like a small O, then open them quickly. Voice on.' },
  v: { voice: true, text: 'Top teeth on your bottom lip, like f. Now turn your voice on and feel the buzz. Voice on.' },
  y: { voice: true, text: 'Smile a little. Lift the middle of your tongue, then let it glide down. Voice on.' },
  z: { voice: true, text: 'Teeth close together, like s. Now turn your voice on and feel the buzz. Voice on.' },
  x: { voice: false, text: 'Two quick sounds: tap the back of your tongue up (k), then blow air through your teeth (s). Voice off.' },
  q: { voice: true, text: 'Lift the back of your tongue (k), then round your lips (w). Say both quickly as one sound. Voice on.' }, // qu: one unit, kw-
  // Digraph Docks: two letters, one sound
  sh: { voice: false, text: 'Round your lips a little and close your teeth. Blow a long stream of air. Voice off.' },
  ch: { voice: false, text: 'Round your lips, then let a quick burst of air out through your teeth, like a sneeze. Voice off.' },
  th: { voice: false, text: 'Poke your tongue tip out between your teeth and blow air, as in thin. Voice off.' }, // the buzzing th (that) is in the grown-up note
  ck: { voice: false, text: 'Lift the back of your tongue, then drop it with a quick puff of air, like c and k. Voice off.' },
  ff: { voice: false, text: 'Two letters, one sound, the same as the single letter. Say it once: top teeth on your bottom lip for ff. Voice off.' },
  wh: { voice: true, text: 'Round your lips like a small O, then open them quickly, just like w. Voice on.' },
  ng: { voice: true, text: 'Lift the back of your tongue to the roof of your mouth and hum through your nose. Voice on.' },
  nk: { voice: true, text: 'Lift the back of your tongue and hum through your nose, then end with a quick puff, like k. Voice on.' },
  // Blend Bay: two sounds that glide together; each letter keeps its own sound
  st: { voice: false, text: 'Hold the s: teeth together, thin air. Then tap your tongue behind your top teeth for t. Glide. Voice off.' },
  nd: { voice: true, text: 'Hum the n or m, tongue up behind your top teeth. Then tap out d, p or t. The hum melts into the vowel. Voice on.' },
  sp: { voice: false, text: 'Hold the s, then slide straight into p (lips pop) or k (back of the tongue). Glide, no uh. Voice off.' },
  sn: { voice: true, text: 'Hold the s, then slide into n or m (hum), w (round lips) or l (tongue up). Glide, no uh. Voice on.' },
  bl: { voice: true, text: 'Say the first sound and glide straight into l, tongue behind your top teeth. Quick, no uh. Voice on.' },
  pl: { voice: true, text: 'Pop the p or g and glide straight into l, tongue behind your top teeth. No uh. Voice on.' },
  br: { voice: true, text: 'Say the first sound and glide straight into r, tongue pulled back. Quick, no uh. Voice on.' },
  dr: { voice: true, text: 'Say d, f or g and glide straight into r, tongue pulled back. No uh. Voice on.' },
  mix: { voice: true, text: 'Glide each pair, at the start, the end, or both: stamp. Keep every letter sound, no uh. Voice on.' },
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


// Heart words: the table above, into the data. A lesson names the words it teaches (`heart`); `heartWords` holds each word's parts and its phrase.
// The step sits in tasksFor (js/lessons.js) after Watch My Mouth. Never more than 2 a lesson.
c.heartWords = {};
for (const L of c.lessons) delete L.heart;
for (const x of HEART.filter((y) => y.n <= c.lessons.length)) {
  if (x.parts.map((q) => q.t).join('').toLowerCase() !== x.w.toLowerCase()) throw new Error('heart word parts do not spell ' + x.w);
  c.heartWords[x.w] = { word: x.w, parts: x.parts, tricky: x.tricky, phrase: x.phrase, find: x.find };
  const L = c.lessons[x.n - 1];
  L.heart = [...(L.heart || []), x.w];
  if (L.heart.length > 2) throw new Error(`lesson ${x.n} has more than 2 heart words`);
}

// Milestones (docs/PLAN-v1.9.md). A level is earned when its `after` lesson is done; after is null while a needed sound
// is not built yet. Keep levels 4 to 15 sounds apart. Level two is the end of Green Valley (World 2): all 17 sounds of lessons 1 to 17; level three is the end of Sunny Hills (World 3): all 25
// (k is the second spelling of c, so it is not a separate need). Later levels name the sounds still to build.
const ALL42 = ORDER_SOUNDS, ALL33 = ORDER_SOUNDS.slice(0, 33), ALL25 = ORDER_SOUNDS.slice(0, 25), ALL17 = ORDER_SOUNDS.slice(0, 17);
const LEVELS = [
  { id: 'L1', n: 1, car: 'caboose', needs: ['m', 'a', 's', 'i', 't', 'p'] },
  { id: 'L2', n: 2, car: 'coach', needs: ALL17 },
  { id: 'L3', n: 3, car: 'flatbed', needs: ALL25 },
  { id: 'L4', n: 4, car: 'tanker', needs: ALL33 },
  { id: 'L5', n: 5, car: 'dome', needs: ALL42 },
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

// Wording passes over the hand-made part (sound a, lessons 1 to 3): the grown-up's stretched vowel, hyphenated grown-up.
if (c.sounds.a) { c.sounds.a.sayItLike = 'aaa'; c.sounds.a.howTo = c.sounds.a.howTo.replace(/Say a as in/, 'Say aaa as in').replace('Open your mouth wide, as if about to bite an apple.', 'Open wide, as if to bite an apple.'); }
fs.writeFileSync(FILE, JSON.stringify(c, null, 2).replace(/grown up\b/g, 'grown-up').replace(/\ba as in apple/g, 'aaa as in apple') + '\n');

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
sw = sw.replace(/OPTIONAL_FILES\.push\('assets\/audio\/heart\/[^;]*;/, `OPTIONAL_FILES.push(${Object.keys(c.heartWords).map((w) => `'assets/audio/heart/${w.toLowerCase()}.mp3'`).join(', ')});`);
fs.writeFileSync(SW, sw);
console.log(`gen-lessons: ${c.lessons.length} lessons, ${Object.keys(c.sounds).length} sounds, ${c.levels.filter((v) => v.after !== null).length} built levels, ${c.checkpoints.length} checkpoints, ${list.length} tiles in the precache list`);
