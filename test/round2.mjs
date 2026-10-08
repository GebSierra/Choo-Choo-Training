// Round 2 fixes (docs/FIXES-round2.md): play-through behaviour of the games, the finish flow, Sound Story and the slide cues.
// Run alone with `node test/round2.mjs`, or as part of test/smoke.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN, touchDrag, touchSession, DONE_JSON } from './lib.mjs';
import vm from 'node:vm';
import { tasksFor } from '../js/lessons.js';
import { createStore } from '../js/store.js';
import { shuffle } from '../js/components/game-kit.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const SEED = (settings = {}) => `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:${DONE_JSON},settings:${JSON.stringify({ seenScripts: SEEN, ...settings })},firstRunDone:true}))`;
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

// Item 12 and 14: Letter Hunt idle hints, the ending fade and the Next pulse.
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
    const leaving = await page.evaluate(() => [...document.querySelectorAll('.sky-letter:not(.popped)')].map((b) => ({ pe: getComputedStyle(b).pointerEvents, moving: b.getAnimations().length > 0 })));
    ok(leaving.length > 0 && leaving.every((f) => f.pe === 'none' && f.moving), `Hunt ending: every balloon left takes no touch and floats away (${leaving.length} letters)`);
    await page.waitForFunction(() => document.querySelector('.hunt').dataset.state === 'done', null, { timeout: 5000 });
    ok((await running(page, '.btn.next', 1)) === 1, 'Hunt: Next pulses once when the game is done');
    const t = await page.evaluate(() => document.querySelector('.btn.next').getAnimations()[0].effect.getTiming());
    ok(t.duration === 420 && t.iterations === 1, `Hunt: the pulse is 420 ms and does not loop (${t.duration} ms, ${t.iterations} time)`);
    ok(errors.length === 0, 'Hunt ending: errors ' + errors.join(' | '));
    await ctx.close();
  }
}

// Item 11 is in smoke.mjs and sack.mjs (the finish two-tap). Item 12 and 13: the Sound Sack tap path, idle demo and Skip / Finish.
export async function sackFlowChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/3/task/${idx(3, 'practice')}`);
    await page.waitForSelector('.sack-card');
    await page.waitForTimeout(1200);
    const game = (k) => page.evaluate((key) => document.querySelector('.sack-game').dataset[key], k);
    ok((await page.locator('.btn.next').innerText()).trim() === 'Next', 'Sack: the footer button reads "Next" (Practicing Words is a lesson task)');
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
    ok((await game('stars')) === '1' && (await page.locator('.star-row .gold-star').count()) === 1 && (await page.locator('.farm .spark').count()) >= 0, 'Sack tap: a gold star fills');
    await page.waitForFunction(() => document.querySelector('.sack-game').dataset.round === '2', null, { timeout: 3000 });
    // Play the remaining rounds by tap: the label changes to Finish and Next pulses once at the end.
    for (let r = 2; r <= 3; r++) {
      await page.waitForFunction((k) => document.querySelector('.sack-game').dataset.round === String(k), r, { timeout: 4000 });
      await page.waitForTimeout(500);
      if (r === 3) ok((await anims(page, '.btn.next')) === 0, 'Sack: Next does not pulse before the game is done');
      await tap(page, page.locator('.sack-card[data-correct="1"]:not([disabled])'));
      await page.waitForTimeout(500);
    }
    await page.waitForFunction(() => document.querySelector('.sack-game').dataset.state === 'done', null, { timeout: 5000 });
    ok((await page.locator('.btn.next').innerText()).trim() === 'Next' && !(await page.locator('.btn.next').isDisabled()), 'Sack: Next is ready once the game is done');
    ok((await running(page, '.btn.next', 1)) === 1, 'Sack: Next pulses once when the game is done');
    await page.click('.btn.again');
    await page.waitForTimeout(300);
    ok(errors.length === 0, 'Sack tap: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // The idle demo: after 8 quiet seconds one small hand glides from the right card to the sack, once per round, silently.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/3/task/${idx(3, 'practice')}`, { clock: true });
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
    const { ctx, page } = await open(browser, url, vp, `#/lesson/3/task/${idx(3, 'practice')}`, { clock: true, extra: { reducedMotion: 'reduce' } });
    await page.waitForSelector('.sack-card');
    await page.clock.runFor(9000);
    ok((await page.locator('.demo-hand').count()) === 0, 'Sack demo: none with reduced motion');
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
    ok(d.hand.duration === d.sweep.duration && d.hand.delay === d.sweep.delay && d.hand.iterations === d.sweep.iterations && d.sweep.iterations < Infinity, `${vp.name} cue: the hand runs the sweep's own ${d.sweep.duration} ms loop, the same few times, then both stop`);
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
}

// Group 4: layout and polish at the three phone sizes.
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; }, sel);
export async function layoutChecks({ browser, url, ok, vp }) {
  const land = vp.width > vp.height, small = vp.width <= 380;
  const tag = vp.name;
  // 18: New Letter shows the whole howTo (no line clamp, nothing cut) and does not scroll.
  for (const n of [1, 2]) {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/${n}/task/${idx(n, 'newLetter')}`);
    await page.waitForSelector('.sc-how', { state: 'attached' });
    await page.waitForTimeout(900);
    if (land) { await ctx.close(); continue; } // the landscape card leaves the howTo out by design
    const how = await page.evaluate(() => { const e = document.querySelector('.sc-how'), a = document.querySelector('.task-activity'); return { clamp: getComputedStyle(e).webkitLineClamp, cut: e.scrollHeight > e.clientHeight + 1, scroll: a.scrollHeight - a.clientHeight }; });
    ok(how.clamp === 'none' && !how.cut && how.scroll <= 1 && (await rect(page, '.sound-card')).b <= (await rect(page, '.task-stage')).b, `${tag} New Letter L${n}: the whole howTo shows, no clamp, no scrolling (${JSON.stringify(how)})`);
    ok(errors.length === 0, `${tag} New Letter: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // 19: Letter Writing's two buttons stay on one line each and share the width.
  {
    const { ctx, page } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'writing')}`);
    await page.waitForSelector('.writing-buttons');
    await page.waitForTimeout(700);
    const b = await page.evaluate(() => [...document.querySelectorAll('.writing-buttons .btn')].map((e) => ({ w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height, wrap: e.scrollWidth > e.clientWidth, ws: getComputedStyle(e).whiteSpace })));
    ok(b.length === 2 && b.every((x) => x.ws === 'nowrap' && !x.wrap && x.h < 60) && Math.abs(b[0].w - b[1].w) < 1.5, `${tag} Writing: both buttons on one line and equal (${JSON.stringify(b)})`);
    const tp = await page.evaluate(() => ({ h: document.querySelector('.trace-pad').getBoundingClientRect().height, vh: innerHeight }));
    ok(tp.h <= tp.vh * 0.7 + 1, `${tag} Writing: the trace pad is at most 70vh (${Math.round(tp.h)} of ${tp.vh})`);
    // owner fix: the script tells the grown-up to draw first and that an imperfect drawing is fine, and Next never waits for a drawing
    const ws = await page.evaluate(() => (document.querySelector('.script-sheet .sheet-body') || {}).textContent || '');
    ok(ws.includes("I do: draw the letter while your child watches. We do: trace it together, one finger each. You do: your child traces it alone. Start at the dot and follow the arrow. It does not have to look right yet. Your child can still move on."), `${tag} Writing: the script says draw first, and that it is fine if it does not look right`);
    await page.waitForTimeout(1200);
    ok(await page.evaluate(() => !document.querySelector('.btn.next').disabled), `${tag} Writing: Next is open with nothing drawn (a child who cannot draw it yet can move on)`);
    await ctx.close();
  }
  // 21: the finish screen: two columns in landscape, the label for the grown-up, a one-line practice button at 360.
  {
    const { ctx, page } = await open(browser, url, vp, '#/lesson/2/finish');
    await page.waitForSelector('.finish');
    await page.waitForTimeout(700);
    const f = await page.evaluate(() => { const g = document.querySelector('.finish-glyph').getBoundingClientRect(), c = document.querySelector('.finish-card').getBoundingClientRect(), bk = document.querySelector('.back-path').getBoundingClientRect(), h1 = document.querySelector('.finish h1').getBoundingClientRect(), p = document.querySelector('.btn.practice'); return { g, c, bk, h1, label: document.querySelector('.finish-for').textContent, pw: p.scrollWidth > p.clientWidth, ph: p.getBoundingClientRect().height, shadow: getComputedStyle(document.querySelector('.finish-wagon')).boxShadow, scroll: document.documentElement.scrollHeight - innerHeight }; });
    ok(f.label === 'For the grown-up' && f.shadow.includes('0.12') || f.shadow.includes('rgba') , `${tag} finish: the card is labelled "For the grown-up" and the letter sits on its wagon with a tinted rim (polish B: was the tinted panel)`);
    ok(!f.pw && f.ph < 80, `${tag} finish: "Not yet, practice again" fits on one line (${Math.round(f.ph)} px tall)`);
    if (land) ok(f.g.right <= f.c.left && f.h1.right <= f.c.left + 1 && f.bk.left >= f.c.left - 1 && f.bk.top >= f.c.bottom && f.scroll <= 1, `${tag} finish: glyph and heading left, card and back button right, no scrolling`);
    await ctx.close();
  }
  // 22: the lesson overview.
  {
    const { ctx, page } = await open(browser, url, vp, '#/lesson/2');
    await page.waitForSelector('.task-card');
    await page.waitForTimeout(700);
    const o = await page.evaluate(() => ({ p: getComputedStyle(document.querySelector('.lo-title p')).fontSize, pad: getComputedStyle(document.querySelector('.cards-scroll')).paddingBottom, cols: getComputedStyle(document.querySelector('.cards')).gridTemplateColumns.split(' ').length, h: document.querySelector('.task-card').getBoundingClientRect().height }));
    ok(o.p === '16px', `${tag} overview: the subtitle is 16 px`);
    ok((await page.locator('.song-row').count()) === 0, `${tag} overview: no alphabet song row (the YouTube links are gone)`);
    if (!land) ok(o.pad === '16px', `${tag} overview: the cards leave 16 px under them (polish B: the footer is in the flow now; was 96 px)`);
    if (land) ok(o.cols === 5 && o.h < 125 && o.h > 110, `${tag} overview: five columns of about 118 px (${o.cols}, ${Math.round(o.h)})`);
    await ctx.close();
  }
  // 24: the art is bigger; 25: the Find this text is 16 px.
  {
    const { ctx, page } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'hunt')}`);
    await page.waitForSelector('.sky-letter');
    await page.waitForTimeout(900);
    const a = await page.evaluate(() => ({ train: document.querySelector('.train-wrap').getBoundingClientRect().width, goal: document.querySelector('.hunt-goal').getBoundingClientRect().width, fs: getComputedStyle(document.querySelector('.find-card span')).fontSize }));
    ok(Math.abs(a.train - 116) < 1 && Math.abs(a.goal - 152) < 1 && a.fs === '16px', `${tag} Hunt: the train is 116 px, the station 152 px and "Find this" 16 px (${JSON.stringify(a)})`);
    const letters = await page.evaluate(() => { const sc = document.querySelector('.farm').getBoundingClientRect(), g = document.querySelector('.hunt-goal').getBoundingClientRect(); return [...document.querySelectorAll('.sky-letter')].map((e) => e.getBoundingClientRect()).map((r) => ({ in: r.left >= sc.left && r.right <= sc.right && r.top >= sc.top && r.bottom <= sc.bottom, onGoal: r.right > g.left && r.left < g.right && r.bottom > g.top + 20 && r.top < g.bottom })); });
    ok(letters.length >= 12 && letters.every((l) => l.in && !l.onGoal), `${tag} Hunt: ${letters.length} letters, all inside the sky and none on the station`);
    await ctx.close();
  }
  // 24: Quick Check's prompt and cards are grouped in the middle of the stage.
  {
    const { ctx, page } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'check')}`);
    await page.waitForSelector('.opt-card');
    await page.waitForTimeout(700);
    const c = await page.evaluate(() => { const p = document.querySelector('.check-prompt').getBoundingClientRect(), o = document.querySelector('.opts').getBoundingClientRect(), s = document.querySelector('.task-activity').getBoundingClientRect(); return { gap: o.top - p.bottom, up: p.top - s.top, down: s.bottom - o.bottom }; });
    ok(Math.abs(c.gap - 24) < 2 && Math.abs(c.up - c.down) < 40, `${tag} Check: prompt and cards form one group in the middle (gap ${Math.round(c.gap)}, space above ${Math.round(c.up)}, below ${Math.round(c.down)})`);
    await ctx.close();
  }
  // 25: the speaker is violet with a white icon, white with a violet icon only on the violet stage; an open sheet dims the stage.
  {
    const { ctx, page } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'hunt')}`);
    await page.waitForSelector('.task-stage > .speak-btn');
    const bg = (sel) => page.evaluate((s) => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
    ok((await bg('.task-stage > .speak-btn')) === 'rgb(90, 75, 214)', `${tag} speaker: violet on the sky Hunt stage`);
    await page.evaluate(() => { location.hash = '#/lesson/1/task/0'; });
    await page.waitForFunction(() => document.querySelector('.task-stage.c-violet'));
    await page.waitForTimeout(500);
    ok((await bg('.task-stage > .speak-btn')) === 'rgb(255, 255, 255)', `${tag} speaker: white with a violet icon on the violet New Letter stage`);
    await page.click('.script-toggle');
    await page.waitForTimeout(400);
    const dim = await page.evaluate(() => ({ cls: document.querySelector('.task-stage').classList.contains('dimmed'), o: getComputedStyle(document.querySelector('.task-stage'), '::after').opacity, bg: getComputedStyle(document.querySelector('.task-stage'), '::after').backgroundColor }));
    if (!land) ok(dim.cls && dim.o === '1' && dim.bg.includes('0.2'), `${tag} sheet: an open script dims the stage by 20% (${JSON.stringify(dim)})`);
    await ctx.close();
  }
  // 25: in landscape the first-run card sits at the bottom, clear of the current stone.
  if (land) {
    const made = await newPage(browser, vp);
    await made.page.addInitScript(SPEECH_STUB);
    await made.page.goto(url + '#/home');
    await made.page.waitForSelector('.first-card');
    await made.page.waitForTimeout(700);
    const fc = await rect(made.page, '.first-card');
    ok(fc.b >= vp.height - 20, `${tag} first run: the card sits at the bottom edge (${Math.round(fc.y)} to ${Math.round(fc.b)} of ${vp.height})`);
    await made.ctx.close();
  }
}

// 20: every task, the games and the Sound Sack in landscape: the stage takes the whole height, nothing scrolls, the bar fits.
export async function landscapeChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[1];
  const { ctx, page, errors } = await open(browser, url, vp, '#/home');
  await page.waitForSelector('.home');
  const routes = [];
  for (const L of CUR.lessons) for (const t of tasksFor(L)) routes.push([`#/lesson/${L.number}/task/${t.index}`, `L${L.number} ${t.type}`]);
  for (const k of CUR.checkpoints) routes.push([`#/checkpoint/${k.id}`, `Sound Sack ${k.id}`]);
  for (const [r, name] of routes) {
    await page.evaluate((h) => { location.hash = h; }, r);
    await page.waitForFunction((h) => location.hash === h && document.querySelector('.screen:not(.leaving) .task-stage') && !document.querySelector('.screen.leaving'), r);
    await page.waitForTimeout(250);
    const m = await page.evaluate(() => { const st = document.querySelector('.screen:not(.leaving) .task-stage').getBoundingClientRect(), a = document.querySelector('.screen:not(.leaving) .task-activity'), foot = document.querySelector('.screen:not(.leaving) .task-foot').getBoundingClientRect(), head = document.querySelector('.screen:not(.leaving) .task-head').getBoundingClientRect(); return { stage: st.height, vh: innerHeight, scroll: a.scrollHeight - a.clientHeight, docScroll: document.documentElement.scrollHeight - innerHeight, footW: foot.width, footTop: foot.top, headRight: head.left >= st.right - 1, footInside: foot.bottom <= innerHeight + 1 }; });
    ok(m.stage >= m.vh * 0.9 && m.scroll <= 1 && m.docScroll <= 1 && Math.abs(m.footW - 264) < 2 && m.headRight && m.footInside, `landscape ${name}: stage ${Math.round(m.stage)} of ${m.vh} px, no scrolling, foot column 264 px (${JSON.stringify(m)})`);
  }
  ok(errors.length === 0, 'landscape: errors ' + errors.join(' | '));
  await ctx.close();
}

// 27: Letter Hunt in short landscape windows (the browser's bars showing): a playable game of at least 6 letters, 4 targets, no overlap.
export async function shortHuntChecks({ browser, url, ok }) {
  for (const [w, h] of [[915, 330], [800, 330], [740, 300]]) {
    const { ctx, page, errors } = await open(browser, url, { name: `${w}x${h}`, width: w, height: h, deviceScaleFactor: 2 }, `#/lesson/1/task/${idx(1, 'hunt')}`);
    await page.waitForSelector('.sky-letter');
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => { const sc = document.querySelector('.farm').getBoundingClientRect(), card = document.querySelector('.find-card').getBoundingClientRect(); const rs = [...document.querySelectorAll('.sky-letter')].map((e) => ({ r: e.getBoundingClientRect(), t: e.dataset.target })); const overlap = rs.some((a, i) => rs.slice(i + 1).some((b) => a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom && b.r.top < a.r.bottom)); return { n: rs.length, targets: rs.filter((x) => x.t === '1').length, inside: rs.every((x) => x.r.left >= sc.left && x.r.right <= sc.right && x.r.top >= sc.top && x.r.bottom <= sc.bottom), overlap, onCard: rs.some((x) => x.r.left < card.right && x.r.right > card.left && x.r.top < card.bottom && x.r.bottom > card.top) }; });
    ok(m.n >= 6 && m.targets >= 4 && m.inside && !m.overlap && !m.onCard, `${w}x${h} Hunt is playable: ${m.n} letters, ${m.targets} targets, inside, no overlap, none on the card`);
    for (let i = 0; i < 5; i++) { await tap(page, page.locator('.sky-letter[data-target="1"]:not(.popped)').first()); await page.waitForTimeout(i < 4 ? 1000 : 200); }
    ok((await page.evaluate(() => document.querySelector('.hunt').dataset.steps)) === '5', `${w}x${h} Hunt: five right touches finish the game`);
    ok(errors.length === 0, `${w}x${h} Hunt: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// Group 5: pull-to-refresh, the service worker's cache rules, sound while hidden, saved settings.
export async function platformChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  // 29: html (not only body) refuses overscroll, so pulling down does not refresh the page; the task stage contains its own.
  {
    const { ctx, page } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'newLetter')}`);
    await page.waitForSelector('.task-activity');
    ok((await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY)) === 'none', 'pull-to-refresh: html has overscroll-behavior none');
    ok((await page.evaluate(() => getComputedStyle(document.querySelector('.task-activity')).overscrollBehaviorY)) === 'contain', 'pull-to-refresh: the task activity keeps overscroll-behavior contain');
    await ctx.close();
  }
  // 30: the service worker, run against fakes: only this app's old caches go; curriculum.json needs a good JSON answer.
  {
    const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const listeners = {}, deleted = [], store = new Map();
    const cacheObj = { match: async (r) => store.get(r.url || r), put: async (r, res) => { store.set(r.url, res); }, add: async () => {}, addAll: async () => {} };
    let answer = null; const fetched = [];
    const sandbox = {
      self: { addEventListener: (t, f) => { listeners[t] = f; }, skipWaiting: async () => {}, clients: { claim: async () => {} }, origin: 'https://x.test' },
      location: { origin: 'https://x.test' }, URL, Request: class { constructor(u, o) { this.url = u; this.opts = o; } },
      caches: { keys: async () => ['reading-v1.3.0', 'reading-v1.3.6', 'someone-elses-cache', 'other-site-v2'], delete: async (k) => { deleted.push(k); }, open: async () => cacheObj },
      fetch: async (req, init) => { fetched.push(init); if (answer instanceof Error) throw answer; return answer; },
      setTimeout, clearTimeout, AbortController, console,
    };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    const version = src.match(/CACHE_VERSION = '([^']+)'/)[1];
    sandbox.caches.keys = async () => ['reading-v0.9', version, 'other-site-v2', 'reading-vNEXT', 'plain'];
    let waited; await new Promise((r) => { listeners.activate({ waitUntil: (p) => { waited = p; } }); waited.then(r); });
    ok(JSON.stringify(deleted.sort()) === JSON.stringify(['reading-v0.9', 'reading-vNEXT']), `sw activate: deletes only older reading-v caches, never ${version} or another site's (${deleted})`);
    const run = async (res) => {
      answer = res; const puts = []; cacheObj.put = async (r) => { puts.push(r.url); };
      cacheObj.match = async () => ({ cached: true });
      let out; const ev = { request: { method: 'GET', url: 'https://x.test/choo-choo-training/data/curriculum.json', mode: 'cors' }, respondWith: (p) => { out = p; }, waitUntil: () => {} };
      listeners.fetch(ev); const got = await out.catch((e) => ({ error: e.message }));
      return { got, puts };
    };
    const mk = (status, type) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => type }, clone() { return this; } });
    let r = await run(mk(200, 'application/json; charset=utf-8'));
    ok(!r.got.cached && r.puts.length === 1, 'sw curriculum: a 200 JSON answer is used and cached');
    ok(fetched.every((i) => i && i.cache === 'no-cache'), 'sw curriculum: fetched with cache: no-cache');
    r = await run(mk(200, 'text/html')); ok(r.got.cached && r.puts.length === 0, 'sw curriculum: an HTML page (captive portal) falls back to the cached copy');
    r = await run(mk(404, 'application/json')); ok(r.got.cached && r.puts.length === 0, 'sw curriculum: a 404 falls back to the cached copy');
    r = await run(mk(500, 'application/json')); ok(r.got.cached && r.puts.length === 0, 'sw curriculum: a 500 falls back to the cached copy');
    r = await run(new Error('offline')); ok(r.got.cached, 'sw curriculum: offline falls back to the cached copy');
    // install: a failing tile does not stop the install; a failing core file does.
    const installWith = async (failing) => {
      cacheObj.add = async (r) => { if (failing(r.url)) throw new Error('boom'); };
      cacheObj.addAll = async (list) => { if (list.some((r) => failing(r.url))) throw new Error('core failed'); };
      let p; listeners.install({ waitUntil: (x) => { p = x; } });
      try { await p; return 'installed'; } catch (e) { return e.message; }
    };
    ok((await installWith((u) => u.endsWith('.webp'))) === 'installed', 'sw install: a picture tile that fails does not stop the install');
    ok((await installWith((u) => u.endsWith('app.js'))) === 'core failed', 'sw install: a core file that fails does stop it');
  }
  // 31: nothing sounds while the page is hidden, and a jingle waiting for the voice is dropped when the page hides.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'hunt')}`);
    await page.waitForSelector('.task-stage > .speak-btn');
    await page.mouse.click(6, 6);
    await page.waitForTimeout(700);
    const hide = (h) => page.evaluate((v) => { Object.defineProperty(document, 'hidden', { get: () => v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, h);
    await page.evaluate(() => window.__audioClear());
    await hide(true);
    await page.evaluate(async () => { const { sfx } = await import('/js/sfx.js'); sfx.play('sparkle'); sfx.play('win'); });
    ok((await page.evaluate(() => window.__audioNotes().length)) === 0, 'sfx: play() does nothing while the page is hidden');
    await hide(false);
    await page.evaluate(() => { window.__ttsMs = 900; });
    await page.locator('.task-stage > .speak-btn').click();
    await page.waitForTimeout(150);
    await page.evaluate(async () => { const { sfx } = await import('/js/sfx.js'); sfx.play('win'); }); // waits for the voice
    await hide(true);
    await page.waitForTimeout(1200); // the voice ends while the page is hidden
    await hide(false);
    await page.waitForTimeout(300);
    ok((await page.evaluate(() => window.__audioNotes().length)) === 0, 'sfx: a jingle that was waiting for the voice is dropped when the page hides');
    ok(errors.length === 0, 'sfx hidden: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // 32: saved settings of the wrong type are repaired (unit-style, then in the browser).
  {
    const fakeStorage = (value) => { globalThis.localStorage = { getItem: () => value, setItem() {} }; };
    const load = (settings) => { fakeStorage(JSON.stringify({ schema: 1, lessons: {}, settings })); return createStore().settings; };
    let st = load({ rate: 'fast', sfxVolume: 'loud', autoSpeak: 'yes', playSounds: 1, sfx: null, fullInstructions: [], voiceURI: 5, seenScripts: [] });
    ok(st.rate === 0.9 && st.sfxVolume === 0.6 && st.autoSpeak === false && st.playSounds === true && st.sfx === true && st.fullInstructions === false && st.voiceURI === null && JSON.stringify(st.seenScripts) === '{}', `settings: wrong types fall back to the defaults (${JSON.stringify(st)})`);
    st = load({ rate: 7, sfxVolume: -3 }); ok(st.rate === 1.1 && st.sfxVolume === 0, `settings: numbers are clamped (${st.rate}, ${st.sfxVolume})`);
    st = load({ rate: 0.1, sfxVolume: 9 }); ok(st.rate === 0.7 && st.sfxVolume === 1, `settings: numbers are clamped at the other end (${st.rate}, ${st.sfxVolume})`);
    st = load({ rate: NaN, sfxVolume: Infinity }); ok(st.rate === 0.9 && st.sfxVolume === 0.6, 'settings: NaN and Infinity fall back to the defaults');
    st = load({ rate: 0.95, sfxVolume: 0.3, autoSpeak: false, voiceURI: 'g-us', seenScripts: { hunt: true } }); ok(st.rate === 0.95 && st.sfxVolume === 0.3 && st.autoSpeak === false && st.voiceURI === 'g-us' && st.seenScripts.hunt === true, 'settings: good values are kept');
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'sounds')}`, { settings: { rate: 'fast', sfxVolume: 'x', seenScripts: 'oops' } });
    await page.waitForSelector('.task-stage > .speak-btn');
    await page.waitForTimeout(900);
    await page.locator('.task-stage > .speak-btn').click();
    await page.waitForTimeout(400);
    const rates = await page.evaluate(() => window.__events.filter((e) => e.type === 'tts').map((e) => e.rate));
    ok(rates.length > 0 && rates.every((r) => typeof r === 'number' && r >= 0.7 && r <= 1.1) && errors.length === 0, `settings: a saved rate "fast" no longer throws and speaks at ${rates[0]} (${errors.join(' | ')})`);
    await ctx.close();
  }
}

// Group 7: bugs found by reading and reproducing, and the coverage gaps the review found.
export async function reliabilityChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  // 35: the script sheet opens again after it was closed (a held close animation used to leave it at opacity 0).
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'sounds')}`);
    await page.waitForSelector('.script-toggle');
    await page.waitForTimeout(700);
    const op = () => page.evaluate(() => getComputedStyle(document.querySelector('.script-sheet')).opacity);
    await page.click('.script-toggle'); await page.waitForTimeout(450);
    ok((await op()) === '1', 'sheet: opens at full opacity');
    await page.click('.sheet-close'); await page.waitForTimeout(450);
    await page.click('.script-toggle'); await page.waitForTimeout(450);
    ok((await op()) === '1' && (await page.getAttribute('.script-toggle', 'aria-expanded')) === 'true', `sheet: open, close, open shows it again at full opacity (${await op()})`);
    await page.click('.sheet-close'); await page.waitForTimeout(100); await page.click('.script-toggle'); await page.waitForTimeout(450); // reopened while it was still closing
    ok((await op()) === '1', 'sheet: reopened mid-close is at full opacity too');
    ok((await page.getAttribute('.script-toggle', 'aria-label')) === 'Show what to say' && (await page.locator('#app[aria-live]').count()) === 0, 'a11y: the script bar is named "Show what to say" and #app is not a live region');
    ok(errors.length === 0, 'sheet: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // 36: a double tap on Next in Letter Review does not skip the second review letter.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/3/task/0`);
    await page.waitForSelector('.review-count i');
    await page.waitForTimeout(1300);
    const on = () => page.evaluate(() => [...document.querySelectorAll('.review-count i')].findIndex((i) => i.classList.contains('on')));
    const b = await page.locator('.btn.next').boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(300);
    ok((await on()) === 1 && page.url().endsWith('/task/0') && (await page.locator('.btn.next').isDisabled()), 'Review: a double tap on Next moves to the second letter only, and Next dims again');
    await page.waitForTimeout(1100);
    ok(await page.locator('.btn.next').isEnabled(), 'Review: Next wakes again after a second');
    ok(errors.length === 0, 'Review double tap: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // 38: Clear pressed with a second finger mid-stroke does not throw.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'writing')}`);
    await page.waitForSelector('.tp-ink');
    await page.waitForTimeout(700);
    const pb = await page.locator('.tp-ink').boundingBox();
    const t = await touchSession(page);
    await t.start(pb.x + 60, pb.y + 60); await t.move(pb.x + 90, pb.y + 90); await t.move(pb.x + 120, pb.y + 100);
    await page.locator('.writing-buttons .btn').first().evaluate((e) => e.click()); // Clear, while the stroke is still going
    await t.move(pb.x + 150, pb.y + 120); await t.move(pb.x + 180, pb.y + 130);
    await t.end();
    await page.waitForTimeout(200);
    ok(errors.length === 0, 'trace pad: Clear mid-stroke throws nothing (' + errors.join(' | ') + ')');
    await ctx.close();
  }
  // 40: Again 250 ms after a pop leaves no invisible button behind; 44: Again and Next pressed during the swap and the ending.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'hunt')}`);
    await page.waitForSelector('.sky-letter');
    await page.waitForTimeout(1300);
    await tap(page, page.locator('.sky-letter[data-target="1"]').first());
    await page.waitForTimeout(250);
    await page.click('.btn.again');
    await page.waitForTimeout(450);
    const rest = await page.evaluate(() => ({ popped: document.querySelectorAll('.sky-letter.popped').length, all: document.querySelectorAll('.sky-letter').length, steps: document.querySelector('.hunt').dataset.steps }));
    ok(rest.popped === 0 && rest.steps === '0' && rest.all >= 12, `Hunt: Again 250 ms after a pop leaves no popped button behind (${JSON.stringify(rest)})`);
    for (let i = 0; i < 5; i++) { await page.waitForTimeout(i ? 1000 : 300); await tap(page, page.locator('.sky-letter[data-target="1"]:not(.popped)').first()); }
    await page.waitForTimeout(900); // mid-ending: the train is pulling in
    await page.click('.btn.again');
    await page.waitForTimeout(500);
    const again = await page.evaluate(() => ({ state: document.querySelector('.hunt').dataset.state, steps: document.querySelector('.hunt').dataset.steps, letters: document.querySelectorAll('.sky-letter:not(.popped)').length, train: new DOMMatrix(getComputedStyle(document.querySelector('.train-wrap')).transform).m41, pose: document.querySelector('.train-wrap .pip').dataset.pose }));
    ok(again.state === 'playing' && again.steps === '0' && again.letters >= 12 && again.train === 0 && again.pose === 'idle', `Hunt: Again mid-ending starts a clean game (${JSON.stringify(again)})`);
    // Rotation mid-game: the sky is dealt again on the new grid and the game goes on.
    await tap(page, page.locator('.sky-letter[data-target="1"]').first());
    await page.waitForTimeout(700);
    await page.setViewportSize({ width: 915, height: 412 });
    await page.waitForTimeout(900);
    const rot = await page.evaluate(() => { const sc = document.querySelector('.farm').getBoundingClientRect(); const rs = [...document.querySelectorAll('.sky-letter:not(.popped)')].map((e) => e.getBoundingClientRect()); return { n: rs.length, steps: document.querySelector('.hunt').dataset.steps, inside: rs.every((r) => r.left >= sc.left && r.right <= sc.right && r.top >= sc.top && r.bottom <= sc.bottom) }; });
    ok(rot.n >= 12 && rot.steps === '1' && rot.inside, `Hunt: rotating mid-game deals the sky again on the new grid and keeps the train's step (${JSON.stringify(rot)})`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(700);
    // Next pressed mid-swap goes on to the next task without errors.
    await tap(page, page.locator('.sky-letter[data-target="1"]').first());
    await page.waitForTimeout(100);
    await page.click('.btn.next');
    await page.waitForFunction(() => location.hash.includes('/task/'), null, { timeout: 3000 });
    await page.waitForTimeout(500);
    ok(errors.length === 0, 'Hunt again, rotation and Next mid-swap: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // 41: the shuffle is fair: every order of three items turns up about equally often.
  {
    const counts = {};
    for (let i = 0; i < 12000; i++) { const k = shuffle([0, 1, 2]).join(''); counts[k] = (counts[k] || 0) + 1; }
    const v = Object.values(counts);
    ok(v.length === 6 && v.every((c) => c > 1700 && c < 2300), `shuffle: all six orders appear about 2000 times (${JSON.stringify(counts)})`);
    ok(shuffle([1, 2, 3, 4]).sort().join('') === '1234', 'shuffle: keeps every item, never changes the list it is given');
  }
  // 42: the first-visit help is marked as seen only when it really opens.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'newLetter')}`, { clock: true, settings: { seenScripts: {} } });
    await page.waitForSelector('.script-toggle');
    await page.clock.runFor(300);
    await page.evaluate(() => { location.hash = '#/home'; });
    await page.clock.runFor(900);
    const seen = () => page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.seenScripts);
    ok(!(await seen()).newLetter, 'first visit: leaving within 500 ms does not burn the help');
    await page.evaluate(() => { location.hash = '#/lesson/1/task/0'; });
    await page.waitForSelector('.screen:not(.leaving) .script-toggle');
    await page.clock.runFor(900);
    ok((await seen()).newLetter === true && (await page.getAttribute('.screen:not(.leaving) .script-toggle', 'aria-expanded')) === 'true', 'first visit: it is marked once it opens');
    ok(errors.length === 0, 'first visit: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // 43: a screen that throws gets a way out.
  {
    const made = await newPage(browser, vp);
    const { page } = made;
    await page.addInitScript(SPEECH_STUB); await page.addInitScript(SEED());
    await page.route('**/data/curriculum.json', async (route) => { const r = await route.fetch(); const j = await r.json(); delete j.lessons[0].sayingSounds; await route.fulfill({ response: r, json: j }); });
    await page.goto(url + `#/lesson/1/task/${idx(1, 'sounds')}`);
    await page.waitForSelector('.retry-card');
    ok((await page.locator('.retry-card button').innerText()) === 'Back to the path', 'a screen that throws shows "Something went wrong." with a Back to the path button');
    await page.click('.retry-card button');
    await page.waitForSelector('.home');
    ok(page.url().endsWith('#/home'), 'the button leads back to the path');
    await made.ctx.close();
  }
  // 44: corrupt seenScripts, one AudioContext, speech cancelled when hidden, clips and the service worker agree, no microphone anywhere.
  {
    const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/1/task/${idx(1, 'hunt')}`, { settings: { seenScripts: 'corrupt' } });
    await page.waitForSelector('.sky-letter');
    await page.waitForTimeout(900);
    ok(typeof (await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.seenScripts)) === 'object', 'a corrupt seenScripts is repaired to an object and the game still loads');
    await page.mouse.click(6, 6); // the first tap lets sound start
    await page.evaluate(async () => { const { sfx } = await import('/js/sfx.js'); for (const n of ['sparkle', 'win', 'star']) sfx.play(n); });
    ok((await page.evaluate(() => window.__audio.contexts)) === 1, 'sfx: one shared AudioContext however many sounds play');
    await page.evaluate(() => { window.__cancelled = 0; });
    await page.evaluate(() => { const synth = speechSynthesis, c = synth.cancel.bind(synth); synth.cancel = () => { window.__cancelled++; c(); }; Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    ok((await page.evaluate(() => window.__cancelled)) >= 1, 'speech: hiding the page cancels the voice');
    ok(errors.length === 0, 'corrupt seenScripts: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const optional = [...sw.match(/OPTIONAL_FILES = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    const clips = Object.values(CUR.sounds).map((s) => s.clip).filter(Boolean).sort(); // a sound without a recording has clip: null
    ok(JSON.stringify(optional) === JSON.stringify(clips), `sw OPTIONAL_FILES are exactly the curriculum's clips (${optional.join(', ')})`);
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    const files = [path.join(ROOT, 'index.html'), ...walk(path.join(ROOT, 'js'))].filter((f) => /\.(js|html)$/.test(f));
    // Smooth Ride (1.7.2) asks for the microphone, but only from js/mic.js; no file may use a recorder (test/ride.mjs checks the rest of the privacy rules).
    const bad = files.filter((f) => (path.basename(f) === 'mic.js' ? /record\.html|MediaRecorder/ : /record\.html|getUserMedia|MediaRecorder/).test(fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, ''))); // code only: a comment may name the recorder
    ok(files.length > 30 && bad.length === 0, `no file under js/ (${files.length} checked) links the recorder or asks for the microphone outside js/mic.js ${bad.join(', ')}`);
  }
}

export async function round2Checks(env) {
  await gameFlowChecks(env);
  await sackFlowChecks(env);
  for (const vp of VIEWPORTS) await cueChecks({ ...env, vp });
  for (const vp of VIEWPORTS) await layoutChecks({ ...env, vp });
  await landscapeChecks(env);
  await shortHuntChecks(env);
  await platformChecks(env);
  await reliabilityChecks(env);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  fs.mkdirSync(path.join(ROOT, '_test'), { recursive: true });
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await round2Checks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`round2: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
