// Easter egg: Fishing with Pip (docs/NEXT.md item 8). Three quick taps on a river on the 3D Home open this screen; js/screens/home3d.js
// loads this module with import() on the third tap and it is NOT in the service worker's precache (it is cached on first use).
// Pip sits on the riverbank with a rod; letter fish (only sounds the child has learned) swim slowly across a simple 2D river.
// A card names the sound to catch: the grown-up's recorded clip, or the "Say: mmm" prompt (never the phone's voice, js/components/say-sound.js).
// Tap the matching fish and it is reeled in with a splash into Pip's bucket; a different fish only wiggles (no cross, no penalty, no
// timer). Five catches fill the bucket: Pip cheers, then "Fish again" or back to the railway.
// DOM and SVG with CSS transforms; finite Web Animations (a fish's crossing restarts on its end event, never from a frame loop; after
// 2 minutes without a touch the fish stay where they are); reduced motion: the fish hold still and the catch is instant.
// It is not a lesson, never required, and records no progress (nothing here writes to the store).
import { h, animate, reduced, icon } from '../dom.js';
import { glyphSvg, hasGlyph } from '../glyphs.js';
import { pipSvg } from '../art/pip.js';
import { saySound } from '../components/say-sound.js';
import { accentOf } from '../theme.js';
import { sfx } from '../sfx.js';

const NFISH = 5, CATCHES = 5, PARK_MS = 2 * 60 * 1000;

// The sounds the child has learned: those of every lesson that counts as done (earlier lessons count once a later one is finished).
export function learnedSounds(ctx) {
  const out = [];
  for (const l of ctx.curriculum.lessons) if (ctx.store.isDone(l.number) && l.sound && !out.includes(l.sound)) out.push(l.sound);
  return out;
}

const CSS = `
.fishing { position: fixed; inset: 0; overflow: hidden; background: linear-gradient(#BFE6FF 0, #E8F6FF 38%, #FFF8EC 100%); color: var(--ink, #1E2140); touch-action: manipulation; --bank: clamp(112px, 24vh, 190px); --pip: clamp(84px, 17vh, 130px); }
.fishing * { box-sizing: border-box; }
.fish-top { position: absolute; z-index: 5; left: 0; right: 0; top: 0; display: flex; align-items: center; gap: 4px; padding: 8px 10px 0 4px; }
.fish-card { flex: 1 1 0; width: 0; min-width: 0; overflow: hidden; display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 18px; padding: 6px 8px 6px 10px; box-shadow: 0 2px 10px rgba(30,33,64,.14); min-height: 64px; }
.fish-card .fish-letter { flex: 0 0 auto; width: 52px; height: 52px; display: grid; place-items: center; border-radius: 14px; background: var(--cream, #FFF8EC); padding: 6px; }
.fish-card .fish-letter svg { width: 100%; height: 100%; }
.fish-card .fish-words { flex: 1; min-width: 0; display: grid; gap: 2px; }
.fish-card .fish-say { font-weight: 800; font-size: 16px; line-height: 1.2; }
.fish-card .fish-hint { font-size: 14px; line-height: 1.25; color: var(--muted, #6E7391); }
.fish-card .icon-btn { flex: 0 0 auto; width: 48px; height: 48px; background: rgba(108,92,231,.1); }
.fish-river { position: absolute; left: 0; right: 0; top: 88px; bottom: calc(var(--bank) - 14px); overflow: hidden; background: repeating-linear-gradient(172deg, #6FD0FB 0 26px, #5AC8FA 26px 52px); border-top: 5px solid #B9E9FF; }
.fish-river::after { content: ""; position: absolute; inset: 0; background: linear-gradient(rgba(255,255,255,.28), transparent 30%, rgba(30,70,120,.12)); pointer-events: none; }
.fish-lane { position: absolute; left: 0; width: calc(100% + 152px); margin-left: -76px; height: 60px; pointer-events: none; }
.fish-btn { position: absolute; left: 0; top: 0; pointer-events: auto; width: 84px; height: 56px; padding: 0; border: 0; background: transparent; cursor: pointer; display: block; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.fish-btn:focus-visible { outline: 3px solid var(--ink, #1E2140); outline-offset: 2px; border-radius: 14px; }
.fish-btn svg.fish-body { width: 100%; height: 100%; display: block; overflow: visible; }
.fish-btn .fish-glyph { position: absolute; left: 30px; top: 12px; width: 34px; height: 32px; display: grid; place-items: center; pointer-events: none; }
.fish-btn .fish-glyph svg { width: 100%; height: 100%; }
.fish-btn .fish-glyph.is-text { font-weight: 800; font-size: 20px; line-height: 1; }
.fish-bank { position: absolute; left: 0; right: 0; bottom: 0; height: var(--bank); background: linear-gradient(#4BDC96, #2FB37A); border-top: 6px solid #7FE8B4; display: flex; align-items: flex-end; gap: 22px; padding: 0 0 8px 7%; }
.fish-pip { position: relative; flex: 0 0 auto; width: var(--pip); margin-top: calc(var(--pip) * -0.42); }
.fish-pip svg.pip { width: 100%; height: auto; display: block; }
.fish-rod { position: absolute; left: 86%; top: 49%; width: 5px; height: calc(var(--pip) * 1.45); margin-top: calc(var(--pip) * -1.45); background: #8C5A32; border-radius: 3px; transform-origin: 50% 100%; transform: rotate(26deg); }
.fish-tip { position: absolute; left: -2px; top: -2px; width: 9px; height: 9px; border-radius: 50%; background: #E5484D; }
.fish-bucket { position: relative; flex: 0 0 auto; width: 84px; height: 66px; margin-bottom: 4px; }
.fish-bucket .rim { position: absolute; left: 0; right: 0; top: 0; height: 14px; border-radius: 8px; background: #6E7391; }
.fish-bucket .pail { position: absolute; left: 6px; right: 6px; top: 8px; bottom: 0; border-radius: 6px 6px 14px 14px; background: linear-gradient(#9AA0C2, #6E7391); display: flex; flex-wrap: wrap; align-content: flex-end; justify-content: center; gap: 2px; padding: 4px; overflow: hidden; }
.fish-bucket .pail i { display: block; width: 22px; height: 13px; border-radius: 50% 40% 40% 50%; background: var(--c, #FFB020); border: 2px solid rgba(255,255,255,.55); }
.fish-fx { position: absolute; inset: 0; z-index: 4; pointer-events: none; }
.fish-line { position: absolute; width: 3px; background: #fff; border-radius: 2px; transform-origin: 50% 0; box-shadow: 0 0 0 1px rgba(30,33,64,.25); }
.fish-splash { position: absolute; width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 50%; border: 4px solid #fff; }
.fish-dot { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; }
.fish-end { position: absolute; inset: 0; z-index: 8; display: grid; place-items: center; padding: 16px; background: rgba(30,33,64,.28); }
.fish-end[hidden] { display: none; }
.fish-end .box { background: #fff; border-radius: 24px; padding: 18px 20px; display: grid; gap: 12px; justify-items: center; text-align: center; max-width: 340px; box-shadow: 0 8px 28px rgba(30,33,64,.3); }
.fish-end h2 { font-size: 22px; }
.fish-end .btns { display: grid; gap: 10px; width: 100%; }
.fish-end .btn { min-height: 52px; }
`;

export function fishingScreen(ctx) {
  const { router, curriculum } = ctx;
  const sounds = curriculum.sounds;
  const learned = learnedSounds(ctx).filter((k) => sounds[k]);
  const still = reduced();
  let dead = false, busy = false, count = 0, round = 0, target = null, lastTouch = performance.now();
  const fish = new Set(), parked = new Set();

  const style = h('style', {}); style.textContent = CSS;
  const back = h('button', { class: 'icon-btn fish-back', type: 'button', 'aria-label': 'Back to the railway', onclick: () => router.go('/home') }, icon('back', 28));
  const root = h('div', { class: 'fishing', role: 'region', 'aria-label': 'Fishing with Pip' }, style);

  if (!learned.length) {
    // nothing learned yet: no fish, a friendly note and the way back
    root.append(h('div', { class: 'fish-top' }, back),
      h('div', { class: 'fish-end empty' }, h('div', { class: 'box' }, pipSvg({ pose: 'wave', still: true }), h('h2', {}, 'Pip is packing the bucket!'), h('p', {}, 'Finish a first lesson, then come fishing with the letters you know.'),
        h('div', { class: 'btns' }, h('button', { class: 'btn primary', type: 'button', onclick: () => router.go('/home') }, 'Back to the railway')))));
    root.cleanup = () => {};
    return root;
  }

  // ---- the card ----
  const letterBox = h('div', { class: 'fish-letter' });
  const hint = h('div', { class: 'fish-hint' });
  const card = h('div', { class: 'fish-card', role: 'status' }, letterBox, h('div', { class: 'fish-words' }, h('div', { class: 'fish-say' }, 'Say it, then catch it!'), hint),
    h('button', { class: 'icon-btn fish-replay', type: 'button', 'aria-label': 'Hear the sound again', onclick: () => ask() }, icon('speaker', 26)));
  const prompt = { show: (t) => { hint.textContent = t; }, hide: () => { hint.textContent = 'Catch the fish that says this.'; } };

  // ---- the scene ----
  const river = h('div', { class: 'fish-river', 'aria-label': 'The river' });
  const fx = h('div', { class: 'fish-fx', 'aria-hidden': 'true' });
  const pipBox = h('div', { class: 'fish-pip' }, pipSvg({ pose: 'idle', still: true }), h('div', { class: 'fish-rod' }, h('div', { class: 'fish-tip' })));
  const tip = pipBox.querySelector('.fish-tip');
  const pail = h('div', { class: 'pail' });
  const bucket = h('div', { class: 'fish-bucket', role: 'img', 'aria-label': 'Pip\'s bucket, 0 of 5 fish', dataset: { count: '0' } }, h('div', { class: 'rim' }), pail);
  const bank = h('div', { class: 'fish-bank' }, pipBox, bucket);
  const endBox = h('div', { class: 'box' });
  const end = h('div', { class: 'fish-end', hidden: true }, endBox);
  root.append(h('div', { class: 'fish-top' }, back, card), river, bank, fx, end);

  const setPose = (pose) => { pipBox.querySelector('svg.pip').replaceWith(pipSvg({ pose, still: true })); };
  const anim = (el, kf, opts) => animate(el, kf, { easing: 'ease-in-out', fill: 'forwards', ...opts }).finished.catch(() => {});
  const at = (el) => { const r = el.getBoundingClientRect(), o = root.getBoundingClientRect(); return { x: r.left + r.width / 2 - o.left, y: r.top + r.height / 2 - o.top }; };

  // ---- fish ----
  const laneCount = NFISH;
  const free = () => { for (let i = 0; i < laneCount; i++) if (![...fish].some((f) => f.lane === i)) return i; return -1; };
  function makeFish(sound, lane, p) {
    const col = accentOf(sound);
    const glyph = hasGlyph(sound) ? h('div', { class: 'fish-glyph' }, glyphSvg(sound, { color: '#1E2140', label: sound })) : h('div', { class: 'fish-glyph is-text' }, sound);
    const body = h('svg', { class: 'fish-body', viewBox: '0 0 84 56', 'aria-hidden': 'true' },
      h('polygon', { points: '3,12 24,28 3,44', fill: col, opacity: 0.9 }),
      h('ellipse', { cx: 48, cy: 28, rx: 32, ry: 22, fill: col }),
      h('ellipse', { cx: 48, cy: 28, rx: 20, ry: 17, fill: '#FFF8EC' }),
      h('circle', { cx: 71, cy: 21, r: 4, fill: '#fff' }), h('circle', { cx: 72, cy: 21, r: 2, fill: '#1E2140' }));
    const btn = h('button', { class: 'fish-btn', type: 'button', 'aria-label': `Fish with the letter ${sound}`, dataset: { sound }, onclick: () => pick(f) }, body, glyph);
    const lane_ = h('div', { class: 'fish-lane', style: { top: `${3 + lane * (66 / (laneCount - 1))}%` } }, btn);
    const f = { sound, lane, el: lane_, btn, anim: null };
    river.append(lane_);
    fish.add(f);
    if (still) lane_.style.transform = `translateX(${Math.round(p * 100)}%)`;
    else swim(f, p);
    return f;
  }
  // one crossing from the left edge to the right edge; its end event starts the next (no frame loop)
  function swim(f, p = 0) {
    const dur = 24000 + ((f.lane * 3700) % 9000);
    f.anim = f.el.animate([{ transform: 'translateX(0%)' }, { transform: 'translateX(100%)' }], { duration: dur, easing: 'linear', fill: 'forwards' });
    f.anim.currentTime = dur * p;
    f.anim.onfinish = () => {
      if (dead || !fish.has(f)) return;
      if (performance.now() - lastTouch > PARK_MS) { parked.add(f); return; } // the fish stay where they are until the next touch
      swim(f, 0);
    };
  }
  const wake = () => {
    lastTouch = performance.now();
    for (const f of [...parked]) { parked.delete(f); if (fish.has(f)) swim(f, 0); }
  };
  root.addEventListener('pointerdown', wake, true);

  function deal() {
    // five fish: the target among them, and (when two or more sounds are known) at least one other
    const others = learned.filter((k) => k !== target);
    const picks = [target];
    while (picks.length < NFISH) picks.push(others.length ? others[Math.floor(Math.random() * others.length)] : target);
    for (let i = picks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [picks[i], picks[j]] = [picks[j], picks[i]]; }
    return picks;
  }
  function newTarget() {
    const pool = learned.length > 1 ? learned.filter((k) => k !== target) : learned;
    target = pool[Math.floor(Math.random() * pool.length)];
    round++;
    letterBox.replaceChildren(hasGlyph(target) ? glyphSvg(target, { color: accentOf(target), label: target }) : h('span', { class: 'fish-glyph is-text' }, target));
    card.dataset.target = target;
    ask();
  }
  function ask() { const my = round; return saySound(ctx, target, prompt, { stale: () => dead || my !== round }); }

  function start() {
    for (const f of [...fish]) { f.anim && f.anim.cancel(); f.el.remove(); fish.delete(f); }
    parked.clear();
    count = 0; pail.replaceChildren(); bucket.dataset.count = '0'; bucket.setAttribute('aria-label', 'Pip\'s bucket, 0 of 5 fish');
    end.hidden = true; setPose('idle'); busy = false;
    newTarget();
    deal().forEach((s, i) => makeFish(s, i, 0.06 + (i / NFISH) * 0.8 + (i % 2) * 0.02));
  }

  // ---- a tap on a fish ----
  async function pick(f) {
    wake();
    if (busy || dead || !fish.has(f)) return;
    if (f.sound !== target) { // a wrong fish only wiggles and swims on
      anim(f.btn, [{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg)', offset: 0.25 }, { transform: 'rotate(8deg)', offset: 0.55 }, { transform: 'rotate(-4deg)', offset: 0.8 }, { transform: 'rotate(0)' }], { duration: 520, fill: 'none' });
      return;
    }
    busy = true;
    const mine = round;
    f.anim && f.anim.pause();
    f.btn.disabled = true;
    setPose('point');
    const a = at(tip), b = at(f.btn), bk = at(bucket);
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI - 90;
    const line = h('div', { class: 'fish-line', style: { left: `${a.x - 1.5}px`, top: `${a.y}px`, height: `${len}px`, transform: `rotate(${ang}deg)` } });
    fx.append(line);
    await anim(line, [{ transform: `rotate(${ang}deg) scaleY(0)` }, { transform: `rotate(${ang}deg) scaleY(1)` }], { duration: 320, fill: 'forwards' });
    if (dead) return;
    splash(b.x, b.y);
    sfx.play('sparkle');
    const mx = (b.x + bk.x) / 2, up = Math.min(90, Math.abs(bk.y - b.y) + 60);
    await Promise.all([
      anim(f.btn, [{ transform: 'translate(0,0) rotate(0) scale(1)' }, { transform: `translate(${mx - b.x}px, ${-up}px) rotate(-20deg) scale(.9)`, offset: 0.5 }, { transform: `translate(${bk.x - b.x}px, ${bk.y - b.y - 6}px) rotate(10deg) scale(.5)` }], { duration: 760, fill: 'forwards' }),
      anim(line, [{ transform: `rotate(${ang}deg) scaleY(1)`, opacity: 1 }, { transform: `rotate(${ang}deg) scaleY(.15)`, opacity: 0.9 }], { duration: 760, fill: 'forwards' }),
    ]);
    if (dead) return;
    line.remove();
    splash(bk.x, bk.y - 10, 0.6);
    f.anim && f.anim.cancel(); f.el.remove(); fish.delete(f);
    count++;
    pail.append(h('i', { style: { '--c': accentOf(f.sound) } }));
    bucket.dataset.count = String(count);
    bucket.setAttribute('aria-label', `Pip's bucket, ${count} of ${CATCHES} fish`);
    anim(bucket, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 380, fill: 'none' });
    setPose('idle');
    if (count >= CATCHES) { celebrate(); return; }
    if (mine !== round) return;
    newTarget();
    // the fish in the river keep swimming; the one that left is replaced, and the new card's fish is added if it is not there
    if (![...fish].some((g) => g.sound === target)) { const victim = [...fish].find((g) => g.sound !== target); if (victim) { victim.anim && victim.anim.cancel(); victim.el.remove(); fish.delete(victim); } makeFish(target, free(), 0); }
    while (fish.size < NFISH) makeFish(learned[Math.floor(Math.random() * learned.length)], free(), 0);
    busy = false;
  }

  function splash(x, y, k = 1) {
    const ring = h('div', { class: 'fish-splash', style: { left: `${x}px`, top: `${y}px` } });
    fx.append(ring);
    anim(ring, [{ transform: 'scale(.3)', opacity: 1 }, { transform: `scale(${1.7 * k})`, opacity: 0 }], { duration: 620, fill: 'forwards' }).then(() => ring.remove());
    if (still) return;
    for (let i = 0; i < 6; i++) {
      const d = h('div', { class: 'fish-dot', style: { left: `${x}px`, top: `${y}px`, background: i % 2 ? '#fff' : '#9BDDFB' } });
      fx.append(d);
      const a = (i / 6) * Math.PI * 2, r = 30 * k + 10;
      anim(d, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r - 16}px) scale(.3)`, opacity: 0 }], { duration: 640, fill: 'forwards' }).then(() => d.remove());
    }
  }

  function celebrate() {
    busy = true;
    setPose('cheer');
    sfx.play('win');
    const r = bucket.getBoundingClientRect(), o = root.getBoundingClientRect();
    for (let i = 0; i < 3; i++) setTimeout(() => { if (!dead) splash(r.left - o.left + 14 + i * 28, r.top - o.top + 8, 1.1); }, i * 160);
    endBox.replaceChildren(h('h2', {}, 'You caught five fish!'), pipSvg({ pose: 'cheer', still: true }),
      h('div', { class: 'btns' },
        h('button', { class: 'btn primary fish-again', type: 'button', onclick: () => start() }, 'Fish again'),
        h('button', { class: 'btn fish-home', type: 'button', onclick: () => router.go('/home') }, 'Back to the railway')));
    endBox.querySelector('svg.pip').style.width = '84px';
    setTimeout(() => { if (!dead) end.hidden = false; }, still ? 0 : 700);
  }

  start();
  root.cleanup = () => {
    dead = true;
    for (const f of fish) f.anim && f.anim.cancel();
    root.removeEventListener('pointerdown', wake, true);
    ctx.speech && ctx.speech.cancel();
  };
  return root;
}
