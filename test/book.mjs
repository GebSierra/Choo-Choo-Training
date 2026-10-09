// The book reader and every book stop (Story 1, Story 2): pages, the child's name, the slider, taps, the train drag, the sound page, the review,
// the finish, silence (nothing spoken, the name never sent), the landscape fit and heat.
// Run alone with `node test/book.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, touchDrag, SEEN } from './lib.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const BOOKS = CUR.checkpoints.filter((k) => k.kind === 'book');
const NAME = 'Lily';
let ck, BOOK, TITLE, seedScript;
// Every check below runs once per book stop; this points the module at one of them.
function useBook(k) {
  ck = k;
  BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/books', `${k.book}.json`), 'utf8'));
  TITLE = BOOK.title.replaceAll('{name}', NAME);
  seedScript = mkSeed();
}
const RAF_COUNTER = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const TIMER_COUNTER = () => { window.__timerCalls = 0; for (const k of ['setTimeout', 'setInterval']) { const o = window[k].bind(window); window[k] = (...a) => { window.__timerCalls++; return o(...a); }; } };
const PROPS = () => document.getAnimations().filter((a) => a.playState === 'running').map((a) => ({ props: [...new Set(a.effect ? a.effect.getKeyframes().flatMap((k) => Object.keys(k)) : [])].filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p)), inf: a.effect && a.effect.getTiming().iterations === Infinity }));
const done = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it' }]));
const mkSeed = () => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: done(ck.after), settings: { seenScripts: SEEN }, firstRunDone: true, character: { name: NAME } })})); }`;

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
  ok((await page.locator('.cover-title').innerText()) === TITLE, `${tag}: the cover title carries the name`);
  ok((await page.locator('.book-cover').getAttribute('aria-label')) === `Open the book: ${TITLE}`, `${tag}: the cover says how to open it`);
  if (shot) await shot(page, 'book-cover');
  await page.locator('.book-cover').click();
  await page.waitForSelector('.book[data-state="open"]', { timeout: 1500 });
  ok(!(await page.locator('.book-cover').isVisible()), `${tag}: the cover is gone once the book is open`);

  ok((await page.locator('.dots .dot').count()) === BOOK.pages.length, `${tag}: the dots show ${BOOK.pages.length} pages`);
  ok((await page.locator('.task-head h1').innerText()) === ck.title, `${tag}: titled ${ck.title}`);
  ok((await page.locator('.book-title').innerText()) === TITLE, `${tag}: the title carries the name`);
  ok((await page.locator('.book[data-spread="0"]').count()) === 1 && (await page.locator('.book-sheet.is-live').count()) === 1, `${tag}: portrait shows one page`);
  ok((await page.evaluate(() => { const f = getComputedStyle(document.querySelector('.book-read')).fontFamily; return f.startsWith('Andika') && document.fonts.check('20px Andika'); })), `${tag}: the grown-up's text is set in Andika`);
  // (changed for the picture-book look: the 7 px page-edge check became the stacked pages behind the page, plus the paper, picture and arrow checks)
  ok((await page.evaluate(() => getComputedStyle(document.querySelector('.book-block'), '::before').boxShadow)) !== 'none', `${tag}: the next pages are stacked behind the page`);
  const look = await page.evaluate(() => {
    const sh = document.querySelector('.book-sheet.is-live'), art = sh.querySelector('.book-art'), s = sh.getBoundingClientRect(), a = art.getBoundingClientRect();
    const ar = [...sh.querySelectorAll('.book-arrow')].map((b) => { const r = b.getBoundingClientRect(); return { l: b.getAttribute('aria-label'), w: r.width, h: r.height, dis: b.disabled }; });
    return { paper: sh.classList.contains('paper'), grain: getComputedStyle(sh).backgroundImage.includes('data:image/svg'), top: Math.abs(a.top - s.top) < 1.5, wide: Math.abs(a.width - s.width) < 1.5, frac: a.height / s.height, ar,
      tint: getComputedStyle(document.querySelector('.task-stage')).backgroundImage, sc: !!art.querySelector('.book-scene svg'), cyan: getComputedStyle(document.querySelector('.task-stage')).boxShadow };
  });
  ok(look.paper && look.grain, `${tag}: the page is paper with a texture`);
  ok(look.top && look.wide && look.frac >= 0.35 && look.frac <= 0.62 && look.sc, `${tag}: the picture is full-bleed across the top of the page with a scene (${look.frac.toFixed(2)})`);
  ok(look.tint === 'none' && look.cyan === 'none', `${tag}: no coloured app card around the book`);
  ok(look.ar.length === 2 && look.ar.find((a) => a.l === 'Next page' && a.w >= 48 && a.h >= 48) && look.ar.find((a) => a.l === 'Previous page' && a.dis), `${tag}: the arrows are labelled, at least 48 px; Previous is off on page 1 (${JSON.stringify(look.ar)})`);
  ok((await page.locator('.book-corner.next').boundingBox()).width >= 48, `${tag}: the folded corner is a real touch target`);
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
  ok((await page.locator('.book-read').count()) === 1 && (await page.locator('.book-read').innerText()).includes(BOOK.pages[1].read.slice(0, 14)), `${tag}: the page is whole after a spring back`);

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

  const firstSlider = BOOK.pages.findIndex((p) => p.slider);
  const lens = [];
  for (let n = 0; n < BOOK.pages.length; n++) {
    const pg = BOOK.pages[n];
    ok((await pageNo()) === n, `${tag}: on page ${n + 1}`);
    const body = await page.evaluate(() => document.body.innerText);
    ok(!body.includes('{name}'), `${tag} page ${n + 1}: no {name} left in the text`);
    if (/\{name\}/.test(pg.read)) ok(/Lily/.test(await page.locator('.book-read').innerText()), `${tag}: page ${n + 1} says Lily`);
    if (pg.child) {
      const want = [...pg.child.replace(/ /g, '')].length;
      lens.push(await page.locator('.book-child .glyph-letter').count());
      ok(lens[lens.length - 1] === want, `${tag} page ${n + 1}: ${want} drawn letters in "${pg.child}" (${lens[lens.length - 1]})`);
    }
    if (pg.sound) {
      ok((await page.locator('.book-read').innerText()).includes(`Your child says: ${pg.sound}`), `${tag} page ${n + 1}: the parent text shows the sound`);
      ok((await page.locator('.book-child').count()) === 0, `${tag} page ${n + 1}: a sound page shows only the picture`);
    }
    if (pg.slider) {
      ok((await page.locator('.slide-band').count()) === 1, `${tag} page ${n + 1}: the slide band is there`);
      if (n === firstSlider) await idle(`page ${n + 1} (the slider)`);
      const row = (await page.locator('.book-word[data-slider="1"]').boundingBox());
      let lit = 0;
      await touchDrag(page, { x: row.x + 2, y: row.y + row.height / 2 }, { x: row.x + row.width + 30, y: row.y + row.height / 2 }, { steps: 14, during: async () => { lit = await page.locator('.glyph-letter.lit').count(); } });
      ok(lit > 0, `${tag} page ${n + 1}: sliding a finger across the word lights its letters (${lit})`);
      ok((await pageNo()) === n, `${tag} page ${n + 1}: sliding across the word does not turn the page`);
      if (n === firstSlider && shot) { await page.waitForTimeout(400); await shot(page, `book-page-${n + 1}-slider`); }
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

// Fit: every page of the book lies fully inside its page at the phone sizes that matter: the Back and Next page buttons, the
// child's word box and every word in it. The picture shrinks first, then the word steps down; the word stays the biggest text.
export const FIT_SIZES = [[346, 690], [360, 640], [375, 667], [390, 844], [412, 780], [412, 915], [915, 412], [844, 390]];
export async function bookFit({ browser, url, ok, sizes = FIT_SIZES, shot = null, extraSeed = null }) {
  for (const [w, hgt] of sizes) {
    const { ctx, page, errors } = await newPage(browser, { name: 'fit', width: w, height: hgt, deviceScaleFactor: 1 });
    await page.addInitScript(SPEECH_STUB);
    await page.addInitScript(extraSeed || seedScript);
    await page.goto(url + `#/checkpoint/${ck.id}`);
    await page.waitForSelector('.book-stage');
    await page.waitForTimeout(400);
    await page.locator('.book-cover').click();
    await page.waitForSelector('.book[data-state="open"]', { timeout: 1500 });
    const tag = `fit ${w}x${hgt}`;
    const bad = [];
    for (let n = 0; n < BOOK.pages.length; n++) {
      await page.waitForFunction((k) => Number(document.querySelector('.book-stage').dataset.page) === k && !document.querySelector('.book-leaf'), n);
      await page.waitForTimeout(80);
      const m = await page.evaluate(() => {
        const inside = (el, box, why) => { const r = el.getBoundingClientRect(), b = box.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= b.top - 1 && r.bottom <= b.bottom + 1 && r.left >= b.left - 1 && r.right <= b.right + 1 ? null : `${why} ${[r.left, r.top, r.right, r.bottom].map(Math.round)} not in ${[b.left, b.top, b.right, b.bottom].map(Math.round)}`; };
        const out = [];
        const view = { getBoundingClientRect: () => ({ left: 0, top: 0, right: innerWidth, bottom: innerHeight }) };
        for (const sel of ['.book-back', '.book-next', '.book-child', '.book-child .glyph-row', '.book-read', '.book-read p', '.book-art']) {
          for (const el of document.querySelectorAll(`.book-sheet.is-live ${sel}`)) {
            const sheet = el.closest('.book-sheet'), why = inside(el, sheet, sel) || inside(el, view, sel + ' (screen)');
            if (why) out.push(why);
          }
        }
        for (const s of document.querySelectorAll('.book-sheet.is-live')) if (s.scrollHeight > s.clientHeight + 1) out.push(`sheet scrolls ${s.scrollHeight} > ${s.clientHeight}`);
        for (const b of document.querySelectorAll('.book-sheet.is-live .book-arrow:not([disabled])')) { const r = b.getBoundingClientRect(); if (r.width < 47.5 || r.height < 47.5) out.push('arrow under 48 px'); if (!b.getAttribute('aria-label')) out.push('arrow without a label'); }
        const next = document.querySelector('.task-buttons .next'); if (next) { const r = next.getBoundingClientRect(); if (r.bottom > innerHeight + 1 || r.top < 0) out.push('Finish/Skip button off screen'); }
        const fsz = Math.max(0, ...[...document.querySelectorAll('.book-sheet.is-live .book-read p')].map((p) => parseFloat(getComputedStyle(p).fontSize)));
        const kids = [...document.querySelectorAll('.book-sheet.is-live .book-child svg')].map((s) => s.getBoundingClientRect().height);
        const art = document.querySelector('.book-sheet.is-live .book-art');
        return { out, fsz, minKid: kids.length ? Math.min(...kids) : null, art: art ? art.getBoundingClientRect().height : null, hasNext: !!document.querySelector('.book-sheet.is-live .book-next'), hasBack: !!document.querySelector('.book-sheet.is-live .book-back') };
      });
      for (const o of m.out) bad.push(`page ${n + 1}: ${o}`);
      if (!m.hasBack) bad.push(`page ${n + 1}: no Back button`);
      if (n < BOOK.pages.length - 1 && !m.hasNext) bad.push(`page ${n + 1}: no Next page button`);
      if (m.minKid !== null && !(m.minKid > m.fsz * 1.4)) bad.push(`page ${n + 1}: the child's word (${Math.round(m.minKid)} px) is not clearly bigger than the text (${m.fsz} px)`);
      if (m.art !== null && m.art < 48) bad.push(`page ${n + 1}: the picture is squeezed to ${Math.round(m.art)} px`);
      if (shot && n === 3) await shot(page, `fit-${w}x${hgt}-page-4`);
      if (n < BOOK.pages.length - 1) await page.locator('.book-next').click();
    }
    ok(bad.length === 0, `${tag}: every page fits inside the page, nav and child's word whole (${bad.slice(0, 4).join(' ; ')}${bad.length > 4 ? ` ... ${bad.length} problems` : ''})`);
    ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// The grown-up page before the book: once per book, "i" brings it back, and the book screen has no script bar.
export async function bookIntro({ browser, url, ok, shotDir = null }) {
  const seen = { ...SEEN }; delete seen[`storyIntro:${ck.id}`];
  const seed = `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: done(ck.after), settings: { seenScripts: seen }, firstRunDone: true, meetDue: false, character: { name: NAME } })})); }`;
  const BULLETS = ['You read the small words out loud.', 'Your child reads the big words. They use only sounds your child knows.', 'Under some words is a slider. Have your child slide a finger along it while saying each sound, then say the whole word.', 'Tap the pictures to make them move.', 'Swipe or tap the corner to turn the page.'];
  for (const [w, hh] of [[346, 690], [915, 412]]) {
    const { ctx, page, errors } = await newPage(browser, { name: 'intro', width: w, height: hh, deviceScaleFactor: 2 });
    await page.addInitScript(SPEECH_STUB); await page.addInitScript(seed);
    await page.goto(url + `#/checkpoint/${ck.id}`);
    await page.waitForSelector('.book-intro'); await page.waitForTimeout(700);
    const tag = `book intro ${w}x${hh}`;
    ok((await page.locator('.book-intro h2').innerText()) === 'Story time', `${tag}: the first open shows "Story time"`);
    ok(JSON.stringify(await page.locator('.book-intro li').allInnerTexts()) === JSON.stringify(BULLETS), `${tag}: the five bullets, word for word`);
    ok((await page.locator('.book-intro-go').innerText()) === 'Open the book', `${tag}: the button reads Open the book`);
    const f = await page.evaluate(() => { const k = document.querySelector('.book-intro .ride-intro-card'), r = k.getBoundingClientRect(); return { ok: r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth && k.scrollHeight <= k.clientHeight + 1, r: [r.top, r.bottom, innerHeight, k.scrollHeight, k.clientHeight] }; });
    ok(f.ok, `${tag}: the intro fits whole ${JSON.stringify(f.r)}`);
    ok((await page.locator('.script-wrap, .script-bar, .script-toggle, .script-card').count()) === 0, `${tag}: no "Say this" bar in the book screen`);
    ok((await page.locator('.task-buttons .again').count()) === 0 && (await page.locator('.task-buttons .next').count()) === 1, `${tag}: no Again button; Skip/Finish stays to record progress`);
    if (shotDir && w === 346) await page.screenshot({ path: path.join(shotDir, 'story-intro.png') });
    await page.locator('.book-intro-go').click();
    await page.waitForSelector('.book[data-state="open"]', { timeout: 2500 });
    ok((await page.locator('.book-intro').count()) === 0, `${tag}: Open the book closes the intro and opens the book`);
    await page.reload(); await page.waitForSelector('.book-stage'); await page.waitForTimeout(700);
    ok((await page.locator('.book-intro').count()) === 0 && (await page.locator('.book[data-state="closed"]').count()) === 1, `${tag}: the second open has no intro`);
    ok((await page.locator('.book-info').isVisible()) && (await page.locator('.book-info').innerText()) === 'i', `${tag}: a small "i" sits on the cover`);
    const ib = await page.locator('.book-info').boundingBox(); ok(ib.width >= 44 && ib.height >= 44, `${tag}: the "i" is a real tap target (${ib.width}x${ib.height})`);
    if (shotDir && w === 346) await page.screenshot({ path: path.join(shotDir, 'story-cover-i.png') });
    await page.locator('.book-info').click();
    await page.waitForSelector('.book-intro');
    ok((await page.locator('.book-intro h2').innerText()) === 'Story time', `${tag}: "i" reopens the intro`);
    await page.locator('.book-intro-go').click();
    await page.waitForSelector('.book[data-state="open"]', { timeout: 2500 });
    ok((await page.locator('.book-info').isHidden()), `${tag}: the "i" is gone once the book is open`);
    ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
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
  for (const [bi, k] of BOOKS.entries()) {
    useBook(k);
    const first = bi === 0; // the v185 screenshots are only re-rendered for the first book
    await bookChecks({ browser, url, ok });
    await bookLandscape({ browser, url, ok });
    await bookFit({ browser, url, ok, shot: first ? async (pg, n) => { if (n === 'fit-346x690-page-4') await pg.screenshot({ path: path.join(ROOT, 'docs/screenshots/v185/book-346x690-page-4.png') }); } : null });
    await bookIntro({ browser, url, ok, shotDir: first ? path.join(ROOT, 'docs/screenshots/v185') : null });
    await bookReduced({ browser, url, ok });
  }
  await browser.close(); server.close();
  console.log(`book: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
