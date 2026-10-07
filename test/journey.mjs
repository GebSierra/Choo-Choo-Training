// The journey board's permanent home (owner's decision A + B + C): a map button at the top left of the Home (3D and 2D) replaces
// the star board and opens the journey board as a full-screen sheet (the worlds as stations on a railway, the train at the current
// one, finished ones ticked, later ones locked, the gold level stars inside); the world-crossing card shows a compact board with
// the train rolling to the next world; Grownups > Progress holds the board and a summary for each world.
// Run alone with `node test/journey.mjs [--shots]`; shots go to docs/screenshots/journey/.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS } from './lib.mjs';
import { openHome, state, until, iL, RAF_COUNT } from './train.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/journey');
const SHOT_VPS = [{ name: '412x915', width: 412, height: 915, deviceScaleFactor: 2 }, { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 }];
const FIT_VPS = [{ name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 }, { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 }, { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 }];
const CHARACTER = { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true };

// Lessons 1..n done, each finished at noon (UTC) on October n 2026, so dates read the same in any time zone.
const dated = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it', completedAt: `2026-10-${String(i + 1).padStart(2, '0')}T12:00:00.000Z` }]));
const stars = (n) => (n >= 13 ? 2 : n >= 6 ? 1 : 0);
// The Home with n lessons done and nothing due (no level party, no crossing): the world last seen is the current one.
const seed = (n, settings = {}, extra = {}) => {
  const cur = n >= 6 ? 'W2' : 'W1';
  return state(n, { migrated1912: true, pace4: true, trainDone: n, ...settings }, { lessons: dated(n), levels: { seen: stars(n), earned: stars(n) ? { L1: '2026-10-06T12:00:00.000Z', ...(stars(n) > 1 ? { L2: '2026-10-13T12:00:00.000Z' } : {}) } : {} }, worlds: { seen: cur }, character: CHARACTER, meetDue: false, ...extra });
};
const settle = (page) => until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, 20000);
const idle = async (page) => {
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(3000);
  return { raf: (await page.evaluate(() => window.__raf)) - r0, endless: await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().endTime === Infinity).length) };
};
const shotTo = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; }, sel);
const gate = async (page) => {
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
  await page.waitForSelector('.grownups');
};
const states = (page) => page.evaluate(() => [...document.querySelectorAll('.jb-badge')].map((b) => b.dataset.state));
const openBoard = async (page) => { await page.locator('.map-btn').click(); return until(page, () => !!document.querySelector('.jb') && document.querySelector('.jb').getAnimations({ subtree: true }).length === 0, null, 8000); };

export async function journeyChecks({ browser, url, ok }) {
  const vp = SHOT_VPS[0];

  // ---- 1. The map button where the star board was, on the 3D Home, for three points in the journey ----
  for (const [n, want] of [[2, { cur: 0, done: [], stars: 0, curName: 'Starter Station' }], [7, { cur: 1, done: [0], stars: 1, curName: 'Green Valley' }], [13, { cur: 1, done: [0], stars: 2, curName: 'Green Valley', allDone: true }]]) {
    const tag = `lesson ${n === 13 ? 'all done' : n + 1}`;
    const { ctx, page, errors } = await openHome(browser, url, vp, seed(n), { init: [RAF_COUNT] });
    ok(await settle(page), `${tag}: the 3D Home settles`);
    ok((await page.locator('.home-top .map-btn').count()) === 1 && (await page.locator('.map-btn').getAttribute('aria-label')) === 'Journey map', `${tag}: one map button in the top bar, labelled "Journey map"`);
    ok((await page.locator('.level-stars, .level-star').count()) === 0, `${tag}: the star board is gone from the Home`);
    const m = await rect(page, '.map-btn'), g = await rect(page, '.home-top .hold-btn'), fs = await rect(page, '.home-fs');
    ok(m.w >= 48 && m.h >= 48 && m.x >= 0 && m.r <= 412, `${tag}: the map button is at least 48 px and on screen (${Math.round(m.w)}x${Math.round(m.h)})`);
    ok(m.x >= g.r - 2 && Math.abs(m.y + m.h / 2 - (g.y + g.h / 2)) < 12, `${tag}: it sits right of the Grownups pill, where the star board was (x ${Math.round(m.x)} after ${Math.round(g.r)})`);
    ok(m.r <= fs.x, `${tag}: and clear of the full screen button`);
    ok((await page.locator('.map-btn').getAttribute('data-stars')) === String(want.stars), `${tag}: the button counts ${want.stars} gold star(s)`);
    if (n === 7) { await shotTo(page, 'home-topbar-' + vp.name); }
    ok(await openBoard(page), `${tag}: a tap opens the journey board`);
    ok((await page.locator('.jb').count()) === 1 && (await page.locator('.jb').getAttribute('aria-label')) === 'Your journey' && (await page.locator('.home3d').count()) === 1, `${tag}: a full-screen sheet over the Home`);
    const st = await states(page);
    const expect = CUR.worlds.map((w, i) => (i === want.cur ? 'current' : want.done.includes(i) ? 'done' : 'future'));
    ok(JSON.stringify(st) === JSON.stringify(expect), `${tag}: every world's state (${st.join()})`);
    const d = await page.evaluate(() => ({
      locks: document.querySelectorAll('.jb-badge.is-future .jb-badge-mark.lock').length, ticks: document.querySelectorAll('.jb-badge-mark.gold').length,
      train: [...document.querySelectorAll('.jb-train')].map((t) => t.closest('.jb-badge').dataset.world), here: document.querySelector('.jb-here-pill').textContent, name: document.querySelector('.jb-world-name').textContent,
      label: document.querySelector('.jb-badge.is-current').getAttribute('aria-label'), n: document.querySelectorAll('.jb-badge').length,
      lit: document.querySelectorAll('.jb-stars .level-star.on').length, outline: document.querySelectorAll('.jb-stars .level-star:not(.on)').length, tally: document.querySelector('.jb-stars-n').textContent, count: document.querySelector('.jb-stars .level-stars').dataset.count,
      more: !!document.querySelector('.jb-more'), stations: [...document.querySelectorAll('.jb-stn')].map((s) => `${s.dataset.unit}:${s.dataset.state}`).join(),
    }));
    ok(d.n === 11 && d.locks === 10 - want.done.length && d.ticks === want.done.length + (want.allDone ? 1 : 0), `${tag}: ${d.locks} locks on the later worlds and ${d.ticks} gold tick(s) on the finished ones`);
    ok(d.train.length === 1 && d.train[0] === CUR.worlds[want.cur].id && d.here === 'You are here' && d.name === want.curName && /you are here/.test(d.label), `${tag}: "You are here" and the train at ${want.curName} (${d.train})`);
    ok(d.lit === want.stars && d.lit + d.outline === 2 && d.count === String(want.stars) && d.tally === `${want.stars} of 2`, `${tag}: the gold stars are inside the board (${d.lit} lit, ${d.outline} outline, "${d.tally}")`);
    ok(d.more === !!want.allDone, `${tag}: the "more worlds are coming" line only when everything built is finished`);
    if (n === 2) ok(d.stations === '1.1:later,1.2:later,1.3:later,2.1:here,2.2:later,2.3:later', `${tag}: unit track (${d.stations})`);
    if (n === 7) { ok(d.stations === '2.4:here,2.5:later,2.6:later,2.7:later,2.8:later', `${tag}: world 2 unit track (${d.stations})`); await shotTo(page, 'board-' + vp.name); }
    if (n === 13) await shotTo(page, 'board-all-done-' + vp.name);
    // the sheet's own sizes
    const x = await rect(page, '.jb-x');
    ok(x.w >= 48 && x.h >= 48 && x.r <= 412 && x.y >= 0, `${tag}: the close button is 48 px and on screen`);
    // close by its button: the Home is there, the address did not change
    await page.locator('.jb-x').click();
    ok(await until(page, () => !document.querySelector('.jb'), null, 3000) && page.url().endsWith('#/home') && (await page.locator('.home3d').count()) === 1, `${tag}: the close button closes it and Home is there`);
    ok(await page.evaluate(() => !history.state || !history.state.sheet), `${tag}: no history entry is left behind`);
    // reopen; Back (the browser's, which is Android's) closes it without leaving the Home
    ok(await openBoard(page), `${tag}: it opens again`);
    await page.goBack();
    ok(await until(page, () => !document.querySelector('.jb'), null, 3000) && page.url().endsWith('#/home') && (await page.locator('.home3d').count()) === 1, `${tag}: Back closes it and stays on the Home`);
    // "All aboard!" closes it too
    await openBoard(page);
    await page.locator('.jb-go').click();
    ok(await until(page, () => !document.querySelector('.jb'), null, 3000), `${tag}: "All aboard!" closes it`);
    if (n === 7) {
      const m0 = await idle(page);
      ok(m0.raf <= 2 && m0.endless === 0, `${tag}: Home idle after closing: ${m0.raf} frames in 3 s, ${m0.endless} endless animations`);
      await openBoard(page);
      const m1 = await idle(page);
      ok(m1.raf <= 2 && m1.endless === 0, `${tag}: Home idle with the board open: ${m1.raf} frames in 3 s, ${m1.endless} endless animations`);
    }
    ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  // ---- 2. The 2D Home ----
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, seed(7, { trainWorld: false }));
    await page.waitForSelector('.home .map-scroll, .home .scene', { timeout: 15000 });
    ok((await page.locator('.home3d').count()) === 0 && (await page.locator('.home-top .map-btn').count()) === 1 && (await page.locator('.level-stars').count()) === 0, '2D Home: the map button, no star board');
    const m = await rect(page, '.map-btn'), g = await rect(page, '.home-top .hold-btn');
    ok(m.w >= 48 && m.h >= 48 && m.x >= g.r - 2, '2D Home: 48 px and right of the Grownups pill');
    ok((await page.locator('.map-btn').getAttribute('data-stars')) === '1', '2D Home: it counts one gold star');
    await page.locator('.map-btn').click();
    ok(await until(page, () => !!document.querySelector('.jb') && document.querySelector('.jb').getAnimations({ subtree: true }).length === 0, null, 8000), '2D Home: the board opens');
    const st = await states(page);
    ok(st[0] === 'done' && st[1] === 'current' && st.slice(2).every((s) => s === 'future') && (await page.locator('.jb-stars .level-star.on').count()) === 1, `2D Home: the states are right and the star is inside (${st.join()})`);
    await shotTo(page, 'board-2d-' + vp.name);
    await page.goBack();
    ok(await until(page, () => !document.querySelector('.jb'), null, 3000) && page.url().endsWith('#/home'), '2D Home: Back closes it');
    ok(errors.length === 0, `2D Home: errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  // ---- 3. The phone's Back button inside the native wrapper ----
  {
    const CAP = `window.__backs = []; window.Capacitor = { isNativePlatform: () => true, Plugins: { App: { addListener: (n, fn) => { window.__backs.push([n, fn]); return Promise.resolve({ remove() {} }); } } } };`;
    const { ctx, page, errors } = await openHome(browser, url, vp, seed(7), { init: [CAP] });
    await settle(page);
    await openBoard(page);
    ok(await page.evaluate(() => window.__backs.length === 1), 'native: still one backButton listener');
    await page.evaluate(() => window.__backs[0][1]());
    ok(await until(page, () => !document.querySelector('.jb'), null, 3000) && page.url().endsWith('#/home'), 'native: the phone Back closes the board and stays on the Home');
    ok(errors.length === 0, `native: errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  // ---- 4. Reduced motion: complete at once, nothing animating ----
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, seed(7), { extra: { reducedMotion: 'reduce' } });
    await settle(page);
    await page.locator('.map-btn').click();
    await page.waitForSelector('.jb');
    await page.waitForTimeout(150);
    const b = await page.evaluate(() => ({ still: document.querySelector('.jb').classList.contains('still'), anim: document.getAnimations().length, op: getComputedStyle(document.querySelector('.jb-badge')).opacity, train: document.querySelectorAll('.jb-train').length }));
    ok(b.still && b.anim === 0 && b.op === '1' && b.train === 1, `reduced motion: the board is complete at once with no animation (${JSON.stringify(b)})`);
    await page.locator('.jb-x').click();
    ok(await until(page, () => !document.querySelector('.jb'), null, 2000), 'reduced motion: closes at once');
    ok(errors.length === 0, `reduced motion: errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  // ---- 5. It fits every phone size, both ways round ----
  for (const v of FIT_VPS) {
    const { ctx, page, errors } = await openHome(browser, url, v, seed(7));
    await settle(page);
    const top = await page.evaluate(() => { const o = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1; const m = document.querySelector('.map-btn').getBoundingClientRect(); return { fits: m.left >= 0 && m.right <= innerWidth && m.top >= 0 && m.bottom <= innerHeight, hit: [...document.querySelectorAll('.home-top .hold-btn, .home-fs')].filter((e) => o(m, e.getBoundingClientRect())).length, w: m.width, h: m.height }; });
    ok(top.fits && top.hit === 0 && top.w >= 48 && top.h >= 48, `${v.name}: the map button fits, is 48 px and overlaps nothing in the top bar (${JSON.stringify(top)})`);
    if (v.name === '915x412') await shotTo(page, 'home-topbar-915x412');
    await openBoard(page);
    await page.waitForTimeout(300);
    if (v.name === '915x412') await shotTo(page, 'board-915x412');
    const f = await page.evaluate(() => {
      const sc = document.querySelector('.jb-scroll'), vw = innerWidth, vh = innerHeight, bad = [];
      for (const sel of ['.jb-x', '.jb-go', '.jb-head', '.jb-badge', '.jb-train', '.jb-here-pill', '.jb-world-name', '.jb-stars']) for (const e of document.querySelectorAll(sel)) { const r = e.getBoundingClientRect(); if (r.left < -0.5 || r.right > vw + 0.5) bad.push(sel + ' x'); }
      const x = document.querySelector('.jb-x').getBoundingClientRect(), go = document.querySelector('.jb-go').getBoundingClientRect();
      return { hscroll: sc.scrollWidth > sc.clientWidth + 1, bad, x: x.width, go: go.bottom <= vh + 0.5 && go.height >= 48, vscroll: sc.scrollHeight > sc.clientHeight };
    });
    ok(!f.hscroll && f.bad.length === 0 && f.x >= 48 && f.go, `${v.name}: the board has no sideways scroll, nothing off screen, a 48 px close button and the foot button in view (${JSON.stringify(f)})`);
    // everything can be reached: the stars card is in the scrolling area (scrolling brings it into view)
    await page.locator('.jb-stars').scrollIntoViewIfNeeded();
    const s = await rect(page, '.jb-stars');
    ok(s.y >= 0 && s.b <= v.height + 1, `${v.name}: the gold stars can be scrolled into view (${Math.round(s.y)}..${Math.round(s.b)} of ${v.height})`);
    ok(errors.length === 0, `${v.name}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  // ---- 6. The level party points at the map button ----
  {
    const ANIMS = () => { window.__anims = []; const o = Element.prototype.animate; Element.prototype.animate = function (...a) { window.__anims.push(this.className && this.className.baseVal === undefined ? String(this.className) : ''); return o.apply(this, a); }; };
    const six = state(6, { migrated1912: true, pace4: true, trainAt: iL(6), trainDone: 5 }, { lessons: dated(6), levels: { seen: 0, earned: {} }, worlds: { seen: 'W1' }, character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, vp, six, { init: [RAF_COUNT, ANIMS] });
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 300);
    ok((await page.locator('.map-btn').getAttribute('data-stars')) === '0' && (await page.locator('.level-stars').count()) === 0, 'level party: the button shows no star before the party');
    ok(await until(page, () => !!document.querySelector('.level-banner'), null, 40000), 'level party: the banner shows');
    ok(await until(page, () => document.querySelector('.map-btn') && document.querySelector('.map-btn').dataset.stars === '1', null, 4000), 'level party: the new star is counted on the map button');
    ok(await page.evaluate(() => window.__anims.some((c) => /map-btn/.test(c))), 'level party: the map button pulses once');
    ok(await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).levels.earned.L1 !== undefined), 'level party: the level is recorded');

    // ---- 7. The crossing card shows the compact board, the train rolls to the next world ----
    ok(await until(page, () => !!document.querySelector('.world-card .jm-mini'), null, 40000), 'crossing: the loading card shows a compact journey board');
    const t0 = await page.evaluate(() => { const m = document.querySelector('.jm-mini'), t = m.querySelector('.jm-train').getBoundingClientRect(); return { from: m.dataset.from, to: m.dataset.to, n: m.querySelectorAll('.jm-stn').length, x: t.x, at: m.dataset.at, big: m.querySelectorAll('.jm-stn.big').length, name: document.querySelector('.wg-name').textContent }; });
    ok(t0.from === 'W1' && t0.to === 'W2' && t0.n === 11 && t0.big === 2 && t0.name === 'Green Valley', `crossing: eleven stations, from world 1 to world 2 (${JSON.stringify(t0)})`);
    ok(await until(page, () => document.querySelector('.jm-mini') && document.querySelector('.jm-mini').dataset.at === '1', null, 3000), 'crossing: the train is sent to world 2');
    await until(page, () => { const m = document.querySelector('.jm-mini'); if (!m) return true; const t = m.querySelector('.jm-train').getBoundingClientRect(), n = m.querySelector('.jm-stn[data-world="W2"]').getBoundingClientRect(); return Math.abs(t.x + t.width / 2 - (n.x + n.width / 2)) < 2; }, null, 3000);
    const t1 = await page.evaluate(() => { const m = document.querySelector('.jm-mini'), t = m && m.querySelector('.jm-train').getBoundingClientRect(), n2 = m && m.querySelector('.jm-stn[data-world="W2"]').getBoundingClientRect(), p = document.querySelector('.wg-panel').getBoundingClientRect(); return m ? { x: t.x, cx: t.x + t.width / 2, sx: n2.x + n2.width / 2, inside: t.left >= p.left - 1 && t.right <= p.right + 1 && m.getBoundingClientRect().right <= p.right + 1, moved: getComputedStyle(m.querySelector('.jm-train')).transitionDuration } : null; });
    ok(t1 && t1.x > t0.x + 8 && Math.abs(t1.cx - t1.sx) < 6, `crossing: it has rolled to the next world's station (${t0.x.toFixed(0)} to ${t1 && t1.x.toFixed(0)}, centre off by ${t1 && Math.abs(t1.cx - t1.sx).toFixed(1)})`);
    ok(t1 && t1.inside, 'crossing: the board fits inside the card');
    // with a tip on the card it waits for "Let's go!" (owner: tips close by hand), as a grown-up would tap it
    if (await until(page, () => { const b = document.querySelector('.world-card .wg-go'); return b && !b.disabled && b.textContent === "Let's go!"; }, null, 8000)) await page.locator('.world-card .wg-go').click();
    ok(await until(page, () => { const h = document.querySelector('.gateway-host'); return h && h.dataset.phase === 'done' && window.__train && window.__train.world === 'W2' && !window.__train.running; }, null, 40000), 'crossing: it still ends on world 2\'s Home');
    ok((await page.locator('.map-btn').getAttribute('data-stars')) === '1', 'crossing: world 2\'s Home keeps the star on the map button');
    await page.waitForTimeout(800);
    const m = await idle(page);
    ok(m.raf <= 2 && m.endless === 0, `crossing: Home idle afterwards: ${m.raf} frames in 3 s, ${m.endless} endless animations`);
    ok(errors.length === 0, `level party and crossing: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // reduced motion: the crossing card's train just stands at the next world (static)
    const done6 = state(6, { migrated1912: true, pace4: true, trainAt: iL(6), trainDone: 6 }, { lessons: dated(6), levels: { seen: 1, earned: { L1: '2026-10-06T12:00:00.000Z' } }, worlds: { seen: 'W1' }, character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, vp, done6, { extra: { reducedMotion: 'reduce' } });
    ok(await until(page, () => !!document.querySelector('.world-card .jm-mini'), null, 30000), 'reduced motion crossing: the card shows the board');
    const r = await page.evaluate(() => { const m = document.querySelector('.jm-mini'), t = m.querySelector('.jm-train'); return { at: m.dataset.at, tr: getComputedStyle(t).transitionDuration, anim: t.getAnimations().length }; });
    ok(r.at === '1' && parseFloat(r.tr) < 0.001 && r.anim === 0, `reduced motion crossing: the train stands at world 2, nothing moves (${JSON.stringify(r)})`);
    ok(errors.length === 0, `reduced motion crossing: errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  if (SHOTS) {
    // the crossing card for the screenshots (on the flat map, which is quick to photograph; the card is the same)
    for (const L of SHOT_VPS) {
      const done6 = state(6, { migrated1912: true, pace4: true, trainAt: iL(6), trainDone: 6, trainWorld: false }, { lessons: dated(6), levels: { seen: 1, earned: { L1: '2026-10-06T12:00:00.000Z' } }, worlds: { seen: 'W1' }, character: CHARACTER, meetDue: false });
      const { ctx, page } = await openHome(browser, url, L, done6);
      await until(page, () => !!document.querySelector('.world-card.in .jm-mini'), null, 30000);
      await page.waitForTimeout(500);
      await shotTo(page, 'crossing-start-' + L.name);
      await until(page, () => { const m = document.querySelector('.jm-mini'); if (!m) return true; const t = m.querySelector('.jm-train').getBoundingClientRect(), n = m.querySelector('.jm-stn[data-world="W2"]').getBoundingClientRect(); return Math.abs(t.x + t.width / 2 - (n.x + n.width / 2)) < 2; }, null, 3000);
      await shotTo(page, 'crossing-end-' + L.name);
      await ctx.close();
    }
  }

  // ---- 8. Grownups > Progress ----
  for (const v of SHOT_VPS) {
    const { ctx, page, errors } = await openHome(browser, url, v, seed(7));
    await settle(page);
    await gate(page);
    const first = await page.evaluate(() => document.querySelector('.gu-body').firstElementChild.querySelector('h2').textContent.trim());
    ok(first === 'Progress', `${v.name} Progress: the first card of Grownups is Progress (${first})`);
    const fold = page.locator('.gu-fold', { hasText: 'Progress' });
    ok((await fold.getAttribute('aria-expanded')) === 'false', `${v.name} Progress: a fold, closed like the others`);
    await fold.click();
    const p = await page.evaluate(() => ({
      worlds: [...document.querySelectorAll('.gp-world')].map((w) => ({ id: w.dataset.world, state: w.dataset.state, text: w.querySelector('.gp-text').innerText.replace(/\n/g, ' | ') })),
      badges: [...document.querySelectorAll('.gp-map .jb-badge')].map((b) => b.dataset.state), have: document.querySelector('.gp-map .jb-stars-n').textContent, later: document.querySelector('.gp-later') && document.querySelector('.gp-later').textContent,
      previews: [...document.querySelectorAll('.preview-btn')].map((b) => b.dataset.preview),
    }));
    ok(p.worlds.length === 2 && p.worlds[0].id === 'W1' && p.worlds[0].state === 'done' && p.worlds[1].state === 'current', `${v.name} Progress: a row for each world with lessons, world 1 finished, world 2 current`);
    ok(p.worlds[0].text === 'Starter Station · finished | 6 of 6 lessons done | Level one star: earned | Last lesson finished: Oct 6, 2026', `${v.name} Progress: world 1 summary (${p.worlds[0].text})`);
    ok(p.worlds[1].text === 'Green Valley · you are here | 1 of 7 lessons done | Now: unit 2.4, sounds f o | Level two star: not yet | Last lesson finished: Oct 7, 2026', `${v.name} Progress: world 2 summary (${p.worlds[1].text})`);
    ok(p.badges.length === 11 && p.badges[0] === 'done' && p.badges[1] === 'current' && p.have === '1 of 2', `${v.name} Progress: the board is there with the stars (${p.badges.join()} ${p.have})`);
    ok(/9 more worlds are coming later/.test(p.later || ''), `${v.name} Progress: the worlds still to come are one quiet line (${p.later})`);
    ok(!p.previews.includes('board') && p.previews.length === 6, `${v.name} Progress: Previews no longer lists the journey board (${p.previews.length} buttons)`);
    const fit = await page.evaluate(() => { const g = document.querySelector('.grownups'), bad = [...document.querySelectorAll('.gp-map .jb-badge, .gp-world, .gp-map .jb-stars')].filter((e) => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 0.5; }).length; return { bad, hs: document.scrollingElement.scrollWidth > innerWidth + 1 }; });
    ok(fit.bad === 0 && !fit.hs, `${v.name} Progress: fits the screen, no sideways scroll`);
    await page.locator('.gu-fold', { hasText: 'Progress' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await shotTo(page, 'grownups-progress-' + v.name);
    ok(errors.length === 0, `${v.name} Progress: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // nothing finished yet: the summary is calm, not an error
    const { ctx, page, errors } = await openHome(browser, url, vp, seed(0));
    await settle(page);
    await gate(page);
    await page.locator('.gu-fold', { hasText: 'Progress' }).click();
    const t = await page.locator('.gp-world[data-world="W1"] .gp-text').innerText();
    ok(/0 of 6 lessons done/.test(t) && /No lesson finished here yet/.test(t) && /Level one star: not yet/.test(t), `Progress with nothing done (${t.replace(/\n/g, ' | ')})`);
    ok(errors.length === 0, `Progress with nothing done: errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  // ---- 9. The region preview shows no star board ----
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, seed(7), { route: '#/world/W2' });
    ok(await until(page, () => window.__train && window.__train.frames > 0, null, 20000), 'region preview: opens');
    ok((await page.locator('.map-btn').count()) === 0 && (await page.locator('.level-stars').count()) === 0, 'region preview: neither the map button nor a star board');
    ok(errors.length === 0, `region preview: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await journeyChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`journey: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
