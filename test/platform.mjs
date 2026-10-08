// App store readiness (docs/APP-STORE.md): native detection, the storage seam, no remote files, the grown-up gate before
// YouTube, the Android back button and the one microphone request. Run alone with `node test/platform.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { startServer, loadPlaywright, launch, newPage, ROOT, doneThrough } from './lib.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const walk = (dir, exts) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
  const rel = path.join(dir, e.name);
  return e.isDirectory() ? walk(rel, exts) : exts.some((x) => rel.endsWith(x)) ? [rel] : [];
});
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const jsFiles = walk('js', ['.js']);

// 2. Storage seam: only js/store.js may touch browser storage.
for (const f of jsFiles) {
  if (f === 'js/store.js') continue;
  ok(!/localStorage|sessionStorage|indexedDB/.test(read(f)), `${f} does not touch browser storage (use js/store.js)`);
}

// 3. No remote files: the only web addresses are the two YouTube links, the SVG namespace (a name, not a download), the app's own
// site (the password reset and Google sign-in redirect) and the one Supabase project address (js/config.js only).
const ALLOWED = [/^https:\/\/m\.youtube\.com\/playlist\?list=/, /^https:\/\/youtu\.be\//, /^http:\/\/www\.w3\.org\/2000\/svg$/, /^https:\/\/(app\.)?choochootraining\.com\/?$/];
const cfgSrc = read('js/config.js');
const SB_ORIGIN = 'https://nwlfjqcynfoyjnepiuze.supabase.co';
ok(cfgSrc.includes(`SUPABASE_URL = '${SB_ORIGIN}'`), 'js/config.js holds the one Supabase project address');
ok(!jsFiles.some((f) => /sb_secret_|eyJ[A-Za-z0-9_-]{20,}/.test(read(f))), 'no secret key or JWT-style key anywhere in js/');
ALLOWED.push(new RegExp('^' + SB_ORIGIN.replace(/\./g, '\\.') + '$'));
const scan = [...jsFiles, ...walk('css', ['.css']), ...walk('data', ['.json']), 'index.html', 'manifest.webmanifest', 'sw.js'];
let urls = 0;
for (const f of scan) {
  for (const u of read(f).match(/https?:\/\/[^\s"'`)\\<>]+/g) || []) {
    urls++;
    ok(ALLOWED.some((re) => re.test(u)), `${f} references a remote address: ${u.slice(0, 80)}`);
  }
}
ok(urls >= 3, 'the remote address scan actually found the YouTube links and the SVG namespace');
ok(/youtube/.test(read('data/curriculum.json')), 'the YouTube links are still in curriculum.json');

// 6. Microphone: one getUserMedia call site, in js/mic.js, which only the Smooth Ride screen imports.
const gum = jsFiles.filter((f) => /getUserMedia/.test(read(f)));
ok(gum.length === 1 && gum[0] === 'js/mic.js', `getUserMedia appears only in js/mic.js (${gum.join(', ')})`);
const micUsers = jsFiles.filter((f) => /from\s+['"][^'"]*\/mic\.js['"]|import\(['"][^'"]*\/mic\.js['"]\)/.test(read(f)));
ok(micUsers.length === 1 && micUsers[0] === 'js/screens/ride.js', `only the ride screen imports mic.js (${micUsers.join(', ')})`);
ok(read('sw.js').includes("'js/platform.js'") && read('sw.js').includes("'js/components/grown-gate.js'"), 'sw.js precaches platform.js and grown-gate.js');

const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());
const VP = { name: 'phone', width: 412, height: 915, deviceScaleFactor: 2.6 };
const SEED = `if (!localStorage.getItem('reading.v1')) localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneThrough(4), settings: {}, firstRunDone: true, meetDue: false })}))`;
const CAP = `window.__backs = []; window.Capacitor = { isNativePlatform: () => true, Plugins: { App: { addListener: (n, fn) => { window.__backs.push([n, fn]); return Promise.resolve({ remove() {} }); } } } };`;

// 1 and 5. Native detection: no service worker inside a wrapper, one in the browser. The Android back button.
{
  const n = await newPage(browser, VP, { serviceWorkers: 'allow' });
  await n.page.addInitScript(SEED); await n.page.addInitScript(CAP);
  await n.page.goto(url + '#/home'); await n.page.waitForSelector('.screen'); await n.page.waitForTimeout(1500);
  ok((await n.page.evaluate(() => navigator.serviceWorker.getRegistrations())).length === 0, 'native: no service worker registers');
  ok(await n.page.evaluate(() => window.__backs.length === 1 && window.__backs[0][0] === 'backButton'), 'native: one backButton listener');
  const call = () => n.page.evaluate(() => window.__backs[0][1]());
  await call(); await n.page.waitForTimeout(400);
  ok(n.page.url().endsWith('#/home'), 'back on Home stays on Home');
  await n.page.evaluate(() => { location.hash = '#/lesson/1/task/0'; }); await n.page.waitForSelector('.task-screen');
  await call(); await n.page.waitForFunction(() => location.hash === '#/lesson/1', null, { timeout: 4000 });
  ok(true, 'back inside a task goes to the lesson');
  await call(); await n.page.waitForFunction(() => location.hash === '#/home', null, { timeout: 4000 });
  ok(true, 'back from the lesson goes Home');
  ok(n.errors.length === 0, 'native: no errors ' + n.errors.join('|'));
  await n.ctx.close();

  const w = await newPage(browser, VP, { serviceWorkers: 'allow' });
  await w.page.addInitScript(SEED);
  await w.page.goto(url + '#/home'); await w.page.waitForSelector('.screen');
  let regs = 0;
  try { await w.page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).length > 0, null, { timeout: 8000 }); regs = 1; } catch { /* reported below */ }
  ok(regs === 1, 'browser: the service worker registers');
  await w.ctx.close();
}

// 4. The grown-up gate before YouTube.
{
  const { ctx, page, errors } = await newPage(browser, VP);
  await page.addInitScript(SEED);
  await page.addInitScript(`window.__opened = []; window.open = (...a) => { window.__opened.push(a); return null; };`);
  await page.goto(url + '#/home'); await page.waitForSelector('.pill-hold'); await page.waitForTimeout(900);
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
  await page.waitForSelector('.grownups'); await page.waitForTimeout(500);
  const opened = () => page.evaluate(() => window.__opened.slice());
  const WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  for (const [i, expect] of [[0, 'PL2hNdtrsO2hIINInfmEb55IpwTw0IrQZW'], [1, 'qKQAQc2NEuk']]) {
    const link = page.locator('.gu-link').nth(i);
    await link.scrollIntoViewIfNeeded(); await link.click();
    await page.waitForSelector('.gg-card');
    ok((await opened()).length === i, `link ${i}: the gate shows and nothing has opened`);
    const info = await page.evaluate(() => {
      const c = document.querySelector('.gg-card'); const btns = [...c.querySelectorAll('.gg-num')];
      return { target: c.dataset.target, n: btns.length, small: btns.filter((b) => { const r = b.getBoundingClientRect(); return r.width < 48 || r.height < 48; }).length, ask: c.querySelector('.gg-ask').textContent, digits: btns.map((b) => b.textContent) };
    });
    ok(info.n >= 4 && info.n <= 6 && info.small === 0, `link ${i}: 4 to 6 buttons, all 48 px or more (${info.n})`);
    ok(info.ask.includes(WORDS[info.target - 1]) && info.digits.includes(info.target) && !/\d/.test(info.ask), `link ${i}: the target is a word and the buttons are digits (${info.ask})`);
    const wrong = info.digits.find((d) => d !== info.target);
    await page.click(`.gg-num[data-n="${wrong}"]`);
    ok((await page.locator('.gg-card').count()) === 0 && (await opened()).length === i, `link ${i}: a wrong number closes the gate and opens nothing`);
    await link.click(); await page.waitForSelector('.gg-card'); await page.click('.gg-cancel');
    ok((await page.locator('.gg-card').count()) === 0 && (await opened()).length === i, `link ${i}: cancel opens nothing`);
    await link.click(); await page.waitForSelector('.gg-card');
    await page.click(`.gg-num[data-n="${await page.getAttribute('.gg-card', 'data-target')}"]`);
    const o = await opened();
    ok(o.length === i + 1 && o[i][0].includes(expect), `link ${i}: the right number opens the link (${JSON.stringify(o[i])})`);
  }
  const seen = new Set();
  for (let k = 0; k < 12; k++) { await page.locator('.gu-link').first().click(); await page.waitForSelector('.gg-card'); seen.add(await page.getAttribute('.gg-card', 'data-target')); await page.click('.gg-cancel'); }
  ok(seen.size >= 3, `the target number is random (${[...seen]})`);
  ok(errors.length === 0, 'gate: no errors ' + errors.join('|'));
  await ctx.close();
}

// 7. The only remote origin the app may contact is the configured Supabase project (accounts on, via ?accounts=1 on localhost).
// The Google sign-in is a top-level navigation to that same origin, not a fetch.
{
  const { ctx, page, errors } = await newPage(browser, VP);
  const remote = [], navs = [];
  await ctx.route('**/*', (route) => {
    const req = route.request(), u = new URL(req.url());
    if (u.origin === new URL(url).origin || u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
    remote.push(u.origin);
    if (req.isNavigationRequest()) navs.push(req.url());
    return route.fulfill({ status: req.isNavigationRequest() ? 200 : 400, headers: { 'content-type': 'text/html' }, body: '<!doctype html><title>stub</title>' });
  });
  await page.addInitScript(SEED);
  await page.goto(url + '#/home'); await page.waitForSelector('.screen'); await page.waitForTimeout(800);
  ok(remote.length === 0, `accounts off (default on localhost): the app contacts no remote origin (${[...new Set(remote)]})`);
  await page.goto(url + '?accounts=1'); await page.waitForSelector('.signin'); await page.waitForTimeout(800);
  ok(remote.every((o) => o === SB_ORIGIN), `accounts on: every remote origin is the Supabase project (${[...new Set(remote)]})`);
  await page.click('.si-google');
  for (let t = 0; t < 40 && !navs.length; t++) await page.waitForTimeout(100);
  ok(navs.length === 1 && navs[0].startsWith(SB_ORIGIN + '/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fapp.choochootraining.com%2F&code_challenge='), 'Google sign-in navigates to the Supabase authorize URL ' + navs[0]);
  ok(remote.every((o) => o === SB_ORIGIN), 'still only the Supabase origin after tapping Google');
  ok(errors.filter((e) => !/Failed to load resource/.test(e)).length === 0, 'remote origin check: no errors ' + errors.join('|'));
  await ctx.close();
}

await browser.close(); server.close();
console.log(`platform: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
