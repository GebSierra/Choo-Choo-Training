// Recording studio (tools/studio.html) with a fake microphone. Not part of npm test; run by hand.
// flock <lock> node test/studio.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch } from './lib.mjs';
import { ITEMS } from '../tools/studio-list.js';

const SHOTS = path.join(ROOT, 'docs/screenshots/studio');
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

const pw = await loadPlaywright();
const { server, url } = await startServer();
const browser = await launch(pw, ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']);

async function open(vp) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true, isMobile: vp.width < 600, permissions: ['microphone'], acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url + 'tools/studio.html');
  return { ctx, page, errors };
}

// the list itself
const files = ITEMS.map((i) => i.file);
ok(new Set(files).size === files.length, 'file names are unique (' + files.length + ' items)');
const per = {}; ITEMS.forEach((i) => { per[i.group] = (per[i.group] || 0) + 1; });
console.log('per group', JSON.stringify(per));
ok(ITEMS.every((i) => i.show && i.say && i.dont && i.tip && i.example && ['stretchy', 'bouncy', 'blend'].includes(i.hold)), 'every item has all fields');
ok(files.includes('sound-k') && files.includes('sound-th-buzz') && files.includes('blend-sam'), 'key names present');

const { ctx, page, errors } = await open({ width: 360, height: 780 });
ok((await page.textContent('#count')) === `0 of ${ITEMS.length} recorded`, 'progress starts at 0');
ok((await page.locator('.chip').count()) === ITEMS.length, 'list shows every item');
await page.screenshot({ path: path.join(SHOTS, 'phone-1-first.png') });

// layout
const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
ok(noScroll, 'no horizontal scroll at 360');
const small = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 47.5).map((b) => b.textContent));
ok(small.length === 0, 'visible buttons are at least 48px tall ' + small.join(','));
await page.locator('#listwrap summary').click();
const small2 = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && (b.getBoundingClientRect().height < 47.5 || b.getBoundingClientRect().width < 47.5)).map((b) => b.textContent));
ok(small2.length === 0, 'list chips are at least 48px ' + small2.join(','));
ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal scroll with the list open');
await page.screenshot({ path: path.join(SHOTS, 'phone-2-list-open.png'), fullPage: true });
await page.locator('#listwrap summary').click();

// record, stop, save
await page.click('#rec');
await page.waitForFunction(() => document.getElementById('rec').textContent === 'Stop');
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(SHOTS, 'phone-3-recording.png') });
await page.click('#rec');
await page.waitForFunction(() => !document.getElementById('save').disabled);
ok(true, 'stop gives a take');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
ok(dl.suggestedFilename() === 'sound-m.webm', 'download is named sound-m.webm (got ' + dl.suggestedFilename() + ')');
const p = await dl.path(); ok(fs.statSync(p).size > 500, 'downloaded file has audio');
ok((await page.textContent('#count')) === `1 of ${ITEMS.length} recorded`, 'progress is 1');
ok((await page.textContent('#show')) === 'a', 'moved to the next item');

// auto-stop after 4 s
await page.click('#rec');
await page.waitForFunction(() => document.getElementById('rec').textContent !== 'Stop', null, { timeout: 8000 });
ok(true, 'recording auto-stops');
await page.click('#redo');
ok(await page.locator('#save').isDisabled(), 'redo clears the take');

// jump from the list, record a blend
await page.locator('#listwrap summary').click();
await page.locator('.chip[data-file="blend-sam"]').click();
ok((await page.textContent('#show')) === 'Sam', 'jump to Sam from the list');
ok((await page.textContent('#hold')) === 'Smooth blend', 'blend badge');
await page.click('#rec'); await page.waitForTimeout(800); await page.click('#rec');
await page.waitForFunction(() => !document.getElementById('save').disabled);
const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
ok(dl2.suggestedFilename() === 'blend-sam.webm', 'blend file name ' + dl2.suggestedFilename());

// a few more saved for the screenshot
for (let k = 0; k < 3; k++) {
  await page.click('#rec'); await page.waitForTimeout(500); await page.click('#rec');
  await page.waitForFunction(() => !document.getElementById('save').disabled);
  await Promise.all([page.waitForEvent('download'), page.click('#save')]);
}
const idxBefore = await page.textContent('#show');
const countBefore = await page.textContent('#count');

// survives reload
await page.reload();
ok((await page.textContent('#count')) === countBefore, 'progress survives reload: ' + countBefore);
ok((await page.textContent('#show')) === idxBefore, 'place survives reload');
await page.locator('#listwrap summary').click();
await page.locator('.chip[data-file="sound-m"]').click();
ok(await page.locator('#again').isVisible(), 'Download again shows on a recorded item');
const [dl3] = await Promise.all([page.waitForEvent('download'), page.click('#again')]);
ok(dl3.suggestedFilename() === 'sound-m.webm', 'download again from IndexedDB');
const [dl4] = await Promise.all([page.waitForEvent('download'), page.click('#play').then(() => page.click('#all'))]);
ok(/\.webm$/.test(dl4.suggestedFilename()), 'download all starts');
await page.locator('#listwrap summary').scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(SHOTS, 'phone-4-after-saved.png') });
await page.screenshot({ path: path.join(SHOTS, 'phone-5-list-progress.png'), fullPage: true });

// start over
page.once('dialog', (d) => d.accept());
await page.click('#reset');
await page.waitForFunction(() => document.getElementById('count').textContent.startsWith('0 of'));
await page.reload();
ok((await page.textContent('#count')) === `0 of ${ITEMS.length} recorded`, 'start over clears, also after reload');
ok((await page.textContent('#show')) === 'm', 'back at the first item');
ok(errors.length === 0, 'no page errors ' + errors.join(' | '));
await ctx.close();

// laptop screenshots
const lap = await open({ width: 1280, height: 800 });
await lap.page.screenshot({ path: path.join(SHOTS, 'laptop-1-first.png') });
await lap.page.click('#rec'); await lap.page.waitForTimeout(1000);
await lap.page.screenshot({ path: path.join(SHOTS, 'laptop-2-recording.png') });
await lap.page.click('#rec');
await lap.page.waitForFunction(() => !document.getElementById('save').disabled);
for (let k = 0; k < 4; k++) {
  await Promise.all([lap.page.waitForEvent('download'), lap.page.click('#save')]);
  await lap.page.click('#rec'); await lap.page.waitForTimeout(500); await lap.page.click('#rec');
  await lap.page.waitForFunction(() => !document.getElementById('save').disabled);
}
await lap.page.locator('#listwrap summary').click();
await lap.page.screenshot({ path: path.join(SHOTS, 'laptop-3-after-saved.png'), fullPage: true });
ok(lap.errors.length === 0, 'laptop: no page errors ' + lap.errors.join(' | '));
await lap.ctx.close();

await browser.close(); server.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
