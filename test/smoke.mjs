import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage } from './lib.mjs';

const OUT = path.join(ROOT, '_test');
fs.mkdirSync(OUT, { recursive: true });
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };

const { server, url } = await startServer();
const pw = await loadPlaywright();
const browser = await launch(pw);

for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.goto(url);
  await page.waitForSelector('.screen');
  await page.screenshot({ path: path.join(OUT, `home-${vp.name}.png`) });
  ok(errors.length === 0, `${vp.name}: console errors ${errors.join(' | ')}`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`smoke: ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
