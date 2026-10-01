// The Sound Sack checkpoint: its stone on the map, the drag game, the finish screen, Grownups and old saved data.
// Run alone with `node test/sack.mjs`, or as part of test/smoke.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { audit } from './audit.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, touchDrag, SEEN } from './lib.mjs';

const seed = (lessons, extra = {}) => `localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons, settings: { seenScripts: SEEN }, firstRunDone: true, ...extra })}))`;
const DONE = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it' }]));
const rect = (page, sel, i = 0) => page.evaluate(([s, k]) => { const e = document.querySelectorAll(s)[k]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, [sel, i]);
const rects = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }), sel);
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const mid = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const plain = (page) => page.evaluate(() => ({ clips: window.__events.filter((e) => e.type === 'clip').length, tts: window.__events.filter((e) => e.type === 'tts').length }));
const game = (page, k) => page.evaluate((key) => document.querySelector('.sack-game').dataset[key], k);
const scrolled = (page) => page.evaluate(() => document.querySelector('.task-activity').scrollTop + scrollY);

async function open(browser, url, vp, init, route) {
  const made = await newPage(browser, vp);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(init);
  await made.page.goto(url + route);
  return made;
}

// Drag the card matching `which` ('1' right, '0' wrong) to a point; returns where the card started.
async function dragCard(page, which, to, during) {
  const loc = page.locator(`.sack-card[data-correct="${which}"]:not([disabled])`).first();
  const start = await loc.boundingBox();
  const from = { x: start.x + start.width / 2, y: start.y + start.height / 2 };
  await touchDrag(page, from, to(), { steps: 16, during });
  return { start, word: await loc.getAttribute('data-word') };
}

export async function sackChecks({ browser, url, ok, CUR, vp, shot }) {
  const ck = CUR.checkpoints[0];
  const { ctx, page, errors } = await open(browser, url, vp, seed(DONE(3)), '#/checkpoint/c1');
  await page.waitForSelector('.sack-card');
  await page.waitForTimeout(800);
  const tag = `${vp.name} Sound Sack`;
  const sackBox = () => rect(page, '.sack');
  const cardBoxes = () => rects(page, '.sack-card');
  const sceneBox = await rect(page, '.farm');
  let sack = await sackBox(), cards = await cardBoxes();
  ok(cards.length === 3 && cards.every((c) => c.w >= 95.5 && c.h >= 95.5), `${tag}: three cards, each at least 96 px (${cards.map((c) => Math.round(c.w)).join(', ')})`);
  ok(sack.w >= 129.5, `${tag}: the sack is at least 130 px wide (${Math.round(sack.w)})`);
  ok(!cards.some((c, i) => cards.slice(i + 1).some((d) => overlaps(c, d))) && !cards.some((c) => overlaps(c, sack)), `${tag}: the cards never overlap each other or the sack`);
  ok(cards.every((c) => c.x >= sceneBox.x && c.x + c.w <= sceneBox.x + sceneBox.w && c.y >= sceneBox.y && c.y + c.h <= sceneBox.y + sceneBox.h) && sack.y + sack.h <= sceneBox.y + sceneBox.h, `${tag}: everything fits in the scene`);
  ok(new Set(cards.map((c) => Math.round(c.y))).size === 3, `${tag}: the cards are staggered`);
  ok((await page.locator('.sack-front .glyph').count()) === 1, `${tag}: the sack shows a letter glyph`);
  const audited = await audit(page, tag);
  ok(audited.length === 0, audited.join(' | '));
  // Per-sound exclusion: a look-alike in the pool's `avoid` list never shows as a wrong card in that sound's round.
  // Again deals round 1 afresh each time; the sound changes with every shuffle, so many deals cover every sound.
  const avoid = Object.fromEntries(CUR.gameDistractors.filter((w) => w.avoid).map((w) => [w.word, w.avoid]));
  const dealt = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 90; i++) { document.querySelector('.btn.again').click(); out.push({ sound: document.querySelector('.sack-game').dataset.sound, wrong: [...document.querySelectorAll('.sack-card[data-correct="0"]')].map((c) => c.dataset.word) }); }
    return out;
  });
  const bad = dealt.filter((d) => d.wrong.some((w) => (avoid[w] || []).includes(d.sound)));
  ok(Object.keys(avoid).length >= 4 && new Set(dealt.map((d) => d.sound)).size === 3 && bad.length === 0, `${tag}: 90 deals never show a look-alike (avoid) as a wrong card (${bad.map((d) => d.sound + ':' + d.wrong).join(' ')})`);
  await page.waitForTimeout(600);
  const before = await plain(page);

  // A wrong card put in the sack glides home; a card let go anywhere else springs home; neither fills a star.
  const sound0 = await game(page, 'sound');
  let scrollMoved = false;
  const wrong = await dragCard(page, '0', () => mid(sack), async () => { if ((await scrolled(page)) !== 0) scrollMoved = true; });
  await page.waitForTimeout(1100);
  let again = (await cardBoxes());
  ok(await page.evaluate(() => document.querySelector('.sack-game').dataset.stars) === '0', `${tag}: a wrong card in the sack fills no star`);
  const back = await rect(page, `.sack-card[data-word="${wrong.word}"]`);
  ok(Math.abs(back.x - wrong.start.x) < 1.5 && Math.abs(back.y - wrong.start.y) < 1.5, `${tag}: the wrong card is back in its place`);
  ok((await game(page, 'round')) === '1' && (await game(page, 'sound')) === sound0, `${tag}: a wrong card changes nothing else`);
  const away = { x: sceneBox.x + 34, y: sceneBox.y + sceneBox.h * 0.5 }; // open sky, well clear of the sack
  const right0 = await dragCard(page, '1', () => away);
  await page.waitForTimeout(1100);
  const back2 = await rect(page, `.sack-card[data-word="${right0.word}"]`);
  ok(Math.abs(back2.x - right0.start.x) < 1.5 && Math.abs(back2.y - right0.start.y) < 1.5 && (await game(page, 'stars')) === '0', `${tag}: the right card let go away from the sack springs home`);
  ok(!scrollMoved && (await scrolled(page)) === 0, `${tag}: the stage never scrolled during a drag`);

  // Six rounds; every right card into the sack fills a star.
  const seen = [];
  for (let r = 1; r <= ck.rounds; r++) {
    await page.waitForFunction((k) => document.querySelector('.sack-game').dataset.round === String(k), r, { timeout: 4000 });
    await page.waitForTimeout(500);
    seen.push(await game(page, 'sound'));
    const choices = await page.evaluate(() => [...document.querySelectorAll('.sack-card')].map((c) => ({ word: c.dataset.word, correct: c.dataset.correct })));
    ok(choices.filter((c) => c.correct === '1').length === 1 && choices.every((c) => /^[a-z]+$/.test(c.word)), `${tag}: round ${r} has exactly one right card`);
    const sound = seen[r - 1];
    const startWords = CUR.sounds[sound].startWords.map((w) => w.word), pool = CUR.gameDistractors.map((w) => w.word);
    ok(choices.every((c) => (c.correct === '1' ? startWords.includes(c.word) : pool.includes(c.word))), `${tag}: round ${r} cards come from the data (${sound})`);
    if (r === 3 && shot) await shot(page, 'mid');
    sack = await sackBox();
    await dragCard(page, '1', () => mid(sack));
    await page.waitForFunction((k) => document.querySelector('.sack-game').dataset.stars === String(k), r, { timeout: 4000 });
    ok(true, `${tag}: round ${r} star filled`);
  }
  ok(seen.every((s, i) => !i || s !== seen[i - 1]), `${tag}: the same sound never comes twice in a row (${seen.join('')})`);
  ok(ck.sounds.every((s) => seen.filter((x) => x === s).length === ck.rounds / ck.sounds.length), `${tag}: the sounds are balanced over the rounds`);
  await page.waitForTimeout(1500);
  ok((await game(page, 'state')) === 'done' && (await page.locator('.gold-star.overflow').count()) > 0, `${tag}: six rounds reach the done state and the sack overflows with stars`);
  ok((await page.locator('.dots .dot.past').count()) === ck.rounds, `${tag}: the progress dots are all past`);
  if (shot) await shot(page, 'done');
  const audited2 = await audit(page, `${tag} done`);
  ok(audited2.length === 0, audited2.join(' | '));
  const after = await plain(page);
  ok(after.clips === before.clips && after.tts === before.tts, `${tag}: no sound or speech during play`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);

  // Again starts over.
  await page.click('.btn.again');
  await page.waitForTimeout(600);
  ok((await game(page, 'state')) === 'playing' && (await game(page, 'stars')) === '0' && (await game(page, 'round')) === '1' && (await page.locator('.gold-star.overflow').count()) === 0 && (await page.locator('.sack-card').count()) === 3, `${tag}: Again starts from round 1 with no stars`);
  // Next leads to the finish screen: two taps on Yes, then the path with a tick on the sack.
  await page.waitForTimeout(700);
  await page.click('.btn.next');
  await page.waitForSelector('.finish');
  ok(/That's the sound sack\./.test(await page.locator('.finish h1').innerText()), `${tag}: the finish screen says "That's the sound sack."`);
  ok(await page.locator('.btn.got').isDisabled(), `${tag}: the finish screen ignores taps at first`);
  await page.waitForTimeout(1700);
  await page.click('.btn.got');
  ok(/Yes, back to path/.test(await page.locator('.btn.got').innerText()) && page.url().endsWith('/finish'), `${tag}: the first Yes only arms the button`);
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).checkpoints.c1.result)) === 'got-it', `${tag}: the result is stored under checkpoints`);
  await page.click('.btn.got');
  await page.waitForSelector('.stone');
  await page.waitForTimeout(800);
  ok((await page.locator('.stone.is-done').count()) === 4, `${tag}: the path shows a tick on the sack stone`);
  await ctx.close();
}

export async function sackMapChecks({ browser, url, ok, vp }) {
  // Locked until lesson 3 is done, then it opens. Old saved data (no checkpoints key) loads fine.
  let made = await open(browser, url, vp, seed(DONE(2)), '#/home');
  let { page, errors } = made;
  await page.waitForSelector('.stone');
  await page.waitForTimeout(900);
  const tag = `${vp.name} map`;
  ok((await page.locator('.stone').count()) === 4, `${tag}: four stones (three lessons and the sack)`);
  const sackStone = page.locator('.stone[aria-label^="Sound Sack"]');
  ok((await sackStone.getAttribute('aria-label')) === 'Sound Sack, locked' && (await sackStone.evaluate((e) => e.classList.contains('is-locked'))), `${tag}: the sack stone is locked before lesson 3 is done`);
  await sackStone.click({ force: true });
  await page.waitForTimeout(400);
  ok(page.url().endsWith('#/home'), `${tag}: a locked sack does not open`);
  await page.evaluate(() => { location.hash = '#/checkpoint/c1'; });
  await page.waitForTimeout(600);
  ok(page.url().endsWith('#/home'), `${tag}: the sack cannot be opened by address while locked`);
  const b = await sackStone.boundingBox(), pill = await page.locator('.pill-hold').boundingBox();
  ok(b.width >= 48 && b.height >= 48 && !(b.x < pill.x + pill.width && pill.x < b.x + b.width && b.y < pill.y + pill.height && pill.y < b.y + b.height), `${tag}: the sack stone is a big target clear of the Grownups pill`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await made.ctx.close();

  made = await open(browser, url, vp, seed(DONE(3)), '#/home'); // no "checkpoints" key at all
  page = made.page; errors = made.errors;
  await page.waitForSelector('.stone');
  await page.waitForTimeout(900);
  ok((await page.locator('.stone.is-current[aria-label^="Sound Sack"]').count()) === 1, `${tag}: the sack stone is the current one once lesson 3 is done`);
  await page.locator('.stone[aria-label^="Sound Sack"]').click();
  await page.waitForSelector('.sack-game');
  ok(page.url().endsWith('#/checkpoint/c1'), `${tag}: tapping the sack opens the checkpoint`);
  ok((await page.locator('.task-head h1').innerText()) === 'Sound Sack', `${tag}: the screen is titled Sound Sack`);
  ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
  await made.ctx.close();
}

export async function sackGrownupsChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];
  const { ctx, page, errors } = await open(browser, url, vp, `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); ${seed({ 1: { tasksDone: [], result: 'got-it' } }, { checkpoints: { c1: { result: 'practice-again', completedAt: '2026-09-30T12:00:00Z' } } })} }`, '#/home');
  await page.waitForSelector('.pill-hold');
  await page.waitForTimeout(700);
  const hold = async () => { const gb = await page.locator('.pill-hold').boundingBox(); await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.waitForTimeout(2250); await page.mouse.up(); };
  await hold();
  await page.waitForSelector('.grownups');
  const rows = page.locator('.gu-card').first().locator('.gu-row');
  ok((await rows.count()) === 4, 'Grownups lists three lessons and the sound sack');
  ok(/Practice again/.test(await rows.nth(3).innerText()) && /Sound Sack/.test(await rows.nth(3).innerText()), 'Grownups shows the sack result');
  await page.click('[aria-label="Unlock the sound sack"]');
  ok((await page.locator('[aria-label="Confirm unlock"]').count()) === 1, 'Grownups: unlocking the sack asks first');
  await page.click('[aria-label="Confirm unlock"] button:has-text("Unlock")');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).checkpoints.c1.unlocked)) === true, 'Grownups: confirming unlocks the sack');
  await page.click('text=Reset all progress');
  await page.click('.btn.danger');
  await page.waitForSelector('.home');
  ok((await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('reading.v1')).checkpoints).length)) === 0, 'reset clears the sack result too');
  ok(errors.length === 0, 'Grownups sack: errors ' + errors.join(' | '));
  await ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
  fs.mkdirSync(path.join(ROOT, '_test'), { recursive: true });
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  for (const vp of VIEWPORTS) { await sackMapChecks({ browser, url, ok, vp }); await sackChecks({ browser, url, ok, CUR, vp }); }
  await sackGrownupsChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`sack: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
