// The one shared low-rate ticker for idle life (the railway's smoke puffs, Pip's blink, swaying flowers, the portal's shimmer).
// The heat rule: at most 10 ticks a second (TICK_MS = 100), no requestAnimationFrame, and it runs only while somebody listens AND
// the page is visible AND the child touched the screen within the last 2 minutes AND motion is not reduced. Otherwise the interval
// is cleared and nothing runs at all. Any touch, click or key press wakes it again.
//
//   const stop = idle.subscribe((now) => { ... });   // returns the unsubscribe function
import { reduced } from './dom.js';

const TICK_MS = 100, LIMIT_MS = 2 * 60 * 1000;
const subs = new Set();
let timer = 0, lastTouch = performance.now(), limit = LIMIT_MS, ticks = 0, wired = false;

const should = () => subs.size > 0 && !document.hidden && !reduced() && performance.now() - lastTouch < limit;
function sync() {
  if (should()) { if (!timer) timer = setInterval(tick, TICK_MS); }
  else if (timer) { clearInterval(timer); timer = 0; }
}
function tick() {
  if (!should()) { sync(); return; }
  ticks++;
  const now = performance.now();
  for (const fn of [...subs]) { try { fn(now); } catch { /* one listener's trouble never stops the others */ } }
}
function touch() { lastTouch = performance.now(); sync(); }
function wire() {
  if (wired) return;
  wired = true;
  for (const ev of ['pointerdown', 'touchstart', 'keydown', 'wheel']) addEventListener(ev, touch, { capture: true, passive: true });
  document.addEventListener('visibilitychange', sync);
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', sync); } catch { /* old browsers */ }
}

export const idle = {
  TICK_MS,
  subscribe(fn) {
    wire();
    subs.add(fn);
    touch();
    return () => { subs.delete(fn); sync(); };
  },
  touch,
  // for the tests: a shorter idle limit (null restores 2 minutes), and what the ticker is doing
  setLimit(ms) { limit = ms == null ? LIMIT_MS : ms; touch(); },
  state: () => ({ running: !!timer, ticks, listeners: subs.size, limitMs: limit, tickMs: TICK_MS }),
};
