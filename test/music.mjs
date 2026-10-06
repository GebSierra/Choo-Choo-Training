// The theme song (js/music.js) and the train whistle (a sample in js/sfx.js). Playback is spied on (HTMLMediaElement play and
// pause record their calls; Web Audio is the recorder from stubs.mjs), so the tests check what would sound and when.
// The Music switch in Grownups is checked in test/sfx.mjs. Run alone with `node test/music.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, loadPlaywright, launch, VIEWPORTS } from './lib.mjs';
import { openHome, state, until, iL } from './train.mjs';

// Records every play and pause of an audio element, with the volume and the sequence phase at that moment.
const MEDIA_SPY = () => {
  window.__media = [];
  const note = (op, el) => window.__media.push({ op, src: el.src.split('/').pop(), vol: el.volume, loop: el.loop, preload: el.preload, phase: window.__train ? window.__train.kid.phase : null, running: window.__train ? window.__train.running : null, t: performance.now() });
  HTMLMediaElement.prototype.play = function () { note('play', this); return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () { note('pause', this); };
};
const SLOW_SPEECH = () => { window.__ttsMs = 1600; };
const NO_WEBGL = () => { const orig = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : orig.call(this, type, ...rest); }; };
const themePlays = (page) => page.evaluate(() => window.__media.filter((m) => m.op === 'play' && m.src === 'theme.mp3'));
const whistles = (page) => page.evaluate(() => window.__audioNotes().filter((n) => n.event === 'whistle' && n.sample).length);
const vol = (page) => page.evaluate(async () => { const { music } = await import('/js/music.js'); return music.element ? music.element.volume : null; });
const justDone = (settings = {}) => state(4, { trainAt: iL(5), trainDone: 3, ...settings }, { character: { name: 'Lily', skin: 3, hair: 'braids', hairColor: 1, outfit: 'dress', made: true }, lessons: Object.fromEntries([1, 2, 3, 4].map((n) => [n, { tasksDone: [], result: 'got-it', completedAt: `2026-10-0${n}T10:00:00.000Z` }])) });
const homeReady = (page) => until(page, () => window.__train && window.__train.frames > 1, null, 20000);
const themeStarted = (page, ms = 8000) => until(page, () => window.__media.some((m) => m.op === 'play' && m.src === 'theme.mp3'), null, ms);
const whistleStarted = (page, ms = 8000) => until(page, () => window.__audioNotes().some((n) => n.event === 'whistle' && n.sample), null, ms);

export async function musicChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  {
    // Cold start: nothing before the first tap; then theme and whistle together; leaving stops it; coming back starts it again.
    const { ctx, page, errors } = await openHome(browser, url, vp, state(3), { init: [MEDIA_SPY, SLOW_SPEECH] });
    ok(await homeReady(page), 'music: the railway Home opens');
    await page.waitForTimeout(1500);
    ok((await themePlays(page)).length === 0 && (await whistles(page)) === 0, 'music: the theme and the whistle do not start before the first tap');
    await page.mouse.click(3, 300);
    ok(await themeStarted(page), 'music: after the first tap the theme starts');
    ok(await whistleStarted(page), 'music: the whistle starts with it');
    const first = (await themePlays(page))[0];
    ok(first && first.loop === false && first.preload === 'auto' && Math.abs(first.vol - 0.45) < 0.001, `music: the theme does not loop, preloads and starts at 0.45 (${JSON.stringify(first)})`);
    ok((await themePlays(page)).length === 1 && (await whistles(page)) === 1, 'music: one theme and one whistle');

    // Ducking: quiet while the voice speaks, back after.
    await page.evaluate(() => { const b = document.querySelector('.bubble'); if (b) b.click(); });
    ok(await until(page, () => window.__spoken.length > 0, null, 4000), 'music: the Tap to start bubble speaks');
    await page.waitForTimeout(500);
    const duckedV = await vol(page);
    ok(duckedV !== null && duckedV < 0.2, `music: the theme ducks while speech plays (${duckedV})`);
    await page.waitForTimeout(2300);
    const backV = await vol(page);
    ok(backV !== null && Math.abs(backV - 0.45) < 0.02, `music: the volume is restored after speech (${backV})`);
    // ... and while a jingle rings.
    await page.evaluate(async () => { (await import('/js/sfx.js')).sfx.play('win'); });
    await page.waitForTimeout(500);
    const jv = await vol(page);
    ok(jv !== null && jv < 0.2, `music: the theme ducks while a jingle rings (${jv})`);
    await page.waitForTimeout(2200);
    const jb = await vol(page);
    ok(jb !== null && Math.abs(jb - 0.45) < 0.02, `music: the volume is restored after the jingle (${jb})`);

    // Leaving Home fades and pauses; returning starts it from the start, with no whistle.
    await page.evaluate(() => { location.hash = '#/lesson/1'; });
    ok(await until(page, () => window.__media.some((m) => m.op === 'pause' && m.src === 'theme.mp3'), null, 5000), 'music: leaving Home stops the theme');
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.__media.length = 0; location.hash = '#/home'; });
    ok(await themeStarted(page), 'music: back on Home the theme starts again with no new tap');
    await page.waitForTimeout(800);
    ok((await themePlays(page)).length === 1 && (await whistles(page)) === 1, `music: the whistle is not repeated on a later Home (${await whistles(page)})`);
    ok(errors.length === 0, 'music: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    // Music off: no theme. The whistle follows the sound-effects switch.
    const { ctx, page, errors } = await openHome(browser, url, vp, state(3, { music: false }), { init: [MEDIA_SPY] });
    await homeReady(page);
    await page.mouse.click(3, 300);
    ok(await whistleStarted(page), 'music off: the whistle still sounds');
    await page.waitForTimeout(1200);
    ok((await themePlays(page)).length === 0, 'music off: no theme');
    ok(errors.length === 0, 'music off: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, state(3, { sfx: false }), { init: [MEDIA_SPY] });
    await homeReady(page);
    await page.mouse.click(3, 300);
    ok(await themeStarted(page), 'sound effects off: the theme still plays');
    await page.waitForTimeout(1200);
    ok((await whistles(page)) === 0, 'sound effects off: no whistle');
    ok(errors.length === 0, 'sfx off: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    // A station-complete sequence is due: the move has its whistle; the theme waits until the sequence is over.
    // The first tap comes on another screen, so the sound is already unlocked when the ride starts.
    const { ctx, page, errors } = await openHome(browser, url, vp, justDone(), { init: [MEDIA_SPY], route: '#/lesson/1' });
    await page.waitForTimeout(1200);
    await page.mouse.click(3, 300);
    await page.evaluate(() => { location.hash = '#/home'; });
    await homeReady(page);
    ok(await until(page, () => window.__train.startTootAt !== null, null, 8000), 'sequence: the train sets off');
    ok(await whistleStarted(page), 'sequence: the move sounds the whistle');
    ok((await themePlays(page)).length === 0, 'sequence: the theme has not started during the ride');
    ok(await themeStarted(page, 30000), 'sequence: the theme starts afterwards');
    const t = (await themePlays(page))[0];
    ok(t && t.phase === '' && t.running === false, `sequence: it starts only when the sequence is over (phase "${t && t.phase}", running ${t && t.running})`);
    ok(errors.length === 0, 'sequence: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    // The 2D map: the ride sounds the whistle, and the theme comes after it.
    const { ctx, page, errors } = await openHome(browser, url, vp, justDone(), { init: [MEDIA_SPY, NO_WEBGL] });
    await page.waitForSelector('.map-scroll');
    await page.mouse.click(3, 300);
    ok(await whistleStarted(page), '2D ride: the whistle sounds');
    ok(await themeStarted(page, 15000), '2D ride: the theme starts');
    ok(await page.evaluate(() => !document.querySelector('.seq-kid')), '2D ride: and only after the ride is over');
    await page.evaluate(() => { location.hash = '#/lesson/1'; });
    ok(await until(page, () => window.__media.some((m) => m.op === 'pause' && m.src === 'theme.mp3'), null, 5000), '2D: leaving the map stops the theme');
    ok(errors.length === 0, '2D ride: errors ' + errors.join(' | '));
    await ctx.close();
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  ok(fs.existsSync(path.join(root, 'assets/audio/music/theme.mp3')) && fs.existsSync(path.join(root, 'assets/audio/sfx/whistle.mp3')), 'music: the theme and the whistle files exist');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  ok(sw.includes("'assets/audio/music/theme.mp3'") && sw.includes("'assets/audio/sfx/whistle.mp3'") && sw.includes("'js/music.js'"), 'music: sw.js precaches both files and js/music.js');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await musicChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`music: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
