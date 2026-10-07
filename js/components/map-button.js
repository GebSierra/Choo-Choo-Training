// The map button at the top left of the Home (it replaced the gold star board): a friendly folded map that opens the journey
// board. A small gold star with a count sits on it once a level has been earned (the stars themselves are inside the board).
// pop(i) is the level party's moment: the new star lights and the button gives one soft pulse (CSS transform, once; with reduced
// motion it only updates). Plain DOM, no loop.
import { h, reduced } from '../dom.js';
import { starSvg } from '../art.js';
import { builtLevels, earnedLevels } from '../levels.js';

const mapIcon = () => h('svg', { class: 'map-icon', viewBox: '0 0 32 32', 'aria-hidden': 'true' },
  h('path', { d: 'M3.5 9.5 11 6.5v17l-7.5 3z', fill: '#BDE9C7' }),
  h('path', { d: 'M11 6.5l10 3v17l-10-3z', fill: '#FFE9A8' }),
  h('path', { d: 'M21 9.5l7.5-3v17l-7.5 3z', fill: '#BFE0FF' }),
  h('path', { d: 'M3.5 9.5 11 6.5l10 3 7.5-3v17l-7.5 3-10-3-7.5 3z M11 6.5v17 M21 9.5v17', fill: 'none', stroke: '#5B3FD0', 'stroke-width': 1.9, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
  h('path', { d: 'M6.5 21.5c2-5 4.5-1 7-4s3.5-6 7.5-4', fill: 'none', stroke: '#E5484D', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-dasharray': '0.1 3.4' }),
  h('circle', { cx: 24.2, cy: 14.4, r: 2.4, fill: '#E5484D' }), h('circle', { cx: 24.2, cy: 14.4, r: 0.9, fill: '#fff' }));

// hold: the id of a level being celebrated; it is not counted until pop() lights it. onOpen: called on a tap.
export function mapButton(curriculum, store, { hold: held = null, onOpen } = {}) {
  let hold = held;
  const earned = new Set(earnedLevels(curriculum, store).map((v) => v.id));
  const built = builtLevels(curriculum);
  const shown = () => built.filter((v) => earned.has(v.id) && v.id !== hold).length;
  let n = shown();
  const badge = h('span', { class: 'map-stars', 'aria-hidden': 'true' }, starSvg(), h('span', { class: 'map-stars-n' }, String(n)));
  const el = h('button', { class: 'map-btn', type: 'button', 'aria-label': 'Journey map', dataset: { stars: String(n) }, onclick: () => { if (onOpen) onOpen(); } }, mapIcon(), badge);
  const paint = () => { el.dataset.stars = String(n); badge.querySelector('.map-stars-n').textContent = String(n); badge.hidden = n === 0; };
  paint();
  return {
    el,
    // A level has just been earned: count it and pulse the button once.
    pop(i) {
      const v = built[i];
      if (!v || !earned.has(v.id)) return;
      const was = n;
      hold = null;
      n = shown();
      if (n === was) return;
      paint();
      if (!reduced() && el.animate) {
        el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3) rotate(-6deg)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 700, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        badge.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.7)', offset: 0.45 }, { transform: 'scale(1)' }], { duration: 750, delay: 120, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      }
    },
  };
}

// Opens the journey board over `host` (the Home's root). The board module loads on the first tap (it is precached).
export async function openJourney({ host, curriculum, store, returnFocus = null }) {
  if (host.querySelector('.jb')) return null;
  const { journeyBoard } = await import('./journey-board.js');
  if (host.querySelector('.jb')) return null;
  return journeyBoard({ host, curriculum, store, onClose: () => { if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true }); } });
}
