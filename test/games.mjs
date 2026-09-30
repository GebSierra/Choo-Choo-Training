// The two lesson games (Letter Hunt): layout, touch behaviour and their done states.
// Run alone with `node test/games.mjs`, or as part of test/smoke.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

const SEED = (settings = {}) => `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[],result:'got-it'},2:{tasksDone:[],result:'got-it'}},settings:${JSON.stringify(settings)},firstRunDone:true}))`;
const OUT = path.join(ROOT, '_test');

const center = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const tap = async (page, loc) => { const c = await center(loc); await page.touchscreen.tap(c.x, c.y); };
const taskIndex = (CUR, n, type) => tasksFor(CUR.lessons[n - 1]).find((t) => t.type === type).index;
const rects = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }), sel);
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const anyOverlap = (list) => list.some((a, i) => list.slice(i + 1).some((b) => overlaps(a, b)));
const plain = (page) => page.evaluate(() => ({ clips: window.__events.filter((e) => e.type === 'clip').length, tts: window.__events.filter((e) => e.type === 'tts').length }));

async function open(browser, url, vp, settings, extra) {
  const made = await newPage(browser, vp, extra);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(SEED(settings));
  return made;
}

export async function huntChecks({ browser, url, ok, CUR, vp, lessonNo = 1, shot }) {
  const { ctx, page, errors } = await open(browser, url, vp);
  const lesson = CUR.lessons[lessonNo - 1];
  await page.goto(url + `#/lesson/${lessonNo}/task/${taskIndex(CUR, lessonNo, 'hunt')}`);
  await page.waitForSelector('.sky-letter');
  await page.waitForTimeout(900);
  const tag = `${vp.name} Hunt L${lessonNo}`;
  const letters = () => rects(page, '.sky-letter:not(.popped)');
  const first = await letters();
  ok(first.length >= 12 && first.length <= 14, `${tag}: about fourteen letters in the sky (${first.length})`);
  ok(first.every((r) => r.w >= 55.5 && r.h >= 55.5), `${tag}: every sky letter is at least 56 px`);
  const scene = (await rects(page, '.farm'))[0];
  const card = (await rects(page, '.find-card'))[0];
  ok(first.every((r) => r.x >= scene.x && r.x + r.w <= scene.x + scene.w && r.y >= scene.y && r.y + r.h <= scene.y + scene.h), `${tag}: every letter is inside the sky`);
  ok(!first.some((r) => overlaps(r, card)), `${tag}: no letter sits on the Find this card`);
  let clash = false;
  for (let i = 0; i < 4; i++) { clash = clash || anyOverlap(await letters()); await page.waitForTimeout(900); }
  ok(!clash, `${tag}: sky letters never overlap, even while they drift`);
  const targets = await page.locator('.sky-letter[data-target="1"]').count();
  ok(targets >= 4 && targets <= 5, `${tag}: four or five target letters (${targets})`);
  ok((await page.locator('.find-card .glyph').count()) === 1, `${tag}: Find this card shows the target glyph`);
  // Only target letters are drawn from the letter set the lesson allows.
  const shown = await page.evaluate(() => [...document.querySelectorAll('.sky-letter')].map((b) => b.dataset.letter));
  const allowed = new Set([lesson.sound, ...CUR.games.hunt.distractors[lesson.sound]]);
  ok(shown.every((l) => allowed.has(l)), `${tag}: only the target and its distractors appear: ${[...new Set(shown)].join('')}`);
  ok(await page.evaluate(() => [...document.querySelectorAll('.sky-letter[data-target="1"]')].every((b) => b.dataset.letter === document.querySelector('.find-card .glyph').dataset.letter)), `${tag}: targets match the Find this glyph`);

  const steps = () => page.evaluate(() => document.querySelector('.hunt').dataset.steps);
  const sheepX = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.sheep-wrap')).transform).m41);
  const stars = () => page.evaluate(() => document.querySelector('.star-row').dataset.filled);
  const scrollTop = () => page.evaluate(() => document.querySelector('.task-activity').scrollTop + scrollY);
  const before = await plain(page);
  // A wrong touch changes nothing.
  await tap(page, page.locator('.sky-letter[data-target="0"]').first());
  await page.waitForTimeout(500);
  ok((await steps()) === '0' && (await stars()) === '0' && (await sheepX()) === 0, `${tag}: a wrong touch does not move the sheep or fill a star`);
  ok((await page.locator('.sky-letter').count()) === first.length, `${tag}: a wrong touch leaves the letter where it is`);
  // Five right touches take the sheep across.
  let lastX = 0, minTargets = 99;
  for (let i = 1; i <= 5; i++) {
    await tap(page, page.locator('.sky-letter[data-target="1"]:not(.popped)').first());
    await page.waitForTimeout(i === 1 ? 250 : 120);
    if (i === 1) await shot && shot(page, 'mid');
    await page.waitForTimeout(1100);
    ok((await steps()) === String(i) && (await stars()) === String(i), `${tag}: touch ${i} moves the sheep one step and fills star ${i}`);
    const x = await sheepX();
    ok(x > lastX, `${tag}: the sheep is further right after touch ${i} (${Math.round(x)})`);
    lastX = x;
    if (i < 5) { await page.waitForTimeout(500); minTargets = Math.min(minTargets, await page.locator('.sky-letter[data-target="1"]:not(.popped)').count()); }
  }
  ok(minTargets >= 3, `${tag}: at least three target letters stayed in the sky (${minTargets})`);
  await page.waitForTimeout(1200);
  ok((await page.evaluate(() => document.querySelector('.hunt').dataset.state)) === 'done', `${tag}: five touches reach the done state`);
  await page.waitForTimeout(700);
  if (shot) await shot(page, 'done');
  ok((await scrollTop()) === 0, `${tag}: the stage never scrolled`);
  const after = await plain(page);
  ok(after.clips === before.clips && after.tts === before.tts, `${tag}: no sound or speech during play`);
  // Again starts over.
  await page.click('.btn.again');
  await page.waitForTimeout(900);
  ok((await steps()) === '0' && (await stars()) === '0' && (await sheepX()) === 0 && (await page.evaluate(() => document.querySelector('.hunt').dataset.state)) === 'playing', `${tag}: Again puts the sheep back at the start`);
  ok((await page.locator('.sky-letter').count()) >= 12, `${tag}: Again refreshes the sky`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Reduced motion: the game still plays and the letters do not drift.
export async function reducedChecks({ browser, url, ok, CUR }) {
  const vp = VIEWPORTS[0];
  const { ctx, page, errors } = await open(browser, url, vp, {}, { reducedMotion: 'reduce' });
  await page.goto(url + `#/lesson/1/task/${taskIndex(CUR, 1, 'hunt')}`);
  await page.waitForSelector('.sky-letter');
  await page.waitForTimeout(500);
  ok((await page.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity).length)) === 0, 'reduced motion: the sky letters do not drift');
  await tap(page, page.locator('.sky-letter[data-target="1"]').first());
  await page.waitForTimeout(400);
  ok((await page.evaluate(() => document.querySelector('.hunt').dataset.steps)) === '1', 'reduced motion: Hunt still counts a correct touch');
  ok(errors.length === 0, 'reduced motion game: errors ' + errors.join(' | '));
  await ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
  fs.mkdirSync(OUT, { recursive: true });
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  for (const vp of VIEWPORTS) { await huntChecks({ browser, url, ok, CUR, vp }); }
  await reducedChecks({ browser, url, ok, CUR });
  await browser.close(); server.close();
  console.log(`games: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
