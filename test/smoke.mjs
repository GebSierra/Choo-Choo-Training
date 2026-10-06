import fs from 'node:fs';
import path from 'node:path';
import { audit } from './audit.mjs';
import { SPEECH_STUB, silentWav } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, touchDrag, SEEN, DONE_JSON, SAMPLE_LESSONS, doneThrough, showStop } from './lib.mjs';
import { spokenStrings, isIsolated } from './check-content.mjs';
import { tasksFor } from '../js/lessons.js';
import { usedImages } from '../tools/precache-images.mjs';
import { huntChecks, dragChecks, dragReducedChecks, reducedChecks } from './games.mjs';
import { blendChecks, blendReducedChecks } from './blend.mjs';
import { practiceChecks, renameChecks, sackMapChecks, sackGrownupsChecks } from './sack.mjs';
import { dealerChecks } from './deal.mjs';
import { sfxChecks, sfxGrownupsChecks } from './sfx.mjs';
import { roomChecks, barChecks, timerAndFirstVisitChecks, grownupsScriptChecks } from './script.mjs';
import { round2Checks } from './round2.mjs';
import { round3Checks } from './round3.mjs';
import { mapAllChecks } from './map.mjs';
import { lettersSlideChecks, pictureWordSlideChecks, wordsSlideChecks, slideReducedChecks } from './slide.mjs';

const FAST = process.argv.includes('--fast');
const OUT = path.join(ROOT, '_test');
const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };

const COUNT = (n) => tasksFor(CUR.lessons[n - 1]).length; // task counts come from the data: 9, 10, 10
const { server, url } = await startServer();
const pw = await loadPlaywright();
const browser = await launch(pw);

for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.goto(url);
  await page.waitForSelector('.screen');
  await page.screenshot({ path: path.join(OUT, `home-${vp.name}.png`) });
  ok(errors.length === 0, `${vp.name}: console errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Home and lesson overview (step 6).
const SEED = (lessons, settings = {}) => `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:${JSON.stringify(lessons)},settings:${JSON.stringify({ seenScripts: SEEN, ...settings })},firstRunDone:true}))`;
for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(SEED({ 1: { tasksDone: [0, 1], result: null, completedAt: null } }));
  await page.goto(url + '#/home');
  await page.waitForSelector('.stone', { state: 'attached' });
  const STONES = CUR.lessons.length + CUR.checkpoints.length;
  ok((await page.locator('.stone').count()) === STONES, `${vp.name}: ${STONES} stones (${CUR.lessons.length} lessons and ${CUR.checkpoints.length} sound sacks)`);
  ok((await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY)) === 'none', `${vp.name}: html refuses overscroll, so pull-to-refresh is off`);
  ok((await page.locator('.stone.is-current').count()) === 1 && (await page.locator('.stone.is-locked').count()) === STONES - 1, `${vp.name}: one current, every other stone locked`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `home-${vp.name}.png`) });
  await showStop(page, '.stone.is-locked'); // on the 3D railway only the stops in view are shown
  await page.locator('.stone.is-locked').first().click({ force: true });
  await page.waitForTimeout(400);
  ok(page.url().endsWith('#/home'), `${vp.name}: locked stone does not navigate`);
  await showStop(page, '.stone.is-current');
  await page.locator('.stone.is-current').click();
  await page.waitForSelector('.lesson-overview');
  ok(page.url().endsWith('#/lesson/1'), `${vp.name}: current stone opens lesson 1`);
  ok((await page.locator('.task-card').count()) === COUNT(1), `${vp.name}: lesson 1 has ${COUNT(1)} task cards`);
  ok((await page.locator('.task-card.is-done').count()) === 2, `${vp.name}: two done ticks from the store`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `lesson1-${vp.name}.png`) });
  ok(errors.length === 0, `${vp.name}: home/lesson errors ${errors.join(' | ')}`);
  await ctx.close();
}
{
  // Lesson 2 shows the review card and correct targets; locked lessons bounce home.
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SEED({ 1: { tasksDone: [], result: 'got-it', completedAt: 'x' } }));
  await page.goto(url + '#/lesson/2');
  await page.waitForSelector('.lesson-overview');
  ok((await page.locator('.task-card').count()) === COUNT(2), `lesson 2 has ${COUNT(2)} task cards`);
  const first = await page.locator('.task-card').first().innerText();
  ok(/Letter Review/.test(first), 'lesson 2 starts with Letter Review');
  await page.goto(url + '#/lesson/3');
  await page.waitForSelector('.home');
  ok(page.url().endsWith('#/home'), 'locked lesson 3 redirects home');
  ok(errors.length === 0, 'lesson 2 errors ' + errors.join(' | '));
  await ctx.close();
}

// Slide track and trace pad (step 7), on #/lab.
for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(SEED({}));
  await page.goto(url + '#/lab');
  await page.waitForSelector('.slide-track');
  await page.waitForTimeout(400);
  await page.locator('.slide-track').scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => scrollY);
  const tb = await page.locator('.slide-track').boundingBox();
  const hb = await page.locator('.st-handle').boundingBox();
  let midScroll = null, reached = null;
  await touchDrag(page, { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 }, { x: hb.x + hb.width / 2 + tb.width - hb.width + 4, y: hb.y + hb.height / 2 }, {
    during: async () => { midScroll = await page.evaluate(() => scrollY); reached = await page.evaluate(() => document.querySelector('.slide-track').classList.contains('is-end')); },
  });
  ok(reached, `${vp.name}: slide track reaches end state`);
  ok(midScroll === scrollBefore && (await page.evaluate(() => scrollY)) === scrollBefore, `${vp.name}: page did not scroll during drag`);
  ok((await page.evaluate(() => document.querySelector('.slide-track').dataset.count)) === '1', `${vp.name}: completion counted once`);
  await page.waitForTimeout(1500);
  ok(!(await page.evaluate(() => document.querySelector('.slide-track').classList.contains('is-end'))), `${vp.name}: handle glided home`);
  // Trace pad: drawing changes pixels; clear wipes them.
  const inkPixels = () => page.evaluate(() => { const c = document.querySelector('.tp-ink'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
  const before = await inkPixels();
  const pb = await page.locator('.tp-ink').boundingBox();
  await page.locator('.tp-ink').scrollIntoViewIfNeeded();
  const pb2 = await page.locator('.tp-ink').boundingBox();
  await page.mouse.move(pb2.x + pb2.width * 0.6, pb2.y + pb2.height * 0.3);
  await page.mouse.down();
  for (let i = 0; i <= 10; i++) await page.mouse.move(pb2.x + pb2.width * 0.6, pb2.y + pb2.height * (0.3 + i * 0.04));
  await page.mouse.up();
  const after = await inkPixels();
  ok(before === 0 && after > 200, `${vp.name}: trace pad pixels changed (${before} -> ${after})`);
  await page.click('#lab-show');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `lab-${vp.name}.png`) });
  await page.waitForTimeout(3500);
  await page.click('#lab-clear');
  ok((await inkPixels()) === 0, `${vp.name}: clear wipes the child's ink`);
  ok(errors.length === 0, `${vp.name}: lab errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Every task of every lesson at every viewport (step 8): 20 tasks, audits, screenshots.
const LESSONS = SAMPLE_LESSONS; // lessons 1 to 3, the first new one, a middle one and the last: all their tasks are walked
const TASK_COUNTS = Object.fromEntries(LESSONS.map((n) => [n, tasksFor(CUR.lessons[n - 1]).length]));
const TOTAL_TASKS = Object.values(TASK_COUNTS).reduce((a, b) => a + b, 0);
const ALL_OPEN = SEED(JSON.parse(DONE_JSON));
const ALL_OPEN_SOUNDS = SEED(JSON.parse(DONE_JSON), { playSounds: true });
const allSpoken = [];
for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(ALL_OPEN);
  let visited = 0;
  for (const L of LESSONS) {
    for (let i = 0; i < TASK_COUNTS[L]; i++) {
      await page.goto(url + `#/lesson/${L}/task/${i}`);
      await page.reload();
      await page.waitForSelector('.task-screen');
      await page.waitForTimeout(650);
      const problems = await audit(page, `${vp.name} L${L} T${i}`);
      ok(problems.length === 0, problems.join(' | '));
      if (vp.name !== 'small') await page.screenshot({ path: path.join(OUT, `l${L}-t${i}-${vp.name}.png`) });
      // Revealed states and the later words, not only the first view.
      const lesson = CUR.lessons[L - 1];
      const title = await page.locator('.task-head h1').innerText();
      if (title === tasksFor(CUR.lessons[L - 1])[i].name) visited++; // counted only when the screen is the task the data lists
      const reveal = { 'Word Cars': ['.merged-tile', lesson.sayingWords.length], 'Saying Sounds': ['.sounds-stage', lesson.sayingSounds.length] }[title];
      if (reveal) {
        for (let w = 0; w < reveal[1]; w++) {
          await page.locator(reveal[0]).click();
          await page.waitForTimeout(550);
          const rp = await audit(page, `${vp.name} L${L} T${i} ${title} word ${w + 1} revealed`);
          ok(rp.length === 0, rp.join(' | '));
          if (w < reveal[1] - 1) { await page.locator('.btn.ghost.small').click(); await page.waitForTimeout(450); }
        }
      } else if (title === 'Ticket Check') {
        await page.locator('.opt-card').first().click();
        await page.waitForTimeout(400);
        const qp = await audit(page, `${vp.name} L${L} T${i} Ticket Check picked`);
        ok(qp.length === 0, qp.join(' | '));
      } else if (title === 'Letter Review' && lesson.review.length > 1) {
        for (let r = 1; r < lesson.review.length; r++) {
          await page.click('.btn.next');
          await page.waitForTimeout(600);
          const rp = await audit(page, `${vp.name} L${L} T${i} review letter ${r + 1}`);
          ok(rp.length === 0, rp.join(' | '));
        }
      }
    }
    await page.goto(url + `#/lesson/${L}`); await page.reload();
    await page.waitForSelector('.lesson-overview'); await page.waitForTimeout(500);
    const problems = await audit(page, `${vp.name} overview L${L}`);
    ok(problems.length === 0, problems.join(' | '));
    await page.goto(url + `#/lesson/${L}/finish`); await page.reload();
    await page.waitForSelector('.finish'); await page.waitForTimeout(700);
    const fp = await audit(page, `${vp.name} finish L${L}`);
    ok(fp.length === 0, fp.join(' | '));
    if (L === 2 && vp.name !== 'small') await page.screenshot({ path: path.join(OUT, `finish-${vp.name}.png`) });
  }
  ok(visited === TOTAL_TASKS, `${vp.name}: visited ${visited} of ${TOTAL_TASKS} tasks`);
  ok(errors.length === 0, `${vp.name}: task walk errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Touch drag on the real New Letter screen (not only the lab): the handle reaches the end and the stage does not scroll.
for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(ALL_OPEN);
  await page.goto(url + '#/lesson/2/task/1');
  await page.waitForSelector('.new-letter .slide-track');
  await page.waitForTimeout(900);
  const tb = await page.locator('.slide-track').boundingBox();
  const hb = await page.locator('.st-handle').boundingBox();
  const top = () => page.evaluate(() => document.querySelector('.task-activity').scrollTop);
  const before = await top();
  const eventsBefore = await page.evaluate(() => window.__events.length);
  let mid = null, reached = null, sparks = 0;
  await touchDrag(page, { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 }, { x: hb.x + hb.width / 2 + tb.width - hb.width + 4, y: hb.y + hb.height / 2 }, {
    during: async () => { mid = await top(); const s = await page.evaluate(() => ({ end: document.querySelector('.slide-track').classList.contains('is-end'), sparks: document.querySelectorAll('.slide-track .spark').length })); reached = s.end; sparks = Math.max(sparks, s.sparks); },
  });
  ok(reached, `${vp.name}: New Letter slide track reaches the end by touch`);
  ok((await page.evaluate(() => window.__events.length)) === eventsBefore, `${vp.name}: dragging the letter plays no sound and speaks nothing`);
  ok(sparks > 0, `${vp.name}: a sparkle bursts when the letter reaches the end (${sparks} stars)`);
  await page.waitForTimeout(1600);
  ok((await page.evaluate(() => document.querySelectorAll('.slide-track .spark').length)) === 0, `${vp.name}: sparkles clean themselves up`);
  ok(!(await page.evaluate(() => document.querySelector('.slide-track').classList.contains('is-end'))), `${vp.name}: the slider resets after the sparkle`);
  ok(mid === before && (await top()) === before, `${vp.name}: New Letter stage did not scroll during the touch drag`);
  ok((await page.evaluate(() => document.querySelector('.slide-track').dataset.count)) === '1', `${vp.name}: New Letter completion counted once`);
  ok(errors.length === 0, `${vp.name}: touch drag errors ${errors.join(' | ')}`);
  await ctx.close();
}
// The suites below also run on their own (npm test); `node test/smoke.mjs --fast` leaves them out, no flag runs everything.
if (!FAST) {
// Letter Hunt's dealer on its own, with a seeded generator.
dealerChecks(ok);
// The parent script: one compact bar that opens as a sheet, and the room it gives every task.
await roomChecks({ browser, url, ok });
for (const vp of VIEWPORTS) await barChecks({ browser, url, ok, vp, shot: async (page, name) => page.screenshot({ path: path.join(OUT, `script-${vp.name}-${name}.png`) }) });
await timerAndFirstVisitChecks({ browser, url, ok });
await grownupsScriptChecks({ browser, url, ok });
// Sound effects: what would be scheduled for each event (Web Audio is a recorder in the tests).
await sfxChecks({ browser, url, ok });
await sfxGrownupsChecks({ browser, url, ok });
// The Letter Hunt game: layout and touch behaviour at the three viewports, plus reduced motion.
const shotTo = (dir) => async (page, name) => { await page.screenshot({ path: path.join(dir, `${name}.png`) }); };
for (const vp of VIEWPORTS) {
  await huntChecks({ browser, url, ok, CUR, vp, shot: shotTo(OUT) });
  await dragChecks({ browser, url, ok, CUR, vp, shot: async (page, name) => page.screenshot({ path: path.join(OUT, `drag-${vp.name}-${name}.png`) }) });
}
// Letter Hunt for every lesson from the second on (every new letter and its distractors).
for (const lessonNo of CUR.lessons.map((l) => l.number).filter((n) => n >= 2)) await huntChecks({ browser, url, ok, CUR, vp: VIEWPORTS[0], lessonNo });
await reducedChecks({ browser, url, ok, CUR });
await dragReducedChecks({ browser, url, ok, CUR });
// Saying Sounds, slide to blend: real touch drags across am (lesson 2) and sam (lesson 3).
for (const vp of VIEWPORTS) for (const lessonNo of [2, 3, 4]) await blendChecks({ browser, url, ok, vp, lessonNo, shot: shotTo(OUT) });
await blendReducedChecks({ browser, url, ok });
// Ten awkward slides per task (starting left of, on, above, below and in the middle of the word, with vertical drift) must all work:
// letters, a picture word after its tap, and the revealed word in Saying Words with its picture wash.
for (const vp of VIEWPORTS) {
  for (const lessonNo of [2, 3, 4, 8]) await lettersSlideChecks({ browser, url, ok, vp, lessonNo });
  await pictureWordSlideChecks({ browser, url, ok, vp, lessonNo: 4 });
  await pictureWordSlideChecks({ browser, url, ok, vp, shot: async (page, name) => page.screenshot({ path: path.join(OUT, `slide-picture-${vp.name}-${name}.png`) }) });
  for (const lessonNo of [1, 2]) await wordsSlideChecks({ browser, url, ok, vp, lessonNo, shot: async (page, name) => page.screenshot({ path: path.join(OUT, `slide-words-${vp.name}-L${lessonNo}-${name}.png`) }) });
}
await slideReducedChecks({ browser, url, ok });
// Practicing Words (the Loading Dock inside a lesson) and the renames; the sack stop checks run only while the line has a checkpoint.
await sackMapChecks({ browser, url, ok, vp: VIEWPORTS[0] });
await practiceChecks({ browser, url, ok, CUR, vp: VIEWPORTS[0], shot: shotTo(OUT) });
await renameChecks({ browser, url, ok, CUR });
await sackGrownupsChecks({ browser, url, ok });
  await round2Checks({ browser, url, ok });
  await round3Checks({ browser, url, ok });
  await mapAllChecks({ browser, url, ok, shot: async (page, name) => page.screenshot({ path: path.join(OUT, `map-${name}.png`) }) });
}
{
  // Full screen button on Home and in Grownups (the Fullscreen API is stubbed so the call can be counted).
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(SEED({}));
  await page.addInitScript(() => {
    window.__fs = 0;
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    Element.prototype.requestFullscreen = function () { window.__fs++; return Promise.resolve(); };
  });
  await page.goto(url + '#/home');
  await page.waitForSelector('.home-fs');
  await page.waitForTimeout(800);
  const fb = await page.locator('.home-fs').boundingBox();
  ok(fb.width >= 48 && fb.height >= 48, `home: full screen button is at least 48px (${fb.width}x${fb.height})`);
  ok((await page.getAttribute('.home-fs', 'aria-label')) === 'Full screen', 'home: full screen button is labelled');
  await page.click('.home-fs');
  ok((await page.evaluate(() => window.__fs)) === 1, 'home: tapping the full screen button asks the browser for full screen');
  ok(errors.length === 0, 'full screen errors ' + errors.join(' | '));
  await ctx.close();
}
{
  // The two version strings move together, and no spoken curriculum string is a lone letter.
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const cache = sw.match(/const CACHE_VERSION = 'reading-v([^']+)'/);
  const app = fs.readFileSync(path.join(ROOT, 'js/version.js'), 'utf8').match(/APP_VERSION = '([^']+)'/);
  ok(cache && app && cache[1] === app[1], `CACHE_VERSION (${cache && cache[1]}) equals APP_VERSION (${app && app[1]})`);
  const spokenBad = spokenStrings(CUR).filter(isIsolated);
  ok(spokenBad.length === 0, 'no spoken curriculum string is a single letter or a run of one: ' + JSON.stringify(spokenBad));
}

// Full lesson 1 flow with the real buttons: speech on entry, popup, done ticks, got it unlocks lesson 2.
{
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(SEED({}));
  await ctx.route(/youtu(\.be|be\.com)/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>video</title>' }));
  await page.goto(url + '#/home');
  await page.waitForSelector('.stone.is-current');
  await page.locator('.stone.is-current').click();
  await page.waitForSelector('.lesson-overview');
  // Optional alphabet song: behind the same hold gate, opens a popup, is not a task.
  ok((await page.locator('.song-row').count()) === 1 && (await page.locator('.task-card').count()) === COUNT(1), 'alphabet song row exists and is not a task card');
  await page.locator('.song-hold').scrollIntoViewIfNeeded();
  const sb = await page.locator('.song-hold').boundingBox();
  const [songPopup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 4000 }),
    (async () => { await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await page.mouse.down(); await page.waitForTimeout(2200); await page.mouse.up(); })(),
  ]);
  await songPopup.waitForLoadState('domcontentloaded');
  ok(/qKQAQc2NEuk/.test(songPopup.url()), 'alphabet song opens its video: ' + songPopup.url());
  await songPopup.close();
  await page.click('.start-btn');
  await page.waitForSelector('.task-screen');
  await page.waitForTimeout(800);
  let spoken = await page.evaluate(() => window.__spoken);
  ok(spoken.includes('Today we learn a new letter. Your grown up will say its sound.'), 'entry speech for New Letter (quiet): ' + JSON.stringify(spoken));
  ok(!(await page.evaluate(() => window.__events.some((e) => e.type === 'clip'))), 'with the default settings the entry speech plays no clip');
  // Next to the Sound Story and open the playlist with a hold.
  await page.click('.btn.next');
  await page.waitForFunction(() => document.querySelector('.task-head h1')?.textContent === 'Sound Story');
  await page.waitForTimeout(500);
  const hold = page.locator('.hold-btn');
  // A short tap must not open it.
  let popped = false; page.on('popup', () => { popped = true; });
  await hold.click(); await page.waitForTimeout(400);
  ok(!popped, 'a short tap does not open the playlist');
  const hb = await hold.boundingBox();
  const [popup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 4000 }),
    (async () => { await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down(); await page.waitForTimeout(2200); await page.mouse.up(); })(),
  ]);
  ok(/youtube\.com\/playlist\?list=PL2hNdtrsO2hIINInfmEb55IpwTw0IrQZW/.test(popup.url()), 'playlist popup opened the playlist: ' + popup.url());
  await popup.close();
  // Walk the remaining tasks.
  for (let k = 0; k < COUNT(1) - 2; k++) { await page.click('.btn.next'); await page.waitForTimeout(450); }
  await page.waitForFunction(() => document.querySelector('.task-head h1')?.textContent === 'Ticket Check');
  await page.locator('.opt-card').first().click();
  await page.click('.btn.next');
  await page.waitForSelector('.finish');
  ok(page.url().endsWith('#/lesson/1/finish'), 'last Next opens the finish screen');
  await page.click('.btn.got');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).lessons[1]?.result ?? null)) === null, 'the first Yes tap arms without storing got-it');
  ok(await page.locator('.btn.got').isDisabled(), 'the armed Yes is dimmed for 1.5 s');
  await page.waitForFunction(() => !document.querySelector('.btn.got').disabled, null, { timeout: 3000 });
  await page.click('.btn.got'); // the second tap records got-it and goes back to the railway
  await page.waitForSelector('.stone', { state: 'attached' });
  ok(page.url().endsWith('#/home'), 'the second Yes tap lands on the railway home');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).lessons[1].result)) === 'got-it', 'the second Yes tap stores got-it');
  await page.waitForTimeout(600);
  ok((await page.locator('.stone.is-done').count()) === 1 && (await page.locator('.stone.is-current').count()) === 1, 'got it: lesson 1 done, lesson 2 current');
  // 1.8.5: after a lesson the station-complete sequence plays (the camera follows the train); let it finish first
  await page.waitForFunction(() => !window.__train || !window.__train.running, null, { timeout: 15000 });
  await showStop(page, '.stone.is-done');
  await page.locator('.stone.is-done').click();
  await page.waitForSelector('.lesson-overview');
  await page.waitForTimeout(400);
  ok((await page.locator('.task-card.is-done').count()) === COUNT(1), 'overview shows every task done after the lesson');
  spoken = await page.evaluate(() => window.__spoken);
  allSpoken.push(...spoken);
  ok(errors.length === 0, 'lesson flow errors ' + errors.join(' | '));
  await ctx.close();
}
ok(allSpoken.every((t) => { const z = t.trim().toLowerCase().replace(/[^a-z]/g, ''); return !(z.length === 1 || (z.length > 1 && /^(.)\1+$/.test(z))); }), 'speak never called with a single letter or repeated run');

// Grownups gate, reset and voice settings (step 9).
{
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(`if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[0],result:'got-it',completedAt:'2026-09-30T12:00:00Z'}},settings:{},firstRunDone:true})); }`);
  await page.goto(url + '#/home');
  await page.waitForSelector('.pill-hold');
  await page.waitForTimeout(600);
  // Direct navigation without the gate bounces home.
  await page.evaluate(() => { location.hash = '#/grownups'; });
  await page.waitForTimeout(500);
  ok(page.url().endsWith('#/home'), 'grownups without the gate bounces home');
  // A short tap does not open it.
  await page.click('.pill-hold');
  await page.waitForTimeout(500);
  ok(page.url().endsWith('#/home') && (await page.locator('.hold-hint.show').count()) === 1, 'short tap on Grownups shows a hint and stays');
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  await page.waitForTimeout(400);
  ok(page.url().endsWith('#/home'), 'releasing early cancels the gate');
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(1700); await page.mouse.up();
  await page.waitForTimeout(400);
  ok(page.url().endsWith('#/home'), 'a 1.7 s hold does not open Grownups (the gate is 2 s)');
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(2250); await page.mouse.up();
  await page.waitForSelector('.grownups');
  ok(page.url().endsWith('#/grownups'), 'holding opens Grownups');
  await page.waitForTimeout(900);
  const gp = await audit(page, 'grownups');
  ok(gp.length === 0, gp.join(' | '));
  await page.screenshot({ path: path.join(OUT, 'grownups-pixel7.png'), fullPage: true });
  ok((await page.locator('.gu-pill').count()) === Object.values(CUR.sounds).filter((s) => s.clip).length, 'clip status lists only the sounds that have a clip');
  // Voice choice persists.
  await page.selectOption('.gu-select', 'g-us');
  await page.locator('[aria-label="Speaking speed"]').evaluate((el) => { el.value = 1.05; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('.gu-switch');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings);
  ok(saved.voiceURI === 'g-us' && saved.rate === 1.05 && saved.autoSpeak === false, 'voice, rate and auto-speak persist ' + JSON.stringify(saved));
  // "The thinking behind this app", "Recorded sounds" and "All the sounds" start closed (so Reset is within reach); a tap opens one, and "Test voice" sits right under Speed.
  const folds = page.locator('.gu-fold');
  ok((await folds.count()) === 4 && (await folds.evaluateAll((l) => l.every((b) => b.getAttribute('aria-expanded') === 'false' && document.getElementById(b.getAttribute('aria-controls')).hidden))), 'Grownups: the four reference cards start closed');
  ok(await page.evaluate(() => { const r = document.querySelector('[aria-label="Speaking speed"]').closest('label'); return r.nextElementSibling && r.nextElementSibling.textContent.includes('Test voice'); }), 'Grownups: Test voice sits directly under Speed');
  ok((await page.locator('[aria-label="Play sounds"]').count()) === 1, 'Grownups: the sound-effects switch is labelled "Play sounds"');
  const recorded = page.locator('.gu-fold', { hasText: 'Recorded sounds' });
  await recorded.click();
  ok((await recorded.getAttribute('aria-expanded')) === 'true' && await page.locator('[aria-label="Play recorded letter sounds"]').isVisible(), 'Grownups: a tap on "Recorded sounds" opens it');
  ok(saved.playSounds === false && (await page.getAttribute('[aria-label="Play recorded letter sounds"]', 'aria-checked')) === 'false', 'Grownups: Play recorded letter sounds is off by default');
  await page.click('[aria-label="Play recorded letter sounds"]');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.playSounds)) === true, 'Grownups: the switch turns playSounds on');
  await page.click('[aria-label="Play recorded letter sounds"]');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.playSounds)) === false, 'Grownups: the switch turns playSounds off again');
  await page.evaluate(() => window.__spoken.length = 0);
  await page.click('text=Test voice');
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => window.__spoken)).includes('moon, apple, sun'), 'Test voice speaks moon, apple, sun');
  // Fix 12: Unlock asks first.
  await page.locator('.gu-row .btn', { hasText: 'Unlock' }).first().click();
  ok((await page.locator('[aria-label="Confirm unlock"]').count()) === 1, 'Unlock shows a confirm step');
  await page.click('[aria-label="Confirm unlock"] >> text=Cancel');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).lessons[3]?.unlocked)) !== true, 'Cancel leaves the lesson locked');
  await page.locator('.gu-row .btn', { hasText: 'Unlock' }).first().click();
  await page.click('[aria-label="Confirm unlock"] button:has-text("Unlock")');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).lessons[3]?.unlocked)) === true, 'confirming Unlock unlocks the lesson');
  // Reset returns Home to first run and keeps the voice.
  await page.click('text=Reset all progress');
  await page.click('.btn.danger');
  await page.waitForSelector('.home');
  await page.waitForTimeout(800);
  ok((await page.locator('.first-run').count()) === 1, 'reset returns Home to the first-run card');
  ok((await page.locator('.stone.is-done').count()) === 0, 'reset clears done stones');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.voiceURI);
  ok(after === 'g-us', 'reset keeps the chosen voice');
  ok(errors.length === 0, 'grownups errors ' + errors.join(' | '));
  await ctx.close();
}
// Fix 11: Back then history.back() must not re-enter Grownups without a new hold.
{
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(SEED({}));
  await page.goto(url + '#/home');
  await page.waitForSelector('.pill-hold');
  await page.waitForTimeout(600);
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(2250); await page.mouse.up();
  await page.waitForSelector('.grownups');
  await page.waitForTimeout(500);
  await page.click('.gu-head .icon-btn');
  await page.waitForSelector('.home');
  await page.goBack();
  await page.waitForTimeout(800);
  ok((await page.locator('.grownups').count()) === 0 && (await page.locator('.home').count()) === 1 && page.url().endsWith('#/home'), 'history.back() after leaving Grownups shows Home, not Grownups');
  ok(errors.length === 0, 'gate bypass errors ' + errors.join(' | '));
  await ctx.close();
}
// Fix 13: corrupt saved progress starts fresh or is repaired; it never crashes.
for (const [name, raw] of [
  ['lessons null', '{"schema":1,"lessons":null,"settings":{}}'],
  ['lessons array', '{"schema":1,"lessons":[],"settings":{}}'],
  ['not json', '{{{oops'],
  ['bad entries', '{"schema":1,"lessons":{"1":{"tasksDone":"oops","result":"got-it"},"2":null},"settings":[],"firstRunDone":true}'],
]) {
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(`localStorage.setItem('reading.v1', ${JSON.stringify(raw)})`);
  await page.goto(url + '#/home');
  await page.waitForSelector('.stone', { state: 'attached' });
  ok((await page.locator('.stone').count()) === CUR.lessons.length + CUR.checkpoints.length, `corrupt store (${name}): Home renders`);
  if (name === 'bad entries') {
    await page.goto(url + '#/lesson/2');
    await page.waitForSelector('.lesson-overview');
    ok((await page.locator('.task-card').count()) === COUNT(2) && (await page.locator('.task-card.is-done').count()) === 0, 'corrupt store (bad entries): repaired, lesson 2 opens with nothing done');
  }
  ok(errors.length === 0, `corrupt store (${name}) errors ${errors.join(' | ')}`);
  await ctx.close();
}
{
  // Fix 8: Next is dimmed for a second after a task loads.
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(ALL_OPEN);
  await page.goto(url + '#/lesson/2/task/2');
  await page.waitForSelector('.task-screen');
  ok(await page.locator('.btn.next').isDisabled(), 'Next is disabled right after a task loads');
  await page.waitForTimeout(1150);
  ok(await page.locator('.btn.next').isEnabled(), 'Next is enabled after one second');
  // Fix 9: the finish screen ignores taps at first; Yes takes two taps; practice keeps the best result.
  await page.goto(url + '#/lesson/2/finish');
  await page.waitForSelector('.finish');
  ok(await page.locator('.btn.got').isDisabled() && await page.locator('.btn.practice').isDisabled(), 'finish ignores taps for the first 1.5 s');
  const stored = (n) => page.evaluate((k) => JSON.parse(localStorage.getItem('reading.v1')).lessons[k]?.result ?? null, n);
  await page.waitForFunction(() => !document.querySelector('.btn.got').disabled, null, { timeout: 3000 });
  await page.click('.btn.got');
  ok(/Yes, back to path/.test(await page.locator('.btn.got').innerText()) && page.url().endsWith('#/lesson/2/finish'), 'first Yes tap only arms the button');
  ok(/Tap again to go back to the path\./.test(await page.locator('.finish-note').innerText()), 'armed note says "Tap again to go back to the path."');
  ok(await page.locator('.btn.got').isDisabled(), 'after the arming tap the button is disabled');
  await page.waitForTimeout(1700);
  ok(await page.locator('.btn.got').isEnabled(), 'the armed button wakes after 1.5 s');
  await page.click('.btn.got');
  await page.waitForFunction(() => location.hash === '#/home', null, { timeout: 4000 }).catch(() => {});
  ok(page.url().endsWith('#/home'), 'second Yes tap goes back to the railway home');
  {
    // The final lesson: Yes goes back to the path. A fresh page, with every lesson before it done and itself not yet.
    const LAST = CUR.lessons.length;
    const fin = await newPage(browser, VIEWPORTS[0]);
    await fin.page.addInitScript(SPEECH_STUB);
    await fin.page.addInitScript(SEED(doneThrough(LAST - 1)));
    await fin.page.goto(url + `#/lesson/${LAST}/finish`);
    await fin.page.waitForSelector('.finish');
    await fin.page.waitForFunction(() => !document.querySelector('.btn.got').disabled, null, { timeout: 3000 });
    await fin.page.click('.btn.got');
    ok(/Tap again to go back to the path\./.test(await fin.page.locator('.finish-note').innerText()), 'final lesson note');
    const lastStored = () => fin.page.evaluate((k) => JSON.parse(localStorage.getItem('reading.v1')).lessons[k]?.result ?? null, LAST);
    ok((await lastStored()) === null, `the arming tap on lesson ${LAST} does not store got-it`);
    await fin.page.waitForTimeout(1700);
    await fin.page.click('.btn.got');
    await fin.page.waitForSelector('.home');
    ok((await lastStored()) === 'got-it', `the second tap on lesson ${LAST} stores got-it`);
    await fin.ctx.close();
  }
  await page.goto(url + '#/lesson/2/finish');
  await page.waitForSelector('.finish');
  await page.click('.btn.practice');
  await page.waitForSelector('.lesson-overview');
  ok(page.url().endsWith('#/lesson/2'), 'practice again opens this lesson overview');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).lessons[2].result)) === 'got-it', 'practice again after got-it keeps the best result');
  await page.goto(url + '#/lesson/3');
  await page.waitForSelector('.lesson-overview');
  ok(page.url().endsWith('#/lesson/3'), 'lesson 3 stays unlocked after practicing lesson 2 again');
  ok(errors.length === 0, 'next/finish errors ' + errors.join(' | '));
  await ctx.close();
}
// A throwing localStorage must not crash the app.
{
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await page.goto(url + '#/home');
  await page.waitForSelector('.stone', { state: 'attached' });
  ok((await page.locator('.stone').count()) === CUR.lessons.length + CUR.checkpoints.length, 'app renders when localStorage throws');
  ok(errors.length === 0, 'storage-blocked errors ' + errors.join(' | '));
  await ctx.close();
}

// Recorder tool (step 10): loads clean, guards unsupported browsers, is not linked from the app.
{
  const { ctx, page, errors } = await newPage(browser, { width: 1000, height: 800, deviceScaleFactor: 1 });
  await page.addInitScript(() => { delete window.MediaRecorder; });
  await page.goto(url + 'tools/record.html');
  await page.waitForSelector('.card');
  ok((await page.locator('.card').count()) === 3, 'recorder shows three sound cards');
  ok(await page.locator('#unsupported').isVisible(), 'recorder explains when MediaRecorder is missing');
  ok(await page.locator('button.rec').first().isDisabled(), 'record button disabled when unsupported');
  ok(errors.length === 0, 'recorder errors ' + errors.join(' | '));
  await ctx.close();
  const { ctx: c2, page: p2, errors: e2 } = await newPage(browser, { width: 1000, height: 800, deviceScaleFactor: 1 });
  await p2.goto(url + 'tools/record.html');
  await p2.waitForSelector('.card');
  ok(e2.length === 0, 'recorder (supported) errors ' + e2.join(' | '));
  await c2.close();
  const walkJs = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkJs(path.join(d, e.name)) : [path.join(d, e.name)]));
  // Smooth Ride (1.7.2) asks for the microphone, but only from js/mic.js (test/ride.mjs holds the rest of the privacy rules).
  const appSrc = [path.join(ROOT, 'index.html'), ...walkJs(path.join(ROOT, 'js')).filter((f) => path.basename(f) !== 'mic.js')].map((f) => fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '')).join('\n'); // code only: a comment may name the recorder
  ok(!/record\.html|getUserMedia/.test(appSrc), 'the app (index.html and every file but js/mic.js) never links the recorder or requests the microphone');
}

// PWA (step 11): manifest is valid, sw precache list is complete, offline reload renders Home.
{
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  ok(man.display === 'standalone' && man.orientation === 'portrait-primary' && man.scope === './' && man.start_url === './index.html#/home' && man.name === "Choo Choo Training", 'manifest fields');
  ok(man.icons.some((i) => i.purpose === 'maskable') && man.icons.every((i) => fs.existsSync(path.join(ROOT, i.src))), 'manifest icons exist, including maskable');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const listed = new Set([...sw.matchAll(/'((?:js|css|data|icons|assets)\/[^']+)'/g)].map((m) => m[1]));
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const DEBUG = ['js/screens/lab.js', 'js/screens/glyphs-debug.js'];
  const need = [...walk('js').filter((f) => !DEBUG.includes(f)), 'css/app.css', 'data/curriculum.json'];
  const missingFromSw = need.filter((f) => !listed.has(f));
  ok(missingFromSw.length === 0, 'sw precache lists every js/css/data file; missing: ' + missingFromSw.join(', '));
  ok(DEBUG.every((f) => !listed.has(f)), 'sw does not precache the lab and glyphs debug screens');
  ok(['vendor/three/three.module.min.js', 'vendor/three/RoundedBoxGeometry.js'].every((f) => sw.includes(`'${f}'`) && fs.existsSync(path.join(ROOT, f))), 'sw precaches three.js and RoundedBoxGeometry for the 3D Home');
  const cur = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
  const images = usedImages(cur);
  ok(images.length > 0 && images.every((f) => listed.has(f)), 'every image in curriculum.json is precached; missing: ' + images.filter((f) => !listed.has(f)).join(', '));
  const listedImages = [...listed].filter((f) => f.startsWith('assets/images/'));
  ok(listedImages.length === images.length && listedImages.every((f) => images.includes(f)), 'sw precaches exactly the picture tiles the curriculum uses; extra: ' + listedImages.filter((f) => !images.includes(f)).join(', '));
  // Recorded letter sounds are optional (OPTIONAL_FILES in sw.js): one that is not recorded yet counts as 0 bytes.
  const optional = (f) => f.startsWith('assets/audio/sounds/') && !fs.existsSync(path.join(ROOT, f));
  const precacheBytes = [...listed].reduce((n, f) => n + (optional(f) ? 0 : fs.statSync(path.join(ROOT, f)).size), 0);
  ok(precacheBytes < 8 * 1024 * 1024, `the precache stays well under 8 MB (${(precacheBytes / 1048576).toFixed(1)} MB of assets and code)`);
  ok(![...listed].some((f) => f.includes('/ipa/') || f.endsWith('.png') && f.includes('mentava/') && !f.includes('/web/')), 'sw does not precache ipa recordings or the PNG originals');
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0], { serviceWorkers: 'allow' });
  await page.addInitScript(SEED({}));
  const swErrors = [];
  page.on('console', (m) => { if (/manifest|service ?worker/i.test(m.text()) && m.type() !== 'log') swErrors.push(m.text()); });
  await page.goto(url + 'index.html#/home');
  await page.waitForSelector('.stone', { state: 'attached' });
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'service worker registered and controlling');
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector('.stone', { state: 'attached', timeout: 8000 });
  ok((await page.locator('.stone').count()) === CUR.lessons.length + CUR.checkpoints.length, 'offline reload renders Home');
  ok((await page.locator('.home3d').count()) === 1, 'offline reload renders the 3D railway (three.js comes from the cache)');
  await page.goto(url + 'index.html#/lesson/1/task/0');
  await page.reload();
  await page.waitForSelector('.task-screen', { timeout: 8000 });
  ok((await page.locator('.task-screen').count()) === 1, 'offline task renders');
  const fontOk = await page.evaluate(() => document.fonts.load('800 20px Nunito').then((f) => f.length > 0));
  ok(fontOk, 'font renders offline');
  await ctx.setOffline(false);
  ok(swErrors.length === 0 && errors.length === 0, 'pwa warnings/errors ' + swErrors.concat(errors).join(' | '));
  await ctx.close();
}

// Adversarial checks (step 13).
{
  const isIso = (t) => { const z = t.trim().toLowerCase().replace(/[^a-z]/g, ''); return z.length === 1 || (z.length > 1 && /^(.)\1+$/.test(z)); };
  // 1. Nothing is spoken before a tap; nothing leaves the origin at runtime; every script speaker is safe.
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(ALL_OPEN);
  const external = [];
  page.on('request', (r) => { if (!r.url().startsWith(url) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
  await page.goto(url + '#/lesson/2/task/1');
  await page.waitForSelector('.task-screen');
  await page.waitForTimeout(1200);
  ok((await page.evaluate(() => window.__spoken.length + window.__events.length)) === 0, 'no speech or clip before the first tap');
  const spokenAll = [], clipEvents = [];
  for (const L of LESSONS) {
    for (let i = 0; i < TASK_COUNTS[L]; i++) {
      await page.evaluate((h) => { location.hash = h; }, `#/lesson/${L}/task/${i}`);
      await page.waitForSelector('.task-screen');
      await page.waitForTimeout(700);
      await page.evaluate(() => { window.__spoken.length = 0; window.__events.length = 0; });
      await page.locator('.script-bar .speak-btn').click();
      await page.waitForTimeout(250);
      await page.locator('.task-stage > .speak-btn').click();
      await page.waitForTimeout(250);
      spokenAll.push(...(await page.evaluate(() => window.__spoken)));
      clipEvents.push(...(await page.evaluate(() => window.__events.filter((e) => e.type === 'clip'))));
    }
  }
  ok(clipEvents.length === 0, 'with the default settings no clip event occurs in any task, script or speaker: ' + JSON.stringify(clipEvents));
  const bad = spokenAll.filter(isIso);
  ok(bad.length === 0, 'no script or child line ever sends an isolated sound to tts: ' + JSON.stringify(bad));
  ok(spokenAll.length > 20, 'scripts and child lines were actually spoken (' + spokenAll.length + ' parts)');
  ok(external.length === 0, 'no external requests at runtime: ' + external.join(', '));
  ok(errors.length === 0, 'adversarial errors ' + errors.join(' | '));
  await ctx.close();
}
{
  // 2. Speech that never starts must not block the screen.
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [], addEventListener() {}, cancel() {}, speak() { /* never starts */ } }, configurable: true });
  });
  await page.addInitScript(ALL_OPEN);
  await page.goto(url + '#/lesson/2/task/1');
  await page.waitForSelector('.task-screen');
  await page.click('.slide-track .st-handle', { force: true, trial: true }).catch(() => {});
  const t0 = Date.now();
  await page.locator('.task-stage > .speak-btn').click();
  await page.waitForFunction(() => !document.querySelector('.task-stage > .speak-btn').classList.contains('is-speaking'), null, { timeout: 6000 });
  ok(Date.now() - t0 < 5800, 'speech that never starts gives up within a few seconds (' + (Date.now() - t0) + ' ms)');
  await page.click('.btn.next');
  await page.waitForFunction(() => document.querySelector('.task-head h1')?.textContent === 'Sound Story', null, { timeout: 3000 });
  ok((await page.locator('.task-head h1').innerText()) === 'Sound Story', 'Next works while speech never starts');
  ok(errors.length === 0, 'silent-speech errors ' + errors.join(' | '));
  await ctx.close();
}
{
  // 3. Reduced motion must not shorten the hold gate; Home and the first-run card pass the audits.
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0], { reducedMotion: 'reduce' });
  await page.addInitScript(SPEECH_STUB);
  await page.goto(url + '#/home');
  await page.waitForSelector('.first-run');
  await page.waitForTimeout(700);
  let hp = await audit(page, 'home first-run');
  ok(hp.length === 0, hp.join(' | '));
  await page.click('.first-run .wc-skip');
  await page.waitForSelector('.cp'); // a new install meets the character creator after the welcome card
  await page.waitForTimeout(700);
  hp = await audit(page, 'home character creator');
  ok(hp.length === 0, hp.join(' | '));
  await page.click('.meet-later');
  await page.waitForTimeout(500);
  hp = await audit(page, 'home');
  ok(hp.length === 0, hp.join(' | '));
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
  await page.waitForTimeout(300);
  ok(page.url().endsWith('#/home'), 'reduced motion: a 0.6 s hold still does not open Grownups');
  ok(errors.length === 0, 'reduced-motion errors ' + errors.join(' | '));
  await ctx.close();
}
{
  // 4. The lessons failing to load shows a friendly retry card.
  const { ctx, page } = await newPage(browser, VIEWPORTS[0]);
  await page.route('**/data/curriculum.json', (r) => r.abort());
  await page.goto(url);
  await page.waitForSelector('.retry-card');
  ok(/try again/i.test(await page.locator('.retry-card .btn').innerText()), 'retry card appears when the lessons do not load');
  await ctx.close();
}

{
  // Fixes 14, 16, 17: Quick Check picks reset, no stale speech after leaving, cancel stops the queue.
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(ALL_OPEN_SOUNDS);
  await page.goto(url + `#/lesson/3/task/${COUNT(3) - 1}`);
  await page.waitForSelector('.opt-card');
  await page.waitForTimeout(500);
  const picked = () => page.locator('.opt-card.picked').count();
  await page.locator('.opt-card').nth(0).click();
  await page.locator('.opt-card').nth(1).click();
  ok((await picked()) === 1 && (await page.locator('.opt-card').nth(1).getAttribute('class')).includes('picked'), 'Quick Check: only the last pick is raised');
  await page.click('.btn.again');
  ok((await picked()) === 0 && (await page.locator('.opt-card[aria-pressed="true"]').count()) === 0, 'Quick Check: Again lowers every card');
  // Saying Words: leave right after revealing; the word must not be spoken on the next screen.
  await page.goto(url + '#/lesson/1/task/2');
  await page.waitForSelector('.merged-tile');
  await page.waitForTimeout(700);
  await page.locator('.merged-tile').click();
  await page.evaluate(() => { location.hash = '#/lesson/1'; });
  await page.waitForSelector('.lesson-overview');
  await page.evaluate(() => { window.__spoken.length = 0; });
  await page.waitForTimeout(700);
  ok(!(await page.evaluate(() => window.__spoken)).includes('sunhat'), 'no speech from the screen we just left (stale timer)');
  // Cancel while a clip plays: the rest of the line never plays.
  await page.evaluate(() => { window.__clipMs = 700; });
  await page.goto(url + '#/lesson/2/task/1');
  await page.waitForSelector('.task-stage > .speak-btn');
  await page.waitForTimeout(1800); // the automatic line on entry has finished
  await page.evaluate(() => { window.__events.length = 0; });
  await page.locator('.task-stage > .speak-btn').click();
  await page.waitForFunction(() => window.__events.some((e) => e.type === 'clip'));
  await page.locator('.task-stage > .speak-btn').click();
  await page.evaluate(() => { window.__events.length = 0; });
  await page.waitForTimeout(1000);
  ok((await page.evaluate(() => window.__events.length)) === 0 && !(await page.locator('.task-stage > .speak-btn.is-speaking').count()), 'cancel during a clip stops the rest of the line');
  ok(errors.length === 0, 'cancel/stale errors ' + errors.join(' | '));
  await ctx.close();
}

{
  // With playSounds on, the clips play as before and the full lines are spoken.
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(ALL_OPEN_SOUNDS);
  await page.goto(url + '#/lesson/2/task/1');
  await page.waitForSelector('.task-screen');
  await page.waitForTimeout(900);
  await page.locator('.task-stage > .speak-btn').click(); // the first tap lets the page speak
  await page.waitForTimeout(1500);
  const ev = await page.evaluate(() => window.__events.map((e) => e.type === 'tts' ? 'tts:' + e.text : 'clip:' + e.src));
  ok(JSON.stringify(ev) === JSON.stringify(['tts:Today we learn a new sound:', 'clip:a.mp3', 'tts:as in apple.']), 'playSounds on: New Letter plays its clip in the line ' + JSON.stringify(ev));
  ok(errors.length === 0, 'playSounds-on errors ' + errors.join(' | '));
  await ctx.close();
}

// Speech queue (step 5): order, missing clip skipped, isolated sounds refused, gesture required.
{
  const vp = VIEWPORTS[0];
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(SEED({}, { playSounds: true }));
  await page.route('**/assets/audio/sounds/m.mp3', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }));
  await page.goto(url + '#/lab');
  await page.waitForSelector('#lab-log');
  // No gesture yet: nothing is spoken.
  await page.evaluate(() => window.__lab_say = 1);
  await page.click('text=speak moon');
  await page.waitForTimeout(150);
  // The click itself is the first gesture, so speech is allowed now.
  ok((await page.evaluate(() => window.__spoken)).includes('moon'), 'speech: moon spoken after first tap');
  await page.evaluate(() => { window.__spoken.length = 0; window.__events.length = 0; });
  await page.click('text=mixed');
  await page.waitForFunction(() => document.getElementById('lab-log').textContent.includes('done mixed'));
  let ev = await page.evaluate(() => window.__events.map((e) => e.type === 'tts' ? 'tts:' + e.text : 'clip:' + e.src));
  ok(JSON.stringify(ev) === JSON.stringify(['tts:Today we learn a new sound:', 'clip:m.mp3', 'tts:moon']), 'speech: mixed sequence in order ' + JSON.stringify(ev));
  await page.evaluate(() => { window.__events.length = 0; });
  await page.click('text=missing clip');
  await page.waitForFunction(() => document.getElementById('lab-log').textContent.includes('done missing clip'));
  ev = await page.evaluate(() => window.__events.map((e) => e.type === 'tts' ? 'tts:' + e.text : 'clip:' + e.src));
  ok(ev.includes('tts:before') && ev.includes('tts:after'), 'speech: queue continues past a missing clip ' + JSON.stringify(ev));
  await page.evaluate(() => { window.__events.length = 0; });
  await page.click('text=single letter');
  await page.waitForFunction(() => document.getElementById('lab-log').textContent.includes('done single letter'));
  const spoken = await page.evaluate(() => window.__spoken);
  ok(!spoken.some((t) => /^(.)\1*$/.test(t)) && spoken.includes('done'), 'speech: single letters and repeated runs never reach tts ' + JSON.stringify(spoken));
  const ev2 = await page.evaluate(() => window.__events.find((e) => e.type === 'tts'));
  ok(ev2 && ev2.voice === 'g-us' && ev2.lang === 'en-US', 'speech: picked the Google en-US voice ' + JSON.stringify(ev2));
  ok(errors.length === 0, 'lab: console errors ' + errors.join(' | '));
  await ctx.close();
}

// Clip files: informational until they are installed (the app skips a missing clip by design).
for (const k of ['m', 'a', 's']) {
  const have = ['mp3', 'webm'].some((e) => fs.existsSync(path.join(ROOT, `assets/audio/sounds/${k}.${e}`)));
  if (!have) console.warn(`note: assets/audio/sounds/${k}.mp3 (or .webm) is not installed yet; the app skips it`);
}

await browser.close();
server.close();
console.log(`smoke: ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
