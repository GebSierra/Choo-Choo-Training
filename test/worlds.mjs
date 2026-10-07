// Prototype 2 (v1.9.8): worlds, the world gateway, the "Did you know?" card, the journey board and the lessons grouped by
// world, all behind Grownups > Previews. Data checks, the helpers, each preview opening from Grownups, the gateway reaching
// the second world's Home with only its stations and then sitting still (heat), tip rotation, the 2D fallback and reduced
// motion. Screenshots for the owner are written to docs/screenshots/v1912/ only with `--shots`.
// Run alone with `node test/worlds.mjs [--shots]`.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch } from './lib.mjs';
import { openHome, state, until, iL } from './train.mjs';
import { checkTips } from './check-content.mjs';
import { worldOf, lessonsIn, unitsIn, unitDone, currentWorld, currentUnit, nextWorld, worldDone, worldAfter, planHome } from '../js/worlds.js';
import { nextTip } from '../js/components/tip-card.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const TIPS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tips.json'), 'utf8'));
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/v1912');
const LIVE_SHOT_DIR = path.join(ROOT, 'docs/screenshots/v1914');
export const SHOT_VIEWPORTS = [
  { name: 'portrait', width: 390, height: 844, deviceScaleFactor: 2 },
  { name: 'landscape', width: 915, height: 412, deviceScaleFactor: 2 },
];

// ---- pure checks: the data and the helpers ----
export function dataChecks(ok) {
  ok(CUR.worlds.length === 11 && CUR.worlds.every((w, i) => w.n === i + 1 && w.id === `W${i + 1}`), 'data: eleven worlds, n 1 to 11');
  ok(new Set(CUR.units.map((u) => u.id)).size === CUR.units.length && CUR.units.length === 14, 'data: fourteen unique units (1.1 to 1.3, 2.1 to 2.11)');
  const want = { 1: '2.1', 2: '2.1', 3: '2.1', 4: '2.2', 5: '2.2', 6: '2.3', 7: '2.5', 8: '2.4', 9: '2.5', 10: '2.6', 11: '2.7', 12: '2.8', 13: '2.7' };
  ok(CUR.lessons.every((l) => l.unit === want[l.number]), 'data: every lesson is in the unit of its sound (n 2.5, f 2.4, d 2.5, h 2.6, g 2.7, b 2.8, l 2.7)');
  ok(CUR.lessons.slice(0, 6).every((l) => l.world === 'W1') && CUR.lessons.slice(6).every((l) => l.world === 'W2'), 'data: lessons 1 to 6 are in world 1, 7 to 13 in world 2');
  ok(CUR.checkpoints.every((k) => k.world === CUR.lessons.find((l) => l.number === k.after).world), 'data: a checkpoint is in the world of its lesson');
  ok(JSON.stringify(unitsIn(CUR, 'W1').map((u) => u.id)) === '["1.1","1.2","1.3","2.1","2.2","2.3"]' && unitsIn(CUR, 'W2').length === 5 && unitsIn(CUR, 'W3').length === 3, 'data: worlds 1 to 3 hold the units the plan lists');
  ok(unitsIn(CUR, 'W4').length === 5 && unitsIn(CUR, 'W11').length === 6 && unitsIn(CUR, 'W4')[0].id === '3.1', 'data: worlds 4 to 11 list their stage units by id');
  ok(unitsIn(CUR, 'W2').map((u) => u.sounds.join('')).join(' ') === 'fo nd ckh ugl rb', 'data: units 2.4 to 2.8 carry their sounds');
  ok(worldOf(CUR, 8).id === 'W2' && worldOf(CUR, 3).id === 'W1' && worldOf(CUR, 99) === null, 'helpers: worldOf');
  ok(lessonsIn(CUR, 'W1').length === 6 && lessonsIn(CUR, 'W2').length === 7 && lessonsIn(CUR, 'W3').length === 0, 'helpers: lessonsIn');
  const fake = (done) => ({ isDone: (n) => n <= done, currentLesson: (t) => (done >= t ? null : done + 1) });
  ok(unitDone(fake(3), CUR, '2.1') && !unitDone(fake(2), CUR, '2.1') && !unitDone(fake(13), CUR, '1.1'), 'helpers: unitDone needs every lesson of the unit, and a unit with none is not done');
  ok(currentWorld(fake(0), CUR).id === 'W1' && currentWorld(fake(6), CUR).id === 'W2' && currentWorld(fake(13), CUR).id === 'W2', 'helpers: currentWorld follows the first unfinished lesson, else the last world with lessons');
  ok(currentUnit(fake(4), CUR, 'W1').id === '2.2' && worldDone(fake(6), CUR, 'W1') && !worldDone(fake(5), CUR, 'W1') && nextWorld(CUR, 'W1').id === 'W2' && nextWorld(CUR, 'W2') === null, 'helpers: currentUnit, worldDone, nextWorld');
  // 1.9.14: what the Home shows (planHome): the world to build, and whether its crossing is due
  const plan = (done, seen) => { const st = { seen }; const store = { ...fake(done), worlds: () => st, setWorlds: (p) => Object.assign(st, p) }; const first = planHome(store, CUR); return { first, again: planHome(store, CUR), st }; };
  let pl = plan(4, null);
  ok(pl.first.world.id === 'W1' && !pl.first.cross && pl.st.seen === 'W1', 'planHome: the first look (no record) shows the current world and only records it');
  pl = plan(6, null);
  ok(pl.first.world.id === 'W2' && !pl.first.cross && pl.st.seen === 'W2', 'planHome: world 1 already done on the first look: no crossing, just record world 2');
  pl = plan(6, 'W1');
  ok(pl.first.cross && pl.first.cross.from.id === 'W1' && pl.first.cross.to.id === 'W2' && pl.first.world.id === 'W1' && pl.st.seen === 'W2', 'planHome: world 1 done and last seen: it shows world 1 and the crossing to world 2 is due, recorded');
  ok(!pl.again.cross && pl.again.world.id === 'W2', 'planHome: asked again, the crossing is not due any more (it plays once)');
  pl = plan(3, 'W1');
  ok(!pl.first.cross && pl.first.world.id === 'W1' && pl.st.seen === 'W1', 'planHome: lessons still to do in the seen world: no crossing');
  pl = plan(8, 'W1');
  ok(pl.first.cross && pl.first.world.id === 'W1' && pl.st.seen === 'W2', 'planHome: more than the world done is still just the one crossing');
  pl = plan(3, 'W2');
  ok(!pl.first.cross && pl.first.world.id === 'W1' && pl.st.seen === 'W1', 'planHome: never a crossing backwards');
  ok(worldAfter(CUR, 'W1').id === 'W2' && worldAfter(CUR, 'W2').name === 'Sunny Hills' && worldAfter(CUR, 'W11') === null && worldAfter(CUR, 'nope') === null, 'helpers: worldAfter names the world that follows, built or not (Sunny Hills after world 2)');
  ok(checkTips(TIPS).length === 0, 'tips: nineteen tips, ids 1 to 19, no heading, no privacy warning');
  const md = fs.readFileSync(path.join(ROOT, 'docs/CURRICULUM.md'), 'utf8');
  ok(TIPS.every((t) => md.replace(/\s+/g, ' ').includes(t.text.replace(/\s+/g, ' '))), 'tips: every tip is verbatim from CURRICULUM.md section 13');
  // rotation: all nineteen once, then again, never the same tip twice in a row
  const mem = { settings: { tipsSeen: [] }, setSetting(k, v) { this.settings = { ...this.settings, [k]: v }; } };
  const seq = Array.from({ length: 40 }, () => nextTip(mem, TIPS).id);
  ok(new Set(seq.slice(0, 19)).size === 19, 'tips: the first nineteen picks are all different');
  ok(new Set(seq.slice(19, 38)).size === 19 && seq.every((id, i) => i === 0 || id !== seq[i - 1]), 'tips: the cycle starts again after all nineteen, never the same tip twice in a row');
  ok(nextTip({ settings: {}, setSetting() {} }, []) === null, 'tips: no tips gives null');
}

const gate = async (page) => {
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
  await page.waitForSelector('.grownups');
};
const RAF_COUNT = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const idleFrames = async (page) => {
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(3000);
  return page.evaluate((r) => ({ raf: window.__raf - r, endless: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().endTime === Infinity).length }), r0);
};
const shot = async (page, name, tag) => { if (SHOTS) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, `${name}-${tag}.png`) }); } };
// Everything inside the viewport, and every button at least 48 px.
const layout = (page, sel, { vertical = true } = {}) => page.evaluate(([s, vert]) => {
  const out = [];
  for (const el of document.querySelectorAll(s)) {
    const r = el.getBoundingClientRect();
    if (r.left < -0.5 || r.right > innerWidth + 0.5 || (vert && (r.top < -0.5 || r.bottom > innerHeight + 0.5))) out.push(`outside ${el.className} ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
  }
  for (const b of document.querySelectorAll(s + ' button, button' + s)) { const r = b.getBoundingClientRect(); if (r.width && (r.width < 47.5 || r.height < 47.5)) out.push(`small ${b.className} ${Math.round(r.width)}x${Math.round(r.height)}`); }
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push('horizontal overflow');
  return out;
}, [sel, vertical]);
const openPreview = async (page, key) => {
  if (key === 'board') { await page.evaluate(() => { location.hash = '#/preview/board'; }); return; } // no longer listed in Previews (1.9.21); the route stays for these checks
  const fold = page.locator('.gu-fold', { hasText: 'Previews' });
  if ((await fold.getAttribute('aria-expanded')) !== 'true') await fold.click();
  await page.locator(`.preview-btn[data-preview="${key}"]`).click();
};
const backToGrownups = async (page) => { await page.locator('.preview-back, .preview-list .icon-btn').first().click(); await page.waitForSelector('.grownups .gu-previews', { state: 'attached' }); };
const seed = (done = 4, settings = {}, extra = {}) => state(done, { trainDone: done, ...settings }, { levels: { seen: 0, earned: {} }, meetDue: false, ...extra });
const tipTexts = new Set(TIPS.map((t) => t.text));

export async function previewChecks({ browser, url, ok, vp }) {
  const tag = vp.name;
  const { ctx, page, errors } = await openHome(browser, url, vp, seed(4), { init: [RAF_COUNT] });
  await until(page, () => window.__train && window.__train.frames > 0);
  ok(await page.evaluate(() => window.__train.world === 'W1' && window.__train.stopCount === 9 && window.__train.lessonCount === 6 && window.__train.checkpointCount === 3 && window.__train.portal && window.__train.signText === 'Green Valley'), `${tag}: the real Home builds only world 1 (9 stops) with a portal and a signpost to Green Valley`);
  await gate(page);

  // ---- the lessons grouped by world and unit (the live list at the top of Grownups) ----
  await page.waitForSelector('.gu-world');
  await page.waitForTimeout(500);
  const g = await page.evaluate(() => ({
    worlds: [...document.querySelectorAll('.gu-world')].map((w) => ({ id: w.dataset.world, open: w.querySelector('.gu-fold').getAttribute('aria-expanded'), hidden: w.querySelector('.gu-fold-body').hidden, units: [...w.querySelectorAll('.gu-unit strong')].map((u) => u.textContent) })),
    rows: document.querySelectorAll('.gu-row').length, note: document.querySelector('.gu-body > .gu-list > .gu-note').textContent,
  }));
  ok(g.worlds.length === 2 && g.worlds[0].open === 'true' && g.worlds[1].open === 'false' && g.worlds[1].hidden, `${tag} list: two worlds with lessons, only the current one open (${JSON.stringify(g.worlds.map((w) => w.id + w.open))})`);
  ok(g.worlds[0].units.join() === 'Unit 2.1,Unit 2.2,Unit 2.3' && g.worlds[1].units.join() === 'Unit 2.4,Unit 2.5,Unit 2.6,Unit 2.7,Unit 2.8', `${tag} list: units group the rows (${g.worlds.map((w) => w.units.join(' ')).join(' / ')})`);
  ok(/9 more worlds/.test(g.note), `${tag} list: the later worlds are noted`);
  await shot(page, 'grownups-top', tag);
  await page.locator('.gu-world[data-world="W2"] .gu-fold').click();
  ok(await page.evaluate(() => document.querySelectorAll('.gu-world[data-world="W2"] .gu-row').length === 7 && document.querySelectorAll('.gu-world[data-world="W1"] .gu-row').length === 9), `${tag} list: opening world 2 shows its seven lessons; world 1 has six lessons and three checkpoints`);
  await page.locator('.gu-world[data-world="W2"] button[aria-label="Unlock lesson 9"]').click();
  ok((await page.locator('.gu-confirm').count()) === 1 && (await page.locator('.gu-world[data-world="W2"] .gu-fold').getAttribute('aria-expanded')) === 'true', `${tag} list: the unlock confirm works inside a fold and the fold stays open`);
  await page.locator('.gu-confirm button', { hasText: 'Cancel' }).click();
  ok((await page.locator('.gu-confirm').count()) === 0, `${tag} list: Cancel closes the confirm`);
  const l3 = await layout(page, '.gu-world-head', { vertical: false });
  ok(l3.length === 0, `${tag} list: fold heads fit and are big enough (${l3.join(' | ')})`);

  ok((await page.locator('.grownups [aria-label="Train world"], .grownups [aria-label="Play recorded letter sounds"]').count()) === 0, `${tag} Grownups: no Train world or Play recorded letter sounds switch`);
  ok(await page.evaluate(() => { const b = document.querySelector('.gu-body'); return b.children[0].querySelector('h2').textContent.trim() === 'Progress' && b.children[1].querySelector('h2').textContent === 'Lessons' && b.children[1].querySelector('.gu-reset') && b.children[2].classList.contains('gu-grouped'); }), `${tag} list: Lessons heading and Reset progress sit above the grouped list`);

  // ---- the Previews fold ----
  const fold = page.locator('.gu-fold', { hasText: 'Previews' });
  ok((await fold.count()) === 1 && (await fold.getAttribute('aria-expanded')) === 'false', `${tag}: Grownups has a closed Previews fold`);
  ok(await page.evaluate(() => { const b = document.querySelector('.gu-body'), k = b.children; return k[k.length - 1].classList.contains('gu-version') && k[k.length - 2].textContent.startsWith('Previews'); }), `${tag}: the Previews fold is the last card, just above the version line`);
  await fold.click();
  ok((await page.locator('.grownups .gu-fold-body:not([hidden]) .gu-note', { hasText: 'Try new screens before they go live.' }).count()) === 1, `${tag}: the Previews note is shown`);
  const btns = await page.locator('.preview-btn').evaluateAll((l) => l.map((b) => { const r = b.getBoundingClientRect(); return { key: b.dataset.preview, h: r.height, w: r.width }; }));
  ok(btns.length === 6 && btns.every((b) => b.h >= 48 && b.w >= 120), `${tag}: six preview buttons (the journey board moved to the Home, 1.9.21), each at least 48 px tall (${JSON.stringify(btns.map((b) => b.key + ':' + Math.round(b.h)))})`);
  await page.locator('.gu-version').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, 'previews-fold', tag);

  // ---- the Did you know? card over Home ----
  await openPreview(page, 'tip');
  ok(await until(page, () => !!document.querySelector('.tip-card.in') && document.querySelector('.home'), null, 15000), `${tag} tip: the card shows over Home`);
  await until(page, () => getComputedStyle(document.querySelector('.tip-card')).opacity === '1', null, 5000);
  const tip = await page.evaluate(() => { const c = document.querySelector('.tip-card'); return { title: c.querySelector('.tip-title').textContent, text: c.querySelector('.tip-text').textContent, id: c.dataset.tip, op: getComputedStyle(c).opacity, close: (() => { const r = c.querySelector('.tip-close').getBoundingClientRect(); return [r.width, r.height]; })(), pip: !!c.querySelector('.pip') }; });
  ok(tip.title === 'Did you know?' && tipTexts.has(tip.text) && !/^did you know/i.test(tip.text), `${tag} tip: the heading is "Did you know?" and the text is one of the nineteen (${tip.id})`);
  ok(tip.op === '1' && tip.close[0] >= 48 && tip.close[1] >= 48 && tip.pip, `${tag} tip: it has faded in, holds a small Pip and has a 48 px close target`);
  const l1 = await layout(page, '.tip-card');
  ok(l1.length === 0, `${tag} tip: fits the screen (${l1.join(' | ')})`);
  ok(await page.evaluate(() => !!document.querySelector('.station-btn') && document.elementFromPoint(innerWidth / 2, 60) !== null), `${tag} tip: it does not block Home (the stations are still there)`);
  await shot(page, 'tip-card', tag);
  await page.locator('.tip-card').click();
  ok(await until(page, () => !document.querySelector('.tip-card'), null, 3000), `${tag} tip: a tap closes it`);
  await backToGrownups(page);
  // the same card closes by itself after about 4.5 s (one timeout, a CSS fade)
  await openPreview(page, 'tip');
  ok(await until(page, () => !!document.querySelector('.tip-card.in'), null, 15000), `${tag} tip: it shows again`);
  const second = await page.evaluate(() => document.querySelector('.tip-card').dataset.tip);
  ok(second === '2', `${tag} tip: the rotation moved on to the next tip (${second})`);
  const t0 = Date.now();
  ok(await until(page, () => !document.querySelector('.tip-card'), null, 9000), `${tag} tip: it closes by itself`);
  const took = Date.now() - t0;
  ok(took > 2500 && took < 7000, `${tag} tip: after about 4.5 s (${took} ms left)`);
  await backToGrownups(page);

  // ---- the journey board ----
  await openPreview(page, 'board');
  ok(await until(page, () => !!document.querySelector('.jb'), null, 15000), `${tag} board: it opens`);
  ok(await until(page, () => document.getAnimations().length === 0, null, 12000), `${tag} board: the entrance animations finish`);
  await page.waitForTimeout(300);
  const jb = await page.evaluate(() => ({
    states: [...document.querySelectorAll('.jb-badge')].map((b) => b.dataset.state), n: document.querySelectorAll('.jb-badge').length,
    stations: [...document.querySelectorAll('.jb-stn')].map((s) => `${s.dataset.unit}:${s.dataset.state}`),
    pip: document.querySelectorAll('.jb-pip').length, pipAt: document.querySelector('.jb-pip') && document.querySelector('.jb-pip').closest('.jb-stn').dataset.unit,
    name: document.querySelector('.jb-world-name').textContent, marks: [document.querySelectorAll('.jb-badge-mark.lock').length, document.querySelectorAll('.jb-badge-mark.gold').length],
    go: (() => { const b = document.querySelector('.jb-go'); const r = b.getBoundingClientRect(); return { text: b.textContent, h: r.height, w: r.width }; })(),
    endless: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().endTime === Infinity).length, running: document.getAnimations().map((a) => a.effect && a.effect.target ? a.effect.target.className || a.effect.target.tagName : '?').join('|'),
  }));
  ok(jb.n === 11 && jb.states[0] === 'current' && jb.states.slice(1).every((s) => s === 'future'), `${tag} board: eleven badges, world 1 current, the rest future (${jb.states.join()})`);
  ok(jb.marks[0] === 10 && jb.marks[1] === 0, `${tag} board: the ten future worlds show a lock, none a gold tick yet`);
  ok(jb.name === 'Starter Station' && jb.stations.join() === '1.1:later,1.2:later,1.3:later,2.1:done,2.2:here,2.3:later', `${tag} board: world 1 opened with its six units, 2.1 ticked, Pip at 2.2 (${jb.stations.join()})`);
  ok(jb.pip === 1 && jb.pipAt === '2.2', `${tag} board: one small Pip, at the current unit`);
  ok(jb.go.text.startsWith('All aboard!') && jb.go.h >= 48 && jb.go.w >= 200, `${tag} board: a big "All aboard!" button`);
  ok(jb.endless === 0 && jb.running === '', `${tag} board: the entrance has finished and nothing loops (running: ${jb.running}; ${jb.endless} endless)`);
  const l2 = await layout(page, '.jb-go');
  const l2b = await page.evaluate(() => [...document.querySelectorAll('.jb-badge')].filter((b) => { const r = b.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth; }).length);
  ok(l2.length === 0 && l2b === 0, `${tag} board: the button and every badge fit the screen (${l2.join(' | ')})`);
  const clipped = await page.evaluate(() => { const t = document.querySelector('.jb-track').getBoundingClientRect(); return [...document.querySelectorAll('.jb-dot, .jb-sound, .jb-title')].filter((s) => { const r = s.getBoundingClientRect(); return r.right > t.left + 1 && r.left < t.left - 0.5; }).length; });
  ok(clipped === 0, `${tag} board: no dot or first letter is cut off at the left of the track (${clipped})`);
  await shot(page, 'journey-board', tag);
  await page.locator('.jb-go').click();
  ok(await until(page, () => !document.querySelector('.jb'), null, 3000) && (await page.locator('.home').count()) === 1, `${tag} board: "All aboard!" closes it and Home is there`);
  await backToGrownups(page);

  // ---- the world gateway ----
  const before = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('reading.v1')); return JSON.stringify({ l: s.lessons, t: s.settings.trainAt, v: s.levels, w: s.worlds }); });
  await openPreview(page, 'gateway');
  ok(await until(page, () => window.__train && window.__train.world === 'W1' && window.__train.frames > 0, null, 20000), `${tag} gateway: the current world's Home opens`);
  const w1 = await page.evaluate(() => ({ stops: window.__train.stopCount, l: window.__train.lessonCount, c: window.__train.checkpointCount, tunnel: window.__train.tunnel, btns: document.querySelectorAll('.station-btn').length, mode: window.__train.gate.mode }));
  ok(w1.stops === 9 && w1.l === 6 && w1.c === 3 && w1.btns === 9 && w1.tunnel && w1.mode === 'out', `${tag} gateway: only world 1 is built (6 lessons, 3 checkpoints) with a tunnel at the end (${JSON.stringify(w1)})`);
  ok(await until(page, () => window.__train && window.__train.gate.phase === 'out', null, 10000), `${tag} gateway: the train rolls toward the tunnel`);
  await page.mouse.click(3, 300); // sound only after a tap
  ok(await until(page, () => !!document.querySelector('.world-card'), null, 30000), `${tag} gateway: the screen goes to the loading card`);
  await page.waitForFunction(() => document.querySelector('.world-card.in'), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(700);
  const card = await page.evaluate(() => { const c = document.querySelector('.world-card'); return { name: c.querySelector('.wg-name').textContent, next: c.querySelector('.wg-next').textContent, color: c.style.getPropertyValue('--wc'), bg: getComputedStyle(c).backgroundColor, tip: c.querySelector('.wg-tip p') && c.querySelector('.wg-tip p').textContent, head: c.querySelector('.wg-tip strong') && c.querySelector('.wg-tip strong').textContent, badge: c.querySelector('.wg-badge').textContent, ready: c.dataset.ready || '' }; });
  ok(card.name === 'Green Valley' && card.next === 'Next stop:' && card.badge === '2' && card.color.trim().toLowerCase() === '#3dd68c' && card.bg === 'rgb(61, 214, 140)', `${tag} gateway: "Next stop: Green Valley" in the world's colour (${card.next} ${card.name} ${card.bg})`);
  ok(card.head === 'Did you know?' && tipTexts.has(card.tip), `${tag} gateway: the card carries a tip from the rotation`);
  const l4 = await layout(page, '.wg-panel');
  ok(l4.length === 0, `${tag} gateway: the card fits the screen (${l4.join(' | ')})`);
  await shot(page, 'loading-card', tag);
  const t1 = Date.now();
  ok(await until(page, () => document.querySelector('.world-card') && document.querySelector('.world-card').dataset.ready === '1', null, 20000), `${tag} gateway: the next world is built behind the card`);
  await page.locator('.world-card').click(); // a tap goes on at once (not waiting the 3 s)
  ok(await until(page, () => !document.querySelector('.world-card'), null, 5000), `${tag} gateway: a tap ends the card (${Date.now() - t1} ms)`);
  ok(await until(page, () => window.__train && window.__train.world === 'W2' && window.__train.frames > 0, null, 20000), `${tag} gateway: the second world's Home is up`);
  const w2 = await page.evaluate(() => ({ stops: window.__train.stopCount, l: window.__train.lessonCount, c: window.__train.checkpointCount, tunnel: window.__train.startTunnel, btns: document.querySelectorAll('.station-btn').length, mode: window.__train.gate.mode, kinds: [...document.querySelectorAll('.station-btn')].map((b) => b.getAttribute('aria-label')).join() }));
  ok(w2.stops === 7 && w2.l === 7 && w2.c === 0 && w2.btns === 7 && w2.tunnel && w2.mode === 'in', `${tag} gateway: the second world has only its own seven stations and a tunnel to roll out of (${JSON.stringify({ ...w2, kinds: undefined })})`);
  ok(w2.kinds.includes('Lesson 7') && w2.kinds.includes('Lesson 13') && !w2.kinds.includes('Lesson 6,') && !/Lesson [1-6]\b/.test(w2.kinds), `${tag} gateway: lessons 7 to 13 only (${w2.kinds})`);
  ok(await until(page, () => window.__train.gate.phase === 'in', null, 8000), `${tag} gateway: the train rolls out of the tunnel`);
  await page.waitForTimeout(1200);
  await shot(page, 'second-world-rolling-out', tag);
  ok(await until(page, () => window.__train.gate.phase === 'done' && !window.__train.running, null, 30000), `${tag} gateway: the train arrives and Home settles`);
  await page.waitForTimeout(3200); // Pip's wave
  await shot(page, 'second-world-home', tag);
  const idle = await idleFrames(page);
  ok(idle.raf <= 2 && idle.endless === 0, `${tag} gateway: heat, ${idle.raf} animation frames in 3 s idle after the sequence and ${idle.endless} endless animations`);
  ok(await page.evaluate(() => window.__liveGL() <= 1), `${tag} gateway: only one WebGL context is alive (the first world's was released)`);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')));
  ok(JSON.stringify({ l: st.lessons, t: st.settings.trainAt, v: st.levels, w: st.worlds }) === before, `${tag} gateway: the preview wrote no progress (trainAt, lessons and levels are as before)`);
  ok(Array.isArray(st.settings.tipsSeen) && st.settings.tipsSeen.length === 3 && new Set(st.settings.tipsSeen).size === 3, `${tag} gateway: the tips shown so far are remembered in the settings (${st.settings.tipsSeen})`);
  const l5 = await layout(page, '.preview-back');
  ok(l5.length === 0, `${tag} gateway: the Back to Grownups chip is a real target (${l5.join(' | ')})`);
  await backToGrownups(page);
  ok(errors.length === 0, `${tag} previews: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// The flat map: the same card between two flat maps, no WebGL involved.
export async function flatChecks({ browser, url, ok }) {
  const vp = SHOT_VIEWPORTS[0];
  const { ctx, page, errors } = await openHome(browser, url, vp, seed(4, { trainWorld: false, migrated1912: true }));
  await page.waitForSelector('.stone');
  await gate(page);
  await openPreview(page, 'gateway');
  ok(await until(page, () => document.querySelectorAll('.stone').length === 9, null, 10000), 'flat gateway: the first world shows its nine stones (6 lessons, 3 checkpoints)');
  ok((await page.locator('.home3d').count()) === 0, 'flat gateway: no 3D');
  ok(await until(page, () => !!document.querySelector('.world-card.in'), null, 15000), 'flat gateway: the loading card shows between the two maps');
  ok((await page.locator('.wg-name').textContent()) === 'Green Valley', 'flat gateway: it names the next world');
  await page.waitForTimeout(700);
  await shot(page, 'loading-card-flat', 'portrait');
  ok(await until(page, () => document.querySelector('.world-card') && document.querySelector('.world-card').dataset.ready === '1', null, 10000), 'flat gateway: the second map is built behind it');
  await page.locator('.world-card').click();
  ok(await until(page, () => !document.querySelector('.world-card') && document.querySelectorAll('.stone').length === 7, null, 8000), 'flat gateway: then the second world shows its seven stones');
  ok(errors.length === 0, `flat gateway: errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Reduced motion: the card, the board and the gateway show without motion.
export async function reducedChecks({ browser, url, ok }) {
  const vp = SHOT_VIEWPORTS[0];
  const { ctx, page, errors } = await openHome(browser, url, vp, seed(4), { extra: { reducedMotion: 'reduce' } });
  await until(page, () => window.__train && window.__train.frames > 0);
  await gate(page);
  await openPreview(page, 'tip');
  ok(await until(page, () => !!document.querySelector('.tip-card.in'), null, 10000), 'reduced: the tip card shows');
  const c = await page.evaluate(() => { const e = document.querySelector('.tip-card'); const cs = getComputedStyle(e); return { still: e.classList.contains('still'), op: cs.opacity, tr: cs.transitionDuration, anim: e.getAnimations().length }; });
  ok(c.still && c.op === '1' && parseFloat(c.tr) < 0.001 && c.anim === 0, `reduced: the tip card is simply there, no transition, no animation (${JSON.stringify(c)})`);
  await page.locator('.tip-card').click();
  ok(await until(page, () => !document.querySelector('.tip-card'), null, 2000), 'reduced: and closes on a tap');
  await backToGrownups(page);
  await openPreview(page, 'board');
  await page.waitForSelector('.jb');
  await page.waitForTimeout(150);
  const b = await page.evaluate(() => { const e = document.querySelector('.jb'); const bd = document.querySelector('.jb-badge'); return { still: e.classList.contains('still'), anim: document.getAnimations().length, tr: getComputedStyle(e).transitionDuration, op: getComputedStyle(bd).opacity, n: document.querySelectorAll('.jb-badge').length, stn: document.querySelectorAll('.jb-stn').length }; });
  ok(b.still && b.anim === 0 && parseFloat(b.tr) < 0.001 && b.op === '1' && b.n === 11 && b.stn === 6, `reduced: the journey board is complete at once, with no animation (${JSON.stringify(b)})`);
  await page.locator('.jb-go').click();
  ok(await until(page, () => !document.querySelector('.jb'), null, 2000), 'reduced: All aboard! closes it at once');
  await backToGrownups(page);
  await openPreview(page, 'gateway');
  ok(await until(page, () => !!document.querySelector('.world-card'), null, 30000), 'reduced: the gateway still reaches the loading card');
  ok(await until(page, () => document.querySelector('.world-card') && document.querySelector('.world-card').dataset.ready === '1', null, 20000), 'reduced: the next world is built behind it');
  await page.locator('.world-card').click();
  ok(await until(page, () => window.__train && window.__train.world === 'W2' && window.__train.gate.phase === 'done' && !window.__train.running, null, 20000), 'reduced: the second world is simply there, the train at its first station');
  ok(await page.evaluate(() => Math.abs(window.__train.trainS - (window.__train.stopS[0] + window.__train.engineAt)) < 0.05), 'reduced: the train rests at the first stop with no roll');
  ok(errors.length === 0, `reduced: errors ${errors.join(' | ')}`);
  await ctx.close();
}


// ---- 1.9.14: worlds are live on the real Home ----
export const LIVE_VIEWPORTS = [
  { name: 'portrait', width: 412, height: 915, deviceScaleFactor: 1 },
  { name: 'landscape', width: 915, height: 412, deviceScaleFactor: 1 },
];
const CHARACTER = { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true };
const doneL = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it', completedAt: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00.000Z` }]));
const L1 = { L1: '2026-10-06T10:00:00.000Z' };
// n lessons done, the train resting at the current stop (no ride, no party): world 1 until lesson 6 is done
const resting = (n, settings = {}, extra = {}) => state(n, { trainDone: n, trainAt: iL(n + 1 <= 13 ? n + 1 : 13), ...settings }, { lessons: doneL(n), levels: { seen: n >= 6 ? 1 : 0, earned: n >= 6 ? L1 : {} }, worlds: { seen: n >= 7 ? 'W2' : 'W1' }, character: CHARACTER, meetDue: false, ...extra });
// world 1 finished and the crossing due, with nothing else to play first
const crossingDue = (settings = {}, extra = {}) => state(6, { trainDone: 6, trainAt: 8, ...settings }, { lessons: doneL(6), levels: { seen: 1, earned: L1 }, worlds: { seen: 'W1' }, character: CHARACTER, meetDue: false, ...extra });
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')));
const liveShot = async (page, name, tag) => { if (SHOTS) { fs.mkdirSync(LIVE_SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(LIVE_SHOT_DIR, `${name}-${tag}.png`) }); } };
const settled = (page, ms = 25000) => until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, ms);
const inView = (r, vp) => r && r.x >= 0 && r.y >= 0 && r.x + (r.w || 0) <= vp.width + 0.5 && r.y + (r.h || 0) <= vp.height + 0.5;
const hitsRect = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// World 1 on the real Home: only its stations, a portal at the end with a glow and a signpost naming the next world.
export async function liveWorldChecks({ browser, url, ok, vp }) {
  const tag = vp.name;
  for (const n of [4, 5]) {
    const { ctx, page, errors } = await openHome(browser, url, vp, resting(n), { init: [RAF_COUNT] });
    ok(await settled(page), `${tag} world 1 at lesson ${n + 1}: Home settles`);
    const t = await page.evaluate(() => { const x = window.__train; return { world: x.world, stops: x.stopCount, l: x.lessonCount, c: x.checkpointCount, portal: x.portal, sign: x.signText, start: x.startTunnel, next: x.nextWorld, btns: [...document.querySelectorAll('.station-btn')].map((b) => b.getAttribute('aria-label')), spot: x.portalSpot(), wagons: x.wagons, parked: x.parked, upgrade: x.engineUpgrade }; });
    ok(t.world === 'W1' && t.stops === 9 && t.l === 6 && t.c === 3 && t.btns.length === 9, `${tag} world 1 at lesson ${n + 1}: only world 1's nine stations are built (${t.btns.length} buttons)`);
    ok(!t.btns.some((b) => /Lesson (7|8|9|1[0-3])\b/.test(b)), `${tag} world 1 at lesson ${n + 1}: no lesson of Green Valley is on the Home (${t.btns.filter((b) => /Lesson/.test(b)).length} lessons)`);
    ok(t.portal && t.sign === 'Green Valley' && t.next === 'W2' && !t.start, `${tag} world 1 at lesson ${n + 1}: the line runs into a tunnel portal with a signpost naming Green Valley, and no start tunnel`);
    // (in landscape the portal is still just above the screen at lesson 5 and comes into view at lesson 6, the last lesson)
    const need = vp.width > vp.height ? (n === 5 ? 0 : -1e9) : 70;
    ok(t.spot && t.spot.x > 0 && t.spot.x < vp.width && t.spot.y > need && t.spot.y < vp.height, `${tag} world 1 at lesson ${n + 1}: the portal is on the screen below the top bar (${JSON.stringify(t.spot && { x: Math.round(t.spot.x), y: Math.round(t.spot.y) })})`);
    ok(t.wagons === n && t.parked === 0 && t.upgrade === 0, `${tag} world 1 at lesson ${n + 1}: the train pulls its ${n} letter wagons and the engine is not upgraded yet (${t.wagons} wagons, upgrade ${t.upgrade})`);
    await liveShot(page, `w1-lesson${n + 1}`, tag);
    if (n === 5) {
      // at the last stops the camera shows the portal and the signpost, clear of the last station's sign
      await page.evaluate(() => window.__train.show(100));
      await page.waitForTimeout(900);
      await until(page, () => !window.__train.running, null, 8000);
      const e = await page.evaluate(() => ({ spot: window.__train.portalSpot(), board: window.__train.signRect(), last: (() => { const b = document.querySelector('.station-btn[data-index="8"]'); const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, shown: b.dataset.shown }; })(), focus: window.__train.focus, stops: window.__train.stopS }));
      ok(e.spot && e.spot.x > 0 && e.spot.x < vp.width && e.spot.y > 70 && e.spot.y < vp.height, `${tag} last stop: the portal is in view (${JSON.stringify(e.spot && { x: Math.round(e.spot.x), y: Math.round(e.spot.y) })})`);
      ok(e.board && e.board.w > 60 && inView(e.board, vp) && e.board.y > 60, `${tag} last stop: the signpost's board is whole on the screen and readable (${JSON.stringify(e.board && { w: Math.round(e.board.w), h: Math.round(e.board.h) })})`);
      ok(e.last.shown === '1' && !hitsRect(e.board, e.last), `${tag} last stop: the board does not cover the last station's sign (${JSON.stringify(e.board)} vs ${JSON.stringify(e.last)})`);
      await liveShot(page, 'w1-end-portal', tag);
    }
    await page.waitForTimeout(800);
    const r0 = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(3000);
    const m = await page.evaluate((r) => ({ raf: window.__raf - r, endless: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().endTime === Infinity).length }), r0);
    ok(m.raf <= 2 && m.endless === 0, `${tag} world 1 at lesson ${n + 1}: heat, the portal and the signpost are still (${m.raf} frames in 3 s, ${m.endless} endless animations)`);
    ok(errors.length === 0, `${tag} world 1 at lesson ${n + 1}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// The crossing: lesson 6 done. The ride, level one in the portal, the portal again into the loading card, world 2 rolls out of a
// tunnel, and it plays once.
export async function liveCrossingChecks({ browser, url, ok, vp }) {
  const tag = vp.name;
  const PHASES = () => { window.__lp = []; setInterval(() => { const t = window.__train, p = t ? [t.kid.phase, t.level.phase, t.gate.phase].join('/') : 'none'; if (window.__lp[window.__lp.length - 1] !== p) window.__lp.push(p); }, 16); };
  const six = state(6, { trainAt: 7, trainDone: 5 }, { lessons: doneL(6), levels: { seen: 0, earned: {} }, worlds: { seen: 'W1' }, character: CHARACTER, meetDue: false });
  const { ctx, page, errors } = await openHome(browser, url, vp, six, { init: [RAF_COUNT, PHASES] });
  await until(page, () => window.__train && window.__train.frames > 0);
  await page.mouse.click(3, 300);
  ok(await page.evaluate(() => window.__train.world === 'W1' && window.__train.level.id === 'L1' && window.__train.gate.mode === 'out'), `${tag} crossing: Home shows world 1 with level one and the crossing due`);
  ok(await until(page, () => window.__train.kid.phase === 'go', null, 12000), `${tag} crossing: first the station-complete ride`);
  ok(await until(page, () => window.__train.level.phase === 'in', null, 25000), `${tag} crossing: then level one: the train rolls into the portal`);
  await page.waitForTimeout(450);
  await liveShot(page, 'crossing-level-ride', tag);
  ok(await until(page, () => window.__train.level.phase === 'party', null, 12000), `${tag} crossing: the level party`);
  ok(await until(page, () => window.__train.gate.phase === 'out', null, 20000), `${tag} crossing: after the party the train rolls into the portal again`);
  await page.waitForTimeout(1300);
  await liveShot(page, 'crossing-train-entering', tag);
  ok(await until(page, () => { const h = document.querySelector('.gateway-host'); return h && h.dataset.phase === 'card' && !!document.querySelector('.world-card.in'); }, null, 20000), `${tag} crossing: the loading card comes up`);
  await page.waitForTimeout(700);
  const card = await page.evaluate(() => { const c = document.querySelector('.world-card'); return { name: c.querySelector('.wg-name').textContent, next: c.querySelector('.wg-next').textContent, color: c.style.getPropertyValue('--wc').trim().toLowerCase(), tip: c.querySelector('.wg-tip p') && c.querySelector('.wg-tip p').textContent, back: !!document.querySelector('.preview-back') }; });
  ok(card.next === 'Next stop:' && card.name === 'Green Valley' && card.color === '#3dd68c' && tipTexts.has(card.tip) && !card.back, `${tag} crossing: "Next stop: Green Valley" in its colour with a tip from the rotation (${card.name})`);
  await liveShot(page, 'crossing-loading-card', tag);
  ok(await until(page, () => document.querySelector('.world-card') && document.querySelector('.world-card').dataset.ready === '1', null, 20000), `${tag} crossing: world 2 is built behind the card`);
  const t0 = Date.now();
  ok(await until(page, () => !document.querySelector('.world-card'), null, 9000), `${tag} crossing: the card ends by itself after about 3 s (${Date.now() - t0} ms more)`);
  ok(await until(page, () => window.__train && window.__train.world === 'W2' && window.__train.gate.phase === 'in', null, 10000), `${tag} crossing: world 2's train rolls out of a tunnel`);
  await page.waitForTimeout(900);
  await liveShot(page, 'crossing-rolling-out', tag);
  ok(await until(page, () => { const h = document.querySelector('.gateway-host'); return h && h.dataset.phase === 'done' && window.__train.gate.phase === 'done' && !window.__train.running; }, null, 30000), `${tag} crossing: the train arrives at world 2's first station and Home settles`);
  const w2 = await page.evaluate(() => { const t = window.__train; return { world: t.world, stops: t.stopCount, l: t.lessonCount, c: t.checkpointCount, start: t.startTunnel, portal: t.portal, sign: t.signText, btns: [...document.querySelectorAll('.station-btn')].map((b) => b.getAttribute('aria-label')), specials: t.specials, trainS: t.trainS, rest: t.stopS[0] + t.engineAt, len: t.trainLength, wagons: t.wagons, parked: t.parked, upgrade: t.engineUpgrade }; });
  ok(w2.world === 'W2' && w2.stops === 7 && w2.l === 7 && w2.c === 0 && w2.btns.length === 7 && w2.btns[0].startsWith('Lesson 7') && !w2.btns.some((b) => /Lesson [1-6]\b/.test(b)), `${tag} crossing: world 2 shows only lessons 7 to 13 (${w2.btns.length} stations)`);
  ok(w2.start && w2.portal && w2.sign === 'Sunny Hills', `${tag} crossing: world 2 has a start tunnel and an end portal with a signpost to Sunny Hills`);
  ok(w2.wagons === 0 && w2.parked === 0 && w2.specials.join() === 'caboose' && w2.upgrade === 1 && Math.abs(w2.trainS - w2.rest) < 0.05, `${tag} crossing: the letter wagons were left behind (${w2.wagons}), the engine has upgrade ${w2.upgrade}, only the newest special car (${w2.specials}) came through, and it rests at lesson 7`);
  await page.waitForTimeout(3000);
  await liveShot(page, 'w2-home', tag);
  // the upgraded engine close up (the camera moves in on it: the screenshot is of the 3D scene at the engine)
  await page.evaluate(() => window.__train.closeUp && window.__train.closeUp());
  await page.waitForTimeout(600);
  await liveShot(page, 'engine-upgrade-1', tag);
  await page.evaluate(() => window.__train.closeUp && window.__train.closeUp(false));
  const lp = await page.evaluate(() => window.__lp.join(' > '));
  ok(/(toot|on)\//.test(lp) && /\/in\//.test(lp) && /\/party\//.test(lp) && /\/\/out/.test(lp) && /\/\/in/.test(lp), `${tag} crossing: phases ran ride, level, crossing out, crossing in (${lp.split(' > ').length} changes)`);
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(3000);
  const idle = (await page.evaluate(() => window.__raf)) - r0;
  ok(idle <= 2 && (await page.evaluate(() => window.__liveGL() <= 1)), `${tag} crossing: heat after the crossing, ${idle} frames in 3 s and one WebGL context`);
  let st = await stored(page);
  ok(st.worlds.seen === 'W2' && st.levels.seen === 1, `${tag} crossing: recorded (world 2 seen), so it plays once`);
  // the end of world 2
  await page.evaluate(() => window.__train.show(100));
  await page.waitForTimeout(1000);
  await until(page, () => !window.__train.running, null, 8000);
  const e = await page.evaluate(() => ({ spot: window.__train.portalSpot(), board: window.__train.signRect() }));
  ok(e.spot && e.board && inView(e.board, vp) && e.spot.y > 70, `${tag} crossing: at world 2's last station the portal and its signpost are in view`);
  await liveShot(page, 'w2-end-portal', tag);
  // reload: no replay
  await page.reload();
  await until(page, () => window.__train && window.__train.frames > 1, null, 20000);
  await page.waitForTimeout(4500);
  const again = await page.evaluate(() => ({ world: window.__train.world, card: !!document.querySelector('.world-card'), host: !!document.querySelector('.gateway-host'), phase: window.__train.gate.phase, stops: window.__train.stopCount, start: window.__train.startTunnel, upgrade: window.__train.engineUpgrade, wagons: window.__train.wagons }));
  ok(again.world === 'W2' && !again.card && !again.host && again.phase === '' && again.stops === 7 && again.start && again.upgrade === 1 && again.wagons === 0, `${tag} crossing: a reload does not replay it; world 2 is simply there (${JSON.stringify(again)})`);
  ok(errors.length === 0, `${tag} crossing: errors ${errors.join(' | ')}`);
  await ctx.close();

  // leaving in the middle of the crossing never replays it either
  {
    const m = await openHome(browser, url, vp, crossingDue());
    await until(m.page, () => window.__train && window.__train.gate.phase === 'out', null, 20000);
    await m.page.evaluate(() => { location.hash = '#/lesson/7'; });
    await m.page.waitForSelector('.lesson-overview');
    await m.page.evaluate(() => { location.hash = '#/home'; });
    await until(m.page, () => window.__train && !window.__train.disposed && window.__train.frames > 0, null, 20000);
    await m.page.waitForTimeout(1500);
    ok(await m.page.evaluate(() => window.__train.world === 'W2' && window.__train.gate.phase === '' && !document.querySelector('.world-card')), `${tag} crossing: leaving in the middle never replays it (world 2 shows at once)`);
    ok(m.errors.length === 0, `${tag} crossing (left midway): errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }
}

// Reduced motion and the other ways in: no ride, the card shows still, then the new world.
export async function liveOtherChecks({ browser, url, ok }) {
  const vp = LIVE_VIEWPORTS[0];
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, crossingDue(), { init: [RAF_COUNT], extra: { reducedMotion: 'reduce' } });
    ok(await until(page, () => !!document.querySelector('.world-card.in') && document.querySelector('.gateway-host').dataset.phase === 'card', null, 15000), 'reduced crossing: the card shows without any ride');
    const c = await page.evaluate(() => { const e = document.querySelector('.world-card'); const cs = getComputedStyle(e); return { op: cs.opacity, tr: cs.transitionDuration, name: e.querySelector('.wg-name').textContent }; });
    ok(c.name === 'Green Valley' && c.op === '1' && parseFloat(c.tr) < 0.001, `reduced crossing: the card is simply there (${JSON.stringify(c)})`);
    ok(await until(page, () => document.querySelector('.world-card') && document.querySelector('.world-card').dataset.ready === '1', null, 10000), 'reduced crossing: world 2 is built behind it');
    await page.locator('.world-card').click();
    ok(await until(page, () => window.__train && window.__train.world === 'W2' && window.__train.gate.phase === 'done' && !window.__train.running, null, 15000), 'reduced crossing: world 2 is simply there');
    ok(await page.evaluate(() => Math.abs(window.__train.trainS - (window.__train.stopS[0] + window.__train.engineAt)) < 0.05), 'reduced crossing: the train rests at the first stop, no roll');
    await page.waitForTimeout(800);
    const r0 = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(3000);
    ok((await page.evaluate(() => window.__raf)) - r0 <= 2, 'reduced crossing: no idle frames afterwards');
    ok(errors.length === 0, `reduced crossing: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // the engine's upgrades build cumulatively from a few primitives each (no errors, a small mesh count) up to eight finished worlds
    const { ctx, page, errors } = await openHome(browser, url, vp, state(0), { route: '#/grownups' });
    await page.waitForTimeout(400);
    const counts = await page.evaluate(async () => {
      const { makeBag, makeLine } = await import('/js/train/world.js');
      const { buildTrain } = await import('/js/train/train.js');
      const out = [];
      for (let u = 0; u <= 8; u++) {
        const bag = makeBag();
        const t = buildTrain(bag, makeLine(3), [], [], { upgrades: u, letters: ['m', 'a', 's', 'i', 't', 'p'] });
        let n = 0; t.engine.group.traverse((o) => { if (o.isMesh) n++; });
        out.push(n); bag.dispose();
      }
      return out;
    });
    ok(counts.length === 9 && counts.every((n, i) => i === 0 || n > counts[i - 1] || i === 8 || n >= counts[i - 1]) && counts[8] - counts[0] <= 60 && counts[1] > counts[0], `engine upgrades: nine levels build, a small mesh count each (${counts.join(',')})`);
    ok(errors.length === 0, `engine upgrades: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // a finished world shown again (the gateway preview of world 1 once it is done): its six wagons stand on the siding and the
    // train pulls none; the engine carries world 1's upgrade
    const done6 = state(6, { trainDone: 6, trainAt: 0 }, { lessons: doneL(6), levels: { seen: 1, earned: L1 }, worlds: { seen: 'W2' }, character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, vp, done6, { init: [RAF_COUNT], route: '#/preview/gateway' });
    ok(await until(page, () => window.__train && window.__train.world === 'W1' && window.__train.frames > 1, null, 20000), 'siding: world 1 is shown again');
    const t = await page.evaluate(() => ({ wagons: window.__train.wagons, parked: window.__train.parked, up: window.__train.engineUpgrade, world: window.__train.world }));
    ok(t.wagons === 0 && t.parked === 6 && t.up === 1, `siding: the six letter wagons stand on the siding, none on the train, engine upgrade 1 (${JSON.stringify(t)})`);
    await page.evaluate(() => window.__train.show(100));
    await page.waitForTimeout(500);
    await liveShot(page, 'w1-siding', vp.name);
    ok(errors.length === 0, `siding: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // a grown-up unlock that jumps ahead, or a world seen later than the one to show: no crossing, just the right world
    const jump = state(3, { trainDone: 3, trainAt: 3 }, { lessons: doneL(3), levels: { seen: 0, earned: {} }, worlds: { seen: 'W2' }, character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, vp, jump);
    ok(await settled(page), 'no crossing backwards: Home settles');
    ok(await page.evaluate(() => window.__train.world === 'W1' && !document.querySelector('.gateway-host') && !document.querySelector('.world-card')), 'no crossing backwards: world 1 shows, no card');
    ok((await stored(page)).worlds.seen === 'W1', 'no crossing backwards: the world shown is recorded');
    ok(errors.length === 0, `no crossing backwards: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // the first visit with saved lessons and no record only records: no crossing
    const old = state(6, { trainDone: 6, trainAt: 0 }, { lessons: doneL(6), levels: { seen: 1, earned: L1 }, character: CHARACTER, meetDue: false });
    const { ctx, page, errors } = await openHome(browser, url, vp, old);
    ok(await settled(page), 'first look: Home settles');
    ok(await page.evaluate(() => window.__train.world === 'W2' && !document.querySelector('.gateway-host') && !document.querySelector('.world-card')), 'first look: six lessons done and no record shows world 2 at once, no crossing');
    ok((await stored(page)).worlds.seen === 'W2', 'first look: it only records the world');
    ok(errors.length === 0, `first look: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // a reset clears the record
    const { ctx, page } = await openHome(browser, url, vp, crossingDue());
    await page.evaluate(async () => { const { createStore } = await import('/js/store.js'); const s = createStore(); s.resetAll(); });
    ok((await stored(page)).worlds.seen === null, 'reset: progress reset clears the world record');
    await ctx.close();
  }
}

// The flat map: only the current world's stones, the tunnel icon at the end, and the card between worlds.
export async function liveFlatChecks({ browser, url, ok, vp }) {
  const tag = `${vp.name} 2D`;
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, resting(5, { trainWorld: false, migrated1912: true }));
    await page.waitForSelector('.stone');
    await page.waitForTimeout(2500);
    const m = await page.evaluate(() => ({ stones: document.querySelectorAll('.stone').length, labels: [...document.querySelectorAll('.stone')].map((s) => s.getAttribute('aria-label')), tunnel: document.querySelector('.scene-tunnel') && { world: document.querySelector('.scene-tunnel').dataset.world, text: document.querySelector('.tunnel-name').textContent, label: document.querySelector('.scene-tunnel').getAttribute('aria-label') }, three: !!document.querySelector('.home3d') }));
    ok(m.stones === 9 && !m.three && !m.labels.some((l) => /Lesson (7|8|9|1[0-3])\b/.test(l)), `${tag} world 1: only its nine stones, no Green Valley lesson (${m.stones})`);
    ok(m.tunnel && m.tunnel.world === 'W2' && /^Green Valley/.test(m.tunnel.text) && /Green Valley/.test(m.tunnel.label), `${tag} world 1: a tunnel icon at the end names Green Valley (${JSON.stringify(m.tunnel)})`);
    await liveShot(page, 'map-world1', vp.name);
    await page.evaluate(() => { const s = document.querySelector('.map-scroll'); s.scrollTop = 0; s.scrollLeft = s.scrollWidth; });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => { const e = document.querySelector('.scene-tunnel').getBoundingClientRect(); const pill = document.querySelector('.pill-hold').getBoundingClientRect(); return { x: e.x, y: e.y, w: e.width, h: e.height, pill: { x: pill.x, y: pill.y, w: pill.width, h: pill.height } }; });
    ok(r.w > 40 && r.h > 40 && inView(r, vp) && !hitsRect(r, r.pill), `${tag} world 1: the tunnel icon is whole on the screen at the end of the map, clear of the Grownups pill (${JSON.stringify(r)})`);
    await liveShot(page, 'map-world1-end', vp.name);
    ok(errors.length === 0, `${tag} world 1: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, crossingDue({ trainWorld: false, migrated1912: true }));
    ok(await until(page, () => document.querySelectorAll('.stone').length === 9, null, 10000), `${tag} crossing: world 1's nine stones show first`);
    ok(await until(page, () => !!document.querySelector('.world-card.in'), null, 15000), `${tag} crossing: the loading card shows between the two maps`);
    ok((await page.locator('.wg-name').textContent()) === 'Green Valley', `${tag} crossing: it names Green Valley`);
    await page.waitForTimeout(500);
    await liveShot(page, 'map-loading-card', vp.name);
    ok(await until(page, () => document.querySelector('.world-card') && document.querySelector('.world-card').dataset.ready === '1', null, 10000), `${tag} crossing: world 2's map is built behind it`);
    await page.locator('.world-card').click();
    ok(await until(page, () => !document.querySelector('.world-card') && document.querySelectorAll('.stone').length === 7, null, 8000), `${tag} crossing: then world 2 shows only its seven stones`);
    const t = await page.evaluate(() => ({ world: document.querySelector('.scene-tunnel').dataset.world, labels: [...document.querySelectorAll('.stone')].map((s) => s.getAttribute('aria-label')) }));
    ok(t.world === 'W3' && t.labels[0].startsWith('Lesson 7') && !t.labels.some((l) => /Lesson [1-6]\b/.test(l)), `${tag} crossing: world 2's map ends in a tunnel icon to Sunny Hills`);
    await page.waitForTimeout(1500);
    await liveShot(page, 'map-world2', vp.name);
    ok((await stored(page)).worlds.seen === 'W2', `${tag} crossing: recorded`);
    await page.reload();
    await page.waitForSelector('.stone');
    await page.waitForTimeout(2500);
    ok((await page.locator('.world-card').count()) === 0 && (await page.locator('.stone').count()) === 7, `${tag} crossing: a reload does not replay it`);
    ok(errors.length === 0, `${tag} crossing: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  dataChecks(ok);
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  for (const vp of SHOT_VIEWPORTS) await previewChecks({ browser, url, ok, vp });
  await flatChecks({ browser, url, ok });
  await reducedChecks({ browser, url, ok });
  for (const vp of LIVE_VIEWPORTS) { await liveWorldChecks({ browser, url, ok, vp }); await liveCrossingChecks({ browser, url, ok, vp }); await liveFlatChecks({ browser, url, ok, vp }); }
  await liveOtherChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`worlds: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
