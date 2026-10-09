// The train world: Pip in 2D (js/art/pip.js) on the welcome card and the finish screen, and the 3D railway Home
// (js/screens/home3d.js): its WebGL context, the overlay buttons that are its real tap targets, the drag, the arrival,
// disposal, the hidden-page pause, reduced motion, and the 2D fallback (no WebGL, or the Grownups switch off).
// Run alone with `node test/train.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { audit } from './audit.mjs';

import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN, doneThrough, touchDrag } from './lib.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const seedState = (state) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(state))}); }`;


async function open(browser, url, vp, state, route, extra) {
  const made = await newPage(browser, vp, extra);
  await made.page.addInitScript(SPEECH_STUB);
  if (state) await made.page.addInitScript(seedState(state));
  await made.page.goto(url + route);
  return made;
}

// Pip in 2D: every pose renders, has his parts, holds no text and no letter name, and is the same size in every pose.
export async function pipChecks({ browser, url, ok }) {
  const { ctx, page, errors } = await open(browser, url, VIEWPORTS[0], { schema: 1, lessons: {}, settings: { seenScripts: SEEN }, firstRunDone: true }, '#/grownups');
  await page.waitForTimeout(400);
  const r = await page.evaluate(async () => {
    const { pipSvg, POSES, PIP } = await import('/js/art/pip.js');
    const out = {};
    for (const pose of [...POSES, 'nonsense']) {
      const s = pipSvg({ pose });
      s.style.width = '120px'; s.style.height = '150px';
      document.body.append(s);
      const box = s.querySelector('.pip-fig').getBBox();
      out[pose] = {
        cls: s.getAttribute('class'), hidden: s.getAttribute('aria-hidden'), text: s.textContent.trim(), labels: [...s.querySelectorAll('[aria-label],title,text')].length,
        parts: ['.pip-head', '.pip-eyes', '.pip-cap', '.pip-arm-l', '.pip-arm-r', '.pip-fig'].every((q) => s.querySelector(q)),
        box: { x: box.x, y: box.y, w: box.width, h: box.height }, head: (() => { const k = s.querySelector('.pip-skull').getBBox(), c = s.querySelector('.pip-cap').getBBox(); return { skull: k.height, withCap: k.y + k.height - c.y }; })(),
        ids: [...s.querySelectorAll('[id]')].map((e) => e.id),
        rightHand: (() => { const c = s.querySelectorAll('.pip-arm-r circle')[0]; return { x: +c.getAttribute('cx'), y: +c.getAttribute('cy') }; })(),
      };
      s.remove();
    }
    out.colors = PIP;
    return out;
  });
  for (const pose of ['idle', 'wave', 'cheer', 'point']) {
    const p = r[pose];
    ok(p.cls === `pip pose-${pose}` && p.parts, `Pip ${pose}: renders with head, eyes, cap, both arms (${p.cls})`);
    ok(p.hidden === 'true' && p.text === '' && p.labels === 0, `Pip ${pose}: decoration only, no text, no labels, so never a letter name`);
    ok(p.box.h > 120 && p.box.y >= 0 && p.box.y + p.box.h <= 150.5, `Pip ${pose}: fits his 120 by 150 box (${p.box.y.toFixed(1)}..${(p.box.y + p.box.h).toFixed(1)})`);
    ok(p.head.skull / 150 > 0.42 && p.head.withCap / 150 >= 0.5 && p.head.withCap / 150 <= 0.62, `Pip ${pose}: a toddler's big head, about 55% of his height with the cap (${p.head.withCap.toFixed(0)} of 150)`);
  }
  ok(r.wave.rightHand.y < 80 && r.idle.rightHand.y > 110 && r.point.rightHand.x > 100 && r.cheer.rightHand.y < 80, 'Pip poses differ: wave and cheer raise the hand, point reaches out, idle rests');
  ok(r.nonsense.cls === 'pip pose-idle', 'Pip: an unknown pose falls back to idle');
  ok(new Set([...r.idle.ids, ...r.wave.ids]).size === r.idle.ids.length + r.wave.ids.length, 'Pip: two Pips on one page never share gradient ids');
  ok(r.colors.cap === '#2B2D5C' && r.colors.scarf === '#E5484D' && r.colors.button === '#FFD166', 'Pip: navy cap, red neckerchief, gold buttons (the spec palette)');
  ok(errors.length === 0, `Pip: errors ${errors.join(' | ')}`);
  await ctx.close();

  // On the welcome card (waving) and the finish screens (cheering), nothing spoken by him, no letter names anywhere.
  for (const vp of VIEWPORTS) {
    const w = await open(browser, url, vp, { schema: 1, lessons: {}, settings: { seenScripts: SEEN } }, '#/home');
    await w.page.waitForSelector('.welcome');
    await w.page.waitForTimeout(800);
    const pip = await w.page.evaluate(() => { const s = document.querySelector('.welcome .wc-pip .pip'); if (!s) return null; const r = s.getBoundingClientRect(), c = document.querySelector('.first-card').getBoundingClientRect(), t = (() => { const rg = document.createRange(); rg.selectNodeContents(document.querySelector('.wc-page.on h2')); return rg.getBoundingClientRect(); })(), p = (() => { const rg = document.createRange(); rg.selectNodeContents(document.querySelector('.wc-page.on p')); return rg.getBoundingClientRect(); })(); return { pose: s.dataset.pose, r: { x: r.x, y: r.y, w: r.width, h: r.height }, inside: r.left >= c.left && r.right <= c.right && r.top >= c.top && r.bottom <= c.bottom, clearText: r.right <= t.left + 1 || r.bottom <= t.top + 1 || r.top >= t.bottom - 1, clearPara: r.bottom <= p.top + 1 || r.right <= p.left + 1 }; });
    ok(pip && pip.pose === 'wave' && pip.r.h >= 34, `${vp.name} welcome: Pip waves at the top of the card (${JSON.stringify(pip && pip.r)})`);
    ok(pip && pip.inside && pip.clearText && pip.clearPara, `${vp.name} welcome: Pip sits inside the card and clear of the words (${JSON.stringify(pip)})`);
    ok(w.errors.length === 0, `${vp.name} welcome: errors ${w.errors.join(' | ')}`);
    await w.ctx.close();

    for (const route of ['#/lesson/1/finish', ...(CUR.checkpoints.some((k) => k.id === 'c1') ? ['#/checkpoint/c1/finish'] : [])]) {
      const lessons = { 1: { tasksDone: [], result: 'got-it' }, 2: { tasksDone: [], result: 'got-it' }, 3: { tasksDone: [], result: 'got-it' } };
      const f = await open(browser, url, vp, { schema: 1, lessons, settings: { seenScripts: SEEN }, firstRunDone: true }, route);
      await f.page.waitForSelector('.finish');
      await f.page.waitForTimeout(1300);
      const m = await f.page.evaluate(() => {
        const s = document.querySelector('.finish-pip .pip'), r = s.getBoundingClientRect(), g = document.querySelector('.finish-glyph').getBoundingClientRect(), c = document.querySelector('.finish-card').getBoundingClientRect(), h1 = document.querySelector('.finish h1').getBoundingClientRect();
        const ov = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        return { pose: s.dataset.pose, inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0, beside: Math.abs((r.top + r.bottom) / 2 - (g.top + g.bottom) / 2) < g.height, clear: !ov(r, c) && !ov(r, h1), h: r.height, scroll: document.documentElement.scrollWidth - innerWidth };
      });
      const tag = `${vp.name} ${route.slice(2)}`;
      ok(m.pose === 'cheer' && m.h >= 60, `${tag}: Pip cheers beside the glyph (${m.h.toFixed(0)} px)`);
      ok(m.inView && m.beside && m.clear && m.scroll <= 0, `${tag}: Pip is in view, beside the glyph, clear of the heading and the grown-up's card (${JSON.stringify(m)})`);
      const p = await audit(f.page, tag);
      ok(p.length === 0, p.join(' | '));
      ok(f.errors.length === 0, `${tag}: errors ${f.errors.join(' | ')}`);
      await f.ctx.close();
    }
  }
}


const NODES = CUR.lessons.flatMap((l) => [{ lesson: l }, ...CUR.checkpoints.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
// The world a Home shows (js/worlds.js currentWorld) when `done` lessons are done, and its stops: only that world's lessons and
// checkpoints are built since 1.9.14 (the line runs on into a tunnel portal to the next world).
const worldOfNode = (n) => (n.lesson || n.checkpoint).world;
export const worldIdFor = (done) => (CUR.lessons.find((l) => l.number === done + 1) || CUR.lessons[CUR.lessons.length - 1]).world;
export const worldNodes = (done) => NODES.filter((n) => worldOfNode(n) === worldIdFor(done));
const nameOf = (n) => (n.lesson ? `Lesson ${n.lesson.number}` : n.checkpoint.title);
export const state = (done, settings = {}, extra = {}) => ({ schema: 1, lessons: doneThrough(done), settings: { seenScripts: SEEN, trainIntroDone: true, ...settings }, firstRunDone: true, ...extra });
// Counts the WebGL contexts the page makes, and how many are still alive.
const GL_COUNTER = () => {
  window.__gls = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) { const c = orig.call(this, type, ...rest); if (c && /webgl/.test(type) && !window.__gls.includes(c)) window.__gls.push(c); return c; };
  window.__liveGL = () => window.__gls.filter((g) => !g.isContextLost()).length;
};
const NO_WEBGL = () => { const orig = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : orig.call(this, type, ...rest); }; };
const train = (page) => page.evaluate(() => { const t = window.__train; return t ? { ...t, stopS: undefined, stops: t.stopS } : null; });
const shown = (page) => page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => { const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label'), cls: [...b.classList].filter((c) => c.startsWith('is-')).join(' '), shown: b.dataset.shown === '1', vis: getComputedStyle(b).visibility, x: r.x, y: r.y, w: r.width, h: r.height }; }));
export const until = async (page, fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout }).then(() => true).catch(() => false);

export async function openHome(browser, url, vp, st, { init = [], extra, route = '#/home' } = {}) {
  const made = await newPage(browser, vp, extra);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(GL_COUNTER);
  for (const i of init) await made.page.addInitScript(i);
  if (st) await made.page.addInitScript(seedState(st));
  await made.page.goto(url + route);
  return made;
}

// The 3D Home in each viewport and progress state: the overlay buttons are the stops, in order, with the right states.
export async function homeChecks({ browser, url, ok, vp, shot }) {
  for (const done of [0, 3, 8, CUR.lessons.length]) {
    const { ctx, page, errors } = await openHome(browser, url, vp, state(done));
    const tag = `${vp.name} train home (${done} done)`;
    const WN = worldNodes(done), wcks = WN.filter((n) => n.checkpoint).length;
    ok(await until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, 20000), `${tag}: the 3D railway renders and settles`);
    const info = await page.evaluate(() => { const c = document.querySelector('.home3d canvas'); const gl = c && (c.getContext('webgl2')); const ext = gl && gl.getExtension('WEBGL_debug_renderer_info'); return { renderer: document.querySelector('.home3d') && document.querySelector('.home3d').dataset.renderer, gl: !!gl, name: gl && ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null, map: !!document.querySelector('.map-scroll') }; });
    ok(info.renderer === 'webgl' && info.gl && !info.map, `${tag}: a WebGL context drew the railway, not the 2D map (${info.name})`);
    const b = await shown(page);
    ok(b.length === WN.length && b.every((x, i) => x.label.startsWith(nameOf(WN[i]))), `${tag}: one button per stop of the current world only, in lesson order (${b.length} of ${NODES.length})`);
    const want = (n) => (n.lesson ? (n.lesson.number <= done ? 'is-done' : n.lesson.number === done + 1 ? 'is-current' : 'is-locked') : (n.checkpoint.after <= done ? (done === CUR.lessons.length && n === NODES.find((m) => m.checkpoint && m.checkpoint.after <= done) ? 'is-current' : 'is-unlocked') : 'is-locked'));
    const bad = b.filter((x, i) => x.cls !== want(WN[i]));
    ok(bad.length === 0, `${tag}: done, current, open and locked as the progress says (${bad.map((x) => x.label + ':' + x.cls).join('; ')})`);
    ok(b.every((x, i) => (x.label.endsWith(', done') === (want(WN[i]) === 'is-done')) && (x.label.endsWith(', locked') === (want(WN[i]) === 'is-locked'))), `${tag}: labels say done and locked ("${b[0].label}", "${b[b.length - 1].label}")`);
    const vis = b.filter((x) => x.shown);
    ok(vis.length >= (done === CUR.lessons.length && !wcks ? 1 : 2) && vis.every((x) => x.vis === 'visible' && x.w >= 64 && x.h >= 64 && x.x >= 0 && x.y >= 0 && x.x + x.w <= vp.width + 0.5 && x.y + x.h <= vp.height + 0.5), `${tag}: ${vis.length} stops on screen, each a button of at least 64 px inside the screen`);
    ok(b.filter((x) => !x.shown).every((x) => x.vis === 'hidden'), `${tag}: the stops off screen are hidden`);
    const t = await train(page);
    const cur = t.currentIndex;
    ok(Math.abs(t.focus - t.stops[cur]) < 0.05 && Math.abs(t.trainS - (t.stops[cur] + t.engineAt)) < 0.01, `${tag}: the camera opens on the current stop and the train waits there (${t.focus.toFixed(2)} vs ${t.stops[cur]})`);
    const curBtn = b[cur];
    ok(curBtn.shown, `${tag}: the current stop's button is on screen (${curBtn.label})`);
    const bub = await page.evaluate(() => { const e = document.querySelector('.bubble'); if (!e) return null; const r = e.getBoundingClientRect(); return { n: document.querySelectorAll('.bubble').length, vis: getComputedStyle(e).visibility, x: r.x, y: r.y, w: r.width, h: r.height }; });
    if (done < CUR.lessons.length) ok(bub && bub.n === 1 && bub.vis === 'visible' && bub.x >= 0 && bub.x + bub.w <= vp.width && bub.y >= 70, `${tag}: one "Tap to start" bubble, in view, clear of the top buttons (${JSON.stringify(bub)})`);
    const pill = await page.evaluate(() => { const r = document.querySelector('.pill-hold').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    ok(vis.every((x) => !(x.x < pill.x + pill.w && pill.x < x.x + x.w && x.y < pill.y + pill.h && pill.y < x.y + x.h)), `${tag}: no stop button sits under the Grownups pill`);
    const p = await audit(page, tag);
    ok(p.length === 0, p.join(' | '));
    if (shot && (done === 3 || done === 0)) await shot(page, `${vp.name}-${done}`);
    ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// Taps go through the buttons: the current stop opens its lesson, a locked one only wobbles, a drag pans and opens nothing.
export async function tapChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  let { ctx, page, errors } = await openHome(browser, url, vp, state(3));
  await until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running);
  const btn = page.locator('.station-btn.is-locked[data-shown="1"]').first();
  ok((await btn.count()) === 1, 'train taps: a locked stop is on screen');
  const before = await train(page);
  const r = await btn.boundingBox();
  await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForTimeout(500);
  ok(page.url().endsWith('#/home'), 'train taps: tapping a locked stop does not open it');
  ok((await train(page)).frames > before.frames, 'train taps: the locked sign wobbles (frames are drawn for it)');
  // a drag that starts on the current stop pans and opens nothing
  const cur = await page.locator('.station-btn.is-current').first().boundingBox();
  const from = { x: cur.x + cur.width / 2, y: cur.y + cur.height / 2 };
  const f0 = (await train(page)).focus;
  await touchDrag(page, from, { x: from.x + 6, y: from.y + 240 }, { steps: 12 });
  await page.waitForTimeout(900);
  const f1 = (await train(page)).focus;
  ok(page.url().endsWith('#/home'), 'train drag: a drag that starts on a stop does not open it');
  ok(f1 - f0 > 2, `train drag: dragging down moves the camera along the line (${f0.toFixed(2)} to ${f1.toFixed(2)})`);
  await touchDrag(page, { x: from.x, y: 700 }, { x: from.x, y: 120 }, { steps: 12 });
  await until(page, () => !window.__train.running, null, 8000);
  const f2 = (await train(page)).focus;
  ok(f2 < f1 && f2 >= (await train(page)).stops[0] - 2.01, `train drag: dragging up goes back, and the ends hold (${f2.toFixed(2)})`);
  // far past the far end: it springs back inside the line
  for (let k = 0; k < 6; k++) await touchDrag(page, { x: from.x, y: 150 }, { x: from.x, y: 800 }, { steps: 8 });
  await until(page, () => !window.__train.running, null, 12000);
  const t = await train(page);
  ok(t.focus <= t.stops[t.stops.length - 1] + 3.01, `train drag: past the last stop the camera springs back (the end clamp shows the portal) (${t.focus.toFixed(2)})`);
  ok(errors.length === 0, `train taps: errors ${errors.join(' | ')}`);
  await ctx.close();
  // a tap on the current stop opens its lesson
  ({ ctx, page, errors } = await openHome(browser, url, vp, state(3)));
  await until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running);
  const c = await page.locator('.station-btn.is-current').first().boundingBox();
  await page.touchscreen.tap(c.x + c.width / 2, c.y + c.height / 2);
  await page.waitForSelector('.lesson-overview', { timeout: 8000 }).catch(() => {});
  ok(page.url().endsWith('#/lesson/4'), `train taps: tapping the current stop opens lesson 4 (${page.url().split('#')[1]})`);
  ok(errors.length === 0, `train taps 2: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// The first visit glides from the start of the line; a just-finished lesson brings the train in with a toot.
// The index of a lesson's stop on the line (the line has no Sound Station stops since 1.7.0).
// (1.9.14: the index within the lesson's own world, which is the line the Home builds for it.)
export const iL = (n) => { const w = CUR.lessons.find((l) => l.number === n).world; return NODES.filter((x) => worldOfNode(x) === w).findIndex((x) => x.lesson && x.lesson.number === n); };
// The stop the train holds at after lesson 4: the Smooth Ride that comes next in line (a Story or Smooth Ride is never ridden past; 1.9.31).
export const iN = iL(4) + 1;
export async function arrivalChecks({ browser, url, ok, shot }) {
  const vp = VIEWPORTS[0];
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, { ...state(3), settings: { seenScripts: SEEN } });
    await until(page, () => window.__train && window.__train.frames > 0);
    const a = await train(page);
    ok(a.glideIn && a.focus < a.stops[1], `first visit: the camera starts at the start of the line (${a.focus.toFixed(2)})`);
    await until(page, () => !window.__train.running && window.__train.frames > 3, null, 15000);
    const b = await train(page);
    ok(Math.abs(b.focus - b.stops[b.currentIndex]) < 0.05, `first visit: and glides to the current stop (${b.focus.toFixed(2)} of ${b.stops[b.currentIndex]})`);
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.trainIntroDone)) === true, 'first visit: remembered, so the glide happens once');
    ok(errors.length === 0, `first visit: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // lesson 4 was just finished: the train was at lesson 4's stop (index 4) and lesson 5 is now current
    // Returning from a lesson, the child has already tapped, so sound is unlocked before the sequence's first toot.
    // A fresh test page has had no tap, so the unlock click is sent as soon as the page has loaded.
    const UNLOCKED = () => addEventListener('DOMContentLoaded', () => dispatchEvent(new MouseEvent('click')));
    const { ctx, page, errors } = await openHome(browser, url, vp, state(4, { trainAt: iL(4) }), { init: [UNLOCKED] });
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 300); // a real tap as well
    const a = await train(page);
    ok(a.arriving && Math.abs(a.trainS - (a.stops[iL(4)] + a.engineAt)) < 0.01, `arrival: the train starts at the stop before (${a.trainS.toFixed(2)})`);
    const mid = await until(page, ([i4, i5]) => window.__train.trainS > window.__train.stopS[i4] + 1 && window.__train.trainS < window.__train.stopS[i5], [iL(4), iN], 8000);
    ok(mid, 'arrival: the train chugs along the line between the two stops');
    if (shot) await shot(page, 'arrival');
    ok(await until(page, () => window.__train.tootAt !== null, null, 10000), 'arrival: a toot is played on arrival');
    const b = await train(page);
    ok(Math.abs(b.trainS - (b.stops[iN] + b.engineAt)) < 0.01, `arrival: the train stands at the new current stop (${b.trainS.toFixed(2)})`);
    const toots = await page.evaluate(() => window.__audioNotes().filter((n) => n.event === 'toot' && !n.partial).length);
    const whistleSamples = await page.evaluate(() => window.__audioNotes().filter((n) => n.event === 'whistle' && n.sample).length);
    ok(toots === 2 && whistleSamples >= 1, `arrival: the train whistle as it sets off and a toot (two whistle notes) on arrival (${whistleSamples} whistle, ${toots} toot notes)`);
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.trainAt)) === iN, 'arrival: the new stop is remembered, so it plays once');
    ok(errors.length === 0, `arrival: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // reduced motion: no chug and no glide, the camera jumps, the train fades in at the new stop, no idle frames
    const { ctx, page, errors } = await openHome(browser, url, vp, { ...state(4, { trainAt: iL(4) }), settings: { seenScripts: SEEN, trainAt: iL(4) } }, { extra: { reducedMotion: 'reduce' } });
    await until(page, () => window.__train && window.__train.frames > 0);
    const a = await train(page);
    ok(a.reduced && Math.abs(a.trainS - (a.stops[iN] + a.engineAt)) < 0.01 && Math.abs(a.focus - a.stops[iN]) < 0.05, `reduced motion: the train is at the new stop and the camera there at once (${a.trainS.toFixed(2)}, ${a.focus.toFixed(2)})`);
    await page.waitForTimeout(1500);
    const f1 = await train(page);
    await page.waitForTimeout(1200);
    const f2 = await train(page);
    ok(f2.frames === f1.frames && f2.idleFrames === 0, `reduced motion: nothing is drawn while nothing moves (${f1.frames} then ${f2.frames} frames)`);
    ok(f2.tootAt !== null, 'reduced motion: the arrival still toots');
    ok(errors.length === 0, `reduced motion: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// The station-complete sequence (1.8.5): lesson 4 was just finished (it has the newest completion time and one more station is
// done than Home last saw). The figure waits on lesson 4's platform, the train toots, the figure hops on, the train rides to
// the next station with thick smoke, the figure hops off and waves. Reduced motion skips the animation; nothing draws when idle.
export const RAF_COUNT = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const justDone = (settings = {}) => state(4, { trainAt: iN, trainDone: 3, ...settings }, { character: { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true }, lessons: Object.fromEntries([1, 2, 3, 4].map((n) => [n, { tasksDone: [], result: 'got-it', completedAt: `2026-10-0${n}T10:00:00.000Z` }])) });
export async function sequenceChecks({ browser, url, ok, shot }) {
  const vp = VIEWPORTS[0];
  {
    // The lesson finish: the second Yes goes back to the railway (not the next overview), and the sequence plays there.
    const { ctx, page, errors } = await openHome(browser, url, vp, justDone(), { route: '#/lesson/4/finish', init: [RAF_COUNT] });
    await page.waitForSelector('.finish');
    await page.waitForFunction(() => !document.querySelector('.btn.got').disabled, null, { timeout: 3000 });
    await page.click('.btn.got');
    ok(page.url().endsWith('#/lesson/4/finish'), 'finish: the first Yes only arms the button');
    await page.waitForTimeout(1700);
    await page.click('.btn.got');
    await page.waitForFunction(() => location.hash === '#/home', null, { timeout: 4000 }).catch(() => {});
    ok(page.url().endsWith('#/home'), `finish: the second Yes lands on the railway home (${page.url().split('#')[1]})`);
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 300);
    ok(await until(page, () => window.__train.startTootAt !== null, null, 8000), 'finish: the station-complete sequence toots');
    ok(await until(page, () => window.__train.kid.phase === 'on', null, 8000), 'finish: the figure hops on');
    ok(await until(page, () => window.__train.kid.phase === 'go', null, 8000), 'finish: the train rides to the next stop');
    ok(await until(page, () => !window.__train.running, null, 20000), 'finish: the sequence ends and the next station is current');
    ok(errors.length === 0, 'finish to home: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    // The phases are recorded every 16 ms, so the short "hops off" phase cannot slip between two polls of the test.
    const PHASES = () => { window.__phases = []; setInterval(() => { const p = window.__train && window.__train.kid.phase; if (p !== undefined && window.__phases[window.__phases.length - 1] !== p) window.__phases.push(p); }, 16); };
    const { ctx, page, errors } = await openHome(browser, url, vp, justDone(), { init: [RAF_COUNT, PHASES] });
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 300);
    const a = await train(page);
    ok(a.arriving && a.fromIndex === iL(4) && a.kid.index === iL(4), `sequence: the figure waits on the platform of the station just finished (kid at ${a.kid.index}, from ${a.fromIndex})`);
    ok(await until(page, () => window.__train.startTootAt !== null, null, 8000), 'sequence: the train toots first');
    ok(await page.evaluate(() => window.__audioNotes().filter((n) => n.event === 'whistle' && n.sample).length) >= 1, 'sequence: the train whistle is scheduled as the train sets off');
    ok(await until(page, () => window.__train.kid.phase === 'on', null, 8000), 'sequence: the figure hops on');
    if (shot) await shot(page, 'station-sequence-hop');
    ok(await until(page, () => window.__train.kid.phase === 'go', null, 8000), 'sequence: then the train sets off');
    const live = await page.evaluate(() => window.__train.kid.index);
    ok(live === iL(4), `sequence: while it rides, the figure is still counted at the station it left (${live})`);
    await until(page, ([i4, i5]) => window.__train.trainS > window.__train.stopS[i4] + 2 && window.__train.trainS < window.__train.stopS[i5] - 2, [iL(4), iN], 8000);
    if (shot) await shot(page, 'station-sequence-smoke');
    ok(await until(page, () => window.__phases.includes('off'), null, 20000), 'sequence: the train arrives and the figure hops off');
    ok(await until(page, () => window.__train.kid.phase === '' && window.__train.kid.index === window.__train.currentIndex && window.__train.kid.waving, null, 8000), 'sequence: the figure lands on the next platform and waves');
    const b = await train(page);
    ok(Math.abs(b.trainS - (b.stops[iN] + b.engineAt)) < 0.01, `sequence: the train ends at the next stop (${b.trainS.toFixed(2)})`);
    ok(await until(page, () => !window.__train.running, null, 8000), 'sequence: the scene settles');
    await page.waitForTimeout(800);
    const r0 = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(3000);
    const frames = (await page.evaluate(() => window.__raf)) - r0;
    ok(frames <= 2, `sequence: no idle frames afterwards (${frames} in 3 s)`);
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.trainDone)) === 4, 'sequence: remembered, so it plays once');
    ok(errors.length === 0, `sequence: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, justDone(), { init: [RAF_COUNT], extra: { reducedMotion: 'reduce' } });
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 300);
    let phases = 0;
    for (let i = 0; i < 14; i++) { phases += (await page.evaluate(() => window.__train.kid.phase)) ? 1 : 0; await page.waitForTimeout(150); }
    const a = await train(page);
    ok(phases === 0 && a.kid.index === iN && Math.abs(a.trainS - (a.stops[iN] + a.engineAt)) < 0.01, `reduced motion sequence: no hop and no ride, the figure and the train are at the next station (${phases} phases, kid ${a.kid.index})`);
    await page.waitForTimeout(800);
    ok(await until(page, () => window.__train.tootAt !== null, null, 4000), 'reduced motion sequence: one soft toot at the end (the arrival toot only, no start toot)');
    ok((await page.evaluate(() => window.__train.startTootAt)) === null, 'reduced motion sequence: no toot at the start');
    const r0 = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(3000);
    ok((await page.evaluate(() => window.__raf)) - r0 <= 2, 'reduced motion sequence: no idle frames');
    ok(errors.length === 0, `reduced motion sequence: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // the 2D path: a toot, the figure slides to the next stone, smoke, and the real figure is back
    const { ctx, page, errors } = await openHome(browser, url, vp, justDone({ trainWorld: false, migrated1912: true }));
    await page.waitForSelector('.map-scroll');
    await page.evaluate(async () => (await import('/js/sfx.js')).sfx.unlock());
    ok(await until(page, () => !!document.querySelector('.seq-kid'), null, 6000), '2D sequence: the figure sets off along the path');
    ok(await until(page, () => document.querySelectorAll('.scene .steam-puff').length > 0, null, 4000), '2D sequence: with puffs of smoke');
    ok(await until(page, () => !document.querySelector('.seq-kid') && getComputedStyle(document.querySelector('.stone-kid')).visibility === 'visible', null, 8000), '2D sequence: it arrives and the figure stands by the next stone');
    ok(await page.evaluate(() => window.__audioNotes().filter((n) => n.event === 'whistle' && n.sample).length) >= 1, '2D sequence: and the train whistle as it sets off');

    ok(errors.length === 0, `2D sequence: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// Lesson finish, auto-return and the checkpoint stop (1.9.31): after "Yes, go on" the railway opens by itself and the figure rides
// to the next station; a Story or Smooth Ride that comes next holds the train (the figure stands beside it, it is the current stop).
const kidSeed = { character: { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true } };
const tapYesTwice = async (page) => {
  await page.waitForSelector('.finish');
  await page.waitForFunction(() => !document.querySelector('.btn.got').disabled, null, { timeout: 3000 });
  await page.click('.btn.got');
  await page.waitForFunction(() => !document.querySelector('.btn.got').disabled, null, { timeout: 3000 });
  await page.click('.btn.got');
};
export async function autoReturnChecks({ browser, url, ok, shot }) {
  const vp = VIEWPORTS[0];
  {
    // lesson 2 finished with a lesson next: Yes twice, no extra tap, and the figure rides to lesson 3
    const PHASES = () => { window.__phases = []; setInterval(() => { const p = window.__train && window.__train.kid.phase; if (p !== undefined && window.__phases[window.__phases.length - 1] !== p) window.__phases.push(p); }, 16); };
    const { ctx, page, errors } = await openHome(browser, url, vp, state(1, { trainAt: iL(2), trainDone: 1 }, kidSeed), { route: '#/lesson/2/finish', init: [PHASES] });
    await tapYesTwice(page);
    await page.waitForTimeout(450);
    ok(page.url().endsWith('#/lesson/2/finish') && await page.evaluate(() => !!document.querySelector('.finish')), 'auto-return: the success moment stays for a short time first');
    ok(await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).lessons[2].result) === 'got-it', 'auto-return: "Yes" records got-it at once');
    ok(await page.evaluate(() => [...document.querySelectorAll('.finish .btn')].every((b) => b.disabled)), 'auto-return: the buttons are off while it waits (no double tap)');
    await page.waitForFunction(() => location.hash === '#/home', null, { timeout: 3000 }).catch(() => {});
    ok(page.url().endsWith('#/home'), `auto-return: the app goes to the railway by itself (${page.url().split('#')[1]})`);
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 300); // only the first-touch audio unlock
    const a = await train(page);
    ok(a.arriving && a.fromIndex === iL(2) && a.currentIndex === iL(3), `auto-return: the ride starts at lesson 2's station and aims at lesson 3 (${a.fromIndex} to ${a.currentIndex})`);
    ok(await until(page, () => window.__phases.includes('on') && window.__phases.includes('go'), null, 10000), 'auto-return: the figure hops on and the train rides');
    ok(await until(page, () => window.__phases.includes('off') && !window.__train.running, null, 20000), 'auto-return: it arrives and the figure hops off');
    const b = await train(page);
    ok(b.kid.index === iL(3) && Math.abs(b.trainS - (b.stops[iL(3)] + b.engineAt)) < 0.01, `auto-return: the train stands at lesson 3 (${b.kid.index})`);
    if (shot) await shot(page, 'auto-return-arrived');
    ok(errors.length === 0, 'auto-return: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    // "Not yet, practice again" behaves as before: back to the overview, no return to the railway
    const { ctx, page, errors } = await openHome(browser, url, vp, state(1, { trainAt: iL(2), trainDone: 1 }, kidSeed), { route: '#/lesson/2/finish' });
    await page.waitForSelector('.finish');
    await page.waitForFunction(() => !document.querySelector('.btn.practice').disabled, null, { timeout: 3000 });
    await page.click('.btn.practice');
    await page.waitForSelector('.lesson-overview');
    await page.waitForTimeout(1800);
    ok(page.url().endsWith('#/lesson/2') && await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).lessons[2].result) === 'practice-again', '"Not yet, practice again" goes back to the lesson, no auto-return');
    ok(errors.length === 0, 'practice again: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    // lesson 4 finished: the Smooth Ride is next, so the ride ends THERE (the current stop), not at lesson 5
    const PHASES = () => { window.__phases = []; setInterval(() => { const p = window.__train && window.__train.kid.phase; if (p !== undefined && window.__phases[window.__phases.length - 1] !== p) window.__phases.push(p); }, 16); };
    const { ctx, page, errors } = await openHome(browser, url, vp, justDone({ trainAt: iL(4) }), { init: [PHASES] });
    await until(page, () => window.__train && window.__train.frames > 0);
    await page.mouse.click(3, 300);
    const a = await train(page);
    const ck = NODES[iL(4) + 1].checkpoint;
    ok(ck && (ck.kind === 'ride' || ck.kind === 'book'), `checkpoint stop: the stop after lesson 4 is a Story or Smooth Ride (${ck && ck.id})`);
    ok(a.arriving && a.fromIndex === iL(4) && a.currentIndex === iN, `checkpoint stop: the ride runs from lesson 4 to the ${ck.id} station (${a.fromIndex} to ${a.currentIndex})`);
    ok(await until(page, () => window.__phases.includes('off') && !window.__train.running, null, 20000), 'checkpoint stop: the figure hops off there');
    const b = await train(page);
    ok(b.kid.index === iN && Math.abs(b.trainS - (b.stops[iN] + b.engineAt)) < 0.01, `checkpoint stop: the train stops at the ${ck.id} station and the figure stands beside it (kid ${b.kid.index})`);
    const st = await shown(page);
    ok(/current/.test(st[iN].cls) || st[iN].cls.includes('is-current'), `checkpoint stop: its station is highlighted as the current one (${st[iN].cls})`);
    ok(!/current/.test(st[iN + (CUR.checkpoints.filter((c) => c.after === 4).length)].cls), `checkpoint stop: the lesson after the checkpoints is not current (${st[iN + CUR.checkpoints.filter((c) => c.after === 4).length].cls})`);
    if (shot) await shot(page, 'checkpoint-stop');
    ok(errors.length === 0, 'checkpoint stop: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    // the checkpoint itself is finished: the next ride goes on, to the next held checkpoint if there is one, else the lesson
    const nAfter4 = CUR.checkpoints.filter((c) => c.after === 4);
    if (nAfter4.length > 1) {
      const first = nAfter4[0];
      const seed = justDone({ trainAt: iL(4) + 1, trainDone: 4 });
      seed.checkpoints = { [first.id]: { result: 'got-it', completedAt: '2026-10-05T10:00:00.000Z' } };
      const { ctx, page, errors } = await openHome(browser, url, vp, seed);
      await until(page, () => window.__train && window.__train.frames > 0);
      await page.mouse.click(3, 300);
      const a = await train(page);
      ok(a.arriving && a.fromIndex === iN && a.currentIndex === iN + 1, `checkpoint stop: after the first one is done the ride goes on to the next one (${a.fromIndex} to ${a.currentIndex})`);
      const k2 = await until(page, (n) => !window.__train.running && window.__train.kid.index === n + 1 && window.__train.kid.phase === '', iN, 20000);
      ok(k2, `checkpoint stop: and stops there (${JSON.stringify(await page.evaluate(() => ({ r: window.__train.running, k: window.__train.kid.index, p: window.__train.kid.phase, c: window.__train.currentIndex })))})`);
      ok(errors.length === 0, 'checkpoint stop 2: errors ' + errors.join(' | '));
      await ctx.close();
    }
  }
  {
    // the 2D path holds the figure at the checkpoint stone too
    const { ctx, page, errors } = await openHome(browser, url, vp, justDone({ trainWorld: false, migrated1912: true }));
    await page.waitForSelector('.map-scroll');
    ok(await until(page, () => !document.querySelector('.seq-kid') && !!document.querySelector('.stone-kid'), null, 10000), '2D checkpoint stop: the ride ends');
    const cur = await page.evaluate(() => [...document.querySelectorAll('.stone.is-current')].map((s) => s.getAttribute('aria-label')));
    ok(cur.length === 1 && cur[0] === NODES[iN].checkpoint.title, `2D checkpoint stop: the one current stone is the checkpoint (${cur})`);
    ok(errors.length === 0, '2D checkpoint stop: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    // reduced motion: it still returns by itself, with no ride animation
    const { ctx, page, errors } = await openHome(browser, url, vp, state(1, { trainAt: iL(2), trainDone: 1 }, kidSeed), { route: '#/lesson/2/finish', extra: { reducedMotion: 'reduce' } });
    await tapYesTwice(page);
    await page.waitForFunction(() => location.hash === '#/home', null, { timeout: 3500 }).catch(() => {});
    ok(page.url().endsWith('#/home'), 'reduced motion auto-return: it still goes back to the railway by itself');
    await until(page, () => window.__train && window.__train.frames > 0);
    let phases = 0;
    for (let i = 0; i < 10; i++) { phases += (await page.evaluate(() => window.__train.kid.phase)) ? 1 : 0; await page.waitForTimeout(150); }
    const a = await train(page);
    ok(phases === 0 && a.kid.index === iL(3) && Math.abs(a.trainS - (a.stops[iL(3)] + a.engineAt)) < 0.01, `reduced motion auto-return: no ride, the train is at lesson 3 (${phases} phases, kid ${a.kid.index})`);
    ok(errors.length === 0, 'reduced motion auto-return: errors ' + errors.join(' | '));
    await ctx.close();
  }
}

// Hidden page, leaving and coming back, and the 2D fallback.
export async function lifeChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[2];
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, state(2));
    await until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running);
    await page.waitForTimeout(800);
    const a0 = await train(page);
    await page.waitForTimeout(1500);
    const a = await train(page);
    ok(a.idleFrames === 0 && a.frames === a0.frames && !a.running, `idle: nothing is drawn while nothing moves (${a0.frames} then ${a.frames} frames)`);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(300);
    const b = await train(page);
    await page.waitForTimeout(1500);
    const c = await train(page);
    ok(c.frames === b.frames, `hidden: the render loop stops while the page is hidden (${b.frames} then ${c.frames})`);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(1200);
    ok((await train(page)).frames > c.frames, 'hidden: and starts again when the page is back');
    // leave Home and come back ten times: the WebGL contexts do not pile up
    const counts = [];
    for (let k = 0; k < 10; k++) {
      await page.evaluate(() => { location.hash = '#/lesson/1'; });
      await page.waitForSelector('.lesson-overview');
      await page.evaluate(() => { location.hash = '#/home'; });
      await page.waitForFunction(() => document.querySelectorAll('.home3d').length === 1 && !document.querySelector('.screen.leaving') && window.__train && !window.__train.disposed && window.__train.frames > 0, null, { timeout: 15000 });
      counts.push(await page.evaluate(() => window.__liveGL()));
    }
    ok(counts.every((n) => n <= 1), `leaving Home disposes the renderer: live WebGL contexts after each return ${counts.join(',')}`);
    ok(await page.evaluate(() => window.__gls.length >= 10), 'leaving Home: each visit made its own context (and lost the last one)');
    ok(errors.length === 0, `life: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // No WebGL: the 2D map, with its stones, and no error.
  for (const [why, opts] of [['no WebGL', { init: [NO_WEBGL] }], ['Train world off', {}]]) {
    const st = why === 'Train world off' ? state(3, { trainWorld: false, migrated1912: true }) : state(3);
    const { ctx, page, errors } = await openHome(browser, url, vp, st, opts);
    await page.waitForSelector('.stone', { timeout: 10000 });
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => ({ map: !!document.querySelector('.map-scroll'), three: !!document.querySelector('.home3d'), stones: document.querySelectorAll('.stone').length, live: window.__liveGL() }));
    ok(m.map && !m.three && m.stones === worldNodes(3).length && m.live === 0, `${why}: the 2D path renders instead, with all ${worldNodes(3).length} stones of the world and no WebGL context (${JSON.stringify(m)})`);
    await page.locator('.stone.is-current').click();
    await page.waitForSelector('.lesson-overview');
    ok(page.url().endsWith('#/lesson/4'), `${why}: its current stone opens lesson 4`);
    ok(errors.length === 0, `${why}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Grownups has no Train world switch any more (the 2D map is only the fallback for phones without WebGL).
  {
    const { ctx, page, errors } = await openHome(browser, url, VIEWPORTS[0], state(3));
    await page.waitForSelector('.pill-hold');
    await page.evaluate(() => { location.hash = '#/home'; });
    const hold = await page.locator('.pill-hold').boundingBox();
    await page.mouse.move(hold.x + 20, hold.y + 20); await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
    await page.waitForSelector('.grownups');
    ok((await page.locator('[aria-label="Train world"], [aria-label="Play recorded letter sounds"]').count()) === 0, 'Grownups: no Train world switch and no recorded-sounds switch');
    ok(errors.length === 0, `Grownups switch: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// Heat: count requestAnimationFrame callbacks (and endless animations) while idle, on Home after the arrival, after a
// lesson and back, on Letter Hunt and on Practicing Words. Each should be about zero. The AudioContext sleeps when silent.
const RAF_COUNTER = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
export async function heatChecks({ browser, url, ok, log = () => {} }) {
  const { ctx, page, errors } = await openHome(browser, url, VIEWPORTS[0], state(4, { trainAt: iL(4) }), { init: [RAF_COUNTER] });
  const idle = async (label) => {
    const r0 = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(3000);
    const m = await page.evaluate((r) => ({ raf: window.__raf - r, endless: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().endTime === Infinity).length }), r0);
    log(`${label}: ${m.raf} animation frames in 3 s idle, ${m.endless} endless animations`);
    ok(m.raf <= 2 && m.endless === 0, `heat, ${label}: about zero frames in 3 s of idle (${m.raf}) and no endless animation (${m.endless})`);
  };
  await until(page, () => window.__train && window.__train.frames > 0);
  await page.mouse.click(3, 400); // the first tap lets sound play
  ok(await until(page, () => window.__train.tootAt !== null && !window.__train.running, null, 20000), 'heat: the arrival plays and ends');
  await page.waitForTimeout(800);
  await idle('Home after the arrival');
  await page.waitForTimeout(1500);
  ok((await page.evaluate(async () => (await import('/js/sfx.js')).sfx.state())) === 'suspended', 'heat: the AudioContext is suspended once the toot has rung out');
  await page.evaluate(() => { location.hash = '#/lesson/5'; });
  await page.waitForSelector('.lesson-overview');
  await page.waitForTimeout(1200);
  await page.evaluate(() => { location.hash = '#/home'; });
  await until(page, () => window.__train && !window.__train.disposed && window.__train.frames > 0 && !window.__train.running, null, 15000);
  await page.waitForTimeout(2600); // Pip's hello wave
  await idle('Home after a lesson and back');
  await page.evaluate(() => { location.hash = '#/lesson/3/task/3'; });
  await page.waitForSelector('.screen:not(.leaving) .sky-letter');
  await page.waitForTimeout(1500);
  await idle('Letter Hunt');
  await page.evaluate(() => { location.hash = '#/lesson/3/task/7'; });
  await page.waitForSelector('.screen:not(.leaving) .sack-card');
  await page.waitForTimeout(1500);
  await idle('Practicing Words');
  ok(errors.length === 0, `heat: errors ${errors.join(' | ')}`);
  await ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  const OUT = path.join(ROOT, '_test');
  fs.mkdirSync(OUT, { recursive: true });
  const shot = async (page, name) => page.screenshot({ path: path.join(OUT, `train-${name}.png`) });
  await pipChecks({ browser, url, ok });
  for (const vp of VIEWPORTS) await homeChecks({ browser, url, ok, vp, shot });
  await tapChecks({ browser, url, ok });
  await arrivalChecks({ browser, url, ok, shot });
  await sequenceChecks({ browser, url, ok, shot });
  await autoReturnChecks({ browser, url, ok, shot });
  await lifeChecks({ browser, url, ok });
  await heatChecks({ browser, url, ok, log: console.log });
  await browser.close(); server.close();
  console.log(`train: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
