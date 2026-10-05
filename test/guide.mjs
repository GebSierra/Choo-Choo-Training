// The grown-up guide: the welcome card on first run, the two-lesson tips in the script sheet, and the Grownups page.
// The text explains why the app says sounds, not letter names; it names letter names on purpose, so it must stay
// out of everything the child sees and hears. Run alone with `node test/guide.mjs`.
import { SPEECH_STUB } from './stubs.mjs';
import { startServer, loadPlaywright, launch, newPage, SEEN_BASE as SEEN, doneThrough } from './lib.mjs';

const seed = (settings = {}, lessons = doneThrough(4), firstRunDone = true) => `if (!localStorage.getItem('reading.v1')) localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons, settings, firstRunDone })}))`;
const NAMES_RE = /\b(em|ay)\b/i;
const SIZES = [{ name: 'phone', width: 412, height: 915, deviceScaleFactor: 2.6 }, { name: 'small', width: 360, height: 640, deviceScaleFactor: 3 }, { name: 'land', width: 915, height: 412, deviceScaleFactor: 2.6 }, { name: 'narrow', width: 360, height: 780, deviceScaleFactor: 3 }];

async function welcomeChecks(ok, browser, url) {
  for (const vp of SIZES) {
    const { ctx, page, errors } = await newPage(browser, vp);
    await page.addInitScript(SPEECH_STUB);
    await page.addInitScript(seed({}, {}, false));
    await page.goto(url + '#/home');
    await page.waitForSelector('.welcome');
    await page.waitForTimeout(800);
    const tag = `welcome ${vp.name}`;
    const fit = () => page.evaluate((h) => { const c = document.querySelector('.first-card'); const r = c.getBoundingClientRect(); return { fits: r.top >= 0 && r.bottom <= h, scroll: c.scrollHeight - c.clientHeight }; }, vp.height);
    const title = () => page.evaluate(() => document.querySelector('.wc-page.on h2').textContent);
    const body = () => page.evaluate(() => document.querySelector('.wc-page.on').textContent);
    const targets = () => page.evaluate(() => [...document.querySelectorAll('.welcome button')].filter((b) => getComputedStyle(b).visibility !== 'hidden').map((b) => { const r = b.getBoundingClientRect(); return [b.textContent.trim(), Math.round(r.width), Math.round(r.height)]; }));

    ok((await title()) === 'Welcome to Choo Choo Training', `${tag}: page 1 is the welcome`);
    let f = await fit();
    ok(f.fits && f.scroll <= 1, `${tag}: page 1 fits the screen with no scrolling (${JSON.stringify(f)})`);
    ok((await targets()).every(([, w, h]) => w >= 48 && h >= 48), `${tag}: every button is at least 48 px (${JSON.stringify(await targets())})`);
    ok((await page.locator('.wc-page[aria-hidden="true"]').count()) === 2, `${tag}: the two hidden pages are hidden from screen readers`);
    ok((await page.locator('.wc-back').evaluate((b) => getComputedStyle(b).visibility)) === 'hidden', `${tag}: no Back on the first page`);

    await page.click('.wc-next'); await page.waitForTimeout(450);
    ok((await title()) === 'Say the sound, not the name', `${tag}: page 2 is "Say the sound, not the name"`);
    const b2 = await body();
    ok(b2.includes('mmm for m, not “em”') && b2.includes('aaa (as in apple) for a, not “ay”') && /capital letters/.test(b2) && /simple as you can/.test(b2), `${tag}: page 2 says call m "mmm" not "em", a "aaa (as in apple)" not "ay", and keep it simple`);
    f = await fit(); ok(f.fits && f.scroll <= 1, `${tag}: page 2 fits (${JSON.stringify(f)})`);

    await page.click('.wc-next'); await page.waitForTimeout(450);
    ok((await title()) === 'Why it matters', `${tag}: page 3 is "Why it matters"`);
    const b3 = await body();
    ok(b3.includes('“em-ay”') && b3.includes('“maaa”') && /lowercase/.test(b3), `${tag}: page 3 explains ma is "maaa", not "em-ay", and lowercase first`);
    ok((await page.locator('.wc-next').textContent()).trim() === 'Start', `${tag}: the last page says Start`);
    f = await fit(); ok(f.fits && f.scroll <= 1, `${tag}: page 3 fits (${JSON.stringify(f)})`);

    await page.click('.wc-back'); await page.waitForTimeout(450);
    ok((await title()) === 'Say the sound, not the name', `${tag}: Back goes to page 2`);
    await page.click('.wc-next'); await page.waitForTimeout(450);
    await page.click('.wc-next'); await page.waitForTimeout(500);
    ok((await page.locator('.first-run').count()) === 0, `${tag}: Start closes the card`);
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).firstRunDone)) === true, `${tag}: it is remembered`);
    ok((await page.evaluate(() => window.__events.length)) === 0, `${tag}: nothing was spoken or played`);
    await page.reload(); await page.waitForSelector('.stone', { state: 'attached' }); await page.waitForTimeout(500);
    ok((await page.locator('.first-run').count()) === 0, `${tag}: the card does not come back`);
    ok(errors.length === 0, `${tag}: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Skip closes it from the first page.
  const { ctx, page } = await newPage(browser, SIZES[0]);
  await page.addInitScript(SPEECH_STUB); await page.addInitScript(seed({}, {}, false));
  await page.goto(url + '#/home'); await page.waitForSelector('.welcome'); await page.waitForTimeout(800);
  await page.click('.wc-skip'); await page.waitForTimeout(500);
  ok((await page.locator('.first-run').count()) === 0 && (await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).firstRunDone)), 'Skip closes the welcome and remembers it');
  await ctx.close();
}

async function tipChecks(ok, browser, url) {
  const open = async (settings, route, vp = SIZES[0]) => {
    const made = await newPage(browser, vp);
    await made.page.addInitScript(SPEECH_STUB); await made.page.addInitScript(seed(settings));
    await made.page.goto(url + route);
    await made.page.waitForSelector('.task-screen');
    return made;
  };
  const sheet = (page) => page.evaluate(() => { const s = document.querySelector('.script-sheet'); return s ? { shown: !s.hidden && getComputedStyle(s).opacity === '1', tip: document.querySelector('.script-sheet .grown-tip')?.textContent || null } : null; });
  const TIPS = [['1', '0', 'newLetter', 'mmm, not “em”'], ['2', '1', 'newLetter', 'aaa (as in apple), not “ay”'], ['1', '4', 'writing', 'Lowercase first'], ['2', '4', 'sounds', 'maaa']];

  // First visit with a clean device: lesson 1 New Letter opens the script by itself, tip included.
  let m = await open({}, '#/lesson/1/task/0'); await m.page.waitForTimeout(1300);
  let s = await sheet(m.page);
  ok(s && s.shown && s.tip && s.tip.startsWith('Grown-up tip: ') && s.tip.includes('mmm, not “em”'), `lesson 1 New Letter: the script opens by itself with the tip (${s && s.tip})`);
  ok(!NAMES_RE.test(await m.page.evaluate(() => document.querySelector('.task-stage').innerText)), 'lesson 1 New Letter: no letter name anywhere on the stage the child sees');
  // The tip is not read aloud: tapping the sheet's speaker speaks the script only.
  await m.page.click('.script-sheet .sheet-head .speak-btn'); await m.page.waitForTimeout(600);
  const spoken = await m.page.evaluate(() => window.__events.filter((e) => e.type === 'tts').map((e) => e.text).join(' | '));
  ok(!NAMES_RE.test(spoken) && !/Grown-up tip/.test(spoken), `the tip is never spoken (${spoken})`);
  await m.page.evaluate(() => { location.hash = '#/home'; }); await m.page.waitForTimeout(300);
  await m.page.evaluate(() => { location.hash = '#/lesson/1/task/0'; }); await m.page.waitForSelector('.new-letter'); await m.page.waitForTimeout(1300);
  s = await sheet(m.page);
  ok(s && !s.shown && s.tip, 'lesson 1 New Letter, second visit: the script stays closed (the tip is still in it)');
  await m.ctx.close();

  // Everything else already seen: the tip alone opens the script, once, on lesson 2 New Letter; lesson 3 has no tip.
  m = await open({ seenScripts: SEEN }, '#/lesson/2/task/1'); await m.page.waitForTimeout(1300);
  s = await sheet(m.page);
  ok(s && s.shown && s.tip && s.tip.includes('aaa (as in apple), not “ay”'), `lesson 2 New Letter: the tip opens the script by itself (${s && s.tip})`);
  ok(!NAMES_RE.test(await m.page.evaluate(() => document.querySelector('.task-stage').innerText)), 'lesson 2 New Letter: no letter name on the stage');
  await m.ctx.close();
  m = await open({ seenScripts: SEEN }, '#/lesson/3/task/1'); await m.page.waitForTimeout(1300);
  s = await sheet(m.page);
  ok(s && !s.shown && s.tip === null, 'lesson 3 New Letter: no tip and the script stays closed');
  await m.ctx.close();

  // The other two tips are in the sheet (opened by hand).
  for (const [lesson, idx, type, text] of TIPS.slice(2)) {
    m = await open({ seenScripts: { ...SEEN, [`tip:${lesson}:${type}`]: true } }, `#/lesson/${lesson}/task/${idx}`);
    await m.page.waitForTimeout(900);
    await m.page.click('.script-toggle'); await m.page.waitForTimeout(500);
    s = await sheet(m.page);
    ok(s && s.shown && s.tip && s.tip.includes(text), `lesson ${lesson} task ${idx}: the tip "${text}" is in the opened script (${s && s.tip})`);
    await m.ctx.close();
  }
  // Always-show-full-instructions: the tip sits in the full card.
  m = await open({ seenScripts: SEEN, fullInstructions: true }, '#/lesson/2/task/1'); await m.page.waitForTimeout(900);
  ok((await m.page.locator('.script-card.full .grown-tip').count()) === 1, 'full instructions on: the tip sits in the card');
  await m.ctx.close();
  // Tips fit: the sheet stays inside the screen on the smallest phone.
  m = await open({}, '#/lesson/2/task/1', SIZES[1]); await m.page.waitForTimeout(1300);
  const box = await m.page.evaluate(() => { const r = document.querySelector('.script-sheet').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: innerHeight }; });
  ok(box.top >= 0 && box.bottom <= box.h, `the sheet with a tip fits a 360x640 screen (${Math.round(box.top)} to ${Math.round(box.bottom)})`);
  await m.ctx.close();
}

async function grownupsChecks(ok, browser, url) {
  const { ctx, page, errors } = await newPage(browser, SIZES[0]);
  await page.addInitScript(SPEECH_STUB); await page.addInitScript(seed({}));
  await page.goto(url + '#/home'); await page.waitForSelector('.pill-hold'); await page.waitForTimeout(900);
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up();
  await page.waitForSelector('.grownups'); await page.waitForTimeout(500);
  const head = page.locator('.gu-fold', { hasText: 'The thinking behind this app' });
  ok((await head.count()) === 1 && (await head.getAttribute('aria-expanded')) === 'false', 'Grownups: "The thinking behind this app" is there and closed');
  await head.click(); await page.waitForTimeout(300);
  const text = await page.evaluate(() => document.querySelector('#gu-fold-the-thinking-behind-this-app').textContent);
  ok(text.includes('Say the sound, not the name') && text.includes('“maaa”') && text.includes('Why it matters'), 'Grownups: opened, it holds the same explanation');
  ok(errors.length === 0, 'Grownups: no errors ' + errors.join(' | '));
  await ctx.close();
}

export async function guideChecks(ok, browser, url) {
  await welcomeChecks(ok, browser, url);
  await tipChecks(ok, browser, url);
  await grownupsChecks(ok, browser, url);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await guideChecks(ok, browser, url);
  await browser.close(); server.close();
  console.log(`guide: ${pass}/${pass + fail} checks passed`);
  process.exit(fail ? 1 : 0);
}
