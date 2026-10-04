// Practicing Words (the Loading Dock game inside a lesson), the renames, and the Sound Station checkpoint checks (skipped while the line has no checkpoint).
// Run alone with `node test/sack.mjs`, or as part of test/smoke.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { audit } from './audit.mjs';
import { tasksFor, practiceRounds } from '../js/lessons.js';
import { firstSoundOut } from '../js/scripts.js';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, touchDrag, SEEN, showStop } from './lib.mjs';

const CURR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const NODES = CURR.lessons.length + CURR.checkpoints.length; // stones on the map, rows in Grownups
const seed = (lessons, extra = {}) => `localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons, settings: { seenScripts: SEEN }, firstRunDone: true, ...extra })}))`;
const DONE = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it' }]));
const rect = (page, sel, i = 0) => page.evaluate(([s, k]) => { const e = document.querySelectorAll(s)[k]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, [sel, i]);
const rects = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }), sel);
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const mid = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const plain = (page) => page.evaluate(() => ({ clips: window.__events.filter((e) => e.type === 'clip').length, tts: window.__events.filter((e) => e.type === 'tts').length }));
const game = (page, k) => page.evaluate((key) => document.querySelector('.sack-game').dataset[key], k);
const scrolled = (page) => page.evaluate(() => document.querySelector('.task-activity').scrollTop + scrollY);

async function open(browser, url, vp, init, route) {
  const made = await newPage(browser, vp);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(init);
  await made.page.goto(url + route);
  return made;
}

// Drag the card matching `which` ('1' right, '0' wrong) to a point; returns where the card started.
async function dragCard(page, which, to, during) {
  const loc = page.locator(`.sack-card[data-correct="${which}"]:not([disabled])`).first();
  const start = await loc.boundingBox();
  const from = { x: start.x + start.width / 2, y: start.y + start.height / 2 };
  await touchDrag(page, from, to(), { steps: 16, during });
  return { start, word: await loc.getAttribute('data-word') };
}

// Practicing Words: the Loading Dock game as the ninth task of a lesson (lessons 1 and 2 done, lesson 3 open).
export async function practiceChecks({ browser, url, ok, CUR, vp, shot }) {
  const L = CUR.lessons[2], plan = practiceRounds(CUR, L), idxOf = (type) => tasksFor(L).find((t) => t.type === type).index;
  const { ctx, page, errors } = await open(browser, url, vp, seed(DONE(2)), `#/lesson/3/task/${idxOf('practice')}`);
  await page.waitForSelector('.sack-game .sack-card');
  await page.waitForTimeout(800);
  const tag = `${vp.name} Practicing Words`;
  const sackBox = () => rect(page, '.sack');
  const sceneBox = await rect(page, '.farm');
  let sack = await sackBox(), cards = await rects(page, '.sack-card');
  ok(cards.length === 3 && cards.every((c) => c.w >= 95.5 && c.h >= 95.5), `${tag}: three cards, each at least 96 px (${cards.map((c) => Math.round(c.w)).join(', ')})`);
  ok(sack.w >= 129.5, `${tag}: the wagon is at least 130 px wide (${Math.round(sack.w)})`);
  ok(!cards.some((c, i) => cards.slice(i + 1).some((d) => overlaps(c, d))) && !cards.some((c) => overlaps(c, sack)), `${tag}: the crates never overlap each other or the wagon`);
  ok(cards.every((c) => c.x >= sceneBox.x && c.x + c.w <= sceneBox.x + sceneBox.w && c.y >= sceneBox.y && c.y + c.h <= sceneBox.y + sceneBox.h) && sack.y + sack.h <= sceneBox.y + sceneBox.h, `${tag}: everything fits in the scene`);
  ok((await page.locator('.sack-front .glyph').count()) === 1, `${tag}: the wagon shows a letter glyph`);
  const audited = await audit(page, tag);
  ok(audited.length === 0, audited.join(' | '));
  ok(plan.length === 3 && plan[0].key === 's' && plan[0].word === 'snake', `${tag}: the plan opens with this lesson's sound (${plan.map((r) => r.word).join(', ')})`);

  // The parent script (never spoken in quiet mode) says "Find the sssnake."
  await page.locator('.script-toggle').click();
  await page.waitForTimeout(300);
  const scriptText = await page.locator('.script-sheet').innerText();
  ok(scriptText.includes(`Find the ${firstSoundOut(plan[0].word, CUR.sounds)}`), `${tag}: the script says "Find the ${firstSoundOut(plan[0].word, CUR.sounds)}" (${scriptText.replace(/\s+/g, ' ').slice(0, 120)})`);
  await page.locator('.sheet-close').click();
  await page.waitForTimeout(300);

  const before = await plain(page);
  for (let r = 0; r < 3; r++) {
    await page.waitForFunction((k) => document.querySelector('.sack-game').dataset.round === String(k), r + 1, { timeout: 4000 });
    await page.waitForTimeout(500);
    ok((await game(page, 'sound')) === plan[r].key, `${tag}: round ${r + 1} is about ${plan[r].key}`);
    const right = await page.locator('.sack-card[data-correct="1"]').getAttribute('data-word');
    ok(right === plan[r].word, `${tag}: round ${r + 1} the right crate is ${plan[r].word} (${right})`);
    if (r === 1 && shot) await shot(page, 'mid');
    sack = await sackBox();
    await dragCard(page, '1', () => mid(sack));
    const filled = await page.waitForFunction((k) => document.querySelector('.sack-game').dataset.stars === String(k), r + 1, { timeout: 4000 }).then(() => true, () => false);
    ok(filled, `${tag}: round ${r + 1} star filled`);
  }
  await page.waitForFunction(() => document.querySelector('.sack-game').dataset.state === 'done', null, { timeout: 5000 }).catch(() => {});
  ok((await game(page, 'state')) === 'done', `${tag}: three rounds reach the done state`);
  const spoken = await page.evaluate(() => window.__spoken.join(' | '));
  ok(!/([a-z])\1{2,}|\b[a-z]-/.test(spoken), `${tag}: no stretched or clipped sound was spoken (${spoken.slice(0, 80)})`);
  ok((await plain(page)).clips === before.clips, `${tag}: no recorded sound played during play`);
  await page.waitForTimeout(1200);
  await page.click('.btn.next');
  await page.waitForFunction((i) => location.hash.endsWith(`/lesson/3/task/${i}`), idxOf('check'), { timeout: 4000 }).catch(() => {});
  ok(page.url().endsWith(`#/lesson/3/task/${idxOf('check')}`), `${tag}: Next goes to Ticket Check, not the finish screen (${page.url().split('#')[1]})`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// The new names everywhere: title, manifest, task cards, Grownups; and the 2D Home no longer has a sound station stone.
export async function renameChecks({ browser, url, ok, CUR }) {
  const { ctx, page, errors } = await open(browser, url, VIEWPORTS[0], seed(DONE(2)), '#/lesson/3');
  await page.waitForSelector('.task-card');
  ok((await page.title()) === "Pip's Reading Train", `the page title is Pip's Reading Train (${await page.title()})`);
  const man = await page.evaluate(async () => (await (await fetch('manifest.webmanifest')).json()));
  ok(man.name === "Pip's Reading Train" && man.short_name === "Pip's Train", `the manifest name is Pip's Reading Train, short name Pip's Train (${man.name} / ${man.short_name})`);
  const names = await page.locator('.task-card .card-name').allInnerTexts();
  const want = ['Letter Review', 'New Sound', 'Sound Story', 'Word Cars', 'Saying Sounds', 'Track Tracing', 'Letter Hunt', 'Barn Doors', 'Practicing Words', 'Ticket Check'];
  ok(JSON.stringify(names) === JSON.stringify(want), `lesson 3's task cards are named ${want.join(', ')} (${names.join(', ')})`);
  ok(errors.length === 0, `rename lesson: errors ${errors.join(' | ')}`);
  await ctx.close();
  const g = await open(browser, url, VIEWPORTS[0], seed(DONE(2)), '#/home');
  await g.page.waitForSelector('.pill-hold');
  await g.page.waitForTimeout(900);
  const gb = await g.page.locator('.pill-hold').boundingBox();
  await g.page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await g.page.mouse.down(); await g.page.waitForTimeout(2250); await g.page.mouse.up();
  await g.page.waitForSelector('.grownups');
  ok(/Pip's Reading Train version/.test(await g.page.locator('.gu-version').innerText()), 'Grownups shows "Pip\'s Reading Train version"');
  ok(g.errors.length === 0, `rename grownups: errors ${g.errors.join(' | ')}`);
  await g.ctx.close();
  const m = await open(browser, url, VIEWPORTS[0], `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{},settings:{seenScripts:${JSON.stringify(SEEN)},trainWorld:false},firstRunDone:true}))`, '#/home');
  await m.page.waitForSelector('.stone', { state: 'attached' });
  await m.page.waitForTimeout(800);
  ok((await m.page.locator('.stone').count()) === CUR.lessons.length && (await m.page.locator('.stone-sack').count()) === 0, `the 2D Home has ${CUR.lessons.length} stones and no sound station stone`);
  ok(m.errors.length === 0, `rename home: errors ${m.errors.join(' | ')}`);
  await m.ctx.close();
}

export async function sackMapChecks({ browser, url, ok, vp }) {
  if (!CURR.checkpoints.length) return; // no Sound Station stop on the line since 1.7.0; Phase C points this at the book stop
  // Locked until lesson 3 is done, then it opens. Old saved data (no checkpoints key) loads fine.
  let made = await open(browser, url, vp, seed(DONE(2)), '#/home');
  let { page, errors } = made;
  await page.waitForSelector('.stone', { state: 'attached' });
  await page.waitForTimeout(900);
  const tag = `${vp.name} map`;
  ok((await page.locator('.stone').count()) === NODES, `${tag}: ${NODES} stones (${CURR.lessons.length} lessons and ${CURR.checkpoints.length} sacks)`);
  const sackStone = page.locator('.stone[aria-label^="Sound Station"]').first(); // the first sack, after lesson 3
  ok((await sackStone.getAttribute('aria-label')) === 'Sound Station, locked' && (await sackStone.evaluate((e) => e.classList.contains('is-locked'))), `${tag}: the sack stone is locked before lesson 3 is done`);
  await showStop(page, '.stone[aria-label^="Sound Station"]'); // the 3D railway: bring the stop into view first
  await sackStone.click({ force: true });
  await page.waitForTimeout(400);
  ok(page.url().endsWith('#/home'), `${tag}: a locked sack does not open`);
  await page.evaluate(() => { location.hash = '#/checkpoint/c1'; });
  await page.waitForTimeout(600);
  ok(page.url().endsWith('#/home'), `${tag}: the sack cannot be opened by address while locked`);
  await page.waitForTimeout(600);
  await showStop(page, '.stone[aria-label^="Sound Station"]');
  const b = await sackStone.boundingBox(), pill = await page.locator('.pill-hold').boundingBox();
  ok(b.width >= 48 && b.height >= 48 && !(b.x < pill.x + pill.width && pill.x < b.x + b.width && b.y < pill.y + pill.height && pill.y < b.y + b.height), `${tag}: the sack stone is a big target clear of the Grownups pill`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await made.ctx.close();

  made = await open(browser, url, vp, seed(DONE(3)), '#/home'); // no "checkpoints" key at all
  page = made.page; errors = made.errors;
  await page.waitForSelector('.stone', { state: 'attached' });
  await page.waitForTimeout(900);
  ok((await page.locator('.stone[aria-label^="Sound Station"]').first().evaluate((e) => !e.classList.contains('is-locked'))) && (await page.locator('.stone.is-current').getAttribute('aria-label')) === 'Lesson 4', `${tag}: once lesson 3 is done the sack is open and lesson 4 is the current stone`);
  await showStop(page, '.stone[aria-label^="Sound Station"]');
  await page.locator('.stone[aria-label^="Sound Station"]').first().click();
  await page.waitForSelector('.sack-game');
  ok(page.url().endsWith('#/checkpoint/c1'), `${tag}: tapping the sack opens the checkpoint`);
  ok((await page.locator('.task-head h1').innerText()) === 'Sound Station', `${tag}: the screen is titled Sound Station`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await made.ctx.close();
}

export async function sackGrownupsChecks({ browser, url, ok }) {
  if (!CURR.checkpoints.length) return;
  const vp = VIEWPORTS[0];
  const { ctx, page, errors } = await open(browser, url, vp, `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); ${seed({ 1: { tasksDone: [], result: 'got-it' } }, { checkpoints: { c1: { result: 'practice-again', completedAt: '2026-09-30T12:00:00Z' } } })} }`, '#/home');
  await page.waitForSelector('.pill-hold');
  await page.waitForTimeout(700);
  const hold = async () => { const gb = await page.locator('.pill-hold').boundingBox(); await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.waitForTimeout(2250); await page.mouse.up(); };
  await hold();
  await page.waitForSelector('.grownups');
  const rows = page.locator('.gu-card').first().locator('.gu-row');
  ok((await rows.count()) === NODES, `Grownups lists every lesson and sound station (${NODES})`);
  ok(/Practice again/.test(await rows.nth(3).innerText()) && /Sound Station/.test(await rows.nth(3).innerText()), 'Grownups shows the sack result');
  await page.locator('[aria-label="Unlock the sound station"]').first().click();
  ok((await page.locator('[aria-label="Confirm unlock"]').count()) === 1, 'Grownups: unlocking the sack asks first');
  await page.click('[aria-label="Confirm unlock"] button:has-text("Unlock")');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).checkpoints.c1.unlocked)) === true, 'Grownups: confirming unlocks the sack');
  await page.click('text=Reset all progress');
  await page.click('.btn.danger');
  await page.waitForSelector('.home');
  ok((await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('reading.v1')).checkpoints).length)) === 0, 'reset clears the sack result too');
  ok(errors.length === 0, 'Grownups sack: errors ' + errors.join(' | '));
  await ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
  fs.mkdirSync(path.join(ROOT, '_test'), { recursive: true });
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  for (const vp of VIEWPORTS) { await sackMapChecks({ browser, url, ok, vp }); await practiceChecks({ browser, url, ok, CUR, vp }); }
  await renameChecks({ browser, url, ok, CUR });
  await sackGrownupsChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`sack: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
