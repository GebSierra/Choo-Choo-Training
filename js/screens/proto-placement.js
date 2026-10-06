import { h, icon, animate } from '../dom.js';
import { glyphSvg, wordSvg } from '../glyphs.js';
import { centerGlyph } from '../components/letter-face.js';
import { accentOf } from '../theme.js';
import { judgeBar } from '../components/judge-bar.js';
import { WORD_BANK } from '../games-data.js';
import { INK, fadeIn, dotRow } from './tasks/proto/kit.js';

// PROTOTYPE 6, part B: the placement check (docs/CURRICULUM.md section 10), led by the grown-up, at #/proto/placement, reached from
// Grownups > Previews. It must not feel like a test to the child: "Let's see what you already know!".
//   Part 1  letter sounds: the letters of the built lessons in teaching order, one at a time, big. The child says the sound; the
//           grown-up taps "Knows it" or "Not yet". It stops after 3 "Not yet" in a row, or at the end.
//   Part 2  blending: up to 4 short words built only from the sounds known; the child reads, the grown-up judges. It stops after 2 misses.
//   Result  a card for the grown-up: "Suggested start: Lesson N (sound x)" and one line why.
// Nothing is written: no progress, no setting. "Start here" is switched off in this preview.
export const NOT_YET_RUN = 3, MISS_LIMIT = 2, WORD_COUNT = 4;

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

// The suggested lesson: the first lesson whose sound was "Not yet" (or the last lesson, when none was), but never past a lesson
// whose words could not be blended (a missed word caps it at the lesson that teaches its newest sound). Nothing known: Lesson 1.
export function suggestStart({ lessons, known, notYet, read, missed, blendSkipped }) {
  const sounds = lessons.map((l) => l.sound);
  const at = (c) => sounds.indexOf(c) + 1;
  const last = lessons.length;
  const firstNo = lessons.find((l) => notYet.has(l.sound));
  let n = firstNo ? firstNo.number : last;
  for (const w of missed) n = Math.min(n, Math.max(...[...w].map(at)));
  const none = known.size === 0;
  if (none) n = 1;
  const lesson = lessons.find((l) => l.number === n) || lessons[0];
  const ks = sounds.filter((c) => known.has(c));
  let why;
  if (none) why = 'Your child did not know a sound yet, so we start at the beginning.';
  else {
    why = `Your child knows ${ks.join(' ')}`;
    if (read.length) why += ` and can blend ${read.join(', ')}`;
    if (missed.length) why += `${read.length ? '; ' : ', '}but blending ${missed.join(' and ')} was not smooth yet`;
    why += '.';
    if (blendSkipped) why += ' Not enough sounds yet to try blending.';
    if (!firstNo && !missed.length) why += ' That is the last lesson built so far.';
  }
  return { number: lesson.number, sound: lesson.sound, why, soundPlayFirst: none };
}

export async function placementScreen(ctx) {
  const { router, curriculum } = ctx;
  const lessons = curriculum.lessons.map((l) => ({ number: l.number, sound: l.sound }));
  const sounds = lessons.map((l) => l.sound);
  const known = new Set(), notYet = new Set(), read = [], missed = [];
  let phase = 'intro', pos = 0, run = 0, words = [], wpos = 0, blendSkipped = false, gen = 0;

  const back = () => { ctx.gate = { openedAt: ctx.guOpenedAt || Date.now() }; router.go('/grownups'); };
  const host = h('div', { class: 'pc-host' });
  const el = h('div', { class: 'proto placement', dataset: { phase: 'intro' } }, host);
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

  // ---- intro ----
  function showIntro() {
    setPhase('intro');
    pad(h('div', { class: 'pc-welcome' }, h('h2', {}, "Let's see what you already know!"), h('p', {}, 'A few letters and a few words, just for fun.')),
      note('First your child says the sounds of some letters. Then, if your child knows enough sounds, a few short words. Tap Knows it or Not yet, and keep it light and playful.'),
      h('button', { class: 'btn big pc-begin', type: 'button', onclick: () => { gen++; showLetter(); } }, 'Begin', icon('arrowRight', 24)));
  }

  // ---- part 1: letter sounds ----
  function showLetter() {
    setPhase('letters');
    const key = sounds[pos], g = ++gen;
    el.dataset.pos = String(pos); el.dataset.letter = key;
    const judge = judgeBar({ gotText: 'Knows it', helpText: 'Not yet', label: 'For the grown-up: does your child know this sound?', onGot: () => answer(g, true), onHelp: () => answer(g, false) });
    const card = h('div', { class: 'rc-card pc-card', dataset: { letter: key } },
      h('p', { class: 'rc-say' }, 'Say its sound'),
      h('span', { class: 'rc-glyph' }, centerGlyph(glyphSvg(key, { color: accentOf(key), label: 'the letter to say' }), key)));
    pad(h('p', { class: 'px-chip' }, 'Part 1: letter sounds'), card, note('Your child says the sound. Do not say it first.'), judge.el);
  }
  function answer(g, yes) {
    if (g !== gen) return;
    gen++;
    const key = sounds[pos];
    if (yes) { known.add(key); run = 0; } else { notYet.add(key); run++; }
    pos++;
    if (run >= NOT_YET_RUN || pos >= sounds.length) { startWords(); return; }
    showLetter();
  }

  // ---- part 2: blending ----
  function startWords() {
    words = pickWords(sounds, known);
    wpos = 0;
    if (!words.length) { blendSkipped = known.size > 0; showResult(); return; }
    showWord();
  }
  function showWord() {
    setPhase('words');
    const w = words[wpos], g = ++gen;
    el.dataset.word = w; el.dataset.pos = String(wpos);
    const art = wordSvg(w, { color: INK, all: true, label: w });
    art.style.width = `calc(var(--cap, 96px) * ${Number(art.dataset.width) / Number(art.dataset.height)})`;
    art.style.maxWidth = '100%';
    const judge = judgeBar({ gotText: 'Reads it', helpText: 'Not yet', label: 'For the grown-up: did your child read the word?', onGot: () => answerWord(g, true), onHelp: () => answerWord(g, false) });
    const dots = dotRow(words.length); dots.set(wpos);
    pad(dots.el, h('p', { class: 'px-chip' }, 'Part 2: reading words'), h('div', { class: 'pc-word' }, art), note('Your child sounds it out and says the word.'), judge.el);
  }
  function answerWord(g, yes) {
    if (g !== gen) return;
    gen++;
    const w = words[wpos];
    if (yes) read.push(w); else missed.push(w);
    wpos++;
    if (missed.length >= MISS_LIMIT || wpos >= words.length) { showResult(); return; }
    showWord();
  }

  // ---- the result, for the grown-up ----
  function showResult() {
    setPhase('result'); gen++;
    const s = suggestStart({ lessons, known, notYet, read, missed, blendSkipped });
    el.dataset.lesson = String(s.number); el.dataset.sound = s.sound;
    const start = h('button', { class: 'btn big pc-start', type: 'button', disabled: true }, h('span', {}, 'Start here'), h('small', {}, '(preview: nothing changes)'));
    const kids = [h('p', { class: 'px-chip' }, 'All done. Well done!'),
      h('section', { class: 'pc-result', 'aria-label': 'Result for the grown-up' }, h('span', { class: 'judge-tag pc-tag' }, 'For the grown-up'), h('h2', { class: 'pc-suggest' }, `Suggested start: Lesson ${s.number} (sound ${s.sound})`), h('p', { class: 'pc-why' }, s.why)),
      start];
    if (s.soundPlayFirst) kids.splice(2, 0, h('p', { class: 'pc-why pc-play' }, 'Try Sound play first: it gets your child ready for letters.'), h('button', { class: 'btn small ghost pc-playbtn', type: 'button', onclick: () => router.go('/proto/play') }, 'Open Sound play'));
    pad(...kids);
  }

  showIntro();
  root.cleanup = () => { gen++; };
  return root;
}
