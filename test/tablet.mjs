// Tablet (iPad) layouts: every lesson task type, game and story screen at five tablet sizes.
// For each size and screen: no horizontal overflow, the stage does not scroll or clip, the key content and the Next / Again buttons are
// fully inside the viewport, every tap target is at least 48 px, and the main pieces are bigger than on a phone (412x915).
// Run alone with `node test/tablet.mjs`; SHOTS=1 also saves a screenshot of every screen to docs/screenshots/tablet/.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, DONE_JSON } from './lib.mjs';
import { tasksFor } from '../js/lessons.js';

export const TABLET_SIZES = [[820, 1180], [1180, 820], [768, 1024], [1024, 768], [1366, 1024]];
// The yardstick is the phone held the same way: 412x915 for a tablet held upright, 915x412 for one held sideways.
const PHONE = { portrait: { width: 412, height: 915, deviceScaleFactor: 2.6 }, landscape: { width: 915, height: 412, deviceScaleFactor: 2.6 } };
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/tablet');
const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const idx = (n, type) => tasksFor(CUR.lessons[n - 1]).find((t) => t.type === type).index;
const SEEN_ALL = { ...SEEN, read: true, tunnels: true, which: true, chains: true, couple: true, split: true, heart: true, 'tip:contrast': true };

// A screen: route, what to wait for, `stage` (a task screen: its stage must not scroll or clip), `big` ([selector, factor]: the pieces are
// at least that many times bigger than on the phone), `inside` (selectors that must sit fully in the viewport) and an optional `after`.
const task = (n, type, extra = {}) => ({ name: `L${n}-${type}`, route: `/lesson/${n}/task/${idx(n, type)}`, wait: '.task-stage', stage: true, ...extra });
const stop = (id, i, extra = {}) => ({ name: `${id}-${i}`, route: `/checkpoint/${id}/task/${i}`, wait: '.task-stage', stage: true, ...extra });
const SCREENS = [
  { name: 'lesson-list', route: '/lesson/9', wait: '.task-card', big: ['.task-card', 1.0], inside: ['.start-btn'] },
  { name: 'lesson-list-34', route: '/lesson/34', wait: '.task-card', inside: ['.start-btn'] },
  task(1, 'newLetter', { big: ['.word-tile', 1.1], inside: ['.word-tile', '.letter-card', '.slide-track'] }),
  task(11, 'newLetter', { name: 'L11-newLetter-pair', inside: ['.word-tile', '.letter-card'] }),
  task(34, 'newLetter', { name: 'L34-newBlend', inside: ['.letter-card'] }),
  task(43, 'newLetter', { name: 'L43-newEnding', inside: ['.letter-card'] }),
  task(48, 'newLetter', { name: 'L48-biggerWords', inside: ['.letter-card'] }),
  task(2, 'review', { inside: ['.letter-card'] }),
  task(1, 'mouth', { big: ['.mouth-art', 1.2], inside: ['.mouth-art', '.px-btns'] }),
  { ...task(1, 'mouth', { name: 'L1-mouth-how', inside: ['.mouth-how', '.mouth-art'] }), after: (p) => p.click('.mouth-how-btn') },
  task(11, 'mouth', { name: 'L11-mouth-pair', inside: ['.mouth-art', '.px-btns'] }),
  task(3, 'heart', { inside: ['.hw-tile'], big: ['.hw-tile', 1.0] }),
  { ...task(3, 'heart', { name: 'L3-heart-tried', inside: ['.hw-tile'] }), after: async (p) => { await p.locator('.hw-tried, .hw-host .btn').first().click().catch(() => {}); } },
  task(1, 'sounds', { big: ['.sounds-stage', 1.3], inside: ['.sounds-stage'] }),
  task(1, 'writing', { big: ['.trace-pad', 1.15, 'portrait'], inside: ['.trace-pad', '.writing-buttons'] }),
  task(11, 'writing', { name: 'L11-writing-pair', inside: ['.trace-pad', '.writing-buttons', '.letter-pick'] }),
  task(1, 'hunt', { wait: '.sky-letter', big: ['.sky-letter', 1.3], inside: ['.find-card', '.hunt-goal'] }),
  task(2, 'signals', { wait: '.signal', big: ['.signal', 1.3], inside: ['.signal', '.signal-hear', '.train-wrap'] }),
  task(3, 'wagons', { wait: '.parade-wagon', big: ['.parade-wagon', 1.3], inside: ['.find-card', '.train-wrap'] }),
  task(5, 'board', { wait: '.flap-tile', big: ['.flap-tile', 1.2], inside: ['.flap-board', '.say-hear'] }),
  task(1, 'practice', { wait: '.sack-card', big: ['.sack-card', 1.25], inside: ['.sack-card'] }),
  task(1, 'check', { wait: '.opt-card', big: ['.opt-card', 1.3], inside: ['.opt-card', '.check-prompt'] }),
  task(34, 'chains', { wait: '.chain-car.choice', big: ['.chain-car.choice', 1.1], inside: ['.chain-car', '.chain-car.choice'] }),
  task(43, 'couple', { wait: '.chain-car.choice', big: ['.chain-car.choice', 1.1], inside: ['.chain-car', '.chain-car.choice'] }),
  task(48, 'split', { wait: '.chain-car', big: ['.chain-car', 1.25], inside: ['.chain-car'] }),
  { name: 'finish', route: '/lesson/9/finish', wait: '.finish', inside: ['.finish-glyph', '.finish-card', '.finish .btn'] },
  { name: 'stop-review-intro', route: '/checkpoint/v1', wait: '.review-start', inside: ['.review-start', '.back-path'], big: ['.review-start', 1.2] },
  { name: 'stop-tricky-intro', route: '/checkpoint/x1', wait: '.review-start', inside: ['.review-start', '.back-path'] },
  stop('v1', 0, { name: 'stop-hunt', wait: '.sky-letter', big: ['.sky-letter', 1.3] }),
  stop('v1', 1, { name: 'stop-wagons', wait: '.parade-wagon', big: ['.parade-wagon', 1.3] }),
  stop('v1', 3, { name: 'stop-read-a-word', wait: '.task-stage', inside: ['.sounds-stage, .words-task, .reading-item, .first-word'] }),
  stop('v1', 4, { name: 'stop-check', wait: '.opt-card', big: ['.opt-card', 1.3] }),
  stop('x1', 0, { name: 'tricky-tunnels', wait: '.task-stage', inside: ['.train-wrap, .wagon, .dock-train, .tunnel'] }),
  stop('x1', 1, { name: 'tricky-which', wait: '.which-card', big: ['.which-card', 0.9], inside: ['.which-card'] }),
  stop('x1', 2, { name: 'tricky-signals', wait: '.signal', big: ['.signal', 1.3] }),
  { name: 'reread', route: '/checkpoint/r1', wait: '.ra-page', inside: ['.ra-sentence', '.ra-turn'], big: ['.ra-sentence', 1.1] },
  { name: 'book-cover', route: '/checkpoint/b1', wait: '.book-stage', inside: ['.book-stage'] },
  { name: 'book-intro', route: '/checkpoint/b1', wait: '.book-intro-go', unseen: ['storyIntro:b1'], inside: ['.book-intro-go'] },
  { name: 'book-page-1', route: '/checkpoint/b1', wait: '.book-cover', after: async (p) => { await p.click('.book-cover'); await p.waitForTimeout(1400); }, inside: ['.book-read'] },
  { name: 'book-page-4', route: '/checkpoint/b1', wait: '.book-cover', after: async (p) => { await p.click('.book-cover'); await p.waitForTimeout(1400); for (let i = 0; i < 3; i++) { await p.click('.book-arrow.book-next:not([disabled])').catch(() => {}); await p.waitForTimeout(900); } }, inside: ['.book-read'] },
  { name: 'reread-reading', route: '/checkpoint/r1', wait: '.ra-turn', after: async (p) => { await p.click('.ra-turn'); await p.waitForTimeout(2500); }, inside: ['.ra-sentence'] },
  task(11, 'hunt', { name: 'L11-hunt-pair', wait: '.sky-letter', inside: ['.find-card', '.hunt-goal'] }),
  { ...task(1, 'sounds', { name: 'L1-sounds-revealed', inside: ['.sounds-stage'] }), after: async (p) => { await p.click('.sounds-stage'); await p.waitForTimeout(2600); } },
  task(4, 'check', { name: 'L4-check', wait: '.opt-card', inside: ['.opt-card', '.check-prompt'] }),
  task(5, 'check', { name: 'L5-check', wait: '.opt-card', inside: ['.opt-card', '.check-prompt'] }),
  task(9, 'practice', { name: 'L9-practice', wait: '.sack-card', inside: ['.sack-card'] }),
  { name: 'placement', route: '/proto/placement', wait: '.pc-welcome', inside: ['.pc-begin', '.pc-quick'], big: ['.pc-begin', 1.1] },
];

const seenFor = (s) => { const o = { ...SEEN_ALL }; for (const k of s.unseen || []) delete o[k]; return o; };
async function openScreen(browser, url, vp, s) {
  const made = await newPage(browser, vp);
  const { page } = made;
  await page.addInitScript(SPEECH_STUB);
  await page.addInitScript(`localStorage.setItem('reading.v1', JSON.stringify(${JSON.stringify({ schema: 1, lessons: JSON.parse(DONE_JSON), settings: { seenScripts: seenFor(s) }, firstRunDone: true, meetDue: false })}))`);
  await page.goto(url + '#' + s.route);
  await page.waitForSelector(s.wait, { timeout: 8000 });
  await page.waitForTimeout(900);
  if (s.after) { await s.after(page); await page.waitForTimeout(500); }
  return made;
}

// The measurements run in the page. `inside`: selectors whose visible elements must sit fully in the viewport (and in the stage on a task screen).
const measure = (page, s) => page.evaluate(({ stage, inside, big }) => {
  const vw = innerWidth, vh = innerHeight;
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]') && cs.opacity !== '0'; };
  const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const out = { overflowX: document.documentElement.scrollWidth - vw, problems: [], small: [] };
  const act = document.querySelector('.task-activity');
  if (stage && act) {
    out.stageScroll = act.scrollHeight - act.clientHeight;
    const sr = act.getBoundingClientRect();
    // the content of the stage sits inside the stage card (nothing is cut off at its edge)
    for (const sel of inside || []) for (const e of document.querySelectorAll(sel)) if (vis(e) && !e.closest('.signal-row,.parade,.sky,.sack-cards') ) {
      const r = e.getBoundingClientRect();
      if (r.bottom > sr.bottom + 1 || r.top < sr.top - 1 || r.right > sr.right + 1 || r.left < sr.left - 1) out.problems.push(`${sel} outside the stage (${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)} vs stage ${Math.round(sr.left)},${Math.round(sr.top)},${Math.round(sr.right)},${Math.round(sr.bottom)})`);
    }
  }
  for (const sel of inside || []) for (const e of document.querySelectorAll(sel)) if (vis(e)) {
    const r = e.getBoundingClientRect();
    if (r.bottom > vh + 1 || r.right > vw + 1 || r.top < -1 || r.left < -1) { if (!e.closest('.cards, .parade, .signal-row')) out.problems.push(`${sel} outside the viewport`); }
  }
  // the Next and Again buttons
  for (const sel of ['.btn.next', '.btn.again']) { const e = document.querySelector(sel); if (e && vis(e)) { const r = e.getBoundingClientRect(); if (r.bottom > vh + 1 || r.top < 0) out.problems.push(sel + ' not reachable'); } }
  // tap targets
  for (const b of document.querySelectorAll('button, a.btn, [role=button]')) {
    if (!vis(b) || getComputedStyle(b).pointerEvents === 'none') continue;
    const r = b.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue; // scrolled away (the lesson cards)
    if (r.width < 47.5 || r.height < 47.5) out.small.push(`${b.className || b.tagName} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  if (big) { const e = [...document.querySelectorAll(big[0])].find(vis); out.big = e ? rect(e) : null; }
  return out;
}, { stage: !!s.stage, inside: s.inside, big: s.big });

export async function tabletChecks({ browser, url, ok, sizes = TABLET_SIZES, shot = !!process.env.SHOTS, only = process.env.ONLY }) {
  if (shot) fs.mkdirSync(SHOT_DIR, { recursive: true });
  for (const s of SCREENS) {
    if (only && !new RegExp(only).test(s.name)) continue;
    const phones = {};
    if (s.big) for (const k of ['portrait', 'landscape']) {
      const { ctx, page } = await openScreen(browser, url, PHONE[k], s);
      phones[k] = (await measure(page, s)).big;
      await ctx.close();
    }
    for (const [w, h] of sizes) {
      const phone = phones[s.big && s.big[2] ? s.big[2] : w > h ? 'landscape' : 'portrait'];
      const tag = `${s.name} ${w}x${h}`;
      const { ctx, page, errors } = await openScreen(browser, url, { width: w, height: h, deviceScaleFactor: 1 }, s);
      const m = await measure(page, s);
      ok(m.overflowX <= 1, `${tag}: no horizontal overflow (${m.overflowX})`);
      if (s.stage) ok(m.stageScroll <= 1, `${tag}: the stage does not scroll (${m.stageScroll})`);
      ok(m.problems.length === 0, `${tag}: nothing clipped ${m.problems.slice(0, 3).join(' | ')}`);
      ok(m.small.length === 0, `${tag}: every tap target is at least 48 px (${[...new Set(m.small)].slice(0, 4).join(', ')})`);
      if (s.big && phone && m.big) {
        const f = Math.min(m.big.w / phone.w, m.big.h / phone.h);
        ok(f >= s.big[1] - 0.001, `${tag}: ${s.big[0]} uses the space, ${f.toFixed(2)}x the phone (needs ${s.big[1]}x)`);
      } else if (s.big) ok(false, `${tag}: ${s.big[0]} found (${!!phone}, ${!!m.big})`);
      ok(errors.length === 0, `${tag}: errors ${errors.join(' | ')}`);
      if (shot) await page.screenshot({ path: path.join(SHOT_DIR, `${s.name}_${w}x${h}.jpg`), type: 'jpeg', quality: 58 });
      await ctx.close();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let pass = 0, fail = 0;
  const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('FAIL', msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await tabletChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`tablet: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
