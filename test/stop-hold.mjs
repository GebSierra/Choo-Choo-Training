// Two stops after the same lesson (World 2: Tricky Sounds x2 and Review Stop v3, both after lesson 12): finishing the first one
// through its real finish screen must ride the train to the second one and stop there (3D and 2D), in either order.
// The Ride again ride (store.ride > 1) keeps working: its stops count as done and no stop holds the train.
// Run alone with `node test/stop-hold.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN } from './lib.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const AFTER = 12;
const SAME = CUR.checkpoints.filter((c) => c.after === AFTER && ['contrast', 'review', 'book', 'reread'].includes(c.kind)).map((c) => c.id);
const world = CUR.lessons.find((l) => l.number === AFTER).world;
const NODES = CUR.lessons.filter((l) => l.world === world).flatMap((l) => [{ lesson: l }, ...CUR.checkpoints.filter((c) => c.world === world && c.after === l.number).map((c) => ({ checkpoint: c }))]);
const idxOf = (id) => NODES.findIndex((n) => n.checkpoint && n.checkpoint.id === id);
const idxL = (n) => NODES.findIndex((x) => x.lesson && x.lesson.number === n);
const until = (page, fn, arg, timeout = 20000) => page.waitForFunction(fn, arg, { timeout }).then(() => true).catch(() => false);

// today: the lessons were finished today with a real doneAt (so the daily pace limit of four is reached, as in a real sitting)
const lessons = (n, today = false) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it', completedAt: today ? new Date(Date.now() - (n - i) * 60000).toISOString() : `2026-10-01T10:${String(i).padStart(2, '0')}:00.000Z`, ...(today ? { doneAt: Date.now() - (n - i) * 60000 } : {}) }]));
const seed = (extra = {}, settings = {}, today = false) => ({ schema: 1, lessons: lessons(AFTER, today), settings: { seenScripts: SEEN, trainIntroDone: true, ...settings }, firstRunDone: true, character: { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true }, ...extra });

// Open the real Home first (it records what it has seen), then finish the stop through its finish screen and come back.
async function finishThenHome(browser, url, vp, id, { trainWorld = true, prior = {}, today = false } = {}) {
  const made = await newPage(browser, vp);
  const { page } = made;
  await page.addInitScript(SPEECH_STUB);
  const st = seed({ checkpoints: prior }, trainWorld ? {} : { trainWorld: false, migrated1912: true }, today);
  await page.addInitScript(`if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await page.goto(url + '#/home');
  await page.waitForSelector(trainWorld ? '.home3d' : '.map-scroll');
  await page.waitForTimeout(1500);
  await page.evaluate((h) => { location.hash = h; }, `#/checkpoint/${id}/finish`);
  await page.waitForSelector('.finish');
  await page.waitForFunction(() => !document.querySelector('.btn.got').disabled, null, { timeout: 3000 });
  await page.click('.btn.got');
  await page.waitForFunction(() => location.hash === '#/home', null, { timeout: 5000 }).catch(() => {});
  return made;
}

// A whole sitting: lesson 12 is finished through its finish screen, the train rides to the first stop, that stop is finished through
// its finish screen, and the train must ride on to the second stop (3D), every step through Home.
async function sitting(browser, url, vp, ok, tag) {
  const made = await newPage(browser, vp);
  const { page, ctx, errors } = made;
  await page.addInitScript(SPEECH_STUB);
  const st = seed({}, {}, true);
  delete st.lessons[AFTER];
  await page.addInitScript(`if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(st))}); }`);
  await page.goto(url + '#/home');
  await page.waitForSelector('.home3d');
  await page.waitForTimeout(1500);
  const yes = async (hash) => {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.waitForSelector('.finish');
    await page.waitForFunction(() => !document.querySelector('.btn.got').disabled, null, { timeout: 3000 });
    await page.click('.btn.got');
    await page.waitForFunction(() => location.hash === '#/home', null, { timeout: 5000 });
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 300);
  };
  await yes(`#/lesson/${AFTER}/finish`);
  const a = await page.evaluate(() => ({ from: window.__train.fromIndex, cur: window.__train.currentIndex }));
  ok(a.from === idxL(AFTER) && a.cur === idxOf(SAME[0]), `${tag}: after lesson ${AFTER} the train rides to ${SAME[0]} (${JSON.stringify(a)})`);
  ok(await until(page, () => !window.__train.running), `${tag}: that ride ends`);
  await yes(`#/checkpoint/${SAME[0]}/finish`);
  const b = await page.evaluate(() => ({ from: window.__train.fromIndex, cur: window.__train.currentIndex }));
  ok(b.from === idxOf(SAME[0]) && b.cur === idxOf(SAME[1]), `${tag}: after ${SAME[0]} the train rides to ${SAME[1]}, not on to lesson ${AFTER + 1} (${JSON.stringify(b)})`);
  const landed = await until(page, (n) => !window.__train.running && window.__train.kid.index === n && window.__train.kid.phase === '', idxOf(SAME[1]), 25000);
  const e = await page.evaluate(() => ({ kid: window.__train.kid.index, ph: window.__train.kid.phase, run: window.__train.running, s: window.__train.trainS, stop: window.__train.stopS, at: window.__train.engineAt, cur: window.__train.currentIndex }));
  ok(landed, `${tag}: that ride ends at ${SAME[1]}`);
  ok(e.kid === idxOf(SAME[1]) && Math.abs(e.s - (e.stop[idxOf(SAME[1])] + e.at)) < 0.01, `${tag}: the train stands at ${SAME[1]} (kid ${e.kid})`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// The Ride again ride (store.ride > 1): while the lap is on, the lap's lesson is the current one and no stop holds it; once the ride ends, the stops
// after lesson 12 hold the train again, in order, and finishing the first one moves the hold to the second.
async function rideAgainChecks({ ok }) {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const { createStore } = await import('../js/store.js');
  const { checkpointStopIndex } = await import('../js/sequence.js');
  const all = CUR.lessons.flatMap((l) => [{ lesson: l }, ...CUR.checkpoints.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
  const at = (id) => all.findIndex((n) => n.checkpoint && n.checkpoint.id === id);
  const cur = (store) => all.findIndex((n) => n.lesson && n.lesson.number === store.currentLesson(CUR.lessons.length));
  mem.set('reading.v1', JSON.stringify({ schema: 1, lessons: lessons(AFTER), settings: { migrated1912: true, pace4: true, seenScripts: SEEN }, firstRunDone: true }));
  const s = createStore();
  ok(checkpointStopIndex(all, cur(s), s) === at(SAME[0]), 'ride again: before a ride, the first stop after lesson 12 holds the train');
  s.setCheckpointResult(SAME[0], 'got-it');
  ok(checkpointStopIndex(all, cur(s), s) === at(SAME[1]), `ride again: after ${SAME[0]} the hold moves to ${SAME[1]}`);
  s.rideAgain(6);
  const lap = s.currentLesson(CUR.lessons.length);
  ok(lap === 1 && checkpointStopIndex(all, cur(s), s) === -1, 'ride again: during the ride the lap lesson is current and nothing holds it');
  s.endRide();
  ok(checkpointStopIndex(all, cur(s), s) === at(SAME[1]), `ride again: when the ride ends, ${SAME[1]} holds the train again`);
}

export async function stopHoldChecks({ browser, url, ok }) {
  await rideAgainChecks({ ok });
  await sitting(browser, url, VIEWPORTS[0], ok, 'a whole sitting (3D)');
  const vp = VIEWPORTS[0];
  ok(SAME.length >= 2, `two stops follow lesson ${AFTER}: ${SAME.join(', ')}`);
  for (const today of [false, true]) for (const [first, second] of [SAME, [...SAME].reverse()]) {
    const tag = `${first} then ${second}${today ? ' (pace limit reached)' : ''}`;
    {
      const { ctx, page, errors } = await finishThenHome(browser, url, vp, first, { today });
      ok(page.url().endsWith('#/home'), `${tag} (3D): Yes on the finish screen goes to Home`);
      await until(page, () => window.__train && window.__train.frames > 0);
      await page.mouse.click(3, 300);
      const t = await page.evaluate(() => ({ from: window.__train.fromIndex, cur: window.__train.currentIndex, arriving: window.__train.arriving }));
      ok(t.cur === idxOf(second), `${tag} (3D): the current stop is ${second}, not lesson ${AFTER + 1} (${t.cur}, want ${idxOf(second)})`);
      // Forward order: the ride starts at the stop just finished. Reverse order (the later stop first): the train already stands at the
      // stop still waiting, so the ride is the short hop from the lesson before it; it never starts past the stop that holds the train.
      if (first === SAME[0]) ok(t.arriving && t.from === idxOf(first), `${tag} (3D): the ride starts at ${first} (${t.from}, want ${idxOf(first)})`);
      else ok(t.from < t.cur, `${tag} (3D): the ride runs towards ${second} and never starts past it (${t.from} to ${t.cur})`);
      ok(await until(page, () => !window.__train.running), `${tag} (3D): the ride ends`);
      const e = await page.evaluate(() => ({ kid: window.__train.kid.index, s: window.__train.trainS, stop: window.__train.stopS, at: window.__train.engineAt }));
      ok(e.kid === idxOf(second) && Math.abs(e.s - (e.stop[idxOf(second)] + e.at)) < 0.01, `${tag} (3D): the train stands at ${second} (kid ${e.kid})`);
      const cls = await page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => b.className));
      ok(/is-current/.test(cls[idxOf(second)]) && !/is-current/.test(cls[idxL(AFTER + 1)]), `${tag} (3D): ${second} is the current station and lesson ${AFTER + 1} is not`);
      ok(errors.length === 0, `${tag} (3D): errors ${errors.join(' | ')}`);
      await ctx.close();
    }
    {
      const { ctx, page, errors } = await finishThenHome(browser, url, vp, first, { trainWorld: false, today });
      await page.waitForSelector('.map-scroll');
      ok(await until(page, () => !document.querySelector('.seq-kid') && !!document.querySelector('.stone-kid'), null, 10000), `${tag} (2D): the ride ends`);
      const cur = await page.evaluate(() => [...document.querySelectorAll('.stone.is-current')].map((s) => s.getAttribute('aria-label')));
      const want = NODES[idxOf(second)].checkpoint.title;
      ok(cur.length === 1 && cur[0] === want, `${tag} (2D): the one current stone is ${second} (${cur})`);
      ok(errors.length === 0, `${tag} (2D): errors ${errors.join(' | ')}`);
      await ctx.close();
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await stopHoldChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`stop-hold: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
