// The train world: Pip in 2D (js/art/pip.js) on the welcome card and the finish screen, and (step 2) the 3D railway Home.
// Run alone with `node test/train.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { audit } from './audit.mjs';

import { ROOT, startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN } from './lib.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const seedState = (state) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(state))}); }`;


async function open(browser, url, vp, state, route, extra) {
  const made = await newPage(browser, vp, extra);
  await made.page.addInitScript(SPEECH_STUB);
  if (state) await made.page.addInitScript(seedState(state));
  await made.page.goto(url + route);
  return made;
}

// Pip in 2D: every pose renders, has his parts, holds no text and no letter name, and is the same size in every pose.
export async function pipChecks({ browser, url, ok }) {
  const { ctx, page, errors } = await open(browser, url, VIEWPORTS[0], { schema: 1, lessons: {}, settings: { seenScripts: SEEN }, firstRunDone: true }, '#/grownups');
  await page.waitForTimeout(400);
  const r = await page.evaluate(async () => {
    const { pipSvg, POSES, PIP } = await import('/js/art/pip.js');
    const out = {};
    for (const pose of [...POSES, 'nonsense']) {
      const s = pipSvg({ pose });
      s.style.width = '120px'; s.style.height = '150px';
      document.body.append(s);
      const box = s.querySelector('.pip-fig').getBBox();
      out[pose] = {
        cls: s.getAttribute('class'), hidden: s.getAttribute('aria-hidden'), text: s.textContent.trim(), labels: [...s.querySelectorAll('[aria-label],title,text')].length,
        parts: ['.pip-head', '.pip-eyes', '.pip-cap', '.pip-arm-l', '.pip-arm-r', '.pip-fig'].every((q) => s.querySelector(q)),
        box: { x: box.x, y: box.y, w: box.width, h: box.height }, head: (() => { const k = s.querySelector('.pip-skull').getBBox(), c = s.querySelector('.pip-cap').getBBox(); return { skull: k.height, withCap: k.y + k.height - c.y }; })(),
        ids: [...s.querySelectorAll('[id]')].map((e) => e.id),
        rightHand: (() => { const c = s.querySelectorAll('.pip-arm-r circle')[0]; return { x: +c.getAttribute('cx'), y: +c.getAttribute('cy') }; })(),
      };
      s.remove();
    }
    out.colors = PIP;
    return out;
  });
  for (const pose of ['idle', 'wave', 'cheer', 'point']) {
    const p = r[pose];
    ok(p.cls === `pip pose-${pose}` && p.parts, `Pip ${pose}: renders with head, eyes, cap, both arms (${p.cls})`);
    ok(p.hidden === 'true' && p.text === '' && p.labels === 0, `Pip ${pose}: decoration only, no text, no labels, so never a letter name`);
    ok(p.box.h > 120 && p.box.y >= 0 && p.box.y + p.box.h <= 150.5, `Pip ${pose}: fits his 120 by 150 box (${p.box.y.toFixed(1)}..${(p.box.y + p.box.h).toFixed(1)})`);
    ok(p.head.skull / 150 > 0.42 && p.head.withCap / 150 >= 0.5 && p.head.withCap / 150 <= 0.62, `Pip ${pose}: a toddler's big head, about 55% of his height with the cap (${p.head.withCap.toFixed(0)} of 150)`);
  }
  ok(r.wave.rightHand.y < 80 && r.idle.rightHand.y > 110 && r.point.rightHand.x > 100 && r.cheer.rightHand.y < 80, 'Pip poses differ: wave and cheer raise the hand, point reaches out, idle rests');
  ok(r.nonsense.cls === 'pip pose-idle', 'Pip: an unknown pose falls back to idle');
  ok(new Set([...r.idle.ids, ...r.wave.ids]).size === r.idle.ids.length + r.wave.ids.length, 'Pip: two Pips on one page never share gradient ids');
  ok(r.colors.cap === '#2B2D5C' && r.colors.scarf === '#E5484D' && r.colors.button === '#FFD166', 'Pip: navy cap, red neckerchief, gold buttons (the spec palette)');
  ok(errors.length === 0, `Pip: errors ${errors.join(' | ')}`);
  await ctx.close();

  // On the welcome card (waving) and the finish screens (cheering), nothing spoken by him, no letter names anywhere.
  for (const vp of VIEWPORTS) {
    const w = await open(browser, url, vp, { schema: 1, lessons: {}, settings: { seenScripts: SEEN } }, '#/home');
    await w.page.waitForSelector('.welcome');
    await w.page.waitForTimeout(800);
    const pip = await w.page.evaluate(() => { const s = document.querySelector('.welcome .wc-pip .pip'); if (!s) return null; const r = s.getBoundingClientRect(), c = document.querySelector('.first-card').getBoundingClientRect(), t = (() => { const rg = document.createRange(); rg.selectNodeContents(document.querySelector('.wc-page.on h2')); return rg.getBoundingClientRect(); })(), p = (() => { const rg = document.createRange(); rg.selectNodeContents(document.querySelector('.wc-page.on p')); return rg.getBoundingClientRect(); })(); return { pose: s.dataset.pose, r: { x: r.x, y: r.y, w: r.width, h: r.height }, inside: r.left >= c.left && r.right <= c.right && r.top >= c.top && r.bottom <= c.bottom, clearText: r.right <= t.left + 1 || r.bottom <= t.top + 1 || r.top >= t.bottom - 1, clearPara: r.bottom <= p.top + 1 || r.right <= p.left + 1 }; });
    ok(pip && pip.pose === 'wave' && pip.r.h >= 34, `${vp.name} welcome: Pip waves at the top of the card (${JSON.stringify(pip && pip.r)})`);
    ok(pip && pip.inside && pip.clearText && pip.clearPara, `${vp.name} welcome: Pip sits inside the card and clear of the words (${JSON.stringify(pip)})`);
    ok(w.errors.length === 0, `${vp.name} welcome: errors ${w.errors.join(' | ')}`);
    await w.ctx.close();

    for (const route of ['#/lesson/1/finish', '#/checkpoint/c1/finish']) {
      const lessons = { 1: { tasksDone: [], result: 'got-it' }, 2: { tasksDone: [], result: 'got-it' }, 3: { tasksDone: [], result: 'got-it' } };
      const f = await open(browser, url, vp, { schema: 1, lessons, settings: { seenScripts: SEEN }, firstRunDone: true }, route);
      await f.page.waitForSelector('.finish');
      await f.page.waitForTimeout(1300);
      const m = await f.page.evaluate(() => {
        const s = document.querySelector('.finish-pip .pip'), r = s.getBoundingClientRect(), g = document.querySelector('.finish-glyph').getBoundingClientRect(), c = document.querySelector('.finish-card').getBoundingClientRect(), h1 = document.querySelector('.finish h1').getBoundingClientRect();
        const ov = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        return { pose: s.dataset.pose, inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0, beside: Math.abs((r.top + r.bottom) / 2 - (g.top + g.bottom) / 2) < g.height, clear: !ov(r, c) && !ov(r, h1), h: r.height, scroll: document.documentElement.scrollWidth - innerWidth };
      });
      const tag = `${vp.name} ${route.slice(2)}`;
      ok(m.pose === 'cheer' && m.h >= 60, `${tag}: Pip cheers beside the glyph (${m.h.toFixed(0)} px)`);
      ok(m.inView && m.beside && m.clear && m.scroll <= 0, `${tag}: Pip is in view, beside the glyph, clear of the heading and the grown-up's card (${JSON.stringify(m)})`);
      const p = await audit(f.page, tag);
      ok(p.length === 0, p.join(' | '));
      ok(f.errors.length === 0, `${tag}: errors ${f.errors.join(' | ')}`);
      await f.ctx.close();
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await pipChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`train: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
