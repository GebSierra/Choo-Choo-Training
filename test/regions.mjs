// The regions (no version change): per-world themes (js/train/themes.js) and the read-only world preview #/world/<id>
// (js/screens/region.js). W3 Sunny Hills and W4 Digraph Docks have no lessons yet, so their preview builds one locked
// placeholder station for each sound; W1 and W2 show their real progress. The preview writes nothing, draws only when something
// moves, and keeps its draw calls near the old W2 scene. Screenshots for the owner go to docs/screenshots/regions/ with `--shots`.
// Run alone with `node test/regions.mjs [--shots]`.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch } from './lib.mjs';
import { openHome, state, until } from './train.mjs';
import { themeOf, worldSounds, THEMES, DEFAULT_THEME } from '../js/train/themes.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/regions');
const VPS = [{ name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 }, { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 }];
const SHOT_VPS = [{ name: '412x915', width: 412, height: 915, deviceScaleFactor: 1.6 }, { name: '915x412', width: 915, height: 412, deviceScaleFactor: 1.6 }];
const RAF_COUNTER = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const NO_WEBGL = () => { const orig = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : orig.call(this, type, ...rest); }; };
const seed = (done = 4) => state(done, { migrated1912: true });
const WANT = {
  W3: { sounds: ['e', 'j', 'w', 'v', 'y', 'z', 'x', 'qu'], next: 'Digraph Docks', theme: 'sunny-hills' },
  W4: { sounds: ['sh', 'ch', 'th', 'ck', 'ff ll ss zz', 'wh', 'ng', 'nk'], next: 'Blend Bay', theme: 'digraph-docks' },
};
const CALL_MARGIN = 15;
const store = (page) => page.evaluate(() => localStorage.getItem('reading.v1'));
const keys = (page) => page.evaluate(() => Object.keys(localStorage).sort().join());

// Pure checks on the data.
export function dataChecks(ok) {
  // polish B (deliberate): world 1 is the default look plus its extra props (id starter-station, details 'starter'); W2 and any world without a theme stay exactly DEFAULT_THEME
  ok(THEMES.W2 === DEFAULT_THEME && themeOf('W2') === DEFAULT_THEME && themeOf('W9') === DEFAULT_THEME && DEFAULT_THEME.details === null && DEFAULT_THEME.decor === null, 'themes: W2 and any world without a theme use the default (the look they always had, no extra props)');
  const w1 = themeOf('W1');
  ok(w1 === THEMES.W1 && w1.id === 'starter-station' && w1.details === 'starter' && w1.decor === null && ['ground', 'patch', 'bed', 'fog', 'fogNear', 'fogFar', 'hemiSky', 'hemiGround', 'sun', 'skyCss'].every((k) => w1[k] === DEFAULT_THEME[k]) && w1.mountain === DEFAULT_THEME.mountain, 'themes: W1 is the default look (same colours, fog, light, sky, mountain) plus the Starter Station details');
  ok(themeOf('W3').id === 'sunny-hills' && themeOf('W4').id === 'digraph-docks' && themeOf('W3').decor === 'sunny' && themeOf('W4').decor === 'docks', 'themes: W3 and W4 have their own');
  ok(DEFAULT_THEME.ground === '#4FC97E' && DEFAULT_THEME.fog === '#FFF6E5' && DEFAULT_THEME.mountain.low === '#62C34C' && DEFAULT_THEME.skyCss === null, 'themes: the default is exactly the original colours (grass, fog, mountain) and the page sky');
  ok(worldSounds(CUR, 'W3').join() === WANT.W3.sounds.join() && worldSounds(CUR, 'W4').join() === WANT.W4.sounds.join() && worldSounds(CUR, 'W1').length > 0, 'themes: the placeholder sounds (W3 from units 2.9 to 2.11, W4 listed)');
  ok(CUR.lessons.every((l) => l.world === 'W1' || l.world === 'W2'), 'data: still no lessons beyond world 2 (the regions are only worlds, no lessons were built)');
}

// polish B: the Starter Station props are baked into at most two meshes (one solid, one water): at most 2 draw calls, 3 with the shadow pass, far under the 8 allowed.
export async function starterChecks(ok) {
  const { THREE, makeLine, makeBag } = await import('../js/train/world.js');
  const { buildStarterDetails } = await import('../js/train/starter.js');
  const line = makeLine(9), bag = makeBag(), group = new THREE.Group();
  const stops = Array.from({ length: 9 }, (_, i) => line.stop(i));
  const kinds = ['lesson', 'lesson', 'lesson', 'depot', 'lesson', 'lesson', 'lesson', 'lesson', 'lesson'];
  const r = buildStarterDetails({ bag, line, stops, kinds, group });
  ok(group.children.length <= 2 && group.children.every((m) => m.isMesh), `starter: the extra props are ${group.children.length} meshes (at most 2 draw calls)`);
  ok(r.tris > 1000 && r.tris < 40000 && r.clear.length >= 4, `starter: ${r.tris} triangles, ${r.clear.length} clear zones for trees and flowers`);
  // nothing is built beside a sign: every piece keeps off the sign posts (local x -3.05, z +1.25 of each stop) by at least 0.45
  const pos = group.children[0].geometry.getAttribute('position');
  let worst = 9;
  for (const s of stops) {
    const p = line.at(s, {}), c = Math.cos(p.heading), sn = Math.sin(p.heading);
    for (let i = 0; i < pos.count; i += 7) {
      const dx = pos.getX(i) - p.x, dz = pos.getZ(i) - p.z, lx = c * dx - sn * dz, lz = sn * dx + c * dz;
      if (pos.getY(i) > 1.6 && Math.hypot(lx + 3.05, lz - 1.25) < worst) worst = Math.hypot(lx + 3.05, lz - 1.25);
    }
  }
  ok(worst > 0.45, `starter: nothing high is built within 0.45 of a sign post (closest ${worst.toFixed(2)})`);
  bag.dispose();
}

const preview = async (browser, url, vp, world, { st = seed(4), init = [], extra, hq = false } = {}) => {
  const made = await openHome(browser, url, vp, st, { init, extra, route: `${hq ? '?hq=1' : ''}#/world/${world}` });
  await until(made.page, () => window.__train && window.__train.frames > 0, null, 30000);
  return made;
};

export async function regionChecks({ browser, url, ok, vp }) {
  const tag = vp.name;
  // the old W2 look, as the baseline for the draw calls and the colours
  let baseCalls = 0;
  {
    const { ctx, page, errors } = await preview(browser, url, vp, 'W2', { st: seed(6) }); // world 1 done, so world 2's train is at its first stop, as in the new worlds
    await page.waitForTimeout(2800);
    const w2 = await page.evaluate(() => ({ ...window.__train, stopS: undefined }));
    baseCalls = w2.calls;
    ok(w2.theme === 'default' && w2.fogHex === '#fff6e5' && w2.skyOverride === false && w2.world === 'W2' && w2.region === true && w2.placeholder === false, `${tag} W2: still the default theme (fog ${w2.fogHex}, the page's own sky)`);
    ok(w2.stopCount === 7 && w2.startTunnel && w2.portal && w2.signText === 'Sunny Hills', `${tag} W2: shows its real stops with the start tunnel and the portal to Sunny Hills (${w2.stopCount} stops)`);
    ok(w2.details === null, `${tag} W2: no Starter Station props (world 2 is unchanged)`);
    ok(errors.length === 0, `${tag} W2: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  for (const [w, want] of Object.entries(WANT)) {
    const t = `${tag} ${w}`;
    const { ctx, page, errors } = await preview(browser, url, vp, w, { init: [RAF_COUNTER] });
    const a = await store(page), ka = await keys(page);
    const d = await page.evaluate(() => ({ ...window.__train, stopS: undefined }));
    ok(d.region && d.placeholder && d.world === w && d.theme === want.theme && d.skyOverride === true && d.fogHex !== '#fff6e5', `${t}: the scene renders with its own theme (${d.theme}, fog ${d.fogHex})`);
    ok(d.stopCount === want.sounds.length && d.lessonCount === want.sounds.length && d.checkpointCount === 0, `${t}: one station per sound or sound group (${d.stopCount} of ${want.sounds.length})`);
    const btns = await page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => ({ label: b.getAttribute('aria-label'), cls: b.className })));
    ok(btns.length === want.sounds.length && btns.every((b) => /\bis-locked\b/.test(b.cls) && /, locked$/.test(b.label)), `${t}: every station is locked (${btns.map((b) => b.label).join(' | ')})`);
    ok(btns.every((b, i) => b.label === `Sound ${want.sounds[i]}, locked`), `${t}: the signs carry the spellings in order`);
    ok(d.signpost && d.signText === want.next && d.portal && d.startTunnel && d.nextWorld, `${t}: the end portal and signpost name ${want.next}, and there is a start tunnel (sign "${d.signText}")`);
    ok(d.currentIndex === 0 && d.trainS < 9, `${t}: the train sits at the start`);
    ok(await page.evaluate(() => !document.querySelector('.home-top .hold-btn') && !!document.querySelector('.preview-back') && !document.querySelector('.first-run')), `${t}: a Back button, no Grownups hold button, no welcome card`);
    // every station can be brought into view with its whole tap target on screen
    const seen = [];
    for (let i = 0; i < want.sounds.length; i++) {
      await page.evaluate((k) => window.__train.show(k), i);
      await page.waitForTimeout(60);
      seen.push(await page.evaluate((k) => { const b = document.querySelectorAll('.station-btn')[k]; return b.dataset.shown === '1'; }, i));
    }
    ok(seen.every(Boolean), `${t}: each station's sign is whole on screen when brought into view (${seen.map((s) => (s ? 'y' : 'n')).join('')})`);
    await page.evaluate(() => window.__train.show(0));
    // a tap on a locked station only wobbles it
    const hash0 = await page.evaluate(() => location.hash), f0 = await page.evaluate(() => window.__train.frames);
    await page.locator('.station-btn[data-shown="1"]').first().click({ force: true });
    await page.waitForTimeout(500);
    ok((await page.evaluate(() => location.hash)) === hash0 && (await page.evaluate(() => window.__train.frames)) > f0, `${t}: tapping a locked station wobbles it and goes nowhere`);
    // idle, then count the frames (the old budget: about none)
    await page.waitForTimeout(2800);
    const r0 = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(3000);
    const m = await page.evaluate((r) => ({ raf: window.__raf - r, endless: document.getAnimations().filter((x) => x.playState === 'running' && x.effect && x.effect.getComputedTiming().endTime === Infinity).length, calls: window.__train.calls, tris: window.__train.tris }), r0);
    ok(m.raf <= 2 && m.endless === 0, `${t}: idle for 3 s draws about nothing (${m.raf} frames, ${m.endless} endless animations)`);
    console.log(`  ${t}: ${m.calls} draw calls (W2 ${baseCalls}), ${m.tris} triangles`);
    ok(m.calls <= baseCalls + CALL_MARGIN, `${t}: draw calls ${m.calls} within W2's ${baseCalls} + ${CALL_MARGIN}`);
    const b = await store(page);
    ok(a === b && (await keys(page)) === ka, `${t}: nothing written to localStorage by looking around`);
    ok(!JSON.parse(b).settings.trainAt && JSON.parse(b).settings.trainAt !== 0, `${t}: no train position saved`);
    ok(errors.length === 0, `${t}: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

export async function otherChecks({ browser, url, ok }) {
  const vp = VPS[0];
  // W1 shows its real progress, still writing nothing, and its stations do not open from here
  {
    const { ctx, page, errors } = await preview(browser, url, vp, 'W1', { st: seed(4) });
    const a = await store(page);
    const cls = await page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => b.className.match(/is-(\w+)/)[1]));
    const d = await page.evaluate(() => ({ theme: window.__train.theme, stops: window.__train.stopCount, placeholder: window.__train.placeholder, details: window.__train.details }));
    ok(d.theme === 'starter-station' && d.stops === 9 && !d.placeholder && cls.filter((c) => c === 'done').length >= 4, `W1 preview: its real nine stops and progress (${cls.join(' ')})`);
    ok(d.details && d.details.tris > 1000, `W1 preview: Starter Station's extra props are built (${d.details && d.details.tris} triangles)`);
    await page.evaluate(() => window.__train.show(4)); await page.waitForTimeout(300);
    const hash0 = await page.evaluate(() => location.hash);
    const shown = page.locator('.station-btn[data-shown="1"]').first();
    await shown.click({ force: true }); await page.waitForTimeout(400);
    ok((await page.evaluate(() => location.hash)) === hash0 && (await store(page)) === a, 'W1 preview: tapping a station goes nowhere and writes nothing');
    ok(errors.length === 0, `W1 preview: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Back goes to Grownups within ten minutes of the hold, else Home; an unknown world says so
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, seed(4), { route: '#/world/W3' });
    await until(page, () => window.__train && window.__train.frames > 0, null, 30000);
    await page.locator('.preview-back').click();
    await page.waitForFunction(() => location.hash === '#/home', null, { timeout: 8000 }).catch(() => {});
    ok((await page.evaluate(() => location.hash)) === '#/home', 'Back: opened directly (no hold), Back goes home, never into Grownups');
    ok(errors.length === 0, `Back: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await openHome(browser, url, vp, seed(4), { route: '#/world/W99' });
    await page.waitForSelector('.retry-card');
    ok(/no such world/.test(await page.textContent('.retry-card')), 'an unknown world id shows a short message');
    await ctx.close();
  }
  // no WebGL: a plain text card
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, seed(4), { init: [NO_WEBGL], route: '#/world/W3' });
    await page.waitForSelector('.retry-card');
    ok((await page.textContent('.retry-card p')).trim() === 'This preview needs 3D.', 'no WebGL: the card reads "This preview needs 3D."');
    ok(errors.length === 0, `no WebGL: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// Screenshots for the owner (docs/screenshots/regions/): each region's overview, a mid-track view, the end portal close up and the start tunnel.
export async function shotChecks({ browser, url }) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  for (const w of Object.keys(WANT)) for (const vp of SHOT_VPS) {
    const { ctx, page } = await preview(browser, url, vp, w, { hq: true });
    await page.waitForTimeout(3500);
    const shot = (name) => page.screenshot({ path: path.join(SHOT_DIR, `${w}-${name}-${vp.name}.png`) });
    await shot('overview');
    await page.evaluate(() => window.__train.show(3)); await page.waitForTimeout(500); await shot('midtrack');
    await page.evaluate(() => window.__train.show(7)); await page.waitForTimeout(300);
    await page.evaluate(() => window.__train.portalClose(true)); await page.waitForTimeout(500); await shot('portal');
    await page.evaluate(() => window.__train.portalClose(false, true)); await page.waitForTimeout(500); await shot('start-tunnel');
    await ctx.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  dataChecks(ok);
  await starterChecks(ok);
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  for (const vp of VPS) await regionChecks({ browser, url, ok, vp });
  await otherChecks({ browser, url, ok });
  if (SHOTS) await shotChecks({ browser, url });
  await browser.close(); server.close();
  console.log(`regions: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
