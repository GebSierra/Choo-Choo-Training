import { h, animate, reduced } from '../dom.js';
import { glyphSvg } from '../glyphs.js';
import { accentOf } from '../theme.js';
import { starSvg, farmBackdrop } from '../art.js';

// Small pieces the games share: timers that clean up, the farm, the "Find this" card and the row of gold stars.

export function timers() {
  const ids = new Set();
  return {
    later(fn, ms) { const id = setTimeout(() => { ids.delete(id); fn(); }, ms); ids.add(id); return id; },
    clear() { ids.forEach(clearTimeout); ids.clear(); },
  };
}

export const farm = () => h('div', { class: 'farm' }, farmBackdrop());

// Calls cb(width, height) now and whenever the element's size changes (rotation included).
export function watchSize(el, cb) {
  const ro = new ResizeObserver(() => { if (el.clientWidth) cb(el.clientWidth, el.clientHeight); });
  ro.observe(el);
  return () => ro.disconnect();
}

export function findCard(letter) {
  return h('div', { class: 'find-card', 'aria-label': 'Find this letter' }, h('span', {}, 'Find this'), glyphSvg(letter, { color: accentOf(letter), label: 'the letter to find' }));
}

// A small sideways wobble: the only answer to a wrong touch. No colour, no sound.
export const shake = (el) => animate(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)', offset: 0.2 }, { transform: 'translateX(5px)', offset: 0.45 }, { transform: 'translateX(-3px)', offset: 0.7 }, { transform: 'translateX(0)' }], { duration: 320 });

// A quiet nudge: when `ms` pass with no touch on the scene, hint() runs once; the next one comes after another quiet `ms`.
// Any touch starts the wait again. Nothing moves with reduced motion. arm() starts it over, stop() ends it (done, or leaving).
export function idleHints(scene, hint, ms = 8000) {
  let id = 0;
  const wait = () => { clearTimeout(id); id = setTimeout(() => { if (!reduced()) hint(); wait(); }, ms); };
  const stop = () => { clearTimeout(id); scene.removeEventListener('pointerdown', wait, true); };
  const arm = () => { stop(); scene.addEventListener('pointerdown', wait, true); wait(); };
  arm();
  return { arm, stop };
}

// The Find this card swells twice (scale 1.06, 500 ms each).
export const pulseCard = (card) => card.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 500, iterations: 2, easing: 'ease-in-out' });

// Five (or n) empty rings that fill with gold stars. fill(i) pops star i in with a small spring.
export function starRow(n) {
  const slots = Array.from({ length: n }, () => h('span', { class: 'star-slot' }));
  const el = h('div', { class: 'star-row', role: 'img', 'aria-label': `${n} stars to collect`, dataset: { filled: '0' } }, slots);
  return {
    el,
    fill(i) {
      const s = starSvg();
      slots[i].append(s);
      animate(s, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      el.dataset.filled = String(i + 1);
    },
    reset() { slots.forEach((s) => s.replaceChildren()); el.dataset.filled = '0'; },
  };
}
