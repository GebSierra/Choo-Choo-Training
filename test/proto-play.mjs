// Prototype 6: Stage 1 sound play (#/proto/play, three lessons); the placement check (#/proto/placement) has its own suite,
// test/proto-placement.mjs. Both are reached from Grownups > Previews (data/proto-play.json, js/screens/proto-play.js, js/screens/proto-placement.js, js/screens/tasks/proto/play.js).
// Checks: each Stage 1 lesson walks to done; no letters are shown in Stage 1; the phone's voice never says an isolated or
// stretched sound; wrong taps never show a red X; nothing is written to progress; reduced motion; idle frames; three
// phone sizes; the Previews entries. Run alone with `node test/proto-play.mjs`; SHOTS=1 also saves screenshots in
// docs/screenshots/proto-play/ (390x844 each lesson, 915x412 for 1.2).
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB, silentWav } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage } from './lib.mjs';

const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/proto-play.json'), 'utf8'));
const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const ORDER = CUR.lessons.map((l) => l.sound);
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/proto-play');
const SEEN = Object.fromEntries(DATA.lessons.flatMap((l) => [[`proto-play:${l.id}`, true], [`tip:proto-play:${l.id}`, true]]));
const PHONE = { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 };
const SMALL = { name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 };
const LAND = { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 };
// A sound as a grown-up writes it (js/scripts.js soundText): held "mmm", clipped "p-".
const st = (k) => (CUR.sounds[k] && CUR.sounds[k].hold === false ? `${k}-` : k.repeat(3));
const first = (w) => st(w[0]) + w.slice(1);
const stretch = (r) => r.sounds.map(st).join('');

const RAF_COUNT = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const tapEl = async (page, loc) => { await loc.first().scrollIntoViewIfNeeded(); const b = await loc.first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
const sel = (page, s) => page.locator(s);
const text = (page, s) => page.evaluate((q) => { const e = document.querySelector(q); return e ? e.textContent.trim() : null; }, s);
const dset = (page, s, k) => page.evaluate(([q, key]) => { const e = document.querySelector(q); return e ? e.dataset[key] : null; }, [s, k]);
const clips = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'clip').map((e) => e.src));
const ttsAll = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'tts').map((e) => e.text));
const prompt = (page) => page.evaluate(() => { const p = [...document.querySelectorAll('.task-stage .say-prompt')].find((x) => !x.hidden && x.offsetParent); return p ? p.querySelector('.say-text').textContent : null; });
const store = (page) => page.evaluate(() => localStorage.getItem('reading.v1'));
let shotsOn = true;
const shotOf = async (page, name) => { if (!process.env.SHOTS || !shotsOn) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };
// Never an isolated or stretched sound in anything the phone's voice was asked to say.
const SOUNDY = (t) => /^\s*[a-z]\s*$/i.test(t) || /(^|[^a-z])([a-z])\2{2,}/i.test(t) || /\b[a-z]-(?!\w)/i.test(t) || /\b[a-z]-[a-z]/i.test(t);
const allTts = [];
const collectTts = async (page) => { allTts.push(...(await ttsAll(page))); };

export async function open(browser, url, vp, route, { settings = {}, reduced = false } = {}) {
  const made = await newPage(browser, vp, reduced ? { reducedMotion: 'reduce' } : {});
  const { page } = made;
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(RAF_COUNT);
  // blend recordings get a silent stand-in when "recordings" are on; otherwise they are missing (404) and the prompts show
  if (settings.playSounds) await page.route('**/assets/audio/blends/*', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }));
  await page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: {}, settings: { seenScripts: SEEN, migrated1912: true, ...settings }, firstRunDone: true, meetDue: false })}))`);
  await page.goto(url + '#/home');
  await page.waitForTimeout(500);
  await page.mouse.click(3, 300);
  await page.evaluate((r) => { location.hash = r; }, route);
  if (route !== '#/home') await page.waitForSelector('.task-screen, .proto-intro', { timeout: 8000 });
  await page.waitForTimeout(700);
  made.before = await store(page);
  return made;
}
const nextStep = async (page, hashEnd) => {
  await page.waitForFunction(() => { const b = document.querySelector('.btn.next'); return b && !b.disabled; }, null, { timeout: 4000 });
  await tapEl(page, sel(page, '.btn.next'));
  await page.waitForFunction((e) => location.hash.endsWith(e), hashEnd, { timeout: 4000 });
  await page.waitForSelector('.task-screen, .proto-intro');
  await page.waitForTimeout(800);
};
async function idleCheck(page, ok, tag) {
  await page.waitForTimeout(1500);
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(3000);
  const frames = (await page.evaluate(() => window.__raf)) - r0;
  const endless = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect.getComputedTiming().endTime === Infinity).length);
  ok(frames <= 2, `${tag}: at most 2 frames in 3 s while idle (${frames})`);
  ok(endless === 0, `${tag}: no endless animation (${endless})`);
}
// No letter in the child's part of a Stage 1 screen: no letter drawings, tiles or text boxes (the grown-up's prompt pill and script bar are the grown-up's).
const noLetters = (page) => page.evaluate(() => document.querySelectorAll('.task-activity .glyph, .task-activity .glyph-letter, .task-activity .font-letter, .task-activity .ltile, .task-activity .wtile, .task-activity [data-letter]').length === 0);
// No red X: no cross mark, no element named wrong, cross or error, no red-ish fill inside the stage.
const redX = (page) => page.evaluate(() => {
  const stage = document.querySelector('.task-stage'); if (!stage) return 0;
  let n = /[✗✘✕✖❌❎]/.test(stage.textContent) ? 1 : 0;
  for (const e of stage.querySelectorAll('*')) {
    if (/wrong|cross|error|incorrect|\bred\b/i.test(String(e.getAttribute('class') || ''))) n++;
    const c = getComputedStyle(e).backgroundColor.match(/\d+/g);
    if (c && c.length >= 3 && +c[0] > 190 && +c[1] < 110 && +c[2] < 110 && (c[3] === undefined || +c[3] > 0.3)) n++;
  }
  return n;
});

// ---- the Previews fold: both entries, reached from Grownups ----
async function entry({ browser, url, ok }) {
  const made = await open(browser, url, PHONE, '#/home', {});
  const { page, errors } = made;
  await page.waitForSelector('.pill-hold'); await page.waitForTimeout(900);
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up();
  await page.waitForSelector('.grownups'); await page.waitForTimeout(500);
  const head = page.locator('.gu-fold', { hasText: 'Previews' });
  await head.click(); await page.waitForTimeout(300);
  for (const [key, label] of [['proto-play', 'Sound play (Stage 1)'], ['proto-placement', 'Placement check']]) {
    const b = sel(page, `#gu-fold-previews .preview-btn[data-preview="${key}"]`);
    ok((await b.count()) === 1 && (await text(page, `#gu-fold-previews .preview-btn[data-preview="${key}"]`)) === label, `Grownups: Previews has "${label}"`);
    await b.scrollIntoViewIfNeeded();
    const r = await b.boundingBox();
    ok(r.height >= 48, `Grownups: the "${label}" button is 48 px or more (${Math.round(r.height)})`);
  }
  await sel(page, '#gu-fold-previews .preview-btn[data-preview="proto-play"]').scrollIntoViewIfNeeded();
  await tapEl(page, sel(page, '#gu-fold-previews .preview-btn[data-preview="proto-play"]')); await page.waitForSelector('.proto-play-intro');
  ok(page.url().endsWith('#/proto/play'), 'Grownups: the button opens the Sound play chooser');
  const rows = await page.locator('.pp-lesson').evaluateAll((l) => l.map((b) => { const r = b.getBoundingClientRect(); return { id: b.dataset.lesson, h: r.height, t: b.textContent }; }));
  ok(rows.length === 3 && rows.every((r) => r.h >= 48), `chooser: three lessons, each 48 px or more (${JSON.stringify(rows.map((r) => r.id + ':' + Math.round(r.h)))})`);
  ok(/Left to right/.test(rows[0].t) && /First sounds/.test(rows[1].t) && /Smooth words/.test(rows[2].t), 'chooser: Left to right, First sounds, Smooth words');
  await shotOf(page, '00-chooser');
  await page.waitForTimeout(700);
  await tapEl(page, sel(page, '.pp-lesson[data-lesson="2"]')); await page.waitForSelector('.task-screen'); await page.waitForTimeout(700);
  ok(page.url().endsWith('#/proto/play/2/task/0'), 'chooser: a lesson opens its first step');
  await tapEl(page, sel(page, '.task-head .icon-btn')); await page.waitForSelector('.proto-play-intro'); await page.waitForTimeout(700);
  ok(page.url().endsWith('#/proto/play'), 'the back arrow of a step goes to the chooser');
  await tapEl(page, sel(page, '.proto-play-intro .gu-head .icon-btn')); await page.waitForSelector('.grownups .gu-previews', { state: 'attached' });
  ok(page.url().endsWith('#/grownups'), 'the back arrow of the chooser goes back to Grownups');
  await page.waitForTimeout(300);
  { const f = page.locator('.gu-fold', { hasText: 'Previews' }); if ((await f.getAttribute('aria-expanded')) !== 'true') await f.click(); }
  await page.waitForTimeout(300);
  const pb = sel(page, '#gu-fold-previews .preview-btn[data-preview="proto-placement"]');
  await pb.scrollIntoViewIfNeeded();
  await tapEl(page, pb); await page.waitForSelector('.proto-placement');
  ok(page.url().endsWith('#/proto/placement'), 'Grownups: the button opens the placement check');
  ok(errors.length === 0, 'entry: errors ' + errors.join(' | '));
  await made.ctx.close();
}

// ---- 1.1, 1.2, 1.3 ----
async function walkLessons(browser, url, ok, mode) {
  const rec = mode === 'recordings';
  shotsOn = !rec;
  const T = (s) => `${mode}: ${s}`;
  const { ctx, page, errors, before } = await open(browser, url, PHONE, '#/proto/play/1/task/0', { settings: { playSounds: rec } });

  // 1.1 Left to right: two stories
  for (let s = 0; s < 2; s++) {
    const step = DATA.lessons[0].steps[s];
    await page.waitForSelector('.proto.story-row .lr-pic');
    ok((await sel(page, '.lr-pic').count()) === 4, T(`story ${s + 1}: a row of four pictures`));
    ok((await sel(page, '.lr-arrow').count()) === 1, T('a soft arrow under the row'));
    const xs = await page.locator('.lr-pic').evaluateAll((l) => l.map((b) => b.getBoundingClientRect().left));
    ok(xs.every((x, i) => i === 0 || x > xs[i - 1]), T('the pictures stand left to right'));
    const arrow = await sel(page, '.lr-arrow').boundingBox(), row = await sel(page, '.lr-row').boundingBox();
    ok(arrow.y > row.y + row.height - 2, T('the arrow is under the row'));
    ok(await noLetters(page), T('no letters in the story'));
    if (s === 0) await shotOf(page, '11a-left-to-right');
    // a wrong order: the third picture first bounces the first, lights nothing
    await tapEl(page, sel(page, '.lr-pic[data-i="2"]')); await page.waitForTimeout(300);
    ok((await sel(page, '.lr-pic.lit').count()) === 0 && (await dset(page, '.proto.story-row', 'next')) === '0', T('a wrong-order tap lights nothing'));
    ok((await redX(page)) === 0, T('no red X after a wrong tap'));
    await page.waitForTimeout(500);
    for (let k = 0; k < 4; k++) {
      await tapEl(page, sel(page, `.lr-pic[data-i="${k}"]`)); await page.waitForTimeout(450);
      ok((await sel(page, '.lr-pic.lit').count()) === k + 1, T(`tap ${k + 1}: ${k + 1} lit`));
      if (k === 1 && s === 0) await shotOf(page, '11b-left-to-right-two-lit');
    }
    const said = await ttsAll(page);
    ok(step.pics.every(([, t]) => said.includes(t)), T(`story ${s + 1}: the voice told each line (${said.slice(-4).join(' / ')})`));
    await page.waitForFunction(() => document.querySelector('.proto.story-row').dataset.state === 'done', null, { timeout: 3000 });
    if (!rec && s === 0) { await shotOf(page, '11c-left-to-right-done'); await idleCheck(page, ok, T('story')); }
    await collectTts(page);
    if (s === 0) await nextStep(page, '/proto/play/1/task/1');
  }
  ok(/Reading goes left to right\. Point and tap in order\./.test(await text(page, '.script-first') || ''), T('the grown-up script says "Reading goes left to right. Point and tap in order."'));
  await nextStep(page, '/proto/play');
  ok(await page.locator('.pp-lesson').count() === 3, T('Finish returns to the chooser'));

  // 1.2 First sounds: four steps, two rounds each
  await page.evaluate(() => { location.hash = '#/proto/play/2/task/0'; });
  await page.waitForSelector('.proto.pick .pk-opt'); await page.waitForTimeout(900);
  for (let s = 0; s < 4; s++) {
    const step = DATA.lessons[1].steps[s];
    for (let r = 0; r < 2; r++) {
      const round = step.rounds[r];
      await page.waitForFunction(([i, w]) => { const e = document.querySelector('.proto.pick'); return e && e.dataset.round === String(i) && e.dataset.target === w; }, [r, round.target], { timeout: 4000 });
      await page.waitForTimeout(700);
      ok((await sel(page, '.pk-opt').count()) === 3, T(`${step.sound}${r + 1}: three pictures`));
      if (rec) { ok((await clips(page)).includes(`${round.target}.mp3`), T(`${round.target}: the recording of the stretched word played`)); ok((await prompt(page)) === null, T('no prompt while the recording plays')); }
      else ok((await prompt(page)) === `Say: Where is ${first(round.target)}?`, T(`prompt for ${round.target}: ${await prompt(page)}`));
      ok(await noLetters(page), T(`${round.target}: no letters`));
      if (s === 0 && r === 0) { await shotOf(page, '12a-first-sounds'); if (!rec) await idleCheck(page, ok, T('first sounds')); }
      // a wrong tap: the picture wiggles, nothing is chosen, no red
      const wrong = round.options.find((w) => w !== round.target);
      await tapEl(page, sel(page, `.pk-opt[data-word="${wrong}"]`)); await page.waitForTimeout(150);
      ok((await sel(page, '.pk-opt.right, .pk-opt.soft').count()) === 0 && (await dset(page, '.proto.pick', 'round')) === String(r), T(`${round.target}: a wrong tap changes nothing`));
      ok((await redX(page)) === 0, T(`${round.target}: no red X after a wrong tap`));
      if (s === 0 && r === 0) await page.waitForTimeout(400);
      await tapEl(page, sel(page, `.pk-opt[data-word="${round.target}"]`)); await page.waitForTimeout(250);
      ok((await sel(page, '.pk-opt.right').count()) === 1, T(`${round.target}: the right picture lights`));
      if (s === 0 && r === 0) await shotOf(page, '12b-first-sounds-right');
      ok((await ttsAll(page)).includes(round.target), T(`${round.target}: the whole word is spoken`));
    }
    await page.waitForFunction(() => document.querySelector('.proto.pick').dataset.state === 'done', null, { timeout: 4000 });
    await collectTts(page);
    await nextStep(page, s < 3 ? `/proto/play/2/task/${s + 1}` : '/proto/play');
    if (s < 3) await page.waitForSelector('.proto.pick .pk-opt');
  }

  // 1.3 Smooth words: hear the word, then break it apart
  await page.evaluate(() => { location.hash = '#/proto/play/3/task/0'; });
  await page.waitForSelector('.proto.pick .pk-opt'); await page.waitForTimeout(900);
  const A = DATA.lessons[2].steps[0];
  for (let r = 0; r < A.rounds.length; r++) {
    const round = A.rounds[r];
    await page.waitForFunction(([i, w]) => { const e = document.querySelector('.proto.pick'); return e && e.dataset.round === String(i) && e.dataset.target === w; }, [r, round.target], { timeout: 4000 });
    await page.waitForTimeout(700);
    if (rec) ok((await clips(page)).includes(`${round.target}.mp3`), T(`${round.target}: the smooth word recording played`));
    else ok((await prompt(page)) === `Say: ${stretch(round)}`, T(`smooth prompt for ${round.target}: ${await prompt(page)}`));
    ok(await noLetters(page), T(`${round.target}: no letters in round A`));
    if (r === 0) { await shotOf(page, '13a-smooth-words'); }
    const wrong = round.options.find((w) => w !== round.target);
    await tapEl(page, sel(page, `.pk-opt[data-word="${wrong}"]`)); await page.waitForTimeout(150);
    ok((await redX(page)) === 0 && (await sel(page, '.pk-opt.right').count()) === 0, T(`${round.target}: a wrong tap is gentle`));
    await page.waitForTimeout(r === 0 ? 400 : 0);
    await tapEl(page, sel(page, `.pk-opt[data-word="${round.target}"]`)); await page.waitForTimeout(250);
  }
  await page.waitForFunction(() => document.querySelector('.proto.pick').dataset.state === 'done', null, { timeout: 4000 });
  await collectTts(page);
  await nextStep(page, '/proto/play/3/task/1');
  const B = DATA.lessons[2].steps[1];
  for (let r = 0; r < B.rounds.length; r++) {
    const round = B.rounds[r];
    await page.waitForFunction(([i, w]) => { const e = document.querySelector('.proto.segment'); return e && e.dataset.round === String(i) && e.dataset.word === w; }, [r, round.target], { timeout: 4000 });
    await page.waitForTimeout(700);
    ok((await sel(page, '.sg-dot').count()) === round.sounds.length && (await sel(page, '.sg-dot.lit').count()) === 0, T(`${round.target}: ${round.sounds.length} empty dots`));
    if (rec) ok((await clips(page)).includes(`${round.target}.mp3`), T(`${round.target}: the slow word recording played`));
    else ok((await prompt(page)) === `Say: ${stretch(round)}`, T(`slow prompt for ${round.target}: ${await prompt(page)}`));
    ok(await noLetters(page), T(`${round.target}: no letters in round B`));
    if (r === 0) await shotOf(page, '13b-break-empty');
    for (let k = 0; k < round.sounds.length; k++) {
      await tapEl(page, sel(page, '.sg-dot:not(.lit)')); await page.waitForTimeout(350);
      ok((await sel(page, '.sg-dot.lit').count()) === k + 1, T(`${round.target}: dot ${k + 1} lights`));
      if (r === 2 && k === 1) await shotOf(page, '13c-break-two-of-three');
    }
    await page.waitForTimeout(700);
    ok((await ttsAll(page)).includes(round.target), T(`${round.target}: the whole word is spoken at the end`));
    if (r < B.rounds.length - 1) { await page.waitForSelector('.px-next', { timeout: 3000 }); await tapEl(page, sel(page, '.px-next')); await page.waitForTimeout(500); }
  }
  await page.waitForFunction(() => document.querySelector('.proto.segment').dataset.state === 'done', null, { timeout: 4000 });
  if (!rec) await idleCheck(page, ok, T('break it apart'));
  await collectTts(page);
  await nextStep(page, '/proto/play');
  ok((await store(page)) === before, T('nothing was written to progress or settings'));
  ok(errors.length === 0, T('lessons: errors ' + errors.join(' | ')));
  await ctx.close();
}

// ---- the grown-up tip of 1.3 (CURRICULUM.md section 13, tip 6, verbatim) ----
async function tips({ browser, url, ok }) {
  const { ctx, page } = await open(browser, url, PHONE, '#/proto/play/3/task/0', { settings: { playSounds: false, fullInstructions: true } });
  const tip = await text(page, '.grown-tip');
  ok(tip === 'Grown-up tip: Children blend better when sounds are stretched together ("mmmaaat") than chopped apart ("m... a... t"). Chopping makes them forget the first sound by the time they reach the last.', `1.3 shows tip 6 verbatim (${tip})`);
  const script = await text(page, '.script-text');
  ok(/Say the word smoothly/.test(script) && /sssuuunnn/.test(script), `1.3 script shows the smooth word (${script})`);
  await ctx.close();
}

// ---- reduced motion ----
async function reducedRun({ browser, url, ok }) {
  let made = await open(browser, url, PHONE, '#/proto/play/1/task/0', { reduced: true, settings: { playSounds: false } });
  let { page, errors } = made;
  for (let k = 0; k < 4; k++) { await tapEl(page, sel(page, `.lr-pic[data-i="${k}"]`)); await page.waitForTimeout(200); }
  await page.waitForFunction(() => document.querySelector('.proto.story-row').dataset.state === 'done', null, { timeout: 3000 });
  await page.waitForTimeout(1200);
  ok(await page.evaluate(() => document.querySelectorAll('.spark').length === 0 && document.getAnimations().filter((a) => a.playState === 'running' && a.effect.getComputedTiming().duration > 0).length === 0), 'reduced motion: story ends with no sparks and no running animation');
  await made.ctx.close();
  made = await open(browser, url, PHONE, '#/proto/play/2/task/0', { reduced: true, settings: { playSounds: false } });
  page = made.page; errors = made.errors;
  for (let r = 0; r < 2; r++) {
    const round = DATA.lessons[1].steps[0].rounds[r];
    await page.waitForFunction((i) => document.querySelector('.proto.pick').dataset.round === String(i), r, { timeout: 3000 });
    await page.waitForTimeout(300);
    await tapEl(page, sel(page, `.pk-opt[data-word="${round.target}"]`)); await page.waitForTimeout(500);
  }
  await page.waitForFunction(() => document.querySelector('.proto.pick').dataset.state === 'done', null, { timeout: 3000 });
  ok(true, 'reduced motion: First sounds reaches done');
  ok(errors.length === 0, 'reduced motion: errors ' + errors.join(' | '));
  await made.ctx.close();
}

// ---- three phone sizes: everything fits, targets are 48 px or more ----
async function sizes({ browser, url, ok }) {
  for (const vp of [SMALL, PHONE, LAND]) {
    shotsOn = vp === LAND;
    const tag = vp.name;
    const fit = (page, sels) => page.evaluate((list) => {
      const out = [];
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push('horizontal overflow');
      for (const s of list) for (const e of document.querySelectorAll(s)) {
        const r = e.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) out.push(`${s} outside (${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)})`);
        if ((e.tagName === 'BUTTON') && (r.width < 47.5 || r.height < 47.5)) out.push(`${s} small ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return out;
    }, sels);
    let made = await open(browser, url, vp, '#/proto/play/1/task/0', { settings: { playSounds: false } });
    let page = made.page;
    ok((await fit(page, ['.lr-pic', '.lr-arrow', '.btn.next', '.btn.again'])).length === 0, `${tag} 1.1: ${JSON.stringify(await fit(page, ['.lr-pic', '.lr-arrow', '.btn.next', '.btn.again']))}`);
    await made.ctx.close();
    for (const [route, root, picks, name] of [['#/proto/play/2/task/0', '.proto.pick', ['.pk-opt', '.px-model', '.btn.next', '.btn.again'], '1.2'], ['#/proto/play/3/task/0', '.proto.pick', ['.pk-opt', '.px-model', '.btn.next'], '1.3 A'], ['#/proto/play/3/task/1', '.proto.segment', ['.sg-dot', '.sg-pic', '.px-model', '.btn.next'], '1.3 B']]) {
      made = await open(browser, url, vp, route, { settings: { playSounds: false } }); page = made.page;
      await page.waitForSelector(root); await page.waitForTimeout(600);
      const bad = await fit(page, picks);
      ok(bad.length === 0, `${tag} ${name}: fits (${bad.join('; ')})`);
      if (name === '1.2') { await shotOf(page, '12c-first-sounds-landscape'); }
      await made.ctx.close();
    }
    await made.ctx.close();
  }
}

export async function run() {
  shotsOn = true;
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await entry({ browser, url, ok });
  await walkLessons(browser, url, ok, 'prompts');
  await walkLessons(browser, url, ok, 'recordings');
  ok(allTts.length > 20 && allTts.every((t) => !SOUNDY(t)), `the phone's voice never said a sound or a stretched word (${allTts.length} lines; bad: ${allTts.filter(SOUNDY).join(' | ')})`);
  await tips({ browser, url, ok });
  await reducedRun({ browser, url, ok });
  await sizes({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`proto-play: ${checks - failures}/${checks} checks passed`);
  return failures;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) process.exit((await run()) ? 1 : 0);
