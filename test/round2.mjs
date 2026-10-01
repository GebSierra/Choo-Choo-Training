// Round 2 fixes (docs/FIXES-round2.md): play-through behaviour of the games, the finish flow, Sound Story and the slide cues.
// Run alone with `node test/round2.mjs`, or as part of test/smoke.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN, touchDrag } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const SEED = (settings = {}) => `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[],result:'got-it'},2:{tasksDone:[],result:'got-it'},3:{tasksDone:[],result:'got-it'}},settings:${JSON.stringify({ seenScripts: SEEN, ...settings })},firstRunDone:true}))`;
const idx = (n, type) => tasksFor(CUR.lessons[n - 1]).find((t) => t.type === type).index;
const center = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const tap = async (page, loc) => { const c = await center(loc); await page.touchscreen.tap(c.x, c.y); };

// A page with the usual stubs; clock: true installs Playwright's fake clock so eight quiet seconds take no time.
async function open(browser, url, vp, route, { clock = false, extra, settings } = {}) {
  const made = await newPage(browser, vp, extra);
  if (clock) await made.page.clock.install();
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(SEED(settings));
  await made.page.goto(url + route);
  return made;
}
// Animations running on an element whose timing satisfies a test (the page's own pulses are Web Animations).
// (A fake clock freezes the page's own fade-ins, so a pulse is told apart by its length: 500 ms for the hints.)
const running = (page, sel, iterations, ms = null) => page.evaluate(([s, n, d]) => [...document.querySelectorAll(s)].reduce((c, e) => c + e.getAnimations().filter((a) => a.effect.getTiming().iterations === n && (d === null || a.effect.getTiming().duration === d)).length, 0), [sel, iterations, ms]);
const anims = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].reduce((c, e) => c + e.getAnimations().length, 0), sel);

// Item 12 and 14: Letter Hunt and Barn Doors idle hints, the ending fade and the Next pulse.
export async function gameFlowChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  // Idle hints in Letter Hunt: after 8 quiet seconds the Find this card swells twice and the targets once; a touch starts the wait over.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'hunt')}`, { clock: true });
    await page.waitForSelector('.sky-letter');
    await page.clock.runFor(7000);
    ok((await running(page, '.find-card', 2)) === 0, 'Hunt hint: nothing pulses before 8 quiet seconds');
    await page.clock.runFor(1200);
    ok((await running(page, '.find-card', 2)) === 1, 'Hunt hint: after 8 s the Find this card pulses twice');
    ok((await running(page, '.sky-letter[data-target="1"] .face', 1, 500)) >= 4, 'Hunt hint: the visible target letters pulse once');
    ok((await running(page, '.sky-letter[data-target="0"] .face', 1, 500)) === 0, 'Hunt hint: letters that are not targets do not pulse');
    await page.waitForTimeout(1100);
    await page.clock.runFor(5000);
    await tap(page, page.locator('.sky-letter[data-target="0"]').first()); // any touch starts the wait over
    await page.clock.runFor(5000);
    await page.waitForTimeout(200);
    ok((await running(page, '.find-card', 2)) === 0, 'Hunt hint: a touch resets the 8 s wait (5 s after it, no hint)');
    await page.clock.runFor(3500);
    ok((await running(page, '.find-card', 2)) === 1, 'Hunt hint: and a hint follows after 8 s of quiet again');
    ok(errors.length === 0, 'Hunt hint: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // Idle hints in Barn Doors: the Find this card pulses twice.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'barn')}`, { clock: true });
    await page.waitForSelector('.barn-letter');
    await page.clock.runFor(8200);
    ok((await running(page, '.find-card', 2)) === 1, 'Barn hint: after 8 s the Find this card pulses twice');
    ok(errors.length === 0, 'Barn hint: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // No hints with reduced motion.
  {
    const { ctx, page } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'hunt')}`, { clock: true, extra: { reducedMotion: 'reduce' } });
    await page.waitForSelector('.sky-letter');
    await page.clock.runFor(9000);
    ok((await anims(page, '.find-card')) === 0, 'Hunt hint: none with reduced motion');
    await ctx.close();
  }
  // The ending: the letters left in the sky fade to 0 as it starts; Next pulses once, only when the game is done.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'hunt')}`);
    await page.waitForSelector('.sky-letter');
    await page.waitForTimeout(1200); // Next wakes after a second
    ok((await anims(page, '.btn.next')) === 0, 'Hunt: Next does not pulse while the game is on');
    for (let i = 1; i <= 5; i++) {
      await tap(page, page.locator('.sky-letter[data-target="1"]:not(.popped)').first());
      await page.waitForTimeout(i < 5 ? 1000 : 120);
    }
    await page.waitForTimeout(450);
    const faded = await page.evaluate(() => [...document.querySelectorAll('.sky-letter:not(.popped)')].map((b) => ({ o: getComputedStyle(b.firstChild).opacity, pe: getComputedStyle(b).pointerEvents })));
    ok(faded.length > 0 && faded.every((f) => f.o === '0' && f.pe === 'none'), `Hunt ending: every remaining sky letter is at opacity 0 and takes no touch (${faded.length} letters)`);
    await page.waitForFunction(() => document.querySelector('.hunt').dataset.state === 'done', null, { timeout: 5000 });
    ok((await running(page, '.btn.next', 1)) === 1, 'Hunt: Next pulses once when the game is done');
    const t = await page.evaluate(() => document.querySelector('.btn.next').getAnimations()[0].effect.getTiming());
    ok(t.duration === 420 && t.iterations === 1, `Hunt: the pulse is 420 ms and does not loop (${t.duration} ms, ${t.iterations} time)`);
    ok(errors.length === 0, 'Hunt ending: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // Barn Doors: Next pulses at five stars only.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'barn')}`, { extra: undefined });
    await page.addInitScript(() => { Math.random = () => 0.99; });
    await page.reload();
    await page.waitForSelector('.barn-letter');
    for (let r = 1; r <= 5; r++) {
      await page.waitForFunction(() => document.querySelector('.barn-game').dataset.state === 'open', null, { timeout: 6000 });
      await page.waitForTimeout(450);
      if (r === 5) ok((await anims(page, '.btn.next')) === 0, 'Barn: Next does not pulse before the last star');
      await tap(page, page.locator('.barn-letter'));
      await page.waitForTimeout(r < 5 ? 1000 : 200);
    }
    ok((await running(page, '.btn.next', 1)) === 1, 'Barn: Next pulses once at five stars');
    ok(errors.length === 0, 'Barn pulse: errors ' + errors.join(' | '));
    await ctx.close();
  }
}

// Item 11 is in smoke.mjs and sack.mjs (the finish two-tap). Item 12 and 13: the Sound Sack tap path, idle demo and Skip / Finish.
export async function sackFlowChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  {
    const { ctx, page, errors } = await open(browser, url, vp, '#/checkpoint/c1');
    await page.waitForSelector('.sack-card');
    await page.waitForTimeout(1200);
    const game = (k) => page.evaluate((key) => document.querySelector('.sack-game').dataset[key], k);
    ok((await page.locator('.btn.next').innerText()).trim() === 'Skip', 'Sack: the footer button reads "Skip" while the game is on');
    // A tap on a wrong card shakes it silently and puts nothing in the sack.
    const wrong = page.locator('.sack-card[data-correct="0"]').first();
    await tap(page, wrong);
    await page.waitForTimeout(150);
    ok((await running(page, '.sack-card[data-correct="0"]', 1)) >= 1 && (await game('stars')) === '0', 'Sack tap: a wrong card shakes and nothing is put in the sack');
    await page.waitForTimeout(500);
    ok((await page.locator('.sack-card[data-correct="0"]:not([hidden])').count()) === 2, 'Sack tap: the wrong card stays where it was');
    ok((await page.evaluate(() => window.__events.filter((e) => e.type === 'clip').length)) === 0, 'Sack tap: no clip plays');
    // A tap on the right card flies it into the sack with the same effects as a drag: star, sparkle, next round.
    await tap(page, page.locator('.sack-card[data-correct="1"]'));
    await page.waitForTimeout(150);
    ok((await running(page, '.sack-card[data-correct="1"]', 1)) >= 1, 'Sack tap: the right card flies');
    await page.waitForTimeout(700);
    ok((await game('stars')) === '1' && (await page.locator('.star-row .gold-star').count()) === 1 && (await page.locator('.sack-barn ~ .spark, .farm .spark').count()) >= 0, 'Sack tap: a gold star fills');
    await page.waitForFunction(() => document.querySelector('.sack-game').dataset.round === '2', null, { timeout: 3000 });
    // Play the remaining rounds by tap: the label changes to Finish and Next pulses once at the end.
    for (let r = 2; r <= 6; r++) {
      await page.waitForFunction((k) => document.querySelector('.sack-game').dataset.round === String(k), r, { timeout: 4000 });
      await page.waitForTimeout(500);
      if (r === 6) ok((await anims(page, '.btn.next')) === 0, 'Sack: Next does not pulse before the game is done');
      await tap(page, page.locator('.sack-card[data-correct="1"]:not([disabled])'));
      await page.waitForTimeout(500);
    }
    await page.waitForFunction(() => document.querySelector('.sack-game').dataset.state === 'done', null, { timeout: 5000 });
    ok((await page.locator('.btn.next').innerText()).trim() === 'Finish', 'Sack: the footer button reads "Finish" once the game is done');
    ok((await running(page, '.btn.next', 1)) === 1, 'Sack: Next pulses once when the game is done');
    await page.click('.btn.again');
    await page.waitForTimeout(300);
    ok((await page.locator('.btn.next').innerText()).trim() === 'Skip', 'Sack: Again brings back "Skip"');
    ok(errors.length === 0, 'Sack tap: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // The idle demo: after 8 quiet seconds one small hand glides from the right card to the sack, once per round, silently.
  {
    const { ctx, page, errors } = await open(browser, url, vp, '#/checkpoint/c1', { clock: true });
    await page.waitForSelector('.sack-card');
    await page.clock.runFor(7000);
    ok((await page.locator('.demo-hand').count()) === 0, 'Sack demo: no hand before 8 quiet seconds');
    await page.clock.runFor(1200);
    ok((await page.locator('.demo-hand').count()) === 1, 'Sack demo: after 8 s a hand appears');
    const hand = await page.evaluate(() => { const e = document.querySelector('.demo-hand'), a = e.getAnimations()[0]; return { pe: getComputedStyle(e).pointerEvents, d: a && a.effect.getTiming().duration }; });
    ok(hand.pe === 'none' && hand.d > 1000, `Sack demo: the hand takes no touch and glides for ${hand.d} ms`);
    ok((await page.evaluate(() => window.__events.length)) <= 1, 'Sack demo: it is silent (only the opening line of the game was spoken)');
    await page.waitForTimeout(2100);
    ok((await page.locator('.demo-hand').count()) === 0, 'Sack demo: the hand goes away after one glide');
    await page.clock.runFor(20000);
    ok((await page.locator('.demo-hand').count()) === 0, 'Sack demo: it plays only once in a round');
    await tap(page, page.locator('.sack-card[data-correct="1"]'));
    await page.waitForTimeout(800);
    await page.clock.runFor(1500); // the next round deals
    await page.waitForFunction(() => document.querySelector('.sack-game').dataset.round === '2', null, { timeout: 3000 });
    await page.clock.runFor(8200);
    ok((await page.locator('.demo-hand').count()) === 1, 'Sack demo: the next round has its own demo');
    await tap(page, page.locator('.sack-card[data-correct="0"]').first()); // a touch takes the hand away and starts the wait over
    ok((await page.locator('.demo-hand').count()) === 0, 'Sack demo: a touch ends it');
    ok(errors.length === 0, 'Sack demo: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // Reduced motion: no demo.
  {
    const { ctx, page } = await open(browser, url, vp, '#/checkpoint/c1', { clock: true, extra: { reducedMotion: 'reduce' } });
    await page.waitForSelector('.sack-card');
    await page.clock.runFor(9000);
    ok((await page.locator('.demo-hand').count()) === 0, 'Sack demo: none with reduced motion');
    await ctx.close();
  }
}

// Item 15: the Sound Story play circle is a small greyed decoration that wiggles the real hold button when tapped.
export async function storyChecks({ browser, url, ok }) {
  for (const vp of [VIEWPORTS[0], VIEWPORTS[1]]) {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'story')}`);
    await page.waitForSelector('.story-art');
    await page.waitForTimeout(600);
    const play = await page.locator('.story .play').boundingBox();
    ok(play.width <= 64 && play.height <= 64, `${vp.name} Story: the play circle is small (${Math.round(play.width)} px)`);
    ok((await page.evaluate(() => getComputedStyle(document.querySelector('.story .play')).backgroundColor)).startsWith('rgba'), `${vp.name} Story: the play circle is a translucent, greyed disc`);
    ok((await anims(page, '.hold-btn')) === 0, `${vp.name} Story: the hold button is still before a tap`);
    await tap(page, page.locator('.story-art'));
    await page.waitForTimeout(100);
    ok((await anims(page, '.hold-btn')) >= 1, `${vp.name} Story: tapping the circle wiggles the real hold button`);
    await page.waitForTimeout(400);
    ok(page.url().includes('/task/') && (await page.locator('.hold-btn').count()) === 1, `${vp.name} Story: nothing opens and nothing navigates`);
    ok(errors.length === 0, `${vp.name} Story: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// Item 16 and 17: the slide cue (a hand along the bar, in step with the sweep, ended by the first touch) and the Saying Words
// band that covers the whole merged tile.
export async function cueChecks({ browser, url, ok, vp = VIEWPORTS[0] }) {
  // Saying Sounds, a letters word: the hand glides along the bar over the 2.6 s loop until the first touch.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/2/task/${idx(2, 'sounds')}`);
    await page.waitForSelector('.slide-band');
    await page.waitForTimeout(700);
    ok((await page.locator('.slide-hand').count()) === 1 && (await page.locator('.tap-hint:visible').count()) === 0, `${vp.name} cue: a letters word has one gliding hand and no static hand`);
    const d = await page.evaluate(() => { const a = document.querySelector('.slide-hand').getAnimations()[0], s = document.querySelector('.sweep').getAnimations()[0]; return { hand: a.effect.getTiming(), sweep: s.effect.getTiming() }; });
    ok(d.hand.duration === d.sweep.duration && d.hand.delay === d.sweep.delay && d.hand.iterations === Infinity, `${vp.name} cue: the hand runs the sweep's own ${d.sweep.duration} ms loop`);
    const bar = await page.locator('.blend-bar').boundingBox();
    const xs = [];
    for (let i = 0; i < 4; i++) { await page.waitForTimeout(450); xs.push(await page.evaluate(() => document.querySelector('.slide-hand').getBoundingClientRect().left)); }
    ok(xs.every((x) => x >= bar.x - 30 && x <= bar.x + bar.width), `${vp.name} cue: the hand stays on the bar (${xs.map(Math.round)})`);
    ok(Math.max(...xs) - Math.min(...xs) > 20, `${vp.name} cue: the hand moves along the bar`);
    const b = await page.locator('.slide-band').boundingBox();
    await touchDrag(page, { x: b.x + 6, y: b.y + b.height / 2 }, { x: b.x + 40, y: b.y + b.height / 2 }, { steps: 4 });
    await page.waitForTimeout(100);
    ok((await page.locator('.slide-hand').count()) === 0, `${vp.name} cue: the first touch ends the hand`);
    ok(errors.length === 0, `${vp.name} cue letters: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // A picture word: the static hand means tap; after the reveal the hand cue slides.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'sounds')}`);
    await page.waitForSelector('.sounds-stage');
    await page.waitForTimeout(500);
    ok((await page.locator('.slide-hand').count()) === 0 && (await page.locator('.tap-hint:visible').count()) === 1, `${vp.name} cue: a picture word keeps the static tap hand and has no gliding hand`);
    await tap(page, page.locator('.sounds-stage .pic-frame'));
    await page.waitForSelector('.slide-band');
    await page.waitForTimeout(600);
    ok((await page.locator('.slide-hand').count()) === 1 && (await page.locator('.tap-hint:visible').count()) === 0, `${vp.name} cue: after the reveal the gliding hand takes over`);
    ok(errors.length === 0, `${vp.name} cue picture: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Saying Words: after the reveal a wash sweeps every 4 s with a hand along the bar; the band covers the whole tile.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'words')}`);
    await page.waitForSelector('.merged-tile');
    await page.waitForTimeout(700);
    ok((await page.locator('.slide-hand').count()) === 0 && (await page.locator('.tap-hint:visible').count()) === 0, `${vp.name} Words: before the reveal there is no slide cue`);
    await tap(page, page.locator('.merged-tile'));
    await page.waitForSelector('.slide-band');
    await page.waitForTimeout(700);
    const w = await page.evaluate(() => {
      const t = document.querySelector('.merged-tile').getBoundingClientRect(), b = document.querySelector('.slide-band').getBoundingClientRect(), host = document.querySelector('.words-task').getBoundingClientRect();
      const sw = document.querySelector('.merged-tile .sweep').getAnimations()[0], hand = document.querySelector('.slide-hand').getAnimations()[0];
      return { tile: { t: t.top, b: t.bottom, l: t.left, r: t.right }, band: { t: b.top, b: b.bottom, l: b.left, r: b.right }, host: { l: host.left, r: host.right }, sweep: sw.effect.getTiming().duration, hand: hand.effect.getTiming().duration };
    });
    ok(w.band.t <= w.tile.t + 0.5 && w.band.b >= w.tile.b - 0.5 && w.band.l <= w.tile.l && w.band.r >= w.tile.r, `${vp.name} Words: the slide band covers the whole merged tile (band ${Math.round(w.band.t)}-${Math.round(w.band.b)}, tile ${Math.round(w.tile.t)}-${Math.round(w.tile.b)})`);
    ok(Math.abs(w.band.l - w.host.l) < 1 && Math.abs(w.band.r - w.host.r) < 1, `${vp.name} Words: the band is as wide as the stage`);
    ok(w.sweep === 4000 && w.hand === 4000, `${vp.name} Words: the wash and the hand repeat every 4 s (${w.sweep}, ${w.hand})`);
    // A slide that starts in the picture's top area lights letters (it used to start in a 140 px strip below it).
    const tileBox = await page.locator('.merged-tile').boundingBox();
    const y = tileBox.y + 8, x0 = tileBox.x + 12, x1 = tileBox.x + tileBox.width - 6;
    await touchDrag(page, { x: x0, y }, { x: x1, y }, { steps: 12, during: async () => { const lit = await page.evaluate(() => Number(document.querySelector('.slide-band').dataset.lit)); ok(lit >= 3, `${vp.name} Words: a slide from the top edge of the tile lights the letters (${lit} lit)`); } });
    ok((await page.locator('.slide-hand').count()) === 0 && (await anims(page, '.merged-tile .sweep')) === 0, `${vp.name} Words: the first touch ends the wash and the hand`);
    ok(errors.length === 0, `${vp.name} cue words: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  fs.mkdirSync(path.join(ROOT, '_test'), { recursive: true });
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await gameFlowChecks({ browser, url, ok });
  await sackFlowChecks({ browser, url, ok });
  await storyChecks({ browser, url, ok });
  for (const vp of VIEWPORTS) await cueChecks({ browser, url, ok, vp });
  await browser.close(); server.close();
  console.log(`round2: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
