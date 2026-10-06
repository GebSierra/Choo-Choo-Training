// Prototype 2 (v1.9.8): worlds, the world gateway, the "Did you know?" card, the journey board and the lessons grouped by
// world, all behind Grownups > Previews. Data checks, the helpers, each preview opening from Grownups, the gateway reaching
// the second world's Home with only its stations and then sitting still (heat), tip rotation, the 2D fallback and reduced
// motion. Screenshots for the owner are written to docs/screenshots/v198/ only with `--shots`.
// Run alone with `node test/worlds.mjs [--shots]`.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch } from './lib.mjs';
import { openHome, state, until } from './train.mjs';
import { checkTips } from './check-content.mjs';
import { worldOf, lessonsIn, unitsIn, unitDone, currentWorld, currentUnit, nextWorld, worldDone } from '../js/worlds.js';
import { nextTip } from '../js/components/tip-card.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const TIPS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tips.json'), 'utf8'));
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/v198');
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
  ok(await page.evaluate(() => window.__train.world === null && window.__train.stopCount === 16 && window.__train.lessonCount === 13 && window.__train.checkpointCount === 3), `${tag}: the real Home still builds every station (16 stops)`);
  await gate(page);

  // ---- the Previews fold ----
  const fold = page.locator('.gu-fold', { hasText: 'Previews' });
  ok((await fold.count()) === 1 && (await fold.getAttribute('aria-expanded')) === 'false', `${tag}: Grownups has a closed Previews fold`);
  ok(await page.evaluate(() => { const b = document.querySelector('.gu-body'), k = b.children; return k[k.length - 1].classList.contains('gu-version') && k[k.length - 2].textContent.startsWith('Previews'); }), `${tag}: the Previews fold is the last card, just above the version line`);
  await fold.click();
  ok((await page.locator('.grownups .gu-fold-body:not([hidden]) .gu-note', { hasText: 'Try new screens before they go live.' }).count()) === 1, `${tag}: the Previews note is shown`);
  const btns = await page.locator('.preview-btn').evaluateAll((l) => l.map((b) => { const r = b.getBoundingClientRect(); return { key: b.dataset.preview, h: r.height, w: r.width }; }));
  ok(btns.length === 5 && btns.every((b) => b.h >= 48 && b.w >= 120), `${tag}: five preview buttons, each at least 48 px tall (${JSON.stringify(btns.map((b) => b.key + ':' + Math.round(b.h)))})`);
  await page.locator('.gu-version').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, 'previews-fold', tag);

  // ---- the Did you know? card over Home ----
  await openPreview(page, 'tip');
  ok(await until(page, () => !!document.querySelector('.tip-card.in') && document.querySelector('.home'), null, 15000), `${tag} tip: the card shows over Home`);
  await page.waitForTimeout(500);
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
  await shot(page, 'journey-board', tag);
  await page.locator('.jb-go').click();
  ok(await until(page, () => !document.querySelector('.jb'), null, 3000) && (await page.locator('.home').count()) === 1, `${tag} board: "All aboard!" closes it and Home is there`);
  await backToGrownups(page);

  // ---- the lessons grouped by world and unit ----
  await openPreview(page, 'list');
  await page.waitForSelector('.gu-world');
  await page.waitForTimeout(800); // the screen change has finished
  const g = await page.evaluate(() => ({
    worlds: [...document.querySelectorAll('.gu-world')].map((w) => ({ id: w.dataset.world, open: w.querySelector('.gu-fold').getAttribute('aria-expanded'), hidden: w.querySelector('.gu-fold-body').hidden, units: [...w.querySelectorAll('.gu-unit strong')].map((u) => u.textContent) })),
    rows: document.querySelectorAll('.gu-row').length, note: document.querySelector('.preview-list .gu-note:last-child').textContent,
  }));
  ok(g.worlds.length === 2 && g.worlds[0].open === 'true' && g.worlds[1].open === 'false' && g.worlds[1].hidden, `${tag} list: two worlds with lessons, only the current one open (${JSON.stringify(g.worlds.map((w) => w.id + w.open))})`);
  ok(g.worlds[0].units.join() === 'Unit 2.1,Unit 2.2,Unit 2.3' && g.worlds[1].units.join() === 'Unit 2.4,Unit 2.5,Unit 2.6,Unit 2.7,Unit 2.8', `${tag} list: units group the rows (${g.worlds.map((w) => w.units.join(' ')).join(' / ')})`);
  ok(/9 more worlds/.test(g.note), `${tag} list: the later worlds are noted`);
  await shot(page, 'grouped-list', tag);
  await page.locator('.gu-world[data-world="W2"] .gu-fold').click();
  ok(await page.evaluate(() => document.querySelectorAll('.gu-world[data-world="W2"] .gu-row').length === 7 && document.querySelectorAll('.gu-world[data-world="W1"] .gu-row').length === 9), `${tag} list: opening world 2 shows its seven lessons; world 1 has six lessons and three checkpoints`);
  await page.locator('.gu-world[data-world="W2"] button[aria-label="Unlock lesson 9"]').click();
  ok((await page.locator('.gu-confirm').count()) === 1 && (await page.locator('.gu-world[data-world="W2"] .gu-fold').getAttribute('aria-expanded')) === 'true', `${tag} list: the unlock confirm works inside a fold and the fold stays open`);
  await page.locator('.gu-confirm button', { hasText: 'Cancel' }).click();
  ok((await page.locator('.gu-confirm').count()) === 0, `${tag} list: Cancel closes the confirm`);
  const l3 = await layout(page, '.gu-world-head', { vertical: false });
  ok(l3.length === 0, `${tag} list: fold heads fit and are big enough (${l3.join(' | ')})`);
  await backToGrownups(page);

  // ---- the world gateway ----
  const before = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('reading.v1')); return JSON.stringify({ l: s.lessons, t: s.settings.trainAt, v: s.levels }); });
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
  const w2 = await page.evaluate(() => ({ stops: window.__train.stopCount, l: window.__train.lessonCount, c: window.__train.checkpointCount, tunnel: window.__train.tunnel, btns: document.querySelectorAll('.station-btn').length, mode: window.__train.gate.mode, kinds: [...document.querySelectorAll('.station-btn')].map((b) => b.getAttribute('aria-label')).join() }));
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
  ok(JSON.stringify({ l: st.lessons, t: st.settings.trainAt, v: st.levels }) === before, `${tag} gateway: the preview wrote no progress (trainAt, lessons and levels are as before)`);
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
  const { ctx, page, errors } = await openHome(browser, url, vp, seed(4, { trainWorld: false }));
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

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  dataChecks(ok);
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  for (const vp of SHOT_VIEWPORTS) await previewChecks({ browser, url, ok, vp });
  await flatChecks({ browser, url, ok });
  await reducedChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`worlds: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
