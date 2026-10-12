// Easter egg: Fishing with Pip (docs/NEXT.md item 8, js/screens/fishing.js). Three quick taps on the river of the 3D Home open it
// (two do not); the module is loaded by import() on the third tap and is not in the service worker's precache; the fish carry only
// sounds the child has learned; a wrong fish only wiggles, a right one is caught into the bucket, five fill it; nothing is written to
// the progress; Back returns to the railway; it fits 360x640, 390x844 and 915x412 with 48 px targets; it is cool (no frame loop, no
// endless animation) and still under reduced motion. Run alone with `node test/fishing.mjs [--shots]`.
// Screenshots (with --shots) go to docs/screenshots/idle-fishing/.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startServer, loadPlaywright, launch } from './lib.mjs';
import { openHome, state, until, iL, RAF_COUNT } from './train.mjs';

const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/idle-fishing');
const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const VPS = [
  { name: 'small-360x640', width: 360, height: 640, deviceScaleFactor: 2 },
  { name: 'phone-390x844', width: 390, height: 844, deviceScaleFactor: 3 },
  { name: 'land-915x412', width: 915, height: 412, deviceScaleFactor: 2.6 },
];
const DONE = 4;
const LEARNED = CUR.lessons.slice(0, DONE).map((l) => l.sound);
const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) }); } };
const raw = (page) => page.evaluate(() => localStorage.getItem('reading.v1'));

// settle Home, then the point on the screen where the river is (a little off the bridge)
async function riverPoint(page) {
  ok_(await until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, 25000), 'home settles');
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.__train.riverSpot());
  await page.waitForTimeout(800);
  const pt = await page.evaluate(() => window.__train.riverSpot());
  await page.waitForTimeout(300);
  return { x: pt.x + 24, y: pt.y + 6 };
}
let ok_ = () => {};

export async function fishingChecks({ browser, url, ok, vp, shots = false }) {
  ok_ = ok;
  const tag = vp.name;
  const { ctx, page, errors } = await openHome(browser, url, vp, state(DONE, { trainAt: iL(DONE) }), { init: [RAF_COUNT] });
  const fetched = [];
  page.on('request', (r) => { if (/fishing\.js/.test(r.url())) fetched.push(r.url()); });
  const rp = await riverPoint(page);
  const before = await raw(page);
  // two taps are not enough
  await page.mouse.click(rp.x, rp.y); await page.waitForTimeout(150); await page.mouse.click(rp.x, rp.y);
  await page.waitForTimeout(1900);
  ok(!(await page.$('.fishing')) && fetched.length === 0 && (await page.evaluate(() => location.hash)) === '#/home', `${tag}: two taps on the river do not open the game, and its module is not even fetched`);
  // three taps spread over more than 1.5 s are not enough either
  await page.mouse.click(rp.x, rp.y); await page.waitForTimeout(800); await page.mouse.click(rp.x, rp.y); await page.waitForTimeout(800); await page.mouse.click(rp.x, rp.y);
  await page.waitForTimeout(600);
  ok(!(await page.$('.fishing')) && fetched.length === 0, `${tag}: three slow taps do not open it`);
  await page.waitForTimeout(1500);
  // three quick taps elsewhere (the sky) do nothing
  for (let k = 0; k < 3; k++) { await page.mouse.click(vp.width / 2, 120); await page.waitForTimeout(120); }
  await page.waitForTimeout(500);
  ok(!(await page.$('.fishing')) && fetched.length === 0, `${tag}: three taps off the river do nothing`);
  // three quick taps on the river
  for (let k = 0; k < 3; k++) { await page.mouse.click(rp.x, rp.y); await page.waitForTimeout(160); }
  ok(await until(page, () => !!document.querySelector('.fishing .fish-btn'), null, 8000), `${tag}: three quick taps on the river open Fishing with Pip`);
  ok(fetched.length === 1 && (await page.evaluate(() => location.hash)) === '#/fishing', `${tag}: the game module was loaded by import() on the third tap (${fetched.length} request)`);
  // learned sounds only
  const sounds = await page.$$eval('.fish-btn', (bs) => bs.map((b) => b.dataset.sound));
  ok(sounds.length === 5 && sounds.every((s) => LEARNED.includes(s)), `${tag}: only learned sounds swim here (${sounds.join(',')} of ${LEARNED.join(',')})`);
  const target = await page.$eval('.fish-card', (c) => c.dataset.target);
  ok(LEARNED.includes(target) && sounds.includes(target), `${tag}: the card names a learned sound that has a fish (${target})`);
  const hint = await page.$eval('.fish-card', (c) => c.textContent);
  ok(/Say it, then catch it!/.test(hint) && /Say: |Catch the fish that says this/.test(hint), `${tag}: the card says "Say it, then catch it!" and gives the grown-up prompt (${hint.replace(/\s+/g, ' ').slice(0, 90)})`);
  ok((await page.evaluate(() => window.__speechLog || []).catch(() => [])).every((s) => !/^[a-z]$/i.test(String(s && s.tts || ''))), `${tag}: the phone voice never says a bare letter`);
  // the layout (after the screen transition)
  await page.waitForTimeout(700);
  const lay = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, bad = [];
    for (const el of document.querySelectorAll('.fish-back, .fish-replay, .fish-btn')) { const r = el.getBoundingClientRect(); if (r.width < 48 || r.height < 48) bad.push(`${el.className} ${Math.round(r.width)}x${Math.round(r.height)}`); }
    for (const sel of ['.fish-back', '.fish-card', '.fish-bucket', '.fish-pip']) { const r = document.querySelector(sel).getBoundingClientRect(); if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) bad.push(`${sel} outside ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`); }
    const card = document.querySelector('.fish-card').getBoundingClientRect(), bank = document.querySelector('.fish-bank').getBoundingClientRect();
    const river = document.querySelector('.fish-river').getBoundingClientRect();
    if (river.height < 120) bad.push(`river only ${Math.round(river.height)} px tall`);
    return { bad, scrollW: document.documentElement.scrollWidth, vw, vh, card: Math.round(card.bottom), bank: Math.round(bank.top) };
  });
  ok(lay.bad.length === 0 && lay.scrollW <= lay.vw, `${tag}: it fits, targets are at least 48 px, no sideways scroll (${lay.bad.join(' | ')} scrollW ${lay.scrollW} of ${lay.vw})`);
  // heat: no frame loop, no endless animation
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(2500);
  const heat = await page.evaluate((r) => ({ raf: window.__raf - r, endless: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().endTime === Infinity).length }), r0);
  ok(heat.raf <= 2 && heat.endless === 0, `${tag}: heat, ${heat.raf} animation frames in 2.5 s and ${heat.endless} endless animations`);
  if (shots) await shot(page, `fishing-start-${tag}`);
  // a wrong fish only wiggles and swims on
  const wrong = await page.evaluate((t) => { const b = [...document.querySelectorAll('.fish-btn')].find((x) => x.dataset.sound !== t); if (b) b.click(); return !!b; }, target);
  await page.waitForTimeout(700);
  const afterWrong = await page.evaluate(() => ({ n: document.querySelector('.fish-bucket').dataset.count, fish: document.querySelectorAll('.fish-btn').length, t: document.querySelector('.fish-card').dataset.target, red: !!document.querySelector('.fish-cross, .wrong') }));
  ok(!wrong || (afterWrong.n === '0' && afterWrong.fish === 5 && afterWrong.t === target && !afterWrong.red), `${tag}: a wrong fish just wiggles (nothing caught, same card, no cross)`);
  // catch five
  for (let n = 1; n <= 5; n++) {
    await page.evaluate(() => { const t = document.querySelector('.fish-card').dataset.target; document.querySelector(`.fish-btn[data-sound="${t}"]`).click(); });
    if (shots && n === 1) { await page.waitForTimeout(520); await shot(page, `fishing-catch-${tag}`); }
    ok(await until(page, (k) => document.querySelector('.fish-bucket').dataset.count === String(k), n, 6000), `${tag}: catch ${n} drops into Pip's bucket`);
    if (n < 5) ok(await until(page, () => document.querySelectorAll('.fish-btn').length === 5 && !!document.querySelector(`.fish-btn[data-sound="${document.querySelector('.fish-card').dataset.target}"]`), null, 6000), `${tag}: after catch ${n} there are five fish again, with the new card's fish among them`);
  }
  ok(await until(page, () => { const e = document.querySelector('.fish-end'); return e && !e.hidden; }, null, 6000), `${tag}: five catches fill the bucket and Pip cheers`);
  const endBtns = await page.$$eval('.fish-end .btn', (bs) => bs.map((b) => ({ t: b.textContent, h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width, bottom: b.getBoundingClientRect().bottom, vh: innerHeight })));
  ok(endBtns.length === 2 && endBtns.every((b) => b.h >= 48 && b.bottom <= b.vh) && /Fish again/.test(endBtns[0].t) && /railway/.test(endBtns[1].t), `${tag}: "Fish again" and "Back to the railway" are real, visible targets (${JSON.stringify(endBtns.map((b) => [b.t, Math.round(b.h)]))})`);
  if (shots) await shot(page, `fishing-five-${tag}`);
  await page.click('.fish-again');
  ok(await until(page, () => document.querySelector('.fish-bucket').dataset.count === '0' && document.querySelectorAll('.fish-btn').length === 5, null, 4000), `${tag}: "Fish again" starts over with an empty bucket`);
  // no progress written
  ok((await raw(page)) === before, `${tag}: playing records no progress (the stored state is unchanged)`);
  // back to the railway
  await page.click('.fish-back');
  ok(await until(page, () => location.hash === '#/home' && !!document.querySelector('.home3d'), null, 15000), `${tag}: Back returns to the railway`);
  ok((await raw(page)) === before, `${tag}: and the stored state is still unchanged`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

export async function fishingExtraChecks({ browser, url, ok }) {
  const vp = VPS[1];
  // not precached
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  ok(!/fishing/.test(sw), 'fishing: no fishing file is in the service worker precache (APP_FILES), it caches on first use');
  ok(fs.existsSync(path.join(ROOT, 'js/screens/fishing.js')) && /fishing\.js/.test(fs.readFileSync(path.join(ROOT, 'js/screens/home3d.js'), 'utf8')) && /import\('\.\/fishing\.js'\)/.test(fs.readFileSync(path.join(ROOT, 'js/screens/home3d.js'), 'utf8')) && !/^import .*fishing/m.test(fs.readFileSync(path.join(ROOT, 'js/screens/home3d.js'), 'utf8')), 'fishing: home3d loads the game with import() and never statically');
  {
    // nothing learned yet: no fish, a friendly note and a way back
    const { ctx, page, errors } = await openHome(browser, url, vp, state(0), { route: '#/fishing' });
    ok(await until(page, () => !!document.querySelector('.fish-end.empty'), null, 8000), 'fishing: with no sound learned there are no fish, only a friendly note');
    ok((await page.$$('.fish-btn')).length === 0, 'fishing: no letter fish for sounds the child has not learned');
    await page.click('.fish-end .btn');
    ok(await until(page, () => location.hash === '#/home', null, 8000), 'fishing: the note has a way back to the railway');
    ok(errors.length === 0, `fishing, empty: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // reduced motion: the fish hold still, and a catch is still possible
    const { ctx, page, errors } = await openHome(browser, url, vp, state(DONE, { trainAt: iL(DONE) }), { route: '#/fishing', extra: { reducedMotion: 'reduce' } });
    ok(await until(page, () => document.querySelectorAll('.fish-btn').length === 5, null, 8000), 'fishing, reduced motion: the fish are there');
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
    ok(running === 0, `fishing, reduced motion: the fish hold still (${running} running animations)`);
    await page.evaluate(() => { const t = document.querySelector('.fish-card').dataset.target; document.querySelector(`.fish-btn[data-sound="${t}"]`).click(); });
    ok(await until(page, () => document.querySelector('.fish-bucket').dataset.count === '1', null, 5000), 'fishing, reduced motion: a catch still works');
    ok(errors.length === 0, `fishing, reduced motion: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  {
    // the recorded sound plays instead of the prompt when the parent has switched it on; the phone's voice never says the letter
    const { ctx, page, errors } = await openHome(browser, url, vp, state(DONE, { trainAt: iL(DONE), playSounds: true }), { route: '#/fishing' });
    ok(await until(page, () => document.querySelectorAll('.fish-btn').length === 5, null, 8000), 'fishing, recorded sounds on: the game opens');
    const said = await page.evaluate(() => (window.__said || []).slice());
    ok(said.every((p) => !p.tts || p.tts.length > 1), `fishing, recorded sounds on: nothing is spoken by the phone voice (${JSON.stringify(said)})`);
    ok(errors.length === 0, `fishing, recorded sounds on: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  for (const vp of VPS) await fishingChecks({ browser, url, ok, vp, shots: SHOTS });
  await fishingExtraChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`fishing: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
