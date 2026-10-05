// The character creator: the first-run card after the welcome, the Grownups editor, the figure on the finish screen, in
// Story 1, on the 2D map and on the 3D platform; privacy (device only, never spoken) and heat. Run: node test/character.mjs
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN, doneThrough } from './lib.mjs';
import { openHome, state, iL } from './train.mjs';
import { SKINS, HAIR_STYLES, HAIR_COLORS, OUTFITS, OUTFIT_IDS, cleanCharacter } from '../js/character.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const BOOK = CUR.checkpoints.find((k) => k.kind === 'book');
const LILY = { name: 'Lily', skin: 3, hair: 'puffs', hairColor: 3, made: true }; // as saved before 1.8.5: no outfit
const LILY_NOW = { name: 'Lily', skin: 3, hair: 'puffs', hairColor: 3, outfit: 'star', made: true };
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
    ok((await page.locator('.cp-skin button, .cp-hair button, .cp-hair-color button, .cp-outfit button').count()) === 5 + 10 + 5 + OUTFITS.length, 'first run: five skins, ten hair styles, five hair colors and the clothes');
    ok(HAIR_STYLES.length === 10 && HAIR_COLORS.length === 5 && OUTFITS.length >= 8 && OUTFITS[0].id === 'star', 'data: ten hair styles, five colors, at least eight outfits, the old look first');
    ok((await page.locator('.cp-outfit button').nth(0).getAttribute('aria-pressed')) === 'true', 'first run: the original outfit starts picked');
    const small = await page.evaluate(() => [...document.querySelectorAll('.cp button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width < 55.5 || r.height < 55.5; }).map((b) => b.className));
    ok(small.length === 0, `first run: every button is at least 56 px (${small.join(',')})`);
    ok((await page.locator('.cp-skin button').nth(2).getAttribute('aria-pressed')) === 'true', 'first run: skin tone 3 starts picked');
    await page.locator('.cp-skin button').nth(3).click();
    await page.locator('.cp-hair button').nth(2).click();
    await page.locator('.cp-hair-color button').nth(3).click();
    await page.locator('.cp-outfit button').nth(0).click();
    await page.fill('.cp-name', 'Lily');
    ok((await page.locator('.cp-preview .kid-head').getAttribute('fill')) === SKINS[3], 'first run: the figure follows the picks');
    ok((await page.locator('.cp-skin button').nth(3).getAttribute('aria-pressed')) === 'true' && (await page.locator('.cp-skin button').nth(2).getAttribute('aria-pressed')) === 'false', 'first run: the picked swatch is marked');
    ok((await page.locator('.cp-note').count()) === 0, 'first run: no privacy note (owner choice)');
    await page.click('.cp-done');
    await page.waitForTimeout(500);
    ok((await page.locator('.first-run').count()) === 0, 'first run: All aboard closes the creator');
    await page.reload();
    await page.waitForTimeout(900);
    const s = await stored(page);
    ok(JSON.stringify(s.character) === JSON.stringify(LILY_NOW) && s.meetDue === false, `first run: the character is stored and the creator is done (${JSON.stringify(s.character)}, meetDue ${s.meetDue})`);
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
    ok((await page.locator('.cp-grownups .cp-outfit button').nth(0).getAttribute('aria-pressed')) === 'true', 'grownups: a character saved before the outfit existed starts with the default outfit');
    await page.locator('.cp-grownups .cp-hair button').nth(4).click();
    await page.locator('.cp-grownups .cp-outfit button').nth(5).scrollIntoViewIfNeeded();
    await page.locator('.cp-grownups .cp-outfit button').nth(5).click();
    await page.click('.cp-save');
    ok((await page.locator('.cp-grownups').innerText()).includes('Saved'), 'grownups: Save says Saved');
    await page.reload(); await page.waitForTimeout(500);
    ok((await stored(page)).character.hair === 'bun', 'grownups: the new hair survives a reload');
    ok((await stored(page)).character.outfit === OUTFIT_IDS[5], 'grownups: the new outfit is saved');
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

  // Every option draws, in 2D and in 3D; an old saved character gets the default.
  {
    const c = cleanCharacter({ name: 'A', skin: 1, hair: 'bun', hairColor: 2, made: true });
    ok(c.outfit === 'star', 'old character: no outfit field gives the default outfit');
    ok(cleanCharacter({ outfit: 'nonsense' }).outfit === 'star', 'old character: an unknown outfit gives the default');
    const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
    await page.goto(url + '#/home');
    const r = await page.evaluate(async ({ hairs, outfits }) => {
      const { kidSvg } = await import('/js/art/kid.js'); const { THREE, makeBag } = await import('/js/train/world.js'); const { buildKid } = await import('/js/train/kid3d.js');
      const out = { two: 0, three: 0, bad: [], sig2: new Set(), sig3: new Set() };
      const bag = makeBag();
      for (const hair of hairs) for (const outfit of outfits) {
        const svg = kidSvg({ skin: 2, hair, hairColor: 1, outfit }); out.two += svg.querySelectorAll('path,circle,ellipse,rect,polygon').length > 10 ? 1 : 0;
        out.sig2.add(hair + '|' + svg.querySelector('.kid-hair-front').innerHTML.length + '|' + svg.querySelector('.kid-hair-back').innerHTML.length + '|' + svg.querySelector('.kid-fig').innerHTML + svg.querySelector('.kid-wear-back').innerHTML);
        const k = buildKid(bag, { skin: 2, hair, hairColor: 1, outfit }); let n = 0; k.group.traverse((m) => { if (m.isMesh) n++; });
        out.three += n > 12 ? 1 : 0; out.sig3.add(hair + '|' + outfit + '|' + n);
        if (!(n > 12)) out.bad.push(hair + outfit);
      }
      const meshes = (o, h) => { let n = 0; buildKid(bag, { hair: h, outfit: o }).group.traverse((m) => { if (m.isMesh) n++; }); return n; };
      out.hairMeshes = hairs.map((h) => meshes('star', h)); out.outMeshes = outfits.map((o) => meshes(o, 'short'));
      return { ...out, sig2: out.sig2.size, sig3: out.sig3.size };
    }, { hairs: HAIR_STYLES, outfits: OUTFIT_IDS });
    const total = HAIR_STYLES.length * OUTFIT_IDS.length;
    ok(r.two === total && r.three === total && r.bad.length === 0, `render: every hair style and outfit draws in 2D and 3D (${r.two}/${r.three} of ${total})`);
    ok(r.sig2 === total, `render: every 2D combination is different (${r.sig2})`);
    ok(new Set(r.hairMeshes).size >= 6 && new Set(r.outMeshes).size >= 6, `render: the 3D figure changes with the hair and the outfit (${r.hairMeshes} | ${r.outMeshes})`);
    ok(errors.length === 0, `render: errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  // The card fits without scrolling in portrait 360 x 640 and in landscape 915 x 412, with 56 px buttons.
  for (const [w, hgt] of [[360, 640], [915, 412], [346, 690]]) {
    const { ctx, page } = await newPage(browser, { name: 'fit', width: w, height: hgt, deviceScaleFactor: 1 });
    await page.addInitScript(SPEECH_STUB);
    await page.goto(url + '#/home');
    await page.waitForSelector('.welcome'); await page.waitForTimeout(700); await page.click('.wc-skip');
    await page.waitForSelector('.cp'); await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const c = document.querySelector('.first-card'), r = c.getBoundingClientRect(), cp = document.querySelector('.cp').getBoundingClientRect();
      const small = [...document.querySelectorAll('.cp button')].filter((b) => { const q = b.getBoundingClientRect(); return q.width < 55.5 || q.height < 55.5; }).length;
      const out = [...document.querySelectorAll('.cp-done, .cp-later, .cp-name, .cp-skin, .cp-hair, .cp-hair-color, .cp-outfit')].filter((e) => { const q = e.getBoundingClientRect(); return q.top < r.top - 1 || q.bottom > r.bottom + 1 || q.left < r.left - 1 || q.right > r.right + 1; }).map((e) => e.className);
      return { top: r.top, bottom: r.bottom, vh: innerHeight, vw: innerWidth, right: r.right, scrolls: c.scrollHeight > c.clientHeight + 1, small, out, hscroll: document.documentElement.scrollWidth > innerWidth, cpw: cp.width };
    });
    ok(!m.scrolls && m.top >= 0 && m.bottom <= m.vh && m.right <= m.vw && m.small === 0 && m.out.length === 0 && !m.hscroll, `fit ${w}x${hgt}: the creator card fits with 56 px buttons (${JSON.stringify(m)})`);
    // a row with more than five choices scrolls sideways and the last choice can be reached
    await page.locator('.cp-outfit button').last().scrollIntoViewIfNeeded();
    await page.locator('.cp-outfit button').last().click();
    ok((await page.locator('.cp-outfit button').last().getAttribute('aria-pressed')) === 'true', `fit ${w}x${hgt}: the last outfit can be reached and picked`);
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
