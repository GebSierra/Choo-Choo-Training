import { h, animate, reduced } from '../dom.js';

const STAR = 'M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z';
const COLORS = ['#FFD166', '#FFFFFF', '#FFE9A8'];

// A burst of small stars around (x, y) inside host (which must be positioned). Transform and opacity
// only; every star removes itself when done. Nothing flashes: stars grow, drift outward and shrink away.
// size and reach are [min, max] in px; scale 1 is the slide track's burst, less is for small pops.
export function sparkle(host, x, y, { count = 18, size = [16, 32], reach = [64, 120], colors = COLORS } = {}) {
  if (reduced()) return;
  for (let i = 0; i < count; i++) {
    const s = size[0] + Math.round(Math.random() * (size[1] - size[0]));
    const star = h('svg', { class: 'spark', viewBox: '0 0 24 24', width: s, height: s, 'aria-hidden': 'true', style: { left: x - s / 2 + 'px', top: y - s / 2 + 'px' } }, h('path', { d: STAR, fill: colors[i % colors.length] }));
    host.append(star);
    const ang = (i / count) * Math.PI * 2 + Math.random() * 0.4, dist = reach[0] + Math.random() * (reach[1] - reach[0]);
    const a = animate(star, [
      { transform: 'translate(0,0) scale(0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${Math.cos(ang) * dist * 0.7}px,${Math.sin(ang) * dist * 0.7}px) scale(1) rotate(90deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(0) rotate(180deg)`, opacity: 0 },
    ], { duration: 720 + Math.random() * 280, delay: Math.random() * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    a.finished.then(() => star.remove()).catch(() => star.remove());
  }
}
