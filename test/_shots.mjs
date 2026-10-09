// scratch: look at the new screens
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, doneThrough } from './lib.mjs';
const OUT = '/tmp/claude-0/-home-user-Choo-Choo-Training/ddc80dd7-9ea5-507e-9488-5ac16fcd0791/scratchpad/pbshots';
import fs from 'node:fs';
fs.mkdirSync(OUT, { recursive: true });
const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());
const seed = (obj) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(obj))}); }`;
const ORDER = 'm a s i t p f o n d c h u g l r b';
const base = (n) => ({ schema: 1, order: ORDER, lessons: doneThrough(n), settings: { seenScripts: SEEN, perDay: 0 }, firstRunDone: true, meetDue: false, character: { name: 'Lily', made: true } });
const shots = [
  ['ck-new-390', { width: 390, height: 844 }, 10, '#/lesson/11/task/1'],
  ['ck-new-land', { width: 915, height: 412 }, 10, '#/lesson/11/task/1'],
  ['ck-new-small', { width: 360, height: 640 }, 10, '#/lesson/11/task/1'],
  ['ck-mouth-390', { width: 390, height: 844 }, 10, '#/lesson/11/task/2'],
  ['ck-overview', { width: 390, height: 844 }, 10, '#/lesson/11'],
  ['ck-write', { width: 390, height: 844 }, 10, '#/lesson/11/task/6'],
  ['ck-hunt', { width: 390, height: 844 }, 10, '#/lesson/11/task/5'],
  ['o-new', { width: 390, height: 844 }, 7, '#/lesson/8/task/1'],
  ['o-write', { width: 390, height: 844 }, 7, '#/lesson/8/task/4'],
  ['u-new', { width: 390, height: 844 }, 12, '#/lesson/13/task/1'],
  ['r-new', { width: 390, height: 844 }, 15, '#/lesson/16/task/1'],
  ['r-write', { width: 390, height: 844 }, 15, '#/lesson/16/task/5'],
  ['f-sounds', { width: 390, height: 844 }, 6, '#/lesson/7/task/3'],
];
for (const [name, vp, n, route] of shots) {
  const { ctx, page, errors } = await newPage(browser, { ...vp, deviceScaleFactor: 2 });
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(seed(base(n)));
  await page.goto(url + route);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  if (errors.length) console.log(name, errors.join(' | '));
  await ctx.close();
}
await browser.close(); server.close();
console.log('done');
