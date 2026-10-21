// Say-this audit: opens every task and game round (lessons, Review Stops, Read It Again) at 360 x 640 and records the round card, the collapsed
// gist and the expanded script of the "Say this" bar. The table is docs/audit/say-this.md. It is a slow audit (about 25 minutes), not part of npm test.
//   node test/say-audit.mjs 1-25            every task of lessons 1 to 25   (writes $AUDIT_OUT-1-25.json)
//   node test/say-audit.mjs 0-0 stops       every Review Stop task, the opening cards, Read It Again, the Stories   (writes $AUDIT_OUT-0-0-stops.json)
// It then lints the rows (gist fits the collapsed bar, one wording per game, American spelling, no jargon) and exits 1 when something is off.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, DONE_JSON, touchDrag } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const rows = [];
const { server, url } = await startServer();
const browser = await launch(await loadPlaywright());

async function open(route, settings = {}) {
  const made = await newPage(browser, { width: 360, height: 640, deviceScaleFactor: 1 });
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: JSON.parse(DONE_JSON), settings: { seenScripts: SEEN, migrated1912: true, playSounds: false, ...settings }, firstRunDone: true, meetDue: false })}))`);
  await made.page.goto(url + route);
  return made;
}
const read = (page) => page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  // The taught letter a is drawn as an inline glyph (no text): read it back as its letter.
  const t = (s) => { const e = q(s); if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('svg[data-letter]').forEach((g) => g.replaceWith(g.dataset.letter)); return c.textContent.replace(/\s+/g, ' ').trim(); };
  const pr = q('.say-prompt');
  return { title: t('.task-head h1'), card: pr && !pr.hidden ? t('.say-text') : '', gist: t('.script-first'), script: t('.script-text'), tip: t('.grown-tip') };
});
let seq = 0;
async function snap(page, lesson, task, round, extra = {}) {
  await page.waitForTimeout(250);
  const r = await read(page);
  (page.__rows ||= []).push({ lesson, task, round, card: r.card, gist: r.gist, script: r.script, tip: r.tip, ...extra });
}
const tryTap = async (page, sel) => { try { await page.locator(sel).first().tap({ timeout: 1500 }); return true; } catch { return false; } };

async function walkGame(page, label, lesson, sel, rounds = 4) {
  let last = '';
  for (let r = 0; r < rounds; r++) {
    await page.waitForTimeout(700);
    await page.mouse.click(3, 3).catch(() => {});
    await page.waitForFunction(() => { const p = document.querySelector('.say-prompt'); return !p || !p.hidden; }, null, { timeout: 3000 }).catch(() => {});
    const cur = await read(page);
    const sig = cur.card + '|' + cur.gist + '|' + cur.script;
    if (sig !== last) await snap(page, lesson, label, r + 1);
    last = sig;
    const hits = await page.locator(sel).count();
    for (let k = 0; k < Math.min(hits, 6); k++) { await tryTap(page, sel); await page.waitForTimeout(450); }
    await page.waitForTimeout(900);
  }
}
async function walkSack(page, label, lesson, rounds = 3) {
  for (let r = 0; r < rounds; r++) {
    await page.waitForSelector('.sack-card[data-correct="1"]:not([disabled])', { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(900);
    await snap(page, lesson, label, r + 1);
    const c = await page.locator('.sack-card[data-correct="1"]:not([disabled])').first().boundingBox().catch(() => null);
    const s = await page.locator('.sack').boundingBox().catch(() => null);
    if (!c || !s) break;
    await touchDrag(page, { x: c.x + c.width / 2, y: c.y + c.height / 2 }, { x: s.x + s.width / 2, y: s.y + s.height / 2 }, { steps: 14 });
    await page.waitForTimeout(1500);
  }
}

const groups = [];
async function doTask(route, label, lesson, type, ji) {
  const { ctx, page, errors } = await open(route);
  try {
    if (type === 'plain' || type === 'intro') {
      await page.waitForTimeout(1200);
      const t = await page.evaluate(() => document.querySelector('#app, body').innerText.replace(/\s+/g, ' ').trim());
      (page.__rows ||= []).push({ lesson, task: label, round: 1, card: t.slice(0, 400), gist: '', script: '' });
    } else {
      await page.waitForSelector('.task-head h1', { timeout: 8000 });
      await page.waitForTimeout(600);
      await page.mouse.click(3, 3);
      if (type === 'signals') await walkGame(page, label, lesson, '.signal[data-target="1"]', 4);
      else if (type === 'board') await walkGame(page, label, lesson, '.flap-tile[data-target="1"]', 4);
      else if (type === 'hunt') await walkGame(page, label, lesson, '.sky-letter[data-target="1"]', 2);
      else if (type === 'wagons') await walkGame(page, label, lesson, '.parade-wagon[data-target="1"]', 3);
      else if (type === 'practice' || type === 'sack') await walkSack(page, label, lesson, 3);
      else if (type === 'sounds') {
        for (let i = 0; i < 4; i++) { // the words of Saying Sounds, one by one ("Next word")
          await snap(page, lesson, label, i + 1);
          await page.waitForTimeout(500);
          await page.locator('.sounds-body .btn.ghost.small', { hasText: 'Next word' }).first().tap({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(600);
        }
      } else if (type === 'review') {
        for (let i = 0; i < 6; i++) {
          await snap(page, lesson, label, i + 1);
          await page.waitForTimeout(1100);
          const before = page.url();
          await page.locator('.btn.next').tap().catch(() => {});
          await page.waitForTimeout(500);
          if (page.url() !== before) break;
        }
      } else if (type === 'read') {
        for (let i = 0; i < 2; i++) {
          await page.waitForTimeout(1300); await snap(page, lesson, label, i + 1);
          const word = () => page.evaluate(() => document.querySelector('.first-word-stage')?.dataset.word);
          const w = await word();
          for (let t = 0; t < 4 && (await word()) === w; t++) { await tryTap(page, '.read-it'); await page.waitForTimeout(1000); } // the button waits a moment before it answers
        }
      } else if (type === 'reread') {
        await snap(page, lesson, label, 'listen');
        await tryTap(page, '.ra-turn'); await page.waitForTimeout(500);
        for (let i = 0; i < 4; i++) { await snap(page, lesson, label, 'read ' + (i + 1)); if (!(await tryTap(page, '.ra-read:not([disabled])'))) break; await page.waitForTimeout(900); }
        await page.waitForTimeout(1500);
        await snap(page, lesson, label, 'done');
      } else await snap(page, lesson, label, 1);
    }
  } catch (e) { (page.__rows ||= []).push({ lesson, task: label, round: '-', card: '', gist: 'ERROR ' + e.message.slice(0, 80), script: '' }); }
  if (errors.length) (page.__rows ||= []).push({ lesson, task: label, round: '-', card: '', gist: 'CONSOLE ERRORS', script: errors.join(' | ') });
  groups[ji] = page.__rows || [];
  await ctx.close();
}

const NAMES = { read: 'Read a Word', hunt: 'Letter Hunt', signals: 'Green Light', wagons: 'Wagon Parade', board: 'Station Board', check: 'Ticket Check' };
const arg = process.argv[2] || '1-25';
const [a, b] = arg.split('-').map(Number);
const jobs = [];
for (const L of CUR.lessons) {
  if (L.number < a || L.number > (b || a)) continue;
  for (const t of tasksFor(L)) jobs.push([`#/lesson/${L.number}/task/${t.index}`, `${t.name}`, `L${L.number}`, t.type]);
}
if (process.argv[3] === 'stops') {
  for (const k of CUR.checkpoints) {
    if (k.kind === 'review') {
      jobs.push([`#/checkpoint/${k.id}`, 'Review Stop opening card', k.id, 'plain']);
      k.plan.forEach((p, i) => jobs.push([`#/checkpoint/${k.id}/task/${i}`, `${NAMES[p.task]} (about L${p.lesson})`, k.id, p.task]));
    } else jobs.push([`#/checkpoint/${k.id}`, `${k.title}`, k.id, k.kind === 'reread' ? 'reread' : k.kind === 'book' ? 'plain' : 'sack']);
  }
}
const queue = jobs.map((j, i) => [...j, i]);
const worker = async () => { for (let j; (j = queue.shift());) { await doTask(...j).catch((e) => console.error('job fail', j[0], e.message)); } };
await Promise.all(Array.from({ length: 4 }, worker));
await browser.close(); server.close();
rows.push(...groups.flat());
const key = (r) => { const m = String(r.lesson).match(/^L(\d+)$/); return m ? Number(m[1]) : 100 + CUR.checkpoints.findIndex((k) => k.id === r.lesson); };
// ---- lint ----
const problems = [];
const GISTS = new Map(); // game wording per lesson: the gist of a game never changes its shape from round to round
for (const r of rows) {
  const where = `${r.lesson} ${r.task} round ${r.round}`;
  if (r.gist.length > 28) problems.push(`${where}: gist is ${r.gist.length} characters (28 fit the collapsed bar): ${r.gist}`);
  if (r.gist && !/[.?!]$/.test(r.gist) && !r.gist.startsWith('ERROR')) problems.push(`${where}: gist has no closing punctuation: ${r.gist}`);
  if (/practise|colour|favourite|phoneme|grapheme|\bCVC\b/i.test(`${r.gist} ${r.script} ${r.card}`)) problems.push(`${where}: British spelling or jargon`);
  if (/grown up\b/.test(`${r.gist} ${r.script}`)) problems.push(`${where}: "grown up" (write grown-up)`);
  const shape = r.gist.replace(/\b[a-z] as in [a-z]+|(?:kw|ks|[a-z])-|\b([a-z])\1{2,}\b/g, 'X');
  const k = `${r.lesson}|${r.task}`;
  if (['Green Light', 'Station Board', 'Wagon Parade', 'Letter Hunt'].includes(r.task)) { if (GISTS.has(k) && GISTS.get(k) !== shape) problems.push(`${where}: this game used a different wording in another round (${GISTS.get(k)} vs ${shape})`); GISTS.set(k, shape); }
  if (r.script.length > 0 && /\ba\b as in/.test(r.script) === false && /\bsay as in\b/.test(r.script)) problems.push(`${where}: a sound is missing before "as in"`);
}
for (const p of problems) console.error('LINT: ' + p);
if (problems.length) process.exitCode = 1;
fs.writeFileSync(`${process.env.AUDIT_OUT || '/tmp/say'}-${a}-${b || a}${process.argv[3] === 'stops' ? '-stops' : ''}.json`, JSON.stringify(rows, null, 1));
console.log('rows', rows.length);
