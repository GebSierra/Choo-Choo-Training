// Read It Again (checkpoint r1, kind "reread"; it replaced Smooth Ride): the story data, the screen (listen, then the child reads one
// sentence at a time, the grown-up taps Read it! and a wagon is pulled in), Again, the finish and the saved result, fit at the three phone
// sizes, heat, and the rule that nothing in the app listens or records. Run alone with `node test/read-again.mjs [--shots]`;
// shots go to docs/screenshots/read-again/.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN } from './lib.mjs';
import { lettersOfSounds, ORDER_SOUNDS, isReadable } from '../js/order.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const ck = CUR.checkpoints.find((k) => k.id === 'r1');
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/read-again');
const SIZES = [{ name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 }, { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 }, { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 }];
const RAF_COUNTER = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seed = (n) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it' }])), settings: { seenScripts: SEEN }, firstRunDone: true })})); }`;
const shot = async (page, vp, name) => { if (!SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, `${name}-${vp.name}.png`) }); };

// ---- the data, no browser ----
export function dataChecks({ ok }) {
  ok(ck && ck.kind === 'reread' && ck.title === 'Read It Again' && ck.after === 4, 'data: r1 is the Read It Again stop after lesson 4 (the id r1 is kept so saved results stay valid)');
  ok(Array.isArray(ck.story) && ck.story.length >= 2 && ck.story.length <= 4, `data: the story has 2 to 4 sentences (${ck.story.length})`);
  const taught = lettersOfSounds(ORDER_SOUNDS.slice(0, ck.after));
  const sight = (ck.sight || []).map((w) => w.toLowerCase());
  const words = ck.story.join(' ').toLowerCase().replace(/[.!?,]/g, '').split(/\s+/);
  const bad = words.filter((w) => !sight.includes(w) && !isReadable(w, taught));
  ok(bad.length === 0, `data: every word is spelt with the letters taught by lesson 4 or is a heart word the app already uses (${bad.join(', ') || 'none left over'})`);
  ok(ck.story.every((s) => s.split(' ').length <= 6), 'data: every sentence is short (6 words or fewer)');
  ok(!('words' in ck) && !('offHoldMs' in ck) && !('rounds' in ck), 'data: no microphone timings are left on the stop');
  ok(!CUR.checkpoints.some((k) => k.kind === 'ride') && !(CUR.games && CUR.games.ride), 'data: no ride stop and no ride game text anywhere');
  const book1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/books/book-1.json'), 'utf8'));
  ok(sight.every((w) => (book1.sight || []).map((x) => x.toLowerCase()).includes(w)), 'data: the heart words are the ones Story 1 already teaches');
}

// ---- nothing listens or records ----
export function noMicChecks({ ok }) {
  for (const f of ['js/mic.js', 'js/blend-detect.js', 'js/screens/ride.js']) ok(!fs.existsSync(path.join(ROOT, f)), `no mic: ${f} is deleted`);
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  ok(!/mic\.js|blend-detect|ride\.js/.test(sw) && /screens\/reread\.js/.test(sw) && /screens\/review\.js/.test(sw), 'no mic: sw.js lists neither mic.js, blend-detect.js nor ride.js, and lists reread.js and review.js');
  const all = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|html)$/.test(e.name)) all.push(p); } };
  walk(path.join(ROOT, 'js')); all.push(path.join(ROOT, 'index.html'));
  const hits = all.filter((p) => /getUserMedia|MediaRecorder|mediaDevices|webkitSpeechRecognition|SpeechRecognition|AudioWorklet|createMediaStreamSource/.test(fs.readFileSync(p, 'utf8')));
  ok(all.length > 30 && hits.length === 0, `no mic: nothing under js/ or index.html asks for a microphone or recognises speech (${hits.map((p) => path.relative(ROOT, p)).join(', ') || 'none'})`);
  const css = fs.readFileSync(path.join(ROOT, 'css/app.css'), 'utf8');
  ok(!/ride-intro|ride-go|ride-gauge|gauge-needle/.test(css), 'no mic: the ride styles are gone from the stylesheet');
}

const rect = (page, sel, i = 0) => page.evaluate(([s, k]) => { const e = document.querySelectorAll(s)[k]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, [sel, i]);

async function open(browser, url, vp, route = `#/checkpoint/r1`, init = []) {
  const made = await newPage(browser, vp);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(RAF_COUNTER);
  await made.page.addInitScript(`window.__gum = 0; if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { window.__gum++; return Promise.reject(new Error('no')); };`);
  await made.page.addInitScript(seed(ck.after));
  for (const i of init) await made.page.addInitScript(i);
  await made.page.goto(url + route);
  await made.page.waitForSelector('.reread');
  return made;
}
const q = (page, sel) => page.locator(sel);
const data = (page, k) => page.evaluate((key) => document.querySelector('.reread').dataset[key], k);

export async function readAgainChecks({ browser, url, ok }) {
  // ---- the whole flow on the phone ----
  const vp = SIZES[1];
  const made = await open(browser, url, vp);
  const { page, errors } = made;
  await page.waitForTimeout(700);
  ok((await q(page, '.task-head h1').innerText()) === 'Read It Again', 'screen: titled Read It Again');
  ok((await q(page, '.ra-sentence').allInnerTexts()).join('|') === ck.story.join('|'), 'screen: the sentences are the story, in order');
  ok((await data(page, 'phase')) === 'listen' && (await q(page, '.ra-turn').isVisible()), 'screen: it starts with the grown-up reading (phase listen) and a "Your child reads" button');
  ok((await q(page, '.ra-read').evaluateAll((bs) => bs.every((b) => b.disabled || getComputedStyle(b).visibility === 'hidden'))), 'screen: no Read it! can be tapped before the child reads');
  ok((await q(page, '.script-first').innerText()).length > 0 && (await q(page, '.script-first').innerText()).length <= 28, `screen: the gist fits the bar (${await q(page, '.script-first').innerText()})`);
  ok(await page.evaluate(() => new Set(document.querySelectorAll('.ra-wagon.on')).size === 0), 'screen: no wagon has a star yet');
  await shot(page, vp, '01-start');
  const x0 = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.ra-train')).transform).m41);
  const r0 = await rect(page, '.ra-engine');
  await q(page, '.ra-turn').click();
  await page.waitForTimeout(250);
  ok((await data(page, 'phase')) === 'read' && !(await q(page, '.ra-turn').isVisible()), 'screen: "Your child reads" moves to the reading phase');
  const enabled = await q(page, '.ra-read').evaluateAll((bs) => bs.map((b) => !b.disabled));
  ok(enabled.join() === 'true,false,false', `screen: only the first sentence's Read it! is live (${enabled})`);
  ok((await q(page, '.script-first').innerText()).length <= 28, 'screen: the reading gist fits the bar');
  // one sentence at a time
  const steps = [];
  for (let i = 0; i < ck.story.length; i++) {
    await q(page, `.ra-row[data-n="${i + 1}"] .ra-read`).click();
    await page.waitForTimeout(1100);
    steps.push({ read: await data(page, 'read'), on: await page.locator('.ra-wagon.on').count(), x: await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.ra-train')).transform).m41), dots: await page.locator('.dots .dot.past').count() });
    if (i === 1) await shot(page, vp, '02-two-wagons');
  }
  ok(steps.every((s, i) => Number(s.read) === i + 1 && s.on === i + 1), `flow: each Read it! lights one more wagon (${JSON.stringify(steps.map((s) => [s.read, s.on]))})`);
  ok(steps.every((s, i) => s.x > (i ? steps[i - 1].x : x0) + 20), `flow: the train is pulled forward every time (${steps.map((s) => Math.round(s.x))})`);
  ok(steps[steps.length - 1].dots >= ck.story.length - 1, 'flow: the progress dots follow');
  const r1 = await rect(page, '.ra-engine');
  ok(r1.x > r0.x + 40, `flow: the engine ends further along the track (${Math.round(r0.x)} to ${Math.round(r1.x)})`);
  ok((await data(page, 'phase')) === 'done', 'flow: after the last sentence the story is done');
  await page.waitForTimeout(1500);
  ok((await q(page, '.btn.next').innerText()).includes('Finish'), 'flow: Skip became Finish when the story was read');
  await shot(page, vp, '03-end');
  // Again starts the reading over
  await q(page, '.btn.again').click();
  await page.waitForTimeout(500);
  ok((await data(page, 'read')) === '0' && (await data(page, 'phase')) === 'read' && (await page.locator('.ra-wagon.on').count()) === 0, 'again: the wagons go back and the reading starts over');
  ok((await q(page, '.ra-row[data-n="1"] .ra-read').isEnabled()), 'again: the first Read it! is live again');
  for (let i = 0; i < ck.story.length; i++) { await q(page, `.ra-row[data-n="${i + 1}"] .ra-read`).click(); await page.waitForTimeout(150); }
  await page.waitForTimeout(1600);
  ok((await data(page, 'phase')) === 'done', 'again: the story can be read through a second time');
  // finish: the result is saved only by the grown-up's Yes
  await q(page, '.btn.next').click();
  await page.waitForSelector('.finish');
  ok((await q(page, '.finish h1').innerText()) === 'You read it again!', 'finish: the heading');
  ok(await page.evaluate(() => !JSON.parse(localStorage.getItem('reading.v1')).checkpoints || !(JSON.parse(localStorage.getItem('reading.v1')).checkpoints.r1 || {}).result), 'finish: nothing is saved before the grown-up says yes');
  await page.waitForTimeout(1700);
  await q(page, '.got').click(); // one tap (1.9.47): Yes saves and goes on
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).checkpoints.r1.result === 'got-it'), 'finish: the grown-up\'s Yes saves r1 as got-it');
  const text = await page.evaluate(() => document.body.innerText);
  ok(!/record|privacy|microphone|listen(ing)? to your child/i.test(text), 'text: no recording, privacy or microphone wording on screen');
  ok((await page.evaluate(() => window.__gum)) === 0, 'no mic: getUserMedia was never called');
  ok(errors.length === 0, `no errors ${errors.join(' | ')}`);
  await made.ctx.close();

  // ---- fit and targets at the three sizes, and heat ----
  for (const v of SIZES) {
    const m = await open(browser, url, v);
    const p = m.page;
    await p.waitForTimeout(700);
    const fit = async (tag) => {
      const r = await p.evaluate(() => {
        const out = { scrollX: document.documentElement.scrollWidth > innerWidth + 1, small: [], outside: [], cut: [] };
        for (const b of document.querySelectorAll('.reread button, .task-foot button, .task-head button')) {
          if (b.hidden || getComputedStyle(b).visibility === 'hidden' || getComputedStyle(b).display === 'none') continue;
          const k = b.getBoundingClientRect();
          if (!k.width) continue;
          if (k.height < 47.5 || k.width < 47.5) out.small.push((b.className || b.textContent) + ' ' + Math.round(k.width) + 'x' + Math.round(k.height));
          if (k.left < -0.5 || k.right > innerWidth + 0.5 || k.top < -0.5 || k.bottom > innerHeight + 0.5) out.outside.push(b.className + ' ' + [k.left, k.top, k.right, k.bottom].map(Math.round));
        }
        const page = document.querySelector('.ra-page').getBoundingClientRect(), list = document.querySelector('.ra-list');
        out.listFits = list.scrollHeight <= list.clientHeight + 1;
        for (const s of document.querySelectorAll('.ra-sentence')) { const k = s.getBoundingClientRect(); if (k.bottom > page.bottom + 1 || k.right > page.right + 1) out.cut.push(s.textContent); }
        const e = document.querySelector('.ra-scene').getBoundingClientRect(), t = document.querySelector('.ra-engine').getBoundingClientRect();
        out.engineInScene = t.left >= e.left - 1 && t.right <= e.right + 1;
        return out;
      });
      ok(!r.scrollX, `${v.name} ${tag}: no sideways page scroll`);
      ok(r.small.length === 0, `${v.name} ${tag}: every button is 48 px or more (${r.small.join('; ') || 'ok'})`);
      ok(r.outside.length === 0, `${v.name} ${tag}: every button is on screen (${r.outside.join('; ') || 'ok'})`);
      ok(r.listFits && r.cut.length === 0, `${v.name} ${tag}: the sentences fit the page without cutting (${r.cut.join('; ')})`);
      ok(r.engineInScene, `${v.name} ${tag}: the engine stays in the scene`);
    };
    await fit('listen');
    await shot(p, v, '01-start');
    await q(p, '.ra-turn').click();
    await p.waitForTimeout(300);
    await fit('read');
    // a tap at the centre of the live Read it! lands on it
    const b = await rect(p, '.ra-row[data-n="1"] .ra-read');
    ok(await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && !!e.closest('.ra-read'); }, [b.x + b.w / 2, b.y + b.h / 2]), `${v.name}: a tap on Read it! lands on the button`);
    await q(p, '.ra-row[data-n="1"] .ra-read').click(); await p.waitForTimeout(1100);
    await q(p, '.ra-row[data-n="2"] .ra-read').click(); await p.waitForTimeout(1100);
    await fit('two wagons');
    await shot(p, v, '02-two-wagons');
    await q(p, '.ra-row[data-n="3"] .ra-read').click(); await p.waitForTimeout(2200);
    await fit('end');
    await shot(p, v, '03-end');
    // heat: nothing runs while the story stands finished (no rAF, no looping animation)
    const raf0 = await p.evaluate(() => window.__raf); await sleep(3000);
    const frames = (await p.evaluate(() => window.__raf)) - raf0;
    const loops = await p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming().iterations === Infinity).length);
    ok(frames <= 2 && loops === 0, `${v.name}: idle heat: ${frames} frames in 3 s, ${loops} endless animations`);
    ok(m.errors.length === 0, `${v.name}: errors ${m.errors.join(' | ')}`);
    await m.ctx.close();
  }

  // ---- reduced motion: no transitions, the same flow ----
  const rm = await newPage(browser, SIZES[0], { reducedMotion: 'reduce' });
  await rm.page.addInitScript(SPEECH_STUB); await rm.page.addInitScript(seed(ck.after));
  await rm.page.goto(url + '#/checkpoint/r1'); await rm.page.waitForSelector('.reread');
  await rm.page.waitForTimeout(500);
  await q(rm.page, '.ra-turn').click();
  for (let i = 0; i < ck.story.length; i++) await q(rm.page, `.ra-row[data-n="${i + 1}"] .ra-read`).click();
  await rm.page.waitForTimeout(400);
  ok((await data(rm.page, 'phase')) === 'done' && parseFloat(await rm.page.evaluate(() => getComputedStyle(document.querySelector('.ra-train')).transitionDuration)) <= 0.001, 'reduced motion: the story completes and the train does not glide');
  ok(rm.errors.length === 0, `reduced motion: errors ${rm.errors.join(' | ')}`);
  await rm.ctx.close();

  // ---- the stop holds the train, then lets it go ----
  const hold = await newPage(browser, SIZES[1]);
  await hold.page.addInitScript(SPEECH_STUB); await hold.page.addInitScript(seed(ck.after));
  await hold.page.goto(url + '#/home');
  await hold.page.waitForSelector('.stone, .station-btn', { state: 'attached' });
  await hold.page.waitForTimeout(900);
  const label = await hold.page.evaluate(() => [...document.querySelectorAll('.stone, .station-btn')].map((b) => b.getAttribute('aria-label')));
  ok(label.some((l) => /^Read It Again/.test(l)) && !label.some((l) => /Smooth/.test(l)), `home: the stop is called Read It Again and no Smooth Ride is left (${label.join(' | ')})`);
  await hold.ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  dataChecks({ ok });
  noMicChecks({ ok });
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await readAgainChecks({ browser, url, ok });
  await browser.close();
  server.close();
  console.log(`read-again: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
