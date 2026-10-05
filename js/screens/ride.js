import { h, animate, reduced } from '../dom.js';
import { wordSvg } from '../glyphs.js';
import { engineSvg, stationSvg, huntBackdrop, puffEl, gaugeSvg, FUNNEL_TOP } from '../art/train2d.js';
import { pipSvg } from '../art/pip.js';
import { slideBlend, placeBand, startSweep } from '../components/slide-blend.js';
import { sparkle } from '../components/sparkle.js';
import { timers, watchSize, starRow } from '../components/game-kit.js';
import { accentOf } from '../theme.js';
import { fit, rideWords } from '../lessons.js';
import { slowSounds } from '../scripts.js';
import { createDetector } from '../blend-detect.js';
import { askPermission, openMic, hasMic } from '../mic.js';
import { sfx } from '../sfx.js';

const INK = '#1E2140';
const TRAIN_W = 116, GOAL_W = 150, LEFT = 6;
const FULL_MS = 1300;   // the whole track at full speed
const RAMP_MS = 120;    // the voice comes on: speed eases in. It never eases out.
const PUFF_MS = 180;    // one puff of steam this often while the voice is on
const WHEEL_PX = 10.8;  // a wheel's radius on screen, for turning it with the distance
const REST = -62, FULL = 62; // the needle's two ends, in degrees

// Smooth Ride, the blending station. The child says the word in one long sound with the grown-up; while the voice stays on the
// engine rolls and puffs steam, and the moment the voice stops the engine and every puff stop dead, on the same frame (no
// braking, no fading). The microphone is read only for loudness, only during a try (at most about 5 s), and is closed
// after each one. Without a microphone, or when the browser's permission is refused, a "Next word" button does the same job.
// The slide-to-blend slider is under the word in both modes. Timings come from the stop's data (js/blend-detect.js).
export function rideBuild({ checkpoint, curriculum, speech, refresh, setProgress, setDone }) {
  const T = timers();
  const words = rideWords(curriculum, checkpoint);
  const rounds = words.length;
  const sounds = curriculum.sounds;
  const cfg = { offHoldMs: checkpoint.offHoldMs, onHoldMs: checkpoint.onHoldMs, gapMs: checkpoint.gapMs, minRunMs: checkpoint.minRunMs, endMs: checkpoint.endMs };
  let round = 0, mode = '', phase = 'idle', msg = '', fails = 0, quietStreak = 0, quietMode = false, disposed = false;
  let W = 0, H = 0, travel = 200, x = 0, rot = 0, speed = 0;
  let mic = null, det = null, raf = 0, lastT = 0, voicedPrev = false, puffAcc = 0, needle = 0, listening = false, edges = [], lit = 0;
  let anims = [], puffAnims = [], blend = null, bandWatch = null, bandEl = null, sweepAnim = null, curWord = words[0];
  window.__rideFrames = [];

  // ---- the scene ----
  const train = h('div', { class: 'ride-train', style: { width: TRAIN_W + 'px' } }, engineSvg({ still: true }));
  const wheels = [...train.querySelectorAll('.wheel')];
  const lamp = h('span', { class: 'ride-lamp', 'aria-hidden': 'true' });
  train.append(lamp);
  const puffs = h('div', { class: 'ride-puffs', 'aria-hidden': 'true' });
  const goal = h('div', { class: 'hunt-goal ride-goal', style: { width: GOAL_W + 'px', height: (GOAL_W * 200) / 240 + 'px' } });
  const wordHost = h('div', { class: 'ride-word' });
  const status = h('p', { class: 'ride-status', 'aria-live': 'polite' });
  const controls = h('div', { class: 'ride-controls' });
  const scene = h('div', { class: 'farm ride-scene' }, huntBackdrop());
  const stars = starRow(rounds);
  scene.append(goal, wordHost, controls, train, puffs);
  const el = h('div', { class: 'game ride-game', dataset: { round: '1', stars: '0', state: 'playing', result: '', mode: '', moving: '0' } }, scene, stars.el);
  const seat = () => train.querySelector('.pip-seat');
  const setPip = (pose) => { const s = seat(), old = s.firstChild, p = pipSvg({ pose, still: true }); for (const k of ['x', 'y', 'width', 'height']) p.setAttribute(k, old.getAttribute(k)); s.replaceChildren(p); };
  const keep = (a) => { anims.push(a); return a; };

  const setX = (px) => { x = px; train.style.transform = `translate3d(${px}px,0,0)`; };
  const turn = (dx) => { rot += (dx / WHEEL_PX) * 57.2958; for (const w of wheels) w.style.transform = `rotate(${rot}deg)`; };
  const setStatus = (t) => { status.textContent = t; };

  // ---- the word, the slider and the station ----
  const letters = () => [...wordHost.querySelectorAll('.glyph-letter')];
  const light = (n) => { if (n === lit) return; lit = n; letters().forEach((g, i) => g.classList.toggle('lit', i < n)); };
  function teardownWord() {
    if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; }
    if (blend) { blend.cleanup(); blend = null; }
    if (bandWatch) { bandWatch.stop(); bandWatch = null; }
    if (bandEl) { bandEl.remove(); bandEl = null; }
  }
  function showWord() {
    teardownWord();
    curWord = words[Math.min(round, rounds - 1)];
    lit = 0;
    const accent = accentOf(curWord[0]);
    const art = wordSvg(curWord, { color: INK, label: curWord });
    art.style.width = `calc(var(--cap, 90px) * ${Number(art.dataset.width) / Number(art.dataset.height)})`;
    art.style.maxWidth = '100%';
    const sweep = h('span', { class: 'sweep', 'aria-hidden': 'true' });
    const row = h('span', { class: 'glyph-row', dataset: { word: curWord } }, art, sweep);
    const bar = h('span', { class: 'blend-bar', 'aria-hidden': 'true' }, h('i'));
    const band = h('span', { class: 'slide-band', 'aria-hidden': 'true' });
    wordHost.replaceChildren(row, bar);
    scene.append(band); bandEl = band;
    blend = slideBlend({ band, svg: art, host: scene, lift: row, bar, accent: null, onTouch: () => { if (sweepAnim) { sweepAnim.cancel(); sweepAnim = null; } }, onTap: () => {} });
    bandWatch = placeBand(band, scene, row);
    sweepAnim = startSweep(sweep);
    goal.replaceChildren(h('span', { class: 'goal-glow', 'aria-hidden': 'true' }), stationSvg({ accent }));
    goal.classList.remove('done', 'arrived');
    el.dataset.round = String(round + 1);
    setX(0); rot = 0; for (const w of wheels) w.style.transform = '';
    refresh();
  }

  function layout(w, hgt) {
    W = w; H = hgt;
    travel = Math.max(60, W - TRAIN_W - 26);
    scene.style.setProperty('--cap', Math.round(Math.max(52, Math.min(104, H * 0.17))) + 'px');
    if (phase === 'idle') setX(Math.min(x, travel));
  }

  // ---- the controls ----
  let gauge = null, goBtn = null, smoothBtn = null;
  const smoothVisible = () => mode === 'tap' || (mode === 'mic' && fails >= 3);
  function paintControls() {
    el.dataset.mode = mode;
    const kids = [];
    if (mode === 'mic') {
      if (!goBtn) {
        goBtn = h('button', { class: 'ride-go', type: 'button', 'aria-label': 'Go', onclick: onGo }, h('span', { class: 'ride-go-label' }, 'Go'));
        gauge = h('div', { class: 'ride-gauge', 'aria-hidden': 'true' }, gaugeSvg());
        scene.append(gauge);
      }
      kids.push(goBtn);
    }
    if (smoothVisible()) {
      if (!smoothBtn) smoothBtn = h('button', { class: 'ride-smooth', type: 'button', onclick: onSmooth }, 'Next word');
      kids.push(smoothBtn);
    }
    controls.replaceChildren(status, h('div', { class: 'ride-buttons' }, ...kids));
    if (goBtn) goBtn.disabled = phase !== 'idle';
    if (smoothBtn) smoothBtn.disabled = phase !== 'idle';
  }
  const setNeedle = (v) => { needle = v; if (gauge) gauge.style.setProperty('--needle', `${REST + (FULL - REST) * v}deg`); };

  // ---- one try ----
  async function onGo() {
    if (phase !== 'idle' || mode !== 'mic') return;
    phase = 'opening'; msg = ''; el.dataset.result = '';
    setStatus('Ready...'); paintControls(); refresh();
    let m;
    try { m = await openMic(); } catch {
      if (disposed) return;
      mode = 'tap'; phase = 'idle'; setStatus(''); paintControls(); refresh(); // no microphone after all: the button does the job
      return;
    }
    if (disposed || phase !== 'opening') { m.close(); return; }
    mic = m;
    det = createDetector({ ...cfg, quiet: quietMode });
    phase = 'trying'; lastT = 0; voicedPrev = false; puffAcc = 0; speed = 0; listening = false;
    const sr = scene.getBoundingClientRect();
    edges = letters().map((g) => g.getBoundingClientRect().left - sr.left);
    raf = requestAnimationFrame(frame);
  }

  function closeMic() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (mic) { mic.close(); mic = null; }
    det = null;
  }

  // The hard cut: speed to zero, the wheels still, every puff gone, the needle at rest, Pip looking back. All on one frame.
  function voiceOff() {
    speed = 0;
    el.dataset.moving = '0';
    puffAnims.forEach((a) => a.cancel()); puffAnims = [];
    puffs.replaceChildren();
    setNeedle(0);
    setPip('point');
  }
  function puff() {
    const r = train.getBoundingClientRect(), o = scene.getBoundingClientRect();
    const p = puffEl();
    Object.assign(p.style, { left: r.left - o.left + r.width * FUNNEL_TOP.x - 12 + 'px', top: r.top - o.top + r.height * FUNNEL_TOP.y - 14 + 'px' });
    puffs.append(p);
    const a = p.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0.9 }, { transform: 'translate(-18px,-36px) scale(1.5)', opacity: 0 }], { duration: 1100, easing: 'ease-out', fill: 'forwards' });
    puffAnims.push(a);
    a.finished.then(() => { p.remove(); puffAnims = puffAnims.filter((q) => q !== a); }).catch(() => p.remove());
  }
  const logFrame = (t, voiced) => {
    const log = window.__rideFrames;
    log.push({ t, voiced, moving: speed > 0, puffs: puffs.childElementCount });
    if (log.length > 600) log.shift();
  };

  function frame(t) {
    raf = 0;
    if (!mic || phase !== 'trying') return;
    const dt = lastT ? Math.max(0, (t - lastT) / 1000) : 0;
    lastT = t;
    const r = det.push(mic.readDb(), t);
    if (r.phase === 'done') { if (voicedPrev) { voiceOff(); voicedPrev = false; } logFrame(t, false); finishTry(r.result); return; }
    if (r.phase === 'listening' && !listening) { listening = true; setStatus('Say it!'); train.classList.add('listening'); }
    if (r.voiced) {
      if (!voicedPrev) { el.dataset.moving = '1'; setPip('idle'); puffAcc = PUFF_MS; }
      const target = 0.45 + 0.55 * r.k;
      speed = speed > target ? target : Math.min(target, speed + (target / (RAMP_MS / 1000)) * dt); // eases in, never out
      const dx = Math.min(speed * (travel / (FULL_MS / 1000)) * dt, Math.max(0, travel * 0.97 - x));
      if (dx > 0) { setX(x + dx); turn(dx); }
      puffAcc += dt * 1000;
      if (puffAcc >= PUFF_MS) { puffAcc = 0; puff(); }
      const front = x + LEFT + TRAIN_W * 0.5;
      light(edges.filter((e) => front >= e).length);
      setNeedle(r.level01 > needle ? needle + (r.level01 - needle) * 0.6 : r.level01); // smooth on the way up only
    } else if (voicedPrev) voiceOff();
    voicedPrev = r.voiced;
    logFrame(t, r.voiced);
    raf = requestAnimationFrame(frame);
  }

  function finishTry(result) {
    closeMic(); // the microphone is closed before anything plays
    listening = false; train.classList.remove('listening'); setStatus('');
    el.dataset.result = result; el.dataset.moving = '0';
    phase = 'result';
    if (result === 'smooth') { fails = 0; quietStreak = 0; T.later(success, 250); return; }
    fails++;
    if (result === 'quiet') { quietStreak++; if (quietStreak >= 2) quietMode = true; } else quietStreak = 0;
    if (result === 'gap') { msg = 'gap'; refresh(); }
    T.later(rollBack, result === 'gap' ? 1200 : 700);
  }

  // After a gap (or a try with no voice) the engine rolls back to the start: a separate, eased glide, clearly after the stop.
  function rollBack() {
    const from = x;
    if (from <= 0) return ready();
    const a = keep(animate(train, [{ transform: `translate3d(${from}px,0,0)` }, { transform: 'translate3d(0,0,0)' }], { duration: 600, easing: 'ease-in-out', fill: 'forwards', delay: 0 }));
    turn(-from * 0.5);
    a.finished.then(() => { a.cancel(); setX(0); light(0); ready(); }).catch(() => {});
  }
  function ready() { phase = 'idle'; setPip('idle'); paintControls(); }

  // ---- the success ----
  function success() {
    phase = 'glide';
    const from = x, d = travel - from;
    const n = letters().length;
    if (d > 0) {
      const a = keep(animate(train, [{ transform: `translate3d(${from}px,0,0)` }, { transform: `translate3d(${travel}px,0,0)` }], { duration: 700, easing: 'ease-in-out', fill: 'forwards' }));
      turn(d);
      a.finished.then(() => { a.cancel(); setX(travel); arrive(); }).catch(() => {});
    } else arrive();
    for (let i = lit; i < n; i++) T.later(() => light(i + 1), 700 * ((i + 1 - lit) / Math.max(1, n - lit)));
  }
  function arrive() {
    if (disposed) return;
    light(letters().length);
    goal.classList.add('arrived', 'done');
    setPip('wave');
    const row = wordHost.querySelector('.glyph-row'), hr = scene.getBoundingClientRect(), rr = row.getBoundingClientRect();
    keep(animate(row, [{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
    sparkle(scene, rr.left - hr.left + rr.width / 2, rr.top - hr.top + rr.height / 2, { count: 16, size: [12, 26], reach: [50, 110] });
    sfx.play('toot');
    stars.fill(round);
    el.dataset.stars = String(round + 1);
    round++;
    setProgress(round);
    msg = '';
    if (round >= rounds) { T.later(finish, 700); return; }
    T.later(() => { showWord(); phase = 'idle'; setPip('idle'); paintControls(); }, 1800);
  }
  function finish() {
    el.dataset.state = 'done';
    el.dataset.result = 'smooth';
    setDone(true);
    sfx.play('checkpoint');
    phase = 'done';
    paintControls();
  }

  // ---- without the microphone: "Next word" ----
  function onSmooth() {
    if (phase !== 'idle') return;
    phase = 'result'; el.dataset.result = 'smooth'; fails = 0; quietStreak = 0; msg = '';
    paintControls(); refresh();
    success();
  }

  function again() {
    T.clear(); closeMic();
    anims.forEach((a) => a.cancel()); anims = [];
    voiceOff(); listening = false; train.classList.remove('listening'); setStatus('');
    round = 0; phase = 'idle'; msg = ''; fails = 0; quietStreak = 0; quietMode = false;
    stars.reset(); setProgress(0); setDone(false);
    el.dataset.stars = '0'; el.dataset.state = 'playing'; el.dataset.result = '';
    setPip('idle');
    showWord(); paintControls();
  }

  // Leaving the screen or hiding the page ends any try and shuts the microphone.
  const onHide = () => { if (document.hidden && (phase === 'trying' || phase === 'opening')) { T.clear(); closeMic(); voiceOff(); listening = false; train.classList.remove('listening'); setStatus(''); phase = 'result'; setX(0); light(0); T.later(ready, 50); } };
  document.addEventListener('visibilitychange', onHide);

  const stopWatching = watchSize(scene, layout);
  showWord();
  if (!hasMic()) { mode = 'tap'; paintControls(); }
  else { paintControls(); askPermission().then((granted) => { if (disposed) return; mode = granted ? 'mic' : 'tap'; paintControls(); refresh(); }); }

  const say = [{ tts: curriculum.games.ride.say }];
  return {
    el, flush: true, lockScroll: true,
    parts: () => say,
    script: () => (mode === 'tap'
      ? 'Say the word together in one long sound. When it is smooth, tap Next word.'
      : msg === 'gap'
        ? "There was a gap. Say: 'Keep your voice on.' Then try again together."
        : `Say it together, slowly, with no gaps: '${slowSounds(curWord, sounds)}'. Then say '${curWord}'. Tell your child: keep your voice on. Say the sounds, not the letter names.`),
    gist: () => (mode === 'tap' ? fit('Say it, then tap Next word', 'Then tap Next word') : msg === 'gap' ? fit("Say 'Keep your voice on.'", 'Keep your voice on') : fit('Say it together, no gaps', 'No gaps')),
    again: () => { again(); speech.say(say); },
    cleanup: () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onHide);
      T.clear(); closeMic();
      anims.forEach((a) => a.cancel()); puffAnims.forEach((a) => a.cancel());
      teardownWord(); stopWatching();
    },
  };
}
