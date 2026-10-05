// The three tap games (Green Light, Wagon Parade, Station Board) and the lesson rotation that places them.
// They reach a game through a routed copy of data/curriculum.json that gives one lesson a `games` list (see open()).
// Run alone with `node test/tap-games.mjs`; SHOTS=1 also saves screenshots to docs/screenshots/v19/.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB, silentWav } from './stubs.mjs';
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
  // A clip patched to a path with no file behind it is given a silent stand-in, so the recorded path can be tested.
  for (const k of Object.keys(clipsPatch || {})) if (!/none|missing/.test(clipsPatch[k]) && !fs.existsSync(path.join(ROOT, clipsPatch[k]))) await page.route('**/' + clipsPatch[k], (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }));
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
  // 7b. Short count: with two games in the slot there are three rounds. 
  {
    const { ctx, page } = await open(browser, url, vp, { n: 2, type: 'signals', games: ['signals', 'wagons'] });
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


export async function wagonChecks({ browser, url, ok, CUR }) {
  const vp = VIEWPORTS[0];
  const dist = new Set(['m', ...CUR.games.hunt.distractors.m]);
  const waitDone = (page) => page.waitForFunction(() => document.querySelector('.wagons').dataset.state === 'done', null, { timeout: 30000 }).catch(() => {});
  // Layout at all viewports, and the parade's letters (lesson 1).
  for (const v of VIEWPORTS) {
    const { ctx, page, errors } = await open(browser, url, v, { n: 1, type: 'wagons', games: ['wagons'] });
    await page.waitForSelector('.parade-wagon');
    await page.waitForTimeout(700);
    const tag = `${v.name} Wagon Parade`;
    const ws = await rects(page, '.parade-wagon');
    ok(ws.length === 8 && ws.every((r) => r.w >= 72 && r.h >= 72), `${tag}: eight wagons, each at least 72 px`);
    const letters = await page.locator('.parade-wagon').evaluateAll((l) => l.map((b) => b.dataset.letter));
    ok(letters.every((l) => dist.has(l)) && !letters.includes('n'), `${tag}: letters are m or a Hunt distractor of m, never n (${letters.join('')})`);
    const tgt = await page.locator('.parade-wagon').evaluateAll((l) => l.map((b) => b.dataset.target));
    ok(tgt.filter((t) => t === '1').length === 3 && !tgt.some((t, i) => t === '1' && tgt[i + 1] === '1'), `${tag}: three targets, never side by side (${tgt.join('')})`);
    const scene = (await rects(page, '.farm'))[0];
    const vis = (await rects(page, '.parade-wagon')).filter((r) => r.x >= scene.x && r.x + r.w <= scene.x + scene.w);
    ok(vis.length >= 2, `${tag}: at least two wagons are in view`);
    ok(vis.every((r) => inside(r, scene)), `${tag}: visible wagons are inside the scene`);
    ok(await page.evaluate(() => { const t = document.querySelector('.task-activity'); return t.scrollHeight <= t.clientHeight + 1; }), `${tag}: the stage does not scroll`);
    ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Motion, every tap plays the sound, wrong tap, right taps, rAF stops, done.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { n: 1, type: 'wagons', games: ['wagons'], settings: { playSounds: true } });
    await page.waitForSelector('.parade-wagon');
    await unlock(page);
    await page.waitForTimeout(900);
    const x0 = (await rects(page, '.parade-wagon[data-target="1"]'))[0].x;
    await page.waitForTimeout(500);
    const x1 = (await rects(page, '.parade-wagon[data-target="1"]'))[0].x;
    ok(Math.abs(x1 - x0) > 5, `Wagon Parade: a wagon moves (${Math.round(x0)} to ${Math.round(x1)})`);
    await shotOf(page, 'wagons-playing');
    // a wrong tap: the wagon under the finger right now
    const aim = async (sel) => page.evaluate((s) => { const l = [...document.querySelectorAll(s)].map((b) => b.getBoundingClientRect()).filter((r) => r.left > 6 && r.right < innerWidth - 6 && r.top > 0); const r = l[0]; return r ? { x: r.x + r.width / 2, y: r.y + r.height * 0.7 } : null; }, sel);
    let w = null;
    for (let i = 0; i < 40 && !w; i++) { w = await aim('.parade-wagon[data-target="0"]'); if (!w) await page.waitForTimeout(250); }
    const c0 = (await clips(page)).length, p0 = await popCount(page);
    await page.touchscreen.tap(w.x, w.y);
    await page.waitForTimeout(250);
    ok((await page.locator('.no-x').count()) >= 1, 'Wagon Parade: a wrong tap shows a soft red cross');
    ok((await popCount(page)) === p0 && (await roundOf(page, 'wagons')) === 0, 'Wagon Parade: a wrong tap adds no pop and leaves the round');
    ok((await clips(page)).length === c0 + 1 && (await clips(page)).every((c) => c === 'm.mp3'), 'Wagon Parade: a wrong tap plays m.mp3 too');
    // right taps: three targets in the first parade
    const gone = () => page.locator('.parade-wagon[style*="pointer-events"]').count();
    let got = 0;
    for (let i = 0; i < 100 && got < 3; i++) {
      const t = await aim('.parade-wagon[data-target="1"]:not([style*="pointer-events"])');
      if (!t) { await page.waitForTimeout(200); continue; }
      const n0 = (await clips(page)).length;
      await page.touchscreen.tap(t.x, t.y);
      await page.waitForTimeout(450);
      const g = await gone().catch(() => 3);
      if (g > got || (await roundOf(page, 'wagons')) === 1) { got++; ok((await clips(page)).length === n0 + 1, `Wagon Parade: right tap ${got} plays the sound`); }
    }
    ok(got === 3, `Wagon Parade: three targets tapped (${got})`);
    await page.waitForTimeout(100);
    // between parades the loop stops: at most 2 frames in 600 ms
    const f0 = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(250);
    const frames = (await page.evaluate(() => window.__raf)) - f0;
    ok(frames <= 2, `Wagon Parade: no frames between parades (${frames})`);
    ok((await roundOf(page, 'wagons')) === 1, 'Wagon Parade: three right taps finish the parade');
    // the other two parades
    for (let p = 2; p <= 3; p++) {
      await page.waitForFunction((k) => Number(document.querySelector('.wagons').dataset.round) === k - 1 && !document.querySelector('.parade-wagon[style*="pointer-events"]'), p, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(700);
      for (let i = 0; i < 150 && (await roundOf(page, 'wagons')) < p; i++) {
        const t = await aim('.parade-wagon[data-target="1"]:not([style*="pointer-events"])');
        if (t) { await page.touchscreen.tap(t.x, t.y); await page.waitForTimeout(350); } else await page.waitForTimeout(200);
      }
    }
    await waitDone(page);
    ok((await state(page, 'wagons')) === 'done', 'Wagon Parade: three parades reach done');
    ok(/Next|Finish/.test(await lastButton(page)), 'Wagon Parade: the shell button reads Next or Finish');
    await shotOf(page, 'wagons-done');
    await idleCheck(page, ok, 'Wagon Parade done');
    ok(errors.length === 0, 'Wagon Parade play: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // Prompt path.
  {
    const { ctx, page } = await open(browser, url, vp, { n: 1, type: 'wagons', games: ['wagons'], settings: { playSounds: false } });
    await page.waitForSelector('.parade-wagon');
    await unlock(page);
    await page.waitForSelector('.say-prompt:not([hidden])', { timeout: 3000 });
    ok(await page.evaluate(() => document.querySelector('.say-text').textContent === 'Say: mmm'), 'Wagon Parade prompt path: "Say: mmm"');
    ok((await clips(page)).length === 0, 'Wagon Parade prompt path: no clip');
    await ctx.close();
  }
  // Reduced motion: wagons stand still, few frames, done.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { n: 1, type: 'wagons', games: ['wagons'], reduced: true });
    await page.waitForSelector('.parade-wagon');
    await page.waitForTimeout(700);
    const ws = await rects(page, '.parade-wagon'), scene = (await rects(page, '.farm'))[0];
    ok(ws.length === 8 && ws.every((r) => r.w >= 72 && r.h >= 72 && inside(r, scene)), 'Wagon Parade reduced: eight wagons, at least 72 px, inside the scene');
    const x0 = (await rects(page, '.parade-wagon'))[2].x;
    const f0 = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(1000);
    ok(Math.abs((await rects(page, '.parade-wagon'))[2].x - x0) < 0.5, 'Wagon Parade reduced: wagons do not move');
    await page.waitForTimeout(2000);
    ok((await page.evaluate(() => window.__raf)) - f0 <= 2, 'Wagon Parade reduced: at most 2 frames mid-round');
    await shotOf(page, 'wagons-reduced');
    for (let p = 1; p <= 3; p++) {
      for (let n = 0; n < 3; n++) { await tapEl(page, page.locator('.parade-wagon[data-target="1"]:not([style*="pointer-events"])').first()); await page.waitForTimeout(450); }
      await page.waitForTimeout(1300);
    }
    await waitDone(page);
    ok((await state(page, 'wagons')) === 'done', 'Wagon Parade reduced: done after all parades');
    ok(errors.length === 0, 'Wagon Parade reduced: errors ' + errors.join(' | '));
    await ctx.close();
  }
}

export async function boardChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  const spelled = (page) => page.evaluate(() => [...document.querySelectorAll('.flap-tile')].map((b) => b.dataset.letter).join(''));
  const waitWord = (page, w) => page.waitForFunction((x) => document.querySelector('.board-game').dataset.word === x, w, { timeout: 4000 }).catch(() => {});
  const stable = (page, w) => page.waitForFunction((x) => { const t = [...document.querySelectorAll('.flap-tile')]; return t.map((b) => b.dataset.letter).join('') === x && document.getAnimations().filter((a) => a.effect && /rotateX/.test(JSON.stringify(a.effect.getKeyframes()))).length === 0; }, w, { timeout: 4000 }).catch(() => {});
  for (const v of VIEWPORTS) {
    const { ctx, page, errors } = await open(browser, url, v, { n: 5, type: 'board', games: ['board'] });
    await page.waitForSelector('.flap-tile');
    await page.waitForTimeout(600);
    const tag = `${v.name} Station Board`;
    const t = await rects(page, '.flap-tile'), board = (await rects(page, '.flap-board'))[0], scene = (await rects(page, '.farm'))[0];
    ok((await spelled(page)) === 'sat', `${tag}: the tiles spell sat`);
    ok(t.every((r) => r.w >= 72 && r.h >= 72 && inside(r, board) && inside(r, scene) && r.x >= 0 && r.x + r.w <= v.width), `${tag}: tiles are at least 72 px, inside the board, the scene and the screen (${t.map((r) => Math.round(r.w) + 'x' + Math.round(r.h))})`);
    ok(inside(board, scene), `${tag}: the board is inside the scene`);
    await page.evaluate(() => { document.querySelector('.say-prompt').hidden = false; document.querySelector('.say-text').textContent = 'Say: This is sat. Tap t-.'; });
    const pr = (await rects(page, '.say-prompt'))[0], bell = (await rects(page, '.say-hear'))[0], eng = (await rects(page, '.train-wrap'))[0];
    ok(!overlaps(pr, board) && !overlaps(bell, board) && !overlaps(board, eng) && !overlaps(pr, bell), `${tag}: prompt, bell, board and engine do not overlap`);
    ok(await page.evaluate(() => { const a = document.querySelector('.task-activity'); return a.scrollHeight <= a.clientHeight + 1; }), `${tag}: the stage does not scroll`);
    ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Prompt path, wrong and right taps through four words.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { n: 5, type: 'board', games: ['board'], settings: { playSounds: false } });
    await page.waitForSelector('.flap-tile');
    await unlock(page);
    await page.waitForSelector('.say-prompt:not([hidden])', { timeout: 3000 });
    ok(await page.evaluate(() => document.querySelector('.say-text').textContent === 'Say: This is sat. Tap t-.'), 'Station Board prompt path: "Say: This is sat. Tap t-."');
    ok((await ttsAll(page)).every((x) => !/sat/.test(x)), 'Station Board: the word is never sent to text to speech');
    await tapEl(page, page.locator('.flap-tile[data-target="0"]').first());
    await page.waitForTimeout(500);
    ok((await spelled(page)) === 'sat' && (await roundOf(page, 'board-game')) === 0, 'Station Board: a wrong tap leaves the round');
    for (const [i, w] of ['sit', 'it', 'mist'].entries()) {
      await tapEl(page, page.locator('.flap-tile[data-target="1"]'));
      await waitWord(page, w); await stable(page, w);
      ok((await spelled(page)) === w, `Station Board: round ${i + 2} spells ${w}`);
      if (i === 0) await shotOf(page, 'board-playing');
      await page.waitForTimeout(150);
    }
    await tapEl(page, page.locator('.flap-tile[data-target="1"]'));
    await page.waitForFunction(() => document.querySelector('.board-game').dataset.state === 'done', null, { timeout: 8000 }).catch(() => {});
    ok((await state(page, 'board-game')) === 'done', 'Station Board: four words reach done');
    ok(/Next|Finish/.test(await lastButton(page)), 'Station Board: the shell button reads Next or Finish');
    await shotOf(page, 'board-done');
    await idleCheck(page, ok, 'Station Board done');
    ok(errors.length === 0, 'Station Board play: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // Recorded path.
  {
    const { ctx, page } = await open(browser, url, vp, { n: 5, type: 'board', games: ['board'], settings: { playSounds: true }, clipsPatch: { t: 'assets/audio/sounds/t.mp3' } });
    await page.waitForSelector('.flap-tile');
    await unlock(page);
    await tapEl(page, page.locator('.say-hear'));
    await page.waitForFunction(() => window.__events.some((e) => e.type === 'clip' && e.src === 't.mp3'), null, { timeout: 2500 }).catch(() => {});
    ok((await clips(page)).includes('t.mp3'), 'Station Board recorded path: t.mp3 played');
    await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.querySelector('.say-text').textContent === 'Say: This is sat.'), 'Station Board recorded path: the prompt reads "Say: This is sat."');
    await ctx.close();
  }
  // Reduced motion: no flip.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { n: 5, type: 'board', games: ['board'], reduced: true });
    await page.waitForSelector('.flap-tile');
    await page.waitForTimeout(600);
    let flips = 0;
    for (let i = 0; i < 4; i++) {
      await tapEl(page, page.locator('.flap-tile[data-target="1"]'));
      await page.waitForTimeout(500);
      flips += await page.evaluate(() => document.getAnimations().filter((a) => a.effect && /rotateX/.test(JSON.stringify(a.effect.getKeyframes()))).length);
      await page.waitForTimeout(700);
    }
    await page.waitForFunction(() => document.querySelector('.board-game').dataset.state === 'done', null, { timeout: 6000 }).catch(() => {});
    ok(flips === 0, `Station Board reduced: no flip animations (${flips})`);
    ok((await state(page, 'board-game')) === 'done', 'Station Board reduced: done');
    ok(errors.length === 0, 'Station Board reduced: errors ' + errors.join(' | '));
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
  { n: 1, type: 'wagons', ready: '.parade-wagon' },
  { n: 5, type: 'board', ready: '.flap-tile', after: async (page) => { await tapEl(page, page.locator('.flap-tile[data-target="1"]')); } },
];

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  if (process.env.SHOTS) await screenshots({ browser, url });
  await signalChecks({ browser, url, ok, CUR });
  await wagonChecks({ browser, url, ok, CUR });
  await boardChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`tap-games: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
