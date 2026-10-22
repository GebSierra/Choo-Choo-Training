// The heart-word preview (Grownups > Previews, "Heart word: the", #/proto/heart, js/screens/proto-heart.js) now runs the REAL Heart Word step
// (js/screens/tasks/heart.js, covered in depth by test/heart-words.mjs) for "the". Checks: the Previews button, the route, the two sub-steps in the
// task shell (the shell's Next walks them), the celebration at #/proto/heart/done, Back to Grownups, no progress written, no text to speech for the
// word, and fit at 390x844. Run alone with `node test/proto-heart.mjs`.
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { startServer, loadPlaywright, launch, newPage, SEEN } from './lib.mjs';

const PHONE = { width: 390, height: 844, deviceScaleFactor: 2 };
const tapEl = async (page, loc) => { const b = await loc.first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(450); };

export async function run() {
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  const made = await newPage(browser, PHONE);
  const { page, errors } = made;
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: {}, settings: { seenScripts: SEEN, dev: true }, firstRunDone: true, meetDue: false })}))`);
  await page.goto(url + '#/home');
  await page.waitForSelector('.pill-hold'); await page.waitForTimeout(900);
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up();
  await page.waitForSelector('.grownups'); await page.waitForTimeout(500);
  await page.locator('.gu-fold', { hasText: 'Previews' }).click(); await page.waitForTimeout(300);
  const b = page.locator('#gu-fold-previews .preview-btn[data-preview="proto-heart"]');
  ok((await b.count()) === 1 && (await b.textContent()).trim() === 'Heart word: the', 'Grownups: the "Heart word: the" preview button');
  await b.scrollIntoViewIfNeeded();
  ok((await b.boundingBox()).height >= 48, 'Grownups: the button is 48 px or more');
  await tapEl(page, b); await page.waitForSelector('.task-screen .proto.heart');
  ok(page.url().endsWith('#/proto/heart'), 'the button opens #/proto/heart');
  ok((await page.locator('.task-head .dots').getAttribute('aria-label')) === 'Step 1 of 2', 'the progress dots count the two sub-steps');
  const ds = (k) => page.evaluate((key) => document.querySelector('.proto.heart').dataset[key], k);
  ok((await ds('phase')) === 'meet' && (await ds('word')) === 'the' && (await page.locator('.hw-tile.heart-part').count()) === 1, 'it is the real step for "the": th regular, e the heart part');
  await tapEl(page, page.locator('.hw-tried'));
  ok((await page.locator('.judge-bar:not([hidden])').count()) === 1, 'after the child has had a go, the judge bar shows');
  await page.waitForFunction(() => { const x = document.querySelector('.btn.next'); return x && !x.disabled; }, null, { timeout: 4000 });
  await tapEl(page, page.locator('.btn.next'));
  ok((await ds('phase')) === 'find' && (await page.locator('.hw-card').count()) === 3, 'Next walks to the find-it round');
  ok((await page.locator('.task-head .dots').getAttribute('aria-label')) === 'Step 2 of 2', 'the dots move to step 2');
  await tapEl(page, page.locator('.hw-card[data-right="1"]'));
  await tapEl(page, page.locator('.judge-btn.got'));
  await page.waitForFunction(() => { const x = document.querySelector('.btn.next'); return x && !x.disabled; }, null, { timeout: 4000 });
  await tapEl(page, page.locator('.btn.next'));
  await page.waitForSelector('.proto-heart-done', { timeout: 4000 });
  ok(page.url().endsWith('#/proto/heart/done') && (await page.locator('.proto-heart-done .hw-tile').count()) === 2, 'the last Next opens the celebration with the word');
  const tts = await page.evaluate(() => window.__events.filter((e) => e.type === 'tts').map((e) => e.text));
  ok(!tts.some((t) => /^(the|the map)$/i.test(t.trim())), 'the phone never says the word or its phrase');
  await tapEl(page, page.locator('.pf-back'));
  await page.waitForSelector('.grownups', { timeout: 4000 });
  ok(page.url().endsWith('#/grownups'), 'Back to Grownups');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).lessons);
  ok(Object.keys(saved).length === 0, 'nothing was written to progress');
  ok(errors.length === 0, 'errors ' + errors.join(' | '));
  await made.ctx.close();
  await browser.close(); server.close();
  console.log(`proto-heart: ${checks - failures}/${checks} checks passed`);
  return failures;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) process.exit((await run()) ? 1 : 0);
