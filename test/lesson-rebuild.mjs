// Lesson rebuild, phase A (docs/LESSON-REBUILD.md): the shared lesson frame, the Watch My Mouth step, the "How to make this sound"
// panel, no outside YouTube links anywhere, no Word Cars, varied middles, and the phone's voice never saying an isolated sound.
// Run alone with `node test/lesson-rebuild.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, doneThrough } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';
import { MOUTH_SCRIPT } from '../js/screens/tasks/mouth.js';
import { isIsolated } from './check-content.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const walk = (dir, exts) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name), exts) : exts.some((x) => e.name.endsWith(x)) ? [path.join(dir, e.name)] : []));

// ---- 1. the frame, from the data ----
const seqs = CUR.lessons.map((L) => tasksFor(L).map((t) => t.type));
CUR.lessons.forEach((L, i) => {
  const s = seqs[i], mid = s.slice(s.indexOf('mouth') + 1, -2);
  ok(s[0] === (L.number === 1 ? 'newLetter' : 'review'), `lesson ${L.number} opens with ${L.number === 1 ? 'New Sound (nothing to review)' : 'Letter Review'}: ${s[0]}`);
  ok(s[s.indexOf('newLetter') + 1] === 'mouth', `lesson ${L.number}: Watch My Mouth comes right after New Sound`);
  ok(s.at(-1) === 'check', `lesson ${L.number} ends with Ticket Check`);
  ok(s.at(-2) === 'practice', `lesson ${L.number}: the closing review comes just before Ticket Check`);
  ok(mid.length >= 2 && mid.length <= 4, `lesson ${L.number}: the middle holds 2 to 4 activities (${mid.join(', ')})`);
  ok(mid.includes('sounds') && mid.includes('writing'), `lesson ${L.number}: the middle has blending practice and Track Tracing`);
  ok(!s.includes('words') && !s.includes('story'), `lesson ${L.number}: no Word Cars, no Sound Story`);
  if (i) ok(seqs[i - 1].join() !== s.join() && seqs[i - 1].slice(seqs[i - 1].indexOf('mouth') + 1, -2).join() !== mid.join(), `lessons ${L.number - 1} and ${L.number} have different middles`);
});
ok(new Set(CUR.lessons.map((L) => L.middle.join())).size >= 10, 'the middles are varied across the 13 lessons');
for (const f of ['sounds', 'writing', 'hunt', 'signals', 'wagons', 'board']) ok(CUR.lessons.some((L) => L.middle.includes(f)), `${f} appears in some lesson`);
ok(CUR.lessons.every((L) => !('sayingWords' in L)), 'no lesson carries Word Cars data');
ok(!/Word Cars|Sound Story/.test(read('js/lessons.js')) && !fs.existsSync(path.join(ROOT, 'js/screens/tasks/words.js')) && !fs.existsSync(path.join(ROOT, 'js/screens/tasks/story.js')), 'the Word Cars and Sound Story screens are gone from the code');

// ---- 2. every sound has its "How to make this sound" text ----
for (const [k, s] of Object.entries(CUR.sounds)) ok(s.mouth && typeof s.mouth.text === 'string' && s.mouth.text.length > 10 && typeof s.mouth.voice === 'boolean', `sound ${k} has Watch My Mouth text and a voice flag`);
ok(CUR.sounds.m.mouth.text === 'Lips together. Hum through your nose. Voice on.', 'm: "Lips together. Hum through your nose. Voice on."');
ok(MOUTH_SCRIPT === 'It helps your child to see someone else make the sound. Put a finger at the side of your mouth (this draws their eyes to your mouth) and ask your child to look at your mouth. Make the sound, then have them say it after you.', 'the Watch My Mouth script is the owner\'s text');

// ---- 3. no outside YouTube link anywhere in the app ----
{
  const files = [...walk('js', ['.js']), ...walk('css', ['.css']), ...walk('data', ['.json']), 'index.html', 'manifest.webmanifest', 'sw.js'];
  const bad = files.filter((f) => /youtu\.?be/i.test(read(f)));
  ok(bad.length === 0, `no YouTube address or word in the app files (${bad.join(', ')})`);
  ok(!('playlistUrl' in CUR) && !('alphabetSongUrl' in CUR), 'curriculum.json has no playlist or song address');
  ok(!fs.existsSync(path.join(ROOT, 'js/components/grown-gate.js')), 'the outside-link gate is gone (nothing leaves the app)');
}

// ---- 4. in the browser ----
const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2 };
const seed = (settings) => `localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: doneThrough(CUR.lessons.length), settings, firstRunDone: true })}))`;
async function open(route, settings = { seenScripts: SEEN }, { missing = false } = {}) {
  const made = await newPage(browser, PHONE);
  if (missing) { // a recording that cannot load (the test's audio stand-in errors on a path with "none" in it)
    const patched = JSON.parse(JSON.stringify(CUR)); patched.sounds.m.clip = 'assets/audio/sounds/none.mp3';
    await made.page.route('**/data/curriculum.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(patched) }));
  }
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(seed(settings));
  await made.page.goto(url + route);
  return made;
}

// Every lesson's Watch My Mouth step: the picture, the script, the panel with this sound's text.
for (const L of CUR.lessons) {
  const idx = tasksFor(L).find((t) => t.type === 'mouth').index, mouth = CUR.sounds[L.sound].mouth;
  const { ctx, page, errors } = await open(`#/lesson/${L.number}/task/${idx}`);
  await page.waitForSelector('.mouth-task');
  await page.waitForTimeout(500);
  ok((await page.locator('.mouth-art svg.grownup-art').count()) === 1, `lesson ${L.number}: one illustration of the grown-up`);
  ok(await page.evaluate(() => { const s = document.querySelector('.grownup-art').getBoundingClientRect(); return s.width > 100 && s.height > 100 && s.right <= innerWidth && s.bottom <= innerHeight; }), `lesson ${L.number}: the picture fits the phone screen`);
  ok((await page.locator('.mouth-how').isHidden()), `lesson ${L.number}: the how-to panel starts closed`);
  await page.click('.mouth-how-btn');
  await page.waitForTimeout(300);
  const panel = await page.locator('.mouth-how').innerText();
  ok(await page.locator('.mouth-how').isVisible() && panel.includes(mouth.text) && panel.includes(mouth.voice ? 'Voice on' : 'Voice off'), `lesson ${L.number}: the panel shows "${mouth.text}"`);
  ok(await page.evaluate(() => { const r = document.querySelector('.mouth-how').getBoundingClientRect(), n = document.querySelector('.btn.next').getBoundingClientRect(); return r.bottom <= n.top && r.right <= innerWidth && r.left >= 0; }), `lesson ${L.number}: the open panel clears the Next button`);
  await page.click('.script-toggle');
  await page.waitForTimeout(400);
  const script = await page.locator('.script-sheet .script-text').innerText();
  ok(script.replace(/\s+/g, ' ').trim() === MOUTH_SCRIPT, `lesson ${L.number}: the Say this sheet holds the owner's Watch My Mouth text`);
  ok(errors.length === 0, `lesson ${L.number}: no errors ${errors.join(' | ')}`);
  await ctx.close();
}

// The phone's voice never says an isolated sound in the new step: its only words are the instruction to the child.
for (const [label, settings] of [['recordings on', { seenScripts: SEEN, autoSpeak: true, speak0: true, playSounds: true }], ['recordings off', { seenScripts: SEEN, autoSpeak: true, speak0: true, playSounds: false }]]) {
  for (const L of CUR.lessons) {
    const idx = tasksFor(L).find((t) => t.type === 'mouth').index;
    const { ctx, page } = await open(`#/lesson/${L.number}/task/${idx}`, settings);
    await page.waitForSelector('.mouth-task');
    await page.waitForTimeout(900);
    await page.click('.mouth-task .px-hear'); await page.waitForTimeout(200);
    await page.click('.btn.again'); await page.waitForTimeout(300);
    await page.click('.task-foot [aria-label="Hear the parent script"]').catch(() => {}); await page.waitForTimeout(300);
    const spoken = await page.evaluate(() => window.__spoken.slice());
    ok(spoken.every((t) => !isIsolated(t)), `lesson ${L.number} (${label}): the phone's voice says no isolated sound (${JSON.stringify(spoken)})`);
    ok(spoken.every((t) => t === "Watch your grown-up's mouth." || MOUTH_SCRIPT.includes(t.trim())), `lesson ${L.number} (${label}): the phone says only the instruction to the child and the grown-up's script (${JSON.stringify(spoken)})`);
    await ctx.close();
  }
}
// No recording: the prompt "Say: mmm" shows for the grown-up (and the voice stays quiet).
{
  const { ctx, page } = await open(`#/lesson/1/task/${tasksFor(CUR.lessons[0]).find((t) => t.type === 'mouth').index}`, { seenScripts: SEEN, autoSpeak: true, speak0: true, playSounds: true }, { missing: true });
  await page.waitForSelector('.mouth-task');
  await page.waitForTimeout(600);
  await page.click('.mouth-task .px-hear'); // the first tap also unlocks the voice; the recording fails to load, so the prompt shows
  await page.waitForFunction(() => { const p = document.querySelector('.mouth-task .say-prompt'); return p && !p.hidden; }, null, { timeout: 5000 });
  const t = await page.locator('.mouth-task .say-text').innerText();
  ok(t === 'Say: mmm', `with no recording the prompt reads "Say: mmm" (${t})`);
  ok((await page.evaluate(() => window.__spoken.slice())).every((x) => !isIsolated(x)), 'with no recording the phone still says no isolated sound');
  await ctx.close();
}

// Retrieval first: Letter Review hides the answer until the grown-up taps "Show the sound"; New Sound shows it at once.
for (const L of [CUR.lessons[1], CUR.lessons[7]]) {
  const { ctx, page, errors } = await open(`#/lesson/${L.number}/task/0`, { seenScripts: SEEN, autoSpeak: true, speak0: true, playSounds: true });
  await page.waitForSelector('.review .letter-card');
  await page.waitForTimeout(900);
  ok((await page.locator('.review .sound-card').count()) === 0 && (await page.locator('.review .review-help').isVisible()), `lesson ${L.number} Letter Review: the sound card is hidden until the help button is tapped`);
  await page.click('.review .review-help');
  await page.waitForSelector('.review .sound-card');
  ok((await page.locator('.review .review-help').count()) === 0 && (await page.locator('.review .sound-card').isVisible()), `lesson ${L.number} Letter Review: tapping the help button shows the sound card`);
  await page.click('.btn.again');
  await page.waitForSelector('.review .sound-card');
  ok(true, `lesson ${L.number} Letter Review: Again shows the sound`);
  ok(errors.length === 0, `lesson ${L.number} Letter Review: no errors ${errors.join(' | ')}`);
  await ctx.close();
  const n = await open(`#/lesson/${L.number}/task/1`);
  await n.page.waitForSelector('.new-letter');
  ok((await n.page.locator('.new-letter .sound-card').isVisible()), `lesson ${L.number} New Sound: the sound card shows at once (the sound is new)`);
  await n.ctx.close();
}

// The lesson overview: the frame as cards, no alphabet song row, no outside link.
for (const L of [CUR.lessons[0], CUR.lessons[1], CUR.lessons[12]]) {
  const { ctx, page, errors } = await open(`#/lesson/${L.number}`);
  await page.waitForSelector('.task-card');
  const names = await page.locator('.task-card .card-name').allInnerTexts();
  ok(names.join('|') === tasksFor(L).map((t) => t.name).join('|'), `lesson ${L.number} overview lists the frame (${names.join(', ')})`);
  ok(names.at(-1) === 'Ticket Check' && names[0] === (L.number === 1 ? 'New Sound' : 'Letter Review'), `lesson ${L.number} overview: first and last cards`);
  ok((await page.locator('.song-row').count()) === 0 && !(await page.locator('body').innerText()).includes('Alphabet song'), `lesson ${L.number} overview: no Alphabet song row`);
  ok((await page.locator('a[href^="http"]').count()) === 0, `lesson ${L.number} overview: no outside link`);
  ok(errors.length === 0, `lesson ${L.number} overview: no errors`);
  await ctx.close();
}

// Grownups: no Links section and no outside address.
{
  const { ctx, page, errors } = await open('#/home', { seenScripts: SEEN });
  await page.waitForSelector('.pill-hold'); await page.waitForTimeout(900);
  const gb = await page.locator('.pill-hold').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.waitForTimeout(2300); await page.mouse.up();
  await page.waitForSelector('.grownups');
  const text = await page.locator('body').innerText();
  ok((await page.locator('.gu-link').count()) === 0 && (await page.locator('a[href^="http"]').count()) === 0, 'Grownups: no outside link');
  ok(!/youtube|Sound story playlist|Alphabet song/i.test(text), 'Grownups: no YouTube, playlist or song text');
  ok(errors.length === 0, 'Grownups: no errors ' + errors.join(' | '));
  await ctx.close();
}

await browser.close(); server.close();
console.log(`lesson-rebuild: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
