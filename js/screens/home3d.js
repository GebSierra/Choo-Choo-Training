// The 3D railway Home (round 4, docs/TRAIN-WORLD.md section 4). The line is built from curriculum.json: a station for each
// lesson and a goods depot for each checkpoint, in the same order as the 2D path. The child's train waits at the
// current stop with one wagon per completed lesson; after a lesson is completed it chugs there from the stop before.
// Rendering happens on demand: only while the camera or the train moves, or (at most 24 times a second, and never with
// reduced motion) for Pip's idle life, the clouds and the current sign's glow. Leaving Home disposes everything.
//
//   home3dScreen(ctx, { canvas, gl, soft }) -> element, or throws (the caller falls back to the 2D map).
import { makeBag, makeLine } from '../train/world.js';
import { createRenderer, createScene } from '../train/scene.js';
import { buildTrack } from '../train/track.js';
import { buildScenery } from '../train/scenery.js';
import { buildStop } from '../train/stations.js';
import { buildTrain } from '../train/train.js';
import { createRig } from '../train/camera.js';
import { createOverlay } from '../train/overlay.js';
import { h, animate, reduced } from '../dom.js';
import { holdButton } from '../components/hold-button.js';
import { fullscreenButton } from '../components/fullscreen-button.js';
import { welcomeCard } from '../components/welcome-card.js';
import { WELCOME } from '../guide.js';
import { accentOf } from '../theme.js';
import { sfx } from '../sfx.js';

const ARRIVE_MS = 2400, TAP_SLOP = 8, IDLE_FPS = 24;
const ENGINE_AT = 0.7; // the engine's middle stands this far past its stop's middle, so Pip's cab is by the platform

// The stops in order and which one the train is at, by the same rules as the 2D path (js/screens/home.js).
export function stopsOf(curriculum, store) {
  const total = curriculum.lessons.length;
  const current = store.currentLesson(total);
  const cks = curriculum.checkpoints || [];
  const pending = cks.find((k) => !store.isCheckpointDone(k.id) && store.isCheckpointUnlocked(k));
  const nodes = curriculum.lessons.flatMap((l) => [{ lesson: l }, ...cks.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
  let currentIndex = -1;
  const stops = nodes.map((n, i) => {
    if (n.checkpoint) {
      const c = n.checkpoint;
      const state = store.isCheckpointDone(c.id) ? 'done' : !store.isCheckpointUnlocked(c) ? 'locked' : current === null && pending && pending.id === c.id ? 'current' : 'open';
      if (state === 'current') currentIndex = i;
      return { kind: 'depot', checkpoint: c, state, title: c.title };
    }
    const l = n.lesson;
    const state = store.isDone(l.number) ? 'done' : !store.isUnlocked(l.number) ? 'locked' : l.number === current ? 'current' : 'open';
    if (l.number === current) currentIndex = i;
    return { kind: 'lesson', lesson: l, number: l.number, glyph: l.sound, accent: accentOf(l.sound), state };
  });
  if (currentIndex < 0) currentIndex = stops.length - 1;
  return { stops, currentIndex };
}

export function home3dScreen(ctx, { canvas, gl, soft = false }) {
  const { store, router, curriculum, speech } = ctx;
  const bag = makeBag();
  const { stops, currentIndex } = stopsOf(curriculum, store);
  const line = makeLine(stops.length);
  const stopS = stops.map((_, i) => line.stop(i));
  const renderer = createRenderer(canvas, gl, soft);
  const { scene, camera, aimLight } = createScene(soft);
  const idleFps = soft ? 8 : IDLE_FPS;
  scene.add(buildTrack(bag, line));
  const scenery = buildScenery(bag, line, stopS);
  scene.add(scenery.group, scenery.clouds);
  const built = stops.map((s, i) => { const b = buildStop(bag, line, s, stopS[i], s.state); scene.add(b.group); return b; });
  const doneLessons = curriculum.lessons.filter((l) => store.isDone(l.number));
  const train = buildTrain(bag, line, doneLessons.map((l) => ({ glyph: l.sound, accent: accentOf(l.sound) })));
  scene.add(train.group);

  // ---- where the train comes from ----
  const settings = store.settings;
  const lastAt = Number.isInteger(settings.trainAt) ? settings.trainAt : null;
  let prevLesson = -1;
  for (let i = currentIndex - 1; i >= 0; i--) if (stops[i].kind === 'lesson') { prevLesson = i; break; }
  const arriving = lastAt !== null && lastAt < currentIndex && prevLesson >= 0;
  const fromIndex = arriving ? Math.max(lastAt, prevLesson) : currentIndex;
  if (settings.trainAt !== currentIndex) store.setSetting('trainAt', currentIndex);
  const restS = (i) => stopS[i] + ENGINE_AT;
  train.place(restS(fromIndex));

  // ---- the camera ----
  const min = stopS[0] - 2, max = stopS[stopS.length - 1] + 1;
  const rig = createRig(camera, line, { min, max });
  const firstVisit = !settings.trainIntroDone;
  if (firstVisit) store.setSetting('trainIntroDone', true);
  const glideIn = firstVisit && currentIndex > 0 && !reduced();
  rig.jump(glideIn ? min : stopS[arriving ? fromIndex : currentIndex]);

  // ---- the overlay: the real buttons ----
  let downAt = null, dragged = false, lastMove = 0;
  const wobbles = new Map(); // sign wobble on a locked tap: index -> start time
  const tap = (fn) => (btn, e) => { if (dragged) { dragged = false; return; } fn(btn, e); };
  const overlayStops = stops.map((s, i) => {
    const name = s.kind === 'lesson' ? `Lesson ${s.number}` : s.title;
    const cls = s.kind === 'lesson' ? (s.state === 'open' ? 'current' : s.state) : (s.state === 'open' ? 'unlocked' : s.state);
    return {
      kind: s.kind, cls, anchor: built[i].sign,
      label: `${name}${s.state === 'locked' ? ', locked' : s.state === 'done' ? ', done' : ''}`,
      onTap: tap(() => {
        if (s.state === 'locked') { wobbles.set(i, performance.now()); wake(); return; }
        router.go(s.kind === 'lesson' ? `/lesson/${s.number}` : `/checkpoint/${s.checkpoint.id}`);
      }),
    };
  });
  const overlay = createOverlay(overlayStops, { bubbleIndex: stops[currentIndex].state === 'current' ? currentIndex : -1, onBubble: () => speech.say([{ tts: 'Tap to start' }]) });
  // Keyboard focus on a stop brings it into view.
  overlay.buttons.forEach((b, i) => b.addEventListener('focus', () => { if (b.dataset.shown !== '1') { rig.glideTo(stopS[i], 700, performance.now()); wake(); } }));

  const grown = holdButton({ label: 'Grownups · hold', caption: null, hint: 'Press and hold', className: 'pill-hold', onComplete: () => { ctx.gate = { openedAt: Date.now() }; router.go('/grownups'); } });
  const fs = fullscreenButton({ className: 'home-fs' });
  canvas.classList.add('train-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const root = h('div', { class: 'home home3d', role: 'region', 'aria-label': 'The railway of lessons', dataset: { renderer: 'webgl' } }, canvas, overlay.layer, h('div', { class: 'home-top' }, grown), ...(fs ? [fs] : []));

  if (!store.state.firstRunDone) {
    const done = () => { store.setFirstRunDone(); animate(card, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).finished.then(() => card.remove()); };
    const card = h('div', { class: 'first-run', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Welcome' }, welcomeCard({ pages: WELCOME, onDone: done }));
    root.append(card);
    animate(card.firstChild, [{ opacity: 0, transform: 'translateY(16px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 500, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }

  // ---- state shown to tests (read only) ----
  const debug = { stopS, engineAt: ENGINE_AT, frames: 0, idleFrames: 0, trainS: train.at, focus: rig.focus, arriving, fromIndex, currentIndex, tootAt: null, running: false, disposed: false, glideIn, reduced: reduced(), soft };
  // Brings stop i into view (keyboard focus does the same for a stop that is on screen); tests use it to reach a stop.
  debug.show = (i) => { rig.jump(stopS[Math.max(0, Math.min(stopS.length - 1, i))]); render(); wake(); };
  root.__train = debug;
  window.__train = debug;

  // ---- the loop ----
  let raf = 0, idleTimer = 0, last = 0, disposed = false, W = 0, H = 0, blockers = [];
  // The Grownups pill and the full screen button, with a margin: no stop button or bubble goes under them.
  const measureBlockers = () => { const o = root.getBoundingClientRect(); blockers = [...root.querySelectorAll('.home-top .hold-btn, .home-fs')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x - o.x - 6, y: r.y - o.y - 6, w: r.width + 12, h: r.height + 12 }; }); };
  const t0 = performance.now();
  let arrival = null, waveUntil = 0;
  const still = reduced();

  function render() {
    if (disposed || !W) return;
    aimLight(rig.look.x, rig.look.z);
    scenery.clouds.position.set(rig.look.x, 0, rig.look.z);
    renderer.render(scene, camera);
    overlay.update(camera, W, H, blockers);
    debug.frames++; debug.calls = renderer.info.render.calls; debug.tris = renderer.info.render.triangles;
    debug.trainS = train.at; debug.focus = rig.focus;
  }

  function step(dt, now) {
    const t = (now - t0) / 1000;
    let busy = rig.update(dt, now);
    if (arrival) {
      const k = Math.min(1, Math.max(0, (now - arrival.start) / ARRIVE_MS));
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const s = arrival.from + (arrival.to - arrival.from) * e;
      train.roll(s - train.at);
      train.place(s, t);
      if (t - arrival.lastPuff > 0.5 && k < 1) { train.puff(t); arrival.lastPuff = t; }
      if (k >= 1) {
        arrival = null;
        debug.tootAt = performance.now();
        sfx.play('toot');
        train.pip.wave(true, t); train.pip.lean(1);
        waveUntil = t + 2.6;
      }
      busy = true;
    }
    if (train.steam(t)) busy = true;
    if (waveUntil && t > waveUntil) { waveUntil = 0; train.pip.wave(false); train.pip.lean(0); }
    // the idle life: Pip, the clouds, the current sign (never with reduced motion)
    if (!still) {
      train.pip.tick(t);
      scenery.clouds.children.forEach((c) => { c.position.x = c.userData.base + Math.sin(t * 0.07 + c.userData.phase) * 1.6; });
      const cur = built[currentIndex];
      if (cur && stops[currentIndex].state === 'current') { cur.faceMat.emissiveIntensity = 0.16 + 0.12 * Math.sin(t * 2.2); cur.sign.position.y = 2.75 + Math.sin(t * 1.8) * 0.045; }
      if (waveUntil) busy = true;
    } else train.pip.tick(t, true);
    for (const [i, start] of wobbles) {
      const k = (now - start) / 320;
      built[i].sign.rotation.z = k >= 1 ? 0 : Math.sin(k * Math.PI * 3) * 0.12 * (1 - k);
      if (k >= 1) wobbles.delete(i); else busy = true;
    }
    return busy;
  }

  function frame(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); // rAF time can be a little behind performance.now()
    last = now;
    const busy = step(dt, now);
    render();
    debug.running = busy;
    if (busy) wake(); else idle();
  }
  function wake() {
    if (disposed || document.hidden || raf) return;
    clearTimeout(idleTimer); idleTimer = 0;
    if (!debug.running) last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  // Between movements: one frame every 1/24 s for the idle life, or nothing at all with reduced motion.
  function idle() {
    clearTimeout(idleTimer);
    if (still || disposed || document.hidden) return;
    idleTimer = setTimeout(() => { idleTimer = 0; debug.idleFrames++; if (!raf) { raf = requestAnimationFrame(frame); } }, 1000 / idleFps);
  }

  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; clearTimeout(idleTimer); idleTimer = 0; debug.running = false; }
    else { last = performance.now(); wake(); }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ---- size ----
  const ro = new ResizeObserver(() => {
    const r = root.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width; H = r.height;
    renderer.setSize(W, H, false);
    measureBlockers();
    rig.frame(W, H);
    render();
    wake();
  });
  ro.observe(root);

  // ---- one finger drags the camera along the line ----
  let pointer = null;
  const onDown = (e) => {
    if (pointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('.home-top, .home-fs, .first-run, .bubble')) return;
    pointer = e.pointerId; downAt = [e.clientX, e.clientY]; dragged = false; lastMove = performance.now();
  };
  const onMove = (e) => {
    if (e.pointerId !== pointer || !downAt) return;
    const dx = e.clientX - downAt[0], dy = e.clientY - downAt[1];
    if (!dragged && Math.hypot(dx, dy) > TAP_SLOP) { dragged = true; rig.dragStart(); downAt = [e.clientX, e.clientY]; return; }
    if (!dragged) return;
    const now = performance.now();
    rig.dragMove(e.clientY - downAt[1], (now - lastMove) / 1000);
    downAt = [e.clientX, e.clientY]; lastMove = now;
    wake();
  };
  const onUp = (e) => {
    if (e.pointerId !== pointer) return;
    pointer = null; downAt = null;
    if (dragged) { rig.dragEnd(); wake(); setTimeout(() => { dragged = false; }, 0); }
  };
  root.addEventListener('pointerdown', onDown, true);
  addEventListener('pointermove', onMove, true);
  addEventListener('pointerup', onUp, true);
  addEventListener('pointercancel', onUp, true);

  // A lost context (the phone took the GPU away): the 2D path takes over.
  const onLost = (e) => { if (disposed) return; e.preventDefault(); ctx.noTrain = true; queueMicrotask(() => router.go('/home')); };
  canvas.addEventListener('webglcontextlost', onLost);

  // ---- the opening ----
  const startAt = performance.now();
  if (glideIn) {
    setTimeout(() => { if (!disposed) { rig.glideTo(stopS[currentIndex], Math.min(3200, 1200 + currentIndex * 160), performance.now()); wake(); } }, 450);
  }
  if (arriving) {
    if (still) {
      // reduced motion: the train simply appears at the new stop with a short fade
      train.place(restS(currentIndex));
      rig.jump(stopS[currentIndex]);
      train.setOpacity(0.01);
      const fade = (now) => { if (disposed) return; const k = Math.min(1, (now - startAt) / 300); train.setOpacity(k); render(); if (k < 1) requestAnimationFrame(fade); else { train.setOpacity(1); debug.tootAt = performance.now(); sfx.play('toot'); } };
      requestAnimationFrame(fade);
    } else {
      setTimeout(() => {
        if (disposed) return;
        arrival = { from: restS(fromIndex), to: restS(currentIndex), start: performance.now(), lastPuff: -1 };
        if (doneLessons.length) train.bounceLast((performance.now() - t0) / 1000);
        rig.follow(() => (arrival ? train.at - ENGINE_AT : null));
        wake();
      }, 600);
    }
  } else if (!still) {
    // Pip waves hello when Home opens
    train.pip.wave(true, 0); waveUntil = 2.2;
  }
  debug.running = true;
  wake();

  root.cleanup = () => {
    disposed = true;
    debug.disposed = true;
    cancelAnimationFrame(raf); clearTimeout(idleTimer);
    grown.cleanup && grown.cleanup();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    root.removeEventListener('pointerdown', onDown, true);
    removeEventListener('pointermove', onMove, true);
    removeEventListener('pointerup', onUp, true);
    removeEventListener('pointercancel', onUp, true);
    canvas.removeEventListener('webglcontextlost', onLost);
    scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    bag.dispose();
    renderer.renderLists.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    if (window.__train === debug) delete window.__train;
  };
  return root;
}

