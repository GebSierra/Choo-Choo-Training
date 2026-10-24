// No sound plays on its own (owner 2026-10-24): with the default settings (auto-speak off, recorded sounds on), opening any lesson task,
// review/tricky stop task, and pressing the screen's own Next word / Again / round buttons must never play a clip or text-to-speech.
// Sound only comes when the grown-up taps a speaker. Run: node test/no-autoplay.mjs
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, DONE_JSON } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const SEED = `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:${DONE_JSON},settings:${JSON.stringify({ seenScripts: SEEN, playSounds: true, migrated1912: true, speak0: true, layoutA: true, heartA: true, placementOffered: true })},firstRunDone:true,meetDue:false}))`;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL: ' + m); } };

const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());
const { page } = await newPage(browser, { name: 'phone', width: 390, height: 844, deviceScaleFactor: 1 });
await page.addInitScript(SPEECH_STUB);
await page.addInitScript(SEED);
await page.goto(url + '#/home');
await page.waitForTimeout(800);

const routes = [];
for (const L of CUR.lessons) for (const t of tasksFor(L)) routes.push([`#/lesson/${L.number}/task/${t.index}`, `L${L.number} ${t.type}`]);
for (const k of CUR.checkpoints.filter((c) => c.kind === 'review' || c.kind === 'contrast')) for (let i = 0; i < 5; i++) routes.push([`#/checkpoint/${k.id}/task/${i}`, `${k.id} task ${i}`]);

const sounds = () => page.evaluate(() => window.__events.filter((e) => e.type === 'clip' || e.type === 'tts').map((e) => `${e.type}:${e.src || e.text}`));
const clear = () => page.evaluate(() => { window.__events.length = 0; });
// the screen's own buttons that move on without asking for sound (never the speaker buttons)
const PRESS = ['.btn.again', 'button:has-text("Next word")'];

for (const [r, name] of routes) {
  await clear();
  await page.evaluate((h) => { location.hash = h; }, r);
  const there = await page.waitForFunction((h) => location.hash === h && document.querySelector('.screen:not(.leaving) .task-stage'), r, { timeout: 4000 }).then(() => true, () => false);
  if (!there) continue; // past the end of a stop, or a task that opens on its own card
  await page.waitForTimeout(900);
  for (const sel of PRESS) {
    const b = page.locator(`.screen:not(.leaving) ${sel}`).first();
    if (await b.count() && await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(500); }
  }
  const s = await sounds();
  ok(s.length === 0, `${name}: nothing plays on its own (${s.slice(0, 4).join(' | ')})`);
}
await browser.close(); server.close();
console.log(`no-autoplay: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
