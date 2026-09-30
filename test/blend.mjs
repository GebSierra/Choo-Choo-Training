// Saying Sounds, slide to blend: a real touch drag across the word lights the letters one by one.
// Run alone with `node test/blend.mjs`, or as part of test/smoke.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { audit } from './audit.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, touchSession } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

const SEED = `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[],result:'got-it'},2:{tasksDone:[],result:'got-it'}},settings:{},firstRunDone:true}))`;
const plain = (page) => page.evaluate(() => ({ clips: window.__events.filter((e) => e.type === 'clip').length, tts: window.__events.filter((e) => e.type === 'tts').length }));
const litCount = (page) => page.evaluate(() => document.querySelectorAll('.glyph-letter.lit').length);
const sparks = (page) => page.evaluate(() => document.querySelectorAll('.sounds-stage .spark').length);
const barScale = (page) => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.blend-bar i')).transform).a);
const scrolled = (page) => page.evaluate(() => document.querySelector('.task-activity').scrollTop + scrollY);

// Screen-pixel edges of each letter, measured from the glyphs themselves (not from the component's maths).
const rowLeft = (page) => page.evaluate(() => document.querySelector('.glyph-row').getBoundingClientRect().left);
const edges = (page) => page.evaluate(() => {
  const svg = document.querySelector('.word-glyphs'), k = svg.getBoundingClientRect().width / Number(svg.dataset.width), half = 5.75 * k; // half the stroke width
  return [...document.querySelectorAll('.glyph-letter .glyph-pop')].map((e) => { const r = e.getBoundingClientRect(); return { l: r.left - half, r: r.right + half, y: r.top + r.height / 2 }; });
});

async function visit(browser, url, vp, lessonNo, extra) {
  const made = await newPage(browser, vp, extra);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(SEED);
  const cur = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
  const L = cur.lessons[lessonNo - 1];
  const idx = tasksFor(L).find((t) => t.type === 'sounds').index;
  await made.page.goto(url + `#/lesson/${lessonNo}/task/${idx}`);
  await made.page.waitForSelector('.glyph-letter');
  await made.page.waitForTimeout(900);
  made.word = L.sayingSounds[0].word;
  return made;
}

export async function blendChecks({ browser, url, ok, vp, lessonNo, shot }) {
  const { ctx, page, errors, word } = await visit(browser, url, vp, lessonNo);
  const tag = `${vp.name} blend "${word}" L${lessonNo}`;
  const n = [...word].length;
  const L = await edges(page);
  ok(L.length === n && L.every((e) => e.r > e.l), `${tag}: every letter is a glyph with edges (${n})`);
  ok((await page.evaluate(() => document.querySelector('.glyph-row').getAnimations().length + document.querySelector('.sweep').getAnimations().length)) > 0, `${tag}: the sweep demonstration runs before a touch`);
  const y = L[0].y, stage = page.locator('.sounds-stage');
  const before = await plain(page);
  const x0 = (await rowLeft(page)) + 4;
  const t = await touchSession(page);
  await t.start(x0, y);
  await t.move(x0 + 8, y);
  await t.move(L[0].l - 3, y);
  await page.waitForTimeout(80);
  ok((await litCount(page)) === 0, `${tag}: nothing is lit before the finger reaches the first letter`);
  ok((await page.evaluate(() => getComputedStyle(document.querySelector('.sweep')).opacity)) === '0' && (await page.evaluate(() => document.querySelector('.sweep').getAnimations().length)) === 0, `${tag}: the first touch stops the sweep`);
  const lit = [];
  for (let i = 0; i < n; i++) {
    await t.move(L[i].l + 6, y);
    await page.waitForTimeout(90);
    lit.push(await litCount(page));
    if (i === Math.floor(n / 2)) { // one audit and one screenshot with some letters lit
      const ap = await audit(page, `${tag} mid-slide`);
      ok(ap.length === 0, ap.join(' | '));
      if (shot && i === 1) await shot(page, 'mid');
    }
    await t.move((L[i].l + L[i].r) / 2, y);
    await page.waitForTimeout(60);
    ok((await litCount(page)) === i + 1, `${tag}: letter ${i + 1} stays lit under the finger`);
    ok((await page.evaluate((k) => document.querySelectorAll('.glyph-letter')[k].classList.contains('current'), i)), `${tag}: letter ${i + 1} is the current one while the finger is on it`);
  }
  ok(JSON.stringify(lit) === JSON.stringify(Array.from({ length: n }, (_, i) => i + 1)), `${tag}: the lit count goes ${Array.from({ length: n }, (_, i) => i + 1).join(', ')} as the finger passes each left edge (${lit.join(', ')})`);
  const mid = await barScale(page);
  ok(mid > 0.3 && mid < 1, `${tag}: the progress bar follows the finger (${mid.toFixed(2)})`);
  // Dragging back un-lights letters.
  await t.move(L[0].l + 6, y);
  await page.waitForTimeout(90);
  ok((await litCount(page)) === 1, `${tag}: dragging back leaves only the first letter lit`);
  await t.move(L[0].l - 3, y);
  await page.waitForTimeout(90);
  ok((await litCount(page)) === 0 && (await barScale(page)) === 0, `${tag}: dragging all the way back un-lights everything`);
  // Slide to the end: sparkle, word stays lit, then resets within 1.6 s.
  for (let i = 0; i < n; i++) await t.move(L[i].l + 6, y);
  await t.move(L[n - 1].r + 10, y);
  await page.waitForTimeout(120);
  ok((await litCount(page)) === n, `${tag}: the whole word is lit at the right edge`);
  ok((await sparks(page)) > 0, `${tag}: a sparkle bursts at the end`);
  const ap2 = await audit(page, `${tag} complete`);
  ok(ap2.length === 0, ap2.join(' | '));
  ok((await scrolled(page)) === 0, `${tag}: the stage did not scroll during the drag`);
  await t.end();
  await page.waitForTimeout(1600);
  ok((await litCount(page)) === 0 && (await sparks(page)) === 0, `${tag}: the word resets to unlit within 1.6 s`);
  const after = await plain(page);
  ok(after.clips === before.clips && after.tts === before.tts, `${tag}: no sound or speech during the drag`);
  // Lifting early keeps the lit state for half a second, then fades back.
  const t2 = await touchSession(page);
  await t2.start(x0, y);
  await t2.move(L[0].l + 10, y);
  await t2.move(L[0].l + 14, y);
  await t2.end();
  await page.waitForTimeout(250);
  ok((await litCount(page)) >= 1, `${tag}: an early lift keeps the letters lit for a moment`);
  await page.waitForTimeout(700);
  ok((await litCount(page)) === 0, `${tag}: and then they fade back to unlit`);
  // A plain tap still reveals the word, and lights nothing.
  const c = { x: (L[0].l + L[n - 1].r) / 2, y };
  await page.touchscreen.tap(c.x, c.y);
  await page.waitForTimeout(400);
  ok(await stage.evaluate((e) => e.classList.contains('revealed')), `${tag}: a tap without a drag still reveals the word`);
  ok((await litCount(page)) === 0, `${tag}: a tap lights no letters`);
  // Again brings the sweep back.
  await page.click('.btn.again');
  await page.waitForTimeout(500);
  ok((await page.evaluate(() => document.querySelector('.sweep').getAnimations().length)) > 0, `${tag}: Again brings the sweep demonstration back`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Reduced motion: lighting still works, with no pop and no lift.
export async function blendReducedChecks({ browser, url, ok }) {
  const { ctx, page, errors } = await visit(browser, url, VIEWPORTS[0], 2, { reducedMotion: 'reduce' });
  const L = await edges(page);
  const x0 = (await rowLeft(page)) + 4;
  const t = await touchSession(page);
  await t.start(x0, L[0].y);
  await t.move(x0 + 8, L[0].y);
  await t.move(L[0].l + 10, L[0].y);
  await page.waitForTimeout(150);
  ok((await litCount(page)) === 1, 'reduced motion: a letter still lights');
  ok((await page.evaluate(() => getComputedStyle(document.querySelector('.glyph-letter.current .glyph-pop')).transform)) === 'none', 'reduced motion: the lit letter does not scale');
  await t.move(L[L.length - 1].r + 10, L[0].y);
  await page.waitForTimeout(150);
  ok((await page.evaluate(() => document.querySelector('.glyph-row').getAnimations().length)) === 0, 'reduced motion: the word does not lift');
  await t.end();
  ok(errors.length === 0, 'reduced motion blend: errors ' + errors.join(' | '));
  await ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  fs.mkdirSync(path.join(ROOT, '_test'), { recursive: true });
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  for (const vp of VIEWPORTS) for (const lessonNo of [2, 3]) await blendChecks({ browser, url, ok, vp, lessonNo });
  await blendReducedChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`blend: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
