// Sound effects (js/sfx.js). Web Audio is a recorder here (AUDIO_STUB), so the tests check what would be scheduled:
// which notes, at what pitch and when. They cannot hear it.
// Run alone with `node test/sfx.mjs`, or as part of test/smoke.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, touchDrag, SEEN } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

const seed = (settings = {}, lessons = { 1: { tasksDone: [], result: 'got-it' }, 2: { tasksDone: [], result: 'got-it' }, 3: { tasksDone: [], result: 'got-it' } }) => `localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons, settings: { seenScripts: SEEN, ...settings }, firstRunDone: true })}))`;
const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const taskIdx = (n, type) => tasksFor(CUR.lessons[n - 1]).find((t) => t.type === type).index;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880;

const notes = (page) => page.evaluate(() => window.__audioNotes());
const clear = (page) => page.evaluate(() => window.__audioClear());
const events = (page) => page.evaluate(() => window.__events.length);
// Notes of one event: the bell notes (not their quiet partials), plus any bloop or noise burst counted apart.
const of = (all, event) => { const mine = all.filter((n) => n.event === event); return { bells: mine.filter((n) => !n.partial && !n.bloop && !n.noise), bloops: mine.filter((n) => n.bloop), noise: mine.filter((n) => n.noise), all: mine }; };
const pitches = (list) => list.map((n) => n.freqs[1]);
const span = (list) => Math.max(...list.flatMap((n) => n.stops)) - Math.min(...list.map((n) => n.t));

async function open(browser, url, vp, { settings = {}, route = '#/home', init = [], extra } = {}) {
  const made = await newPage(browser, vp, extra);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(seed(settings));
  for (const s of init) await made.page.addInitScript(s);
  await made.page.goto(url + route);
  await made.page.waitForTimeout(900);
  // The first tap of the page session is what lets sound (and speech) start.
  await made.page.mouse.click(6, 6);
  return made;
}
const tap = async (page, loc) => { const b = await loc.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };

export async function sfxChecks({ browser, url, ok }) {
  const vp = VIEWPORTS[0];

  // 1. Every sound, played directly: how many notes, how long, how high.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { route: '#/home' });
    const EXPECT = { sparkle: [4, 0.9, 1.6], pop: [1, 0.4, 0.9], star: [2, 0.6, 1.2], doors: [2, 0.15, 0.299], win: [7, 1.0, 1.9], lesson: [9, 1.5, 2.2], unlock: [6, 1.0, 1.8], checkpoint: [13, 1.9, 2.5] };
    for (const [name, [count, min, max]] of Object.entries(EXPECT)) {
      await page.waitForTimeout(2600); // let the last one ring out
      await clear(page);
      await page.evaluate(async (n) => { (await import('/js/sfx.js')).sfx.play(n); }, name);
      const got = of(await notes(page), name);
      ok(got.bells.length === count, `sfx ${name}: ${count} notes (${got.bells.length})`);
      ok(got.all.every((n) => n.freqs.every((f) => f <= 2100)), `sfx ${name}: nothing above 2.1 kHz (${Math.max(...got.all.flatMap((n) => n.freqs)).toFixed(0)} Hz)`);
      ok(span(got.all) >= min && span(got.all) <= max && span(got.all) < 2.5, `sfx ${name}: lasts ${span(got.all).toFixed(2)} s (between ${min} and ${max}, never over 2.5)`);
    }
    await page.waitForTimeout(2600);
    await clear(page);
    await page.evaluate(async () => { (await import('/js/sfx.js')).sfx.play('star', { bloop: true }); });
    const star = of(await notes(page), 'star');
    ok(star.bells.length === 2 && star.bloops.length === 1 && star.bloops[0].freqs[2] < star.bloops[0].freqs[1], `sfx star with bloop: a two-note chime and one downward bloop (${star.bells.length} notes, ${star.bloops.length} bloop)`);
    await page.waitForTimeout(2600);
    await clear(page);
    await page.evaluate(async () => { (await import('/js/sfx.js')).sfx.play('doors'); });
    const doors = of(await notes(page), 'doors');
    ok(doors.noise.length === 0 && pitches(doors.bells).join() === [G5, 1046.5].join(), `sfx doors: a bell glide G5 to C6, no noise (${pitches(doors.bells).map((f) => f.toFixed(0))})`);
    // Only the pentatonic notes are ever used.
    await page.waitForTimeout(2600);
    await clear(page);
    await page.evaluate(async () => { const { sfx } = await import('/js/sfx.js'); for (const n of ['sparkle', 'lesson']) sfx.play(n); });
    const used = (await notes(page)).filter((n) => !n.partial && !n.bloop && !n.noise).map((n) => n.freqs[1].toFixed(0));
    ok(used.every((f) => ['523', '587', '659', '784', '880', '1047', '1052'].includes(f)), `sfx: only C major pentatonic notes are used (${[...new Set(used)].join(' ')})`);
    // A new win cuts short a pop that is still ringing; a short sound never starts over a ringing jingle.
    await page.waitForTimeout(2600);
    await clear(page);
    await page.evaluate(async () => { const { sfx } = await import('/js/sfx.js'); sfx.play('pop'); sfx.play('win'); });
    const all = await notes(page), pop = of(all, 'pop').bells[0];
    ok(pop && pop.stops.length >= 2 && Math.min(...pop.stops) < pop.t + 0.3, `sfx: win cuts short a pop that is still ringing (stops ${pop && pop.stops.map((s) => s.toFixed(2)).join(', ')})`);
    await clear(page);
    await page.evaluate(async () => { (await import('/js/sfx.js')).sfx.play('pop'); });
    ok((await notes(page)).length === 0, 'sfx: a short sound does not start over a ringing jingle');
    // The sound effects never cause speech or clips.
    ok((await events(page)) === 0, 'sfx: no speech or clip event was caused by the sounds');
    ok(errors.length === 0, 'sfx direct: errors ' + errors.join(' | '));
    await ctx.close();
  }

  // 2. Letter Hunt: nothing for a wrong touch, a pop for each right one rising up the scale, a jingle at the barn.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { route: `#/lesson/1/task/${taskIdx(1, 'hunt')}` });
    await page.waitForSelector('.sky-letter');
    await page.waitForTimeout(700);
    await clear(page);
    await tap(page, page.locator('.sky-letter[data-target="0"]').first());
    await page.waitForTimeout(500);
    ok((await notes(page)).length === 0, 'Hunt: a wrong touch schedules no sound at all');
    const first = [];
    for (let i = 1; i <= 5; i++) {
      await clear(page);
      await tap(page, page.locator('.sky-letter[data-target="1"]:not(.popped)').first());
      await page.waitForTimeout(120);
      const pops = of(await notes(page), 'pop').bells;
      ok(pops.length === 1, `Hunt: right touch ${i} plays one pop`);
      first.push(pops[0] && pops[0].freqs[1]);
      await page.waitForTimeout(i < 5 ? 900 : 100);
    }
    ok(JSON.stringify(first.map((f) => Number(f.toFixed(2)))) === JSON.stringify([C5, D5, E5, G5, A5]), `Hunt: the pops step up the scale with the sheep (${first.map((f) => f.toFixed(0)).join(', ')})`);
    await page.waitForTimeout(2700); // the sheep trots, walks into the barn and the doors close first
    ok(of(await notes(page), 'win').bells.length === 7, 'Hunt: the sheep reaching the barn plays the win jingle');
    ok(errors.length === 0, 'Hunt sfx: errors ' + errors.join(' | '));
    await ctx.close();
  }

  // 3. Barn Doors: a bell glide as the doors open, only the star chime for a right letter, the win jingle at five stars.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { route: `#/lesson/1/task/${taskIdx(1, 'barn')}`, init: ['Math.random = () => 0.99;'] });
    await page.waitForSelector('.barn-letter');
    await page.click('.btn.again'); // the doors open again, now that the page has had its first tap
    await page.waitForFunction(() => document.querySelector('.barn-game').dataset.state === 'open', null, { timeout: 4000 });
    await page.waitForTimeout(500);
    ok(of(await notes(page), 'doors').bells.length >= 2, 'Barn: the doors opening play the soft bell glide');
    ok(of(await notes(page), 'sparkle').bells.length === 0, 'Barn: nothing sparkles before a right touch');
    await clear(page);
    await tap(page, page.locator('.barn-letter'));
    await page.waitForTimeout(900);
    const got = await notes(page);
    ok(of(got, 'sparkle').bells.length === 0 && of(got, 'star').bells.length === 2, 'Barn: a right letter plays only the star chime, no sparkle');
    await page.waitForFunction(() => document.querySelector('.barn-game').dataset.state !== 'open', null, { timeout: 3000 });
    for (let r = 2; r <= 5; r++) {
      await page.waitForFunction(() => document.querySelector('.barn-game').dataset.state === 'open', null, { timeout: 6000 });
      await page.waitForTimeout(450);
      await clear(page);
      await tap(page, page.locator('.barn-letter'));
      await page.waitForTimeout(300);
      if (r < 5) await page.waitForFunction(() => document.querySelector('.barn-game').dataset.state !== 'open', null, { timeout: 3000 });
    }
    await page.waitForTimeout(400);
    const last = await notes(page);
    ok(of(last, 'win').bells.length === 7 && of(last, 'sparkle').bells.length === 0, `Barn: five stars play the win jingle (and not the small sparkle) (win ${of(last, 'win').bells.length}, sparkle ${of(last, 'sparkle').bells.length}, star ${of(last, 'star').bells.length}, doors ${of(last, 'doors').bells.length})`);
    ok(errors.length === 0, 'Barn sfx: errors ' + errors.join(' | '));
    await ctx.close();
  }

  // 4. Sound Sack: nothing for a wrong drop; a chime and bloop for a right one; the checkpoint jingle at the end.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { route: '#/checkpoint/c1' });
    await page.waitForSelector('.sack-card');
    await page.waitForTimeout(800);
    const sackBox = async () => { const b = await page.locator('.sack').boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    const drag = async (which) => { const b = await page.locator(`.sack-card[data-correct="${which}"]:not([disabled])`).first().boundingBox(); await touchDrag(page, { x: b.x + b.width / 2, y: b.y + b.height / 2 }, await sackBox(), { steps: 14 }); };
    await clear(page);
    await drag('0');
    await page.waitForTimeout(900);
    ok((await notes(page)).length === 0, 'Sack: a wrong card dropped in the sack schedules no sound');
    for (let r = 1; r <= 6; r++) {
      await page.waitForFunction((k) => document.querySelector('.sack-game').dataset.round === String(k), r, { timeout: 4000 });
      await page.waitForTimeout(450);
      await clear(page);
      await drag('1');
      await page.waitForTimeout(700);
      const got = await notes(page);
      ok(of(got, 'star').bells.length === 2 && of(got, 'star').bloops.length === 1, `Sack: round ${r} drop plays the star chime with a bloop`);
    }
    await page.waitForTimeout(900);
    ok(of(await notes(page), 'checkpoint').bells.length === 13, 'Sack: six rounds play the checkpoint jingle');
    ok(errors.length === 0, 'Sack sfx: errors ' + errors.join(' | '));
    await ctx.close();
  }

  // 5. The slide track and the slide-to-blend word each sparkle at the end; the finish screen and its second Yes have jingles.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { route: `#/lesson/2/task/1` });
    await page.waitForSelector('.slide-track');
    await page.waitForTimeout(700);
    const tb = await page.locator('.slide-track').boundingBox(), hb = await page.locator('.st-handle').boundingBox();
    await clear(page);
    await touchDrag(page, { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 }, { x: hb.x + hb.width / 2 + tb.width - hb.width + 4, y: hb.y + hb.height / 2 });
    await page.waitForTimeout(200);
    ok(of(await notes(page), 'sparkle').bells.length === 4, 'Slide track: reaching the end plays the sparkle');
    await page.evaluate(() => { location.hash = '#/lesson/2/task/4'; });
    await page.waitForSelector('.slide-band');
    await page.waitForTimeout(800);
    const g = await page.evaluate(() => { const svg = document.querySelector('.word-glyphs'), r = svg.getBoundingClientRect(), k = r.width / Number(svg.dataset.width); const e = [...svg.querySelectorAll('.glyph-letter')].map((x) => ({ l: r.left + Number(x.dataset.x0) * k, r: r.left + Number(x.dataset.x1) * k })); return { first: e[0].l, last: e[e.length - 1].r, y: r.top + r.height / 2 }; });
    await clear(page);
    await touchDrag(page, { x: g.first + 4, y: g.y }, { x: g.last + 14, y: g.y }, { steps: 12 });
    await page.waitForTimeout(200);
    ok(of(await notes(page), 'sparkle').bells.length === 4, 'Slide-to-blend: completing the word plays the sparkle');
    // A second completion within 4 s stays silent (the sparkle itself still shows).
    await page.waitForTimeout(900);
    await clear(page);
    await touchDrag(page, { x: g.first + 4, y: g.y }, { x: g.last + 14, y: g.y }, { steps: 12 });
    await page.waitForTimeout(200);
    ok(of(await notes(page), 'sparkle').bells.length === 0, 'Slide-to-blend: a second completion within 4 s plays no sparkle');
    await page.evaluate(() => { location.hash = '#/lesson/2/finish'; });
    await page.waitForSelector('.finish');
    await clear(page);
    await page.waitForTimeout(1800);
    ok(of(await notes(page), 'lesson').bells.length === 9, 'Finish screen: the lesson jingle plays');
    await page.waitForTimeout(2000);
    await clear(page);
    await page.click('.btn.got');
    await page.waitForTimeout(300);
    ok((await notes(page)).length === 0, 'Finish screen: the first Yes tap makes no sound');
    await page.click('.btn.got');
    await page.waitForTimeout(300);
    ok(of(await notes(page), 'unlock').bells.length === 6, 'Finish screen: the second Yes plays the unlock flourish');
    ok(errors.length === 0, 'slide and finish sfx: errors ' + errors.join(' | '));
    await ctx.close();
  }

  // 6. Sound effects off: nothing is scheduled. Reduced motion does not silence them.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { settings: { sfx: false }, route: `#/lesson/1/task/${taskIdx(1, 'hunt')}` });
    await page.waitForSelector('.sky-letter');
    await page.waitForTimeout(600);
    await tap(page, page.locator('.sky-letter[data-target="1"]').first());
    await page.waitForTimeout(600);
    await page.evaluate(async () => { (await import('/js/sfx.js')).sfx.play('win'); });
    ok((await notes(page)).length === 0 && (await page.evaluate(() => window.__audio.contexts)) === 0, 'sfx off: nothing is scheduled and no audio context is even made');
    ok(errors.length === 0, 'sfx off: errors ' + errors.join(' | '));
    await ctx.close();
    const r = await open(browser, url, vp, { route: `#/lesson/1/task/${taskIdx(1, 'hunt')}`, extra: { reducedMotion: 'reduce' } });
    await r.page.waitForSelector('.sky-letter');
    await r.page.waitForTimeout(600);
    await clear(r.page);
    await tap(r.page, r.page.locator('.sky-letter[data-target="1"]').first());
    await r.page.waitForTimeout(300);
    ok(of(await notes(r.page), 'pop').bells.length === 1, 'reduced motion does not silence the sounds');
    ok(r.errors.length === 0, 'reduced motion sfx: errors ' + r.errors.join(' | '));
    await r.ctx.close();
  }

  // 7. No Web Audio at all, or one that throws: the app works and logs no errors.
  for (const [what, script] of [['missing', 'window.AudioContext = undefined; window.webkitAudioContext = undefined;'], ['throwing', "window.AudioContext = function () { throw new Error('audio blocked'); };"]]) {
    const { ctx, page, errors } = await open(browser, url, vp, { route: `#/lesson/1/task/${taskIdx(1, 'hunt')}`, init: [script] });
    await page.waitForSelector('.sky-letter');
    await page.waitForTimeout(600);
    for (let i = 0; i < 2; i++) { await tap(page, page.locator('.sky-letter[data-target="1"]:not(.popped)').first()); await page.waitForTimeout(950); }
    ok((await page.evaluate(() => document.querySelector('.hunt').dataset.steps)) === '2', `Audio ${what}: Letter Hunt still plays`);
    await page.evaluate(() => { location.hash = '#/lesson/2/finish'; });
    await page.waitForSelector('.finish');
    await page.waitForTimeout(1800);
    ok((await page.locator('.btn.got').isEnabled()), `Audio ${what}: the finish screen still works`);
    ok(errors.length === 0, `Audio ${what}: no console errors (${errors.join(' | ')})`);
    await ctx.close();
  }

  // 8. The voice comes first: a short effect is skipped while it speaks; a jingle waits for a voice that has only just started.
  {
    const { ctx, page, errors } = await open(browser, url, vp, { route: `#/lesson/1/task/${taskIdx(1, 'hunt')}` });
    await page.waitForSelector('.task-stage > .speak-btn');
    await page.waitForTimeout(800);
    await page.evaluate(() => { window.__ttsMs = 900; });
    await clear(page);
    await page.locator('.task-stage > .speak-btn').click(); // the voice starts now and speaks for 900 ms
    await page.waitForTimeout(150);
    await page.evaluate(async () => { const { sfx } = await import('/js/sfx.js'); sfx.play('sparkle'); sfx.play('win'); });
    ok((await notes(page)).length === 0, 'Voice: a short effect is skipped while the voice speaks, and a jingle waits');
    await page.waitForTimeout(1100);
    const after = await notes(page);
    ok(of(after, 'win').bells.length === 7 && of(after, 'sparkle').bells.length === 0, 'Voice: the jingle plays once the voice has finished, the skipped effect never does');
    ok(errors.length === 0, 'voice sfx: errors ' + errors.join(' | '));
    await ctx.close();
  }
}

export async function sfxGrownupsChecks({ browser, url, ok }) {
  const { ctx, page, errors } = await open(browser, url, VIEWPORTS[0], { route: '#/home' });
  await page.waitForSelector('.pill-hold');
  await page.waitForTimeout(600);
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(2250); await page.mouse.up();
  await page.waitForSelector('.grownups');
  await page.waitForTimeout(500);
  const settings = () => page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1')).settings);
  ok((await page.getAttribute('[aria-label="Sound effects"]', 'aria-checked')) === 'true', 'Grownups: Sound effects is on by default');
  ok((await settings()).sfxVolume === undefined || (await settings()).sfxVolume === 0.6, 'Grownups: the volume starts at 0.6');
  await clear(page);
  await page.click('text=Test sound');
  await page.waitForTimeout(300);
  ok(of(await notes(page), 'lesson').bells.length === 9, 'Grownups: Test sound plays the lesson jingle once');
  await page.locator('[aria-label="Sound effects volume"]').evaluate((el) => { el.value = 0.25; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok((await settings()).sfxVolume === 0.25, 'Grownups: the volume slider is saved');
  await page.click('[aria-label="Sound effects"]');
  ok((await settings()).sfx === false && (await page.locator('text=Test sound').isDisabled()), 'Grownups: the switch turns sound effects off and disables Test sound');
  await page.click('[aria-label="Sound effects"]');
  ok((await settings()).sfx === true && (await page.locator('text=Test sound').isEnabled()), 'Grownups: the switch turns them on again');
  // Both settings survive a reset, like the voice settings.
  await page.locator('[aria-label="Sound effects volume"]').evaluate((el) => { el.value = 0.8; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('[aria-label="Sound effects"]');
  await page.click('text=Reset all progress');
  await page.click('.btn.danger');
  await page.waitForSelector('.home');
  const kept = await settings();
  ok(kept.sfx === false && kept.sfxVolume === 0.8, `Grownups: sound settings survive a reset (${JSON.stringify({ sfx: kept.sfx, sfxVolume: kept.sfxVolume })})`);
  ok(errors.length === 0, 'Grownups sfx: errors ' + errors.join(' | '));
  await ctx.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  fs.mkdirSync(path.join(ROOT, '_test'), { recursive: true });
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await sfxChecks({ browser, url, ok });
  await sfxGrownupsChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`sfx: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
