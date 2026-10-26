// Review Stops (checkpoint kind "review", ids v1 to v9: v1 to v5 as before, v6 after lesson 6, v7 to v9 in World 3): placement, content (only games and review of taught letters, nothing new),
// the hold on the train (and no hold for stops the child is already past), unlocking, the saved result, no spurious rides, fit at three phone
// sizes and heat. Run alone with `node test/review-stops.mjs [--shots]`; shots go to docs/screenshots/review-stops/.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, showStop, doneThrough } from './lib.mjs';
import { ORDER_SOUNDS, lettersOfSounds, isReadable, isReadableBlends, isBlendKey } from '../js/order.js';
import { checkpointStopIndex, finishedStop } from '../js/sequence.js';
import { state, openHome, until } from './train.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const STOPS = CUR.checkpoints.filter((k) => k.kind === 'review');
// Every world ends with a Review Stop (after 6, 17, 25 and 33); the ids never change once saved, so the new stops are v6 to v11 and sit in lesson order.
const AFTER = [3, 6, 9, 12, 15, 17, 20, 23, 25, 30, 33, 38, 42];
const IDS = ['v1', 'v6', 'v2', 'v3', 'v4', 'v5', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'v13'];
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/review-stops');
const SIZES = [{ name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 }, { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 }, { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 }];
const PHONE = SIZES[1];
const ALLOWED = ['hunt', 'signals', 'wagons', 'board', 'check', 'read', 'chains'];
const NAMES = { read: 'Read a Word', hunt: 'Letter Hunt', signals: 'Green Light', wagons: 'Wagon Parade', board: 'Station Board', chains: 'Add a Car', check: 'Ticket Check' };
const taughtBy = (n) => lettersOfSounds(ORDER_SOUNDS.slice(0, n));
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- data and the store, no browser ----
export async function dataChecks({ ok }) {
  ok(STOPS.length === 13 && STOPS.map((k) => k.after).join() === AFTER.join(), `data: thirteen review stops, after lessons ${AFTER.join(', ')} (${STOPS.map((k) => k.after)})`);
  ok(STOPS.every((k, i) => k.id === IDS[i] && k.title === 'Review Stop'), 'data: ids v1 to v13 (v6 sits after lesson 6), titled Review Stop');
  ok(STOPS.every((k) => k.world === CUR.lessons.find((l) => l.number === k.after).world), 'data: each stop is in the world of the lesson it follows');
  ok([6, 17, 25, 33, 42].every((n) => CUR.checkpoints.some((k) => k.kind === 'review' && k.after === n)) && CUR.checkpoints.find((k) => k.id === 'b2').after === 6, 'data: every world ends with a Review Stop (lessons 6, 17, 25, 33, 42); at lesson 6 it sits with Story 2');
  ok(CUR.checkpoints.filter((k) => k.kind === 'review').find((k) => k.after === 25).mix === 'vowels' && [18, 13, 8, 4, 2].every((n) => CUR.checkpoints.find((k) => k.id === 'v9').plan.some((a) => a.lesson === n)), 'data: the last stop mixes all five short vowels (a i o u e)');
  for (const k of STOPS) {
    const tag = `data ${k.id}`;
    ok(k.plan.length >= 3 && k.plan.length <= 5, `${tag}: a short run (${k.plan.length} activities)`);
    ok(k.plan.every((a) => ALLOWED.includes(a.task)), `${tag}: only the fun games and Ticket Check (${k.plan.map((a) => a.task)})`);
    ok(k.plan.every((a) => a.lesson >= 1 && a.lesson <= k.after), `${tag}: every activity is about a lesson taught by lesson ${k.after} (${k.plan.map((a) => a.lesson)})`);
    ok(k.plan[k.plan.length - 1].task === 'check' && k.plan.filter((a) => a.task === 'check').length === 1, `${tag}: Ticket Check comes last, once`);
    const recent = k.plan.filter((a) => a.lesson > k.after - 3).length;
    ok(recent >= k.plan.length / 2 && recent < k.plan.length || k.after <= 3 || k.mix, `${tag}: weighted to the three newest letters with an older one in the mix (${recent} of ${k.plan.length} recent)`);
    ok(k.plan.every((a) => a.task !== 'check' || CUR.lessons[a.lesson - 1].quickCheck.kind === 'letter'), `${tag}: Ticket Check asks about a letter, so no picture words from later lessons show`);
  }
  ok(new Set(STOPS.map((k) => k.plan.map((a) => a.task).join())).size === STOPS.length, 'data: the mix of games differs at every stop');
  ok(new Set(STOPS.map((k) => JSON.stringify(k.plan))).size === STOPS.length, 'data: no two stops have the same plan');
  ok(STOPS.every((k) => !k.plan.some((a) => ['newLetter', 'mouth', 'writing', 'sounds', 'review', 'practice'].includes(a.task))), 'data: no New Sound, Watch My Mouth, Track Tracing or other teaching step');

  // Store rules and the hold, with the real store on a stand-in localStorage.
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const { createStore } = await import('../js/store.js');
  const open = (doneN, checkpoints = {}, settings = {}) => { mem.clear(); mem.set('reading.v1', JSON.stringify({ schema: 1, lessons: doneThrough(doneN), checkpoints, settings: { migrated1912: true, pace4: true, seenScripts: SEEN, ...settings }, firstRunDone: true })); return createStore(); };
  const nodes = CUR.lessons.flatMap((l) => [{ lesson: l }, ...CUR.checkpoints.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
  const idx = (id) => nodes.findIndex((n) => n.checkpoint && n.checkpoint.id === id);
  const curIdx = (store) => nodes.findIndex((n) => n.lesson && n.lesson.number === store.currentLesson(CUR.lessons.length));
  const hold = (store) => checkpointStopIndex(nodes, curIdx(store), store);
  for (const k of STOPS) {
    const i = idx(k.id), next = nodes[i + 1];
    let back = i - 1; while (nodes[back] && nodes[back].checkpoint && nodes[back].checkpoint.after === k.after) back--; // a Story that shares the lesson (Story 2 and v6 after lesson 6) comes first
    const prev = nodes[back], earlierDone = Object.fromEntries(CUR.checkpoints.filter((c) => c.after === k.after && idx(c.id) < i).map((c) => [c.id, { result: 'got-it' }]));
    const lastOne = k.after === CUR.lessons.length; // the last stop of the line has no lesson after it
    ok(prev.lesson && prev.lesson.number === k.after && (lastOne ? !next || !next.lesson : next.lesson && next.lesson.number === k.after + 1), `placement ${k.id}: on the line right after lesson ${k.after}${lastOne ? '' : ' and before lesson ' + (k.after + 1)}`);
    let s = open(k.after - 1);
    ok(!s.isCheckpointUnlocked(k) && !s.isCheckpointDone(k), `${k.id}: locked before lesson ${k.after} is done`);
    s = open(k.after, earlierDone);
    ok(s.isCheckpointUnlocked(k) && !s.isCheckpointDone(k), `${k.id}: opens when lesson ${k.after} is done, not done itself`);
    const holds = (st) => (lastOne ? st.currentLesson(CUR.lessons.length) === null && CUR.checkpoints.find((c) => !st.isCheckpointDone(c) && st.isCheckpointUnlocked(c)) ?.id === k.id : hold(st) === i); // the last stop: with every lesson done it is the pending stop (the Home makes it current)
    ok(holds(s), `${k.id}: next in line, it holds the train (the current stop is the stop${lastOne ? "" : ", not lesson " + (k.after + 1)})`);
    if (!lastOne) ok(s.isUnlocked(k.after + 1), `${k.id}: lesson ${k.after + 1} is open while the stop waits`);
    // the grown-up's result: once got-it the train goes on
    s.setCheckpointResult(k.id, 'got-it');
    ok(s.isCheckpointDone(k) && !holds(s) && s.checkpoint(k.id).result === 'got-it', `${k.id}: the result is saved and the hold ends`);
    s = open(k.after, { ...earlierDone, [k.id]: { result: 'practice-again' } });
    ok(!s.isCheckpointDone(k) && holds(s), `${k.id}: "Not yet" keeps the hold`);
    // a child already past it: the next lesson is done, so the stop counts as passed and never holds
    if (!lastOne) {
      s = open(k.after + 1);
      ok(s.isCheckpointDone(k) && hold(s) !== i, `${k.id}: a save past lesson ${k.after + 1} counts it passed, no hold`);
      s = open(CUR.lessons.length);
      ok(s.isCheckpointDone(k) && s.checkpoint(k.id).result === null, `${k.id}: a finished save has it passed with no result written`);
    }
  }
  // no spurious rides: stops the child never played carry no result, so they add nothing to trainDone
  const doneArr = (store) => nodes.map((n) => { const own = n.checkpoint ? store.checkpoint(n.checkpoint.id) : store.lesson(n.lesson.number); return own.result === 'got-it' ? own.completedAt || null : false; });
  let s = open(10);
  const before = doneArr(s).filter((d) => d !== false).length;
  ok(before === 10 && finishedStop(s, doneArr(s), curIdx(s)) === -1, `rides: lessons 1 to 10 saved with no review result count ${before} stops and play no ride`);
  const again = open(10, {}, { trainDone: 10 });
  ok(finishedStop(again, doneArr(again), curIdx(again)) === -1, 'rides: an old save (trainDone 10) opened with the review stops in the data plays no ride');
  const v2 = STOPS.find((k) => k.id === 'v2');
  again.setCheckpointResult(v2.id, 'got-it');
  ok(finishedStop(again, doneArr(again), curIdx(again)) === idx(v2.id), 'rides: a review stop the grown-up marks got-it rides like any stop (own result)');
}

// ---- the screens, in the browser ----
const letterSets = (page) => page.evaluate(() => {
  const out = new Set();
  for (const e of document.querySelectorAll('[data-letter]')) out.add(e.dataset.letter);
  for (const e of document.querySelectorAll('.board-word .letter-tile, .btile, .board-tile')) out.add(e.textContent.trim());
  return [...out].filter(Boolean);
});

async function seeded(browser, url, vp, doneN, route, extraState = {}) {
  const made = await newPage(browser, vp);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneThrough(doneN), settings: { seenScripts: SEEN, trainIntroDone: true }, firstRunDone: true, ...extraState })}))`);
  await made.page.goto(url + route);
  return made;
}
const gameSel = '.game, .first-word';

export async function screenChecks({ browser, url, ok }) {
  for (const k of STOPS) {
    const taught = taughtBy(k.after);
    // every activity: its first screen holds only taught letters (Letter Hunt and Wagon Parade are sampled again after a few right taps)
    const m = await seeded(browser, url, PHONE, k.after, `#/checkpoint/${k.id}/task/0`);
    const { page, errors } = m;
    for (let i = 0; i < k.plan.length; i++) {
      const a = k.plan[i];
      await page.goto(url + `#/checkpoint/${k.id}/task/${i}`);
      await page.waitForSelector(gameSel + ', .check', { timeout: 8000 });
      await page.waitForTimeout(700);
      const title = (await page.locator('.task-head h1').innerText()).split('\n')[0].trim();
      ok((await page.locator('.task-kicker').innerText()) === `Review Stop · ${i + 1} of ${k.plan.length}`, `${k.id} step ${i + 1}: the header says Review Stop and where you are`);
      ok(title === NAMES[a.task], `${k.id} step ${i + 1}: ${NAMES[a.task]} (${title})`);
      ok((await page.locator('.task-head [role=progressbar]').getAttribute('aria-valuemax')) === String(k.plan.length), `${k.id} step ${i + 1}: progress shows ${k.plan.length} games`);
      let letters = new Set(await letterSets(page));
      if (a.task === 'hunt') {
        for (let t = 0; t < 2; t++) {
          const tgt = page.locator('.sky-letter[data-target="1"]').first();
          if (await tgt.count()) { await tgt.click({ force: true }); await page.waitForTimeout(900); (await letterSets(page)).forEach((l) => letters.add(l)); }
        }
      }
      const bad = [...letters].filter((l) => !isReadable(l, taught));
      ok(bad.length === 0 && letters.size > 0, `${k.id} step ${i + 1} (${a.task}): only letters taught by lesson ${k.after} show (${[...letters].join(' ')}${bad.length ? '; NEW: ' + bad.join(' ') : ''})`);
      if (a.task === 'check') {
        const glyphs = await page.locator('.opt-card').count();
        ok(glyphs >= 2 && (await page.locator('.opt-pic').count()) === 0, `${k.id} step ${i + 1}: Ticket Check shows letter cards, no pictures`);
      }
      if (i === 0) await shot(page, `${k.id}-first-390x844`);
    }
    ok(errors.length === 0, `${k.id}: no errors ${errors.join(' | ')}`);
    await m.ctx.close();
  }

  // a whole run on the phone: Skip through the activities, the same finish as any stop, the saved result, back on the path
  const k = STOPS.find((c) => c.id === 'v2');
  const m = await seeded(browser, url, PHONE, k.after, `#/checkpoint/${k.id}`);
  const { page, errors } = m;
  await page.waitForSelector('.review-start');
  await page.locator('.review-start').click();
  await page.waitForSelector(gameSel);
  for (let i = 0; i < k.plan.length; i++) {
    await page.waitForTimeout(1200);
    ok(page.url().endsWith(`#/checkpoint/${k.id}/task/${i}`), `${k.id} run: step ${i + 1} is at its address`);
    ok((await page.locator('.task-head h1').innerText()).split('\n')[0].trim() === NAMES[k.plan[i].task], `${k.id} run: step ${i + 1} is ${NAMES[k.plan[i].task]}`);
    await page.locator('.btn.next').click();
    await page.waitForTimeout(500);
  }
  await page.waitForSelector('.finish');
  ok((await page.locator('.finish h1').innerText()) === "That's the review stop.", 'run: the finish heading');
  ok(await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('reading.v1')).checkpoints; return !c || !(c.v2 || {}).result; }), 'run: playing it saves nothing until the grown-up says yes');
  await page.waitForTimeout(1700);
  await page.locator('.got').click(); await page.waitForTimeout(1700); await page.locator('.got').click();
  await page.waitForSelector('.home, .home3d, .map-scroll', { timeout: 8000 }).catch(() => {});
  ok(await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('reading.v1')); return s.checkpoints.v2.result === 'got-it' && s.lessons[10] === undefined && s.lessons[3].result === 'got-it'; }), 'run: Yes saves v2 as got-it and does not write any lesson');
  ok(errors.length === 0, `run: no errors ${errors.join(' | ')}`);
  await m.ctx.close();

  // back from the second activity returns to the first
  const b = await seeded(browser, url, PHONE, k.after, `#/checkpoint/${k.id}/task/0`);
  await b.page.waitForSelector(gameSel); await b.page.waitForTimeout(1300);
  await b.page.locator('.btn.next').click(); await b.page.waitForTimeout(700);
  await b.page.locator('.task-head .icon-btn').first().click(); await b.page.waitForTimeout(700);
  ok(b.page.url().endsWith('#/home'), 'back: the arrow goes back to the path');
  await b.ctx.close();

  // the opening card of every stop, the end message of every stop, and v1's first word
  const WJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/words-decodable.json'), 'utf8')), WL = [...WJ.words, ...WJ.blendWords]; // World 5: blendWords count once their blends are taught
  const HEART = ['is', 'as', 'was', 'of', 'the', 'to', 'you', 'she', 'he', 'me', 'be', 'we', 'his', 'has', 'no', 'go', 'so'];
  ok(WL.every((w) => /^[a-z]{2,}$/.test(w) && !HEART.includes(w) && !/(.)\1/.test(w)) && new Set(WL).size === WL.length, 'words list: lowercase, no repeats, no heart words, no double letters');
  for (const k of STOPS) {
    const m = await seeded(browser, url, PHONE, k.after, `#/checkpoint/${k.id}`);
    await m.page.waitForSelector('.review-intro');
    const t = await m.page.evaluate(() => ({ h1: document.querySelector('.review-intro h1').textContent, line: document.querySelector('.review-intro-line').textContent, btn: (() => { const r = document.querySelector('.review-start').getBoundingClientRect(); return { w: r.width, h: r.height, text: document.querySelector('.review-start').textContent, inView: r.bottom <= innerHeight && r.right <= innerWidth }; })() }));
    ok(t.h1 === 'Review Stop' && /practice the sounds your child already knows/.test(t.line) && /nothing new/.test(t.line) && t.btn.text === 'Start' && t.btn.h >= 48 && t.btn.w >= 120 && t.btn.inView, `${k.id}: the opening card says Review Stop, what it is, and has a big Start (${t.btn.w}x${t.btn.h})`);
    if (k.id === 'v1') await shot(m.page, 'v1-opening-card-390x844');
    await m.page.goto(url + `#/checkpoint/${k.id}/finish`);
    await m.page.waitForSelector('.review-message');
    const msg = await m.page.locator('.review-message').innerText();
    const tg = lettersOfSounds(ORDER_SOUNDS.slice(0, k.after)), fresh = WL.filter((w) => (WJ.blendWords.includes(w) ? isReadableBlends(w, tg) : isReadable(w, tg))), nSounds = ORDER_SOUNDS.slice(0, k.after).filter((x) => !isBlendKey(x)).length;
    const mm = /^Your child has learned (\d+) sounds(?: and \d+ blends)?\. Words made only from these sounds include: (.+)\. That's (\d+) words in all\.(?: Heart words learned so far, counted apart: (.+)\.)?$/.exec(msg.replace(/\s+/g, ' ').trim());
    ok(mm && Number(mm[1]) === nSounds && Number(mm[3]) === fresh.length && mm[2].split(', ').every((w) => fresh.includes(w.toLowerCase())) && mm[2].split(', ').length <= 8 && /^(?!.*pronounce)/.test(msg), `${k.id}: the end message says ${nSounds} sounds and ${fresh.length} words, a fresh count from the list; every example is readable (${msg.slice(0, 90)}...)`);
    const hearts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8')).lessons.slice(0, k.after).flatMap((L) => L.heart || []);
    ok(mm && (mm[4] || '') === hearts.join(', '), `${k.id}: the message lists the ${hearts.length} heart words taught so far, counted apart from the word count`);
    if (k.id === 'v1' || k.id === 'v9') await shot(m.page, `${k.id}-end-message-390x844`);
    await m.ctx.close();
  }
  {
    const v1 = STOPS.find((k) => k.id === 'v1'), at = v1.plan.findIndex((a) => a.task === 'read');
    ok(at === v1.plan.length - 2 && v1.plan[at].words.join() === 'ma,mama' && STOPS.filter((k) => k.plan.some((a) => a.task === 'read')).length === 1, 'v1: the ma, mama reading step is the last step before Ticket Check, in the first stop only');
    const m = await seeded(browser, url, PHONE, v1.after, `#/checkpoint/v1/task/${at}`);
    await m.page.waitForSelector('.first-word-stage');
    await m.page.waitForTimeout(900);
    const one = await m.page.evaluate(() => ({ word: document.querySelector('.first-word-stage').dataset.word, letters: [...document.querySelectorAll('.first-word-stage .glyph-letter')].map((e) => e.dataset.letter).join(''), msg: !!document.querySelector('.first-word-msg') }));
    ok(one.word === 'ma' && one.letters === 'ma' && !one.msg, 'v1 read: first the word ma, big, with the slide under it');
    await m.page.locator('.read-it').click();
    await m.page.waitForTimeout(500);
    const two = await m.page.evaluate(() => ({ word: document.querySelector('.first-word-stage').dataset.word, letters: [...document.querySelectorAll('.first-word-stage .glyph-letter')].map((e) => e.dataset.letter).join(''), band: !!document.querySelector('.slide-band'), msg: !!document.querySelector('.first-word-msg') }));
    ok(two.word === 'mama' && two.letters === 'mama' && two.band && !two.msg, 'v1 read: then mama, with the slide-to-blend under it');
    await shot(m.page, 'v1-mama-390x844');
    await m.page.locator('.read-it').click();
    await m.page.waitForTimeout(1200);
    const three = await m.page.evaluate(() => ({ msg: document.querySelector('.first-word-msg') && document.querySelector('.first-word-msg').textContent, confetti: document.querySelectorAll('.first-word-confetti .confetti i').length, infinite: document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming().iterations === Infinity).length, small: [...document.querySelectorAll('.task-foot button, .read-it')].filter((b) => { const r = b.getBoundingClientRect(); return r.width && (r.height < 47.5 || r.width < 47.5); }).length }));
    ok(three.msg === 'Your child just read their first word: mama!' && three.confetti >= 20 && three.infinite === 0 && three.small === 0, `v1 read: after mama a celebration (${three.confetti} confetti pieces) and the grown-up line (${three.msg})`);
    await m.page.waitForTimeout(700);
    await shot(m.page, 'v1-mama-celebration-390x844');
    ok(m.errors.length === 0, `v1 read: no errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
    // the keepsake: a button after mama, a PNG made on the device (no network), the name fallback, the name kept on the device
    for (const named of [false, true]) {
      const k = await seeded(browser, url, PHONE, v1.after, `#/checkpoint/v1/task/${at}`, named ? { character: { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'star', made: true } } : {});
      await k.page.waitForSelector('.first-word-stage');
      await k.page.waitForTimeout(700);
      ok((await k.page.locator('.keepsake-btn').count()) === 0, `keepsake (${named ? 'named' : 'no name'}): no button before mama`);
      await k.page.locator('.read-it').click(); await k.page.waitForTimeout(400); await k.page.locator('.read-it').click(); await k.page.waitForTimeout(900);
      const bb = await k.page.locator('.keepsake-btn').boundingBox();
      ok(bb && bb.height >= 47.5 && bb.width >= 47.5 && (await k.page.locator('.keepsake-btn').innerText()) === 'Save this moment' && !/share|social/i.test(await k.page.locator('.first-word').innerText()), `keepsake (${named ? 'named' : 'no name'}): "Save this moment" is there after mama, 48 px, no talk of sharing`);
      const reqs = []; k.page.on('request', (r) => { if (!/^(data|blob):/.test(r.url())) reqs.push(r.url()); });
      const dl = k.page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
      await k.page.locator('.keepsake-btn').click();
      await k.page.waitForFunction(() => window.__keepsake && window.__keepsake.size > 0, null, { timeout: 15000 }).catch(() => {});
      const info = await k.page.evaluate(async () => { const s = window.__keepsake; if (!s) return null; const bmp = await createImageBitmap(s.blob); return { type: s.type, size: s.size, w: bmp.width, h: bmp.height, headline: s.headline, }; });
      ok(info && info.type === 'image/png' && info.w === 1080 && info.h === 1350 && info.size > 20000, `keepsake (${named ? 'named' : 'no name'}): a ${info && info.w}x${info && info.h} ${info && info.type} was made (${info && info.size} bytes)`);
      ok(info && info.headline === (named ? 'Lily just read a real word!' : 'Your child just read their first word!'), `keepsake (${named ? 'named' : 'no name'}): the headline ${named ? 'uses the name' : 'falls back to "Your child"'} (${info && info.headline})`);
      ok((await dl) !== null && reqs.length === 0, `keepsake (${named ? 'named' : 'no name'}): it downloads, and no network request was made (${reqs.join(' ') || 'none'})`);
      if (named && SHOTS) { const b64 = await k.page.evaluate(async () => { const buf = new Uint8Array(await window.__keepsake.blob.arrayBuffer()); let s = ''; for (const x of buf) s += String.fromCharCode(x); return btoa(s); }); fs.mkdirSync(path.join(ROOT, 'docs/screenshots/sunny-hills'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'docs/screenshots/sunny-hills/keepsake-mama.png'), Buffer.from(b64, 'base64')); }
      ok(k.errors.length === 0, `keepsake: no errors ${k.errors.join(' | ')}`);
      await k.ctx.close();
    }
  }

  // locked: by address too
  const l = await seeded(browser, url, PHONE, k.after - 1, `#/checkpoint/${k.id}`);
  await l.page.waitForTimeout(900);
  ok(l.page.url().endsWith('#/home'), 'locked: a review stop cannot be opened by address before its lesson is done');
  await l.page.goto(url + `#/checkpoint/${k.id}/task/1`); await l.page.waitForTimeout(900);
  ok(l.page.url().endsWith('#/home'), 'locked: nor an activity of it');
  await l.page.goto(url + `#/checkpoint/${STOPS[0].id}/task/9`); await l.page.waitForTimeout(900);
  ok(l.page.url().endsWith('#/home'), 'a step past the end goes home');
  await l.ctx.close();
}

// Fit: the first screen of every stop at the three phone sizes, and heat.
export async function fitChecks({ browser, url, ok }) {
  for (const vp of SIZES) {
    for (const k of STOPS) {
      const last = k.plan.length - 1;
      for (const step of [0, last]) {
        const m = await seeded(browser, url, vp, k.after, `#/checkpoint/${k.id}/task/${step}`);
        const p = m.page;
        await p.waitForSelector(gameSel + ', .check', { timeout: 8000 });
        await p.waitForTimeout(700);
        const r = await p.evaluate(() => {
          const out = { scrollX: document.documentElement.scrollWidth > innerWidth + 1, small: [], outside: [] };
          for (const b of document.querySelectorAll('.task-foot button, .task-head button')) {
            const q = b.getBoundingClientRect();
            if (!q.width) continue;
            if (q.height < 47.5 || q.width < 47.5) out.small.push(b.className + ' ' + Math.round(q.width) + 'x' + Math.round(q.height));
            if (q.left < -0.5 || q.right > innerWidth + 0.5 || q.top < -0.5 || q.bottom > innerHeight + 0.5) out.outside.push(b.className);
          }
          for (const b of document.querySelectorAll('.opt-card')) { const q = b.getBoundingClientRect(); if (q.height < 47.5 || q.bottom > innerHeight + 0.5 || q.right > innerWidth + 0.5) out.small.push('opt-card'); }
          out.infinite = document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming().iterations === Infinity).length;
          return out;
        });
        const tag = `${vp.name} ${k.id} step ${step + 1} (${k.plan[step].task})`;
        ok(!r.scrollX && r.small.length === 0 && r.outside.length === 0, `${tag}: fits, no sideways scroll, 48 px targets on screen (${r.small.concat(r.outside).join('; ') || 'ok'})`);
        ok(r.infinite === 0, `${tag}: no endless animation (${r.infinite})`);
        ok(m.errors.length === 0, `${tag}: no errors ${m.errors.join(' | ')}`);
        await m.ctx.close();
      }
    }
  }
}

// Home: the stop is on the line, looks its own, holds the train, and is listed in Grownups.
export async function homeChecks({ browser, url, ok }) {
  const k = STOPS[0];
  const label = `${k.title}`;
  const h = await openHome(browser, url, PHONE, state(k.after));
  const { page, errors } = h;
  ok(await until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, 20000), 'home: the 3D railway renders and settles');
  const btns = await page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => ({ label: b.getAttribute('aria-label'), cls: b.className, kind: b.dataset.kind })));
  const iv = btns.findIndex((b) => b.label.startsWith(label));
  ok(iv > 0 && btns[iv].cls.includes('is-current') && /^Lesson 3/.test(btns[iv - 1].label) && /^Lesson 4/.test(btns[iv + 1].label), `home: after lesson 3 the Review Stop is the current stop (${btns.map((b) => b.label + ':' + b.cls.replace(/.*is-/, '')).join(' | ')})`);
  ok(/is-unlocked|is-current/.test(btns[iv + 1].cls) && !btns[iv + 1].cls.includes('is-locked'), 'home: lesson 4 stays open while the stop is held');
  await showStop(page, `.station-btn[aria-label^="${label}"]`);
  await page.waitForTimeout(800);
  await shot(page, 'home-held-390x844');
  await page.locator(`.station-btn[aria-label^="${label}"]`).first().click({ force: true });
  await page.waitForSelector('.review-intro', { timeout: 8000 });
  ok(page.url().endsWith(`#/checkpoint/${k.id}`), 'home: tapping the stop opens its opening card');
  await page.locator('.review-start').click();
  await page.waitForSelector(gameSel, { timeout: 8000 });
  ok(page.url().endsWith(`#/checkpoint/${k.id}/task/0`), 'home: Start opens its first activity');
  ok(errors.length === 0, `home: no errors ${errors.join(' | ')}`);
  await h.ctx.close();

  // a child already past lesson 4: the stop is behind them, done, and the train stands at the lesson
  const p2 = await openHome(browser, url, PHONE, state(5));
  await until(p2.page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, 20000);
  const b2 = await p2.page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => ({ label: b.getAttribute('aria-label'), cls: b.className })));
  const rs = b2.find((b) => b.label.startsWith(label));
  ok(rs && rs.label.endsWith(', done') && rs.cls.includes('is-done'), `home: with lesson 4 and 5 done, a review stop behind is marked done (${rs && rs.label})`);
  ok(b2.some((b) => /^Lesson 6/.test(b.label) && b.cls.includes('is-current')), 'home: and the train stands at the next lesson');
  await p2.ctx.close();

  // Grownups lists all nine, with the stop icon and its own title
  const g = await seeded(browser, url, PHONE, 17, '#/home');
  await g.page.waitForSelector('.pill-hold');
  await g.page.waitForTimeout(700);
  const gb = await g.page.locator('.pill-hold').boundingBox();
  await g.page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await g.page.mouse.down(); await g.page.waitForTimeout(2250); await g.page.mouse.up();
  await g.page.waitForSelector('.grownups');
  const rows = await g.page.locator('.gu-row').allInnerTexts();
  ok(await g.page.locator('.gu-world').count() === 4, 'grownups: with Green Valley done all four worlds that have lessons are listed (Digraph Docks too)');
  ok(rows.filter((r) => r.includes('Review Stop')).length === 11 && rows.some((r) => r.includes('Read It Again')) && !rows.some((r) => /Smooth/.test(r)), `grownups: eleven Review Stops and Read It Again are listed (${rows.length} rows)`);
  ok((await g.page.locator('.gu-row .ticket-art').count()) === 11 && (await g.page.locator('.gu-row .reread-art').count()) === 1, 'grownups: each stop kind has its own icon');
  await g.ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  await dataChecks({ ok });
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await screenChecks({ browser, url, ok });
  await fitChecks({ browser, url, ok });
  await homeChecks({ browser, url, ok });
  await browser.close();
  server.close();
  console.log(`review-stops: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
