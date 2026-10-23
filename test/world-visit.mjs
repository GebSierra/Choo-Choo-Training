// Roadmap 3d: go back to an earlier world. The start tunnel of a later world is a button that shows the world before it (3D and the
// 2D path), its end tunnel then leads on again, Grownups > Worlds opens any reached world, a lesson or stop replayed in a visited
// world records nothing (store.setPractice), and a reload opens the current world. Also: reduced motion, heat (no frames while idle),
// fit at 360x640, 390x844 and 915x412. Screenshots go to docs/screenshots/world-visit/ with `--shots`.
// Run alone with `node test/world-visit.mjs [--shots]`.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch } from './lib.mjs';
import { openHome, state, until, iL } from './train.mjs';
import { reachedWorlds, previousWorld, currentWorld } from '../js/worlds.js';
import { activeVisit, practiceFor } from '../js/visit.js';
import { createStore } from '../js/store.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/world-visit');
const W1 = CUR.worlds[0], W2 = CUR.worlds[1];
export const VIEWPORTS = [
  { name: 'phone-small', width: 360, height: 640, deviceScaleFactor: 1 },
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2 },
  { name: 'landscape', width: 915, height: 412, deviceScaleFactor: 2 },
];
const CHARACTER = { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true };
const doneL = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it', completedAt: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`, doneAt: 1760000000000 + i }]));
const L1 = { L1: '2026-10-06T10:00:00.000Z' };
// n lessons done, the train resting at the current stop: n = 7 is world 2 with lesson 8 next; 3 is world 1 (nothing to go back to)
const seed = (n, settings = {}, extra = {}) => state(n, { trainAt: iL(n + 1), trainDone: n, ...settings }, { lessons: doneL(n), levels: { seen: n >= 6 ? 1 : 0, earned: n >= 6 ? L1 : {} }, worlds: { seen: n >= 7 ? 'W2' : 'W1' }, checkpoints: Object.fromEntries(CUR.checkpoints.filter((k) => k.after <= n).map((k) => [k.id, { result: 'got-it' }])), character: CHARACTER, meetDue: false, ...extra });
const RAF_COUNT = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')));
// Everything a replay must not change: the lesson and stop results, levels, worlds.seen and where the train stands.
const progress = (s) => JSON.stringify({ lessons: s.lessons, checkpoints: s.checkpoints, levels: s.levels, worlds: s.worlds, trainAt: s.settings.trainAt, restOverride: s.settings.restOverride });
const shot = async (page, name, vp) => { if (SHOTS) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, `${name}-${vp.width}x${vp.height}.png`) }); } };
const settled = (page, ms = 25000) => until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, ms);
const rectOf = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, shown: e.dataset.shown, vis: getComputedStyle(e).visibility }; }, sel);
const inView = (r, vp) => r && r.x >= -0.5 && r.y >= -0.5 && r.x + r.w <= vp.width + 0.5 && r.y + r.h <= vp.height + 0.5;
const gate = async (page) => {
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
  await page.waitForSelector('.grownups');
};
const world3d = (page, id) => until(page, (w) => window.__train && !window.__train.disposed && window.__train.world === w && window.__train.frames > 0, id, 15000);
// brings the start tunnel (-5) or the end portal (the last stop) into view and waits for its button
const showTunnel = async (page, role) => {
  await page.evaluate((r) => window.__train.show(r === 'back' ? -5 : window.__train.stopCount - 1), role);
  await page.waitForTimeout(250);
  return until(page, (r) => { const b = document.querySelector(`.portal-btn[data-role="${r}"]`); return b && b.dataset.shown === '1'; }, role, 5000);
};

// ---- the pure parts: helpers, the store guard, the visit rules ----
export function unitChecks(ok) {
  const st = (n) => ({ isDone: (k) => k <= n, currentLesson: (t) => (n >= t ? null : n + 1) });
  ok(JSON.stringify(reachedWorlds(st(0), CUR).map((w) => w.id)) === '["W1"]' && JSON.stringify(reachedWorlds(st(7), CUR).map((w) => w.id)) === '["W1","W2"]' && JSON.stringify(reachedWorlds(st(17), CUR).map((w) => w.id)) === '["W1","W2","W3"]' && JSON.stringify(reachedWorlds(st(25), CUR).map((w) => w.id)) === '["W1","W2","W3"]', 'helpers: reachedWorlds lists the built worlds up to the current one (Sunny Hills is reached once Green Valley is done)');
  ok(previousWorld(CUR, 'W1') === null && previousWorld(CUR, 'W2').id === 'W1' && previousWorld(CUR, 'W3').id === 'W2' && previousWorld(CUR, 'W4') === null, 'helpers: previousWorld names the built world before (W3 to W2 to W1), none for the first');
  const ctx = (n, visit) => ({ store: st(n), curriculum: CUR, visit });
  ok(activeVisit(ctx(7, { world: 'W1' })).id === 'W1', 'visit: a reached earlier world can be visited');
  const c2 = ctx(7, { world: 'W2' });
  ok(activeVisit(c2) === null && c2.visit === null, 'visit: the current world is no visit and clears it');
  const c3 = ctx(3, { world: 'W2' });
  ok(activeVisit(c3) === null && c3.visit === null, 'visit: a world not reached yet is dropped');
  const c4 = ctx(7, { world: 'W1' });
  ok(practiceFor(c4, '/lesson/2') && practiceFor(c4, '/lesson/2/task/3') && practiceFor(c4, '/lesson/2/finish') && practiceFor(c4, '/checkpoint/b1') && practiceFor(c4, '/checkpoint/b1/finish') && c4.visit, 'visit: lessons and stops of the visited world are practice');
  ok(!practiceFor(c4, '/home') && !practiceFor(c4, '/grownups') && c4.visit, 'visit: Home and Grownups are not practice, and keep the visit');
  ok(!practiceFor(c4, '/lesson/9') && c4.visit === null, 'visit: a lesson of another world is not practice and ends the visit');
  // the store ignores every progress write while practice is on, and records again after
  const mem = {};
  globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  const store = createStore();
  store.setResult(1, 'got-it');
  const before = JSON.stringify([store.state.lessons, store.state.checkpoints, store.state.levels, store.state.worlds]);
  store.setPractice(true);
  store.setResult(1, 'practice-again'); store.setResult(2, 'got-it'); store.markTask(2, 3); store.resetLessonTasks(1); store.unlock(5);
  store.setCheckpointResult('b1', 'got-it'); store.unlockCheckpoint('b2'); store.setLevels({ seen: 3, earned: { L9: 'x' } }); store.setWorlds({ seen: 'W9' });
  ok(JSON.stringify([store.state.lessons, store.state.checkpoints, store.state.levels, store.state.worlds]) === before && store.practice === true && store.doneToday() === 1, 'store: with practice on, no result, task, unlock, level or world write changes anything');
  store.setSetting('rate', 0.8);
  ok(store.settings.rate === 0.8, 'store: settings still save in practice');
  store.setPractice(false);
  store.setResult(2, 'got-it');
  ok(store.isDone(2) && store.practice === false, 'store: with practice off, results are recorded again');
  delete globalThis.localStorage;
}

// ---- the 3D Home ----
export async function visit3dChecks({ browser, url, ok, vp }) {
  const tag = vp.name;
  const { ctx, page, errors } = await openHome(browser, url, vp, seed(7), { init: [RAF_COUNT] });
  ok(await world3d(page, 'W2') && await settled(page), `${tag}: world 2 opens as the current world`);
  ok(await page.evaluate(() => window.__train.startTunnel && !document.querySelector('.visit-chip') && !document.querySelector('.portal-btn[data-role="forward"]')), `${tag}: world 2 has a start tunnel, no visit chip, no forward tunnel button`);
  ok(await showTunnel(page, 'back'), `${tag}: the start tunnel's button shows when the tunnel is in view`);
  const back = await rectOf(page, '.portal-btn[data-role="back"]');
  ok(back.w >= 48 && back.h >= 48 && inView(back, vp), `${tag}: the back button is at least 48 px and on screen (${Math.round(back.w)}x${Math.round(back.h)})`);
  ok((await page.locator('.portal-btn[data-role="back"]').getAttribute('aria-label')) === `Back to ${W1.name}`, `${tag}: it is labelled "Back to ${W1.name}"`);
  await page.waitForTimeout(300);
  await shot(page, 'world2-start-tunnel', vp);
  const s0 = await stored(page);
  await page.locator('.portal-btn[data-role="back"]').click();
  ok(await page.waitForSelector('.visit-card', { timeout: 3000 }).then(() => true).catch(() => false), `${tag}: a short world card shows while going back`);
  ok(await world3d(page, 'W1') && await settled(page), `${tag}: the Home now shows world 1`);
  const v = await page.evaluate(() => ({ stops: window.__train.stopCount, lessons: window.__train.lessonCount, portal: window.__train.portal, startTunnel: window.__train.startTunnel, next: window.__train.nextWorld, gate: window.__train.gate.mode, kid: window.__train.kid.index, wagons: window.__train.wagons, parked: window.__train.parked, level: window.__train.level.id, card: !!document.querySelector('.world-card') }));
  ok(v.stops === 11 && v.lessons === 6 && v.portal && !v.startTunnel && v.next === 'W2' && v.gate === null, `${tag}: world 1 shows its eleven stations (6 lessons, 5 stops), its end tunnel, and no start tunnel (${JSON.stringify(v)})`);
  ok(v.kid === 10 && v.parked === 6 && v.level === null, `${tag}: the child's figure waits at the last station, its wagons stand parked, no level party (${v.kid}, ${v.parked}, ${v.level})`);
  const states = await page.evaluate(async () => { const out = []; for (let i = 0; i < window.__train.stopCount; i++) { window.__train.show(i); await new Promise((r) => setTimeout(r, 30)); } return [...document.querySelectorAll('.station-btn')].map((b) => [...b.classList].filter((c) => c.startsWith('is-')).join()); });
  ok(states.length === 11 && states.every((s) => s === 'is-done'), `${tag}: every station of world 1 has its done look (${states.join(' ')})`);
  ok(await showTunnel(page, 'forward'), `${tag}: the end tunnel's button shows`);
  const fwd = await rectOf(page, '.portal-btn[data-role="forward"]');
  ok(fwd.w >= 48 && fwd.h >= 48 && inView(fwd, vp), `${tag}: the forward button is at least 48 px and on screen`);
  ok((await page.locator('.portal-btn[data-role="forward"]').getAttribute('aria-label')) === `On to ${W2.name}`, `${tag}: it is labelled "On to ${W2.name}"`);
  const chip = await rectOf(page, '.visit-chip');
  ok(chip && chip.h >= 48 && inView(chip, vp), `${tag}: the "Back to ${W2.name}" chip is at least 48 px and on screen`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${tag}: no horizontal overflow`);
  await shot(page, 'world1-visited', vp);
  ok(progress(await stored(page)) === progress(s0), `${tag}: going back changed no progress, level or world record`);

  // heat: nothing draws while the visited world stands still
  await page.waitForTimeout(3000);
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(3000);
  const idle = await page.evaluate((r) => ({ raf: window.__raf - r, endless: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().endTime === Infinity).length, running: window.__train.running }), r0);
  ok(idle.raf <= 2 && idle.endless === 0 && !idle.running, `${tag}: a visited world draws no frames while idle (${idle.raf} frames in 3 s, ${idle.endless} endless animations)`);

  // replay a finished lesson and a finished stop: nothing is recorded, and finishing comes back to the visited world
  await page.evaluate(() => { location.hash = '#/lesson/1/finish'; });
  await page.waitForSelector('.finish');
  await page.waitForTimeout(1700);
  await page.locator('.finish .got').click();
  await page.waitForTimeout(1700);
  await page.locator('.finish .got').click();
  ok(await world3d(page, 'W1') && await page.locator('.screen:not(.leaving) .visit-chip').count() === 1, `${tag}: finishing a replayed lesson returns to the visited world`);
  ok(progress(await stored(page)) === progress(s0), `${tag}: replaying lesson 1 to its end changed nothing (no result, no doneAt, no train place)`);
  await page.evaluate(() => { location.hash = '#/lesson/1'; });
  await page.waitForSelector('.lesson-overview');
  await page.locator('.start-btn').click();
  await page.waitForSelector('.screen:not(.leaving) .task, .screen:not(.leaving) [class*="task"]', { timeout: 8000 }).catch(() => {});
  ok(progress(await stored(page)) === progress(s0), `${tag}: "Do it again" on a finished lesson changed nothing`);
  await page.evaluate(() => { location.hash = '#/checkpoint/b1/finish'; });
  await page.waitForSelector('.finish');
  await page.waitForTimeout(1700);
  await page.locator('.finish .got').click();
  await page.waitForTimeout(1700);
  await page.locator('.finish .got').click();
  ok(await world3d(page, 'W1') && await page.locator('.screen:not(.leaving) .visit-chip').count() === 1 && progress(await stored(page)) === progress(s0), `${tag}: finishing a replayed stop returns to the visited world and changes nothing`);

  // on to the current world: the visit ends, and a reload also opens the current world
  ok(await showTunnel(page, 'forward'), `${tag}: the forward button is there again`);
  await page.locator('.portal-btn[data-role="forward"]').click();
  const fwdOk = await world3d(page, 'W2') && await page.locator('.screen:not(.leaving) .visit-chip').count() === 0;
  ok(fwdOk, `${tag}: the forward tunnel returns to the current world, with no visit chip ${fwdOk ? '' : JSON.stringify(await page.evaluate(() => [location.hash, window.__train && window.__train.world, document.querySelectorAll('.visit-chip').length]))}`);
  ok(progress(await stored(page)) === progress(s0), `${tag}: nor did going on change anything`);
  await settled(page);
  ok(await showTunnel(page, 'back'), `${tag}: back again for the reload check`);
  await page.locator('.portal-btn[data-role="back"]').click();
  ok(await world3d(page, 'W1'), `${tag}: visiting again works`);
  await page.reload();
  ok(await world3d(page, 'W2') && await page.locator('.screen:not(.leaving) .visit-chip').count() === 0, `${tag}: a reload mid-visit opens the current world`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// A replayed lesson opened by the Home station of the visited world is practice; the next world's lesson is real again.
export async function replayRealChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[1];
  const { ctx, page, errors } = await openHome(browser, url, vp, seed(7));
  await world3d(page, 'W2'); await settled(page);
  await showTunnel(page, 'back');
  await page.locator('.portal-btn[data-role="back"]').click();
  await world3d(page, 'W1');
  // tap a station of the visited world on the Home itself
  await page.evaluate(() => window.__train.show(1));
  await page.waitForTimeout(300);
  await until(page, () => document.querySelector('.station-btn[data-index="1"]').dataset.shown === '1', null, 4000);
  await page.locator('.station-btn[data-index="1"]').click();
  ok(await until(page, () => /lesson\/2$/.test(location.hash), null, 5000), 'replay: a finished station of the visited world opens its lesson');
  await page.waitForSelector('.lesson-overview');
  // Grownups > Lessons Unlock and the current world's lesson, from the same session, are real (practice is only for the visited world)
  await page.evaluate(() => { location.hash = '#/home'; });
  await world3d(page, 'W1');
  await page.evaluate(() => { location.hash = '#/lesson/8'; });
  await page.waitForSelector('.lesson-overview');
  await page.evaluate(() => { location.hash = '#/lesson/8/finish'; });
  await page.waitForSelector('.finish');
  await page.waitForTimeout(1700);
  await page.locator('.finish .got').click();
  await page.waitForTimeout(1700);
  await page.locator('.finish .got').click();
  await page.waitForTimeout(2500);
  const s = await stored(page);
  ok(s.lessons[8] && s.lessons[8].result === 'got-it', 'replay: finishing a lesson of the current world is recorded even mid-visit (the visit ends)');
  ok(await world3d(page, 'W2'), 'replay: and Home is the current world again');
  ok(errors.length === 0, `replay: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// ---- Grownups > Worlds ----
export async function grownupsChecks({ browser, url, ok, vp }) {
  const tag = vp.name;
  const w1 = await openHome(browser, url, vp, seed(3));
  await world3d(w1.page, 'W1'); await settled(w1.page);
  ok(await w1.page.evaluate(() => !window.__train.startTunnel && !document.querySelector('.portal-btn') && !document.querySelector('.visit-chip')), `${tag}: world 1 has no start tunnel and no tunnel button`);
  await gate(w1.page);
  await w1.page.waitForTimeout(600);
  const baseOv = await w1.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok((await w1.page.locator('.gu-worlds').count()) === 0, `${tag}: a child still in world 1 has no Worlds section`);
  await w1.ctx.close();

  const { ctx, page, errors } = await openHome(browser, url, vp, seed(7));
  await world3d(page, 'W2'); await settled(page);
  await gate(page);
  await page.waitForTimeout(600); // the screen's slide-in is over
  const rows = await page.evaluate(() => [...document.querySelectorAll('.gu-worlds .gu-wrow')].map((r) => ({ id: r.dataset.world, cur: r.classList.contains('is-current'), tag: !!r.querySelector('.gu-wtag'), btn: (() => { const b = r.querySelector('button'); const x = b.getBoundingClientRect(); return { text: b.textContent, w: x.width, h: x.height, label: b.getAttribute('aria-label') }; })() })));
  ok(rows.length === 2 && rows[0].id === 'W1' && rows[1].id === 'W2' && !rows[0].cur && rows[1].cur && rows[1].tag && !rows[0].tag, `${tag}: Worlds lists the two reached worlds, the current one marked (${JSON.stringify(rows.map((r) => r.id + (r.cur ? '*' : '')))})`);
  ok(rows.every((r) => r.btn.text === 'Go to this world' && r.btn.h >= 48 && r.btn.w >= 48), `${tag}: each world has a "Go to this world" button of at least 48 px`);
  ok(await page.evaluate(() => { const b = document.querySelector('.gu-body'), k = [...b.children]; const wi = k.findIndex((c) => c.classList.contains('gu-worlds')), li = k.findIndex((c) => c.classList.contains('gu-group') && c.textContent.startsWith('Lessons')); return wi >= 0 && li === wi + 1; }), `${tag}: the Worlds section sits right before Lessons`);
  const fit = await page.evaluate(() => { const r = document.querySelector('.gu-worlds').getBoundingClientRect(); return { l: r.left, r: r.right, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, wide: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 4).map((e) => e.className + ':' + Math.round(e.getBoundingClientRect().right)) }; });
  ok(fit.l >= 0 && fit.r <= vp.width + 0.5 && fit.ov <= baseOv + 1, `${tag}: the Worlds section fits the width ${JSON.stringify(fit)}`);
  {
    // a keepsake button only on a finished world (world 1 here), with that world's name and a fresh count
    const kb = await page.evaluate(() => [...document.querySelectorAll('.gu-worlds .gu-wrow')].map((r) => { const b = r.querySelector('.keepsake-btn'); const q = b && b.getBoundingClientRect(); return { id: r.dataset.world, has: !!b, h: q ? q.height : 0, text: b ? b.textContent : '' }; }));
    ok(kb[0].has && !kb[1].has && kb[0].h >= 47.5 && kb[0].text === 'Save this moment', `${tag}: only the finished world has a 48 px "Save this moment" (${JSON.stringify(kb)})`);
    await page.locator('.gu-wrow[data-world="W1"] .keepsake-btn').click();
    await page.waitForFunction(() => window.__keepsake && window.__keepsake.size > 0, null, { timeout: 15000 }).catch(() => {});
    const info = await page.evaluate(async () => { const k = window.__keepsake; if (!k) return null; const b = await createImageBitmap(k.blob); return { w: b.width, h: b.height, type: k.type, headline: k.headline, word: k.word, sub: k.sub }; });
    const CJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8')), WL = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/words-decodable.json'), 'utf8')).words;
    const last = Math.max(...CJ.lessons.filter((l) => l.world === 'W1').map((l) => l.number)), keys = CJ.lessons.slice(0, last).map((l) => l.sound), lt = new Set(keys.flatMap((k) => (k === 'c' ? ['c', 'k'] : [k])));
    const fresh = WL.filter((w) => [...w].every((c) => lt.has(c))).length;
    ok(info && info.type === 'image/png' && info.w === 1080 && info.h === 1350 && /finished Starter Station!$/.test(info.headline) && info.word === `${keys.length} sounds` && info.sub.startsWith(`can read ${fresh} words`), `${tag}: the world 1 keepsake is a 1080x1350 PNG naming Starter Station with ${keys.length} sounds and ${fresh} words (${info && info.headline} / ${info && info.word} / ${info && info.sub})`);
  }
  await page.locator('.gu-worlds').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, 'grownups-worlds', vp);
  const s0 = await stored(page);
  await page.locator('.world-go[data-world="W1"]').click();
  ok(await world3d(page, 'W1') && await page.locator('.screen:not(.leaving) .visit-chip').count() === 1, `${tag}: "Go to this world" on world 1 opens it on the Home as a visit`);
  ok(progress(await stored(page)) === progress(s0), `${tag}: that changed no progress`);
  await settled(page);
  await gate(page);
  await page.locator('.world-go[data-world="W2"]').click();
  ok(await world3d(page, 'W2') && await page.locator('.screen:not(.leaving) .visit-chip').count() === 0, `${tag}: the current world's button returns to it`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// ---- the 2D path ----
export async function flatVisitChecks({ browser, url, ok, vp }) {
  const tag = vp.name + ' 2D';
  const { ctx, page, errors } = await openHome(browser, url, vp, seed(7, { trainWorld: false, migrated1912: true }));
  await page.waitForSelector('.stone');
  await page.waitForTimeout(2200);
  ok((await page.locator('.stone').count()) === 19 && (await page.locator('.scene-tunnel.start').count()) === 1 && (await page.locator('.scene-house').count()) === 0, `${tag}: world 2 shows its 19 stones and a start tunnel instead of the house`);
  const bk = page.locator('.scene-tunnel.tappable[data-role="back"]');
  await bk.scrollIntoViewIfNeeded();
  const rb = await rectOf(page, '.scene-tunnel.tappable[data-role="back"]');
  ok(rb.w >= 48 && rb.h >= 48 && (await bk.getAttribute('aria-label')) === `Back to ${W1.name}`, `${tag}: the start tunnel is a button of at least 48 px labelled "Back to ${W1.name}"`);
  const s0 = await stored(page);
  await bk.click();
  ok(await until(page, () => document.querySelectorAll('.stone').length === 11 && !!document.querySelector('.visit-chip'), null, 8000), `${tag}: it shows world 1's eleven stones with the visit chip`);
  await page.waitForTimeout(2200);
  ok(await page.evaluate(() => [...document.querySelectorAll('.stone')].every((s) => s.classList.contains('is-done')) && document.querySelectorAll('.scene-tunnel.tappable[data-role="forward"]').length === 1 && document.querySelectorAll('.scene-tunnel.start').length === 0 && document.querySelectorAll('.scene-house').length === 1), `${tag}: every stone is done, the end tunnel is a button, the house is back at the start`);
  const fw = page.locator('.scene-tunnel.tappable[data-role="forward"]');
  await fw.scrollIntoViewIfNeeded();
  const rf = await rectOf(page, '.scene-tunnel.tappable[data-role="forward"]');
  ok(rf.w >= 48 && rf.h >= 48 && (await fw.getAttribute('aria-label')) === `On to ${W2.name}`, `${tag}: the end tunnel is a button labelled "On to ${W2.name}"`);
  ok(inView(await rectOf(page, '.visit-chip'), vp) && (await rectOf(page, '.visit-chip')).h >= 48, `${tag}: the visit chip fits`);
  ok(progress(await stored(page)) === progress(s0), `${tag}: nothing recorded by looking back`);
  await page.locator('.stone').first().click();
  ok(await until(page, () => /lesson\/1$/.test(location.hash), null, 5000), `${tag}: a stone of the visited world opens its lesson`);
  await page.evaluate(() => { location.hash = '#/lesson/1/finish'; });
  await page.waitForSelector('.finish');
  await page.waitForTimeout(1700);
  await page.locator('.finish .got').click();
  await page.waitForTimeout(1700);
  await page.locator('.finish .got').click();
  ok(await until(page, () => document.querySelectorAll('.stone').length === 11 && !!document.querySelector('.visit-chip'), null, 8000) && progress(await stored(page)) === progress(s0), `${tag}: finishing a replayed lesson returns to the visited world and changes nothing`);
  await page.waitForTimeout(2500); // the glide to the last stone
  await page.locator('.scene-tunnel.tappable[data-role="forward"]').scrollIntoViewIfNeeded();
  await page.locator('.scene-tunnel.tappable[data-role="forward"]').click();
  ok(await until(page, () => document.querySelectorAll('.stone').length === 19 && !document.querySelector('.visit-chip'), null, 8000), `${tag}: on to world 2: its 19 stones, no chip`);
  await page.waitForTimeout(2500); // the glide to the current stone
  await page.locator('.scene-tunnel.tappable[data-role="back"]').scrollIntoViewIfNeeded();
  await page.locator('.scene-tunnel.tappable[data-role="back"]').click();
  await until(page, () => !!document.querySelector('.visit-chip'), null, 8000);
  await page.waitForTimeout(1500);
  await shot(page, 'flat-world1-visited', vp);
  await page.locator('.visit-chip').click();
  ok(await until(page, () => document.querySelectorAll('.stone').length === 19 && !document.querySelector('.visit-chip'), null, 8000), `${tag}: the chip returns to the current world`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// ---- reduced motion: no card, at once ----
export async function reducedVisitChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[1];
  const { ctx, page, errors } = await openHome(browser, url, vp, seed(7), { extra: { reducedMotion: 'reduce' } });
  ok(await world3d(page, 'W2') && await settled(page), 'reduced: world 2 opens');
  ok(await showTunnel(page, 'back'), 'reduced: the back button shows');
  await page.evaluate(() => { window.__cards = 0; new MutationObserver((l) => l.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('world-card')) window.__cards++; }))).observe(document.body, { childList: true, subtree: true }); });
  await page.locator('.portal-btn[data-role="back"]').click();
  ok(await world3d(page, 'W1') && await page.evaluate(() => window.__cards === 0), 'reduced: going back is at once, with no world card');
  ok(await settled(page, 8000) && await page.evaluate(() => window.__train.reduced && !window.__train.running), 'reduced: the visited world is still');
  ok(errors.length === 0, `reduced: errors ${errors.join(' | ')}`);
  await ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  unitChecks(ok);
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  const only = process.argv.find((a) => a.startsWith('--vp='));
  for (const vp of VIEWPORTS.filter((v) => !only || v.name === only.slice(5))) { await visit3dChecks({ browser, url, ok, vp }); await grownupsChecks({ browser, url, ok, vp }); await flatVisitChecks({ browser, url, ok, vp }); }
  await replayRealChecks({ browser, url, ok });
  await reducedVisitChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`world-visit: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
