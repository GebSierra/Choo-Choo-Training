// The character creator: the first-run card after the welcome, the Grownups editor, the figure on the finish screen, in
// Story 1, on the 2D map and on the 3D platform; privacy (device only, never spoken) and heat. Run: node test/character.mjs
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN, doneThrough } from './lib.mjs';
import { openHome, state, iL } from './train.mjs';
import { SKINS } from '../js/character.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const BOOK = CUR.checkpoints.find((k) => k.kind === 'book');
const LILY = { name: 'Lily', skin: 3, hair: 'puffs', hairColor: 3, made: true };
const RAF_COUNTER = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const seedState = (st) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(st))}); }`;
const base = (lessons, settings = {}, extra = {}) => ({ schema: 1, lessons, settings: { seenScripts: SEEN, trainIntroDone: true, ...settings }, firstRunDone: true, character: LILY, ...extra });
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')));
const until = (page, fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout }).then(() => true).catch(() => false);

export async function characterChecks({ browser, url, ok }) {
  const requests = [];
  const spy = (page) => page.on('request', (r) => requests.push(r.url() + ' ' + (r.postData() || '')));
  const spoken = [];

  // First run: welcome, then the creator.
  {
    const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
    spy(page);
    await page.addInitScript(SPEECH_STUB);
    await page.goto(url + '#/home');
    await page.waitForSelector('.welcome');
    await page.waitForTimeout(700);
    await page.click('.wc-skip');
    await page.waitForSelector('.cp');
    await page.waitForTimeout(600);
    ok((await page.locator('.cp h2').innerText()) === 'Who is riding with Pip?', 'first run: the creator asks who is riding with Pip');
    ok((await page.locator('.cp-skin button, .cp-hair button, .cp-hair-color button').count()) === 15, 'first run: five skins, five hair styles, five hair colours');
    const small = await page.evaluate(() => [...document.querySelectorAll('.cp button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width < 55.5 || r.height < 55.5; }).map((b) => b.className));
    ok(small.length === 0, `first run: every button is at least 56 px (${small.join(',')})`);
    ok((await page.locator('.cp-skin button').nth(2).getAttribute('aria-pressed')) === 'true', 'first run: skin tone 3 starts picked');
    await page.locator('.cp-skin button').nth(3).click();
    await page.locator('.cp-hair button').nth(2).click();
    await page.locator('.cp-hair-color button').nth(3).click();
    await page.fill('.cp-name', 'Lily');
    ok((await page.locator('.cp-preview .kid-head').getAttribute('fill')) === SKINS[3], 'first run: the figure follows the picks');
    ok((await page.locator('.cp-skin button').nth(3).getAttribute('aria-pressed')) === 'true' && (await page.locator('.cp-skin button').nth(2).getAttribute('aria-pressed')) === 'false', 'first run: the picked swatch is marked');
    ok((await page.locator('.cp-note').innerText()).includes('Saved only on this device'), 'first run: the privacy note is shown');
    await page.click('.cp-done');
    await page.waitForTimeout(500);
    ok((await page.locator('.first-run').count()) === 0, 'first run: All aboard closes the creator');
    await page.reload();
    await page.waitForTimeout(900);
    const s = await stored(page);
    ok(JSON.stringify(s.character) === JSON.stringify(LILY) && s.meetDue === false, `first run: the character is stored and the creator is done (${JSON.stringify(s.character)}, meetDue ${s.meetDue})`);
    ok((await page.locator('.first-run').count()) === 0, 'first run: no overlay after a reload');
    spoken.push(...(await page.evaluate(() => window.__spoken || [])));
    ok(errors.length === 0, `first run: errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  // Grownups: change the hair and save.
  {
    const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
    spy(page);
    await page.addInitScript(SPEECH_STUB); await page.addInitScript(seedState(base({}, {}, { meetDue: false })));
    await page.goto(url + '#/home');
    await page.waitForSelector('.pill-hold');
    await page.waitForTimeout(600);
    const gb = await page.locator('.pill-hold').boundingBox(); // the hold gate: 2 s
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
    await page.waitForSelector('.cp-grownups');
    ok((await page.locator('.cp-grownups .cp-name').inputValue()) === 'Lily' && (await page.locator('.cp-grownups .cp-hair button').nth(2).getAttribute('aria-pressed')) === 'true', 'grownups: the editor starts with the saved figure');
    await page.locator('.cp-grownups .cp-hair button').nth(4).click();
    await page.click('.cp-save');
    ok((await page.locator('.cp-grownups').innerText()).includes('Saved'), 'grownups: Save says Saved');
    await page.reload(); await page.waitForTimeout(500);
    ok((await stored(page)).character.hair === 'bun', 'grownups: the new hair survives a reload');
    ok(errors.length === 0, `grownups: errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  // The finish screen.
  {
    const { ctx, page } = await newPage(browser, VIEWPORTS[0]);
    spy(page);
    await page.addInitScript(SPEECH_STUB); await page.addInitScript(seedState(base({})));
    await page.goto(url + '#/lesson/1/finish');
    await page.waitForSelector('.finish-kid .kid');
    ok((await page.locator('.finish-kid .kid-head').getAttribute('fill')) === SKINS[3], 'finish: the figure beside Pip has the chosen skin');
    ok((await page.locator('.finish-pip .pip').count()) === 1, 'finish: Pip is still there');
    await ctx.close();
  }

  // Story 1: on the cover and as the friend.
  {
    const { ctx, page } = await newPage(browser, VIEWPORTS[0]);
    spy(page);
    await page.addInitScript(SPEECH_STUB); await page.addInitScript(seedState(base(doneThrough(BOOK.after))));
    await page.goto(url + `#/checkpoint/${BOOK.id}`);
    await page.waitForSelector('.cover-kid .kid');
    ok(true, 'book: the cover has the figure beside Pip');
    ok((await page.locator('.cover-pip .pip').count()) === 1, 'book: and Pip');
    await page.locator('.book-cover').click();
    await page.waitForSelector('.book[data-state="open"]');
    await page.locator('.book-next').click();
    await page.waitForFunction(() => Number(document.querySelector('.book-stage').dataset.page) === 1 && !document.querySelector('.book-leaf'));
    ok((await page.locator('.book-friend .kid').getAttribute('aria-label')) === 'Lily', 'book: page 2 shows the figure, named Lily');
    ok((await page.locator('.book-friend .book-emoji').count()) === 0, 'book: the old emoji is gone');
    spoken.push(...(await page.evaluate(() => window.__spoken || [])));
    await ctx.close();
  }

  // The 2D map.
  {
    const { ctx, page } = await newPage(browser, VIEWPORTS[0]);
    spy(page);
    await page.addInitScript(SPEECH_STUB); await page.addInitScript(seedState(base(doneThrough(4), { trainWorld: false })));
    await page.goto(url + '#/home');
    await page.waitForSelector('.stone-kid .kid', { state: 'attached' });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => { const k = document.querySelector('.stone-kid').getBoundingClientRect(), s = document.querySelector('.stone.is-current').getBoundingClientRect(); return { kx: k.x + k.width / 2, ky: k.y + k.height / 2, sx: s.x + s.width / 2, sy: s.y + s.height / 2, kw: k.width, count: document.querySelectorAll('.stone-kid').length }; });
    ok(r.count === 1 && Math.abs(r.kx - r.sx) < 150 && Math.abs(r.ky - r.sy) < 150, `map: the figure stands beside the current stone (${JSON.stringify(r)})`);
    await ctx.close();
  }

  // The 3D Home: on the platform of the current stop, and it waves on arrival.
  {
    const { ctx, page, errors } = await openHome(browser, url, VIEWPORTS[0], state(4, { trainAt: iL(4) }, { character: LILY }), { init: [RAF_COUNTER] });
    spy(page);
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 400);
    const t = await page.evaluate(() => ({ kid: window.__train.kid.index, cur: window.__train.currentIndex, name: window.__train.kidName }));
    ok(t.kid === t.cur && t.name === 'kid', `3D home: the figure stands at the current stop (${JSON.stringify(t)})`);
    ok(await until(page, () => window.__train.kid.waving, null, 20000), '3D home: the figure waves when the train arrives');
    ok(await until(page, () => !window.__train.kid.waving, null, 6000), '3D home: and stops waving a few seconds later');
    ok(await until(page, () => !window.__train.running, null, 8000), '3D home: the scene settles');
    await page.waitForTimeout(800);
    const r0 = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(3000);
    const frames = (await page.evaluate(() => window.__raf)) - r0;
    ok(frames <= 2, `3D home: the figure adds no idle frames (${frames} in 3 s)`);
    ok(errors.length === 0, `3D home: errors ${errors.join(' | ')}`);
    spoken.push(...(await page.evaluate(() => window.__spoken || [])));
    await ctx.close();
  }

  // Privacy.
  ok(!requests.some((q) => q.includes('Lily')), 'privacy: no request carries the name');
  ok(!spoken.some((q) => /Lily/.test(q)), 'privacy: the name is never spoken');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await characterChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`character: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
