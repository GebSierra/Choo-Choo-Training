// The page turn of the storybook (js/screens/book.js). It never renders pages: the book hands it a renderTarget() that
// repaints the live sheets to the target page, and the turner lays a "leaf" (static clones of the old and new pages) over
// them and swings it around the spine with CSS 3D (rotateY). Every animation is WAAPI on transform and opacity, so it runs
// on the compositor. JavaScript runs only to set a turn up and, while a finger drags, to set the angle once per pointer
// move: nothing runs while the book is still.
//
//   const turner = pageTurner({ block, spread: () => bool, reducedMotion: () => bool });
//   turner.turn(dir, renderTarget)          dir 1 forward, -1 back; resolves when the clones are gone
//   const d = turner.drag(dir, renderTarget); d.move(k /* 0..1 */); d.release(commit, renderBack)
//   turner.finish()  turner.busy  turner.cleanup()

const FULL = { spread: 760, single: 650 };
const EASE = 'cubic-bezier(.45,.05,.35,1)';

export function pageTurner({ block, spread, reducedMotion }) {
  let cur = null; // the turn or drag in progress

  const sheet = (side) => block.querySelector(`.book-sheet.is-${side}.is-live`);
  function snap(el, cls) {
    const c = el.cloneNode(true);
    c.classList.remove('is-live'); c.classList.add(cls);
    c.querySelectorAll('.slide-band, .slide-hand, .sparkle').forEach((n) => n.remove());
    c.inert = true; c.setAttribute('aria-hidden', 'true');
    return c;
  }
  const blank = (side) => { const b = document.createElement('div'); b.className = `book-sheet is-${side} leaf-face`; b.setAttribute('aria-hidden', 'true'); return b; };
  const place = (el, sh) => { el.style.left = sh.offsetLeft + 'px'; el.style.width = sh.offsetWidth + 'px'; };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // Everything a turn needs, built once: the leaf, the layer under it and the shadow it casts.
  function setup(dir, renderTarget) {
    if (cur) cur.end();
    const sp = spread();
    const oldR = snap(sheet('right'), 'book-under'), oldL = sp ? snap(sheet('left'), 'book-under') : null;
    renderTarget();
    const liveR = sheet('right'), liveL = sp ? sheet('left') : null;
    if (reducedMotion()) {
      const layers = [oldR, oldL].filter(Boolean);
      layers.forEach((l, k) => { place(l, k === 0 ? liveR : liveL); block.append(l); });
      return { reduced: true, layers };
    }
    const newR = snap(liveR, 'leaf-face'), newL = sp ? snap(liveL, 'leaf-face') : null;
    const leaf = document.createElement('div');
    const cast = document.createElement('div'); cast.className = 'book-cast';
    const under = [];
    let front, back, host, a0, a1, hinge;
    if (dir > 0) {
      host = liveR; hinge = 'left'; a0 = 0; a1 = -180;
      oldR.className = oldR.className.replace('book-under', 'leaf-face'); front = oldR;
      back = sp ? newL : blank('left');
      if (sp) { place(oldL, liveL); under.push(oldL); }
    } else if (sp) {
      host = liveL; hinge = 'right'; a0 = 0; a1 = 180;
      oldL.className = oldL.className.replace('book-under', 'leaf-face'); front = oldL; back = newR;
      place(oldR, liveR); under.push(oldR);
    } else {
      host = liveR; hinge = 'left'; a0 = -180; a1 = 0;
      front = newR; back = blank('left');
      place(oldR, liveR); under.push(oldR);
    }
    front.classList.add('leaf-front'); back.classList.add('leaf-back');
    const fs = document.createElement('i'), bs = document.createElement('i');
    fs.className = bs.className = 'leaf-shade';
    front.append(fs); back.append(bs);
    leaf.className = `book-leaf hinge-${hinge}`;
    leaf.append(front, back);
    place(leaf, host); place(cast, host);
    cast.style.transformOrigin = hinge;
    if (hinge === 'right') cast.style.background = 'linear-gradient(270deg, rgba(40,25,10,.30), rgba(40,25,10,0) 45%)';
    under.forEach((u) => block.append(u));
    block.append(cast, leaf);

    const anims = [];
    const angle = (p) => a0 + (a1 - a0) * p;
    const dur = sp ? FULL.spread : FULL.single;
    const shade = (p) => ({ f: p < 0.5 ? p * 2 * 0.55 : 0, b: p > 0.5 ? (1 - p) * 2 * 0.55 : 0, c: Math.sin(Math.PI * p) * 0.6 });
    const set = (p) => {
      leaf.style.transform = `rotateY(${angle(p)}deg)`;
      const s = shade(p); fs.style.opacity = s.f; bs.style.opacity = s.b; cast.style.opacity = s.c;
    };
    set(0);
    const ctx = {
      reduced: false, p: 0, raf: 0, ended: false, dir, dur, set,
      end() {
        if (ctx.ended) return;
        ctx.ended = true; cancelAnimationFrame(ctx.raf);
        anims.forEach((a) => { try { a.cancel(); } catch { /* gone */ } });
        leaf.remove(); cast.remove(); under.forEach((u) => u.remove());
        if (cur === ctx) cur = null;
        ctx.resolve && ctx.resolve();
      },
      // Animate the leaf from progress p0 to p1 (ms long) and resolve when it lands.
      run(p0, p1, ms) {
        return new Promise((resolve) => {
          const keys = (fn, n = 8) => Array.from({ length: n + 1 }, (_, k) => ({ opacity: fn(p0 + (p1 - p0) * (k / n)), offset: k / n }));
          const opts = { duration: ms, easing: EASE, fill: 'forwards' };
          const lead = leaf.animate([{ transform: `rotateY(${angle(p0)}deg)` }, { transform: `rotateY(${angle(p1)}deg)` }], opts);
          anims.push(lead,
            fs.animate(keys((p) => shade(p).f), opts), bs.animate(keys((p) => shade(p).b), opts), cast.animate(keys((p) => shade(p).c), opts));
          lead.onfinish = resolve; lead.oncancel = resolve;
        });
      },
    };
    cur = ctx;
    return ctx;
  }

  return {
    get busy() { return !!cur; },
    finish() { if (cur) cur.end(); },
    cleanup() { if (cur) cur.end(); },

    async turn(dir, renderTarget) {
      const ctx = setup(dir, renderTarget);
      if (ctx.reduced) {
        const anims = ctx.layers.map((l) => l.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-out', fill: 'forwards' }));
        ctx.end = () => { ctx.layers.forEach((l) => l.remove()); if (cur === ctx) cur = null; };
        await Promise.all(anims.map((a) => a.finished.catch(() => {})));
        ctx.end();
        return;
      }
      await ctx.run(0, 1, ctx.dur);
      ctx.end();
    },

    // A finger drag: move(k) follows the finger; release(commit, renderBack) lets the leaf land or springs it back.
    drag(dir, renderTarget) {
      const ctx = setup(dir, renderTarget);
      let k = 0;
      if (ctx.reduced) { ctx.end = () => { ctx.layers.forEach((l) => l.remove()); if (cur === ctx) cur = null; }; }
      return {
        move(next) {
          k = clamp01(next);
          if (ctx.reduced || ctx.raf || ctx.ended) return;
          ctx.raf = requestAnimationFrame(() => { ctx.raf = 0; if (!ctx.ended) ctx.set(k); });
        },
        async release(commit, renderBack) {
          if (ctx.reduced) { if (!commit && renderBack) renderBack(); ctx.end(); return; }
          cancelAnimationFrame(ctx.raf); ctx.raf = 0;
          if (commit) { await ctx.run(k, 1, Math.max(120, (1 - k) * ctx.dur)); }
          else { await ctx.run(k, 0, Math.max(120, k * ctx.dur)); if (renderBack) renderBack(); }
          ctx.end();
        },
      };
    },
  };
}
