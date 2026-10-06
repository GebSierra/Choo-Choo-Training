// Levels (v1.9.4): a tunnel celebration, a special car and a gold star when a milestone lesson is done (level one at
// lesson 6, level two at lesson 13). 3D, reduced motion, 2D, no replay on the next visit, replay from Grownups, and heat.
// Run alone with `node test/levels.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS } from './lib.mjs';
import { openHome, state, iL, until, RAF_COUNT } from './train.mjs';

const CHARACTER = { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true };
const done = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it', completedAt: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00.000Z` }]));
// Lessons 1..6 done and the train still waiting at lesson 6's station: Home plays the arrival, then level one.
const six = (settings = {}, extra = {}) => state(6, { trainAt: iL(6), trainDone: 5, ...settings }, { lessons: done(6), levels: { seen: 0, earned: {} }, character: CHARACTER, meetDue: false, ...extra });
const PHASES = () => { window.__phases = []; setInterval(() => { const p = window.__train && window.__train.level && window.__train.level.phase; if (p !== undefined && window.__phases[window.__phases.length - 1] !== p) window.__phases.push(p); }, 16); };
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')));
const idle = async (page) => {
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(3000);
  return { raf: (await page.evaluate(() => window.__raf)) - r0, endless: await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().endTime === Infinity).length) };
};

export async function levelChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  const gate = async (page) => {
    const gb = await page.locator('.pill-hold').boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
    await page.waitForSelector('.grownups');
  };
  {
    // 1. Once at the threshold (3D)
    const { ctx, page, errors } = await openHome(browser, url, vp, six(), { init: [RAF_COUNT, PHASES] });
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 300); // rule 16: sound plays only after a tap
    ok(await page.evaluate(() => window.__train.level.id) === 'L1', 'level one: Home knows level one is due');
    ok(await until(page, () => window.__train.kid.phase === 'on', null, 8000), 'level one: the station-complete sequence runs first');
    ok(await until(page, () => window.__phases.includes('in'), null, 25000), 'level one: the train rolls into the tunnel');
    ok(await page.evaluate(() => window.__train.tunnel), 'level one: the tunnel is built');
    ok(await until(page, () => window.__phases.includes('hold'), null, 8000), 'level one: it waits inside and toots');
    ok(await until(page, () => window.__phases.includes('out'), null, 8000), 'level one: it backs out');
    ok(await until(page, () => window.__phases.includes('party'), null, 8000), 'level one: then the party');
    const order = await page.evaluate(() => window.__phases.filter(Boolean).join());
    ok(order === 'in,hold,out,party', `level one: the phases run in order (${order})`);
    ok(await until(page, () => !!document.querySelector('.level-banner'), null, 3000), 'level one: the banner shows');
    ok((await page.locator('.level-banner').first().innerText()).trim() === 'Level one complete!', 'level one: the banner reads "Level one complete!"');
    ok((await page.locator('.level-banner .car-icon').count()) === 1 && (await page.locator('.level-banner .gold-star').count()) === 1, 'level one: the banner shows the star and the new car');
    ok(await until(page, () => document.querySelector('.level-stars') && document.querySelector('.level-stars').dataset.count === '1', null, 3000), 'level one: the star board shows one gold star');
    ok((await page.evaluate(() => window.__train.specials)).includes('caboose'), 'level one: the caboose is on the train');
    ok(await page.evaluate(() => window.__audioNotes().some((n) => n.event === 'checkpoint')), 'level one: the checkpoint jingle plays');
    ok(await until(page, () => window.__train.level.phase === '' && !window.__train.running, null, 20000), 'level one: the celebration ends and Home settles');
    const sw = await page.evaluate(() => { const b = document.querySelector('.level-banner'); const r = b && b.getBoundingClientRect(); return r ? { l: r.left, r: r.right, w: innerWidth } : null; });
    ok(!sw || (sw.l >= 0 && sw.r <= sw.w), 'level one: the banner fits the screen');
    await page.waitForTimeout(800);
    const m = await idle(page);
    ok(m.raf <= 2 && m.endless === 0, `level one: no idle frames afterwards (${m.raf} in 3 s) and no endless animation (${m.endless})`);
    const st = await stored(page);
    ok(st.levels.seen === 1 && typeof st.levels.earned.L1 === 'string', 'level one: remembered (seen 1, earned L1)');

    // 2. No replay on the next visit
    await page.reload();
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.waitForTimeout(5000);
    ok((await page.evaluate(() => window.__train.level.id)) === null && (await page.locator('.level-banner').count()) === 0, 'next visit: no celebration and no banner');
    ok((await page.locator('.level-stars[data-count="1"]').count()) === 1, 'next visit: the star board still shows 1');
    ok((await page.evaluate(() => window.__train.specials)).includes('caboose'), 'next visit: the caboose is still on the train');

    // 6. Replay from Grownups
    await page.evaluate(() => { window.__phases = []; });
    await gate(page);
    ok((await page.locator('.gu-fold', { hasText: 'Levels' }).getAttribute('aria-expanded')) === 'false', 'Grownups: the Levels fold starts closed');
    await page.locator('.gu-fold', { hasText: 'Levels' }).click();
    await page.waitForTimeout(250);
    ok((await page.locator('.level-replay').count()) === 1 && (await page.locator('.level-replay[data-level="L1"]').count()) === 1, 'Grownups: only the earned level has Play again');
    const txt = await page.evaluate(() => document.querySelector('#gu-fold-levels').innerText);
    ok(txt.includes('Level one') && txt.includes('m a s i t p') && txt.includes('Level two') && (txt.match(/Coming later/g) || []).length === 3, 'Grownups: levels list their sounds; the three unbuilt ones say "Coming later"');
    ok(((await page.locator('.level-replay').boundingBox()).height) >= 48, 'Grownups: Play again is at least 48 px tall');
    await page.locator('.level-replay[data-level="L1"]').click();
    ok(await until(page, () => location.hash === '#/home' && window.__train && !window.__train.disposed && window.__train.level.id === 'L1', null, 6000), 'replay: Home opens with level one due');
    await page.mouse.click(3, 300);
    ok(await until(page, () => window.__phases && window.__phases.includes('party'), null, 15000), 'replay: the celebration plays again');
    ok(await until(page, () => window.__train.level.phase === '' && !window.__train.running, null, 20000), 'replay: it ends');
    const st2 = await stored(page);
    ok(st2.levels.seen === 1 && typeof st2.levels.earned.L1 === 'string', 'replay: the record is untouched (seen 1)');
    ok(errors.length === 0, `levels 3D: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // 3. Not before the threshold; and the first look with no record only records the count
    let r = await openHome(browser, url, vp, state(5, { trainAt: iL(6) }, { lessons: done(5), levels: { seen: 0, earned: {} }, character: CHARACTER, meetDue: false }));
    await until(r.page, () => window.__train && window.__train.frames > 0 && !window.__train.running, null, 20000);
    await r.page.waitForTimeout(2500);
    ok((await r.page.evaluate(() => window.__train.level.id)) === null && (await r.page.locator('.level-banner').count()) === 0 && (await r.page.locator('.level-stars[data-count="0"]').count()) === 1, 'before the threshold: five lessons, no celebration, no stars');
    ok((await r.page.locator('.level-star').count()) === 2 && (await r.page.locator('.level-star.on').count()) === 0, 'before the threshold: two empty star outlines (the built levels)');
    ok((await stored(r.page)).levels.seen === 0, 'before the threshold: seen stays 0');
    ok(r.errors.length === 0, 'before the threshold: errors ' + r.errors.join(' | '));
    await r.ctx.close();
    const noRecord = state(6, { trainAt: iL(7) }, { lessons: done(6), character: CHARACTER, meetDue: false });
    r = await openHome(browser, url, vp, noRecord);
    await until(r.page, () => window.__train && window.__train.frames > 0 && !window.__train.running, null, 20000);
    await r.page.waitForTimeout(2500);
    ok((await r.page.evaluate(() => window.__train.level.id)) === null && (await r.page.locator('.level-banner').count()) === 0, 'first look: six lessons and no record, no celebration');
    const st = await stored(r.page);
    ok(st.levels.seen === 1 && typeof st.levels.earned.L1 === 'string', 'first look: the count is recorded (seen 1)');
    ok((await r.page.locator('.level-stars[data-count="1"]').count()) === 1, 'first look: the earned level already shows its star');
    await r.ctx.close();
  }
  {
    // 4. Reduced motion
    const { ctx, page, errors } = await openHome(browser, url, vp, six(), { init: [RAF_COUNT, PHASES], extra: { reducedMotion: 'reduce' } });
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 300);
    ok(await until(page, () => !!document.querySelector('.level-banner'), null, 8000), 'reduced motion: the banner shows');
    ok((await page.locator('.level-banner').first().innerText()).trim() === 'Level one complete!', 'reduced motion: it reads "Level one complete!"');
    ok((await page.evaluate(() => window.__phases.filter(Boolean).length)) === 0, 'reduced motion: no ride (the phase never leaves empty)');
    ok(!(await page.evaluate(() => window.__train.tunnel)), 'reduced motion: no tunnel');
    ok(await page.evaluate(() => window.__audioNotes().some((n) => n.event === 'star')), 'reduced motion: one soft star sound');
    ok((await page.locator('.level-stars[data-count="1"]').count()) === 1 && (await page.evaluate(() => window.__train.specials)).includes('caboose'), 'reduced motion: the star is filled and the caboose is on the train');
    ok(await page.evaluate(() => document.querySelectorAll('.spark').length) === 0, 'reduced motion: no confetti');
    await page.waitForTimeout(800);
    const m = await idle(page);
    ok(m.raf <= 2, `reduced motion: at most 2 frames in 3 s after the banner (${m.raf})`);
    ok(errors.length === 0, `reduced motion: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // 5. 2D
    const { ctx, page, errors } = await openHome(browser, url, vp, six({ trainWorld: false, migrated1912: true }));
    await page.waitForSelector('.map-scroll');
    await page.evaluate(async () => (await import('/js/sfx.js')).sfx.unlock());
    ok(await until(page, () => !!document.querySelector('.level-banner .car-icon'), null, 12000), '2D: after the ride the banner shows the new car');
    ok((await page.locator('.level-banner').first().innerText()).trim() === 'Level one complete!', '2D: it reads "Level one complete!"');
    ok((await page.locator('.level-stars[data-count="1"]').count()) === 1, '2D: the star board shows 1');
    ok(await until(page, () => !document.querySelector('.level-banner'), null, 7000), '2D: the banner is gone after a few seconds');
    ok(errors.length === 0, `2D: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // 7. Level two at thirteen: the coach, the second star, and the caboose still last
    const l1 = { L1: '2026-10-06T10:00:00.000Z' };
    const { ctx, page, errors } = await openHome(browser, url, vp, state(13, { trainAt: 9999 }, { lessons: done(13), levels: { seen: 1, earned: l1 }, character: CHARACTER, meetDue: false }), { init: [RAF_COUNT, PHASES] });
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 300);
    ok(await page.evaluate(() => window.__train.level.id) === 'L2', 'level two: due at thirteen');
    ok(await until(page, () => !!document.querySelector('.level-banner'), null, 20000), 'level two: the banner shows');
    ok((await page.locator('.level-banner').first().innerText()).trim() === 'Level two complete!', 'level two: it reads "Level two complete!"');
    ok((await page.evaluate(() => window.__train.specials.join())) === 'coach,caboose', 'level two: the coach is added and the caboose stays last');
    ok(await until(page, () => document.querySelector('.level-stars') && document.querySelector('.level-stars').dataset.count === '2', null, 3000), 'level two: two gold stars');
    ok(await until(page, () => window.__train.level.phase === '' && !window.__train.running, null, 20000), 'level two: ends');
    ok(errors.length === 0, `level two: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  fs.mkdirSync(path.join(ROOT, '_test'), { recursive: true });
  await levelChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`levels: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
