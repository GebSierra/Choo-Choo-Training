// The three tap games (Green Light, Wagon Parade, Station Board) and the lesson rotation that places them.
// They reach a game through a routed copy of data/curriculum.json that gives one lesson a `games` list (see open()).
// Run alone with `node test/tap-games.mjs`; SHOTS=1 also saves screenshots to docs/screenshots/v19/.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN, DONE_JSON } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

const SHOT_DIR = path.join(ROOT, 'docs/screenshots/v19');
const RAF_COUNT = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const rects = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }), sel);
const overlaps = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const anyOverlap = (list) => list.some((a, i) => list.slice(i + 1).some((b) => overlaps(a, b)));
const inside = (r, o) => r.x >= o.x - 1 && r.y >= o.y - 1 && r.x + r.w <= o.x + o.w + 1 && r.y + r.h <= o.y + o.h + 1;
const clips = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'clip').map((e) => e.src));
const ttsAll = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'tts').map((e) => e.text));
const popCount = (page) => page.evaluate(() => window.__audioNotes().filter((n) => n.event === 'pop').length);
const unlock = (page) => page.mouse.click(3, 3);

// Opens a game: lesson `n` is given `games` (and sounds can be given other clip paths) in a routed copy of the curriculum.
export async function open(browser, url, vp, { n, type, games, settings = {}, clipsPatch, reduced = false, extra = {} }) {
  const made = await newPage(browser, vp, { ...(reduced ? { reducedMotion: 'reduce' } : {}), ...extra });
  const { page } = made;
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(RAF_COUNT);
  await page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: JSON.parse(DONE_JSON), settings: { seenScripts: SEEN, ...settings }, firstRunDone: true, meetDue: false })}))`);
  const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
  if (games) CUR.lessons[n - 1].games = games;
  for (const [k, v] of Object.entries(clipsPatch || {})) CUR.sounds[k].clip = v;
  if (games || clipsPatch) await page.route('**/data/curriculum.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CUR) }));
  const index = tasksFor(CUR.lessons[n - 1]).find((t) => t.type === type).index;
  await page.goto(url + `#/lesson/${n}/task/${index}`);
  return { ...made, CUR };
}

const state = (page, cls) => page.evaluate((c) => document.querySelector('.' + c).dataset.state, cls);
const roundOf = (page, cls) => page.evaluate((c) => Number(document.querySelector('.' + c).dataset.round), cls);

// After done: 1.5 s of settling, then 3 s of idle: at most 2 animation frames and no endless animation.
async function idleCheck(page, ok, tag) {
  await page.waitForTimeout(1500);
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(3000);
  const frames = (await page.evaluate(() => window.__raf)) - r0;
  const endless = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect.getComputedTiming().endTime === Infinity).length);
  ok(frames <= 2, `${tag}: at most 2 frames while idle (${frames})`);
  ok(endless === 0, `${tag}: no endless animation (${endless})`);
}
const lastButton = (page) => page.evaluate(() => document.querySelector('.btn.next').textContent.trim());
const tapEl = async (page, loc) => { const b = await loc.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
const shotOf = async (page, name) => { if (!process.env.SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };

export async function signalChecks({ browser, url, ok, CUR }) {
  // 1 and 2. Layout at all viewports; one target per round; the first round of lesson 2 is the sound a.
  for (const vp of VIEWPORTS) {
    const { ctx, page, errors } = await open(browser, url, vp, { n: 2, type: 'signals', games: ['signals'] });
    await page.waitForSelector('.signal');
    await page.waitForTimeout(700);
    const tag = `${vp.name} Green Light`;
    const sig = await rects(page, '.signal'), scene = (await rects(page, '.farm'))[0], eng = (await rects(page, '.train-wrap'))[0];
    ok(sig.length === 4, `${tag}: four signal posts`);
    ok(sig.every((r) => r.w >= 72 && r.h >= 72), `${tag}: every post is at least 72 px (${sig.map((r) => Math.round(r.w) + 'x' + Math.round(r.h))})`);
    ok(sig.every((r) => inside(r, scene)), `${tag}: every post is inside the scene`);
    ok(!anyOverlap(sig), `${tag}: posts do not overlap`);
    ok(!sig.some((r) => overlaps(r, eng)), `${tag}: no post sits on the engine`);
    const bell = (await rects(page, '.signal-hear'))[0];
    ok(bell.w >= 72 && !sig.some((r) => overlaps(r, bell)), `${tag}: the bell is 72 px and clear of the posts`);
    await page.evaluate(() => { document.querySelector('.say-prompt').hidden = false; document.querySelector('.say-text').textContent = 'Say: aaa (as in apple)'; });
    const pr = (await rects(page, '.say-prompt'))[0];
    ok(!sig.some((r) => overlaps(r, pr)) && !overlaps(pr, bell), `${tag}: the prompt is clear of the posts and the bell`);
    ok(await page.evaluate(() => { const t = document.querySelector('.task-activity'); return t.scrollHeight <= t.clientHeight + 1; }), `${tag}: the stage does not scroll`);
    const tg = await page.locator('.signal[data-target="1"]').evaluateAll((l) => l.map((b) => b.dataset.letter));
    ok(tg.length === 1 && tg[0] === 'a', `${tag}: exactly one target and it is a (${tg})`);
    ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  const vp = VIEWPORTS[0];
  // 3. Clip path.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { n: 2, type: 'signals', games: ['signals'], settings: { playSounds: true } });
    await page.waitForSelector('.signal');
    await unlock(page);
    await tapEl(page, page.locator('.signal-hear'));
    await page.waitForFunction(() => window.__events.some((e) => e.type === 'clip' && e.src === 'a.mp3'), null, { timeout: 2000 }).catch(() => {});
    ok((await clips(page)).includes('a.mp3'), 'Green Light clip path: a.mp3 played');
    await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.querySelector('.say-prompt').hidden), 'Green Light clip path: the prompt is hidden');
    ok((await ttsAll(page)).every((t) => !/^\s*a+\s*$/i.test(t)), 'Green Light clip path: no bare sound spoken by the phone voice');
    ok(errors.length === 0, 'Green Light clip path: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // 4. Prompt path.
  {
    const { ctx, page } = await open(browser, url, vp, { n: 2, type: 'signals', games: ['signals'], settings: { playSounds: false } });
    await page.waitForSelector('.signal');
    await unlock(page);
    await page.waitForSelector('.say-prompt:not([hidden])', { timeout: 3000 });
    const t = await page.evaluate(() => ({ text: document.querySelector('.say-text').textContent, key: document.querySelector('.say-prompt').dataset.key }));
    ok(t.text === 'Say: aaa (as in apple)' && t.key === 'a', `Green Light prompt path: "${t.text}"`);
    ok((await clips(page)).length === 0, 'Green Light prompt path: no clip played');
    await ctx.close();
  }
  // 5. Missing recording: the prompt appears after the failed attempt.
  {
    const { ctx, page } = await open(browser, url, vp, { n: 2, type: 'signals', games: ['signals'], settings: { playSounds: true }, clipsPatch: { a: 'assets/audio/sounds/none.mp3' } });
    await page.waitForSelector('.signal');
    await unlock(page);
    await tapEl(page, page.locator('.signal-hear'));
    await page.waitForSelector('.say-prompt:not([hidden])', { timeout: 3000 });
    ok(await page.evaluate(() => document.querySelector('.say-text').textContent === 'Say: aaa (as in apple)'), 'Green Light missing recording: the prompt shows after the failed attempt');
    await ctx.close();
  }
  // 6, 7, 8. Wrong tap, right taps, done, idle.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { n: 2, type: 'signals', games: ['signals'], settings: { playSounds: true } });
    await page.waitForSelector('.signal');
    await page.waitForTimeout(700);
    await unlock(page);
    const c0 = (await clips(page)).length, p0 = await popCount(page);
    await tapEl(page, page.locator('.signal[data-target="0"]').first());
    await page.waitForTimeout(700);
    ok((await roundOf(page, 'signals')) === 0 && (await popCount(page)) === p0, 'Green Light: a wrong tap leaves the round and adds no pop');
    ok((await clips(page)).length === c0 + 1, 'Green Light: a wrong tap plays the sound again');
    ok(await page.evaluate(() => !document.querySelector('.signal.go')), 'Green Light: a wrong tap turns no lamp green');
    let lastSlot = -1, moved = 0;
    for (let r = 1; r <= 5; r++) {
      const slot = await page.evaluate(() => [...document.querySelectorAll('.signal')].findIndex((b) => b.dataset.target === '1'));
      if (slot !== lastSlot) moved++;
      lastSlot = slot;
      const want = await page.evaluate((i) => document.querySelectorAll('.signal')[i].dataset.letter, slot);
      ok(r === 1 ? want === 'a' : true, `Green Light round ${r} target ${want}`);
      if (r === 1) await shotOf(page, 'signals-playing');
      await tapEl(page, page.locator('.signal[data-target="1"]'));
      await page.waitForTimeout(250);
      ok(await page.evaluate(() => !!document.querySelector('.signal.go')), `Green Light: the right lamp turns green (round ${r})`);
      ok((await roundOf(page, 'signals')) === r, `Green Light: round ${r} counted`);
      if (r < 5) await page.waitForTimeout(1100);
    }
    ok(moved === 5, `Green Light: the target slot changes between rounds (${moved})`);
    await page.waitForFunction(() => document.querySelector('.signals').dataset.state === 'done', null, { timeout: 6000 }).catch(() => {});
    ok((await state(page, 'signals')) === 'done', 'Green Light: five rounds reach done');
    ok(/Next|Finish/.test(await lastButton(page)), 'Green Light: the shell button reads Next or Finish');
    await shotOf(page, 'signals-done');
    await idleCheck(page, ok, 'Green Light done');
    ok(errors.length === 0, 'Green Light play: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // 7b. Short count: with two games in the slot there are three rounds. (Barn Doors stands in until A2.)
  {
    const { ctx, page } = await open(browser, url, vp, { n: 2, type: 'signals', games: ['signals', 'hunt'] });
    await page.waitForSelector('.signal');
    await page.waitForTimeout(600);
    for (let r = 1; r <= 3; r++) { await tapEl(page, page.locator('.signal[data-target="1"]')); await page.waitForTimeout(r < 3 ? 1100 : 300); }
    await page.waitForFunction(() => document.querySelector('.signals').dataset.state === 'done', null, { timeout: 6000 }).catch(() => {});
    ok((await state(page, 'signals')) === 'done', 'Green Light: three rounds when it shares the slot');
    await ctx.close();
  }
  // 9. Reduced motion.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { n: 2, type: 'signals', games: ['signals'], reduced: true });
    await page.waitForSelector('.signal');
    await page.waitForTimeout(600);
    for (let r = 1; r <= 5; r++) { await tapEl(page, page.locator('.signal[data-target="1"]')); await page.waitForTimeout(r < 5 ? 1100 : 300); }
    await page.waitForFunction(() => document.querySelector('.signals').dataset.state === 'done', null, { timeout: 6000 }).catch(() => {});
    ok((await state(page, 'signals')) === 'done', 'Green Light reduced motion: done after all rounds');
    await idleCheck(page, ok, 'Green Light reduced');
    ok(errors.length === 0, 'Green Light reduced: errors ' + errors.join(' | '));
    await ctx.close();
  }
}

// Screenshots for looking at: each game at 390x844 and 360x640 (SHOTS=1).
const SHOT_VPS = [{ name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 }, { name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 }];
export async function screenshots({ browser, url }) {
  for (const vp of SHOT_VPS) {
    for (const g of SHOT_GAMES) {
      const { ctx, page } = await open(browser, url, vp, { n: g.n, type: g.type, games: [g.type], settings: { playSounds: false } });
      await page.waitForSelector(g.ready);
      await unlock(page);
      await page.waitForTimeout(1500);
      await shotOf(page, `${g.type}-${vp.name}`);
      if (g.after) { await g.after(page); await page.waitForTimeout(500); await shotOf(page, `${g.type}-${vp.name}-tap`); }
      await ctx.close();
    }
  }
}
const SHOT_GAMES = [
  { n: 2, type: 'signals', ready: '.signal', after: async (page) => { await tapEl(page, page.locator('.signal[data-target="1"]')); } },
];

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  if (process.env.SHOTS) await screenshots({ browser, url });
  await signalChecks({ browser, url, ok, CUR });
  await browser.close(); server.close();
  console.log(`tap-games: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
