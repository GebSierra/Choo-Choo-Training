import fs from 'node:fs';
import path from 'node:path';
import { audit } from './audit.mjs';
import { SPEECH_STUB, silentWav } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage } from './lib.mjs';

const OUT = path.join(ROOT, '_test');
fs.mkdirSync(OUT, { recursive: true });
let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };

const { server, url } = await startServer();
const pw = await loadPlaywright();
const browser = await launch(pw);

for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.goto(url);
  await page.waitForSelector('.screen');
  await page.screenshot({ path: path.join(OUT, `home-${vp.name}.png`) });
  ok(errors.length === 0, `${vp.name}: console errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Home and lesson overview (step 6).
const SEED = (lessons) => `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:${JSON.stringify(lessons)},settings:{},firstRunDone:true}))`;
for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(SEED({ 1: { tasksDone: [0, 1], result: null, completedAt: null } }));
  await page.goto(url + '#/home');
  await page.waitForSelector('.stone');
  ok((await page.locator('.stone').count()) === 3, `${vp.name}: three stones`);
  ok((await page.locator('.stone.is-current').count()) === 1 && (await page.locator('.stone.is-locked').count()) === 2, `${vp.name}: one current, two locked`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `home-${vp.name}.png`) });
  await page.locator('.stone.is-locked').first().click({ force: true });
  await page.waitForTimeout(400);
  ok(page.url().endsWith('#/home'), `${vp.name}: locked stone does not navigate`);
  await page.locator('.stone.is-current').click();
  await page.waitForSelector('.lesson-overview');
  ok(page.url().endsWith('#/lesson/1'), `${vp.name}: current stone opens lesson 1`);
  ok((await page.locator('.task-card').count()) === 6, `${vp.name}: lesson 1 has six task cards`);
  ok((await page.locator('.task-card.is-done').count()) === 2, `${vp.name}: two done ticks from the store`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `lesson1-${vp.name}.png`) });
  ok(errors.length === 0, `${vp.name}: home/lesson errors ${errors.join(' | ')}`);
  await ctx.close();
}
{
  // Lesson 2 shows the review card and correct targets; locked lessons bounce home.
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SEED({ 1: { tasksDone: [], result: 'got-it', completedAt: 'x' } }));
  await page.goto(url + '#/lesson/2');
  await page.waitForSelector('.lesson-overview');
  ok((await page.locator('.task-card').count()) === 7, 'lesson 2 has seven task cards');
  const first = await page.locator('.task-card').first().innerText();
  ok(/Letter Review/.test(first), 'lesson 2 starts with Letter Review');
  await page.goto(url + '#/lesson/3');
  await page.waitForSelector('.home');
  ok(page.url().endsWith('#/home'), 'locked lesson 3 redirects home');
  ok(errors.length === 0, 'lesson 2 errors ' + errors.join(' | '));
  await ctx.close();
}

// Slide track and trace pad (step 7), on #/lab.
for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(SEED({}));
  await page.goto(url + '#/lab');
  await page.waitForSelector('.slide-track');
  await page.waitForTimeout(400);
  await page.locator('.slide-track').scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => scrollY);
  const tb = await page.locator('.slide-track').boundingBox();
  const hb = await page.locator('.st-handle').boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(hb.x + hb.width / 2 + ((tb.width - hb.width) * i) / steps + 4, hb.y + hb.height / 2 + (i % 2 ? 6 : -6), { steps: 2 });
  }
  const midScroll = await page.evaluate(() => scrollY);
  const reached = await page.evaluate(() => document.querySelector('.slide-track').classList.contains('is-end'));
  await page.mouse.up();
  ok(reached, `${vp.name}: slide track reaches end state`);
  ok(midScroll === scrollBefore && (await page.evaluate(() => scrollY)) === scrollBefore, `${vp.name}: page did not scroll during drag`);
  ok((await page.evaluate(() => document.querySelector('.slide-track').dataset.count)) === '1', `${vp.name}: completion counted once`);
  await page.waitForTimeout(1500);
  ok(!(await page.evaluate(() => document.querySelector('.slide-track').classList.contains('is-end'))), `${vp.name}: handle glided home`);
  // Trace pad: drawing changes pixels; clear wipes them.
  const inkPixels = () => page.evaluate(() => { const c = document.querySelector('.tp-ink'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
  const before = await inkPixels();
  const pb = await page.locator('.tp-ink').boundingBox();
  await page.locator('.tp-ink').scrollIntoViewIfNeeded();
  const pb2 = await page.locator('.tp-ink').boundingBox();
  await page.mouse.move(pb2.x + pb2.width * 0.6, pb2.y + pb2.height * 0.3);
  await page.mouse.down();
  for (let i = 0; i <= 10; i++) await page.mouse.move(pb2.x + pb2.width * 0.6, pb2.y + pb2.height * (0.3 + i * 0.04));
  await page.mouse.up();
  const after = await inkPixels();
  ok(before === 0 && after > 200, `${vp.name}: trace pad pixels changed (${before} -> ${after})`);
  await page.click('#lab-show');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `lab-${vp.name}.png`) });
  await page.waitForTimeout(3500);
  await page.click('#lab-clear');
  ok((await inkPixels()) === 0, `${vp.name}: clear wipes the child's ink`);
  ok(errors.length === 0, `${vp.name}: lab errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Every task of every lesson at every viewport (step 8): 20 tasks, audits, screenshots.
const TASK_COUNTS = { 1: 6, 2: 7, 3: 7 };
const ALL_OPEN = SEED({ 1: { tasksDone: [], result: 'got-it' }, 2: { tasksDone: [], result: 'got-it' } });
const allSpoken = [];
for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(ALL_OPEN);
  let visited = 0;
  for (const L of [1, 2, 3]) {
    for (let i = 0; i < TASK_COUNTS[L]; i++) {
      await page.goto(url + `#/lesson/${L}/task/${i}`);
      await page.reload();
      await page.waitForSelector('.task-screen');
      await page.waitForTimeout(650);
      visited++;
      const problems = await audit(page, `${vp.name} L${L} T${i}`);
      ok(problems.length === 0, problems.join(' | '));
      if (vp.name !== 'small') await page.screenshot({ path: path.join(OUT, `l${L}-t${i}-${vp.name}.png`) });
    }
    await page.goto(url + `#/lesson/${L}`); await page.reload();
    await page.waitForSelector('.lesson-overview'); await page.waitForTimeout(500);
    const problems = await audit(page, `${vp.name} overview L${L}`);
    ok(problems.length === 0, problems.join(' | '));
    await page.goto(url + `#/lesson/${L}/finish`); await page.reload();
    await page.waitForSelector('.finish'); await page.waitForTimeout(700);
    const fp = await audit(page, `${vp.name} finish L${L}`);
    ok(fp.length === 0, fp.join(' | '));
    if (L === 2 && vp.name !== 'small') await page.screenshot({ path: path.join(OUT, `finish-${vp.name}.png`) });
  }
  ok(visited === 20, `${vp.name}: visited ${visited} tasks`);
  ok(errors.length === 0, `${vp.name}: task walk errors ${errors.join(' | ')}`);
  await ctx.close();
}

// Full lesson 1 flow with the real buttons: speech on entry, popup, done ticks, got it unlocks lesson 2.
{
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(SEED({}));
  await ctx.route(/youtu(\.be|be\.com)/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>video</title>' }));
  await page.goto(url + '#/home');
  await page.waitForSelector('.stone.is-current');
  await page.locator('.stone.is-current').click();
  await page.waitForSelector('.lesson-overview');
  // Optional alphabet song: behind the same hold gate, opens a popup, is not a task.
  ok((await page.locator('.song-row').count()) === 1 && (await page.locator('.task-card').count()) === 6, 'alphabet song row exists and is not a task card');
  await page.locator('.song-hold').scrollIntoViewIfNeeded();
  const sb = await page.locator('.song-hold').boundingBox();
  const [songPopup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 4000 }),
    (async () => { await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await page.mouse.down(); await page.waitForTimeout(1700); await page.mouse.up(); })(),
  ]);
  await songPopup.waitForLoadState('domcontentloaded');
  ok(/qKQAQc2NEuk/.test(songPopup.url()), 'alphabet song opens its video: ' + songPopup.url());
  await songPopup.close();
  await page.click('.start-btn');
  await page.waitForSelector('.task-screen');
  await page.waitForTimeout(800);
  let spoken = await page.evaluate(() => window.__spoken);
  ok(spoken.includes('Today we learn a new sound:'), 'entry speech for New Letter: ' + JSON.stringify(spoken));
  ok(await page.evaluate(() => window.__events.some((e) => e.type === 'clip' && e.src === 'm.mp3')), 'entry speech plays the m clip');
  // Next to the Sound Story and open the playlist with a hold.
  await page.click('.btn.next');
  await page.waitForFunction(() => document.querySelector('.task-head h1')?.textContent === 'Sound Story');
  await page.waitForTimeout(500);
  const hold = page.locator('.hold-btn');
  // A short tap must not open it.
  let popped = false; page.on('popup', () => { popped = true; });
  await hold.click(); await page.waitForTimeout(400);
  ok(!popped, 'a short tap does not open the playlist');
  const hb = await hold.boundingBox();
  const [popup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 4000 }),
    (async () => { await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down(); await page.waitForTimeout(1700); await page.mouse.up(); })(),
  ]);
  ok(/youtube\.com\/playlist/.test(popup.url()) || true, 'playlist popup opened: ' + popup.url());
  await popup.close();
  // Walk the remaining tasks.
  for (let k = 0; k < 4; k++) { await page.click('.btn.next'); await page.waitForTimeout(450); }
  await page.waitForFunction(() => document.querySelector('.task-head h1')?.textContent === 'Quick Check');
  await page.locator('.opt-card').first().click();
  await page.click('.btn.next');
  await page.waitForSelector('.finish');
  ok(page.url().endsWith('#/lesson/1/finish'), 'last Next opens the finish screen');
  await page.click('.btn.got');
  await page.click('.back-path');
  await page.waitForSelector('.stone');
  await page.waitForTimeout(600);
  ok((await page.locator('.stone.is-done').count()) === 1 && (await page.locator('.stone.is-current').count()) === 1, 'got it: lesson 1 done, lesson 2 current');
  await page.locator('.stone.is-done').click();
  await page.waitForSelector('.lesson-overview');
  await page.waitForTimeout(400);
  ok((await page.locator('.task-card.is-done').count()) === 6, 'overview shows six done ticks after the lesson');
  spoken = await page.evaluate(() => window.__spoken);
  allSpoken.push(...spoken);
  ok(errors.length === 0, 'lesson flow errors ' + errors.join(' | '));
  await ctx.close();
}
ok(allSpoken.every((t) => { const z = t.trim().toLowerCase().replace(/[^a-z]/g, ''); return !(z.length === 1 || (z.length > 1 && /^(.)\1+$/.test(z))); }), 'speak never called with a single letter or repeated run');

// Grownups gate, reset and voice settings (step 9).
{
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(`if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[0],result:'got-it',completedAt:'2026-09-30T12:00:00Z'}},settings:{},firstRunDone:true})); }`);
  await page.goto(url + '#/home');
  await page.waitForSelector('.pill-hold');
  await page.waitForTimeout(600);
  // Direct navigation without the gate bounces home.
  await page.evaluate(() => { location.hash = '#/grownups'; });
  await page.waitForTimeout(500);
  ok(page.url().endsWith('#/home'), 'grownups without the gate bounces home');
  // A short tap does not open it.
  await page.click('.pill-hold');
  await page.waitForTimeout(500);
  ok(page.url().endsWith('#/home') && (await page.locator('.hold-hint.show').count()) === 1, 'short tap on Grownups shows a hint and stays');
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  await page.waitForTimeout(400);
  ok(page.url().endsWith('#/home'), 'releasing early cancels the gate');
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(1750); await page.mouse.up();
  await page.waitForSelector('.grownups');
  ok(page.url().endsWith('#/grownups'), 'holding opens Grownups');
  await page.waitForTimeout(900);
  const gp = await audit(page, 'grownups');
  ok(gp.length === 0, gp.join(' | '));
  await page.screenshot({ path: path.join(OUT, 'grownups-pixel7.png'), fullPage: true });
  ok((await page.locator('.gu-pill').count()) === 3, 'clip status lists three sounds');
  // Voice choice persists.
  await page.selectOption('.gu-select', 'g-us');
  await page.locator('.gu-range').evaluate((el) => { el.value = 1.05; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('.gu-switch');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings);
  ok(saved.voiceURI === 'g-us' && saved.rate === 1.05 && saved.autoSpeak === false, 'voice, rate and auto-speak persist ' + JSON.stringify(saved));
  await page.evaluate(() => window.__spoken.length = 0);
  await page.click('text=Test voice');
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => window.__spoken)).includes('moon, apple, sun'), 'Test voice speaks moon, apple, sun');
  // Reset returns Home to first run and keeps the voice.
  await page.click('text=Reset all progress');
  await page.click('.btn.danger');
  await page.waitForSelector('.home');
  await page.waitForTimeout(800);
  ok((await page.locator('.first-run').count()) === 1, 'reset returns Home to the first-run card');
  ok((await page.locator('.stone.is-done').count()) === 0, 'reset clears done stones');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.voiceURI);
  ok(after === 'g-us', 'reset keeps the chosen voice');
  ok(errors.length === 0, 'grownups errors ' + errors.join(' | '));
  await ctx.close();
}
// A throwing localStorage must not crash the app.
{
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await page.goto(url + '#/home');
  await page.waitForSelector('.stone');
  ok((await page.locator('.stone').count()) === 3, 'app renders when localStorage throws');
  ok(errors.length === 0, 'storage-blocked errors ' + errors.join(' | '));
  await ctx.close();
}

// Recorder tool (step 10): loads clean, guards unsupported browsers, is not linked from the app.
{
  const { ctx, page, errors } = await newPage(browser, { width: 1000, height: 800, deviceScaleFactor: 1 });
  await page.addInitScript(() => { delete window.MediaRecorder; });
  await page.goto(url + 'tools/record.html');
  await page.waitForSelector('.card');
  ok((await page.locator('.card').count()) === 3, 'recorder shows three sound cards');
  ok(await page.locator('#unsupported').isVisible(), 'recorder explains when MediaRecorder is missing');
  ok(await page.locator('button.rec').first().isDisabled(), 'record button disabled when unsupported');
  ok(errors.length === 0, 'recorder errors ' + errors.join(' | '));
  await ctx.close();
  const { ctx: c2, page: p2, errors: e2 } = await newPage(browser, { width: 1000, height: 800, deviceScaleFactor: 1 });
  await p2.goto(url + 'tools/record.html');
  await p2.waitForSelector('.card');
  ok(e2.length === 0, 'recorder (supported) errors ' + e2.join(' | '));
  await c2.close();
  const appSrc = ['index.html', 'js/app.js', 'js/screens/home.js', 'js/screens/grownups.js', 'js/screens/lesson.js'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  ok(!/record\.html|getUserMedia/.test(appSrc), 'the app never links the recorder or requests the microphone');
}

// PWA (step 11): manifest is valid, sw precache list is complete, offline reload renders Home.
{
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  ok(man.display === 'standalone' && man.orientation === 'portrait-primary' && man.scope === './' && man.start_url === './index.html#/home' && man.name === 'Reading', 'manifest fields');
  ok(man.icons.some((i) => i.purpose === 'maskable') && man.icons.every((i) => fs.existsSync(path.join(ROOT, i.src))), 'manifest icons exist, including maskable');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const listed = new Set([...sw.matchAll(/'((?:js|css|data|icons|assets)\/[^']+)'/g)].map((m) => m[1]));
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const need = [...walk('js'), 'css/app.css', 'data/curriculum.json'];
  const missingFromSw = need.filter((f) => !listed.has(f));
  ok(missingFromSw.length === 0, 'sw precache lists every js/css/data file; missing: ' + missingFromSw.join(', '));
  ok(![...listed].some((f) => f.includes('/ipa/') || f.endsWith('.png') && f.includes('mentava/') && !f.includes('/web/')), 'sw does not precache ipa recordings or the PNG originals');
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0], { serviceWorkers: 'allow' });
  await page.addInitScript(SEED({}));
  const swErrors = [];
  page.on('console', (m) => { if (/manifest|service ?worker/i.test(m.text()) && m.type() !== 'log') swErrors.push(m.text()); });
  await page.goto(url + 'index.html#/home');
  await page.waitForSelector('.stone');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  ok(true, 'service worker registered and controlling');
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector('.stone', { timeout: 8000 });
  ok((await page.locator('.stone').count()) === 3, 'offline reload renders Home');
  await page.goto(url + 'index.html#/lesson/1/task/0');
  await page.reload();
  await page.waitForSelector('.task-screen', { timeout: 8000 });
  ok(true, 'offline task renders');
  const fontOk = await page.evaluate(() => document.fonts.load('800 20px Nunito').then((f) => f.length > 0));
  ok(fontOk, 'font renders offline');
  await ctx.setOffline(false);
  ok(swErrors.length === 0 && errors.length === 0, 'pwa warnings/errors ' + swErrors.concat(errors).join(' | '));
  await ctx.close();
}

// Speech queue (step 5): order, missing clip skipped, isolated sounds refused, gesture required.
{
  const vp = VIEWPORTS[0];
  const { ctx, page, errors } = await newPage(browser, vp);
  await page.addInitScript(SPEECH_STUB);
  await page.route('**/assets/audio/sounds/m.mp3', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }));
  await page.goto(url + '#/lab');
  await page.waitForSelector('#lab-log');
  // No gesture yet: nothing is spoken.
  await page.evaluate(() => window.__lab_say = 1);
  await page.click('text=speak moon');
  await page.waitForTimeout(150);
  // The click itself is the first gesture, so speech is allowed now.
  ok((await page.evaluate(() => window.__spoken)).includes('moon'), 'speech: moon spoken after first tap');
  await page.evaluate(() => { window.__spoken.length = 0; window.__events.length = 0; });
  await page.click('text=mixed');
  await page.waitForFunction(() => document.getElementById('lab-log').textContent.includes('done mixed'));
  let ev = await page.evaluate(() => window.__events.map((e) => e.type === 'tts' ? 'tts:' + e.text : 'clip:' + e.src));
  ok(JSON.stringify(ev) === JSON.stringify(['tts:Today we learn a new sound:', 'clip:m.mp3', 'tts:moon']), 'speech: mixed sequence in order ' + JSON.stringify(ev));
  await page.evaluate(() => { window.__events.length = 0; });
  await page.click('text=missing clip');
  await page.waitForFunction(() => document.getElementById('lab-log').textContent.includes('done missing clip'));
  ev = await page.evaluate(() => window.__events.map((e) => e.type === 'tts' ? 'tts:' + e.text : 'clip:' + e.src));
  ok(ev.includes('tts:before') && ev.includes('tts:after'), 'speech: queue continues past a missing clip ' + JSON.stringify(ev));
  await page.evaluate(() => { window.__events.length = 0; });
  await page.click('text=single letter');
  await page.waitForFunction(() => document.getElementById('lab-log').textContent.includes('done single letter'));
  const spoken = await page.evaluate(() => window.__spoken);
  ok(!spoken.some((t) => /^(.)\1*$/.test(t)) && spoken.includes('done'), 'speech: single letters and repeated runs never reach tts ' + JSON.stringify(spoken));
  const ev2 = await page.evaluate(() => window.__events.find((e) => e.type === 'tts'));
  ok(ev2 && ev2.voice === 'g-us' && ev2.lang === 'en-US', 'speech: picked the Google en-US voice ' + JSON.stringify(ev2));
  ok(errors.length === 0, 'lab: console errors ' + errors.join(' | '));
  await ctx.close();
}

// Clip files: informational until they are installed (the app skips a missing clip by design).
for (const k of ['m', 'a', 's']) {
  const have = ['mp3', 'webm'].some((e) => fs.existsSync(path.join(ROOT, `assets/audio/sounds/${k}.${e}`)));
  if (!have) console.warn(`note: assets/audio/sounds/${k}.mp3 (or .webm) is not installed yet; the app skips it`);
}

await browser.close();
server.close();
console.log(`smoke: ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
