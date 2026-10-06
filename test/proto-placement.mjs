// The placement check (#/proto/placement, Grownups > Previews): four adaptive steps led by the grown-up, plus the quick letter-sound
// re-check (js/screens/proto-placement.js; docs/CURRICULUM.md section 10).
// Checks: the first screen and its two entries; step 1 in teaching order, stopping after 3 "Not yet" in a row; teach-and-retest (the
// card, the retest 2 letters later or at the end, a note and no change to the start); each branch (few sounds: step 2 and no steps 3
// or 4; 10 or more sounds: step 3; good made-up words: step 4; weak made-up words: the start moves back with "Practise blending
// first"); the made-up words over 200 seeded runs (CVC, known sounds only, never in WORD_BANK, the extra real words or the blocklist,
// the same seed gives the same words); the quick re-check runs step 1 alone; the phone's voice never says a sound; nothing is
// written; reduced motion; the idle frame budget (DOM-only screens: at most 2 frames in 3 s); three phone sizes with 48 px targets.
// Run alone with `node test/proto-placement.mjs`; SHOTS=1 also saves screenshots in docs/screenshots/proto-placement/.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage } from './lib.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const ORDER = CUR.lessons.map((l) => l.sound);
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/proto-placement');
const PHONE = { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 };
const SMALL = { name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 };
const LAND = { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 };
const SEEN = {};
const SEED = 7;

const RAF_COUNT = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const tapEl = async (page, loc) => { await loc.first().scrollIntoViewIfNeeded(); const b = await loc.first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
const sel = (page, s) => page.locator(s);
const text = (page, s) => page.evaluate((q) => { const e = document.querySelector(q); return e ? e.textContent.trim() : null; }, s);
const store = (page) => page.evaluate(() => localStorage.getItem('reading.v1'));
const ttsAll = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'tts').map((e) => e.text));
const clips = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'clip').map((e) => e.src));
let shotsOn = true;
const shotOf = async (page, name) => { if (!process.env.SHOTS || !shotsOn) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.waitForTimeout(350); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };
// Never an isolated or stretched sound in anything the phone's voice was asked to say.
const SOUNDY = (t) => /^\s*[a-z]\s*$/i.test(t) || /(^|[^a-z])([a-z])\2{2,}/i.test(t) || /\b[a-z]-(?!\w)/i.test(t) || /\b[a-z]-[a-z]/i.test(t);
const allTts = [];

async function open(browser, url, vp, { settings = {}, reduced = false, seed = SEED } = {}) {
  const made = await newPage(browser, vp, reduced ? { reducedMotion: 'reduce' } : {});
  const { page } = made;
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(RAF_COUNT);
  await page.addInitScript(`window.__placementSeed = ${seed};`);
  await page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: {}, settings: { seenScripts: SEEN, migrated1912: true, ...settings }, firstRunDone: true, meetDue: false })}))`);
  await page.goto(url + '#/home');
  await page.waitForTimeout(500);
  await page.mouse.click(3, 300);
  await page.evaluate(() => { location.hash = '#/proto/placement'; });
  await page.waitForSelector('.proto.placement .pc-begin', { timeout: 8000 });
  await page.waitForTimeout(600);
  made.before = await store(page);
  return made;
}
const state = (page) => page.evaluate(() => { const d = document.querySelector('.proto.placement').dataset; return { phase: d.phase, letter: d.letter, retest: d.retest === '1', kind: d.kind, word: d.word, item: d.item, pos: d.pos, sentence: d.sentence, lesson: d.lesson, sound: d.sound, start: d.start, blendFirst: d.blendFirst, seed: d.seed }; });
const judge = async (page, yes) => {
  await page.waitForSelector('.judge-bar:not([hidden])');
  await page.waitForTimeout(300);
  await tapEl(page, sel(page, yes ? '.judge-btn.got' : '.judge-btn.help'));
  await page.waitForTimeout(120);
};
const begin = async (page, quick = false) => { await tapEl(page, sel(page, quick ? '.pc-quick' : '.pc-begin')); await page.waitForSelector('.rc-card'); await page.waitForTimeout(250); };

// Plays the check: each stream is a string of 'y' and 'n' consumed in the order the screens come (letters, retest, aware, made, real,
// sentence); a stream that runs out says 'y'. Returns the trace of the screens seen. stopAt(state) leaves early; hook(state) runs on every screen.
async function drive(page, streams, { stopAt = null, hook = null } = {}) {
  const idx = {}; const trace = [];
  const take = (k) => { const s = streams[k] || ''; idx[k] = idx[k] || 0; const c = s[idx[k]++]; return c === undefined ? 'y' : c; };
  for (let guard = 0; guard < 120; guard++) {
    const st = await state(page);
    trace.push(st);
    if (hook) await hook(st);
    if (stopAt && stopAt(st)) return trace;
    if (st.phase === 'result') return trace;
    if (st.phase === 'teach') { await tapEl(page, sel(page, '.pc-go')); await page.waitForTimeout(250); continue; }
    const key = st.phase === 'letters' ? (st.retest ? 'retest' : 'letters') : st.phase === 'awareness' ? 'aware' : st.phase === 'madeup' ? 'made' : st.phase === 'words' ? 'real' : 'sentence';
    await judge(page, take(key) === 'y');
  }
  throw new Error('placement did not finish');
}
const seq = (trace, phase) => trace.filter((t) => t.phase === phase);
const phasesOf = (trace) => new Set(trace.map((t) => t.phase));
const lessonOf = (w) => Math.min(...[...w].map((c) => ORDER.indexOf(c) + 1));
const redX = (page) => page.evaluate(() => {
  const stage = document.querySelector('.task-stage'); if (!stage) return 0;
  let n = /[✗✘✕✖❌❎]/.test(stage.textContent) ? 1 : 0;
  for (const e of stage.querySelectorAll('*')) {
    if (/wrong|cross|error|incorrect|\bred\b/i.test(String(e.getAttribute('class') || ''))) n++;
    const c = getComputedStyle(e).backgroundColor.match(/\d+/g);
    if (c && c.length >= 3 && +c[0] > 190 && +c[1] < 110 && +c[2] < 110 && (c[3] === undefined || +c[3] > 0.3)) n++;
  }
  return n;
});
async function idleCheck(page, ok, tag) {
  await page.waitForTimeout(1500);
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(3000);
  const frames = (await page.evaluate(() => window.__raf)) - r0;
  const endless = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect.getComputedTiming().endTime === Infinity).length);
  ok(frames <= 2, `${tag}: at most 2 frames in 3 s while idle (${frames}; the budget for a 3D screen is about 32)`);
  ok(endless === 0, `${tag}: no endless animation (${endless})`);
}
const resultText = async (page) => ({ head: await text(page, '.pc-suggest'), why: await text(page, '.pc-why'), all: await text(page, '.pc-result'), page: await text(page, '.pc-pad') });

// ---- the made-up words, 200 seeded runs (no browser needed for the generator, so it runs inside the page's module graph) ----
async function madeUp({ browser, url, ok }) {
  const made = await open(browser, url, PHONE);
  const { page } = made;
  const r = await page.evaluate(async () => {
    const m = await import('/js/screens/proto-placement.js');
    const g = await import('/js/games-data.js');
    const cur = await (await fetch('data/curriculum.json')).json();
    const order = cur.lessons.map((l) => l.sound);
    const bad = [], sets = [new Set(order), new Set(order.slice(0, 10)), new Set(order.slice(0, 11)), new Set(order.slice(0, 12))];
    let words = 0, short = 0, same = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const known = sets[seed % sets.length];
      const w = m.makeUpWords(known, seed);
      if (w.length !== 3) short++;
      if (JSON.stringify(w) === JSON.stringify(m.makeUpWords(known, seed))) same++;
      if (new Set(w).size !== w.length) bad.push('dup ' + w);
      for (const x of w) {
        words++;
        if (!/^[^aeiou][aeiou][^aeiou]$/.test(x)) bad.push('shape ' + x);
        if ([...x].some((c) => !known.has(c))) bad.push('unknown sound ' + x);
        if (g.WORD_BANK.includes(x)) bad.push('WORD_BANK ' + x);
        if (m.REAL_CVC.has(x)) bad.push('real ' + x);
        if (m.BLOCKED.has(x)) bad.push('blocked ' + x);
      }
    }
    const spread = new Set(Array.from({ length: 200 }, (_, i) => m.makeUpWords(sets[0], i + 1).join())).size;
    return { bad, words, short, same, spread, rejects: ['mad', 'mud', 'sad', 'dog', 'pet', 'bag', 'cut', 'sat', 'map'].map((w) => m.isRejected(w)), blocked: m.BLOCKED.size, real: m.REAL_CVC.size, none: m.makeUpWords(new Set(['m', 'a']), 1).length };
  });
  ok(r.bad.length === 0, `made-up words: 600 words from 200 seeds are CVC, known sounds only, never real, banked or blocked (${r.bad.slice(0, 5).join(' | ')})`);
  ok(r.short === 0 && r.words === 600, `made-up words: always three (${r.words} words, ${r.short} short runs)`);
  ok(r.same === 200, `made-up words: the same seed gives the same words (${r.same}/200)`);
  ok(r.spread > 40, `made-up words: different seeds give different sets (${r.spread} distinct sets)`);
  ok(r.rejects.every(Boolean), `made-up words: mad, mud, sad, dog, pet, bag, cut, sat and map are all rejected (${r.rejects})`);
  ok(r.blocked >= 40 && r.real >= 300, `made-up words: the reject lists exist (${r.blocked} blocked, ${r.real} real words)`);
  ok(r.none === 0, 'made-up words: no vowel known gives no words');
  await made.ctx.close();
}

// ---- the first screen and the quick re-check entry ----
async function firstScreen({ browser, url, ok }) {
  shotsOn = true;
  const made = await open(browser, url, PHONE);
  const { page } = made;
  const t = await text(page, '.pc-pad');
  ok(/Let's see what you already know!/.test((await text(page, '.pc-welcome')) || ''), 'first screen: "Let\'s see what you already know!"');
  ok(!/test|quiz|exam|wrong|fail/i.test((await text(page, '.pc-welcome')) || ''), 'first screen: the child\'s words never say test');
  ok(/under 5 minutes/.test(t), 'first screen: says it takes under 5 minutes');
  ok((await redX(page)) === 0, 'first screen: no red');
  ok((await sel(page, '.pc-begin').count()) === 1 && (await sel(page, '.pc-quick').count()) === 1, 'first screen: Begin and the quick re-check');
  ok(/Quick re-check: letter sounds only/.test((await text(page, '.pc-quick')) || ''), 'first screen: the quick re-check says "Quick re-check: letter sounds only"');
  ok(/Re-check every few weeks to see growth\./.test((await text(page, '.pc-fine')) || ''), 'first screen: "Re-check every few weeks to see growth."');
  ok(await page.evaluate(() => ['.pc-begin', '.pc-quick', '.pc-later'].every((s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.height >= 47.5 && r.width >= 47.5; })), 'first screen: every button is 48 px or more');
  await shotOf(page, '01-first-screen');
  await begin(page);
  const st = await state(page);
  ok(st.phase === 'letters' && st.letter === ORDER[0], `first letter is the first lesson's sound (${st.letter})`);
  ok((await sel(page, '.rc-glyph .glyph').count()) === 1, 'letters: one big letter');
  ok(/Knows it/.test((await text(page, '.judge-btn.got')) || '') && /Not yet/.test((await text(page, '.judge-btn.help')) || ''), 'letters: the buttons say "Knows it" and "Not yet"');
  ok(await page.evaluate(() => [...document.querySelectorAll('.judge-btn')].every((b) => b.getBoundingClientRect().height >= 48)), 'letters: judge buttons are 48 px or more');
  ok((await redX(page)) === 0, 'letters: no red');
  await shotOf(page, '02-letter');
  await idleCheck(page, ok, 'letter card');
  await made.ctx.close();
}

// ---- step 1: order, the stop after 3 in a row, teach-and-retest ----
async function stepOne({ browser, url, ok }) {
  shotsOn = false;
  // all known: every letter in teaching order, no teach card, then straight into step 3 (13 sounds known)
  let made = await open(browser, url, PHONE);
  let { page } = made;
  await begin(page);
  let trace = await drive(page, { letters: 'y'.repeat(ORDER.length) }, { stopAt: (s) => s.phase !== 'letters' });
  ok(seq(trace, 'letters').map((t) => t.letter).join('') === ORDER.join(''), `step 1: the letters come in the lessons' order (${seq(trace, 'letters').map((t) => t.letter).join('')})`);
  ok(trace[trace.length - 1].phase === 'madeup' && !phasesOf(trace).has('teach'), 'step 1: all known goes to made-up words with no teach card');
  await made.ctx.close();

  // three Not yet in a row stop it; the teach card shows on the first one; the letter returns at the end
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page);
  trace = await drive(page, { letters: 'ynnnyyy', retest: 'n', aware: 'yyyyyy' });
  let screens = trace.map((t) => (t.phase === 'letters' ? t.letter + (t.retest ? '*' : '') : t.phase === 'teach' ? '[teach ' + t.letter + ']' : t.phase === 'awareness' ? 'A' : t.phase));
  const step1 = screens.slice(0, screens.indexOf('A'));
  ok(step1.join(' ') === 'm a [teach a] s i a*', `3 in a row: m, then a (teach card), s, i stops it, a comes back at the end (${step1.join(' ')})`);
  ok(!screens.includes('t') && !screens.includes('p'), '3 in a row: no letter after the third Not yet');
  let r = await resultText(page);
  ok(/was new today/.test(r.all), `3 in a row: a wrong retest says the letter was new today (${r.all})`);
  ok((await state(page)).start === '2a', 'teach: a wrong retest does not change the start (the first sound not known)');
  await made.ctx.close();

  // teach and retest 2 letters later: m n -> teach, then a and s, then m again, then the check goes on
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page);
  trace = await drive(page, { letters: 'nyyyyyyyyyyyy', retest: 'y' }, { hook: async (s) => { if (s.phase === 'teach') { ok((await sel(page, '.pc-teachbox').count()) === 1, 'teach card: the grown-up box shows'); } } });
  screens = trace.map((t) => (t.phase === 'letters' ? t.letter + (t.retest ? '*' : '') : t.phase === 'teach' ? '[teach ' + t.letter + ']' : t.phase));
  ok(screens.slice(0, 5).join(' ') === 'm [teach m] a s m*', `teach and retest: m, the teach card, a, s, then m again (${screens.slice(0, 6).join(' ')})`);
  ok(screens.filter((x) => x.startsWith('[teach')).length === 1 && screens.filter((x) => x === 'm*').length === 1, 'teach and retest: one teach card, one retest');
  ok(screens.indexOf('i') === 5, 'teach and retest: the check goes on with the next letter (i)');
  r = await resultText(page);
  ok(/Learned m quickly/.test(r.all) && /good sign/.test(r.all), `teach and retest: a right retest adds "Learned m quickly — a good sign" (${r.all})`);
  ok(!/was new today/.test(r.all), 'teach and retest: no "new today" note after a right retest');
  await made.ctx.close();

  // the teach card itself, with the recording (m, a and s have clips) and without any phone voice for the sound
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page);
  await judge(page, false);
  await page.waitForSelector('.pc-teachbox');
  const teachText = await text(page, '.pc-teachbox');
  ok(/Say: mmm\. Ask your child to say it with you\./.test(teachText), `teach card: "Say: mmm. Ask your child to say it with you." (${teachText})`);
  await page.waitForTimeout(500);
  ok((await clips(page)).some((c) => /\/sounds\/m\./.test(c) || /(^|\/)m\.mp3/.test(c)), `teach card: the recording of m plays (${await clips(page)})`);
  ok((await sel(page, '.pc-hear').count()) === 1 && (await redX(page)) === 0, 'teach card: a "Hear it" button and no red');
  ok(await page.evaluate(() => ['.pc-go', '.pc-hear'].every((s) => { const e = document.querySelector(s); return !e || e.getBoundingClientRect().height >= 47.5; })), 'teach card: buttons are 48 px or more');
  await idleCheck(page, ok, 'teach card');
  allTts.push(...(await ttsAll(page)));
  await made.ctx.close();

  // the teach card without a recording (recordings off): the prompt text only
  made = await open(browser, url, PHONE, { settings: { playSounds: false } }); page = made.page;
  await begin(page);
  await judge(page, false);
  await page.waitForSelector('.pc-teachbox');
  ok(/Say: mmm\./.test(await text(page, '.pc-teachbox')) && (await sel(page, '.pc-hear').count()) === 0 && (await clips(page)).length === 0, 'teach card without recordings: the text only, no button');
  await made.ctx.close();

  // two Not yet in a row do not stop it, and the first Not yet teaches (and retests) once
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page);
  trace = await drive(page, { letters: 'nynynnynnyyyy', retest: 'y' }, { stopAt: (s) => s.phase !== 'letters' && s.phase !== 'teach' });
  ok(seq(trace, 'letters').filter((t) => !t.retest).length === ORDER.length, `scattered: all ${ORDER.length} letters were asked (${seq(trace, 'letters').filter((t) => !t.retest).length})`);
  await made.ctx.close();
}

// ---- step 2: sound awareness (fewer than 4 sounds known) and the branches around it ----
async function branches({ browser, url, ok }) {
  shotsOn = true;
  // few sounds, weak awareness: step 2 shows, steps 3 and 4 are skipped, Sound play is suggested
  let made = await open(browser, url, PHONE);
  let { page } = made;
  await begin(page);
  let trace = await drive(page, { letters: 'nyynnn', retest: 'y', aware: 'ynnnnn' }, {
    hook: async (s) => {
      if (s.phase === 'teach') await shotOf(page, '03-teach-card');
      if (s.phase === 'awareness' && s.item === '0') await shotOf(page, '04-sound-awareness-first-sound');
      if (s.phase === 'awareness' && s.item === '3') await shotOf(page, '05-sound-awareness-blending');
    },
  });
  let ph = phasesOf(trace);
  ok(ph.has('awareness') && !ph.has('madeup') && !ph.has('words') && !ph.has('sentence'), 'few sounds: step 2 shows and steps 3 and 4 are skipped');
  const aw = seq(trace, 'awareness');
  ok(aw.length === 6 && aw.slice(0, 3).every((t) => t.kind === 'first') && aw.slice(3).every((t) => t.kind === 'blend'), `step 2: three first-sound items then three blending items (${aw.map((t) => t.kind + ':' + t.word).join(' ')})`);
  let r = await resultText(page);
  const st = await state(page);
  ok(st.lesson === '1' && st.sound === 'm', `few sounds: the start is the first sound not known (${r.head})`);
  ok(/Start with Sound play/.test(r.page) && (await sel(page, '.pc-playbtn').count()) === 1, `step 2 weak (1 of 6): "Start with Sound play" and a link (${r.page})`);
  ok(/Knows a s;/.test(r.why) || /Knows a s\b/.test(r.why), `few sounds: the why line (${r.why})`);
  ok(/Lessons before this are skipped, but the first lesson's review still practises them\./.test(r.page), 'result: the skipped-lessons line');
  const start = await page.evaluate(() => { const b = document.querySelector('.pc-start'); return { d: b.disabled, t: b.textContent, h: b.getBoundingClientRect().height }; });
  ok(start.d && /Start here/.test(start.t) && /\(preview: nothing changes\)/.test(start.t) && start.h >= 48, `result: "Start here (preview: nothing changes)" is switched off (${start.t})`);
  ok((await sel(page, '.pc-later').count()) === 1 && (await redX(page)) === 0, 'result: "Do this later" and no red');
  await shotOf(page, '08-result-few-sounds');
  await tapEl(page, sel(page, '.pc-playbtn')); await page.waitForSelector('.proto-play-intro');
  ok(page.url().endsWith('#/proto/play'), 'step 2 weak: the link opens Sound play');
  ok((await store(page)) === made.before, 'few sounds: nothing written (localStorage unchanged)');
  allTts.push(...(await ttsAll(page)));
  await made.ctx.close();

  // the step 2 prompts for the grown-up
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page);
  const prompts = [];
  trace = await drive(page, { letters: 'nnn', aware: 'yyyyyy' }, { hook: async (s) => { if (s.phase === 'awareness') prompts.push(await text(page, '.pc-note')); } });
  ok(prompts.length === 6 && /Ask: What's the first sound in mmmoon\?/.test(prompts[0]) && /sssun/.test(prompts[1]) && /fffish/.test(prompts[2]), `step 2 first-sound prompts (${prompts.slice(0, 3).join(' | ')})`);
  ok(/Say slowly: mmm… aaa… p-\. Ask: What word\?/.test(prompts[3]) || /Say slowly: .*… .*… .*\. Ask: What word\?/.test(prompts[3]), `step 2 blending prompt (${prompts[3]})`);
  ok((await sel(page, '.pc-three .pc-pic').count()) === 0, 'step 2: the blending pictures are gone at the result');
  r = await resultText(page);
  ok(!/Sound play/.test(r.page) && /going well \(6 of 6\)/.test(r.all), `step 2 strong (6 of 6): no Sound play suggestion (${r.all})`);
  ok((await state(page)).lesson === '1', 'nothing known: the start is Lesson 1');
  await made.ctx.close();

  // exactly 3 of 6 right is not weak; 2 of 6 is
  for (const [pat, weak] of [['yyynnn', false], ['yynnnn', true]]) {
    made = await open(browser, url, PHONE); page = made.page;
    await begin(page);
    await drive(page, { letters: 'nnn', aware: pat });
    r = await resultText(page);
    ok(/Start with Sound play/.test(r.page) === weak, `step 2 ${pat.split('').filter((c) => c === 'y').length} of 6: Sound play ${weak ? 'suggested' : 'not suggested'}`);
    await made.ctx.close();
  }

  // 4 to 9 sounds known: neither step 2 nor step 3, straight to the result
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page);
  trace = await drive(page, { letters: 'yyyyynnn', retest: 'y' });
  ph = phasesOf(trace);
  ok(!ph.has('awareness') && !ph.has('madeup') && !ph.has('words') && ph.has('result'), 'five sounds: no step 2 and no step 3');
  r = await resultText(page);
  ok((await state(page)).lesson === '6' && /Suggested start: Lesson 6 \(sound p\)/.test(r.head), `five sounds: suggests lesson 6 (${r.head})`);
  await made.ctx.close();

  // exactly 10 known: step 3 with only known sounds; 3 in a row stopped step 1
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page);
  trace = await drive(page, { letters: 'yyyyyyyyyynnn', retest: 'y', made: 'yyy', real: 'yyyy', sentence: 'y' }, { hook: async (s) => { if (s.phase === 'madeup' && s.pos === '0') await shotOf(page, '06-made-up-word'); if (s.phase === 'sentence') await shotOf(page, '07-sentence'); } });
  const known10 = ORDER.slice(0, 10);
  const mw = seq(trace, 'madeup').map((t) => t.word);
  ok(mw.length === 3 && mw.every((w) => /^[^aeiou][aeiou][^aeiou]$/.test(w) && [...w].every((c) => known10.includes(c))), `ten sounds: three made-up words from known sounds only (${mw})`);
  ok(ph.has('result') && phasesOf(trace).has('madeup') && !phasesOf(trace).has('awareness'), 'ten sounds: step 3, not step 2');
  const rw = seq(trace, 'words').map((t) => t.word);
  ok(rw.length === 4 && rw.every((w) => /^[^aeiou]?[aeiou][^aeiou]$/.test(w) && [...w].every((c) => known10.includes(c))), `good made-up words: step 4 shows four real words from known sounds (${rw})`);
  const sen = seq(trace, 'sentence');
  ok(sen.length === 1 && sen[0].sentence === 'Sam sat at a map.', `good made-up words: the sentence "${sen[0] && sen[0].sentence}"`);
  r = await resultText(page);
  ok(/reads Sam sat at a map\./.test(r.why) && /blends made-up words like/.test(r.why), `strong result: the why line (${r.why})`);
  ok(/Suggested start: Lesson 11 \(sound g\)/.test(r.head), `ten sounds: suggests the first unknown sound, lesson 11 (${r.head})`);
  await made.ctx.close();

  // all known, strong: shot of the result
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page);
  trace = await drive(page, { letters: 'y'.repeat(ORDER.length), made: 'yyy', real: 'yyyy', sentence: 'y' });
  r = await resultText(page);
  const stt = await state(page);
  ok(stt.lesson === String(ORDER.length) && stt.sound === ORDER[ORDER.length - 1], `all known: the last lesson (${r.head})`);
  ok(/That is the last lesson built so far\./.test(r.all), 'all known: "That is the last lesson built so far."');
  ok(new RegExp(`Knows ${ORDER.join(' ')};`).test(r.why) && /blends made-up words like [a-z]{3}/.test(r.why) && /reads Sam sat at a map\./.test(r.why), `all known: the why line (${r.why})`);
  ok(stt.blendFirst === '0' && !/Practise blending first/.test(r.page), 'all known: no blending warning');
  await shotOf(page, '09-result-strong');
  ok((await store(page)) === made.before, 'all known: nothing written (localStorage unchanged)');
  allTts.push(...(await ttsAll(page)));
  await made.ctx.close();

  // weak made-up words (1 of 3): no step 4, the start moves back, "Practise blending first"
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page);
  trace = await drive(page, { letters: 'y'.repeat(ORDER.length), made: 'ynn' });
  ph = phasesOf(trace);
  const mw2 = seq(trace, 'madeup').map((t) => t.word);
  ok(!ph.has('words') && !ph.has('sentence') && ph.has('result'), 'weak made-up words: step 4 is skipped');
  r = await resultText(page);
  const cap = Math.min(...[mw2[1], mw2[2]].map(lessonOf));
  ok((await state(page)).lesson === String(cap) && cap < ORDER.length, `weak made-up words: the start moves back to the lesson of a missed word's sound (Lesson ${cap}; ${r.head})`);
  ok(/Practise blending first/.test(r.page) && (await state(page)).blendFirst === '1', 'weak made-up words: "Practise blending first"');
  ok(/made-up words were not smooth yet/.test(r.why), `weak made-up words: the why line (${r.why})`);
  await shotOf(page, '10-result-practise-blending');
  await made.ctx.close();

  // 0 of 3 is weak too; 2 of 3 is good (step 4 shows)
  for (const [pat, good] of [['nnn', false], ['yyn', true], ['yny', true]]) {
    made = await open(browser, url, PHONE); page = made.page;
    await begin(page);
    trace = await drive(page, { letters: 'y'.repeat(ORDER.length), made: pat, real: 'yyyy', sentence: 'y' });
    ok(phasesOf(trace).has('words') === good && phasesOf(trace).has('sentence') === good, `made-up ${pat}: step 4 ${good ? 'shows' : 'is skipped'}`);
    if (!good) ok(/Practise blending first/.test((await resultText(page)).page), `made-up ${pat}: practise blending first`);
    await made.ctx.close();
  }

  // step 4 stops after 2 misses (no sentence), then the result keeps the base start
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page);
  trace = await drive(page, { letters: 'y'.repeat(ORDER.length), made: 'yyy', real: 'nyn' });
  ok(seq(trace, 'words').length === 3 && !phasesOf(trace).has('sentence'), `step 4: it stops after 2 misses (${seq(trace, 'words').length} words, no sentence)`);
  ok((await state(page)).lesson === String(ORDER.length), 'step 4 misses: the start is not moved (the made-up words were good)');
  await made.ctx.close();

  // a missed sentence: the result does not claim it was read
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page);
  await drive(page, { letters: 'y'.repeat(ORDER.length), made: 'yyy', real: 'yyyy', sentence: 'n' });
  r = await resultText(page);
  ok(!/reads Sam sat at a map/.test(r.why) && /reads real words like/.test(r.why), `a missed sentence is not claimed (${r.why})`);
  await made.ctx.close();
}

// ---- the quick re-check: step 1 alone ----
async function quick({ browser, url, ok }) {
  shotsOn = true;
  let made = await open(browser, url, PHONE);
  let { page } = made;
  await begin(page, true);
  let trace = await drive(page, { letters: 'yyyyynnn', retest: 'y' });
  let ph = phasesOf(trace);
  ok(!ph.has('awareness') && !ph.has('madeup') && !ph.has('words') && !ph.has('sentence'), 'quick re-check: step 1 only (no steps 2, 3 or 4)');
  const ls = seq(trace, 'letters').map((t) => t.letter + (t.retest ? '*' : '')).join('');
  ok(ls === 'masitpnfp*'.replace('nfp*', 'nfp*'), `quick re-check: letters in teaching order, the taught letter again at the end (${ls})`);
  const r = await resultText(page);
  ok(/Letter sounds: 5 of 13/.test(r.head), `quick re-check: the result counts the sounds (${r.head})`);
  ok(/Knows m a s i t/.test(r.why) && /Re-check every few weeks to see growth\./.test(r.all) && /Next new sound: Lesson 6 \(p\)\./.test(r.all), `quick re-check: the result (${r.all})`);
  ok((await sel(page, '.pc-start').count()) === 0 && !/Suggested start/.test(r.page), 'quick re-check: no "Start here" and no start suggestion');
  await shotOf(page, '11-quick-recheck-result');
  ok((await store(page)) === made.before, 'quick re-check: nothing written');
  await made.ctx.close();

  // the quick re-check also teaches and retests, and an all-known run ends at once
  made = await open(browser, url, PHONE); page = made.page;
  await begin(page, true);
  await shotOf(page, '11a-quick-recheck-letter');
  trace = await drive(page, { letters: 'n' + 'y'.repeat(12), retest: 'y' });
  const sc = trace.map((t) => (t.phase === 'letters' ? t.letter + (t.retest ? '*' : '') : t.phase === 'teach' ? '[teach]' : t.phase));
  ok(sc.slice(0, 5).join(' ') === 'm [teach] a s m*', `quick re-check: teach and retest too (${sc.slice(0, 5).join(' ')})`);
  ok(trace[trace.length - 1].phase === 'result' && !phasesOf(trace).has('madeup'), 'quick re-check: all known goes straight to the result');
  ok(/Letter sounds: 12 of 13/.test((await resultText(page)).head), `quick re-check: counts only the sounds known (${(await resultText(page)).head})`);
  await made.ctx.close();
}

// ---- reduced motion ----
async function reducedRun({ browser, url, ok }) {
  const made = await open(browser, url, PHONE, { reduced: true });
  const { page, errors } = made;
  await begin(page);
  const trace = await drive(page, { letters: 'nnn', aware: 'yyyyyy' });
  ok(phasesOf(trace).has('awareness') && trace[trace.length - 1].phase === 'result', 'reduced motion: the check runs to the result');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect.getComputedTiming().duration > 0).length === 0), 'reduced motion: no running animation at the result');
  ok(errors.length === 0, 'reduced motion: errors ' + errors.join(' | '));
  await made.ctx.close();
}

// ---- idle frames on every kind of screen ----
async function idle({ browser, url, ok }) {
  shotsOn = false;
  const made = await open(browser, url, PHONE);
  const { page } = made;
  await begin(page);
  await drive(page, { letters: 'yyyyyyyyyyyyy', made: 'yyy', real: 'yyyy', sentence: 'y' }, { stopAt: (s) => s.phase === 'madeup' });
  await idleCheck(page, ok, 'made-up word card');
  await drive(page, { made: 'yyy', real: 'yyyy', sentence: 'y' }, { stopAt: (s) => s.phase === 'words' });
  await idleCheck(page, ok, 'real word card');
  await drive(page, { real: 'yyyy', sentence: 'y' }, { stopAt: (s) => s.phase === 'sentence' });
  await idleCheck(page, ok, 'sentence card');
  await drive(page, { sentence: 'y' });
  await idleCheck(page, ok, 'result card');
  await made.ctx.close();
  const m2 = await open(browser, url, PHONE);
  await begin(m2.page);
  await drive(m2.page, { letters: 'nnn', aware: 'yyyyyy' }, { stopAt: (s) => s.phase === 'awareness' && s.kind === 'blend' });
  await idleCheck(m2.page, ok, 'sound awareness card');
  await m2.ctx.close();
}

// ---- three phone sizes: everything fits, targets are 48 px or more ----
async function sizes({ browser, url, ok }) {
  for (const vp of [SMALL, PHONE, LAND]) {
    shotsOn = vp === LAND;
    const tag = vp.name;
    const fit = (page, sels) => page.evaluate((list) => {
      const out = [];
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push('horizontal overflow');
      for (const s of list) for (const e of document.querySelectorAll(s)) {
        const r = e.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) out.push(`${s} outside (${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)})`);
        if (e.tagName === 'BUTTON' && (r.width < 47.5 || r.height < 47.5)) out.push(`${s} small ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return out;
    }, sels);
    const SELS = ['.pc-welcome', '.pc-begin', '.pc-quick', '.pc-fine', '.pc-later', '.rc-card', '.judge-btn', '.pc-teachbox', '.pc-go', '.pc-hear', '.pc-scene', '.pc-pic', '.pc-word', '.pc-sentence', '.pc-note', '.pc-result', '.pc-start', '.pc-playbtn'];
    let made = await open(browser, url, vp);
    let page = made.page;
    let bad = await fit(page, SELS);
    ok(bad.length === 0, `${tag} first screen: fits (${bad.join('; ')})`);
    await begin(page);
    bad = await fit(page, SELS);
    ok(bad.length === 0, `${tag} letter: fits (${bad.join('; ')})`);
    if (vp === LAND) await shotOf(page, '12-letter-landscape');
    let n = 0;
    await drive(page, { letters: 'nnn', aware: 'ynynyn' }, { hook: async (s) => {
      if (s.phase === 'teach' || (s.phase === 'awareness' && (s.item === '0' || s.item === '3')) || s.phase === 'result') {
        const b = await fit(page, SELS);
        ok(b.length === 0, `${tag} ${s.phase}${s.phase === 'awareness' ? ' ' + s.kind : ''}: fits (${b.join('; ')})`);
        n++;
      }
    } });
    ok(n === 4, `${tag}: teach, two step 2 items and the result were measured (${n})`);
    await made.ctx.close();
    made = await open(browser, url, vp); page = made.page;
    await begin(page);
    n = 0;
    await drive(page, { letters: 'y'.repeat(ORDER.length), made: 'yyy', real: 'yyyy', sentence: 'y' }, { hook: async (s) => {
      if ((s.phase === 'madeup' && s.pos === '0') || (s.phase === 'words' && s.pos === '0') || s.phase === 'sentence' || s.phase === 'result') {
        const b = await fit(page, SELS);
        ok(b.length === 0, `${tag} ${s.phase}: fits (${b.join('; ')})`);
        if (vp === LAND && s.phase === 'result') await shotOf(page, '13-result-landscape');
        n++;
      }
    } });
    ok(n === 4, `${tag}: made-up word, real word, sentence and result were measured (${n})`);
    await made.ctx.close();
    made = await open(browser, url, vp); page = made.page;
    await begin(page, true);
    await drive(page, { letters: 'yyynnn', retest: 'y' });
    bad = await fit(page, SELS);
    ok(bad.length === 0, `${tag} quick result: fits (${bad.join('; ')})`);
    await made.ctx.close();
  }
}

export async function run() {
  shotsOn = true;
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await madeUp({ browser, url, ok });
  await firstScreen({ browser, url, ok });
  await stepOne({ browser, url, ok });
  await branches({ browser, url, ok });
  await quick({ browser, url, ok });
  ok(allTts.every((t) => !SOUNDY(t)), `the phone's voice never said a sound or a stretched word (${allTts.length} lines; bad: ${allTts.filter(SOUNDY).join(' | ')})`);
  await reducedRun({ browser, url, ok });
  await idle({ browser, url, ok });
  await sizes({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`proto-placement: ${checks - failures}/${checks} checks passed`);
  return failures;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) process.exit((await run()) ? 1 : 0);
