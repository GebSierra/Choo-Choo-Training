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

const progress = { schema: 1, lessons: { 1: { tasksDone: [], result: "got-it" } }, settings: {}, firstRunDone: true, savedAt: 1700000000000, note: "héllo ✓" };
const fromB64 = b => new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(b.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));

// Visits the site as a given visitor and reports where it ended up (the app address is answered with a stub page).
async function visit({ path = "/index.html", cookie = false, storage = null, init = null }) {
  const ctx = await browser.newContext();
  if (cookie) await ctx.addCookies([{ name: "cct_member", value: "1", domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  await page.route("https://app.choochootraining.com/**", r => r.fulfill({ contentType: "text/html", body: "<title>app</title>" }));
  if (storage !== null) await page.addInitScript(v => localStorage.setItem("reading.v1", v), storage);
  if (init) await page.addInitScript(init);
  await page.goto(base + path, { waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(300);
  const url = page.url(); // request URLs never carry the fragment, the page URL does
  await ctx.close();
  return url.startsWith("https://app.choochootraining.com/") ? url : null;
}
const frag = u => new URL(u).hash;

// 1. New visitor sees the website
ok(await visit({}) === null, "a new visitor is redirected");
ok(await visit({ path: "/index.html#how" }) === null, "a new visitor following #how is redirected");
// 2. Each trigger sends people to the app
ok((await visit({ cookie: true })) === APP, "cookie only: expected a plain app URL");
{ const u = await visit({ storage: JSON.stringify(progress) });
  const m = /^#handoff=([A-Za-z0-9_-]+)$/.exec(frag(u || ""));
  ok(!!m, `progress: expected a #handoff fragment, got ${u && u.slice(0, 80)}`);
  ok(m && JSON.stringify(JSON.parse(fromB64(m[1]))) === JSON.stringify(progress), "progress: the app side decodes exactly what was stored (incl. UTF-8)");
  ok(u && !new URL(u).search, "progress: nothing in the query string"); }
{ const u = await visit({ path: "/index.html?utm=x#/lesson/3", storage: JSON.stringify(progress) });
  const m = /^#handoff=([A-Za-z0-9_-]+)&route=(.*)$/.exec(frag(u || ""));
  ok(!!m && decodeURIComponent(m[2]) === "/lesson/3", "progress + route: route is carried and encoded");
  ok(u && new URL(u).search === "?utm=x", "progress + route: the original query string is kept"); }
// 3. Routes without progress, and hashes forwarded unchanged
ok((await visit({ path: "/index.html#/lesson/3" })) === APP + "#/lesson/3", "route without progress: hash forwarded unchanged");
ok((await visit({ path: "/index.html#access_token=abc&type=recovery", cookie: true })) === APP + "#access_token=abc&type=recovery", "reset link: forwarded unchanged");
ok((await visit({ path: "/index.html#access_token=abc&type=recovery", storage: JSON.stringify(progress) }))?.includes("handoff") === false, "reset link: never a handoff, even with progress");
ok((await visit({ path: "/index.html#error=access_denied&error_code=otp_expired", cookie: true })) === APP + "#error=access_denied&error_code=otp_expired", "error link: forwarded unchanged");
// 4. Bad or oversized progress is never sent
for (const [why, v] of [["corrupt JSON", "{nope"], ["schema 2", JSON.stringify({ ...progress, schema: 2 })], ["no lessons", JSON.stringify({ schema: 1 })], ["lessons is an array", JSON.stringify({ schema: 1, lessons: [] })], ["over 200 KB", JSON.stringify({ ...progress, pad: "x".repeat(201 * 1024) })]]) {
  const u = await visit({ storage: v });
  ok(u === APP, `${why}: expected a plain app URL with no progress, got ${u && u.slice(0, 80)}`);
}
ok(JSON.stringify(progress).length < 200 * 1024 && (await visit({ storage: JSON.stringify({ ...progress, pad: "x".repeat(190 * 1024) }) }))?.includes("handoff="), "just under 200 KB is sent");
// 5. ?site keeps the website for members
for (const [why, o] of [["cookie", { cookie: true }], ["storage", { storage: JSON.stringify(progress) }], ["route", { path: "/index.html?site#/lesson/3" }]]) {
  ok((await visit({ path: "/index.html?site", ...o, ...(why === "route" ? { path: "/index.html?site#/lesson/3" } : {}) })) === null, `?site with ${why}: the website stays`);
}
ok((await visit({ path: "/index.html?a=1&site", cookie: true })) === null, "?a=1&site: the website stays");
ok((await visit({ path: "/index.html?sitemap=1", cookie: true })) === APP + "?sitemap=1", "?sitemap is not ?site");
// 6. Other pages never redirect
ok(await visit({ path: "/privacy.html", cookie: true }) === null, "privacy page does not redirect members");
ok(await visit({ path: "/404.html", cookie: true }) === null, "404 page does not redirect members");
// 7. Storage blocked: no crash, falls back on cookie
ok((await visit({ cookie: true, init: () => Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }) })) === APP, "localStorage blocked: cookie still works");
ok((await visit({ init: () => Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }) })) === null, "localStorage blocked: new visitor still sees the page");

// 8. The redirect runs before first paint: it is an inline script ahead of any stylesheet, and the page never painted
{ const html = readFileSync(SITE + "index.html", "utf8");
  const head = html.slice(0, html.indexOf("</head>"));
  ok(head.indexOf("app.choochootraining.com") > 0 && head.indexOf("<script>") < head.indexOf('rel="stylesheet"'), "the inline redirect comes before the first stylesheet");
  ok(!/<script[^>]*\ssrc=[^>]*><\/script>[\s\S]*cct_member/.test(head), "the redirect is inline, not an external file"); }

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
