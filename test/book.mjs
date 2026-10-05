// The book reader and Story 1: pages, the child's name, the slider, taps, the train drag, the sound page, the review,
// the finish, silence (nothing spoken, the name never sent), the landscape fit and heat.
// Run alone with `node test/book.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, touchDrag, SEEN } from './lib.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const ck = CUR.checkpoints.find((k) => k.kind === 'book');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/books', `${ck.book}.json`), 'utf8'));
const NAME = 'Lily';
const RAF_COUNTER = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const TIMER_COUNTER = () => { window.__timerCalls = 0; for (const k of ['setTimeout', 'setInterval']) { const o = window[k].bind(window); window[k] = (...a) => { window.__timerCalls++; return o(...a); }; } };
const PROPS = () => document.getAnimations().filter((a) => a.playState === 'running').map((a) => ({ props: [...new Set(a.effect ? a.effect.getKeyframes().flatMap((k) => Object.keys(k)) : [])].filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p)), inf: a.effect && a.effect.getTiming().iterations === Infinity }));
const done = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it' }]));
const seedScript = `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: done(ck.after), settings: { seenScripts: SEEN }, firstRunDone: true, character: { name: NAME } })})); }`;

export async function bookChecks({ browser, url, ok, vp = VIEWPORTS[0], shot = null }) {
  const made = await newPage(browser, vp);
  const { page, errors } = made;
  const requests = [];
  page.on('request', (r) => requests.push(r.url() + ' ' + (r.postData() || '')));
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(RAF_COUNTER);
  await page.addInitScript(TIMER_COUNTER);
  await page.addInitScript(seedScript);
  await page.goto(url + `#/checkpoint/${ck.id}`);
  await page.waitForSelector('.book-stage');
  await page.waitForTimeout(500);
  const tag = `${vp.name} book`;
  const pageNo = () => page.evaluate(() => Number(document.querySelector('.book-stage').dataset.page));
  const settled = () => page.waitForFunction(() => !document.querySelector('.book-leaf') && document.querySelector('.book').dataset.state === 'open');
  const next = async () => { const n = await pageNo(); await page.locator('.book-next').click(); await page.waitForFunction((k) => Number(document.querySelector('.book-stage').dataset.page) === k, n + 1); await settled(); await page.waitForTimeout(60); };
  const idle = async (label) => {
    await page.waitForTimeout(1000);
    const c0 = await page.evaluate(() => [window.__raf, window.__timerCalls]);
    await page.waitForTimeout(3000);
    const c1 = await page.evaluate(() => [window.__raf, window.__timerCalls]);
    const running = await page.evaluate(PROPS);
    const bad = running.filter((a) => a.props.some((p) => p !== 'transform' && p !== 'opacity'));
    ok(c1[0] - c0[0] === 0 && c1[1] - c0[1] === 0, `${tag}: idle on ${label} costs ${c1[0] - c0[0]} frames and ${c1[1] - c0[1]} timer calls`);
    ok(running.length <= 6, `${tag}: ${label} runs ${running.length} animations (at most 6)`);
    ok(bad.length === 0, `${tag}: ${label}: every idle animation is transform or opacity only (${JSON.stringify(bad)})`);
  };

  // The closed book, then open it.
  ok((await page.locator('.book[data-state="closed"]').count()) === 1 && (await page.locator('.book-cover').isVisible()), `${tag}: the book starts closed with its cover`);
  ok((await page.locator('.cover-title').innerText()) === `Pip Meets ${NAME}`, `${tag}: the cover title carries the name`);
  ok((await page.locator('.book-cover').getAttribute('aria-label')) === `Open the book: Pip Meets ${NAME}`, `${tag}: the cover says how to open it`);
  if (shot) await shot(page, 'book-cover');
  await page.locator('.book-cover').click();
  await page.waitForSelector('.book[data-state="open"]', { timeout: 1500 });
  ok(!(await page.locator('.book-cover').isVisible()), `${tag}: the cover is gone once the book is open`);

  ok((await page.locator('.dots .dot').count()) === BOOK.pages.length && BOOK.pages.length === 11, `${tag}: the dots show ${BOOK.pages.length} pages`);
  ok((await page.locator('.task-head h1').innerText()) === 'Story 1', `${tag}: titled Story 1`);
  ok((await page.locator('.book-title').innerText()) === `Pip Meets ${NAME}`, `${tag}: the title carries the name`);
  ok((await page.locator('.book[data-spread="0"]').count()) === 1 && (await page.locator('.book-sheet.is-live').count()) === 1, `${tag}: portrait shows one page`);
  ok((await page.evaluate(() => { const f = getComputedStyle(document.querySelector('.book-read')).fontFamily; return f.startsWith('Andika') && document.fonts.check('20px Andika'); })), `${tag}: the grown-up's text is set in Andika`);
  ok((await page.evaluate(() => getComputedStyle(document.querySelector('.book-block'), '::after').width)) === '7px', `${tag}: the book has a page edge`);
  ok((await page.locator('.book-folio').innerText()) === '1', `${tag}: the folio is the page number`);
  if (shot) await shot(page, 'book-page-1');
  await idle('page 1');

  // One forward turn: a leaf swings, then the clones are gone.
  await page.locator('.book-next').click();
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => { const l = document.querySelector('.book-leaf'); return !!l && getComputedStyle(l).transform !== 'none'; }), `${tag}: a leaf is turning 150 ms in`);
  if (shot) await shot(page, 'book-turn');
  await page.waitForFunction(() => !document.querySelector('.book-leaf') && Number(document.querySelector('.book-stage').dataset.page) === 1);
  await settled();
  ok((await page.locator('.book-leaf, .book-under').count()) === 0 && (await page.locator('.book-read').count()) === 1, `${tag}: after the turn the leaf and the clones are gone, one page of text remains`);
  ok((await page.locator('.book-folio').innerText()) === '2', `${tag}: the folio follows the page`);

  // Swipes: left goes on, right goes back, a short slow drag springs back.
  const sheetBox = () => page.locator('.book-sheet.is-live').first().boundingBox();
  const readY = async () => { const r = await page.locator('.book-read').boundingBox(); return r.y + r.height / 2; };
  let sb = await sheetBox(), y = await readY();
  await touchDrag(page, { x: sb.x + sb.width * 0.85, y }, { x: sb.x + sb.width * 0.15, y }, { steps: 12 });
  await page.waitForFunction(() => Number(document.querySelector('.book-stage').dataset.page) === 2); await settled();
  ok((await pageNo()) === 2, `${tag}: a swipe left turns to page 3`);
  sb = await sheetBox(); y = await readY();
  await touchDrag(page, { x: sb.x + sb.width * 0.15, y }, { x: sb.x + sb.width * 0.85, y }, { steps: 12 });
  await page.waitForFunction(() => Number(document.querySelector('.book-stage').dataset.page) === 1); await settled();
  ok((await pageNo()) === 1, `${tag}: a swipe right turns back to page 2`);
  sb = await sheetBox(); y = await readY();
  await touchDrag(page, { x: sb.x + sb.width * 0.5, y }, { x: sb.x + sb.width * 0.4, y }, { steps: 40 });
  await page.waitForTimeout(1000);
  ok((await pageNo()) === 1 && (await page.locator('.book-leaf').count()) === 0 && (await page.locator('.book[data-state="open"]').count()) === 1, `${tag}: a short slow drag springs back, page ${await pageNo() + 1}`);
  ok((await page.locator('.book-read').count()) === 1 && /station/.test(await page.locator('.book-read').innerText()), `${tag}: the page is whole after a spring back`);

  // Corners.
  await page.locator('.book-corner.next').click();
  await page.waitForFunction(() => Number(document.querySelector('.book-stage').dataset.page) === 2); await settled();
  await page.locator('.book-corner.prev').click();
  await page.waitForFunction(() => Number(document.querySelector('.book-stage').dataset.page) === 1); await settled();
  ok((await pageNo()) === 1, `${tag}: the bottom corners turn forward and back`);
  await page.locator('.book').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => Number(document.querySelector('.book-stage').dataset.page) === 2); await settled();
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => Number(document.querySelector('.book-stage').dataset.page) === 1); await settled();
  ok((await pageNo()) === 1, `${tag}: the arrow keys turn the page`);
  await page.locator('.book-back').click();
  await page.waitForFunction(() => Number(document.querySelector('.book-stage').dataset.page) === 0); await settled();
  await page.evaluate(() => window.__audioClear && window.__audioClear());

  const lens = [];
  for (let n = 0; n < BOOK.pages.length; n++) {
    const pg = BOOK.pages[n];
    ok((await pageNo()) === n, `${tag}: on page ${n + 1}`);
    const body = await page.evaluate(() => document.body.innerText);
    ok(!body.includes('{name}'), `${tag} page ${n + 1}: no {name} left in the text`);
    if (n === 1) ok(/Lily/.test(await page.locator('.book-read').innerText()), `${tag}: page 2 says Lily`);
    if (pg.child) {
      const want = [...pg.child.replace(/ /g, '')].length;
      lens.push(await page.locator('.book-child .glyph-letter').count());
      ok(lens[lens.length - 1] === want, `${tag} page ${n + 1}: ${want} drawn letters in "${pg.child}" (${lens[lens.length - 1]})`);
    }
    if (pg.sound) {
      ok(/Your child says: mmmm|Your child says: sssss/.test(await page.locator('.book-read').innerText()), `${tag} page ${n + 1}: the parent text shows the sound`);
      ok((await page.locator('.book-child').count()) === 0, `${tag} page ${n + 1}: a sound page shows only the picture`);
    }
    if (pg.slider) {
      ok((await page.locator('.slide-band').count()) === 1, `${tag} page ${n + 1}: the slide band is there`);
      if (n === 2) await idle('page 3 (the slider)');
      const row = (await page.locator('.book-word[data-slider="1"]').boundingBox());
      let lit = 0;
      await touchDrag(page, { x: row.x + 2, y: row.y + row.height / 2 }, { x: row.x + row.width + 30, y: row.y + row.height / 2 }, { steps: 14, during: async () => { lit = await page.locator('.glyph-letter.lit').count(); } });
      ok(lit > 0, `${tag} page ${n + 1}: sliding a finger across the word lights its letters (${lit})`);
      ok((await pageNo()) === n, `${tag} page ${n + 1}: sliding across the word does not turn the page`);
      if (n === 2 && shot) { await page.waitForTimeout(400); await shot(page, 'book-page-3-slider'); }
    }
    if (n === 0) {
      await page.evaluate(() => window.__audioClear && window.__audioClear());
      await page.locator('.book-tap').click({ force: true });
      await page.waitForTimeout(250);
      ok((await page.evaluate(() => window.__audioNotes().some((e) => e.event === 'toot'))), `${tag}: tapping Pip's train toots`);
      ok((await page.locator('.book-puffs .steam-puff').count()) >= 1, `${tag}: a puff of steam leaves the funnel`);
    }
    if (pg.kind === 'drag') {
      const h = await page.locator('.st-handle').boundingBox(), t = await page.locator('.slide-track').boundingBox();
      await touchDrag(page, { x: h.x + h.width / 2, y: h.y + h.height / 2 }, { x: t.x + t.width - 10, y: h.y + h.height / 2 }, { steps: 18 });
      await page.waitForTimeout(150);
      ok((await page.locator('.slide-track').getAttribute('data-done')) === '1', `${tag}: dragging the train to the end completes the track`);
      ok((await pageNo()) === n, `${tag}: dragging the train does not turn the page`);
      ok((await page.evaluate(() => window.__audioNotes().some((e) => e.event === 'toot'))), `${tag}: the train toots at the end`);
    }
    if (pg.kind === 'review') {
      ok((await page.locator('.book-tile').count()) === pg.words.length, `${tag}: ${pg.words.length} review tiles`);
      await page.locator('.book-tile').first().click();
      ok((await page.locator('.book-tile.lit').count()) === 1, `${tag}: a tapped tile lights`);
      ok((await page.locator('.task-buttons .next').innerText()).trim() === 'Finish', `${tag}: the shell's last button reads Finish`);
      if (shot) await shot(page, 'book-review');
    }
    if (n < BOOK.pages.length - 1) await next();
  }
  ok(await page.evaluate(() => { const r = document.querySelector('.book-sheet.is-live'); return r.scrollHeight <= r.clientHeight + 1; }), `${tag}: the review page fits without scrolling`);

  // Hidden tab: every animation pauses.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  ok((await page.locator('.book.is-paused').count()) === 1, `${tag}: the book pauses while the tab is hidden`);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  ok((await page.locator('.book.is-paused').count()) === 0, `${tag}: the book runs again when the tab is back`);

  // Silence: nothing was spoken, and the name went nowhere.
  ok((await page.evaluate(() => window.__spoken.length)) === 0, `${tag}: nothing was spoken (${await page.evaluate(() => window.__spoken.join('|'))})`);
  ok(!requests.some((r) => r.includes(NAME)), `${tag}: no request carries the child's name`);

  // End: Finish closes the book, then the finish screen.
  await page.locator('.task-buttons .next').click();
  await page.waitForSelector('.book[data-state="closing"]', { timeout: 1500 });
  await page.waitForFunction(() => location.hash.endsWith('/finish'), null, { timeout: 4000 });
  await page.waitForSelector('.finish');
  ok((await page.locator('.finish h1').innerText()) === "That's the end of the story.", `${tag}: the finish heading`);
  await page.waitForTimeout(1700);
  await page.locator('.got').click();
  await page.waitForTimeout(1700);
  await page.locator('.got').click();
  await page.waitForSelector('.home');
  await page.reload();
  await page.waitForTimeout(500);
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).checkpoints[Object.keys(JSON.parse(localStorage.getItem('reading.v1')).checkpoints)[0]].result)) === 'got-it', `${tag}: finishing saves got-it`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await made.ctx.close();
}

// Landscape: a two-page spread that fits without scrolling on every page, then reduced motion.
export async function bookLandscape({ browser, url, ok, shot = null }) {
  const vp = VIEWPORTS[1];
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(seedScript);
  await page.goto(url + `#/checkpoint/${ck.id}`);
  await page.waitForSelector('.book-stage');
  await page.waitForTimeout(500);
  await page.locator('.book-cover').click();
  await page.waitForSelector('.book[data-state="open"]', { timeout: 1500 });
  ok((await page.locator('.book[data-spread="1"]').count()) === 1 && (await page.locator('.book-sheet.is-live').count()) === 2, `landscape book: a spread of two pages`);
  ok((await page.locator('.book-sheet.is-left .book-read').count()) === 1 && (await page.locator('.book-sheet.is-right .book-art').count()) === 1, `landscape book: text on the left page, picture on the right`);
  if (shot) await shot(page, 'book-spread');
  for (let n = 0; n < BOOK.pages.length; n++) {
    const fits = await page.evaluate(() => [...document.querySelectorAll('.book-sheet.is-live')].map((s) => [s.scrollHeight, s.clientHeight]));
    ok(fits.every((f) => f[0] <= f[1] + 1), `landscape book page ${n + 1}: both pages fit (${JSON.stringify(fits)})`);
    if (n < BOOK.pages.length - 1) {
      await page.locator('.book-next').click();
      if (n === 0) {
        await page.waitForTimeout(150);
        ok(await page.evaluate(() => { const l = document.querySelector('.book-leaf.hinge-left'), r = document.querySelector('.book-sheet.is-right').getBoundingClientRect(); return !!l && l.offsetLeft >= document.querySelector('.book-sheet.is-right').offsetLeft - 1 && r.width > 0; }), `landscape book: a forward turn hinges at the spine over the right page`);
        if (shot) await shot(page, 'book-spread-turn');
      }
      await page.waitForFunction((k) => Number(document.querySelector('.book-stage').dataset.page) === k && !document.querySelector('.book-leaf'), n + 1);
      await page.waitForTimeout(60);
    }
  }
  ok(errors.length === 0, `landscape book: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Reduced motion: no leaf, a cross-fade, a cover that fades, nothing endless.
export async function bookReduced({ browser, url, ok }) {
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0], { reducedMotion: 'reduce' });
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(seedScript);
  await page.goto(url + `#/checkpoint/${ck.id}`);
  await page.waitForSelector('.book-stage');
  await page.waitForTimeout(500);
  await page.locator('.book-cover').click();
  await page.waitForTimeout(80);
  ok(await page.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.classList && a.effect.target.classList.contains('book-cover')).every((a) => !a.effect.getKeyframes().some((k) => k.transform && k.transform !== 'none'))), 'reduced book: the cover opens with no rotation');
  await page.waitForSelector('.book[data-state="open"]', { timeout: 1500 });
  let leaf = 0;
  await page.locator('.book-next').click();
  for (let t = 0; t < 8; t++) { leaf += await page.locator('.book-leaf').count(); await page.waitForTimeout(50); }
  await page.waitForFunction(() => Number(document.querySelector('.book-stage').dataset.page) === 1);
  ok(leaf === 0, 'reduced book: no leaf is ever made');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).length) === 0, 'reduced book: no endless animation');
  ok(errors.length === 0, `reduced book: errors ${errors.join(' | ')}`);
  await ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  fs.mkdirSync(path.join(ROOT, '_test'), { recursive: true });
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await bookChecks({ browser, url, ok });
  await bookLandscape({ browser, url, ok });
  await bookReduced({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`book: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
