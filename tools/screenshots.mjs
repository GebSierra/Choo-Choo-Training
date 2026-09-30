// Captures portrait screenshots of the main screens, plus two landscape ones, into _test/ and docs/screenshots/.
// Run: node tools/screenshots.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch } from '../test/lib.mjs';
import { SPEECH_STUB } from '../test/stubs.mjs';

const OUTS = [path.join(ROOT, '_test'), path.join(ROOT, 'docs/screenshots')];
OUTS.forEach((d) => fs.mkdirSync(d, { recursive: true }));
const save = async (page, name) => { const buf = await page.screenshot(); OUTS.forEach((d) => fs.writeFileSync(path.join(d, name), buf)); console.log('saved', name); };

const { server, url } = await startServer();
const pw = await loadPlaywright();
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
await page.addInitScript(SPEECH_STUB);
await page.addInitScript(`if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[0,1,2,3,4,5],result:'got-it',completedAt:'2026-09-30T12:00:00Z'},2:{tasksDone:[0,1],result:null}},settings:{},firstRunDone:true})); }`);

await page.goto(url + '#/home'); await page.waitForTimeout(2000); await save(page, '01-home.png');
await page.goto(url + '#/lesson/2'); await page.waitForTimeout(1200); await save(page, '02-lesson-overview.png');
await page.goto(url + '#/lesson/2/task/1'); await page.waitForTimeout(2200); await save(page, '03-new-letter.png');

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
await page.goto(url + '#/lesson/2/task/6'); await page.waitForTimeout(1200);
await page.locator('.opt-card').nth(1).click(); await page.waitForTimeout(400);
await save(page, '06-quick-check.png');

// Landscape: the lesson overview and New Letter.
await ctx.close();
const land = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const lp = await land.newPage();
await lp.addInitScript(SPEECH_STUB);
await lp.addInitScript(`if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[0,1,2,3,4,5],result:'got-it',completedAt:'2026-09-30T12:00:00Z'},2:{tasksDone:[0,1],result:null}},settings:{},firstRunDone:true})); }`);
await lp.goto(url + '#/lesson/2'); await lp.waitForTimeout(1200); await save(lp, '07-lesson-overview-landscape.png');
await lp.goto(url + '#/lesson/2/task/1'); await lp.waitForTimeout(2200); await save(lp, '08-new-letter-landscape.png');

await browser.close(); server.close();
