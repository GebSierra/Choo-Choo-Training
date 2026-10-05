// Round 3 (lessons 4 to 13: i t p n f d h g b l): the glyphs, Letter Writing for every letter, the parent scripts and the pictures of every lesson.
// Run alone with `node test/round3.mjs`, or as part of test/smoke.mjs. Data rules live in check-content.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { audit } from './audit.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN, DONE_JSON } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';
import { isIsolated } from './check-content.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const SEED = `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:${DONE_JSON},settings:${JSON.stringify({ seenScripts: SEEN })},firstRunDone:true}))`;
const NEW = CUR.lessons.filter((l) => l.number >= 4);
const idx = (L, type) => tasksFor(L).find((t) => t.type === type).index;

async function open(browser, url, vp, route) {
  const made = await newPage(browser, vp);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(SEED);
  await made.page.goto(url + route);
  return made;
}

// The shapes: every glyph's declared extent is its real extent (so no viewBox clips a tall or tailed letter), the start dots
// sit on the first point of their stroke, the strokes keep to the 100 box, and tall letters stand clearly above the x-height.
export async function glyphChecks({ browser, url, ok }) {
  const { ctx, page, errors } = await open(browser, url, VIEWPORTS[0], '#/home');
  await page.waitForSelector('.home');
  const r = await page.evaluate(async () => {
    const g = await import('/js/glyphs.js');
    const out = {};
    for (const [ch, def] of Object.entries(g.GLYPHS)) {
      const svg = g.glyphSvg(ch, { color: '#000' });
      document.body.append(svg);
      const boxes = [...svg.querySelectorAll('path')].map((p) => p.getBBox());
      svg.remove();
      const x0 = Math.min(...boxes.map((b) => b.x)), x1 = Math.max(...boxes.map((b) => b.x + b.width));
      const y0 = Math.min(...boxes.map((b) => b.y)), y1 = Math.max(...boxes.map((b) => b.y + b.height));
      const view = g.glyphView(ch);
      const starts = def.strokes.map((s) => s.start);
      const first = def.strokes.map((s) => { const m = s.d.match(/^M\s*([\d.]+)[ ,]([\d.]+)/); return [Number(m[1]), Number(m[2])]; });
      out[ch] = { x0, x1, y0, y1, minX: def.minX, maxX: def.maxX, minY: def.minY, maxY: def.maxY, top: view.top, bottom: view.bottom, strokes: def.strokes.length, starts, first, half: g.STROKE_WIDTH / 2 };
    }
    return out;
  });
  for (const [ch, g] of Object.entries(r)) {
    ok(Math.abs(g.y0 - g.minY) < 1.6 && Math.abs(g.y1 - g.maxY) < 1.6, `glyph ${ch}: declared height ${g.minY}-${g.maxY} is the real one (${g.y0.toFixed(1)}-${g.y1.toFixed(1)})`);
    ok(g.x0 >= g.minX - 0.5 && g.x1 <= g.maxX + 0.5, `glyph ${ch}: the strokes stay inside minX ${g.minX} and maxX ${g.maxX} (${g.x0.toFixed(1)}-${g.x1.toFixed(1)})`);
    ok(g.y0 - g.half >= g.top && g.y1 + g.half <= g.bottom, `glyph ${ch}: the box ${g.top}-${g.bottom} holds the whole stroke, so nothing is clipped`);
    ok(g.starts.every((s, i) => Math.hypot(s[0] - g.first[i][0], s[1] - g.first[i][1]) < 3.5), `glyph ${ch}: every start dot sits at the start of its stroke`);
  }
  const tall = 'dtfhbl', tail = 'gp';
  for (const ch of tall) if (r[ch]) ok(r[ch].minY <= 22, `glyph ${ch}: stands well above the x-height (top ${r[ch].minY})`);
  for (const ch of tail) if (r[ch]) ok(r[ch].maxY >= 90, `glyph ${ch}: has a tail below the baseline (bottom ${r[ch].maxY})`);
  ok(r.d && r.a && r.d.minY <= r.a.minY - 20, 'glyph d is clearly taller than our a, so the two are never mixed up');
  if (r.b) ok(r.b.starts[1][0] < 40 && r.d.starts[1][0] > 55, 'glyph b has its stem on the left and d on the right (mirror images)');
  ok(r.i && r.i.strokes === 2, 'glyph i: a stem and a dot as a second stroke');
    for (const l of CUR.lessons) ok(!!r[l.sound], `a glyph exists for the taught letter ${l.sound}`);
  ok(errors.length === 0, 'glyphs: errors ' + errors.join(' | '));
  await ctx.close();
}

// Letter Writing for every letter: the guide fits the pad whole (nothing clipped), a finger draws, Show me finishes, Clear wipes.
export async function traceChecks({ browser, url, ok }) {
  for (const vp of [VIEWPORTS[0], VIEWPORTS[1], VIEWPORTS[2]]) {
    const { ctx, page, errors } = await open(browser, url, vp, '#/home');
    await page.waitForSelector('.home');
    for (const L of CUR.lessons) {
      if (vp.name !== 'pixel7' && ![4, 6, 7, 8, 10, 13].includes(L.number)) continue; // d g i p and the last on the other viewports
      await page.evaluate((r) => { location.hash = r; }, `#/lesson/${L.number}/task/${idx(L, 'writing')}`);
      await page.waitForSelector('.screen:not(.leaving) .tp-ink');
      await page.waitForTimeout(700);
      const tag = `${vp.name} L${L.number} (${L.sound}) Letter Writing`;
      const m = await page.evaluate(() => {
        const g = document.querySelector('.screen:not(.leaving) .tp-guide'), c = g.getContext('2d'), w = g.width, h = g.height;
        const d = c.getImageData(0, 0, w, h).data;
        let x0 = w, x1 = 0, y0 = h, y1 = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        return { w, h, x0, x1, y0, y1 };
      });
      ok(m.x0 > 1 && m.y0 > 1 && m.x1 < m.w - 2 && m.y1 < m.h - 2 && m.x1 > m.x0 && m.y1 > m.y0, `${tag}: the whole guide fits inside the pad (${m.x0}-${m.x1} of ${m.w}, ${m.y0}-${m.y1} of ${m.h})`);
      ok(m.y1 - m.y0 > m.h * 0.45, `${tag}: the guide fills at least half the pad's height (${m.y1 - m.y0} of ${m.h})`);
      if (vp.name === 'pixel7' || L.number === 8) {
        const pb = await page.locator('.screen:not(.leaving) .tp-ink').boundingBox();
        await page.mouse.move(pb.x + pb.width * 0.5, pb.y + pb.height * 0.3);
        await page.mouse.down();
        for (let i = 0; i <= 8; i++) await page.mouse.move(pb.x + pb.width * 0.5, pb.y + pb.height * (0.3 + i * 0.05));
        await page.mouse.up();
        const ink = () => page.evaluate(() => { const c = document.querySelector('.screen:not(.leaving) .tp-ink'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
        ok((await ink()) > 200, `${tag}: a finger draws on the pad`);
        await page.locator('.screen:not(.leaving) .writing-buttons .btn').nth(1).click(); // Show me
        await page.waitForFunction(() => !document.querySelector('.screen:not(.leaving) .writing-buttons .btn:nth-child(2)').disabled, null, { timeout: 15000 });
        ok(true, `${tag}: Show me walks every stroke and ends`);
        await page.locator('.screen:not(.leaving) .writing-buttons .btn').first().click(); // Clear
        ok((await ink()) === 0, `${tag}: Clear wipes the ink`);
      }
      const p = await audit(page, tag);
      ok(p.length === 0, p.join(' | '));
    }
    ok(errors.length === 0, `${vp.name} trace: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// What a parent hears when the script is read aloud, for every task of every new lesson: never a single letter or a run of
// one letter, never a clipped sound stretched, and with the sounds off (the default) the sentences that hold a sound are left out.
export async function scriptChecks({ browser, url, ok }) {
  const clipped = Object.values(CUR.sounds).filter((s) => s.hold === false).map((s) => s.glyph);
  for (const playSounds of [false, true]) {
    const made = await newPage(browser, VIEWPORTS[2]);
    const { page, errors } = made;
    await page.addInitScript(SPEECH_STUB);
    await page.addInitScript(SEED.replace('settings:{', `settings:{playSounds:${playSounds},`));
    await page.goto(url + '#/home');
    await page.waitForSelector('.home');
    const spokenAll = [];
    for (const L of NEW) {
      for (const t of tasksFor(L)) {
        await page.evaluate((r) => { location.hash = r; }, `#/lesson/${L.number}/task/${t.index}`);
        await page.waitForFunction((r) => location.hash === r && document.querySelector('.screen:not(.leaving) .script-bar') && !document.querySelector('.screen.leaving'), `#/lesson/${L.number}/task/${t.index}`);
        await page.waitForTimeout(120);
        await page.evaluate(() => { window.__events.length = 0; });
        await page.locator('.screen:not(.leaving) .script-bar button[aria-label="Hear the parent script"]').first().click();
        await page.waitForTimeout(500);
        const ev = await page.evaluate(() => window.__events.slice());
        for (const e of ev) if (e.type === 'tts') spokenAll.push([`L${L.number} ${t.type}`, e.text]);
        // Sounds off: nothing but the parent's framing sentences, so no clip plays and no sound text is spoken.
        if (!playSounds) ok(ev.every((e) => e.type === 'tts'), `L${L.number} ${t.type}: with sounds off the script plays no clip`);
        if (playSounds) ok(ev.every((e) => e.type !== 'clip' || /^[a-z]\.(mp3|webm)$/.test(e.src)), `L${L.number} ${t.type}: any clip is a single sound's file`);
      }
    }
    ok(spokenAll.length > 20, `scripts read aloud (${playSounds ? 'sounds on' : 'sounds off'}): ${spokenAll.length} spoken lines collected`);
    for (const [where, text] of spokenAll) {
      ok(!isIsolated(text), `${where}: "${text}" is not a single letter or a run of one letter`);
      ok(!/(^|\s)[a-z]-/.test(text) || /\b(ex|e)-/i.test(text), `${where}: "${text}" holds a written sound (t-) that must not go to text to speech`);
      for (const k of clipped) ok(!new RegExp(`${k}{3}`, 'i').test(text), `${where}: "${text}" stretches the clipped sound ${k}`);
    }
    ok(errors.length === 0, `scripts: errors ${errors.join(' | ')}`);
    await made.ctx.close();
  }
}

// Every picture of every new lesson loads, in New Letter, Saying Sounds (picture word) and Quick Check, and the screens audit clean.
export async function pictureChecks({ browser, url, ok }) {
  const { ctx, page, errors } = await open(browser, url, VIEWPORTS[2], '#/home');
  await page.waitForSelector('.home');
  for (const L of NEW) {
    for (const type of ['newLetter', 'check']) {
      await page.evaluate((r) => { location.hash = r; }, `#/lesson/${L.number}/task/${idx(L, type)}`);
      await page.waitForFunction((r) => location.hash === r && document.querySelector('.screen:not(.leaving) .task-stage') && !document.querySelector('.screen.leaving'), `#/lesson/${L.number}/task/${idx(L, type)}`);
      await page.waitForTimeout(500);
      const tag = `L${L.number} ${type}`;
      const p = await audit(page, tag);
      ok(p.length === 0, p.join(' | '));
      if (type === 'newLetter') {
        const n = await page.locator('.screen:not(.leaving) .word-tile img').count();
        ok(n === CUR.sounds[L.sound].words.length, `${tag}: ${n} picture tiles for ${CUR.sounds[L.sound].words.length} words`);
        const labels = await page.locator('.screen:not(.leaving) .word-tile .word').allInnerTexts();
        ok(labels.length === n, `${tag}: every tile has its word`);
      } else {
        const n = await page.locator('.screen:not(.leaving) .opt-card').count();
        ok(n === 3, `${tag}: three choices (${n})`);
      }
    }
  }
  ok(errors.length === 0, 'pictures: errors ' + errors.join(' | '));
  await ctx.close();
}

export async function round3Checks({ browser, url, ok }) {
  await glyphChecks({ browser, url, ok });
  await traceChecks({ browser, url, ok });
  await scriptChecks({ browser, url, ok });
  await pictureChecks({ browser, url, ok });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  const only = process.argv[2];
  if (only) await { glyphs: glyphChecks, trace: traceChecks, scripts: scriptChecks, pictures: pictureChecks }[only]({ browser, url, ok });
  else await round3Checks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`round3: ${checks - failures}/${checks} checks passed`);
  if (failures) process.exit(1);
}
