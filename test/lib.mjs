// Shared helpers for the tests: static server, Playwright loader, browser launcher.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

export async function launch(pw) {
  const opts = { headless: true };
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
