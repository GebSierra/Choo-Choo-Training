// Shared helpers for the tests: static server, Playwright loader, browser launcher.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { AUDIO_STUB } from './stubs.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Saved progress with every lesson done (so every lesson and checkpoint is open), built from the data.
const CUR_CK = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8')).checkpoints;
const LESSON_COUNT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8')).lessons.length;
export const doneThrough = (n = LESSON_COUNT) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it' }]));
export const DONE_JSON = JSON.stringify(doneThrough());
// The lessons whose nine tasks are all walked in the slow suites: the first new one, a middle one and the last (plus 1 to 3).
export const SAMPLE_LESSONS = [1, 2, 3, 4, 8, 13].filter((n) => n <= LESSON_COUNT);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webm': 'audio/webm' };

export function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

export async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* fall back to the global install */ }
  const req = createRequire('/opt/node22/lib/node_modules/');
  return req('playwright');
}

export async function launch(pw, args = []) {
  const opts = { headless: true, args };
  try { return await pw.chromium.launch(opts); } catch (e) {
    for (const p of ['/opt/pw-browsers/chromium/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium']) {
      try { if (fs.statSync(p).isFile()) return await pw.chromium.launch({ ...opts, executablePath: p }); } catch { /* next */ }
    }
    throw e;
  }
}

export const VIEWPORTS = [
  { name: 'pixel7', width: 412, height: 915, deviceScaleFactor: 2.6 },
  { name: 'pixel7-land', width: 915, height: 412, deviceScaleFactor: 2.6 },
  { name: 'small', width: 360, height: 780, deviceScaleFactor: 3 },
];

export async function newPage(browser, vp, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, hasTouch: true, isMobile: true, serviceWorkers: 'block', ...extra });
  const page = await ctx.newPage();
  await page.addInitScript(AUDIO_STUB); // sound cannot be heard here: Web Audio is a recorder in every test
  const errors = [];
  // A missing recorded clip is expected until Geb records it; the browser logs its 404 itself.
  // Only that one known message is ignored: a 404 for a file under /assets/audio/.
  page.on('console', (m) => { if (m.type() === 'error' && !(m.text().includes('404') && m.location().url.includes('/assets/audio/'))) errors.push('console: ' + m.text() + ' ' + m.location().url); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return { ctx, page, errors };
}

// A real touch drag through the browser's input pipeline (Playwright's touchscreen can only tap).
// during() runs before the finger lifts.
export async function touchDrag(page, from, to, { steps = 14, during } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  await send('touchStart', [{ x: from.x, y: from.y }]);
  for (let i = 1; i <= steps; i++) await send('touchMove', [{ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps + (i % 2 ? 4 : -4) }]);
  if (during) await during();
  await send('touchEnd', []);
  await cdp.detach();
}

// A touch you can steer step by step (Playwright's touchscreen can only tap): start, move to x/y, end.
export async function touchSession(page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  return {
    start: (x, y) => send('touchStart', [{ x, y }]),
    move: (x, y) => send('touchMove', [{ x, y }]),
    end: async () => { await send('touchEnd', []); await cdp.detach(); },
  };
}

// Every kind of task and lesson already seen on this device, so the parent script does not open by itself over the
// controls a test is about to tap. (The first-visit behaviour is tested with an empty list.)
export const SEEN_BASE = { rideIntro: true, ...Object.fromEntries(CUR_CK.filter((c) => c.kind === 'book').map((c) => ['storyIntro:' + c.id, true])), review: true, newLetter: true, story: true, words: true, sounds: true, writing: true, hunt: true, barn: true, practice: true, book: true, ride: true, check: true, checkpoint: true, ...Object.fromEntries(Array.from({ length: LESSON_COUNT }, (_, i) => [`lesson:${i + 1}`, true])) };
// Everything the first-visit help shows, tips included: tests that are not about the help start from here.
import { TIPS } from '../js/guide.js';
export const SEEN = { ...SEEN_BASE, ...Object.fromEntries(Object.keys(TIPS).map((k) => { const [lesson, type] = k.split(':'); return [`tip:${lesson}:${type}`, true]; })) };

// On the 3D railway Home only some stops are on screen: this moves the camera to the stop a selector names (first match)
// and waits until its button is shown. On the 2D path it does nothing (the stones scroll into view by themselves).
export async function showStop(page, selector) {
  const i = await page.evaluate((s) => { const b = document.querySelector(s); return b && b.dataset.index !== undefined && window.__train ? Number(b.dataset.index) : -1; }, selector);
  if (i < 0) return;
  await page.evaluate((k) => window.__train.show(k), i);
  await page.waitForFunction((s) => { const b = document.querySelector(s); return b && b.dataset.shown === '1'; }, selector, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(150);
}
