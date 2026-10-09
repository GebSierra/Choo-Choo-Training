// The "Did you know?" card over a lesson overview (1.9.31): it shows each time a lesson is opened from the Home, rotates through
// data/tips.json, has its close X at the bottom right (48 px) as the only way to close it, never shows on a task screen, and the
// phone never speaks it. Run alone with `node test/lesson-tips.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, doneThrough } from './lib.mjs';

const TIPS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tips.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const until = (page, fn, arg, timeout = 10000) => page.waitForFunction(fn, arg, { timeout }).then(() => true).catch(() => false);
const seed = (extra = {}) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify({ schema: 1, lessons: doneThrough(2), settings: { seenScripts: SEEN, trainIntroDone: true, trainDone: 2, trainAt: 2, ...extra }, firstRunDone: true }))}); }`;
const OUT = path.join(ROOT, 'docs/screenshots/tips-ride');

async function open(browser, url, vp, { tips = true, settings } = {}) {
  const made = await newPage(browser, vp);
  await made.page.addInitScript(SPEECH_STUB);
  if (tips) await made.page.addInitScript('window.__noTips = false;'); // after lib.mjs's default, so it wins
  await made.page.addInitScript(seed(settings));
  await made.page.goto(url + '#/home');
  await made.page.waitForSelector('.home');
  return made;
}
const card = (page) => page.evaluate(() => {
  const c = document.querySelector('.screen:not(.leaving) .tip-card') || document.querySelector('.tip-card'); if (!c) return null;
  const r = c.getBoundingClientRect(), x = c.querySelector('.tip-close').getBoundingClientRect(), t = c.querySelector('.tip-text').getBoundingClientRect(), s = document.querySelector('.start-btn').getBoundingClientRect();
  return { id: Number(c.dataset.tip), title: c.querySelector('.tip-title').textContent, text: c.querySelector('.tip-text').textContent, op: getComputedStyle(c).opacity, gotIt: !!c.querySelector('.tip-ok'), inOverview: !!c.closest('.lesson-overview'),
    r: { l: r.left, t: r.top, r: r.right, b: r.bottom }, x: { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }, textBottom: t.bottom, startTop: s.top, vw: innerWidth, vh: innerHeight };
});

// ---- the data ----
const wild = TIPS.find((t) => /out in the wild/.test(t.text));
ok(!!wild && /cereal box/.test(wild.text) && /favorite book/.test(wild.text) && /"mmm\.?"/.test(wild.text), 'the "out in the wild" tip is in data/tips.json');
ok(wild && !/^did you know/i.test(wild.text), 'its text does not repeat the card title');
ok(TIPS.every((t, i) => t.id === i + 1), 'tip ids run 1 to n');

const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());
const VP = { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2 };
fs.mkdirSync(OUT, { recursive: true });
{
  const { ctx, page, errors } = await open(browser, url, VP);
  await page.evaluate(() => { location.hash = '#/lesson/3'; });
  await page.waitForSelector('.lesson-overview');
  ok(await until(page, () => !!document.querySelector('.lesson-overview .tip-card.in'), null, 8000), 'the tip card shows over the lesson overview');
  await page.waitForTimeout(500);
  const a = await card(page);
  ok(a && a.id === TIPS[0].id && a.title === 'Did you know?' && a.text === TIPS[0].text && a.op === '1' && a.inOverview, `it is the first tip, titled "Did you know?" (${a && a.id})`);
  ok(a && !a.gotIt, 'there is no "Got it" button: the X is the way to close');
  ok(a.x.w >= 48 && a.x.h >= 48, `the close X is at least 48 px (${a.x.w} x ${a.x.h})`);
  ok(a.x.r >= a.r.r - 24 && a.x.b >= a.r.b - 24 && a.x.t >= a.textBottom - 2, `the X is at the bottom right of the card, under the text (${JSON.stringify(a.x)} in ${JSON.stringify(a.r)})`);
  ok(a.r.l >= 0 && a.r.r <= a.vw && a.r.t >= 0 && a.r.b <= a.vh, 'the card fits the screen');
  ok(a.r.b <= a.startTop + 1, `the card leaves the big Start button free (card bottom ${Math.round(a.r.b)}, Start top ${Math.round(a.startTop)})`);
  await page.screenshot({ path: path.join(OUT, 'tip-card-lesson.png') });
  ok((await page.evaluate(() => window.__spoken.length)) === 0, 'the phone does not speak the tip');
  // only the X dismisses it
  await page.waitForTimeout(6000);
  ok(await page.evaluate(() => !!document.querySelector('.tip-card.in')), 'still open after 6 s (no timeout)');
  await page.touchscreen.tap(195, 60); // the lesson title area, outside the card
  await page.locator('.tip-card .tip-text').click();
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => !!document.querySelector('.tip-card.in')), 'a tap outside the card or on its text does not close it');
  // never over a task: Start goes into the task, no card there, and coming back does not show another
  await page.click('.start-btn');
  await page.waitForSelector('.screen:not(.leaving) .task-frame, .task-screen, .screen:not(.leaving) .tp-wrap', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
  ok(!/\/lesson\/3$/.test(page.url()) && await page.evaluate(() => !document.querySelector('.tip-card')), 'no tip card on a task screen');
  await page.evaluate(() => history.back());
  await page.waitForSelector('.lesson-overview');
  await page.waitForTimeout(900);
  ok(await page.evaluate(() => !document.querySelector('.tip-card')), 'back from a task to the overview: no second card for the same opening');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.tipsSeen)).length === 1, 'only one tip counted as shown so far');
  await ctx.close();
}
{
  const { ctx, page, errors } = await open(browser, url, VP);
  await page.evaluate(() => { location.hash = '#/lesson/3'; });
  ok(await until(page, () => !!document.querySelector('.tip-card.in'), null, 8000), 'second run: the card shows');
  await page.locator('.tip-card .tip-close').click();
  ok(await until(page, () => !document.querySelector('.tip-card'), null, 3000), 'the X closes it');
  // open the lesson again from the Home: the next tip
  await page.evaluate(() => { location.hash = '#/home'; });
  await page.waitForSelector('.home');
  await page.waitForTimeout(500);
  await page.evaluate(() => { location.hash = '#/lesson/3'; });
  ok(await until(page, () => !!document.querySelector('.tip-card.in'), null, 8000), 'opened again from the Home: the card shows again');
  const b = await card(page);
  ok(b && b.id === TIPS[1].id, `and it is the next tip, not the same one (${b && b.id})`);
  // a different lesson, straight from the Home, rotates on again
  await page.locator('.tip-card .tip-close').click();
  await page.evaluate(() => { location.hash = '#/home'; });
  await page.waitForSelector('.home');
  await page.evaluate(() => { location.hash = '#/lesson/2'; });
  ok(await until(page, () => !!document.querySelector('.screen:not(.leaving) .tip-card.in'), null, 8000), 'another lesson: the card shows');
  ok(((await card(page)) || {}).id === TIPS[2].id, 'with the third tip');
  ok(errors.length === 0, 'errors: ' + errors.join(' | '));
  await ctx.close();
}
{
  // the rotation cycles through all tips before repeating, and a card is never left on screen when a lesson is left
  const { ctx, page } = await open(browser, url, VP, { settings: { tipsSeen: TIPS.slice(0, -1).map((t) => t.id) } });
  await page.evaluate(() => { location.hash = '#/lesson/3'; });
  await until(page, () => !!document.querySelector('.tip-card.in'), null, 8000);
  ok(((await card(page)) || {}).id === TIPS[TIPS.length - 1].id, 'the last unseen tip (the new one) comes up after the others');
  await page.evaluate(() => { location.hash = '#/home'; });
  await page.waitForSelector('.home');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => !document.querySelector('.tip-card')), 'leaving the lesson takes the card with it (Home has none)');
  await ctx.close();
}
{
  // the developer/test switch: no card
  const { ctx, page } = await open(browser, url, VP, { tips: false });
  await page.evaluate(() => { location.hash = '#/lesson/3'; });
  await page.waitForSelector('.lesson-overview');
  await page.waitForTimeout(1200);
  ok(await page.evaluate(() => !document.querySelector('.tip-card')), 'window.__noTips: no card');
  await ctx.close();
}
{
  // a task opened directly never shows it
  const { ctx, page } = await open(browser, url, VP);
  await page.evaluate(() => { location.hash = '#/lesson/3/task/0'; });
  await page.waitForTimeout(1500);
  ok(await page.evaluate(() => !document.querySelector('.tip-card')), 'a task screen opened directly: no card');
  await ctx.close();
}
{
  // reduced motion: shown at once, the X still works
  const made = await newPage(browser, VP, { reducedMotion: 'reduce' });
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript('window.__noTips = false;');
  await made.page.addInitScript(seed());
  await made.page.goto(url + '#/home');
  await made.page.waitForSelector('.home');
  await made.page.evaluate(() => { location.hash = '#/lesson/3'; });
  ok(await until(made.page, () => !!document.querySelector('.tip-card.in'), null, 8000), 'reduced motion: the card shows');
  await made.page.locator('.tip-card .tip-close').click();
  ok(await until(made.page, () => !document.querySelector('.tip-card'), null, 2000), 'reduced motion: the X closes it');
  await made.ctx.close();
}
await browser.close(); server.close();
console.log(`lesson-tips: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
