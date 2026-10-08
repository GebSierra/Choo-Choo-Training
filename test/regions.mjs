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
  W5: { sounds: ['st ft', 'nd mp nt', 'sp sk sn', 'sw sm sl', 'bl cl fl', 'pl gl', 'br tr cr', 'dr fr gr'], next: 'Endings Junction', theme: 'blend-bay' },
  W6: { sounds: ['s es', 'ing', 'ed', 'sun set', 'nap kin'], next: 'Silent E Summit', theme: 'endings-junction' },
  W7: { sounds: ['we me he', 'a_e', 'i_e', 'o_e', 'u_e', 'e_e'], next: 'Vowel Team Town', theme: 'silent-e-summit' },
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
  ok(themeOf('W5').id === 'blend-bay' && themeOf('W6').id === 'endings-junction' && themeOf('W7').id === 'silent-e-summit' && themeOf('W5').decor === 'bay' && themeOf('W6').decor === 'junction' && themeOf('W7').decor === 'summit' && themeOf('W8') === DEFAULT_THEME, 'themes: W5 Blend Bay, W6 Endings Junction and W7 Silent E Summit have their own; W8 on stays the default');
  ok(['W5', 'W6', 'W7'].every((w) => { const t = themeOf(w), cap = t.mountain.cap; return t.skyCss && t.fog !== DEFAULT_THEME.fog && t.mountain.low !== DEFAULT_THEME.mountain.low && cap && /^#/.test(cap.color); }), 'themes: W5 to W7 each have their own sky, fog and portal mountain (same family, own colours and a cap)');
  ok(['W5', 'W6', 'W7'].every((w) => { const n = worldSounds(CUR, w).length; return n >= 4 && n <= 10; }), 'themes: W5 to W7 each list four to ten placeholder stations');
  ok(DEFAULT_THEME.ground === '#4FC97E' && DEFAULT_THEME.fog === '#FFF6E5' && DEFAULT_THEME.mountain.low === '#62C34C' && DEFAULT_THEME.skyCss === null, 'themes: the default is exactly the original colours (grass, fog, mountain) and the page sky');
  ok(Object.keys(WANT).every((w) => worldSounds(CUR, w).join() === WANT[w].sounds.join()) && worldSounds(CUR, 'W1').length > 0, 'themes: the placeholder sounds (W3 from units 2.9 to 2.11, W4 to W7 listed from docs/CURRICULUM.md stages 3 to 6)');
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

// The owner's phone showed "This preview needs 3D." for Grownups > Developer > "Look at a world" (Home holds a WebGL context, then the
// preview asks for its own). The real flow: Home (3D) > Grownups (hold gate) > a world button > Back > the next button. The preview
// must always get a canvas, retry once with a fresh canvas in the soft configuration, never mark 3D as broken for the session, and in
// developer mode show the real error when both attempts fail.
const gate = async (page) => {
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
  await page.waitForSelector('.grownups');
};
const devSeed = () => state(4, { migrated1912: true, dev: true });
// Opens a world from the Developer box; resolves 'canvas' when its 3D scene runs or 'card' when the fallback card shows.
const lookAt = async (page, w) => {
  await page.locator(`.gu-devworlds [data-world="${w}"]`).scrollIntoViewIfNeeded();
  await page.locator(`.gu-devworlds [data-world="${w}"]`).click();
  await page.waitForFunction((id) => (window.__train && window.__train.region && window.__train.world === id && window.__train.frames > 0) || document.querySelector('.retry-card'), w, { timeout: 30000 });
  return (await page.evaluate(() => !!document.querySelector('.retry-card'))) ? 'card' : 'canvas';
};
const backToGrownups = async (page) => { await page.locator('.screen:not(.leaving) .preview-back').click(); await page.waitForSelector('.grownups'); };
const goHome3d = async (page) => {
  await page.evaluate(() => { location.hash = '#/home'; });
  return until(page, () => window.__train && !window.__train.region && window.__train.frames > 0 && document.querySelector('.home3d canvas'), null, 30000);
};
const EXTRA_CONTEXTS = () => { window.__extraGl = []; for (let i = 0; i < 24; i++) { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); if (g) window.__extraGl.push(g); } };
const NULL_FIRST = () => { window.__nullLeft = 1; const orig = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...rest) { if (/webgl/.test(type) && window.__nullLeft > 0) { window.__nullLeft--; return null; } return orig.call(this, type, ...rest); }; };

export async function flowChecks({ browser, url, ok }) {
  const vp = VPS[0], WORLDS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'];
  // 1. the full flow, in sequence and after going back, with the old Home's context disposed each time
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, devSeed());
    ok(await until(page, () => window.__train && window.__train.frames > 0 && !window.__train.region, null, 30000), 'flow: the real Home (3D) is up and holds a context');
    const live0 = await page.evaluate(() => window.__liveGL());
    await gate(page);
    const live1 = await page.evaluate(() => window.__liveGL());
    ok(live0 === 1 && live1 === 0, `flow: leaving Home disposes its context (live ${live0} on Home, ${live1} in Grownups)`);
    for (const w of WORLDS) {
      const r = await lookAt(page, w);
      const d = await page.evaluate(() => ({ canvas: !!document.querySelector('.home3d canvas'), card: !!document.querySelector('.retry-card'), live: window.__liveGL() }));
      ok(r === 'canvas' && d.canvas && !d.card && d.live <= 1, `flow: Home > Grownups > ${w} draws a canvas, no retry card (${r}, live contexts ${d.live})`);
      await backToGrownups(page);
      ok((await page.evaluate(() => window.__liveGL())) === 0, `flow: Back from ${w} leaves no live context`);
    }
    // back to Home, and look again: 3D is still on for the session (noTrain never set)
    ok(await goHome3d(page), 'flow: after the previews Home is still 3D (noTrain stays false)');
    await gate(page);
    ok(await lookAt(page, 'W5') === 'canvas', 'flow: a second round Home > Grownups > W5 still draws');
    ok(errors.length === 0, `flow: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // 2. a forced first failure recovers through the retry (a fresh canvas in the soft configuration), noTrain stays false
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, devSeed(), { init: [() => { window.__fail3d = 0; }] });
    await until(page, () => window.__train && window.__train.frames > 0, null, 30000);
    await gate(page);
    await page.evaluate(() => { window.__fail3d = 1; });
    const r = await lookAt(page, 'W5');
    const d = await page.evaluate(() => ({ soft: window.__train.soft, left: window.__fail3d, card: !!document.querySelector('.retry-card'), live: window.__liveGL() }));
    ok(r === 'canvas' && d.soft === true && d.left === 0 && !d.card && d.live <= 1, `flow: a forced first failure recovers on the retry (soft configuration: ${d.soft}, one context live: ${d.live})`);
    await backToGrownups(page);
    ok(await goHome3d(page) && (await page.evaluate(() => document.querySelector('.home3d').dataset.renderer)) === 'webgl', 'flow: after a recovered preview Home is still 3D, not the 2D path (noTrain false)');
    ok(errors.length === 0, `flow retry: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // 3. both attempts fail: the card shows the real error in developer mode (and only then), Try again works, noTrain stays false
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, devSeed(), { init: [() => { window.__fail3d = 0; }] });
    await until(page, () => window.__train && window.__train.frames > 0, null, 30000);
    await gate(page);
    await page.evaluate(() => { window.__fail3d = 2; });
    const r = await lookAt(page, 'W6');
    const txt = r === 'card' ? await page.evaluate(() => ({ p: document.querySelector('.retry-card p').textContent.trim(), err: (document.querySelector('.retry-error') || {}).textContent || '' })) : null;
    ok(r === 'card' && txt.p === 'This preview needs 3D.' && /forced 3D failure/.test(txt.err), `flow: both attempts failed, developer mode shows the actual error ("${txt && txt.err}")`);
    await page.evaluate(() => { window.__fail3d = 0; });
    await page.locator('.retry-card .btn', { hasText: 'Try again' }).click();
    ok(await until(page, () => window.__train && window.__train.region && window.__train.world === 'W6' && window.__train.frames > 0, null, 30000), 'flow: "Try again" on the card then draws the world');
    await backToGrownups(page);
    ok(await goHome3d(page) && (await page.evaluate(() => document.querySelector('.home3d').dataset.renderer)) === 'webgl', 'flow: even after a failed preview Home is still 3D (noTrain false)');
    ok(errors.length === 0, `flow failed: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // 4. without developer mode the card shows no error text; with no WebGL at all it still tells the developer why
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, seed(4), { init: [() => { window.__fail3d = 2; }], route: '#/world/W3' });
    await page.waitForSelector('.retry-card');
    ok((await page.textContent('.retry-card p')).trim() === 'This preview needs 3D.' && (await page.locator('.retry-error').count()) === 0, 'flow: no developer mode, no error text on the card');
    ok(errors.length === 0, `flow non-dev: errors ${errors.join(' | ')}`);
    await ctx.close();
    const m = await openHome(browser, url, vp, devSeed(), { init: [NO_WEBGL], route: '#/world/W3' });
    await m.page.waitForSelector('.retry-card');
    ok(/WebGL could not make a context/.test(await m.page.locator('.retry-error').textContent()), 'flow: no WebGL at all, developer mode says the context could not be made');
    await m.ctx.close();
  }
  // 5. a first getContext that returns null (a phone at its context limit) recovers through the retry with a fresh canvas
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, seed(4), { init: [NULL_FIRST], route: '#/world/W4' });
    ok(await until(page, () => window.__train && window.__train.region && window.__train.frames > 0, null, 30000) && !(await page.evaluate(() => !!document.querySelector('.retry-card'))), 'limit: the first context refused (null), the retry draws the world');
    ok(errors.length === 0, `limit null: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // 6. under a WebGL context limit: 24 extra contexts made first, then the whole flow
  {
    const { ctx, page, errors } = await openHome(browser, url, vp, devSeed(), { init: [EXTRA_CONTEXTS] });
    ok(await until(page, () => window.__train && window.__train.frames > 0, null, 30000), 'limit: Home still draws with 24 other contexts around');
    await gate(page);
    const res = [];
    for (const w of ['W3', 'W5', 'W7']) { res.push(await lookAt(page, w)); await backToGrownups(page); }
    ok(res.every((x) => x === 'canvas'), `limit: Grownups > worlds under a context limit all draw (${res.join(' ')})`);
    ok(await goHome3d(page), 'limit: Home is 3D again afterwards');
    ok(errors.length === 0, `limit: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// Screenshots for the owner (docs/screenshots/regions/): each region's overview, a mid-track view, the end portal close up and the start tunnel.
export async function shotChecks({ browser, url }) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  for (const w of Object.keys(WANT).filter((k) => process.argv.includes('--all-shots') || +k.slice(1) >= 5)) for (const vp of SHOT_VPS) { // W3 and W4 shots are kept; --all-shots redraws them
    const { ctx, page } = await preview(browser, url, vp, w, { hq: true });
    await page.waitForTimeout(3500);
    const shot = (name) => page.screenshot({ path: path.join(SHOT_DIR, `${w}-${name}-${vp.name}.png`) });
    await shot('overview');
    await page.evaluate(() => window.__train.show(Math.min(3, window.__train.stopCount - 1))); await page.waitForTimeout(500); await shot('midtrack');
    await page.evaluate(() => window.__train.show(window.__train.stopCount - 1)); await page.waitForTimeout(300);
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
  await flowChecks({ browser, url, ok });
  if (SHOTS) await shotChecks({ browser, url });
  await browser.close(); server.close();
  console.log(`regions: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
