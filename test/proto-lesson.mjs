// Prototype 4: the eight-step lesson for f (#/proto/f, data/proto-lesson-f.json, js/screens/tasks/proto/*).
// Walks all eight steps at 390x844 twice (the grown-up says the sounds: prompts; and with recordings present), and checks:
// the phone's voice never says an isolated or stretched sound, retrieval comes first, Help runs the correction script (the
// tricky letter lights, the sound and the blend model show or play, the item returns once), Build It accepts the right
// spelling and rejects a wrong one without fixing it, the word chain, the meaning question, reduced motion, idle frames,
// touch targets at three sizes and no console errors. Run alone with `node test/proto-lesson.mjs`; SHOTS=1 also saves the
// screenshots in docs/screenshots/proto-f/ (390x844 every step, 915x412 for the warm-up, Build It and the story).
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB, silentWav } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, touchDrag } from './lib.mjs';

const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/proto-lesson-f.json'), 'utf8'));
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/proto-f');
const IDS = DATA.steps.map((s) => s.id);
const SEEN = Object.fromEntries(IDS.flatMap((id) => [[`proto-f:${id}`, true], [`tip:proto-f:${id}`, true]]));
const PHONE = { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 };
const SMALL = { name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 };
const LAND = { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 };
const STORY = DATA.story.lines.map((l) => l.text).join(' ');

const RAF_COUNT = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
// With this a blend recording is "missing": the audio stub's error path, for the blend files only.
const BLENDS_MISSING = () => {
  const Prev = window.Audio;
  window.Audio = function () {
    const a = new Prev(), play = a.play;
    a.play = () => (a.src.includes('/blends/') ? new Promise((_, rej) => setTimeout(() => { a.dispatchEvent(new Event('error')); rej(new Error('missing')); }, 5)) : play());
    return a;
  };
};
const tapEl = async (page, loc) => { const b = await loc.first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
const sel = (page, s) => page.locator(s);
const text = (page, s) => page.evaluate((q) => { const e = document.querySelector(q); return e ? e.textContent.trim() : null; }, s);
const dset = (page, s, k) => page.evaluate(([q, key]) => { const e = document.querySelector(q); return e ? e.dataset[key] : null; }, [s, k]);
const clips = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'clip').map((e) => e.src));
const ttsAll = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'tts').map((e) => e.text));
// The grown-up prompt shown in the step now ("Say: fff"), or null when none is.
const prompt = (page) => page.evaluate(() => { const p = [...document.querySelectorAll('.task-stage .say-prompt')].find((x) => !x.hidden && x.offsetParent); return p ? p.querySelector('.say-text').textContent : null; });
let shotsOn = true; // the walk with recordings plays the same screens: only the first (the grown-up says the sounds) is photographed
const shotOf = async (page, name) => { if (!process.env.SHOTS || !shotsOn) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };

// Opens the app on Home, taps once (sound unlocks, as it always has by the time a child is in a lesson), then goes to the step.
export async function open(browser, url, vp, { step = 0, settings = {}, reduced = false, missing = false, unseen = false } = {}) {
  const made = await newPage(browser, vp, reduced ? { reducedMotion: 'reduce' } : {});
  const { page } = made;
  await page.addInitScript(SPEECH_STUB);
  if (missing) await page.addInitScript(BLENDS_MISSING);
  await page.addInitScript(RAF_COUNT);
  // With recordings on, the sounds and blend models that are not recorded yet get a silent stand-in, so the recorded path is tested.
  if (settings.playSounds && !missing) {
    for (const k of ['f', 'i', 't', 'p']) await page.route(`**/assets/audio/sounds/${k}.mp3`, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }));
    await page.route('**/assets/audio/blends/*', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }));
  }
  await page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: {}, settings: { seenScripts: unseen ? {} : SEEN, ...settings }, firstRunDone: true, meetDue: false })}))`);
  await page.goto(url + '#/home');
  await page.waitForTimeout(500);
  await page.mouse.click(3, 300);
  await page.evaluate((s) => { location.hash = `#/proto/f/task/${s}`; }, step);
  await page.waitForSelector('.task-screen, .proto-finish', { timeout: 8000 });
  await page.waitForTimeout(700);
  return made;
}
const nextStep = async (page, i) => {
  await page.waitForFunction(() => { const b = document.querySelector('.btn.next'); return b && !b.disabled; }, null, { timeout: 4000 });
  await tapEl(page, sel(page, '.btn.next'));
  await page.waitForFunction((n) => location.hash.endsWith('/task/' + n), i, { timeout: 4000 });
  await page.waitForSelector('.task-screen, .proto-finish');
  await page.waitForTimeout(800);
};
// Next inside a step that has screens of its own (New Sound, the story): it goes to the next screen, not the next step.
const nextInner = async (page) => {
  await page.waitForFunction(() => { const b = document.querySelector('.btn.next'); return b && !b.disabled; }, null, { timeout: 4000 });
  await tapEl(page, sel(page, '.btn.next'));
  await page.waitForTimeout(500);
};
const got = async (page) => { await tapEl(page, sel(page, '.judge-btn.got')); await page.waitForTimeout(800); };
const slide = async (page) => {
  const b = await sel(page, '.slide-band').boundingBox();
  await touchDrag(page, { x: b.x + 6, y: b.y + b.height / 2 }, { x: b.x + b.width - 6, y: b.y + b.height / 2 }, { steps: 22 });
};
const btnByText = (page, t) => page.locator('.task-stage button', { hasText: t });

// After the step has settled: 3 s of idle, at most 2 animation frames and no endless animation.
async function idleCheck(page, ok, tag) {
  await page.waitForTimeout(1500);
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(3000);
  const frames = (await page.evaluate(() => window.__raf)) - r0;
  const endless = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect.getComputedTiming().endTime === Infinity).length);
  ok(frames <= 2, `${tag}: at most 2 frames in 3 s while idle (${frames})`);
  ok(endless === 0, `${tag}: no endless animation (${endless})`);
}

// Never an isolated or stretched sound in anything the phone's voice was asked to say.
const SOUNDY = (t) => /^\s*[a-z]\s*$/i.test(t) || /(^|[^a-z])([a-z])\2{2,}/i.test(t) || /\b[a-z]-(?!\w)/i.test(t) || /\b[a-z]-[a-z]/i.test(t);

// ---- the walk through all eight steps ----
async function walk(browser, url, ok, mode) {
  const clipMode = mode === 'recordings';
  shotsOn = !clipMode;
  const { ctx, page, errors } = await open(browser, url, PHONE, { step: 0, settings: { playSounds: clipMode, migrated1912: true } });
  const T = (s) => `${mode}: ${s}`;

  // 1. Sound Warm-up
  await page.waitForSelector('.proto.warmup .wu-row');
  await page.waitForTimeout(1800);
  ok((await dset(page, '.proto.warmup', 'word')) === 'sat', T('warm-up starts with sat'));
  if (clipMode) { ok((await prompt(page)) === null, T('the blend prompt stays away while the recording plays')); ok((await clips(page)).includes('sat.mp3'), T('the sat blend recording played')); }
  else { ok((await prompt(page)) === 'Say: sssaaat-', T(`the blend model shows as a prompt (${await prompt(page)})`)); ok((await clips(page)).length === 0, T('no clip plays with recordings off')); }
  ok((await sel(page, '.glyph-letter').count()) === 3 && (await sel(page, '.tile-bg').count()) === 3, T('three letter tiles'));
  const gap = await page.evaluate(() => { const l = [...document.querySelectorAll('.glyph-letter')].map((g) => g.getBoundingClientRect()); return l[1].left - l[0].right; });
  ok(gap > 12, T(`the tiles stand apart (${Math.round(gap)} px)`));
  await shotOf(page, '01a-warmup-blend');
  await slide(page);
  await page.waitForFunction(() => document.querySelector('.proto.warmup').dataset.state === 'blended', null, { timeout: 3000 });
  await page.waitForSelector('.wu-pic .pic-frame', { timeout: 3000 });
  await page.waitForTimeout(900);
  ok(await sel(page, '.wu-pic .pic-frame').count() === 1, T('the picture of sat appears after the slide'));
  ok((await ttsAll(page)).includes('sat'), T('the whole word sat is spoken after the slide'));
  await shotOf(page, '01b-warmup-picture');
  await tapEl(page, sel(page, '.px-next')); await page.waitForTimeout(700);
  ok((await dset(page, '.proto.warmup', 'word')) === 'map', T('then map'));
  await slide(page);
  await page.waitForFunction(() => document.querySelector('.proto.warmup').dataset.state === 'blended', null, { timeout: 3000 });
  await page.waitForSelector('.px-next', { timeout: 3000 });
  await tapEl(page, sel(page, '.px-next')); await page.waitForTimeout(700);
  ok((await dset(page, '.proto.warmup', 'round')) === 'b' && (await dset(page, '.proto.warmup', 'word')) === 'mat', T('round B starts with mat'));
  ok((await sel(page, '.wu-box').count()) === 3 && (await sel(page, '.wu-box.filled').count()) === 0, T('three empty boxes'));
  await shotOf(page, '01c-warmup-break');
  for (let k = 0; k < 3; k++) { await tapEl(page, sel(page, '.wu-box:not(.filled)')); await page.waitForTimeout(350); }
  const letters = await page.evaluate(() => [...document.querySelectorAll('.wu-box [data-letter]')].map((e) => e.dataset.letter).join(''));
  ok(letters === 'mat', T(`each tap reveals the next letter (${letters})`));
  await shotOf(page, '01d-warmup-break-done');
  await page.waitForSelector('.px-next', { timeout: 3000 });
  await tapEl(page, sel(page, '.px-next')); await page.waitForTimeout(600);
  ok((await dset(page, '.proto.warmup', 'word')) === 'sip', T('then sip'));
  for (let k = 0; k < 3; k++) { await tapEl(page, sel(page, '.wu-box:not(.filled)')); await page.waitForTimeout(350); }
  await page.waitForFunction(() => document.querySelector('.proto.warmup').dataset.state === 'done', null, { timeout: 3000 });
  ok(true, T('the warm-up reaches done'));
  if (!clipMode) await idleCheck(page, ok, T('warm-up'));
  await nextStep(page, 1);

  // 2. Quick Review
  await page.waitForSelector('.proto.recall .rc-card');
  const c0 = (await clips(page)).length;
  ok((await dset(page, '.rc-card', 'letter')) === 'p', T('the first card is p'));
  ok((await prompt(page)) === null && (await clips(page)).length === c0, T('retrieval first: nothing says the sound before the child tries'));
  ok(await page.evaluate(() => document.querySelector('.proto.recall .px-hear').hidden), T('"Hear it" is not offered at first'));
  await shotOf(page, '02a-review-card');
  if (!clipMode) await idleCheck(page, ok, T('review card'));
  await page.waitForFunction(() => !document.querySelector('.proto.recall .px-hear').hidden, null, { timeout: 4000 });
  ok(true, T('"Hear it" appears after a moment'));
  await shotOf(page, '02b-review-hear-it');
  await tapEl(page, sel(page, '.judge-btn.help')); await page.waitForTimeout(700);
  if (clipMode) { ok((await clips(page)).includes('p.mp3'), T('Help plays the p recording')); ok((await prompt(page)) === null, T('no prompt while the recording plays')); }
  else ok((await prompt(page)) === 'Say: p-', T(`Help shows the prompt for p (${await prompt(page)})`));
  ok(/comes back/.test((await text(page, '.ri-panel')) || ''), T('Help says the card comes back'));
  await shotOf(page, '02c-review-help');
  await tapEl(page, btnByText(page, 'Said it again')); await page.waitForTimeout(700);
  const order = [];
  for (let k = 0; k < 3; k++) { order.push(await dset(page, '.rc-card', 'letter')); await got(page); }
  ok(order.join('') === 'tim', T(`then t, i, m (${order})`));
  ok((await dset(page, '.rc-card', 'letter')) === 'p' && (await sel(page, '.rc-card.back').count()) === 1, T('the helped card p comes back once at the end'));
  await got(page);
  // two review words, with the correction script
  await page.waitForSelector('.proto.recall .reading-item');
  ok((await dset(page, '.proto.recall', 'word')) === 'sat', T('first review word is sat'));
  ok((await prompt(page)) === null, T('no sound shown before Help on a word'));
  await tapEl(page, sel(page, '.judge-btn.help')); await page.waitForTimeout(500);
  ok(/Tap the letter that was tricky/.test((await text(page, '.ri-panel')) || ''), T('Help asks for the tricky letter'));
  await tapEl(page, sel(page, '.ltile:nth-child(2)')); await page.waitForTimeout(600);
  ok(await sel(page, '.ltile.tricky').count() === 1 && (await page.evaluate(() => document.querySelector('.ltile.tricky').dataset.i)) === '1', T('the tapped letter lights'));
  if (clipMode) ok((await clips(page)).includes('a.mp3'), T("the tricky letter's recording plays")); else ok((await prompt(page)) === 'Say: aaa (as in apple)', T(`its sound shows (${await prompt(page)})`));
  await shotOf(page, '02d-review-word-help');
  await tapEl(page, btnByText(page, 'Now blend the word')); await page.waitForTimeout(800);
  if (clipMode) ok((await clips(page)).includes('sat.mp3'), T('the blend model plays')); else ok((await prompt(page)) === 'Say: sssaaat-', T(`the blend model shows (${await prompt(page)})`));
  ok(await sel(page, '.ltile.lit').count() >= 1, T('the letters light in turn while the model plays'));
  await tapEl(page, btnByText(page, 'Done')); await page.waitForTimeout(700);
  ok((await dset(page, '.proto.recall', 'word')) === 'tip', T('then tip'));
  await got(page);
  ok((await dset(page, '.proto.recall', 'word')) === 'sat', T('the helped word sat comes back once'));
  await got(page);
  // Wagon Parade for p
  await page.waitForSelector('.wagons-scene');
  await page.waitForTimeout(900);
  ok((await text(page, '.find-card')) === 'Say it, then find it!', T('the find card says "Say it, then find it!"'));
  const c1 = (await clips(page)).length;
  ok(await page.evaluate(() => document.querySelector('.say-hear').classList.contains('later')), T('the bell waits until the child has tried'));
  ok((await prompt(page)) === null && (await clips(page)).length === c1, T('no sound before the first tap in the parade'));
  await shotOf(page, '02e-review-wagons');
  const aim = async (s) => page.evaluate((q) => { const l = [...document.querySelectorAll(q)].map((b) => b.getBoundingClientRect()).filter((r) => r.left > 6 && r.right < innerWidth - 6 && r.top > 0); const r = l[0]; return r ? { x: r.x + r.width / 2, y: r.y + r.height * 0.7 } : null; }, s);
  if (!clipMode) {
    // a wrong wagon only wobbles: there is no red cross in this step
    let bad = null;
    for (let i = 0; i < 40 && !bad; i++) { bad = await aim('.parade-wagon[data-target="0"]'); if (!bad) await page.waitForTimeout(250); }
    await page.touchscreen.tap(bad.x, bad.y); await page.waitForTimeout(300);
    ok((await sel(page, '.no-x').count()) === 0, T('a wrong wagon shows no red cross'));
    ok((await prompt(page)) === 'Say: p-', T(`after the first tap the sound shows (${await prompt(page)})`));
    for (let i = 0; i < 160 && (await dset(page, '.wagons', 'state')) !== 'done'; i++) {
      const t = await aim('.parade-wagon[data-target="1"]:not([style*="pointer-events"])');
      if (t) { await page.touchscreen.tap(t.x, t.y); await page.waitForTimeout(400); } else await page.waitForTimeout(200);
    }
    await page.waitForFunction(() => document.querySelector('.wagons').dataset.state === 'done', null, { timeout: 15000 }).catch(() => {});
    ok((await dset(page, '.wagons', 'state')) === 'done', T('two parades reach done'));
    ok(!(await page.evaluate(() => document.querySelector('.say-hear').classList.contains('later'))), T('the bell came back after the first tap'));
    await idleCheck(page, ok, T('review done'));
  }
  await nextStep(page, 2);

  // 3. New Sound: f
  await page.waitForSelector('.proto.newsound .ns-art');
  await page.waitForTimeout(600);
  ok(await sel(page, '.ns-art .flower').count() === 1 && await sel(page, '.ns-art .plain').count() === 1, T('the flower f and the plain f'));
  if (clipMode) { ok((await prompt(page)) === null, T('no prompt while the f recording plays')); ok((await clips(page)).includes('f.mp3'), T('the f recording played')); }
  else ok((await prompt(page)) === 'Say: fff, a long breath through your teeth', T(`the f prompt (${await prompt(page)})`));
  ok((await ttsAll(page)).includes('flower'), T('the word flower is spoken'));
  await shotOf(page, '03a-new-flower');
  await page.waitForFunction(() => document.querySelector('.ns-art').classList.contains('morphed'), null, { timeout: 5000 });
  await page.waitForTimeout(900);
  ok(true, T('the flower fades to the plain f'));
  await shotOf(page, '03b-new-plain-f');
  await tapEl(page, sel(page, '.ns-toggle')); await page.waitForTimeout(500);
  ok(!(await page.evaluate(() => document.querySelector('.ns-art').classList.contains('morphed'))), T('"Show the flower" brings the flower back'));
  await nextInner(page);
  ok((await dset(page, '.proto.newsound', 'phase')) === 'mouth' && (await text(page, '.ns-line')) === 'Top teeth on your bottom lip, and blow: fff. Not fuh.', T('the mouth card with the grown-up line'));
  await page.waitForTimeout(1200);
  await shotOf(page, '03c-new-mouth');
  await nextInner(page);
  ok((await dset(page, '.proto.newsound', 'phase')) === 'say', T('say it three times'));
  for (let k = 0; k < 3; k++) { await tapEl(page, sel(page, '.ns-dot:not(.on)')); await page.waitForTimeout(300); }
  ok((await dset(page, '.proto.newsound', 'said')) === '3', T('three dots filled'));
  await page.waitForTimeout(500);
  await shotOf(page, '03d-new-say');
  await nextInner(page);
  ok((await dset(page, '.proto.newsound', 'phase')) === 'trace', T('then tracing'));
  await page.waitForSelector('.trace-pad'); await page.waitForTimeout(500);
  await shotOf(page, '03e-new-trace');
  const pad = await sel(page, '.tp-ink').boundingBox();
  for (const [a, b] of [[[0.55, 0.28], [0.4, 0.8]], [[0.3, 0.5], [0.62, 0.5]]]) {
    await page.mouse.move(pad.x + pad.width * a[0], pad.y + pad.height * a[1]); await page.mouse.down();
    await page.mouse.move(pad.x + pad.width * (a[0] + b[0]) / 2, pad.y + pad.height * (a[1] + b[1]) / 2, { steps: 6 });
    await page.mouse.move(pad.x + pad.width * b[0], pad.y + pad.height * b[1], { steps: 6 }); await page.mouse.up();
  }
  await page.waitForTimeout(300);
  ok(Number(await dset(page, '.proto.newsound', 'strokes')) >= 2, T('two strokes traced'));
  await nextStep(page, 3);

  // 4. Blend It
  await page.waitForSelector('.proto.blendit .glyph-row');
  await page.waitForTimeout(1000);
  ok((await dset(page, '.proto.blendit', 'word')) === 'fit' && (await dset(page, '.proto.blendit', 'mode')) === 'ido', T('I do with fit'));
  if (clipMode) ok((await clips(page)).includes('fit.mp3'), T('the fit blend recording played')); else ok((await prompt(page)) === 'Say: fffiiit-', T(`the blend prompt (${await prompt(page)})`));
  await page.waitForTimeout(1000);
  ok(await sel(page, '.glyph-letter.lit').count() >= 1, T('the letters light in turn under the marker'));
  await shotOf(page, '04a-blend-ido');
  await page.waitForSelector('.px-next', { timeout: 5000 });
  await tapEl(page, sel(page, '.px-next')); await page.waitForTimeout(600);
  ok((await dset(page, '.proto.blendit', 'mode')) === 'wedo' && (await sel(page, '.px-again').count()) === 1, T('We do, with "Again together"'));
  await shotOf(page, '04b-blend-wedo');
  await slide(page);
  await page.waitForFunction(() => document.querySelector('.proto.blendit').dataset.slid === '1', null, { timeout: 3000 });
  await page.waitForSelector('.px-next', { timeout: 3000 });
  await shotOf(page, '04c-blend-slid');
  for (const w of ['fat', 'if']) {
    await tapEl(page, sel(page, '.px-next')); await page.waitForTimeout(600);
    ok((await dset(page, '.proto.blendit', 'word')) === w, T(`then ${w}`));
    await page.waitForSelector('.px-next', { timeout: 5000 });
    await tapEl(page, sel(page, '.px-next')); await page.waitForTimeout(600);
    await slide(page);
    await page.waitForFunction(() => document.querySelector('.proto.blendit').dataset.slid === '1', null, { timeout: 3000 });
    await page.waitForTimeout(1200);
  }
  await page.waitForFunction(() => document.querySelector('.proto.blendit').dataset.state === 'done', null, { timeout: 3000 });
  ok(true, T('Blend It reaches done after three words'));
  if (!clipMode) await idleCheck(page, ok, T('blend it'));
  await nextStep(page, 4);

  // 5. Read It
  await page.waitForSelector('.proto.readit .ltile');
  await page.waitForTimeout(500);
  ok((await dset(page, '.proto.readit', 'word')) === 'fit', T('Read It starts with fit'));
  await shotOf(page, '05a-read-word');
  for (const w of ['fit', 'sat', 'if', 'map']) { ok((await dset(page, '.proto.readit', 'word')) === w, T(`word ${w}`)); await got(page); }
  ok((await dset(page, '.proto.readit', 'word')) === 'fat', T('word fat'));
  await tapEl(page, sel(page, '.judge-btn.help')); await page.waitForTimeout(500);
  await tapEl(page, sel(page, '.ltile:nth-child(2)')); await page.waitForTimeout(700);
  ok(await sel(page, '.ltile.tricky').count() === 1, T('the tricky letter of fat lights'));
  await shotOf(page, '05b-read-help-letter');
  await tapEl(page, btnByText(page, 'Now blend the word')); await page.waitForTimeout(1400);
  if (!clipMode) ok((await prompt(page)) === 'Say: fffaaat-', T(`the blend model for fat (${await prompt(page)})`));
  await shotOf(page, '05c-read-help-blend');
  await tapEl(page, btnByText(page, 'Done')); await page.waitForTimeout(700);
  ok((await dset(page, '.proto.readit', 'word')) === 'sip', T('then sip'));
  await got(page);
  ok((await dset(page, '.proto.readit', 'word')) === 'fat' && (await dset(page, '.proto.readit', 'back')) === '1', T('fat comes back once at the end'));
  await got(page);
  await page.waitForSelector('.rd-results');
  ok((await text(page, '.rd-line')) === '5 of 6 first try. fat came back.', T(`the results line (${await text(page, '.rd-line')})`));
  await page.waitForTimeout(400);
  await shotOf(page, '05d-read-results');
  if (!clipMode) await idleCheck(page, ok, T('read it results'));
  await nextStep(page, 5);

  // 6. Build It
  await page.waitForSelector('.proto.buildit .bi-tile');
  await page.waitForTimeout(500);
  ok((await ttsAll(page)).includes('fat'), T('the phone says the whole word fat'));
  ok((await sel(page, '.bi-slot').count()) === 3 && (await sel(page, '.bi-tile').count()) === 7, T('three boxes and seven tiles'));
  ok((await page.evaluate(() => [...document.querySelectorAll('.bi-tile')].map((t) => t.dataset.letter).join(''))) === 'masitpf', T('the tray holds m a s i t p f'));
  await shotOf(page, '06a-build-empty');
  const tile = (ch) => sel(page, `.bi-tile[data-letter="${ch}"]`);
  await tapEl(page, tile('f')); await tapEl(page, tile('i')); await tapEl(page, tile('t')); await page.waitForTimeout(300);
  ok((await dset(page, '.proto.buildit', 'filled')) === 'fit' && (await dset(page, '.proto.buildit', 'wrong')) === '1', T('a wrong spelling is rejected'));
  ok(await page.evaluate(() => document.querySelectorAll('.bi-slot.off').length === 1 && document.querySelectorAll('.bi-slot')[1].classList.contains('off')), T('the misplaced box (the middle one) is marked'));
  ok(/listen for the middle sound/.test((await text(page, '.bi-hint-text')) || ''), T(`the hint names the middle sound (${await text(page, '.bi-hint-text')})`));
  await page.waitForTimeout(350);
  await shotOf(page, '06b-build-wrong');
  await page.waitForTimeout(900);
  ok((await dset(page, '.proto.buildit', 'filled')) === 'fit', T('the app does not fix the word by itself'));
  await tapEl(page, sel(page, '.bi-slot:nth-child(2)')); await page.waitForTimeout(250);
  ok((await dset(page, '.proto.buildit', 'filled')) === 'f t' || (await dset(page, '.proto.buildit', 'filled')) === 'ft', T('a tap on a filled box sends its tile back'));
  await tapEl(page, tile('a')); await page.waitForTimeout(500);
  ok((await dset(page, '.proto.buildit', 'state')) === 'right', T('the right spelling is accepted'));
  await shotOf(page, '06c-build-right');
  await page.waitForFunction(() => document.querySelector('.proto.buildit').dataset.idx === '1', null, { timeout: 5000 });
  ok(true, T('the chain starts'));
  await page.waitForTimeout(700);
  ok((await ttsAll(page)).includes('Change one letter to make fit.'), T('"Change one letter to make fit."'));
  ok((await dset(page, '.proto.buildit', 'filled')) === 'fat' && !(await page.evaluate(() => document.querySelector('.bi-slot.off, .bi-slot.right'))), T('the box to change is not marked'));
  await shotOf(page, '06d-build-chain');
  const swap = async (k, ch) => { await tapEl(page, sel(page, `.bi-slot:nth-child(${k + 1})`)); await page.waitForTimeout(200); await tapEl(page, tile(ch)); await page.waitForTimeout(500); };
  await swap(1, 'i');
  ok((await dset(page, '.proto.buildit', 'state')) === 'right', T('fat to fit'));
  await page.waitForFunction(() => document.querySelector('.proto.buildit').dataset.idx === '2', null, { timeout: 5000 });
  await page.waitForTimeout(500);
  await swap(0, 'p'); // pit, not sit: one wrong try
  ok((await dset(page, '.proto.buildit', 'filled')) === 'pit' && /Listen to the first sound/.test((await text(page, '.bi-hint-text')) || ''), T(`after one wrong try the hint names the place (${await text(page, '.bi-hint-text')})`));
  ok(await page.evaluate(() => document.querySelectorAll('.bi-slot.off').length === 0), T('no box is marked in the chain'));
  await shotOf(page, '06e-build-chain-hint');
  await swap(0, 's');
  ok((await dset(page, '.proto.buildit', 'state')) === 'right', T('fit to sit'));
  await page.waitForFunction(() => document.querySelector('.proto.buildit').dataset.idx === '3', null, { timeout: 5000 });
  await page.waitForTimeout(500);
  await swap(2, 'p');
  ok((await dset(page, '.proto.buildit', 'state')) === 'right', T('sit to sip'));
  await page.waitForFunction(() => document.querySelector('.proto.buildit').dataset.idx === '4', null, { timeout: 5000 });
  await page.waitForTimeout(500);
  await swap(0, 't');
  ok((await dset(page, '.proto.buildit', 'state')) === 'right', T('sip to tip'));
  await page.waitForFunction(() => document.querySelector('.proto.buildit').dataset.state === 'done', null, { timeout: 4000 });
  ok(true, T('the chain reaches done'));
  if (!clipMode) await idleCheck(page, ok, T('build it'));
  await nextStep(page, 6);

  // 7. Read a Story
  await page.waitForSelector('.proto.story .wtile');
  await page.waitForTimeout(500);
  ok(await sel(page, '.rs-scene > svg').count() === 1 && (await sel(page, '.wtile').count()) === 5, T('line 1 with its picture and five words'));
  const t0 = await ttsAll(page);
  ok(!t0.some((t) => t.includes('Sam sat')), T('the story is not read aloud before the child has read it'));
  await shotOf(page, '07a-story-line');
  await tapEl(page, sel(page, '.judge-btn.help')); await page.waitForTimeout(500);
  ok(/Tap the word that was tricky/.test((await text(page, '.ri-panel')) || ''), T('Help asks for the tricky word'));
  await tapEl(page, sel(page, '.wtile:nth-child(5)')); await page.waitForTimeout(700);
  ok(await sel(page, '.wtile.tricky').count() === 1, T('the tricky word lights'));
  if (clipMode) ok((await clips(page)).includes('map.mp3'), T('the blend model for map plays')); else ok((await prompt(page)) === 'Say: mmmaaap-', T(`the blend model for map (${await prompt(page)})`));
  await shotOf(page, '07b-story-help');
  await tapEl(page, btnByText(page, 'Read the whole line again')); await page.waitForTimeout(500);
  ok((await dset(page, '.reading-item', 'phase')) === 'again' && /whole line again/.test((await text(page, '.ri-panel')) || ''), T('"Read the whole line again", judged again'));
  await shotOf(page, '07c-story-again');
  await got(page);
  ok((await dset(page, '.proto.story', 'line')) === '1', T('line 2'));
  await got(page);
  ok((await dset(page, '.proto.story', 'line')) === '2', T('line 3'));
  await tapEl(page, sel(page, '.judge-btn.help')); await page.waitForTimeout(400);
  await tapEl(page, sel(page, '.wtile:nth-child(4)')); await page.waitForTimeout(600);
  ok(/heart word/.test((await text(page, '.ri-panel')) || '') && (await ttsAll(page)).includes('the'), T('a heart word is said whole, not blended'));
  await tapEl(page, btnByText(page, 'Read the whole line again')); await page.waitForTimeout(400);
  await got(page);
  ok((await dset(page, '.proto.story', 'line')) === '0', T('the helped line 1 comes back once'));
  await got(page);
  ok((await dset(page, '.proto.story', 'line')) === '2', T('and the helped line 3'));
  await got(page);
  await page.waitForSelector('.rs-page');
  ok((await sel(page, '.rs-row').count()) === 3, T('the whole story on one page'));
  ok(!(await ttsAll(page)).includes(STORY), T('still not read aloud'));
  await shotOf(page, '07d-story-page');
  await tapEl(page, btnByText(page, 'Hear the story')); await page.waitForTimeout(400);
  ok((await ttsAll(page)).includes(STORY), T('"Hear the story" speaks the whole story, after the child has read it'));
  await tapEl(page, btnByText(page, 'Again, faster')); await page.waitForTimeout(600);
  ok((await dset(page, '.proto.story', 'reads')) === '2', T('"Again, faster" starts a reread'));
  await shotOf(page, '07e-story-faster');
  await tapEl(page, btnByText(page, 'A question')); await page.waitForSelector('.rs-choice'); await page.waitForTimeout(500);
  ok((await text(page, '.rs-q')) === 'What is fat?' && (await sel(page, '.rs-choice').count()) === 3, T('"What is fat?" with three picture choices'));
  await shotOf(page, '07f-story-question');
  await tapEl(page, sel(page, '.rs-choice[data-choice="mat"]')); await page.waitForTimeout(600);
  ok((await dset(page, '.proto.story', 'answer')) === 'wrong' && !(await page.evaluate(() => document.querySelector('.rs-recheck').hidden)), T('a wrong pick: "Let\'s look again" and the line lights'));
  ok((await text(page, '.rs-recheck')) !== null && (await ttsAll(page)).includes("Let's look again."), T('the line It is a fat map! is shown again'));
  ok(!(await page.evaluate(() => document.querySelector('.proto.story .no-x, .proto.story [stroke="#E5484D"]'))), T('no red cross anywhere'));
  await shotOf(page, '07g-story-recheck');
  await tapEl(page, sel(page, '.rs-choice[data-choice="map"]')); await page.waitForTimeout(700);
  ok((await dset(page, '.proto.story', 'answer')) === 'right', T('map is the right answer'));
  ok(await page.evaluate(() => window.__audioNotes().some((n) => n.event === 'star')), T('a happy chime plays'));
  await shotOf(page, '07h-story-right');
  if (!clipMode) await idleCheck(page, ok, T('story'));
  await nextStep(page, 7);

  // 8. Celebrate
  await page.waitForSelector('.proto-finish');
  await page.waitForTimeout(1500);
  ok((await text(page, '.proto-finish h1')) === 'You read your first f words!', T('the heading'));
  ok((await page.evaluate(() => [...document.querySelectorAll('.pf-word')].map((w) => w.dataset.word).join(' '))) === 'fit fat if', T('the three new words'));
  ok((await text(page, '.pf-tip')) === 'Did you know?' + DATA.celebrate.didYouKnow, T('the Did you know card'));
  ok(await sel(page, '.finish-pip').count() === 1 && await sel(page, '.pf-stars .gold-star').count() === 3, T('Pip and the stars'));
  await shotOf(page, '08-celebrate');
  if (!clipMode) await idleCheck(page, ok, T('celebrate'));
  const tip14 = fs.readFileSync(path.join(ROOT, 'docs/CURRICULUM.md'), 'utf8').match(/14\. \*\*Did you know\?\*\* ([\s\S]*?)\n15\./)[1].replace(/\s+/g, ' ').trim();
  ok(tip14 === DATA.celebrate.didYouKnow, T('the card is tip 14 of docs/CURRICULUM.md, verbatim'));
  await tapEl(page, sel(page, '.pf-back')); await page.waitForTimeout(600);
  ok(page.url().endsWith('#/home'), T('"Back to the railway" goes home'));
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).lessons && Object.keys(JSON.parse(localStorage.getItem('reading.v1')).lessons).length === 0), T('no real lesson is marked done'));

  // never an isolated or stretched sound in text to speech
  const spoken = await ttsAll(page);
  ok(spoken.length > 8, T(`the phone spoke ${spoken.length} times`));
  const bad = spoken.filter(SOUNDY);
  ok(bad.length === 0, T(`only whole words and sentences reach text to speech (${bad.join(' | ')})`));
  ok(errors.length === 0, T('no console errors: ' + errors.join(' | ')));
  await ctx.close();
}

// The first time a step is opened on a device, the "Say this" sheet opens by itself with the grown-up tip (CURRICULUM.md section 13).
async function sheet({ browser, url, ok }) {
  shotsOn = true;
  for (const [i, id] of [[4, 'read'], [5, 'build']]) {
    const { ctx, page, errors } = await open(browser, url, PHONE, { step: i, unseen: true });
    await page.waitForTimeout(1800);
    const t = (await text(page, '.script-sheet')) || '';
    ok(!(await page.evaluate(() => document.querySelector('.script-sheet').hidden)), `${id}: the script sheet opens by itself the first time`);
    ok(t.includes('Grown-up tip:') && t.includes(DATA.steps[i].tip), `${id}: it carries the step's tip, verbatim`);
    ok(/[a-z]{3}/.test(t.split('Grown-up tip')[0]) && t.startsWith('Say this'), `${id}: and the grown-up's words`);
    if (i === 4) await shotOf(page, '09-script-sheet-open');
    ok(errors.length === 0, `${id} sheet: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// A recording that is missing: the prompt shows after the attempt.
async function missingBlend({ browser, url, ok }) {
  const { ctx, page, errors } = await open(browser, url, PHONE, { step: 3, settings: { playSounds: true }, missing: true });
  await page.waitForSelector('.proto.blendit .glyph-row');
  await page.waitForTimeout(2600);
  ok((await prompt(page)) === 'Say: fffiiit-', `missing recording: the blend prompt shows after the failed attempt (${await prompt(page)})`);
  ok(errors.length === 0, 'missing recording: no errors ' + errors.join(' | '));
  await ctx.close();
}

// Reduced motion: the same steps still work; nothing waits on an animation.
async function reducedRun({ browser, url, ok }) {
  const base = { reduced: true };
  {
    const { ctx, page, errors } = await open(browser, url, PHONE, { ...base, step: 0 });
    await page.waitForSelector('.proto.warmup .wu-row'); await page.waitForTimeout(600);
    await slide(page);
    await page.waitForFunction(() => document.querySelector('.proto.warmup').dataset.state === 'blended', null, { timeout: 3000 });
    await page.waitForSelector('.wu-pic .pic-frame', { timeout: 3000 });
    ok(true, 'reduced motion: the warm-up blend and its picture');
    ok(errors.length === 0, 'reduced motion warm-up: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open(browser, url, PHONE, { ...base, step: 2 });
    await page.waitForSelector('.ns-art'); await page.waitForTimeout(3500);
    ok((await dset(page, '.proto.newsound', 'morphed')) === '0', 'reduced motion: the flower does not fade by itself');
    await tapEl(page, sel(page, '.ns-toggle')); await page.waitForTimeout(300);
    ok((await dset(page, '.proto.newsound', 'morphed')) === '1', 'reduced motion: the button shows the plain f');
    await nextInner(page); await page.waitForSelector('.mouth');
    ok(await sel(page, '.mouth .air').count() === 3, 'reduced motion: the air arrows are drawn');
    ok(errors.length === 0, 'reduced motion new sound: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open(browser, url, PHONE, { ...base, step: 4 });
    await page.waitForSelector('.proto.readit .ltile');
    for (let k = 0; k < 6; k++) await got(page);
    await page.waitForSelector('.rd-results');
    ok((await text(page, '.rd-line')) === '6 of 6 first try!', 'reduced motion: Read It results');
    ok(errors.length === 0, 'reduced motion read it: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open(browser, url, PHONE, { ...base, step: 5 });
    await page.waitForSelector('.proto.buildit .bi-tile'); await page.waitForTimeout(400);
    for (const ch of 'fat') await tapEl(page, sel(page, `.bi-tile[data-letter="${ch}"]`));
    await page.waitForTimeout(400);
    ok((await dset(page, '.proto.buildit', 'state')) === 'right', 'reduced motion: Build It accepts fat');
    ok(errors.length === 0, 'reduced motion build it: errors ' + errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open(browser, url, PHONE, { ...base, step: 6 });
    await page.waitForSelector('.proto.story .wtile');
    for (let k = 0; k < 3; k++) await got(page);
    await page.waitForSelector('.rs-page');
    await tapEl(page, btnByText(page, 'A question')); await page.waitForSelector('.rs-choice');
    await tapEl(page, sel(page, '.rs-choice[data-choice="sam"]')); await page.waitForTimeout(400);
    ok(!(await page.evaluate(() => document.querySelector('.rs-recheck').hidden)), 'reduced motion: a wrong pick shows the line again');
    await tapEl(page, sel(page, '.rs-choice[data-choice="map"]')); await page.waitForTimeout(500);
    ok((await dset(page, '.proto.story', 'answer')) === 'right', 'reduced motion: the meaning question');
    ok(errors.length === 0, 'reduced motion story: errors ' + errors.join(' | '));
    await ctx.close();
  }
}

// Touch targets and fit at three sizes: every button 48 px or more, nothing past the screen's width, and the first screen of
// each step needs no scrolling.
async function sizes({ browser, url, ok }) {
  shotsOn = true;
  for (const vp of [PHONE, SMALL, LAND]) {
    for (let step = 0; step < 7; step++) {
      const { ctx, page, errors } = await open(browser, url, vp, { step });
      await page.waitForTimeout(1500);
      const tag = `${vp.name} step ${step + 1}`;
      const r = await page.evaluate(() => {
        const small = [...document.querySelectorAll('.task-stage button, .task-foot button')].filter((b) => !b.hidden && b.offsetParent && !b.closest('[hidden]') && !b.classList.contains('slide-band')).map((b) => { const q = b.getBoundingClientRect(); return { c: b.className, w: Math.round(q.width), h: Math.round(q.height) }; }).filter((q) => q.w < 47.5 || q.h < 47.5);
        const a = document.querySelector('.task-activity');
        return { small, scroll: a.scrollHeight - a.clientHeight, wide: document.documentElement.scrollWidth - innerWidth };
      });
      ok(r.small.length === 0, `${tag}: every button is 48 px or more (${JSON.stringify(r.small)})`);
      ok(r.wide <= 0, `${tag}: no sideways scrolling (${r.wide})`);
      ok(r.scroll <= 1, `${tag}: the first screen needs no scrolling (${r.scroll} px over)`);
      ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
      if (vp === LAND && [0, 5, 6].includes(step)) {
        if (step === 5) { for (const ch of 'fit') await tapEl(page, sel(page, `.bi-tile[data-letter="${ch}"]`)); await page.waitForTimeout(500); }
        await shotOf(page, `land-0${step + 1}-${IDS[step]}`);
      }
      await ctx.close();
    }
  }
}

// The Grownups > Previews button, and the overview.
async function entry({ browser, url, ok }) {
  const made = await newPage(browser, PHONE);
  const { page, errors } = made;
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: {}, settings: { seenScripts: SEEN }, firstRunDone: true, meetDue: false })}))`);
  await page.goto(url + '#/home');
  await page.waitForTimeout(600);
  await page.evaluate(() => { location.hash = '#/proto/f'; });
  await page.waitForSelector('.proto-intro');
  ok((await sel(page, '.pv-row').count()) === 8, 'overview: eight steps listed');
  ok((await text(page, '.proto-intro h1')) === 'New lesson: f', 'overview: the title');
  await page.waitForTimeout(500);
  await shotOf(page, '00-overview');
  await tapEl(page, sel(page, '.pv-start')); await page.waitForSelector('.proto.warmup');
  ok(page.url().endsWith('#/proto/f/task/0'), 'overview: Start opens step 1');
  await tapEl(page, sel(page, '.task-head .icon-btn')); await page.waitForSelector('.proto-intro');
  ok(page.url().endsWith('#/proto/f'), 'the back arrow of a step goes to the overview');
  await tapEl(page, sel(page, '.proto-intro .icon-btn')); await page.waitForTimeout(800);
  ok(page.url().endsWith('#/home'), 'the back arrow of the overview goes home');
  // the Previews fold in Grownups (behind the hold on Home), last, with its note and one button of 48 px or more
  await page.evaluate(() => { location.hash = '#/home'; });
  await page.waitForSelector('.pill-hold'); await page.waitForTimeout(900);
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up();
  await page.waitForSelector('.grownups'); await page.waitForTimeout(500);
  const head = page.locator('.gu-fold', { hasText: 'Previews' });
  ok((await head.count()) === 1 && (await head.getAttribute('aria-expanded')) === 'false', 'Grownups: a closed "Previews" fold');
  ok(await page.evaluate(() => { const cards = [...document.querySelectorAll('.gu-body > .gu-card')]; return cards[cards.length - 1].textContent.includes('Previews'); }), 'Grownups: Previews is the last card');
  await head.click(); await page.waitForTimeout(300);
  ok((await text(page, '#gu-fold-previews .gu-note')) === 'Try new screens before they go live.', 'Grownups: the note under Previews');
  const pb = await sel(page, '#gu-fold-previews .preview-btn[data-preview="proto-f"]').boundingBox();
  ok(pb.height >= 48 && (await text(page, '#gu-fold-previews .preview-btn[data-preview="proto-f"]')) === 'New lesson: f (eight steps)', `Grownups: the button is 48 px or more (${Math.round(pb.height)})`);
  await shotOf(page, '00-grownups-previews');
  await sel(page, '#gu-fold-previews .preview-btn[data-preview="proto-f"]').scrollIntoViewIfNeeded();
  await tapEl(page, sel(page, '#gu-fold-previews .preview-btn[data-preview="proto-f"]')); await page.waitForSelector('.proto-intro');
  ok(page.url().endsWith('#/proto/f'), 'Grownups: the button opens the overview');
  ok(errors.length === 0, 'overview: errors ' + errors.join(' | '));
  await made.ctx.close();
}

export async function run() {
  shotsOn = true;
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await entry({ browser, url, ok });
  await walk(browser, url, ok, 'prompts');
  await walk(browser, url, ok, 'recordings');
  await missingBlend({ browser, url, ok });
  await sheet({ browser, url, ok });
  await reducedRun({ browser, url, ok });
  await sizes({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`proto-lesson: ${checks - failures}/${checks} checks passed`);
  return failures;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) process.exit((await run()) ? 1 : 0);
