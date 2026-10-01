// Captures portrait screenshots of the main screens, plus two landscape ones, into _test/ and docs/screenshots/.
// Run: node tools/screenshots.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch } from '../test/lib.mjs';
import { SPEECH_STUB } from '../test/stubs.mjs';
import { touchSession, SEEN } from '../test/lib.mjs';

const OUTS = [path.join(ROOT, '_test'), path.join(ROOT, 'docs/screenshots')];
OUTS.forEach((d) => fs.mkdirSync(d, { recursive: true }));
const save = async (page, name) => { const buf = await page.screenshot(); OUTS.forEach((d) => fs.writeFileSync(path.join(d, name), buf)); console.log('saved', name); };

const { server, url } = await startServer();
const pw = await loadPlaywright();
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
await page.addInitScript(SPEECH_STUB);
await page.addInitScript(`if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[0,1,2,3,4,5],result:'got-it',completedAt:'2026-09-30T12:00:00Z'},2:{tasksDone:[0,1],result:null}},settings:{seenScripts:${JSON.stringify(SEEN)}},firstRunDone:true})); }`);

await page.goto(url + '#/home'); await page.waitForTimeout(2000); await save(page, '01-home.png');
await page.goto(url + '#/lesson/2'); await page.waitForTimeout(1200); await save(page, '02-lesson-overview.png');
await page.goto(url + '#/lesson/2/task/1'); await page.waitForTimeout(2200); await save(page, '03-new-letter.png');
await page.goto(url + '#/lesson/1/task/0'); await page.waitForTimeout(2200); await save(page, '17-new-letter-lesson1.png');

// Slide track mid-drag.
const hb = await page.locator('.st-handle').boundingBox();
const tb = await page.locator('.slide-track').boundingBox();
await page.locator('.slide-track').scrollIntoViewIfNeeded();
const hb2 = await page.locator('.st-handle').boundingBox();
await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2);
await page.mouse.down();
for (let i = 1; i <= 8; i++) await page.mouse.move(hb2.x + hb2.width / 2 + (tb.width * 0.6 * i) / 8, hb2.y + hb2.height / 2 + (i % 2 ? 2 : -2));
await page.waitForTimeout(60);
await save(page, '04-slide-track.png');
await page.mouse.up();

// Trace pad with a stroke.
await page.goto(url + '#/lesson/2/task/5'); await page.waitForTimeout(1200);
const pb = await page.locator('.tp-ink').boundingBox();
const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2, r = Math.min(pb.width, pb.height) * 0.2;
await page.mouse.move(cx + r * 0.85, cy - r * 0.4);
await page.mouse.down();
for (let t = 0; t <= 26; t++) { const a = -0.45 - (t / 26) * Math.PI * 1.75; await page.mouse.move(cx + r * 0.95 * Math.cos(a) * -1 * -1, cy + r * 0.95 * Math.sin(a)); }
await page.mouse.up();
await page.waitForTimeout(300);
await save(page, '05-trace-pad.png');

// Quick check with a card lifted.
await page.goto(url + '#/lesson/2/task/8'); await page.waitForTimeout(1200);
await page.locator('.opt-card').nth(1).click(); await page.waitForTimeout(400);
await save(page, '06-quick-check.png');

// Saying Sounds with a finger sliding under "am": the first letter lit, the second lighting up.
await page.goto(url + '#/lesson/2/task/4'); await page.waitForSelector('.glyph-letter'); await page.waitForTimeout(1200);
{
  const r = await page.evaluate(() => { const e = [...document.querySelectorAll('.glyph-letter .glyph-pop')].map((g) => g.getBoundingClientRect()); return { l0: e[0].left, r0: e[0].right, l1: e[1].left, r1: e[1].right, y: e[0].top + e[0].height / 2, row: document.querySelector('.glyph-row').getBoundingClientRect().left }; });
  const t = await touchSession(page);
  await t.start(r.row + 4, r.y); await t.move(r.row + 14, r.y); await t.move(r.l0 + 10, r.y); await t.move((r.l1 + r.r1) / 2 - 20, r.y);
  await page.waitForTimeout(300);
  await save(page, '14-saying-sounds-slide.png');
  await t.end();
}
// Saying Sounds picture word (moon) and Saying Words (catfish), each with a finger sliding across it.
{
  const slide = async (name, fraction) => {
    const r = await page.evaluate(() => { const svg = document.querySelector('.word-glyphs'), b = svg.getBoundingClientRect(), k = b.width / Number(svg.dataset.width); const e = [...svg.querySelectorAll('.glyph-letter')].map((g) => ({ l: b.left + Number(g.dataset.x0) * k, r: b.left + Number(g.dataset.x1) * k })); return { first: e[0].l, last: e[e.length - 1].r, y: b.top + b.height / 2, band: document.querySelector('.slide-band').getBoundingClientRect().left }; });
    const t = await touchSession(page);
    await t.start(r.band + 8, r.y); await t.move(r.band + 20, r.y); await t.move(r.first + (r.last - r.first) * fraction, r.y + 10);
    await page.waitForTimeout(300);
    await save(page, name);
    await t.end();
  };
  await page.goto(url + '#/lesson/1/task/3'); await page.waitForSelector('.sounds-stage'); await page.waitForTimeout(1200);
  const pf = await page.locator('.sounds-stage .pic-frame').boundingBox();
  await page.touchscreen.tap(pf.x + pf.width / 2, pf.y + pf.height / 2); await page.waitForSelector('.slide-band'); await page.waitForTimeout(700);
  await slide('18-picture-word-slide.png', 0.55);
  await page.goto(url + '#/lesson/2/task/3'); await page.waitForSelector('.merged-tile'); await page.waitForTimeout(1200);
  const m = await page.locator('.merged-tile').boundingBox();
  await page.touchscreen.tap(m.x + m.width / 2, m.y + m.height / 2); await page.waitForSelector('.slide-band'); await page.waitForTimeout(900);
  await slide('19-saying-words-slide.png', 0.5);
}
// The parent script as a compact bar and as an open sheet; the screens that clipped on Geb's phone have room now.
await page.goto(url + '#/lesson/1/task/3'); await page.waitForSelector('.sounds-stage'); await page.waitForTimeout(1200);
{
  const pf = await page.locator('.sounds-stage .pic-frame').boundingBox();
  await page.touchscreen.tap(pf.x + pf.width / 2, pf.y + pf.height / 2); await page.waitForSelector('.slide-band'); await page.waitForTimeout(700);
  await save(page, '20-script-compact.png');
  await page.click('.script-toggle'); await page.waitForTimeout(500);
  await save(page, '21-script-open.png');
  await page.click('.sheet-close'); await page.waitForTimeout(400);
  await page.goto(url + '#/lesson/2/task/3'); await page.waitForSelector('.merged-tile'); await page.waitForTimeout(1000);
  const m = await page.locator('.merged-tile').boundingBox();
  await page.touchscreen.tap(m.x + m.width / 2, m.y + m.height / 2); await page.waitForSelector('.slide-band'); await page.waitForTimeout(900);
  await save(page, '22-saying-words-compact.png');
}
// The two games mid-play, and the overview scrolled to their cards.
await page.goto(url + '#/lesson/1/task/5'); await page.waitForSelector('.sky-letter'); await page.waitForTimeout(1200);
for (let i = 0; i < 2; i++) { await page.evaluate(() => document.querySelector('.sky-letter[data-target="1"]:not(.popped)').click()); await page.waitForTimeout(i ? 350 : 1600); }
await save(page, '09-letter-hunt.png');
await page.goto(url + '#/lesson/2/task/7'); await page.waitForSelector('.barn-letter:not([disabled])'); await page.waitForTimeout(900);
await page.click('.barn-letter'); await page.waitForTimeout(330);
await save(page, '10-barn-doors.png');
await page.goto(url + '#/lesson/2'); await page.waitForSelector('.task-card'); await page.waitForTimeout(900);
await page.evaluate(() => { const s = document.querySelector('.cards-scroll'); const c = document.querySelectorAll('.task-card')[6]; s.scrollTo({ left: c.offsetLeft - 20 }); });
await page.waitForTimeout(700);
await save(page, '11-lesson-overview-games.png');

// The path with the sound sack after lesson 3, and the sack game with a card on its way to the bag.
await page.evaluate((seen) => localStorage.setItem('reading.v1', JSON.stringify({ schema: 1, lessons: { 1: { tasksDone: [], result: 'got-it' }, 2: { tasksDone: [], result: 'got-it' }, 3: { tasksDone: [], result: 'got-it' } }, settings: { seenScripts: seen }, firstRunDone: true })), SEEN);
await page.goto(url + '#/home'); await page.reload(); await page.waitForSelector('.stone'); await page.waitForTimeout(2000);
await save(page, '15-home-with-sound-sack.png');
await page.goto(url + '#/checkpoint/c1'); await page.waitForSelector('.sack-card'); await page.waitForTimeout(1200);
{
  const card = await page.locator('.sack-card[data-correct="1"]').boundingBox(), sack = await page.locator('.sack').boundingBox();
  const t = await touchSession(page);
  const from = { x: card.x + card.width / 2, y: card.y + card.height / 2 };
  await t.start(from.x, from.y);
  for (let i = 1; i <= 8; i++) await t.move(from.x + ((sack.x + sack.width / 2 - from.x) * i) / 14, from.y + ((sack.y + sack.height * 0.3 - from.y) * i) / 14);
  await page.waitForTimeout(200);
  await save(page, '16-sound-sack.png');
  await t.end();
}

// Landscape: the lesson overview and New Letter.
await ctx.close();
const land = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const lp = await land.newPage();
await lp.addInitScript(SPEECH_STUB);
await lp.addInitScript(`if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[0,1,2,3,4,5],result:'got-it',completedAt:'2026-09-30T12:00:00Z'},2:{tasksDone:[0,1],result:null}},settings:{seenScripts:${JSON.stringify(SEEN)}},firstRunDone:true})); }`);
await lp.goto(url + '#/lesson/2'); await lp.waitForTimeout(1200); await save(lp, '07-lesson-overview-landscape.png');
await lp.goto(url + '#/lesson/2/task/1'); await lp.waitForTimeout(2200); await save(lp, '08-new-letter-landscape.png');
await lp.goto(url + '#/lesson/1/task/3'); await lp.waitForSelector('.sounds-stage'); await lp.waitForTimeout(1200);
{ const pf = await lp.locator('.sounds-stage .pic-frame').boundingBox(); await lp.touchscreen.tap(pf.x + pf.width / 2, pf.y + pf.height / 2); await lp.waitForSelector('.slide-band'); await lp.waitForTimeout(600); await lp.click('.script-toggle'); await lp.waitForTimeout(500); await save(lp, '23-script-open-landscape.png'); }
await lp.goto(url + '#/lesson/1/task/5'); await lp.waitForSelector('.sky-letter'); await lp.waitForTimeout(1200);
for (let i = 0; i < 2; i++) { await lp.evaluate(() => document.querySelector('.sky-letter[data-target="1"]:not(.popped)').click()); await lp.waitForTimeout(i ? 350 : 1600); }
await save(lp, '12-letter-hunt-landscape.png');
await lp.goto(url + '#/lesson/2/task/7'); await lp.waitForSelector('.barn-letter:not([disabled])'); await lp.waitForTimeout(900);
await lp.click('.barn-letter'); await lp.waitForTimeout(330);
await save(lp, '13-barn-doors-landscape.png');

// Round 2 (layout fixes): the screens that changed, at 360x780, 412x915 and 915x412.
await land.close();
const seed = `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[],result:'got-it'},2:{tasksDone:[],result:'got-it'},3:{tasksDone:[],result:'got-it'}},settings:{seenScripts:${JSON.stringify(SEEN)}},firstRunDone:true}))`;
for (const [vn, w, h] of [['360', 360, 780], ['412', 412, 915], ['land', 915, 412]]) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await c.newPage();
  await p.addInitScript(SPEECH_STUB);
  await p.addInitScript(seed);
  const shot = async (route, name, act) => { await p.goto(url + route); await p.waitForTimeout(1500); if (act) await act(); await save(p, `r2-${name}-${vn}.png`); };
  await shot('#/lesson/2/task/1', 'new-letter');
  await shot('#/lesson/1/task/4', 'writing');
  await shot('#/lesson/2/finish', 'finish', () => p.waitForTimeout(1000));
  await shot('#/lesson/2', 'overview');
  await shot('#/lesson/1/task/2', 'saying-words-revealed', async () => { await p.click('.merged-tile'); await p.waitForTimeout(1300); });
  await shot('#/lesson/1/task/5', 'letter-hunt');
  await shot('#/lesson/1/task/6', 'barn-doors');
  await shot('#/lesson/1/task/7', 'quick-check');
  await shot('#/checkpoint/c1', 'sound-sack');
  await shot('#/lesson/1/task/1', 'sound-story');
  await c.close();
}
// The end of Letter Hunt: only the barn, the stars and the glow are left.
{
  const c = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await c.newPage();
  await p.addInitScript(SPEECH_STUB);
  await p.addInitScript(seed);
  await p.goto(url + '#/lesson/1/task/5'); await p.waitForSelector('.sky-letter'); await p.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) { const b = await p.locator('.sky-letter[data-target="1"]:not(.popped)').first().boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(i < 4 ? 1000 : 3500); }
  await save(p, 'r2-hunt-end-412.png');
  await c.close();
}

await browser.close(); server.close();
