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
const done = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it' }]));
const seedScript = `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: done(ck.after), settings: { seenScripts: SEEN }, firstRunDone: true, character: { name: NAME } })})); }`;

export async function bookChecks({ browser, url, ok, vp = VIEWPORTS[0], shot = null }) {
  const made = await newPage(browser, vp);
  const { page, errors } = made;
  const requests = [];
  page.on('request', (r) => requests.push(r.url() + ' ' + (r.postData() || '')));
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(RAF_COUNTER);
  await page.addInitScript(seedScript);
  await page.goto(url + `#/checkpoint/${ck.id}`);
  await page.waitForSelector('.book-stage');
  await page.waitForTimeout(500);
  const tag = `${vp.name} book`;
  const pageNo = () => page.evaluate(() => Number(document.querySelector('.book-stage').dataset.page));
  const next = async () => { const n = await pageNo(); await page.locator('.book-next').click(); await page.waitForFunction((k) => Number(document.querySelector('.book-stage').dataset.page) === k, n + 1); await page.waitForTimeout(260); };

  ok((await page.locator('.dots .dot').count()) === BOOK.pages.length && BOOK.pages.length === 11, `${tag}: the dots show ${BOOK.pages.length} pages`);
  ok((await page.locator('.task-head h1').innerText()) === 'Story 1', `${tag}: titled Story 1`);
  ok((await page.locator('.book-title').innerText()) === `Pip Meets ${NAME}`, `${tag}: the title carries the name`);
  if (shot) await shot(page, 'book-page-1');

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
      ok(/Your child says: mmmm|Your child says: sssss/.test(await page.locator('.book-read').innerText()), `${tag} page ${n + 1}: the parent card shows the sound`);
      ok((await page.locator('.book-child').count()) === 0, `${tag} page ${n + 1}: a sound page shows only the picture`);
    }
    if (pg.slider) {
      ok((await page.locator('.slide-band').count()) === 1, `${tag} page ${n + 1}: the slide band is there`);
      const row = (await page.locator('.book-word[data-slider="1"]').boundingBox());
      let lit = 0;
      await touchDrag(page, { x: row.x + 2, y: row.y + row.height / 2 }, { x: row.x + row.width + 30, y: row.y + row.height / 2 }, { steps: 14, during: async () => { lit = await page.locator('.glyph-letter.lit').count(); } });
      ok(lit > 0, `${tag} page ${n + 1}: sliding a finger across the word lights its letters (${lit})`);
      if (n === 2 && shot) { await page.waitForTimeout(400); await shot(page, 'book-page-3-slider'); }
    }
    if (n === 0) {
      await page.evaluate(() => window.__audioClear && window.__audioClear());
      await page.locator('.book-tap').click();
      await page.waitForTimeout(250);
      ok((await page.evaluate(() => window.__audioNotes().some((e) => e.event === 'toot'))), `${tag}: tapping Pip's train toots`);
      ok((await page.locator('.book-puffs .steam-puff').count()) >= 1, `${tag}: a puff of steam leaves the funnel`);
    }
    if (pg.kind === 'drag') {
      const h = await page.locator('.st-handle').boundingBox(), t = await page.locator('.slide-track').boundingBox();
      await touchDrag(page, { x: h.x + h.width / 2, y: h.y + h.height / 2 }, { x: t.x + t.width - 10, y: h.y + h.height / 2 }, { steps: 18 });
      await page.waitForTimeout(150);
      ok((await page.locator('.slide-track').getAttribute('data-done')) === '1', `${tag}: dragging the train to the end completes the track`);
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
  ok(await page.evaluate(() => { const r = document.querySelector('.book-stage'); return r.scrollHeight <= r.clientHeight + 1; }), `${tag}: the review page fits without scrolling`);

  // Heat: a page idle for 3 s uses at most 2 animation frames and has no endless animation.
  await page.locator('.book-back').click(); await page.waitForTimeout(500);
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(3000);
  const frames = (await page.evaluate(() => window.__raf)) - r0;
  const endless = await page.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming().iterations === Infinity).length);
  ok(frames <= 2 && endless === 0, `${tag}: idle on a page costs ${frames} frames and ${endless} endless animations`);

  // Silence: nothing was spoken, and the name went nowhere.
  ok((await page.evaluate(() => window.__spoken.length)) === 0, `${tag}: nothing was spoken (${await page.evaluate(() => window.__spoken.join('|'))})`);
  ok(!requests.some((r) => r.includes(NAME)), `${tag}: no request carries the child's name`);

  // Finish: two taps, then the result is saved.
  await page.goto(url + `#/checkpoint/${ck.id}/finish`);
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

// Landscape: the stage must fit without scrolling on every page.
export async function bookLandscape({ browser, url, ok }) {
  const vp = VIEWPORTS[1];
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(seedScript);
  await page.goto(url + `#/checkpoint/${ck.id}`);
  await page.waitForSelector('.book-stage');
  await page.waitForTimeout(500);
  for (let n = 0; n < BOOK.pages.length; n++) {
    const fits = await page.evaluate(() => { const r = document.querySelector('.book-stage'); return [r.scrollHeight, r.clientHeight]; });
    ok(fits[0] <= fits[1] + 1, `landscape book page ${n + 1}: fits (${fits[0]} of ${fits[1]})`);
    const over = await page.evaluate(() => [...document.querySelectorAll('.book-stage > *')].some((e) => { const s = document.querySelector('.book-stage').getBoundingClientRect(), r = e.getBoundingClientRect(); return e.classList.contains('slide-band') ? false : r.bottom > s.bottom + 1 || r.right > s.right + 1; }));
    ok(!over, `landscape book page ${n + 1}: nothing leaves the stage`);
    if (n < BOOK.pages.length - 1) { await page.locator('.book-next').click(); await page.waitForTimeout(280); }
  }
  ok(errors.length === 0, `landscape book: errors ${errors.join(' | ')}`);
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
  await browser.close(); server.close();
  console.log(`book: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
