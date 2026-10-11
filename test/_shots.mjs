import path from 'node:path';
import fs from 'node:fs';
import { SPEECH_STUB } from './stubs.mjs';
import { startServer, loadPlaywright, launch, newPage, SEEN, doneThrough } from './lib.mjs';
const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());
const OUT = '/tmp/claude-0/-home-user-Choo-Choo-Training/ddc80dd7-9ea5-507e-9488-5ac16fcd0791/scratchpad/pbshots';
const seed = (n) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify({ schema: 1, order: 'm a s i t p f o n d c h u g l r b', lessons: doneThrough(n), settings: { seenScripts: SEEN, perDay: 0 }, firstRunDone: true, meetDue: false, character: { name: 'Lily', made: true } }))}); }`;
async function shot(route, file, click, n = 10, h = 844) {
  const { ctx, page } = await newPage(browser, { width: 390, height: h, deviceScaleFactor: 2 });
  await page.addInitScript(SPEECH_STUB); await page.addInitScript(seed(n));
  await page.goto(url + route); await page.waitForTimeout(2500);
  if (click) { await page.locator(click).nth(1).click(); await page.waitForTimeout(500); }
  await page.screenshot({ path: file }); await ctx.close();
}
const D = path.join(process.cwd(), 'docs/screenshots/phase-b');
await shot('#/lesson/11/task/1', path.join(D, 'ck-new-sound-390x844.png'));
await shot('#/lesson/11/task/6', path.join(D, 'ck-k-trace-390x844.png'), '.letter-pick');
await shot('#/lesson/13/task/1', OUT + '/u-new.png', null, 12);
await shot('#/lesson/16/task/1', OUT + '/r-new.png', null, 15);
await shot('#/lesson/8/task/1', OUT + '/o-new.png', null, 7);
await browser.close(); server.close();
