// Screenshots of the train world (round 4) at phone sizes, into docs/screenshots/train/.
// Run: node tools/train-screenshots.mjs   (the 3D Home is drawn at full quality with ?hq=1, even on a software renderer)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, SEEN, doneThrough } from '../test/lib.mjs';
import { SPEECH_STUB, AUDIO_STUB } from '../test/stubs.mjs';
import { tasksFor } from '../js/lessons.js';

const OUT = path.join(ROOT, 'docs/screenshots/train');
fs.mkdirSync(OUT, { recursive: true });
const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const huntIdx = (n) => tasksFor(CUR.lessons[n - 1]).find((t) => t.type === 'hunt').index;
const SIZES = [['360x640', 360, 640], ['390x844', 390, 844], ['412x915', 412, 915], ['915x412', 915, 412]];
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;

const { server, url } = await startServer();
const pw = await loadPlaywright();
const browser = await pw.chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });

async function page(w, h, state) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  await p.addInitScript(SPEECH_STUB); await p.addInitScript(AUDIO_STUB);
  await p.addInitScript(`if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s','1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(state))}); }`);
  return { ctx, p };
}
const st = (done, settings = {}, first = true) => ({ schema: 1, lessons: doneThrough(done), settings: { seenScripts: SEEN, trainIntroDone: true, ...settings }, firstRunDone: first });
const save = async (p, name) => { await p.screenshot({ path: path.join(OUT, name + '.png') }); console.log('saved', name); };
const settle = (p) => p.waitForFunction(() => window.__train && window.__train.frames > 2 && !window.__train.running, null, { timeout: 30000 }).catch(() => {});

for (const [tag, w, h] of SIZES) {
  if (only && !only.has(tag)) continue;
  // Home: a new child, and three lessons done (three wagons), at full quality
  for (const done of [0, 3, 9]) {
    const { ctx, p } = await page(w, h, st(done));
    await p.goto(url + 'index.html?hq=1#/home'); await settle(p); await p.waitForTimeout(600);
    await save(p, `home-${done}-done-${tag}`);
    await ctx.close();
  }
  // The arrival: lesson 4 just finished, the train chugs to lesson 5's stop
  if (tag === '412x915' || tag === '915x412') {
    const { ctx, p } = await page(w, h, st(4, { trainAt: 4 }));
    await p.goto(url + 'index.html?hq=1#/home'); await p.waitForFunction(() => window.__train && window.__train.trainS > window.__train.stopS[4] + 3, null, { timeout: 30000 }).catch(() => {});
    await save(p, `home-arrival-${tag}`);
    await ctx.close();
  }
  // Pip: on the welcome card and on the finish screen
  {
    const { ctx, p } = await page(w, h, st(0, {}, false));
    await p.goto(url + 'index.html?hq=1#/home'); await p.waitForSelector('.welcome'); await p.waitForTimeout(1500);
    await save(p, `pip-welcome-${tag}`);
    await p.goto(url + '#/lesson/1/finish'); await p.waitForTimeout(1600);
    await save(p, `pip-finish-${tag}`);
    await ctx.close();
  }
  // Letter Hunt: the balloons, two steps along, and the arrival at the station
  {
    const { ctx, p } = await page(w, h, st(1));
    await p.goto(url + `#/lesson/2/task/${huntIdx(2)}`); await p.waitForTimeout(1300);
    await save(p, `hunt-start-${tag}`);
    for (let i = 1; i <= 5; i++) {
      const b = await p.locator('.sky-letter[data-target="1"]:not(.popped)').first().boundingBox();
      await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      await p.waitForTimeout(i < 5 ? 1000 : 1150);
      if (i === 2) await save(p, `hunt-steps-${tag}`);
    }
    await save(p, `hunt-arrival-${tag}`);
    await ctx.close();
  }
  // Sound Station (the Loading Dock): the crates, a crate on its way, and the train taking the wagon
  {
    const { ctx, p } = await page(w, h, st(3));
    await p.goto(url + '#/checkpoint/c1'); await p.waitForTimeout(1300);
    await save(p, `dock-start-${tag}`);
    for (let r = 1; r <= 6; r++) {
      await p.waitForFunction((k) => document.querySelector('.sack-game').dataset.round === String(k), r);
      await p.waitForTimeout(400);
      const b = await p.locator('.sack-card[data-correct="1"]:not([disabled])').first().boundingBox();
      await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      if (r === 1) { await p.waitForTimeout(640); await save(p, `dock-lid-${tag}`); }
    }
    await p.waitForTimeout(1900);
    await save(p, `dock-coupled-${tag}`);
    await ctx.close();
  }
}
await browser.close(); server.close();
