// "Level one complete!": a gold star, the new car's icon and the words, centred over Home. Closes on a tap or after 4.5 s
// (one timeout; a CSS opacity fade, then it is removed). Returns { el, close }.
import { h } from '../dom.js';
import { starSvg } from '../art.js';
import { carSvg } from '../art/cars2d.js';
import { bannerText } from '../levels.js';
import { sparkle } from './sparkle.js';

export const BANNER_MS = 4500, FADE_MS = 250;

export function levelBanner({ level, host, reducedMotion = false }) {
  let closed = false;
  const el = h('div', { class: 'level-banner', role: 'status', dataset: { level: level.id } },
    h('div', { class: 'level-banner-art' }, starSvg('big'), carSvg(level.car, 'car-icon')),
    h('div', { class: 'level-banner-text' }, bannerText(level)));
  const timer = setTimeout(() => close(), BANNER_MS);
  function close() {
    if (closed) return;
    closed = true; clearTimeout(timer);
    el.classList.add('closing');
    setTimeout(() => el.remove(), FADE_MS);
  }
  el.addEventListener('click', close);
  host.append(el);
  if (!reducedMotion) {
    if (el.animate) el.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
    const burst = (count) => { if (closed || !host.isConnected) return; const r = host.getBoundingClientRect(); sparkle(host, r.width / 2, r.height * 0.42, { count, size: [14, 30], reach: [90, Math.max(100, Math.min(220, r.width / 2))] }); };
    burst(28);
    setTimeout(() => burst(20), 600);
  }
  return { el, close };
}
