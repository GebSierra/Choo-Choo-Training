import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB, silentWav } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage } from './lib.mjs';

const OUT = path.join(ROOT, '_test');
fs.mkdirSync(OUT, { recursive: true });
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };

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
const SEED = (lessons) => `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:${JSON.stringify(lessons)},settings:{},firstRunDone:true}))`;
for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(SEED({ 1: { tasksDone: [0, 1], result: null, completedAt: null } }));
  await page.goto(url + '#/home');
  await page.waitForSelector('.stone');
  ok((await page.locator('.stone').count()) === 3, `${vp.name}: three stones`);
  ok((await page.locator('.stone.is-current').count()) === 1 && (await page.locator('.stone.is-locked').count()) === 2, `${vp.name}: one current, two locked`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `home-${vp.name}.png`) });
  await page.locator('.stone.is-locked').first().click({ force: true });
  await page.waitForTimeout(400);
  ok(page.url().endsWith('#/home'), `${vp.name}: locked stone does not navigate`);
  await page.locator('.stone.is-current').click();
  await page.waitForSelector('.lesson-overview');
  ok(page.url().endsWith('#/lesson/1'), `${vp.name}: current stone opens lesson 1`);
  ok((await page.locator('.task-card').count()) === 6, `${vp.name}: lesson 1 has six task cards`);
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
  ok((await page.locator('.task-card').count()) === 7, 'lesson 2 has seven task cards');
  const first = await page.locator('.task-card').first().innerText();
  ok(/Letter Review/.test(first), 'lesson 2 starts with Letter Review');
  await page.goto(url + '#/lesson/3');
  await page.waitForSelector('.home');
  ok(page.url().endsWith('#/home'), 'locked lesson 3 redirects home');
  ok(errors.length === 0, 'lesson 2 errors ' + errors.join(' | '));
  await ctx.close();
}

// Speech queue (step 5): order, missing clip skipped, isolated sounds refused, gesture required.
{
  const vp = VIEWPORTS[0];
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.route('**/assets/audio/sounds/m.webm', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }));
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
  ok(JSON.stringify(ev) === JSON.stringify(['tts:Today we learn a new sound:', 'clip:m.webm', 'tts:moon']), 'speech: mixed sequence in order ' + JSON.stringify(ev));
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

await browser.close();
server.close();
console.log(`smoke: ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
