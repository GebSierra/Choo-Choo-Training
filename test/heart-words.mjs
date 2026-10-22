// Heart words in the lessons (docs/LESSON-REBUILD.md section 13): which lesson teaches which word (2 at most), the Heart Word step's place in the lesson,
// its flow (word big and unmarked, the child has a go, the heart appears, the grown-up says the word, the child reads it, then finds it among 3 cards and
// reads a tiny phrase), no text to speech for the word, the decodability rule with heart words, the one-time saved-progress migration, the counting
// ("can read N words" stays pure, hearts are counted apart), and the screen at three sizes. Run alone with `node test/heart-words.mjs`;
// SHOTS=1 also saves docs/screenshots/heart-words/ (390x844: the "the" step, the find-it round, one Sunny Hills heart word).
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB, silentWav } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, doneThrough } from './lib.mjs';
import { tasksFor, heartTaught, GIST_MAX } from '../js/lessons.js';
import { ORDER } from '../js/order.js';
import { checkHeartWords, childReadProof, checkCurriculum } from './check-content.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/heart-words');

// ---- 1. placement: the plan of the curriculum table, spread so no lesson gets more than 2 ----
const PLAN = { 3: ['a'], 4: ['I', 'is'], 6: ['the'], 10: ['to'], 18: ['he', 'me'], 19: ['be', 'go'], 20: ['no', 'so'], 21: ['we', 'want'], 22: ['was', 'my'], 23: ['you', 'of'], 24: ['said', 'do'], 25: ['does', 'are'] };
for (const L of CUR.lessons) {
  const want = PLAN[L.number] || [];
  ok(JSON.stringify(L.heart || []) === JSON.stringify(want), `lesson ${L.number} teaches ${JSON.stringify(want)} (got ${JSON.stringify(L.heart || [])})`);
  ok((L.heart || []).length <= 2, `lesson ${L.number}: at most 2 new heart words`);
  const types = tasksFor(L).map((t) => t.type), at = types.indexOf('heart');
  if (want.length) ok(at === types.indexOf('mouth') + 1, `lesson ${L.number}: Heart Word comes right after Watch My Mouth, before the middle (${types.join(', ')})`);
  else ok(!types.includes('heart'), `lesson ${L.number}: no Heart Word step without a new heart word`);
}
const all = CUR.lessons.flatMap((L) => L.heart || []);
ok(all.length === 21 && new Set(all).size === 21, 'the 21 heart words of units 2.1 to 2.11 are each taught once');
ok(Object.keys(CUR.heartWords).length === 21, 'curriculum.heartWords holds all 21');
// every word of unit 2.x arrives at or after its unit starts, never before a book or story that uses it
const UNIT_START = { a: 1, I: 4, is: 4, the: 6, to: 9, he: 18, me: 18, be: 18, go: 18, no: 18, so: 18, we: 19, want: 19, was: 19, my: 22, you: 22, of: 22, said: 22, do: 22, does: 22, are: 22 };
for (const L of CUR.lessons) for (const w of L.heart || []) ok(L.number >= UNIT_START[w], `${w} is not taught before its unit (lesson ${L.number})`);
ok(heartTaught(CUR, 4).join(' ') === 'a I is', 'heartTaught: a, I, is by lesson 4 (Story 1 uses I and is)');
ok(checkHeartWords(CUR).length === 0, 'live data passes checkHeartWords');
ok(checkCurriculum(CUR).length === 0 && childReadProof(CUR).errors.length === 0, 'live data passes check-content and the child-read proof');

// ---- 2. the decodability rule: a word is readable when every part is decodable OR it is a heart word taught by then ----
{
  const bad = JSON.parse(JSON.stringify(CUR));
  bad.heartWords.the.phrase = 'the was map'; // "was" is not taught until lesson 22 and has w, a, s: w is not taught at lesson 6
  ok(checkHeartWords(bad).some((e) => /"was"/.test(e)), 'a phrase with an untaught heart word is rejected');
  const okPhrase = JSON.parse(JSON.stringify(CUR));
  okPhrase.heartWords.the.phrase = 'the map is'; // "is" was taught in lesson 4
  ok(checkHeartWords(okPhrase).length === 0, 'a taught heart word is readable in a later phrase (is, taught at lesson 4)');
  const bk = JSON.parse(JSON.stringify(CUR));
  bk.checkpoints.find((k) => k.id === 'r1').sight = ['I', 'the']; // the is taught at lesson 6, Read It Again sits after lesson 4
  ok(checkCurriculum(bk).some((e) => /"the" is not a heart word taught by lesson 4/.test(e)), 'Read It Again may not use a heart word taught later');
  const three = JSON.parse(JSON.stringify(CUR));
  three.lessons[17].heart.push('be');
  ok(checkHeartWords(three).some((e) => /2 at most/.test(e)), 'three heart words in one lesson are rejected');
}
for (const [w, d] of Object.entries(CUR.heartWords)) {
  ok(d.parts.some((p) => p.heart) && d.parts.map((p) => p.t).join('').toLowerCase() === w.toLowerCase(), `${w}: the parts spell it and one is the heart part`);
  ok(d.find.length === 2 && !d.find.includes(w), `${w}: two wrong cards`);
}
ok(CUR.heartWords.the.parts.map((p) => p.t + (p.heart ? '*' : '')).join(' ') === 'th e*', '"the": th is regular, e is the heart part');

// ---- 3. in the browser ----
const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());
const PHONE = { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 };
const SIZES = [PHONE, { name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 }, { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 }];
const seed = (n, settings = {}) => `localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneThrough(n - 1), settings: { seenScripts: SEEN, perDay: 0, heartA: true, ...settings }, firstRunDone: true, meetDue: false })}))`;
async function open(n, vp = PHONE, { settings, clip = false } = {}) {
  const made = await newPage(browser, vp);
  if (clip) await made.page.route('**/assets/audio/heart/*.mp3', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }));
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(seed(n, settings));
  const idx = tasksFor(CUR.lessons[n - 1]).find((t) => t.type === 'heart').index;
  await made.page.goto(url + `#/lesson/${n}/task/${idx}`);
  await made.page.waitForSelector('.proto.heart', { timeout: 8000 });
  await made.page.waitForTimeout(700);
  made.idx = idx;
  return made;
}
const tap = async (page, s) => { const b = await page.locator(s).first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(450); };
const count = (page, s) => page.locator(s).count();
const ds = (page, k) => page.evaluate((key) => document.querySelector('.proto.heart').dataset[key], k);
const ttsAll = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'tts').map((e) => e.text));
const clips = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'clip').map((e) => e.src));
const promptText = (page) => page.evaluate(() => { const p = [...document.querySelectorAll('.task-stage .say-prompt')].find((x) => !x.hidden && x.offsetParent); return p ? p.querySelector('.say-text').textContent : null; });
const gist = (page) => page.evaluate(() => document.querySelector('.script-first, .task-foot')?.textContent || '');
const shot = async (page, name) => { if (!process.env.SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };
const nextSub = async (page) => { await page.waitForFunction(() => { const b = document.querySelector('.btn.next'); return b && !b.disabled; }, null, { timeout: 4000 }); await tap(page, '.btn.next'); await page.waitForTimeout(400); };

// Lesson 6, "the": the full flow, with prompts (no recording)
{
  const { ctx, page, errors, idx } = await open(6);
  ok((await page.locator('.task-head h1').textContent()).trim() === 'Heart Word', 'the task is called Heart Word');
  ok((await count(page, '.hw-tile')) === 2 && (await count(page, '.hw-tile.regular .hw-link')) === 1 && (await count(page, '.hw-tile.heart-part')) === 1, '"the": two tiles, th linked and regular, e is the heart part');
  ok(await page.evaluate(() => document.querySelector('.hw-word').classList.contains('plain') && getComputedStyle(document.querySelector('.hw-heartwrap')).opacity === '0'), 'retrieval first: the heart is hidden until the child has had a go');
  ok((await count(page, '.px-hear')) === 0 && (await promptText(page)) === null, 'no Hear it and no word said before the child has tried');
  await shot(page, 'the-1-meet');
  await tap(page, '.hw-tried');
  ok(!(await page.evaluate(() => document.querySelector('.hw-word').classList.contains('plain'))) && (await promptText(page)) === 'Say: the', 'the heart appears and the grown-up prompt is "Say: the"');
  ok((await count(page, '.judge-bar:not([hidden])')) === 1, 'the judge bar appears for the grown-up');
  ok(!(await ttsAll(page)).some((t) => /\bthe\b/i.test(t) && t.length < 8), 'the phone never says the word (no text to speech)');
  await shot(page, 'the-2-heard');
  await tap(page, '.judge-btn.help'); ok((await ds(page, 'help')) === '1' && /e says|letter e/.test(await page.locator('.hw-note').textContent()), 'Help shows the tricky part for the grown-up');
  await tap(page, '.judge-btn.got');
  await page.waitForFunction(() => document.querySelector('.proto.heart').dataset.state === 'done', null, { timeout: 3000 });
  ok((await ds(page, 'state')) === 'done', 'Got it finishes the first sub-step');
  await nextSub(page);
  ok((await ds(page, 'phase')) === 'find' && (await count(page, '.hw-card')) === 3, 'Next goes to the find-it round with 3 cards');
  const words = await page.locator('.hw-card').evaluateAll((els) => els.map((e) => e.dataset.word));
  ok(words.includes('the') && new Set(words).size === 3, 'one card is the word, the others are different words');
  ok((await promptText(page)) === 'Say: the', 'find-it: the grown-up prompt says the word');
  await shot(page, 'the-3-find');
  const wrong = page.locator('.hw-card[data-right="0"]').first();
  const wb = await wrong.boundingBox(); await page.touchscreen.tap(wb.x + wb.width / 2, wb.y + wb.height / 2); await page.waitForTimeout(400);
  ok((await ds(page, 'found')) === '0' && (await ds(page, 'miss')) === '1' && (await count(page, '.hw-phrase:not([hidden])')) === 0, 'a wrong card only shakes: nothing is fixed, no phrase yet');
  await tap(page, '.hw-card[data-right="1"]');
  ok((await ds(page, 'found')) === '1' && (await count(page, '.hw-phrase:not([hidden])')) === 1, 'the right card shows the use-it phrase');
  ok((await page.locator('.hw-pw').evaluateAll((e) => e.map((x) => x.dataset.word).join(' '))) === 'the map', 'the phrase is "the map"');
  await shot(page, 'the-4-phrase');
  await tap(page, '.judge-btn.got');
  await page.waitForFunction(() => document.querySelector('.proto.heart').dataset.state === 'done', null, { timeout: 3000 });
  await nextSub(page);
  await page.waitForFunction((i) => !location.hash.endsWith('/task/' + i), idx, { timeout: 4000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).lessons[6]);
  ok(saved && saved.tasksDone.includes(idx), 'leaving the last sub-step marks the Heart Word task done');
  const tts = await ttsAll(page);
  ok(!tts.some((t) => /^(the|the map|a|I|is)$/i.test(t.trim())), 'no spoken heart word or phrase anywhere in the flow');
  ok(errors.length === 0, 'flow: no errors ' + errors.join(' | '));
  await ctx.close();
}
// A recording: when assets/audio/heart/the.mp3 exists it plays and the phone says nothing; no prompt shows
{
  const { ctx, page, errors } = await open(6, PHONE, { clip: true });
  await tap(page, '.hw-tried'); await page.waitForTimeout(300);
  ok((await clips(page)).includes('the.mp3'), 'a recorded clip of the word plays when one exists');
  ok((await promptText(page)) === null, 'with a recording no "Say:" prompt shows');
  ok(errors.length === 0, 'recording: no errors ' + errors.join(' | '));
  await ctx.close();
}
// Lesson 4: two words, four sub-steps, in order (I then is); sentence parts from words taught by then
{
  const { ctx, page } = await open(4);
  const seen = [];
  for (let i = 0; i < 4; i++) {
    seen.push(`${await ds(page, 'phase')}:${await ds(page, 'word')}`);
    if (i < 3) await nextSub(page);
  }
  ok(seen.join(' ') === 'meet:I find:I meet:is find:is', `lesson 4 walks meet and find for I, then for is (${seen.join(' ')})`);
  ok((await count(page, '.hw-card')) === 3, 'lesson 4: the find-it round has 3 cards');
  await ctx.close();
}
// Sunny Hills: lesson 18 "he" and "me"
{
  const { ctx, page } = await open(18);
  ok((await ds(page, 'word')) === 'he' && (await count(page, '.hw-tile')) === 2, 'lesson 18 starts with "he": h regular, e the heart part');
  await tap(page, '.hw-tried');
  await shot(page, 'sunny-hills-he');
  await ctx.close();
}
// The grown-up text: a gist of at most 28 characters, a Say this script, no jargon beyond "heart word"
{
  const { ctx, page } = await open(3, PHONE, { settings: { seenScripts: {} } });
  await page.waitForTimeout(900);
  const t = await page.evaluate(() => document.body.innerText);
  ok(/a word we learn by heart, because a part of it does not follow the sounds yet/.test(t), 'the first time, the grown-up reads what a heart word is');
  ok(await page.evaluate(() => [...document.querySelectorAll('.proto.heart [aria-label]')].every((e) => !/^[a-z]$/i.test(e.getAttribute('aria-label').trim()))), 'no lone-letter aria-label (the one-letter word a is labelled "the word a")');
  await tap(page, '.hw-tried'); await nextSub(page);
  ok(await page.evaluate(() => [...document.querySelectorAll('.proto.heart [aria-label]')].every((e) => !/^[a-z]$/i.test(e.getAttribute('aria-label').trim()))), 'find-it: no lone-letter aria-label either');
  await ctx.close();
}
{
  const meet = await import('../js/screens/tasks/heart.js');
  ok(typeof meet.build === 'function' && meet.TIP.includes('does not follow the sounds yet'), 'heart.js exports the builder and the explanation');
  ok(GIST_MAX === 28, 'the gist limit is 28');
  for (const g of ['Child tries. Then say it.', 'Say it. Child taps the word.']) ok(g.length <= GIST_MAX, `gist "${g}" fits ${GIST_MAX}`);
}
// Fit, targets and no sideways scrolling at three sizes, on the busiest state (the phrase shown) and on the first
for (const vp of SIZES) {
  for (const state of ['meet', 'find']) {
    const { ctx, page, errors } = await open(vp === PHONE ? 22 : 21, vp);
    if (state === 'find') { await tap(page, '.hw-tried'); await nextSub(page); await tap(page, '.hw-card[data-right="1"]'); }
    else await tap(page, '.hw-tried');
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const root = document.documentElement, small = [...document.querySelectorAll('.proto.heart button, .task-foot .btn')].filter((b) => b.offsetParent && !b.closest('[hidden]')).map((b) => b.getBoundingClientRect()).filter((b) => b.height < 47.5 || b.width < 47.5).length;
      const st = document.querySelector('.task-stage'), judge = document.querySelector('.judge-bar:not([hidden])');
      const jr = judge && judge.getBoundingClientRect();
      return { wide: root.scrollWidth - root.clientWidth, small, judgeVisible: !judge || (jr.bottom <= Math.min(innerHeight, st.getBoundingClientRect().bottom) + 1 && jr.top >= 0), over: st ? st.scrollHeight - st.clientHeight : 0 };
    });
    ok(r.wide <= 0, `${vp.name} ${state}: no sideways scrolling`);
    ok(r.small === 0, `${vp.name} ${state}: every touch target is 48 px or more (${r.small} small)`);
    ok(r.judgeVisible, `${vp.name} ${state}: the grown-up's buttons are on the screen`);
    ok(errors.length === 0, `${vp.name} ${state}: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// ---- 4. saved progress: one-time migration, finished lessons stay finished, reading.v1 is the same key ----
{
  const made = await newPage(browser, PHONE);
  const old = { schema: 1, order: ORDER, lessons: { 1: { tasksDone: [0, 1, 2, 3, 4, 5], result: 'got-it' }, 2: { tasksDone: [], result: 'got-it' }, 3: { tasksDone: [0, 1, 2], result: null }, 4: { tasksDone: [], result: 'got-it' }, 5: { tasksDone: [0, 1], result: null } },
    settings: { seenScripts: SEEN, perDay: 0, layoutA: true, migrated1912: true, pace4: true, speak0: true }, firstRunDone: true, meetDue: false };
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(`if (!localStorage.getItem('reading.v1')) localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(old))})`);
  await made.page.goto(url + '#/home');
  await made.page.waitForTimeout(900);
  const s1 = await made.page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')));
  ok(s1.settings.heartA === true, 'migration: the heartA flag is set');
  ok(JSON.stringify(s1.lessons[3].tasksDone) === '[]' && JSON.stringify(s1.lessons[5].tasksDone) === '[]', 'migration: unfinished lessons start their tasks again');
  ok(s1.lessons[1].result === 'got-it' && JSON.stringify(s1.lessons[1].tasksDone) === '[0,1,2,3,4,5]' && s1.lessons[4].result === 'got-it', 'migration: finished lessons stay exactly as they were');
  // progress made after the migration is kept on the next open
  await made.page.evaluate(() => { const s = JSON.parse(localStorage.getItem('reading.v1')); s.lessons[3].tasksDone = [0, 1]; localStorage.setItem('reading.v1', JSON.stringify(s)); });
  await made.page.reload(); await made.page.waitForTimeout(700);
  const s2 = await made.page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')));
  ok(JSON.stringify(s2.lessons[3].tasksDone) === '[0,1]', 'migration: runs once, later progress is kept');
  ok(await made.page.evaluate(() => Object.keys(localStorage).includes('reading.v1')), 'the storage key is still reading.v1');
  await made.ctx.close();
}

// ---- 5. counting: "can read N words" stays pure; heart words are counted apart ----
{
  const made = await newPage(browser, PHONE);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(seed(7));
  await made.page.goto(url + '#/home'); await made.page.waitForTimeout(600);
  const p = await made.page.evaluate(async () => {
    const m = await import('./js/reading-count.js');
    const cur = await (await fetch('data/curriculum.json')).json();
    return m.readingProgress({ isDone: (n) => n <= 6 }, cur);
  });
  ok(p.hearts === 4 && p.sounds === 6, `six lessons done: 6 sounds and 4 heart words, a I is the (got ${p.sounds} and ${p.hearts})`);
  const plain = await made.page.evaluate(async () => { const m = await import('./js/reading-count.js'); const w = (await (await fetch('data/words-decodable.json')).json()).words; return m.countReadable(w, ['m', 'a', 's', 'i', 't', 'p']); });
  ok(p.words === plain, 'the "can read N words" number is only the sounded-out words (heart words are not in it)');
  ok(CUR.checkpoints.filter((k) => k.kind === 'review').every((k) => Array.isArray(k.summary.hearts) && k.summary.hearts.length === heartTaught(CUR, k.after).length), 'every Review Stop lists the heart words taught by then, apart from the word count');
  await made.ctx.close();
}

await browser.close(); server.close();
console.log(`heart-words: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
