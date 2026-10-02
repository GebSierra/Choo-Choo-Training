// New Letter: every letter's drawing sits inside its white card on phones of every height
// (tall letters like f, l, d and h once spilled out of the card on short screens). Run alone with `node test/newletter.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, doneThrough } from './lib.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const SIZES = [[412, 720, 3], [412, 780, 3], [412, 915, 2.6], [360, 780, 3], [360, 700, 3], [915, 412, 2.6]];
const seed = `localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneThrough(CUR.lessons.length), settings: { seenScripts: SEEN }, firstRunDone: true })}))`;

// Letter Writing's "Show me" dot once crashed when a frame's timestamp came a hair before the moment it was asked for
// (a negative time step), which left the button dead until a reload. Force that frame and check it survives.
export async function showMeChecks(ok, browser, url) {
  const { ctx, page, errors } = await newPage(browser, { width: 412, height: 915, deviceScaleFactor: 2.6 });
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(seed);
  await page.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); let first = true; window.requestAnimationFrame = (cb) => raf((t) => { if (first && window.__earlyFrame) { first = false; return cb(performance.now() - 8); } return cb(t); }); });
  await page.goto(`${url}#/lesson/2/task/5`);
  await page.waitForSelector('.tp-ink');
  await page.waitForTimeout(600);
  for (let round = 0; round < 2; round++) {
    await page.evaluate(() => { window.__earlyFrame = true; });
    await page.click('.writing-buttons .btn:has-text("Show me")');
    await page.waitForTimeout(4200);
  }
  ok(errors.length === 0, `Show me survives a frame that arrives early, twice in a row (${errors.join(' | ')})`);
  await ctx.close();
}

export async function newLetterChecks(ok, browser, url) {
  for (const [width, height, deviceScaleFactor] of SIZES) {
    const { ctx, page, errors } = await newPage(browser, { width, height, deviceScaleFactor });
    await page.addInitScript(SPEECH_STUB);
    await page.addInitScript(seed);
    for (const lesson of CUR.lessons) {
      // New Letter is the first task of lesson 1 (no review) and the second of every other lesson
      await page.goto(`${url}#/lesson/${lesson.number}/task/${lesson.number === 1 ? 0 : 1}`);
      await page.waitForSelector('.new-letter .letter-card .glyph');
      await page.waitForTimeout(700);
      const m = await page.evaluate(() => {
        const c = document.querySelector('.new-letter .letter-card').getBoundingClientRect();
        const g = document.querySelector('.new-letter .letter-card .glyph').getBoundingClientRect();
        return { card: [c.height], inside: g.top >= c.top - 1 && g.bottom <= c.bottom + 1 && g.left >= c.left - 1 && g.right <= c.right + 1, gap: Math.min(g.top - c.top, c.bottom - g.bottom) };
      });
      ok(m.inside, `${width}x${height}: the "${lesson.sound}" drawing sits inside its card`);
      ok(m.gap >= 4 || width > 800, `${width}x${height}: the "${lesson.sound}" drawing has white space around it (${Math.round(m.gap)} px)`);
    }
    ok(errors.length === 0, `${width}x${height}: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await newLetterChecks(ok, browser, url);
  await showMeChecks(ok, browser, url);
  await browser.close(); server.close();
  console.log(`newletter: ${pass}/${pass + fail} checks passed`);
  process.exit(fail ? 1 : 0);
}
