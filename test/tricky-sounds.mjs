// Tricky Sounds (checkpoint kind "contrast", ids x1 to x8; docs/LESSON-REBUILD.md section 12): placement, content (only taught letters, child words, the right tunnel), the
// two new games (Two Tunnels, Which One?), Green Light on the two sounds, Ticket Check, the hold on the train, the passed-behind rule, the saved result, fit at three
// phone sizes and heat. Run alone with `node test/tricky-sounds.mjs [--shots]`; shots go to docs/screenshots/tricky-sounds/.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, showStop, doneThrough } from './lib.mjs';
import { ORDER_SOUNDS, lettersOfSounds, isReadable } from '../js/order.js';
import { checkpointStopIndex, finishedStop } from '../js/sequence.js';
import { tunnelRounds, whichRounds } from '../js/games-data.js';
import { state, openHome, until, RAF_COUNT } from './train.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const STOPS = CUR.checkpoints.filter((k) => k.kind === 'contrast');
const IDS = ['x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10'];
const AFTER = [9, 12, 14, 17, 18, 21, 22, 23, 27, 28];
const PAIRS = ['m n', 'h a', 'c g', 'b d', 'i e', 'f v', 'w y', 's z', 'sh ch', 'th t'];
const OLD_IDS = ['r1', 'b1', 'b2', 'b3', 'b4', 'v1', 'v6', 'v2', 'v3', 'v4', 'v5', 'v7', 'v8', 'v9', 'v10', 'v11'];
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/tricky-sounds');
const SIZES = [{ name: '360x640', width: 360, height: 640, deviceScaleFactor: 2 }, { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2 }, { name: '915x412', width: 915, height: 412, deviceScaleFactor: 2 }];
const PHONE = SIZES[1];
const NAMES = ['Two Tunnels', 'Which One?', 'Green Light', 'Ticket Check'];
const taughtBy = (n) => lettersOfSounds(ORDER_SOUNDS.slice(0, n));
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); };
const seq = (n) => { let s = n; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); }; // a seeded random for the data checks

export async function dataChecks({ ok }) {
  ok(STOPS.length === 10 && STOPS.map((k) => k.id).join() === IDS.join() && STOPS.map((k) => k.after).join() === AFTER.join(), `data: ten Tricky Sounds stops x1 to x10 (x9 and x10 are World 4) after lessons ${AFTER.join(', ')} (${STOPS.map((k) => k.id + '@' + k.after)})`);
  ok(STOPS.every((k, i) => k.title === 'Tricky Sounds' && k.pair.join(' ') === PAIRS[i]), `data: titled Tricky Sounds, pairs ${PAIRS.join(' | ')}`);
  ok(OLD_IDS.every((id) => CUR.checkpoints.some((k) => k.id === id)) && new Set(CUR.checkpoints.map((k) => k.id)).size === CUR.checkpoints.length, 'data: every existing stop id is unchanged and all ids are distinct');
  ok(STOPS.every((k) => k.world === CUR.lessons.find((l) => l.number === k.after).world), 'data: each stop is in the world of the lesson it follows');
  for (const k of STOPS) {
    const tag = `data ${k.id}`, taught = taughtBy(k.after);
    const words = [...k.sides.flatMap((s) => s.words), ...k.pairs.flatMap((p) => [p.a, p.b])];
    ok(words.every((w) => isReadable(w, taught)), `${tag}: every word is spelt with letters taught by lesson ${k.after} (${words.filter((w) => !isReadable(w, taught))})`);
    ok(k.plan.map((a) => a.task).join() === 'tunnels,which,signals,check', `${tag}: Two Tunnels, Which One?, Green Light, then Ticket Check`);
    ok(k.quickCheck.kind === 'letter' && k.quickCheck.options.every((o) => isReadable(o.glyph, taught)) && k.quickCheck.options.filter((o) => o.correct).length === 1, `${tag}: Ticket Check is a letter question on taught letters`);
    ok(k.pairs.every((p) => !p.images || (fs.existsSync(path.join(ROOT, p.images[p.a])) && fs.existsSync(path.join(ROOT, p.images[p.b])))), `${tag}: a pair has pictures only when both exist on disk`);
    ok(/Let's listen closely\.$/.test(k.line) && /^Great listening!/.test(k.end) && !/\b(new letter|learn)\b/i.test(k.end), `${tag}: the opening line and the celebration`);
    ok(k.id === 'x2' ? k.hint === "Breathe it out, like fogging a mirror: h-. No 'huh.'" : k.id === 'x10' ? /tongue peeks out between the teeth/.test(k.hint) : !k.hint, `${tag}: the h stop carries the breathing line, the th stop the tongue line, no other stop has one`);
    // the rounds
    const t = tunnelRounds(k, seq(7));
    ok(t.length === 6 && t.slice(0, 2).every((r) => r.kind === 'letter') && t.slice(2).every((r) => r.kind === 'word') && [0, 1].every((s) => t.filter((r) => r.side === s).length === 3 && t.filter((r) => r.kind === 'word' && r.side === s).length === 2), `${tag}: Two Tunnels is 6 rounds, 2 letters first then 4 words, balanced`);
    ok(t.every((r) => (r.kind === 'letter' ? k.sides[r.side].letters : k.sides[r.side].words).includes(r.value)), `${tag}: every car belongs to the tunnel it is assigned`);
    const w = whichRounds(k, seq(11));
    ok(w.length === 6 && w.every((r) => r.cards.length === 2 && r.target >= 0), `${tag}: Which One? is 6 rounds of two cards`);
    const wordRounds = w.filter((r) => r.kind === 'word');
    ok(wordRounds.every((r) => k.pairs.some((p) => [p.a, p.b].sort().join() === r.cards.map((c) => c.value).sort().join() && r.cards[r.target].value === r.word)), `${tag}: the cards are a minimal pair and the target is one of them`);
    ok(new Set(wordRounds.map((r) => r.word)).size >= Math.min(wordRounds.length, k.pairs.length * 2, 4), `${tag}: both words of the pairs are targets`);
    ok(k.id === 'x7' ? w.slice(0, 2).every((r) => r.kind === 'letter') && w.slice(2).every((r) => r.kind === 'word') : w.every((r) => r.kind === 'word'), `${tag}: ${k.id === 'x7' ? 'w and y open with two single-sound rounds' : 'word rounds only'}`);
    ok(w.every((r) => r.kind === 'letter' || r.cards.every((c) => !!c.image === !!r.cards[0].image)), `${tag}: pictures on both cards or neither`);
  }
  ok(STOPS.filter((k) => k.pairs.some((p) => p.images)).map((k) => k.id).join() === 'x6', 'data: only fan/van has two pictures today; no word shows a wrong picture');

  // The store and the hold, with the real store on a stand-in localStorage.
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const { createStore } = await import('../js/store.js');
  const open = (doneN, checkpoints = {}, settings = {}) => { mem.clear(); mem.set('reading.v1', JSON.stringify({ schema: 1, lessons: doneThrough(doneN), checkpoints, settings: { migrated1912: true, pace4: true, seenScripts: SEEN, ...settings }, firstRunDone: true })); return createStore(); };
  const nodes = CUR.lessons.flatMap((l) => [{ lesson: l }, ...CUR.checkpoints.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
  const idx = (id) => nodes.findIndex((n) => n.checkpoint && n.checkpoint.id === id);
  const curIdx = (store) => nodes.findIndex((n) => n.lesson && n.lesson.number === store.currentLesson(CUR.lessons.length));
  const hold = (store) => checkpointStopIndex(nodes, curIdx(store), store);
  for (const k of STOPS) {
    const i = idx(k.id), prev = nodes[i - 1], next = nodes[i + 1];
    ok(prev && (prev.lesson ? prev.lesson.number === k.after : prev.checkpoint.after === k.after) && next && (next.lesson ? next.lesson.number === k.after + 1 : next.checkpoint.after === k.after || next.checkpoint.after === k.after + 1), `placement ${k.id}: on the line right after lesson ${k.after} (a Story stop that shares the lesson first, its Review Stop after it)`);
    const earlier = Object.fromEntries(CUR.checkpoints.filter((c) => c.after === k.after && idx(c.id) < i).map((c) => [c.id, { result: 'got-it' }]));
    let s = open(k.after - 1);
    ok(!s.isCheckpointUnlocked(k) && !s.isCheckpointDone(k), `${k.id}: locked before lesson ${k.after} is done`);
    s = open(k.after, earlier);
    ok(s.isCheckpointUnlocked(k) && !s.isCheckpointDone(k) && hold(s) === i, `${k.id}: opens with lesson ${k.after} and holds the train once the stops before it are done`);
    ok(s.isUnlocked(k.after + 1), `${k.id}: lesson ${k.after + 1} is open while the stop waits`);
    s.setCheckpointResult(k.id, 'got-it');
    ok(s.isCheckpointDone(k) && hold(s) !== i && s.checkpoint(k.id).result === 'got-it', `${k.id}: the result is saved and the hold ends`);
    s = open(k.after, { ...earlier, [k.id]: { result: 'practice-again' } });
    ok(!s.isCheckpointDone(k) && hold(s) === i, `${k.id}: "Not yet" keeps the hold`);
    s = open(k.after + 1);
    ok(s.isCheckpointDone(k) && hold(s) !== i, `${k.id}: a save past lesson ${k.after + 1} counts it passed, no hold`);
    s = open(CUR.lessons.length);
    ok(s.isCheckpointDone(k) && s.checkpoint(k.id).result === null, `${k.id}: a finished save has it passed with no result written`);
  }
  // no spurious rides
  const doneArr = (store) => nodes.map((n) => { const own = n.checkpoint ? store.checkpoint(n.checkpoint.id) : store.lesson(n.lesson.number); return own.result === 'got-it' ? own.completedAt || null : false; });
  const s = open(18, {}, { trainDone: 18 });
  ok(finishedStop(s, doneArr(s), curIdx(s)) === -1, 'rides: an old save past lesson 17 opened with the Tricky Sounds stops in the data plays no ride');
  s.setCheckpointResult('x4', 'got-it');
  ok(finishedStop(s, doneArr(s), curIdx(s)) === idx('x4'), 'rides: a Tricky Sounds stop the grown-up marks got-it rides like any stop (its own result)');
}

const gameSel = '.game, .check';
async function seeded(browser, url, vp, doneN, route, { settings = {}, extra = {}, ctxExtra = {}, checkpoints } = {}) {
  const made = await newPage(browser, vp, ctxExtra);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneThrough(doneN), ...(checkpoints ? { checkpoints } : {}), settings: { seenScripts: SEEN, trainIntroDone: true, ...settings }, firstRunDone: true, ...extra })}))`);
  await made.page.goto(url + route);
  return made;
}
const first = (page) => page.locator('.script-first').innerText();

export async function screenChecks({ browser, url, ok }) {
  // every stop: the opening card, the four steps, the header
  for (const k of STOPS) {
    const m = await seeded(browser, url, PHONE, k.after, `#/checkpoint/${k.id}`);
    const { page, errors } = m;
    await page.waitForSelector('.review-intro');
    const t = await page.evaluate(() => ({ h1: document.querySelector('.review-intro h1').textContent, line: document.querySelector('.review-intro-line').textContent, art: !!document.querySelector('.review-intro-icon .magnify-art'), btn: (() => { const r = document.querySelector('.review-start').getBoundingClientRect(); return { h: r.height, w: r.width, text: document.querySelector('.review-start').textContent, inView: r.bottom <= innerHeight && r.right <= innerWidth }; })() }));
    ok(t.h1 === 'Tricky Sounds' && t.line === k.line && t.art && t.btn.text === 'Start' && t.btn.h >= 48 && t.btn.inView, `${k.id}: the opening card says Tricky Sounds, names the sounds (“${t.line}”), has the magnifying glass and a big Start`);
    ok(k.id !== 'x2' || /h-/.test(t.line) && !/huh/.test(t.line), 'x2: the opening line names h- and never says "huh"');
    if (k.id === 'x2') await shot(page, 'x2-opening-card-390x844');
    if (k.id === 'x1') await shot(page, 'x1-opening-card-390x844');
    await page.locator('.review-start').click();
    for (let i = 0; i < 4; i++) {
      await page.goto(url + `#/checkpoint/${k.id}/task/${i}`);
      await page.waitForSelector(gameSel, { timeout: 8000 });
      await page.waitForTimeout(500);
      ok((await page.locator('.task-kicker').innerText()) === `Tricky Sounds · ${i + 1} of 4` && (await page.locator('.task-head h1').innerText()).split('\n')[0].trim() === NAMES[i], `${k.id} step ${i + 1}: ${NAMES[i]}, header and place`);
      const tip = await page.evaluate(() => document.body.textContent);
      if (i === 0 && k.id === 'x2') ok(tip.includes("Breathe it out, like fogging a mirror: h-. No 'huh.'"), 'x2: the grown-up is told to breathe it out like fogging a mirror');
      if (i === 0 && k.id === 'x2') ok((await page.locator('.script-text').innerText().catch(() => '')).includes("No 'huh.'") || tip.includes("No 'huh.'"), 'x2: the Two Tunnels script has the breathing line');
      if (i === 2) {
        // Green Light: only the two sounds as targets, the other always on a lamp, lamps only taught letters
        const lit = new Set(); let targets = [];
        for (let r = 0; r < 3; r++) {
          const lamps = await page.locator('.signal').evaluateAll((els) => els.map((e) => e.dataset.letter));
          const tg = await page.locator('.signal[data-target="1"]').getAttribute('data-letter');
          lamps.forEach((l) => lit.add(l)); targets.push(tg);
          ok(lamps.every((l) => isReadable(l, taughtBy(k.after))), `${k.id} Green Light: lamps hold only taught letters (${lamps})`);
          const mate = k.pair.find((p) => !(p === 'c' ? ['c', 'k'] : [p]).includes(tg));
          ok(lamps.some((l) => (mate === 'c' ? ['c', 'k'] : [mate]).includes(l)), `${k.id} Green Light round ${r + 1}: the other sound ${mate} is on a lamp (${lamps})`);
          await page.locator('.signal[data-target="1"]').click(); await page.waitForTimeout(1200);
        }
        const sides = (l) => (l === 'k' ? 'c' : l);
        ok(targets.every((x) => k.pair.includes(sides(x))) && new Set(targets.map(sides)).size === 2, `${k.id} Green Light: targets are only ${k.pair.join(' and ')}, taking turns (${targets})`);
        ok(/^Light for /.test(await first(page)), `${k.id} Green Light: the gist is "Light for ..." (${await first(page)})`);
      }
      if (i === 3) {
        const o = await page.locator('.opt-card').count();
        const glyphs = await page.locator('.opt-card .opt-glyph').count();
        ok(o === 3 && glyphs === 3 && (await page.locator('.opt-pic').count()) === 0, `${k.id} Ticket Check: three letter cards, no pictures`);
      }
    }
    ok(errors.length === 0, `${k.id}: no errors ${errors.join(' | ')}`);
    await m.ctx.close();
  }

  // Two Tunnels: right and wrong, on x2 (h and a) and x5 (i and e), with a swipe on x1
  for (const id of ['x2', 'x5', 'x1']) {
    const k = STOPS.find((c) => c.id === id);
    const m = await seeded(browser, url, PHONE, k.after, `#/checkpoint/${id}/task/0`);
    const { page, errors } = m;
    await page.waitForSelector('.tunnels .tcar');
    await page.waitForTimeout(900);
    const signs = await page.locator('.tunnel-sign').allInnerTexts();
    ok((await page.locator('.tunnel').count()) === 2 && (id !== 'x2' || signs[1].trim() === 'a') && (await page.locator('.tunnel-sign svg').count()) === (id === 'x2' ? 1 : 2), `${id} tunnels: two tunnels with their signs (${signs.map((s) => s.trim()).join(' | ')})`);
    ok((await first(page)) === 'Which tunnel is it for?', `${id} tunnels: the gist is one wording`);
    await shot(page, `${id}-two-tunnels-390x844`);
    const stars = () => page.locator('.star-row').getAttribute('data-filled');
    for (let r = 0; r < 6; r++) {
      await page.waitForFunction(() => !document.querySelector('.tcar').getAnimations().length && document.querySelector('.tcar').style.opacity === '1', null, { timeout: 8000 });
      await page.waitForTimeout(120);
      const car = await page.evaluate(() => { const c = document.querySelector('.tcar'); return { side: Number(c.dataset.side), kind: c.dataset.kind, value: c.dataset.value }; });
      ok((r < 2) === (car.kind === 'letter'), `${id} round ${r + 1}: ${r < 2 ? 'a letter' : 'a word'} on the car (${car.kind} ${car.value})`);
      ok((car.kind === 'letter' ? k.sides[car.side].letters : k.sides[car.side].words).includes(car.value), `${id} round ${r + 1}: ${car.value} belongs in tunnel ${car.side}`);
      const before = await stars();
      if (r === 1 && id === 'x1') { // a swipe toward the right tunnel
        const b = await page.locator('.tcar').boundingBox(), tb = await page.locator(`.tunnel[data-side="${car.side}"]`).boundingBox();
        const x0 = b.x + b.width / 2, y0 = b.y + b.height / 2;
        await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 6 }); await page.mouse.up();
      } else {
        await page.locator(`.tunnel[data-side="${1 - car.side}"]`).click(); // the wrong tunnel first: it bounces back, nothing counted
        await page.waitForTimeout(150);
        ok((await stars()) === before && (await page.locator('.tcar').getAttribute('data-value')) === car.value && (await page.locator('.tunnels').getAttribute('data-round')) === String(r), `${id} round ${r + 1}: the wrong tunnel only bounces the car back`);
        await page.waitForFunction(() => !document.querySelector('.tcar').getAnimations().length, null, { timeout: 4000 });
        await page.waitForTimeout(150);
        await page.locator(`.tunnel[data-side="${car.side}"]`).click();
      }
      await page.waitForTimeout(250);
      ok((await stars()) === String(r + 1), `${id} round ${r + 1}: the right tunnel takes the car in (a star)`);
    }
    await page.waitForTimeout(1800);
    ok((await page.locator('.tunnels').getAttribute('data-state')) === 'done' && !(await page.locator('.btn.next').isDisabled().catch(() => false)), `${id} tunnels: six rounds end the game and Next opens`);
    ok(errors.length === 0, `${id} tunnels: no errors ${errors.join(' | ')}`);
    await m.ctx.close();
  }

  // Which One?: x5 words only, x6 with pictures, x7 letters then words; the grown-up says the word, nothing is spoken by the phone
  for (const id of ['x5', 'x6', 'x7']) {
    const k = STOPS.find((c) => c.id === id);
    const m = await seeded(browser, url, PHONE, k.after, `#/checkpoint/${id}/task/1`, { settings: { playSounds: true } });
    const { page, errors } = m;
    await page.waitForSelector('.which .which-card');
    for (let r = 0; r < 6; r++) {
      await page.waitForFunction(() => !document.querySelector('.say-prompt').hidden || document.querySelector('.which').dataset.state === 'done' || true, null, { timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(r === 0 ? 900 : 1500);
      const s = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.which-card')].map((c) => ({ word: c.dataset.word, target: c.dataset.target, pic: !!c.querySelector('img'), src: c.querySelector('img') && c.querySelector('img').getAttribute('src'), h: c.getBoundingClientRect().height, w: c.getBoundingClientRect().width })), pill: document.querySelector('.say-text').textContent, hidden: document.querySelector('.say-prompt').hidden, pillWho: document.querySelector('.say-who').textContent }));
      const tg = s.cards.find((c) => c.target === '1'), other = s.cards.find((c) => c.target !== '1');
      const letterRound = id === 'x7' && r < 2;
      ok(s.cards.length === 2 && s.cards.every((c) => c.h >= 48 && c.w >= 48), `${id} round ${r + 1}: two cards, 48 px targets`);
      ok(s.pillWho === 'Grown-up' && (letterRound ? s.hidden || /^Say: /.test(s.pill) : !s.hidden && s.pill === `Say: ${tg.word}`), `${id} round ${r + 1}: the grown-up's card says "${s.pill}"`);
      ok(letterRound || (await first(page)) === (`Say: ${tg.word}. Which one?`.length <= 28 ? `Say: ${tg.word}. Which one?` : `Say: ${tg.word}.`) && (await first(page)).length <= 28, `${id} round ${r + 1}: the gist matches the round (${await first(page)})`);
      if (id === 'x6' && ['fan', 'van'].includes(tg.word)) ok(s.cards.every((c) => c.pic && c.src.endsWith(`/${c.word}.webp`)), `${id} round ${r + 1}: fan and van show their own pictures (${s.cards.map((c) => c.src)})`);
      else ok(s.cards.every((c) => !c.pic), `${id} round ${r + 1}: no picture where a tile is missing`);
      if (r === 0) await shot(page, `${id}-which-one-390x844`);
      const stars = await page.locator('.star-row').getAttribute('data-filled');
      await page.locator(`.which-card[data-target="0"]`).click(); await page.waitForTimeout(150);
      ok((await page.locator('.star-row').getAttribute('data-filled')) === stars && (await page.locator('.which').getAttribute('data-round')) === String(r), `${id} round ${r + 1}: the other card only shakes, no penalty`);
      await page.locator(`.which-card[data-target="1"]`).click();
      await page.waitForTimeout(150);
      ok((await page.locator('.star-row').getAttribute('data-filled')) === String(r + 1), `${id} round ${r + 1}: the right card earns a star`);
    }
    await page.waitForTimeout(1500);
    ok((await page.locator('.which').getAttribute('data-state')) === 'done', `${id} which: six rounds end the game`);
    const spoken = await page.evaluate(() => window.__spoken);
    const allWords = k.pairs.flatMap((p) => [p.a, p.b]);
    ok(!spoken.some((t) => allWords.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(t))), `${id} which: no text to speech for a target word (${JSON.stringify(spoken)})`);
    ok(errors.length === 0, `${id} which: no errors ${errors.join(' | ')}`);
    await m.ctx.close();
  }

  // finish: the celebration, the saved result, back on the path
  const k = STOPS.find((c) => c.id === 'x4');
  const m = await seeded(browser, url, PHONE, k.after, `#/checkpoint/${k.id}/finish`, { checkpoints: { v5: { result: 'got-it' } } });
  await m.page.waitForSelector('.finish');
  ok((await m.page.locator('.finish h1').innerText()) === 'Tricky Sounds, done!' && (await m.page.locator('.review-message').innerText()) === k.end, 'finish: the heading and the grown-up\'s celebration');
  ok(await m.page.evaluate(() => { const c = JSON.parse(localStorage.getItem('reading.v1')).checkpoints; return !c.x4; }), 'finish: nothing is saved until the grown-up says yes');
  await m.page.waitForTimeout(1700);
  await m.page.locator('.got').click(); await m.page.waitForTimeout(1700); await m.page.locator('.got').click();
  await m.page.waitForSelector('.home, .home3d, .map-scroll', { timeout: 8000 }).catch(() => {});
  ok(await m.page.evaluate(() => { const s = JSON.parse(localStorage.getItem('reading.v1')); return s.checkpoints.x4.result === 'got-it' && s.lessons[18] === undefined; }), 'finish: Yes saves x4 as got-it and writes no lesson');
  ok(m.errors.length === 0, `finish: no errors ${m.errors.join(' | ')}`);
  await m.ctx.close();
}

// Fit: the two new games and Green Light at the three phone sizes, and no endless animation.
export async function fitChecks({ browser, url, ok }) {
  for (const vp of SIZES) {
    for (const k of STOPS) {
      for (const step of [0, 1, 2]) {
        const m = await seeded(browser, url, vp, k.after, `#/checkpoint/${k.id}/task/${step}`);
        const p = m.page;
        await p.waitForSelector(gameSel, { timeout: 8000 });
        await p.waitForTimeout(900);
        const r = await p.evaluate(() => {
          const out = { scrollX: document.documentElement.scrollWidth > innerWidth + 1, small: [], outside: [] };
          const vh = innerHeight, vw = innerWidth;
          for (const b of document.querySelectorAll('.task-foot button, .task-head button, .tunnel, .which-card, .signal, .tcar')) {
            const q = b.getBoundingClientRect();
            if (!q.width) continue;
            if (q.height < 47.5 || q.width < 47.5) out.small.push(b.className + ' ' + Math.round(q.width) + 'x' + Math.round(q.height));
            if (q.left < -0.5 || q.right > vw + 0.5 || q.top < -0.5 || q.bottom > vh + 0.5) out.outside.push(b.className + ' ' + Math.round(q.left) + ',' + Math.round(q.top) + ',' + Math.round(q.right) + ',' + Math.round(q.bottom));
          }
          const a = document.querySelector('.tunnel-row'), c = document.querySelector('.tcar');
          if (a && c) { const x = a.getBoundingClientRect(), y = c.getBoundingClientRect(); if (y.top < x.bottom - 2) out.outside.push('car overlaps tunnels'); }
          out.infinite = document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming().iterations === Infinity).length;
          return out;
        });
        const tag = `${vp.name} ${k.id} step ${step + 1}`;
        ok(!r.scrollX && r.small.length === 0 && r.outside.length === 0, `${tag}: fits, no sideways scroll, 48 px targets on screen (${r.small.concat(r.outside).join('; ') || 'ok'})`);
        ok(r.infinite === 0, `${tag}: no endless animation (${r.infinite})`);
        ok(m.errors.length === 0, `${tag}: no errors ${m.errors.join(' | ')}`);
        await m.ctx.close();
      }
    }
  }
  // heat: nothing draws frames while a game waits for the child
  for (const step of [0, 1]) {
    const m = await seeded(browser, url, PHONE, 9, `#/checkpoint/x1/task/${step}`);
    await m.page.addInitScript(RAF_COUNT);
    await m.page.reload();
    await m.page.waitForSelector(gameSel); await m.page.waitForTimeout(1800);
    const a = await m.page.evaluate(() => window.__raf);
    await m.page.waitForTimeout(3000);
    const b = await m.page.evaluate(() => window.__raf);
    ok(b - a === 0, `heat: the ${NAMES[step]} game requests no animation frames while idle (${b - a})`);
    await m.ctx.close();
  }
}

// Home: a Tricky Sounds stop is on the line after its review stop, holds the train, and is marked done once behind.
export async function homeChecks({ browser, url, ok }) {
  const k = STOPS[0];
  const h = await openHome(browser, url, PHONE, state(k.after));
  const { page, errors } = h;
  ok(await until(page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, 20000), 'home: the 3D railway renders and settles');
  const btns = await page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => ({ label: b.getAttribute('aria-label'), cls: b.className })));
  const iv = btns.findIndex((b) => b.label.startsWith('Tricky Sounds'));
  ok(iv > 0 && btns[iv].cls.includes('is-current') && /^Lesson 9/.test(btns[iv - 1].label) && /^Review Stop/.test(btns[iv + 1].label), `home: after lesson 9 Tricky Sounds is the current stop, its Review Stop next (${btns.map((b) => b.label + ':' + b.cls.replace(/.*is-/, '')).join(' | ')})`);
  ok(btns.some((b) => /^Lesson 10/.test(b.label) && !b.cls.includes('is-locked')), 'home: lesson 10 stays open while the stop is held');
  await showStop(page, '.station-btn[aria-label^="Tricky Sounds"]');
  await page.waitForTimeout(900);
  await shot(page, 'home-tricky-sounds-390x844');
  await page.locator('.station-btn[aria-label^="Tricky Sounds"]').first().click({ force: true });
  await page.waitForSelector('.review-intro', { timeout: 8000 });
  ok(page.url().endsWith(`#/checkpoint/${k.id}`), 'home: tapping the stop opens its opening card');
  ok(errors.length === 0, `home: no errors ${errors.join(' | ')}`);
  await h.ctx.close();
  const p2 = await openHome(browser, url, PHONE, state(10));
  await until(p2.page, () => window.__train && window.__train.frames > 1 && !window.__train.running, null, 20000);
  const b2 = await p2.page.evaluate(() => [...document.querySelectorAll('.station-btn')].map((b) => ({ label: b.getAttribute('aria-label'), cls: b.className })));
  const rs = b2.find((b) => b.label.startsWith('Tricky Sounds'));
  ok(rs && rs.cls.includes('is-done') && b2.some((b) => /^Lesson 11/.test(b.label) && b.cls.includes('is-current')), 'home: with lesson 10 done, the Tricky Sounds stop behind is done and the train stands at the lesson');
  await p2.ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  await dataChecks({ ok });
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await screenChecks({ browser, url, ok });
  await fitChecks({ browser, url, ok });
  await homeChecks({ browser, url, ok });
  await browser.close();
  server.close();
  console.log(`tricky-sounds: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
