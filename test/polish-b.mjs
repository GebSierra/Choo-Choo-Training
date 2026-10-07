// Polish B (no version change): the lesson overview order (steps first, the optional song row last), the shared task frame's texture and
// centring, the finish celebration (present, finite, still under reduced motion), fit and 48 px targets at 390x844, 360x640 and 915x412.
// (Starter Station's extra props are checked in test/regions.mjs.) Run alone with `node test/polish-b.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { SPEECH_STUB } from './stubs.mjs';
import { ROOT, startServer, loadPlaywright, launch, newPage, SEEN, DONE_JSON } from './lib.mjs';

const CUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/curriculum.json'), 'utf8'));
const VPS = [{ name: '390x844', width: 390, height: 844 }, { name: '360x640', width: 360, height: 640 }, { name: '915x412', width: 915, height: 412 }];
const SEED = `localStorage.setItem('reading.v1', JSON.stringify({schema:1,lessons:${DONE_JSON},settings:${JSON.stringify({ seenScripts: SEEN })},firstRunDone:true}))`;

async function open(browser, url, vp, route, extra) {
  const made = await newPage(browser, { ...vp, deviceScaleFactor: 2 }, extra);
  await made.page.addInitScript(SPEECH_STUB);
  await made.page.addInitScript(SEED);
  await made.page.goto(url + route);
  return made;
}

export async function polishBChecks({ browser, url, ok }) {
  for (const vp of VPS) {
    const tag = vp.name, land = vp.width > vp.height;
    // ---- the lesson overview ----
    {
      const { ctx, page, errors } = await open(browser, url, vp, '#/lesson/4');
      await page.waitForSelector('.task-card');
      await page.waitForTimeout(700);
      const o = await page.evaluate(() => {
        const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, b: b.bottom, r: b.right }; };
        const hold = document.querySelector('.song-row .hold-btn').getBoundingClientRect();
        return { cards: r('.cards-wrap'), card: r('.task-card'), start: r('.start-btn'), song: r('.song-row'), hold: { w: hold.width, h: hold.height }, inFoot: !!document.querySelector('.lo-foot .song-row') && !!document.querySelector('.lo-foot .start-btn'),
          order: [...document.querySelector('.lesson-overview').children].map((c) => c.className.split(' ')[0]), fade: !!document.querySelector('.cards-fade'), sw: document.documentElement.scrollWidth - innerWidth, vh: innerHeight, vw: innerWidth };
      });
      ok(o.order.join() === 'lo-head,cards-wrap,lo-foot' && o.inFoot, `${tag} overview: header, then the steps, then the footer with Start and the song row (${o.order.join()})`);
      ok(o.card.y < o.song.y && o.card.y < o.start.y, `${tag} overview: the steps start above the song row and the Start button`);
      if (!land) ok(o.start.b <= o.song.y + 1 && o.song.y > o.start.y, `${tag} overview: the song row sits below the Start button`);
      else ok(o.song.r <= o.start.x + 2, `${tag} overview: the song row is beside Start (left of it)`);
      ok(o.start.h >= 60 && o.start.w >= 200, `${tag} overview: a big Start button (${Math.round(o.start.w)} x ${Math.round(o.start.h)})`);
      ok(o.hold.h >= 48 && o.hold.w >= 48, `${tag} overview: the song's hold button is a 48 px target (${Math.round(o.hold.w)} x ${Math.round(o.hold.h)})`);
      ok(o.start.b <= o.vh + 1 && o.song.b <= o.vh + 1 && o.sw <= 0, `${tag} overview: Start and the song row fit on screen, no sideways page scroll`);
      if (!land) {
        ok(o.fade, `${tag} overview: the step row has a fade on its edge`);
        // the fade shows while more steps wait to the right, and goes at the end
        const f0 = await page.evaluate(() => getComputedStyle(document.querySelector('.cards-fade')).opacity);
        await page.evaluate(() => { const s = document.querySelector('.cards-scroll'); s.scrollLeft = s.scrollWidth; });
        await page.waitForTimeout(500);
        const f1 = await page.evaluate(() => ({ o: getComputedStyle(document.querySelector('.cards-fade')).opacity, end: document.querySelector('.cards-wrap').classList.contains('at-end') }));
        ok(f0 === '1' && f1.end && f1.o === '0', `${tag} overview: the edge fade shows at the start (${f0}) and is gone at the end (${f1.o})`);
        const peek = await page.evaluate(() => { const c = document.querySelectorAll('.task-card')[1].getBoundingClientRect(); return c.left < innerWidth; });
        void peek;
      }
      ok(errors.length === 0, `${tag} overview: errors ${errors.join(' | ')}`);
      await ctx.close();
    }
    // ---- the shared task frame: texture, centring, targets ----
    for (const type of ['words', 'story', 'check']) {
      const t = CUR.lessons[3];
      const { tasksFor } = await import('../js/lessons.js');
      const task = tasksFor(t).find((x) => x.type === type);
      const { ctx, page, errors } = await open(browser, url, vp, `#/lesson/4/task/${task.index}`);
      await page.waitForSelector('.task-stage');
      await page.waitForTimeout(700);
      const m = await page.evaluate(() => {
        const st = document.querySelector('.task-stage'), a = document.querySelector('.task-activity'), cs = getComputedStyle(st), ab = a.getBoundingClientRect(), kid = a.firstElementChild.getBoundingClientRect();
        const small = [...document.querySelectorAll('.task-foot button, .task-stage > .speak-btn, .task-head button')].filter((b) => b.offsetParent && !b.closest('[hidden]')).map((b) => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }).filter((v) => v < 47.5);
        return { img: cs.backgroundImage, radius: cs.borderTopLeftRadius, top: kid.top - ab.top, bottom: ab.bottom - kid.bottom, sw: document.documentElement.scrollWidth - innerWidth, small };
      });
      ok(/radial-gradient/.test(m.img) && m.img.split('radial-gradient').length >= 3, `${tag} ${type}: the coloured card has its texture and soft light`);
      ok(m.small.length === 0 && m.sw <= 0, `${tag} ${type}: 48 px targets and no sideways scroll (${m.small.join(',')})`);
      if (!land && type === 'words') ok(Math.abs(m.top - m.bottom) < 80, `${tag} ${type}: the content sits in the middle of the card (${Math.round(m.top)} above, ${Math.round(m.bottom)} below)`);
      ok(errors.length === 0, `${tag} ${type}: errors ${errors.join(' | ')}`);
      await ctx.close();
    }
    // ---- the finish celebration ----
    for (const reduce of [false, true]) {
      const t = `${tag}${reduce ? ' reduced motion' : ''} finish`;
      const { ctx, page, errors } = await open(browser, url, vp, '#/lesson/4/finish', reduce ? { reducedMotion: 'reduce' } : undefined);
      await page.waitForSelector('.finish');
      await page.waitForTimeout(3600);
      const f = await page.evaluate(() => {
        const q = (s) => document.querySelector(s), pieces = [...document.querySelectorAll('.confetti i')];
        const all = document.getAnimations();
        const endless = all.filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().endTime === Infinity).length;
        const running = all.filter((a) => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.confetti, .finish-star, .finish-wagon, .finish-glyph > .finish-ring') && !a.effect.target.closest('.pip, .kid')).length; // (Pip's own idle loops are older and finite)
        const inView = pieces.filter((p) => { const r = p.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; }).length;
        const btns = [...document.querySelectorAll('.finish button')].map((b) => { const r = b.getBoundingClientRect(); return { h: r.height, dis: b.disabled, b: r.bottom }; });
        const g = q('.finish-glyph').getBoundingClientRect(), wag = q('.finish-wagon').getBoundingClientRect(), gl = q('.finish-wagon .glyph').getBoundingClientRect();
        return { n: pieces.length, inView, star: !!q('.finish-star'), wagon: !!q('.finish-wagon'), letter: wag.left <= gl.left && gl.right <= wag.right, endless, running, btns, sw: document.documentElement.scrollWidth - innerWidth, g: { w: g.width }, figures: !!q('.finish-pip .pip') && !!q('.finish-kid .kid'), op: getComputedStyle(pieces[0]).opacity, anim: getComputedStyle(pieces[0]).animationName };
      });
      ok(f.n >= 18 && f.inView >= 14 && f.star && f.wagon && f.letter && f.figures, `${t}: confetti (${f.n}, ${f.inView} on screen), a gold star, the letter on its wagon, and both figures`);
      ok(f.endless === 0, `${t}: nothing loops forever (${f.endless} endless animations)`);
      if (reduce) ok(f.running === 0 && f.anim === 'none' && Number(f.op) > 0.5, `${t}: static (${f.running} running animations, confetti animation "${f.anim}", still visible at ${f.op})`);
      else ok(f.running === 0, `${t}: the burst is over after 3.6 s (${f.running} still running)`);
      ok(f.btns.length === 3 && f.btns.every((b) => !b.dis && b.h >= 47.5), `${t}: the three buttons are open and at least 48 px tall (${f.btns.map((b) => Math.round(b.h)).join(',')})`);
      ok(f.sw <= 0, `${t}: no sideways scroll`);
      ok(errors.length === 0, `${t}: errors ${errors.join(' | ')}`);
      await ctx.close();
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let failures = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL: ' + msg); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await polishBChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`polish-b: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
