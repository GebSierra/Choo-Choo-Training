// Scratch: screenshots routes at tablet sizes. ROUTES env = comma list, SIZES env = "820x1180,..." OUT = dir
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { startServer, loadPlaywright, launch, newPage, SEEN, DONE_JSON } from './lib.mjs';
const sizes = (process.env.SIZES || '820x1180,1180x820').split(',').map((s) => s.split('x').map(Number));
const routes = (process.env.ROUTES || '/lesson/9').split(',');
const out = process.env.OUT || '/tmp/shots';
fs.mkdirSync(out, { recursive: true });
const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());
for (const [w, h] of sizes) for (const r of routes) {
  const { ctx, page } = await newPage(browser, { width: w, height: h, deviceScaleFactor: 1 });
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: JSON.parse(DONE_JSON), settings: { seenScripts: SEEN }, firstRunDone: true, meetDue: false })}))`);
  await page.goto(url + '#' + r);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, `${r.replace(/\W+/g, '_')}_${w}x${h}.png`) });
  await ctx.close();
}
await browser.close(); server.close();
