import { h, icon, animate } from '../dom.js';
import { glyphSvg, wordSvg } from '../glyphs.js';
import { centerGlyph } from '../components/letter-face.js';
import { accentOf } from '../theme.js';
import { judgeBar } from '../components/judge-bar.js';
import { clipReady } from '../components/say-sound.js';
import { soundText, firstSoundOut } from '../scripts.js';
import { WORD_BANK } from '../games-data.js';
import { INK, fadeIn, dotRow } from './tasks/proto/kit.js';

// PROTOTYPE 6, part B: the placement check (docs/CURRICULUM.md section 10), led by the grown-up, at #/proto/placement, reached from
// Grownups > Previews. It must feel like a game to the child ("Let's see what you already know!"), takes under 5 minutes, and the
// grown-up taps "Knows it" / "Reads it" or a calm "Not yet" (never a red X) while the child answers aloud. Four adaptive steps:
//   1  letter sounds (about 1 min): the lessons' letters in teaching order, one at a time. Stops after 3 "Not yet" in a row or at the
//      end. Teach-and-retest: the first "Not yet" opens a teach card; that letter comes back once 2 letters later (or at the end of
//      the step), and the result only adds a note.
//   2  sound awareness (about 1 min), only when fewer than 4 sounds were known: 3 first-sound items, 3 oral blending items.
//   3  made-up words (about 1 min), only when 10 or more sounds were known: 3 CVC pretend words from known sounds.
//   4  real words and a sentence (about 1 min), only when 2 of the 3 made-up words were read. Stops after 2 misses.
// "Quick re-check: letter sounds only" is step 1 alone. Nothing is written: no progress, no setting. "Start here" is switched off.
export const NOT_YET_RUN = 3, MISS_LIMIT = 2, WORD_COUNT = 4, FEW_SOUNDS = 4, MANY_SOUNDS = 10, MADE_UP_COUNT = 3;
const VOWELS = 'aeiou';

// ---- made-up words ----
// Real CVC words that must never appear as a "made-up" word (WORD_BANK is rejected as well). Err on the side of excluding.
export const REAL_CVC = new Set(`bad bag ban bat bed beg bet bib bid big bin bit bob bog bud bug bum bun bus but buy cab can cap cat cob cod cop cot cow cub cud cup cut
dab dad dam den did dig dim din dip doe dog don dot dud due dug dun duo fab fad fan fat fax fed fee fen few fib fig fin fit fix fog fox fun fur gab gag gap gas gel gem get gig gin god got gum gun gut guy gym
had hag ham has hat hay hem hen her hew hex hid him hip his hit hob hog hop hot how hub hue hug hum hut ice ill imp ink inn ion its jab jag jam jar jaw jay jet jig job jog jot joy jug jut keg ken key kid kin kit
lab lad lag lap law lay led leg let lid lie lip lit log lot low lug mad man map mat max may men met mid mix mob mod mom mop mow mud mug mum nab nag nap net new nib nil nip nit nod nor not now nun nut oak oar oat odd off oil old one opt orb ore our out owl own
pad pal pan pap par pat paw pay peg pen pep per pet pew pie pig pin pit ply pod pop pot pow pub pug pun pup pus put rag ram ran rap rat raw ray red rep rib rid rig rim rip rob rod roe rot row rub rug rum run rut
sad sag sap sat saw say sea see set sew she shy sin sip sir sis sit six ski sky sly sob sod son sop sow soy spa spy sub sum sun sup tab tad tag tan tap tar tat tax tea ten the tie til tin tip tit toe tog tom ton too top tot tow toy tub tug tun two
van vat vet via vim vow wad wag war was wax way web wed wee wet who why wig win wit woe wok won woo wow yak yam yap yaw yea yen yes yet yew yip you zap zed zen zig zip zit zoo
sam tim pam dan ben bill pat pit hal gil gus sal tom tab pip nan nat mat mel meg mim ned sid sis tia tod ann abe ali dot gap nap
nam dat min lib dap bap lin sab dib gib sib mib fid tad mim gil hin san lan gan hap mit tam han lat gam bam lig nid dit`.split(/\s+/));
// Rude, unfortunate or confusing combinations (and near misses of them); never shown, never generated.
export const BLOCKED = new Set(`tit tits fag fap fug fut fud fuk dik dic dyk nig nip pis piss poo pee pus sex sux suk gip git cum cun cok coc kok hoe bum bim pud gad dag fat fap hag mil jew nit tat tut sap pap pop fib ho hos nad nads gat gaz god tom
bit bid pig ass ape rape rap pimp pim pin sip sit hit shit fit fix dim din dun dud dud hum mum mom pap pep pop poop pot pat pit pet pig hoe fim fem pen pec pic pik pil pix tap tip`.split(/\s+/));
export const isRejected = (w) => WORD_BANK.includes(w) || REAL_CVC.has(w) || BLOCKED.has(w) || /^(.)\1$/.test(w);

// A small seeded random generator (the same seed gives the same words).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Consonants that read the same way every time at the start of a CVC word, and at the end (no s, h, j, v, z, l, r: they change the vowel
// or sound like another letter).
const START = 'bdfghjklmnprstvz', END = 'bdfgkmnpt';

// Three CVC made-up words (consonant, short vowel, consonant) built only from known sounds, chosen with a fixed seed. Never a real
// word, never in WORD_BANK, never on the blocklist. They differ in their first letter and vowel where the known sounds allow it.
export function makeUpWords(known, seed, count = MADE_UP_COUNT) {
  const rng = mulberry32(seed);
  const vs = [...VOWELS].filter((c) => known.has(c));
  const cs = [...START].filter((c) => known.has(c)), ce = [...END].filter((c) => known.has(c));
  const pool = [];
  for (const a of cs) for (const v of vs) for (const b of ce) {
    if (a === 'g' && 'ei'.includes(v)) continue; // gim: hard or soft g?
    if (a === b) continue;
    const w = a + v + b;
    if (!isRejected(w)) pool.push(w);
  }
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const picked = [], seenA = new Set(), seenV = new Set(), seenB = new Set();
  while (picked.length < count && pool.length) {
    let best = 0, bestScore = -1;
    pool.forEach((w, i) => { const s = (seenA.has(w[0]) ? 0 : 4) + (seenV.has(w[1]) ? 0 : 2) + (seenB.has(w[2]) ? 0 : 1); if (s > bestScore) { best = i; bestScore = s; } });
    const [w] = pool.splice(best, 1);
    picked.push(w); seenA.add(w[0]); seenV.add(w[1]); seenB.add(w[2]);
  }
  return picked;
}

// ---- real words and the sentence ----
// Up to four words (VC or CVC only, from WORD_BANK, js/games-data.js) built only from known sounds. The first is the easiest; the
// rest each bring in as many not-yet-used sounds as they can, newest lesson first; shown from the easiest to the hardest.
export function pickWords(sounds, known) {
  const at = (c) => sounds.indexOf(c) + 1; // the lesson that teaches c
  const level = (w) => Math.max(...[...w].map(at));
  // Only VC and CVC words (am, sat): blends and doubled letters (band, miss) come in later worlds, so they would not be fair here.
  const pool = [...new Set(WORD_BANK)].filter((w) => /^[^aeiou]?[aeiou][^aeiou]$/.test(w) && [...w].every((c) => known.has(c)));
  if (!pool.length) return [];
  const byEase = [...pool].sort((a, b) => a.length - b.length || level(a) - level(b) || pool.indexOf(a) - pool.indexOf(b));
  const picked = [byEase[0]], seen = new Set(byEase[0]);
  while (picked.length < WORD_COUNT) {
    let best = null, bestScore = -1;
    for (const w of pool) {
      if (picked.includes(w) || w.length < 3) continue;
      const fresh = new Set([...w].filter((c) => !seen.has(c))).size;
      const score = fresh * 100 + level(w);
      if (score > bestScore) { best = w; bestScore = score; }
    }
    if (!best) break;
    picked.push(best); [...best].forEach((c) => seen.add(c));
  }
  return picked.sort((a, b) => a.length - b.length || level(a) - level(b));
}

// One decodable sentence from known sounds and the heart words a, I, is, the; the longest that fits (null when none does).
const HEART = new Set(['a', 'i', 'is', 'the']);
const SENTENCES = ['Sam sat at a map.', 'Pip is in a tin.', 'Dad had a big bag.', 'The pig is big.', 'Pat is at the mat.', 'Tim hid a pin.', 'Sam is a man.', 'I am Sam.', 'Sam sat.'];
export function pickSentence(known) {
  const ok = (word) => { const w = word.toLowerCase().replace(/[.,!?]/g, ''); return HEART.has(w) || (/^[^aeiou]?[aeiou][^aeiou]$/.test(w) && [...w].every((c) => known.has(c))); };
  return SENTENCES.find((s) => s.split(' ').every(ok)) || null;
}

// ---- the result ----
// The suggested lesson is the lesson of the first letter sound that was not known (the last lesson when all were known). When the
// made-up words were weak (1 of 3 or fewer) it moves back to the first lesson whose sound is in a missed made-up word, with
// "Practise blending first". Nothing known: Lesson 1.
export function computeResult({ lessons, known, mode = 'full', retest = null, awareness = null, made = null, real = null, sentence = null }) {
  const sounds = lessons.map((l) => l.sound);
  const at = (c) => sounds.indexOf(c) + 1;
  const lessonOf = (n) => lessons.find((l) => l.number === n) || lessons[0];
  const firstNo = lessons.find((l) => !known.has(l.sound));
  let n = firstNo ? firstNo.number : lessons[lessons.length - 1].number;
  const ks = sounds.filter((c) => known.has(c));
  const weakMade = !!made && made.read.length <= 1;
  let blendFirst = false;
  if (weakMade) {
    const lowest = Math.min(...made.missed.flatMap((w) => [...w].map(at).filter((x) => x > 0)));
    if (Number.isFinite(lowest) && lowest < n) n = lowest;
    blendFirst = true;
  }
  const start = lessonOf(n);
  const weakAware = !!awareness && awareness.right <= 2;
  const parts = [];
  parts.push(ks.length ? `Knows ${ks.join(' ')}` : 'Does not know a letter sound yet');
  if (made && made.read.length) parts.push(`blends made-up words like ${made.read[0]}`);
  if (weakMade) parts.push('made-up words were not smooth yet');
  if (sentence && sentence.read) parts.push(`reads ${sentence.text}`);
  else if (real && real.read.length) parts.push(`reads real words like ${real.read[0]}`);
  const joined = parts.join('; ');
  const why = joined.endsWith('.') ? joined : joined + '.';
  const notes = [];
  if (retest) {
    const l = lessons.find((x) => x.sound === retest.letter);
    notes.push(retest.right ? `Learned ${retest.letter} quickly — a good sign.` : `${retest.letter} was new today. That is fine: Lesson ${l ? l.number : 1} teaches it.`);
  }
  if (awareness) notes.push(weakAware ? 'Hearing the sounds inside words is still new. Sound play builds it, gently and with no letters.' : `Hearing sounds in words is going well (${awareness.right} of 6).`);
  if (blendFirst) notes.push('Practise blending first: sound out short words slowly and smoothly before new letters.');
  if (!firstNo && !blendFirst) notes.push('That is the last lesson built so far.');
  const allKnown = !firstNo;
  const head = mode === 'quick' ? `Letter sounds: ${ks.length} of ${lessons.length}` : `Suggested start: Lesson ${start.number} (sound ${start.sound})`;
  return { number: start.number, sound: start.sound, head, why, notes, blendFirst, soundPlay: weakAware, allKnown, knownCount: ks.length };
}

export async function placementScreen(ctx) {
  const { router, curriculum } = ctx;
  const lessons = curriculum.lessons.map((l) => ({ number: l.number, sound: l.sound }));
  const sounds = lessons.map((l) => l.sound);
  const seed = Number.isInteger(window.__placementSeed) ? window.__placementSeed : Math.floor(Math.random() * 2147483647);
  const known = new Set();
  let mode = 'full', phase = 'intro', pos = 0, run = 0, gen = 0;
  let teach = null; // { key, since, done, right }
  let items = [], ipos = 0, aware = { right: 0 };
  let madeWords = [], made = null, realWords = [], real = null, sentence = null;

  const back = () => { ctx.gate = { openedAt: ctx.guOpenedAt || Date.now() }; router.go('/grownups'); };
  const host = h('div', { class: 'pc-host' });
  const el = h('div', { class: 'proto placement', dataset: { phase: 'intro', seed: String(seed) } }, host);
  const setPhase = (p) => { phase = p; el.dataset.phase = p; };

  const head = h('header', { class: 'task-head' },
    h('button', { class: 'icon-btn light', type: 'button', 'aria-label': 'Back to Grownups', onclick: back }, icon('back', 28)),
    h('h1', {}, 'Placement check'));
  const stage = h('main', { class: 'task-stage c-mint' }, h('div', { class: 'task-activity flush' }, el));
  const later = h('button', { class: 'btn again pc-later', type: 'button', onclick: back }, 'Do this later');
  const foot = h('footer', { class: 'task-foot no-script' }, h('div', { class: 'task-buttons solo' }, later));
  const root = h('div', { class: 'task-screen proto-task proto-placement' }, head, stage, foot);
  animate(stage, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 60 });

  const pad = (...kids) => { host.replaceChildren(h('div', { class: 'rc-pad pc-pad' }, ...kids)); fadeIn(host.firstChild, 220); };
  const note = (t) => h('p', { class: 'pc-note' }, h('strong', {}, 'For the grown-up: '), t);
  const chip = (t) => h('p', { class: 'px-chip' }, t);
  const wordArt = (w) => {
    const art = wordSvg(w, { color: INK, all: true, label: w });
    art.style.width = `calc(var(--cap, 96px) * ${Number(art.dataset.width) / Number(art.dataset.height)})`;
    art.style.maxWidth = '100%';
    return art;
  };

  // ---- intro: the chooser ----
  function showIntro() {
    setPhase('intro');
    pad(h('div', { class: 'pc-welcome' }, h('h2', {}, "Let's see what you already know!"), h('p', {}, 'A few letters and a few words, just for fun.')),
      note('Your child answers out loud. You tap Knows it or Not yet, and keep it light and playful. It takes under 5 minutes.'),
      h('button', { class: 'btn big pc-begin', type: 'button', onclick: () => begin('full') }, 'Begin', icon('arrowRight', 24)),
      h('button', { class: 'btn small ghost pc-quick', type: 'button', onclick: () => begin('quick') }, 'Quick re-check: letter sounds only'),
      h('p', { class: 'pc-fine' }, 'Re-check every few weeks to see growth.'));
  }
  function begin(m) { mode = m; gen++; showLetter(sounds[0]); }

  // ---- step 1: letter sounds, with teach-and-retest ----
  function showLetter(key, retest = false) {
    setPhase('letters');
    const g = ++gen;
    el.dataset.pos = String(pos); el.dataset.letter = key; el.dataset.retest = retest ? '1' : '0';
    const judge = judgeBar({ gotText: 'Knows it', helpText: 'Not yet', label: 'For the grown-up: does your child know this sound?', onGot: () => (retest ? answerRetest(g, true) : answerLetter(g, true)), onHelp: () => (retest ? answerRetest(g, false) : answerLetter(g, false)) });
    const card = h('div', { class: 'rc-card pc-card', dataset: { letter: key } },
      h('p', { class: 'rc-say' }, retest ? "Let's try this one again" : 'Say its sound'),
      h('span', { class: 'rc-glyph' }, centerGlyph(glyphSvg(key, { color: accentOf(key), label: 'the letter to say' }), key)));
    pad(chip(mode === 'quick' ? 'Letter sounds' : 'Step 1: letter sounds'), card, note(retest ? 'Your child says the sound again. Do not say it first.' : 'Your child says the sound. Do not say it first.'), judge.el);
  }
  function nextLetter() {
    const stop = run >= NOT_YET_RUN || pos >= sounds.length;
    if (teach && !teach.done && (stop || teach.since >= 2)) { showLetter(teach.key, true); return; }
    if (stop) { finishLetters(); return; }
    showLetter(sounds[pos]);
  }
  function answerLetter(g, yes) {
    if (g !== gen) return;
    gen++;
    const key = sounds[pos];
    if (yes) { known.add(key); run = 0; } else run++;
    pos++;
    if (teach && !teach.done) teach.since++;
    if (!yes && !teach) { teach = { key, since: 0, done: false, right: null }; showTeach(key); return; }
    nextLetter();
  }
  function answerRetest(g, yes) {
    if (g !== gen) return;
    gen++;
    teach.done = true; teach.right = yes; // a note only: it never changes the start
    nextLetter();
  }
  // The quick teach card for the grown-up: the recording when there is one, else "Say: mmm".
  function showTeach(key) {
    setPhase('teach');
    const g = ++gen;
    el.dataset.letter = key;
    const rec = clipReady(ctx, key);
    const hear = () => ctx.speech.say([{ clip: key }]);
    const card = h('div', { class: 'rc-card pc-card', dataset: { letter: key } },
      h('p', { class: 'rc-say' }, 'A new sound'),
      h('span', { class: 'rc-glyph' }, centerGlyph(glyphSvg(key, { color: accentOf(key), label: 'the letter to learn' }), key)));
    const say = h('p', { class: 'pc-teach' }, h('strong', {}, 'Say: '), `${soundText(key, curriculum.sounds)}${curriculum.sounds[key] && curriculum.sounds[key].asIn ? ` (as in ${curriculum.sounds[key].asIn})` : ''}. Ask your child to say it with you.`);
    const kids = [chip('A quick teach'), card, h('div', { class: 'pc-teachbox' }, h('span', { class: 'judge-tag pc-tag' }, 'For the grown-up'), say)];
    if (rec) kids.push(h('button', { class: 'btn small ghost pc-hear', type: 'button', onclick: hear }, icon('speaker', 22), 'Hear it'));
    kids.push(h('button', { class: 'btn big pc-go', type: 'button', onclick: () => { if (g !== gen) return; gen++; nextLetter(); } }, 'Keep going', icon('arrowRight', 24)));
    pad(...kids);
    if (rec) hear();
  }
  function finishLetters() {
    if (mode === 'quick') { showResult(); return; }
    if (known.size < FEW_SOUNDS) { startAwareness(); return; }
    if (known.size >= MANY_SOUNDS) { startMadeUp(); return; }
    showResult();
  }

  // ---- step 2: sound awareness (fewer than 4 sounds known) ----
  function startAwareness() {
    const first = [['moon', '\u{1F319}'], ['sun', '☀️'], ['fish', '\u{1F41F}']].map(([word, emoji]) => ({ kind: 'first', word, emoji }));
    const blendItems = [['map', '\u{1F5FA}️', ['pig', 'sun']], ['pig', '\u{1F437}', ['cat', 'map']], ['cat', '\u{1F431}', ['sun', 'pig']]].map(([word, emoji, others]) => ({ kind: 'blend', word, emoji, others }));
    items = [...first, ...blendItems]; ipos = 0; aware = { right: 0 };
    showItem();
  }
  const EMOJI = { moon: '\u{1F319}', sun: '☀️', fish: '\u{1F41F}', map: '\u{1F5FA}️', pig: '\u{1F437}', cat: '\u{1F431}' };
  const pic = (emoji, label) => h('span', { class: 'pc-pic', role: 'img', 'aria-label': label }, emoji);
  function showItem() {
    setPhase('awareness');
    const it = items[ipos], g = ++gen;
    el.dataset.item = String(ipos); el.dataset.kind = it.kind; el.dataset.word = it.word;
    const judge = judgeBar({ gotText: 'Knows it', helpText: 'Not yet', label: 'For the grown-up: did your child answer?', onGot: () => answerItem(g, true), onHelp: () => answerItem(g, false) });
    const dots = dotRow(items.length); dots.set(ipos);
    let body, say;
    if (it.kind === 'first') {
      body = h('div', { class: 'pc-scene' }, pic(it.emoji, it.word));
      say = `Ask: What's the first sound in ${firstSoundOut(it.word, curriculum.sounds)}?`;
    } else {
      const order = [it.word, ...it.others]; // the right picture moves with the item so it is not always first
      const shift = ipos % 3; const row = order.map((_, i) => order[(i + shift) % 3]);
      body = h('div', { class: 'pc-scene pc-three' }, ...row.map((w) => pic(EMOJI[w], w)));
      const slow = [...it.word].map((c) => soundText(c, curriculum.sounds)).join('… ');
      say = `Say slowly: ${slow}. Ask: What word?`;
    }
    pad(dots.el, chip('Step 2: sounds in words'), body, note(say), judge.el);
  }
  function answerItem(g, yes) {
    if (g !== gen) return;
    gen++;
    if (yes) aware.right++;
    ipos++;
    if (ipos >= items.length) { showResult(); return; }
    showItem();
  }

  // ---- step 3: made-up words (10 or more sounds known) ----
  function startMadeUp() {
    madeWords = makeUpWords(known, seed);
    made = { words: madeWords, read: [], missed: [] };
    if (!madeWords.length) { made = null; showResult(); return; }
    ipos = 0; showMade();
  }
  function showMade() {
    setPhase('madeup');
    const w = madeWords[ipos], g = ++gen;
    el.dataset.word = w; el.dataset.pos = String(ipos);
    const judge = judgeBar({ gotText: 'Reads it', helpText: 'Not yet', label: 'For the grown-up: did your child blend the whole made-up word?', onGot: () => answerMade(g, true), onHelp: () => answerMade(g, false) });
    const dots = dotRow(madeWords.length); dots.set(ipos);
    pad(dots.el, chip('Step 3: silly made-up words'), h('div', { class: 'pc-word' }, wordArt(w)), note('A pretend word! Your child sounds it out and says it. "Reads it" means the whole word was blended.'), judge.el);
  }
  function answerMade(g, yes) {
    if (g !== gen) return;
    gen++;
    (yes ? made.read : made.missed).push(madeWords[ipos]);
    ipos++;
    if (ipos >= madeWords.length) { if (made.read.length >= 2) startReal(); else showResult(); return; }
    showMade();
  }

  // ---- step 4: real words, then a sentence (2 of 3 made-up words read) ----
  function startReal() {
    realWords = pickWords(sounds, known);
    real = { read: [], missed: [] };
    ipos = 0;
    if (!realWords.length) { startSentence(); return; }
    showReal();
  }
  function showReal() {
    setPhase('words');
    const w = realWords[ipos], g = ++gen;
    el.dataset.word = w; el.dataset.pos = String(ipos);
    const judge = judgeBar({ gotText: 'Reads it', helpText: 'Not yet', label: 'For the grown-up: did your child read the word?', onGot: () => answerReal(g, true), onHelp: () => answerReal(g, false) });
    const dots = dotRow(realWords.length); dots.set(ipos);
    pad(dots.el, chip('Step 4: real words'), h('div', { class: 'pc-word' }, wordArt(w)), note('Your child sounds it out and says the word.'), judge.el);
  }
  function answerReal(g, yes) {
    if (g !== gen) return;
    gen++;
    (yes ? real.read : real.missed).push(realWords[ipos]);
    ipos++;
    if (real.missed.length >= MISS_LIMIT) { showResult(); return; }
    if (ipos >= realWords.length) { startSentence(); return; }
    showReal();
  }
  function startSentence() {
    const text = pickSentence(known);
    if (!text) { showResult(); return; }
    sentence = { text, read: false };
    setPhase('sentence');
    const g = ++gen;
    el.dataset.sentence = text;
    const judge = judgeBar({ gotText: 'Reads it', helpText: 'Not yet', label: 'For the grown-up: did your child read the sentence?', onGot: () => answerSentence(g, true), onHelp: () => answerSentence(g, false) });
    pad(chip('Step 4: a sentence'), h('p', { class: 'pc-sentence' }, text), note('Your child reads the whole sentence, sounding out each word. The words a, I, is and the are taught as whole words.'), judge.el);
  }
  function answerSentence(g, yes) {
    if (g !== gen) return;
    gen++;
    sentence.read = yes;
    showResult();
  }

  // ---- the result, for the grown-up ----
  function showResult() {
    setPhase('result'); gen++;
    const r = computeResult({ lessons, known, mode, retest: teach && teach.done ? { letter: teach.key, right: teach.right } : null, awareness: items.length ? { right: aware.right } : null, made, real, sentence });
    el.dataset.lesson = String(r.number); el.dataset.sound = r.sound; el.dataset.start = r.number + r.sound; el.dataset.blendFirst = r.blendFirst ? '1' : '0';
    const quick = mode === 'quick';
    const start = h('button', { class: 'btn big pc-start', type: 'button', disabled: true }, h('span', {}, 'Start here'), h('small', {}, '(preview: nothing changes)'));
    const box = h('section', { class: 'pc-result', 'aria-label': 'Result for the grown-up' }, h('span', { class: 'judge-tag pc-tag' }, 'For the grown-up'),
      h('h2', { class: 'pc-suggest' }, r.head), h('p', { class: 'pc-why' }, r.why));
    if (quick) box.append(h('p', { class: 'pc-line' }, r.allKnown ? 'That is the last lesson built so far.' : `Next new sound: Lesson ${r.number} (${r.sound}).`), h('p', { class: 'pc-line' }, 'Re-check every few weeks to see growth.'));
    if (r.notes.length) box.append(h('ul', { class: 'pc-notes' }, ...r.notes.filter((n) => !(quick && n.startsWith('That is the last'))).map((n) => h('li', {}, n))));
    if (!quick) box.append(h('p', { class: 'pc-line pc-skip' }, "Lessons before this are skipped, but the first lesson's review still practises them."));
    const kids = [chip('All done. Well done!'), box];
    if (r.soundPlay) kids.push(h('p', { class: 'pc-why pc-play' }, 'Start with Sound play.'), h('button', { class: 'btn small ghost pc-playbtn', type: 'button', onclick: () => router.go('/proto/play') }, 'Open Sound play'));
    if (!quick) kids.push(start);
    pad(...kids);
  }
  showIntro();
  root.cleanup = () => { gen++; };
  return root;
}
