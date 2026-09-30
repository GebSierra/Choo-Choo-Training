import { animate, reduced } from '../dom.js';
import { accentOf } from '../theme.js';
import { sparkle } from './sparkle.js';

// Slide-to-blend for a word drawn with wordSvg(): the child drags a finger left to right under the letters and each
// letter lights up as the finger passes its left edge, while the grown up stretches the sounds in time. The component
// is silent. Dragging back un-lights letters. Reaching the right edge of the last letter lifts the word and bursts a
// few stars, holds the lit word for 700 ms and then starts again from unlit. Lifting the finger early keeps the lit
// state for 500 ms and then fades back.
//
//   row: the element that takes pointer events   svg: the wordSvg   bar: a .blend-bar with one <i> inside
//   host: a positioned ancestor for the sparkle   onFirstTouch: called on every touch that lands on the row
export function slideBlend({ row, svg, bar, host, onFirstTouch }) {
  const letters = [...svg.querySelectorAll('.glyph-letter')];
  const fill = bar.firstChild;
  letters.forEach((g) => g.style.setProperty('--accent', accentOf(g.dataset.letter)));
  let edges = [], lit = 0, dragging = false, moved = false, startX = 0, busy = false, blocked = false, swallow = false, offTimer = 0, doneTimer = 0, swallowTimer = 0;

  // Edges in screen pixels, from the letters' own geometry (the pop scale never changes them).
  const measure = () => {
    const r = svg.getBoundingClientRect(), k = r.width / Number(svg.dataset.width);
    edges = letters.map((g) => ({ l: r.left + Number(g.dataset.x0) * k, r: r.left + Number(g.dataset.x1) * k }));
  };

  function paint(n, current, progress) {
    lit = n;
    letters.forEach((g, i) => { g.classList.toggle('lit', i < n); g.classList.toggle('current', i === current); });
    row.dataset.lit = String(n);
    bar.style.setProperty('--accent', accentOf(letters[Math.max(0, current)].dataset.letter));
    fill.style.transform = `scaleX(${progress})`;
  }
  const clear = () => paint(0, -1, 0);

  function update(x) {
    const first = edges[0], last = edges[edges.length - 1];
    const n = edges.filter((e) => x >= e.l).length;
    let current = edges.findIndex((e) => x >= e.l && x <= e.r);
    if (current < 0) current = n - 1;
    paint(n, current, Math.max(0, Math.min(1, (x - first.l) / (last.r - first.l))));
    if (x >= last.r) complete();
  }

  function complete() {
    busy = true;
    paint(letters.length, letters.length - 1, 1);
    if (!reduced()) animate(row, [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    const h0 = host.getBoundingClientRect(), r0 = row.getBoundingClientRect();
    sparkle(host, r0.left - h0.left + r0.width / 2, r0.top - h0.top + r0.height / 2, { count: 12, size: [12, 24], reach: [44, 92] });
    doneTimer = setTimeout(() => { busy = false; blocked = dragging; clear(); }, 700);
  }

  row.addEventListener('pointerdown', (e) => {
    clearTimeout(offTimer);
    if (onFirstTouch) onFirstTouch();
    measure();
    dragging = true; moved = false; startX = e.clientX;
    try { row.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer: fine */ }
  });
  row.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (!moved && Math.abs(e.clientX - startX) < 6) return; // a tap is not a slide
    moved = true;
    if (blocked && e.clientX < edges[edges.length - 1].r) blocked = false;
    if (!busy && !blocked) update(e.clientX);
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    if (!moved) return;
    swallow = true; clearTimeout(swallowTimer); swallowTimer = setTimeout(() => { swallow = false; }, 80); // the click that follows a slide is not a tap
    if (!busy) offTimer = setTimeout(clear, 500);
  };
  row.addEventListener('pointerup', release);
  row.addEventListener('pointercancel', release);
  row.addEventListener('lostpointercapture', release);

  return {
    // True once after a slide, so the tap-to-reveal handler can ignore the click that ends it.
    swallowClick() { const s = swallow; swallow = false; return s; },
    get lit() { return lit; },
    cleanup() { clearTimeout(offTimer); clearTimeout(doneTimer); clearTimeout(swallowTimer); },
  };
}
