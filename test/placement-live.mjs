// The placement check for new accounts: the grown-up card after the character creator (shown once, only to a new child),
// the Grownups button for everyone, and "Start here" only moving forward. Run alone with `node test/placement-live.mjs`;
// SHOTS=1 saves screenshots in docs/screenshots/placement-live/.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, doneThrough } from './lib.mjs';

const SHOT_DIR = path.join(ROOT, 'docs/screenshots/placement-live');
const PHONE = { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 };
const SMALL = { name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 };
const LAND = { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 };
let checks = 0, failures = 0;
const ok = (c, m) => { checks++; if (!c) { failures++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1') || 'null'));
const tap = async (page, s) => { const l = page.locator(s).first(); await l.scrollIntoViewIfNeeded(); const b = await l.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };

async function fresh(browser, url, vp, seedState = null) {
  const made = await newPage(browser, vp);
  await made.page.addInitScript(SPEECH_STUB);
  if (seedState) await made.page.addInitScript(`if (!localStorage.getItem('reading.v1')) localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(seedState))})`);
  await made.page.goto(url + '#/home');
  return made;
}
// welcome card -> character creator -> "All aboard"
async function throughCreator(page) {
  await page.waitForSelector('.welcome'); await page.waitForTimeout(700);
  await page.click('.wc-skip'); await page.waitForSelector('.cp'); await page.waitForTimeout(600);
  await page.click('.cp-done'); await page.waitForTimeout(900);
}
const settled = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));

const { server, url } = await startServer();
const pw = await loadPlaywright();
const browser = await launch(pw);
try {
  // 1. A new child sees the offer once, after the creator.
  for (const vp of [PHONE, SMALL, LAND]) {
    const { ctx, page, errors } = await fresh(browser, url, vp);
    await throughCreator(page);
    await page.waitForSelector('.first-card.offer'); await settled(page);
    const t = await page.locator('.first-card.offer').innerText();
    ok(/Where should we start\?/.test(t) && /about 5 minutes, you and your child together/.test(t) && /Or start at lesson 1\./.test(t), `${vp.name}: the offer card text`);
    ok(!/research|study|studies|privacy|data|proven/i.test(t), `${vp.name}: neutral, no research or privacy text`);
    const m = await page.evaluate(() => { const c = document.querySelector('.first-card.offer').getBoundingClientRect(); return { top: c.top, bottom: c.bottom, right: c.right, vh: innerHeight, vw: innerWidth, hs: document.documentElement.scrollWidth > innerWidth, btns: [...document.querySelectorAll('.first-card.offer .btn')].map((b) => Math.round(b.getBoundingClientRect().height)) }; });
    ok(m.top >= 0 && m.bottom <= m.vh && m.right <= m.vw && !m.hs && m.btns.length === 2 && m.btns.every((h) => h >= 48), `${vp.name}: fits, two 48 px buttons (${JSON.stringify(m)})`);
    if (process.env.SHOTS && vp !== LAND) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, `offer-${vp.name}.png`) }); }
    if (vp === PHONE) {
      ok(((await page.evaluate(() => window.__events || [])).filter((e) => e.type === 'tts')).length === 0, 'the offer card is not spoken');
      await tap(page, '.offer-start'); await page.waitForTimeout(500);
      ok((await page.locator('.first-run').count()) === 0 && page.url().endsWith('#/home'), 'Start at lesson 1: back to Home');
      ok((await stored(page)).settings.placementOffered === true, 'Start at lesson 1: the offer is marked answered');
      await page.reload(); await page.waitForTimeout(1200);
      ok((await page.locator('.first-card.offer').count()) === 0, 'not offered again after a reload');
    }
    ok(errors.length === 0, `${vp.name}: no errors ${errors.join('|')}`);
    await ctx.close();
  }
  // 2. "Take the short check" opens it; Do this later goes Home; never offered again.
  {
    const { ctx, page } = await fresh(browser, url, PHONE);
    await throughCreator(page); await page.waitForSelector('.first-card.offer'); await settled(page);
    await tap(page, '.offer-check'); await page.waitForSelector('.proto.placement .pc-begin');
    ok(page.url().endsWith('#/proto/placement') && (await stored(page)).settings.placementOffered === true, 'Take the short check: opens the check and marks it answered');
    await tap(page, '.pc-later'); await page.waitForTimeout(900);
    ok(page.url().endsWith('#/home') && (await page.locator('.first-card.offer').count()) === 0, 'Do this later: Home, no offer again');
    await ctx.close();
  }
  // 2b. Offer pending (closed on the card) comes back; the check from the offer, all "Not yet", "Start from the beginning" goes Home.
  {
    const { ctx, page } = await fresh(browser, url, PHONE, { schema: 1, lessons: {}, settings: { migrated1912: true, placementOffered: false }, firstRunDone: true, meetDue: false });
    await page.waitForSelector('.first-card.offer'); await settled(page);
    ok(true, 'finished welcome and creator but not answered: the offer shows again');
    await tap(page, '.offer-check'); await page.waitForSelector('.pc-begin'); await tap(page, '.pc-begin'); await page.waitForSelector('.rc-card');
    for (let i = 0; i < 40 && !(await page.locator('.pc-over').count()); i++) {
      if (await page.locator('.pc-go').count()) { await tap(page, '.pc-go'); await page.waitForTimeout(250); continue; }
      await page.waitForSelector('.judge-bar:not([hidden]), .pc-over', { timeout: 5000 }); await page.waitForTimeout(300);
      if (await page.locator('.judge-btn.help').count()) await tap(page, '.judge-btn.help'); await page.waitForTimeout(150);
    }
    await page.waitForSelector('.pc-over');
    await tap(page, '.pc-over'); await page.waitForTimeout(700);
    ok(page.url().endsWith('#/home'), 'Start from the beginning: Home');
    await ctx.close();
  }
  // 3. Existing children never see it (progress, or only a finished welcome), and a cloud copy with progress is not offered.
  for (const [name, st, offeredAfter] of [
    ['progress, no flag', { schema: 1, lessons: doneThrough(3), settings: { migrated1912: true }, firstRunDone: true, meetDue: false }, true],
    ['finished welcome only, no flag', { schema: 1, lessons: {}, settings: { migrated1912: true }, firstRunDone: true, meetDue: false }, true],
    ['cloud copy with progress (first run not recorded)', { schema: 1, lessons: doneThrough(2), settings: { migrated1912: true }, meetDue: false }, true],
    ['flag false but a lesson done', { schema: 1, lessons: doneThrough(1), settings: { migrated1912: true, placementOffered: false }, firstRunDone: true, meetDue: false }, false],
  ]) {
    const { ctx, page } = await fresh(browser, url, PHONE, st);
    await page.waitForTimeout(1800);
    ok((await page.locator('.first-card.offer').count()) === 0, `existing child (${name}): no offer`);
    const s = await stored(page);
    ok(s.settings.placementOffered === offeredAfter, `existing child (${name}): flag ${offeredAfter}`);
    await ctx.close();
  }
  // 4. Grownups button for everyone, re-takeable; the check never writes by itself.
  for (const vp of [PHONE, SMALL, LAND]) {
    const st = { schema: 1, lessons: doneThrough(12), settings: { migrated1912: true }, firstRunDone: true, meetDue: false };
    const { ctx, page } = await fresh(browser, url, vp, st);
    await page.waitForSelector('.pill-hold'); await page.waitForTimeout(900);
    const gb = await page.locator('.pill-hold').boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up();
    await page.waitForSelector('.grownups'); await page.waitForTimeout(400);
    await page.waitForSelector('.gu-place-btn');
    const b = await page.locator('.gu-place-btn').boundingBox();
    ok((await page.locator('.gu-place-btn').innerText()) === 'Placement check: find the right starting lesson' && b.height >= 48 && b.x >= 0 && b.x + b.width <= vp.width, `${vp.name}: Grownups button, 48 px, fits (${Math.round(b.height)})`);
    if (process.env.SHOTS) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.locator('.gu-place-btn').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(SHOT_DIR, `grownups-button-${vp.name}.png`) }); }
    if (vp === PHONE) {
      const before = JSON.stringify(await stored(page));
      await tap(page, '.gu-place-btn'); await page.waitForSelector('.pc-begin');
      await tap(page, '.pc-later'); await page.waitForSelector('.grownups', { timeout: 5000 });
      ok(page.url().endsWith('#/grownups'), 'from Grownups: Do this later returns to Grownups');
      ok(JSON.stringify((await stored(page)).lessons) === JSON.stringify(JSON.parse(before).lessons), 'the check changes nothing by itself');
    }
    await ctx.close();
  }
  // 5. The curriculum and the store: never past the last built lesson; Start here only moves forward.
  {
    const { ctx, page } = await fresh(browser, url, PHONE, { schema: 1, lessons: doneThrough(12), settings: { migrated1912: true }, firstRunDone: true, meetDue: false });
    await page.waitForTimeout(800);
    const r = await page.evaluate(async () => {
      const { computeResult } = await import('/js/screens/proto-placement.js');
      const cur = await (await fetch('/data/curriculum.json')).json();
      const lessons = cur.lessons.map((l) => ({ number: l.number, sound: l.sound }));
      const all = computeResult({ lessons, known: new Set(lessons.map((l) => l.sound)) });
      const none = computeResult({ lessons, known: new Set() });
      const { createStore } = await import('/js/store.js');
      const s = createStore();
      const before = JSON.stringify(s.state.lessons);
      s.placeAt(5, cur.checkpoints || []);
      const same = JSON.stringify(s.state.lessons) === before;
      s.placeAt(15, cur.checkpoints || []);
      return { last: lessons.length, all: all.number, none: none.number, same, d1: s.isDone(1), d12: s.isDone(12), d14: s.isDone(14), d15: s.isDone(15), placed12: !!s.state.lessons[12].placed, placed14: !!s.state.lessons[14].placed };
    });
    ok(r.all === r.last && r.none === 1, `all known suggests the last built lesson (${r.all} of ${r.last}), nothing known suggests 1`);
    ok(r.same && r.d12 && !r.placed12, 'Start here at an earlier lesson changes nothing (finished lessons stay as they were)');
    ok(r.d14 && !r.d15 && r.placed14 && r.d1, 'Start here at a later lesson marks only the lessons before it as placed');
    await ctx.close();
  }
} finally { await browser.close(); server.close(); }
console.log(`placement-live: ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
