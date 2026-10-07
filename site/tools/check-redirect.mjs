// Tests the inline redirect in index.html (docs/DOMAIN-MOVE.md part D) and the cleanup worker sw.js. Run from site/: node tools/check-redirect.mjs
// The app address is intercepted, so nothing leaves the machine. The handoff is also decoded the way the app's js/handoff.js does it.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const SITE = fileURLToPath(new URL("..", import.meta.url));
const PORT = 8125, base = `http://localhost:${PORT}`, APP = "https://app.choochootraining.com/";
const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: SITE, stdio: "ignore" });
await new Promise(r => setTimeout(r, 800));
const browser = await chromium.launch();
let failed = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { failed++; console.error("FAIL", m); } };

const progress = JSON.stringify({ schema: 1, lessons: { 1: { result: "got-it" } }, firstRunDone: true });

async function visit({ path = "/index.html", cookie = false, storage = null }) {
  const ctx = await browser.newContext();
  if (cookie) await ctx.addCookies([{ name: "cct_member", value: "1", domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  await page.route("https://app.choochootraining.com/**", r => r.fulfill({ contentType: "text/html", body: "<title>app</title>" }));
  if (storage !== null) await page.addInitScript(v => localStorage.setItem("reading.v1", v), storage);
  await page.goto(base + path, { waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(300);
  const url = page.url(); // request URLs never carry the fragment, the page URL does
  await ctx.close();
  return url.startsWith(APP) ? url : null;
}

// Nobody is moved just for visiting: new visitors, app users with the cookie, or saved progress all see the website
ok(await visit({}) === null, "a new visitor stays on the website");
ok(await visit({ cookie: true }) === null, "an app user (cookie) stays on the website");
ok(await visit({ storage: progress }) === null, "saved old progress does not redirect");
ok(await visit({ path: "/index.html#how" }) === null, "a page anchor stays on the website");
// Links that only make sense in the app are forwarded unchanged
ok((await visit({ path: "/index.html#/lesson/3" })) === APP + "#/lesson/3", "an old app route goes to the app unchanged");
ok((await visit({ path: "/index.html?x=1#/home" })) === APP + "?x=1#/home", "the query string is kept");
ok((await visit({ path: "/index.html#access_token=abc&type=recovery" })) === APP + "#access_token=abc&type=recovery", "a reset-password link goes to the app unchanged");
ok((await visit({ path: "/index.html#error=access_denied&error_code=otp_expired" })) === APP + "#error=access_denied&error_code=otp_expired", "an auth error link goes to the app unchanged");
ok(!(await visit({ path: "/index.html#/home", storage: progress }))?.includes("handoff"), "progress is never sent");
ok(await visit({ path: "/privacy.html#/home" }) === null, "the privacy page never redirects");

// 9. sw.js: an "old app" worker is installed with a cache; the server then starts serving the real sw.js at the same URL,
//    the browser updates it (as it does on every visit), and it must clear the caches, unregister and reload the window.
{
  const { createServer } = await import("node:http");
  const OLD = "self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open('reading-v1.9.21').then(c=>c.put('/x',new Response('old app'))))});self.addEventListener('activate',e=>e.waitUntil(clients.claim()));";
  let sw = OLD, loads = 0;
  const srv = createServer((q, r) => {
    if (q.url === "/sw.js") { r.writeHead(200, { "content-type": "text/javascript", "cache-control": "no-cache" }); return r.end(sw); }
    loads++; r.writeHead(200, { "content-type": "text/html" }); r.end("<title>page</title>live site");
  }).listen(8126);
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto("http://localhost:8126/");
  await page.evaluate(async () => { await navigator.serviceWorker.register("/sw.js", { scope: "/" }); await navigator.serviceWorker.ready; });
  ok(await page.evaluate(() => caches.keys().then(k => k.includes("reading-v1.9.21"))), "setup: the old worker installed its cache");
  const before = loads;
  sw = readFileSync(SITE + "sw.js", "utf8");
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration("/"); await r.update(); });
  await page.waitForTimeout(1500);
  const left = await page.evaluate(async () => ({ caches: await caches.keys(), regs: (await navigator.serviceWorker.getRegistrations()).length }));
  ok(left.caches.length === 0, `sw.js deletes every cache (left: ${left.caches})`);
  ok(left.regs === 0, "sw.js unregisters itself");
  ok(loads > before, "sw.js reloads the open window");
  await ctx.close(); srv.close();
}

await browser.close(); server.kill();
console.log(failed ? `${failed} of ${n} redirect checks failed` : `all ${n} redirect checks passed`);
process.exit(failed ? 1 : 0);
