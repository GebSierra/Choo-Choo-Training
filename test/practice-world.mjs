// The world-themed practice look (developer-mode preview, settings.newPractice). Off: every task screen is exactly as before (the navy
// frame, the dots). On: .practice-world + data-world, a train for the progress, a paper ticket card, the conductor's note, chunky buttons,
// fit at four sizes, no looping animation, no transitions under reduced motion. The Developer switch exists only in developer mode.
// Run alone with `node test/practice-world.mjs`; SHOTS=dir saves a few screenshots.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, doneThrough } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const VPS = [{ name: '360x640', width: 360, height: 640 }, { name: '390x844', width: 390, height: 844 }, { name: '412x730', width: 412, height: 730 }, { name: '915x412', width: 915, height: 412 }];
const seed = (done, settings) => `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:${JSON.stringify(doneThrough(done))},settings:${JSON.stringify({ seenScripts: SEEN, ...settings })},firstRunDone:true}))`;
const luma = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [luma(a), luma(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export async function practiceWorldChecks({ browser, url, ok }) {
  const open = async (vp, route, settings, extra, done = 3) => {
    const made = await newPage(browser, { ...vp, deviceScaleFactor: 1 }, extra);
    await made.page.addInitScript(SPEECH_STUB);
    await made.page.addInitScript(seed(done, settings));
    await made.page.goto(url + route);
    return made;
  };
  const lesson4 = CUR.lessons.find((l) => l.number === 4), lesson8 = CUR.lessons.find((l) => l.number === 8);
  const tasks4 = tasksFor(lesson4), tasks8 = tasksFor(lesson8);
  const idxOf = (tasks, type) => tasks.find((t) => t.type === type).index;

  // ---- switch off: the old look, byte for byte in what a test can see ----
  for (const type of ['review', 'words', 'check']) {
    const { ctx, page, errors } = await open(VPS[1], `#/lesson/4/task/${idxOf(tasks4, type)}`, {});
    await page.waitForSelector('.task-stage'); await page.waitForTimeout(500);
    const o = await page.evaluate(() => { const r = document.querySelector('.task-screen'); return { cls: r.className, world: r.dataset.world || null, bg: getComputedStyle(r).backgroundColor, dots: document.querySelectorAll('.dots .dot').length, pill: document.querySelectorAll('.dot-pill').length, tk: document.querySelectorAll('.tk, .tk-engine, .pw-land, .pw-sky').length, radius: getComputedStyle(document.querySelector('.task-stage')).borderBottomLeftRadius, next: getComputedStyle(document.querySelector('.btn.next')).backgroundColor }; });
    ok(o.cls === 'task-screen' && o.world === null && o.bg === 'rgb(34, 26, 85)' && o.tk === 0, `off ${type}: the frame is the old navy (${o.cls}, ${o.bg}, world ${o.world})`);
    ok(o.dots === tasks4.length && o.pill === 1 && o.radius === '0px' && o.next === 'rgb(255, 209, 102)', `off ${type}: dots, the pill, the flat card bottom and the gold Next are unchanged (${o.dots}/${tasks4.length})`);
    ok(errors.length === 0, `off ${type}: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // a wrong-typed saved value is cleaned to false
  { const { cleanSettings, newStore } = await import('../js/store.js').then((m) => ({ cleanSettings: m.cleanSettings, newStore: m })).catch(() => ({})); void newStore;
    if (cleanSettings) ok(cleanSettings({ newPractice: 'yes' }, { newPractice: false }).newPractice === false && cleanSettings({ newPractice: true }, { newPractice: false }).newPractice === true, 'settings: newPractice is cleaned to a boolean, default false'); }

  // ---- the Developer switch exists only in developer mode ----
  for (const dev of [false, true]) {
    const { ctx, page } = await open(VPS[1], '#/home', { dev });
    await page.waitForSelector('.pill-hold'); await page.waitForTimeout(900);
    const gb = await page.locator('.pill-hold').boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up();
    await page.waitForSelector('.grownups'); await page.waitForTimeout(400);
    const n = await page.locator('[data-dev="newPractice"]').count();
    if (!dev) ok(n === 0 && (await page.locator('.grownups', { hasText: 'New practice look' }).count()) === 0, 'Grownups: no "New practice look" switch outside developer mode');
    else {
      ok(n === 1 && (await page.evaluate(() => { const f = [...document.querySelectorAll('.gu-field')].map((e) => e.textContent.trim()); return f.indexOf('Open every lesson') >= 0 && f.indexOf('New practice look') > f.indexOf('Open every lesson'); })), 'Grownups, developer mode: the "New practice look" switch is there, after "Open every lesson"');
      const sw = page.locator('[data-dev="newPractice"]');
      ok((await sw.getAttribute('aria-checked')) === 'false', 'the switch starts off');
      await sw.scrollIntoViewIfNeeded(); await sw.click();
      ok((await sw.getAttribute('aria-checked')) === 'true' && (await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.newPractice)) === true, 'turning it on saves settings.newPractice');
    }
    await ctx.close();
  }

  // ---- switch on: the new look, per world and size ----
  const worlds = [['W1', 4, 3, tasks4], ['W2', 8, 7, tasks8]];
  for (const [w, n, done, tasks] of worlds) for (const vp of VPS) {
    const tag = `${w} ${vp.name}`, land = vp.width > vp.height;
    for (const type of ['newLetter', 'words', 'check']) {
      const t = tasks.find((x) => x.type === type), pos = tasks.indexOf(t);
      const { ctx, page, errors } = await open(vp, `#/lesson/${n}/task/${t.index}`, { newPractice: true }, undefined, done);
      await page.waitForSelector('.task-stage'); await page.waitForTimeout(900);
      const o = await page.evaluate(() => {
        const r = document.querySelector('.task-screen'), q = (s) => document.querySelector(s), rect = (s) => { const b = q(s).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
        const eng = q('.tk-engine').getBoundingClientRect(), cells = [...document.querySelectorAll('.tk')].map((c) => c.getBoundingClientRect());
        const small = [...document.querySelectorAll('.task-foot button, .task-stage > .speak-btn, .task-head button')].filter((b) => b.offsetParent && !b.closest('[hidden]')).map((b) => { const x = b.getBoundingClientRect(); return Math.min(x.width, x.height); }).filter((v) => v < 47.5);
        const h1 = getComputedStyle(q('.task-head h1')), toggle = q('.script-toggle');
        return { cls: r.className, world: r.dataset.world, wagons: document.querySelectorAll('.tk.past').length, cells: cells.length, engineAt: q('.tk-engine').style.getPropertyValue('--at'), engineCell: cells.findIndex((c) => eng.x + eng.width / 2 >= c.x && eng.x + eng.width / 2 < c.right), now: q('.dots').getAttribute('aria-valuenow'), dots: document.querySelectorAll('.dot, .dot-pill').length,
          land: !!q('.pw-land'), sky: !!q('.pw-sky'), bg: getComputedStyle(r).backgroundImage.includes('linear-gradient'), plaque: { bg: h1.backgroundColor, color: h1.color, border: h1.borderTopWidth },
          again: rect('.btn.again'), next: rect('.btn.next'), nextBg: getComputedStyle(q('.btn.next')).backgroundImage, script: { bg: getComputedStyle(toggle).backgroundColor, color: getComputedStyle(toggle).color, tag: getComputedStyle(q('.script-tag')).color }, stage: rect('.task-stage'), foot: rect('.task-foot'), card: getComputedStyle(q('.task-stage')).borderTopLeftRadius,
          sw: document.documentElement.scrollWidth - innerWidth, small, vh: innerHeight, vw: innerWidth };
      });
      ok(o.cls.includes('practice-world') && o.world === w, `${tag} ${type}: the root has .practice-world and data-world="${w}" (${o.cls}, ${o.world})`);
      ok(o.wagons === pos && o.cells === tasks.length && o.engineAt === String(pos) && o.engineCell === pos && o.now === String(pos + 1) && o.dots === 0, `${tag} ${type}: the train shows ${pos} wagons and the engine at step ${pos + 1} of ${tasks.length} (wagons ${o.wagons}, engine ${o.engineAt}/${o.engineCell})`);
      ok(o.land && o.sky && o.bg, `${tag} ${type}: sky gradient and the landscape band are there`);
      ok(contrast(o.plaque.color, o.plaque.bg) >= 4.5 && parseFloat(o.plaque.border) >= 2, `${tag} ${type}: the title plaque keeps its contrast (${contrast(o.plaque.color, o.plaque.bg).toFixed(1)}:1)`);
      ok(contrast(o.script.color, o.script.bg) >= 4.5 && contrast(o.script.tag, o.script.bg) >= 4.5, `${tag} ${type}: the conductor's note keeps its contrast (${contrast(o.script.color, o.script.bg).toFixed(1)}:1, tag ${contrast(o.script.tag, o.script.bg).toFixed(1)}:1)`);
      ok(o.again.h >= 56 && o.next.h >= 56 && o.again.w >= 48 && o.next.w >= 48, `${tag} ${type}: Again and Next are at least 56 px tall (${Math.round(o.again.h)}, ${Math.round(o.next.h)})`);
      ok(o.next.w >= o.again.w && /linear-gradient/.test(o.nextBg), `${tag} ${type}: Next is still the wider, golden one`);
      ok(o.small.length === 0 && o.sw <= 0, `${tag} ${type}: 48 px targets and no sideways scroll (${o.small.join(',')}, ${o.sw})`);
      ok(o.next.b <= o.vh + 1 && o.again.b <= o.vh + 1 && o.stage.y >= 0 && o.stage.b <= o.vh + 1 && o.stage.r <= o.vw + 1, `${tag} ${type}: the card and both buttons are on screen`);
      ok(o.card === '26px', `${tag} ${type}: the card is a rounded ticket (${o.card})`);
      ok(errors.length === 0, `${tag} ${type}: no errors ${errors.join(' | ')}`);
      if (process.env.SHOTS) { fs.mkdirSync(process.env.SHOTS, { recursive: true }); await page.screenshot({ path: path.join(process.env.SHOTS, `${w}-${type}-${vp.name}.png`) }); }
      await ctx.close();
    }
  }

  // ---- behaviour: Say this expands, Again and Next work, the engine moves, no looping animation ----
  for (const vp of [VPS[1], VPS[3]]) {
    const tag = vp.name, t = tasks4.find((x) => x.type === 'words'), pos = tasks4.indexOf(t);
    const { ctx, page, errors } = await open(vp, `#/lesson/4/task/${t.index}`, { newPractice: true }, undefined, 3);
    await page.waitForSelector('.task-stage'); await page.waitForTimeout(900);
    await page.locator('.script-toggle').click(); await page.waitForTimeout(400);
    ok((await page.locator('.script-toggle').getAttribute('aria-expanded')) === 'true' && (await page.locator('.script-sheet').isVisible()), `${tag}: tapping the conductor's note opens it`);
    const sheet = await page.evaluate(() => { const s = document.querySelector('.script-sheet'); return { bg: getComputedStyle(s).backgroundColor, color: getComputedStyle(s.querySelector('.script-text')).color, speak: !!s.querySelector('.speak-btn') }; });
    ok(contrast(sheet.color, sheet.bg) >= 7 && sheet.speak, `${tag}: the open note is readable (${contrast(sheet.color, sheet.bg).toFixed(1)}:1) and keeps its speaker`);
    await page.locator('.sheet-close').click(); await page.waitForTimeout(450);
    ok(await page.locator('.script-sheet').isHidden(), `${tag}: the note closes again`);
    const inf = await page.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity && a.playState === 'running').length);
    ok(inf === 0, `${tag}: no looping animation on the practice screen (${inf})`);
    const again = await page.evaluate(() => { const b = document.querySelector('.btn.again'); b.click(); return true; });
    ok(again && errors.length === 0, `${tag}: Again works`);
    await page.waitForTimeout(1200);
    await page.locator('.btn.next').click();
    await page.waitForFunction((i) => location.hash.includes('/task/' + i), t.index + 1);
    await page.waitForSelector('.tk-engine'); await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({ at: document.querySelector('.tk-engine').style.getPropertyValue('--at'), wagons: document.querySelectorAll('.tk.past').length, cls: document.querySelector('.task-screen').className }));
    ok(after.at === String(pos + 1) && after.wagons === pos + 1 && after.cls.includes('practice-world'), `${tag}: Next goes on and the engine is at the next step with one more wagon (${after.at}, ${after.wagons})`);
    ok(errors.length === 0, `${tag}: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }

  // ---- reduced motion: no transitions on the train ----
  { const t = tasks4.find((x) => x.type === 'words');
    const { ctx, page } = await open(VPS[1], `#/lesson/4/task/${t.index}`, { newPractice: true }, { reducedMotion: 'reduce' }, 3);
    await page.waitForSelector('.tk-engine'); await page.waitForTimeout(700);
    const o = await page.evaluate(() => [...document.querySelectorAll('.tk-engine, .tk-car, .tk-tie')].map((e) => parseFloat(getComputedStyle(e).transitionDuration)).every((d) => d < 0.01));
    ok(o, 'reduced motion: the engine, wagons and sleepers have no transitions');
    await ctx.close(); }

  // ---- the old frame is still what a non-lesson screen (checkpoint, prototype) gets while the switch is on ----
  { const { ctx, page } = await open(VPS[1], '#/proto/f/task/1', { newPractice: true, dev: true }, undefined, 13);
    await page.waitForTimeout(800);
    const cls = await page.evaluate(() => (document.querySelector('.task-screen') || {}).className || 'none');
    ok(!cls.includes('practice-world'), `prototypes keep their own frame while the switch is on (${cls})`);
    await ctx.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await practiceWorldChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`practice-world: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
