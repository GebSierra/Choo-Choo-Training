// The gold star board on Home: one star for each built level, gold once earned, an outline before. It is plain DOM (no
// WebGL, no loop). pop(i) gives star i one small scale pop when a level has just been earned.
import { h, reduced } from '../dom.js';
import { starSvg } from '../art.js';
import { builtLevels, earnedLevels } from '../levels.js';

export function starBoard(curriculum, store, { hold = null } = {}) {
  const built = builtLevels(curriculum);
  const earned = new Set(earnedLevels(curriculum, store).map((v) => v.id));
  // hold: the id of a level being celebrated; its star stays an outline until pop() lights it.
  const stars = built.map((v) => h('span', { class: 'level-star' + (earned.has(v.id) && v.id !== hold ? ' on' : ''), dataset: { level: v.id } }, starSvg()));
  const count = () => stars.filter((s) => s.classList.contains('on')).length;
  const label = () => `${count()} gold star${count() === 1 ? '' : 's'}`;
  const el = h('div', { class: 'level-stars', role: 'img', 'aria-label': label(), dataset: { count: String(count()) } }, ...stars);
  return {
    el,
    // Lights star i (if it was an outline) and pops it; with reduced motion it is only filled.
    pop(i) {
      const s = stars[i];
      if (!s) return;
      s.classList.add('on');
      el.dataset.count = String(count());
      el.setAttribute('aria-label', label());
      if (!reduced() && s.animate) s.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.7)', offset: 0.45 }, { transform: 'scale(1)' }], { duration: 650, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    },
  };
}
