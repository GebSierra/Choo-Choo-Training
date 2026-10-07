// Loads the site at phone and desktop sizes; fails on console errors, horizontal overflow or dead links. Run: node tools/check.mjs
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const PORT = 8123, base = `http://localhost:${PORT}`;
const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: new URL("..", import.meta.url).pathname, stdio: "ignore" });
await new Promise(r => setTimeout(r, 800));
mkdirSync("_shots", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
let failed = 0;
const fail = m => { console.error("FAIL", m); failed++; };
for (const [name, w, h] of [["phone", 390, 844], ["desktop", 1280, 800]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("console", m => { if (m.type() === "error" && !/status of 404|fonts\.g|_vercel|ERR_(NAME|INTERNET|TUNNEL|CONNECTION)/.test(m.text())) fail(`${name} console: ${m.text()}`); });
  page.on("response", r => { if (r.status() >= 400 && !r.url().includes("/_vercel/")) fail(`${name} ${r.status()} ${r.url()}`); });
  page.on("pageerror", e => fail(`${name} pageerror: ${e.message}`));
  await page.goto(base + "/index.html", { waitUntil: "load" });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (over > 0) fail(`${name} horizontal overflow ${over}px`);
  const links = await page.$$eval("a[href]", as => as.map(a => a.getAttribute("href") + "|" + a.href));
  for (const l of links) {
    const [raw, abs] = l.split("|");
    if (raw.startsWith("#")) { if (!(await page.$(raw))) fail(`missing anchor ${raw}`); }
    else if (raw.startsWith("mailto:") || raw.startsWith("http")) { /* external: not fetched */ }
    else { const r = await page.request.get(base + (raw === "/privacy" ? "/privacy.html" : raw)); if (!r.ok()) fail(`dead link ${raw}`); }
  }
  const atf = await page.$eval(".hero .btn", b => b.getBoundingClientRect().bottom);
  if (name === "phone" && atf > h) fail(`start button below the fold (${Math.round(atf)}px)`);
  await page.screenshot({ path: `_shots/${name}.png`, fullPage: true });
}
await browser.close(); server.kill();
console.log(failed ? `${failed} problem(s)` : "all checks passed");
process.exit(failed ? 1 : 0);
