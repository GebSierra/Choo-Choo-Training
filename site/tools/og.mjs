// Makes assets/og.jpg (1200x630) from the hero art. Run: node tools/og.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }
const dir = fileURLToPath(new URL("..", import.meta.url));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(`<body style="margin:0;width:1200px;height:630px;background:#1A1440;color:#F3F0FF;font:800 64px/1.1 Arial Black,Impact,sans-serif;display:flex;align-items:center;gap:60px;padding:0 80px;box-sizing:border-box">
<div style="flex:1"><div style="color:#FFD15C;font-size:34px;margin-bottom:24px">Choo Choo Training</div>Hear your child read their first word this week.</div>
<img src="file://${dir}assets/railway.jpg" style="height:470px;border-radius:36px;box-shadow:0 0 0 6px #5B4BD6"></body>`);
await p.waitForTimeout(300);
await p.screenshot({ path: dir + "assets/og.jpg", type: "jpeg", quality: 85 });
await b.close();
