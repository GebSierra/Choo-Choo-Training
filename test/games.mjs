// The Letter Hunt lesson game (the tap games are in test/tap-games.mjs): layout, touch behaviour and their done states.
// Run alone with `node test/games.mjs`, or as part of test/smoke.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN, DONE_JSON, touchDrag } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

const SEED = (settings = {}) => `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:${DONE_JSON},settings:${JSON.stringify({ seenScripts: SEEN, ...settings })},firstRunDone:true}))`;
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
  ok(first.length >= 12 && first.length <= 16, `${tag}: fourteen to sixteen letters in the sky (${first.length})`);
  ok(first.every((r) => r.w >= 55.5 && r.h >= 55.5), `${tag}: every sky letter is at least 56 px`);
  const bal = await page.evaluate(() => [...document.querySelectorAll('.sky-letter')].map((b) => ({ t: b.dataset.target, c: getComputedStyle(b).getPropertyValue('--bal').trim(), string: !!b.querySelector('.string') })));
  ok(bal.every((b) => b.string && b.c), `${tag}: every letter floats on a balloon with a string`);
  const colorsOf = (t) => new Set(bal.filter((b) => b.t === t).map((b) => b.c));
  ok(colorsOf('1').size >= 2 || [...colorsOf('1')].some((c) => colorsOf('0').has(c)), `${tag}: balloon colours never tell which letter is the target`);
  const scene = (await rects(page, '.farm'))[0];
  const card = (await rects(page, '.find-card'))[0];
  ok(first.every((r) => r.x >= scene.x && r.x + r.w <= scene.x + scene.w && r.y >= scene.y && r.y + r.h <= scene.y + scene.h), `${tag}: every letter is inside the sky`);
  ok(!first.some((r) => overlaps(r, card)), `${tag}: no letter sits on the Find this card`);
  const g0 = (await rects(page, '.hunt-goal'))[0], station = { x: g0.x + 20, y: g0.y + 12, w: g0.w - 20, h: g0.h - 12 };
  ok(!first.some((r) => overlaps(r, station)), `${tag}: no balloon sits on the station`);
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
  const trainX = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.train-wrap')).transform).m41); // the train's step along the track
  const stars = () => page.evaluate(() => document.querySelector('.star-row').dataset.filled);
  const scrollTop = () => page.evaluate(() => document.querySelector('.task-activity').scrollTop + scrollY);
  const before = await plain(page);
  // Which slots hold targets, and the whole sky as a string, to see whether it was dealt again.
  const targetSlots = () => page.evaluate(() => [...document.querySelectorAll('.sky-letter[data-target="1"]:not(.popped)')].map((b) => Number(b.dataset.slot)).sort((a, b) => a - b));
  const skyKey = () => page.evaluate(() => [...document.querySelectorAll('.sky-letter:not(.popped)')].map((b) => b.dataset.slot + b.dataset.letter).join(' '));
  // A wrong touch changes nothing, and the sky is not dealt again.
  const skyBefore = await skyKey();
  await tap(page, page.locator('.sky-letter[data-target="0"]').first());
  await page.waitForTimeout(900);
  ok((await steps()) === '0' && (await stars()) === '0' && (await trainX()) === 0, `${tag}: a wrong touch does not move the train or fill a star`);
  ok((await page.locator('.sky-letter').count()) === first.length && (await skyKey()) === skyBefore, `${tag}: a wrong touch leaves the sky exactly as it was (no re-deal)`);
  // Five right touches take the train along the track to the station.
  let lastX = 0, minTargets = 99, repeats = 0, unchanged = 0;
  for (let i = 1; i <= 5; i++) {
    const slotsBefore = await targetSlots();
    await tap(page, page.locator('.sky-letter[data-target="1"]:not(.popped)').first());
    await page.waitForTimeout(i === 1 ? 250 : 120);
    if (i === 1 && shot) await shot(page, 'mid');
    if (i === 2) {
      // The new sky is fading in: touches are ignored until the swap (450 ms) is over, so the train takes no extra step.
      await page.waitForTimeout(170);
      await tap(page, page.locator('.sky-letter[data-target="1"]:not(.popped)').first());
      await page.waitForTimeout(150);
      ok((await steps()) === '2', `${tag}: a touch during the swap is ignored (steps ${await steps()})`);
    }
    await page.waitForTimeout(i === 1 ? 1100 : 930);
    if (i < 5) {
      const slotsAfter = await targetSlots();
      if (slotsAfter.some((s) => slotsBefore.includes(s))) repeats++;
      if (JSON.stringify(slotsAfter) === JSON.stringify(slotsBefore)) unchanged++;
    }
    // The fifth star waits for the station (filled as the station hops, about 2 s after the touch).
    ok((await steps()) === String(i) && (await stars()) === String(Math.min(i, 4)), `${tag}: touch ${i} moves the train one step and fills star ${Math.min(i, 4)}`);
    const x = await trainX();
    ok(x > lastX, `${tag}: the train is further right after touch ${i} (${Math.round(x)})`);
    lastX = x;
    if (i < 5) { await page.waitForTimeout(500); minTargets = Math.min(minTargets, await page.locator('.sky-letter[data-target="1"]:not(.popped)').count()); }
  }
  ok(minTargets >= 4, `${tag}: every deal has four or five target letters (${minTargets})`);
  const arrive = await page.evaluate(() => ({ state: document.querySelector('.hunt').dataset.state, pose: document.querySelector('.train-wrap .pip').dataset.pose, arrived: document.querySelector('.hunt-goal').classList.contains('arrived'), trainRight: document.querySelector('.train-wrap').getBoundingClientRect().right, goal: document.querySelector('.hunt-goal').getBoundingClientRect() }));
  ok(arrive.arrived && arrive.pose === 'wave' && arrive.trainRight > arrive.goal.left + arrive.goal.width / 2, `${tag}: the fifth letter brings the train into the station and Pip waves (${JSON.stringify({ ...arrive, goal: undefined })})`);
  await page.waitForTimeout(450);
  const off = await page.evaluate(() => ({ puffs: document.querySelectorAll('.steam-puff').length, moved: new DOMMatrix(getComputedStyle(document.querySelector('.train-hop')).transform).m41 }));
  ok(off.puffs >= 2 && off.moved > 5, `${tag}: then smoke billows and the train chugs off to the right (${JSON.stringify(off)})`);
  ok(unchanged === 0 && repeats === 0, `${tag}: the sky is dealt again after each right touch and no target slot repeats from the deal before (${repeats} repeats, ${unchanged} unchanged)`);
  await page.waitForTimeout(1900);
  ok((await page.evaluate(() => document.querySelector('.hunt').dataset.state)) === 'done' && (await stars()) === '5', `${tag}: five touches reach the done state and the fifth star`);
  await page.waitForTimeout(700);
  if (shot) await shot(page, 'done');
  ok((await scrollTop()) === 0, `${tag}: the stage never scrolled`);
  const after = await plain(page);
  ok(after.clips === before.clips && after.tts === before.tts, `${tag}: no sound or speech during play`);
  // Again starts over.
  const skyBeforeAgain = await targetSlots();
  await page.click('.btn.again');
  await page.waitForTimeout(900);
  ok((await steps()) === '0' && (await stars()) === '0' && (await trainX()) === 0 && (await page.evaluate(() => document.querySelector('.hunt').dataset.state)) === 'playing', `${tag}: Again puts the train back at the start`);
  ok(await page.evaluate(() => document.querySelector('.train-wrap .pip').dataset.pose === 'idle' && !document.querySelector('.hunt-goal').classList.contains('done') && !document.querySelector('.hunt-goal').classList.contains('arrived') && getComputedStyle(document.querySelector('.hunt-goal .bunting')).opacity === '0'), `${tag}: Again puts the train back, Pip in his seat, the bunting away and the station glow off`);
  ok((await page.locator('.sky-letter').count()) >= 12, `${tag}: Again refreshes the sky`);
  ok((await targetSlots()).every((s) => !skyBeforeAgain.includes(s)), `${tag}: Again deals a layout whose targets avoid the slots of the sky before it`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Letter Hunt by finger: the letter first touched is the one chosen, however far it was dragged; then the ending at the station.
// Uses the browser's real touch pipeline (CDP), so pointer events, capture and touch-action behave as on a phone.
export async function dragChecks({ browser, url, ok, CUR, vp, shot }) {
  const { ctx, page, errors } = await open(browser, url, vp);
  await page.goto(url + `#/lesson/1/task/${taskIndex(CUR, 1, 'hunt')}`);
  await page.waitForSelector('.sky-letter');
  await page.waitForTimeout(900);
  const tag = `${vp.name} Hunt drag`;
  const steps = () => page.evaluate(() => document.querySelector('.hunt').dataset.steps);
  const scrolled = () => page.evaluate(() => document.querySelector('.task-activity').scrollTop + scrollY + document.querySelector('.farm').scrollTop);
  const skyKey = () => page.evaluate(() => [...document.querySelectorAll('.sky-letter:not(.popped)')].map((b) => b.dataset.slot + b.dataset.letter).join(' '));
  const sceneBox = (await rects(page, '.farm'))[0];
  const card = (await rects(page, '.find-card'))[0];
  const letter = (kind, nth = 0) => page.locator(`.sky-letter[data-target="${kind}"]:not(.popped)`).nth(nth);
  const pick = (kind, nth = 0) => center(letter(kind, nth));
  const notes = () => page.evaluate(() => window.__audioNotes().length);
  // A point 60 px (or dx, dy) away that stays inside the scene, and outside the Find this card.
  const away = (c, dx, dy) => {
    const p = { x: c.x + dx, y: c.y + dy };
    if (p.x > sceneBox.x + sceneBox.w - 30 || p.x < sceneBox.x + 30) p.x = c.x - dx;
    if (p.y > sceneBox.y + sceneBox.h - 100 || p.y < sceneBox.y + 30) p.y = c.y - dy;
    return p;
  };
  const settle = () => page.waitForTimeout(1000);
  const s0 = await scrolled();

  // 1. A right letter dragged 60 px: same as a tap. Mid-drag it is lifted and sits where the finger is.
  let c = await pick('1'), to = away(c, 60, 0);
  let key0 = await skyKey();
  await touchDrag(page, c, to, { during: async () => {
    const lifted = await page.evaluate(() => { const b = document.querySelector('.sky-letter.dragging'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, z: getComputedStyle(b).zIndex, t: getComputedStyle(b).transform }; });
    ok(lifted && Math.abs(lifted.x - to.x) < 10 && Math.abs(lifted.y - to.y) < 14, `${tag}: the dragged letter follows the finger (${lifted && Math.round(lifted.x - c.x)} px across)`);
    ok(lifted && Number(lifted.z) > 1, `${tag}: the dragged letter is lifted above the others`);
    ok(lifted && /matrix\(1\.1/.test(lifted.t), `${tag}: the dragged letter is a little larger`);
    if (shot) await shot(page, 'mid-drag');
  } });
  await page.waitForTimeout(250);
  ok((await steps()) === '1' && (await page.evaluate(() => document.querySelector('.star-row').dataset.filled)) === '1', `${tag}: a right letter dragged 60 px moves the train one step and fills a star`);
  await settle();
  ok((await skyKey()) !== key0 && (await page.locator('.sky-letter').count()) >= 12, `${tag}: a right drag deals the sky again`);

  // 2. A wrong letter dragged: it goes home. Nothing else changes, and no sound is scheduled.
  c = await pick('0'); to = away(c, 0, 90);
  key0 = await skyKey();
  const n0 = await notes(), wrongSlot = await letter('0').getAttribute('data-slot');
  await touchDrag(page, c, to);
  await page.waitForTimeout(800);
  const back = await center(page.locator(`.sky-letter[data-slot="${wrongSlot}"]`));
  ok((await steps()) === '1' && (await skyKey()) === key0, `${tag}: a wrong drag moves no train and leaves the sky as it was`);
  ok(Math.hypot(back.x - c.x, back.y - c.y) < 12 && (await page.locator('.sky-letter.dragging').count()) === 0, `${tag}: a wrong letter springs back to its place`);
  ok((await notes()) === n0, `${tag}: a wrong drag makes no sound`);
  ok((await scrolled()) === s0, `${tag}: a long vertical drag does not scroll the page or the stage`);

  // 3. A sloppy drag: the finger ends over another letter, but the letter first touched is the one chosen.
  c = await pick('1');
  const other = await pick('0');
  await touchDrag(page, c, other);
  await page.waitForTimeout(250);
  ok((await steps()) === '2', `${tag}: a drag that ends over another letter still chooses the first one`);
  // ...and the same the other way round: a wrong letter dragged onto a right one is wrong.
  await settle();
  c = await pick('0');
  const right = await pick('1');
  key0 = await skyKey();
  await touchDrag(page, c, right);
  await page.waitForTimeout(700);
  ok((await steps()) === '2' && (await skyKey()) === key0, `${tag}: a wrong letter dragged onto a right one is still wrong`);

  // 4. A drag that begins on empty sky and lifts on a letter chooses that letter.
  const gap = await page.evaluate(({ card }) => {
    const boxes = [...document.querySelectorAll('.sky-letter')].map((b) => b.getBoundingClientRect());
    const f = document.querySelector('.farm').getBoundingClientRect();
    for (let y = f.top + 10; y < f.bottom - 100; y += 4) for (let x = f.left + 10; x < f.right - 10; x += 4) {
      if (boxes.some((r) => x > r.left - 2 && x < r.right + 2 && y > r.top - 2 && y < r.bottom + 2)) continue;
      if (x > card.x - 4 && x < card.x + card.w + 4 && y > card.y - 4 && y < card.y + card.h + 4) continue;
      return { x, y };
    }
    return null;
  }, { card });
  ok(!!gap, `${tag}: there is empty sky to start a drag from`);
  if (gap) {
    const t = await pick('1');
    await touchDrag(page, gap, t);
    await page.waitForTimeout(250);
    ok((await steps()) === '3', `${tag}: a drag from the empty sky that lifts on a right letter chooses it`);
    await settle();
    // Lifting on nothing, or on a wrong letter, does nothing.
    const w = await pick('0');
    key0 = await skyKey();
    await touchDrag(page, gap, w);
    await page.waitForTimeout(500);
    ok((await steps()) === '3' && (await skyKey()) === key0, `${tag}: a drag from the empty sky that lifts on a wrong letter does nothing`);
  }

  // 5. A drag that begins on the Find this card does nothing special.
  await touchDrag(page, { x: card.x + card.w / 2, y: card.y + card.h / 2 }, await pick('1'));
  await page.waitForTimeout(300);
  ok((await steps()) === '3', `${tag}: a drag that starts on the Find this card chooses nothing`);

  // 6. While the new sky fades in, drags are ignored; then a plain tap still works (the fourth step).
  c = await pick('1');
  await page.touchscreen.tap(c.x, c.y);
  await page.waitForTimeout(120); // inside the 450 ms swap
  const during = await page.evaluate(() => [...document.querySelectorAll('.sky-letter[data-target="1"]:not(.popped)')].length);
  if (during) { try { const t = await pick('1'); await touchDrag(page, t, away(t, 50, 0)); } catch { /* the swap ended first: nothing left to ignore */ } }
  await page.waitForTimeout(400);
  ok((await steps()) === '4', `${tag}: a tap still works, and a drag during the swap is ignored (steps ${await steps()})`);
  await page.waitForTimeout(700);

  // 7. The fifth right letter: the train pulls into the station.
  c = await pick('1'); to = away(c, 70, 0);
  await page.evaluate(() => window.__audioClear());
  await touchDrag(page, c, to);
  await page.waitForTimeout(250);
  ok((await steps()) === '5', `${tag}: the fifth right drag reaches the station`);
  // Everything is ignored while the ending plays.
  const t5 = await page.evaluate(() => document.querySelector('.hunt').dataset.state);
  ok(t5 === 'ending', `${tag}: the ending is under way (${t5})`);
  await page.waitForTimeout(1000);
  if (shot) await shot(page, 'train-at-station');
  await page.waitForTimeout(800);
  await page.touchscreen.tap(sceneBox.x + 200, sceneBox.y + 150);
  await page.waitForTimeout(1200);
  ok((await steps()) === '5' && (await page.evaluate(() => document.querySelector('.hunt').dataset.state)) === 'done', `${tag}: the ending finishes (steps ${await steps()})`);
  ok(await page.evaluate(() => { const t = document.querySelector('.train-hop').getBoundingClientRect(), sc = document.querySelector('.farm').getBoundingClientRect(); return document.querySelector('.train-wrap .pip').dataset.pose === 'wave' && t.left >= sc.right - 1 && document.querySelector('.hunt').dataset.train === 'leaving'; }), `${tag}: after Pip waved at the station, the train chugged off to the right, out of the scene`);
  ok(await page.evaluate(() => document.querySelector('.hunt-goal').classList.contains('done') && getComputedStyle(document.querySelector('.hunt-goal .bunting')).opacity === '1'), `${tag}: the station glows and its bunting is up`);
  ok(await page.evaluate(() => { const sky = document.querySelector('.farm').getBoundingClientRect(); return [...document.querySelectorAll('.sky-letter:not(.popped)')].every((b) => b.getBoundingClientRect().bottom < sky.top + 30 || Number(getComputedStyle(b).opacity) < 0.3); }), `${tag}: the balloons left over floated away upward`);
  ok((await page.evaluate(() => window.__audioNotes().filter((n) => n.event === 'toot' && !n.partial).length)) === 2, `${tag}: the train tooted as it pulled in`);
  ok((await page.evaluate(() => window.__audioNotes().filter((n) => n.event === 'win' && !n.partial && !n.noise && !n.bloop).length)) === 7, `${tag}: the win jingle was scheduled once`);
  ok((await page.evaluate(() => document.querySelector('.star-row').dataset.filled)) === '5', `${tag}: the stars fill the row`);
  ok((await scrolled()) === s0, `${tag}: nothing scrolled, in the whole game`);
  if (shot) await shot(page, 'done');
  // Again starts everything over.
  await page.click('.btn.again');
  await page.waitForTimeout(900);
  ok((await steps()) === '0' && (await page.locator('.sky-letter').count()) >= 12 && (await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.train-wrap')).transform).m41 === 0 && !document.querySelector('.hunt-goal').classList.contains('done'))), `${tag}: Again brings back the train at the start, the sky and the plain station`);
  c = await pick('1');
  await touchDrag(page, c, away(c, 60, 0));
  await page.waitForTimeout(300);
  ok((await steps()) === '1', `${tag}: a drag works again after Again`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Reduced motion: the letter follows the finger without lifting, and the train simply stands at the station at the end.
export async function dragReducedChecks({ browser, url, ok, CUR }) {
  const vp = VIEWPORTS[0];
  const { ctx, page, errors } = await open(browser, url, vp, {}, { reducedMotion: 'reduce' });
  await page.goto(url + `#/lesson/1/task/${taskIndex(CUR, 1, 'hunt')}`);
  await page.waitForSelector('.sky-letter');
  await page.waitForTimeout(500);
  const steps = () => page.evaluate(() => document.querySelector('.hunt').dataset.steps);
  const pick = (kind) => center(page.locator(`.sky-letter[data-target="${kind}"]:not(.popped)`).first());
  const sceneBox = (await rects(page, '.farm'))[0];
  let c = await pick('1');
  await touchDrag(page, c, { x: c.x > sceneBox.x + 120 ? c.x - 60 : c.x + 60, y: c.y }, { during: async () => {
    const t = await page.evaluate(() => { const b = document.querySelector('.sky-letter.dragging'); return b && { tr: getComputedStyle(b).transform, sh: getComputedStyle(b.firstChild).boxShadow }; });
    ok(t && !/matrix\(1\.1/.test(t.tr) && t.sh === 'none', 'reduced motion: the dragged letter does not scale or cast a shadow');
  } });
  await page.waitForTimeout(400);
  ok((await steps()) === '1', 'reduced motion: a drag still chooses a letter');
  for (let i = 2; i <= 5; i++) { await page.waitForTimeout(700); await page.touchscreen.tap((await pick('1')).x, (await pick('1')).y); await page.waitForTimeout(150); }
  await page.waitForTimeout(1000);
  ok(await page.evaluate(() => document.querySelector('.hunt').dataset.state === 'done' && document.querySelector('.train-wrap .pip').dataset.pose === 'wave' && document.querySelector('.hunt-goal').classList.contains('done')), 'reduced motion: the train is at the station, which glows, and Pip waves');
  ok(await page.evaluate(() => document.querySelectorAll('.steam-puff').length === 0 && document.querySelector('.hunt-goal .bunting').getAnimations().length === 0), 'reduced motion: no steam and no bunting drop');
  ok(errors.length === 0, 'reduced motion drag: errors ' + errors.join(' | '));
  await ctx.close();
}

// Reduced motion: both games still play, with no hops and doors that swap by opacity.
export async function reducedChecks({ browser, url, ok, CUR }) {
  const vp = VIEWPORTS[0];
  const { ctx, page, errors } = await open(browser, url, vp, {}, { reducedMotion: 'reduce' });
  await page.goto(url + `#/lesson/1/task/${taskIndex(CUR, 1, 'hunt')}`);
  await page.waitForSelector('.sky-letter');
  await page.waitForTimeout(500);
  ok((await page.evaluate(() => [...document.querySelectorAll('.sky-letter')].reduce((n, b) => n + b.getAnimations().length, 0))) === 0, 'reduced motion: the sky letters do not drift');
  await tap(page, page.locator('.sky-letter[data-target="1"]').first());
  await page.waitForTimeout(400);
  ok((await page.evaluate(() => document.querySelector('.hunt').dataset.steps)) === '1', 'reduced motion: Hunt still counts a correct touch');
  ok(errors.length === 0, 'reduced motion games: errors ' + errors.join(' | '));
  await ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
  fs.mkdirSync(OUT, { recursive: true });
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  for (const vp of VIEWPORTS) { await huntChecks({ browser, url, ok, CUR, vp }); await dragChecks({ browser, url, ok, CUR, vp }); }
  for (const l of CUR.lessons.filter((x) => x.number >= 2 && x.middle.includes('hunt'))) await huntChecks({ browser, url, ok, CUR, vp: VIEWPORTS[0], lessonNo: l.number }); // every letter's Hunt
  await reducedChecks({ browser, url, ok, CUR });
  await dragReducedChecks({ browser, url, ok, CUR });
  await browser.close(); server.close();
  console.log(`games: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
