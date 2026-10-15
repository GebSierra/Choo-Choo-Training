// The "Say this" bar (collapsed gist and expanded script) must never name a different sound than the round card, in every round of
// Green Light and Station Board in every Review Stop that has them; and no word the child must blend or read ever reaches the
// phone's text to speech (Saying Sounds). Run alone: node test/round-bar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, DONE_JSON } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const STOPS = CUR.checkpoints.filter((k) => k.kind === 'review');
const tokens = (t) => (t.match(/\b([a-z])\1{2}\b|\b(?:kw|ks|[a-z])-/g) || []);

let failures = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());

async function openRoute(route, settings = {}) {
  const made = await newPage(browser, { width: 390, height: 844, deviceScaleFactor: 2 });
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: JSON.parse(DONE_JSON), settings: { seenScripts: SEEN, ...settings }, firstRunDone: true, meetDue: false })}))`);
  await made.page.goto(url + route);
  return made;
}
const barTexts = (page) => page.evaluate(() => ({ gist: document.querySelector('.script-first').textContent, script: document.querySelector('.script-text').textContent, card: document.querySelector('.say-prompt').hidden ? '' : document.querySelector('.say-text').textContent }));

async function walk(page, tag, targetSel, rounds, cls) {
  for (let r = 0; r < rounds; r++) {
    await page.waitForFunction(([c, k]) => Number(document.querySelector('.' + c).dataset.round) === k, [cls, r], { timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector('.say-prompt').hidden, null, { timeout: 4000 }).catch(() => {});
    const t = await barTexts(page);
    const card = tokens(t.card);
    ok(card.length > 0, `${tag} round ${r + 1}: the card names a sound (${t.card})`);
    for (const [where, text] of [['gist', t.gist], ['script', t.script]]) ok(tokens(text).every((x) => card.includes(x)), `${tag} round ${r + 1}: the ${where} names only the card's sound (${tokens(text)} vs ${card}) [${text}]`);
    await page.locator(targetSel).first().tap();
    await page.waitForTimeout(1100);
  }
}

for (const k of STOPS) {
  for (const [i, a] of k.plan.entries()) {
    if (!['signals', 'board'].includes(a.task)) continue;
    const { ctx, page, errors } = await openRoute(`#/checkpoint/${k.id}/task/${i}`, { playSounds: false, migrated1912: true });
    await page.waitForSelector(a.task === 'signals' ? '.signal' : '.flap-tile');
    await page.mouse.click(3, 3);
    if (a.task === 'signals') await walk(page, `${k.id} Green Light`, '.signal[data-target="1"]', 4, 'signals');
    else await walk(page, `${k.id} Station Board`, '.flap-tile[data-target="1"]', 4, 'board-game');
    ok(errors.length === 0, `${k.id} ${a.task}: no errors ${errors.join(' | ')}`);
    await ctx.close();
  }
}

// No blend or read target reaches text to speech in Saying Sounds: auto-speak on open, tap the stage, Hear this again, Again, the script speaker.
{
  const sIdx = tasksFor(CUR.lessons[1]).find((t) => t.type === 'sounds').index;
  const { ctx, page } = await openRoute(`#/lesson/2/task/${sIdx}`, { autoSpeak: true, migrated1912: true });
  await page.mouse.click(3, 3);
  await page.waitForTimeout(1200);
  const words = new Set(CUR.lessons[1].sayingSounds.map((w) => w.word));
  for (let n = 0; n < 3; n++) {
    await page.locator('.sounds-stage').first().tap().catch(() => {});
    await page.waitForTimeout(300);
    await page.locator('.sounds-body .btn.ghost.small').first().tap().catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.locator('.task-stage > .speak-btn').click().catch(() => {});
  await page.locator('.btn.again').click().catch(() => {});
  await page.locator('.script-bar .speak-btn').first().click().catch(() => {});
  await page.waitForTimeout(600);
  const said = await page.evaluate(() => window.__events.filter((e) => e.type === 'tts').map((e) => e.text));
  ok(words.size > 0, 'Saying Sounds: found the words on screen');
  ok(said.every((t) => ![...words].some((w) => new RegExp(`\\b${w}\\b`, 'i').test(t))), `Saying Sounds: no word to blend reached text to speech (${JSON.stringify(said)})`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`round-bar: ${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
