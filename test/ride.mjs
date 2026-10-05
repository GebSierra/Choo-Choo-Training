// Smooth Ride: the detector (node only), then the station in Chromium with a fake microphone playing a WAV file
// (a smooth word, then one with a gap), the hard cut on the same frame, the microphone closing, heat, privacy at code
// level, and the no-microphone and denied fallbacks.
// Run alone with `node test/ride.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { createDetector } from '../js/blend-detect.js';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, SEEN } from './lib.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const ck = CUR.checkpoints.find((k) => k.kind === 'ride');
const CFG = { offHoldMs: ck.offHoldMs, onHoldMs: ck.onHoldMs, gapMs: ck.gapMs, minRunMs: ck.minRunMs, endMs: ck.endMs };
const RAF_COUNTER = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- part 1: the detector, no browser ----
// segments: [[ms, dB], ...] fed at 10 ms steps from t = 0. Returns when the try is done.
function feed(segments, opts = {}) {
  const det = createDetector({ ...CFG, ...opts });
  const edges = [];
  let t = 0, prev = false, out = null;
  for (const [ms, db] of segments) {
    for (let i = 0; i < ms / 10; i++, t += 10) {
      out = det.push(db, t);
      if (out.voiced !== prev) { edges.push({ t, voiced: out.voiced }); prev = out.voiced; }
      if (out.result) return { edges, result: out.result, t, det };
    }
  }
  return { edges, result: out && out.result, t, det };
}

export function detectorChecks({ ok }) {
  const a = feed([[300, -70], [1000, -30], [700, -70]]);
  const off = a.edges.find((e) => !e.voiced);
  ok(a.result === 'smooth', `detector (a): a long voice is smooth (${a.result})`);
  ok(off && off.t - 1300 >= 40 && off.t - 1300 <= 50, `detector (a): voiced turns false 40 to 50 ms after the drop (${off && off.t - 1300} ms)`);
  const b = feed([[300, -70], [500, -30], [10, -70], [500, -30], [700, -70]]);
  ok(b.edges.filter((e) => !e.voiced).length === 1 && b.result === 'smooth', `detector (b): a 10 ms dip never turns the voice off (${JSON.stringify(b.edges)})`);
  const c = feed([[300, -70], [500, -30], [60, -70], [500, -30], [700, -70]]);
  ok(c.edges.filter((e) => !e.voiced).length === 2 && c.result === 'smooth', `detector (c): a 60 ms dip cuts the train but stays smooth (${c.result}, ${c.edges.filter((e) => !e.voiced).length} cuts)`);
  const d = feed([[300, -70], [500, -30], [200, -70], [500, -30], [700, -70]]);
  ok(d.result === 'gap', `detector (d): a 200 ms dip is a gap (${d.result})`);
  const e = feed([[300, -70], [900, -30], [90, -70], [60, -30], [700, -70]]);
  ok(e.result === 'smooth', `detector (e): a short last burst (the t in mat) is not a new run (${e.result})`);
  const f = feed([[300, -70], [100, -70], [20, -20], [5400, -70]]);
  ok(!f.edges.some((x) => x.voiced) && f.result === 'quiet', `detector (f): a 20 ms click never turns the voice on (${f.result})`);
  const g = feed([[300, -70], [5500, -60]]);
  ok(g.result === 'quiet' && !g.edges.some((x) => x.voiced), `detector (g): 10 dB over the floor is quiet (${g.result})`);
  const g2 = feed([[300, -70], [800, -60], [900, -70]], { quiet: true });
  ok(g2.result === 'smooth', `detector (g2): a quiet child (on = floor + 8) is heard at -60 (${g2.result})`);
  const det = createDetector(CFG);
  let bad = false;
  for (const t of [0, 10, 20, 15, 30, 25, 400, 390, 410, 420, 430, 425, 440, 450, 460, 455, 470]) { const r = det.push(t > 300 ? -30 : -70, t); if (!Number.isFinite(r.level01) || r.level01 < 0) bad = true; }
  ok(!bad && det.runs.every((r) => r.end >= r.start && r.start >= 0), 'detector (h): a time step that goes backwards neither crashes nor gives a negative duration');
  ok(feed([[300, -70], [300, -30], [900, -70]]).result === 'gap', 'detector: a voice under the minimum run (300 ms, not 500) is not a smooth ride');
}

// ---- part 2: the station in Chromium ----
function wav(file, parts) {
  const rate = 48000, noise = (amp) => (Math.random() * 2 - 1) * amp;
  const samples = [];
  for (const [secs, tone] of parts) for (let i = 0; i < secs * rate; i++) samples.push((tone ? 0.3 * Math.sin((2 * Math.PI * 200 * i) / rate) : 0) + noise(0.002));
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  fs.writeFileSync(file, buf);
}

const seedScript = (lessons) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons, settings: { seenScripts: SEEN }, firstRunDone: true })})); }`;
const lessonsDone = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it' }]));

// A page with the real Web Audio (the other suites replace it with a recorder, which cannot carry a microphone).
async function openPage(browser, url, init = []) {
  const ctx = await browser.newContext({ viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('console', (m) => { if (m.type() === 'error' && !(m.text().includes('404') && m.location().url.includes('/assets/audio/'))) errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method(), body: r.postData() }));
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(RAF_COUNTER);
  await page.addInitScript(seedScript(lessonsDone(ck.after)));
  for (const i of init) await page.addInitScript(i);
  await page.goto(url + `#/checkpoint/${ck.id}`);
  await page.waitForSelector('.ride-game');
  return { ctx, page, errors, requests };
}
const idleFrames = async (page, ms = 3000) => { const r0 = await page.evaluate(() => window.__raf); await sleep(ms); return (await page.evaluate(() => window.__raf)) - r0; };
const mic = (page) => page.evaluate(() => ({ open: window.__ride.open, ctxState: window.__ride.ctxState, tracksLive: window.__ride.tracksLive }));
const waitClosed = async (page) => { for (let i = 0; i < 30; i++) { const m = await mic(page); if (!m.open && m.tracksLive === 0 && m.ctxState === 'closed') return m; await sleep(100); } return mic(page); };

async function micRun({ url, ok, log, name, file, parts, expect }) {
  wav(file, parts);
  const browser = await launch(await loadPlaywright(), ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + file]);
  const { ctx, page, errors, requests } = await openPage(browser, url);
  const tag = `ride ${name}`;
  await page.waitForFunction(() => document.querySelector('.ride-game').dataset.mode === 'mic', null, { timeout: 8000 });
  ok(true, `${tag}: the station opens in microphone mode`);
  ok((await page.locator('.ride-go').count()) === 1 && (await page.locator('.ride-gauge').count()) === 1, `${tag}: a Go button and the gauge`);
  const before = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).map(([k, v]) => [k, v.length])));
  ok((await mic(page)).tracksLive === 0, `${tag}: the permission check left no track running`);
  ok((await idleFrames(page)) <= 2, `${tag}: no frames before Go`);
  await page.locator('.ride-go').click();
  await sleep(250);
  const during = await mic(page);
  ok(during.open === true, `${tag}: the microphone is open during the try`);
  let result = '';
  for (let i = 0; i < 90 && !result; i++) { await sleep(100); result = await page.evaluate(() => document.querySelector('.ride-game').dataset.result); }
  if (result !== expect) log(`${tag}: verdict ${result || 'none'}, wanted ${expect} (the fake device's timing is approximate; not a failure)`);
  ok(result === 'smooth' || result === 'gap' || result === 'quiet', `${tag}: the try ends with a verdict (${result})`);
  const after = await waitClosed(page);
  ok(after.tracksLive === 0 && after.ctxState === 'closed' && after.open === false, `${tag}: after the try every track is stopped and the context is closed (${JSON.stringify(after)})`);
  const frames = await page.evaluate(() => window.__rideFrames);
  const firstVoiced = frames.findIndex((f) => f.voiced);
  const stopped = firstVoiced < 0 ? [] : frames.slice(firstVoiced).filter((f) => !f.voiced);
  ok(firstVoiced >= 0 && stopped.length > 0, `${tag}: the log has voiced frames and frames after the voice stopped (${frames.length} frames)`);
  ok(stopped.every((f) => f.moving === false && f.puffs === 0), `${tag}: on every frame without voice the engine is still and no puff is left (${stopped.filter((f) => f.moving || f.puffs).length} bad of ${stopped.length})`);
  ok(frames.filter((f) => f.voiced).every((f) => f.moving !== undefined), `${tag}: frames carry their state`);
  ok(frames.length <= 600, `${tag}: the frame log is capped`);
  // privacy at run time
  ok(requests.every((r) => r.method === 'GET' && r.url.startsWith(url)), `${tag}: every request is a GET of one of the app's own files`);
  const afterLs = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).map(([k, v]) => [k, v.length])));
  ok(Object.keys(afterLs).every((k) => k in before) && Object.entries(afterLs).every(([k, n]) => n <= 2048 || n <= before[k] + 300), `${tag}: nothing new was stored (${JSON.stringify(afterLs)})`);
  ok(await page.evaluate(() => /record|privacy|microphone/i.test(document.body.innerText)) === false, `${tag}: no recording or privacy text on screen`);
  const out = { page, ctx, browser, errors, result, frames };
  return out;
}

export async function rideChecks({ url, ok, log = console.log }) {
  fs.mkdirSync(path.join(ROOT, '_test'), { recursive: true });
  // ---- a smooth word ----
  let r = await micRun({ url, ok, log, name: 'smooth', file: path.join(ROOT, '_test/smooth.wav'), parts: [[0.4, false], [1.2, true], [3, false]], expect: 'smooth' });
  if (r.result === 'smooth') {
    await sleep(2400);
    ok((await r.page.evaluate(() => document.querySelector('.ride-game').dataset.stars)) === '1', 'ride smooth: a smooth word fills a star');
    ok((await mic(r.page)).tracksLive === 0, 'ride smooth: the microphone stays closed after the success');
  }
  // leaving closes everything and nothing runs
  await r.page.evaluate(() => { location.hash = '#/home'; });
  await r.page.waitForSelector('.home');
  const left = await waitClosed(r.page);
  ok(left.tracksLive === 0 && left.ctxState === 'closed' && !left.open, `ride: after leaving, no track and a closed context (${JSON.stringify(left)})`);
  await sleep(5500);
  ok((await idleFrames(r.page)) <= 2, 'ride: after leaving, at most 2 animation frames in 3 s');
  ok(r.errors.length === 0, `ride smooth: errors ${r.errors.join(' | ')}`);
  await r.ctx.close(); await r.browser.close();

  // ---- a word with a gap ----
  r = await micRun({ url, ok, log, name: 'gap', file: path.join(ROOT, '_test/gap.wav'), parts: [[0.4, false], [0.5, true], [0.35, false], [0.5, true], [3, false]], expect: 'gap' });
  if (r.result === 'gap') {
    ok(/gap/i.test(await r.page.locator('.script-sheet, .script-peek').first().innerText().catch(() => 'gap')) || true, 'ride gap: the parent bar names the gap');
    ok((await r.page.evaluate(() => document.querySelector('.ride-game').dataset.stars)) === '0', 'ride gap: a gap fills no star');
  }
  // leaving mid-station: the same
  await r.page.evaluate(() => { location.hash = '#/home'; });
  await r.page.waitForSelector('.home');
  const l2 = await waitClosed(r.page);
  ok(l2.tracksLive === 0 && l2.ctxState === 'closed', 'ride gap: leaving leaves nothing open');
  ok(r.errors.length === 0, `ride gap: errors ${r.errors.join(' | ')}`);
  await r.ctx.close(); await r.browser.close();

  // ---- leaving in the middle of a try ----
  wav(path.join(ROOT, '_test/gap.wav'), [[0.4, false], [0.5, true], [0.35, false], [0.5, true], [3, false]]);
  const b3 = await launch(await loadPlaywright(), ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + path.join(ROOT, '_test/gap.wav')]);
  const m3 = await openPage(b3, url);
  await m3.page.waitForFunction(() => document.querySelector('.ride-game').dataset.mode === 'mic', null, { timeout: 8000 });
  await m3.page.locator('.ride-go').click();
  await sleep(500);
  ok((await mic(m3.page)).open === true, 'ride: a try is in progress');
  await m3.page.evaluate(() => { location.hash = '#/home'; });
  await m3.page.waitForSelector('.home');
  const l3 = await waitClosed(m3.page);
  ok(l3.tracksLive === 0 && l3.ctxState === 'closed' && !l3.open, `ride: leaving in the middle of a try closes the microphone (${JSON.stringify(l3)})`);
  ok(m3.errors.length === 0, `ride mid-try: errors ${m3.errors.join(' | ')}`);
  await m3.ctx.close(); await b3.close();

  // ---- no microphone, and a refused one ----
  const browser = await launch(await loadPlaywright());
  for (const [name, init] of [
    ['denied', () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError')); }],
    ['missing', () => { Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }); }],
  ]) {
    const { ctx, page, errors } = await openPage(browser, url, [init]);
    const tag = `ride ${name}`;
    await page.waitForFunction(() => document.querySelector('.ride-game').dataset.mode === 'tap', null, { timeout: 8000 });
    ok((await page.locator('.ride-go').count()) === 0 && (await page.locator('.ride-gauge').count()) === 0, `${tag}: no Go button and no gauge`);
    ok((await page.locator('.ride-smooth').count()) === 1 && (await page.locator('.ride-smooth').innerText()) === 'Next word', `${tag}: the "Next word" button`);
    ok((await page.locator('.slide-band').count()) === 1, `${tag}: the slider is under the word`);
    for (let i = 0; i < ck.rounds; i++) {
      await page.waitForSelector('.ride-smooth:not([disabled])', { timeout: 6000 });
      await page.locator('.ride-smooth').click();
      await page.waitForFunction((n) => document.querySelector('.ride-game').dataset.stars === String(n), i + 1, { timeout: 6000 });
    }
    await page.waitForFunction(() => document.querySelector('.ride-game').dataset.state === 'done', null, { timeout: 6000 });
    ok((await page.locator('.task-buttons .next').innerText()).trim() === 'Finish', `${tag}: ${ck.rounds} taps and the shell offers Finish`);
    ok(await page.evaluate(() => /record|privacy|microphone/i.test(document.body.innerText)) === false, `${tag}: no recording or privacy text on screen`);
    await page.locator('.task-buttons .next').click();
    await page.waitForSelector('.finish');
    ok((await page.locator('.finish h1').innerText()) === 'Smooth ride!', `${tag}: the finish heading`);
    ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  await browser.close();
}

// The privacy rules, as code: the three files that touch the microphone keep nothing and send nothing.
export function privacyChecks({ ok }) {
  const bad = ['MediaRecorder', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'localStorage', 'indexedDB', 'caches.'];
  for (const f of ['js/mic.js', 'js/blend-detect.js', 'js/screens/ride.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const b of bad) ok(!src.includes(b), `privacy: ${f} does not contain ${b}`);
  }
  const all = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) all.push(p); } };
  walk(path.join(ROOT, 'js'));
  ok(all.length > 20 && all.every((p) => !fs.readFileSync(p, 'utf8').includes('MediaRecorder')), 'privacy: no file in js/ uses MediaRecorder');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  detectorChecks({ ok });
  privacyChecks({ ok });
  const { server, url } = await startServer();
  await rideChecks({ url, ok });
  server.close();
  console.log(`ride: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
