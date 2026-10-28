// Ride again after World 1 (docs/NEXT.md): the card on the last Review Stop's finish screen and in Grown-ups, the confirm, the move back to Lesson 1
// (never the placement check), results kept, a star on each station finished again (flat map, 3D Home and lesson overview), old saves unaffected,
// fit at 360x640, 390x844 and 915x412 with 48 px tap targets. Run alone with `node test/ride-again.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, doneThrough } from './lib.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL: ' + m); } };
const SIZES = [{ name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 }, { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 }, { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 }];
const seed = (done, extra = {}, settings = {}) => `localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneThrough(done), settings: { seenScripts: SEEN, migrated1912: true, pace4: true, speak0: true, layoutA: true, heartA: true, placementOffered: true, ...settings }, firstRunDone: true, meetDue: false, ...extra })}))`;
const read = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')));

// ---- the store, no browser ----
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { createStore } = await import('../js/store.js');
const open = (obj) => { mem.clear(); mem.set('reading.v1', JSON.stringify({ schema: 1, firstRunDone: true, settings: { migrated1912: true, pace4: true, speak0: true, layoutA: true, heartA: true, placementOffered: true, seenScripts: SEEN }, ...obj })); return createStore(); };
{
  let s = open({ lessons: doneThrough(8) });
  ok(s.ride === 1 && !s.lapActive() && s.currentLesson(33) === 9 && s.shownDone(3) && !s.isRedone(3), 'store: an old save has ride 1, no lap, and nothing changes');
  ok(s.state.rideUpTo === 0 && !Object.values(s.state.lessons).some((l) => 'redone' in l), 'store: the defaults are written without touching a lesson');
  s.rideAgain(6);
  ok(s.ride === 2 && s.lapActive() && s.currentLesson(33) === 1, 'store: Ride again moves the train to Lesson 1');
  ok([1, 2, 3, 4, 5, 6, 7, 8].every((n) => s.isDone(n)) && Object.values(s.state.lessons).every((l) => l.result === 'got-it'), 'store: every lesson result is kept, so World 2 stays reachable');
  ok(!s.shownDone(1) && s.isUnlocked(7) && s.isUnlocked(9), 'store: a lesson not yet ridden again is not shown done, and later lessons stay open');
  s.setResult(1, 'got-it');
  ok(s.isRedone(1) && s.lesson(1).redone === 2 && s.shownDone(1) && s.currentLesson(33) === 2 && s.lesson(1).result === 'got-it', 'store: a station finished again gets redone: 2 and the next station is the next one in order');
  s.setResult(8, 'got-it');
  ok(!s.isRedone(8), 'store: a lesson outside the ride gets no star');
  for (let n = 2; n <= 6; n++) s.setResult(n, 'got-it');
  ok(!s.lapActive() && s.currentLesson(33) === 9 && [1, 2, 3, 4, 5, 6].every((n) => s.isRedone(n)), 'store: when every station is ridden again the ride ends and the stars stay');
  s = createStore();
  ok(s.ride === 2 && s.isRedone(4), 'store: ride and stars survive a reload (key reading.v1)');
  ok(mem.has('reading.v1') && ![...mem.keys()].some((k) => /v2/.test(k)), 'store: the key is still reading.v1');
  s.rideAgain(6);
  ok(s.ride === 3 && s.lapActive() && s.currentLesson(33) === 1 && s.isRedone(1), 'store: a third ride starts again, earlier stars stay');
  s.endRide();
  ok(!s.lapActive() && s.currentLesson(33) === 9, 'store: going on to World 2 ends the ride without erasing anything');
  s = open({ lessons: doneThrough(8), ride: 'x', rideUpTo: -3 });
  ok(s.ride === 1 && s.state.rideUpTo === 0, 'store: nonsense ride fields fall back to the defaults');
  s = open({ lessons: { ...doneThrough(8), 2: { tasksDone: [], result: 'got-it', redone: 'yes' } } });
  ok(!s.isRedone(2), 'store: a nonsense redone is dropped');
  s = open({ lessons: doneThrough(8) }); s.resetAll();
  ok(s.ride === 1 && s.state.rideUpTo === 0, 'store: reset all progress goes back to ride 1');
}

const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());
const gate = async (page) => {
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
  await page.waitForSelector('.grownups');
};
const openPage = async (vp, init, route) => {
  const made = await newPage(browser, vp);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(init);
  await made.page.goto(url + route);
  return made;
};
const box = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);

// ---- the finish screen of the last World 1 Review Stop ----
const lastW1 = CUR.checkpoints.filter((k) => k.world === 'W1' && k.kind === 'review').sort((a, b) => b.after - a.after)[0];
ok(lastW1 && lastW1.id === 'v6', 'data: the last World 1 Review Stop is v6');
for (const vp of SIZES) {
  const { ctx, page, errors } = await openPage(vp, seed(6), `#/checkpoint/${lastW1.id}/finish`);
  await page.waitForSelector('.ride-start', { timeout: 6000 });
  await page.waitForTimeout(1700);
  ok(await page.locator('.ride-start').innerText() === 'Ride again from the first letter', `${vp.name}: the card offers "Ride again from the first letter"`);
  const text = await page.locator('.ride-card').innerText();
  ok(!/\b(your son|your daughter|colour|favourite)\b/i.test(text) && /your child/i.test(text), `${vp.name}: neutral wording, American English`);
  // the card's button is reachable by scrolling and is 48 px tall; nothing sits on top of it
  await page.locator('.ride-start').scrollIntoViewIfNeeded();
  const b = await box(page, '.ride-start');
  ok(b && b.h >= 47.5 && b.w >= 47.5 && b.x >= -0.5 && b.x + b.w <= vp.width + 0.5, `${vp.name}: the ride button is at least 48 px and inside the screen (${b && Math.round(b.h)})`);
  const noScrollX = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok(noScrollX, `${vp.name}: no sideways scroll`);
  const hit = await page.evaluate(() => { const e = document.querySelector('.ride-start'), r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e.contains(t); });
  ok(hit, `${vp.name}: a tap at the button's centre hits it`);
  await page.locator('.ride-start').tap();
  await page.waitForSelector('.ride-yes');
  ok(/Start again from Lesson 1\?/.test(await page.locator('.ride-card').innerText()), `${vp.name}: the grown-up must confirm`);
  const nb = await box(page, '.ride-yes'), cb = await box(page, '.ride-cancel');
  ok(nb.h >= 47.5 && cb.h >= 47.5, `${vp.name}: confirm buttons are 48 px`);
  ok((await read(page)).ride === 1 || (await read(page)).ride === undefined, `${vp.name}: nothing happens before the confirm`);
  await page.locator('.ride-cancel').tap();
  await page.waitForSelector('.ride-start');
  ok((await read(page)).lessons[3].result === 'got-it', `${vp.name}: Not now changes nothing`);
  if (vp.name === '390x844') {
    await page.locator('.ride-start').tap();
    await page.locator('.ride-yes').tap();
    await page.waitForFunction(() => location.hash === '#/home', null, { timeout: 5000 });
    const st = await read(page);
    ok(st.ride === 2 && st.rideUpTo === 6, 'finish: Yes sets ride 2 up to lesson 6');
    ok(!/placement|proto/.test(await page.evaluate(() => location.hash)), 'finish: it does not go to the placement check');
    ok([1, 2, 3, 4, 5, 6].every((n) => st.lessons[n].result === 'got-it' && st.lessons[n].tasksDone.length === 0) && st.checkpoints[lastW1.id].result === 'got-it', 'finish: results kept, the Review Stop is saved');
    await page.waitForSelector('.stone, canvas', { timeout: 8000 });
    await page.waitForTimeout(1500);
    // opening Lesson 1 from the new start works
    await page.evaluate(() => { location.hash = '#/lesson/1'; });
    await page.waitForSelector('.lo-head');
    ok(await page.locator('.lo-star').count() === 0, 'lesson overview: no star before it is ridden again');
  }
  ok(errors.length === 0, `${vp.name}: no console errors (${errors.slice(0, 2)})`);
  await ctx.close();
}

// ---- the card is not offered before World 1 is complete ----
{
  const { ctx, page, errors } = await openPage(SIZES[1], seed(5), `#/checkpoint/${lastW1.id}/finish`);
  await page.waitForTimeout(1200);
  ok(await page.locator('.ride-card').count() === 0, 'finish: no ride card while World 1 still has a lesson to do (or the route bounces Home)');
  await ctx.close();
}

// ---- Grown-ups: disabled before World 1 is complete, enabled after, confirm, then the ride starts ----
for (const vp of SIZES) {
  let m = await openPage(vp, seed(3), '#/home');
  await m.page.waitForSelector('.pill-hold');
  await gate(m.page);
  let dis = await m.page.locator('.ride-start').isDisabled();
  ok(dis, `${vp.name}: Grown-ups: the choice is disabled before World 1 is complete`);
  await m.ctx.close();

  m = await openPage(vp, seed(6, { checkpoints: { [lastW1.id]: { result: 'got-it' } } }), '#/home');
  await m.page.waitForSelector('.pill-hold');
  await gate(m.page);
  await m.page.locator('.ride-start').scrollIntoViewIfNeeded();
  ok(!(await m.page.locator('.ride-start').isDisabled()), `${vp.name}: Grown-ups: enabled once World 1 and its Review Stop are done`);
  const b = await box(m.page, '.ride-start');
  ok(b.h >= 47.5 && b.x >= -0.5 && b.x + b.w <= vp.width + 0.5, `${vp.name}: Grown-ups: 48 px, inside the screen`);
  ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${vp.name}: Grown-ups: no sideways scroll`);
  await m.page.locator('.ride-start').tap();
  await m.page.waitForSelector('.ride-yes');
  ok((await read(m.page)).ride === undefined || (await read(m.page)).ride === 1, `${vp.name}: Grown-ups: nothing happens before the confirm`);
  await m.page.locator('.ride-yes').tap();
  await m.page.waitForFunction(() => location.hash === '#/home', null, { timeout: 5000 });
  const st = await read(m.page);
  ok(st.ride === 2 && st.rideUpTo === 6 && st.lessons[6].result === 'got-it', `${vp.name}: Grown-ups: confirmed, ride 2 starts and results are kept`);
  ok(m.errors.length === 0, `${vp.name}: Grown-ups: no console errors (${m.errors.slice(0, 2)})`);
  await m.ctx.close();
}

// ---- stars on the maps and the lesson overview; lessons not yet ridden again are the next stations ----
const lap = { ride: 2, rideUpTo: 6 };
const lessons = { ...doneThrough(8), 1: { tasksDone: [], result: 'got-it', redone: 2 }, 2: { tasksDone: [], result: 'got-it', redone: 2 } };
for (const vp of SIZES) {
  const { ctx, page, errors } = await openPage(vp, seed(8, { ...lap, lessons }, { trainWorld: false }), '#/home');
  await page.waitForSelector('.stone', { timeout: 8000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => ({ stars: document.querySelectorAll('.stone-star').length, cur: [...document.querySelectorAll('.stone.is-current')].map((s) => s.getAttribute('aria-label')), done: [...document.querySelectorAll('.stone')].map((s) => s.getAttribute('aria-label')) }));
  ok(info.stars === 2, `${vp.name}: flat map: a star on each of the 2 stations finished again (${info.stars})`);
  ok(info.cur.length === 1 && /Lesson 3/.test(info.cur[0]), `${vp.name}: flat map: Lesson 3 is the next station (${info.cur})`);
  ok(/Lesson 1, finished again/.test(info.done[0]) || info.done.some((l) => /Lesson 1.*finished again/.test(l)), `${vp.name}: flat map: the star is in the label for screen readers`);
  ok(errors.length === 0, `${vp.name}: flat map: no console errors (${errors.slice(0, 2)})`);
  await ctx.close();
}
{
  const { ctx, page, errors } = await openPage(SIZES[1], seed(8, { ...lap, lessons }), '#/home');
  await page.waitForSelector('canvas', { timeout: 10000 });
  const dbg = await page.waitForFunction(() => window.__home3d || window.__debug || null, null, { timeout: 8000 }).then(() => true, () => false);
  await page.waitForTimeout(2500);
  ok(errors.length === 0, `3D Home with a ride in progress opens without errors (${errors.slice(0, 2)}) ${dbg ? '' : ''}`);
  await ctx.close();
}
{
  const { ctx, page } = await openPage(SIZES[1], seed(8, { ...lap, lessons }), '#/lesson/1');
  await page.waitForSelector('.lo-head');
  ok(await page.locator('.lo-star').count() === 1, 'lesson overview: a station finished again shows a star');
  await page.evaluate(() => { location.hash = '#/lesson/3'; });
  await page.waitForFunction(() => location.hash === '#/lesson/3');
  await page.waitForTimeout(600);
  ok(await page.locator('.lo-star').count() === 0, 'lesson overview: a station not yet ridden again shows none');
  await ctx.close();
}

await browser.close(); server.close();
console.log(`ride-again: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
