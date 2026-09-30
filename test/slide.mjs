// Sliding a finger across a word: Saying Sounds (letters, picture words once revealed) and Saying Words (the revealed
// word and its picture). Real touch through the browser, many trials with awkward starting points and vertical drift.
// Run alone with `node test/slide.mjs`, or as part of test/smoke.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { audit } from './audit.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, touchSession, SEEN } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

const SEED = `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[],result:'got-it'},2:{tasksDone:[],result:'got-it'}},settings:{seenScripts:${JSON.stringify(SEEN)}},firstRunDone:true}))`;
const plain = (page) => page.evaluate(() => ({ clips: window.__events.filter((e) => e.type === 'clip').length, tts: window.__events.filter((e) => e.type === 'tts').length }));
const lit = (page) => page.evaluate(() => document.querySelectorAll('.glyph-letter.lit').length);
const scrolled = (page) => page.evaluate(() => document.querySelector('.task-activity').scrollTop + scrollY);
// The wash over a picture: how far the full-colour layer is uncovered (0 to 1), or null when there is no wash.
const wash = (page) => page.evaluate(() => { const b = document.querySelector('.emoji.bright'); if (!b) return null; const m = b.style.clipPath.match(/inset\(0(?:px)? ([\d.]+)%/); return m ? 1 - Number(m[1]) / 100 : 1; });
const sparks = (page) => page.evaluate(() => document.querySelectorAll('.spark').length);

// Letter edges in screen pixels and the word's vertical centre, from the word's own svg.
const geometry = (page) => page.evaluate(() => {
  const svg = document.querySelector('.word-glyphs'), r = svg.getBoundingClientRect(), k = r.width / Number(svg.dataset.width);
  const band = document.querySelector('.slide-band').getBoundingClientRect();
  return {
    edges: [...svg.querySelectorAll('.glyph-letter')].map((g) => ({ l: r.left + Number(g.dataset.x0) * k, r: r.left + Number(g.dataset.x1) * k })),
    cy: r.top + r.height / 2,
    band: { l: band.left, r: band.right, t: band.top, b: band.bottom, w: band.width, h: band.height },
  };
});

async function open(browser, url, vp, lessonNo, type, extra) {
  const made = await newPage(browser, vp, extra);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(SEED);
  const cur = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
  const L = cur.lessons[lessonNo - 1];
  await made.page.goto(url + `#/lesson/${lessonNo}/task/${tasksFor(L).find((t) => t.type === type).index}`);
  await made.page.waitForSelector('.task-screen');
  await made.page.waitForTimeout(900);
  await made.page.evaluate(() => { window.__cancels = 0; document.addEventListener('pointercancel', () => { window.__cancels++; }, true); });
  made.lesson = L;
  return made;
}

// Ten slides with different starting points and a vertical wobble of up to 40 px. Every one must light the letters
// monotonically all the way to the end, with a sparkle, without the stage scrolling or the browser cancelling the touch.
async function trials({ page, ok, tag, n = 10, shot }) {
  let good = 0, why = [];
  const plainBefore = await plain(page);
  for (let i = 0; i < n; i++) {
    const g = await geometry(page), count = g.edges.length, first = g.edges[0], last = g.edges[count - 1];
    const off = Math.min(45, g.band.h / 2 - 14);
    const starts = [
      { x: g.band.l + 8, y: g.cy, what: 'left of the word' },
      { x: (first.l + first.r) / 2, y: g.cy, what: 'on the first letter' },
      { x: first.l - 10, y: g.cy - off, what: 'above the word' },
      { x: first.l - 10, y: g.cy + off, what: 'below the word' },
      { x: (g.edges[Math.floor(count / 2)].l + g.edges[Math.floor(count / 2)].r) / 2, y: g.cy, what: 'in the middle of the word' },
    ];
    const s = starts[i % starts.length], drift = i % 2 ? 40 : -40, steps = 10, x1 = last.r + 14;
    const t = await touchSession(page);
    await t.start(s.x, s.y);
    const lits = [], washes = [];
    let sparked = 0;
    for (let k = 1; k <= steps; k++) {
      const f = k / steps;
      await t.move(s.x + (x1 - s.x) * f, s.y + Math.sin(f * Math.PI * 2) * drift);
      await page.waitForTimeout(28);
      lits.push(await lit(page));
      const w = await wash(page); if (w !== null) washes.push(w);
      if (shot && i === 0 && k === 6) await shot(page, 'mid');
    }
    sparked = await sparks(page);
    const scroll = await scrolled(page), cancels = await page.evaluate(() => window.__cancels);
    await t.end();
    const mono = lits.every((v, j) => !j || v >= lits[j - 1]) && washes.every((v, j) => !j || v >= washes[j - 1] - 0.001);
    const pass = mono && lits[lits.length - 1] === count && sparked > 0 && scroll === 0 && cancels === 0 && (!washes.length || washes[washes.length - 1] > 0.95);
    await page.waitForTimeout(950); // the lit word holds 700 ms, then resets
    const reset = (await lit(page)) === 0 && ((await wash(page)) ?? 0) === 0;
    if (pass && reset) good++; else why.push(`#${i + 1} ${s.what}: lit ${lits.join(',')} of ${count}, sparks ${sparked}, scroll ${scroll}, cancels ${cancels}, reset ${reset}`);
  }
  ok(good === n, `${tag}: ${good} of ${n} slides worked${why.length ? ' (' + why.join(' | ') + ')' : ''}`);
  const after = await plain(page);
  ok(after.clips === plainBefore.clips && after.tts === plainBefore.tts, `${tag}: no sound or speech while sliding`);
}

// One slow pass lighting the letters one at a time (and the wash following), then backwards.
async function letterByLetter({ page, ok, tag }) {
  const g = await geometry(page), n = g.edges.length, y = g.cy;
  const t = await touchSession(page);
  await t.start(g.band.l + 8, y);
  await t.move(g.band.l + 20, y);
  const counts = [], washes = [];
  for (let i = 0; i < n; i++) {
    await t.move(g.edges[i].l + 4, y);
    await page.waitForTimeout(80);
    counts.push(await lit(page));
    const w = await wash(page); if (w !== null) washes.push(w);
  }
  ok(JSON.stringify(counts) === JSON.stringify(Array.from({ length: n }, (_, i) => i + 1)), `${tag}: the lit count goes 1 to ${n} letter by letter (${counts.join(', ')})`);
  if (washes.length) ok(washes.every((v, j) => !j || v >= washes[j - 1]) && washes[washes.length - 1] > washes[0], `${tag}: the picture wash follows the finger (${washes.map((v) => v.toFixed(2)).join(', ')})`);
  await t.move(g.edges[0].l + 4, y);
  await page.waitForTimeout(120);
  ok((await lit(page)) === 1, `${tag}: dragging back un-lights the later letters`);
  await t.move(g.band.l + 20, y);
  await page.waitForTimeout(120);
  ok((await lit(page)) === 0 && ((await wash(page)) ?? 0) === 0, `${tag}: and all the way back dims the picture too`);
  await t.end();
}

export async function pictureWordSlideChecks({ browser, url, ok, vp, shot }) {
  const { ctx, page, errors, lesson } = await open(browser, url, vp, 1, 'sounds');
  const pics = lesson.sayingSounds.filter((w) => !w.showLetters);
  const first = lesson.sayingSounds.findIndex((w) => !w.showLetters);
  for (let i = 0; i < first; i++) await page.click('.btn.ghost.small');
  ok((await page.locator('.slide-band').count()) === 0 && (await page.locator('.glyph-letter').count()) === 0, `${vp.name}: a picture word shows no letters before the tap`);
  for (let w = 0; w < pics.length; w++) {
    const tag = `${vp.name} picture word "${pics[w].word}"`;
    if (w > 0) { await page.click('.btn.ghost.small'); await page.waitForTimeout(500); }
    await page.touchscreen.tap(...(await page.locator('.sounds-stage .pic-frame').boundingBox().then((b) => [b.x + b.width / 2, b.y + b.height / 2])));
    await page.waitForSelector('.slide-band');
    await page.waitForTimeout(600);
    ok((await page.locator('.glyph-letter').count()) === pics[w].word.length && await page.evaluate(() => document.querySelector('.sounds-stage').classList.contains('revealed')), `${tag}: a tap reveals its letters as a row`);
    ok((await page.evaluate(() => document.querySelector('.glyph-row .sweep').getAnimations().length)) > 0, `${tag}: the demonstration sweep runs until the first touch`);
    const g = await geometry(page);
    ok(g.band.h >= 139 || g.band.h >= (await page.evaluate(() => document.querySelector('.sounds-stage').getBoundingClientRect().height)) - 1, `${tag}: the slide band is at least 140 px tall (${Math.round(g.band.h)}) and as wide as the card (${Math.round(g.band.w)})`);
    const audited = await audit(page, tag);
    ok(audited.length === 0, audited.join(' | '));
    await letterByLetter({ page, ok, tag });
    await trials({ page, ok, tag, n: w === 0 ? 10 : 3, shot: w === 0 ? shot : null });
    // The letters light in the lesson's colour, taught or not (the m glyph and the font's o and p alike).
    const colours = await page.evaluate(() => { const t = document.querySelectorAll('.glyph-letter'); return [...t].map((g) => g.style.getPropertyValue('--accent')); });
    ok(new Set(colours).size === 1, `${tag}: every letter lights in the one lesson colour (${[...new Set(colours)].join(',')})`);
  }
  await page.click('.btn.again');
  await page.waitForTimeout(500);
  ok((await page.locator('.slide-band').count()) === 0 && (await page.locator('.glyph-letter').count()) === 0, `${vp.name}: Again goes back to the picture alone`);
  ok(errors.length === 0, `${vp.name} picture word slide: errors ${errors.join(' | ')}`);
  await ctx.close();
}

export async function lettersSlideChecks({ browser, url, ok, vp, lessonNo }) {
  const { ctx, page, errors, lesson } = await open(browser, url, vp, lessonNo, 'sounds');
  const tag = `${vp.name} letters "${lesson.sayingSounds[0].word}" L${lessonNo}`;
  const g = await geometry(page);
  ok(g.band.h >= 139 || g.band.h >= (await page.evaluate(() => document.querySelector('.sounds-stage').getBoundingClientRect().height)) - 1, `${tag}: the slide band is at least 140 px tall (${Math.round(g.band.h)})`);
  await trials({ page, ok, tag, n: 10 });
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

export async function wordsSlideChecks({ browser, url, ok, vp, lessonNo, shot }) {
  const { ctx, page, errors, lesson } = await open(browser, url, vp, lessonNo, 'words');
  const tag = `${vp.name} Saying Words "${lesson.sayingWords[0].word}" L${lessonNo}`;
  ok((await page.locator('.slide-band').count()) === 0, `${tag}: nothing to slide before the parts are put together`);
  const merged = await page.locator('.merged-tile').boundingBox();
  await page.touchscreen.tap(merged.x + merged.width / 2, merged.y + merged.height / 2);
  await page.waitForSelector('.slide-band');
  await page.waitForTimeout(900);
  ok((await page.evaluate(() => document.querySelector('.merged-tile').classList.contains('revealed'))) && (await page.locator('.glyph-letter').count()) === lesson.sayingWords[0].word.length, `${tag}: a tap reveals the word as letters`);
  ok((await wash(page)) === 0, `${tag}: the picture starts dimmed`);
  const g = await geometry(page);
  ok(g.band.h >= 139 || g.band.h >= (await page.evaluate(() => document.querySelector('.words-task').getBoundingClientRect().height)) - 1, `${tag}: the slide band is at least 140 px tall (${Math.round(g.band.h)}) and wide (${Math.round(g.band.w)})`);
  const audited = await audit(page, tag);
  ok(audited.length === 0, audited.join(' | '));
  await letterByLetter({ page, ok, tag });
  await trials({ page, ok, tag, n: 10, shot });
  // The word is spoken again by a tap on it, and Again puts everything back.
  const spokenBefore = (await plain(page)).tts;
  const g2 = await geometry(page);
  await page.touchscreen.tap((g2.edges[0].l + g2.edges[g2.edges.length - 1].r) / 2, g2.cy);
  await page.waitForTimeout(500);
  ok((await plain(page)).tts === spokenBefore + 1, `${tag}: a tap on the revealed word says it again`);
  await page.click('.btn.again');
  await page.waitForTimeout(600);
  ok((await page.locator('.slide-band').count()) === 0 && !(await page.evaluate(() => document.querySelector('.merged-tile').classList.contains('revealed'))), `${tag}: Again puts the parts back`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Reduced motion: the lighting and the wash are state only; nothing lifts.
export async function slideReducedChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  let made = await open(browser, url, vp, 1, 'words', { reducedMotion: 'reduce' });
  let { page, errors } = made;
  const m = await page.locator('.merged-tile').boundingBox();
  await page.touchscreen.tap(m.x + m.width / 2, m.y + m.height / 2);
  await page.waitForSelector('.slide-band');
  await page.waitForTimeout(400);
  const g = await geometry(page), n = g.edges.length;
  const t = await touchSession(page);
  await t.start(g.band.l + 8, g.cy);
  await t.move(g.band.l + 20, g.cy);
  await t.move((g.edges[1].l + g.edges[1].r) / 2, g.cy);
  await page.waitForTimeout(150);
  ok((await lit(page)) >= 2 && (await wash(page)) > 0, 'reduced motion: Saying Words still lights letters and the wash');
  await t.move(g.edges[n - 1].r + 14, g.cy);
  await page.waitForTimeout(150);
  ok((await page.evaluate(() => document.querySelector('.merged-tile').getAnimations().filter((a) => a.effect && a.effect.getTiming().duration > 0).length)) === 0, 'reduced motion: the word does not lift');
  await t.end();
  ok(errors.length === 0, 'reduced motion words slide: errors ' + errors.join(' | '));
  await made.ctx.close();
  made = await open(browser, url, vp, 1, 'sounds', { reducedMotion: 'reduce' });
  page = made.page; errors = made.errors;
  await page.touchscreen.tap(...(await page.locator('.sounds-stage .pic-frame').boundingBox().then((b) => [b.x + b.width / 2, b.y + b.height / 2])));
  await page.waitForSelector('.slide-band');
  await page.waitForTimeout(400);
  const g2 = await geometry(page);
  const t2 = await touchSession(page);
  await t2.start(g2.band.l + 8, g2.cy);
  await t2.move(g2.band.l + 20, g2.cy);
  await t2.move(g2.edges[1].l + 6, g2.cy);
  await page.waitForTimeout(150);
  ok((await lit(page)) >= 2, 'reduced motion: a picture word still lights its letters');
  ok((await page.evaluate(() => getComputedStyle(document.querySelector('.glyph-letter.current .glyph-pop')).transform)) === 'none', 'reduced motion: the current letter does not scale');
  await t2.end();
  ok(errors.length === 0, 'reduced motion picture slide: errors ' + errors.join(' | '));
  await made.ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  fs.mkdirSync(path.join(ROOT, '_test'), { recursive: true });
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  const only = process.argv[2];
  for (const vp of VIEWPORTS) {
    if (!only || only === 'letters') for (const lessonNo of [2, 3]) await lettersSlideChecks({ browser, url, ok, vp, lessonNo });
    if (!only || only === 'picture') await pictureWordSlideChecks({ browser, url, ok, vp });
    if (!only || only === 'words') for (const lessonNo of [1, 2]) await wordsSlideChecks({ browser, url, ok, vp, lessonNo });
  }
  if (!only || only === 'reduced') await slideReducedChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`slide: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
