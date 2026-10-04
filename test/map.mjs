// The 2D home map (the Train world switch off, or no WebGL): 13 lessons and 4 checkpoint stones on one long winding path, scrolling up in portrait and along in landscape.
// Run alone with `node test/map.mjs`, or as part of test/smoke.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { audit } from './audit.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, touchDrag, SEEN, doneThrough } from './lib.mjs';
import { mapGeometry, BUBBLE_FLIP_Y } from '../js/screens/home.js';
import { tasksFor } from '../js/lessons.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const NODES = CUR.lessons.flatMap((l) => [{ lesson: l }, ...CUR.checkpoints.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
const label = (n) => (n.lesson ? `Lesson ${n.lesson.number}` : n.checkpoint.title);
const seed = (done, extra = {}) => `localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneThrough(done), settings: { seenScripts: SEEN, trainWorld: false }, firstRunDone: true, ...extra })}))`;
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const rectOf = (page, sel, i = 0) => page.evaluate(([s, k]) => { const e = document.querySelectorAll(s)[k]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, [sel, i]);
const rectsOf = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, label: e.getAttribute('aria-label') }; }), sel);
const inside = (r, vp) => r.x >= -0.5 && r.y >= -0.5 && r.x + r.w <= vp.width + 0.5 && r.y + r.h <= vp.height + 0.5;

async function open(browser, url, vp, init, route = '#/home', extra) {
  const made = await newPage(browser, vp, extra);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(init);
  await made.page.goto(url + route);
  await made.page.waitForSelector('.stone');
  return made;
}

// The geometry on its own: stones never overlap, wind inside the scene, and the scene grows with the number of stones.
export function geometryChecks(ok) {
  for (const n of [1, 4, 17, 30]) {
    const g = mapGeometry(n);
    ok(g.stones.length === n && g.stones.every((s) => s.px >= 20 && s.px <= 80 && s.py > 0 && s.py < g.H && s.ly >= 28 && s.ly <= 64 && s.lx > 0 && s.lx < g.W), `map geometry (${n} stones): every stone is inside the scene`);
    ok(g.stones.every((s, i) => !i || (g.stones[i - 1].py - s.py >= 140 && s.lx - g.stones[i - 1].lx >= 180)), `map geometry (${n} stones): stones are at least 140 px apart in portrait and 180 px in landscape`);
  }
  ok(mapGeometry(17).H > mapGeometry(8).H && mapGeometry(17).W > mapGeometry(8).W, 'map geometry: more stones make a longer path');
  ok(BUBBLE_FLIP_Y > 200, 'map geometry: a bubble flips below its stone near the top of the scene');
}

export async function mapChecks({ browser, url, ok, vp, shot }) {
  const portrait = vp.width < vp.height;
  const axis = portrait ? 'top' : 'left';
  const allCks = Object.fromEntries(CUR.checkpoints.slice(0, -1).map((k) => [k.id, { result: 'got-it', completedAt: '2026-10-01T12:00:00Z' }]));
  // Progress states: nothing done, lessons 1 to 3, 1 to 8, all but the last, every lesson, and everything but the last sack.
  const doneStates = [[0, {}], [3, {}], [8, {}], [CUR.lessons.length - 1, {}], [CUR.lessons.length, {}], [CUR.lessons.length, { checkpoints: allCks }]];
  for (const [done, extra] of doneStates) {
    const withCks = Object.keys(extra.checkpoints || {});
    const { ctx, page, errors } = await open(browser, url, vp, seed(done, extra));
    await page.waitForTimeout(2200); // the glide to the current stone takes about a second
    const tag = `${vp.name} map (${done} lessons done${withCks.length ? ', sacks done' : ''})`;
    const stones = await rectsOf(page, '.stone');
    ok(stones.length === NODES.length, `${tag}: ${NODES.length} stones, one for each lesson and checkpoint (${stones.length})`);
    ok(stones.every((s, i) => s.label.startsWith(label(NODES[i]))), `${tag}: the stones are in lesson order, each named by its own lesson (${stones.slice(0, 5).map((s) => s.label).join(', ')} ...)`);
    ok(stones.every((s) => s.w >= 47.5 && s.h >= 47.5), `${tag}: every stone is at least 48 px`);
    ok(!stones.some((s, i) => stones.slice(i + 1).some((t) => overlaps(s, t))), `${tag}: no two stones overlap`);
    // States: a lesson is open when the one before is done; a checkpoint when its lesson is done.
    const state = (n) => (n.lesson ? (n.lesson.number <= done ? 'done' : n.lesson.number === done + 1 ? 'current' : 'locked') : (withCks.includes(n.checkpoint.id) ? 'done' : n.checkpoint.after <= done ? 'open' : 'locked'));
    const classes = await page.evaluate(() => [...document.querySelectorAll('.stone')].map((s) => [...s.classList].filter((c) => c.startsWith('is-')).join(' ')));
    const bad = NODES.map((n, i) => [n, classes[i], i]).filter(([n, c]) => { const w = state(n); return w === 'locked' ? c !== 'is-locked' : w === 'done' ? c !== 'is-done' : w === 'current' ? c !== 'is-current' : !/is-(unlocked|current)/.test(c); });
    ok(bad.length === 0, `${tag}: locked, open, current and done stones are as the progress says (${bad.map(([n, c]) => label(n) + ':' + c).join('; ')})`);
    const current = await page.locator('.stone.is-current').count();
    const finished = done === CUR.lessons.length && !CUR.checkpoints.length; // nothing left to do: no current stone, no bubble
    ok(current === (finished ? 0 : 1), `${tag}: exactly one current stone, so exactly one bubble (${current} stones, ${await page.locator('.bubble').count()} bubbles)`);
    ok((await page.locator('.bubble').count()) === (finished ? 0 : 1), `${tag}: one bubble`);
    // Opens on the current stone, with its bubble, clear of the pill and the full screen button.
    if (!finished) {
    const cur = await rectOf(page, '.stone.is-current');
    const pill = await rectOf(page, '.pill-hold'), fsb = await rectOf(page, '.home-fs');
    ok(cur && inside(cur, vp) && !overlaps(cur, pill) && (!fsb || !overlaps(cur, fsb)), `${tag}: the map opens with the current stone fully in view and clear of the Grownups pill and the full screen button`);
    const bubble = await rectOf(page, '.bubble');
    ok(bubble && inside(bubble, vp) && !overlaps(bubble, pill) && (!fsb || !overlaps(bubble, fsb)), `${tag}: the "Tap to start" bubble is in view and never touches the pill or the button`);
    ok(bubble && (portrait ? true : bubble.y > cur.y + cur.h / 2), `${tag}: ${portrait ? 'the bubble sits by its stone' : 'in landscape the bubble sits below its stone'}`);
    const flipped = await page.evaluate(() => document.querySelector('.bubble').classList.contains('below'));
    if (portrait && withCks.length) ok(flipped && bubble.y > cur.y + cur.h / 2 - 4, `${tag}: the stone near the top of the path has its bubble below it (flipped)`);
    }
    // The path scrolls along its own axis only, and the page does not.
    const m = await page.evaluate(() => { const s = document.querySelector('.map-scroll'); const de = document.documentElement; return { sh: s.scrollHeight, ch: s.clientHeight, sw: s.scrollWidth, cw: s.clientWidth, over: getComputedStyle(s).overscrollBehaviorY, html: getComputedStyle(de).overscrollBehaviorY, doc: de.scrollHeight - de.clientHeight, docw: de.scrollWidth - de.clientWidth }; });
    ok(portrait ? m.sh > m.ch * 2 && m.sw <= m.cw : m.sw > m.cw * 2 && m.sh <= m.ch + 1, `${tag}: the path scrolls ${portrait ? 'up and down' : 'sideways'} and not the other way (${m.sh}/${m.ch}, ${m.sw}/${m.cw})`);
    ok(m.over === 'contain' && m.html === 'none' && m.doc <= 0 && m.docw <= 0, `${tag}: pull to refresh stays off and the page itself never scrolls (${m.over}, ${m.html})`);
    // Animations: only transform and opacity; few of them; only the stones on screen are staggered in.
    const anim = await page.evaluate(() => document.getAnimations().map((a) => ({ props: [...new Set(a.effect ? a.effect.getKeyframes().flatMap((k) => Object.keys(k)) : [])].filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p)), inf: a.effect && a.effect.getTiming().iterations === Infinity })));
    ok(anim.every((a) => a.props.every((p) => ['transform', 'opacity'].includes(p))), `${tag}: every running animation moves only transform or opacity (${[...new Set(anim.flatMap((a) => a.props))].join(', ')})`);
    ok(anim.filter((a) => a.inf).length <= 8, `${tag}: no more than 8 endless animations (${anim.filter((a) => a.inf).length})`);
    const p = await audit(page, tag);
    ok(p.length === 0, p.join(' | '));
    if (shot && !withCks.length && (done === 0 || done === 3)) await shot(page, `${done}`);
    ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// Every stone can be scrolled to and tapped; a swipe over a stone scrolls and never opens it.
export async function mapReachChecks({ browser, url, ok, vp }) {
  const portrait = vp.width < vp.height;
  const { ctx, page, errors } = await open(browser, url, vp, seed(CUR.lessons.length));
  await page.waitForTimeout(1800);
  const tag = `${vp.name} map reach`;
  const pill = await rectOf(page, '.pill-hold'), fsb = await rectOf(page, '.home-fs');
  const failures = [];
  for (let i = 0; i < NODES.length; i++) {
    await page.evaluate((k) => document.querySelectorAll('.stone')[k].scrollIntoView({ block: 'center', inline: 'center' }), i);
    await page.waitForTimeout(60);
    const r = await rectOf(page, '.stone', i);
    if (!(inside(r, vp) && !overlaps(r, pill) && !(fsb && overlaps(r, fsb)))) failures.push(label(NODES[i]));
    const top = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.closest('.stone') ? e.closest('.stone').getAttribute('aria-label') : (e && e.className) || null; }, [r.x + r.w / 2, r.y + r.h / 2]);
    if (!String(top).startsWith(label(NODES[i]))) failures.push(`${label(NODES[i])} is covered by ${top}`);
  }
  ok(failures.length === 0, `${tag}: all ${NODES.length} stones can be scrolled to, are in view there, clear of the pill, and are what a finger would touch (${failures.join('; ')})`);
  // Scrolling to the two ends: the first stone is whole on screen at the start end; the last stone clears the pill at the far end.
  const toEnd = (atStart) => page.evaluate(([port, start]) => { const s = document.querySelector('.map-scroll'); if (port) s.scrollTo(0, start ? s.scrollHeight : 0); else s.scrollTo(start ? 0 : s.scrollWidth, 0); }, [portrait, atStart]);
  await toEnd(true); await page.waitForTimeout(150);
  const first = await rectOf(page, '.stone', 0);
  ok(inside(first, vp), `${tag}: at the start end the first stone is whole on screen (${Math.round(first.x)},${Math.round(first.y)})`);
  await toEnd(false); await page.waitForTimeout(150);
  const last = await rectOf(page, '.stone', NODES.length - 1);
  ok(inside(last, vp) && !overlaps(last, pill) && !(fsb && overlaps(last, fsb)), `${tag}: at the far end the last stone is whole on screen and clear of the pill (${Math.round(last.x)},${Math.round(last.y)})`);
  // A tap on a stone while the map is scrollable opens it.
  await page.evaluate(() => document.querySelectorAll('.stone')[0].scrollIntoView({ block: 'center', inline: 'center' }));
  await page.waitForTimeout(300);
  const f = await rectOf(page, '.stone', 0);
  await page.touchscreen.tap(f.x + f.w / 2, f.y + f.h / 2);
  await page.waitForSelector('.lesson-overview', { timeout: 5000 }).catch(() => {});
  ok(page.url().endsWith('#/lesson/1'), `${tag}: a tap on a stone of a scrollable map opens its lesson`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();

  // A swipe that starts on a stone scrolls the map and does not open the lesson.
  const s2 = await open(browser, url, vp, seed(CUR.lessons.length));
  const pg = s2.page;
  await pg.waitForTimeout(1800);
  const idx = 4; // lesson 5's stone is done and so would open if the swipe counted as a tap
  await pg.evaluate((k) => document.querySelectorAll('.stone')[k].scrollIntoView({ block: 'center', inline: 'center' }), idx);
  await pg.waitForTimeout(300);
  const st = await rectOf(pg, '.stone', idx);
  const before = await pg.evaluate(() => { const s = document.querySelector('.map-scroll'); return s.scrollTop + s.scrollLeft; });
  const from = { x: st.x + st.w / 2, y: st.y + st.h / 2 };
  await touchDrag(pg, from, portrait ? { x: from.x, y: from.y + 260 } : { x: from.x + 260, y: from.y }, { steps: 14 });
  await pg.waitForTimeout(500);
  const after = await pg.evaluate(() => { const s = document.querySelector('.map-scroll'); return s.scrollTop + s.scrollLeft; });
  ok(pg.url().endsWith('#/home') && (await pg.locator('.lesson-overview').count()) === 0, `${tag}: a swipe that starts on a stone does not open it`);
  ok(Math.abs(after - before) > 100, `${tag}: and the swipe scrolled the map (${Math.round(before)} to ${Math.round(after)})`);
  ok(s2.errors.length === 0, `${tag} swipe: errors ${s2.errors.join(' | ')}`);
  await s2.ctx.close();
}

// The first-run card, the Grownups pill and the full screen button stay put while the map scrolls under them.
export async function mapFixedChecks({ browser, url, ok, vp }) {
  const { ctx, page, errors } = await open(browser, url, vp, `localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: {}, settings: { seenScripts: SEEN, trainWorld: false } })}))`);
  await page.waitForTimeout(1500);
  const tag = `${vp.name} map fixed`;
  const get = async () => ({ card: await rectOf(page, '.first-card'), pill: await rectOf(page, '.pill-hold'), fs: await rectOf(page, '.home-fs') });
  const a = await get();
  ok(a.card && a.pill && a.fs, `${tag}: the first-run card, the pill and the full screen button are all there`);
  await page.evaluate(() => { const s = document.querySelector('.map-scroll'); s.scrollTo(0, 0); s.scrollTo(s.scrollWidth / 3, s.scrollHeight / 3); });
  await page.waitForTimeout(300);
  const b = await get();
  ok(JSON.stringify(a) === JSON.stringify(b), `${tag}: none of them moves when the map scrolls`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Saved progress from before the longer path (lessons 1 to 3 done, the first sack maybe done) opens lesson 4.
export async function mapUpgradeChecks({ browser, url, ok }) {
  for (const extra of [{}, { checkpoints: { c1: { result: 'got-it', completedAt: '2026-09-30T12:00:00Z' } } }]) {
    const { ctx, page, errors } = await open(browser, url, VIEWPORTS[0], seed(3, extra));
    await page.waitForTimeout(2000);
    const tag = `old saved progress (${Object.keys(extra).length ? 'sack done' : 'sack not done'})`;
    ok((await page.locator('.stone.is-current').getAttribute('aria-label')) === 'Lesson 4', `${tag}: lesson 4 is the current stone`);
    ok((await page.locator('.stone.is-done').count()) === 3 + (CUR.checkpoints.some((k) => k.id === 'c1') && Object.keys(extra).length ? 1 : 0), `${tag}: the stones for lessons 1 to 3 (and the sack, if the path still has one) are done`);
    await page.locator('.stone.is-current').click();
    await page.waitForSelector('.lesson-overview');
    ok(page.url().endsWith('#/lesson/4') && (await page.locator('.task-card').count()) === tasksFor(CUR.lessons[3]).length, `${tag}: lesson 4 opens with all ${tasksFor(CUR.lessons[3]).length} tasks`);
    ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // A new child starts at the start of the path.
  const { ctx, page } = await open(browser, url, VIEWPORTS[0], `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{},settings:{seenScripts:${JSON.stringify(SEEN)},trainWorld:false},firstRunDone:true}))`);
  await page.waitForTimeout(1800);
  const at = await page.evaluate(() => { const s = document.querySelector('.map-scroll'); return s.scrollHeight - s.clientHeight - s.scrollTop; });
  ok(at <= 2, `a new child starts at the start of the path (${Math.round(at)} px from the bottom)`);
  await ctx.close();
}

export async function mapAllChecks({ browser, url, ok, shot }) {
  geometryChecks(ok);
  for (const vp of VIEWPORTS) { await mapChecks({ browser, url, ok, vp, shot }); await mapReachChecks({ browser, url, ok, vp }); await mapFixedChecks({ browser, url, ok, vp }); }
  await mapUpgradeChecks({ browser, url, ok });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await mapAllChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`map: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
