// Finishing a lesson completes the ones before it (derived, never written), the daily pace limit that rests the next new
// station, and the owner's developer mode. Store rules run without a browser; the Home, the card, Grownups and the
// routes run in Playwright. Run alone with `node test/pace.mjs [--shots]`.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS } from './lib.mjs';
import { openHome, state, until } from './train.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/pace');
const SHOT_VP = { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2 };
const HOUR = 3600 * 1000;
const noonDaysAgo = (n) => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - n, 12).getTime(); };
// A seed with lessons done: results only (like an old save), or with doneAt stamps.
const lessonsWith = (nums, doneAt) => Object.fromEntries(nums.map((n) => [n, { tasksDone: [], result: 'got-it', ...(doneAt ? { doneAt } : {}) }]));
const seed = (nums, doneAt, settings = {}) => state(0, { migrated1912: true, ...settings }, { lessons: lessonsWith(nums, doneAt) });

// ---- the store, no browser ----
export async function storeChecks(ok) {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const { createStore, cleanSettings } = await import('../js/store.js');
  const open = (saved) => { mem.clear(); if (saved) mem.set('reading.v1', JSON.stringify(saved)); return createStore(); };
  const save = (lessons, settings = {}) => ({ schema: 1, order: undefined, lessons, checkpoints: {}, settings: { migrated1912: true, ...settings }, firstRunDone: true });
  let s = open(save({ 5: { tasksDone: [], result: 'got-it' } }));
  ok([1, 2, 3, 4, 5].every((n) => s.isDone(n)) && !s.isDone(6), 'store: lesson 5 got-it makes lessons 1 to 5 done, not 6');
  ok(s.isUnlocked(6) && !s.isUnlocked(7) && s.currentLesson(13) === 6, 'store: lesson 6 is open and current, 7 is locked');
  ok(s.lesson(3).result === null, 'store: derived, the saved result of lesson 3 is untouched');
  const ck = CUR.checkpoints.find((c) => c.after === 4), ck5 = CUR.checkpoints.find((c) => c.after === 5) || CUR.checkpoints.find((c) => c.after >= 5);
  ok(ck && s.isCheckpointDone(ck) && s.isCheckpointUnlocked(ck), 'store: a checkpoint after lesson 4 is done and open (lesson 5 is done)');
  ok(!s.isCheckpointDone(ck5), `store: a checkpoint at or after lesson 5 is not done (after ${ck5.after})`);
  ok(!s.isCheckpointDone(ck.id), 'store: a bare id knows only its own result');
  // doneAt
  s = open(save({}));
  s.setResult(3, 'got-it');
  ok(typeof s.lesson(3).doneAt === 'number' && Math.abs(s.lesson(3).doneAt - Date.now()) < 5000, 'store: doneAt is stamped when a lesson first becomes got-it');
  const first = s.lesson(3).doneAt;
  s.setResult(3, 'got-it');
  ok(s.lesson(3).doneAt === first, 'store: doneAt is kept on a second got-it');
  ok(s.isDone(1) && s.isDone(2) && s.lesson(1).doneAt === undefined, 'store: lessons 1 and 2 are done but got no doneAt');
  s.setResult(2, 'got-it');
  ok(s.lesson(2).doneAt === undefined, 'store: finishing a lesson a later one already completed does not count as new');
  // settings
  const d = { perDay: 2, restOverride: null, dev: false, devOpenAll: false, devNoLimit: false, rate: 0.9, sfxVolume: 0.6 };
  const c = (x) => cleanSettings({ ...d, ...x }, d);
  ok(c({ perDay: 7 }).perDay === 2 && c({ perDay: '3' }).perDay === 2 && c({ perDay: 0 }).perDay === 0 && c({ perDay: 3 }).perDay === 3, 'settings: perDay allows 0, 1, 2, 3 and falls back to 2');
  ok(c({ dev: 'yes' }).dev === false && c({ devOpenAll: 1 }).devOpenAll === false && c({ devNoLimit: true }).devNoLimit === true, 'settings: dev flags are booleans');
  ok(c({ restOverride: 'today' }).restOverride === null && c({ restOverride: '2026-10-07' }).restOverride === '2026-10-07', 'settings: restOverride is a date string or null');
  // pace
  const now = Date.now();
  s = open(save(lessonsWith([1, 2], now)));
  ok(s.doneToday() === 2 && s.isResting(3) && !s.isResting(2) && !s.isResting(4), 'pace: two done today (limit 2) rests lesson 3 only');
  s = open(save(lessonsWith([1, 2], noonDaysAgo(1))));
  ok(s.doneToday() === 0 && !s.isResting(3), 'pace: yesterday does not count');
  s = open(save({ 1: { tasksDone: [], result: 'got-it' }, 2: { tasksDone: [], result: 'got-it' } }));
  ok(s.doneToday() === 0 && !s.isResting(3), 'pace: old lessons without doneAt do not count');
  s = open(save(lessonsWith([1, 2], now), { perDay: 0 }));
  ok(!s.isResting(3), 'pace: perDay 0 means no limit');
  s = open(save(lessonsWith([1, 2], now), { perDay: 3 }));
  ok(!s.isResting(3), 'pace: perDay 3 with two done today does not rest');
  s = open(save(lessonsWith([1, 2], now)));
  s.allowToday();
  ok(!s.isResting(3), 'pace: the grown-up override opens the lesson for today');
  s = open(save(lessonsWith([1, 2], now), { restOverride: '2000-01-01' }));
  ok(s.isResting(3), 'pace: an old override does not apply today');
  s = open(save({ ...lessonsWith([1, 2], now), 3: { tasksDone: [], unlocked: true } }));
  ok(!s.isResting(3), 'pace: a lesson a grown-up unlocked in Grownups never rests');
  s = open(save(lessonsWith([1, 2], now), { dev: true, devOpenAll: true }));
  ok(!s.isResting(3) && s.isUnlocked(13) && s.currentLesson(13) === 3 && s.isDone(3) === false, 'dev: open-all ignores the limit and opens everything, and the current lesson stays 3');
  s = open(save(lessonsWith([1, 2], now), { dev: true, devNoLimit: true }));
  ok(!s.isResting(3) && !s.isUnlocked(13), 'dev: "ignore daily limit" lifts only the limit');
  s = open(save(lessonsWith([1, 2], now), { dev: false, devOpenAll: true }));
  ok(s.isResting(3) && !s.isUnlocked(13), 'dev: the switches do nothing while developer mode is off');
}

const labels = (page) => page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => ({ label: b.getAttribute('aria-label'), cls: [...b.classList].filter((c) => c.startsWith('is-')).join(' '), shown: b.dataset.shown, i: b.dataset.index, badge: !!b.querySelector('.rest-badge') })));
const gate = async (page) => {
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
  await page.waitForSelector('.grownups');
};
const holdOn = async (page, sel) => {
  const b = await page.locator(sel).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up();
};
const shotTo = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name) }); };
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')));

export async function browserChecks({ browser, url, ok }) {
  const vp = SHOT_VP;
  const settle = (page) => until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, 20000);
  {
    // 1. Cascade: only lesson 5 got-it
    const { ctx, page, errors } = await openHome(browser, url, vp, seed([5]));
    ok(await settle(page), 'cascade: the 3D Home settles');
    const b = await labels(page);
    const lessonB = b.filter((x) => /^Lesson/.test(x.label));
    ok(lessonB.slice(0, 5).every((x) => x.cls === 'is-done' && x.label.endsWith(', done')) && lessonB[5].cls === 'is-current', `cascade: lessons 1 to 5 show done and lesson 6 is current (${lessonB.map((x) => x.cls).join(',')})`);
    const cks = CUR.checkpoints.filter((c) => c.after < 5 && c.world === 'W1');
    const depots = b.filter((x) => !/^Lesson/.test(x.label));
    ok(cks.length > 0 && depots.slice(0, cks.length).every((x) => x.cls === 'is-done'), `cascade: the checkpoints before lesson 5 show done (${depots.map((x) => x.cls).join(',')})`);
    ok(await page.evaluate(() => window.__train.wagons) === 5, 'cascade: the train pulls five wagons');
    ok(await page.evaluate(() => window.__train.currentIndex === [...document.querySelectorAll('.station-btn')].findIndex((x) => x.getAttribute('aria-label') === 'Lesson 6')), 'cascade: the train waits at lesson 6');
    ok((await stored(page)).lessons[3] === undefined, 'cascade: nothing was written for lesson 3');
    ok(errors.length === 0, `cascade: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // 1b. Cascade in Grownups, and the world crossing when lesson 6 is finished first
    const { ctx, page } = await openHome(browser, url, vp, seed([5]));
    await settle(page);
    await gate(page);
    const rows = await page.evaluate(() => [...document.querySelectorAll('.gu-world[data-world="W1"] .gu-row')].map((r) => r.innerText.replace(/\s+/g, ' ')));
    ok(rows.slice(0, 5).every((t) => /Done|Got it/.test(t)) && /Open, not finished/.test(rows.find((t) => /Lesson 6/.test(t))), `cascade: Grownups lists lessons 1 to 5 as done and 6 as open (${rows.slice(0, 3).join(' | ')})`);
    await ctx.close();
    const two = await openHome(browser, url, vp, seed([6], undefined, {}), { });
    ok(await until(two.page, () => window.__train && window.__train.frames > 1, null, 20000), 'cascade: finishing lesson 6 alone loads Home');
    ok(await until(two.page, () => document.querySelector('.crossing, .gate-card, .loading-card') || window.__train.world === 'W2' || window.__train.gate.mode, null, 20000), 'cascade: world 1 counts as done (crossing or the next world)');
    await two.ctx.close();
  }
  {
    // 2. Pace: two done today, next station resting
    const { ctx, page, errors } = await openHome(browser, url, vp, seed([1, 2], Date.now()));
    ok(await settle(page), 'pace: Home settles');
    const b = await labels(page);
    const l3 = b.find((x) => x.label.startsWith('Lesson 3'));
    ok(l3 && /is-resting/.test(l3.cls) && l3.badge && /resting/.test(l3.label), `pace: lesson 3 is resting with the moon badge (${l3 && l3.cls})`);
    ok(await page.locator('.train-bubble').count() === 0, 'pace: the "Tap to start" bubble is gone from the resting station');
    ok(b.filter((x) => x.badge).length === 1, 'pace: only one station wears the badge');
    await page.evaluate((i) => window.__train.show(i), Number(l3.i));
    await page.waitForFunction(() => { const x = document.querySelector('.station-btn.is-resting'); return x && x.dataset.shown === '1'; }, null, { timeout: 8000 });
    await page.waitForTimeout(300);
    await shotTo(page, 'resting-station-3d.png');
    await page.locator('.station-btn.is-resting').click();
    ok(await until(page, () => !!document.querySelector('.rest-card'), null, 3000), 'pace: tapping the resting station opens the card');
    const txt = (await page.locator('.rest-card').innerText()).replace(/\s+/g, ' ');
    ok(txt.includes('Great riding today!') && txt.includes('New stations open tomorrow. Short, daily practice helps reading stick.') && txt.includes('Replay a station') && txt.includes('Open it anyway'), `pace: the card says what the plan says (${txt})`);
    await shotTo(page, 'rest-card.png');
    ok(await page.evaluate(() => location.hash) === '#/home', 'pace: still on Home');
    await page.locator('.rest-replay').click();
    ok(await page.locator('.rest-card').count() === 0, 'pace: "Replay a station" closes the card');
    // a done lesson stays open
    await page.evaluate(() => window.__train.show(0)); await page.waitForTimeout(300);
    await page.locator('.station-btn.is-done').first().click();
    ok(await until(page, () => /#\/lesson\/\d$/.test(location.hash) && location.hash !== '#/lesson/3', null, 3000), 'pace: a done station still opens');
    await page.evaluate(() => { location.hash = '#/home'; });
    await settle(page);
    // direct address
    await page.evaluate(() => { location.hash = '#/lesson/3'; });
    ok(await until(page, () => location.hash === '#/home' && !!document.querySelector('.rest-card'), null, 5000), 'pace: opening #/lesson/3 goes home and shows the card');
    // the hold override
    await holdOn(page, '.hold-btn.rest-hold');
    ok(await until(page, () => location.hash === '#/lesson/3', null, 5000), 'pace: holding "Open it anyway" opens the lesson');
    ok((await stored(page)).settings.restOverride, 'pace: the one-day override is stored');
    ok(await page.locator('.lo-title h1').innerText() === 'Lesson 3', 'pace: lesson 3 shows');
    ok(errors.length === 0, `pace: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // 2b. perDay 0, perDay 3 and yesterday
    for (const [name, doneAt, settings] of [['perDay 0', Date.now(), { perDay: 0 }], ['yesterday', noonDaysAgo(1), {}], ['perDay 3', Date.now(), { perDay: 3 }]]) {
      const { ctx, page } = await openHome(browser, url, vp, seed([1, 2], doneAt, settings));
      await settle(page);
      const l3 = (await labels(page)).find((x) => x.label.startsWith('Lesson 3'));
      ok(l3 && l3.cls === 'is-current' && !l3.badge && await page.locator('.train-bubble').count() === 1, `pace: ${name} does not rest lesson 3 (${l3 && l3.cls})`);
      await ctx.close();
    }
  }
  {
    // 2c. the 2D path
    const { ctx, page } = await openHome(browser, url, vp, seed([1, 2], Date.now(), { trainWorld: false }));
    await page.waitForSelector('.stone'); await page.waitForTimeout(1800);
    ok(await page.locator('.stone.is-resting .rest-badge').count() === 1 && await page.locator('.bubble').count() === 0, 'pace: the 2D path rests the stone too, with no bubble');
    await page.locator('.stone.is-resting').click({ force: true });
    ok(await until(page, () => !!document.querySelector('.rest-card'), null, 3000), 'pace: the 2D resting stone opens the card');
    await ctx.close();
  }
  {
    // 3. Grownups: the pace row
    const { ctx, page } = await openHome(browser, url, vp, seed([1]));
    await settle(page);
    await gate(page);
    const row = page.locator('[aria-label="New lessons per day"][role=group]');
    ok((await row.innerText()).replace(/\s+/g, ' ').trim() === '1 2 3 No limit', 'grownups: the row offers 1, 2, 3, No limit');
    ok(await row.locator('[aria-pressed=true]').innerText() === '2', 'grownups: 2 is the default');
    ok(await page.getByText('Short, daily practice works better than long sessions.').count() === 1, 'grownups: the help line shows');
    await row.locator('[data-perday="0"]').click();
    ok((await stored(page)).settings.perDay === 0, 'grownups: No limit is saved as 0');
    await row.locator('[data-perday="1"]').click();
    ok((await stored(page)).settings.perDay === 1, 'grownups: 1 is saved');
    await row.locator('[data-perday="2"]').click();
    await row.scrollIntoViewIfNeeded();
    await page.evaluate(() => { const g = document.querySelector('.grownups'); const sc = [g, g.parentElement, document.scrollingElement].find((e) => e && e.scrollHeight > e.clientHeight + 5); if (sc) sc.scrollBy(0, 160); });
    await page.waitForTimeout(200);
    await shotTo(page, 'grownups-pace-row.png');
    ok(await page.locator('.gu-devbox .gu-card').count() === 0, 'dev: no Developer section while developer mode is off');
    await ctx.close();
  }
  {
    // 4. Developer mode
    const { ctx, page, errors } = await openHome(browser, url, vp, seed([1, 2], Date.now()));
    await settle(page);
    ok(await page.locator('.dev-pill').count() === 0, 'dev: no DEV pill by default');
    await gate(page);
    const v = page.locator('.gu-version');
    await v.scrollIntoViewIfNeeded();
    for (let i = 0; i < 6; i++) await v.click();
    ok((await stored(page)).settings.dev !== true, 'dev: six taps do nothing');
    await v.click();
    ok(await until(page, () => /Developer mode on/.test(document.querySelector('.gu-toast') ? document.querySelector('.gu-toast').textContent : ''), null, 2000), 'dev: the seventh tap shows "Developer mode on"');
    ok((await stored(page)).settings.dev === true, 'dev: stored on');
    ok(await page.locator('.gu-devbox h2').innerText() === 'Developer', 'dev: the Developer section shows at the top');
    ok(await page.locator('.gu-devbox [data-dev="devOpenAll"]').count() === 1 && await page.locator('.gu-devbox [data-dev="devNoLimit"]').count() === 1, 'dev: both switches are there');
    ok(await page.locator('.gu-devworlds [data-world]').count() === CUR.worlds.length && await page.locator('[data-world="W11"]').count() >= 1, 'dev: one "Look at a world" button for each world');
    ok(await page.getByText('Turn off developer mode').count() === 1, 'dev: a "Turn off developer mode" button');
    await page.locator('.gu-devbox').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 0)); await page.locator('.grownups').evaluate((e) => { e.scrollTop = 0; });
    await page.waitForTimeout(200);
    await shotTo(page, 'grownups-developer.png');
    const before = JSON.stringify((await stored(page)).lessons);
    await page.locator('[data-dev="devOpenAll"]').click();
    ok((await stored(page)).settings.devOpenAll === true, 'dev: the open-all switch is saved');
    const w2 = page.locator('.gu-devworlds [data-world="W2"]');
    ok(await w2.count() === 1, 'dev: world 2 button');
    await page.evaluate(() => { location.hash = '#/lesson/13'; });
    ok(await until(page, () => location.hash === '#/lesson/13' && !!document.querySelector('.lo-title'), null, 4000) && await page.locator('.lo-title h1').innerText() === 'Lesson 13', 'dev: open-all opens lesson 13');
    ok(JSON.stringify((await stored(page)).lessons) === before, 'dev: opening it changed no progress');
    await page.evaluate(() => { location.hash = '#/home'; });
    await settle(page);
    ok(await page.locator('.dev-pill').count() === 1 && (await page.locator('.dev-pill').innerText()) === 'DEV', 'dev: the DEV pill shows on Home');
    ok(await page.locator('.station-btn.is-resting').count() === 0, 'dev: nothing rests while open-all is on');
    await shotTo(page, 'home-dev-pill.png');
    // turn it off with seven taps again
    await gate(page);
    const v2 = page.locator('.gu-version'); await v2.scrollIntoViewIfNeeded();
    for (let i = 0; i < 7; i++) await v2.click();
    ok((await stored(page)).settings.dev === false && await page.locator('.gu-devbox h2').count() === 0, 'dev: seven more taps turn it off and hide the section');
    ok(errors.length === 0, `dev: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  await storeChecks(ok);
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await browserChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`pace: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
