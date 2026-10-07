// Checks the site at phone and desktop sizes; run with `node tools/check.mjs` from site/.
// Fails on console errors, failed requests, horizontal overflow, dead local links or anchors, images without alt text,
// a start button below the fold on a phone, or a mobile start bar that misbehaves. Screenshots go to _shots/ (git-ignored).
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const SITE = fileURLToPath(new URL("..", import.meta.url));
const PORT = 8123, base = `http://localhost:${PORT}`;
const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: SITE, stdio: "ignore" });
await new Promise(r => setTimeout(r, 800));
mkdirSync(SITE + "_shots", { recursive: true });
const browser = await chromium.launch();
let failed = 0;
const fail = m => { console.error("FAIL", m); failed++; };
// Vercel's analytics script only exists on Vercel; Google Fonts may be offline in CI
const ignorable = u => u.includes("/_vercel/") || u.includes("fonts.g");

async function open(path, opts, name) {
  const page = await browser.newPage(opts);
  page.on("console", m => { if (m.type() === "error" && !/status of 404|fonts\.g|ERR_(NAME|INTERNET|TUNNEL|CONNECTION|PROXY)/.test(m.text())) fail(`${name} console: ${m.text()}`); });
  page.on("response", r => { if (r.status() >= 400 && !ignorable(r.url()) && !path.includes("404")) fail(`${name} ${r.status()} ${r.url()}`); });
  page.on("pageerror", e => fail(`${name} pageerror: ${e.message}`));
  await page.goto(base + path, { waitUntil: "load" });
  return page;
}
const scrollThrough = async page => {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo({ top: y, behavior: "instant" }); await new Promise(r => setTimeout(r, 60)); }
  });
  await page.waitForTimeout(900);
};

const runs = [
  ["phone", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ["small-phone", { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true }],
  ["desktop", { viewport: { width: 1280, height: 800 } }],
  ["phone-reduced-motion", { viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: "reduce" }],
];
for (const [name, opts] of runs) {
  const page = await open("/index.html", opts, name);
  const { width, height } = opts.viewport;
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (over > 0) fail(`${name}: horizontal overflow ${over}px`);

  const btn = await page.$eval("#hero-cta", b => b.getBoundingClientRect().bottom);
  if (name === "phone" && btn > height) fail(`${name}: start button below the fold (${Math.round(btn)}px)`);

  const noAlt = await page.$$eval("img:not([alt])", a => a.map(i => i.src));
  if (noAlt.length) fail(`${name}: images without alt: ${noAlt.join(", ")}`);

  const links = await page.$$eval("a[href]", as => [...new Set(as.map(a => a.getAttribute("href")))]);
  for (const raw of links) {
    if (raw.startsWith("#")) { if (!(await page.$(raw))) fail(`missing anchor ${raw}`); }
    else if (/^(mailto:|https?:)/.test(raw)) { /* external: checked by hand, not fetched */ }
    else { const r = await page.request.get(new URL(raw, base + "/").href); if (!r.ok()) fail(`dead link ${raw}`); }
  }
  const appLinks = await page.$$eval("[data-app]", as => as.map(a => a.href));
  if (!appLinks.every(h => h === "https://app.choochootraining.com/")) fail(`${name}: a start button does not point at APP_URL`);

  await page.screenshot({ path: `${SITE}_shots/${name}-top.png` });

  if (opts.isMobile) {
    const dockAt = async () => page.$eval("#dock", d => d.classList.contains("show"));
    if (await dockAt()) fail(`${name}: start bar shows while the hero button is on screen`);
    await page.evaluate(() => document.getElementById("how").scrollIntoView({ behavior: "instant" }));
    await page.waitForTimeout(500);
    if (!(await dockAt())) fail(`${name}: start bar missing mid-page`);
    await page.evaluate(() => document.querySelector("#founding .btn").scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForTimeout(500);
    if (await dockAt()) fail(`${name}: start bar covers the page while the ticket button is on screen`);
  }

  await scrollThrough(page);
  const hidden = await page.$$eval(".reveal:not(.in)", e => e.length);
  if (hidden) fail(`${name}: ${hidden} section(s) never revealed`);
  const fill = await page.$eval("[data-fill]", e => e.style.width);
  if (fill !== "37%") fail(`${name}: seat bar width is ${fill}`);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SITE}_shots/${name}.png`, fullPage: true });
  await page.close();
}

for (const path of ["/privacy.html", "/404.html"]) {
  const page = await open(path, { viewport: { width: 390, height: 844 } }, path);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (over > 0) fail(`${path}: horizontal overflow ${over}px`);
  await page.close();
}

await browser.close(); server.kill();
console.log(failed ? `${failed} problem(s)` : "all checks passed");
process.exit(failed ? 1 : 0);
