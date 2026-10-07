// Prototype 5: a heart-word step for "the" (#/proto/heart, js/screens/proto-heart.js, js/screens/tasks/proto/heart.js).
// Walks all five sub-steps (Meet it, Map it, Fix the word, Spell it, Find it) and the celebration at 390x844: with prompts (the
// grown-up says the sounds), with a stubbed th-buzz recording, and with reduced motion. Checks: the phone's voice only ever says
// "the", the sentence and instructions (never an isolated sound, never "thee"), retrieval first on Meet it, th is one linked tile
// and e carries a heart, Map it needs both taps before the slide, Help replays the parts, Spell it rejects a wrong spelling
// without fixing it, Find it takes "the" and no other word, idle frames, touch targets and fit at three sizes, the Grownups >
// Previews entry, and that nothing is written to progress. Run alone with `node test/proto-heart.mjs`; SHOTS=1 also saves the
// screenshots in docs/screenshots/proto-heart/ (390x844 every sub-step, 915x412 for Meet it and Find it).
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB, silentWav } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, touchDrag } from './lib.mjs';

const SHOT_DIR = path.join(ROOT, 'docs/screenshots/proto-heart');
const SEEN = { 'proto-heart': true, 'tip:proto-heart': true };
const PHONE = { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 };
const SMALL = { name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 };
const LAND = { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 };
const SENTENCE = 'Sam sat at the map.';
const TH_PROMPT = 'Say: th (buzzing, tongue between your teeth)';
// Everything the phone's voice may say on this screen: the whole word, the sentence and instructions.
const ALLOWED_TTS = new Set(['the', SENTENCE, 'Look at the word. Can you read it?', 'Tap each part of the word.', 'What is the real word?', 'Read the sentence together, then tap the heart word.', 'Good job.']);

const RAF_COUNT = () => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => o((t) => { window.__raf++; cb(t); }); };
const tapEl = async (page, loc) => { const b = await loc.first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
const sel = (page, s) => page.locator(s);
const text = (page, s) => page.evaluate((q) => { const e = document.querySelector(q); return e ? e.textContent.trim() : null; }, s);
const dset = (page, s, k) => page.evaluate(([q, key]) => { const e = document.querySelector(q); return e ? e.dataset[key] : null; }, [s, k]);
const clips = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'clip').map((e) => e.src));
const ttsAll = (page) => page.evaluate(() => window.__events.filter((e) => e.type === 'tts').map((e) => e.text));
const prompt = (page) => page.evaluate(() => { const p = [...document.querySelectorAll('.task-stage .say-prompt')].find((x) => !x.hidden && x.offsetParent); return p ? p.querySelector('.say-text').textContent : null; });
const visible = (page, s) => page.evaluate((q) => { const e = document.querySelector(q); return !!(e && !e.hidden && e.offsetParent && !e.closest('[hidden]')); }, s);
let shotsOn = true;
const shotOf = async (page, name) => { if (!process.env.SHOTS || !shotsOn) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };
const SOUNDY = (t) => /^\s*[a-z]\s*$/i.test(t) || /(^|[^a-z])([a-z])\2{2,}/i.test(t) || /\b[a-z]-(?!\w)/i.test(t) || /\b[a-z]-[a-z]/i.test(t) || /\b(uh|thee)\b/i.test(t);

export async function open(browser, url, vp, { settings = {}, reduced = false, thBuzz = false } = {}) {
  const made = await newPage(browser, vp, reduced ? { reducedMotion: 'reduce' } : {});
  const { page } = made;
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(RAF_COUNT);
  // a stubbed th-buzz recording; the-e is never recorded, so "Say: uh" always shows
  if (thBuzz) await page.route('**/assets/audio/sounds/th-buzz.mp3', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }));
  await page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: {}, settings: { seenScripts: SEEN, migrated1912: true, ...settings }, firstRunDone: true, meetDue: false })}))`);
  await page.goto(url + '#/home');
  await page.waitForTimeout(500);
  await page.mouse.click(3, 300);
  await page.evaluate(() => { location.hash = '#/proto/heart'; });
  await page.waitForSelector('.task-screen .proto.heart', { timeout: 8000 });
  await page.waitForTimeout(700);
  return made;
}
const nextInner = async (page, phase) => {
  await page.waitForFunction(() => { const b = document.querySelector('.btn.next'); return b && !b.disabled; }, null, { timeout: 4000 });
  await tapEl(page, sel(page, '.btn.next'));
  await page.waitForFunction((p) => document.querySelector('.proto.heart') && document.querySelector('.proto.heart').dataset.phase === p, phase, { timeout: 4000 });
  await page.waitForTimeout(700);
};
const got = async (page) => { await tapEl(page, sel(page, '.judge-btn.got')); await page.waitForTimeout(900); };
const slide = async (page) => {
  const b = await sel(page, '.hw-slide').boundingBox();
  await touchDrag(page, { x: b.x + 6, y: b.y + b.height / 2 }, { x: b.x + b.width - 4, y: b.y + b.height / 2 }, { steps: 22 });
  await page.waitForTimeout(300);
};
const toDone = (page) => page.waitForFunction(() => document.querySelector('.proto.heart').dataset.state === 'done', null, { timeout: 4000 });
async function idleCheck(page, ok, tag) {
  await page.waitForTimeout(1500);
  const r0 = await page.evaluate(() => window.__raf);
  await page.waitForTimeout(3000);
  const frames = (await page.evaluate(() => window.__raf)) - r0;
  const endless = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect.getComputedTiming().endTime === Infinity).length);
  ok(frames <= 2, `${tag}: at most 2 frames in 3 s while idle (${frames})`);
  ok(endless === 0, `${tag}: no endless animation (${endless})`);
}

// ---- the walk ----
async function walk(browser, url, ok, mode) {
  const rec = mode === 'recording', red = mode === 'reduced';
  shotsOn = mode === 'prompts';
  const T = (s) => `${mode}: ${s}`;
  const { ctx, page, errors } = await open(browser, url, PHONE, { thBuzz: rec, reduced: red, settings: { playSounds: mode !== 'prompts' } });
  const store0 = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('reading.v1')); return JSON.stringify({ l: s.lessons, v: s.levels, w: s.worlds, t: s.settings.trainAt }); });

  // 1. Meet it
  await page.waitForSelector('.hw-word');
  ok((await dset(page, '.proto.heart', 'phase')) === 'meet', T('starts on Meet it'));
  ok((await sel(page, '.hw-tile').count()) === 2, T('two tiles: th and e'));
  ok((await sel(page, '.hw-tile.th .glyph-letter').count()) === 2 && (await sel(page, '.hw-tile.th .hw-link').count()) === 1, T('th is one tile with two letters and a link'));
  ok((await sel(page, '.hw-tile.e .glyph-letter').count()) === 1 && (await sel(page, '.hw-tile.e .hw-heart').count()) === 1, T('e is a tile with a heart above it'));
  const heartAbove = await page.evaluate(() => { const hh = document.querySelector('.hw-tile.e .hw-heart').getBoundingClientRect(), t = document.querySelector('.hw-tile.e').getBoundingClientRect(); return hh.bottom <= t.top + 14 && hh.top < t.top; });
  ok(heartAbove, T('the heart sits above the e tile'));
  ok((await sel(page, '.px-hear').count()) === 0, T('retrieval first: no Hear it before the child has tried'));
  ok(!(await ttsAll(page)).includes('the'), T('the phone has not said the word yet'));
  await shotOf(page, '01a-meet');
  if (!red) await idleCheck(page, ok, T('meet'));
  await tapEl(page, sel(page, '.hw-tried')); await page.waitForTimeout(500);
  ok((await sel(page, '.px-hear').count()) === 1, T('Hear it appears once the child has tried'));
  await tapEl(page, sel(page, '.px-hear')); await page.waitForTimeout(400);
  ok((await ttsAll(page)).includes('the'), T('Hear it says the whole word'));
  await shotOf(page, '01b-meet-heard');
  // the sheet's speaker reads the script without any sound or "thee"
  await tapEl(page, sel(page, '.task-foot [aria-label="Hear the parent script"]')); await page.waitForTimeout(500);

  // 2. Map it
  await nextInner(page, 'map');
  ok((await sel(page, '.hw-tile').count()) === 2 && !(await visible(page, '.hw-slide')), T('Map it: the slide waits for both taps'));
  await shotOf(page, '02a-map');
  await tapEl(page, sel(page, '.hw-tile.th')); await page.waitForTimeout(700);
  if (rec) {
    ok((await clips(page)).includes('th-buzz.mp3'), T('the th-buzz recording played'));
    ok((await prompt(page)) === null, T('no prompt while the recording plays'));
  } else {
    ok((await prompt(page)) === TH_PROMPT, T(`th shows the grown-up prompt (${await prompt(page)})`));
  }
  ok(!(await visible(page, '.hw-slide')), T('one tap is not enough for the slide'));
  await tapEl(page, sel(page, '.hw-tile.e')); await page.waitForTimeout(900);
  ok((await prompt(page)) === 'Say: uh', T(`the heart shows "Say: uh" (${await prompt(page)})`));
  ok((await dset(page, '.proto.heart', 'heart')) === '1', T('the heart was tapped'));
  ok(await visible(page, '.hw-slide'), T('the slide appears after both parts'));
  await shotOf(page, '02b-map-both');
  await slide(page);
  await page.waitForFunction(() => document.querySelector('.proto.heart').dataset.slid === '1', null, { timeout: 3000 });
  ok(await visible(page, '.judge-bar'), T('the judge bar shows after the slide'));
  await shotOf(page, '02c-map-slid');
  // Help replays the parts and asks for another slide
  const c0 = (await clips(page)).length;
  await tapEl(page, sel(page, '.judge-btn.help')); await page.waitForTimeout(1800);
  if (rec) ok((await clips(page)).slice(c0).filter((s) => s === 'th-buzz.mp3').length === 1, T('Help plays the th recording again'));
  else ok((await prompt(page)) === 'Say: uh', T('Help shows the parts again (ends on the heart prompt)'));
  ok((await dset(page, '.proto.heart', 'slid')) === '0' && !(await visible(page, '.judge-bar')), T('then the slide is open again'));
  await slide(page);
  await page.waitForFunction(() => document.querySelector('.proto.heart').dataset.slid === '1', null, { timeout: 3000 });
  await got(page);
  await toDone(page); ok(true, T('Map it reaches done'));
  await page.waitForTimeout(500);
  ok((await ttsAll(page)).filter((t) => t === 'the').length >= 2, T('the phone says the whole word after Got it'));

  // 3. Fix the word
  await nextInner(page, 'fix');
  const card = await text(page, '.hw-fix');
  ok(/Say it the way it's spelled: thee\./.test(card) && card.includes("Ask: what's the real word?"), T(`the grown-up card (${card})`));
  ok(card.includes('This builds flexible reading: when a word sounds odd, try the other sound.'), T('the one-line note'));
  ok(!(await ttsAll(page)).some((t) => /thee/i.test(t)), T('the phone never says "thee"'));
  await shotOf(page, '03a-fix');
  await tapEl(page, sel(page, '.judge-btn.help')); await page.waitForTimeout(400);
  ok(await visible(page, '.ri-panel'), T('Help shows a hint with the real word'));
  await tapEl(page, sel(page, '.ri-panel .px-hear')); await page.waitForTimeout(300);
  ok((await text(page, '.hw-hint .ri-text')) === 'Try the other sound for the letter e. The real word is "the".', T('the Fix-it hint says "the letter e" (no "thee" typo)'));
  await shotOf(page, '03b-fix-help');
  await got(page);
  await toDone(page); ok(true, T('Fix the word reaches done'));

  // 4. Spell it
  await nextInner(page, 'spell');
  ok((await ttsAll(page)).includes('the'), T('Spell it: the phone says the word'));
  const tray = await page.evaluate(() => [...document.querySelectorAll('.bi-tile')].map((t) => t.dataset.letter).sort().join(''));
  ok(tray === 'aehmst', T(`the tray holds t h e and taught letters (${tray})`));
  ok((await sel(page, '.bi-slot').count()) === 3, T('three boxes'));
  await shotOf(page, '04a-spell');
  const gap = await page.evaluate(() => { const a = document.querySelector('.bi-slots').getBoundingClientRect(), t = document.querySelector('.bi-tray').getBoundingClientRect(), tile = document.querySelector('.bi-tile').getBoundingClientRect(); return { gap: t.top - a.bottom, tileH: tile.height, tileW: tile.width, bg: getComputedStyle(document.querySelector('.bi-tray')).backgroundColor }; });
  ok(gap.gap >= 24 && gap.tileH >= 48 && gap.tileW >= 48 && gap.bg !== 'rgba(0, 0, 0, 0)', T(`Spell it: the answer row and the tile tray are clearly apart (${Math.round(gap.gap)} px gap, tinted tray, 48 px tiles)`));
  for (const ch of 'sem') await tapEl(page, sel(page, `.bi-tile[data-letter="${ch}"]`));
  await page.waitForTimeout(500);
  ok((await dset(page, '.proto.heart', 'wrong')) === '1', T('a wrong spelling is counted'));
  ok((await dset(page, '.proto.heart', 'filled')) === 'sem', T('and is NOT fixed for the child'));
  ok(/first sound/.test((await text(page, '.bi-hint-text')) || ''), T('the hint names the place, not the answer'));
  ok((await dset(page, '.proto.heart', 'state')) === 'working', T('not done after a wrong spelling'));
  await shotOf(page, '04b-spell-wrong');
  for (let k = 0; k < 3; k++) await tapEl(page, sel(page, '.bi-slot.filled')); // a tap on a filled box sends its tile back
  await page.waitForTimeout(300);
  ok((await dset(page, '.proto.heart', 'filled')) === '', T('tapping filled boxes sends the tiles back'));
  for (const ch of 'the') await tapEl(page, sel(page, `.bi-tile[data-letter="${ch}"]`));
  await page.waitForTimeout(500);
  ok((await dset(page, '.proto.heart', 'state')) === 'right', T('the right spelling is accepted'));
  await shotOf(page, '04c-spell-right');
  await page.waitForTimeout(1600);

  // 5. Find it
  await nextInner(page, 'find');
  ok((await sel(page, '.hw-w').count()) === 5, T('the sentence as five big word tiles'));
  const words = await page.evaluate(() => [...document.querySelectorAll('.hw-w')].map((b) => b.dataset.word).join(' '));
  ok(words === 'sam sat at the map', T(`the words (${words})`));
  ok((await text(page, '.px-chip')) === 'Read the sentence together, then tap the heart word', T('Find it: the first chip reads "Read the sentence together, then tap the heart word"'));
  const fscript = await page.evaluate(() => document.querySelector('.script-sheet .sheet-body').textContent);
  ok(fscript.includes('Read the sentence together, then your child taps the heart word') && fscript.includes('Ask your child to read it. If they know some of the letters, sound it out together. Still stuck? Read it yourself, then have your child say it after you.'), T('Find it: the grown-up script matches the chip and has the read-it help'));
  await shotOf(page, '05a-find');
  if (!red) await idleCheck(page, ok, T('find'));
  for (const w of ['sam', 'at', 'map']) { await tapEl(page, sel(page, `.hw-w[data-word="${w}"]`)); await page.waitForTimeout(250); }
  ok((await dset(page, '.proto.heart', 'found')) === '0' && !(await visible(page, '.judge-bar')), T('no other word is accepted'));
  ok((await dset(page, '.proto.heart', 'miss')) === '3', T('three misses counted'));
  await shotOf(page, '05b-find-miss');
  await tapEl(page, sel(page, '.hw-w[data-word="the"]')); await page.waitForTimeout(700);
  ok((await dset(page, '.proto.heart', 'found')) === '1', T('"the" is accepted'));
  ok(await page.evaluate(() => document.querySelector('.hw-w.found').dataset.word === 'the' && getComputedStyle(document.querySelector('.hw-w.found .hw-wheart')).opacity === '1'), T('the word glows with its little heart'));
  ok(await visible(page, '.judge-bar'), T('then the child reads the sentence: the judge bar'));
  ok(!(await ttsAll(page)).includes(SENTENCE), T('the fluent model waits until the child has read it'));
  await shotOf(page, '05c-find-found');
  await tapEl(page, sel(page, '.judge-btn.help')); await page.waitForTimeout(3800);
  ok(await visible(page, '.judge-bar'), T('Help reads it word by word, then the judge returns'));
  await got(page);
  ok((await sel(page, '.px-hear').count()) === 1, T('Hear it appears after the sentence was read'));
  await tapEl(page, sel(page, '.px-hear')); await page.waitForTimeout(400);
  ok((await ttsAll(page)).includes(SENTENCE), T('Hear it reads the whole sentence'));
  await shotOf(page, '05d-find-heard');
  await page.waitForTimeout(1000);

  // the voice: only the word, the sentence and instructions
  const said = await ttsAll(page);
  ok(said.every((t) => ALLOWED_TTS.has(t) || (!SOUNDY(t) && t.split(/\s+/).length >= 8)), T(`the phone only said the word, the sentence and instructions (${JSON.stringify([...new Set(said)])})`));
  ok(!said.some(SOUNDY), T('no isolated sound, "uh" or "thee" reached text to speech'));

  // done
  await tapEl(page, sel(page, '.btn.next'));
  await page.waitForSelector('.proto-heart-done', { timeout: 4000 }); await page.waitForTimeout(1500);
  ok(page.url().endsWith('#/proto/heart/done'), T('Next leaves for the celebration'));
  ok((await text(page, '.proto-heart-done h1')) === 'You learned a heart word!', T('the celebration'));
  ok((await sel(page, '.proto-heart-done .hw-tile').count()) === 2, T('the word with its heart'));
  await shotOf(page, '06-done');
  const store1 = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('reading.v1')); return JSON.stringify({ l: s.lessons, v: s.levels, w: s.worlds, t: s.settings.trainAt }); });
  ok(store0 === store1, T('nothing was written to progress'));
  await tapEl(page, sel(page, '.pf-back')); await page.waitForSelector('.grownups', { timeout: 4000 });
  ok(page.url().endsWith('#/grownups'), T('Back to Grownups'));
  ok(errors.length === 0, T('no console errors ' + errors.join(' | ')));
  await ctx.close();
}

// A th recording that is missing falls back to the prompt (and "Say: uh" always does).
async function sizes({ browser, url, ok }) {
  shotsOn = true;
  for (const vp of [PHONE, SMALL, LAND]) {
    for (const phase of ['meet', 'map', 'fix', 'spell', 'find']) {
      const { ctx, page, errors } = await open(browser, url, vp);
      const order = ['meet', 'map', 'fix', 'spell', 'find'];
      for (const p of order.slice(1, order.indexOf(phase) + 1)) await nextInner(page, p);
      // the busiest state of each screen
      if (phase === 'meet') { await tapEl(page, sel(page, '.hw-tried')); await page.waitForTimeout(400); }
      if (phase === 'map') { await tapEl(page, sel(page, '.hw-tile.th')); await tapEl(page, sel(page, '.hw-tile.e')); await page.waitForTimeout(500); await slide(page); await page.waitForTimeout(500); }
      if (phase === 'fix') { await tapEl(page, sel(page, '.judge-btn.help')); await page.waitForTimeout(400); }
      if (phase === 'spell') { for (const ch of 'sem') await tapEl(page, sel(page, `.bi-tile[data-letter="${ch}"]`)); await page.waitForTimeout(500); }
      if (phase === 'find') {
        // the long first chip (two lines at most) must fit before anything is tapped
        await page.waitForTimeout(500);
        const c = await page.evaluate(() => { const e = document.querySelector('.hw-find-chip'), q = e.getBoundingClientRect(), a = document.querySelector('.task-activity'); return { l: q.left, r: q.right, w: innerWidth, lines: Math.round((q.height - parseFloat(getComputedStyle(e).paddingTop) - parseFloat(getComputedStyle(e).paddingBottom)) / parseFloat(getComputedStyle(e).lineHeight)), scroll: a.scrollHeight - a.clientHeight, over: e.scrollWidth > e.clientWidth + 1 }; });
        ok(c.l >= 0 && c.r <= c.w && c.lines <= 2 && c.scroll <= 1 && !c.over, `${vp.name} find: the first chip fits (${JSON.stringify(c)})`);
        await tapEl(page, sel(page, '.hw-w[data-word="the"]')); await page.waitForTimeout(600);
      }
      await page.waitForTimeout(500);
      const tag = `${vp.name} ${phase}`;
      const r = await page.evaluate(() => {
        const small = [...document.querySelectorAll('.task-stage button, .task-foot button')].filter((b) => !b.hidden && b.offsetParent && !b.closest('[hidden]')).map((b) => { const q = b.getBoundingClientRect(); return { c: b.className, w: Math.round(q.width), h: Math.round(q.height) }; }).filter((q) => q.w < 47.5 || q.h < 47.5);
        const a = document.querySelector('.task-activity');
        return { small, scroll: a.scrollHeight - a.clientHeight, wide: document.documentElement.scrollWidth - innerWidth };
      });
      ok(r.small.length === 0, `${tag}: every button is 48 px or more (${JSON.stringify(r.small)})`);
      ok(r.wide <= 0, `${tag}: no sideways scrolling (${r.wide})`);
      ok(r.scroll <= 1, `${tag}: the busiest state needs no scrolling (${r.scroll} px over)`);
      ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
      if (vp === LAND && (phase === 'meet' || phase === 'find')) await shotOf(page, `land-${phase}`);
      await ctx.close();
    }
  }
}

// Reduced motion keeps every control working (the walk above runs once with it), and the tiles do not nudge.
async function reducedCheck({ browser, url, ok }) {
  const { ctx, page, errors } = await open(browser, url, PHONE, { reduced: true });
  await tapEl(page, sel(page, '.hw-tried')); await page.waitForTimeout(300);
  await nextInner(page, 'map');
  await tapEl(page, sel(page, '.hw-tile.th')); await page.waitForTimeout(300);
  const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.proto.heart') && a.effect.getComputedTiming().endTime > 600).length);
  ok(anims === 0, `reduced motion: nothing animates on Map it (${anims})`);
  ok(errors.length === 0, 'reduced motion: errors ' + errors.join(' | '));
  await ctx.close();
}

// Grownups > Previews: the button, the route, Back, and no progress written.
async function entry({ browser, url, ok }) {
  const made = await newPage(browser, PHONE);
  const { page, errors } = made;
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: {}, settings: { seenScripts: SEEN, dev: true }, firstRunDone: true, meetDue: false })}))`);
  await page.goto(url + '#/home');
  await page.waitForSelector('.pill-hold'); await page.waitForTimeout(900);
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up();
  await page.waitForSelector('.grownups'); await page.waitForTimeout(500);
  await page.locator('.gu-fold', { hasText: 'Previews' }).click(); await page.waitForTimeout(300);
  const b = sel(page, '#gu-fold-previews .preview-btn[data-preview="proto-heart"]');
  ok((await b.count()) === 1 && (await text(page, '#gu-fold-previews .preview-btn[data-preview="proto-heart"]')) === 'Heart word: the', 'Grownups: the "Heart word: the" preview button');
  await b.scrollIntoViewIfNeeded();
  const pb = await b.boundingBox();
  ok(pb.height >= 48, `Grownups: the button is 48 px or more (${Math.round(pb.height)})`);
  await tapEl(page, b); await page.waitForSelector('.proto.heart');
  ok(page.url().endsWith('#/proto/heart'), 'Grownups: the button opens #/proto/heart');
  ok((await page.locator('.task-head .dots').getAttribute('aria-label')) === 'Step 1 of 5', 'the progress dots count five sub-steps');
  await tapEl(page, sel(page, '.task-head .icon-btn')); await page.waitForSelector('.grownups', { timeout: 4000 });
  ok(page.url().endsWith('#/grownups'), 'the back arrow returns to Grownups');
  ok(errors.length === 0, 'entry: errors ' + errors.join(' | '));
  await made.ctx.close();
}

export async function run() {
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  const only = process.env.ONLY; // ONLY=sizes while tuning the layout
  if (!only) { await entry({ browser, url, ok }); await walk(browser, url, ok, 'prompts'); await walk(browser, url, ok, 'recording'); await walk(browser, url, ok, 'reduced'); await reducedCheck({ browser, url, ok }); }
  if (!only || only === 'sizes') await sizes({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`proto-heart: ${checks - failures}/${checks} checks passed`);
  return failures;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) process.exit((await run()) ? 1 : 0);
