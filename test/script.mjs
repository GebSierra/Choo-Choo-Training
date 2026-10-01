// The parent script: a compact bar that opens as a sheet over the stage, and never squeezes the activity.
// Run alone with `node test/script.mjs`, or as part of test/smoke.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN } from './lib.mjs';
import { tasksFor, soundPhrase } from '../js/lessons.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const seed = (settings) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:{1:{tasksDone:[],result:'got-it'},2:{tasksDone:[],result:'got-it'},3:{tasksDone:[],result:'got-it'}},settings:${JSON.stringify(settings)},firstRunDone:true})); }`; // once per tab, so a reload keeps what the page saved
const stageBox = (page) => page.evaluate(() => { const r = document.querySelector('.task-stage').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const expanded = (page) => page.getAttribute('.screen:not(.leaving) .script-toggle', 'aria-expanded'); // not the screen that is leaving
const sheetShown = (page) => page.evaluate(() => { const s = document.querySelector('.screen:not(.leaving) .script-sheet'); return !!s && !s.hidden && getComputedStyle(s).display !== 'none'; });

async function open(browser, url, vp, route, settings = { seenScripts: SEEN }, extra) {
  const made = await newPage(browser, vp, extra);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(seed(settings));
  await made.page.goto(url + route);
  await made.page.waitForSelector(route === '#/home' ? '.home' : '.task-screen');
  await made.page.waitForTimeout(700);
  return made;
}
const route = (n, type) => `#/lesson/${n}/task/${tasksFor(CUR.lessons[n - 1]).find((t) => t.type === type).index}`;

// The controls each kind of task is for: all of them must sit inside the stage and the screen, unclipped.
const PRIMARY = {
  review: ['.slide-track'], newLetter: ['.slide-track', '.word-tile:first-child'], story: ['.hold-btn'], words: ['.parts-row', '.merged-tile', '.btn.ghost.small'],
  sounds: ['.sounds-stage', '.btn.ghost.small'], writing: ['.tp-ink', '.writing-buttons .btn'], hunt: ['.sky-letter', '.sheep-wrap', '.star-row'],
  barn: ['.barn', '.star-row'], check: ['.opt-card'],
};
async function controlsFit(page, selectors, vp) {
  return page.evaluate(([sels, w, h]) => {
    const stage = document.querySelector('.task-stage').getBoundingClientRect(), bad = [];
    for (const sel of sels) {
      const els = [...document.querySelectorAll(sel)];
      if (!els.length) { bad.push(`${sel}: missing`); continue; }
      for (const e of els) {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.left < -1 || r.top < -1 || r.right > w + 1 || r.bottom > h + 1) bad.push(`${sel}: outside the screen`);
        if (r.left < stage.left - 1 || r.right > stage.right + 1 || r.top < stage.top - 1 || r.bottom > stage.bottom + 1) bad.push(`${sel}: outside the stage`);
      }
    }
    const a = document.querySelector('.task-activity');
    if (a.scrollHeight > a.clientHeight + 1) bad.push(`the activity needs scrolling (${a.scrollHeight} in ${a.clientHeight})`);
    return bad;
  }, [selectors, vp.width, vp.height]);
}

// Every task of every lesson, compact and with the full card, at the three viewports.
export async function roomChecks({ browser, url, ok }) {
  for (const vp of VIEWPORTS) {
    const gains = [];
    for (const full of [false, true]) {
      const { ctx, page, errors } = await open(browser, url, vp, '#/home', { seenScripts: SEEN, fullInstructions: full });
      for (const L of [1, 2, 3]) {
        for (const t of tasksFor(CUR.lessons[L - 1])) {
          await page.goto(url + `#/lesson/${L}/task/${t.index}`); await page.reload();
          await page.waitForSelector('.task-screen'); await page.waitForTimeout(650);
          const tag = `${vp.name} L${L} ${t.type} ${full ? 'full card' : 'compact'}`;
          const box = await stageBox(page);
          if (full) gains.push({ key: `${L}${t.type}`, full: box.h, card: await page.evaluate(() => document.querySelector('.script-card').getBoundingClientRect().height) });
          else gains.push({ key: `${L}${t.type}`, compact: box.h });
          if (full) continue;
          const bad = await controlsFit(page, PRIMARY[t.type], vp);
          ok(bad.length === 0, `${tag}: every primary control is fully visible (${bad.join('; ')})`);
          ok((await page.locator('.script-bar').count()) === 1 && (await page.locator('.script-bar').boundingBox()).height <= 57, `${tag}: the script is one bar of 56 px`);
        }
      }
      ok(errors.length === 0, `${vp.name} room (${full ? 'full' : 'compact'}): errors ${errors.join(' | ')}`);
      await ctx.close();
    }
    // What the bar gives back: everything the card took, less the 56 px bar (and at least 90 px wherever the card was tall).
    const by = {};
    for (const g of gains) by[g.key] = { ...(by[g.key] || {}), ...g };
    const rows = Object.values(by);
    if (vp.width < vp.height) {
      const short = rows.filter((r) => r.compact - r.full < Math.min(90, r.card - 60));
      ok(short.length === 0, `${vp.name}: the compact bar gives the stage back the card's height less 56 px, at least 90 px for the tall cards (${rows.map((r) => `${r.key}:${Math.round(r.compact - r.full)}`).join(' ')})`);
      ok(rows.filter((r) => r.key.endsWith('words') || r.key.endsWith('sounds')).every((r) => r.compact - r.full >= 60), `${vp.name}: Saying Words and Saying Sounds, which clipped, gain at least 60 px`);
    } else {
      ok(rows.every((r) => Math.abs(r.compact - r.full) <= 1), `${vp.name}: in landscape the stage is a column of its own and keeps its size`);
    }
  }
  // The states that clipped on Geb's phone: a picture word and the revealed word in Saying Words.
  for (const vp of VIEWPORTS) {
    const { ctx, page, errors } = await open(browser, url, vp, route(1, 'sounds'));
    const b = await page.locator('.sounds-stage .pic-frame').boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForSelector('.slide-band'); await page.waitForTimeout(600);
    let bad = await controlsFit(page, ['.sounds-stage', '.btn.ghost.small', '.glyph-row'], vp);
    ok(bad.length === 0, `${vp.name}: a revealed picture word leaves Next word visible (${bad.join('; ')})`);
    await page.goto(url + route(2, 'words')); await page.reload(); await page.waitForSelector('.merged-tile'); await page.waitForTimeout(600);
    const m = await page.locator('.merged-tile').boundingBox();
    await page.touchscreen.tap(m.x + m.width / 2, m.y + m.height / 2);
    await page.waitForSelector('.slide-band'); await page.waitForTimeout(900);
    bad = await controlsFit(page, ['.merged-tile', '.btn.ghost.small'], vp);
    ok(bad.length === 0, `${vp.name}: the revealed Saying Words word leaves Next word visible (${bad.join('; ')})`);
    ok(errors.length === 0, `${vp.name} revealed states: errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// The text of the bar's gist, with the drawn single-story "a" read back as the letter.
const gistOf = (page) => page.evaluate(() => [...document.querySelector('.screen:not(.leaving) .script-first').childNodes].map((n) => (n.classList && n.classList.contains('inline-a') ? 'a' : n.textContent)).join(''));

// Every task's gist: not empty, at most 28 characters, holds the current sound or word (Letter Writing has neither),
// follows the word when it changes, and the games do not open the sheet by themselves.
export async function gistChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[2]; // the narrowest phone: every gist must show whole there
  const { ctx, page, errors } = await open(browser, url, vp, '#/home');
  let seenGists = 0;
  for (const L of CUR.lessons) {
    const P = soundPhrase(CUR.sounds[L.sound]);
    for (const t of tasksFor(L)) {
      await page.evaluate((r) => { location.hash = r; }, `#/lesson/${L.number}/task/${t.index}`);
      await page.waitForFunction((r) => location.hash === r && document.querySelector('.screen:not(.leaving) .script-first') && !document.querySelector('.screen.leaving'), `#/lesson/${L.number}/task/${t.index}`);
      await page.waitForTimeout(150);
      const gist = await gistOf(page);
      const want = { review: soundPhrase(CUR.sounds[L.review[0]] || CUR.sounds.m), words: L.sayingWords[0].parts[0], sounds: L.sayingSounds[0].word, writing: '' }[t.type] ?? P;
      const fits = await page.evaluate(() => { const e = document.querySelector('.screen:not(.leaving) .script-first'); return e.scrollWidth <= e.clientWidth; });
      ok(fits, `lesson ${L.number} ${t.type}: the gist "${gist}" fits the bar at 360 px without an ellipsis`);
      ok(gist.length > 0 && gist.length <= 28 && gist.includes(want), `lesson ${L.number} ${t.type}: gist "${gist}" is 1 to 28 characters and holds "${want}"`);
      seenGists++;
      if (t.type === 'words' || t.type === 'sounds') {
        const list = t.type === 'words' ? L.sayingWords : L.sayingSounds;
        for (let k = 1; k < list.length; k++) {
          await page.click('.btn.ghost.small');
          await page.waitForTimeout(200);
          const g = await gistOf(page);
          ok(g.length <= 28 && g.includes(t.type === 'words' ? list[k].parts[0] : list[k].word), `lesson ${L.number} ${t.type}: the gist follows the next word ("${g}")`);
        }
      }
    }
  }
  ok(seenGists === CUR.lessons.reduce((n, L) => n + tasksFor(L).length, 0), 'every task of every lesson was checked for a gist');
  await page.evaluate(() => { location.hash = '#/checkpoint/c1'; });
  await page.waitForSelector('.sack-card');
  await page.waitForTimeout(200);
  const sg = await gistOf(page);
  ok(sg.length > 0 && sg.length <= 28 && /^Ask: /.test(sg), `Sound Sack: gist "${sg}"`);
  ok(errors.length === 0, 'gists: errors ' + errors.join(' | '));
  await ctx.close();
}

export async function barChecks({ browser, url, ok, vp, shot }) {
  const tag = `${vp.name} script bar`;
  const { ctx, page, errors } = await open(browser, url, vp, route(1, 'sounds'));
  const portrait = vp.width < vp.height;
  ok((await expanded(page)) === 'false' && !(await sheetShown(page)), `${tag}: it starts compact`);
  ok((await page.getAttribute('.script-toggle', 'aria-controls')) === (await page.getAttribute('.script-sheet', 'id')), `${tag}: the bar controls the sheet (aria-controls)`);
  const peek = await page.locator('.script-first').innerText();
  ok(/^Stretch: mmmoon, then moon\.$/.test(peek) && (await page.evaluate(() => { const e = document.querySelector('.script-first'); return getComputedStyle(e).whiteSpace === 'nowrap' && getComputedStyle(e).textOverflow === 'ellipsis'; })), `${tag}: it shows the gist on one line, with an ellipsis as a safety ("${peek.slice(0, 30)}")`);
  if (shot) await shot(page, 'compact');
  const before = await stageBox(page);
  // Tapping the bar opens the sheet without touching the stage; focus goes to the close button.
  await page.click('.script-toggle');
  await page.waitForTimeout(400);
  const after = await stageBox(page);
  ok((await expanded(page)) === 'true' && (await sheetShown(page)), `${tag}: tapping the bar opens the sheet (aria-expanded true)`);
  ok(Math.abs(after.h - before.h) < 0.5 && Math.abs(after.w - before.w) < 0.5 && Math.abs(after.y - before.y) < 0.5, `${tag}: the stage keeps its exact size when the sheet opens`);
  const sheet = await page.locator('.script-sheet').boundingBox();
  ok(sheet.height <= vp.height * 0.55 + 1, `${tag}: the sheet is at most 55% of the screen (${Math.round(sheet.height)} of ${vp.height})`);
  if (portrait) ok(sheet.y < before.y + before.h, `${tag}: in portrait the sheet opens over the stage`);
  ok(await page.evaluate(() => document.activeElement.classList.contains('sheet-close')), `${tag}: focus moves to the close button`);
  ok((await page.locator('.script-sheet .script-text').innerText()).length > 60, `${tag}: the full script is in the sheet`);
  if (shot) await shot(page, 'open');
  // The speaker says the same text in every state.
  const said = async (sel) => { await page.evaluate(() => { window.__spoken.length = 0; }); await page.locator(sel).first().click(); await page.waitForTimeout(250); return page.evaluate(() => window.__spoken.join(' | ')); };
  await page.mouse.click(2, 2);
  const inSheet = await said('.script-sheet .speak-btn');
  await page.click('.sheet-close');
  await page.waitForTimeout(400);
  const inBar = await said('.script-bar .speak-btn');
  ok(inBar.length > 10 && inBar === inSheet, `${tag}: the bar's speaker and the sheet's speak the same text ("${inBar.slice(0, 40)}...")`);
  // Every way of closing it.
  const reopen = async () => { await page.click('.script-toggle'); await page.waitForTimeout(350); };
  await reopen();
  await page.click('.sheet-close');
  await page.waitForTimeout(400);
  ok((await expanded(page)) === 'false' && !(await sheetShown(page)) && (await page.evaluate(() => document.activeElement.classList.contains('script-toggle'))), `${tag}: the chevron closes it and focus goes back to the bar`);
  await reopen();
  const st = await page.locator('.task-stage').boundingBox();
  await page.touchscreen.tap(st.x + 40, st.y + 40);
  await page.waitForTimeout(400);
  ok((await expanded(page)) === 'false', `${tag}: tapping the stage closes it`);
  await reopen();
  await page.click('.btn.again');
  await page.waitForTimeout(400);
  ok((await expanded(page)) === 'false', `${tag}: Again closes it`);
  await page.waitForTimeout(1100);
  await reopen();
  const onNext = await page.evaluate(() => { const t = document.querySelector('.script-toggle'); document.querySelector('.btn.next').click(); return t.getAttribute('aria-expanded'); });
  ok(onNext === 'false', `${tag}: Next closes it (in the same tap that moves on)`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await ctx.close();
}

export async function timerAndFirstVisitChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  // The 15 s timer, with fake timers.
  {
    const made = await newPage(browser, vp);
    const { ctx, page, errors } = made;
    await page.clock.install();
    await page.addInitScript(SPEECH_STUB);
    await page.addInitScript(seed({ seenScripts: SEEN }));
    await page.goto(url + route(1, 'words'));
    await page.waitForSelector('.script-toggle');
    await page.clock.runFor(800);
    await page.click('.script-toggle');
    await page.clock.runFor(400);
    ok((await expanded(page)) === 'true', 'timer: opened by a tap');
    await page.clock.runFor(14000);
    ok((await expanded(page)) === 'true', 'timer: still open after 14 s');
    await page.clock.runFor(1200);
    ok((await expanded(page)) === 'false', 'timer: closes by itself after 15 s');
    ok(errors.length === 0, 'timer: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // The first time a kind of task, or a lesson, is opened on the device: open for 6 s, then tuck away; afterwards compact.
  {
    const made = await newPage(browser, vp);
    const { ctx, page, errors } = made;
    await page.clock.install();
    await page.addInitScript(SPEECH_STUB);
    await page.addInitScript(seed({}));
    await page.goto(url + route(1, 'newLetter'));
    await page.waitForSelector('.script-toggle');
    await page.clock.runFor(300);
    ok((await expanded(page)) === 'false', 'first visit: compact for the first half second');
    await page.clock.runFor(700);
    ok((await expanded(page)) === 'true' && (await sheetShown(page)), 'first visit: the script opens by itself');
    await page.clock.runFor(5000);
    ok((await expanded(page)) === 'true', 'first visit: still open after 5 s');
    await page.clock.runFor(1500);
    await page.waitForTimeout(400);
    ok((await expanded(page)) === 'false' && !(await sheetShown(page)), 'first visit: tucks itself away after 6 s');
    const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.seenScripts);
    ok(seen.newLetter === true && seen['lesson:1'] === true, `first visit: remembered per task kind and lesson (${Object.keys(seen).join(', ')})`);
    await page.reload();
    await page.waitForSelector('.script-toggle');
    await page.clock.runFor(2000);
    ok((await expanded(page)) === 'false', 'afterwards: it stays compact until tapped');
    // A new lesson's first task opens it again; a later task of that lesson, whose kind was seen, does not.
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('reading.v1')); s.settings.seenScripts = { review: true, newLetter: true, story: true, words: true, sounds: true, writing: true, hunt: true, barn: true, check: true }; localStorage.setItem('reading.v1', JSON.stringify(s)); });
    await page.goto(url + route(2, 'review'));
    await page.waitForSelector('.script-toggle');
    await page.clock.runFor(1200);
    ok((await expanded(page)) === 'true', 'a lesson seen for the first time opens its first task with the script');
    await page.goto(url + route(2, 'newLetter'));
    await page.waitForSelector('.script-toggle');
    await page.clock.runFor(1500);
    ok((await expanded(page)) === 'false', 'a later task of that lesson stays compact');
    ok(errors.length === 0, 'first visit: errors ' + errors.join(' | '));
    await ctx.close();
  }
  // The games never open the sheet over the play, even on a first visit.
  for (const r of [route(1, 'hunt'), route(1, 'barn'), '#/checkpoint/c1']) {
    const { ctx, page, errors } = await newPage(browser, vp);
    await page.clock.install();
    await page.addInitScript(SPEECH_STUB);
    await page.addInitScript(seed({}));
    await page.goto(url + r);
    await page.waitForSelector('.script-toggle');
    await page.clock.runFor(2000);
    ok((await expanded(page)) === 'false' && !(await sheetShown(page)), `first visit of ${r.split('/').slice(-2).join('/')}: a game does not open the script over the play`);
    ok(errors.length === 0, 'first visit game: errors ' + errors.join(' | '));
    await ctx.close();
  }
}

export async function grownupsScriptChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  const { ctx, page, errors } = await open(browser, url, vp, '#/home');
  await page.waitForSelector('.pill-hold');
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(2250); await page.mouse.up();
  await page.waitForSelector('.grownups');
  await page.waitForTimeout(400);
  const setting = () => page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings.fullInstructions);
  ok((await page.getAttribute('[aria-label="Always show full instructions"]', 'aria-checked')) === 'false' && !(await setting()), 'Grownups: "Always show full instructions" is off by default');
  await page.click('[aria-label="Always show full instructions"]');
  ok((await setting()) === true, 'Grownups: the switch turns the full instructions on');
  await page.goto(url + route(1, 'sounds')); await page.reload();
  await page.waitForSelector('.task-screen');
  await page.waitForTimeout(600);
  ok((await page.locator('.script-card.full').count()) === 1 && (await page.locator('.script-bar').count()) === 0, 'full instructions: the card is always shown, no bar');
  ok((await page.evaluate(() => getComputedStyle(document.querySelector('.script-card .script-text')).fontSize)) === '16px', 'full instructions: compact 16 px type');
  const box = await stageBox(page);
  ok(box.h >= 300, `full instructions: the stage gets its room first (${Math.round(box.h)} px)`);
  const fullSaid = await (async () => { await page.evaluate(() => { window.__spoken.length = 0; }); await page.locator('.script-card .speak-btn').click(); await page.waitForTimeout(250); return page.evaluate(() => window.__spoken.join(' | ')); })();
  ok(fullSaid.length > 10, `full instructions: its speaker still speaks the script ("${fullSaid.slice(0, 40)}...")`);
  await page.reload(); await page.waitForSelector('.task-screen');
  ok((await page.locator('.script-card.full').count()) === 1, 'full instructions: the choice survives a reload');
  ok(errors.length === 0, 'Grownups script: errors ' + errors.join(' | '));
  await ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  fs.mkdirSync(path.join(ROOT, '_test'), { recursive: true });
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await roomChecks({ browser, url, ok });
  await gistChecks({ browser, url, ok });
  for (const vp of VIEWPORTS) await barChecks({ browser, url, ok, vp });
  await timerAndFirstVisitChecks({ browser, url, ok });
  await grownupsScriptChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`script: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
