// one-off: re-shoot docs/screenshots/storybook/after-* with a girl "Lily"
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN } from './lib.mjs';
const OUT = path.join(ROOT, 'docs/screenshots/storybook');
const done = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it' }]));
const seed = `localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: done(4), settings: { seenScripts: SEEN }, firstRunDone: true, meetDue: false, character: { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true } })}))`;
const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());
for (const vp of [{ name: '390x844', width: 390, height: 844, pages: [1,2,3,4,5,6,7,8,9,10,11] }, { name: '915x412', width: 915, height: 412, pages: [1,2,3,6,10] }]) {
  const { page } = await newPage(browser, { name: vp.name, width: vp.width, height: vp.height, deviceScaleFactor: 2 });
  await page.addInitScript(SPEECH_STUB); await page.addInitScript(seed);
  await page.goto(url + '#/checkpoint/b1'); await page.waitForSelector('.book-stage'); await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `after-${vp.name}-cover.png`) });
  await page.locator('.book-stage').click({ position: { x: 100, y: 200 } }).catch(() => {});
  await page.waitForTimeout(1200);
  for (let p = 1; p <= 11; p++) {
    if (vp.pages.includes(p)) await page.screenshot({ path: path.join(OUT, `after-${vp.name}-p${String(p).padStart(2, '0')}.png`) });
    const next = page.getByRole('button', { name: 'Next page' }).first();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click(); await page.waitForTimeout(1200);
  }
  await page.close();
}
await browser.close(); server.close();
