// Makes assets/og.jpg (1200x630) from tools/og.html, using the site's own fonts and art. Run: node tools/og.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }
const dir = fileURLToPath(new URL("..", import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto("file://" + dir + "tools/og.html");
await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
await p.screenshot({ path: dir + "assets/og.jpg", type: "jpeg", quality: 85 });
await b.close();
